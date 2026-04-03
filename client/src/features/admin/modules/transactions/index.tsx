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
} from "../../components/ui";

export default function Transactions() {
  return (
    <div className="admin-panel">
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

      <div className="admin-grid admin-grid--stats-4">
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
          <table className="admin-table">
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
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="admin-text-blue admin-text-strong admin-text-xs">
                    {transaction.id}
                  </td>
                  <td className="admin-text-primary admin-text-strong">
                    {transaction.user}
                  </td>
                  <td>
                    <InlinePill
                      label={transaction.type}
                      tone={transaction.type === "deposit" ? "accent" : "red"}
                    />
                  </td>
                  <td>{transaction.method}</td>
                  <td
                    className={
                      transaction.amount.startsWith("+")
                        ? "admin-text-accent admin-text-strong"
                        : "admin-text-red admin-text-strong"
                    }
                  >
                    {transaction.amount}
                  </td>
                  <td>
                    <StatusBadge status={transaction.status} />
                  </td>
                  <td className="admin-text-muted admin-text-xs">
                    {transaction.time}
                  </td>
                  <td>
                    <div className="admin-inline-group admin-inline-group--tight">
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
