import {
  Outlet,
  createRoute,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { userRoute } from "./route";

const userIndexLayoutRoute = createRoute({
  getParentRoute: () => userRoute,
  id: "user-index-layout",
  component: Outlet,
});

const userHomePageRoute = createRoute({
  getParentRoute: () => userIndexLayoutRoute,
  path: "/",
  component: lazyRouteComponent(() => import("@/features/user/home")),
});

const userBetsPageRoute = createRoute({
  getParentRoute: () => userIndexLayoutRoute,
  path: "/bets",
  validateSearch: (search: Record<string, unknown>): { 
    tab?: string; 
    filter?: string; 
    page?: string | number;
  } => {
    return {
      tab: (search.tab as string) || undefined,
      filter: (search.filter as string) || undefined,
      page: (search.page as string | number) || undefined,
    };
  },
  component: lazyRouteComponent(() => import("@/features/user/pages/my-bets")),
});

const userBetDetailPageRoute = createRoute({
  getParentRoute: () => userBetsPageRoute,
  path: "/$betId",
  component: lazyRouteComponent(
    () => import("@/features/user/pages/my-bet-detail"),
  ),
});

const userEventsPageRoute = createRoute({
  getParentRoute: () => userIndexLayoutRoute,
  path: "/events",
  component: lazyRouteComponent(() => import("@/features/user/pages/events")),
});

const userCustomEventsPageRoute = createRoute({
  getParentRoute: () => userIndexLayoutRoute,
  path: "/custom-events",
  component: lazyRouteComponent(
    () => import("@/features/user/pages/custom-events"),
  ),
});

const sportCategoryPageRoute = createRoute({
  getParentRoute: () => userIndexLayoutRoute,
  path: "/sport/$sportSlug",
  component: lazyRouteComponent(
    () => import("@/features/user/pages/sport-category"),
  ),
});

export const userIndexRoute = userIndexLayoutRoute.addChildren([
  userHomePageRoute,
  userBetsPageRoute.addChildren([userBetDetailPageRoute]),
  userEventsPageRoute,
  userCustomEventsPageRoute,
  sportCategoryPageRoute,
]);


