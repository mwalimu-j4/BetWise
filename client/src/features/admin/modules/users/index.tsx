import { useState } from "react";
import { MoreVertical, RefreshCw } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
  TableShell,
  adminCompactActionsClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
  truncateEmailForTable,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useUsers,
  useGetUserDetail,
  banUserAction,
  unbanUserAction,
  suspendUserAction,
  unsuspendUserAction,
  updateUserAction,
  createUserAction,
  type User,
} from "@/hooks/useUsers";

export default function Users() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "suspended" | "banned" | "">(
    "",
  );
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "edit" | "ban" | "unban" | "suspend" | "unsuspend" | "create";
    userId?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    isVerified: false,
    accountStatus: "ACTIVE" as "ACTIVE" | "SUSPENDED",
  });
  const [createFormData, setCreateFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    isVerified: false,
    accountStatus: "ACTIVE" as "ACTIVE" | "SUSPENDED",
  });
  const [actionReason, setActionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { users, loading, error, refetch, total } = useUsers({
    page,
    search,
    status,
    limit: 50,
  });

  const { user: selectedUser, loading: userLoading } = useGetUserDetail(
    selectedUserId || "",
  );

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      fullName: user.name || "",
      email: user.email,
      phone: user.phone,
      isVerified: user.isVerified,
      accountStatus:
        user.status === "suspended"
          ? "SUSPENDED"
          : user.status === "banned"
            ? "ACTIVE"
            : "ACTIVE",
    });
    setActionDialog({ type: "edit", userId: user.id });
  };

  const handleOpenBan = (userId: string) => {
    setActionDialog({ type: "ban", userId });
    setActionReason("");
  };

  const handleOpenUnban = (userId: string) => {
    setActionDialog({ type: "unban", userId });
  };

  const handleOpenSuspend = (userId: string) => {
    setActionDialog({ type: "suspend", userId });
    setActionReason("");
  };

  const handleOpenUnsuspend = (userId: string) => {
    setActionDialog({ type: "unsuspend", userId });
  };

  const handleOpenCreate = () => {
    setCreateFormData({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      isVerified: false,
      accountStatus: "ACTIVE",
    });
    setActionDialog({ type: "create" });
  };

  const handleSaveEdit = async () => {
    if (!editingUserId) return;
    setIsSubmitting(true);
    try {
      await updateUserAction(editingUserId, formData);
      void refetch();
      setActionDialog(null);
      setEditingUserId(null);
    } catch {
      alert("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBanUser = async () => {
    if (!actionDialog?.userId) return;
    setIsSubmitting(true);
    try {
      await banUserAction(actionDialog.userId, actionReason);
      void refetch();
      setSelectedUserId(null);
      setActionDialog(null);
    } catch {
      alert("Failed to ban user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!actionDialog?.userId) return;
    setIsSubmitting(true);
    try {
      await unbanUserAction(actionDialog.userId);
      void refetch();
      setSelectedUserId(null);
      setActionDialog(null);
    } catch {
      alert("Failed to unban user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!actionDialog?.userId) return;
    setIsSubmitting(true);
    try {
      await suspendUserAction(actionDialog.userId, actionReason);
      void refetch();
      setSelectedUserId(null);
      setActionDialog(null);
    } catch {
      alert("Failed to suspend user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsuspendUser = async () => {
    if (!actionDialog?.userId) return;
    setIsSubmitting(true);
    try {
      await unsuspendUserAction(actionDialog.userId);
      void refetch();
      setSelectedUserId(null);
      setActionDialog(null);
    } catch {
      alert("Failed to unsuspend user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async () => {
    setIsSubmitting(true);
    try {
      await createUserAction(createFormData);
      void refetch();
      setActionDialog(null);
    } catch {
      alert("Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleUsers = users || [];

  // Calculate stats
  const totalUsers = total || 0;
  const activeUsers = visibleUsers.filter((u) => u.status === "active").length;
  const suspendedUsers = visibleUsers.filter(
    (u) => u.status === "suspended",
  ).length;
  const bannedUsers = visibleUsers.filter((u) => u.status === "banned").length;

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Users"
        subtitle="Manage user accounts and permissions"
        actions={
          <>
            {/* <AdminButton
              variant="ghost"
              size="sm"
              onClick={() => void refetch()}
            >
              <RefreshCw size={13} />
              Refresh
            </AdminButton> */}
            <AdminButton
              variant="solid"
              size="sm"
              onClick={handleOpenCreate}
              className="bg-admin-accent hover:bg-admin-accent/90"
            >
              Add User
            </AdminButton>
          </>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
        {[
          {
            label: "Total Users",
            value: totalUsers.toString(),
            tone: "blue" as const,
          },
          {
            label: "Active Users",
            value: activeUsers.toString(),
            tone: "accent" as const,
          },
          {
            label: "Suspended Users",
            value: suspendedUsers.toString(),
            tone: "gold" as const,
          },
          {
            label: "Banned Users",
            value: bannedUsers.toString(),
            tone: "red" as const,
          },
        ].map((metric) => {
          const colorMap: Record<
            string,
            { bg: string; text: string; icon: string; border: string }
          > = {
            accent: {
              bg: "bg-admin-accent/5",
              text: "text-admin-accent",
              icon: "bg-admin-accent/15 text-admin-accent",
              border: "border-admin-accent/20",
            },
            blue: {
              bg: "bg-admin-blue/5",
              text: "text-admin-blue",
              icon: "bg-admin-blue/15 text-admin-blue",
              border: "border-admin-blue/20",
            },
            gold: {
              bg: "bg-admin-gold/5",
              text: "text-admin-gold",
              icon: "bg-admin-gold/15 text-admin-gold",
              border: "border-admin-gold/20",
            },
            red: {
              bg: "bg-red-500/5",
              text: "text-red-500",
              icon: "bg-red-500/15 text-red-500",
              border: "border-red-500/20",
            },
          };

          const colors = colorMap[metric.tone] || colorMap.accent;

          return (
            <AdminCard
              key={metric.label}
              className={`border ${colors.border} p-2.5 transition hover:border-opacity-50 sm:p-3`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted sm:text-[9px]">
                    {metric.label}
                  </p>
                  <div className={`rounded p-1 shrink-0 ${colors.icon}`}>
                    <div className="h-3 w-3" />
                  </div>
                </div>
                <p className={`text-base font-bold sm:text-lg ${colors.text}`}>
                  {metric.value}
                </p>
              </div>
            </AdminCard>
          );
        })}
      </div>

      {error && (
        <AdminCard className="border-admin-red/40 bg-admin-red-dim/20 text-admin-red">
          {error}
        </AdminCard>
      )}

      <div className="space-y-4">
        <Input
          placeholder="Search by email, name, or phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border-admin-border bg-admin-surface text-admin-text-primary"
        />

        <div className="flex gap-2 flex-wrap">
          {(["", "active", "suspended", "banned"] as const).map((s) => (
            <AdminButton
              key={s}
              variant={status === s ? "solid" : "ghost"}
              size="sm"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s === "" ? "All Users" : s.charAt(0).toUpperCase() + s.slice(1)}
            </AdminButton>
          ))}
        </div>
      </div>

      {loading && users.length === 0 ? (
        <AdminCard className="text-center py-8 text-admin-text-muted">
          Loading users...
        </AdminCard>
      ) : visibleUsers.length === 0 ? (
        <AdminCard className="text-center py-8 text-admin-text-muted">
          No users found
        </AdminCard>
      ) : (
        <AdminCard>
          <TableShell>
            <table className={adminTableClassName}>
              <thead>
                <tr>
                  {[
                    "No.",
                    "Email",
                    "Phone",
                    "Status",
                    "Balance",
                    "Verified",
                    "Created",
                    "Actions",
                  ].map((heading) => (
                    <th className={adminTableHeadCellClassName} key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className="even:bg-[var(--color-bg-elevated)] cursor-pointer hover:bg-admin-surface/40"
                    onClick={() => handleUserClick(user.id)}
                  >
                    <td
                      className={`${adminTableCellClassName} font-semibold text-admin-text-muted`}
                    >
                      {(page - 1) * 50 + index + 1}
                    </td>
                    <td
                      className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                    >
                      <span
                        className="max-w-[120px] truncate block"
                        title={user.email}
                      >
                        {truncateEmailForTable(user.email)}
                      </span>
                    </td>
                    <td className={adminTableCellClassName}>{user.phone}</td>
                    <td className={adminTableCellClassName}>
                      <StatusBadge status={user.status} />
                    </td>
                    <td
                      className={`${adminTableCellClassName} font-semibold text-admin-accent`}
                    >
                      KES {user.balance.toLocaleString()}
                    </td>
                    <td className={adminTableCellClassName}>
                      {user.isVerified ? (
                        <span className="text-xs font-semibold text-admin-accent">
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-admin-text-muted">
                          No
                        </span>
                      )}
                    </td>
                    <td
                      className={`${adminTableCellClassName} text-xs text-admin-text-muted`}
                    >
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className={adminTableCellClassName}>
                      <div className={adminCompactActionsClassName}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <AdminButton size="sm" variant="ghost">
                              <MoreVertical size={14} />
                            </AdminButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(user)}
                            >
                              Edit
                            </DropdownMenuItem>
                            {user.status === "active" ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleOpenSuspend(user.id)}
                                >
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenBan(user.id)}
                                  className="text-admin-red"
                                >
                                  Ban
                                </DropdownMenuItem>
                              </>
                            ) : user.status === "suspended" ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleOpenUnsuspend(user.id)}
                                >
                                  Unsuspend
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenBan(user.id)}
                                  className="text-admin-red"
                                >
                                  Ban
                                </DropdownMenuItem>
                              </>
                            ) : user.status === "banned" ? (
                              <DropdownMenuItem
                                onClick={() => handleOpenUnban(user.id)}
                              >
                                Unban
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </AdminCard>
      )}

      <Dialog
        open={!!selectedUserId && !actionDialog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null);
          }
        }}
      >
        <DialogContent className="border-admin-border bg-admin-card max-w-lg">
          <DialogHeader className="border-b border-admin-border pb-3">
            <DialogTitle className="text-lg">User Details</DialogTitle>
            <DialogDescription className="text-xs">
              View and manage user account
            </DialogDescription>
          </DialogHeader>

          {userLoading ? (
            <div className="text-center py-6 text-admin-text-muted text-sm">
              Loading...
            </div>
          ) : selectedUser ? (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-3">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-admin-text-muted font-semibold">
                    Email
                  </p>
                  <p className="text-sm text-admin-text-primary truncate">
                    {selectedUser.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-admin-text-muted font-semibold">
                    Phone
                  </p>
                  <p className="text-sm text-admin-text-primary">
                    {selectedUser.phone}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-admin-text-muted font-semibold">
                    Full Name
                  </p>
                  <p className="text-sm text-admin-text-primary">
                    {selectedUser.name || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-admin-text-muted font-semibold">
                    Status
                  </p>
                  <StatusBadge status={selectedUser.status} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-admin-text-muted font-semibold">
                    Verified
                  </p>
                  <p className="text-sm font-medium">
                    {selectedUser.isVerified ? (
                      <span className="text-admin-accent">✓ Yes</span>
                    ) : (
                      <span className="text-admin-text-muted">No</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-admin-text-muted font-semibold">
                    Created
                  </p>
                  <p className="text-sm text-admin-text-primary text-xs">
                    {new Date(selectedUser.createdAt).toLocaleDateString(
                      "en-KE",
                    )}
                  </p>
                </div>
              </div>

              {/* Financial Section */}
              <div className="border-t border-admin-border pt-3">
                <p className="text-xs font-semibold text-admin-text-muted mb-2">
                  FINANCIAL
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-admin-text-muted">Balance</p>
                    <p className="text-sm font-bold text-admin-accent">
                      KES {selectedUser.balance.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-admin-text-muted">Total Bets</p>
                    <p className="text-sm font-bold text-admin-blue">
                      {selectedUser.totalBets}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-admin-border pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleOpenEdit(selectedUser)}
                    className="bg-admin-accent hover:bg-admin-accent/90 text-white font-semibold"
                    size="sm"
                  >
                    Edit
                  </Button>
                  {selectedUser.status === "active" ? (
                    <>
                      <Button
                        onClick={() => handleOpenSuspend(selectedUser.id)}
                        variant="outline"
                        size="sm"
                      >
                        Suspend
                      </Button>
                      <Button
                        onClick={() => handleOpenBan(selectedUser.id)}
                        className="bg-admin-red hover:bg-red-600 text-white font-semibold"
                        size="sm"
                      >
                        Ban
                      </Button>
                    </>
                  ) : selectedUser.status === "suspended" ? (
                    <>
                      <Button
                        onClick={() => handleOpenUnsuspend(selectedUser.id)}
                        variant="outline"
                        size="sm"
                      >
                        Unsuspend
                      </Button>
                      <Button
                        onClick={() => handleOpenBan(selectedUser.id)}
                        className="bg-admin-red hover:bg-red-600 text-white font-semibold"
                        size="sm"
                      >
                        Ban
                      </Button>
                    </>
                  ) : selectedUser.status === "banned" ? (
                    <Button
                      onClick={() => handleOpenUnban(selectedUser.id)}
                      className="col-span-2 bg-admin-accent hover:bg-admin-accent/90 text-white font-semibold"
                      size="sm"
                    >
                      Unban
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-admin-text-muted">
              No user data available
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={actionDialog?.type === "edit" && !!actionDialog?.userId}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
            setEditingUserId(null);
          }
        }}
      >
        <DialogContent className="border-admin-border bg-admin-card">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
                Full Name
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="John Doe"
                className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
                Email
              </label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="user@example.com"
                disabled
                className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary opacity-50"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
                Phone
              </label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+254712345678"
                disabled
                className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary opacity-50"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="verified"
                checked={formData.isVerified}
                onChange={(e) =>
                  setFormData({ ...formData, isVerified: e.target.checked })
                }
              />
              <label
                htmlFor="verified"
                className="text-sm text-admin-text-primary"
              >
                Verified
              </label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setActionDialog(null);
                  setEditingUserId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-admin-accent hover:bg-admin-accent/90 text-white"
                onClick={handleSaveEdit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={actionDialog?.type === "ban"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
            setActionReason("");
          }
        }}
      >
        <DialogContent className="border-admin-border bg-admin-card">
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              This will permanently ban the user from the platform
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-semibold text-admin-text-primary">
              Reason (optional)
            </label>
            <Input
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="E.g., Fraudulent activity"
              className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setActionDialog(null);
                setActionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-admin-red hover:bg-red-600 text-white"
              onClick={handleBanUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Banning..." : "Ban User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={actionDialog?.type === "unban"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
          }
        }}
      >
        <DialogContent className="border-admin-border bg-admin-card">
          <DialogHeader>
            <DialogTitle>Unban User</DialogTitle>
            <DialogDescription>
              This will restore the user's access to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setActionDialog(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-admin-accent hover:bg-admin-accent/90 text-white"
              onClick={handleUnbanUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Unbanning..." : "Unban User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={actionDialog?.type === "suspend"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
            setActionReason("");
          }
        }}
      >
        <DialogContent className="border-admin-border bg-admin-card">
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Suspended users cannot access the platform until unsuspended
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-semibold text-admin-text-primary">
              Reason (optional)
            </label>
            <Input
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="E.g., Suspicious activity"
              className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setActionDialog(null);
                setActionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-admin-gold hover:bg-yellow-600 text-white"
              onClick={handleSuspendUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Suspending..." : "Suspend User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={actionDialog?.type === "unsuspend"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
          }
        }}
      >
        <DialogContent className="border-admin-border bg-admin-card">
          <DialogHeader>
            <DialogTitle>Unsuspend User</DialogTitle>
            <DialogDescription>
              This will restore the user's access to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setActionDialog(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-admin-accent hover:bg-admin-accent/90 text-white"
              onClick={handleUnsuspendUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Unsuspending..." : "Unsuspend User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={actionDialog?.type === "create"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
          }
        }}
      >
        <DialogContent className="border-admin-border bg-admin-card max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
                Full Name (optional)
              </label>
              <Input
                value={createFormData.fullName}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    fullName: e.target.value,
                  })
                }
                placeholder="John Doe"
                className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
                Email *
              </label>
              <Input
                value={createFormData.email}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    email: e.target.value,
                  })
                }
                placeholder="user@example.com"
                type="email"
                className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
                Phone (Kenyan) *
              </label>
              <Input
                value={createFormData.phone}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    phone: e.target.value,
                  })
                }
                placeholder="+254712345678 or 0712345678"
                className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
                Password *
              </label>
              <Input
                value={createFormData.password}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    password: e.target.value,
                  })
                }
                type="password"
                placeholder="Minimum 8 characters"
                className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
                Confirm Password *
              </label>
              <Input
                value={createFormData.confirmPassword}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    confirmPassword: e.target.value,
                  })
                }
                type="password"
                placeholder="Confirm password"
                className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createVerified"
                checked={createFormData.isVerified}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    isVerified: e.target.checked,
                  })
                }
              />
              <label
                htmlFor="createVerified"
                className="text-sm text-admin-text-primary"
              >
                Mark as verified
              </label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setActionDialog(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-admin-accent hover:bg-admin-accent/90 text-white"
                onClick={handleCreateUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
