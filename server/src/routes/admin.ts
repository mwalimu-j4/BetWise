import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  getAdminDashboardSummary,
  getAllUsers,
  getUserDetails,
  banUser,
  unbanUser,
  suspendUser,
  unsuspendUser,
} from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/requireAdmin";

const adminRouter = Router();

// Dashboard
adminRouter.get(
  "/admin/dashboard/summary",
  authenticate,
  getAdminDashboardSummary,
);

// User Management
adminRouter.get("/admin/users", authenticate, requireAdmin, getAllUsers);
adminRouter.get("/admin/users/:userId", authenticate, requireAdmin, getUserDetails);
adminRouter.post("/admin/users/:userId/ban", authenticate, requireAdmin, banUser);
adminRouter.post("/admin/users/:userId/unban", authenticate, requireAdmin, unbanUser);
adminRouter.post("/admin/users/:userId/suspend", authenticate, requireAdmin, suspendUser);
adminRouter.post("/admin/users/:userId/unsuspend", authenticate, requireAdmin, unsuspendUser);

export { adminRouter };
