import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { api } from "@/api/axiosConfig";

export type LiveMarketKey =
  | "1x2"
  | "winner"
  | "btts"
  | "overunder"
  | "asianhandicap"
  | "drawnobet";

export type LiveSelection = {
  id: string;
  name: string;
  label: string;
  odds: number | null;
  previous_odds: number | null;
  status: "open" | "suspended";
};

export type LiveMarket = {
  id: string;
  type: string;
  name: string;
  status: "open" | "suspended";
  selections: LiveSelection[];
};

export type LiveMatch = {
  id: string;
  sport: string;
  league: {
    id: string;
    name: string;
    country: string;
    flag_emoji: string;
  };
  home_team: {
    id: string;
    name: string;
    score: number;
  };
  away_team: {
    id: string;
    name: string;
    score: number;
  };
  status: "live" | "ht" | "ft" | "suspended";
  minute: number;
  period: string;
  stats: {
    corners_home: number;
    corners_away: number;
    yellows_home: number;
    yellows_away: number;
    reds_home: number;
    reds_away: number;
  };
  markets: LiveMarket[];
  markets_count: number;
  kickoff_at: string;
  updated_at: string;
};

type LiveMatchesResponse = {
  matches: LiveMatch[];
  total: number;
  lastUpdatedAt: string;
};

type LiveOddsPollResponse = {
  odds: Array<{
    id: string;
    eventId: string;
    marketType: string;
    side: string;
    displayOdds: number;
    updatedAt: string;
  }>;
  lastUpdatedAt: string;
};

type LiveScoresPollResponse = {
  scores: Array<{
    matchId: string;
    home_score: number;
    away_score: number;
    status: "LIVE" | "FINISHED" | "CANCELLED" | "UPCOMING";
    minute: number;
    updatedAt: string;
  }>;
  lastUpdatedAt: string;
};

type ScoreUpdateMessage = {
  type: "score_update";
  matchId: string;
  home_score: number;
  away_score: number;
  minute: number;
  period?: string;
};

type OddsUpdateMessage = {
  type: "odds_update";
  matchId: string;
  marketId: string;
  selections: Array<{ id: string; odds: number | null }>;
};

type MatchStatusMessage = {
  type: "match_status";
  matchId: string;
  status: "live" | "ht" | "ft" | "suspended";
  minute: number;
  period?: string;
};

type MatchAddedMessage = {
  type: "match_added";
  match: LiveMatch;
};

type MatchRemovedMessage = {
  type: "match_removed";
  matchId: string;
};

type MatchSnapshotMessage = {
  type: "matches_snapshot";
  matches: LiveMatch[];
  updatedAt: string;
};

type LiveFilterState = {
  highlights: boolean;
  market: LiveMarketKey;
  q: string;
};

type PendingUpdate =
  | ScoreUpdateMessage
  | OddsUpdateMessage
  | MatchStatusMessage
  | MatchAddedMessage
  | MatchRemovedMessage;

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

function cloneMatches(matches: LiveMatch[]) {
  return matches.map((match) => ({
    ...match,
    league: { ...match.league },
    home_team: { ...match.home_team },
    away_team: { ...match.away_team },
    stats: { ...match.stats },
    markets: match.markets.map((market) => ({
      ...market,
      selections: market.selections.map((selection) => ({ ...selection })),
    })),
  }));
}

function isFinishedMatch(match: Pick<LiveMatch, "status">) {
  return match.status === "ft";
}

