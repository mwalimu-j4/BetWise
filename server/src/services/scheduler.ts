import cron from "node-cron";
import { fetchAndSaveFixtures } from "./fixturesService";
import { fetchAndSaveOdds } from "./oddsService";

void Promise.all([
  fetchAndSaveFixtures().catch((error: unknown) => {
    console.error("[Fixtures] Error:", error);
  }),
  fetchAndSaveOdds().catch((error: unknown) => {
    console.error("[Odds] Error:", error);
  }),
]);

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
