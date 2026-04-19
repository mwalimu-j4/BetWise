import { useEffect, useRef, useState } from "react";
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BetCard({ bet, onClick }: BetCardProps) {
  const previousStatus = useRef<MyBetListItem["status"]>(bet.status);
  const [flashStatus, setFlashStatus] = useState(false);

  useEffect(() => {
    if (previousStatus.current !== bet.status) {
      setFlashStatus(true);
      const timer = window.setTimeout(() => setFlashStatus(false), 900);
      previousStatus.current = bet.status;
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [bet.status]);

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

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold text-white transition-colors group-hover:text-amber-400">
            #{bet.bet_code}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClassByStatus[bet.status]} ${
              flashStatus ? "animate-[statusPulse_0.9s_ease-out]" : ""
            }`}
          >
            {bet.status}
          </span>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-[#f8fafc]">
            {formatMoney(bet.possible_payout)}
          </p>
          <p className="mt-1 text-[10px] font-medium text-[#6b86a8]">
            {formatDate(bet.placed_at)}
          </p>
          {bet.status === "lost" ? (
            <p className="mt-1 text-xs font-semibold text-[#ef4444]">Lost</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8ea0b6]">
        <span className="inline-flex items-center gap-1">
          <CalendarClock size={14} />
          {bet.selections_count} selection{bet.selections_count > 1 ? "s" : ""}
        </span>
        {bet.is_live ? (
          <span className="inline-flex items-center gap-1 text-[#22c55e]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#22c55e]" />
            Live
          </span>
        ) : null}
      </div>

      {bet.is_cancellable ? (
        <div className="mt-2">
          <CancellationTimer cancellableUntil={bet.cancellable_until} />
        </div>
      ) : null}
    </button>
  );
}
