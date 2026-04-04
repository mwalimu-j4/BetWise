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

const calculatePotentialWin = (stake: string, odds: string) => {
  const parsedStake = Number(stake.replace("$", "").replace(",", ""));
  const parsedOdds = Number(odds);

  return `$${Math.round(parsedStake * parsedOdds).toLocaleString()}`;
};

export default function Bets() {
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
                  className="even:bg-[rgba(15,76,117,0.5)]"
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
                      <AdminButton size="sm" variant="ghost">
                        <Eye size={11} />
                      </AdminButton>
                      <AdminButton size="sm" variant="ghost">
                        <XCircle size={11} />
                      </AdminButton>
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


