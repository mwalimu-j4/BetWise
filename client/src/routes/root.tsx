import { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { Toaster } from "sonner";
import AuthModals from "@/components/auth/AuthModals";
import SplashScreen from "@/components/SplashScreen";
import { useEffect, useState } from "react";

function Root() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Only show splash on initial page load, not on subsequent data fetches
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (isInitializing) {
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

type RootSearchParams = {
  modal?: "login" | "register" | "forgot-password";
};

export const rootRoute = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  validateSearch: (search: Record<string, unknown>): RootSearchParams => {
    return {
      modal: (search.modal as RootSearchParams["modal"]) || undefined,
    };
  },
  component: Root,
});
