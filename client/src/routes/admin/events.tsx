import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminEventsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/events",
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
  component: lazyRouteComponent(
    () => import("@/features/admin/modules/events"),
  ),
});


