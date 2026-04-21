/**
 * ── Enhanced Scheduler ──
 * Fully automated event management with 4 cron jobs.
 *
 * Budget for Starter plan (2000 calls/month):
 *  Job 1 — Event Sync: every 6 hours (4×/day × 5 leagues = 20 calls/day)
 *  Job 2 — Live Monitor: every 5 min (scores only when live events exist, ~10 calls/day)
 *  Job 3 — Cleanup: every 30 min (no API calls, just DB operations)
 *  Job 4 — Health Check: every 1 hour (no API calls, just DB checks)
 *
 * Total estimated: ~35 calls/day = ~1050/month (well under 2000 limit)
 */

import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { fetchAndSaveFixtures } from "./fixturesService";
import {
  fetchSportOdds,
  fetchSportScores,
  getApiStatus,
  isCreditsCritical,
  logApiSync,
  setLastSuccessfulSync,
} from "./oddsApiService";
import {
  processAndSaveEvents,
  deactivateEventsWithoutOdds,
  enforceSevenDayWindow,
  transitionToLive,
  archiveFinishedEvents,
  updateLiveScores,
} from "./eventProcessingService";
import {
  createAlert,
  cleanupOldAlerts,
} from "./adminAlertService";
import {
  emitCustomEventLive,
  emitCustomEventFinished,
} from "../lib/socket";
import {
  createEventEndedAdminNotification,
  createMatchEndedUserNotifications,
  createSportMatchEndedUserNotifications,
} from "../controllers/notifications.controller";

// ── Sport API Mapping (same as sport-categories route) ──

const SPORT_API_MAPPING: Record<string, string[]> = {
  soccer: [
    "soccer_epl",
    "soccer_uefa_champs_league",
    "soccer_spain_la_liga",
    "soccer_italy_serie_a",
    "soccer_germany_bundesliga",
    "soccer_france_ligue_one",
    "soccer_brazil_serie_a",
    "soccer_efl_champ",
    "soccer_fa_cup",
    "soccer_league_of_ireland",
    "soccer_conmebol_copa_libertadores",
    "soccer_uefa_europa_league",
    "soccer_portugal_primeira_liga",
    "soccer_turkey_super_league",
    "soccer_netherlands_eredivisie",
    "soccer_mexico_ligamx",
    "soccer_usa_mls",
  ],
  basketball: [
    "basketball_nba",
    "basketball_euroleague",
    "basketball_ncaab",
  ],
  tennis: [
    "tennis_atp_french_open",
    "tennis_wta_french_open",
    "tennis_atp_wimbledon",
  ],
  americanfootball: [
    "americanfootball_nfl",
    "americanfootball_ncaaf",
  ],
  cricket: [
    "cricket_ipl",
    "cricket_test_match",
    "cricket_odi",
  ],
  icehockey: [
    "icehockey_nhl",
    "icehockey_sweden_allsvenskan",
  ],
  rugbyunion: [
    "rugbyleague_nrl",
  ],
  boxing_mma: [
    "mma_mixed_martial_arts",
    "boxing_boxing",
  ],
  baseball: [
    "baseball_mlb",
  ],
  volleyball: [],
  tabletennis: [],
  golf: [
    "golf_masters_tournament_winner",
    "golf_pga_championship_winner",
  ],
  snooker: [],
  darts: [],
};

// Get active sport category keys from DB  
async function getActiveSportKeys(): Promise<string[]> {
  const active = await prisma.sportCategory.findMany({
    where: { isActive: true },
    select: { sportKey: true },
    orderBy: { sortOrder: "asc" },
  });
  return active.map((c) => c.sportKey);
}

