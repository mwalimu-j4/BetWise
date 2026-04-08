import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
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

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[#2a3f55] bg-[#0d1820] p-2.5 text-white shadow-[0_18px_36px_rgba(0,0,0,0.25)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a3f55] pb-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-bold tracking-[0.18em] text-white">
            BET SLIP
          </h2>
          <span className="rounded-full bg-[#f5a623]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#f5a623]">
            {selections.length}
          </span>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-0.5 text-[#8fa3b1] transition hover:bg-white/5 hover:text-white"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {selections.length > 0 ? (
        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5">
          {/* Selection list */}
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5 app-scrollbar">
            {selections.map((selection, index) => (
              <div
                key={`${selection.eventId}-${selection.side}`}
                className="flex items-center gap-2 rounded-md border border-[#2a3f55] bg-[#1a2634] px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-white leading-tight">
                    {selection.eventName}
                  </p>
                  <p className="text-[10px] text-[#8fa3b1] leading-tight">
                    {index + 1} · {selection.marketType.toUpperCase()} ·{" "}
                    {selection.side}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-[#f5a623]">
                  {selection.odds.toFixed(2)}
                </p>
                <button
                  type="button"
                  onClick={() => removeSelection(selection.eventId)}
                  className="shrink-0 rounded-full p-0.5 text-[#8fa3b1] transition hover:text-white"
                  aria-label="Remove selection"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Footer controls */}
          <div className="shrink-0 space-y-1 border-t border-[#2a3f55] bg-[#0d1820] pt-1.5">
            {/* Stake input */}
            <div className="flex items-center gap-1.5">
              <label
                className="whitespace-nowrap text-[10px] font-medium text-[#8fa3b1]"
                htmlFor="bet-stake"
              >
                Stake (KES)
              </label>
              <input
                id="bet-stake"
                type="number"
                min={50}
                max={100000}
                value={stake || ""}
                onChange={handleStakeChange}
                placeholder="50"
                className="h-7 w-full rounded-md border border-[#2a3f55] bg-[#1a2940] px-2 text-center text-xs text-white outline-none transition focus:border-[#f5a623]"
              />
            </div>

            {/* Quick-add buttons */}
            <div className="grid grid-cols-4 gap-1">
              {[100, 500, 1000, 5000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setStake(stake + amount)}
                  className="h-6 rounded border border-[#2a3f55] bg-[#1a2940] px-1 text-[10px] font-medium text-[#8fa3b1] transition hover:border-[#f5a623] hover:text-white"
                >
                  +{amount}
                </button>
              ))}
            </div>

            {/* Summary box */}
            <div className="rounded border border-[#1d4c2d] bg-[#10261a] px-2 py-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] text-[#8fa3b1]">
                    Potential Total Win
                  </p>
                  <p className="truncate text-base font-bold leading-tight text-[#00c853]">
                    {formatCurrency(potentialPayout)}
                  </p>
                </div>
                <div className="text-right text-[9px] leading-tight text-[#8fa3b1]">
                  <p>Pick: {formatCurrency(stake || 0)}</p>
                  <p>Total: {formatCurrency(totalStake)}</p>
                </div>
              </div>

              <div className="mt-1 grid grid-cols-3 gap-1 rounded border border-[#2a3f55] bg-[#111f2f] px-1.5 py-0.5 text-[9px]">
                <div className="min-w-0">
                  <p className="text-[#8fa3b1]">Bal</p>
                  <p className="truncate font-semibold text-white">KES0</p>
                </div>
                <div className="min-w-0 text-center">
                  <p className="text-[#8fa3b1]">Odds</p>
                  <p className="truncate font-semibold text-white">
                    {totalOdds > 0 ? totalOdds.toFixed(2) : "-"}
                  </p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-[#8fa3b1]">Payout</p>
                  <p className="truncate font-semibold text-white">
                    {formatCurrency(potentialPayout)}
                  </p>
                </div>
              </div>
            </div>

            {/* Error state */}
            {error ? (
              <div className="rounded border border-[#5a222a] bg-[#2a1515] p-2">
                <p className="text-xs text-red-200">{error}</p>
                <button
                  type="button"
                  onClick={() => void placeBet()}
                  className="mt-2 text-xs font-semibold text-white underline underline-offset-4"
                >
                  Try Again
                </button>
              </div>
            ) : null}

            {/* Success state */}
            {success ? (
              <div className="rounded border border-[#1d4c2d] bg-[#10261a] p-2">
                <p className="text-xs font-semibold text-[#00c853]">
                  ✓ Bet Placed Successfully!
                </p>
                {newBalance !== null ? (
                  <p className="mt-0.5 text-[11px] text-[#b5f5c8]">
                    New balance: {formatCurrency(newBalance)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* CTA */}
            {compactActions ? (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#2a3f55] bg-[#1a2940] text-xs font-semibold text-white"
                >
                  <Share2 size={13} />
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => void placeBet()}
                  disabled={placing}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#f5c518] text-xs font-bold text-black disabled:opacity-70"
                >
                  {placing ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : null}
                  {placing
                    ? "Processing..."
                    : isAuthenticated
                      ? `Place Bet ${formatCurrency(stake)}`
                      : "Login To Bet"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void placeBet()}
                disabled={placing}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#f5a623] to-[#e09000] text-xs font-bold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {placing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : null}
                {placing
                  ? "Processing..."
                  : isAuthenticated
                    ? `PLACE ${selections.length} BET${selections.length === 1 ? "" : "S"}`
                    : "LOGIN TO BET"}
              </button>
            )}

            {/* Share row (compact only) */}
            {compactActions ? (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex h-8 items-center justify-center gap-1 rounded-lg border border-[#2a3f55] bg-[#111f2f] text-[10px] text-[#8fa3b1]"
                >
                  <Copy size={12} />
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex h-8 items-center justify-center gap-1 rounded-lg border border-[#2a3f55] bg-[#111f2f] text-[10px] text-[#8fa3b1]"
                >
                  <MessageCircle size={12} />
                  WhatsApp
                </button>
              </div>
            ) : null}

            {copySuccess ? (
              <p className="text-center text-[10px] text-[#00c853]">
                Copied successfully.
              </p>
            ) : null}
          </div>
        </div>
      ) : success ? (
        <div className="mt-2 rounded border border-[#1d4c2d] bg-[#10261a] p-3">
          <p className="text-xs font-semibold text-[#00c853]">
            ✓ Bet Placed Successfully!
          </p>
          {newBalance !== null ? (
            <p className="mt-1 text-[11px] text-[#b5f5c8]">
              New balance: {formatCurrency(newBalance)}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded border border-dashed border-[#2a3f55] px-4 py-6 text-center">
          <p className="text-xs font-semibold text-white">No selection yet</p>
          <p className="mt-1 text-[11px] text-[#8fa3b1]">
            Tap odds to build your multi-pick bet slip.
          </p>
        </div>
      )}
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
      <div className="hidden md:sticky md:top-[calc(var(--navbar-height)+8px)] md:z-20 md:block md:h-[calc(100vh-var(--navbar-height)-16px)] md:max-h-[calc(100vh-var(--navbar-height)-16px)] md:pr-1">
        <BetSlipPanel {...props} />
      </div>

      {selections.length > 0 ? (
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-t border-[#2a3f55] bg-[#0d1820] px-4 text-left text-white md:hidden"
        >
          <div>
            <p className="text-xs text-[#8fa3b1]">Odds ∞</p>
            <p className="text-sm font-semibold">
              Payout {formatCurrency(props.potentialPayout)}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5c518] text-sm font-bold text-black">
            {selections.length}
          </div>
        </button>
      ) : null}

      <div
        className={`md:hidden ${mobileSheetOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
            mobileSheetOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileSheetOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`fixed bottom-14 left-0 right-0 z-50 h-[calc(100vh-8rem)] overflow-hidden rounded-t-3xl border-t border-[#2a3f55] bg-[#0d1820] p-3 transition-transform duration-300 ease-out ${
            mobileSheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <BetSlipPanel
            {...props}
            compactActions
            onClose={() => setMobileSheetOpen(false)}
          />
        </div>
      </div>
    </>
  );
}
