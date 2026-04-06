import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export interface RiskAlert {
  id: string;
  alertType:
    | "HIGH_RISK_BET"
    | "EXPOSURE_LIMIT_EXCEEDED"
    | "SUSPICIOUS_PATTERN"
    | "RAPID_ACCOUNT_ACTIVITY"
    | "UNUSUAL_ODDS_MOVEMENT"
    | "SELF_EXCLUSION_BREACH"
    | "DUPLICATE_ACCOUNT"
    | "FRAUD_INDICATOR"
    | "BLACKLIST_MATCH"
    | "CUSTOM_RULE_VIOLATION";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_REVIEW" | "ESCALATED" | "RESOLVED" | "DISMISSED";
  description: string;
  userId?: string;
  betId?: string;
  eventId?: string;
  triggeredValue?: number;
  threshold?: number;
  details?: Record<string, any>;
  actionTaken?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
    phone: string;
  };
}

export interface RiskAlertsResponse {
  alerts: RiskAlert[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
    page: number;
  };
}

export interface RiskAlertDetail {
  alert: RiskAlert & {
    user?: {
      id: string;
      email: string;
      fullName?: string;
      phone: string;
      accountStatus: string;
      createdAt: string;
    };
  };
}

export interface RiskSummary {
  summary: {
    byStatus: {
      open: number;
      inReview: number;
      escalated: number;
    };
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  alertsByType: Array<{
    type: string;
    count: number;
  }>;
  alertsByDate: Record<string, number>;
  highRiskUsers: Array<{
    userId: string;
    email?: string;
    fullName?: string;
    alertCount: number;
  }>;
}

export function useAdminRiskAlerts(
  page: number = 1,
  limit: number = 20,
  status?: string,
  severity?: string,
  alertType?: string,
) {
  return useQuery({
    queryKey: ["admin-risk-alerts", page, limit, status, severity, alertType],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status) params.append("status", status);
      if (severity) params.append("severity", severity);
      if (alertType) params.append("alertType", alertType);

      const { data } = await api.get<RiskAlertsResponse>(
        `/admin/risk/alerts?${params.toString()}`,
      );
      return data;
    },
  });
}

export function useRiskAlertDetail(alertId: string) {
  return useQuery({
    queryKey: ["risk-alert-detail", alertId],
    queryFn: async () => {
      const { data } = await api.get<RiskAlertDetail>(
        `/admin/risk/alerts/${alertId}`,
      );
      return data;
    },
    enabled: !!alertId,
  });
}

export function useUpdateRiskAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      alertId: string;
      status?: string;
      actionTaken?: string;
      resolvedBy?: string;
    }) => {
      const { alertId, ...body } = variables;
      const { data } = await api.patch(`/admin/risk/alerts/${alertId}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-risk-alerts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["risk-alert-detail"],
      });
    },
  });
}

export function useAdminRiskSummary() {
  return useQuery({
    queryKey: ["admin-risk-summary"],
    queryFn: async () => {
      const { data } = await api.get<RiskSummary>("/admin/risk/summary");
      return data;
    },
  });
}
