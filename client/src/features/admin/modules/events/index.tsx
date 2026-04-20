import { lazy, Suspense, useState as useTabState } from "react";
import { api } from "@/api/axiosConfig";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MoreHorizontal,
  PencilLine,
  Plus,
  Power,
  RefreshCw,
  Search,
  Settings2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const CustomEventsManager = lazy(() => import("./CustomEventsManager"));
import {
  AdminSectionHeader,
  AdminStatCard,
  StatusBadge,
  adminInputClassName,
  adminSelectContentClassName,
  adminSelectTriggerClassName,
} from "../../components/ui";

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
  if (lower.includes("soccer") || lower.includes("football")) return "Football";
  if (lower.includes("basketball")) return "Basketball";
  if (lower.includes("tennis")) return "Tennis";
  if (lower.includes("nfl") || lower.includes("americanfootball"))
    return "American Football";
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
  if (diffMs <= 0) return "Now";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const msg = (error as { response?: { data?: { message?: string } } })
      .response?.data?.message;
    if (msg) return msg;
  }
  return fallback;
}
function toggleMarket(currentMarkets: string[], market: string) {
  return currentMarkets.includes(market)
    ? currentMarkets.filter((m) => m !== market)
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
    <div className="rounded-lg border border-admin-border/70 bg-admin-surface/25 p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-admin-text-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-admin-text-primary">
        {value}
      </p>
    </div>
  );
}

