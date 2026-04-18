import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Copy,
  LoaderCircle,
  Smartphone,
  Wallet,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { formatMoney } from "../data";
import { usePaystackInitialize } from "../hooks/usePaystackPayment";

const quickAmounts = [500, 1000, 2500, 5000];
const pendingStorageKey = "betwise-paystack-pending-reference";
const tillNumber = "9006951";
const tillName = "MDC Fixers";

function normalizeAmount(value: string) {
  return value.replace(/[^\d]/g, "");
}

export default function PaystackDepositPage() {
  const { user } = useAuth();
  const initializeMutation = usePaystackInitialize();
  const [amount, setAmount] = useState("100");
  const [paymentStatus, setPaymentStatus] = useState<
    "success" | "failed" | null
  >(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [showPaymentResult, setShowPaymentResult] = useState(false);

  const amountValue = useMemo(() => Number(amount) || 0, [amount]);

  // Handle redirect from Paystack checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const routeReference = params.get("reference");
    const status = params.get("status") as "success" | "failed" | null;

    if (routeReference) {
      localStorage.setItem(pendingStorageKey, routeReference);
      setPaymentReference(routeReference);

      if (status) {
        setPaymentStatus(status);
        setShowPaymentResult(true);

        // Show appropriate toast
        if (status === "success") {
          toast.success("Payment successful! Your wallet has been credited.", {
            description: `Reference: ${routeReference}`,
          });
        } else if (status === "failed") {
          toast.error("Payment failed. Please try again.", {
            description: `Reference: ${routeReference}`,
          });
        }

        // Clear the URL params after 3 seconds
        setTimeout(() => {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }, 3000);
      }
    }
  }, []);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

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

    // Show loading toast
    const loadingToast = toast.loading(
      `Initializing payment of KES ${formatMoney(amountValue)}...`,
    );

    try {
      const response = await initializeMutation.mutateAsync({
        email: user.email,
        amount: amountValue,
        metadata: {
          userId: user?.id,
          source: "paystack-deposit-card",
        },
      });

      localStorage.setItem(pendingStorageKey, response.reference);

      // Dismiss loading toast and show redirect notice
      toast.dismiss(loadingToast);
      toast.loading(`Redirecting to Paystack checkout...`, {
        description: `Amount: KES ${formatMoney(amountValue)} • Reference: ${response.reference}`,
      });

      // Redirect to Paystack checkout
      setTimeout(() => {
        window.location.assign(response.authorization_url);
      }, 500);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      const message =
        error?.response?.data?.error ??
        error?.response?.data?.message ??
        error?.message ??
        "Unable to start payment";
      toast.error(message);
    }
  }

  return (
    <section className="mx-auto grid max-w-280 gap-4 lg:grid-cols-2 lg:items-stretch">
      {showPaymentResult && paymentStatus === "success" && (
        <div className="col-span-full rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle
              size={20}
              className="mt-0.5 flex-shrink-0 text-green-400"
            />
            <div className="flex-1">
              <p className="font-semibold text-green-100">
                Payment Successful! ✓
              </p>
              <p className="mt-1 text-sm text-green-200">
                Your wallet has been credited. You can now place bets.
              </p>
              <p className="mt-2 text-xs text-green-300 font-mono">
                Reference: {paymentReference}
              </p>
            </div>
          </div>
        </div>
      )}

      {showPaymentResult && paymentStatus === "failed" && (
        <div className="col-span-full rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={20}
              className="mt-0.5 flex-shrink-0 text-red-400"
            />
            <div className="flex-1">
              <p className="font-semibold text-red-100">Payment Failed</p>
              <p className="mt-1 text-sm text-red-200">
                Your payment could not be processed. Please try again.
              </p>
              <p className="mt-2 text-xs text-red-300 font-mono">
                Reference: {paymentReference}
              </p>
            </div>
          </div>
        </div>
      )}

      <article className="flex h-full min-h-98 flex-col rounded-2xl border border-[#243a53] bg-[#111d2e] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 border-b border-[#243a53] pb-3">
          <div>
            <div className="flex items-center gap-2 text-[#f5c518]">
              <Wallet size={18} />
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                Paystack
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#8a9bb0] sm:text-sm">
              Secure card and bank checkout
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickAmounts.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAmount(String(value))}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                amountValue === value
                  ? "border-[#f5c518] bg-[#f5c518]/20 text-[#f5c518]"
                  : "border-[#294157] bg-[#0f1a2a] text-[#8a9bb0] hover:border-[#f5c518]/50 hover:text-white"
              }`}
            >
              {formatMoney(value)}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
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
              className="h-11 rounded-xl border-[#294157] bg-[#0f1a2a] text-white placeholder:text-[#62738a] focus:border-[#f5c518]"
            />
          </label>

          <Button
            type="submit"
            disabled={initializeMutation.isPending}
            className="mt-1 h-11 rounded-xl bg-[#f5c518] px-5 text-sm font-semibold text-black hover:bg-[#e0b90f]"
          >
            {initializeMutation.isPending ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Proceed to Payment
          </Button>

          <div className="rounded-xl border border-[#243a53] bg-[#0f1a2a] px-4 py-3 text-xs text-[#8a9bb0]">
            Funds are only marked paid after server verification.
            <span className="ml-2 font-semibold text-white">
              {formatMoney(amountValue || 0)}
            </span>
          </div>
        </form>
      </article>

      <article className="flex h-full min-h-98 flex-col rounded-2xl border border-[#243a53] bg-[#111d2e] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 border-b border-[#243a53] pb-3">
          <div>
            <div className="flex items-center gap-2 text-[#f5c518]">
              <Smartphone size={18} />
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                Till Number
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#8a9bb0] sm:text-sm">
              Pay via M-Pesa goods and services
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#243a53] bg-[#0f1a2a] p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#90a2bb]">
            Till Number
          </p>
          <p className="mt-1 text-3xl font-bold text-white">{tillNumber}</p>
          <p className="mt-2 text-sm text-[#8a9bb0]">{tillName}</p>

          <button
            type="button"
            onClick={() => void copyText(tillNumber)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#294157] bg-[#111d2e] px-4 py-2 text-sm font-semibold text-white hover:border-[#f5c518]/50 hover:bg-[#f5c518]/10"
          >
            <Copy size={14} />
            Copy Till
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-[#243a53] bg-[#0f1a2a] p-4 text-sm text-[#8a9bb0]">
          <p className="font-semibold text-white">How to pay</p>
          <ol className="mt-3 space-y-2 text-sm leading-6">
            <li>1. Go to M-Pesa then Lipa Na M-Pesa.</li>
            <li>2. Select Buy Goods and Services.</li>
            <li>
              3. Enter Till {tillNumber} ({tillName}).
            </li>
            <li>4. Enter amount and PIN.</li>
            <li>5. Confirm payment.</li>
          </ol>
          <p className="mt-4 text-center text-[11px] text-[#62738a]">
            Dial *234# for charges
          </p>
        </div>
      </article>
    </section>
  );
}
