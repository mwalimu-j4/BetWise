import { useAuth } from "@/context/AuthContext";
import { Link, useLocation } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  Circle,
  CircleDot,
  CircleSlash,
  Crosshair,
  FileText,
  Flag,
  Flame,
  HelpCircle,
  Hexagon,
  History,
  LogOut,
  MessageCircle,
  Shield,
  Star,
  Swords,
  Target,
  TrendingUp,
  Triangle,
  Trophy,
  House,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/axios";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Item = {
  label: string;
  to: string;
  icon: React.ReactNode;
  search?: Record<string, string>;
  hash?: string;
  match?: "highlights" | "home";
  liveBadge?: string;
  badgeCount?: number;
  badgeGold?: boolean;
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

type EventCounts = {
  football: number;
  basketball: number;
  tennis: number;
  americanFootball: number;
  cricket: number;
  iceHockey: number;
  rugbyUnion: number;
};

type SportCategoryItem = {
  id: string;
  sportKey: string;
  displayName: string;
  icon: string;
  sortOrder: number;
  eventCount: number;
  lastSyncedAt: string | null;
};

const SPORT_KEY_TO_SLUG: Record<string, string> = {
  soccer: "football",
  basketball: "basketball",
  tennis: "tennis",
  americanfootball: "american-football",
  cricket: "cricket",
  icehockey: "ice-hockey",
  rugbyunion: "rugby-union",
  boxing_mma: "boxing-mma",
  baseball: "baseball",
  volleyball: "volleyball",
  tabletennis: "table-tennis",
  golf: "golf",
  snooker: "snooker",
  darts: "darts",
};

