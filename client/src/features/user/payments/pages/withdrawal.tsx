import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  formatMoney,
  transactions,
  walletSummary,
} from "../data";

const quickAmounts = [100, 500, 1000, 2500, 5000, 10000];

export default function PaymentsWithdrawalPage() {
  const [amount, setAmount] = useState("500");
  const [account, setAccount] = useState("+254 712 345 678");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canWithdraw = useMemo(() => {
    const numeric = Number(amount);
    return numeric >= 100 && numeric <= walletSummary.balance;
  }, [amount]);

  const recentWithdrawals = transactions
    .filter((item) => item.type === "withdrawal")
    .slice(0, 4);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canWithdraw) {
      toast.error(
        "Enter an amount between KES 100 and your available balance.",
      );
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);

    toast.success(
      "Withdrawal request submitted. Expected settlement in 5 to 30 minutes.",
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <article className="rounded-2xl border border-admin-border bg-admin-card p-5">
        <div className="mb-5 border-b border-admin-border pb-4">
          <h2 className="text-lg font-bold text-admin-text-primary">
            Withdraw Funds
          </h2>
          <p className="mt-1 text-sm text-admin-text-muted">
            Transfer your winnings to mobile money or bank account.
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-admin-border bg-[var(--color-bg-elevated)] p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">
            Available for withdrawal
          </p>
          <p className="mt-1 text-2xl font-bold text-admin-accent">
            {formatMoney(walletSummary.balance)}
          </p>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <label
              htmlFor="withdraw-amount"
              className="text-sm font-semibold text-admin-text-primary"
            >
              Amount
            </label>
            <div className="flex w-full items-center overflow-hidden rounded-xl border border-admin-border bg-[var(--color-bg-elevated)] transition focus-within:border-[var(--color-border-focus)] focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)]">
              <span className="flex h-11 items-center border-r border-admin-border px-3 text-[11px] font-bold text-admin-text-muted">
                KES
              </span>
              <input
                id="withdraw-amount"
                className="h-11 w-full border-0 bg-transparent px-3 text-sm text-admin-text-primary outline-none placeholder:text-admin-text-muted"
                type="number"
                min={100}
                max={walletSummary.balance}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 py-1 text-xs font-medium text-admin-text-secondary transition hover:border-[var(--color-border-accent)] hover:text-admin-text-primary"
                  onClick={() => setAmount(String(option))}
                >
                  {formatMoney(option)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="withdraw-account"
              className="text-sm font-semibold text-admin-text-primary"
            >
              Destination Account
            </label>
            <input
              id="withdraw-account"
              className="h-11 w-full rounded-xl border border-admin-border bg-[var(--color-bg-elevated)] px-3 text-sm text-admin-text-primary outline-none transition placeholder:text-admin-text-muted focus:border-[var(--color-border-focus)] focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              placeholder="Phone number or bank account"
            />
          </div>

          <Button
            type="submit"
            className="h-11 rounded-xl bg-admin-accent text-sm font-bold text-[var(--color-text-dark)] hover:bg-[var(--color-accent-dark)]"
            disabled={!canWithdraw || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Request Withdrawal"}
          </Button>
        </form>
      </article>

      <article className="rounded-2xl border border-admin-border bg-[var(--color-bg-elevated)] p-5">
        <h3 className="text-sm font-semibold text-admin-text-primary">
          Recent Requests
        </h3>
        <div className="mt-3 grid gap-2">
          {recentWithdrawals.length > 0 ? (
            recentWithdrawals.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-admin-border bg-[var(--color-bg-surface)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-admin-text-primary">
                    {formatMoney(entry.amount)}
                  </p>
                  <span className="inline-flex items-center rounded-full border border-admin-border bg-[var(--color-bg-elevated)] px-2 py-0.5 text-[10px] font-medium uppercase text-admin-text-muted">
                    {entry.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-admin-text-secondary">
                  {formatDateTime(entry.createdAt)}
                </p>
                <p className="mt-1 text-[10px] text-admin-text-muted">
                  Ref: {entry.reference}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-admin-border bg-[var(--color-bg-surface)] p-3">
              <p className="text-sm text-admin-text-muted">
                No withdrawal requests yet.
              </p>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}





