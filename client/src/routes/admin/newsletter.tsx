import { createRoute } from "@tanstack/react-router";
import Newsletter from "@/features/admin/modules/newsletter";
import { adminRoute } from "./route";

export const adminNewsletterRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/newsletter",
  component: Newsletter,
});
