import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  Circle,
  CircleDot,
  CircleSlash,
  Crosshair,
  FileText,
  Flame,
  HelpCircle,
  Hexagon,
  History,
  House,
  LogOut,
  MessageCircle,
  Shield,
  Star,
  Swords,
  Target,
  TrendingUp,
  Triangle,
  Trophy,
  User,
  Wallet,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Item = {
  label: string;
  to: string;
  icon: React.ReactNode;
  liveBadge?: string;
  warn?: boolean;
  notificationBadge?: boolean;
};

type Group = {
  key: string;
  label: string;
  icon: React.ReactNode;
  children: Item[];
};

type LiveSidebarMatch = {
  id: string;
  sport: string;
};

const liveSportsOrder = [
  "Soccer",
  "Basketball",
  "Tennis",
  "Ice Hockey",
  "Volleyball",
  "Cricket",
  "Handball",
  "Table Tennis",
] as const;

function toSidebarSportName(raw: string) {
  const value = raw.toLowerCase();
  if (value.includes("soccer") || value.includes("football")) return "Soccer";
  if (value.includes("basket")) return "Basketball";
  if (value.includes("tennis") && value.includes("table"))
    return "Table Tennis";
  if (value.includes("tennis")) return "Tennis";
  if (value.includes("hockey")) return "Ice Hockey";
  if (value.includes("volley")) return "Volleyball";
  if (value.includes("cricket")) return "Cricket";
  if (value.includes("handball")) return "Handball";
  return "Soccer";
}

function sportIcon(name: string): React.ReactNode {
  switch (name) {
    case "Soccer":
      return "⚽";
    case "Basketball":
      return "🏀";
    case "Tennis":
      return "🎾";
    case "Ice Hockey":
      return "🏒";
    case "Volleyball":
      return "🏐";
    case "Cricket":
      return "🏏";
    case "Handball":
      return "🤾";
    case "Table Tennis":
      return "🏓";
    default:
      return "🎯";
  }
}

const myAccount: Item[] = [
  {
    label: "My Profile",
    to: "/user/profile",
    icon: <User size={18} />,
  },
  { label: "My Wallet", to: "/user/payments", icon: <Wallet size={18} /> },
  { label: "My Bets", to: "/my-bets", icon: <TrendingUp size={18} /> },
];

const payments: Item[] = [
  {
    label: "Deposit",
    to: "/user/payments/deposit",
    icon: <ArrowDownToLine size={18} />,
  },
  {
    label: "Withdrawal",
    to: "/user/payments/withdrawal",
    icon: <ArrowUpFromLine size={18} />,
  },
  {
    label: "Transaction History",
    to: "/user/payments/history",
    icon: <History size={18} />,
  },
];

// const analytics: Item[] = [
//   { label: "Reports", to: "/user/reports", icon: <BarChart3 size={18} /> },
// ];

const topLeagues: Item[] = [];

const sportsGroups: Group[] = [];

const helpLinks: Item[] = [
  {
    label: "How It Works",
    to: "/user/how-it-works",
    icon: <HelpCircle size={18} />,
  },
  { label: "FAQs", to: "/user/faqs", icon: <FileText size={18} /> },
  {
    label: "Contact Us",
    to: "/user/contact",
    icon: <MessageCircle size={18} />,
  },
];

