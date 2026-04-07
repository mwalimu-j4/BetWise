import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Shield,
  Star,
  X,
} from "lucide-react";
import { isAxiosError } from "axios";
import { api } from "@/api/axiosConfig";
import type { BetSelection } from "../hooks/useBetSlip";

type DisplayedOdd = {
  id: string;
  bookmakerId: string;
  bookmakerName: string;
  marketType: string;
  side: string;
  displayOdds: number;
};

type EventDetailResponse = {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string | null;
  commenceTime: string;
  homeScore: number | null;
  awayScore: number | null;
  displayedOdds: DisplayedOdd[];
};

type EventMarketsModalProps = {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onOddsSelect: (selection: BetSelection) => void;
  selectedOdds: Set<string>;
};

type MarketTab =
  | "favourites"
  | "all"
  | "main"
  | "first_half"
  | "goals"
  | "cards_corners"
  | "combo"
  | "player"
  | "others";

const tabItems: { id: MarketTab; label: string }[] = [
  { id: "favourites", label: "My Favourites" },
  { id: "all", label: "All Markets" },
  { id: "main", label: "Main" },
  { id: "first_half", label: "First Half" },
  { id: "goals", label: "Goals" },
  { id: "cards_corners", label: "Cards and Corners" },
  { id: "combo", label: "Combo" },
  { id: "player", label: "Player" },
  { id: "others", label: "Others" },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatMarketTitle(value: string) {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatMatchTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getMarketTabByName(marketType: string): Exclude<MarketTab, "all" | "favourites"> {
  const name = normalize(marketType);

  const mainKeywords = [
    "1x2",
    "double chance",
    "who will win",
    "both teams to score",
    "draw no bet",
    "to qualify",
  ];

  const firstHalfKeywords = ["1st half", "first half", "ht"];

  const goalsKeywords = [
    "total",
    "over",
    "under",
    "goals",
    "multigoals",
    "exact goals",
    "score",
  ];

  const cardsCornersKeywords = ["corner", "card", "booking", "yellow", "red"];

  const playerKeywords = ["player", "scorer", "goalscorer", "assist"];

  const comboKeywords = [
    "both teams",
    "& total",
    "& both",
    "combo",
    "double chance &",
    "halftime/fulltime",
  ];

  if (mainKeywords.some((keyword) => name.includes(keyword))) {
    return "main";
  }

  if (firstHalfKeywords.some((keyword) => name.includes(keyword))) {
    return "first_half";
  }

  if (goalsKeywords.some((keyword) => name.includes(keyword))) {
    return "goals";
  }

  if (cardsCornersKeywords.some((keyword) => name.includes(keyword))) {
    return "cards_corners";
  }

  if (playerKeywords.some((keyword) => name.includes(keyword))) {
    return "player";
  }

  if (comboKeywords.some((keyword) => name.includes(keyword))) {
    return "combo";
  }

  return "others";
}

function getOddsGridColumns(count: number) {
  if (count === 2) {
    return "grid-cols-2";
  }

  if (count === 3) {
    return "grid-cols-3";
  }

  if (count >= 4 && count <= 6) {
    return "grid-cols-2 lg:grid-cols-2";
  }

  return "grid-cols-2 lg:grid-cols-3";
}

function getSelectionWeight(side: string) {
  const normalized = normalize(side);

  if (normalized === "1" || normalized === "home") {
    return 0;
  }

  if (normalized === "x" || normalized === "draw" || normalized === "tie") {
    return 1;
  }

  if (normalized === "2" || normalized === "away") {
    return 2;
  }

  return 99;
}

function isH2HMarket(marketType: string) {
  const type = normalize(marketType);

  return (
    type.includes("h2h") ||
    type.includes("1x2") ||
    type.includes("who will win") ||
    type.includes("winner")
  );
}

function dedupeMarketOdds(odds: DisplayedOdd[], marketType: string) {
  const seen = new Set<string>();
  const unique: DisplayedOdd[] = [];

  odds.forEach((odd) => {
    const key = `${normalize(odd.side || "selection")}:${odd.displayOdds.toFixed(2)}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    unique.push(odd);
  });

  return unique.sort((left, right) => {
    if (isH2HMarket(marketType)) {
      const sideDiff = getSelectionWeight(left.side) - getSelectionWeight(right.side);
      if (sideDiff !== 0) {
        return sideDiff;
      }
    }

    return left.side.localeCompare(right.side);
  });
}

export default function EventMarketsModal({
  eventId,
  isOpen,
  onClose,
  onOddsSelect,
  selectedOdds,
}: EventMarketsModalProps) {
  const [eventDetail, setEventDetail] = useState<EventDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState<MarketTab>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [favourites, setFavourites] = useState<Record<string, boolean>>({});
  const [activeHeaderTab, setActiveHeaderTab] = useState<"scoreboard" | "statistics">(
    "scoreboard",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    const fetchEventDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await api.get<EventDetailResponse>(`/user/events/${eventId}`);
        if (!cancelled) {
          setEventDetail(data);
          setCollapsed({});
        }
      } catch (fetchError) {
        if (!cancelled) {
          if (isAxiosError<{ error?: string; message?: string }>(fetchError)) {
            setError(
              fetchError.response?.data?.error ||
                fetchError.response?.data?.message ||
                "Unable to load markets right now.",
            );
          } else {
            setError("Unable to load markets right now.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchEventDetail();

    return () => {
      cancelled = true;
    };
  }, [eventId, isOpen]);

  const groupedMarkets = useMemo(() => {
    const markets = eventDetail?.displayedOdds ?? [];

    const byMarket = markets.reduce<Record<string, DisplayedOdd[]>>((acc, odd) => {
      const key = odd.marketType || "Other";
      const current = acc[key] ?? [];
      acc[key] = [...current, odd];
      return acc;
    }, {});

    return Object.entries(byMarket)
      .map(([marketType, odds]) => ({
        marketType,
        tab: getMarketTabByName(marketType),
        odds: dedupeMarketOdds(odds, marketType),
      }))
      .sort((left, right) => left.marketType.localeCompare(right.marketType));
  }, [eventDetail?.displayedOdds]);

  const visibleMarkets = useMemo(() => {
    if (activeTab === "all") {
      return groupedMarkets;
    }

    if (activeTab === "favourites") {
      return groupedMarkets.filter((item) => favourites[item.marketType]);
    }

    return groupedMarkets.filter((item) => item.tab === activeTab);
  }, [activeTab, favourites, groupedMarkets]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#0a1220]/85 backdrop-blur-[2px] p-2 pt-20 sm:p-4 sm:pt-24 lg:pl-[270px] lg:pr-8 lg:pt-24">
      <div className="mx-auto mb-6 flex h-auto w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[#2a3150] bg-[#1a2035] text-white">
        <header className="sticky top-0 z-10 shrink-0 border-b border-[#2a3150] bg-gradient-to-b from-[#1a2035] to-[#171d31] px-3 py-3 sm:px-4">
          <div className="relative flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#3a4468] bg-[#2a3150] px-2 py-1.5 text-xs text-[#cbd5e1] hover:text-white"
            >
              <ArrowLeft size={14} />
              Home
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#8fa3b1]">
                {eventDetail?.leagueName ?? "Match Markets"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#3a4468] bg-[#2a3150] p-2 text-[#cbd5e1] hover:text-white"
              aria-label="Close markets"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg border border-[#30395a] bg-[#1f2640] px-2 py-2 sm:px-3">
            <div className="flex min-w-0 items-center justify-end gap-2">
              <Shield size={16} className="shrink-0 text-[#f0b429]" />
              <p className="truncate text-right text-sm font-semibold sm:text-base">
                {eventDetail?.homeTeam ?? "Home"}
              </p>
            </div>

            <div className="px-2 text-center">
              <p className="text-xs font-semibold text-[#f0b429]">VS</p>
              <p className="text-[11px] text-[#8fa3b1]">
                {eventDetail ? `${formatMatchDate(eventDetail.commenceTime)} · ${formatMatchTime(eventDetail.commenceTime)}` : ""}
              </p>
              <p className="truncate text-[10px] text-[#6f7ca8]">
                {eventDetail ? `Match ID: ${eventDetail.eventId}` : ""}
              </p>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <Shield size={16} className="shrink-0 text-[#f0b429]" />
              <p className="truncate text-sm font-semibold sm:text-base">
                {eventDetail?.awayTeam ?? "Away"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveHeaderTab("scoreboard")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeHeaderTab === "scoreboard"
                  ? "bg-[#2a3150] text-white"
                  : "bg-transparent text-[#8fa3b1]"
              }`}
            >
              Scoreboard {eventDetail ? `${eventDetail.homeScore ?? 0}:${eventDetail.awayScore ?? 0}` : ""}
            </button>
            <button
              type="button"
              onClick={() => setActiveHeaderTab("statistics")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeHeaderTab === "statistics"
                  ? "bg-[#2a3150] text-white"
                  : "bg-transparent text-[#8fa3b1]"
              }`}
            >
              Statistics
            </button>
          </div>

          <p className="mt-2 text-center text-[11px] text-[#8fa3b1]">
            Tap any outcome below to add it to your bet slip. Best available odd per selection is shown.
          </p>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? "border-[#14b86b] bg-[#14b86b]/20 text-[#14b86b]"
                    : "border-[#3a4468] text-[#9aa7c7] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="p-2 sm:p-3">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-[#9aa7c7]">
              <Loader2 size={18} className="animate-spin" />
              <span className="ml-2 text-sm">Loading markets...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-[#5a222a] bg-[#2a1515] p-4 text-sm text-red-200">
              {error}
            </div>
          ) : visibleMarkets.length === 0 ? (
            <div className="rounded-lg border border-[#3a4468] bg-[#2a3150] p-4 text-sm text-[#9aa7c7]">
              No markets available for this filter.
            </div>
          ) : (
            <div className="space-y-3 overflow-hidden">
              {visibleMarkets.map((market) => {
                const isCollapsed = Boolean(collapsed[market.marketType]);
                const isFavourite = Boolean(favourites[market.marketType]);
                const gridCols = getOddsGridColumns(market.odds.length);

                return (
                  <section
                    key={market.marketType}
                    className="overflow-hidden rounded-lg border border-[#3a4468] bg-[#2a3150]"
                  >
                    <div className="flex items-center justify-between gap-2 bg-[#242b45] px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsed((current) => ({
                            ...current,
                            [market.marketType]: !current[market.marketType],
                          }))
                        }
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <Star size={14} className="shrink-0 text-[#f0b429]" />
                        <span className="truncate text-sm font-semibold text-white">
                          {formatMarketTitle(market.marketType)}
                        </span>
                        <span className="shrink-0 text-[11px] text-[#9aa7c7]">
                          {market.odds.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFavourites((current) => ({
                            ...current,
                            [market.marketType]: !current[market.marketType],
                          }))
                        }
                        className={`rounded-md p-1.5 ${
                          isFavourite ? "text-[#f0b429]" : "text-[#8fa3b1] hover:text-white"
                        }`}
                        title={isFavourite ? "Remove from favourites" : "Add to favourites"}
                      >
                        <Star size={14} fill={isFavourite ? "currentColor" : "none"} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCollapsed((current) => ({
                            ...current,
                            [market.marketType]: !current[market.marketType],
                          }))
                        }
                        className="rounded-md p-1.5 text-[#8fa3b1] hover:text-white"
                        aria-label="Toggle market"
                      >
                        {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>

                    {!isCollapsed ? (
                      <div className="border-t border-[#30395a] bg-[#202844] px-3 py-2 text-[11px] text-[#8fa3b1]">
                        {formatMarketTitle(market.marketType)} outcomes
                      </div>
                    ) : null}

                    {!isCollapsed ? (
                      <div className={`grid gap-2 overflow-hidden p-3 ${gridCols}`}>
                        {market.odds.map((odd) => {
                          const side = odd.side || "Selection";
                          const selectionKey = `${eventId}:${odd.marketType}:${side}:${odd.displayOdds.toFixed(2)}`;
                          const isSelected = selectedOdds.has(selectionKey);

                          return (
                            <button
                              key={odd.id}
                              type="button"
                              onClick={() => {
                                if (!eventDetail) {
                                  return;
                                }

                                onOddsSelect({
                                  eventId: eventDetail.eventId,
                                  eventName: `${eventDetail.homeTeam} vs ${eventDetail.awayTeam}`,
                                  leagueName: eventDetail.leagueName ?? "Featured Match",
                                  marketType: odd.marketType,
                                  side,
                                  odds: odd.displayOdds,
                                  commenceTime: eventDetail.commenceTime,
                                });
                              }}
                              className={`flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-md border px-3 py-2 text-left transition ${
                                isSelected
                                  ? "border-[#f0b429] bg-[#f0b429]/15 text-[#f0b429]"
                                  : "border-[#3a4468] bg-[#1f2640] text-white hover:bg-[#2a3150]"
                              }`}
                            >
                              <span className="min-w-0 truncate text-xs">{side}</span>
                              <span className="shrink-0 text-sm font-bold">
                                {odd.displayOdds.toFixed(2)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
