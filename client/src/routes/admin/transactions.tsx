import { createRoute } from "@tanstack/react-router";
import Transactions from "@/features/admin/modules/transactions";
import { adminRoute } from "./route";

export const adminTransactionsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/transactions",
  component: Transactions,
});