// Map event sportKey to category key (reused from sport-categories route)
function mapEventSportKeyToCategory(eventSportKey: string): string {
  const lower = eventSportKey.toLowerCase();
  if (lower.startsWith("soccer")) return "soccer";
  if (lower.startsWith("basketball")) return "basketball";
  if (lower.startsWith("tennis")) return "tennis";
  if (lower.startsWith("americanfootball")) return "americanfootball";
  if (lower.startsWith("cricket")) return "cricket";
  if (lower.startsWith("icehockey")) return "icehockey";
  if (lower.startsWith("rugby")) return "rugbyunion";
  if (lower.startsWith("mma") || lower.startsWith("boxing")) return "boxing_mma";
  if (lower.startsWith("baseball")) return "baseball";
  if (lower.startsWith("volleyball")) return "volleyball";
  if (lower.startsWith("tabletennis")) return "tabletennis";
  if (lower.startsWith("golf")) return "golf";
  if (lower.startsWith("snooker")) return "snooker";
  if (lower.startsWith("darts")) return "darts";
  return lower;
}

// ═══════════════════════════════════════════════════════════
// JOB 1: EVENT SYNC (runs every 6 hours)
// ═══════════════════════════════════════════════════════════

export async function jobEventSync(): Promise<void> {
  const startTime = Date.now();
  console.log("[Job1:EventSync] 🔄 Starting automated event sync...");

  try {
    const activeSports = await getActiveSportKeys();
    
    if (activeSports.length === 0) {
      console.log("[Job1:EventSync] No active sport categories. Skipping.");
      return;
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dateFrom = now.toISOString();
    const dateTo = sevenDaysFromNow.toISOString();

    let totalSaved = 0;
    let totalSkipped = 0;
    let sportsProcessed = 0;
    let sportsFailed = 0;

    for (const sportKey of activeSports) {
      const apiKeys = SPORT_API_MAPPING[sportKey] ?? [];
      if (apiKeys.length === 0) {
        console.log(`[Job1:EventSync] No API keys for ${sportKey}, skipping.`);
        continue;
      }

      // Only fetch from the first available API key per sport to conserve credits
      // The Starter plan has 5-league limit, so we pick the primary league per sport
      const primaryApiKey = apiKeys[0];

      const apiStatus = getApiStatus();
      if (!apiStatus.isOnline) {
        console.warn(`[Job1:EventSync] API offline, stopping sync.`);
        break;
      }

      const events = await fetchSportOdds(primaryApiKey, {
        dateFrom,
        dateTo,
      });

      if (events === null) {
        sportsFailed++;
        continue;
      }

      const result = await processAndSaveEvents(events, sportKey);
      totalSaved += result.saved;
      totalSkipped += result.skipped;
      sportsProcessed++;

      console.log(
        `[Job1:EventSync] ${sportKey} (${primaryApiKey}): saved=${result.saved} skipped=${result.skipped}`,
      );
    }

    // Also enforce business rules after sync
    await deactivateEventsWithoutOdds();
    await enforceSevenDayWindow();

    setLastSuccessfulSync();

    const durationMs = Date.now() - startTime;

    await logApiSync({
      jobName: "event_sync",
      status: sportsFailed > 0 ? "partial" : "success",
      sportsProcessed,
      eventsLoaded: totalSaved,
      durationMs,
      errorMessage: sportsFailed > 0 ? `${sportsFailed} sports failed` : undefined,
    });

    if (totalSaved > 0) {
      await createAlert(
        "SYNC_SUCCESS",
        `Auto-sync completed: ${totalSaved} events across ${sportsProcessed} sports (${durationMs}ms)`,
        "info",
        undefined,
        { totalSaved, totalSkipped, sportsProcessed, sportsFailed, durationMs },
      );
    }

    // Check for credits warning
    if (isCreditsCritical()) {
      const status = getApiStatus();
      await createAlert(
        "LOW_CREDITS",
        `API credits running low: ${status.creditsRemaining ?? "?"} remaining`,
        "warning",
        undefined,
        { creditsRemaining: status.creditsRemaining },
      );
    }

    console.log(
      `[Job1:EventSync] ✅ Complete: saved=${totalSaved} skipped=${totalSkipped} sports=${sportsProcessed} failed=${sportsFailed} (${durationMs}ms)`,
    );
  } catch (error) {
    console.error("[Job1:EventSync] ❌ Error:", error);

    await logApiSync({
      jobName: "event_sync",
      status: "failed",
      sportsProcessed: 0,
      eventsLoaded: 0,
      errorMessage: String(error),
      durationMs: Date.now() - startTime,
    });

    await createAlert(
      "SYNC_FAILED",
      `Auto-sync failed: ${String(error).slice(0, 200)}`,
      "critical",
      undefined,
      { error: String(error) },
    );
  }
}

// ═══════════════════════════════════════════════════════════
// JOB 2: LIVE EVENT MONITOR (runs every 5 minutes)
// ═══════════════════════════════════════════════════════════

export async function jobLiveEventMonitor(): Promise<void> {
  try {
    // Step 1: Transition upcoming → live
    const transitioned = await transitionToLive();
    if (transitioned > 0) {
      console.log(`[Job2:LiveMonitor] Transitioned ${transitioned} events to LIVE`);
    }

    // Step 2: Check if there are any live events before calling API
    const liveEventCount = await prisma.sportEvent.count({
      where: { status: "LIVE", isActive: true },
    });

    if (liveEventCount === 0) {
      return; // No live events, skip API calls to save credits
    }

    // Step 3: Get unique sport keys with live events
    const liveSports = await prisma.sportEvent.findMany({
      where: { status: "LIVE", isActive: true },
      select: { sportKey: true },
      distinct: ["sportKey"],
    });

    const uniqueApiKeys = new Set<string>();
    for (const row of liveSports) {
      if (row.sportKey) {
        uniqueApiKeys.add(row.sportKey);
      }
    }

    // Step 4: Fetch scores only for sports with live events (to save credits)
    // Limit to max 2 API calls per cycle to stay within budget
    let callCount = 0;
    const MAX_LIVE_CALLS_PER_CYCLE = 2;

    for (const apiSportKey of uniqueApiKeys) {
      if (callCount >= MAX_LIVE_CALLS_PER_CYCLE) break;

      const scores = await fetchSportScores(apiSportKey);
      if (scores) {
        const updated = await updateLiveScores(scores);
        if (updated > 0) {
          console.log(`[Job2:LiveMonitor] Updated ${updated} live scores for ${apiSportKey}`);
        }
      }
      callCount++;
    }
  } catch (error) {
    console.error("[Job2:LiveMonitor] Error:", error);
  }
}

// ═══════════════════════════════════════════════════════════
// JOB 3: EVENT CLEANUP (runs every 30 minutes)
// ═══════════════════════════════════════════════════════════

export async function jobEventCleanup(): Promise<void> {
  try {
    // Archive finished events
    const { finished, cancelled } = await archiveFinishedEvents();

    // Deactivate events without odds
    const deactivated = await deactivateEventsWithoutOdds();

    // Enforce 7-day window
    const windowEnforced = await enforceSevenDayWindow();

    // Clean up old alerts
    const alertsCleaned = await cleanupOldAlerts();

    // Notify admins about newly finished events with pending bets
    const eventsToNotify = await prisma.sportEvent.findMany({
      where: {
        status: "FINISHED",
        updatedAt: { gte: new Date(Date.now() - 31 * 60 * 1000) }, // Last 31 minutes
      },
      select: { eventId: true, homeTeam: true, awayTeam: true },
    });

    for (const event of eventsToNotify) {
      void (async () => {
        try {
          const [pendingCount, totalCount, stakeAgg] = await Promise.all([
            prisma.bet.count({ where: { eventId: event.eventId, status: "PENDING" } }),
            prisma.bet.count({ where: { eventId: event.eventId } }),
            prisma.bet.aggregate({ where: { eventId: event.eventId }, _sum: { stake: true } }),
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
              }),
            ]);
          }
        } catch (err) {
          console.error(`[Job3:Cleanup] Notification error for ${event.eventId}:`, err);
        }
      })();
    }

    // Update all sport category event counts
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const activeCounts = await prisma.sportEvent.groupBy({
      by: ["sportKey"],
      where: {
        isActive: true,
        oddsVerified: true,
        status: { in: ["UPCOMING", "LIVE"] },
        commenceTime: { gt: now, lte: sevenDays },
      },
      _count: { id: true },
    });

    const categories = await prisma.sportCategory.findMany({
      select: { id: true, sportKey: true },
    });

    for (const cat of categories) {
      let total = 0;
      for (const row of activeCounts) {
        if (row.sportKey) {
          const catKey = mapEventSportKeyToCategory(row.sportKey);
          if (catKey === cat.sportKey) {
            total += row._count.id;
          }
        }
      }

      await prisma.sportCategory.update({
        where: { id: cat.id },
        data: { eventCount: total },
      });
    }

    if (finished + cancelled + deactivated + windowEnforced > 0) {
      console.log(
        `[Job3:Cleanup] finished=${finished} cancelled=${cancelled} deactivated=${deactivated} windowEnforced=${windowEnforced} alertsCleaned=${alertsCleaned}`,
      );
    }
  } catch (error) {
    console.error("[Job3:Cleanup] Error:", error);
  }
}

