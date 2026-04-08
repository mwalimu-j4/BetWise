import { api } from "@/api/axiosConfig";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
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
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader,
  MessageSquare,
  MoreHorizontal,
  Settings,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminDialogContent,
  AdminSectionHeader,
  AdminStatCard,
  DepositWithdrawalChart,
  InlinePill,
  StatusBadge,
  TableShell,
  adminDropdownContentClassName,
  adminDropdownItemClassName,
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
  const [showAllStatsMobile, setShowAllStatsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleExportCSV = () => {
    if (recentTransactions.length === 0) return;

    const headers = [
      "#",
      "User Email",
      "Phone",
      "Type",
      "Amount",
      "Fee",
      "Status",
      "Time",
    ];
    const rows = recentTransactions.map((tx, idx) => [
      idx + 1,
      tx.userEmail,
      tx.userPhone,
      tx.type,
      tx.amount,
      tx.type === "withdrawal" ? tx.fee : "-",
      tx.status,
      new Date(tx.createdAt).toLocaleString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recent_activity_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

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
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
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

      {/* Main Content */}
      <div className="space-y-6">
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
                className="rounded-lg border border-amber-300/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-100 transition hover:bg-amber-300/20 whitespace-nowrap"
              >
                Review Requests
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
          {isLoading && metrics.length === 0
            ? Array.from({ length: 8 }).map((_, index) => (
                <AdminCard
                  key={index}
                  className={`animate-pulse ${index > 3 ? "hidden sm:block" : ""}`}
                >
                  <div className="h-4 w-20 rounded bg-admin-surface" />
                  <div className="mt-2 h-6 w-24 rounded bg-admin-surface" />
                  <div className="mt-1 h-2 w-16 rounded bg-admin-surface" />
                </AdminCard>
              ))
            : metrics.map((metric, index) => {
                const hideOnMobile = !showAllStatsMobile && index > 3;

                return (
                  <AdminStatCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    tone={metric.tone}
                    helper={metric.helper}
                    className={hideOnMobile ? "hidden sm:block" : undefined}
                  />
                );
              })}
        </div>

        {metrics.length > 4 ? (
          <div className="sm:hidden">
            <AdminButton
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowAllStatsMobile((previous) => !previous)}
            >
              {showAllStatsMobile
                ? "Show fewer stats"
                : `View ${metrics.length - 4} more stats`}
            </AdminButton>
          </div>
        ) : null}

        {/* Charts */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-4">
          <AdminCard className="p-3 sm:p-4 overflow-hidden w-full">
            <AdminCardHeader
              title="Deposit vs Withdrawal Trend"
              subtitle="Completed transactions over last 7 days"
            />
            <div className="w-full overflow-x-auto">
              <DepositWithdrawalChart data={chartData} compact />
            </div>
          </AdminCard>

          <AdminCard className="hidden w-full p-3 sm:p-4 lg:block">
            <AdminCardHeader title="7 Day Totals" subtitle="Liquidity" />
            <div className="space-y-2.5 pt-2">
              <div className="rounded-lg border border-admin-border bg-admin-surface/60 p-2.5">
                <p className="text-[9px] uppercase tracking-[0.08em] text-admin-text-muted">
                  Deposits
                </p>
                <p className="mt-1 text-base font-bold text-admin-accent sm:text-lg">
                  {formatCurrency(data?.charts.totals.deposits7d ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-admin-border bg-admin-surface/60 p-2.5">
                <p className="text-[9px] uppercase tracking-[0.08em] text-admin-text-muted">
                  Withdrawals
                </p>
                <p className="mt-1 text-base font-bold text-admin-gold sm:text-lg">
                  {formatCurrency(data?.charts.totals.withdrawals7d ?? 0)}
                </p>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Recent Activity + Quick Links */}
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          {/* Recent Activity */}
          <AdminCard className="overflow-hidden max-w-full w-full">
            <AdminCardHeader
              title="Recent Activity"
              subtitle="Live wallet and withdrawal flow"
              actions={
                <>
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    className="rounded-full border-admin-border/70 bg-admin-surface/65 px-3 text-[11px] font-semibold text-admin-text-primary hover:border-admin-accent/50 hover:bg-admin-accent/10"
                    onClick={() => {
                      // Placeholder for filter dialog - can be expanded later
                      console.log("Filters clicked");
                    }}
                  >
                    <Filter size={13} />
                    <span>Filters</span>
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    className="rounded-full border-admin-border/70 bg-admin-surface/65 px-3 text-[11px] font-semibold text-admin-text-primary hover:border-admin-blue/50 hover:bg-admin-blue/10"
                    onClick={handleExportCSV}
                  >
                    <Download size={13} />
                    <span>Export</span>
                  </AdminButton>
                </>
              }
            />

            <p className="mt-2 text-[11px] text-admin-text-muted px-1">
              Swipe the table left and right on mobile to view every column.
            </p>

            <TableShell className="mt-2 w-full border-t border-admin-border/40">
              <div className="w-full overflow-x-auto pb-2 -webkit-overflow-scrolling-touch">
                <table className={`${adminTableClassName} w-full min-w-175`}>
                  <thead>
                    <tr>
                      {[
                        "#", // Replaced Reference with Numbering
                        "User",
                        "Type",
                        "Amount",
                        "Status",
                        "Time",
                        "Actions",
                      ].map((heading) => (
                        <th
                          className={adminTableHeadCellClassName}
                          key={heading}
                        >
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
                      // Paginate transactions - 5 per page
                      recentTransactions
                        .slice(
                          (currentPage - 1) * itemsPerPage,
                          currentPage * itemsPerPage,
                        )
                        .map((transaction, index) => (
                          <tr
                            className="even:bg-admin-surface/45 h-8 hover:bg-admin-surface/60 cursor-pointer transition-colors"
                            key={transaction.id}
                            onClick={() => handleViewDetails(transaction)}
                          >
                            <td
                              className={`${adminTableCellClassName} text-xs font-semibold text-admin-text-muted w-8 px-1.5 py-1 align-middle`}
                            >
                              {index + 1}
                            </td>
                            <td
                              className={`${adminTableCellClassName} font-semibold text-admin-text-primary max-w-35 px-2 py-1 align-middle`}
                              title={`${transaction.userEmail} • ${transaction.userPhone}`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className="truncate text-xs">
                                  {transaction.userEmail}
                                </span>
                                <span className="hidden sm:inline text-[10px] text-admin-text-muted shrink-0">
                                  •
                                </span>
                                <span className="hidden sm:inline text-[10px] text-admin-text-muted truncate">
                                  {transaction.userPhone}
                                </span>
                              </div>
                            </td>
                            <td
                              className={`${adminTableCellClassName} px-1.5 py-1 align-middle`}
                            >
                              <InlinePill
                                label={transaction.type}
                                tone={
                                  transaction.type === "deposit"
                                    ? "live"
                                    : "gold"
                                }
                              />
                            </td>
                            <td
                              className={`${adminTableCellClassName} font-semibold text-admin-text-primary px-2 py-1 align-middle whitespace-nowrap`}
                              title={`${formatCurrency(transaction.amount)}${transaction.type === "withdrawal" ? ` • Fee ${formatCurrency(transaction.fee)}` : ""}`}
                            >
                              {formatCurrency(transaction.amount)}
                              {transaction.type === "withdrawal" ? (
                                <span className="ml-1 text-[10px] text-admin-text-muted">
                                  Fee {formatCurrency(transaction.fee)}
                                </span>
                              ) : null}
                            </td>
                            <td
                              className={`${adminTableCellClassName} px-1.5 py-1 align-middle`}
                            >
                              <StatusBadge status={transaction.status} />
                            </td>
                            <td
                              className={`${adminTableCellClassName} whitespace-nowrap text-xs text-admin-text-muted px-2 py-1 align-middle`}
                              title={new Date(
                                transaction.createdAt,
                              ).toLocaleString("en-KE", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            >
                              {new Date(transaction.createdAt).toLocaleString(
                                "en-KE",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </td>
                            <td
                              className={`${adminTableCellClassName} whitespace-nowrap px-1 py-1 align-middle`}
                              onClick={(e) => e.stopPropagation()}
                            >
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
                                <DropdownMenuContent
                                  align="end"
                                  className={`${adminDropdownContentClassName} w-56`}
                                >
                                  <DropdownMenuItem
                                    className={adminDropdownItemClassName}
                                    onClick={() =>
                                      handleViewDetails(transaction)
                                    }
                                  >
                                    View full details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className={adminDropdownItemClassName}
                                    onClick={() => handleOpenUser(transaction)}
                                  >
                                    Open user profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className={adminDropdownItemClassName}
                                    onClick={() =>
                                      handleReviewTransaction(transaction)
                                    }
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
              </div>

              {/* Pagination Controls */}
              {recentTransactions.length > itemsPerPage && (
                <div className="flex items-center justify-between border-t border-admin-border/40 px-4 py-2.5">
                  <div className="text-xs text-admin-text-muted">
                    Showing{" "}
                    {Math.min(
                      (currentPage - 1) * itemsPerPage + 1,
                      recentTransactions.length,
                    )}{" "}
                    to{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      recentTransactions.length,
                    )}{" "}
                    of {recentTransactions.length} transactions
                  </div>
                  <div className="flex gap-2">
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </AdminButton>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        {
                          length: Math.ceil(
                            recentTransactions.length / itemsPerPage,
                          ),
                        },
                        (_, i) => i + 1,
                      ).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`h-7 w-7 rounded text-xs font-medium transition ${
                            currentPage === page
                              ? "bg-admin-accent text-admin-bg"
                              : "border border-admin-border/50 bg-admin-surface/50 text-admin-text-primary hover:border-admin-accent/50 hover:bg-admin-surface/80"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(
                            Math.ceil(recentTransactions.length / itemsPerPage),
                            prev + 1,
                          ),
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(recentTransactions.length / itemsPerPage)
                      }
                    >
                      <ChevronRight size={16} />
                    </AdminButton>
                  </div>
                </div>
              )}
            </TableShell>
          </AdminCard>

          {/* Quick Links */}
          <AdminCard className="hidden w-full overflow-hidden lg:block">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-admin-text">
                Quick Links
              </h3>

              {/* 2x3 Grid for Quick Links */}
              <div className="grid grid-cols-2 gap-2">
                {/* Pending Payouts */}
                <Link
                  to="/admin/withdrawals"
                  className="group flex flex-col items-start gap-2 rounded-lg border border-admin-border/50 bg-admin-surface/50 p-3 transition-all duration-200 hover:border-admin-gold hover:bg-admin-surface/72"
                >
                  <div className="rounded-md bg-admin-gold/20 p-1.5 text-admin-gold transition-colors duration-200 group-hover:bg-admin-gold/30">
                    <Wallet size={16} />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <p className="text-xs font-bold text-admin-text-primary leading-tight">
                      {pendingCount}
                    </p>
                    <p className="text-[11px] text-admin-text-muted">Payouts</p>
                  </div>
                </Link>

                {/* Users Management */}
                <Link
                  to="/admin/users"
                  className="group flex flex-col items-start gap-2 rounded-lg border border-admin-border/50 bg-admin-surface/50 p-3 transition-all duration-200 hover:border-admin-accent hover:bg-admin-surface/72"
                >
                  <div className="rounded-md bg-admin-accent/20 p-1.5 text-admin-accent transition-colors duration-200 group-hover:bg-admin-accent/30">
                    <Users size={16} />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <p className="text-xs font-bold text-admin-text-primary leading-tight">
                      Users
                    </p>
                    <p className="text-[11px] text-admin-text-muted">Manage</p>
                  </div>
                </Link>

                {/* Analytics Page */}
                <Link
                  to="/admin/analytics"
                  className="group flex flex-col items-start gap-2 rounded-lg border border-admin-border/50 bg-admin-surface/50 p-3 transition-all duration-200 hover:border-admin-blue hover:bg-admin-surface/72"
                >
                  <div className="rounded-md bg-admin-blue/20 p-1.5 text-admin-blue transition-colors duration-200 group-hover:bg-admin-blue/30">
                    <TrendingUp size={16} />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <p className="text-xs font-bold text-admin-text-primary leading-tight">
                      Analytics
                    </p>
                    <p className="text-[11px] text-admin-text-muted">
                      Insights
                    </p>
                  </div>
                </Link>

                {/* Risk Management */}
                <Link
                  to="/admin/risk"
                  className="group flex flex-col items-start gap-2 rounded-lg border border-admin-border/50 bg-admin-surface/50 p-3 transition-all duration-200 hover:border-admin-red/60 hover:bg-admin-surface/72"
                >
                  <div className="rounded-md bg-admin-red/20 p-1.5 text-admin-red transition-colors duration-200 group-hover:bg-admin-red/30">
                    <AlertCircle size={16} />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <p className="text-xs font-bold text-admin-text-primary leading-tight">
                      Risk
                    </p>
                    <p className="text-[11px] text-admin-text-muted">Alerts</p>
                  </div>
                </Link>

                {/* Settings */}
                <Link
                  to="/admin/settings"
                  className="group flex flex-col items-start gap-2 rounded-lg border border-admin-border/50 bg-admin-surface/50 p-3 transition-all duration-200 hover:border-admin-text-secondary hover:bg-admin-surface/72"
                >
                  <div className="rounded-md bg-admin-text-secondary/20 p-1.5 text-admin-text-secondary transition-colors duration-200 group-hover:bg-admin-text-secondary/30">
                    <Settings size={16} />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <p className="text-xs font-bold text-admin-text-primary leading-tight">
                      Settings
                    </p>
                    <p className="text-[11px] text-admin-text-muted">Config</p>
                  </div>
                </Link>

                {/* Contact Messages */}
                <Link
                  to="/admin/contacts"
                  className="group flex flex-col items-start gap-2 rounded-lg border border-admin-border/50 bg-admin-surface/50 p-3 transition-all duration-200 hover:border-purple-500/60 hover:bg-admin-surface/72"
                >
                  <div className="rounded-md bg-purple-500/20 p-1.5 text-purple-500 transition-colors duration-200 group-hover:bg-purple-500/30">
                    <MessageSquare size={16} />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <p className="text-xs font-bold text-admin-text-primary leading-tight">
                      Messages
                    </p>
                    <p className="text-[11px] text-admin-text-muted">Contact</p>
                  </div>
                </Link>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>

      {selectedTransaction && (
        <Dialog
          open={viewDetailsDialogOpen}
          onOpenChange={setViewDetailsDialogOpen}
        >
          <AdminDialogContent className="max-w-md">
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
          </AdminDialogContent>
        </Dialog>
      )}
    </div>
  );
}
