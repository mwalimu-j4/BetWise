import { createFileRoute } from "@tanstack/react-router";
import { BetManagementSection } from "@/features/admin/admin-dashboard-sections";

export const Route = createFileRoute("/admin/bets")({
  component: BetManagementSection,
});
