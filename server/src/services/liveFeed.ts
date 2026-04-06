import { prisma } from "../lib/prisma";
import {
  emitLiveMatchAdded,
  emitLiveMatchRemoved,
  emitLiveMatches,
  emitLiveMatchStatus,
  emitLiveOddsUpdate,
  emitLiveScoreUpdate,
} from "../lib/socket";
import { liveSelect, toLiveMatch } from "../routes/live";

type LiveSelection = {
  id: string;
  name: string;
  label: string;
  odds: number | null;
  previous_odds: number | null;
  status: "open" | "suspended";
};

type LiveMatchView = ReturnType<typeof toLiveMatch>;

let feedInterval: NodeJS.Timeout | null = null;
let running = false;
let previousSnapshot = new Map<string, LiveMatchView>();

function toOddsMap(match: LiveMatchView) {
  const market = match.markets[0];
  const map = new Map<string, LiveSelection>();

  for (const selection of market?.selections ?? []) {
    map.set(selection.id, selection as LiveSelection);
  }

  return map;
}

async function pushLiveFeed() {
  if (running) {
    return;
  }

  running = true;

  try {
    const events = await prisma.sportEvent.findMany({
      where: {
        isActive: true,
        status: "LIVE",
      },
      select: liveSelect,
      orderBy: [{ commenceTime: "asc" }, { updatedAt: "desc" }],
      take: 250,
    });

    const nextMatches = events.map((event) => toLiveMatch(event, "1x2"));
    const nextMap = new Map(nextMatches.map((match) => [match.id, match]));

    emitLiveMatches({
      type: "matches_snapshot",
      matches: nextMatches,
      updatedAt: new Date().toISOString(),
    });

    for (const match of nextMatches) {
      const previous = previousSnapshot.get(match.id);

      if (!previous) {
        emitLiveMatchAdded({ type: "match_added", match });
      }

      if (
        !previous ||
        previous.home_team.score !== match.home_team.score ||
        previous.away_team.score !== match.away_team.score ||
        previous.minute !== match.minute
      ) {
        emitLiveScoreUpdate(match.id, {
          type: "score_update",
          matchId: match.id,
          home_score: match.home_team.score,
          away_score: match.away_team.score,
          minute: match.minute,
          period: match.period,
        });
      }

      if (!previous || previous.status !== match.status) {
        emitLiveMatchStatus(match.id, {
          type: "match_status",
          matchId: match.id,
          status: match.status,
          minute: match.minute,
          period: match.period,
        });
      }

      const previousOdds = previous ? toOddsMap(previous) : new Map();
      const nextOdds = toOddsMap(match);
      const changedSelections: Array<{ id: string; odds: number | null }> = [];

      for (const [selectionId, nextSelection] of nextOdds) {
        const previousSelection = previousOdds.get(selectionId);
        if (
          !previousSelection ||
          previousSelection.odds !== nextSelection.odds
        ) {
          changedSelections.push({ id: selectionId, odds: nextSelection.odds });
        }
      }

      if (changedSelections.length > 0) {
        emitLiveOddsUpdate(match.id, {
          type: "odds_update",
          matchId: match.id,
          marketId: match.markets[0]?.id ?? `${match.id}-h2h`,
          selections: changedSelections,
        });
      }
    }

    for (const [previousMatchId] of previousSnapshot) {
      if (!nextMap.has(previousMatchId)) {
        emitLiveMatchRemoved({
          type: "match_removed",
          matchId: previousMatchId,
        });
      }
    }

    previousSnapshot = nextMap;
  } catch (error) {
    console.error("[live-feed] broadcast failed", error);
  } finally {
    running = false;
  }
}

export function startLiveFeed() {
  if (feedInterval) {
    return;
  }

  void pushLiveFeed();
  feedInterval = setInterval(() => {
    void pushLiveFeed();
  }, 5000);
}
