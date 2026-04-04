import { Edit, Lock, Plus, RefreshCw, Unlock } from "lucide-react";
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
                  className="even:bg-[rgba(15,76,117,0.5)]"
                  key={`${row.event}-${row.market}`}
                >
                  <td
                    className={`${adminTableCellClassName} max-w-[160px] truncate font-semibold text-admin-text-primary`}
                  >
                    {row.event}
                  </td>
                  <td className={adminTableCellClassName}>{row.market}</td>
                  <td className={`${adminTableCellClassName} text-admin-text-primary`}>
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
                  <td className={`${adminTableCellClassName} text-admin-text-primary`}>
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


