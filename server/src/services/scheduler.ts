import cron from "node-cron";
import { prisma } from "../lib/prisma";
import {
  fetchSportOdds,
  fetchSportScores,
  getApiStatus,
  isCreditsCritical,
  logApiSync,
  setLastSuccessfulSync,
} from "./oddsApiService";
import {
  archiveFinishedEvents,
  deactivateEventsWithoutOdds,
  enforceSevenDayWindow,
  processAndSaveEvents,
  refreshCategorySummaries,
  transitionToLive,
  updateLiveOdds,
  updateLiveScores,
} from "./eventProcessingService";
import {
  AUTO_CONFIGURE_COOLDOWN_MS,
  CLEANUP_INTERVAL_MINUTES,
  EVENT_SYNC_INTERVAL_MINUTES,
  HEALTH_CHECK_INTERVAL_MINUTES,
  LIVE_MONITOR_INTERVAL_MINUTES,
  SEVEN_DAY_WINDOW_MS,
  SPORT_AUTOMATION_CONFIG,
  type ManagedSportCategoryKey,
} from "./oddsAutomationConfig";
import { cleanupOldAlerts, createAlert } from "./adminAlertService";
import { fetchAndSaveFixtures } from "./fixturesService";
import { emitCustomEventFinished, emitCustomEventLive } from "../lib/socket";
import {
  createEventEndedAdminNotification,
  createMatchEndedUserNotifications,
} from "../controllers/notifications.controller";

type JobName = "event_sync" | "live_monitor" | "event_cleanup" | "health_check";
type JobResult = {
  success: boolean;
  message: string;
  meta?: Record<string, number | string | null>;
};

type AutoConfigureStatus = {
  running: boolean;
  progress: number;
  currentStep: string;
  done: boolean;
  lastRunAt: string | null;
  cooldownMs: number;
  results: Record<string, number | string> | null;
};

const runningJobs = new Set<JobName>();
const lastJobRunAt: Partial<Record<JobName, Date>> = {};
let lastAutoConfigureAt = 0;

let autoConfigureStatus: AutoConfigureStatus = {
  running: false,
  progress: 0,
  currentStep: "",
  done: true,
  lastRunAt: null,
  cooldownMs: 0,
  results: null,
};

async function withJobLock<T>(jobName: JobName, task: () => Promise<T>): Promise<T | null> {
  if (runningJobs.has(jobName)) {
    return null;
  }

  runningJobs.add(jobName);
  try {
    const result = await task();
    lastJobRunAt[jobName] = new Date();
    return result;
  } finally {
    runningJobs.delete(jobName);
  }
}

function getManagedDateRange() {
  const now = new Date();
  const dateTo = new Date(now.getTime() + SEVEN_DAY_WINDOW_MS);
  return { now, dateTo, dateFromIso: now.toISOString(), dateToIso: dateTo.toISOString() };
}

function nextRunTime(jobName: JobName) {
  const lastRun = lastJobRunAt[jobName];
  if (!lastRun) return null;

  const intervalMinutes =
    jobName === "event_sync"
      ? EVENT_SYNC_INTERVAL_MINUTES
      : jobName === "live_monitor"
        ? LIVE_MONITOR_INTERVAL_MINUTES
        : jobName === "event_cleanup"
          ? CLEANUP_INTERVAL_MINUTES
          : HEALTH_CHECK_INTERVAL_MINUTES;

  return new Date(lastRun.getTime() + intervalMinutes * 60 * 1000).toISOString();
}

function getSportsToSync(selectedSportKeys?: ManagedSportCategoryKey[]) {
  const allowed = new Set(selectedSportKeys ?? SPORT_AUTOMATION_CONFIG.map((item) => item.key));
  return SPORT_AUTOMATION_CONFIG.filter((item) => allowed.has(item.key));
}

