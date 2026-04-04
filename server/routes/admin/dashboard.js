import { Router } from "express";
import { pool } from "../../db.js";
import { adminAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/", adminAuth, async (_req, res) => {
  try {
    const [
      totalRevenueResult,
      activeUsersResult,
      openBetsResult,
      houseEdgeResult,
      ggrTodayResult,
      flaggedBetsResult,
      profitLossResult,
      sportDistributionResult,
    ] = await Promise.all([
      pool.query(
        "SELECT COALESCE(SUM(stake * display_odds), 0) AS total_revenue FROM bets WHERE status = 'won'",
      ),
      pool.query(
        "SELECT COUNT(*)::int AS active_users FROM users WHERE is_active = true",
      ),
      pool.query(
        "SELECT COUNT(*)::int AS open_bets FROM bets WHERE status = 'pending'",
      ),
      pool.query(
        "SELECT COALESCE(AVG(house_margin), 0)::numeric(10,2) AS house_edge FROM fixture_config",
      ),
      pool.query(
        `
          SELECT
            COALESCE(SUM(stake), 0) - COALESCE(SUM(CASE WHEN status = 'won' THEN stake * display_odds ELSE 0 END), 0) AS ggr_today
          FROM bets
          WHERE status IN ('won', 'lost')
            AND DATE(settled_at) = CURRENT_DATE
        `,
      ),
      pool.query(
        "SELECT COUNT(*)::int AS flagged_bets FROM bets WHERE stake > 10000",
      ),
      pool.query(
        `
          WITH series AS (
            SELECT generate_series(CURRENT_DATE - INTERVAL '6 day', CURRENT_DATE, INTERVAL '1 day')::date AS day
          ),
          daily AS (
            SELECT
              DATE(settled_at) AS day,
              COALESCE(SUM(stake), 0) AS stakes,
              COALESCE(SUM(CASE WHEN status = 'won' THEN stake * display_odds ELSE 0 END), 0) AS payouts
            FROM bets
            WHERE settled_at >= CURRENT_DATE - INTERVAL '6 day'
            GROUP BY DATE(settled_at)
          )
          SELECT
            s.day::text AS date,
            GREATEST(COALESCE(d.stakes, 0) - COALESCE(d.payouts, 0), 0)::numeric(12,2) AS profit,
            GREATEST(COALESCE(d.payouts, 0) - COALESCE(d.stakes, 0), 0)::numeric(12,2) AS loss
          FROM series s
          LEFT JOIN daily d ON d.day = s.day
          ORDER BY s.day
        `,
      ),
      pool.query(
        `
          WITH counts AS (
            SELECT e.sport_key, COUNT(*)::int AS c
            FROM bets b
            JOIN events e ON e.event_id = b.event_id
            GROUP BY e.sport_key
          ),
          totals AS (
            SELECT COALESCE(SUM(c), 0)::float AS total FROM counts
          )
          SELECT
            c.sport_key,
            c.c,
            CASE WHEN t.total = 0 THEN 0 ELSE ROUND((c.c / t.total) * 100, 2) END AS percentage
          FROM counts c
          CROSS JOIN totals t
          ORDER BY c.c DESC
        `,
      ),
    ]);

    return res.json({
      totalRevenue: Number(totalRevenueResult.rows[0].total_revenue ?? 0),
      activeUsers: Number(activeUsersResult.rows[0].active_users ?? 0),
      openBets: Number(openBetsResult.rows[0].open_bets ?? 0),
      houseEdge: Number(houseEdgeResult.rows[0].house_edge ?? 0),
      ggrToday: Number(ggrTodayResult.rows[0].ggr_today ?? 0),
      flaggedBets: Number(flaggedBetsResult.rows[0].flagged_bets ?? 0),
      profitLoss: profitLossResult.rows,
      sportDistribution: sportDistributionResult.rows,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch dashboard", error: error.message });
  }
});

export default router;
