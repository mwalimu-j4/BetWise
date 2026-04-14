import { useEffect, useMemo, useState, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Bell,
  Menu,
  Search,
  Zap,
  LogOut,
  User,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  SidebarOpen,
  SidebarClose,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  useAppNotifications,
  useMarkAllNotificationsRead,
  type AppNotification,
} from "@/features/notifications/notifications";
import { useWalletRealtime } from "@/features/user/payments/wallet";
import { useAdminPersonalQuickSettings } from "../hooks/useAdminPersonalQuickSettings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminNavigation } from "../config/navigation";

export default function AdminShell() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedNotificationsRef = useRef(false);

  const { theme, setTheme } = useTheme();
  useWalletRealtime();
  const { data: notificationData } = useAppNotifications(10);
  const { settings: personalQuickSettings } = useAdminPersonalQuickSettings();
  const markAllNotificationsRead = useMarkAllNotificationsRead();
  const { logout, user } = useAuth();
  const pathname = useLocation({
    select: (location) => location.pathname,
  });
  const navigate = useNavigate();
  const notifications = notificationData?.notifications ?? [];
  const unreadCount = notificationData?.unreadCount ?? 0;
  const withdrawalSoundEnabled = personalQuickSettings.withdrawalSoundEnabled;
  const withdrawalSoundTone = personalQuickSettings.withdrawalSoundTone;
  const withdrawalSoundVolume = personalQuickSettings.withdrawalSoundVolume;
  const playSoundOnlyWhenPageVisible =
    personalQuickSettings.playSoundOnlyWhenPageVisible;

  const groupedNavigation = useMemo(
    () => [
      {
        title: "Core",
        items: adminNavigation.filter((item) => item.category === "core"),
      },
      {
        title: "Trading",
        items: adminNavigation.filter((item) => item.category === "operations"),
      },
      {
        title: "Insights",
        items: adminNavigation.filter((item) => item.category === "insights"),
      },
    ],
    [],
  );

  const settingsItem = useMemo(
    () => adminNavigation.find((item) => item.id === "settings"),
    [],
  );

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    await navigate({ to: "/" });
  };

  const isNewWithdrawalRequestNotification = (
    notification: AppNotification,
  ) => {
    if (notification.audience !== "ADMIN" || notification.type !== "SYSTEM") {
      return false;
    }

    const haystack =
      `${notification.title} ${notification.message}`.toLowerCase();
    return (
      haystack.includes("new withdrawal request") ||
      haystack.includes("requested a withdrawal")
    );
  };

  const isBanAppealNotification = (notification: AppNotification) => {
    if (notification.audience !== "ADMIN" || notification.type !== "SYSTEM") {
      return false;
    }

    const haystack =
      `${notification.title} ${notification.message}`.toLowerCase();
    return haystack.includes("ban appeal");
  };

  const isWithdrawalNotification = (notification: AppNotification) =>
    notification.type === "WITHDRAWAL_SUCCESS" ||
    notification.type === "WITHDRAWAL_FAILED" ||
    isNewWithdrawalRequestNotification(notification);

  const getNotificationIcon = (notification: AppNotification) => {
    if (notification.type === "WITHDRAWAL_SUCCESS")
      return <CheckCircle2 size={20} className="text-emerald-500" />;
    if (notification.type === "WITHDRAWAL_FAILED")
      return <XCircle size={20} className="text-red-500" />;
    if (isBanAppealNotification(notification))
      return <Activity size={20} className="text-amber-400" />;
    if (isWithdrawalNotification(notification))
      return <Activity size={20} className="text-blue-400" />;
    return <Bell size={20} className="text-admin-text-secondary" />;
  };

  useEffect(() => {
    if (!notifications.length) {
      return;
    }

    const seen = seenNotificationIdsRef.current;

    if (!hasHydratedNotificationsRef.current) {
      for (const item of notifications) {
        seen.add(item.id);
      }
      hasHydratedNotificationsRef.current = true;
      return;
    }

    const incomingNotifications = notifications.filter(
      (item) => !seen.has(item.id),
    );

    if (!incomingNotifications.length) {
      return;
    }

    for (const item of incomingNotifications) {
      seen.add(item.id);
    }

    const newBanAppeals = incomingNotifications.filter(isBanAppealNotification);

    for (const notification of newBanAppeals) {
      toast.error(notification.title || "New Ban Appeal", {
        description: notification.message,
      });
    }

    if (!withdrawalSoundEnabled) {
      return;
    }

    const hasNewWithdrawalRequest = incomingNotifications.some(
      isNewWithdrawalRequestNotification,
    );

    if (!hasNewWithdrawalRequest) {
      return;
    }

    if (playSoundOnlyWhenPageVisible && document.hidden) {
      return;
    }

    const audio = new Audio(withdrawalSoundTone);
    audio.volume = Math.max(0, Math.min(1, withdrawalSoundVolume / 100));
    void audio.play().catch(() => {
      // Ignore autoplay failures silently to avoid noisy toasts.
    });
  }, [
    notifications,
    withdrawalSoundEnabled,
    withdrawalSoundTone,
    withdrawalSoundVolume,
    playSoundOnlyWhenPageVisible,
  ]);

  useEffect(() => {
    setMobileSidebarOpen(false);
    setNotificationsOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const toggleSidebar = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setSidebarExpanded((current) => !current);
      return;
    }
    setMobileSidebarOpen((current) => !current);
  };

  const showNavLabels = sidebarExpanded || mobileSidebarOpen;

  return (
    <ProtectedRoute requireRole="ADMIN">
      <div className="relative  min-h-dvh  font-admin text-admin-text-primary lg:flex">
        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-70 max-w-[85vw] flex-col overflow-hidden border-r border-admin-border bg-admin-card",
            "shadow-[2px_0_12px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
            "lg:sticky lg:top-0 lg:h-dvh lg:max-w-none lg:translate-x-0 lg:shadow-none",
            sidebarExpanded ? "lg:w-65 lg:min-w-65" : "lg:w-20 lg:min-w-20",
          )}
        >
          {/* Sidebar Header */}
          <div
            className={cn(
              "flex h-16 shrink-0 items-center border-b border-admin-border px-4 transition-all",
              showNavLabels ? "justify-between" : "justify-center",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-3",
                !showNavLabels && "lg:hidden",
              )}
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-linear-to-br from-(--color-accent) to-(--color-accent-dark) shadow-sm">
                <Zap
                  size={16}
                  color="var(--color-text-dark)"
                  className="animate-pulse"
                />
              </div>
              {showNavLabels && (
                <div className="flex flex-col">
                  <span className="text-sm font-bold tracking-wide text-admin-text-primary">
                    BetixPro
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-admin-text-muted">
                    Workspace
                  </span>
                </div>
              )}
            </div>

            <button
              aria-label={showNavLabels ? "Collapse sidebar" : "Expand sidebar"}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-admin-text-muted transition-colors hover:bg-admin-border/50 hover:text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-admin-accent/50"
              onClick={toggleSidebar}
              type="button"
            >
              {showNavLabels ? (
                <SidebarClose size={18} />
              ) : (
                <SidebarOpen size={18} />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="app-scrollbar flex-1 overflow-y-auto px-3 py-6">
            {groupedNavigation.map((group, idx) => (
              <section
                className={cn("mb-6", idx !== 0 && "pt-2")}
                key={group.title}
              >
                {showNavLabels && (
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-admin-text-muted">
                    {group.title}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.to ||
                      pathname.startsWith(`${item.to}/`);

                    return (
                      <Link
                        key={item.id}
                        to={item.to}
                        onClick={() => setMobileSidebarOpen(false)}
                        title={!showNavLabels ? item.label : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 active:scale-[0.98]",
                          showNavLabels
                            ? "justify-start"
                            : "justify-center px-0 lg:px-0",
                          isActive
                            ? "bg-admin-accent/10 font-medium text-admin-accent"
                            : "text-admin-text-secondary hover:bg-admin-border/40 hover:text-admin-text-primary",
                        )}
                      >
                        <Icon
                          size={18}
                          className={cn(
                            "shrink-0 transition-transform duration-200 group-hover:scale-110",
                            isActive && "text-admin-accent",
                          )}
                        />
                        {showNavLabels && (
                          <span className="truncate text-sm">{item.label}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* System Settings Footer */}
          {settingsItem && (
            <div className="shrink-0 border-t border-admin-border p-3">
              <Link
                to={settingsItem.to}
                onClick={() => setMobileSidebarOpen(false)}
                title={!showNavLabels ? settingsItem.label : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 active:scale-[0.98]",
                  showNavLabels
                    ? "justify-start"
                    : "justify-center px-0 lg:px-0",
                  pathname === settingsItem.to ||
                    pathname.startsWith(`${settingsItem.to}/`)
                    ? "bg-admin-accent/10 font-medium text-admin-accent"
                    : "text-admin-text-secondary hover:bg-admin-border/40 hover:text-admin-text-primary",
                )}
              >
                <Settings
                  size={18}
                  className="shrink-0 transition-transform duration-500 group-hover:rotate-45"
                />
                {showNavLabels && (
                  <span className="truncate text-sm">{settingsItem.label}</span>
                )}
              </Link>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <div className="relative flex min-w-0 flex-1 flex-col bg-transparent">
          {/* Top Header - Updated to match sidebar background */}
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-admin-border bg-admin-card px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                aria-label="Open sidebar"
                className="grid h-9 w-9 place-items-center rounded-lg border border-admin-border bg-admin-bg text-admin-text-secondary transition-colors hover:bg-admin-border/50 hover:text-admin-text-primary"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu size={18} />
              </button>
            </div>

            {/* Search Bar - Updated for contrast */}
            <div className="hidden max-w-md flex-1 items-center md:flex">
              <div className="group flex h-10 w-full items-center gap-2.5 rounded-full border border-admin-border bg-admin-bg/50 px-4 transition-all focus-within:border-admin-accent/50 focus-within:bg-admin-bg focus-within:ring-4 focus-within:ring-admin-accent/10 hover:bg-admin-bg/80">
                <Search
                  size={16}
                  className="text-admin-text-muted transition-colors group-focus-within:text-admin-accent"
                />
                <input
                  className="w-full bg-transparent text-sm text-admin-text-primary outline-none placeholder:text-admin-text-muted"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search anything..."
                  value={searchQuery}
                />
                <div className="hidden items-center gap-1 rounded-md border border-admin-border/60 bg-admin-card/75 px-1.5 py-0.5 text-[10px] font-medium text-admin-text-muted lg:flex">
                  ⌘K
                </div>
              </div>
            </div>

            {/* Right Actions */}
            <div className="ml-auto flex items-center gap-2.5 sm:gap-4">
              {/* Notifications Dropdown */}
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  aria-label="View notifications"
                  className={cn(
                    "relative grid h-10 w-10 place-items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-admin-accent/50",
                    notificationsOpen
                      ? "bg-admin-border text-admin-text-primary"
                      : "bg-admin-bg/50 border border-admin-border text-admin-text-secondary hover:bg-admin-border/50 hover:text-admin-text-primary",
                  )}
                  onClick={() => {
                    setNotificationsOpen((prev) => {
                      const next = !prev;
                      if (next && unreadCount > 0)
                        void markAllNotificationsRead();
                      if (next) setUserMenuOpen(false);
                      return next;
                    });
                  }}
                >
                  <Bell
                    size={18}
                    className={cn(
                      "transition-transform",
                      notificationsOpen && "scale-110",
                    )}
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-admin-card bg-admin-red px-1 text-[9px] font-bold text-white shadow-sm">
                      {Math.min(unreadCount, 99)}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(380px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-[1.6rem] border border-admin-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)_62%)] bg-admin-card/95 shadow-[0_16px_42px_-18px_rgba(0,0,0,0.42)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between border-b border-admin-border/50 px-5 py-4">
                      <h3 className="text-sm font-semibold text-admin-text-primary">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-admin-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-admin-accent">
                          {unreadCount} New
                        </span>
                      )}
                    </div>

                    <div className="app-scrollbar max-h-100 overflow-y-auto p-2">
                      {notifications.length > 0 ? (
                        <div className="space-y-1">
                          {notifications.map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() => {
                                setNotificationsOpen(false);
                                if (isWithdrawalNotification(notification)) {
                                  void navigate({
                                    to: "/admin/withdrawals",
                                    hash:
                                      notification.transactionId ?? "latest",
                                  });
                                }
                              }}
                              className="group flex w-full items-start gap-3.5 rounded-xl px-3 py-3.5 text-left transition-all hover:bg-admin-border/40 active:scale-[0.98]"
                            >
                              <div className="mt-0.5 flex shrink-0 items-center justify-center">
                                {getNotificationIcon(notification)}
                              </div>
                              <div className="flex-1 space-y-1.5 pr-1">
                                <p className="text-[13px] font-semibold leading-tight text-admin-text-primary transition-colors group-hover:text-admin-accent">
                                  {notification.title}
                                </p>
                                <p className="text-xs leading-relaxed text-admin-text-secondary line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="flex items-center gap-1.5 text-[10px] font-medium text-admin-text-muted">
                                  <Clock size={10} />
                                  {new Date(
                                    notification.createdAt,
                                  ).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="mb-4 grid h-12 w-12 place-items-center rounded-full border border-admin-border/50 bg-admin-bg/50">
                            <Bell
                              className="text-admin-text-muted/50"
                              size={20}
                            />
                          </div>
                          <p className="text-sm font-medium text-admin-text-primary">
                            All caught up!
                          </p>
                          <p className="mt-1 text-xs text-admin-text-muted">
                            You have no new notifications.
                          </p>
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="border-t border-admin-border/50 p-2">
                        <button className="w-full rounded-lg py-2 text-xs font-semibold text-admin-text-secondary transition-colors hover:bg-admin-border/50 hover:text-admin-text-primary">
                          View all history
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Dropdown - Updated for contrast */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen((prev) => !prev);
                    if (!userMenuOpen) setNotificationsOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-full border p-1 pl-1.5 pr-3 transition-all focus:outline-none focus:ring-2 focus:ring-admin-accent/50",
                    userMenuOpen
                      ? "border-admin-border bg-admin-border/30"
                      : "border-transparent hover:bg-admin-bg/50 hover:border-admin-border/80",
                  )}
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-linear-to-tr from-indigo-500 to-purple-500 text-[11px] font-bold text-white shadow-inner">
                    {user?.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden flex-col items-start text-left sm:flex">
                    <p className="text-xs font-semibold leading-tight text-admin-text-primary">
                      {user?.email.split("@")[0]}
                    </p>
                    <p className="text-[10px] font-medium leading-tight text-admin-text-muted">
                      {user?.role}
                    </p>
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 origin-top-right overflow-hidden rounded-[1.6rem] border border-admin-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)_62%)] bg-admin-card/95 shadow-[0_16px_42px_-18px_rgba(0,0,0,0.42)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3 border-b border-admin-border/50 p-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-linear-to-tr from-indigo-500 to-purple-500 text-sm font-bold text-white shadow-inner">
                        {user?.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-admin-text-primary">
                          {user?.email}
                        </p>
                        <p className="text-[11px] font-medium text-admin-text-muted">
                          {user?.role} Access
                        </p>
                      </div>
                    </div>

                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          void navigate({ to: "/admin/quick-settings" });
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-admin-text-secondary transition-colors hover:bg-admin-border/50 hover:text-admin-text-primary active:scale-[0.98]"
                      >
                        <SlidersHorizontal size={16} />
                        <span>Quick Settings</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          void navigate({ to: "/admin/settings" });
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-admin-text-secondary transition-colors hover:bg-admin-border/50 hover:text-admin-text-primary active:scale-[0.98]"
                      >
                        <User size={16} />
                        <span>Account Settings</span>
                      </button>

                      <div className="my-1 border-t border-admin-border/50" />

                      <div className="px-3 pb-1 pt-2">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-admin-text-muted">
                          Theme
                        </p>
                        <DropdownMenu
                          open={themeDropdownOpen}
                          onOpenChange={setThemeDropdownOpen}
                        >
                          <DropdownMenuTrigger asChild>
                            <button className="flex w-full items-center justify-between rounded-lg border border-admin-border/50 bg-admin-bg/50 px-3 py-2 text-sm font-medium text-admin-text-primary transition-colors hover:bg-admin-border/80">
                              <div className="flex items-center gap-2.5">
                                {theme === "dark" ? (
                                  <Moon
                                    size={14}
                                    className="text-admin-text-secondary"
                                  />
                                ) : theme === "light" ? (
                                  <Sun
                                    size={14}
                                    className="text-admin-text-secondary"
                                  />
                                ) : (
                                  <Monitor
                                    size={14}
                                    className="text-admin-text-secondary"
                                  />
                                )}
                                <span className="capitalize">{theme}</span>
                              </div>
                              <ChevronRight
                                size={14}
                                className="text-admin-text-muted"
                              />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            side="left"
                            sideOffset={12}
                            className="min-w-35 rounded-xl shadow-[0_12px_28px_rgba(2,8,23,0.22)]"
                          >
                            <DropdownMenuItem
                              onClick={() => setTheme("light")}
                              className="cursor-pointer gap-2 py-2"
                            >
                              <Sun size={14} /> Light
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setTheme("dark")}
                              className="cursor-pointer gap-2 py-2"
                            >
                              <Moon size={14} /> Dark
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setTheme("system")}
                              className="cursor-pointer gap-2 py-2"
                            >
                              <Monitor size={14} /> System
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="my-1 border-t border-admin-border/50" />

                      <button
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-admin-red transition-all hover:bg-admin-red/10 active:scale-[0.98]"
                      >
                        <LogOut
                          size={16}
                          className="transition-transform group-hover:-translate-x-1"
                        />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="relative flex-1 overflow-x-hidden bg-transparent p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
