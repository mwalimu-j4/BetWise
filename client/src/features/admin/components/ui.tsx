import type {
  ButtonHTMLAttributes,
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
import {
  revenueTrend,
  sportDistribution,
  type AdminBadgeStatus,
  type AdminTone,
} from "../data/mock-data";

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const toneToColor = (tone: AdminTone) => `var(--admin-${tone})`;

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

interface AdminButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: AdminTone;
  variant?: "solid" | "ghost";
  size?: "md" | "sm";
  className?: string;
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
      className={joinClasses(
        "admin-card",
        interactive && "admin-card--interactive",
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
      className={joinClasses(
        "admin-button",
        `admin-button--${variant}`,
        `admin-button--${size}`,
        className,
      )}
      data-tone={tone}
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
    <div className="admin-section-header">
      <div>
        <h1 className="admin-page-title">{title}</h1>
        <p className="admin-page-subtitle">{subtitle}</p>
      </div>
      {actions ? <div className="admin-inline-group">{actions}</div> : null}
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
    <div className="admin-card-heading">
      <div>
        <p className="admin-card-title">{title}</p>
        {subtitle ? <p className="admin-card-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="admin-inline-group">{actions}</div> : null}
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
    <AdminCard className="admin-card--metric" interactive>
      <div className="admin-card__glow" data-tone={tone} />
      <div className="admin-metric-card">
        <div>
          <p className="admin-kpi-label">{label}</p>
          <p className="admin-kpi-value">{value}</p>
          <span className="admin-change" data-direction={up ? "up" : "down"}>
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {change}
          </span>
        </div>
        <div className="admin-card__icon" data-tone={tone}>
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
    <AdminCard className="admin-summary-card">
      <p className="admin-summary-card__value" data-tone={tone}>
        {value}
      </p>
      <p className="admin-summary-card__label">{label}</p>
    </AdminCard>
  );
}

export function StatusBadge({ status }: { status: AdminBadgeStatus }) {
  const { tone, icon: Icon } = statusConfig[status];

  return (
    <span className="admin-status-badge" data-tone={tone}>
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
    <span className="admin-inline-pill" data-tone={tone}>
      {label}
    </span>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className="admin-table-shell">{children}</div>;
}

export function MiniChart() {
  return (
    <div className="admin-mini-chart">
      {revenueTrend.map((bar) => (
        <div className="admin-mini-chart__group" key={bar.day}>
          <div
            className="admin-mini-chart__bar admin-mini-chart__bar--volume"
            style={{ height: `${bar.bets * 0.44}px` }}
          />
          <div
            className="admin-mini-chart__bar admin-mini-chart__bar--revenue"
            style={{ height: `${bar.revenue * 0.44}px` }}
          />
          <span className="admin-mini-chart__label">{bar.day}</span>
        </div>
      ))}
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
    <div className="admin-donut">
      <svg className="admin-donut__chart" viewBox="0 0 90 90">
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
          className="admin-donut__label"
          textAnchor="middle"
        >
          Bets
        </text>
      </svg>

      <div className="admin-donut__legend">
        {sportDistribution.map((segment) => (
          <div className="admin-donut__legend-row" key={segment.sport}>
            <span
              className="admin-donut__legend-dot"
              style={{ background: toneToColor(segment.tone) }}
            />
            <span className="admin-text-secondary">{segment.sport}</span>
            <span className="admin-text-primary admin-text-strong">
              {segment.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
