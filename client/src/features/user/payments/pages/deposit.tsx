import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  Banknote,
  Check,
  ChevronDown,
  CreditCard,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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


const paystackPendingStorageKey = "betwise-paystack-pending-reference";
const paystackLogoUrl = "/images/paystack.svg";
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
  const minDeposit = enabledMethodsQuery.data?.limits.minDeposit ?? 500;
  const quickAmounts = useMemo(
    () => [minDeposit, minDeposit * 2, minDeposit * 5, minDeposit * 10],
    [minDeposit],
  );

  const [amounts, setAmounts] = useState<Record<DepositMethod, string>>({
    mpesa: String(minDeposit),
    paystack: String(minDeposit),
  });
  useEffect(() => {
    if (enabledMethodsQuery.data?.limits.minDeposit) {
      const min = String(enabledMethodsQuery.data.limits.minDeposit);
      setAmounts({
        mpesa: min,
        paystack: min,
      });
    }
  }, [enabledMethodsQuery.data?.limits.minDeposit]);

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
  const [isMethodMenuOpen, setIsMethodMenuOpen] = useState(false);
  const [isMethodMenuPreparing, setIsMethodMenuPreparing] = useState(false);
  const methodMenuTimerRef = useRef<number | null>(null);

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

  useEffect(
    () => () => {
      if (methodMenuTimerRef.current !== null) {
        window.clearTimeout(methodMenuTimerRef.current);
      }
    },
    [],
  );

  const onMethodMenuOpenChange = (open: boolean) => {
    if (methodMenuTimerRef.current !== null) {
      window.clearTimeout(methodMenuTimerRef.current);
      methodMenuTimerRef.current = null;
    }

    setIsMethodMenuOpen(open);

    if (!open) {
      setIsMethodMenuPreparing(false);
      return;
    }

    // Open immediately, then briefly show feedback without blocking the menu.
    setIsMethodMenuPreparing(true);
    methodMenuTimerRef.current = window.setTimeout(() => {
      setIsMethodMenuPreparing(false);
      methodMenuTimerRef.current = null;
    }, 20);
  };

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
    if (processingMethod === "mpesa") {
      // If we have a pending transaction and it's NOT failed, try re-verifying
      if (pendingMpesaTransactionId && paymentStatus !== "failed") {
        setShowPaymentResult(false);
        setPaymentStatus(null);
        setIsProcessing(true);
        void mpesaStatusQuery.refetch();
        return;
      }

      // Otherwise (it failed or ID was cleared), trigger a NEW deposit
      const amountValue = Number(amounts.mpesa) || 0;
      if (amountValue > 0) {
        void handleMpesaDeposit(amountValue);
      }
      return;
    }

    if (processingMethod === "paystack") {
      // If we have a reference and it's NOT failed, try re-verifying
      if (paymentReference && paymentStatus !== "failed") {
        setShowPaymentResult(false);
        setPaymentStatus(null);
        setPaystackReference(paymentReference);
        setShouldVerifyPaystack(true);
        setIsProcessing(true);
        toast.loading("Checking payment status...");
        return;
      }

      // Otherwise (it failed), trigger a NEW deposit
      const amountValue = Number(amounts.paystack) || 0;
      if (amountValue > 0) {
        void handlePaystackDeposit(amountValue);
      }
    }
  };

  const handleMpesaDeposit = async (amount: number) => {
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

    setProcessingMethod("mpesa");
    setIsProcessing(true);
    setShowPaymentResult(false);
    setPaymentStatus(null);

    try {
      const response = await mpesaInitializeMutation.mutateAsync({
        phone: normalizedPhone,
        amount: amount,
        accountReference: "BETWISE",
        description: "BetWise wallet deposit",
      });

      localStorage.setItem(mpesaPendingStorageKey, response.transactionId);
      setPendingMpesaTransactionId(response.transactionId);
      setPaymentReference(response.transactionId);
      toast.success(
        response.customerMessage ?? "STK push sent to your phone.",
        {
          description: `Approve KES ${formatMoney(amount)} on your phone.`,
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
  };

  const handlePaystackDeposit = async (amount: number) => {
    if (!isPaystackEnabled) {
      toast.error("Paystack deposits are currently disabled.");
      return;
    }

    if (!user?.email) {
      toast.error("User email not found.");
      return;
    }

    setProcessingMethod("paystack");
    setIsProcessing(true);
    setShowPaymentResult(false);
    setPaymentStatus(null);

    try {
      const response = await paystackInitializeMutation.mutateAsync({
        email: user.email,
        amount: amount,
        metadata: { userId: user.id, source: "deposit-page" },
      });

      localStorage.setItem(paystackPendingStorageKey, response.reference);
      setPaystackReference(response.reference);
      setPaymentReference(response.reference);

      toast.loading("Redirecting to secure checkout...", {
        description: `Amount: KES ${formatMoney(amount)}`,
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

    const minDeposit = enabledMethodsQuery.data?.limits.minDeposit ?? 500;
    const maxDeposit = enabledMethodsQuery.data?.limits.maxDeposit ?? 200000;

    if (amountValue < minDeposit) {
      toast.error(`Minimum deposit is KES ${minDeposit.toLocaleString()}.`);
      return;
    }

    if (amountValue > maxDeposit) {
      toast.error(`Maximum deposit is KES ${maxDeposit.toLocaleString()}.`);
      return;
    }

    if (method === "mpesa") {
      await handleMpesaDeposit(amountValue);
    } else {
      await handlePaystackDeposit(amountValue);
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

  const getMethodIcon = (method: DepositMethod, className = "h-4 w-4") =>
    method === "mpesa" ? (
      <Smartphone className={className} />
    ) : (
      <CreditCard className={className} />
    );

  const renderMethodDropdown = (align: "center" | "end") => (
    <DropdownMenu
      open={isMethodMenuOpen}
      onOpenChange={onMethodMenuOpenChange}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-[156px] min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border border-[#23415d] bg-[#08111d] px-2.5 text-left shadow-[0_10px_20px_rgba(4,12,22,0.2)] transition-colors hover:border-[#32597d]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#f5c518]/15 bg-[#f5c518]/10 text-[#f5c518]">
              {getMethodIcon(activeMethod!, "h-3.5 w-3.5")}
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#69839c]">
                Method
              </span>
              <span className="mt-0.5 block truncate text-[13px] font-semibold text-white">
                {getMethodLabel(activeMethod!)}
              </span>
            </span>
          </span>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#102134] text-[#f5c518]">
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        forceMount
        align={align}
        sideOffset={2}
        className="w-48 rounded-2xl border border-[#23415d] bg-[#08111d] p-2 text-white shadow-[0_10px_20px_rgba(4,12,22,0.24)] data-[state=open]:animate-none data-[state=closed]:animate-none"
      >
        {isMethodMenuPreparing ? (
          <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-medium text-[#9fb4c9]">
            <LoaderCircle className="h-4 w-4 animate-spin text-[#f5c518]" />
            Loading methods...
          </div>
        ) : (
          enabledDepositMethods.map((method) => {
            const isActive = method === activeMethod;

            return (
              <DropdownMenuItem
                key={method}
                onClick={() => setSelectedMethod(method)}
                className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-[#dce7f2] outline-none transition-colors focus:bg-[#102134] focus:text-white"
              >
                <span>{getMethodLabel(method)}</span>
                {isActive ? <Check className="h-4 w-4 text-[#f5c518]" /> : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {isMpesa ? (
                <img
                  src={mpesaLogoUrl}
                  alt="M-Pesa"
                  className="h-12 w-auto object-contain"
                />
              ) : (

                  <img src={paystackLogoUrl} alt="Paystack" className="h-10 w-auto object-contain" />

              )}
              <span className="text-base font-bold text-white">
                {!isMpesa && ""}
              </span>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
              {showMethodToggle
                ? renderMethodDropdown("end")
                : !isMpesa && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c518]/15 bg-[#f5c518]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f5c518]">
                      <ShieldCheck className="h-3 w-3" />
                      Secure
                    </span>
                  )}
            </div>
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
                      className={`rounded-xl border py-2 text-xs font-semibold transition-all duration-150 ${
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
                  <div className="relative">
                    <Banknote className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d5a73]" />
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
                      className="h-12 rounded-2xl border-[#1a2f45] bg-[#0f1d2e] pl-10 text-base text-white placeholder:text-[#2e4a63] transition-colors focus:border-[#f5c518] focus:ring-1 focus:ring-[#f5c518]"
                    />
                  </div>
                  <p className="text-xs text-[#3d5a73]">
                    Minimum deposit: KES {(enabledMethodsQuery.data?.limits.minDeposit ?? 500).toLocaleString()}
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
                  className="h-12 w-full rounded-2xl bg-[#f5c518] text-sm font-bold text-black transition-colors hover:bg-[#e6b800] disabled:cursor-not-allowed disabled:opacity-60"
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
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
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
        <div className="mx-auto w-full max-w-[700px] overflow-hidden rounded-3xl border border-[#1a2f45] bg-[#0b1421] shadow-2xl">
          <div className="border-b border-[#1a2f45] bg-[#0d1829] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-xl bg-[#14263a]" />
                <div className="space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-[#14263a]" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-[#122034]" />
                </div>
              </div>
              <div className="h-10 w-[156px] animate-pulse rounded-xl bg-[#14263a]" />
            </div>
          </div>
          <div className="space-y-4 px-7 py-6">
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`deposit-quick-skeleton-${index}`}
                  className="h-8 animate-pulse rounded-xl bg-[#122034]"
                />
              ))}
            </div>
            <div className="h-12 animate-pulse rounded-2xl bg-[#122034]" />
            <div className="h-12 animate-pulse rounded-2xl bg-[#f5c518]/30" />
          </div>
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
          <div className="mx-auto w-full max-w-[700px]">
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
