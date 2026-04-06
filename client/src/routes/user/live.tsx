import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userLiveRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/live",
  component: lazyRouteComponent(() => import("@/features/user/pages/live")),
});
