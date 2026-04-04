import {
  Link,
  Outlet,
  createRoute,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { api } from "@/api/axiosConfig";
import { userRoute } from "./route";

type UserBet = {
  id: string;
  marketType: string;
  side: string;
  stake: number;
  displayOdds: number;
  potentialPayout: number;
  status: "PENDING" | "WON" | "LOST" | "VOID";
  placedAt: string;
  event: {
    homeTeam: string;
    awayTeam: string;
    leagueName: string | null;
    commenceTime: string;
    status: "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
    sportKey: string | null;
  };
};

function formatMoney(value: number) {
  return `KES ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function MyBetsPage() {
  const [bets, setBets] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchBets = async () => {
      try {
        const { data } = await api.get<{ bets: UserBet[] }>("/user/bets/my");
        if (!cancelled) {
          setBets(data.bets);
          setError(null);
        }
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        if (isAxiosError(fetchError) && fetchError.response?.status === 401) {
          window.location.assign(
            `/login?redirect=${encodeURIComponent("/user/bets")}`,
          );
          return;
        }

        setError("Unable to load your bets right now.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchBets();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-4 rounded-2xl border border-[#2a3f55] bg-[#1a2634] p-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">My Bets</h1>
          <p className="mt-1 text-sm text-[#8fa3b1]">
            Your latest 50 bets across live and upcoming matches.
          </p>
        </div>
        <Link to="/user" className="text-sm font-semibold text-[#f5a623]">
          Back to betting
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`bet-skeleton-${index}`}
              className="animate-pulse rounded-xl border border-[#2a3f55] bg-[#111c27] p-4"
            >
              <div className="h-4 w-1/3 rounded bg-[#243548]" />
              <div className="mt-3 h-4 w-full rounded bg-[#243548]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-[#5a222a] bg-[#2a1515] p-4 text-sm text-red-200">
          {error}
        </div>
      ) : bets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#2a3f55] p-8 text-center">
          <p className="text-lg font-semibold text-white">No bets yet</p>
          <p className="mt-2 text-sm text-[#8fa3b1]">
            Your placed bets will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => (
            <article
              key={bet.id}
              className="rounded-xl border border-[#2a3f55] bg-[#111c27] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#8fa3b1]">
                    {bet.event.leagueName ?? "Featured Match"}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {bet.event.homeTeam} vs {bet.event.awayTeam}
                  </p>
                  <p className="mt-1 text-[12px] text-[#8fa3b1]">
                    {bet.marketType.toUpperCase()} • {bet.side}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-[#8fa3b1]">Status</p>
                  <p className="mt-1 text-sm font-semibold text-[#f5a623]">
                    {bet.status}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-[#1a2634] p-3">
                  <p className="text-[11px] text-[#8fa3b1]">Stake</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatMoney(bet.stake)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#1a2634] p-3">
                  <p className="text-[11px] text-[#8fa3b1]">Odds</p>
                  <p className="mt-1 text-sm font-semibold text-[#f5a623]">
                    {bet.displayOdds.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#1a2634] p-3">
                  <p className="text-[11px] text-[#8fa3b1]">Potential Payout</p>
                  <p className="mt-1 text-sm font-semibold text-[#00c853]">
                    {formatMoney(bet.potentialPayout)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const userIndexLayoutRoute = createRoute({
  getParentRoute: () => userRoute,
  id: "user-index-layout",
  component: Outlet,
});

const userHomePageRoute = createRoute({
  getParentRoute: () => userIndexLayoutRoute,
  path: "/",
  component: lazyRouteComponent(() => import("@/features/user/home")),
});

const userBetsPageRoute = createRoute({
  getParentRoute: () => userIndexLayoutRoute,
  path: "/bets",
  component: MyBetsPage,
});

export const userIndexRoute = userIndexLayoutRoute.addChildren([
  userHomePageRoute,
  userBetsPageRoute,
]);
