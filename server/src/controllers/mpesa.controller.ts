import type { Request, Response } from "express";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getOrCreateWallet } from "../lib/wallet";
import { emitWalletUpdate } from "../lib/socket";
import { createDepositNotifications } from "./notifications.controller";
import { getSystemSettings } from "../lib/settings";
import {
  getMpesaAccessToken,
  getMpesaConfig,
  getTimestamp,
  mpesaCallbackSchema,
  normalizePhoneNumber,
  stkPushBodySchema,
  type MpesaStkPushResponse,
  type MpesaStkQueryResponse,
} from "../lib/mpesa";

const mpesaDepositSchema = stkPushBodySchema;

const mpesaStatusParamsSchema = z.object({
  transactionId: z.string().uuid(),
});

type MpesaDepositResult =
  | {
      status: "completed";
      message: string;
      transactionId: string;
      amount: number;
      mpesaCode?: string | null;
      processedAt: Date;
    }
  | {
      status: "pending" | "failed";
      message: string;
      transactionId: string;
      amount: number;
      mpesaCode?: string | null;
      processedAt?: Date | null;
    };

function toSafeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function buildMpesaPassword(shortcode: string, passkey: string, timestamp: string) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

function mapDbStatus(status: string): MpesaDepositResult["status"] {
  switch (status) {
    case "COMPLETED":
      return "completed";
    case "FAILED":
    case "REVERSED":
      return "failed";
    default:
      return "pending";
  }
}

function isPendingQueryResult(resultCode?: string) {
  return ["", "1037", "1025", "9999"].includes((resultCode ?? "").trim());
}


async function finalizeSuccessfulMpesaDeposit(args: {
  transactionId: string;
  providerReceiptNumber?: string | null;
  providerResponseCode?: string | null;
  providerResponseDescription?: string | null;
  providerCallback?: Prisma.InputJsonValue;
}) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.walletTransaction.findUnique({
      where: { id: args.transactionId },
      include: { wallet: true },
    });

    if (!transaction || transaction.type !== "DEPOSIT") {
      return null;
    }

    if (transaction.status === "COMPLETED") {
      const wallet = await getOrCreateWallet(transaction.userId, tx);
      return {
        transaction,
        balance: wallet.balance,
      };
    }

    if (transaction.status === "FAILED" || transaction.status === "REVERSED") {
      return null;
    }

    const settings = await getSystemSettings();
    const { depositTaxPercent } = settings.taxAndFinancialRules;
    const taxAmount = (transaction.amount * depositTaxPercent) / 100;
    const netAmount = transaction.amount - taxAmount;

    const wallet = transaction.wallet ?? (await getOrCreateWallet(transaction.userId, tx));
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: netAmount,
        },
      },
      select: { balance: true },
    });

    const updatedTransaction = await tx.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        walletId: wallet.id,
        status: "COMPLETED",
        processedAt: new Date(),
        providerCallback: {
          ...(transaction.providerCallback as any),
          ...(args.providerCallback as any),
          netAmount,
          taxAmount,
          depositTaxPercent,
        },
        providerReceiptNumber:
          args.providerReceiptNumber ?? transaction.providerReceiptNumber ?? undefined,
        providerResponseCode:
          args.providerResponseCode ?? transaction.providerResponseCode ?? undefined,
        providerResponseDescription:
          args.providerResponseDescription ??
          transaction.providerResponseDescription ??
          "M-Pesa payment completed successfully.",
      },
    });

    emitWalletUpdate(transaction.userId, {
      transactionId: updatedTransaction.id,
      checkoutRequestId: updatedTransaction.checkoutRequestId,
      merchantRequestId: updatedTransaction.merchantRequestId,
      mpesaCode: updatedTransaction.providerReceiptNumber,
      status: "COMPLETED",
      message: `M-Pesa deposit completed successfully.${taxAmount > 0 ? ` Tax of KES ${taxAmount} deducted.` : ""}`,
      balance: updatedWallet.balance,
      amount: netAmount,
    });

    await createDepositNotifications({
      userId: updatedTransaction.userId,
      transactionId: updatedTransaction.id,
      amount: updatedTransaction.amount,
      balance: updatedWallet.balance,
      mpesaCode: updatedTransaction.providerReceiptNumber,
      status: "COMPLETED",
    });

    return {
      transaction: updatedTransaction,
      balance: updatedWallet.balance,
    };
  });
}

