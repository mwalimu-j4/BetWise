import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userHowItWorksRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/how-it-works",
  component: lazyRouteComponent(() =>
    import("@/features/user/pages/how-it-works")
  ),
});
