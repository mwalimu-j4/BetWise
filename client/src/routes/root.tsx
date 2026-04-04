import { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { Toaster } from "sonner";

function Root() {
  return (
    <>
      <Outlet />
      <Toaster  richColors position="bottom-right" />
    </>
  );
}

export const rootRoute = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: Root,
});


