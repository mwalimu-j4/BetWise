import { useState, useEffect } from "react";
import { X, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { api } from "@/api/axiosConfig";
import type { ApiEvent } from "../hooks/useEvents";
import type { BetSelection } from "../hooks/useBetSlip";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventMarketsModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onOddsSelect: (selection: BetSelection) => void;
  selectedOdds: Set<string>;
  events?: ApiEvent[];
}

interface DisplayedOdd {
  id: string;
  bookmakerId: string;
  bookmakerName: string;
  marketType: string;
  side: string;
  displayOdds: number;
}

interface DetailedEventResponse extends ApiEvent {
  displayedOdds: DisplayedOdd[];
}

// ─── Market Builders ─────────────────────────────────────────────────────────

type MarketGroup = "Main" | "Goals" | "Handicap" | "Combo";

interface BookmakerOdd {
  bookmakerName: string;
  odds: number;
  id: string;
  isBest: boolean;
}

interface OutcomeOdds {
  label: string;
  side: string;
  odds: BookmakerOdd[];
}

interface MarketCard {
  group: MarketGroup;
  name: string;
  marketType: string;
  outcomes: OutcomeOdds[];
  cols: 2 | 3;
}

// ─── Market Category Map ──────────────────────────────────────────────────────
const MARKET_CATEGORIES: Record<string, MarketGroup | null> = {
  h2h: "Main",
  "1×2": "Main",
  "win": "Main",
  "who will win": "Main",
  "double chance": "Main",
  "draw no bet": "Main",
  "both teams to score": "Goals",
  "btts": "Goals",
  "over/under": "Goals",
  "over": "Goals",
  "under": "Goals",
  "total goals": "Goals",
  "exact goals": "Goals",
  "spreads": "Handicap",
  "asian handicap": "Handicap",
  "handicap 1×2": "Handicap",
  "1st half handicap": "Handicap",
  "1x2 & btts": "Combo",
  "1x2 & total": "Combo",
  "double chance & btts": "Combo",
};

function getMarketGroup(marketType: string): MarketGroup {
  const normalized = marketType.trim().toLowerCase();
  return MARKET_CATEGORIES[normalized] ?? "Combo";
}

