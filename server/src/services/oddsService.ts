import { prisma } from "../lib/prisma";

function getOddsApiKey(): string {
  return process.env.ODDS_API_KEY?.trim() ?? "";
}

const SPORTS = [
  "soccer_epl",
  "soccer_uefa_champs_league",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "basketball_nba",
  "americanfootball_nfl",
];

export async function fetchAndSaveOdds(): Promise<void> {
  const oddsApiKey = getOddsApiKey();
  if (!oddsApiKey) {
    console.warn("[Odds] ODDS_API_KEY is not configured.");
    return;
  }

  let failedRequests = 0;
  let savedEvents = 0;

  const results = await Promise.allSettled(
    SPORTS.map((sport) =>
      fetch(
        `https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=${oddsApiKey}&regions=eu&markets=h2h,spreads,totals&oddsFormat=decimal`,
      ),
    ),
  );

  for (const result of results) {
    if (result.status !== "fulfilled") {
      continue;
    }

    if (!result.value.ok) {
      const details = await result.value.text();
      console.warn(
        `[Odds] Request failed with status ${result.value.status}: ${details.slice(0, 180)}`,
      );
      failedRequests += 1;
      continue;
    }

    const payload = (await result.value.json()) as unknown;
    if (!Array.isArray(payload)) {
      const message =
        typeof payload === "object" && payload !== null && "message" in payload
          ? String(
              (payload as { message?: unknown }).message ?? "unknown error",
            )
          : "unknown error";
      console.warn(`[Odds] Unexpected payload shape: ${message}`);
      continue;
    }

    const events = payload as Array<{
      id: string;
      sport_title: string;
      sport_key: string;
      home_team: string;
      away_team: string;
      commence_time: string;
      bookmakers?: Array<{
        key: string;
        title: string;
        markets?: Array<{
          key: string;
          outcomes?: Array<{
            name: string;
            price: number;
          }>;
        }>;
      }>;
    }>;

    for (const event of events) {
      savedEvents += 1;
      const existingEvent = await prisma.sportEvent.findUnique({
        where: { eventId: event.id },
        select: { houseMargin: true },
      });

      await prisma.sportEvent.upsert({
        where: { eventId: event.id },
        update: {
          leagueName: event.sport_title,
          sportKey: event.sport_key,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime: new Date(event.commence_time),
          fetchedAt: new Date(),
        },
        create: {
          eventId: event.id,
          leagueName: event.sport_title,
          sportKey: event.sport_key,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime: new Date(event.commence_time),
          status: "UPCOMING",
        },
      });

      const houseMargin = existingEvent?.houseMargin ?? 0;

      for (const bookmaker of event.bookmakers || []) {
        for (const market of bookmaker.markets || []) {
          for (const outcome of market.outcomes || []) {
            await prisma.eventOdds.create({
              data: {
                eventId: event.id,
                bookmakerId: bookmaker.key,
                bookmakerName: bookmaker.title,
                marketType: market.key,
                side: outcome.name,
                decimalOdds: outcome.price,
              },
            });

            const adjustedOdds = Number(
              (outcome.price / (1 + houseMargin / 100)).toFixed(2),
            );

            await prisma.displayedOdds.upsert({
              where: {
                eventId_bookmakerId_marketType_side: {
                  eventId: event.id,
                  bookmakerId: bookmaker.key,
                  marketType: market.key,
                  side: outcome.name,
                },
              },
              update: {
                rawOdds: outcome.price,
                displayOdds: adjustedOdds,
              },
              create: {
                eventId: event.id,
                bookmakerId: bookmaker.key,
                bookmakerName: bookmaker.title,
                marketType: market.key,
                side: outcome.name,
                rawOdds: outcome.price,
                displayOdds: adjustedOdds,
                isVisible: true,
              },
            });
          }
        }
      }
    }
  }

  if (savedEvents === 0) {
    console.warn(
      `[Odds] No odds saved. failedRequests=${failedRequests} sportsChecked=${SPORTS.length}`,
    );
    return;
  }

  console.log(
    `[Odds] Saved events=${savedEvents} failedRequests=${failedRequests} - ${new Date().toISOString()}`,
  );
}
