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
  const width = 680;
  const height = 180;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxValue = Math.max(...revenueTrend.map((d) => Math.max(d.revenue, d.bets)));
  const xStep = chartWidth / (revenueTrend.length - 1);

  const getRevenuePoint = (index: number, value: number) => ({
    x: padding + index * xStep,
    y: padding + chartHeight - (value / maxValue) * chartHeight,
  });

  const getBetsPoint = (index: number, value: number) => ({
    x: padding + index * xStep,
    y: padding + chartHeight - (value / maxValue) * chartHeight,
  });

  const revenuePath = revenueTrend
    .map((d, i) => {
      const point = getRevenuePoint(i, d.revenue);
      return `${point.x},${point.y}`;
    })
    .join(" L ");

  const betsPath = revenueTrend
    .map((d, i) => {
      const point = getBetsPoint(i, d.bets);
      return `${point.x},${point.y}`;
    })
    .join(" L ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-3 w-full"
      style={{ minHeight: "180px" }}
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={`grid-${ratio}`}
          x1={padding}
          y1={padding + chartHeight * (1 - ratio)}
          x2={width - padding}
          y2={padding + chartHeight * (1 - ratio)}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      ))}

      {/* Revenue line */}
      <polyline
        points={revenuePath}
        fill="none"
        stroke="var(--admin-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bets line */}
      <polyline
        points={betsPath}
        fill="none"
        stroke="var(--admin-accent-dim)"
        strokeWidth="2.5"
        strokeDasharray="5,5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points for Revenue */}
      {revenueTrend.map((d, i) => {
        const point = getRevenuePoint(i, d.revenue);
        return (
          <circle
            key={`revenue-point-${i}`}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill="var(--admin-accent)"
            opacity="0.8"
          />
        );
      })}

      {/* Data points for Bets */}
      {revenueTrend.map((d, i) => {
        const point = getBetsPoint(i, d.bets);
        return (
          <circle
            key={`bets-point-${i}`}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill="var(--admin-accent-dim)"
            opacity="0.8"
          />
        );
      })}

      {/* X axis labels */}
      {revenueTrend.map((d, i) => (
        <text
          key={`label-${i}`}
          x={padding + i * xStep}
          y={height - 10}
          textAnchor="middle"
          className="text-[11px] fill-admin-text-muted"
        >
          {d.day}
        </text>
      ))}

      {/* Y axis */}
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={padding + chartHeight}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />

      {/* X axis */}
      <line
        x1={padding}
        y1={padding + chartHeight}
        x2={width - padding}
        y2={padding + chartHeight}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />
    </svg>
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
