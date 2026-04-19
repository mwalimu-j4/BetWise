import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";

const sportCategoriesRouter = Router();

// ── In-memory cache ──
const CATEGORIES_CACHE_TTL_MS = 30_000;
let categoriesCache: { data: unknown; expiresAt: number } | null = null;

function invalidateCategoriesCache() {
  categoriesCache = null;
}

// ── SSE progress state (per-process singleton) ──
type SyncProgress = {
  progress: number;
  currentSport: string;
  done: boolean;
  totalConfigured: number;
  totalSports: number;
  completedSports: number;
};

let syncProgress: SyncProgress = {
  progress: 0,
  currentSport: "",
  done: true,
  totalConfigured: 0,
  totalSports: 0,
  completedSports: 0,
};

// ── Schemas ──
const bulkConfigureSchema = z.object({
  sportKeys: z.array(z.string().trim().min(1)).min(1),
  houseMargin: z.number().min(0).max(100).optional().default(5),
});

const reorderSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1),
});

// ── Odds API sport key mapping ──
// Maps our category sportKey to The Odds API sport group prefixes
const SPORT_API_MAPPING: Record<string, string[]> = {
  soccer: [
    "soccer_epl",
    "soccer_uefa_champs_league",
    "soccer_spain_la_liga",
    "soccer_italy_serie_a",
    "soccer_germany_bundesliga",
    "soccer_france_ligue_one",
    "soccer_brazil_serie_a",
    "soccer_efl_champ",
    "soccer_fa_cup",
    "soccer_league_of_ireland",
    "soccer_conmebol_copa_libertadores",
    "soccer_uefa_europa_league",
    "soccer_portugal_primeira_liga",
    "soccer_turkey_super_league",
    "soccer_netherlands_eredivisie",
    "soccer_mexico_ligamx",
    "soccer_usa_mls",
  ],
  basketball: [
    "basketball_nba",
    "basketball_euroleague",
    "basketball_ncaab",
  ],
  tennis: [
    "tennis_atp_french_open",
    "tennis_wta_french_open",
    "tennis_atp_wimbledon",
  ],
  americanfootball: [
    "americanfootball_nfl",
    "americanfootball_ncaaf",
  ],
  cricket: [
    "cricket_ipl",
    "cricket_test_match",
    "cricket_odi",
  ],
  icehockey: [
    "icehockey_nhl",
    "icehockey_sweden_allsvenskan",
  ],
  rugbyunion: [
    "rugbyleague_nrl",
  ],
  boxing_mma: [
    "mma_mixed_martial_arts",
    "boxing_boxing",
  ],
  baseball: [
    "baseball_mlb",
  ],
  volleyball: [],
  tabletennis: [],
  golf: [
    "golf_masters_tournament_winner",
    "golf_pga_championship_winner",
  ],
  snooker: [],
  darts: [],
};

function getOddsApiKey(): string {
  return process.env.ODDS_API_KEY?.trim() ?? "";
}

sportCategoriesRouter.use(
  "/admin/sport-categories",
  authenticate,
  requireAdmin,
);

// ── GET /admin/sport-categories ──
// Returns all categories with live event counts from the database
sportCategoriesRouter.get(
  "/admin/sport-categories",
  async (_req, res, next) => {
    try {
      if (categoriesCache && categoriesCache.expiresAt > Date.now()) {
        return res.status(200).json(categoriesCache.data);
      }

      const categories = await prisma.sportCategory.findMany({
        orderBy: { sortOrder: "asc" },
      });

      // Compute live event counts from the sport_events table
      const now = new Date();
      const sportKeysWithCounts = await prisma.sportEvent.groupBy({
        by: ["sportKey"],
        where: {
          isActive: true,
          status: { in: ["UPCOMING", "LIVE"] },
          commenceTime: { gt: now },
        },
        _count: { id: true },
      });

      const countMap = new Map<string, number>();
      for (const row of sportKeysWithCounts) {
        if (row.sportKey) {
          // Map sportEvent.sportKey back to our category sportKey
          const catKey = mapEventSportKeyToCategory(row.sportKey);
          countMap.set(catKey, (countMap.get(catKey) ?? 0) + row._count.id);
        }
      }

      const enrichedCategories = categories.map((cat) => ({
        ...cat,
        liveEventCount: countMap.get(cat.sportKey) ?? 0,
      }));

      const payload = {
        categories: enrichedCategories,
        totalActive: categories.filter((c) => c.isActive).length,
        totalInactive: categories.filter((c) => !c.isActive).length,
      };

      categoriesCache = {
        data: payload,
        expiresAt: Date.now() + CATEGORIES_CACHE_TTL_MS,
      };

      return res.status(200).json(payload);
    } catch (error) {
      next(error);
    }
  },
);

