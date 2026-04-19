import { useState, useMemo, useCallback } from "react";
import { Zap, Loader2, Radio } from "lucide-react";
import { useCustomEvents } from "../components/hooks/useCustomEvents";
import { CustomEventCard } from "../components/CustomEventCard";
import { useBetSlip, type BetSelection } from "../components/hooks/useBetSlip";

type StatusFilter = "ALL" | "LIVE" | "UPCOMING";

export default function CustomEventsPage() {
  const { events, loading, error, loadEvents } = useCustomEvents();
  const betSlip = useBetSlip();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");
  const nowMs = Date.now();

  const upcomingEvents = useMemo(
    () =>
      events.filter((e) => {
        if (e.status !== "PUBLISHED") {
          return false;
        }

        const startMs = new Date(e.startTime).getTime();
        return Number.isFinite(startMs) && startMs > nowMs;
      }),
    [events, nowMs],
  );

  const visibleEvents = useMemo(
    () =>
      events.filter((e) => {
        if (e.status === "PUBLISHED") {
          const startMs = new Date(e.startTime).getTime();
          return Number.isFinite(startMs) && startMs > nowMs;
        }

        // Show LIVE and FINISHED events
        return true;
      }),
    [events, nowMs],
  );

  const filteredEvents = useMemo(() => {
    if (activeFilter === "ALL") return visibleEvents;
    if (activeFilter === "LIVE") {
      return visibleEvents.filter((e) => e.status === "LIVE");
    }

    return upcomingEvents;
  }, [activeFilter, upcomingEvents, visibleEvents]);

  const liveCount = useMemo(
    () => events.filter((e) => e.status === "LIVE").length,
    [events],
  );

  const upcomingCount = upcomingEvents.length;

  const handleSelectOutcome = useCallback(
    (params: {
      eventId: string;
      eventName: string;
      leagueName: string;
      marketType: string;
      side: string;
      odds: number;
      commenceTime: string;
      isCustomEvent: boolean;
      customSelectionId: string;
    }) => {
      const selection: BetSelection = {
        eventId: params.eventId,
        eventName: params.eventName,
        leagueName: params.leagueName,
        marketType: params.marketType,
        side: params.side,
        odds: params.odds,
        commenceTime: params.commenceTime,
      };
      betSlip.addSelection(selection);
    },
    [betSlip],
  );

  const activeSelections = useMemo(
    () =>
      betSlip.selections.map((s) => ({
        eventId: s.eventId,
        side: s.side,
      })),
    [betSlip.selections],
  );

  const filterTabs: {
    label: string;
    value: StatusFilter;
    count: number;
    icon?: React.ReactNode;
  }[] = [
    { label: "All", value: "ALL", count: events.length },
    {
      label: "Live",
      value: "LIVE",
      count: liveCount,
      icon: <Radio size={10} className="text-emerald-400" />,
    },
    { label: "Upcoming", value: "UPCOMING", count: upcomingCount },
  ];

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/10 sm:h-9 sm:w-9">
            <Zap size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white sm:text-2xl">
              Custom Events
            </h1>
            <p className="text-[10px] text-[#546e8f] sm:text-xs">
              Exclusive markets by BetixPro
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex items-center gap-1 rounded-xl border border-[#1e3350]/40 bg-[#0f1a2d]/80 p-1 sm:mb-5 sm:gap-1.5 sm:p-1.5">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveFilter(tab.value)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition-all duration-200 sm:px-3 sm:py-2.5 sm:text-sm ${
              activeFilter === tab.value
                ? "bg-gradient-to-b from-amber-400/15 to-amber-400/5 text-amber-400 shadow-[inset_0_0_0_1px_rgba(245,166,35,0.2)]"
                : "text-[#637fa0] hover:text-[#8aa0c0]"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span
              className={`ml-0.5 rounded-md px-1.5 py-[1px] text-[9px] font-bold tabular-nums sm:text-[10px] ${
                activeFilter === tab.value
                  ? "bg-amber-400/15 text-amber-400"
                  : "bg-white/[0.04] text-[#546e8f]"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/10" />
            <Loader2 className="relative size-8 animate-spin text-amber-400" />
          </div>
          <p className="mt-4 text-xs text-[#546e8f] sm:text-sm">
            Loading custom events...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center rounded-2xl border border-red-500/10 bg-[#111d2e] px-6 py-14 text-center sm:py-20">
          <p className="text-sm font-medium text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="mt-4 rounded-xl bg-gradient-to-r from-amber-400/15 to-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-400 transition hover:from-amber-400/20 hover:to-amber-500/15"
          >
            Try Again
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-[#1e3350]/30 bg-[#0f1a2d] px-6 py-14 text-center sm:py-20">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#111d2e] sm:size-16">
            <Zap size={24} className="text-[#3d5478]" />
          </div>
          <p className="text-base font-bold text-white sm:text-lg">
            No custom events available
          </p>
          <p className="mt-1.5 max-w-xs text-xs text-[#546e8f] sm:max-w-md sm:text-sm">
            {activeFilter === "LIVE"
              ? "No live custom events right now. Check back during match times!"
              : activeFilter === "UPCOMING"
                ? "No upcoming custom events. Check back soon!"
                : "Custom events will appear here when published by BetixPro."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {filteredEvents.map((event) => (
            <CustomEventCard
              key={event.id}
              event={event}
              onSelectOutcome={handleSelectOutcome}
              activeSelections={activeSelections}
            />
          ))}
        </div>
      )}
    </div>
  );
}
