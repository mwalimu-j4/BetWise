import { useState } from "react";
import { Download, Eye, Filter, Flag } from "lucide-react";
import {
  dashboardMetrics,
  recentBets,
  financialKPIs,
  financialTrendData,
  depositWithdrawalTrend,
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
  FinancialTrendChart,
  DepositWithdrawalChart,
  adminCompactActionsClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";

type TimeRange = "24h" | "7d" | "30d" | "90d";

export default function Dashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("7d");

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

      {/* Revenue & Financial KPIs Section */}
      <AdminCard>
        <AdminCardHeader
          title="Revenue & Financial KPIs"
          subtitle="Real-time business health metrics"
          actions={
            <div className="flex flex-wrap gap-2">
              {(["24h", "7d", "30d", "90d"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedTimeRange(range)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    selectedTimeRange === range
                      ? "bg-admin-accent text-black"
                      : "bg-admin-surface text-admin-text-secondary hover:bg-admin-border"
                  }`}
                >
                  {range === "24h" && "24h"}
                  {range === "7d" && "7d"}
                  {range === "30d" && "30d"}
                  {range === "90d" && "90d"}
                </button>
              ))}
            </div>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {financialKPIs.map((kpi) => (
            <MetricCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </AdminCard>

      {/* Financial Trends Chart */}
      <AdminCard>
        <AdminCardHeader
          title="Financial Trends"
          subtitle={`Last 7 days - Stake, GGR, and NGR analysis`}
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
        <FinancialTrendChart data={financialTrendData} />
      </AdminCard>

      {/* Deposits vs Withdrawals */}
      <AdminCard>
        <AdminCardHeader
          title="Deposits vs Withdrawals"
          subtitle="Weekly comparison - Cash flow analysis"
          actions={
            <div className="flex flex-wrap gap-3 text-xs text-admin-text-secondary">
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-[2px]"
                  style={{ backgroundColor: "#00e5a0" }}
                />
                Deposits
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-[2px]"
                  style={{ backgroundColor: "#ff9800" }}
                />
                Withdrawals
              </span>
            </div>
          }
        />
        <DepositWithdrawalChart data={depositWithdrawalTrend} />
      </AdminCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminCard>
          <AdminCardHeader
            title="Profit & Loss"
            subtitle="Last 7 days"
            actions={
              <div className="flex flex-wrap gap-3 text-xs text-admin-text-secondary">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-[2px]"
                    style={{ backgroundColor: "#00e5a0" }}
                  />
                  Profit
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-[2px]"
                    style={{ backgroundColor: "#ff9800" }}
                  />
                  Loss
                </span>
              </div>
            }
          />
          <MiniChart />
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Sport Distribution" subtitle="By bet count" />
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
                <tr className="even:bg-admin-surface/45" key={bet.id}>
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
                    className={adminTableCellClassName}
                    style={{ maxWidth: 160 }}
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
