import { Building2, MapPin } from "lucide-react";
import {
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
  MetricCard,
} from "../../components/ui";
import {
  branchAnalytics,
  financialKPIs,
  localLocationAnalytics,
} from "../../data/mock-data";

export default function Analytics() {
  const timeRanges = ["24h", "7d", "30d", "90d"] as const;

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Geo & Device Analytics"
        subtitle="Simple Kenya-first view of revenue, audience, and branch activity"
      />

      <AdminCard>
        <AdminCardHeader
          title="Revenue & Financial KPIs"
          subtitle="Real-time snapshot"
          actions={
            <div className="flex flex-wrap gap-2">
              {timeRanges.map((range) => (
                <span
                  key={range}
                  className={
                    range === "7d"
                      ? "rounded-full bg-admin-accent px-3 py-1 text-xs font-semibold text-black"
                      : "rounded-full bg-admin-surface px-3 py-1 text-xs font-semibold text-admin-text-secondary"
                  }
                >
                  {range}
                </span>
              ))}
            </div>
          }
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {financialKPIs.map((kpi) => (
            <MetricCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Users by Location"
          subtitle="Kenyan local locations only"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {localLocationAnalytics.map((location) => (
            <div
              key={location.location}
              className="rounded-2xl border border-admin-border bg-admin-surface/40 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-admin-text-primary">
                    {location.location}
                  </p>
                  <p className="text-xs text-admin-text-muted">{location.area}</p>
                </div>
                <p className="text-sm font-semibold text-admin-text-primary">
                  {location.share.toFixed(1)}%
                </p>
              </div>
              <p className="mt-2 text-xs text-admin-text-secondary">
                <MapPin size={12} className="inline-block -translate-y-px" />{" "}
                {location.users.toLocaleString()} users · {location.bets.toLocaleString()} bets
              </p>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Branches"
          subtitle="Primary local outlets and status"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {branchAnalytics.map((branch) => (
            <div
              key={branch.branch}
              className="rounded-2xl border border-admin-border bg-admin-surface/40 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 font-semibold text-admin-text-primary">
                  <Building2 size={13} />
                  {branch.branch}
                </p>
                <span
                  className={
                    branch.status === "active"
                      ? "rounded-full bg-admin-accent-dim px-2 py-1 text-[11px] font-semibold text-admin-accent"
                      : "rounded-full bg-admin-gold-dim px-2 py-1 text-[11px] font-semibold text-admin-gold"
                  }
                >
                  {branch.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-admin-text-muted">{branch.area}</p>
              <p className="mt-2 text-xs text-admin-text-secondary">
                {branch.users.toLocaleString()} users · {branch.bets.toLocaleString()} bets · {branch.deposits} deposits
              </p>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
