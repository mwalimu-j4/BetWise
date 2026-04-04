import { createRoute, redirect } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminIndexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
});


