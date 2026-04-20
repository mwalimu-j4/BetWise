import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Copy, Loader2, MessageCircle, Share2, X } from "lucide-react";
import type { BetSelection, UseBetSlipReturn } from "./hooks/useBetSlip";
import { betSlipToggleEventName } from "./hooks/useBetSlip";

function formatCurrency(value?: number) {
  const safeValue = Number(value) || 0;
  return `KES ${safeValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildShareText({
  selections,
  stake,
  potentialPayout,
}: Pick<UseBetSlipReturn, "selections" | "stake" | "potentialPayout">) {
  const picks = selections
    .map(
      (selection, index) =>
        `${index + 1}. ${selection.eventName} - ${selection.marketType.toUpperCase()} ${selection.side} @ ${selection.odds.toFixed(2)}`,
    )
    .join("\n");

  return `BetixPro Betslip\n\n${picks}\n\nStake: ${formatCurrency(stake)}\nPotential Payout: ${formatCurrency(potentialPayout)}\n\n${window.location.origin}/user`;
}

function BetSlipPanel({
  selections,
  removeSelection,
  removeExpiredSelections,
  stake,
  setStake,
  potentialPayout,
  placeBet,
  placing,
  error,
  success,
  newBalance,
  isAuthenticated,
  hasExpiredSelections,
  onClose,
  compactActions = false,
}: UseBetSlipReturn & { onClose?: () => void; compactActions?: boolean }) {
  const safeStake = stake || 0;
  const totalStake = safeStake * selections.length;
  const [copySuccess, setCopySuccess] = useState(false);

  const totalOdds = useMemo(() => {
    if (selections.length === 0) return 0;
    return selections.reduce((acc, selection) => acc * selection.odds, 1);
  }, [selections]);

  const shareText = useMemo(
    () => buildShareText({ selections, stake, potentialPayout }),
    [potentialPayout, selections, stake],
  );

  const handleStakeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    setStake(Number.isFinite(nextValue) ? nextValue : 0);
  };

  const handlePrimaryAction = () => {
    if (hasExpiredSelections) {
      removeExpiredSelections();
      return;
    }

    void placeBet();
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "My BetixPro Betslip",
          text: shareText,
          url: `${window.location.origin}/user`,
        });
        return;
      } catch {
        // Fallback below.
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 1500);
    } catch {
      // No-op.
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/user`);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 1500);
    } catch {
      // No-op.
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  if (selections.length === 0) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#2a3f55] bg-[#0d1820] p-4 text-white shadow-2xl">
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-[#2a3f55] bg-[#111f2f]/50 p-6 text-center">
          <p className="text-sm font-semibold text-white">No selection yet</p>
          <p className="mt-1 text-xs text-[#8fa3b1]">
            Tap odds to build your multi-pick bet slip.
          </p>
        </div>
      </div>
    );
  }

  function isSelectionExpired(selection: BetSelection) {
    const item = selection as unknown as Record<string, unknown>;

    if (typeof item.isExpired === "boolean") return item.isExpired;
    if (typeof item.expired === "boolean") return item.expired;

    const status = String(item.status ?? item.eventStatus ?? "").toLowerCase();
    if (
      ["closed", "ended", "finished", "settled", "expired"].includes(status)
    ) {
      return true;
    }

    const dateCandidates = [
      item.startTime,
      item.startsAt,
      item.kickoff,
      item.kickoffTime,
      item.eventTime,
      item.commenceTime,
      item.date,
    ];

    for (const value of dateCandidates) {
      if (value == null) continue;

      let epochMs: number | null = null;

      if (typeof value === "number" && Number.isFinite(value)) {
        epochMs = value < 1_000_000_000_000 ? value * 1000 : value;
      } else if (typeof value === "string") {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) epochMs = parsed;
      } else if (value instanceof Date) {
        epochMs = value.getTime();
      }

      if (epochMs !== null) {
        return epochMs <= Date.now();
      }
    }

    return false;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#2a3f55] bg-[#0d1820] text-white shadow-2xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#2a3f55] bg-[#111f2f] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-bold tracking-widest text-white">
            BET SLIP
          </h2>
          <span className="flex h-4.5 items-center justify-center rounded-full bg-[#f5a623]/20 px-1.5 text-[10px] font-bold text-[#f5a623] sm:text-[10px]">
            {selections.length}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#8fa3b1] transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Selection list */}
      <div className="app-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto p-1.5 sm:space-y-1 sm:p-2">
        {selections.map((selection) => (
          <div
            key={`${selection.eventId}-${selection.side}`}
            className="flex items-center gap-1.5 rounded-md border border-[#2a3f55] bg-[#1a2634] p-1.5 shadow-sm transition-colors hover:border-[#3a526b] sm:gap-2 sm:p-2"
          >
            <div className="min-w-0 flex-1">
              {isSelectionExpired(selection) ? (
                <span className="mb-1 inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-2 py-[2px] text-[9px] font-bold uppercase tracking-[0.08em] text-red-300">
                  Expired
                </span>
              ) : null}
              <p className="mb-0.5 truncate text-[9.5px] font-semibold leading-tight text-white sm:text-[10px]">
                {selection.eventName}
              </p>
              <p className="truncate text-[8px] leading-tight text-[#8fa3b1] sm:text-[8.5px]">
                {selection.marketType.toUpperCase()} • {selection.side}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <p className="text-[10.5px] font-semibold text-[#f5a623] sm:text-[11px]">
                {selection.odds.toFixed(2)}
              </p>
              <button
                type="button"
                onClick={() => removeSelection(selection.eventId)}
                className="rounded-full p-0.5 text-[#8fa3b1] transition hover:bg-red-500/20 hover:text-red-400"
                aria-label="Remove selection"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Controls */}
      <div className="shrink-0 space-y-2.5 border-t border-[#2a3f55] bg-[#0d1820] p-2.5">
        {/* Stake section */}
        <div className="space-y-1.5">
          <div className="flex overflow-hidden rounded-md border border-[#2a3f55] bg-[#1a2940] transition-colors focus-within:border-[#f5a623]">
            <div className="flex items-center border-r border-[#2a3f55] bg-[#111f2f] px-2.5">
              <label
                className="text-[11px] font-medium text-[#8fa3b1]"
                htmlFor="bet-stake"
              >
                Stake
              </label>
            </div>
            <input
              id="bet-stake"
              type="number"
              min={50}
              max={100000}
              value={stake || ""}
              onChange={handleStakeChange}
              placeholder="50"
              className="w-full bg-transparent px-2.5 py-1.5 text-center text-[15px] font-bold text-white outline-none"
            />
          </div>

          {/* Quick-add buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {[100, 500, 1000, 5000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setStake(safeStake + amount)}
                className="flex h-7 items-center justify-center rounded border border-[#2a3f55] bg-[#1a2940] text-[10px] font-medium text-[#8fa3b1] transition hover:border-[#f5a623] hover:bg-[#20324c] hover:text-white sm:text-[10px]"
              >
                +{amount}
              </button>
            ))}
          </div>
        </div>

        {/* Summary box */}
        <div className="rounded-lg border border-[#1d4c2d] bg-[#10261a] p-2">
          <div className="mb-1.5 flex items-end justify-between">
            <div>
              <p className="text-[10px] text-[#8fa3b1] sm:text-[10px]">
                Potential Win
              </p>
              <p className="text-[20px] font-bold leading-tight text-[#00c853] sm:text-[22px]">
                {formatCurrency(potentialPayout)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#8fa3b1] sm:text-[10px]">
                Pick: {formatCurrency(safeStake)}
              </p>
              <p className="text-[10px] text-[#8fa3b1] sm:text-[10px]">
                Total: {formatCurrency(totalStake)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 border-t border-[#1d4c2d]/50 pt-1.5 text-[10px] sm:text-[10px]">
            <div>
              <p className="text-[#8fa3b1]">Bal</p>
              <p className="font-semibold text-white">KES 0.00</p>
            </div>
            <div className="text-center">
              <p className="text-[#8fa3b1]">Odds</p>
              <p className="font-semibold text-white">
                {totalOdds > 0 ? totalOdds.toFixed(2) : "-"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[#8fa3b1]">Payout</p>
              <p className="font-semibold text-white">
                {formatCurrency(potentialPayout)}
              </p>
            </div>
          </div>
        </div>

        {/* Error/Success states */}
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-1.5 text-center">
            <p className="text-[11px] text-red-400">{error}</p>
          </div>
        )}

        {hasExpiredSelections && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-1.5 text-center">
            <p className="text-[11px] text-red-300">
              Remove expired selections before placing a bet.
            </p>
          </div>
        )}

        {success && (
          <div className="rounded-md border border-[#00c853]/30 bg-[#00c853]/10 p-1.5 text-center">
            <p className="text-[11px] font-semibold text-[#00c853]">
              ✓ Bet Placed Successfully!
            </p>
            {newBalance !== null && newBalance !== undefined && (
              <p className="mt-0.5 text-[10px] text-[#00c853]/80">
                New balance: {formatCurrency(newBalance)}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {compactActions ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#2a3f55] bg-[#1a2940] text-xs font-semibold text-white hover:bg-[#20324c]"
            >
              <Share2 size={14} /> Share
            </button>
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={placing}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#f5a623] text-[11px] font-bold text-black disabled:opacity-70"
            >
              {placing ? <Loader2 size={14} className="animate-spin" /> : null}
              {placing
                ? "Processing..."
                : hasExpiredSelections
                  ? "REMOVE EXPIRED PICKS"
                  : isAuthenticated
                    ? `Place Bet`
                    : "LOGIN TO BET"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={placing}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#f5a623] text-[13px] font-bold text-black transition hover:bg-[#e09000] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {placing ? <Loader2 size={16} className="animate-spin" /> : null}
            {placing
              ? "PROCESSING..."
              : hasExpiredSelections
                ? "REMOVE EXPIRED PICKS"
                : isAuthenticated
                  ? `PLACE ${selections.length} BET${selections.length === 1 ? "" : "S"}`
                  : "LOGIN TO BET"}
          </button>
        )}

        {/* Extra Share options for compact view */}
        {compactActions && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#2a3f55] bg-[#111f2f] text-[10px] text-[#8fa3b1] hover:text-white"
            >
              <Copy size={12} /> {copySuccess ? "Copied!" : "Copy Link"}
            </button>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#2a3f55] bg-[#111f2f] text-[10px] text-[#8fa3b1] hover:text-[#25D366]"
            >
              <MessageCircle size={12} /> WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BetSlip(props: UseBetSlipReturn) {
  const { selections, isOpen, setIsOpen } = props;
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onToggleRequest = () => {
      if (window.innerWidth < 768) {
        setMobileSheetOpen((current) => !current);
        return;
      }

      setIsOpen((current) => !current);
    };
    window.addEventListener(betSlipToggleEventName, onToggleRequest);
    return () =>
      window.removeEventListener(betSlipToggleEventName, onToggleRequest);
  }, [setIsOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 768 && isOpen) setIsOpen(false);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (selections.length === 0) setMobileSheetOpen(false);
  }, [selections.length]);

  return (
    <>
      {/* Desktop wrapper is fixed below the navbar and scrolls internally. */}
      <div
        className="fixed right-0 z-[900] hidden h-[calc(100vh-var(--navbar-height))] w-[300px] overflow-y-auto border-l border-white/10 bg-[#0b1625]/35 p-2.5 shadow-[-4px_0_15px_rgba(0,0,0,0.3)] md:flex md:flex-col"
        style={{ top: "var(--navbar-height)" }}
      >
        <BetSlipPanel {...props} />
      </div>

      {/* Mobile Sticky Footer Trigger */}
      {selections.length > 0 && (
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+58px)] left-2 right-2 z-[55] flex h-11 items-center justify-between rounded-xl border border-[#2a3f55] bg-[#0d1820]/95 px-3 text-left text-white shadow-[0_-4px_10px_rgba(0,0,0,0.45)] md:hidden"
        >
          <div>
            <p className="text-[11px] font-medium text-[#8fa3b1]">Betslip</p>
            <p className="text-lg font-bold leading-tight text-[#00c853]">
              Win {formatCurrency(props.potentialPayout)}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5a623] text-xs font-bold text-black">
            {selections.length}
          </div>
        </button>
      )}

      {/* Mobile Slide-Up Sheet */}
      <div
        className={`md:hidden ${mobileSheetOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            mobileSheetOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileSheetOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`fixed bottom-0 left-0 right-0 z-[80] flex h-[85vh] min-h-0 flex-col overflow-hidden rounded-t-2xl bg-[#0d1820] transition-transform duration-300 ease-out ${
            mobileSheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 78px)",
            height: "calc(85vh - 78px)",
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-2 pb-3">
            <BetSlipPanel
              {...props}
              compactActions
              onClose={() => setMobileSheetOpen(false)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
