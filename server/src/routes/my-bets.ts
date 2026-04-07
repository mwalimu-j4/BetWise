import { BetStatus, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { emitBetUpdate, emitWalletUpdate } from "../lib/socket";
import { prisma } from "../lib/prisma";
import { getOrCreateWallet } from "../lib/wallet";
import { authenticate } from "../middleware/authenticate";
import {
  cancelBetRateLimiter,
  myBetDetailRateLimiter,
  myBetsListRateLimiter,
} from "../middleware/rateLimiter";
import { computePossiblePayout, getClientIp } from "../utils/betUtils";

const myBetsRouter = Router();

const tabSchema = z.enum([
  "normal",
  "shilisha",
  "jackpot",
  "virtual",
  "sababisha",
]);
const filterSchema = z.enum(["open", "all", "today", "week", "month"]);

const listQuerySchema = z.object({
  tab: tabSchema.default("normal"),
  filter: filterSchema.default("all"),
  page: z.coerce.number().int().positive().default(1),
  hideLost: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional(),
});

const betIdSchema = z.string().uuid();

const tabToBetType: Record<z.infer<typeof tabSchema>, string> = {
  normal: "NORMAL",
  shilisha: "SHILISHA",
  jackpot: "JACKPOT",
  virtual: "VIRTUAL",
  sababisha: "SABABISHA",
};

function toClientStatus(args: {
  status: BetStatus;
  isPromoted: boolean;
  cancelledAt: Date | null;
}) {
  if (args.status === "VOID" || args.cancelledAt) {
    return "cancelled" as const;
  }

  if (args.isPromoted) {
    return "bonus" as const;
  }

  if (args.status === "WON") {
    return "won" as const;
  }

  if (args.status === "LOST") {
    return "lost" as const;
  }

  return "open" as const;
}

function getDateFilterWindow(filter: z.infer<typeof filterSchema>) {
  const now = new Date();
  const start = new Date(now);

  if (filter === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (filter === "week") {
    start.setDate(start.getDate() - 7);
    return start;
  }

  if (filter === "month") {
    start.setDate(start.getDate() - 30);
    return start;
  }

  return null;
}

function getCancellableUntil(placedAt: Date) {
  const cancellableUntil = new Date(placedAt);
  cancellableUntil.setMinutes(cancellableUntil.getMinutes() + 5);
  return cancellableUntil;
}

function isCancellable(args: {
  status: BetStatus;
  placedAt: Date;
  matchStart: Date;
  now: Date;
  cancelledAt: Date | null;
}) {
  if (args.status !== "PENDING" || args.cancelledAt) {
    return false;
  }

  if (args.matchStart <= args.now) {
    return false;
  }

  return getCancellableUntil(args.placedAt) > args.now;
}

async function createAuditLog(args: {
  userId: string;
  betId: string;
  action:
    | "UPDATE_BLOCKED"
    | "CANCEL_ATTEMPT"
    | "CANCEL_SUCCESS"
    | "CANCEL_BLOCKED"
    | "INTEGRITY_ERROR";
  attemptedData?: Prisma.JsonValue;
  ipAddress: string | null;
}) {
  await prisma.betAuditLog.create({
    data: {
      userId: args.userId,
      betId: args.betId,
      action: args.action,
      attemptedData: args.attemptedData ?? undefined,
      ipAddress: args.ipAddress,
    },
  });
}

function hasCsrfProtection(
  reqOrigin: string | undefined,
  reqReferer: string | undefined,
) {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    return true;
  }

  try {
    const frontendOrigin = new URL(frontendUrl).origin;
    const origin = reqOrigin ? new URL(reqOrigin).origin : null;
    const refererOrigin = reqReferer ? new URL(reqReferer).origin : null;

    return origin === frontendOrigin || refererOrigin === frontendOrigin;
  } catch {
    return false;
  }
}

function mapSelectionStatus(status: BetStatus, eventStatus: string) {
  if (status === "WON") {
    return "won" as const;
  }

  if (status === "LOST") {
    return "lost" as const;
  }

  if (status === "VOID") {
    return "cancelled" as const;
  }

  if (eventStatus === "LIVE") {
    return "live" as const;
  }

  return "pending" as const;
}

myBetsRouter.use("/my-bets", authenticate);

myBetsRouter.get("/my-bets", myBetsListRateLimiter, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsedQuery = listQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ message: "Invalid my-bets query." });
    }

    const hideLost =
      parsedQuery.data.hideLost === true ||
      parsedQuery.data.hideLost === "true";

    const page = parsedQuery.data.page;
    const pageSize = 20;

    const dateWindow = getDateFilterWindow(parsedQuery.data.filter);

    const where: Prisma.BetWhereInput = {
      userId,
      betType: tabToBetType[parsedQuery.data.tab],
      ...(parsedQuery.data.filter === "open"
        ? { status: { in: ["PENDING"] } }
        : {}),
      ...(dateWindow ? { placedAt: { gte: dateWindow } } : {}),
      ...(hideLost ? { status: { not: "LOST" } } : {}),
    };

    const [bets, total] = await Promise.all([
      prisma.bet.findMany({
        where,
        select: {
          id: true,
          betCode: true,
          status: true,
          stake: true,
          displayOdds: true,
          potentialPayout: true,
          placedAt: true,
          isPromoted: true,
          cancelledAt: true,
          event: {
            select: {
              commenceTime: true,
              status: true,
            },
          },
        },
        orderBy: { placedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bet.count({ where }),
    ]);

    const now = new Date();

    const items = await Promise.all(
      bets.map(async (bet) => {
        const computedPayout = computePossiblePayout(
          bet.stake,
          bet.displayOdds,
        );

        if (Math.abs(computedPayout - bet.potentialPayout) > 0.01) {
          await createAuditLog({
            userId,
            betId: bet.id,
            action: "INTEGRITY_ERROR",
            attemptedData: {
              storedPayout: bet.potentialPayout,
              computedPayout,
            },
            ipAddress: getClientIp(req.ip),
          });
          console.error("[MyBets] Data integrity error", {
            userId,
            betId: bet.id,
            storedPayout: bet.potentialPayout,
            computedPayout,
          });
        }

        const status = toClientStatus({
          status: bet.status,
          isPromoted: bet.isPromoted,
          cancelledAt: bet.cancelledAt,
        });

        const cancellableUntil = getCancellableUntil(bet.placedAt);

        return {
          id: bet.id,
          bet_code: bet.betCode,
          status,
          amount: bet.stake,
          possible_payout: computedPayout,
          total_odds: bet.displayOdds,
          selections_count: 1,
          placed_at: bet.placedAt.toISOString(),
          cancellable_until: cancellableUntil.toISOString(),
          is_cancellable: isCancellable({
            status: bet.status,
            placedAt: bet.placedAt,
            matchStart: bet.event.commenceTime,
            now,
            cancelledAt: bet.cancelledAt,
          }),
          is_live: bet.event.status === "LIVE",
        };
      }),
    );

    return res.status(200).json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      tab: parsedQuery.data.tab,
      filter: parsedQuery.data.filter,
      hideLost,
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

myBetsRouter.get(
  "/my-bets/:betId",
  myBetDetailRateLimiter,
  async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const parsedBetId = betIdSchema.safeParse(req.params.betId);
      if (!parsedBetId.success) {
        return res.status(400).json({ message: "Invalid bet id." });
      }

      const bet = await prisma.bet.findUnique({
        where: { id: parsedBetId.data },
        select: {
          id: true,
          betCode: true,
          userId: true,
          eventId: true,
          status: true,
          betType: true,
          marketType: true,
          side: true,
          stake: true,
          displayOdds: true,
          potentialPayout: true,
          placedAt: true,
          cancelledAt: true,
          isPromoted: true,
          selectionsSnapshot: true,
          event: {
            select: {
              homeTeam: true,
              awayTeam: true,
              homeScore: true,
              awayScore: true,
              status: true,
              commenceTime: true,
            },
          },
        },
      });

      if (!bet) {
        return res.status(404).json({ message: "Bet not found." });
      }

      if (bet.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const computedPayout = computePossiblePayout(bet.stake, bet.displayOdds);
      if (Math.abs(computedPayout - bet.potentialPayout) > 0.01) {
        await createAuditLog({
          userId,
          betId: bet.id,
          action: "INTEGRITY_ERROR",
          attemptedData: {
            storedPayout: bet.potentialPayout,
            computedPayout,
          },
          ipAddress: getClientIp(req.ip),
        });
      }

      const rawSelections = Array.isArray(bet.selectionsSnapshot)
        ? bet.selectionsSnapshot
        : [];

      const fallbackSelection = {
        eventId: bet.eventId,
        homeTeam: bet.event.homeTeam,
        awayTeam: bet.event.awayTeam,
        marketType: bet.marketType,
        side: bet.side,
        odds: bet.displayOdds,
      };

      const selections = (
        rawSelections.length ? rawSelections : [fallbackSelection]
      ).map((selection) => {
        const typedSelection = (
          typeof selection === "object" && selection !== null ? selection : {}
        ) as Record<string, unknown>;

        return {
          event_id:
            typeof typedSelection.eventId === "string"
              ? typedSelection.eventId
              : bet.id,
          home_team:
            typeof typedSelection.homeTeam === "string"
              ? typedSelection.homeTeam
              : bet.event.homeTeam,
          away_team:
            typeof typedSelection.awayTeam === "string"
              ? typedSelection.awayTeam
              : bet.event.awayTeam,
          market_type:
            typeof typedSelection.marketType === "string"
              ? typedSelection.marketType
              : bet.marketType,
          pick:
            typeof typedSelection.side === "string"
              ? typedSelection.side
              : bet.side,
          odds:
            typeof typedSelection.odds === "number"
              ? typedSelection.odds
              : bet.displayOdds,
          ft_result:
            bet.event.homeScore !== null && bet.event.awayScore !== null
              ? `${bet.event.homeScore}:${bet.event.awayScore}`
              : null,
          status: mapSelectionStatus(bet.status, bet.event.status),
          live_score:
            bet.event.status === "LIVE" &&
            bet.event.homeScore !== null &&
            bet.event.awayScore !== null
              ? `${bet.event.homeScore}:${bet.event.awayScore}`
              : null,
        };
      });

      const won = selections.filter(
        (selection) => selection.status === "won",
      ).length;
      const lost = selections.filter(
        (selection) => selection.status === "lost",
      ).length;
      const tied = selections.length - won - lost;

      return res.status(200).json({
        id: bet.id,
        bet_code: bet.betCode,
        status: toClientStatus({
          status: bet.status,
          isPromoted: bet.isPromoted,
          cancelledAt: bet.cancelledAt,
        }),
        amount: bet.stake,
        possible_payout: computedPayout,
        total_odds: bet.displayOdds,
        placed_at: bet.placedAt.toISOString(),
        promoted_text: bet.isPromoted
          ? `Promoted Bet placed at ${bet.placedAt.toLocaleTimeString()}`
          : null,
        wlt: {
          won,
          lost,
          tie: tied,
        },
        selections,
      });
    } catch (error) {
      next(error);
    }
  },
);

myBetsRouter.post(
  "/my-bets/:betId/cancel",
  cancelBetRateLimiter,
  async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const parsedBetId = betIdSchema.safeParse(req.params.betId);
      if (!parsedBetId.success) {
        return res.status(400).json({ message: "Invalid bet id." });
      }

      const csrfToken = req.headers["x-csrf-token"];
      const csrfSecret = process.env.CSRF_SECRET?.trim();
      const reqOrigin =
        typeof req.headers.origin === "string" ? req.headers.origin : undefined;
      const reqReferer =
        typeof req.headers.referer === "string"
          ? req.headers.referer
          : undefined;

      const csrfHeaderValid =
        typeof csrfToken === "string" && csrfToken.trim().length > 0;
      if (!csrfHeaderValid || !hasCsrfProtection(reqOrigin, reqReferer)) {
        return res.status(403).json({ message: "CSRF validation failed" });
      }

      if (csrfSecret && csrfToken !== csrfSecret) {
        return res.status(403).json({ message: "CSRF validation failed" });
      }

      const bet = await prisma.bet.findUnique({
        where: { id: parsedBetId.data },
        select: {
          id: true,
          betCode: true,
          userId: true,
          status: true,
          stake: true,
          placedAt: true,
          cancelledAt: true,
          event: {
            select: {
              commenceTime: true,
            },
          },
        },
      });

      if (!bet) {
        return res.status(404).json({ message: "Bet not found." });
      }

      if (bet.userId !== userId) {
        await createAuditLog({
          userId,
          betId: bet.id,
          action: "CANCEL_BLOCKED",
          attemptedData: { reason: "ownership_mismatch" },
          ipAddress: getClientIp(req.ip),
        });
        return res.status(403).json({ message: "Forbidden" });
      }

      await createAuditLog({
        userId,
        betId: bet.id,
        action: "CANCEL_ATTEMPT",
        attemptedData: { status: bet.status },
        ipAddress: getClientIp(req.ip),
      });

      const now = new Date();
      const cancellationWindowOpen = getCancellableUntil(bet.placedAt) > now;
      if (!cancellationWindowOpen) {
        await createAuditLog({
          userId,
          betId: bet.id,
          action: "CANCEL_BLOCKED",
          attemptedData: { reason: "window_expired" },
          ipAddress: getClientIp(req.ip),
        });
        return res.status(403).json({
          message: "Cancellation window has expired",
        });
      }

      if (bet.event.commenceTime <= now) {
        await createAuditLog({
          userId,
          betId: bet.id,
          action: "CANCEL_BLOCKED",
          attemptedData: { reason: "match_started" },
          ipAddress: getClientIp(req.ip),
        });
        return res.status(403).json({
          message: "Bet cancellation is blocked after match start",
        });
      }

      if (bet.status !== "PENDING" || bet.cancelledAt) {
        await createAuditLog({
          userId,
          betId: bet.id,
          action: "CANCEL_BLOCKED",
          attemptedData: { reason: "already_settled" },
          ipAddress: getClientIp(req.ip),
        });
        return res.status(403).json({
          message: "Only open bets can be cancelled",
        });
      }

      const refundAmount = Math.round(bet.stake);

      const result = await prisma.$transaction(async (tx) => {
        const wallet = await getOrCreateWallet(userId, tx);
        await tx.bet.update({
          where: { id: bet.id },
          data: {
            status: "VOID",
            cancelledAt: now,
            cancelReason: "USER_CANCELLED",
            settledAt: now,
            lastStatusChangeAt: now,
          },
        });

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: refundAmount,
            },
          },
          select: {
            balance: true,
          },
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            userId,
            walletId: wallet.id,
            type: "REFUND",
            status: "COMPLETED",
            amount: refundAmount,
            currency: "KES",
            channel: "betting",
            reference: `BET-CANCEL-${bet.id}`,
            description: `Cancelled bet ${bet.betCode}`,
          },
        });

        return {
          balance: updatedWallet.balance,
          transactionId: transaction.id,
        };
      });

      await createAuditLog({
        userId,
        betId: bet.id,
        action: "CANCEL_SUCCESS",
        attemptedData: { refunded: refundAmount },
        ipAddress: getClientIp(req.ip),
      });

      emitBetUpdate(userId, {
        betId: bet.id,
        betCode: bet.betCode,
        status: "cancelled",
        placedAt: bet.placedAt.toISOString(),
        updatedAt: now.toISOString(),
        possiblePayout: 0,
      });

      emitWalletUpdate(userId, {
        transactionId: result.transactionId,
        status: "COMPLETED",
        message: "Bet cancelled and stake refunded to your wallet.",
        balance: result.balance,
        amount: refundAmount,
      });

      return res.status(200).json({
        success: true,
        message: "Bet cancelled successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

myBetsRouter.put("/my-bets/:betId", async (req, res) => {
  const userId = req.user?.id;
  const betId = req.params.betId;

  if (userId && betId) {
    await createAuditLog({
      userId,
      betId,
      action: "UPDATE_BLOCKED",
      attemptedData: req.body as Prisma.JsonValue,
      ipAddress: getClientIp(req.ip),
    }).catch(() => undefined);
  }

  return res.status(403).json({ message: "Placed bets are immutable." });
});

myBetsRouter.patch("/my-bets/:betId", async (req, res) => {
  const userId = req.user?.id;
  const betId = req.params.betId;

  if (userId && betId) {
    await createAuditLog({
      userId,
      betId,
      action: "UPDATE_BLOCKED",
      attemptedData: req.body as Prisma.JsonValue,
      ipAddress: getClientIp(req.ip),
    }).catch(() => undefined);
  }

  return res.status(403).json({ message: "Placed bets are immutable." });
});

export { myBetsRouter };
