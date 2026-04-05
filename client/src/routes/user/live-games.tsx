import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userLiveGamesRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/live-games",
  component: lazyRouteComponent(() => import("@/features/user/live-games")),
});


