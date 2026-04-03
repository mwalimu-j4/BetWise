import { createRoute } from "@tanstack/react-router";
import AdminShell from "@/features/admin/components/shell";
import { rootRoute } from "../root";

export const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminShell,
});
