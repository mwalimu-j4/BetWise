import { Prisma } from "@prisma/client";
import { Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";
import { fetchAndSaveOdds } from "../../services/oddsService";
import { chunkArray } from "../../utils/arrayUtils";

const oddsAdminRouter = Router();

type OddsStatsResponse = {
  totalConfigured: number;
  withOdds: number;
  noOdds: number;
  autoSelected: number;
  bookmakers: number;
};

const ACTIVE_ODDS_STATUSES = ["UPCOMING", "LIVE"] as const;
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;
const HARD_DROPDOWN_LIMIT = 200;

const ODDS_STATS_CACHE_TTL_MS = 30_000;
let oddsStatsCache: { data: OddsStatsResponse; expiresAt: number } | null =
  null;

function invalidateOddsStatsCache() {
  oddsStatsCache = null;
}

function jsonError(
  res: Response,
  status: number,
  error: string,
  code: string,
) {
  return res.status(status).json({ error, code });
}

const visibilityBodySchema = z.object({
  bookmakerId: z.string().trim().min(1),
  marketType: z.string().trim().min(1),
  side: z.string().trim().min(1),
  isVisible: z.boolean(),
});

const overrideBodySchema = z.object({
  bookmakerId: z.string().trim().min(1),
  marketType: z.string().trim().min(1),
  side: z.string().trim().min(1),
  customOdds: z.number().positive(),
});

const listOddsEventsQuerySchema = z.object({
  filter: z
    .enum(["configured", "configured-with-odds", "all-with-odds"])
    .default("configured"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  eventId: z.string().trim().min(1).optional(),
});

const availableOddsEventsQuerySchema = z.object({
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

const configuredEventsQuerySchema = z.object({
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

const bulkBookmarkSchema = z.object({
  eventIds: z.array(z.string().trim().min(1)).min(1).max(500),
});

function buildOddsListWhere(input: {
  filter: "configured" | "configured-with-odds" | "all-with-odds";
  search?: string;
  eventId?: string;
}): Prisma.SportEventWhereInput {
  const baseWhere: Prisma.SportEventWhereInput = {
    status: { in: [...ACTIVE_ODDS_STATUSES] },
  };

  if (input.eventId) {
    baseWhere.eventId = input.eventId;
  }

  const search = input.search?.trim();
  if (search) {
    baseWhere.OR = [
      { homeTeam: { contains: search, mode: "insensitive" } },
      { awayTeam: { contains: search, mode: "insensitive" } },
      { leagueName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (input.filter === "configured") {
    baseWhere.isActive = true;
    return baseWhere;
  }

  if (input.filter === "configured-with-odds") {
    baseWhere.isActive = true;
    baseWhere.odds = { some: {} };
    return baseWhere;
  }

  baseWhere.odds = { some: {} };
  return baseWhere;
}

function marketRank(marketType: string) {
  if (marketType === "h2h") return 0;
  if (marketType === "spreads") return 1;
  if (marketType === "totals") return 2;
  return 3;
}

async function bookmarkBestForEvent(eventId: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.sportEvent.findUnique({
      where: { eventId },
      select: {
        eventId: true,
        houseMargin: true,
      },
    });

    if (!event) {
      return { eventId, bookmarkedCount: 0 };
    }

    const rows = await tx.eventOdds.findMany({
      where: { eventId },
      select: {
        bookmakerId: true,
        bookmakerName: true,
        marketType: true,
        side: true,
        decimalOdds: true,
        recordedAt: true,
      },
      orderBy: [{ marketType: "asc" }, { decimalOdds: "desc" }],
    });

    if (!rows.length) {
      return { eventId, bookmarkedCount: 0 };
    }

    const bestByMarketSelection = rows.reduce<
      Record<string, (typeof rows)[number]>
    >((accumulator, row) => {
      const key = `${row.marketType}::${row.side}`;
      const existing = accumulator[key];

      if (!existing) {
        accumulator[key] = row;
        return accumulator;
      }

      if (row.decimalOdds > existing.decimalOdds) {
        accumulator[key] = row;
        return accumulator;
      }

      if (
        row.decimalOdds === existing.decimalOdds &&
        row.recordedAt > existing.recordedAt
      ) {
        accumulator[key] = row;
      }

      return accumulator;
    }, {});

    const winners = Object.values(bestByMarketSelection);

    await Promise.all(
      winners.map((winner) =>
        tx.displayedOdds.upsert({
          where: {
            eventId_bookmakerId_marketType_side: {
              eventId,
              bookmakerId: winner.bookmakerId,
              marketType: winner.marketType,
              side: winner.side,
            },
          },
          update: {
            bookmakerName: winner.bookmakerName,
            rawOdds: winner.decimalOdds,
            displayOdds: Number(
              (
                winner.decimalOdds /
                (1 + (event.houseMargin ?? 0) / 100)
              ).toFixed(2),
            ),
            isVisible: true,
          },
          create: {
            eventId,
            bookmakerId: winner.bookmakerId,
            bookmakerName: winner.bookmakerName,
            marketType: winner.marketType,
            side: winner.side,
            rawOdds: winner.decimalOdds,
            displayOdds: Number(
              (
                winner.decimalOdds /
                (1 + (event.houseMargin ?? 0) / 100)
              ).toFixed(2),
            ),
            isVisible: true,
          },
        }),
      ),
    );

    return {
      eventId,
      bookmarkedCount: winners.length,
    };
  });
}

oddsAdminRouter.use("/admin/odds", authenticate, requireAdmin);

oddsAdminRouter.get("/admin/odds/stats", async (_req, res, next) => {
  try {
    if (oddsStatsCache && oddsStatsCache.expiresAt > Date.now()) {
      return res.status(200).json(oddsStatsCache.data);
    }

    const baseWhere: Prisma.SportEventWhereInput = {
      isActive: true,
      status: { in: [...ACTIVE_ODDS_STATUSES] },
    };

    const [totalConfigured, withOdds, noOdds, autoSelected, bookmakersRows] =
      await Promise.all([
        prisma.sportEvent.count({ where: baseWhere }),
        prisma.sportEvent.count({
          where: {
            ...baseWhere,
            odds: {
              some: {},
            },
          },
        }),
        prisma.sportEvent.count({
          where: {
            ...baseWhere,
            odds: {
              none: {},
            },
          },
        }),
        prisma.sportEvent.count({
          where: {
            ...baseWhere,
            displayedOdds: {
              some: {},
            },
          },
        }),
        prisma.eventOdds.findMany({
          where: {
            event: {
              status: { in: [...ACTIVE_ODDS_STATUSES] },
            },
          },
          select: { bookmakerId: true },
          distinct: ["bookmakerId"],
        }),
      ]);

    const payload: OddsStatsResponse = {
      totalConfigured,
      withOdds,
      noOdds,
      autoSelected,
      bookmakers: bookmakersRows.length,
    };

    oddsStatsCache = {
      data: payload,
      expiresAt: Date.now() + ODDS_STATS_CACHE_TTL_MS,
    };

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

oddsAdminRouter.get("/admin/odds/events", async (req, res, next) => {
  try {
    const parsedQuery = listOddsEventsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return jsonError(
        res,
        400,
        "Invalid odds events query.",
        "INVALID_ODDS_EVENTS_QUERY",
      );
    }

    const { page, filter, search, eventId } = parsedQuery.data;
    const pageLimit = Math.min(
      Math.max(parsedQuery.data.limit ?? DEFAULT_PAGE_LIMIT, 1),
      MAX_PAGE_LIMIT,
    );
    const where = buildOddsListWhere({ filter, search, eventId });

    const [data, total] = await Promise.all([
      prisma.sportEvent.findMany({
        where,
        take: pageLimit,
        skip: (page - 1) * pageLimit,
        orderBy: { commenceTime: "asc" },
        select: {
          id: true,
          eventId: true,
          homeTeam: true,
          awayTeam: true,
          leagueName: true,
          sportKey: true,
          commenceTime: true,
          status: true,
          isActive: true,
          houseMargin: true,
          marketsEnabled: true,
          _count: {
            select: {
              odds: true,
              displayedOdds: true,
              bets: true,
            },
          },
        },
      }),
      prisma.sportEvent.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageLimit));

    return res.status(200).json({
      data,
      pagination: {
        page,
        limit: pageLimit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

oddsAdminRouter.get("/admin/odds/available-events", async (req, res, next) => {
  try {
    const parsedQuery = availableOddsEventsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return jsonError(
        res,
        400,
        "Invalid available-events query.",
        "INVALID_AVAILABLE_EVENTS_QUERY",
      );
    }

    const search = parsedQuery.data.search?.trim();
    const where: Prisma.SportEventWhereInput = {
      status: { in: [...ACTIVE_ODDS_STATUSES] },
      odds: { some: {} },
      ...(search
        ? {
            OR: [
              { homeTeam: { contains: search, mode: "insensitive" } },
              { awayTeam: { contains: search, mode: "insensitive" } },
              { leagueName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const events = await prisma.sportEvent.findMany({
      where,
      take: HARD_DROPDOWN_LIMIT,
      orderBy: { commenceTime: "asc" },
      select: {
        eventId: true,
        homeTeam: true,
        awayTeam: true,
        leagueName: true,
        commenceTime: true,
        status: true,
        _count: {
          select: { odds: true },
        },
      },
    });

    return res.status(200).json({
      events: events.map((event) => ({
        eventId: event.eventId,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        leagueName: event.leagueName,
        commenceTime: event.commenceTime,
        status: event.status,
        oddsCount: event._count.odds,
      })),
      total: events.length,
      limit: HARD_DROPDOWN_LIMIT,
    });
  } catch (error) {
    next(error);
  }
});

oddsAdminRouter.get("/admin/odds/configured-events", async (req, res, next) => {
  try {
    const parsedQuery = configuredEventsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return jsonError(
        res,
        400,
        "Invalid configured-events query.",
        "INVALID_CONFIGURED_EVENTS_QUERY",
      );
    }

    const search = parsedQuery.data.search?.trim();

    const where: Prisma.SportEventWhereInput = {
      isActive: true,
      status: { in: [...ACTIVE_ODDS_STATUSES] },
      ...(search
        ? {
            OR: [
              { homeTeam: { contains: search, mode: "insensitive" } },
              { awayTeam: { contains: search, mode: "insensitive" } },
              { leagueName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const events = await prisma.sportEvent.findMany({
      where,
      take: HARD_DROPDOWN_LIMIT,
      orderBy: { commenceTime: "asc" },
      select: {
        id: true,
        eventId: true,
        homeTeam: true,
        awayTeam: true,
        leagueName: true,
        sportKey: true,
        commenceTime: true,
        status: true,
        houseMargin: true,
        marketsEnabled: true,
        _count: {
          select: {
            odds: true,
            displayedOdds: true,
            bets: true,
          },
        },
      },
    });

    return res.status(200).json({
      events,
      total: events.length,
      limit: HARD_DROPDOWN_LIMIT,
    });
  } catch (error) {
    next(error);
  }
});

oddsAdminRouter.post("/admin/odds/sync", async (_req, res, next) => {
  try {
    const configuredCount = await prisma.sportEvent.count({
      where: { isActive: true, status: { in: [...ACTIVE_ODDS_STATUSES] } },
    });

    res.status(200).json({
      synced: configuredCount,
      message: `Sync started for ${configuredCount} configured events`,
      status: "running",
    });

    void fetchAndSaveOdds()
      .then(() => {
        invalidateOddsStatsCache();
      })
      .catch(() => {
        // Swallow async error after response; global scheduler handles retry flows.
      });
  } catch (error) {
    next(error);
  }
});

oddsAdminRouter.get("/admin/odds/:eventId", async (req, res, next) => {
  try {
    const eventId = Array.isArray(req.params.eventId)
      ? req.params.eventId[0]
      : req.params.eventId;

    if (!eventId) {
      return jsonError(res, 400, "Invalid event id.", "INVALID_EVENT_ID");
    }

    const event = await prisma.sportEvent.findUnique({
      where: { eventId },
      select: {
        eventId: true,
        homeTeam: true,
        awayTeam: true,
        status: true,
      },
    });

    if (!event) {
      return jsonError(res, 404, "Event not found.", "EVENT_NOT_FOUND");
    }

    const odds = await prisma.eventOdds.findMany({
      where: { eventId },
      select: {
        bookmakerId: true,
        bookmakerName: true,
        marketType: true,
        side: true,
        decimalOdds: true,
        recordedAt: true,
      },
      orderBy: [{ marketType: "asc" }, { decimalOdds: "desc" }],
    });

    const bestByMarketSelection = odds.reduce<Record<string, number>>(
      (accumulator, row) => {
        const key = `${row.marketType}::${row.side}`;
        const existing = accumulator[key];
        if (typeof existing !== "number" || row.decimalOdds > existing) {
          accumulator[key] = row.decimalOdds;
        }
        return accumulator;
      },
      {},
    );

    const grouped = odds.reduce<
      Record<
        string,
        Array<{
          bookmakerId: string;
          bookmakerName: string;
          selection: string;
          odds: number;
          updatedAt: Date;
          isBest: boolean;
        }>
      >
    >((accumulator, row) => {
      accumulator[row.marketType] = accumulator[row.marketType] ?? [];
      accumulator[row.marketType].push({
        bookmakerId: row.bookmakerId,
        bookmakerName: row.bookmakerName,
        selection: row.side,
        odds: row.decimalOdds,
        updatedAt: row.recordedAt,
        isBest:
          bestByMarketSelection[`${row.marketType}::${row.side}`] ===
          row.decimalOdds,
      });
      return accumulator;
    }, {});

    const markets = Object.keys(grouped)
      .sort((left, right) => {
        const leftRank = marketRank(left);
        const rightRank = marketRank(right);
        if (leftRank !== rightRank) return leftRank - rightRank;
        return left.localeCompare(right);
      })
      .map((marketType) => ({
        marketType,
        odds: grouped[marketType].sort((left, right) => right.odds - left.odds),
      }));

    return res.status(200).json({
      eventId: event.eventId,
      eventName: `${event.homeTeam} vs ${event.awayTeam}`,
      status: event.status,
      markets,
    });
  } catch (error) {
    next(error);
  }
});

oddsAdminRouter.post("/admin/odds/:eventId/bookmark-best", async (req, res, next) => {
  try {
    const eventId = Array.isArray(req.params.eventId)
      ? req.params.eventId[0]
      : req.params.eventId;

    if (!eventId) {
      return jsonError(res, 400, "Invalid event id.", "INVALID_EVENT_ID");
    }

    const result = await bookmarkBestForEvent(eventId);
    invalidateOddsStatsCache();

    return res.status(200).json({
      eventId,
      bookmarkedCount: result.bookmarkedCount,
    });
  } catch (error) {
    next(error);
  }
});

oddsAdminRouter.post("/admin/odds/bookmark-bulk", async (req, res, next) => {
  try {
    const parsedBody = bulkBookmarkSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return jsonError(
        res,
        400,
        "Invalid bulk bookmark payload. Maximum 500 eventIds.",
        "INVALID_BULK_BOOKMARK_PAYLOAD",
      );
    }

    const eventIds = Array.from(new Set(parsedBody.data.eventIds));

    if (eventIds.length > 500) {
      return jsonError(
        res,
        400,
        "Maximum 500 eventIds per request.",
        "BULK_BOOKMARK_LIMIT_EXCEEDED",
      );
    }

    const chunks = chunkArray(eventIds, 50);
    const results: any[] = [];

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((eventId) => bookmarkBestForEvent(eventId)),
      );
      results.push(...chunkResults);
    }

    invalidateOddsStatsCache();

    return res.status(200).json({
      processed: results.length,
      totalBookmarked: results.reduce(
        (sum, row) => sum + row.bookmarkedCount,
        0,
      ),
      results,
    });
  } catch (error) {
    next(error);
  }
});

oddsAdminRouter.post("/admin/odds/bulk-auto-select", async (req, res, next) => {
  try {
    const parsedBody = z
      .object({ eventIds: z.array(z.string().trim().min(1)).optional() })
      .safeParse(req.body ?? {});
    if (!parsedBody.success) {
      return jsonError(
        res,
        400,
        "Invalid bulk auto-select payload.",
        "INVALID_BULK_AUTO_SELECT_PAYLOAD",
      );
    }

    let targetEventIds = Array.from(new Set(parsedBody.data.eventIds ?? []));
    if (!targetEventIds.length) {
      const configuredEvents = await prisma.sportEvent.findMany({
        where: { isActive: true, status: { in: [...ACTIVE_ODDS_STATUSES] } },
        take: 500,
        select: { eventId: true },
      });
      targetEventIds = configuredEvents.map((event) => event.eventId);
    }

    if (targetEventIds.length > 500) {
      return jsonError(
        res,
        400,
        "Maximum 500 eventIds per request.",
        "BULK_AUTO_SELECT_LIMIT_EXCEEDED",
      );
    }

    const chunks = chunkArray(targetEventIds, 50);
    const results: any[] = [];

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((eventId) => bookmarkBestForEvent(eventId)),
      );
      results.push(...chunkResults);
    }

    invalidateOddsStatsCache();

    return res.status(200).json({
      processed: results.length,
      message: `Auto-selected best odds for ${results.length} events`,
    });
  } catch (error) {
    next(error);
  }
});

oddsAdminRouter.patch(
  "/admin/odds/:eventId/visibility",
  async (req, res, next) => {
    try {
      const eventId = Array.isArray(req.params.eventId)
        ? req.params.eventId[0]
        : req.params.eventId;

      if (!eventId) {
        return jsonError(res, 400, "Invalid event id.", "INVALID_EVENT_ID");
      }

      const parsedBody = visibilityBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        return jsonError(
          res,
          400,
          "Invalid visibility payload.",
          "INVALID_VISIBILITY_PAYLOAD",
        );
      }

      const updated = await prisma.displayedOdds.update({
        where: {
          eventId_bookmakerId_marketType_side: {
            eventId,
            bookmakerId: parsedBody.data.bookmakerId,
            marketType: parsedBody.data.marketType,
            side: parsedBody.data.side,
          },
        },
        data: { isVisible: parsedBody.data.isVisible },
        select: {
          id: true,
          eventId: true,
          bookmakerId: true,
          bookmakerName: true,
          marketType: true,
          side: true,
          rawOdds: true,
          displayOdds: true,
          isVisible: true,
        },
      });

      invalidateOddsStatsCache();

      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

oddsAdminRouter.post("/admin/odds/:eventId/override", async (req, res, next) => {
  try {
    const eventId = Array.isArray(req.params.eventId)
      ? req.params.eventId[0]
      : req.params.eventId;

    if (!eventId) {
      return jsonError(res, 400, "Invalid event id.", "INVALID_EVENT_ID");
    }

    const parsedBody = overrideBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      return jsonError(
        res,
        400,
        "Invalid odds override payload.",
        "INVALID_ODDS_OVERRIDE_PAYLOAD",
      );
    }

    const updated = await prisma.displayedOdds.update({
      where: {
        eventId_bookmakerId_marketType_side: {
          eventId,
          bookmakerId: parsedBody.data.bookmakerId,
          marketType: parsedBody.data.marketType,
          side: parsedBody.data.side,
        },
      },
      data: { displayOdds: parsedBody.data.customOdds },
      select: {
        id: true,
        eventId: true,
        bookmakerId: true,
        bookmakerName: true,
        marketType: true,
        side: true,
        rawOdds: true,
        displayOdds: true,
        isVisible: true,
      },
    });

    invalidateOddsStatsCache();

    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

export { oddsAdminRouter };
