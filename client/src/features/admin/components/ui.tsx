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
  Line,
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
  "w-full border-separate border-spacing-0 text-[10px] sm:text-xs lg:text-sm";
export const adminTableHeadCellClassName =
  "border-b border-admin-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-2 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted break-words sm:px-3 sm:py-2.5 sm:text-[10px] lg:px-4 lg:py-3 lg:text-[11px]";
export const adminTableCellClassName =
  "border-b border-admin-border/65 px-2 py-2.5 align-top text-[10px] text-admin-text-secondary break-words sm:px-3 sm:py-3 sm:text-xs lg:px-4 lg:py-3.5 lg:text-sm";
export const adminCompactActionsClassName = "flex flex-wrap items-center gap-1";
export const adminFilterRowClassName = "flex flex-wrap gap-3";
export const adminDialogContentClassName =
  "overflow-hidden rounded-[1.35rem] border border-[rgba(245,197,24,0.16)] bg-[linear-gradient(180deg,#244a8e_0%,#1f4380_50%,#1a3a70_100%)] text-admin-text-primary shadow-[0_20px_60px_rgba(13,33,55,0.35),0_0px_1px_rgba(245,197,24,0.1)] backdrop-blur-md max-h-[85vh] overflow-y-auto";
export const adminInputClassName =
  "h-10 rounded-xl border border-admin-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] px-3 text-admin-text-primary placeholder:text-admin-text-muted focus-visible:border-admin-border-strong focus-visible:ring-[3px] focus-visible:ring-admin-accent/15";
export const adminSelectTriggerClassName =
  "h-10 w-full rounded-xl border-admin-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] px-3 text-admin-text-primary shadow-none data-[placeholder]:text-admin-text-muted focus-visible:border-admin-border-strong focus-visible:ring-[3px] focus-visible:ring-admin-accent/15";
export const adminSelectContentClassName =
  "rounded-xl border-admin-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)_62%)] bg-admin-card text-admin-text-primary shadow-[0_12px_28px_rgba(2,8,23,0.24)]";
export const adminDropdownContentClassName =
  "rounded-xl border-admin-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)_62%)] bg-admin-card p-1.5 text-admin-text-primary shadow-[0_12px_28px_rgba(2,8,23,0.24)]";
export const adminDropdownItemClassName =
  "rounded-lg px-3 py-2 text-sm text-admin-text-secondary focus:bg-admin-accent/12 focus:text-admin-text-primary";

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
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative rounded-2xl border border-admin-border bg-admin-card p-3 text-admin-text-primary shadow-[0_8px_22px_rgba(2,8,23,0.18)] sm:p-4 lg:p-5",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_120px)]",
        interactive &&
          "transition duration-200 hover:border-admin-border-strong",
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
  className,
}: {
  label: string;
  value: string;
  tone: AdminTone;
  helper?: string;
  className?: string;
}) {
  return (
    <AdminCard
      className={cn("border p-2.5 sm:p-3", toneBorderClasses[tone], className)}
      interactive
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute right-3 top-3 h-5 w-5 rounded-[4px] opacity-75",
          toneSoftClasses[tone],
        )}
      />
      <div className="space-y-2">
        <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted sm:text-[9px]">
          {label}
        </p>
        <p
          className={cn(
            "text-base font-bold sm:text-lg",
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
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold tracking-[0.03em]",
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
        "w-full overflow-x-auto overscroll-x-contain rounded-xl border border-admin-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015)_58%)] bg-admin-surface/35 [scrollbar-width:thin]",
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
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis
          dataKey="day"
          stroke="rgba(168,196,224,0.7)"
          style={{ fontSize: "12px" }}
        />
        <YAxis stroke="rgba(168,196,224,0.7)" style={{ fontSize: "12px" }} />
        <Tooltip
          contentStyle={{
            background:
              "linear-gradient(180deg, rgba(20,35,58,0.97), rgba(13,26,44,0.94))",
            border: "1px solid rgba(245,197,24,0.18)",
            borderRadius: "14px",
            boxShadow: "0 22px 50px rgba(0,0,0,0.35)",
          }}
          labelStyle={{ color: "#ffffff" }}
          itemStyle={{ color: "#a8c4e0" }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="stake"
          stroke="#f5c518"
          strokeWidth={2}
          dot={false}
          name="Stake (KES)"
        />
        <Line
          type="monotone"
          dataKey="ggr"
          stroke="#a8c4e0"
          strokeWidth={2}
          dot={false}
          name="GGR (KES)"
        />
        <Line
          type="monotone"
          dataKey="ngr"
          stroke="#00c97a"
          strokeWidth={2}
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
}: {
  data: any[];
  compact?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={compact ? 230 : 320}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, left: -24, bottom: 2 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="period"
          stroke="rgba(168,196,224,0.62)"
          style={{ fontSize: "11px" }}
        />
        <YAxis
          stroke="rgba(168,196,224,0.62)"
          style={{ fontSize: "11px" }}
          tickFormatter={(value) => formatLargeNumber(value)}
        />
        <Tooltip
          contentStyle={{
            background:
              "linear-gradient(180deg, rgba(20,35,58,0.97), rgba(13,26,44,0.94))",
            border: "1px solid rgba(245,197,24,0.18)",
            borderRadius: "14px",
            boxShadow: "0 20px 48px rgba(0,0,0,0.4)",
          }}
          labelStyle={{ color: "#ffffff", fontSize: "11px" }}
          cursor={{ fill: "rgba(255,255,255,0.05)" }}
        />
        <Legend
          iconSize={8}
          wrapperStyle={{ fontSize: "11px", paddingTop: 8 }}
        />
        <Line
          type="monotone"
          dataKey="deposits"
          stroke="#f5c518"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
          name="Deposits"
        />
        <Line
          type="monotone"
          dataKey="withdrawals"
          stroke="#a8c4e0"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
          name="Withdrawals"
        />
      </LineChart>
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
