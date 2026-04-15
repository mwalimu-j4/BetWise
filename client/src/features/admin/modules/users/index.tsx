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
import {
  Eye,
  EyeOff,
  MoreVertical,
  Search,
  X,
  RefreshCw,
  UserPlus,
  Shield,
  AlertCircle,
} from "lucide-react";
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

// ============ HELPER COMPONENTS ============

const FormField = ({ label, required, children, error, helper }: any) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-admin-text-muted uppercase tracking-wider">
      {label} {required && <span className="text-admin-red">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-xs text-admin-red flex items-center gap-1 mt-1">
        <AlertCircle size={12} /> {error}
      </p>
    )}
    {helper && !error && (
      <p className="text-xs text-admin-text-muted">{helper}</p>
    )}
  </div>
);

const Divider = () => <div className="border-t border-white/10 my-4" />;

const InfoRow = ({
  label,
  value,
  highlight = false,
  monospace = false,
}: any) => (
  <div className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
    <span className="text-xs text-admin-text-muted font-medium">{label}</span>
    <span
      className={`text-sm ${monospace ? "font-mono" : "font-medium"} ${highlight ? "text-admin-accent" : "text-admin-text-primary"}`}
    >
      {value || "—"}
    </span>
  </div>
);

const WarningBox = ({ title, children, tone = "red" }: any) => {
  const colors = {
    red: "border-admin-red/20 bg-admin-red/5 text-admin-red/80",
    yellow: "border-admin-gold/20 bg-admin-gold/5 text-admin-gold/80",
    blue: "border-admin-blue/20 bg-admin-blue/5 text-admin-blue/80",
  };
  return (
    <div className={`p-3 rounded-lg border ${colors[tone]}`}>
      {title && <p className="text-sm font-semibold mb-2">{title}</p>}
      {children}
    </div>
  );
};

// ============ MAIN COMPONENT ============

