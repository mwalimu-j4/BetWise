import axios from "axios";
import { pool } from "../db.js";

function todayIsoDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function fetchAndSaveFixtures() {
  const apiKey = process.env.API_SPORTS_KEY;
  if (!apiKey) {
    throw new Error("API_SPORTS_KEY is not configured");
  }

  const date = todayIsoDate();
  const response = await axios.get(
    "https://v3.football.api-sports.io/fixtures",
    {
      params: { date },
      headers: { "x-apisports-key": apiKey },
      timeout: 30000,
    },
  );

  const fixtures = response.data?.response ?? [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const fixture of fixtures) {
      const eventId = String(fixture?.fixture?.id ?? "");
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
            home_score,
            away_score,
            raw_data,
            fetched_at,
            updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
          ON CONFLICT (event_id)
          DO UPDATE SET
            league_id = EXCLUDED.league_id,
            league_name = EXCLUDED.league_name,
            sport_key = EXCLUDED.sport_key,
            home_team = EXCLUDED.home_team,
            away_team = EXCLUDED.away_team,
            commence_time = EXCLUDED.commence_time,
            status = EXCLUDED.status,
            home_score = EXCLUDED.home_score,
            away_score = EXCLUDED.away_score,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
        `,
        [
          eventId,
          String(fixture?.league?.id ?? ""),
          fixture?.league?.name ?? null,
          "soccer",
          fixture?.teams?.home?.name ?? null,
          fixture?.teams?.away?.name ?? null,
          fixture?.fixture?.date ? new Date(fixture.fixture.date) : null,
          fixture?.fixture?.status?.short === "FT" ? "finished" : "upcoming",
          fixture?.goals?.home ?? null,
          fixture?.goals?.away ?? null,
          fixture,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return fixtures.length;
}
