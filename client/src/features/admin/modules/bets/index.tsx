import { useState } from "react";
import { Download, Eye, RefreshCw, XCircle } from "lucide-react";
import { betFilters, betStats, recentBets } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
  SummaryCard,
  TableShell,
  adminCompactActionsClassName,
  adminFilterRowClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

const calculatePotentialWin = (stake: string, odds: string) => {
  const parsedStake = Number(stake.replace("$", "").replace(",", ""));
  const parsedOdds = Number(odds);

  return `$${Math.round(parsedStake * parsedOdds).toLocaleString()}`;
};

export default function Bets() {
  const [selectedBet, setSelectedBet] = useState<(typeof recentBets)[0] | null>(
    null,
  );
  const [voidReason, setVoidReason] = useState("");
  const [confirmVoid, setConfirmVoid] = useState(false);
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Bet Management"
        subtitle="All bets, settlements, and void management"
        actions={
          <>
            <AdminButton variant="ghost">
              <RefreshCw size={13} />
              Refresh
            </AdminButton>
            <AdminButton variant="ghost">
              <Download size={13} />
              Export
            </AdminButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {betStats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            tone={stat.tone}
            value={stat.value}
          />
        ))}
      </div>

      <div className={adminFilterRowClassName}>
        {betFilters.map((filter) => (
          <AdminButton
            key={filter}
            variant={filter === "All Bets" ? "solid" : "ghost"}
          >
            {filter}
          </AdminButton>
        ))}
      </div>

      <AdminCard>
        <TableShell>
          <table className={adminTableClassName}>
            <thead>
              <tr>
                {[
                  "Bet ID",
                  "User",
                  "Sport",
                  "Event",
                  "Market",
                  "Odds",
                  "Stake",
                  "Potential Win",
                  "Status",
                  "Time",
                  "Actions",
                ].map((heading) => (
                  <th className={adminTableHeadCellClassName} key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBets.map((bet) => (
                <tr
                  className="even:bg-[var(--color-bg-elevated)]"
                  key={`${bet.id}-management`}
                >
                  <td
                    className={`${adminTableCellClassName} text-xs font-semibold text-admin-blue`}
                  >
                    {bet.id}
                  </td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                  >
                    {bet.user}
                  </td>
                  <td className={adminTableCellClassName}>{bet.sport}</td>
                  <td
                    className={`${adminTableCellClassName} max-w-[160px] truncate`}
                  >
                    {bet.event}
                  </td>
                  <td className={adminTableCellClassName}>{bet.market}</td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-gold`}
                  >
                    {bet.odds}
                  </td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-text-primary`}
                  >
                    {bet.stake}
                  </td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-accent`}
                  >
                    {calculatePotentialWin(bet.stake, bet.odds)}
                  </td>
                  <td className={adminTableCellClassName}>
                    <StatusBadge status={bet.status} />
                  </td>
                  <td
                    className={`${adminTableCellClassName} text-xs text-admin-text-muted`}
                  >
                    {bet.time}
                  </td>
                  <td className={adminTableCellClassName}>
                    <div className={adminCompactActionsClassName}>
                      <Dialog>
                        <DialogTrigger asChild>
                          <AdminButton
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedBet(bet)}
                          >
                            <Eye size={11} />
                          </AdminButton>
                        </DialogTrigger>
                        <DialogContent className="border-admin-border bg-admin-card">
                          <DialogHeader>
                            <DialogTitle>Bet Details</DialogTitle>
                            <DialogDescription>
                              View complete bet information
                            </DialogDescription>
                          </DialogHeader>
                          {selectedBet && (
                            <ScrollArea className="h-[400px] w-full pr-4">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    BET ID
                                  </p>
                                  <p className="text-sm font-semibold text-admin-blue">
                                    {selectedBet.id}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    USER
                                  </p>
                                  <p className="text-sm text-admin-text-primary">
                                    {selectedBet.user}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    SPORT
                                  </p>
                                  <p className="text-sm text-admin-text-primary">
                                    {selectedBet.sport}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    EVENT
                                  </p>
                                  <p className="text-sm text-admin-text-primary">
                                    {selectedBet.event}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    MARKET
                                  </p>
                                  <p className="text-sm text-admin-text-primary">
                                    {selectedBet.market}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    ODDS
                                  </p>
                                  <p className="text-sm font-semibold text-admin-gold">
                                    {selectedBet.odds}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    STAKE
                                  </p>
                                  <p className="text-sm font-semibold">
                                    {selectedBet.stake}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    POTENTIAL WIN
                                  </p>
                                  <p className="text-sm font-semibold text-admin-accent">
                                    {calculatePotentialWin(
                                      selectedBet.stake,
                                      selectedBet.odds,
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    STATUS
                                  </p>
                                  <StatusBadge status={selectedBet.status} />
                                </div>
                                <div>
                                  <p className="text-xs text-admin-text-muted">
                                    TIME
                                  </p>
                                  <p className="text-sm text-admin-text-primary">
                                    {selectedBet.time}
                                  </p>
                                </div>
                              </div>
                            </ScrollArea>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Dialog
                        open={confirmVoid && selectedBet?.id === bet.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setConfirmVoid(false);
                            setVoidReason("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <AdminButton
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedBet(bet);
                              setConfirmVoid(true);
                            }}
                          >
                            <XCircle size={11} />
                          </AdminButton>
                        </DialogTrigger>
                        <DialogContent className="border-admin-border bg-admin-card">
                          <DialogHeader>
                            <DialogTitle>Void Bet</DialogTitle>
                            <DialogDescription>
                              This action will refund the stake and mark the bet
                              as void.
                            </DialogDescription>
                          </DialogHeader>
                          <div>
                            <label className="text-sm font-semibold text-admin-text-primary">
                              Reason for voiding
                            </label>
                            <Input
                              placeholder="E.g., Event cancelled, Technical error"
                              value={voidReason}
                              onChange={(e) => setVoidReason(e.target.value)}
                              className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                            />
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setConfirmVoid(false);
                                setVoidReason("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button className="flex-1 bg-admin-red hover:bg-red-600 text-white">
                              Void Bet
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </AdminCard>
    </div>
  );
}
