import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Clock3,
  Filter,
  Goal,
  Loader2,
  Swords,
  Ticket,
  TrendingUp,
  X
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useBetSlip, {
  betSlipToggleEventName,
  type BetSelection,
} from "../components/hooks/useBetSlip";
import {
  useLiveMatches,
  type LiveMarket,
  type LiveMarketKey,
  type LiveMatch,
} from "../components/hooks/useLiveMatches";

const liveFilterStorageKey = "betixpro.live.filters.v1";
const expandedMarketTabs = [
  "Main",
  "Goals",
  "Corners",
  "Cards",
  "Half Time",
  "Player Props",
] as const;

type LiveFilterState = {
  highlights: boolean;
  market: LiveMarketKey;
  q: string;
};

type FlatRow =
  | { kind: "league"; leagueKey: string; sport: string }
  | { kind: "match"; leagueKey: string; match: LiveMatch }
  | { kind: "expanded"; leagueKey: string; match: LiveMatch };

type OddsButtonTone = "up" | "down" | "neutral";

function readFiltersFromLocation(): LiveFilterState {
  if (typeof window === "undefined") {
    return {
      highlights: false,
      market: "1x2",
      q: "",
    };
  }

  const query = new URLSearchParams(window.location.search);
  const highlights = query.get("highlights") === "1";
  const market = (query.get("market") as LiveMarketKey | null) ?? "1x2";
  const q = query.get("q") ?? "";

  if (
    market !== "1x2" &&
    market !== "winner" &&
    market !== "btts" &&
    market !== "overunder" &&
    market !== "asianhandicap" &&
    market !== "drawnobet"
  ) {
    return { highlights, market: "1x2", q };
  }

  return {
    highlights,
    market,
    q,
  };
}

function getMarketOptions() {
  return [
    { value: "1x2", label: "1x2 / Winner" },
    { value: "btts", label: "Both Teams Score" },
    { value: "overunder", label: "Over/Under" },
    { value: "asianhandicap", label: "Asian Handicap" },
    { value: "drawnobet", label: "Draw No Bet" },
  ] as const;
}

function getColumnLabels(market: LiveMarketKey) {
  if (market === "overunder") {
    return ["Over", "Under"];
  }

  if (market === "btts") {
    return ["Yes", "No"];
  }

  if (market === "asianhandicap" || market === "drawnobet") {
    return ["Home", "Away"];
  }

  return ["1", "X", "2"];
}

function formatTimeAgo(isoDate: string | null) {
  if (!isoDate) {
    return "never";
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000),
  );
  return `${elapsedSeconds}s ago`;
}

