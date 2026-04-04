import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { prisma } from "../lib/prisma";

type WalletTransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
type WalletTransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "BET_STAKE"
  | "BET_WIN"
  | "REFUND"
  | "BONUS";

type PaymentEvent = {
  transactionId: string;
  checkoutRequestId?: string | null;
  merchantRequestId?: string | null;
  status: WalletTransactionStatus;
  message: string;
  balance: number;
  amount: number;
};

const walletEventListeners = new Set<(event: PaymentEvent) => void>();

function emitWalletEvent(event: PaymentEvent) {
  for (const listener of walletEventListeners) {
    listener(event);
  }
}

const paymentRouter = Router();

const stkPushBodySchema = z.object({
  phone: z.string().trim().min(10),
  amount: z.number().int().positive(),
  accountReference: z.string().trim().min(2).max(20).optional(),
  description: z.string().trim().min(2).max(40).optional(),
});

type MpesaAuthTokenResponse = {
  access_token: string;
  expires_in: string;
};

type MpesaStkPushResponse = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
  errorMessage?: string;
};

const mpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string().optional(),
      CheckoutRequestID: z.string().optional(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z
        .object({
          Item: z
            .array(
              z.object({
                Name: z.string(),
                Value: z.union([z.string(), z.number()]).optional(),
              }),
            )
            .optional(),
        })
        .optional(),
    }),
  }),
});

function toTransactionType(value: WalletTransactionType) {
  switch (value) {
    case "DEPOSIT":
      return "deposit";
    case "WITHDRAWAL":
      return "withdrawal";
    case "BET_STAKE":
      return "bet-stake";
    case "BET_WIN":
      return "bet-win";
    case "REFUND":
      return "refund";
    case "BONUS":
      return "bonus";
  }
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

async function getOrCreateWallet(userId: string) {
  const existingWallet = await prisma.wallet.findUnique({ where: { userId } });
  if (existingWallet) return existingWallet;

  return prisma.wallet.create({
    data: {
      userId,
    },
  });
}

async function getWalletSummary(userId: string) {
  const wallet = await getOrCreateWallet(userId);
  const aggregate = await prisma.walletTransaction.aggregate({
    where: {
      userId,
      status: "COMPLETED",
    },
    _sum: {
      amount: true,
    },
  });

  return {
    balance: wallet.balance,
    totalCompletedDeposits: aggregate._sum.amount ?? 0,
  };
}

function toClientTransaction(transaction: {
  id: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: number;
  currency: string;
  channel: string;
  reference: string;
  createdAt: Date;
}) {
  return {
    id: transaction.id,
    type: toTransactionType(transaction.type),
    status: toTransactionStatus(transaction.status),
    amount: transaction.amount,
    currency: transaction.currency,
    channel: transaction.channel,
    reference: transaction.reference,
    createdAt: transaction.createdAt.toISOString(),
  };
}

function normalizePhoneNumber(phone: string) {
  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.startsWith("0") && digitsOnly.length === 10) {
    return `254${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.startsWith("7") && digitsOnly.length === 9) {
    return `254${digitsOnly}`;
  }

  if (digitsOnly.startsWith("254") && digitsOnly.length === 12) {
    return digitsOnly;
  }

  return null;
}

function getMpesaConfig() {
  const env =
    process.env.MPESA_ENV?.toLowerCase() === "live" ? "live" : "sandbox";
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  const missingVars: string[] = [];

  if (!consumerKey) {
    missingVars.push("MPESA_CONSUMER_KEY");
  }

  if (!consumerSecret) {
    missingVars.push("MPESA_CONSUMER_SECRET");
  }

  if (!shortcode) {
    missingVars.push("MPESA_SHORTCODE");
  }

  if (!passkey) {
    missingVars.push("MPESA_PASSKEY");
  }

  if (!callbackUrl) {
    missingVars.push("MPESA_CALLBACK_URL");
  }

  if (missingVars.length > 0) {
    return {
      isConfigured: false as const,
      missingVars,
    };
  }

  const baseUrl =
    env === "live"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  return {
    isConfigured: true as const,
    baseUrl,
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    callbackUrl,
  };
}

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hour}${minute}${second}`;
}

paymentRouter.post("/payments/mpesa/callback", (req, res) => {
  const parsedBody = mpesaCallbackSchema.safeParse(req.body);

  if (!parsedBody.success) {
    console.warn("Invalid M-Pesa callback payload received.", req.body);
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const callback = parsedBody.data.Body.stkCallback;
  console.log("M-Pesa callback received", {
    merchantRequestId: callback.MerchantRequestID,
    checkoutRequestId: callback.CheckoutRequestID,
    resultCode: callback.ResultCode,
    resultDesc: callback.ResultDesc,
    callbackMetadata: callback.CallbackMetadata?.Item ?? [],
  });

  void (async () => {
    const checkoutRequestId = callback.CheckoutRequestID;
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

    if (!matchedTransaction || matchedTransaction.status !== "PENDING") {
      return;
    }

    const callbackItems = callback.CallbackMetadata?.Item ?? [];
    const receiptNumber = callbackItems.find(
      (item) => item.Name === "MpesaReceiptNumber",
    )?.Value;

    if (callback.ResultCode === 0) {
      const wallet =
        matchedTransaction.wallet ??
        (await getOrCreateWallet(matchedTransaction.userId));
      const updatedWallet = await prisma.$transaction(async (tx) => {
        await tx.walletTransaction.update({
          where: { id: matchedTransaction.id },
          data: {
            status: "COMPLETED",
            providerReceiptNumber:
              typeof receiptNumber === "string"
                ? receiptNumber
                : typeof receiptNumber === "number"
                  ? String(receiptNumber)
                  : null,
            providerResponseCode: String(callback.ResultCode),
            providerResponseDescription: callback.ResultDesc,
            providerCallback: callback as never,
            processedAt: new Date(),
          },
        });

        return tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: matchedTransaction.amount,
            },
          },
        });
      });

      emitWalletEvent({
        transactionId: matchedTransaction.id,
        checkoutRequestId,
        merchantRequestId: callback.MerchantRequestID,
        status: "COMPLETED",
        message: "Deposit confirmed and wallet updated.",
        balance: updatedWallet.balance,
        amount: matchedTransaction.amount,
      });
      return;
    }

    await prisma.walletTransaction.update({
      where: { id: matchedTransaction.id },
      data: {
        status: "FAILED",
        providerResponseCode: String(callback.ResultCode),
        providerResponseDescription: callback.ResultDesc,
        providerCallback: callback as never,
        processedAt: new Date(),
      },
    });

    emitWalletEvent({
      transactionId: matchedTransaction.id,
      checkoutRequestId,
      merchantRequestId: callback.MerchantRequestID,
      status: "FAILED",
      message: callback.ResultDesc,
      balance: (await getWalletSummary(matchedTransaction.userId)).balance,
      amount: matchedTransaction.amount,
    });
  })().catch((error) => {
    console.error("Failed to process M-Pesa callback.", error);
  });

  return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
});

