import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userIndexRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/",
  component: lazyRouteComponent(() => import("@/features/user/home")),
});
