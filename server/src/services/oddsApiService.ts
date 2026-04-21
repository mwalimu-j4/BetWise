/**
 * ── OddsApiService ──
 * Centralized, credit-aware service for all The Odds API interactions.
 * Designed for Starter plan: 2000 API calls/month, 5 leagues.
 *
 * Budget strategy (2000 calls/month ÷ 30 days = ~66/day):
 *  • Event sync every 6 hours: 4 cycles × 5 leagues = 20 calls/day
 *  • Live scores every 30 min (only when live events exist): ~10/day
 *  • Manual auto-configure reserve: 5/day
 *  • Safety margin: ~30 calls/day headroom
 */

import { prisma } from "../lib/prisma";

// ── Types ──

export interface OddsApiEvent {
  id: string;
  sport_title: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers?: OddsApiBookmaker[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  markets?: OddsApiMarket[];
}

export interface OddsApiMarket {
  key: string;
  outcomes?: OddsApiOutcome[];
}

export interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsApiScoreEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Array<{ name: string; score: string }> | null;
  last_update: string | null;
}

export interface OddsApiSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

// ── Credit tracker (in-memory, persisted to ApiSyncLog) ──

interface CreditTracker {
  remaining: number | null;
  used: number | null;
  lastChecked: Date | null;
  dailyCallsToday: number;
  dailyResetDate: string; // YYYY-MM-DD
  monthlyCallsUsed: number;
  monthlyResetDate: string; // YYYY-MM
  isApiDown: boolean;
  isApiKeyInvalid: boolean;
  lastError: string | null;
  lastSuccessfulSync: Date | null;
}

// Monthly budget constants
const MONTHLY_BUDGET = 2000;
const DAILY_BUDGET = Math.floor(MONTHLY_BUDGET / 30); // ~66
const SAFETY_RESERVE_PERCENT = 0.15; // Keep 15% reserve
const DAILY_SAFE_LIMIT = Math.floor(DAILY_BUDGET * (1 - SAFETY_RESERVE_PERCENT)); // ~56
const CRITICAL_CREDITS_THRESHOLD = Math.floor(MONTHLY_BUDGET * 0.10); // 10% = 200

// Exponential backoff state
let backoffUntil: number = 0;
let consecutiveFailures = 0;
const MAX_BACKOFF_MS = 30 * 60 * 1000; // 30 minutes max

export const creditTracker: CreditTracker = {
  remaining: null,
  used: null,
  lastChecked: null,
  dailyCallsToday: 0,
  dailyResetDate: new Date().toISOString().split("T")[0],
  monthlyCallsUsed: 0,
  monthlyResetDate: new Date().toISOString().slice(0, 7),
  isApiDown: false,
  isApiKeyInvalid: false,
  lastError: null,
  lastSuccessfulSync: null,
};

// ── Helpers ──

function getOddsApiKey(): string {
  return process.env.ODDS_API_KEY?.trim() ?? "";
}

function resetDailyCounterIfNeeded(): void {
  const today = new Date().toISOString().split("T")[0];
  if (creditTracker.dailyResetDate !== today) {
    creditTracker.dailyCallsToday = 0;
    creditTracker.dailyResetDate = today;
  }
}

function resetMonthlyCounterIfNeeded(): void {
  const thisMonth = new Date().toISOString().slice(0, 7);
  if (creditTracker.monthlyResetDate !== thisMonth) {
    creditTracker.monthlyCallsUsed = 0;
    creditTracker.monthlyResetDate = thisMonth;
  }
}

function canMakeApiCall(): { allowed: boolean; reason?: string } {
  if (creditTracker.isApiKeyInvalid) {
    return { allowed: false, reason: "API key is invalid (401). All calls halted." };
  }

  if (Date.now() < backoffUntil) {
    const waitSec = Math.ceil((backoffUntil - Date.now()) / 1000);
    return { allowed: false, reason: `Rate-limited. Retry in ${waitSec}s.` };
  }

  resetDailyCounterIfNeeded();
  resetMonthlyCounterIfNeeded();

  if (creditTracker.dailyCallsToday >= DAILY_SAFE_LIMIT) {
    return { allowed: false, reason: `Daily API budget exhausted (${creditTracker.dailyCallsToday}/${DAILY_SAFE_LIMIT}).` };
  }

  if (creditTracker.remaining !== null && creditTracker.remaining <= 0) {
    return { allowed: false, reason: "API credits exhausted (0 remaining)." };
  }

  if (creditTracker.monthlyCallsUsed >= MONTHLY_BUDGET) {
    return { allowed: false, reason: `Monthly budget exhausted (${creditTracker.monthlyCallsUsed}/${MONTHLY_BUDGET}).` };
  }

  return { allowed: true };
}

