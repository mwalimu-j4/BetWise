import { prisma } from "../lib/prisma";
import { emitNotificationUpdate } from "../lib/socket";

/**
 * Creates deposit notifications for both user and admin.
 * Handles success and failure scenarios with appropriate messaging.
 */
export async function createDepositNotifications(args: {
  userId: string;
  transactionId: string;
  amount: number;
  balance: number;
  mpesaCode?: string | null;
  paystackReference?: string | null;
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

  const normalizedPaystackReference =
    args.paystackReference ?? args.mpesaCode ?? null;
  const referenceSuffix = normalizedPaystackReference
    ? ` Reference: ${normalizedPaystackReference}.`
    : "";
  const userIdentifier =
    userProfile?.phone ?? userProfile?.email ?? args.userId;
  const isSuccess = args.status === "COMPLETED";

  const userTitle = isSuccess ? "Deposit Successful" : "Deposit Failed";
  const userMessage = isSuccess
    ? `You deposited KES ${args.amount.toLocaleString()}. Your new balance is KES ${args.balance.toLocaleString()}.${referenceSuffix}`
    : `Your deposit request for KES ${args.amount.toLocaleString()} failed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""}`;

  const adminTitle = isSuccess
    ? "New Customer Deposit"
    : "Customer Deposit Failed";
  const adminMessage = isSuccess
    ? `${userIdentifier} deposited KES ${args.amount.toLocaleString()}. Updated wallet balance: KES ${args.balance.toLocaleString()}.${referenceSuffix}`
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
      mpesaCode: normalizedPaystackReference,
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
      mpesaCode: normalizedPaystackReference,
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
    paystackReference: normalizedPaystackReference,
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
      paystackReference: normalizedPaystackReference,
      createdAt: createdAtIso,
    });
  }
}

/**
 * Creates withdrawal notifications for user and admin.
 * Handles pending, completed, failed, and rejected statuses.
 */
export async function createWithdrawalNotifications(args: {
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
  let notificationType: "WITHDRAWAL_SUCCESS" | "WITHDRAWAL_FAILED" | "SYSTEM" =
    "SYSTEM";

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
    notificationType = "WITHDRAWAL_SUCCESS";
  } else if (args.status === "FAILED") {
    userTitle = "Withdrawal Failed";
    userMessage = `Your withdrawal request for KES ${args.amount.toLocaleString()} failed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""} Your balance remains unchanged at KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Failed";
    adminMessage = `Withdrawal of KES ${args.amount.toLocaleString()} for ${userIdentifier} to ${args.phone} failed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""}`;
    notificationType = "WITHDRAWAL_FAILED";
  } else if (args.status === "REJECTED") {
    userTitle = "Withdrawal Request Rejected";
    userMessage = `Your withdrawal request for KES ${args.amount.toLocaleString()} has been rejected.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""} Your balance remains KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Rejected";
    adminMessage = `Withdrawal request of KES ${args.amount.toLocaleString()} for ${userIdentifier} to ${args.phone} was rejected.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""}`;
    notificationType = "WITHDRAWAL_FAILED";
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

/**
 * Creates a bet settlement notification for the user.
 * Sent when a bet is settled (WON, LOST, or VOID).
 */
export async function createBetSettlementNotification(args: {
  userId: string;
  betCode: string;
  eventName: string;
  stake: number;
  potentialPayout: number;
  status: "WON" | "LOST" | "VOID";
}) {
  const createdAtIso = new Date().toISOString();

  let notificationType: "BET_WON" | "BET_LOST" | "BET_VOID";
  let title: string;
  let message: string;

  if (args.status === "WON") {
    notificationType = "BET_WON";
    title = "🎉 Bet Won!";
    message = `Congratulations! Your bet ${args.betCode} on ${args.eventName} has won! You've been credited KES ${Math.round(args.potentialPayout).toLocaleString()}.`;
  } else if (args.status === "LOST") {
    notificationType = "BET_LOST";
    title = "Bet Lost";
    message = `Your bet ${args.betCode} on ${args.eventName} has lost. Stake: KES ${Math.round(args.stake).toLocaleString()}. Better luck next time!`;
  } else {
    notificationType = "BET_VOID";
    title = "Bet Voided";
    message = `Your bet ${args.betCode} on ${args.eventName} has been voided. Your stake of KES ${Math.round(args.stake).toLocaleString()} has been refunded.`;
  }

  try {
    await prisma.notification.create({
      data: {
        userId: args.userId,
        audience: "USER",
        type: notificationType,
        title,
        message,
        amount: Math.round(args.status === "WON" ? args.potentialPayout : args.stake),
      },
    });

    emitNotificationUpdate(args.userId, {
      audience: "USER",
      type: notificationType,
      title,
      message,
      amount: Math.round(args.status === "WON" ? args.potentialPayout : args.stake),
      createdAt: createdAtIso,
    });
  } catch (error) {
    console.error("[Notifications] Failed to create bet settlement notification:", error);
  }
}

