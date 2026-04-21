import { Link, useLocation } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CreditCard,
  LogOut,
  Send,
  User,
  Ticket,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

type AccountDropdownProps = {
  open: boolean;
  onClose: () => void;
};

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  to: string;
  warn?: boolean;
};

const menuGroups: MenuItem[][] = [
  [
    {
      label: "Live Bets",
      icon: <Zap size={18} />,
      to: "/user/live",
    },
    {
      label: "My Bets",
      icon: <Ticket size={18} />,
      to: "/user/bets",
    },
  ],
  [
    {
      label: "Deposit",
      icon: <CreditCard size={18} />,
      to: "/user/payments/deposit",
    },
    {
      label: "Withdrawal",
      icon: <Send size={18} />,
      to: "/user/payments/withdrawal",
    },
  ],
  [
    {
      label: "My Profile",
      icon: <User size={18} />,
      to: "/user/profile",
    },
    {
      label: "My Results",
      icon: <TrendingUp size={18} />,
      to: "/user/payments/history",
    },
    {
      label: "My Wallet",
      icon: <Wallet size={18} />,
      to: "/user/payments",
      warn: true,
    },
  ],
];

export default function AccountDropdown({
  open,
  onClose,
}: AccountDropdownProps) {
  const location = useLocation();
  const { user, logout, openAuthModal } = useAuth();

  const initials = useMemo(() => {
    const source = user?.email?.trim() || user?.phone?.trim() || "User";
    return source
      .split(" ")
      .slice(0, 2)
      .map((part: string) => part.charAt(0).toUpperCase())
      .join("");
  }, [user?.email, user?.phone]);

  if (!open) return null;

  return (
    <div className="bc-account-dropdown">
      <div className="bc-account-head">
        <div className="bc-account-avatar" aria-hidden="true">
          {initials}
        </div>
        <div className="bc-account-head-meta">
          <p className="bc-account-name">{user?.phone || "BetixPro User"}</p>
          <p className="bc-account-email">
            {user?.email || "guest@BetixPro.com"}
          </p>
        </div>
      </div>

      {menuGroups.map((group, groupIndex) => (
        <div className="bc-account-group" key={`group-${groupIndex}`}>
          {group.map((item) =>
            (() => {
              const itemPath = item.to.split("?")[0];
              const isActive = location.pathname === itemPath;

              return (
                <Link
                  key={item.label}
                  to={item.to as never}
                  className={`bc-account-item ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    if (item.warn) {
                      console.warn(`Route ${item.to} not yet implemented`);
                    }
                    onClose();
                  }}
                >
                  <span className="bc-account-item-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })(),
          )}
        </div>
      ))}

      <div className="bc-account-group">
        <button
          type="button"
          className="bc-account-item is-logout"
          onClick={async () => {
            await logout();
            toast.success("Logged out successfully");
            onClose();
            openAuthModal("login");
          }}
        >
          <span className="bc-account-item-icon" aria-hidden="true">
            <LogOut size={18} />
          </span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
