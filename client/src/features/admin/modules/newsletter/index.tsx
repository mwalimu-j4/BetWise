import { useState } from "react";
import { Download, Loader, Mail, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useAdminNewsletter } from "../../hooks/useAdminNewsletter";
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
  truncateEmailForTable,
} from "../../components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function Newsletter() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">(
    "active",
  );
  const [itemsPerPage] = useState(20);

  const { data, isLoading, error } = useAdminNewsletter(
    currentPage,
    itemsPerPage,
    statusFilter === "active",
  );

  const subscribers = data?.subscribers || [];
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };

  const handleExport = () => {
    if (!subscribers.length) {
      toast.error("No subscribers to export");
      return;
    }

    const csv = [
      ["Email", "Status", "Subscribed At", "Unsubscribed At"].join(","),
      ...subscribers.map((sub: any) =>
        [
          `"${sub.email}"`,
          sub.isActive ? "Active" : "Inactive",
          new Date(sub.subscribedAt).toLocaleDateString(),
          sub.unsubscribedAt
            ? new Date(sub.unsubscribedAt).toLocaleDateString()
            : "—",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Subscribers exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminSectionHeader
        title="Newsletter Subscribers"
        subtitle="Manage newsletter subscriptions and view subscriber analytics"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <SummaryCard
          label="Total Subscribers"
          value={(pagination.total ?? 0).toLocaleString()}
          tone="accent"
        />
        <SummaryCard
          label="Active Subscriptions"
          value={
            subscribers.filter((s: any) => s.isActive).length === 0
              ? "0"
              : String(subscribers.filter((s: any) => s.isActive).length)
          }
          tone="accent"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-admin-text-primary">
            Filter:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "active" | "inactive");
              setCurrentPage(1);
            }}
            className="rounded-lg border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-text-primary outline-none transition focus:border-admin-accent"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <AdminButton
          onClick={handleExport}
          disabled={isLoading}
          className="sm:w-auto"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </AdminButton>
      </div>

      {/* Table */}
      <AdminCard className="overflow-hidden p-0">
        <TableShell>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-admin-accent" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-admin-text-secondary">
              <p>Failed to load subscribers</p>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="py-8 text-center text-admin-text-secondary">
              <p>No {statusFilter} subscribers found</p>
            </div>
          ) : (
            <>
              <table className={adminTableClassName}>
                <thead>
                  <tr>
                    <th className={adminTableHeadCellClassName}>Email</th>
                    <th className={adminTableHeadCellClassName}>Status</th>
                    <th className={adminTableHeadCellClassName}>Subscribed</th>
                    <th className={adminTableHeadCellClassName}>
                      Unsubscribed
                    </th>
                    <th className={adminTableHeadCellClassName}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber: any) => (
                    <tr key={subscriber.id}>
                      <td className={adminTableCellClassName}>
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-admin-text-muted" />
                          <span
                            className="max-w-[130px] truncate font-medium text-admin-text-primary"
                            title={subscriber.email}
                          >
                            {truncateEmailForTable(subscriber.email)}
                          </span>
                        </div>
                      </td>
                      <td className={adminTableCellClassName}>
                        <StatusBadge
                          status={
                            (subscriber.isActive ? "active" : "inactive") as any
                          }
                        />
                      </td>
                      <td className={adminTableCellClassName}>
                        <span className="text-sm text-admin-text-secondary">
                          {new Date(
                            subscriber.subscribedAt,
                          ).toLocaleDateString()}
                        </span>
                      </td>
                      <td className={adminTableCellClassName}>
                        <span className="text-sm text-admin-text-secondary">
                          {subscriber.unsubscribedAt
                            ? new Date(
                                subscriber.unsubscribedAt,
                              ).toLocaleDateString()
                            : "—"}
                        </span>
                      </td>
                      <td className={adminTableCellClassName}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal size={16} />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(subscriber.email);
                                toast.success("Email copied to clipboard");
                              }}
                            >
                              Copy Email
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="border-t border-admin-border px-6 py-4">
                  <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <span className="text-sm text-admin-text-secondary">
                      Page {pagination.page} of {pagination.totalPages} •
                      Showing {subscribers.length} of {pagination.total}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="rounded-lg border border-admin-border bg-admin-card px-3 py-2 text-sm font-medium text-admin-text-primary transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-admin-hover"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage((p) =>
                            Math.min(pagination.totalPages, p + 1),
                          )
                        }
                        disabled={currentPage === pagination.totalPages}
                        className="rounded-lg border border-admin-border bg-admin-card px-3 py-2 text-sm font-medium text-admin-text-primary transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-admin-hover"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </TableShell>
      </AdminCard>
    </div>
  );
}
