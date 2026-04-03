import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userPaymentsRoute } from "./payments";

export const userPaymentsWithdrawalRoute = createRoute({
  getParentRoute: () => userPaymentsRoute,
  path: "/withdrawal",
  component: lazyRouteComponent(() => import("@/features/user/payments/pages/withdrawal")),
});
