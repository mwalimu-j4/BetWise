import { prisma } from "../lib/prisma";
import { getOddsApiKey, MONTHLY_API_BUDGET } from "./oddsAutomationConfig";

export interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsApiMarket {
  key: string;
  outcomes?: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  markets?: OddsApiMarket[];
}

export interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: OddsApiBookmaker[];
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

type OddsRequestOptions = {
  dateFrom?: string;
  dateTo?: string;
  markets?: string[];
};

type ApiHealthState = {
  creditsRemaining: number | null;
  creditsUsed: number | null;
  lastCheckedAt: Date | null;
  lastSuccessfulSync: Date | null;
  lastError: string | null;
  isApiDown: boolean;
  isApiKeyInvalid: boolean;
  isRateLimited: boolean;
  backoffUntil: number | null;
};

const BASE_URL = "https://api.the-odds-api.com/v4";
const DEFAULT_MARKETS = ["h2h"];
const MAX_BACKOFF_MS = 30 * 60 * 1000;

let consecutiveFailures = 0;

const apiState: ApiHealthState = {
  creditsRemaining: null,
  creditsUsed: null,
  lastCheckedAt: null,
  lastSuccessfulSync: null,
  lastError: null,
  isApiDown: false,
  isApiKeyInvalid: false,
  isRateLimited: false,
  backoffUntil: null,
};

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeOutcome(outcome: unknown): OddsApiOutcome | null {
  if (!outcome || typeof outcome !== "object") return null;
  const row = outcome as Record<string, unknown>;
  if (typeof row.name !== "string" || typeof row.price !== "number" || row.price <= 1) {
    return null;
  }

  return {
    name: sanitizeText(row.name),
    price: row.price,
    point: typeof row.point === "number" ? row.point : undefined,
  };
}

function sanitizeEvent(event: unknown): OddsApiEvent | null {
  if (!event || typeof event !== "object") return null;
  const row = event as Record<string, unknown>;
  const id = sanitizeText(row.id);
  const sportKey = sanitizeText(row.sport_key);
  const homeTeam = sanitizeText(row.home_team);
  const awayTeam = sanitizeText(row.away_team);
  const commenceTime = sanitizeText(row.commence_time);

  if (!id || !sportKey || !homeTeam || !awayTeam || !commenceTime) {
    return null;
  }

  const bookmakers = Array.isArray(row.bookmakers)
    ? row.bookmakers.flatMap((bookmaker) => {
        if (!bookmaker || typeof bookmaker !== "object") return [];
        const bm = bookmaker as Record<string, unknown>;
        if (typeof bm.key !== "string" || typeof bm.title !== "string") return [];

        const markets: OddsApiMarket[] = Array.isArray(bm.markets)
          ? bm.markets.flatMap((market) => {
              if (!market || typeof market !== "object") return [];
              const m = market as Record<string, unknown>;
              if (typeof m.key !== "string") return [];

              const outcomes = Array.isArray(m.outcomes)
                ? m.outcomes
                    .map(sanitizeOutcome)
                    .filter((item): item is OddsApiOutcome => item !== null)
                : [];

              return [{ key: sanitizeText(m.key), outcomes }];
            })
          : [];

        return [
          {
            key: sanitizeText(bm.key),
            title: sanitizeText(bm.title),
            markets,
          },
        ];
      })
    : [];

  return {
    id,
    sport_key: sportKey,
    sport_title: sanitizeText(row.sport_title) || sportKey,
    commence_time: commenceTime,
    home_team: homeTeam,
    away_team: awayTeam,
    bookmakers,
  };
}

function sanitizeScoreEvent(event: unknown): OddsApiScoreEvent | null {
  if (!event || typeof event !== "object") return null;
  const row = event as Record<string, unknown>;
  const id = sanitizeText(row.id);
  if (!id) return null;

  return {
    id,
    sport_key: sanitizeText(row.sport_key),
    sport_title: sanitizeText(row.sport_title),
    commence_time: sanitizeText(row.commence_time),
    completed: Boolean(row.completed),
    home_team: sanitizeText(row.home_team),
    away_team: sanitizeText(row.away_team),
    scores: Array.isArray(row.scores)
      ? row.scores
          .filter((score): score is { name: string; score: string } => {
            if (!score || typeof score !== "object") return false;
            const item = score as Record<string, unknown>;
            return typeof item.name === "string" && typeof item.score === "string";
          })
          .map((score) => ({
            name: sanitizeText(score.name),
            score: sanitizeText(score.score),
          }))
      : null,
    last_update: typeof row.last_update === "string" ? row.last_update : null,
  };
}