function ItemLink({ item, onClick }: { item: Item; onClick: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === item.to;

  return (
    <Link
      to={item.to as never}
      className={`bc-sidebar-link ${isActive ? "is-active" : ""}`}
      onClick={() => {
        if (item.warn) {
          console.warn(`Route ${item.to} not yet implemented`);
        }
        onClick();
      }}
    >
      <span className="bc-side-icon" aria-hidden="true">
        {item.icon}
      </span>
      <span className="bc-side-label">{item.label}</span>
      {item.liveBadge ? (
        <span className="bc-side-live-badge">{item.liveBadge}</span>
      ) : null}
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isAuthenticated, logout, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [openSports, setOpenSports] = useState<Record<string, boolean>>({
    football: true,
    basketball: true,
  });
  const [liveSportsOpen, setLiveSportsOpen] = useState(!isAuthenticated);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>(() => ({
    Soccer: 0,
    Basketball: 0,
    Tennis: 0,
    "Ice Hockey": 0,
    Volleyball: 0,
    Cricket: 0,
    Handball: 0,
    "Table Tennis": 0,
  }));

  const accountSection = useMemo(() => {
    if (!isAuthenticated) return [];
    return myAccount;
  }, [isAuthenticated]);

  // Update Live Sports section visibility based on auth state
  useEffect(() => {
    setLiveSportsOpen(!isAuthenticated);
  }, [isAuthenticated]);

  function closeIfMobile() {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      onClose();
    }
  }

  useEffect(() => {
    let mounted = true;

    const fetchLiveCounts = async () => {
      try {
        const { data } = await api.get<{ matches: LiveSidebarMatch[] }>(
          "/live/matches",
          {
            params: {
              highlights: false,
              market: "1x2",
              limit: 300,
            },
          },
        );

        if (!mounted) {
          return;
        }

        const nextCounts: Record<string, number> = {
          Soccer: 0,
          Basketball: 0,
          Tennis: 0,
          "Ice Hockey": 0,
          Volleyball: 0,
          Cricket: 0,
          Handball: 0,
          "Table Tennis": 0,
        };

        for (const match of data.matches ?? []) {
          const sportName = toSidebarSportName(match.sport ?? "soccer");
          nextCounts[sportName] = (nextCounts[sportName] ?? 0) + 1;
        }

        setLiveCounts(nextCounts);
      } catch {
        if (!mounted) {
          return;
        }
      }
    };

    void fetchLiveCounts();
    const timer = window.setInterval(() => {
      void fetchLiveCounts();
    }, 10_000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <>
      <aside className={`bc-sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="bc-side-scroll">
      
          {/* MAIN NAVIGATION */}
          <div className="bc-side-section">
            <p className="bc-side-heading">
              <span className="bc-heading-dot" aria-hidden="true" />
              Home & Quick Access
            </p>
            {[
              { label: "Homepage", to: "/user", icon: <House size={18} /> },
              {
                label: "Live Betting",
                to: "/user/live",
                icon: <Flame size={18} />,
                liveBadge: "LIVE",
              },
              {
                label: "Featured Events",
                to: "/user/featured-events",
                icon: <Star size={18} />,
                liveBadge: "NEW",
              },
              {
                label: "Custom Events",
                to: "/user/custom-events",
                icon: <Zap size={18} />,
              },
              {
                label: "My Bets",
                to: "/my-bets",
                icon: <TrendingUp size={18} />,
              },
              {
                label: "Highlights",
                to: "/user/highlights",
                icon: <Flame size={18} />,
              },
            ].map((item) => (
              <ItemLink key={item.label} item={item} onClick={closeIfMobile} />
            ))}
          </div>

          <div className="bc-side-section">
            <p className="bc-side-heading">
              <span className="bc-heading-dot" aria-hidden="true" />
              Popular Sports
            </p>
            {[
              {
                label: "Football",
                to: "/user/sport/football",
                icon: <Trophy size={18} />,
                badgeCount: 0,
                badgeGold: true,
              },
              {
                label: "Basketball",
                to: "/user/sport/basketball",
                icon: <CircleDot size={18} />,
                badgeCount: 0,
              },
              {
                label: "Tennis",
                to: "/user/sport/tennis",
                icon: <Circle size={18} />,
                badgeCount: 0,
              },
              {
                label: "American Football",
                to: "/user/sport/american-football",
                icon: <Shield size={18} />,
                badgeCount: 0,
              },
              {
                label: "Cricket",
                to: "/user/sport/cricket",
                icon: <Triangle size={18} />,
                badgeCount: 0,
              },
              {
                label: "Ice Hockey",
                to: "/user/sport/ice-hockey",
                icon: <CircleSlash size={18} />,
                badgeCount: 0,
              },
              {
                label: "Rugby Union",
                to: "/user/sport/rugby-union",
                icon: <Hexagon size={18} />,
                badgeCount: 0,
              },
            ].map((item) => (
              <ItemLink key={item.label} item={item} onClick={closeIfMobile} />
            ))}
          </div>

          {/* MAIN NAVIGATION */}
          <div className="bc-side-section">
            {navigationLinks.map((item) => (
              <ItemLink key={item.label} item={item} onClick={closeIfMobile} />
            ))}
          </div>

          {/* MY ACCOUNT SECTION */}
          {accountSection.length > 0 ? (
            <div className="bc-side-section">
              <p className="bc-side-heading">My Account</p>
              {myAccount.map((item) => (
                <ItemLink
                  key={item.label}
                  item={item}
                  onClick={closeIfMobile}
                />
              ))}
            </div>
          ) : null}

          {/* PAYMENTS & TRANSACTIONS SECTION */}
          {accountSection.length > 0 ? (
            <div className="bc-side-section">
              <p className="bc-side-heading">Transactions & Payments</p>
              {payments.map((item) => (
                <ItemLink
                  key={item.label}
                  item={item}
                  onClick={closeIfMobile}
                />
              ))}
            </div>
          ) : null}

          {/* ANALYTICS & REPORTS SECTION */}
          {/* {accountSection.length > 0 ? (
            <div className="bc-side-section">
              <p className="bc-side-heading">Analytics</p>
              {analytics.map((item) => (
                <ItemLink
                  key={item.label}
                  item={item}
                  onClick={closeIfMobile}
                />
              ))}
            </div>
          ) : null} */}

          {topLeagues.length > 0 ? (
            <div className="bc-side-section">
              <p className="bc-side-heading">Top Leagues</p>
              {topLeagues.map((item) => (
                <ItemLink
                  key={item.label}
                  item={item}
                  onClick={closeIfMobile}
                />
              ))}
            </div>
          ) : null}

          {sportsGroups.length > 0 ? (
            <div className="bc-side-section">
              <p className="bc-side-heading">All Sports</p>
              {sportsGroups.map((group) => {
                const open = openSports[group.key] ?? false;
                return (
                  <div key={group.key} className="bc-side-group">
                    <button
                      type="button"
                      className="bc-side-toggle"
                      onClick={() =>
                        setOpenSports((prev) => ({
                          ...prev,
                          [group.key]: !open,
                        }))
                      }
                    >
                      <span className="bc-side-icon" aria-hidden="true">
                        {group.icon}
                      </span>
                      <span>{group.label}</span>
                      <ChevronDown
                        className={`bc-side-chevron ${open ? "is-open" : ""}`}
                        size={14}
                      />
                    </button>
                    <div
                      className={`bc-side-children ${open ? "is-open" : ""}`}
                    >
                      {group.children.map((child) => (
                        <ItemLink
                          key={child.label}
                          item={child}
                          onClick={closeIfMobile}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* HELP & SUPPORT SECTION */}
          <div className="bc-side-section">
            <p className="bc-side-heading">Help & Support</p>
            {helpLinks.map((item) => (
              <ItemLink key={item.label} item={item} onClick={closeIfMobile} />
            ))}
          </div>
        </div>

        <div className="bc-side-bottom">
          {isAuthenticated ? (
            <button
              type="button"
              className="bc-side-logout"
              onClick={async () => {
                await logout();
                toast.success("Logged out successfully");
                openAuthModal("login");
                closeIfMobile();
              }}
            >
              <LogOut size={18} className="bc-side-icon" />
              <span>Logout</span>
            </button>
          ) : null}
        </div>
      </aside>

      <button
        type="button"
        className={`bc-side-backdrop ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
        aria-label="Close sidebar"
      />
    </>
  );
}
