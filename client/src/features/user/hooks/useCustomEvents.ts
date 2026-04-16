import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/axiosConfig";
import { toast } from "sonner";
import type { CustomEventData } from "../components/CustomEventCard";

export interface PlaceCustomBetData {
  eventId: string;
  selectionId: string;
  stake: number;
}

export const useCustomEvents = () => {
  const [events, setEvents] = useState<CustomEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const placeBet = useCallback(
    async (data: PlaceCustomBetData) => {
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
    },
    [],
  );

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
