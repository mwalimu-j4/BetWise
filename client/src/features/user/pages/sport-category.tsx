import { lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Cherry,
  ChevronLeft,
  CircleDot,
  Dumbbell,
  Flame,
  Goal,
  RefreshCw,
  Shield,
  Swords,
  Trophy,
  Volleyball,
} from "lucide-react";
import { api } from "@/api/axiosConfig";
import BetSlip from "../components/BetSlip";
import useBetSlip from "../components/hooks/useBetSlip";
import type { ApiEvent } from "../components/hooks/useEvents";

const EventCard = lazy(() => import("../components/EventCard"));

type SportCategoryInfo = {
  id: string;
  sportKey: string;
  displayName: string;
  icon: string;
  sortOrder: number;
  eventCount: number;
  lastSyncedAt: string | null;
};

type EventsResponse = {
  events: ApiEvent[];
  total: number;
  page: number;
  totalPages: number;
};

type CategoriesResponse = {
  categories: SportCategoryInfo[];
};

const SLUG_TO_SPORT_KEY: Record<string, string> = {
  football: "soccer",
  soccer: "soccer",
  basketball: "basketball",
  tennis: "tennis",
  "american-football": "americanfootball",
  cricket: "cricket",
  "ice-hockey": "icehockey",
  "rugby-union": "rugbyunion",
  "boxing-mma": "boxing_mma",
  baseball: "baseball",
  volleyball: "volleyball",
  "table-tennis": "tabletennis",
  golf: "golf",
  snooker: "snooker",
  darts: "darts",
};

function matchesCategoryKey(
  eventSportKey: string,
  categoryKey: string,
): boolean {
  const lower = eventSportKey.toLowerCase();
  if (categoryKey === "soccer") return lower.startsWith("soccer");
  if (categoryKey === "basketball") return lower.startsWith("basketball");
  if (categoryKey === "tennis") return lower.startsWith("tennis");
  if (categoryKey === "americanfootball")
    return lower.startsWith("americanfootball");
  if (categoryKey === "cricket") return lower.startsWith("cricket");
  if (categoryKey === "icehockey") return lower.startsWith("icehockey");
  if (categoryKey === "rugbyunion") return lower.startsWith("rugby");
  if (categoryKey === "boxing_mma")
    return lower.startsWith("mma") || lower.startsWith("boxing");
  if (categoryKey === "baseball") return lower.startsWith("baseball");
  if (categoryKey === "volleyball") return lower.startsWith("volleyball");
  if (categoryKey === "tabletennis") return lower.startsWith("tabletennis");
  if (categoryKey === "golf") return lower.startsWith("golf");
  if (categoryKey === "snooker") return lower.startsWith("snooker");
  if (categoryKey === "darts") return lower.startsWith("darts");
  return lower === categoryKey;
}

function formatKickoffTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

type VisualConfig = {
  icon: LucideIcon;
  color: string;
};

const CATEGORY_VISUALS: Record<string, VisualConfig> = {
  soccer: { icon: Goal, color: "#22c55e" },
  basketball: { icon: Volleyball, color: "#f97316" },
  tennis: { icon: CircleDot, color: "#22c55e" },
  americanfootball: { icon: Shield, color: "#ef4444" },
  cricket: { icon: Dumbbell, color: "#84cc16" },
  icehockey: { icon: Cherry, color: "#38bdf8" },
  rugbyunion: { icon: Shield, color: "#38bdf8" },
  boxing_mma: { icon: Swords, color: "#f97316" },
  baseball: { icon: CircleDot, color: "#f43f5e" },
  volleyball: { icon: Volleyball, color: "#f97316" },
  tabletennis: { icon: CircleDot, color: "#22c55e" },
  golf: { icon: CircleDot, color: "#22c55e" },
  snooker: { icon: CircleDot, color: "#84cc16" },
  darts: { icon: CircleDot, color: "#fb7185" },
};

function normalizeCategoryKey(value: string) {
  return value.toLowerCase().replace(/[^a-z_]/g, "");
}

function getCategoryVisual(value: string): VisualConfig {
  const normalized = normalizeCategoryKey(value);
  return CATEGORY_VISUALS[normalized] ?? { icon: Trophy, color: "#facc15" };
}

