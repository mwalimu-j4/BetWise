import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { prisma } from "../lib/prisma";
import { emitNotificationUpdate, emitWalletUpdate } from "../lib/socket";
import {
  handleMpesaCallback,
  getWalletSummary,
  initiateStk,
  checkDepositStatus,
  createWithdrawalRequest,
  listWithdrawals,
  listAdminWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} from "../controllers/payments.controller";

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
  let notificationType: "SYSTEM" = "SYSTEM";

  if (args.status === "PENDING") {
    userTitle = "Withdrawal Request Submitted";
    userMessage = `Your withdrawal request for KES ${args.amount.toLocaleString()} (KES ${args.fee.toLocaleString()} fee) is pending admin approval. You'll receive KES ${netAmount.toLocaleString()}.`;
    adminTitle = "New Withdrawal Request";
    adminMessage = `${userIdentifier} requested a withdrawal of KES ${args.amount.toLocaleString()} to ${args.phone} (Fee: KES ${args.fee.toLocaleString()}).`;
    notificationType = "SYSTEM";
  } else if (args.status === "COMPLETED") {
    userTitle = "Withdrawal Successful";
    userMessage = `Your withdrawal of KES ${args.amount.toLocaleString()} has been processed to ${args.phone}. Fee charged: KES ${args.fee.toLocaleString()}. New balance: KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Completed";
    adminMessage = `Withdrawal of KES ${args.amount.toLocaleString()} to ${userIdentifier} (${args.phone}) completed successfully.`;
    notificationType = "SYSTEM";
  } else if (args.status === "FAILED") {
    userTitle = "Withdrawal Failed";
    userMessage = `Your withdrawal request for KES ${args.amount.toLocaleString()} failed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""} Your balance remains unchanged at KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Failed";
    adminMessage = `Withdrawal of KES ${args.amount.toLocaleString()} for ${userIdentifier} to ${args.phone} failed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""}`;
    notificationType = "SYSTEM";
  } else if (args.status === "REJECTED") {
    userTitle = "Withdrawal Request Rejected";
    userMessage = `Your withdrawal request for KES ${args.amount.toLocaleString()} has been rejected.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""} Your balance remains KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Rejected";
    adminMessage = `Withdrawal request of KES ${args.amount.toLocaleString()} for ${userIdentifier} to ${args.phone} was rejected.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""}`;
    notificationType = "SYSTEM";
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
  MIN_AMOUNT: 1,
  MAX_AMOUNT_PER_REQUEST: 10000,
  FEE_PERCENTAGE: 5, // 5%
};

const paymentRouter = Router();

// M-Pesa callback endpoints
paymentRouter.post("/mpesa/callback", handleMpesaCallback);
paymentRouter.post("/payments/mpesa/callback", handleMpesaCallback);

// Wallet endpoints
paymentRouter.get("/payments/wallet/summary", authenticate, getWalletSummary);

// Deposit endpoints
paymentRouter.post("/payments/mpesa/stk-push", authenticate, initiateStk);
paymentRouter.get(
  "/payments/mpesa/status/:transactionId",
  authenticate,
  checkDepositStatus,
);

// Withdrawal endpoints
paymentRouter.post("/payments/withdrawals", authenticate, createWithdrawalRequest);
paymentRouter.get("/payments/withdrawals", authenticate, listWithdrawals);

// Admin withdrawal endpoints
paymentRouter.get("/admin/withdrawals", authenticate, listAdminWithdrawals);
paymentRouter.patch(
  "/admin/withdrawals/:transactionId/approve",
  authenticate,
  approveWithdrawal,
);
paymentRouter.patch(
  "/admin/withdrawals/:transactionId/reject",
  authenticate,
  rejectWithdrawal,
);

export { paymentRouter };
