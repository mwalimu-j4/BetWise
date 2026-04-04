import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Download, Eye, XCircle, Loader } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/axiosConfig";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
  SummaryCard,
  TableShell,
  adminCompactActionsClassName,
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [rejectReason, setRejectReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "PENDING" | "COMPLETED" | "FAILED"
  >("PENDING");
  const queryClient = useQueryClient();

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
                    className="even:bg-[var(--color-bg-elevated)]"
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
                      <div className={adminCompactActionsClassName}>
                        <Dialog>
                          <DialogTrigger asChild>
                            <AdminButton
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedWithdrawal(withdrawal)}
                            >
                              <Eye size={11} />
                            </AdminButton>
                          </DialogTrigger>
                          <DialogContent className="border-admin-border bg-admin-card">
                            <DialogHeader>
                              <DialogTitle>Withdrawal Details</DialogTitle>
                              <DialogDescription>
                                Review and process the withdrawal request
                              </DialogDescription>
                            </DialogHeader>
                            {selectedWithdrawal && (
                              <ScrollArea className="h-auto max-h-[400px] w-full pr-4">
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-xs text-admin-text-muted">
                                      USER EMAIL
                                    </p>
                                    <p className="text-sm font-semibold text-admin-text-primary">
                                      {selectedWithdrawal.userEmail}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-admin-text-muted">
                                      USER PHONE
                                    </p>
                                    <p className="text-sm text-admin-text-primary">
                                      {selectedWithdrawal.userPhone}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-admin-text-muted">
                                      WITHDRAWAL PHONE
                                    </p>
                                    <p className="text-sm text-admin-text-primary">
                                      {selectedWithdrawal.phone}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-admin-text-muted">
                                      AMOUNT
                                    </p>
                                    <p className="text-sm font-semibold text-admin-accent">
                                      {formatCurrency(
                                        selectedWithdrawal.amount,
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-admin-text-muted">
                                      FEE
                                    </p>
                                    <p className="text-sm text-admin-text-primary">
                                      {formatCurrency(selectedWithdrawal.fee)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-admin-text-muted">
                                      TOTAL DEBIT
                                    </p>
                                    <p className="text-sm font-semibold">
                                      {formatCurrency(
                                        selectedWithdrawal.totalDebit,
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-admin-text-muted">
                                      STATUS
                                    </p>
                                    <StatusBadge
                                      status={selectedWithdrawal.status}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-xs text-admin-text-muted">
                                      REQUESTED AT
                                    </p>
                                    <p className="text-sm text-admin-text-primary">
                                      {formatDateTime(
                                        selectedWithdrawal.createdAt,
                                      )}
                                    </p>
                                  </div>
                                  {selectedWithdrawal.processedAt && (
                                    <div>
                                      <p className="text-xs text-admin-text-muted">
                                        PROCESSED AT
                                      </p>
                                      <p className="text-sm text-admin-text-primary">
                                        {formatDateTime(
                                          selectedWithdrawal.processedAt,
                                        )}
                                      </p>
                                    </div>
                                  )}

                                  {selectedWithdrawal.status === "pending" && (
                                    <div className="space-y-3 border-t border-admin-border pt-4">
                                      <div>
                                        <label className="text-xs text-admin-text-muted">
                                          Rejection Reason (Optional)
                                        </label>
                                        <Input
                                          value={rejectReason}
                                          onChange={(e) =>
                                            setRejectReason(e.target.value)
                                          }
                                          placeholder="Enter reason for rejection if applicable"
                                          className="mt-1 border-admin-border bg-admin-surface text-sm"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() =>
                                            approveMutation.mutate(
                                              selectedWithdrawal.id,
                                            )
                                          }
                                          disabled={approveMutation.isPending}
                                          className="flex-1 bg-admin-accent text-black hover:opacity-90"
                                        >
                                          {approveMutation.isPending ? (
                                            <>
                                              <Loader
                                                size={14}
                                                className="mr-2 animate-spin"
                                              />
                                              Approving...
                                            </>
                                          ) : (
                                            <>
                                              <CheckCircle
                                                size={14}
                                                className="mr-2"
                                              />
                                              Approve
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          onClick={() =>
                                            rejectMutation.mutate({
                                              withdrawalId:
                                                selectedWithdrawal.id,
                                              reason: rejectReason,
                                            })
                                          }
                                          disabled={rejectMutation.isPending}
                                          className="flex-1 bg-red-600 hover:bg-red-700"
                                        >
                                          {rejectMutation.isPending ? (
                                            <>
                                              <Loader
                                                size={14}
                                                className="mr-2 animate-spin"
                                              />
                                              Rejecting...
                                            </>
                                          ) : (
                                            <>
                                              <XCircle
                                                size={14}
                                                className="mr-2"
                                              />
                                              Reject
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableShell>
      </AdminCard>
    </div>
  );
}
