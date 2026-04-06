import { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { Toaster } from "sonner";
import AuthModals from "@/components/auth/AuthModals";

function Root() {
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