function toEventCountKey(raw: string): keyof EventCounts | null {
  const value = raw.toLowerCase();
  if (value.includes("soccer") || value.includes("football")) return "football";
  if (value.includes("basket")) return "basketball";
  if (value.includes("tennis") && value.includes("table")) return null;
  if (value.includes("tennis")) return "tennis";
  if (value.includes("american")) return "americanFootball";
  if (value.includes("cricket")) return "cricket";
  if (value.includes("hockey")) return "iceHockey";
  if (value.includes("rugby")) return "rugbyUnion";
  return null;
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
  const section =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("section")
      : null;
  const hash =
    typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
  const isActive =
    item.match === "highlights"
      ? location.pathname === "/user/highlights" ||
        (location.pathname === "/user" &&
          (section === "highlights" || hash === "highlights"))
      : item.match === "home"
        ? location.pathname === "/user" &&
          section !== "highlights" &&
          hash !== "highlights"
        : location.pathname === item.to;

  return (
    <Link
      to={item.to as never}
      search={item.search as never}
      hash={item.hash}
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
      {item.badgeCount && item.badgeCount > 0 ? (
        <span className={`bc-badge ${item.badgeGold ? "gold" : ""}`.trim()}>
          {item.badgeCount}
        </span>
      ) : null}
      {item.liveBadge ? (
        <span className="bc-side-live-badge">{item.liveBadge}</span>
      ) : null}
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isAuthenticated, logout, openAuthModal } = useAuth();
  const [openSports, setOpenSports] = useState<Record<string, boolean>>({
    football: true,
    basketball: true,
  });
  const [eventCounts, setEventCounts] = useState<EventCounts | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState<
    SportCategoryItem[]
  >([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const accountSection = useMemo(() => {
    if (!isAuthenticated) return [];
    return myAccount;
  }, [isAuthenticated]);

  function closeIfMobile() {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      onClose();
    }
  }

  // Fetch dynamic sport categories from the API
  useEffect(() => {
    let mounted = true;

    const fetchCategories = async () => {
      try {
        const { data } = await api.get<{ categories: SportCategoryItem[] }>(
          "/user/sport-categories",
        );
        if (mounted) {
          setDynamicCategories(data.categories);
          setCategoriesLoaded(true);
        }
      } catch {
        if (mounted) {
          setCategoriesLoaded(true); // Fall back to hardcoded
        }
      }
    };

    void fetchCategories();
    const timer = window.setInterval(() => {
      void fetchCategories();
    }, 60_000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

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

        const nextEventCounts: EventCounts = {
          football: 0,
          basketball: 0,
          tennis: 0,
          americanFootball: 0,
          cricket: 0,
          iceHockey: 0,
          rugbyUnion: 0,
        };

        for (const match of data.matches ?? []) {
          const sportKey = toEventCountKey(match.sport ?? "soccer");
          if (sportKey) {
            nextEventCounts[sportKey] += 1;
          }
        }

        setEventCounts(nextEventCounts);
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
              {
                label: "Homepage",
                to: "/user",
                icon: <House size={18} />,
                match: "home" as const,
              },
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
                to: "/user",
                search: { section: "highlights" },
                hash: "highlights",
                match: "highlights" as const,
                icon: <Flame size={18} />,
              },
            ].map((item) => (
              <ItemLink key={item.label} item={item} onClick={closeIfMobile} />
            ))}
          </div>

          {/* DYNAMIC SPORT CATEGORIES */}
          {categoriesLoaded && dynamicCategories.length > 0 ? (
            <div className="bc-side-section">
              <p className="bc-side-heading">
                <span className="bc-heading-dot" aria-hidden="true" />
                Sports
              </p>
              {dynamicCategories.map((cat) => {
                const slug = SPORT_KEY_TO_SLUG[cat.sportKey] ?? cat.sportKey;
                return (
                  <ItemLink
                    key={cat.id}
                    item={{
                      label: cat.displayName,
                      to: `/user/sport/${slug}`,
                      icon: <span className="text-base">{cat.icon}</span>,
                      badgeCount:
                        cat.eventCount > 0 ? cat.eventCount : undefined,
                      badgeGold: cat.sportKey === "soccer",
                    }}
                    onClick={closeIfMobile}
                  />
                );
              })}
            </div>
          ) : (
            /* FALLBACK: Hardcoded sports when API hasn't loaded */
            <>
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
                    badgeCount: eventCounts?.football ?? 0,
                    badgeGold: true,
                  },
                  {
                    label: "Basketball",
                    to: "/user/sport/basketball",
                    icon: <CircleDot size={18} />,
                    badgeCount: eventCounts?.basketball ?? 0,
                  },
                  {
                    label: "Tennis",
                    to: "/user/sport/tennis",
                    icon: <Circle size={18} />,
                    badgeCount: eventCounts?.tennis ?? 0,
                  },
                  {
                    label: "American Football",
                    to: "/user/sport/american-football",
                    icon: <Shield size={18} />,
                    badgeCount: eventCounts?.americanFootball ?? 0,
                  },
                  {
                    label: "Cricket",
                    to: "/user/sport/cricket",
                    icon: <Triangle size={18} />,
                    badgeCount: eventCounts?.cricket ?? 0,
                  },
                  {
                    label: "Ice Hockey",
                    to: "/user/sport/ice-hockey",
                    icon: <CircleSlash size={18} />,
                    badgeCount: eventCounts?.iceHockey ?? 0,
                  },
                  {
                    label: "Rugby Union",
                    to: "/user/sport/rugby-union",
                    icon: <Hexagon size={18} />,
                    badgeCount: eventCounts?.rugbyUnion ?? 0,
                  },
                ].map((item) => (
                  <ItemLink
                    key={item.label}
                    item={item}
                    onClick={closeIfMobile}
                  />
                ))}
              </div>

              <div className="bc-side-section">
                <p className="bc-side-heading">
                  <span className="bc-heading-dot" aria-hidden="true" />
                  More Sports
                </p>
                {[
                  {
                    label: "Boxing / MMA",
                    to: "/user/sport/boxing-mma",
                    icon: <Swords size={18} />,
                  },
                  {
                    label: "Baseball",
                    to: "/user/sport/baseball",
                    icon: <CircleDot size={18} />,
                  },
                  {
                    label: "Volleyball",
                    to: "/user/sport/volleyball",
                    icon: <Circle size={18} />,
                  },
                  {
                    label: "Table Tennis",
                    to: "/user/sport/table-tennis",
                    icon: <Crosshair size={18} />,
                  },
                  {
                    label: "Golf",
                    to: "/user/sport/golf",
                    icon: <Flag size={18} />,
                  },
                  {
                    label: "Snooker",
                    to: "/user/sport/snooker",
                    icon: <CircleSlash size={18} />,
                  },
                  {
                    label: "Darts",
                    to: "/user/sport/darts",
                    icon: <Target size={18} />,
                  },
                ].map((item) => (
                  <ItemLink
                    key={item.label}
                    item={item}
                    onClick={closeIfMobile}
                  />
                ))}
              </div>
            </>
          )}

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
