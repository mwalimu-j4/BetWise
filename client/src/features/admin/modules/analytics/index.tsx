import { Wifi } from "lucide-react";
import {
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
  MetricCard,
  adminTableClassName,
  adminTableHeadCellClassName,
  adminTableCellClassName,
  TableShell,
} from "../../components/ui";
import {
  financialKPIs,
  geoAnalytics,
  deviceAnalytics,
  carrierAnalytics,
} from "../../data/mock-data";

export default function Analytics() {
  const totalUsers = geoAnalytics.reduce((sum, item) => sum + item.users, 0);
  const mobileUsers = deviceAnalytics
    .filter((item) => item.device.toLowerCase().includes("mobile"))
    .reduce((sum, item) => sum + item.users, 0);
  const desktopUsers =
    deviceAnalytics.find((item) => item.device === "Desktop")?.users ?? 0;
  const timeRanges = ["24h", "7d", "30d", "90d"] as const;

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Geo & Device Analytics"
        subtitle="Kenya-first view of revenue, audience mix, and carrier behavior"
      />

      <AdminCard>
        <AdminCardHeader
          title="Revenue & Financial KPIs"
          subtitle="Real-time snapshot"
          actions={
            <div className="flex flex-wrap gap-2">
              {timeRanges.map((range) => (
                <span
                  className={
                    range === "7d"
                      ? "rounded-full bg-admin-accent px-3 py-1 text-xs font-semibold text-black"
                      : "rounded-full bg-admin-surface px-3 py-1 text-xs font-semibold text-admin-text-secondary"
                  }
                  key={range}
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

      <div className="grid gap-4 xl:grid-cols-3">
        <AdminCard className="xl:col-span-1">
          <AdminCardHeader
            title="Users by Location"
            subtitle="Top Kenyan and regional markets"
          />
          <TableShell>
            <table className={adminTableClassName}>
              <thead>
                <tr>
                  {["Market", "Users", "Share"].map((heading) => (
                    <th className={adminTableHeadCellClassName} key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {geoAnalytics.map((location) => (
                  <tr key={`${location.country}-${location.region}`}>
                    <td className={adminTableCellClassName}>
                      <span className="font-semibold text-admin-text-primary">
                        {location.country}
                      </span>
                      <div className="text-xs text-admin-text-muted">
                        {location.region}
                      </div>
                    </td>
                    <td className={adminTableCellClassName}>
                      {location.users.toLocaleString()}
                    </td>
                    <td className={adminTableCellClassName}>
                      {location.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </AdminCard>

        <AdminCard className="xl:col-span-1">
          <AdminCardHeader
            title="Device Split"
            subtitle="Mobile dominates, desktop is secondary"
          />
          <TableShell>
            <table className={adminTableClassName}>
              <thead>
                <tr>
                  {["Device", "Users", "Share", "Avg Session"].map(
                    (heading) => (
                      <th className={adminTableHeadCellClassName} key={heading}>
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {deviceAnalytics.map((device) => (
                  <tr key={device.device}>
                    <td className={adminTableCellClassName}>{device.device}</td>
                    <td className={adminTableCellClassName}>
                      {device.users.toLocaleString()}
                    </td>
                    <td className={adminTableCellClassName}>
                      {device.percentage.toFixed(1)}%
                    </td>
                    <td className={adminTableCellClassName}>
                      {device.avgSessionDuration}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </AdminCard>

        <AdminCard className="xl:col-span-1">
          <AdminCardHeader
            title="Carrier Insights"
            subtitle="M-Pesa region targeting"
          />
          <TableShell>
            <table className={adminTableClassName}>
              <thead>
                <tr>
                  {["Carrier", "Users", "Avg Bet", "Avg Payout"].map(
                    (heading) => (
                      <th className={adminTableHeadCellClassName} key={heading}>
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {carrierAnalytics.map((carrier) => (
                  <tr key={carrier.carrier}>
                    <td className={adminTableCellClassName}>
                      <span className="inline-flex items-center gap-2 font-semibold text-admin-text-primary">
                        <Wifi size={13} />
                        {carrier.carrier}
                      </span>
                    </td>
                    <td className={adminTableCellClassName}>
                      {carrier.users.toLocaleString()}
                    </td>
                    <td className={adminTableCellClassName}>
                      {carrier.avgBetSize}
                    </td>
                    <td className={adminTableCellClassName}>
                      {carrier.avgPayout}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader
          title="Local Focus"
          subtitle="Mobile-first, region-aware, and payment-led"
        />
        <p className="text-sm text-admin-text-secondary">
          Keep campaigns centered on Kenya, prioritize mobile money rails, and
          treat desktop as a secondary channel.
        </p>
      </AdminCard>
    </div>
  );
}
