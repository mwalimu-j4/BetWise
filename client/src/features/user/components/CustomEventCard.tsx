import { cn } from "@/lib/utils";
import { Clock, Zap } from "lucide-react";

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
  const bettingDisabled = isSuspended || event.status === "FINISHED";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-300",
        "bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/80",
        "backdrop-blur-xl",
        isLive
          ? "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
          : "border-white/[0.06] hover:border-white/[0.12]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
              </span>
              Live
            </span>
          )}
          <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            {event.category}
          </span>
          <span className="text-[10px] text-slate-400">{event.league}</span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock size={10} />
          {isLive ? "In Play" : formatCountdown(event.startTime)}
        </div>
      </div>

      {/* Teams */}
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            {event.teamHome}
          </span>
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
            VS
          </span>
          <span className="text-sm font-semibold text-white text-right">
            {event.teamAway}
          </span>
        </div>
        {!isLive && (
          <p className="mt-1 text-center text-[10px] text-slate-500">
            {formatTime(event.startTime)}
          </p>
        )}
      </div>

      {/* Suspended Overlay */}
      {isSuspended && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl bg-slate-800/90 px-4 py-2 text-center">
            <p className="text-sm font-bold text-amber-400">Betting Suspended</p>
            <p className="text-xs text-slate-400">Markets temporarily closed</p>
          </div>
        </div>
      )}

      {/* Markets */}
      {event.markets.map((market) => (
        <div key={market.id} className="border-t border-white/[0.04] px-4 py-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {market.name}
          </p>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(market.selections.length, 3)}, 1fr)` }}>
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
                    "group relative flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2 transition-all duration-200",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    isSelected
                      ? "border-amber-400/40 bg-amber-400/10 shadow-[0_0_12px_rgba(245,166,35,0.1)]"
                      : "border-white/[0.06] bg-white/[0.03] hover:border-amber-400/20 hover:bg-white/[0.06] active:scale-95",
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      isSelected ? "text-amber-300" : "text-slate-400",
                    )}
                  >
                    {sel.label}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
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
      <div className="flex items-center justify-center border-t border-white/[0.04] py-1.5">
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-400/50">
          <Zap size={8} />
          BetixPro Custom
        </span>
      </div>
    </div>
  );
}

export default CustomEventCard;