function formatMarketType(marketType: string) {
  return marketType
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildCardsFromDisplayedOdds(
  displayedOdds: DisplayedOdd[],
): MarketCard[] {
  // Group by market type ONLY
  const byMarketType = new Map<string, DisplayedOdd[]>();
  
  for (const odd of displayedOdds) {
    const key = odd.marketType.trim().toLowerCase();
    const current = byMarketType.get(key) ?? [];
    current.push(odd);
    byMarketType.set(key, current);
  }

  // Transform to MarketCard[]
  return Array.from(byMarketType.entries()).map(([marketTypeKey, odds]) => {
    // Group odds by side/outcome within this market
    const bySide = new Map<string, DisplayedOdd[]>();
    for (const odd of odds) {
      const sideKey = odd.side.trim().toLowerCase();
      const current = bySide.get(sideKey) ?? [];
      current.push(odd);
      bySide.set(sideKey, current);
    }

    // Find best odds for each side
    const outcomes: OutcomeOdds[] = [];
    for (const sideOdds of bySide.values()) {
      // Sort by odds descending to find best
      const sorted = [...sideOdds].sort((a, b) => b.displayOdds - a.displayOdds);
      const bestOddsValue = sorted[0]?.displayOdds ?? 0;

      const bookmakerOdds: BookmakerOdd[] = sorted.map((odd) => ({
        bookmakerName: odd.bookmakerName,
        odds: odd.displayOdds,
        id: odd.id,
        isBest: odd.displayOdds === bestOddsValue,
      }));

      outcomes.push({
        label: sideOdds[0]!.side, // Use first occurrence for label
        side: sideOdds[0]!.side,
        odds: bookmakerOdds,
      });
    }

    const originalOdd = odds[0];
    const marketType = originalOdd?.marketType ?? marketTypeKey;

    const colCount = outcomes.length >= 3 ? 3 : Math.min(Math.max(outcomes.length, 2), 2);

    return {
      group: getMarketGroup(marketType),
      name: formatMarketType(marketType),
      marketType: marketType,
      outcomes,
      cols: colCount as 2 | 3,
    };
  });
}

// ─── Tab config ──────────────────────────────────────────────────────────────

const TABS = ["All", "Main", "Goals", "Handicap", "Combo"] as const;
type Tab = (typeof TABS)[number];

// ─── Component ───────────────────────────────────────────────────────────────

export default function EventMarketsModal({
  eventId,
  isOpen,
  onClose,
  onOddsSelect,
  selectedOdds,
  events = [],
}: EventMarketsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [detailedEvent, setDetailedEvent] =
    useState<DetailedEventResponse | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(false);

  const normalizedRequestedId = String(eventId).trim();

  const matchesRequestedEvent = (candidateId?: string | number | null) => {
    if (candidateId === null || candidateId === undefined) return false;
    return String(candidateId).trim() === normalizedRequestedId;
  };

  const event = events.find(
    (e) => matchesRequestedEvent(e.id) || matchesRequestedEvent(e.eventId),
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const fetchEventDetails = async () => {
      setLoadingEvent(true);
      try {
        const { data } = await api.get<DetailedEventResponse>(
          `/user/events/${normalizedRequestedId}`,
        );
        if (!cancelled) {
          setDetailedEvent(data);
        }
      } catch {
        if (!cancelled) {
          setDetailedEvent(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingEvent(false);
        }
      }
    };

    void fetchEventDetails();

    return () => {
      cancelled = true;
    };
  }, [isOpen, normalizedRequestedId]);

  const activeEvent: ApiEvent | null = detailedEvent ?? event ?? null;

  const resolvedEventId = String(
    activeEvent?.eventId ?? activeEvent?.id ?? eventId,
  ).trim();

  useEffect(() => {
    if (isOpen) {
      setActiveTab("All");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (!activeEvent && loadingEvent) {
    return (
      <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/70">
        <div className="bg-[#0f1923] text-white rounded-xl p-8 text-center">
          <p className="text-[#8b9db5]">Loading event markets...</p>
        </div>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/70">
        <div className="bg-[#0f1923] text-white rounded-xl p-8 text-center">
          <p className="text-[#8b9db5]">Event not found.</p>
          <button
            onClick={onClose}
            className="mt-4 text-[#f0c040] hover:underline text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const markets = buildCardsFromDisplayedOdds(
    detailedEvent?.displayedOdds ?? [],
  );
  const filteredMarkets =
    activeTab === "All"
      ? markets
      : markets.filter((m) => m.group === activeTab);

  const selectedForEventCount = Array.from(selectedOdds).filter(
    (selectionKey) => selectionKey.startsWith(`${resolvedEventId}:`),
  ).length;

  const isSelected = (
    marketType: string,
    side: string,
    odds: number,
  ) => {
    const selectionKey = `${resolvedEventId}:${marketType}:${side}:${odds.toFixed(2)}`;
    return selectedOdds.has(selectionKey);
  };

  const handleSelect = (
    marketType: string,
    outcome: OutcomeOdds,
    bookmakerOdd: BookmakerOdd,
  ) => {
    onOddsSelect({
      eventId: resolvedEventId,
      eventName: `${activeEvent.homeTeam} vs ${activeEvent.awayTeam}`,
      leagueName: activeEvent.leagueName ?? "Featured Match",
      marketType: marketType,
      side: outcome.side,
      odds: bookmakerOdd.odds,
      commenceTime: activeEvent.commenceTime,
    });
  };

  const matchDate = new Date(activeEvent.commenceTime);
  const dateStr = matchDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = matchDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-end justify-center bg-[#030712]/80 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-h-[92vh] flex flex-col overflow-hidden rounded-t-2xl sm:max-w-2xl sm:rounded-2xl"
        style={{
          background: "linear-gradient(180deg, #0d1b2a 0%, #0a1520 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow:
            "0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(240,192,64,0.08)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex-shrink-0 px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* League + Close */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{
                  background: "rgba(240,192,64,0.15)",
                  color: "#f0c040",
                }}
              >
                {activeEvent.leagueName ?? "Featured Match"}
              </span>
              {activeEvent.status === "LIVE" && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", color: "#8b9db5" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex-1 text-right">
              <p className="text-white font-bold text-base leading-tight">
                {activeEvent.homeTeam}
              </p>
              {activeEvent.homeScore !== null && (
                <p className="text-[#f0c040] text-2xl font-black">
                  {activeEvent.homeScore}
                </p>
              )}
            </div>
            <div className="flex flex-col items-center px-3 flex-shrink-0">
              <span className="text-[#8b9db5] text-xs font-medium mb-0.5">
                VS
              </span>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-base leading-tight">
                {activeEvent.awayTeam}
              </p>
              {activeEvent.awayScore !== null && (
                <p className="text-[#f0c040] text-2xl font-black">
                  {activeEvent.awayScore}
                </p>
              )}
            </div>
          </div>

          {/* Date/time */}
          <div className="flex items-center gap-1.5 text-[#8b9db5] text-xs">
            <Clock size={11} />
            <span>
              {dateStr} · {timeStr}
            </span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div
          className="flex-shrink-0 flex gap-1 px-4 py-2.5 overflow-x-auto scrollbar-none"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {TABS.map((tab) => {
            const count =
              tab === "All"
                ? markets.length
                : markets.filter((m) => m.group === tab).length;
            if (count === 0 && tab !== "All") return null;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={
                  activeTab === tab
                    ? { background: "#f0c040", color: "#0a1520" }
                    : { background: "rgba(255,255,255,0.05)", color: "#8b9db5" }
                }
              >
                {tab}
                <span
                  className="ml-1.5 text-[10px]"
                  style={{ opacity: activeTab === tab ? 0.7 : 0.5 }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Markets ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {filteredMarkets.length === 0 ? (
            <div className="text-center py-12 text-[#8b9db5] text-sm">
              No markets available for this tab.
            </div>
          ) : (
            filteredMarkets.map((card, ci) => (
              <div
                key={ci}
                className="group overflow-hidden rounded-xl transition-all"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Card header */}
                <div
                  className="px-3.5 py-2.5 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span className="text-sm font-semibold text-white">
                    {card.name}
                  </span>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      color: "#8b9db5",
                    }}
                  >
                    {card.group}
                  </span>
                </div>

                {/* Outcomes */}
                <div className="p-2.5 space-y-2">
                  {card.outcomes.map((outcome, oi) => (
                    <div key={oi} className="space-y-1">
                      {/* Outcome label */}
                      <div className="px-1 py-0.5">
                        <span className="text-[11px] font-medium text-[#a0b3c8]">
                          {outcome.label}
                        </span>
                      </div>

                      {/* Bookmaker odds grid for this outcome */}
                      <div
                        className="grid gap-1.5"
                        style={{
                          gridTemplateColumns: `repeat(${Math.min(outcome.odds.length, 3)}, 1fr)`,
                        }}
                      >
                        {outcome.odds.map((bm) => {
                          const selected = isSelected(
                            card.marketType,
                            outcome.side,
                            bm.odds,
                          );
                          return (
                            <button
                              key={bm.id}
                              onClick={() =>
                                handleSelect(card.marketType, outcome, bm)
                              }
                              className={`flex flex-col items-center justify-center rounded-lg px-2 py-2 transition-all duration-150 ${
                                "hover:-translate-y-[1px]"
                              }`}
                              style={
                                bm.isBest
                                  ? selected
                                    ? {
                                        background:
                                          "rgba(240,192,64,0.25)",
                                        border: "1.5px solid #f0c040",
                                        boxShadow:
                                          "0 0 12px rgba(240,192,64,0.2)",
                                      }
                                    : {
                                        background:
                                          "rgba(240,192,64,0.12)",
                                        border: "1.5px solid rgba(240,192,64,0.5)",
                                      }
                                  : selected
                                    ? {
                                        background:
                                          "rgba(139,157,181,0.15)",
                                        border: "1px solid rgba(139,157,181,0.4)",
                                      }
                                    : {
                                        background:
                                          "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                      }
                              }
                            >
                              <span
                                className="text-base font-black tabular-nums"
                                style={{
                                  color: bm.isBest
                                    ? "#f0c040"
                                    : "#e8f0f8",
                                }}
                              >
                                {bm.odds.toFixed(2)}
                              </span>
                              <span
                                className="text-[8px] font-bold mt-0.5 text-center leading-tight"
                                style={{
                                  color: bm.isBest
                                    ? "rgba(240,192,64,0.8)"
                                    : "#6b7f94",
                                }}
                              >
                                {bm.bookmakerName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div className="h-4" />
        </div>

        {/* ── Footer – selected count ── */}
        {selectedForEventCount > 0 && (
          <div
            className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(240,192,64,0.06)",
            }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={14} style={{ color: "#f0c040" }} />
              <span className="text-xs text-[#a0b3c8]">
                <span style={{ color: "#f0c040", fontWeight: 700 }}>
                  {selectedForEventCount}
                </span>{" "}
                selection
                {selectedForEventCount !== 1 ? "s" : ""} added
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-xs font-semibold transition-colors"
              style={{ color: "#f0c040" }}
            >
              View Betslip <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