function FeedEvents() {
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    homeTeam: "",
    awayTeam: "",
    league: "",
    commenceTime: "",
    h2hHome: "",
    h2hAway: "",
  });
  const [creatingEvent, setCreatingEvent] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const hasSelection = selectedEventIds.length > 0;
  const allVisibleSelected =
    events.length > 0 &&
    events.every((e) => selectedEventIds.includes(e.eventId));

  const selectedLeagueSportKey = useMemo(() => {
    for (const sport of leagueOptions) {
      if (sport.leagues.includes(selectedLeague)) return sport.sportKey;
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
      { label: "Cancelled", value: "CANCELLED" as FilterValue, count: 0 },
    ],
    [stats],
  );

  const summaryCards = useMemo(
    () => [
      { label: "Live", value: stats?.liveCount ?? 0, tone: "live" as const },
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

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => (
        <div
          key={`sk-${i}`}
          className="flex items-center gap-3 border-b border-admin-border/50 px-3 py-2.5 last:border-0"
        >
          <div className="size-3.5 shrink-0 animate-pulse rounded bg-admin-surface" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-44 animate-pulse rounded bg-admin-surface" />
            <div className="h-3 w-28 animate-pulse rounded bg-admin-surface" />
          </div>
          <div className="hidden shrink-0 gap-1.5 sm:flex">
            <div className="h-5 w-12 animate-pulse rounded-full bg-admin-surface" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-admin-surface" />
          </div>
          <div className="hidden sm:block">
            <div className="h-6 w-10 animate-pulse rounded-full bg-admin-surface" />
          </div>
          <div className="size-6 animate-pulse rounded bg-admin-surface" />
        </div>
      )),
    [],
  );

  async function loadLeagues() {
    try {
      const res = await api.get<LeagueResponse>("/admin/events/leagues");
      setLeagueOptions(res.data.sports);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadEvents(options?: { background?: boolean }) {
    if (options?.background) setRefreshing(true);
    else setLoading(true);
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
      )
        params.status = activeFilter;
      if (activeFilter === "ACTIVE") params.isActive = true;
      if (activeFilter === "CONFIGURED") {
        params.isActive = true;
        params.hasMargin = true;
      }
      if (activeFilter === "NO_ODDS") {
        params.isActive = true;
        params.hasOdds = false;
      }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedLeague) params.leagueName = selectedLeague;
      const res = await api.get<{
        events: ApiEvent[];
        total: number;
        page: number;
        totalPages: number;
      }>("/admin/events", { params });
      setEvents(res.data.events);
      setTotal(res.data.total);
      setSelectedEventIds((ids) =>
        ids.filter((id) => res.data.events.some((e) => e.eventId === id)),
      );
    } catch (e) {
      const msg = getErrorMessage(e, "Unable to load events right now.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await api.get<EventStats>("/admin/events/stats");
      setStats(res.data);
    } catch (e) {
      console.error(e);
      setError("Unable to load event stats.");
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadEventDetail(eventId: string) {
    setDetailLoading(true);
    try {
      const res = await api.get<EventDetail>(`/admin/events/${eventId}`);
      setEventDetail(res.data);
    } catch (e) {
      console.error(e);
      setError("Unable to load event details.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleRefresh() {
    await Promise.all([loadEvents({ background: true }), loadStats()]);
  }

  async function handleToggle(event: ApiEvent, nextIsActive?: boolean) {
    const prev = event.isActive;
    const target = nextIsActive ?? !prev;
    setEvents((ev) =>
      ev.map((e) =>
        e.eventId === event.eventId ? { ...e, isActive: target } : e,
      ),
    );
    try {
      const res = await api.patch<Pick<ApiEvent, "eventId" | "isActive">>(
        `/admin/events/${event.eventId}/toggle`,
      );
      setEvents((ev) =>
        ev.map((e) =>
          e.eventId === event.eventId
            ? { ...e, isActive: res.data.isActive }
            : e,
        ),
      );
      await loadStats();
      toast.success(
        res.data.isActive ? "Event activated" : "Event deactivated",
      );
    } catch (e) {
      setEvents((ev) =>
        ev.map((e) =>
          e.eventId === event.eventId ? { ...e, isActive: prev } : e,
        ),
      );
      const msg = getErrorMessage(e, "Unable to update event status.");
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleBulkToggle(nextIsActive: boolean) {
    if (!hasSelection) return;
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
    } catch (e) {
      const msg = getErrorMessage(e, "Unable to update selected events.");
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleBulkMargin(nextHouseMargin: number) {
    if (!hasSelection) return;
    try {
      await api.patch("/admin/events/bulk-config", {
        eventIds: selectedEventIds,
        houseMargin: nextHouseMargin,
      });
      setSelectedEventIds([]);
      await Promise.all([loadEvents({ background: true }), loadStats()]);
      toast.success(`Set ${nextHouseMargin}% margin for selected events`);
    } catch (e) {
      const msg = getErrorMessage(e, "Unable to update selected event margin.");
      setError(msg);
      toast.error(msg);
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
        toast.error("Choose a league first.");
        return;
      }
      body.leagueName = selectedLeague;
    }
    if (bulkFilter === "sport") {
      const sportKey =
        selectedLeagueSportKey ||
        events.find((e) => e.sportKey)?.sportKey ||
        "";
      if (!sportKey) {
        toast.error("No sport context available.");
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
      const res = await api.patch<{ updated: number; message: string }>(
        "/admin/events/bulk-margin",
        body,
      );
      toast.success(res.data.message);
      setBulkDialogOpen(false);
      setSelectedEventIds([]);
      await Promise.all([loadEvents({ background: true }), loadStats()]);
    } catch (e) {
      const msg = getErrorMessage(e, "Unable to apply bulk margin.");
      setError(msg);
      toast.error(msg);
    } finally {
      setBulkApplying(false);
    }
  }

  async function handleSaveConfig() {
    if (!configEvent) return;
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
      const res = await api.patch<ApiEvent>(
        `/admin/events/${configEvent.eventId}/config`,
        { houseMargin: marginValue, marketsEnabled },
      );
      setEvents((ev) =>
        ev.map((e) => (e.eventId === configEvent.eventId ? res.data : e)),
      );
      setConfigEvent(res.data);
      setConfigDialogOpen(false);
      toast.success("Event configuration saved");
      await loadStats();
    } catch (e) {
      const msg = getErrorMessage(e, "Unable to save event configuration.");
      setError(msg);
      toast.error(msg);
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

  async function handleCreateCustomEvent() {
    if (
      !createFormData.homeTeam ||
      !createFormData.awayTeam ||
      !createFormData.commenceTime
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!createFormData.h2hHome || !createFormData.h2hAway) {
      toast.error("Please set both odds values");
      return;
    }

    setCreatingEvent(true);
    try {
      const payload = {
        homeTeam: createFormData.homeTeam.trim(),
        awayTeam: createFormData.awayTeam.trim(),
        sport: "admin-created",
        league: createFormData.league.trim() || undefined,
        commenceTime: new Date(createFormData.commenceTime).toISOString(),
        h2hOdds: {
          home: Number(createFormData.h2hHome),
          away: Number(createFormData.h2hAway),
        },
      };

      await api.post("/user/custom-events", payload);
      toast.success("Custom event created!");
      setCreateDialogOpen(false);
      setCreateFormData({
        homeTeam: "",
        awayTeam: "",
        league: "",
        commenceTime: "",
        h2hHome: "",
        h2hAway: "",
      });
      await Promise.all([loadEvents({ background: true }), loadStats()]);
    } catch (e) {
      const msg = getErrorMessage(e, "Failed to create custom event");
      toast.error(msg);
    } finally {
      setCreatingEvent(false);
    }
  }

  function toggleSelection(eventId: string, checked: boolean) {
    setSelectedEventIds((ids) =>
      checked
        ? ids.includes(eventId)
          ? ids
          : [...ids, eventId]
        : ids.filter((id) => id !== eventId),
    );
  }

  function toggleSelectAllVisible(checked: boolean) {
    if (!checked) {
      setSelectedEventIds((ids) =>
        ids.filter((id) => !events.some((e) => e.eventId === id)),
      );
      return;
    }
    setSelectedEventIds((ids) =>
      Array.from(new Set([...ids, ...events.map((e) => e.eventId)])),
    );
  }

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    void loadEvents();
  }, [activeFilter, page, debouncedSearch, selectedLeague]);

  useEffect(() => {
    void Promise.all([loadStats(), loadLeagues()]);
  }, []);

  useEffect(() => {
    const si = window.setInterval(() => void loadStats(), 60000);
    const ei = window.setInterval(
      () => void loadEvents({ background: true }),
      120000,
    );
    const ci = window.setInterval(() => setCurrentTimeMs(Date.now()), 60000);
    return () => {
      window.clearInterval(si);
      window.clearInterval(ei);
      window.clearInterval(ci);
    };
  }, [activeFilter, page, debouncedSearch, selectedLeague]);

  return (
    <>
      <div className="space-y-2">
        {/* ── Tab Selector ── */}
        {/* Note: tab state is managed by the wrapper */}
        {/* ── Header ── */}
        <AdminSectionHeader
          title="Events"
          subtitle="Manage live and upcoming fixtures, markets, and odds."
          actions={
            <div className="grid w-full gap-1.5 sm:flex sm:w-auto sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className="w-full border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface sm:w-auto"
              >
                {refreshing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setBulkDialogOpen(true)}
                className="w-full bg-admin-accent text-black hover:bg-admin-accent/90 sm:w-auto"
              >
                <Settings2 className="size-3.5" />
                Bulk update
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="w-full bg-amber-500 text-black hover:bg-amber-600 sm:w-auto"
              >
                <Plus className="size-3.5" />
                Create Custom Event
              </Button>
            </div>
          }
        />

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {summaryCards.map((metric) => (
            <AdminStatCard
              key={metric.label}
              label={metric.label}
              value={(statsLoading ? 0 : metric.value).toLocaleString()}
              tone={metric.tone}
            />
          ))}
        </div>

        {/* ── Filters ── */}
        <Card className="border-admin-border bg-admin-card shadow-sm">
          <CardContent className="space-y-2 p-2 sm:p-3">
            {/* Search + league */}
            <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_200px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-admin-text-muted" />
                <Input
                  placeholder="Search team or league…"
                  value={searchQuery}
                  onChange={(e) => {
                    setPage(1);
                    setSearchQuery(e.target.value);
                  }}
                  className={cn(
                    adminInputClassName,
                    "h-7 border-admin-border bg-admin-surface pl-8 text-xs text-admin-text-primary",
                  )}
                />
              </div>
              <Select
                value={selectedLeague || allLeaguesValue}
                onValueChange={(v) => {
                  setPage(1);
                  setSelectedLeague(v === allLeaguesValue ? "" : v);
                }}
              >
                <SelectTrigger
                  className={cn(
                    adminSelectTriggerClassName,
                    "h-7 w-full border-admin-border bg-admin-surface text-xs text-admin-text-primary",
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

            {/* Filter pills */}
            <div className="-mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-px sm:flex-wrap sm:overflow-visible sm:px-0">
              {filterOptions.map((filter) => {
                const isActive = activeFilter === filter.value;
                return (
                  <button
                    key={filter.label}
                    onClick={() => {
                      setPage(1);
                      setActiveFilter(filter.value);
                    }}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                      isActive
                        ? "border-admin-accent bg-admin-accent text-black"
                        : "border-admin-border bg-admin-surface/40 text-admin-text-secondary hover:bg-admin-surface hover:text-admin-text-primary",
                    )}
                  >
                    {filter.label}
                    <span
                      className={cn(
                        "rounded-full px-1 py-px text-[9px] font-medium leading-none",
                        isActive
                          ? "bg-black/15 text-black"
                          : "bg-admin-card text-admin-text-muted",
                      )}
                    >
                      {statsLoading ? "·" : filter.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Row count + refresh hint */}
            <div className="flex items-center justify-between text-[11px] text-admin-text-muted">
              <span>
                {events.length.toLocaleString()} of {total.toLocaleString()}{" "}
                events
              </span>
              {refreshing ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-2.5 animate-spin" />
                  Refreshing…
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* ── Selection toolbar ── */}
        {hasSelection ? (
          <div className="flex flex-col gap-1.5 rounded-xl border border-admin-accent/25 bg-admin-accent/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-admin-text-primary">
              {selectedEventIds.length} event
              {selectedEventIds.length === 1 ? "" : "s"} selected
            </p>
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                onClick={() => void handleBulkToggle(true)}
                className="h-6 bg-admin-accent px-2.5 text-[11px] text-black hover:bg-admin-accent/90"
              >
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleBulkMargin(5)}
                className="h-6 border-admin-border bg-admin-card px-2.5 text-[11px] text-admin-text-primary hover:bg-admin-surface"
              >
                Set 5% margin
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleBulkToggle(false)}
                className="h-6 border-admin-red/40 bg-admin-red/10 px-2.5 text-[11px] text-admin-red hover:bg-admin-red/15"
              >
                Deactivate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedEventIds([])}
                className="h-6 px-2.5 text-[11px] text-admin-text-secondary hover:text-admin-text-primary"
              >
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        {/* ── Error ── */}
        {error ? (
          <Alert
            variant="destructive"
            className="border-admin-red/30 bg-admin-red/10 text-admin-red"
          >
            <AlertTitle>Error loading events</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {/* ── Event list ── */}
        <Card className="border-admin-border bg-admin-card shadow-sm">
          {/* List header row */}
          <div className="flex items-center justify-between border-b border-admin-border/70 px-3 py-1.5 sm:px-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-admin-text-muted">
              Event list
            </p>
            {!loading && events.length > 0 ? (
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-admin-text-secondary">
                <input
                  checked={allVisibleSelected}
                  className="size-3.5 rounded border-admin-border bg-admin-surface accent-admin-accent"
                  onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                  type="checkbox"
                />
                Select page
              </label>
            ) : null}
          </div>

          {/* Skeleton */}
          {loading && events.length === 0 ? (
            <div className="divide-y divide-admin-border/40">
              {skeletonRows}
            </div>
          ) : null}

          {/* Empty state */}
          {!loading && events.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-admin-text-primary">
                No events found
              </p>
              <p className="mt-1 text-xs text-admin-text-muted">
                Try clearing a filter or refreshing the feed.
              </p>
            </div>
          ) : null}

          {/* Rows */}
          <div className="divide-y divide-admin-border/40">
            {events.map((event) => {
              const hasOdds = event._count.odds > 0;
              const hasScore =
                event.homeScore !== null && event.awayScore !== null;
              const isSelected = selectedEventIds.includes(event.eventId);

              return (
                <div
                  key={event.eventId}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-admin-surface/20 sm:px-4",
                    isSelected && "bg-admin-accent/5",
                  )}
                >
                  {/* Checkbox */}
                  <input
                    checked={isSelected}
                    className="size-3.5 shrink-0 rounded border-admin-border bg-admin-surface accent-admin-accent"
                    onChange={(e) =>
                      toggleSelection(event.eventId, e.target.checked)
                    }
                    type="checkbox"
                  />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {/* Matchup + badges */}
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <p className="truncate text-sm font-semibold text-admin-text-primary">
                        {event.homeTeam}{" "}
                        <span className="font-normal text-admin-text-muted">
                          vs
                        </span>{" "}
                        {event.awayTeam}
                      </p>
                      <div className="flex shrink-0 flex-wrap items-center gap-0.5">
                        <StatusBadge status={toBadgeStatus(event.status)} />
                        {hasScore && (
                          <span className="rounded border border-admin-border bg-admin-card px-1 py-px text-[10px] font-medium text-admin-text-primary">
                            {event.homeScore}–{event.awayScore}
                          </span>
                        )}
                        {event.status === "UPCOMING" && (
                          <span className="rounded border border-admin-blue/30 bg-admin-blue/10 px-1 py-px text-[10px] font-medium text-admin-blue">
                            {formatUpcomingCountdown(
                              event.commenceTime,
                              currentTimeMs,
                            )}
                          </span>
                        )}
                        {!hasOdds && (
                          <span className="rounded border border-admin-red/30 bg-admin-red/10 px-1 py-px text-[10px] font-medium text-admin-red">
                            No odds
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-admin-text-muted">
                      <span className="truncate max-w-35">
                        {event.leagueName ?? "Unknown league"}
                      </span>
                      <span className="hidden sm:inline text-[11px]">
                        {formatEventTime(event.commenceTime)}
                      </span>
                      <span className="hidden lg:inline text-[11px]">
                        {event._count.odds} odds · {event._count.bets} bets ·{" "}
                        {event.houseMargin}% margin ·{" "}
                        {event.marketsEnabled.join(", ")}
                      </span>
                      <span className="sm:hidden text-[11px]">
                        {event.houseMargin}% · {event._count.bets} bets
                      </span>
                    </div>
                  </div>

                  {/* Right: toggle + icon actions + overflow */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Switch
                      checked={event.isActive}
                      onCheckedChange={(checked) =>
                        void handleToggle(event, checked)
                      }
                      className="scale-[0.85]"
                    />
                    <div className="hidden items-center sm:flex">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openDetailDialog(event)}
                        className="size-7 text-admin-text-muted hover:bg-admin-surface hover:text-admin-text-primary"
                        title="View details"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openConfigDialog(event)}
                        className="size-7 text-admin-text-muted hover:bg-admin-surface hover:text-admin-text-primary"
                        title="Edit markets"
                      >
                        <PencilLine className="size-3.5" />
                      </Button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-admin-text-muted hover:bg-admin-surface hover:text-admin-text-primary"
                        >
                          <MoreHorizontal className="size-3.5" />
                          <span className="sr-only">Event actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="border-admin-border bg-admin-card text-admin-text-primary"
                      >
                        <DropdownMenuItem
                          onSelect={() => openDetailDialog(event)}
                        >
                          <Eye className="size-3.5" /> View details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => openConfigDialog(event)}
                        >
                          <PencilLine className="size-3.5" /> Edit markets
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
                            <Power className="size-3.5" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() => void handleToggle(event, true)}
                          >
                            <Power className="size-3.5" /> Activate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Pagination ── */}
        {total > 20 ? (
          <div className="flex items-center justify-between">
            <p className="text-xs text-admin-text-muted">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 border-admin-border bg-admin-card px-2.5 text-xs text-admin-text-primary hover:bg-admin-surface"
              >
                <ChevronLeft className="size-3.5" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 border-admin-border bg-admin-card px-2.5 text-xs text-admin-text-primary hover:bg-admin-surface"
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Bulk update dialog ── */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] border-admin-border bg-admin-card p-4 text-admin-text-primary sm:max-w-xl sm:p-6">
          <DialogHeader>
            <DialogTitle>Bulk update events</DialogTitle>
            <DialogDescription className="text-admin-text-muted">
              Apply margin and markets to a league, sport, or selection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
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
                    events.find((e) => e.sportKey)?.sportKey ||
                    "Sport in current view",
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
                      "rounded-lg border p-3 text-left text-sm transition-colors",
                      isActive
                        ? "border-admin-accent bg-admin-accent/10"
                        : "border-admin-border bg-admin-surface/25 hover:bg-admin-surface/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-admin-text-primary">
                        {option.label}
                      </span>
                      {isActive ? (
                        <Check className="size-3.5 text-admin-accent" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-admin-text-muted">
                      {option.helper}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-start">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-admin-text-primary">
                  House margin
                </label>
                <Input
                  value={bulkHouseMargin}
                  onChange={(e) => setBulkHouseMargin(e.target.value)}
                  className={cn(
                    adminInputClassName,
                    "h-8 border-admin-border bg-admin-surface text-sm text-admin-text-primary",
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-admin-text-primary">
                  Enabled markets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {marketOptions.map((market) => {
                    const checked = bulkMarkets.includes(market);
                    return (
                      <Button
                        key={market}
                        type="button"
                        size="sm"
                        variant={checked ? "default" : "outline"}
                        onClick={() =>
                          setBulkMarkets((m) => toggleMarket(m, market))
                        }
                        className={cn(
                          "h-7 px-3 text-xs",
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
                  <Loader2 className="size-3.5 animate-spin" />
                  Applying…
                </>
              ) : (
                "Apply changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Custom Event dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] border-admin-border bg-admin-card p-4 text-admin-text-primary sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Custom Event</DialogTitle>
            <DialogDescription className="text-admin-text-muted">
              Add a new custom event with odds.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-admin-text-secondary">
                Home Team *
              </label>
              <input
                type="text"
                placeholder="e.g., Team A"
                value={createFormData.homeTeam}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    homeTeam: e.target.value,
                  })
                }
                className="mt-1 w-full rounded border border-admin-border bg-admin-surface px-2.5 py-1.5 text-sm text-admin-text-primary placeholder-admin-text-muted focus:border-admin-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-admin-text-secondary">
                Away Team *
              </label>
              <input
                type="text"
                placeholder="e.g., Team B"
                value={createFormData.awayTeam}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    awayTeam: e.target.value,
                  })
                }
                className="mt-1 w-full rounded border border-admin-border bg-admin-surface px-2.5 py-1.5 text-sm text-admin-text-primary placeholder-admin-text-muted focus:border-admin-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-admin-text-secondary">
                League
              </label>
              <input
                type="text"
                placeholder="e.g., Premier League"
                value={createFormData.league}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    league: e.target.value,
                  })
                }
                className="mt-1 w-full rounded border border-admin-border bg-admin-surface px-2.5 py-1.5 text-sm text-admin-text-primary placeholder-admin-text-muted focus:border-admin-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-admin-text-secondary">
                Kick-off Time *
              </label>
              <input
                type="datetime-local"
                value={createFormData.commenceTime}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    commenceTime: e.target.value,
                  })
                }
                className="mt-1 w-full rounded border border-admin-border bg-admin-surface px-2.5 py-1.5 text-sm text-admin-text-primary focus:border-admin-accent focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-admin-text-secondary">
                  Home Odds *
                </label>
                <input
                  type="number"
                  placeholder="e.g., 1.50"
                  step="0.01"
                  value={createFormData.h2hHome}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      h2hHome: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded border border-admin-border bg-admin-surface px-2.5 py-1.5 text-sm text-admin-text-primary placeholder-admin-text-muted focus:border-admin-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-admin-text-secondary">
                  Away Odds *
                </label>
                <input
                  type="number"
                  placeholder="e.g., 2.50"
                  step="0.01"
                  value={createFormData.h2hAway}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      h2hAway: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded border border-admin-border bg-admin-surface px-2.5 py-1.5 text-sm text-admin-text-primary placeholder-admin-text-muted focus:border-admin-accent focus:outline-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
              className="w-full border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleCreateCustomEvent()}
              disabled={creatingEvent}
              className="w-full bg-amber-500 text-black hover:bg-amber-600 sm:w-auto"
            >
              {creatingEvent ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Event"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail dialog ── */}
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
              <div className="space-y-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    className="h-14 animate-pulse rounded-lg bg-admin-surface"
                    key={i}
                  />
                ))}
              </div>
            ) : eventDetail ? (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                <div className="rounded-lg border border-admin-border/70 bg-admin-surface/20 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarClock className="size-3.5 text-admin-blue" />
                    <p className="text-sm font-medium text-admin-text-primary">
                      Displayed odds
                    </p>
                  </div>
                  {(eventDetail.displayedOdds ?? []).length > 0 ? (
                    <div className="space-y-2">
                      {(eventDetail.displayedOdds ?? []).map((bookmaker) => (
                        <div
                          className="rounded-lg border border-admin-border/70 bg-admin-card p-3"
                          key={bookmaker.bookmakerId}
                        >
                          <p className="text-sm font-semibold text-admin-text-primary">
                            {bookmaker.bookmakerName}
                          </p>
                          <div className="mt-2 space-y-1.5">
                            {bookmaker.odds.map((odd) => (
                              <div
                                className="flex flex-col gap-1 text-xs text-admin-text-secondary sm:flex-row sm:items-center sm:justify-between"
                                key={odd.id}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className="border-admin-border bg-admin-surface px-1.5 py-px text-[10px] text-admin-text-primary"
                                  >
                                    {odd.marketType}
                                  </Badge>
                                  <span>{odd.side}</span>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-admin-text-primary">
                                    {odd.displayOdds}
                                  </p>
                                  <p className="text-[10px] text-admin-text-muted">
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
                    <p className="text-sm text-admin-text-muted">
                      No displayed odds available yet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-admin-text-muted">
                No details available right now.
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Config dialog ── */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] border-admin-border bg-admin-card p-4 text-admin-text-primary sm:max-w-lg sm:p-6">
          <DialogHeader>
            <DialogTitle>Edit event markets</DialogTitle>
            <DialogDescription className="text-admin-text-muted">
              Adjust house margin and enabled markets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-admin-border/70 bg-admin-surface/20 p-3">
              <p className="text-sm font-medium text-admin-text-primary">
                {configEvent?.homeTeam} vs {configEvent?.awayTeam}
              </p>
              <p className="mt-0.5 text-xs text-admin-text-muted">
                {configEvent?.leagueName ?? "Unknown league"}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-admin-text-primary">
                House margin
              </label>
              <Input
                value={houseMargin}
                onChange={(e) => setHouseMargin(e.target.value)}
                className={cn(
                  adminInputClassName,
                  "h-8 border-admin-border bg-admin-surface text-sm text-admin-text-primary",
                )}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-admin-text-primary">
                Enabled markets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {marketOptions.map((market) => {
                  const checked = marketsEnabled.includes(market);
                  return (
                    <Button
                      key={market}
                      type="button"
                      size="sm"
                      variant={checked ? "default" : "outline"}
                      onClick={() =>
                        setMarketsEnabled((m) => toggleMarket(m, market))
                      }
                      className={cn(
                        "h-7 px-3 text-xs",
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

      {/* ── Confirm deactivate dialog ── */}
      <Dialog
        open={confirmDeactivateOpen}
        onOpenChange={setConfirmDeactivateOpen}
      >
        <DialogContent className="max-w-[calc(100%-1rem)] border-admin-border bg-admin-card p-4 text-admin-text-primary sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle>Deactivate event</DialogTitle>
            <DialogDescription className="text-admin-text-muted">
              {actionEvent
                ? `${actionEvent.homeTeam} vs ${actionEvent.awayTeam} will be hidden from bettors until reactivated.`
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
                if (!actionEvent) return;
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

// ── Tab Wrapper ──

type EventsTab = "feed" | "custom" | "categories";

const SportCategoriesManager = lazy(() => import("./SportCategoriesManager"));

export default function Events() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") === "custom" ? "custom" : "feed";
  const [activeTab, setActiveTab] = useTabState<EventsTab>(initialTab);

  return (
    <div className="space-y-3">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 rounded-xl border border-admin-border/60 bg-admin-card p-1">
        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          className={cn(
            "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition",
            activeTab === "feed"
              ? "bg-admin-accent/15 text-admin-accent shadow-sm"
              : "text-admin-text-muted hover:text-admin-text-secondary",
          )}
        >
          Feed Events
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("custom")}
          className={cn(
            "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition",
            activeTab === "custom"
              ? "bg-admin-accent/15 text-admin-accent shadow-sm"
              : "text-admin-text-muted hover:text-admin-text-secondary",
          )}
        >
          Custom Events
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={cn(
            "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition",
            activeTab === "categories"
              ? "bg-admin-accent/15 text-admin-accent shadow-sm"
              : "text-admin-text-muted hover:text-admin-text-secondary",
          )}
        >
          Sport Categories
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "feed" ? (
        <FeedEvents />
      ) : activeTab === "categories" ? (
        <Suspense
          fallback={
            <div className="space-y-3 py-2">
              <div className="h-10 animate-pulse rounded-xl border border-admin-border/60 bg-admin-card" />
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={`cat-fallback-${idx}`}
                    className="h-20 animate-pulse rounded-xl border border-admin-border/60 bg-admin-card"
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={`cat-card-fallback-${idx}`}
                    className="h-36 animate-pulse rounded-xl border border-admin-border/60 bg-admin-card"
                  />
                ))}
              </div>
            </div>
          }
        >
          <SportCategoriesManager />
        </Suspense>
      ) : (
        <Suspense
          fallback={
            <div className="space-y-3 py-2">
              <div className="h-10 animate-pulse rounded-xl border border-admin-border/60 bg-admin-card" />
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={`custom-events-fallback-${idx}`}
                    className="h-20 animate-pulse rounded-xl border border-admin-border/60 bg-admin-card"
                  />
                ))}
              </div>
              <div className="h-72 animate-pulse rounded-xl border border-admin-border/60 bg-admin-card" />
            </div>
          }
        >
          <CustomEventsManager />
        </Suspense>
      )}
    </div>
  );
}

