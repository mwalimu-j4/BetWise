import { LayoutDashboard, Settings, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";

export default function AdminSidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white p-6 min-h-screen border-r border-slate-700">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-cyan-400">BetWise Admin</h1>
      </div>

      <nav className="space-y-2">
        <Link
          to="/admin"
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition"
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>

        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition text-left">
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-900 transition text-left">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
