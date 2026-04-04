import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getBets, settleBet } from "@/api/bets";

export default function BetsModule() {
  const [loading, setLoading] = useState(true);
  const [bets, setBets] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [settleBetId, setSettleBetId] = useState<number | null>(null);
  const [result, setResult] = useState<"home_win" | "draw" | "away_win">("home_win");

  async function loadData() {
    try {
      setLoading(true);
      const data = await getBets({ page, limit, status, search });
      setBets(data.data ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      toast.error("Failed to fetch bets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [page, limit, status, search]);

  async function submitSettle() {
    if (!settleBetId) return;
    try {
      await settleBet(settleBetId, result);
      toast.success("Bet settled");
      setSettleBetId(null);
      await loadData();
    } catch {
      toast.error("Failed to settle bet");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Bets Management</h1>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search bets"
          className="rounded-lg border border-[#2a3f55] bg-[#1a2634] px-3 py-2 text-white"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded-lg border border-[#2a3f55] bg-[#1a2634] px-3 py-2 text-white"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#2a3f55] bg-[#1e2d3d]">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1a2634] text-left text-[#8fa3b1]">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Selection</th>
              <th className="px-4 py-3">Stake</th>
              <th className="px-4 py-3">Odds</th>
              <th className="px-4 py-3">Payout</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-[#8fa3b1]" colSpan={11}>
                  Loading bets...
                </td>
              </tr>
            ) : (
              bets.map((bet) => (
                <tr key={bet.id} className="border-t border-[#2a3f55] text-white">
                  <td className="px-4 py-3">{bet.id}</td>
                  <td className="px-4 py-3">{bet.username}</td>
                  <td className="px-4 py-3">{bet.match}</td>
                  <td className="px-4 py-3">{bet.market_type}</td>
                  <td className="px-4 py-3">{bet.side}</td>
                  <td className="px-4 py-3">{Number(bet.stake).toFixed(2)}</td>
                  <td className="px-4 py-3">{Number(bet.display_odds).toFixed(2)}</td>
                  <td className="px-4 py-3">{Number(bet.potential_payout).toFixed(2)}</td>
                  <td className="px-4 py-3">{bet.status}</td>
                  <td className="px-4 py-3">{new Date(bet.placed_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {bet.status === "pending" ? (
                      <button
                        className="rounded bg-[#f5a623] px-3 py-1 text-xs font-semibold text-[#0f1923]"
                        onClick={() => setSettleBetId(Number(bet.id))}
                      >
                        Settle
                      </button>
                    ) : (
                      <span className="text-[#8fa3b1]">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-[#8fa3b1]">
        <p>Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border border-[#2a3f55] px-3 py-1 disabled:opacity-40">Prev</button>
          <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border border-[#2a3f55] px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>

      {settleBetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-[#2a3f55] bg-[#1e2d3d] p-6">
            <h2 className="text-lg font-semibold text-white">Settle Bet #{settleBetId}</h2>
            <div className="mt-4 space-y-2 text-sm text-[#8fa3b1]">
              <label className="flex items-center gap-2">
                <input type="radio" checked={result === "home_win"} onChange={() => setResult("home_win")} /> Home Win
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={result === "draw"} onChange={() => setResult("draw")} /> Draw
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={result === "away_win"} onChange={() => setResult("away_win")} /> Away Win
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded border border-[#2a3f55] px-3 py-2 text-white" onClick={() => setSettleBetId(null)}>Cancel</button>
              <button className="rounded bg-[#f5a623] px-3 py-2 font-semibold text-[#0f1923]" onClick={() => void submitSettle()}>Settle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
