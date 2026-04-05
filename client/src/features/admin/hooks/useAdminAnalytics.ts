import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export type AnalyticsTimeframe = "4w" | "12w" | "6m" | "12m" | "3y";
export type AnalyticsGroupBy = "week" | "month" | "year";

export interface AnalyticsResponse {
  generatedAt: string;
  timeframe: AnalyticsTimeframe;
  groupBy: AnalyticsGroupBy;
  window: {
    start: string;
    end: string;
  };
  financialSummary: {
    handle: number;
    payouts: number;
    refunds: number;
    ggr: number;
    commissionRate: number;
    commissionProvision: number;
    taxRate: number;
    taxProvision: number;
    ngr: number;
  };
  operationalSummary: {
    betCount: number;
    settledCount: number;
    activeBettors: number;
    averageStake: number;
    averageOdds: number;
    holdRate: number;
    payoutRatio: number;
    refundRate: number;
    hitRate: number;
    wonCount: number;
    lostCount: number;
    voidCount: number;
    pendingCount: number;
  };
  growth: {
    handleChangePct: number;
    ggrChangePct: number;
    activeBettorsChangePct: number;
  };
  signalCards: Array<{
    label: string;
    value: string;
    helper: string;
    tone: "accent" | "blue" | "gold" | "red" | "purple";
  }>;
  trend: Array<{
    period: string;
    stake: number;
    payout: number;
    refunds: number;
    ggr: number;
    ngr: number;
    betCount: number;
    activeBettors: number;
    holdRate: number;
    hitRate: number;
  }>;
  breakdowns: {
    sports: Array<{
      sport: string;
      bets: number;
      activeBettors: number;
      stake: number;
      payout: number;
      refunds: number;
      ggr: number;
      shareOfHandle: number;
      hitRate: number;
    }>;
    leagues: Array<{
      league: string;
      sport: string;
      bets: number;
      activeBettors: number;
      stake: number;
      payout: number;
      refunds: number;
      ggr: number;
      shareOfHandle: number;
    }>;
    outcomes: Array<{
      status: string;
      count: number;
      share: number;
    }>;
    stakeDistribution: Array<{
      band: string;
      bets: number;
      handle: number;
      share: number;
    }>;
    oddsPerformance: Array<{
      band: string;
      bets: number;
      hitRate: number;
      stake: number;
      payout: number;
      ggr: number;
      holdRate: number;
    }>;
  };
  recommendations: Array<{
    title: string;
    priority: "high" | "medium" | "low";
    insight: string;
    action: string;
  }>;
}

export function useAdminAnalytics(params: {
  timeframe: AnalyticsTimeframe;
  groupBy: AnalyticsGroupBy;
}) {
  return useQuery({
    queryKey: ["admin-analytics", params.timeframe, params.groupBy],
    queryFn: async () => {
      const response = await api.get<AnalyticsResponse>("/admin/analytics", {
        params,
      });
      return response.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
