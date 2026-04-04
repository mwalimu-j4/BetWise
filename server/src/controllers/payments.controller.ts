import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { emitNotificationUpdate, emitWalletUpdate } from "../lib/socket";
import { createWithdrawalNotifications, createDepositNotifications } from "./notifications.controller";
import {
  toTransactionType,
  getMpesaConfig,
  getTimestamp,
  getMpesaAccessToken,
  normalizePhoneNumber,
  stkPushBodySchema,
  mpesaCallbackSchema,
  toClientTransaction,
  getValue,
  normalizeCallbackValue,
  type WalletTransactionStatus,
  type WalletTransactionType,
  type MpesaStkPushResponse,
  type MpesaStkQueryResponse,
  type MpesaCallbackItem,
} from "../lib/mpesa";

const WITHDRAWAL_CONFIG = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT_PER_REQUEST: 10000,
  FEE_PERCENTAGE: 5,
};

const withdrawalRequestSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^254\d{9}$/, "Phone must be in format 2547XXXXXXXX"),
  amount: z.number().int().positive().min(WITHDRAWAL_CONFIG.MIN_AMOUNT),
  pin: z.string().trim().min(4).max(6).optional(),
});

type PaymentEvent = {
  userId: string;
  transactionId: string;
  checkoutRequestId?: string | null;
  merchantRequestId?: string | null;
  mpesaCode?: string | null;
  status: WalletTransactionStatus;
  message: string;
  balance: number;
  amount: number;
};

function emitWalletEvent(event: PaymentEvent) {
  emitWalletUpdate(event.userId, {
    transactionId: event.transactionId,
    checkoutRequestId: event.checkoutRequestId,
    merchantRequestId: event.merchantRequestId,
    mpesaCode: event.mpesaCode,
    status: event.status,
    message: event.message,
    balance: event.balance,
    amount: event.amount,
  });
}

async function getOrCreateWallet(userId: string) {
  const existingWallet = await prisma.wallet.findUnique({ where: { userId } });
  if (existingWallet) return existingWallet;

  return prisma.wallet.create({
    data: {
      userId,
    },
  });
}

async function getWalletBalance(userId: string) {
  const wallet = await getOrCreateWallet(userId);
  return {
    balance: wallet.balance,
  };
}

function toTransactionStatus(value: WalletTransactionStatus) {
  switch (value) {
    case "PENDING":
      return "pending";
    case "COMPLETED":
      return "completed";
    case "FAILED":
      return "failed";
    case "REVERSED":
      return "reversed";
  }
}

