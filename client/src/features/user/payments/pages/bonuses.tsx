import { Badge } from "@/components/ui/badge";
import { formatMoney } from "../data";

type Bonus = {
  id: string;
  name: string;
  amount: number;
  wageringTarget: number;
  wagered: number;
  expiresAt: string;
  status: "active" | "completed";
};

const bonuses: Bonus[] = [
  {
    id: "BON-101",
    name: "Welcome Bonus",
    amount: 1000,
    wageringTarget: 5000,
    wagered: 3800,
    expiresAt: "Apr 20, 2026",
    status: "active",
  },
  {
    id: "BON-097",
    name: "Weekend Acca Boost",
    amount: 500,
    wageringTarget: 2500,
    wagered: 2500,
    expiresAt: "Apr 2, 2026",
    status: "completed",
  },
];

export default function PaymentsBonusesPage() {
  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-bold text-admin-text-primary">Bonuses and Promotions</h2>
        <p className="mt-1 text-sm text-admin-text-muted">Track active bonus balances and wagering requirements.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {bonuses.map((bonus) => {
          const progress = Math.min(100, Math.round((bonus.wagered / bonus.wageringTarget) * 100));

          return (
            <article key={bonus.id} className="rounded-2xl border border-admin-border bg-admin-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-admin-text-primary">{bonus.name}</h3>
                <Badge
                  className={
                    bonus.status === "active"
                      ? "bg-admin-accent text-black"
                      : "bg-[rgba(61,142,248,0.2)] text-admin-blue"
                  }
                >
                  {bonus.status.toUpperCase()}
                </Badge>
              </div>

              <p className="mt-3 text-sm text-admin-text-secondary">Bonus amount: {formatMoney(bonus.amount)}</p>
              <p className="text-sm text-admin-text-secondary">Wager target: {formatMoney(bonus.wageringTarget)}</p>

              <div className="mt-3 h-2 rounded-full bg-[rgba(8,11,20,0.8)]">
                <div className="h-full rounded-full bg-admin-gold" style={{ width: `${progress}%` }} />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-admin-text-muted">
                <span>{formatMoney(bonus.wagered)} wagered</span>
                <span>{progress}% complete</span>
              </div>

              <p className="mt-2 text-xs text-admin-text-muted">Expires: {bonus.expiresAt}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
