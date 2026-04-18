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
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data } = await api.post<AuthResponse>("/auth/refresh");
      updateSession(data);

      // Verify the session is valid
      try {
        const me = await api.get<MeResponse>("/auth/me");
        if (me.data.user.id !== data.user.id) {
          clearAuthState(setUser, setAccessTokenState);
          return null;
        }
        setUser(me.data.user);
      } catch {
        // User retrieval failed, but token refresh succeeded
        // Keep the session valid
      }

      return data.accessToken;
    } catch {
      // Refresh token might be invalid or expired
      // Try to verify current session with GET /auth/me
      try {
        const me = await api.get<MeResponse>("/auth/me");
        setUser(me.data.user);
        return accessTokenState;
      } catch {
        // Session is genuinely invalid
        clearAuthState(setUser, setAccessTokenState);
        return null;
      }
    }
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

  useEffect(() => {
    void (async () => {
      try {
        await refreshSession();
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
