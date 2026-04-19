import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useWithdrawal } from "@/hooks/useWithdrawal";
import { useAuth } from "@/context/AuthContext";

type WithdrawalFormProps = {
  onSuccess?: () => void;
};

export default function WithdrawalForm({ onSuccess }: WithdrawalFormProps) {
  const { user } = useAuth();
  const {
    amountInput,
    setAmountInput,
    feeAmount,
    netAmount,
    taxPercent,
    minAmount,
    maxAmount,
    validationError,
    isSubmitting,
    apiError,
    submit,
  } = useWithdrawal({ sourcePhone: user?.phone ?? "" });

  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    try {
      await submit();
      toast.success("Withdrawal request submitted.");
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit withdrawal.";
      setLocalError(message);
      toast.error(message);
    }
  };

  return (
    <section className="rounded-2xl border border-[#31455f] bg-[#0f172a] p-4">
      <h3 className="text-sm font-semibold text-white">Withdrawal</h3>
      <p className="mt-1 text-xs text-[#8a9bb0]">
        Daily M-PESA withdrawal limits. Min KES {minAmount}. Max KES{" "}
        {maxAmount.toLocaleString()}. All transactions subject to {taxPercent}%
        tax.
      </p>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <input
          type="number"
          min={minAmount}
          max={maxAmount}
          value={amountInput}
          onChange={(event) => setAmountInput(event.target.value)}
          className="h-11 w-full rounded-xl border border-[#31455f] bg-[#0f172a] px-3 text-sm text-white outline-none focus:border-[#f5c518]"
          placeholder="Enter amount to withdraw"
        />

        <div className="rounded-xl border border-[#31455f] bg-[#0f172a] px-3 py-2 text-xs text-[#8a9bb0]">
          Phone linked from your account is used automatically for payout.
        </div>

        <div className="rounded-xl border border-[#31455f] bg-[#0f172a] px-3 py-2 text-xs text-[#90a2bb]">
          <p>
            Fee ({taxPercent}%): KES {feeAmount.toLocaleString()}
          </p>
          <p className="mt-1 font-semibold text-[#f5c518]">
            You receive: KES {netAmount.toLocaleString()}
          </p>
        </div>

        {validationError ? (
          <p className="text-xs text-[#fca5a5]">{validationError}</p>
        ) : null}
        {localError ? (
          <p className="text-xs text-[#fca5a5]">{localError}</p>
        ) : null}
        {apiError ? <p className="text-xs text-[#fca5a5]">{apiError}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting || Boolean(validationError)}
          className="h-11 w-full rounded-xl bg-[#f5c518] text-sm font-bold text-[#0d1117] transition hover:brightness-95 disabled:opacity-60"
        >
          {isSubmitting ? "Processing..." : "Withdraw"}
        </button>
      </form>
    </section>
  );
}
