import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userPaymentsRoute } from "./payments";

export const userPaymentsMethodsRoute = createRoute({
  getParentRoute: () => userPaymentsRoute,
  path: "/methods",
  component: lazyRouteComponent(() => import("@/features/user/payments/pages/methods")),
});
