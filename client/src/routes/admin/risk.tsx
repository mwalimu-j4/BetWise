import { createFileRoute } from "@tanstack/react-router";
import { RiskManagementSection } from "@/features/admin/admin-dashboard-sections";

export const Route = createFileRoute("/admin/risk")({
  component: RiskManagementSection,
});
