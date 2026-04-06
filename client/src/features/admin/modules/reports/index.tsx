import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Users, Zap } from "lucide-react";
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
} from "../../components/ui";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader } from "lucide-react";

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "14d", label: "Last 14 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "6m", label: "Last 6 Months" },
  { value: "1y", label: "Last Year" },
  { value: "all", label: "All Time" },
];

function FinancialReportsTab() {
  const [period] = useState<ReportPeriod>("30d");
  const { data, isLoading } = useAdminFinancialReport(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-admin-accent" />
      </div>
    );
  }

  if (!data) return <div>No data available</div>;

  const stats = [
    {
      label: "Total Revenue",
      value: `KES ${(data.totalRevenue / 1000).toFixed(1)}K`,
      icon: DollarSign,
      tone: "blue" as const,
    },
    {
      label: "Deposits",
      value: `${data.deposits.count}`,
      subtext: `KES ${(data.deposits.totalAmount / 1000).toFixed(1)}K`,
      icon: TrendingUp,
      tone: "accent" as const,
    },
    {
      label: "Withdrawals",
      value: `${data.withdrawals.count}`,
      subtext: `KES ${(data.withdrawals.totalAmount / 1000).toFixed(1)}K`,
      icon: TrendingDown,
      tone: "red" as const,
    },
    {
      label: "Bets Placed",
      value: `${data.bets.count}`,
      subtext: `KES ${(data.bets.totalStaked / 1000).toFixed(1)}K staked`,
      icon: Zap,
      tone: "purple" as const,
    },
  ];

  const transactionData = data.transactionsByType
    .filter((t) => t._sum.amount)
    .map((t) => ({
      name: `${t.type} (${t.status})`,
      value: (t._sum.amount || 0) / 1000,
      count: t._count,
    }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            subtext={stat.subtext}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </div>

      <AdminCard className="space-y-4">
        <h3 className="font-semibold text-admin-text-primary">
          Transaction Breakdown (KES 000s)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={transactionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" tick={{ fill: "#999", fontSize: 12 }} />
            <YAxis tick={{ fill: "#999", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e1e1e",
                border: "1px solid #444",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="value" fill="#3b82f6" name="Amount (KES 000s)" />
          </BarChart>
        </ResponsiveContainer>
      </AdminCard>
    </div>
  );
}

function BettingReportsTab() {
  const [period] = useState<ReportPeriod>("30d");
  const { data, isLoading } = useAdminBettingReport(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-admin-accent" />
      </div>
    );
  }

  if (!data) return <div>No data available</div>;

  const stats = [
    {
      label: "Total Bets",
      value: `${data.totalBets}`,
      icon: Zap,
      tone: "blue" as const,
    },
    {
      label: "Total Staked",
      value: `KES ${(data.totalStaked / 1000).toFixed(1)}K`,
      icon: DollarSign,
      tone: "accent" as const,
    },
    {
      label: "Win Rate",
      value: `${data.winLossStats.winRate}%`,
      icon: TrendingUp,
      tone: "purple" as const,
    },
    {
      label: "Avg Stake",
      value: `KES ${data.averageStake}`,
      icon: DollarSign,
      tone: "blue" as const,
    },
  ];

  const winLossData = [
    {
      name: "Won",
      value: data.winLossStats.won,
      color: "#10b981",
    },
    {
      name: "Lost",
      value: data.winLossStats.lost,
      color: "#ef4444",
    },
    {
      name: "Pending",
      value: data.winLossStats.pending,
      color: "#f59e0b",
    },
    {
      name: "Void",
      value: data.winLossStats.void,
      color: "#6b7280",
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard className="space-y-4">
          <h3 className="font-semibold text-admin-text-primary">
            Bet Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={winLossData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {winLossData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e1e",
                  border: "1px solid #444",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </AdminCard>

        <AdminCard className="space-y-4">
          <h3 className="font-semibold text-admin-text-primary">
            Top Markets
          </h3>
          <div className="space-y-3">
            {data.topMarkets.slice(0, 5).map((market) => (
              <div
                key={market.marketType}
                className="flex items-center justify-between rounded-lg bg-admin-surface/50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-admin-text-primary">
                    {market.marketType}
                  </p>
                  <p className="text-xs text-admin-text-muted">
                    {market.count} bets
                  </p>
                </div>
                <p className="font-semibold text-admin-accent">
                  KES {(market.totalStaked / 1000).toFixed(1)}K
                </p>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

function UsersReportsTab() {
  const [period] = useState<ReportPeriod>("30d");
  const { data, isLoading } = useAdminUsersReport(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-admin-accent" />
      </div>
    );
  }

  if (!data) return <div>No data available</div>;

  const stats = [
    {
      label: "Total Users",
      value: `${data.totalUsers}`,
      icon: Users,
      tone: "blue" as const,
    },
    {
      label: "New Users",
      value: `${data.newUsers}`,
      icon: TrendingUp,
      tone: "accent" as const,
    },
    {
      label: "Active Users",
      value: `${data.activeUsers}`,
      icon: Zap,
      tone: "purple" as const,
    },
    {
      label: "Avg Bets/User",
      value: `${data.averageBetsPerActiveUser}`,
      icon: DollarSign,
      tone: "gold" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </div>

      <AdminCard className="space-y-4">
        <h3 className="font-semibold text-admin-text-primary">Top Bettors</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border">
                <th className="px-4 py-3 text-left font-semibold text-admin-text-primary">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-semibold text-admin-text-primary">
                  Name
                </th>
                <th className="px-4 py-3 text-right font-semibold text-admin-text-primary">
                  Bets Placed
                </th>
              </tr>
            </thead>
            <tbody>
              {data.topBettors.map((bettor) => (
                <tr
                  key={bettor.id}
                  className="border-b border-admin-border/50 hover:bg-admin-surface/50"
                >
                  <td className="px-4 py-3 text-admin-text-secondary">
                    {bettor.email}
                  </td>
                  <td className="px-4 py-3 text-admin-text-secondary">
                    {bettor.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-admin-accent">
                    {bettor.betCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}

function RiskReportsTab() {
  const [period] = useState<ReportPeriod>("30d");
  const { data, isLoading } = useAdminRiskReport(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-admin-accent" />
      </div>
    );
  }

  if (!data) return <div>No data available</div>;

  const stats = [
    {
      label: "Total Alerts",
      value: `${data.totalAlerts}`,
      icon: Zap,
      tone: "blue" as const,
    },
    {
      label: "High Risk",
      value: `${data.alertsBySeverity.find((a) => a.severity === "HIGH")?._count || 0}`,
      icon: TrendingDown,
      tone: "red" as const,
    },
    {
      label: "Critical",
      value: `${data.alertsBySeverity.find((a) => a.severity === "CRITICAL")?._count || 0}`,
      icon: TrendingDown,
      tone: "red" as const,
    },
  ];

  const severityData = data.alertsBySeverity
    .map((a) => ({
      name: a.severity,
      value: a._count,
      color:
        a.severity === "CRITICAL"
          ? "#dc2626"
          : a.severity === "HIGH"
            ? "#f97316"
            : a.severity === "MEDIUM"
              ? "#eab308"
              : "#22c55e",
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard className="space-y-4">
          <h3 className="font-semibold text-admin-text-primary">
            Alerts by Severity
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={severityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e1e",
                  border: "1px solid #444",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </AdminCard>

        <AdminCard className="space-y-4">
          <h3 className="font-semibold text-admin-text-primary">
            Top Alert Types
          </h3>
          <div className="space-y-3">
            {data.alertsByType.slice(0, 5).map((alert) => (
              <div
                key={alert.alertType}
                className="flex items-center justify-between rounded-lg bg-admin-surface/50 p-3"
              >
                <p className="text-sm font-medium text-admin-text-primary">
                  {alert.alertType.replace(/_/g, " ")}
                </p>
                <span className="rounded-full bg-admin-accent/20 px-3 py-1 text-xs font-semibold text-admin-accent">
                  {alert._count}
                </span>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      {data.recentHighRiskAlerts.length > 0 && (
        <AdminCard className="space-y-4">
          <h3 className="font-semibold text-admin-text-primary">
            Recent High-Risk Alerts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-admin-border">
                  <th className="px-4 py-3 text-left font-semibold text-admin-text-primary">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-admin-text-primary">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-admin-text-primary">
                    User
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-admin-text-primary">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-admin-text-primary">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentHighRiskAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="border-b border-admin-border/50 hover:bg-admin-surface/50"
                  >
                    <td className="px-4 py-3 text-admin-text-secondary">
                      {alert.alertType.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          alert.severity === "CRITICAL"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-orange-500/20 text-orange-400"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-admin-text-secondary">
                      {alert.user?.email || "System"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-400">
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-admin-text-muted">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <p className="text-sm font-medium text-admin-text-primary">
            Report Period
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
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

      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="betting">Betting</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <FinancialReportsTab />
        </TabsContent>

        <TabsContent value="betting">
          <BettingReportsTab />
        </TabsContent>

        <TabsContent value="users">
          <UsersReportsTab />
        </TabsContent>

        <TabsContent value="risk">
          <RiskReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
