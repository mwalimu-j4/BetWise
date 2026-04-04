import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminRiskRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/risk",
  component: lazyRouteComponent(() => import("@/features/admin/modules/risk")),
});


