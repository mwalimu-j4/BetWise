import { createRoute } from "@tanstack/react-router";
import Risk from "@/features/admin/modules/risk";
import { adminRoute } from "./route";

export const adminRiskRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/risk",
  component: Risk,
});
