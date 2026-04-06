import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Sun,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  useAppNotifications,
  useMarkAllNotificationsRead,
} from "@/features/notifications/notifications";
import { useWalletRealtime } from "@/features/user/payments/wallet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminNavigation } from "../config/navigation";

export default function AdminShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  useWalletRealtime();
  const { data: notificationData } = useAppNotifications(10);
  const markAllNotificationsRead = useMarkAllNotificationsRead();
  const { logout, user } = useAuth();
  const pathname = useLocation({
    select: (location) => location.pathname,
  });
  const navigate = useNavigate();
  const notifications = notificationData?.notifications ?? [];
  const unreadCount = notificationData?.unreadCount ?? 0;

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    await navigate({ to: "/" });
  };

  const isWithdrawalNotification = (type: string) =>
    type === "WITHDRAWAL_SUCCESS" || type === "WITHDRAWAL_FAILED";

  return (
    <ProtectedRoute requireRole="ADMIN">
      <div className="min-h-dvh bg-admin-bg font-admin text-admin-text-primary lg:flex">
        <aside
          className={cn(
            "flex w-full flex-col overflow-hidden border-b border-admin-border bg-admin-card",
            "bg-[linear-gradient(180deg,var(--color-bg-hover),transparent_140px)]",
            "transition-[width,min-width] duration-300 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r",
            sidebarOpen
              ? "lg:w-[252px] lg:min-w-[252px]"
              : "lg:w-[78px] lg:min-w-[78px]",
          )}
        >
          <div
            className={cn(
              "flex min-h-16 items-center gap-3 border-b border-admin-border px-4 py-4",
              !sidebarOpen && "lg:justify-center",
            )}
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-dark))]">
              <Zap size={16} color="var(--color-text-dark)" />
            </div>
            {sidebarOpen ? (
              <div>
                <p className="text-sm font-bold tracking-[0.03em] text-admin-text-primary">
                  BettCenic
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
                  Admin Panel
                </p>
              </div>
            ) : null}
          </div>

          <div className="app-scrollbar flex-1 overflow-y-auto px-3 py-4">
            {sidebarOpen ? (
              <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-admin-text-muted">
                Navigation
              </p>
            ) : null}
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.to || pathname.startsWith(`${item.to}/`);

              return (
                <Link
                  className={cn(
                    "mb-1.5 flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-admin-text-secondary transition",
                    sidebarOpen
                      ? "justify-start"
                      : "justify-center px-0 lg:px-0",
                    isActive
                      ? "border-[var(--color-border-accent)] bg-admin-accent-dim text-admin-accent shadow-[inset_0_0_0_1px_var(--color-accent-soft)]"
                      : "border-transparent hover:bg-[var(--color-bg-hover)] hover:text-admin-text-primary",
                  )}
                  key={item.id}
                  title={item.label}
                  to={item.to}
                >
                  <Icon size={18} />
                  {sidebarOpen ? (
                    <span
                      className={cn("text-sm", isActive && "font-semibold")}
                    >
                      {item.label}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div
            className={cn(
              "flex items-center gap-3 border-t border-admin-border px-4 py-4",
              !sidebarOpen && "lg:justify-center",
            )}
          >
            <button
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-admin-border bg-[var(--color-bg-hover)] text-admin-text-secondary transition hover:bg-[var(--color-bg-hover)] hover:text-admin-text-primary"
              onClick={() => setSidebarOpen((current) => !current)}
              type="button"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu size={16} />
            </button>
            {sidebarOpen ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
                Collapse
              </span>
            ) : null}
          </div>
        </aside>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-admin-bg">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--color-accent-soft),transparent_28%),linear-gradient(180deg,var(--color-bg-elevated),var(--color-bg-primary)_180px)]"
          />

          <header className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-admin-border bg-[var(--color-bg-secondary)] px-4 py-4 backdrop-blur-[18px] sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-11 w-full max-w-[560px] flex-1 items-center gap-2 rounded-2xl border border-admin-border bg-[var(--color-bg-elevated)] px-3">
                <Search size={14} className="text-admin-text-muted" />
                <input
                  className="w-full min-w-0 border-0 bg-transparent text-sm text-admin-text-primary outline-none placeholder:text-admin-text-muted"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search users, bets, events..."
                  value={searchQuery}
                />
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-admin-accent-dim px-3 py-1.5 text-[11px] font-semibold text-admin-accent">
                <span className="animate-admin-pulse h-1.5 w-1.5 rounded-full bg-admin-accent" />
                <span>LIVE</span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  aria-label="View notifications"
                  className="relative grid h-10 w-10 place-items-center rounded-xl border border-admin-border bg-[var(--color-bg-hover)] text-admin-text-secondary transition hover:bg-[var(--color-bg-hover)] hover:text-admin-text-primary"
                  onClick={() => {
                    setNotificationsOpen((prev) => {
                      const next = !prev;
                      if (next && unreadCount > 0) {
                        void markAllNotificationsRead();
                      }

                      return next;
                    });
                  }}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-admin-red text-[8px] font-bold text-white">
                      {Math.min(unreadCount, 99)}
                    </span>
                  )}
                </button>

                {notificationsOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-[360px] overflow-hidden rounded-2xl border border-admin-border bg-[var(--color-bg-secondary)] shadow-[0_16px_44px_rgba(0,0,0,0.35)]">
                    <div className="border-b border-admin-border px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
                        Admin Notifications
                      </p>
                    </div>
                    <div className="app-scrollbar max-h-[360px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              setNotificationsOpen(false);

                              if (isWithdrawalNotification(notification.type)) {
                                void navigate({
                                  to: "/admin/withdrawals",
                                  hash: notification.transactionId ?? "latest",
                                });
                              }
                            }}
                            className="w-full border-b border-admin-border/70 px-4 py-3 text-left transition hover:bg-[var(--color-bg-hover)]"
                          >
                            <p className="text-sm font-semibold text-admin-text-primary">
                              {notification.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-admin-text-secondary">
                              {notification.message}
                            </p>
                            <p className="mt-1 text-[11px] text-admin-text-muted">
                              {new Date(
                                notification.createdAt,
                              ).toLocaleString()}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-4 text-sm text-admin-text-muted">
                          No admin notifications yet.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex flex-1 items-center gap-2 rounded-lg p-2 text-left transition hover:bg-[var(--color-bg-hover)]"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(135deg,var(--admin-purple),var(--admin-blue))] text-[11px] font-bold text-white">
                    {user?.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-admin-text-primary">
                      {user?.email.split("@")[0]}
                    </p>
                    <p className="truncate text-[11px] text-admin-text-muted">
                      {user?.role}
                    </p>
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-12 z-20 w-64 overflow-hidden rounded-2xl border border-admin-border bg-[var(--color-bg-secondary)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                    {/* Profile Section */}
                    <div className="border-b border-admin-border px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,var(--admin-purple),var(--admin-blue))] text-xs font-bold text-white">
                          {user?.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-admin-text-primary">
                            {user?.email.split("@")[0]}
                          </p>
                          <p className="text-[11px] text-admin-text-muted">
                            {user?.role}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {/* Settings */}
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          void navigate({ to: "/admin/settings" });
                        }}
                        type="button"
                        className="flex w-full items-center gap-3 px-5 py-3 text-sm font-medium text-admin-text-primary transition hover:bg-[var(--color-bg-hover)]"
                      >
                        <User size={18} className="text-admin-text-secondary" />
                        <span>Settings</span>
                      </button>

                      {/* Theme Separator */}
                      <div className="my-1 border-t border-admin-border" />

                      {/* Theme Selector */}
                      <div className="px-5 py-3">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-admin-text-muted">
                          Appearance
                        </p>
                        <DropdownMenu
                          open={themeDropdownOpen}
                          onOpenChange={setThemeDropdownOpen}
                        >
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 rounded-lg border border-admin-border bg-[var(--color-bg-hover)] py-2.5 px-3 text-sm font-medium text-admin-text-primary transition hover:border-admin-border hover:bg-[var(--color-bg-elevated)]"
                            >
                              <div className="flex items-center gap-2.5">
                                {theme === "dark" ? (
                                  <Moon
                                    size={16}
                                    className="text-admin-text-secondary"
                                  />
                                ) : theme === "light" ? (
                                  <Sun
                                    size={16}
                                    className="text-admin-text-secondary"
                                  />
                                ) : (
                                  <Monitor
                                    size={16}
                                    className="text-admin-text-secondary"
                                  />
                                )}
                                <span>
                                  {theme === "dark"
                                    ? "Dark"
                                    : theme === "light"
                                      ? "Light"
                                      : "System"}
                                </span>
                              </div>
                              <ChevronRight
                                size={16}
                                className="text-admin-text-muted"
                              />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            side="left"
                            sideOffset={-12}
                          >
                            <DropdownMenuItem
                              onClick={() => setTheme("light")}
                              className="cursor-pointer"
                            >
                              <Sun size={16} className="mr-2" />
                              <span>Light</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setTheme("dark")}
                              className="cursor-pointer"
                            >
                              <Moon size={16} className="mr-2" />
                              <span>Dark</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setTheme("system")}
                              className="cursor-pointer"
                            >
                              <Monitor size={16} className="mr-2" />
                              <span>System</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Logout Separator */}
                      <div className="my-1 border-t border-admin-border" />

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        type="button"
                        className="flex w-full items-center gap-3 px-5 py-3 text-sm font-medium text-admin-red transition hover:bg-admin-red/5"
                      >
                        <LogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="app-scrollbar relative flex-1 overflow-auto p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