async function finalizeFailedMpesaDeposit(args: {
  transactionId: string;
  providerResponseCode?: string | null;
  providerResponseDescription?: string | null;
  providerCallback?: Prisma.InputJsonValue;
}) {
  const transaction = await prisma.walletTransaction.findUnique({
    where: { id: args.transactionId },
    include: { wallet: true },
  });

  if (!transaction || transaction.type !== "DEPOSIT") {
    return null;
  }

  if (transaction.status === "FAILED" || transaction.status === "REVERSED") {
    const wallet = await getOrCreateWallet(transaction.userId);
    return {
      transaction,
      balance: wallet.balance,
    };
  }

  if (transaction.status === "COMPLETED") {
    return null;
  }

  const updatedTransaction = await prisma.walletTransaction.update({
    where: { id: transaction.id },
    data: {
      status: "FAILED",
      processedAt: new Date(),
      providerResponseCode:
        args.providerResponseCode ?? transaction.providerResponseCode ?? undefined,
      providerResponseDescription:
        args.providerResponseDescription ??
        transaction.providerResponseDescription ??
        "M-Pesa payment failed.",
      providerCallback: args.providerCallback ?? transaction.providerCallback ?? undefined,
    },
  });

  const wallet = await getOrCreateWallet(transaction.userId);

  emitWalletUpdate(transaction.userId, {
    transactionId: updatedTransaction.id,
    checkoutRequestId: updatedTransaction.checkoutRequestId,
    merchantRequestId: updatedTransaction.merchantRequestId,
    mpesaCode: updatedTransaction.providerReceiptNumber,
    status: "FAILED",
    message:
      updatedTransaction.providerResponseDescription ?? "M-Pesa payment failed.",
    balance: wallet.balance,
    amount: updatedTransaction.amount,
  });

  await createDepositNotifications({
    userId: updatedTransaction.userId,
    transactionId: updatedTransaction.id,
    amount: updatedTransaction.amount,
    balance: wallet.balance,
    mpesaCode: updatedTransaction.providerReceiptNumber,
    status: "FAILED",
    failureReason:
      updatedTransaction.providerResponseDescription ?? "M-Pesa payment failed.",
  });

  return {
    transaction: updatedTransaction,
    balance: wallet.balance,
  };
}

function extractCallbackMetadata(
  items:
    | Array<{
        Name: string;
        Value?: string | number;
      }>
    | undefined,
) {
  const values = new Map(items?.map((item) => [item.Name, item.Value]) ?? []);

  return {
    amount:
      typeof values.get("Amount") === "number"
        ? Number(values.get("Amount"))
        : undefined,
    mpesaCode:
      typeof values.get("MpesaReceiptNumber") === "string"
        ? String(values.get("MpesaReceiptNumber"))
        : null,
    phone:
      typeof values.get("PhoneNumber") === "number"
        ? String(values.get("PhoneNumber"))
        : typeof values.get("PhoneNumber") === "string"
          ? String(values.get("PhoneNumber"))
          : null,
    transactionDate:
      typeof values.get("TransactionDate") === "number"
        ? String(values.get("TransactionDate"))
        : typeof values.get("TransactionDate") === "string"
          ? String(values.get("TransactionDate"))
          : null,
  };
}

