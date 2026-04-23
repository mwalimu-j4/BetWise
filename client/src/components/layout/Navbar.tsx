import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  CircleCheck,
  CircleX,
  Flame,
  House,
  Menu,
  Star,
  TrendingUp,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AccountDropdown from "@/components/layout/AccountDropdown";
import SearchBar from "@/components/search/SearchBar";
import { useAuth } from "@/context/AuthContext";
import {
  useAppNotifications,
  useMarkAllNotificationsRead,
} from "@/features/notifications/notifications";
import { useMyBetsCount } from "@/features/user/components/hooks/useMyBets";
import { formatMoney } from "@/features/user/payments/data";
import { useWalletSummary } from "@/features/user/payments/wallet";
import { useLiveMatches } from "@/features/user/components/hooks/useLiveMatches";

// ✅ NEW: Import your logo (standard Vite + shadcn alias)
import Logo from "@/assets/logo.png";

type NavbarProps = {
  onToggleSidebar: () => void;
};


const quickLinks = [
  { label: "Home", to: "/user", icon: <House size={14} /> },
  {
    label: "Live",
    to: "/user/live",
    icon: <Flame size={14} />,
    isLive: true,
  },
  { label: "Featured", to: "/user/featured-events", icon: <Star size={14} /> },
  {
    label: "Football",
    to: "/user/sport/football",
    icon: <Trophy size={14} />,
  },
  {
    label: "Basketball",
    to: "/user/sport/basketball",
    icon: <Zap size={14} />,
  },
  { label: "Tennis", to: "/user/sport/tennis", icon: <TrendingUp size={14} /> },
];

const leagues = [
  { label: "Premier League", to: "/user/sport/football" },
  { label: "Champions League", to: "/user/sport/football" },
  { label: "La Liga", to: "/user/sport/football" },
  { label: "NBA", to: "/user/sport/basketball" },
  { label: "UFC", to: "/user/sport/boxing-mma" },
];

