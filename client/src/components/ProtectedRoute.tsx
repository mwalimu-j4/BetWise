import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireRole?: "ADMIN" | "USER";
};

export default function ProtectedRoute({
  children,
  requireRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const adminToken =
    typeof window !== "undefined" ? localStorage.getItem("bettcenic_token") : null;
  const hasAdminJwt = Boolean(adminToken);
  const adminRoute = requireRole === "ADMIN";

  useEffect(() => {
    if (adminRoute && hasAdminJwt) {
      return;
    }

    if (isLoading) return;

    if (!isAuthenticated) {
      void navigate({
        to: "/login",
        search: {
          redirect: `${location.pathname}${location.searchStr}`,
        },
      });
      return;
    }

    if (requireRole && user?.role !== requireRole) {
      void navigate({ to: "/user" });
    }
  }, [
    adminRoute,
    hasAdminJwt,
    isAuthenticated,
    isLoading,
    location.pathname,
    location.searchStr,
    navigate,
    requireRole,
    user?.role,
  ]);

  if (adminRoute && hasAdminJwt) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[30vh] place-items-center text-admin-text-muted">
        Restoring session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireRole && user?.role !== requireRole) {
    return null;
  }

  return <>{children}</>;
}
