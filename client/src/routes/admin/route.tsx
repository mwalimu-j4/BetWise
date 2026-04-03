import { Outlet, createFileRoute } from "@tanstack/react-router";
import AdminDashboardLayout from "@/features/admin/admin-dashboard-page";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminDashboardLayout>
      <Outlet />
    </AdminDashboardLayout>
  );
}
