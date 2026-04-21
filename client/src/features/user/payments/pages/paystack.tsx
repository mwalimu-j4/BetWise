import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  BadgeCheck,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentFeedbackModal } from "@/components/PaymentFeedbackModal";
import { PaymentLoadingModal } from "@/components/PaymentLoadingModal";
import { useAuth } from "@/context/AuthContext";
import { formatMoney } from "../data";
import {
  usePaystackInitialize,
  usePaystackVerification,
} from "../hooks/usePaystackPayment";
import { useEnabledPaymentMethods } from "../hooks/usePaymentMethods";
import {
  useMpesaDepositStatus,
  useMpesaInitialize,
} from "../hooks/useMpesaPayment";
import { useWalletSummary } from "../wallet";

const quickAmounts = [500, 1000, 2500, 5000];
const paystackPendingStorageKey = "betwise-paystack-pending-reference";
const mpesaPendingStorageKey = "betwise-mpesa-pending-transaction";

function normalizeAmount(value: string) {
  return value.replace(/[^\d]/g, "");
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }

  if (digits.startsWith("7") && digits.length === 9) {
    return `254${digits}`;
  }

  if (digits.startsWith("254") && digits.length === 12) {
    return digits;
  }

  return digits;
}

function isValidPhone(phone: string) {
  return /^254(7|1)\d{8}$/.test(phone);
}

