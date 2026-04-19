import axios from "axios";

const PRODUCTION_API_BASE_URL = "https://api.betixpro.com/api";

type RefreshHandler = () => Promise<string | null>;
type UnauthorizedHandler = () => void;

type RetryableRequestConfig = {
  headers?: Record<string, string>;
  _retry?: boolean;
  url?: string;
};

function resolveApiBaseUrl() {
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const configuredBaseUrl = rawBaseUrl || PRODUCTION_API_BASE_URL;

  if (typeof window === "undefined") {
    return configuredBaseUrl;
  }

  const appHost = window.location.hostname;
  const isLocalAppHost = appHost === "localhost" || appHost === "127.0.0.1";

  if (!rawBaseUrl) {
    return isLocalAppHost ? "/api" : PRODUCTION_API_BASE_URL;
  }

  if (!isLocalAppHost) {
    return rawBaseUrl;
  }

  try {
    const baseUrl = new URL(rawBaseUrl, window.location.origin);
    const isLocalApiHost =
      baseUrl.hostname === "localhost" || baseUrl.hostname === "127.0.0.1";
    const isCrossOrigin = baseUrl.origin !== window.location.origin;

    // In local development, cross-origin localhost APIs break refresh-cookie persistence.
    // Route through Vite's same-origin /api proxy so the browser keeps auth cookies.
    if (isLocalApiHost && isCrossOrigin) {
      return "/api";
    }
  } catch {
    // Ignore invalid URL and use raw value.
  }

  return rawBaseUrl;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
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