/**
 * Notifies all admins when an event ends.
 * Includes summary of pending bets that need settlement.
 */
export async function createEventEndedAdminNotification(args: {
  eventName: string;
  eventType: "sport" | "custom";
  pendingBetsCount: number;
  totalBetsCount: number;
  totalStaked: number;
  eventId: string;
}) {
  const adminUsers = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (adminUsers.length === 0) return;

  const createdAtIso = new Date().toISOString();
  const title = "Event Ended";

  const settlementNote =
    args.pendingBetsCount > 0
      ? ` ${args.pendingBetsCount} bet(s) still pending settlement.`
      : " All bets have been settled.";

  const actionNote =
    args.eventType === "custom" && args.pendingBetsCount > 0
      ? " Go to Custom Events to configure results and settle markets."
      : args.eventType === "sport" && args.pendingBetsCount > 0
        ? " Go to Bets Management to settle pending bets."
        : "";

  const message = `${args.eventName} has ended. Total bets: ${args.totalBetsCount}, total staked: KES ${Math.round(args.totalStaked).toLocaleString()}.${settlementNote}${actionNote}`;

  try {
    await prisma.notification.createMany({
      data: adminUsers.map((admin) => ({
        userId: admin.id,
        audience: "ADMIN" as const,
        type: "EVENT_ENDED" as const,
        title,
        message,
      })),
      skipDuplicates: true,
    });

    for (const admin of adminUsers) {
      emitNotificationUpdate(admin.id, {
        audience: "ADMIN",
        type: "EVENT_ENDED",
        title,
        message,
        createdAt: createdAtIso,
      });
    }
  } catch (error) {
    console.error("[Notifications] Failed to create event ended admin notification:", error);
  }
}

function toClientNotification(notification: {
  id: string;
  audience: "USER" | "ADMIN";
  type:
    | "DEPOSIT_SUCCESS"
    | "DEPOSIT_FAILED"
    | "WITHDRAWAL_SUCCESS"
    | "WITHDRAWAL_FAILED"
    | "BET_WON"
    | "BET_LOST"
    | "BET_VOID"
    | "EVENT_ENDED"
    | "SYSTEM";
  title: string;
  message: string;
  transactionId: string | null;
  amount: number | null;
  balance: number | null;
  mpesaCode: string | null;
  isRead: boolean;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    audience: notification.audience,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    transactionId: notification.transactionId,
    amount: notification.amount,
    balance: notification.balance,
    paystackReference: notification.mpesaCode,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function listNotifications(
  req: import("express").Request,
  res: import("express").Response,
  next: (error?: unknown) => void,
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const take = Math.min(Number(req.query.take ?? 20), 50) || 20;
    const unreadOnly =
      req.query.unreadOnly === "true" || req.query.unreadOnly === "1";

    const audience: "ADMIN" | "USER" =
      req.user.role === "ADMIN" ? "ADMIN" : "USER";

    const where: {
      userId: string;
      audience: "ADMIN" | "USER";
      isRead?: boolean;
    } = {
      userId: req.user.id,
      audience,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.notification.count({
        where: {
          userId: req.user.id,
          audience,
          isRead: false,
        },
      }),
    ]);

    return res.status(200).json({
      notifications: notifications.map(toClientNotification),
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(
  req: import("express").Request,
  res: import("express").Response,
  next: (error?: unknown) => void,
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const audience: "ADMIN" | "USER" =
      req.user.role === "ADMIN" ? "ADMIN" : "USER";

    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        audience,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({ message: "Notifications marked as read." });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(
  req: import("express").Request,
  res: import("express").Response,
  next: (error?: unknown) => void,
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const notificationId = Array.isArray(req.params.notificationId)
      ? req.params.notificationId[0]
      : req.params.notificationId;

    if (!notificationId) {
      return res.status(400).json({ message: "Invalid notification id." });
    }

    const audience: "ADMIN" | "USER" =
      req.user.role === "ADMIN" ? "ADMIN" : "USER";

    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: req.user.id,
        audience,
      },
      data: {
        isRead: true,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: "Notification not found." });
    }

    return res.status(200).json({ message: "Notification marked as read." });
  } catch (error) {
    next(error);
  }
}
