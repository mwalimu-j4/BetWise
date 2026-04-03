import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminOddsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/odds",
  component: lazyRouteComponent(() => import("@/features/admin/modules/odds")),
});
