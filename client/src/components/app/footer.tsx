import { Link } from "@tanstack/react-router";
import { ShieldCheck, Smartphone, Wallet } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="user-footer">
      <div className="user-footer__inner">
        <div>
          <h3 className="user-footer__title">BetCenic</h3>
          <p className="user-footer__copy">
            Smart betting with fast M-Pesa deposits and a secure wallet
            experience.
          </p>
        </div>

        <div>
          <h4 className="user-footer__heading">Quick Links</h4>
          <nav className="user-footer__nav">
            <Link to="/user" className="user-footer__link">
              Home
            </Link>
            <Link to="/user/payments" className="user-footer__link">
              Deposit
            </Link>
            <Link to="/user/login" className="user-footer__link">
              Login
            </Link>
          </nav>
        </div>

        <div>
          <h4 className="user-footer__heading">Why BetCenic</h4>
          <ul className="user-footer__list">
            <li>
              <Smartphone className="h-4 w-4" />
              Mobile-first experience
            </li>
            <li>
              <Wallet className="h-4 w-4" />
              Instant wallet top-ups
            </li>
            <li>
              <ShieldCheck className="h-4 w-4" />
              Secure payment flow
            </li>
          </ul>
        </div>

        <div>
          <h4 className="user-footer__heading">Contact</h4>
          <div className="user-footer__contact">
            <p>support@betcenic.com</p>
            <p>+254 700 000 000</p>
            <p>Nairobi, Kenya</p>
          </div>
        </div>
      </div>

      <div className="user-footer__bottom-shell">
        <div className="user-footer__bottom">
          <p>© {year} BetCenic. All rights reserved.</p>
          <p>Play responsibly. 18+</p>
        </div>
      </div>
    </footer>
  );
}
