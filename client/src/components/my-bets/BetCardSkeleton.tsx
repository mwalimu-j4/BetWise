type BetCardSkeletonProps = {
  count?: number;
};

export function BetCardSkeleton({ count = 5 }: BetCardSkeletonProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`bet-card-skeleton-${index}`}
          className="relative overflow-hidden rounded-2xl border border-[#1e3350]/30 bg-gradient-to-br from-[#111d2e] via-[#0f1a2d] to-[#0d1624] p-4"
        >
          <div className="flex justify-between">
            <div className="space-y-3">
              <div className="h-5 w-28 rounded-md bg-[#1e3350]/50" />
              <div className="h-4 w-16 rounded-md bg-[#1e3350]/40" />
            </div>
            <div className="space-y-3 flex flex-col items-end">
              <div className="h-6 w-32 rounded-md bg-[#1e3350]/50" />
              <div className="h-3 w-24 rounded-md bg-[#1e3350]/30" />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.5s_linear_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
      ))}
    </div>
  );
}