export function useLiveMatches(filters: LiveFilterState) {
  const socketRef = useRef<Socket | null>(null);
  const matchesRef = useRef<LiveMatch[]>([]);
  const pollingRef = useRef<number | null>(null);
  const oddsPollingRef = useRef<number | null>(null);
  const scoresPollingRef = useRef<number | null>(null);
  const updateQueueRef = useRef<PendingUpdate[]>([]);
  const batchFlushTimerRef = useRef<number | null>(null);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  const applyQueuedUpdates = useCallback(() => {
    if (updateQueueRef.current.length === 0) {
      return;
    }

    const queued = [...updateQueueRef.current];
    updateQueueRef.current = [];

    setMatches((current) => {
      const draft = cloneMatches(current);
      const map = new Map(draft.map((match) => [match.id, match]));

      for (const update of queued) {
        if (update.type === "match_added") {
          map.set(update.match.id, update.match);
          continue;
        }

        if (update.type === "match_removed") {
          map.delete(update.matchId);
          continue;
        }

        const target = map.get(update.matchId);
        if (!target) {
          continue;
        }

        if (update.type === "score_update") {
          target.home_team.score = update.home_score;
          target.away_team.score = update.away_score;
          target.minute = update.minute;
          if (update.period) {
            target.period = update.period;
          }
          continue;
        }

        if (update.type === "match_status") {
          if (update.status === "ft") {
            map.delete(update.matchId);
            continue;
          }

          target.status = update.status;
          target.minute = update.minute;
          if (update.period) {
            target.period = update.period;
          }
          continue;
        }

        const market = target.markets.find(
          (entry) => entry.id === update.marketId,
        );
        if (!market) {
          continue;
        }

        const selectionById = new Map(
          market.selections.map((selection) => [selection.id, selection]),
        );
        for (const change of update.selections) {
          const selected = selectionById.get(change.id);
          if (!selected) {
            continue;
          }
          selected.previous_odds = selected.odds;
          selected.odds = change.odds;
        }
      }

      return Array.from(map.values())
        .filter((match) => !isFinishedMatch(match))
        .sort((left, right) => {
          if (left.league.name !== right.league.name) {
            return left.league.name.localeCompare(right.league.name);
          }

          return left.id.localeCompare(right.id);
        });
    });
  }, []);

  const queueUpdate = useCallback(
    (update: PendingUpdate) => {
      updateQueueRef.current.push(update);

      if (batchFlushTimerRef.current !== null) {
        return;
      }

      batchFlushTimerRef.current = window.setTimeout(() => {
        batchFlushTimerRef.current = null;
        applyQueuedUpdates();
      }, 30);
    },
    [applyQueuedUpdates],
  );

  const fetchMatches = useCallback(async () => {
    try {
      setError(null);

      const { data } = await api.get<LiveMatchesResponse>("/live/matches", {
        params: {
          highlights: filters.highlights,
          market: filters.market,
          q: filters.q || undefined,
        },
      });

      setMatches(data.matches.filter((match) => !isFinishedMatch(match)));
      setLastUpdatedAt(data.lastUpdatedAt);
      setError(null);
    } catch {
      setError("Unable to load live matches right now.");
    } finally {
      setLoading(false);
    }
  }, [filters.highlights, filters.market, filters.q]);

  useEffect(() => {
    setLoading(true);
    void fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    const socket = io(`${resolveSocketBaseUrl()}/ws/live`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 10_000,
      timeout: 10_000,
    });

    socketRef.current = socket;

    const onConnect = () => {
      setIsSocketConnected(true);
      socket.emit("live:subscribe", { channel: "live:matches" });
      for (const match of matchesRef.current) {
        socket.emit("live:subscribe", { channel: `live:odds:${match.id}` });
        socket.emit("live:subscribe", { channel: `live:score:${match.id}` });
      }
    };

    const onDisconnect = () => {
      setIsSocketConnected(false);
    };

    const onSnapshot = (payload: MatchSnapshotMessage) => {
      if (!payload || payload.type !== "matches_snapshot") {
        return;
      }
      setMatches(payload.matches.filter((match) => !isFinishedMatch(match)));
      setLastUpdatedAt(payload.updatedAt);
    };

    const onOddsUpdate = (payload: OddsUpdateMessage) => {
      if (!payload || payload.type !== "odds_update") {
        return;
      }
      queueUpdate(payload);
    };

    const onScoreUpdate = (payload: ScoreUpdateMessage) => {
      if (!payload || payload.type !== "score_update") {
        return;
      }
      queueUpdate(payload);
    };

    const onMatchStatus = (payload: MatchStatusMessage) => {
      if (!payload || payload.type !== "match_status") {
        return;
      }
      queueUpdate(payload);
    };

    const onMatchAdded = (payload: MatchAddedMessage) => {
      if (!payload || payload.type !== "match_added") {
        return;
      }
      queueUpdate(payload);
    };

    const onMatchRemoved = (payload: MatchRemovedMessage) => {
      if (!payload || payload.type !== "match_removed") {
        return;
      }
      queueUpdate(payload);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("live:matches", onSnapshot);
    socket.on("live:odds:update", onOddsUpdate);
    socket.on("live:score:update", onScoreUpdate);
    socket.on("live:match:status", onMatchStatus);
    socket.on("live:match:added", onMatchAdded);
    socket.on("live:match:removed", onMatchRemoved);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("live:matches", onSnapshot);
      socket.off("live:odds:update", onOddsUpdate);
      socket.off("live:score:update", onScoreUpdate);
      socket.off("live:match:status", onMatchStatus);
      socket.off("live:match:added", onMatchAdded);
      socket.off("live:match:removed", onMatchRemoved);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queueUpdate]);

  useEffect(() => {
    if (isSocketConnected) {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      if (oddsPollingRef.current !== null) {
        window.clearInterval(oddsPollingRef.current);
        oddsPollingRef.current = null;
      }

      if (scoresPollingRef.current !== null) {
        window.clearInterval(scoresPollingRef.current);
        scoresPollingRef.current = null;
      }

      return;
    }

    pollingRef.current = window.setInterval(() => {
      void fetchMatches();
    }, 8_000);

    oddsPollingRef.current = window.setInterval(() => {
      const activeMatchIds = matchesRef.current.map((match) => match.id);
      if (activeMatchIds.length === 0) {
        return;
      }

      void api
        .get<LiveOddsPollResponse>("/live/odds", {
          params: {
            market: filters.market,
            matchIds: activeMatchIds.join(","),
          },
        })
        .then(({ data }) => {
          const byEventId = new Map<
            string,
            Array<{ id: string; odds: number }>
          >();

          for (const row of data.odds ?? []) {
            const current = byEventId.get(row.eventId) ?? [];
            current.push({ id: row.id, odds: row.displayOdds });
            byEventId.set(row.eventId, current);
          }

          for (const [matchId, selections] of byEventId) {
            const match = matchesRef.current.find(
              (entry) => entry.id === matchId,
            );
            if (!match) {
              continue;
            }

            queueUpdate({
              type: "odds_update",
              matchId,
              marketId: match.markets[0]?.id ?? `${matchId}-h2h`,
              selections,
            });
          }

          setLastUpdatedAt(data.lastUpdatedAt);
        })
        .catch(() => {
          // Fallback polling failures are soft and should not disrupt the page.
        });
    }, 5_000);

    scoresPollingRef.current = window.setInterval(() => {
      const activeMatchIds = matchesRef.current.map((match) => match.id);
      if (activeMatchIds.length === 0) {
        return;
      }

      void api
        .get<LiveScoresPollResponse>("/live/scores", {
          params: {
            matchIds: activeMatchIds.join(","),
          },
        })
        .then(({ data }) => {
          for (const row of data.scores ?? []) {
            queueUpdate({
              type: "score_update",
              matchId: row.matchId,
              home_score: row.home_score,
              away_score: row.away_score,
              minute: row.minute,
            });

            queueUpdate({
              type: "match_status",
              matchId: row.matchId,
              status:
                row.status === "FINISHED"
                  ? "ft"
                  : row.status === "CANCELLED"
                    ? "suspended"
                    : "live",
              minute: row.minute,
            });
          }

          setLastUpdatedAt(data.lastUpdatedAt);
        })
        .catch(() => {
          // Fallback polling failures are soft and should not disrupt the page.
        });
    }, 5_000);

    return () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      if (oddsPollingRef.current !== null) {
        window.clearInterval(oddsPollingRef.current);
        oddsPollingRef.current = null;
      }

      if (scoresPollingRef.current !== null) {
        window.clearInterval(scoresPollingRef.current);
        scoresPollingRef.current = null;
      }
    };
  }, [fetchMatches, filters.market, isSocketConnected, queueUpdate]);

  useEffect(() => {
    if (!socketRef.current || !isSocketConnected) {
      return;
    }

    for (const match of matches) {
      socketRef.current.emit("live:subscribe", {
        channel: `live:odds:${match.id}`,
      });
      socketRef.current.emit("live:subscribe", {
        channel: `live:score:${match.id}`,
      });
    }
  }, [isSocketConnected, matches]);

  useEffect(() => {
    return () => {
      if (batchFlushTimerRef.current !== null) {
        window.clearTimeout(batchFlushTimerRef.current);
      }
    };
  }, []);

  const groupedMatches = useMemo(() => {
    return matches.reduce<Record<string, LiveMatch[]>>((groups, match) => {
      const key = `${match.league.country} • ${match.league.name}`;
      const current = groups[key] ?? [];
      groups[key] = [...current, match];
      return groups;
    }, {});
  }, [matches]);

  return {
    matches,
    groupedMatches,
    loading,
    error,
    isSocketConnected,
    lastUpdatedAt,
    refresh: fetchMatches,
    setMatches,
  };
}

export type UseLiveMatchesReturn = ReturnType<typeof useLiveMatches>;
