import { Prisma, type EventStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { OddsApiBookmaker, OddsApiEvent, OddsApiScoreEvent } from "./oddsApiService";
import {
  getAutomationConfigByCategoryKey,
  mapApiSportKeyToCategoryKey,
  SEVEN_DAY_WINDOW_MS,
} from "./oddsAutomationConfig";
import { createAlert } from "./adminAlertService";
import { BetSettlementService } from "./betSettlementService";
import { createSportMatchEndedUserNotifications } from "../controllers/notifications.controller";

function calculateOverround(outcomes: Array<{ price: number }>) {
  if (!outcomes.length) return Number.POSITIVE_INFINITY;
  const implied = outcomes.reduce((sum, item) => sum + 1 / item.price, 0);
  return Number((implied - 1).toFixed(4));
}

function findBestBookmaker(bookmakers: OddsApiBookmaker[]) {
  let best:
    | {
        bookmakerKey: string;
        bookmakerName: string;
        margin: number;
        markets: NonNullable<OddsApiBookmaker["markets"]>;
      }
    | null = null;

  for (const bookmaker of bookmakers) {
    const eligibleMarkets = (bookmaker.markets ?? []).filter(
      (market) => Array.isArray(market.outcomes) && market.outcomes.length > 1,
    );
    if (!eligibleMarkets.length) continue;

    const h2h = eligibleMarkets.find((market) => market.key === "h2h") ?? eligibleMarkets[0];
    const margin = calculateOverround(h2h.outcomes ?? []);
    if (!Number.isFinite(margin)) continue;

    if (!best || margin < best.margin) {
      best = {
        bookmakerKey: bookmaker.key,
        bookmakerName: bookmaker.title,
        margin,
        markets: eligibleMarkets,
      };
    }
  }

  return best;
}

function shouldFeatureEvent(event: OddsApiEvent, marketCount: number, margin: number) {
  const categoryKey = mapApiSportKeyToCategoryKey(event.sport_key);
  const baseImportance = categoryKey
    ? getAutomationConfigByCategoryKey(categoryKey)?.leagueImportance ?? 5
    : 5;

  return baseImportance >= 8 && marketCount >= 3 && margin <= 0.08;
}

function inManagedWindow(commenceTime: Date, now = new Date()) {
  return commenceTime > now && commenceTime <= new Date(now.getTime() + SEVEN_DAY_WINDOW_MS);
}

function statusForCommenceTime(commenceTime: Date, now = new Date()): EventStatus {
  return commenceTime <= now ? "LIVE" : "UPCOMING";
}

function normalizeTeam(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function extractScoreTuple(event: OddsApiScoreEvent) {
  const byTeam = new Map(
    (event.scores ?? []).map((row) => [
      normalizeTeam(row.name),
      Number.parseInt(row.score, 10),
    ]),
  );

  const homeScore = byTeam.get(normalizeTeam(event.home_team));
  const awayScore = byTeam.get(normalizeTeam(event.away_team));

  return {
    homeScore: Number.isFinite(homeScore) ? homeScore ?? null : null,
    awayScore: Number.isFinite(awayScore) ? awayScore ?? null : null,
  };
}

async function recomputeCategorySummary(categoryKey: string, tx: Prisma.TransactionClient = prisma) {
  const config = getAutomationConfigByCategoryKey(categoryKey);
  const now = new Date();
  const windowEnd = new Date(now.getTime() + SEVEN_DAY_WINDOW_MS);

  const [eventCount, margins] = await Promise.all([
    tx.sportEvent.count({
      where: {
        sportKey: { in: config?.apiSportKeys ?? [] },
        isActive: true,
        oddsVerified: true,
        status: { in: ["UPCOMING", "LIVE"] },
        commenceTime: { gt: now, lte: windowEnd },
      },
    }),
    tx.sportEvent.findMany({
      where: {
        sportKey: { in: config?.apiSportKeys ?? [] },
        isActive: true,
        oddsVerified: true,
        status: { in: ["UPCOMING", "LIVE"] },
        commenceTime: { gt: now, lte: windowEnd },
      },
      select: { bookmakerMargin: true },
      take: 100,
    }),
  ]);

  const avgMargin =
    margins.length > 0
      ? Number(
          (
            margins.reduce((sum, row) => sum + row.bookmakerMargin, 0) / margins.length
          ).toFixed(4),
        )
      : 0;

  await tx.sportCategory.updateMany({
    where: { sportKey: categoryKey },
    data: {
      eventCount,
      lastSyncedAt: new Date(),
      isActive: true,
      apiSportId: config?.apiSportKeys[0] ?? null,
    },
  });

  return { eventCount, avgMargin };
}

export async function processAndSaveEvents(apiEvents: OddsApiEvent[], categoryKey: string) {
  let saved = 0;
  let skipped = 0;
  const now = new Date();

  for (const event of apiEvents) {
    const commenceTime = new Date(event.commence_time);
    if (!inManagedWindow(commenceTime, now)) {
      skipped += 1;
      continue;
    }

    const bestBookmaker = findBestBookmaker(event.bookmakers ?? []);
    if (!bestBookmaker) {
      skipped += 1;
      continue;
    }

    const marketCount = bestBookmaker.markets.length;
    const featured = shouldFeatureEvent(event, marketCount, bestBookmaker.margin);
    const marketsEnabled = Array.from(new Set(bestBookmaker.markets.map((market) => market.key)));

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.sportEvent.findUnique({
          where: { eventId: event.id },
          select: { houseMargin: true, autoConfigured: true, status: true, archivedAt: true },
        });

        const houseMargin = existing?.houseMargin ?? 0;
        const status =
          existing?.status === "FINISHED" || existing?.status === "CANCELLED"
            ? existing.status
            : statusForCommenceTime(commenceTime, now);
        const isActive = bestBookmaker.markets.some(
          (market) => (market.outcomes ?? []).length > 0,
        );

        await tx.sportEvent.upsert({
          where: { eventId: event.id },
          update: {
            externalEventId: event.id,
            leagueName: event.sport_title,
            sportKey: event.sport_key,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            commenceTime,
            status,
            isActive,
            rawData: event as unknown as Prisma.InputJsonValue,
            fetchedAt: now,
            syncedAt: now,
            oddsVerified: isActive,
            bookmakerKey: bestBookmaker.bookmakerKey,
            bookmakerMargin: bestBookmaker.margin,
            autoConfigured: true,
            isFeatured: featured,
            marketsEnabled,
            archivedAt:
              existing?.status === "FINISHED" || existing?.status === "CANCELLED"
                ? existing.archivedAt
                : null,
          },
          create: {
            eventId: event.id,
            externalEventId: event.id,
            leagueName: event.sport_title,
            sportKey: event.sport_key,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            commenceTime,
            status,
            isActive,
            rawData: event as unknown as Prisma.InputJsonValue,
            fetchedAt: now,
            syncedAt: now,
            houseMargin,
            oddsVerified: isActive,
            bookmakerKey: bestBookmaker.bookmakerKey,
            bookmakerMargin: bestBookmaker.margin,
            autoConfigured: true,
            isFeatured: featured,
            marketsEnabled,
          },
        });

        await tx.eventOdds.deleteMany({ where: { eventId: event.id } });
        await tx.displayedOdds.deleteMany({ where: { eventId: event.id } });

        for (const market of bestBookmaker.markets) {
          for (const outcome of market.outcomes ?? []) {
            const displayOdds = Number((outcome.price / (1 + houseMargin / 100)).toFixed(2));

            await tx.eventOdds.create({
              data: {
                eventId: event.id,
                bookmakerId: bestBookmaker.bookmakerKey,
                bookmakerName: bestBookmaker.bookmakerName,
                marketType: market.key,
                side: outcome.name,
                decimalOdds: outcome.price,
              },
            });

            await tx.displayedOdds.create({
              data: {
                eventId: event.id,
                bookmakerId: bestBookmaker.bookmakerKey,
                bookmakerName: bestBookmaker.bookmakerName,
                marketType: market.key,
                side: outcome.name,
                rawOdds: outcome.price,
                displayOdds,
                isVisible: true,
              },
            });
          }
        }
      });

      saved += 1;
    } catch (error) {
      console.error(`[EventProcessing] Failed to upsert ${event.id}:`, error);
      skipped += 1;
    }
  }

  await recomputeCategorySummary(categoryKey);
  return { saved, skipped };
}