// ── GET /admin/sport-categories/sync-status ──
// Polling endpoint for bulk configure progress
sportCategoriesRouter.get(
  "/admin/sport-categories/sync-status",
  async (_req, res, _next) => {
    return res.status(200).json(syncProgress);
  },
);

// ── POST /admin/sport-categories/bulk-configure ──
// Fetches events from odds API for selected sports, upserts into events
sportCategoriesRouter.post(
  "/admin/sport-categories/bulk-configure",
  async (req, res, next) => {
    try {
      const parsedBody = bulkConfigureSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({
          error: "Invalid bulk configure payload.",
          details: parsedBody.error.flatten(),
        });
      }

      const { sportKeys, houseMargin } = parsedBody.data;
      const adminId = req.user?.id ?? "";
      const oddsApiKey = getOddsApiKey();

      if (!oddsApiKey) {
        return res.status(500).json({
          error: "ODDS_API_KEY is not configured on the server.",
        });
      }

      // Reset progress
      syncProgress = {
        progress: 0,
        currentSport: "",
        done: false,
        totalConfigured: 0,
        totalSports: sportKeys.length,
        completedSports: 0,
      };

      // Run async configuration (non-blocking for polling)
      void (async () => {
        let totalConfigured = 0;
        const now = new Date();

        for (let i = 0; i < sportKeys.length; i++) {
          const sportKey = sportKeys[i];
          const apiSportKeys = SPORT_API_MAPPING[sportKey] ?? [];

          syncProgress = {
            ...syncProgress,
            currentSport: sportKey,
            progress: Math.round((i / sportKeys.length) * 100),
            completedSports: i,
          };

          let sportEventCount = 0;

          // Fetch from each API sport key
          for (const apiKey of apiSportKeys) {
            try {
              const response = await fetch(
                `https://api.the-odds-api.com/v4/sports/${apiKey}/odds?apiKey=${oddsApiKey}&regions=eu&markets=h2h,spreads,totals&oddsFormat=decimal`,
              );

              if (!response.ok) {
                console.warn(
                  `[SportCategories] API fetch failed for ${apiKey}: ${response.status}`,
                );
                continue;
              }

              const payload = (await response.json()) as unknown;
              if (!Array.isArray(payload)) {
                continue;
              }

              const events = payload as Array<{
                id: string;
                sport_title: string;
                sport_key: string;
                home_team: string;
                away_team: string;
                commence_time: string;
                bookmakers?: Array<{
                  key: string;
                  title: string;
                  markets?: Array<{
                    key: string;
                    outcomes?: Array<{
                      name: string;
                      price: number;
                    }>;
                  }>;
                }>;
              }>;

              // CRITICAL: Filter only future events
              const futureEvents = events.filter((event) => {
                const commenceTime = new Date(event.commence_time);
                return commenceTime > now;
              });

              // Bulk upsert events
              for (const event of futureEvents) {
                const commenceTime = new Date(event.commence_time);

                // CRITICAL: Double-check at DB level — never insert past events
                if (commenceTime <= now) {
                  continue;
                }

                const existingEvent = await prisma.sportEvent.findUnique({
                  where: { eventId: event.id },
                  select: { houseMargin: true },
                });

                const effectiveMargin =
                  existingEvent?.houseMargin ?? houseMargin;

                await prisma.sportEvent.upsert({
                  where: { eventId: event.id },
                  update: {
                    leagueName: event.sport_title,
                    sportKey: event.sport_key,
                    homeTeam: event.home_team,
                    awayTeam: event.away_team,
                    commenceTime,
                    fetchedAt: now,
                    isActive: true,
                  },
                  create: {
                    eventId: event.id,
                    leagueName: event.sport_title,
                    sportKey: event.sport_key,
                    homeTeam: event.home_team,
                    awayTeam: event.away_team,
                    commenceTime,
                    status: "UPCOMING",
                    isActive: true,
                    houseMargin: houseMargin,
                    marketsEnabled: ["h2h"],
                  },
                });

                // Upsert displayed odds
                for (const bookmaker of event.bookmakers ?? []) {
                  for (const market of bookmaker.markets ?? []) {
                    for (const outcome of market.outcomes ?? []) {
                      const adjustedOdds = Number(
                        (
                          outcome.price /
                          (1 + effectiveMargin / 100)
                        ).toFixed(2),
                      );

                      await prisma.displayedOdds.upsert({
                        where: {
                          eventId_bookmakerId_marketType_side: {
                            eventId: event.id,
                            bookmakerId: bookmaker.key,
                            marketType: market.key,
                            side: outcome.name,
                          },
                        },
                        update: {
                          rawOdds: outcome.price,
                          displayOdds: adjustedOdds,
                          bookmakerName: bookmaker.title,
                        },
                        create: {
                          eventId: event.id,
                          bookmakerId: bookmaker.key,
                          bookmakerName: bookmaker.title,
                          marketType: market.key,
                          side: outcome.name,
                          rawOdds: outcome.price,
                          displayOdds: adjustedOdds,
                          isVisible: true,
                        },
                      });
                    }
                  }
                }

                sportEventCount += 1;
              }
            } catch (fetchError) {
              console.warn(
                `[SportCategories] Error fetching ${apiKey}:`,
                fetchError,
              );
            }
          }

          // Update sport category record
          await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Count all active future events for this sport
            const eventCount = await tx.sportEvent.count({
              where: {
                sportKey: { in: apiSportKeys },
                isActive: true,
                status: { in: ["UPCOMING", "LIVE"] },
                commenceTime: { gt: now },
              },
            });

            await tx.sportCategory.update({
              where: { sportKey: sportKey },
              data: {
                isActive: true,
                eventCount,
                lastSyncedAt: now,
                configuredBy: adminId || undefined,
              },
            });

            // Log audit
            await tx.categoryConfigLog.create({
              data: {
                sportKey: sportKey,
                adminId: adminId,
                eventsConfigured: sportEventCount,
                action: `bulk_configure: fetched ${sportEventCount} events from ${apiSportKeys.length} API keys`,
              },
            });
          });

          totalConfigured += sportEventCount;
        }

        syncProgress = {
          progress: 100,
          currentSport: "",
          done: true,
          totalConfigured,
          totalSports: sportKeys.length,
          completedSports: sportKeys.length,
        };

        invalidateCategoriesCache();
        console.log(
          `[SportCategories] Bulk configure complete: ${totalConfigured} events across ${sportKeys.length} sports`,
        );
      })();

      return res.status(202).json({
        message: "Bulk configure started. Poll /sync-status for progress.",
        sportKeys,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ── PATCH /admin/sport-categories/:id/toggle ──
sportCategoriesRouter.patch(
  "/admin/sport-categories/:id/toggle",
  async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "Missing category id." });
      }

      const existing = await prisma.sportCategory.findUnique({
        where: { id },
        select: { isActive: true, sportKey: true },
      });

      if (!existing) {
        return res.status(404).json({ error: "Sport category not found." });
      }

      const updated = await prisma.sportCategory.update({
        where: { id },
        data: { isActive: !existing.isActive },
      });

      invalidateCategoriesCache();
      console.log(
        `[SportCategories] Toggled ${existing.sportKey} to ${updated.isActive}`,
      );

      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// ── PATCH /admin/sport-categories/reorder ──
