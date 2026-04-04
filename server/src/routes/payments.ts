import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { prisma } from "../lib/prisma";
import { emitNotificationUpdate, emitWalletUpdate } from "../lib/socket";

type WalletTransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
type WalletTransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "BET_STAKE"
  | "BET_WIN"
  | "REFUND"
  | "BONUS";

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

async function createDepositNotifications(args: {
  userId: string;
  transactionId: string;
  amount: number;
  balance: number;
  mpesaCode?: string | null;
  status: "COMPLETED" | "FAILED";
  failureReason?: string;
}) {
  const [userProfile, adminUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: args.userId },
      select: { phone: true, email: true },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    }),
  ]);

  const normalizedMpesaCode = args.mpesaCode ?? null;
  const codeSuffix = normalizedMpesaCode
    ? ` M-Pesa code: ${normalizedMpesaCode}.`
    : "";
  const userIdentifier = userProfile?.phone ?? userProfile?.email ?? args.userId;
  const isSuccess = args.status === "COMPLETED";

  const userTitle = isSuccess ? "Deposit Successful" : "Deposit Failed";
  const userMessage = isSuccess
    ? `You deposited KES ${args.amount.toLocaleString()}. Your new balance is KES ${args.balance.toLocaleString()}.${codeSuffix}`
    : `Your deposit request for KES ${args.amount.toLocaleString()} failed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""}`;

  const adminTitle = isSuccess
    ? "New Customer Deposit"
    : "Customer Deposit Failed";
  const adminMessage = isSuccess
    ? `${userIdentifier} deposited KES ${args.amount.toLocaleString()}. Updated wallet balance: KES ${args.balance.toLocaleString()}.${codeSuffix}`
    : `${userIdentifier} had a failed deposit request of KES ${args.amount.toLocaleString()}.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""}`;

  const notificationType: "DEPOSIT_SUCCESS" | "DEPOSIT_FAILED" = isSuccess
    ? "DEPOSIT_SUCCESS"
    : "DEPOSIT_FAILED";
  const createdAtIso = new Date().toISOString();

  const createPayload = [
    {
      userId: args.userId,
      audience: "USER" as const,
      type: notificationType,
      title: userTitle,
      message: userMessage,
      transactionId: args.transactionId,
      amount: args.amount,
      balance: args.balance,
      mpesaCode: normalizedMpesaCode,
    },
    ...adminUsers.map((admin) => ({
      userId: admin.id,
      audience: "ADMIN" as const,
      type: notificationType,
      title: adminTitle,
      message: adminMessage,
      transactionId: args.transactionId,
      amount: args.amount,
      balance: args.balance,
      mpesaCode: normalizedMpesaCode,
    })),
  ];

  const created = await prisma.notification.createMany({
    data: createPayload,
    skipDuplicates: true,
  });

  if (created.count === 0) {
    return;
  }

  emitNotificationUpdate(args.userId, {
    audience: "USER",
    type: notificationType,
    title: userTitle,
    message: userMessage,
    transactionId: args.transactionId,
    amount: args.amount,
    balance: args.balance,
    mpesaCode: normalizedMpesaCode,
    createdAt: createdAtIso,
  });

  for (const admin of adminUsers) {
    emitNotificationUpdate(admin.id, {
      audience: "ADMIN",
      type: notificationType,
      title: adminTitle,
      message: adminMessage,
      transactionId: args.transactionId,
      amount: args.amount,
      balance: args.balance,
      mpesaCode: normalizedMpesaCode,
      createdAt: createdAtIso,
    });
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

type MpesaStkQueryResponse = {
  ResponseCode?: string;
  ResponseDescription?: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: string;
  ResultDesc?: string;
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
  providerReceiptNumber: string | null;
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
    mpesaCode: transaction.providerReceiptNumber,
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
    consumerKey: consumerKey as string,
    consumerSecret: consumerSecret as string,
    shortcode: shortcode as string,
    passkey: passkey as string,
    callbackUrl: callbackUrl as string,
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

async function getMpesaAccessToken(config: {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
}) {
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
    throw new Error("Could not authenticate with M-Pesa API.");
  }

  return (await tokenResponse.json()) as MpesaAuthTokenResponse;
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

    if (!matchedTransaction) {
      return;
    }

    const callbackItems = callback.CallbackMetadata?.Item ?? [];
    const receiptNumber = callbackItems.find(
      (item) => item.Name === "MpesaReceiptNumber",
    )?.Value;

    if (callback.ResultCode === 0) {
      const normalizedReceiptNumber =
        typeof receiptNumber === "string"
          ? receiptNumber
          : typeof receiptNumber === "number"
            ? String(receiptNumber)
            : null;

      if (
        matchedTransaction.status === "COMPLETED" &&
        !matchedTransaction.providerReceiptNumber &&
        normalizedReceiptNumber
      ) {
        await prisma.walletTransaction.update({
          where: { id: matchedTransaction.id },
          data: {
            providerReceiptNumber: normalizedReceiptNumber,
            providerResponseCode: String(callback.ResultCode),
            providerResponseDescription: callback.ResultDesc,
            providerCallback: callback as never,
          },
        });

        emitWalletEvent({
          userId: matchedTransaction.userId,
          transactionId: matchedTransaction.id,
          checkoutRequestId,
          merchantRequestId: callback.MerchantRequestID,
          mpesaCode: normalizedReceiptNumber,
          status: "COMPLETED",
          message: "Deposit confirmed and wallet updated.",
          balance: (await getWalletSummary(matchedTransaction.userId)).balance,
          amount: matchedTransaction.amount,
        });
      }

      if (matchedTransaction.status !== "PENDING") {
        return;
      }

      const wallet =
        matchedTransaction.wallet ??
        (await getOrCreateWallet(matchedTransaction.userId));
      const updatedWallet = await prisma.$transaction(async (tx) => {
        await tx.walletTransaction.update({
          where: { id: matchedTransaction.id },
          data: {
            status: "COMPLETED",
            providerReceiptNumber: normalizedReceiptNumber,
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
        userId: matchedTransaction.userId,
        transactionId: matchedTransaction.id,
        checkoutRequestId,
        merchantRequestId: callback.MerchantRequestID,
        mpesaCode: normalizedReceiptNumber,
        status: "COMPLETED",
        message: "Deposit confirmed and wallet updated.",
        balance: updatedWallet.balance,
        amount: matchedTransaction.amount,
      });

      await createDepositNotifications({
        userId: matchedTransaction.userId,
        transactionId: matchedTransaction.id,
        amount: matchedTransaction.amount,
        balance: updatedWallet.balance,
        mpesaCode: normalizedReceiptNumber,
        status: "COMPLETED",
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

    const latestSummary = await getWalletSummary(matchedTransaction.userId);

    emitWalletEvent({
      userId: matchedTransaction.userId,
      transactionId: matchedTransaction.id,
      checkoutRequestId,
      merchantRequestId: callback.MerchantRequestID,
      mpesaCode: null,
      status: "FAILED",
      message: callback.ResultDesc,
      balance: latestSummary.balance,
      amount: matchedTransaction.amount,
    });

    await createDepositNotifications({
      userId: matchedTransaction.userId,
      transactionId: matchedTransaction.id,
      amount: matchedTransaction.amount,
      balance: latestSummary.balance,
      status: "FAILED",
      failureReason: callback.ResultDesc,
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
        userId,
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

paymentRouter.get(
  "/payments/mpesa/status/:transactionId",
  authenticate,
  async (req, res, next) => {
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

      const resultCode = String(queryData.ResultCode ?? "");
      const resultDesc = queryData.ResultDesc ?? "Awaiting customer action.";

      if (resultCode === "0") {
        const updatedWallet = await prisma.$transaction(async (tx) => {
          const latestTransaction = await tx.walletTransaction.findUnique({
            where: { id: transaction.id },
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
            where: { id: transaction.id },
            data: {
              status: "COMPLETED",
              providerResponseCode: resultCode,
              providerResponseDescription: resultDesc,
              providerCallback: queryData as never,
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

        const latestSummary = await getWalletSummary(req.user.id);
        emitWalletEvent({
          userId: req.user.id,
          transactionId: transaction.id,
          checkoutRequestId: transaction.checkoutRequestId,
          merchantRequestId: transaction.merchantRequestId,
          mpesaCode: transaction.providerReceiptNumber,
          status: "COMPLETED",
          message: "Deposit confirmed and wallet updated.",
          balance: updatedWallet?.balance ?? latestSummary.balance,
          amount: transaction.amount,
        });

        await createDepositNotifications({
          userId: req.user.id,
          transactionId: transaction.id,
          amount: transaction.amount,
          balance: updatedWallet?.balance ?? latestSummary.balance,
          mpesaCode: transaction.providerReceiptNumber,
          status: "COMPLETED",
        });

        return res.status(200).json({
          transactionId: transaction.id,
          status: "COMPLETED",
          mpesaCode: transaction.providerReceiptNumber,
          message: "Deposit confirmed.",
        });
      }

      if (["1", "1032", "1037", "2001"].includes(resultCode)) {
        await prisma.walletTransaction.update({
          where: { id: transaction.id },
          data: {
            status: "FAILED",
            providerResponseCode: resultCode,
            providerResponseDescription: resultDesc,
            providerCallback: queryData as never,
            processedAt: new Date(),
          },
        });

        const latestSummary = await getWalletSummary(req.user.id);
        emitWalletEvent({
          userId: req.user.id,
          transactionId: transaction.id,
          checkoutRequestId: transaction.checkoutRequestId,
          merchantRequestId: transaction.merchantRequestId,
          mpesaCode: null,
          status: "FAILED",
          message: resultDesc,
          balance: latestSummary.balance,
          amount: transaction.amount,
        });

        await createDepositNotifications({
          userId: req.user.id,
          transactionId: transaction.id,
          amount: transaction.amount,
          balance: latestSummary.balance,
          status: "FAILED",
          failureReason: resultDesc,
        });

        return res.status(200).json({
          transactionId: transaction.id,
          status: "FAILED",
          message: resultDesc,
        });
      }

      return res.status(200).json({
        transactionId: transaction.id,
        status: "PENDING",
        message: resultDesc,
      });
    } catch (error) {
      next(error);
    }
  },
);

export { paymentRouter };
