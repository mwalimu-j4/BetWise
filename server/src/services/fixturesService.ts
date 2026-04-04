import { prisma } from "../lib/prisma";

const API_SPORTS_KEY = process.env.API_SPORTS_KEY;

function mapStatus(short: string): "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED" {
  if (["1H", "HT", "2H", "ET", "P", "LIVE"].includes(short)) return "LIVE";
  if (["FT", "AET", "PEN"].includes(short)) return "FINISHED";
  if (["CANC", "ABD", "PST"].includes(short)) return "CANCELLED";
  return "UPCOMING";
}

export async function fetchAndSaveFixtures(): Promise<void> {
  if (!API_SPORTS_KEY) {
    console.warn("[Fixtures] API_SPORTS_KEY is not configured.");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

  const [todayRes, tomorrowRes] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
      headers: { "x-apisports-key": API_SPORTS_KEY },
    }),
    fetch(`https://v3.football.api-sports.io/fixtures?date=${tomorrow}`, {
      headers: { "x-apisports-key": API_SPORTS_KEY },
    }),
  ]);

  const [todayData, tomorrowData] = await Promise.all([
    todayRes.json() as Promise<{ response?: any[] }>,
    tomorrowRes.json() as Promise<{ response?: any[] }>,
  ]);

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

  console.log(`[Fixtures] ${all.length} fixtures saved - ${new Date().toISOString()}`);
}
