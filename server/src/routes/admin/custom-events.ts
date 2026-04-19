import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";
import {
  emitCustomEventPublished,
  emitCustomEventSuspended,
  emitCustomEventOddsUpdated,
  emitCustomEventFinished,
} from "../../lib/socket";
import {
  createBetSettlementNotification,
  createEventEndedAdminNotification,
} from "../../controllers/notifications.controller";

const adminCustomEventsRouter = Router();
const adminOnly = [authenticate, requireAdmin] as const;

// ── Schemas ──

const selectionSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  name: z.string().trim().min(1, "Name is required"),
  odds: z.number().min(1.01, "Odds must be at least 1.01"),
});

const marketSchema = z.object({
  name: z.string().trim().min(1, "Market name is required"),
  selections: z.array(selectionSchema).min(2, "At least 2 selections required"),
});

const createEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  teamHome: z.string().trim().min(1, "Home team is required"),
  teamAway: z.string().trim().min(1, "Away team is required"),
  category: z.string().trim().default("Football"),
  league: z.string().trim().default("Custom League"),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  description: z.string().trim().optional(),
  bannerUrl: z.string().trim().url().optional(),
  markets: z.array(marketSchema).min(1, "At least one market is required"),
});

const updateEventSchema = z.object({
  title: z.string().trim().min(1).optional(),
  teamHome: z.string().trim().min(1).optional(),
  teamAway: z.string().trim().min(1).optional(),
  category: z.string().trim().optional(),
  league: z.string().trim().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  bannerUrl: z.string().trim().optional().nullable(),
  status: z
    .enum(["DRAFT", "PUBLISHED", "LIVE", "SUSPENDED", "FINISHED", "CANCELLED"])
    .optional(),
});

const updateOddsSchema = z.object({
  selectionId: z.string().uuid(),
  odds: z.number().min(1.01, "Odds must be at least 1.01"),
});

const settleSchema = z.object({
  marketId: z.string().uuid(),
  winningSelectionId: z.string().uuid(),
});

const listQuerySchema = z.object({
  status: z
    .enum([
      "ALL",
      "DRAFT",
      "PUBLISHED",
      "LIVE",
      "SUSPENDED",
      "FINISHED",
      "CANCELLED",
    ])
    .default("ALL"),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ── Helpers ──

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    return (error as { message?: string }).message || fallback;
  }
  return fallback;
}

function normalizeRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return null;
}

async function createAuditLog(
  eventId: string,
  adminId: string,
  action: string,
  previousValue?: string | null,
  newValue?: string | null,
) {
  await prisma.customEventAuditLog.create({
    data: { eventId, adminId, action, previousValue, newValue },
  });
}

// ── GET /admin/custom-events/stats ──

