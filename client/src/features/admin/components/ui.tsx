import type {
  ButtonHTMLAttributes,
  ComponentProps,
  CSSProperties,
  ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Flag,
  Flame,
  Lock,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { cn, formatLargeNumber } from "@/lib/utils";
import { DialogContent as BaseDialogContent } from "@/components/ui/dialog";
import {
  revenueTrend,
  sportDistribution,
  type AdminBadgeStatus,
  type AdminTone,
} from "../data/mock-data";
import {
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const toneToColor = (tone: AdminTone) => `var(--admin-${tone})`;

const toneTextClasses: Record<AdminTone, string> = {
  accent: "text-admin-accent",
  blue: "text-admin-blue",
  gold: "text-admin-gold",
  red: "text-admin-red",
  purple: "text-admin-purple",
  muted: "text-admin-text-muted",
  live: "text-admin-live",
};

const toneSoftClasses: Record<AdminTone, string> = {
  accent: "bg-admin-accent-dim text-admin-accent",
  blue: "bg-admin-blue-dim text-admin-blue",
  gold: "bg-admin-gold-dim text-admin-gold",
  red: "bg-admin-red-dim text-admin-red",
  purple: "bg-admin-purple-dim text-admin-purple",
  muted: "bg-admin-surface/45 text-admin-text-muted",
  live: "bg-admin-live-dim text-admin-live",
};

const toneGlowClasses: Record<AdminTone, string> = {
  accent:
    "bg-[radial-gradient(circle_at_80%_20%,var(--admin-accent-dim),transparent_70%)]",
  blue: "bg-[radial-gradient(circle_at_80%_20%,var(--admin-blue-dim),transparent_70%)]",
  gold: "bg-[radial-gradient(circle_at_80%_20%,var(--admin-gold-dim),transparent_70%)]",
  red: "bg-[radial-gradient(circle_at_80%_20%,var(--admin-red-dim),transparent_70%)]",
  purple:
    "bg-[radial-gradient(circle_at_80%_20%,var(--admin-purple-dim),transparent_70%)]",
  muted:
    "bg-[radial-gradient(circle_at_80%_20%,var(--color-bg-hover),transparent_70%)]",
  live: "bg-[radial-gradient(circle_at_80%_20%,var(--admin-live-dim),transparent_70%)]",
};

const solidToneClasses: Record<AdminTone, string> = {
  accent: "bg-admin-accent text-black",
  blue: "bg-admin-blue text-black",
  gold: "bg-admin-gold text-black",
  red: "bg-admin-red text-black",
  purple: "bg-admin-purple text-black",
  muted: "bg-admin-text-muted text-black",
  live: "bg-admin-live text-black",
};

const toneBorderClasses: Record<AdminTone, string> = {
  accent: "border-admin-accent/25",
  blue: "border-admin-blue/25",
  gold: "border-admin-gold/25",
  red: "border-admin-red/25",
  purple: "border-admin-purple/25",
  muted: "border-admin-border/80",
  live: "border-admin-live/25",
};

const statusConfig: Record<
  AdminBadgeStatus,
  { tone: AdminTone; icon: LucideIcon }
> = {
  pending: { tone: "gold", icon: Clock },
  processing: { tone: "blue", icon: Clock },
  won: { tone: "accent", icon: CheckCircle },
  lost: { tone: "red", icon: XCircle },
  flagged: { tone: "red", icon: Flag },
  completed: { tone: "accent", icon: CheckCircle },
  active: { tone: "accent", icon: CheckCircle },
  suspended: { tone: "red", icon: Lock },
  banned: { tone: "red", icon: Flag },
  live: { tone: "live", icon: Flame },
  upcoming: { tone: "blue", icon: Clock },
  verified: { tone: "accent", icon: UserCheck },
  failed: { tone: "red", icon: UserX },
  high: { tone: "red", icon: AlertTriangle },
  medium: { tone: "gold", icon: AlertTriangle },
  low: { tone: "blue", icon: CheckCircle },
  // Contact message statuses
  submitted: { tone: "gold", icon: Clock },
  read: { tone: "blue", icon: CheckCircle },
  resolved: { tone: "red", icon: CheckCircle },
  // Transaction reversion status
  reversed: { tone: "red", icon: ArrowUpRight },
};

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: AdminTone;
  variant?: "solid" | "ghost";
  size?: "md" | "sm";
  className?: string;
}

export const adminTableClassName =
  "w-full border-separate border-spacing-0";
export const adminTableHeadCellClassName =
  "border-b border-white/5 bg-black/40 px-3 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-admin-text-muted/60";
export const adminTableCellClassName =
  "border-b border-white/5 px-3 py-4 text-sm text-admin-text-secondary";
export const adminCompactActionsClassName = "flex flex-wrap items-center gap-1";
export const adminFilterRowClassName = "flex flex-wrap gap-3";
export const adminDialogContentClassName =
  "overflow-hidden rounded-2xl border border-admin-border/50 bg-[#0b1426]/90 text-admin-text-primary shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300";
export const adminInputClassName =
  "h-12 rounded-xl border border-white/5 bg-black/20 px-4 text-admin-text-primary placeholder:text-admin-text-muted/60 transition-all focus-visible:border-admin-accent/40 focus-visible:bg-black/40 focus-visible:ring-4 focus-visible:ring-admin-accent/5";
export const adminSelectTriggerClassName =
  "h-12 w-full rounded-xl border border-white/5 bg-black/20 px-4 text-admin-text-primary shadow-none data-[placeholder]:text-admin-text-muted/60 focus-visible:border-admin-accent/40 focus-visible:bg-black/40 focus-visible:ring-4 focus-visible:ring-admin-accent/5";
export const adminSelectContentClassName =
  "rounded-xl border border-admin-border/50 bg-[#0b1426]/95 text-admin-text-primary shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl";
export const adminDropdownContentClassName =
  "rounded-xl border border-admin-border/50 bg-[#0b1426]/95 p-1.5 text-admin-text-primary shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl";
export const adminDropdownItemClassName =
  "rounded-lg px-4 py-2.5 text-sm text-admin-text-secondary transition-all focus:bg-white/5 focus:text-admin-text-primary";

export function AdminDialogContent({
  className,
  ...props
}: ComponentProps<typeof BaseDialogContent>) {
  return (
    <BaseDialogContent
      className={cn(adminDialogContentClassName, className)}
      {...props}
    />
  );
}

export function truncateEmailForTable(email: string, visibleChars = 8) {
  if (!email) return "-";

  return email.length <= visibleChars
    ? email
    : `${email.slice(0, visibleChars)}...`;
}

export function adminToneTextClass(tone: AdminTone) {
  return toneTextClasses[tone];
}

export function AdminCard({
  children,
  className,
  interactive = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  return (
    <section
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border border-admin-border/50 bg-[#0b1426]/60 p-5 text-admin-text-primary shadow-[0_12px_40px_-15px_rgba(0,0,0,0.35)] backdrop-blur-xl",
        interactive &&
          "transition duration-400 hover:border-admin-accent/30 hover:bg-[#0b1426]/80 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AdminButton({
  tone = "accent",
  variant = "solid",
  size = "md",
  className,
  type = "button",
  ...props
}: AdminButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition duration-200",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "md" ? "h-9 px-3.5" : "h-8 px-2.5 text-[11px]",
        variant === "solid"
          ? cn(
              solidToneClasses[tone],
              "border-transparent shadow-[0_6px_16px_rgba(0,0,0,0.1)] hover:opacity-95",
            )
          : "border-admin-border/70 bg-admin-surface/45 text-admin-text-secondary hover:border-admin-border-strong hover:bg-admin-hover hover:text-admin-text-primary",
        className,
      )}
      style={
        variant === "ghost"
          ? ({
              backgroundColor: "transparent",
            } as CSSProperties)
          : undefined
      }
      type={type}
    />
  );
}

