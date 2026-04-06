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

const persistedSessionKey = "betwise-auth-session";
const persistedTokenKey = "betwise-auth-token";
const persistedUserKey = "betwise-auth-user";

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
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
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
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(persistedSessionKey);
    window.localStorage.removeItem(persistedTokenKey);
    window.localStorage.removeItem(persistedUserKey);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateSession = useCallback((data: AuthResponse) => {
    setUser(data.user);
    setAccessTokenState(data.accessToken);
    setAccessToken(data.accessToken);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(persistedSessionKey, "true");
      window.localStorage.setItem(persistedTokenKey, data.accessToken);
      window.localStorage.setItem(persistedUserKey, JSON.stringify(data.user));
    }
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
    } catch (error) {
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
    async (payload: LoginPayload) => {
      const { data } = await api.post<AuthResponse>("/auth/login", payload);
      updateSession(data);
    },
    [updateSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const { data } = await api.post<AuthResponse>("/auth/register", payload);
      updateSession(data);
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
    const hasPersistedSession =
      typeof window !== "undefined" &&
      window.localStorage.getItem(persistedSessionKey) === "true";

    if (!hasPersistedSession) {
      setIsLoading(false);
      return;
    }

    // Restore token and user from localStorage immediately
    const persistedToken =
      typeof window !== "undefined"
        ? window.localStorage.getItem(persistedTokenKey)
        : null;
    const persistedUserJson =
      typeof window !== "undefined"
        ? window.localStorage.getItem(persistedUserKey)
        : null;

    if (persistedToken && persistedUserJson) {
      try {
        const persistedUser = JSON.parse(persistedUserJson) as AuthUser;
        setAccessTokenState(persistedToken);
        setAccessToken(persistedToken);
        setUser(persistedUser);
        setIsLoading(false); // User is restored, stop loading immediately
      } catch {
        // Invalid stored data, clear and fall through to login
        clearAuthState(setUser, setAccessTokenState);
        setIsLoading(false);
        return;
      }
    } else {
      setIsLoading(false);
      return;
    }

    // Attempt to refresh and validate session in the background (don't block UI on this)
    void refreshSession();
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
