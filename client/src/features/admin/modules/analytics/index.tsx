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
  XAxis,
  YAxis,
  Legend,
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
import { AlertCircle, RefreshCw } from "lucide-react";

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

function getChartHeight(isMobile: boolean): number {
  return isMobile ? 240 : 320;
}

function LoadingSkeletons() {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <AdminCard key={i} className="animate-pulse">
            <div className="h-5 w-32 rounded bg-admin-surface mb-4" />
            <div className="space-y-3">
              <div className="h-32 rounded bg-admin-surface" />
            </div>
          </AdminCard>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <AdminCard key={i} className="p-3 animate-pulse">
            <div className="h-3 w-16 rounded bg-admin-surface mb-2" />
            <div className="h-6 w-24 rounded bg-admin-surface" />
          </AdminCard>
        ))}
      </div>
    </>
  );
}

export default function Analytics() {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>("1m");
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>(
    preferredGroupByForTimeframe("1m"),
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setGroupBy(preferredGroupByForTimeframe(timeframe));
  }, [timeframe]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data, isLoading, isError, error, refetch } = useAdminAnalytics({
    timeframe,
    groupBy,
  });

  const sportsChartData = useMemo(
    () => (data?.breakdowns.sports ?? []).slice(0, 8),
    [data?.breakdowns.sports],
  );

  const trendChartData = useMemo(
    () => data?.trend ?? [],
    [data?.trend],
  );

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Analytics Intelligence"
        subtitle="Betting economics, game mix, and strategic recommendations."
      />

      {/* Error State */}
      {isError && (
        <AdminCard className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-admin-red/30 bg-admin-red/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-admin-red mt-0.5 flex-shrink-0" />
            <p className="text-sm text-admin-red">
              {(error as Error)?.message ?? "Unable to load analytics data. Please try again."}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg bg-admin-red/20 hover:bg-admin-red/30 px-3 py-1 text-sm font-medium text-admin-red transition-colors flex-shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </AdminCard>
      )}

      {/* Loading Skeletons */}
      {isLoading && <LoadingSkeletons() />}

      {/* Main Content */}
      {!isLoading && data && (
        <>
          {/* Period Selector */}
          <AdminCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label className="block text-sm font-semibold text-admin-text-primary mb-2 sm:mb-0">
                Timeframe
              </label>
            </div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as AnalyticsTimeframe)}
              className="w-full sm:w-auto rounded border border-admin-border bg-admin-surface px-3 py-2 text-sm font-medium text-admin-text-primary transition-colors hover:border-admin-accent focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
            >
              {timeframeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </AdminCard>

          {/* Main Trend Chart */}
          <AdminCard className="lg:col-span-2 overflow-hidden">
            <div className="mb-4 border-b border-admin-border pb-4">
              <h3 className="text-sm font-semibold text-admin-text-primary">Financial Trend</h3>
              <p className="text-xs text-admin-text-muted mt-1">Handle, payouts, and NGR over selected periods</p>
            </div>
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={getChartHeight(isMobile)} minWidth={300}>
                <AreaChart
                  data={trendChartData}
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
                    fontSize={isMobile ? 10 : 11}
                  />
                  <YAxis stroke="rgba(255,255,255,0.45)" fontSize={isMobile ? 10 : 11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(20,24,40,0.98)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                    }}
                    formatter={(value: any) => formatCurrency(value ?? 0)}
                  />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 12 : 13 }} />
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
            </div>
          </AdminCard>

          {/* Financial Snapshot */}
          <div className="grid gap-4 lg:grid-cols-3">
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

            {/* Signal Cards */}
            <div className="lg:col-span-2 grid gap-3 grid-cols-2 lg:grid-cols-3">
              {(data?.signalCards ?? []).map((card) => (
                <AdminCard className="p-3" key={card.label}>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
                    {card.label}
                  </p>
                  <p
                    className={`mt-1 text-base font-bold truncate ${toneClass(card.tone)}`}
                  >
                    {card.value}
                  </p>
                  <p className="mt-1 text-[10px] text-admin-text-muted truncate">
                    {card.helper}
                  </p>
                </AdminCard>
              ))}
            </div>
          </div>

          {/* Performance Charts */}
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminCard>
              <AdminCardHeader
                title="Game Category Performance"
                subtitle="Stake and GGR by sport"
              />
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={getChartHeight(isMobile)} minWidth={300}>
                  <BarChart
                    data={sportsChartData}
                    margin={{ top: 8, right: 12, left: 0, bottom: isMobile ? 20 : 4 }}
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
                      fontSize={isMobile ? 9 : 11}
                      tick={{ fill: "rgba(255,255,255,0.5)" }}
                      angle={-45}
                      textAnchor="end"
                      height={isMobile ? 40 : 20}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.35)"
                      fontSize={10}
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
                    <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
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
              </div>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader
                title="Bet Outcomes"
                subtitle="Won, lost, void, and pending distribution"
              />
              <div className="w-full flex justify-center">
                <ResponsiveContainer width={isMobile ? 250 : 300} height={getChartHeight(isMobile)} minWidth={250}>
                  <PieChart>
                    <Pie
                      data={data?.breakdowns.outcomes ?? []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 70 : 85}
                      label={({ name, percent }) =>
                        `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
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
                      formatter={(value: any) => value.toLocaleString()}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </AdminCard>
          </div>

          {/* Distribution Charts */}
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminCard>
              <AdminCardHeader
                title="Ticket Size Distribution"
                subtitle="Handle split across stake bands"
              />
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={getChartHeight(isMobile)} minWidth={300}>
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
                      fontSize={isMobile ? 9 : 11}
                      tick={{ fill: "rgba(255,255,255,0.5)" }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.35)"
                      fontSize={10}
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
              </div>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader
                title="Odds Band Efficiency"
                subtitle="Win rate and hold by quoted odds"
              />
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={getChartHeight(isMobile)} minWidth={300}>
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
                      fontSize={isMobile ? 9 : 11}
                      tick={{ fill: "rgba(255,255,255,0.5)" }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.35)"
                      fontSize={10}
                      tick={{ fill: "rgba(255,255,255,0.5)" }}
                    />
                    <Tooltip
      <AdminSectionHeader
        title="Analytics Intelligence"
        subtitle="Betting economics, game mix, and strategic recommendations."
      />

      {isError ? (
        <AdminCard>
          <p className="text-sm text-admin-red">
            {(error as Error)?.message ?? "Unable to load analytics data."}
          </p>
        </AdminCard>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AdminCard key={i} className="animate-pulse">
              <div className="h-6 w-40 rounded bg-admin-surface mb-4" />
              <div className="space-y-3">
                <div className="h-40 rounded bg-admin-surface" />
              </div>
            </AdminCard>
          ))}
        </div>
      ) : null}

      {!isLoading && data && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <AdminCard className="lg:col-span-2">
              <div className="mb-4 flex flex-col gap-3 border-b border-admin-border pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-admin-text-primary">
                    Financial Trend
                  </h3>
                  <p className="text-xs text-admin-text-muted">
                    Handle, payouts, and NGR over selected periods
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <div className="flex-1 sm:flex-none sm:w-auto">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-admin-text-secondary">
                      Period
                    </label>
                    <select
                      value={timeframe}
                      onChange={(e) =>
                        setTimeframe(e.target.value as AnalyticsTimeframe)
                      }
                      className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1 text-xs font-medium text-admin-text-primary transition-colors hover:border-admin-accent focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20 sm:w-auto"
                    >
                      {timeframeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart
                  data={data?.trend ?? []}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="stakeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#00e5a0"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="#00e5a0"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                    <linearGradient id="payoutFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#ffbe55"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="#ffbe55"
                        stopOpacity={0.01}
                      />
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

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {(data?.signalCards ?? []).map((card) => (
              <AdminCard className="p-3" key={card.label}>
                <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
                  {card.label}
                </p>
                <p
                  className={`mt-1 text-base font-bold ${toneClass(card.tone)}`}
                >
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
                      <stop
                        offset="100%"
                        stopColor="#00e5a0"
                        stopOpacity={0.65}
                      />
                    </linearGradient>
                    <linearGradient id="ggrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4aa3ff" stopOpacity={1} />
                      <stop
                        offset="100%"
                        stopColor="#4aa3ff"
                        stopOpacity={0.65}
                      />
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
                      <stop
                        offset="100%"
                        stopColor="#ff6b6b"
                        stopOpacity={0.5}
                      />
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
                    {(data?.breakdowns.leagues ?? [])
                      .slice(0, 8)
                      .map((league) => (
                        <tr
                          className="even:bg-admin-surface/45"
                          key={`${league.sport}-${league.league}`}
                        >
                          <td className={adminTableCellClassName}>
                            {league.league}
                          </td>
                          <td className={adminTableCellClassName}>
                            {league.sport}
                          </td>
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
        </>
      )}

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
