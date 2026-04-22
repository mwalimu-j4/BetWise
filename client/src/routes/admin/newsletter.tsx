import { createRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { adminRoute } from "./route";

const Newsletter = lazy(() => import("@/features/admin/modules/newsletter"));

export const adminNewsletterRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/newsletter",
  component: Newsletter,
});
