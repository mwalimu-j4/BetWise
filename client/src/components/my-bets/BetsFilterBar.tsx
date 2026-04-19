import type { MyBetFilter } from "@/features/user/components/hooks/useMyBets";

type BetsFilterBarProps = {
  filter: MyBetFilter;
  hideLost: boolean;
  onFilterChange: (filter: MyBetFilter) => void;
  onHideLostChange: (value: boolean) => void;
  lastUpdated: string;
};

const filterOptions: Array<{ label: string; value: MyBetFilter }> = [
  { label: "All Bets", value: "all" },
  { label: "Active", value: "active" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
];

export function BetsFilterBar({
  filter,
  hideLost,
  onFilterChange,
  onHideLostChange,
  lastUpdated,
}: BetsFilterBarProps) {
  return (
    <div className="sticky top-[52px] z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#1e3350]/50 bg-gradient-to-br from-[#111d2e]/95 via-[#0f1a2d]/95 to-[#0d1624]/95 p-4 shadow-xl backdrop-blur">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">My Bets</h1>
        <p className="mt-1 text-xs text-[#8ea0b6]">
          Betting history • Updated {lastUpdated}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2">
          <span className="text-xs text-[#8ea0b6]">Filter</span>
          <select
            value={filter}
            onChange={(event) =>
              onFilterChange(event.target.value as MyBetFilter)
            }
            className="rounded-lg border border-[#2b3a4f] bg-[#111827] px-3 py-2 text-sm text-white outline-none"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onHideLostChange(!hideLost)}
          className="inline-flex items-center gap-2"
          aria-pressed={hideLost}
        >
          <span className="text-xs text-[#8ea0b6]">Hide Lost Bets</span>
          <span
            className={`relative h-6 w-11 rounded-full transition ${
              hideLost ? "bg-[#22c55e]" : "bg-[#334155]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                hideLost ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}
