import { formatMoney } from "../data";

type LimitItem = {
  title: string;
  used: number;
  cap: number;
};

const limits: LimitItem[] = [
  { title: "Daily deposit limit", used: 3000, cap: 50000 },
  { title: "Weekly deposit limit", used: 14500, cap: 200000 },
  { title: "Monthly deposit limit", used: 48500, cap: 750000 },
  { title: "Daily withdrawal limit", used: 1500, cap: 100000 },
];

export default function PaymentsLimitsPage() {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
      <article className="rounded-2xl border border-admin-border bg-admin-card p-5">
        <h2 className="text-lg font-bold text-admin-text-primary">Account Limits</h2>
        <p className="mt-1 text-sm text-admin-text-muted">Track limits and responsible gambling controls.</p>

        <div className="mt-4 grid gap-3">
          {limits.map((item) => {
            const percent = Math.min(100, Math.round((item.used / item.cap) * 100));

            return (
              <div key={item.title} className="rounded-xl border border-admin-border bg-[rgba(22,29,53,0.45)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-admin-text-primary">{item.title}</p>
                  <p className="text-xs text-admin-text-secondary">{percent}% used</p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[rgba(8,11,20,0.8)]">
                  <div className="h-full rounded-full bg-admin-accent" style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-admin-text-muted">
                  <span>{formatMoney(item.used)} used</span>
                  <span>Cap {formatMoney(item.cap)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.5)] p-5">
        <h3 className="text-sm font-semibold text-admin-text-primary">Responsible Play</h3>
        <div className="mt-3 grid gap-2 text-sm text-admin-text-secondary">
          <p className="rounded-lg border border-admin-border bg-[rgba(8,11,20,0.6)] px-3 py-2">Set cool-off periods for betting sessions.</p>
          <p className="rounded-lg border border-admin-border bg-[rgba(8,11,20,0.6)] px-3 py-2">Enable withdrawal-only mode when needed.</p>
          <p className="rounded-lg border border-admin-border bg-[rgba(8,11,20,0.6)] px-3 py-2">Contact support to set custom spending caps.</p>
        </div>
      </article>
    </section>
  );
}
