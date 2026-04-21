import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminSecurityRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/security",
  component: lazyRouteComponent(
    () => import("@/features/admin/modules/security"),
  ),
});
