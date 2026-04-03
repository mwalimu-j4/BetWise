import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgePercent,
  ChartColumnBig,
  Clock3,
  CreditCard,
  Wallet2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const paymentPages = [
  {
    to: "/user/payments",
    title: "Overview",
    icon: ChartColumnBig,
    exact: true,
  },
  {
    to: "/user/payments/deposit",
    title: "Deposit",
    icon: ArrowDownToLine,
  },
  {
    to: "/user/payments/withdrawal",
    title: "Withdrawal",
    icon: ArrowUpFromLine,
  },
  {
    to: "/user/payments/history",
    title: "Transaction History",
    icon: Clock3,
  },
  {
    to: "/user/payments/methods",
    title: "Payment Methods",
    icon: CreditCard,
  },
  {
    to: "/user/payments/limits",
    title: "Limits",
    icon: Wallet2,
  },
  {
    to: "/user/payments/bonuses",
    title: "Bonuses",
    icon: BadgePercent,
  },
  {
    to: "/user/payments/statements",
    title: "Statements",
    icon: Wallet2,
  },
] as const;

export default function PaymentsModule() {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  return (
    <section className="animate-lift-in grid gap-4 xl:grid-cols-[240px_1fr]">
      <aside className="h-fit rounded-3xl border border-admin-border bg-admin-card p-3 xl:sticky xl:top-[95px]">
        <div className="mb-3 rounded-2xl border border-admin-border bg-[rgba(22,29,53,0.45)] p-3">
          <h1 className="text-base font-semibold text-admin-text-primary">Payments Center</h1>
          <p className="mt-1 text-xs text-admin-text-muted">Manage your wallet, history, and cash-out in one place.</p>
        </div>

        <nav className="grid gap-1">
          {paymentPages.map((item) => {
            const isActive = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                  isActive
                    ? "border-admin-accent/25 bg-admin-accent-dim text-admin-accent"
                    : "border-transparent text-admin-text-secondary hover:border-admin-border hover:bg-white/3 hover:text-admin-text-primary",
                )}
              >
                <item.icon size={14} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="rounded-3xl border border-admin-border bg-[rgba(10,14,26,0.52)] p-4 sm:p-5">
        <Outlet />
      </div>
    </section>
  );
}
