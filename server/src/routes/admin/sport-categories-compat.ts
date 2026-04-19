import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";
import {
  configureSelectedSportCategories,
  configureSportCategoryEvents,
  listSportCategories,
  listSportCategoryEvents,
  syncAllSportCategories,
  syncSportCategory,
} from "../../services/sportCategoriesService";

const sportCategoriesCompatRouter = Router();
const listEventsQuerySchema = z.object({
  filter: z
    .enum(["all", "live", "upcoming", "configured", "not_configured"])
    .default("all"),
});
const configureEventsSchema = z.object({
  eventIds: z.array(z.string().trim().min(1)).optional(),
});
const configureSelectedCategoriesSchema = z.object({
  sportKeys: z.array(z.string().trim().min(1)).min(1),
});

sportCategoriesCompatRouter.use(
  "/admin/sport-categories",
  authenticate,
  requireAdmin,
);

sportCategoriesCompatRouter.get(
  "/admin/sport-categories",
  async (_req, res, next) => {
    try {
      const categories = await listSportCategories();

      return res.status(200).json({
        categories,
        totalActive: categories.filter((category) => category.isActive).length,
        totalInactive: categories.filter((category) => !category.isActive)
          .length,
      });
    } catch (error) {
      next(error);
    }
  },
);

sportCategoriesCompatRouter.post(
  "/admin/sport-categories/sync-all",
  async (_req, res, next) => {
    try {
      const results = await syncAllSportCategories();
      return res.status(200).json({ results });
    } catch (error) {
      next(error);
    }
  },
);

sportCategoriesCompatRouter.post(
  "/admin/sport-categories/configure-selected",
  async (req, res, next) => {
    try {
      const parsedBody = configureSelectedCategoriesSchema.safeParse(req.body);
      if (!parsedBody.success || !req.user?.id) {
        return res.status(400).json({
          message: "Invalid configure selected payload.",
        });
      }

      const result = await configureSelectedSportCategories({
        sportKeys: parsedBody.data.sportKeys,
        adminId: req.user.id,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

sportCategoriesCompatRouter.post(
  "/admin/sport-categories/:sportKey/sync",
  async (req, res, next) => {
    try {
      const sportKey = Array.isArray(req.params.sportKey)
        ? req.params.sportKey[0]
        : req.params.sportKey;

      if (!sportKey) {
        return res.status(400).json({ message: "Invalid sport key." });
      }

      const result = await syncSportCategory(sportKey);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

sportCategoriesCompatRouter.get(
  "/admin/sport-categories/:sportKey/events",
  async (req, res, next) => {
    try {
      const sportKey = Array.isArray(req.params.sportKey)
        ? req.params.sportKey[0]
        : req.params.sportKey;
      const parsedQuery = listEventsQuerySchema.safeParse(req.query);

      if (!sportKey || !parsedQuery.success) {
        return res.status(400).json({ message: "Invalid sport events query." });
      }

      const events = await listSportCategoryEvents(
        sportKey,
        parsedQuery.data.filter,
      );

      return res.status(200).json({ events });
    } catch (error) {
      next(error);
    }
  },
);

sportCategoriesCompatRouter.post(
  "/admin/sport-categories/:sportKey/configure",
  async (req, res, next) => {
    try {
      const sportKey = Array.isArray(req.params.sportKey)
        ? req.params.sportKey[0]
        : req.params.sportKey;
      const parsedBody = configureEventsSchema.safeParse(req.body);

      if (!sportKey || !parsedBody.success || !req.user?.id) {
        return res.status(400).json({ message: "Invalid configure payload." });
      }

      const result = await configureSportCategoryEvents({
        sportKey,
        adminId: req.user.id,
        eventIds: parsedBody.data.eventIds,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

export { sportCategoriesCompatRouter };
