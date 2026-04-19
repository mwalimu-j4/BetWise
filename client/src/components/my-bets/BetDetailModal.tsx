import type { BetDetail } from "@/features/user/components/hooks/useBetDetail";
import { CircleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MatchSelectionCard } from "./MatchSelectionCard";

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
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Ensure this only renders on the client side to access document.body
  useEffect(() => {
    setMounted(true);

    // Optional: Prevent background scrolling when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const statusClass = useMemo(() => {
    if (bet.status === "won") return "bg-[#22c55e]";
    if (bet.status === "lost") return "bg-[#ef4444]";
    if (bet.status === "bonus") return "bg-[#F5C518] text-[#111827]";
    if (bet.status === "open") return "bg-[#3b82f6]";
    return "bg-[#64748b]";
  }, [bet.status]);

  if (!mounted) return null;

  // createPortal teleports this entirely out of the parent container
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6">
      <div className="relative w-full max-w-xl flex-col rounded-2xl border border-[#1e3350] bg-[#0d1624] shadow-2xl">
        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-[#1e3350]/50 bg-[#0d1624]/95 px-5 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm ${statusClass}`}
            >
              {bet.status}
            </span>
            {bet.match_name && (
              <h2 className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-[250px] uppercase">
                {bet.match_name}
                {bet.selections.length === 1 &&
                  bet.selections[0].ft_result &&
                  bet.selections[0].ft_result !== "-" && (
                    <span className="ml-2 text-[#f5c518]">
                      ({bet.selections[0].ft_result})
                    </span>
                  )}
              </h2>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#c6d6ea] transition-colors hover:bg-[#1e3350]/50 hover:text-white"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </header>

        {/* CONTENT BODY */}
        <div className="p-5 text-white">
          <div className="space-y-5">
            {/* ALERTS */}
            {bet.promoted_text && (
              <p className="rounded-lg border border-[#4e4220] bg-[#2c260f] px-4 py-3 text-sm text-[#f5d569]">
                {bet.promoted_text}
              </p>
            )}

            {integrityError && (
              <p className="inline-flex items-center gap-2 rounded-lg border border-[#7f1d1d] bg-[#2b1111] px-4 py-3 text-sm text-[#fca5a5]">
                <CircleAlert size={16} />
                Data integrity error
              </p>
            )}

            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#131f33] to-[#0f1a2d] p-3 shadow-inner">
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#6b86a8]">
                  Stake
                </p>
                <p className="mt-1 text-sm sm:text-base font-extrabold text-white">
                  {formatMoney(bet.amount)}
                </p>
              </div>
              <div className="rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#131f33] to-[#0f1a2d] p-3 shadow-inner">
                <p className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#6b86a8]">
                  {bet.status === "won"
                    ? "Total Payout"
                    : bet.status === "lost"
                      ? "Lost"
                      : "Possible Payout"}{" "}
                </p>
                <p className="mt-1 text-sm sm:text-base font-extrabold text-[#f8fafc]">
                  {formatMoney(bet.possible_payout)}
                </p>
              </div>
              <div className="rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#131f33] to-[#0f1a2d] p-3 shadow-inner">
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#6b86a8]">
                  Total Odds
                </p>
                <p className="mt-1 text-sm sm:text-base font-extrabold text-[#f5c518]">
                  {bet.total_odds.toFixed(2)}x
                </p>
              </div>
            </div>



            {/* ACTIONS ROW */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCollapsed((current) => !current)}
                className="rounded-full border border-[#1e3350] bg-[#111d2e] px-4 py-2 text-xs font-semibold text-[#c6d6ea] transition hover:bg-[#1a2b42] hover:text-white"
              >
                {collapsed ? "Expand All Selections" : "Collapse All"}
              </button>

              {bet.status === "open" && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isCancelling}
                  className="rounded-full bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {isCancelling ? "Cancelling..." : "Cancel Bet"}
                </button>
              )}
            </div>

            {/* SELECTIONS LIST */}
            {!collapsed && (
              <div className="space-y-3 pt-2">
                {bet.selections.map((selection) => (
                  <div
                    key={`${selection.event_id}-${selection.pick}`}
                    className="rounded-xl border border-[#1e3350]/30 shadow-sm overflow-hidden"
                  >
                    <MatchSelectionCard selection={selection} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body, // This is the magic part that breaks it out of your layout
  );
}
