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
  isFeatured?: boolean;
  featuredPriority?: number;
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

type UseEventsOptions = {
  featured?: boolean;
  includeLiveEvents?: boolean;
  includeSports?: boolean;
  limit?: number;
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

export function useEvents(options: UseEventsOptions = {}) {
  const {
    featured = false,
    includeLiveEvents = true,
    includeSports = true,
    limit = 20,
  } = options;
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
    if (!includeSports) {
      return;
    }

    try {
      const { data } = await api.get<SportsResponse>("/user/events/sports");
      setSports(data.sports);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    }
  }, [includeSports]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<EventsResponse>("/user/events", {
        params: {
          sport: selectedSport || undefined,
          league: selectedLeague || undefined,
          featured: featured ? true : undefined,
          limit,
        },
      });

      console.log("Fetched events:", data.events);

      setEvents(data.events);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, [featured, limit, selectedLeague, selectedSport]);

  const fetchLiveEvents = useCallback(async () => {
    if (!includeLiveEvents) {
      setLiveEvents([]);
      return;
    }

    try {
      const { data } = await api.get<EventsResponse>("/user/events/live", {
        params: {
          sport: selectedSport || undefined,
          league: selectedLeague || undefined,
          featured: featured ? true : undefined,
        },
      });

      setLiveEvents(data.events);
    } catch (fetchError) {
      setError((current) => current ?? getErrorMessage(fetchError));
    }
  }, [featured, includeLiveEvents, selectedLeague, selectedSport]);

  const refetch = useCallback(() => {
    void Promise.all([
      fetchEvents(),
      includeLiveEvents ? fetchLiveEvents() : Promise.resolve(),
    ]);
  }, [fetchEvents, fetchLiveEvents, includeLiveEvents]);

  useEffect(() => {
    if (includeSports) {
      void fetchSports();
    }
  }, [fetchSports, includeSports]);

  useEffect(() => {
    void fetchEvents();
    if (includeLiveEvents) {
      void fetchLiveEvents();
    }
  }, [fetchEvents, fetchLiveEvents]);

  useEffect(() => {
    if (!includeLiveEvents) {
      return;
    }

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
  }, [fetchEvents, fetchLiveEvents, includeLiveEvents]);

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
