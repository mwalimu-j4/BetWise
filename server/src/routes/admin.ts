import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  getAdminDashboardSummary,
  getBettingAnalytics,
  createUser,
  getAllUsers,
  getUserDetails,
  updateUser,
  banUser,
  unbanUser,
  suspendUser,
  unsuspendUser,
  getAdminPayments,
  getAdminPaymentsStats,
  getAdminSettings,
  updateAdminSettings,
} from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/requireAdmin";

const adminRouter = Router();

// Dashboard
adminRouter.get(
  "/admin/dashboard/summary",
  authenticate,
  getAdminDashboardSummary,
);
adminRouter.get(
  "/admin/analytics",
  authenticate,
  requireAdmin,
  getBettingAnalytics,
);

// User Management
adminRouter.get("/admin/users", authenticate, requireAdmin, getAllUsers);
adminRouter.post("/admin/users", authenticate, requireAdmin, createUser);
adminRouter.get(
  "/admin/users/:userId",
  authenticate,
  requireAdmin,
  getUserDetails,
);
adminRouter.put("/admin/users/:userId", authenticate, requireAdmin, updateUser);
adminRouter.post(
  "/admin/users/:userId/ban",
  authenticate,
  requireAdmin,
  banUser,
);
adminRouter.post(
  "/admin/users/:userId/unban",
  authenticate,
  requireAdmin,
  unbanUser,
);
adminRouter.post(
  "/admin/users/:userId/suspend",
  authenticate,
  requireAdmin,
  suspendUser,
);
adminRouter.post(
  "/admin/users/:userId/unsuspend",
  authenticate,
  requireAdmin,
  unsuspendUser,
);

// Payments Management
adminRouter.get(
  "/admin/payments",
  authenticate,
  requireAdmin,
  getAdminPayments,
);
adminRouter.get(
  "/admin/payments/stats",
  authenticate,
  requireAdmin,
  getAdminPaymentsStats,
);

// Settings Management
adminRouter.get(
  "/admin/settings",
  authenticate,
  requireAdmin,
  getAdminSettings,
);
adminRouter.put(
  "/admin/settings",
  authenticate,
  requireAdmin,
  updateAdminSettings,
);

export { adminRouter };
