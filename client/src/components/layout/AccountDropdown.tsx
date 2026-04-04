import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";

type AccountDropdownProps = {
  open: boolean;
  onClose: () => void;
};

type MenuItem = {
  label: string;
  icon: string;
  to: string;
  warn?: boolean;
};

const menuGroups: MenuItem[][] = [
  [
    {
      label: "Dashboard",
      icon: "d",
      to: "/user/coming-soon?feature=dashboard",
      warn: true,
    },
    { label: "Deposit", icon: "+", to: "/user/payments/deposit" },
    { label: "Withdrawal", icon: "^", to: "/user/payments/withdrawal" },
  ],
  [
    {
      label: "My Profile",
      icon: "u",
      to: "/user/coming-soon?feature=profile",
      warn: true,
    },
    { label: "My Bets", icon: "t", to: "/user/payments" },
    { label: "My Results", icon: "r", to: "/user/payments/history" },
    { label: "My Wallet", icon: "w", to: "/user/payments", warn: true },
  ],
];

export default function AccountDropdown({
  open,
  onClose,
}: AccountDropdownProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const session = authClient.useSession();

  const user = session.data?.user;

  const initials = useMemo(() => {
    const source = user?.name?.trim() || user?.email?.trim() || "User";
    return source
      .split(" ")
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [user?.email, user?.name]);

  if (!open) return null;

  return (
    <div className="bc-account-dropdown">
      <div className="bc-account-head">
        <div className="bc-account-avatar" aria-hidden="true">
          {user?.image ? (
            <img
              src={user.image}
              alt="User"
              className="bc-account-avatar-img"
            />
          ) : (
            initials
          )}
        </div>
        <div className="bc-account-head-meta">
          <p className="bc-account-name">{user?.name || "BettCenic User"}</p>
          <p className="bc-account-email">
            {user?.email || "guest@bettcenic.com"}
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
            await authClient.signOut();
            onClose();
            navigate({ to: "/user/login" });
          }}
        >
          <span className="bc-account-item-icon" aria-hidden="true">
            x
          </span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
