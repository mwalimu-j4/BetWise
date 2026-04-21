/**
 * ── EventProcessingService ──
 * Applies all business rules when processing events from The Odds API.
 *
 * Rules enforced:
 *  1. No event without odds ever reaches users
 *  2. Upcoming = future only (max 7 days)
 *  3. Live = started only (commenceTime <= now)
 *  4. Finished events invisible to users
 *  5. Best bookmaker auto-selection (lowest overround)
 *  6. 7-day rolling window maintained
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { OddsApiEvent, OddsApiBookmaker } from "./oddsApiService";

// ── Constants ──

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// League importance: higher = more important, used for featuring
const LEAGUE_IMPORTANCE: Record<string, number> = {
  soccer_epl: 10,
  soccer_uefa_champs_league: 10,
  soccer_spain_la_liga: 9,
  soccer_italy_serie_a: 9,
  soccer_germany_bundesliga: 9,
  basketball_nba: 10,
  americanfootball_nfl: 10,
  baseball_mlb: 8,
  icehockey_nhl: 8,
  mma_mixed_martial_arts: 7,
  cricket_ipl: 7,
  tennis_atp_french_open: 7,
};

// ── Bookmaker Margin Calculation ──

/**
 * Calculate the overround (bookmaker margin) for a set of outcomes.
 * Lower overround = better value for bettors.
 * Formula: sum(1/decimal_odds) - 1
 */
function calculateOverround(
  outcomes: Array<{ price: number }>,
): number {
  if (outcomes.length === 0) return 999;
  const sumImpliedProbs = outcomes.reduce(
    (sum, o) => sum + (o.price > 0 ? 1 / o.price : 0),
    0,
  );
  return Number((sumImpliedProbs - 1).toFixed(4));
}

/**
 * Find the best bookmaker for an event (lowest overround on h2h market).
 */
function findBestBookmaker(
  bookmakers: OddsApiBookmaker[],
): {
  bookmakerKey: string;
  bookmakerName: string;
  margin: number;
} | null {
  if (!bookmakers?.length) return null;

  let bestBookmaker: {
    bookmakerKey: string;
    bookmakerName: string;
    margin: number;
  } | null = null;

  for (const bm of bookmakers) {
    const h2hMarket = bm.markets?.find((m) => m.key === "h2h");
    if (!h2hMarket?.outcomes?.length) continue;

    const margin = calculateOverround(h2hMarket.outcomes);

    if (!bestBookmaker || margin < bestBookmaker.margin) {
      bestBookmaker = {
        bookmakerKey: bm.key,
        bookmakerName: bm.title,
        margin,
      };
    }
  }

  return bestBookmaker;
}

/**
 * Determine if an event should be featured based on league importance,
 * number of available markets, and margin quality.
 */
function shouldFeatureEvent(
  sportKey: string,
  bookmakers: OddsApiBookmaker[],
  bestMargin: number,
): boolean {
  const importance = LEAGUE_IMPORTANCE[sportKey] ?? 5;
  const totalMarkets = bookmakers.reduce(
    (count, bm) => count + (bm.markets?.length ?? 0),
    0,
  );

  // Feature if: high importance + many markets + good margin
  return importance >= 8 && totalMarkets >= 3 && bestMargin < 0.08;
}

// ── Main Processing Function ──

/**
 * Process and save events from The Odds API.
 * Enforces all business rules before persisting data.
 *
 * Returns count of events processed.
 */
