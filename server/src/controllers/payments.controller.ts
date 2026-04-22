import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { emitWalletUpdate } from "../lib/socket";
import { getOrCreateWallet } from "../lib/wallet";
import {
  createWithdrawalNotifications,
  createDepositNotifications,
} from "./notifications.controller";
import {
  normalizePhoneNumber,
  toClientTransaction,
  type WalletTransactionStatus,
} from "../lib/mpesa";
import { getSystemSettings } from "../lib/settings";
import {
  initiatePaystackWithdrawal,
  getPaystackTransferStatus,
} from "../lib/paystack";
import { defaultAdminSettings } from "../lib/adminSettingsConfig";

const WITHDRAWAL_DEFAULTS = {
  MIN_AMOUNT: defaultAdminSettings.userDefaultsAndRestrictions.minWithdrawal,
  MAX_AMOUNT_PER_REQUEST:
    defaultAdminSettings.userDefaultsAndRestrictions.maxWithdrawal,
  FEE_PERCENTAGE:
    defaultAdminSettings.paymentsConfig.mpesa.transactionFeePercent,
  DAILY_LIMIT:
    defaultAdminSettings.userDefaultsAndRestrictions.dailyTransactionLimit,
  APPROVAL_THRESHOLD:
    defaultAdminSettings.paymentsConfig.mpesa.mpesaWithdrawalApprovalThreshold,
  KYC_REQUIRED:
    defaultAdminSettings.kycAndComplianceConfig.withdrawalRequiresKyc,
  MPESA_ENABLED: defaultAdminSettings.paymentsConfig.methods.mpesa,
};

const withdrawalRequestSchema = z.object({
  phone: z.string().trim().min(9).max(20),
  amount: z.number().int().positive(),
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

type WithdrawalProviderMeta = {
  fee?: number;
  totalDebit?: number;
  requestedAt?: string;
  approvalMode?: "AUTO" | "MANUAL";
  approvedAt?: string;
  approvedBy?: string;
  requestedPayoutAt?: string;
  finalizedAt?: string;
  disbursementState?:
    | "PENDING_APPROVAL"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";
  failureStage?: "APPROVAL" | "B2C_REQUEST" | "B2C_TIMEOUT" | "B2C_RESULT";
  mpesa?: Record<string, unknown>;
};

type WithdrawalSettings = {
  minWithdrawal: number;
  maxWithdrawal: number;
  dailyTransactionLimit: number;
  withdrawalRequiresKyc: boolean;
  feePercentage: number;
  autoWithdrawEnabled: boolean;
  approvalThreshold: number;
  mpesaEnabled: boolean;
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
    case "PROCESSING":
      return "processing";
    case "COMPLETED":
      return "completed";
    case "FAILED":
      return "failed";
    case "REVERSED":
      return "reversed";
  }
}

function startOfToday() {
  const next = new Date();
  next.setHours(0, 0, 0, 0);
  return next;
}

function getJsonObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getWithdrawalProviderMeta(
  value: Prisma.JsonValue | null | undefined,
): WithdrawalProviderMeta {
  return getJsonObject(value) as WithdrawalProviderMeta;
}

function mergeProviderMeta(
  existing: Prisma.JsonValue | null | undefined,
  next: WithdrawalProviderMeta,
) {
  return {
    ...getWithdrawalProviderMeta(existing),
    ...next,
  } as never;
}

function getNestedObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}


