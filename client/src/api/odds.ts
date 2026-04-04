import api from "./axios";

export async function getOdds(eventId: string) {
  const { data } = await api.get(`/api/admin/odds/${eventId}`);
  return data;
}

export async function updateOddVisibility(
  eventId: string,
  payload: {
    bookmaker_id: string;
    market_type: string;
    side: string;
    is_visible: boolean;
  },
) {
  const { data } = await api.patch(`/api/admin/odds/${eventId}`, payload);
  return data;
}

export async function overrideOdd(
  eventId: string,
  payload: {
    bookmaker_id: string;
    market_type: string;
    side: string;
    custom_odds: number;
  },
) {
  const { data } = await api.post(
    `/api/admin/odds/${eventId}/override`,
    payload,
  );
  return data;
}
