import { createFileRoute } from "@tanstack/react-router";

// 1. REGISTER THE NEW ROUTE: TanStack Router automatically creates the /dashboard page.
export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#1a3a6b]">
      {/* Mobile-first padding */}
      <div className="px-4 py-6 md:px-8 md:py-10 lg:px-10">
        {/* Header Section */}
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
            Welcome Back!
          </h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-[#a8c4e0]">
            Here's your betting activity and performance summary
          </p>
        </header>

        {/* Main Stats Grid - Responsive */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8 md:mb-10">
          {/* Balance Card */}
          <div className="rounded-lg border border-[rgba(245,197,24,0.2)] bg-[#1e4080] p-4 md:p-6 backdrop-blur-sm hover:border-[rgba(245,197,24,0.4)] transition-colors">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#a8c4e0]">
                Available Balance
              </span>
              <span className="inline-flex items-center rounded-full bg-[#f5c518]/10 px-2 md:px-3 py-1 text-xs font-semibold text-[#f5c518]">
                KES
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6">
              12,450.00
            </p>
            <div className="flex gap-2 md:gap-3">
              <button className="flex-1 rounded-lg bg-[#f5c518] py-2 md:py-2.5 px-2 md:px-3 font-semibold text-[#0d2137] hover:bg-[#e6b800] transition-colors text-sm md:text-base">
                Deposit
              </button>
              <button className="flex-1 rounded-lg border border-[#a8c4e0] py-2 md:py-2.5 px-2 md:px-3 font-medium text-[#a8c4e0] hover:bg-[rgba(168,196,224,0.1)] transition-colors text-sm md:text-base">
                Withdraw
              </button>
            </div>
          </div>

          {/* Active Bets Card */}
          <div className="rounded-lg border border-[rgba(245,197,24,0.2)] bg-[#1e4080] p-4 md:p-6 backdrop-blur-sm hover:border-[rgba(245,197,24,0.4)] transition-colors">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a8c4e0] mb-3 md:mb-4">
              Active Bets
            </h3>
            <p className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">
              3
            </p>
            <p className="text-xs md:text-sm text-[#6b8cae] mb-4 md:mb-6">
              Potential win: KES 8,500
            </p>
            <a
              href="/my-bets"
              className="inline-flex items-center text-xs md:text-sm font-semibold text-[#f5c518] hover:text-[#e6b800] transition-colors group"
            >
              View All Bets
              <span className="ml-1 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </a>
          </div>

          {/* Stats Card */}
          <div className="rounded-lg border border-[rgba(245,197,24,0.2)] bg-[#1e4080] p-4 md:p-6 backdrop-blur-sm hover:border-[rgba(245,197,24,0.4)] transition-colors">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a8c4e0] mb-3 md:mb-4">
              Today's Wins
            </h3>
            <p className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">
              2
            </p>
            <p className="text-xs md:text-sm text-[#6b8cae] mb-4">
              Win rate: 66.7%
            </p>
            <div className="h-1 w-full rounded-full bg-[rgba(168,196,224,0.2)] overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-[#f5c518]" />
            </div>
          </div>
        </div>

        {/* Featured Section */}
        <section>
          <div className="mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Featured Matches
            </h2>
            <p className="text-xs md:text-sm text-[#a8c4e0] mt-1">
              Top odds available right now
            </p>
          </div>

          {/* Match Cards - Responsive */}
          <div className="space-y-2 md:space-y-3">
            {[1, 2, 3].map((matchId) => (
              <div
                key={matchId}
                className="rounded-lg border border-[rgba(245,197,24,0.15)] bg-[#1e4080] p-3 md:p-5 hover:border-[rgba(245,197,24,0.3)] transition-colors group flex flex-col md:flex-row md:items-center md:justify-between md:gap-6"
              >
                <div className="flex-1 min-w-0 mb-3 md:mb-0">
                  <p className="text-sm md:text-base font-semibold text-white group-hover:text-[#f5c518] transition-colors truncate">
                    Manchester United{" "}
                    <span className="font-normal text-[#6b8cae]">vs</span>{" "}
                    Liverpool
                  </p>
                  <p className="text-xs text-[#6b8cae] mt-1">
                    Premier League • Today, 20:00
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 w-full md:w-auto">
                  <button className="flex-1 md:flex-none w-auto md:w-16 h-10 md:h-12 rounded-lg bg-[#2a5298] border border-[#a8c4e0] text-white font-mono text-xs md:text-sm font-semibold hover:bg-[#3a62a8] hover:border-[#f5c518] transition-colors">
                    1.85
                  </button>
                  <button className="flex-1 md:flex-none w-auto md:w-16 h-10 md:h-12 rounded-lg bg-[#2a5298] border border-[#a8c4e0] text-white font-mono text-xs md:text-sm font-semibold hover:bg-[#3a62a8] hover:border-[#f5c518] transition-colors">
                    3.40
                  </button>
                  <button className="flex-1 md:flex-none w-auto md:w-16 h-10 md:h-12 rounded-lg bg-[#2a5298] border border-[#a8c4e0] text-white font-mono text-xs md:text-sm font-semibold hover:bg-[#3a62a8] hover:border-[#f5c518] transition-colors">
                    2.10
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
