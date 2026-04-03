import type { CSSProperties } from "react";
import { AlertTriangle, Edit } from "lucide-react";
import {
  exposureLimits,
  riskAlerts,
  riskControls,
} from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
  StatusBadge,
  adminToneTextClass,
} from "../../components/ui";

export default function Risk() {
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Risk Management"
        subtitle="Fraud detection, AML, and exposure monitoring"
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <AdminCardHeader
            title="Active Alerts"
            subtitle={`${riskAlerts.length} alerts requiring attention`}
          />
          <div className="mt-4 space-y-3">
            {riskAlerts.map((alert) => {
              const tone =
                alert.type === "high"
                  ? "red"
                  : alert.type === "medium"
                    ? "gold"
                    : "blue";

              return (
                <div
                  className="flex gap-3 rounded-xl border-l-[3px] bg-admin-surface p-3"
                  key={alert.id}
                  style={{ borderLeftColor: `var(--admin-${tone})` }}
                >
                  <AlertTriangle
                    className={`mt-0.5 shrink-0 ${adminToneTextClass(tone)}`}
                    size={14}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-admin-text-primary">
                      {alert.message}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-admin-text-muted">
                      <span>{alert.user}</span>
                      <span>-</span>
                      <span>{alert.time}</span>
                    </div>
                  </div>
                  <StatusBadge status={alert.type} />
                </div>
              );
            })}
          </div>
        </AdminCard>

        <div className="space-y-4">
          <AdminCard>
            <AdminCardHeader title="Event Exposure Limits" />
            <div className="mt-4 space-y-3">
              {exposureLimits.map((limit) => (
                <div className="space-y-1.5" key={limit.event}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-admin-text-secondary">
                      {limit.event}
                    </span>
                    <span
                      className={`font-semibold ${adminToneTextClass(limit.tone)}`}
                    >
                      ${limit.used}k / ${limit.limit}k
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-admin-surface">
                    <span
                      className="block h-full rounded-full"
                      style={
                        {
                          width: `${Math.min(
                            (limit.used / limit.limit) * 100,
                            100,
                          )}%`,
                          backgroundColor: `var(--admin-${limit.tone})`,
                        } as CSSProperties
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard>
            <AdminCardHeader title="Risk Controls" />
            <div className="mt-4 space-y-3">
              {riskControls.map((control) => (
                <div
                  className="flex items-center justify-between gap-3 border-b border-admin-border py-2 last:border-b-0"
                  key={control.label}
                >
                  <span className="text-sm text-admin-text-secondary">
                    {control.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-admin-text-primary">
                      {control.value}
                    </span>
                    <AdminButton size="sm" variant="ghost">
                      <Edit size={10} />
                    </AdminButton>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
