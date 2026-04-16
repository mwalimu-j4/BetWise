import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Check,
  Smartphone,
  Copy,
  Check as CheckIcon,
  ArrowRight,
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

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  } catch {
    toast.error("Failed to copy");
  }
};

export default function PaymentsDepositPage() {
  const { user } = useAuth();
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: walletData } = useWalletSummary();
  const currentBalance = walletData?.wallet.balance ?? 0;
  const accountPhone = useMemo(
    () => normalizePhone(user?.phone ?? ""),
    [user?.phone],
  );
  const accountPhoneValid = isPhoneValid(accountPhone);

  const isFormValid = useMemo(() => {
    const amountValue = Number(amount);
    return accountPhoneValid && amountValue >= 1 && amountValue <= 250000;
  }, [accountPhoneValid, amount]);

  const handleCopy = async (text: string, field: string) => {
    await copyToClipboard(text, field);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
  }, [
    currentBalance,
    depositConfirmed,
    paymentFailed,
    queryClient,
    submissionAmount,
    submissionBalance,
    submittedTransactionId,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid) {
      toast.error("Your account phone is missing or invalid in your profile.");
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
          phone: accountPhone,
          amount: Number(amount),
        },
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
  const currentStepIndex = depositConfirmed ? 2 : response ? 1 : 0;

  return (
    <section className="mx-auto max-w-5xl space-y-5 px-4 py-5 md:px-5">
      {/* Compact header with M-Pesa logo */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Deposit Funds</h1>
          <p className="text-xs text-gray-400">Instant M-Pesa Top-up</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[#1a2a3a] px-3 py-1.5">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg"
            alt="M-Pesa"
            className="h-5 w-auto object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <span className="text-[11px] font-medium text-gray-300">
            Safaricom
          </span>
        </div>
      </div>

      {/* Two equal-height cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Deposit Form Card */}
        <div className="flex flex-col rounded-xl border border-[#23384f] bg-[#111d2e] shadow-md">
          <div className="border-b border-[#23384f] px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Quick Deposit</h2>
            <p className="text-[11px] text-gray-400">STK Push to your phone</p>
          </div>

          <form className="flex flex-1 flex-col p-4" onSubmit={handleSubmit}>
            <div className="flex-1 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-300">
                  Amount (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    KES
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={1}
                    max={250000}
                    className="h-11 w-full rounded-lg border border-[#2a3a4a] bg-[#0a121f] pl-12 pr-3 text-base font-medium text-white outline-none transition focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518]/50"
                    placeholder="0.00"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {quickAmounts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(String(value))}
                      className="rounded-md border border-[#2a3a4a] bg-[#0a121f] px-3 py-1 text-xs font-medium text-gray-300 transition hover:border-[#f5c518] hover:text-white"
                    >
                      {formatMoney(value)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="mt-4 h-11 w-full rounded-lg bg-[#f5c518] text-sm font-bold text-black transition-all hover:bg-[#e0b010] hover:shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  Pay with M-Pesa <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-gray-500">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>Secure • No extra fees</span>
            </div>
          </form>
        </div>

        {/* Till Number Card */}
        <div className="flex flex-col rounded-xl border border-[#23384f] bg-[#111d2e] shadow-md">
          <div className="border-b border-[#23384f] px-4 py-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-[#f5c518]" />
              <h3 className="text-sm font-semibold text-white">
                Lipa Na M-PESA
              </h3>
            </div>
            <p className="text-[11px] text-gray-400">Buy Goods Till Number</p>
          </div>

          <div className="flex flex-1 flex-col p-4">
            <div className="flex-1 space-y-4">
              {/* Till Number - Compact */}
              <div className="rounded-lg bg-[#0a121f] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">
                  Till Number
                </p>
                <p className="text-2xl font-black text-white tracking-tight">
                  9006951
                </p>
                <button
                  onClick={() => handleCopy("9006951", "Till number")}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[#1a2a3a] px-2.5 py-1 text-[10px] text-gray-300 transition hover:bg-[#2a3a4a]"
                >
                  {copiedField === "Till number" ? (
                    <>
                      <CheckIcon className="h-3 w-3 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Steps - Compact */}
              <div>
                <p className="mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  How to pay
                </p>
                <div className="space-y-1.5">
                  {[
                    "Go to M-Pesa → Lipa Na M-Pesa",
                    "Select Buy Goods & Services",
                    "Enter Till 9006951",
                    "Enter amount & PIN",
                    "Confirm payment",
                  ].map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-[11px] text-gray-300"
                    >
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#f5c518]/20 text-[9px] font-bold text-[#f5c518]">
                        {idx + 1}
                      </div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[9px] text-gray-500 text-center">
                  Dial *234# for charges
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Dialog */}
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
