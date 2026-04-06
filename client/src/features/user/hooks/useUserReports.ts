import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export type ReportPeriod = "7d" | "14d" | "30d" | "90d" | "6m" | "1y" | "all";

export interface PersonalBettingStats {
  totalBets: number;
  totalStaked: number;
  totalWon: number;
  totalLost: number;
  profit: number;
  roi: number;
  winRate: number;
}

export interface PersonalFinancialStats {
  totalTransactions: number;
  totalAmount: number;
}

export interface PersonalReport {
  period: { startDate: string; endDate: string };
  betting: PersonalBettingStats;
  financial: PersonalFinancialStats;
  detailedResults: Array<{
    status: string;
    count: number;
    totalStaked: number;
    totalPayout: number;
  }>;
}

export interface Bet {
  id: string;
  side: string;
  displayOdds: number;
  stake: number;
  potentialPayout: number;
  status: string;
  placedAt: string;
  settledAt: string | null;
  profit: number;
  event: {
    homeTeam: string;
    awayTeam: string;
    commenceTime: string;
  };
}

export interface RecentBetsResponse {
  bets: Bet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface FinancialSummary {
  period: { startDate: string; endDate: string };
  currentBalance: number;
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
  netFlow: number;
  transactionDetails: Array<{
    type: string;
    status: string;
    _sum: { amount: number | null };
    _count: number;
  }>;
}

export function useUserPersonalReport(
  period: ReportPeriod = "30d",
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ["user-personal-report", period, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("period", period);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await api.get<PersonalReport>(
        `/reports/user/personal?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useUserRecentBets(
  period: ReportPeriod = "30d",
  page: number = 1,
  limit: number = 10,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: [
      "user-recent-bets",
      period,
      page,
      limit,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("period", period);
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await api.get<RecentBetsResponse>(
        `/reports/user/recent-bets?${params.toString()}`,
      );
      return response.data;
    },
  });
}

export function useUserFinancialSummary(
  period: ReportPeriod = "30d",
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: ["user-financial-summary", period, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("period", period);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await api.get<FinancialSummary>(
        `/reports/user/financial-summary?${params.toString()}`,
      );
      return response.data;
    },
  });
}
