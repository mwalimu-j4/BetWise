import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userLoginRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/login",
  component: lazyRouteComponent(() => import("@/features/auth/pages/login")),
});


