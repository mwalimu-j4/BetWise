import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/requireAdmin";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const reportsRouter = Router();

// Validation schema for date range queries
const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(["7d", "14d", "30d", "90d", "6m", "1y", "all"]).optional(),
});

type DateRangeQuery = z.infer<typeof DateRangeSchema>;

// Helper function to calculate date range
function getDateRange(query: DateRangeQuery): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = query.endDate ? new Date(query.endDate) : new Date();
  let startDate: Date;

  if (query.startDate) {
    startDate = new Date(query.startDate);
  } else {
    switch (query.period) {
      case "7d":
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "14d":
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 14);
        break;
      case "30d":
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "6m":
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1y":
        startDate = new Date(endDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        // All time
        startDate = new Date("2020-01-01");
    }
  }

  return { startDate, endDate };
}

// ==================== ADMIN REPORTS ====================

// GET /api/reports/admin/financial - Financial overview
reportsRouter.get(
  "/admin/financial",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const query = DateRangeSchema.parse(req.query);
      const { startDate, endDate } = getDateRange(query);

      const [deposits, withdrawals, bets, transactions] = await Promise.all([
        prisma.walletTransaction.aggregate({
          where: {
            type: "DEPOSIT",
            status: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.walletTransaction.aggregate({
          where: {
            type: "WITHDRAWAL",
            status: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.bet.aggregate({
          where: {
            placedAt: { gte: startDate, lte: endDate },
          },
          _sum: { stake: true, potentialPayout: true },
          _count: true,
        }),
        prisma.walletTransaction.groupBy({
          by: ["type", "status"],
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      const totalRevenue =
        (deposits._sum.amount || 0) - (withdrawals._sum.amount || 0);

      res.json({
        period: { startDate, endDate },
        deposits: {
          count: deposits._count,
          totalAmount: deposits._sum.amount || 0,
          averageAmount:
            deposits._count > 0
              ? Math.round((deposits._sum.amount || 0) / deposits._count)
              : 0,
        },
        withdrawals: {
          count: withdrawals._count,
          totalAmount: withdrawals._sum.amount || 0,
          averageAmount:
            withdrawals._count > 0
              ? Math.round((withdrawals._sum.amount || 0) / withdrawals._count)
              : 0,
        },
        bets: {
          count: bets._count,
          totalStaked: bets._sum.stake || 0,
          totalPotentialPayout: bets._sum.potentialPayout || 0,
        },
        totalRevenue,
        transactionsByType: transactions,
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid query parameters" });
    }
  },
);

// GET /api/reports/admin/betting - Betting statistics
reportsRouter.get(
  "/admin/betting",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const query = DateRangeSchema.parse(req.query);
      const { startDate, endDate } = getDateRange(query);

      const [allBets, betsState, topMarkets] = await Promise.all([
        prisma.bet.aggregate({
          where: {
            placedAt: { gte: startDate, lte: endDate },
          },
          _sum: { stake: true, potentialPayout: true },
          _count: true,
        }),
        prisma.bet.groupBy({
          by: ["status"],
          where: {
            placedAt: { gte: startDate, lte: endDate },
          },
          _count: true,
          _sum: { stake: true, potentialPayout: true },
        }),
        prisma.bet.groupBy({
          by: ["marketType"],
          where: {
            placedAt: { gte: startDate, lte: endDate },
          },
          _count: true,
          _sum: { stake: true },
          orderBy: { _count: { status: "desc" } },
          take: 10,
        }),
      ]);

      const won = betsState.find((b) => b.status === "WON") || {
        _count: 0,
        stake: 0,
      };
      const lost = betsState.find((b) => b.status === "LOST") || {
        _count: 0,
        stake: 0,
      };
      const winRate =
        allBets._count > 0 ? (won._count / allBets._count) * 100 : 0;

      res.json({
        period: { startDate, endDate },
        totalBets: allBets._count,
        totalStaked: allBets._sum.stake || 0,
        averageStake:
          allBets._count > 0
            ? Math.round((allBets._sum.stake || 0) / allBets._count)
            : 0,
        betsByStatus: betsState,
        winLossStats: {
          won: won._count,
          lost: lost._count,
          void: betsState.find((b) => b.status === "VOID")?._count || 0,
          pending: betsState.find((b) => b.status === "PENDING")?._count || 0,
          winRate: Math.round(winRate * 100) / 100,
        },
        topMarkets: topMarkets.map((m) => ({
          marketType: m.marketType,
          count: m._count,
          totalStaked: m._sum.stake || 0,
        })),
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid query parameters" });
    }
  },
);

// GET /api/reports/admin/users - User statistics
reportsRouter.get(
  "/admin/users",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const query = DateRangeSchema.parse(req.query);
      const { startDate, endDate } = getDateRange(query);

      const [totalUsers, newUsers, activeUsers, totalBetsInRange] =
        await Promise.all([
          prisma.user.count(),
          prisma.user.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
          }),
          prisma.user.count({
            where: {
              bets: {
                some: {
                  placedAt: { gte: startDate, lte: endDate },
                },
              },
            },
          }),
          prisma.bet.count({
            where: {
              placedAt: { gte: startDate, lte: endDate },
            },
          }),
        ]);

      const topBettors = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          fullName: true,
          _count: { select: { bets: true } },
        },
        where: {
          bets: {
            some: {
              placedAt: { gte: startDate, lte: endDate },
            },
          },
        },
        orderBy: { bets: { _count: "desc" } },
        take: 10,
      });

      res.json({
        period: { startDate, endDate },
        totalUsers,
        newUsers,
        activeUsers,
        averageBetsPerActiveUser:
          activeUsers > 0 ? Math.round(totalBetsInRange / activeUsers) : 0,
        topBettors: topBettors.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.fullName,
          betCount: u._count.bets,
        })),
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid query parameters" });
    }
  },
);

// GET /api/reports/admin/risk - Risk and compliance reports
reportsRouter.get(
  "/admin/risk",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const query = DateRangeSchema.parse(req.query);
      const { startDate, endDate } = getDateRange(query);

      const [riskAlerts, alertsBySeverity, alertsByType] = await Promise.all([
        prisma.riskAlert.count({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.riskAlert.groupBy({
          by: ["severity"],
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          _count: true,
        }),
        prisma.riskAlert.groupBy({
          by: ["alertType"],
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          _count: true,
          orderBy: { _count: { status: "desc" } },
        }),
      ]);

      const recentHighRiskAlerts = await prisma.riskAlert.findMany({
        where: {
          severity: {
            in: ["HIGH", "CRITICAL"],
          },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          alertType: true,
          severity: true,
          status: true,
          createdAt: true,
          user: { select: { email: true, id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      res.json({
        period: { startDate, endDate },
        totalAlerts: riskAlerts,
        alertsBySeverity,
        alertsByType,
        recentHighRiskAlerts,
        resolutionRate: 0,
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid query parameters" });
    }
  },
);

// ==================== USER REPORTS ====================

// GET /api/reports/user/personal - User's personal betting performance
reportsRouter.get(
  "/user/personal",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const query = DateRangeSchema.parse(req.query);
      const { startDate, endDate } = getDateRange(query);

      const [bets, transactions, betsState] = await Promise.all([
        prisma.bet.aggregate({
          where: {
            userId,
            placedAt: { gte: startDate, lte: endDate },
          },
          _sum: { stake: true, potentialPayout: true },
          _count: true,
        }),
        prisma.walletTransaction.aggregate({
          where: {
            userId,
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.bet.groupBy({
          by: ["status"],
          where: {
            userId,
            placedAt: { gte: startDate, lte: endDate },
          },
          _count: true,
          _sum: { stake: true, potentialPayout: true },
        }),
      ]);

      const won = betsState.find((b) => b.status === "WON") || {
        _count: 0,
        _sum: { potentialPayout: 0 },
      };
      const lost = betsState.find((b) => b.status === "LOST") || {
        _count: 0,
        _sum: { stake: 0 },
      };

      const roi =
        bets._sum.stake && bets._sum.stake > 0
          ? Math.round(
              (((won._sum.potentialPayout || 0) - (bets._sum.stake || 0)) /
                (bets._sum.stake || 1)) *
                100,
            )
          : 0;

      res.json({
        period: { startDate, endDate },
        betting: {
          totalBets: bets._count,
          totalStaked: bets._sum.stake || 0,
          totalWon: won._sum.potentialPayout || 0,
          totalLost: lost._sum.stake || 0,
          profit: (won._sum.potentialPayout || 0) - (bets._sum.stake || 0),
          roi,
          winRate: bets._count > 0 ? (won._count / bets._count) * 100 : 0,
        },
        financial: {
          totalTransactions: transactions._count,
          totalAmount: transactions._sum.amount || 0,
        },
        detailedResults: betsState.map((b) => ({
          status: b.status,
          count: b._count,
          totalStaked: b._sum.stake || 0,
          totalPayout: b._sum.potentialPayout || 0,
        })),
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid query parameters" });
    }
  },
);

// GET /api/reports/user/recent-bets - User's recent betting activity with pagination
reportsRouter.get(
  "/user/recent-bets",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const query = DateRangeSchema.parse(req.query);
      const { startDate, endDate } = getDateRange(query);

      const [bets, total] = await Promise.all([
        prisma.bet.findMany({
          where: {
            userId,
            placedAt: { gte: startDate, lte: endDate },
          },
          select: {
            id: true,
            side: true,
            displayOdds: true,
            stake: true,
            potentialPayout: true,
            status: true,
            placedAt: true,
            settledAt: true,
            event: {
              select: {
                homeTeam: true,
                awayTeam: true,
                commenceTime: true,
              },
            },
          },
          orderBy: { placedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.bet.count({
          where: {
            userId,
            placedAt: { gte: startDate, lte: endDate },
          },
        }),
      ]);

      res.json({
        bets: bets.map((b) => ({
          ...b,
          profit: b.status === "WON" ? b.potentialPayout - b.stake : -b.stake,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid query parameters" });
    }
  },
);

// GET /api/reports/user/financial-summary - User's financial overview
reportsRouter.get(
  "/user/financial-summary",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const query = DateRangeSchema.parse(req.query);
      const { startDate, endDate } = getDateRange(query);

      const [deposits, withdrawals, walletBalance, tipTransactions] =
        await Promise.all([
          prisma.walletTransaction.aggregate({
            where: {
              userId,
              type: "DEPOSIT",
              status: "COMPLETED",
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: true,
          }),
          prisma.walletTransaction.aggregate({
            where: {
              userId,
              type: "WITHDRAWAL",
              status: "COMPLETED",
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: true,
          }),
          prisma.wallet.findUnique({
            where: { userId },
            select: { balance: true },
          }),
          prisma.walletTransaction.groupBy({
            by: ["type", "status"],
            where: {
              userId,
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: true,
          }),
        ]);

      res.json({
        period: { startDate, endDate },
        currentBalance: walletBalance?.balance || 0,
        deposits: {
          count: deposits._count,
          totalAmount: deposits._sum.amount || 0,
          averageAmount:
            deposits._count > 0
              ? Math.round((deposits._sum.amount || 0) / deposits._count)
              : 0,
        },
        withdrawals: {
          count: withdrawals._count,
          totalAmount: withdrawals._sum.amount || 0,
          averageAmount:
            withdrawals._count > 0
              ? Math.round((withdrawals._sum.amount || 0) / withdrawals._count)
              : 0,
        },
        netFlow: (deposits._sum.amount || 0) - (withdrawals._sum.amount || 0),
        transactionDetails: tipTransactions,
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid query parameters" });
    }
  },
);

export { reportsRouter };
