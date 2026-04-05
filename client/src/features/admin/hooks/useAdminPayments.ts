import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export interface Payment {
  id: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  userName?: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: "pending" | "completed" | "failed" | "reversed";
  reference: string;
  channel: string;
  mpesaCode?: string;
  phone?: string;
  createdAt: string;
  processedAt?: string | null;
  fee: number;
  totalDebit: number;
}

export interface PaymentsResponse {
  transactions: Payment[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

export interface PaymentStats {
  deposits: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    totalValue: number;
    pendingValue: number;
  };
  withdrawals: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    totalValue: number;
    pendingValue: number;
  };
}

export interface PaymentStatsResponse {
  stats: PaymentStats;
}

export function useAdminPayments(
  limit: number = 50,
  offset: number = 0,
  status?: string,
  type?: string,
) {
  return useQuery({
    queryKey: ["admin-payments", limit, offset, status, type],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());
      if (status) params.append("status", status);
      if (type) params.append("type", type);

      const response = await api.get<PaymentsResponse>(
        `/admin/payments?${params.toString()}`,
      );
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useAdminPaymentStats() {
  return useQuery({
    queryKey: ["admin-payment-stats"],
    queryFn: async () => {
      const response = await api.get<PaymentStatsResponse>(
        "/admin/payments/stats",
      );
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
