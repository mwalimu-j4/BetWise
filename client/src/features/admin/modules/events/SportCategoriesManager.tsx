import { api } from "@/api/axiosConfig";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCw,
  RotateCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminSectionHeader,
  StatusBadge,
} from "../../components/ui";

type SportCategory = {
  id: string;
  sportKey: string;
  displayName: string;
  icon: string;
  isActive: boolean;
  showInNav: boolean;
  sortOrder: number;
  eventCount: number;
  liveEventCount: number;
  upcomingEventCount: number;
  configuredCount: number;
  lastSyncedAt: string | null;
};

type SportCategoryEvent = {
  id: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string | null;
  commenceTime: string;
  status: "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
  configured: boolean;
  odds: {
    home: number | null;
    draw: number | null;
    away: number | null;
  };
};

type EventFilter =
  | "all"
  | "live"
  | "upcoming"
  | "configured"
  | "not_configured";

type EventsBySport = Record<string, SportCategoryEvent[]>;
type LoadingMap = Record<string, boolean>;
type SelectionMap = Record<string, string[]>;
type FilterMap = Record<string, EventFilter>;

const EVENT_FILTERS: Array<{ key: EventFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "configured", label: "Configured" },
  { key: "not_configured", label: "Not Configured" },
];

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const message = (error as { response?: { data?: { message?: string } } })
      .response?.data?.message;
    if (message) {
      return message;
    }
  }

  return fallback;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSyncedAt(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatOdds(value: number | null) {
  return value === null ? "-" : value.toFixed(2);
}

function getSportMonogram(label: string) {
  return label
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function SportCategoriesManager() {
  const [categories, setCategories] = useState<SportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncAllRunning, setSyncAllRunning] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [selectedSportKeys, setSelectedSportKeys] = useState<string[]>([]);
  const [expandedSportKey, setExpandedSportKey] = useState<string>("");
  const [eventsBySport, setEventsBySport] = useState<EventsBySport>({});
  const [eventsLoadingBySport, setEventsLoadingBySport] = useState<LoadingMap>(
    {},
  );
  const [syncingBySport, setSyncingBySport] = useState<LoadingMap>({});
  const [configuringBySport, setConfiguringBySport] = useState<LoadingMap>({});
  const [configuringByEvent, setConfiguringByEvent] = useState<LoadingMap>({});
  const [eventSelectionBySport, setEventSelectionBySport] =
    useState<SelectionMap>({});
  const [filterBySport, setFilterBySport] = useState<FilterMap>({});

  const allSelected =
    categories.length > 0 &&
    categories.every((category) =>
      selectedSportKeys.includes(category.sportKey),
    );

  const expandedCategory = useMemo(
    () =>
      categories.find((category) => category.sportKey === expandedSportKey) ??
      null,
    [categories, expandedSportKey],
  );

  const visibleExpandedEvents = expandedSportKey
    ? eventsBySport[expandedSportKey] ?? []
    : [];
  const selectedExpandedEventIds = expandedSportKey
    ? eventSelectionBySport[expandedSportKey] ?? []
    : [];
  const allExpandedEventsSelected =
    visibleExpandedEvents.length > 0 &&
    visibleExpandedEvents.every((event) =>
      selectedExpandedEventIds.includes(event.eventId),
    );

  async function loadCategories(options?: { background?: boolean }) {
    if (options?.background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get<{
        categories: SportCategory[];
      }>("/admin/sport-categories");

      setCategories(response.data.categories);
      setSelectedSportKeys((current) =>
        current.filter((sportKey) =>
          response.data.categories.some((category) => category.sportKey === sportKey),
        ),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load sport categories."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function replaceCategory(nextCategory: SportCategory) {
    setCategories((current) =>
      current.map((category) =>
        category.sportKey === nextCategory.sportKey ? nextCategory : category,
      ),
    );
  }

  function replaceCategories(nextCategories: SportCategory[]) {
    const categoryMap = new Map(
      nextCategories.map((category) => [category.sportKey, category]),
    );
    setCategories((current) =>
      current.map((category) => categoryMap.get(category.sportKey) ?? category),
    );
  }

  async function loadEvents(sportKey: string, filter?: EventFilter) {
    const effectiveFilter = filter ?? filterBySport[sportKey] ?? "all";
    setEventsLoadingBySport((current) => ({ ...current, [sportKey]: true }));

    try {
      const response = await api.get<{ events: SportCategoryEvent[] }>(
        `/admin/sport-categories/${sportKey}/events`,
        {
          params: { filter: effectiveFilter },
        },
      );

      setEventsBySport((current) => ({
        ...current,
        [sportKey]: response.data.events,
      }));
      setEventSelectionBySport((current) => ({
        ...current,
        [sportKey]: (current[sportKey] ?? []).filter((eventId) =>
          response.data.events.some((event) => event.eventId === eventId),
        ),
      }));
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load sport events."));
    } finally {
      setEventsLoadingBySport((current) => ({ ...current, [sportKey]: false }));
    }
  }

  async function syncSport(sportKey: string, options?: { silent?: boolean }) {
    setSyncingBySport((current) => ({ ...current, [sportKey]: true }));

    try {
      const response = await api.post<{
        category: SportCategory;
        syncedCount: number;
      }>(`/admin/sport-categories/${sportKey}/sync`);
      replaceCategory(response.data.category);

      if (expandedSportKey === sportKey) {
        await loadEvents(sportKey);
      }

      if (!options?.silent) {
        toast.success(
          `${response.data.category.displayName} synced (${response.data.syncedCount.toLocaleString()} events).`,
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error, `Unable to sync ${sportKey}.`));
    } finally {
      setSyncingBySport((current) => ({ ...current, [sportKey]: false }));
    }
  }

  async function handleSyncAll() {
    if (syncAllRunning || categories.length === 0) {
      return;
    }

    setSyncAllRunning(true);
    try {
      for (const [index, category] of categories.entries()) {
        setSyncProgress(
          `Syncing ${category.displayName}... (${index + 1}/${categories.length})`,
        );
        await syncSport(category.sportKey, { silent: true });
      }

      toast.success("All sport categories synced.");
    } finally {
      setSyncAllRunning(false);
      setSyncProgress("");
    }
  }

  async function handleConfigureSelectedSports() {
    if (selectedSportKeys.length === 0) {
      return;
    }

    setRefreshing(true);
    try {
      const response = await api.post<{
        updatedCount: number;
        categories: SportCategory[];
      }>("/admin/sport-categories/configure-selected", {
        sportKeys: selectedSportKeys,
      });

      replaceCategories(response.data.categories);
      setSelectedSportKeys([]);

      if (expandedSportKey && selectedSportKeys.includes(expandedSportKey)) {
        await loadEvents(expandedSportKey);
      }

      toast.success(
        `Configured ${response.data.updatedCount.toLocaleString()} events across selected sports.`,
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to configure selected sport categories."),
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function handleConfigureSport(
    sportKey: string,
    eventIds?: string[],
    options?: { eventId?: string },
  ) {
    if (configuringBySport[sportKey]) {
      return;
    }

    setConfiguringBySport((current) => ({ ...current, [sportKey]: true }));
    if (options?.eventId) {
      setConfiguringByEvent((current) => ({ ...current, [options.eventId!]: true }));
    }

    try {
      const response = await api.post<{
        updatedCount: number;
        category: SportCategory;
      }>(`/admin/sport-categories/${sportKey}/configure`, {
        eventIds,
      });

      replaceCategory(response.data.category);
      await loadEvents(sportKey);
      setEventSelectionBySport((current) => ({
        ...current,
        [sportKey]: [],
      }));

      toast.success(
        `Configured ${response.data.updatedCount.toLocaleString()} ${response.data.updatedCount === 1 ? "event" : "events"}.`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to configure events."));
    } finally {
      setConfiguringBySport((current) => ({ ...current, [sportKey]: false }));
      if (options?.eventId) {
        setConfiguringByEvent((current) => ({
          ...current,
          [options.eventId!]: false,
        }));
      }
    }
  }

  async function handleExpandSport(sportKey: string) {
    const nextSportKey = expandedSportKey === sportKey ? "" : sportKey;
    setExpandedSportKey(nextSportKey);

    if (!nextSportKey) {
      return;
    }

    if (!eventsBySport[nextSportKey]) {
      await loadEvents(nextSportKey);
    }
  }

  function toggleSportSelection(sportKey: string, checked: boolean) {
    setSelectedSportKeys((current) =>
      checked
        ? current.includes(sportKey)
          ? current
          : [...current, sportKey]
        : current.filter((key) => key !== sportKey),
    );
  }

  function toggleAllSportsSelection(checked: boolean) {
    setSelectedSportKeys(checked ? categories.map((category) => category.sportKey) : []);
  }

  function toggleEventSelection(sportKey: string, eventId: string, checked: boolean) {
    setEventSelectionBySport((current) => {
      const nextSelection = current[sportKey] ?? [];
      return {
        ...current,
        [sportKey]: checked
          ? nextSelection.includes(eventId)
            ? nextSelection
            : [...nextSelection, eventId]
          : nextSelection.filter((selectedId) => selectedId !== eventId),
      };
    });
  }

  function toggleSelectAllExpandedEvents(checked: boolean) {
    if (!expandedSportKey) {
      return;
    }

    setEventSelectionBySport((current) => ({
      ...current,
      [expandedSportKey]: checked
        ? visibleExpandedEvents.map((event) => event.eventId)
        : [],
    }));
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  return (
    <div className="space-y-3">
      <AdminSectionHeader
        title="Sport Categories"
        subtitle="Sync upcoming and live events by sport, review them, and configure entire sports or specific fixtures without leaving the page."
        actions={
          <div className="grid w-full gap-1.5 sm:flex sm:w-auto sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadCategories({ background: true })}
              disabled={refreshing}
              className="border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface"
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
              onClick={() => void handleSyncAll()}
              disabled={syncAllRunning || categories.length === 0}
              className="bg-admin-blue text-black hover:bg-admin-blue/90"
            >
              {syncAllRunning ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RotateCw className="size-3.5" />
              )}
              Sync All from API
            </Button>
          </div>
        }
      />

      <Card className="border-admin-border bg-admin-card shadow-sm">
        <CardContent className="space-y-2 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-admin-text-muted">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) =>
                    toggleAllSportsSelection(event.target.checked)
                  }
                />
                Select All
              </label>
              <button
                type="button"
                onClick={() => setSelectedSportKeys([])}
                className="font-medium text-admin-blue hover:text-admin-text-primary"
              >
                Deselect All
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => void handleConfigureSelectedSports()}
                disabled={selectedSportKeys.length === 0 || refreshing}
                className="bg-admin-accent text-black hover:bg-admin-accent/90"
              >
                <CheckCircle2 className="size-3.5" />
                Configure Selected ({selectedSportKeys.length})
              </Button>
            </div>
          </div>

          {syncProgress ? (
            <div className="rounded-lg border border-admin-blue/25 bg-admin-blue/10 px-3 py-2 text-xs font-medium text-admin-text-primary">
              {syncProgress}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`sport-category-skeleton-${index}`}
              className="h-36 animate-pulse rounded-xl border border-admin-border bg-admin-card"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => {
            const expanded = expandedSportKey === category.sportKey;
            const syncing = syncingBySport[category.sportKey] ?? false;

            return (
              <Card
                key={category.sportKey}
                className={cn(
                  "border-admin-border bg-admin-card shadow-sm transition hover:border-admin-border/80",
                  expanded && "border-admin-accent/45",
                )}
              >
                <CardContent className="space-y-2.5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <label
                      className="inline-flex items-center gap-2 text-xs text-admin-text-muted"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSportKeys.includes(category.sportKey)}
                        onChange={(event) =>
                          toggleSportSelection(
                            category.sportKey,
                            event.target.checked,
                          )
                        }
                      />
                      Select
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        void syncSport(category.sportKey);
                      }}
                      disabled={syncing}
                      className="size-8 border-admin-border bg-admin-surface text-admin-text-primary hover:bg-admin-card"
                    >
                      {syncing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCw className="size-3.5" />
                      )}
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleExpandSport(category.sportKey)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-admin-accent/15 text-xs font-bold text-admin-accent">
                        {getSportMonogram(category.displayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold leading-tight text-admin-text-primary sm:text-[15px]">
                              {category.displayName}
                            </p>
                            <p className="text-xs text-admin-text-muted">
                              {category.eventCount.toLocaleString()} events
                            </p>
                          </div>
                          <div className="scale-90 origin-top-right">
                            <StatusBadge
                              status={category.isActive ? "active" : "suspended"}
                            />
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge className="px-2 py-0.5 text-[10px] bg-admin-live/15 text-admin-live">
                            {category.liveEventCount.toLocaleString()} LIVE
                          </Badge>
                          <Badge className="px-2 py-0.5 text-[10px] bg-admin-blue/15 text-admin-blue">
                            {category.upcomingEventCount.toLocaleString()} Upcoming
                          </Badge>
                          <Badge className="px-2 py-0.5 text-[10px] bg-admin-accent/15 text-admin-accent">
                            {category.configuredCount.toLocaleString()} Configured
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-admin-text-muted">
                          <span>Synced: {formatSyncedAt(category.lastSyncedAt)}</span>
                          <ChevronDown
                            className={cn(
                              "size-4 transition",
                              expanded && "rotate-180",
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {expandedCategory ? (
        <Card className="border-admin-border bg-admin-card shadow-sm">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-lg font-semibold text-admin-text-primary">
                  {expandedCategory.displayName} events
                </p>
                <p className="text-xs text-admin-text-muted">
                  Review live and upcoming fixtures, then configure single events or the whole sport in one shot.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {EVENT_FILTERS.map((filter) => {
                  const active = (filterBySport[expandedSportKey] ?? "all") === filter.key;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => {
                        setFilterBySport((current) => ({
                          ...current,
                          [expandedSportKey]: filter.key,
                        }));
                        void loadEvents(expandedSportKey, filter.key);
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition",
                        active
                          ? "border-admin-accent bg-admin-accent text-black"
                          : "border-admin-border bg-admin-surface text-admin-text-secondary hover:bg-admin-card hover:text-admin-text-primary",
                      )}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-admin-border/60 bg-admin-surface/20 px-3 py-2 text-xs text-admin-text-muted lg:flex-row lg:items-center lg:justify-between">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allExpandedEventsSelected}
                  onChange={(event) =>
                    toggleSelectAllExpandedEvents(event.target.checked)
                  }
                />
                Select All
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    void handleConfigureSport(
                      expandedSportKey,
                      selectedExpandedEventIds,
                    )
                  }
                  disabled={
                    selectedExpandedEventIds.length === 0 ||
                    configuringBySport[expandedSportKey]
                  }
                  className="bg-admin-accent text-black hover:bg-admin-accent/90"
                >
                  Configure Selected ({selectedExpandedEventIds.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleConfigureSport(expandedSportKey)}
                  disabled={configuringBySport[expandedSportKey]}
                  className="border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface"
                >
                  Configure All
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-[32rem] rounded-xl border border-admin-border/70">
              <table className="min-w-full text-left text-xs text-admin-text-secondary">
                <thead className="bg-admin-surface/50 text-[11px] uppercase tracking-[0.08em] text-admin-text-muted">
                  <tr>
                    <th className="px-3 py-2">Pick</th>
                    <th className="px-3 py-2">Teams</th>
                    <th className="px-3 py-2">League</th>
                    <th className="px-3 py-2">Date & Time</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Odds</th>
                    <th className="px-3 py-2">Configured</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsLoadingBySport[expandedSportKey] ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr
                        key={`expanded-sport-loading-${index}`}
                        className="border-t border-admin-border/60"
                      >
                        <td colSpan={8} className="px-3 py-3">
                          <div className="h-8 animate-pulse rounded-lg bg-admin-surface/60" />
                        </td>
                      </tr>
                    ))
                  ) : visibleExpandedEvents.length > 0 ? (
                    visibleExpandedEvents.map((event) => (
                      <tr
                        key={event.eventId}
                        className="border-t border-admin-border/60"
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedExpandedEventIds.includes(event.eventId)}
                            onChange={(inputEvent) =>
                              toggleEventSelection(
                                expandedSportKey,
                                event.eventId,
                                inputEvent.target.checked,
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-3 text-admin-text-primary">
                          {event.homeTeam} vs {event.awayTeam}
                        </td>
                        <td className="px-3 py-3">
                          {event.leagueName ?? "Unknown league"}
                        </td>
                        <td className="px-3 py-3">
                          {formatDateTime(event.commenceTime)}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge
                            status={event.status === "LIVE" ? "live" : "upcoming"}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="border-admin-border">
                              H {formatOdds(event.odds.home)}
                            </Badge>
                            <Badge variant="outline" className="border-admin-border">
                              D {formatOdds(event.odds.draw)}
                            </Badge>
                            <Badge variant="outline" className="border-admin-border">
                              A {formatOdds(event.odds.away)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            className={cn(
                              event.configured
                                ? "bg-admin-accent/15 text-admin-accent"
                                : "bg-admin-border/20 text-admin-text-muted",
                            )}
                          >
                            {event.configured ? "Yes" : "No"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button
                            size="sm"
                            onClick={() =>
                              void handleConfigureSport(
                                expandedSportKey,
                                [event.eventId],
                                { eventId: event.eventId },
                              )
                            }
                            disabled={configuringByEvent[event.eventId]}
                            className="bg-admin-accent text-black hover:bg-admin-accent/90"
                          >
                            {configuringByEvent[event.eventId] ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : null}
                            Configure
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-admin-border/60">
                      <td
                        colSpan={8}
                        className="px-3 py-10 text-center text-sm text-admin-text-muted"
                      >
                        No events available for this filter right now.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
