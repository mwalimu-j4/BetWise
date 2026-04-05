import { useEffect, useMemo, useState } from "react";
import {
  Edit,
  Lock,
  Plus,
  RefreshCw,
  Unlock,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/axiosConfig";
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
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  InlinePill,
  StatusBadge,
  TableShell,
  adminCompactActionsClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";

interface ApiOddsGroup {
  eventId: string;
  bookmakers: Array<{
    bookmakerId: string;
    bookmakerName: string;
    markets: Array<{
      marketType: string;
      outcomes: Array<{
        side: string;
        rawOdds: number;
        displayOdds: number;
        isVisible: boolean;
      }>;
    }>;
  }>;
}

interface ConfiguredEvent {
  id: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string | null;
  sportKey: string | null;
  commenceTime: string;
  status: "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
  houseMargin: number;
  marketsEnabled: string[];
  _count: {
    displayedOdds: number;
    bets: number;
  };
}

interface ConfiguredEventsResponse {
  events: ConfiguredEvent[];
  total: number;
}

interface OddsStats {
  totalConfigured: number;
  withOdds: number;
  noOdds: number;
  autoSelected: number;
  bookmakers: number;
}

type OddsTableRow = {
  bookmakerId: string;
  bookmakerName: string;
  event: string;
  market: string;
  selectionOne: string;
  oddsOne: string;
  selectionTwo: string;
  oddsTwo: string;
  selectionThree: string;
  oddsThree: string;
  margin: string;
  status: "active" | "suspended";
  outcomes: Array<{
    side: string;
    rawOdds: number;
    displayOdds: number;
    isVisible: boolean;
  }>;
};

type MovementDirection = "up" | "down";

function findOutcome(outcomes: OddsTableRow["outcomes"], sideNames: string[]) {
  return outcomes.find((outcome) => sideNames.includes(outcome.side));
}

function getSportEmoji(sportKey: string | null) {
  if (!sportKey) return "🏟️";
  if (sportKey.includes("soccer")) return "⚽";
  if (sportKey.includes("basketball")) return "🏀";
  if (sportKey.includes("football")) return "🏈";
  if (sportKey.includes("tennis")) return "🎾";
  return "🏟️";
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

function marginTone(margin: number) {
  if (margin < 3) {
    return { className: "text-green-400", label: "Low" };
  }

  if (margin <= 6) {
    return { className: "text-yellow-400", label: "Standard" };
  }

  return { className: "text-red-400", label: "High" };
}

export default function Odds() {
  const [events, setEvents] = useState<ConfiguredEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [oddsRows, setOddsRows] = useState<OddsTableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [autoSelecting, setAutoSelecting] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<OddsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedOdds, setSelectedOdds] = useState<OddsTableRow | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [editMargin, setEditMargin] = useState("");
  const [customOdds, setCustomOdds] = useState<Record<string, string>>({});
  const [previousOddsByKey, setPreviousOddsByKey] = useState<
    Record<string, number>
  >({});
  const [movementByKey, setMovementByKey] = useState<
    Record<string, MovementDirection>
  >({});

  const selectedEvent = useMemo(
    () => events.find((event) => event.eventId === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) {
      return events;
    }

    return events.filter((event) => {
      return (
        event.homeTeam.toLowerCase().includes(q) ||
        event.awayTeam.toLowerCase().includes(q) ||
        (event.leagueName ?? "").toLowerCase().includes(q)
      );
    });
  }, [events, eventSearch]);

  const groupedFilteredEvents = useMemo(() => {
    return filteredEvents.reduce<Record<string, ConfiguredEvent[]>>(
      (accumulator, event) => {
        const league = event.leagueName ?? "Unknown league";
        accumulator[league] = accumulator[league] ?? [];
        accumulator[league].push(event);
        return accumulator;
      },
      {},
    );
  }, [filteredEvents]);

  const bestOddsByColumn = useMemo(() => {
    const visibleRows = oddsRows.filter((row) =>
      row.outcomes.some((outcome) => outcome.isVisible),
    );

    const maxFor = (selector: (row: OddsTableRow) => number | null) => {
      const values = visibleRows
        .map(selector)
        .filter((value): value is number => value !== null && value > 0);

      return values.length ? Math.max(...values) : null;
    };

    return {
      one: maxFor((row) => {
        const value = Number(row.oddsOne);
        return Number.isFinite(value) ? value : null;
      }),
      two: maxFor((row) => {
        const value = Number(row.oddsTwo);
        return Number.isFinite(value) ? value : null;
      }),
      three: maxFor((row) => {
        const value = Number(row.oddsThree);
        return Number.isFinite(value) ? value : null;
      }),
    };
  }, [oddsRows]);

  function movementKey(
    bookmakerId: string,
    marketType: string,
    side: string,
  ): string {
    return `${bookmakerId}::${marketType}::${side}`;
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const response = await api.get<OddsStats>("/admin/odds/stats");
      setStats(response.data);
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load odds stats.");
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadConfiguredEvents() {
    setEventsLoading(true);

    try {
      const response = await api.get<ConfiguredEventsResponse>(
        "/admin/events/configured",
      );

      setEvents(response.data.events);
    } catch (requestError) {
      console.error(requestError);
      const message = getErrorMessage(
        requestError,
        "Unable to load configured games.",
      );
      setError(message);
      toast.error(message);
    } finally {
      setEventsLoading(false);
    }
  }

  function mapOddsToRows(
    data: ApiOddsGroup,
    currentEvent: ConfiguredEvent | null,
  ) {
    return data.bookmakers.map<OddsTableRow>((bookmaker) => {
      const h2hMarket = bookmaker.markets.find(
        (market) => market.marketType === "h2h",
      );
      const outcomes = h2hMarket?.outcomes ?? [];
      const homeOutcome = currentEvent
        ? findOutcome(outcomes, [currentEvent.homeTeam])
        : outcomes[0];
      const drawOutcome = findOutcome(outcomes, ["Draw"]);
      const awayOutcome = currentEvent
        ? findOutcome(outcomes, [currentEvent.awayTeam])
        : outcomes.find(
            (outcome) => outcome !== homeOutcome && outcome !== drawOutcome,
          );
      const marginValue = outcomes.reduce((sum, outcome) => {
        if (!outcome.displayOdds) return sum;
        return sum + 1 / outcome.displayOdds;
      }, 0);

      return {
        bookmakerId: bookmaker.bookmakerId,
        bookmakerName: bookmaker.bookmakerName,
        event: currentEvent
          ? `${currentEvent.homeTeam} vs ${currentEvent.awayTeam}`
          : data.eventId,
        market: "h2h",
        selectionOne: homeOutcome?.side ?? "-",
        oddsOne: homeOutcome ? String(homeOutcome.displayOdds) : "-",
        selectionTwo: drawOutcome?.side ?? "Draw",
        oddsTwo: drawOutcome ? String(drawOutcome.displayOdds) : "-",
        selectionThree: awayOutcome?.side ?? "-",
        oddsThree: awayOutcome ? String(awayOutcome.displayOdds) : "-",
        margin: `${Math.max((marginValue - 1) * 100, 0).toFixed(1)}%`,
        status: outcomes.some((outcome) => !outcome.isVisible)
          ? "suspended"
          : "active",
        outcomes,
      };
    });
  }

  async function loadOdds(
    eventId: string,
    options?: { trackMovement?: boolean },
  ) {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<ApiOddsGroup>(`/admin/odds/${eventId}`);

      const nextOddsByKey = response.data.bookmakers.reduce<
        Record<string, number>
      >((accumulator, bookmaker) => {
        bookmaker.markets.forEach((market) => {
          market.outcomes.forEach((outcome) => {
            accumulator[
              movementKey(
                bookmaker.bookmakerId,
                market.marketType,
                outcome.side,
              )
            ] = outcome.displayOdds;
          });
        });
        return accumulator;
      }, {});

      if (options?.trackMovement) {
        const nextMovementByKey = Object.entries(nextOddsByKey).reduce<
          Record<string, MovementDirection>
        >((accumulator, [key, nextValue]) => {
          const previousValue = previousOddsByKey[key];
          if (typeof previousValue !== "number") {
            return accumulator;
          }

          if (nextValue > previousValue) {
            accumulator[key] = "up";
          } else if (nextValue < previousValue) {
            accumulator[key] = "down";
          }

          return accumulator;
        }, {});

        setMovementByKey(nextMovementByKey);
      } else {
        setMovementByKey({});
      }

      setPreviousOddsByKey(nextOddsByKey);
      setOddsRows(mapOddsToRows(response.data, selectedEvent));
    } catch (requestError) {
      console.error(requestError);
      const message = getErrorMessage(
        requestError,
        "Unable to load odds for this event.",
      );
      setError(message);
      toast.error(message);
      setOddsRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadConfiguredEvents(), loadStats()]);
  }, []);

  useEffect(() => {
    const statsInterval = window.setInterval(() => {
      void loadStats();
    }, 60000);

    return () => {
      window.clearInterval(statsInterval);
    };
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setOddsRows([]);
      setPreviousOddsByKey({});
      setMovementByKey({});
      return;
    }

    void loadOdds(selectedEventId);
  }, [selectedEventId, selectedEvent]);

  useEffect(() => {
    if (!selectedEventId || selectedEvent?.status !== "LIVE") {
      return;
    }

    const interval = window.setInterval(() => {
      void loadOdds(selectedEventId, { trackMovement: true });
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [selectedEventId, selectedEvent?.status]);

  async function handleSyncFeed() {
    setSyncing(true);
    try {
      const response = await api.post<{ synced?: number; message: string }>(
        "/admin/odds/sync",
      );

      if (selectedEventId) {
        await loadOdds(selectedEventId, { trackMovement: true });
      }

      await loadStats();
      toast.success(`✓ ${response.data.message}`);
    } catch (requestError) {
      console.error(requestError);
      const message = getErrorMessage(
        requestError,
        "Unable to sync odds feed.",
      );
      setError(message);
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleAutoSelectBest() {
    setAutoSelecting(true);

    try {
      if (!selectedEventId) {
        const response = await api.post<{ processed: number; message: string }>(
          "/admin/odds/bulk-auto-select",
        );

        toast.success(
          `✓ Best odds auto-selected for ${response.data.processed} events`,
        );
        await loadStats();
        if (events.length > 0 && !selectedEventId) {
          setSelectedEventId(events[0].eventId);
        }
        return;
      }

      await api.post<{ processed: number; message: string }>(
        "/admin/odds/bulk-auto-select",
        { eventIds: [selectedEventId] },
      );

      await Promise.all([loadOdds(selectedEventId), loadStats()]);
      toast.success("✓ Best odds auto-selected for selected event");
    } catch (requestError) {
      console.error(requestError);
      const message = getErrorMessage(
        requestError,
        "Unable to auto-select best odds.",
      );
      setError(message);
      toast.error(message);
    } finally {
      setAutoSelecting(false);
    }
  }

  async function handleVisibility(row: OddsTableRow, nextIsVisible: boolean) {
    if (!selectedEventId) {
      return;
    }

    const previousRows = oddsRows;
    const nextRows: OddsTableRow[] = oddsRows.map((currentRow) =>
      currentRow.bookmakerId === row.bookmakerId
        ? {
            ...currentRow,
            status: nextIsVisible ? "active" : "suspended",
            outcomes: currentRow.outcomes.map((outcome) => ({
              ...outcome,
              isVisible: nextIsVisible,
            })),
          }
        : currentRow,
    );

    setOddsRows(nextRows);

    try {
      await Promise.all(
        row.outcomes.map((outcome) =>
          api.patch(`/admin/odds/${selectedEventId}/visibility`, {
            bookmakerId: row.bookmakerId,
            marketType: "h2h",
            side: outcome.side,
            isVisible: nextIsVisible,
          }),
        ),
      );

      await loadStats();
      toast.success(
        nextIsVisible ? "Bookmaker activated" : "Bookmaker suspended",
      );
    } catch (requestError) {
      console.error(requestError);
      setOddsRows(previousRows);
      const message = getErrorMessage(
        requestError,
        "Unable to update bookmaker visibility.",
      );
      setError(message);
      toast.error(message);
    }
  }

  async function handleOverride(row: OddsTableRow) {
    if (!selectedEventId) {
      return;
    }

    try {
      await Promise.all(
        row.outcomes.map((outcome) => {
          const value = customOdds[`${row.bookmakerId}-${outcome.side}`];
          return value
            ? api.post(`/admin/odds/${selectedEventId}/override`, {
                bookmakerId: row.bookmakerId,
                marketType: "h2h",
                side: outcome.side,
                customOdds: Number(value),
              })
            : Promise.resolve();
        }),
      );

      await Promise.all([loadOdds(selectedEventId), loadStats()]);
      toast.success("Odds updated successfully");
    } catch (requestError) {
      console.error(requestError);
      const message = getErrorMessage(requestError, "Unable to override odds.");
      setError(message);
      toast.error(message);
    }
  }

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 4 }, (_, rowIndex) => (
        <tr
          className="even:bg-[var(--color-bg-elevated)]"
          key={`odds-skeleton-${rowIndex}`}
        >
          {Array.from({ length: 11 }, (_, cellIndex) => (
            <td className={adminTableCellClassName} key={cellIndex}>
              <div className="h-4 w-full rounded bg-admin-surface animate-pulse" />
            </td>
          ))}
        </tr>
      )),
    [],
  );

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Odds Control"
        subtitle="Manage markets, odds, and margins"
        actions={
          <>
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
            <AdminButton
              variant="ghost"
              onClick={() => void handleAutoSelectBest()}
              disabled={
                autoSelecting ||
                eventsLoading ||
                Boolean(selectedEventId && loading)
              }
            >
              {autoSelecting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  {selectedEventId
                    ? "Processing..."
                    : `Processing ${stats?.totalConfigured ?? events.length} events...`}
                </>
              ) : selectedEventId ? (
                "Auto-select Best"
              ) : (
                "Auto-select All Configured"
              )}
            </AdminButton>
            <AdminButton>
              <Plus size={13} />
              New Market
            </AdminButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Configured Games",
            subtitle: "Active events",
            value: stats?.totalConfigured ?? 0,
            tone: "text-admin-blue",
          },
          {
            label: "With Odds",
            subtitle: "Ready for users",
            value: stats?.withOdds ?? 0,
            tone: "text-admin-accent",
          },
          {
            label: "No Odds",
            subtitle: "Needs attention",
            value: stats?.noOdds ?? 0,
            tone: "text-admin-red",
          },
          {
            label: "Bookmakers",
            subtitle: "Visible sources",
            value: stats?.bookmakers ?? 0,
            tone: "text-admin-gold",
          },
        ].map((metric) => (
          <AdminCard className="p-4" key={metric.label}>
            <p className="text-xs uppercase tracking-[0.08em] text-admin-text-muted">
              {metric.label}
            </p>
            <p className={`mt-2 text-2xl font-bold ${metric.tone}`}>
              {statsLoading ? "..." : metric.value}
            </p>
            <p className="mt-1 text-xs text-admin-text-muted">
              {metric.subtitle}
            </p>
          </AdminCard>
        ))}
      </div>

      <div className="max-w-xl space-y-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted"
            size={14}
          />
          <Input
            placeholder="Search configured games..."
            value={eventSearch}
            onChange={(event) => setEventSearch(event.target.value)}
            className="pl-9 border-admin-border bg-admin-surface text-admin-text-primary"
          />
        </div>

        <select
          value={selectedEventId}
          onChange={(event) => setSelectedEventId(event.target.value)}
          className="h-9 w-full rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text-primary font-medium"
        >
          <option value="">
            {eventsLoading
              ? "Loading configured games..."
              : "Select a configured game"}
          </option>
          {Object.entries(groupedFilteredEvents)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([league, leagueEvents]) => (
              <optgroup key={league} label={league}>
                {leagueEvents.map((event) => (
                  <option key={event.eventId} value={event.eventId}>
                    {`${getSportEmoji(event.sportKey)} ${event.homeTeam} vs ${event.awayTeam} - ${event.leagueName ?? "League"} - ${new Date(event.commenceTime).toLocaleDateString()} (${event._count.displayedOdds} odds)`}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
      </div>

      {error ? (
        <AdminCard>
          <p className="text-sm text-admin-red">{error}</p>
        </AdminCard>
      ) : null}

      {selectedEvent ? (
        <AdminCard className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-admin-text-primary">
            <span className="text-xl" role="img" aria-label="sport">
              {getSportEmoji(selectedEvent.sportKey)}
            </span>
            <p className="text-sm font-semibold">
              {selectedEvent.leagueName ?? "Unknown league"}
            </p>
          </div>
          <p className="text-base font-semibold text-admin-text-primary">
            {selectedEvent.homeTeam}{" "}
            <span className="text-admin-text-muted">vs</span>{" "}
            {selectedEvent.awayTeam}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-admin-text-muted">
            <span>{new Date(selectedEvent.commenceTime).toLocaleString()}</span>
            <span>Status: {selectedEvent.status}</span>
            <span>Margin: {selectedEvent.houseMargin}%</span>
            <span>Markets: {selectedEvent.marketsEnabled.join(", ")}</span>
            <span>{oddsRows.length} bookmakers</span>
            <span>{selectedEvent._count.displayedOdds} odds entries</span>
            <span>{selectedEvent._count.bets} bets placed</span>
          </div>
        </AdminCard>
      ) : null}

      {!selectedEventId ? (
        <AdminCard>
          <p className="text-sm text-admin-text-muted">
            Select a configured event to view odds
          </p>
        </AdminCard>
      ) : (
        <AdminCard>
          <TableShell>
            <table className={adminTableClassName}>
              <thead>
                <tr>
                  {[
                    "Event",
                    "Market",
                    "Selection 1",
                    "Odds",
                    "Selection 2",
                    "Odds",
                    "Selection 3",
                    "Odds",
                    "Margin",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th className={adminTableHeadCellClassName} key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? skeletonRows : null}

                {!loading && oddsRows.length === 0 ? (
                  <tr>
                    <td className={adminTableCellClassName} colSpan={11}>
                      <p className="text-sm text-admin-text-muted">
                        No odds available for this event.
                      </p>
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? oddsRows.map((row) => {
                      const parsedMargin = Number.parseFloat(row.margin);
                      const tone = marginTone(parsedMargin);
                      const isBestOne =
                        bestOddsByColumn.one !== null &&
                        Number(row.oddsOne) === bestOddsByColumn.one;
                      const isBestTwo =
                        bestOddsByColumn.two !== null &&
                        Number(row.oddsTwo) === bestOddsByColumn.two;
                      const isBestThree =
                        bestOddsByColumn.three !== null &&
                        Number(row.oddsThree) === bestOddsByColumn.three;

                      return (
                        <tr
                          className="even:bg-[var(--color-bg-elevated)]"
                          key={`${row.bookmakerId}-${row.market}`}
                        >
                          <td
                            className={`${adminTableCellClassName} max-w-[160px] truncate font-semibold text-admin-text-primary`}
                          >
                            {row.event}
                          </td>
                          <td className={adminTableCellClassName}>
                            {row.bookmakerName}
                          </td>
                          <td
                            className={`${adminTableCellClassName} text-admin-text-primary`}
                          >
                            {row.selectionOne}
                          </td>
                          <td className={adminTableCellClassName}>
                            <span
                              className={`inline-flex items-center gap-1 ${
                                isBestOne ? "font-bold text-admin-gold" : ""
                              }`}
                            >
                              <InlinePill
                                label={`${isBestOne ? "★ " : ""}${row.oddsOne}`}
                                tone="accent"
                              />
                              {movementByKey[
                                movementKey(
                                  row.bookmakerId,
                                  row.market,
                                  row.selectionOne,
                                )
                              ] === "up" ? (
                                <span className="font-bold text-admin-accent">
                                  ▲
                                </span>
                              ) : movementByKey[
                                  movementKey(
                                    row.bookmakerId,
                                    row.market,
                                    row.selectionOne,
                                  )
                                ] === "down" ? (
                                <span className="font-bold text-admin-red">
                                  ▼
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td className={adminTableCellClassName}>
                            {row.selectionTwo || "-"}
                          </td>
                          <td className={adminTableCellClassName}>
                            {row.oddsTwo !== "-" ? (
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  isBestTwo ? "font-bold text-admin-gold" : ""
                                }`}
                              >
                                <InlinePill
                                  label={`${isBestTwo ? "★ " : ""}${row.oddsTwo}`}
                                  tone="accent"
                                />
                                {movementByKey[
                                  movementKey(
                                    row.bookmakerId,
                                    row.market,
                                    row.selectionTwo,
                                  )
                                ] === "up" ? (
                                  <span className="font-bold text-admin-accent">
                                    ▲
                                  </span>
                                ) : movementByKey[
                                    movementKey(
                                      row.bookmakerId,
                                      row.market,
                                      row.selectionTwo,
                                    )
                                  ] === "down" ? (
                                  <span className="font-bold text-admin-red">
                                    ▼
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td
                            className={`${adminTableCellClassName} text-admin-text-primary`}
                          >
                            {row.selectionThree}
                          </td>
                          <td className={adminTableCellClassName}>
                            <span
                              className={`inline-flex items-center gap-1 ${
                                isBestThree ? "font-bold text-admin-gold" : ""
                              }`}
                            >
                              <InlinePill
                                label={`${isBestThree ? "★ " : ""}${row.oddsThree}`}
                                tone="accent"
                              />
                              {movementByKey[
                                movementKey(
                                  row.bookmakerId,
                                  row.market,
                                  row.selectionThree,
                                )
                              ] === "up" ? (
                                <span className="font-bold text-admin-accent">
                                  ▲
                                </span>
                              ) : movementByKey[
                                  movementKey(
                                    row.bookmakerId,
                                    row.market,
                                    row.selectionThree,
                                  )
                                ] === "down" ? (
                                <span className="font-bold text-admin-red">
                                  ▼
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td
                            className={`${adminTableCellClassName} font-semibold ${tone.className}`}
                          >
                            {row.margin} ({tone.label})
                          </td>
                          <td className={adminTableCellClassName}>
                            <StatusBadge
                              status={
                                row.status === "active" ? "active" : "suspended"
                              }
                            />
                          </td>
                          <td className={adminTableCellClassName}>
                            <div className={adminCompactActionsClassName}>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <AdminButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedOdds(row);
                                      setEditMargin(row.margin);
                                      setCustomOdds(
                                        row.outcomes.reduce<
                                          Record<string, string>
                                        >((accumulator, outcome) => {
                                          accumulator[
                                            `${row.bookmakerId}-${outcome.side}`
                                          ] = String(outcome.displayOdds);
                                          return accumulator;
                                        }, {}),
                                      );
                                    }}
                                  >
                                    <Edit size={11} />
                                  </AdminButton>
                                </DialogTrigger>
                                <DialogContent className="border-admin-border bg-admin-card">
                                  <DialogHeader>
                                    <DialogTitle>Edit Market Odds</DialogTitle>
                                    <DialogDescription>
                                      Adjust odds and margin for this market
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedOdds && (
                                    <ScrollArea className="h-[400px] w-full pr-4">
                                      <div className="space-y-4">
                                        <div>
                                          <label className="text-sm font-semibold text-admin-text-primary">
                                            Event
                                          </label>
                                          <p className="mt-1 text-sm text-admin-text-muted">
                                            {selectedOdds.event}
                                          </p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-semibold text-admin-text-primary">
                                            Market
                                          </label>
                                          <p className="mt-1 text-sm text-admin-text-muted">
                                            {selectedOdds.bookmakerName} |{" "}
                                            {selectedOdds.market}
                                          </p>
                                        </div>
                                        {selectedOdds.outcomes.map(
                                          (outcome) => (
                                            <div key={outcome.side}>
                                              <label className="text-sm font-semibold text-admin-text-primary">
                                                {outcome.side}
                                              </label>
                                              <Input
                                                value={
                                                  customOdds[
                                                    `${selectedOdds.bookmakerId}-${outcome.side}`
                                                  ] ??
                                                  String(outcome.displayOdds)
                                                }
                                                onChange={(event) =>
                                                  setCustomOdds(
                                                    (currentOdds) => ({
                                                      ...currentOdds,
                                                      [`${selectedOdds.bookmakerId}-${outcome.side}`]:
                                                        event.target.value,
                                                    }),
                                                  )
                                                }
                                                placeholder="1.50"
                                                className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                              />
                                            </div>
                                          ),
                                        )}
                                        <div>
                                          <label className="text-sm font-semibold text-admin-text-primary">
                                            Margin %
                                          </label>
                                          <Input
                                            value={editMargin}
                                            onChange={(event) =>
                                              setEditMargin(event.target.value)
                                            }
                                            placeholder="2.5"
                                            className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                          />
                                        </div>
                                      </div>
                                    </ScrollArea>
                                  )}
                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      variant="outline"
                                      className="flex-1"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]"
                                      onClick={() =>
                                        selectedOdds
                                          ? void handleOverride(selectedOdds)
                                          : undefined
                                      }
                                    >
                                      Save Changes
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <AdminButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedOdds(row)}
                                  >
                                    {row.status === "active" ? (
                                      <Lock size={11} />
                                    ) : (
                                      <Unlock size={11} />
                                    )}
                                  </AdminButton>
                                </DialogTrigger>
                                <DialogContent className="border-admin-border bg-admin-card">
                                  <DialogHeader>
                                    <DialogTitle>
                                      {row.status === "active"
                                        ? "Suspend"
                                        : "Reactivate"}{" "}
                                      Market
                                    </DialogTitle>
                                    <DialogDescription>
                                      {row.status === "active"
                                        ? "Suspend this market from accepting bets"
                                        : "Reactivate this market for new bets"}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {row.status === "active" ? (
                                    <div>
                                      <label className="text-sm font-semibold text-admin-text-primary">
                                        Reason for Suspension
                                      </label>
                                      <Input
                                        placeholder="E.g., Line movement, Technical issue"
                                        value={suspendReason}
                                        onChange={(event) =>
                                          setSuspendReason(event.target.value)
                                        }
                                        className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                      />
                                    </div>
                                  ) : null}
                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      variant="outline"
                                      className="flex-1"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      className={`flex-1 ${
                                        row.status === "active"
                                          ? "bg-admin-red hover:bg-red-600 text-white"
                                          : "bg-admin-accent text-black hover:bg-[#00d492]"
                                      }`}
                                      onClick={() =>
                                        void handleVisibility(
                                          row,
                                          row.status !== "active",
                                        )
                                      }
                                    >
                                      {row.status === "active"
                                        ? "Suspend"
                                        : "Reactivate"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </TableShell>
        </AdminCard>
      )}
    </div>
  );
}
