import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  CreditCard,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentFeedbackModal } from "@/components/PaymentFeedbackModal";
import { PaymentLoadingModal } from "@/components/PaymentLoadingModal";
import { useAuth } from "@/context/AuthContext";
import { formatMoney } from "../data";
import { useEnabledPaymentMethods } from "../hooks/usePaymentMethods";
import {
  usePaystackInitialize,
  usePaystackVerification,
} from "../hooks/usePaystackPayment";
import {
  useMpesaDepositStatus,
  useMpesaInitialize,
} from "../hooks/useMpesaPayment";

const quickAmounts = [500, 1000, 2500, 5000];
const paystackPendingStorageKey = "betwise-paystack-pending-reference";
const mpesaPendingStorageKey = "betwise-mpesa-pending-transaction";
const mpesaLogoUrl =
  "https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg";

type DepositMethod = "mpesa" | "paystack";
type PaymentResult = "success" | "failed" | null;

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

  const normalizedPhone = useMemo(
    () => normalizePhone(user?.phone ?? ""),
    [user?.phone],
  );
  const hasValidMpesaPhone = isValidPhone(normalizedPhone);

  const [amounts, setAmounts] = useState<Record<DepositMethod, string>>({
    mpesa: "500",
    paystack: "500",
  });
  const [paymentStatus, setPaymentStatus] = useState<PaymentResult>(null);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMethod, setProcessingMethod] =
    useState<DepositMethod | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [shouldVerifyPaystack, setShouldVerifyPaystack] = useState(false);
  const [paystackReference, setPaystackReference] = useState<string | null>(
    null,
  );
  const [pendingMpesaTransactionId, setPendingMpesaTransactionId] = useState<
    string | null
  >(null);
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod | null>(
    null,
  );

  const mpesaAmount = Number(amounts.mpesa) || 0;
  const paystackAmount = Number(amounts.paystack) || 0;

  const paystackVerificationQuery = usePaystackVerification(
    shouldVerifyPaystack ? paystackReference : null,
  );
  const mpesaStatusQuery = useMpesaDepositStatus(pendingMpesaTransactionId);

  const isPaymentMethodsLoading = enabledMethodsQuery.isLoading;
  const isMpesaEnabled = enabledMethodsQuery.data?.mpesa ?? false;
  const isPaystackEnabled = enabledMethodsQuery.data?.paystack ?? false;
  const enabledDepositMethods = useMemo(() => {
    const methods: DepositMethod[] = [];

    if (isMpesaEnabled) {
      methods.push("mpesa");
    }

    if (isPaystackEnabled) {
      methods.push("paystack");
    }

    return methods;
  }, [isMpesaEnabled, isPaystackEnabled]);
  const showMethodToggle = enabledDepositMethods.length > 1;
  const activeMethod =
    selectedMethod && enabledDepositMethods.includes(selectedMethod)
      ? selectedMethod
      : (enabledDepositMethods[0] ?? null);

  useEffect(() => {
    if (enabledDepositMethods.length === 0) {
      if (selectedMethod !== null) {
        setSelectedMethod(null);
      }
      return;
    }

    if (!selectedMethod || !enabledDepositMethods.includes(selectedMethod)) {
      setSelectedMethod(enabledDepositMethods[0]);
    }
  }, [enabledDepositMethods, selectedMethod]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const routeStatus = params.get("status");

    if (routeStatus) {
      const storedReference = localStorage.getItem(paystackPendingStorageKey);
      window.history.replaceState({}, document.title, window.location.pathname);

      if (routeStatus === "success") {
        localStorage.removeItem(paystackPendingStorageKey);
        setProcessingMethod("paystack");
        setIsProcessing(false);
        setPaymentReference(storedReference);
        setPaymentStatus("success");
        setShowPaymentResult(true);
        toast.success("Payment successful! Your wallet has been credited.");
      } else if (routeStatus === "failed") {
        localStorage.removeItem(paystackPendingStorageKey);
        setProcessingMethod("paystack");
        setIsProcessing(false);
        setPaymentReference(storedReference);
        setPaymentStatus("failed");
        setShowPaymentResult(true);
        toast.error("Payment failed. Please try again.");
      } else if (routeStatus === "pending" && storedReference) {
        setProcessingMethod("paystack");
        setPaystackReference(storedReference);
        setPaymentReference(storedReference);
        setShouldVerifyPaystack(true);
        setIsProcessing(true);
      }
    }

    const storedMpesaTransactionId = localStorage.getItem(
      mpesaPendingStorageKey,
    );
    if (storedMpesaTransactionId) {
      setProcessingMethod("mpesa");
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
      toast.error(
        "Payment verification timed out. Please check again shortly.",
      );
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

  const onCancelProcessing = () => {
    if (processingMethod === "mpesa") {
      localStorage.removeItem(mpesaPendingStorageKey);
      setPendingMpesaTransactionId(null);
      setPaymentReference(null);
      setIsProcessing(false);
      setShowPaymentResult(false);
      setPaymentStatus(null);
      toast.message("M-Pesa confirmation dismissed.", {
        description:
          "You can still complete the prompt on your phone and retry from the deposit page if needed.",
      });
      return;
    }

    if (processingMethod === "paystack") {
      localStorage.removeItem(paystackPendingStorageKey);
      setShouldVerifyPaystack(false);
      setPaystackReference(null);
      setPaymentReference(null);
      setIsProcessing(false);
      setShowPaymentResult(false);
      setPaymentStatus(null);
      toast.message("Paystack confirmation dismissed.");
    }
  };

  const onRetry = () => {
    if (processingMethod === "mpesa" && pendingMpesaTransactionId) {
      setShowPaymentResult(false);
      setPaymentStatus(null);
      setIsProcessing(true);
      void mpesaStatusQuery.refetch();
      return;
    }

    if (processingMethod === "paystack" && paymentReference) {
      setShowPaymentResult(false);
      setPaymentStatus(null);
      setPaystackReference(paymentReference);
      setShouldVerifyPaystack(true);
      setIsProcessing(true);
      toast.loading("Checking payment status...");
    }
  };

  function setMethodAmount(method: DepositMethod, value: string) {
    setAmounts((current) => ({
      ...current,
      [method]: value,
    }));
  }

  async function onSubmit(
    method: DepositMethod,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const amountValue = Number(amounts[method]) || 0;

    if (amountValue < 500) {
      toast.error("Minimum deposit is KES 500.");
      return;
    }

    setProcessingMethod(method);

    if (method === "mpesa") {
      if (!isMpesaEnabled) {
        toast.error("M-Pesa deposits are currently disabled.");
        return;
      }

      if (!hasValidMpesaPhone) {
        toast.error(
          "Your account phone number is not valid for M-Pesa. Update your profile first.",
        );
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
        toast.success(
          response.customerMessage ?? "STK push sent to your phone.",
          {
            description: `Approve KES ${formatMoney(amountValue)} on your phone.`,
          },
        );
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

    if (!isPaystackEnabled) {
      toast.error("Paystack deposits are currently disabled.");
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

  const processingAmount =
    processingMethod === "mpesa"
      ? mpesaAmount
      : processingMethod === "paystack"
        ? paystackAmount
        : undefined;
  const processingMessage =
    processingMethod === "mpesa"
      ? "Waiting for your M-Pesa confirmation"
      : paystackReference
        ? "Confirming your Paystack payment"
        : "Preparing Paystack checkout";

  const getMethodLabel = (method: DepositMethod) =>
    method === "mpesa" ? "M-Pesa" : "Paystack";

  const renderDepositCard = (method: DepositMethod) => {
    const isMpesa = method === "mpesa";
    const isEnabled = isMpesa ? isMpesaEnabled : isPaystackEnabled;
    const amount = amounts[method];
    const amountValue = Number(amount) || 0;
    const isBusy =
      isProcessing && processingMethod === method
        ? true
        : isMpesa
          ? mpesaInitializeMutation.isPending
          : paystackInitializeMutation.isPending;

    return (
      <article
        key={method}
        className="overflow-hidden rounded-3xl border border-[#1a2f45] bg-[#0b1421] shadow-2xl"
      >
        <div className="border-b border-[#1a2f45] bg-[#0d1829] px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isMpesa ? (
                <img
                  src={mpesaLogoUrl}
                  alt="M-Pesa"
                  className="h-9 w-auto object-contain"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f5c518]/20 bg-[#f5c518]/10">
                  <CreditCard className="h-4 w-4 text-[#f5c518]" />
                </div>
              )}
              <span className="text-base font-bold text-white">
                {!isMpesa && "Paystack"}
              </span>
            </div>
            {!isMpesa && (
              <span className="flex items-center gap-1.5 rounded-full border border-[#f5c518]/20 bg-[#f5c518]/10 px-3 py-1 text-[11px] font-semibold text-[#f5c518]">
                <ShieldCheck className="h-3 w-3" />
                Powered by Paystack
              </span>
            )}
          </div>
        </div>

        <div className="space-y-5 px-7 py-6">
          {!isEnabled ? (
            <div className="rounded-3xl border border-[#7a2f36] bg-[#2a101e] p-6 text-center text-sm text-[#f2c7cb] shadow-inner">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#7a2f36]/10 text-[#f5a8ad]">
                <AlertCircle className="h-7 w-7" />
              </div>
              <p className="font-semibold text-white">
                {isMpesa ? "M-Pesa is disabled" : "Paystack is disabled"}
              </p>
              <p className="mt-2 text-[#d7b1b8]">
                {isMpesa
                  ? "M-Pesa deposits are currently turned off by the administrator."
                  : "Paystack deposits are currently turned off by the administrator."}
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
                      onClick={() => setMethodAmount(method, String(value))}
                      className={`rounded-xl border py-2.5 text-xs font-semibold transition-all duration-150 ${
                        amountValue === value
                          ? "border-[#f5c518] bg-[#f5c518]/10 text-[#f5c518]"
                          : "border-[#1a2f45] bg-[#0f1d2e] text-[#7a94ad] hover:border-[#f5c518]/30 hover:text-white"
                      }`}
                    >
                      {formatMoney(value)}
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(event) => void onSubmit(method, event)}
                className="space-y-4"
              >
                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-[#3d5a73]">
                    Amount (KES)
                  </span>
                  <Input
                    value={amount}
                    onChange={(event) =>
                      setMethodAmount(
                        method,
                        normalizeAmount(event.target.value),
                      )
                    }
                    inputMode="numeric"
                    type="text"
                    placeholder="Enter amount"
                    className="h-14 rounded-2xl border-[#1a2f45] bg-[#0f1d2e] text-lg text-white placeholder:text-[#2e4a63] transition-colors focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518]"
                  />
                  <p className="text-xs text-[#3d5a73]">
                    Minimum deposit: KES 500
                  </p>
                </label>

                {isMpesa && !hasValidMpesaPhone && (
                  <p className="text-xs text-red-400">
                    Your account phone number is not valid for M-Pesa deposits.
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isBusy || (isMpesa && !hasValidMpesaPhone)}
                  className="h-14 w-full rounded-2xl bg-[#f5c518] text-base font-bold text-black transition-colors hover:bg-[#e6b800] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy && (
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {isBusy
                    ? "Processing..."
                    : isMpesa
                      ? "Pay with M-Pesa"
                      : "Pay with Paystack"}
                </Button>
              </form>
            </>
          )}
        </div>
      </article>
    );
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 lg:relative">
      <PaymentLoadingModal
        isOpen={isProcessing}
        amount={processingAmount}
        message={processingMessage}
        onCancel={onCancelProcessing}
        cancelLabel={processingMethod === "mpesa" ? "Cancel Waiting" : "Close"}
      />

      <PaymentFeedbackModal
        isOpen={
          processingMethod === "mpesa" &&
          showPaymentResult &&
          paymentStatus === "success"
        }
        status="success"
        title="M-Pesa Deposit Successful"
        message="Your wallet has been credited after M-Pesa confirmation."
        onClose={onClose}
      />
      <PaymentFeedbackModal
        isOpen={
          processingMethod === "mpesa" &&
          showPaymentResult &&
          paymentStatus === "failed"
        }
        status="failed"
        title="M-Pesa Deposit Failed"
        message={
          mpesaStatusQuery.data?.message ??
          "Your M-Pesa payment could not be confirmed."
        }
        onClose={onClose}
        onRetry={onRetry}
      />
      <PaymentFeedbackModal
        isOpen={
          processingMethod === "paystack" &&
          showPaymentResult &&
          paymentStatus === "success"
        }
        status="success"
        title="Paystack Deposit Successful"
        message="Your wallet has been credited successfully."
        onClose={onClose}
      />
      <PaymentFeedbackModal
        isOpen={
          processingMethod === "paystack" &&
          showPaymentResult &&
          paymentStatus === "failed"
        }
        status="failed"
        title="Paystack Deposit Failed"
        message="Your payment could not be confirmed. Please try again."
        onClose={onClose}
        onRetry={onRetry}
      />

      {isPaymentMethodsLoading ? (
        <div className="mx-auto max-w-md rounded-3xl border border-[#3d5a73] bg-[#101c2a] p-6 text-center text-sm text-[#a8c4e0] shadow-inner">
          <p className="font-semibold text-white">
            Loading payment settings...
          </p>
          <p className="mt-2 text-[#8a9bb0]">
            Checking available deposit methods. Please wait a moment.
          </p>
        </div>
      ) : !isMpesaEnabled && !isPaystackEnabled ? (
        <div className="mx-auto max-w-md rounded-3xl border border-[#7a2f36] bg-[#2a101e] p-6 text-center text-sm text-[#f2c7cb] shadow-inner">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#7a2f36]/10 text-[#f5a8ad]">
            <AlertCircle className="h-7 w-7" />
          </div>
          <p className="font-semibold text-white">Deposits are unavailable</p>
          <p className="mt-2 text-[#d7b1b8]">
            No deposit method is enabled right now. Please try again later or
            contact support.
          </p>
        </div>
      ) : activeMethod ? (
        <div className="space-y-4">
          {showMethodToggle ? (
            <>
              <div className="flex justify-center lg:hidden">
                <div className="inline-flex w-full max-w-md rounded-2xl border border-[#23415d] bg-[#08111d] p-1.5 shadow-[0_18px_40px_rgba(4,12,22,0.35)]">
                  {enabledDepositMethods.map((method) => {
                    const isActive = method === activeMethod;

                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSelectedMethod(method)}
                        className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                          isActive
                            ? "bg-[#f5c518] text-black shadow-[0_10px_30px_rgba(245,197,24,0.2)]"
                            : "text-[#8ea6bb] hover:bg-[#102134] hover:text-white"
                        }`}
                      >
                        {getMethodLabel(method)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="hidden lg:absolute lg:right-4 lg:top-8 lg:block">
                <div className="inline-flex rounded-2xl border border-[#23415d] bg-[#08111d] p-1.5 shadow-[0_18px_40px_rgba(4,12,22,0.35)]">
                  {enabledDepositMethods.map((method) => {
                    const isActive = method === activeMethod;

                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSelectedMethod(method)}
                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 min-w-[150px] ${
                          isActive
                            ? "bg-[#f5c518] text-black shadow-[0_10px_30px_rgba(245,197,24,0.2)]"
                            : "text-[#8ea6bb] hover:bg-[#102134] hover:text-white"
                        }`}
                      >
                        {getMethodLabel(method)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-center lg:justify-end">
              <div className="inline-flex items-center rounded-full border border-[#f5c518]/20 bg-[#f5c518]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#f5c518]">
                {getMethodLabel(activeMethod)} enabled
              </div>
            </div>
          )}

          <div className="mx-auto w-full max-w-5xl">
            {renderDepositCard(activeMethod)}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-md rounded-3xl border border-[#7a2f36] bg-[#2a101e] p-6 text-center text-sm text-[#f2c7cb] shadow-inner">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#7a2f36]/10 text-[#f5a8ad]">
            <AlertCircle className="h-7 w-7" />
          </div>
          <p className="font-semibold text-white">
            Unable to load deposit mode
          </p>
          <p className="mt-2 text-[#d7b1b8]">
            Please refresh the page and try again.
          </p>
        </div>
      )}
    </section>
  );
}
