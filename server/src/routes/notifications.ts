import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { prisma } from "../lib/prisma";

const notificationRouter = Router();

const listNotificationsQuerySchema = z.object({
  take: z.coerce.number().int().positive().max(50).default(20),
  unreadOnly: z
    .string()
    .optional()
    .transform((value) => value === "true" || value === "1"),
});

function toClientNotification(notification: {
  id: string;
  audience: "USER" | "ADMIN";
  type: "DEPOSIT_SUCCESS" | "DEPOSIT_FAILED" | "SYSTEM";
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
    mpesaCode: notification.mpesaCode,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  };
}

notificationRouter.get("/notifications", authenticate, async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsedQuery = listNotificationsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ message: "Invalid notification query." });
    }

    const audience: "ADMIN" | "USER" =
      req.user.role === "ADMIN" ? "ADMIN" : "USER";

    const where: {
      userId: string;
      audience: "ADMIN" | "USER";
      isRead?: boolean;
    } = {
      userId: req.user.id,
      audience,
      ...(parsedQuery.data.unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parsedQuery.data.take,
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
});

notificationRouter.patch(
  "/notifications/read-all",
  authenticate,
  async (req, res, next) => {
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
  },
);

notificationRouter.patch(
  "/notifications/:notificationId/read",
  authenticate,
  async (req, res, next) => {
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
  },
);

export { notificationRouter };