paymentRouter.get(
  "/payments/wallet/summary",
  authenticate,
  async (req, res, next) => {
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
  },
);

paymentRouter.get("/payments/wallet/stream", authenticate, async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const summary = await getWalletSummary(req.user.id);

  res.status(200).setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: PaymentEvent) => {
    res.write(`event: wallet-update\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const heartbeat = setInterval(() => {
    res.write(`event: ping\n`);
    res.write(`data: ${JSON.stringify({ time: Date.now() })}\n\n`);
  }, 25000);

  const listener = (event: PaymentEvent) => {
    send(event);
  };

  walletEventListeners.add(listener);
  send({
    transactionId: "",
    checkoutRequestId: null,
    merchantRequestId: null,
    status: "PENDING",
    message: "Connected to live wallet updates.",
    balance: summary.balance,
    amount: 0,
  });

  req.on("close", () => {
    clearInterval(heartbeat);
    walletEventListeners.delete(listener);
    res.end();
  });
});

paymentRouter.post(
  "/payments/mpesa/stk-push",
  authenticate,
  async (req, res, next) => {
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

      const authHeader = Buffer.from(
        `${config.consumerKey}:${config.consumerSecret}`,
      ).toString("base64");

      const tokenResponse = await fetch(
        `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${authHeader}`,
          },
        },
      );

      if (!tokenResponse.ok) {
        return res.status(502).json({
          message: "Could not authenticate with M-Pesa API.",
        });
      }

      const tokenData = (await tokenResponse.json()) as MpesaAuthTokenResponse;

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

      const authenticatedUser = req.user;
      if (!authenticatedUser?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = authenticatedUser.id;

      const wallet = await getOrCreateWallet(userId);
      const transaction = await prisma.walletTransaction.create({
        data: {
          userId,
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
  },
);

export { paymentRouter };
