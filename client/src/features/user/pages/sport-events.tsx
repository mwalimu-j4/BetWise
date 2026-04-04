import EventCard from "../components/EventCard";
import type { BetSelection } from "../hooks/useBetSlip";
import type { ApiEvent } from "../hooks/useEvents";

type SportEventsProps = {
  events: ApiEvent[];
  onOddsSelect: (selection: BetSelection) => void;
  selectedOdds: Set<string>;
};

export default function SportEvents({
  events,
  onOddsSelect,
  selectedOdds,
}: SportEventsProps) {
  const groupedEvents = events.reduce<Record<string, ApiEvent[]>>(
    (groups, event) => {
      const key = event.leagueName ?? "Featured Matches";
      groups[key] = [...(groups[key] ?? []), event];
      return groups;
    },
    {},
  );

  return (
    <div className="space-y-5">
      {Object.entries(groupedEvents).map(([leagueName, leagueEvents]) => (
        <section key={leagueName} className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-[#2a3f55]" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8fa3b1]">
              {leagueName}
            </h3>
            <span className="h-px flex-1 bg-[#2a3f55]" />
          </div>

          <div className="space-y-2">
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
