import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { fetchAndSaveFixtures } from "./fixturesService";
import { fetchAndSaveOdds } from "./oddsService";
import { expirePastSportEvents } from "./sportCategoriesService";
import {
  emitCustomEventLive,
  emitCustomEventFinished,
} from "../lib/socket";
import {
  createEventEndedAdminNotification,
  createMatchEndedUserNotifications,
  createSportMatchEndedUserNotifications,
} from "../controllers/notifications.controller";

export async function updateEventStatuses() {
  const now = new Date();
  const finishedCutoff = new Date(now.getTime() - 150 * 60 * 1000);

  // Find events that are about to transition to FINISHED (before bulk update)
  const eventsToFinish = await prisma.sportEvent.findMany({
    where: {
      status: "LIVE",
      commenceTime: { lte: finishedCutoff },
    },
    select: {
      eventId: true,
      homeTeam: true,
      awayTeam: true,
    },
  });

  const [liveUpdated, finishedUpdated] = await Promise.all([
    prisma.sportEvent.updateMany({
      where: {
        status: "UPCOMING",
        commenceTime: { lte: now },
      },
      data: { status: "LIVE" },
    }),
    prisma.sportEvent.updateMany({
      where: {
        status: "LIVE",
        commenceTime: { lte: finishedCutoff },
      },
      data: { status: "FINISHED" },
    }),
  ]);

  // Notify admins about newly finished events with pending bets
  for (const event of eventsToFinish) {
    void (async () => {
      try {
        const [pendingCount, totalCount, stakeAgg] = await Promise.all([
          prisma.bet.count({
            where: { eventId: event.eventId, status: "PENDING" },
          }),
          prisma.bet.count({
            where: { eventId: event.eventId },
          }),
          prisma.bet.aggregate({
            where: { eventId: event.eventId },
            _sum: { stake: true },
          }),
        ]);

        if (totalCount > 0) {
          await Promise.all([
            createEventEndedAdminNotification({
              eventName: `${event.homeTeam} vs ${event.awayTeam}`,
              eventType: "sport",
              pendingBetsCount: pendingCount,
              totalBetsCount: totalCount,
              totalStaked: stakeAgg._sum.stake ?? 0,
              eventId: event.eventId,
            }),
            createSportMatchEndedUserNotifications({
              eventId: event.eventId,
              eventName: `${event.homeTeam} vs ${event.awayTeam}`,
            })
          ]);
        }
      } catch (err) {
        console.error(`[Scheduler] Failed to send event-ended notification for ${event.eventId}:`, err);
      }
    })();
  }

  console.log(
    `[Scheduler] Status update complete - EXPIRED:${expiredUpdated.count} FINISHED:${finishedUpdated.count}`,
  );
}

// ── Custom Events Auto Status Transitions ──

