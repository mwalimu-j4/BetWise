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
  role: Role;
  isVerified: boolean;
  createdAt: string;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
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

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
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
      clearAuthState(setUser, setAccessTokenState);
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
    async (payload: LoginPayload) => {
      const { data } = await api.post<AuthResponse>("/auth/login", payload);
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
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          const redirect = `${window.location.pathname}${window.location.search}`;
          window.location.assign(
            `/login?redirect=${encodeURIComponent(redirect)}`,
          );
        }
      },
    });
  }, [refreshSession]);

  useEffect(() => {
    void (async () => {
      await refreshSession();
      setIsLoading(false);
    })();
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken: accessTokenState,
      isAuthenticated: Boolean(user && accessTokenState),
      isLoading,
      login,
      register,
      logout,
      refreshSession,
    }),
    [
      accessTokenState,
      isLoading,
      login,
      logout,
      refreshSession,
      register,
      user,
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
