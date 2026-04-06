import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Loader } from "lucide-react";
import {
  useUserPersonalReport,
  useUserRecentBets,
  useUserFinancialSummary,
  type ReportPeriod,
} from "../hooks/useUserReports";
import { Card } from "@/components/ui/card";
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "14d", label: "Last 14 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "6m", label: "Last 6 Months" },
  { value: "1y", label: "Last Year" },
  { value: "all", label: "All Time" },
];

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  subtext,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend?: "up" | "down";
  subtext?: string;
}) {
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs md:text-sm font-medium text-slate-400 mb-1">
            {label}
          </p>
          <p className="text-xl md:text-2xl font-bold text-white">{value}</p>
          {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
        </div>
        <div className="rounded-lg bg-slate-800 p-2 md:p-3">
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
        </div>
      </div>
      {trend && (
        <div
          className={`mt-2 flex items-center text-xs ${
            trend === "up" ? "text-green-400" : "text-red-400"
          }`}
        >
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1" />
          )}
          {trend === "up" ? "Positive" : "Negative"} trend
        </div>
      )}
    </Card>
  );
}

function PersonalReportTab() {
  const [period] = useState<ReportPeriod>("30d");
  const { data, isLoading } = useUserPersonalReport(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data)
    return (
      <div className="p-4 text-center text-slate-400">No data available</div>
    );

  const betResultsData = data.detailedResults.map((r) => ({
    name: r.status,
    count: r.count,
    staked: r.totalStaked / 1000,
    payout: r.totalPayout / 1000,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Bets"
          value={data.betting.totalBets}
          icon={TrendingUp}
          subtext={`KES ${(data.betting.totalStaked / 1000).toFixed(1)}K staked`}
        />
        <StatCard
          label="Profit/Loss"
          value={`KES ${(data.betting.profit / 1000).toFixed(1)}K`}
          icon={DollarSign}
          trend={data.betting.profit > 0 ? "up" : "down"}
          subtext={`ROI: ${data.betting.roi}%`}
        />
        <StatCard
          label="Win Rate"
          value={`${data.betting.winRate.toFixed(1)}%`}
          icon={TrendingUp}
          subtext={`Won: ${(data.betting.totalWon / 1000).toFixed(1)}K`}
        />
        <StatCard
          label="Avg Stake"
          value={`KES ${(data.betting.totalStaked / data.betting.totalBets || 0).toFixed(0)}`}
          icon={DollarSign}
          subtext={`Lost: ${(data.betting.totalLost / 1000).toFixed(1)}K`}
        />
      </div>

      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-4 md:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Betting Results Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={betResultsData}>
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
            <Bar dataKey="count" fill="#3b82f6" name="Count" />
            <Bar dataKey="staked" fill="#ef4444" name="Staked (KES 000s)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function RecentBetsTab() {
  const [period] = useState<ReportPeriod>("30d");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUserRecentBets(period, page, 10);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data || !data.bets || data.bets.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p>No bets placed in this period</p>
      </div>
    );
  }

  const bets = data.bets;
  const pagination = data.pagination;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="space-y-2 md:space-y-0 md:table w-full text-sm">
          {bets.map((bet) => (
            <Card
              key={bet.id}
              className="bg-slate-800 border-slate-700 p-4 mb-3 md:mb-0 md:table-row hover:bg-slate-700/50 transition"
            >
              <div className="md:table-cell px-4 py-3 text-sm">
                <p className="font-medium text-white">
                  {bet.event.homeTeam} vs {bet.event.awayTeam}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(bet.event.commenceTime).toLocaleDateString()}
                </p>
              </div>
              <div className="md:table-cell px-4 py-3">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    bet.status === "WON"
                      ? "bg-green-500/20 text-green-400"
                      : bet.status === "LOST"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {bet.status}
                </span>
              </div>
              <div className="md:table-cell px-4 py-3 text-right">
                <p className="font-semibold text-white">
                  {bet.side} @ {bet.displayOdds.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">
                  Stake: KES {bet.stake.toFixed(0)}
                </p>
              </div>
              <div className="md:table-cell px-4 py-3 text-right">
                <p
                  className={`font-semibold ${
                    bet.profit > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {bet.profit > 0 ? "+" : ""}KES {bet.profit.toFixed(0)}
                </p>
                <p className="text-xs text-slate-400">
                  Potential: KES {bet.potentialPayout.toFixed(0)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {pagination.pages > 1 && (
        <Pagination>
          <PaginationContent className="flex flex-wrap gap-1">
            {page > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    setPage(page - 1);
                  }}
                />
              </PaginationItem>
            )}
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
              (p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                      e.preventDefault();
                      setPage(p);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            {page < pagination.pages && (
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    setPage(page + 1);
                  }}
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function FinancialReportTab() {
  const [period] = useState<ReportPeriod>("30d");
  const { data, isLoading } = useUserFinancialSummary(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data)
    return (
      <div className="p-4 text-center text-slate-400">No data available</div>
    );

  const stats = [
    {
      label: "Current Balance",
      value: `KES ${(data.currentBalance / 1000).toFixed(1)}K`,
      icon: DollarSign,
    },
    {
      label: "Total Deposits",
      value: `${data.deposits.count}`,
      subtext: `KES ${(data.deposits.totalAmount / 1000).toFixed(1)}K`,
      icon: TrendingUp,
    },
    {
      label: "Total Withdrawals",
      value: `${data.withdrawals.count}`,
      subtext: `KES ${(data.withdrawals.totalAmount / 1000).toFixed(1)}K`,
      icon: TrendingDown,
    },
    {
      label: "Net Flow",
      value: `KES ${(data.netFlow / 1000).toFixed(1)}K`,
      subtext: "Deposits - Withdrawals",
      icon: DollarSign,
    },
  ];

  const transactionData = [
    {
      type: "Deposits",
      amount: data.deposits.totalAmount / 1000,
      count: data.deposits.count,
    },
    {
      type: "Withdrawals",
      amount: data.withdrawals.totalAmount / 1000,
      count: data.withdrawals.count,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            subtext={stat.subtext}
          />
        ))}
      </div>

      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-4 md:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Financial Flow (KES 000s)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={transactionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="type" tick={{ fill: "#999", fontSize: 12 }} />
            <YAxis tick={{ fill: "#999", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e1e1e",
                border: "1px solid #444",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="amount" fill="#3b82f6" name="Amount (KES 000s)" />
            <Bar dataKey="count" fill="#10b981" name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("30d");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Your Reports
          </h1>
          <p className="text-slate-400">
            Track your betting performance, winnings, and financial activity
          </p>
        </div>

        {/* Period Selector */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-slate-700 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-300">
                Report Period
              </p>
            </div>
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as ReportPeriod)}
            >
              <SelectTrigger className="w-full sm:w-48 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 bg-slate-800 border border-slate-700">
            <TabsTrigger value="personal">Performance</TabsTrigger>
            <TabsTrigger value="bets">Recent Bets</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <PersonalReportTab />
          </TabsContent>

          <TabsContent value="bets">
            <RecentBetsTab />
          </TabsContent>

          <TabsContent value="financial">
            <FinancialReportTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
