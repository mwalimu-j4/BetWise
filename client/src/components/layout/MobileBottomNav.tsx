import { Link, useLocation } from "@tanstack/react-router";
import { Home, PlayCircle, Receipt, List, User } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/api/axiosConfig";
import {
  betSlipCountEventName,
  betSlipCountStorageKey,
  betSlipToggleEventName,
} from "@/features/user/hooks/useBetSlip";

type LiveEventsResponse = {
  total?: number;
  events?: Array<{ eventId: string }>;
};

export default function MobileBottomNav() {
  const location = useLocation();
  const [selectionCount, setSelectionCount] = useState(0);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncCount = () => {
      const nextValue = Number(
        window.sessionStorage.getItem(betSlipCountStorageKey) ?? "0",
      );
      setSelectionCount(
        Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0,
      );
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
    window.addEventListener(
      betSlipCountEventName,
      onCountChanged as EventListener,
    );
    window.addEventListener("storage", syncCount);

    return () => {
      window.removeEventListener(
        betSlipCountEventName,
        onCountChanged as EventListener,
      );
      window.removeEventListener("storage", syncCount);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchLiveCount = async () => {
      try {
        const { data } = await api.get<LiveEventsResponse>("/user/events/live");
        if (!isActive) {
          return;
        }

        const nextCount =
          typeof data.total === "number"
            ? data.total
            : Array.isArray(data.events)
              ? data.events.length
              : 0;

        setLiveCount(Math.max(0, nextCount));
      } catch {
        // Keep current badge value when request fails.
      }
    };

    void fetchLiveCount();
    const intervalId = window.setInterval(() => {
      void fetchLiveCount();
    }, 30_000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const isHomeActive =
    location.pathname === "/" || location.pathname === "/user";
  const isLiveActive = location.pathname.startsWith("/user/live");
  const isMyBetsActive = location.pathname.startsWith("/user/bets");
  const isProfileActive = location.pathname.startsWith("/user/profile");

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 md:hidden">
      <div className="mobile-bottom-nav__inner mx-auto grid max-w-md grid-cols-5 items-end gap-1">
        <Link
          to="/user"
          className={`mobile-bottom-nav__link flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition ${
            isHomeActive ? "text-[#f5c518]" : "text-[#8a9bb0]"
          }`}
        >
          <Home size={20} />
          <span>Home</span>
        </Link>

        <Link
          to="/user/live"
          className={`mobile-bottom-nav__link relative flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition ${
            isLiveActive ? "text-[#f5c518]" : "text-[#8a9bb0]"
          }`}
        >
          <PlayCircle size={20} />
          {liveCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-[#ef4444] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
              {liveCount > 99 ? "99+" : liveCount}
            </span>
          ) : null}
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
            className="mobile-bottom-nav__betslip relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#f5c518] text-[#0b1120] shadow-[0_10px_30px_rgba(245,197,24,0.35)] ring-4 ring-[#0b1120] transition-transform active:scale-95"
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
          search={{
            tab: "normal",
            filter: "all",
            page: "1",
          }}
          className={`mobile-bottom-nav__link flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition ${
            isMyBetsActive ? "text-[#f5c518]" : "text-[#8a9bb0]"
          }`}
        >
          <List size={20} />
          <span>My Bets</span>
        </Link>

        <Link
          to="/user/profile"
          className={`mobile-bottom-nav__link flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition ${
            isProfileActive ? "text-[#f5c518]" : "text-[#8a9bb0]"
          }`}
        >
          <User size={20} />
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
