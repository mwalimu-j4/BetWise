import { useQuery } from "@tanstack/react-query";
import { Download, Eye, Filter, Flag, TriangleAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { api } from "@/api/axiosConfig";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { dashboardMetrics, recentBets } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
  DonutChart,
  MetricCard,
  MiniChart,
  StatusBadge,
  TableShell,
  adminCompactActionsClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";

export default function Dashboard() {
  const { data: pendingWithdrawalData } = useQuery({
    queryKey: ["admin-withdrawals", "PENDING"],
    queryFn: async () => {
      const response = await api.get<{ withdrawals: Array<{ id: string }> }>(
        "/admin/withdrawals",
        {
          params: { status: "PENDING" },
        },
      );

      return response.data;
    },
    refetchInterval: 10_000,
  });

  const pendingWithdrawals = pendingWithdrawalData?.withdrawals ?? [];

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Overview"
        subtitle="Friday, April 3, 2026 - Live Platform Snapshot"
      />

      {pendingWithdrawals.length > 0 ? (
        <Alert className="border-amber-400/30 bg-amber-400/10">
          <TriangleAlert className="h-4 w-4 text-amber-300" />
          <AlertTitle className="text-amber-200">
            Pending Withdrawal Requests
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-amber-100/90">
            <span>
              You have {pendingWithdrawals.length} withdrawal request
              {pendingWithdrawals.length === 1 ? "" : "s"} waiting for review.
            </span>
            <Link
              to="/admin/withdrawals"
              className="rounded-lg border border-amber-300/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-100 transition hover:bg-amber-300/20"
            >
              Review Requests
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminCard>
          <AdminCardHeader
            title="Profit & Loss"
            subtitle="Last 7 days"
            actions={
              <div className="flex flex-wrap gap-3 text-xs text-admin-text-secondary">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-[2px]"
                    style={{ backgroundColor: "#00e5a0" }}
                  />
                  Profit
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-[2px]"
                    style={{ backgroundColor: "#ff9800" }}
                  />
                  Loss
                </span>
              </div>
            }
          />
          <MiniChart />
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Sport Distribution" subtitle="By bet count" />
          <DonutChart />
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader
          title="Recent Bets"
          subtitle="Live feed - auto-updating"
          actions={
            <>
              <AdminButton variant="ghost">
                <Filter size={13} />
                Filter
              </AdminButton>
              <AdminButton variant="ghost">
                <Download size={13} />
                Export
              </AdminButton>
            </>
          }
        />

        <TableShell>
          <table className={adminTableClassName}>
            <thead>
              <tr>
                {[
                  "Bet ID",
                  "User",
                  "Sport",
                  "Event",
                  "Market",
                  "Odds",
                  "Stake",
                  "Status",
                  "Time",
                  "Action",
                ].map((heading) => (
                  <th className={adminTableHeadCellClassName} key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBets.map((bet) => (
                <tr className="even:bg-admin-surface/45" key={bet.id}>
                  <td
                    className={`${adminTableCellClassName} text-xs font-semibold text-admin-blue`}
                  >
                    {bet.id}
                  </td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                  >
                    {bet.user}
                  </td>
                  <td className={adminTableCellClassName}>{bet.sport}</td>
                  <td
                    className={adminTableCellClassName}
                    style={{ maxWidth: 160 }}
                  >
                    {bet.event}
                  </td>
                  <td className={adminTableCellClassName}>{bet.market}</td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-gold`}
                  >
                    {bet.odds}
                  </td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                  >
                    {bet.stake}
                  </td>
                  <td className={adminTableCellClassName}>
                    <StatusBadge status={bet.status} />
                  </td>
                  <td
                    className={`${adminTableCellClassName} text-xs text-admin-text-muted`}
                  >
                    {bet.time}
                  </td>
                  <td className={adminTableCellClassName}>
                    <div className={adminCompactActionsClassName}>
                      <AdminButton size="sm" variant="ghost">
                        <Eye size={11} />
                      </AdminButton>
                      <AdminButton size="sm" variant="ghost">
                        <Flag size={11} />
                      </AdminButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </AdminCard>
    </div>
  );
}
