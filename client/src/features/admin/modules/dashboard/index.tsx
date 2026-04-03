import { Download, Eye, Filter, Flag } from "lucide-react";
import { dashboardMetrics, recentBets } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
  DonutChart,
  MetricCard,
  MiniChart,
  StatusBadge,
  TableShell,
  adminCompactActionsClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Overview"
        subtitle="Friday, April 3, 2026 - Live Platform Snapshot"
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminCard>
          <AdminCardHeader
            title="Revenue & Bet Volume"
            subtitle="Last 7 days"
            actions={
              <div className="flex flex-wrap gap-3 text-xs text-admin-text-secondary">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-[2px] bg-admin-accent" />
                  Revenue
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-[2px] bg-admin-accent-dim" />
                  Volume
                </span>
              </div>
            }
          />
          <MiniChart />
        </AdminCard>

        <AdminCard>
          <AdminCardHeader
            title="Sport Distribution"
            subtitle="By bet count"
          />
          <DonutChart />
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader
          title="Recent Bets"
          subtitle="Live feed - auto-updating"
          actions={
            <>
              <AdminButton variant="ghost">
                <Filter size={13} />
                Filter
              </AdminButton>
              <AdminButton variant="ghost">
                <Download size={13} />
                Export
              </AdminButton>
            </>
          }
        />

        <TableShell>
          <table className={adminTableClassName}>
            <thead>
              <tr>
                {[
                  "Bet ID",
                  "User",
                  "Sport",
                  "Event",
                  "Market",
                  "Odds",
                  "Stake",
                  "Status",
                  "Time",
                  "Action",
                ].map((heading) => (
                  <th className={adminTableHeadCellClassName} key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBets.map((bet) => (
                <tr
                  className="even:bg-[rgba(22,29,53,0.5)]"
                  key={bet.id}
                >
                  <td
                    className={`${adminTableCellClassName} text-xs font-semibold text-admin-blue`}
                  >
                    {bet.id}
                  </td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                  >
                    {bet.user}
                  </td>
                  <td className={adminTableCellClassName}>{bet.sport}</td>
                  <td
                    className={`${adminTableCellClassName} max-w-[160px] truncate`}
                  >
                    {bet.event}
                  </td>
                  <td className={adminTableCellClassName}>{bet.market}</td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-gold`}
                  >
                    {bet.odds}
                  </td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                  >
                    {bet.stake}
                  </td>
                  <td className={adminTableCellClassName}>
                    <StatusBadge status={bet.status} />
                  </td>
                  <td
                    className={`${adminTableCellClassName} text-xs text-admin-text-muted`}
                  >
                    {bet.time}
                  </td>
                  <td className={adminTableCellClassName}>
                    <div className={adminCompactActionsClassName}>
                      <AdminButton size="sm" variant="ghost">
                        <Eye size={11} />
                      </AdminButton>
                      <AdminButton size="sm" variant="ghost">
                        <Flag size={11} />
                      </AdminButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </AdminCard>
    </div>
  );
}
