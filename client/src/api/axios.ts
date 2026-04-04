import axios from "axios";

const api = axios.create({
  baseURL: (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined)?.trim() || "http://localhost:5000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bettcenic_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("bettcenic_token");
      localStorage.removeItem("bettcenic_admin");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
