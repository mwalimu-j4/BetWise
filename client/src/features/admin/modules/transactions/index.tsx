import { useState } from "react";
import { CheckCircle, Download, Eye, XCircle } from "lucide-react";
import { transactionStats, transactions } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
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

export default function Transactions() {
  const [selectedTxn, setSelectedTxn] = useState<
    (typeof transactions)[0] | null
  >(null);
  const [rejectReason, setRejectReason] = useState("");
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Transactions"
        subtitle="Deposits, withdrawals, and payment review"
        actions={
          <AdminButton variant="ghost">
            <Download size={13} />
            Export CSV
          </AdminButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {transactionStats.map((stat) => (
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
          <table className={adminTableClassName}>
            <thead>
              <tr>
                {[
                  "TXN ID",
                  "User",
                  "Type",
                  "Method",
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
              {transactions.map((transaction) => (
                <tr
                  className="even:bg-[var(--color-bg-elevated)]"
                  key={transaction.id}
                >
                  <td
                    className={`${adminTableCellClassName} text-xs font-semibold text-admin-blue`}
                  >
                    {transaction.id}
                  </td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                  >
                    {transaction.user}
                  </td>
                  <td className={adminTableCellClassName}>
                    <InlinePill
                      label={transaction.type}
                      tone={transaction.type === "deposit" ? "accent" : "red"}
                    />
                  </td>
                  <td className={adminTableCellClassName}>
                    {transaction.method}
                  </td>
                  <td
                    className={`${adminTableCellClassName} font-semibold ${
                      transaction.amount.startsWith("+")
                        ? "text-admin-accent"
                        : "text-admin-red"
                    }`}
                  >
                    {transaction.amount}
                  </td>
                  <td className={adminTableCellClassName}>
                    <StatusBadge status={transaction.status} />
                  </td>
                  <td
                    className={`${adminTableCellClassName} text-xs text-admin-text-muted`}
                  >
                    {transaction.time}
                  </td>
                  <td className={adminTableCellClassName}>
                    <div className={adminCompactActionsClassName}>
                      <Dialog>
                        <DialogTrigger asChild>
                          <AdminButton
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedTxn(transaction)}
                          >
                            <Eye size={11} />
                          </AdminButton>
                        </DialogTrigger>
                        <DialogContent className="border-admin-border bg-admin-card">
                          <DialogHeader>
                            <DialogTitle>Transaction Details</DialogTitle>
                            <DialogDescription>
                              View full transaction information
                            </DialogDescription>
                          </DialogHeader>
                          {selectedTxn && (
                            <ScrollArea className="h-[300px] w-full pr-4">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    TXN ID
                                  </p>
                                  <p className="text-sm font-semibold text-admin-blue">
                                    {selectedTxn.id}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    USER
                                  </p>
                                  <p className="text-sm text-admin-text-primary">
                                    {selectedTxn.user}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    TYPE
                                  </p>
                                  <InlinePill
                                    label={selectedTxn.type}
                                    tone={selectedTxn.type === "deposit" ? "accent" : "red"}
                                  />
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    METHOD
                                  </p>
                                  <p className="text-sm text-admin-text-primary">
                                    {selectedTxn.method}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    AMOUNT
                                  </p>
                                  <p
                                    className={`text-sm font-semibold ${
                                      selectedTxn.amount.startsWith("+")
                                        ? "text-admin-accent"
                                        : "text-admin-red"
                                    }`}
                                  >
                                    {selectedTxn.amount}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    STATUS
                                  </p>
                                  <StatusBadge status={selectedTxn.status} />
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    TIME
                                  </p>
                                  <p className="text-sm text-admin-text-primary">
                                    {selectedTxn.time}
                                  </p>
                                </div>
                              </div>
                            </ScrollArea>
                          )}
                        </DialogContent>
                      </Dialog>
                      {transaction.status === "pending" ? (
                        <>
                          <Dialog>
                            <DialogTrigger asChild>
                              <AdminButton size="sm" variant="ghost">
                                <CheckCircle size={11} />
                              </AdminButton>
                            </DialogTrigger>
                            <DialogContent className="border-admin-border bg-admin-card">
                              <DialogHeader>
                                <DialogTitle>Approve Transaction</DialogTitle>
                                <DialogDescription>
                                  Confirm approval of this transaction
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex gap-2 pt-4">
                                <Button variant="outline" className="flex-1">
                                  Cancel
                                </Button>
                                <Button className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]">
                                  Approve
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Dialog>
                            <DialogTrigger asChild>
                              <AdminButton size="sm" variant="ghost">
                                <XCircle size={11} />
                              </AdminButton>
                            </DialogTrigger>
                            <DialogContent className="border-admin-border bg-admin-card">
                              <DialogHeader>
                                <DialogTitle>Reject Transaction</DialogTitle>
                                <DialogDescription>
                                  This will refund the user and mark as rejected
                                </DialogDescription>
                              </DialogHeader>
                              <div>
                                <label className="text-sm font-semibold text-admin-text-primary">
                                  Reason
                                </label>
                                <Input
                                  placeholder="E.g., Fraud detected, Invalid account"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                />
                              </div>
                              <div className="flex gap-2 pt-4">
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => setRejectReason("")}
                                >
                                  Cancel
                                </Button>
                                <Button className="flex-1 bg-admin-red hover:bg-red-600 text-white">
                                  Reject
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      ) : null}
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
