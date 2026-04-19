import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";

export type MyBetStatus = "bonus" | "won" | "lost" | "open" | "cancelled";
export type MyBetTab =
  | "normal"
  | "shilisha"
  | "jackpot"
  | "virtual"
  | "sababisha"
  | "custom"
  | "all";
export type MyBetFilter = "open" | "all" | "today" | "week" | "month";

export type MyBetListItem = {
  id: string;
  bet_code: string;
  status: MyBetStatus;
  amount: number;
  possible_payout: number;
  total_odds: number;
  selections_count: number;
  match_name?: string;
  placed_at: string;
  cancellable_until: string;
  is_cancellable: boolean;
  is_live: boolean;
};

export type MyBetsResponse = {
  items: MyBetListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  tab: MyBetTab;
  filter: MyBetFilter;
  hideLost: boolean;
  lastUpdatedAt: string;
};

type UseMyBetsArgs = {
  tab: MyBetTab;
  filter: MyBetFilter;
  page: number;
  hideLost: boolean;
};

export const myBetsQueryKey = (args: UseMyBetsArgs) =>
  ["my-bets", args.tab, args.filter, args.page, args.hideLost] as const;

export const myBetsNavbarCountQueryKey = ["my-bets", "navbar-count"] as const;

function resolveSocketBaseUrl() {
  const explicitSocketUrl = import.meta.env.VITE_SOCKET_BASE_URL?.trim();
  if (explicitSocketUrl) {
    return explicitSocketUrl;
  }

  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (rawBaseUrl && rawBaseUrl.startsWith("http")) {
    return new URL(rawBaseUrl).origin;
  }

  return "http://localhost:5000";
}

function applyClientFilters(
  items: MyBetListItem[],
  filter: MyBetFilter,
  hideLost: boolean,
) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now);
  monthStart.setDate(monthStart.getDate() - 30);

  return items.filter((item) => {
    if (hideLost && item.status === "lost") {
      return false;
    }

    if (filter === "open") {
      return item.status === "open";
    }

    const placedAt = new Date(item.placed_at);

    if (filter === "today") {
      return placedAt >= todayStart;
    }

    if (filter === "week") {
      return placedAt >= weekStart;
    }

    if (filter === "month") {
      return placedAt >= monthStart;
    }

    return true;
  });
}

export function useMyBets(args: UseMyBetsArgs) {
  const { isAuthenticated, accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const query = useQuery({
    queryKey: myBetsQueryKey(args),
    enabled: isAuthenticated,
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      const { data } = await api.get<MyBetsResponse>("/my-bets", {
        params: {
          tab: args.tab,
          filter: args.filter,
          page: args.page,
          hideLost: args.hideLost,
        },
      });

      setLastUpdatedAt(data.lastUpdatedAt);
      return data;
    },
    refetchInterval: (queryState) => {
      const nextData = queryState.state.data;
      if (!nextData) {
        return 10_000;
      }

      const hasOpenBets = nextData.items.some((item) => item.status === "open");
      return hasOpenBets ? 10_000 : false;
    },
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastUpdatedAt(new Date().toISOString());
    }, 10_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const argsKey = useMemo(
    () => JSON.stringify(args),
    [args.tab, args.filter, args.page, args.hideLost],
  );

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user?.id) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    // Connect or reuse socket
    if (socketRef.current?.connected) {
      // If args changed but we are already connected, we might need to re-subscribe
      // but the current implementation just refreshes the whole query which is fine.
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

    const refreshCurrentBets = () => {
      void queryClient.invalidateQueries({
        queryKey: myBetsQueryKey(args),
      });
      setLastUpdatedAt(new Date().toISOString());
    };

    socket.on("bets:update", refreshCurrentBets);
    socket.on(`user:${user.id}:bets`, refreshCurrentBets);

    return () => {
      socket.off("bets:update", refreshCurrentBets);
      socket.off(`user:${user.id}:bets`, refreshCurrentBets);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [accessToken, argsKey, isAuthenticated, queryClient, user?.id]);

  const filteredItems = useMemo(() => {
    return applyClientFilters(
      query.data?.items ?? [],
      args.filter,
      args.hideLost,
    );
  }, [args.filter, args.hideLost, query.data?.items]);

  return {
    ...query,
    items: filteredItems,
    rawItems: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? args.page,
    totalPages: query.data?.totalPages ?? 1,
    pageSize: query.data?.pageSize ?? 20,
    lastUpdatedAt,
  };
}

export function useMyBetsCount() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: myBetsNavbarCountQueryKey,
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data } = await api.get<MyBetsResponse>("/my-bets", {
        params: {
          tab: "all",
          filter: "all",
          page: 1,
          hideLost: false,
        },
      });

      return data.total;
    },
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
}
