import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userPaymentsRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/payments",
  component: lazyRouteComponent(() => import("@/features/user/payments/page")),
});
