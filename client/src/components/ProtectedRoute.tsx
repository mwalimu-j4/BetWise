import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireRole?: "ADMIN" | "USER";
  redirectTo?: string;
};

export default function ProtectedRoute({
  children,
  requireRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, openAuthModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    if (requireRole && user?.role !== requireRole) {
      void navigate({ to: "/" });
    }
  }, [
    isAuthenticated,
    isLoading,
    navigate,
    requireRole,
    user?.role,
    openAuthModal,
  ]);

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
