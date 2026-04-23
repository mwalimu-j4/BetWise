import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";

export type BetSelectionDetail = {
  event_id: string;
  home_team: string;
  away_team: string;
  match_time: string;
  market_type: string;
  pick: string;
  odds: number;
  ft_result: string | null;
  status: "won" | "lost" | "pending" | "live" | "cancelled";
  live_score: string | null;
};

export type BetDetail = {
  id: string;
  bet_code: string;
  status: "bonus" | "won" | "lost" | "open" | "cancelled";
  amount: number;
  possible_payout: number;
  total_odds: number;
  match_name?: string;
  match_time: string;
  placed_at: string;
  promoted_text: string | null;
  wlt: {
    won: number;
    lost: number;
    tie: number;
  };
  selections: BetSelectionDetail[];
};

function hasIntegrityIssue(bet: BetDetail) {
  const computed = Math.round(bet.amount * bet.total_odds * 100) / 100;
  return Math.abs(computed - bet.possible_payout) > 0.01;
}

export function useBetDetail(betId: string | undefined) {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: ["my-bet-detail", betId],
    enabled: isAuthenticated && Boolean(betId),
    queryFn: async () => {
      const { data } = await api.get<BetDetail>(`/my-bets/${betId}`);
      return data;
    },
  });

  const integrityError = useMemo(() => {
    if (!query.data) {
      return false;
    }

    return hasIntegrityIssue(query.data);
  }, [query.data]);

  return {
    ...query,
    integrityError,
  };
}
