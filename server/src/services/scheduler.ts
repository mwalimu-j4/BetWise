import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { fetchAndSaveFixtures } from "./fixturesService";
import { fetchAndSaveOdds } from "./oddsService";
import {
  emitCustomEventLive,
  emitCustomEventFinished,
} from "../lib/socket";

export async function updateEventStatuses() {
  const now = new Date();
  const finishedCutoff = new Date(now.getTime() - 150 * 60 * 1000);

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

  console.log(
    `[Scheduler] Status update complete - LIVE:${liveUpdated.count} FINISHED:${finishedUpdated.count}`,
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

cron.schedule("*/2 * * * *", () => {
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

// ── Auto-Expiry Job: expire stale events every 15 minutes ──

export async function autoExpireStaleEvents() {
  const now = new Date();

  try {
    // Mark stale UPCOMING events (past commence_time, not live) as FINISHED
    const expired = await prisma.sportEvent.updateMany({
      where: {
        status: "UPCOMING",
        commenceTime: { lt: now },
      },
      data: { status: "FINISHED" },
    });

    if (expired.count > 0) {
      console.log(
        `[AutoExpiry] Expired ${expired.count} stale UPCOMING events`,
      );
    }

    // Update sport_categories event counts
    const activeCounts = await prisma.sportEvent.groupBy({
      by: ["sportKey"],
      where: {
        isActive: true,
        status: { in: ["UPCOMING", "LIVE"] },
        commenceTime: { gt: now },
      },
      _count: { id: true },
    });

    const categories = await prisma.sportCategory.findMany({
      select: { id: true, sportKey: true },
    });

    for (const cat of categories) {
      // Sum counts from sportEvents that match this category
      let total = 0;
      for (const row of activeCounts) {
        if (row.sportKey && row.sportKey.toLowerCase().startsWith(cat.sportKey.toLowerCase())) {
          total += row._count.id;
        }
      }

      await prisma.sportCategory.update({
        where: { id: cat.id },
        data: { eventCount: total },
      });
    }
  } catch (error) {
    console.error("[AutoExpiry] Error:", error);
  }
}

// Run on startup
void autoExpireStaleEvents().catch((error: unknown) => {
  console.error("[AutoExpiry] Init error:", error);
});

// Every 15 minutes
cron.schedule("*/15 * * * *", () => {
  void autoExpireStaleEvents().catch((error: unknown) => {
    console.error("[AutoExpiry] Cron error:", error);
  });
});

console.log(
  "[Scheduler] Running - fixtures:5min odds:10min custom-events:1min auto-expiry:15min",
);