export async function jobEventSync(selectedSportKeys?: ManagedSportCategoryKey[]): Promise<JobResult> {
  return (
    (await withJobLock("event_sync", async () => {
      const startedAt = Date.now();
      const { dateFromIso, dateToIso } = getManagedDateRange();
      let sportsProcessed = 0;
      let sportsFailed = 0;
      let eventsSaved = 0;
      let eventsSkipped = 0;

      for (const sport of getSportsToSync(selectedSportKeys)) {
        for (const apiSportKey of sport.apiSportKeys) {
          const events = await fetchSportOdds(apiSportKey, {
            dateFrom: dateFromIso,
            dateTo: dateToIso,
          });

          if (events === null) {
            sportsFailed += 1;
            continue;
          }

          const result = await processAndSaveEvents(events, sport.key);
          eventsSaved += result.saved;
          eventsSkipped += result.skipped;
          sportsProcessed += 1;
        }
      }

      await Promise.all([deactivateEventsWithoutOdds(), enforceSevenDayWindow(), refreshCategorySummaries()]);
      setLastSuccessfulSync();

      const durationMs = Date.now() - startedAt;
      await logApiSync({
        jobName: "event_sync",
        status: sportsFailed > 0 ? "partial" : "success",
        sportsProcessed,
        eventsLoaded: eventsSaved,
        errorMessage: sportsFailed > 0 ? `${sportsFailed} sport fetches failed` : undefined,
        durationMs,
      });

      if (isCreditsCritical()) {
        const apiStatus = getApiStatus();
        await createAlert(
          "LOW_CREDITS",
          `API credits are below 10% remaining. ${apiStatus.creditsRemaining ?? "Unknown"} credits left.`,
          "warning",
        );
      }

      await createAlert(
        "SYNC_SUCCESS",
        `Auto-sync completed successfully. Loaded ${eventsSaved} events and skipped ${eventsSkipped} without usable odds.`,
        "info",
      );

      return {
        success: true,
        message: "Event sync completed.",
        meta: { sportsProcessed, sportsFailed, eventsSaved, eventsSkipped, durationMs },
      };
    })) ?? { success: false, message: "Event sync already running." }
  );
}

export async function jobLiveEventMonitor(): Promise<JobResult> {
  return (
    (await withJobLock("live_monitor", async () => {
      const transitioned = await transitionToLive();
      let oddsUpdated = 0;
      let scoresUpdated = 0;

      const liveSports = await prisma.sportEvent.findMany({
        where: { status: "LIVE", isActive: true, oddsVerified: true },
        select: { sportKey: true },
        distinct: ["sportKey"],
      });

      for (const row of liveSports) {
        if (!row.sportKey) continue;
        const [odds, scores] = await Promise.all([
          fetchSportOdds(row.sportKey, { dateFrom: new Date(Date.now() - 60 * 60 * 1000).toISOString() }),
          fetchSportScores(row.sportKey),
        ]);

        if (odds) {
          oddsUpdated += await updateLiveOdds(odds.filter((event) => new Date(event.commence_time) <= new Date()));
        }

        if (scores) {
          scoresUpdated += await updateLiveScores(scores);
        }
      }

      return {
        success: true,
        message: "Live monitor completed.",
        meta: { transitioned, oddsUpdated, scoresUpdated },
      };
    })) ?? { success: false, message: "Live monitor already running." }
  );
}

export async function jobEventCleanup(): Promise<JobResult> {
  return (
    (await withJobLock("event_cleanup", async () => {
      const [archived, deactivated, windowFixed, alertsCleaned] = await Promise.all([
        archiveFinishedEvents(),
        deactivateEventsWithoutOdds(),
        enforceSevenDayWindow(),
        cleanupOldAlerts(),
      ]);

      await refreshCategorySummaries();

      return {
        success: true,
        message: "Cleanup completed.",
        meta: {
          finished: archived.finished,
          cancelled: archived.cancelled,
          deactivated,
          windowFixed,
          alertsCleaned,
        },
      };
    })) ?? { success: false, message: "Cleanup already running." }
  );
}

export async function jobSportHealthCheck(): Promise<JobResult> {
  return (
    (await withJobLock("health_check", async () => {
      const { now, dateTo } = getManagedDateRange();
      const missingSports: string[] = [];

      for (const sport of SPORT_AUTOMATION_CONFIG) {
        const count = await prisma.sportEvent.count({
          where: {
            sportKey: { in: sport.apiSportKeys },
            isActive: true,
            oddsVerified: true,
            status: { in: ["UPCOMING", "LIVE"] },
            commenceTime: { gt: now, lte: dateTo },
          },
        });

        if (count === 0) {
          missingSports.push(sport.displayName);
          await createAlert(
            "NO_EVENTS",
            `${sport.displayName} has zero active events with odds in the next 7 days.`,
            "warning",
            sport.key,
          );
        }
      }

      const apiStatus = getApiStatus();
      if (!apiStatus.isApiKeyValid) {
        await createAlert(
          "API_KEY_INVALID",
          "The Odds API returned 401. Automated jobs were halted to protect quota.",
          "critical",
        );
      } else if (!apiStatus.isOnline) {
        await createAlert(
          "API_DOWN",
          `The Odds API is unreachable. ${apiStatus.lastError ?? "No error details available."}`,
          "critical",
        );
      }

      if ((apiStatus.creditsPercent ?? 100) <= 0) {
        await createAlert("CREDITS_EXHAUSTED", "The Odds API quota is exhausted.", "critical");
      } else if ((apiStatus.creditsPercent ?? 100) < 20) {
        await createAlert(
          "LOW_CREDITS",
          `The Odds API credits are below 20%. ${apiStatus.creditsRemaining ?? "Unknown"} remaining.`,
          "warning",
        );
      }

      return {
        success: true,
        message: "Health check completed.",
        meta: {
          missingSports: missingSports.length,
          creditsRemaining: apiStatus.creditsRemaining ?? 0,
          creditsPercent: apiStatus.creditsPercent ?? 0,
        },
      };
    })) ?? { success: false, message: "Health check already running." }
  );
}

