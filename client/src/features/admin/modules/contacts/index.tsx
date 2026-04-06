import { useState, useMemo } from "react";
import {
  Download,
  Loader,
  Mail,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";
import { useAdminContacts, type Contact } from "../../hooks/useAdminContacts";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Contacts() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "" | "SUBMITTED" | "READ" | "RESOLVED"
  >("");
  const queryClient = useQueryClient();

  const itemsPerPage = 20;

  // Fetch contacts (Search removed)
  const { data: contactsData, isLoading: isContactsLoading } = useAdminContacts(
    itemsPerPage,
    (currentPage - 1) * itemsPerPage,
    statusFilter,
  );

  // Mutation for updating contact status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      contactId,
      newStatus,
    }: {
      contactId: string;
      newStatus: string;
    }) => {
      const { data } = await api.patch(`/admin/contact/${contactId}`, {
        status: newStatus,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
      toast.success("Contact status updated");
      // Keep modal open but update the local selected contact state if needed,
      // or simply rely on the background refetch to update the table behind it.
    },
    onError: () => {
      toast.error("Failed to update contact status");
    },
  });

  const contacts = contactsData?.contacts ?? [];
  const pagination = contactsData?.pagination ?? {
    total: 0,
    limit: itemsPerPage,
    pages: 1,
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!contacts.length) {
      return [
        { label: "Total Messages", value: "0", tone: "blue" as const },
        { label: "Unread", value: "0", tone: "gold" as const },
        { label: "Read", value: "0", tone: "accent" as const },
        { label: "Resolved", value: "0", tone: "emerald" as const },
      ];
    }

    const submitted = contacts.filter((c) => c.status === "SUBMITTED").length;
    const read = contacts.filter((c) => c.status === "READ").length;
    const resolved = contacts.filter((c) => c.status === "RESOLVED").length;

    return [
      {
        label: "Total Messages",
        value: String(pagination.total),
        tone: "blue" as const,
      },
      { label: "Unread", value: String(submitted), tone: "gold" as const },
      { label: "Read", value: String(read), tone: "accent" as const },
      { label: "Resolved", value: String(resolved), tone: "emerald" as const },
    ];
  }, [contacts, pagination.total]);

  const handleDownloadCSV = () => {
    if (!contacts.length) {
      toast.error("No contacts to export");
      return;
    }

    const headers = [
      "ID",
      "Name",
      "Phone",
      "Email",
      "Subject",
      "Message",
      "Status",
      "Date",
    ];
    const rows = contacts.map((c) => [
      c.id,
      c.fullName,
      c.phone,
      c.user?.email || "N/A",
      c.subject,
      c.message.substring(0, 100),
      c.status,
      new Date(c.createdAt).toLocaleString(),
    ]);

    let csv = headers.join(",") + "\n";
    csv += rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Contacts exported successfully");
  };

  const handleRowClick = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailsOpen(true);
  };

  const handleStatusUpdate = (contactId: string, newStatus: string) => {
    updateStatusMutation.mutate({ contactId, newStatus });
    // Optimistically update the selected contact in the modal if it's open
    if (selectedContact?.id === contactId) {
      setSelectedContact({ ...selectedContact, status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Messages"
        subtitle="User contact messages and inquiries"
        actions={
          <AdminButton variant="ghost" onClick={handleDownloadCSV}>
            <Download size={13} className="mr-2" />
            Export CSV
          </AdminButton>
        }
      />

      {/* Summary Stats */}
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

      {/* Filters */}
      <AdminCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-sm font-semibold text-admin-text-muted uppercase shrink-0">
              Filter Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(
                  e.target.value as "" | "SUBMITTED" | "READ" | "RESOLVED",
                );
                setCurrentPage(1);
              }}
              className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-admin-accent flex-1 sm:flex-none min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Unread</option>
              <option value="READ">Read</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
          <div className="text-sm text-admin-text-muted">
            Showing{" "}
            <span className="font-medium text-admin-text-primary">
              {contacts.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-admin-text-primary">
              {pagination.total}
            </span>{" "}
            messages
          </div>
        </div>
      </AdminCard>

      {/* Contacts Table */}
      <AdminCard>
        {isContactsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="h-6 w-6 animate-spin text-admin-accent" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-20 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-admin-text-muted mb-3 opacity-50" />
            <p className="text-admin-text-muted">No messages found.</p>
          </div>
        ) : (
          <TableShell>
            <table className={adminTableClassName}>
              <thead>
                <tr>
                  {[
                    "Name",
                    "Phone",
                    "Subject",
                    "Status",
                    "Date",
                    <span key="actions" className="sr-only">
                      Actions
                    </span>,
                  ].map((heading, idx) => (
                    <th className={adminTableHeadCellClassName} key={idx}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => handleRowClick(contact)}
                    className="group cursor-pointer hover:bg-admin-bg/50 transition-colors duration-200"
                  >
                    <td className={adminTableCellClassName}>
                      <div>
                        <p className="font-semibold text-admin-text-primary group-hover:text-admin-accent transition-colors">
                          {contact.fullName}
                        </p>
                        {contact.user?.email && (
                          <p className="text-xs text-admin-text-muted flex items-center gap-1 mt-0.5">
                            <Mail size={12} />
                            {contact.user.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className={adminTableCellClassName}>
                      <p className="text-sm text-admin-text-primary">
                        {contact.phone}
                      </p>
                    </td>
                    <td className={adminTableCellClassName}>
                      <p className="text-sm text-admin-text-primary truncate max-w-[200px] xl:max-w-xs">
                        {contact.subject}
                      </p>
                    </td>
                    <td className={adminTableCellClassName}>
                      <StatusBadge status={contact.status.toLowerCase()} />
                    </td>
                    <td className={adminTableCellClassName}>
                      <p className="text-sm text-admin-text-muted whitespace-nowrap">
                        {new Date(contact.createdAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </td>
                    <td className={`${adminTableCellClassName} text-right`}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 text-admin-text-muted hover:text-admin-text-primary"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRowClick(contact)}
                          >
                            View Details
                          </DropdownMenuItem>
                          {contact.status !== "READ" &&
                            contact.status !== "RESOLVED" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusUpdate(contact.id, "READ")
                                }
                                className="text-accent"
                              >
                                Mark as Read
                              </DropdownMenuItem>
                            )}
                          {contact.status !== "RESOLVED" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusUpdate(contact.id, "RESOLVED")
                              }
                              className="text-emerald-500"
                            >
                              Mark as Resolved
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
      </AdminCard>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <AdminCard>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <p className="text-sm text-admin-text-muted font-medium">
              Page {currentPage} of {pagination.pages}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.pages, p + 1))
              }
              disabled={currentPage === pagination.pages}
            >
              Next
            </Button>
          </div>
        </AdminCard>
      )}

      {/* Single Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        {selectedContact && (
          <DialogContent className="max-w-2xl bg-admin-card border-admin-border shadow-2xl">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl">Message Details</DialogTitle>
              <DialogDescription>
                Submitted by{" "}
                <span className="font-semibold text-admin-text-primary">
                  {selectedContact.fullName}
                </span>
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-8">
                {/* Contact Info Grid */}
                <div className="grid grid-cols-2 gap-y-6 gap-x-4 bg-admin-bg/50 p-4 rounded-lg border border-admin-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-admin-text-muted tracking-wider uppercase mb-1">
                      Full Name
                    </p>
                    <p className="text-sm font-medium text-admin-text-primary">
                      {selectedContact.fullName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-admin-text-muted tracking-wider uppercase mb-1">
                      Phone Number
                    </p>
                    <p className="text-sm font-medium text-admin-text-primary">
                      {selectedContact.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-admin-text-muted tracking-wider uppercase mb-1">
                      Email Address
                    </p>
                    <p className="text-sm font-medium text-admin-text-primary">
                      {selectedContact.user?.email || "Not Provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-admin-text-muted tracking-wider uppercase mb-1">
                      Current Status
                    </p>
                    <div className="mt-1">
                      <StatusBadge
                        status={selectedContact.status.toLowerCase()}
                      />
                    </div>
                  </div>
                </div>

                {/* Subject & Message */}
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-admin-text-muted tracking-wider uppercase mb-2">
                      Subject
                    </p>
                    <h4 className="text-base font-semibold text-admin-text-primary">
                      {selectedContact.subject}
                    </h4>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-admin-text-muted tracking-wider uppercase mb-2">
                      Message Content
                    </p>
                    <div className="bg-admin-bg p-4 rounded-lg border border-admin-border/50 text-sm text-admin-text-primary whitespace-pre-wrap leading-relaxed">
                      {selectedContact.message}
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-xs font-medium text-admin-text-muted border-t border-admin-border pt-4">
                  Received on{" "}
                  {new Date(selectedContact.createdAt).toLocaleString(
                    undefined,
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Quick Actions Footer */}
            <div className="flex justify-end gap-3 pt-6 border-t border-admin-border mt-2">
              <Button variant="ghost" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
              {selectedContact.status !== "READ" &&
                selectedContact.status !== "RESOLVED" && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      handleStatusUpdate(selectedContact.id, "READ")
                    }
                    disabled={updateStatusMutation.isPending}
                  >
                    Mark as Read
                  </Button>
                )}
              {selectedContact.status !== "RESOLVED" && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() =>
                    handleStatusUpdate(selectedContact.id, "RESOLVED")
                  }
                  disabled={updateStatusMutation.isPending}
                >
                  Resolve Inquiry
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
