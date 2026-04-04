import { Link } from "@tanstack/react-router";
import { ShieldCheck, Smartphone, Wallet } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto box-border w-full border-t border-admin-border bg-[var(--color-bg-deepest)]">
      <div className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-7 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
        <div>
          <h3 className="text-lg font-bold text-admin-text-primary">
            BetCenic
          </h3>
          <p className="mt-3 text-sm text-admin-text-secondary">
            Smart betting with fast M-Pesa deposits and a secure wallet
            experience.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-admin-text-primary">
            Quick Links
          </h4>
          <nav className="mt-3 grid gap-2">
            <Link
              to="/user"
              className="text-sm text-admin-text-secondary transition hover:text-admin-accent"
            >
              Home
            </Link>
            <Link
              to="/user/payments"
              className="text-sm text-admin-text-secondary transition hover:text-admin-accent"
            >
              Deposit
            </Link>
            <Link
              to="/user/login"
              className="text-sm text-admin-text-secondary transition hover:text-admin-accent"
            >
              Login
            </Link>
          </nav>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-admin-text-primary">
            Why BetCenic
          </h4>
          <ul className="mt-3 grid gap-2 text-sm text-admin-text-secondary">
            <li className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-admin-accent" />
              Mobile-first experience
            </li>
            <li className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-admin-accent" />
              Instant wallet top-ups
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-admin-accent" />
              Secure payment flow
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-admin-text-primary">
            Contact
          </h4>
          <div className="mt-3 grid gap-1.5 text-sm text-admin-text-secondary">
            <p>support@betcenic.com</p>
            <p>+254 700 000 000</p>
            <p>Nairobi, Kenya</p>
          </div>
        </div>
      </div>

      <div className="border-t border-admin-border">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 px-4 py-4 text-xs text-admin-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Copyright {year} BetCenic. All rights reserved.</p>
          <p>Play responsibly. 18+</p>
        </div>
      </div>
    </footer>
  );
}



