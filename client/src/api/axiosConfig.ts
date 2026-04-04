import axios from "axios";

type RefreshHandler = () => Promise<string | null>;
type UnauthorizedHandler = () => void;

type RetryableRequestConfig = {
  headers?: Record<string, string>;
  _retry?: boolean;
  url?: string;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL?.trim() || "/api",
  withCredentials: true,
});

let accessToken: string | null = null;
let refreshHandler: RefreshHandler | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let refreshPromise: Promise<string | null> | null = null;

function shouldSkipRefresh(url: string | undefined) {
  if (!url) return false;
  return (
    url.includes("/auth/refresh") ||
    url.includes("/auth/login") ||
    url.includes("/auth/register")
  );
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function configureAuthHandlers(handlers: {
  onRefresh: RefreshHandler;
  onUnauthorized: UnauthorizedHandler;
}) {
  refreshHandler = handlers.onRefresh;
  unauthorizedHandler = handlers.onUnauthorized;
}

api.interceptors.request.use((config) => {
  const mutableConfig = config as RetryableRequestConfig;
  mutableConfig.headers = mutableConfig.headers ?? {};

  if (accessToken) {
    mutableConfig.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status as number | undefined;

    if (
      !originalRequest ||
      status !== 401 ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshHandler) {
      unauthorizedHandler?.();
      return Promise.reject(error);
    }

    if (!refreshPromise) {
      refreshPromise = refreshHandler().finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;

    if (!newToken) {
      unauthorizedHandler?.();
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${newToken}`;

    return api(originalRequest);
  },
);

export { api };