adminCustomEventsRouter.get(
  "/admin/custom-events/stats",
  ...adminOnly,
  async (_req, res, next) => {
    try {
      const grouped = await prisma.customEvent.groupBy({
        by: ["status"],
        _count: { status: true },
      });

      const result = {
        draft: 0,
        published: 0,
        live: 0,
        finished: 0,
        suspended: 0,
        cancelled: 0,
        total: 0,
      };

      grouped.forEach((row) => {
        const key = row.status.toLowerCase() as keyof typeof result;
        if (key in result) {
          result[key] = row._count.status;
          result.total += row._count.status;
        }
      });

      res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
      return res.status(200).json({
        ...result,
        draftCount: result.draft,
        publishedCount: result.published,
        liveCount: result.live,
        finishedCount: result.finished,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ── GET /admin/custom-events ──

adminCustomEventsRouter.get(
  "/admin/custom-events",
  ...adminOnly,
  async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid query parameters" });
      }

      const { status, search, page, limit } = parsed.data;

      const where: Prisma.CustomEventWhereInput = {
        ...(status !== "ALL" ? { status: status as any } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { teamHome: { contains: search, mode: "insensitive" } },
                { teamAway: { contains: search, mode: "insensitive" } },
                { league: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [total, events] = await Promise.all([
        prisma.customEvent.count({ where }),
        prisma.customEvent.findMany({
          where,
          select: {
            id: true,
            title: true,
            teamHome: true,
            teamAway: true,
            category: true,
            league: true,
            startTime: true,
            endTime: true,
            status: true,
            description: true,
            bannerUrl: true,
            createdBy: true,
            publishedAt: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                bets: true,
                markets: true,
              },
            },
            markets: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
          orderBy: [{ startTime: "asc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const enrichedEvents = events.map((event) => ({
        ...event,
        totalBets: event._count.bets,
        marketsCount: event._count.markets,
      }));

      return res.status(200).json({
        events: enrichedEvents,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },
);

// ── GET /admin/custom-events/:id ──

adminCustomEventsRouter.get(
  "/admin/custom-events/:id",
  ...adminOnly,
  async (req, res, next) => {
    try {
      const eventId = normalizeRouteParam(req.params.id);
      if (!eventId) {
        return res.status(400).json({ error: "Invalid event id" });
      }

      const event = await prisma.customEvent.findUnique({
        where: { id: eventId },
        include: {
          markets: {
            include: {
              selections: {
                include: {
                  _count: { select: { bets: true } },
                },
              },
            },
          },
          bets: {
            orderBy: { placedAt: "desc" },
            take: 50,
          },
          auditLogs: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Calculate liability per selection
      const selectionIds = event.markets.flatMap((m) =>
        m.selections.map((s) => s.id),
      );
      const liabilityAggs = await prisma.customBet.groupBy({
        by: ["selectionId"],
        where: {
          selectionId: { in: selectionIds },
          status: "PENDING",
        },
        _sum: { potentialWin: true, stake: true },
        _count: true,
      });
      const liabilityMap = new Map(
        liabilityAggs.map((a) => [
          a.selectionId,
          {
            totalLiability: a._sum.potentialWin ?? 0,
            totalStake: a._sum.stake ?? 0,
            betCount: a._count,
          },
        ]),
      );

      const enrichedMarkets = event.markets.map((market) => ({
        ...market,
        selections: market.selections.map((selection) => ({
          ...selection,
          betCount: selection._count.bets,
          liability: liabilityMap.get(selection.id) ?? {
            totalLiability: 0,
            totalStake: 0,
            betCount: 0,
          },
        })),
      }));

      return res.status(200).json({
        ...event,
        markets: enrichedMarkets,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ── POST /admin/custom-events ──

adminCustomEventsRouter.post(
  "/admin/custom-events",
  ...adminOnly,
  async (req, res, next) => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parsed = createEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid event data",
          issues: parsed.error.issues,
        });
      }

      const { markets, ...eventData } = parsed.data;

      const event = await prisma.customEvent.create({
        data: {
          title: eventData.title,
          teamHome: eventData.teamHome,
          teamAway: eventData.teamAway,
          category: eventData.category,
          league: eventData.league,
          startTime: new Date(eventData.startTime),
          endTime: eventData.endTime ? new Date(eventData.endTime) : null,
          description: eventData.description ?? null,
          bannerUrl: eventData.bannerUrl ?? null,
          createdBy: adminId,
          markets: {
            create: markets.map((market) => ({
              name: market.name,
              selections: {
                create: market.selections.map((selection) => ({
                  label: selection.label,
                  name: selection.name,
                  odds: selection.odds,
                })),
              },
            })),
          },
        },
        include: {
          markets: {
            include: { selections: true },
          },
        },
      });

      await createAuditLog(event.id, adminId, "CREATE", null, event.title);

      return res.status(201).json(event);
    } catch (error) {
      const msg = getErrorMessage(error, "Failed to create custom event");
      next(error);
    }
  },
);

// ── PATCH /admin/custom-events/:id ──

adminCustomEventsRouter.patch(
  "/admin/custom-events/:id",
  ...adminOnly,
  async (req, res, next) => {
    try {
      const eventId = normalizeRouteParam(req.params.id);
      if (!eventId) {
        return res.status(400).json({ error: "Invalid event id" });
      }

      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const event = await prisma.customEvent.findUnique({
        where: { id: eventId },
        include: { _count: { select: { bets: true } } },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const parsed = updateEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid update data",
          issues: parsed.error.issues,
        });
      }

      // If event is PUBLISHED/LIVE, restrict what can be edited
      if (event.status === "PUBLISHED" || event.status === "LIVE") {
        const restrictedFields = [
          "title",
          "teamHome",
          "teamAway",
          "category",
          "league",
          "startTime",
        ];
        const attempted = Object.keys(parsed.data);
        const blocked = attempted.filter((k) => restrictedFields.includes(k));
        if (blocked.length > 0) {
          return res.status(400).json({
            error: `Cannot modify ${blocked.join(", ")} on a ${event.status} event`,
          });
        }
      }

      const updateData: any = {};
      if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
      if (parsed.data.teamHome !== undefined)
        updateData.teamHome = parsed.data.teamHome;
      if (parsed.data.teamAway !== undefined)
        updateData.teamAway = parsed.data.teamAway;
      if (parsed.data.category !== undefined)
        updateData.category = parsed.data.category;
      if (parsed.data.league !== undefined)
        updateData.league = parsed.data.league;
      if (parsed.data.startTime !== undefined)
        updateData.startTime = new Date(parsed.data.startTime);
      if (parsed.data.endTime !== undefined)
        updateData.endTime = parsed.data.endTime
          ? new Date(parsed.data.endTime)
          : null;
      if (parsed.data.description !== undefined)
        updateData.description = parsed.data.description;
      if (parsed.data.bannerUrl !== undefined)
        updateData.bannerUrl = parsed.data.bannerUrl;

      const updated = await prisma.customEvent.update({
        where: { id: eventId },
        data: updateData,
        include: {
          markets: { include: { selections: true } },
        },
      });

      await createAuditLog(
        event.id,
        adminId,
        "UPDATE",
        JSON.stringify(parsed.data),
        null,
      );

      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// ── PATCH /admin/custom-events/:id/odds ──

adminCustomEventsRouter.patch(
  "/admin/custom-events/:id/odds",
  ...adminOnly,
  async (req, res, next) => {
    try {
      const eventId = normalizeRouteParam(req.params.id);
      if (!eventId) {
        return res.status(400).json({ error: "Invalid event id" });
      }

      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parsed = updateOddsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid odds data",
          issues: parsed.error.issues,
        });
      }

      const selection = await prisma.customSelection.findUnique({
        where: { id: parsed.data.selectionId },
        include: { market: { include: { event: true } } },
      });

      if (!selection || selection.market.event.id !== eventId) {
        return res
          .status(404)
          .json({ error: "Selection not found for this event" });
      }

      const previousOdds = selection.odds;

      const updated = await prisma.customSelection.update({
        where: { id: parsed.data.selectionId },
        data: { odds: parsed.data.odds },
      });

      await createAuditLog(
        eventId,
        adminId,
        "ODDS_CHANGE",
        `${selection.name}: ${previousOdds}`,
        `${selection.name}: ${parsed.data.odds}`,
      );

      emitCustomEventOddsUpdated({
        eventId,
        selectionId: parsed.data.selectionId,
        newOdds: parsed.data.odds,
      });

      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// ── DELETE /admin/custom-events/:id ──

adminCustomEventsRouter.delete(
  "/admin/custom-events/:id",
  ...adminOnly,
  async (req, res, next) => {
    try {
      const eventId = normalizeRouteParam(req.params.id);
      if (!eventId) {
        return res.status(400).json({ error: "Invalid event id" });
      }

      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const event = await prisma.customEvent.findUnique({
        where: { id: eventId },
        include: { _count: { select: { bets: true } } },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.status !== "DRAFT") {
        return res.status(400).json({
          error: "Only DRAFT events can be deleted",
        });
      }

      if (event._count.bets > 0) {
        return res.status(400).json({
          error: "Cannot delete event with existing bets",
        });
      }

      await prisma.customEvent.delete({ where: { id: eventId } });

      await createAuditLog(
        eventId,
        adminId,
        "DELETE",
        event.title,
        null,
      ).catch(() => {
        // Event was deleted, audit log may fail due to FK - that's OK
      });

      return res.status(200).json({ message: "Event deleted" });
    } catch (error) {
      next(error);
    }
  },
);

// ── POST /admin/custom-events/:id/publish ──

adminCustomEventsRouter.post(
  "/admin/custom-events/:id/publish",
  ...adminOnly,
  async (req, res, next) => {
    try {
      const eventId = normalizeRouteParam(req.params.id);
      if (!eventId) {
        return res.status(400).json({ error: "Invalid event id" });
      }

      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const event = await prisma.customEvent.findUnique({
        where: { id: eventId },
        include: {
          markets: { include: { selections: true } },
        },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.status !== "DRAFT") {
        return res.status(400).json({
          error: `Cannot publish a ${event.status} event. Only DRAFT events can be published.`,
        });
      }

      // Validate startTime is in the future
      if (new Date(event.startTime) <= new Date()) {
        return res.status(400).json({
          error: "Start time must be in the future to publish",
        });
      }

      // Validate at least 1 market with at least 2 selections
      if (event.markets.length === 0) {
        return res.status(400).json({
          error: "Event must have at least one market to publish",
        });
      }

      for (const market of event.markets) {
        if (market.selections.length < 2) {
          return res.status(400).json({
            error: `Market "${market.name}" must have at least 2 selections`,
          });
        }

        for (const selection of market.selections) {
          if (selection.odds < 1.01) {
            return res.status(400).json({
              error: `Selection "${selection.name}" in market "${market.name}" has invalid odds (${selection.odds}). Minimum is 1.01`,
            });
          }
        }
      }

      const updated = await prisma.customEvent.update({
        where: { id: eventId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
        include: {
          markets: { include: { selections: true } },
        },
      });

      await createAuditLog(event.id, adminId, "PUBLISH", "DRAFT", "PUBLISHED");

      emitCustomEventPublished(updated);

      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// ── POST /admin/custom-events/:id/unpublish ──

adminCustomEventsRouter.post(
  "/admin/custom-events/:id/unpublish",
  ...adminOnly,
  async (req, res, next) => {
    try {
      const eventId = normalizeRouteParam(req.params.id);
      if (!eventId) {
        return res.status(400).json({ error: "Invalid event id" });
      }

      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const event = await prisma.customEvent.findUnique({
        where: { id: eventId },
        include: { _count: { select: { bets: true } } },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.status !== "PUBLISHED") {
        return res.status(400).json({
          error: `Cannot unpublish a ${event.status} event`,
        });
      }

      if (event._count.bets > 0) {
        return res.status(400).json({
          error:
            "Cannot unpublish event with existing bets. Suspend the event instead.",
        });
      }

      const updated = await prisma.customEvent.update({
        where: { id: eventId },
        data: {
          status: "DRAFT",
          publishedAt: null,
        },
        include: {
          markets: { include: { selections: true } },
        },
      });

      await createAuditLog(
        event.id,
        adminId,
        "UNPUBLISH",
        "PUBLISHED",
        "DRAFT",
      );

      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// ── POST /admin/custom-events/:id/suspend ──

adminCustomEventsRouter.post(
  "/admin/custom-events/:id/suspend",
  ...adminOnly,
  async (req, res, next) => {
    try {
      const eventId = normalizeRouteParam(req.params.id);
      if (!eventId) {
        return res.status(400).json({ error: "Invalid event id" });
      }

      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const event = await prisma.customEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (
        event.status !== "PUBLISHED" &&
        event.status !== "LIVE" &&
        event.status !== "SUSPENDED"
      ) {
        return res.status(400).json({
          error: `Cannot suspend a ${event.status} event`,
        });
      }

      // Toggle: if already SUSPENDED, resume to previous state
      const nextStatus =
        event.status === "SUSPENDED" ? "PUBLISHED" : "SUSPENDED";

      const updated = await prisma.$transaction(async (tx) => {
        // If suspending, also suspend all open markets
        if (nextStatus === "SUSPENDED") {
          await tx.customMarket.updateMany({
            where: { eventId, status: "OPEN" },
            data: { status: "SUSPENDED" },
          });
        } else {
          // Resuming: reopen suspended markets
          await tx.customMarket.updateMany({
            where: { eventId, status: "SUSPENDED" },
            data: { status: "OPEN" },
          });
        }

        return tx.customEvent.update({
          where: { id: eventId },
          data: { status: nextStatus as any },
          include: {
            markets: { include: { selections: true } },
          },
        });
      });

      await createAuditLog(
        event.id,
        adminId,
        nextStatus === "SUSPENDED" ? "SUSPEND" : "RESUME",
        event.status,
        nextStatus,
      );

      if (nextStatus === "SUSPENDED") {
        emitCustomEventSuspended({ eventId });
      } else {
        emitCustomEventPublished(updated);
      }

      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// ── POST /admin/custom-events/:id/settle ──

adminCustomEventsRouter.post(
  "/admin/custom-events/:id/settle",
  ...adminOnly,
  async (req, res, next) => {
    try {
      const eventId = normalizeRouteParam(req.params.id);
      if (!eventId) {
        return res.status(400).json({ error: "Invalid event id" });
      }

      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parsed = settleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid settle data",
          issues: parsed.error.issues,
        });
      }

      const { marketId, winningSelectionId } = parsed.data;

      const market = await prisma.customMarket.findUnique({
        where: { id: marketId },
        include: {
          event: true,
          selections: true,
        },
      });

      if (!market || market.event.id !== eventId) {
        return res
          .status(404)
          .json({ error: "Market not found for this event" });
      }

      if (market.status === "SETTLED") {
        return res
          .status(400)
          .json({ error: "Market has already been settled" });
      }

      const winningSelection = market.selections.find(
        (s) => s.id === winningSelectionId,
      );
      if (!winningSelection) {
        return res.status(400).json({
          error: "Winning selection not found in this market",
        });
      }

      // Atomic transaction: settle selections, bets, and credit wallets
      const result = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // 1. Mark winning selection
          await tx.customSelection.update({
            where: { id: winningSelectionId },
            data: { result: "WIN" },
          });

          // 2. Mark losing selections
          const losingIds = market.selections
            .filter((s) => s.id !== winningSelectionId)
            .map((s) => s.id);

          if (losingIds.length > 0) {
            await tx.customSelection.updateMany({
              where: { id: { in: losingIds } },
              data: { result: "LOSE" },
            });
          }

          // 3. Mark market as settled
          await tx.customMarket.update({
            where: { id: marketId },
            data: { status: "SETTLED" },
          });

          // 4. Get all pending bets on the winning selection
          const winningBets = await tx.customBet.findMany({
            where: {
              selectionId: winningSelectionId,
              status: "PENDING",
            },
          });

          // 5. Mark winning bets
          if (winningBets.length > 0) {
            await tx.customBet.updateMany({
              where: {
                selectionId: winningSelectionId,
                status: "PENDING",
              },
              data: { status: "WON", settledAt: new Date() },
            });

            // 6. Credit wallets
            for (const bet of winningBets) {
              await tx.wallet.update({
                where: { userId: bet.userId },
                data: { balance: { increment: Math.round(bet.potentialWin) } },
              });
            }
          }

          // 7. Get losing bets for notifications
          const losingBets = losingIds.length > 0
            ? await tx.customBet.findMany({
                where: {
                  selectionId: { in: losingIds },
                  status: "PENDING",
                },
                select: { id: true, userId: true, stake: true, odds: true, potentialWin: true },
              })
            : [];

          // 8. Mark losing bets
          if (losingIds.length > 0) {
            await tx.customBet.updateMany({
              where: {
                selectionId: { in: losingIds },
                status: "PENDING",
              },
              data: { status: "LOST", settledAt: new Date() },
            });
          }

          // 9. Check if all markets are settled → finish event
          const unsettledMarkets = await tx.customMarket.count({
            where: {
              eventId,
              status: { not: "SETTLED" },
            },
          });

          if (unsettledMarkets === 0) {
            await tx.customEvent.update({
              where: { id: eventId },
              data: { status: "FINISHED" },
            });
          }

          return {
            winningBets,
            losingBets,
            winningBetsCount: winningBets.length,
            totalPayout: winningBets.reduce(
              (sum, b) => sum + b.potentialWin,
              0,
            ),
            allMarketsSettled: unsettledMarkets === 0,
          };
        },
      );

      await createAuditLog(
        eventId,
        adminId,
        "SETTLE_MARKET",
        `Market: ${market.name}`,
        `Winner: ${winningSelection.name} | Payouts: ${result.winningBetsCount} bets, ${result.totalPayout.toFixed(2)} total`,
      );

      // Send notifications to winning bettors
      const eventName = `${market.event.teamHome} vs ${market.event.teamAway}`;
      for (const bet of result.winningBets) {
        void createBetSettlementNotification({
          userId: bet.userId,
          betCode: `CB-${bet.id.slice(0, 8).toUpperCase()}`,
          eventName,
          stake: bet.stake,
          potentialPayout: bet.potentialWin,
          status: "WON",
        });
      }

      // Send notifications to losing bettors
      for (const bet of result.losingBets) {
        void createBetSettlementNotification({
          userId: bet.userId,
          betCode: `CB-${bet.id.slice(0, 8).toUpperCase()}`,
          eventName,
          stake: bet.stake,
          potentialPayout: bet.potentialWin,
          status: "LOST",
        });
      }

      // If all markets settled, notify admins and emit event finished
      if (result.allMarketsSettled) {
        emitCustomEventFinished({ eventId });

        // Gather total stats for admin notification
        const totalBets = await prisma.customBet.count({ where: { eventId } });
        const stakeAgg = await prisma.customBet.aggregate({
          where: { eventId },
          _sum: { stake: true },
        });

        void createEventEndedAdminNotification({
          eventName,
          eventType: "custom",
          pendingBetsCount: 0,
          totalBetsCount: totalBets,
          totalStaked: stakeAgg._sum.stake ?? 0,
          eventId,
        });
      }

      return res.status(200).json({
        message: "Market settled successfully",
        winningBetsCount: result.winningBetsCount,
        totalPayout: result.totalPayout,
        allMarketsSettled: result.allMarketsSettled,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ── POST /admin/custom-events/:id/markets ── (Add market to existing event)

adminCustomEventsRouter.post(
  "/admin/custom-events/:id/markets",
  ...adminOnly,
  async (req, res, next) => {
    try {
      const eventId = normalizeRouteParam(req.params.id);
      if (!eventId) {
        return res.status(400).json({ error: "Invalid event id" });
      }

      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parsed = marketSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid market data",
          issues: parsed.error.issues,
        });
      }

      const event = await prisma.customEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const market = await prisma.customMarket.create({
        data: {
          eventId,
          name: parsed.data.name,
          selections: {
            create: parsed.data.selections.map((s) => ({
              label: s.label,
              name: s.name,
              odds: s.odds,
            })),
          },
        },
        include: { selections: true },
      });

      await createAuditLog(
        eventId,
        adminId,
        "ADD_MARKET",
        null,
        `Market: ${market.name}`,
      );

      return res.status(201).json(market);
    } catch (error) {
      next(error);
    }
  },
);

export { adminCustomEventsRouter };
