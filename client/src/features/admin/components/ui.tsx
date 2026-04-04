import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
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
import { cn } from "@/lib/utils";
import {
  revenueTrend,
  sportDistribution,
  type AdminBadgeStatus,
  type AdminTone,
} from "../data/mock-data";

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
          : "border-admin-border bg-transparent text-admin-text-secondary hover:text-admin-text-primary",
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
  const values = revenueTrend.flatMap((item) => [item.profit, item.loss]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const xStep = 100 / Math.max(revenueTrend.length - 1, 1);

  const buildPath = (key: "profit" | "loss") =>
    revenueTrend
      .map((item, index) => {
        const x = index * xStep;
        const normalized = ((item[key] - min) / range) * 100;
        const y = 100 - normalized;
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

  return (
    <div className="space-y-3">
      <div className="relative h-[250px] w-full rounded-xl border border-admin-border bg-admin-surface/30 p-2">
        <svg
          className="h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d={buildPath("profit")}
            fill="none"
            stroke="#00e5a0"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={buildPath("loss")}
            fill="none"
            stroke="#ff9800"
            strokeWidth="1.6"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-admin-text-muted">
        {revenueTrend.map((item) => (
          <span
            key={item.day}
            className="rounded bg-admin-surface/50 px-2 py-1"
          >
            {item.day}
          </span>
        ))}
      </div>
    </div>
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
  const values = data.flatMap((item) => [item.stake, item.ggr, item.ngr]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const xStep = 100 / Math.max(data.length - 1, 1);

  const buildPath = (key: "stake" | "ggr" | "ngr") =>
    data
      .map((item, index) => {
        const x = index * xStep;
        const normalized = ((item[key] - min) / range) * 100;
        const y = 100 - normalized;
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

  return (
    <div className="space-y-3">
      <div className="relative h-[300px] w-full rounded-xl border border-admin-border bg-admin-surface/30 p-2">
        <svg
          className="h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d={buildPath("stake")}
            fill="none"
            stroke="#00e5a0"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={buildPath("ggr")}
            fill="none"
            stroke="#ff9800"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={buildPath("ngr")}
            fill="none"
            stroke="#5e5ce6"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-admin-text-secondary">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-admin-accent" />
          Stake
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-admin-gold" />
          GGR
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-admin-purple" />
          NGR
        </span>
      </div>
    </div>
  );
}

export function DepositWithdrawalChart({ data }: { data: any[] }) {
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.deposits, item.withdrawals]),
    1,
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {data.map((item: any) => (
          <div
            key={item.period}
            className="space-y-1 rounded-lg border border-admin-border bg-admin-surface/30 p-2.5"
          >
            <div className="text-xs text-admin-text-muted">{item.period}</div>
            <div className="h-2 overflow-hidden rounded bg-admin-surface">
              <div
                className="h-full bg-admin-accent"
                style={{
                  width: `${Math.max((item.deposits / maxValue) * 100, 2)}%`,
                }}
              />
            </div>
            <div className="h-2 overflow-hidden rounded bg-admin-surface">
              <div
                className="h-full bg-admin-gold"
                style={{
                  width: `${Math.max((item.withdrawals / maxValue) * 100, 2)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-admin-text-secondary">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-admin-accent" />
          Deposits
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-admin-gold" />
          Withdrawals
        </span>
      </div>
    </div>
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
