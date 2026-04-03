import { createRoute } from "@tanstack/react-router";
import Events from "@/features/admin/pages/events";
import { adminRoute } from "./route";

export const adminEventsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/events",
  component: Events,
});
