import { Link, useLocation } from "@tanstack/react-router";
import { Bell, Menu, Plus, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import SearchBar from "@/components/search/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { formatMoney } from "@/features/user/payments/data";
import {
  useAppNotifications,
  useMarkAllNotificationsRead,
} from "@/features/notifications/notifications";
import { useWalletSummary } from "@/features/user/payments/wallet";

type NavbarProps = {
  onToggleSidebar: () => void;
};

type NavRoute = {
  label: string;
  icon: string;
  to: string;
  badge?: {
    text: string;
    tone: "red" | "gold" | "green";
  };
};

const tickerItems = [
  { label: "Arsenal vs Liverpool", odds: "1.85", up: true },
  { label: "PSG vs Bayern", odds: "2.10", up: false },
  { label: "Inter vs Milan", odds: "1.92", up: true },
  { label: "Madrid vs Sevilla", odds: "1.73", up: true },
  { label: "Chelsea vs Villa", odds: "2.40", up: false },
];

const navLinks: NavRoute[] = [
  { label: "Home", icon: "#", to: "/user" },
  {
    label: "Live",
    icon: "o",
    to: "/user/payments/deposit",
    badge: { text: "24", tone: "red" },
  },
  { label: "Upcoming", icon: "*", to: "/user/payments" },
  // {
  //   label: "Jackpot",
  //   icon: "$",
  //   to: "/user/coming-soon?feature=jackpot",
  //   badge: { text: "4.2M", tone: "gold" },
  // },
  // {
  //   label: "Promotions",
  //   icon: "+",
  //   to: "/user/coming-soon?feature=promotions",
  //   badge: { text: "New", tone: "green" },
  // },
  { label: "Results", icon: "=", to: "/user/payments/history" },
  // { label: "Casino", icon: "@", to: "/user/coming-soon?feature=casino" },
  { label: "My Bets", icon: "[]", to: "/user/payments" },
];

const leagues = [
  "All Sports",
  "UCL",
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
  "NBA",
  "Tennis",
  "MMA/UFC",
  "Cricket",
  "Rugby",
];

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { data: walletData } = useWalletSummary();
  const { data: notificationData } = useAppNotifications(12);
  const markAllNotificationsRead = useMarkAllNotificationsRead();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const lastPathRef = useRef(location.pathname);

  const tickerLoop = useMemo(() => [...tickerItems, ...tickerItems], []);

  const maskedPhone = useMemo(() => {
    if (!user?.phone) return "";
    const digits = user.phone.replace(/\D/g, "");
    if (digits.length < 10) return user.phone;

    const local = digits.startsWith("254") ? `0${digits.slice(3)}` : user.phone;
    if (local.length !== 10) return local;

    return `${local.slice(0, 4)}***${local.slice(-3)}`;
  }, [user?.phone]);

  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname;
      setNotificationsOpen(false);
    }
  }, [location.pathname]);

  const notifications = notificationData?.notifications ?? [];
  const unreadCount = notificationData?.unreadCount ?? 0;

  return (
    <header className="bc-navbar" role="banner">
      <div className="bc-ticker">
        <span className="bc-live-pill">LIVE</span>
        <div className="bc-ticker-viewport">
          <div className="bc-ticker-track">
            {tickerLoop.map((item, index) => (
              <div key={`${item.label}-${index}`} className="bc-ticker-item">
                <span>{item.label}</span>
                <span className={item.up ? "is-up" : "is-down"}>
                  {item.up ? "▲" : "▼"} {item.odds}
                </span>
                <span className="bc-ticker-sep" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bc-main-row">
        <button
          type="button"
          className="bc-hamburger"
          aria-label="Open sidebar"
          onClick={onToggleSidebar}
        >
          <Menu size={18} />
        </button>

        <Link to="/user" className="bc-logo" aria-label="BettCenic home">
          <span className="bc-logo-icon" aria-hidden="true">
            *
          </span>
          <span className="bc-logo-text">
            <span className="is-white">BETT</span>
            <span className="is-gold">CENIC</span>
          </span>
        </Link>

        <div className="bc-main-search">
          <SearchBar />
        </div>

        <nav className="bc-nav-links" aria-label="Primary">
          {navLinks.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to as never}
                className={`bc-nav-link ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  if (item.to.includes("coming-soon")) {
                    console.warn(`Route ${item.to} not yet implemented`);
                  }
                }}
              >
                <span className="bc-link-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="bc-link-label">{item.label}</span>
                {item.badge ? (
                  <span className={`bc-badge ${item.badge.tone}`}>
                    {item.badge.text}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="bc-actions">
          <div className="bc-balance-card">
            <div className="bc-balance-icon">
              <Wallet size={16} />
            </div>
            <div className="bc-balance-content">
              <span className="bc-balance-label">BALANCE</span>
              <span className="bc-balance-value">
                {walletData ? formatMoney(walletData.wallet.balance) : "KES --"}
              </span>
            </div>
          </div>

          <div className="bc-notify">
            <button
              type="button"
              className="bc-icon-btn"
              aria-label="Open notifications"
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
            </button>
            {unreadCount > 0 ? (
              <span className="bc-notify-dot" aria-hidden="true" />
            ) : null}
            {notificationsOpen ? (
              <div className="bc-notify-dropdown" role="menu">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="bc-notify-item"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <strong>{notification.title}:</strong>{" "}
                      {notification.message}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    className="bc-notify-item"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    No new notifications.
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {isAuthenticated ? (
            <div className="bc-auth-group">
              <span className="bc-phone-badge">{maskedPhone}</span>
              <button
                type="button"
                className="bc-logout-btn"
                onClick={() => {
                  void logout();
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="bc-auth-group">
              <Link to="/register" className="bc-register-btn">
                Register
              </Link>
              <Link to="/login" className="bc-login-btn">
                Login
              </Link>
            </div>
          )}

          <Link
            to="/user/payments/deposit"
            className="bc-deposit-btn"
            aria-label="Deposit funds"
          >
            <Plus size={18} />
            <span className="bc-deposit-text">Deposit</span>
          </Link>
        </div>
      </div>

      <div className="bc-leagues">
        {leagues.map((league, index) => (
          <div key={league} className="bc-league-wrap">
            <button
              type="button"
              className={`bc-league ${index === 0 ? "is-active" : ""}`}
            >
              {league}
            </button>
            {index < leagues.length - 1 ? (
              <span className="bc-league-sep" aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </div>
    </header>
  );
}
