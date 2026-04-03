import { createRoute } from "@tanstack/react-router";
import Odds from "@/features/admin/pages/odds";
import { adminRoute } from "./route";

export const adminOddsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/odds",
  component: Odds,
});
