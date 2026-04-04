import { Router } from "express";
import { pool } from "../../db.js";
import { adminAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/:eventId", adminAuth, async (req, res) => {
  const { eventId } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT event_id, bookmaker_id, bookmaker_name, market_type, side, raw_odds, display_odds, is_visible, updated_at
        FROM displayed_odds
        WHERE event_id = $1
        ORDER BY bookmaker_name, market_type, side
      `,
      [eventId],
    );

    const grouped = result.rows.reduce((acc, odd) => {
      const key = `${odd.bookmaker_id}::${odd.bookmaker_name}`;
      if (!acc[key]) {
        acc[key] = {
          bookmaker_id: odd.bookmaker_id,
          bookmaker_name: odd.bookmaker_name,
          markets: {},
        };
      }
      if (!acc[key].markets[odd.market_type]) {
        acc[key].markets[odd.market_type] = [];
      }
      acc[key].markets[odd.market_type].push(odd);
      return acc;
    }, {});

    return res.json({ data: Object.values(grouped) });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch odds", error: error.message });
  }
});

router.patch("/:eventId", adminAuth, async (req, res) => {
  const { eventId } = req.params;
  const { bookmaker_id, market_type, side, is_visible } = req.body;

  try {
    const result = await pool.query(
      `
        UPDATE displayed_odds
        SET is_visible = $5,
            updated_at = NOW()
        WHERE event_id = $1
          AND bookmaker_id = $2
          AND market_type = $3
          AND side = $4
        RETURNING *
      `,
      [eventId, bookmaker_id, market_type, side, Boolean(is_visible)],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Odd not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Failed to update odd visibility",
        error: error.message,
      });
  }
});

router.post("/:eventId/override", adminAuth, async (req, res) => {
  const { eventId } = req.params;
  const { bookmaker_id, market_type, side, custom_odds } = req.body;

  try {
    const result = await pool.query(
      `
        UPDATE displayed_odds
        SET display_odds = $5,
            updated_at = NOW()
        WHERE event_id = $1
          AND bookmaker_id = $2
          AND market_type = $3
          AND side = $4
        RETURNING *
      `,
      [eventId, bookmaker_id, market_type, side, Number(custom_odds)],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Odd not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to override odd", error: error.message });
  }
});

export default router;
