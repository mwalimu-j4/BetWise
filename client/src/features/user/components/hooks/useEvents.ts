import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  marketCount: number;
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
  includeEvents?: boolean;
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
    includeEvents = true,
    includeLiveEvents = true,
    includeSports = true,
    limit = 20,
  } = options;
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("");
  const sportsQuery = useQuery({
    queryKey: ["user-events-sports"],
    enabled: includeSports,
    queryFn: async () => {
      const { data } = await api.get<SportsResponse>("/user/events/sports");
      return data.sports;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const eventsQuery = useQuery({
    queryKey: [
      "user-events",
      selectedSport,
      selectedLeague,
      featured,
      limit,
    ],
    enabled: includeEvents,
    queryFn: async () => {
      const { data } = await api.get<EventsResponse>("/user/events", {
        params: {
          sport: selectedSport || undefined,
          league: selectedLeague || undefined,
          featured: featured ? true : undefined,
          limit,
        },
      });

      return data.events;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const liveEventsQuery = useQuery({
    queryKey: ["user-events-live", selectedSport, selectedLeague, featured],
    enabled: includeLiveEvents,
    queryFn: async () => {
      const { data } = await api.get<EventsResponse>("/user/events/live", {
        params: {
          sport: selectedSport || undefined,
          league: selectedLeague || undefined,
          featured: featured ? true : undefined,
        },
      });

      return data.events;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });

  const fetchSports = useCallback(async () => {
    if (!includeSports) {
      return;
    }

    await sportsQuery.refetch();
  }, [includeSports, sportsQuery]);

  const fetchEvents = useCallback(async () => {
    if (!includeEvents) {
      return;
    }

    await eventsQuery.refetch();
  }, [eventsQuery, includeEvents]);

  const fetchLiveEvents = useCallback(async () => {
    if (!includeLiveEvents) {
      return;
    }

    await liveEventsQuery.refetch();
  }, [includeLiveEvents, liveEventsQuery]);

  const refetch = useCallback(() => {
    return Promise.all([
      fetchEvents(),
      includeLiveEvents ? fetchLiveEvents() : Promise.resolve(),
    ]);
  }, [fetchEvents, fetchLiveEvents, includeLiveEvents]);

  const loading =
    (includeEvents && eventsQuery.isLoading) ||
    (includeLiveEvents && liveEventsQuery.isLoading) ||
    (includeSports && sportsQuery.isLoading);

  const error =
    (eventsQuery.error && getErrorMessage(eventsQuery.error)) ||
    (liveEventsQuery.error && getErrorMessage(liveEventsQuery.error)) ||
    (sportsQuery.error && getErrorMessage(sportsQuery.error)) ||
    null;

  return {
    events: eventsQuery.data ?? [],
    liveEvents: liveEventsQuery.data ?? [],
    loading,
    error,
    sports: sportsQuery.data ?? [],
    selectedSport,
    selectedLeague,
    setSelectedSport,
    setSelectedLeague,
    refetch,
    refreshSports: fetchSports,
  };
}

export default useEvents;
