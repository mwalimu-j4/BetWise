import { useState } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Bell, Menu, Search, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminNavigation } from "../config/navigation";

export default function AdminShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState(7);
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  return (
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
                  sidebarOpen ? "justify-start" : "justify-center px-0 lg:px-0",
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
                  <span className={cn("text-sm", isActive && "font-semibold")}>
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
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--admin-purple),var(--admin-blue))] text-[11px] font-bold text-white">
            SA
          </div>
          {sidebarOpen ? (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-admin-text-primary">
                Super Admin
              </p>
              <p className="truncate text-[11px] text-admin-text-muted">
                admin@betforge.io
              </p>
            </div>
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
            <button
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
              className="grid h-10 w-10 place-items-center rounded-xl border border-admin-border bg-[var(--color-bg-hover)] text-admin-text-secondary transition hover:bg-[var(--color-bg-hover)] hover:text-admin-text-primary"
              onClick={() => setSidebarOpen((current) => !current)}
              type="button"
            >
              <Menu size={18} />
            </button>

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

            <button
              aria-label="View notifications"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-admin-border bg-[var(--color-bg-hover)] text-admin-text-secondary transition hover:bg-[var(--color-bg-hover)] hover:text-admin-text-primary"
              onClick={() => setNotifications(0)}
              type="button"
            >
              <Bell size={18} />
              {notifications > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-admin-red text-[8px] font-bold text-white">
                  {notifications}
                </span>
              ) : null}
            </button>

            <div className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(135deg,var(--admin-purple),var(--admin-blue))] text-[11px] font-bold text-white">
              SA
            </div>
          </div>
        </header>

        <main className="app-scrollbar relative flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