function formatNotificationTime(isoDate: string) {
  const eventTime = new Date(isoDate).getTime();
  if (Number.isNaN(eventTime)) {
    return "Just now";
  }

  const minutesAgo = Math.max(0, Math.floor((Date.now() - eventTime) / 60000));

  if (minutesAgo < 1) {
    return "Just now";
  }

  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }

  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo}d ago`;
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof (value as { message?: unknown }).message === "string"
  ) {
    return (value as { message: string }).message;
  }

  return fallback;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();

  const { data: walletSummary } = useWalletSummary();
  const { data: myBetsCount = 0 } = useMyBetsCount();
  const { data: notificationData } = useAppNotifications(12);
  const markAllNotificationsRead = useMarkAllNotificationsRead();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const lastPathRef = useRef(location.pathname);
  const notifyRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const { matches } = useLiveMatches({ highlights: false, market: "1x2", q: "" });

  const tickerItems = useMemo(() => {
    if (!matches || matches.length === 0) return [];

    return matches.slice(0, 10).map((match) => {
      // Find a representative market (1x2 or Winner)
      const h2h = match.markets.find(
        (m) => m.type === "1x2" || m.type === "winner",
      );
      // Usually the first selection is Home win
      const selection = h2h?.selections[0];

      return {
        id: match.id,
        label: `${match.home_team.name} vs ${match.away_team.name}`,
        odds: selection?.odds?.toFixed(2) ?? "1.00",
        up: (selection?.odds ?? 0) >= (selection?.previous_odds ?? 0),
      };
    });
  }, [matches]);

  const tickerLoop = useMemo(() => {
    if (tickerItems.length === 0) return [];
    // Ensure we have enough items for the animation loop
    return tickerItems.length < 5
      ? [...tickerItems, ...tickerItems, ...tickerItems]
      : [...tickerItems, ...tickerItems];
  }, [tickerItems]);

  const [showSubNav, setShowSubNav] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bc_show_sub_nav");
      return saved === null ? true : saved === "true";
    }
    return true;
  });

  const computeNavbarHeight = useMemo(
    () => (showSubNav: boolean) => {
      if (typeof window === "undefined") {
        return showSubNav ? "130px" : "82px";
      }

      const width = window.innerWidth;
      if (width <= 480) return "48px";
      if (width <= 600) return "52px";
      if (width <= 1024) return "82px";
      return showSubNav ? "130px" : "82px";
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem("bc_show_sub_nav", String(showSubNav));

    const applyNavbarHeight = () => {
      document.documentElement.style.setProperty(
        "--navbar-height",
        computeNavbarHeight(showSubNav),
      );
    };

    applyNavbarHeight();
    window.addEventListener("resize", applyNavbarHeight);

    return () => {
      window.removeEventListener("resize", applyNavbarHeight);
    };
  }, [computeNavbarHeight, showSubNav]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | Event) => {
      if (e instanceof StorageEvent && e.key !== "bc_show_sub_nav") return;

      const saved = localStorage.getItem("bc_show_sub_nav");
      setShowSubNav(saved === null ? true : saved === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname;
      setNotificationsOpen(false);
      setAccountOpen(false);
    }
  }, [location.pathname]);

  // Handle click outside dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      // Close notifications if clicking outside
      if (notifyRef.current && !notifyRef.current.contains(target)) {
        setNotificationsOpen(false);
      }

      // Close account dropdown if clicking outside
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
    }

    if (notificationsOpen || accountOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [notificationsOpen, accountOpen]);

  const notifications = notificationData?.notifications ?? [];
  const unreadCount = notificationData?.unreadCount ?? 0;

  const isSuccessNotification = (type: string) =>
    type === "DEPOSIT_SUCCESS" || type === "WITHDRAWAL_SUCCESS";

  const isFailedNotification = (type: string) =>
    type === "DEPOSIT_FAILED" ||
    type === "WITHDRAWAL_FAILED" ||
    type === "ERROR";

  const isWarningNotification = (type: string) =>
    type === "BET_LOST" || type === "BET_CANCELLED" || type === "MATCH_ENDED";

  return (
    <header className="bc-navbar" role="banner">
      <div className="bc-ticker">
        <span className="bc-live-pill">LIVE</span>
        <div className="bc-ticker-viewport">
          <div className="bc-ticker-track">
            {tickerLoop.length > 0 ? (
              tickerLoop.map((item, index) => (
                <Link
                  key={`${item.label}-${index}`}
                  to="/user/live"
                  search={{ highlight: item.id }}
                  className="bc-ticker-item cursor-pointer transition-colors hover:bg-white/5"
                >
                  <span>{item.label}</span>
                  <span className={item.up ? "is-up" : "is-down"}>
                    {item.up ? "▲" : "▼"} {item.odds}
                  </span>
                  <span className="bc-ticker-sep" aria-hidden="true" />
                </Link>
              ))
            ) : (
              <div className="bc-ticker-item">
                <span className="text-[10px] opacity-60 uppercase tracking-widest font-bold">
                  Stay tuned for live action • Real-time odds updates • Best betting experience
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ MOBILE + DESKTOP LAYOUT () */}
      <div className="bc-main-row flex items-center justify-between">
        <button
          type="button"
          className="bc-hamburger"
          aria-label="Open sidebar"
          onClick={onToggleSidebar}
        >
          <Menu size={22} />
        </button>

        {/* ✅ Logo */}
        <div className="flex items-center gap-3">
          <Link to="/user" className="bc-logo" aria-label="BetixPro home">
            <img
              src={Logo}
              alt="BetixPro"
              className="h-11 w-auto 
                       drop-shadow-[0_0_10px_#ffffff] 
                       drop-shadow-[0_0_18px_#fefce8] 
                       transition-all 
                       hover:drop-shadow-[0_0_12px_#ffffff] 
                       hover:drop-shadow-[0_0_22px_#fefce8]"
            />
          </Link>
        </div>

        {/* ✅ Full search bar kept ONLY on desktop (hidden on mobile) */}
        <div className="bc-main-search hidden md:flex flex-1 max-w-xl mx-auto">
          <SearchBar />
        </div>

        <div className="bc-actions flex items-center gap-2">
          {isAuthenticated && myBetsCount >= 0 ? (
            <Link
              to="/user/bets"
              search={{}}
              className="bc-my-bets-btn"
              aria-label={`Open My Bets (${myBetsCount})`}
            >
              <TrendingUp size={16} className="bc-bets-icon" />
              <span className="bc-bets-text">Bets</span>
              {myBetsCount > 0 && (
                <span className="bc-my-bets-badge" aria-hidden="true">
                  {myBetsCount > 99 ? "99+" : myBetsCount}
                </span>
              )}
            </Link>
          ) : null}

          {isAuthenticated ? (
            <button
              type="button"
              className="bc-balance-card"
              aria-label="Wallet Balance"
              onClick={() => navigate({ to: "/user/payments" })}
            >
              <div className="bc-balance-content">
                <span className="bc-balance-label">Wallet</span>
                <span className="bc-balance-value">
                  {formatMoney(walletSummary?.wallet.balance ?? 0)}
                </span>
              </div>
            </button>
          ) : (
            <span className="text-xs text-[#a8c4e0] font-medium hidden">
              Login to view balance
            </span>
          )}

          {isAuthenticated ? (
            <>
              <div className="bc-notify" ref={notifyRef}>
                <button
                  type="button"
                  className="bc-icon-btn bc-notify-trigger"
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
                  {unreadCount > 0 ? (
                    <span className="bc-notify-badge" aria-hidden="true">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>
                {notificationsOpen ? (
                  <div className="bc-notify-dropdown" role="menu">
                    <div className="bc-notify-head">
                      <div>
                        <p className="bc-notify-title">Notifications</p>
                        <p className="bc-notify-subtitle">
                          {unreadCount > 0
                            ? `${unreadCount} unread update${
                                unreadCount === 1 ? "" : "s"
                              }`
                            : "All caught up"}
                        </p>
                      </div>
                      <span className="bc-notify-count">
                        {notifications.length}
                      </span>
                    </div>
                    {notifications.length > 0 ? (
                      notifications.map((notification: any) => (
                        <button
                          key={notification.id}
                          type="button"
                          className="bc-notify-item"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          <span
                            className={`bc-notify-icon ${isSuccessNotification(notification.type) ? "is-success" : isFailedNotification(notification.type) ? "is-failed" : isWarningNotification(notification.type) ? "is-warning" : "is-info"}`}
                            aria-hidden="true"
                          >
                            {isSuccessNotification(notification.type) ? (
                              <CircleCheck size={16} />
                            ) : isFailedNotification(notification.type) ? (
                              <CircleX size={16} />
                            ) : isWarningNotification(notification.type) ? (
                              <Zap size={16} />
                            ) : (
                              <Bell size={16} />
                            )}
                          </span>
                          <span className="bc-notify-body">
                            <span className="bc-notify-item-title">
                              {toText(notification.title, "Notification")}
                            </span>
                            <span className="bc-notify-item-copy">
                              {toText(notification.message, "")}
                            </span>
                            <span className="bc-notify-item-time">
                              {formatNotificationTime(
                                toText(notification.createdAt, ""),
                              )}
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="bc-notify-empty">
                        No new notifications.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="bc-account-wrap" ref={accountRef}>
                <button
                  type="button"
                  className={`bc-account-trigger ${accountOpen ? "is-open" : ""}`}
                  onClick={() => setAccountOpen((prev) => !prev)}
                >
                  <User size={18} className="bc-account-icon" />
                  <span className="bc-account-text hidden md:inline">Account</span>
                  <ChevronDown size={14} className="bc-account-chevron hidden md:inline" />
                </button>
                <AccountDropdown
                  open={accountOpen}
                  onClose={() => setAccountOpen(false)}
                />
              </div>
            </>
          ) : (
            <div className="bc-auth-group flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="bc-register-btn"
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="bc-login-btn"
              >
                Login
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`bc-leagues   ${!showSubNav ? "is-hidden" : ""}`}>
        <div className="bc-leagues-scroll">
          {quickLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.label}
                to={link.to as never}
                className={`bc-league-link ${isActive ? "is-active" : ""} ${link.isLive ? "is-live-link" : ""}`}
              >
                <span className="bc-league-icon">{link.icon}</span>
                <span className="bc-league-label">{link.label}</span>
                {link.isLive && <span className="bc-live-dot" />}
              </Link>
            );
          })}

          <div className="bc-league-sep-v" aria-hidden="true" />

          {leagues.map((league) => (
            <Link
              key={league.label}
              to={league.to as never}
              className="bc-league-link-secondary"
            >
              {league.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          className="bc-subnav-close"
          onClick={() => setShowSubNav(false)}
          title="Hide categories (can be re-enabled in Profile Settings)"
        >
          <CircleX size={16} />
        </button>
      </div>
    </header>
  );
}
