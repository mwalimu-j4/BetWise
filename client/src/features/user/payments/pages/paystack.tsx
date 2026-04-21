import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
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
  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);
  const phoneIsValid =
    normalizedPhone.length === 0 || isValidPhone(normalizedPhone);

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
      const storedReference = localStorage.getItem(paystackPendingStorageKey);
      window.history.replaceState({}, document.title, window.location.pathname);

      if (routeStatus === "success") {
        localStorage.removeItem(paystackPendingStorageKey);
        setIsProcessing(false);
        setPaymentReference(storedReference);
        setPaymentStatus("success");
        setShowPaymentResult(true);
        toast.success("Payment successful! Your wallet has been credited.");
      } else if (routeStatus === "failed") {
        localStorage.removeItem(paystackPendingStorageKey);
        setIsProcessing(false);
        setPaymentReference(storedReference);
        setPaymentStatus("failed");
        setShowPaymentResult(true);
        toast.error("Payment failed. Please try again.");
      } else if (routeStatus === "pending" && storedReference) {
        setPaystackReference(storedReference);
        setPaymentReference(storedReference);
        setShouldVerifyPaystack(true);
        setIsProcessing(true);
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
  }, [
    paystackReference,
    paystackVerificationQuery.data?.status,
    shouldVerifyPaystack,
  ]);

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
      setPaymentReference(
        mpesaStatusQuery.data?.mpesaCode ?? pendingMpesaTransactionId,
      );
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
    activeMethod === "mpesa"
      ? "M-Pesa"
      : activeMethod === "paystack"
        ? "Paystack"
        : "Deposits";
  const headerBadge =
    activeMethod === "mpesa"
      ? "Powered by M-Pesa"
      : activeMethod === "paystack"
        ? "Powered by Paystack"
        : "Unavailable";
  const submitLabel =
    activeMethod === "mpesa" ? "Push to My Phone" : "Pay with Paystack";
  const processingMessage =
    activeMethod === "mpesa"
      ? "Waiting for your M-Pesa confirmation"
      : paystackReference
        ? "Confirming your Paystack payment"
        : "Preparing Paystack checkout";

  return (
    <section className="mx-auto max-w-md px-4 py-8">
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
            ? mpesaStatusQuery.data?.message ??
              "Your M-Pesa payment could not be confirmed."
            : "Your payment could not be confirmed. Please try again."
        }
        onClose={onClose}
        onRetry={onRetry}
      />

      <article className="overflow-hidden rounded-3xl border border-[#1a2f45] bg-[#0b1421] shadow-2xl">
        <div className="border-b border-[#1a2f45] bg-[#0d1829] px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">
                {headerTitle}
              </span>
            </div>
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                activeMethod === "mpesa"
                  ? "border-[#31c46c]/20 bg-[#31c46c]/10 text-[#7ef0a8]"
                  : "border-[#f5c518]/20 bg-[#f5c518]/10 text-[#f5c518]"
              }`}
            >
              {activeMethod === "mpesa" ? (
                <img
                  src="/images/mpesa/logo.png"
                  alt="M-Pesa"
                  className="h-3.5 w-auto object-contain"
                />
              ) : (
                <ShieldCheck className="h-3 w-3" />
              )}
              {headerBadge}
            </span>
          </div>
        </div>

        <div className="space-y-5 px-7 py-6">
          {isPaymentMethodsLoading ? (
            <div className="rounded-3xl border border-[#3d5a73] bg-[#101c2a] p-6 text-center text-sm text-[#a8c4e0] shadow-inner">
              <p className="font-semibold text-white">
                Loading payment settings...
              </p>
              <p className="mt-2 text-[#8a9bb0]">
                Checking available deposit methods. Please wait a moment.
              </p>
            </div>
          ) : !activeMethod ? (
            <div className="rounded-3xl border border-[#7a2f36] bg-[#2a101e] p-6 text-center text-sm text-[#f2c7cb] shadow-inner">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#7a2f36]/10 text-[#f5a8ad]">
                <AlertCircle className="h-7 w-7" />
              </div>
              <p className="font-semibold text-white">
                Deposits are unavailable
              </p>
              <p className="mt-2 text-[#d7b1b8]">
                No deposit method is enabled right now. Please try again later
                or contact support.
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2.5 text-xs font-medium uppercase tracking-widest text-[#3d5a73]">
                  Quick Select
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(String(value))}
                      className={`rounded-xl border py-2.5 text-xs font-semibold transition-all duration-150 ${
                        amountValue === value
                          ? activeMethod === "mpesa"
                            ? "border-[#31c46c] bg-[#31c46c]/10 text-[#7ef0a8]"
                            : "border-[#f5c518] bg-[#f5c518]/10 text-[#f5c518]"
                          : "border-[#1a2f45] bg-[#0f1d2e] text-[#7a94ad] hover:border-[#31c46c]/30 hover:text-white"
                      }`}
                    >
                      {formatMoney(value)}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-[#3d5a73]">
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
                    className={`h-14 rounded-2xl border bg-[#0f1d2e] text-lg text-white placeholder:text-[#2e4a63] transition-colors ${
                      activeMethod === "mpesa"
                        ? "border-[#1a2f45] focus:border-[#31c46c] focus:ring-1 focus:ring-[#31c46c]"
                        : "border-[#1a2f45] focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518]"
                    }`}
                    disabled={!activeMethod}
                  />
                  <p className="text-xs text-[#3d5a73]">
                    Minimum deposit: KES 500
                  </p>
                </label>

                {activeMethod === "mpesa" && (
                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-widest text-[#3d5a73]">
                      M-Pesa Number
                    </span>
                    <Input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      inputMode="tel"
                      type="tel"
                      placeholder="2547XXXXXXXX"
                      className="h-14 rounded-2xl border border-[#1a2f45] bg-[#0f1d2e] text-base text-white placeholder:text-[#2e4a63] transition-colors focus:border-[#31c46c] focus:ring-1 focus:ring-[#31c46c]"
                    />
                    <p
                      className={`text-xs ${
                        phoneIsValid ? "text-[#3d5a73]" : "text-red-400"
                      }`}
                    >
                      {phoneIsValid
                        ? "We'll send the STK push to this number."
                        : "Use a valid M-Pesa number like 2547XXXXXXXX."}
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
                  className={`h-14 w-full rounded-2xl text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    activeMethod === "mpesa"
                      ? "bg-[#31c46c] text-[#06150c] hover:bg-[#28b35e]"
                      : "bg-[#f5c518] text-black hover:bg-[#e6b800]"
                  }`}
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

              {activeMethod === "mpesa" && (
                <div className="rounded-3xl border border-[#1f6f42] bg-[#0d2015] p-4 text-sm text-[#b9efd0] shadow-inner">
                  <p className="font-semibold text-white">
                    Complete payment on your phone
                  </p>
                  <p className="mt-2 text-[#9bd9b6]">
                    After tapping the button, an M-Pesa prompt will appear on
                    your phone. Enter your PIN to finish the deposit.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </article>
    </section>
  );
}
