import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthCard({
  title,
  subtitle,
  backTo = "/user",
  backLabel = "Back",
  children,
  footer,
}: AuthCardProps) {
  return (
    <section className="mx-auto mt-2 w-full max-w-sm animate-lift-in rounded-xl border border-admin-border bg-[linear-gradient(165deg,var(--color-bg-elevated),var(--color-bg-surface))] p-3.5 shadow-[0_8px_26px_rgba(0,0,0,0.24)] sm:mt-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between">
        <Link
          to={backTo as never}
          className="inline-flex items-center gap-1 rounded-md border border-admin-border px-2 py-1 text-[11px] font-medium text-admin-text-secondary transition hover:text-admin-text-primary"
        >
          <ArrowLeft size={13} />
          <span>{backLabel}</span>
        </Link>
        <span className="rounded-full border border-[var(--color-border-accent)] bg-admin-accent-dim px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-admin-accent">
          BetixPro Secure
        </span>
      </div>

      <h1 className="text-base font-bold text-admin-text-primary">{title}</h1>
      <p className="mt-0.5 text-xs text-admin-text-muted">{subtitle}</p>

      <div className="mt-2.5">{children}</div>

      {footer ? (
        <div className="mt-2.5 border-t border-admin-border pt-2.5">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
