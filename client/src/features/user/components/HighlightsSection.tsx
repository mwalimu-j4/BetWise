import { Flame } from "lucide-react";
import EventCard from "./EventCard";
import { CustomEventCard } from "./CustomEventCard";
import type { BetSelection } from "./hooks/useBetSlip";
import type { HighlightEvent } from "../utils/highlights";

type HighlightsSectionProps = {
  events: HighlightEvent[];
  selectedOdds: Set<string>;
  customActiveSelections: { eventId: string; side: string }[];
  onRegularSelect: (selection: BetSelection) => void;
  onCustomSelect: (params: {
    eventId: string;
    eventName: string;
    leagueName: string;
    marketType: string;
    side: string;
    odds: number;
    commenceTime: string;
    isCustomEvent: boolean;
    customSelectionId: string;
  }) => void;
};

export default function HighlightsSection({
  events,
  selectedOdds,
  customActiveSelections,
  onRegularSelect,
  onCustomSelect,
}: HighlightsSectionProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section
      id="highlights"
      className="mobile-home-panel overflow-hidden rounded-xl border border-[#8e6612]/50 bg-gradient-to-b from-[#151411] to-[#0b1525] shadow-[0_10px_30px_rgba(245,158,11,0.08)] sm:rounded-2xl"
    >
      <div className="flex items-center justify-between border-b border-[#8e6612]/35 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#8e6612]/40 bg-[#f5c518]/10 text-[#f5c518]">
            <Flame className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-white sm:text-sm md:text-base">
              Boosted Odds
            </h2>
          </div>
        </div>
        <span className="rounded-md bg-[#f5c518]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#f5c518]">
          {events.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 p-1.5 sm:grid-cols-2 sm:gap-3 sm:p-3 md:p-4">
        {events.map((event) =>
          event.sourceType === "regular" && event.regularEvent ? (
            <EventCard
              key={`${event.sourceType}-${event.id}`}
              event={event.regularEvent}
              onOddsSelect={onRegularSelect}
              selectedOdds={selectedOdds}
              highlightLabel="Boosted Odds"
            />
          ) : event.customEvent ? (
            <CustomEventCard
              key={`${event.sourceType}-${event.id}`}
              event={event.customEvent}
              onSelectOutcome={onCustomSelect}
              activeSelections={customActiveSelections}
            />
          ) : null,
        )}
      </div>
    </section>
  );
}
