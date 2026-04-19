import { useAuth } from "@/context/AuthContext";
import { Link, useLocation } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  FileText,
  Flame,
  HelpCircle,
  History,
  Home,
  LogOut,
  MessageCircle,
  TrendingUp,
  Trophy,
  User,
  Wallet
} from "lucide-react";
import { useMemo, useState } from "react";
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


const navigationLinks: Item[] = [
  { label: "Homepage", to: "/user", icon: <Home size={18} /> },
  {
    label: "Custom Events",
    to: "/user/custom-events",
    icon: <Trophy size={18} />,
  },

  {
    label: "Live Betting",
    to: "/user/live",
    icon: <Flame size={18} />,
    liveBadge: "LIVE",
  },
];

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
  const [openSports, setOpenSports] = useState<Record<string, boolean>>({
    football: true,
    basketball: true,
  });

  const accountSection = useMemo(() => {
    if (!isAuthenticated) return [];
    return myAccount;
  }, [isAuthenticated]);


  function closeIfMobile() {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      onClose();
    }
  }

  return (
    <>
      <aside className={`bc-sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="bc-side-scroll">
      
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
