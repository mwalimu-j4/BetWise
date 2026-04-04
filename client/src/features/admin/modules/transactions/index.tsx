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

export default function Transactions() {
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
                      <AdminButton size="sm" variant="ghost">
                        <Eye size={11} />
                      </AdminButton>
                      {transaction.status === "pending" ? (
                        <>
                          <AdminButton size="sm" variant="ghost">
                            <CheckCircle size={11} />
                          </AdminButton>
                          <AdminButton size="sm" variant="ghost">
                            <XCircle size={11} />
                          </AdminButton>
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
