import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminQuickSettingsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/quick-settings",
  component: lazyRouteComponent(
    () => import("@/features/admin/modules/quick-settings"),
  ),
});
