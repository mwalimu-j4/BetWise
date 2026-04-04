import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { getOdds, overrideOdd, updateOddVisibility } from "@/api/odds";

export default function OddsModule() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { eventId?: string };
  const [eventId, setEventId] = useState(search.eventId ?? "");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);

  async function loadData(targetEventId: string) {
    if (!targetEventId) return;
    try {
      setLoading(true);
      const data = await getOdds(targetEventId);
      setGroups(data.data ?? []);
    } catch {
      toast.error("Failed to load odds");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (search.eventId) {
      setEventId(search.eventId);
      void loadData(search.eventId);
    }
  }, [search.eventId]);

  const rows = useMemo(() => {
    return groups.flatMap((group) => {
      const h2h = group.markets?.h2h ?? [];
      return h2h.map((item: any) => ({ ...item, bookmaker_id: group.bookmaker_id, bookmaker_name: group.bookmaker_name }));
    });
  }, [groups]);

  async function toggleVisibility(row: any) {
    if (!eventId) return;
    try {
      await updateOddVisibility(eventId, {
        bookmaker_id: row.bookmaker_id,
        market_type: row.market_type,
        side: row.side,
        is_visible: !row.is_visible,
      });
      toast.success("Visibility updated");
      await loadData(eventId);
    } catch {
      toast.error("Failed to update visibility");
    }
  }

  async function overrideValue(row: any) {
    if (!eventId) return;
    const entered = window.prompt("Enter custom odds", String(row.display_odds ?? row.raw_odds));
    if (!entered) return;
    const value = Number(entered);
    if (!Number.isFinite(value)) {
      toast.error("Invalid odds");
      return;
    }

    try {
      await overrideOdd(eventId, {
        bookmaker_id: row.bookmaker_id,
        market_type: row.market_type,
        side: row.side,
        custom_odds: value,
      });
      toast.success("Odds overridden");
      await loadData(eventId);
    } catch {
      toast.error("Failed to override odds");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Odds Management</h1>

      <div className="flex gap-2">
        <input
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder="Enter event ID"
          className="w-full max-w-md rounded-lg border border-[#2a3f55] bg-[#1a2634] px-3 py-2 text-white"
        />
        <button
          className="rounded bg-[#f5a623] px-3 py-2 font-semibold text-[#0f1923]"
          onClick={() => {
            void navigate({ to: "/admin/odds", search: { eventId } as any });
            void loadData(eventId);
          }}
        >
          Load
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#2a3f55] bg-[#1e2d3d]">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1a2634] text-left text-[#8fa3b1]">
            <tr>
              <th className="px-4 py-3">Bookmaker</th>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Raw</th>
              <th className="px-4 py-3">Display</th>
              <th className="px-4 py-3">Visible</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-[#8fa3b1]" colSpan={7}>Loading odds...</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.bookmaker_id}-${row.market_type}-${row.side}-${index}`} className="border-t border-[#2a3f55] text-white">
                  <td className="px-4 py-3">{row.bookmaker_name}</td>
                  <td className="px-4 py-3">{row.market_type}</td>
                  <td className="px-4 py-3">{row.side}</td>
                  <td className="px-4 py-3">{Number(row.raw_odds).toFixed(3)}</td>
                  <td className="px-4 py-3">{Number(row.display_odds).toFixed(3)}</td>
                  <td className="px-4 py-3">{row.is_visible ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="rounded border border-[#2a3f55] px-2 py-1 text-xs" onClick={() => void toggleVisibility(row)}>
                        Toggle
                      </button>
                      <button className="rounded border border-[#f5a623] px-2 py-1 text-xs text-[#f5a623]" onClick={() => void overrideValue(row)}>
                        Override
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
