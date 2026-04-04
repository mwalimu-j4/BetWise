import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const RECENT_ACTIVITY_LIMIT = 8;

function formatMoney(value: number) {
  return `KES ${value.toLocaleString()}`;
}

function toAdminStatus(status: string) {
  return status.toLowerCase() as "pending" | "completed" | "failed";
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

  const [
    userCount,
    walletBalanceAggregate,
    pendingWithdrawals,
    completedWithdrawals,
    failedWithdrawals,
    todayDeposits,
    todayWithdrawals,
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

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    metrics: [
      {
        label: "Total Users",
        value: userCount.toLocaleString(),
        tone: "blue" as const,
      },
      {
        label: "Wallet Balance",
        value: formatMoney(walletBalanceAggregate._sum.balance ?? 0),
        tone: "accent" as const,
      },
      {
        label: "Pending Withdrawals",
        value: pendingWithdrawals.toLocaleString(),
        tone: "gold" as const,
      },
      {
        label: "Completed Withdrawals",
        value: completedWithdrawals.toLocaleString(),
        tone: "accent" as const,
      },
      {
        label: "Today's Deposits",
        value: formatMoney(todayDeposits._sum.amount ?? 0),
        tone: "blue" as const,
      },
      {
        label: "Today's Withdrawals",
        value: formatMoney(todayWithdrawals._sum.amount ?? 0),
        tone: failedWithdrawals > 0 ? ("red" as const) : ("accent" as const),
      },
    ],
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
        reference: transaction.reference,
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