function formatCurrency(value: number) {
  return `KES ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function toBetSelection(
  match: LiveMatch,
  market: LiveMarket | undefined,
  side: string,
  odds: number,
): BetSelection {
  return {
    eventId: match.id,
    eventName: `${match.home_team.name} vs ${match.away_team.name}`,
    leagueName: `${match.league.country} • ${match.league.name}`,
    marketType: market?.type ?? "h2h",
    side,
    odds,
    commenceTime: match.kickoff_at,
    isLive: true,
  };
}

function getSportGlyph(sport: string) {
  const normalized = sport.toLowerCase();
  if (normalized.includes("basket")) {
    return "🏀";
  }
  if (normalized.includes("tennis")) {
    return "🎾";
  }
  if (normalized.includes("hockey")) {
    return "🏒";
  }
  if (normalized.includes("cricket")) {
    return "🏏";
  }
  return "⚽";
}

function useMatchClock(match: LiveMatch) {
  const [secondsOffset, setSecondsOffset] = useState(0);

  useEffect(() => {
    setSecondsOffset(0);
    if (match.status !== "live") {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsOffset((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [match.id, match.minute, match.status]);

  if (match.status === "ft") {
    return "FT";
  }

  if (match.status === "ht") {
    return "HT";
  }

  if (match.status === "suspended") {
    return "Susp";
  }

  const totalSeconds = Math.max(0, match.minute * 60 + secondsOffset);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${match.period} ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const LiveOddsButton = memo(function LiveOddsButton({
  label,
  odds,
  previousOdds,
  suspended,
  selected,
  onClick,
}: {
  label: string;
  odds: number | null;
  previousOdds: number | null;
  suspended: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const [displayOdds, setDisplayOdds] = useState(odds ?? 0);
  const [tone, setTone] = useState<OddsButtonTone>("neutral");

  useEffect(() => {
    if (odds === null) {
      return;
    }

    const startingValue = Number.isFinite(displayOdds) ? displayOdds : odds;
    const nextValue = odds;
    const delta = nextValue - (previousOdds ?? startingValue);

    if (Math.abs(delta) > 0.001) {
      setTone(delta > 0 ? "up" : "down");
      const toneTimer = window.setTimeout(() => setTone("neutral"), 1500);
      const animationStart = performance.now();
      const duration = 240;
      let frame = 0;

      const tick = (timestamp: number) => {
        const progress = Math.min(1, (timestamp - animationStart) / duration);
        const eased = 1 - (1 - progress) * (1 - progress);
        const value = startingValue + (nextValue - startingValue) * eased;
        setDisplayOdds(Math.round(value * 100) / 100);

        if (progress < 1) {
          frame = window.requestAnimationFrame(tick);
        }
      };

      frame = window.requestAnimationFrame(tick);

      return () => {
        window.clearTimeout(toneTimer);
        window.cancelAnimationFrame(frame);
      };
    }

    setDisplayOdds(nextValue);
    return;
  }, [displayOdds, odds, previousOdds]);

  return (
    <button
      type="button"
      disabled={suspended || odds === null}
      onClick={onClick}
      className={[
        "group relative min-h-[32px] rounded-[4px] border border-[#1e3a5f] px-0 py-1 text-center transition-[background-color,transform] duration-150 active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F5C518]/55",
        suspended || odds === null
          ? "cursor-default bg-[#0f172a] text-[#334155] pointer-events-none"
          : selected
            ? "bg-[#F5C518] text-[#0d1117]"
            : "bg-[#0f172a] text-white hover:bg-[#162032]",
        tone === "up" ? "[animation:flashGreen_1.5s_ease-out]" : "",
        tone === "down" ? "[animation:flashRed_1.5s_ease-out]" : "",
      ].join(" ")}
    >
      <div className="text-[9px] font-medium uppercase leading-none text-[#64748b]">
        {label}
      </div>
      <div className="mt-0.5 text-[12px] font-semibold leading-none">
        {suspended || odds === null ? "—" : displayOdds.toFixed(2)}
      </div>
      {selected ? (
        <span className="absolute right-1 top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0d1117] text-[#F5C518]">
          <Check size={9} />
        </span>
      ) : null}
    </button>
  );
});

const MatchRow = memo(function MatchRow({
  match,
  selectedOdds,
  onSelect,
  expanded,
  onToggleExpand,
  market,
  highlighted,
}: {
  match: LiveMatch;
  selectedOdds: Set<string>;
  onSelect: (selection: BetSelection) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  market: LiveMarketKey;
  highlighted?: boolean;
}) {
  const timerLabel = useMatchClock(match);
  const primaryMarket = match.markets[0];
  const columns = getColumnLabels(market);
  const totalCorners = match.stats.corners_home + match.stats.corners_away;
  const totalYellows = match.stats.yellows_home + match.stats.yellows_away;
  const totalReds = match.stats.reds_home + match.stats.reds_away;

  return (
    <article
      id={`live-match-${match.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-[#0f1923] p-3 transition-all duration-300 ${
        highlighted
          ? "match-highlight"
          : "border-[#24384f] hover:border-[#355373]"
      }`}
    >
      {/* Card Header: League Info & Live Status */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f5c518]" />
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[#8aa4c5]">
            {match.league.country} • {match.league.name}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full border border-[#ef4444]/40 bg-[#ef4444]/10 px-1.5 py-0.5">
            <span className="h-1 w-1 rounded-full bg-[#ef4444]" />
            <span className="text-[9px] font-bold uppercase tracking-tight text-[#ef4444]">
              {timerLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleExpand}
            className="flex h-6 items-center gap-1 rounded border border-[#29425f] bg-[#122235] px-1.5 text-[9px] font-bold text-[#95afcc] transition hover:border-[#f5c518]/55 hover:text-[#f5c518]"
          >
            <TrendingUp size={10} />+{match.markets_count}
          </button>
        </div>
      </div>

      {/* Card Body: Teams & Live Scores */}
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
             <div className="h-4 w-1 bg-[#1e3a5f]/30 rounded-full" />
             <span className="truncate text-[13px] font-bold text-[#f1f6ff]">
               {match.home_team.name}
             </span>
          </div>
          <span className="text-[14px] font-black tabular-nums text-[#ef4444]">
            {match.home_team.score}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
             <div className="h-4 w-1 bg-[#1e3a5f]/30 rounded-full" />
             <span className="truncate text-[13px] font-bold text-[#f1f6ff]">
               {match.away_team.name}
             </span>
          </div>
          <span className="text-[14px] font-black tabular-nums text-[#ef4444]">
            {match.away_team.score}
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="my-2 flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-[#5f7898]">
        {totalCorners > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-amber-500">▲</span>
            {match.stats.corners_home + match.stats.corners_away} Corners
          </span>
        )}
        {totalYellows > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-1.5 rounded-[1px] bg-yellow-500" />
            {totalYellows} Cards
          </span>
        )}
      </div>

      {/* Card Footer: Main Odds */}
      <div className="mt-auto grid grid-cols-3 gap-1.5 border-t border-[#1d3147] pt-2.5">
        {columns.map((columnLabel) => {
          const selection =
            primaryMarket?.selections.find(
              (item) => item.name.toLowerCase() === columnLabel.toLowerCase(),
            ) ??
            primaryMarket?.selections.find(
              (item) => item.label.toLowerCase() === columnLabel.toLowerCase(),
            ) ??
            null;

          const side = selection?.name ?? columnLabel;
          const key = `${match.id}:${side}`;

          return (
            <LiveOddsButton
              key={`${match.id}-${columnLabel}`}
              label={columnLabel}
              odds={selection?.odds ?? null}
              previousOdds={selection?.previous_odds ?? null}
              suspended={
                primaryMarket?.status === "suspended" ||
                selection?.status === "suspended"
              }
              selected={selectedOdds.has(key)}
              onClick={() => {
                if (!selection?.odds) return;
                onSelect(toBetSelection(match, primaryMarket, side, selection.odds));
              }}
            />
          );
        })}
      </div>
    </article>
  );
});

function MatchRowSkeleton() {
  return (
    <div className="rounded-xl border border-[#31455f] bg-[#0f172a] p-3">
      <div className="h-4 w-1/3 animate-pulse rounded bg-[#1f2937]" />
      <div className="mt-3 h-4 w-5/6 animate-pulse rounded bg-[#1f2937]" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-[#1f2937]" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-14 animate-pulse rounded bg-[#1f2937]" />
        <div className="h-14 animate-pulse rounded bg-[#1f2937]" />
        <div className="h-14 animate-pulse rounded bg-[#1f2937]" />
      </div>
    </div>
  );
}

function EmptyLiveState() {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-[#31455f] bg-[#0f172a] p-8 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#1f2937] text-[#F5C518]">
        <Goal size={24} />
      </span>
      <h3 className="mt-4 text-xl font-bold text-white">
        No live matches right now
      </h3>
      <p className="mt-2 text-sm text-[#8a9bb0]">
        Check back soon or explore upcoming matches
      </p>
      <Link
        to="/user"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[#22c55e] px-5 text-sm font-semibold text-[#0d1117]"
      >
        View Upcoming Matches
      </Link>
    </div>
  );
}

function ExpandedMarkets({
  matchId,
  onSelect,
}: {
  matchId: string;
  onSelect: (market: LiveMarket, side: string, odds: number) => void;
}) {
  const [tab, setTab] = useState<(typeof expandedMarketTabs)[number]>("Main");
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<LiveMarket[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadMarkets = async () => {
      try {
        const { data } = await api.get<{ match: { markets: LiveMarket[] } }>(
          `/live/${matchId}`,
        );
        if (!mounted) {
          return;
        }
        setMarkets(data.match.markets ?? []);
      } catch {
        if (!mounted) {
          return;
        }
        setMarkets([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadMarkets();

    return () => {
      mounted = false;
    };
  }, [matchId]);

  return (
    <div className="border-t border-[#1f2937] bg-[#0f172a] px-3 py-3 sm:px-4">
      <div className="flex gap-2 overflow-x-auto pb-2 app-scrollbar">
        {expandedMarketTabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={[
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide",
              tab === item
                ? "border-[#F5C518] bg-[#F5C518]/15 text-[#F5C518]"
                : "border-[#31455f] text-[#8a9bb0]",
            ].join(" ")}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-[#8a9bb0]">
          <Loader2 size={16} className="animate-spin" />
          <span className="ml-2 text-sm">Loading markets...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {markets.map((market) =>
            market.selections.map((selection) => (
              <LiveOddsButton
                key={`${market.id}-${selection.id}`}
                label={`${market.type} • ${selection.label}`}
                odds={selection.odds}
                previousOdds={selection.previous_odds}
                suspended={
                  market.status === "suspended" ||
                  selection.status === "suspended"
                }
                selected={false}
                onClick={() => {
                  if (!selection.odds) {
                    return;
                  }
                  onSelect(market, selection.name, selection.odds);
                }}
              />
            )),
          )}
        </div>
      )}
    </div>
  );
}

function BetSlipContent({
  betSlip,
  isDesktop,
}: {
  betSlip: ReturnType<typeof useBetSlip>;
  isDesktop: boolean;
}) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [tab, setTab] = useState<"normal" | "shikisha" | "virtuals">("normal");
  const [loadCode, setLoadCode] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const totalOdds = useMemo(() => {
    if (betSlip.selections.length === 0) {
      return 0;
    }

    return betSlip.selections.reduce(
      (total, selection) => total * selection.odds,
      1,
    );
  }, [betSlip.selections]);

  const placeLabel = isAuthenticated ? "Place Bet" : "Login to Place Bet";

  const loadSharedBetSlip = useCallback(async () => {
    if (!loadCode.trim()) {
      return;
    }

    setLoadingCode(true);
    setLoadError(null);

    try {
      const { data } = await api.get<{ selections: BetSelection[] }>(
        "/user/betslip/load",
        {
          params: { code: loadCode.trim() },
        },
      );

      for (const selection of data.selections ?? []) {
        betSlip.addSelection(selection);
      }
    } catch {
      setLoadError("Could not load that shared betslip code.");
    } finally {
      setLoadingCode(false);
    }
  }, [betSlip, loadCode]);

  return (
    <div className="rounded-2xl border border-[#31455f] bg-[#0f172a] p-4 text-white">
      <div className="mb-3 border-b border-[#1f2937] pb-2">
        <div className="flex gap-5">
          {[
            {
              value: "normal",
              label: "Normal",
              count: betSlip.selections.length,
            },
            { value: "shikisha", label: "Shikisha Bet", count: 0 },
            { value: "virtuals", label: "Virtuals", count: 0 },
          ].map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() =>
                setTab(entry.value as "normal" | "shikisha" | "virtuals")
              }
              className={[
                "relative pb-2 text-xs font-semibold uppercase tracking-wide",
                tab === entry.value ? "text-[#F5C518]" : "text-[#8a9bb0]",
              ].join(" ")}
            >
              {entry.label} ({entry.count})
              {tab === entry.value ? (
                <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[#F5C518]" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] text-[#8a9bb0]">Shared Betslip</p>
        <input
          value={loadCode}
          onChange={(event) => setLoadCode(event.target.value)}
          placeholder="e.g. VBmSU"
          className="h-10 w-full rounded-lg border border-[#273140] bg-[#0d1117] px-3 text-sm outline-none focus:border-[#F5C518]"
        />
        <button
          type="button"
          onClick={() => void loadSharedBetSlip()}
          disabled={loadingCode}
          className="flex h-10 w-full items-center justify-center rounded-lg bg-[#22c55e] text-sm font-semibold text-[#0d1117] disabled:opacity-60"
        >
          {loadingCode ? "Loading..." : "Load Betslip"}
        </button>
        {loadError ? (
          <p className="text-xs text-[#ef4444]">{loadError}</p>
        ) : null}
      </div>

      {betSlip.selections.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#273140] px-3 py-5 text-center">
          <p className="text-sm font-semibold text-white">No selections yet</p>
          <p className="mt-1 text-xs text-[#8a9bb0]">
            Tap odds to build your ticket.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="max-h-[310px] space-y-2 overflow-y-auto pr-1 app-scrollbar">
            {betSlip.selections.map((selection) => (
              <div
                key={`${selection.eventId}-${selection.side}`}
                className="rounded-xl border border-[#273140] bg-[#0d1117] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-[#8a9bb0]">
                      {selection.leagueName}
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {selection.eventName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => betSlip.removeSelection(selection.eventId)}
                    className="rounded-full bg-[#0c1018] p-1 text-[#8a9bb0]"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#8a9bb0]">
                  <span>{selection.marketType}</span>
                  <span>{selection.side}</span>
                  <span className="font-semibold text-[#F5C518]">
                    {selection.odds.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#273140] bg-[#0d1117] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#8a9bb0]">Total odds</span>
              <span className="font-bold text-[#F5C518]">
                {totalOdds.toFixed(2)}
              </span>
            </div>
            <div className="mt-3">
              <label className="text-xs text-[#8a9bb0]">Stake (KES)</label>
              <input
                type="number"
                min={50}
                max={100000}
                value={betSlip.stake}
                onChange={(event) =>
                  betSlip.setStake(Number(event.target.value) || 0)
                }
                className="mt-1 h-10 w-full rounded-lg border border-[#31455f] bg-[#0c1018] px-3 text-sm outline-none focus:border-[#F5C518]"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-[#8a9bb0]">Possible payout</span>
              <span className="font-bold text-[#22c55e]">
                {formatCurrency(betSlip.potentialPayout)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                openAuthModal("login");
                return;
              }

              void betSlip.placeBet();
            }}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-[#22c55e] text-sm font-semibold text-[#0d1117]"
          >
            {placeLabel}
          </button>
          {betSlip.error ? (
            <p className="text-xs text-[#ef4444]">{betSlip.error}</p>
          ) : null}
        </div>
      )}

      {!isDesktop ? (
        <p className="mt-3 text-center text-[11px] text-[#6b7280]">
          Optimized for quick mobile placement
        </p>
      ) : null}
    </div>
  );
}

export default function LivePage() {
  const initialFilters = useMemo(readFiltersFromLocation, []);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<LiveFilterState>(() => {
    if (typeof window === "undefined") {
      return initialFilters;
    }

    const persisted = window.localStorage.getItem(liveFilterStorageKey);
    if (!persisted) {
      return initialFilters;
    }

    try {
      const parsed = JSON.parse(persisted) as LiveFilterState;
      return {
        highlights: Boolean(parsed.highlights),
        market: parsed.market ?? "1x2",
        q: parsed.q ?? "",
      };
    } catch {
      return initialFilters;
    }
  });

  const [collapsedLeagues, setCollapsedLeagues] = useState<
    Record<string, boolean>
  >({});
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [mobileSlipOpen, setMobileSlipOpen] = useState(false);
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(
    null,
  );
  const virtualContainerRef = useRef<HTMLDivElement | null>(null);
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);
  const betSlip = useBetSlip();

  const {
    groupedMatches,
    matches,
    loading,
    error,
    isSocketConnected,
    lastUpdatedAt,
    refresh,
  } = useLiveMatches(filters);

  const selectedOdds = useMemo(
    () =>
      new Set(
        betSlip.selections.map(
          (selection) => `${selection.eventId}:${selection.side}`,
        ),
      ),
    [betSlip.selections],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onToggleRequest = () => {
      if (window.innerWidth < 1024) {
        setMobileSlipOpen((current) => !current);
      }
    };

    window.addEventListener(betSlipToggleEventName, onToggleRequest);
    return () =>
      window.removeEventListener(betSlipToggleEventName, onToggleRequest);
  }, []);

  useEffect(() => {
    if (betSlip.selections.length === 0) {
      setMobileSlipOpen(false);
    }
  }, [betSlip.selections.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams(window.location.search);
      query.set("market", filters.market);
      if (filters.highlights) {
        query.set("highlights", "1");
      } else {
        query.delete("highlights");
      }
      if (filters.q.trim()) {
        query.set("q", filters.q.trim());
      } else {
        query.delete("q");
      }

      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${query.toString()}`,
      );
      window.localStorage.setItem(
        liveFilterStorageKey,
        JSON.stringify(filters),
      );
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [filters]);


  const filterCount =
    Number(filters.highlights) + Number(Boolean(filters.q.trim()));
  const leagueEntries = Object.entries(groupedMatches).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const shouldVirtualize = matches.length > 50;

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];
    for (const [leagueKey, leagueMatches] of leagueEntries) {
      rows.push({
        kind: "league",
        leagueKey,
        sport: leagueMatches[0]?.sport ?? "football",
      });
      if (collapsedLeagues[leagueKey]) {
        continue;
      }

      for (const match of leagueMatches) {
        rows.push({ kind: "match", leagueKey, match });
        if (expandedMatchId === match.id) {
          rows.push({ kind: "expanded", leagueKey, match });
        }
      }
    }

    return rows;
  }, [collapsedLeagues, expandedMatchId, leagueEntries]);

  const rowHeights = useMemo(() => {
    return flatRows.map((row) => {
      if (row.kind === "league") {
        return 30;
      }

      if (row.kind === "expanded") {
        return 240;
      }

      return 185;
    });
  }, [flatRows]);

  const getItemSize = useCallback(
    (index: number) => rowHeights[index] ?? 140,
    [rowHeights],
  );

  const rowOffsets = useMemo(() => {
    const offsets: number[] = [];
    let offset = 0;

    for (let index = 0; index < rowHeights.length; index += 1) {
      offsets[index] = offset;
      offset += rowHeights[index] ?? 0;
    }

    return {
      offsets,
      totalHeight: offset,
    };
  }, [rowHeights]);

  const toggleLeague = useCallback((leagueKey: string) => {
    setCollapsedLeagues((current) => ({
      ...current,
      [leagueKey]: !current[leagueKey],
    }));
  }, []);

  const onSelect = useCallback(
    (selection: BetSelection) => {
      betSlip.addSelection(selection);
    },
    [betSlip],
  );

  // Handle match highlighting and scrolling from ticker
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const highlightId = query.get("highlight");
    if (!highlightId || matches.length === 0) {
      return;
    }

    setHighlightedMatchId(highlightId);

    const tryScroll = () => {
      // 1. Ensure league is expanded
      const targetMatch = matches.find((m) => m.id === highlightId);
      if (targetMatch) {
        const leagueKey = `${targetMatch.league.country} • ${targetMatch.league.name}`;
        if (collapsedLeagues[leagueKey]) {
          setCollapsedLeagues((prev) => ({ ...prev, [leagueKey]: false }));
          // Re-run after state update
          return;
        }
      }

      // 2. Find row index in flatRows
      const rowIndex = flatRows.findIndex(
        (r) => r.kind === "match" && r.match.id === highlightId,
      );
      if (rowIndex !== -1) {
        if (shouldVirtualize && virtualContainerRef.current) {
          const offset = rowOffsets.offsets[rowIndex] ?? 0;
          virtualContainerRef.current.scrollTo({
            top: offset - 80,
            behavior: "smooth",
          });
        } else {
          const el = document.getElementById(`live-match-${highlightId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    };

    const timer = setTimeout(tryScroll, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [
    window.location.search,
    matches.length,
    flatRows.length,
    shouldVirtualize,
    collapsedLeagues,
    rowOffsets.offsets,
  ]);

  const listHeight =
    typeof window === "undefined"
      ? 700
      : Math.max(580, window.innerHeight - 280);
  const virtualOverscan = 420;

  const visibleRange = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        start: 0,
        end: flatRows.length - 1,
      };
    }

    const startEdge = Math.max(0, virtualScrollTop - virtualOverscan);
    const endEdge = virtualScrollTop + listHeight + virtualOverscan;

    let start = 0;
    for (let index = 0; index < flatRows.length; index += 1) {
      const rowTop = rowOffsets.offsets[index] ?? 0;
      const rowBottom = rowTop + getItemSize(index);
      if (rowBottom >= startEdge) {
        start = index;
        break;
      }
    }

    let end = flatRows.length - 1;
    for (let index = start; index < flatRows.length; index += 1) {
      const rowTop = rowOffsets.offsets[index] ?? 0;
      if (rowTop > endEdge) {
        end = index;
        break;
      }
    }

    return {
      start,
      end,
    };
  }, [
    flatRows.length,
    getItemSize,
    listHeight,
    rowOffsets.offsets,
    shouldVirtualize,
    virtualScrollTop,
  ]);

  return (
    <div className="live-betting-wrapper min-h-screen bg-gradient-to-br from-[#0b1120] to-[#0f172a] text-white">
      <div className="live-betting-main mx-auto w-full max-w-[1440px] px-2 pb-24 pt-2 sm:px-3 sm:py-3 md:pb-6 lg:px-5 lg:py-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[#31455f] bg-[#0f172a]">
            <div className="z-20 border-b border-[#31455f] bg-[#0f172a] px-[10px] py-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((value) => !value)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[#31455f] bg-[#0c1018] px-[10px] text-[11px] font-medium text-[#90a2bb]"
                >
                  <Filter size={12} />
                  Filters
                  {filterCount > 0 ? (
                    <span className="rounded-full bg-[#F5C518] px-2 py-0.5 text-[10px] font-bold text-[#0d1117]">
                      {filterCount}
                    </span>
                  ) : null}
                  <ChevronDown size={11} />
                </button>

                <select
                  value={filters.highlights ? "highlights" : "all"}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      highlights: event.target.value === "highlights",
                    }))
                  }
                  className="h-7 rounded-[5px] border border-[#31455f] bg-[#0c1018] px-[10px] text-[11px] font-medium text-[#90a2bb] outline-none"
                >
                  <option value="all">All Matches</option>
                  <option value="highlights">Highlights</option>
                </select>

                <select
                  value={filters.market}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      market: event.target.value as LiveMarketKey,
                    }))
                  }
                  className="h-7 rounded-[5px] border border-[#31455f] bg-[#0c1018] px-[10px] text-[11px] font-medium text-[#90a2bb] outline-none"
                >
                  {getMarketOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  value={filters.q}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      q: event.target.value,
                    }))
                  }
                  placeholder="Search live games"
                  className="h-7 min-w-[160px] flex-1 rounded-[5px] border border-[#31455f] bg-[#0c1018] px-2.5 text-[11px] text-[#90a2bb] outline-none placeholder:text-[#8a9bb0] focus:border-[#F5C518]"
                />

                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="ml-auto inline-flex h-7 items-center gap-1 rounded-[5px] px-0 text-[10px] font-medium text-[#8a9bb0]"
                >
                  <Clock3 size={11} />
                  Updated {formatTimeAgo(lastUpdatedAt)}
                </button>
              </div>

              {filtersOpen ? (
                <div className="mt-2 rounded-md border border-[#31455f] bg-[#0c1018] p-2">
                  <p className="text-[10px] text-[#8a9bb0]">
                    Extra filters panel
                  </p>
                </div>
              ) : null}
            </div>

            <div className="z-10 grid grid-cols-[55%_45%] border-b border-[#31455f] bg-[#0c1018] px-[10px] py-1.5 text-[10px] font-medium uppercase tracking-wide text-[#8a9bb0]">
              <span>Teams</span>
              <span
                className={`grid ${getColumnLabels(filters.market).length === 3 ? "grid-cols-3" : "grid-cols-2"} gap-1 text-center`}
              >
                {getColumnLabels(filters.market).map((column) => (
                  <span key={column}>{column}</span>
                ))}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden app-scrollbar">
              {loading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <MatchRowSkeleton key={`live-skeleton-${index}`} />
                  ))}
                </div>
              ) : error ? (
                <div className="m-2 rounded-xl border border-[#5f2932] bg-[#2a1519] p-5 text-center text-sm text-red-200">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="mt-3 rounded-lg bg-[#F5C518] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#0d1117]"
                  >
                    Retry
                  </button>
                </div>
              ) : matches.length === 0 ? (
                <div className="p-2">
                  <EmptyLiveState />
                </div>
              ) : (
                <div className="min-h-0">
                  {shouldVirtualize ? (
                    <div
                      ref={virtualContainerRef}
                      onScroll={(event) => {
                        setVirtualScrollTop(event.currentTarget.scrollTop);
                      }}
                      className="h-full min-h-0 overflow-auto"
                    >
                      <div
                        style={{
                          height: rowOffsets.totalHeight,
                          position: "relative",
                        }}
                      >
                        {flatRows
                          .slice(visibleRange.start, visibleRange.end + 1)
                          .map((row, localIndex) => {
                            const index = visibleRange.start + localIndex;
                            const top = rowOffsets.offsets[index] ?? 0;
                            const height = getItemSize(index);

                            if (row.kind === "league") {
                              const count =
                                groupedMatches[row.leagueKey]?.length ?? 0;
                              return (
                                <div
                                  key={`league-${row.leagueKey}`}
                                  style={{
                                    position: "absolute",
                                    top,
                                    height,
                                    left: 0,
                                    right: 0,
                                  }}
                                  className="border-b border-[#31455f] bg-[#0a0f1a] px-[10px] py-[5px]"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleLeague(row.leagueKey)}
                                    className="flex w-full items-center justify-between"
                                  >
                                    <span className="truncate text-[10px] font-medium tracking-[0.3px] text-[#90a2bb]">
                                      {getSportGlyph(row.sport)} {row.leagueKey}
                                    </span>
                                    <span className="text-[9px] text-[#8a9bb0]">
                                      {count} matches
                                    </span>
                                  </button>
                                </div>
                              );
                            }

                            if (row.kind === "expanded") {
                              return (
                                <div
                                  key={`expanded-${row.match.id}`}
                                  style={{
                                    position: "absolute",
                                    top,
                                    height,
                                    left: 0,
                                    right: 0,
                                  }}
                                >
                                  <ExpandedMarkets
                                    matchId={row.match.id}
                                    onSelect={(market, side, odds) => {
                                      onSelect(
                                        toBetSelection(
                                          row.match,
                                          market,
                                          side,
                                          odds,
                                        ),
                                      );
                                    }}
                                  />
                                </div>
                              );
                            }

                            return (
                              <div
                                key={`match-${row.match.id}`}
                                style={{
                                  position: "absolute",
                                  top,
                                  height,
                                  left: 0,
                                  right: 0,
                                  padding: "0 8px 8px",
                                }}
                              >
                                <MatchRow
                                  match={row.match}
                                  selectedOdds={selectedOdds}
                                  onSelect={onSelect}
                                  expanded={expandedMatchId === row.match.id}
                                  onToggleExpand={() => {
                                    setExpandedMatchId((current) =>
                                      current === row.match.id
                                        ? null
                                        : row.match.id,
                                    );
                                  }}
                                  market={filters.market}
                                  highlighted={highlightedMatchId === row.match.id}
                                />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0b1120] p-2 space-y-2">
                      {leagueEntries.map(([leagueKey, leagueMatches]) => (
                        <section key={leagueKey}>
                          <button
                            type="button"
                            onClick={() => toggleLeague(leagueKey)}
                            className="flex w-full items-center justify-between border-b border-[#31455f] bg-[#0a0f1a] px-[10px] py-[5px]"
                          >
                            <span className="truncate text-[10px] font-medium tracking-[0.3px] text-[#90a2bb]">
                              {getSportGlyph(
                                leagueMatches[0]?.sport ?? "football",
                              )}{" "}
                              {leagueKey}
                            </span>
                            <span className="text-[9px] text-[#8a9bb0]">
                              {leagueMatches.length} matches
                            </span>
                          </button>

                          {!collapsedLeagues[leagueKey]
                            ? leagueMatches.map((match) => (
                                <div key={match.id}>
                                  <MatchRow
                                    match={match}
                                    selectedOdds={selectedOdds}
                                    onSelect={onSelect}
                                    expanded={expandedMatchId === match.id}
                                    onToggleExpand={() => {
                                      setExpandedMatchId((current) =>
                                        current === match.id ? null : match.id,
                                      );
                                    }}
                                    market={filters.market}
                                    highlighted={highlightedMatchId === match.id}
                                  />
                                  {expandedMatchId === match.id ? (
                                    <ExpandedMarkets
                                      matchId={match.id}
                                      onSelect={(market, side, odds) => {
                                        onSelect(
                                          toBetSelection(
                                            match,
                                            market,
                                            side,
                                            odds,
                                          ),
                                        );
                                      }}
                                    />
                                  ) : null}
                                </div>
                              ))
                            : null}
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="betslip-sidebar hidden shrink-0 lg:block lg:w-[360px]">
            <div className="betslip-sticky-wrap lg:sticky lg:overflow-y-auto lg:app-scrollbar">
              <BetSlipContent betSlip={betSlip} isDesktop />
              <div className="flex items-center gap-1.5 border-x border-b border-[#31455f] bg-[#0f172a] px-3 py-2 text-[11px] text-[#8a9bb0]">
                <span
                  className={`inline-block h-[6px] w-[6px] rounded-full ${isSocketConnected ? "bg-[#22c55e]" : "bg-[#ef4444]"} animate-pulse`}
                />
                <Swords
                  size={12}
                  className={
                    isSocketConnected ? "text-[#22c55e]" : "text-[#ef4444]"
                  }
                />
                {isSocketConnected
                  ? "Real-time feed connected"
                  : "Reconnecting..."}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[74px] z-40 px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileSlipOpen(true)}
          className="flex h-12 w-full items-center justify-between rounded-xl border border-[#31455f] bg-[#0f172a] px-3 text-sm text-white shadow-[0_16px_36px_rgba(0,0,0,0.42)]"
        >
          <span className="inline-flex items-center gap-2 font-semibold">
            <Ticket size={15} className="text-[#F5C518]" />
            {betSlip.selections.length} selections
          </span>
          <span className="text-xs text-[#8a9bb0]">
            Total odds:{" "}
            {Math.max(
              1,
              betSlip.selections.reduce((acc, item) => acc * item.odds, 1),
            ).toFixed(2)}
          </span>
          <span className="font-bold text-[#22c55e]">
            {formatCurrency(betSlip.potentialPayout)}
          </span>
        </button>
      </div>

      <div
        className={`fixed inset-0 z-50 overflow-hidden lg:hidden ${mobileSlipOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${mobileSlipOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileSlipOpen(false)}
          aria-hidden="true"
        />
        <div
          className={[
            "absolute bottom-0 left-0 right-0 max-h-[86vh] overflow-y-auto rounded-t-2xl border-t border-[#31455f] bg-[#0f172a] p-3 transition-transform duration-300",
            mobileSlipOpen ? "translate-y-0" : "translate-y-full",
          ].join(" ")}
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">
              Bet Slip
            </h3>
            <button
              type="button"
              onClick={() => setMobileSlipOpen(false)}
              className="rounded-full bg-[#0c1018] p-1 text-[#8a9bb0]"
            >
              <X size={14} />
            </button>
          </div>
          <BetSlipContent betSlip={betSlip} isDesktop={false} />
        </div>
      </div>

      <style>{`
        @keyframes flashGreen {
          0% { background: #166534; }
          100% { background: #0f172a; }
        }
        @keyframes flashRed {
          0% { background: #7f1d1d; }
          100% { background: #0f172a; }
        }
      `}</style>
    </div>
  );
}
