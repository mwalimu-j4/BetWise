import { useEffect, useMemo, useState } from "react";
import BetSlip from "../components/BetSlip";
import EventCard from "../components/EventCard";
import LiveTicker from "../components/LiveTicker";
import useBetSlip from "../hooks/useBetSlip";
import useEvents from "../hooks/useEvents";
import SportEvents from "./sport-events";
import { Users, Activity, Trophy } from "lucide-react";
import heroOne from "@/assets/h1.jfif";
import heroTwo from "@/assets/h2.jfif";
import heroThree from "@/assets/h3.jfif";
import heroFour from "@/assets/h4.jfif";
import heroFive from "@/assets/h5.jfif";

// Custom hook-based component for smooth number animation
function AnimatedNumber({ value, suffix = "", isFloat = false }: { value: number, suffix?: string, isFloat?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number;
    const duration = 2000; // Animation duration in milliseconds

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function (easeOutExpo) for a smooth deceleration
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(value * ease);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value); // Ensure it ends exactly on the target value
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return (
    <span>
      {isFloat ? displayValue.toFixed(1) : Math.floor(displayValue)}
      {suffix}
    </span>
  );
}

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
          (selection) =>
            `${selection.eventId}:${selection.marketType}:${selection.side}:${selection.odds.toFixed(2)}`,
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
  const hasSelections = betSlip.selections.length > 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroImages.length);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [heroImages.length]);

  return (
    <div className="min-h-screen bg-[#0b1120] font-[Inter,Roboto,Segoe_UI,sans-serif] text-white">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
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
                {/* Darkened overlay: transitioning from a deeper navy back into the royal blue */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0b1f4a]/95 via-[#122d6b]/80 to-[#1d428a]/30" />
              </article>
            ))}

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#ffd500] font-bold">
                    BetixPro Picks
                  </p>
                  <h1 className="mt-1 max-w-2xl text-base font-extrabold text-white sm:text-xl md:text-2xl drop-shadow-md">
                    Bet Smarter, Win Bigger
                  </h1>
                  
                  <div className="mt-2.5 flex items-center gap-3 sm:gap-5 text-[10px] sm:text-xs font-medium text-[#d6e0e8]">
                    <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 backdrop-blur-sm shadow-sm">
                      <Users className="h-3.5 w-3.5 text-[#ffd500]" />
                      <span>
                        <AnimatedNumber value={11.2} suffix="K" isFloat={true} /> Active
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 backdrop-blur-sm shadow-sm">
                      <Activity className="h-3.5 w-3.5 text-[#ffd500]" />
                      <span>
                        <AnimatedNumber value={94} suffix="%" /> Engagement
                      </span>
                    </div>
                    <div className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 backdrop-blur-sm shadow-sm sm:flex">
                      <Trophy className="h-3.5 w-3.5 text-[#ffd500]" />
                      <span>Top Odds</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {heroImages.map((_, index) => (
                    <button
                      key={`hero-dot-${index}`}
                      type="button"
                      onClick={() => setActiveHeroIndex(index)}
                      aria-label={`Show slide ${index + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        index === activeHeroIndex
                          ? "w-6 bg-[#ffd500]"
                          : "w-2 bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <LiveTicker />

        <section className="overflow-x-auto rounded-xl border border-[#2d4362] bg-[#1e304a] px-4 py-3 app-scrollbar scroll-smooth">
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
                  className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
                    isActive
                      ? "border-[#ffd500] bg-[#ffd500]/15 text-[#ffd500]"
                      : "border-[#365074] text-[#8a9bb0] hover:border-[#ffd500]/60 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="space-y-5">
          {liveEvents.length > 0 ? (
            <section className="space-y-3 overflow-hidden rounded-2xl border border-[#23384f] bg-[linear-gradient(180deg,#101b2b_0%,#0e1726_100%)] p-4 shadow-[0_18px_36px_rgba(0,0,0,0.24)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#22c55e]" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-white">
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
                    View all live
                  </button>
                ) : null}
              </div>

              <div className="space-y-3">
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

          <div
            className={`grid items-start gap-6 ${
              hasSelections
                ? "xl:grid-cols-[minmax(0,1fr)_380px]"
                : "grid-cols-1"
            }`}
          >
            <section className="min-w-0 space-y-5 rounded-2xl border border-[#23384f] bg-[linear-gradient(180deg,#101b2b_0%,#0d1624_100%)] p-4 shadow-[0_22px_42px_rgba(0,0,0,0.22)] sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#22384d] pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f5c518]">
                    Match Centre
                  </p>
                  <h2 className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-[#e4edf5]">
                    UPCOMING MATCHES
                  </h2>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#8a9bb0]">
                    {formatToday()}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#28435c] bg-[#122034] px-4 py-3 text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#8a9bb0]">
                    Available Fixtures
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {upcomingEvents.length}
                  </p>
                </div>
              </div>

              {loading ? (
                <div
                  className={`grid gap-3 ${
                    hasSelections
                      ? "lg:grid-cols-2"
                      : "md:grid-cols-2 xl:grid-cols-3"
                  }`}
                >
                  {Array.from({ length: hasSelections ? 4 : 6 }).map(
                    (_, index) => (
                      <div
                        key={`event-skeleton-${index}`}
                        className="animate-pulse rounded-2xl border border-[#23384f] bg-[#111d2e] p-4"
                      >
                        <div className="h-2.5 w-1/3 rounded bg-[#243548]" />
                        <div className="mt-3 h-4 w-full rounded bg-[#243548]" />
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="h-8 rounded bg-[#243548]" />
                          <div className="h-8 rounded bg-[#243548]" />
                          <div className="h-8 rounded bg-[#243548]" />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-[#5a222a] bg-[#2a1515] p-6 text-center">
                  <p className="text-sm text-red-200">{error}</p>
                  <button
                    type="button"
                    onClick={refetch}
                    className="mt-4 rounded-lg bg-[#ffd500] px-4 py-2 text-sm font-semibold text-black"
                  >
                    Refresh
                  </button>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="rounded-2xl border border-[#2d4362] bg-[#1e304a] px-6 py-10 text-center">
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
                    className="mt-4 rounded-lg bg-[#ffd500] px-4 py-2 text-sm font-semibold text-black"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <SportEvents
                  events={upcomingEvents}
                  onOddsSelect={betSlip.addSelection}
                  selectedOdds={selectedOdds}
                  cardsPerRow={hasSelections ? 2 : 3}
                />
              )}
            </section>

            {hasSelections ? (
              <div className="min-w-0 self-start">
                <BetSlip {...betSlip} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}