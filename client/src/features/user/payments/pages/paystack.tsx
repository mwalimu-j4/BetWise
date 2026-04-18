import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Copy, LoaderCircle, Smartphone, Wallet } from "lucide-react";
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
  const [email, setEmail] = useState(user?.email ?? "");
  const [amount, setAmount] = useState("100");

  const amountValue = useMemo(() => Number(amount) || 0, [amount]);

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [email, user?.email]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const routeReference = params.get("reference");
    if (routeReference) {
      localStorage.setItem(pendingStorageKey, routeReference);
    }
  }, []);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (amountValue < 100) {
      toast.error("Minimum deposit is KES 100.");
      return;
    }

    try {
      const currentUrl = `${window.location.origin}${window.location.pathname}`;
      const response = await initializeMutation.mutateAsync({
        email: email.trim(),
        amount: amountValue,
        callbackUrl: currentUrl,
        metadata: {
          userId: user?.id,
          source: "paystack-deposit-card",
        },
      });

      localStorage.setItem(pendingStorageKey, response.reference);
      window.location.assign(response.authorization_url);
    } catch (error: any) {
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

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {quickAmounts.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAmount(String(value))}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                amountValue === value
                  ? "border-[#f5c518] bg-[#f5c518]/10 text-white"
                  : "border-[#294157] bg-[#0f1a2a] text-[#8a9bb0] hover:border-[#f5c518]/50 hover:text-white"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                Quick amount
              </p>
              <p className="mt-1 text-sm font-bold sm:text-base">
                {formatMoney(value)}
              </p>
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-[#90a2bb] sm:text-sm">
              Email
            </span>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@example.com"
              className="h-11 rounded-xl border-[#294157] bg-[#0f1a2a] text-white placeholder:text-[#62738a] focus:border-[#f5c518]"
            />
          </label>

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
