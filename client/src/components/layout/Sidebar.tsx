import { Link, useLocation } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/axiosConfig";
import { useAuth } from "@/context/AuthContext";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Item = {
  label: string;
  to: string;
  icon: string;
  liveBadge?: string;
  warn?: boolean;
};

type Group = {
  key: string;
  label: string;
  icon: string;
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

function sportIcon(name: string) {
  switch (name) {
    case "Soccer":
      return "SO";
    case "Basketball":
      return "BK";
    case "Tennis":
      return "TN";
    case "Ice Hockey":
      return "IH";
    case "Volleyball":
      return "VB";
    case "Cricket":
      return "CK";
    case "Handball":
      return "HB";
    case "Table Tennis":
      return "TT";
    default:
      return "SP";
  }
}

const sectionOne: Item[] = [
  { label: "Homepage", to: "/user", icon: "H" },
  { label: "Pre-match", to: "/user/payments", icon: "P" },
  { label: "Live", to: "/user/live", icon: "L", liveBadge: "LIVE" },
  {
    label: "Sports",
    to: "/user/coming-soon?feature=sports",
    icon: "S",
    warn: true,
  },
  { label: "Profile", to: "/user/profile", icon: "U" },
  {
    label: "Virtual Games",
    to: "/user/coming-soon?feature=virtual-games",
    icon: "V",
    warn: true,
  },
];

const myAccount: Item[] = [
  {
    label: "My Profile",
    to: "/user/profile",
    icon: "U",
  },
  { label: "My Wallet", to: "/user/payments", icon: "W", warn: true },
  { label: "My Bets", to: "/user/bets", icon: "B" },
  { label: "My Results", to: "/user/payments/history", icon: "R" },
  { label: "Reports", to: "/user/reports", icon: "📊" },
  { label: "Deposit", to: "/user/payments/deposit", icon: "+" },
  { label: "Withdrawal", to: "/user/payments/withdrawal", icon: "^" },
  { label: "Transaction History", to: "/user/payments/history", icon: "T" },
  {
    label: "Dashboard",
    to: "/user/coming-soon?feature=dashboard",
    icon: "D",
    warn: true,
  },
];

const topLeagues: Item[] = [
  {
    label: "UEFA Champions League",
    to: "/user/coming-soon?feature=uefa-champions-league",
    icon: "U",
    warn: true,
  },
  {
    label: "Championship",
    to: "/user/coming-soon?feature=championship",
    icon: "C",
    warn: true,
  },
  {
    label: "Premier League",
    to: "/user/coming-soon?feature=premier-league",
    icon: "P",
    warn: true,
  },
  {
    label: "La Liga",
    to: "/user/coming-soon?feature=la-liga",
    icon: "L",
    warn: true,
  },
  {
    label: "Bundesliga",
    to: "/user/coming-soon?feature=bundesliga",
    icon: "B",
    warn: true,
  },
  {
    label: "Serie A",
    to: "/user/coming-soon?feature=serie-a",
    icon: "S",
    warn: true,
  },
  {
    label: "Ligue 1",
    to: "/user/coming-soon?feature=ligue-1",
    icon: "G",
    warn: true,
  },
];

const sportsGroups: Group[] = [
  {
    key: "football",
    label: "Football",
    icon: "F",
    children: [
      {
        label: "UEFA Champions League",
        to: "/user/coming-soon?feature=uefa-champions-league",
        icon: "-",
        warn: true,
      },
      {
        label: "Championship",
        to: "/user/coming-soon?feature=championship",
        icon: "-",
        warn: true,
      },
      {
        label: "Copa Libertadores",
        to: "/user/coming-soon?feature=copa-libertadores",
        icon: "-",
        warn: true,
      },
    ],
  },
  {
    key: "basketball",
    label: "Basketball",
    icon: "B",
    children: [
      {
        label: "NCAAB",
        to: "/user/coming-soon?feature=ncaab",
        icon: "-",
        warn: true,
      },
      {
        label: "NBA",
        to: "/user/coming-soon?feature=nba",
        icon: "-",
        warn: true,
      },
      {
        label: "Basketball Euroleague",
        to: "/user/coming-soon?feature=basketball-euroleague",
        icon: "-",
        warn: true,
      },
      {
        label: "NBL",
        to: "/user/coming-soon?feature=nbl",
        icon: "-",
        warn: true,
      },
      {
        label: "WNCAAB",
        to: "/user/coming-soon?feature=wncaab",
        icon: "-",
        warn: true,
      },
    ],
  },
  {
    key: "american-football",
    label: "American Football",
    icon: "A",
    children: [
      {
        label: "NCAAF",
        to: "/user/coming-soon?feature=ncaaf",
        icon: "-",
        warn: true,
      },
    ],
  },
  {
    key: "baseball",
    label: "Baseball",
    icon: "B",
    children: [
      {
        label: "MLB Preseason",
        to: "/user/coming-soon?feature=mlb-preseason",
        icon: "-",
        warn: true,
      },
      {
        label: "NCAA Baseball",
        to: "/user/coming-soon?feature=ncaa-baseball",
        icon: "-",
        warn: true,
      },
      {
        label: "MLB",
        to: "/user/coming-soon?feature=mlb",
        icon: "-",
        warn: true,
      },
    ],
  },
  {
    key: "ice-hockey",
    label: "Ice Hockey",
    icon: "I",
    children: [
      {
        label: "SHL",
        to: "/user/coming-soon?feature=shl",
        icon: "-",
        warn: true,
      },
      {
        label: "NHL",
        to: "/user/coming-soon?feature=nhl",
        icon: "-",
        warn: true,
      },
      {
        label: "AHL",
        to: "/user/coming-soon?feature=ahl",
        icon: "-",
        warn: true,
      },
      {
        label: "Liiga",
        to: "/user/coming-soon?feature=liiga",
        icon: "-",
        warn: true,
      },
      {
        label: "Mestis",
        to: "/user/coming-soon?feature=mestis",
        icon: "-",
        warn: true,
      },
      {
        label: "HockeyAllsvenskan",
        to: "/user/coming-soon?feature=hockey-allsvenskan",
        icon: "-",
        warn: true,
      },
    ],
  },
  {
    key: "cricket",
    label: "Cricket",
    icon: "C",
    children: [
      {
        label: "International Twenty20",
        to: "/user/coming-soon?feature=international-twenty20",
        icon: "-",
        warn: true,
      },
      {
        label: "T20 World Cup",
        to: "/user/coming-soon?feature=t20-world-cup",
        icon: "-",
        warn: true,
      },
      {
        label: "One Day Internationals",
        to: "/user/coming-soon?feature=one-day-internationals",
        icon: "-",
        warn: true,
      },
    ],
  },
  {
    key: "mma",
    label: "MMA",
    icon: "M",
    children: [
      {
        label: "MMA",
        to: "/user/coming-soon?feature=mma",
        icon: "-",
        warn: true,
      },
    ],
  },
];

const quickLinks: Item[] = [
  {
    label: "Favorites",
    to: "/user/coming-soon?feature=favorites",
    icon: "*",
    warn: true,
  },
  { label: "My Bets", to: "/user/bets", icon: "B" },
  { label: "Analytics", to: "/user/payments/history", icon: "A" },
  { label: "How It Works", to: "/user/how-it-works", icon: "?" },
  { label: "FAQs", to: "/user/faqs", icon: "!" },
  { label: "Responsible Gambling", to: "/user/register", icon: "R" },
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
  const [openSports, setOpenSports] = useState<Record<string, boolean>>({
    football: true,
    basketball: true,
  });
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
          <div className="bc-side-section">
            <p className="bc-side-heading">Live Sports</p>
            <div className="overflow-hidden rounded-md border border-[#1a2332]">
              {liveSportsOrder.map((name) => {
                return (
                  <Link
                    key={name}
                    to="/user/live"
                    className={[
                      "flex items-center gap-2 border-b border-[#1a2332] px-4 py-[7px] text-[12px] text-[#94a3b8] transition-colors",
                      "hover:bg-[#1e293b] hover:text-white",
                    ].join(" ")}
                    onClick={closeIfMobile}
                  >
                    <span className="w-[18px] text-center text-[10px] font-semibold text-[#64748b]">
                      {sportIcon(name)}
                    </span>
                    <span className="flex-1">{name}</span>
                    <span
                      className={[
                        "text-[10px] font-medium text-[#64748b]",
                      ].join(" ")}
                    >
                      {liveCounts[name] ?? 0}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="bc-side-section">
            {sectionOne.map((item) => (
              <ItemLink key={item.label} item={item} onClick={closeIfMobile} />
            ))}
          </div>

          {accountSection.length > 0 ? (
            <div className="bc-side-section">
              <p className="bc-side-heading">My Account</p>
              {accountSection.map((item) => (
                <ItemLink
                  key={item.label}
                  item={item}
                  onClick={closeIfMobile}
                />
              ))}
            </div>
          ) : null}

          <div className="bc-side-section">
            <p className="bc-side-heading">Top Leagues</p>
            {topLeagues.map((item) => (
              <ItemLink key={item.label} item={item} onClick={closeIfMobile} />
            ))}
          </div>

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
                      setOpenSports((prev) => ({ ...prev, [group.key]: !open }))
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
                  <div className={`bc-side-children ${open ? "is-open" : ""}`}>
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

          <div className="bc-side-section">
            <p className="bc-side-heading">Quick Access</p>
            {quickLinks.map((item) => (
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
              <span className="bc-side-icon" aria-hidden="true">
                x
              </span>
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
