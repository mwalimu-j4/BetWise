/**
 * ── AdminAlertService ──
 * Manages admin system alerts for the automated event management system.
 *
 * Alert types:
 *  - SYNC_SUCCESS: Auto-sync completed successfully
 *  - SYNC_FAILED: Auto-sync failed
 *  - NO_EVENTS: Sport category has no events with odds
 *  - LOW_CREDITS: API credits below 20%
 *  - CREDITS_EXHAUSTED: API credits at 0
 *  - API_DOWN: The Odds API is unreachable
 *  - API_KEY_INVALID: 401 error — invalid API key
 *  - EVENT_NO_ODDS: An event without odds was detected
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

// ── Types ──

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertType =
  | "SYNC_SUCCESS"
  | "SYNC_FAILED"
  | "NO_EVENTS"
  | "LOW_CREDITS"
  | "CREDITS_EXHAUSTED"
  | "API_DOWN"
  | "API_KEY_INVALID"
  | "EVENT_NO_ODDS";

// Deduplicate: don't create duplicate alerts within this time window
const DEDUP_WINDOW_MS: Record<string, number> = {
  SYNC_SUCCESS: 15 * 60 * 1000,     // 15 minutes
  SYNC_FAILED: 10 * 60 * 1000,      // 10 minutes
  NO_EVENTS: 60 * 60 * 1000,        // 1 hour
  LOW_CREDITS: 60 * 60 * 1000,      // 1 hour
  CREDITS_EXHAUSTED: 60 * 60 * 1000, // 1 hour
  API_DOWN: 15 * 60 * 1000,          // 15 minutes
  API_KEY_INVALID: 60 * 60 * 1000,   // 1 hour
  EVENT_NO_ODDS: 30 * 60 * 1000,     // 30 minutes
};

// ── Core Functions ──

/**
 * Create an admin alert, with deduplication.
 */
export async function createAlert(
  type: AlertType,
  message: string,
  severity: AlertSeverity,
  sportKey?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    // Check dedup window
    const dedupMs = DEDUP_WINDOW_MS[type] ?? 15 * 60 * 1000;
    const cutoff = new Date(Date.now() - dedupMs);

    const existing = await prisma.adminAlert.findFirst({
      where: {
        type,
        sportKey: sportKey ?? null,
        createdAt: { gte: cutoff },
      },
      select: { id: true },
    });

    if (existing) {
      return; // Skip duplicate
    }

    await prisma.adminAlert.create({
      data: {
        type,
        message,
        severity,
        sportKey: sportKey ?? null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    // Log critical alerts
    if (severity === "critical") {
      console.error(`[AdminAlert] 🔴 CRITICAL: ${type} — ${message}`);
    } else if (severity === "warning") {
      console.warn(`[AdminAlert] ⚠️ WARNING: ${type} — ${message}`);
    }
  } catch (err) {
    console.error("[AdminAlert] Failed to create alert:", err);
  }
}

/**
 * Get alerts with optional filtering.
 */
export async function getAlerts(options?: {
  severity?: AlertSeverity;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    sportKey: string | null;
    severity: string;
    isRead: boolean;
    metadata: unknown;
    createdAt: Date;
  }>;
  total: number;
  unreadCount: number;
}> {
  const where: Record<string, unknown> = {};

  if (options?.severity) where.severity = options.severity;
  if (options?.isRead !== undefined) where.isRead = options.isRead;

  const [alerts, total, unreadCount] = await Promise.all([
    prisma.adminAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.adminAlert.count({ where }),
    prisma.adminAlert.count({ where: { isRead: false } }),
  ]);

  return { alerts, total, unreadCount };
}

/**
 * Get count of unread alerts.
 */
export async function getUnreadCount(): Promise<number> {
  return prisma.adminAlert.count({ where: { isRead: false } });
}

/**
 * Mark a single alert as read.
 */
export async function markAlertRead(alertId: string): Promise<void> {
  await prisma.adminAlert.update({
    where: { id: alertId },
    data: { isRead: true },
  });
}

/**
 * Mark all alerts as read.
 */
export async function markAllAlertsRead(): Promise<number> {
  const result = await prisma.adminAlert.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
  return result.count;
}

/**
 * Clean up old alerts (keep last 30 days).
 */
export async function cleanupOldAlerts(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.adminAlert.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      isRead: true,
    },
  });
  return result.count;
}
