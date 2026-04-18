import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export type PaystackInitializePayload = {
  email: string;
  amount: number;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
};

export type PaystackInitializeResponse = {
  reference: string;
  authorization_url: string;
  access_code: string;
  message: string;
};

export type PaystackVerificationResponse = {
  status: "success" | "pending" | "failed" | "processing" | "reversed";
  message: string;
  reference: string;
  data: {
    reference: string;
    amount: number;
    status: "success" | "pending" | "failed" | "processing" | "reversed";
    processedAt?: string | null;
  };
};

export type PaystackStatusResponse = {
  reference: string;
  status: "pending" | "processing" | "success" | "failed" | "reversed";
  transactionStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REVERSED";
  amount: number;
  createdAt: string;
  processedAt?: string | null;
};

export function usePaystackInitialize() {
  return useMutation({
    mutationFn: async (payload: PaystackInitializePayload) => {
      const response = await api.post<PaystackInitializeResponse>(
        "/payments/paystack/initialize",
        payload,
      );
      return response.data;
    },
  });
}

export function usePaystackVerification(reference?: string | null) {
  return useQuery({
    queryKey: ["paystack-verification", reference],
    enabled: Boolean(reference),
    queryFn: async () => {
      if (!reference) {
        throw new Error("Missing reference");
      }

      const response = await api.get<PaystackVerificationResponse>(
        `/payments/paystack/verify/${encodeURIComponent(reference)}`,
      );
      return response.data;
    },
    refetchInterval: 7000,
    staleTime: 0,
  });
}

export function usePaystackStatus(reference?: string | null) {
  return useQuery({
    queryKey: ["paystack-status", reference],
    enabled: Boolean(reference),
    queryFn: async () => {
      if (!reference) {
        throw new Error("Missing reference");
      }

      const response = await api.get<PaystackStatusResponse>(
        `/payments/paystack/status/${encodeURIComponent(reference)}`,
      );
      return response.data;
    },
    refetchInterval: 5000,
    staleTime: 0,
  });
}
