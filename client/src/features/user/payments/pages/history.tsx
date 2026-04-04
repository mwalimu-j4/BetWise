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
  transactions,
  type TransactionStatus,
  type TransactionType,
} from "../data";

export default function PaymentsHistoryPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TransactionStatus>(
    "all",
  );

  const filtered = useMemo(() => {
    return transactions.filter((item) => {
      const queryValue = query.trim().toLowerCase();
      const matchesQuery =
        queryValue.length === 0 ||
        item.id.toLowerCase().includes(queryValue) ||
        item.reference.toLowerCase().includes(queryValue) ||
        item.channel.toLowerCase().includes(queryValue);
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
        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-3.5 text-admin-text-muted"
            />
            <Input
              placeholder="Search by ID, reference, or channel"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 rounded-xl border border-admin-border bg-[rgba(15,76,117,0.65)] pl-9 text-admin-text-primary placeholder:text-admin-text-muted focus:border-admin-accent/35 focus:shadow-[0_0_0_3px_rgba(249,168,38,0.12)] focus:outline-none transition"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter(value as "all" | TransactionType)
            }
          >
            <SelectTrigger className="h-10 w-full rounded-xl border border-admin-border bg-[rgba(15,76,117,0.65)] text-admin-text-primary font-medium hover:border-admin-accent/35 focus:border-admin-accent/35 focus:shadow-[0_0_0_3px_rgba(249,168,38,0.12)] focus:outline-none transition">
              <SelectValue
                placeholder="All types"
                className="text-admin-text-primary"
              />
            </SelectTrigger>
            <SelectContent className="border-admin-border bg-[rgba(15,76,117,0.98)] text-admin-text-primary">
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
            <SelectTrigger className="h-10 w-full rounded-xl border border-admin-border bg-[rgba(15,76,117,0.65)] text-admin-text-primary font-medium hover:border-admin-accent/35 focus:border-admin-accent/35 focus:shadow-[0_0_0_3px_rgba(249,168,38,0.12)] focus:outline-none transition">
              <SelectValue
                placeholder="All statuses"
                className="text-admin-text-primary"
              />
            </SelectTrigger>
            <SelectContent className="border-admin-border bg-[rgba(15,76,117,0.98)] text-admin-text-primary">
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

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-admin-border bg-[rgba(15,76,117,0.45)] p-3">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
            Records
          </p>
          <p className="mt-1 text-xl font-bold text-admin-text-primary">
            {filtered.length}
          </p>
        </article>
        <article className="rounded-2xl border border-admin-border bg-[rgba(15,76,117,0.45)] p-3">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
            Total Incoming
          </p>
          <p className="mt-1 text-xl font-bold text-admin-accent">
            {formatMoney(totalIn)}
          </p>
        </article>
        <article className="rounded-2xl border border-admin-border bg-[rgba(15,76,117,0.45)] p-3">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
            Total Outgoing
          </p>
          <p className="mt-1 text-xl font-bold text-admin-gold">
            {formatMoney(totalOut)}
          </p>
        </article>
      </div>

      <article className="rounded-2xl border border-admin-border bg-admin-card p-4">
        <Table>
          <TableHeader>
            <TableRow className="border-admin-border hover:bg-transparent">
              <TableHead className="text-admin-text-muted">
                Transaction ID
              </TableHead>
              <TableHead className="text-admin-text-muted">Type</TableHead>
              <TableHead className="text-admin-text-muted">Channel</TableHead>
              <TableHead className="text-admin-text-muted">Amount</TableHead>
              <TableHead className="text-admin-text-muted">Status</TableHead>
              <TableHead className="text-admin-text-muted">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow
                key={item.id}
                className="border-admin-border hover:bg-admin-hover/60"
              >
                <TableCell className="font-medium text-admin-text-primary">
                  {item.id}
                </TableCell>
                <TableCell className="text-admin-text-secondary">
                  {titleCase(item.type)}
                </TableCell>
                <TableCell className="text-admin-text-secondary">
                  {item.channel}
                </TableCell>
                <TableCell className="text-admin-text-secondary">
                  {formatMoney(item.amount)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="border-admin-border text-admin-text-secondary"
                  >
                    {titleCase(item.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-admin-text-muted">
                  {formatDateTime(item.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </article>
    </section>
  );
}


