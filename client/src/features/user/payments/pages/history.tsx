import { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDateTime,
  formatMoney,
  titleCase,
  type TransactionStatus,
  type TransactionType,
} from "../data";
import { useWalletSummary } from "../wallet";

export default function PaymentsHistoryPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TransactionStatus>(
    "all",
  );
  const { data, refetch, isFetching } = useWalletSummary();
  const transactions = data?.transactions ?? [];

  const filtered = useMemo(() => {
    return transactions.filter((item) => {
      const queryValue = query.trim().toLowerCase();
      const matchesQuery =
        queryValue.length === 0 ||
        item.id.toLowerCase().includes(queryValue) ||
        item.reference.toLowerCase().includes(queryValue) ||
        item.channel.toLowerCase().includes(queryValue) ||
        (item.mpesaCode ?? "").toLowerCase().includes(queryValue);
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [query, statusFilter, typeFilter]);

  const totalIn = filtered
    .filter((item) =>
      ["deposit", "bet-win", "refund", "bonus"].includes(item.type),
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const totalOut = filtered
    .filter((item) => ["withdrawal", "bet-stake"].includes(item.type))
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="grid gap-2 sm:gap-4">
      <article className="rounded-2xl border border-[#23384f] bg-[#111d2e] p-2 sm:p-3">
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative lg:col-span-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-3.5 text-admin-text-muted"
            />
            <Input
              placeholder="Search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 rounded-lg border border-[#294157] bg-[#0f1a2a] pl-9 text-sm text-admin-text-primary placeholder:text-[#8a9bb0] transition focus:border-[#f5c518] focus:shadow-[0_0_0_2px_rgba(245,197,24,0.2)] focus:outline-none"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter(value as "all" | TransactionType)
            }
          >
            <SelectTrigger className="h-9 w-full rounded-lg border border-[#294157] bg-[#0f1a2a] text-sm font-medium text-admin-text-primary transition hover:border-[#f5c518]/60 focus:border-[#f5c518] focus:shadow-[0_0_0_2px_rgba(245,197,24,0.2)] focus:outline-none">
              <SelectValue
                placeholder="Type"
                className="text-admin-text-primary text-sm"
              />
            </SelectTrigger>
            <SelectContent className="border-[#23384f] bg-[#111d2e] text-admin-text-primary">
              <SelectItem value="all" className="hover:bg-admin-accent-dim">
                All types
              </SelectItem>
              <SelectItem value="deposit" className="hover:bg-admin-accent-dim">
                Deposit
              </SelectItem>
              <SelectItem
                value="withdrawal"
                className="hover:bg-admin-accent-dim"
              >
                Withdrawal
              </SelectItem>
              <SelectItem
                value="bet-stake"
                className="hover:bg-admin-accent-dim"
              >
                Bet stake
              </SelectItem>
              <SelectItem value="bet-win" className="hover:bg-admin-accent-dim">
                Bet win
              </SelectItem>
              <SelectItem value="refund" className="hover:bg-admin-accent-dim">
                Refund
              </SelectItem>
              <SelectItem value="bonus" className="hover:bg-admin-accent-dim">
                Bonus
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as "all" | TransactionStatus)
            }
          >
            <SelectTrigger className="h-9 w-full rounded-lg border border-[#294157] bg-[#0f1a2a] text-sm font-medium text-admin-text-primary transition hover:border-[#f5c518]/60 focus:border-[#f5c518] focus:shadow-[0_0_0_2px_rgba(245,197,24,0.2)] focus:outline-none">
              <SelectValue
                placeholder="Status"
                className="text-admin-text-primary text-sm"
              />
            </SelectTrigger>
            <SelectContent className="border-[#23384f] bg-[#111d2e] text-admin-text-primary">
              <SelectItem value="all" className="hover:bg-admin-accent-dim">
                All statuses
              </SelectItem>
              <SelectItem
                value="completed"
                className="hover:bg-admin-accent-dim"
              >
                Completed
              </SelectItem>
              <SelectItem value="pending" className="hover:bg-admin-accent-dim">
                Pending
              </SelectItem>
              <SelectItem value="failed" className="hover:bg-admin-accent-dim">
                Failed
              </SelectItem>
              <SelectItem
                value="reversed"
                className="hover:bg-admin-accent-dim"
              >
                Reversed
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </article>

      <div className="grid gap-2 sm:grid-cols-3">
        <article className="rounded-xl border border-[#23384f] bg-[#101b2b] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.08em] text-admin-text-muted font-semibold">
            Records
          </p>
          <p className="mt-1 text-lg sm:text-2xl font-bold text-admin-text-primary">
            {filtered.length}
          </p>
        </article>
        <article className="rounded-xl border border-[#23384f] bg-[#101b2b] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.08em] text-admin-text-muted font-semibold">
            In
          </p>
          <p className="mt-1 text-lg sm:text-2xl font-bold text-green-400">
            {formatMoney(totalIn)}
          </p>
        </article>
        <article className="rounded-xl border border-[#23384f] bg-[#101b2b] p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.08em] text-admin-text-muted font-semibold">
            Out
          </p>
          <p className="mt-1 text-lg sm:text-2xl font-bold text-yellow-400">
            {formatMoney(totalOut)}
          </p>
        </article>
      </div>

      <article className="overflow-x-auto rounded-2xl border border-[#23384f] bg-[#111d2e] p-2 sm:p-4">
        <div className="min-w-full">
          <Table>
            <TableHeader>
              <TableRow className="border-admin-border hover:bg-transparent">
                <TableHead className="text-admin-text-muted text-center w-12">
                  No.
                </TableHead>
                <TableHead className="text-admin-text-muted">Type</TableHead>
                <TableHead className="text-admin-text-muted">
                  Provider Ref
                </TableHead>
                <TableHead className="text-admin-text-muted text-right">
                  Amount
                </TableHead>
                <TableHead className="text-admin-text-muted text-center">
                  Status
                </TableHead>
                <TableHead className="text-admin-text-muted text-right">
                  Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8">
                    <div className="mx-auto max-w-xl rounded-2xl border border-[#23384f] bg-[linear-gradient(165deg,#0d2147,#091a36)] p-5 text-center">
                      <p className="text-xl font-semibold text-white">
                        {transactions.length === 0
                          ? "No transactions yet"
                          : "No matches found"}
                      </p>
                      <p className="mt-1 text-sm text-blue-200/85">
                        {transactions.length === 0
                          ? "Start by making your first deposit or bet"
                          : "Try adjusting your filters"}
                      </p>
                      <Button
                        type="button"
                        className="mt-4 h-9 rounded-lg bg-[#f5c518] px-4 text-xs font-semibold text-black hover:bg-[#e4b90f]"
                        disabled={isFetching}
                        onClick={() => {
                          void refetch();
                        }}
                      >
                        <RefreshCw
                          className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
                        />
                        Refresh
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item, index) => (
                  <TableRow
                    key={item.id}
                    className="border-admin-border hover:bg-admin-hover/60 transition-colors"
                  >
                    <TableCell className="text-admin-text-muted text-center font-medium w-12">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-admin-text-secondary">
                      <span className="inline-block px-2 py-1 rounded-md bg-admin-surface text-sm font-medium">
                        {titleCase(item.type)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-admin-accent">
                      {item.mpesaCode ? (
                        <span className="rounded bg-[#0f1a2a] px-2 py-1 text-sm">
                          {item.mpesaCode}
                        </span>
                      ) : (
                        <span className="text-admin-text-muted">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-admin-text-secondary text-right font-semibold">
                      {formatMoney(item.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          item.status === "completed"
                            ? "border-green-700 bg-green-900/20 text-green-400 text-xs font-semibold"
                            : item.status === "pending"
                              ? "border-yellow-700 bg-yellow-900/20 text-yellow-400 text-xs font-semibold"
                              : item.status === "failed"
                                ? "border-red-700 bg-red-900/20 text-red-400 text-xs font-semibold"
                                : "border-admin-border bg-admin-accent/20 text-admin-accent text-xs font-semibold"
                        }
                      >
                        {titleCase(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-admin-text-muted text-right text-sm whitespace-nowrap">
                      {formatDateTime(item.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </article>
    </section>
  );
}
