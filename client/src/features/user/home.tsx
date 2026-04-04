import { useWalletSummary } from "./payments/wallet";

export default function Home() {
  const { data } = useWalletSummary();
  const balance = data?.wallet.balance ?? 0;

  return (
    <section className="animate-lift-in rounded-3xl border border-admin-border bg-admin-card p-6 shadow-[0_16px_48px_var(--color-bg-deepest)]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-admin-text-primary">
            BetCenic is live
          </h1>
          <p className="mt-1.5 text-sm text-admin-text-muted">
            Real-time odds, quick deposits, and a wallet-first flow.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-admin-border bg-admin-surface/55 p-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
            Available Balance
          </p>
          <p className="mt-2 text-2xl font-bold text-admin-accent">
            KES {balance.toFixed(2)}
          </p>
        </article>
        <article className="rounded-2xl border border-admin-border bg-admin-surface/55 p-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
            Open Bets
          </p>
          <p className="mt-2 text-2xl font-bold text-admin-blue">0</p>
        </article>
        <article className="rounded-2xl border border-admin-border bg-admin-surface/55 p-4">
          <p className="text-[10px] uppercase tracking-[0.08em] text-admin-text-muted">
            Today&apos;s Activity
          </p>
          <p className="mt-2 text-2xl font-bold text-admin-gold">No activity</p>
        </article>
      </div>
    </section>
  );
}
