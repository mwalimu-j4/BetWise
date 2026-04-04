import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userResetPasswordRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/reset-password",
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: lazyRouteComponent(() => import("@/pages/ResetPassword")),
});
