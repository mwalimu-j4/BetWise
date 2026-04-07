import { useEffect, useMemo, useState } from "react";
import { Edit, Eye, Plus, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/axiosConfig";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
} from "../../components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

interface ApiEvent {
  id: string;
  eventId: string;
  leagueName: string | null;
  sportKey: string | null;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
  homeScore: number | null;
  awayScore: number | null;
  isActive: boolean;
  houseMargin: number;
  marketsEnabled: string[];
  _count: { odds: number; bets: number };
}

interface EventDetail extends ApiEvent {
  displayedOdds?: Array<{
    bookmakerId: string;
    bookmakerName: string;
    odds: Array<{
      id: string;
      bookmakerId: string;
      bookmakerName: string;
      marketType: string;
      side: string;
      rawOdds: number;
      displayOdds: number;
      isVisible: boolean;
      updatedAt: string;
    }>;
  }>;
}

interface EventStats {
  liveCount: number;
  upcomingCount: number;
  activeCount: number;
  configuredCount: number;
  noOddsCount: number;
  finishedToday: number;
}

interface LeagueResponse {
  sports: Array<{
    sportKey: string;
    leagues: string[];
  }>;
}

type FilterValue =
  | ""
  | "LIVE"
  | "UPCOMING"
  | "ACTIVE"
  | "CONFIGURED"
  | "NO_ODDS"
  | "FINISHED"
  | "CANCELLED";

type BulkFilter = "league" | "sport" | "selected";

const marketOptions = ["h2h", "spreads", "totals"] as const;

function toBadgeStatus(status: ApiEvent["status"]) {
  switch (status) {
    case "LIVE":
      return "live";
    case "UPCOMING":
      return "upcoming";
    case "FINISHED":
      return "completed";
    case "CANCELLED":
      return "failed";
  }
}

