import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";
import {
  loadBetSlipRateLimiter,
  placeBetRateLimiter,
} from "../../middleware/rateLimiter";
import { computePossiblePayout, generateBetCode } from "../../utils/betUtils";
import { getSystemSettings } from "../../lib/settings";

const userBetsRouter = Router();

const placeBetBodySchema = z.object({
  eventId: z.string().trim().min(1),
  marketType: z.string().trim().min(1),
  side: z.string().trim().min(1),
  stake: z.number().int().positive(),
  odds: z.number().positive(),
  confirmOddsChange: z.boolean().optional(),
});

const loadBetSlipQuerySchema = z.object({
  code: z.string().trim().min(4).max(32),
});

userBetsRouter.use("/user/bets", authenticate);

userBetsRouter.post(
  "/user/bets/place",
  placeBetRateLimiter,
  async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parsedBody = placeBetBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: "Please enter a valid bet." });
      }

      const { eventId, marketType, side, stake, odds, confirmOddsChange } =
        parsedBody.data;

      const settings = await getSystemSettings();
      const { minBetAmount, maxBetAmount } = settings.bettingEngineConfig;
      const { maxActiveBetsPerUser } = settings.userDefaultsAndRestrictions;

      if (stake < minBetAmount) {
        return res
          .status(400)
          .json({ error: `Minimum stake is KES ${minBetAmount.toLocaleString()}.` });
      }

      if (stake > maxBetAmount) {
        return res
          .status(400)
          .json({ error: `Maximum stake is KES ${maxBetAmount.toLocaleString()}.` });
      }

      const activeBetsCount = await prisma.bet.count({
        where: { userId, status: "PENDING" },
      });

      if (activeBetsCount >= maxActiveBetsPerUser) {
        return res.status(400).json({
          error: `You have reached the maximum limit of ${maxActiveBetsPerUser} active bets. Please wait for your current bets to settle.`,
        });
      }

      const stakeAmount = stake;

      const result = await prisma.$transaction(async (tx) => {
        const event = await tx.sportEvent.findUnique({
          where: { eventId },
          select: {
            eventId: true,
            homeTeam: true,
            awayTeam: true,
            isActive: true,
            status: true,
          },
        });

        if (!event || !event.isActive) {
          throw new Error("Event not available for betting");
        }

        if (event.status === "FINISHED" || event.status === "CANCELLED") {
          throw new Error("Market suspended");
        }

        const wallet = await tx.wallet.findUnique({
          where: { userId },
          select: {
            id: true,
            balance: true,
          },
        });

        if (!wallet) {
          throw new Error("Wallet not found. Please deposit first.");
        }

        if (wallet.balance < stakeAmount) {
          throw new Error("Insufficient balance");
        }

        const dbOdds = await tx.displayedOdds.findFirst({
          where: {
            eventId,
            marketType,
            side,
            isVisible: true,
          },
          orderBy: { displayOdds: "desc" },
          select: {
            bookmakerId: true,
            displayOdds: true,
          },
        });

        if (!dbOdds) {
          throw new Error("Market suspended");
        }

        const oddsDelta = Math.abs(dbOdds.displayOdds - odds);
        const oddsChangeRatio = odds > 0 ? oddsDelta / odds : 1;
        const hasLargeOddsChange = oddsChangeRatio > 0.05;

        if (hasLargeOddsChange && !confirmOddsChange) {
          const error = new Error("ODDS_CHANGED");
          (error as Error & { newOdds?: number }).newOdds = dbOdds.displayOdds;
          throw error;
        }

        const updatedWallet = await tx.wallet.update({
          where: { userId },
          data: {
            balance: {
              decrement: stakeAmount,
            },
          },
          select: {
            balance: true,
          },
        });

        let bet = null as {
          id: string;
          betCode: string;
          stake: number;
          displayOdds: number;
          potentialPayout: number;
          status: "PENDING" | "WON" | "LOST" | "VOID";
        } | null;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            bet = await tx.bet.create({
              data: {
                betCode: generateBetCode(),
                userId,
                eventId: event.eventId,
                bookmakerId: dbOdds.bookmakerId,
                marketType,
                side,
                selectionsSnapshot: [
                  {
                    eventId: event.eventId,
                    homeTeam: event.homeTeam,
                    awayTeam: event.awayTeam,
                    marketType,
                    side,
                    odds: dbOdds.displayOdds,
                  },
                ],
                stake,
                displayOdds: dbOdds.displayOdds,
                potentialPayout: computePossiblePayout(
                  stake,
                  dbOdds.displayOdds,
                ),
                status: "PENDING",
              },
              select: {
                id: true,
                betCode: true,
                stake: true,
                displayOdds: true,
                potentialPayout: true,
                status: true,
              },
            });
            break;
          } catch (createError) {
            const duplicateCode =
              createError instanceof Error &&
              createError.message.includes("bets_bet_code_key");

            if (!duplicateCode || attempt === 2) {
              throw createError;
            }
          }
        }

        if (!bet) {
          throw new Error("Could not place bet. Please try again.");
        }

        await tx.walletTransaction.create({
          data: {
            userId,
            walletId: wallet.id,
            type: "BET_STAKE",
            status: "COMPLETED",
            amount: stakeAmount,
            currency: "KES",
            channel: "betting",
            reference: `BET-${bet.id}`,
            description: `Bet on ${event.homeTeam} vs ${event.awayTeam}`,
          },
        });

        return {
          bet,
          newBalance: updatedWallet.balance,
        };
      });

      return res.status(200).json({
        success: true,
        bet: result.bet,
        newBalance: result.newBalance,
      });
    } catch (error) {
      if (error instanceof Error) {
        const knownErrors = new Set([
          "Event not available for betting",
          "Wallet not found. Please deposit first.",
          "Insufficient balance",
          "Market suspended",
        ]);

        if (knownErrors.has(error.message)) {
          return res.status(400).json({ error: error.message });
        }

        if (error.message === "ODDS_CHANGED") {
          const withOdds = error as Error & { newOdds?: number };
          return res.status(409).json({
            error: `Odds have changed. New odds: ${withOdds.newOdds?.toFixed(2) ?? "-"}. Do you want to proceed?`,
            code: "ODDS_CHANGED",
            newOdds: withOdds.newOdds ?? null,
          });
        }
      }

      next(error);
    }
  },
);