async function settleFailedWithdrawal(args: {
  transactionId: string;
  failureReason: string;
  failureStage: WithdrawalProviderMeta["failureStage"];
  providerResponseCode?: string | null;
  providerResponseDescription?: string | null;
  providerCallback?: Prisma.JsonValue;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.walletTransaction.findUnique({
      where: { id: args.transactionId },
      include: { wallet: true },
    });

    if (!transaction || transaction.type !== "WITHDRAWAL") {
      return null;
    }

    if (transaction.status === "FAILED") {
      const wallet = await getOrCreateWallet(transaction.userId, tx);
      return {
        transaction,
        balance: wallet.balance,
        refunded: false,
      };
    }

    if (transaction.status === "COMPLETED") {
      return null;
    }

    const meta = getWithdrawalProviderMeta(transaction.providerCallback);
    const totalDebit = meta.totalDebit ?? transaction.amount;
    const wallet = transaction.walletId
      ? await getOrCreateWallet(transaction.userId, tx)
      : await getOrCreateWallet(transaction.userId, tx);

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: totalDebit,
        },
      },
      select: { balance: true },
    });

    const updatedTransaction = await tx.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        walletId: wallet.id,
        status: "FAILED",
        processedAt: new Date(),
        providerResponseCode: args.providerResponseCode ?? undefined,
        providerResponseDescription:
          args.providerResponseDescription ?? args.failureReason,
        providerCallback: mergeProviderMeta(transaction.providerCallback, {
          finalizedAt: new Date().toISOString(),
          disbursementState: "FAILED",
          failureStage: args.failureStage,
          mpesa: {
            ...getNestedObject(meta.mpesa),
            failure: args.providerCallback
              ? getJsonObject(args.providerCallback)
              : undefined,
          },
        }),
      },
    });

    return {
      transaction: updatedTransaction,
      balance: updatedWallet.balance,
      refunded: true,
    };
  });

  if (!result) {
    return null;
  }

  const feeAmount =
    getWithdrawalProviderMeta(result.transaction.providerCallback).fee ?? 0;

  emitWalletEvent({
    userId: result.transaction.userId,
    transactionId: result.transaction.id,
    checkoutRequestId: result.transaction.checkoutRequestId,
    merchantRequestId: result.transaction.merchantRequestId,
    status: "FAILED",
    mpesaCode: result.transaction.providerReceiptNumber,
    message: args.failureReason,
    balance: result.balance,
    amount: result.transaction.amount,
  });

  await createWithdrawalNotifications({
    userId: result.transaction.userId,
    transactionId: result.transaction.id,
    amount: result.transaction.amount,
    fee: feeAmount,
    balance: result.balance,
    phone: result.transaction.phone ?? "",
    status: "FAILED",
    failureReason: args.failureReason,
  });

  return result;
}

async function finalizeSuccessfulWithdrawal(args: {
  transactionId: string;
  providerResponseCode?: string | null;
  providerResponseDescription?: string | null;
  mpesaCode?: string | null;
  providerCallback?: Prisma.JsonValue;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.walletTransaction.findUnique({
      where: { id: args.transactionId },
    });

    if (!transaction || transaction.type !== "WITHDRAWAL") {
      return null;
    }

    if (transaction.status === "COMPLETED") {
      const wallet = await getOrCreateWallet(transaction.userId, tx);
      return {
        transaction,
        balance: wallet.balance,
      };
    }

    if (!["PROCESSING", "PENDING"].includes(transaction.status)) {
      return null;
    }

    const wallet = await getOrCreateWallet(transaction.userId, tx);
    const meta = getWithdrawalProviderMeta(transaction.providerCallback);
    const updatedTransaction = await tx.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        walletId: wallet.id,
        status: "COMPLETED",
        processedAt: new Date(),
        providerReceiptNumber:
          args.mpesaCode ?? transaction.providerReceiptNumber ?? undefined,
        providerResponseCode: args.providerResponseCode ?? undefined,
        providerResponseDescription:
          args.providerResponseDescription ??
          transaction.providerResponseDescription ??
          undefined,
        providerCallback: mergeProviderMeta(transaction.providerCallback, {
          finalizedAt: new Date().toISOString(),
          disbursementState: "COMPLETED",
          mpesa: {
            ...getNestedObject(meta.mpesa),
            success: args.providerCallback
              ? getJsonObject(args.providerCallback)
              : undefined,
          },
        }),
      },
    });

    return {
      transaction: updatedTransaction,
      balance: wallet.balance,
    };
  });

  if (!result) {
    return null;
  }

  const feeAmount =
    getWithdrawalProviderMeta(result.transaction.providerCallback).fee ?? 0;

  emitWalletEvent({
    userId: result.transaction.userId,
    transactionId: result.transaction.id,
    checkoutRequestId: result.transaction.checkoutRequestId,
    merchantRequestId: result.transaction.merchantRequestId,
    mpesaCode: result.transaction.providerReceiptNumber,
    status: "COMPLETED",
    message: "Your withdrawal has been sent successfully.",
    balance: result.balance,
    amount: result.transaction.amount,
  });

  await createWithdrawalNotifications({
    userId: result.transaction.userId,
    transactionId: result.transaction.id,
    amount: result.transaction.amount,
    fee: feeAmount,
    balance: result.balance,
    phone: result.transaction.phone ?? "",
    status: "COMPLETED",
  });

  return result;
}

