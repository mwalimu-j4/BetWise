import { Prisma, type EventStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  liveMatchesRateLimiter,
  liveOddsRateLimiter,
} from "../middleware/rateLimiter";
import { prisma } from "../lib/prisma";

const liveRouter = Router();

const marketTypeMap = {
  "1x2": "h2h",
  winner: "h2h",
  btts: "btts",
  overunder: "totals",
  asianhandicap: "spreads",
  drawnobet: "draw_no_bet",
} as const;

const liveQuerySchema = z.object({
  market: z
    .enum(["1x2", "winner", "btts", "overunder", "asianhandicap", "drawnobet"])
    .optional(),
  highlights: z.coerce.boolean().optional(),
  sport: z.string().trim().optional(),
  league: z.string().trim().optional(),
  country: z.string().trim().optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(300).default(150),
});

const oddsQuerySchema = z.object({
  matchIds: z.string().trim().optional(),
  market: z
    .enum(["1x2", "winner", "btts", "overunder", "asianhandicap", "drawnobet"])
    .optional(),
});

const scoresQuerySchema = z.object({
  matchIds: z.string().trim().optional(),
});

const liveSelect = {
  id: true,
  eventId: true,
  isActive: true,
  leagueId: true,
  leagueName: true,
  sportKey: true,
  homeTeam: true,
  awayTeam: true,
  commenceTime: true,
  status: true,
  homeScore: true,
  awayScore: true,
  rawData: true,
  updatedAt: true,
  displayedOdds: {
    where: {
      isVisible: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      marketType: true,
      side: true,
      displayOdds: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.SportEventSelect;

type LiveEventRecord = Prisma.SportEventGetPayload<{
  select: typeof liveSelect;
}>;

type SelectionView = {
  id: string;
  name: string;
  label: string;
  odds: number | null;
  previous_odds: number | null;
  status: "open" | "suspended";
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function extractStats(rawData: Prisma.JsonValue | null) {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return {
      corners_home: 0,
      corners_away: 0,
      yellows_home: 0,
      yellows_away: 0,
      reds_home: 0,
      reds_away: 0,
    };
  }

  const payload = rawData as Record<string, unknown>;
  const statsObj =
    (payload.stats as Record<string, unknown> | undefined) ?? payload;

  return {
    corners_home: toNumber(
      statsObj.corners_home ?? statsObj.home_corners ?? statsObj.homeCorners,
      0,
    ),
    corners_away: toNumber(
      statsObj.corners_away ?? statsObj.away_corners ?? statsObj.awayCorners,
      0,
    ),
    yellows_home: toNumber(
      statsObj.yellows_home ?? statsObj.home_yellows ?? statsObj.homeYellows,
      0,
    ),
    yellows_away: toNumber(
      statsObj.yellows_away ?? statsObj.away_yellows ?? statsObj.awayYellows,
      0,
    ),
    reds_home: toNumber(
      statsObj.reds_home ?? statsObj.home_reds ?? statsObj.homeReds,
      0,
    ),
    reds_away: toNumber(
      statsObj.reds_away ?? statsObj.away_reds ?? statsObj.awayReds,
      0,
    ),
  };
}

function inferPeriod(status: EventStatus, minute: number) {
  if (status === "FINISHED") {
    return "FT";
  }

  if (status === "CANCELLED") {
    return "Suspended";
  }

  if (status !== "LIVE") {
    return "Pre-match";
  }

  if (minute === 45) {
    return "HT";
  }

  if (minute <= 45) {
    return "1st half";
  }

  return "2nd half";
}

function estimateMinute(commenceTime: Date, status: EventStatus) {
  if (status !== "LIVE") {
    return 0;
  }

  const diffMinutes = Math.floor(
    (Date.now() - new Date(commenceTime).getTime()) / 60000,
  );

  return Math.max(1, Math.min(diffMinutes, 120));
}

function toSelection(
  sideName: string,
  label: string,
  matched: LiveEventRecord["displayedOdds"][number] | undefined,
): SelectionView {
  return {
    id: matched?.id ?? `${label}-${sideName}`,
    name: sideName,
    label,
    odds: matched?.displayOdds ?? null,
    previous_odds: matched?.displayOdds ?? null,
    status: matched ? "open" : "suspended",
  };
}

function toMarketSelections(
  event: LiveEventRecord,
  market: keyof typeof marketTypeMap,
) {
  const mappedType = marketTypeMap[market];
  const rows = event.displayedOdds.filter(
    (odd) => odd.marketType === mappedType,
  );
  const homeName = normalize(event.homeTeam);
  const awayName = normalize(event.awayTeam);

  const takeBest = (
    matcher: (row: LiveEventRecord["displayedOdds"][number]) => boolean,
  ) => {
    return rows
      .filter(matcher)
      .sort((left, right) => right.displayOdds - left.displayOdds)[0];
  };

  if (mappedType === "h2h") {
    return [
      toSelection(
        "1",
        "Home",
        takeBest(
          (row) =>
            normalize(row.side) === homeName || normalize(row.side) === "1",
        ),
      ),
      toSelection(
        "X",
        "Draw",
        takeBest((row) => {
          const value = normalize(row.side);
          return value === "x" || value === "draw" || value === "tie";
        }),
      ),
      toSelection(
        "2",
        "Away",
        takeBest(
          (row) =>
            normalize(row.side) === awayName || normalize(row.side) === "2",
        ),
      ),
    ];
  }

  if (mappedType === "totals") {
    return [
      toSelection(
        "Over",
        "Over",
        takeBest((row) => normalize(row.side).startsWith("over")),
      ),
      toSelection(
        "Under",
        "Under",
        takeBest((row) => normalize(row.side).startsWith("under")),
      ),
    ];
  }

  if (mappedType === "spreads") {
    return [
      toSelection(
        event.homeTeam,
        "Home",
        takeBest((row) => normalize(row.side) === homeName),
      ),
      toSelection(
        event.awayTeam,
        "Away",
        takeBest((row) => normalize(row.side) === awayName),
      ),
    ];
  }

  if (mappedType === "draw_no_bet") {
    return [
      toSelection(
        event.homeTeam,
        "Home",
        takeBest((row) => normalize(row.side) === homeName),
      ),
      toSelection(
        event.awayTeam,
        "Away",
        takeBest((row) => normalize(row.side) === awayName),
      ),
    ];
  }

  if (mappedType === "btts") {
    return [
      toSelection(
        "Yes",
        "Yes",
        takeBest((row) => normalize(row.side) === "yes"),
      ),
      toSelection(
        "No",
        "No",
        takeBest((row) => normalize(row.side) === "no"),
      ),
    ];
  }

  return [];
}

function toLiveMatch(
  event: LiveEventRecord,
  market: keyof typeof marketTypeMap,
) {
  const minute = estimateMinute(event.commenceTime, event.status);
  const period = inferPeriod(event.status, minute);
  const selections = toMarketSelections(event, market);

  return {
    id: event.eventId,
    sport: event.sportKey ?? "football",
    league: {
      id: event.leagueId ?? event.leagueName ?? "unknown",
      name: event.leagueName ?? "Live League",
      country: "Global",
      flag_emoji: "🌍",
    },
    home_team: {
      id: `${event.eventId}-home`,
      name: event.homeTeam,
      score: event.homeScore ?? 0,
    },
    away_team: {
      id: `${event.eventId}-away`,
      name: event.awayTeam,
      score: event.awayScore ?? 0,
    },
    status:
      event.status === "LIVE"
        ? "live"
        : event.status === "FINISHED"
          ? "ft"
          : event.status === "CANCELLED"
            ? "suspended"
            : "live",
    minute,
    period,
    stats: extractStats(event.rawData),
    markets: [
      {
        id: `${event.eventId}-${marketTypeMap[market]}`,
        type: marketTypeMap[market],
        name: market,
        status: selections.every(
          (selection) => selection.status === "suspended",
        )
          ? "suspended"
          : "open",
        selections,
      },
    ],
    markets_count: event.displayedOdds.length,
    kickoff_at: event.commenceTime,
    updated_at: event.updatedAt,
  };
}

function toMatchIds(value: string | undefined) {
  if (!value) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

async function queryLiveEvents(args: z.infer<typeof liveQuerySchema>) {
  const market = args.market ?? "1x2";

  const events = await prisma.sportEvent.findMany({
    where: {
      isActive: true,
      status: "LIVE",
      sportKey: args.sport || undefined,
      leagueName: args.league
        ? {
            contains: args.league,
            mode: "insensitive",
          }
        : undefined,
      OR: args.q
        ? [
            { homeTeam: { contains: args.q, mode: "insensitive" } },
            { awayTeam: { contains: args.q, mode: "insensitive" } },
            { leagueName: { contains: args.q, mode: "insensitive" } },
          ]
        : undefined,
    },
    select: liveSelect,
    orderBy: [{ commenceTime: "asc" }, { updatedAt: "desc" }],
    take: args.limit,
  });

  const mapped = events.map((event) => toLiveMatch(event, market));

  if (!args.highlights) {
    return mapped;
  }

  return [...mapped]
    .sort((left, right) => right.markets_count - left.markets_count)
    .slice(0, 20);
}

liveRouter.get(
  "/live/matches",
  liveMatchesRateLimiter,
  async (req, res, next) => {
    try {
      const parsedQuery = liveQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({ error: "Invalid live matches query" });
      }

      const matches = await queryLiveEvents(parsedQuery.data);

      return res.status(200).json({
        matches,
        total: matches.length,
        lastUpdatedAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

liveRouter.get(
  "/live/:matchId",
  liveMatchesRateLimiter,
  async (req, res, next) => {
    try {
      const matchId = Array.isArray(req.params.matchId)
        ? req.params.matchId[0]
        : req.params.matchId;

      if (!matchId) {
        return res.status(400).json({ error: "Invalid match id" });
      }

      const event = await prisma.sportEvent.findUnique({
        where: { eventId: matchId },
        select: liveSelect,
      });

      if (!event || !event.isActive) {
        return res.status(404).json({ error: "Live match not found" });
      }

      const markets = [
        "1x2",
        "btts",
        "overunder",
        "asianhandicap",
        "drawnobet",
      ] as const;

      const match = {
        ...toLiveMatch(event, "1x2"),
        markets: markets.map((market) => {
          const selections = toMarketSelections(event, market);
          return {
            id: `${event.eventId}-${marketTypeMap[market]}`,
            type: marketTypeMap[market],
            name: market,
            status: selections.every(
              (selection) => selection.status === "suspended",
            )
              ? "suspended"
              : "open",
            selections,
          };
        }),
      };

      return res.status(200).json({ match });
    } catch (error) {
      next(error);
    }
  },
);

liveRouter.get("/live/odds", liveOddsRateLimiter, async (req, res, next) => {
  try {
    const parsedQuery = oddsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ error: "Invalid odds query" });
    }

    const ids = toMatchIds(parsedQuery.data.matchIds);
    const market = parsedQuery.data.market ?? "1x2";

    const rows = await prisma.displayedOdds.findMany({
      where: {
        isVisible: true,
        eventId: ids.length > 0 ? { in: ids } : undefined,
        marketType: marketTypeMap[market],
      },
      orderBy: { updatedAt: "desc" },
      take: ids.length > 0 ? ids.length * 8 : 800,
      select: {
        id: true,
        eventId: true,
        marketType: true,
        side: true,
        displayOdds: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      odds: rows,
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

liveRouter.get("/live/scores", liveOddsRateLimiter, async (req, res, next) => {
  try {
    const parsedQuery = scoresQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ error: "Invalid scores query" });
    }

    const ids = toMatchIds(parsedQuery.data.matchIds);

    const rows = await prisma.sportEvent.findMany({
      where: {
        isActive: true,
        status: { in: ["LIVE", "FINISHED"] },
        eventId: ids.length > 0 ? { in: ids } : undefined,
      },
      orderBy: { updatedAt: "desc" },
      take: ids.length > 0 ? ids.length : 400,
      select: {
        eventId: true,
        homeScore: true,
        awayScore: true,
        status: true,
        commenceTime: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      scores: rows.map((row) => ({
        matchId: row.eventId,
        home_score: row.homeScore ?? 0,
        away_score: row.awayScore ?? 0,
        status: row.status,
        minute: estimateMinute(row.commenceTime, row.status),
        updatedAt: row.updatedAt,
      })),
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export { liveRouter, liveSelect, toLiveMatch };
