import {
  AdminCard,
  AdminSectionHeader,
} from "../../components/ui";

export default function Odds() {
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Odds Control"
        subtitle="Manage markets, odds, and margins"
      />

      <AdminCard className="flex items-center justify-center rounded-2xl border-2 border-dashed border-admin-border/50 bg-gradient-to-br from-admin-surface/40 to-admin-surface/20 px-6 py-20 text-center">
        <div className="space-y-4">
          <p className="text-4xl font-bold text-admin-accent">Coming Soon!!!</p>
          <p className="text-admin-text-muted">
            Odds management features are being developed to help you control markets and pricing.
          </p>
        </div>
      </AdminCard>
    </div>
  );
}
