import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { formatMoney } from "../data";

type StkPushResponse = {
  message: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  customerMessage?: string;
};

const quickAmounts = [200, 500, 1000, 2500, 5000, 10000];

export default function PaymentsDepositPage() {
  const [phone, setPhone] = useState("254712345678");
  const [amount, setAmount] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<StkPushResponse | null>(null);

  const isFormValid = useMemo(() => {
    const amountValue = Number(amount);
    return (
      phone.trim().length >= 10 && amountValue >= 1 && amountValue <= 250000
    );
  }, [amount, phone]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid) {
      toast.error("Enter a valid phone number and amount.");
      return;
    }

    setIsSubmitting(true);
    setResponse(null);

    try {
      const { data } = await api.post<StkPushResponse>(
        "/payments/mpesa/stk-push",
        {
          phone,
          amount: Number(amount),
        },
      );

      setResponse(data);
      toast.success(data.customerMessage ?? "STK push sent. Check your phone.");
    } catch (error: unknown) {
      const messageFromApi = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(
        messageFromApi || "Could not start M-Pesa payment. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <article className="rounded-2xl border border-admin-border bg-admin-card p-5">
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-admin-text-primary">
              Deposit Funds
            </h2>
            <p className="mt-1 text-sm text-admin-text-muted">
              Instant top-up through M-Pesa STK Push.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-accent)] bg-admin-accent-dim px-3 py-1.5">
            <img
              src="/images/mpesa/logo.png"
              alt="M-Pesa"
              className="h-5 w-auto object-contain"
            />
            <span className="text-[11px] font-bold tracking-[0.04em] text-admin-accent">
              M-PESA
            </span>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label
              htmlFor="phone"
              className="text-sm font-semibold text-admin-text-primary"
            >
              M-Pesa phone number
            </label>
            <input
              id="phone"
              className="h-11 w-full rounded-xl border border-admin-border bg-[var(--color-bg-elevated)] px-3 text-sm text-admin-text-primary outline-none transition placeholder:text-admin-text-muted focus:border-[var(--color-border-focus)] focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="2547XXXXXXXX"
              autoComplete="tel"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="amount"
                className="text-sm font-semibold text-admin-text-primary"
              >
                Amount
              </label>
              <span className="text-xs text-admin-text-muted">
                Min: KES 1 | Max: KES 250,000
              </span>
            </div>

            <div className="flex w-full items-center overflow-hidden rounded-xl border border-admin-border bg-[var(--color-bg-elevated)] transition focus-within:border-[var(--color-border-focus)] focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)]">
              <span className="flex h-11 items-center border-r border-admin-border px-3 text-[11px] font-bold text-admin-text-muted">
                KES
              </span>
              <input
                id="amount"
                className="h-11 w-full border-0 bg-transparent px-3 text-sm text-admin-text-primary outline-none placeholder:text-admin-text-muted"
                value={amount}
                type="number"
                min={1}
                max={250000}
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

          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="h-11 rounded-xl bg-admin-accent text-sm font-bold text-[var(--color-text-dark)] hover:bg-[var(--color-accent-dark)]"
          >
            {isSubmitting ? "Initiating payment..." : "Deposit now"}
          </Button>
        </form>

        {response ? (
          <div className="mt-4 rounded-2xl border border-[var(--color-border-accent)] bg-[var(--color-accent-soft)] p-4">
            <p className="text-sm font-semibold text-admin-text-primary">
              {response.message}
            </p>
            {response.customerMessage ? (
              <p className="mt-1 text-sm text-admin-text-secondary">
                {response.customerMessage}
              </p>
            ) : null}
            {response.checkoutRequestId ? (
              <p className="mt-2 break-all rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2 py-1.5 text-xs text-admin-text-primary">
                Request ID: {response.checkoutRequestId}
              </p>
            ) : null}
          </div>
        ) : null}
      </article>

      <article className="rounded-2xl border border-admin-border bg-[var(--color-bg-elevated)] p-5">
        <h3 className="text-sm font-semibold text-admin-text-primary">
          Deposit Guidelines
        </h3>
        <div className="mt-3 grid gap-2 text-sm text-admin-text-secondary">
          <p className="rounded-lg border border-admin-border bg-[var(--color-bg-surface)] px-3 py-2">
            Use your registered phone number for faster KYC checks.
          </p>
          <p className="rounded-lg border border-admin-border bg-[var(--color-bg-surface)] px-3 py-2">
            Deposits are reflected immediately after STK confirmation.
          </p>
          <p className="rounded-lg border border-admin-border bg-[var(--color-bg-surface)] px-3 py-2">
            High value deposits may trigger extra account verification.
          </p>
        </div>
      </article>
    </section>
  );
}





