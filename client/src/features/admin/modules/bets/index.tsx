import { api } from "@/api/axiosConfig";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Download, Eye, MoreHorizontal, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminStatCard,
  AdminSectionHeader,
  StatusBadge,
  TableShell,
  adminFilterRowClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
  truncateEmailForTable,
} from "../../components/ui";

interface ApiBet {
  id: string;
  userId: string;
  eventId: string;
  marketType: string;
  side: string;
  stake: number;
  displayOdds: number;
  potentialPayout: number;
  status: "PENDING" | "WON" | "LOST" | "VOID";
  placedAt: string;
  settledAt: string | null;
  user: { id: string; email: string; phone: string };
  event: {
    homeTeam: string;
    awayTeam: string;
    leagueName: string | null;
    sportKey: string | null;
    commenceTime: string;
    status: string;
  };
}

const filterOptions = [
  { label: "All Bets", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Won", value: "WON" },
  { label: "Lost", value: "LOST" },
  { label: "Flagged", value: "FLAGGED" },
  { label: "Void", value: "VOID" },
] as const;

function toBadgeStatus(status: ApiBet["status"], stake: number) {
  if (stake > 10_000 && status === "PENDING") {
    return "flagged";
  }

  switch (status) {
    case "PENDING":
      return "pending";
    case "WON":
      return "won";
    case "LOST":
      return "lost";
    case "VOID":
      return "failed";
  }
}

function getUserLabel(bet: ApiBet, compact = false) {
  if (!bet.user.email) {
    return bet.user.phone;
  }

  return compact ? truncateEmailForTable(bet.user.email) : bet.user.email;
}

// Helper to format dates cleanly (e.g., "Apr 6, 10:22 PM")
function formatCompactDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export default function Bets() {
  const [bets, setBets] = useState<ApiBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBet, setSelectedBet] = useState<ApiBet | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [settleBet, setSettleBet] = useState<ApiBet | null>(null);
  const [settleSelection, setSettleSelection] = useState("");
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const visibleBets = useMemo(
    () =>
      activeFilter === "FLAGGED"
        ? bets.filter((bet) => bet.stake > 10_000)
        : bets,
    [activeFilter, bets],
  );

  const betStats = useMemo(() => {
    const totalOpen = bets.filter((bet) => bet.status === "PENDING").length;
    // const settledToday = bets.filter((bet) => bet.status !== "PENDING").length;
    const voided = bets.filter((bet) => bet.status === "VOID").length;
    const flagged = bets.filter((bet) => bet.stake > 10_000).length;
    const liability = bets
      .filter((bet) => bet.status === "PENDING")
      .reduce((sum, bet) => sum + bet.potentialPayout, 0);

    return [
      {
        label: "Total Open",
        value: totalOpen.toLocaleString(),
        tone: "gold" as const,
      },
      // {
      //   label: "Settled Today",
      //   value: settledToday.toLocaleString(),
      //   tone: "accent" as const,
      // },
      { label: "Voided", value: voided.toLocaleString(), tone: "red" as const },
      {
        label: "Flagged",
        value: flagged.toLocaleString(),
        tone: "red" as const,
      },
      {
        label: "Liability",
        value: `KES ${Math.round(liability).toLocaleString()}`,
        tone: "purple" as const,
      },
    ];
  }, [bets]);

  async function loadBets() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<{
        bets: ApiBet[];
        total: number;
        page: number;
        totalPages: number;
      }>("/admin/bets", {
        params: {
          page,
          limit: 20,
          ...(activeFilter && activeFilter !== "FLAGGED"
            ? { status: activeFilter }
            : {}),
          ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        },
      });

      setBets(response.data.bets);
      setTotal(response.data.total);
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load bets right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBets();
  }, [activeFilter, page, searchQuery]);

  async function settle(id: string, winner: string) {
    try {
      const response = await api.post<{
        settled: boolean;
        status: ApiBet["status"];
      }>(`/admin/bets/${id}/settle`, { winner });

      setBets((currentBets) =>
        currentBets.map((bet) =>
          bet.id === id
            ? {
                ...bet,
                status: response.data.status,
                settledAt: new Date().toISOString(),
              }
            : bet,
        ),
      );
      setConfirmVoid(false);
      setVoidReason("");
      setSettleBet(null);
      setSettleSelection("");
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to settle this bet.");
    }
  }

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 5 }, (_, rowIndex) => (
        <tr
          className="even:bg-[var(--color-bg-elevated)]"
          key={`bet-skeleton-${rowIndex}`}
        >
          {Array.from({ length: 9 }, (_, cellIndex) => (
            <td className={adminTableCellClassName} key={cellIndex}>
              <div className="h-4 w-full rounded bg-admin-surface animate-pulse" />
            </td>
          ))}
        </tr>
      )),
    [],
  );

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Bet Management"
        subtitle="All bets, settlements, and void management"
        actions={
          <>
            <AdminButton variant="ghost" onClick={() => void loadBets()}>
              <RefreshCw size={13} className="mr-2" />
              Refresh
            </AdminButton>
            <AdminButton variant="ghost">
              <Download size={13} className="mr-2" />
              Export
            </AdminButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
        {betStats.map((metric) => (
          <AdminStatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
            helper="Stake and settlement totals across the active bet list"
          />
        ))}
      </div>

      <div className={`${adminFilterRowClassName} items-center`}>
        {filterOptions.map((filter) => (
          <AdminButton
            key={filter.label}
            variant={activeFilter === filter.value ? "solid" : "ghost"}
            onClick={() => {
              setPage(1);
              setActiveFilter(filter.value);
            }}
          >
            {filter.label}
          </AdminButton>
        ))}
        <div className="min-w-[240px] flex-1">
          <Input
            placeholder="Search user, phone, or event"
            value={searchQuery}
            onChange={(event) => {
              setPage(1);
              setSearchQuery(event.target.value);
            }}
            className="border-admin-border bg-admin-surface text-admin-text-primary"
          />
        </div>
      </div>

      {error && (
        <AdminCard>
          <p className="text-sm text-admin-red">{error}</p>
        </AdminCard>
      )}

      <AdminCard>
        <TableShell>
          <table className={`${adminTableClassName} w-full`}>
            <thead>
              <tr>
                {[
                  "ID",
                  "User",
                  "Event Details",
                  "Market & Pick",
                  "Odds",
                  "Stake",
                  "To Win",
                  "Status",
                  "Date",
                  "",
                ].map((heading, idx) => (
                  <th
                    className={`${adminTableHeadCellClassName} whitespace-nowrap`}
                    key={idx}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? skeletonRows : null}

              {!loading && visibleBets.length === 0 && (
                <tr>
                  <td className={adminTableCellClassName} colSpan={10}>
                    <p className="text-sm text-center py-4 text-admin-text-muted">
                      No bets found.
                    </p>
                  </td>
                </tr>
              )}

              {!loading
                ? visibleBets.map((bet) => {
                    const settleOptions = [
                      bet.event.homeTeam,
                      "Draw",
                      bet.event.awayTeam,
                    ];

                    return (
                      <tr
                        className="even:bg-[var(--color-bg-elevated)] hover:bg-admin-surface transition-colors"
                        key={`${bet.id}-management`}
                      >
                        <td
                          className={`${adminTableCellClassName} text-xs font-mono font-medium text-admin-text-muted`}
                        >
                          {bet.id.slice(0, 8)}
                        </td>
                        <td
                          className={`${adminTableCellClassName} font-semibold text-admin-text-primary max-w-[150px] truncate`}
                          title={getUserLabel(bet)}
                        >
                          {getUserLabel(bet, true)}
                        </td>
                        <td
                          className={`${adminTableCellClassName} max-w-[200px]`}
                        >
                          <div className="flex flex-col truncate">
                            <span
                              className="font-medium text-admin-text-primary truncate"
                              title={`${bet.event.homeTeam} vs ${bet.event.awayTeam}`}
                            >
                              {bet.event.homeTeam} vs {bet.event.awayTeam}
                            </span>
                            <span className="text-xs text-admin-text-muted truncate">
                              {bet.event.sportKey ?? "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className={adminTableCellClassName}>
                          <div className="flex flex-col">
                            <span className="font-medium text-admin-text-primary">
                              {bet.side}
                            </span>
                            <span className="text-xs text-admin-text-muted">
                              {bet.marketType}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`${adminTableCellClassName} font-semibold text-admin-gold`}
                        >
                          {bet.displayOdds}
                        </td>
                        <td
                          className={`${adminTableCellClassName} font-medium text-admin-text-primary whitespace-nowrap`}
                        >
                          KES {Math.round(bet.stake).toLocaleString()}
                        </td>
                        <td
                          className={`${adminTableCellClassName} font-semibold text-admin-accent whitespace-nowrap`}
                        >
                          KES {Math.round(bet.potentialPayout).toLocaleString()}
                        </td>
                        <td className={adminTableCellClassName}>
                          <StatusBadge
                            status={toBadgeStatus(bet.status, bet.stake)}
                          />
                        </td>
                        <td
                          className={`${adminTableCellClassName} text-xs text-admin-text-muted whitespace-nowrap`}
                        >
                          {formatCompactDate(bet.placedAt)}
                        </td>
                        <td
                          className={`${adminTableCellClassName} w-[50px] text-right`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-surface"
                              >
                                <MoreHorizontal size={18} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onSelect={() => setSelectedBet(bet)}
                              >
                                <Eye size={14} className="mr-2" />
                                View details
                              </DropdownMenuItem>

                              {bet.status === "PENDING" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          setSettleBet(bet);
                                          setSettleSelection(
                                            bet.event.homeTeam,
                                          );
                                        }}
                                        className="text-green-500 focus:text-green-500 focus:bg-green-500/10 cursor-pointer"
                                      >
                                        Settle bet
                                      </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DialogContent className="border-admin-border bg-admin-card">
                                      <DialogHeader>
                                        <DialogTitle>Settle Bet</DialogTitle>
                                        <DialogDescription>
                                          Choose the winning side for this
                                          event.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-3 py-4">
                                        {settleOptions.map((option) => (
                                          <label
                                            className="flex items-center gap-3 text-sm text-admin-text-primary cursor-pointer p-2 rounded hover:bg-admin-surface transition-colors"
                                            key={option}
                                          >
                                            <input
                                              checked={
                                                settleSelection === option
                                              }
                                              name="bet-settle"
                                              onChange={() =>
                                                setSettleSelection(option)
                                              }
                                              type="radio"
                                              className="accent-admin-accent w-4 h-4"
                                            />
                                            {option}
                                          </label>
                                        ))}
                                      </div>
                                      <div className="flex gap-3">
                                        <Button
                                          variant="outline"
                                          className="flex-1"
                                          onClick={() => setSettleBet(null)}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]"
                                          onClick={() =>
                                            settleBet
                                              ? void settle(
                                                  settleBet.id,
                                                  settleSelection,
                                                )
                                              : undefined
                                          }
                                        >
                                          Confirm
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Dialog
                                    open={
                                      confirmVoid && selectedBet?.id === bet.id
                                    }
                                    onOpenChange={(open) => {
                                      if (!open) {
                                        setConfirmVoid(false);
                                        setVoidReason("");
                                      }
                                    }}
                                  >
                                    <DialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          setSelectedBet(bet);
                                          setConfirmVoid(true);
                                        }}
                                        className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                                      >
                                        Void bet
                                      </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DialogContent className="border-admin-border bg-admin-card">
                                      <DialogHeader>
                                        <DialogTitle>Void Bet</DialogTitle>
                                        <DialogDescription>
                                          This action will refund the stake and
                                          mark the bet as void.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="py-4">
                                        <label className="text-sm font-medium text-admin-text-primary">
                                          Reason for voiding
                                        </label>
                                        <Input
                                          placeholder="E.g., Event cancelled, Technical error"
                                          value={voidReason}
                                          onChange={(event) =>
                                            setVoidReason(event.target.value)
                                          }
                                          className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                        />
                                      </div>
                                      <div className="flex gap-3">
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
                                        <Button
                                          className="flex-1 bg-admin-red hover:bg-red-600 text-white"
                                          onClick={() =>
                                            void settle(bet.id, "void")
                                          }
                                        >
                                          Void Bet
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </TableShell>
      </AdminCard>

      {/* REFACTORED MODAL: Uses a clean CSS Grid now */}
      <Dialog
        open={selectedBet !== null && !confirmVoid}
        onOpenChange={(open) => {
          if (!open) setSelectedBet(null);
        }}
      >
        <DialogContent className="border-admin-border bg-admin-card max-w-lg">
          <DialogHeader>
            <DialogTitle>Bet Details</DialogTitle>
            <DialogDescription>
              Complete information for this wager
            </DialogDescription>
          </DialogHeader>
          {selectedBet && (
            <div className="grid grid-cols-2 gap-y-6 gap-x-4 pt-4">
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[11px] font-bold tracking-wider text-admin-text-muted uppercase mb-1">
                  Bet ID
                </p>
                <p className="text-sm font-mono text-admin-blue">
                  {selectedBet.id}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[11px] font-bold tracking-wider text-admin-text-muted uppercase mb-1">
                  User
                </p>
                <p className="text-sm text-admin-text-primary">
                  {getUserLabel(selectedBet)}
                </p>
              </div>

              <div className="col-span-2 bg-admin-surface p-3 rounded-lg border border-admin-border">
                <p className="text-[11px] font-bold tracking-wider text-admin-text-muted uppercase mb-1">
                  Event
                </p>
                <p className="text-sm font-medium text-admin-text-primary">
                  {selectedBet.event.homeTeam} vs {selectedBet.event.awayTeam}
                </p>
                <p className="text-xs text-admin-text-muted mt-1">
                  {selectedBet.event.sportKey ?? "Unknown Sport"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold tracking-wider text-admin-text-muted uppercase mb-1">
                  Selection
                </p>
                <p className="text-sm font-medium text-admin-text-primary">
                  {selectedBet.side}
                </p>
                <p className="text-xs text-admin-text-muted mt-0.5">
                  {selectedBet.marketType}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wider text-admin-text-muted uppercase mb-1">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge
                    status={toBadgeStatus(
                      selectedBet.status,
                      selectedBet.stake,
                    )}
                  />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold tracking-wider text-admin-text-muted uppercase mb-1">
                  Stake & Odds
                </p>
                <p className="text-sm font-semibold text-admin-text-primary">
                  KES {Math.round(selectedBet.stake).toLocaleString()}{" "}
                  <span className="text-admin-text-muted font-normal">@</span>{" "}
                  <span className="text-admin-gold">
                    {selectedBet.displayOdds}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wider text-admin-text-muted uppercase mb-1">
                  Potential Win
                </p>
                <p className="text-sm font-bold text-admin-accent">
                  KES {Math.round(selectedBet.potentialPayout).toLocaleString()}
                </p>
              </div>

              <div className="col-span-2 border-t border-admin-border pt-4 mt-2">
                <p className="text-[11px] font-bold tracking-wider text-admin-text-muted uppercase mb-1">
                  Time Placed
                </p>
                <p className="text-sm text-admin-text-primary">
                  {new Date(selectedBet.placedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {total > 20 && (
        <div className="flex items-center justify-between gap-3 pt-4">
          <AdminButton
            variant="ghost"
            disabled={page <= 1}
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
          >
            Previous
          </AdminButton>
          <p className="text-sm text-admin-text-muted">
            Page {page} of {totalPages}
          </p>
          <AdminButton
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((currentPage) => currentPage + 1)}
          >
            Next
          </AdminButton>
        </div>
      )}
    </div>
  );
}
