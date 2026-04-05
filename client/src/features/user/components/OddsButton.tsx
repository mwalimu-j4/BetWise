import type { BetSelection } from "../hooks/useBetSlip";

type OddsButtonProps = {
  label: string;
  odds: number | null;
  eventId: string;
  eventName: string;
  leagueName: string;
  marketType: string;
  side: string;
  commenceTime: string;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: (selection: BetSelection) => void;
};

export default function OddsButton({
  label,
  odds,
  eventId,
  eventName,
  leagueName,
  marketType,
  side,
  commenceTime,
  isSelected,
  disabled = false,
  onSelect,
}: OddsButtonProps) {
  const isUnavailable = disabled || odds === null;

  return (
    <button
      type="button"
      onClick={() =>
        !isUnavailable &&
        onSelect({
          eventId,
          eventName,
          leagueName,
          marketType,
          side,
          odds,
          commenceTime,
        })
      }
      disabled={isUnavailable}
      className={`relative flex h-8 w-full items-center justify-between rounded-md border px-2 text-left transition-all duration-200 ease-in-out ${
        isSelected
          ? "border-[#f5c518] bg-[#f5c518] text-[#0b1120]"
          : "border-[#2b3d54] bg-[#1a2a3e] text-white hover:border-[#f5c518]/70 hover:text-[#f5c518]"
      }`}
    >
      <span
        className={`text-[10px] font-semibold leading-none ${
          isSelected ? "text-[#0b1120]/80" : "text-[#8a9bb0]"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-[13px] font-bold leading-none ${
          isSelected ? "text-[#0b1120]" : "text-white"
        }`}
      >
        {odds === null ? "--" : odds.toFixed(2)}
      </span>
    </button>
  );
}
