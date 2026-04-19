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

function toClientNotification(notification: {
  id: string;
  audience: "USER" | "ADMIN";
  type:
    | "DEPOSIT_SUCCESS"
    | "DEPOSIT_FAILED"
    | "WITHDRAWAL_SUCCESS"
    | "WITHDRAWAL_FAILED"
    | "SYSTEM";
  title: string;
  message: string;
  transactionId: string | null;
  amount: number | null;
  balance: number | null;
  paystackReference?: string | null;
  mpesaCode?: string | null;
  isRead: boolean;
  createdAt: Date;
}) {
  const paystackReference =
    notification.paystackReference ?? notification.mpesaCode ?? null;

  return {
    id: notification.id,
    audience: notification.audience,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    transactionId: notification.transactionId,
    amount: notification.amount,
    balance: notification.balance,
    paystackReference,
    mpesaCode: paystackReference,
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
