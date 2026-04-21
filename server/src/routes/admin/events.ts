import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";

const eventsAdminRouter = Router();

type EventsStatsResponse = {
  liveCount: number;
  upcomingCount: number;
  activeCount: number;
  configuredCount: number;
  noOddsCount: number;
  finishedToday: number;
};

type EventsConfiguredResponse = {
  events: Array<{
    id: string;
    eventId: string;
    homeTeam: string;
    awayTeam: string;
    leagueName: string | null;
    sportKey: string | null;
    commenceTime: Date;
    status: "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED" | "SUSPENDED";
    houseMargin: number;
    marketsEnabled: string[];
    _count: {
      displayedOdds: number;
      bets: number;
    };
  }>;
  total: number;
};

type EventsLeaguesResponse = {
  sports: Array<{
    sportKey: string;
    leagues: string[];
  }>;
};

const EVENTS_STATS_CACHE_TTL_MS = 30_000;
const EVENTS_LEAGUES_CACHE_TTL_MS = 300_000;
const BULK_CONFIG_BATCH_SIZE = 40;

let eventsStatsCache: { data: EventsStatsResponse; expiresAt: number } | null =
  null;
let eventsLeaguesCache: {
  data: EventsLeaguesResponse;
  expiresAt: number;
} | null = null;

function invalidateEventsCache() {
  eventsStatsCache = null;
  eventsLeaguesCache = null;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["UPCOMING", "LIVE", "FINISHED", "CANCELLED"]).optional(),
  hasOdds: z.coerce.boolean().optional(),
  hasMargin: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().optional(),
  sport: z.string().trim().optional(),
  leagueName: z.string().trim().optional(),
});

