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
  getMpesaConfig,
  getMpesaB2CConfig,
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
  type MpesaB2CResponse,
  type MpesaCallbackItem,
} from "../lib/mpesa";
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
    defaultAdminSettings.paymentsConfig.mpesa.withdrawalApprovalThreshold,
  KYC_REQUIRED: defaultAdminSettings.kycAndComplianceConfig.withdrawalRequiresKyc,
  MPESA_ENABLED: defaultAdminSettings.paymentsConfig.methods.mpesa,
};

const withdrawalRequestSchema = z.object({
  phone: z.string().trim().min(9).max(20),
  amount: z
    .number()
    .int()
    .positive()
    .min(WITHDRAWAL_DEFAULTS.MIN_AMOUNT)
    .max(WITHDRAWAL_DEFAULTS.MAX_AMOUNT_PER_REQUEST),
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
  disbursementState?: "PENDING_APPROVAL" | "PROCESSING" | "COMPLETED" | "FAILED";
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

async function getWithdrawalSettings(): Promise<WithdrawalSettings> {
  const settings = await prisma.adminSettings.findUnique({
    where: { key: "global" },
    select: {
      minWithdrawal: true,
      maxWithdrawal: true,
      dailyTransactionLimit: true,
      withdrawalRequiresKyc: true,
      paymentMpesaEnabled: true,
      mpesaTransactionFeePercent: true,
      mpesaAutoWithdrawEnabled: true,
      mpesaWithdrawalApprovalThreshold: true,
    },
  });

  if (!settings) {
    return {
      minWithdrawal: WITHDRAWAL_DEFAULTS.MIN_AMOUNT,
      maxWithdrawal: WITHDRAWAL_DEFAULTS.MAX_AMOUNT_PER_REQUEST,
      dailyTransactionLimit: WITHDRAWAL_DEFAULTS.DAILY_LIMIT,
      withdrawalRequiresKyc: WITHDRAWAL_DEFAULTS.KYC_REQUIRED,
      feePercentage: WITHDRAWAL_DEFAULTS.FEE_PERCENTAGE,
      autoWithdrawEnabled: false,
      approvalThreshold: WITHDRAWAL_DEFAULTS.APPROVAL_THRESHOLD,
      mpesaEnabled: WITHDRAWAL_DEFAULTS.MPESA_ENABLED,
    };
  }

  return {
    minWithdrawal: settings.minWithdrawal,
    maxWithdrawal: settings.maxWithdrawal,
    dailyTransactionLimit: settings.dailyTransactionLimit,
    withdrawalRequiresKyc: settings.withdrawalRequiresKyc,
    feePercentage: settings.mpesaTransactionFeePercent,
    autoWithdrawEnabled: settings.mpesaAutoWithdrawEnabled,
    approvalThreshold: settings.mpesaWithdrawalApprovalThreshold,
    mpesaEnabled: settings.paymentMpesaEnabled,
  };
}

function extractB2CReceipt(body: unknown) {
  if (!body || typeof body !== "object" || !("Result" in body)) {
    return null;
  }

  const result = (body as { Result?: unknown }).Result;
  if (!result || typeof result !== "object") {
    return null;
  }

  const parameters = (result as { ResultParameters?: { ResultParameter?: unknown } })
    .ResultParameters?.ResultParameter;
  if (!Array.isArray(parameters)) {
    return null;
  }

  const receipt = parameters.find((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    return (item as { Key?: unknown }).Key === "TransactionReceipt";
  });

  const value =
    receipt && typeof receipt === "object"
      ? (receipt as { Value?: unknown }).Value
      : null;

  return typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : null;
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

  const feeAmount = getWithdrawalProviderMeta(result.transaction.providerCallback).fee ?? 0;

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
          args.providerResponseDescription ?? transaction.providerResponseDescription ?? undefined,
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

async function initiateWithdrawalDisbursement(args: {
  transactionId: string;
  adminUserId: string;
  approvalMode: "AUTO" | "MANUAL";
}) {
  const transaction = await prisma.$transaction(async (tx) => {
    const existingTransaction = await tx.walletTransaction.findUnique({
      where: { id: args.transactionId },
    });

    if (!existingTransaction || existingTransaction.type !== "WITHDRAWAL") {
      return null;
    }

    if (existingTransaction.status !== "PENDING") {
      return existingTransaction;
    }

    return tx.walletTransaction.update({
      where: { id: existingTransaction.id },
      data: {
        status: "PROCESSING",
        providerCallback: mergeProviderMeta(existingTransaction.providerCallback, {
          approvedAt: new Date().toISOString(),
          approvedBy: args.adminUserId,
          approvalMode: args.approvalMode,
          requestedPayoutAt: new Date().toISOString(),
          disbursementState: "PROCESSING",
        }),
      },
    });
  });

  if (!transaction) {
    return { ok: false as const, code: 404, message: "Withdrawal not found." };
  }

  if (transaction.type !== "WITHDRAWAL") {
    return {
      ok: false as const,
      code: 400,
      message: "This is not a withdrawal transaction.",
    };
  }

  if (transaction.status !== "PROCESSING") {
    return {
      ok: false as const,
      code: 409,
      message: `Cannot approve a ${transaction.status.toLowerCase()} withdrawal.`,
    };
  }

  const config = getMpesaB2CConfig();
  if (!config.isConfigured) {
    const failureMessage = `M-Pesa withdrawal is not configured. Missing: ${config.missingVars.join(", ")}.`;
    await settleFailedWithdrawal({
      transactionId: transaction.id,
      failureReason: failureMessage,
      failureStage: "APPROVAL",
      providerResponseDescription: failureMessage,
    });

    return {
      ok: false as const,
      code: 500,
      message: failureMessage,
    };
  }

  try {
    const tokenData = await getMpesaAccessToken(config);
    const payoutPayload = {
      OriginatorConversationID: transaction.id,
      InitiatorName: config.initiatorName,
      SecurityCredential: config.securityCredential,
      CommandID: config.commandId,
      Amount: transaction.amount,
      PartyA: config.shortcode,
      PartyB: transaction.phone,
      Remarks: transaction.description ?? "BetWise withdrawal payout",
      QueueTimeOutURL: config.timeoutUrl,
      ResultURL: config.resultUrl,
      Occasion: transaction.reference,
    };

    const payoutResponse = await fetch(
      `${config.baseUrl}/mpesa/b2c/v3/paymentrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payoutPayload),
      },
    );

    const payoutData = (await payoutResponse.json()) as MpesaB2CResponse;

    if (!payoutResponse.ok || payoutData.ResponseCode !== "0") {
      const failureMessage =
        payoutData.errorMessage ??
        payoutData.ResponseDescription ??
        "M-Pesa rejected the withdrawal payout request.";

      await settleFailedWithdrawal({
        transactionId: transaction.id,
        failureReason: failureMessage,
        failureStage: "B2C_REQUEST",
        providerResponseCode: payoutData.ResponseCode ?? null,
        providerResponseDescription:
          payoutData.ResponseDescription ?? failureMessage,
        providerCallback: payoutData as never,
      });

      return {
        ok: false as const,
        code: 502,
        message: failureMessage,
      };
    }

    const currentMeta = getWithdrawalProviderMeta(transaction.providerCallback);
    const updatedTransaction = await prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        checkoutRequestId:
          payoutData.ConversationID ?? transaction.checkoutRequestId,
        merchantRequestId:
          payoutData.OriginatorConversationID ?? transaction.merchantRequestId,
        providerResponseCode: payoutData.ResponseCode ?? undefined,
        providerResponseDescription:
          payoutData.ResponseDescription ??
          "Withdrawal payout accepted by M-Pesa.",
        providerCallback: mergeProviderMeta(transaction.providerCallback, {
          requestedPayoutAt: new Date().toISOString(),
          disbursementState: "PROCESSING",
          mpesa: {
            ...getNestedObject(currentMeta.mpesa),
            request: payoutPayload,
            response: payoutData,
          },
        }),
      },
    });

    const wallet = await getOrCreateWallet(updatedTransaction.userId);
    emitWalletEvent({
      userId: updatedTransaction.userId,
      transactionId: updatedTransaction.id,
      checkoutRequestId: updatedTransaction.checkoutRequestId,
      merchantRequestId: updatedTransaction.merchantRequestId,
      status: "PROCESSING",
      message: "Withdrawal approved and payout request sent to M-Pesa.",
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
        : "Failed to initiate the M-Pesa withdrawal payout.";

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
      getWithdrawalSettings(),
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

    if (!settings.mpesaEnabled) {
      return res.status(403).json({
        message: "M-Pesa withdrawals are currently disabled.",
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
    if (requestedAmount < settings.minWithdrawal) {
      return res.status(400).json({
        message: `Minimum withdrawal is KES ${settings.minWithdrawal.toLocaleString()}.`,
      });
    }

    if (requestedAmount > settings.maxWithdrawal) {
      return res.status(400).json({
        message: `Maximum withdrawal is KES ${settings.maxWithdrawal.toLocaleString()}.`,
      });
    }

    const feeAmount = Math.ceil((requestedAmount * settings.feePercentage) / 100);
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
    if (dailyRequestedAmount + requestedAmount > settings.dailyTransactionLimit) {
      return res.status(400).json({
        message: `Daily withdrawal limit exceeded. You can only withdraw up to KES ${settings.dailyTransactionLimit.toLocaleString()} per day.`,
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
          phone: normalizedPhone,
          accountReference: "BET-WITHDRAWAL",
          description: `Withdrawal to M-Pesa (${normalizedPhone})`,
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

      const meta = getWithdrawalProviderMeta(latestTransaction.providerCallback);
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
          providerCallback: mergeProviderMeta(latestTransaction.providerCallback, {
            finalizedAt: new Date().toISOString(),
            failureStage: "APPROVAL",
            disbursementState: "FAILED",
          }),
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

    const wallet = await getOrCreateWallet(req.user.id);
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

    return res.status(200).json({
      wallet: {
        balance: wallet.balance,
        totalDepositsThisMonth: totalDeposits._sum.amount ?? 0,
      },
      transactions: transactions.map(toClientTransaction),
    });
  } catch (error) {
    next(error);
  }
}

export async function initiateStk(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
) {
  try {
    const parsedBody = stkPushBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({ message: "Invalid payment payload." });
    }

    const config = getMpesaConfig();
    if (!config.isConfigured) {
      return res.status(500).json({
        message: `M-Pesa is not configured. Missing: ${config.missingVars.join(", ")}.`,
      });
    }

    const normalizedPhone = normalizePhoneNumber(parsedBody.data.phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        message: "Phone must be in Kenyan format like 2547XXXXXXXX.",
      });
    }

    const tokenData = await getMpesaAccessToken(config);
    const timestamp = getTimestamp();
    const password = Buffer.from(
      `${config.shortcode}${config.passkey}${timestamp}`,
    ).toString("base64");

    const stkPayload = {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: parsedBody.data.amount,
      PartyA: normalizedPhone,
      PartyB: config.shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: config.callbackUrl,
      AccountReference: parsedBody.data.accountReference ?? "BET-DEPOSIT",
      TransactionDesc: parsedBody.data.description ?? "Bet wallet deposit",
    };

    const stkPushResponse = await fetch(
      `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      },
    );

    const stkData = (await stkPushResponse.json()) as MpesaStkPushResponse;

    if (!stkPushResponse.ok || stkData.ResponseCode !== "0") {
      return res.status(502).json({
        message:
          stkData.errorMessage ?? "M-Pesa rejected the STK push request.",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const wallet = await getOrCreateWallet(req.user.id);
    const transaction = await prisma.walletTransaction.create({
      data: {
        userId: req.user.id,
        walletId: wallet.id,
        type: "DEPOSIT",
        status: "PENDING",
        amount: parsedBody.data.amount,
        currency: "KES",
        channel: "M-Pesa STK",
        reference:
          stkData.CheckoutRequestID ??
          stkData.MerchantRequestID ??
          `DEP-${Date.now()}`,
        checkoutRequestId: stkData.CheckoutRequestID ?? null,
        merchantRequestId: stkData.MerchantRequestID ?? null,
        phone: normalizedPhone,
        accountReference: parsedBody.data.accountReference ?? "BET-DEPOSIT",
        description: parsedBody.data.description ?? "Bet wallet deposit",
      },
    });

    emitWalletEvent({
      userId: req.user.id,
      transactionId: transaction.id,
      checkoutRequestId: transaction.checkoutRequestId,
      merchantRequestId: transaction.merchantRequestId,
      status: "PENDING",
      message:
        stkData.CustomerMessage ?? "Approve the STK prompt on your phone.",
      balance: wallet.balance,
      amount: transaction.amount,
    });

    return res.status(200).json({
      message: "STK push initiated successfully.",
      transactionId: transaction.id,
      merchantRequestId: stkData.MerchantRequestID,
      checkoutRequestId: stkData.CheckoutRequestID,
      customerMessage: stkData.CustomerMessage,
      wallet: {
        balance: wallet.balance,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function checkDepositStatus(
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const transactionId = Array.isArray(req.params.transactionId)
      ? req.params.transactionId[0]
      : req.params.transactionId;

    if (!transactionId) {
      return res.status(400).json({ message: "Invalid transaction id." });
    }

    const transaction = await prisma.walletTransaction.findFirst({
      where: {
        id: transactionId,
        userId: req.user.id,
        type: "DEPOSIT",
      },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    if (transaction.status !== "PENDING") {
      return res.status(200).json({
        transaction,
        transactionId: transaction.id,
        status: transaction.status,
        mpesaCode: transaction.providerReceiptNumber,
        message:
          transaction.status === "COMPLETED"
            ? "Deposit confirmed."
            : (transaction.providerResponseDescription ??
              "Payment not completed."),
      });
    }

    const config = getMpesaConfig();
    if (!config.isConfigured) {
      return res.status(500).json({
        message: `M-Pesa is not configured. Missing: ${config.missingVars.join(", ")}.`,
      });
    }

    if (!transaction.checkoutRequestId) {
      return res.status(200).json({
        transactionId: transaction.id,
        status: transaction.status,
        message: "Awaiting provider reference.",
      });
    }

    const tokenData = await getMpesaAccessToken(config);
    const timestamp = getTimestamp();
    const password = Buffer.from(
      `${config.shortcode}${config.passkey}${timestamp}`,
    ).toString("base64");

    const queryPayload = {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: transaction.checkoutRequestId,
    };

    const queryResponse = await fetch(
      `${config.baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queryPayload),
      },
    );

    const queryData = (await queryResponse.json()) as MpesaStkQueryResponse;

    if (!queryResponse.ok || queryData.ResponseCode !== "0") {
      return res.status(200).json({
        transactionId: transaction.id,
        status: "PENDING",
        message:
          queryData.errorMessage ?? "Still waiting for M-Pesa confirmation.",
      });
    }

    return res.status(200).json({
      transactionId: transaction.id,
      status: transaction.status,
      mpesaCode: transaction.providerReceiptNumber,
      message:
        transaction.providerResponseDescription ?? "Payment not completed.",
    });
  } catch (error) {
    next(error);
  }
}

export async function handleMpesaCallback(req: Request, res: Response) {
  const parsedBody = mpesaCallbackSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const callback = parsedBody.data.Body.stkCallback;
  const resultCode = Number(callback.ResultCode ?? NaN);
  const resultDesc = callback.ResultDesc ?? "Missing ResultDesc";
  const checkoutRequestId = callback.CheckoutRequestID;
  const callbackItems = callback.CallbackMetadata?.Item ?? [];

  const mpesaReceiptValue = getValue(
    callbackItems as MpesaCallbackItem[],
    "MpesaReceiptNumber",
  );
  const mpesaReceiptNumber = normalizeCallbackValue(mpesaReceiptValue);

  void (async () => {
    if (!checkoutRequestId) {
      return;
    }

    const matchedTransaction = await prisma.walletTransaction.findFirst({
      where: {
        checkoutRequestId,
        type: "DEPOSIT",
      },
      include: {
        wallet: true,
      },
    });

    if (!matchedTransaction) {
      return;
    }

    if (resultCode === 0) {
      if (
        matchedTransaction.status === "COMPLETED" &&
        !matchedTransaction.providerReceiptNumber &&
        mpesaReceiptNumber
      ) {
        await prisma.walletTransaction.update({
          where: { id: matchedTransaction.id },
          data: {
            providerReceiptNumber: mpesaReceiptNumber,
          },
        });
      }

      const updatedWallet = await prisma.$transaction(async (tx) => {
        const latestTransaction = await tx.walletTransaction.findUnique({
          where: { id: matchedTransaction.id },
          select: {
            status: true,
            amount: true,
            walletId: true,
            userId: true,
          },
        });

        if (!latestTransaction || latestTransaction.status !== "PENDING") {
          return null;
        }

        await tx.walletTransaction.update({
          where: { id: matchedTransaction.id },
          data: {
            status: "COMPLETED",
            providerResponseCode: String(resultCode),
            providerResponseDescription: resultDesc,
            providerCallback: callback as never,
            processedAt: new Date(),
          },
        });

        const wallet = latestTransaction.walletId
          ? await tx.wallet.findUnique({
              where: { id: latestTransaction.walletId },
              select: { id: true },
            })
          : null;

        const ensuredWallet =
          wallet ??
          (await tx.wallet.create({
            data: {
              userId: latestTransaction.userId,
            },
            select: { id: true },
          }));

        return tx.wallet.update({
          where: { id: ensuredWallet.id },
          data: {
            balance: {
              increment: latestTransaction.amount,
            },
          },
          select: { balance: true },
        });
      });

      const latestSummary = await getWalletBalance(matchedTransaction.userId);

      emitWalletEvent({
        userId: matchedTransaction.userId,
        transactionId: matchedTransaction.id,
        checkoutRequestId: matchedTransaction.checkoutRequestId,
        merchantRequestId: matchedTransaction.merchantRequestId,
        mpesaCode: mpesaReceiptNumber,
        status: "COMPLETED",
        message: "Deposit confirmed and wallet updated.",
        balance: updatedWallet?.balance ?? latestSummary.balance,
        amount: matchedTransaction.amount,
      });

      await createDepositNotifications({
        userId: matchedTransaction.userId,
        transactionId: matchedTransaction.id,
        amount: matchedTransaction.amount,
        balance: updatedWallet?.balance ?? latestSummary.balance,
        mpesaCode: mpesaReceiptNumber,
        status: "COMPLETED",
      });
      return;
    }

    await prisma.walletTransaction.update({
      where: { id: matchedTransaction.id },
      data: {
        status: "FAILED",
        providerResponseCode: String(resultCode),
        providerResponseDescription: resultDesc,
        providerCallback: callback as never,
        processedAt: new Date(),
      },
    });

    const latestSummary = await getWalletBalance(matchedTransaction.userId);

    emitWalletEvent({
      userId: matchedTransaction.userId,
      transactionId: matchedTransaction.id,
      checkoutRequestId: matchedTransaction.checkoutRequestId,
      merchantRequestId: matchedTransaction.merchantRequestId,
      mpesaCode: null,
      status: "FAILED",
      message: resultDesc,
      balance: latestSummary.balance,
      amount: matchedTransaction.amount,
    });

    await createDepositNotifications({
      userId: matchedTransaction.userId,
      transactionId: matchedTransaction.id,
      amount: matchedTransaction.amount,
      balance: latestSummary.balance,
      status: "FAILED",
      failureReason: resultDesc,
    });
  })().catch((error) => {
    console.error("CRITICAL ERROR IN M-PESA CALLBACK PROCESSING:", error);
  });

  return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
}

export async function handleMpesaWithdrawalResult(
  req: Request,
  res: Response,
) {
  const result = req.body?.Result;
  if (!result || typeof result !== "object") {
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const originatorConversationId =
    typeof (result as { OriginatorConversationID?: unknown })
      .OriginatorConversationID === "string"
      ? (result as { OriginatorConversationID: string }).OriginatorConversationID
      : null;
  const responseConversationId =
    typeof (result as { ConversationID?: unknown }).ConversationID === "string"
      ? (result as { ConversationID: string }).ConversationID
      : null;
  const resultCode = Number((result as { ResultCode?: unknown }).ResultCode ?? NaN);
  const resultDesc =
    typeof (result as { ResultDesc?: unknown }).ResultDesc === "string"
      ? (result as { ResultDesc: string }).ResultDesc
      : "Unknown withdrawal result from M-Pesa.";
  const mpesaCode = extractB2CReceipt(req.body);

  void (async () => {
    if (!originatorConversationId) {
      return;
    }

    if (resultCode === 0) {
      await finalizeSuccessfulWithdrawal({
        transactionId: originatorConversationId,
        providerResponseCode: Number.isNaN(resultCode) ? null : String(resultCode),
        providerResponseDescription: resultDesc,
        mpesaCode,
        providerCallback: {
          result: req.body,
          conversationId: responseConversationId,
        } as never,
      });
      return;
    }

    await settleFailedWithdrawal({
      transactionId: originatorConversationId,
      failureReason: resultDesc,
      failureStage: "B2C_RESULT",
      providerResponseCode: Number.isNaN(resultCode) ? null : String(resultCode),
      providerResponseDescription: resultDesc,
      providerCallback: {
        result: req.body,
        conversationId: responseConversationId,
      } as never,
    });
  })().catch((error) => {
    console.error("CRITICAL ERROR IN M-PESA WITHDRAWAL RESULT PROCESSING:", error);
  });

  return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
}

export async function handleMpesaWithdrawalTimeout(
  req: Request,
  res: Response,
) {
  const originatorConversationId =
    typeof req.body?.OriginatorConversationID === "string"
      ? req.body.OriginatorConversationID
      : null;
  const resultDesc =
    typeof req.body?.ResultDesc === "string"
      ? req.body.ResultDesc
      : "Withdrawal request timed out before completion.";

  void (async () => {
    if (!originatorConversationId) {
      return;
    }

    await settleFailedWithdrawal({
      transactionId: originatorConversationId,
      failureReason: resultDesc,
      failureStage: "B2C_TIMEOUT",
      providerResponseDescription: resultDesc,
      providerCallback: req.body as never,
    });
  })().catch((error) => {
    console.error("CRITICAL ERROR IN M-PESA WITHDRAWAL TIMEOUT PROCESSING:", error);
  });

  return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
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

    return res.status(200).json({
      withdrawals: withdrawals.map((w) => ({
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
