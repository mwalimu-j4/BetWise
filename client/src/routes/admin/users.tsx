import { createFileRoute } from "@tanstack/react-router";
import { UserManagementSection } from "@/features/admin/admin-dashboard-sections";

export const Route = createFileRoute("/admin/users")({
  component: UserManagementSection,
});
