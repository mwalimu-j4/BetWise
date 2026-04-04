import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/api/axiosConfig";

export type WalletTransactionType =
  | "deposit"
  | "withdrawal"
  | "bet-stake"
  | "bet-win"
  | "refund"
  | "bonus";

export type WalletTransactionStatus =
  | "completed"
  | "pending"
  | "failed"
  | "reversed";

export type WalletTransaction = {
  id: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: number;
  currency: "KES";
  channel: string;
  reference: string;
  createdAt: string;
};

export type WalletSummaryResponse = {
  wallet: {
    balance: number;
    totalDepositsThisMonth: number;
  };
  transactions: WalletTransaction[];
};

export type StkPushResponse = {
  message: string;
  transactionId?: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  customerMessage?: string;
  wallet?: {
    balance: number;
  };
};

export type MpesaTransactionStatusResponse = {
  transactionId: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  message: string;
};

export type WalletStreamEvent = {
  transactionId: string;
  checkoutRequestId?: string | null;
  merchantRequestId?: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  message: string;
  balance: number;
  amount: number;
};

export const walletSummaryQueryKey = ["wallet-summary"] as const;

function resolveSocketBaseUrl() {
  const rawBaseUrl = api.defaults.baseURL;

  if (typeof rawBaseUrl === "string" && rawBaseUrl.startsWith("http")) {
    return new URL(rawBaseUrl).origin;
  }

  return window.location.origin;
}

export function useWalletSummary() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: walletSummaryQueryKey,
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data } = await api.get<WalletSummaryResponse>(
        "/payments/wallet/summary",
      );

      return data;
    },
    staleTime: 10_000,
  });
}

export function useWalletRealtime() {
  const { isAuthenticated, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    socketRef.current?.disconnect();
    const socket = io(resolveSocketBaseUrl(), {
      transports: ["websocket"],
      withCredentials: true,
      auth: {
        token: accessToken,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    const handleWalletUpdate = (payload: WalletStreamEvent) => {
      queryClient.setQueryData<WalletSummaryResponse>(
        walletSummaryQueryKey,
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            wallet: {
              ...current.wallet,
              balance: payload.balance,
            },
          };
        },
      );

      void queryClient.invalidateQueries({ queryKey: walletSummaryQueryKey });
    };

    socket.on("wallet:update", handleWalletUpdate);

    return () => {
      socket.off("wallet:update", handleWalletUpdate);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [accessToken, isAuthenticated, queryClient]);
}
