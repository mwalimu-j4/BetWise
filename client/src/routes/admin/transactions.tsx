import { createFileRoute } from "@tanstack/react-router";
import { TransactionsSection } from "@/features/admin/admin-dashboard-sections";

export const Route = createFileRoute("/admin/transactions")({
  component: TransactionsSection,
});
