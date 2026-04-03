import { createFileRoute } from "@tanstack/react-router";
import { DashboardSection } from "@/features/admin/admin-dashboard-sections";

export const Route = createFileRoute("/admin/dashboard")({
  component: DashboardSection,
});