function parseCreditsFromHeaders(headers: Headers): void {
  const remaining = headers.get("x-requests-remaining");
  const used = headers.get("x-requests-used");

  if (remaining !== null) {
    creditTracker.remaining = parseInt(remaining, 10);
  }
  if (used !== null) {
    creditTracker.used = parseInt(used, 10);
  }
  creditTracker.lastChecked = new Date();
}

function handleSuccessfulCall(): void {
  resetDailyCounterIfNeeded();
  resetMonthlyCounterIfNeeded();
  creditTracker.dailyCallsToday += 1;
  creditTracker.monthlyCallsUsed += 1;
  creditTracker.isApiDown = false;
  creditTracker.lastError = null;
  consecutiveFailures = 0;
}

function handleFailedCall(status: number, errorMessage: string): void {
  consecutiveFailures += 1;

  if (status === 401) {
    creditTracker.isApiKeyInvalid = true;
    creditTracker.lastError = "API key invalid (401). All automated calls halted.";
    console.error("[OddsApi] ❌ API key invalid (401). Halting all automated calls.");
    return;
  }

  if (status === 429) {
    // Exponential backoff: 1min, 2min, 4min, 8min, ... up to 30min
    const backoffMs = Math.min(
      60_000 * Math.pow(2, consecutiveFailures - 1),
      MAX_BACKOFF_MS,
    );
    backoffUntil = Date.now() + backoffMs;
    creditTracker.lastError = `Rate limited (429). Backing off for ${Math.ceil(backoffMs / 1000)}s.`;
    console.warn(`[OddsApi] ⚠️ Rate limited. Backoff ${Math.ceil(backoffMs / 1000)}s.`);
    return;
  }

  creditTracker.isApiDown = status === 0 || status >= 500;
  creditTracker.lastError = errorMessage;
}

// ── Core API Methods ──

/**
 * Fetch odds for a specific sport with date filtering.
 * Returns null if API call is blocked or fails.
 */
export async function fetchSportOdds(
  apiSportKey: string,
  options?: { dateFrom?: string; dateTo?: string },
): Promise<OddsApiEvent[] | null> {
  const apiKey = getOddsApiKey();
  if (!apiKey) {
    console.warn("[OddsApi] ODDS_API_KEY not configured.");
    return null;
  }

  const check = canMakeApiCall();
  if (!check.allowed) {
    console.warn(`[OddsApi] Blocked: ${check.reason}`);
    return null;
  }

  const params = new URLSearchParams({
    apiKey,
    regions: "eu",
    markets: "h2h,spreads,totals",
    oddsFormat: "decimal",
  });

  if (options?.dateFrom) params.set("commenceTimeFrom", options.dateFrom);
  if (options?.dateTo) params.set("commenceTimeTo", options.dateTo);

  const url = `https://api.the-odds-api.com/v4/sports/${apiSportKey}/odds?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (response.ok) {
      parseCreditsFromHeaders(response.headers);
      handleSuccessfulCall();

      const payload = await response.json() as unknown;
      if (!Array.isArray(payload)) {
        console.warn(`[OddsApi] Unexpected payload for ${apiSportKey}`);
        return [];
      }

      console.log(
        `[OddsApi] ✅ ${apiSportKey}: ${(payload as unknown[]).length} events | Credits: ${creditTracker.remaining ?? "?"}`,
      );
      return payload as OddsApiEvent[];
    }

    // Handle error responses
    const errorText = await response.text().catch(() => "");
    handleFailedCall(response.status, `${response.status}: ${errorText.slice(0, 200)}`);
    console.warn(`[OddsApi] ❌ ${apiSportKey}: ${response.status} ${errorText.slice(0, 120)}`);
    return null;
  } catch (error) {
    handleFailedCall(0, String(error));
    creditTracker.isApiDown = true;
    console.error(`[OddsApi] ❌ ${apiSportKey}: Network error`, error);
    return null;
  }
}

/**
 * Fetch live scores for a sport.
 */
export async function fetchSportScores(
  apiSportKey: string,
): Promise<OddsApiScoreEvent[] | null> {
  const apiKey = getOddsApiKey();
  if (!apiKey) return null;

  const check = canMakeApiCall();
  if (!check.allowed) {
    console.warn(`[OddsApi] Scores blocked: ${check.reason}`);
    return null;
  }

  const url = `https://api.the-odds-api.com/v4/sports/${apiSportKey}/scores?apiKey=${apiKey}&daysFrom=1`;

  try {
    const response = await fetch(url);

    if (response.ok) {
      parseCreditsFromHeaders(response.headers);
      handleSuccessfulCall();
      const payload = await response.json() as unknown;
      return Array.isArray(payload) ? payload as OddsApiScoreEvent[] : [];
    }

    const errorText = await response.text().catch(() => "");
    handleFailedCall(response.status, `Scores ${response.status}: ${errorText.slice(0, 200)}`);
    return null;
  } catch (error) {
    handleFailedCall(0, String(error));
    return null;
  }
}

