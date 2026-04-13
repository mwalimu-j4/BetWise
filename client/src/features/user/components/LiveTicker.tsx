import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/axiosConfig";
import type { ApiEvent } from "../hooks/useEvents";
import { Radio } from "lucide-react";

type LiveEventsResponse = {
  events: ApiEvent[];
};

function getSportIcon(sportKey: string | null) {
  const value = sportKey?.toLowerCase() ?? "";

  if (value.includes("basketball") || value.includes("nba")) {
    return "🏀";
  }

  if (value.includes("football") || value.includes("nfl")) {
    return "🏈";
  }

  return "⚽";
}

export default function LiveTicker() {
  const [events, setEvents] = useState<ApiEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchLiveEvents = async () => {
      try {
        const { data } = await api.get<LiveEventsResponse>("/user/events/live");
        if (!cancelled) {
          setEvents(data.events);
        }
      } catch {
        if (!cancelled) {
          setEvents([]);
        }
      }
    };

    void fetchLiveEvents();

    const interval = window.setInterval(() => {
      void fetchLiveEvents();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const tickerItems = useMemo(() => {
    return events.map((event) => {
      const homeOdds = event.markets.h2h?.home ?? 0;
      const awayOdds = event.markets.h2h?.away ?? 0;
      const homeFavored = homeOdds > 0 && (awayOdds === 0 || homeOdds <= awayOdds);
      const odds = homeFavored ? homeOdds : awayOdds;

      return {
        id: event.eventId,
        icon: getSportIcon(event.sportKey),
        teams: `${event.homeTeam} vs ${event.awayTeam}`,
        arrow: homeFavored ? "▲" : "▼",
        isUp: homeFavored,
        odds,
      };
    });
  }, [events]);

  if (tickerItems.length === 0) {
    return null;
  }

  const loopItems = [...tickerItems, ...tickerItems];

  return (
    <div className="relative h-9 overflow-hidden rounded-lg border border-[#1e3350]/40 bg-[#0a1320] text-[12px]">
      {/* Live badge */}
      <div className="absolute left-0 top-0 z-10 flex h-full items-center gap-1 border-r border-[#1e3350]/30 bg-gradient-to-r from-[#0a1320] via-[#0a1320] to-transparent pl-2.5 pr-4">
        <Radio size={10} className="text-[#ff3b30] animate-pulse" />
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#ff3b30]">
          Live
        </span>
      </div>

      {/* Ticker content */}
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="flex h-full min-w-max items-center gap-6 pl-[72px] pr-4"
        style={{ animation: "ticker-scroll 40s linear infinite" }}
      >
        {loopItems.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <span className="text-[11px]">{item.icon}</span>
            <span className="text-[11px] font-medium text-[#c0d1e5]">{item.teams}</span>
            <span className={`text-[10px] ${item.isUp ? "text-[#22c55e]" : "text-[#ff3b30]"}`}>
              {item.arrow}
            </span>
            <span className="text-[11px] font-bold text-[#ffd500]">
              {item.odds.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0a1320] to-transparent" />
    </div>
  );
}
