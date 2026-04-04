import { useEffect, useMemo, useState } from "react";
import { Edit, Lock, Plus, RefreshCw, Unlock } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ApiEventOption {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string | null;
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

function findOutcome(
  outcomes: OddsTableRow["outcomes"],
  sideNames: string[],
) {
  return outcomes.find((outcome) => sideNames.includes(outcome.side));
}

export default function Odds() {
  const [events, setEvents] = useState<ApiEventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [oddsRows, setOddsRows] = useState<OddsTableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOdds, setSelectedOdds] = useState<OddsTableRow | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [editMargin, setEditMargin] = useState("");
  const [customOdds, setCustomOdds] = useState<Record<string, string>>({});

  const selectedEvent = useMemo(
    () => events.find((event) => event.eventId === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  async function loadEventOptions() {
    setEventsLoading(true);

    try {
      const response = await api.get<{ events: ApiEventOption[] }>("/admin/events", {
        params: {
          status: "LIVE",
          page: 1,
          limit: 100,
        },
      });

      setEvents(response.data.events);
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load live events.");
    } finally {
      setEventsLoading(false);
    }
  }

  function mapOddsToRows(data: ApiOddsGroup, currentEvent: ApiEventOption | null) {
    return data.bookmakers.map<OddsTableRow>((bookmaker) => {
      const h2hMarket = bookmaker.markets.find((market) => market.marketType === "h2h");
      const outcomes = h2hMarket?.outcomes ?? [];
      const homeOutcome = currentEvent
        ? findOutcome(outcomes, [currentEvent.homeTeam])
        : outcomes[0];
      const drawOutcome = findOutcome(outcomes, ["Draw"]);
      const awayOutcome = currentEvent
        ? findOutcome(outcomes, [currentEvent.awayTeam])
        : outcomes.find((outcome) => outcome !== homeOutcome && outcome !== drawOutcome);
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
        status: outcomes.some((outcome) => !outcome.isVisible) ? "suspended" : "active",
        outcomes,
      };
    });
  }

  async function loadOdds(eventId: string) {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<ApiOddsGroup>(`/admin/odds/${eventId}`);
      setOddsRows(mapOddsToRows(response.data, selectedEvent));
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load odds for this event.");
      setOddsRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEventOptions();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setOddsRows([]);
      return;
    }

    void loadOdds(selectedEventId);
  }, [selectedEventId, selectedEvent]);

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
    } catch (requestError) {
      console.error(requestError);
      setOddsRows(previousRows);
      setError("Unable to update bookmaker visibility.");
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

      await loadOdds(selectedEventId);
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to override odds.");
    }
  }

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 4 }, (_, rowIndex) => (
        <tr className="even:bg-[var(--color-bg-elevated)]" key={`odds-skeleton-${rowIndex}`}>
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
              onClick={() => (selectedEventId ? void loadOdds(selectedEventId) : undefined)}
            >
              <RefreshCw size={13} />
              Sync Feed
            </AdminButton>
            <AdminButton>
              <Plus size={13} />
              New Market
            </AdminButton>
          </>
        }
      />

      <div className="max-w-sm">
        <Select onValueChange={setSelectedEventId} value={selectedEventId}>
          <SelectTrigger className="h-9 w-full rounded-lg border border-admin-border bg-admin-surface text-admin-text-primary font-medium">
            <SelectValue
              placeholder={eventsLoading ? "Loading events..." : "Select an event"}
            />
          </SelectTrigger>
          <SelectContent className="border-admin-border bg-admin-card text-admin-text-primary">
            {events.map((event) => (
              <SelectItem key={event.eventId} value={event.eventId}>
                {event.homeTeam} vs {event.awayTeam}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <AdminCard>
          <p className="text-sm text-admin-red">{error}</p>
        </AdminCard>
      ) : null}

      {!selectedEventId ? (
        <AdminCard>
          <p className="text-sm text-admin-text-muted">Select an event to view odds</p>
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
                  ? oddsRows.map((row) => (
                      <tr
                        className="even:bg-[var(--color-bg-elevated)]"
                        key={`${row.bookmakerId}-${row.market}`}
                      >
                        <td
                          className={`${adminTableCellClassName} max-w-[160px] truncate font-semibold text-admin-text-primary`}
                        >
                          {row.event}
                        </td>
                        <td className={adminTableCellClassName}>{row.bookmakerName}</td>
                        <td
                          className={`${adminTableCellClassName} text-admin-text-primary`}
                        >
                          {row.selectionOne}
                        </td>
                        <td className={adminTableCellClassName}>
                          <InlinePill label={row.oddsOne} tone="accent" />
                        </td>
                        <td className={adminTableCellClassName}>
                          {row.selectionTwo || "-"}
                        </td>
                        <td className={adminTableCellClassName}>
                          {row.oddsTwo !== "-" ? (
                            <InlinePill label={row.oddsTwo} tone="accent" />
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
                          <InlinePill label={row.oddsThree} tone="accent" />
                        </td>
                        <td
                          className={`${adminTableCellClassName} font-semibold text-admin-gold`}
                        >
                          {row.margin}
                        </td>
                        <td className={adminTableCellClassName}>
                          <StatusBadge
                            status={row.status === "active" ? "active" : "suspended"}
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
                                      row.outcomes.reduce<Record<string, string>>(
                                        (accumulator, outcome) => {
                                          accumulator[
                                            `${row.bookmakerId}-${outcome.side}`
                                          ] = String(outcome.displayOdds);
                                          return accumulator;
                                        },
                                        {},
                                      ),
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
                                          {selectedOdds.bookmakerName} | {selectedOdds.market}
                                        </p>
                                      </div>
                                      {selectedOdds.outcomes.map((outcome) => (
                                        <div key={outcome.side}>
                                          <label className="text-sm font-semibold text-admin-text-primary">
                                            {outcome.side}
                                          </label>
                                          <Input
                                            value={
                                              customOdds[
                                                `${selectedOdds.bookmakerId}-${outcome.side}`
                                              ] ?? String(outcome.displayOdds)
                                            }
                                            onChange={(event) =>
                                              setCustomOdds((currentOdds) => ({
                                                ...currentOdds,
                                                [`${selectedOdds.bookmakerId}-${outcome.side}`]:
                                                  event.target.value,
                                              }))
                                            }
                                            placeholder="1.50"
                                            className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                          />
                                        </div>
                                      ))}
                                      <div>
                                        <label className="text-sm font-semibold text-admin-text-primary">
                                          Margin %
                                        </label>
                                        <Input
                                          value={editMargin}
                                          onChange={(event) => setEditMargin(event.target.value)}
                                          placeholder="2.5"
                                          className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                        />
                                      </div>
                                    </div>
                                  </ScrollArea>
                                )}
                                <div className="flex gap-2 pt-4">
                                  <Button variant="outline" className="flex-1">
                                    Cancel
                                  </Button>
                                  <Button
                                    className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]"
                                    onClick={() =>
                                      selectedOdds ? void handleOverride(selectedOdds) : undefined
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
                                    {row.status === "active" ? "Suspend" : "Reactivate"} Market
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
                                      onChange={(event) => setSuspendReason(event.target.value)}
                                      className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                    />
                                  </div>
                                ) : null}
                                <div className="flex gap-2 pt-4">
                                  <Button variant="outline" className="flex-1">
                                    Cancel
                                  </Button>
                                  <Button
                                    className={`flex-1 ${
                                      row.status === "active"
                                        ? "bg-admin-red hover:bg-red-600 text-white"
                                        : "bg-admin-accent text-black hover:bg-[#00d492]"
                                    }`}
                                    onClick={() =>
                                      void handleVisibility(row, row.status !== "active")
                                    }
                                  >
                                    {row.status === "active" ? "Suspend" : "Reactivate"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </TableShell>
        </AdminCard>
      )}
    </div>
  );
}
