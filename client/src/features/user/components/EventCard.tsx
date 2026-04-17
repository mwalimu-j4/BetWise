import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import { isAxiosError } from "axios";
import { api } from "@/api/axiosConfig";
import EventMarketsModal from "./EventMarketsModal";
import type { BetSelection } from "../hooks/useBetSlip";
import type { ApiEvent } from "../hooks/useEvents";

type EventCardProps = {
  event: ApiEvent;
  onOddsSelect: (selection: BetSelection) => void;
  selectedOdds: Set<string>;
};

type DisplayedOddCountItem = {
  marketType: string;
  bookmakerName: string;
};

function formatCardDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(value))
    .replace(",", " ")
    .replace(/\s(AM|PM)$/i, (match) => ` ${match.trim().toUpperCase()}`)
    .replace(/\s+/g, " ")
    .replace(/(\d{1,2}:\d{2})\s(AM|PM)$/i, "· $1 $2");
}

function getRelativeTime(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 60) {
    return `${Math.max(diffMinutes, 1)}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `${Math.max(diffHours, 1)}h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${Math.max(diffDays, 1)}d`;
}

type OddsPreview = {
  label: string;
  side: string;
  odds: number | null;
};

function OddsPreviewButton({
  entry,
  event,
  isSelected,
  onOddsSelect,
}: {
  entry: OddsPreview;
  event: ApiEvent;
  isSelected: boolean;
  onOddsSelect: (selection: BetSelection) => void;
}) {
  const disabled = typeof entry.odds !== "number";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (typeof entry.odds !== "number") {
          return;
        }

        onOddsSelect({
          eventId: event.eventId,
          eventName: `${event.homeTeam} vs ${event.awayTeam}`,
          leagueName: event.leagueName ?? "Featured Match",
          marketType: "h2h",
          side: entry.side,
          odds: entry.odds,
          commenceTime: event.commenceTime,
        });
      }}
      className={`odds-btn mobile-event-odds group/odds relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border px-1 py-1.5 text-center transition-all duration-200 sm:px-2 sm:py-2.5 ${
        disabled
          ? "cursor-not-allowed border-[#1a2a40]/50 bg-[#0d1829] text-[#3d5478]"
          : isSelected
            ? "border-[#ffd500]/50 bg-gradient-to-b from-[#ffd500]/15 to-[#ffd500]/5 text-[#ffd500] shadow-[0_0_16px_rgba(255,213,0,0.1),inset_0_1px_0_rgba(255,213,0,0.15)]"
            : "border-[#1e3350]/60 bg-gradient-to-b from-[#131f33] to-[#0f1a2d] text-white hover:border-[#ffd500]/30 hover:bg-gradient-to-b hover:from-[#162540] hover:to-[#111d2e] active:scale-[0.97]"
      }`}
    >
      <span
        className={`text-[8px] font-bold uppercase tracking-[0.12em] sm:text-[10px] ${
          disabled
            ? "text-[#3d5478]"
            : isSelected
              ? "text-[#ffd500]/80"
              : "text-[#6f88ac]"
        }`}
      >
        {entry.label}
      </span>
      <span
        className={`text-[15px] font-extrabold tabular-nums sm:text-base ${
          isSelected ? "text-[#ffd500]" : ""
        }`}
      >
        {typeof entry.odds === "number" ? entry.odds.toFixed(2) : "—"}
      </span>
    </button>
  );
}

export default function EventCard({
  event,
  onOddsSelect,
  selectedOdds,
}: EventCardProps) {
  const [marketCount, setMarketCount] = useState<number>(0);
  const [showMarkets, setShowMarkets] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchMarketCount = async () => {
      try {
        const { data } = await api.get<{
          displayedOdds?: DisplayedOddCountItem[];
        }>(`/user/events/${event.eventId}`);

        if (!cancelled) {
          const groupedMarkets = new Set(
            (data.displayedOdds ?? []).map(
              (odd) => `${odd.marketType}::${odd.bookmakerName}`,
            ),
          );
          setMarketCount(groupedMarkets.size);
        }
      } catch (fetchError) {
        if (
          !cancelled &&
          isAxiosError<{ error?: string }>(fetchError) &&
          fetchError.response?.status === 404
        ) {
          setMarketCount(0);
        }
      }
    };

    void fetchMarketCount();

    return () => {
      cancelled = true;
    };
  }, [event.eventId]);

  const oddsPreview = useMemo<OddsPreview[]>(
    () => [
      {
        label: "1",
        side: event.homeTeam,
        odds: event.markets.h2h?.home ?? null,
      },
      { label: "X", side: "Draw", odds: event.markets.h2h?.draw ?? null },
      {
        label: "2",
        side: event.awayTeam,
        odds: event.markets.h2h?.away ?? null,
      },
    ],
    [
      event.awayTeam,
      event.homeTeam,
      event.markets.h2h?.away,
      event.markets.h2h?.draw,
      event.markets.h2h?.home,
    ],
  );

  return (
    <article className="event-card mobile-event-card group relative w-full max-w-full overflow-hidden rounded-2xl border border-[#1e3350]/50 bg-gradient-to-br from-[#111d2e] via-[#0f1a2d] to-[#0d1624] transition-all duration-300 hover:border-[#2a4770]">
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#ffd500]/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative flex h-full flex-col justify-between gap-0 p-0">
        {/* Top section: League + time + markets badge */}
        <div className="flex items-center justify-between gap-1.5 px-2 pt-2 sm:px-3.5 sm:pt-3">
          <p className="min-w-0 truncate text-[7px] font-semibold uppercase tracking-[0.18em] text-[#6c86a8] sm:text-[10px]">
            {event.leagueName ?? "Featured Match"}
          </p>

          <div className="flex shrink-0 items-center gap-1">
            {/* Countdown chip */}
            <span className="inline-flex items-center gap-0.5 rounded-full border border-[#223752]/70 bg-[#0b1525]/88 px-1.5 py-[2px] text-[7px] font-bold tabular-nums text-[#89a3c7] sm:text-[9px]">
              <Clock size={8} className="text-[#546e8f]" />
              {getRelativeTime(event.commenceTime)}
            </span>

            {/* Markets badge */}
            <button
              type="button"
              onClick={() => setShowMarkets(true)}
              className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-[#ffd500]/15 bg-[#ffd500]/[0.06] px-1.5 py-[2px] text-[7px] font-bold uppercase tracking-[0.18em] text-[#ffd500] transition hover:border-[#ffd500]/30 hover:bg-[#ffd500]/10 sm:text-[8px]"
            >
              <TrendingUp size={8} className="sm:h-[9px] sm:w-[9px]" />+
              {marketCount}
            </button>
          </div>
        </div>

        {/* Teams — full-width matchup row */}
        <button
          type="button"
          onClick={() => setShowMarkets(true)}
          className="w-full px-2 py-1.5 text-left sm:px-3.5 sm:py-2.5"
        >
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-[11px] font-extrabold leading-[1.1] text-white group-hover:text-[#ffd500]/90 sm:text-[13px]">
                {event.homeTeam}
              </span>
              <span className="truncate text-[11px] font-extrabold leading-[1.1] text-white group-hover:text-[#ffd500]/90 sm:text-[13px]">
                {event.awayTeam}
              </span>
            </div>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#223752]/80 bg-[#122133] text-[7px] font-black tracking-[0.18em] text-[#5f789b] sm:h-7 sm:w-7 sm:text-[9px]">
              VS
            </span>
          </div>

          {/* Date row */}
          <div className="mt-1 flex items-center gap-1 text-[#6b86a8]">
            <Calendar size={8} className="shrink-0" />
            <span className="truncate text-[7px] font-medium sm:text-[9px]">
              {formatCardDateTime(event.commenceTime)}
            </span>
          </div>
        </button>

        {/* Odds row — 3 columns */}
        <div className="border-t border-[#1e3350]/30 px-1.5 pb-1.5 pt-1.5 sm:px-3 sm:pb-3 sm:pt-2.5">
          <div className="flex gap-1.5 sm:gap-2">
            {oddsPreview.map((entry) => (
              <OddsPreviewButton
                key={entry.label}
                entry={entry}
                event={event}
                isSelected={selectedOdds.has(
                  `${event.eventId}:h2h:${entry.side}:${
                    typeof entry.odds === "number"
                      ? entry.odds.toFixed(2)
                      : "0.00"
                  }`,
                )}
                onOddsSelect={onOddsSelect}
              />
            ))}
          </div>
        </div>
      </div>

      <EventMarketsModal
        eventId={event.eventId}
        isOpen={showMarkets}
        onClose={() => setShowMarkets(false)}
        onOddsSelect={onOddsSelect}
        selectedOdds={selectedOdds}
        events={[event]}
      />
    </article>
  );
}
