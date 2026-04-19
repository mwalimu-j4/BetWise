import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { LoaderCircle, ShieldCheck, Wallet } from "lucide-react";
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

const quickAmounts = [500, 1000, 2500, 5000];
const pendingStorageKey = "betwise-mpesa-pending-reference";

function normalizeAmount(value: string) {
  return value.replace(/[^\d]/g, "");
}

export default function MpesaDepositPage() {
  const { user } = useAuth();
  const initializeMutation = usePaystackInitialize();
  const [verificationReference, setVerificationReference] = useState<
    string | null
  >(null);
  const [amount, setAmount] = useState("500");
  const [paymentStatus, setPaymentStatus] = useState<
    "success" | "failed" | null
  >(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldVerify, setShouldVerify] = useState(false);
  const verificationQuery = usePaystackVerification(
    shouldVerify ? verificationReference : null,
  );

  const amountValue = useMemo(() => Number(amount) || 0, [amount]);

  useEffect(() => {
    const handleCallback = () => {
      const params = new URLSearchParams(window.location.search);
      const routeStatus = params.get("status");

      if (!routeStatus) {
        localStorage.removeItem(pendingStorageKey);
        return;
      }

      window.history.replaceState({}, document.title, window.location.pathname);

      if (routeStatus === "success") {
        setPaymentStatus("success");
        setShowPaymentResult(true);
        setIsProcessing(false);
        localStorage.removeItem(pendingStorageKey);
        toast.success("Payment successful! Your wallet has been credited.");
      } else if (routeStatus === "failed") {
        setPaymentStatus("failed");
        setShowPaymentResult(true);
        setIsProcessing(false);
        localStorage.removeItem(pendingStorageKey);
        toast.error("Payment failed. Please try again.");
      } else if (routeStatus === "pending") {
        setIsProcessing(true);
        const storedReference = localStorage.getItem(pendingStorageKey);
        if (storedReference) {
          setVerificationReference(storedReference);
          setPaymentReference(storedReference);
          setShouldVerify(true);
        } else {
          setIsProcessing(false);
        }
      }
    };

    handleCallback();
  }, []);

  useEffect(() => {
    if (!shouldVerify || !verificationReference) return;
    const status = verificationQuery.data?.status;
    if (!status) return;

    if (status === "success") {
      localStorage.removeItem(pendingStorageKey);
      setPaymentStatus("success");
      setShowPaymentResult(true);
      setIsProcessing(false);
      setShouldVerify(false);
      toast.success("Payment confirmed! Your wallet has been credited.");
      return;
    }
    if (status === "failed" || status === "reversed") {
      localStorage.removeItem(pendingStorageKey);
      setPaymentStatus("failed");
      setShowPaymentResult(true);
      setIsProcessing(false);
      setShouldVerify(false);
      toast.error("Payment could not be confirmed.");
      return;
    }
    if (status === "pending") {
      setIsProcessing(true);
    }
  }, [verificationQuery.data?.status, shouldVerify, verificationReference]);

  useEffect(() => {
    if (
      shouldVerify &&
      verificationReference &&
      verificationQuery.isError &&
      verificationQuery.failureCount >= 10
    ) {
      localStorage.removeItem(pendingStorageKey);
      setPaymentStatus("failed");
      setShowPaymentResult(true);
      setIsProcessing(false);
      setShouldVerify(false);
      toast.error(
        "Payment verification timed out. Please check your transaction status.",
      );
    }
  }, [
    verificationQuery.isError,
    verificationQuery.failureCount,
    shouldVerify,
    verificationReference,
  ]);

  const onClose = () => {
    setShowPaymentResult(false);
    setPaymentReference(null);
    setPaymentStatus(null);
    setShouldVerify(false);
  };

  const onRetry = () => {
    if (paymentReference) {
      setShowPaymentResult(false);
      setPaymentStatus(null);
      setVerificationReference(paymentReference);
      setShouldVerify(true);
      setIsProcessing(true);
      toast.loading("Checking payment status...");
    }
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.email) {
      toast.error("User email not found.");
      return;
    }
    if (amountValue < 500) {
      toast.error("Minimum deposit is KES 500.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await initializeMutation.mutateAsync({
        email: user.email,
        amount: amountValue,
        metadata: { userId: user.id, source: "mpesa-deposit-page" },
      });

      localStorage.setItem(pendingStorageKey, response.reference);
      setVerificationReference(response.reference);
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

  return (
    <section className="mx-auto max-w-md px-4 py-8">
      <PaymentLoadingModal
        isOpen={isProcessing}
        amount={amountValue}
        message={
          verificationReference
            ? "Confirming your M-Pesa payment"
            : "Preparing M-Pesa checkout"
        }
      />
      <PaymentFeedbackModal
        isOpen={showPaymentResult && paymentStatus === "success"}
        status="success"
        title="Payment Successful"
        message="Your wallet has been credited successfully."
        onClose={onClose}
      />
      <PaymentFeedbackModal
        isOpen={showPaymentResult && paymentStatus === "failed"}
        status="failed"
        title="Payment Failed"
        message="Your payment could not be confirmed. Please try again."
        onClose={onClose}
        onRetry={onRetry}
      />

      <article className="overflow-hidden rounded-3xl border border-[#1a2f45] bg-[#0b1421] shadow-2xl">
        {/* ── Header ── */}
        <div className="border-b border-[#1a2f45] bg-[#0d1829] px-6 py-4">
          <div className="flex items-center justify-between">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg"
              alt="M-Pesa"
              className="h-8 w-auto object-contain"
            />
            <span className="flex items-center gap-1.5 rounded-full border border-[#00A859]/20 bg-[#00A859]/10 px-3 py-1 text-[11px] font-semibold text-[#00A859]">
              <ShieldCheck className="h-3 w-3" />
              Secured by Paystack
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="space-y-5 px-7 py-6">
          {/* Quick amounts */}
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
                      ? "border-[#00A859] bg-[#00A859]/10 text-[#00A859]"
                      : "border-[#1a2f45] bg-[#0f1d2e] text-[#7a94ad] hover:border-[#00A859]/30 hover:text-white"
                  }`}
                >
                  {formatMoney(value)}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
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
                className="h-14 rounded-2xl border-[#1a2f45] bg-[#0f1d2e] text-lg text-white placeholder:text-[#2e4a63] transition-colors focus:border-[#00A859] focus:ring-1 focus:ring-[#00A859]"
              />
              <p className="text-xs text-[#3d5a73]">Minimum deposit: KES 500</p>
            </label>

            <Button
              type="submit"
              disabled={initializeMutation.isPending || isProcessing}
              className="h-14 w-full rounded-2xl bg-[#00A859] text-base font-bold text-white transition-colors hover:bg-[#009950] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? (
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Wallet className="mr-2 h-5 w-5" />
              )}
              {isProcessing ? "Processing..." : "Pay with M-Pesa"}
            </Button>
          </form>
        </div>
      </article>
    </section>
  );
}
