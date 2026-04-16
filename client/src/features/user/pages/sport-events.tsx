import EventCard from "../components/EventCard";
import type { BetSelection } from "../hooks/useBetSlip";
import type { ApiEvent } from "../hooks/useEvents";

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
      ? "grid-cols-1 md:grid-cols-2"
      : cardsPerRow === 3
        ? "md:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-2";

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
          className="overflow-hidden rounded-xl border border-[#1e3350]/40 bg-[#0c1625]"
        >
          {/* League header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e3350]/30 bg-gradient-to-r from-[#101d30] to-[#0f1a2d] px-2.5 py-1.5 sm:flex-nowrap sm:px-3 sm:py-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="text-xs sm:text-sm" aria-hidden="true">
                {getLeagueIcon(leagueName)}
              </span>
              <h3 className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7a94b8] sm:text-[10px]">
                {leagueName}
              </h3>
            </div>

            {leagueEvents[0] ? (
              <p className="max-w-full shrink-0 text-[8px] font-medium uppercase tracking-[0.08em] text-[#546e8f] sm:text-[9px]">
                Kickoff {formatKickoffTime(leagueEvents[0].commenceTime)}
              </p>
            ) : null}
          </div>

          {/* Event cards grid */}
          <div
            className={`grid gap-2 p-2 sm:gap-3 sm:p-3 md:gap-4 ${eventGridClassName}`}
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
