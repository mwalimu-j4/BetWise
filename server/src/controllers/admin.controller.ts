import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
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

const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional().nullable(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(9).max(20).optional(),
  isVerified: z.boolean().optional(),
  accountStatus: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional().nullable(),
  email: z.string().trim().email(),
  phone: z.string().trim(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  isVerified: z.boolean().optional(),
  accountStatus: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

const bettingAnalyticsRangeSchema = z.enum(["24h", "7d", "30d", "90d"]);

function normalizeKenyanPhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }

  if (digits.startsWith("254") && digits.length === 12) {
    return `+${digits}`;
  }

  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) {
    return `+254${digits}`;
  }

  return null;
}

function getAnalyticsWindow(range: "24h" | "7d" | "30d" | "90d") {
  const end = new Date();
  const start = new Date(end);

  if (range === "24h") {
    start.setHours(start.getHours() - 23, 0, 0, 0);
    return { start, end, granularity: "hour" as const };
  }

  const days = range === "7d" ? 6 : range === "30d" ? 29 : 89;
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  return { start, end, granularity: "day" as const };
}

function formatAnalyticsPeriod(date: Date, granularity: "hour" | "day") {
  if (granularity === "hour") {
    return date.toLocaleTimeString("en-KE", {
      hour: "2-digit",
      hour12: false,
    });
  }

  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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

export async function getBettingAnalytics(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const parsedRange = bettingAnalyticsRangeSchema.safeParse(req.query.range ?? "7d");
  const range = parsedRange.success ? parsedRange.data : "7d";
  const { start, end, granularity } = getAnalyticsWindow(range);

  const transactions = await prisma.walletTransaction.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      type: { in: ["BET_STAKE", "BET_WIN", "REFUND"] },
      status: { in: ["COMPLETED", "PENDING", "FAILED", "REVERSED"] },
    },
    select: {
      type: true,
      amount: true,
      createdAt: true,
      userId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const totalStake = transactions
    .filter((transaction) => transaction.type === "BET_STAKE")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalPayout = transactions
    .filter((transaction) => transaction.type === "BET_WIN")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalRefunds = transactions
    .filter((transaction) => transaction.type === "REFUND")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const betCount = transactions.filter((transaction) => transaction.type === "BET_STAKE")
    .length;
  const activeBettorIds = new Set(transactions.map((transaction) => transaction.userId));
  const ggr = totalStake - totalPayout - totalRefunds;
  const avgStake = betCount > 0 ? totalStake / betCount : 0;
  const payoutRatio = totalStake > 0 ? (totalPayout / totalStake) * 100 : 0;

  const bins = new Map<
    string,
    { period: string; stake: number; payout: number; refunds: number; ggr: number }
  >();

  const stepDate = new Date(start);
  if (granularity === "hour") {
    for (let offset = 0; offset < 24; offset += 1) {
      const current = new Date(stepDate);
      current.setHours(stepDate.getHours() + offset);
      const key = current.toISOString().slice(0, 13);
      bins.set(key, {
        period: formatAnalyticsPeriod(current, granularity),
        stake: 0,
        payout: 0,
        refunds: 0,
        ggr: 0,
      });
    }
  } else {
    const totalDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
    for (let offset = 0; offset < totalDays; offset += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + offset);
      const key = current.toISOString().slice(0, 10);
      bins.set(key, {
        period: formatAnalyticsPeriod(current, granularity),
        stake: 0,
        payout: 0,
        refunds: 0,
        ggr: 0,
      });
    }
  }

  for (const transaction of transactions) {
    const bucketKey =
      granularity === "hour"
        ? transaction.createdAt.toISOString().slice(0, 13)
        : transaction.createdAt.toISOString().slice(0, 10);
    const bucket = bins.get(bucketKey);

    if (!bucket) {
      continue;
    }

    if (transaction.type === "BET_STAKE") {
      bucket.stake += transaction.amount;
    }

    if (transaction.type === "BET_WIN") {
      bucket.payout += transaction.amount;
    }

    if (transaction.type === "REFUND") {
      bucket.refunds += transaction.amount;
    }

    bucket.ggr = bucket.stake - bucket.payout - bucket.refunds;
  }

  const trend = Array.from(bins.values());

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    range,
    metrics: [
      {
        label: "Handle",
        value: formatMoney(totalStake),
        tone: "accent" as const,
        helper: `${betCount.toLocaleString()} stake events`,
      },
      {
        label: "Payouts",
        value: formatMoney(totalPayout),
        tone: "gold" as const,
        helper: `${payoutRatio.toFixed(1)}% payout ratio`,
      },
      {
        label: "GGR",
        value: formatMoney(ggr),
        tone: ggr >= 0 ? ("blue" as const) : ("red" as const),
        helper: `${formatMoney(totalRefunds)} refunded`,
      },
      {
        label: "Active Bettors",
        value: activeBettorIds.size.toLocaleString(),
        tone: "purple" as const,
        helper: `Across ${range} window`,
      },
      {
        label: "Average Stake",
        value: formatMoney(Math.round(avgStake)),
        tone: "blue" as const,
        helper: "Per settled bet stake",
      },
      {
        label: "Refunds",
        value: formatMoney(totalRefunds),
        tone: totalRefunds > 0 ? ("red" as const) : ("muted" as const),
        helper: "Void or returned stakes",
      },
    ],
    trend,
  });
}

