import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminAnalyticsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/analytics",
  component: lazyRouteComponent(
    () => import("@/features/admin/modules/analytics"),
  ),
});