export function AdminSectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-[-0.02em] text-admin-text-primary sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-xs text-admin-text-muted sm:text-sm">
          {subtitle}
        </p>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}

export function AdminCardHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-base font-semibold tracking-[-0.02em] text-admin-text-primary">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-1 text-xs text-admin-text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  change,
  up,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  up: boolean;
  tone: AdminTone;
  icon: LucideIcon;
}) {
  return (
    <AdminCard className="overflow-hidden" interactive>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-tr-2xl",
          toneGlowClasses[tone],
        )}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
            {label}
          </p>
          <p className="mt-1.5 text-[1.65rem] font-bold text-admin-text-primary">
            {value}
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold",
              up ? "text-admin-accent" : "text-admin-red",
            )}
          >
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {change}
          </span>
        </div>
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            toneSoftClasses[tone],
          )}
        >
          <Icon size={18} />
        </div>
      </div>
    </AdminCard>
  );
}

export function AdminStatCard({
  label,
  value,
  tone,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  tone: AdminTone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <AdminCard
      className={cn("border p-5 group", toneBorderClasses[tone], className)}
      interactive
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute right-4 top-4 h-8 w-8 rounded-xl opacity-40 transition-all duration-500 group-hover:scale-110 group-hover:opacity-80 grid place-items-center",
          toneSoftClasses[tone],
        )}
      >
        {Icon && <Icon size={16} />}
      </div>
      <div className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-text-muted/60">
          {label}
        </p>
        <p
          className={cn(
            "text-xl font-bold tracking-tight sm:text-2xl",
            toneTextClasses[tone],
          )}
        >
          {value}
        </p>
      </div>
    </AdminCard>
  );
}