function formatSportLabel(sportKey: string) {
  const lower = sportKey.toLowerCase();
  if (lower.includes("soccer") || lower.includes("football"))
    return "⚽ Football";
  if (lower.includes("basketball")) return "🏀 Basketball";
  if (lower.includes("tennis")) return "🎾 Tennis";
  if (lower.includes("nfl") || lower.includes("americanfootball"))
    return "🏈 American Football";
  return `🏟️ ${sportKey}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    const message = response?.data?.message;
    if (message) {
      return message;
    }
  }

  return fallback;
}

export default function Events() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterValue>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [leagueOptions, setLeagueOptions] = useState<LeagueResponse["sports"]>(
    [],
  );
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [configEvent, setConfigEvent] = useState<ApiEvent | null>(null);
  const [houseMargin, setHouseMargin] = useState("0");
  const [marketsEnabled, setMarketsEnabled] = useState<string[]>(["h2h"]);
  const [closeReason, setCloseReason] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [bulkFilter, setBulkFilter] = useState<BulkFilter>("league");
  const [bulkHouseMargin, setBulkHouseMargin] = useState("5");
  const [bulkMarkets, setBulkMarkets] = useState<string[]>(["h2h"]);
  const [bulkApplying, setBulkApplying] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const hasSelection = selectedEventIds.length > 0;
  const allVisibleSelected =
    events.length > 0 &&
    events.every((event) => selectedEventIds.includes(event.eventId));

  const selectedLeagueSportKey = useMemo(() => {
    for (const sport of leagueOptions) {
      if (sport.leagues.includes(selectedLeague)) {
        return sport.sportKey;
      }
    }
    return "";
  }, [leagueOptions, selectedLeague]);

  const filterOptions = useMemo(
    () => [
      {
        label: "All",
        value: "" as FilterValue,
        count: (stats?.liveCount ?? 0) + (stats?.upcomingCount ?? 0),
      },
      {
        label: "Live",
        value: "LIVE" as FilterValue,
        count: stats?.liveCount ?? 0,
      },
      {
        label: "Upcoming",
        value: "UPCOMING" as FilterValue,
        count: stats?.upcomingCount ?? 0,
      },
      {
        label: "Active",
        value: "ACTIVE" as FilterValue,
        count: stats?.activeCount ?? 0,
      },
      {
        label: "Configured",
        value: "CONFIGURED" as FilterValue,
        count: stats?.configuredCount ?? 0,
      },
      {
        label: "No Odds",
        value: "NO_ODDS" as FilterValue,
        count: stats?.noOddsCount ?? 0,
      },
      {
        label: "Finished",
        value: "FINISHED" as FilterValue,
        count: stats?.finishedToday ?? 0,
      },
      { label: "Cancelled", value: "CANCELLED" as FilterValue, count: 0 },
    ],
    [stats],
  );

  function formatUpcomingCountdown(commenceTime: string, nowMs: number) {
    const diffMs = new Date(commenceTime).getTime() - nowMs;
    if (diffMs <= 0) {
      return "in 0m";
    }

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    return `in ${days}d ${hours}h ${minutes}m`;
  }

  async function loadLeagues() {
    try {
      const response = await api.get<LeagueResponse>("/admin/events/leagues");
      setLeagueOptions(response.data.sports);
    } catch (requestError) {
      console.error(requestError);
    }
  }

  async function loadEvents(options?: { background?: boolean }) {
    if (options?.background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const params: Record<string, string | number | boolean> = {
        page,
        limit: 20,
      };

      if (
        activeFilter === "LIVE" ||
        activeFilter === "UPCOMING" ||
        activeFilter === "FINISHED" ||
        activeFilter === "CANCELLED"
      ) {
        params.status = activeFilter;
      }

      if (activeFilter === "ACTIVE") {
        params.isActive = true;
      }

      if (activeFilter === "CONFIGURED") {
        params.isActive = true;
        params.hasMargin = true;
      }

      if (activeFilter === "NO_ODDS") {
        params.isActive = true;
        params.hasOdds = false;
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (selectedLeague) {
        params.leagueName = selectedLeague;
      }

      const response = await api.get<{
        events: ApiEvent[];
        total: number;
        page: number;
        totalPages: number;
      }>("/admin/events", { params });

      setEvents(response.data.events);
      setTotal(response.data.total);
      setSelectedEventIds((currentIds) =>
        currentIds.filter((eventId) =>
          response.data.events.some((event) => event.eventId === eventId),
        ),
      );
    } catch (requestError) {
      console.error(requestError);
      const message = getErrorMessage(
        requestError,
        "Unable to load events right now.",
      );
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);

    try {
      const response = await api.get<EventStats>("/admin/events/stats");
      setStats(response.data);
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load event stats.");
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    void loadEvents();
  }, [activeFilter, page, debouncedSearch, selectedLeague]);

  useEffect(() => {
    void Promise.all([loadStats(), loadLeagues()]);
  }, []);

  useEffect(() => {
    const statsInterval = window.setInterval(() => {
      void loadStats();
    }, 60000);

    const eventsInterval = window.setInterval(() => {
      void loadEvents({ background: true });
    }, 120000);

    const countdownInterval = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(statsInterval);
      window.clearInterval(eventsInterval);
      window.clearInterval(countdownInterval);
    };
  }, [activeFilter, page, debouncedSearch, selectedLeague]);

  async function loadEventDetail(eventId: string) {
    setDetailLoading(true);

    try {
      const response = await api.get<EventDetail>(`/admin/events/${eventId}`);
      setEventDetail(response.data);
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load event details.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleToggle(event: ApiEvent, nextIsActive?: boolean) {
    const previous = event.isActive;
    const targetIsActive = nextIsActive ?? !previous;

    setEvents((currentEvents) =>
      currentEvents.map((currentEvent) =>
        currentEvent.eventId === event.eventId
          ? { ...currentEvent, isActive: targetIsActive }
          : currentEvent,
      ),
    );

    try {
      const response = await api.patch<Pick<ApiEvent, "eventId" | "isActive">>(
        `/admin/events/${event.eventId}/toggle`,
      );

      setEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.eventId === event.eventId
            ? { ...currentEvent, isActive: response.data.isActive }
            : currentEvent,
        ),
      );
      await loadStats();
      toast.success(
        response.data.isActive
          ? "Event activated successfully"
          : "Event deactivated successfully",
      );
    } catch (requestError) {
      console.error(requestError);
      setEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.eventId === event.eventId
            ? { ...currentEvent, isActive: previous }
            : currentEvent,
        ),
      );
      const message = getErrorMessage(
        requestError,
        "Unable to update event status.",
      );
      setError(message);
      toast.error(message);
    }
  }

  async function handleBulkToggle(nextIsActive: boolean) {
    if (!hasSelection) {
      return;
    }

    try {
      await api.patch("/admin/events/bulk-toggle", {
        eventIds: selectedEventIds,
        isActive: nextIsActive,
      });

      setSelectedEventIds([]);
      await Promise.all([loadEvents({ background: true }), loadStats()]);
      toast.success(
        nextIsActive
          ? "Selected events activated"
          : "Selected events deactivated",
      );
    } catch (requestError) {
      console.error(requestError);
      const message = getErrorMessage(
        requestError,
        "Unable to update selected events.",
      );
      setError(message);
      toast.error(message);
    }
  }

  async function handleBulkMargin(nextHouseMargin: number) {
    if (!hasSelection) {
      return;
    }

    try {
      await api.patch("/admin/events/bulk-config", {
        eventIds: selectedEventIds,
        houseMargin: nextHouseMargin,
      });

      setSelectedEventIds([]);
      await Promise.all([loadEvents({ background: true }), loadStats()]);
      toast.success(`Set ${nextHouseMargin}% margin for selected events`);
    } catch (requestError) {
      console.error(requestError);
      const message = getErrorMessage(
        requestError,
        "Unable to update selected event margin.",
      );
      setError(message);
      toast.error(message);
    }
  }

  async function handleApplyBulkMargin() {
    const marginValue = Number(bulkHouseMargin);
    if (!Number.isFinite(marginValue) || marginValue < 0) {
      toast.error("Enter a valid house margin.");
      return;
    }

    const body: {
      filter: BulkFilter;
      leagueName?: string;
      sportKey?: string;
      eventIds?: string[];
      houseMargin: number;
      marketsEnabled?: string[];
    } = {
      filter: bulkFilter,
      houseMargin: marginValue,
      marketsEnabled: bulkMarkets,
    };

    if (bulkFilter === "league") {
      if (!selectedLeague) {
        toast.error("Select a league first for Current League bulk apply.");
        return;
      }
      body.leagueName = selectedLeague;
    }

    if (bulkFilter === "sport") {
      const sportKey =
        selectedLeagueSportKey ||
        events.find((event) => event.sportKey)?.sportKey ||
        "";
      if (!sportKey) {
        toast.error("No active sport filter found for Current Sport apply.");
        return;
      }
      body.sportKey = sportKey;
    }

    if (bulkFilter === "selected") {
      if (!selectedEventIds.length) {
        toast.error("Select at least one game.");
        return;
      }
      body.eventIds = selectedEventIds;
    }

    setBulkApplying(true);

    try {
      const response = await api.patch<{ updated: number; message: string }>(
        "/admin/events/bulk-margin",
        body,
      );

      toast.success(`✓ ${response.data.message}`);
      setBulkPanelOpen(false);
      setSelectedEventIds([]);
      await Promise.all([loadEvents({ background: true }), loadStats()]);
    } catch (requestError) {
      console.error(requestError);
      const message = getErrorMessage(
        requestError,
        "Unable to apply bulk margin.",
      );
      setError(message);
      toast.error(message);
    } finally {
      setBulkApplying(false);
    }
  }

  function toggleSelection(eventId: string, checked: boolean) {
    setSelectedEventIds((currentIds) => {
      if (checked) {
        return currentIds.includes(eventId)
          ? currentIds
          : [...currentIds, eventId];
      }

      return currentIds.filter((id) => id !== eventId);
    });
  }

  function toggleSelectAllVisible(checked: boolean) {
    if (!checked) {
      setSelectedEventIds((currentIds) =>
        currentIds.filter(
          (currentId) => !events.some((event) => event.eventId === currentId),
        ),
      );
      return;
    }

    setSelectedEventIds((currentIds) => {
      const merged = new Set([
        ...currentIds,
        ...events.map((event) => event.eventId),
      ]);
      return Array.from(merged);
    });
  }

  async function handleSaveConfig() {
    if (!configEvent) {
      return;
    }

    try {
      const response = await api.patch<ApiEvent>(
        `/admin/events/${configEvent.eventId}/config`,
        {
          houseMargin: Number(houseMargin) || 0,
          marketsEnabled,
        },
      );

      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.eventId === configEvent.eventId ? response.data : event,
        ),
      );
      setConfigEvent(response.data);
      toast.success("Event configuration saved");
      await loadStats();
    } catch (requestError) {
      console.error(requestError);
      const message = getErrorMessage(
        requestError,
        "Unable to save event configuration.",
      );
      setError(message);
      toast.error(message);
    }
  }

  const skeletonCards = useMemo(
    () =>
      Array.from({ length: 3 }, (_, index) => (
        <AdminCard
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          key={`event-skeleton-${index}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-2 w-2 shrink-0 rounded-full bg-admin-surface animate-pulse" />
            <div className="w-full space-y-2">
              <div className="h-3 w-48 rounded bg-admin-surface animate-pulse" />
              <div className="h-5 w-64 rounded bg-admin-surface animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:min-w-[276px]">
            {Array.from({ length: 3 }, (_, metricIndex) => (
              <div className="space-y-2 text-center" key={metricIndex}>
                <div className="mx-auto h-6 w-12 rounded bg-admin-surface animate-pulse" />
                <div className="mx-auto h-3 w-14 rounded bg-admin-surface animate-pulse" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 3 }, (_, actionIndex) => (
              <div
                className="h-8 w-8 rounded-xl bg-admin-surface animate-pulse"
                key={actionIndex}
              />
            ))}
          </div>
        </AdminCard>
      )),
    [],
  );

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Events & Sports"
        subtitle="Manage live and upcoming events"
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <AdminButton
              variant={bulkPanelOpen ? "solid" : "ghost"}
              onClick={() => setBulkPanelOpen((open) => !open)}
              size="sm"
            >
              ⚡ Bulk Configure
            </AdminButton>
            <Dialog>
              <DialogTrigger asChild>
                <AdminButton size="sm">
                  <Plus size={13} />
                  Add Event
                </AdminButton>
              </DialogTrigger>
              <DialogContent className="border-admin-border bg-admin-card">
                <DialogHeader>
                  <DialogTitle>Add New Event</DialogTitle>
                  <DialogDescription>
                    Live fixtures are synced from the provider feed.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-admin-text-primary">
                      Search Events
                    </label>
                    <Input
                      placeholder="Search by team or league"
                      value={searchQuery}
                      onChange={(event) => {
                        setPage(1);
                        setSearchQuery(event.target.value);
                      }}
                      className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]"
                      onClick={() => void loadEvents({ background: true })}
                    >
                      Refresh Feed
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Live",
            value: (stats?.liveCount ?? 0).toString(),
            tone: "red" as const,
          },
          {
            label: "Upcoming",
            value: (stats?.upcomingCount ?? 0).toString(),
            tone: "blue" as const,
          },
          {
            label: "Active",
            value: (stats?.activeCount ?? 0).toString(),
            tone: "accent" as const,
          },
          {
            label: "Configured",
            value: (stats?.configuredCount ?? 0).toString(),
            tone: "gold" as const,
          },
          {
            label: "No Odds",
            value: (stats?.noOddsCount ?? 0).toString(),
            tone: "gold" as const,
          },
          {
            label: "Finished",
            value: (stats?.finishedToday ?? 0).toString(),
            tone: "blue" as const,
          },
        ].map((metric) => {
          const colorMap: Record<
            string,
            { bg: string; text: string; icon: string; border: string }
          > = {
            accent: {
              bg: "bg-admin-accent/5",
              text: "text-admin-accent",
              icon: "bg-admin-accent/15 text-admin-accent",
              border: "border-admin-accent/20",
            },
            blue: {
              bg: "bg-admin-blue/5",
              text: "text-admin-blue",
              icon: "bg-admin-blue/15 text-admin-blue",
              border: "border-admin-blue/20",
            },
            gold: {
              bg: "bg-admin-gold/5",
              text: "text-admin-gold",
              icon: "bg-admin-gold/15 text-admin-gold",
              border: "border-admin-gold/20",
            },
            red: {
              bg: "bg-red-500/5",
              text: "text-red-500",
              icon: "bg-red-500/15 text-red-500",
              border: "border-red-500/20",
            },
          };

          const colors = colorMap[metric.tone] || colorMap.accent;

          return (
            <AdminCard
              key={metric.label}
              className={`border ${colors.border} p-2.5 transition hover:border-opacity-50 sm:p-3`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted sm:text-[9px]">
                    {metric.label}
                  </p>
                  <div className={`rounded p-1 shrink-0 ${colors.icon}`}>
                    <div className="h-3 w-3" />
                  </div>
                </div>
                <p className={`text-base font-bold sm:text-lg ${colors.text}`}>
                  {statsLoading ? "—" : metric.value}
                </p>
              </div>
            </AdminCard>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          {filterOptions.map((filter) => (
            <AdminButton
              key={filter.label}
              variant={activeFilter === filter.value ? "solid" : "ghost"}
              size="sm"
              className="shrink-0"
              onClick={() => {
                setPage(1);
                setActiveFilter(filter.value);
              }}
            >
              {filter.label}
              <span className="ml-1 rounded-full bg-admin-surface px-2 py-[2px] text-[10px] font-semibold text-admin-text-muted">
                {statsLoading ? "..." : filter.count}
              </span>
            </AdminButton>
          ))}
        </div>
        <Input
          placeholder="Search teams or league..."
          value={searchQuery}
          onChange={(event) => {
            setPage(1);
            setSearchQuery(event.target.value);
          }}
          className="h-9 border-admin-border bg-admin-surface text-admin-text-primary"
        />

        <div className="grid gap-2 sm:grid-cols-[minmax(220px,320px)_1fr] sm:items-center">
          <select
            className="h-9 w-full rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text-primary"
            value={selectedLeague}
            onChange={(event) => {
              setPage(1);
              setSelectedLeague(event.target.value);
            }}
          >
            <option value="">All Leagues</option>
            {leagueOptions.map((sport) => (
              <optgroup
                key={sport.sportKey}
                label={formatSportLabel(sport.sportKey)}
              >
                {sport.leagues.map((league) => (
                  <option key={`${sport.sportKey}-${league}`} value={league}>
                    {league}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="text-xs text-admin-text-muted sm:text-right">
            {refreshing ? "Refreshing events..." : ""}
          </div>
        </div>
      </div>

      {bulkPanelOpen ? (
        <AdminCard className="space-y-4">
          <p className="text-sm font-semibold tracking-[0.08em] text-admin-gold uppercase">
            Bulk Configure
          </p>
          <div className="space-y-2 text-sm text-admin-text-primary">
            <p>Apply to:</p>
            <label className="flex items-center gap-2">
              <input
                checked={bulkFilter === "league"}
                type="radio"
                onChange={() => setBulkFilter("league")}
              />
              Current League
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={bulkFilter === "sport"}
                type="radio"
                onChange={() => setBulkFilter("sport")}
              />
              Current Sport
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={bulkFilter === "selected"}
                type="radio"
                onChange={() => setBulkFilter("selected")}
              />
              Selected Games ({selectedEventIds.length})
            </label>
          </div>
          <div>
            <label className="text-sm font-semibold text-admin-text-primary">
              House Margin
            </label>
            <Input
              value={bulkHouseMargin}
              onChange={(event) => setBulkHouseMargin(event.target.value)}
              className="mt-2 max-w-[180px] border-admin-border bg-admin-surface text-admin-text-primary"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-admin-text-primary">
              Markets
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {marketOptions.map((market) => {
                const checked = bulkMarkets.includes(market);
                return (
                  <button
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                      checked
                        ? "border-admin-accent bg-admin-accent-dim text-admin-accent"
                        : "border-admin-border bg-admin-surface text-admin-text-muted"
                    }`}
                    key={market}
                    onClick={() =>
                      setBulkMarkets((currentMarkets) =>
                        checked
                          ? currentMarkets.filter(
                              (currentMarket) => currentMarket !== market,
                            )
                          : [...currentMarkets, market],
                      )
                    }
                    type="button"
                  >
                    {checked ? "✓" : "✗"} {market}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <AdminButton
              onClick={() => void handleApplyBulkMargin()}
              disabled={bulkApplying || bulkMarkets.length === 0}
            >
              {bulkApplying ? (
                <>
                  <Loader2 className="animate-spin" size={13} />
                  Applying...
                </>
              ) : (
                "Apply & Activate All"
              )}
            </AdminButton>
          </div>
        </AdminCard>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {[
          {
            label: "Live",
            value: stats?.liveCount ?? 0,
            tone: "text-admin-live",
          },
          {
            label: "Upcoming",
            value: stats?.upcomingCount ?? 0,
            tone: "text-admin-blue",
          },
          {
            label: "Active",
            value: stats?.activeCount ?? 0,
            tone: "text-admin-accent",
          },
          {
            label: "Configured",
            value: stats?.configuredCount ?? 0,
            tone: "text-admin-gold",
          },
        ].map((metric) => (
          <AdminCard className="p-3 sm:p-4" key={metric.label}>
            <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
              {metric.label}
            </p>
            <p
              className={`mt-1.5 text-xl font-bold sm:text-2xl ${metric.tone}`}
            >
              {statsLoading ? "..." : metric.value}
            </p>
          </AdminCard>
        ))}
      </div>

      {hasSelection ? (
        <AdminCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-admin-text-primary">
            {selectedEventIds.length} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <AdminButton size="sm" onClick={() => void handleBulkToggle(true)}>
              Activate All
            </AdminButton>
            <AdminButton
              size="sm"
              variant="ghost"
              onClick={() => void handleBulkMargin(5)}
            >
              Set 5% Margin
            </AdminButton>
            <AdminButton
              size="sm"
              tone="red"
              variant="ghost"
              onClick={() => void handleBulkToggle(false)}
            >
              Deactivate All
            </AdminButton>
          </div>
        </AdminCard>
      ) : null}

      {error ? (
        <AdminCard>
          <p className="text-sm text-admin-red">{error}</p>
        </AdminCard>
      ) : null}

      {!loading && events.length > 0 ? (
        <div className="flex items-center gap-2">
          <input
            checked={allVisibleSelected}
            className="h-4 w-4 rounded border-admin-border bg-admin-surface"
            onChange={(event) => toggleSelectAllVisible(event.target.checked)}
            type="checkbox"
          />
          <p className="text-xs text-admin-text-muted">
            Select all on current page
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {loading && events.length === 0 ? skeletonCards : null}

        {!loading && events.length === 0 ? (
          <AdminCard>
            <p className="text-sm text-admin-text-muted">No events found.</p>
          </AdminCard>
        ) : null}

        {events.map((event) => (
          <AdminCard
            className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
            key={event.eventId}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <input
                checked={selectedEventIds.includes(event.eventId)}
                className="h-4 w-4 rounded border-admin-border bg-admin-surface"
                onChange={(checkboxEvent) =>
                  toggleSelection(event.eventId, checkboxEvent.target.checked)
                }
                type="checkbox"
              />
              {event.status === "LIVE" ? (
                <span className="animate-admin-pulse h-2 w-2 shrink-0 rounded-full bg-admin-live shadow-[0_0_6px_var(--admin-live)]" />
              ) : null}
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={toBadgeStatus(event.status)} />
                  {event.status === "UPCOMING" ? (
                    <span className="rounded-lg bg-admin-blue-dim px-2 py-1 text-[11px] font-semibold text-admin-blue">
                      {formatUpcomingCountdown(
                        event.commenceTime,
                        currentTimeMs,
                      )}
                    </span>
                  ) : null}
                  {event._count.odds > 0 ? (
                    <span className="rounded-lg bg-admin-accent-dim px-2 py-1 text-[11px] font-semibold text-admin-accent">
                      ✓ {event._count.odds} odds
                    </span>
                  ) : (
                    <span className="rounded-lg bg-admin-red-dim px-2 py-1 text-[11px] font-semibold text-admin-red">
                      ✗ No odds
                    </span>
                  )}
                  <span className="max-w-[150px] truncate text-[11px] text-admin-text-muted sm:max-w-none">
                    {event.leagueName ?? "Unknown league"}
                  </span>
                  <span className="hidden text-[11px] text-admin-text-muted sm:inline">
                    -
                  </span>
                  <span className="text-[11px] text-admin-text-muted">
                    {new Date(event.commenceTime).toLocaleString()}
                  </span>
                </div>
                <p className="text-base font-semibold text-admin-text-primary">
                  {event.homeTeam}{" "}
                  <span className="text-admin-text-muted">vs</span>{" "}
                  {event.awayTeam}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-admin-text-muted">
                  <span>Margin: {event.houseMargin}%</span>
                  <span className="hidden sm:inline">
                    Markets: {event.marketsEnabled.join(", ")}
                  </span>
                  <span className="sm:hidden">
                    Markets: {event.marketsEnabled.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-admin-border/60 bg-admin-surface/35 p-2 text-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 lg:min-w-[276px]">
              <div>
                <p className="text-lg font-bold text-admin-blue sm:text-xl">
                  {event._count.odds}
                </p>
                <p className="text-[11px] text-admin-text-muted">Markets</p>
              </div>
              <div>
                <p className="text-lg font-bold text-admin-gold sm:text-xl">
                  {event._count.bets.toLocaleString()}
                </p>
                <p className="text-[11px] text-admin-text-muted">Bets</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-2">
                <Switch
                  checked={event.isActive}
                  onCheckedChange={() => void handleToggle(event)}
                />
                <p className="text-[11px] text-admin-text-muted">
                  {event.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-1 lg:w-auto">
              <Dialog>
                <DialogTrigger asChild>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedEvent(event);
                      setEventDetail(null);
                      void loadEventDetail(event.eventId);
                    }}
                  >
                    <Eye size={13} />
                  </AdminButton>
                </DialogTrigger>
                <DialogContent className="border-admin-border bg-admin-card">
                  <DialogHeader>
                    <DialogTitle>Event Details</DialogTitle>
                    <DialogDescription>
                      View event information and markets
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[400px] w-full pr-4">
                    {detailLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 6 }, (_, index) => (
                          <div key={index}>
                            <div className="h-3 w-20 rounded bg-admin-surface animate-pulse" />
                            <div className="mt-2 h-4 w-40 rounded bg-admin-surface animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ) : eventDetail ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            EVENT ID
                          </p>
                          <p className="text-sm font-semibold">
                            {eventDetail.eventId}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">MATCH</p>
                          <p className="text-sm font-semibold text-admin-text-primary">
                            {eventDetail.homeTeam} vs {eventDetail.awayTeam}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            LEAGUE
                          </p>
                          <p className="text-sm text-admin-text-primary">
                            {eventDetail.leagueName ?? "Unknown league"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">DATE</p>
                          <p className="text-sm text-admin-text-primary">
                            {new Date(
                              eventDetail.commenceTime,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            STATUS
                          </p>
                          <StatusBadge
                            status={toBadgeStatus(eventDetail.status)}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            MARKETS
                          </p>
                          <p className="text-sm font-semibold text-admin-blue">
                            {eventDetail.marketsEnabled.join(", ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            TOTAL BETS
                          </p>
                          <p className="text-sm font-semibold text-admin-gold">
                            {eventDetail._count.bets.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            DISPLAYED ODDS
                          </p>
                          <div className="mt-2 space-y-3">
                            {(eventDetail.displayedOdds ?? []).map(
                              (bookmaker) => (
                                <div
                                  className="rounded-xl border border-admin-border p-3"
                                  key={bookmaker.bookmakerId}
                                >
                                  <p className="text-sm font-semibold text-admin-text-primary">
                                    {bookmaker.bookmakerName}
                                  </p>
                                  <div className="mt-2 space-y-1 text-xs text-admin-text-muted">
                                    {bookmaker.odds.map((odd) => (
                                      <p key={odd.id}>
                                        {odd.marketType} | {odd.side} |{" "}
                                        {odd.displayOdds}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-admin-text-muted">
                        {selectedEvent
                          ? "No details available."
                          : "Select an event."}
                      </p>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setConfigEvent(event);
                      setHouseMargin(String(event.houseMargin));
                      setMarketsEnabled(event.marketsEnabled);
                    }}
                  >
                    <Edit size={13} />
                  </AdminButton>
                </DialogTrigger>
                <DialogContent className="border-admin-border bg-admin-card">
                  <DialogHeader>
                    <DialogTitle>Edit Event</DialogTitle>
                    <DialogDescription>
                      Update event details and odds
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-admin-text-primary">
                        Match
                      </label>
                      <p className="mt-1 text-sm text-admin-text-muted">
                        {configEvent?.homeTeam} vs {configEvent?.awayTeam}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-admin-text-primary">
                        House Margin %
                      </label>
                      <Input
                        value={houseMargin}
                        onChange={(event) => setHouseMargin(event.target.value)}
                        className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-admin-text-primary">
                        Markets Enabled
                      </label>
                      <div className="mt-2 space-y-2">
                        {marketOptions.map((market) => (
                          <label
                            className="flex items-center gap-2 text-sm text-admin-text-primary"
                            key={market}
                          >
                            <input
                              checked={marketsEnabled.includes(market)}
                              onChange={(event) => {
                                setMarketsEnabled((currentMarkets) =>
                                  event.target.checked
                                    ? [...currentMarkets, market]
                                    : currentMarkets.filter(
                                        (currentMarket) =>
                                          currentMarket !== market,
                                      ),
                                );
                              }}
                              type="checkbox"
                            />
                            {market}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1">
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]"
                        onClick={() => void handleSaveConfig()}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <AdminButton size="sm" variant="ghost">
                    <XCircle size={13} />
                  </AdminButton>
                </DialogTrigger>
                <DialogContent className="border-admin-border bg-admin-card">
                  <DialogHeader>
                    <DialogTitle>Close Event</DialogTitle>
                    <DialogDescription>
                      This will close all markets and deactivate the event
                    </DialogDescription>
                  </DialogHeader>
                  <div>
                    <label className="text-sm font-semibold text-admin-text-primary">
                      Reason
                    </label>
                    <Input
                      placeholder="E.g., Event postponed, Match cancelled"
                      value={closeReason}
                      onChange={(dialogEvent) =>
                        setCloseReason(dialogEvent.target.value)
                      }
                      className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCloseReason("")}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-admin-red hover:bg-red-600 text-white"
                      onClick={() => void handleToggle(event, false)}
                    >
                      Close Event
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </AdminCard>
        ))}
      </div>

      {total > 20 ? (
        <div className="flex items-center justify-between gap-3">
          <AdminButton
            variant="ghost"
            disabled={page <= 1}
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
          >
            Previous
          </AdminButton>
          <p className="text-sm text-admin-text-muted">
            Page {page} of {totalPages}
          </p>
          <AdminButton
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((currentPage) => currentPage + 1)}
          >
            Next
          </AdminButton>
        </div>
      ) : null}
    </div>
  );
}
