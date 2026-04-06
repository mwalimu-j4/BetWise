import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { RefreshCw, Smartphone, ArrowUpRight, Inbox } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney } from "../data";
import { useWalletSummary, walletSummaryQueryKey } from "../wallet";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";

const quickAmounts = [500, 1000, 2500, 5000];

const MAX_WITHDRAWAL = 500000;
const WITHDRAWAL_FEE_PERCENTAGE = 5;
const MIN_WITHDRAWAL = 50;

type WithdrawalResponse = {
  message: string;
  transactionId: string;
  wallet: {
    balance: number;
  };
  details: {
    amount: number;
    fee: number;
    netAmount: number;
    phone: string;
  };
};

function normalizePhone(phone: string) {
  const compact = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (compact.startsWith("0")) {
    return `254${compact.slice(1)}`;
  }

  return compact;
}

function isPhoneValid(phone: string) {
  return /^254(7|1)\d{8}$/.test(phone);
}

export default function PaymentsWithdrawalPage() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("500");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: walletData, refetch: refetchWallet } = useWalletSummary();
  const queryClient = useQueryClient();
  const accountPhone = useMemo(
    () => normalizePhone(user?.phone ?? ""),
    [user?.phone],
  );
  const accountPhoneValid = isPhoneValid(accountPhone);

  const withdrawalMutation = useMutation({
    mutationFn: async (data: { amount: number; phone: string }) => {
      const response = await api.post<WithdrawalResponse>(
        "/payments/withdrawals",
        {
          amount: data.amount,
          phone: data.phone,
        },
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(
        data.message || "Withdrawal request submitted successfully!",
      );
      setAmount("500");
      // Refetch wallet summary to get updated balance
      queryClient.invalidateQueries({ queryKey: walletSummaryQueryKey });
      refetchWallet();
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || "Failed to submit withdrawal request";
      toast.error(errorMessage);
    },
  });

  const numAmount = Number(amount) || 0;
  const feeAmount =
    numAmount > 0
      ? Math.ceil((numAmount * WITHDRAWAL_FEE_PERCENTAGE) / 100)
      : 0;
  const netAmount = numAmount - feeAmount;
  const balance = walletData?.wallet?.balance ?? 0;
  const totalNeeded = numAmount + feeAmount;

  const isPhoneValid = /^(?:\+?254|0)7\d{8}$/.test(phone.replace(/\s+/g, ""));

  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [phone, user?.phone]);

  const canWithdraw = useMemo(() => {
    return (
      numAmount >= MIN_WITHDRAWAL &&
      numAmount <= MAX_WITHDRAWAL &&
      totalNeeded <= balance &&
      accountPhoneValid
    );
  }, [accountPhoneValid, numAmount, balance, totalNeeded]);

  const recentWithdrawals = Array.isArray(walletData?.transactions)
    ? walletData.transactions
        .filter((item) => item.type === "withdrawal")
        .slice(0, 4)
    : [];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canWithdraw) {
      if (!accountPhoneValid) {
        toast.error("Your account phone is invalid for M-PESA withdrawals.");
      } else if (numAmount < MIN_WITHDRAWAL) {
        toast.error(`Minimum withdrawal is KES ${MIN_WITHDRAWAL}.`);
      } else if (numAmount > MAX_WITHDRAWAL) {
        toast.error(`Maximum withdrawal is KES ${MAX_WITHDRAWAL}.`);
      } else if (totalNeeded > balance) {
        toast.error(
          `Insufficient balance. You need KES ${totalNeeded.toLocaleString()}.`,
        );
      } else {
        toast.error("Please check your input and try again.");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await withdrawalMutation.mutateAsync({
        amount: numAmount,
        phone: accountPhone,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid w-full gap-4 lg:grid-cols-[1.3fr_1fr]">
      <article className="rounded-2xl border border-[#23384f] bg-[linear-gradient(135deg,#111d2e,#0f1a2a)] p-5 sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-[#23384f] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#294157] bg-[#0f1a2a]">
                <ArrowUpRight size={16} className="text-[#f5c518]" />
              </div>
              <h2 className="text-lg font-bold text-white">Withdraw</h2>
            </div>
            <p className="mt-0.5 text-xs text-[#8a9bb0]">
              Quick & secure M-Pesa transfer
            </p>
          </div>
        </div>

        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid gap-1.5">
            <label
              htmlFor="withdraw-amount"
              className="text-xs font-semibold text-admin-text-primary"
            >
              Amount
            </label>
            <div className="flex w-full items-center overflow-hidden rounded-xl border border-[#294157] bg-[#0f1a2a] transition focus-within:border-[#f5c518] focus-within:shadow-[0_0_0_2px_rgba(245,197,24,0.2)]">
              <span className="flex h-11 items-center border-r border-[#294157] px-3 text-[11px] font-bold text-[#8a9bb0]">
                KES
              </span>
              <input
                id="withdraw-amount"
                className="h-11 w-full border-0 bg-transparent px-3 text-sm text-admin-text-primary outline-none placeholder:text-[#8a9bb0]"
                type="number"
                min={MIN_WITHDRAWAL}
                max={MAX_WITHDRAWAL}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={`Min ${MIN_WITHDRAWAL}`}
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {quickAmounts.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={option > balance}
                  className="rounded-lg border border-[#294157] bg-[#0f1a2a] px-3 py-1.5 text-xs font-medium text-[#8a9bb0] transition hover:border-[#f5c518]/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setAmount(String(option))}
                >
                  {formatMoney(option)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#23384f] bg-[#101b2b] p-2.5 sm:p-3">
            <div className="mb-2 flex items-center gap-2">
              <Smartphone size={14} className="text-[#8a9bb0]" />
              <label
                htmlFor="withdraw-phone"
                className="text-xs font-semibold text-admin-text-primary"
              >
                M-Pesa Phone Number
              </label>
            </div>
            <input
              id="withdraw-phone"
              className="h-11 w-full rounded-xl border border-[#294157] bg-[#0f1a2a] px-3 text-sm text-admin-text-primary outline-none transition placeholder:text-[#8a9bb0] focus:border-[#f5c518] focus:shadow-[0_0_0_2px_rgba(245,197,24,0.2)]"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="2547XXXXXXXX"
            />

            {phone && !isPhoneValid && (
              <p className="mt-2 text-xs text-red-400">
                Invalid phone. Use format: 2547XXXXXXXX.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-[#23384f] bg-[#101b2b] px-2.5 py-1.5 text-[10px] text-admin-text-muted sm:text-xs">
            <span>Fee: {WITHDRAWAL_FEE_PERCENTAGE}%</span>
            <span className="mx-1.5 text-[#294157]">|</span>
            <span>You get: {formatMoney(netAmount)}</span>
          </div>

          <Button
            type="submit"
            className="h-11 rounded-xl bg-admin-accent text-sm font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              !canWithdraw || isSubmitting || withdrawalMutation.isPending
            }
          >
            {isSubmitting || withdrawalMutation.isPending
              ? "Submitting..."
              : "Request Withdrawal"}
          </Button>
        </form>
      </article>

      <article className="rounded-2xl border border-[#23384f] bg-[linear-gradient(135deg,#111d2e,#0f1a2a)] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Recent Requests</h3>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-xs font-medium text-[#8a9bb0] transition hover:text-[#f5c518]"
            onClick={() => {
              void refetchWallet();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="grid gap-1.5">
          {recentWithdrawals.length > 0 ? (
            recentWithdrawals.slice(0, 3).map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-[#23384f] bg-[#101b2b] px-2.5 py-2 transition hover:border-[#f5c518]/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white">
                    {formatMoney(entry.amount)}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                      entry.status === "completed"
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : entry.status === "pending"
                          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                          : "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-[#8a9bb0]">
                  {formatDateTime(entry.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-[#294157] bg-[#101b2b] p-4 text-center">
              <Inbox className="mx-auto h-8 w-8 text-[#294157]" />
              <p className="mt-2 text-xs font-medium text-[#8a9bb0]">
                No withdrawal requests yet
              </p>
              <p className="mt-0.5 text-[10px] text-[#5a6b7d]">
                Your requests will appear here
              </p>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
