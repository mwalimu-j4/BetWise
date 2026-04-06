import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BetsFilterBar } from "@/components/my-bets/BetsFilterBar";
import { BetsList } from "@/components/my-bets/BetsList";
import { BetsTabs } from "@/components/my-bets/BetsTabs";
import {
  type MyBetFilter,
  type MyBetTab,
  useMyBets,
} from "@/features/user/hooks/useMyBets";

const hideLostStorageKey = "my-bets-hide-lost";

function normalizeTab(value: unknown): MyBetTab {
  if (
    value === "normal" ||
    value === "shilisha" ||
    value === "jackpot" ||
    value === "virtual" ||
    value === "sababisha"
  ) {
    return value;
  }

  return "normal";
}

function normalizeFilter(value: unknown): MyBetFilter {
  if (
    value === "open" ||
    value === "all" ||
    value === "today" ||
    value === "week" ||
    value === "month"
  ) {
    return value;
  }

  return "all";
}

function normalizePage(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function MyBetsPageContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    tab?: string;
    filter?: string;
    page?: string;
  };

  const [hideLost, setHideLost] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(hideLostStorageKey) === "true";
  });

  const tab = normalizeTab(search.tab);
  const filter = normalizeFilter(search.filter);
  const page = normalizePage(search.page);

  const bets = useMyBets({
    tab,
    filter,
    page,
    hideLost,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(hideLostStorageKey, String(hideLost));
  }, [hideLost]);

  const formattedLastUpdated = useMemo(() => {
    const source = bets.lastUpdatedAt ?? new Date().toISOString();
    const parsed = new Date(source);

    return parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [bets.lastUpdatedAt]);

  const updateSearch = (next: {
    tab?: MyBetTab;
    filter?: MyBetFilter;
    page?: number;
  }) => {
    void navigate({
      to: "/user/bets",
      search: {
        tab: next.tab ?? tab,
        filter: next.filter ?? filter,
        page: String(next.page ?? page),
      },
      replace: true,
    });
  };

  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
      <section className="mx-auto w-full max-w-[1180px] overflow-hidden rounded-2xl border border-[#1f2a3a] bg-[#0d1117] shadow-[0_20px_70px_rgba(0,0,0,0.35)] md:rounded-3xl">
        <header className="flex items-center justify-between border-b border-[#243247] px-3 py-3 md:px-5 md:py-4">
        <button
          type="button"
          onClick={() => {
            void navigate({ to: "/user" });
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-[#2b3a4f] bg-[#111827] px-3 py-1.5 text-sm text-[#c6d6ea] transition hover:border-[#3a506a] md:px-4"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="text-sm font-semibold text-white md:text-base">
          My Bets
        </h1>
        <span className="w-16" aria-hidden="true" />
      </header>

        <BetsTabs
          activeTab={tab}
          onTabChange={(nextTab) => {
            updateSearch({ tab: nextTab, page: 1 });
          }}
        />

        <BetsFilterBar
          filter={filter}
          hideLost={hideLost}
          onFilterChange={(nextFilter) => {
            updateSearch({ filter: nextFilter, page: 1 });
          }}
          onHideLostChange={(value) => {
            setHideLost(value);
            updateSearch({ page: 1 });
          }}
          lastUpdated={formattedLastUpdated}
        />

        <BetsList
          items={bets.items}
          isLoading={bets.isLoading}
          isFetching={bets.isFetching}
          total={bets.total}
          page={bets.page}
          pageSize={bets.pageSize}
          totalPages={bets.totalPages}
          onOpenBet={(betId) => {
            void navigate({
              to: "/user/bets/$betId",
              params: { betId },
              search: {
                tab,
                filter,
                page: String(page),
              },
            });
          }}
          onPageChange={(nextPage) => updateSearch({ page: nextPage })}
        />

        <Outlet />
      </section>
    </div>
  );
}

export default function MyBetsPage() {
  return (
    <ProtectedRoute requireRole="USER" redirectTo="/user/bets">
      <MyBetsPageContent />
    </ProtectedRoute>
  );
}
