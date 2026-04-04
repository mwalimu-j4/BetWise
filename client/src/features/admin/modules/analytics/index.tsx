import {
  BarChart3,
  Globe,
  Smartphone,
  Wifi,
  MapPin,
  Users,
  Signal,
} from "lucide-react";
import {
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
  MetricCard,
  SummaryCard,
  adminFilterRowClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
  adminTableCellClassName,
  TableShell,
  GeoLocationCard,
  DeviceCard,
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

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Geo & Device Analytics"
        subtitle="Users by location, device mix, and carrier intelligence for market targeting"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tracked Locations"
          value={`${geoAnalytics.length}`}
          change="+2 new regions"
          up={true}
          icon={Globe}
          tone="blue"
        />
        <MetricCard
          label="Mobile Share"
          value={`${((mobileUsers / totalUsers) * 100).toFixed(1)}%`}
          change="+4.6%"
          up={true}
          icon={Smartphone}
          tone="accent"
        />
        <MetricCard
          label="Desktop Share"
          value={`${((desktopUsers / totalUsers) * 100).toFixed(1)}%`}
          change="-1.2%"
          up={false}
          icon={BarChart3}
          tone="gold"
        />
        <MetricCard
          label="Carrier Coverage"
          value={`${carrierAnalytics.length}`}
          change="+1 operator"
          up={true}
          icon={Signal}
          tone="purple"
        />
      </div>

      <AdminCard>
        <AdminCardHeader
          title="Revenue & Financial KPIs"
          subtitle="Immediate business health snapshot"
          actions={
            <div className={adminFilterRowClassName}>
              {financialKPIs.slice(0, 3).map((kpi) => (
                <SummaryCard
                  key={kpi.label}
                  label={kpi.label}
                  value={kpi.value}
                  tone={kpi.tone}
                />
              ))}
            </div>
          }
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {financialKPIs.slice(3).map((kpi) => (
            <MetricCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </AdminCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <AdminCardHeader
            title="Users by Location"
            subtitle="Primary regions and market concentration"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {geoAnalytics.map((location) => (
              <GeoLocationCard
                key={`${location.country}-${location.region}`}
                {...location}
              />
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader
            title="Device Split"
            subtitle="Mobile vs desktop engagement profile"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {deviceAnalytics.map((device) => (
              <DeviceCard key={device.device} {...device} />
            ))}
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader
          title="Network / Carrier Insights"
          subtitle="Important for M-Pesa regions and payment optimization"
          actions={
            <div className="flex items-center gap-2 text-xs text-admin-text-muted">
              <Wifi size={13} />
              Mobile-money ready networks
            </div>
          }
        />
        <TableShell>
          <table className={adminTableClassName}>
            <thead>
              <tr>
                {[
                  "Carrier",
                  "Users",
                  "Share",
                  "Avg Bet Size",
                  "Avg Payout",
                  "Focus",
                ].map((heading) => (
                  <th className={adminTableHeadCellClassName} key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carrierAnalytics.map((carrier) => (
                <tr key={carrier.carrier}>
                  <td className={adminTableCellClassName}>
                    <span className="inline-flex items-center gap-2 font-semibold text-admin-text-primary">
                      <MapPin size={13} />
                      {carrier.carrier}
                    </span>
                  </td>
                  <td className={adminTableCellClassName}>
                    {carrier.users.toLocaleString()}
                  </td>
                  <td className={adminTableCellClassName}>
                    {carrier.percentage.toFixed(1)}%
                  </td>
                  <td className={adminTableCellClassName}>
                    {carrier.avgBetSize}
                  </td>
                  <td className={adminTableCellClassName}>
                    {carrier.avgPayout}
                  </td>
                  <td className={adminTableCellClassName}>
                    <span className="inline-flex items-center gap-2 rounded-lg bg-admin-surface px-2 py-1 text-xs font-medium text-admin-text-secondary">
                      <Users size={12} />
                      Conversion hot spot
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Optimization Notes"
          subtitle="Targeting cues for campaigns and product tuning"
        />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SummaryCard label="Best Mobile Region" value="Kenya" tone="accent" />
          <SummaryCard
            label="Highest Carrier Value"
            value="Safaricom"
            tone="blue"
          />
          <SummaryCard
            label="Desktop Upsell"
            value="Premium markets"
            tone="gold"
          />
        </div>
      </AdminCard>
    </div>
  );
}
