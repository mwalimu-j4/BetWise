import { Edit, Lock, Plus, RefreshCw, Unlock } from "lucide-react";
import { oddsRows } from "../data/mock-data";
import {
  AdminButton,
  AdminCard,
  AdminSectionHeader,
  InlinePill,
  StatusBadge,
  TableShell,
} from "../components/ui";

export default function Odds() {
  return (
    <div className="admin-panel">
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
          <table className="admin-table">
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
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {oddsRows.map((row) => (
                <tr key={`${row.event}-${row.market}`}>
                  <td className="admin-text-primary admin-text-strong admin-truncate-cell">
                    {row.event}
                  </td>
                  <td>{row.market}</td>
                  <td className="admin-text-primary">{row.selectionOne}</td>
                  <td>
                    <InlinePill label={row.oddsOne} tone="accent" />
                  </td>
                  <td>{row.selectionTwo || "-"}</td>
                  <td>
                    {row.oddsTwo ? (
                      <InlinePill label={row.oddsTwo} tone="accent" />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="admin-text-primary">{row.selectionThree}</td>
                  <td>
                    <InlinePill label={row.oddsThree} tone="accent" />
                  </td>
                  <td className="admin-text-gold admin-text-strong">
                    {row.margin}
                  </td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <div className="admin-inline-group admin-inline-group--tight">
                      <AdminButton size="sm" variant="ghost">
                        <Edit size={11} />
                      </AdminButton>
                      <AdminButton size="sm" variant="ghost">
                        {row.status === "active" ? (
                          <Lock size={11} />
                        ) : (
                          <Unlock size={11} />
                        )}
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
