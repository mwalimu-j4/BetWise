import api from "./axios";

export async function getBets(params: Record<string, string | number>) {
  const { data } = await api.get("/api/admin/bets", { params });
  return data;
}

export async function settleBet(
  betId: number,
  result: "home_win" | "draw" | "away_win",
) {
  const { data } = await api.post(`/api/admin/bets/${betId}/settle`, {
    result,
  });
  return data;
}
