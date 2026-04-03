import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { rootRoute } from "../root";

export const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: lazyRouteComponent(
    () => import("@/features/admin/components/shell"),
  ),
});
