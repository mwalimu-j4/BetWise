import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { fetchAndSaveFixtures } from "./fixturesService";
import { fetchAndSaveOdds } from "./oddsService";

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
]);

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

console.log("[Scheduler] Running - fixtures:5min odds:10min");
