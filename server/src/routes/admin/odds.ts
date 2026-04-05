import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";
import { fetchAndSaveOdds } from "../../services/oddsService";

const oddsAdminRouter = Router();

type OddsStatsResponse = {
  totalConfigured: number;
  withOdds: number;
  noOdds: number;
  autoSelected: number;
  bookmakers: number;
};

const ODDS_STATS_CACHE_TTL_MS = 30_000;
let oddsStatsCache: { data: OddsStatsResponse; expiresAt: number } | null =
  null;

function invalidateOddsStatsCache() {
  oddsStatsCache = null;
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

const bulkAutoSelectSchema = z.object({
  eventIds: z.array(z.string().trim().min(1)).optional(),
});

oddsAdminRouter.use("/admin/odds", authenticate, requireAdmin);

oddsAdminRouter.get("/admin/odds/stats", async (_req, res, next) => {
  try {
    if (oddsStatsCache && oddsStatsCache.expiresAt > Date.now()) {
      return res.status(200).json(oddsStatsCache.data);
    }

    const [totalConfigured, withOdds, noOdds, autoSelected, bookmakersRows] =
      await Promise.all([
        prisma.sportEvent.count({ where: { isActive: true } }),
        prisma.sportEvent.count({
          where: {
            isActive: true,
            displayedOdds: {
              some: { isVisible: true },
            },
          },
        }),
        prisma.sportEvent.count({
          where: {
            isActive: true,
            displayedOdds: {
              none: { isVisible: true },
            },
          },
        }),
        prisma.sportEvent.count({
          where: {
            isActive: true,
            displayedOdds: {
              some: {},
            },
          },
        }),
        prisma.displayedOdds.findMany({
          where: { isVisible: true },
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

oddsAdminRouter.post("/admin/odds/bulk-auto-select", async (req, res, next) => {
  try {
    const parsedBody = bulkAutoSelectSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      return res
        .status(400)
        .json({ message: "Invalid bulk auto-select payload." });
    }

    let targetEventIds = Array.from(new Set(parsedBody.data.eventIds ?? []));
    if (!targetEventIds.length) {
      const configuredEvents = await prisma.sportEvent.findMany({
        where: { isActive: true },
        select: { eventId: true },
      });
      targetEventIds = configuredEvents.map((event) => event.eventId);
    }

    let processed = 0;

    for (const eventId of targetEventIds) {
      const odds = await prisma.displayedOdds.findMany({
        where: { eventId },
        select: {
          bookmakerId: true,
          marketType: true,
          side: true,
          displayOdds: true,
        },
      });

      if (!odds.length) {
        processed += 1;
        continue;
      }

      const grouped = odds.reduce<Record<string, Array<(typeof odds)[number]>>>(
        (accumulator, odd) => {
          const key = `${odd.marketType}::${odd.side}`;
          accumulator[key] = accumulator[key] ?? [];
          accumulator[key].push(odd);
          return accumulator;
        },
        {},
      );

      const operations = Object.entries(grouped).flatMap(([key, group]) => {
        const [marketType, side] = key.split("::");
        const winner = group.reduce((best, candidate) =>
          candidate.displayOdds > best.displayOdds ? candidate : best,
        );

        return [
          prisma.displayedOdds.updateMany({
            where: {
              eventId,
              marketType,
              side,
            },
            data: { isVisible: false },
          }),
          prisma.displayedOdds.updateMany({
            where: {
              eventId,
              marketType,
              side,
              bookmakerId: winner.bookmakerId,
            },
            data: { isVisible: true },
          }),
        ];
      });

      if (operations.length) {
        await prisma.$transaction(operations);
      }

      processed += 1;
    }

    invalidateOddsStatsCache();
    console.log(`[AdminOdds] Auto-selected best odds for ${processed} events`);

    return res.status(200).json({
      processed,
      message: `Auto-selected best odds for ${processed} events`,
    });
  } catch (error) {
    next(error);
  }
});

oddsAdminRouter.post("/admin/odds/sync", async (_req, res, next) => {
  try {
    const configuredCount = await prisma.sportEvent.count({
      where: { isActive: true },
    });

    res.status(200).json({
      synced: configuredCount,
      message: `Sync started for ${configuredCount} configured events`,
      status: "running",
    });

    console.log(
      `[AdminOdds] Manual sync started for ${configuredCount} configured events`,
    );

    void fetchAndSaveOdds()
      .then(() => {
        invalidateOddsStatsCache();
        console.log("[AdminOdds] Manual sync completed");
      })
      .catch((error: unknown) => {
        console.error("[AdminOdds] Manual sync failed", error);
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
      return res.status(400).json({ message: "Invalid event id." });
    }

    const displayedOdds = await prisma.displayedOdds.findMany({
      where: { eventId },
      select: {
        bookmakerId: true,
        bookmakerName: true,
        marketType: true,
        side: true,
        rawOdds: true,
        displayOdds: true,
        isVisible: true,
      },
      orderBy: [
        { bookmakerName: "asc" },
        { marketType: "asc" },
        { side: "asc" },
      ],
    });

    const bookmakers = Object.values(
      displayedOdds.reduce<
        Record<
          string,
          {
            bookmakerId: string;
            bookmakerName: string;
            markets: Array<{
              marketType: string;
              outcomes: Array<{
                side: string;
                rawOdds: number;
                displayOdds: number;
                isVisible: boolean;
              }>;
            }>;
          }
        >
      >(
        (
          accumulator: Record<
            string,
            {
              bookmakerId: string;
              bookmakerName: string;
              markets: Array<{
                marketType: string;
                outcomes: Array<{
                  side: string;
                  rawOdds: number;
                  displayOdds: number;
                  isVisible: boolean;
                }>;
              }>;
            }
          >,
          odd: (typeof displayedOdds)[number],
        ) => {
          const group = accumulator[odd.bookmakerId] ?? {
            bookmakerId: odd.bookmakerId,
            bookmakerName: odd.bookmakerName,
            markets: [],
          };

          const existingMarket = group.markets.find(
            (market: { marketType: string }) =>
              market.marketType === odd.marketType,
          );

          if (existingMarket) {
            existingMarket.outcomes.push({
              side: odd.side,
              rawOdds: odd.rawOdds,
              displayOdds: odd.displayOdds,
              isVisible: odd.isVisible,
            });
          } else {
            group.markets.push({
              marketType: odd.marketType,
              outcomes: [
                {
                  side: odd.side,
                  rawOdds: odd.rawOdds,
                  displayOdds: odd.displayOdds,
                  isVisible: odd.isVisible,
                },
              ],
            });
          }

          accumulator[odd.bookmakerId] = group;
          return accumulator;
        },
        {},
      ),
    );

    return res.status(200).json({ eventId, bookmakers });
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
        return res.status(400).json({ message: "Invalid event id." });
      }

      const parsedBody = visibilityBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid visibility payload." });
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

oddsAdminRouter.post(
  "/admin/odds/:eventId/override",
  async (req, res, next) => {
    try {
      const eventId = Array.isArray(req.params.eventId)
        ? req.params.eventId[0]
        : req.params.eventId;

      if (!eventId) {
        return res.status(400).json({ message: "Invalid event id." });
      }

      const parsedBody = overrideBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res
          .status(400)
          .json({ message: "Invalid odds override payload." });
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
  },
);

export { oddsAdminRouter };
