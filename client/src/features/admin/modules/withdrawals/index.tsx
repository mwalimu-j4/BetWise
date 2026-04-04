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
  AdminSectionHeader,
  StatusBadge,
  SummaryCard,
  TableShell,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Withdrawal = {
  id: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  amount: number;
  fee: number;
  totalDebit: number;
  phone: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  processedAt: string | null;
};

type WithdrawalsResponse = {
  withdrawals: Withdrawal[];
};

export default function WithdrawalsAdmin() {
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<Withdrawal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [highlightedWithdrawalId, setHighlightedWithdrawalId] = useState<
    string | null
  >(null);
  const [rejectReason, setRejectReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "PENDING" | "COMPLETED" | "FAILED"
  >("PENDING");
  const queryClient = useQueryClient();
  const locationHash = useLocation({
    select: (location) => location.hash,
  });

  const {
    data: withdrawalsData,
    isLoading,
    refetch,
  } = useQuery({
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
      toast.success("Withdrawal approved successfully");
      setSelectedWithdrawal(null);
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      refetch();
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || "Failed to approve withdrawal";
      toast.error(errorMessage);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (data: { withdrawalId: string; reason: string }) => {
      const response = await api.patch(
        `/admin/withdrawals/${data.withdrawalId}/reject`,
        { reason: data.reason },
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Withdrawal rejected successfully");
      setSelectedWithdrawal(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      refetch();
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || "Failed to reject withdrawal";
      toast.error(errorMessage);
    },
  });

  const withdrawals = withdrawalsData?.withdrawals ?? [];

  const stats = useMemo(() => {
    const pendingCount = withdrawals.filter(
      (w) => w.status === "pending",
    ).length;
    const pendingAmount = withdrawals
      .filter((w) => w.status === "pending")
      .reduce((sum, w) => sum + w.amount, 0);
    const pendingFees = withdrawals
      .filter((w) => w.status === "pending")
      .reduce((sum, w) => sum + w.fee, 0);
    const completedCount = withdrawals.filter(
      (w) => w.status === "completed",
    ).length;

    return [
      {
        label: "Pending",
        value: String(pendingCount),
        tone: "accent" as const,
      },
      {
        label: "Total Pending Amount",
        value: `KES ${pendingAmount.toLocaleString()}`,
        tone: "accent" as const,
      },
      {
        label: "Total Fees (Pending)",
        value: `KES ${pendingFees.toLocaleString()}`,
        tone: "accent" as const,
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
    const date = new Date(dateStr);
    return date.toLocaleString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!locationHash || withdrawals.length === 0) {
      return;
    }

    const hashValue = locationHash.replace(/^#/, "");
    const targetWithdrawal =
      hashValue === "latest"
        ? withdrawals[0]
        : withdrawals.find((withdrawal) => withdrawal.id === hashValue);

    if (!targetWithdrawal) {
      return;
    }

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

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Withdrawals"
        subtitle="Manage user withdrawal requests"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-text-primary outline-none transition hover:border-admin-accent"
            >
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
            <AdminButton variant="ghost">
              <Download size={13} />
              Export CSV
            </AdminButton>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            tone={stat.tone}
            value={stat.value}
          />
        ))}
      </div>

      <AdminCard>
        <TableShell>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="animate-spin" size={24} />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-admin-text-muted">
              No {statusFilter.toLowerCase()} withdrawals
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
                    className={`even:bg-(--color-bg-elevated) transition-colors ${
                      highlightedWithdrawalId === withdrawal.id
                        ? "bg-admin-accent-dim"
                        : ""
                    }`}
                    data-withdrawal-id={withdrawal.id}
                    key={withdrawal.id}
                  >
                    <td
                      className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                    >
                      <div>
                        <p className="text-xs">{withdrawal.userEmail}</p>
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
                    <td className={adminTableCellClassName}>
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
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onSelect={() => {
                              setSelectedWithdrawal(withdrawal);
                              setDetailsOpen(true);
                            }}
                          >
                            View details
                          </DropdownMenuItem>
                          {withdrawal.status === "pending" ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  approveMutation.mutate(withdrawal.id);
                                }}
                              >
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setRejectReason("");
                                  setDetailsOpen(true);
                                }}
                              >
                                Reject
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableShell>

        <Dialog
          open={detailsOpen && selectedWithdrawal !== null}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) {
              setSelectedWithdrawal(null);
              setRejectReason("");
            }
          }}
        >
          <DialogContent className="max-w-md overflow-hidden border-admin-border bg-admin-card p-0 shadow-xl sm:rounded-2xl">
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
                          User Email
                        </p>
                        <p className="mt-1 text-sm font-medium text-admin-text-primary">
                          {selectedWithdrawal.userEmail}
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
                        className="mt-1.5 h-10 border-admin-border bg-admin-card text-sm focus-visible:ring-admin-accent"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() =>
                          rejectMutation.mutate({
                            withdrawalId: selectedWithdrawal.id,
                            reason: rejectReason,
                          })
                        }
                        disabled={
                          rejectMutation.isPending || approveMutation.isPending
                        }
                        variant="outline"
                        className="flex-1 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400"
                      >
                        {rejectMutation.isPending ? (
                          <Loader size={16} className="mr-2 animate-spin" />
                        ) : (
                          <XCircle size={16} className="mr-2" />
                        )}
                        Reject
                      </Button>

                      <Button
                        onClick={() =>
                          approveMutation.mutate(selectedWithdrawal.id)
                        }
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending
                        }
                        className="flex-1 bg-admin-accent text-black hover:opacity-90"
                      >
                        {approveMutation.isPending ? (
                          <Loader size={16} className="mr-2 animate-spin" />
                        ) : (
                          <CheckCircle size={16} className="mr-2" />
                        )}
                        Approve
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AdminCard>
    </div>
  );
}
