import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { adminRoute } from "./route";

export const adminWithdrawalsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/withdrawals",
  validateSearch: (
    search: Record<string, unknown>,
  ): { transactionId?: string; status?: string } => {
    return {
      transactionId: (search.transactionId as string) || undefined,
      status: (search.status as string) || undefined,
    };
  },
  component: lazyRouteComponent(
    () => import("@/features/admin/modules/withdrawals"),
  ),
});
