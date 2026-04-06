import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export type ReportPeriod = "7d" | "14d" | "30d" | "90d" | "6m" | "1y" | "all";

export interface FinancialReport {
  period: { startDate: string; endDate: string };
  deposits: {
    count: number;
    totalAmount: number;
    averageAmount: number;
  };
  withdrawals: {
    count: number;
    totalAmount: number;
    averageAmount: number;
  };
  bets: {
    count: number;
    totalStaked: number;
    totalPotentialPayout: number;
  };
  totalRevenue: number;
  transactionsByType: Array<{
    type: string;
    status: string;
    _sum: { amount: number | null };
    _count: number;
  }>;
}

export interface BettingReport {
  period: { startDate: string; endDate: string };
  totalBets: number;
  totalStaked: number;
  averageStake: number;
  betsByStatus: Array<{
    status: string;
    _count: number;
    _sum: { stake: number | null; potentialPayout: number | null };
  }>;
  winLossStats: {
    won: number;
    lost: number;
    void: number;
    pending: number;
    winRate: number;
  };
  topMarkets: Array<{
    marketType: string;
    count: number;
    totalStaked: number;
  }>;
}

export interface UserReport {
  period: { startDate: string; endDate: string };
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  averageBetsPerActiveUser: number;
  topBettors: Array<{
    id: string;
    email: string;
    name: string | null;
    betCount: number;
  }>;
}

export interface RiskReport {
  period: { startDate: string; endDate: string };
  totalAlerts: number;
  alertsBySeverity: Array<{
    severity: string;
    _count: number;
  }>;
  alertsByType: Array<{
    alertType: string;
    _count: number;
  }>;
  recentHighRiskAlerts: Array<{
    id: string;
    alertType: string;
    severity: string;
    status: string;
    createdAt: string;
    user: { email: string; id: string } | null;
  }>;
  resolutionRate: number;
}

export function useAdminFinancialReport(
  period: ReportPeriod = "30d",
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ["admin-financial-report", period, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("period", period);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await api.get<FinancialReport>(
        `/reports/admin/financial?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useAdminBettingReport(
  period: ReportPeriod = "30d",
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ["admin-betting-report", period, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("period", period);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await api.get<BettingReport>(
        `/reports/admin/betting?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useAdminUsersReport(
  period: ReportPeriod = "30d",
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ["admin-users-report", period, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("period", period);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await api.get<UserReport>(
        `/reports/admin/users?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useAdminRiskReport(
  period: ReportPeriod = "30d",
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ["admin-risk-report", period, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("period", period);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await api.get<RiskReport>(
        `/reports/admin/risk?${params.toString()}`,
      );
      return response.data;
    },
  });
}
