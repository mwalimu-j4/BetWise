import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { emitBetUpdate, emitWalletUpdate } from "../../lib/socket";
import { getOrCreateWallet } from "../../lib/wallet";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";
import { createBetSettlementNotification } from "../../controllers/notifications.controller";
import { getSystemSettings } from "../../lib/settings";

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
                  {
                    user: { email: { contains: search, mode: "insensitive" } },
                  },
                  {
                    user: { phone: { contains: search, mode: "insensitive" } },
                  },
                  {
                    event: {
                      homeTeam: { contains: search, mode: "insensitive" },
                    },
                  },
                  {
                    event: {
                      awayTeam: { contains: search, mode: "insensitive" },
                    },
                  },
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
    const betId = Array.isArray(req.params.betId)
      ? req.params.betId[0]
      : req.params.betId;
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
        betCode: true,
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
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const wallet = await getOrCreateWallet(bet.userId, tx);
        await tx.bet.update({
          where: { id: betId },
          data: {
            status: "VOID",
            settledAt: now,
            lastStatusChangeAt: now,
          },
        });

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: Math.round(bet.stake),
            },
          },
          select: { balance: true },
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            userId: bet.userId,
            walletId: wallet.id,
            type: "REFUND",
            status: "COMPLETED",
            amount: Math.round(bet.stake),
            currency: "KES",
            channel: "betting",
            reference: `BET-VOID-${bet.id}`,
            description: `Voided bet ${bet.betCode}`,
          },
        });

        return {
          balance: updatedWallet.balance,
          transactionId: transaction.id,
        };
      });

      emitBetUpdate(bet.userId, {
        betId: bet.id,
        betCode: bet.betCode,
        status: "cancelled",
        placedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        possiblePayout: 0,
      });

      emitWalletUpdate(bet.userId, {
        transactionId: result.transactionId,
        status: "COMPLETED",
        message: "Bet voided and stake refunded to wallet.",
        balance: result.balance,
        amount: Math.round(bet.stake),
      });

      // Send void notification to user
      void createBetSettlementNotification({
        userId: bet.userId,
        betCode: bet.betCode,
        eventName: `${bet.event.homeTeam} vs ${bet.event.awayTeam}`,
        stake: bet.stake,
        potentialPayout: bet.stake,
        status: "VOID",
      });

      return res.status(200).json({
        settled: true,
        status: "VOID",
        payout: Math.round(bet.stake),
      });
    }

    const won = bet.side === winner;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.bet.update({
        where: { id: betId },
        data: {
          status: won ? "WON" : "LOST",
          settledAt: now,
          lastStatusChangeAt: now,
        },
      });

      if (won) {
        const wallet = await getOrCreateWallet(bet.userId, tx);
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: bet.potentialPayout,
            },
          },
          select: { balance: true },
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            userId: bet.userId,
            walletId: wallet.id,
            type: "BET_WIN",
            status: "COMPLETED",
            amount: bet.potentialPayout,
            currency: "KES",
            channel: "betting",
            reference: `BET-WIN-${bet.id}`,
            description: `Winning payout for bet ${bet.betCode}`,
          },
        });

        return {
          balance: updatedWallet.balance,
          transactionId: transaction.id,
        };
      }

      return null;
    });

    emitBetUpdate(bet.userId, {
      betId: bet.id,
      betCode: bet.betCode,
      status: won ? "won" : "lost",
      placedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      possiblePayout: won ? bet.potentialPayout : 0,
    });

    if (won && result) {
      emitWalletUpdate(bet.userId, {
        transactionId: result.transactionId,
        status: "COMPLETED",
        message: "Winning payout credited to your wallet.",
        balance: result.balance,
        amount: bet.potentialPayout,
      });
    }

    // Send win/loss notification to user
    void createBetSettlementNotification({
      userId: bet.userId,
      betCode: bet.betCode,
      eventName: `${bet.event.homeTeam} vs ${bet.event.awayTeam}`,
      stake: bet.stake,
      potentialPayout: bet.potentialPayout,
      status: won ? "WON" : "LOST",
    });

    return res.status(200).json({
      settled: true,
      status: won ? "WON" : "LOST",
      payout: won ? bet.potentialPayout : 0,
      taxDeducted: 0,
    });
  } catch (error) {
    next(error);
  }
});

export { betsAdminRouter };
