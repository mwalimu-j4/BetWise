import { Download, Edit, Eye, Filter, Lock, Plus, Search, SlidersHorizontal, Unlock } from "lucide-react";
import { userStats, users } from "../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
  SummaryCard,
  TableShell,
} from "../components/ui";

export default function Users() {
  return (
    <div className="admin-panel">
      <AdminSectionHeader
        title="User Management"
        subtitle="48,291 registered accounts"
        actions={
          <>
            <AdminButton variant="ghost">
              <Download size={13} />
              Export
            </AdminButton>
            <AdminButton>
              <Plus size={13} />
              Add User
            </AdminButton>
          </>
        }
      />

      <div className="admin-grid admin-grid--stats-4">
        {userStats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            tone={stat.tone}
            value={stat.value}
          />
        ))}
      </div>

      <AdminCard>
        <div className="admin-table-toolbar">
          <div className="admin-input-shell">
            <Search size={14} className="admin-text-muted" />
            <input placeholder="Search users..." />
          </div>
          <div className="admin-inline-group">
            <AdminButton variant="ghost">
              <Filter size={13} />
              KYC Status
            </AdminButton>
            <AdminButton variant="ghost">
              <SlidersHorizontal size={13} />
              Risk Level
            </AdminButton>
          </div>
        </div>

        <TableShell>
          <table className="admin-table">
            <thead>
              <tr>
                {[
                  "User ID",
                  "Name",
                  "Email",
                  "Balance",
                  "Bets",
                  "Win Rate",
                  "KYC",
                  "Risk",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="admin-text-blue admin-text-strong admin-text-xs">
                    {user.id}
                  </td>
                  <td className="admin-text-primary admin-text-strong">
                    {user.name}
                  </td>
                  <td>{user.email}</td>
                  <td className="admin-text-accent admin-text-strong">
                    {user.balance}
                  </td>
                  <td>{user.totalBets}</td>
                  <td>{Math.round((user.won / user.totalBets) * 100)}%</td>
                  <td>
                    <StatusBadge status={user.kyc} />
                  </td>
                  <td>
                    <StatusBadge status={user.risk} />
                  </td>
                  <td>
                    <StatusBadge status={user.status} />
                  </td>
                  <td>
                    <div className="admin-inline-group admin-inline-group--tight">
                      <AdminButton size="sm" variant="ghost">
                        <Eye size={11} />
                      </AdminButton>
                      <AdminButton size="sm" variant="ghost">
                        <Edit size={11} />
                      </AdminButton>
                      <AdminButton size="sm" variant="ghost">
                        {user.status === "active" ? (
                          <Lock size={11} />
                        ) : (
                          <Unlock size={11} />
                        )}
                      </AdminButton>
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
