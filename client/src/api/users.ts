import api from "./axios";

export async function getUsers(params: Record<string, string | number>) {
  const { data } = await api.get("/api/admin/users", { params });
  return data;
}

export async function toggleUser(userId: number) {
  const { data } = await api.patch(`/api/admin/users/${userId}/toggle`);
  return data;
}
