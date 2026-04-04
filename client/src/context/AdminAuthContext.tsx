import { createContext, useContext, useMemo, useState } from "react";

type Admin = { id: number; username: string; email: string } | null;

type AuthContextValue = {
  token: string | null;
  admin: Admin;
  isAuthenticated: boolean;
  login: (token: string, admin: Exclude<Admin, null>) => void;
  logout: () => void;
};

const AdminAuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("bettcenic_token"),
  );
  const [admin, setAdmin] = useState<Admin>(() => {
    const saved = localStorage.getItem("bettcenic_admin");
    return saved ? JSON.parse(saved) : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      admin,
      isAuthenticated: Boolean(token),
      login: (nextToken, nextAdmin) => {
        localStorage.setItem("bettcenic_token", nextToken);
        localStorage.setItem("bettcenic_admin", JSON.stringify(nextAdmin));
        setToken(nextToken);
        setAdmin(nextAdmin);
      },
      logout: () => {
        localStorage.removeItem("bettcenic_token");
        localStorage.removeItem("bettcenic_admin");
        setToken(null);
        setAdmin(null);
        window.location.href = "/login";
      },
    }),
    [admin, token],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx)
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
