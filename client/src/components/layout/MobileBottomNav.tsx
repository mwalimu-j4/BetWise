import { Link } from "@tanstack/react-router";
import { Home, PlayCircle, Receipt, BarChart3, User } from "lucide-react";

export default function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between bg-[#0f172a] border-t border-admin-border px-6 pb-2 pt-2 md:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
      {/* Home */}
      <Link
        to="/"
        className="flex flex-col items-center gap-1 text-admin-text-muted hover:text-white [&.active]:text-green-400"
      >
        <Home size={20} />
        <span className="text-[10px] font-medium">Home</span>
      </Link>

      {/* Live */}
      {/* Live */}
      <a
        href="#"
        className="flex flex-col items-center gap-1 text-admin-text-muted hover:text-white [&.active]:text-green-400"
      >
        <PlayCircle size={20} />
        <span className="text-[10px] font-medium">Live</span>
      </a>

      {/* Center FAB (Bet Slip) */}
      <div className="relative -top-5">
        <button className="flex h-14 w-14 items-center justify-center rounded-full bg-admin-accent text-black shadow-lg shadow-admin-accent/20 ring-4 ring-[#0f172a] transition-transform active:scale-95">
          <Receipt size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* Reports */}
      <Link
        to="/user/reports"
        className="flex flex-col items-center gap-1 text-admin-text-muted hover:text-white [&.active]:text-green-400"
      >
        <BarChart3 size={20} />
        <span className="text-[10px] font-medium">Reports</span>
      </Link>

      {/* Profile */}
      <Link
        to="/user"
        className="flex flex-col items-center gap-1 text-admin-text-muted hover:text-white [&.active]:text-green-400"
      >
        <User size={20} />
        <span className="text-[10px] font-medium">Profile</span>
      </Link>
    </nav>
  );
}
