import { useEffect, useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { getEventDetail, updateEventConfig } from "@/api/events";
import { getOdds, overrideOdd, updateOddVisibility } from "@/api/odds";

export default function EventDetailModule() {
  const { eventId } = useParams({ strict: false }) as { eventId: string };
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [oddsRows, setOddsRows] = useState<any[]>([]);
  const [houseMargin, setHouseMargin] = useState(0);
  const [markets, setMarkets] = useState<string[]>(["h2h"]);

  const adjustedPreview = useMemo(() => {
    return oddsRows.slice(0, 3).map((odd) => {
      const raw = Number(odd.raw_odds);
      const adjusted = raw / (1 + houseMargin / 100);
      return { side: odd.side, raw, adjusted: Number(adjusted.toFixed(3)) };
    });
  }, [houseMargin, oddsRows]);

  async function loadData() {
    if (!eventId) return;

    try {
      setLoading(true);
      const [eventData, oddsData] = await Promise.all([
        getEventDetail(eventId),
        getOdds(eventId),
      ]);

      const flattened = (oddsData.data ?? []).flatMap((group: any) => {
        const marketsMap = group.markets ?? {};
        return Object.keys(marketsMap).flatMap((marketType) =>
          (marketsMap[marketType] ?? []).map((item: any) => ({
            ...item,
            bookmaker_id: group.bookmaker_id,
            bookmaker_name: group.bookmaker_name,
          })),
        );
      });

      setEvent(eventData.event ?? null);
      setOddsRows(flattened);
      setHouseMargin(Number(eventData.event?.house_margin ?? 0));
      setMarkets(eventData.event?.markets_enabled ?? ["h2h"]);
    } catch {
      toast.error("Failed to load event details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [eventId]);

  async function onToggleVisibility(row: any) {
    try {
      await updateOddVisibility(eventId, {
        bookmaker_id: row.bookmaker_id,
        market_type: row.market_type,
        side: row.side,
        is_visible: !row.is_visible,
      });
      toast.success("Odd visibility updated");
      await loadData();
    } catch {
      toast.error("Failed to update visibility");
    }
  }

  async function onOverride(row: any) {
    const entered = window.prompt("Custom odds", String(row.display_odds));
    if (!entered) return;
    const custom = Number(entered);
    if (!Number.isFinite(custom)) {
      toast.error("Invalid custom odds");
      return;
    }

    try {
      await overrideOdd(eventId, {
        bookmaker_id: row.bookmaker_id,
        market_type: row.market_type,
        side: row.side,
        custom_odds: custom,
      });
      toast.success("Odds overridden");
      await loadData();
    } catch {
      toast.error("Failed to override odds");
    }
  }

  async function saveAll() {
    try {
      await updateEventConfig(eventId, {
        house_margin: houseMargin,
        markets_enabled: markets,
      });
      toast.success("Event configuration saved");
      await loadData();
    } catch {
      toast.error("Failed to save configuration");
    }
  }

  if (loading) {
    return <div className="p-6 text-[#8fa3b1]">Loading event...</div>;
  }

  if (!event) {
    return <div className="p-6 text-[#ff1744]">Event not found</div>;
  }

  const h2hRows = oddsRows.filter((row) => row.market_type === "h2h");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#2a3f55] bg-[#1e2d3d] p-4">
        <h1 className="text-2xl font-bold text-white">
          {event.home_team} vs {event.away_team}
        </h1>
        <p className="mt-1 text-sm text-[#8fa3b1]">
          {event.league_name || "Unknown league"} • {event.commence_time ? new Date(event.commence_time).toLocaleString() : "No date"} • {event.status}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-[#2a3f55] bg-[#1e2d3d] p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Bookmaker Odds</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-[#8fa3b1]">
                <tr>
                  <th className="px-2 py-2">Bookmaker</th>
                  <th className="px-2 py-2">Side</th>
                  <th className="px-2 py-2">Display</th>
                  <th className="px-2 py-2">Visible</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {h2hRows.map((row, index) => (
                  <tr key={`${row.bookmaker_id}-${row.side}-${index}`} className="border-t border-[#2a3f55] text-white">
                    <td className="px-2 py-2">{row.bookmaker_name}</td>
                    <td className="px-2 py-2">{row.side}</td>
                    <td className="px-2 py-2">{Number(row.display_odds).toFixed(3)}</td>
                    <td className="px-2 py-2">{row.is_visible ? "Yes" : "No"}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded border border-[#2a3f55] px-2 py-1 text-xs"
                          onClick={() => void onToggleVisibility(row)}
                        >
                          Toggle
                        </button>
                        <button
                          className="rounded border border-[#f5a623] px-2 py-1 text-xs text-[#f5a623]"
                          onClick={() => void onOverride(row)}
                        >
                          Override
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-[#2a3f55] bg-[#1e2d3d] p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Config Panel</h2>

          <label className="text-sm text-[#8fa3b1]">House Margin: {houseMargin.toFixed(2)}%</label>
          <input
            type="range"
            min={0}
            max={20}
            step={0.1}
            value={houseMargin}
            onChange={(e) => setHouseMargin(Number(e.target.value))}
            className="mt-2 w-full"
          />

          <div className="mt-4 space-y-2 text-sm text-[#8fa3b1]">
            <p className="font-semibold text-white">Markets Enabled</p>
            {["h2h", "spreads", "totals"].map((market) => (
              <label key={market} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={markets.includes(market)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMarkets((current) => Array.from(new Set([...current, market])));
                    } else {
                      setMarkets((current) => current.filter((item) => item !== market));
                    }
                  }}
                />
                {market}
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-[#2a3f55] bg-[#0f1923] p-3 text-sm">
            <p className="mb-2 font-semibold text-white">Live Adjusted Preview</p>
            {adjustedPreview.map((item) => (
              <p key={item.side} className="text-[#8fa3b1]">
                {item.side}: raw {item.raw.toFixed(3)} → adjusted {item.adjusted.toFixed(3)}
              </p>
            ))}
          </div>

          <button
            className="mt-5 rounded bg-[#f5a623] px-4 py-2 font-semibold text-[#0f1923]"
            onClick={() => void saveAll()}
          >
            Save all
          </button>
        </div>
      </div>
    </div>
  );
}
