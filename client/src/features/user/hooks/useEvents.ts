import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "@/api/axiosConfig";

export interface ApiEvent {
  id: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string | null;
  sportKey: string | null;
  commenceTime: string;
  status: "UPCOMING" | "LIVE" | "FINISHED";
  homeScore: number | null;
  awayScore: number | null;
  markets: {
    h2h: { home: number; draw: number | null; away: number } | null;
    spreads: { home: number | null; away: number | null } | null;
    totals: { over: number | null; under: number | null } | null;
  };
  _count: { bets: number };
}

type SportsResponse = {
  sports: { sportKey: string; leagues: string[] }[];
};

type EventsResponse = {
  events: ApiEvent[];
};

function getErrorMessage(error: unknown) {
  if (isAxiosError<{ error?: string; message?: string }>(error)) {
    const errorValue = error.response?.data?.error;
    const messageValue = error.response?.data?.message;

    if (typeof errorValue === "string" && errorValue.trim()) {
      return errorValue;
    }

    if (typeof messageValue === "string" && messageValue.trim()) {
      return messageValue;
    }

    return "Unable to load matches right now.";
  }

  return "Unable to load matches right now.";
}

export function useEvents() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [liveEvents, setLiveEvents] = useState<ApiEvent[]>([]);
  const [sports, setSports] = useState<
    { sportKey: string; leagues: string[] }[]
  >([]);
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSports = useCallback(async () => {
    try {
      const { data } = await api.get<SportsResponse>("/user/events/sports");
      setSports(data.sports);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<EventsResponse>("/user/events", {
        params: {
          sport: selectedSport || undefined,
          league: selectedLeague || undefined,
        },
      });

      console.log("Fetched events:", data.events);

      setEvents(data.events);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, [selectedLeague, selectedSport]);

  const fetchLiveEvents = useCallback(async () => {
    try {
      const { data } = await api.get<EventsResponse>("/user/events/live", {
        params: {
          sport: selectedSport || undefined,
          league: selectedLeague || undefined,
        },
      });

      setLiveEvents(data.events);
    } catch (fetchError) {
      setError((current) => current ?? getErrorMessage(fetchError));
    }
  }, [selectedLeague, selectedSport]);

  const refetch = useCallback(() => {
    void Promise.all([fetchEvents(), fetchLiveEvents()]);
  }, [fetchEvents, fetchLiveEvents]);

  useEffect(() => {
    void fetchSports();
  }, [fetchSports]);

  useEffect(() => {
    void fetchEvents();
    void fetchLiveEvents();
  }, [fetchEvents, fetchLiveEvents]);

  useEffect(() => {
    const liveInterval = window.setInterval(() => {
      void fetchLiveEvents();
    }, 30_000);

    const eventsInterval = window.setInterval(() => {
      void fetchEvents();
    }, 120_000);

    return () => {
      window.clearInterval(liveInterval);
      window.clearInterval(eventsInterval);
    };
  }, [fetchEvents, fetchLiveEvents]);

  return {
    events,
    liveEvents,
    loading,
    error,
    sports,
    selectedSport,
    selectedLeague,
    setSelectedSport,
    setSelectedLeague,
    refetch,
  };
}

export default useEvents;
