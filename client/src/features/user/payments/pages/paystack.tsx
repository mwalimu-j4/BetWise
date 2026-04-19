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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const routeReference = params.get("reference");

    // Only use stored reference if we're coming back from Paystack redirect (URL has reference param)
    if (routeReference) {
      localStorage.setItem(pendingStorageKey, routeReference);
      window.history.replaceState({}, document.title, window.location.pathname);
      setVerificationReference(routeReference);
      setPaymentReference(routeReference);
      setShouldVerify(true);
      setIsProcessing(true);
    } else {
      // On fresh page load without URL reference, clear any stale stored reference
      localStorage.removeItem(pendingStorageKey);
      setVerificationReference(null);
      setPaymentReference(null);
      setShouldVerify(false);
      setIsProcessing(false);
      setPaymentStatus(null);
      setShowPaymentResult(false);
    }
  }, []);

  useEffect(() => {
    const status = verificationQuery.data?.status;
    if (!shouldVerify || !verificationReference || !status) {
      return;
    }

    if (status === "success") {
      localStorage.removeItem(pendingStorageKey);
      setPaymentStatus("success");
      setShowPaymentResult(true);
      setIsProcessing(false);
      setShouldVerify(false);
      return;
    }

    if (status === "failed" || status === "reversed") {
      localStorage.removeItem(pendingStorageKey);
      setPaymentStatus("failed");
      setShowPaymentResult(true);
      setIsProcessing(false);
      setShouldVerify(false);
      return;
    }

    // If pending, keep showing loading
    if (status === "pending") {
      setIsProcessing(true);
      return;
    }

    setIsProcessing(true);
  }, [verificationQuery.data?.status, shouldVerify, verificationReference]);

  // Handle verification query errors - show error if it fails after many retries
  useEffect(() => {
    if (
      shouldVerify &&
      verificationReference &&
      verificationQuery.isError &&
      verificationQuery.failureCount >= 10
    ) {
      // After 10+ failed retries, show error
      localStorage.removeItem(pendingStorageKey);
      setPaymentStatus("failed");
      setShowPaymentResult(true);
      setIsProcessing(false);
      setShouldVerify(false);
    }
  }, [
    verificationQuery.isError,
    verificationQuery.failureCount,
    shouldVerify,
    verificationReference,
  ]);

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

      toast.loading("Redirecting to Paystack checkout...", {
        description: `Amount: KES ${formatMoney(amountValue)} | Reference: ${response.reference}`,
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
        reference={paymentReference || undefined}
        onClose={() => {
          setShowPaymentResult(false);
          setPaymentReference(null);
          setPaymentStatus(null);
        }}
      />

      <PaymentFeedbackModal
        isOpen={showPaymentResult && paymentStatus === "failed"}
        status="failed"
        title="Payment Failed"
        message="Your payment could not be confirmed. Please try again."
        reference={paymentReference || undefined}
        onClose={() => {
          setShowPaymentResult(false);
          setPaymentReference(null);
          setPaymentStatus(null);
        }}
        onRetry={() => {
          // Retry by re-verifying with the same reference
          if (paymentReference) {
            setShowPaymentResult(false);
            setPaymentStatus(null);
            setVerificationReference(paymentReference);
            setShouldVerify(true);
            setIsProcessing(true);
          }
        }}
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
