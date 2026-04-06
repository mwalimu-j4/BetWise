import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, Clock3 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";

const paymentPages = [
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
] as const;

export default function PaymentsModule() {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });
  const navigate = useNavigate();

  // Redirect to deposit if accessing /user/payments directly
  useEffect(() => {
    if (pathname === "/user/payments") {
      navigate({ to: "/user/payments/deposit" });
    }
  }, [pathname, navigate]);

  return (
    <ProtectedRoute>
      <section className="animate-lift-in grid gap-5 xl:grid-cols-[250px_1fr]">
        <aside className="h-fit rounded-3xl border border-[#23384f] bg-[#101b2b] p-4 xl:sticky xl:top-24">
          <div className="mb-3 rounded-2xl border border-[#23384f] bg-[#111d2e] p-3">
            <h1 className="text-base font-semibold text-admin-text-primary">
              Payments Center
            </h1>
            <p className="mt-1 text-xs text-admin-text-muted">
              Manage your wallet, history, and cash-out in one place.
            </p>
          </div>

          <nav className="grid gap-1">
            {paymentPages.map((item) => {
              const isActive = pathname.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                    isActive
                      ? "border-[#f5c518] bg-[#f5c518]/15 text-[#f5c518]"
                      : "border-transparent text-[#8a9bb0] hover:border-[#f5c518]/50 hover:bg-[#18283b] hover:text-white",
                  )}
                >
                  <item.icon size={14} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="rounded-3xl border border-[#23384f] bg-[#101b2b] p-4 sm:p-6">
          <Outlet />
        </div>
      </section>
    </ProtectedRoute>
  );
}
