import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userForgotPasswordRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/forgot-password",
  component: lazyRouteComponent(() => import("@/pages/ForgotPassword")),
});
