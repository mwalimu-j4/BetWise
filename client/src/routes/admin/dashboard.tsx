import { createRoute } from "@tanstack/react-router";
import Dashboard from "@/features/admin/modules/dashboard";
import { adminRoute } from "./route";

export const adminDashboardRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/dashboard",
  component: Dashboard,
});
