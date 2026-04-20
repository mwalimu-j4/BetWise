import type { CustomEventData } from "../components/CustomEventCard";
import type { ApiEvent } from "../components/hooks/useEvents";

const TOP_TIER_PATTERNS = [
  /\buefa champions league\b/i,
  /\bucl\b/i,
  /\bpremier league\b/i,
  /\bepl\b/i,
  /\bla liga\b/i,
  /\bserie a\b/i,
  /\bbundesliga\b/i,
  /\bligue 1\b/i,
  /\bnba\b/i,
  /\beuroleague\b/i,
  /\bworld cup\b/i,
  /\bafcon\b/i,
];

const MID_TIER_PATTERNS = [
  /\bchampionship\b/i,
  /\bfa cup\b/i,
  /\bcarabao cup\b/i,
  /\bcopa del rey\b/i,
  /\bcoppa italia\b/i,
  /\bdfb pokal\b/i,
  /\beuropa league\b/i,
  /\bconference league\b/i,
  /\bmls\b/i,
  /\bsaudi pro league\b/i,
  /\bturkish super lig\b/i,
  /\beredivisie\b/i,
  /\bprimeira liga\b/i,
  /\bliga mx\b/i,
  /\bwta\b/i,
  /\batp\b/i,
];

type HighlightMarket = {
  key: string;
  label: string;
  side: string;
  odds: number;
  marketType: string;
  customSelectionId?: string;
};

export type HighlightEvent = {
  id: string;
  sourceType: "regular" | "custom";
  homeTeam: string;
  awayTeam: string;
  title: string;
  leagueName: string;
  sportKey: string;
  commenceTime: string;
  isLive: boolean;
  isCustom: boolean;
  score: number;
  leagueTierPoints: number;
  timePoints: number;
  livePoints: number;
  customPoints: number;
  featuredPoints: number;
  topMarkets: HighlightMarket[];
  regularEvent?: ApiEvent;
  customEvent?: CustomEventData;
};

type HighlightInput = {
  regularEvents: ApiEvent[];
  customEvents: CustomEventData[];
  now?: number;
  limit?: number;
};

function getLeagueTierPoints(leagueName: string, sportKey: string) {
  const haystack = `${leagueName} ${sportKey}`.trim();

  if (TOP_TIER_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return 40;
  }

  if (MID_TIER_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return 25;
  }

  return 10;
}

function getTimePoints(commenceTime: string, now: number) {
  const diffMs = new Date(commenceTime).getTime() - now;

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return 0;
  }

  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 2) return 30;
  if (diffHours <= 6) return 22;
  if (diffHours <= 12) return 15;
  if (diffHours <= 24) return 10;
  if (diffHours <= 48) return 5;
  return 0;
}

function toRegularTopMarkets(event: ApiEvent): HighlightMarket[] {
  const markets: HighlightMarket[] = [];

  if (event.markets.h2h?.home) {
    markets.push({
      key: `${event.eventId}-h2h-home`,
      label: "1",
      side: event.homeTeam,
      odds: event.markets.h2h.home,
      marketType: "h2h",
    });
  }

  if (typeof event.markets.h2h?.draw === "number") {
    markets.push({
      key: `${event.eventId}-h2h-draw`,
      label: "X",
      side: "Draw",
      odds: event.markets.h2h.draw,
      marketType: "h2h",
    });
  }

  if (event.markets.h2h?.away) {
    markets.push({
      key: `${event.eventId}-h2h-away`,
      label: "2",
      side: event.awayTeam,
      odds: event.markets.h2h.away,
      marketType: "h2h",
    });
  }

  if (
    markets.length < 3 &&
    typeof event.markets.totals?.over === "number" &&
    typeof event.markets.totals?.under === "number"
  ) {
    markets.push(
      {
        key: `${event.eventId}-totals-over`,
        label: "O",
        side: "Over",
        odds: event.markets.totals.over,
        marketType: "totals",
      },
      {
        key: `${event.eventId}-totals-under`,
        label: "U",
        side: "Under",
        odds: event.markets.totals.under,
        marketType: "totals",
      },
    );
  }

  return markets.slice(0, 3);
}

function toCustomTopMarkets(event: CustomEventData): HighlightMarket[] {
  const entries: HighlightMarket[] = [];

  for (const market of event.markets) {
    if (market.status !== "OPEN") {
      continue;
    }

    for (const selection of market.selections) {
      entries.push({
        key: `${event.id}-${selection.id}`,
        label: selection.label,
        side: `custom:${selection.id}`,
        odds: selection.odds,
        marketType: market.name,
        customSelectionId: selection.id,
      });

      if (entries.length === 3) {
        return entries;
      }
    }
  }

  return entries;
}

