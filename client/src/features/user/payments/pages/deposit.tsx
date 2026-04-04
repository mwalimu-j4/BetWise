import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "../data";
import { useWalletSummary, type StkPushResponse } from "../wallet";

const quickAmounts = [200, 500, 1000, 2500, 5000, 10000];
const paymentStages = [
  "STK sent",
  "Awaiting phone approval",
  "Wallet updated",
] as const;

export default function PaymentsDepositPage() {
  const [phone, setPhone] = useState("254712345678");
  const [amount, setAmount] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<StkPushResponse | null>(null);
  const [submissionStartedAt, setSubmissionStartedAt] = useState<string | null>(
    null,
  );
  const [submissionBalance, setSubmissionBalance] = useState<number | null>(
    null,
  );
  const [submissionAmount, setSubmissionAmount] = useState<number | null>(null);
  const [depositConfirmed, setDepositConfirmed] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState<string | null>(null);
  const { data: walletData, isLoading: isWalletLoading } = useWalletSummary();

  const isFormValid = useMemo(() => {
    const amountValue = Number(amount);
    return (
      phone.trim().length >= 10 && amountValue >= 1 && amountValue <= 250000
    );
  }, [amount, phone]);

  const currentBalance = walletData?.wallet.balance ?? 0;

  useEffect(() => {
    if (
      submissionStartedAt &&
      submissionBalance !== null &&
      currentBalance > submissionBalance &&
      !isSubmitting
    ) {
      setDepositConfirmed(true);
      setSubmissionStartedAt(null);
      setSubmissionBalance(null);
      toast.success(
        `Payment successful. New balance is ${formatMoney(currentBalance)}.`,
      );
    }
  }, [currentBalance, isSubmitting, submissionBalance, submissionStartedAt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid) {
      toast.error("Enter a valid phone number and amount.");
      return;
    }

    setIsSubmitting(true);
    setResponse(null);
    setPaymentFailed(null);
    setDepositConfirmed(false);
    setFeedbackDialogOpen(true);
    setSubmissionStartedAt(new Date().toISOString());
    setSubmissionBalance(currentBalance);
    setSubmissionAmount(Number(amount));

    try {
      const { data } = await api.post<StkPushResponse>(
        "/payments/mpesa/stk-push",
        {
          phone,
          amount: Number(amount),
        },
      );

      setResponse(data);
      toast.info("Payment initiated. Please approve the prompt on your phone.");
    } catch (error: unknown) {
      setSubmissionStartedAt(null);
      setSubmissionBalance(null);
      const messageFromApi = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setPaymentFailed(
        messageFromApi || "Could not start M-Pesa payment. Try again.",
      );
      toast.error(
        messageFromApi || "Could not start M-Pesa payment. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const paymentStateLabel = paymentFailed
    ? "Failed"
    : depositConfirmed
      ? "Success"
      : response
        ? "Awaiting approval"
        : isSubmitting
          ? "Initiating"
          : "Idle";

  const shouldShowDialog =
    feedbackDialogOpen &&
    Boolean(isSubmitting || response || depositConfirmed || paymentFailed);

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
          <div className="inline-flex items-center gap-2 rounded-full border border-admin-accent/30 bg-admin-accent-dim px-3 py-1.5">
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

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-admin-border bg-admin-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
              Available balance
            </p>
            <p className="mt-2 text-2xl font-bold text-admin-accent">
              {isWalletLoading ? "Loading..." : formatMoney(currentBalance)}
            </p>
          </article>
          <article className="rounded-2xl border border-admin-border bg-admin-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
              Deposit status
            </p>
            <p className="mt-2 text-sm font-semibold text-admin-text-primary">
              {paymentStateLabel}
            </p>
          </article>
          <article className="rounded-2xl border border-admin-border bg-admin-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
              Requested amount
            </p>
            <p className="mt-2 text-2xl font-bold text-admin-gold">
              {formatMoney(Number(amount) || 0)}
            </p>
          </article>
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
              className="h-11 w-full rounded-xl border border-admin-border bg-admin-surface px-3 text-sm text-admin-text-primary outline-none transition placeholder:text-admin-text-muted focus:border-admin-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
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

            <div className="flex w-full items-center overflow-hidden rounded-xl border border-admin-border bg-admin-surface transition focus-within:border-admin-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)]">
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
                  className="rounded-lg border border-admin-border bg-admin-surface px-2.5 py-1 text-xs font-medium text-admin-text-secondary transition hover:border-admin-accent hover:text-admin-text-primary"
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
            className="h-11 rounded-xl bg-admin-accent text-sm font-bold text-black hover:opacity-90"
          >
            {isSubmitting ? "Sending STK prompt..." : "Deposit now"}
          </Button>
        </form>

        <Card className="mt-4 border-admin-border bg-admin-surface shadow-none">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-admin-text-primary">
              Live Payment Feedback
            </CardTitle>
            <CardDescription className="text-admin-text-muted">
              Status updates change automatically as M-Pesa confirms your
              request.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 pt-4 sm:grid-cols-3">
            {paymentStages.map((stage, index) => {
              const isActive =
                (index === 0 &&
                  (isSubmitting || Boolean(response) || depositConfirmed)) ||
                (index === 1 &&
                  (Boolean(response) || depositConfirmed) &&
                  !paymentFailed) ||
                (index === 2 && depositConfirmed);

              return (
                <div
                  key={stage}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? "border-admin-accent/30 bg-admin-accent-dim text-admin-text-primary"
                      : "border-admin-border bg-admin-card text-admin-text-secondary"
                  }`}
                >
                  {stage}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </article>

      <article className="rounded-2xl border border-admin-border bg-admin-surface p-5">
        <h3 className="text-sm font-semibold text-admin-text-primary">
          Deposit Guidelines
        </h3>
        <div className="mt-3 grid gap-2 text-sm text-admin-text-secondary">
          <p className="rounded-lg border border-admin-border bg-admin-card px-3 py-2">
            Use your registered phone number for faster KYC checks.
          </p>
          <p className="rounded-lg border border-admin-border bg-admin-card px-3 py-2">
            Deposits are reflected immediately after STK confirmation.
          </p>
          <p className="rounded-lg border border-admin-border bg-admin-card px-3 py-2">
            High value deposits may trigger extra account verification.
          </p>
        </div>
      </article>

      <Dialog open={shouldShowDialog} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-md border-admin-border bg-admin-card p-0"
        >
          <div className="rounded-2xl p-6">
            <DialogHeader className="items-center text-center">
              <div
                className={`mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border ${
                  paymentFailed
                    ? "border-red-400/30 bg-red-500/10"
                    : depositConfirmed
                      ? "border-admin-accent/30 bg-admin-accent-dim"
                      : "border-admin-border bg-admin-surface"
                }`}
              >
                {paymentFailed ? (
                  <CircleAlert className="h-7 w-7 text-red-400" />
                ) : depositConfirmed ? (
                  <CheckCircle2 className="h-7 w-7 text-admin-accent" />
                ) : (
                  <LoaderCircle className="h-7 w-7 animate-spin text-admin-accent" />
                )}
              </div>
              <DialogTitle className="text-xl text-admin-text-primary">
                {paymentFailed
                  ? "Payment Failed"
                  : depositConfirmed
                    ? "Payment Complete"
                    : response
                      ? "Awaiting Confirmation"
                      : "Payment Initiated"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-center text-sm text-admin-text-muted">
                {paymentFailed
                  ? paymentFailed
                  : depositConfirmed
                    ? `Your deposit of ${formatMoney(submissionAmount ?? 0)} has gone through. Your balance is ${formatMoney(currentBalance)}.`
                    : response
                      ? "We sent the STK request. Approve it on your phone to complete payment."
                      : "Payment initiated. Preparing your M-Pesa request..."}
              </DialogDescription>
            </DialogHeader>

            {response?.checkoutRequestId ? (
              <div className="mt-4 rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-xs text-admin-text-secondary">
                Request ID: {response.checkoutRequestId}
              </div>
            ) : null}

            <DialogFooter className="mt-6 sm:justify-center">
              {depositConfirmed || paymentFailed ? (
                <Button
                  type="button"
                  className="h-10 min-w-28 rounded-xl bg-admin-accent text-black hover:opacity-90"
                  onClick={() => setFeedbackDialogOpen(false)}
                >
                  Okay
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 min-w-28 rounded-xl border-admin-border bg-admin-surface text-admin-text-primary hover:bg-admin-card"
                  onClick={() => setFeedbackDialogOpen(false)}
                >
                  Hide
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
