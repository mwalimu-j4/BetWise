import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
  TableShell,
} from "../../components/ui";
import {
  type AnalyticsGroupBy,
  type AnalyticsTimeframe,
  useAdminAnalytics,
} from "../../hooks/useAdminAnalytics";

const timeframeOptions: Array<{ label: string; value: AnalyticsTimeframe }> = [
  { label: "4 Weeks", value: "4w" },
  { label: "12 Weeks", value: "12w" },
  { label: "6 Months", value: "6m" },
  { label: "12 Months", value: "12m" },
  { label: "3 Years", value: "3y" },
];

const groupByOptions: Array<{ label: string; value: AnalyticsGroupBy }> = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

const chartPalette = ["#00e5a0", "#4aa3ff", "#ffbe55", "#ff6464", "#9f7aea"];

function formatCurrency(value: number) {
  return `KES ${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function toneClass(tone: "accent" | "blue" | "gold" | "red" | "purple") {
  if (tone === "accent") return "text-admin-accent";
  if (tone === "blue") return "text-admin-blue";
  if (tone === "gold") return "text-admin-gold";
  if (tone === "red") return "text-admin-red";
  return "text-admin-purple";
}

function priorityClass(priority: "high" | "medium" | "low") {
  if (priority === "high")
    return "bg-admin-red/20 text-admin-red border-admin-red/30";
  if (priority === "medium") {
    return "bg-admin-gold/20 text-admin-gold border-admin-gold/30";
  }
  return "bg-admin-blue/20 text-admin-blue border-admin-blue/30";
}

export default function Analytics() {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>("12w");
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>("week");

  const { data, isLoading, isError, error } = useAdminAnalytics({
    timeframe,
    groupBy,
  });

  const sportsChartData = useMemo(
    () => (data?.breakdowns.sports ?? []).slice(0, 8),
    [data?.breakdowns.sports],
  );

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Analytics Intelligence"
        subtitle="Betting economics, game mix, and strategic recommendations."
      />

      <AdminCard className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-admin-text-secondary">
              Time Period
            </label>
            <select
              value={timeframe}
              onChange={(e) =>
                setTimeframe(e.target.value as AnalyticsTimeframe)
              }
              className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm font-medium text-admin-text-primary transition-colors hover:border-admin-accent focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
            >
              {timeframeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-admin-text-secondary">
              Group By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as AnalyticsGroupBy)}
              className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm font-medium text-admin-text-primary transition-colors hover:border-admin-gold focus:border-admin-gold focus:outline-none focus:ring-2 focus:ring-admin-gold/20"
            >
              {groupByOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </AdminCard>

      {isError ? (
        <AdminCard>
          <p className="text-sm text-admin-red">
            {(error as Error)?.message ?? "Unable to load analytics data."}
          </p>
        </AdminCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminCard className="lg:col-span-2">
          <AdminCardHeader
            title="Financial Trend"
            subtitle="Handle, payouts, and NGR over selected periods"
          />
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart
              data={data?.trend ?? []}
              margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id="stakeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5a0" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00e5a0" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="payoutFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffbe55" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ffbe55" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.07)"
              />
              <XAxis
                dataKey="period"
                stroke="rgba(255,255,255,0.45)"
                fontSize={11}
              />
              <YAxis stroke="rgba(255,255,255,0.45)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(20,24,40,0.98)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                }}
                formatter={(value: any) => formatCurrency(value ?? 0)}
              />
              <Area
                type="monotone"
                dataKey="stake"
                stroke="#00e5a0"
                fill="url(#stakeFill)"
                strokeWidth={2}
                name="Handle"
              />
              <Area
                type="monotone"
                dataKey="payout"
                stroke="#ffbe55"
                fill="url(#payoutFill)"
                strokeWidth={2}
                name="Payout"
              />
              <Line
                type="monotone"
                dataKey="ngr"
                stroke="#4aa3ff"
                strokeWidth={2.5}
                dot={false}
                name="NGR"
              />
            </AreaChart>
          </ResponsiveContainer>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader
            title="Financial Snapshot"
            subtitle="Core performance for current window"
          />
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-admin-border bg-admin-surface/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
                Handle
              </p>
              <p className="mt-1 text-lg font-bold text-admin-accent">
                {formatCurrency(data?.financialSummary.handle ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-admin-border bg-admin-surface/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
                Gross Revenue (GGR)
              </p>
              <p className="mt-1 text-lg font-bold text-admin-blue">
                {formatCurrency(data?.financialSummary.ggr ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-admin-border bg-admin-surface/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
                Net Revenue Estimate (NGR)
              </p>
              <p className="mt-1 text-lg font-bold text-admin-gold">
                {formatCurrency(data?.financialSummary.ngr ?? 0)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-admin-border bg-admin-bg p-2">
                <p className="text-admin-text-muted">GGR Δ</p>
                <p className="font-semibold text-admin-text-primary">
                  {formatPercent(data?.growth.ggrChangePct ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-admin-border bg-admin-bg p-2">
                <p className="text-admin-text-muted">Active Δ</p>
                <p className="font-semibold text-admin-text-primary">
                  {formatPercent(data?.growth.activeBettorsChangePct ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(data?.signalCards ?? []).map((card) => (
          <AdminCard className="p-3" key={card.label}>
            <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
              {card.label}
            </p>
            <p className={`mt-1 text-base font-bold ${toneClass(card.tone)}`}>
              {card.value}
            </p>
            <p className="mt-1 text-[10px] text-admin-text-muted">
              {card.helper}
            </p>
          </AdminCard>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <AdminCardHeader
            title="Game Category Performance"
            subtitle="Stake and GGR by sport"
          />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sportsChartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="stakeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5a0" stopOpacity={1} />
                  <stop offset="100%" stopColor="#00e5a0" stopOpacity={0.65} />
                </linearGradient>
                <linearGradient id="ggrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4aa3ff" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4aa3ff" stopOpacity={0.65} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="sport"
                stroke="rgba(255,255,255,0.35)"
                fontSize={11}
                tick={{ fill: "rgba(255,255,255,0.5)" }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                fontSize={11}
                tick={{ fill: "rgba(255,255,255,0.5)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15,20,35,0.95)",
                  border: "1px solid rgba(0,229,160,0.2)",
                  borderRadius: "10px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                formatter={(value: any) => formatCurrency(value ?? 0)}
              />
              <Bar
                dataKey="stake"
                fill="url(#stakeGrad)"
                name="Handle"
                radius={[6, 6, 0, 0]}
                isAnimationActive={true}
              />
              <Bar
                dataKey="ggr"
                fill="url(#ggrGrad)"
                name="GGR"
                radius={[6, 6, 0, 0]}
                isAnimationActive={true}
              />
            </BarChart>
          </ResponsiveContainer>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader
            title="Bet Outcomes"
            subtitle="Won, lost, void, and pending distribution"
          />
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data?.breakdowns.outcomes ?? []}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={94}
                label={({ name, percent }) =>
                  `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`
                }
                labelLine={false}
                isAnimationActive={true}
              >
                {(data?.breakdowns.outcomes ?? []).map((_, index) => (
                  <Cell
                    key={index}
                    fill={chartPalette[index % chartPalette.length]}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15,20,35,0.95)",
                  border: "1px solid rgba(0,229,160,0.25)",
                  borderRadius: "10px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </AdminCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <AdminCardHeader
            title="Ticket Size Distribution"
            subtitle="Handle split across stake bands"
          />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data?.breakdowns.stakeDistribution ?? []}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="handleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff9800" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ff6b6b" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="band"
                stroke="rgba(255,255,255,0.35)"
                fontSize={11}
                tick={{ fill: "rgba(255,255,255,0.5)" }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                fontSize={11}
                tick={{ fill: "rgba(255,255,255,0.5)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15,20,35,0.95)",
                  border: "1px solid rgba(255,153,0,0.2)",
                  borderRadius: "10px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                formatter={(value: any) => formatCurrency(value ?? 0)}
              />
              <Bar
                dataKey="handle"
                fill="url(#handleGrad)"
                name="Handle"
                radius={[6, 6, 0, 0]}
                isAnimationActive={true}
              />
            </BarChart>
          </ResponsiveContainer>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader
            title="Odds Band Efficiency"
            subtitle="Win rate and hold by quoted odds"
          />
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data?.breakdowns.oddsPerformance ?? []}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="band"
                stroke="rgba(255,255,255,0.35)"
                fontSize={11}
                tick={{ fill: "rgba(255,255,255,0.5)" }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                fontSize={11}
                tick={{ fill: "rgba(255,255,255,0.5)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15,20,35,0.95)",
                  border: "1px solid rgba(0,229,160,0.2)",
                  borderRadius: "10px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                formatter={(value: any) => formatPercent(value ?? 0)}
              />
              <Line
                type="natural"
                dataKey="hitRate"
                stroke="#00e5a0"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#00e5a0",
                  stroke: "rgba(255,255,255,0.2)",
                  strokeWidth: 1.5,
                }}
                activeDot={{ r: 6 }}
                name="Hit Rate"
              />
              <Line
                type="natural"
                dataKey="holdRate"
                stroke="#ffbe55"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#ffbe55",
                  stroke: "rgba(255,255,255,0.2)",
                  strokeWidth: 1.5,
                }}
                activeDot={{ r: 6 }}
                name="Hold Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </AdminCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <AdminCardHeader
            title="Top Leagues"
            subtitle="Highest handle leagues in selected window"
          />
          <TableShell>
            <table className={adminTableClassName}>
              <thead>
                <tr>
                  <th className={adminTableHeadCellClassName}>League</th>
                  <th className={adminTableHeadCellClassName}>Sport</th>
                  <th className={adminTableHeadCellClassName}>Handle</th>
                  <th className={adminTableHeadCellClassName}>GGR</th>
                  <th className={adminTableHeadCellClassName}>Share</th>
                </tr>
              </thead>
              <tbody>
                {(data?.breakdowns.leagues ?? []).slice(0, 8).map((league) => (
                  <tr
                    className="even:bg-admin-surface/45"
                    key={`${league.sport}-${league.league}`}
                  >
                    <td className={adminTableCellClassName}>{league.league}</td>
                    <td className={adminTableCellClassName}>{league.sport}</td>
                    <td className={adminTableCellClassName}>
                      {formatCurrency(league.stake)}
                    </td>
                    <td className={adminTableCellClassName}>
                      {formatCurrency(league.ggr)}
                    </td>
                    <td className={adminTableCellClassName}>
                      {formatPercent(league.shareOfHandle)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader
            title="Recommendations"
            subtitle="Auto-generated strategic actions from current analytics"
          />
          <div className="space-y-3">
            {(data?.recommendations ?? []).map((recommendation, index) => (
              <div
                className="rounded-xl border border-admin-border bg-admin-surface/45 p-3"
                key={`${recommendation.title}-${index}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-admin-text-primary">
                    {recommendation.title}
                  </p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${priorityClass(recommendation.priority)}`}
                  >
                    {recommendation.priority}
                  </span>
                </div>
                <p className="mt-2 text-xs text-admin-text-secondary">
                  {recommendation.insight}
                </p>
                <p className="mt-1 text-xs text-admin-text-muted">
                  {recommendation.action}
                </p>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      {isLoading && !data ? (
        <AdminCard>
          <p className="text-sm text-admin-text-muted">
            Loading analytics intelligence...
          </p>
        </AdminCard>
      ) : null}
    </div>
  );
}
