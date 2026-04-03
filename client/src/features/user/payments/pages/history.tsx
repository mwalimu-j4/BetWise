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
  const [statusFilter, setStatusFilter] = useState<"all" | TransactionStatus>("all");

  const filtered = useMemo(() => {
    return transactions.filter((item) => {
      const queryValue = query.trim().toLowerCase();
      const matchesQuery =
        queryValue.length === 0 ||
        item.id.toLowerCase().includes(queryValue) ||
        item.reference.toLowerCase().includes(queryValue) ||
        item.channel.toLowerCase().includes(queryValue);
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [query, statusFilter, typeFilter]);

  const totalIn = filtered
    .filter((item) => ["deposit", "bet-win", "refund", "bonus"].includes(item.type))
    .reduce((sum, item) => sum + item.amount, 0);
  const totalOut = filtered
    .filter((item) => ["withdrawal", "bet-stake"].includes(item.type))
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="grid gap-4">
      <article className="rounded-2xl border border-admin-border bg-admin-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-3.5 text-admin-text-muted" />
            <Input
              placeholder="Search by ID, reference, or channel"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 rounded-xl border-admin-border bg-[rgba(22,29,53,0.65)] pl-9 text-admin-text-primary placeholder:text-admin-text-muted"
            />
          </div>

          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | TransactionType)}>
            <SelectTrigger className="h-10 w-full rounded-xl border-admin-border bg-[rgba(22,29,53,0.65)] text-admin-text-primary">
              <SelectValue placeholder="Transaction type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
              <SelectItem value="bet-stake">Bet stake</SelectItem>
              <SelectItem value="bet-win">Bet win</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | TransactionStatus)}>
            <SelectTrigger className="h-10 w-full rounded-xl border-admin-border bg-[rgba(22,29,53,0.65)] text-admin-text-primary">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="reversed">Reversed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </article>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.45)] p-3">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">Records</p>
          <p className="mt-1 text-xl font-bold text-admin-text-primary">{filtered.length}</p>
        </article>
        <article className="rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.45)] p-3">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">Total Incoming</p>
          <p className="mt-1 text-xl font-bold text-admin-accent">{formatMoney(totalIn)}</p>
        </article>
        <article className="rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.45)] p-3">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">Total Outgoing</p>
          <p className="mt-1 text-xl font-bold text-admin-gold">{formatMoney(totalOut)}</p>
        </article>
      </div>

      <article className="rounded-2xl border border-admin-border bg-admin-card p-4">
        <Table>
          <TableHeader>
            <TableRow className="border-admin-border hover:bg-transparent">
              <TableHead className="text-admin-text-muted">Transaction ID</TableHead>
              <TableHead className="text-admin-text-muted">Type</TableHead>
              <TableHead className="text-admin-text-muted">Channel</TableHead>
              <TableHead className="text-admin-text-muted">Amount</TableHead>
              <TableHead className="text-admin-text-muted">Status</TableHead>
              <TableHead className="text-admin-text-muted">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id} className="border-admin-border hover:bg-admin-hover/60">
                <TableCell className="font-medium text-admin-text-primary">{item.id}</TableCell>
                <TableCell className="text-admin-text-secondary">{titleCase(item.type)}</TableCell>
                <TableCell className="text-admin-text-secondary">{item.channel}</TableCell>
                <TableCell className="text-admin-text-secondary">{formatMoney(item.amount)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-admin-border text-admin-text-secondary">
                    {titleCase(item.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-admin-text-muted">{formatDateTime(item.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </article>
    </section>
  );
}
