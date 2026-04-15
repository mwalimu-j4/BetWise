import { useCallback, useState } from "react";
import { api } from "@/api/axiosConfig";
import { toast } from "sonner";

export interface CustomEvent {
  id: string;
  eventId: string;
  userId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league?: string;
  commenceTime: string;
  status: "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
  homeScore?: number;
  awayScore?: number;
  h2hOdds?: { home: number; draw?: number; away: number };
  spreadsOdds?: { spread: number; odds: { team1: number; team2: number } };
  totalsOdds?: { total: number; odds: { over: number; under: number } };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomEventData {
  homeTeam: string;
  awayTeam: string;
  sport?: string;
  league?: string;
  commenceTime: string;
  h2hOdds?: { home: number; draw?: number; away: number };
  spreadsOdds?: { spread: number; odds: { team1: number; team2: number } };
  totalsOdds?: { total: number; odds: { over: number; under: number } };
}

export interface UpdateCustomEventData {
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  commenceTime?: string;
  status?: "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
  homeScore?: number;
  awayScore?: number;
  h2hOdds?: { home: number; draw?: number; away: number };
  spreadsOdds?: { spread: number; odds: { team1: number; team2: number } };
  totalsOdds?: { total: number; odds: { over: number; under: number } };
}

export const useCustomEvents = () => {
  const [events, setEvents] = useState<CustomEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async (status?: string) => {
    setLoading(true);
    setError("");
    try {
      const params = status ? { status } : {};
      const res = await api.get<{ events: CustomEvent[] }>(
        "/user/custom-events",
        {
          params,
        },
      );
      setEvents(res.data.events);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to load events";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const createEvent = useCallback(async (data: CreateCustomEventData) => {
    try {
      const res = await api.post<CustomEvent>("/user/custom-events", data);
      setEvents((prev) => [res.data, ...prev]);
      toast.success("Event created successfully! ✨", {
        description: `${data.homeTeam} vs ${data.awayTeam}`,
      });
      return res.data;
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to create event";
      toast.error(msg);
      throw err;
    }
  }, []);

  const updateEvent = useCallback(
    async (eventId: string, data: UpdateCustomEventData) => {
      try {
        const res = await api.patch<CustomEvent>(
          `/user/custom-events/${eventId}`,
          data,
        );
        setEvents((prev) =>
          prev.map((e) => (e.eventId === eventId ? res.data : e)),
        );
        toast.success("Event updated successfully!");
        return res.data;
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to update event";
        toast.error(msg);
        throw err;
      }
    },
    [],
  );

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      await api.delete(`/user/custom-events/${eventId}`);
      setEvents((prev) => prev.filter((e) => e.eventId !== eventId));
      toast.success("Event deleted!");
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to delete event";
      toast.error(msg);
      throw err;
    }
  }, []);

  return {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
};
