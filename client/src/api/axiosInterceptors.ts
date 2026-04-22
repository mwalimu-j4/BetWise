import { api, getAccessToken, getRefreshHandler, getStoredAccessToken, getUnauthorizedHandler } from "@/api/axiosConfig";

type RetryableRequestConfig = {
  headers?: Record<string, string>;
  _retry?: boolean;
  url?: string;
};

let installed = false;

function debugLog(message: string, details: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.log(message, details);
  }
}

function shouldSkipRefresh(url: string | undefined) {
  if (!url) return false;
  return (
    url.includes("/auth/refresh") ||
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/me")
  );
}

export function installApiInterceptors() {
  if (installed) return;
  installed = true;

  api.interceptors.request.use((config) => {
    const mutableConfig = config as RetryableRequestConfig;
    mutableConfig.headers = mutableConfig.headers ?? {};

    let tokenToUse = getAccessToken();
    if (!tokenToUse) {
      tokenToUse = getStoredAccessToken();
      if (tokenToUse) {
        debugLog("[Axios] Restored token from localStorage", {
          hasToken: true,
          url: config.url,
        });
      }
    }

    if (tokenToUse) {
      mutableConfig.headers.Authorization = `Bearer ${tokenToUse}`;
      debugLog("[Axios] Added Authorization header", {
        url: config.url,
        hasToken: true,
      });
    }

    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as RetryableRequestConfig | undefined;
      const status = error.response?.status as number | undefined;

      if (status === 401) {
        getUnauthorizedHandler()?.();
        return Promise.reject(error);
      }

      if (
        !originalRequest ||
        status !== 401 ||
        originalRequest._retry ||
        shouldSkipRefresh(originalRequest.url)
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      const refreshHandler = getRefreshHandler();
      if (!refreshHandler) {
        getUnauthorizedHandler()?.();
        return Promise.reject(error);
      }

      return Promise.reject(error);
    },
  );
}
