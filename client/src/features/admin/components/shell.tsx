import { useState } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Bell, Menu, Search, Zap } from "lucide-react";
import { adminNavigation } from "../config/navigation";

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export default function AdminShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState(7);
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  return (
    <div className="admin-dashboard">
      <aside
        className={joinClasses(
          "admin-sidebar",
          !sidebarOpen && "is-collapsed",
        )}
      >
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo-mark">
            <Zap size={16} color="#000" />
          </div>
          {sidebarOpen ? (
            <div>
              <p className="admin-sidebar__brand-name">BetForge</p>
              <p className="admin-sidebar__brand-label">Admin Panel</p>
            </div>
          ) : null}
        </div>

        <div className="admin-sidebar__nav admin-scroll">
          {sidebarOpen ? (
            <p className="admin-sidebar__nav-heading">Navigation</p>
          ) : null}
          {adminNavigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.to || pathname.startsWith(`${item.to}/`);

            return (
              <Link
                className={joinClasses(
                  "admin-nav-item",
                  isActive && "is-active",
                )}
                key={item.id}
                to={item.to}
              >
                <Icon size={18} />
                {sidebarOpen ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </div>

        <div className="admin-sidebar__profile">
          <div className="admin-avatar">SA</div>
          {sidebarOpen ? (
            <div className="admin-sidebar__profile-copy">
              <p className="admin-sidebar__profile-name">Super Admin</p>
              <p className="admin-sidebar__profile-email">
                admin@betforge.io
              </p>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            aria-label="Toggle sidebar"
            className="admin-icon-trigger"
            onClick={() => setSidebarOpen((current) => !current)}
            type="button"
          >
            <Menu size={18} />
          </button>

          <div className="admin-search">
            <Search size={14} className="admin-text-muted" />
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search users, bets, events..."
              value={searchQuery}
            />
          </div>

          <div className="admin-topbar__actions">
            <div className="admin-live-pill">
              <span className="admin-live-pill__dot" />
              <span>LIVE</span>
            </div>

            <button
              aria-label="View notifications"
              className="admin-icon-trigger admin-icon-trigger--notification"
              onClick={() => setNotifications(0)}
              type="button"
            >
              <Bell size={18} />
              {notifications > 0 ? (
                <span className="admin-notification-badge">
                  {notifications}
                </span>
              ) : null}
            </button>

            <div className="admin-avatar">SA</div>
          </div>
        </header>

        <main className="admin-content admin-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
