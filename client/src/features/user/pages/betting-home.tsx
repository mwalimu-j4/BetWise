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
    <div className="space-y-6 bg-[#0f1923] text-white">
      <section className="overflow-hidden rounded-2xl border border-[#2a3f55] bg-[#111c27]">
        <div className="relative h-[220px] w-full sm:h-[280px] md:h-[340px]">
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
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a1218]/90 via-[#0a1218]/35 to-transparent" />
            </article>
          ))}

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6bb63]">
              BetWise Picks
            </p>
            <h1 className="mt-2 max-w-2xl text-xl font-extrabold text-white sm:text-2xl md:text-3xl">
              Bet Smarter, Win Bigger
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#d6e0e8]">
              Explore top fixtures with real-time odds and place your best
              picks.
            </p>

            <div className="mt-4 flex items-center gap-2">
              {heroImages.map((_, index) => (
                <button
                  key={`hero-dot-${index}`}
                  type="button"
                  onClick={() => setActiveHeroIndex(index)}
                  aria-label={`Show slide ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeHeroIndex
                      ? "w-7 bg-[#f5a623]"
                      : "w-2.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <LiveTicker />

      <section className="overflow-x-auto rounded-2xl border border-[#2a3f55] bg-[#111c27] px-3 py-2">
        <div className="flex min-w-max gap-3">
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
                    ? "border-[#f5a623] bg-[#f5a623]/10 text-[#f5a623]"
                    : "border-[#2a3f55] text-[#8fa3b1] hover:border-[#4a6f8a] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {liveEvents.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff1744]" />
                  <h2 className="text-sm font-semibold tracking-[0.18em] text-white">
                    LIVE NOW
                  </h2>
                  <span className="rounded-full bg-[#1a2634] px-2 py-1 text-xs text-[#f5a623]">
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
                    className="text-sm text-[#f5a623]"
                  >
                    View all live →
                  </button>
                ) : null}
              </div>

              <div className="space-y-2">
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

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-[0.18em] text-white">
                  UPCOMING MATCHES
                </h2>
                <p className="mt-1 text-[13px] text-[#8fa3b1]">
                  {formatToday()}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`event-skeleton-${index}`}
                    className="animate-pulse rounded-[10px] border border-[#2a3f55] bg-[#1a2634] p-4"
                  >
                    <div className="h-3 w-1/3 rounded bg-[#243548]" />
                    <div className="mt-4 h-5 w-full rounded bg-[#243548]" />
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="h-11 rounded bg-[#243548]" />
                      <div className="h-11 rounded bg-[#243548]" />
                      <div className="h-11 rounded bg-[#243548]" />
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
                  className="mt-4 rounded-lg bg-[#f5a623] px-4 py-2 text-sm font-semibold text-black"
                >
                  Refresh
                </button>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="rounded-2xl border border-[#2a3f55] bg-[#1a2634] px-6 py-10 text-center">
                <p className="text-3xl">⚽</p>
                <p className="mt-3 text-lg font-semibold text-white">
                  No matches available right now
                </p>
                <p className="mt-2 text-sm text-[#8fa3b1]">
                  Check back soon or refresh
                </p>
                <button
                  type="button"
                  onClick={refetch}
                  className="mt-4 rounded-lg bg-[#f5a623] px-4 py-2 text-sm font-semibold text-black"
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

        <div className="relative">
          <BetSlip {...betSlip} />
        </div>
      </div>
    </div>
  );
}
