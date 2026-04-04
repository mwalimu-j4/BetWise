import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminEventsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/events",
  component: lazyRouteComponent(
    () => import("@/features/admin/modules/events"),
  ),
});


