import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

type Props = {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  negative?: boolean;
};

export default function StatCard({
  title,
  value,
  change = 0,
  icon: Icon,
  negative = false,
}: Props) {
  const isPositive = change >= 0;

  return (
    <div className="rounded-xl border border-[#2a3f55] bg-[#1e2d3d] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[#8fa3b1]">{title}</p>
        <Icon
          className={`${negative ? "text-[#ff1744]" : "text-[#f5a623]"}`}
          size={18}
        />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <div className="mt-2 flex items-center gap-1 text-xs">
        {isPositive ? (
          <TrendingUp size={14} className="text-[#00c853]" />
        ) : (
          <TrendingDown size={14} className="text-[#ff1744]" />
        )}
        <span className={isPositive ? "text-[#00c853]" : "text-[#ff1744]"}>
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
