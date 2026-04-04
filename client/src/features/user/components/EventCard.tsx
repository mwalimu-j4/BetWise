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
    month: "short",
    day: "numeric",
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
  const otherMarketsCount =
    Number(Boolean(event.markets.spreads)) +
    Number(Boolean(event.markets.totals));

  return (
    <article className="rounded-[10px] border border-[#2a3f55] bg-[#1a2634] p-[14px] transition-colors hover:border-[#3a5f75] hover:bg-[#1d2d3d]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-[#8fa3b1]">
          <span>{getSportIcon(event.sportKey)}</span>
          <span className="truncate">
            {event.leagueName ?? "Featured Match"}
          </span>
          <span className="opacity-50">•</span>
          <span>{formatCommenceTime(event.commenceTime)}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-[11px]">
          {event.status === "LIVE" ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#00c853]" />
              <span className="font-semibold text-[#00c853]">LIVE</span>
            </>
          ) : (
            <span className="text-[#8fa3b1]">
              {getRelativeTime(event.commenceTime)}
            </span>
          )}
          {event.homeScore !== null && event.awayScore !== null ? (
            <span className="rounded-md bg-black/20 px-2 py-1 text-[12px] font-bold text-white">
              {event.homeScore} - {event.awayScore}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="truncate text-[15px] font-bold text-white">
          {event.homeTeam}
        </p>
        <p className="text-[12px] text-[#8fa3b1]">vs</p>
        <p className="truncate text-right text-[15px] font-bold text-white">
          {event.awayTeam}
        </p>
      </div>

      <div
        className={`mt-4 grid gap-2 ${
          event.markets.h2h?.draw ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        {event.markets.h2h ? (
          <>
            <OddsButton
              label={event.homeTeam}
              odds={event.markets.h2h.home}
              eventId={event.eventId}
              eventName={eventName}
              leagueName={event.leagueName ?? "Featured Match"}
              marketType="h2h"
              side={event.homeTeam}
              commenceTime={event.commenceTime}
              isSelected={selectedOdds.has(
                `${event.eventId}:${event.homeTeam}`,
              )}
              onSelect={onOddsSelect}
            />
            {event.markets.h2h.draw ? (
              <OddsButton
                label="Draw"
                odds={event.markets.h2h.draw}
                eventId={event.eventId}
                eventName={eventName}
                leagueName={event.leagueName ?? "Featured Match"}
                marketType="h2h"
                side="Draw"
                commenceTime={event.commenceTime}
                isSelected={selectedOdds.has(`${event.eventId}:Draw`)}
                onSelect={onOddsSelect}
              />
            ) : null}
            <OddsButton
              label={event.awayTeam}
              odds={event.markets.h2h.away}
              eventId={event.eventId}
              eventName={eventName}
              leagueName={event.leagueName ?? "Featured Match"}
              marketType="h2h"
              side={event.awayTeam}
              commenceTime={event.commenceTime}
              isSelected={selectedOdds.has(
                `${event.eventId}:${event.awayTeam}`,
              )}
              onSelect={onOddsSelect}
            />
          </>
        ) : (
          <div className="col-span-full rounded-md border border-dashed border-[#2a3f55] px-3 py-4 text-center text-[13px] text-[#8fa3b1]">
            Odds coming soon
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-[#8fa3b1]">
        <span>{event._count.bets} bets placed</span>
        {otherMarketsCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#2a3f55] px-2 py-1">
            <span className="text-[12px] text-white">+</span>
            <span>{otherMarketsCount} markets</span>
          </span>
        ) : null}
      </div>
    </article>
  );
}
