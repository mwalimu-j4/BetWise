import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userFaqsRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/faqs",
  component: lazyRouteComponent(() => import("@/features/user/pages/faqs")),
});
