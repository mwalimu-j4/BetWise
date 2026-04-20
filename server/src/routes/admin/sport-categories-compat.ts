import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";

type CategoryDefinition = {
  id: string;
  sportKey: string;
  displayName: string;
  icon: string;
  sortOrder: number;
};

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  { id: "soccer", sportKey: "soccer", displayName: "Football", icon: "football", sortOrder: 1 },
  { id: "basketball", sportKey: "basketball", displayName: "Basketball", icon: "basketball", sortOrder: 2 },
  { id: "tennis", sportKey: "tennis", displayName: "Tennis", icon: "tennis", sortOrder: 3 },
  { id: "americanfootball", sportKey: "americanfootball", displayName: "American Football", icon: "shield", sortOrder: 4 },
  { id: "cricket", sportKey: "cricket", displayName: "Cricket", icon: "cricket", sortOrder: 5 },
  { id: "icehockey", sportKey: "icehockey", displayName: "Ice Hockey", icon: "hockey", sortOrder: 6 },
  { id: "rugbyunion", sportKey: "rugbyunion", displayName: "Rugby Union", icon: "rugby", sortOrder: 7 },
  { id: "boxing_mma", sportKey: "boxing_mma", displayName: "Boxing / MMA", icon: "combat", sortOrder: 8 },
  { id: "baseball", sportKey: "baseball", displayName: "Baseball", icon: "baseball", sortOrder: 9 },
  { id: "volleyball", sportKey: "volleyball", displayName: "Volleyball", icon: "volleyball", sortOrder: 10 },
  { id: "tabletennis", sportKey: "tabletennis", displayName: "Table Tennis", icon: "table-tennis", sortOrder: 11 },
  { id: "golf", sportKey: "golf", displayName: "Golf", icon: "golf", sortOrder: 12 },
  { id: "snooker", sportKey: "snooker", displayName: "Snooker", icon: "snooker", sortOrder: 13 },
  { id: "darts", sportKey: "darts", displayName: "Darts", icon: "darts", sortOrder: 14 },
];

function mapEventSportKeyToCategory(rawSportKey: string) {
  const key = rawSportKey.toLowerCase();

  if (key.includes("soccer") || key.includes("football") || key.includes("epl")) return "soccer";
  if (key.includes("basket")) return "basketball";
  if (key.includes("tennis") && key.includes("table")) return "tabletennis";
  if (key.includes("tennis")) return "tennis";
  if (key.includes("american") || key.includes("nfl") || key.includes("ncaaf")) return "americanfootball";
  if (key.includes("cricket")) return "cricket";
  if (key.includes("hockey")) return "icehockey";
  if (key.includes("rugby") || key.includes("nrl")) return "rugbyunion";
  if (key.includes("mma") || key.includes("boxing")) return "boxing_mma";
  if (key.includes("baseball") || key.includes("mlb")) return "baseball";
  if (key.includes("volley")) return "volleyball";
  if (key.includes("golf")) return "golf";
  if (key.includes("snooker")) return "snooker";
  if (key.includes("darts")) return "darts";
  return "soccer";
}

const sportCategoriesCompatRouter = Router();

sportCategoriesCompatRouter.use("/admin/sport-categories", authenticate, requireAdmin);

sportCategoriesCompatRouter.get("/admin/sport-categories", async (_req, res, next) => {
  try {
    const now = new Date();

    const grouped = await prisma.sportEvent.groupBy({
      by: ["sportKey"],
      where: {
        isActive: true,
        status: { in: ["UPCOMING", "LIVE"] },
        commenceTime: { gt: now },
      },
      _count: { id: true },
    });

    const countByCategory = new Map<string, number>();
    for (const row of grouped) {
      const sourceKey = row.sportKey ?? "soccer";
      const categoryKey = mapEventSportKeyToCategory(sourceKey);
      countByCategory.set(categoryKey, (countByCategory.get(categoryKey) ?? 0) + row._count.id);
    }

    const categories = CATEGORY_DEFINITIONS.map((definition) => {
      const liveCount = countByCategory.get(definition.sportKey) ?? 0;
      return {
        id: definition.id,
        sportKey: definition.sportKey,
        displayName: definition.displayName,
        icon: definition.icon,
        isActive: liveCount > 0,
        showInNav: true,
        sortOrder: definition.sortOrder,
        eventCount: liveCount,
        liveEventCount: liveCount,
        lastSyncedAt: now.toISOString(),
      };
    });

    return res.status(200).json({
      categories,
      totalActive: categories.filter((category) => category.isActive).length,
      totalInactive: categories.filter((category) => !category.isActive).length,
    });
  } catch (error) {
    next(error);
  }
});

export { sportCategoriesCompatRouter };
