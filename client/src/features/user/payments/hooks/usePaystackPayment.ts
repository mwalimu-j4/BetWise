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
  transactionStatus:
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "REVERSED";
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
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Keep polling until we get a terminal status
      return status === "success" ||
        status === "failed" ||
        status === "reversed"
        ? false
        : 2000; // Poll every 2 seconds
    },
    retry: true, // Always retry on any error
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 500ms, 1s, 2s, 4s, 8s (max 20 retries = ~33 seconds)
      return Math.min(500 * Math.pow(2, attemptIndex), 8000);
    },
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
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "success" ||
        status === "failed" ||
        status === "reversed"
        ? false
        : 5000;
    },
    staleTime: 0,
  });
}
