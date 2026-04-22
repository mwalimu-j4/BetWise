import EventCard from "../components/EventCard";
import type { BetSelection } from "../components/hooks/useBetSlip";
import type { ApiEvent } from "../components/hooks/useEvents";

type SportEventsProps = {
  events: ApiEvent[];
  onOddsSelect: (selection: BetSelection) => void;
  selectedOdds: Set<string>;
  cardsPerRow?: 1 | 2 | 3;
};

function getLeagueIcon(value: string) {
  const league = value.toLowerCase();

  if (league.includes("nba") || league.includes("basketball")) {
    return "🏀";
  }

  if (league.includes("nfl") || league.includes("american")) {
    return "🏈";
  }

  if (league.includes("tennis")) {
    return "🎾";
  }

  return "⚽";
}

function formatKickoffTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SportEvents({
  events,
  onOddsSelect,
  selectedOdds,
  cardsPerRow = 2,
}: SportEventsProps) {
  const eventGridClassName =
    cardsPerRow === 1
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-2"
      : cardsPerRow === 3
        ? "md:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-2";

  const eventGridSpacingClassName =
    cardsPerRow === 2
      ? "gap-1 p-1 sm:gap-2 sm:p-2 md:gap-3 md:p-3"
      : "gap-1.5 p-1.5 sm:gap-3 sm:p-3";

  const groupedEvents = events.reduce<Record<string, ApiEvent[]>>(
    (groups, event) => {
      const key = event.leagueName ?? "Featured Matches";
      const currentLeagueEvents = groups[key] ?? [];
      groups[key] = [...currentLeagueEvents, event].sort(
        (a, b) =>
          new Date(a.commenceTime).getTime() -
          new Date(b.commenceTime).getTime(),
      );
      return groups;
    },
    {},
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {Object.entries(groupedEvents).map(([leagueName, leagueEvents]) => (
        <section
          key={leagueName}
          className="overflow-hidden rounded-xl border border-[#1e3350]/40 bg-[#0c1625] sm:rounded-2xl"
        >
          {/* League header */}
          <div className="flex items-center justify-between gap-2 border-b border-[#1e3350]/30 bg-gradient-to-r from-[#101d30] to-[#0f1a2d] px-2.5 py-2 sm:px-3.5 sm:py-2.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="text-xs sm:text-sm" aria-hidden="true">
                {getLeagueIcon(leagueName)}
              </span>
              <h3 className="truncate text-[8px] font-bold uppercase tracking-[0.16em] text-[#7a94b8] sm:text-[10px]">
                {leagueName}
              </h3>
              <span className="shrink-0 rounded-md bg-[#ffd500]/[0.06] px-1.5 py-[1px] text-[8px] font-bold tabular-nums text-[#546e8f] sm:text-[9px]">
                {leagueEvents.length}
              </span>
            </div>

            {leagueEvents[0] ? (
              <p className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#4a6a8f] sm:text-[9px]">
                {formatKickoffTime(leagueEvents[0].commenceTime)}
              </p>
            ) : null}
          </div>

          {/* Event cards grid */}
          <div
            className={`grid ${eventGridClassName} ${eventGridSpacingClassName}`}
          >
            {leagueEvents.map((event) => (
              <EventCard
                key={event.eventId}
                event={event}
                onOddsSelect={onOddsSelect}
                selectedOdds={selectedOdds}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
