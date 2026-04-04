import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const { data } = useWalletSummary();
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
    <section className="grid gap-4">
      <article className="rounded-2xl border border-admin-border bg-admin-card p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr] lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative md:col-span-3 lg:col-span-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-3.5 text-admin-text-muted"
            />
            <Input
              placeholder="Search by ID, reference, or channel"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 rounded-xl border border-admin-border bg-admin-surface pl-9 text-admin-text-primary placeholder:text-admin-text-muted focus:border-admin-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)] focus:outline-none transition"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter(value as "all" | TransactionType)
            }
          >
            <SelectTrigger className="h-10 w-full rounded-xl border border-admin-border bg-admin-surface text-admin-text-primary font-medium hover:border-admin-accent focus:border-admin-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)] focus:outline-none transition">
              <SelectValue
                placeholder="All types"
                className="text-admin-text-primary"
              />
            </SelectTrigger>
            <SelectContent className="border-admin-border bg-admin-card text-admin-text-primary">
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
            <SelectTrigger className="h-10 w-full rounded-xl border border-admin-border bg-admin-surface text-admin-text-primary font-medium hover:border-admin-accent focus:border-admin-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)] focus:outline-none transition">
              <SelectValue
                placeholder="All statuses"
                className="text-admin-text-primary"
              />
            </SelectTrigger>
            <SelectContent className="border-admin-border bg-admin-card text-admin-text-primary">
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl border border-admin-border bg-admin-surface p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted font-semibold">
            Total Records
          </p>
          <p className="mt-2 text-2xl font-bold text-admin-text-primary">
            {filtered.length}
          </p>
        </article>
        <article className="rounded-2xl border border-admin-border bg-admin-surface p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted font-semibold">
            Total In
          </p>
          <p className="mt-2 text-2xl font-bold text-green-400">
            {formatMoney(totalIn)}
          </p>
        </article>
        <article className="rounded-2xl border border-admin-border bg-admin-surface p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted font-semibold">
            Total Out
          </p>
          <p className="mt-2 text-2xl font-bold text-yellow-400">
            {formatMoney(totalOut)}
          </p>
        </article>
      </div>

      <article className="rounded-2xl border border-admin-border bg-admin-card p-4 overflow-x-auto">
        <div className="min-w-full">
          <Table>
            <TableHeader>
              <TableRow className="border-admin-border hover:bg-transparent">
                <TableHead className="text-admin-text-muted text-center w-12">No.</TableHead>
                <TableHead className="text-admin-text-muted">Type</TableHead>
                <TableHead className="text-admin-text-muted">M-Pesa Code</TableHead>
                <TableHead className="text-admin-text-muted text-right">Amount</TableHead>
                <TableHead className="text-admin-text-muted text-center">Status</TableHead>
                <TableHead className="text-admin-text-muted text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-admin-text-muted py-8">
                    No transactions found
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
                    <TableCell className="text-admin-text-secondary font-mono font-bold text-admin-accent">
                      {item.mpesaCode ? (
                        <span className="bg-admin-surface px-2 py-1 rounded text-sm">{item.mpesaCode}</span>
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
