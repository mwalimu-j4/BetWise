import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bolt,
  DollarSign,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import toast from "react-hot-toast";
import { getDashboard } from "../api/dashboard";
import StatCard from "../components/StatCard";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await getDashboard();
        setData(response);
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return <div className="p-6 text-[#8fa3b1]">Loading dashboard...</div>;
  if (!data) return <div className="p-6 text-[#ff1744]">No dashboard data</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Revenue"
          value={`$${Number(data.totalRevenue).toLocaleString()}`}
          icon={DollarSign}
          change={4.2}
        />
        <StatCard
          title="Active Users"
          value={String(data.activeUsers)}
          icon={Users}
          change={2.1}
        />
        <StatCard
          title="Open Bets"
          value={String(data.openBets)}
          icon={Target}
          change={-1.3}
        />
        <StatCard
          title="House Edge %"
          value={`${Number(data.houseEdge).toFixed(2)}%`}
          icon={TrendingUp}
          change={0.8}
        />
        <StatCard
          title="GGR Today"
          value={`$${Number(data.ggrToday).toLocaleString()}`}
          icon={Bolt}
          change={3.4}
        />
        <StatCard
          title="Flagged Bets"
          value={String(data.flaggedBets)}
          icon={AlertTriangle}
          change={data.flaggedBets > 0 ? -5 : 0}
          negative
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="rounded-xl border border-[#2a3f55] bg-[#1e2d3d] p-4 xl:col-span-3">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Profit & Loss
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.profitLoss}>
                <XAxis dataKey="date" stroke="#8fa3b1" />
                <YAxis stroke="#8fa3b1" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#00c853"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="loss"
                  stroke="#f5a623"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[#2a3f55] bg-[#1e2d3d] p-4 xl:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Sport Distribution
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.sportDistribution}
                  dataKey="percentage"
                  nameKey="sport_key"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                >
                  {data.sportDistribution.map((_: any, index: number) => (
                    <Cell
                      key={index}
                      fill={
                        ["#f5a623", "#00c853", "#3b82f6", "#ff1744"][index % 4]
                      }
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
