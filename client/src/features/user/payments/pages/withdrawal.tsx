import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  RefreshCw,
  Smartphone,
  ArrowUpRight,
  Inbox,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney } from "../data";
import { useWalletSummary, walletSummaryQueryKey } from "../wallet";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";

const quickAmounts = [500, 1000, 2500, 5000];
const MAX_WITHDRAWAL = 500000;
const WITHDRAWAL_FEE_PERCENTAGE = 15;
const MIN_WITHDRAWAL = 50;

type WithdrawalResponse = {
  message: string;
  transactionId: string;
  wallet: { balance: number };
  details: { amount: number; fee: number; netAmount: number; phone: string };
};

function normalizePhone(phone: string) {
  const compact = phone.replace(/\s+/g, "").replace(/^\+/, "");
  return compact.startsWith("0") ? `254${compact.slice(1)}` : compact;
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
  const [phone, setPhone] = useState(accountPhone);
  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);

  const withdrawalMutation = useMutation({
    mutationFn: async (data: { amount: number; phone: string }) => {
      const response = await api.post<WithdrawalResponse>(
        "/payments/withdrawals",
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(
        data.message || "Withdrawal request submitted successfully!",
      );
      setAmount("500");
      queryClient.invalidateQueries({ queryKey: walletSummaryQueryKey });
      refetchWallet();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to submit withdrawal request",
      );
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

  useEffect(() => {
    if (accountPhone && !phone) setPhone(accountPhone);
  }, [accountPhone, phone]);

  const canWithdraw = useMemo(
    () =>
      numAmount >= MIN_WITHDRAWAL &&
      numAmount <= MAX_WITHDRAWAL &&
      totalNeeded <= balance &&
      isPhoneValid(normalizedPhone),
    [numAmount, balance, normalizedPhone, totalNeeded],
  );

  const recentWithdrawals = Array.isArray(walletData?.transactions)
    ? walletData.transactions.filter((t) => t.type === "withdrawal").slice(0, 3)
    : [];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWithdraw) {
      if (!isPhoneValid(normalizedPhone))
        toast.error("Invalid phone. Use format: 2547XXXXXXXX");
      else if (numAmount < MIN_WITHDRAWAL)
        toast.error(`Minimum withdrawal is KES ${MIN_WITHDRAWAL}.`);
      else if (numAmount > MAX_WITHDRAWAL)
        toast.error(`Maximum withdrawal is KES ${MAX_WITHDRAWAL}.`);
      else if (totalNeeded > balance)
        toast.error(
          `Insufficient balance. Need KES ${totalNeeded.toLocaleString()}.`,
        );
      else toast.error("Please check your input and try again.");
      return;
    }
    setIsSubmitting(true);
    try {
      await withdrawalMutation.mutateAsync({
        amount: numAmount,
        phone: normalizedPhone,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const phoneError = phone && !isPhoneValid(normalizePhone(phone));
  const busy = isSubmitting || withdrawalMutation.isPending;

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* ── Withdraw Form ── */}
      <article className="overflow-hidden rounded-3xl border border-[#1a2f45] bg-[#0b1421] shadow-2xl">
        {/* Header */}
        <div className="border-b border-[#1a2f45] bg-[#0d1829] px-6 pt-6 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f5c518]/20 bg-[#f5c518]/10">
                <ArrowUpRight size={17} className="text-[#f5c518]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Withdraw Funds
                </h2>
                <p className="text-xs text-[#4a6a85]">
                  Sent directly to your M-Pesa
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-[#3d5a73]">
                Balance
              </p>
              <p className="text-sm font-bold text-white">
                {formatMoney(balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Amount */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-widest text-[#3d5a73]">
                Amount (KES)
              </p>
              <div className="flex overflow-hidden rounded-2xl border border-[#1a2f45] bg-[#0f1d2e] transition-colors focus-within:border-[#f5c518]">
                <span className="flex items-center border-r border-[#1a2f45] px-4 text-xs font-bold text-[#3d5a73]">
                  KES
                </span>
                <input
                  className="h-14 w-full bg-transparent px-4 text-lg font-semibold text-white outline-none placeholder:text-[#2e4a63]"
                  type="number"
                  min={MIN_WITHDRAWAL}
                  max={MAX_WITHDRAWAL}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min ${MIN_WITHDRAWAL}`}
                />
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((value) => {
                  const fee = Math.ceil(
                    (value * WITHDRAWAL_FEE_PERCENTAGE) / 100,
                  );
                  const insufficient = value + fee > balance;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={insufficient}
                      onClick={() => setAmount(String(value))}
                      className={`rounded-xl border py-2.5 text-xs font-semibold transition-all duration-150 ${
                        numAmount === value
                          ? "border-[#f5c518] bg-[#f5c518]/10 text-[#f5c518]"
                          : "border-[#1a2f45] bg-[#0f1d2e] text-[#7a94ad] hover:border-[#f5c518]/30 hover:text-white"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {formatMoney(value)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone size={13} className="text-[#3d5a73]" />
                <p className="text-xs font-medium uppercase tracking-widest text-[#3d5a73]">
                  M-Pesa Number
                </p>
              </div>
              <input
                className={`h-12 w-full rounded-2xl border bg-[#0f1d2e] px-4 text-sm text-white outline-none placeholder:text-[#2e4a63] transition-colors ${
                  phoneError
                    ? "border-red-500/60 focus:border-red-500"
                    : "border-[#1a2f45] focus:border-[#f5c518]"
                }`}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="2547XXXXXXXX"
              />
              {phoneError && (
                <p className="text-xs text-red-400">Use format: 2547XXXXXXXX</p>
              )}
            </div>

            {/* Fee breakdown */}
            {numAmount > 0 && (
              <div className="grid grid-cols-3 divide-x divide-[#1a2f45] overflow-hidden rounded-2xl border border-[#1a2f45] bg-[#0d1829]">
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">
                    Withdraw
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-white">
                    {formatMoney(numAmount)}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">
                    Fee ({WITHDRAWAL_FEE_PERCENTAGE}%)
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-[#f5c518]">
                    −{formatMoney(feeAmount)}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400]">
                    You Receive
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-500">
                    {formatMoney(netAmount)}
                  </p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={!canWithdraw || busy}
              className="h-14 w-full rounded-2xl bg-[#f5c518] text-base font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ArrowUpRight className="mr-2 h-5 w-5" />
              )}
              {busy ? "Processing..." : "Request Withdrawal"}
            </Button>
          </form>
        </div>
      </article>

      {/* ── Recent Requests ── */}
      <article className="overflow-hidden rounded-3xl border border-[#1a2f45] bg-[#0b1421] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a2f45] bg-[#0d1829] px-5 py-4">
          <h3 className="text-sm font-bold text-white">Recent Requests</h3>
          <button
            type="button"
            onClick={() => void refetchWallet()}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#4a6a85] transition hover:bg-[#1a2f45] hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="p-4 space-y-2">
          {recentWithdrawals.length > 0 ? (
            recentWithdrawals.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-[#1a2f45] bg-[#0d1829] px-4 py-3 transition hover:border-[#f5c518]/20"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">
                    {formatMoney(entry.amount)}
                  </p>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      entry.status === "completed"
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : entry.status === "processing"
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                          : entry.status === "pending"
                            ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                            : "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#4a6a85]">
                  {formatDateTime(entry.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#1a2f45] bg-[#0d1829]">
                <Inbox className="h-6 w-6 text-[#2e4a63]" />
              </div>
              <p className="mt-3 text-sm font-semibold text-[#4a6a85]">
                No requests yet
              </p>
              <p className="mt-1 text-xs text-[#2e4a63]">
                Your withdrawals will appear here
              </p>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
