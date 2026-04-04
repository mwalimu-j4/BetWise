import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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
  walletSummaryQueryKey,
  type MpesaTransactionStatusResponse,
  type StkPushResponse,
  type WalletSummaryResponse,
} from "../wallet";

// Reduced to exactly 4 options
const quickAmounts = [500, 1000, 2500, 5000];
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

  // Kept under the hood for optimistic UI updates, but removed from the visible layout
  const queryClient = useQueryClient();
  const { data: walletData } = useWalletSummary();
  const currentBalance = walletData?.wallet.balance ?? 0;

  const isFormValid = useMemo(() => {
    const amountValue = Number(amount);
    return (
      phone.trim().length >= 10 && amountValue >= 1 && amountValue <= 250000
    );
  }, [amount, phone]);

  useEffect(() => {
    if (
      submissionStartedAt &&
      submissionBalance !== null &&
      currentBalance > submissionBalance &&
      !isSubmitting
    ) {
      const optimisticBalance = submissionBalance + (submissionAmount ?? 0);
      queryClient.setQueryData<WalletSummaryResponse>(
        walletSummaryQueryKey,
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            wallet: {
              ...prev.wallet,
              balance: Math.max(currentBalance, optimisticBalance),
            },
          };
        },
      );
      setDepositConfirmed(true);
      setSubmissionStartedAt(null);
      setSubmissionBalance(null);
      queryClient.invalidateQueries({
        queryKey: walletSummaryQueryKey,
        refetchType: "active",
      });
      toast.success(
        `Payment successful. New balance is ${formatMoney(currentBalance)}.`,
      );
    }
  }, [
    currentBalance,
    isSubmitting,
    submissionBalance,
    submissionStartedAt,
    queryClient,
  ]);

  useEffect(() => {
    if (!submittedTransactionId || depositConfirmed || paymentFailed) return;

    let active = true;
    const maxAttempts = 18;
    let attempts = 0;

    const pollStatus = async () => {
      attempts += 1;

      try {
        const { data } = await api.get<MpesaTransactionStatusResponse>(
          `/payments/mpesa/status/${submittedTransactionId}`,
        );

        if (!active) return;

        if (data.status === "COMPLETED") {
          const optimisticBalance =
            (submissionBalance ?? currentBalance) + (submissionAmount ?? 0);
          queryClient.setQueryData<WalletSummaryResponse>(
            walletSummaryQueryKey,
            (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                wallet: {
                  ...prev.wallet,
                  balance: optimisticBalance,
                },
              };
            },
          );
          setDepositConfirmed(true);
          setSubmissionStartedAt(null);
          setSubmissionBalance(null);
          queryClient.invalidateQueries({
            queryKey: walletSummaryQueryKey,
            refetchType: "active",
          });
          return;
        }

        if (data.status === "FAILED" || data.status === "REVERSED") {
          setPaymentFailed(data.message || "Payment failed.");
          setSubmissionStartedAt(null);
          setSubmissionBalance(null);
          queryClient.invalidateQueries({
            queryKey: walletSummaryQueryKey,
            refetchType: "active",
          });
          return;
        }
      } catch {
        // Keep retrying for transient gateway/provider delays.
      }

      if (active) {
        if (attempts < maxAttempts) {
          window.setTimeout(() => void pollStatus(), 5000);
        } else {
          setPaymentFailed(
            "Payment request timed out. Please check your balance or try again.",
          );
          setSubmissionStartedAt(null);
          setSubmissionBalance(null);
        }
      }
    };

    window.setTimeout(() => void pollStatus(), 4000);

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
        { phone, amount: Number(amount) },
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
      const errorMsg =
        messageFromApi || "Could not start M-Pesa payment. Try again.";

      setPaymentFailed(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const shouldShowDialog =
    feedbackDialogOpen &&
    Boolean(isSubmitting || response || depositConfirmed || paymentFailed);

  const currentStepIndex = depositConfirmed ? 3 : response ? 1 : 0;

  return (
    // Restricted max-width to make it a neat, compact widget instead of a massive spanning grid
    <section className="mx-auto max-w-md">
      <article className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-admin-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-admin-text-primary">
              Deposit Funds
            </h2>
            <p className="mt-1 text-xs text-admin-text-muted">
              Instant M-Pesa Top-up
            </p>
          </div>
          {/* Online high-res M-Pesa SVG Logo */}
          <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-[#4CAF50]/10 px-2">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg"
              alt="M-Pesa"
              className="h-full w-full object-contain drop-shadow-sm"
            />
          </div>
        </div>

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label
              htmlFor="phone"
              className="text-sm font-semibold text-admin-text-primary"
            >
              Phone Number
            </label>
            <input
              id="phone"
              className="h-11 w-full rounded-xl border border-admin-border bg-admin-surface px-3 text-sm text-admin-text-primary outline-none transition focus:border-admin-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
            </div>

            <div className="flex w-full items-center overflow-hidden rounded-xl border border-admin-border bg-admin-surface transition focus-within:border-admin-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)]">
              <span className="flex h-11 items-center border-r border-admin-border px-3 text-[11px] font-bold text-admin-text-muted">
                KES
              </span>
              <input
                id="amount"
                className="h-11 w-full border-0 bg-transparent px-3 text-sm text-admin-text-primary outline-none"
                value={amount}
                type="number"
                min={1}
                max={250000}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="mt-1 grid grid-cols-4 gap-2">
              {quickAmounts.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="rounded-lg border border-admin-border bg-admin-surface py-1.5 text-xs font-medium text-admin-text-secondary transition hover:border-admin-accent hover:text-admin-text-primary"
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
            className="mt-2 h-11 w-full rounded-xl bg-admin-accent text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Initiating STK Push..." : "Deposit Now"}
          </Button>
        </form>
      </article>

      {/* Strict Unclosable Feedback Dialog */}
      <Dialog
        open={shouldShowDialog}
        onOpenChange={(open) => {
          if (!open && (depositConfirmed || paymentFailed)) {
            setFeedbackDialogOpen(false);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-[400px] overflow-hidden border-admin-border bg-admin-card p-0 shadow-2xl"
        >
          <div className="p-6">
            <DialogHeader className="items-center text-center">
              <div
                className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 ${
                  paymentFailed
                    ? "border-red-400/30 bg-red-500/10 text-red-500"
                    : depositConfirmed
                      ? "border-admin-accent/30 bg-admin-accent-dim text-admin-accent"
                      : "border-admin-accent/50 bg-admin-surface text-admin-accent"
                }`}
              >
                {paymentFailed ? (
                  <CircleAlert className="h-7 w-7" />
                ) : depositConfirmed ? (
                  <CheckCircle2 className="h-7 w-7" />
                ) : (
                  <LoaderCircle className="h-7 w-7 animate-spin" />
                )}
              </div>
              <DialogTitle className="text-xl font-bold text-admin-text-primary">
                {paymentFailed
                  ? "Payment Failed"
                  : depositConfirmed
                    ? "Payment Complete"
                    : "Awaiting Payment"}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-center text-sm text-admin-text-muted">
                {paymentFailed
                  ? paymentFailed
                  : depositConfirmed
                    ? `Deposit of ${formatMoney(submissionAmount ?? 0)} successful.`
                    : "Enter your M-Pesa PIN on your phone to authorize."}
              </DialogDescription>
            </DialogHeader>

            {!paymentFailed && (
              <div className="mt-6 space-y-3">
                {paymentStages.map((stage, index) => {
                  const isActive = currentStepIndex === index;
                  const isCompleted = currentStepIndex > index;

                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isCompleted
                            ? "border-admin-accent bg-admin-accent text-black"
                            : isActive
                              ? "border-admin-accent bg-admin-surface text-admin-accent"
                              : "border-admin-border bg-transparent text-admin-text-muted"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-3 w-3 stroke-[3]" />
                        ) : (
                          <span className="text-[10px] font-bold">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm ${isCompleted || isActive ? "font-medium text-admin-text-primary" : "text-admin-text-muted"}`}
                      >
                        {stage}
                      </p>
                      {isActive && (
                        <LoaderCircle className="ml-auto h-3.5 w-3.5 animate-spin text-admin-accent" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <DialogFooter className="mt-6 sm:justify-center">
              {depositConfirmed || paymentFailed ? (
                <Button
                  type="button"
                  className="h-10 w-full rounded-xl bg-admin-accent text-sm font-bold text-black transition hover:opacity-90"
                  onClick={() => setFeedbackDialogOpen(false)}
                >
                  Close
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
