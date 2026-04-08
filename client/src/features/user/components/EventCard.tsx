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
      className={`flex h-8 min-w-0 items-center justify-between gap-1 overflow-hidden rounded-md border px-1.5 text-[11px] transition sm:h-9 sm:px-2 sm:text-xs ${
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
    <article className="group relative overflow-hidden rounded-xl border border-[#3a4f74] bg-[linear-gradient(160deg,#2c3a5c_0%,#25324f_55%,#1e2940_100%)] p-2.5 shadow-[0_10px_22px_rgba(0,0,0,0.28)] transition-all duration-200 hover:border-[#4f6792] hover:shadow-[0_16px_32px_rgba(0,0,0,0.34)] sm:rounded-2xl sm:p-4 sm:shadow-[0_12px_26px_rgba(0,0,0,0.28)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f0b429]/10 to-transparent" />
      <div className="relative flex h-full min-h-[118px] flex-col justify-between gap-2.5 overflow-hidden sm:min-h-[136px] sm:gap-3">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-[#9aa7c7] sm:text-[10px]">
              {event.leagueName ?? "Featured Match"}
            </p>

            <button
              type="button"
              onClick={() => setShowMarkets(true)}
              className="shrink-0 rounded-full border border-[#5a6e95] bg-[#17233b]/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#f0c040] transition hover:border-[#f0c040] hover:bg-[#f0c040]/12 sm:px-3 sm:py-1 sm:text-[10px]"
            >
              +{marketCount} Markets
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMarkets(true)}
            className="mt-1 w-full text-left sm:mt-1.5"
          >
            <h3 className="truncate text-[14px] font-bold leading-tight text-white sm:text-base">
              {event.homeTeam} vs {event.awayTeam}
            </h3>
          </button>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[#a7b4d4] sm:mt-2 sm:gap-2 sm:text-[11px]">
            <span className="inline-flex min-w-0 items-center gap-1 rounded-md border border-[#31486b] bg-[#192741] px-1.5 py-0.5 sm:px-2 sm:py-1">
              <Calendar size={11} className="shrink-0 sm:h-3 sm:w-3" />
              <span className="truncate">
                {formatCardDateTime(event.commenceTime)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#2e4262] bg-[#17253c] px-1.5 py-0.5 text-[#b9c6e3] sm:px-2">
              <Clock size={10} className="shrink-0 sm:h-[11px] sm:w-[11px]" />
              <span>{getRelativeTime(event.commenceTime)}</span>
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-[#3a4d72] bg-[#1a2740]/70 p-1.5 sm:rounded-xl sm:p-2">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
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