// ═══════════════════════════════════════════════════════════
// JOB 4: SPORT CATEGORY HEALTH CHECK (runs every 1 hour)
// ═══════════════════════════════════════════════════════════

export async function jobSportHealthCheck(): Promise<void> {
  try {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const categories = await prisma.sportCategory.findMany({
      where: { isActive: true },
      select: { sportKey: true, displayName: true },
    });

    const sportsWithNoEvents: string[] = [];

    for (const cat of categories) {
      const apiKeys = SPORT_API_MAPPING[cat.sportKey] ?? [];
      if (apiKeys.length === 0) continue;

      const count = await prisma.sportEvent.count({
        where: {
          sportKey: { in: apiKeys },
          isActive: true,
          oddsVerified: true,
          status: { in: ["UPCOMING", "LIVE"] },
          commenceTime: { gt: now, lte: sevenDays },
        },
      });

      if (count === 0) {
        sportsWithNoEvents.push(cat.displayName);
        await createAlert(
          "NO_EVENTS",
          `${cat.displayName} has no events with odds for the next 7 days`,
          "warning",
          cat.sportKey,
        );
      }
    }

    // Check API status
    const apiStatus = getApiStatus();

    if (!apiStatus.isApiKeyValid) {
      await createAlert(
        "API_KEY_INVALID",
        "The Odds API key is invalid (401 error). All automated sync has been halted.",
        "critical",
      );
    }

    if (apiStatus.isOnline === false && apiStatus.isApiKeyValid) {
      await createAlert(
        "API_DOWN",
        `The Odds API is unreachable. Last error: ${apiStatus.lastError ?? "Unknown"}`,
        "critical",
        undefined,
        { lastError: apiStatus.lastError },
      );
    }

    if (apiStatus.creditsRemaining !== null) {
      const percentRemaining = (apiStatus.creditsRemaining / MONTHLY_BUDGET) * 100;

      if (apiStatus.creditsRemaining <= 0) {
        await createAlert(
          "CREDITS_EXHAUSTED",
          "API credits exhausted (0 remaining). No more API calls can be made.",
          "critical",
          undefined,
          { creditsRemaining: 0 },
        );
      } else if (percentRemaining < 20) {
        await createAlert(
          "LOW_CREDITS",
          `API credits below 20%: ${apiStatus.creditsRemaining} remaining (${percentRemaining.toFixed(1)}%)`,
          "warning",
          undefined,
          { creditsRemaining: apiStatus.creditsRemaining, percentRemaining },
        );
      }
    }

    if (sportsWithNoEvents.length > 0) {
      console.log(
        `[Job4:HealthCheck] ⚠️ Sports with no events: ${sportsWithNoEvents.join(", ")}`,
      );
    }

    console.log(
      `[Job4:HealthCheck] ✅ API: ${apiStatus.isOnline ? "online" : "OFFLINE"} | Credits: ${apiStatus.creditsRemaining ?? "?"} | Daily: ${apiStatus.dailyCallsUsed}/${apiStatus.dailyBudget}`,
    );
  } catch (error) {
    console.error("[Job4:HealthCheck] Error:", error);
  }
}

