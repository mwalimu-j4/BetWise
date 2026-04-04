import { useEffect, useState } from "react";
import { AlertTriangle, Bolt, DollarSign, Target, TrendingUp, Users } from "lucide-react";
import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";
import { getDashboard } from "@/api/dashboard";

function StatCard({
  title,
  value,
  icon: Icon,
  negative = false,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#2a3f55] bg-[#1e2d3d] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[#8fa3b1]">{title}</p>
        <Icon className={negative ? "text-[#ff1744]" : "text-[#f5a623]"} size={18} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function DashboardModule() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
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

  if (loading) {
    return <div className="p-6 text-[#8fa3b1]">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="p-6 text-[#ff1744]">No dashboard data available.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Revenue" value={`$${Number(data.totalRevenue).toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Active Users" value={String(data.activeUsers)} icon={Users} />
        <StatCard title="Open Bets" value={String(data.openBets)} icon={Target} />
        <StatCard title="House Edge %" value={`${Number(data.houseEdge).toFixed(2)}%`} icon={TrendingUp} />
        <StatCard title="GGR Today" value={`$${Number(data.ggrToday).toLocaleString()}`} icon={Bolt} />
        <StatCard title="Flagged Bets" value={String(data.flaggedBets)} icon={AlertTriangle} negative />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="rounded-xl border border-[#2a3f55] bg-[#1e2d3d] p-4 xl:col-span-3">
          <h2 className="mb-4 text-lg font-semibold text-white">Profit & Loss (7 days)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.profitLoss ?? []}>
                <XAxis dataKey="date" stroke="#8fa3b1" />
                <YAxis stroke="#8fa3b1" />
                <Tooltip />
                <Line type="monotone" dataKey="profit" stroke="#00c853" strokeWidth={2} />
                <Line type="monotone" dataKey="loss" stroke="#f5a623" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[#2a3f55] bg-[#1e2d3d] p-4 xl:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-white">Sport Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.sportDistribution ?? []} dataKey="percentage" nameKey="sport_key" cx="50%" cy="50%" outerRadius={105}>
                  {(data.sportDistribution ?? []).map((_: any, index: number) => (
                    <Cell key={index} fill={["#f5a623", "#00c853", "#3b82f6", "#ff1744", "#8b5cf6"][index % 5]} />
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
