import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
  Zap,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AdminSectionHeader,
  AdminStatCard,
  StatusBadge,
} from "../../components/ui";
import {
  useAdminCustomEvents,
  type AdminCustomEvent,
  type CreateCustomEventData,
} from "../../hooks/useAdminCustomEvents";

// ── Status helpers ──

type StatusFilter =
  | "ALL"
  | "DRAFT"
  | "PUBLISHED"
  | "LIVE"
  | "SUSPENDED"
  | "FINISHED"
  | "CANCELLED";

function toBadgeStatus(status: AdminCustomEvent["status"]) {
  switch (status) {
    case "DRAFT":
      return "pending" as const;
    case "PUBLISHED":
      return "processing" as const;
    case "LIVE":
      return "live" as const;
    case "SUSPENDED":
      return "suspended" as const;
    case "FINISHED":
      return "completed" as const;
    case "CANCELLED":
      return "failed" as const;
  }
}

function formatCountdown(startTime: string) {
  const diffMs = new Date(startTime).getTime() - Date.now();
  if (diffMs <= 0) return "Started";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDateTime(isoString: string) {
  return new Date(isoString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Create Event Modal ──

function CreateEventModal({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCustomEventData, andPublish: boolean) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [teamHome, setTeamHome] = useState("");
  const [teamAway, setTeamAway] = useState("");
  const [category, setCategory] = useState("Football");
  const [league, setLeague] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [markets, setMarkets] = useState([
    {
      name: "Match Result",
      selections: [
        { label: "1", name: "Home Win", odds: "" },
        { label: "X", name: "Draw", odds: "" },
        { label: "2", name: "Away Win", odds: "" },
      ],
    },
  ]);

  function resetForm() {
    setTitle("");
    setTeamHome("");
    setTeamAway("");
    setCategory("Football");
    setLeague("");
    setStartTime("");
    setEndTime("");
    setDescription("");
    setMarkets([
      {
        name: "Match Result",
        selections: [
          { label: "1", name: "Home Win", odds: "" },
          { label: "X", name: "Draw", odds: "" },
          { label: "2", name: "Away Win", odds: "" },
        ],
      },
    ]);
  }

  function addMarket() {
    setMarkets((prev) => [
      ...prev,
      {
        name: "",
        selections: [
          { label: "", name: "", odds: "" },
          { label: "", name: "", odds: "" },
        ],
      },
    ]);
  }

  function removeMarket(index: number) {
    setMarkets((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMarketName(index: number, name: string) {
    setMarkets((prev) =>
      prev.map((m, i) => (i === index ? { ...m, name } : m)),
    );
  }

  function addSelection(marketIndex: number) {
    setMarkets((prev) =>
      prev.map((m, i) =>
        i === marketIndex
          ? {
              ...m,
              selections: [...m.selections, { label: "", name: "", odds: "" }],
            }
          : m,
      ),
    );
  }

  function removeSelection(marketIndex: number, selectionIndex: number) {
    setMarkets((prev) =>
      prev.map((m, i) =>
        i === marketIndex
          ? {
              ...m,
              selections: m.selections.filter((_, si) => si !== selectionIndex),
            }
          : m,
      ),
    );
  }

  function updateSelection(
    marketIndex: number,
    selectionIndex: number,
    field: "label" | "name" | "odds",
    value: string,
  ) {
    setMarkets((prev) =>
      prev.map((m, mi) =>
        mi === marketIndex
          ? {
              ...m,
              selections: m.selections.map((s, si) =>
                si === selectionIndex ? { ...s, [field]: value } : s,
              ),
            }
          : m,
      ),
    );
  }

  async function handleSubmit(andPublish: boolean) {
    if (!title.trim() || !teamHome.trim() || !teamAway.trim() || !startTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    for (const market of markets) {
      if (!market.name.trim()) {
        toast.error("All markets must have a name");
        return;
      }
      if (market.selections.length < 2) {
        toast.error(`Market "${market.name}" needs at least 2 selections`);
        return;
      }
      for (const sel of market.selections) {
        if (!sel.label.trim() || !sel.name.trim() || !sel.odds) {
          toast.error(`All selections in "${market.name}" must be filled in`);
          return;
        }
        if (Number(sel.odds) < 1.01) {
          toast.error(`Odds must be at least 1.01`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const data: CreateCustomEventData = {
        title: title.trim(),
        teamHome: teamHome.trim(),
        teamAway: teamAway.trim(),
        category,
        league: league.trim() || "Custom League",
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        description: description.trim() || undefined,
        markets: markets.map((m) => ({
          name: m.name,
          selections: m.selections.map((s) => ({
            label: s.label,
            name: s.name,
            odds: Number(s.odds),
          })),
        })),
      };

      await onSubmit(data, andPublish);
      resetForm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyles =
    "h-9 border-admin-border/80 bg-admin-surface/30 text-admin-text-primary placeholder:text-admin-text-muted text-sm focus-visible:ring-admin-accent/20";
  const labelStyles =
    "text-[11px] font-semibold uppercase tracking-wider text-admin-text-muted mb-1 block";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-admin-border bg-admin-card text-admin-text-primary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Plus size={18} className="text-admin-accent" />
            Create Custom Event
          </DialogTitle>
          <DialogDescription className="text-admin-text-muted">
            Create a new custom event with markets and odds
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Event Details */}
          <section className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-admin-text-muted">
              Event Details
            </p>
            <div>
              <label className={labelStyles}>Event Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Arsenal vs Chelsea"
                className={inputStyles}
                disabled={submitting}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelStyles}>Home Team *</label>
                <Input
                  value={teamHome}
                  onChange={(e) => setTeamHome(e.target.value)}
                  placeholder="Arsenal"
                  className={inputStyles}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelStyles}>Away Team *</label>
                <Input
                  value={teamAway}
                  onChange={(e) => setTeamAway(e.target.value)}
                  placeholder="Chelsea"
                  className={inputStyles}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelStyles}>Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger
                    className={cn(
                      inputStyles,
                      "border-admin-border/80 bg-admin-surface/30",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-admin-border bg-admin-card text-admin-text-primary">
                    {[
                      "Football",
                      "Basketball",
                      "Tennis",
                      "MMA/UFC",
                      "Cricket",
                      "Rugby",
                      "Special/Other",
                    ].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelStyles}>League</label>
                <Input
                  value={league}
                  onChange={(e) => setLeague(e.target.value)}
                  placeholder="Premier League"
                  className={inputStyles}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelStyles}>Start Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputStyles}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={labelStyles}>End Date & Time</label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputStyles}
                  disabled={submitting}
                />
              </div>
            </div>
            <div>
              <label className={labelStyles}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                className={cn(
                  inputStyles,
                  "h-16 w-full resize-none rounded-md border px-3 py-2",
                )}
                disabled={submitting}
              />
            </div>
          </section>

          {/* Markets & Odds */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-admin-text-muted">
                Markets & Odds
              </p>
              <button
                type="button"
                onClick={addMarket}
                className="inline-flex items-center gap-1 rounded-lg border border-admin-accent/30 bg-admin-accent/10 px-2.5 py-1 text-[11px] font-semibold text-admin-accent transition hover:bg-admin-accent/20"
                disabled={submitting}
              >
                <Plus size={12} />
                Add Market
              </button>
            </div>

            {markets.map((market, mi) => (
              <div
                key={mi}
                className="rounded-xl border border-admin-border/60 bg-admin-surface/20 p-3 space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={market.name}
                    onChange={(e) => updateMarketName(mi, e.target.value)}
                    placeholder="Market name (e.g. Match Result)"
                    className={cn(inputStyles, "flex-1")}
                    disabled={submitting}
                  />
                  {markets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMarket(mi)}
                      className="rounded-lg p-1.5 text-admin-text-muted transition hover:bg-red-500/10 hover:text-red-400"
                      disabled={submitting}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {market.selections.map((sel, si) => (
                    <div key={si} className="flex items-center gap-2">
                      <Input
                        value={sel.label}
                        onChange={(e) =>
                          updateSelection(mi, si, "label", e.target.value)
                        }
                        placeholder="1"
                        className={cn(inputStyles, "w-14 text-center")}
                        disabled={submitting}
                      />
                      <Input
                        value={sel.name}
                        onChange={(e) =>
                          updateSelection(mi, si, "name", e.target.value)
                        }
                        placeholder="Home Win"
                        className={cn(inputStyles, "flex-1")}
                        disabled={submitting}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="1.01"
                        value={sel.odds}
                        onChange={(e) =>
                          updateSelection(mi, si, "odds", e.target.value)
                        }
                        placeholder="1.50"
                        className={cn(inputStyles, "w-20 text-center")}
                        disabled={submitting}
                      />
                      {market.selections.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeSelection(mi, si)}
                          className="rounded p-1 text-admin-text-muted transition hover:text-red-400"
                          disabled={submitting}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addSelection(mi)}
                  className="text-[11px] font-medium text-admin-accent transition hover:text-admin-accent/80"
                  disabled={submitting}
                >
                  + Add Selection
                </button>
              </div>
            ))}
          </section>
        </div>

        <DialogFooter className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-admin-border text-admin-text-secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="border-admin-border bg-admin-surface text-admin-text-primary hover:bg-admin-border"
          >
            {submitting ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : null}
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="bg-admin-accent text-black hover:bg-admin-accent/90"
          >
            {submitting ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" />
            ) : (
              <Zap className="mr-1 size-3.5" />
            )}
            Publish Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Enter Results Dialog ──

function SettleMarketDialog({
  open,
  onOpenChange,
  event,
  onSettle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: AdminCustomEvent | null;
  onSettle: (
    eventId: string,
    marketId: string,
    winningSelectionId: string,
  ) => Promise<void>;
}) {
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [settling, setSettling] = useState(false);

  // Include CLOSED markets — they are closed for betting but NOT yet settled
  const unsettledMarkets = useMemo(
    () =>
      event?.markets.filter((m) => m.status !== "SETTLED") ?? [],
    [event],
  );

  // Auto-select the first market (most events have just one)
  const activeMarket = unsettledMarkets[0] ?? null;

  useEffect(() => {
    if (open) {
      setSelectedWinnerId("");
    }
  }, [open]);

  async function handleSettle() {
    if (!event || !activeMarket || !selectedWinnerId) {
      toast.error("Please select the winning outcome");
      return;
    }
    setSettling(true);
    try {
      await onSettle(event.id, activeMarket.id, selectedWinnerId);
      onOpenChange(false);
    } finally {
      setSettling(false);
    }
  }

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-admin-border bg-admin-card text-admin-text-primary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy size={18} className="text-admin-accent" />
            Enter Results
          </DialogTitle>
          <DialogDescription className="text-admin-text-muted">
            Select the winning outcome for this match
          </DialogDescription>
        </DialogHeader>

        {/* Match info */}
        <div className="rounded-xl border border-admin-border/50 bg-admin-surface/20 p-4 text-center">
          <p className="text-lg font-bold text-admin-text-primary">
            {event.teamHome}{" "}
            <span className="text-admin-text-muted">vs</span>{" "}
            {event.teamAway}
          </p>
          <p className="mt-1 text-xs text-admin-text-muted">
            {event.category} · {event.league}
          </p>
        </div>

        {unsettledMarkets.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-6 text-center">
            <Check size={24} className="mx-auto mb-2 text-emerald-400" />
            <p className="text-sm font-medium text-emerald-300">
              All results have been entered
            </p>
            <p className="mt-1 text-xs text-admin-text-muted">
              All markets for this event have been settled and payouts processed.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* If multiple markets, show market name as header */}
            {unsettledMarkets.length > 1 && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-admin-text-muted">
                {activeMarket?.name} — ({unsettledMarkets.length} markets to settle)
              </p>
            )}

            {/* Show label if single market */}
            {unsettledMarkets.length === 1 && activeMarket && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-admin-text-muted">
                Who won? — {activeMarket.name}
              </p>
            )}

            {/* Selection buttons */}
            {activeMarket && (
              <div className="space-y-2">
                {activeMarket.selections.map((sel) => (
                  <button
                    key={sel.id}
                    type="button"
                    onClick={() => setSelectedWinnerId(sel.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border p-3.5 transition",
                      selectedWinnerId === sel.id
                        ? "border-admin-accent/50 bg-admin-accent/10 shadow-[0_0_12px_rgba(245,166,35,0.05)]"
                        : "border-admin-border/50 bg-admin-surface/20 hover:border-admin-border hover:bg-admin-surface/30",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg text-sm font-bold",
                          selectedWinnerId === sel.id
                            ? "bg-admin-accent text-black"
                            : "bg-admin-surface/50 text-admin-text-muted",
                        )}
                      >
                        {sel.label}
                      </span>
                      <span className="text-sm font-semibold text-admin-text-primary">
                        {sel.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-admin-text-muted">
                        @{sel.odds?.toFixed(2)}
                      </span>
                      {selectedWinnerId === sel.id && (
                        <Check size={18} className="text-admin-accent" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-admin-border text-admin-text-secondary"
          >
            Cancel
          </Button>
          {unsettledMarkets.length > 0 && (
            <Button
              onClick={handleSettle}
              disabled={settling || !selectedWinnerId}
              className="bg-admin-accent text-black hover:bg-admin-accent/90"
            >
              {settling ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Trophy className="mr-1.5 size-3.5" />
              )}
              Confirm Result
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Event Detail Dialog ──

function EventDetailDialog({
  open,
  onOpenChange,
  event,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: AdminCustomEvent | null;
}) {
  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-admin-border bg-admin-card text-admin-text-primary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye size={18} className="text-admin-accent" />
            {event.title}
          </DialogTitle>
          <DialogDescription className="text-admin-text-muted">
            {event.teamHome} vs {event.teamAway} · {event.league}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Info */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-admin-border/50 bg-admin-surface/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-admin-text-muted">
                Status
              </p>
              <div className="mt-1">
                <StatusBadge status={toBadgeStatus(event.status)} />
              </div>
            </div>
            <div className="rounded-lg border border-admin-border/50 bg-admin-surface/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-admin-text-muted">
                Category
              </p>
              <p className="mt-1 text-sm font-medium">{event.category}</p>
            </div>
            <div className="rounded-lg border border-admin-border/50 bg-admin-surface/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-admin-text-muted">
                Start
              </p>
              <p className="mt-1 text-sm font-medium">
                {formatDateTime(event.startTime)}
              </p>
            </div>
            <div className="rounded-lg border border-admin-border/50 bg-admin-surface/20 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-admin-text-muted">
                Total Bets
              </p>
              <p className="mt-1 text-sm font-medium">
                {event.totalBets ?? event._count?.bets ?? 0}
              </p>
            </div>
          </div>

          {/* Markets & Selections */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-admin-text-muted">
              Markets & Selections
            </p>
            {event.markets.map((market) => (
              <div
                key={market.id}
                className="rounded-xl border border-admin-border/50 bg-admin-surface/15 p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-admin-text-primary">
                    {market.name}
                  </p>
                  <StatusBadge
                    status={
                      market.status === "OPEN"
                        ? "active"
                        : market.status === "SETTLED"
                          ? "completed"
                          : market.status === "SUSPENDED"
                            ? "suspended"
                            : "pending"
                    }
                  />
                </div>
                <div className="mt-2 space-y-1">
                  {market.selections.map((sel) => (
                    <div
                      key={sel.id}
                      className="flex items-center justify-between rounded-lg bg-admin-surface/30 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-md bg-admin-accent/10 text-xs font-bold text-admin-accent">
                          {sel.label}
                        </span>
                        <span className="text-sm text-admin-text-primary">
                          {sel.name}
                        </span>
                        {sel.result === "WIN" && (
                          <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
                            WINNER
                          </span>
                        )}
                        {sel.result === "LOSE" && (
                          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                            LOST
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {sel.liability && (
                          <span className="text-[10px] text-admin-text-muted">
                            {sel.liability.betCount} bets · KES{" "}
                            {sel.liability.totalLiability.toFixed(0)} liability
                          </span>
                        )}
                        <span className="rounded-md bg-admin-surface/50 px-2 py-0.5 text-xs font-bold text-admin-accent">
                          {sel.odds.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {event.description && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-admin-text-muted">
                Description
              </p>
              <p className="mt-1 text-sm text-admin-text-secondary">
                {event.description}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──

export default function CustomEventsManager() {
  const {
    events,
    stats,
    loading,
    statsLoading,
    total,
    totalPages,
    loadStats,
    loadEvents,
    loadEvent,
    createEvent,
    publishEvent,
    unpublishEvent,
    suspendEvent,
    deleteEvent,
    settleMarket,
    optimisticSetEventStatus,
    authLoading,
    isAuthenticated,
    isAdmin,
  } = useAdminCustomEvents();

  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<AdminCustomEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [settleEvent, setSettleEvent] = useState<AdminCustomEvent | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  // Load events when filters change
  useEffect(() => {
    if (authLoading || !isAuthenticated || !isAdmin) {
      return;
    }

    void loadEvents({
      status: activeFilter,
      search: debouncedSearch || undefined,
      page: currentPage,
      limit: 20,
    });
  }, [
    activeFilter,
    authLoading,
    currentPage,
    debouncedSearch,
    isAdmin,
    isAuthenticated,
    loadEvents,
  ]);

  // Load stats on mount + interval
  useEffect(() => {
    if (authLoading || !isAuthenticated || !isAdmin) {
      return;
    }

    void loadStats();
    const si = window.setInterval(() => void loadStats(), 30000);

    const onFocus = () => {
      void loadStats();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(si);
      window.removeEventListener("focus", onFocus);
    };
  }, [authLoading, isAdmin, isAuthenticated, loadStats]);

  const filteredEvents = useMemo(
    () =>
      events
        .filter(
          (event) => activeFilter === "ALL" || event.status === activeFilter,
        )
        .filter((event) => {
          if (!debouncedSearch) {
            return true;
          }

          const q = debouncedSearch.toLowerCase();
          return (
            event.title.toLowerCase().includes(q) ||
            event.teamHome.toLowerCase().includes(q) ||
            event.teamAway.toLowerCase().includes(q) ||
            event.league.toLowerCase().includes(q)
          );
        }),
    [activeFilter, debouncedSearch, events],
  );

  const handlePublishOptimistic = useCallback(
    async (eventId: string) => {
      optimisticSetEventStatus(eventId, "PUBLISHED");
      try {
        await publishEvent(eventId);
      } catch {
        optimisticSetEventStatus(eventId, "DRAFT");
        toast.error("Failed to publish event");
      } finally {
        await loadEvents({
          status: activeFilter,
          search: debouncedSearch || undefined,
          page: currentPage,
        });
      }
    },
    [
      activeFilter,
      currentPage,
      debouncedSearch,
      loadEvents,
      optimisticSetEventStatus,
      publishEvent,
    ],
  );

  const handleUnpublishOptimistic = useCallback(
    async (eventId: string) => {
      optimisticSetEventStatus(eventId, "DRAFT");
      try {
        await unpublishEvent(eventId);
      } catch {
        optimisticSetEventStatus(eventId, "PUBLISHED");
        toast.error("Failed to unpublish event");
      } finally {
        await loadEvents({
          status: activeFilter,
          search: debouncedSearch || undefined,
          page: currentPage,
        });
      }
    },
    [
      activeFilter,
      currentPage,
      debouncedSearch,
      loadEvents,
      optimisticSetEventStatus,
      unpublishEvent,
    ],
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      loadEvents({
        status: activeFilter,
        search: debouncedSearch || undefined,
        page: currentPage,
      }),
      loadStats(),
    ]);
    setRefreshing(false);
  }

  async function handleCreate(
    data: CreateCustomEventData,
    andPublish: boolean,
  ) {
    const created = await createEvent(data);
    if (created && andPublish) {
      await publishEvent(created.id);
    }
    await loadEvents({
      status: activeFilter,
      search: debouncedSearch || undefined,
      page: currentPage,
    });
  }

  async function handleViewDetail(event: AdminCustomEvent) {
    const detail = await loadEvent(event.id);
    if (detail) {
      setDetailEvent(detail);
      setDetailOpen(true);
    }
  }

  async function handleOpenSettle(event: AdminCustomEvent) {
    const detail = await loadEvent(event.id);
    if (detail) {
      setSettleEvent(detail);
      setSettleOpen(true);
    }
  }

  async function handleSettle(
    eventId: string,
    marketId: string,
    winningSelectionId: string,
  ) {
    await settleMarket(eventId, marketId, winningSelectionId);
    await loadEvents({
      status: activeFilter,
      search: debouncedSearch || undefined,
      page: currentPage,
    });
  }

  const filterTabs: { label: string; value: StatusFilter; count?: number }[] = [
    {
      label: "All",
      value: "ALL",
      count: stats?.total ?? 0,
    },
    { label: "Draft", value: "DRAFT", count: stats?.draftCount ?? 0 },
    {
      label: "Published",
      value: "PUBLISHED",
      count: stats?.publishedCount ?? 0,
    },
    { label: "Live", value: "LIVE", count: stats?.liveCount ?? 0 },
    { label: "Suspended", value: "SUSPENDED" },
    { label: "Finished", value: "FINISHED", count: stats?.finishedCount ?? 0 },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  const summaryCards = [
    {
      label: "Draft",
      value: stats?.draftCount ?? 0,
      tone: "muted" as const,
    },
    {
      label: "Published",
      value: stats?.publishedCount ?? 0,
      tone: "blue" as const,
    },
    { label: "Live", value: stats?.liveCount ?? 0, tone: "live" as const },
    {
      label: "Finished",
      value: stats?.finishedCount ?? 0,
      tone: "accent" as const,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <AdminSectionHeader
        title="Custom Events"
        subtitle="Create and manage custom betting events with full market control."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="border-admin-border bg-admin-card text-admin-text-primary hover:bg-admin-surface"
            >
              {refreshing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="bg-admin-accent text-black hover:bg-admin-accent/90"
            >
              <Plus className="size-3.5" />
              Create Event
            </Button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {summaryCards.map((metric) => (
          <AdminStatCard
            key={metric.label}
            label={metric.label}
            value={(statsLoading ? 0 : metric.value).toLocaleString()}
            tone={metric.tone}
          />
        ))}
      </div>

      {/* Filters */}
      <Card className="border-admin-border bg-admin-card shadow-sm">
        <CardContent className="space-y-2 p-2 sm:p-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-admin-text-muted" />
            <Input
              placeholder="Search by event, team, or league…"
              value={searchQuery}
              onChange={(e) => {
                setCurrentPage(1);
                setSearchQuery(e.target.value);
              }}
              className="h-8 border-admin-border bg-admin-surface pl-8 text-xs text-admin-text-primary placeholder:text-admin-text-muted"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveFilter(tab.value);
                  setCurrentPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition",
                  activeFilter === tab.value
                    ? "bg-admin-accent/15 text-admin-accent"
                    : "text-admin-text-muted hover:bg-admin-surface hover:text-admin-text-secondary",
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="rounded-md bg-admin-surface/60 px-1.5 py-0.5 text-[10px]">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card className="border-admin-border bg-admin-card shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="flex items-center gap-3 border-b border-admin-border/50 px-3 py-3 last:border-0"
                >
                  <div className="size-4 shrink-0 animate-pulse rounded bg-admin-surface" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3.5 w-48 animate-pulse rounded bg-admin-surface" />
                    <div className="h-3 w-28 animate-pulse rounded bg-admin-surface" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-admin-surface" />
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-admin-surface/50">
                <CalendarClock size={24} className="text-admin-text-muted" />
              </div>
              <p className="text-sm font-medium text-admin-text-primary">
                No custom events found
              </p>
              <p className="mt-1 text-xs text-admin-text-muted">
                Create your first custom event to get started
              </p>
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="mt-4 bg-admin-accent text-black hover:bg-admin-accent/90"
              >
                <Plus className="size-3.5" />
                Create Event
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-admin-border/70">
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                      Event
                    </th>
                    <th className="hidden px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted sm:table-cell">
                      Category
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                      Start
                    </th>
                    <th className="hidden px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted md:table-cell">
                      Markets
                    </th>
                    <th className="hidden px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted md:table-cell">
                      Bets
                    </th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                      Status
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-admin-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-admin-border/40 transition hover:bg-admin-surface/20 last:border-0"
                    >
                      {/* Event */}
                      <td className="px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-admin-text-primary">
                            {event.teamHome}{" "}
                            <span className="font-normal text-admin-text-muted">
                              vs
                            </span>{" "}
                            {event.teamAway}
                          </p>
                          <p className="truncate text-[11px] text-admin-text-muted">
                            {event.league}
                          </p>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="hidden px-3 py-2.5 sm:table-cell">
                        <span className="rounded-md bg-admin-surface/40 px-2 py-0.5 text-[11px] font-medium text-admin-text-secondary">
                          {event.category}
                        </span>
                      </td>

                      {/* Start Time */}
                      <td className="px-3 py-2.5">
                        <div className="text-xs text-admin-text-secondary">
                          {formatDateTime(event.startTime)}
                        </div>
                        {event.status !== "FINISHED" &&
                          event.status !== "CANCELLED" && (
                            <span className="text-[10px] font-medium text-admin-accent">
                              {formatCountdown(event.startTime)}
                            </span>
                          )}
                      </td>

                      {/* Markets */}
                      <td className="hidden px-3 py-2.5 text-center md:table-cell">
                        <span className="text-xs font-medium text-admin-text-secondary">
                          {event.marketsCount ?? event.markets?.length ?? 0}
                        </span>
                      </td>

                      {/* Bets */}
                      <td className="hidden px-3 py-2.5 text-center md:table-cell">
                        <span className="text-xs font-medium text-admin-text-secondary">
                          {event.totalBets ?? event._count?.bets ?? 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center">
                        <StatusBadge status={toBadgeStatus(event.status)} />
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => void handleViewDetail(event)}
                            className="rounded-lg p-1.5 text-admin-text-muted transition hover:bg-admin-surface hover:text-admin-text-primary"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="rounded-lg p-1.5 text-admin-text-muted transition hover:bg-admin-surface hover:text-admin-text-primary"
                              >
                                <MoreHorizontal size={14} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="min-w-[160px] border-admin-border bg-admin-card text-admin-text-primary"
                            >
                              {event.status === "DRAFT" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    void handlePublishOptimistic(event.id)
                                  }
                                  className="gap-2 text-sm"
                                >
                                  <Zap size={14} />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              {event.status === "PUBLISHED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    void handleUnpublishOptimistic(event.id)
                                  }
                                  className="gap-2 text-sm"
                                >
                                  <X size={14} />
                                  Unpublish
                                </DropdownMenuItem>
                              )}
                              {(event.status === "PUBLISHED" ||
                                event.status === "LIVE" ||
                                event.status === "SUSPENDED") && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    void suspendEvent(event.id).then(() =>
                                      loadEvents({
                                        status: activeFilter,
                                        search: debouncedSearch || undefined,
                                        page: currentPage,
                                      }),
                                    )
                                  }
                                  className="gap-2 text-sm"
                                >
                                  <Power size={14} />
                                  {event.status === "SUSPENDED"
                                    ? "Resume"
                                    : "Suspend"}
                                </DropdownMenuItem>
                              )}
                              {(event.status === "LIVE" ||
                                event.status === "FINISHED") && (
                                <>
                                  <DropdownMenuSeparator className="bg-admin-border/50" />
                                  <DropdownMenuItem
                                    onClick={() => void handleOpenSettle(event)}
                                    className="gap-2 text-sm"
                                  >
                                    <Trophy size={14} />
                                    Enter Results
                                  </DropdownMenuItem>
                                </>
                              )}
                              {event.status === "DRAFT" && (
                                <>
                                  <DropdownMenuSeparator className="bg-admin-border/50" />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      void deleteEvent(event.id).then(() =>
                                        loadEvents({
                                          status: activeFilter,
                                          search: debouncedSearch || undefined,
                                          page: currentPage,
                                        }),
                                      )
                                    }
                                    className="gap-2 text-sm text-red-400"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-admin-border/50 px-3 py-2">
              <p className="text-[11px] text-admin-text-muted">
                Showing {filteredEvents.length} of {total} events
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg p-1.5 text-admin-text-muted transition hover:bg-admin-surface disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 text-xs font-medium text-admin-text-secondary">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="rounded-lg p-1.5 text-admin-text-muted transition hover:bg-admin-surface disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateEventModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
      <EventDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        event={detailEvent}
      />
      <SettleMarketDialog
        open={settleOpen}
        onOpenChange={setSettleOpen}
        event={settleEvent}
        onSettle={handleSettle}
      />
    </div>
  );
}
