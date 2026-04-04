import { BarChart3, CalendarRange, Users, WalletCards } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/admin/events", label: "Events", icon: CalendarRange },
  { to: "/admin/bets", label: "Bets", icon: WalletCards },
  { to: "/admin/users", label: "Users", icon: Users },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-60 border-r border-[#2a3f55] bg-[#0f1923] p-4 lg:block">
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          BettCenic
        </h1>
        <p className="text-xs text-[#8fa3b1]">Admin Panel</p>
      </div>

      <nav className="space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-r-lg border-l-2 px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-[#f5a623] bg-[#1a2634] text-white"
                  : "border-transparent text-[#8fa3b1] hover:bg-[#1a2634] hover:text-white"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
