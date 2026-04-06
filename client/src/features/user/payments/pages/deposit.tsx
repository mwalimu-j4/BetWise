import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Check,
  Smartphone,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
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

function normalizePhone(phone: string) {
  const compact = phone.replace(/\s+/g, "").replace(/^[+]/, "");
  if (compact.startsWith("0")) {
    return `254${compact.slice(1)}`;
  }

  return compact;
}

function isPhoneValid(phone: string) {
  return /^254(7|1)\d{8}$/.test(phone);
}

export default function PaymentsDepositPage() {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
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
  const accountPhone = useMemo(
    () => normalizePhone(user?.phone ?? ""),
    [user?.phone],
  );
  const accountPhoneValid = isPhoneValid(accountPhone);

  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [phone, user?.phone]);

  const sanitizedPhone = normalizePhone(phone);
  const phoneInputValid = phone ? isPhoneValid(sanitizedPhone) : true;

  const isFormValid = useMemo(() => {
    const amountValue = Number(amount);
    return phoneInputValid && amountValue >= 1 && amountValue <= 250000;
  }, [amount, phoneInputValid]);

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
      if (!accountPhoneValid) {
        toast.error("Your account phone is invalid for M-PESA deposits.");
      } else {
        toast.error("Enter a valid deposit amount.");
      }
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

    const normalizedPhone = sanitizedPhone.startsWith("0")
      ? `254${sanitizedPhone.slice(1)}`
      : sanitizedPhone;

    try {
      const { data } = await api.post<StkPushResponse>(
        "/payments/mpesa/stk-push",
        { phone: normalizedPhone, amount: Number(amount) },
      );

      setResponse(data);
      setSubmittedTransactionId(data.transactionId ?? null);
      toast.info("Payment initiated. Enter pin on your phone to complete.");
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
    <section className="mx-auto max-w-xl">
      <article className="rounded-3xl border border-[#23384f] bg-[#111d2e] p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center justify-between border-b border-[#23384f] pb-5">
          <div>
            <h2 className="text-xl font-bold text-admin-text-primary">
              Deposit Funds
            </h2>
            <p className="mt-1 text-sm text-admin-text-muted">
              Instant M-Pesa Top-up
            </p>
          </div>
          <div className="flex h-11 w-20 items-center justify-center rounded-xl border border-[#2f4a62] bg-[#4CAF50]/10 px-2">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg"
              alt="M-Pesa"
              className="h-full w-full object-contain drop-shadow-sm"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-[#23384f] bg-[#101b2b] p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <Smartphone size={15} className="text-[#8a9bb0]" />
              <label
                htmlFor="phone"
                className="text-sm font-semibold text-admin-text-primary"
              >
                M-Pesa Phone
              </label>
            </div>
            <input
              id="phone"
              className="h-11 w-full rounded-xl border border-[#294157] bg-[#0f1a2a] px-3 text-sm text-admin-text-primary outline-none transition placeholder:text-[#8a9bb0] focus:border-[#f5c518] focus:shadow-[0_0_0_2px_rgba(245,197,24,0.2)]"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2547XXXXXXXX"
              autoComplete="tel"
            />

            {phone && !phoneInputValid && (
              <p className="mt-2 text-xs text-red-400">
                Use format: 2547XXXXXXXX or 07XXXXXXXX.
              </p>
            )}
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

            <div className="flex w-full items-center overflow-hidden rounded-xl border border-[#294157] bg-[#0f1a2a] transition focus-within:border-[#f5c518] focus-within:shadow-[0_0_0_2px_rgba(245,197,24,0.2)]">
              <span className="flex h-11 items-center border-r border-[#294157] px-3 text-[11px] font-bold text-[#8a9bb0]">
                KES
              </span>
              <input
                id="amount"
                className="h-11 w-full border-0 bg-transparent px-3 text-sm text-admin-text-primary outline-none placeholder:text-[#8a9bb0]"
                value={amount}
                type="number"
                min={1}
                max={250000}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {quickAmounts.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="rounded-lg border border-[#294157] bg-[#0f1a2a] py-1.5 text-xs font-medium text-[#8a9bb0] transition hover:border-[#f5c518]/70 hover:text-white"
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
          className="max-w-sm overflow-hidden border-[#23384f] bg-[#111d2e] p-0 shadow-2xl"
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
                          <Check className="h-3 w-3 stroke-3" />
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
