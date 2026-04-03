import { useState } from "react";
import {
  Download,
  Edit,
  Eye,
  Filter,
  Lock,
  Plus,
  Search,
  SlidersHorizontal,
  Unlock,
} from "lucide-react";
import { userStats, users } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
  SummaryCard,
  TableShell,
  adminCompactActionsClassName,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Users() {
  const [selectedUser, setSelectedUser] = useState<(typeof users)[0] | null>(
    null,
  );
  const [confirmAction, setConfirmAction] = useState<{
    type: "lock" | "unlock";
    userId: string;
    userName: string;
  } | null>(null);
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="User Management"
        subtitle="48,291 registered accounts"
        actions={
          <>
            <AdminButton variant="ghost">
              <Download size={13} />
              Export
            </AdminButton>
            <Dialog>
              <DialogTrigger asChild>
                <AdminButton>
                  <Plus size={13} />
                  Add User
                </AdminButton>
              </DialogTrigger>
              <DialogContent className="border-admin-border bg-admin-card">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account manually
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-admin-text-primary">
                      Full Name
                    </label>
                    <Input
                      placeholder="John Doe"
                      className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-admin-text-primary">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-admin-text-primary">
                      Account Status
                    </label>
                    <select className="mt-1 w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-text-primary">
                      <option>Active</option>
                      <option>Suspended</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1">
                      Cancel
                    </Button>
                    <Button className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]">
                      Create User
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-[280px] flex-1 items-center gap-2 rounded-xl border border-admin-border bg-admin-surface px-3 py-2.5">
            <Search size={14} className="text-admin-text-muted" />
            <input
              className="w-full border-0 bg-transparent text-sm text-admin-text-primary outline-none placeholder:text-admin-text-muted"
              placeholder="Search users..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
          <table className={adminTableClassName}>
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
                  <th className={adminTableHeadCellClassName} key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  className="even:bg-[var(--color-bg-elevated)]"
                  key={user.id}
                >
                  <td
                    className={`${adminTableCellClassName} text-xs font-semibold text-admin-blue`}
                  >
                    {user.id}
                  </td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                  >
                    {user.name}
                  </td>
                  <td className={adminTableCellClassName}>{user.email}</td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-accent`}
                  >
                    {user.balance}
                  </td>
                  <td className={adminTableCellClassName}>{user.totalBets}</td>
                  <td className={adminTableCellClassName}>
                    {Math.round((user.won / user.totalBets) * 100)}%
                  </td>
                  <td className={adminTableCellClassName}>
                    <StatusBadge status={user.kyc} />
                  </td>
                  <td className={adminTableCellClassName}>
                    <StatusBadge status={user.risk} />
                  </td>
                  <td className={adminTableCellClassName}>
                    <StatusBadge status={user.status} />
                  </td>
                  <td className={adminTableCellClassName}>
                    <div className={adminCompactActionsClassName}>
                      <Dialog>
                        <DialogTrigger asChild>
                          <AdminButton
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye size={11} />
                          </AdminButton>
                        </DialogTrigger>
                        <DialogContent className="border-admin-border bg-admin-card">
                          <DialogHeader>
                            <DialogTitle>User Details</DialogTitle>
                            <DialogDescription>
                              View and manage user information
                            </DialogDescription>
                          </DialogHeader>
                          {selectedUser && (
                            <ScrollArea className="h-[400px] w-full pr-4">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    USER ID
                                  </p>
                                  <p className="text-sm font-semibold text-admin-blue">
                                    {selectedUser.id}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    NAME
                                  </p>
                                  <p className="text-sm font-semibold text-admin-text-primary">
                                    {selectedUser.name}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    EMAIL
                                  </p>
                                  <p className="text-sm text-admin-text-primary">
                                    {selectedUser.email}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    BALANCE
                                  </p>
                                  <p className="text-sm font-semibold text-admin-accent">
                                    {selectedUser.balance}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    TOTAL BETS
                                  </p>
                                  <p className="text-sm text-admin-text-primary">
                                    {selectedUser.totalBets}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    WIN RATE
                                  </p>
                                  <p className="text-sm text-admin-text-primary">
                                    {Math.round(
                                      (selectedUser.won /
                                        selectedUser.totalBets) *
                                        100,
                                    )}
                                    %
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    KYC STATUS
                                  </p>
                                  <StatusBadge status={selectedUser.kyc} />
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    RISK LEVEL
                                  </p>
                                  <StatusBadge status={selectedUser.risk} />
                                </div>
                              </div>
                            </ScrollArea>
                          )}
                        </DialogContent>
                      </Dialog>
                      <AdminButton size="sm" variant="ghost">
                        <Edit size={11} />
                      </AdminButton>
                      <Dialog
                        open={confirmAction?.userId === user.id}
                        onOpenChange={(open) => {
                          if (!open) setConfirmAction(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <AdminButton
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setConfirmAction({
                                type:
                                  user.status === "active" ? "lock" : "unlock",
                                userId: user.id,
                                userName: user.name,
                              })
                            }
                          >
                            {user.status === "active" ? (
                              <Lock size={11} />
                            ) : (
                              <Unlock size={11} />
                            )}
                          </AdminButton>
                        </DialogTrigger>
                        <DialogContent className="border-admin-border bg-admin-card">
                          <DialogHeader>
                            <DialogTitle>
                              {confirmAction?.type === "lock"
                                ? "Lock User Account"
                                : "Unlock User Account"}
                            </DialogTitle>
                            <DialogDescription>
                              Are you sure you want to
                              {confirmAction?.type === "lock"
                                ? " lock"
                                : " unlock"}{" "}
                              {confirmAction?.userName}
                              's account?
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => setConfirmAction(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              className={`flex-1 text-white ${
                                confirmAction?.type === "lock"
                                  ? "bg-admin-red hover:bg-red-600"
                                  : "bg-admin-accent hover:bg-[#00d492] text-black"
                              }`}
                            >
                              {confirmAction?.type === "lock"
                                ? "Lock Account"
                                : "Unlock Account"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
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
