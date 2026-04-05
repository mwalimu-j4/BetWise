import { Link, useLocation } from "@tanstack/react-router";
import { Home, PlayCircle, Receipt, List, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  betSlipCountEventName,
  betSlipCountStorageKey,
  betSlipToggleEventName,
} from "@/features/user/hooks/useBetSlip";

export default function MobileBottomNav() {
  const location = useLocation();
  const [selectionCount, setSelectionCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncCount = () => {
      const nextValue = Number(window.sessionStorage.getItem(betSlipCountStorageKey) ?? "0");
      setSelectionCount(Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0);
    };

    const onCountChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      if (typeof customEvent.detail?.count === "number") {
        setSelectionCount(Math.max(0, customEvent.detail.count));
        return;
      }

      syncCount();
    };

    syncCount();
    window.addEventListener(betSlipCountEventName, onCountChanged as EventListener);
    window.addEventListener("storage", syncCount);

    return () => {
      window.removeEventListener(betSlipCountEventName, onCountChanged as EventListener);
      window.removeEventListener("storage", syncCount);
    };
  }, []);

  const isHomeActive = location.pathname === "/" || location.pathname.startsWith("/user");
  const isLiveActive = location.pathname.startsWith("/user/payments/deposit");
  const isMyBetsActive = location.pathname.startsWith("/user/bets");
  const isProfileActive = location.pathname.includes("feature=profile");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#23384f] bg-[#0b1120]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
        <Link
          to="/user"
          className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition ${
            isHomeActive ? "text-[#f5c518]" : "text-[#8a9bb0]"
          }`}
        >
        <Home size={20} />
          <span>Home</span>
        </Link>

        <Link
          to="/user/payments/deposit"
          className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition ${
            isLiveActive ? "text-[#f5c518]" : "text-[#8a9bb0]"
          }`}
        >
        <PlayCircle size={20} />
          <span>Live</span>
        </Link>

        <div className="relative flex justify-center">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event(betSlipToggleEventName));
              }
            }}
            className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#f5c518] text-[#0b1120] shadow-[0_10px_30px_rgba(245,197,24,0.35)] ring-4 ring-[#0b1120] transition-transform active:scale-95"
            aria-label="Open bet slip"
          >
            <Receipt size={22} strokeWidth={2.5} />
            {selectionCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#ef4444] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                {selectionCount > 99 ? "99+" : selectionCount}
              </span>
            ) : null}
          </button>
        </div>

        <Link
          to="/user/bets"
          className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition ${
            isMyBetsActive ? "text-[#f5c518]" : "text-[#8a9bb0]"
          }`}
        >
        <List size={20} />
          <span>My Bets</span>
        </Link>

        <a
          href="/user/coming-soon?feature=profile"
          className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition ${
            isProfileActive ? "text-[#f5c518]" : "text-[#8a9bb0]"
          }`}
        >
          <User size={20} />
          <span>Profile</span>
        </a>
      </div>
    </nav>
  );
}