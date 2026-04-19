import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/api/axiosConfig";
import { configureAuthHandlers, setAccessToken } from "@/api/axiosConfig";

type Role = "USER" | "ADMIN";

type AuthUser = {
  id: string;
  email: string;
  phone: string;
  fullName?: string;
  role: Role;
  isVerified: boolean;
  createdAt: string;
  bannedAt?: string | null;
  mustChangePassword?: boolean;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

// Storage keys for persistent auth state
const AUTH_TOKEN_KEY = "betwise-auth-token";
const AUTH_USER_KEY = "betwise-auth-user";
const AUTH_RECOVERY_FLAG = "betwise-auth-recovery";

// Utility functions for sessionStorage management
function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function getStoredUser(): AuthUser | null {
  try {
    const stored = sessionStorage.getItem(AUTH_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function persistAuthState(token: string, user: AuthUser): void {
  try {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    console.warn("[Auth] Failed to persist auth state to sessionStorage");
  }
}

function clearStoredAuth(): void {
  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_RECOVERY_FLAG);
  } catch {
    console.warn("[Auth] Failed to clear auth state from sessionStorage");
  }
}

function setRecoveryFlag(): void {
  try {
    sessionStorage.setItem(AUTH_RECOVERY_FLAG, Date.now().toString());
  } catch {
    // Silently fail - not critical
  }
}

function clearRecoveryFlag(): void {
  try {
    sessionStorage.removeItem(AUTH_RECOVERY_FLAG);
  } catch {
    // Silently fail
  }
}

type AdminMfaRequiredResponse = {
  mfaRequired: true;
  mfaMode: "totp_setup" | "totp_verify";
  mfaToken: string;
  expiresInSeconds: number;
  message: string;
  qrCodeDataUrl?: string;
  manualEntryKey?: string;
};

type PasswordChangeRequiredResponse = {
  message: string;
  requirePasswordChange: true;
  userId: string;
  accessToken: string;
  user: AuthUser;
};

type LoginResult =
  | {
      status: "authenticated";
      user: AuthUser;
    }
  | {
      status: "password_change_required";
      user: AuthUser;
      message: string;
    }
  | {
      status: "mfa_required";
      mfaMode: "totp_setup" | "totp_verify";
      mfaToken: string;
      expiresInSeconds: number;
      message: string;
      qrCodeDataUrl?: string;
      manualEntryKey?: string;
    };

type MeResponse = {
  user: AuthUser;
};

type RegisterPayload = {
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

type LoginPayload = {
  phone: string;
  password: string;
};

type AuthModal = "none" | "login" | "register" | "forgot-password";

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<LoginResult>;
  verifyAdminMfa: (payload: { mfaToken: string; otpCode: string }) => Promise<
    | { status: "authenticated"; user: AuthUser }
    | {
        status: "password_change_required";
        user: AuthUser;
        message: string;
      }
  >;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  authModal: AuthModal;
  openAuthModal: (modal: AuthModal) => void;
  closeAuthModal: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function clearAuthState(
  setUser: (value: AuthUser | null) => void,
  setToken: (value: string | null) => void,
) {
  setUser(null);
  setToken(null);
  setAccessToken(null);
  clearStoredAuth();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModal, setAuthModal] = useState<AuthModal>("none");

  const openAuthModal = useCallback((modal: AuthModal) => {
    setAuthModal(modal);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal("none");
  }, []);

  const updateSession = useCallback((data: AuthResponse) => {
    setUser(data.user);
    setAccessTokenState(data.accessToken);
    setAccessToken(data.accessToken);
    persistAuthState(data.accessToken, data.user);
    clearRecoveryFlag();
  }, []);

  const refreshSession = useCallback(async () => {
    let hasValidAuth = false;
    const currentToken = accessTokenState ?? getStoredToken();
    const isRecoveryFlowActive = Boolean(currentToken);

    // Avoid noisy unauthenticated probes for first-time visitors.
    if (!isRecoveryFlowActive) {
      return null;
    }

    try {
      const me = await api.get<MeResponse>("/auth/me");
      setUser(me.data.user);
      hasValidAuth = true;

      // Keep existing token if /auth/me succeeds
      if (currentToken) {
        persistAuthState(currentToken, me.data.user);
      }
      return currentToken;
    } catch (meError) {
      // /auth/me failed, try refreshing token
    }

    try {
      const { data } = await api.post<AuthResponse>("/auth/refresh");
      updateSession(data);
      hasValidAuth = true;
      return data.accessToken;
    } catch (refreshError) {
      // Refresh failed
    }

    // Both /auth/me and /auth/refresh failed — session is dead
    // Clear auth state so the user gets the login modal
    if (!hasValidAuth) {
      clearAuthState(setUser, setAccessTokenState);
      return null;
    }

    return currentToken;
  }, [accessTokenState, updateSession]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // No-op: clear local auth state even if backend call fails.
    } finally {
      clearAuthState(setUser, setAccessTokenState);
      setAuthModal("none");
    }
  }, []);

  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResult> => {
      const response = await api.post<
        AuthResponse | AdminMfaRequiredResponse | PasswordChangeRequiredResponse
      >("/auth/login", payload, {
        validateStatus: (status) => status === 200 || status === 202,
      });

      if (response.status === 202 && "mfaRequired" in response.data) {
        return {
          status: "mfa_required" as const,
          mfaMode: response.data.mfaMode,
          mfaToken: response.data.mfaToken,
          expiresInSeconds: response.data.expiresInSeconds,
          message: response.data.message,
          qrCodeDataUrl: response.data.qrCodeDataUrl,
          manualEntryKey: response.data.manualEntryKey,
        };
      }

      if (
        "requirePasswordChange" in response.data &&
        response.data.requirePasswordChange
      ) {
        const data = response.data as PasswordChangeRequiredResponse;
        updateSession(data);

        return {
          status: "password_change_required" as const,
          user: data.user,
          message: data.message,
        };
      }

      const data = response.data as AuthResponse;
      updateSession(data);
      return {
        status: "authenticated" as const,
        user: data.user,
      };
    },
    [updateSession],
  );

  const verifyAdminMfa = useCallback(
    async (payload: { mfaToken: string; otpCode: string }) => {
      const { data } = await api.post<
        AuthResponse | PasswordChangeRequiredResponse
      >("/auth/login/verify-admin-mfa", payload);

      if ("requirePasswordChange" in data && data.requirePasswordChange) {
        updateSession(data);
        return {
          status: "password_change_required" as const,
          user: data.user,
          message: data.message,
        };
      }

      updateSession(data);
      return {
        status: "authenticated" as const,
        user: data.user,
      };
    },
    [updateSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const { data } = await api.post<AuthResponse>("/auth/register", payload);
      updateSession(data);
      return data.user;
    },
    [updateSession],
  );

  useEffect(() => {
    configureAuthHandlers({
      onRefresh: refreshSession,
      onUnauthorized: () => {
        clearAuthState(setUser, setAccessTokenState);
        setAuthModal("login");
      },
    });
  }, [refreshSession]);

  // CRITICAL: Initialize auth state from sessionStorage IMMEDIATELY
  // This prevents logout during payment redirects
  useEffect(() => {
    // Restore persisted auth state first (synchronous, fast)
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setAccessTokenState(storedToken);
      setAccessToken(storedToken);
      setUser(storedUser);
      console.debug("[Auth] Restored session from sessionStorage");
    }

    // Then verify/refresh the session (async)
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const isPaymentRedirect =
          params.has("reference") || params.has("status");

        // If returning from payment provider, immediately set recovery flag
        if (isPaymentRedirect) {
          setRecoveryFlag();
          console.debug(
            "[Auth] Payment redirect detected, initiating recovery",
          );
        }

        // Try to refresh session to ensure token is still valid
        const result = await refreshSession();

        // If recovery failed, try one more time to be safe
        if (isPaymentRedirect && !result) {
          console.debug("[Auth] First recovery attempt failed, retrying...");
          await new Promise((resolve) => setTimeout(resolve, 500));
          await refreshSession();
        }

        clearRecoveryFlag();
      } catch (error) {
        // IMPORTANT: Do NOT log out on init if refresh fails
        // This is critical for payment redirects where API might be slow
        // but token is still valid
        console.warn(
          "[Auth] Session refresh on init failed, keeping existing auth",
        );
        clearRecoveryFlag();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken: accessTokenState,
      isAuthenticated: Boolean(user && accessTokenState),
      isLoading,
      login,
      verifyAdminMfa,
      register,
      logout,
      refreshSession,
      authModal,
      openAuthModal,
      closeAuthModal,
    }),
    [
      accessTokenState,
      isLoading,
      login,
      verifyAdminMfa,
      logout,
      refreshSession,
      register,
      user,
      authModal,
      openAuthModal,
      closeAuthModal,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