export function getAutoConfigureStatus() {
  const remaining = Math.max(0, lastAutoConfigureAt + AUTO_CONFIGURE_COOLDOWN_MS - Date.now());
  return { ...autoConfigureStatus, cooldownMs: remaining };
}

export async function runAutoConfigure(selectedSportKeys?: ManagedSportCategoryKey[]) {
  if (autoConfigureStatus.running) {
    return { started: false, reason: "Auto-configure is already running." };
  }

  if (Date.now() - lastAutoConfigureAt < AUTO_CONFIGURE_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((lastAutoConfigureAt + AUTO_CONFIGURE_COOLDOWN_MS - Date.now()) / 1000);
    return { started: false, reason: `Rate limited. Try again in ${waitSeconds} seconds.` };
  }

  lastAutoConfigureAt = Date.now();
  autoConfigureStatus = {
    running: true,
    progress: 0,
    currentStep: "Preparing automation jobs...",
    done: false,
    lastRunAt: new Date().toISOString(),
    cooldownMs: AUTO_CONFIGURE_COOLDOWN_MS,
    results: null,
  };

  void (async () => {
    try {
      autoConfigureStatus.progress = 10;
      autoConfigureStatus.currentStep = "Syncing events for the next 7 days...";
      const sync = await jobEventSync(selectedSportKeys);

      autoConfigureStatus.progress = 55;
      autoConfigureStatus.currentStep = "Monitoring live events and refreshing live odds...";
      const live = await jobLiveEventMonitor();

      autoConfigureStatus.progress = 75;
      autoConfigureStatus.currentStep = "Archiving finished events and enforcing visibility rules...";
      const cleanup = await jobEventCleanup();

      autoConfigureStatus.progress = 90;
      autoConfigureStatus.currentStep = "Checking category and API health...";
      const health = await jobSportHealthCheck();

      autoConfigureStatus = {
        running: false,
        progress: 100,
        currentStep: "Complete",
        done: true,
        lastRunAt: new Date().toISOString(),
        cooldownMs: AUTO_CONFIGURE_COOLDOWN_MS,
        results: {
          eventsSynced: Number(sync.meta?.eventsSaved ?? 0),
          eventsSkipped: Number(sync.meta?.eventsSkipped ?? 0),
          sportsProcessed: Number(sync.meta?.sportsProcessed ?? 0),
          liveOddsUpdated: Number(live.meta?.oddsUpdated ?? 0),
          liveScoresUpdated: Number(live.meta?.scoresUpdated ?? 0),
          finishedArchived: Number(cleanup.meta?.finished ?? 0),
          cancelledArchived: Number(cleanup.meta?.cancelled ?? 0),
          missingSports: Number(health.meta?.missingSports ?? 0),
        },
      };
    } catch (error) {
      autoConfigureStatus = {
        ...autoConfigureStatus,
        running: false,
        done: true,
        currentStep: `Failed: ${String(error).slice(0, 100)}`,
      };
      await createAlert("SYNC_FAILED", `Auto-configure failed: ${String(error).slice(0, 200)}`, "critical");
    }
  })();

  return { started: true };
}

