import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const RECENT_ACTIVITY_LIMIT = 8;
const TREND_DAYS = 7;

function formatMoney(value: number) {
  return `KES ${value.toLocaleString()}`;
}

function toAdminStatus(status: string) {
  return status.toLowerCase() as "pending" | "completed" | "failed";
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export async function getAdminDashboardSummary(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const trendStart = startOfDay(new Date(todayStart));
  trendStart.setDate(trendStart.getDate() - (TREND_DAYS - 1));

  const yesterdayStart = startOfDay(new Date(todayStart));
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const sevenDaysAgoStart = startOfDay(new Date(todayStart));
  sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 7);

  const [
    userCount,
    walletBalanceAggregate,
    pendingWithdrawals,
    completedWithdrawals,
    failedWithdrawals,
    todayDeposits,
    todayWithdrawals,
    yesterdayDeposits,
    yesterdayWithdrawals,
    sevenDayDeposits,
    sevenDayWithdrawals,
    activeUsersToday,
    activeUsersLast7Days,
    pendingWithdrawalAmount,
    averageDepositToday,
    averageWithdrawalToday,
    trendTransactions,
    recentTransactions,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.wallet.aggregate({
      _sum: { balance: true },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "PENDING" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "COMPLETED" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "FAILED" },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "DEPOSIT",
        status: "COMPLETED",
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "WITHDRAWAL",
        status: "COMPLETED",
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "DEPOSIT",
        status: "COMPLETED",
        createdAt: { gte: yesterdayStart, lt: todayStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "WITHDRAWAL",
        status: "COMPLETED",
        createdAt: { gte: yesterdayStart, lt: todayStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "DEPOSIT",
        status: "COMPLETED",
        createdAt: { gte: sevenDaysAgoStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "WITHDRAWAL",
        status: "COMPLETED",
        createdAt: { gte: sevenDaysAgoStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.walletTransaction.findMany({
      where: { createdAt: { gte: sevenDaysAgoStart } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.walletTransaction.aggregate({
      where: { type: "WITHDRAWAL", status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "DEPOSIT",
        status: "COMPLETED",
        createdAt: { gte: todayStart },
      },
      _avg: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "WITHDRAWAL",
        status: "COMPLETED",
        createdAt: { gte: todayStart },
      },
      _avg: { amount: true },
    }),
    prisma.walletTransaction.findMany({
      where: {
        status: "COMPLETED",
        type: { in: ["DEPOSIT", "WITHDRAWAL"] },
        createdAt: { gte: trendStart },
      },
      select: {
        type: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.walletTransaction.findMany({
      where: {
        type: { in: ["DEPOSIT", "WITHDRAWAL"] },
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_ACTIVITY_LIMIT,
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    }),
  ]);

  const trendByDate = new Map<
    string,
    {
      period: string;
      deposits: number;
      withdrawals: number;
    }
  >();

  for (let offset = 0; offset < TREND_DAYS; offset += 1) {
    const date = new Date(trendStart);
    date.setDate(trendStart.getDate() + offset);
    const key = formatDateKey(date);

    trendByDate.set(key, {
      period: date.toLocaleDateString("en-KE", { weekday: "short" }),
      deposits: 0,
      withdrawals: 0,
    });
  }

  for (const transaction of trendTransactions) {
    const key = formatDateKey(transaction.createdAt);
    const row = trendByDate.get(key);

    if (!row) {
      continue;
    }

    if (transaction.type === "DEPOSIT") {
      row.deposits += transaction.amount;
    }

    if (transaction.type === "WITHDRAWAL") {
      row.withdrawals += transaction.amount;
    }
  }

  const todayDepositTotal = todayDeposits._sum.amount ?? 0;
  const todayWithdrawalTotal = todayWithdrawals._sum.amount ?? 0;
  const yesterdayDepositTotal = yesterdayDeposits._sum.amount ?? 0;
  const yesterdayWithdrawalTotal = yesterdayWithdrawals._sum.amount ?? 0;
  const netFlowToday = todayDepositTotal - todayWithdrawalTotal;
  const netFlowYesterday = yesterdayDepositTotal - yesterdayWithdrawalTotal;
  const flowChange =
    netFlowYesterday === 0
      ? netFlowToday === 0
        ? 0
        : 100
      : ((netFlowToday - netFlowYesterday) / Math.abs(netFlowYesterday)) * 100;

  const sevenDayDepositTotal = sevenDayDeposits._sum.amount ?? 0;
  const sevenDayWithdrawalTotal = sevenDayWithdrawals._sum.amount ?? 0;

  const averageDeposit = Math.round(averageDepositToday._avg.amount ?? 0);
  const averageWithdrawal = Math.round(averageWithdrawalToday._avg.amount ?? 0);

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    metrics: [
      {
        label: "Total Users",
        value: userCount.toLocaleString(),
        tone: "blue" as const,
        helper: `${activeUsersLast7Days.length.toLocaleString()} active in last 7 days`,
      },
      {
        label: "Platform Float",
        value: formatMoney(walletBalanceAggregate._sum.balance ?? 0),
        tone: "accent" as const,
        helper: `${activeUsersToday.length.toLocaleString()} active users today`,
      },
      {
        label: "Pending Withdrawals",
        value: pendingWithdrawals.toLocaleString(),
        tone: "gold" as const,
        helper: formatMoney(pendingWithdrawalAmount._sum.amount ?? 0),
      },
      {
        label: "Net Flow Today",
        value: formatMoney(netFlowToday),
        tone: netFlowToday >= 0 ? ("accent" as const) : ("red" as const),
        helper: `${flowChange >= 0 ? "+" : ""}${flowChange.toFixed(1)}% vs yesterday`,
      },
      {
        label: "Completed Withdrawals",
        value: completedWithdrawals.toLocaleString(),
        tone: "accent" as const,
        helper: `${failedWithdrawals.toLocaleString()} failed/rejected`,
      },
      {
        label: "Deposits Today",
        value: formatMoney(todayDeposits._sum.amount ?? 0),
        tone: "blue" as const,
        helper:
          averageDeposit > 0
            ? `Avg ticket ${formatMoney(averageDeposit)}`
            : "No completed deposits yet",
      },
      {
        label: "Withdrawals Today",
        value: formatMoney(todayWithdrawals._sum.amount ?? 0),
        tone: failedWithdrawals > 0 ? ("red" as const) : ("accent" as const),
        helper:
          averageWithdrawal > 0
            ? `Avg payout ${formatMoney(averageWithdrawal)}`
            : "No completed withdrawals yet",
      },
    ],
    charts: {
      depositWithdrawalTrend: Array.from(trendByDate.values()),
      totals: {
        deposits7d: sevenDayDepositTotal,
        withdrawals7d: sevenDayWithdrawalTotal,
      },
    },
    recentTransactions: recentTransactions.map((transaction) => {
      const fee =
        transaction.type === "WITHDRAWAL"
          ? ((transaction.providerCallback as { fee?: number } | null)?.fee ??
            0)
          : 0;
      const totalDebit =
        transaction.type === "WITHDRAWAL"
          ? ((transaction.providerCallback as { totalDebit?: number } | null)
              ?.totalDebit ?? transaction.amount)
          : transaction.amount;

      return {
        id: transaction.id,
        reference:
          transaction.providerReceiptNumber ??
          transaction.checkoutRequestId ??
          transaction.reference,
        mpesaCode: transaction.providerReceiptNumber,
        userEmail: transaction.user.email,
        userPhone: transaction.user.phone,
        type: transaction.type.toLowerCase(),
        amount: transaction.amount,
        fee,
        totalDebit,
        status: toAdminStatus(transaction.status),
        createdAt: transaction.createdAt.toISOString(),
        channel: transaction.channel,
      };
    }),
  });
}

export async function getAllUsers(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { search = "", status = "", page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};

  if (search) {
    where.OR = [
      { email: { contains: String(search), mode: "insensitive" } },
      { fullName: { contains: String(search), mode: "insensitive" } },
      { phone: { contains: String(search), mode: "insensitive" } },
    ];
  }

  if (status === "suspended") {
    where.accountStatus = "SUSPENDED";
  } else if (status === "banned") {
    where.bannedAt = { not: null };
  } else if (status === "active") {
    where.accountStatus = "ACTIVE";
    where.bannedAt = null;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER", ...where },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isVerified: true,
        accountStatus: true,
        bannedAt: true,
        createdAt: true,
        updatedAt: true,
        wallet: {
          select: { balance: true },
        },
        transactions: {
          select: { id: true },
        },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { role: "USER", ...where } }),
  ]);

  const formattedUsers = users.map((user) => ({
    id: user.id,
    name: user.fullName || "Unknown",
    email: user.email,
    phone: user.phone,
    balance: user.wallet?.balance ?? 0,
    isVerified: user.isVerified,
    status:
      user.bannedAt !== null
        ? "banned"
        : user.accountStatus === "SUSPENDED"
          ? "suspended"
          : "active",
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    totalBets: user.transactions.length,
  }));

  return res.status(200).json({
    users: formattedUsers,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  });
}

export async function getUserDetails(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      isVerified: true,
      accountStatus: true,
      bannedAt: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      wallet: {
        select: { balance: true },
      },
      transactions: {
        select: { id: true, type: true, amount: true, status: true },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    id: user.id,
    name: user.fullName || "Unknown",
    email: user.email,
    phone: user.phone,
    balance: user.wallet?.balance ?? 0,
    isVerified: user.isVerified,
    status:
      user.bannedAt !== null
        ? "banned"
        : user.accountStatus === "SUSPENDED"
          ? "suspended"
          : "active",
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    totalBets: user.transactions.length,
    bannedAt: user.bannedAt?.toISOString() || null,
  });
}

export async function banUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { userId } = req.params;
  const { reason } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.bannedAt) {
    return res.status(400).json({ message: "User is already banned" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      bannedAt: new Date(),
      accountStatus: "SUSPENDED",
    },
    select: {
      id: true,
      email: true,
      bannedAt: true,
    },
  });

  return res.status(200).json({
    message: "User banned successfully",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      bannedAt: updatedUser.bannedAt?.toISOString(),
    },
  });
}

export async function unbanUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!user.bannedAt) {
    return res.status(400).json({ message: "User is not banned" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      bannedAt: null,
      accountStatus: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      bannedAt: true,
    },
  });

  return res.status(200).json({
    message: "User unbanned successfully",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      bannedAt: updatedUser.bannedAt?.toISOString() || null,
    },
  });
}

export async function suspendUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { userId } = req.params;
  const { reason } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.accountStatus === "SUSPENDED") {
    return res.status(400).json({ message: "User is already suspended" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: "SUSPENDED",
    },
    select: {
      id: true,
      email: true,
      accountStatus: true,
    },
  });

  return res.status(200).json({
    message: "User suspended successfully",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      accountStatus: updatedUser.accountStatus,
    },
  });
}

export async function unsuspendUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.accountStatus !== "SUSPENDED") {
    return res.status(400).json({ message: "User is not suspended" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      accountStatus: true,
    },
  });

  return res.status(200).json({
    message: "User unsuspended successfully",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      accountStatus: updatedUser.accountStatus,
    },
  });
}
