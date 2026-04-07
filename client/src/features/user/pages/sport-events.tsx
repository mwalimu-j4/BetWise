import EventCard from "../components/EventCard";
import type { BetSelection } from "../hooks/useBetSlip";
import type { ApiEvent } from "../hooks/useEvents";

type SportEventsProps = {
  events: ApiEvent[];
  onOddsSelect: (selection: BetSelection) => void;
  selectedOdds: Set<string>;
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
}: SportEventsProps) {
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
    <div className="space-y-4">
      {Object.entries(groupedEvents).map(([leagueName, leagueEvents]) => (
        <section
          key={leagueName}
          className="overflow-hidden rounded-xl border border-[#24384c] bg-[#0f1a2a]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#24384c] bg-[#121f31] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-[13px]" aria-hidden="true">
                {getLeagueIcon(leagueName)}
              </span>
              <h3 className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a9bb0]">
                {leagueName}
              </h3>
            </div>

            {leagueEvents[0] ? (
              <p className="shrink-0 text-[10px] font-medium uppercase tracking-[0.1em] text-[#8a9bb0]">
                Kickoff {formatKickoffTime(leagueEvents[0].commenceTime)}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 p-3 lg:grid-cols-2">
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
