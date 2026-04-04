import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userComingSoonRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/coming-soon",
  validateSearch: (search: Record<string, unknown>) => ({
    feature: typeof search.feature === "string" ? search.feature : undefined,
  }),
  component: lazyRouteComponent(() => import("@/features/user/pages/not-found")),
});
