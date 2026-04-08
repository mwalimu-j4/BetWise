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
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

type AdminMfaRequiredResponse = {
  mfaRequired: true;
  challengeId: string;
  expiresInSeconds: number;
  message: string;
  emailHint: string;
};

type LoginResult =
  | {
      status: "authenticated";
      user: AuthUser;
    }
  | {
      status: "mfa_required";
      challengeId: string;
      expiresInSeconds: number;
      message: string;
      emailHint: string;
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

type AuthModal = "none" | "login" | "register";

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<LoginResult>;
  verifyAdminMfa: (payload: {
    challengeId: string;
    otpCode: string;
  }) => Promise<AuthUser>;
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

      const me = await api.get<MeResponse>("/auth/me");
      if (me.data.user.id !== data.user.id) {
        clearAuthState(setUser, setAccessTokenState);
        return null;
      }

      setUser(me.data.user);
      return data.accessToken;
    } catch {
      // Don't clear auth state on refresh failure - the user may still have a valid access token.
      // The access token will be invalidated when it expires and a 401 is received from the API.
      return null;
    }
  }, [updateSession]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // No-op: clear local auth state even if backend call fails.
    } finally {
      clearAuthState(setUser, setAccessTokenState);
    }
  }, []);

  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResult> => {
      const response = await api.post<AuthResponse | AdminMfaRequiredResponse>(
        "/auth/login",
        payload,
        {
          validateStatus: (status) => status === 200 || status === 202,
        },
      );

      if (response.status === 202 && "mfaRequired" in response.data) {
        return {
          status: "mfa_required" as const,
          challengeId: response.data.challengeId,
          expiresInSeconds: response.data.expiresInSeconds,
          message: response.data.message,
          emailHint: response.data.emailHint,
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
    async (payload: { challengeId: string; otpCode: string }) => {
      const { data } = await api.post<AuthResponse>(
        "/auth/login/verify-admin-mfa",
        payload,
      );

      updateSession(data);
      return data.user;
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
