import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { getEvents, toggleEvent, updateEventConfig } from "@/api/events";

export default function EventsModule() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [league, setLeague] = useState("");
  const [status, setStatus] = useState("");
  const [configEvent, setConfigEvent] = useState<any | null>(null);
  const [houseMargin, setHouseMargin] = useState(0);
  const [markets, setMarkets] = useState<string[]>(["h2h"]);

  const leagues = useMemo(() => {
    return Array.from(new Set(events.map((item) => item.league_name).filter(Boolean)));
  }, [events]);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getEvents({ page, limit, search, league, status });
      setEvents(data.data ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      toast.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [page, limit, search, league, status]);

  async function onToggle(eventId: string) {
    try {
      await toggleEvent(eventId);
      toast.success("Event status updated");
      await loadData();
    } catch {
      toast.error("Failed to toggle event");
    }
  }

  async function saveConfig() {
    if (!configEvent) return;
    try {
      await updateEventConfig(configEvent.event_id, {
        house_margin: houseMargin,
        markets_enabled: markets,
      });
      toast.success("Configuration saved");
      setConfigEvent(null);
      await loadData();
    } catch {
      toast.error("Failed to save config");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Events Management</h1>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search by match"
          className="rounded-lg border border-[#2a3f55] bg-[#1a2634] px-3 py-2 text-white"
        />
        <select
          value={league}
          onChange={(e) => {
            setPage(1);
            setLeague(e.target.value);
          }}
          className="rounded-lg border border-[#2a3f55] bg-[#1a2634] px-3 py-2 text-white"
        >
          <option value="">All leagues</option>
          {leagues.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded-lg border border-[#2a3f55] bg-[#1a2634] px-3 py-2 text-white"
        >
          <option value="">All statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="finished">Finished</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="button"
          onClick={() => void loadData()}
          className="rounded-lg bg-[#f5a623] px-4 py-2 font-semibold text-[#0f1923]"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#2a3f55] bg-[#1e2d3d]">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1a2634] text-left text-[#8fa3b1]">
            <tr>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">League</th>
              <th className="px-4 py-3">Date/Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Margin</th>
              <th className="px-4 py-3">Markets</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-[#8fa3b1]" colSpan={8}>
                  Loading events...
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.event_id} className="border-t border-[#2a3f55] text-white hover:bg-[#1a2634]/60">
                  <td className="px-4 py-3">
                    <button
                      className="font-semibold hover:text-[#f5a623]"
                      onClick={() => void navigate({ to: "/admin/events/$eventId", params: { eventId: event.event_id } })}
                    >
                      {event.home_team} vs {event.away_team}
                    </button>
                  </td>
                  <td className="px-4 py-3">{event.league_name || "-"}</td>
                  <td className="px-4 py-3">{event.commence_time ? new Date(event.commence_time).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">{event.status}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void onToggle(event.event_id)}
                      className={`relative h-6 w-11 rounded-full ${event.is_active ? "bg-[#00c853]" : "bg-slate-600"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${event.is_active ? "left-5" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">{Number(event.house_margin).toFixed(2)}%</td>
                  <td className="px-4 py-3">{(event.markets_enabled ?? []).join(", ")}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setConfigEvent(event);
                        setHouseMargin(Number(event.house_margin ?? 0));
                        setMarkets(event.markets_enabled ?? ["h2h"]);
                      }}
                      className="rounded-md border border-[#2a3f55] px-3 py-1 text-xs text-[#f5a623]"
                    >
                      Configure
                    </button>
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
          <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border border-[#2a3f55] px-3 py-1 disabled:opacity-40">
            Prev
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border border-[#2a3f55] px-3 py-1 disabled:opacity-40">
            Next
          </button>
        </div>
      </div>

      {configEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-xl border border-[#2a3f55] bg-[#1e2d3d] p-6">
            <h2 className="text-xl font-semibold text-white">Configure Fixture</h2>
            <p className="mb-4 text-sm text-[#8fa3b1]">
              {configEvent.home_team} vs {configEvent.away_team}
            </p>
            <label className="text-sm text-[#8fa3b1]">House Margin (%)</label>
            <input
              type="number"
              min={0}
              max={20}
              value={houseMargin}
              onChange={(e) => setHouseMargin(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-[#2a3f55] bg-[#0f1923] px-3 py-2 text-white"
            />
            <div className="mt-4 space-y-2 text-sm text-[#8fa3b1]">
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
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfigEvent(null)} className="rounded border border-[#2a3f55] px-3 py-2 text-white">
                Cancel
              </button>
              <button onClick={() => void saveConfig()} className="rounded bg-[#f5a623] px-3 py-2 font-semibold text-[#0f1923]">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
