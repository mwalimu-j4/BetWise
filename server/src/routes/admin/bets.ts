import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";

const betsAdminRouter = Router();

const listBetsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["PENDING", "WON", "LOST", "VOID"]).optional(),
  search: z.string().trim().optional(),
});

const settleBetBodySchema = z.object({
  winner: z.string().trim().min(1),
});

betsAdminRouter.use("/admin/bets", authenticate, requireAdmin);

betsAdminRouter.get("/admin/bets", async (req, res, next) => {
  try {
    const parsedQuery = listBetsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ message: "Invalid bets query." });
    }

    const { page, limit, search, status } = parsedQuery.data;
    const where: Prisma.BetWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            AND: [
              {
                OR: [
                  { user: { email: { contains: search, mode: "insensitive" } } },
                  { user: { phone: { contains: search, mode: "insensitive" } } },
                  { event: { homeTeam: { contains: search, mode: "insensitive" } } },
                  { event: { awayTeam: { contains: search, mode: "insensitive" } } },
                ],
              },
            ],
          }
        : {}),
    };

    const [bets, total] = await Promise.all([
      prisma.bet.findMany({
        where,
        select: {
          id: true,
          userId: true,
          eventId: true,
          marketType: true,
          side: true,
          stake: true,
          displayOdds: true,
          potentialPayout: true,
          status: true,
          placedAt: true,
          settledAt: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
          event: {
            select: {
              homeTeam: true,
              awayTeam: true,
              leagueName: true,
              sportKey: true,
              commenceTime: true,
              status: true,
            },
          },
        },
        orderBy: { placedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bet.count({ where }),
    ]);

    return res.status(200).json({
      bets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

betsAdminRouter.post("/admin/bets/:betId/settle", async (req, res, next) => {
  try {
    const betId = Array.isArray(req.params.betId) ? req.params.betId[0] : req.params.betId;
    if (!betId) {
      return res.status(400).json({ message: "Invalid bet id." });
    }

    const parsedBody = settleBetBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: "Invalid settle payload." });
    }

    const bet = await prisma.bet.findUnique({
      where: { id: betId },
      select: {
        id: true,
        userId: true,
        side: true,
        stake: true,
        potentialPayout: true,
        status: true,
        event: {
          select: {
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
    });

    if (!bet) {
      return res.status(404).json({ message: "Bet not found." });
    }

    if (bet.status !== "PENDING") {
      return res.status(400).json({ error: "Bet already settled" });
    }

    const winner = parsedBody.data.winner;
    const now = new Date();

    if (winner.toLowerCase() === "void") {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.bet.update({
          where: { id: betId },
          data: {
            status: "VOID",
            settledAt: now,
          },
        });

        await tx.wallet.update({
          where: { userId: bet.userId },
          data: {
            balance: {
              increment: Math.round(bet.stake),
            },
          },
        });
      });

      return res.status(200).json({
        settled: true,
        status: "VOID",
        payout: Math.round(bet.stake),
      });
    }

    const won = bet.side === winner;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.bet.update({
        where: { id: betId },
        data: {
          status: won ? "WON" : "LOST",
          settledAt: now,
        },
      });

      if (won) {
        await tx.wallet.update({
          where: { userId: bet.userId },
          data: {
            balance: {
              increment: Math.round(bet.potentialPayout),
            },
          },
        });
      }
    });

    return res.status(200).json({
      settled: true,
      status: won ? "WON" : "LOST",
      payout: won ? bet.potentialPayout : 0,
    });
  } catch (error) {
    next(error);
  }
});

export { betsAdminRouter };
