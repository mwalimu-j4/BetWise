import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userTermsRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/terms",
  component: lazyRouteComponent(() => import("@/features/user/pages/terms")),
});