// ═══════════════════════════════════════════════════════════
// CUSTOM EVENTS SCHEDULER (preserved from original)
// ═══════════════════════════════════════════════════════════

export async function updateCustomEventStatuses() {
  const now = new Date();
  const defaultEndCutoff = new Date(now.getTime() - 150 * 60 * 1000);

  try {
    // PUBLISHED → LIVE
    const publishedToLive = await prisma.customEvent.findMany({
      where: { status: "PUBLISHED", startTime: { lte: now } },
      select: { id: true, title: true },
    });

    if (publishedToLive.length > 0) {
      await prisma.customEvent.updateMany({
        where: { id: { in: publishedToLive.map((e) => e.id) } },
        data: { status: "LIVE" },
      });

      for (const event of publishedToLive) {
        emitCustomEventLive({ eventId: event.id });
      }

      console.log(
        `[CustomEventsScheduler] PUBLISHED → LIVE: ${publishedToLive.length} events`,
      );
    }

    // LIVE → FINISHED
    const liveToFinish = await prisma.customEvent.findMany({
      where: {
        status: "LIVE",
        OR: [
          { endTime: { not: null, lte: now } },
          { endTime: null, startTime: { lte: defaultEndCutoff } },
        ],
      },
      select: { id: true, title: true },
    });

    if (liveToFinish.length > 0) {
      const eventIds = liveToFinish.map((e) => e.id);

      await prisma.$transaction([
        prisma.customMarket.updateMany({
          where: { eventId: { in: eventIds }, status: { in: ["OPEN", "SUSPENDED"] } },
          data: { status: "CLOSED" },
        }),
        prisma.customEvent.updateMany({
          where: { id: { in: eventIds } },
          data: { status: "FINISHED" },
        }),
      ]);

      for (const event of liveToFinish) {
        emitCustomEventFinished({ eventId: event.id });
      }

      // Notifications for finished custom events
      for (const event of liveToFinish) {
        void (async () => {
          try {
            const [pendingBets, totalBets, stakeAgg] = await Promise.all([
              prisma.customBet.count({ where: { eventId: event.id, status: "PENDING" } }),
              prisma.customBet.count({ where: { eventId: event.id } }),
              prisma.customBet.aggregate({ where: { eventId: event.id }, _sum: { stake: true } }),
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
                }),
              ]);
            }
          } catch (err) {
            console.error(`[CustomEventsScheduler] Notification error for ${event.id}:`, err);
          }
        })();
      }

      console.log(
        `[CustomEventsScheduler] LIVE → FINISHED: ${liveToFinish.length} events`,
      );
    }
  } catch (error) {
    console.error("[CustomEventsScheduler] Error:", error);
  }
}

