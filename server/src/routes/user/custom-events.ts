import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { authenticate } from "../../middleware/authenticate";

const userCustomEventsRouter = Router();

// Public endpoint - no auth needed to browse custom events
// Auth required only for placing bets

// ── GET /user/custom-events ──

userCustomEventsRouter.get("/user/custom-events", async (_req, res, next) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const events = await prisma.customEvent.findMany({
      where: {
        OR: [
          // Active events (PUBLISHED or LIVE)
          { status: { in: ["PUBLISHED", "LIVE"] } },
          // Recently finished events (within last 30 min)
          {
            status: "FINISHED",
            updatedAt: { gte: thirtyMinutesAgo },
          },
        ],
      },
      include: {
        markets: {
          include: {
            selections: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: [
        { status: "asc" }, // LIVE first
        { startTime: "asc" },
      ],
    });

    return res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
});

// ── GET /user/custom-events/:id ──

userCustomEventsRouter.get(
  "/user/custom-events/:id",
  async (req, res, next) => {
    try {
      const event = await prisma.customEvent.findFirst({
        where: {
          id: req.params.id,
          status: { in: ["PUBLISHED", "LIVE"] },
        },
        include: {
          markets: {
            where: { status: { in: ["OPEN", "SUSPENDED"] } },
            include: {
              selections: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      return res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  },
);

// ── POST /user/custom-events/:id/bet ──

const placeBetSchema = z.object({
  selectionId: z.string().uuid(),
  stake: z.number().positive().min(10, "Minimum stake is 10"),
});

userCustomEventsRouter.post(
  "/user/custom-events/:id/bet",
  authenticate,
  async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parsed = placeBetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid bet data",
          issues: parsed.error.issues,
        });
      }

      const { selectionId, stake } = parsed.data;

      // Use a transaction to prevent race conditions on balance
      const result = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // 1. Fetch and validate the selection + market + event
          const selection = await tx.customSelection.findUnique({
            where: { id: selectionId },
            include: {
              market: {
                include: {
                  event: true,
                },
              },
            },
          });

          if (!selection) {
            throw new Error("Selection not found");
          }

          if (selection.market.event.id !== req.params.id) {
            throw new Error("Selection does not belong to this event");
          }

          const event = selection.market.event;

          // Validate event status
          if (event.status !== "PUBLISHED" && event.status !== "LIVE") {
            throw new Error(
              `Betting is not available for this event (status: ${event.status})`,
            );
          }

          // Validate market is open
          if (selection.market.status !== "OPEN") {
            throw new Error(
              `This market is ${selection.market.status.toLowerCase()}`,
            );
          }

          // For pre-match betting, ensure startTime hasn't passed
          if (
            event.status === "PUBLISHED" &&
            new Date(event.startTime) <= new Date()
          ) {
            throw new Error("Pre-match betting has closed for this event");
          }

          // 2. Check user balance
          const wallet = await tx.wallet.findUnique({
            where: { userId },
          });

          if (!wallet) {
            throw new Error("Wallet not found. Please set up your wallet.");
          }

          if (wallet.balance < Math.round(stake)) {
            throw new Error(
              `Insufficient balance. You have KES ${wallet.balance} but need KES ${Math.round(stake)}`,
            );
          }

          // 3. Calculate potential win
          const potentialWin = stake * selection.odds;

          // 4. Deduct stake from wallet
          await tx.wallet.update({
            where: { userId },
            data: { balance: { decrement: Math.round(stake) } },
          });

          // 5. Create the bet
          const bet = await tx.customBet.create({
            data: {
              userId,
              eventId: event.id,
              selectionId,
              stake,
              odds: selection.odds,
              potentialWin,
            },
          });

          // 6. Get updated balance
          const updatedWallet = await tx.wallet.findUnique({
            where: { userId },
          });

          return {
            bet,
            newBalance: updatedWallet?.balance ?? 0,
            eventTitle: event.title,
            selectionName: selection.name,
          };
        },
      );

      return res.status(201).json({
        success: true,
        bet: result.bet,
        newBalance: result.newBalance,
        message: `Bet placed on ${result.selectionName} for ${result.eventTitle}`,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  },
);

export { userCustomEventsRouter };
