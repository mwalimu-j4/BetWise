import { Link, useNavigate } from "@tanstack/react-router";
import {
  AdminCard,
  AdminStatCard,
  AdminSectionHeader,
  StatusBadge,
} from "../../components/ui";
import { Loader } from "lucide-react";

export default function BanAppealsOverviewPage() {
  const navigate = useNavigate();
  const { appeals, loading, error } = useAdminBanAppeals(1, 20, "all");

  const pendingCount = appeals.filter((a) => a.status === "PENDING").length;
  const approvedCount = appeals.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = appeals.filter((a) => a.status === "REJECTED").length;
  const totalCount = appeals.length;

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Ban Appeals"
        subtitle="Monitor incoming appeals and open any case for review."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminStatCard
          label="Total Appeals"
          value={totalCount.toString()}
          tone="blue"
        />
        <AdminStatCard
          label="Pending"
          value={pendingCount.toString()}
          tone="accent"
        />
        <AdminStatCard
          label="Approved"
          value={approvedCount.toString()}
          tone="accent"
        />
        <AdminStatCard
          label="Rejected"
          value={rejectedCount.toString()}
          tone="red"
        />
      </div>

      {error && (
        <AdminCard className="border-admin-red/40 bg-admin-red-dim/20 text-admin-red">
          {error}
        </AdminCard>
      )}

      <AdminCard className="overflow-hidden p-0">
        <TableShell>
          {loading ? (
            <div className="py-20 text-center">
              <Loader className="mx-auto h-6 w-6 animate-spin text-admin-accent" />
              <p className="mt-2 text-sm text-admin-text-muted">Loading appeals...</p>
            </div>
          ) : appeals.length === 0 ? (
            <div className="py-20 text-center text-admin-text-muted">
              No appeals found.
            </div>
          ) : (
            <table className={adminTableClassName}>
              <thead>
                <tr>
                  <th className={adminTableHeadCellClassName}>User</th>
                  <th className={adminTableHeadCellClassName}>Status</th>
                  <th className={adminTableHeadCellClassName}>Appeal Text</th>
                  <th className={adminTableHeadCellClassName}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {appeals.map((appeal) => (
                  <tr
                    key={appeal.id}
                    className="group hover:bg-admin-surface/20 transition-colors cursor-pointer"
                    onClick={() => navigate({ to: "/admin/appeals/$appealId", params: { appealId: appeal.id } })}
                  >
                    <td className={adminTableCellClassName}>
                      <p className="font-semibold text-admin-text-primary">
                        {appeal.user?.fullName || appeal.user?.email || "Unknown"}
                      </p>
                      <p className="text-[10px] text-admin-text-muted font-mono">{appeal.userId}</p>
                    </td>
                    <td className={adminTableCellClassName}>
                      <StatusBadge
                        status={
                          appeal.status === "PENDING"
                            ? "pending"
                            : appeal.status === "APPROVED"
                              ? "active"
                              : "banned"
                        }
                      />
                    </td>
                    <td className={adminTableCellClassName}>
                      <p className="line-clamp-1 max-w-xs text-admin-text-secondary">
                        {appeal.appealText}
                      </p>
                    </td>
                    <td className={adminTableCellClassName}>
                      <span className="whitespace-nowrap text-xs text-admin-text-muted">
                        {new Date(appeal.createdAt).toLocaleString()}
                      </span>
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
