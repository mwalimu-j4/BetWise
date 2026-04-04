import { useSearch } from "@tanstack/react-router";

export default function UserComingSoonPage() {
  const search = useSearch({ from: "/user/coming-soon" });
  const feature = typeof search.feature === "string" ? search.feature : "this section";

  return (
    <section className="rounded-2xl border border-admin-border bg-admin-card p-6 text-admin-text-primary shadow-[0_14px_40px_var(--color-bg-deepest)]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-admin-text-muted">
        Page Not Found
      </p>
      <h1 className="mt-2 text-[24px] font-semibold">{feature} is coming soon</h1>
      <p className="mt-2 max-w-[620px] text-sm text-admin-text-muted">
        This page is not yet implemented. Navigation is live and wired, and this placeholder keeps the journey valid while the feature is under development.
      </p>
    </section>
  );
}
