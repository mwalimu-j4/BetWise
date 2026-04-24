import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userPrivacyRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/privacy",
  component: lazyRouteComponent(() => import("@/features/user/pages/privacy")),
});
