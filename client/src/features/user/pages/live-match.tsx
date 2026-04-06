import { useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/api/axiosConfig";

type MatchMarket = {
  id: string;
  type: string;
  name: string;
  status: "open" | "suspended";
  selections: Array<{
    id: string;
    label: string;
    name: string;
    odds: number | null;
    status: "open" | "suspended";
  }>;
};

type MatchDetail = {
  id: string;
  home_team: { name: string; score: number };
  away_team: { name: string; score: number };
  league: { country: string; name: string; flag_emoji: string };
  markets: MatchMarket[];
};

export default function LiveMatchPage() {
  const { matchId } = useParams({ strict: false }) as { matchId?: string };
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadMatch = async () => {
      if (!matchId) {
        setError("Invalid match id.");
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get<{ match: MatchDetail }>(
          `/live/${matchId}`,
        );
        if (mounted) {
          setMatch(data.match);
        }
      } catch {
        if (mounted) {
          setError("Could not load this live match.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadMatch();

    return () => {
      mounted = false;
    };
  }, [matchId]);

  return (
    <div className="min-h-screen bg-[#0d1117] px-3 py-4 text-white sm:px-4 lg:px-6">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[#243244] bg-[#111827] px-3 py-2 text-sm font-semibold"
        >
          <ArrowLeft size={14} /> Back to live list
        </button>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-[#243244] bg-[#111827]">
            <Loader2 className="animate-spin" size={18} />
            <span className="ml-2">Loading match markets...</span>
          </div>
        ) : error || !match ? (
          <div className="rounded-xl border border-[#5f2932] bg-[#2a1519] p-4 text-sm text-red-200">
            {error ?? "No match found."}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#243244] bg-[#111827] p-4">
              <p className="text-xs uppercase tracking-wide text-[#93a4b9]">
                {match.league.flag_emoji} {match.league.country} •{" "}
                {match.league.name}
              </p>
              <h1 className="mt-2 text-xl font-extrabold">
                {match.home_team.name} {match.home_team.score} -{" "}
                {match.away_team.score} {match.away_team.name}
              </h1>
            </div>

            <div className="space-y-3 rounded-xl border border-[#243244] bg-[#111827] p-4">
              {match.markets.map((market) => (
                <section
                  key={market.id}
                  className="rounded-lg border border-[#243244] bg-[#0d1117] p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[#F5C518]">
                      {market.name}
                    </h2>
                    <span className="text-[11px] uppercase tracking-wide text-[#93a4b9]">
                      {market.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {market.selections.map((selection) => (
                      <div
                        key={selection.id}
                        className="rounded-md border border-[#243244] bg-[#111827] p-2 text-center"
                      >
                        <p className="text-[11px] text-[#93a4b9]">
                          {selection.label}
                        </p>
                        <p className="text-sm font-bold text-white">
                          {selection.odds?.toFixed(2) ?? "SUSP"}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
