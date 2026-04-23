import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getOrCreateWallet } from "../lib/wallet";
import { emitBetUpdate, emitWalletUpdate } from "../lib/socket";
import {
  createBetSettlementNotification,
  createEventEndedAdminNotification,
} from "../controllers/notifications.controller";

export type MarketOutcome = "WON" | "LOST" | "VOID" | "PENDING";

type BetWithEvent = Prisma.BetGetPayload<{
  include: { event: true };
}>;

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function extractNumericValue(value: string) {
  const match = value.match(/([+-]?\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : null;
}

function compareWithPush(candidate: number, opponent: number): MarketOutcome {
  if (candidate > opponent) return "WON";
  if (candidate < opponent) return "LOST";
  return "VOID";
}

export class BetSettlementService {
  static async reconcilePendingBetsForClosedEvents(args?: { userId?: string }) {
    const pendingBets = await prisma.bet.findMany({
      where: {
        status: "PENDING",
        ...(args?.userId ? { userId: args.userId } : {}),
        event: {
          status: { in: ["FINISHED", "CANCELLED"] },
        },
      },
      select: {
        eventId: true,
        event: {
          select: {
            status: true,
            homeScore: true,
            awayScore: true,
          },
        },
      },
      distinct: ["eventId"],
    });

    for (const bet of pendingBets) {
      if (bet.event.status === "CANCELLED") {
        await this.refundBetsForEvent(bet.eventId, "Reconciled after event cancellation");
        continue;
      }

      if (bet.event.homeScore !== null && bet.event.awayScore !== null) {
        await this.settleBetsForEvent(bet.eventId, bet.event.homeScore, bet.event.awayScore);
      }
    }
  }

  static async settleBetsForEvent(eventId: string, homeScore: number, awayScore: number) {
    console.log(
      `[Settlement] Starting settlement for event ${eventId} (Scores: ${homeScore} - ${awayScore})`,
    );

    const pendingBets = await prisma.bet.findMany({
      where: {
        eventId,
        status: "PENDING",
      },
      include: {
        event: true,
      },
    });

    if (pendingBets.length === 0) {
      console.log(`[Settlement] No pending bets for event ${eventId}`);
      return;
    }

    let settledCount = 0;
    let wonCount = 0;
    let totalStake = 0;

    for (const bet of pendingBets) {
      try {
        const outcome = this.evaluateBetOutcome(bet, homeScore, awayScore);
        if (outcome === "PENDING") {
          continue;
        }

        await this.processBetSettlement(bet, outcome);
        settledCount += 1;
        totalStake += bet.stake;

        if (outcome === "WON") {
          wonCount += 1;
        }
      } catch (error) {
        console.error(`[Settlement] Failed to settle bet ${bet.id}:`, error);
      }
    }

    console.log(
      `[Settlement] Finished settlement for event ${eventId}. Settled: ${settledCount}, Won: ${wonCount}`,
    );

    const firstBet = pendingBets[0];
    const eventName = `${firstBet.event.homeTeam} vs ${firstBet.event.awayTeam}`;

    void createEventEndedAdminNotification({
      eventName,
      eventType: "sport",
      pendingBetsCount: pendingBets.length - settledCount,
      totalBetsCount: pendingBets.length,
      totalStaked: totalStake,
      eventId: firstBet.eventId,
    });
  }

  static async refundBetsForEvent(eventId: string, reason: string) {
    const pendingBets = await prisma.bet.findMany({
      where: {
        eventId,
        status: "PENDING",
      },
      include: {
        event: true,
      },
    });

    if (pendingBets.length === 0) {
      return;
    }

    for (const bet of pendingBets) {
      await this.processBetSettlement(bet, "VOID");
    }

    const firstBet = pendingBets[0];
    void createEventEndedAdminNotification({
      eventName: `${firstBet.event.homeTeam} vs ${firstBet.event.awayTeam}`,
      eventType: "sport",
      pendingBetsCount: 0,
      totalBetsCount: pendingBets.length,
      totalStaked: pendingBets.reduce((sum, bet) => sum + bet.stake, 0),
      eventId,
    });

    console.log(`[Settlement] Refunded ${pendingBets.length} bets for event ${eventId}. Reason: ${reason}`);
  }

  private static evaluateBetOutcome(
    bet: BetWithEvent,
    homeScore: number,
    awayScore: number,
  ): MarketOutcome {
    const marketType = normalize(bet.marketType);
    const side = bet.side.trim();
    const normalizedSide = normalize(side);
    const totalScore = homeScore + awayScore;
    const homeTeam = normalize(bet.event.homeTeam);
    const awayTeam = normalize(bet.event.awayTeam);

    switch (marketType) {
      case "h2h":
        if (normalizedSide === homeTeam || normalizedSide === "1" || normalizedSide === "home") {
          return homeScore > awayScore ? "WON" : "LOST";
        }
        if (normalizedSide === awayTeam || normalizedSide === "2" || normalizedSide === "away") {
          return awayScore > homeScore ? "WON" : "LOST";
        }
        if (normalizedSide === "x" || normalizedSide === "draw" || normalizedSide === "tie") {
          return homeScore === awayScore ? "WON" : "LOST";
        }
        return "PENDING";

      case "totals": {
        const threshold = this.resolveMarketPoint(bet);
        if (threshold === null) {
          return "PENDING";
        }

        if (normalizedSide.includes("over")) {
          return compareWithPush(totalScore, threshold);
        }

        if (normalizedSide.includes("under")) {
          return compareWithPush(threshold, totalScore);
        }

        return "PENDING";
      }

      case "spreads": {
        const handicap = this.resolveMarketPoint(bet);
        if (handicap === null) {
          return "PENDING";
        }

        if (normalizedSide.includes(homeTeam) || normalizedSide.startsWith("1") || normalizedSide.includes("home")) {
          return compareWithPush(homeScore + handicap, awayScore);
        }

        if (normalizedSide.includes(awayTeam) || normalizedSide.startsWith("2") || normalizedSide.includes("away")) {
          return compareWithPush(awayScore + handicap, homeScore);
        }

        return "PENDING";
      }

      case "btts": {
        const bothTeamsScored = homeScore > 0 && awayScore > 0;
        if (normalizedSide === "yes") {
          return bothTeamsScored ? "WON" : "LOST";
        }
        if (normalizedSide === "no") {
          return bothTeamsScored ? "LOST" : "WON";
        }
        return "PENDING";
      }

      case "draw_no_bet":
        if (homeScore === awayScore) {
          return "VOID";
        }

        if (normalizedSide === homeTeam || normalizedSide === "1" || normalizedSide === "home") {
          return homeScore > awayScore ? "WON" : "LOST";
        }

        if (normalizedSide === awayTeam || normalizedSide === "2" || normalizedSide === "away") {
          return awayScore > homeScore ? "WON" : "LOST";
        }

        return "PENDING";

      default:
        console.warn(`[Settlement] Unknown market type: ${bet.marketType}`);
        return "PENDING";
    }
  }

  private static resolveMarketPoint(bet: BetWithEvent) {
    const parsedFromSide = extractNumericValue(bet.side);
    if (parsedFromSide !== null) {
      return parsedFromSide;
    }

    const rawData = bet.event.rawData;
    if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
      return null;
    }

    const bookmakers = (rawData as { bookmakers?: unknown }).bookmakers;
    if (!Array.isArray(bookmakers)) {
      return null;
    }

    const matchingBookmaker = bookmakers.find((bookmaker) => {
      if (!bookmaker || typeof bookmaker !== "object") return false;
      const row = bookmaker as { key?: unknown };
      return typeof row.key === "string" && row.key === bet.bookmakerId;
    });

    if (!matchingBookmaker || typeof matchingBookmaker !== "object") {
      return null;
    }

    const markets = (matchingBookmaker as { markets?: unknown }).markets;
    if (!Array.isArray(markets)) {
      return null;
    }

    const matchingMarket = markets.find((market) => {
      if (!market || typeof market !== "object") return false;
      const row = market as { key?: unknown };
      return typeof row.key === "string" && normalize(row.key) === normalize(bet.marketType);
    });

    if (!matchingMarket || typeof matchingMarket !== "object") {
      return null;
    }

    const outcomes = (matchingMarket as { outcomes?: unknown }).outcomes;
    if (!Array.isArray(outcomes)) {
      return null;
    }

    const matchingOutcome = outcomes.find((outcome) => {
      if (!outcome || typeof outcome !== "object") return false;
      const row = outcome as { name?: unknown };
      return typeof row.name === "string" && normalize(row.name) === normalize(bet.side);
    });

    if (!matchingOutcome || typeof matchingOutcome !== "object") {
      return null;
    }

    const point = (matchingOutcome as { point?: unknown }).point;
    return typeof point === "number" && Number.isFinite(point) ? point : null;
  }

  private static toRealtimeStatus(outcome: MarketOutcome): "won" | "lost" | "cancelled" {
    if (outcome === "WON") return "won";
    if (outcome === "LOST") return "lost";
    return "cancelled";
  }

  private static async processBetSettlement(bet: BetWithEvent, outcome: Exclude<MarketOutcome, "PENDING">) {
    const now = new Date();

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.bet.update({
        where: { id: bet.id },
        data: {
          status: outcome,
          settledAt: now,
          lastStatusChangeAt: now,
        },
      });

      if (outcome === "WON") {
        const wallet = await getOrCreateWallet(bet.userId, tx);
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: Math.round(bet.potentialPayout),
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
            amount: Math.round(bet.potentialPayout),
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

      if (outcome === "VOID") {
        const wallet = await getOrCreateWallet(bet.userId, tx);
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
            description: `Refund for voided bet ${bet.betCode}`,
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
      status: this.toRealtimeStatus(outcome),
      placedAt: bet.placedAt.toISOString(),
      updatedAt: now.toISOString(),
      possiblePayout: outcome === "WON" ? bet.potentialPayout : outcome === "VOID" ? bet.stake : 0,
    });

    if (result) {
      emitWalletUpdate(bet.userId, {
        transactionId: result.transactionId,
        status: "COMPLETED",
        message:
          outcome === "WON"
            ? "Winning payout credited to your wallet."
            : "Stake refunded to your wallet.",
        balance: result.balance,
        amount: outcome === "WON" ? Math.round(bet.potentialPayout) : Math.round(bet.stake),
      });
    }

    void createBetSettlementNotification({
      userId: bet.userId,
      betCode: bet.betCode,
      eventName: `${bet.event.homeTeam} vs ${bet.event.awayTeam}`,
      stake: bet.stake,
      potentialPayout: bet.potentialPayout,
      status: outcome,
    });
  }
}
