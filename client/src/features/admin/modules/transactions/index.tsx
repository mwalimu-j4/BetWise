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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Loader, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminButton,
  AdminCard,
  AdminDialogContent,
  AdminStatCard,
  adminCompactActionsClassName,
  adminDropdownContentClassName,
  adminDropdownItemClassName,
  AdminSectionHeader,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
  InlinePill,
  StatusBadge,
  TableShell,
} from "../../components/ui";
import {
  useAdminPayments,
  useAdminPaymentStats,
  type Payment,
} from "../../hooks/useAdminPayments";

export default function Transactions() {
  const [selectedTxn, setSelectedTxn] = useState<Payment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "" | "pending" | "processing" | "completed" | "failed" | "reversed"
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
      "User Phone",
      "Type",
      "Amount (KES)",
      "Status",
      "Date",
      "Reference",
    ];
    const rows = transactions.map((t) => [
      t.id,
      t.userPhone,
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
    status: "pending" | "processing" | "completed" | "failed" | "reversed",
  ): "pending" | "processing" | "completed" | "failed" => {
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
        {stats.map((metric) => (
          <AdminStatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
            helper="Live totals across wallet inflows and payout activity"
          />
        ))}
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
                    | "processing"
                    | "completed"
                    | "failed"
                    | "reversed",
                );
                setCurrentPage(1);
              }}
              className="rounded-2xl border border-admin-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] bg-admin-surface/55 px-3.5 py-2.5 text-sm text-admin-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
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
              className="rounded-2xl border border-admin-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] bg-admin-surface/55 px-3.5 py-2.5 text-sm text-admin-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
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
            <table className="w-full">
              <thead className="bg-admin-surface/30 border-b border-white/10">
                <tr>
                  {[
                    "#",
                    "Phone",
                    "Type",
                    "Amount",
                    "Status",
                    "Date",
                    "",
                  ].map((heading, i) => (
                    <th
                      key={i}
                      className="text-left px-3 py-3 text-xs font-semibold text-admin-text-muted uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((transaction, index) => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-admin-surface/20 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedTxn(transaction);
                      setDetailsOpen(true);
                    }}
                  >
                    <td className="px-3 py-3 text-sm text-admin-text-muted font-mono">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-3 py-3 text-sm font-mono text-admin-text-primary">
                      {transaction.userPhone}
                    </td>
                    <td className="px-3 py-3">
                      <InlinePill
                        label={
                          transaction.type === "deposit"
                            ? "Deposit"
                            : "Withdrawal"
                        }
                        tone={getToneForType(transaction.type)}
                      />
                    </td>
                    <td className="px-3 py-3 text-sm text-admin-text-primary">
                      {transaction.type === "deposit" ? "+" : "-"}KES{" "}
                      {transaction.amount.toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        status={getStatusForBadge(transaction.status)}
                      />
                    </td>
                    <td className="px-3 py-3 text-xs text-admin-text-muted">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-white/10 transition-colors">
                            <MoreHorizontal
                              size={16}
                              className="text-admin-text-muted"
                            />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className={adminDropdownContentClassName}
                        >
                          <DropdownMenuItem
                            className={adminDropdownItemClassName}
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
            <AdminDialogContent className="max-w-lg">
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
                      User Phone
                    </label>
                    <p className="text-sm font-semibold">
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
            </AdminDialogContent>
          )}
        </Dialog>
      </AdminCard>

      {/* Pagination */}
      {!isPaymentsLoading && pagination.pages > 1 && (
        <AdminCard>
          <div className="flex items-center justify-between">
            <div className="text-sm text-admin-text-muted">
              Page {currentPage} of {pagination.pages}
            </div>
            <div className="flex gap-2">
              <AdminButton
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                size="sm"
              >
                Previous
              </AdminButton>
              <AdminButton
                onClick={() =>
                  setCurrentPage(Math.min(pagination.pages, currentPage + 1))
                }
                disabled={currentPage === pagination.pages}
                size="sm"
              >
                Next
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
