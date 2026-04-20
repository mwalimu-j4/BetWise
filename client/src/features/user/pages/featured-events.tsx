import { Star } from "lucide-react";
import { useMemo } from "react";
import BetSlip from "../components/BetSlip";
import useBetSlip from "../components/hooks/useBetSlip";
import useEvents from "../components/hooks/useEvents";
import SportEvents from "./sport-events";

export default function FeaturedEventsPage() {
  const { events, loading, error, refetch } = useEvents({
    featured: true,
    includeLiveEvents: false,
    includeSports: false,
    limit: 100,
  });
  const betSlip = useBetSlip();

  const selectedOdds = useMemo(
    () =>
      new Set(
        betSlip.selections.map(
          (selection) =>
            `${selection.eventId}:${selection.marketType}:${selection.side}:${selection.odds.toFixed(2)}`,
        ),
      ),
    [betSlip.selections],
  );

  const hasSelections = betSlip.selections.length > 0;

  return (
    <div className="betting-home-wrapper min-h-screen bg-[radial-gradient(circle_at_top,_#163154_0%,_#0b1120_42%,_#08101d_100%)] font-[IBM_Plex_Sans,Segoe_UI,sans-serif] text-white">
      <div
        className={`betting-home-main mx-auto w-full max-w-7xl px-3 pb-24 pt-4 sm:px-4 sm:py-4 md:px-6 md:pb-6 lg:px-3 xl:px-4 2xl:px-6 ${
          hasSelections ? "has-betslip" : ""
        }`}
      >
        <div
          className={`betting-content min-w-0 ${hasSelections ? "lg:flex lg:items-start lg:gap-5" : ""}`}
        >
          <div
            className={`events-pane min-w-0 ${
              hasSelections ? "lg:min-w-0 lg:flex-1" : ""
            }`}
          >
            <section className="mobile-home-panel min-w-0 rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#0f1a2d] to-[#0b1525] shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:rounded-2xl">
              <div className="border-b border-[#1e3350]/40 px-3 py-3 sm:px-4 sm:py-3.5">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 rounded-full bg-[#f5c518]/10 p-2 text-[#f5c518]">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                  <div>
                    <h1 className="text-xs font-bold uppercase tracking-[0.12em] text-white sm:text-sm md:text-base">
                      Featured Events
                    </h1>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#637fa0] sm:text-xs">
                      Hand-picked matches by our trading team
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-1.5 sm:p-3 md:p-4">
                {loading ? (
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: hasSelections ? 4 : 6 }).map(
                      (_, index) => (
                        <div
                          key={`featured-event-skeleton-${index}`}
                          className="animate-pulse rounded-xl border border-[#1e3350]/40 bg-[#111d2e] p-3"
                        >
                          <div className="h-2 w-1/3 rounded-full bg-[#1e3350]/60" />
                          <div className="mt-2.5 h-3.5 w-full rounded-full bg-[#1e3350]/60" />
                          <div className="mt-3 grid grid-cols-3 gap-1.5">
                            <div className="h-7 rounded-lg bg-[#1e3350]/60" />
                            <div className="h-7 rounded-lg bg-[#1e3350]/60" />
                            <div className="h-7 rounded-lg bg-[#1e3350]/60" />
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center rounded-xl border border-[#5a222a]/40 bg-[#1a0f0f] px-6 py-10 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#5a222a]/20">
                      <Star className="h-5 w-5 text-red-300" />
                    </div>
                    <p className="text-sm font-medium text-red-200">{error}</p>
                    <button
                      type="button"
                      onClick={refetch}
                      className="mt-4 rounded-lg bg-gradient-to-r from-[#ffd500] to-[#ffaa00] px-5 py-2 text-sm font-bold text-[#0b1120] transition hover:shadow-[0_4px_16px_rgba(255,213,0,0.3)]"
                    >
                      Try Again
                    </button>
                  </div>
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-[#1e3350]/40 bg-[#0f1a2d] px-6 py-14 text-center">
                    <div className="mb-3 rounded-full bg-white/5 p-4 text-[#637fa0]">
                      <Star className="h-8 w-8" />
                    </div>
                    <p className="text-base font-semibold text-white">
                      No featured events right now
                    </p>
                    <p className="mt-1.5 text-sm text-[#637fa0]">
                      Check back soon — our team updates this daily
                    </p>
                  </div>
                ) : (
                  <SportEvents
                    events={events}
                    onOddsSelect={betSlip.addSelection}
                    selectedOdds={selectedOdds}
                    cardsPerRow={1}
                  />
                )}
              </div>
            </section>
          </div>

          {hasSelections ? (
            <div className="betslip-sidebar shrink-0 lg:w-[320px]">
              <div className="betslip-sticky-wrap lg:sticky lg:overflow-y-auto lg:app-scrollbar">
                <BetSlip {...betSlip} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
