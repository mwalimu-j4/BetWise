import { useState, useMemo } from "react";
import {
  useAdminFinancialReport,
  useAdminBettingReport,
  useAdminUsersReport,
  useAdminRiskReport,
  type ReportPeriod,
} from "../../hooks/useAdminReports";
import {
  AdminCard,
  AdminSectionHeader,
  SummaryCard,
  TableShell,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
  truncateEmailForTable,
} from "../../components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader, AlertCircle } from "lucide-react";

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "14d", label: "Last 14 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "6m", label: "Last 6 Months" },
  { value: "1y", label: "Last Year" },
  { value: "all", label: "All Time" },
];

function FinancialReportsTab({ period }: { period: ReportPeriod }) {
  const { data, isLoading, isError, error } = useAdminFinancialReport(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-admin-accent" />
      </div>
    );
  }

  if (isError) {
    return (
      <AdminCard className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-admin-red" />
        <p className="text-sm text-admin-red">
          {(error as Error)?.message ?? "Failed to load financial report"}
        </p>
      </AdminCard>
    );
  }

  if (!data)
    return <div className="text-admin-text-muted">No data available</div>;

  const stats = [
    {
      label: "Total Revenue",
      value: `KES ${(data.totalRevenue / 1000).toFixed(1)}K`,
      tone: "blue" as const,
    },
    {
      label: "Deposits",
      value: `${data.deposits.count}`,
      subtitle: `KES ${(data.deposits.totalAmount / 1000).toFixed(1)}K`,
      tone: "accent" as const,
    },
    {
      label: "Withdrawals",
      value: `${data.withdrawals.count}`,
      subtitle: `KES ${(data.withdrawals.totalAmount / 1000).toFixed(1)}K`,
      tone: "red" as const,
    },
    {
      label: "Bets Placed",
      value: `${data.bets.count}`,
      subtitle: `KES ${(data.bets.totalStaked / 1000).toFixed(1)}K staked`,
      tone: "purple" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tone={stat.tone}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard className="space-y-4">
          <h3 className="font-semibold text-admin-text-primary">
            Deposit Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between rounded-lg bg-admin-surface/50 p-3">
              <span className="text-sm text-admin-text-muted">
                Total Deposits
              </span>
              <span className="font-semibold text-admin-accent">
                KES {(data.deposits.totalAmount / 1000).toFixed(1)}K
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-admin-surface/50 p-3">
              <span className="text-sm text-admin-text-muted">
                Transaction Count
              </span>
              <span className="font-semibold text-admin-text-primary">
                {data.deposits.count}
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-admin-surface/50 p-3">
              <span className="text-sm text-admin-text-muted">
                Average Deposit
              </span>
              <span className="font-semibold text-admin-text-primary">
                KES {Math.round(data.deposits.averageAmount).toLocaleString()}
              </span>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="space-y-4">
          <h3 className="font-semibold text-admin-text-primary">
            Withdrawal Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between rounded-lg bg-admin-surface/50 p-3">
              <span className="text-sm text-admin-text-muted">
                Total Withdrawals
              </span>
              <span className="font-semibold text-admin-red">
                KES {(data.withdrawals.totalAmount / 1000).toFixed(1)}K
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-admin-surface/50 p-3">
              <span className="text-sm text-admin-text-muted">
                Transaction Count
              </span>
              <span className="font-semibold text-admin-text-primary">
                {data.withdrawals.count}
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-admin-surface/50 p-3">
              <span className="text-sm text-admin-text-muted">
                Average Withdrawal
              </span>
              <span className="font-semibold text-admin-text-primary">
                KES{" "}
                {Math.round(data.withdrawals.averageAmount).toLocaleString()}
              </span>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

function BettingReportsTab({ period }: { period: ReportPeriod }) {
  const { data, isLoading, isError, error } = useAdminBettingReport(period);

  const topMarketsData = useMemo(
    () => data?.topMarkets.slice(0, 5) ?? [],
    [data?.topMarkets],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-admin-accent" />
      </div>
    );
  }

  if (isError) {
    return (
      <AdminCard className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-admin-red" />
        <p className="text-sm text-admin-red">
          {(error as Error)?.message ?? "Failed to load betting report"}
        </p>
      </AdminCard>
    );
  }

  if (!data)
    return <div className="text-admin-text-muted">No data available</div>;

  const stats = [
    {
      label: "Total Bets",
      value: `${data.totalBets.toLocaleString()}`,
      tone: "blue" as const,
    },
    {
      label: "Total Staked",
      value: `KES ${(data.totalStaked / 1000).toFixed(1)}K`,
      tone: "accent" as const,
    },
    {
      label: "Win Rate",
      value: `${data.winLossStats.winRate}%`,
      tone: "purple" as const,
    },
    {
      label: "Avg Stake",
      value: `KES ${data.averageStake.toLocaleString()}`,
      tone: "gold" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tone={stat.tone}
          />
        ))}
      </div>

      <AdminCard className="space-y-4">
        <h3 className="font-semibold text-admin-text-primary">Top Markets</h3>
        <div className="space-y-2">
          {topMarketsData.map((market) => (
            <div
              key={market.marketType}
              className="flex items-center justify-between rounded-lg bg-admin-surface/50 p-3 hover:bg-admin-surface/70 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-admin-text-primary truncate">
                  {market.marketType}
                </p>
                <p className="text-xs text-admin-text-muted">
                  {market.count} bets
                </p>
              </div>
              <div className="ml-2 text-right flex-shrink-0">
                <p className="font-semibold text-admin-accent">
                  KES {(market.totalStaked / 1000).toFixed(1)}K
                </p>
              </div>
            </div>
          ))}
          {topMarketsData.length === 0 && (
            <p className="text-sm text-admin-text-muted text-center py-6">
              No market data
            </p>
          )}
        </div>
      </AdminCard>

      <AdminCard className="space-y-4">
        <h3 className="font-semibold text-admin-text-primary">
          Bet Status Breakdown
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-admin-surface/50 p-3">
            <p className="text-xs text-admin-text-muted">Won</p>
            <p className="mt-2 text-lg font-bold text-green-400">
              {data.winLossStats.won.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-admin-surface/50 p-3">
            <p className="text-xs text-admin-text-muted">Lost</p>
            <p className="mt-2 text-lg font-bold text-red-400">
              {data.winLossStats.lost.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-admin-surface/50 p-3">
            <p className="text-xs text-admin-text-muted">Pending</p>
            <p className="mt-2 text-lg font-bold text-amber-400">
              {data.winLossStats.pending.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-admin-surface/50 p-3">
            <p className="text-xs text-admin-text-muted">Void</p>
            <p className="mt-2 text-lg font-bold text-gray-400">
              {data.winLossStats.void.toLocaleString()}
            </p>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}

function UsersReportsTab({ period }: { period: ReportPeriod }) {
  const { data, isLoading, isError, error } = useAdminUsersReport(period);

  const topBettors = useMemo(() => data?.topBettors ?? [], [data?.topBettors]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-admin-accent" />
      </div>
    );
  }

  if (isError) {
    return (
      <AdminCard className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-admin-red" />
        <p className="text-sm text-admin-red">
          {(error as Error)?.message ?? "Failed to load users report"}
        </p>
      </AdminCard>
    );
  }

  if (!data)
    return <div className="text-admin-text-muted">No data available</div>;

  const stats = [
    {
      label: "Total Users",
      value: `${data.totalUsers.toLocaleString()}`,
      tone: "blue" as const,
    },
    {
      label: "New Users",
      value: `${data.newUsers}`,
      tone: "accent" as const,
    },
    {
      label: "Active Users",
      value: `${data.activeUsers}`,
      tone: "purple" as const,
    },
    {
      label: "Avg Bets/User",
      value: `${parseFloat(data.averageBetsPerActiveUser.toString()).toFixed(1)}`,
      tone: "gold" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tone={stat.tone}
          />
        ))}
      </div>

      <AdminCard className="space-y-4">
        <h3 className="font-semibold text-admin-text-primary">Top Bettors</h3>
        {topBettors.length > 0 ? (
          <div className="overflow-x-auto">
            <TableShell>
              <table className={adminTableClassName}>
                <thead>
                  <tr className="border-b border-admin-border">
                    <th className={adminTableHeadCellClassName}>Email</th>
                    <th className={adminTableHeadCellClassName}>Name</th>
                    <th className={`${adminTableHeadCellClassName} text-right`}>
                      Bets Placed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topBettors.map((bettor, idx) => (
                    <tr
                      key={bettor.id}
                      className={
                        idx % 2 === 0
                          ? "border-b border-admin-border/50 even:bg-admin-surface/50"
                          : "border-b border-admin-border/50 hover:bg-admin-surface/50"
                      }
                    >
                      <td
                        className={adminTableCellClassName}
                        title={bettor.email}
                      >
                        {truncateEmailForTable(bettor.email)}
                      </td>
                      <td className={adminTableCellClassName}>
                        {bettor.name || "—"}
                      </td>
                      <td
                        className={`${adminTableCellClassName} text-right font-semibold text-admin-accent`}
                      >
                        {bettor.betCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-admin-text-muted">
            No bettors found
          </p>
        )}
      </AdminCard>
    </div>
  );
}

function RiskReportsTab({ period }: { period: ReportPeriod }) {
  const { data, isLoading, isError, error } = useAdminRiskReport(period);

  const topAlertTypes = useMemo(
    () => data?.alertsByType.slice(0, 5) ?? [],
    [data?.alertsByType],
  );

  const recentAlerts = useMemo(
    () => data?.recentHighRiskAlerts ?? [],
    [data?.recentHighRiskAlerts],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-admin-accent" />
      </div>
    );
  }

  if (isError) {
    return (
      <AdminCard className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-admin-red" />
        <p className="text-sm text-admin-red">
          {(error as Error)?.message ?? "Failed to load risk report"}
        </p>
      </AdminCard>
    );
  }

  if (!data)
    return <div className="text-admin-text-muted">No data available</div>;

  const stats = [
    {
      label: "Total Alerts",
      value: `${data.totalAlerts}`,
      tone: "blue" as const,
    },
    {
      label: "High Risk",
      value: `${data.alertsBySeverity.find((a) => a.severity === "HIGH")?._count || 0}`,
      tone: "red" as const,
    },
    {
      label: "Critical",
      value: `${data.alertsBySeverity.find((a) => a.severity === "CRITICAL")?._count || 0}`,
      tone: "red" as const,
    },
    {
      label: "Resolution Rate",
      value: `${(data.resolutionRate * 100).toFixed(1)}%`,
      tone: "accent" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tone={stat.tone}
          />
        ))}
      </div>

      <AdminCard className="space-y-4">
        <h3 className="font-semibold text-admin-text-primary">
          Top Alert Types
        </h3>
        {topAlertTypes.length > 0 ? (
          <div className="space-y-2">
            {topAlertTypes.map((alert) => (
              <div
                key={alert.alertType}
                className="flex items-center justify-between rounded-lg bg-admin-surface/50 p-3 hover:bg-admin-surface/70 transition-colors"
              >
                <p className="text-sm font-medium text-admin-text-primary truncate">
                  {alert.alertType.replace(/_/g, " ")}
                </p>
                <span className="rounded-full bg-admin-accent/20 px-3 py-1 text-xs font-semibold text-admin-accent whitespace-nowrap ml-2">
                  {alert._count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-admin-text-muted">
            No alert types
          </p>
        )}
      </AdminCard>

      {recentAlerts.length > 0 && (
        <AdminCard className="space-y-4">
          <h3 className="font-semibold text-admin-text-primary">
            Recent High-Risk Alerts
          </h3>
          <div className="overflow-x-auto">
            <TableShell>
              <table className={adminTableClassName}>
                <thead>
                  <tr className="border-b border-admin-border">
                    <th className={adminTableHeadCellClassName}>Type</th>
                    <th className={adminTableHeadCellClassName}>Severity</th>
                    <th
                      className={`${adminTableHeadCellClassName} hidden sm:table-cell`}
                    >
                      User
                    </th>
                    <th className={adminTableHeadCellClassName}>Status</th>
                    <th
                      className={`${adminTableHeadCellClassName} hidden md:table-cell`}
                    >
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentAlerts.slice(0, 10).map((alert, idx) => (
                    <tr
                      key={alert.id}
                      className={
                        idx % 2 === 0
                          ? "border-b border-admin-border/50 even:bg-admin-surface/50"
                          : "border-b border-admin-border/50"
                      }
                    >
                      <td className={adminTableCellClassName}>
                        <span className="text-xs sm:text-sm">
                          {alert.alertType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className={adminTableCellClassName}>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            alert.severity === "CRITICAL"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-orange-500/20 text-orange-400"
                          }`}
                        >
                          {alert.severity === "CRITICAL" ? "🔴" : "🟠"}{" "}
                          {alert.severity}
                        </span>
                      </td>
                      <td
                        className={`${adminTableCellClassName} hidden sm:table-cell truncate text-xs`}
                      >
                        {alert.user?.email
                          ? truncateEmailForTable(alert.user.email)
                          : "System"}
                      </td>
                      <td className={adminTableCellClassName}>
                        <span className="inline-flex rounded-full bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-400">
                          {alert.status}
                        </span>
                      </td>
                      <td
                        className={`${adminTableCellClassName} hidden md:table-cell text-xs text-admin-text-muted`}
                      >
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </div>
        </AdminCard>
      )}
    </div>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState<ReportPeriod>("30d");

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Reports & Analytics"
        subtitle="Financial, operational, and compliance reports"
      />

      <AdminCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-admin-text-primary">
            Report Period
          </p>
          <p className="text-xs text-admin-text-muted mt-0.5">
            All reports will update for the selected time range
          </p>
        </div>
        <Select
          value={period}
          onValueChange={(v) => setPeriod(v as ReportPeriod)}
        >
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminCard>

      <Tabs defaultValue="financial" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 min-w-min sm:min-w-0">
            <TabsTrigger value="financial" className="text-xs sm:text-sm">
              Financial
            </TabsTrigger>
            <TabsTrigger value="betting" className="text-xs sm:text-sm">
              Betting
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">
              Users
            </TabsTrigger>
            <TabsTrigger value="risk" className="text-xs sm:text-sm">
              Risk
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-6 space-y-4">
          <TabsContent value="financial" className="mt-0">
            <FinancialReportsTab period={period} />
          </TabsContent>

          <TabsContent value="betting" className="mt-0">
            <BettingReportsTab period={period} />
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <UsersReportsTab period={period} />
          </TabsContent>

          <TabsContent value="risk" className="mt-0">
            <RiskReportsTab period={period} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
