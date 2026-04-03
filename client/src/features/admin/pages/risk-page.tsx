import type { CSSProperties } from "react";
import { AlertTriangle, Edit } from "lucide-react";
import {
  exposureLimits,
  riskAlerts,
  riskControls,
} from "../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
  StatusBadge,
} from "../components/ui";

export default function RiskPage() {
  return (
    <div className="admin-panel">
      <AdminSectionHeader
        title="Risk Management"
        subtitle="Fraud detection, AML, and exposure monitoring"
      />

      <div className="admin-grid admin-grid--double">
        <AdminCard>
          <AdminCardHeader
            title="Active Alerts"
            subtitle={`${riskAlerts.length} alerts requiring attention`}
          />
          <div className="admin-alert-list">
            {riskAlerts.map((alert) => {
              const tone =
                alert.type === "high"
                  ? "red"
                  : alert.type === "medium"
                    ? "gold"
                    : "blue";

              return (
                <div className="admin-alert" data-tone={tone} key={alert.id}>
                  <AlertTriangle className="admin-alert__icon" size={14} />
                  <div className="admin-alert__body">
                    <p className="admin-alert__message">{alert.message}</p>
                    <div className="admin-inline-group admin-inline-group--tight">
                      <span className="admin-text-muted admin-text-xs">
                        {alert.user}
                      </span>
                      <span className="admin-text-muted admin-text-xs">-</span>
                      <span className="admin-text-muted admin-text-xs">
                        {alert.time}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={alert.type} />
                </div>
              );
            })}
          </div>
        </AdminCard>

        <div className="admin-stack">
          <AdminCard>
            <AdminCardHeader title="Event Exposure Limits" />
            <div className="admin-stack">
              {exposureLimits.map((limit) => (
                <div className="admin-progress" key={limit.event}>
                  <div className="admin-progress__header">
                    <span className="admin-text-secondary">{limit.event}</span>
                    <span className="admin-text-strong" data-tone={limit.tone}>
                      ${limit.used}k / ${limit.limit}k
                    </span>
                  </div>
                  <div className="admin-progress__track">
                    <span
                      className="admin-progress__value"
                      data-tone={limit.tone}
                      style={
                        {
                          width: `${Math.min(
                            (limit.used / limit.limit) * 100,
                            100,
                          )}%`,
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
            <div className="admin-setting-list">
              {riskControls.map((control) => (
                <div className="admin-setting-row" key={control.label}>
                  <span className="admin-text-secondary">{control.label}</span>
                  <div className="admin-inline-group admin-inline-group--tight">
                    <span className="admin-text-primary admin-text-strong">
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