export async function deactivateEventsWithoutOdds() {
  const result = await prisma.sportEvent.updateMany({
    where: {
      isActive: true,
      OR: [{ oddsVerified: false }, { displayedOdds: { none: {} } }],
    },
    data: {
      isActive: false,
      oddsVerified: false,
    },
  });

  if (result.count > 0) {
    await createAlert(
      "EVENT_NO_ODDS",
      `${result.count} event${result.count === 1 ? "" : "s"} were forced inactive because no odds were available.`,
      "warning",
    );
  }

  return result.count;
}

export async function enforceSevenDayWindow() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + SEVEN_DAY_WINDOW_MS);

  const result = await prisma.sportEvent.updateMany({
    where: {
      status: "UPCOMING",
      OR: [{ commenceTime: { lte: now } }, { commenceTime: { gt: windowEnd } }],
    },
    data: { isActive: false },
  });

  return result.count;
}

export async function transitionToLive() {
  const now = new Date();
  const result = await prisma.sportEvent.updateMany({
    where: {
      status: "UPCOMING",
      commenceTime: { lte: now },
      oddsVerified: true,
      isActive: true,
    },
    data: { status: "LIVE", syncedAt: now },
  });

  return result.count;
}

export async function updateLiveOdds(events: OddsApiEvent[]) {
  let updated = 0;

  for (const event of events) {
    const bestBookmaker = findBestBookmaker(event.bookmakers ?? []);
    if (!bestBookmaker) continue;

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.sportEvent.findUnique({
          where: { eventId: event.id },
          select: { houseMargin: true, status: true },
        });
        if (!existing) return;
        if (existing.status === "FINISHED" || existing.status === "CANCELLED") {
          return;
        }

        await tx.sportEvent.update({
          where: { eventId: event.id },
          data: {
            status: "LIVE",
            syncedAt: new Date(),
            bookmakerKey: bestBookmaker.bookmakerKey,
            bookmakerMargin: bestBookmaker.margin,
            oddsVerified: true,
            isActive: true,
            rawData: event as unknown as Prisma.InputJsonValue,
          },
        });

        await tx.displayedOdds.deleteMany({ where: { eventId: event.id } });
        await tx.eventOdds.deleteMany({ where: { eventId: event.id } });

        for (const market of bestBookmaker.markets) {
          for (const outcome of market.outcomes ?? []) {
            const displayOdds = Number(
              (outcome.price / (1 + (existing.houseMargin ?? 0) / 100)).toFixed(2),
            );

            await tx.eventOdds.create({
              data: {
                eventId: event.id,
                bookmakerId: bestBookmaker.bookmakerKey,
                bookmakerName: bestBookmaker.bookmakerName,
                marketType: market.key,
                side: outcome.name,
                decimalOdds: outcome.price,
              },
            });

            await tx.displayedOdds.create({
              data: {
                eventId: event.id,
                bookmakerId: bestBookmaker.bookmakerKey,
                bookmakerName: bestBookmaker.bookmakerName,
                marketType: market.key,
                side: outcome.name,
                rawOdds: outcome.price,
                displayOdds,
                isVisible: true,
              },
            });
          }
        }
      });

      updated += 1;
    } catch (error) {
      console.error(`[EventProcessing] Failed to refresh live odds for ${event.id}:`, error);
    }
  }

  return updated;
}

