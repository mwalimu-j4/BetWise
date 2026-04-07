import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock } from "lucide-react";
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
      className={`flex h-9 min-w-0 items-center justify-between gap-1 overflow-hidden rounded-md border px-2 text-xs transition ${
        disabled
          ? "cursor-not-allowed border-[#3a4468] bg-[#1f2640] text-[#6f7ca8]"
          : isSelected
            ? "border-[#f0b429] bg-[#f0b429]/15 text-[#f0b429]"
            : "border-[#3a4468] bg-[#2a3150] text-white hover:bg-[#313a5c]"
      }`}
    >
      <span className="truncate">{entry.label}</span>
      <span className="shrink-0 font-bold">
        {typeof entry.odds === "number" ? entry.odds.toFixed(2) : "--"}
      </span>
    </button>
  );
}

export default function EventCard({ event, onOddsSelect, selectedOdds }: EventCardProps) {
  const [marketCount, setMarketCount] = useState<number>(0);
  const [showMarkets, setShowMarkets] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchMarketCount = async () => {
      try {
        const { data } = await api.get<{ displayedOdds?: unknown[] }>(
          `/user/events/${event.eventId}`,
        );

        if (!cancelled) {
          setMarketCount(Array.isArray(data.displayedOdds) ? data.displayedOdds.length : 0);
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
      { label: "1", side: event.homeTeam, odds: event.markets.h2h?.home ?? null },
      { label: "X", side: "Draw", odds: event.markets.h2h?.draw ?? null },
      { label: "2", side: event.awayTeam, odds: event.markets.h2h?.away ?? null },
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
    <article className="overflow-hidden rounded-lg border border-[#31466f] bg-[#2a3554] p-3 shadow-[0_8px_18px_rgba(0,0,0,0.24)]">
      <div className="flex h-full min-h-[132px] flex-col justify-between gap-2 overflow-hidden">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9aa7c7]">
              {event.leagueName ?? "Featured Match"}
            </p>

            <button
              type="button"
              onClick={() => setShowMarkets(true)}
              className="shrink-0 rounded-full border border-[#48557d] bg-[#1d2640] px-2.5 py-1 text-[11px] font-semibold text-[#f0b429]"
            >
              +{marketCount} Markets
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMarkets(true)}
            className="mt-1 w-full text-left"
          >
            <h3 className="truncate text-[15px] font-bold text-white sm:text-base">
              {event.homeTeam} vs {event.awayTeam}
            </h3>
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#a7b4d4]">
            <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-[#1f2943] px-2 py-1">
              <Calendar size={12} className="shrink-0" />
              <span className="truncate">{formatCardDateTime(event.commenceTime)}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1b2440] px-2 py-0.5 text-[#b9c6e3]">
              <Clock size={11} className="shrink-0" />
              <span>{getRelativeTime(event.commenceTime)}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {oddsPreview.map((entry) => (
            <OddsPreviewButton
              key={entry.label}
              entry={entry}
              event={event}
              isSelected={selectedOdds.has(
                `${event.eventId}:h2h:${entry.side}:${
                  typeof entry.odds === "number" ? entry.odds.toFixed(2) : "0.00"
                }`,
              )}
              onOddsSelect={onOddsSelect}
            />
          ))}
        </div>
      </div>

      <EventMarketsModal
        eventId={event.eventId}
        isOpen={showMarkets}
        onClose={() => setShowMarkets(false)}
        onOddsSelect={onOddsSelect}
        selectedOdds={selectedOdds}
      />
    </article>
  );
}
