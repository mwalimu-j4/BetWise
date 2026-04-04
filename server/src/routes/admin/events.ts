import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";

const eventsAdminRouter = Router();

const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["UPCOMING", "LIVE", "FINISHED", "CANCELLED"]).optional(),
  hasOdds: z.coerce.boolean().optional(),
  search: z.string().trim().optional(),
  sport: z.string().trim().optional(),
});

const updateEventConfigSchema = z.object({
  houseMargin: z.number().min(0).max(100),
  marketsEnabled: z.array(z.string().trim().min(1)).default(["h2h"]),
});

eventsAdminRouter.use("/admin/events", authenticate, requireAdmin);

eventsAdminRouter.get("/admin/events", async (req, res, next) => {
  try {
    const parsedQuery = listEventsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ message: "Invalid events query." });
    }

    const { page, limit, search, sport, status, hasOdds } = parsedQuery.data;
    const where: Prisma.SportEventWhereInput = {
      status: status ? { equals: status } : { in: ["UPCOMING", "LIVE"] },
      ...(sport ? { sportKey: { equals: sport } } : {}),
      ...(hasOdds ? { displayedOdds: { some: {} } } : {}),
      ...(search
        ? {
            AND: [
              {
                OR: [
                  { homeTeam: { contains: search, mode: "insensitive" } },
                  { awayTeam: { contains: search, mode: "insensitive" } },
                  { leagueName: { contains: search, mode: "insensitive" } },
                ],
              },
            ],
          }
        : {}),
    };

    const [total, orderedRows] = await Promise.all([
      prisma.sportEvent.count({ where }),
      prisma.$queryRaw<Array<{ eventId: string }>>(Prisma.sql`
        SELECT event_id AS "eventId"
        FROM sport_events
        WHERE
          ${
            status
              ? Prisma.sql`status = ${status}::"EventStatus"`
              : Prisma.sql`status IN (${Prisma.join([
                  Prisma.sql`'UPCOMING'::"EventStatus"`,
                  Prisma.sql`'LIVE'::"EventStatus"`,
                ])})`
          }
          ${sport ? Prisma.sql`AND sport_key = ${sport}` : Prisma.empty}
          ${hasOdds ? Prisma.sql`AND EXISTS (SELECT 1 FROM displayed_odds d WHERE d.event_id = sport_events.event_id)` : Prisma.empty}
          ${
            search
              ? Prisma.sql`AND (
                  home_team ILIKE ${`%${search}%`}
                  OR away_team ILIKE ${`%${search}%`}
                  OR league_name ILIKE ${`%${search}%`}
                )`
              : Prisma.empty
          }
        ORDER BY
          CASE
            WHEN status = 'LIVE'::"EventStatus" THEN 0
            WHEN status = 'UPCOMING'::"EventStatus" THEN 1
            WHEN status = 'FINISHED'::"EventStatus" THEN 2
            ELSE 3
          END,
          commence_time ASC
        OFFSET ${(page - 1) * limit}
        LIMIT ${limit}
      `),
    ]);

    const orderedEventIds = orderedRows.map(
      (row: { eventId: string }) => row.eventId,
    );
    if (orderedEventIds.length === 0) {
      return res.status(200).json({
        events: [],
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }

    const events = await prisma.sportEvent.findMany({
      where: { eventId: { in: orderedEventIds } },
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

    const eventMap = new Map<string, (typeof events)[number]>(
      events.map((event: (typeof events)[number]) => [event.eventId, event]),
    );

    return res.status(200).json({
      events: orderedEventIds
        .map((eventId: string) => eventMap.get(eventId))
        .filter(
          (
            event: (typeof events)[number] | undefined,
          ): event is (typeof events)[number] => Boolean(event),
        ),
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

      return res.status(200).json(updatedEvent);
    } catch (error) {
      next(error);
    }
  },
);

export { eventsAdminRouter };
