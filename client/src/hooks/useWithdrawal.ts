import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";
import { profileQueryKey } from "@/hooks/useProfile";
import { walletSummaryQueryKey } from "@/features/user/payments/wallet";

const MIN_WITHDRAWAL = 50;
const MAX_WITHDRAWAL = 500_000;
const TAX_PERCENT = 15;
const VALIDATION_DEBOUNCE_MS = 250;

type WithdrawalPayload = {
  amount: number;
  phone: string;
};

type WithdrawalResponse = {
  message: string;
  transactionId: string;
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

export function useWithdrawal(options?: { sourcePhone?: string | null }) {
  const [amountInput, setAmountInput] = useState("50");
  const [phoneInput, setPhoneInput] = useState(
    normalizePhone(options?.sourcePhone ?? ""),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const amountValue = useMemo(() => Number(amountInput), [amountInput]);
  const feeAmount = useMemo(() => {
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return 0;
    }

    return Math.ceil((amountValue * TAX_PERCENT) / 100);
  }, [amountValue]);
  const netAmount = Math.max(0, amountValue - feeAmount);

  useEffect(() => {
    setPhoneInput(normalizePhone(options?.sourcePhone ?? ""));
  }, [options?.sourcePhone]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!Number.isFinite(amountValue)) {
        setValidationError("Amount must be numeric.");
        return;
      }

      if (amountValue < MIN_WITHDRAWAL) {
        setValidationError(`Minimum withdrawal is KES ${MIN_WITHDRAWAL}.`);
        return;
      }

      if (amountValue > MAX_WITHDRAWAL) {
        setValidationError(
          `Maximum withdrawal is KES ${MAX_WITHDRAWAL.toLocaleString()}.`,
        );
        return;
      }

      const normalizedPhone = normalizePhone(phoneInput);
      if (!isPhoneValid(normalizedPhone)) {
        setValidationError(
          "Your account phone is invalid for Paystack payouts.",
        );
        return;
      }

      setValidationError(null);
    }, VALIDATION_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [amountValue, phoneInput]);

  const mutation = useMutation({
    mutationFn: async (payload: WithdrawalPayload) => {
      const { data } = await api.post<WithdrawalResponse>(
        "/withdrawal",
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileQueryKey }),
        queryClient.invalidateQueries({ queryKey: walletSummaryQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["profile-transactions"] }),
      ]);
      setAmountInput("50");
      setPhoneInput(normalizePhone(options?.sourcePhone ?? ""));
      setValidationError(null);
    },
  });

  const submit = async () => {
    const normalizedPhone = normalizePhone(phoneInput);

    if (!Number.isFinite(amountValue)) {
      throw new Error("Amount must be numeric.");
    }

    if (amountValue < MIN_WITHDRAWAL || amountValue > MAX_WITHDRAWAL) {
      throw new Error(
        `Amount must be between KES ${MIN_WITHDRAWAL} and KES ${MAX_WITHDRAWAL.toLocaleString()}.`,
      );
    }

    if (!isPhoneValid(normalizedPhone)) {
      throw new Error("Your account phone is invalid for Paystack payouts.");
    }

    await mutation.mutateAsync({
      amount: amountValue,
      phone: normalizedPhone,
    });
  };

  return {
    amountInput,
    setAmountInput,
    phoneInput,
    setPhoneInput,
    amountValue,
    feeAmount,
    netAmount,
    taxPercent: TAX_PERCENT,
    minAmount: MIN_WITHDRAWAL,
    maxAmount: MAX_WITHDRAWAL,
    validationError,
    submit,
    isSubmitting: mutation.isPending,
    apiError:
      (mutation.error as { response?: { data?: { message?: string } } } | null)
        ?.response?.data?.message ?? null,
  };
}
