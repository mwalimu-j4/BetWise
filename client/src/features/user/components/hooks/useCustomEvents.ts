import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { api } from "@/api/axiosConfig";
import { toast } from "sonner";
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
  const [events, setEvents] = useState<CustomEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<{ events: CustomEventData[] }>(
        "/user/custom-events",
      );
      setEvents(res.data.events);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to load custom events";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadEvents();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [loadEvents]);

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
      void loadEvents();
      toast.info("A custom event is now live!", { duration: 4000 });
    };

    const onCustomEventFinished = (payload: { eventId: string }) => {
      // Update the event status in-place immediately for real-time UI feedback
      setEvents((prev) =>
        prev.map((e) =>
          e.id === payload.eventId ? { ...e, status: "FINISHED" as const } : e,
        ),
      );
      toast("An event has ended. Results are being processed.", {
        duration: 5000,
        icon: "🏁",
      });
    };

    const onCustomEventSuspended = (payload: { eventId: string }) => {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === payload.eventId ? { ...e, status: "SUSPENDED" as const } : e,
        ),
      );
    };

    const onCustomEventPublished = () => {
      // New event published, refresh the list
      void loadEvents();
    };

    const onCustomEventOddsUpdated = () => {
      // Odds changed, refresh to get new values
      void loadEvents();
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
  }, [loadEvents]);

  return {
    events,
    loading,
    error,
    loadEvents,
    loadEvent,
    placeBet,
  };
};

export type { CustomEventData };
