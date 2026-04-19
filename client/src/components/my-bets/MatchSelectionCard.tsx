import type { BetSelectionDetail } from "@/features/user/components/hooks/useBetDetail";

const statusDotClass: Record<BetSelectionDetail["status"], string> = {
  won: "bg-[#22c55e]",
  lost: "bg-[#ef4444]",
  pending: "bg-[#f59e0b]",
  live: "bg-[#22c55e] animate-pulse",
  cancelled: "bg-[#64748b]",
};

type MatchSelectionCardProps = {
  selection: BetSelectionDetail;
};

export function MatchSelectionCard({ selection }: MatchSelectionCardProps) {
  return (
    <article className="rounded-xl border border-[#2b3a4f] bg-[#1a2332] p-3">
      <div className="flex items-center justify-between gap-2 border-b border-[#2b3a4f]/50 pb-2 mb-2">
        <p className="truncate text-sm font-bold text-white uppercase">
          {selection.home_team} vs {selection.away_team}
          {(selection.ft_result && selection.ft_result !== "-") && (
            <span className="ml-2 text-[#f5c518]">
              ({selection.ft_result})
            </span>
          )}
        </p>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${statusDotClass[selection.status]} text-white`}
        >
          {selection.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-[#9fb1c8]">
        <div>
          <p className="text-[9px] uppercase font-bold text-[#6b86a8]">Market</p>
          <p className="text-white">{selection.market_type}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase font-bold text-[#6b86a8]">Pick</p>
          <p className="text-white">{selection.pick}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase font-bold text-[#6b86a8]">Odds</p>
          <p className="text-[#f5c518] font-bold">{selection.odds.toFixed(2)}</p>
        </div>
        {selection.ft_result && selection.ft_result !== "-" && (
          <div>
            <p className="text-[9px] uppercase font-bold text-[#6b86a8]">Score</p>
            <p className="text-white">{selection.ft_result}</p>
          </div>
        )}
      </div>

      {selection.live_score && (
        <div className="mt-2 pt-2 border-t border-[#2b3a4f]/30 inline-flex items-center gap-1.5 text-[#22c55e] text-[10px] font-bold">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e]" />
          LIVE: {selection.live_score}
        </div>
      )}
    </article>
  );
}
