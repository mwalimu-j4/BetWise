import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { RefreshCcw } from "lucide-react";
import { formatMoney } from "@/features/user/payments/data";
import type { ProfileTransaction } from "@/hooks/useProfile";

type TransactionPreviewProps = {
  transactions: ProfileTransaction[];
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
};

function TransactionPreviewComponent({
  transactions,
  isLoading,
  isRefreshing,
  onRefresh,
}: TransactionPreviewProps) {
  return (
    <section className="rounded-2xl border border-[#31455f] bg-[#0f172a] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">My Transactions</h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 text-xs text-[#f5c518]"
          >
            <RefreshCcw
              size={12}
              className={isRefreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
          <Link to="/user/payments/history" className="text-xs text-[#f5c518]">
            View All
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`tx-skeleton-${index}`}
              className="h-14 animate-pulse rounded-lg border border-[#31455f] bg-[#0f172a]"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-[#31455f] p-3 text-xs text-[#8a9bb0]">
          No transactions yet.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {transactions.map((entry) => (
            <article
              key={entry.reference}
              className="rounded-lg border border-[#31455f] bg-[#0f172a] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-[#8a9bb0]">
                    {entry.type.replace("-", " ")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatMoney(entry.amount)}
                  </p>
                  <p className="mt-1 text-[11px] text-[#8a9bb0]">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    entry.status === "completed"
                      ? "bg-[#22c55e]/20 text-[#86efac]"
                      : entry.status === "pending"
                        ? "bg-[#f5c518]/20 text-[#fde68a]"
                        : "bg-[#ef4444]/20 text-[#fecaca]"
                  }`}
                >
                  {entry.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const TransactionPreview = memo(TransactionPreviewComponent);

export default TransactionPreview;
