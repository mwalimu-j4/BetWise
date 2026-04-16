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
    return `in ${Math.max(diffMinutes, 1)} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `in ${Math.max(diffHours, 1)} hrs`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `in ${Math.max(diffDays, 1)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
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
      className={`odds-btn group/odds flex min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border px-1 py-1.5 text-center transition-all duration-200 sm:px-2 sm:py-2 ${
        disabled
          ? "cursor-not-allowed border-[#1e3350]/30 bg-[#111d2e] text-[#3d5478]"
          : isSelected
            ? "border-[#ffd500]/50 bg-[#ffd500]/10 text-[#ffd500] shadow-[0_0_12px_rgba(255,213,0,0.12)]"
            : "border-[#1e3350]/50 bg-[#0f1a2d] text-white hover:border-[#ffd500]/30 hover:bg-[#ffd500]/[0.05]"
      }`}
    >
      <span
        className={`text-[8px] font-medium uppercase tracking-wider sm:text-[9px] ${
          disabled
            ? "text-[#3d5478]"
            : isSelected
              ? "text-[#ffd500]/70"
              : "text-[#637fa0]"
        }`}
      >
        {entry.label}
      </span>
      <span className="text-xs font-bold sm:text-sm">
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
    <article className="event-card group relative overflow-hidden rounded-xl border border-[#1e3350]/50 bg-gradient-to-br from-[#111d2e] via-[#0f1a2d] to-[#0d1624] transition-all duration-300 hover:border-[#2a4770] sm:rounded-xl">
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#ffd500]/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative flex h-full flex-col justify-between gap-1.5 p-2 sm:p-2.5">
        {/* League + Markets badge row */}
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="truncate text-[7px] font-semibold uppercase tracking-[0.12em] text-[#637fa0] sm:text-[8px]">
              {event.leagueName ?? "Featured Match"}
            </p>

            <button
              type="button"
              onClick={() => setShowMarkets(true)}
              className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-[#ffd500]/15 bg-[#ffd500]/[0.06] px-1 py-0.5 text-[6px] font-semibold uppercase tracking-wider text-[#ffd500] transition hover:border-[#ffd500]/30 hover:bg-[#ffd500]/10 sm:text-[7px]"
            >
              <TrendingUp size={8} className="sm:h-[9px] sm:w-[9px]" />+
              {marketCount}
            </button>
          </div>

          {/* Match name */}
          <button
            type="button"
            onClick={() => setShowMarkets(true)}
            className="mt-1 w-full text-left sm:mt-1.5"
          >
            <h3 className="text-[11px] font-bold leading-tight text-white break-words transition-colors group-hover:text-[#ffd500]/90 sm:text-[12px]">
              {event.homeTeam}{" "}
              <span className="font-normal text-[#4a6a8f]">vs</span>{" "}
              {event.awayTeam}
            </h3>
          </button>

          {/* Date and countdown — single compact row */}
          <div className="mt-0.5 flex items-center gap-0.5 sm:mt-1 sm:gap-1">
            <span className="inline-flex min-w-0 items-center gap-0.5 rounded border border-[#1e3350]/40 bg-[#0b1525] px-0.5 py-[2px] text-[6px] text-[#7a94b8] sm:px-1 sm:py-0.5 sm:text-[7px]">
              <Calendar size={8} className="shrink-0 text-[#637fa0]" />
              <span className="truncate">
                {formatCardDateTime(event.commenceTime)}
              </span>
            </span>
            <span className="inline-flex items-center gap-0.5 rounded border border-[#1e3350]/40 bg-[#0b1525] px-0.5 py-[2px] text-[6px] text-[#7a94b8] sm:px-1 sm:py-0.5 sm:text-[7px]">
              <Clock size={8} className="shrink-0 text-[#637fa0]" />
              <span>{getRelativeTime(event.commenceTime)}</span>
            </span>
          </div>
        </div>

        {/* Odds row — 3 columns */}
        <div className="rounded-lg border border-[#1e3350]/30 bg-[#0b1525]/60 p-1 sm:p-1.5">
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
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
