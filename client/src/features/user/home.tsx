export default function Home() {
  return (
    <section className="user-panel animate-lift-in">
      <div className="user-section-header">
        <div>
          <h1 className="user-page-title">BetCenic is live</h1>
          <p className="user-page-subtitle">
            Real-time odds, quick deposits, and a wallet-first flow.
          </p>
        </div>
      </div>

      <div className="user-grid user-grid--summary">
        <article className="user-card" data-tone="accent">
          <p className="user-kpi-label">Available Balance</p>
          <p className="user-kpi-value">KES 0.00</p>
        </article>
        <article className="user-card" data-tone="blue">
          <p className="user-kpi-label">Open Bets</p>
          <p className="user-kpi-value">0</p>
        </article>
        <article className="user-card" data-tone="gold">
          <p className="user-kpi-label">Today's Activity</p>
          <p className="user-kpi-value">No activity</p>
        </article>
      </div>
    </section>
  );
}
