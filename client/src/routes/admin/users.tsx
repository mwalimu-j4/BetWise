import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminUsersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/users",
  validateSearch: (search: Record<string, unknown>): { filter?: string } => {
    return {
      filter: (search.filter as string) || undefined,
    };
  },
  component: lazyRouteComponent(() => import("@/features/admin/modules/users")),
});