export async function updateCustomEventStatuses() {
  const now = new Date();
  const defaultEndCutoff = new Date(now.getTime() - 150 * 60 * 1000); // 2.5 hours after start

  try {
    // 1. PUBLISHED events where startTime <= now → transition to LIVE
    const publishedToLive = await prisma.customEvent.findMany({
      where: {
        status: "PUBLISHED",
        startTime: { lte: now },
      },
      select: { id: true, title: true },
    });

    if (publishedToLive.length > 0) {
      await prisma.customEvent.updateMany({
        where: {
          id: { in: publishedToLive.map((e) => e.id) },
        },
        data: { status: "LIVE" },
      });

      // Emit socket events for each
      for (const event of publishedToLive) {
        emitCustomEventLive({ eventId: event.id });
      }

      console.log(
        `[CustomEventsScheduler] PUBLISHED → LIVE: ${publishedToLive.length} events (${publishedToLive.map((e) => e.title).join(", ")})`,
      );
    }

    // 2. LIVE events where endTime <= now (or startTime + 2.5h <= now if no endTime) → FINISHED
    const liveToFinish = await prisma.customEvent.findMany({
      where: {
        status: "LIVE",
        OR: [
          // Has explicit endTime that has passed
          {
            endTime: { not: null, lte: now },
          },
          // No endTime: use default cutoff (2.5 hours after start)
          {
            endTime: null,
            startTime: { lte: defaultEndCutoff },
          },
        ],
      },
      select: { id: true, title: true },
    });

    if (liveToFinish.length > 0) {
      const eventIds = liveToFinish.map((e) => e.id);

      await prisma.$transaction([
        // Close all open/suspended markets
        prisma.customMarket.updateMany({
          where: {
            eventId: { in: eventIds },
            status: { in: ["OPEN", "SUSPENDED"] },
          },
          data: { status: "CLOSED" },
        }),
        // Finish the events
        prisma.customEvent.updateMany({
          where: { id: { in: eventIds } },
          data: { status: "FINISHED" },
        }),
      ]);

      for (const event of liveToFinish) {
        emitCustomEventFinished({ eventId: event.id });
      }

      // Notify admins about custom events finishing with unsettled markets
      for (const event of liveToFinish) {
        void (async () => {
          try {
            const [pendingBets, totalBets, stakeAgg] = await Promise.all([
              prisma.customBet.count({
                where: { eventId: event.id, status: "PENDING" },
              }),
              prisma.customBet.count({
                where: { eventId: event.id },
              }),
              prisma.customBet.aggregate({
                where: { eventId: event.id },
                _sum: { stake: true },
              }),
            ]);

            if (totalBets > 0) {
              await Promise.all([
                createEventEndedAdminNotification({
                  eventName: event.title,
                  eventType: "custom",
                  pendingBetsCount: pendingBets,
                  totalBetsCount: totalBets,
                  totalStaked: stakeAgg._sum.stake ?? 0,
                  eventId: event.id,
                }),
                createMatchEndedUserNotifications({
                  eventId: event.id,
                  eventName: event.title,
                })
              ]);
            }
          } catch (err) {
            console.error(`[CustomEventsScheduler] Failed to send event-ended notification for ${event.id}:`, err);
          }
        })();
      }

      console.log(
        `[CustomEventsScheduler] LIVE → FINISHED: ${liveToFinish.length} events (${liveToFinish.map((e) => e.title).join(", ")})`,
      );
    }
  } catch (error) {
    console.error("[CustomEventsScheduler] Error:", error);
  }
}

// ── Initialization ──

void Promise.all([
  updateEventStatuses().catch((error: unknown) => {
    console.error("[Scheduler] Status update error:", error);
  }),
  fetchAndSaveFixtures().catch((error: unknown) => {
    console.error("[Fixtures] Error:", error);
  }),
  fetchAndSaveOdds().catch((error: unknown) => {
    console.error("[Odds] Error:", error);
  }),
  updateCustomEventStatuses().catch((error: unknown) => {
    console.error("[CustomEventsScheduler] Init error:", error);
  }),
]);

// ── Cron Jobs ──

cron.schedule("*/15 * * * *", () => {
  void updateEventStatuses().catch((error: unknown) => {
    console.error("[Scheduler] Status cron error:", error);
  });
});

cron.schedule("*/5 * * * *", () => {
  void fetchAndSaveFixtures().catch((error: unknown) => {
    console.error("[Fixtures] Cron error:", error);
  });
});

cron.schedule("*/10 * * * *", () => {
  void fetchAndSaveOdds().catch((error: unknown) => {
    console.error("[Odds] Cron error:", error);
  });
});

// Custom events: check every minute for faster status transitions
cron.schedule("*/1 * * * *", () => {
  void updateCustomEventStatuses().catch((error: unknown) => {
    console.error("[CustomEventsScheduler] Cron error:", error);
  });
});

console.log(
  "[Scheduler] Running - sport-expiry:15min fixtures:5min odds:10min custom-events:1min",
);
