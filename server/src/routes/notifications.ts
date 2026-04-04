import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notifications.controller";

const notificationRouter = Router();

notificationRouter.get("/notifications", authenticate, listNotifications);
notificationRouter.patch(
  "/notifications/read-all",
  authenticate,
  markAllNotificationsRead,
);
notificationRouter.patch(
  "/notifications/:notificationId/read",
  authenticate,
  markNotificationRead,
);

export { notificationRouter };
