import axios from "axios";

const PRODUCTION_API_BASE_URL = "https://api.betixpro.com/api";
const PRODUCTION_APP_HOSTS = new Set(["betixpro.com", "www.betixpro.com"]);
const PRODUCTION_API_HOST = "api.betixpro.com";

type RefreshHandler = () => Promise<string | null>;
type UnauthorizedHandler = () => void;

function resolveApiBaseUrl() {
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const configuredBaseUrl = rawBaseUrl || PRODUCTION_API_BASE_URL;

  if (typeof window === "undefined") {
    return configuredBaseUrl;
  }

  const appHost = window.location.hostname;
  const isLocalAppHost = appHost === "localhost" || appHost === "127.0.0.1";
  const isPublicProductionHost = PRODUCTION_APP_HOSTS.has(appHost);

  if (!rawBaseUrl) {
    return isLocalAppHost ? "/api" : PRODUCTION_API_BASE_URL;
  }

  if (isPublicProductionHost) {
    // Hard fail-safe for production frontend domains: always call the API origin.
    if (rawBaseUrl.startsWith("/")) {
      return PRODUCTION_API_BASE_URL;
    }

    try {
      const baseUrl = new URL(rawBaseUrl, window.location.origin);
      const host = baseUrl.hostname.toLowerCase();
      const normalizedPath = baseUrl.pathname.replace(/\/+$/, "");
      const hasApiPath =
        normalizedPath === "/api" || normalizedPath.startsWith("/api/");

      if (host === PRODUCTION_API_HOST && hasApiPath) {
        return `${baseUrl.origin}/api`;
      }

      return PRODUCTION_API_BASE_URL;
    } catch {
      return PRODUCTION_API_BASE_URL;
    }
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

const AUTH_TOKEN_KEY = "betwise-auth-token";

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

export function getAccessToken() {
  return accessToken;
}

export function getStoredAccessToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshHandler() {
  return refreshHandler;
}

export function getUnauthorizedHandler() {
  return unauthorizedHandler;
}

api.interceptors.request.use(
  (config) => {
    // Priority: memory variable > localStorage
    const token = accessToken || getStoredAccessToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log("[Axios] 401 detected, attempting refresh...");
      originalRequest._retry = true;

      if (refreshHandler) {
        try {
          const newToken = await refreshHandler();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error("[Axios] Refresh failed:", refreshError);
        }
      }

      // If no refresh handler or refresh fails, call unauthorized handler
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    return Promise.reject(error);
  },
);

export { api };
