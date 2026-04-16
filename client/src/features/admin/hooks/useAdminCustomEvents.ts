import { useCallback, useState } from "react";
import { api } from "@/api/axiosConfig";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

// ── Types ──

export interface CustomSelection {
  id: string;
  marketId: string;
  label: string;
  name: string;
  odds: number;
  result: "PENDING" | "WIN" | "LOSE" | "VOID";
  betCount?: number;
  liability?: {
    totalLiability: number;
    totalStake: number;
    betCount: number;
  };
}

export interface CustomMarket {
  id: string;
  eventId: string;
  name: string;
  status: "OPEN" | "SUSPENDED" | "CLOSED" | "SETTLED";
  selections: CustomSelection[];
}

export interface AdminCustomEvent {
  id: string;
  title: string;
  teamHome: string;
  teamAway: string;
  category: string;
  league: string;
  startTime: string;
  endTime: string | null;
  status:
    | "DRAFT"
    | "PUBLISHED"
    | "LIVE"
    | "SUSPENDED"
    | "FINISHED"
    | "CANCELLED";
  description: string | null;
  bannerUrl: string | null;
  createdBy: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  markets: CustomMarket[];
  totalStake?: number;
  totalBets?: number;
  marketsCount?: number;
  _count?: { bets: number };
}

export interface CustomEventStats {
  draft: number;
  published: number;
  live: number;
  finished: number;
  suspended: number;
  cancelled: number;
  total: number;
  draftCount: number;
  publishedCount: number;
  liveCount: number;
  finishedCount: number;
}

export interface CreateCustomEventData {
  title: string;
  teamHome: string;
  teamAway: string;
  category: string;
  league: string;
  startTime: string;
  endTime?: string;
  description?: string;
  bannerUrl?: string;
  markets: {
    name: string;
    selections: {
      label: string;
      name: string;
      odds: number;
    }[];
  }[];
}

// ── Hook ──

