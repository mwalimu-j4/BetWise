import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, Check } from "lucide-react";
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
import { formatMoney } from "../data";
import {
  useWalletSummary,
  type MpesaTransactionStatusResponse,
  type StkPushResponse,
} from "../wallet";

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
  const [submittedTransactionId, setSubmittedTransactionId] = useState<
    string | null
  >(null);
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

  // Optimistic UI update listener
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

  // Polling listener
  useEffect(() => {
    if (!submittedTransactionId || depositConfirmed || paymentFailed) {
      return;
    }

    let active = true;
    const maxAttempts = 18; // 18 * 5s = 90 seconds timeout
    let attempts = 0;

    const pollStatus = async () => {
      attempts += 1;

      try {
        const { data } = await api.get<MpesaTransactionStatusResponse>(
          `/payments/mpesa/status/${submittedTransactionId}`,
        );

        if (!active) return;

        if (data.status === "COMPLETED") {
          setDepositConfirmed(true);
          setSubmissionStartedAt(null);
          setSubmissionBalance(null);
          return;
        }

        if (data.status === "FAILED" || data.status === "REVERSED") {
          setPaymentFailed(data.message || "Payment failed.");
          setSubmissionStartedAt(null);
          setSubmissionBalance(null);
          return;
        }
      } catch {
        // Keep retrying for transient gateway/provider delays.
      }

      if (active) {
        if (attempts < maxAttempts) {
          window.setTimeout(() => {
            void pollStatus();
          }, 5000);
        } else {
          // Prevent user from being stuck with an unclosable modal forever
          setPaymentFailed(
            "Payment request timed out. Please check your balance or try again.",
          );
          setSubmissionStartedAt(null);
          setSubmissionBalance(null);
        }
      }
    };

    window.setTimeout(() => {
      void pollStatus();
    }, 4000);

    return () => {
      active = false;
    };
  }, [depositConfirmed, paymentFailed, submittedTransactionId]);

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
    setSubmittedTransactionId(null);

    try {
      const { data } = await api.post<StkPushResponse>(
        "/payments/mpesa/stk-push",
        {
          phone,
          amount: Number(amount),
        },
      );

      setResponse(data);
      setSubmittedTransactionId(data.transactionId ?? null);
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

  // Determine current step for UI progress indicator
  const currentStepIndex = depositConfirmed ? 3 : response ? 1 : 0;

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      {/* Left Column: Form */}
      <article className="rounded-2xl border border-admin-border bg-admin-card p-5 h-fit shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-3 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-admin-text-primary">
              Deposit Funds
            </h2>
            <p className="mt-1 text-sm text-admin-text-muted">
              Instant top-up through M-Pesa STK Push.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-admin-accent/30 bg-admin-accent-dim px-3 py-1.5 shadow-inner">
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

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
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

        <form className="grid gap-5" onSubmit={handleSubmit}>
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

            <div className="flex flex-wrap gap-2 mt-1">
              {quickAmounts.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5 text-xs font-medium text-admin-text-secondary transition hover:border-admin-accent hover:text-admin-text-primary"
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
            className="mt-2 h-12 w-full rounded-xl bg-admin-accent text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Initiating STK Push..." : "Deposit Now"}
          </Button>
        </form>
      </article>

      {/* Right Column: Instructions / FAQ to fill the responsive grid */}
      <article className="rounded-2xl border border-admin-border bg-admin-surface p-5 h-fit shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-widest text-admin-text-muted mb-4">
          How it works
        </h3>
        <ul className="space-y-4">
          <li className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-admin-accent/20 text-xs font-bold text-admin-accent">
              1
            </div>
            <p className="text-sm text-admin-text-secondary">
              Enter your registered M-Pesa mobile number and the amount you wish
              to top up.
            </p>
          </li>
          <li className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-admin-accent/20 text-xs font-bold text-admin-accent">
              2
            </div>
            <p className="text-sm text-admin-text-secondary">
              Click "Deposit Now" and wait for the STK prompt to appear on your
              phone screen.
            </p>
          </li>
          <li className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-admin-accent/20 text-xs font-bold text-admin-accent">
              3
            </div>
            <p className="text-sm text-admin-text-secondary">
              Enter your M-Pesa PIN to authorize the transaction. Your wallet
              will update automatically within seconds.
            </p>
          </li>
        </ul>
        <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            <strong>Note:</strong> Ensure your phone is unlocked and active to
            receive the STK prompt. Do not refresh this page while waiting for
            confirmation.
          </p>
        </div>
      </article>

      {/* Feedback Dialog */}
      <Dialog
        open={shouldShowDialog}
        onOpenChange={(open) => {
          // PREVENT CLOSING: Only allow user to dismiss modal if payment has resolved
          if (!open && (depositConfirmed || paymentFailed)) {
            setFeedbackDialogOpen(false);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-md overflow-hidden border-admin-border bg-admin-card p-0 shadow-2xl"
        >
          <div className="p-6 sm:p-8">
            <DialogHeader className="items-center text-center">
              <div
                className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                  paymentFailed
                    ? "border-red-400/30 bg-red-500/10 text-red-500"
                    : depositConfirmed
                      ? "border-admin-accent/30 bg-admin-accent-dim text-admin-accent"
                      : "border-admin-accent/50 bg-admin-surface text-admin-accent"
                }`}
              >
                {paymentFailed ? (
                  <CircleAlert className="h-8 w-8" />
                ) : depositConfirmed ? (
                  <CheckCircle2 className="h-8 w-8" />
                ) : (
                  <LoaderCircle className="h-8 w-8 animate-spin" />
                )}
              </div>
              <DialogTitle className="text-2xl font-bold text-admin-text-primary">
                {paymentFailed
                  ? "Payment Failed"
                  : depositConfirmed
                    ? "Payment Complete"
                    : "Awaiting Payment"}
              </DialogTitle>
              <DialogDescription className="mt-2 text-center text-sm text-admin-text-muted">
                {paymentFailed
                  ? paymentFailed
                  : depositConfirmed
                    ? `Your deposit of ${formatMoney(submissionAmount ?? 0)} has gone through. Your new balance is ${formatMoney(currentBalance)}.`
                    : "Please check your phone and enter your M-Pesa PIN to complete the transaction."}
              </DialogDescription>
            </DialogHeader>

            {/* Visual Progress Tracker (only show if not failed) */}
            {!paymentFailed && (
              <div className="mt-8 space-y-3">
                {paymentStages.map((stage, index) => {
                  const isActive = currentStepIndex === index;
                  const isCompleted = currentStepIndex > index;

                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          isCompleted
                            ? "border-admin-accent bg-admin-accent text-black"
                            : isActive
                              ? "border-admin-accent bg-admin-surface text-admin-accent"
                              : "border-admin-border bg-transparent text-admin-text-muted"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </div>
                      <p
                        className={`text-sm font-medium ${
                          isCompleted || isActive
                            ? "text-admin-text-primary"
                            : "text-admin-text-muted"
                        }`}
                      >
                        {stage}
                      </p>
                      {isActive && (
                        <LoaderCircle className="ml-auto h-4 w-4 animate-spin text-admin-accent" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Display Transaction Info */}
            {response?.checkoutRequestId &&
            !depositConfirmed &&
            !paymentFailed ? (
              <div className="mt-6 rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-center text-xs text-admin-text-secondary">
                Request ID:{" "}
                <span className="font-mono">{response.checkoutRequestId}</span>
              </div>
            ) : null}

            {/* Only show dismiss button when the process is fully resolved */}
            <DialogFooter className="mt-8 sm:justify-center">
              {depositConfirmed || paymentFailed ? (
                <Button
                  type="button"
                  className="h-11 w-full rounded-xl bg-admin-accent text-sm font-bold text-black transition hover:opacity-90"
                  onClick={() => setFeedbackDialogOpen(false)}
                >
                  Close & Return
                </Button>
              ) : null}
              {/* Note: The 'Hide' button has been removed intentionally so they cannot dismiss it while waiting */}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
