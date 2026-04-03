import { createRoute } from "@tanstack/react-router";
import Odds from "@/features/admin/modules/odds";
import { adminRoute } from "./route";

export const adminOddsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/odds",
  component: Odds,
});
