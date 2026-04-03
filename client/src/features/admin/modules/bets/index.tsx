import { Download, Eye, RefreshCw, XCircle } from "lucide-react";
import { betFilters, betStats, recentBets } from "../../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  StatusBadge,
  SummaryCard,
  TableShell,
} from "../../components/ui";

const calculatePotentialWin = (stake: string, odds: string) => {
  const parsedStake = Number(stake.replace("$", "").replace(",", ""));
  const parsedOdds = Number(odds);

  return `$${Math.round(parsedStake * parsedOdds).toLocaleString()}`;
};

export default function Bets() {
  return (
    <div className="admin-panel">
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

      <div className="admin-grid admin-grid--stats-5">
        {betStats.map((stat) => (
          <SummaryCard
            key={stat.label}
            label={stat.label}
            tone={stat.tone}
            value={stat.value}
          />
        ))}
      </div>

      <div className="admin-filter-row">
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
          <table className="admin-table">
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
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBets.map((bet) => (
                <tr key={`${bet.id}-management`}>
                  <td className="admin-text-blue admin-text-strong admin-text-xs">
                    {bet.id}
                  </td>
                  <td className="admin-text-primary admin-text-strong">
                    {bet.user}
                  </td>
                  <td>{bet.sport}</td>
                  <td className="admin-truncate-cell">{bet.event}</td>
                  <td>{bet.market}</td>
                  <td className="admin-text-gold admin-text-strong">
                    {bet.odds}
                  </td>
                  <td className="admin-text-primary admin-text-strong">
                    {bet.stake}
                  </td>
                  <td className="admin-text-accent admin-text-strong">
                    {calculatePotentialWin(bet.stake, bet.odds)}
                  </td>
                  <td>
                    <StatusBadge status={bet.status} />
                  </td>
                  <td className="admin-text-muted admin-text-xs">
                    {bet.time}
                  </td>
                  <td>
                    <div className="admin-inline-group admin-inline-group--tight">
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
