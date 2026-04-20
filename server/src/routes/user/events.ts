import { Prisma, type EventStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

const userEventsRouter = Router();

const listEventsQuerySchema = z.object({
  sport: z.string().trim().optional(),
  league: z.string().trim().optional(),
  status: z.enum(["UPCOMING", "LIVE", "FINISHED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const eventSelect = {
  id: true,
  eventId: true,
  homeTeam: true,
  awayTeam: true,
  leagueName: true,
  sportKey: true,
  commenceTime: true,
  status: true,
  homeScore: true,
  awayScore: true,
  displayedOdds: {
    where: { isVisible: true },
    select: {
      id: true,
      bookmakerId: true,
      bookmakerName: true,
      marketType: true,
      side: true,
      displayOdds: true,
    },
    orderBy: { displayOdds: "desc" },
  },
  _count: {
    select: { bets: true },
  },
} satisfies Prisma.SportEventSelect;

type EventWithDisplayedOdds = Prisma.SportEventGetPayload<{
  select: typeof eventSelect;
}>;

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getBestOdds(
  displayedOdds: EventWithDisplayedOdds["displayedOdds"],
  marketType: string,
  matcher: (side: string) => boolean,
) {
  let best: number | null = null;

  for (const odd of displayedOdds) {
    if (odd.marketType !== marketType || !matcher(odd.side)) {
      continue;
    }

    if (best === null || odd.displayOdds > best) {
      best = odd.displayOdds;
    }
  }

  return best;
}

function toMarkets(event: EventWithDisplayedOdds) {
  const homeName = normalizeValue(event.homeTeam);
  const awayName = normalizeValue(event.awayTeam);

  const homeH2H = getBestOdds(
    event.displayedOdds,
    "h2h",
    (side) => normalizeValue(side) === homeName,
  );
  const awayH2H = getBestOdds(
    event.displayedOdds,
    "h2h",
    (side) => normalizeValue(side) === awayName,
  );
  const drawH2H = getBestOdds(event.displayedOdds, "h2h", (side) => {
    const normalized = normalizeValue(side);
    return normalized === "draw" || normalized === "tie";
  });

  const homeSpread = getBestOdds(
    event.displayedOdds,
    "spreads",
    (side) => normalizeValue(side) === homeName,
  );
  const awaySpread = getBestOdds(
    event.displayedOdds,
    "spreads",
    (side) => normalizeValue(side) === awayName,
  );

  const overTotal = getBestOdds(event.displayedOdds, "totals", (side) => {
    return normalizeValue(side).startsWith("over");
  });
  const underTotal = getBestOdds(event.displayedOdds, "totals", (side) => {
    return normalizeValue(side).startsWith("under");
  });

  return {
    h2h:
      homeH2H !== null && awayH2H !== null
        ? {
            home: homeH2H,
            draw: drawH2H,
            away: awayH2H,
          }
        : null,
    spreads:
      homeSpread !== null || awaySpread !== null
        ? {
            home: homeSpread,
            away: awaySpread,
          }
        : null,
    totals:
      overTotal !== null || underTotal !== null
        ? {
            over: overTotal,
            under: underTotal,
          }
        : null,
  };
}

function sortEvents(events: EventWithDisplayedOdds[]) {
  const statusOrder: Record<EventStatus, number> = {
    LIVE: 0,
    UPCOMING: 1,
    FINISHED: 2,
    CANCELLED: 3,
  };

  return [...events].sort((left, right) => {
    const statusDiff = statusOrder[left.status] - statusOrder[right.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }

    return (
      new Date(left.commenceTime).getTime() -
      new Date(right.commenceTime).getTime()
    );
  });
}

async function getEvents(args: {
  sport?: string;
  league?: string;
  status?: EventStatus;
  page: number;
  limit: number;
}) {
  const upcomingSafetyThreshold = new Date(Date.now() - 150 * 60 * 1000);

  const where: Prisma.SportEventWhereInput = {
    isActive: true,
    ...(args.status
      ? { status: args.status }
      : {
          OR: [
            { status: "LIVE" },
            {
              status: "UPCOMING",
              commenceTime: { gt: upcomingSafetyThreshold },
            },
          ],
        }),
    sportKey: args.sport || undefined,
    leagueName: args.league
      ? { contains: args.league, mode: "insensitive" }
      : undefined,
  };

  const [events, total] = await Promise.all([
    prisma.sportEvent.findMany({
      where,
      select: eventSelect,
      orderBy: [{ status: "asc" }, { commenceTime: "asc" }],
      skip: (args.page - 1) * args.limit,
      take: args.limit,
    }),
    prisma.sportEvent.count({ where }),
  ]);

  const orderedEvents = sortEvents(events).map((event) => ({
    id: event.id,
    eventId: event.eventId,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    leagueName: event.leagueName,
    sportKey: event.sportKey,
    commenceTime: event.commenceTime,
    status: event.status,
    homeScore: event.homeScore,
    awayScore: event.awayScore,
    markets: toMarkets(event),
    _count: event._count,
  }));

  return {
    events: orderedEvents,
    total,
    page: args.page,
    totalPages: Math.ceil(total / args.limit),
  };
}

userEventsRouter.get("/user/events", async (req, res, next) => {
  try {
    const parsedQuery = listEventsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ error: "Invalid events query" });
    }

    const result = await getEvents(parsedQuery.data);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

userEventsRouter.get("/user/events/live", async (req, res, next) => {
  try {
    const result = await getEvents({
      page: 1,
      limit: 50,
      status: "LIVE",
      sport:
        typeof req.query.sport === "string" && req.query.sport.trim().length > 0
          ? req.query.sport.trim()
          : undefined,
      league:
        typeof req.query.league === "string" &&
        req.query.league.trim().length > 0
          ? req.query.league.trim()
          : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

userEventsRouter.get("/user/events/sports", async (_req, res, next) => {
  try {
    const upcomingSafetyThreshold = new Date(Date.now() - 150 * 60 * 1000);

    const rows = await prisma.sportEvent.findMany({
      where: {
        isActive: true,
        OR: [
          { status: "LIVE" },
          {
            status: "UPCOMING",
            commenceTime: { gt: upcomingSafetyThreshold },
          },
        ],
      },
      select: {
        sportKey: true,
        leagueName: true,
      },
      distinct: ["sportKey", "leagueName"],
      orderBy: [{ sportKey: "asc" }, { leagueName: "asc" }],
    });

    const groupedSports = rows.reduce<Map<string, Set<string>>>((map, row) => {
      if (!row.sportKey) {
        return map;
      }

      const leagues = map.get(row.sportKey) ?? new Set<string>();
      if (row.leagueName) {
        leagues.add(row.leagueName);
      }

      map.set(row.sportKey, leagues);
      return map;
    }, new Map<string, Set<string>>());

    return res.status(200).json({
      sports: Array.from(groupedSports.entries()).map(
        ([sportKey, leagues]) => ({
          sportKey,
          leagues: Array.from(leagues),
        }),
      ),
    });
  } catch (error) {
    next(error);
  }
});

userEventsRouter.get("/user/events/:eventId", async (req, res, next) => {
  try {
    const eventId = Array.isArray(req.params.eventId)
      ? req.params.eventId[0]
      : req.params.eventId;

    if (!eventId) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const event = await prisma.sportEvent.findUnique({
      where: { eventId },
      select: eventSelect,
    });

    if (!event || !event.displayedOdds) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.status(200).json({
      id: event.id,
      eventId: event.eventId,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      leagueName: event.leagueName,
      sportKey: event.sportKey,
      commenceTime: event.commenceTime,
      status: event.status,
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      displayedOdds: event.displayedOdds,
      markets: toMarkets(event),
      _count: event._count,
    });
  } catch (error) {
    next(error);
  }
});

// ── Sport Categories (cached) ── 
const SPORT_CATEGORIES_CACHE_TTL_MS = 60_000;
let sportCategoriesCache: { data: unknown; expiresAt: number } | null = null;

userEventsRouter.get("/user/sport-categories", async (_req, res, next) => {
  try {
    if (
      sportCategoriesCache &&
      sportCategoriesCache.expiresAt > Date.now()
    ) {
      return res.status(200).json(sportCategoriesCache.data);
    }

    const categories = await prisma.sportCategory.findMany({
      where: { isActive: true, showInNav: true },
      select: {
        id: true,
        sportKey: true,
        displayName: true,
        icon: true,
        sortOrder: true,
        eventCount: true,
        lastSyncedAt: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    const payload = { categories };

    sportCategoriesCache = {
      data: payload,
      expiresAt: Date.now() + SPORT_CATEGORIES_CACHE_TTL_MS,
    };

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

export { userEventsRouter };

