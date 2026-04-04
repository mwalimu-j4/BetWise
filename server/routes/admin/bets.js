import { Router } from "express";
import { pool } from "../../db.js";
import { adminAuth } from "../../middleware/auth.js";

const router = Router();

function parsePagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

router.get("/", adminAuth, async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const status = req.query.status ? String(req.query.status) : "";
  const search = req.query.search ? String(req.query.search) : "";

  const filters = [];
  const values = [];

  if (status) {
    values.push(status);
    filters.push(`b.status = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    filters.push(
      `(u.username ILIKE $${values.length} OR e.home_team ILIKE $${values.length} OR e.away_team ILIKE $${values.length})`,
    );
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  try {
    const totalResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM bets b
        JOIN users u ON u.id = b.user_id
        JOIN events e ON e.event_id = b.event_id
        ${where}
      `,
      values,
    );

    values.push(limit, offset);
    const dataResult = await pool.query(
      `
        SELECT
          b.id,
          u.username,
          CONCAT(e.home_team, ' vs ', e.away_team) AS match,
          b.market_type,
          b.side,
          b.stake,
          b.display_odds,
          b.potential_payout,
          b.status,
          b.placed_at
        FROM bets b
        JOIN users u ON u.id = b.user_id
        JOIN events e ON e.event_id = b.event_id
        ${where}
        ORDER BY b.placed_at DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    );

    return res.json({
      data: dataResult.rows,
      page,
      limit,
      total: totalResult.rows[0].total,
      totalPages: Math.ceil(totalResult.rows[0].total / limit),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch bets", error: error.message });
  }
});

router.post("/:betId/settle", adminAuth, async (req, res) => {
  const { betId } = req.params;
  const { result } = req.body;

  if (!["home_win", "away_win", "draw"].includes(result)) {
    return res.status(400).json({ message: "Invalid result value" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const betResult = await client.query(
      `
        SELECT b.*, e.home_team, e.away_team
        FROM bets b
        JOIN events e ON e.event_id = b.event_id
        WHERE b.id = $1
        LIMIT 1
      `,
      [betId],
    );

    const bet = betResult.rows[0];
    if (!bet) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Bet not found" });
    }

    if (bet.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Bet already settled" });
    }

    const sideNormalized = String(bet.side ?? "").toLowerCase();
    const home = String(bet.home_team ?? "").toLowerCase();
    const away = String(bet.away_team ?? "").toLowerCase();

    let isWin = false;
    if (result === "home_win") {
      isWin = sideNormalized === "home" || sideNormalized === home;
    }
    if (result === "away_win") {
      isWin = sideNormalized === "away" || sideNormalized === away;
    }
    if (result === "draw") {
      isWin = sideNormalized === "draw";
    }

    const newStatus = isWin ? "won" : "lost";

    const settledResult = await client.query(
      `
        UPDATE bets
        SET status = $2,
            settled_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [betId, newStatus],
    );

    if (isWin) {
      const payout = Number(bet.stake) * Number(bet.display_odds);
      await client.query(
        "UPDATE users SET balance = balance + $2 WHERE id = $1",
        [bet.user_id, payout],
      );
    }

    await client.query("COMMIT");
    return res.json(settledResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    return res
      .status(500)
      .json({ message: "Failed to settle bet", error: error.message });
  } finally {
    client.release();
  }
});

export default router;
