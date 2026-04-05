import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

function parsePage(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1;
}

export const adminOddsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/odds",
  validateSearch: (search: Record<string, unknown>) => ({
    filter:
      search.filter === "configured-with-odds" ||
      search.filter === "all-with-odds" ||
      search.filter === "configured"
        ? search.filter
        : "configured",
    page: parsePage(search.page),
    search: typeof search.search === "string" ? search.search : "",
    eventId: typeof search.eventId === "string" ? search.eventId : "",
  }),
  component: lazyRouteComponent(() => import("@/features/admin/modules/odds")),
});


