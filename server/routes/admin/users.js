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
  const search = req.query.search ? String(req.query.search) : "";

  const values = [];
  const where = search
    ? (() => {
        values.push(`%${search}%`);
        return `WHERE u.username ILIKE $1 OR u.email ILIKE $1`;
      })()
    : "";

  try {
    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM users u ${where}`,
      values,
    );

    values.push(limit, offset);
    const dataResult = await pool.query(
      `
        SELECT
          u.id,
          u.username,
          u.email,
          u.balance,
          u.is_active,
          COALESCE(COUNT(b.id), 0)::int AS total_bets,
          COALESCE(SUM(b.stake), 0)::numeric(12,2) AS total_staked
        FROM users u
        LEFT JOIN bets b ON b.user_id = u.id
        ${where}
        GROUP BY u.id
        ORDER BY u.created_at DESC
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
      .json({ message: "Failed to fetch users", error: error.message });
  }
});

router.patch("/:userId/toggle", adminAuth, async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `
        UPDATE users
        SET is_active = NOT is_active
        WHERE id = $1
        RETURNING id, username, email, is_active, balance
      `,
      [userId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to toggle user", error: error.message });
  }
});

export default router;
