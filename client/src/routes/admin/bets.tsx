import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminBetsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/bets",
  component: lazyRouteComponent(() => import("@/features/admin/modules/bets")),
});
