import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BetsFilterBar } from "@/components/my-bets/BetsFilterBar";
import { BetsList } from "@/components/my-bets/BetsList";
import {
  type MyBetFilter,
  type MyBetTab,
  useMyBets,
} from "@/features/user/components/hooks/useMyBets";

const hideLostStorageKey = "my-bets-hide-lost";

function normalizeTab(_value: unknown): MyBetTab {
  return "all";
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
    <div className="min-h-screen bg-linear-to-br from-[#0a0f1a] via-[#0f172a] to-[#0a0f1a]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <main className="mx-auto w-full space-y-6">

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
        </main>
      </div>
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
