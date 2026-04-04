import api from "./axios";

export async function getEvents(params: Record<string, string | number>) {
  const { data } = await api.get("/api/admin/events", { params });
  return data;
}

export async function getEventDetail(eventId: string) {
  const { data } = await api.get(`/api/admin/events/${eventId}`);
  return data;
}

export async function toggleEvent(eventId: string) {
  const { data } = await api.patch(`/api/admin/events/${eventId}/toggle`);
  return data;
}

export async function updateEventConfig(
  eventId: string,
  payload: { house_margin: number; markets_enabled: string[] },
) {
  const { data } = await api.patch(
    `/api/admin/events/${eventId}/config`,
    payload,
  );
  return data;
}
