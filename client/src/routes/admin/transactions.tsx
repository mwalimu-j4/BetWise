import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminTransactionsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/transactions",
  component: lazyRouteComponent(
    () => import("@/features/admin/modules/transactions"),
  ),
});


