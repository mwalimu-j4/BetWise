import {
  AdminCard,
  AdminSectionHeader,
} from "../../components/ui";

export default function Risk() {
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Risk Management"
        subtitle="Fraud detection, AML, and exposure monitoring"
      />

      <AdminCard className="flex items-center justify-center rounded-2xl border-2 border-dashed border-admin-border/50 bg-gradient-to-br from-admin-surface/40 to-admin-surface/20 px-6 py-20 text-center">
        <div className="space-y-4">
          <p className="text-4xl font-bold text-admin-accent">Coming Soon!!!</p>
          <p className="text-admin-text-muted">
            Risk management and fraud detection features are being developed for enhanced security monitoring.
          </p>
        </div>
      </AdminCard>
    </div>
  );
}
