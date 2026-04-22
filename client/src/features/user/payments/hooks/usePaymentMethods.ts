import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export type EnabledPaymentMethods = {
  mpesa: boolean;
  paystack: boolean;
  bankTransfer: boolean;
  limits: {
    minDeposit: number;
    maxDeposit: number;
    minWithdrawal: number;
    maxWithdrawal: number;
    dailyLimit: number;
    feePercentage: number;
  };
  betting: {
    minBetAmount: number;
    maxBetAmount: number;
    maxTotalOdds: number;
  };
  currency: string;
};

export function useEnabledPaymentMethods() {
  return useQuery({
    queryKey: ["enabledPaymentMethods"],
    queryFn: async () => {
      const { data } = await api.get<EnabledPaymentMethods>(
        "/payments/methods/enabled",
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
}
