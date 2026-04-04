import { Link, useLocation } from "@tanstack/react-router";
import { Bell, Menu, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import SearchBar from "@/components/search/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { formatMoney, walletSummary } from "@/features/user/payments/data";

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

// REMOVED: Results, Casino, and My Bets for the public view
const navLinks: NavRoute[] = [
  { label: "Home", icon: "#", to: "/user" },
  {
    label: "Live",
    icon: "o",
    to: "/user/payments/deposit",
    badge: { text: "24", tone: "red" },
  },
  { label: "Upcoming", icon: "*", to: "/user/payments" },
  {
    label: "Jackpot",
    icon: "$",
    to: "/user/coming-soon?feature=jackpot",
    badge: { text: "4.2M", tone: "gold" },
  },
  {
    label: "Promotions",
    icon: "+",
    to: "/user/coming-soon?feature=promotions",
    badge: { text: "New", tone: "green" },
  },
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

        <Link to="/user" className="bc-logo" aria-label="BetixPro home">
          <span className="bc-logo-icon" aria-hidden="true">
            *
          </span>
          <span className="bc-logo-text">
            {/* UPDATED: Brand name changed to BetixPro */}
            <span className="is-white">Betix</span>
            <span className="is-gold">Pro</span>
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
          
          {/* UPDATED: Only show the Balance if the user is logged in */}
          {isAuthenticated ? (
             <div className="bc-balance" aria-label="Balance">
               <span className="bc-balance-label">BALANCE</span>
               <span className="bc-balance-value">
                 {formatMoney(walletSummary.balance)}
               </span>
             </div>
          ) : null}

          <div className="bc-notify">
            <button
              type="button"
              className="bc-icon-btn"
              aria-label="Open notifications"
              onClick={() => setNotificationsOpen((prev) => !prev)}
            >
              <Bell size={16} />
            </button>
            <span className="bc-notify-dot" aria-hidden="true" />
            {notificationsOpen ? (
              <div className="bc-notify-dropdown" role="menu">
                <button
                  type="button"
                  className="bc-notify-item"
                  onClick={() => setNotificationsOpen(false)}
                >
                  Odds update available
                </button>
                <button
                  type="button"
                  className="bc-notify-item"
                  onClick={() => setNotificationsOpen(false)}
                >
                  Withdrawal status changed
                </button>
              </div>
            ) : null}
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-admin-text-primary">
                {maskedPhone}
              </span>
              <button
                type="button"
                className="rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs font-semibold text-admin-text-primary transition hover:border-[var(--color-border-accent)]"
                onClick={() => {
                  void logout();
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/register"
                className="rounded-lg border border-admin-border bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs font-semibold text-admin-text-primary transition hover:border-[var(--color-border-accent)]"
              >
                Register
              </Link>
              <Link
                to="/login"
                className="rounded-lg bg-admin-accent px-3 py-1.5 text-xs font-semibold text-[var(--color-text-dark)]"
              >
                Login
              </Link>
            </div>
          )}

          {/* UPDATED: Only show the Deposit button if the user is logged in */}
          {isAuthenticated ? (
            <Link
              to="/user/payments/deposit"
              className="bc-deposit-btn"
              aria-label="Deposit funds"
            >
              <Plus size={14} />
              <span className="bc-deposit-text">Deposit</span>
            </Link>
          ) : null}

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