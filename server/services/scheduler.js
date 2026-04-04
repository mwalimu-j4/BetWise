import cron from "node-cron";
import { fetchAndSaveFixtures } from "./fixturesService.js";
import { fetchAndSaveOdds } from "./oddsService.js";

export function startScheduler() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await fetchAndSaveFixtures();
    } catch (error) {
      console.error("Fixture job failed", error);
    }
  });

  cron.schedule("*/10 * * * *", async () => {
    try {
      await fetchAndSaveOdds();
    } catch (error) {
      console.error("Odds job failed", error);
    }
  });
}
