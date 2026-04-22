import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Smartphone, ArrowUpRight, LoaderCircle, Banknote } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "../data";
import { useWalletSummary, walletSummaryQueryKey } from "../wallet";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { data: walletData } = useWalletSummary();
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
      setShowConfirmModal(false);
      queryClient.invalidateQueries({ queryKey: walletSummaryQueryKey });
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

  function validateWithdrawalInput() {
    if (!isPhoneValid(normalizedPhone)) {
      toast.error("Invalid phone. Use format: 2547XXXXXXXX");
      return false;
    }

    if (numAmount < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is KES ${MIN_WITHDRAWAL}.`);
      return false;
    }

    if (numAmount > MAX_WITHDRAWAL) {
      toast.error(`Maximum withdrawal is KES ${MAX_WITHDRAWAL}.`);
      return false;
    }

    if (totalNeeded > balance) {
      toast.error(
        `Insufficient balance. Need KES ${totalNeeded.toLocaleString()}.`,
      );
      return false;
    }

    return true;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateWithdrawalInput()) return;
    setShowConfirmModal(true);
  }

  async function onConfirmWithdrawal() {
    if (!canWithdraw) return;

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
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mx-auto w-full max-w-[700px] space-y-4">
        <article className="overflow-hidden rounded-3xl border border-[#1a2f45] bg-[#0b1421] shadow-2xl">
          <div className="border-b border-[#1a2f45] bg-[#0d1829] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f5c518]/20 bg-[#f5c518]/10">
                <ArrowUpRight size={17} className="text-[#f5c518]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Withdraw Funds
                </h2>
                <p className="text-xs text-[#4a6a85]">
                  Enter amount and M-Pesa number to continue
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-7 py-6">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-[#3d5a73]">
                    Amount (KES)
                  </span>
                  <div className="flex overflow-hidden rounded-2xl border border-[#1a2f45] bg-[#0f1d2e] transition-colors focus-within:border-[#f5c518]">
                    <span className="flex items-center gap-1.5 border-r border-[#1a2f45] px-3 text-xs font-bold text-[#3d5a73]">
                      <Banknote className="h-3.5 w-3.5" />
                      KES
                    </span>
                    <input
                      className="h-12 w-full bg-transparent px-3 text-base font-semibold text-white outline-none placeholder:text-[#2e4a63]"
                      type="number"
                      min={MIN_WITHDRAWAL}
                      max={MAX_WITHDRAWAL}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Min ${MIN_WITHDRAWAL}`}
                    />
                  </div>
                  <p className="text-xs text-[#3d5a73]">
                    Minimum withdrawal: KES {MIN_WITHDRAWAL}
                  </p>
                </label>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Smartphone size={13} className="text-[#3d5a73]" />
                    <p className="text-xs font-medium uppercase tracking-widest text-[#3d5a73]">
                      M-Pesa Number
                    </p>
                  </div>
                  <div className="relative">
                    <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d5a73]" />
                    <input
                      className={`mt-2 h-12 w-full rounded-2xl border bg-[#0f1d2e] px-3 pl-10 text-sm text-white outline-none placeholder:text-[#2e4a63] transition-colors ${
                        phoneError
                          ? "border-red-500/60 focus:border-red-500"
                          : "border-[#1a2f45] focus:border-[#f5c518]"
                      }`}
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="2547XXXXXXXX"
                    />
                  </div>
                  <p
                    className={`mt-2 text-xs ${
                      phoneError ? "text-red-400" : "text-[#3d5a73]"
                    }`}
                  >
                    {phoneError
                      ? "Use format: 2547XXXXXXXX"
                      : "Withdrawals are sent to this number."}
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-2xl bg-[#f5c518] text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-xl border-[#1a2f45] bg-[#0b1421] p-0 text-white">
          <DialogHeader className="border-b border-[#1a2f45] bg-[#0d1829] px-6 py-4">
            <DialogTitle className="text-base font-bold text-white">
              Confirm Withdrawal
            </DialogTitle>
            <DialogDescription className="text-xs text-[#4a6a85]">
              Please review these details before submitting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            <p className="text-sm leading-relaxed text-[#9bb0c6]">
              You are about to withdraw{" "}
              <span className="font-semibold text-white">
                {formatMoney(numAmount)}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-white">{normalizedPhone}</span>
              .
            </p>
            <p className="text-sm leading-relaxed text-[#9bb0c6]">
              A{" "}
              <span className="font-semibold text-[#f5c518]">
                {WITHDRAWAL_FEE_PERCENTAGE}% fee ({formatMoney(feeAmount)})
              </span>{" "}
              will apply, and you will receive{" "}
              <span className="font-semibold text-emerald-400">
                {formatMoney(netAmount)}
              </span>
              .
            </p>
            <p className="text-xs text-[#6e86a1]">
              Confirm to proceed with this withdrawal request.
            </p>
          </div>

          <DialogFooter className="border-t border-[#1a2f45] px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={busy}
              className="border-[#294157] bg-transparent text-[#dce7f2] hover:bg-[#102134] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onConfirmWithdrawal()}
              disabled={busy}
              className="bg-[#f5c518] text-black hover:bg-[#e6b800]"
            >
              {busy ? "Submitting..." : "Confirm Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