sportCategoriesRouter.patch(
  "/admin/sport-categories/reorder",
  async (req, res, next) => {
    try {
      const parsedBody = reorderSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res
          .status(400)
          .json({ error: "Invalid reorder payload." });
      }

      const { ids } = parsedBody.data;

      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.sportCategory.update({
            where: { id },
            data: { sortOrder: index + 1 },
          }),
        ),
      );

      invalidateCategoriesCache();
      console.log(
        `[SportCategories] Reordered ${ids.length} categories`,
      );

      return res.status(200).json({ updated: ids.length });
    } catch (error) {
      next(error);
    }
  },
);

// ── Helper: map event sportKey to category sportKey ──
function mapEventSportKeyToCategory(eventSportKey: string): string {
  const lower = eventSportKey.toLowerCase();
  if (lower.startsWith("soccer")) return "soccer";
  if (lower.startsWith("basketball")) return "basketball";
  if (lower.startsWith("tennis")) return "tennis";
  if (lower.startsWith("americanfootball")) return "americanfootball";
  if (lower.startsWith("cricket")) return "cricket";
  if (lower.startsWith("icehockey")) return "icehockey";
  if (lower.startsWith("rugby")) return "rugbyunion";
  if (lower.startsWith("mma") || lower.startsWith("boxing")) return "boxing_mma";
  if (lower.startsWith("baseball")) return "baseball";
  if (lower.startsWith("volleyball")) return "volleyball";
  if (lower.startsWith("tabletennis")) return "tabletennis";
  if (lower.startsWith("golf")) return "golf";
  if (lower.startsWith("snooker")) return "snooker";
  if (lower.startsWith("darts")) return "darts";
  return lower;
}

export { sportCategoriesRouter };