userBetsRouter.get(
  "/user/betslip/load",
  loadBetSlipRateLimiter,
  async (req, res, next) => {
    try {
      const parsedQuery = loadBetSlipQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({ error: "Invalid betslip code" });
      }

      const code = parsedQuery.data.code.toUpperCase();
      const bet = await prisma.bet.findFirst({
        where: {
          betCode: code,
        },
        select: {
          betCode: true,
          marketType: true,
          side: true,
          displayOdds: true,
          event: {
            select: {
              eventId: true,
              homeTeam: true,
              awayTeam: true,
              leagueName: true,
              commenceTime: true,
              status: true,
            },
          },
        },
      });

      if (!bet || !bet.event) {
        return res.status(404).json({ error: "Shared betslip not found" });
      }

      if (bet.event.status === "FINISHED" || bet.event.status === "CANCELLED") {
        return res
          .status(400)
          .json({ error: "This shared selection is no longer available" });
      }

      return res.status(200).json({
        code: bet.betCode,
        selections: [
          {
            eventId: bet.event.eventId,
            eventName: `${bet.event.homeTeam} vs ${bet.event.awayTeam}`,
            leagueName: bet.event.leagueName ?? "Live",
            marketType: bet.marketType,
            side: bet.side,
            odds: bet.displayOdds,
            commenceTime: bet.event.commenceTime,
          },
        ],
      });
    } catch (error) {
      next(error);
    }
  },
);

userBetsRouter.get("/user/bets/my", async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const bets = await prisma.bet.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            homeTeam: true,
            awayTeam: true,
            leagueName: true,
            commenceTime: true,
            status: true,
            sportKey: true,
          },
        },
      },
      orderBy: { placedAt: "desc" },
      take: 50,
    });

    return res.status(200).json({ bets });
  } catch (error) {
    next(error);
  }
});

export { userBetsRouter };
