import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { api } from "@/api/axiosConfig";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import type { CustomEventData } from "../CustomEventCard";

export interface PlaceCustomBetData {
  eventId: string;
  selectionId: string;
  stake: number;
}

export interface CreateCustomEventData {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league?: string;
  commenceTime: string;
  h2hOdds?: {
    home: number;
    draw?: number;
    away: number;
  };
  spreadsOdds?: {
    spread: number;
    odds: {
      team1: number;
      team2: number;
    };
  };
  totalsOdds?: {
    total: number;
    odds: {
      over: number;
      under: number;
    };
  };
}

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

export const useCustomEvents = () => {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user-custom-events"],
    queryFn: async () => {
      const res = await api.get<{ events: CustomEventData[] }>(
        "/user/custom-events",
      );
      return res.data.events;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const loadEvents = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const loadEvent = useCallback(async (id: string) => {
    try {
      const res = await api.get<CustomEventData>(`/user/custom-events/${id}`);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  const placeBet = useCallback(async (data: PlaceCustomBetData) => {
    try {
      const res = await api.post<{
        success: boolean;
        bet: any;
        newBalance: number;
        message: string;
      }>(`/user/custom-events/${data.eventId}/bet`, {
        selectionId: data.selectionId,
        stake: data.stake,
      });

      toast.success(res.data.message || "Bet placed successfully!");
      return res.data;
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to place bet";
      toast.error(msg);
      throw err;
    }
  }, []);

  // Socket connection for real-time custom event status changes
  useEffect(() => {
    const socket = io(`${resolveSocketBaseUrl()}/ws/live`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      timeout: 10_000,
    });

    socketRef.current = socket;

    const onCustomEventLive = () => {
      // Refresh events when a custom event goes live
      void queryClient.invalidateQueries({ queryKey: ["user-custom-events"] });
      toast.info("A custom event is now live!", { duration: 4000 });
    };

    const onCustomEventFinished = (payload: { eventId: string }) => {
      // Update the event status in-place immediately for real-time UI feedback
      queryClient.setQueryData<CustomEventData[]>(["user-custom-events"], (prev) =>
        (prev ?? []).map((e) =>
          e.id === payload.eventId ? { ...e, status: "FINISHED" as const } : e,
        ),
      );
      toast("An event has ended. Results are being processed.", {
        duration: 5000,
        icon: "🏁",
      });
    };

    const onCustomEventSuspended = (payload: { eventId: string }) => {
      queryClient.setQueryData<CustomEventData[]>(["user-custom-events"], (prev) =>
        (prev ?? []).map((e) =>
          e.id === payload.eventId ? { ...e, status: "SUSPENDED" as const } : e,
        ),
      );
    };

    const onCustomEventPublished = () => {
      // New event published, refresh the list
      void queryClient.invalidateQueries({ queryKey: ["user-custom-events"] });
    };

    const onCustomEventOddsUpdated = () => {
      // Odds changed, refresh to get new values
      void queryClient.invalidateQueries({ queryKey: ["user-custom-events"] });
    };

    socket.on("custom_event:live", onCustomEventLive);
    socket.on("custom_event:finished", onCustomEventFinished);
    socket.on("custom_event:suspended", onCustomEventSuspended);
    socket.on("custom_event:published", onCustomEventPublished);
    socket.on("custom_event:odds_updated", onCustomEventOddsUpdated);

    return () => {
      socket.off("custom_event:live", onCustomEventLive);
      socket.off("custom_event:finished", onCustomEventFinished);
      socket.off("custom_event:suspended", onCustomEventSuspended);
      socket.off("custom_event:published", onCustomEventPublished);
      socket.off("custom_event:odds_updated", onCustomEventOddsUpdated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  const error = isAxiosError<{ error?: string }>(query.error)
    ? (query.error.response?.data?.error ?? "Failed to load custom events")
    : query.error
      ? "Failed to load custom events"
      : "";

  return {
    events: query.data ?? [],
    loading: query.isLoading,
    error,
    loadEvents,
    loadEvent,
    placeBet,
  };
};

export type { CustomEventData };