function compareHighlights(left: HighlightEvent, right: HighlightEvent) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (Number(right.isLive) !== Number(left.isLive)) {
    return Number(right.isLive) - Number(left.isLive);
  }

  return (
    new Date(left.commenceTime).getTime() - new Date(right.commenceTime).getTime()
  );
}

function buildRegularHighlight(event: ApiEvent, now: number): HighlightEvent {
  const leagueTierPoints = getLeagueTierPoints(
    event.leagueName ?? "Unknown league",
    event.sportKey ?? "",
  );
  const timePoints = getTimePoints(event.commenceTime, now);
  const livePoints = event.status === "LIVE" ? 20 : 0;
  const customPoints = 0;
  const featuredPoints = event.isFeatured ? 18 : 0;

  return {
    id: event.eventId,
    sourceType: "regular",
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    title: `${event.homeTeam} vs ${event.awayTeam}`,
    leagueName: event.leagueName ?? "Featured Match",
    sportKey: event.sportKey ?? "soccer",
    commenceTime: event.commenceTime,
    isLive: event.status === "LIVE",
    isCustom: false,
    score:
      leagueTierPoints +
      timePoints +
      livePoints +
      customPoints +
      featuredPoints,
    leagueTierPoints,
    timePoints,
    livePoints,
    customPoints,
    featuredPoints,
    topMarkets: toRegularTopMarkets(event),
    regularEvent: event,
  };
}

function buildCustomHighlight(
  event: CustomEventData,
  now: number,
): HighlightEvent {
  const leagueTierPoints = getLeagueTierPoints(
    event.league || event.category || "Custom Event",
    event.category,
  );
  const timePoints = getTimePoints(event.startTime, now);
  const livePoints = event.status === "LIVE" ? 20 : 0;
  const customPoints = 10;
  const featuredPoints = 0;

  return {
    id: event.id,
    sourceType: "custom",
    homeTeam: event.teamHome,
    awayTeam: event.teamAway,
    title: event.title || `${event.teamHome} vs ${event.teamAway}`,
    leagueName: event.league || "Custom Event",
    sportKey: event.category || "custom",
    commenceTime: event.startTime,
    isLive: event.status === "LIVE",
    isCustom: true,
    score:
      leagueTierPoints +
      timePoints +
      livePoints +
      customPoints +
      featuredPoints,
    leagueTierPoints,
    timePoints,
    livePoints,
    customPoints,
    featuredPoints,
    topMarkets: toCustomTopMarkets(event),
    customEvent: event,
  };
}

export function getHighlightEvents({
  regularEvents,
  customEvents,
  now = Date.now(),
  limit = 5,
}: HighlightInput): HighlightEvent[] {
  const uniqueRegularEvents = Array.from(
    new Map(regularEvents.map((event) => [event.eventId, event])).values(),
  );
  const uniqueCustomEvents = Array.from(
    new Map(customEvents.map((event) => [event.id, event])).values(),
  );

  const regularCandidates: HighlightEvent[] = uniqueRegularEvents
    .filter((event) => event.status === "LIVE" || event.status === "UPCOMING")
    .map((event) => buildRegularHighlight(event, now));

  const customCandidates: HighlightEvent[] = uniqueCustomEvents
    .filter((event) => event.status === "LIVE" || event.status === "PUBLISHED")
    .map((event) => buildCustomHighlight(event, now));

  const ranked = [...regularCandidates, ...customCandidates]
    .filter((event) => event.topMarkets.length > 0)
    .sort(compareHighlights);

  if (ranked.length > 0) {
    const maxItems = Math.max(1, Math.min(limit, 5));
    const featuredFirst = ranked.filter(
      (event) =>
        event.featuredPoints > 0 || event.isCustom || event.isLive,
    );
    const selected = featuredFirst.slice(0, maxItems);

    if (selected.length === maxItems) {
      return selected;
    }

    const selectedIds = new Set(
      selected.map((event) => `${event.sourceType}:${event.id}`),
    );
    const fillers = ranked.filter(
      (event) => !selectedIds.has(`${event.sourceType}:${event.id}`),
    );

    return [...selected, ...fillers].slice(0, maxItems);
  }

  const fallbackUpcoming: HighlightEvent[] = [...uniqueRegularEvents, ...uniqueCustomEvents]
    .map((event) => {
      if ("eventId" in event) {
        return buildRegularHighlight(event, now);
      }

      return buildCustomHighlight(event, now);
    })
    .filter((event) => event.topMarkets.length > 0)
    .sort(
      (left, right) =>
        new Date(left.commenceTime).getTime() -
        new Date(right.commenceTime).getTime(),
    );

  return fallbackUpcoming.slice(0, 1);
}