// ═══════════════════════════════════════════════════════════
// AUTO-CONFIGURE (manual trigger — all 4 jobs at once)
// ═══════════════════════════════════════════════════════════

let autoConfigureRunning = false;
let lastAutoConfigureTime = 0;
const AUTO_CONFIGURE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export interface AutoConfigureStatus {
  running: boolean;
  progress: number;
  currentStep: string;
  done: boolean;
  lastRunAt: string | null;
  cooldownMs: number;
  results: {
    eventsSynced: number;
    eventsSkipped: number;
    sportsProcessed: number;
    liveTransitioned: number;
    finished: number;
    cancelled: number;
  } | null;
}

let autoConfigureStatus: AutoConfigureStatus = {
  running: false,
  progress: 0,
  currentStep: "",
  done: true,
  lastRunAt: null,
  cooldownMs: 0,
  results: null,
};

export function getAutoConfigureStatus(): AutoConfigureStatus {
  const now = Date.now();
  const remaining = Math.max(0, lastAutoConfigureTime + AUTO_CONFIGURE_COOLDOWN_MS - now);
  return { ...autoConfigureStatus, cooldownMs: remaining };
}

export async function runAutoConfigure(): Promise<{ started: boolean; reason?: string }> {
  const now = Date.now();

  if (autoConfigureRunning) {
    return { started: false, reason: "Auto-configure is already running." };
  }

  if (now - lastAutoConfigureTime < AUTO_CONFIGURE_COOLDOWN_MS) {
    const waitSec = Math.ceil((lastAutoConfigureTime + AUTO_CONFIGURE_COOLDOWN_MS - now) / 1000);
    return { started: false, reason: `Rate limited. Wait ${waitSec} seconds.` };
  }

  autoConfigureRunning = true;
  lastAutoConfigureTime = now;

  // Run in background (non-blocking)
  void (async () => {
    try {
      autoConfigureStatus = {
        running: true,
        progress: 0,
        currentStep: "Starting event sync...",
        done: false,
        lastRunAt: new Date().toISOString(),
        cooldownMs: AUTO_CONFIGURE_COOLDOWN_MS,
        results: null,
      };

      // Step 1: Event sync (60% of work)
      autoConfigureStatus.currentStep = "Syncing events from The Odds API...";
      autoConfigureStatus.progress = 10;
      await jobEventSync();
      autoConfigureStatus.progress = 60;

      // Step 2: Live monitor
      autoConfigureStatus.currentStep = "Checking live events...";
      autoConfigureStatus.progress = 70;
      await jobLiveEventMonitor();

      // Step 3: Cleanup
      autoConfigureStatus.currentStep = "Cleaning up finished events...";
      autoConfigureStatus.progress = 85;
      await jobEventCleanup();

      // Step 4: Health check
      autoConfigureStatus.currentStep = "Running health checks...";
      autoConfigureStatus.progress = 95;
      await jobSportHealthCheck();

      // Get final counts
      const now2 = new Date();
      const sevenDays = new Date(now2.getTime() + 7 * 24 * 60 * 60 * 1000);
      const [totalActive, liveCount, finishedCount] = await Promise.all([
        prisma.sportEvent.count({
          where: { isActive: true, oddsVerified: true, status: { in: ["UPCOMING", "LIVE"] }, commenceTime: { gt: now2, lte: sevenDays } },
        }),
        prisma.sportEvent.count({ where: { status: "LIVE" } }),
        prisma.sportEvent.count({ where: { status: "FINISHED", updatedAt: { gte: new Date(now2.getTime() - 30 * 60 * 1000) } } }),
      ]);

      autoConfigureStatus = {
        running: false,
        progress: 100,
        currentStep: "Complete",
        done: true,
        lastRunAt: new Date().toISOString(),
        cooldownMs: AUTO_CONFIGURE_COOLDOWN_MS,
        results: {
          eventsSynced: totalActive,
          eventsSkipped: 0,
          sportsProcessed: 0,
          liveTransitioned: liveCount,
          finished: finishedCount,
          cancelled: 0,
        },
      };

      console.log("[AutoConfigure] ✅ All jobs completed successfully.");
    } catch (error) {
      console.error("[AutoConfigure] ❌ Error:", error);
      autoConfigureStatus = {
        ...autoConfigureStatus,
        running: false,
        done: true,
        currentStep: `Error: ${String(error).slice(0, 100)}`,
      };
    } finally {
      autoConfigureRunning = false;
    }
  })();

  return { started: true };
}

