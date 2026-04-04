import { Link, useLocation } from "@tanstack/react-router";
import { Bell, Menu, Plus, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AccountDropdown from "@/components/layout/AccountDropdown";
import SearchBar from "@/components/search/SearchBar";
import { authClient } from "@/lib/auth-client";
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
  { label: "Results", icon: "=", to: "/user/payments/history" },
  { label: "Casino", icon: "@", to: "/user/coming-soon?feature=casino" },
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
  const session = authClient.useSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const accountWrapRef = useRef<HTMLDivElement | null>(null);
  const lastPathRef = useRef(location.pathname);

  const tickerLoop = useMemo(() => [...tickerItems, ...tickerItems], []);
  const initials = (
    session.data?.user?.name ||
    session.data?.user?.email ||
    "U"
  )
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  useEffect(() => {
    if (!accountOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (!accountWrapRef.current) return;
      if (!accountWrapRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname;
      setAccountOpen(false);
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
          <div className="bc-balance" aria-label="Balance">
            <span className="bc-balance-label">BALANCE</span>
            <span className="bc-balance-value">
              {formatMoney(walletSummary.balance)}
            </span>
          </div>

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

          <div className="bc-account-wrap" ref={accountWrapRef}>
            <button
              type="button"
              className={`bc-account-trigger ${accountOpen ? "is-open" : ""}`}
              aria-label="Open account"
              onClick={() => setAccountOpen((prev) => !prev)}
            >
              <span className="bc-trigger-avatar">
                {session.data?.user?.image ? (
                  <img
                    src={session.data.user.image}
                    alt="Account"
                    className="bc-account-avatar-img"
                  />
                ) : (
                  initials || <UserRound size={14} />
                )}
              </span>
              <span className="bc-account-label">Account</span>
              <span className="bc-account-chevron" aria-hidden="true">
                v
              </span>
            </button>
            <AccountDropdown
              open={accountOpen}
              onClose={() => setAccountOpen(false)}
            />
          </div>

          <Link
            to="/user/payments/deposit"
            className="bc-deposit-btn"
            aria-label="Deposit funds"
          >
            <Plus size={14} />
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
