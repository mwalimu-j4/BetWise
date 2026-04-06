import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney } from "../data";
import { useWalletSummary, walletSummaryQueryKey } from "../wallet";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";

const quickAmounts = [100, 500, 1000, 2500, 5000, 10000];

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

export default function PaymentsWithdrawalPage() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("500");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: walletData, refetch: refetchWallet } = useWalletSummary();
  const queryClient = useQueryClient();

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
      setPhone("");
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
      isPhoneValid
    );
  }, [numAmount, balance, isPhoneValid, totalNeeded]);

  const recentWithdrawals = Array.isArray(walletData?.transactions)
    ? walletData.transactions
        .filter((item) => item.type === "withdrawal")
        .slice(0, 4)
    : [];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canWithdraw) {
      if (!isPhoneValid) {
        toast.error("Please enter a valid phone in format: 2547XXXXXXXX");
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
      // Normalize phone to format: 254XXXXXXXXX
      let normalizedPhone = phone.replace(/\s+/g, "").replace(/^(\+|00)/, "");
      if (normalizedPhone.startsWith("0")) {
        normalizedPhone = "254" + normalizedPhone.slice(1);
      }

      await withdrawalMutation.mutateAsync({
        amount: numAmount,
        phone: normalizedPhone,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
      <article className="rounded-3xl border border-[#23384f] bg-[#111d2e] p-5 sm:p-6">
        <div className="mb-5 border-b border-[#23384f] pb-4">
          <h2 className="text-lg font-bold text-admin-text-primary">
            Withdraw Funds
          </h2>
          <p className="mt-1 text-sm text-admin-text-muted">
            Transfer your winnings to M-Pesa. Withdrawals require admin
            approval.
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-[#23384f] bg-[#101b2b] p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">
            Available for withdrawal
          </p>
          <p className="mt-1 text-2xl font-bold text-admin-accent">
            {formatMoney(balance)}
          </p>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <label
              htmlFor="withdraw-amount"
              className="text-sm font-semibold text-admin-text-primary"
            >
              Amount (KES {MIN_WITHDRAWAL} - {MAX_WITHDRAWAL.toLocaleString()})
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
                placeholder="0.00"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {Array.isArray(quickAmounts) &&
                quickAmounts.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={option > balance}
                    className="rounded-lg border border-[#294157] bg-[#0f1a2a] px-2.5 py-1 text-xs font-medium text-[#8a9bb0] outline-none transition hover:border-[#f5c518]/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setAmount(String(option))}
                  >
                    {formatMoney(option)}
                  </button>
                ))}
            </div>

            {numAmount > 0 && (
              <div className="mt-2 space-y-2 rounded-lg bg-[#101b2b] p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-admin-text-muted">
                    Withdrawal amount:
                  </span>
                  <span className="text-admin-text-primary font-medium">
                    KES {numAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-admin-text-muted">
                    Fee ({WITHDRAWAL_FEE_PERCENTAGE}%):
                  </span>
                  <span className="text-admin-text-primary font-medium">
                    KES {feeAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#23384f] pt-2 font-semibold">
                  <span className="text-admin-text-muted">You'll receive:</span>
                  <span className="text-admin-accent">
                    {formatMoney(netAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#23384f] bg-[#101b2b] p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <Smartphone size={15} className="text-[#8a9bb0]" />
              <label
                htmlFor="withdraw-phone"
                className="text-sm font-semibold text-admin-text-primary"
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
                Invalid phone. Use format: 2547XXXXXXXX
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="h-11 rounded-xl bg-admin-accent text-sm font-bold text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              !canWithdraw || isSubmitting || withdrawalMutation.isPending
            }
          >
            {isSubmitting || withdrawalMutation.isPending
              ? "Submitting..."
              : "Request Withdrawal"}
          </Button>

          <p className="text-xs text-admin-text-muted">
            Your withdrawal will be processed after admin approval, typically
            within 1-2 hours.
          </p>
        </form>
      </article>

      <article className="rounded-3xl border border-[#23384f] bg-[#111d2e] p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-admin-text-primary">
          Recent Requests
        </h3>
        <div className="mt-3 grid gap-2">
          {Array.isArray(recentWithdrawals) && recentWithdrawals.length > 0 ? (
            recentWithdrawals.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-[#23384f] bg-[#101b2b] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-admin-text-primary">
                    {formatMoney(entry.amount)}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                      entry.status === "completed"
                        ? "border-green-500/30 bg-green-500/10 text-green-600"
                        : entry.status === "pending"
                          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-600"
                          : "border-red-500/30 bg-red-500/10 text-red-600"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-admin-text-secondary">
                  {formatDateTime(entry.createdAt)}
                </p>
                <p className="mt-1 text-[10px] text-admin-text-muted">
                  Ref: {entry.reference}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-[#23384f] bg-[linear-gradient(165deg,#0d2147,#091a36)] p-5 text-center">
              <p className="text-base font-semibold text-white">
                No requests available right now
              </p>
              <p className="mt-1 text-sm text-blue-200/85">
                Check back soon or refresh.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-4 h-9 rounded-lg bg-admin-accent px-4 text-xs font-semibold text-black hover:opacity-90"
                onClick={() => {
                  void refetchWallet();
                }}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