export function useAdminCustomEvents() {
  const { accessToken, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [events, setEvents] = useState<AdminCustomEvent[]>([]);
  const [stats, setStats] = useState<CustomEventStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const getAuthConfig = useCallback(
    <T extends Record<string, unknown>>(config?: T) => {
      return {
        ...(config ?? {}),
        headers: {
          ...((config as { headers?: Record<string, string> } | undefined)?.headers ?? {}),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      };
    },
    [accessToken],
  );

  const ensureAdminSession = useCallback(() => {
    if (authLoading) {
      return false;
    }

    if (!isAuthenticated || !accessToken || user?.role !== "ADMIN") {
      return false;
    }

    return true;
  }, [accessToken, authLoading, isAuthenticated, user?.role]);

  const loadStats = useCallback(async () => {
    if (!ensureAdminSession()) {
      return;
    }

    setStatsLoading(true);
    try {
      const res = await api.get<CustomEventStats>(
        "/admin/custom-events/stats",
        getAuthConfig(),
      );
      setStats(res.data);
    } catch {
      console.error("Failed to load custom event stats");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadEvents = useCallback(
    async (params?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      if (!ensureAdminSession()) {
        return;
      }

      setLoading(true);
      try {
        const res = await api.get<{
          events: AdminCustomEvent[];
          total: number;
          page: number;
          totalPages: number;
        }>("/admin/custom-events", getAuthConfig({ params }));
        setEvents(res.data.events);
        setTotal(res.data.total);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages);
      } catch (err: any) {
        const msg =
          err?.response?.data?.error || "Failed to load custom events";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [ensureAdminSession, getAuthConfig],
  );

  const loadEvent = useCallback(async (id: string) => {
    if (!ensureAdminSession()) {
      return null;
    }

    try {
      const res = await api.get<AdminCustomEvent>(
        `/admin/custom-events/${id}`,
        getAuthConfig(),
      );
      return res.data;
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to load event";
      toast.error(msg);
      return null;
    }
  }, [ensureAdminSession, getAuthConfig]);

  const createEvent = useCallback(
    async (data: CreateCustomEventData) => {
      if (!ensureAdminSession()) {
        throw new Error("Unauthorized");
      }

      try {
        const res = await api.post<AdminCustomEvent>(
          "/admin/custom-events",
          data,
          getAuthConfig(),
        );
        toast.success("Custom event created!");
        await loadStats();
        return res.data;
      } catch (err: any) {
        const msg =
          err?.response?.data?.error || "Failed to create custom event";
        toast.error(msg);
        throw err;
      }
    },
    [ensureAdminSession, getAuthConfig, loadStats],
  );

  const updateEvent = useCallback(
    async (id: string, data: Record<string, any>) => {
      if (!ensureAdminSession()) {
        throw new Error("Unauthorized");
      }

      try {
        const res = await api.patch<AdminCustomEvent>(
          `/admin/custom-events/${id}`,
          data,
          getAuthConfig(),
        );
        setEvents((prev) => prev.map((e) => (e.id === id ? res.data : e)));
        toast.success("Event updated!");
        return res.data;
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to update event";
        toast.error(msg);
        throw err;
      }
    },
    [ensureAdminSession, getAuthConfig],
  );

  const updateOdds = useCallback(
    async (eventId: string, selectionId: string, odds: number) => {
      if (!ensureAdminSession()) {
        throw new Error("Unauthorized");
      }

      try {
        await api.patch(`/admin/custom-events/${eventId}/odds`, {
          selectionId,
          odds,
        }, getAuthConfig());
        toast.success("Odds updated!");
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to update odds";
        toast.error(msg);
        throw err;
      }
    },
    [ensureAdminSession, getAuthConfig],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!ensureAdminSession()) {
        throw new Error("Unauthorized");
      }

      try {
        await api.delete(`/admin/custom-events/${id}`, getAuthConfig());
        setEvents((prev) => prev.filter((e) => e.id !== id));
        toast.success("Event deleted!");
        await loadStats();
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to delete event";
        toast.error(msg);
        throw err;
      }
    },
    [ensureAdminSession, getAuthConfig, loadStats],
  );

  const publishEvent = useCallback(
    async (id: string) => {
      if (!ensureAdminSession()) {
        throw new Error("Unauthorized");
      }

      try {
        const res = await api.post<AdminCustomEvent>(
          `/admin/custom-events/${id}/publish`,
          undefined,
          getAuthConfig(),
        );
        setEvents((prev) => prev.map((e) => (e.id === id ? res.data : e)));
        toast.success("Event published! It is now visible to users.");
        await loadStats();
        return res.data;
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to publish event";
        toast.error(msg);
        throw err;
      }
    },
    [ensureAdminSession, getAuthConfig, loadStats],
  );

  const unpublishEvent = useCallback(
    async (id: string) => {
      if (!ensureAdminSession()) {
        throw new Error("Unauthorized");
      }

      try {
        const res = await api.post<AdminCustomEvent>(
          `/admin/custom-events/${id}/unpublish`,
          undefined,
          getAuthConfig(),
        );
        setEvents((prev) => prev.map((e) => (e.id === id ? res.data : e)));
        toast.success("Event unpublished");
        await loadStats();
        return res.data;
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to unpublish event";
        toast.error(msg);
        throw err;
      }
    },
    [ensureAdminSession, getAuthConfig, loadStats],
  );

  const suspendEvent = useCallback(
    async (id: string) => {
      if (!ensureAdminSession()) {
        throw new Error("Unauthorized");
      }

      try {
        const res = await api.post<AdminCustomEvent>(
          `/admin/custom-events/${id}/suspend`,
          undefined,
          getAuthConfig(),
        );
        setEvents((prev) => prev.map((e) => (e.id === id ? res.data : e)));
        toast.success(
          res.data.status === "SUSPENDED"
            ? "Event suspended"
            : "Event resumed",
        );
        await loadStats();
        return res.data;
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to suspend event";
        toast.error(msg);
        throw err;
      }
    },
    [ensureAdminSession, getAuthConfig, loadStats],
  );

  const settleMarket = useCallback(
    async (
      eventId: string,
      marketId: string,
      winningSelectionId: string,
    ) => {
      if (!ensureAdminSession()) {
        throw new Error("Unauthorized");
      }

      try {
        const res = await api.post(`/admin/custom-events/${eventId}/settle`, {
          marketId,
          winningSelectionId,
        }, getAuthConfig());
        toast.success("Market settled successfully!");
        await loadStats();
        return res.data;
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to settle market";
        toast.error(msg);
        throw err;
      }
    },
    [ensureAdminSession, getAuthConfig, loadStats],
  );

  const addMarket = useCallback(
    async (
      eventId: string,
      market: { name: string; selections: { label: string; name: string; odds: number }[] },
    ) => {
      if (!ensureAdminSession()) {
        throw new Error("Unauthorized");
      }

      try {
        const res = await api.post(
          `/admin/custom-events/${eventId}/markets`,
          market,
          getAuthConfig(),
        );
        toast.success("Market added!");
        return res.data;
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to add market";
        toast.error(msg);
        throw err;
      }
    },
    [ensureAdminSession, getAuthConfig],
  );

  const optimisticSetEventStatus = useCallback(
    (id: string, status: AdminCustomEvent["status"]) => {
      setEvents((prev) =>
        prev.map((event) => (event.id === id ? { ...event, status } : event)),
      );
    },
    [],
  );

  return {
    events,
    stats,
    loading,
    statsLoading,
    total,
    page,
    totalPages,
    setPage,
    loadStats,
    loadEvents,
    loadEvent,
    createEvent,
    updateEvent,
    updateOdds,
    deleteEvent,
    publishEvent,
    unpublishEvent,
    suspendEvent,
    settleMarket,
    addMarket,
    optimisticSetEventStatus,
    authLoading,
    isAuthenticated,
    isAdmin: user?.role === "ADMIN",
  };
}
