import { useEffect, useMemo, useState } from "react";
import { Edit, Eye, Plus, XCircle } from "lucide-react";
import { api } from "@/api/axiosConfig";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
  adminFilterRowClassName,
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

const filterOptions = [
  { label: "All", value: "" },
  { label: "Live", value: "LIVE" },
  { label: "Upcoming", value: "UPCOMING" },
  { label: "Finished", value: "FINISHED" },
  { label: "Cancelled", value: "CANCELLED" },
] as const;

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

export default function Events() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [configEvent, setConfigEvent] = useState<ApiEvent | null>(null);
  const [houseMargin, setHouseMargin] = useState("0");
  const [marketsEnabled, setMarketsEnabled] = useState<string[]>(["h2h"]);
  const [closeReason, setCloseReason] = useState("");
  const totalPages = Math.max(1, Math.ceil(total / 20));

  async function loadEvents() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<{
        events: ApiEvent[];
        total: number;
        page: number;
        totalPages: number;
      }>("/admin/events", {
        params: {
          page,
          limit: 20,
          ...(activeFilter ? { status: activeFilter } : {}),
          ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        },
      });

      setEvents(response.data.events);
      setTotal(response.data.total);
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load events right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, [activeFilter, page, searchQuery]);

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
    } catch (requestError) {
      console.error(requestError);
      setEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.eventId === event.eventId
            ? { ...currentEvent, isActive: previous }
            : currentEvent,
        ),
      );
      setError("Unable to update event status.");
    }
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
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to save event configuration.");
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
          <Dialog>
            <DialogTrigger asChild>
              <AdminButton>
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
                    onClick={() => void loadEvents()}
                  >
                    Refresh Feed
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className={`${adminFilterRowClassName} items-center`}>
        {filterOptions.map((filter) => (
          <AdminButton
            key={filter.label}
            variant={activeFilter === filter.value ? "solid" : "ghost"}
            onClick={() => {
              setPage(1);
              setActiveFilter(filter.value);
            }}
          >
            {filter.label}
          </AdminButton>
        ))}
        <div className="min-w-[240px] flex-1">
          <Input
            placeholder="Search teams or league"
            value={searchQuery}
            onChange={(event) => {
              setPage(1);
              setSearchQuery(event.target.value);
            }}
            className="border-admin-border bg-admin-surface text-admin-text-primary"
          />
        </div>
      </div>

      {error ? (
        <AdminCard>
          <p className="text-sm text-admin-red">{error}</p>
        </AdminCard>
      ) : null}

      <div className="space-y-3">
        {loading ? skeletonCards : null}

        {!loading && events.length === 0 ? (
          <AdminCard>
            <p className="text-sm text-admin-text-muted">No events found.</p>
          </AdminCard>
        ) : null}

        {!loading
          ? events.map((event) => (
              <AdminCard
                className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                key={event.eventId}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {event.status === "LIVE" ? (
                    <span className="animate-admin-pulse h-2 w-2 shrink-0 rounded-full bg-admin-live shadow-[0_0_6px_var(--admin-live)]" />
                  ) : null}
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={toBadgeStatus(event.status)} />
                      <span className="text-[11px] text-admin-text-muted">
                        {event.leagueName ?? "Unknown league"}
                      </span>
                      <span className="text-[11px] text-admin-text-muted">
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
                      <span>Markets: {event.marketsEnabled.join(", ")}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center lg:min-w-[276px]">
                  <div>
                    <p className="text-xl font-bold text-admin-blue">
                      {event._count.odds}
                    </p>
                    <p className="text-[11px] text-admin-text-muted">Markets</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-admin-gold">
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

                <div className="flex flex-wrap items-center gap-1">
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
                              <p className="text-xs text-admin-text-muted">
                                MATCH
                              </p>
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
                              <p className="text-xs text-admin-text-muted">
                                DATE
                              </p>
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
                            onChange={(event) =>
                              setHouseMargin(event.target.value)
                            }
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
            ))
          : null}
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
