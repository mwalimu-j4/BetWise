import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Copy, Loader2, MessageCircle, Share2, X } from "lucide-react";
import type { UseBetSlipReturn } from "../hooks/useBetSlip";
import { betSlipToggleEventName } from "../hooks/useBetSlip";

function formatCurrency(value: number) {
  return `KES ${value.toLocaleString(undefined, {
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
  stake,
  setStake,
  potentialPayout,
  placeBet,
  placing,
  error,
  success,
  newBalance,
  isAuthenticated,
  onClose,
  compactActions = false,
}: UseBetSlipReturn & { onClose?: () => void; compactActions?: boolean }) {
  const totalStake = stake * selections.length;
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
      <div className="flex h-full flex-col rounded-xl border border-[#2a3f55] bg-[#0d1820] p-4 text-white shadow-2xl">
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-[#2a3f55] bg-[#111f2f]/50 p-6 text-center">
          <p className="text-sm font-semibold text-white">No selection yet</p>
          <p className="mt-1 text-xs text-[#8fa3b1]">
            Tap odds to build your multi-pick bet slip.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#2a3f55] bg-[#0d1820] text-white shadow-2xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#2a3f55] bg-[#111f2f] px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold tracking-widest text-white">
            BET SLIP
          </h2>
          <span className="flex h-5 items-center justify-center rounded-full bg-[#f5a623]/20 px-2 text-[11px] font-bold text-[#f5a623]">
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
      <div className="app-scrollbar flex-1 overflow-y-auto p-3 space-y-2">
        {selections.map((selection, index) => (
          <div
            key={`${selection.eventId}-${selection.side}`}
            className="flex items-center gap-3 rounded-lg border border-[#2a3f55] bg-[#1a2634] p-3 shadow-sm transition-colors hover:border-[#3a526b]"
          >
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-white mb-0.5">
                {selection.eventName}
              </p>
              <p className="text-[11px] text-[#8fa3b1] truncate">
                {selection.marketType.toUpperCase()} • {selection.side}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <p className="text-sm font-bold text-[#f5a623]">
                {selection.odds.toFixed(2)}
              </p>
              <button
                type="button"
                onClick={() => removeSelection(selection.eventId)}
                className="rounded-full p-1 text-[#8fa3b1] transition hover:bg-red-500/20 hover:text-red-400"
                aria-label="Remove selection"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Controls */}
      <div className="shrink-0 border-t border-[#2a3f55] bg-[#0d1820] p-3 space-y-3">
        {/* Stake section */}
        <div className="space-y-2">
          <div className="flex rounded-md border border-[#2a3f55] bg-[#1a2940] overflow-hidden focus-within:border-[#f5a623] transition-colors">
            <div className="flex items-center bg-[#111f2f] px-3 border-r border-[#2a3f55]">
              <label
                className="text-xs font-medium text-[#8fa3b1]"
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
              className="w-full bg-transparent px-3 py-2 text-center text-sm font-bold text-white outline-none"
            />
          </div>

          {/* Quick-add buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {[100, 500, 1000, 5000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setStake(stake + amount)}
                className="flex h-8 items-center justify-center rounded border border-[#2a3f55] bg-[#1a2940] text-[11px] font-medium text-[#8fa3b1] transition hover:border-[#f5a623] hover:text-white hover:bg-[#20324c]"
              >
                +{amount}
              </button>
            ))}
          </div>
        </div>

        {/* Summary box */}
        <div className="rounded-lg border border-[#1d4c2d] bg-[#10261a] p-2.5">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[11px] text-[#8fa3b1]">Potential Win</p>
              <p className="text-sm font-bold text-[#00c853]">
                {formatCurrency(potentialPayout)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#8fa3b1]">
                Pick: {formatCurrency(stake || 0)}
              </p>
              <p className="text-[10px] text-[#8fa3b1]">
                Total: {formatCurrency(totalStake)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-[#1d4c2d]/50 pt-2 text-[11px]">
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
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-center">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-md border border-[#00c853]/30 bg-[#00c853]/10 p-2 text-center">
            <p className="text-xs font-semibold text-[#00c853]">
              ✓ Bet Placed Successfully!
            </p>
            {newBalance !== null && (
              <p className="text-[11px] text-[#00c853]/80 mt-0.5">
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
              onClick={() => void placeBet()}
              disabled={placing}
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#f5a623] text-xs font-bold text-black disabled:opacity-70"
            >
              {placing ? <Loader2 size={14} className="animate-spin" /> : null}
              {placing
                ? "Processing..."
                : isAuthenticated
                  ? `Place Bet`
                  : "LOGIN TO BET"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void placeBet()}
            disabled={placing}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#f5a623] text-sm font-bold text-black transition hover:bg-[#e09000] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {placing ? <Loader2 size={16} className="animate-spin" /> : null}
            {placing
              ? "PROCESSING..."
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
    const onToggleRequest = () => setIsOpen((current) => !current);
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
      {/* Desktop Sidebar Sidebar - Now with proper padding from top if needed */}
      <div className="fixed right-0 top-16 bottom-0 hidden w-[380px] flex-col p-4 md:flex z-30">
        <BetSlipPanel {...props} />
      </div>

      {/* Mobile Sticky Footer Trigger */}
      {selections.length > 0 && (
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-t border-[#2a3f55] bg-[#0d1820] px-5 text-left text-white md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.5)]"
        >
          <div>
            <p className="text-xs font-medium text-[#8fa3b1]">Betslip</p>
            <p className="text-sm font-bold text-[#00c853]">
              Win {formatCurrency(props.potentialPayout)}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5a623] text-sm font-bold text-black">
            {selections.length}
          </div>
        </button>
      )}

      {/* Mobile Slide-Up Sheet */}
      <div
        className={`md:hidden ${mobileSheetOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            mobileSheetOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileSheetOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 flex h-[85vh] flex-col overflow-hidden rounded-t-2xl bg-[#0d1820] transition-transform duration-300 ease-out ${
            mobileSheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex-1 p-2">
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
