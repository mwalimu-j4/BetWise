import { Download, Eye, Filter, Flag } from "lucide-react";
import {
  dashboardMetrics,
  recentBets,
} from "../../data/mock-data";
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
} from "../../components/ui";

export default function Dashboard() {
  return (
    <div className="admin-panel">
      <AdminSectionHeader
        title="Overview"
        subtitle="Friday, April 3, 2026 - Live Platform Snapshot"
      />

      <div className="admin-grid admin-grid--kpi">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="admin-grid admin-grid--dashboard-charts">
        <AdminCard>
          <AdminCardHeader
            title="Revenue & Bet Volume"
            subtitle="Last 7 days"
            actions={
              <div className="admin-legend">
                <span className="admin-legend__item">
                  <span className="admin-legend__swatch" data-tone="accent" />
                  Revenue
                </span>
                <span className="admin-legend__item">
                  <span
                    className="admin-legend__swatch admin-legend__swatch--dim"
                    data-tone="accent"
                  />
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
          <table className="admin-table">
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
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBets.map((bet) => (
                <tr key={bet.id}>
                  <td className="admin-text-blue admin-text-strong admin-text-xs">
                    {bet.id}
                  </td>
                  <td className="admin-text-primary admin-text-strong">
                    {bet.user}
                  </td>
                  <td>{bet.sport}</td>
                  <td className="admin-truncate-cell">{bet.event}</td>
                  <td>{bet.market}</td>
                  <td className="admin-text-gold admin-text-strong">
                    {bet.odds}
                  </td>
                  <td className="admin-text-primary admin-text-strong">
                    {bet.stake}
                  </td>
                  <td>
                    <StatusBadge status={bet.status} />
                  </td>
                  <td className="admin-text-muted admin-text-xs">
                    {bet.time}
                  </td>
                  <td>
                    <div className="admin-inline-group admin-inline-group--tight">
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
