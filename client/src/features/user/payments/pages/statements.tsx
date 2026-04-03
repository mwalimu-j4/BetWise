import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, statementMonths } from "../data";

const statementRows = [
  { month: "April 2026", credits: 11250, debits: 3700, net: 7550 },
  { month: "March 2026", credits: 22040, debits: 14300, net: 7740 },
  { month: "February 2026", credits: 17810, debits: 12990, net: 4820 },
];

export default function PaymentsStatementsPage() {
  return (
    <section className="grid gap-4">
      <article className="rounded-2xl border border-admin-border bg-admin-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-admin-text-primary">Statements and Reports</h2>
            <p className="mt-1 text-sm text-admin-text-muted">Download monthly account statements for audits and tracking.</p>
          </div>
          <Select defaultValue={statementMonths[0]}>
            <SelectTrigger className="h-10 w-full min-w-[190px] rounded-xl border-admin-border bg-[rgba(22,29,53,0.65)] text-admin-text-primary sm:w-fit">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {statementMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </article>

      <div className="grid gap-3">
        {statementRows.map((row) => (
          <article key={row.month} className="flex flex-col gap-3 rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.5)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[rgba(0,229,160,0.12)] text-admin-accent">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <p className="font-semibold text-admin-text-primary">{row.month}</p>
                <p className="text-xs text-admin-text-muted">
                  Credit: {formatMoney(row.credits)} | Debit: {formatMoney(row.debits)} | Net: {formatMoney(row.net)}
                </p>
              </div>
            </div>
            <Button variant="outline" className="h-9 border-admin-border bg-transparent text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary">
              <Download size={14} /> Download PDF
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
