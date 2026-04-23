import { useEffect, useMemo, useState } from "react";
import { Clock, TrendingUp } from "lucide-react";
import { isAxiosError } from "axios";
import { api } from "@/api/axiosConfig";
import EventMarketsModal from "./EventMarketsModal";
import type { BetSelection } from "./hooks/useBetSlip";
import type { ApiEvent } from "./hooks/useEvents";

type EventCardProps = {
  event: ApiEvent;
  onOddsSelect: (selection: BetSelection) => void;
  selectedOdds: Set<string>;
  highlightLabel?: string;
};

type DisplayedOddCountItem = {
  marketType: string;
  bookmakerName: string;
};

function formatKickoffCompact(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(value))
    .replace(",", "")
    .replace(/\s(AM|PM)$/i, (match) => ` ${match.trim().toUpperCase()}`);
}

function getLeagueShortName(event: ApiEvent) {
  const rawLeague = (event.leagueName ?? "").trim();
  if (!rawLeague) {
    return "MATCH";
  }

  const upper = rawLeague.toUpperCase();
  if (upper.includes("CHAMPIONS")) return "UCL";
  if (upper.includes("PREMIER")) return "EPL";
  if (upper.includes("LA LIGA")) return "LALIGA";
  if (upper.includes("BUNDES")) return "BUND";
  if (upper.includes("SERIE")) return "SERIE A";
  if (upper.includes("LIGUE 1")) return "LIGUE 1";

  const words = rawLeague.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 8).toUpperCase();
  }

  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 6)
    .toUpperCase();
}

