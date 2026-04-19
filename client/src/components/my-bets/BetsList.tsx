import type { MyBetListItem } from "@/features/user/components/hooks/useMyBets";
import { BetCard } from "./BetCard";
import { BetCardSkeleton } from "./BetCardSkeleton";
import { EmptyBetsState } from "./EmptyBetsState";
import { Pagination } from "./Pagination";

type BetsListProps = {
  items: MyBetListItem[];
  isLoading: boolean;
  isFetching: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onOpenBet: (betId: string) => void;
  onPageChange: (page: number) => void;
};

export function BetsList({
  items,
  isLoading,
  isFetching,
  total,
  page,
  pageSize,
  totalPages,
  onOpenBet,
  onPageChange,
}: BetsListProps) {
  const showSkeleton = isLoading || isFetching;

  return (
    <div className="space-y-6 py-4">
      {showSkeleton ? <BetCardSkeleton count={5} /> : null}

      {!showSkeleton && items.length === 0 ? <EmptyBetsState /> : null}

      {!showSkeleton && items.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((bet) => (
            <BetCard key={bet.id} bet={bet} onClick={() => onOpenBet(bet.id)} />
          ))}
        </div>
      ) : null}

      <Pagination
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
