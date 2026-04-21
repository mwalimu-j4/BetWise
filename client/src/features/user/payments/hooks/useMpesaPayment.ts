import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export type MpesaInitializePayload = {
  phone: string;
  amount: number;
  accountReference?: string;
  description?: string;
};

export type MpesaInitializeResponse = {
  message: string;
  transactionId: string;
  merchantRequestId?: string | null;
  checkoutRequestId?: string | null;
  customerMessage?: string | null;
  wallet?: {
    balance: number;
  };
};

export type MpesaDepositStatusResponse = {
  transactionId: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  mpesaCode?: string | null;
  message: string;
};

export function useMpesaInitialize() {
  return useMutation({
    mutationFn: async (payload: MpesaInitializePayload) => {
      const response = await api.post<MpesaInitializeResponse>(
        "/payments/mpesa/initialize",
        payload,
      );
      return response.data;
    },
  });
}

export function useMpesaDepositStatus(transactionId?: string | null) {
  return useQuery({
    queryKey: ["mpesa-deposit-status", transactionId],
    enabled: Boolean(transactionId),
    queryFn: async () => {
      if (!transactionId) {
        throw new Error("Missing transaction id");
      }

      const response = await api.get<MpesaDepositStatusResponse>(
        `/payments/mpesa/status/${encodeURIComponent(transactionId)}`,
      );
      return response.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "COMPLETED" || status === "FAILED" || status === "REVERSED"
        ? false
        : 2500;
    },
    retry: true,
    staleTime: 0,
  });
}
