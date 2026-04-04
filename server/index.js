import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import { startScheduler } from "./services/scheduler.js";
import { fetchAndSaveFixtures } from "./services/fixturesService.js";
import { fetchAndSaveOdds } from "./services/oddsService.js";
import { initializeSchema } from "./scripts/initSchema.js";
import adminAuthRoutes from "./routes/admin/auth.js";
import adminDashboardRoutes from "./routes/admin/dashboard.js";
import adminEventsRoutes from "./routes/admin/events.js";
import adminOddsRoutes from "./routes/admin/odds.js";
import adminBetsRoutes from "./routes/admin/bets.js";
import adminUsersRoutes from "./routes/admin/users.js";

const app = express();
const port = Number(process.env.PORT ?? 5000);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  "https://betwise-95cj.onrender.com",
  "https://bet-wise1.vercel.app",
  ...(process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "BettCenic admin API" });
});

app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/events", adminEventsRoutes);
app.use("/api/admin/odds", adminOddsRoutes);
app.use("/api/admin/bets", adminBetsRoutes);
app.use("/api/admin/users", adminUsersRoutes);

app.post("/api/admin/sync/fixtures", async (_req, res) => {
  try {
    const count = await fetchAndSaveFixtures();
    res.json({ message: "Fixtures synced", count });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to sync fixtures", error: error.message });
  }
});

app.post("/api/admin/sync/odds", async (_req, res) => {
  try {
    await fetchAndSaveOdds();
    res.json({ message: "Odds synced" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to sync odds", error: error.message });
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Unexpected server error" });
});

async function bootstrap() {
  try {
    await pool.query("SELECT 1");
    await initializeSchema();
    startScheduler();
    app.listen(port, () => {
      console.log(`BettCenic server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

void bootstrap();
