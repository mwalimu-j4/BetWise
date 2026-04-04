import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";

const oddsAdminRouter = Router();

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

oddsAdminRouter.use("/admin/odds", authenticate, requireAdmin);

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
      orderBy: [{ bookmakerName: "asc" }, { marketType: "asc" }, { side: "asc" }],
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
          (market: { marketType: string }) => market.marketType === odd.marketType,
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

oddsAdminRouter.patch("/admin/odds/:eventId/visibility", async (req, res, next) => {
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

    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

oddsAdminRouter.post("/admin/odds/:eventId/override", async (req, res, next) => {
  try {
    const eventId = Array.isArray(req.params.eventId)
      ? req.params.eventId[0]
      : req.params.eventId;

    if (!eventId) {
      return res.status(400).json({ message: "Invalid event id." });
    }

    const parsedBody = overrideBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: "Invalid odds override payload." });
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

    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

export { oddsAdminRouter };
