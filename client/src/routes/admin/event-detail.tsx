import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminEventDetailRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/events/$eventId",
  component: lazyRouteComponent(
    () => import("@/features/admin/modules/event-detail"),
  ),
});
