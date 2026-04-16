import { useState, useMemo, useCallback } from "react";
import { Clock, Zap, Filter, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomEvents } from "../hooks/useCustomEvents";
import { CustomEventCard } from "../components/CustomEventCard";
import { useBetSlip, type BetSelection } from "../hooks/useBetSlip";
import { walletSummaryQueryKey } from "../payments/wallet";
import { myBetsNavbarCountQueryKey } from "../hooks/useMyBets";

type StatusFilter = "ALL" | "LIVE" | "UPCOMING";

export default function CustomEventsPage() {
  const { events, loading, error, loadEvents, placeBet } = useCustomEvents();
  const betSlip = useBetSlip();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");

  const filteredEvents = useMemo(() => {
    if (activeFilter === "ALL") return events;
    if (activeFilter === "LIVE")
      return events.filter((e) => e.status === "LIVE");
    return events.filter((e) => e.status === "PUBLISHED");
  }, [events, activeFilter]);

  const liveCount = useMemo(
    () => events.filter((e) => e.status === "LIVE").length,
    [events],
  );

  const upcomingCount = useMemo(
    () => events.filter((e) => e.status === "PUBLISHED").length,
    [events],
  );

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

  const filterTabs: { label: string; value: StatusFilter; count: number }[] = [
    { label: "All Events", value: "ALL", count: events.length },
    { label: "Live Now", value: "LIVE", count: liveCount },
    { label: "Upcoming", value: "UPCOMING", count: upcomingCount },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Zap size={24} className="text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Custom Events</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Specially curated events by BetixPro — exclusive markets you won't
          find anywhere else
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-5 flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-slate-900/60 p-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveFilter(tab.value)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              activeFilter === tab.value
                ? "bg-amber-400/10 text-amber-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] ${
                activeFilter === tab.value
                  ? "bg-amber-400/20"
                  : "bg-white/5"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-amber-400" />
          <p className="mt-3 text-sm text-slate-400">
            Loading custom events...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="mt-3 rounded-lg bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-400/20"
          >
            Try Again
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-800/50">
            <Zap size={28} className="text-slate-500" />
          </div>
          <p className="text-lg font-semibold text-white">
            No custom events available
          </p>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            {activeFilter === "LIVE"
              ? "No live custom events right now. Check back during match times!"
              : activeFilter === "UPCOMING"
                ? "No upcoming custom events. Check back soon!"
                : "Custom events will appear here when published by BetixPro."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
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
