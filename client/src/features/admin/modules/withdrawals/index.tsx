import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import {
  CheckCircle,
  Download,
  Loader,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/axiosConfig";
import {
  AdminButton,
  AdminCard,
  AdminDialogContent,
  AdminStatCard,
  AdminSectionHeader,
  StatusBadge,
  TableShell,
  adminDropdownContentClassName,
  adminDropdownItemClassName,
  adminInputClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Types ---
type WithdrawalStatus = "pending" | "processing" | "completed" | "failed";

type Withdrawal = {
  id: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  amount: number;
  fee: number;
  totalDebit: number;
  phone: string;
  status: WithdrawalStatus;
  reference?: string;
  mpesaCode?: string | null;
  providerMessage?: string | null;
  createdAt: string;
  processedAt: string | null;
};

type WithdrawalsResponse = {
  withdrawals: Withdrawal[];
};

type FilterStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export default function WithdrawalsAdmin() {
  // --- State ---
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<Withdrawal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [highlightedWithdrawalId, setHighlightedWithdrawalId] = useState<
    string | null
  >(null);
  const [rejectReason, setRejectReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("PENDING");

  const queryClient = useQueryClient();
  const locationHash = useLocation({
    select: (location) => location.hash,
  });

  // --- Queries & Mutations ---
  const { data: withdrawalsData, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", statusFilter],
    queryFn: async () => {
      const response = await api.get<WithdrawalsResponse>(
        "/admin/withdrawals",
        {
          params: { status: statusFilter },
        },
      );
      return response.data;
    },
    refetchInterval: 10000,
  });

  const approveMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const response = await api.patch(
        `/admin/withdrawals/${withdrawalId}/approve`,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Withdrawal approved and payout initiated");
      handleCloseDetails();
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to approve withdrawal",
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (data: { withdrawalId: string; reason: string }) => {
      const response = await api.patch(
        `/admin/withdrawals/${data.withdrawalId}/reject`,
        {
          reason: data.reason,
        },
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Withdrawal rejected successfully");
      handleCloseDetails();
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to reject withdrawal",
      );
    },
  });

  // --- Derived Data & Helpers ---
  const withdrawals = withdrawalsData?.withdrawals ?? [];

  // Optimized stats calculation (Single pass instead of 4 filter/reduce loops)
  const stats = useMemo(() => {
    const { pendingCount, pendingAmount, processingCount, completedCount } =
      withdrawals.reduce(
        (acc, w) => {
          if (w.status === "pending") {
            acc.pendingCount++;
            acc.pendingAmount += w.amount;
          } else if (w.status === "processing") {
            acc.processingCount++;
          } else if (w.status === "completed") {
            acc.completedCount++;
          }
          return acc;
        },
        {
          pendingCount: 0,
          pendingAmount: 0,
          processingCount: 0,
          completedCount: 0,
        },
      );

    return [
      {
        label: "Pending",
        value: String(pendingCount),
        tone: "gold" as const,
      },
      {
        label: "Total Pending Amount",
        value: `KES ${pendingAmount.toLocaleString()}`,
        tone: "accent" as const,
      },
      {
        label: "Processing",
        value: String(processingCount),
        tone: "blue" as const,
      },
      {
        label: "Completed",
        value: String(completedCount),
        tone: "accent" as const,
      },
    ];
  }, [withdrawals]);

  const formatCurrency = (value: number) => `KES ${value.toLocaleString()}`;

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedWithdrawal(null);
    setRejectReason("");
  };

  const openDetails = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setDetailsOpen(true);
  };

  // Implemented Export functionality
  const handleExportCSV = () => {
    if (!withdrawals.length) return toast.error("No data available to export");

    const headers = [
      "User Phone",
      "User ID",
      "Phone",
      "Amount",
      "Fee",
      "Total Debit",
      "Status",
      "Date",
    ];
    const csvRows = withdrawals.map((w) => [
      w.userPhone,
      w.userId,
      w.phone,
      w.amount,
      w.fee,
      w.totalDebit,
      w.status,
      new Date(w.createdAt).toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = `withdrawals_${statusFilter.toLowerCase()}_${new Date().getTime()}.csv`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Effects ---
  useEffect(() => {
    if (!locationHash || withdrawals.length === 0) return;

    const hashValue = locationHash.replace(/^#/, "");
    const targetWithdrawal =
      hashValue === "latest"
        ? withdrawals[0]
        : withdrawals.find((w) => w.id === hashValue);

    if (!targetWithdrawal) return;

    setHighlightedWithdrawalId(targetWithdrawal.id);
    const targetElement = document.querySelector(
      `[data-withdrawal-id="${targetWithdrawal.id}"]`,
    );

    if (targetElement instanceof HTMLElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedWithdrawalId((current) =>
        current === targetWithdrawal.id ? null : current,
      );
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [locationHash, withdrawals]);

  // --- Render ---
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Withdrawals"
        subtitle="Manage user withdrawal requests"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="rounded-2xl border border-admin-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] bg-admin-surface/55 px-3.5 py-2.5 text-sm text-admin-text-primary outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-admin-accent/50"
            >
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
            <AdminButton variant="ghost" onClick={handleExportCSV}>
              <Download size={13} className="mr-2" />
              Export CSV
            </AdminButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
        {stats.map((metric) => (
          <AdminStatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
            helper="Queues and processed requests synced from the payouts pipeline"
          />
        ))}
      </div>

      <AdminCard>
        <TableShell>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="animate-spin text-admin-accent" size={24} />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-admin-text-muted">
              No {statusFilter.toLowerCase()} withdrawals found.
            </div>
          ) : (
            <table className={adminTableClassName}>
              <thead>
                <tr>
                  {[
                    "User",
                    "Phone",
                    "Amount",
                    "Fee",
                    "Total Debit",
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
                {withdrawals.map((withdrawal) => (
                  <tr
                    key={withdrawal.id}
                    data-withdrawal-id={withdrawal.id}
                    onClick={() => openDetails(withdrawal)}
                    className={`even:bg-(--color-bg-elevated) cursor-pointer transition-colors hover:bg-admin-surface/60 ${
                      highlightedWithdrawalId === withdrawal.id
                        ? "bg-admin-accent-dim"
                        : ""
                    }`}
                  >
                    <td
                      className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                    >
                      <div>
                        <p
                          className="max-w-[110px] truncate text-xs"
                          title={withdrawal.userPhone}
                        >
                          {withdrawal.userPhone}
                        </p>
                        <p className="text-[10px] text-admin-text-muted">
                          {withdrawal.userId.slice(0, 8)}...
                        </p>
                      </div>
                    </td>
                    <td className={`${adminTableCellClassName} text-xs`}>
                      {withdrawal.phone}
                    </td>
                    <td
                      className={`${adminTableCellClassName} font-semibold text-admin-accent`}
                    >
                      {formatCurrency(withdrawal.amount)}
                    </td>
                    <td className={`${adminTableCellClassName} text-xs`}>
                      {formatCurrency(withdrawal.fee)}
                    </td>
                    <td className={`${adminTableCellClassName} font-semibold`}>
                      {formatCurrency(withdrawal.totalDebit)}
                    </td>
                    <td className={adminTableCellClassName}>
                      <StatusBadge status={withdrawal.status} />
                    </td>
                    <td
                      className={`${adminTableCellClassName} text-xs text-admin-text-muted`}
                    >
                      {formatDateTime(withdrawal.createdAt)}
                    </td>
                    <td
                      className={adminTableCellClassName}
                      onClick={(e) => e.stopPropagation()} // Prevents row click when interacting with menu
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <AdminButton
                            size="sm"
                            variant="ghost"
                            className="text-admin-text-muted hover:text-admin-text-primary"
                          >
                            <MoreHorizontal size={16} />
                          </AdminButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className={`${adminDropdownContentClassName} w-44`}
                        >
                          <DropdownMenuItem
                            className={adminDropdownItemClassName}
                            onSelect={() => openDetails(withdrawal)}
                          >
                            View details
                          </DropdownMenuItem>
                          {withdrawal.status === "pending" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={`${adminDropdownItemClassName} text-admin-live focus:bg-admin-live/12 focus:text-admin-live`}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  approveMutation.mutate(withdrawal.id);
                                }}
                              >
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className={`${adminDropdownItemClassName} text-admin-red focus:bg-admin-red/12 focus:text-admin-red`}
                                onSelect={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setRejectReason("");
                                  setDetailsOpen(true);
                                }}
                              >
                                Reject...
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>

        <Dialog
          open={detailsOpen && selectedWithdrawal !== null}
          onOpenChange={(open) => !open && handleCloseDetails()}
        >
          <AdminDialogContent className="max-w-md p-0">
            <DialogHeader className="border-b border-admin-border bg-admin-surface/50 px-6 py-5">
              <DialogTitle className="text-lg text-admin-text-primary">
                Withdrawal Request
              </DialogTitle>
              <DialogDescription className="text-xs text-admin-text-muted">
                Review the details below before processing.
              </DialogDescription>
            </DialogHeader>

            {selectedWithdrawal && (
              <div className="flex flex-col">
                <ScrollArea className="max-h-[50vh] px-6 py-5">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                          User Phone
                        </p>
                        <p className="mt-1 text-sm font-medium text-admin-text-primary">
                          {selectedWithdrawal.userPhone}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                          User Phone
                        </p>
                        <p className="mt-1 text-sm text-admin-text-primary">
                          {selectedWithdrawal.userPhone}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                          Withdrawal Phone
                        </p>
                        <p className="mt-1 text-sm font-medium text-admin-text-primary">
                          {selectedWithdrawal.phone}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-admin-border bg-admin-surface p-4">
                      <div className="grid grid-cols-2 gap-y-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                            Amount
                          </p>
                          <p className="mt-1 text-sm font-bold text-admin-text-primary">
                            {formatCurrency(selectedWithdrawal.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                            Fee
                          </p>
                          <p className="mt-1 text-sm text-admin-text-secondary">
                            {formatCurrency(selectedWithdrawal.fee)}
                          </p>
                        </div>
                        <div className="col-span-2 border-t border-admin-border pt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                            Total Debit
                          </p>
                          <p className="mt-1 text-base font-bold text-admin-accent">
                            {formatCurrency(selectedWithdrawal.totalDebit)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                          Status
                        </p>
                        <StatusBadge status={selectedWithdrawal.status} />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                          Requested At
                        </p>
                        <p className="mt-1 text-xs text-admin-text-secondary">
                          {formatDateTime(selectedWithdrawal.createdAt)}
                        </p>
                      </div>
                      {selectedWithdrawal.processedAt && (
                        <div className="col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                            Processed At
                          </p>
                          <p className="mt-1 text-xs text-admin-text-secondary">
                            {formatDateTime(selectedWithdrawal.processedAt)}
                          </p>
                        </div>
                      )}
                      {selectedWithdrawal.reference && (
                        <div className="col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                            Reference
                          </p>
                          <p className="mt-1 text-xs text-admin-text-secondary">
                            {selectedWithdrawal.reference}
                          </p>
                        </div>
                      )}
                      {selectedWithdrawal.providerMessage && (
                        <div className="col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                            Provider Message
                          </p>
                          <p className="mt-1 text-xs text-admin-text-secondary">
                            {selectedWithdrawal.providerMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                {selectedWithdrawal.status === "pending" && (
                  <div className="border-t border-admin-border bg-admin-surface/30 px-6 py-5">
                    <div className="mb-4">
                      <label
                        htmlFor="rejectReason"
                        className="text-xs font-medium text-admin-text-primary"
                      >
                        Rejection Reason{" "}
                        <span className="font-normal text-admin-text-muted">
                          (Optional)
                        </span>
                      </label>
                      <Input
                        id="rejectReason"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter reason if rejecting..."
                        className={`mt-1.5 ${adminInputClassName}`}
                        onKeyDown={(e) => e.stopPropagation()} // Prevents modal from closing if pressing keys
                      />
                    </div>

                    <div className="flex gap-3">
                      <AdminButton
                        onClick={() =>
                          rejectMutation.mutate({
                            withdrawalId: selectedWithdrawal.id,
                            reason: rejectReason,
                          })
                        }
                        disabled={
                          rejectMutation.isPending || approveMutation.isPending
                        }
                        tone="red"
                        variant="ghost"
                        className="flex-1 border-admin-red/35 bg-admin-red/10 text-admin-red hover:bg-admin-red/15"
                      >
                        {rejectMutation.isPending ? (
                          <Loader size={16} className="mr-2 animate-spin" />
                        ) : (
                          <XCircle size={16} className="mr-2" />
                        )}
                        Reject
                      </AdminButton>

                      <AdminButton
                        onClick={() =>
                          approveMutation.mutate(selectedWithdrawal.id)
                        }
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending
                        }
                        className="flex-1"
                      >
                        {approveMutation.isPending ? (
                          <Loader size={16} className="mr-2 animate-spin" />
                        ) : (
                          <CheckCircle size={16} className="mr-2" />
                        )}
                        Approve
                      </AdminButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </AdminDialogContent>
        </Dialog>
      </AdminCard>
    </div>
  );
}
