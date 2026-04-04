import axios from "axios";
import { pool } from "../db.js";

const SUPPORTED_SPORTS = [
  "soccer_epl",
  "soccer_uefa_champs_league",
  "basketball_nba",
  "americanfootball_nfl",
];

function normalizeStatus(commenceTime) {
  if (!commenceTime) return "upcoming";
  return new Date(commenceTime).getTime() < Date.now() ? "live" : "upcoming";
}

export async function fetchAndSaveOdds() {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    throw new Error("ODDS_API_KEY is not configured");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const sport of SUPPORTED_SPORTS) {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds`;
      const { data } = await axios.get(url, {
        params: {
          apiKey,
          regions: "eu",
          markets: "h2h,spreads,totals",
          oddsFormat: "decimal",
        },
        timeout: 30000,
      });

      for (const event of data ?? []) {
        const eventId = event.id;
        if (!eventId) continue;

        await client.query(
          `
            INSERT INTO events (
              event_id,
              league_id,
              league_name,
              sport_key,
              home_team,
              away_team,
              commence_time,
              status,
              raw_data,
              fetched_at,
              updated_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
            ON CONFLICT (event_id) DO NOTHING
          `,
          [
            eventId,
            null,
            event?.sport_title ?? null,
            event?.sport_key ?? sport,
            event?.home_team ?? null,
            event?.away_team ?? null,
            event?.commence_time ? new Date(event.commence_time) : null,
            normalizeStatus(event?.commence_time),
            event,
          ],
        );

        for (const bookmaker of event?.bookmakers ?? []) {
          for (const market of bookmaker?.markets ?? []) {
            for (const outcome of market?.outcomes ?? []) {
              const decimalOdds = Number(outcome?.price);
              if (!Number.isFinite(decimalOdds)) continue;

              await client.query(
                `
                  INSERT INTO odds (
                    event_id,
                    bookmaker_id,
                    bookmaker_name,
                    market_type,
                    side,
                    decimal_odds,
                    recorded_at
                  )
                  VALUES ($1,$2,$3,$4,$5,$6,NOW())
                `,
                [
                  eventId,
                  bookmaker?.key ?? null,
                  bookmaker?.title ?? null,
                  market?.key ?? null,
                  outcome?.name ?? null,
                  decimalOdds,
                ],
              );

              await client.query(
                `
                  INSERT INTO displayed_odds (
                    event_id,
                    bookmaker_id,
                    bookmaker_name,
                    market_type,
                    side,
                    raw_odds,
                    display_odds,
                    is_visible,
                    updated_at
                  )
                  VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW())
                  ON CONFLICT (event_id, bookmaker_id, market_type, side)
                  DO UPDATE SET
                    bookmaker_name = EXCLUDED.bookmaker_name,
                    raw_odds = EXCLUDED.raw_odds,
                    display_odds = EXCLUDED.display_odds,
                    updated_at = NOW()
                `,
                [
                  eventId,
                  bookmaker?.key ?? null,
                  bookmaker?.title ?? null,
                  market?.key ?? null,
                  outcome?.name ?? null,
                  decimalOdds,
                  decimalOdds,
                ],
              );
            }
          }
        }
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