function normalizePaystackTransferStatus(status: string | undefined) {
  return (status ?? "").trim().toLowerCase();
}

async function syncPaystackWithdrawalStatus(transactionId: string) {
  const transaction = await prisma.walletTransaction.findUnique({
    where: { id: transactionId },
  });

  if (
    !transaction ||
    transaction.type !== "WITHDRAWAL" ||
    transaction.channel !== "paystack" ||
    transaction.status !== "PROCESSING" ||
    !transaction.checkoutRequestId
  ) {
    return transaction;
  }

  try {
    const providerStatus = await getPaystackTransferStatus(
      transaction.checkoutRequestId,
    );
    const normalizedStatus = normalizePaystackTransferStatus(
      providerStatus.data?.status,
    );

    if (["success", "successful", "completed"].includes(normalizedStatus)) {
      await finalizeSuccessfulWithdrawal({
        transactionId: transaction.id,
        providerResponseDescription:
          providerStatus.message || "Withdrawal completed on Paystack.",
        providerCallback: providerStatus as never,
      });
    } else if (
      ["failed", "failure", "reversed", "rejected", "abandoned"].includes(
        normalizedStatus,
      )
    ) {
      await settleFailedWithdrawal({
        transactionId: transaction.id,
        failureReason:
          providerStatus.message || "Withdrawal failed on Paystack.",
        failureStage: "B2C_RESULT",
        providerResponseDescription:
          providerStatus.message || "Withdrawal failed on Paystack.",
        providerCallback: providerStatus as never,
      });
    } else {
      await prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          providerResponseDescription:
            providerStatus.message || "Withdrawal is still processing.",
          providerCallback: mergeProviderMeta(transaction.providerCallback, {
            disbursementState: "PROCESSING",
            mpesa: {
              ...getNestedObject(
                getWithdrawalProviderMeta(transaction.providerCallback).mpesa,
              ),
              statusCheck: providerStatus as unknown as Record<string, unknown>,
            },
          }),
        },
      });
    }
  } catch (error) {
    console.error(
      `[Withdrawals] Failed to sync Paystack payout status for ${transaction.id}:`,
      error,
    );
  }

  return prisma.walletTransaction.findUnique({
    where: { id: transactionId },
  });
}

