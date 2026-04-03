import { createFileRoute } from "@tanstack/react-router";
import { SettingsSection } from "@/features/admin/admin-dashboard-sections";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsSection,
});
