import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userReportsRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/reports",
  component: lazyRouteComponent(() => import("@/features/user/pages/reports")),
});