async function initiateWithdrawalDisbursement(args: {
  transactionId: string;
  adminUserId: string;
  approvalMode: "AUTO" | "MANUAL";
}) {
  const existingTransaction = await prisma.walletTransaction.findUnique({
    where: { id: args.transactionId },
  });

  if (!existingTransaction) {
    return { ok: false as const, code: 404, message: "Withdrawal not found." };
  }

  if (existingTransaction.type !== "WITHDRAWAL") {
    return {
      ok: false as const,
      code: 400,
      message: "This is not a withdrawal transaction.",
    };
  }

  if (existingTransaction.status !== "PENDING") {
    return {
      ok: false as const,
      code: 409,
      message: `Cannot approve a ${existingTransaction.status.toLowerCase()} withdrawal.`,
    };
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const latestTransaction = await tx.walletTransaction.findUnique({
      where: { id: args.transactionId },
    });

    if (!latestTransaction || latestTransaction.type !== "WITHDRAWAL") {
      return null;
    }

    if (latestTransaction.status !== "PENDING") {
      return latestTransaction;
    }

    return tx.walletTransaction.update({
      where: { id: latestTransaction.id },
      data: {
        status: "PROCESSING",
        providerCallback: mergeProviderMeta(
          latestTransaction.providerCallback,
          {
            approvedAt: new Date().toISOString(),
            approvedBy: args.adminUserId,
            approvalMode: args.approvalMode,
            requestedPayoutAt: new Date().toISOString(),
            disbursementState: "PROCESSING",
          },
        ),
      },
    });
  });

  if (!transaction) {
    return { ok: false as const, code: 404, message: "Withdrawal not found." };
  }

  if (transaction.status !== "PROCESSING") {
    return {
      ok: false as const,
      code: 409,
      message: `Cannot approve a ${transaction.status.toLowerCase()} withdrawal.`,
    };
  }

  try {
    const transferReference = transaction.reference || `WD-${randomUUID()}`;
    const payoutPhone = transaction.phone?.trim();

    if (!payoutPhone) {
      const failureMessage =
        "Missing withdrawal destination phone number for Paystack payout.";

      await settleFailedWithdrawal({
        transactionId: transaction.id,
        failureReason: failureMessage,
        failureStage: "B2C_REQUEST",
        providerResponseDescription: failureMessage,
      });

      return {
        ok: false as const,
        code: 500,
        message: failureMessage,
      };
    }

    const payoutResponse = await initiatePaystackWithdrawal(
      payoutPhone,
      transaction.amount,
      transferReference,
    );

    if (!payoutResponse.data?.transfer_code) {
      const failureMessage =
        payoutResponse.message ?? "Paystack transfer request rejected.";

      await settleFailedWithdrawal({
        transactionId: transaction.id,
        failureReason: failureMessage,
        failureStage: "B2C_REQUEST",
        providerResponseDescription: failureMessage,
        providerCallback: payoutResponse as never,
      });

      return {
        ok: false as const,
        code: 502,
        message: failureMessage,
      };
    }

    const updatedTransaction = await prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        checkoutRequestId: payoutResponse.data.transfer_code,
        providerResponseDescription:
          payoutResponse.message || "Paystack transfer initiated successfully.",
        providerCallback: mergeProviderMeta(transaction.providerCallback, {
          requestedPayoutAt: new Date().toISOString(),
          disbursementState: "PROCESSING",
        }),
      },
    });

    const initialTransferStatus = normalizePaystackTransferStatus(
      payoutResponse.data.status,
    );

    if (
      ["success", "successful", "completed"].includes(initialTransferStatus)
    ) {
      await finalizeSuccessfulWithdrawal({
        transactionId: updatedTransaction.id,
        providerResponseDescription:
          payoutResponse.message || "Withdrawal completed on Paystack.",
        providerCallback: payoutResponse as never,
      });

      const completedTransaction = await prisma.walletTransaction.findUnique({
        where: { id: updatedTransaction.id },
      });

      return {
        ok: true as const,
        code: 200,
        message: "Withdrawal approved and completed successfully.",
        transaction: completedTransaction ?? updatedTransaction,
      };
    }

    if (
      ["failed", "failure", "reversed", "rejected", "abandoned"].includes(
        initialTransferStatus,
      )
    ) {
      await settleFailedWithdrawal({
        transactionId: updatedTransaction.id,
        failureReason:
          payoutResponse.message || "Withdrawal failed on Paystack.",
        failureStage: "B2C_REQUEST",
        providerResponseDescription:
          payoutResponse.message || "Withdrawal failed on Paystack.",
        providerCallback: payoutResponse as never,
      });

      return {
        ok: false as const,
        code: 502,
        message: payoutResponse.message || "Withdrawal failed on Paystack.",
      };
    }

    const wallet = await getOrCreateWallet(updatedTransaction.userId);
    emitWalletEvent({
      userId: updatedTransaction.userId,
      transactionId: updatedTransaction.id,
      checkoutRequestId: updatedTransaction.checkoutRequestId,
      status: "PROCESSING",
      message: "Withdrawal approved and payout request sent via Paystack.",
      balance: wallet.balance,
      amount: updatedTransaction.amount,
    });

    return {
      ok: true as const,
      code: 200,
      message: "Withdrawal approved and payout initiated successfully.",
      transaction: updatedTransaction,
    };
  } catch (error) {
    const failureMessage =
      error instanceof Error
        ? error.message
        : "Failed to initiate the Paystack withdrawal payout.";

    await settleFailedWithdrawal({
      transactionId: transaction.id,
      failureReason: failureMessage,
      failureStage: "B2C_REQUEST",
      providerResponseDescription: failureMessage,
    });

    return {
      ok: false as const,
      code: 502,
      message: failureMessage,
    };
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
    const [settings, user] = await Promise.all([
      getSystemSettings(),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          phone: true,
          isVerified: true,
        },
      }),
    ]);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      minWithdrawal,
      maxWithdrawal,
      dailyTransactionLimit,
    } = settings.userDefaultsAndRestrictions;
    
    const { withdrawalRequiresKyc } = settings.kycAndComplianceConfig;
    const mpesaEnabled = settings.paymentsConfig.methods.mpesa;
    const feePercentage = settings.paymentsConfig.mpesa.transactionFeePercent;

    if (!mpesaEnabled) {
      return res.status(403).json({
        message: "Mobile money withdrawals are currently disabled.",
      });
    }

    const normalizedPhone = normalizePhoneNumber(parsedBody.data.phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        message: "Phone must be in format 2547XXXXXXXX.",
      });
    }

    const accountPhone = normalizePhoneNumber(user.phone);
    if (!accountPhone || accountPhone !== normalizedPhone) {
      return res.status(400).json({
        message:
          "Withdrawals can only be sent to your verified account phone number.",
      });
    }

    if (settings.withdrawalRequiresKyc && !user.isVerified) {
      return res.status(403).json({
        message:
          "Your account must be verified before you can make withdrawals.",
      });
    }

    const requestedAmount = parsedBody.data.amount;
    if (requestedAmount < minWithdrawal) {
      return res.status(400).json({
        message: `Minimum withdrawal is KES ${minWithdrawal.toLocaleString()}.`,
      });
    }

    if (requestedAmount > maxWithdrawal) {
      return res.status(400).json({
        message: `Maximum withdrawal is KES ${maxWithdrawal.toLocaleString()}.`,
      });
    }

    const feeAmount = Math.ceil(
      (requestedAmount * feePercentage) / 100,
    );
    const totalDebit = requestedAmount + feeAmount;

    const wallet = await getOrCreateWallet(userId);

    if (wallet.balance < totalDebit) {
      return res.status(400).json({
        message: `Insufficient balance. You need KES ${totalDebit.toLocaleString()} (amount + fees) but only have KES ${wallet.balance.toLocaleString()}.`,
      });
    }

    const todayStart = startOfToday();
    const dailyWithdrawalAggregate = await prisma.walletTransaction.aggregate({
      where: {
        userId,
        type: "WITHDRAWAL",
        status: {
          in: ["PENDING", "PROCESSING", "COMPLETED"],
        },
        createdAt: {
          gte: todayStart,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const dailyRequestedAmount = dailyWithdrawalAggregate._sum.amount ?? 0;
    if (
      dailyRequestedAmount + requestedAmount >
      dailyTransactionLimit
    ) {
      return res.status(400).json({
        message: `Daily withdrawal limit exceeded. You can only withdraw up to KES ${dailyTransactionLimit.toLocaleString()} per day.`,
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
          channel: "paystack",
          reference: `WD-${randomUUID()}`,
          phone: normalizedPhone,
          accountReference: "BET-WITHDRAWAL",
          description: `Withdrawal via Paystack to mobile money (${normalizedPhone})`,
          providerCallback: {
            fee: feeAmount,
            totalDebit,
            requestedAt: new Date().toISOString(),
            disbursementState: "PENDING_APPROVAL",
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
        phone: normalizedPhone,
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
        phone: normalizedPhone,
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

    const syncedWithdrawals = await Promise.all(
      withdrawals.map(async (transaction) => {
        if (transaction.status !== "PROCESSING") {
          return transaction;
        }

        return (
          (await syncPaystackWithdrawalStatus(transaction.id)) ?? transaction
        );
      }),
    );

    return res.status(200).json({
      withdrawals: syncedWithdrawals.map((transaction) => ({
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

    const result = await initiateWithdrawalDisbursement({
      transactionId,
      adminUserId: req.user.id,
      approvalMode: "MANUAL",
    });

    if (!result.ok) {
      return res.status(result.code).json({ message: result.message });
    }

    return res.status(200).json({
      message: result.message,
      transactionId: result.transaction.id,
      status: "PROCESSING",
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

    const result = await prisma.$transaction(async (tx) => {
      const latestTransaction = await tx.walletTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!latestTransaction || latestTransaction.status !== "PENDING") {
        return null;
      }

      const meta = getWithdrawalProviderMeta(
        latestTransaction.providerCallback,
      );
      const totalDebit = meta.totalDebit ?? latestTransaction.amount;
      const wallet = await getOrCreateWallet(latestTransaction.userId, tx);

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: totalDebit,
          },
        },
        select: { balance: true },
      });

      const updatedTransaction = await tx.walletTransaction.update({
        where: { id: transactionId },
        data: {
          walletId: wallet.id,
          status: "FAILED",
          processedAt: new Date(),
          providerResponseDescription: reason || "Withdrawal rejected by admin",
          providerCallback: mergeProviderMeta(
            latestTransaction.providerCallback,
            {
              finalizedAt: new Date().toISOString(),
              failureStage: "APPROVAL",
              disbursementState: "FAILED",
            },
          ),
        },
      });

      return {
        transaction: updatedTransaction,
        balance: updatedWallet.balance,
      };
    });

    if (!result) {
      return res.status(409).json({
        message: "Withdrawal is no longer pending review.",
      });
    }

    emitWalletEvent({
      userId: result.transaction.userId,
      transactionId: result.transaction.id,
      status: "FAILED",
      message: "Your withdrawal request was rejected.",
      balance: result.balance,
      amount: result.transaction.amount,
    });

    const feeAmount =
      getWithdrawalProviderMeta(result.transaction.providerCallback).fee ?? 0;
    await createWithdrawalNotifications({
      userId: result.transaction.userId,
      transactionId: result.transaction.id,
      amount: result.transaction.amount,
      fee: feeAmount,
      balance: result.balance,
      phone: result.transaction.phone ?? "",
      status: "REJECTED",
      failureReason: reason || "Rejected by admin",
    });

    return res.status(200).json({
      message: "Withdrawal rejected and funds refunded to user.",
      transactionId: result.transaction.id,
      status: "FAILED",
    });
  } catch (error) {
    next(error);
  }
}

export async function getWalletSummary(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [transactions, totalDeposits] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.walletTransaction.aggregate({
        where: { userId: req.user.id, type: "DEPOSIT", status: "COMPLETED" },
        _sum: { amount: true },
      }),
    ]);

    const syncedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        if (
          transaction.type !== "WITHDRAWAL" ||
          transaction.status !== "PROCESSING"
        ) {
          return transaction;
        }

        return (
          (await syncPaystackWithdrawalStatus(transaction.id)) ?? transaction
        );
      }),
    );

    const latestWallet = await getOrCreateWallet(req.user.id);

    return res.status(200).json({
      wallet: {
        balance: latestWallet.balance,
        totalDepositsThisMonth: totalDeposits._sum.amount ?? 0,
      },
      transactions: syncedTransactions.map(toClientTransaction),
    });
  } catch (error) {
    next(error);
  }
}

export async function getEnabledPaymentMethods(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
) {
  try {
    const settings = await prisma.adminSettings.findUnique({
      where: { key: "global" },
      select: {
        paymentMpesaEnabled: true,
        paymentPaystackEnabled: true,
        paymentBankTransferEnabled: true,
        minDeposit: true,
        maxDeposit: true,
        minWithdrawal: true,
        maxWithdrawal: true,
        dailyTransactionLimit: true,
        mpesaTransactionFeePercent: true,
        minBetAmount: true,
        maxBetAmount: true,
        maxTotalOdds: true,
      },
    });

    if (!settings) {
      return res.status(200).json({
        mpesa: false,
        paystack: false,
        bankTransfer: false,
      });
    }

    return res.status(200).json({
      mpesa: settings.paymentMpesaEnabled,
      paystack: settings.paymentPaystackEnabled,
      bankTransfer: settings.paymentBankTransferEnabled,
      limits: {
        minDeposit: settings.minDeposit,
        maxDeposit: settings.maxDeposit,
        minWithdrawal: settings.minWithdrawal,
        maxWithdrawal: settings.maxWithdrawal,
        dailyLimit: settings.dailyTransactionLimit,
        feePercentage: settings.mpesaTransactionFeePercent,
      },
      betting: {
        minBetAmount: settings.minBetAmount,
        maxBetAmount: settings.maxBetAmount,
        maxTotalOdds: settings.maxTotalOdds,
      },
      currency: "KES",
    });
  } catch (error) {
    next(error);
  }
}

export async function listAdminWithdrawals(
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

    const requestedStatus = String(req.query.status ?? "PENDING").toUpperCase();
    const status = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"].includes(
      requestedStatus,
    )
      ? requestedStatus
      : "PENDING";
    const withdrawals = await prisma.walletTransaction.findMany({
      where: {
        type: "WITHDRAWAL",
        status: status as never,
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
      take: 100,
    });

    const syncedWithdrawals = await Promise.all(
      withdrawals.map(async (transaction) => {
        if (transaction.status !== "PROCESSING") {
          return transaction;
        }

        const syncedTransaction = await syncPaystackWithdrawalStatus(
          transaction.id,
        );
        if (!syncedTransaction) {
          return transaction;
        }

        return {
          ...transaction,
          ...syncedTransaction,
        };
      }),
    );

    const filteredWithdrawals = syncedWithdrawals.filter(
      (transaction) =>
        transaction.status === (status as typeof transaction.status),
    );

    return res.status(200).json({
      withdrawals: filteredWithdrawals.map((w) => ({
        id: w.id,
        userId: w.userId,
        userEmail: w.user.email,
        userPhone: w.user.phone,
        amount: w.amount,
        fee: (w.providerCallback as { fee?: number } | null)?.fee ?? 0,
        totalDebit:
          (w.providerCallback as { totalDebit?: number } | null)?.totalDebit ??
          w.amount,
        phone: w.phone,
        status: toTransactionStatus(w.status),
        reference: w.reference,
        mpesaCode: w.providerReceiptNumber,
        providerMessage: w.providerResponseDescription,
        createdAt: w.createdAt.toISOString(),
        processedAt: w.processedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    next(error);
  }
}
