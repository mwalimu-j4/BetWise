import { Link } from "@tanstack/react-router";
import { ShieldCheck, Smartphone, Wallet } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t bg-card/70">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight">BetCenic</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Smart betting with fast M-Pesa deposits and a secure wallet
            experience.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Quick Links</h4>
          <nav className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
            <Link to="/payments" className="hover:text-foreground">
              Deposit
            </Link>
            <Link to="/login" className="hover:text-foreground">
              Login
            </Link>
          </nav>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Why BetCenic</h4>
          <ul className="mt-3 grid gap-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-600" />
              Mobile-first experience
            </li>
            <li className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              Instant wallet top-ups
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Secure payment flow
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Contact</h4>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>support@betcenic.com</p>
            <p>+254 700 000 000</p>
            <p>Nairobi, Kenya</p>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <p>© {year} BetCenic. All rights reserved.</p>
          <p>Play responsibly. 18+</p>
        </div>
      </div>
    </footer>
  );
}
