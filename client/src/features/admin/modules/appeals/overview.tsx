import { Link } from "@tanstack/react-router";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
} from "../../components/ui";
import { useAdminBanAppeals } from "@/hooks/useBanAppeals";

export default function BanAppealsOverviewPage() {
  const { appeals, loading, error } = useAdminBanAppeals(20, 0, "all");

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Ban Appeals"
        subtitle="Monitor incoming appeals and open any case for review."
      />

      {error && (
        <AdminCard className="border-admin-red/40 bg-admin-red-dim/20 text-admin-red">
          {error}
        </AdminCard>
      )}

      <AdminCard>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-sm font-semibold text-admin-text-primary">
              Recent Appeals
            </p>
            <p className="text-xs text-admin-text-muted">
              Click an appeal to open the dedicated review page.
            </p>
          </div>
          <AdminButton variant="ghost" asChild>
            <Link to="/admin/users">Back to Users</Link>
          </AdminButton>
        </div>

        {loading ? (
          <div className="py-10 text-center text-admin-text-muted">
            Loading appeals...
          </div>
        ) : appeals.length === 0 ? (
          <div className="py-10 text-center text-admin-text-muted">
            No appeals found.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {appeals.map((appeal) => (
              <Link
                key={appeal.id}
                to="/admin/appeals/$appealId"
                params={{ appealId: appeal.id }}
                className="block rounded-2xl border border-white/10 bg-[rgba(13,33,55,0.16)] p-4 transition-colors hover:border-admin-accent/40 hover:bg-[rgba(13,33,55,0.24)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-admin-text-primary">
                        {appeal.user?.fullName ||
                          appeal.user?.email ||
                          appeal.userId}
                      </p>
                      <StatusBadge
                        status={
                          appeal.status === "PENDING"
                            ? "pending"
                            : appeal.status === "APPROVED"
                              ? "active"
                              : "banned"
                        }
                      />
                    </div>
                    <p className="line-clamp-2 text-sm text-admin-text-secondary">
                      {appeal.appealText}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-admin-text-muted">
                    {new Date(appeal.createdAt).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
