import { createRoute } from "@tanstack/react-router";
import Bets from "@/features/admin/pages/bets";
import { adminRoute } from "./route";

export const adminBetsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/bets",
  component: Bets,
});
