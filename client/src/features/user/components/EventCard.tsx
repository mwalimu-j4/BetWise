import OddsButton from "./OddsButton";
import type { BetSelection } from "../hooks/useBetSlip";
import type { ApiEvent } from "../hooks/useEvents";

type EventCardProps = {
  event: ApiEvent;
  onOddsSelect: (selection: BetSelection) => void;
  selectedOdds: Set<string>;
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

function formatCommenceTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRelativeTime(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 60) {
    return `in ${Math.max(diffMinutes, 1)} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `in ${Math.max(diffHours, 1)} hr`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `in ${Math.max(diffDays, 1)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
}

export default function EventCard({
  event,
  onOddsSelect,
  selectedOdds,
}: EventCardProps) {
  const eventName = `${event.homeTeam} vs ${event.awayTeam}`;
  const homeSide = event.homeTeam;
  const awaySide = event.awayTeam;

  return (
    <article className="bg-[#111d2e] px-3 py-2 transition-colors hover:bg-[#152338] sm:px-3.5">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-[#8a9bb0]">
            <span>{getSportIcon(event.sportKey)}</span>
            <span>{formatCommenceTime(event.commenceTime)}</span>
            {event.status === "LIVE" ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e]" />
                <span className="font-semibold text-[#22c55e]">Live</span>
              </>
            ) : null}
          </div>

          <div className="space-y-0.5">
            <p className="truncate text-[12px] font-semibold leading-[1.25] text-white sm:text-[13px]">
              {event.homeTeam}
            </p>
            <p className="truncate text-[12px] font-semibold leading-[1.25] text-white sm:text-[13px]">
              {event.awayTeam}
            </p>
          </div>
        </div>

        <div className="grid w-[164px] shrink-0 grid-cols-3 gap-1.5 sm:w-[180px]">
          <OddsButton
            label="1"
            odds={event.markets.h2h?.home ?? null}
            eventId={event.eventId}
            eventName={eventName}
            leagueName={event.leagueName ?? "Featured Match"}
            marketType="h2h"
            side={homeSide}
            commenceTime={event.commenceTime}
            isSelected={selectedOdds.has(`${event.eventId}:${homeSide}`)}
            disabled={!event.markets.h2h}
            onSelect={onOddsSelect}
          />

          <OddsButton
            label="X"
            odds={event.markets.h2h?.draw ?? null}
            eventId={event.eventId}
            eventName={eventName}
            leagueName={event.leagueName ?? "Featured Match"}
            marketType="h2h"
            side="Draw"
            commenceTime={event.commenceTime}
            isSelected={selectedOdds.has(`${event.eventId}:Draw`)}
            disabled={!event.markets.h2h || event.markets.h2h.draw === null}
            onSelect={onOddsSelect}
          />

          <OddsButton
            label="2"
            odds={event.markets.h2h?.away ?? null}
            eventId={event.eventId}
            eventName={eventName}
            leagueName={event.leagueName ?? "Featured Match"}
            marketType="h2h"
            side={awaySide}
            commenceTime={event.commenceTime}
            isSelected={selectedOdds.has(`${event.eventId}:${awaySide}`)}
            disabled={!event.markets.h2h}
            onSelect={onOddsSelect}
          />
        </div>
      </div>

      <div className="mt-1.5 text-[10px] text-[#8a9bb0]">
        {event.status === "LIVE"
          ? event.homeScore !== null && event.awayScore !== null
            ? `Score ${event.homeScore}-${event.awayScore}`
            : "In play"
          : getRelativeTime(event.commenceTime)}
      </div>
    </article>
  );
}
