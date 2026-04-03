import { createFileRoute } from "@tanstack/react-router";
import { OddsControlSection } from "@/features/admin/admin-dashboard-sections";

export const Route = createFileRoute("/admin/odds")({
  component: OddsControlSection,
});