/**
 * Fetch list of available sports.
 */
export async function fetchAvailableSports(): Promise<OddsApiSport[] | null> {
  const apiKey = getOddsApiKey();
  if (!apiKey) return null;

  const check = canMakeApiCall();
  if (!check.allowed) return null;

  try {
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports?apiKey=${apiKey}`,
    );

    if (response.ok) {
      parseCreditsFromHeaders(response.headers);
      handleSuccessfulCall();
      return (await response.json()) as OddsApiSport[];
    }

    const errorText = await response.text().catch(() => "");
    handleFailedCall(response.status, errorText.slice(0, 200));
    return null;
  } catch (error) {
    handleFailedCall(0, String(error));
    return null;
  }
}

// ── Status Getters ──

export function getApiStatus() {
  resetDailyCounterIfNeeded();
  resetMonthlyCounterIfNeeded();

  return {
    isOnline: !creditTracker.isApiDown && !creditTracker.isApiKeyInvalid,
    isApiKeyValid: !creditTracker.isApiKeyInvalid,
    creditsRemaining: creditTracker.remaining,
    creditsUsed: creditTracker.used,
    dailyCallsUsed: creditTracker.dailyCallsToday,
    dailyBudget: DAILY_SAFE_LIMIT,
    monthlyCallsUsed: creditTracker.monthlyCallsUsed,
    monthlyBudget: MONTHLY_BUDGET,
    lastChecked: creditTracker.lastChecked?.toISOString() ?? null,
    lastError: creditTracker.lastError,
    lastSuccessfulSync: creditTracker.lastSuccessfulSync?.toISOString() ?? null,
    isRateLimited: Date.now() < backoffUntil,
    backoffUntilMs: backoffUntil > Date.now() ? backoffUntil : null,
  };
}

export function setLastSuccessfulSync(): void {
  creditTracker.lastSuccessfulSync = new Date();
}

/**
 * Check if credits are critically low.
 */
export function isCreditsCritical(): boolean {
  return (
    creditTracker.remaining !== null &&
    creditTracker.remaining <= CRITICAL_CREDITS_THRESHOLD
  );
}

/**
 * Log a sync to the database for audit and history.
 */
export async function logApiSync(data: {
  jobName: string;
  status: string;
  sportsProcessed: number;
  eventsLoaded: number;
  errorMessage?: string;
  durationMs?: number;
}): Promise<void> {
  try {
    await prisma.apiSyncLog.create({
      data: {
        jobName: data.jobName,
        status: data.status,
        sportsProcessed: data.sportsProcessed,
        eventsLoaded: data.eventsLoaded,
        creditsUsed: creditTracker.used,
        creditsRemaining: creditTracker.remaining,
        errorMessage: data.errorMessage ?? null,
        durationMs: data.durationMs ?? null,
      },
    });
  } catch (err) {
    console.error("[OddsApi] Failed to log sync:", err);
  }
}
