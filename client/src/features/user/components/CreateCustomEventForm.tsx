import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { CreateCustomEventData } from "../hooks/useCustomEvents";

interface CreateCustomEventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCustomEventData) => Promise<void>;
  loading?: boolean;
}

export function CreateCustomEventForm({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: CreateCustomEventFormProps) {
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [league, setLeague] = useState("");
  const [datetime, setDatetime] = useState("");
  const [activeMarket, setActiveMarket] = useState<"h2h" | "spreads" | "totals">("h2h");
  const [submitting, setSubmitting] = useState(false);

  // H2H odds
  const [h2hHome, setH2hHome] = useState("");
  const [h2hDraw, setH2hDraw] = useState("");
  const [h2hAway, setH2hAway] = useState("");

  // Spreads odds
  const [spreadValue, setSpreadValue] = useState("");
  const [spreadTeam1, setSpreadTeam1] = useState("");
  const [spreadTeam2, setSpreadTeam2] = useState("");

  // Totals odds
  const [totalValue, setTotalValue] = useState("");
  const [totalOver, setTotalOver] = useState("");
  const [totalUnder, setTotalUnder] = useState("");

  const handleSubmit = async () => {
    if (!homeTeam.trim() || !awayTeam.trim() || !datetime) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate odds based on selected market
    if (activeMarket === "h2h") {
      if (!h2hHome || !h2hAway) {
        toast.error("Please set odds for both teams");
        return;
      }
    } else if (activeMarket === "spreads") {
      if (!spreadValue || !spreadTeam1 || !spreadTeam2) {
        toast.error("Please fill in all spread odds");
        return;
      }
    } else if (activeMarket === "totals") {
      if (!totalValue || !totalOver || !totalUnder) {
        toast.error("Please fill in all totals odds");
        return;
      }
    }

    setSubmitting(true);
    try {
      const data: CreateCustomEventData = {
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        sport: "custom",
        league: league.trim() || undefined,
        commenceTime: new Date(datetime).toISOString(),
      };

      if (activeMarket === "h2h") {
        data.h2hOdds = {
          home: Number(h2hHome),
          draw: h2hDraw ? Number(h2hDraw) : undefined,
          away: Number(h2hAway),
        };
      } else if (activeMarket === "spreads") {
        data.spreadsOdds = {
          spread: Number(spreadValue),
          odds: {
            team1: Number(spreadTeam1),
            team2: Number(spreadTeam2),
          },
        };
      } else if (activeMarket === "totals") {
        data.totalsOdds = {
          total: Number(totalValue),
          odds: {
            over: Number(totalOver),
            under: Number(totalUnder),
          },
        };
      }

      await onSubmit(data);
      
      // Reset form
      setHomeTeam("");
      setAwayTeam("");
      setLeague("");
      setDatetime("");
      setH2hHome("");
      setH2hDraw("");
      setH2hAway("");
      setSpreadValue("");
      setSpreadTeam1("");
      setSpreadTeam2("");
      setTotalValue("");
      setTotalOver("");
      setTotalUnder("");
      setActiveMarket("h2h");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plus size={20} className="text-amber-400" />
            Create Custom Match
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Add your own match and set the odds instantly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Teams Section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Match Details
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-300">Home Team *</label>
                <Input
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  placeholder="e.g., Arsenal"
                  className="mt-1 h-9 border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Away Team *</label>
                <Input
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  placeholder="e.g., Chelsea"
                  className="mt-1 h-9 border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* League and Date Section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Additional Info
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300">League (Optional)</label>
              <Input
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                placeholder="e.g., Premier League"
                className="mt-1 h-9 border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Kick-off Time *</label>
              <Input
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                className="mt-1 h-9 border-slate-600 bg-slate-800/50 text-white"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Market Selection */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Odds Markets
            </p>
            <div className="flex gap-2">
              {["h2h", "spreads", "totals"].map((market) => (
                <button
                  key={market}
                  onClick={() => setActiveMarket(market as any)}
                  type="button"
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    activeMarket === market
                      ? "border-amber-400 bg-amber-400/10 text-amber-400"
                      : "border-slate-600 bg-slate-800/30 text-slate-400 hover:border-slate-500"
                  }`}
                  disabled={submitting}
                >
                  {market === "h2h" && "Head to Head"}
                  {market === "spreads" && "Spreads"}
                  {market === "totals" && "Totals"}
                </button>
              ))}
            </div>
          </div>

          {/* Odds Input Based on Market Type */}
          <div className="space-y-3 rounded-lg border border-slate-600/30 bg-slate-800/20 p-4">
            {activeMarket === "h2h" && (
              <>
                <p className="text-xs font-medium text-slate-300">Head to Head Odds</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-slate-400">{homeTeam || "Home"}</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={h2hHome}
                      onChange={(e) => setH2hHome(e.target.value)}
                      placeholder="1.50"
                      className="mt-1 h-9 border-slate-600 bg-slate-800/50 text-white"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Draw</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={h2hDraw}
                      onChange={(e) => setH2hDraw(e.target.value)}
                      placeholder="3.50"
                      className="mt-1 h-9 border-slate-600 bg-slate-800/50 text-white"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">{awayTeam || "Away"}</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={h2hAway}
                      onChange={(e) => setH2hAway(e.target.value)}
                      placeholder="2.50"
                      className="mt-1 h-9 border-slate-600 bg-slate-800/50 text-white"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </>
            )}

            {activeMarket === "spreads" && (
              <>
                <p className="text-xs font-medium text-slate-300">Spread Odds</p>
                <div className="space-y-2">
                  <Input
                    type="number"
                    step="0.5"
                    value={spreadValue}
                    onChange={(e) => setSpreadValue(e.target.value)}
                    placeholder="Spread (e.g., -1.5)"
                    className="h-9 border-slate-600 bg-slate-800/50 text-white"
                    disabled={submitting}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={spreadTeam1}
                      onChange={(e) => setSpreadTeam1(e.target.value)}
                      placeholder={`${homeTeam || "Team 1"} Odds`}
                      className="h-9 border-slate-600 bg-slate-800/50 text-white"
                      disabled={submitting}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={spreadTeam2}
                      onChange={(e) => setSpreadTeam2(e.target.value)}
                      placeholder={`${awayTeam || "Team 2"} Odds`}
                      className="h-9 border-slate-600 bg-slate-800/50 text-white"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </>
            )}

            {activeMarket === "totals" && (
              <>
                <p className="text-xs font-medium text-slate-300">Totals Odds</p>
                <div className="space-y-2">
                  <Input
                    type="number"
                    step="0.5"
                    value={totalValue}
                    onChange={(e) => setTotalValue(e.target.value)}
                    placeholder="Total (e.g., 2.5)"
                    className="h-9 border-slate-600 bg-slate-800/50 text-white"
                    disabled={submitting}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={totalOver}
                      onChange={(e) => setTotalOver(e.target.value)}
                      placeholder="Over Odds"
                      className="h-9 border-slate-600 bg-slate-800/50 text-white"
                      disabled={submitting}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={totalUnder}
                      onChange={(e) => setTotalUnder(e.target.value)}
                      placeholder="Under Odds"
                      className="h-9 border-slate-600 bg-slate-800/50 text-white"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:border-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || loading}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold hover:from-amber-600 hover:to-orange-600"
            >
              {submitting || loading ? "Creating..." : "Create Match"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