export async function createUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const parsedBody = createUserSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ message: "Invalid user payload." });
  }

  if (parsedBody.data.password !== parsedBody.data.confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  const normalizedPhone = normalizeKenyanPhone(parsedBody.data.phone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: "Invalid Kenyan phone number." });
  }

  const [existingEmail, existingPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsedBody.data.email } }),
    prisma.user.findUnique({ where: { phone: normalizedPhone } }),
  ]);

  if (existingEmail) {
    return res.status(409).json({ message: "Email already exists." });
  }

  if (existingPhone) {
    return res.status(409).json({ message: "Phone already exists." });
  }

  const passwordHash = await bcrypt.hash(parsedBody.data.password, 12);

  const user = await prisma.user.create({
    data: {
      fullName: parsedBody.data.fullName ?? null,
      email: parsedBody.data.email,
      phone: normalizedPhone,
      passwordHash,
      isVerified: parsedBody.data.isVerified ?? false,
      accountStatus: parsedBody.data.accountStatus ?? "ACTIVE",
      role: "USER",
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
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
  });

  return res.status(201).json({
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

export async function updateUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const userId = String(req.params.userId);
  const parsedBody = updateUserSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({ message: "Invalid user payload." });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "USER") {
    return res.status(404).json({ message: "User not found" });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName:
        parsedBody.data.fullName === undefined
          ? undefined
          : parsedBody.data.fullName,
      email: parsedBody.data.email,
      phone: parsedBody.data.phone,
      isVerified: parsedBody.data.isVerified,
      accountStatus: parsedBody.data.accountStatus,
    },
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
  });

  return res.status(200).json({
    id: updated.id,
    name: updated.fullName || "Unknown",
    email: updated.email,
    phone: updated.phone,
    balance: updated.wallet?.balance ?? 0,
    isVerified: updated.isVerified,
    status:
      updated.bannedAt !== null
        ? "banned"
        : updated.accountStatus === "SUSPENDED"
          ? "suspended"
          : "active",
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    totalBets: updated.transactions.length,
  });
}

export async function getUserDetails(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const userId = String(req.params.userId);

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

  const userId = String(req.params.userId);
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

  const userId = String(req.params.userId);

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

  const userId = String(req.params.userId);
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

  const userId = String(req.params.userId);

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

// Get admin payments (deposits and transactions)
export async function getAdminPayments(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const limit = parseInt(String(req.query.limit ?? 50), 10);
  const offset = parseInt(String(req.query.offset ?? 0), 10);
  const status = String(req.query.status ?? "");
  const type = String(req.query.type ?? "");

  const whereFilters: any = {
    type: { in: ["DEPOSIT", "WITHDRAWAL"] },
  };

  if (status && ["PENDING", "COMPLETED", "FAILED", "REVERSED"].includes(status)) {
    whereFilters.status = status;
  }

  if (type && ["DEPOSIT", "WITHDRAWAL"].includes(type)) {
    whereFilters.type = type;
  }

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: whereFilters,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
          },
        },
      },
    }),
    prisma.walletTransaction.count({ where: whereFilters }),
  ]);

  const formattedTransactions = transactions.map((transaction) => ({
    id: transaction.id,
    userId: transaction.userId,
    userEmail: transaction.user.email,
    userPhone: transaction.user.phone,
    userName: transaction.user.fullName,
    type: transaction.type.toLowerCase(),
    amount: transaction.amount,
    status: transaction.status.toLowerCase(),
    reference:
      transaction.providerReceiptNumber ??
      transaction.checkoutRequestId ??
      transaction.reference,
    channel: transaction.channel,
    mpesaCode: transaction.providerReceiptNumber,
    phone: transaction.phone,
    createdAt: transaction.createdAt.toISOString(),
    processedAt: transaction.processedAt?.toISOString() ?? null,
    fee:
      transaction.type === "WITHDRAWAL"
        ? ((transaction.providerCallback as { fee?: number } | null)?.fee ?? 0)
        : 0,
    totalDebit:
      transaction.type === "WITHDRAWAL"
        ? ((transaction.providerCallback as { totalDebit?: number } | null)
            ?.totalDebit ?? transaction.amount)
        : transaction.amount,
  }));

  return res.status(200).json({
    transactions: formattedTransactions,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
  });
}

// Get admin wallet transactions summary
export async function getAdminPaymentsStats(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalDeposits,
    totalWithdrawals,
    pendingDeposits,
    pendingWithdrawals,
    completedDeposits,
    completedWithdrawals,
    failedDeposits,
    failedWithdrawals,
    totalDepositValue,
    totalWithdrawalValue,
    pendingDepositValue,
    pendingWithdrawalValue,
  ] = await Promise.all([
    prisma.walletTransaction.count({
      where: { type: "DEPOSIT" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL" },
    }),
    prisma.walletTransaction.count({
      where: { type: "DEPOSIT", status: "PENDING" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "PENDING" },
    }),
    prisma.walletTransaction.count({
      where: { type: "DEPOSIT", status: "COMPLETED" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "COMPLETED" },
    }),
    prisma.walletTransaction.count({
      where: { type: "DEPOSIT", status: "FAILED" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "FAILED" },
    }),
    prisma.walletTransaction.aggregate({
      where: { type: "DEPOSIT" },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { type: "WITHDRAWAL" },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { type: "DEPOSIT", status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { type: "WITHDRAWAL", status: "PENDING" },
      _sum: { amount: true },
    }),
  ]);

  return res.status(200).json({
    stats: {
      deposits: {
        total: totalDeposits,
        pending: pendingDeposits,
        completed: completedDeposits,
        failed: failedDeposits,
        totalValue: totalDepositValue._sum.amount ?? 0,
        pendingValue: pendingDepositValue._sum.amount ?? 0,
      },
      withdrawals: {
        total: totalWithdrawals,
        pending: pendingWithdrawals,
        completed: completedWithdrawals,
        failed: failedWithdrawals,
        totalValue: totalWithdrawalValue._sum.amount ?? 0,
        pendingValue: pendingWithdrawalValue._sum.amount ?? 0,
      },
    },
  });
}
