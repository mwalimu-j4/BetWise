import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userPaymentsRoute } from "./payments";

export const userPaymentsStatementsRoute = createRoute({
  getParentRoute: () => userPaymentsRoute,
  path: "/statements",
  component: lazyRouteComponent(() => import("@/features/user/payments/pages/statements")),
});
