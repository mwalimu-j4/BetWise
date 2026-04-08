import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MoreHorizontal,
  PencilLine,
  Power,
  RefreshCw,
  Search,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/axiosConfig";
import { cn } from "@/lib/utils";
import {
  AdminStatCard,
  AdminSectionHeader,
  StatusBadge,
  adminInputClassName,
  adminSelectContentClassName,
  adminSelectTriggerClassName,
} from "../../components/ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
const allLeaguesValue = "all";

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

  if (lower.includes("soccer") || lower.includes("football")) {
    return "Football";
  }

  if (lower.includes("basketball")) {
    return "Basketball";
  }

  if (lower.includes("tennis")) {
    return "Tennis";
  }

  if (lower.includes("nfl") || lower.includes("americanfootball")) {
    return "American Football";
  }

  return sportKey;
}

function formatEventTime(commenceTime: string) {
  return new Date(commenceTime).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatUpdatedTime(timestamp: string) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatUpcomingCountdown(commenceTime: string, nowMs: number) {
  const diffMs = new Date(commenceTime).getTime() - nowMs;

  if (diffMs <= 0) {
    return "Starting now";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `Starts in ${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `Starts in ${hours}h ${minutes}m`;
  }

  return `Starts in ${minutes}m`;
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

function toggleMarket(currentMarkets: string[], market: string) {
  return currentMarkets.includes(market)
    ? currentMarkets.filter((currentMarket) => currentMarket !== market)
    : [...currentMarkets, market];
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-admin-border/70 bg-admin-surface/25 p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-admin-text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-admin-text-primary">
        {value}
      </p>
    </div>
  );
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
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkFilter, setBulkFilter] = useState<BulkFilter>("league");
  const [bulkHouseMargin, setBulkHouseMargin] = useState("5");
  const [bulkMarkets, setBulkMarkets] = useState<string[]>(["h2h"]);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configEvent, setConfigEvent] = useState<ApiEvent | null>(null);
  const [houseMargin, setHouseMargin] = useState("0");
  const [marketsEnabled, setMarketsEnabled] = useState<string[]>(["h2h"]);
  const [actionEvent, setActionEvent] = useState<ApiEvent | null>(null);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);

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
        label: "No odds",
        value: "NO_ODDS" as FilterValue,
        count: stats?.noOddsCount ?? 0,
      },
      {
        label: "Finished",
        value: "FINISHED" as FilterValue,
        count: stats?.finishedToday ?? 0,
      },
      {
        label: "Cancelled",
        value: "CANCELLED" as FilterValue,
        count: 0,
      },
    ],
    [stats],
  );

  const summaryCards = useMemo(
    () => [
      {
        label: "Live",
        value: stats?.liveCount ?? 0,
        tone: "live" as const,
      },
      {
        label: "Upcoming",
        value: stats?.upcomingCount ?? 0,
        tone: "blue" as const,
      },
      {
        label: "Active",
        value: stats?.activeCount ?? 0,
        tone: "accent" as const,
      },
      {
        label: "Configured",
        value: stats?.configuredCount ?? 0,
        tone: "gold" as const,
      },
    ],
    [stats],
  );

  const skeletonCards = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => (
        <div
          className="rounded-xl border border-admin-border/70 bg-admin-surface/20 p-4"
          key={`event-skeleton-${index}`}
        >
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-admin-surface" />
              <div className="h-6 w-2/3 animate-pulse rounded bg-admin-surface" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-admin-surface" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, metricIndex) => (
                <div
                  className="h-16 animate-pulse rounded-xl bg-admin-surface"
                  key={metricIndex}
                />
              ))}
            </div>
          </div>
        </div>
      )),
    [],
  );

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

  async function handleRefresh() {
    await Promise.all([loadEvents({ background: true }), loadStats()]);
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

    if (bulkMarkets.length === 0) {
      toast.error("Select at least one market.");
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
        toast.error("Choose a league first to use the current league scope.");
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
        toast.error("No sport context is available for the current view.");
        return;
      }

      body.sportKey = sportKey;
    }

    if (bulkFilter === "selected") {
      if (!selectedEventIds.length) {
        toast.error("Select at least one event first.");
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

      toast.success(response.data.message);
      setBulkDialogOpen(false);
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

  async function handleSaveConfig() {
    if (!configEvent) {
      return;
    }

    const marginValue = Number(houseMargin);

    if (!Number.isFinite(marginValue) || marginValue < 0) {
      toast.error("Enter a valid house margin.");
      return;
    }

    if (marketsEnabled.length === 0) {
      toast.error("Select at least one market.");
      return;
    }

    try {
      const response = await api.patch<ApiEvent>(
        `/admin/events/${configEvent.eventId}/config`,
        {
          houseMargin: marginValue,
          marketsEnabled,
        },
      );

      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.eventId === configEvent.eventId ? response.data : event,
        ),
      );
      setConfigEvent(response.data);
      setConfigDialogOpen(false);
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

  function openDetailDialog(event: ApiEvent) {
    setSelectedEvent(event);
    setEventDetail(null);
    setDetailDialogOpen(true);
    void loadEventDetail(event.eventId);
  }

  function openConfigDialog(event: ApiEvent) {
    setConfigEvent(event);
    setHouseMargin(String(event.houseMargin));
    setMarketsEnabled(event.marketsEnabled);
    setConfigDialogOpen(true);
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

  return (
    <>
      <div className="space-y-5 sm:space-y-6">
        <AdminSectionHeader
          title="Events"
          subtitle="Review live and upcoming fixtures, manage markets, and make bulk updates without the extra clutter."
          actions={
            <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className="w-full border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface sm:w-auto"
              >
                {refreshing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Refresh feed
              </Button>

              <Button
                size="sm"
                onClick={() => setBulkDialogOpen(true)}
                className="w-full bg-admin-accent text-black hover:bg-admin-accent/90 sm:w-auto"
              >
                <Settings2 className="size-4" />
                Bulk update
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summaryCards.map((metric) => (
            <AdminStatCard
              key={metric.label}
              label={metric.label}
              value={(statsLoading ? 0 : metric.value).toLocaleString()}
              tone={metric.tone}
            />
          ))}
        </div>

        <Card className="border-admin-border bg-admin-card shadow-sm">
          <CardHeader className="gap-4 border-b border-admin-border/70 pb-4 sm:pb-5">
            <div>
              <CardTitle className="text-admin-text-primary">
                Find events faster
              </CardTitle>
              <CardDescription className="text-admin-text-muted">
                Filter by team, league, or event state and keep the list focused.
              </CardDescription>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-admin-text-muted" />
                <Input
                  placeholder="Search by team or league"
                  value={searchQuery}
                  onChange={(event) => {
                    setPage(1);
                    setSearchQuery(event.target.value);
                  }}
                  className={cn(
                    adminInputClassName,
                    "border-admin-border bg-admin-surface pl-9 text-admin-text-primary",
                  )}
                />
              </div>

              <Select
                value={selectedLeague || allLeaguesValue}
                onValueChange={(value) => {
                  setPage(1);
                  setSelectedLeague(value === allLeaguesValue ? "" : value);
                }}
              >
                <SelectTrigger
                  className={cn(
                    adminSelectTriggerClassName,
                    "w-full border-admin-border bg-admin-surface text-admin-text-primary",
                  )}
                >
                  <SelectValue placeholder="All leagues" />
                </SelectTrigger>
                <SelectContent className={adminSelectContentClassName}>
                  <SelectItem value={allLeaguesValue}>All leagues</SelectItem>
                  {leagueOptions.map((sport) => (
                    <SelectGroup key={sport.sportKey}>
                      <SelectLabel>
                        {formatSportLabel(sport.sportKey)}
                      </SelectLabel>
                      {sport.leagues.map((league) => (
                        <SelectItem
                          key={`${sport.sportKey}-${league}`}
                          value={league}
                        >
                          {league}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {filterOptions.map((filter) => {
                const isActive = activeFilter === filter.value;

                return (
                  <Button
                    key={filter.label}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setPage(1);
                      setActiveFilter(filter.value);
                    }}
                    className={cn(
                      "shrink-0 justify-between gap-2 rounded-full border-admin-border",
                      isActive
                        ? "bg-admin-accent text-black hover:bg-admin-accent/90"
                        : "bg-admin-surface/35 text-admin-text-secondary hover:bg-admin-surface hover:text-admin-text-primary",
                    )}
                  >
                    <span>{filter.label}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border-admin-border/60 px-2 text-[10px]",
                        isActive
                          ? "bg-black/10 text-black"
                          : "bg-admin-card text-admin-text-muted",
                      )}
                    >
                      {statsLoading ? "..." : filter.count}
                    </Badge>
                  </Button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 text-sm text-admin-text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <span>
                Showing {events.length.toLocaleString()} of{" "}
                {total.toLocaleString()} events
              </span>
              {refreshing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Refreshing latest events
                </span>
              ) : null}
            </div>
          </CardHeader>
        </Card>

        {hasSelection ? (
          <Card className="border-admin-accent/25 bg-admin-accent/5 shadow-sm">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-admin-text-primary">
                  {selectedEventIds.length} event
                  {selectedEventIds.length === 1 ? "" : "s"} selected
                </p>
                <p className="text-xs text-admin-text-muted">
                  Use quick actions for the current selection.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Button
                  size="sm"
                  onClick={() => void handleBulkToggle(true)}
                  className="w-full bg-admin-accent text-black hover:bg-admin-accent/90 sm:w-auto"
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleBulkMargin(5)}
                  className="w-full border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface sm:w-auto"
                >
                  Set 5% margin
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleBulkToggle(false)}
                  className="w-full border-admin-red/40 bg-admin-red/10 text-admin-red hover:bg-admin-red/15 hover:text-admin-red sm:w-auto"
                >
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedEventIds([])}
                  className="col-span-2 w-full text-admin-text-secondary hover:bg-admin-surface hover:text-admin-text-primary sm:col-auto sm:w-auto"
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Alert
            variant="destructive"
            className="border-admin-red/30 bg-admin-red/10 text-admin-red"
          >
            <AlertTitle>Unable to load part of the events workspace</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="border-admin-border bg-admin-card shadow-sm">
          <CardHeader className="flex flex-col gap-3 border-b border-admin-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between sm:pb-5">
            <div>
              <CardTitle className="text-admin-text-primary">
                Event list
              </CardTitle>
              <CardDescription className="text-admin-text-muted">
                Open details, adjust market settings, or quickly toggle event visibility.
              </CardDescription>
            </div>

            {!loading && events.length > 0 ? (
              <label className="inline-flex w-full items-center gap-2 text-sm text-admin-text-secondary sm:w-auto">
                <input
                  checked={allVisibleSelected}
                  className="size-4 rounded border-admin-border bg-admin-surface accent-[var(--admin-accent)]"
                  onChange={(event) =>
                    toggleSelectAllVisible(event.target.checked)
                  }
                  type="checkbox"
                />
                Select page
              </label>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-3 px-3 py-4 sm:px-6 sm:py-6">
            {loading && events.length === 0 ? skeletonCards : null}

            {!loading && events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-admin-border bg-admin-surface/10 p-6 text-center sm:p-8">
                <p className="text-sm font-medium text-admin-text-primary">
                  No events found
                </p>
                <p className="mt-1 text-sm text-admin-text-muted">
                  Try clearing a filter or refreshing the provider feed.
                </p>
              </div>
            ) : null}

            {events.map((event) => {
              const hasOdds = event._count.odds > 0;
              const hasScore =
                event.homeScore !== null && event.awayScore !== null;

              return (
                <div
                  className="rounded-2xl border border-admin-border/70 bg-admin-surface/15 p-3 transition-colors hover:border-admin-border-strong sm:p-4"
                  key={event.eventId}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 gap-3 sm:gap-4">
                      <input
                        checked={selectedEventIds.includes(event.eventId)}
                        className="mt-1 size-4 rounded border-admin-border bg-admin-surface accent-[var(--admin-accent)]"
                        onChange={(checkboxEvent) =>
                          toggleSelection(
                            event.eventId,
                            checkboxEvent.target.checked,
                          )
                        }
                        type="checkbox"
                      />

                      <div className="min-w-0 space-y-3">
                        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                          <StatusBadge status={toBadgeStatus(event.status)} />
                          {event.status === "UPCOMING" ? (
                            <Badge
                              variant="outline"
                              className="border-admin-blue/30 bg-admin-blue/10 text-admin-blue"
                            >
                              {formatUpcomingCountdown(
                                event.commenceTime,
                                currentTimeMs,
                              )}
                            </Badge>
                          ) : null}
                          <Badge
                            variant="outline"
                            className={cn(
                              hasOdds
                                ? "border-admin-accent/30 bg-admin-accent/10 text-admin-accent"
                                : "border-admin-red/30 bg-admin-red/10 text-admin-red",
                            )}
                          >
                            {hasOdds
                              ? `${event._count.odds} odds available`
                              : "No odds configured"}
                          </Badge>
                          {hasScore ? (
                            <Badge
                              variant="outline"
                              className="border-admin-border bg-admin-card text-admin-text-primary"
                            >
                              Score {event.homeScore} - {event.awayScore}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <p className="text-base font-semibold text-admin-text-primary sm:text-lg">
                            {event.homeTeam} vs {event.awayTeam}
                          </p>
                          <div className="flex flex-col items-start gap-1 text-sm text-admin-text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                            <span>{event.leagueName ?? "Unknown league"}</span>
                            <span>{formatEventTime(event.commenceTime)}</span>
                            {event.sportKey ? (
                              <span>{formatSportLabel(event.sportKey)}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                          <Badge
                            variant="outline"
                            className="shrink-0 border-admin-border bg-admin-card text-admin-text-primary"
                          >
                            Margin {event.houseMargin}%
                          </Badge>
                          <Badge
                            variant="outline"
                            className="shrink-0 border-admin-border bg-admin-card text-admin-text-primary"
                          >
                            Markets {event.marketsEnabled.join(", ")}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-row sm:items-center xl:justify-end">
                      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-admin-border/70 bg-admin-card px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
                            Odds
                          </p>
                          <p className="mt-1 text-lg font-semibold text-admin-blue">
                            {event._count.odds.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl border border-admin-border/70 bg-admin-card px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
                            Bets
                          </p>
                          <p className="mt-1 text-lg font-semibold text-admin-gold">
                            {event._count.bets.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 rounded-xl border border-admin-border/70 bg-admin-card px-4 py-3 sm:min-w-[180px]">
                        <div>
                          <p className="text-sm font-medium text-admin-text-primary">
                            {event.isActive ? "Active" : "Inactive"}
                          </p>
                          <p className="text-xs text-admin-text-muted">
                            Visible to bettors
                          </p>
                        </div>
                        <Switch
                          checked={event.isActive}
                          onCheckedChange={(checked) =>
                            void handleToggle(event, checked)
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:hidden">
                        <Button
                          variant="outline"
                          onClick={() => openDetailDialog(event)}
                          className="border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface"
                        >
                          <Eye className="size-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openConfigDialog(event)}
                          className="border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface"
                        >
                          <PencilLine className="size-4" />
                          Edit
                        </Button>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="hidden border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface sm:inline-flex"
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Open event actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="border-admin-border bg-admin-card text-admin-text-primary"
                        >
                          <DropdownMenuItem
                            onSelect={() => openDetailDialog(event)}
                          >
                            <Eye className="size-4" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => openConfigDialog(event)}
                          >
                            <PencilLine className="size-4" />
                            Edit markets
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {event.isActive ? (
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => {
                                setActionEvent(event);
                                setConfirmDeactivateOpen(true);
                              }}
                            >
                              <Power className="size-4" />
                              Deactivate event
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() => void handleToggle(event, true)}
                            >
                              <Power className="size-4" />
                              Activate event
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {total > 20 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-admin-text-muted">
              Page {page} of {totalPages}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() =>
                  setPage((currentPage) => Math.max(1, currentPage - 1))
                }
                className="w-full border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface sm:w-auto"
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                className="w-full border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface sm:w-auto"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] border-admin-border bg-admin-card p-4 text-admin-text-primary sm:max-w-xl sm:p-6">
          <DialogHeader>
            <DialogTitle>Bulk update events</DialogTitle>
            <DialogDescription className="text-admin-text-muted">
              Apply a margin and enabled markets to the current league, the
              current sport, or your selected events.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Current league",
                  value: "league" as BulkFilter,
                  helper: selectedLeague || "Choose a league first",
                },
                {
                  label: "Current sport",
                  value: "sport" as BulkFilter,
                  helper:
                    selectedLeagueSportKey ||
                    events.find((event) => event.sportKey)?.sportKey ||
                    "Uses the sport in the current view",
                },
                {
                  label: "Selected events",
                  value: "selected" as BulkFilter,
                  helper: `${selectedEventIds.length} selected`,
                },
              ].map((option) => {
                const isActive = bulkFilter === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBulkFilter(option.value)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      isActive
                        ? "border-admin-accent bg-admin-accent/10"
                        : "border-admin-border bg-admin-surface/25 hover:bg-admin-surface/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-admin-text-primary">
                        {option.label}
                      </p>
                      {isActive ? (
                        <Check className="size-4 text-admin-accent" />
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-admin-text-muted">
                      {option.helper}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
              <div className="space-y-2">
                <label className="text-sm font-medium text-admin-text-primary">
                  House margin
                </label>
                <Input
                  value={bulkHouseMargin}
                  onChange={(event) => setBulkHouseMargin(event.target.value)}
                  className={cn(
                    adminInputClassName,
                    "border-admin-border bg-admin-surface text-admin-text-primary",
                  )}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-admin-text-primary">
                  Enabled markets
                </p>
                <div className="flex flex-wrap gap-2">
                  {marketOptions.map((market) => {
                    const checked = bulkMarkets.includes(market);

                    return (
                      <Button
                        key={market}
                        type="button"
                        size="sm"
                        variant={checked ? "default" : "outline"}
                        onClick={() =>
                          setBulkMarkets((currentMarkets) =>
                            toggleMarket(currentMarkets, market),
                          )
                        }
                        className={cn(
                          checked
                            ? "bg-admin-accent text-black hover:bg-admin-accent/90"
                            : "border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface",
                        )}
                      >
                        {market}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              className="w-full border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleApplyBulkMargin()}
              disabled={bulkApplying}
              className="w-full bg-admin-accent text-black hover:bg-admin-accent/90 sm:w-auto"
            >
              {bulkApplying ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Applying
                </>
              ) : (
                "Apply changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] border-admin-border bg-admin-card p-4 text-admin-text-primary sm:max-w-3xl sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent
                ? `${selectedEvent.homeTeam} vs ${selectedEvent.awayTeam}`
                : "Event details"}
            </DialogTitle>
            <DialogDescription className="text-admin-text-muted">
              Review event metadata, markets, and displayed odds.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[75dvh] pr-2 sm:pr-4">
            {detailLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    className="h-16 animate-pulse rounded-xl bg-admin-surface"
                    key={index}
                  />
                ))}
              </div>
            ) : eventDetail ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="Event ID" value={eventDetail.eventId} />
                  <DetailField
                    label="League"
                    value={eventDetail.leagueName ?? "Unknown league"}
                  />
                  <DetailField
                    label="Start time"
                    value={formatEventTime(eventDetail.commenceTime)}
                  />
                  <DetailField
                    label="Status"
                    value={eventDetail.status.toLowerCase()}
                  />
                  <DetailField
                    label="Markets"
                    value={eventDetail.marketsEnabled.join(", ")}
                  />
                  <DetailField
                    label="Total bets"
                    value={eventDetail._count.bets.toLocaleString()}
                  />
                </div>

                <div className="rounded-xl border border-admin-border/70 bg-admin-surface/20 p-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="size-4 text-admin-blue" />
                    <p className="text-sm font-medium text-admin-text-primary">
                      Displayed odds
                    </p>
                  </div>

                  {(eventDetail.displayedOdds ?? []).length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {(eventDetail.displayedOdds ?? []).map((bookmaker) => (
                        <div
                          className="rounded-xl border border-admin-border/70 bg-admin-card p-3 sm:p-4"
                          key={bookmaker.bookmakerId}
                        >
                          <p className="text-sm font-semibold text-admin-text-primary">
                            {bookmaker.bookmakerName}
                          </p>
                          <div className="mt-3 space-y-2">
                            {bookmaker.odds.map((odd) => (
                              <div
                                className="flex flex-col gap-2 text-sm text-admin-text-secondary sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                                key={odd.id}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="border-admin-border bg-admin-surface text-admin-text-primary"
                                  >
                                    {odd.marketType}
                                  </Badge>
                                  <span>{odd.side}</span>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-admin-text-primary">
                                    {odd.displayOdds}
                                  </p>
                                  <p className="text-xs text-admin-text-muted">
                                    Updated {formatUpdatedTime(odd.updatedAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-admin-text-muted">
                      No displayed odds are available for this event yet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-admin-text-muted">
                No details are available for this event right now.
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] border-admin-border bg-admin-card p-4 text-admin-text-primary sm:max-w-lg sm:p-6">
          <DialogHeader>
            <DialogTitle>Edit event markets</DialogTitle>
            <DialogDescription className="text-admin-text-muted">
              Adjust the house margin and choose which markets are available.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-xl border border-admin-border/70 bg-admin-surface/20 p-4">
              <p className="text-sm font-medium text-admin-text-primary">
                {configEvent?.homeTeam} vs {configEvent?.awayTeam}
              </p>
              <p className="mt-1 text-sm text-admin-text-muted">
                {configEvent?.leagueName ?? "Unknown league"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-admin-text-primary">
                House margin
              </label>
              <Input
                value={houseMargin}
                onChange={(event) => setHouseMargin(event.target.value)}
                className={cn(
                  adminInputClassName,
                  "border-admin-border bg-admin-surface text-admin-text-primary",
                )}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-admin-text-primary">
                Enabled markets
              </p>
              <div className="flex flex-wrap gap-2">
                {marketOptions.map((market) => {
                  const checked = marketsEnabled.includes(market);

                  return (
                    <Button
                      key={market}
                      type="button"
                      size="sm"
                      variant={checked ? "default" : "outline"}
                      onClick={() =>
                        setMarketsEnabled((currentMarkets) =>
                          toggleMarket(currentMarkets, market),
                        )
                      }
                      className={cn(
                        checked
                          ? "bg-admin-accent text-black hover:bg-admin-accent/90"
                          : "border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface",
                      )}
                    >
                      {market}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfigDialogOpen(false)}
              className="w-full border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveConfig()}
              className="w-full bg-admin-accent text-black hover:bg-admin-accent/90 sm:w-auto"
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDeactivateOpen}
        onOpenChange={setConfirmDeactivateOpen}
      >
        <DialogContent className="max-w-[calc(100%-1rem)] border-admin-border bg-admin-card p-4 text-admin-text-primary sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle>Deactivate event</DialogTitle>
            <DialogDescription className="text-admin-text-muted">
              {actionEvent
                ? `${actionEvent.homeTeam} vs ${actionEvent.awayTeam} will be hidden from bettors until it is reactivated.`
                : "This event will be hidden until it is reactivated."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeactivateOpen(false)}
              className="w-full border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!actionEvent) {
                  return;
                }

                setConfirmDeactivateOpen(false);
                void handleToggle(actionEvent, false);
              }}
              className="w-full bg-admin-red text-white hover:bg-admin-red/90 sm:w-auto"
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
