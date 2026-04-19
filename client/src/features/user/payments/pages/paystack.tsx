import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CreditCard, LoaderCircle, ShieldCheck, Wallet } from "lucide-react";
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
const pendingStorageKey = "betwise-paystack-pending-reference";

function normalizeAmount(value: string) {
  return value.replace(/[^\d]/g, "");
}

export default function PaystackDepositPage() {
  const { user } = useAuth();
  const initializeMutation = usePaystackInitialize();
  const [verificationReference, setVerificationReference] = useState<
    string | null
  >(null);
  const [amount, setAmount] = useState("100");
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

  // Handle callback from Paystack with status parameter
  useEffect(() => {
    const handlePaystackCallback = () => {
      const params = new URLSearchParams(window.location.search);
      const routeStatus = params.get("status"); // "success", "failed", or "pending"

      console.log("🔍 Paystack callback handler - status:", routeStatus);

      if (!routeStatus) {
        // Fresh page load without callback
        localStorage.removeItem(pendingStorageKey);
        return;
      }

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      if (routeStatus === "success") {
        console.log("✅ Payment successful from server callback");
        setPaymentStatus("success");
        setShowPaymentResult(true);
        setIsProcessing(false);
        localStorage.removeItem(pendingStorageKey);
        toast.success("Payment successful! Your wallet has been credited.");
      } else if (routeStatus === "failed") {
        console.log("❌ Payment failed from server callback");
        setPaymentStatus("failed");
        setShowPaymentResult(true);
        setIsProcessing(false);
        localStorage.removeItem(pendingStorageKey);
        toast.error("Payment failed. Please try again.");
      } else if (routeStatus === "pending") {
        console.log("⏳ Payment pending - starting verification polling");
        setIsProcessing(true);
        const storedReference = localStorage.getItem(pendingStorageKey);
        if (storedReference) {
          setVerificationReference(storedReference);
          setPaymentReference(storedReference);
          setShouldVerify(true);
        } else {
          console.warn("⚠️ No stored reference for pending payment");
          setIsProcessing(false);
        }
      }
    };

    handlePaystackCallback();
  }, []);

  // Handle verification polling results
  useEffect(() => {
    if (!shouldVerify || !verificationReference) {
      return;
    }

    const status = verificationQuery.data?.status;

    if (!status) {
      return;
    }

    console.log("📊 Verification result - status:", status);

    if (status === "success") {
      console.log("✅ Payment confirmed via verification");
      localStorage.removeItem(pendingStorageKey);
      setPaymentStatus("success");
      setShowPaymentResult(true);
      setIsProcessing(false);
      setShouldVerify(false);
      toast.success("Payment confirmed! Your wallet has been credited.");
      return;
    }

    if (status === "failed" || status === "reversed") {
      console.log("❌ Payment verification failed");
      localStorage.removeItem(pendingStorageKey);
      setPaymentStatus("failed");
      setShowPaymentResult(true);
      setIsProcessing(false);
      setShouldVerify(false);
      toast.error("Payment could not be confirmed.");
      return;
    }

    if (status === "pending") {
      console.log("⏳ Still waiting for payment confirmation...");
      setIsProcessing(true);
      return;
    }
  }, [verificationQuery.data?.status, shouldVerify, verificationReference]);

  // Handle verification polling errors
  useEffect(() => {
    if (
      shouldVerify &&
      verificationReference &&
      verificationQuery.isError &&
      verificationQuery.failureCount >= 10
    ) {
      console.log("❌ Verification polling exhausted after 10+ retries");
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
    console.log("🔴 Closing payment modal");
    setShowPaymentResult(false);
    setPaymentReference(null);
    setPaymentStatus(null);
    setShouldVerify(false);
  };

  const onRetry = () => {
    if (paymentReference) {
      console.log("🔄 Retrying payment verification");
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

    if (amountValue < 100) {
      toast.error("Minimum deposit is KES 100.");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("💳 Initializing Paystack payment - Amount:", amountValue);
      const response = await initializeMutation.mutateAsync({
        email: user.email,
        amount: amountValue,
        metadata: {
          userId: user.id,
          source: "paystack-deposit-page",
        },
      });

      localStorage.setItem(pendingStorageKey, response.reference);
      setVerificationReference(response.reference);
      setPaymentReference(response.reference);

      console.log("🎟️ Paystack reference stored:", response.reference);

      toast.loading("Redirecting to Paystack checkout...", {
        description: `Amount: KES ${formatMoney(amountValue)}`,
      });

      setTimeout(() => {
        console.log("→ Redirecting to Paystack checkout");
        window.location.assign(response.authorization_url);
      }, 500);
    } catch (error: any) {
      console.error("❌ Payment initialization failed:", error);
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
    <section className="mx-auto max-w-3xl px-4 py-4">
      <PaymentLoadingModal
        isOpen={isProcessing}
        amount={amountValue}
        message={
          verificationReference
            ? "Confirming your Paystack payment"
            : "Preparing your Paystack checkout"
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

      <article className="overflow-hidden rounded-3xl border border-[#243a53] bg-[radial-gradient(circle_at_top,_rgba(245,197,24,0.14),_transparent_35%),linear-gradient(180deg,#111d2e_0%,#0b1421_100%)] shadow-2xl">
        <div className="border-b border-[#243a53] px-6 py-5">
          <div className="flex items-center gap-3 text-[#f5c518]">
            <CreditCard size={18} />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
              Paystack Only
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white">Fund Wallet</h1>
          <p className="mt-2 max-w-xl text-sm text-[#8a9bb0]">
            Deposit securely with Paystack. Card, bank, and supported Paystack
            checkout methods are handled in one flow.
          </p>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(String(value))}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    amountValue === value
                      ? "border-[#f5c518] bg-[#f5c518]/15 text-[#f5c518]"
                      : "border-[#294157] bg-[#0f1a2a] text-[#8a9bb0] hover:border-[#f5c518]/50 hover:text-white"
                  }`}
                >
                  {formatMoney(value)}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-medium text-[#90a2bb] sm:text-sm">
                  Amount (KES)
                </span>
                <Input
                  value={amount}
                  onChange={(event) =>
                    setAmount(normalizeAmount(event.target.value))
                  }
                  inputMode="numeric"
                  type="text"
                  placeholder="100"
                  className="h-12 rounded-2xl border-[#294157] bg-[#0f1a2a] text-white placeholder:text-[#62738a] focus:border-[#f5c518]"
                />
              </label>

              <Button
                type="submit"
                disabled={initializeMutation.isPending || isProcessing}
                className="h-12 rounded-2xl bg-[#f5c518] text-sm font-semibold text-black hover:bg-[#e0b90f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="mr-2 h-4 w-4" />
                )}
                {isProcessing ? "Processing..." : "Proceed to Paystack"}
              </Button>
            </form>
          </div>

          <aside className="rounded-2xl border border-[#243a53] bg-[#0f1a2a]/80 p-5">
            <div className="flex items-center gap-2 text-[#f5c518]">
              <ShieldCheck size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                Checkout Flow
              </span>
            </div>

            <div className="mt-4 space-y-4 text-sm text-[#8a9bb0]">
              <div>
                <p className="font-semibold text-white">1. Start payment</p>
                <p className="mt-1">
                  Enter your amount and continue to the hosted Paystack
                  checkout.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">2. Complete checkout</p>
                <p className="mt-1">
                  Paystack handles card, bank, and supported payment options
                  directly.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">
                  3. Return and confirm
                </p>
                <p className="mt-1">
                  When you are redirected back, BetWise verifies the transaction
                  and credits your wallet automatically.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </article>
    </section>
  );
}
