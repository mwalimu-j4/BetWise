import { prisma } from "../lib/prisma";
import type { RiskAlertType, RiskSeverity } from "@prisma/client";

export interface CreateRiskAlertInput {
  alertType: RiskAlertType;
  severity: RiskSeverity;
  description: string;
  userId?: string;
  betId?: string;
  eventId?: string;
  triggeredValue?: number;
  threshold?: number;
  details?: Record<string, any>;
}

export async function createRiskAlert(input: CreateRiskAlertInput) {
  return prisma.riskAlert.create({
    data: {
      alertType: input.alertType,
      severity: input.severity,
      description: input.description,
      userId: input.userId,
      betId: input.betId,
      eventId: input.eventId,
      triggeredValue: input.triggeredValue,
      threshold: input.threshold,
      details: input.details,
      status: "OPEN",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
        },
      },
    },
  });
}

export async function resolveRiskAlert(
  alertId: string,
  actionTaken: string,
  resolvedBy: string,
) {
  return prisma.riskAlert.update({
    where: { id: alertId },
    data: {
      status: "RESOLVED",
      actionTaken,
      resolvedBy,
      resolvedAt: new Date(),
    },
  });
}

export async function dismissRiskAlert(alertId: string) {
  return prisma.riskAlert.update({
    where: { id: alertId },
    data: {
      status: "DISMISSED",
      resolvedAt: new Date(),
    },
  });
}

export async function escalateRiskAlert(alertId: string) {
  return prisma.riskAlert.update({
    where: { id: alertId },
    data: {
      status: "ESCALATED",
    },
  });
}
