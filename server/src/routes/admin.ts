import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { getAdminDashboardSummary } from "../controllers/admin.controller";

const adminRouter = Router();

adminRouter.get(
  "/admin/dashboard/summary",
  authenticate,
  getAdminDashboardSummary,
);

export { adminRouter };