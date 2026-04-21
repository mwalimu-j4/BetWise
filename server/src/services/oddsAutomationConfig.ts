// ============================================================
// QUOTA-SAFE SPORTS CONFIG — 500 requests/month plan
// ============================================================
// BUDGET MATH (500 req/month free tier):
//   - Safe daily budget  : 500 / 30 = ~16 calls/day
//   - /sports endpoint   : FREE (never counts)
//   - Each /odds call    : 1 credit per region per market
//   - Strategy: fetch once per sport per day, cache in DB/file
// ============================================================

export const SEVEN_DAY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// ── Sync intervals (FIXED: was 15min → burns 500 in 6hrs) ──
export const EVENT_SYNC_INTERVAL_MINUTES = 360; // Every 6 hours (was 15 — 24x less calls)
export const LIVE_MONITOR_INTERVAL_MINUTES = 30; // Every 30 min (was 1 — 30x less calls)
export const CLEANUP_INTERVAL_MINUTES = 60;
export const HEALTH_CHECK_INTERVAL_MINUTES = 360; // Use /sports endpoint (free)

export const AUTO_CONFIGURE_COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown

// ── Budget (FIXED: was 100,000 — your plan is 500) ──
export const MONTHLY_API_BUDGET = 400; // 500 total, keep 100 as safety buffer
export const DAILY_API_BUDGET = Math.floor(MONTHLY_API_BUDGET / 30); // ~13/day

// ── Quota guard: check before every API call ──
export function isQuotaSafe(usedThisMonth: number): boolean {
  return usedThisMonth < MONTHLY_API_BUDGET;
}

export function isDailyQuotaSafe(usedToday: number): boolean {
  return usedToday < DAILY_API_BUDGET;
}

// ────────────────────────────────────────────────────────────

export type ManagedSportCategoryKey =
  | "soccer"
  | "basketball"
  | "tennis"
  | "cricket"
  | "icehockey"
  | "rugbyunion"
  | "americanfootball"
  | "boxing_mma"
  | "baseball"
  | "golf";

// Removed: volleyball, tabletennis, snooker, darts
// (not available on The Odds API free tier — were burning credits with 404s)

export type SportAutomationConfig = {
  key: ManagedSportCategoryKey;
  displayName: string;
  apiSportKeys: string[]; // These exist on the API ✓
  leagueImportance: number;
  cacheTTLMinutes: number; // NEW: how long to cache odds data
  fetchPriority: "high" | "medium" | "low"; // NEW: skip low priority when quota is tight
};

export const SPORT_AUTOMATION_CONFIG: SportAutomationConfig[] = [
  {
    key: "soccer",
    displayName: "Football",
    apiSportKeys: [
      "soccer_epl",
      "soccer_spain_la_liga",
      "soccer_italy_serie_a",
      "soccer_germany_bundesliga",
      "soccer_uefa_champs_league",
    ],
    leagueImportance: 10,
    cacheTTLMinutes: 360, // Cache 6 hours
    fetchPriority: "high",
  },
  {
    key: "basketball",
    displayName: "Basketball",
    apiSportKeys: ["basketball_nba", "basketball_euroleague"],
    leagueImportance: 9,
    cacheTTLMinutes: 360,
    fetchPriority: "high",
  },
  {
    key: "tennis",
    displayName: "Tennis",
    // FIXED: tennis_atp_french_open & tennis_wta_french_open are seasonal
    // Only fetch when the active key appears in /sports response
    apiSportKeys: [
      "tennis_atp_madrid_open", // Currently active ✓
      "tennis_wta_madrid_open", // Currently active ✓
    ],
    leagueImportance: 8,
    cacheTTLMinutes: 720, // Tennis odds don't change as fast
    fetchPriority: "medium",
  },
  {
    key: "cricket",
    displayName: "Cricket",
    apiSportKeys: [
      "cricket_ipl", // Currently active ✓
      "cricket_odi", // Currently active ✓
      // REMOVED: cricket_icc_world_cup — not in current /sports response
    ],
    leagueImportance: 7,
    cacheTTLMinutes: 720,
    fetchPriority: "medium",
  },
  {
    key: "icehockey",
    displayName: "Ice Hockey",
    apiSportKeys: ["icehockey_nhl"],
    leagueImportance: 8,
    cacheTTLMinutes: 360,
    fetchPriority: "high",
  },
  {
    key: "rugbyunion",
    displayName: "Rugby",
    apiSportKeys: [
      "rugbyleague_nrl", // Currently active ✓
      // REMOVED: rugbyunion_epc_champions_cup — not in current /sports response
    ],
    leagueImportance: 7,
    cacheTTLMinutes: 720,
    fetchPriority: "low",
  },
  {
    key: "americanfootball",
    displayName: "American Football",
    apiSportKeys: ["americanfootball_nfl"],
    leagueImportance: 9,
    cacheTTLMinutes: 360,
    fetchPriority: "high",
  },
  {
    key: "boxing_mma",
    displayName: "Boxing/MMA",
    apiSportKeys: ["mma_mixed_martial_arts", "boxing_boxing"],
    leagueImportance: 7,
    cacheTTLMinutes: 1440, // Fight odds stable for days
    fetchPriority: "low",
  },
  {
    key: "baseball",
    displayName: "Baseball",
    apiSportKeys: ["baseball_mlb"],
    leagueImportance: 8,
    cacheTTLMinutes: 360,
    fetchPriority: "medium",
  },
  {
    key: "golf",
    displayName: "Golf",
    // FIXED: golf_masters_tournament_winner is seasonal (April only)
    // Use currently active keys
    apiSportKeys: [
      "golf_pga_championship_winner", // Currently active ✓
    ],
    leagueImportance: 6,
    cacheTTLMinutes: 1440, // Outright winner odds — very stable
    fetchPriority: "low",
  },
];