export default function Users() {
  // State
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "banned" | "">("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "edit" | "ban" | "unban" | "changePassword" | "create";
    userId?: string;
  } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    isVerified: false,
  });

  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
  const [passwordErrors, setPasswordErrors] = useState({
    password: "",
    confirmPassword: "",
  });

  // Data fetching
  const { users, loading, error, refetch, total } = useUsers({
    page,
    search,
    status,
    limit: 50,
  });

  const { user: selectedUser, loading: userLoading } = useGetUserDetail(
    selectedUserId || "",
  );

  // ============ HANDLERS ============

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
    setPasswordData({ password: "", confirmPassword: "" });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordErrors({ password: "", confirmPassword: "" });
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

  const validatePassword = () => {
    const errors = { password: "", confirmPassword: "" };
    if (!passwordData.password) {
      errors.password = "Password is required";
    } else if (passwordData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (passwordData.password !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    setPasswordErrors(errors);
    return !errors.password && !errors.confirmPassword;
  };

  const handleSaveEdit = async () => {
    if (!editingUserId) return;
    setIsSubmitting(true);
    try {
      await updateUserAction(editingUserId, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        isVerified: formData.isVerified,
      });
      await refetch();
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
    if (!validatePassword() || !actionDialog?.userId) return;

    setIsSubmitting(true);
    try {
      await updateUserPasswordAction(actionDialog.userId, {
        password: passwordData.password,
        confirmPassword: passwordData.confirmPassword,
      });
      await refetch();
      setPasswordData({ password: "", confirmPassword: "" });
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
      await refetch();
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
      await refetch();
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
    if (
      !createFormData.email ||
      !createFormData.phone ||
      !createFormData.password
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (createFormData.password !== createFormData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (createFormData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await createUserAction(createFormData);
      await refetch();
      setActionDialog(null);
      toast.success("User created successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    void refetch();
    toast.success("Refreshed user list");
  };

  // Calculations
  const visibleUsers = users || [];
  const totalUsers = total || 0;
  const activeUsers = visibleUsers.filter((u) => u.status === "active").length;
  const bannedUsers = visibleUsers.filter((u) => u.status === "banned").length;

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <AdminSectionHeader
        title="User Management"
        subtitle="View, manage, and moderate user accounts"
        actions={
          <div className="flex gap-2">
            <AdminButton variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw size={14} />
              Refresh
            </AdminButton>
            <AdminButton variant="ghost" size="sm">
              <Link to="/admin/appeals">View Appeals</Link>
            </AdminButton>
            <AdminButton
              variant="solid"
              size="sm"
              onClick={handleOpenCreate}
              className="bg-admin-accent hover:bg-admin-accent/90"
            >
              <UserPlus size={14} />
              Add User
            </AdminButton>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AdminStatCard
          label="Total Users"
          value={totalUsers.toLocaleString()}
          tone="blue"
          helper="All registered accounts"
        />
        <AdminStatCard
          label="Active Users"
          value={activeUsers.toLocaleString()}
          tone="accent"
          helper="Currently active accounts"
        />
        <AdminStatCard
          label="Banned Users"
          value={bannedUsers.toLocaleString()}
          tone="red"
          helper="Restricted accounts"
        />
      </div>

      {/* Error Display */}
      {error && (
        <AdminCard className="border-admin-red/40 bg-admin-red-dim/20 p-4">
          <div className="flex items-center gap-2 text-admin-red">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        </AdminCard>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-text-muted" />
          <Input
            placeholder="Search by email, name, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className={`${adminInputClassName} pl-9 pr-9`}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
            >
              <X className="w-4 h-4 text-admin-text-muted" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { value: "", label: "All Users", icon: null },
            { value: "active", label: "Active", icon: null },
            { value: "banned", label: "Banned", icon: null },
          ].map((filter) => (
            <AdminButton
              key={filter.value}
              variant={status === filter.value ? "solid" : "ghost"}
              size="sm"
              onClick={() => {
                setStatus(filter.value as typeof status);
                setPage(1);
              }}
            >
              {filter.label}
            </AdminButton>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {loading && users.length === 0 ? (
        <AdminCard className="text-center py-16">
          <div className="text-admin-text-muted">Loading users...</div>
        </AdminCard>
      ) : visibleUsers.length === 0 ? (
        <AdminCard className="text-center py-16">
          <div className="text-admin-text-muted">No users found</div>
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className={adminTableClassName}>
              <thead>
                <tr>
                  {[
                    "#",
                    "Email",
                    "Phone",
                    "Status",
                    "Balance",
                    "Verified",
                    "Created",
                    "",
                  ].map((heading, i) => (
                    <th key={i} className={adminTableHeadCellClassName}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className="cursor-pointer hover:bg-admin-surface/40 transition-colors group"
                    onClick={() => handleUserClick(user.id)}
                  >
                    <td
                      className={`${adminTableCellClassName} text-admin-text-muted font-mono text-xs`}
                    >
                      {(page - 1) * 50 + index + 1}
                    </td>
                    <td className={`${adminTableCellClassName} font-medium`}>
                      <div
                        className="max-w-[200px] truncate"
                        title={user.email}
                      >
                        {truncateEmailForTable(user.email)}
                      </div>
                    </td>
                    <td className={adminTableCellClassName}>
                      <span className="font-mono text-xs">{user.phone}</span>
                    </td>
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
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-admin-accent">
                          <span>✓</span> Yes
                        </span>
                      ) : (
                        <span className="text-xs text-admin-text-muted">
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
                            <AdminButton
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical size={14} />
                            </AdminButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className={adminDropdownContentClassName}
                          >
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(user)}
                              className={adminDropdownItemClassName}
                            >
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenChangePassword(user.id)}
                              className={adminDropdownItemClassName}
                            >
                              Change Password
                            </DropdownMenuItem>
                            {user.status === "active" ? (
                              <DropdownMenuItem
                                onClick={() => handleOpenBan(user.id)}
                                className={`${adminDropdownItemClassName} text-admin-red`}
                              >
                                Ban User
                              </DropdownMenuItem>
                            ) : user.status === "banned" ? (
                              <DropdownMenuItem
                                onClick={() => handleOpenUnban(user.id)}
                                className={adminDropdownItemClassName}
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
          </div>
        </AdminCard>
      )}

      {/* ============ MODALS ============ */}

      {/* User Details Modal */}
      <Dialog
        open={!!selectedUserId && !actionDialog}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
      >
        <AdminDialogContent className="max-w-md p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-white/10">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Shield size={18} className="text-admin-accent" />
              User Profile
            </DialogTitle>
            <DialogDescription>
              Account details and management
            </DialogDescription>
          </DialogHeader>

          {userLoading ? (
            <div className="px-6 py-12 text-center text-admin-text-muted">
              Loading...
            </div>
          ) : selectedUser ? (
            <div className="px-6 pb-6">
              <div className="pt-2 space-y-1">
                <InfoRow label="Email" value={selectedUser.email} />
                <InfoRow label="Phone" value={selectedUser.phone} monospace />
                <InfoRow
                  label="Full Name"
                  value={selectedUser.name || "Not set"}
                />
                <InfoRow
                  label="Status"
                  value={<StatusBadge status={selectedUser.status} />}
                />
                <InfoRow
                  label="Email Verified"
                  value={selectedUser.isVerified ? "Yes" : "No"}
                  highlight={selectedUser.isVerified}
                />
                <InfoRow
                  label="Member Since"
                  value={new Date(selectedUser.createdAt).toLocaleDateString()}
                />
              </div>

              <Divider />

              <div className="bg-admin-accent/5 rounded-lg p-3">
                <InfoRow
                  label="Balance"
                  value={`KES ${selectedUser.balance.toLocaleString()}`}
                  highlight
                  monospace
                />
                <InfoRow
                  label="Total Bets"
                  value={selectedUser.totalBets?.toLocaleString() || "0"}
                />
              </div>

              <Divider />

              <div className="grid grid-cols-2 gap-2">
                <AdminButton
                  onClick={() => handleOpenEdit(selectedUser)}
                  size="sm"
                  variant="ghost"
                >
                  Edit Profile
                </AdminButton>
                <AdminButton
                  onClick={() => handleOpenChangePassword(selectedUser.id)}
                  size="sm"
                  variant="ghost"
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
                    size="sm"
                    className="col-span-2"
                  >
                    Unban User
                  </AdminButton>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-admin-text-muted">
              User not found
            </div>
          )}
        </AdminDialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog
        open={actionDialog?.type === "edit"}
        onOpenChange={(open) => !open && setActionDialog(null)}
      >
        <AdminDialogContent className="max-w-md p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-white/10">
            <DialogTitle className="text-lg">Edit User</DialogTitle>
            <DialogDescription>
              Update user profile information
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <FormField label="Full Name">
              <Input
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="Enter full name"
                className={adminInputClassName}
              />
            </FormField>

            <FormField label="Email" required>
              <Input
                value={formData.email}
                disabled
                className={`${adminInputClassName} opacity-60`}
              />
              <p className="text-xs text-admin-text-muted">
                Email cannot be changed
              </p>
            </FormField>

            <FormField label="Phone">
              <Input
                value={formData.phone}
                disabled
                className={`${adminInputClassName} opacity-60`}
              />
              <p className="text-xs text-admin-text-muted">
                Phone cannot be changed
              </p>
            </FormField>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-admin-accent/20 bg-admin-accent/5">
              <input
                type="checkbox"
                id="verified"
                checked={formData.isVerified}
                onChange={(e) =>
                  setFormData({ ...formData, isVerified: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <label
                htmlFor="verified"
                className="text-sm text-admin-text-primary cursor-pointer"
              >
                Mark as verified user
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <AdminButton
                variant="ghost"
                className="flex-1"
                onClick={() => setActionDialog(null)}
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

      {/* Ban User Modal */}
      <Dialog
        open={actionDialog?.type === "ban"}
        onOpenChange={(open) => !open && setActionDialog(null)}
      >
        <AdminDialogContent className="max-w-md p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-white/10">
            <DialogTitle className="text-lg text-admin-red">
              Ban User
            </DialogTitle>
            <DialogDescription>
              Restrict user access to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <WarningBox tone="red">
              <ul className="space-y-1 text-sm list-disc list-inside">
                <li>User will be locked out immediately</li>
                <li>All active sessions will be terminated</li>
                <li>User can submit an appeal</li>
              </ul>
            </WarningBox>

            <FormField label="Reason (Optional)">
              <Input
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g., Terms violation, Fraudulent activity"
                className={adminInputClassName}
              />
            </FormField>

            <div className="flex gap-3 pt-2">
              <AdminButton
                variant="ghost"
                className="flex-1"
                onClick={() => setActionDialog(null)}
              >
                Cancel
              </AdminButton>
              <AdminButton
                tone="red"
                className="flex-1"
                onClick={handleBanUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Banning..." : "Confirm Ban"}
              </AdminButton>
            </div>
          </div>
        </AdminDialogContent>
      </Dialog>

      {/* Unban User Modal */}
      <Dialog
        open={actionDialog?.type === "unban"}
        onOpenChange={(open) => !open && setActionDialog(null)}
      >
        <AdminDialogContent className="max-w-md p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-white/10">
            <DialogTitle className="text-lg">Unban User</DialogTitle>
            <DialogDescription>
              Restore user access to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <WarningBox tone="green">
              <p className="text-sm">
                This will immediately restore the user's access and remove all
                ban restrictions.
              </p>
            </WarningBox>

            <div className="flex gap-3 pt-2">
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
                {isSubmitting ? "Unbanning..." : "Confirm Unban"}
              </AdminButton>
            </div>
          </div>
        </AdminDialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog
        open={actionDialog?.type === "changePassword"}
        onOpenChange={(open) => !open && setActionDialog(null)}
      >
        <AdminDialogContent className="max-w-md p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-white/10">
            <DialogTitle className="text-lg">Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for this user account
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <WarningBox tone="blue">
              <p className="text-sm">
                Password must be at least 6 characters. The user will need this
                new password to log in.
              </p>
            </WarningBox>

            <FormField
              label="New Password"
              required
              error={passwordErrors.password}
            >
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordData.password}
                  onChange={(e) => {
                    setPasswordData({
                      ...passwordData,
                      password: e.target.value,
                    });
                    setPasswordErrors({ ...passwordErrors, password: "" });
                  }}
                  placeholder="Enter new password"
                  className={`${adminInputClassName} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FormField>

            <FormField
              label="Confirm Password"
              required
              error={passwordErrors.confirmPassword}
            >
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => {
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    });
                    setPasswordErrors({
                      ...passwordErrors,
                      confirmPassword: "",
                    });
                  }}
                  placeholder="Confirm new password"
                  className={`${adminInputClassName} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </FormField>

            <div className="flex gap-3 pt-2">
              <AdminButton
                variant="ghost"
                className="flex-1"
                onClick={() => setActionDialog(null)}
              >
                Cancel
              </AdminButton>
              <AdminButton
                className="flex-1"
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

      {/* Create User Modal */}
      <Dialog
        open={actionDialog?.type === "create"}
        onOpenChange={(open) => !open && setActionDialog(null)}
      >
        <AdminDialogContent className="max-w-md p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-white/10">
            <DialogTitle className="text-lg flex items-center gap-2">
              <UserPlus size={18} className="text-admin-accent" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new user to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <FormField label="Full Name">
              <Input
                value={createFormData.fullName}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    fullName: e.target.value,
                  })
                }
                placeholder="Enter full name"
                className={adminInputClassName}
              />
            </FormField>

            <FormField label="Email" required>
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
            </FormField>

            <FormField
              label="Phone (Kenyan)"
              required
              helper="Format: +254XXXXXXXXX or 07XXXXXXXX"
            >
              <Input
                value={createFormData.phone}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    phone: e.target.value,
                  })
                }
                placeholder="+254712345678"
                className={adminInputClassName}
              />
            </FormField>

            <FormField label="Password" required>
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
            </FormField>

            <FormField label="Confirm Password" required>
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
            </FormField>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-admin-accent/20 bg-admin-accent/5">
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
                className="w-4 h-4 rounded"
              />
              <label
                htmlFor="createVerified"
                className="text-sm text-admin-text-primary cursor-pointer"
              >
                Mark as verified
              </label>
            </div>

            <div className="flex gap-3 pt-2">
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
