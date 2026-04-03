import { createRoute } from "@tanstack/react-router";
import Settings from "@/features/admin/pages/settings";
import { adminRoute } from "./route";

export const adminSettingsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/settings",
  component: Settings,
});