export function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: AdminTone;
}) {
  return (
    <AdminCard className="p-3 text-center sm:p-4">
      <p
        className={cn(
          "text-[1.1rem] font-bold leading-tight sm:text-[1.35rem]",
          toneTextClasses[tone],
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] text-admin-text-muted sm:text-xs">
        {label}
      </p>
    </AdminCard>
  );
}

export function StatusBadge({ status }: { status: AdminBadgeStatus }) {
  const { tone, icon: Icon } = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold capitalize tracking-[0.03em]",
        toneSoftClasses[tone],
      )}
    >
      <Icon size={10} />
      {status}
    </span>
  );
}

export function InlinePill({
  label,
  tone,
}: {
  label: string;
  tone: AdminTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-xs font-bold tracking-[0.03em]",
        toneSoftClasses[tone],
      )}
    >
      {label}
    </span>
  );
}

export function TableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-admin-border/40 bg-[#0b1426]/40 p-1 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.3)] backdrop-blur-md [scrollbar-width:thin]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MiniChart() {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart
        data={revenueTrend}
        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="day"
          stroke="rgba(255,255,255,0.35)"
          style={{ fontSize: "11px", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis stroke="rgba(255,255,255,0.35)" style={{ fontSize: "11px", fontWeight: 500 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(11,20,38,0.95)",
            border: "1px solid rgba(245,197,24,0.15)",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
          }}
          labelStyle={{ color: "#ffffff", fontWeight: 700, marginBottom: "4px" }}
        />
        <Line
          type="monotone"
          dataKey="profit"
          stroke="#00c97a"
          strokeWidth={3}
          dot={{ fill: "#00c97a", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
          name="Profit"
        />
        <Line
          type="monotone"
          dataKey="loss"
          stroke="#ff3b30"
          strokeWidth={3}
          strokeDasharray="8 4"
          dot={{ fill: "#ff3b30", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
          name="Loss"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DonutChart() {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const { segments } = sportDistribution.reduce<{
    cumulative: number;
    segments: Array<
      (typeof sportDistribution)[number] & { dash: number; offset: number }
    >;
  }>(
    (accumulator, segment) => {
      const dash = (segment.percentage / 100) * circumference;
      const offset =
        circumference - (accumulator.cumulative * circumference) / 100;

      return {
        cumulative: accumulator.cumulative + segment.percentage,
        segments: [...accumulator.segments, { ...segment, dash, offset }],
      };
    },
    { cumulative: 0, segments: [] },
  );

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <svg style={{ height: 90, width: 90 }} viewBox="0 0 90 90">
        <circle
          cx={45}
          cy={45}
          r={radius}
          fill="none"
          stroke="var(--admin-surface)"
          strokeWidth={14}
        />
        {segments.map((segment) => (
          <circle
            key={segment.sport}
            cx={45}
            cy={45}
            r={radius}
            fill="none"
            stroke={toneToColor(segment.tone)}
            strokeDasharray={`${segment.dash} ${circumference}`}
            strokeDashoffset={segment.offset}
            strokeWidth={14}
            style={
              {
                transform: "rotate(-90deg)",
                transformOrigin: "center",
              } as CSSProperties
            }
          />
        ))}
        <text
          x={45}
          y={49}
          className="fill-admin-text-primary text-[11px] font-semibold"
          textAnchor="middle"
        >
          Bets
        </text>
      </svg>

      <div className="flex flex-1 flex-col gap-2">
        {sportDistribution.map((segment) => (
          <div className="flex items-center gap-2" key={segment.sport}>
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: toneToColor(segment.tone) }}
            />
            <span className="text-sm text-admin-text-secondary">
              {segment.sport}
            </span>
            <span className="ml-auto font-semibold text-admin-text-primary">
              {segment.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinancialTrendChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="day"
          stroke="rgba(255,255,255,0.35)"
          style={{ fontSize: "11px", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis stroke="rgba(255,255,255,0.35)" style={{ fontSize: "11px", fontWeight: 500 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "rgba(11,20,38,0.95)",
            border: "1px solid rgba(245,197,24,0.15)",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
          }}
          labelStyle={{ color: "#ffffff", fontWeight: 700, marginBottom: "4px" }}
          itemStyle={{ color: "rgba(255,255,255,0.8)" }}
        />
        <Legend iconType="circle" wrapperStyle={{ paddingTop: "12px", fontSize: "11px", fontWeight: 600 }} />
        <Line
          type="monotone"
          dataKey="stake"
          stroke="#f5c518"
          strokeWidth={3}
          dot={false}
          name="Stake (KES)"
        />
        <Line
          type="monotone"
          dataKey="ggr"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={false}
          name="GGR (KES)"
        />
        <Line
          type="monotone"
          dataKey="ngr"
          stroke="#00c97a"
          strokeWidth={3}
          dot={false}
          name="NGR (KES)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DepositWithdrawalChart({
  data,
  compact = false,
  period = "1w",
}: {
  data: any[];
  compact?: boolean;
  period?: "1w" | "1m" | "6m";
}) {
  // Calculate interval to avoid X-axis clutter based on period
  const getXAxisInterval = (periodType: string, dataLength: number) => {
    if (periodType === "1w") return 0; // Show all daily labels
    if (periodType === "1m") {
      // Show every ~3-4 days for 30-day period
      return Math.max(0, Math.ceil(dataLength / 7) - 1);
    }
    // For 6m, show every ~20 days
    return Math.max(0, Math.ceil(dataLength / 9) - 1);
  };

  const xAxisInterval = getXAxisInterval(period, data.length);

  return (
    <ResponsiveContainer width="100%" height={compact ? 230 : 320}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, left: -24, bottom: 2 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="period"
          stroke="rgba(255,255,255,0.35)"
          style={{ fontSize: "10px", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          interval={xAxisInterval}
        />
        <YAxis
          stroke="rgba(255,255,255,0.35)"
          style={{ fontSize: "10px", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => formatLargeNumber(value)}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(11,20,38,0.95)",
            border: "1px solid rgba(245,197,24,0.15)",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
          }}
          labelStyle={{ color: "#ffffff", fontWeight: 700, marginBottom: "4px" }}
          cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: "10px", fontWeight: 600, paddingTop: 12 }}
        />
        <Line
          type="monotone"
          dataKey="deposits"
          stroke="#00c97a"
          strokeWidth={3}
          dot={{ fill: "#00c97a", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          name="Deposits"
        />
        <Line
          type="monotone"
          dataKey="withdrawals"
          stroke="#f5c518"
          strokeWidth={3}
          dot={{ fill: "#f5c518", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          name="Withdrawals"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function UserRegistrationChart({
  data,
  compact = false,
  period = "1w",
}: {
  data: any[];
  compact?: boolean;
  period?: "1w" | "1m" | "6m";
}) {
  // Calculate interval to avoid X-axis clutter based on period
  const getXAxisInterval = (periodType: string, dataLength: number) => {
    if (periodType === "1w") return 0; // Show all daily labels
    if (periodType === "1m") {
      // Show every ~3-4 days for 30-day period
      return Math.max(0, Math.ceil(dataLength / 7) - 1);
    }
    // For 6m, show every ~20 days
    return Math.max(0, Math.ceil(dataLength / 9) - 1);
  };

  const xAxisInterval = getXAxisInterval(period, data.length);

  return (
    <ResponsiveContainer width="100%" height={compact ? 230 : 320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 2 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="period"
          stroke="rgba(255,255,255,0.35)"
          style={{ fontSize: "10px", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          interval={xAxisInterval}
        />
        <YAxis
          stroke="rgba(255,255,255,0.35)"
          style={{ fontSize: "10px", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => formatLargeNumber(value)}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(11,20,38,0.95)",
            border: "1px solid rgba(59,130,246,0.15)",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
          }}
          labelStyle={{ color: "#ffffff", fontWeight: 700, marginBottom: "4px" }}
          cursor={{ fill: "rgba(255,255,255,0.05)" }}
        />
        <Bar
          dataKey="registrations"
          fill="#3b82f6"
          radius={[6, 6, 0, 0]}
          fillOpacity={0.8}
          activeBar={{ fillOpacity: 1, stroke: "#3b82f6", strokeWidth: 1 }}
          maxBarSize={16}
          isAnimationActive={true}
          animationDuration={800}
          name="New Users"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AnalyticsTable({
  data,
  columns,
}: {
  data: any[];
  columns: { label: string; key: string; format?: (value: any) => string }[];
}) {
  return (
    <TableShell>
      <table className={adminTableClassName}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th className={adminTableHeadCellClassName} key={col.key}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td className={adminTableCellClassName} key={col.key}>
                  {col.format ? col.format(row[col.key]) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

export function GeoLocationCard({
  country,
  region,
  users,
  bets,
  revenue,
  percentage,
  tone,
}: {
  country: string;
  region: string;
  users: number;
  bets: number;
  revenue: string;
  percentage: number;
  tone: AdminTone;
}) {
  return (
    <AdminCard className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-admin-text-primary">{country}</p>
          <p className="text-xs text-admin-text-muted">{region}</p>
        </div>
        <div
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-bold",
            toneSoftClasses[tone],
          )}
        >
          {percentage.toFixed(1)}%
        </div>
      </div>
      <div className="space-y-2 border-t border-admin-border pt-3 text-sm">
        <div className="flex justify-between text-admin-text-secondary">
          <span>Users</span>
          <span className="font-semibold text-admin-text-primary">
            {users.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-admin-text-secondary">
          <span>Bets</span>
          <span className="font-semibold text-admin-text-primary">
            {bets.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-admin-text-secondary">
          <span>Revenue</span>
          <span className={cn("font-semibold", toneTextClasses[tone])}>
            {revenue}
          </span>
        </div>
      </div>
    </AdminCard>
  );
}

export function DeviceCard({
  device,
  users,
  percentage,
  sessions,
  avgSessionDuration,
  tone,
}: {
  device: string;
  users: number;
  percentage: number;
  sessions: number;
  avgSessionDuration: string;
  tone: AdminTone;
}) {
  return (
    <AdminCard className="space-y-3">
      <div className="flex items-start justify-between">
        <p className="font-semibold text-admin-text-primary">{device}</p>
        <div
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-bold",
            toneSoftClasses[tone],
          )}
        >
          {percentage.toFixed(1)}%
        </div>
      </div>
      <div className="space-y-2 border-t border-admin-border pt-3 text-sm">
        <div className="flex justify-between text-admin-text-secondary">
          <span>Users</span>
          <span className="font-semibold text-admin-text-primary">
            {users.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-admin-text-secondary">
          <span>Sessions</span>
          <span className="font-semibold text-admin-text-primary">
            {sessions.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-admin-text-secondary">
          <span>Avg Duration</span>
          <span className={cn("font-semibold", toneTextClasses[tone])}>
            {avgSessionDuration}
          </span>
        </div>
      </div>
    </AdminCard>
  );
}
