import type { ChangeEvent } from "react";
import { Loader2, X } from "lucide-react";
import type { UseBetSlipReturn } from "../hooks/useBetSlip";

function formatCurrency(value: number) {
  return `KES ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
}: UseBetSlipReturn & { onClose?: () => void }) {
  const totalStake = stake * selections.length;

  const handleStakeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    setStake(Number.isFinite(nextValue) ? nextValue : 0);
  };

  return (
    <div className="rounded-2xl border border-[#2a3f55] bg-[#0d1820] p-4 text-white shadow-[0_18px_36px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between border-b border-[#2a3f55] pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold tracking-[0.18em] text-white">
            BET SLIP
          </h2>
          <span className="rounded-full bg-[#f5a623]/15 px-2 py-1 text-xs font-semibold text-[#f5a623]">
            {selections.length}
          </span>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#8fa3b1] transition hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      {selections.length > 0 ? (
        <div className="mt-4 space-y-4">
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {selections.map((selection, index) => (
              <div
                key={`${selection.eventId}-${selection.side}`}
                className="rounded-lg border border-[#2a3f55] bg-[#1a2634] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#8fa3b1]">
                      {selection.leagueName}
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-white">
                      {selection.eventName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSelection(selection.eventId)}
                    className="rounded-full p-1 text-[#8fa3b1] transition hover:bg-white/5 hover:text-white"
                    aria-label="Remove selection"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="text-[12px] text-[#8fa3b1]">
                    Pick {index + 1} • {selection.marketType.toUpperCase()} •{" "}
                    {selection.side}
                  </p>
                  <p className="text-lg font-bold text-[#f5a623]">
                    {selection.odds.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <label
              className="block text-[12px] text-[#8fa3b1]"
              htmlFor="bet-stake"
            >
              Enter Stake (KES)
            </label>
            <input
              id="bet-stake"
              type="number"
              min={50}
              max={100000}
              value={stake || ""}
              onChange={handleStakeChange}
              placeholder="50"
              className="h-12 w-full rounded-lg border border-[#2a3f55] bg-[#1a2940] px-3 text-center text-lg text-white outline-none transition focus:border-[#f5a623]"
            />

            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setStake(stake + amount)}
                  className="rounded-lg border border-[#2a3f55] bg-[#1a2940] px-2 py-2 text-xs font-medium text-[#8fa3b1] transition hover:border-[#f5a623] hover:text-white"
                >
                  +{amount}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-[#1d4c2d] bg-[#10261a] p-3">
              <p className="text-[12px] text-[#8fa3b1]">Potential Total Win</p>
              <p className="mt-1 text-2xl font-bold text-[#00c853]">
                {formatCurrency(potentialPayout)}
              </p>
              <p className="mt-1 text-[12px] text-[#8fa3b1]">
                Stake per pick: {formatCurrency(stake || 0)} • Total stake:{" "}
                {formatCurrency(totalStake)}
              </p>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-[#5a222a] bg-[#2a1515] p-3">
              <p className="text-sm text-red-200">{error}</p>
              <button
                type="button"
                onClick={() => void placeBet()}
                className="mt-3 text-sm font-semibold text-white underline underline-offset-4"
              >
                Try Again
              </button>
            </div>
          ) : null}

          {success ? (
            <div className="rounded-lg border border-[#1d4c2d] bg-[#10261a] p-3">
              <p className="text-sm font-semibold text-[#00c853]">
                ✓ Bet Placed Successfully!
              </p>
              {newBalance !== null ? (
                <p className="mt-1 text-[12px] text-[#b5f5c8]">
                  New balance: {formatCurrency(newBalance)}
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void placeBet()}
            disabled={placing}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#f5a623] to-[#e09000] text-base font-bold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {placing ? <Loader2 size={18} className="animate-spin" /> : null}
            {placing
              ? "Processing..."
              : isAuthenticated
                ? `PLACE ${selections.length} BET${selections.length === 1 ? "" : "S"}`
                : "LOGIN TO BET"}
          </button>
        </div>
      ) : success ? (
        <div className="mt-4 rounded-lg border border-[#1d4c2d] bg-[#10261a] p-4">
          <p className="text-sm font-semibold text-[#00c853]">
            ✓ Bet Placed Successfully!
          </p>
          {newBalance !== null ? (
            <p className="mt-2 text-[12px] text-[#b5f5c8]">
              New balance: {formatCurrency(newBalance)}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-[#2a3f55] px-4 py-8 text-center">
          <p className="text-sm font-semibold text-white">No selection yet</p>
          <p className="mt-2 text-[13px] text-[#8fa3b1]">
            Tap odds to build your multi-pick bet slip.
          </p>
        </div>
      )}
    </div>
  );
}

export default function BetSlip(props: UseBetSlipReturn) {
  const { selections, isOpen, setIsOpen } = props;

  return (
    <>
      <div className="hidden md:sticky md:top-24 md:block">
        <BetSlipPanel {...props} />
      </div>

      {selections.length > 0 && !isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#f5a623] text-lg font-bold text-black shadow-lg md:hidden"
        >
          {selections.length}
          <span className="absolute -right-1 -top-1 rounded-full bg-[#ff1744] px-1.5 py-0.5 text-[10px] text-white">
            {selections.length}
          </span>
        </button>
      ) : null}

      <div
        className={`md:hidden ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-3xl border-t border-[#2a3f55] bg-[#0d1820] p-4 transition-transform duration-300 ease-out ${
            isOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <BetSlipPanel {...props} onClose={() => setIsOpen(false)} />
        </div>
      </div>
    </>
  );
}
