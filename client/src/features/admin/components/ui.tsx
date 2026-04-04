import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle,
  Clock,
  Flag,
  Flame,
  Lock,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  revenueTrend,
  sportDistribution,
  type AdminBadgeStatus,
  type AdminTone,
} from "../data/mock-data";
import {
  LineChart,
  Line,
  BarChart,
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

const statusConfig: Record<
  AdminBadgeStatus,
  { tone: AdminTone; icon: LucideIcon }
> = {
  pending: { tone: "gold", icon: Clock },
  won: { tone: "accent", icon: CheckCircle },
  lost: { tone: "red", icon: XCircle },
  flagged: { tone: "red", icon: Flag },
  completed: { tone: "accent", icon: CheckCircle },
  active: { tone: "accent", icon: CheckCircle },
  suspended: { tone: "red", icon: Lock },
  live: { tone: "live", icon: Flame },
  upcoming: { tone: "blue", icon: Clock },
  verified: { tone: "accent", icon: UserCheck },
  failed: { tone: "red", icon: UserX },
  high: { tone: "red", icon: AlertTriangle },
  medium: { tone: "gold", icon: AlertTriangle },
  low: { tone: "blue", icon: CheckCircle },
};

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: AdminTone;
  variant?: "solid" | "ghost";
  size?: "md" | "sm";
  className?: string;
}

export const adminTableClassName = "min-w-[760px] w-full border-collapse";
export const adminTableHeadCellClassName =
  "border-b border-admin-border px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted";
export const adminTableCellClassName =
  "border-b border-admin-border px-3 py-2.5 text-sm text-admin-text-secondary";
export const adminCompactActionsClassName = "flex flex-wrap items-center gap-1";
export const adminFilterRowClassName = "flex flex-wrap gap-3";

export function adminToneTextClass(tone: AdminTone) {
  return toneTextClasses[tone];
}

export function AdminCard({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative rounded-2xl border border-admin-border bg-admin-card p-5 text-admin-text-primary shadow-[0_12px_40px_var(--color-bg-deepest)]",
        "bg-[linear-gradient(180deg,var(--color-bg-hover),transparent_120px)]",
        interactive &&
          "transition duration-200 hover:-translate-y-0.5 hover:border-admin-border-strong",
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
        "inline-flex items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "md" ? "h-9 px-3.5" : "h-8 px-2.5 text-[11px]",
        variant === "solid"
          ? cn(solidToneClasses[tone], "border-transparent hover:opacity-95")
          : "border-admin-border bg-transparent text-admin-text-secondary hover:bg-[var(--color-bg-hover)] hover:text-admin-text-primary",
        className,
      )}
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-admin-text-primary">{title}</h1>
        <p className="mt-1 text-sm text-admin-text-muted">{subtitle}</p>
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
        <p className="text-base font-semibold text-admin-text-primary">
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
    <AdminCard className="text-center">
      <p className={cn("text-[1.45rem] font-bold", toneTextClasses[tone])}>
        {value}
      </p>
      <p className="mt-1 text-xs text-admin-text-muted">{label}</p>
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
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold tracking-[0.03em]",
        toneSoftClasses[tone],
      )}
    >
      {label}
    </span>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function MiniChart() {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart
        data={revenueTrend}
        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis
          dataKey="day"
          stroke="rgba(255,255,255,0.5)"
          style={{ fontSize: "12px" }}
        />
        <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: "12px" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(10,14,26,0.95)",
            border: "1px solid rgba(0,229,160,0.2)",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#00e5a0" }}
          itemStyle={{ color: "#00e5a0" }}
        />
        <Line
          type="monotone"
          dataKey="profit"
          stroke="#00e5a0"
          strokeWidth={3}
          dot={{ fill: "#00e5a0", r: 5 }}
          activeDot={{ r: 6 }}
          name="Profit"
        />
        <Line
          type="monotone"
          dataKey="loss"
          stroke="#ff9800"
          strokeWidth={3}
          strokeDasharray="8 4"
          dot={{ fill: "#ff9800", r: 5 }}
          activeDot={{ r: 6 }}
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
      <svg className="h-[90px] w-[90px]" viewBox="0 0 90 90">
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
