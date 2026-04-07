import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { api } from "@/api/axiosConfig";
import { Input } from "@/components/ui/input";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
  TableShell,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";

type OddsFilter = "configured" | "configured-with-odds" | "all-with-odds";

interface OddsStats {
  totalConfigured: number;
  withOdds: number;
  noOdds: number;
  autoSelected: number;
  bookmakers: number;
}

interface OddsEvent {
  id: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string | null;
  sportKey: string | null;
  commenceTime: string;
  status: "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
  isActive: boolean;
  houseMargin: number;
  marketsEnabled: string[];
  _count: {
    odds: number;
    displayedOdds: number;
    bets: number;
  };
}

interface OddsListResponse {
  data: OddsEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface DropdownEvent {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string | null;
  commenceTime: string;
  status: "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
  oddsCount?: number;
  _count?: {
    odds?: number;
  };
}

interface DropdownResponse {
  events: DropdownEvent[];
  total: number;
  limit: number;
}

interface OddsDetailsResponse {
  eventId: string;
  eventName: string;
  status: "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
  markets: Array<{
    marketType: string;
    odds: Array<{
      bookmakerId: string;
      bookmakerName: string;
      selection: string;
      odds: number;
      updatedAt: string;
      isBest: boolean;
    }>;
  }>;
}

function debounceValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debounced;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { error?: string } } })
      .response;
    const message = response?.data?.error;
    if (message) {
      return message;
    }
  }

  return fallback;
}

function toBadgeStatus(status: OddsEvent["status"]) {
  switch (status) {
    case "LIVE":
      return "live" as const;
    case "UPCOMING":
      return "upcoming" as const;
    case "FINISHED":
      return "completed" as const;
    case "CANCELLED":
      return "failed" as const;
  }
}

function pageItems(current: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([
    1,
    totalPages,
    current,
    current - 1,
    current + 1,
  ]);
  const normalized = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);

  const withDots: Array<number | string> = [];
  for (let index = 0; index < normalized.length; index += 1) {
    const value = normalized[index];
    const prev = normalized[index - 1];
    if (typeof prev === "number" && value - prev > 1) {
      withDots.push("...");
    }
    withDots.push(value);
  }

  return withDots;
}

