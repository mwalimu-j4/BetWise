import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userPaymentsRoute } from "./payments";

export const userPaymentsBonusesRoute = createRoute({
  getParentRoute: () => userPaymentsRoute,
  path: "/bonuses",
  component: lazyRouteComponent(() => import("@/features/user/payments/pages/bonuses")),
});
