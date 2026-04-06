import { useEffect, useMemo, useState } from "react";
import BetSlip from "../components/BetSlip";
import EventCard from "../components/EventCard";
import LiveTicker from "../components/LiveTicker";
import useBetSlip from "../hooks/useBetSlip";
import useEvents from "../hooks/useEvents";
import SportEvents from "./sport-events";
import heroOne from "@/assets/h1.jfif";
import heroTwo from "@/assets/h2.jfif";
import heroThree from "@/assets/h3.jfif";
import heroFour from "@/assets/h4.jfif";
import heroFive from "@/assets/h5.jfif";

function formatTabLabel(value: string) {
  return value
    .replace(/^soccer_/i, "")
    .replace(/^basketball_/i, "")
    .replace(/^americanfootball_/i, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatToday() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default function BettingHome() {
  const {
    events,
    liveEvents,
    loading,
    error,
    sports,
    selectedSport,
    selectedLeague,
    setSelectedSport,
    setSelectedLeague,
    refetch,
  } = useEvents();
  const betSlip = useBetSlip();
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  const selectedOdds = useMemo(
    () =>
      new Set(
        betSlip.selections.map(
          (selection) => `${selection.eventId}:${selection.side}`,
        ),
      ),
    [betSlip.selections],
  );

  const tabs = useMemo(() => {
    const leagueEntries = sports.flatMap((sport) =>
      sport.leagues.map((league) => ({
        id: `league-${league}`,
        label: league,
        sportKey: sport.sportKey,
        league,
      })),
    );

    const sportEntries = sports.map((sport) => ({
      id: `sport-${sport.sportKey}`,
      label: formatTabLabel(sport.sportKey),
      sportKey: sport.sportKey,
      league: "",
    }));

    const dedupedLeagues = Array.from(
      new Map(leagueEntries.map((item) => [item.label, item])).values(),
    );

    return [
      { id: "all", label: "All Sports", sportKey: "", league: "" },
      ...dedupedLeagues,
      ...sportEntries.filter(
        (sport) =>
          !dedupedLeagues.some((league) => league.sportKey === sport.sportKey),
      ),
    ];
  }, [sports]);

  const upcomingEvents = events.filter((event) => event.status !== "LIVE");
  const featuredLiveEvents = liveEvents.slice(0, 6);
  const heroImages = [heroOne, heroTwo, heroThree, heroFour, heroFive];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroImages.length);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [heroImages.length]);

  return (
    <div className="space-y-3 bg-[#0b1120] font-[Inter,Roboto,Segoe_UI,sans-serif] text-white">
      <section className="overflow-hidden rounded-2xl border border-[#23384f] bg-[#101b2b]">
        <div className="relative h-[80px] w-full sm:h-[100px] md:h-[120px]">
          {heroImages.map((image, index) => (
            <article
              key={`hero-image-${index}`}
              className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out"
              style={{
                transform: `translateX(${(index - activeHeroIndex) * 100}%)`,
              }}
            >
              <img
                src={image}
                alt={`Featured betting visual ${index + 1}`}
                className="h-full w-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a1218]/88 via-[#0a1218]/42 to-[#0b1120]/28" />
            </article>
          ))}

          <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 md:p-4">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#f5c518]">
              BetWise Picks
            </p>
            <h1 className="mt-1 max-w-2xl text-sm font-extrabold text-white sm:text-base md:text-lg">
              Bet Smarter, Win Bigger
            </h1>
            <p className="mt-1 max-w-xl text-xs text-[#d6e0e8]">
              Explore top fixtures with real-time odds and place your best picks.
            </p>

            <div className="mt-2 flex items-center gap-1.5">
              {heroImages.map((_, index) => (
                <button
                  key={`hero-dot-${index}`}
                  type="button"
                  onClick={() => setActiveHeroIndex(index)}
                  aria-label={`Show slide ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeHeroIndex
                      ? "w-7 bg-[#f5c518]"
                      : "w-2.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <LiveTicker />

      <section className="overflow-x-auto rounded-xl border border-[#23384f] bg-[#101b2b] px-2.5 py-1.5 app-scrollbar scroll-smooth">
        <div className="flex min-w-max gap-2.5">
          {tabs.map((tab) => {
            const isActive =
              selectedSport === tab.sportKey && selectedLeague === tab.league;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedSport(tab.sportKey);
                  setSelectedLeague(tab.league);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-[#f5c518] bg-[#f5c518]/12 text-[#f5c518]"
                    : "border-[#294157] text-[#8a9bb0] hover:border-[#f5c518]/60 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-w-0 space-y-4">
          {liveEvents.length > 0 ? (
            <section className="space-y-2 overflow-hidden rounded-xl border border-[#23384f] bg-[#101b2b] p-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#22c55e]" />
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    LIVE NOW
                  </h2>
                  <span className="rounded-full bg-[#18283b] px-2 py-1 text-[10px] font-semibold text-[#f5c518]">
                    {liveEvents.length}
                  </span>
                </div>
                {liveEvents.length > 6 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSport("");
                      setSelectedLeague("");
                    }}
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f5c518]"
                  >
                    View all live →
                  </button>
                ) : null}
              </div>

              <div className="divide-y divide-[#21364a]">
                {featuredLiveEvents.map((event) => (
                  <EventCard
                    key={event.eventId}
                    event={event}
                    onOddsSelect={betSlip.addSelection}
                    selectedOdds={selectedOdds}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#cfd9e2]">
                  UPCOMING MATCHES
                </h2>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-[#8a9bb0]">
                  {formatToday()}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`event-skeleton-${index}`}
                    className="animate-pulse rounded-[10px] border border-[#23384f] bg-[#111d2e] p-4"
                  >
                    <div className="h-2.5 w-1/3 rounded bg-[#243548]" />
                    <div className="mt-3 h-4 w-full rounded bg-[#243548]" />
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="h-8 rounded bg-[#243548]" />
                      <div className="h-8 rounded bg-[#243548]" />
                      <div className="h-8 rounded bg-[#243548]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-[#5a222a] bg-[#2a1515] p-6 text-center">
                <p className="text-sm text-red-200">{error}</p>
                <button
                  type="button"
                  onClick={refetch}
                  className="mt-4 rounded-lg bg-[#f5c518] px-4 py-2 text-sm font-semibold text-black"
                >
                  Refresh
                </button>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="rounded-2xl border border-[#23384f] bg-[#111d2e] px-6 py-10 text-center">
                <p className="text-3xl">⚽</p>
                <p className="mt-3 text-lg font-semibold text-white">
                  No matches available right now
                </p>
                <p className="mt-2 text-sm text-[#8a9bb0]">
                  Check back soon or refresh
                </p>
                <button
                  type="button"
                  onClick={refetch}
                  className="mt-4 rounded-lg bg-[#f5c518] px-4 py-2 text-sm font-semibold text-black"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <SportEvents
                events={upcomingEvents}
                onOddsSelect={betSlip.addSelection}
                selectedOdds={selectedOdds}
              />
            )}
          </section>
        </div>

        <div className="relative min-w-0">
          <BetSlip {...betSlip} />
        </div>
      </div>
    </div>
  );
}
