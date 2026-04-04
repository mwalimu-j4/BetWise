import { useState } from "react";
import { Edit, Eye, Plus, XCircle } from "lucide-react";
import { eventFilters, events } from "../../data/mock-data";
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

export default function Events() {
  const [selectedEvent, setSelectedEvent] = useState<(typeof events)[0] | null>(
    null,
  );
  const [closeReason, setCloseReason] = useState("");
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
                  Create a new sporting event
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-admin-text-primary">
                    Home Team
                  </label>
                  <Input
                    placeholder="Team A"
                    className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-admin-text-primary">
                    Away Team
                  </label>
                  <Input
                    placeholder="Team B"
                    className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-admin-text-primary">
                    League
                  </label>
                  <select className="mt-1 w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-text-primary">
                    <option>Premier League</option>
                    <option>La Liga</option>
                    <option>Serie A</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-admin-text-primary">
                    Date & Time
                  </label>
                  <Input
                    type="datetime-local"
                    className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]">
                    Create Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className={adminFilterRowClassName}>
        {eventFilters.map((filter) => (
          <AdminButton
            key={filter}
            variant={filter === "All" ? "solid" : "ghost"}
          >
            {filter}
          </AdminButton>
        ))}
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <AdminCard
            className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
            key={event.id}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {event.status === "live" ? (
                <span className="animate-admin-pulse h-2 w-2 shrink-0 rounded-full bg-admin-live shadow-[0_0_6px_var(--admin-live)]" />
              ) : null}
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={event.status} />
                  <span className="text-[11px] text-admin-text-muted">
                    {event.league}
                  </span>
                  <span className="text-[11px] text-admin-text-muted">-</span>
                  <span className="text-[11px] text-admin-text-muted">
                    {event.date}
                  </span>
                </div>
                <p className="text-base font-semibold text-admin-text-primary">
                  {event.home} <span className="text-admin-text-muted">vs</span>{" "}
                  {event.away}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center lg:min-w-[276px]">
              <div>
                <p className="text-xl font-bold text-admin-blue">
                  {event.markets}
                </p>
                <p className="text-[11px] text-admin-text-muted">Markets</p>
              </div>
              <div>
                <p className="text-xl font-bold text-admin-gold">
                  {event.totalBets.toLocaleString()}
                </p>
                <p className="text-[11px] text-admin-text-muted">Bets</p>
              </div>
              <div>
                <p className="text-xl font-bold text-admin-red">
                  {event.exposure}
                </p>
                <p className="text-[11px] text-admin-text-muted">Exposure</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <Dialog>
                <DialogTrigger asChild>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedEvent(event)}
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
                  {selectedEvent && (
                    <ScrollArea className="h-[400px] w-full pr-4">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            EVENT ID
                          </p>
                          <p className="text-sm font-semibold">
                            {selectedEvent.id}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">MATCH</p>
                          <p className="text-sm font-semibold text-admin-text-primary">
                            {selectedEvent.home} vs {selectedEvent.away}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            LEAGUE
                          </p>
                          <p className="text-sm text-admin-text-primary">
                            {selectedEvent.league}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">DATE</p>
                          <p className="text-sm text-admin-text-primary">
                            {selectedEvent.date}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            STATUS
                          </p>
                          <StatusBadge status={selectedEvent.status} />
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            MARKETS
                          </p>
                          <p className="text-sm font-semibold text-admin-blue">
                            {selectedEvent.markets}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            TOTAL BETS
                          </p>
                          <p className="text-sm font-semibold text-admin-gold">
                            {selectedEvent.totalBets.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-muted">
                            EXPOSURE
                          </p>
                          <p className="text-sm font-semibold text-admin-red">
                            {selectedEvent.exposure}
                          </p>
                        </div>
                      </div>
                    </ScrollArea>
                  )}
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <AdminButton size="sm" variant="ghost">
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
                        Home Team
                      </label>
                      <Input
                        defaultValue={selectedEvent?.home}
                        className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-admin-text-primary">
                        Away Team
                      </label>
                      <Input
                        defaultValue={selectedEvent?.away}
                        className="mt-1 border-admin-border bg-admin-surface text-admin-text-primary"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1">
                        Cancel
                      </Button>
                      <Button className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]">
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
                      This will close all markets and cancel pending bets
                    </DialogDescription>
                  </DialogHeader>
                  <div>
                    <label className="text-sm font-semibold text-admin-text-primary">
                      Reason
                    </label>
                    <Input
                      placeholder="E.g., Event postponed, Match cancelled"
                      value={closeReason}
                      onChange={(e) => setCloseReason(e.target.value)}
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
                    <Button className="flex-1 bg-admin-red hover:bg-red-600 text-white">
                      Close Event
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
