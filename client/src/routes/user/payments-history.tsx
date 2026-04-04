import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userPaymentsRoute } from "./payments";

export const userPaymentsHistoryRoute = createRoute({
  getParentRoute: () => userPaymentsRoute,
  path: "/history",
  component: lazyRouteComponent(
    () => import("@/features/user/payments/pages/history"),
  ),
});


