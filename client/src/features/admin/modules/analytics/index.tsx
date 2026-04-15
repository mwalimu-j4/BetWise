import { useEffect, useMemo, useState } from "react";
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
  Legend,
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
  { label: "This Week", value: "1w" },
  { label: "This Month", value: "1m" },
  { label: "6 Months", value: "6m" },
  { label: "This Year", value: "1y" },
  { label: "All Time", value: "all" },
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

function preferredGroupByForTimeframe(
  timeframe: AnalyticsTimeframe,
): AnalyticsGroupBy {
  if (timeframe === "1w") return "week";
  if (timeframe === "1m") return "month";
  if (timeframe === "6m" || timeframe === "1y" || timeframe === "all") {
    return "month";
  }
  return "month";
}

export default function Analytics() {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>("1m");
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>(
    preferredGroupByForTimeframe("1m"),
  );

  useEffect(() => {
    setGroupBy(preferredGroupByForTimeframe(timeframe));
  }, [timeframe]);

  const { data, isLoading, isError, error } = useAdminAnalytics({
    timeframe,
    groupBy,
  });

  const sportsChartData = useMemo(
    () => (data?.breakdowns.sports ?? []).slice(0, 8),
    [data?.breakdowns.sports],
  );

  return (
    <div className="space-y-4 px-0">
      <AdminSectionHeader
        title="Analytics Intelligence"
        subtitle="Real-time betting economics and performance metrics"
      />

      {isError ? (
        <AdminCard>
          <p className="text-sm text-admin-red">
            {(error as Error)?.message ?? "Unable to load analytics data."}
          </p>
        </AdminCard>
      ) : null}

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AdminCard key={i} className="animate-pulse p-3">
              <div className="h-5 w-32 rounded bg-admin-surface mb-3" />
              <div className="h-40 rounded bg-admin-surface" />
            </AdminCard>
          ))}
        </div>
      ) : null}

      {!isLoading && data && (
        <>
          {/* Main Chart + Summary */}
          <div className="grid gap-3 lg:grid-cols-3">
            <AdminCard className="lg:col-span-2 p-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-admin-text-primary">
                    Financial Trend
                  </h3>
                  <p className="text-xs text-admin-text-muted">
                    Handle, payouts, and net gaming revenue
                  </p>
                </div>
                <select
                  value={timeframe}
                  onChange={(e) =>
                    setTimeframe(e.target.value as AnalyticsTimeframe)
                  }
                  className="rounded border border-admin-border/50 bg-admin-surface px-2 py-1.5 text-xs font-medium text-admin-text-primary transition-colors hover:border-admin-accent focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
                >
                  {timeframeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={data?.trend ?? []}
                  margin={{ top: 5, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="stakeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00e5a0" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="payoutGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4aa3ff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4aa3ff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="2 2"
                    stroke="rgba(255,255,255,0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="period"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={11}
                    tick={{ fill: "rgba(255,255,255,0.4)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={11}
                    tick={{ fill: "rgba(255,255,255,0.4)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,20,35,0.98)",
                      border: "1px solid rgba(0,229,160,0.3)",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.8)" }}
                    formatter={(value: any) => formatCurrency(value ?? 0)}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "8px" }}
                    iconType="line"
                  />
                  <Area
                    type="monotone"
                    dataKey="stake"
                    stroke="#00e5a0"
                    fill="url(#stakeGrad)"
                    strokeWidth={2.5}
                    name="Handle"
                    isAnimationActive={true}
                  />
                  <Area
                    type="monotone"
                    dataKey="payout"
                    stroke="#4aa3ff"
                    fill="url(#payoutGrad)"
                    strokeWidth={2.5}
                    name="Payout"
                    isAnimationActive={true}
                  />
                  <Line
                    type="monotone"
                    dataKey="ngr"
                    stroke="#ffbe55"
                    strokeWidth={2.5}
                    dot={false}
                    name="NGR"
                    isAnimationActive={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </AdminCard>

            {/* Summary Cards */}
            <AdminCard className="p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-admin-text-muted mb-2">
                Snapshot
              </h4>
              <div className="space-y-2">
                <div className="rounded-lg bg-gradient-to-br from-admin-accent/10 to-transparent border border-admin-accent/20 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-admin-text-muted">
                    Handle
                  </p>
                  <p className="mt-1 text-base font-bold text-admin-accent">
                    {formatCurrency(data?.financialSummary.handle ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-admin-blue/10 to-transparent border border-admin-blue/20 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-admin-text-muted">
                    GGR
                  </p>
                  <p className="mt-1 text-base font-bold text-admin-blue">
                    {formatCurrency(data?.financialSummary.ggr ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-admin-gold/10 to-transparent border border-admin-gold/20 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-admin-text-muted">
                    NGR
                  </p>
                  <p className="mt-1 text-base font-bold text-admin-gold">
                    {formatCurrency(data?.financialSummary.ngr ?? 0)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg border border-admin-border/30 bg-admin-surface/30 p-2">
                    <p className="text-[9px] uppercase tracking-wider text-admin-text-muted">
                      GGR Δ
                    </p>
                    <p className="mt-1 text-xs font-bold text-admin-text-primary">
                      {formatPercent(data?.growth.ggrChangePct ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-admin-border/30 bg-admin-surface/30 p-2">
                    <p className="text-[9px] uppercase tracking-wider text-admin-text-muted">
                      Active Δ
                    </p>
                    <p className="mt-1 text-xs font-bold text-admin-text-primary">
                      {formatPercent(data?.growth.activeBettorsChangePct ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {(data?.signalCards ?? []).map((card) => (
              <AdminCard className="p-2.5" key={card.label}>
                <p className="text-[9px] uppercase tracking-wider text-admin-text-muted truncate">
                  {card.label}
                </p>
                <p
                  className={`mt-1.5 text-sm font-bold ${toneClass(card.tone)}`}
                >
                  {card.value}
                </p>
                <p className="mt-1 text-[9px] text-admin-text-muted line-clamp-2">
                  {card.helper}
                </p>
              </AdminCard>
            ))}
          </div>

          {/* Chart Grid */}
          <div className="grid gap-3 md:grid-cols-2">
            {/* Game Category Performance */}
            <AdminCard className="p-3">
              <AdminCardHeader
                title="Game Category Performance"
                subtitle="Stake and GGR by sport"
              />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={sportsChartData}
                  margin={{ top: 5, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 2"
                    stroke="rgba(255,255,255,0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="sport"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tick={{ fill: "rgba(255,255,255,0.4)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tick={{ fill: "rgba(255,255,255,0.4)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,20,35,0.98)",
                      border: "1px solid rgba(0,229,160,0.3)",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                    formatter={(value: any) => formatCurrency(value ?? 0)}
                  />
                  <Legend wrapperStyle={{ paddingTop: "4px" }} />
                  <Bar
                    dataKey="stake"
                    fill="#00e5a0"
                    name="Handle"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="ggr"
                    fill="#4aa3ff"
                    name="GGR"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </AdminCard>

            {/* Bet Outcomes */}
            <AdminCard className="p-3">
              <AdminCardHeader
                title="Bet Outcomes Distribution"
                subtitle="Won, lost, void, and pending"
              />
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data?.breakdowns.outcomes ?? []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) =>
                      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {(data?.breakdowns.outcomes ?? []).map((_, index) => (
                      <Cell
                        key={index}
                        fill={chartPalette[index % chartPalette.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,20,35,0.98)",
                      border: "1px solid rgba(0,229,160,0.3)",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </AdminCard>

            {/* Ticket Size Distribution */}
            <AdminCard className="p-3">
              <AdminCardHeader
                title="Ticket Size Distribution"
                subtitle="Handle across stake bands"
              />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data?.breakdowns.stakeDistribution ?? []}
                  margin={{ top: 5, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 2"
                    stroke="rgba(255,255,255,0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="band"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tick={{ fill: "rgba(255,255,255,0.4)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tick={{ fill: "rgba(255,255,255,0.4)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,20,35,0.98)",
                      border: "1px solid rgba(255,153,0,0.3)",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                    formatter={(value: any) => formatCurrency(value ?? 0)}
                  />
                  <Bar
                    dataKey="handle"
                    fill="#ff9800"
                    name="Handle"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </AdminCard>

            {/* Odds Band Efficiency */}
            <AdminCard className="p-3">
              <AdminCardHeader
                title="Odds Band Efficiency"
                subtitle="Hit rate and hold by odds"
              />
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={data?.breakdowns.oddsPerformance ?? []}
                  margin={{ top: 5, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 2"
                    stroke="rgba(255,255,255,0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="band"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tick={{ fill: "rgba(255,255,255,0.4)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tick={{ fill: "rgba(255,255,255,0.4)" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,20,35,0.98)",
                      border: "1px solid rgba(0,229,160,0.3)",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                    formatter={(value: any) => formatPercent(value ?? 0)}
                  />
                  <Legend wrapperStyle={{ paddingTop: "4px" }} />
                  <Line
                    type="monotone"
                    dataKey="hitRate"
                    stroke="#00e5a0"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#00e5a0" }}
                    activeDot={{ r: 5 }}
                    name="Hit Rate"
                  />
                  <Line
                    type="monotone"
                    dataKey="holdRate"
                    stroke="#ffbe55"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#ffbe55" }}
                    activeDot={{ r: 5 }}
                    name="Hold Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </AdminCard>
          </div>

          {/* Tables */}
          <div className="grid gap-3 md:grid-cols-2">
            {/* Top Leagues */}
            <AdminCard className="p-3">
              <AdminCardHeader
                title="Top Leagues"
                subtitle="Highest handle leagues"
              />
              <div className="overflow-x-auto">
                <TableShell>
                  <table className={adminTableClassName}>
                    <thead>
                      <tr>
                        <th className={adminTableHeadCellClassName}>League</th>
                        <th className={adminTableHeadCellClassName}>Sport</th>
                        <th className={adminTableHeadCellClassName}>Handle</th>
                        <th className={adminTableHeadCellClassName}>GGR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.breakdowns.leagues ?? [])
                        .slice(0, 6)
                        .map((league) => (
                          <tr
                            className="even:bg-admin-surface/30 hover:bg-admin-surface/50 transition-colors"
                            key={`${league.sport}-${league.league}`}
                          >
                            <td className={adminTableCellClassName}>
                              <span className="text-xs font-medium">
                                {league.league}
                              </span>
                            </td>
                            <td className={adminTableCellClassName}>
                              <span className="text-xs">{league.sport}</span>
                            </td>
                            <td className={adminTableCellClassName}>
                              <span className="text-xs font-semibold text-admin-accent">
                                {formatCurrency(league.stake)}
                              </span>
                            </td>
                            <td className={adminTableCellClassName}>
                              <span className="text-xs font-semibold text-admin-blue">
                                {formatCurrency(league.ggr)}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </TableShell>
              </div>
            </AdminCard>

            {/* Recommendations */}
            <AdminCard className="p-3">
              <AdminCardHeader
                title="Strategic Insights"
                subtitle="Data-driven recommendations"
              />
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {(data?.recommendations ?? []).map((recommendation, index) => (
                  <div
                    className="rounded-lg border border-admin-border/40 bg-admin-surface/40 p-2.5 hover:bg-admin-surface/60 transition-colors"
                    key={`${recommendation.title}-${index}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-xs text-admin-text-primary">
                        {recommendation.title}
                      </p>
                      <span
                        className={`rounded-full border text-[9px] px-1.5 py-0.5 font-medium whitespace-nowrap ${priorityClass(recommendation.priority)}`}
                      >
                        {recommendation.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-admin-text-secondary leading-tight">
                      {recommendation.insight}
                    </p>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        </>
      )}

      {isLoading && !data ? (
        <AdminCard className="p-3">
          <p className="text-xs text-admin-text-muted">
            Loading analytics...
          </p>
        </AdminCard>
      ) : null}
    </div>
  );
}
