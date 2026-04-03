import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { rootRoute } from "../root";

export const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/user",
  component: lazyRouteComponent(() => import("@/features/user/shell")),
});