function getLeagueDotClass(event: ApiEvent) {
  const league = (event.leagueName ?? "").toLowerCase();
  const sport = (event.sportKey ?? "").toLowerCase();

  if (league.includes("champions") || league.includes("premier")) {
    return "bg-[#2da7ff]";
  }

  if (
    league.includes("la liga") ||
    league.includes("serie") ||
    sport.includes("soccer")
  ) {
    return "bg-[#f5c518]";
  }

  if (league.includes("nba") || sport.includes("basketball")) {
    return "bg-[#ff7a45]";
  }

  if (sport.includes("tennis")) {
    return "bg-[#6be675]";
  }

  return "bg-[#8aa4c5]";
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
  isBoosted,
  onOddsSelect,
}: {
  entry: OddsPreview;
  event: ApiEvent;
  isSelected: boolean;
  isBoosted: boolean;
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
      className={`odds-btn mobile-event-odds ${isSelected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""} group/odds relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border px-1 py-1.5 text-center transition-all duration-200 ${
        disabled
          ? "cursor-not-allowed border-[#203349] bg-[#122131] text-[#3d5478]"
          : isSelected
            ? "border-[#f5c518] bg-[linear-gradient(180deg,rgba(245,197,24,0.16),rgba(245,197,24,0.06))] text-[#f5c518] shadow-[0_0_0_1px_rgba(245,197,24,0.25),0_4px_14px_rgba(245,197,24,0.2)]"
            : isBoosted
              ? "border-[#c48d1e] bg-[linear-gradient(180deg,#2b2311,#1b1a1d)] text-[#ffd36a] shadow-[0_0_10px_rgba(245,166,35,0.14)] hover:border-[#f5c518]"
              : "border-[#26405b] bg-[#132437] text-white hover:border-[#f5c518]/70 hover:bg-[#163049] active:scale-[0.98]"
      }`}
    >
      <span
        className={`text-[8px] font-bold uppercase tracking-[0.12em] ${
          disabled
            ? "text-[#3d5478]"
            : isSelected
              ? "text-[#ffd500]/80"
              : isBoosted
                ? "text-[#f5c518]/70"
                : "text-[#7f98b8]"
        }`}
      >
        {entry.label}
      </span>
      <span
        className={`text-[13px] font-extrabold tabular-nums sm:text-[14px] ${
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
  highlightLabel,
}: EventCardProps) {
  const [showMarkets, setShowMarkets] = useState(false);

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
  const boostedOdd = useMemo(() => {
    return oddsPreview.reduce<OddsPreview | null>((best, current) => {
      if (typeof current.odds !== "number") {
        return best;
      }

      if (!best || (best.odds ?? 0) < current.odds) {
        return current;
      }

      return best;
    }, null);
  }, [oddsPreview]);

  const isLive = event.status === "LIVE";
  const hasLiveScore =
    typeof event.homeScore === "number" && typeof event.awayScore === "number";
  const kickoffDisplay = formatKickoffCompact(event.commenceTime);
  const leagueShortName = getLeagueShortName(event);
  const leagueDotClass = getLeagueDotClass(event);

  return (
    <article
      className={`event-card mobile-event-card group relative w-full max-w-full overflow-hidden rounded-xl border bg-[#0f1923] transition-all duration-300 ${
        highlightLabel
          ? "border-[#8e6612]/65 hover:border-[#c48d1e]"
          : "border-[#24384f] hover:border-[#355373]"
      }`}
    >
      {/* Subtle top accent line */}
      <div
        className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent to-transparent transition-opacity group-hover:opacity-100 ${
          highlightLabel
            ? "via-[#f5c518]/60 opacity-100"
            : "via-[#ffd500]/25 opacity-0"
        }`}
      />

      <div className="relative flex h-full flex-col gap-0 p-[10px]">
        {highlightLabel ? (
          <div className="pb-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#8e6612]/40 bg-[#f5c518]/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#f5c518]">
              {highlightLabel}
            </span>
          </div>
        ) : null}

        <div className="event-card-header flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${leagueDotClass}`}
            />
            <p className="event-card-league truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8aa4c5]">
              {leagueShortName}
            </p>
          </div>

          <div className="event-card-meta flex shrink-0 items-center gap-1.5">
            {isLive ? (
              <span className="inline-flex items-center rounded-full border border-[#1ea84a]/60 bg-[#1ea84a]/15 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-[0.08em] text-[#58e27f]">
                Live
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setShowMarkets(true)}
              className="event-card-markets event-card-markets-top inline-flex shrink-0 items-center gap-1 rounded border border-[#29425f] bg-[#122235] px-1.5 py-[2px] text-[9px] font-semibold text-[#95afcc] transition hover:border-[#f5c518]/55 hover:text-[#f5c518]"
            >
              <TrendingUp size={10} />
              <span className="sm:hidden">+{event.marketCount}</span>
              <span className="hidden sm:inline">+{event.marketCount} markets</span>
            </button>
            <span className="event-card-countdown inline-flex items-center gap-0.5 text-[10px] font-medium text-[#8099b8]">
              <Clock size={10} className="text-[#5f7898]" />
              {kickoffDisplay}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMarkets(true)}
          className="event-card-matchup w-full px-0 pb-0 pt-1.5 text-left"
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="event-card-team truncate text-[12px] font-semibold leading-[1.2] text-[#f1f6ff]">
              {event.homeTeam}
            </span>
            {isLive && hasLiveScore ? (
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-[#c9d8ea]">
                {event.homeScore} - {event.awayScore}
              </span>
            ) : null}
          </div>

          <div className="my-1.5 flex items-center gap-2">
            <span className="h-px flex-1 bg-[#21364d]" />
          </div>

          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="event-card-team truncate text-[12px] font-semibold leading-[1.2] text-[#f1f6ff]">
              {event.awayTeam}
            </span>
            {!isLive ? (
              <span className="event-card-vs shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6f89aa]">
                VS
              </span>
            ) : null}
          </div>
        </button>

        <div className="event-card-odds-wrap border-t border-[#1d3147] px-0 pb-0 pt-2">
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
                isBoosted={Boolean(
                  highlightLabel &&
                  boostedOdd &&
                  boostedOdd.label === entry.label &&
                  boostedOdd.odds === entry.odds,
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