function normalizeCommenceTimeParam(value?: string): string | null {
  if (!value) return null;

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return null;

  // The Odds API rejects milliseconds; required format is YYYY-MM-DDTHH:MM:SSZ.
  return asDate.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function getDefaultMarketsForSport(sportKey: string): string[] {
  // Outright futures endpoints typically reject h2h/spreads/totals combinations.
  if (/(winner|championship|outright)/i.test(sportKey)) {
    return ["outrights"];
  }
  return DEFAULT_MARKETS;
}

async function logApiCall(data: {
  endpoint: string;
  sportKey?: string;
  requestType: string;
  responseStatus: number;
  durationMs?: number;
  errorMessage?: string;
}) {
  try {
    await prisma.oddsApiCallLog.create({
      data: {
        endpoint: data.endpoint,
        sportKey: data.sportKey ?? null,
        requestType: data.requestType,
        responseStatus: data.responseStatus,
        durationMs: data.durationMs ?? null,
        creditsRemaining: apiState.creditsRemaining,
        creditsUsed: apiState.creditsUsed,
        errorMessage: data.errorMessage ?? null,
      },
    });
  } catch (error) {
    console.error("[OddsApi] Failed to write API call log:", error);
  }
}

function updateCredits(headers: Headers) {
  apiState.creditsRemaining = parsePositiveInt(headers.get("x-requests-remaining"));
  apiState.creditsUsed = parsePositiveInt(headers.get("x-requests-used"));
  apiState.lastCheckedAt = new Date();
}

function noteSuccess() {
  apiState.isApiDown = false;
  apiState.isRateLimited = false;
  apiState.lastError = null;
  apiState.backoffUntil = null;
  consecutiveFailures = 0;
}

function noteFailure(status: number, message: string) {
  apiState.lastError = message;

  if (status === 401) {
    const normalized = message.toLowerCase();
    const usageExhausted = normalized.includes("out_of_usage_credits") || normalized.includes("usage quota");

    if (usageExhausted) {
      apiState.creditsRemaining = 0;
      apiState.isApiKeyInvalid = false;
    } else {
      apiState.isApiKeyInvalid = true;
    }

    apiState.isApiDown = false;
    return;
  }

  if (status === 429) {
    consecutiveFailures += 1;
    const delayMs = Math.min(60_000 * 2 ** (consecutiveFailures - 1), MAX_BACKOFF_MS);
    apiState.isRateLimited = true;
    apiState.backoffUntil = Date.now() + delayMs;
    return;
  }

  apiState.isApiDown = status === 0 || status >= 500;
}

function isBackoffActive() {
  return Boolean(apiState.backoffUntil && apiState.backoffUntil > Date.now());
}

function canCallApi() {
  if (!getOddsApiKey()) return { allowed: false, reason: "Missing THE_ODDS_API_KEY." };
  if (apiState.isApiKeyInvalid) return { allowed: false, reason: "The Odds API key is invalid." };
  if (isBackoffActive()) return { allowed: false, reason: "The Odds API backoff is active." };
  if (apiState.creditsRemaining !== null && apiState.creditsRemaining <= 0) {
    return { allowed: false, reason: "The Odds API credits are exhausted." };
  }

  return { allowed: true };
}

class OddsApiService {
  private async request<T>(args: {
    endpoint: string;
    requestType: string;
    sportKey?: string;
    query?: URLSearchParams;
    sanitize: (payload: unknown) => T;
  }): Promise<T | null> {
    const precheck = canCallApi();
    if (!precheck.allowed) {
      return null;
    }

    const url = `${BASE_URL}${args.endpoint}${args.query ? `?${args.query.toString()}` : ""}`;
    const startedAt = Date.now();

    try {
      const response = await fetch(url);
      updateCredits(response.headers);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        noteFailure(response.status, `${response.status}: ${errorText.slice(0, 200)}`);
        await logApiCall({
          endpoint: args.endpoint,
          sportKey: args.sportKey,
          requestType: args.requestType,
          responseStatus: response.status,
          durationMs: Date.now() - startedAt,
          errorMessage: errorText.slice(0, 200),
        });
        return null;
      }

      const json = (await response.json()) as unknown;
      const sanitized = args.sanitize(json);
      noteSuccess();
      await logApiCall({
        endpoint: args.endpoint,
        sportKey: args.sportKey,
        requestType: args.requestType,
        responseStatus: response.status,
        durationMs: Date.now() - startedAt,
      });
      return sanitized;
    } catch (error) {
      noteFailure(0, String(error));
      await logApiCall({
        endpoint: args.endpoint,
        sportKey: args.sportKey,
        requestType: args.requestType,
        responseStatus: 0,
        durationMs: Date.now() - startedAt,
        errorMessage: String(error).slice(0, 200),
      });
      return null;
    }
  }

  async fetchAvailableSports(): Promise<OddsApiSport[] | null> {
    const apiKey = getOddsApiKey();
    const query = new URLSearchParams({ apiKey });

    return this.request({
      endpoint: "/sports",
      requestType: "sports",
      query,
      sanitize: (payload) =>
        Array.isArray(payload)
          ? payload.filter((item): item is OddsApiSport => {
              if (!item || typeof item !== "object") return false;
              const row = item as Record<string, unknown>;
              return typeof row.key === "string" && typeof row.title === "string";
            }) as OddsApiSport[]
          : [],
    });
  }

  async fetchSportOdds(sportKey: string, options?: OddsRequestOptions): Promise<OddsApiEvent[] | null> {
    const apiKey = getOddsApiKey();
    const query = new URLSearchParams({
      apiKey,
      regions: "eu",
      markets: (options?.markets?.length ? options.markets : getDefaultMarketsForSport(sportKey)).join(","),
      oddsFormat: "decimal",
    });

    const commenceTimeFrom = normalizeCommenceTimeParam(options?.dateFrom);
    const commenceTimeTo = normalizeCommenceTimeParam(options?.dateTo);

    if (commenceTimeFrom) query.set("commenceTimeFrom", commenceTimeFrom);
    if (commenceTimeTo) query.set("commenceTimeTo", commenceTimeTo);

    return this.request({
      endpoint: `/sports/${sportKey}/odds`,
      requestType: "odds",
      sportKey,
      query,
      sanitize: (payload) =>
        Array.isArray(payload)
          ? payload.map(sanitizeEvent).filter((item): item is OddsApiEvent => item !== null)
          : [],
    });
  }

  async fetchSportScores(sportKey: string): Promise<OddsApiScoreEvent[] | null> {
    const apiKey = getOddsApiKey();
    const query = new URLSearchParams({ apiKey, daysFrom: "1" });

    return this.request({
      endpoint: `/sports/${sportKey}/scores`,
      requestType: "scores",
      sportKey,
      query,
      sanitize: (payload) =>
        Array.isArray(payload)
          ? payload.map(sanitizeScoreEvent).filter((item): item is OddsApiScoreEvent => item !== null)
          : [],
    });
  }

  getStatus() {
    const backoffRemainingMs =
      apiState.backoffUntil && apiState.backoffUntil > Date.now()
        ? apiState.backoffUntil - Date.now()
        : null;
    const creditsPercent =
      apiState.creditsRemaining === null
        ? null
        : Math.max(0, Math.round((apiState.creditsRemaining / MONTHLY_API_BUDGET) * 100));

    return {
      isOnline: !apiState.isApiDown && !apiState.isApiKeyInvalid,
      isApiKeyValid: !apiState.isApiKeyInvalid,
      isApiDown: apiState.isApiDown,
      isRateLimited: apiState.isRateLimited && Boolean(backoffRemainingMs),
      backoffRemainingMs,
      creditsRemaining: apiState.creditsRemaining,
      creditsUsed: apiState.creditsUsed,
      creditsPercent,
      monthlyBudget: MONTHLY_API_BUDGET,
      lastCheckedAt: apiState.lastCheckedAt?.toISOString() ?? null,
      lastSuccessfulSync: apiState.lastSuccessfulSync?.toISOString() ?? null,
      lastError: apiState.lastError,
    };
  }

  setLastSuccessfulSync() {
    apiState.lastSuccessfulSync = new Date();
  }

  hasCriticalCredits() {
    return apiState.creditsRemaining !== null && apiState.creditsRemaining <= MONTHLY_API_BUDGET * 0.1;
  }
}