const configuredEventsQuerySchema = z.object({
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

const updateEventConfigSchema = z.object({
  houseMargin: z.number().min(0).max(100),
  marketsEnabled: z.array(z.string().trim().min(1)).default(["h2h"]),
});

const bulkToggleSchema = z.object({
  eventIds: z.array(z.string().trim().min(1)).min(1),
  isActive: z.boolean(),
});

const bulkConfigSchema = z.object({
  eventIds: z.array(z.string().trim().min(1)).min(1),
  houseMargin: z.number().min(0).max(100),
});

const updateEventSchema = z
  .object({
    isFeatured: z.boolean().optional(),
    featuredPriority: z.number().int().optional(),
  })
  .refine(
    (value) =>
      value.isFeatured !== undefined || value.featuredPriority !== undefined,
    {
      message: "At least one update field is required.",
    },
  );

const bulkMarginSchema = z.object({
  filter: z.enum(["league", "sport", "selected"]),
  leagueName: z.string().trim().optional(),
  sportKey: z.string().trim().optional(),
  eventIds: z.array(z.string().trim().min(1)).optional(),
  houseMargin: z.number().min(0).max(100),
  marketsEnabled: z.array(z.string().trim().min(1)).optional(),
});

eventsAdminRouter.use("/admin/events", authenticate, requireAdmin);

eventsAdminRouter.get("/admin/events/stats", async (_req, res, next) => {
  try {
    if (eventsStatsCache && eventsStatsCache.expiresAt > Date.now()) {
      return res.status(200).json(eventsStatsCache.data);
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      liveCount,
      upcomingCount,
      activeCount,
      configuredCount,
      noOddsCount,
      finishedToday,
    ] = await Promise.all([
      prisma.sportEvent.count({ where: { status: "LIVE" } }),
      prisma.sportEvent.count({ where: { status: "UPCOMING" } }),
      prisma.sportEvent.count({ where: { isActive: true } }),
      prisma.sportEvent.count({
        where: {
          isActive: true,
          houseMargin: { gt: 0 },
        },
      }),
      prisma.sportEvent.count({
        where: {
          isActive: true,
          displayedOdds: { none: {} },
        },
      }),
      prisma.sportEvent.count({
        where: {
          status: "FINISHED",
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
    ]);

    const payload: EventsStatsResponse = {
      liveCount,
      upcomingCount,
      activeCount,
      configuredCount,
      noOddsCount,
      finishedToday,
    };

    eventsStatsCache = {
      data: payload,
      expiresAt: Date.now() + EVENTS_STATS_CACHE_TTL_MS,
    };

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

eventsAdminRouter.get("/admin/events/configured", async (req, res, next) => {
  try {
    const parsedQuery = configuredEventsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({
        error: "Invalid configured events query.",
        code: "INVALID_CONFIGURED_EVENTS_QUERY",
      });
    }

    const search = parsedQuery.data.search?.trim();

    const [events, total] = await Promise.all([
      prisma.sportEvent.findMany({
        where: {
          isActive: true,
          status: { in: ["UPCOMING", "LIVE"] },
          ...(search
            ? {
                OR: [
                  { homeTeam: { contains: search, mode: "insensitive" } },
                  { awayTeam: { contains: search, mode: "insensitive" } },
                  { leagueName: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        take: 50,
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
              displayedOdds: { where: { isVisible: true } },
              bets: true,
            },
          },
        },
        orderBy: [{ commenceTime: "asc" }],
      }),
      prisma.sportEvent.count({
        where: {
          isActive: true,
          status: { in: ["UPCOMING", "LIVE"] },
          ...(search
            ? {
                OR: [
                  { homeTeam: { contains: search, mode: "insensitive" } },
                  { awayTeam: { contains: search, mode: "insensitive" } },
                  { leagueName: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
      }),
    ]);

    const payload: EventsConfiguredResponse = {
      events,
      total,
    };

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

eventsAdminRouter.get("/admin/events/leagues", async (_req, res, next) => {
  try {
    if (eventsLeaguesCache && eventsLeaguesCache.expiresAt > Date.now()) {
      return res.status(200).json(eventsLeaguesCache.data);
    }

    const rows = await prisma.sportEvent.findMany({
      where: {
        status: { in: ["UPCOMING", "LIVE"] },
      },
      select: {
        leagueName: true,
        sportKey: true,
      },
      distinct: ["leagueName"],
      orderBy: [{ sportKey: "asc" }, { leagueName: "asc" }],
    });

    const grouped = rows.reduce<Record<string, Set<string>>>(
      (accumulator, row) => {
        const leagueName = row.leagueName?.trim();
        const sportKey = row.sportKey?.trim() ?? "unknown";

        if (!leagueName) {
          return accumulator;
        }

        accumulator[sportKey] = accumulator[sportKey] ?? new Set<string>();
        accumulator[sportKey].add(leagueName);
        return accumulator;
      },
      {},
    );

    const payload: EventsLeaguesResponse = {
      sports: Object.entries(grouped)
        .map(([sportKey, leagues]) => ({
          sportKey,
          leagues: Array.from(leagues).sort((left, right) =>
            left.localeCompare(right),
          ),
        }))
        .sort((left, right) => left.sportKey.localeCompare(right.sportKey)),
    };

    eventsLeaguesCache = {
      data: payload,
      expiresAt: Date.now() + EVENTS_LEAGUES_CACHE_TTL_MS,
    };

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

eventsAdminRouter.get("/admin/events", async (req, res, next) => {
  try {
    const parsedQuery = listEventsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ message: "Invalid events query." });
    }

    const {
      page,
      limit,
      search,
      sport,
      status,
      hasOdds,
      hasMargin,
      isActive,
      leagueName,
    } = parsedQuery.data;

    const shouldDefaultToLiveUpcoming =
      !status &&
      isActive === undefined &&
      hasMargin === undefined &&
      hasOdds === undefined;

    const where: Prisma.SportEventWhereInput = {
      ...(status
        ? { status: { equals: status } }
        : shouldDefaultToLiveUpcoming
          ? { status: { in: ["UPCOMING", "LIVE"] } }
          : {}),
      ...(sport ? { sportKey: { equals: sport } } : {}),
      ...(leagueName
        ? { leagueName: { contains: leagueName, mode: "insensitive" } }
        : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(hasMargin ? { houseMargin: { gt: 0 } } : {}),
      ...(hasOdds === true
        ? { displayedOdds: { some: {} } }
        : hasOdds === false
          ? { displayedOdds: { none: {} } }
          : {}),
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

    const [total, events] = await Promise.all([
      prisma.sportEvent.count({ where }),
      prisma.sportEvent.findMany({
        where,
        select: {
          id: true,
          eventId: true,
          leagueName: true,
          sportKey: true,
          homeTeam: true,
          awayTeam: true,
          commenceTime: true,
          status: true,
          homeScore: true,
          awayScore: true,
          isActive: true,
          isFeatured: true,
          featuredPriority: true,
          houseMargin: true,
          marketsEnabled: true,
          _count: {
            select: {
              odds: true,
              bets: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { commenceTime: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    if (events.length === 0) {
      return res.status(200).json({
        events: [],
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }

    return res.status(200).json({
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

eventsAdminRouter.get("/admin/events/:eventId", async (req, res, next) => {
  try {
    const eventId = Array.isArray(req.params.eventId)
      ? req.params.eventId[0]
      : req.params.eventId;

    if (!eventId) {
      return res.status(400).json({ message: "Invalid event id." });
    }

    const event = await prisma.sportEvent.findUnique({
      where: { eventId },
      select: {
        id: true,
        eventId: true,
        leagueName: true,
        sportKey: true,
        homeTeam: true,
        awayTeam: true,
        commenceTime: true,
        status: true,
        homeScore: true,
        awayScore: true,
        isActive: true,
        isFeatured: true,
        featuredPriority: true,
        houseMargin: true,
        marketsEnabled: true,
        displayedOdds: {
          select: {
            id: true,
            bookmakerId: true,
            bookmakerName: true,
            marketType: true,
            side: true,
            rawOdds: true,
            displayOdds: true,
            isVisible: true,
            updatedAt: true,
          },
          orderBy: [
            { bookmakerName: "asc" },
            { marketType: "asc" },
            { side: "asc" },
          ],
        },
        _count: {
          select: { bets: true },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const groupedDisplayedOdds = Object.values(
      event.displayedOdds.reduce<
        Record<
          string,
          {
            bookmakerId: string;
            bookmakerName: string;
            odds: typeof event.displayedOdds;
          }
        >
      >(
        (
          accumulator: Record<
            string,
            {
              bookmakerId: string;
              bookmakerName: string;
              odds: typeof event.displayedOdds;
            }
          >,
          odd: (typeof event.displayedOdds)[number],
        ) => {
          const existing = accumulator[odd.bookmakerId];
          if (existing) {
            existing.odds.push(odd);
            return accumulator;
          }

          accumulator[odd.bookmakerId] = {
            bookmakerId: odd.bookmakerId,
            bookmakerName: odd.bookmakerName,
            odds: [odd],
          };
          return accumulator;
        },
        {},
      ),
    );

    return res.status(200).json({
      ...event,
      displayedOdds: groupedDisplayedOdds,
    });
  } catch (error) {
    next(error);
  }
});

eventsAdminRouter.patch(
  "/admin/events/:eventId",
  async (req, res, next) => {
    try {
      const eventId = Array.isArray(req.params.eventId)
        ? req.params.eventId[0]
        : req.params.eventId;

      if (!eventId) {
        return res.status(400).json({ message: "Invalid event id." });
      }

      const parsedBody = updateEventSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid event update." });
      }

      const updatedEvent = await prisma.sportEvent.update({
        where: { eventId },
        data: {
          ...(typeof parsedBody.data.isFeatured === "boolean" && {
            isFeatured: parsedBody.data.isFeatured,
          }),
          ...(typeof parsedBody.data.featuredPriority === "number" && {
            featuredPriority: parsedBody.data.featuredPriority,
          }),
        },
        select: {
          id: true,
          eventId: true,
          leagueName: true,
          sportKey: true,
          homeTeam: true,
          awayTeam: true,
          commenceTime: true,
          status: true,
          homeScore: true,
          awayScore: true,
          isActive: true,
          isFeatured: true,
          featuredPriority: true,
          houseMargin: true,
          marketsEnabled: true,
          _count: {
            select: {
              odds: true,
              bets: true,
            },
          },
        },
      });

      invalidateEventsCache();

      return res.status(200).json(updatedEvent);
    } catch (error) {
      next(error);
    }
  },
);

eventsAdminRouter.patch(
  "/admin/events/:eventId/toggle",
  async (req, res, next) => {
    try {
      const eventId = Array.isArray(req.params.eventId)
        ? req.params.eventId[0]
        : req.params.eventId;

      if (!eventId) {
        return res.status(400).json({ message: "Invalid event id." });
      }

      const existing = await prisma.sportEvent.findUnique({
        where: { eventId },
        select: { isActive: true },
      });

      if (!existing) {
        return res.status(404).json({ message: "Event not found." });
      }

      const updatedEvent = await prisma.sportEvent.update({
        where: { eventId },
        data: { isActive: !existing.isActive },
        select: {
          id: true,
          eventId: true,
          isActive: true,
          status: true,
          houseMargin: true,
          marketsEnabled: true,
        },
      });

      invalidateEventsCache();
      console.log(
        `[AdminEvents] Toggled event ${eventId} to ${updatedEvent.isActive}`,
      );

      return res.status(200).json(updatedEvent);
    } catch (error) {
      next(error);
    }
  },
);

eventsAdminRouter.patch(
  "/admin/events/:eventId/config",
  async (req, res, next) => {
    try {
      const eventId = Array.isArray(req.params.eventId)
        ? req.params.eventId[0]
        : req.params.eventId;

      if (!eventId) {
        return res.status(400).json({ message: "Invalid event id." });
      }

      const parsedBody = updateEventConfigSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res
          .status(400)
          .json({ message: "Invalid event configuration." });
      }

      const updatedEvent = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const event = await tx.sportEvent.update({
            where: { eventId },
            data: {
              houseMargin: parsedBody.data.houseMargin,
              marketsEnabled: parsedBody.data.marketsEnabled,
            },
            select: {
              id: true,
              eventId: true,
              leagueName: true,
              sportKey: true,
              homeTeam: true,
              awayTeam: true,
              commenceTime: true,
              status: true,
              homeScore: true,
              awayScore: true,
              isActive: true,
              houseMargin: true,
              marketsEnabled: true,
              _count: {
                select: {
                  odds: true,
                  bets: true,
                },
              },
            },
          });

          const displayedOdds = await tx.displayedOdds.findMany({
            where: { eventId },
            select: {
              id: true,
              rawOdds: true,
            },
          });

          await Promise.all(
            displayedOdds.map((odd: { id: string; rawOdds: number }) =>
              tx.displayedOdds.update({
                where: { id: odd.id },
                data: {
                  displayOdds: Number(
                    (
                      odd.rawOdds /
                      (1 + parsedBody.data.houseMargin / 100)
                    ).toFixed(2),
                  ),
                },
              }),
            ),
          );

          return event;
        },
      );

      invalidateEventsCache();
      console.log(`[AdminEvents] Updated config for event ${eventId}`);

      return res.status(200).json(updatedEvent);
    } catch (error) {
      next(error);
    }
  },
);

eventsAdminRouter.patch("/admin/events/bulk-toggle", async (req, res, next) => {
  try {
    const parsedBody = bulkToggleSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: "Invalid bulk toggle payload." });
    }

    const uniqueEventIds = Array.from(new Set(parsedBody.data.eventIds));

    const result = await prisma.sportEvent.updateMany({
      where: { eventId: { in: uniqueEventIds } },
      data: { isActive: parsedBody.data.isActive },
    });

    invalidateEventsCache();
    console.log(
      `[AdminEvents] Bulk toggle ${parsedBody.data.isActive} for ${result.count} events`,
    );

    return res.status(200).json({
      updatedCount: result.count,
      eventIds: uniqueEventIds,
      isActive: parsedBody.data.isActive,
    });
  } catch (error) {
    next(error);
  }
});

eventsAdminRouter.patch("/admin/events/bulk-config", async (req, res, next) => {
  try {
    const parsedBody = bulkConfigSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: "Invalid bulk config payload." });
    }

    const uniqueEventIds = Array.from(new Set(parsedBody.data.eventIds));
    const eventBatches = chunkArray(uniqueEventIds, BULK_CONFIG_BATCH_SIZE);

    let updatedEventsCount = 0;
    let updatedOddsCount = 0;
    let failedBatchCount = 0;

    for (const batchEventIds of eventBatches) {
      try {
        const [updatedEvents, updatedOdds] = await prisma.$transaction([
          prisma.sportEvent.updateMany({
            where: { eventId: { in: batchEventIds } },
            data: { houseMargin: parsedBody.data.houseMargin },
          }),
          prisma.$executeRaw(Prisma.sql`
            UPDATE displayed_odds
            SET display_odds = ROUND(raw_odds::numeric / (1 + ${parsedBody.data.houseMargin} / 100.0), 3),
                updated_at = NOW()
            WHERE event_id IN (${Prisma.join(batchEventIds)})
          `),
        ]);

        updatedEventsCount += updatedEvents.count;
        updatedOddsCount += Number(updatedOdds);
      } catch (batchError) {
        failedBatchCount += 1;
        console.warn(
          `[AdminEvents] Bulk config batch failed size=${batchEventIds.length}`,
          batchError,
        );
      }
    }

    invalidateEventsCache();
    console.log(
      `[AdminEvents] Bulk config ${parsedBody.data.houseMargin}% events=${updatedEventsCount} oddsUpdated=${updatedOddsCount} failedBatches=${failedBatchCount}`,
    );

    const statusCode = failedBatchCount > 0 ? 207 : 200;

    return res.status(statusCode).json({
      updatedCount: updatedEventsCount,
      eventIds: uniqueEventIds,
      houseMargin: parsedBody.data.houseMargin,
      oddsUpdatedCount: updatedOddsCount,
      failedBatchCount,
    });
  } catch (error) {
    next(error);
  }
});

eventsAdminRouter.patch("/admin/events/bulk-margin", async (req, res, next) => {
  try {
    const parsedBody = bulkMarginSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: "Invalid bulk margin payload." });
    }

    const { filter, houseMargin, marketsEnabled } = parsedBody.data;
    let baseWhere: Prisma.SportEventWhereInput;

    if (filter === "league") {
      if (!parsedBody.data.leagueName?.trim()) {
        return res
          .status(400)
          .json({ message: "leagueName is required for league filter." });
      }

      baseWhere = {
        leagueName: {
          contains: parsedBody.data.leagueName.trim(),
          mode: "insensitive",
        },
      };
    } else if (filter === "sport") {
      if (!parsedBody.data.sportKey?.trim()) {
        return res
          .status(400)
          .json({ message: "sportKey is required for sport filter." });
      }

      baseWhere = {
        sportKey: parsedBody.data.sportKey.trim(),
      };
    } else {
      const eventIds = Array.from(new Set(parsedBody.data.eventIds ?? []));
      if (!eventIds.length) {
        return res
          .status(400)
          .json({ message: "eventIds is required for selected filter." });
      }

      baseWhere = {
        eventId: { in: eventIds },
      };
    }

    const matchingEvents = await prisma.sportEvent.findMany({
      where: baseWhere,
      select: { eventId: true },
    });

    const matchingEventIds = matchingEvents.map((event) => event.eventId);
    if (!matchingEventIds.length) {
      return res.status(200).json({
        updated: 0,
        message: `No events matched filter for ${houseMargin}% margin`,
      });
    }

    const chunks =
      matchingEventIds.length > 100
        ? chunkArray(matchingEventIds, 50)
        : [matchingEventIds];

    let updated = 0;
    for (const batchEventIds of chunks) {
      const result = await prisma.$transaction([
        prisma.sportEvent.updateMany({
          where: { eventId: { in: batchEventIds } },
          data: {
            houseMargin,
            ...(marketsEnabled ? { marketsEnabled } : {}),
          },
        }),
        prisma.$executeRaw(Prisma.sql`
          UPDATE displayed_odds
          SET display_odds = ROUND(raw_odds::numeric / (1 + ${houseMargin} / 100.0), 3),
              updated_at = NOW()
          WHERE event_id IN (${Prisma.join(batchEventIds)})
        `),
        prisma.sportEvent.updateMany({
          where: { eventId: { in: batchEventIds } },
          data: { isActive: true },
        }),
      ]);

      updated += result[0].count;
    }

    invalidateEventsCache();

    const targetLabel =
      filter === "league"
        ? `${parsedBody.data.leagueName ?? "league"} games`
        : filter === "sport"
          ? `${parsedBody.data.sportKey ?? "sport"} games`
          : "selected games";

    const message = `${houseMargin}% margin applied to ${updated} ${targetLabel}`;
    console.log(`[AdminEvents] ${message}`);

    return res.status(200).json({
      updated,
      message,
    });
  } catch (error) {
    next(error);
  }
});

export { eventsAdminRouter };
