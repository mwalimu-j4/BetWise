import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminWithdrawalsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/withdrawals",
  component: lazyRouteComponent(
    () => import("@/features/admin/modules/withdrawals"),
  ),
});
