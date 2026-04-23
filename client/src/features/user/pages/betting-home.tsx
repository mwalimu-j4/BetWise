import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import BetSlip from "../components/BetSlip";
import { CustomEventCard } from "../components/CustomEventCard";
import HighlightsSection from "../components/HighlightsSection";
import LiveTicker from "../components/LiveTicker";
import useBetSlip, { type BetSelection } from "../components/hooks/useBetSlip";
import useEvents from "../components/hooks/useEvents";
import { useCustomEvents } from "../components/hooks/useCustomEvents";
import { getHighlightEvents } from "../utils/highlights";
import SportEvents from "./sport-events";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Flame,
  Calendar,
  Star,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
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
  const location = useLocation();
  const {
    events,
    loading,
    error,
    sports,
    selectedSport,
    selectedLeague,
    setSelectedSport,
    setSelectedLeague,
    refetch,
  } = useEvents({
    limit: 500,
    includeLiveEvents: false,
  });
  const { events: featuredEvents } = useEvents({
    featured: true,
    includeLiveEvents: false,
    includeSports: false,
  });
  const betSlip = useBetSlip();
  const { events: customEvents } = useCustomEvents();
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [highlightsRefreshTick, setHighlightsRefreshTick] = useState(() =>
    Date.now(),
  );
  const tabsRef = useRef<HTMLDivElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);

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

  const nowMs = Date.now();
  const nonLiveEvents = useMemo(
    () => events.filter((event) => event.status !== "LIVE"),
    [events],
  );
  const nonLiveFeaturedEvents = useMemo(
    () => featuredEvents.filter((event) => event.status !== "LIVE"),
    [featuredEvents],
  );
  const nonLiveCustomEvents = useMemo(
    () => customEvents.filter((event) => event.status !== "LIVE"),
    [customEvents],
  );
  const isHighlightsFocused =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("section") ===
          "highlights" || window.location.hash === "#highlights"
      : false;
  const upcomingEvents = nonLiveEvents.filter((event) => {
    const commenceMs = new Date(event.commenceTime).getTime();
    return Number.isFinite(commenceMs) && commenceMs > nowMs;
  });
  const highlightEvents = useMemo(
    () =>
      getHighlightEvents({
        regularEvents: [...nonLiveFeaturedEvents, ...nonLiveEvents],
        customEvents: nonLiveCustomEvents,
        now: highlightsRefreshTick,
      }),
    [
      nonLiveCustomEvents,
      nonLiveEvents,
      nonLiveFeaturedEvents,
      highlightsRefreshTick,
    ],
  );
  const highlightedRegularEventIds = useMemo(
    () =>
      new Set(
        highlightEvents
          .map((event) => event.regularEvent?.eventId)
          .filter((eventId): eventId is string => Boolean(eventId)),
      ),
    [highlightEvents],
  );
  const highlightedCustomEventIds = useMemo(
    () =>
      new Set(
        highlightEvents
          .map((event) => event.customEvent?.id)
          .filter((eventId): eventId is string => Boolean(eventId)),
      ),
    [highlightEvents],
  );
  const upcomingCustomEvents = nonLiveCustomEvents.filter(
    (event) =>
      event.status === "PUBLISHED" && !highlightedCustomEventIds.has(event.id),
  );
  const filteredFeaturedEvents = nonLiveFeaturedEvents.filter(
    (event) => !highlightedRegularEventIds.has(event.eventId),
  );
  const filteredUpcomingEvents = upcomingEvents.filter(
    (event) => !highlightedRegularEventIds.has(event.eventId),
  );
  const heroImages = [heroOne, heroTwo, heroThree, heroFour, heroFive];
  const hasSelections = betSlip.selections.length > 0;

  const customActiveSelections = useMemo(
    () =>
      betSlip.selections.map((s) => ({
        eventId: s.eventId,
        side: s.side,
      })),
    [betSlip.selections],
  );

  const handleCustomSelect = useCallback(
    (params: {
      eventId: string;
      eventName: string;
      leagueName: string;
      marketType: string;
      side: string;
      odds: number;
      commenceTime: string;
      isCustomEvent: boolean;
      customSelectionId: string;
    }) => {
      const selection: BetSelection = {
        eventId: params.eventId,
        eventName: params.eventName,
        leagueName: params.leagueName,
        marketType: params.marketType,
        side: params.side,
        odds: params.odds,
        commenceTime: params.commenceTime,
        isCustomEvent: true,
        customSelectionId: params.customSelectionId,
      };
      betSlip.addSelection(selection);
    },
    [betSlip],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroImages.length);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [heroImages.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHighlightsRefreshTick(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setHighlightsRefreshTick(Date.now());
  }, [nonLiveEvents, nonLiveCustomEvents]);

  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    const shouldFocusHighlights =
      params.get("section") === "highlights" ||
      window.location.hash === "#highlights";

    if (!shouldFocusHighlights) {
      return;
    }

    const timer = window.setTimeout(() => {
      highlightsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [location]);

  const scrollTabs = (direction: "left" | "right") => {
    if (!tabsRef.current) return;
    const scrollAmount = 200;
    tabsRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="betting-home-wrapper min-h-screen bg-[var(--color-bg-main)] font-[IBM_Plex_Sans,Segoe_UI,sans-serif] text-white">
      <div
        className={`betting-home-main mx-auto w-full max-w-none px-2 pb-24 pt-0 sm:px-3 sm:pb-24 sm:pt-1 md:px-4 md:pb-6 md:pt-2 lg:px-4 xl:px-5 2xl:px-6 ${
          hasSelections ? "has-betslip" : ""
        }`}
      >
        {/* ═══════════════════════════════════════════════════
            HERO CAROUSEL — compact, professional banner
          ═══════════════════════════════════════════════════ */}
        <section className="hero-section mobile-home-hero relative mt-0 overflow-hidden rounded-xl border border-[#1e3350]/60 shadow-[0_4px_20px_rgba(0,0,0,0.35)] sm:mt-1 sm:rounded-2xl">
          <div className="relative h-[70px] w-full sm:h-[80px] md:h-[95px] lg:h-[110px]">
            {heroImages.map((image, index) => (
              <article
                key={`hero-image-${index}`}
                className="absolute inset-0 h-full w-full transition-all duration-700 ease-out"
                style={{
                  transform: `translateX(${(index - activeHeroIndex) * 100}%)`,
                  opacity: index === activeHeroIndex ? 1 : 0.7,
                }}
              >
                <img
                  src={image}
                  alt={`Featured betting visual ${index + 1}`}
                  className="h-full w-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                />
                {/* Multi-layer gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#060d18]/95 via-[#0b1a30]/75 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120]/90 via-transparent to-transparent" />
              </article>
            ))}

            {/* Hero content */}
            <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4 md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div className="z-10 max-w-xl">
                  <div className="mb-1 inline-flex items-center gap-1 rounded-full border border-[#ffd500]/20 bg-[#ffd500]/10 px-2 py-0.5 backdrop-blur-sm">
                    <Flame className="h-2 w-2 text-[#ffd500] sm:h-2.5 sm:w-2.5" />
                    <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-[#ffd500] sm:text-[8px] md:text-[9px]">
                      BetixPro Picks
                    </span>
                  </div>
                  <h1 className="text-sm font-extrabold leading-tight text-white sm:text-lg md:text-xl lg:text-2xl">
                    Bet Smarter,{" "}
                    <span className="bg-gradient-to-r from-[#ffd500] to-[#ffaa00] bg-clip-text text-transparent">
                      Win Bigger
                    </span>
                  </h1>
                </div>

                {/* Dot indicators */}
                <div className="z-10 flex items-center gap-1.5 self-start sm:self-auto">
                  {heroImages.map((_, index) => (
                    <button
                      key={`hero-dot-${index}`}
                      type="button"
                      onClick={() => setActiveHeroIndex(index)}
                      aria-label={`Show slide ${index + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === activeHeroIndex
                          ? "w-6 bg-[#ffd500] shadow-[0_0_8px_rgba(255,213,0,0.5)]"
                          : "w-1.5 bg-white/30 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>


        <section className="mobile-home-tabs relative mt-3 sm:mt-4">
          <div className="flex items-center rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#0f1a2d] to-[#0b1525] shadow-[0_8px_24px_rgba(0,0,0,0.25)] overflow-hidden">
            {/* Left scroll arrow */}
            <button
              type="button"
              onClick={() => scrollTabs("left")}
              className="z-10 flex self-stretch items-center justify-center px-3 text-[#506680] transition hover:bg-[#1a2b44] hover:text-white"
              aria-label="Scroll tabs left"
            >
              <ChevronLeft size={14} />
            </button>

            <div
              ref={tabsRef}
              className="app-scrollbar relative flex-1 scroll-smooth overflow-x-auto py-1"
            >
              <div className="flex min-w-max gap-1 px-1">
                {tabs.map((tab) => {
                  const isActive =
                    selectedSport === tab.sportKey &&
                    selectedLeague === tab.league;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setSelectedSport(tab.sportKey);
                        setSelectedLeague(tab.league);
                      }}
                      className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] transition-all duration-300 ${
                        isActive
                          ? "border border-[#f5c518] text-[#f5c518]"
                          : "border border-transparent text-[#647fa0] hover:text-[#a8c0dc]"
                      }`}
                    >
                      {tab.label}
                      {isActive && (
                        <div className="absolute -bottom-[1px] left-1/2 h-[2px] w-1/2 -translate-x-1/2 rounded-full bg-[#f5c518] shadow-[0_0_8px_#f5c518]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right scroll arrow */}
            <button
              type="button"
              onClick={() => scrollTabs("right")}
              className="z-10 flex self-stretch items-center justify-center px-3 text-[#506680] transition hover:bg-[#1a2b44] hover:text-white"
              aria-label="Scroll tabs right"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            MAIN CONTENT AREA — events + betslip (sticky right on desktop)
          ═══════════════════════════════════════════════════ */}
        <div
          className={`betting-content mt-3 min-w-0 sm:mt-4 ${hasSelections ? "lg:flex lg:items-start lg:gap-5" : ""}`}
        >
          <div
            className={`events-pane min-w-0 ${
              hasSelections ? "lg:min-w-0 lg:flex-1" : ""
            }`}
          >
            {/* CUSTOM EVENTS section */}
            {upcomingCustomEvents.length > 0 && (
              <section className="mobile-home-panel mb-3 overflow-hidden rounded-xl border border-amber-400/10 bg-gradient-to-b from-[#0f1a2d] to-[#0b1525] shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:mb-4 sm:rounded-2xl">
                <div className="flex items-center justify-between border-b border-[#1e3350]/40 px-3 py-2 sm:px-4 sm:py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">⚡</span>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white sm:text-[11px]">
                      Custom Events
                    </h2>
                    <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                      {upcomingCustomEvents.length}
                    </span>
                  </div>
                  <a
                    href="/user/custom-events"
                    className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#ffd500] transition hover:text-[#ffe566] sm:text-[10px]"
                  >
                    View all →
                  </a>
                </div>

                <div className="grid gap-1.5 p-1.5 sm:grid-cols-2 sm:gap-3 sm:p-3">
                  {upcomingCustomEvents.slice(0, 4).map((event) => (
                    <CustomEventCard
                      key={event.id}
                      event={event}
                      onSelectOutcome={handleCustomSelect}
                      activeSelections={customActiveSelections}
                    />
                  ))}
                </div>
              </section>
            )}

            {filteredFeaturedEvents.length > 0 ? (
              <section className="featured-events-section mobile-home-panel overflow-hidden rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#0f1a2d] to-[#0b1525] shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:rounded-2xl">
                <div className="featured-section-header border-b border-[#1e3350]/40 px-3 py-2 sm:px-4 sm:py-2.5">
                  <Star className="h-4 w-4 text-[#f5c518]" />
                  <div className="min-w-0 flex-1">
                    <h2 className="featured-section-title">Featured Events</h2>
                  </div>
                  <Link to="/user/featured-events" className="featured-see-all">
                    See all →
                  </Link>
                </div>

                <div className="p-1.5 sm:p-3 md:p-4">
                  <SportEvents
                    events={filteredFeaturedEvents.slice(0, 5)}
                    onOddsSelect={betSlip.addSelection}
                    selectedOdds={selectedOdds}
                    cardsPerRow={2}
                  />
                </div>
              </section>
            ) : null}

            <div
              ref={highlightsRef}
              className={
                isHighlightsFocused || filteredFeaturedEvents.length > 0
                  ? "mb-3 sm:mb-4"
                  : ""
              }
            >
              <HighlightsSection
                events={highlightEvents}
                selectedOdds={selectedOdds}
                customActiveSelections={customActiveSelections}
                onRegularSelect={betSlip.addSelection}
                onCustomSelect={handleCustomSelect}
              />
            </div>

            {/* UPCOMING MATCHES section */}
            <section className="matches-section mobile-home-panel min-w-0 rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#0f1a2d] to-[#0b1525] shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:rounded-2xl">
              {/* Match Centre header */}
              <div className="border-b border-[#1e3350]/40 px-3 py-3 sm:px-4 sm:py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="mb-1 flex items-center gap-1.5">
                      <Calendar className="h-2.5 w-2.5 text-[#ffd500] sm:h-3 sm:w-3" />
                      <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#ffd500] sm:text-[9px]">
                        All Events
                      </p>
                    </div>
                    <div className="mb-1 flex items-center gap-1.5">
                      <Calendar className="h-2.5 w-2.5 text-[#ffd500] sm:h-3 sm:w-3" />
                      <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#ffd500] sm:text-[9px]">
                        Match Centre
                      </p>
                    </div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-white sm:text-sm md:text-base">
                      Upcoming Matches
                    </h2>
                    <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-[#637fa0] sm:text-[10px]">
                      {formatToday()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-[#1e3350]/50 bg-[#0b1525]/80 px-2.5 py-2 sm:px-3 sm:py-2.5">
                    <div className="text-right">
                      <p className="text-[7px] uppercase tracking-[0.16em] text-[#637fa0] sm:text-[8px]">
                        Fixtures
                      </p>
                      <p className="text-lg font-black text-white sm:text-xl">
                        {filteredUpcomingEvents.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match content */}
              <div className="p-1.5 sm:p-3 md:p-4">
                {loading ? (
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: hasSelections ? 4 : 6 }).map(
                      (_, index) => (
                        <div
                          key={`event-skeleton-${index}`}
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
                      <RefreshCw className="h-5 w-5 text-red-300" />
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
                ) : filteredUpcomingEvents.length === 0 ? (
                  <div className="flex flex-col items-center rounded-xl border border-[#1e3350]/40 bg-[#0f1a2d] px-6 py-12 text-center">
                    <div className="mb-3 text-4xl">⚽</div>
                    <p className="text-base font-semibold text-white">
                      No matches available right now
                    </p>
                    <p className="mt-1.5 text-sm text-[#637fa0]">
                      Check back soon or refresh to see latest fixtures
                    </p>
                    <button
                      type="button"
                      onClick={refetch}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#ffd500] to-[#ffaa00] px-5 py-2.5 text-sm font-bold text-[#0b1120] transition hover:shadow-[0_4px_16px_rgba(255,213,0,0.3)]"
                    >
                      <RefreshCw size={14} />
                      Refresh
                    </button>
                  </div>
                ) : (
                  <SportEvents
                    events={filteredUpcomingEvents}
                    onOddsSelect={betSlip.addSelection}
                    selectedOdds={selectedOdds}
                    cardsPerRow={2}
                  />
                )}
              </div>
            </section>
          </div>

          {/* BetSlip — sticky sidebar on desktop, mobile bottom sheet handled internally */}
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