function getLeagueVisual(value: string): VisualConfig {
  const league = value.toLowerCase();

  if (league.includes("nba") || league.includes("basketball")) {
    return { icon: Volleyball, color: "#f97316" };
  }
  if (league.includes("nfl") || league.includes("american")) {
    return { icon: Shield, color: "#ef4444" };
  }
  if (league.includes("tennis")) {
    return { icon: CircleDot, color: "#22c55e" };
  }
  if (league.includes("cricket")) {
    return { icon: Dumbbell, color: "#84cc16" };
  }
  if (league.includes("hockey")) {
    return { icon: Cherry, color: "#38bdf8" };
  }
  if (league.includes("rugby")) {
    return { icon: Shield, color: "#38bdf8" };
  }
  if (league.includes("baseball")) {
    return { icon: CircleDot, color: "#f43f5e" };
  }
  if (league.includes("mma") || league.includes("boxing")) {
    return { icon: Swords, color: "#f97316" };
  }

  return { icon: Goal, color: "#22c55e" };
}

export default function SportCategoryPage() {
  const { sportSlug } = useParams({ strict: false }) as { sportSlug: string };
  const sportKey = SLUG_TO_SPORT_KEY[sportSlug] ?? sportSlug;
  const betSlip = useBetSlip();

  const categoryQuery = useQuery({
    queryKey: ["sport-category-info", sportKey, sportSlug],
    queryFn: async () => {
      const { data } = await api.get<CategoriesResponse>(
        "/user/sport-categories",
      );
      const match = data.categories.find(
        (category) => category.sportKey === sportKey,
      );

      if (match) {
        return {
          categoryInfo: match,
          categoryNotFound: false,
        };
      }

      const knownKey = SLUG_TO_SPORT_KEY[sportSlug];
      if (knownKey) {
        return {
          categoryInfo: {
            id: "",
            sportKey: knownKey,
            displayName: sportSlug
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" "),
            icon: "trophy",
            sortOrder: 99,
            eventCount: 0,
            lastSyncedAt: null,
          } satisfies SportCategoryInfo,
          categoryNotFound: false,
        };
      }

      return {
        categoryInfo: null,
        categoryNotFound: true,
      };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const eventsQuery = useQuery({
    queryKey: ["sport-category-events", sportKey],
    queryFn: async () => {
      const { data } = await api.get<EventsResponse>("/user/events", {
        params: { limit: 500 },
      });

      return data.events.filter(
        (event) =>
          event.sportKey && matchesCategoryKey(event.sportKey, sportKey),
      );
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const liveEventsQuery = useQuery({
    queryKey: ["sport-category-live-events", sportKey],
    queryFn: async () => {
      const { data } = await api.get<EventsResponse>("/user/events/live");

      return data.events.filter(
        (event) =>
          event.sportKey && matchesCategoryKey(event.sportKey, sportKey),
      );
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });

  const categoryInfo = categoryQuery.data?.categoryInfo ?? null;
  const categoryNotFound = categoryQuery.data?.categoryNotFound ?? false;
  const events = eventsQuery.data ?? [];
  const liveEvents = liveEventsQuery.data ?? [];
  const loading =
    categoryQuery.isLoading ||
    eventsQuery.isLoading ||
    liveEventsQuery.isLoading;
  const error =
    eventsQuery.error || liveEventsQuery.error
      ? "Unable to load events right now."
      : null;

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
  const displayName = categoryInfo?.displayName ?? sportSlug.replace(/-/g, " ");
  const categoryVisual = getCategoryVisual(categoryInfo?.sportKey ?? sportKey);
  const CategoryIcon = categoryVisual.icon;
  const nowMs = Date.now();
  const upcomingEvents = events.filter(
    (event) => new Date(event.commenceTime).getTime() > nowMs,
  );

  const groupedEvents = upcomingEvents.reduce<Record<string, ApiEvent[]>>(
    (groups, event) => {
      const key = event.leagueName ?? "Matches";
      const currentGroup = groups[key] ?? [];
      groups[key] = [...currentGroup, event].sort(
        (left, right) =>
          new Date(left.commenceTime).getTime() -
          new Date(right.commenceTime).getTime(),
      );
      return groups;
    },
    {},
  );

  const refreshPage = () => {
    void Promise.all([
      categoryQuery.refetch(),
      eventsQuery.refetch(),
      liveEventsQuery.refetch(),
    ]);
  };

  if (categoryNotFound) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#163154_0%,_#0b1120_42%,_#08101d_100%)] font-[IBM_Plex_Sans,Segoe_UI,sans-serif] text-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-8">
          <Link
            to="/user"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#637fa0] transition hover:text-[#ffd500]"
          >
            <ChevronLeft size={16} />
            Back to Home
          </Link>
          <div className="flex flex-col items-center rounded-2xl border border-[#1e3350]/60 bg-gradient-to-b from-[#0f1a2d] to-[#0b1525] px-6 py-16 text-center shadow-lg">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#17253a]">
              <Trophy
                size={34}
                style={{ color: "#facc15" }}
                aria-hidden="true"
              />
            </span>
            <h1 className="text-xl font-bold text-white">Sport Not Found</h1>
            <p className="mt-2 max-w-md text-sm text-[#637fa0]">
              The sport category &ldquo;{sportSlug}&rdquo; doesn&apos;t exist.
              Browse our available sports from the sidebar or head back to the
              homepage.
            </p>
            <Link
              to="/user"
              className="mt-6 rounded-lg bg-gradient-to-r from-[#ffd500] to-[#ffaa00] px-6 py-2.5 text-sm font-bold text-[#0b1120] transition hover:shadow-[0_4px_16px_rgba(255,213,0,0.3)]"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="betting-home-wrapper min-h-screen bg-[radial-gradient(circle_at_top,_#163154_0%,_#0b1120_42%,_#08101d_100%)] font-[IBM_Plex_Sans,Segoe_UI,sans-serif] text-white">
      <div
        className={`mx-auto w-full max-w-7xl px-3 pb-24 pt-4 sm:px-4 sm:py-4 md:px-6 md:pb-6 lg:px-3 xl:px-4 2xl:px-6 ${
          hasSelections ? "has-betslip" : ""
        }`}
      >
        <Link
          to="/user"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-[#637fa0] transition hover:text-[#ffd500] sm:mb-4 sm:text-sm"
        >
          <ChevronLeft size={14} />
          Back to Home
        </Link>

        <section className="mb-3 rounded-xl border border-[#1e3350]/60 bg-gradient-to-r from-[#0f1a2d] to-[#0b1525] p-3 shadow-lg sm:mb-4 sm:rounded-2xl sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#15243a] sm:h-11 sm:w-11">
                <CategoryIcon
                  size={22}
                  style={{ color: categoryVisual.color }}
                  aria-hidden="true"
                />
              </span>
              <div>
                <h1 className="text-base font-extrabold uppercase tracking-wider text-white sm:text-lg">
                  {displayName}
                </h1>
                <p className="text-[10px] text-[#637fa0] sm:text-xs">
                  {liveEvents.length > 0 ? (
                    <span className="mr-2 text-[#22c55e]">
                      {liveEvents.length} Live
                    </span>
                  ) : null}
                  {upcomingEvents.length} Upcoming
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={refreshPage}
              className="rounded-lg border border-[#1e3350] bg-[#0b1525] p-2 text-[#637fa0] transition hover:border-[#ffd500]/30 hover:text-white"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </section>

        <div
          className={`min-w-0 ${hasSelections ? "lg:flex lg:items-start lg:gap-5" : ""}`}
        >
          <div
            className={`events-pane min-w-0 ${hasSelections ? "lg:min-w-0 lg:flex-1" : ""}`}
          >
            {liveEvents.length > 0 ? (
              <section className="mb-3 rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#0f1a2d] to-[#0b1525] shadow-lg sm:mb-4 sm:rounded-2xl">
                <div className="flex items-center justify-between border-b border-[#1e3350]/40 px-3 py-2 sm:px-4 sm:py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
                    </span>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white sm:text-[11px]">
                      Live {displayName}
                    </h2>
                    <span className="rounded-md bg-[#22c55e]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#22c55e]">
                      {liveEvents.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 p-1.5 sm:space-y-3 sm:p-3 md:p-4">
                  <Suspense
                    fallback={
                      <div className="rounded-xl border border-[#1e3350]/30 bg-[#111d2e]/40 p-4 text-xs text-[#7a94b8]">
                        Loading live events...
                      </div>
                    }
                  >
                    {liveEvents.map((event) => (
                      <EventCard
                        key={event.eventId}
                        event={event}
                        onOddsSelect={betSlip.addSelection}
                        selectedOdds={selectedOdds}
                      />
                    ))}
                  </Suspense>
                </div>
              </section>
            ) : null}

            {!loading && liveEvents.length === 0 ? (
              <section className="mb-3 rounded-xl border border-[#1e3350]/40 bg-[#0f1a2d]/60 p-3 sm:mb-4 sm:p-4">
                <div className="flex items-center gap-2">
                  <Flame size={14} className="text-[#637fa0]" />
                  <p className="text-[10px] text-[#637fa0] sm:text-xs">
                    No live {displayName.toLowerCase()} events right now. Check
                    back when matches start.
                  </p>
                </div>
              </section>
            ) : null}

            <section className="rounded-xl border border-[#1e3350]/60 bg-gradient-to-b from-[#0f1a2d] to-[#0b1525] shadow-lg sm:rounded-2xl">
              <div className="border-b border-[#1e3350]/40 px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-[#ffd500]" />
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white sm:text-xs">
                    Upcoming {displayName}
                  </h2>
                </div>
              </div>

              <div className="p-1.5 sm:p-3 md:p-4">
                {loading ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`skel-${index}`}
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
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center rounded-xl border border-[#5a222a]/40 bg-[#1a0f0f] px-6 py-10 text-center">
                    <p className="text-sm font-medium text-red-200">{error}</p>
                    <button
                      type="button"
                      onClick={refreshPage}
                      className="mt-4 rounded-lg bg-gradient-to-r from-[#ffd500] to-[#ffaa00] px-5 py-2 text-sm font-bold text-[#0b1120]"
                    >
                      Try Again
                    </button>
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="flex flex-col items-center rounded-xl border border-[#1e3350]/40 bg-[#0f1a2d] px-6 py-12 text-center">
                    <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#15243a]">
                      <CategoryIcon
                        size={28}
                        style={{ color: categoryVisual.color }}
                        aria-hidden="true"
                      />
                    </span>
                    <p className="text-base font-semibold text-white">
                      No {displayName.toLowerCase()} events available
                    </p>
                    <p className="mt-1.5 text-sm text-[#637fa0]">
                      Events for this category haven&apos;t been configured yet.
                      Check back soon or explore other sports.
                    </p>
                    <Link
                      to="/user"
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#ffd500] to-[#ffaa00] px-5 py-2.5 text-sm font-bold text-[#0b1120] transition hover:shadow-[0_4px_16px_rgba(255,213,0,0.3)]"
                    >
                      Browse All Sports
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {Object.entries(groupedEvents).map(
                      ([leagueName, leagueEvents]) => (
                        <section
                          key={leagueName}
                          className="overflow-hidden rounded-xl border border-[#1e3350]/40 bg-[#0c1625] sm:rounded-2xl"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-[#1e3350]/30 bg-gradient-to-r from-[#101d30] to-[#0f1a2d] px-2.5 py-2 sm:px-3.5 sm:py-2.5">
                            <div className="flex min-w-0 items-center gap-1.5">
                              {(() => {
                                const leagueVisual =
                                  getLeagueVisual(leagueName);
                                const LeagueIcon = leagueVisual.icon;
                                return (
                                  <span
                                    className="grid h-5 w-5 place-items-center rounded-md bg-[#15243a]"
                                    aria-hidden="true"
                                  >
                                    <LeagueIcon
                                      size={12}
                                      style={{ color: leagueVisual.color }}
                                    />
                                  </span>
                                );
                              })()}
                              <h3 className="truncate text-[8px] font-bold uppercase tracking-[0.16em] text-[#7a94b8] sm:text-[10px]">
                                {leagueName}
                              </h3>
                              <span className="shrink-0 rounded-md bg-[#ffd500]/[0.06] px-1.5 py-[1px] text-[8px] font-bold tabular-nums text-[#546e8f] sm:text-[9px]">
                                {leagueEvents.length}
                              </span>
                            </div>
                            {leagueEvents[0] ? (
                              <p className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#4a6a8f] sm:text-[9px]">
                                {formatKickoffTime(
                                  leagueEvents[0].commenceTime,
                                )}
                              </p>
                            ) : null}
                          </div>
                          <div className="grid gap-1.5 p-1.5 sm:grid-cols-2 sm:gap-3 sm:p-3">
                            <Suspense
                              fallback={
                                <div className="col-span-full rounded-xl border border-[#1e3350]/30 bg-[#111d2e]/40 p-4 text-xs text-[#7a94b8]">
                                  Loading events...
                                </div>
                              }
                            >
                              {leagueEvents.map((event) => (
                                <EventCard
                                  key={event.eventId}
                                  event={event}
                                  onOddsSelect={betSlip.addSelection}
                                  selectedOdds={selectedOdds}
                                />
                              ))}
                            </Suspense>
                          </div>
                        </section>
                      ),
                    )}
                  </div>
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
