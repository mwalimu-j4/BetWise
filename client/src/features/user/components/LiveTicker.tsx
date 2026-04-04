import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/axiosConfig";
import type { ApiEvent } from "../hooks/useEvents";

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
        odds,
      };
    });
  }, [events]);

  if (tickerItems.length === 0) {
    return null;
  }

  const loopItems = [...tickerItems, ...tickerItems];

  return (
    <div className="h-9 overflow-hidden border-b border-[#2a3f55] bg-[#0a1520] text-[12px] text-[#8fa3b1]">
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="flex h-full min-w-max items-center gap-8 px-4"
        style={{ animation: "ticker-scroll 40s linear infinite" }}
      >
        {loopItems.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <span>{item.icon}</span>
            <span className="text-white">{item.teams}</span>
            <span>{item.arrow}</span>
            <span className="font-semibold text-[#f5a623]">
              {item.odds.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
