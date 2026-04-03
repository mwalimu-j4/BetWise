import { createFileRoute } from "@tanstack/react-router";
import { ReportsSection } from "@/features/admin/admin-dashboard-sections";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsSection,
});
