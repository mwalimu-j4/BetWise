import { Link } from "@tanstack/react-router";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/axios";

// Assuming logo.png is in your assets folder
import logo from "@/assets/logo.png";

export default function Footer() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/newsletter/subscribe", { email });
      toast.success("Successfully subscribed to newsletter!");
      setIsSubscribed(true);
      setEmail("");

      // Reset subscription state after 5 seconds
      setTimeout(() => setIsSubscribed(false), 5000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to subscribe. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="w-full border-t border-[#23384f] bg-[#0b1120]">
      {/* Main Footer Content */}
      <div className="mx-auto w-full max-w-full px-3 py-6 sm:px-6 sm:py-8 md:max-w-[1280px] md:py-10 lg:px-8 lg:py-12">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-8">
          {/* Brand Section */}
          <div className="col-span-1">
            <div className="flex items-center gap-2">
              <Link to="/">
                <img
                  src={logo}
                  alt="BetRixPro Logo"
                  className="h-7 w-auto sm:h-8"
                />
              </Link>
            </div>
            <p className="mt-2 text-xs text-[#8a9bb0] sm:mt-3 sm:text-sm">
              Smart betting with fast M-Pesa deposits and a secure wallet
              experience. Play responsibly.
            </p>
            <div className="mt-3 flex gap-2 sm:mt-4">
              <a
                href="#"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#294157] text-[#8a9bb0] transition hover:border-[#f5c518] hover:text-[#f5c518] sm:h-9 sm:w-9"
              >
                <svg
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5c-.563-.074-2.313-.229-4.425-.229-4.815 0-8.175 2.95-8.175 8.362v2.937z" />
                </svg>
              </a>
              <a
                href="#"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#294157] text-[#8a9bb0] transition hover:border-[#f5c518] hover:text-[#f5c518] sm:h-9 sm:w-9"
              >
                <svg
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75-2.35 7-7 7-11.667z" />
                </svg>
              </a>
              <a
                href="#"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#294157] text-[#8a9bb0] transition hover:border-[#f5c518] hover:text-[#f5c518] sm:h-9 sm:w-9"
              >
                <svg
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path
                    d="M16.5 7.5a2 2 0 11-4 0 2 2 0 014 0zM6 12a6 6 0 1112 0 6 6 0 01-12 0z"
                    fill="#0b1120"
                  />
                </svg>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:contents sm:gap-6">
            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white sm:text-sm">
                Quick Links
              </h4>
              <nav className="mt-2 grid gap-2 sm:mt-4 sm:gap-3">
                <Link
                  to="/"
                  className="text-xs text-[#8a9bb0] transition hover:text-[#f5c518] hover:translate-x-0.5 sm:text-sm"
                >
                  Home
                </Link>
                <Link
                  to="/user/payments"
                  className="text-xs text-[#8a9bb0] transition hover:text-[#f5c518] hover:translate-x-0.5 sm:text-sm"
                >
                  Deposits
                </Link>
                <Link
                  to="/user/how-it-works"
                  className="text-xs text-[#8a9bb0] transition hover:text-[#f5c518] hover:translate-x-0.5 sm:text-sm"
                >
                  How It Works
                </Link>
                <Link
                  to="/user/faqs"
                  className="text-xs text-[#8a9bb0] transition hover:text-[#f5c518] hover:translate-x-0.5 sm:text-sm"
                >
                  FAQ
                </Link>
                <Link
                  to="/user/contact"
                  className="text-xs text-[#8a9bb0] transition hover:text-[#f5c518] hover:translate-x-0.5 sm:text-sm"
                >
                  Contact
                </Link>
              </nav>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white sm:text-sm">
                Contact
              </h4>
              <div className="mt-2 grid gap-2 text-xs text-[#8a9bb0] sm:mt-4 sm:gap-3 sm:text-sm">
                <a
                  href="mailto:support@betrixpro.com"
                  className="transition hover:text-[#f5c518]"
                >
                  support@betrixpro.com
                </a>
                <a
                  href="tel:+254700000000"
                  className="transition hover:text-[#f5c518]"
                >
                  +254 700 000 000
                </a>
                <p>Nairobi, Kenya</p>
              </div>
            </div>
          </div>

          {/* Stay Updated - Newsletter Card */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-2 rounded-lg border border-[#294157] bg-[linear-gradient(135deg,#111d2e_0%,#0f1a2a_100%)] p-4 sm:p-5 md:p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white sm:text-sm">
              Stay Updated
            </h4>
            <p className="mt-1 text-[10px] text-[#8a9bb0] sm:mt-2 sm:text-xs">
              Get betting tips & exclusive deals
            </p>

            <form
              onSubmit={handleNewsletterSubmit}
              className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:gap-2.5"
            >
              {isSubscribed ? (
                <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-xs font-bold text-green-400">
                    Subscribed!
                  </span>
                </div>
              ) : (
                <>
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a9bb0] sm:h-4 sm:w-4" />
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9 sm:h-10 w-full rounded-lg border border-[#294157] bg-[#0f1a2a] pl-9 sm:pl-10 pr-3 text-xs text-white outline-none transition placeholder:text-[#5a6b7d] focus:border-[#f5c518] focus:shadow-[0_0_0_2px_rgba(245,197,24,0.1)]"
                      disabled={isSubmitting}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-lg bg-[#f5c518] px-4 sm:px-6 text-xs font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "..." : "Subscribe"}
                    <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                </>
              )}
            </form>
          </div>

          {/* Why BetRixPro */}
          <div className="col-span-2 sm:col-span-1 hidden rounded-lg border border-[#294157] bg-[linear-gradient(135deg,#111d2e_0%,#0f1a2a_100%)] p-4 sm:block sm:p-5 md:p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white sm:text-sm">
              Why BetRixPro
            </h4>
            <ul className="mt-3 grid gap-2 sm:mt-4 sm:gap-2.5">
              <li className="flex items-center gap-2 text-xs text-[#8a9bb0]">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#f5c518] text-sm">
                  ✓
                </span>
                <span>Instant M-Pesa deposits</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-[#8a9bb0]">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#f5c518] text-sm">
                  ✓
                </span>
                <span>Secure transactions</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-[#8a9bb0]">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#f5c518] text-sm">
                  ✓
                </span>
                <span>Fast withdrawals</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-[#8a9bb0]">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[#f5c518] text-sm">
                  ✓
                </span>
                <span>24/7 support</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-4 border-t border-[#23384f] sm:mt-6 md:mt-8" />

        {/* Bottom Footer */}
        <div className="mt-3 flex flex-col gap-2 text-[10px] text-[#5a6b7d] sm:mt-4 sm:gap-3 sm:text-xs md:mt-6 md:flex-row md:items-center md:justify-between">
          <p>© {year} BetRixPro. All rights reserved.</p>
          <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
            <a href="#" className="transition hover:text-[#f5c518]">
              Terms
            </a>
            <span className="text-[#294157]">·</span>
            <a href="#" className="transition hover:text-[#f5c518]">
              Privacy
            </a>
            <span className="text-[#294157]">·</span>
            <a href="#" className="transition hover:text-[#f5c518]">
              Cookies
            </a>
          </div>
          <p className="hidden text-xs font-medium text-[#8a9bb0] md:block">
            Play Responsibly · 18+
          </p>
        </div>
      </div>
    </footer>
  );
}