export async function getSystemStatus() {
  const { now, dateTo } = getManagedDateRange();
  const api = getApiStatus();

  const [totalInWindow, eventsWithoutOdds, emptySports, lastSyncLog] = await Promise.all([
    prisma.sportEvent.count({
      where: {
        isActive: true,
        oddsVerified: true,
        status: { in: ["UPCOMING", "LIVE"] },
        commenceTime: { gt: now, lte: dateTo },
      },
    }),
    prisma.sportEvent.count({
      where: {
        isActive: true,
        OR: [{ oddsVerified: false }, { displayedOdds: { none: {} } }],
      },
    }),
    Promise.all(
      SPORT_AUTOMATION_CONFIG.map(async (sport) => {
        const count = await prisma.sportEvent.count({
          where: {
            sportKey: { in: sport.apiSportKeys },
            isActive: true,
            oddsVerified: true,
            status: { in: ["UPCOMING", "LIVE"] },
            commenceTime: { gt: now, lte: dateTo },
          },
        });
        return count === 0 ? sport.displayName : null;
      }),
    ),
    prisma.apiSyncLog.findFirst({
      where: { jobName: "event_sync", status: { in: ["success", "partial"] } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const withNoEvents = emptySports.filter((item): item is string => Boolean(item));
  const health =
    !api.isOnline || !api.isApiKeyValid || (api.creditsPercent ?? 100) <= 0
      ? "critical"
      : (api.creditsPercent ?? 100) < 20 || withNoEvents.length > 0
        ? "warning"
        : "healthy";

  return {
    health,
    api: {
      isOnline: api.isOnline,
      isApiKeyValid: api.isApiKeyValid,
      creditsRemaining: api.creditsRemaining,
      creditsPercent: api.creditsPercent,
      monthlyBudget: api.monthlyBudget,
      dailyCallsUsed: null,
      dailyBudget: null,
      lastError: api.lastError,
      isRateLimited: api.isRateLimited,
    },
    sync: {
      lastSyncTime: lastSyncLog?.createdAt?.toISOString() ?? api.lastSuccessfulSync ?? null,
      nextSyncTime: nextRunTime("event_sync"),
    },
    events: {
      totalIn7Days: totalInWindow,
      eventsWithoutOdds,
      liveCount: await prisma.sportEvent.count({ where: { status: "LIVE", isActive: true } }),
    },
    sports: {
      totalActive: SPORT_AUTOMATION_CONFIG.length,
      withNoEvents,
      withNoEventsCount: withNoEvents.length,
    },
  };
}

export async function updateCustomEventStatuses() {
  const now = new Date();
  const defaultEndCutoff = new Date(now.getTime() - 150 * 60 * 1000);

  try {
    const publishedToLive = await prisma.customEvent.findMany({
      where: { status: "PUBLISHED", startTime: { lte: now } },
      select: { id: true, title: true },
    });

    if (publishedToLive.length > 0) {
      await prisma.customEvent.updateMany({
        where: { id: { in: publishedToLive.map((event) => event.id) } },
        data: { status: "LIVE" },
      });

      for (const event of publishedToLive) {
        emitCustomEventLive({ eventId: event.id });
      }
    }

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

    if (!liveToFinish.length) return;

    const ids = liveToFinish.map((event) => event.id);
    await prisma.$transaction([
      prisma.customMarket.updateMany({
        where: { eventId: { in: ids }, status: { in: ["OPEN", "SUSPENDED"] } },
        data: { status: "CLOSED" },
      }),
      prisma.customEvent.updateMany({
        where: { id: { in: ids } },
        data: { status: "FINISHED" },
      }),
    ]);

    for (const event of liveToFinish) {
      emitCustomEventFinished({ eventId: event.id });
      void (async () => {
        const [pendingBets, totalBets, totalStake] = await Promise.all([
          prisma.customBet.count({ where: { eventId: event.id, status: "PENDING" } }),
          prisma.customBet.count({ where: { eventId: event.id } }),
          prisma.customBet.aggregate({ where: { eventId: event.id }, _sum: { stake: true } }),
        ]);

        if (!totalBets) return;

        await Promise.all([
          createEventEndedAdminNotification({
            eventName: event.title,
            eventType: "custom",
            pendingBetsCount: pendingBets,
            totalBetsCount: totalBets,
            totalStaked: totalStake._sum.stake ?? 0,
            eventId: event.id,
          }),
          createMatchEndedUserNotifications({
            eventId: event.id,
            eventName: event.title,
          }),
        ]);
      })();
    }
  } catch (error) {
    console.error("[Scheduler] Custom event status update failed:", error);
  }
}

void Promise.all([
  fetchAndSaveFixtures().catch((error) => console.error("[Fixtures] Initial fetch failed:", error)),
  jobEventCleanup().catch((error) => console.error("[Cleanup] Initial run failed:", error)),
  jobSportHealthCheck().catch((error) => console.error("[Health] Initial run failed:", error)),
  updateCustomEventStatuses().catch((error) => console.error("[CustomEvents] Initial run failed:", error)),
]);

cron.schedule("*/15 * * * *", () => {
  void jobEventSync().catch((error) => console.error("[Scheduler] event_sync failed:", error));
});

cron.schedule("* * * * *", () => {
  void jobLiveEventMonitor().catch((error) => console.error("[Scheduler] live_monitor failed:", error));
});

cron.schedule("*/30 * * * *", () => {
  void jobEventCleanup().catch((error) => console.error("[Scheduler] cleanup failed:", error));
});

cron.schedule("0 * * * *", () => {
  void jobSportHealthCheck().catch((error) => console.error("[Scheduler] health_check failed:", error));
});

cron.schedule("*/15 * * * *", () => {
  void fetchAndSaveFixtures().catch((error) => console.error("[Scheduler] fixtures failed:", error));
});

cron.schedule("* * * * *", () => {
  void updateCustomEventStatuses().catch((error) => console.error("[Scheduler] custom_events failed:", error));
});
