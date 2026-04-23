import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock } from "lucide-react";
import type { MyBetListItem } from "@/features/user/components/hooks/useMyBets";
import { CancellationTimer } from "./CancellationTimer";

const badgeClassByStatus: Record<MyBetListItem["status"], string> = {
  bonus: "bg-[#F5C518] text-[#111827]",
  won: "bg-[#22c55e] text-white",
  lost: "bg-[#ef4444] text-white",
  open: "bg-[#3b82f6] text-white",
  cancelled: "bg-[#64748b] text-white",
};

type BetCardProps = {
  bet: MyBetListItem;
  onClick: () => void;
};

function formatMoney(value: number) {
  return `KES ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  const parsed = new Date(date);
  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEstimatedDurationMinutes(sportKey: string | null | undefined) {
  const normalized = sportKey?.trim().toLowerCase() ?? "";

  if (
    normalized.includes("basket") ||
    normalized.includes("nba") ||
    normalized.includes("wnba") ||
    normalized.includes("ncaab")
  ) {
    return 48;
  }

  if (
    normalized.includes("soccer") ||
    normalized.includes("football") ||
    normalized.includes("epl") ||
    normalized.includes("uefa") ||
    normalized.includes("fifa") ||
    normalized.includes("laliga") ||
    normalized.includes("serie_a") ||
    normalized.includes("bundesliga") ||
    normalized.includes("ligue")
  ) {
    return 90;
  }

  if (normalized.includes("hockey") || normalized.includes("nhl")) {
    return 60;
  }

  if (normalized.includes("baseball") || normalized.includes("mlb")) {
    return 180;
  }

  if (normalized.includes("tennis")) {
    return 120;
  }

  if (normalized.includes("cricket") || normalized.includes("ipl")) {
    return 210;
  }

  if (normalized.includes("rugby")) {
    return 80;
  }

  if (normalized.includes("americanfootball") || normalized.includes("nfl")) {
    return 60;
  }

  return null;
}

function formatDurationParts(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  if (minutes <= 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function BetCard({ bet, onClick }: BetCardProps) {
  const previousStatus = useRef<MyBetListItem["status"]>(bet.status);
  const [flashStatus, setFlashStatus] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (previousStatus.current !== bet.status) {
      setFlashStatus(true);
      const timer = window.setTimeout(() => setFlashStatus(false), 900);
      previousStatus.current = bet.status;
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [bet.status]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  const timeMeta = useMemo(() => {
    const kickoffAt = new Date(bet.match_time).getTime();
    if (Number.isNaN(kickoffAt)) {
      return null;
    }

    const diffMs = kickoffAt - now;
    const eventStatus = bet.event_status?.toUpperCase() ?? (bet.is_live ? "LIVE" : "UPCOMING");
    const estimatedDurationMinutes = getEstimatedDurationMinutes(bet.sport_key);

    if (eventStatus === "LIVE" || bet.is_live) {
      const elapsedMinutes = Math.max(0, Math.floor((now - kickoffAt) / 60000));
      const remainingMinutes =
        estimatedDurationMinutes === null
          ? null
          : Math.max(0, estimatedDurationMinutes - elapsedMinutes);

      return {
        label:
          remainingMinutes === null
            ? `${elapsedMinutes}m in play`
            : `${elapsedMinutes}m played | ~${remainingMinutes}m left`,
        toneClass: "text-[#22c55e]",
      };
    }

    if (diffMs > 0) {
      const remainingMinutes = Math.ceil(diffMs / 60000);
      return {
        label: `Starts in ${formatDurationParts(remainingMinutes)}`,
        toneClass: "text-[#f8c146]",
      };
    }

    return null;
  }, [bet.event_status, bet.is_live, bet.match_time, bet.sport_key, now]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-[#111d2e] via-[#0f1a2d] to-[#0d1624] p-4 text-left transition-all duration-300 active:scale-[0.98] ${
        bet.status === "won"
          ? "border-emerald-500/25 shadow-[0_0_24px_rgba(16,185,129,0.06)]"
          : bet.status === "lost"
            ? "border-red-500/20 opacity-90"
            : bet.is_live
              ? "border-emerald-500/25 shadow-[0_0_24px_rgba(16,185,129,0.06)]"
              : "border-[#1e3350]/50 hover:border-amber-400/20"
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-[2px] ${
          bet.status === "won"
            ? "bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
            : bet.status === "lost"
              ? "bg-gradient-to-r from-transparent via-red-500/40 to-transparent"
              : bet.is_live
                ? "bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
                : "bg-gradient-to-r from-transparent via-amber-400/30 to-transparent"
        }`}
      />

      <div className="flex flex-col gap-3.5">
        {/* TOP ROW: MATCH NAME & PAYOUT */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] sm:text-base font-bold text-white transition-colors group-hover:text-amber-400 truncate leading-tight">
              {bet.match_name || "Multiple Events"}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClassByStatus[bet.status]} ${
                  flashStatus ? "animate-[statusPulse_0.9s_ease-out]" : ""
                }`}
              >
                {bet.status}
              </span>
              {bet.status === "lost" && (
                <span className="text-[10px] font-bold text-[#ef4444] uppercase tracking-wider">
                  Settled
                </span>
              )}
              {timeMeta ? (
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${timeMeta.toneClass}`}
                >
                  {timeMeta.label}
                </span>
              ) : null}
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b86a8] mb-1.5 opacity-80">
              {bet.status === "won" ? "Total Payout" : bet.status === "lost" ? "Lost" : "Possible Payout"}
            </p>
            <p className="text-lg font-black text-white leading-none">
              {formatMoney(bet.possible_payout)}
            </p>
          </div>
        </div>


        {/* BOTTOM ROW: DATE & LIVE & SELECTIONS */}
        <div className="mt-1 flex items-center justify-between border-t border-[#1e3350]/30 pt-3">
          <div className="flex items-center gap-3 text-[10px] font-medium text-[#c6d6ea]">
            <span className="flex items-center gap-1.5 opacity-80">
              <CalendarClock size={11} className="text-[#6b86a8]" />
              {formatDate(bet.match_time)}
            </span>
            <span className="h-3 w-[1px] bg-[#1e3350]/50" />
            <span className="font-semibold text-[#8ea0b6]">
              {bet.selections_count} {bet.selections_count === 1 ? "Selection" : "Selections"}
            </span>
          </div>

          {bet.is_live && (
            <span className="inline-flex items-center gap-1.5 text-[#22c55e] text-[10px] font-bold uppercase tracking-widest">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e]" />
              Live
            </span>
          )}
        </div>
      </div>

      {bet.is_cancellable ? (
        <div className="mt-3 border-t border-[#1e3350]/20 pt-3">
          <CancellationTimer cancellableUntil={bet.cancellable_until} />
        </div>
      ) : null}
    </button>
  );
}