export async function updateLiveScores(scoreEvents: OddsApiScoreEvent[]) {
  let updated = 0;

  for (const event of scoreEvents) {
    const { homeScore, awayScore } = extractScoreTuple(event);
    const updateResult = await prisma.sportEvent.updateMany({
      where: { eventId: event.id, status: { in: ["UPCOMING", "LIVE"] } },
      data: {
        status: event.completed ? "FINISHED" : "LIVE",
        isActive: !event.completed,
        homeScore,
        awayScore,
        syncedAt: new Date(),
        archivedAt: event.completed ? new Date() : null,
      },
    });

    if (event.completed && homeScore !== null && awayScore !== null) {
      void BetSettlementService.settleBetsForEvent(event.id, homeScore, awayScore);

      if (updateResult.count > 0) {
        void createSportMatchEndedUserNotifications({
          eventId: event.id,
          eventName: `${event.home_team} vs ${event.away_team}`,
        });
      }
    }

    updated += 1;
  }

  return updated;
}

export async function archiveFinishedEvents() {
  const now = new Date();
  const cancelCutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  const finishedEvents = await prisma.sportEvent.findMany({
    where: {
      status: "LIVE",
      commenceTime: { lte: now },
      homeScore: { not: null },
      awayScore: { not: null },
    },
    select: { eventId: true, homeScore: true, awayScore: true, homeTeam: true, awayTeam: true },
  });

  for (const event of finishedEvents) {
    await prisma.sportEvent.update({
      where: { eventId: event.eventId },
      data: {
        status: "FINISHED",
        isActive: false,
        archivedAt: now,
      },
    });

    // Settle bets for these events
    if (event.homeScore !== null && event.awayScore !== null) {
      void BetSettlementService.settleBetsForEvent(event.eventId, event.homeScore, event.awayScore);
      void createSportMatchEndedUserNotifications({
        eventId: event.eventId,
        eventName: `${event.homeTeam} vs ${event.awayTeam}`,
      });
    }
  }

  const cancelledEvents = await prisma.sportEvent.findMany({
    where: {
      status: { in: ["UPCOMING", "LIVE"] },
      commenceTime: { lte: cancelCutoff },
      homeScore: null,
      awayScore: null,
    },
    select: { eventId: true },
  });

  for (const event of cancelledEvents) {
    await prisma.sportEvent.update({
      where: { eventId: event.eventId },
      data: {
        status: "CANCELLED",
        isActive: false,
        archivedAt: now,
      },
    });

    // Refund bets for cancelled events
    void BetSettlementService.refundBetsForEvent(event.eventId, "Match timed out/cancelled");
  }

  return { finished: finishedEvents.length, cancelled: cancelledEvents.length };
}

export async function refreshCategorySummaries() {
  const categories = await prisma.sportCategory.findMany({
    select: { sportKey: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const category of categories) {
    await recomputeCategorySummary(category.sportKey);
  }
}
