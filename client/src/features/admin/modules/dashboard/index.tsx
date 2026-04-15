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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader,
  MoreHorizontal,
  TriangleAlert,
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
  UserRegistrationChart,
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
    registrationTrend: Array<{
      period: string;
      registrations: number;
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
  const [financePeriod, setFinancePeriod] = useState<"1w" | "1m" | "6m">("1w");
  const [registrationPeriod, setRegistrationPeriod] = useState<
    "1w" | "1m" | "6m"
  >("1w");

  const itemsPerPage = 5;

  const handleExportCSV = () => {
    if (recentTransactions.length === 0) return;

    const headers = [
      "#",
      "User Phone",
      "Type",
      "Amount",
      "Fee",
      "Status",
      "Time",
    ];
    const rows = recentTransactions.map((tx, idx) => [
      idx + 1,
      tx.userPhone,
      tx.type,
      tx.type,
      tx.amount,
      tx.type === "withdrawal" ? tx.fee : "-",
      tx.status,
      new Date(tx.createdAt).toLocaleString("en-KE", {
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
    queryKey: ["admin-dashboard-summary", financePeriod, registrationPeriod],
    queryFn: async () => {
      const response = await api.get<DashboardSummaryResponse>(
        "/admin/dashboard/summary",
        {
          params: {
            financePeriod,
            registrationPeriod,
          },
        },
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
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          <AdminCard className="p-3 sm:p-4 overflow-hidden w-full">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-admin-border/40">
              <div>
                <h3 className="text-sm font-semibold text-admin-text-primary">
                  Deposit vs Withdrawal Trend
                </h3>
                <p className="text-xs text-admin-text-muted mt-1">
                  Completed transactions
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    className="rounded-full border-admin-border/70 bg-admin-surface/65 px-3 text-[11px] font-semibold text-admin-text-primary hover:border-admin-accent/50 hover:bg-admin-accent/10 flex items-center gap-1"
                  >
                    {financePeriod === "1w"
                      ? "1 Week"
                      : financePeriod === "1m"
                        ? "1 Month"
                        : "6 Months"}
                    <ChevronDown size={14} />
                  </AdminButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={adminDropdownContentClassName}
                >
                  <DropdownMenuItem
                    className={adminDropdownItemClassName}
                    onClick={() => setFinancePeriod("1w")}
                  >
                    {financePeriod === "1w" && "✓ "}Past 1 Week
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={adminDropdownItemClassName}
                    onClick={() => setFinancePeriod("1m")}
                  >
                    {financePeriod === "1m" && "✓ "}Past Month
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={adminDropdownItemClassName}
                    onClick={() => setFinancePeriod("6m")}
                  >
                    {financePeriod === "6m" && "✓ "}Past 6 Months
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="w-full">
              <DepositWithdrawalChart
                data={chartData}
                compact
                period={financePeriod}
              />
            </div>
          </AdminCard>

          <AdminCard className="p-3 sm:p-4 overflow-hidden w-full">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-admin-border/40">
              <div>
                <h3 className="text-sm font-semibold text-admin-text-primary">
                  User Registration Trend
                </h3>
                <p className="text-xs text-admin-text-muted mt-1">
                  New user signups
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    className="rounded-full border-admin-border/70 bg-admin-surface/65 px-3 text-[11px] font-semibold text-admin-text-primary hover:border-admin-accent/50 hover:bg-admin-accent/10 flex items-center gap-1"
                  >
                    {registrationPeriod === "1w"
                      ? "1 Week"
                      : registrationPeriod === "1m"
                        ? "1 Month"
                        : "6 Months"}
                    <ChevronDown size={14} />
                  </AdminButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={adminDropdownContentClassName}
                >
                  <DropdownMenuItem
                    className={adminDropdownItemClassName}
                    onClick={() => setRegistrationPeriod("1w")}
                  >
                    {registrationPeriod === "1w" && "✓ "}Past 1 Week
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={adminDropdownItemClassName}
                    onClick={() => setRegistrationPeriod("1m")}
                  >
                    {registrationPeriod === "1m" && "✓ "}Past Month
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={adminDropdownItemClassName}
                    onClick={() => setRegistrationPeriod("6m")}
                  >
                    {registrationPeriod === "6m" && "✓ "}Past 6 Months
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="w-full">
              <UserRegistrationChart
                data={data?.charts.registrationTrend ?? []}
                compact
                period={registrationPeriod}
              />
            </div>
          </AdminCard>
        </div>

        {/* Recent Activity */}
        <div className="w-full">
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
                              title={transaction.userPhone}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className="truncate text-xs">
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
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            >
                              {new Date(transaction.createdAt).toLocaleString(
                                "en-KE",
                                {
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
