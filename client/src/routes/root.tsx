import { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useAuth } from "@/context/AuthContext";
import AuthModals from "@/components/auth/AuthModals";
import SplashScreen from "@/components/SplashScreen";

function Root() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <>
      <Outlet />
      <AuthModals />
      <Toaster richColors position="bottom-right" />
    </>
  );
}

export const rootRoute = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: Root,
});


