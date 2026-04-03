import { createRoute } from "@tanstack/react-router";
import Reports from "@/features/admin/pages/reports";
import { adminRoute } from "./route";

export const adminReportsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/reports",
  component: Reports,
});
