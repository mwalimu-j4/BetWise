import { cn } from "@/lib/utils";
import { Clock, Zap, Timer } from "lucide-react";

interface Selection {
  id: string;
  label: string;
  name: string;
  odds: number;
}

interface Market {
  id: string;
  name: string;
  status: string;
  selections: Selection[];
}

export interface CustomEventData {
  id: string;
  title: string;
  teamHome: string;
  teamAway: string;
  category: string;
  league: string;
  startTime: string;
  status: "PUBLISHED" | "LIVE" | "SUSPENDED" | "FINISHED";
  markets: Market[];
}

interface CustomEventCardProps {
  event: CustomEventData;
  onSelectOutcome?: (params: {
    eventId: string;
    eventName: string;
    leagueName: string;
    marketType: string;
    side: string;
    odds: number;
    commenceTime: string;
    isCustomEvent: boolean;
    customSelectionId: string;
  }) => void;
  activeSelections?: { eventId: string; side: string }[];
}

function formatCountdown(startTime: string) {
  const diffMs = new Date(startTime).getTime() - Date.now();
  if (diffMs <= 0) return "Now";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CustomEventCard({
  event,
  onSelectOutcome,
  activeSelections = [],
}: CustomEventCardProps) {
  const isLive = event.status === "LIVE";
  const isSuspended = event.status === "SUSPENDED";
  const isFinished = event.status === "FINISHED";
  const bettingDisabled = isSuspended || isFinished;

  return (
    <div
      className={cn(
        "custom-event-card mobile-event-card relative overflow-hidden rounded-2xl border transition-all duration-300",
        "bg-gradient-to-br from-[#111d2e] via-[#0f1a2d] to-[#0d1624]",
        isLive
          ? "border-emerald-500/25 shadow-[0_0_24px_rgba(16,185,129,0.06)]"
          : "border-[#1e3350]/50 hover:border-amber-400/20",
      )}
    >
      {/* Status ribbon — top edge glow */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-[2px]",
          isLive
            ? "bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
            : "bg-gradient-to-r from-transparent via-amber-400/30 to-transparent",
        )}
      />

      {/* Header row */}
      <div className="flex items-center justify-between gap-1.5 px-2.5 pt-2.5 sm:px-4 sm:pt-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-400 sm:px-2 sm:text-[10px]">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          )}
          <span className="truncate rounded-full bg-amber-400/8 px-1.5 py-[2px] text-[8px] font-semibold uppercase tracking-[0.16em] text-amber-400 sm:text-[10px]">
            {event.category}
          </span>
          <span className="hidden truncate text-[9px] text-[#6c86a8] sm:inline sm:text-[10px]">
            {event.league}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-full border border-[#223752]/70 bg-[#0b1525]/88 px-1.5 py-[3px] text-[8px] font-bold tabular-nums text-[#89a3c7] sm:text-[9px]">
          {isLive ? (
            <>
              <Timer size={9} className="text-emerald-400" />
              <span className="text-emerald-400">In Play</span>
            </>
          ) : (
            <>
              <Clock size={9} className="text-[#546e8f]" />
              {formatCountdown(event.startTime)}
            </>
          )}
        </div>
      </div>

      {/* Teams matchup */}
      <div className="px-2.5 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-[12px] font-extrabold leading-[1.15] text-white sm:text-[13px]">
              {event.teamHome}
            </span>
            <span className="truncate text-[12px] font-extrabold leading-[1.15] text-white sm:text-[13px]">
              {event.teamAway}
            </span>
          </div>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#223752]/80 bg-[#122133] text-[8px] font-black tracking-[0.18em] text-[#5f789b] sm:h-7 sm:w-7 sm:text-[9px]">
            VS
          </span>
        </div>
        {!isLive && (
          <p className="mt-1 text-[8px] font-medium text-[#6b86a8] sm:text-[10px]">
            {formatTime(event.startTime)}
          </p>
        )}
      </div>

      {/* Suspended Overlay */}
      {isSuspended && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-[3px]">
          <div className="rounded-xl border border-amber-400/20 bg-[#111d2e]/95 px-4 py-2.5 text-center shadow-2xl">
            <p className="text-xs font-bold text-amber-400 sm:text-sm">
              Betting Suspended
            </p>
            <p className="mt-0.5 text-[10px] text-[#546e8f]">
              Markets temporarily closed
            </p>
          </div>
        </div>
      )}

      {/* Markets */}
      {event.markets.map((market) => (
        <div
          key={market.id}
          className="border-t border-[#1e3350]/30 px-2.5 py-2 sm:px-4 sm:py-2.5"
        >
          <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#6c86a8] sm:text-[10px]">
            {market.name}
          </p>
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${Math.min(market.selections.length, 3)}, 1fr)`,
            }}
          >
            {market.selections.map((sel) => {
              const isSelected = activeSelections.some(
                (a) =>
                  a.eventId === event.id &&
                  a.side === `custom:${sel.id}`,
              );

              return (
                <button
                  key={sel.id}
                  type="button"
                  disabled={bettingDisabled || market.status !== "OPEN"}
                  onClick={() =>
                    onSelectOutcome?.({
                      eventId: event.id,
                      eventName: `${event.teamHome} vs ${event.teamAway}`,
                      leagueName: event.league,
                      marketType: market.name,
                      side: `custom:${sel.id}`,
                      odds: sel.odds,
                      commenceTime: event.startTime,
                      isCustomEvent: true,
                      customSelectionId: sel.id,
                    })
                  }
                  className={cn(
                    "group mobile-event-odds relative flex flex-col items-center gap-0.5 rounded-xl border px-1.5 py-2 transition-all duration-200",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    isSelected
                      ? "border-amber-400/40 bg-gradient-to-b from-amber-400/15 to-amber-400/5 shadow-[0_0_14px_rgba(245,166,35,0.08),inset_0_1px_0_rgba(245,166,35,0.15)]"
                      : "border-[#1e3350]/60 bg-gradient-to-b from-[#131f33] to-[#0f1a2d] hover:border-amber-400/25 hover:from-[#162540] hover:to-[#111d2e] active:scale-[0.97]",
                  )}
                >
                  <span
                    className={cn(
                      "truncate max-w-full text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px]",
                      isSelected ? "text-amber-300" : "text-[#6f88ac]",
                    )}
                  >
                    {sel.label}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-extrabold tabular-nums sm:text-base",
                      isSelected ? "text-amber-400" : "text-white",
                    )}
                  >
                    {sel.odds.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Footer badge */}
      <div className="flex items-center justify-center border-t border-[#1e3350]/20 bg-[#0b1525]/40 py-1.5">
        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.16em] text-amber-400/40 sm:text-[9px]">
          <Zap size={8} />
          BetixPro Custom
        </span>
      </div>
    </div>
  );
}

export default CustomEventCard;
