import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userPaymentsRoute } from "./payments";

export const userPaymentsIndexRoute = createRoute({
  getParentRoute: () => userPaymentsRoute,
  path: "/",
  component: lazyRouteComponent(() => import("@/features/user/payments/pages/overview")),
});
