import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userLiveRoute } from "./live";

export const userLiveMatchRoute = createRoute({
  getParentRoute: () => userLiveRoute,
  path: "/$matchId",
  component: lazyRouteComponent(
    () => import("@/features/user/pages/live-match"),
  ),
});
