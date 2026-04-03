import { Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, ReceiptText, Wallet2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  walletSummary,
} from "../data";

export default function PaymentsOverviewPage() {
  const recentTransactions = transactions.slice(0, 5);

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.5)] p-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">Main Balance</p>
          <p className="mt-2 text-2xl font-bold text-admin-accent">{formatMoney(walletSummary.balance)}</p>
        </article>
        <article className="rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.5)] p-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">Bonus Balance</p>
          <p className="mt-2 text-2xl font-bold text-admin-gold">{formatMoney(walletSummary.bonusBalance)}</p>
        </article>
        <article className="rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.5)] p-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">Locked In Open Bets</p>
          <p className="mt-2 text-2xl font-bold text-admin-blue">{formatMoney(walletSummary.lockedForOpenBets)}</p>
        </article>
        <article className="rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.5)] p-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">Monthly Net Cash Flow</p>
          <p className="mt-2 text-2xl font-bold text-admin-text-primary">
            {formatMoney(
              walletSummary.totalDepositsThisMonth - walletSummary.totalWithdrawalsThisMonth,
            )}
          </p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-admin-border bg-admin-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-admin-text-primary">Recent Transactions</h2>
            <Button variant="ghost" className="h-8 text-admin-text-secondary hover:text-admin-text-primary" asChild>
              <Link to="/user/payments/history">View all</Link>
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-admin-border hover:bg-transparent">
                <TableHead className="text-admin-text-muted">Type</TableHead>
                <TableHead className="text-admin-text-muted">Amount</TableHead>
                <TableHead className="text-admin-text-muted">Status</TableHead>
                <TableHead className="text-admin-text-muted">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((item) => (
                <TableRow key={item.id} className="border-admin-border hover:bg-admin-hover/60">
                  <TableCell className="font-medium text-admin-text-primary">{titleCase(item.type)}</TableCell>
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
        </section>

        <section className="grid gap-3">
          <article className="rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.5)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Wallet2 size={16} className="text-admin-accent" />
              <h3 className="text-sm font-semibold text-admin-text-primary">Quick Actions</h3>
            </div>
            <div className="grid gap-2">
              <Button className="h-9 justify-start bg-admin-accent text-black hover:bg-[#00d492]" asChild>
                <Link to="/user/payments/deposit">
                  <ArrowDownToLine size={14} /> Deposit funds
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-9 justify-start border-admin-border bg-transparent text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary"
                asChild
              >
                <Link to="/user/payments/withdrawal">
                  <ArrowUpFromLine size={14} /> Withdraw winnings
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-9 justify-start border-admin-border bg-transparent text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary"
                asChild
              >
                <Link to="/user/payments/statements">
                  <ReceiptText size={14} /> Download statement
                </Link>
              </Button>
            </div>
          </article>

          <article className="rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.5)] p-4">
            <h3 className="text-sm font-semibold text-admin-text-primary">Compliance Checks</h3>
            <div className="mt-3 grid gap-2 text-xs text-admin-text-secondary">
              <p className="rounded-lg border border-admin-border bg-[rgba(8,11,20,0.55)] px-3 py-2">
                Withdrawal KYC: Verified
              </p>
              <p className="rounded-lg border border-admin-border bg-[rgba(8,11,20,0.55)] px-3 py-2">
                Account status: Active
              </p>
              <p className="rounded-lg border border-admin-border bg-[rgba(8,11,20,0.55)] px-3 py-2">
                Last security review: 2 days ago
              </p>
            </div>
          </article>
        </section>
      </div>
    </section>
  );
}
