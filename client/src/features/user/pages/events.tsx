import { useEffect, useState } from "react";
import { Plus, Calendar, Users, Zap, Edit2, Trash2, Clock } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateCustomEventForm } from "../components/CreateCustomEventForm";
import { useCustomEvents } from "../hooks/useCustomEvents";
import type { CustomEvent } from "../hooks/useCustomEvents";

function CustomEventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: CustomEvent;
  onEdit: (event: CustomEvent) => void;
  onDelete: (eventId: string) => void;
}) {
  const commenceTime = new Date(event.commenceTime);
  const isUpcoming = event.status === "UPCOMING" && new Date() < commenceTime;
  const isLive = event.status === "LIVE";
  const isFinished = event.status === "FINISHED" || new Date() > commenceTime;

  let timeLabel = "";
  if (isLive) {
    timeLabel = "LIVE NOW";
  } else if (isUpcoming) {
    const now = new Date();
    const diffMs = commenceTime.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    timeLabel = `${hours}h ${mins}m`;
  } else {
    timeLabel = "FINISHED";
  }

  // Get primary odds to display
  let primaryOdds = "";
  let oddsLabel = "";
  if (event.h2hOdds) {
    primaryOdds = `${event.h2hOdds.home} / ${event.h2hOdds.away}`;
    oddsLabel = "H2H";
  } else if (event.spreadsOdds) {
    primaryOdds = `${event.spreadsOdds.odds.team1} / ${event.spreadsOdds.odds.team2}`;
    oddsLabel = "Spread";
  } else if (event.totalsOdds) {
    primaryOdds = `${event.totalsOdds.odds.over} / ${event.totalsOdds.odds.under}`;
    oddsLabel = "Totals";
  }

  return (
    <Card className="overflow-hidden border-slate-600/30 bg-gradient-to-br from-slate-800/40 to-slate-900/40 p-4 hover:border-slate-500/50 transition-all group">
      {/* Header with status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-white text-sm truncate">
              {event.homeTeam} vs {event.awayTeam}
            </h3>
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-medium animate-pulse">
                <Zap size={12} />
                LIVE
              </span>
            )}
            {isUpcoming && !isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium">
                <Calendar size={12} />
                UPCOMING
              </span>
            )}
            {isFinished && (
              <span className="px-2 py-0.5 rounded-full bg-slate-600/30 text-slate-400 text-xs font-medium">
                Finished
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {event.league || "Custom Match"}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(event)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700/50 text-slate-400 hover:text-amber-400"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(event.eventId)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/20 text-slate-400 hover:text-red-400"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Meta info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={12} />
            <span>
              {commenceTime.toLocaleDateString()}{" "}
              {commenceTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              isLive
                ? "bg-red-500/20 text-red-300"
                : isUpcoming
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-slate-600/30 text-slate-400"
            }`}
          >
            {timeLabel}
          </span>
        </div>
      </div>

      {/* Odds display */}
      {primaryOdds && (
        <div className="rounded-lg bg-slate-700/30 px-3 py-2 mb-3">
          <div className="text-[11px] text-slate-400 font-medium mb-1">
            {oddsLabel} ODDS
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-amber-300">
              {primaryOdds}
            </div>
            <div className="text-[11px] text-slate-500">
              {event.h2hOdds && `${event.homeTeam} / ${event.awayTeam}`}
              {event.spreadsOdds && `Spread: ${event.spreadsOdds.spread}`}
              {event.totalsOdds && `Total: ${event.totalsOdds.total}`}
            </div>
          </div>
        </div>
      )}

      {/* Score if finished */}
      {isFinished &&
        event.homeScore !== undefined &&
        event.awayScore !== undefined && (
          <div className="rounded-lg bg-slate-700/20 px-3 py-2 text-center border border-slate-600/30">
            <div className="text-sm font-bold text-white">
              {event.homeScore} - {event.awayScore}
            </div>
          </div>
        )}
    </Card>
  );
}

function EventsContent() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { events, loading, error, loadEvents, createEvent, deleteEvent } =
    useCustomEvents();

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const upcomingEvents = events.filter(
    (e) => e.status === "UPCOMING" || e.status === "LIVE",
  );
  const finishedEvents = events.filter((e) => e.status === "FINISHED");

  const handleDelete = async (eventId: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteEvent(eventId);
      } catch {
        // Error handled in hook
      }
    }
  };

  const handleEdit = (event: CustomEvent) => {
    console.log("Edit event:", event);
    // Edit functionality can be added later
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">My Matches</h1>
              <p className="mt-1 text-sm text-slate-400">
                Create custom matches and set your own odds
              </p>
            </div>
            <Button
              onClick={() => {
                setShowCreateForm(true);
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-600 hover:to-orange-600 font-semibold gap-2"
            >
              <Plus size={18} />
              New Match
            </Button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-red-600/30 bg-red-900/20 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && events.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-lg border border-slate-600/30 bg-slate-800/30 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && events.length === 0 && (
          <Card className="border-slate-600/30 bg-gradient-to-b from-slate-800/40 to-slate-900/40 p-8 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="rounded-full bg-amber-500/10 p-3">
                <Calendar className="text-amber-400" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-white">
                No matches yet
              </h3>
              <p className="text-sm text-slate-400">
                Create your first custom match to get started
              </p>
              <Button
                onClick={() => {
                  setShowCreateForm(true);
                }}
                className="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-600 hover:to-orange-600 font-semibold"
              >
                Create First Match
              </Button>
            </div>
          </Card>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              <h2 className="text-lg font-semibold text-white">
                Active Matches
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({upcomingEvents.length})
                </span>
              </h2>
            </div>
            <div className="grid gap-3">
              {upcomingEvents.map((event) => (
                <CustomEventCard
                  key={event.eventId}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Finished Events */}
        {finishedEvents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              <h2 className="text-lg font-semibold text-white">
                Completed Matches
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({finishedEvents.length})
                </span>
              </h2>
            </div>
            <div className="grid gap-3">
              {finishedEvents.map((event) => (
                <CustomEventCard
                  key={event.eventId}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Form Dialog */}
      <CreateCustomEventForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSubmit={async (data) => {
          const result = await createEvent(data);
          return result as void;
        }}
      />
    </div>
  );
}

export default function EventsPage() {
  return (
    <ProtectedRoute requireRole="USER" redirectTo="/auth/login">
      <EventsContent />
    </ProtectedRoute>
  );
}