export async function createWithdrawalRequest(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
) {
  try {
    const parsedBody = withdrawalRequestSchema.safeParse(req.body);

    if (!parsedBody.success) {
      const errorMessage = parsedBody.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return res.status(400).json({ message: errorMessage });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const requestedAmount = parsedBody.data.amount;
    const feeAmount = Math.ceil(
      (requestedAmount * WITHDRAWAL_CONFIG.FEE_PERCENTAGE) / 100,
    );
    const totalDebit = requestedAmount + feeAmount;

    const wallet = await getOrCreateWallet(userId);

    if (wallet.balance < totalDebit) {
      return res.status(400).json({
        message: `Insufficient balance. You need KES ${totalDebit.toLocaleString()} (amount + fees) but only have KES ${wallet.balance.toLocaleString()}.`,
      });
    }

    const withdrawalResult = await prisma.$transaction(async (tx) => {
      const debitResult = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          balance: {
            gte: totalDebit,
          },
        },
        data: {
          balance: {
            decrement: totalDebit,
          },
        },
      });

      if (debitResult.count === 0) {
        return null;
      }

      const createdTransaction = await tx.walletTransaction.create({
        data: {
          userId,
          walletId: wallet.id,
          type: "WITHDRAWAL",
          status: "PENDING",
          amount: requestedAmount,
          currency: "KES",
          channel: "M-Pesa",
          reference: `WD-${randomUUID()}`,
          phone: parsedBody.data.phone,
          accountReference: "BET-WITHDRAWAL",
          description: `Withdrawal to M-Pesa (${parsedBody.data.phone})`,
          providerCallback: {
            fee: feeAmount,
            totalDebit,
            requestedAt: new Date().toISOString(),
          } as never,
        },
      });

      const refreshedWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { balance: true },
      });

      return {
        transaction: createdTransaction,
        updatedBalance: refreshedWallet?.balance ?? wallet.balance,
      };
    });

    if (!withdrawalResult) {
      return res.status(400).json({
        message: `Insufficient balance. You need KES ${totalDebit.toLocaleString()} (amount + fees).`,
      });
    }

    const { transaction, updatedBalance } = withdrawalResult;

    emitWalletEvent({
      userId,
      transactionId: transaction.id,
      status: "PENDING",
      message: "Withdrawal request submitted for admin approval.",
      balance: updatedBalance,
      amount: requestedAmount,
    });

    try {
      await createWithdrawalNotifications({
        userId,
        transactionId: transaction.id,
        amount: requestedAmount,
        fee: feeAmount,
        balance: updatedBalance,
        phone: parsedBody.data.phone,
        status: "PENDING",
      });
    } catch (notificationError) {
      console.error(
        "Failed to create withdrawal notifications:",
        notificationError,
      );
    }

    return res.status(200).json({
      message: "Withdrawal request submitted successfully.",
      transactionId: transaction.id,
      wallet: {
        balance: updatedBalance,
      },
      details: {
        amount: requestedAmount,
        fee: feeAmount,
        netAmount: requestedAmount - feeAmount,
        phone: parsedBody.data.phone,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listWithdrawals(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const withdrawals = await prisma.walletTransaction.findMany({
      where: {
        userId: req.user.id,
        type: "WITHDRAWAL",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.status(200).json({
      withdrawals: withdrawals.map((transaction) => ({
        id: transaction.id,
        type: transaction.type.toLowerCase(),
        status: toTransactionStatus(transaction.status),
        amount: transaction.amount,
        currency: transaction.currency,
        channel: transaction.channel,
        reference: transaction.reference,
        mpesaCode: transaction.providerReceiptNumber,
        createdAt: transaction.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function approveWithdrawal(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required." });
    }

    const transactionId = Array.isArray(req.params.transactionId)
      ? req.params.transactionId[0]
      : req.params.transactionId;

    if (!transactionId) {
      return res.status(400).json({ message: "Invalid transaction id." });
    }

    const transaction = await prisma.walletTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Withdrawal not found." });
    }

    if (transaction.type !== "WITHDRAWAL") {
      return res
        .status(400)
        .json({ message: "This is not a withdrawal transaction." });
    }

    if (transaction.status !== "PENDING") {
      return res.status(400).json({
        message: `Cannot approve a ${transaction.status.toLowerCase()} withdrawal.`,
      });
    }

    const updatedTransaction = await prisma.walletTransaction.update({
      where: { id: transactionId },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
        providerReceiptNumber: `MPX-${Date.now()}`,
      },
    });

    const wallet = await getOrCreateWallet(transaction.userId);

    emitWalletEvent({
      userId: transaction.userId,
      transactionId: transaction.id,
      status: "COMPLETED",
      message: "Your withdrawal has been processed.",
      balance: wallet.balance,
      amount: transaction.amount,
    });

    const feeAmount =
      (transaction.providerCallback as { fee?: number } | null)?.fee ?? 0;
    await createWithdrawalNotifications({
      userId: transaction.userId,
      transactionId: transaction.id,
      amount: transaction.amount,
      fee: feeAmount,
      balance: wallet.balance,
      phone: transaction.phone ?? "",
      status: "COMPLETED",
    });

    return res.status(200).json({
      message: "Withdrawal approved and processed successfully.",
      transactionId: updatedTransaction.id,
      status: "COMPLETED",
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectWithdrawal(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required." });
    }

    const transactionId = Array.isArray(req.params.transactionId)
      ? req.params.transactionId[0]
      : req.params.transactionId;
    const { reason } = req.body as { reason?: string };

    if (!transactionId) {
      return res.status(400).json({ message: "Invalid transaction id." });
    }

    const transaction = await prisma.walletTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Withdrawal not found." });
    }

    if (transaction.type !== "WITHDRAWAL") {
      return res
        .status(400)
        .json({ message: "This is not a withdrawal transaction." });
    }

    if (transaction.status !== "PENDING") {
      return res.status(400).json({
        message: `Cannot reject a ${transaction.status.toLowerCase()} withdrawal.`,
      });
    }

    const totalDebit =
      (transaction.providerCallback as { totalDebit?: number } | null)
        ?.totalDebit ?? transaction.amount;

    await prisma.wallet.update({
      where: { id: transaction.walletId! },
      data: {
        balance: {
          increment: totalDebit,
        },
      },
    });

    const updatedTransaction = await prisma.walletTransaction.update({
      where: { id: transactionId },
      data: {
        status: "FAILED",
        processedAt: new Date(),
        providerResponseDescription: reason || "Withdrawal rejected by admin",
      },
    });

    const wallet = await getOrCreateWallet(transaction.userId);

    emitWalletEvent({
      userId: transaction.userId,
      transactionId: transaction.id,
      status: "FAILED",
      message: "Your withdrawal request was rejected.",
      balance: wallet.balance,
      amount: transaction.amount,
    });

    const feeAmount =
      (transaction.providerCallback as { fee?: number } | null)?.fee ?? 0;
    await createWithdrawalNotifications({
      userId: transaction.userId,
      transactionId: transaction.id,
      amount: transaction.amount,
      fee: feeAmount,
      balance: wallet.balance,
      phone: transaction.phone ?? "",
      status: "REJECTED",
      failureReason: reason || "Rejected by admin",
    });

    return res.status(200).json({
      message: "Withdrawal rejected and funds refunded to user.",
      transactionId: updatedTransaction.id,
      status: "FAILED",
    });
  } catch (error) {
    next(error);
  }
}
