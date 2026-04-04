import { Bell, Search } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function Topbar() {
  const { admin } = useAdminAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-[#2a3f55] bg-[#1a2634]/95 px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-3 text-[#8fa3b1]" />
          <input
            placeholder="Search events, users, bets..."
            className="w-full rounded-lg border border-[#2a3f55] bg-[#0f1923] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#f5a623]"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            LIVE
          </div>
          <button className="rounded-full border border-[#2a3f55] p-2 text-[#8fa3b1] hover:text-white">
            <Bell size={16} />
          </button>
          <div className="h-9 w-9 rounded-full bg-[#f5a623] text-center text-sm font-bold leading-9 text-[#0f1923]">
            {admin?.username?.slice(0, 1).toUpperCase() || "A"}
          </div>
        </div>
      </div>
    </header>
  );
}
