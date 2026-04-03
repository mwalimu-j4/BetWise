import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatMoney, transactions, walletSummary } from "../data";

export default function PaymentsWithdrawalPage() {
  const [amount, setAmount] = useState("500");
  const [account, setAccount] = useState("+254 712 345 678");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canWithdraw = useMemo(() => {
    const numeric = Number(amount);
    return numeric >= 100 && numeric <= walletSummary.balance;
  }, [amount]);

  const recentWithdrawals = transactions.filter((item) => item.type === "withdrawal").slice(0, 4);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canWithdraw) {
      toast.error("Enter an amount between KES 100 and your available balance.");
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);

    toast.success("Withdrawal request submitted. Expected settlement in 5 to 30 minutes.");
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <article className="rounded-2xl border border-admin-border bg-admin-card p-5">
        <h2 className="text-lg font-bold text-admin-text-primary">Withdraw Funds</h2>
        <p className="mt-1 text-sm text-admin-text-muted">Move your winnings to mobile money or bank.</p>

        <div className="mt-4 rounded-xl border border-admin-border bg-[rgba(22,29,53,0.45)] p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">Available for withdrawal</p>
          <p className="mt-1 text-2xl font-bold text-admin-accent">{formatMoney(walletSummary.balance)}</p>
        </div>

        <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <label htmlFor="withdraw-amount" className="text-sm font-semibold text-admin-text-primary">
              Amount
            </label>
            <Input
              id="withdraw-amount"
              type="number"
              min={100}
              max={walletSummary.balance}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-11 rounded-xl border-admin-border bg-[rgba(22,29,53,0.65)] text-admin-text-primary placeholder:text-admin-text-muted"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="withdraw-account" className="text-sm font-semibold text-admin-text-primary">
              Destination account
            </label>
            <Input
              id="withdraw-account"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              className="h-11 rounded-xl border-admin-border bg-[rgba(22,29,53,0.65)] text-admin-text-primary placeholder:text-admin-text-muted"
            />
          </div>

          <Button type="submit" className="h-11 rounded-xl bg-admin-accent text-black hover:bg-[#00d492]" disabled={!canWithdraw || isSubmitting}>
            {isSubmitting ? "Submitting..." : "Request withdrawal"}
          </Button>
        </form>
      </article>

      <article className="rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.5)] p-5">
        <h3 className="text-sm font-semibold text-admin-text-primary">Recent Withdrawal Requests</h3>
        <div className="mt-3 grid gap-2">
          {recentWithdrawals.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-admin-border bg-[rgba(8,11,20,0.6)] p-3">
              <p className="text-sm font-semibold text-admin-text-primary">{formatMoney(entry.amount)}</p>
              <p className="text-xs text-admin-text-muted">{entry.status.toUpperCase()} • {formatDateTime(entry.createdAt)}</p>
              <p className="mt-1 text-xs text-admin-text-secondary">Ref: {entry.reference}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
