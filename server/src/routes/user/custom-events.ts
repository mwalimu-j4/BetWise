import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";

const userCustomEventsRouter = Router();

const createCustomEventSchema = z.object({
  homeTeam: z.string().trim().min(1, "Home team is required"),
  awayTeam: z.string().trim().min(1, "Away team is required"),
  sport: z.string().trim().default("custom"),
  league: z.string().trim().optional(),
  commenceTime: z.string().datetime(),
  h2hOdds: z
    .object({
      home: z.number().positive(),
      draw: z.number().positive().optional(),
      away: z.number().positive(),
    })
    .optional(),
  spreadsOdds: z
    .object({
      spread: z.number(),
      odds: z.object({
        team1: z.number().positive(),
        team2: z.number().positive(),
      }),
    })
    .optional(),
  totalsOdds: z
    .object({
      total: z.number().positive(),
      odds: z.object({
        over: z.number().positive(),
        under: z.number().positive(),
      }),
    })
    .optional(),
});

const updateCustomEventSchema = z.object({
  homeTeam: z.string().trim().min(1).optional(),
  awayTeam: z.string().trim().min(1).optional(),
  league: z.string().trim().optional(),
  commenceTime: z.string().datetime().optional(),
  status: z.enum(["UPCOMING", "LIVE", "FINISHED", "CANCELLED"]).optional(),
  homeScore: z.number().int().optional(),
  awayScore: z.number().int().optional(),
  h2hOdds: z
    .object({
      home: z.number().positive(),
      draw: z.number().positive().optional(),
      away: z.number().positive(),
    })
    .optional(),
  spreadsOdds: z
    .object({
      spread: z.number(),
      odds: z.object({
        team1: z.number().positive(),
        team2: z.number().positive(),
      }),
    })
    .optional(),
  totalsOdds: z
    .object({
      total: z.number().positive(),
      odds: z.object({
        over: z.number().positive(),
        under: z.number().positive(),
      }),
    })
    .optional(),
});

userCustomEventsRouter.use("/user/custom-events", authenticate);

// Get user's custom events
userCustomEventsRouter.get("/user/custom-events", async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const status = req.query.status as string | undefined;
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    const events = await prisma.customEvent.findMany({
      where,
      orderBy: [{ status: "asc" }, { commenceTime: "asc" }],
    });

    return res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
});

// Get single custom event
userCustomEventsRouter.get(
  "/user/custom-events/:eventId",
  async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const event = await prisma.customEvent.findFirst({
        where: {
          eventId: req.params.eventId,
          userId,
        },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      return res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  },
);

// Create custom event
userCustomEventsRouter.post("/user/custom-events", async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = createCustomEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid event data",
        issues: parsed.error.issues,
      });
    }

    const eventId = `custom-${Date.now()}-${randomUUID().substring(0, 8)}`;

    const customEvent = await prisma.customEvent.create({
      data: {
        eventId,
        userId,
        homeTeam: parsed.data.homeTeam,
        awayTeam: parsed.data.awayTeam,
        sport: parsed.data.sport,
        league: parsed.data.league,
        commenceTime: new Date(parsed.data.commenceTime),
        h2hOdds: parsed.data.h2hOdds ?? Prisma.DbNull,
        spreadsOdds: parsed.data.spreadsOdds ?? Prisma.DbNull,
        totalsOdds: parsed.data.totalsOdds ?? Prisma.DbNull,
      },
    });

    return res.status(201).json(customEvent);
  } catch (error) {
    next(error);
  }
});

// Update custom event
userCustomEventsRouter.patch(
  "/user/custom-events/:eventId",
  async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const event = await prisma.customEvent.findFirst({
        where: {
          eventId: req.params.eventId,
          userId,
        },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const parsed = updateCustomEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid event data",
          issues: parsed.error.issues,
        });
      }

      const updateData: any = {};
      if (parsed.data.homeTeam) updateData.homeTeam = parsed.data.homeTeam;
      if (parsed.data.awayTeam) updateData.awayTeam = parsed.data.awayTeam;
      if (parsed.data.league !== undefined)
        updateData.league = parsed.data.league;
      if (parsed.data.commenceTime)
        updateData.commenceTime = new Date(parsed.data.commenceTime);
      if (parsed.data.status) updateData.status = parsed.data.status;
      if (parsed.data.homeScore !== undefined)
        updateData.homeScore = parsed.data.homeScore;
      if (parsed.data.awayScore !== undefined)
        updateData.awayScore = parsed.data.awayScore;
      if (parsed.data.h2hOdds) updateData.h2hOdds = parsed.data.h2hOdds;
      if (parsed.data.spreadsOdds)
        updateData.spreadsOdds = parsed.data.spreadsOdds;
      if (parsed.data.totalsOdds)
        updateData.totalsOdds = parsed.data.totalsOdds;

      const updated = await prisma.customEvent.update({
        where: { eventId: event.eventId },
        data: updateData,
      });

      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// Delete custom event
userCustomEventsRouter.delete(
  "/user/custom-events/:eventId",
  async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const event = await prisma.customEvent.findFirst({
        where: {
          eventId: req.params.eventId,
          userId,
        },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      await prisma.customEvent.delete({
        where: { eventId: event.eventId },
      });

      return res.status(200).json({ message: "Event deleted" });
    } catch (error) {
      next(error);
    }
  },
);

export { userCustomEventsRouter };
