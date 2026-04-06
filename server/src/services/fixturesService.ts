import { prisma } from "../lib/prisma";

function getApiSportsKey(): string {
  return process.env.API_SPORTS_KEY?.trim() ?? "";
}

function mapStatus(
  short: string,
): "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED" {
  if (["1H", "HT", "2H", "ET", "P", "LIVE"].includes(short)) return "LIVE";
  if (["FT", "AET", "PEN"].includes(short)) return "FINISHED";
  if (["CANC", "ABD", "PST"].includes(short)) return "CANCELLED";
  return "UPCOMING";
}

export async function fetchAndSaveFixtures(): Promise<void> {
  const apiSportsKey = getApiSportsKey();
  if (!apiSportsKey) {
    console.warn("[Fixtures] API_SPORTS_KEY is not configured.");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86_400_000)
    .toISOString()
    .split("T")[0];

  const [todayRes, tomorrowRes] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
      headers: { "x-apisports-key": apiSportsKey },
    }),
    fetch(`https://v3.football.api-sports.io/fixtures?date=${tomorrow}`, {
      headers: { "x-apisports-key": apiSportsKey },
    }),
  ]);

  if (!todayRes.ok || !tomorrowRes.ok) {
    const [todayText, tomorrowText] = await Promise.all([
      todayRes.text(),
      tomorrowRes.text(),
    ]);

    console.warn(
      `[Fixtures] API-Sports error. today=${todayRes.status} tomorrow=${tomorrowRes.status}`,
    );
    console.warn(
      `[Fixtures] API-Sports details: ${todayText.slice(0, 180)} | ${tomorrowText.slice(0, 180)}`,
    );
    return;
  }

  const [todayData, tomorrowData] = await Promise.all([
    todayRes.json() as Promise<{
      response?: any[];
      errors?: Record<string, unknown>;
    }>,
    tomorrowRes.json() as Promise<{
      response?: any[];
      errors?: Record<string, unknown>;
    }>,
  ]);

  const todayErrors = todayData.errors ? JSON.stringify(todayData.errors) : "";
  const tomorrowErrors = tomorrowData.errors
    ? JSON.stringify(tomorrowData.errors)
    : "";

  if (todayErrors || tomorrowErrors) {
    console.warn(
      `[Fixtures] API-Sports returned errors: ${todayErrors || "none"} | ${tomorrowErrors || "none"}`,
    );
    return;
  }

  const all = [...(todayData.response || []), ...(tomorrowData.response || [])];

  for (const item of all) {
    const fixture = item.fixture;
    const teams = item.teams;
    const league = item.league;
    const goals = item.goals;

    await prisma.sportEvent.upsert({
      where: { eventId: String(fixture.id) },
      update: {
        status: mapStatus(fixture.status?.short || "NS"),
        homeScore: goals?.home ?? null,
        awayScore: goals?.away ?? null,
        rawData: item,
        fetchedAt: new Date(),
      },
      create: {
        eventId: String(fixture.id),
        leagueId: league?.id ? String(league.id) : null,
        leagueName: league?.name ?? null,
        sportKey: "soccer",
        homeTeam: teams.home.name,
        awayTeam: teams.away.name,
        commenceTime: new Date(fixture.date),
        status: mapStatus(fixture.status?.short || "NS"),
        homeScore: goals?.home ?? null,
        awayScore: goals?.away ?? null,
        rawData: item,
      },
    });
  }

  if (all.length === 0) {
    console.warn(
      `[Fixtures] No fixtures returned for ${today} and ${tomorrow}.`,
    );
    return;
  }

  console.log(
    `[Fixtures] ${all.length} fixtures saved - ${new Date().toISOString()}`,
  );
}