export const oddsApiService = new OddsApiService();

export async function fetchAvailableSports() {
  return oddsApiService.fetchAvailableSports();
}

export async function fetchSportOdds(sportKey: string, options?: OddsRequestOptions) {
  return oddsApiService.fetchSportOdds(sportKey, options);
}

export async function fetchSportScores(sportKey: string) {
  return oddsApiService.fetchSportScores(sportKey);
}

export function getApiStatus() {
  return oddsApiService.getStatus();
}

export function setLastSuccessfulSync() {
  oddsApiService.setLastSuccessfulSync();
}

export function isCreditsCritical() {
  return oddsApiService.hasCriticalCredits();
}

export async function logApiSync(data: {
  jobName: string;
  status: string;
  sportsProcessed: number;
  eventsLoaded: number;
  errorMessage?: string;
  durationMs?: number;
}) {
  try {
    const status = getApiStatus();
    await prisma.apiSyncLog.create({
      data: {
        jobName: data.jobName,
        status: data.status,
        sportsProcessed: data.sportsProcessed,
        eventsLoaded: data.eventsLoaded,
        creditsRemaining: status.creditsRemaining,
        creditsUsed: status.creditsUsed,
        errorMessage: data.errorMessage ?? null,
        durationMs: data.durationMs ?? null,
      },
    });
  } catch (error) {
    console.error("[OddsApi] Failed to write sync log:", error);
  }
}
