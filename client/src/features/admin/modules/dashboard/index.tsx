import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Download, Eye, Filter, Flag, Loader, TriangleAlert } from "lucide-react";
import { api } from "@/api/axiosConfig";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
  InlinePill,
  StatusBadge,
  SummaryCard,
  TableShell,
  adminCompactActionsClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";

type DashboardMetric = {
  label: string;
  value: string;
  tone: "accent" | "blue" | "gold" | "red";
};

type DashboardTransaction = {
  id: string;
  reference: string;
  userEmail: string;
  userPhone: string;
  type: "deposit" | "withdrawal";
  amount: number;
  fee: number;
  totalDebit: number;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  channel: string;
};

type DashboardSummaryResponse = {
  generatedAt: string;
  metrics: DashboardMetric[];
  recentTransactions: DashboardTransaction[];
};

function formatCurrency(value: number) {
  return `KES ${value.toLocaleString()}`;
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-summary"],
    queryFn: async () => {
      const response = await api.get<DashboardSummaryResponse>(
        "/admin/dashboard/summary",
      );

      return response.data;
    },
    refetchInterval: 10_000,
  });

  const metrics = data?.metrics ?? [];
  const recentTransactions = data?.recentTransactions ?? [];
  const pendingWithdrawals = metrics.find(
    (metric) => metric.label === "Pending Withdrawals",
  )?.value;
  const pendingCount = pendingWithdrawals
    ? Number(pendingWithdrawals.replace(/\D/g, ""))
    : 0;

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Overview"
        subtitle={
          data
            ? `Live platform snapshot refreshed at ${new Date(
                data.generatedAt,
              ).toLocaleString("en-KE", {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}`
            : "Live platform snapshot from the server"
        }
      />

      {pendingCount > 0 ? (
        <Alert className="border-amber-400/30 bg-amber-400/10">
          <TriangleAlert className="h-4 w-4 text-amber-300" />
          <AlertTitle className="text-amber-200">
            Pending Withdrawal Requests
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-amber-100/90">
            <span>
              You have {pendingCount} withdrawal request
              {pendingCount === 1 ? "" : "s"} waiting for review.
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading && metrics.length === 0
          ? Array.from({ length: 6 }).map((_, index) => (
              <AdminCard key={index} className="animate-pulse">
                <div className="h-6 w-24 rounded bg-admin-surface" />
                <div className="mt-4 h-8 w-32 rounded bg-admin-surface" />
                <div className="mt-2 h-4 w-20 rounded bg-admin-surface" />
              </AdminCard>
            ))
          : metrics.map((metric) => (
              <SummaryCard
                key={metric.label}
                label={metric.label}
                tone={metric.tone}
                value={metric.value}
              />
            ))}
      </div>

      <AdminCard>
        <AdminCardHeader
          title="Recent Activity"
          subtitle="Live wallet and withdrawal flow"
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
                  "Reference",
                  "User",
                  "Type",
                  "Amount",
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
              {isLoading ? (
                <tr>
                  <td className={adminTableCellClassName} colSpan={7}>
                    <div className="flex items-center justify-center py-8">
                      <Loader className="animate-spin" size={24} />
                    </div>
                  </td>
                </tr>
              ) : recentTransactions.length === 0 ? (
                <tr>
                  <td className={adminTableCellClassName} colSpan={7}>
                    <div className="flex items-center justify-center py-8 text-admin-text-muted">
                      No recent activity yet.
                    </div>
                  </td>
                </tr>
              ) : (
                recentTransactions.map((transaction) => (
                  <tr className="even:bg-admin-surface/45" key={transaction.id}>
                    <td
                      className={`${adminTableCellClassName} text-xs font-semibold text-admin-blue`}
                    >
                      {transaction.reference}
                    </td>
                    <td
                      className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                    >
                      <div>
                        <p className="text-xs">{transaction.userEmail}</p>
                        <p className="text-[10px] text-admin-text-muted">
                          {transaction.userPhone}
                        </p>
                      </div>
                    </td>
                    <td className={adminTableCellClassName}>
                      <InlinePill
                        label={transaction.type}
                        tone={transaction.type === "deposit" ? "accent" : "gold"}
                      />
                    </td>
                    <td
                      className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                    >
                      {formatCurrency(transaction.amount)}
                      {transaction.type === "withdrawal" ? (
                        <span className="ml-2 text-[10px] text-admin-text-muted">
                          Fee {formatCurrency(transaction.fee)}
                        </span>
                      ) : null}
                    </td>
                    <td className={adminTableCellClassName}>
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td
                      className={`${adminTableCellClassName} text-xs text-admin-text-muted`}
                    >
                      {new Date(transaction.createdAt).toLocaleString("en-KE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                ))
              )}
            </tbody>
          </table>
        </TableShell>
      </AdminCard>
    </div>
  );
}
