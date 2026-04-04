import api from "./axios";

export async function getDashboard() {
  const { data } = await api.get("/api/admin/dashboard");
  return data;
}
