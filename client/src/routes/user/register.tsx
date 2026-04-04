import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userRegisterRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/register",
  component: lazyRouteComponent(() => import("@/features/auth/pages/register")),
});


