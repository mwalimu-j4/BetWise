import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { userRoute } from "./route";

export const userLiveRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/live",
  validateSearch: (search: Record<string, unknown>) => {
    return {
      market: (search.market as string) || undefined,
      highlights: search.highlights === "1" || search.highlights === true || undefined,
      q: (search.q as string) || undefined,
      highlight: (search.highlight as string) || undefined,
    };
  },
  component: lazyRouteComponent(() => import("@/features/user/pages/live")),
});
