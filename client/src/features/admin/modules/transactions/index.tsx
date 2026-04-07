import { useState, useMemo } from "react";
import { Download, Loader, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  useAdminPayments,
  useAdminPaymentStats,
  type Payment,
} from "../../hooks/useAdminPayments";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  InlinePill,
  StatusBadge,
  TableShell,
  adminCompactActionsClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
  truncateEmailForTable,
} from "../../components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Transactions() {
  const [selectedTxn, setSelectedTxn] = useState<Payment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "" | "pending" | "completed" | "failed" | "reversed"
  >("");
  const [typeFilter, setTypeFilter] = useState<"" | "deposit" | "withdrawal">(
    "",
  );

  const itemsPerPage = 20;

  // Fetch payments and stats
  const { data: paymentsData, isLoading: isPaymentsLoading } = useAdminPayments(
    itemsPerPage,
    (currentPage - 1) * itemsPerPage,
    statusFilter,
    typeFilter,
  );

  const { data: statsData, isLoading: isStatsLoading } = useAdminPaymentStats();

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!statsData?.stats) {
      return [
        { label: "Total Deposits", value: "0", tone: "blue" as const },
        { label: "Total Withdrawals", value: "0", tone: "red" as const },
        { label: "Pending Deposits", value: "0", tone: "gold" as const },
        { label: "Pending Withdrawals", value: "0", tone: "gold" as const },
      ];
    }

    const { deposits, withdrawals } = statsData.stats;
    return [
      {
        label: "Total Deposits",
        value: `KES ${(deposits.totalValue / 1000).toFixed(1)}K`,
        tone: "blue" as const,
      },
      {
        label: "Total Withdrawals",
        value: `KES ${(withdrawals.totalValue / 1000).toFixed(1)}K`,
        tone: "red" as const,
      },
      {
        label: "Pending Deposits",
        value: `${deposits.pending}`,
        tone: "gold" as const,
      },
      {
        label: "Pending Withdrawals",
        value: `${withdrawals.pending}`,
        tone: "gold" as const,
      },
    ];
  }, [statsData]);

  const transactions = paymentsData?.transactions ?? [];
  const pagination = paymentsData?.pagination ?? {
    total: 0,
    limit: itemsPerPage,
    offset: 0,
    pages: 1,
  };

  const handleDownloadCSV = () => {
    if (!transactions.length) {
      toast.error("No transactions to export");
      return;
    }

    const headers = [
      "ID",
      "User Email",
      "Type",
      "Amount (KES)",
      "Status",
      "Date",
      "Reference",
    ];
    const rows = transactions.map((t) => [
      t.id,
      t.userEmail,
      t.type.toUpperCase(),
      t.amount.toString(),
      t.status.toUpperCase(),
      new Date(t.createdAt).toLocaleString(),
      t.reference,
    ]);

    let csv = headers.join(",") + "\n";
    csv += rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Transactions exported successfully");
  };

  const getToneForType = (type: "deposit" | "withdrawal") => {
    return type === "deposit" ? "live" : "gold";
  };

  const getStatusForBadge = (
    status: "pending" | "completed" | "failed" | "reversed",
  ): "pending" | "completed" | "failed" => {
    if (status === "reversed") return "failed";
    return status;
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Payments"
        subtitle="Deposits, withdrawals, and payment transactions"
        actions={
          <AdminButton variant="ghost" onClick={handleDownloadCSV}>
            <Download size={13} />
            Export CSV
          </AdminButton>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
        {stats.map((metric) => {
          const colorMap: Record<
            string,
            { bg: string; text: string; icon: string; border: string }
          > = {
            accent: {
              bg: "bg-admin-accent/5",
              text: "text-admin-accent",
              icon: "bg-admin-accent/15 text-admin-accent",
              border: "border-admin-accent/20",
            },
            blue: {
              bg: "bg-admin-blue/5",
              text: "text-admin-blue",
              icon: "bg-admin-blue/15 text-admin-blue",
              border: "border-admin-blue/20",
            },
            gold: {
              bg: "bg-admin-gold/5",
              text: "text-admin-gold",
              icon: "bg-admin-gold/15 text-admin-gold",
              border: "border-admin-gold/20",
            },
            red: {
              bg: "bg-red-500/5",
              text: "text-red-500",
              icon: "bg-red-500/15 text-red-500",
              border: "border-red-500/20",
            },
          };

          const colors = colorMap[metric.tone] || colorMap.accent;

          return (
            <AdminCard
              key={metric.label}
              className={`border ${colors.border} p-2.5 transition hover:border-opacity-50 sm:p-3`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted sm:text-[9px]">
                    {metric.label}
                  </p>
                  <div className={`rounded p-1 shrink-0 ${colors.icon}`}>
                    <div className="h-3 w-3" />
                  </div>
                </div>
                <p className={`text-base font-bold sm:text-lg ${colors.text}`}>
                  {metric.value}
                </p>
              </div>
            </AdminCard>
          );
        })}
      </div>

      {/* Filters */}
      <AdminCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(
                  e.target.value as
                    | ""
                    | "pending"
                    | "completed"
                    | "failed"
                    | "reversed",
                );
                setCurrentPage(1);
              }}
              className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-admin-accent"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="reversed">Reversed</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as "" | "deposit" | "withdrawal");
                setCurrentPage(1);
              }}
              className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-admin-accent"
            >
              <option value="">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
            </select>
          </div>

          <div className="text-sm text-admin-text-muted">
            Showing {transactions.length} of {pagination.total} transactions
          </div>
        </div>
      </AdminCard>

      {/* Transactions Table */}
      <AdminCard>
        {isPaymentsLoading || isStatsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="h-6 w-6 animate-spin text-admin-accent" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-admin-text-muted">No transactions found</p>
          </div>
        ) : (
          <TableShell>
            <table className={adminTableClassName}>
              <thead>
                <tr>
                  {[
                    "TXN ID",
                    "User",
                    "Type",
                    "Amount",
                    "Status",
                    "Date",
                    "Actions",
                  ].map((heading) => (
                    <th className={adminTableHeadCellClassName} key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    className="even:bg-[var(--color-bg-elevated)] hover:bg-admin-surface/60 cursor-pointer transition-colors"
                    key={transaction.id}
                    onClick={() => {
                      setSelectedTxn(transaction);
                      setDetailsOpen(true);
                    }}
                  >
                    <td
                      className={`${adminTableCellClassName} text-xs font-semibold text-admin-blue`}
                    >
                      {transaction.id.slice(0, 8)}
                    </td>
                    <td className={adminTableCellClassName}>
                      <div className="flex flex-col">
                        <span
                          className="max-w-[120px] truncate text-sm font-semibold text-admin-text-primary"
                          title={transaction.userEmail}
                        >
                          {truncateEmailForTable(transaction.userEmail)}
                        </span>
                        <span className="text-xs text-admin-text-muted">
                          {transaction.userPhone}
                        </span>
                      </div>
                    </td>
                    <td className={adminTableCellClassName}>
                      <InlinePill
                        label={
                          transaction.type === "deposit"
                            ? "Deposit"
                            : "Withdrawal"
                        }
                        tone={getToneForType(transaction.type)}
                      />
                    </td>
                    <td className={adminTableCellClassName}>
                      <span className="font-semibold text-admin-text-primary">
                        {transaction.type === "deposit" ? "+" : "-"}KES{" "}
                        {transaction.amount.toLocaleString()}
                      </span>
                      {transaction.fee > 0 && (
                        <span className="block text-xs text-admin-text-muted">
                          Fee: KES {transaction.fee.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className={adminTableCellClassName}>
                      <StatusBadge
                        status={getStatusForBadge(transaction.status)}
                      />
                    </td>
                    <td className={`${adminTableCellClassName} text-xs`}>
                      {new Date(transaction.createdAt).toLocaleString()}
                    </td>
                    <td
                      className={`${adminTableCellClassName} ${adminCompactActionsClassName}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <AdminButton
                            size="sm"
                            variant="ghost"
                            aria-label="Row actions"
                          >
                            <MoreHorizontal size={16} />
                          </AdminButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTxn(transaction);
                              setDetailsOpen(true);
                            }}
                          >
                            View details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}

        {/* Transaction Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          {selectedTxn && (
            <DialogContent className="max-w-lg border-admin-border bg-admin-card text-admin-text-primary">
              <DialogHeader>
                <DialogTitle>Transaction Details</DialogTitle>
                <DialogDescription className="text-admin-text-muted">
                  Review complete transaction information
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-96 pr-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                      Transaction ID
                    </label>
                    <p className="font-mono text-sm font-semibold">
                      {selectedTxn.id}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                      User
                    </label>
                    <p className="text-sm font-semibold">
                      {selectedTxn.userEmail}
                    </p>
                    <p className="text-xs text-admin-text-muted">
                      {selectedTxn.userPhone}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                        Type
                      </label>
                      <p className="text-sm font-semibold capitalize">
                        {selectedTxn.type}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                        Status
                      </label>
                      <p className="text-sm font-semibold capitalize">
                        {selectedTxn.status}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                        Amount
                      </label>
                      <p className="text-sm font-semibold">
                        KES {selectedTxn.amount.toLocaleString()}
                      </p>
                    </div>
                    {selectedTxn.fee > 0 && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                          Fee
                        </label>
                        <p className="text-sm font-semibold">
                          KES {selectedTxn.fee.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedTxn.totalDebit > 0 && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                        Total Debit
                      </label>
                      <p className="text-sm font-semibold">
                        KES {selectedTxn.totalDebit.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                      Reference
                    </label>
                    <p className="font-mono text-sm font-semibold">
                      {selectedTxn.reference}
                    </p>
                  </div>
                  {selectedTxn.mpesaCode && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                        M-Pesa Code
                      </label>
                      <p className="font-mono text-sm font-semibold">
                        {selectedTxn.mpesaCode}
                      </p>
                    </div>
                  )}
                  {selectedTxn.phone && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                        Phone
                      </label>
                      <p className="font-mono text-sm font-semibold">
                        {selectedTxn.phone}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                      Channel
                    </label>
                    <p className="text-sm font-semibold">
                      {selectedTxn.channel}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                      Created At
                    </label>
                    <p className="text-sm font-semibold">
                      {new Date(selectedTxn.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {selectedTxn.processedAt && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                        Processed At
                      </label>
                      <p className="text-sm font-semibold">
                        {new Date(selectedTxn.processedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          )}
        </Dialog>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
      </AdminCard>

      {/* Pagination */}
      {!isPaymentsLoading && pagination.pages > 1 && (
        <AdminCard>
          <div className="flex items-center justify-between">
            <div className="text-sm text-admin-text-muted">
              Page {currentPage} of {pagination.pages}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <Button
                onClick={() =>
                  setCurrentPage(Math.min(pagination.pages, currentPage + 1))
                }
                disabled={currentPage === pagination.pages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
