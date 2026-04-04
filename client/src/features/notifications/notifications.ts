import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";

export type AppNotification = {
  id: string;
  audience: "USER" | "ADMIN";
  type: "DEPOSIT_SUCCESS" | "DEPOSIT_FAILED" | "SYSTEM";
  title: string;
  message: string;
  transactionId?: string | null;
  amount?: number | null;
  balance?: number | null;
  mpesaCode?: string | null;
  isRead: boolean;
  createdAt: string;
};

export type AppNotificationsResponse = {
  notifications: AppNotification[];
  unreadCount: number;
};

export const appNotificationsQueryKey = ["app-notifications"] as const;

export function useAppNotifications(take = 20) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...appNotificationsQueryKey, take],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data } = await api.get<AppNotificationsResponse>(
        `/notifications?take=${take}`,
      );

      return data;
    },
    staleTime: 10_000,
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return async () => {
    await api.patch("/notifications/read-all");
    await queryClient.invalidateQueries({ queryKey: appNotificationsQueryKey });
  };
}
