import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export type EnabledPaymentMethods = {
  mpesa: boolean;
  paystack: boolean;
  bankTransfer: boolean;
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
