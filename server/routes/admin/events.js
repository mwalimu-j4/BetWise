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
  const league = req.query.league ? String(req.query.league) : "";
  const search = req.query.search ? String(req.query.search) : "";

  const filters = [];
  const values = [];

  if (status) {
    values.push(status);
    filters.push(`e.status = $${values.length}`);
  }
  if (league) {
    values.push(league);
    filters.push(`e.league_name ILIKE $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    filters.push(
      `(e.home_team ILIKE $${values.length} OR e.away_team ILIKE $${values.length})`,
    );
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  try {
    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM events e ${where}`,
      values,
    );

    values.push(limit, offset);
    const rowsResult = await pool.query(
      `
        SELECT
          e.*,
          COALESCE(fc.is_active, false) AS is_active,
          COALESCE(fc.house_margin, 0) AS house_margin,
          COALESCE(fc.markets_enabled, ARRAY['h2h']) AS markets_enabled,
          COALESCE(oc.odds_count, 0) AS odds_count
        FROM events e
        LEFT JOIN fixture_config fc ON fc.event_id = e.event_id
        LEFT JOIN (
          SELECT event_id, COUNT(*)::int AS odds_count
          FROM odds
          GROUP BY event_id
        ) oc ON oc.event_id = e.event_id
        ${where}
        ORDER BY e.commence_time ASC NULLS LAST
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    );

    return res.json({
      data: rowsResult.rows,
      page,
      limit,
      total: totalResult.rows[0].total,
      totalPages: Math.ceil(totalResult.rows[0].total / limit),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch events", error: error.message });
  }
});

router.get("/:eventId", adminAuth, async (req, res) => {
  const { eventId } = req.params;

  try {
    const [eventResult, oddsResult] = await Promise.all([
      pool.query(
        `
          SELECT e.*, COALESCE(fc.is_active, false) AS is_active,
                 COALESCE(fc.house_margin, 0) AS house_margin,
                 COALESCE(fc.markets_enabled, ARRAY['h2h']) AS markets_enabled
          FROM events e
          LEFT JOIN fixture_config fc ON fc.event_id = e.event_id
          WHERE e.event_id = $1
          LIMIT 1
        `,
        [eventId],
      ),
      pool.query(
        `
          SELECT bookmaker_id, bookmaker_name, market_type, side, decimal_odds, recorded_at
          FROM odds
          WHERE event_id = $1
          ORDER BY bookmaker_name, market_type, side
        `,
        [eventId],
      ),
    ]);

    const event = eventResult.rows[0];
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const grouped = oddsResult.rows.reduce((acc, odd) => {
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

    return res.json({
      event,
      oddsByBookmaker: Object.values(grouped),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch event detail", error: error.message });
  }
});

router.patch("/:eventId/toggle", adminAuth, async (req, res) => {
  const { eventId } = req.params;

  try {
    const existing = await pool.query(
      "SELECT is_active FROM fixture_config WHERE event_id = $1 LIMIT 1",
      [eventId],
    );

    if (!existing.rows[0]) {
      const inserted = await pool.query(
        `
          INSERT INTO fixture_config (event_id, is_active, house_margin, markets_enabled, updated_at)
          VALUES ($1, true, 0, ARRAY['h2h'], NOW())
          RETURNING *
        `,
        [eventId],
      );
      return res.json(inserted.rows[0]);
    }

    const updated = await pool.query(
      `
        UPDATE fixture_config
        SET is_active = NOT is_active,
            updated_at = NOW()
        WHERE event_id = $1
        RETURNING *
      `,
      [eventId],
    );

    return res.json(updated.rows[0]);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to toggle event", error: error.message });
  }
});

router.patch("/:eventId/config", adminAuth, async (req, res) => {
  const { eventId } = req.params;
  const { house_margin, markets_enabled } = req.body;

  const margin = Number(house_margin ?? 0);
  const safeMargin = Number.isFinite(margin) ? margin : 0;
  const markets =
    Array.isArray(markets_enabled) && markets_enabled.length
      ? markets_enabled
      : ["h2h"];

  try {
    const configResult = await pool.query(
      `
        INSERT INTO fixture_config (event_id, house_margin, markets_enabled, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (event_id)
        DO UPDATE SET
          house_margin = EXCLUDED.house_margin,
          markets_enabled = EXCLUDED.markets_enabled,
          updated_at = NOW()
        RETURNING *
      `,
      [eventId, safeMargin, markets],
    );

    await pool.query(
      `
        UPDATE displayed_odds
        SET display_odds = CASE
          WHEN raw_odds IS NULL THEN NULL
          ELSE ROUND((raw_odds / (1 + ($2 / 100.0)))::numeric, 3)
        END,
        updated_at = NOW()
        WHERE event_id = $1
      `,
      [eventId, safeMargin],
    );

    return res.json(configResult.rows[0]);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update config", error: error.message });
  }
});

export default router;
