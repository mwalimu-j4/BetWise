import { createFileRoute } from "@tanstack/react-router";

// 1. REGISTER THE NEW ROUTE: TanStack Router automatically creates the /dashboard page.
export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      {/* Header Section using our extracted DEEP BLUE */}
      <header className="mb-8 rounded-xl bg-[#003366] p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold tracking-tight">Welcome Back!</h1>
        <p className="mt-1 text-slate-200">
          Here is your betting overview for today.
        </p>
      </header>

      {/* Grid Layout for Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* CARD 1: Balance (Using the YELLOW accent) */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-600">
              Available Balance
            </h3>
            {/* We will swap this basic span for a Shadcn Badge component later */}
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-medium">KES</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">12,450.00</p>
          <div className="mt-6 flex gap-3">
            {/* Using the vibrant YELLOW extracted from the client reference image */}
            <button className="w-full rounded-md bg-[#FBBF24] py-2.5 font-semibold text-[#003366] hover:bg-yellow-500 transition-colors">
              Quick Deposit
            </button>
            <button className="w-full rounded-md border border-zinc-300 py-2.5 font-medium text-slate-700 hover:bg-zinc-100 transition-colors">
              Withdraw
            </button>
          </div>
        </div>

        {/* CARD 2: Active Bets */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-600">My Active Bets</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">3 Open Bets</p>
          <p className="mt-1 text-sm text-slate-500">Current potential win: KES 8,500</p>
          <div className="mt-6">
             {/* Text link using the bright secondary blue */}
            <a href="#" className="text-sm font-medium text-[#0099FF] hover:underline">
              View All Bets →
            </a>
          </div>
        </div>
      </div>

      {/* SKELETON: Upcoming Matches Section */}
      <section className="mt-10">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">
          Top Live Odds
        </h2>
        
        {/* Skeleton Match Row Placeholder */}
        <div className="space-y-4">
          {[1, 2, 3].map((matchId) => (
            <div key={matchId} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm flex items-center justify-between gap-6">
              <div className="flex-1">
                <p className="font-semibold text-slate-800">Team Home <span className="font-normal text-slate-400">vs</span> Team Away</p>
                <p className="text-sm text-slate-500">UEFA Champions League • Today, 22:00</p>
              </div>
              <div className="flex gap-2">
                {/* ODDS Placeholders: We can put Shadcn buttons here later */}
                <div className="w-16 h-12 bg-slate-100 rounded flex items-center justify-center border border-zinc-200 text-sm font-mono text-slate-600">1.85</div>
                <div className="w-16 h-12 bg-slate-100 rounded flex items-center justify-center border border-zinc-200 text-sm font-mono text-slate-600">3.40</div>
                <div className="w-16 h-12 bg-slate-100 rounded flex items-center justify-center border border-zinc-200 text-sm font-mono text-slate-600">2.10</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}