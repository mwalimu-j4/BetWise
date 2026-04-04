import {
  AdminCard,
  AdminSectionHeader,
} from "../../components/ui";

export default function Reports() {
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Reports & Analytics"
        subtitle="Financial, operational, and compliance reports"
      />

      <AdminCard className="flex items-center justify-center rounded-2xl border-2 border-dashed border-admin-border/50 bg-gradient-to-br from-admin-surface/40 to-admin-surface/20 px-6 py-20 text-center">
        <div className="space-y-4">
          <p className="text-4xl font-bold text-admin-accent">Coming Soon!!!</p>
          <p className="text-admin-text-muted">
            Advanced reporting and analytics features are being developed for comprehensive insights.
          </p>
        </div>
      </AdminCard>
    </div>
  );
}