export async function processAndSaveEvents(
  apiEvents: OddsApiEvent[],
  categorySportKey: string,
  houseMarginPercent: number = 5,
): Promise<{ saved: number; skipped: number }> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + SEVEN_DAYS_MS);
  let saved = 0;
  let skipped = 0;

  for (const event of apiEvents) {
    const commenceTime = new Date(event.commence_time);

    // ── Rule 2: 7-day rolling window ──
    if (commenceTime <= now || commenceTime > sevenDaysFromNow) {
      skipped++;
      continue;
    }

    // ── Rule 1: No event without odds ──
    const hasOdds = event.bookmakers && event.bookmakers.length > 0;
    const hasActualOutcomes = event.bookmakers?.some((bm) =>
      bm.markets?.some((m) => m.outcomes && m.outcomes.length > 0),
    );

    if (!hasOdds || !hasActualOutcomes) {
      skipped++;
      continue;
    }

    // ── Rule 5: Calculate best bookmaker ──
    const bestBookmaker = findBestBookmaker(event.bookmakers!);
    if (!bestBookmaker) {
      skipped++;
      continue;
    }

    const isFeatured = shouldFeatureEvent(
      event.sport_key,
      event.bookmakers!,
      bestBookmaker.margin,
    );

    try {
      // Check if event already exists to preserve manually set margins
      const existingEvent = await prisma.sportEvent.findUnique({
        where: { eventId: event.id },
        select: { houseMargin: true, autoConfigured: true },
      });

      const effectiveMargin = existingEvent?.houseMargin && !existingEvent.autoConfigured
        ? existingEvent.houseMargin
        : houseMarginPercent;

      // Upsert the event
      await prisma.sportEvent.upsert({
        where: { eventId: event.id },
        update: {
          leagueName: event.sport_title,
          sportKey: event.sport_key,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime,
          fetchedAt: now,
          syncedAt: now,
          isActive: true,
          oddsVerified: true,
          bookmakerKey: bestBookmaker.bookmakerKey,
          bookmakerMargin: bestBookmaker.margin,
          autoConfigured: true,
          isFeatured: isFeatured || undefined,
        },
        create: {
          eventId: event.id,
          leagueName: event.sport_title,
          sportKey: event.sport_key,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime,
          status: "UPCOMING",
          isActive: true,
          houseMargin: effectiveMargin,
          marketsEnabled: ["h2h"],
          oddsVerified: true,
          bookmakerKey: bestBookmaker.bookmakerKey,
          bookmakerMargin: bestBookmaker.margin,
          autoConfigured: true,
          isFeatured,
          syncedAt: now,
        },
      });

      // Upsert displayed odds from the best bookmaker
      const bestBm = event.bookmakers!.find(
        (bm) => bm.key === bestBookmaker.bookmakerKey,
      );

      if (bestBm) {
        for (const market of bestBm.markets ?? []) {
          for (const outcome of market.outcomes ?? []) {
            const adjustedOdds = Number(
              (outcome.price / (1 + effectiveMargin / 100)).toFixed(2),
            );

            await prisma.displayedOdds.upsert({
              where: {
                eventId_bookmakerId_marketType_side: {
                  eventId: event.id,
                  bookmakerId: bestBm.key,
                  marketType: market.key,
                  side: outcome.name,
                },
              },
              update: {
                rawOdds: outcome.price,
                displayOdds: adjustedOdds,
                bookmakerName: bestBm.title,
              },
              create: {
                eventId: event.id,
                bookmakerId: bestBm.key,
                bookmakerName: bestBm.title,
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

      saved++;
    } catch (error) {
      console.error(
        `[EventProcessing] Error processing event ${event.id}:`,
        error,
      );
      skipped++;
    }
  }

  // Update SportCategory record
  try {
    const now2 = new Date();
    const sevenDaysLater = new Date(now2.getTime() + SEVEN_DAYS_MS);

    const eventCount = await prisma.sportEvent.count({
      where: {
        sportKey: { startsWith: categorySportKey },
        isActive: true,
        oddsVerified: true,
        status: { in: ["UPCOMING", "LIVE"] },
        commenceTime: { gt: now2, lte: sevenDaysLater },
      },
    });

    await prisma.sportCategory.updateMany({
      where: { sportKey: categorySportKey },
      data: {
        eventCount,
        lastSyncedAt: now2,
        isActive: eventCount > 0,
      },
    });
  } catch {
    // Non-critical; log and continue
    console.warn(`[EventProcessing] Failed to update category ${categorySportKey}`);
  }

  return { saved, skipped };
}

// ── Business Rule Enforcement ──

/**
 * Enforce Rule 1: Deactivate any events that have no odds.
 * Called periodically to catch edge cases.
 */
export async function deactivateEventsWithoutOdds(): Promise<number> {
  const result = await prisma.sportEvent.updateMany({
    where: {
      isActive: true,
      displayedOdds: { none: {} },
    },
    data: {
      isActive: false,
      oddsVerified: false,
    },
  });

  if (result.count > 0) {
    console.log(
      `[EventProcessing] Deactivated ${result.count} events without odds`,
    );
  }

  return result.count;
}

/**
 * Enforce Rule 6: Remove events outside the 7-day window.
 * Deactivate events whose commenceTime is > 7 days from now.
 */
export async function enforceSevenDayWindow(): Promise<number> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + SEVEN_DAYS_MS);

  // Deactivate events too far in the future
  const farFuture = await prisma.sportEvent.updateMany({
    where: {
      isActive: true,
      status: "UPCOMING",
      commenceTime: { gt: sevenDaysFromNow },
    },
    data: { isActive: false },
  });

  // Deactivate past events still marked active + upcoming
  const pastUpcoming = await prisma.sportEvent.updateMany({
    where: {
      isActive: true,
      status: "UPCOMING",
      commenceTime: { lte: now },
    },
    data: { status: "LIVE" },
  });

  return farFuture.count + pastUpcoming.count;
}

/**
 * Enforce Rule 3: Transition events to LIVE when kickoff time has passed.
 */
export async function transitionToLive(): Promise<number> {
  const now = new Date();

  const result = await prisma.sportEvent.updateMany({
    where: {
      status: "UPCOMING",
      commenceTime: { lte: now },
    },
    data: { status: "LIVE" },
  });

  return result.count;
}

/**
 * Enforce Rule 4: Archive finished events.
 * - Events that have been LIVE for > 2.5 hours → FINISHED
 * - Events with no result 6+ hours past kickoff → CANCELLED
 * - Finished/Cancelled events set isActive = false
 */
export async function archiveFinishedEvents(): Promise<{
  finished: number;
  cancelled: number;
}> {
  const now = new Date();
  const finishedCutoff = new Date(now.getTime() - 150 * 60 * 1000); // 2.5 hours
  const cancelCutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6 hours

  // LIVE → FINISHED (2.5 hours after kickoff)
  const finished = await prisma.sportEvent.updateMany({
    where: {
      status: "LIVE",
      commenceTime: { lte: finishedCutoff },
    },
    data: { status: "FINISHED", isActive: false },
  });

  // FINISHED events still active → deactivate
  await prisma.sportEvent.updateMany({
    where: {
      status: { in: ["FINISHED", "CANCELLED"] },
      isActive: true,
    },
    data: { isActive: false },
  });

  // Events 6+ hours past kickoff with no score → CANCELLED
  const cancelled = await prisma.sportEvent.updateMany({
    where: {
      status: { in: ["LIVE", "UPCOMING"] },
      commenceTime: { lte: cancelCutoff },
      homeScore: null,
      awayScore: null,
    },
    data: { status: "CANCELLED", isActive: false },
  });

  return { finished: finished.count, cancelled: cancelled.count };
}

/**
 * Update live scores from The Odds API score data.
 */
export async function updateLiveScores(
  scoreEvents: Array<{
    id: string;
    completed: boolean;
    scores: Array<{ name: string; score: string }> | null;
  }>,
): Promise<number> {
  let updated = 0;

  for (const scoreEvent of scoreEvents) {
    if (!scoreEvent.scores) continue;

    const homeScore = scoreEvent.scores[0]
      ? parseInt(scoreEvent.scores[0].score, 10)
      : null;
    const awayScore = scoreEvent.scores[1]
      ? parseInt(scoreEvent.scores[1].score, 10)
      : null;

    const data: Prisma.SportEventUpdateInput = {
      homeScore: isNaN(homeScore as number) ? null : homeScore,
      awayScore: isNaN(awayScore as number) ? null : awayScore,
    };

    if (scoreEvent.completed) {
      data.status = "FINISHED";
      data.isActive = false;
    }

    try {
      await prisma.sportEvent.updateMany({
        where: {
          eventId: scoreEvent.id,
          status: { in: ["LIVE", "UPCOMING"] },
        },
        data: data as Prisma.SportEventUpdateManyMutationInput,
      });
      updated++;
    } catch {
      // Skip individual failures
    }
  }

  return updated;
}
