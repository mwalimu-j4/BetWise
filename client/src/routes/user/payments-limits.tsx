import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userPaymentsRoute } from "./payments";

export const userPaymentsLimitsRoute = createRoute({
  getParentRoute: () => userPaymentsRoute,
  path: "/limits",
  component: lazyRouteComponent(() => import("@/features/user/payments/pages/limits")),
});
