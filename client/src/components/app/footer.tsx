import { Link } from "@tanstack/react-router";
import { ShieldCheck, Smartphone, Wallet, Mail, ArrowRight, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Successfully subscribed to newsletter!");
      setIsSubscribed(true);
      setEmail("");
      
      // Reset subscription state after 5 seconds
      setTimeout(() => setIsSubscribed(false), 5000);
    } catch (error) {
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="w-full border-t border-[#23384f] bg-[#0b1120]">
      {/* Newsletter Section */}
      <div className="border-b border-[#23384f] bg-[linear-gradient(135deg,#111d2e_0%,#0f1a2a_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Stay Updated
              </h2>
              <p className="mt-2 text-sm text-[#8a9bb0]">
                Get the latest betting tips, promotions, and updates delivered to your inbox.
              </p>
            </div>
            
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              {isSubscribed ? (
                <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-sm font-medium text-green-400">subscribed!</span>
                </div>
              ) : (
                <>
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9bb0]" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#294157] bg-[#0f1a2a] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-[#8a9bb0] focus:border-[#f5c518] focus:shadow-[0_0_0_2px_rgba(245,197,24,0.2)]"
                      disabled={isSubmitting}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#f5c518] px-4 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "..." : "Subscribe"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="mx-auto w-full max-w-[1280px] gap-6 px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5c518]">
                <span className="text-sm font-bold text-black">B</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                BetWise
              </h3>
            </div>
            <p className="mt-4 text-sm text-[#8a9bb0]">
              Smart betting with fast M-Pesa deposits and a secure wallet experience. Play responsibly.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#294157] text-[#8a9bb0] transition hover:border-[#f5c518] hover:text-[#f5c518]">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5c-.563-.074-2.313-.229-4.425-.229-4.815 0-8.175 2.95-8.175 8.362v2.937z"/></svg>
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#294157] text-[#8a9bb0] transition hover:border-[#f5c518] hover:text-[#f5c518]">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75-2.35 7-7 7-11.667z"/></svg>
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#294157] text-[#8a9bb0] transition hover:border-[#f5c518] hover:text-[#f5c518]">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16.5 7.5a2 2 0 11-4 0 2 2 0 014 0zM6 12a6 6 0 1112 0 6 6 0 01-12 0z" fill="#0b1120"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <nav className="mt-4 grid gap-3">
              <Link
                to="/"
                className="text-sm text-[#8a9bb0] transition hover:text-[#f5c518] hover:translate-x-0.5"
              >
                Home
              </Link>
              <Link
                to="/user/payments"
                className="text-sm text-[#8a9bb0] transition hover:text-[#f5c518] hover:translate-x-0.5"
              >
                Deposits
              </Link>
              <a href="#" className="text-sm text-[#8a9bb0] transition hover:text-[#f5c518] hover:translate-x-0.5">
                How It Works
              </a>
              <a href="#" className="text-sm text-[#8a9bb0] transition hover:text-[#f5c518] hover:translate-x-0.5">
                FAQ
              </a>
            </nav>
          </div>

          {/* Why BetWise */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Why BetWise
            </h4>
            <ul className="mt-4 grid gap-3">
              <li className="flex items-start gap-2 text-sm text-[#8a9bb0]">
                <Smartphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#f5c518]" />
                <span>Mobile-first experience</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#8a9bb0]">
                <Wallet className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#f5c518]" />
                <span>Instant wallet top-ups</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-[#8a9bb0]">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#f5c518]" />
                <span>Secure payment flow</span>
              </li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Contact Us
            </h4>
            <div className="mt-4 grid gap-3 text-sm text-[#8a9bb0]">
              <a href="mailto:support@betwise.com" className="transition hover:text-[#f5c518]">
                support@betwise.com
              </a>
              <a href="tel:+254700000000" className="transition hover:text-[#f5c518]">
                +254 700 000 000
              </a>
              <p>Nairobi, Kenya</p>
            </div>
            <div className="mt-4 flex gap-2">
              <a href="#" className="text-xs text-[#8a9bb0] transition hover:text-[#f5c518]">
                Terms
              </a>
              <span className="text-[#294157]">·</span>
              <a href="#" className="text-xs text-[#8a9bb0] transition hover:text-[#f5c518]">
                Privacy
              </a>
              <span className="text-[#294157]">·</span>
              <a href="#" className="text-xs text-[#8a9bb0] transition hover:text-[#f5c518]">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 border-t border-[#23384f]" />

        {/* Bottom Footer */}
        <div className="mt-8 flex flex-col gap-4 text-xs text-[#5a6b7d] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} BetWise. All rights reserved. | Safe Gaming Certified</p>
          <p className="font-medium text-[#8a9bb0]">Play Responsibly · 18+</p>
        </div>
      </div>
    </footer>
  );
}
