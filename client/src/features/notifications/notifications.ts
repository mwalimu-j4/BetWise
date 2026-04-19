import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";
import {
  notificationUpdateBrowserEvent,
  type NotificationStreamEvent,
} from "@/features/user/payments/wallet";

export type AppNotification = {
  id: string;
  audience: "USER" | "ADMIN";
  type:
    | "DEPOSIT_SUCCESS"
    | "DEPOSIT_FAILED"
    | "WITHDRAWAL_SUCCESS"
    | "WITHDRAWAL_FAILED"
    | "SYSTEM";
  title: string;
  message: string;
  transactionId?: string | null;
  amount?: number | null;
  balance?: number | null;
  paystackReference?: string | null;
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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleNotificationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationStreamEvent>;
      const payload = customEvent.detail;

      if (!payload) {
        return;
      }

      queryClient.setQueryData<AppNotificationsResponse>(
        [...appNotificationsQueryKey, take],
        (current) => {
          const syntheticId =
            payload.notificationId ??
            `${payload.audience}-${payload.type}-${payload.transactionId ?? "sys"}-${payload.createdAt}`;

          const existingNotifications = current?.notifications ?? [];
          const alreadyExists = existingNotifications.some(
            (item) => item.id === syntheticId,
          );

          if (alreadyExists) {
            return (
              current ?? {
                unreadCount: 0,
                notifications: [],
              }
            );
          }

          const nextNotification: AppNotification = {
            id: syntheticId,
            audience: payload.audience,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            transactionId: payload.transactionId,
            amount: payload.amount,
            balance: payload.balance,
            paystackReference: payload.paystackReference,
            isRead: false,
            createdAt: payload.createdAt,
          };

          if (payload.type === "WITHDRAWAL_SUCCESS") {
            toast.success(payload.title || "Withdrawal Successful", {
              description: payload.message,
            });
          }

          if (payload.type === "WITHDRAWAL_FAILED") {
            toast.error(payload.title || "Withdrawal Failed", {
              description: payload.message,
            });
          }

          return {
            unreadCount: (current?.unreadCount ?? 0) + 1,
            notifications: [nextNotification, ...existingNotifications].slice(
              0,
              take,
            ),
          };
        },
      );
    };

    window.addEventListener(
      notificationUpdateBrowserEvent,
      handleNotificationUpdate,
    );

    return () => {
      window.removeEventListener(
        notificationUpdateBrowserEvent,
        handleNotificationUpdate,
      );
    };
  }, [isAuthenticated, queryClient, take]);

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
