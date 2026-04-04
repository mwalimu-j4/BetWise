import type { BetSelection } from "../hooks/useBetSlip";

type OddsButtonProps = {
  label: string;
  odds: number;
  eventId: string;
  eventName: string;
  leagueName: string;
  marketType: string;
  side: string;
  commenceTime: string;
  isSelected: boolean;
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
  onSelect,
}: OddsButtonProps) {
  return (
    <button
      type="button"
      onClick={() =>
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
      className={`relative flex h-11 w-full flex-col items-start justify-center rounded-md border px-3 text-left transition-all duration-200 ease-in-out hover:translate-y-[-1px] hover:shadow-[0_8px_18px_rgba(0,0,0,0.18)] ${
        isSelected
          ? "border-[#00c853] bg-[#153325] ring-1 ring-[#00c853]/40"
          : "border-[#2a3f55] bg-[#1a2940] hover:border-[#4a6f8a]"
      }`}
    >
      {isSelected ? (
        <span className="absolute right-2 top-1 text-[10px] text-[#00c853]">
          ✓
        </span>
      ) : null}
      <span className="text-[11px] leading-none text-[#8fa3b1]">{label}</span>
      <span
        className={`mt-1 text-[15px] font-bold leading-none ${
          isSelected ? "text-[#00c853]" : "text-[#f5a623]"
        }`}
      >
        {odds.toFixed(2)}
      </span>
    </button>
  );
}
