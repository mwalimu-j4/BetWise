import { Router } from "express";
import { Prisma, type EventStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";
import {
  getAutomationConfigByCategoryKey,
  type ManagedSportCategoryKey,
  SEVEN_DAY_WINDOW_MS,
} from "../../services/oddsAutomationConfig";
import { getAutoConfigureStatus, runAutoConfigure } from "../../services/scheduler";

const sportCategoriesRouter = Router();

const bulkConfigureSchema = z.object({
  sportKeys: z.array(z.string().trim().min(1)).min(1),
});

const reorderSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1),
});

sportCategoriesRouter.use("/admin/sport-categories", authenticate, requireAdmin);

sportCategoriesRouter.get("/admin/sport-categories", async (_req, res, next) => {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + SEVEN_DAY_WINDOW_MS);
    const categories = await prisma.sportCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });

    const enriched = await Promise.all(
      categories.map(async (category) => {
        const config = getAutomationConfigByCategoryKey(category.sportKey);
        const activeStatuses: EventStatus[] = ["UPCOMING", "LIVE"];
        const where: Prisma.SportEventWhereInput = {
          sportKey: { in: config?.apiSportKeys ?? [] },
          status: { in: activeStatuses },
          commenceTime: { gt: now, lte: windowEnd },
        };

        const [eventCount, oddsCount, marginAggregate] = await Promise.all([
          prisma.sportEvent.count({ where: { ...where, isActive: true } }),
          prisma.sportEvent.count({ where: { ...where, isActive: true, oddsVerified: true } }),
          prisma.sportEvent.aggregate({
            where: { ...where, isActive: true, oddsVerified: true },
            _avg: { bookmakerMargin: true },
          }),
        ]);

        const avgMargin = Number((((marginAggregate._avg as { bookmakerMargin?: number } | undefined)?.bookmakerMargin) ?? 0).toFixed(4));
        const marginQuality =
          oddsCount === 0 ? "none" : avgMargin <= 0.06 ? "good" : avgMargin <= 0.1 ? "fair" : "poor";

        return {
          ...category,
          eventCount,
          oddsAvailable: oddsCount > 0,
          liveEventCount: oddsCount,
          marginQuality,
          averageBookmakerMargin: avgMargin,
          warning: oddsCount === 0,
        };
      }),
    );

    return res.status(200).json({
      categories: enriched,
      totalActive: enriched.filter((item) => item.isActive).length,
      totalInactive: enriched.filter((item) => !item.isActive).length,
    });
  } catch (error) {
    next(error);
  }
});

sportCategoriesRouter.get("/admin/sport-categories/sync-status", async (_req, res) => {
  return res.status(200).json(getAutoConfigureStatus());
});

sportCategoriesRouter.post("/admin/sport-categories/bulk-configure", async (req, res, next) => {
  try {
    const parsed = bulkConfigureSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid bulk configure payload." });
    }

    const selected = parsed.data.sportKeys.filter(
      (key): key is ManagedSportCategoryKey => Boolean(getAutomationConfigByCategoryKey(key)),
    );

    const result = await runAutoConfigure(selected);
    if (!result.started) {
      return res.status(429).json({
        error: result.reason,
        status: getAutoConfigureStatus(),
      });
    }

    return res.status(202).json({
      message: "Automation started for selected sports.",
      status: getAutoConfigureStatus(),
    });
  } catch (error) {
    next(error);
  }
});

sportCategoriesRouter.patch("/admin/sport-categories/:id/toggle", async (req, res, next) => {
  try {
    const existing = await prisma.sportCategory.findUnique({
      where: { id: req.params.id },
      select: { isActive: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Sport category not found." });
    }

    const updated = await prisma.sportCategory.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });

    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

sportCategoriesRouter.patch("/admin/sport-categories/reorder", async (req, res, next) => {
  try {
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid reorder payload." });
    }

    await prisma.$transaction(
      parsed.data.ids.map((id, index) =>
        prisma.sportCategory.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    return res.status(200).json({ updated: parsed.data.ids.length });
  } catch (error) {
    next(error);
  }
});

export { sportCategoriesRouter };
