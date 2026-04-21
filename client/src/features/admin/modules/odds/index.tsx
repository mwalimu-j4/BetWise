import { Fragment, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Loader2,
  RefreshCw,
  Search,
  Trophy,
} from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { api } from "@/api/axiosConfig";
import { Input } from "@/components/ui/input";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  AdminStatCard,
  StatusBadge,
  TableShell,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
    try {
      const response = await api.get<OddsStats>("/admin/odds/stats");
      setStats(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load odds stats."));
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
    <div className="space-y-4">
      <AdminSectionHeader
        title="Odds Control"
        subtitle="Real-time odds monitoring and best-price curation"
        actions={
          <AdminButton
            size="sm"
            variant="ghost"
            className="w-full rounded-full border-admin-border/70 bg-admin-surface/65 text-[11px] font-semibold text-admin-text-primary hover:border-admin-accent/50 hover:bg-admin-accent/10 sm:w-auto"
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

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminStatCard
          label="Configured Events"
          value={(stats?.totalConfigured ?? 0).toLocaleString()}
          icon={CalendarClock}
          tone="blue"
        />
        <AdminStatCard
          label="Events with Odds"
          value={(stats?.withOdds ?? 0).toLocaleString()}
          icon={Zap}
          tone="accent"
        />
        <AdminStatCard
          label="Missing Odds"
          value={(stats?.noOdds ?? 0).toLocaleString()}
          icon={Trophy}
          tone="red"
        />
        <AdminStatCard
          label="Active Bookies"
          value={(stats?.bookmakers ?? 0).toLocaleString()}
          icon={RefreshCw}
          tone="purple"
        />
      </div>

      {/* ── Filters ── */}
      <AdminCard className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {[
              { id: "configured", label: "Configured Only" },
              { id: "configured-with-odds", label: "Configured w/ Odds" },
              { id: "all-with-odds", label: "All w/ Odds" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as OddsFilter)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-tight transition-all",
                  activeFilter === f.id
                    ? "border-admin-accent/30 bg-admin-accent text-black shadow-[0_0_20px_rgba(245,197,24,0.15)]"
                    : "border-white/5 bg-white/[0.03] text-admin-text-muted hover:border-white/10 hover:bg-white/[0.06] hover:text-admin-text-primary",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </AdminCard>

      {/* ── Event selectors: stacked compact panels ── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Select Odds */}
        <AdminCard className="p-2.5 sm:p-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
            Filter by odds event
          </p>
          <div className="flex gap-1.5">
            <Input
              placeholder="Search…"
              value={oddsDropdownSearch}
              onChange={(e) => setOddsDropdownSearch(e.target.value)}
              className="h-8 flex-1 border-admin-border bg-admin-surface text-xs text-admin-text-primary"
            />
            {availableOddsLoading ? (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                <Loader2
                  size={13}
                  className="animate-spin text-admin-text-muted"
                />
              </div>
            ) : null}
          </div>
          {availableOddsError ? (
            <p className="mt-1 text-[10px] text-admin-red">
              {availableOddsError}
            </p>
          ) : (
            <select
              value={selectedEventId}
              onChange={(e) => updateUrl({ eventId: e.target.value, page: 1 })}
              className="mt-1.5 h-8 w-full rounded-lg border border-admin-border bg-admin-surface px-2.5 text-xs text-admin-text-primary"
            >
              <option value="">All matching events</option>
              {availableOddsEvents.map((event) => (
                <option key={event.eventId} value={event.eventId}>
                  {`${event.homeTeam} vs ${event.awayTeam} (${event.oddsCount ?? event._count?.odds ?? 0})`}
                </option>
              ))}
            </select>
          )}
        </AdminCard>

        {/* Configured Games */}
        <AdminCard className="p-2.5 sm:p-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted">
            Filter by configured game
          </p>
          <div className="relative flex gap-1.5">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-admin-text-muted"
              size={12}
            />
            <Input
              placeholder="Search…"
              value={configuredDropdownSearch}
              onChange={(e) => setConfiguredDropdownSearch(e.target.value)}
              className="h-8 flex-1 border-admin-border bg-admin-surface pl-7 text-xs text-admin-text-primary"
            />
            {configuredLoading ? (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                <Loader2
                  size={13}
                  className="animate-spin text-admin-text-muted"
                />
              </div>
            ) : null}
          </div>
          {configuredError ? (
            <p className="mt-1 text-[10px] text-admin-red">{configuredError}</p>
          ) : (
            <select
              value={selectedEventId}
              onChange={(e) => updateUrl({ eventId: e.target.value, page: 1 })}
              className="mt-1.5 h-8 w-full rounded-lg border border-admin-border bg-admin-surface px-2.5 text-xs text-admin-text-primary"
            >
              <option value="">All configured events</option>
              {configuredEvents.map((event) => (
                <option key={event.eventId} value={event.eventId}>
                  {`${event.homeTeam} vs ${event.awayTeam} (${event._count?.odds ?? 0})`}
                </option>
              ))}
            </select>
          )}
        </AdminCard>
      </div>

      {/* ── Main events panel ── */}
      <AdminCard className="space-y-3 p-2.5 sm:p-3">
        {/* Search + bulk toolbar in one tight row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-admin-text-muted"
              size={13}
            />
            <Input
              placeholder="Search by team or league…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 pl-8 border-admin-border bg-admin-surface text-xs text-admin-text-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex shrink-0 items-center gap-1.5 text-xs text-admin-text-muted">
              <input
                checked={allOnPageSelected}
                className="h-3.5 w-3.5 rounded border-admin-border bg-admin-surface"
                onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                type="checkbox"
              />
              <span className="hidden sm:inline">Select all</span>
              <span className="sm:hidden">All</span>
            </label>
            <AdminButton
              size="sm"
              onClick={() => void handleBookmarkBulk()}
              disabled={bulkBookmarking || selectedEventIds.length === 0}
              className="shrink-0 text-xs"
            >
              {bulkBookmarking ? (
                <div className="flex items-center gap-2">
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full animate-pulse bg-admin-accent"
                      style={{
                        width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  {`${bulkProgress.current}/${bulkProgress.total}`}
                </div>
              ) : (
                <>
                  <span className="hidden sm:inline">
                    Bookmark Best for Selected
                  </span>
                  <span className="sm:hidden">Bookmark Selected</span>
                </>
              )}
            </AdminButton>
          </div>
        </div>

        {listError ? (
          <p className="text-sm text-admin-red">{listError}</p>
        ) : null}

        <AdminCard className="overflow-hidden p-0">
          {listLoading && !events.length ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-admin-accent" />
            </div>
          ) : !events.length ? (
            <div className="py-20 text-center">
              <Trophy className="mx-auto h-8 w-8 mb-3 text-admin-text-muted opacity-50" />
              <p className="text-sm text-admin-text-muted">
                No events match the current filter.
              </p>
            </div>
          ) : (
            <TableShell>
              <table className={adminTableClassName}>
                <thead>
                  <tr>
                    <th
                      className={cn(
                        adminTableHeadCellClassName,
                        "w-10 text-center",
                      )}
                    >
                      <input
                        checked={
                          selectedEventIds.length === events.length &&
                          events.length > 0
                        }
                        className="size-3.5 rounded border-admin-border bg-admin-surface accent-admin-accent"
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedEventIds(events.map((ev) => ev.eventId));
                          else setSelectedEventIds([]);
                        }}
                        type="checkbox"
                      />
                    </th>
                    <th className={adminTableHeadCellClassName}>Status</th>
                    <th className={adminTableHeadCellClassName}>Event</th>
                    <th
                      className={cn(
                        adminTableHeadCellClassName,
                        "text-center w-24",
                      )}
                    >
                      Odds
                    </th>
                    <th
                      className={cn(
                        adminTableHeadCellClassName,
                        "text-right w-40",
                      )}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {events.map((event) => {
                    const expanded = expandedEventId === event.eventId;
                    const oddsDetails = oddsDetailsByEventId[event.eventId];
                    const oddsLoading = Boolean(
                      oddsLoadingByEventId[event.eventId],
                    );
                    const oddsError = oddsErrorByEventId[event.eventId];

                    return (
                      <Fragment key={event.eventId}>
                        <tr
                          className={cn(
                            "group transition-colors duration-200",
                            expanded
                              ? "bg-white/[0.04]"
                              : "hover:bg-white/[0.02]",
                          )}
                        >
                          <td
                            className={cn(
                              adminTableCellClassName,
                              "w-10 text-center",
                            )}
                          >
                            <input
                              checked={selectedEventIds.includes(event.eventId)}
                              className="size-3.5 rounded border-admin-border bg-admin-surface accent-admin-accent"
                              onChange={(e) =>
                                toggleEventSelection(
                                  event.eventId,
                                  e.target.checked,
                                )
                              }
                              type="checkbox"
                            />
                          </td>
                          <td className={cn(adminTableCellClassName, "w-24")}>
                            <StatusBadge status={toBadgeStatus(event.status)} />
                          </td>
                          <td className={adminTableCellClassName}>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-admin-text-primary leading-tight">
                                {event.homeTeam} vs {event.awayTeam}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-admin-text-muted">
                                <span>
                                  {event.leagueName ?? "Unknown league"}
                                </span>
                                <span>•</span>
                                <span>
                                  {new Date(
                                    event.commenceTime,
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td
                            className={cn(
                              adminTableCellClassName,
                              "text-center",
                            )}
                          >
                            <span className="rounded bg-admin-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-admin-accent border border-admin-accent/20">
                              {event._count.odds}
                            </span>
                          </td>
                          <td
                            className={cn(
                              adminTableCellClassName,
                              "text-right",
                            )}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-[11px] text-admin-text-primary hover:bg-white/5"
                                onClick={() =>
                                  void handleViewOdds(event.eventId)
                                }
                              >
                                {expanded ? "Hide" : "View"}
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  bookmarkedEventIds[event.eventId]
                                    ? "ghost"
                                    : "outline"
                                }
                                className={cn(
                                  "h-7 px-2 text-[11px] transition-all",
                                  bookmarkedEventIds[event.eventId]
                                    ? "text-admin-accent bg-admin-accent/5 hover:bg-admin-accent/10"
                                    : "border-admin-border text-admin-text-primary hover:bg-white/5",
                                )}
                                onClick={() =>
                                  void handleBookmarkSingle(event.eventId)
                                }
                                disabled={Boolean(
                                  bookmarkingEventIds[event.eventId],
                                )}
                              >
                                {bookmarkingEventIds[event.eventId] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : bookmarkedEventIds[event.eventId] ? (
                                  "Saved ✓"
                                ) : (
                                  "Bookmark"
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {expanded && (
                          <tr className="bg-white/[0.04]">
                            <td
                              colSpan={5}
                              className="px-3 py-3 border-t border-white/5"
                            >
                              <div className="rounded-lg border border-white/5 bg-[#0b1426]/50 p-3 shadow-inner">
                                {oddsLoading ? (
                                  <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-admin-accent" />
                                  </div>
                                ) : oddsError ? (
                                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                                    <p className="text-xs text-red-400 text-center">
                                      {oddsError}
                                    </p>
                                  </div>
                                ) : !oddsDetails ? (
                                  <p className="text-xs text-admin-text-muted text-center py-4">
                                    No odds data available.
                                  </p>
                                ) : (
                                  <TableShell>
                                    <table
                                      className={cn(
                                        adminTableClassName,
                                        "text-[11px]",
                                      )}
                                    >
                                      <thead>
                                        <tr>
                                          <th
                                            className={
                                              adminTableHeadCellClassName
                                            }
                                          >
                                            Bookmaker
                                          </th>
                                          <th
                                            className={
                                              adminTableHeadCellClassName
                                            }
                                          >
                                            Market
                                          </th>
                                          <th
                                            className={
                                              adminTableHeadCellClassName
                                            }
                                          >
                                            Selection
                                          </th>
                                          <th
                                            className={cn(
                                              adminTableHeadCellClassName,
                                              "w-16",
                                            )}
                                          >
                                            Odds
                                          </th>
                                          <th
                                            className={
                                              adminTableHeadCellClassName
                                            }
                                          >
                                            Updated
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5">
                                        {oddsDetails.markets.flatMap((market) =>
                                          market.odds.map((row, index) => (
                                            <tr
                                              key={`${market.marketType}-${row.bookmakerId}-${row.selection}-${index}`}
                                            >
                                              <td
                                                className={
                                                  adminTableCellClassName
                                                }
                                              >
                                                {row.bookmakerName}
                                              </td>
                                              <td
                                                className={
                                                  adminTableCellClassName
                                                }
                                              >
                                                {market.marketType}
                                              </td>
                                              <td
                                                className={
                                                  adminTableCellClassName
                                                }
                                              >
                                                {row.selection}
                                              </td>
                                              <td
                                                className={
                                                  adminTableCellClassName
                                                }
                                              >
                                                <span
                                                  className={
                                                    row.isBest
                                                      ? "font-bold text-admin-accent"
                                                      : ""
                                                  }
                                                >
                                                  {row.odds.toFixed(2)}
                                                </span>
                                              </td>
                                              <td
                                                className={
                                                  adminTableCellClassName
                                                }
                                              >
                                                {new Date(
                                                  row.updatedAt,
                                                ).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                  second: "2-digit",
                                                })}
                                              </td>
                                            </tr>
                                          )),
                                        )}
                                      </tbody>
                                    </table>
                                  </TableShell>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </TableShell>
          )}
        </AdminCard>

        {/* Pagination */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full overflow-x-auto pb-1 [scrollbar-width:thin]">
            <div className="inline-flex min-w-max items-center gap-1.5">
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={!pagination.hasPrev}
                className="text-xs"
              >
                ← Prev
              </AdminButton>
              {pages.map((item, index) =>
                item === "..." ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-xs text-admin-text-muted"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => goToPage(Number(item))}
                    type="button"
                    className={`h-7 min-w-7 rounded px-1.5 text-xs font-semibold ${
                      item === currentPage
                        ? "bg-admin-accent text-black"
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
                className="text-xs"
              >
                Next →
              </AdminButton>
            </div>
          </div>

          <form
            className="flex shrink-0 items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
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
            <span className="text-xs text-admin-text-muted">Page</span>
            <Input
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              className="h-7 w-14 border-admin-border bg-admin-surface text-center text-xs text-admin-text-primary"
            />
            <AdminButton size="sm" type="submit" className="text-xs">
              Go
            </AdminButton>
          </form>
        </div>
      </AdminCard>
    </div>
  );
}