// ── How many API calls this config will make ──
// High priority sports  : 5 soccer + 2 bball + 1 hockey + 1 nfl = 9 keys
// Medium priority sports: 2 tennis + 2 cricket + 1 baseball = 5 keys
// Low priority sports   : 1 rugby + 2 boxing + 1 golf = 4 keys
// Total: 18 sport keys
//
// At 4 syncs/day (every 6hrs) × 18 sports = 72 calls/day
// Monthly: 72 × 30 = 2,160 — still over 500!
//
// SOLUTION: Only fetch HIGH priority by default.
// Medium/low only fetch if daily budget allows.
// 9 high-priority × 4 syncs/day = 36 calls/day → 1,080/month ← still over
//
// REAL SOLUTION: Fetch each sport ONCE per day maximum.
// 18 sports × 1 fetch/day = 18 calls/day → 540/month ← just fits!
// Use cache for everything else during the day.

export const MAX_FETCHES_PER_SPORT_PER_DAY = 1;

// ────────────────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────────────────

const CATEGORY_MAP = new Map(
  SPORT_AUTOMATION_CONFIG.map((item) => [item.key, item]),
);

export function getAutomationConfigByCategoryKey(key: string) {
  return CATEGORY_MAP.get(key as ManagedSportCategoryKey) ?? null;
}

export function mapApiSportKeyToCategoryKey(
  apiSportKey: string,
): ManagedSportCategoryKey | null {
  const n = apiSportKey.toLowerCase();
  if (n.startsWith("soccer")) return "soccer";
  if (n.startsWith("basketball")) return "basketball";
  if (n.startsWith("tennis")) return "tennis";
  if (n.startsWith("cricket")) return "cricket";
  if (n.startsWith("icehockey")) return "icehockey";
  if (n.startsWith("rugby")) return "rugbyunion";
  if (n.startsWith("americanfootball")) return "americanfootball";
  if (n.startsWith("mma") || n.startsWith("boxing")) return "boxing_mma";
  if (n.startsWith("baseball")) return "baseball";
  if (n.startsWith("golf")) return "golf";
  return null;
}

export function getOddsApiKey(): string {
  return (
    process.env.THE_ODDS_API_KEY?.trim() ??
    process.env.ODDS_API_KEY?.trim() ??
    ""
  );
}

// ── Get only the sports to fetch given today's remaining budget ──
export function getSportsToFetch(
  dailyCallsUsed: number,
  monthlyCallsUsed: number,
): SportAutomationConfig[] {
  if (!isQuotaSafe(monthlyCallsUsed) || !isDailyQuotaSafe(dailyCallsUsed)) {
    console.warn("[OddsAPI] Quota limit reached — skipping all fetches");
    return [];
  }

  const remaining = DAILY_API_BUDGET - dailyCallsUsed;

  // Always try high priority; add medium/low only if budget allows
  const high = SPORT_AUTOMATION_CONFIG.filter(
    (s) => s.fetchPriority === "high",
  );
  const medium = SPORT_AUTOMATION_CONFIG.filter(
    (s) => s.fetchPriority === "medium",
  );
  const low = SPORT_AUTOMATION_CONFIG.filter((s) => s.fetchPriority === "low");

  const result: SportAutomationConfig[] = [];

  for (const sport of high) {
    if (result.length < remaining) result.push(sport);
  }
  for (const sport of medium) {
    if (result.length < remaining) result.push(sport);
  }
  for (const sport of low) {
    if (result.length < remaining) result.push(sport);
  }

  return result;
}
