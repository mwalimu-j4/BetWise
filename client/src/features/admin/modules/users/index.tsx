import {
  Dialog,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
    oldPassword: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [confirmPasswordDialog, setConfirmPasswordDialog] = useState(false);
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

  const handleOpenChangePassword = (userId: string) => {
    setPasswordData({ oldPassword: "", password: "" });
    setShowPassword(false);
    setShowOldPassword(false);
    setActionDialog({ type: "changePassword", userId });
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

  const handleChangePassword = () => {
    if (!passwordData.password) return;
    setConfirmPasswordDialog(true);
  };

  const handleConfirmPasswordChange = async () => {
    if (!actionDialog?.userId) return;
    setIsSubmitting(true);
    try {
      await updateUserPasswordAction(actionDialog.userId, {
        password: passwordData.password,
        confirmPassword: passwordData.password,
      });
      setPasswordData({ password: "" });
      setShowPassword(false);
      setConfirmPasswordDialog(false);
      setActionDialog(null);
      toast.success("Password updated successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to change password");
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
        open={!!selectedUserId && !actionDialog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null);
          }
        }}
      >
        <AdminDialogContent className="max-w-2xl p-0">
          <DialogHeader className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-6 py-5">
            <DialogTitle className="text-lg text-white">
              User Details
            </DialogTitle>
            <DialogDescription className="text-sm text-admin-text-secondary">
              Account profile, wallet status, and admin actions.
            </DialogDescription>
          </DialogHeader>

          {userLoading ? (
            <div className="px-6 py-10 text-center text-admin-text-muted text-sm">
              Loading...
            </div>
          ) : selectedUser ? (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-6 py-5">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[rgba(13,33,55,0.16)] p-4">
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
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
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
                className={`mt-2 ${adminInputClassName}`}
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
                className={`mt-2 ${adminInputClassName} opacity-50`}
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
                className={`mt-2 ${adminInputClassName} opacity-50`}
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[rgba(13,33,55,0.16)] p-3">
              <input
                type="checkbox"
                id="verified"
                checked={formData.isVerified}
                onChange={(e) =>
                  setFormData({ ...formData, isVerified: e.target.checked })
                }
                className="cursor-pointer"
              />
              <label
                htmlFor="verified"
                className="text-sm text-admin-text-primary cursor-pointer flex-1"
              >
                Mark as verified
              </label>
            </div>
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <AdminButton
                variant="ghost"
                className="flex-1 mt-4"
                onClick={() => {
                  setActionDialog(null);
                  setEditingUserId(null);
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton
                className="flex-1 mt-4"
                onClick={handleSaveEdit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save"}
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
            <DialogTitle className="text-red-400">Ban User</DialogTitle>
            <DialogDescription>
              This action is permanent and will prevent the user from accessing
              the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-lg border border-admin-red/30 bg-admin-red/10 p-3">
              <p className="text-xs font-semibold text-admin-red uppercase">
                Warning
              </p>
              <p className="text-sm text-admin-red/80 mt-1">
                Banning this user cannot be undone. Ensure you have a valid
                reason.
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
                Reason for ban (optional)
              </label>
              <Input
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="E.g., Fraudulent activity, Terms violation"
                className={`mt-2 ${adminInputClassName}`}
              />
            </div>
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <AdminButton
                variant="ghost"
                className="flex-1 mt-4"
                onClick={() => {
                  setActionDialog(null);
                  setActionReason("");
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton
                tone="red"
                className="flex-1 mt-4"
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
            <DialogTitle>Unban User</DialogTitle>
            <DialogDescription>
              Lift the ban and restore the user's access to the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-lg border border-admin-accent/30 bg-admin-accent/10 p-3">
              <p className="text-xs font-semibold text-admin-accent uppercase">
                Confirm Action
              </p>
              <p className="text-sm text-admin-accent/80 mt-1">
                This will restore the user's full access to the platform.
              </p>
            </div>
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <AdminButton
                variant="ghost"
                className="flex-1 mt-4"
                onClick={() => setActionDialog(null)}
              >
                Cancel
              </AdminButton>
              <AdminButton
                className="flex-1 mt-4"
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
            setPasswordData({ oldPassword: "", password: "" });
            setShowPassword(false);
            setShowOldPassword(false);
          }
        }}
      >
        <AdminDialogContent className="max-w-lg">
          <DialogHeader className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-6 py-5">
            <DialogTitle>Change User Password</DialogTitle>
            <DialogDescription>
              Set a new password for this user account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-lg border border-admin-accent/30 bg-admin-accent/10 p-3">
              <p className="text-xs font-semibold text-admin-accent uppercase">
                Note
              </p>
              <p className="text-sm text-admin-accent/80 mt-1">
                The user will need to use this new password to log in.
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
                Old Password
              </label>
              <div className="relative mt-2">
                <Input
                  type={showOldPassword ? "text" : "password"}
                  value={passwordData.oldPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      oldPassword: e.target.value,
                    })
                  }
                  placeholder="Current password"
                  className={`${adminInputClassName} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted hover:text-admin-text-primary transition-colors"
                >
                  {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
                New Password
              </label>
              <div className="relative mt-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordData.password}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      password: e.target.value,
                    })
                  }
                  placeholder="Minimum 6 characters"
                  className={`${adminInputClassName} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted hover:text-admin-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <AdminButton
                variant="ghost"
                className="flex-1 mt-4"
                onClick={() => {
                  setActionDialog(null);
                  setPasswordData({ oldPassword: "", password: "" });
                  setShowPassword(false);
                  setShowOldPassword(false);
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton
                className="flex-1 mt-4"
                onClick={handleChangePassword}
                disabled={!passwordData.oldPassword || !passwordData.password}
              >
                Update Password
              </AdminButton>
            </div>
          </div>
        </AdminDialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmPasswordDialog}
        onOpenChange={setConfirmPasswordDialog}
        title="Confirm Password Change"
        description={`Old Password: ${passwordData.oldPassword}\n\nNew Password: ${passwordData.password}`}
        confirmText="Change Password"
        cancelText="Cancel"
        onConfirm={handleConfirmPasswordChange}
        isLoading={isSubmitting}
      />

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
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5 max-h-[70vh] overflow-y-auto">
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
                className={`mt-2 ${adminInputClassName}`}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
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
                className={`mt-2 ${adminInputClassName}`}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
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
                className={`mt-2 ${adminInputClassName}`}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
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
                className={`mt-2 ${adminInputClassName}`}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-admin-text-primary">
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
                className={`mt-2 ${adminInputClassName}`}
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[rgba(13,33,55,0.16)] p-3">
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
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <AdminButton
                variant="ghost"
                className="flex-1 mt-4"
                onClick={() => setActionDialog(null)}
              >
                Cancel
              </AdminButton>
              <AdminButton
                className="flex-1 mt-4"
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
