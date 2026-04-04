import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userPaymentsRoute } from "./payments";

export const userPaymentsDepositRoute = createRoute({
  getParentRoute: () => userPaymentsRoute,
  path: "/deposit",
  component: lazyRouteComponent(
    () => import("@/features/user/payments/pages/deposit"),
  ),
});