// ═══════════════════════════════════════════════════════════
// SYSTEM STATUS
// ═══════════════════════════════════════════════════════════

const MONTHLY_BUDGET = 2000;

export async function getSystemStatus() {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const apiStatus = getApiStatus();

  const [
    totalEventsIn7Days,
    eventsWithoutOdds,
    liveCount,
    categories,
  ] = await Promise.all([
    prisma.sportEvent.count({
      where: {
        isActive: true,
        oddsVerified: true,
        status: { in: ["UPCOMING", "LIVE"] },
        commenceTime: { gt: now, lte: sevenDays },
      },
    }),
    prisma.sportEvent.count({
      where: {
        isActive: true,
        oddsVerified: false,
      },
    }),
    prisma.sportEvent.count({ where: { status: "LIVE" } }),
    prisma.sportCategory.findMany({
      where: { isActive: true },
      select: { sportKey: true, displayName: true, eventCount: true },
    }),
  ]);

  const sportsWithNoEvents = categories.filter((c) => c.eventCount === 0);
  const creditsPercent = apiStatus.creditsRemaining !== null
    ? Math.round((apiStatus.creditsRemaining / MONTHLY_BUDGET) * 100)
    : null;

  // Determine last sync time
  const lastSyncLog = await prisma.apiSyncLog.findFirst({
    where: { jobName: "event_sync", status: { in: ["success", "partial"] } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const lastSyncTime = lastSyncLog?.createdAt ?? apiStatus.lastSuccessfulSync;

  // Calculate next sync time (every 6 hours from last sync)
  let nextSyncTime: string | null = null;
  if (lastSyncTime) {
    const last = new Date(lastSyncTime);
    const next = new Date(last.getTime() + 6 * 60 * 60 * 1000);
    nextSyncTime = next.toISOString();
  }

  // Determine overall health
  let health: "healthy" | "warning" | "critical" = "healthy";
  if (!apiStatus.isOnline || !apiStatus.isApiKeyValid) {
    health = "critical";
  } else if (
    (creditsPercent !== null && creditsPercent < 20) ||
    sportsWithNoEvents.length > 3
  ) {
    health = "warning";
  }

  return {
    health,
    api: {
      isOnline: apiStatus.isOnline,
      isApiKeyValid: apiStatus.isApiKeyValid,
      creditsRemaining: apiStatus.creditsRemaining,
      creditsPercent,
      monthlyBudget: MONTHLY_BUDGET,
      dailyCallsUsed: apiStatus.dailyCallsUsed,
      dailyBudget: apiStatus.dailyBudget,
      lastError: apiStatus.lastError,
      isRateLimited: apiStatus.isRateLimited,
    },
    sync: {
      lastSyncTime: lastSyncTime ? new Date(lastSyncTime).toISOString() : null,
      nextSyncTime,
    },
    events: {
      totalIn7Days: totalEventsIn7Days,
      eventsWithoutOdds,
      liveCount,
    },
    sports: {
      totalActive: categories.length,
      withNoEvents: sportsWithNoEvents.map((s) => s.displayName),
      withNoEventsCount: sportsWithNoEvents.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════
// INITIALIZATION & CRON SCHEDULE
// ═══════════════════════════════════════════════════════════

// Run all on startup (except event sync — save API calls)
void Promise.all([
  jobEventCleanup().catch((e: unknown) => console.error("[Scheduler] Cleanup init error:", e)),
  jobSportHealthCheck().catch((e: unknown) => console.error("[Scheduler] Health init error:", e)),
  updateCustomEventStatuses().catch((e: unknown) => console.error("[Scheduler] Custom events init error:", e)),
  // Fixtures service (kept alongside for supplementary data)
  fetchAndSaveFixtures().catch((e: unknown) => console.error("[Fixtures] Init error:", e)),
]);

// ── Cron Schedule ──

// Job 1: Event Sync — every 6 hours (to stay within 2000 calls/month)
cron.schedule("0 */6 * * *", () => {
  void jobEventSync().catch((e: unknown) => console.error("[Job1:EventSync] Cron error:", e));
});

// Job 2: Live Event Monitor — every 5 minutes
cron.schedule("*/5 * * * *", () => {
  void jobLiveEventMonitor().catch((e: unknown) => console.error("[Job2:LiveMonitor] Cron error:", e));
});

// Job 3: Event Cleanup — every 30 minutes
cron.schedule("*/30 * * * *", () => {
  void jobEventCleanup().catch((e: unknown) => console.error("[Job3:Cleanup] Cron error:", e));
});

// Job 4: Sport Category Health Check — every 1 hour
cron.schedule("0 * * * *", () => {
  void jobSportHealthCheck().catch((e: unknown) => console.error("[Job4:HealthCheck] Cron error:", e));
});

// Custom events: every 1 minute
cron.schedule("*/1 * * * *", () => {
  void updateCustomEventStatuses().catch((e: unknown) => console.error("[CustomEvents] Cron error:", e));
});

// Fixtures service: every 15 minutes (kept as supplementary)
cron.schedule("*/15 * * * *", () => {
  void fetchAndSaveFixtures().catch((e: unknown) => console.error("[Fixtures] Cron error:", e));
});

console.log(
  "[Scheduler] ✅ Running — eventSync:6h liveMonitor:5min cleanup:30min healthCheck:1h customEvents:1min fixtures:15min",
);
