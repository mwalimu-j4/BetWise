import { useState } from "react";
import { Edit, Lock, Plus, RefreshCw, Unlock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { oddsRows } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  InlinePill,
  StatusBadge,
  TableShell,
  adminCompactActionsClassName,
  adminTableCellClassName,
  adminTableClassName,
  adminTableHeadCellClassName,
} from "../../components/ui";

export default function Odds() {
  const [selectedOdds, setSelectedOdds] = useState<(typeof oddsRows)[0] | null>(
    null,
  );
  const [suspendReason, setSuspendReason] = useState("");
  const [editMargin, setEditMargin] = useState("");

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Odds Control"
        subtitle="Manage markets, odds, and margins"
        actions={
          <>
            <AdminButton variant="ghost">
              <RefreshCw size={13} />
              Sync Feed
            </AdminButton>
            <AdminButton>
              <Plus size={13} />
              New Market
            </AdminButton>
          </>
        }
      />

      <AdminCard>
        <TableShell>
          <table className={adminTableClassName}>
            <thead>
              <tr>
                {[
                  "Event",
                  "Market",
                  "Selection 1",
                  "Odds",
                  "Selection 2",
                  "Odds",
                  "Selection 3",
                  "Odds",
                  "Margin",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th className={adminTableHeadCellClassName} key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {oddsRows.map((row) => (
                <tr
                  className="even:bg-[var(--color-bg-elevated)]"
                  key={`${row.event}-${row.market}`}
                >
                  <td
                    className={`${adminTableCellClassName} max-w-[160px] truncate font-semibold text-admin-text-primary`}
                  >
                    {row.event}
                  </td>
                  <td className={adminTableCellClassName}>{row.market}</td>
                  <td
                    className={`${adminTableCellClassName} text-admin-text-primary`}
                  >
                    {row.selectionOne}
                  </td>
                  <td className={adminTableCellClassName}>
                    <InlinePill label={row.oddsOne} tone="accent" />
                  </td>
                  <td className={adminTableCellClassName}>
                    {row.selectionTwo || "-"}
                  </td>
                  <td className={adminTableCellClassName}>
                    {row.oddsTwo ? (
                      <InlinePill label={row.oddsTwo} tone="accent" />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td
                    className={`${adminTableCellClassName} text-admin-text-primary`}
                  >
                    {row.selectionThree}
                  </td>
                  <td className={adminTableCellClassName}>
                    <InlinePill label={row.oddsThree} tone="accent" />
                  </td>
                  <td
                    className={`${adminTableCellClassName} font-semibold text-admin-gold`}
                  >
                    {row.margin}
                  </td>
                  <td className={adminTableCellClassName}>
                    <StatusBadge status={row.status} />
                  </td>
                  <td className={adminTableCellClassName}>
                    <div className={adminCompactActionsClassName}>
                      <Dialog>
                        <DialogTrigger asChild>
                          <AdminButton
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOdds(row);
                              setEditMargin(row.margin);
                            }}
                          >
                            <Edit size={11} />
                          </AdminButton>
                        </DialogTrigger>
                        <DialogContent className="border-admin-border bg-admin-card">
                          <DialogHeader>
                            <DialogTitle>Edit Market Odds</DialogTitle>
                            <DialogDescription>
                              Adjust odds and margin for this market
                            </DialogDescription>
                          </DialogHeader>
                          {selectedOdds && (
                            <ScrollArea className="h-[400px] w-full pr-4">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-semibold text-admin-text-primary">
                                    Event
                                  </label>
                                  <p className="mt-1 text-sm text-admin-text-muted">
                                    {selectedOdds.event}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-semibold text-admin-text-primary">
                                    Market
                                  </label>
                                  <p className="mt-1 text-sm text-admin-text-muted">
                                    {selectedOdds.market}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-semibold text-admin-text-primary">
                                    {selectedOdds.selectionOne}
                                  </label>
                                  <Input
                                    defaultValue={selectedOdds.oddsOne}
                                    placeholder="1.50"
                                    className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                  />
                                </div>
                                {selectedOdds.selectionTwo && (
                                  <div>
                                    <label className="text-sm font-semibold text-admin-text-primary">
                                      {selectedOdds.selectionTwo}
                                    </label>
                                    <Input
                                      defaultValue={selectedOdds.oddsTwo}
                                      placeholder="1.50"
                                      className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                    />
                                  </div>
                                )}
                                \n{" "}
                                {selectedOdds.selectionThree && (
                                  <div>
                                    <label className="text-sm font-semibold text-admin-text-primary">
                                      {selectedOdds.selectionThree}
                                    </label>
                                    <Input
                                      defaultValue={selectedOdds.oddsThree}
                                      placeholder="1.50"
                                      className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                    />
                                  </div>
                                )}
                                \n{" "}
                                <div>
                                  <label className="text-sm font-semibold text-admin-text-primary">
                                    Margin %
                                  </label>
                                  <Input
                                    value={editMargin}
                                    onChange={(e) =>
                                      setEditMargin(e.target.value)
                                    }
                                    placeholder="2.5"
                                    className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                                  />
                                </div>
                              </div>
                            </ScrollArea>
                          )}
                          <div className="flex gap-2 pt-4">
                            <Button variant="outline" className="flex-1">
                              Cancel
                            </Button>
                            <Button className="flex-1 bg-admin-accent text-black hover:bg-[#00d492]">
                              Save Changes
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <AdminButton
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedOdds(row)}
                          >
                            {row.status === "active" ? (
                              <Lock size={11} />
                            ) : (
                              <Unlock size={11} />
                            )}
                          </AdminButton>
                        </DialogTrigger>
                        <DialogContent className="border-admin-border bg-admin-card">
                          <DialogHeader>
                            <DialogTitle>
                              {row.status === "active"
                                ? "Suspend"
                                : "Reactivate"}{" "}
                              Market
                            </DialogTitle>
                            <DialogDescription>
                              {row.status === "active"
                                ? "Suspend this market from accepting bets"
                                : "Reactivate this market for new bets"}
                            </DialogDescription>
                          </DialogHeader>
                          {row.status === "active" && (
                            <div>
                              <label className="text-sm font-semibold text-admin-text-primary">
                                Reason for Suspension
                              </label>
                              <Input
                                placeholder="E.g., Line movement, Technical issue"
                                value={suspendReason}
                                onChange={(e) =>
                                  setSuspendReason(e.target.value)
                                }
                                className="mt-2 border-admin-border bg-admin-surface text-admin-text-primary"
                              />
                            </div>
                          )}
                          \n{" "}
                          <div className="flex gap-2 pt-4">
                            <Button variant="outline" className="flex-1">
                              Cancel
                            </Button>
                            <Button
                              className={`flex-1 ${
                                row.status === "active"
                                  ? "bg-admin-red hover:bg-red-600 text-white"
                                  : "bg-admin-accent text-black hover:bg-[#00d492]"
                              }`}
                            >
                              {row.status === "active"
                                ? "Suspend"
                                : "Reactivate"}
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
