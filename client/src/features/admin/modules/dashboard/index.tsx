import { api } from "@/api/axiosConfig";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CreditCard,
  Download,
  Filter,
  Loader,
  MoreHorizontal,
  Sliders,
  TrendingUp,
  TriangleAlert,
  Users
} from "lucide-react";
import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminSectionHeader,
  DepositWithdrawalChart,
  InlinePill,
  StatusBadge,
  TableShell,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";

type DashboardMetric = {
  label: string;
  value: string;
  tone: "accent" | "blue" | "gold" | "red";
  helper?: string;
};

type DashboardTransaction = {
  id: string;
  reference: string;
  mpesaCode?: string | null;
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
  charts: {
    depositWithdrawalTrend: Array<{
      period: string;
      deposits: number;
      withdrawals: number;
    }>;
    totals: {
      deposits7d: number;
      withdrawals7d: number;
    };
  };
  recentTransactions: DashboardTransaction[];
};

function formatCurrency(value: number) {
  return `KES ${value.toLocaleString()}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedTransaction, setSelectedTransaction] =
    useState<DashboardTransaction | null>(null);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);

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
  const chartData = data?.charts.depositWithdrawalTrend ?? [];
  const recentTransactions = data?.recentTransactions ?? [];
  const pendingWithdrawals = metrics.find(
    (metric) => metric.label === "Pending Withdrawals",
  )?.value;
  const pendingCount = pendingWithdrawals
    ? Number(pendingWithdrawals.replace(/\D/g, ""))
    : 0;

  const handleViewDetails = (transaction: DashboardTransaction) => {
    setSelectedTransaction(transaction);
    setViewDetailsDialogOpen(true);
  };

  const handleOpenUser = (transaction: DashboardTransaction) => {
    // Navigate to the users module and filter by the user's email
    navigate({
      to: "/admin/users",
      search: { filter: transaction.userEmail },
    });
  };

  const handleReviewTransaction = (transaction: DashboardTransaction) => {
    if (transaction.type === "withdrawal") {
      // Navigate to withdrawals with filter for this transaction
      navigate({
        to: "/admin/withdrawals",
        search: { transactionId: transaction.id, status: transaction.status },
      });
    } else {
      // For deposits, show the details dialog
      handleViewDetails(transaction);
    }
  };

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

      {/* Quick Shortcuts - Corner Position */}
      <div className="fixed right-4 bottom-4 z-40 w-72 space-y-2">
        <Link
          to="/admin/withdrawals"
          className="group flex items-center gap-3 rounded-lg border border-admin-border bg-admin-surface/40 p-2.5 text-xs transition hover:border-admin-gold hover:bg-admin-surface/60"
        >
          <div className="rounded bg-admin-gold/10 p-1.5 text-admin-gold group-hover:bg-admin-gold/20">
            <CreditCard size={14} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-admin-text">Pending: {pendingCount}</p>
            <p className="text-[11px] text-admin-text-muted">Withdrawals</p>
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="group flex items-center gap-3 rounded-lg border border-admin-border bg-admin-surface/40 p-2.5 text-xs transition hover:border-admin-accent hover:bg-admin-surface/60"
        >
          <div className="rounded bg-admin-accent/10 p-1.5 text-admin-accent group-hover:bg-admin-accent/20">
            <Users size={14} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-admin-text">Users</p>
            <p className="text-[11px] text-admin-text-muted">Manage accounts</p>
          </div>
        </Link>

        <Link
          to="/admin/analytics"
          className="group flex items-center gap-3 rounded-lg border border-admin-border bg-admin-surface/40 p-2.5 text-xs transition hover:border-admin-blue hover:bg-admin-surface/60"
        >
          <div className="rounded bg-admin-blue/10 p-1.5 text-admin-blue group-hover:bg-admin-blue/20">
            <TrendingUp size={14} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-admin-text">Reports</p>
            <p className="text-[11px] text-admin-text-muted">Analytics</p>
          </div>
        </Link>

        <Link
          to="/admin/settings"
          className="group flex items-center gap-3 rounded-lg border border-admin-border bg-admin-surface/40 p-2.5 text-xs transition hover:border-admin-text-secondary hover:bg-admin-surface/60"
        >
          <div className="rounded bg-admin-text-secondary/10 p-1.5 text-admin-text-secondary group-hover:bg-admin-text-secondary/20">
            <Sliders size={14} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-admin-text">Settings</p>
            <p className="text-[11px] text-admin-text-muted">Configure</p>
          </div>
        </Link>
      </div>

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
                <div className="mt-3 h-8 w-32 rounded bg-admin-surface" />
                <div className="mt-2 h-3 w-20 rounded bg-admin-surface" />
              </AdminCard>
            ))
          : metrics.slice(0, 6).map((metric) => {
              // Assign colors based on tone
              const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
                accent: {
                  bg: 'bg-admin-accent/5',
                  text: 'text-admin-accent',
                  icon: 'bg-admin-accent/15 text-admin-accent',
                  border: 'border-admin-accent/20',
                },
                blue: {
                  bg: 'bg-admin-blue/5',
                  text: 'text-admin-blue',
                  icon: 'bg-admin-blue/15 text-admin-blue',
                  border: 'border-admin-blue/20',
                },
                gold: {
                  bg: 'bg-admin-gold/5',
                  text: 'text-admin-gold',
                  icon: 'bg-admin-gold/15 text-admin-gold',
                  border: 'border-admin-gold/20',
                },
                red: {
                  bg: 'bg-red-500/5',
                  text: 'text-red-500',
                  icon: 'bg-red-500/15 text-red-500',
                  border: 'border-red-500/20',
                },
              };
              
              const colors = colorMap[metric.tone] || colorMap.accent;
              
              return (
                <AdminCard key={metric.label} className={`border ${colors.border} transition hover:border-opacity-50`}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
                        {metric.label}
                      </p>
                      <div className={`rounded-lg p-2 ${colors.icon}`}>
                        <div className="h-4 w-4" />
                      </div>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${colors.text}`}>
                        {metric.value}
                      </p>
                      {metric.helper && (
                        <p className="mt-2 text-[11px] text-admin-text-muted">
                          {metric.helper}
                        </p>
                      )}
                    </div>
                  </div>
                </AdminCard>
              );
            })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <AdminCard>
          <AdminCardHeader
            title="Deposit vs Withdrawal Trend"
            subtitle="Completed transactions over last 7 days"
          />
          <DepositWithdrawalChart data={chartData} />
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="7 Day Totals" subtitle="Liquidity" />
          <div className="space-y-2.5 pt-2">
            <div className="rounded-lg border border-admin-border bg-admin-surface/60 p-2.5">
              <p className="text-[9px] uppercase tracking-[0.08em] text-admin-text-muted">
                Deposits
              </p>
              <p className="mt-1 text-lg font-bold text-admin-accent">
                {formatCurrency(data?.charts.totals.deposits7d ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-admin-border bg-admin-surface/60 p-2.5">
              <p className="text-[9px] uppercase tracking-[0.08em] text-admin-text-muted">
                Withdrawals
              </p>
              <p className="mt-1 text-lg font-bold text-admin-gold">
                {formatCurrency(data?.charts.totals.withdrawals7d ?? 0)}
              </p>
            </div>
          </div>
        </AdminCard>
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
                  "Actions",
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
                      {transaction.mpesaCode ?? transaction.reference}
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
                        tone={
                          transaction.type === "deposit" ? "accent" : "gold"
                        }
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <AdminButton
                            size="sm"
                            variant="ghost"
                            aria-label="Row actions"
                          >
                            <MoreHorizontal size={14} />
                          </AdminButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(transaction)}
                          >
                            View full details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenUser(transaction)}
                          >
                            Open user profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleReviewTransaction(transaction)}
                          >
                            {transaction.type === "withdrawal"
                              ? "Review & manage payout"
                              : "Review & manage deposit"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableShell>
      </AdminCard>

      {selectedTransaction && (
        <Dialog
          open={viewDetailsDialogOpen}
          onOpenChange={setViewDetailsDialogOpen}
        >
          <DialogContent className="max-w-md bg-admin-bg">
            <DialogHeader>
              <DialogTitle className="text-admin-text-primary">
                Transaction Details
              </DialogTitle>
              <DialogDescription className="text-admin-text-muted">
                {selectedTransaction.type === "deposit"
                  ? "Wallet deposit transaction"
                  : "Wallet withdrawal transaction"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">
                  Reference ID
                </p>
                <p className="mt-1 font-mono text-sm text-admin-text-primary">
                  {selectedTransaction.mpesaCode ??
                    selectedTransaction.reference}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">
                    Type
                  </p>
                  <p className="mt-1 capitalize text-admin-text-primary">
                    {selectedTransaction.type}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">
                    Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={selectedTransaction.status} />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">
                  Amount
                </p>
                <p className="mt-1 text-lg font-bold text-admin-text-primary">
                  {formatCurrency(selectedTransaction.amount)}
                </p>
              </div>

              {selectedTransaction.type === "withdrawal" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">
                      Fee
                    </p>
                    <p className="mt-1 text-admin-text-secondary">
                      {formatCurrency(selectedTransaction.fee)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">
                      Net Amount
                    </p>
                    <p className="mt-1 font-semibold text-admin-gold">
                      {formatCurrency(
                        selectedTransaction.amount - selectedTransaction.fee,
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">
                  User
                </p>
                <div className="mt-1">
                  <p className="text-sm text-admin-text-primary">
                    {selectedTransaction.userEmail}
                  </p>
                  <p className="text-[11px] text-admin-text-muted">
                    {selectedTransaction.userPhone}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">
                  Timestamp
                </p>
                <p className="mt-1 text-sm text-admin-text-secondary">
                  {new Date(selectedTransaction.createdAt).toLocaleString(
                    "en-KE",
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    },
                  )}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <AdminButton
                  tone="blue"
                  size="sm"
                  onClick={() => handleOpenUser(selectedTransaction)}
                >
                  View User
                </AdminButton>
                {selectedTransaction.type === "withdrawal" && (
                  <AdminButton
                    tone="gold"
                    size="sm"
                    onClick={() => {
                      handleReviewTransaction(selectedTransaction);
                      setViewDetailsDialogOpen(false);
                    }}
                  >
                    Manage Payout
                  </AdminButton>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
