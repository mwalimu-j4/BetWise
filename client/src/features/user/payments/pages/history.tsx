import { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import {
  formatDateTime,
  formatMoney,
  titleCase,
  type TransactionStatus,
} from "../data";
import { useWalletSummary } from "../wallet";

const STATUS_STYLES: Record<TransactionStatus, string> = {
  completed: "border-green-500/30 bg-green-500/10 text-green-400",
  pending: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  failed: "border-red-500/30 bg-red-500/10 text-red-400",
  reversed: "border-[#1a2f45] bg-[#0d1829] text-[#4a6a85]",
};

const TYPE_FILTERS = [
  "all",
  "deposit",
  "withdrawal",
  "bet-stake",
  "bet-win",
  "refund",
  "bonus",
] as const;
type FilterOption = (typeof TYPE_FILTERS)[number];

const TYPE_COLORS: Record<string, string> = {
  deposit: "text-green-400",
  "bet-win": "text-green-400",
  refund: "text-green-400",
  bonus: "text-green-400",
  withdrawal: "text-red-400",
  "bet-stake": "text-red-400",
};

export default function PaymentsHistoryPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterOption>("all");
  const { data, refetch, isFetching } = useWalletSummary();
  const transactions = data?.transactions ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((item) => {
      const matchesQuery =
        q.length === 0 ||
        item.id.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        item.channel.toLowerCase().includes(q) ||
        (item.mpesaCode ?? "").toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [query, typeFilter, transactions]);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <article className="mx-auto w-full max-w-[860px] overflow-hidden rounded-3xl border border-[#1a2f45] bg-[#0b1421] shadow-2xl">
        <div className="border-b border-[#1a2f45] bg-[#0d1829] px-6 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  Transaction History
                </h2>
                <p className="text-xs text-[#4a6a85]">
                  Review deposits, withdrawals, wins, and balance movement
                </p>
              </div>
              <div className="rounded-2xl border border-[#23415d] bg-[#08111d] px-4 py-3 text-left shadow-[0_18px_40px_rgba(4,12,22,0.35)] sm:min-w-[160px]">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-[#69839c]">
                  Filtered Results
                </span>
                <span className="mt-1 block text-sm font-semibold text-white">
                  {filtered.length} item{filtered.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3d5a73]"
                />
                <input
                  placeholder="Search by reference, code..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-[#1a2f45] bg-[#08111d] pl-9 pr-4 text-sm text-white outline-none placeholder:text-[#2e4a63] transition-colors focus:border-[#f5c518]"
                />
              </div>
              <button
                type="button"
                onClick={() => void refetch()}
                className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#1a2f45] bg-[#08111d] px-4 text-xs font-medium text-[#4a6a85] transition hover:border-[#f5c518]/30 hover:text-white"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTypeFilter(f)}
                  className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-all ${
                    typeFilter === f
                      ? "border-[#f5c518] bg-[#f5c518]/10 text-[#f5c518]"
                      : "border-[#1a2f45] bg-[#08111d] text-[#4a6a85] hover:border-[#f5c518]/20 hover:text-white"
                  }`}
                >
                  {f === "all" ? "All" : titleCase(f)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1a2f45] bg-[#0d1829] py-16 text-center">
              <p className="text-sm font-semibold text-[#4a6a85]">
                {transactions.length === 0
                  ? "No transactions yet"
                  : "No matches found"}
              </p>
              <p className="mt-1 text-xs text-[#2e4a63]">
                {transactions.length === 0
                  ? "Make a deposit to get started"
                  : "Try a different search or filter"}
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[#1a2f45]">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 px-6 py-4 transition hover:bg-[#0d1829] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-bold ${TYPE_COLORS[item.type] ?? "text-white"}`}
                    >
                      {titleCase(item.type)}
                    </span>
                    <span className="rounded-md border border-[#1a2f45] bg-[#08111d] px-2 py-0.5 font-mono text-[10px] text-[#4a6a85]">
                      {item.reference}
                    </span>
                    {item.mpesaCode && (
                      <span className="rounded-md border border-[#1a2f45] bg-[#08111d] px-2 py-0.5 font-mono text-[10px] text-[#4a6a85]">
                        {item.mpesaCode}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#3d5a73]">
                    {formatDateTime(item.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-[#4a6a85]">{item.channel}</p>
                </div>

                <div className="flex flex-shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <span
                    className={`text-sm font-bold ${TYPE_COLORS[item.type] ?? "text-white"}`}
                  >
                    {["withdrawal", "bet-stake"].includes(item.type) ? "-" : "+"}
                    {formatMoney(item.amount)}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[item.status as TransactionStatus] ?? ""}`}
                  >
                    {item.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
