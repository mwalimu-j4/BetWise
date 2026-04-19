import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, Clock3 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";

const paymentPages = [
  {
    to: "/user/payments/deposit",
    title: "Paystack",
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
      <section className="animate-lift-in min-h-screen bg-[#0b1120] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Payments Center
            </h1>
            <p className="mt-1.5 text-sm text-[#8a9bb0]">
              Manage your wallet, deposits, and withdrawals.
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {paymentPages.map((item) => {
              const isActive = pathname.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition",
                    isActive
                      ? "border-[#f5c518] bg-[#f5c518]/20 text-[#f5c518]"
                      : "border-[#294157] text-[#8a9bb0] hover:border-[#f5c518]/60 hover:text-white",
                  )}
                >
                  <item.icon size={13} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>

          <Outlet />
        </div>
      </section>
    </ProtectedRoute>
  );
}
