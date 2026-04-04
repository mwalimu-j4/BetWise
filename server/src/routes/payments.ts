import { Request, Response, Router } from "express";
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
  const userIdentifier =
    userProfile?.phone ?? userProfile?.email ?? args.userId;
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

async function createWithdrawalNotifications(args: {
  userId: string;
  transactionId: string;
  amount: number;
  fee: number;
  balance: number;
  phone: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REJECTED";
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

  const userIdentifier =
    userProfile?.phone ?? userProfile?.email ?? args.userId;
  const netAmount = args.amount - args.fee;

  let userTitle = "";
  let userMessage = "";
  let adminTitle = "";
  let adminMessage = "";
  let notificationType: "DEPOSIT_SUCCESS" | "DEPOSIT_FAILED" =
    "DEPOSIT_SUCCESS";

  if (args.status === "PENDING") {
    userTitle = "Withdrawal Request Submitted";
    userMessage = `Your withdrawal request for KES ${args.amount.toLocaleString()} (KES ${args.fee.toLocaleString()} fee) is pending admin approval. You'll receive KES ${netAmount.toLocaleString()}.`;
    adminTitle = "New Withdrawal Request";
    adminMessage = `${userIdentifier} requested a withdrawal of KES ${args.amount.toLocaleString()} to ${args.phone} (Fee: KES ${args.fee.toLocaleString()}).`;
  } else if (args.status === "COMPLETED") {
    userTitle = "Withdrawal Successful";
    userMessage = `Your withdrawal of KES ${args.amount.toLocaleString()} has been processed to ${args.phone}. Fee charged: KES ${args.fee.toLocaleString()}. New balance: KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Completed";
    adminMessage = `Withdrawal of KES ${args.amount.toLocaleString()} to ${userIdentifier} (${args.phone}) completed successfully.`;
  } else if (args.status === "FAILED") {
    userTitle = "Withdrawal Failed";
    userMessage = `Your withdrawal request for KES ${args.amount.toLocaleString()} failed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""} Your balance remains unchanged at KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Failed";
    adminMessage = `Withdrawal of KES ${args.amount.toLocaleString()} for ${userIdentifier} to ${args.phone} failed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""}`;
  } else if (args.status === "REJECTED") {
    userTitle = "Withdrawal Request Rejected";
    userMessage = `Your withdrawal request for KES ${args.amount.toLocaleString()} has been rejected.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""} Your balance remains KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Rejected";
    adminMessage = `Withdrawal request of KES ${args.amount.toLocaleString()} for ${userIdentifier} to ${args.phone} was rejected.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""}`;
  }

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
      createdAt: createdAtIso,
    });
  }
}

// Withdrawal configuration (KES)
const WITHDRAWAL_CONFIG = {
  MIN_AMOUNT: 100,
  MAX_AMOUNT_PER_REQUEST: 10000,
  FEE_PERCENTAGE: 5, // 5%
};

const paymentRouter = Router();

const stkPushBodySchema = z.object({
  phone: z.string().trim().min(10),
  amount: z.number().int().positive(),
  accountReference: z.string().trim().min(2).max(20).optional(),
  description: z.string().trim().min(2).max(40).optional(),
});

const withdrawalRequestSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^254\d{9}$/, "Phone must be in format 2547XXXXXXXX"),
  amount: z.number().int().positive().min(WITHDRAWAL_CONFIG.MIN_AMOUNT),
  pin: z.string().trim().min(4).max(6).optional(), // Optional for now
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

type MpesaCallbackItem = {
  Name: string;
  Value?: string | number;
};

const getValue = (items: MpesaCallbackItem[], name: string) =>
  items.find((item) => item.Name === name)?.Value;

function normalizeCallbackValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

const mpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string().optional(),
      CheckoutRequestID: z.string().optional(),
      ResultCode: z.union([z.number(), z.string()]).optional(),
      ResultDesc: z.string().optional(),
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

const handleMpesaCallback = (req: Request, res: Response) => {
  console.log("\n=== M-PESA CALLBACK STARTED ===");
  console.log("Raw request body:");
  console.log(JSON.stringify(req.body ?? null, null, 2));
  console.log("=== END RAW BODY ===");

  const parsedBody = mpesaCallbackSchema.safeParse(req.body);

  if (!parsedBody.success) {
    console.error("❌ VALIDATION FAILED. Zod errors:", parsedBody.error.errors);
    console.error(
      "Raw body that failed validation:",
      JSON.stringify(req.body, null, 2),
    );
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  console.log("✅ Validation passed");
  const callback = parsedBody.data.Body.stkCallback;
  console.log("Parsed stkCallback:", JSON.stringify(callback, null, 2));

  const resultCode = Number(callback.ResultCode ?? NaN);
  const resultDesc = callback.ResultDesc ?? "Missing ResultDesc";
  const checkoutRequestId = callback.CheckoutRequestID;

  console.log("Extracted basic fields:", {
    resultCode,
    resultDesc,
    checkoutRequestId,
  });

  console.log(
    "CallbackMetadata raw:",
    JSON.stringify(callback.CallbackMetadata, null, 2),
  );
  const callbackItems = callback.CallbackMetadata?.Item ?? [];
  console.log(
    "CallbackMetadata.Item array:",
    JSON.stringify(callbackItems, null, 2),
  );
  console.log(`Found ${callbackItems.length} items in CallbackMetadata.Item`);

  // Log each item individually
  callbackItems.forEach((item, index) => {
    console.log(
      `Item [${index}]: Name="${item.Name}", Value=${JSON.stringify(item.Value)} (type: ${typeof item.Value})`,
    );
  });

  // Extract each field with logging
  const mpesaReceiptValue = getValue(
    callbackItems as MpesaCallbackItem[],
    "MpesaReceiptNumber",
  );
  console.log(
    "getValue('MpesaReceiptNumber') returned:",
    mpesaReceiptValue,
    `(type: ${typeof mpesaReceiptValue})`,
  );
  const mpesaReceiptNumber = normalizeCallbackValue(mpesaReceiptValue);
  console.log(
    "normalizeCallbackValue(mpesaReceiptValue) returned:",
    mpesaReceiptNumber,
  );

  const amountValue = getValue(callbackItems as MpesaCallbackItem[], "Amount");
  console.log("getValue('Amount') returned:", amountValue);
  const amount = normalizeCallbackValue(amountValue);
  console.log("normalizeCallbackValue(amountValue) returned:", amount);

  const phoneNumberValue = getValue(
    callbackItems as MpesaCallbackItem[],
    "PhoneNumber",
  );
  console.log("getValue('PhoneNumber') returned:", phoneNumberValue);
  const phoneNumber = normalizeCallbackValue(phoneNumberValue);
  console.log(
    "normalizeCallbackValue(phoneNumberValue) returned:",
    phoneNumber,
  );

  const transactionDateValue = getValue(
    callbackItems as MpesaCallbackItem[],
    "TransactionDate",
  );
  console.log("getValue('TransactionDate') returned:", transactionDateValue);
  const transactionDate = normalizeCallbackValue(transactionDateValue);
  console.log(
    "normalizeCallbackValue(transactionDateValue) returned:",
    transactionDate,
  );

  console.log("=== FINAL EXTRACTED VALUES ===");
  console.log({
    ResultCode: callback.ResultCode,
    ResultDesc: resultDesc,
    CheckoutRequestID: checkoutRequestId,
    MpesaReceiptNumber: mpesaReceiptNumber,
    Amount: amount,
    PhoneNumber: phoneNumber,
    TransactionDate: transactionDate,
  });
  console.log("=== END EXTRACTED VALUES ===");

  void (async () => {
    console.log("\n=== ASYNC PROCESSING STARTED ===");
    if (!checkoutRequestId) {
      console.error("❌ CALLBACK MISSING CheckoutRequestID - cannot proceed");
      return;
    }

    console.log(
      `Searching for transaction with checkoutRequestId: "${checkoutRequestId}"`,
    );
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
      console.error("❌ NO MATCHING TRANSACTION FOUND", {
        checkoutRequestId,
        resultCode,
        resultDesc,
      });
      return;
    }

    console.log("✅ Found matching transaction:", {
      transactionId: matchedTransaction.id,
      status: matchedTransaction.status,
      providerReceiptNumber: matchedTransaction.providerReceiptNumber,
      checkoutRequestId,
    });

    if (resultCode === 0) {
      console.log("\nResultCode is 0 (success)");
      if (!mpesaReceiptNumber) {
        console.error(
          "❌ SUCCESS CALLBACK BUT NO MpesaReceiptNumber EXTRACTED!",
        );
        console.error(
          "Full callback payload:",
          JSON.stringify(req.body ?? null, null, 2),
        );
      } else {
        console.log(
          `✅ MpesaReceiptNumber successfully extracted: "${mpesaReceiptNumber}"`,
        );
      }

      if (
        matchedTransaction.status === "COMPLETED" &&
        !matchedTransaction.providerReceiptNumber &&
        mpesaReceiptNumber
      ) {
        console.log(
          "Backfilling receipt on COMPLETED transaction:",
          mpesaReceiptNumber,
        );
        const backfilledTransaction = await prisma.walletTransaction.update({
          where: { id: matchedTransaction.id },
          data: {
            providerReceiptNumber: mpesaReceiptNumber,
            providerResponseCode: String(resultCode),
            providerResponseDescription: resultDesc,
            providerCallback: callback as never,
          },
          select: {
            id: true,
            status: true,
            providerReceiptNumber: true,
            providerResponseCode: true,
            providerResponseDescription: true,
          },
        });

        console.log("✅ BACKFILL SUCCESS:", {
          transactionId: backfilledTransaction.id,
          status: backfilledTransaction.status,
          providerReceiptNumber: backfilledTransaction.providerReceiptNumber,
          providerResponseCode: backfilledTransaction.providerResponseCode,
        });

        emitWalletEvent({
          userId: matchedTransaction.userId,
          transactionId: matchedTransaction.id,
          checkoutRequestId,
          merchantRequestId: callback.MerchantRequestID,
          mpesaCode: mpesaReceiptNumber,
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
      console.log(
        "Updating PENDING transaction to COMPLETED with receipt:",
        mpesaReceiptNumber,
      );
      const updatedWallet = await prisma.$transaction(async (tx) => {
        const updatedTransaction = await tx.walletTransaction.update({
          where: { id: matchedTransaction.id },
          data: {
            status: "COMPLETED",
            providerReceiptNumber: mpesaReceiptNumber,
            providerResponseCode: String(resultCode),
            providerResponseDescription: resultDesc,
            providerCallback: callback as never,
            processedAt: new Date(),
          },
          select: {
            id: true,
            status: true,
            providerReceiptNumber: true,
            providerResponseCode: true,
            providerResponseDescription: true,
          },
        });

        console.log("✅ TRANSACTION UPDATE SUCCESS:", {
          transactionId: updatedTransaction.id,
          status: updatedTransaction.status,
          providerReceiptNumber: updatedTransaction.providerReceiptNumber,
          providerResponseCode: updatedTransaction.providerResponseCode,
          providerResponseDescription:
            updatedTransaction.providerResponseDescription,
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
        mpesaCode: mpesaReceiptNumber,
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
        mpesaCode: mpesaReceiptNumber,
        status: "COMPLETED",
      });
      return;
    }

    console.error("❌ M-Pesa FAILED TRANSACTION", {
      checkoutRequestId,
      resultCode,
      resultDesc,
    });

    const failedTransaction = await prisma.walletTransaction.update({
      where: { id: matchedTransaction.id },
      data: {
        status: "FAILED",
        providerResponseCode: String(resultCode),
        providerResponseDescription: resultDesc,
        providerCallback: callback as never,
        processedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        providerResponseCode: true,
        providerResponseDescription: true,
      },
    });

    console.log("✅ FAILED TRANSACTION RECORDED:", failedTransaction);

    const latestSummary = await getWalletSummary(matchedTransaction.userId);

    emitWalletEvent({
      userId: matchedTransaction.userId,
      transactionId: matchedTransaction.id,
      checkoutRequestId,
      merchantRequestId: callback.MerchantRequestID,
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

  console.log("\n=== M-PESA CALLBACK RESPONSE SENT ===");
  return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
};

paymentRouter.post("/mpesa/callback", handleMpesaCallback);
paymentRouter.post("/payments/mpesa/callback", handleMpesaCallback);

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

      console.log("M-Pesa STK callback URL:", config.callbackUrl);

      try {
        const callbackUrl = new URL(config.callbackUrl);
        if (callbackUrl.protocol !== "https:") {
          console.warn("M-Pesa callback URL is not HTTPS.", config.callbackUrl);
        }

        if (["localhost", "127.0.0.1"].includes(callbackUrl.hostname)) {
          console.warn(
            "M-Pesa callback URL is not publicly reachable.",
            config.callbackUrl,
          );
        }
      } catch {
        console.warn("M-Pesa callback URL is invalid.", config.callbackUrl);
      }

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

        const refreshedTransaction = await prisma.walletTransaction.findUnique({
          where: { id: transaction.id },
          select: {
            providerReceiptNumber: true,
          },
        });

        const mpesaCode = refreshedTransaction?.providerReceiptNumber ?? null;

        const latestSummary = await getWalletSummary(req.user.id);
        emitWalletEvent({
          userId: req.user.id,
          transactionId: transaction.id,
          checkoutRequestId: transaction.checkoutRequestId,
          merchantRequestId: transaction.merchantRequestId,
          mpesaCode,
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
          mpesaCode,
          status: "COMPLETED",
        });

        return res.status(200).json({
          transactionId: transaction.id,
          status: "COMPLETED",
          mpesaCode,
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

// ============= WITHDRAWAL ENDPOINTS =============

paymentRouter.post(
  "/payments/withdrawals",
  authenticate,
  async (req, res, next) => {
    try {
      const parsedBody = withdrawalRequestSchema.safeParse(req.body);

      if (!parsedBody.success) {
        const errorMessage = parsedBody.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ");
        return res.status(400).json({ message: errorMessage });
      }

      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.id;
      const requestedAmount = parsedBody.data.amount;

      // Validate amount
      if (requestedAmount > WITHDRAWAL_CONFIG.MAX_AMOUNT_PER_REQUEST) {
        return res.status(400).json({
          message: `Maximum withdrawal amount is KES ${WITHDRAWAL_CONFIG.MAX_AMOUNT_PER_REQUEST.toLocaleString()}.`,
        });
      }

      // Calculate fee
      const feeAmount = Math.ceil(
        (requestedAmount * WITHDRAWAL_CONFIG.FEE_PERCENTAGE) / 100,
      );
      const totalDebit = requestedAmount + feeAmount;

      // Get wallet
      const wallet = await getOrCreateWallet(userId);

      // Check balance
      if (wallet.balance < totalDebit) {
        return res.status(400).json({
          message: `Insufficient balance. You need KES ${totalDebit.toLocaleString()} (amount + fees) but only have KES ${wallet.balance.toLocaleString()}.`,
        });
      }

      // Create transaction record
      const transaction = await prisma.walletTransaction.create({
        data: {
          userId,
          walletId: wallet.id,
          type: "WITHDRAWAL",
          status: "PENDING",
          amount: requestedAmount,
          currency: "KES",
          channel: "M-Pesa",
          reference: `WD-${Date.now()}`,
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

      // Reserve funds (debit from wallet)
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: totalDebit,
          },
        },
      });

      const updatedWallet = await getOrCreateWallet(userId);

      // Emit event
      emitWalletEvent({
        userId,
        transactionId: transaction.id,
        status: "PENDING",
        message: "Withdrawal request submitted for admin approval.",
        balance: updatedWallet.balance,
        amount: requestedAmount,
      });

      // Create notifications
      await createWithdrawalNotifications({
        userId,
        transactionId: transaction.id,
        amount: requestedAmount,
        fee: feeAmount,
        balance: updatedWallet.balance,
        phone: parsedBody.data.phone,
        status: "PENDING",
      });

      return res.status(200).json({
        message: "Withdrawal request submitted successfully.",
        transactionId: transaction.id,
        wallet: {
          balance: updatedWallet.balance,
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
  },
);

paymentRouter.get(
  "/payments/withdrawals",
  authenticate,
  async (req, res, next) => {
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
        withdrawals: withdrawals.map(toClientTransaction),
      });
    } catch (error) {
      next(error);
    }
  },
);

// Admin endpoints
paymentRouter.get(
  "/admin/withdrawals",
  authenticate,
  async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN") {
        return res.status(403).json({ message: "Admin access required." });
      }

      const status = (req.query.status as string) || "PENDING";
      const withdrawals = await prisma.walletTransaction.findMany({
        where: {
          type: "WITHDRAWAL",
          status: status as any,
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
          fee: (w.providerCallback as any)?.fee ?? 0,
          totalDebit: (w.providerCallback as any)?.totalDebit ?? w.amount,
          phone: w.phone,
          status: toTransactionStatus(w.status),
          createdAt: w.createdAt.toISOString(),
          processedAt: w.processedAt?.toISOString() ?? null,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

paymentRouter.patch(
  "/admin/withdrawals/:transactionId/approve",
  authenticate,
  async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN") {
        return res.status(403).json({ message: "Admin access required." });
      }

      const { transactionId } = req.params;

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

      // Update transaction status to COMPLETED
      const updatedTransaction = await prisma.walletTransaction.update({
        where: { id: transactionId },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          providerReceiptNumber: `MPX-${Date.now()}`, // Mock M-Pesa code
        },
      });

      const wallet = await getOrCreateWallet(transaction.userId);

      // Emit event
      emitWalletEvent({
        userId: transaction.userId,
        transactionId: transaction.id,
        status: "COMPLETED",
        message: "Your withdrawal has been processed.",
        balance: wallet.balance,
        amount: transaction.amount,
      });

      // Create notification
      const feeAmount = (transaction.providerCallback as any)?.fee ?? 0;
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
  },
);

paymentRouter.patch(
  "/admin/withdrawals/:transactionId/reject",
  authenticate,
  async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN") {
        return res.status(403).json({ message: "Admin access required." });
      }

      const { transactionId } = req.params;
      const { reason } = req.body;

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

      // Refund the debited amount back to user wallet
      const totalDebit =
        (transaction.providerCallback as any)?.totalDebit ?? transaction.amount;
      await prisma.wallet.update({
        where: { id: transaction.walletId! },
        data: {
          balance: {
            increment: totalDebit,
          },
        },
      });

      // Update transaction status to FAILED
      const updatedTransaction = await prisma.walletTransaction.update({
        where: { id: transactionId },
        data: {
          status: "FAILED",
          processedAt: new Date(),
          providerResponseDescription: reason || "Withdrawal rejected by admin",
        },
      });

      const wallet = await getOrCreateWallet(transaction.userId);

      // Emit event
      emitWalletEvent({
        userId: transaction.userId,
        transactionId: transaction.id,
        status: "FAILED",
        message: "Your withdrawal request was rejected.",
        balance: wallet.balance,
        amount: transaction.amount,
      });

      // Create notification
      const feeAmount = (transaction.providerCallback as any)?.fee ?? 0;
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
  },
);

export { paymentRouter };
