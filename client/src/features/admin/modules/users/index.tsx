import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  banUserAction,
  createUserAction,
  updateUserPasswordAction,
  updateUserAction,
  unbanUserAction,
  useGetUserDetail,
  useUsers,
  type User,
} from "@/hooks/useUsers";
import { Eye, EyeOff, MoreVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AdminButton,
  AdminCard,
  AdminDialogContent,
  AdminStatCard,
  AdminSectionHeader,
  StatusBadge,
  TableShell,
  adminDropdownContentClassName,
  adminDropdownItemClassName,
  adminInputClassName,
  adminCompactActionsClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
  truncateEmailForTable,
} from "../../components/ui";

export default function Users() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "banned" | "">("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "edit" | "ban" | "unban" | "changePassword" | "create";
    userId?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    isVerified: false,
  });
  const [passwordData, setPasswordData] = useState({
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
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
    setSelectedUserId(null);
    setEditingUserId(user.id);
    setFormData({
      fullName: user.name || "",
      email: user.email,
      phone: user.phone,
      isVerified: user.isVerified,
    });
    setActionDialog({ type: "edit", userId: user.id });
  };

  const handleOpenBan = (userId: string) => {
    setSelectedUserId(null);
    setActionDialog({ type: "ban", userId });
    setActionReason("");
  };

  const handleOpenUnban = (userId: string) => {
    setSelectedUserId(null);
    setActionDialog({ type: "unban", userId });
  };

  const handleOpenChangePassword = (userId: string) => {
    setSelectedUserId(null);
    setPasswordData({ password: "" });
    setShowPassword(false);
    setActionDialog({ type: "changePassword", userId });
  };

  const handleOpenCreate = () => {
    setSelectedUserId(null);
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
      const payload: any = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        isVerified: formData.isVerified,
      };
      await updateUserAction(editingUserId, payload);
      void refetch();
      setActionDialog(null);
      setEditingUserId(null);
      toast.success("User updated successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.password || !actionDialog?.userId) return;

    if (passwordData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await updateUserPasswordAction(actionDialog.userId, {
        password: passwordData.password,
        confirmPassword: passwordData.password,
      });

      // Verify the response indicates success
      if (!response || !response.user) {
        throw new Error("Invalid response from server");
      }

      void refetch();
      setPasswordData({ password: "" });
      setShowPassword(false);
      setActionDialog(null);
      toast.success("Password updated successfully for " + response.user.email);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password";
      toast.error(message);
      console.error("Password change error:", err);
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
      toast.success("User banned successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to ban user");
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
      toast.success("User unbanned successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to unban user");
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
      toast.success("User created successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleUsers = users || [];

  // Calculate stats
  const totalUsers = total || 0;
  const activeUsers = visibleUsers.filter((u) => u.status === "active").length;
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
            <AdminButton variant="ghost" size="sm" asChild>
              <Link to="/admin/appeals">View Appeals</Link>
            </AdminButton>
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
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-3">
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
            label: "Banned Users",
            value: bannedUsers.toString(),
            tone: "red" as const,
          },
        ].map((metric) => (
          <AdminStatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
            helper="Snapshot of account status across the current results page"
          />
        ))}
      </div>

      {error && (
        <AdminCard className="border-admin-red/40 bg-admin-red-dim/20 text-admin-red">
          {error}
        </AdminCard>
      )}

      {/* Pending Appeals Section */}
      {users.some((u) => u.banAppeal?.status === "PENDING") && (
        <AdminCard className="border-admin-accent/30 bg-gradient-to-br from-[rgba(15,118,110,0.12)] to-[rgba(15,118,110,0.04)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-admin-accent mb-2">
                ⚡ Pending Appeals
              </p>
              <p className="text-sm text-admin-text-primary mb-4">
                Users with pending ban appeals awaiting your review
              </p>
              <div className="space-y-2">
                {users
                  .filter((u) => u.banAppeal?.status === "PENDING")
                  .map((user) => (
                    <Link
                      key={user.id}
                      to="/admin/appeals/$appealId"
                      params={{ appealId: user.banAppeal!.id }}
                      className="flex items-center justify-between rounded-lg border border-admin-accent/20 bg-admin-accent/8 p-3 hover:bg-admin-accent/12 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-admin-text-primary truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-admin-text-muted truncate">
                          {user.banAppeal?.appealText.slice(0, 60)}...
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <div className="inline-flex items-center justify-center rounded-full bg-admin-accent/20 px-3 py-1 group-hover:bg-admin-accent/30 transition-colors">
                          <span className="text-xs font-semibold text-admin-accent">
                            Review →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
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
          className={adminInputClassName}
        />

        <div className="flex gap-2 flex-wrap">
          {(["", "active", "banned"] as const).map((s) => (
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
                    className="cursor-pointer even:bg-(--color-bg-elevated) hover:bg-admin-surface/40"
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
                        className="max-w-30 block truncate"
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
                          <DropdownMenuContent
                            align="end"
                            className={`${adminDropdownContentClassName} w-44`}
                          >
                            <DropdownMenuItem
                              className={adminDropdownItemClassName}
                              onClick={() => handleOpenEdit(user)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={adminDropdownItemClassName}
                              onClick={() => handleOpenChangePassword(user.id)}
                            >
                              Change Password
                            </DropdownMenuItem>
                            {user.status === "active" ? (
                              <DropdownMenuItem
                                onClick={() => handleOpenBan(user.id)}
                                className={`${adminDropdownItemClassName} text-admin-red focus:bg-admin-red/12 focus:text-admin-red`}
                              >
                                Ban User
                              </DropdownMenuItem>
                            ) : user.status === "banned" ? (
                              <DropdownMenuItem
                                className={adminDropdownItemClassName}
                                onClick={() => handleOpenUnban(user.id)}
                              >
                                Unban User
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
        open={!!selectedUserId && actionDialog === null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null);
          }
        }}
      >
        <AdminDialogContent className="max-w-2xl p-0 max-h-none overflow-y-visible">
          <DialogHeader className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-6 py-5">
            <DialogTitle className="text-white">User Details</DialogTitle>
            <DialogDescription className="text-admin-text-secondary">
              Account profile, wallet status, and admin actions.
            </DialogDescription>
          </DialogHeader>

          {userLoading ? (
            <div className="px-6 py-10 text-center text-admin-text-muted text-sm">
              Loading...
            </div>
          ) : selectedUser ? (
            <div className="space-y-4 px-6 py-5">
              {/* Info Grid */}
              <div className="space-y-3 rounded-2xl border border-white/10 bg-[rgba(13,33,55,0.16)] p-4">
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
                  <time className="font-medium text-admin-text-primary">
                    {new Date(selectedUser.createdAt).toLocaleDateString(
                      "en-KE",
                    )}
                  </time>
                </div>
              </div>

              {/* Financial Section */}
              <div className="rounded-2xl border border-[rgba(245,197,24,0.16)] bg-[rgba(13,33,55,0.16)] p-4">
                <p className="mb-3 text-xs font-semibold text-admin-text-muted">
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
              <div className="border-t border-white/10 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <AdminButton
                    onClick={() => handleOpenEdit(selectedUser)}
                    size="sm"
                  >
                    Edit User
                  </AdminButton>
                  <AdminButton
                    onClick={() => handleOpenChangePassword(selectedUser.id)}
                    variant="ghost"
                    size="sm"
                  >
                    Change Password
                  </AdminButton>
                  {selectedUser.status === "active" ? (
                    <AdminButton
                      onClick={() => handleOpenBan(selectedUser.id)}
                      tone="red"
                      size="sm"
                      className="col-span-2"
                    >
                      Ban User
                    </AdminButton>
                  ) : selectedUser.status === "banned" ? (
                    <AdminButton
                      onClick={() => handleOpenUnban(selectedUser.id)}
                      className="col-span-2"
                      size="sm"
                    >
                      Unban User
                    </AdminButton>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-admin-text-muted">
              No user data available
            </div>
          )}
        </AdminDialogContent>
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
        <AdminDialogContent className="max-w-lg">
          <DialogHeader className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-6 py-5">
            <DialogTitle className="text-base">✏️ Edit User</DialogTitle>
            <DialogDescription>
              Update user account information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted mb-2">
                Full Name
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="John Doe"
                className={`${adminInputClassName}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted mb-2">
                Email
              </label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="user@example.com"
                disabled
                className={`${adminInputClassName} opacity-50 cursor-not-allowed`}
              />
              <p className="mt-1.5 text-xs text-admin-text-muted">
                Email cannot be changed
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted mb-2">
                Phone
              </label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+254712345678"
                disabled
                className={`${adminInputClassName} opacity-50 cursor-not-allowed`}
              />
              <p className="mt-1.5 text-xs text-admin-text-muted">
                Phone cannot be changed
              </p>
            </div>
            <div className="rounded-xl border border-admin-accent/20 bg-admin-accent/8 p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isVerified}
                  onChange={(e) =>
                    setFormData({ ...formData, isVerified: e.target.checked })
                  }
                  className="w-4 h-4 accent-admin-accent"
                />
                <span className="text-sm font-medium text-admin-text-primary">
                  Mark as verified
                </span>
              </label>
            </div>
            <div className="flex gap-2 pt-4 border-t border-white/10">
              <AdminButton
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setActionDialog(null);
                  setEditingUserId(null);
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton
                className="flex-1"
                onClick={handleSaveEdit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </AdminButton>
            </div>
          </div>
        </AdminDialogContent>
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
        <AdminDialogContent className="max-w-lg">
          <DialogHeader className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-6 py-5">
            <DialogTitle className="text-base text-admin-red">
              🚫 Ban User
            </DialogTitle>
            <DialogDescription>
              This will restrict the user from accessing the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-6">
            <div className="rounded-xl border border-admin-red/30 bg-admin-red/8 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-admin-red mb-2">
                ⚠️ Warning
              </p>
              <ul className="text-sm text-admin-red/80 space-y-1.5">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>User will be locked out immediately</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>All active sessions will be terminated</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>They can appeal the ban</span>
                </li>
              </ul>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-admin-text-muted mb-2">
                Reason (optional)
              </label>
              <Input
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="E.g., Fraudulent activity, Terms violation..."
                className={`${adminInputClassName}`}
              />
            </div>
            <div className="flex gap-2 pt-4 border-t border-white/10">
              <AdminButton
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setActionDialog(null);
                  setActionReason("");
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton
                tone="red"
                className="flex-1"
                onClick={handleBanUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Banning..." : "Ban User"}
              </AdminButton>
            </div>
          </div>
        </AdminDialogContent>
      </Dialog>

      <Dialog
        open={actionDialog?.type === "unban"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
          }
        }}
      >
        <AdminDialogContent className="max-w-lg">
          <DialogHeader className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-6 py-5">
            <DialogTitle className="text-base">✅ Unban User</DialogTitle>
            <DialogDescription>
              Restore the user's access to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-6">
            <div className="rounded-xl border border-admin-accent/30 bg-admin-accent/8 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-admin-accent mb-2">
                ✓ Confirm Action
              </p>
              <p className="text-sm text-admin-accent/80">
                This will immediately restore the user's access and remove any
                ban restrictions.
              </p>
            </div>
            <div className="flex gap-2 pt-4 border-t border-white/10">
              <AdminButton
                variant="ghost"
                className="flex-1"
                onClick={() => setActionDialog(null)}
              >
                Cancel
              </AdminButton>
              <AdminButton
                className="flex-1"
                onClick={handleUnbanUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Unbanning..." : "Unban User"}
              </AdminButton>
            </div>
          </div>
        </AdminDialogContent>
      </Dialog>

      <Dialog
        open={actionDialog?.type === "changePassword"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
            setPasswordData({ password: "" });
            setShowPassword(false);
          }
        }}
      >
        <AdminDialogContent className="max-w-lg">
          <DialogHeader className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-6 py-5">
            <DialogTitle className="text-base text-admin-text-primary">
              🔐 Change User Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for this user account. They will need to use
              this password to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-6">
            <div className="rounded-xl border border-admin-accent/30 bg-admin-accent/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-admin-accent mb-2">
                Important
              </p>
              <ul className="text-sm text-admin-accent/80 space-y-1.5 list-disc list-inside">
                <li>Password must be at least 6 characters long</li>
                <li>User will need this new password to log in</li>
                <li>Current password cannot be displayed for security</li>
              </ul>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted mb-2 block">
                New Password <span className="text-admin-red">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordData.password}
                  onChange={(e) =>
                    setPasswordData({
                      password: e.target.value,
                    })
                  }
                  placeholder="Enter new password (min 6 characters)"
                  className={`${adminInputClassName} pr-10`}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted hover:text-admin-text-primary transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 bg-admin-border/30 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      passwordData.password.length === 0
                        ? "w-0"
                        : passwordData.password.length < 6
                          ? "w-1/3 bg-admin-red"
                          : passwordData.password.length < 8
                            ? "w-1/2 bg-admin-gold"
                            : passwordData.password.length < 12
                              ? "w-2/3 bg-admin-blue"
                              : "w-full bg-admin-accent"
                    }`}
                  />
                </div>
                <p className="text-xs text-admin-text-muted whitespace-nowrap">
                  {passwordData.password.length === 0
                    ? "—"
                    : passwordData.password.length < 6
                      ? "Too short"
                      : passwordData.password.length < 8
                        ? "Weak"
                        : passwordData.password.length < 12
                          ? "Medium"
                          : "Strong"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-white/10">
              <AdminButton
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setActionDialog(null);
                  setPasswordData({ password: "" });
                  setShowPassword(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </AdminButton>
              <AdminButton
                className="flex-1 bg-admin-accent hover:bg-admin-accent/90"
                onClick={handleChangePassword}
                disabled={
                  !passwordData.password ||
                  passwordData.password.length < 6 ||
                  isSubmitting
                }
              >
                {isSubmitting ? "Updating..." : "Update Password"}
              </AdminButton>
            </div>
          </div>
        </AdminDialogContent>
      </Dialog>

      <Dialog
        open={actionDialog?.type === "create"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
          }
        }}
      >
        <AdminDialogContent className="max-w-lg">
          <DialogHeader className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-6 py-5">
            <DialogTitle className="text-base text-admin-text-primary">
              ➕ Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new user to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted mb-2 block">
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
                className={adminInputClassName}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted mb-2 block">
                Email <span className="text-admin-red">*</span>
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
                className={adminInputClassName}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted mb-2 block">
                Phone (Kenyan) <span className="text-admin-red">*</span>
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
                className={adminInputClassName}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted mb-2 block">
                Password <span className="text-admin-red">*</span>
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
                placeholder="Minimum 6 characters"
                className={adminInputClassName}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted mb-2 block">
                Confirm Password <span className="text-admin-red">*</span>
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
                className={adminInputClassName}
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-admin-accent/30 bg-admin-accent/8 p-3">
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
                className="cursor-pointer"
              />
              <label
                htmlFor="createVerified"
                className="text-sm text-admin-text-primary cursor-pointer flex-1"
              >
                Mark as verified
              </label>
            </div>
            <div className="flex gap-2 pt-4 border-t border-white/10">
              <AdminButton
                variant="ghost"
                className="flex-1"
                onClick={() => setActionDialog(null)}
              >
                Cancel
              </AdminButton>
              <AdminButton
                className="flex-1"
                onClick={handleCreateUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create User"}
              </AdminButton>
            </div>
          </div>
        </AdminDialogContent>
      </Dialog>
    </div>
  );
}
