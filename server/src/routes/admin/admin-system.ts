/**
 * ── Admin Alerts & System Status Routes ──
 * API routes for the automated event management dashboard.
 */

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate";
import { requireAdmin } from "../../middleware/requireAdmin";
import {
  getAlerts,
  getUnreadCount,
  markAlertRead,
  markAllAlertsRead,
} from "../../services/adminAlertService";
import {
  getSystemStatus,
  getAutoConfigureStatus,
  runAutoConfigure,
} from "../../services/scheduler";

const adminSystemRouter = Router();

adminSystemRouter.use("/admin/system", authenticate, requireAdmin);

// ── GET /admin/system/status ──
// Returns the full system status for the dashboard panel
adminSystemRouter.get("/admin/system/status", async (_req, res, next) => {
  try {
    const status = await getSystemStatus();
    return res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

// ── GET /admin/system/alerts ──
// List admin alerts with optional filtering
const alertsQuerySchema = z.object({
  severity: z.enum(["info", "warning", "critical"]).optional(),
  isRead: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

adminSystemRouter.get("/admin/system/alerts", async (req, res, next) => {
  try {
    const parsed = alertsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query parameters." });
    }

    const result = await getAlerts({
      severity: parsed.data.severity,
      isRead: parsed.data.isRead,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// ── GET /admin/system/alerts/unread-count ──
adminSystemRouter.get("/admin/system/alerts/unread-count", async (_req, res, next) => {
  try {
    const count = await getUnreadCount();
    return res.status(200).json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
});

// ── PATCH /admin/system/alerts/:id/read ──
adminSystemRouter.patch("/admin/system/alerts/:id/read", async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "Missing alert ID." });
    }

    await markAlertRead(id);
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ── PATCH /admin/system/alerts/mark-all-read ──
adminSystemRouter.patch("/admin/system/alerts/mark-all-read", async (_req, res, next) => {
  try {
    const count = await markAllAlertsRead();
    return res.status(200).json({ marked: count });
  } catch (error) {
    next(error);
  }
});

// ── POST /admin/system/auto-configure ──
// Runs all 4 automated jobs immediately (rate-limited to 1 per 5 minutes)
adminSystemRouter.post("/admin/system/auto-configure", async (_req, res, next) => {
  try {
    const result = await runAutoConfigure();

    if (!result.started) {
      return res.status(429).json({
        error: result.reason,
        status: getAutoConfigureStatus(),
      });
    }

    return res.status(202).json({
      message: "Auto-configure started. Poll /admin/system/auto-configure/status for progress.",
      status: getAutoConfigureStatus(),
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /admin/system/auto-configure/status ──
adminSystemRouter.get("/admin/system/auto-configure/status", async (_req, res, _next) => {
  return res.status(200).json(getAutoConfigureStatus());
});

export { adminSystemRouter };
