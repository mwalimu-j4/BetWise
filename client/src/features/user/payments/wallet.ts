import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    const controller = new AbortController();

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = async () => {
      try {
        const response = await fetch(
          `${api.defaults.baseURL ?? "/api"}/payments/wallet/stream`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            credentials: "include",
            signal: controller.signal,
          },
        );

        if (!response.ok || !response.body) {
          throw new Error("Unable to open wallet stream.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let eventBoundary = buffer.indexOf("\n\n");
          while (eventBoundary !== -1) {
            const rawEvent = buffer.slice(0, eventBoundary);
            buffer = buffer.slice(eventBoundary + 2);
            eventBoundary = buffer.indexOf("\n\n");

            const lines = rawEvent.split("\n");
            const eventType = lines
              .find((line) => line.startsWith("event:"))
              ?.slice(6)
              .trim();
            const dataLine = lines
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim())
              .join("\n");

            if (eventType !== "wallet-update" || !dataLine) {
              continue;
            }

            const payload = JSON.parse(dataLine) as WalletStreamEvent;

            if (payload.transactionId) {
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

              void queryClient.invalidateQueries({
                queryKey: walletSummaryQueryKey,
              });
            }
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          clearReconnectTimer();
          reconnectTimerRef.current = window.setTimeout(() => {
            void connect();
          }, 5000);
        }
      }
    };

    clearReconnectTimer();
    void connect();

    return () => {
      controller.abort();
      clearReconnectTimer();
    };
  }, [accessToken, isAuthenticated, queryClient]);
}
