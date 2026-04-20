import { Calendar, Users, Zap, Clock } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { useCustomEvents } from "../components/hooks/useCustomEvents";
import type { CustomEventData } from "../components/hooks/useCustomEvents";

function CustomEventCard({ event }: { event: CustomEventData }) {
  const commenceTime = new Date(event.startTime);
  const isUpcoming = event.status === "PUBLISHED" && new Date() < commenceTime;
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
  const firstMarket = event.markets[0];
  const firstTwoSelections = firstMarket?.selections?.slice(0, 2);
  if (firstMarket && firstTwoSelections?.length === 2) {
    primaryOdds = `${firstTwoSelections[0].odds} / ${firstTwoSelections[1].odds}`;
    oddsLabel = firstMarket.name;
  }

  return (
    <Card className="overflow-hidden border-[#31455f] bg-[#0f172a] p-4 hover:border-[#f5c518]/30 transition-all group rounded-2xl">
      {/* Header with status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-white text-sm truncate">
              {event.teamHome} vs {event.teamAway}
            </h3>
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-medium animate-pulse">
                <Zap size={12} />
                LIVE
              </span>
            )}
            {isUpcoming && !isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f5c518]/20 text-[#f5c518] text-xs font-medium">
                <Calendar size={12} />
                UPCOMING
              </span>
            )}
            {isFinished && (
              <span className="px-2 py-0.5 rounded-full bg-[#31455f] text-[#90a2bb] text-xs font-medium">
                Finished
              </span>
            )}
          </div>
          <p className="text-xs text-[#90a2bb]">
            {event.league || "Custom Match"}
          </p>
        </div>
      </div>

      {/* Meta info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-[#90a2bb]">
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
                  ? "bg-[#f5c518]/20 text-[#f5c518]"
                  : "bg-[#31455f] text-[#90a2bb]"
            }`}
          >
            {timeLabel}
          </span>
        </div>
      </div>

      {/* Odds display */}
      {primaryOdds && (
        <div className="rounded-lg bg-[#0c1018] border border-[#31455f] px-3 py-2 mb-3">
          <div className="text-[11px] text-[#8a9bb0] font-medium mb-1">
            {oddsLabel} ODDS
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[#f5c518]">
              {primaryOdds}
            </div>
            <div className="text-[11px] text-[#8a9bb0]">
              {event.teamHome} / {event.teamAway}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function EventsContent() {
  const { events, loading, error } = useCustomEvents();

  const upcomingEvents = events.filter(
    (e) => e.status === "PUBLISHED" || e.status === "LIVE",
  );
  const finishedEvents = events.filter((e) => e.status === "FINISHED");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1120] to-[#0f172a] px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">My Matches</h1>
              <p className="mt-1 text-sm text-[#90a2bb]">
                Create custom matches and set your own odds
              </p>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-red-600/30 bg-red-900/20 p-4 rounded-2xl">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && events.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-lg border border-[#31455f]/30 bg-[#243244]/30 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && events.length === 0 && (
          <Card className="border-[#31455f] bg-[#0f172a] p-8 text-center rounded-2xl">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="rounded-full bg-[#f5c518]/10 p-3">
                <Calendar className="text-[#f5c518]" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-white">
                No matches yet
              </h3>
              <p className="text-sm text-[#90a2bb]">
                Create your first custom match to get started
              </p>
            </div>
          </Card>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[#f5c518]" />
              <h2 className="text-lg font-semibold text-white">
                Active Matches
                <span className="ml-2 text-sm font-normal text-[#90a2bb]">
                  ({upcomingEvents.length})
                </span>
              </h2>
            </div>
            <div className="grid gap-3">
              {upcomingEvents.map((event) => (
                <CustomEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Finished Events */}
        {finishedEvents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#90a2bb]" />
              <h2 className="text-lg font-semibold text-white">
                Completed Matches
                <span className="ml-2 text-sm font-normal text-[#90a2bb]">
                  ({finishedEvents.length})
                </span>
              </h2>
            </div>
            <div className="grid gap-3">
              {finishedEvents.map((event) => (
                <CustomEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </div>
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