async function queryMpesaTransaction(transactionId: string): Promise<MpesaDepositResult> {
  const transaction = await prisma.walletTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction || transaction.type !== "DEPOSIT" || transaction.channel !== "mpesa") {
    throw new Error("Transaction not found");
  }

  const currentStatus = mapDbStatus(transaction.status);
  if (
    currentStatus === "completed" ||
    currentStatus === "failed" ||
    !transaction.checkoutRequestId
  ) {
    if (currentStatus === "completed") {
      return {
        status: "completed",
        message: transaction.providerResponseDescription ?? "Payment completed.",
        transactionId: transaction.id,
        amount: transaction.amount,
        mpesaCode: transaction.providerReceiptNumber,
        processedAt: transaction.processedAt ?? new Date(),
      };
    }

    return {
      status: currentStatus === "failed" ? "failed" : "pending",
      message:
        transaction.providerResponseDescription ??
        (currentStatus === "failed"
          ? "Payment failed."
          : "Payment is still pending."),
      transactionId: transaction.id,
      amount: transaction.amount,
      mpesaCode: transaction.providerReceiptNumber,
      processedAt: transaction.processedAt,
    };
  }

  const config = getMpesaConfig();
  if (!config.isConfigured) {
    return {
      status: "pending",
      message: `M-Pesa query is not configured: ${config.missingVars.join(", ")}`,
      transactionId: transaction.id,
      amount: transaction.amount,
      mpesaCode: transaction.providerReceiptNumber,
      processedAt: transaction.processedAt,
    };
  }

  try {
    const token = await getMpesaAccessToken(config);
    const timestamp = getTimestamp();
    const password = buildMpesaPassword(
      config.shortcode,
      config.passkey,
      timestamp,
    );

    const response = await fetch(`${config.baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: config.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: transaction.checkoutRequestId,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as MpesaStkQueryResponse;

    if (!response.ok) {
      throw new Error(
        data.errorMessage ||
          data.ResponseDescription ||
          `M-Pesa status query failed with ${response.status}`,
      );
    }

    if (String(data.ResultCode ?? "") === "0") {
      const result = await finalizeSuccessfulMpesaDeposit({
        transactionId: transaction.id,
        providerResponseCode: data.ResultCode ?? data.ResponseCode ?? "0",
        providerResponseDescription:
          data.ResultDesc ??
          data.ResponseDescription ??
          "M-Pesa payment completed.",
        providerCallback: toSafeJson({
          provider: "mpesa",
          query: data,
        }),
      });

      return {
        status: "completed",
        message:
          result?.transaction.providerResponseDescription ??
          "M-Pesa payment completed successfully.",
        transactionId: transaction.id,
        amount: transaction.amount,
        mpesaCode: result?.transaction.providerReceiptNumber,
        processedAt: result?.transaction.processedAt ?? new Date(),
      };
    }

    if (isPendingQueryResult(data.ResultCode)) {
      return {
        status: "pending",
        message:
          data.ResultDesc ??
          data.ResponseDescription ??
          "Awaiting confirmation on your phone.",
        transactionId: transaction.id,
        amount: transaction.amount,
        mpesaCode: transaction.providerReceiptNumber,
        processedAt: transaction.processedAt,
      };
    }

    const failed = await finalizeFailedMpesaDeposit({
      transactionId: transaction.id,
      providerResponseCode: data.ResultCode ?? data.ResponseCode ?? null,
      providerResponseDescription:
        data.ResultDesc ?? data.ResponseDescription ?? "M-Pesa payment failed.",
      providerCallback: toSafeJson({
        provider: "mpesa",
        query: data,
      }),
    });

    return {
      status: "failed",
      message:
        failed?.transaction.providerResponseDescription ?? "M-Pesa payment failed.",
      transactionId: transaction.id,
      amount: transaction.amount,
      mpesaCode: failed?.transaction.providerReceiptNumber,
      processedAt: failed?.transaction.processedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "M-Pesa status query failed.";

    console.error("[M-Pesa Status] Query failed, falling back to pending state:", {
      transactionId,
      message,
    });

    return {
      status: "pending",
      message:
        "We're still waiting for M-Pesa confirmation. If you've already approved the prompt, please retry in a moment.",
      transactionId: transaction.id,
      amount: transaction.amount,
      mpesaCode: transaction.providerReceiptNumber,
      processedAt: transaction.processedAt,
    };
  }
}

export async function initializeMpesaDeposit(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const body = mpesaDepositSchema.parse(req.body);
    const settings = await getSystemSettings();
    const { minDeposit, maxDeposit } = settings.userDefaultsAndRestrictions;
    const mpesaEnabled = settings.paymentsConfig.methods.mpesa;

    if (!mpesaEnabled) {
      res.status(403).json({ message: "M-Pesa deposits are currently disabled." });
      return;
    }

    if (body.amount < minDeposit) {
      res.status(400).json({
        message: `Minimum deposit is KES ${minDeposit.toLocaleString()}.`,
      });
      return;
    }

    if (body.amount > maxDeposit) {
      res.status(400).json({
        message: `Maximum deposit is KES ${maxDeposit.toLocaleString()}.`,
      });
      return;
    }

    const phone = normalizePhoneNumber(body.phone);
    if (!phone) {
      res.status(400).json({ message: "Phone must be in format 2547XXXXXXXX." });
      return;
    }

    const config = getMpesaConfig();
    if (!config.isConfigured) {
      res.status(500).json({
        message: `M-Pesa is not configured: ${config.missingVars.join(", ")}`,
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true },
    });

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const wallet = await getOrCreateWallet(user.id);
    const token = await getMpesaAccessToken(config);
    const timestamp = getTimestamp();
    const password = buildMpesaPassword(config.shortcode, config.passkey, timestamp);

    const response = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: body.amount,
        PartyA: phone,
        PartyB: config.shortcode,
        PhoneNumber: phone,
        CallBackURL: config.callbackUrl,
        AccountReference: body.accountReference ?? "BETWISE",
        TransactionDesc: body.description ?? "BetWise wallet deposit",
      }),
    });

    const data = (await response.json().catch(() => ({}))) as MpesaStkPushResponse;

    if (!response.ok || data.ResponseCode !== "0") {
      res.status(502).json({
        message:
          data.errorMessage ||
          data.ResponseDescription ||
          "Unable to start M-Pesa STK push.",
      });
      return;
    }

    const transaction = await prisma.walletTransaction.create({
      data: {
        userId: user.id,
        walletId: wallet.id,
        type: "DEPOSIT",
        status: "PENDING",
        amount: body.amount,
        currency: "KES",
        channel: "mpesa",
        reference: `MPESA-${randomUUID()}`,
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
        phone,
        accountReference: body.accountReference ?? "BETWISE",
        description: body.description ?? "M-Pesa wallet deposit",
        providerResponseCode: data.ResponseCode,
        providerResponseDescription:
          data.CustomerMessage ?? data.ResponseDescription ?? "STK push sent.",
        providerCallback: toSafeJson({
          provider: "mpesa",
          initiatedAt: new Date().toISOString(),
          request: {
            amount: body.amount,
            phone,
            accountReference: body.accountReference ?? "BETWISE",
            description: body.description ?? "BetWise wallet deposit",
          },
          response: data,
        }),
      },
    });

    emitWalletUpdate(user.id, {
      transactionId: transaction.id,
      checkoutRequestId: transaction.checkoutRequestId,
      merchantRequestId: transaction.merchantRequestId,
      status: "PENDING",
      message: data.CustomerMessage ?? "Enter your M-Pesa PIN to complete the deposit.",
      balance: wallet.balance,
      amount: transaction.amount,
    });

    res.status(200).json({
      message: data.CustomerMessage ?? "STK push sent successfully.",
      transactionId: transaction.id,
      merchantRequestId: transaction.merchantRequestId,
      checkoutRequestId: transaction.checkoutRequestId,
      customerMessage: data.CustomerMessage ?? null,
      wallet: {
        balance: wallet.balance,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: error.issues.map((issue) => issue.message).join("; "),
      });
      return;
    }

    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to start M-Pesa deposit.",
    });
  }
}

export async function checkMpesaDepositStatus(req: Request, res: Response) {
  try {
    const { transactionId } = mpesaStatusParamsSchema.parse(req.params);
    const result = await queryMpesaTransaction(transactionId);

    res.status(200).json({
      transactionId: result.transactionId,
      status:
        result.status === "completed"
          ? "COMPLETED"
          : result.status === "failed"
            ? "FAILED"
            : "PENDING",
      mpesaCode: result.mpesaCode ?? null,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid transaction id." });
      return;
    }

    res.status(200).json({
      transactionId: req.params.transactionId,
      status: "PENDING",
      mpesaCode: null,
      message:
        "We're still waiting for M-Pesa confirmation. Please try again shortly.",
    });
  }
}

export async function handleMpesaDepositCallback(req: Request, res: Response) {
  try {
    const payload = mpesaCallbackSchema.parse(req.body);
    const callback = payload.Body.stkCallback;

    const transaction = await prisma.walletTransaction.findFirst({
      where: {
        OR: [
          callback.CheckoutRequestID
            ? { checkoutRequestId: callback.CheckoutRequestID }
            : undefined,
          callback.MerchantRequestID
            ? { merchantRequestId: callback.MerchantRequestID }
            : undefined,
        ].filter(Boolean) as Prisma.WalletTransactionWhereInput[],
        type: "DEPOSIT",
        channel: "mpesa",
      },
    });

    if (!transaction) {
      res.status(200).json({ message: "Callback received." });
      return;
    }

    const metadata = extractCallbackMetadata(callback.CallbackMetadata?.Item);
    const providerCallback = toSafeJson({
      provider: "mpesa",
      callback: payload,
    });

    if (String(callback.ResultCode ?? "") === "0") {
      await finalizeSuccessfulMpesaDeposit({
        transactionId: transaction.id,
        providerReceiptNumber: metadata.mpesaCode,
        providerResponseCode: String(callback.ResultCode ?? "0"),
        providerResponseDescription:
          callback.ResultDesc ?? "M-Pesa payment completed successfully.",
        providerCallback,
      });
    } else {
      await finalizeFailedMpesaDeposit({
        transactionId: transaction.id,
        providerResponseCode:
          callback.ResultCode !== undefined ? String(callback.ResultCode) : null,
        providerResponseDescription:
          callback.ResultDesc ?? "M-Pesa payment failed.",
        providerCallback,
      });
    }

    res.status(200).json({ message: "Callback processed." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Invalid callback payload." });
      return;
    }

    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Failed to process callback.",
    });
  }
}