export default function Odds() {
  const navigate = useNavigate({ from: "/admin/odds" });
  const search = useSearch({ strict: false }) as {
    filter?: OddsFilter;
    page?: number;
    search?: string;
    eventId?: string;
  };

  const activeFilter: OddsFilter =
    search.filter === "configured-with-odds" ||
    search.filter === "all-with-odds"
      ? search.filter
      : "configured";
  const currentPage =
    typeof search.page === "number" && search.page > 0 ? search.page : 1;
  const selectedEventId =
    typeof search.eventId === "string" ? search.eventId : "";

  const [searchInput, setSearchInput] = useState(search.search ?? "");
  const [jumpInput, setJumpInput] = useState(String(currentPage));
  const [oddsDropdownSearch, setOddsDropdownSearch] = useState("");
  const [configuredDropdownSearch, setConfiguredDropdownSearch] = useState("");

  const [stats, setStats] = useState<OddsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [events, setEvents] = useState<OddsEvent[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [pagination, setPagination] = useState<OddsListResponse["pagination"]>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const [availableOddsEvents, setAvailableOddsEvents] = useState<
    DropdownEvent[]
  >([]);
  const [availableOddsLoading, setAvailableOddsLoading] = useState(false);
  const [availableOddsError, setAvailableOddsError] = useState("");

  const [configuredEvents, setConfiguredEvents] = useState<DropdownEvent[]>([]);
  const [configuredLoading, setConfiguredLoading] = useState(false);
  const [configuredError, setConfiguredError] = useState("");

  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [bookmarkingEventIds, setBookmarkingEventIds] = useState<
    Record<string, boolean>
  >({});
  const [bookmarkedEventIds, setBookmarkedEventIds] = useState<
    Record<string, boolean>
  >({});
  const [bulkBookmarking, setBulkBookmarking] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const [expandedEventId, setExpandedEventId] = useState("");
  const [oddsDetailsByEventId, setOddsDetailsByEventId] = useState<
    Record<string, OddsDetailsResponse>
  >({});
  const [oddsLoadingByEventId, setOddsLoadingByEventId] = useState<
    Record<string, boolean>
  >({});
  const [oddsErrorByEventId, setOddsErrorByEventId] = useState<
    Record<string, string>
  >({});

  const [syncing, setSyncing] = useState(false);

  const debouncedSearch = debounceValue(searchInput.trim(), 300);
  const debouncedOddsDropdownSearch = debounceValue(
    oddsDropdownSearch.trim(),
    300,
  );
  const debouncedConfiguredDropdownSearch = debounceValue(
    configuredDropdownSearch.trim(),
    300,
  );

  useEffect(() => {
    setSearchInput(typeof search.search === "string" ? search.search : "");
  }, [search.search]);

  useEffect(() => {
    setJumpInput(String(currentPage));
  }, [currentPage]);

  function updateUrl(next: {
    filter?: OddsFilter;
    page?: number;
    search?: string;
    eventId?: string;
  }) {
    void navigate({
      to: "/admin/odds",
      search: (prev) => ({
        ...(prev as Record<string, unknown>),
        filter: next.filter ?? activeFilter,
        page: next.page ?? currentPage,
        search:
          next.search ??
          (typeof search.search === "string" ? search.search : ""),
        eventId: next.eventId ?? selectedEventId,
      }),
      replace: false,
    });
  }

  useEffect(() => {
    const currentSearch =
      typeof search.search === "string" ? search.search : "";
    if (debouncedSearch === currentSearch) {
      return;
    }

    updateUrl({ search: debouncedSearch, page: 1 });
  }, [debouncedSearch]);

  async function loadStats() {
    setStatsLoading(true);
    try {
      const response = await api.get<OddsStats>("/admin/odds/stats");
      setStats(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load odds stats."));
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadEventList() {
    setListLoading(true);
    setListError("");

    try {
      const response = await api.get<OddsListResponse>("/admin/odds/events", {
        params: {
          filter: activeFilter,
          page: currentPage,
          limit: 20,
          search: debouncedSearch || undefined,
          eventId: selectedEventId || undefined,
        },
      });

      setEvents(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      const message = getErrorMessage(error, "Unable to load odds events.");
      setListError(message);
      toast.error(message);
    } finally {
      setListLoading(false);
    }
  }

  async function loadAvailableOddsEvents() {
    setAvailableOddsLoading(true);
    setAvailableOddsError("");

    try {
      const response = await api.get<DropdownResponse>(
        "/admin/odds/available-events",
        {
          params: {
            search: debouncedOddsDropdownSearch || undefined,
            limit: 50,
          },
        },
      );
      setAvailableOddsEvents(response.data.events);
    } catch (error) {
      setAvailableOddsError(
        getErrorMessage(error, "Unable to load events with odds."),
      );
    } finally {
      setAvailableOddsLoading(false);
    }
  }

  async function loadConfiguredEvents() {
    setConfiguredLoading(true);
    setConfiguredError("");

    try {
      const response = await api.get<DropdownResponse>(
        "/admin/events/configured",
        {
          params: {
            search: debouncedConfiguredDropdownSearch || undefined,
            limit: 50,
          },
        },
      );
      setConfiguredEvents(response.data.events);
    } catch (error) {
      setConfiguredError(
        getErrorMessage(error, "Unable to load configured events."),
      );
    } finally {
      setConfiguredLoading(false);
    }
  }

  async function loadOddsDetails(eventId: string) {
    setOddsLoadingByEventId((current) => ({ ...current, [eventId]: true }));
    setOddsErrorByEventId((current) => ({ ...current, [eventId]: "" }));

    try {
      const response = await api.get<OddsDetailsResponse>(
        `/admin/odds/${eventId}`,
      );
      setOddsDetailsByEventId((current) => ({
        ...current,
        [eventId]: response.data,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "Unable to load odds details.");
      setOddsErrorByEventId((current) => ({ ...current, [eventId]: message }));
    } finally {
      setOddsLoadingByEventId((current) => ({ ...current, [eventId]: false }));
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  useEffect(() => {
    void loadEventList();
  }, [activeFilter, currentPage, debouncedSearch, selectedEventId]);

  useEffect(() => {
    void loadAvailableOddsEvents();
  }, [debouncedOddsDropdownSearch]);

  useEffect(() => {
    void loadConfiguredEvents();
  }, [debouncedConfiguredDropdownSearch]);

  useEffect(() => {
    setSelectedEventIds((current) =>
      current.filter((eventId) =>
        events.some((event) => event.eventId === eventId),
      ),
    );
  }, [events]);

  const allOnPageSelected =
    events.length > 0 &&
    events.every((event) => selectedEventIds.includes(event.eventId));

  const pages = useMemo(
    () => pageItems(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages],
  );

  function setFilter(nextFilter: OddsFilter) {
    updateUrl({ filter: nextFilter, page: 1 });
  }

  function goToPage(page: number) {
    const normalized = Math.min(
      Math.max(page, 1),
      Math.max(1, pagination.totalPages),
    );
    updateUrl({ page: normalized });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    if (!checked) {
      const pageIds = new Set(events.map((event) => event.eventId));
      setSelectedEventIds((current) =>
        current.filter((eventId) => !pageIds.has(eventId)),
      );
      return;
    }

    setSelectedEventIds((current) =>
      Array.from(
        new Set([...current, ...events.map((event) => event.eventId)]),
      ),
    );
  }

  function toggleEventSelection(eventId: string, checked: boolean) {
    setSelectedEventIds((current) => {
      if (checked) {
        return current.includes(eventId) ? current : [...current, eventId];
      }
      return current.filter((id) => id !== eventId);
    });
  }

  async function handleSyncFeed() {
    setSyncing(true);
    try {
      const response = await api.post<{ message: string }>("/admin/odds/sync");
      toast.success(response.data.message);
      await Promise.all([
        loadStats(),
        loadEventList(),
        loadAvailableOddsEvents(),
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to sync odds feed."));
    } finally {
      setSyncing(false);
    }
  }

  async function handleViewOdds(eventId: string) {
    setExpandedEventId((current) => (current === eventId ? "" : eventId));
    if (oddsDetailsByEventId[eventId]) {
      return;
    }
    await loadOddsDetails(eventId);
  }

  async function handleBookmarkSingle(eventId: string) {
    setBookmarkingEventIds((current) => ({ ...current, [eventId]: true }));

    try {
      await api.post(`/admin/odds/${eventId}/bookmark-best`);
      setBookmarkedEventIds((current) => ({ ...current, [eventId]: true }));
      window.setTimeout(() => {
        setBookmarkedEventIds((current) => {
          const next = { ...current };
          delete next[eventId];
          return next;
        });
      }, 2000);

      await Promise.all([loadStats(), loadEventList()]);
      toast.success("Best odds bookmarked.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to bookmark best odds."));
    } finally {
      setBookmarkingEventIds((current) => {
        const next = { ...current };
        delete next[eventId];
        return next;
      });
    }
  }

  async function handleBookmarkBulk() {
    if (!selectedEventIds.length) {
      return;
    }

    if (selectedEventIds.length > 50) {
      toast.error("Maximum 50 events can be bookmarked at once.");
      return;
    }

    setBulkBookmarking(true);
    setBulkProgress({ current: 0, total: selectedEventIds.length });

    try {
      await api.post("/admin/odds/bookmark-bulk", {
        eventIds: selectedEventIds,
      });
      setBulkProgress({
        current: selectedEventIds.length,
        total: selectedEventIds.length,
      });
      setSelectedEventIds([]);
      await Promise.all([loadStats(), loadEventList()]);
      toast.success("Bulk bookmark completed.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Bulk bookmark failed."));
    } finally {
      setBulkBookmarking(false);
      window.setTimeout(() => setBulkProgress({ current: 0, total: 0 }), 1000);
    }
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Odds Control"
        subtitle="Real-time odds monitoring and best-price curation"
        actions={
          <AdminButton
            variant="ghost"
            onClick={() => void handleSyncFeed()}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            {syncing ? "Syncing..." : "Sync Feed"}
          </AdminButton>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <button
          className="text-left"
          type="button"
          onClick={() => setFilter("configured")}
        >
          <AdminCard
            className={`p-3 transition sm:p-4 ${
              activeFilter === "configured"
                ? "border-admin-accent ring-1 ring-admin-accent"
                : ""
            }`}
            interactive
          >
            <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
              Configured Games
            </p>
            <p className="mt-1.5 text-xl font-bold text-admin-blue sm:text-2xl">
              {statsLoading ? "..." : (stats?.totalConfigured ?? 0)}
            </p>
            <p className="mt-1 text-xs text-admin-text-muted">Active events</p>
          </AdminCard>
        </button>
        <button
          className="text-left"
          type="button"
          onClick={() => setFilter("configured-with-odds")}
        >
          <AdminCard
            className={`p-3 transition sm:p-4 ${
              activeFilter === "configured-with-odds"
                ? "border-admin-accent ring-1 ring-admin-accent"
                : ""
            }`}
            interactive
          >
            <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
              With Odds
            </p>
            <p className="mt-1.5 text-xl font-bold text-admin-accent sm:text-2xl">
              {statsLoading ? "..." : (stats?.withOdds ?? 0)}
            </p>
            <p className="mt-1 text-xs text-admin-text-muted">
              Configured + odds
            </p>
          </AdminCard>
        </button>
        <button
          className="text-left"
          type="button"
          onClick={() => setFilter("all-with-odds")}
        >
          <AdminCard
            className={`p-3 transition sm:p-4 ${
              activeFilter === "all-with-odds"
                ? "border-admin-accent ring-1 ring-admin-accent"
                : ""
            }`}
            interactive
          >
            <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
              All With Odds
            </p>
            <p className="mt-1.5 text-xl font-bold text-admin-gold sm:text-2xl">
              {statsLoading ? "..." : (stats?.withOdds ?? 0)}
            </p>
            <p className="mt-1 text-xs text-admin-text-muted">
              Configured or not
            </p>
          </AdminCard>
        </button>
        <AdminCard className="p-3 sm:p-4" interactive>
          <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
            Bookmakers
          </p>
          <p className="mt-1.5 text-xl font-bold text-admin-gold sm:text-2xl">
            {statsLoading ? "..." : (stats?.bookmakers ?? 0)}
          </p>
          <p className="mt-1 text-xs text-admin-text-muted">Visible sources</p>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:gap-3">
        <AdminCard className="space-y-2.5">
          <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
            Select Odds
          </p>
          <Input
            placeholder="Search events with odds..."
            value={oddsDropdownSearch}
            onChange={(event) => setOddsDropdownSearch(event.target.value)}
            className="border-admin-border bg-admin-surface text-admin-text-primary"
          />
          {availableOddsLoading ? (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded bg-admin-surface" />
              <div className="h-8 animate-pulse rounded bg-admin-surface" />
            </div>
          ) : availableOddsError ? (
            <p className="text-xs text-admin-red">{availableOddsError}</p>
          ) : !availableOddsEvents.length ? (
            <p className="text-xs text-admin-text-muted">
              No events with odds found.
            </p>
          ) : (
            <select
              value={selectedEventId}
              onChange={(event) =>
                updateUrl({ eventId: event.target.value, page: 1 })
              }
              className="h-9 w-full rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text-primary font-medium"
            >
              <option value="">All matching events</option>
              {availableOddsEvents.map((event) => (
                <option key={event.eventId} value={event.eventId}>
                  {`${event.homeTeam} vs ${event.awayTeam} (${event.oddsCount ?? event._count?.odds ?? 0} odds)`}
                </option>
              ))}
            </select>
          )}
        </AdminCard>

        <AdminCard className="space-y-2.5">
          <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
            Configured Games
          </p>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted"
              size={14}
            />
            <Input
              placeholder="Search configured games..."
              value={configuredDropdownSearch}
              onChange={(event) =>
                setConfiguredDropdownSearch(event.target.value)
              }
              className="pl-9 border-admin-border bg-admin-surface text-admin-text-primary"
            />
          </div>
          {configuredLoading ? (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded bg-admin-surface" />
              <div className="h-8 animate-pulse rounded bg-admin-surface" />
            </div>
          ) : configuredError ? (
            <p className="text-xs text-admin-red">{configuredError}</p>
          ) : !configuredEvents.length ? (
            <p className="text-xs text-admin-text-muted">
              No configured events found.
            </p>
          ) : (
            <select
              value={selectedEventId}
              onChange={(event) =>
                updateUrl({ eventId: event.target.value, page: 1 })
              }
              className="h-9 w-full rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text-primary font-medium"
            >
              <option value="">All configured events</option>
              {configuredEvents.map((event) => (
                <option key={event.eventId} value={event.eventId}>
                  {`${event.homeTeam} vs ${event.awayTeam} (${event._count?.odds ?? 0} odds)`}
                </option>
              ))}
            </select>
          )}
        </AdminCard>
      </div>

      <AdminCard className="space-y-2.5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted"
            size={14}
          />
          <Input
            placeholder="Search by team or league..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="pl-9 border-admin-border bg-admin-surface text-admin-text-primary"
          />
        </div>

        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-admin-text-muted">
            <input
              checked={allOnPageSelected}
              className="h-4 w-4 rounded border-admin-border bg-admin-surface"
              onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
              type="checkbox"
            />
            Select all in current filter
          </label>
          <AdminButton
            size="sm"
            onClick={() => void handleBookmarkBulk()}
            disabled={bulkBookmarking || selectedEventIds.length === 0}
            className="w-full sm:w-auto"
          >
            {bulkBookmarking ? (
              <>
                <Loader2 className="animate-spin" size={13} />
                {`Bookmarking ${bulkProgress.current} of ${bulkProgress.total}...`}
              </>
            ) : (
              "Bookmark Best for Selected"
            )}
          </AdminButton>
        </div>

        {listError ? (
          <p className="text-sm text-admin-red">{listError}</p>
        ) : null}

        {listLoading ? (
          <div className="space-y-2">
            <div className="h-20 animate-pulse rounded bg-admin-surface" />
            <div className="h-20 animate-pulse rounded bg-admin-surface" />
            <div className="h-20 animate-pulse rounded bg-admin-surface" />
          </div>
        ) : !events.length ? (
          <p className="text-sm text-admin-text-muted">
            No events match the current filter.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const expanded = expandedEventId === event.eventId;
              const oddsDetails = oddsDetailsByEventId[event.eventId];
              const oddsLoading = Boolean(oddsLoadingByEventId[event.eventId]);
              const oddsError = oddsErrorByEventId[event.eventId];

              return (
                <AdminCard
                  key={event.eventId}
                  className="space-y-2.5 border-admin-border bg-admin-surface"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <input
                        checked={selectedEventIds.includes(event.eventId)}
                        className="h-4 w-4 rounded border-admin-border bg-admin-surface"
                        onChange={(checkboxEvent) =>
                          toggleEventSelection(
                            event.eventId,
                            checkboxEvent.target.checked,
                          )
                        }
                        type="checkbox"
                      />
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <StatusBadge status={toBadgeStatus(event.status)} />
                          <span className="rounded-lg bg-admin-accent-dim px-2 py-1 text-[11px] font-semibold text-admin-accent">
                            {event._count.odds} odds
                          </span>
                          <span className="text-[11px] text-admin-text-muted">
                            {event.leagueName ?? "Unknown league"}
                          </span>
                        </div>
                        <p className="text-base font-semibold text-admin-text-primary">
                          {event.homeTeam}{" "}
                          <span className="text-admin-text-muted">vs</span>{" "}
                          {event.awayTeam}
                        </p>
                        <p className="mt-1 text-xs text-admin-text-muted">
                          {new Date(event.commenceTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminButton
                        size="sm"
                        className="px-2.5 sm:px-3.5"
                        variant="ghost"
                        onClick={() => void handleViewOdds(event.eventId)}
                      >
                        <span className="sm:hidden">
                          {expanded ? "Hide" : "Odds"}
                        </span>
                        <span className="hidden sm:inline">
                          {expanded ? "Hide Odds" : "View Odds"}
                        </span>
                      </AdminButton>
                      <AdminButton
                        size="sm"
                        className="px-2.5 sm:px-3.5"
                        onClick={() => void handleBookmarkSingle(event.eventId)}
                        disabled={Boolean(bookmarkingEventIds[event.eventId])}
                      >
                        {bookmarkingEventIds[event.eventId] ? (
                          <Loader2 className="animate-spin" size={13} />
                        ) : bookmarkedEventIds[event.eventId] ? (
                          <>
                            <span className="sm:hidden">Saved ✓</span>
                            <span className="hidden sm:inline">
                              Bookmarked ✓
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="sm:hidden">Bookmark</span>
                            <span className="hidden sm:inline">
                              Bookmark Best
                            </span>
                          </>
                        )}
                      </AdminButton>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="rounded-xl border border-admin-border bg-admin-card p-3">
                      {oddsLoading ? (
                        <div className="space-y-2">
                          <div className="h-8 animate-pulse rounded bg-admin-surface" />
                          <div className="h-8 animate-pulse rounded bg-admin-surface" />
                          <div className="h-8 animate-pulse rounded bg-admin-surface" />
                        </div>
                      ) : oddsError ? (
                        <p className="text-sm text-admin-red">{oddsError}</p>
                      ) : !oddsDetails ? (
                        <p className="text-sm text-admin-text-muted">
                          No odds data available.
                        </p>
                      ) : (
                        <TableShell>
                          <table className={adminTableClassName}>
                            <thead>
                              <tr>
                                {[
                                  "Bookmaker",
                                  "Market",
                                  "Selection",
                                  "Odds",
                                  "Updated",
                                ].map((heading) => (
                                  <th
                                    key={heading}
                                    className={adminTableHeadCellClassName}
                                  >
                                    {heading}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {oddsDetails.markets.flatMap((market) =>
                                market.odds.map((row, index) => (
                                  <tr
                                    key={`${market.marketType}-${row.bookmakerId}-${row.selection}-${index}`}
                                  >
                                    <td
                                      className={`${adminTableCellClassName} text-admin-text-primary`}
                                    >
                                      {row.bookmakerName}
                                    </td>
                                    <td className={adminTableCellClassName}>
                                      {market.marketType}
                                    </td>
                                    <td className={adminTableCellClassName}>
                                      {row.selection}
                                    </td>
                                    <td className={adminTableCellClassName}>
                                      <span
                                        className={
                                          row.isBest
                                            ? "rounded bg-yellow-300 px-2 py-1 font-bold text-black"
                                            : "text-admin-text-secondary"
                                        }
                                      >
                                        {row.odds.toFixed(2)}
                                      </span>
                                    </td>
                                    <td className={adminTableCellClassName}>
                                      {new Date(row.updatedAt).toLocaleString()}
                                    </td>
                                  </tr>
                                )),
                              )}
                            </tbody>
                          </table>
                        </TableShell>
                      )}
                    </div>
                  ) : null}
                </AdminCard>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AdminButton
              variant="ghost"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={!pagination.hasPrev}
            >
              ← Prev
            </AdminButton>
            {pages.map((item, index) =>
              item === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1 text-xs text-admin-text-muted"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => goToPage(Number(item))}
                  type="button"
                  className={`h-8 min-w-8 rounded px-2 text-xs font-semibold ${
                    item === currentPage
                      ? "bg-yellow-300 text-black"
                      : "border border-admin-border text-admin-text-secondary"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
            <AdminButton
              variant="ghost"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={!pagination.hasNext}
            >
              Next →
            </AdminButton>
          </div>

          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const pageNumber = Number(jumpInput);
              if (!Number.isInteger(pageNumber)) {
                toast.error("Enter a valid page number.");
                return;
              }

              if (pageNumber < 1 || pageNumber > pagination.totalPages) {
                toast.error(
                  `Page must be between 1 and ${pagination.totalPages}.`,
                );
                return;
              }

              goToPage(pageNumber);
            }}
          >
            <span className="text-xs text-admin-text-muted">Jump to page</span>
            <Input
              value={jumpInput}
              onChange={(event) => setJumpInput(event.target.value)}
              className="h-8 w-20 border-admin-border bg-admin-surface text-admin-text-primary"
            />
            <AdminButton size="sm" type="submit">
              Go
            </AdminButton>
          </form>
        </div>
      </AdminCard>
    </div>
  );
}
