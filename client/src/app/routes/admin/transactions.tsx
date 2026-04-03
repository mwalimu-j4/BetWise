import { createRoute } from "@tanstack/react-router";
import Transactions from "@/features/admin/pages/transactions";
import { adminRoute } from "./route";

export const adminTransactionsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/transactions",
  component: Transactions,
});
