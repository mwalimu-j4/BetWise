import { useMemo, useState } from "react";
import { ArrowLeft, CircleAlert, Info } from "lucide-react";
import { MatchSelectionCard } from "./MatchSelectionCard";
import type { BetDetail } from "@/features/user/components/hooks/useBetDetail";

function formatMoney(value: number) {
  return `KES ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type BetDetailModalProps = {
  bet: BetDetail;
  integrityError: boolean;
  onClose: () => void;
  onCancel: () => void;
  isCancelling: boolean;
};

export function BetDetailModal({
  bet,
  integrityError,
  onClose,
  onCancel,
  isCancelling,
}: BetDetailModalProps) {
  const [collapsed, setCollapsed] = useState(false);

  const statusClass = useMemo(() => {
    if (bet.status === "won") {
      return "bg-[#22c55e]";
    }

    if (bet.status === "lost") {
      return "bg-[#ef4444]";
    }

    if (bet.status === "bonus") {
      return "bg-[#F5C518] text-[#111827]";
    }

    if (bet.status === "open") {
      return "bg-[#3b82f6]";
    }

    return "bg-[#64748b]";
  }, [bet.status]);

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-transparent p-4 text-white sm:p-6">
      <header className="sticky top-0 z-10 -mx-4 -mt-4 flex items-center justify-between border-b border-[#1e3350]/50 bg-[#0d1624]/80 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:-mt-6 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-[#c6d6ea] transition hover:bg-[#1e3350]/50 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {bet.match_name && (
          <h2 className="hidden sm:block text-sm font-bold text-white px-2 truncate max-w-[200px]">
            {bet.match_name}
          </h2>
        )}
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm ${statusClass}`}
        >
          {bet.status}
        </span>
      </header>

      <div className="mt-4 space-y-4">
        {bet.promoted_text ? (
          <p className="rounded-lg border border-[#4e4220] bg-[#2c260f] px-3 py-2 text-xs text-[#f5d569]">
            {bet.promoted_text}
          </p>
        ) : null}

        {integrityError ? (
          <p className="inline-flex items-center gap-2 rounded-lg border border-[#7f1d1d] bg-[#2b1111] px-3 py-2 text-xs text-[#fca5a5]">
            <CircleAlert size={14} />
            Data integrity error
          </p>
        ) : null}

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#131f33] to-[#0f1a2d] p-3 shadow-inner">
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#6b86a8]">Amount</p>
            <p className="mt-1 text-sm sm:text-base font-extrabold text-white">
              {formatMoney(bet.amount)}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#131f33] to-[#0f1a2d] p-3 shadow-inner">
            <p className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#6b86a8]">
              Payout <Info size={12} className="text-[#4a6382]" />
            </p>
            <p className="mt-1 text-sm sm:text-base font-extrabold text-[#f8fafc]">
              {formatMoney(bet.possible_payout)}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#131f33] to-[#0f1a2d] p-3 shadow-inner">
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#6b86a8]">W/L/T</p>
            <p className="mt-1 text-sm sm:text-base font-extrabold text-white">
              {bet.wlt.won}/{bet.wlt.lost}/{bet.wlt.tie}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#1e3350]/50 bg-[#0d1624]/60 px-4 py-3 shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-[#9db0c8]">ID: <span className="text-white font-mono">{bet.bet_code}</span> • Intention Odds</p>
          <p className="text-lg font-black text-[#f5c518]">
            {bet.total_odds.toFixed(2)}x
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="rounded-full border border-[#1e3350] bg-[#111d2e] px-4 py-1.5 text-xs font-semibold text-[#c6d6ea] transition hover:bg-[#1a2b42] hover:text-white"
          >
            {collapsed ? "Expand All Selections" : "Collapse All"}
          </button>

          {bet.status === "open" ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={isCancelling}
              className="rounded-full bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {isCancelling ? "Cancelling..." : "Cancel Bet"}
            </button>
          ) : null}
        </div>

        {!collapsed ? (
          <div className="space-y-3 pt-2">
            {bet.selections.map((selection) => (
              <div key={`${selection.event_id}-${selection.pick}`} className="rounded-xl border border-[#1e3350]/30 shadow-sm overflow-hidden">
                <MatchSelectionCard
                  selection={selection}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