export default function DepositPage() {
  const { user } = useAuth();
  const { data: walletData } = useWalletSummary();
  const enabledMethodsQuery = useEnabledPaymentMethods();
  const paystackInitializeMutation = usePaystackInitialize();
  const mpesaInitializeMutation = useMpesaInitialize();

  const accountPhone = useMemo(
    () => normalizePhone(user?.phone ?? ""),
    [user?.phone],
  );

  const [amount, setAmount] = useState("500");
  const [phone, setPhone] = useState(accountPhone);
  const [paymentStatus, setPaymentStatus] = useState<
    "success" | "failed" | null
  >(null);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [shouldVerifyPaystack, setShouldVerifyPaystack] = useState(false);
  const [paystackReference, setPaystackReference] = useState<string | null>(
    null,
  );
  const [pendingMpesaTransactionId, setPendingMpesaTransactionId] = useState<
    string | null
  >(null);

  const amountValue = useMemo(() => Number(amount) || 0, [amount]);
  const balance = walletData?.wallet.balance ?? 0;
  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);
  const phoneIsValid = normalizedPhone.length === 0 || isValidPhone(normalizedPhone);

  const paystackVerificationQuery = usePaystackVerification(
    shouldVerifyPaystack ? paystackReference : null,
  );
  const mpesaStatusQuery = useMpesaDepositStatus(pendingMpesaTransactionId);

  const isPaymentMethodsLoading = enabledMethodsQuery.isLoading;
  const isMpesaEnabled = enabledMethodsQuery.data?.mpesa ?? false;
  const isPaystackEnabled = enabledMethodsQuery.data?.paystack ?? false;
  const activeMethod = isMpesaEnabled
    ? "mpesa"
    : isPaystackEnabled
      ? "paystack"
      : null;

  useEffect(() => {
    if (accountPhone && !phone) {
      setPhone(accountPhone);
    }
  }, [accountPhone, phone]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const routeStatus = params.get("status");

    if (routeStatus) {
      window.history.replaceState({}, document.title, window.location.pathname);

      if (routeStatus === "success") {
        localStorage.removeItem(paystackPendingStorageKey);
        setIsProcessing(false);
        setPaymentReference(localStorage.getItem(paystackPendingStorageKey));
        setPaymentStatus("success");
        setShowPaymentResult(true);
        toast.success("Payment successful! Your wallet has been credited.");
      } else if (routeStatus === "failed") {
        localStorage.removeItem(paystackPendingStorageKey);
        setIsProcessing(false);
        setPaymentStatus("failed");
        setShowPaymentResult(true);
        toast.error("Payment failed. Please try again.");
      } else if (routeStatus === "pending") {
        const storedReference = localStorage.getItem(paystackPendingStorageKey);
        if (storedReference) {
          setPaystackReference(storedReference);
          setPaymentReference(storedReference);
          setShouldVerifyPaystack(true);
          setIsProcessing(true);
        }
      }
    }

    const storedMpesaTransactionId = localStorage.getItem(mpesaPendingStorageKey);
    if (storedMpesaTransactionId) {
      setPendingMpesaTransactionId(storedMpesaTransactionId);
      setPaymentReference(storedMpesaTransactionId);
      setIsProcessing(true);
    }
  }, []);

  useEffect(() => {
    if (!shouldVerifyPaystack || !paystackReference) return;

    const status = paystackVerificationQuery.data?.status;
    if (!status) return;

    if (status === "success") {
      localStorage.removeItem(paystackPendingStorageKey);
      setShouldVerifyPaystack(false);
      setIsProcessing(false);
      setPaymentStatus("success");
      setShowPaymentResult(true);
      toast.success("Payment confirmed! Your wallet has been credited.");
      return;
    }

    if (status === "failed" || status === "reversed") {
      localStorage.removeItem(paystackPendingStorageKey);
      setShouldVerifyPaystack(false);
      setIsProcessing(false);
      setPaymentStatus("failed");
      setShowPaymentResult(true);
      toast.error("Payment could not be confirmed.");
    }
  }, [paystackReference, paystackVerificationQuery.data?.status, shouldVerifyPaystack]);

  useEffect(() => {
    if (
      shouldVerifyPaystack &&
      paystackReference &&
      paystackVerificationQuery.isError &&
      paystackVerificationQuery.failureCount >= 10
    ) {
      localStorage.removeItem(paystackPendingStorageKey);
      setShouldVerifyPaystack(false);
      setIsProcessing(false);
      setPaymentStatus("failed");
      setShowPaymentResult(true);
      toast.error("Payment verification timed out. Please check again shortly.");
    }
  }, [
    paystackReference,
    paystackVerificationQuery.failureCount,
    paystackVerificationQuery.isError,
    shouldVerifyPaystack,
  ]);

  useEffect(() => {
    const status = mpesaStatusQuery.data?.status;
    if (!pendingMpesaTransactionId || !status) return;

    if (status === "COMPLETED") {
      localStorage.removeItem(mpesaPendingStorageKey);
      setPendingMpesaTransactionId(null);
      setIsProcessing(false);
      setPaymentReference(mpesaStatusQuery.data?.mpesaCode ?? pendingMpesaTransactionId);
      setPaymentStatus("success");
      setShowPaymentResult(true);
      toast.success("M-Pesa deposit received successfully.");
      return;
    }

    if (status === "FAILED" || status === "REVERSED") {
      const failureMessage = mpesaStatusQuery.data?.message;
      localStorage.removeItem(mpesaPendingStorageKey);
      setPendingMpesaTransactionId(null);
      setIsProcessing(false);
      setPaymentStatus("failed");
      setShowPaymentResult(true);
      toast.error(failureMessage || "M-Pesa payment failed.");
    }
  }, [
    mpesaStatusQuery.data?.message,
    mpesaStatusQuery.data?.mpesaCode,
    mpesaStatusQuery.data?.status,
    pendingMpesaTransactionId,
  ]);

  const onClose = () => {
    setShowPaymentResult(false);
    setPaymentStatus(null);
  };

  const onRetry = () => {
    if (pendingMpesaTransactionId) {
      setShowPaymentResult(false);
      setPaymentStatus(null);
      setIsProcessing(true);
      void mpesaStatusQuery.refetch();
      return;
    }

    if (paymentReference) {
      setShowPaymentResult(false);
      setPaymentStatus(null);
      setPaystackReference(paymentReference);
      setShouldVerifyPaystack(true);
      setIsProcessing(true);
      toast.loading("Checking payment status...");
    }
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeMethod) {
      toast.error("No deposit method is currently available.");
      return;
    }

    if (amountValue < 500) {
      toast.error("Minimum deposit is KES 500.");
      return;
    }

    if (activeMethod === "mpesa") {
      if (!phoneIsValid || !normalizedPhone) {
        toast.error("Use a valid M-Pesa number in the format 2547XXXXXXXX.");
        return;
      }

      setIsProcessing(true);

      try {
        const response = await mpesaInitializeMutation.mutateAsync({
          phone: normalizedPhone,
          amount: amountValue,
          accountReference: "BETWISE",
          description: "BetWise wallet deposit",
        });

        localStorage.setItem(mpesaPendingStorageKey, response.transactionId);
        setPendingMpesaTransactionId(response.transactionId);
        setPaymentReference(response.transactionId);
        toast.success(response.customerMessage ?? "STK push sent to your phone.", {
          description: `Approve KES ${formatMoney(amountValue)} on ${normalizedPhone}.`,
        });
      } catch (error: any) {
        setIsProcessing(false);
        const message =
          error?.response?.data?.message ??
          error?.response?.data?.error ??
          error?.message ??
          "Unable to start M-Pesa deposit.";
        toast.error(message);
      }

      return;
    }

    if (!user?.email) {
      toast.error("User email not found.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await paystackInitializeMutation.mutateAsync({
        email: user.email,
        amount: amountValue,
        metadata: { userId: user.id, source: "deposit-page" },
      });

      localStorage.setItem(paystackPendingStorageKey, response.reference);
      setPaystackReference(response.reference);
      setPaymentReference(response.reference);

      toast.loading("Redirecting to secure checkout...", {
        description: `Amount: KES ${formatMoney(amountValue)}`,
      });

      setTimeout(() => {
        window.location.assign(response.authorization_url);
      }, 500);
    } catch (error: any) {
      setIsProcessing(false);
      const message =
        error?.response?.data?.error ??
        error?.response?.data?.message ??
        error?.message ??
        "Unable to start payment";
      toast.error(message);
    }
  }

  const headerTitle =
    activeMethod === "mpesa" ? "M-Pesa Deposit" : activeMethod === "paystack" ? "Paystack" : "Deposits";
  const headerBadge =
    activeMethod === "mpesa" ? "Instant STK Push" : activeMethod === "paystack" ? "Powered by Paystack" : "Unavailable";
  const submitLabel =
    activeMethod === "mpesa" ? "Push to My Phone" : "Pay with Paystack";
  const processingMessage =
    activeMethod === "mpesa"
      ? "Waiting for your M-Pesa confirmation"
      : paystackReference
        ? "Confirming your Paystack payment"
        : "Preparing Paystack checkout";

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <PaymentLoadingModal
        isOpen={isProcessing}
        amount={amountValue}
        message={processingMessage}
      />
      <PaymentFeedbackModal
        isOpen={showPaymentResult && paymentStatus === "success"}
        status="success"
        title="Deposit Successful"
        message={
          activeMethod === "mpesa"
            ? "Your wallet has been credited after M-Pesa confirmation."
            : "Your wallet has been credited successfully."
        }
        onClose={onClose}
      />
      <PaymentFeedbackModal
        isOpen={showPaymentResult && paymentStatus === "failed"}
        status="failed"
        title="Deposit Failed"
        message={
          activeMethod === "mpesa"
            ? mpesaStatusQuery.data?.message ?? "Your M-Pesa payment could not be confirmed."
            : "Your payment could not be confirmed. Please try again."
        }
        onClose={onClose}
        onRetry={onRetry}
      />

      <article className="overflow-hidden rounded-[28px] border border-[#1c3650] bg-[#091422] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="border-b border-[#1c3650] bg-[radial-gradient(circle_at_top_left,_rgba(40,180,99,0.18),_transparent_38%),linear-gradient(135deg,#0d1c2c,#0a1724)] px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#31c46c]/20 bg-[#31c46c]/10 text-[#7ef0a8]">
                {activeMethod === "mpesa" ? (
                  <Smartphone className="h-5 w-5" />
                ) : (
                  <Wallet className="h-5 w-5" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{headerTitle}</h2>
                <p className="text-sm text-[#8eb2c9]">
                  Fast wallet top-ups with a smoother checkout flow.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#31c46c]/25 bg-[#31c46c]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8df6b2]">
                <ShieldCheck className="h-3.5 w-3.5" />
                {headerBadge}
              </span>
              <span className="rounded-full border border-[#284662] bg-[#0f1d2d] px-3 py-1 text-xs font-semibold text-[#d8ecfb]">
                Balance: KES {formatMoney(balance)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-5 px-6 py-6">
            {isPaymentMethodsLoading ? (
              <div className="rounded-3xl border border-[#27425d] bg-[#0d1b2a] p-6 text-center text-sm text-[#a8c4e0]">
                <p className="font-semibold text-white">Loading payment settings...</p>
                <p className="mt-2 text-[#7d95aa]">
                  Checking which deposit method is available for this account.
                </p>
              </div>
            ) : !activeMethod ? (
              <div className="rounded-3xl border border-[#7a2f36] bg-[#2a101e] p-6 text-center text-sm text-[#f2c7cb] shadow-inner">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#7a2f36]/10 text-[#f5a8ad]">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <p className="font-semibold text-white">Deposits are temporarily unavailable</p>
                <p className="mt-2 text-[#d7b1b8]">
                  No deposit gateway is enabled right now. Turn on M-Pesa or Paystack in admin settings to accept deposits here.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 rounded-3xl border border-[#1b3148] bg-[#0c1827] p-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#21405c] bg-[#0b1522] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#6e8ba3]">
                      Active Method
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {activeMethod === "mpesa" ? "M-Pesa STK Push" : "Paystack Checkout"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#21405c] bg-[#0b1522] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#6e8ba3]">
                      Minimum
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">KES 500</p>
                  </div>
                  <div className="rounded-2xl border border-[#21405c] bg-[#0b1522] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#6e8ba3]">
                      Status
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-base font-semibold text-[#8df6b2]">
                      <BadgeCheck className="h-4 w-4" />
                      Ready to deposit
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-widest text-[#5f7f98]">
                    Quick Select
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {quickAmounts.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAmount(String(value))}
                        className={`rounded-2xl border py-3 text-sm font-semibold transition-all duration-150 ${
                          amountValue === value
                            ? "border-[#31c46c] bg-[#31c46c]/10 text-[#8df6b2]"
                            : "border-[#1a2f45] bg-[#0f1d2e] text-[#8aa3ba] hover:border-[#31c46c]/35 hover:text-white"
                        }`}
                      >
                        KES {formatMoney(value)}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-widest text-[#5f7f98]">
                      Amount (KES)
                    </span>
                    <Input
                      value={amount}
                      onChange={(event) =>
                        setAmount(normalizeAmount(event.target.value))
                      }
                      inputMode="numeric"
                      type="text"
                      placeholder="Enter amount"
                      className="h-14 rounded-2xl border-[#1a2f45] bg-[#0f1d2e] text-lg text-white placeholder:text-[#2e4a63] transition-colors focus:border-[#31c46c] focus:ring-1 focus:ring-[#31c46c]"
                      disabled={!activeMethod}
                    />
                    <p className="text-xs text-[#5f7f98]">
                      Deposit directly into your wallet with instant status updates.
                    </p>
                  </label>

                  {activeMethod === "mpesa" && (
                    <label className="block space-y-2">
                      <span className="text-xs font-medium uppercase tracking-widest text-[#5f7f98]">
                        M-Pesa Number
                      </span>
                      <Input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        inputMode="tel"
                        type="tel"
                        placeholder="2547XXXXXXXX"
                        className="h-14 rounded-2xl border-[#1a2f45] bg-[#0f1d2e] text-base text-white placeholder:text-[#2e4a63] transition-colors focus:border-[#31c46c] focus:ring-1 focus:ring-[#31c46c]"
                      />
                      <p
                        className={`text-xs ${
                          phoneIsValid ? "text-[#5f7f98]" : "text-red-400"
                        }`}
                      >
                        {phoneIsValid
                          ? "We’ll send an STK prompt to this phone."
                          : "Use a valid Safaricom number like 2547XXXXXXXX."}
                      </p>
                    </label>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      !activeMethod ||
                      isProcessing ||
                      mpesaInitializeMutation.isPending ||
                      paystackInitializeMutation.isPending ||
                      (activeMethod === "mpesa" && !phoneIsValid)
                    }
                    className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#1ecb67] to-[#15a851] text-base font-bold text-[#04130a] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProcessing ? (
                      <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    ) : activeMethod === "mpesa" ? (
                      <Smartphone className="mr-2 h-5 w-5" />
                    ) : (
                      <Wallet className="mr-2 h-5 w-5" />
                    )}
                    {isProcessing ? "Processing..." : submitLabel}
                  </Button>
                </form>
              </>
            )}
          </div>

          <aside className="border-t border-[#1c3650] bg-[linear-gradient(180deg,#0c1725,#0a1320)] px-6 py-6 lg:border-t-0 lg:border-l">
            <div className="rounded-3xl border border-[#1f3951] bg-[#0d1b2a] p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#6e8ba3]">
                How It Works
              </p>
              <div className="mt-4 space-y-3 text-sm text-[#c4d8e8]">
                <div className="rounded-2xl border border-[#1a2f45] bg-[#09121d] p-4">
                  <p className="font-semibold text-white">1. Choose your amount</p>
                  <p className="mt-1 text-[#87a2b8]">
                    Pick a quick amount or enter your own wallet top-up value.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#1a2f45] bg-[#09121d] p-4">
                  <p className="font-semibold text-white">
                    {activeMethod === "mpesa" ? "2. Approve on your phone" : "2. Complete secure checkout"}
                  </p>
                  <p className="mt-1 text-[#87a2b8]">
                    {activeMethod === "mpesa"
                      ? "You’ll receive an STK prompt, enter your M-Pesa PIN, and we’ll keep checking automatically."
                      : "You’ll be redirected to Paystack, then brought back here when payment is confirmed."}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#1a2f45] bg-[#09121d] p-4">
                  <p className="font-semibold text-white">3. Wallet updates instantly</p>
                  <p className="mt-1 text-[#87a2b8]">
                    Successful deposits reflect in your BetWise wallet and transaction history.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#21405c] bg-[#0a1623] p-4">
                <p className="text-sm font-semibold text-white">Gateway Availability</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-xl border border-[#1a2f45] px-3 py-2 text-[#d4e8f6]">
                    <span>M-Pesa</span>
                    <span className={isMpesaEnabled ? "text-[#8df6b2]" : "text-[#f5a8ad]"}>
                      {isMpesaEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[#1a2f45] px-3 py-2 text-[#d4e8f6]">
                    <span>Paystack</span>
                    <span className={isPaystackEnabled ? "text-[#8df6b2]" : "text-[#f5a8ad]"}>
                      {isPaystackEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </article>
    </section>
  );
}
