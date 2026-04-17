import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";
import {
  walletUpdateBrowserEvent,
  type WalletStreamEvent,
} from "@/features/user/payments/wallet";

export type ProfilePreferences = {
  theme: "dark" | "light";
  dataSaver: boolean;
};

export type ProfileData = {
  phoneMasked: string;
  avatarLetter: string;
  status: "ACTIVE" | "SUSPENDED";
  balance: number;
  bonus: number;
  preferences: ProfilePreferences;
  live: boolean;
  createdAt: string;
};

type ProfileResponse = {
  profile: ProfileData;
};

type ProfileBalanceResponse = {
  balance: number;
  bonus: number;
  live: boolean;
  updatedAt: string;
};

export type ProfileTransaction = {
  type: string;
  status: "pending" | "completed" | "failed" | "reversed";
  amount: number;
  currency: string;
  channel: string;
  reference: string;
  mpesaCode?: string | null;
  createdAt: string;
};

type ProfileTransactionsResponse = {
  transactions: ProfileTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

export const profileQueryKey = ["profile"] as const;

export function useProfile() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: profileQueryKey,
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data } = await api.get<ProfileResponse>("/profile");
      return data.profile;
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let pollingId = 0;

    const refreshBalance = async () => {
      const { data } =
        await api.get<ProfileBalanceResponse>("/profile/balance");
      queryClient.setQueryData<ProfileData | undefined>(
        profileQueryKey,
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            balance: data.balance,
            bonus: data.bonus,
            live: data.live,
          };
        },
      );
    };

    const runSafeRefresh = () => {
      void refreshBalance().catch(() => {
        // Auth interceptor handles unauthorized responses centrally.
      });
    };

    runSafeRefresh();
    pollingId = window.setInterval(runSafeRefresh, 10_000);

    return () => {
      window.clearInterval(pollingId);
    };
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleWalletRealtime = (event: Event) => {
      const customEvent = event as CustomEvent<WalletStreamEvent>;
      if (!customEvent.detail) {
        return;
      }

      queryClient.setQueryData<ProfileData | undefined>(
        profileQueryKey,
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            balance: customEvent.detail.balance,
          };
        },
      );
    };

    window.addEventListener(walletUpdateBrowserEvent, handleWalletRealtime);

    return () => {
      window.removeEventListener(
        walletUpdateBrowserEvent,
        handleWalletRealtime,
      );
    };
  }, [isAuthenticated, queryClient]);

  return profileQuery;
}

export function useProfileTransactions(enabled: boolean, limit = 5, page = 1) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["profile-transactions", page, limit],
    enabled: isAuthenticated && enabled,
    queryFn: async () => {
      const { data } = await api.get<ProfileTransactionsResponse>(
        `/profile/transactions?page=${page}&limit=${limit}`,
      );
      return data;
    },
    staleTime: 15_000,
    refetchInterval: enabled ? 30_000 : false,
    refetchOnWindowFocus: false,
  });
}
