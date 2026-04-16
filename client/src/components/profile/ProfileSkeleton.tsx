export default function ProfileSkeleton() {
  return (
    <section className="space-y-4" aria-label="Loading profile">
      <div className="animate-pulse rounded-2xl border border-[#31455f] bg-[#0f172a] p-5">
        <div className="h-4 w-20 rounded bg-[#1e2f42]" />
        <div className="mt-3 h-8 w-48 rounded bg-[#1e2f42]" />
        <div className="mt-3 h-5 w-24 rounded bg-[#1e2f42]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="animate-pulse rounded-xl border border-[#31455f] bg-[#0f172a] p-4">
          <div className="h-4 w-16 rounded bg-[#1e2f42]" />
          <div className="mt-3 h-7 w-24 rounded bg-[#1e2f42]" />
        </div>
        <div className="animate-pulse rounded-xl border border-[#31455f] bg-[#0f172a] p-4">
          <div className="h-4 w-16 rounded bg-[#1e2f42]" />
          <div className="mt-3 h-7 w-24 rounded bg-[#1e2f42]" />
        </div>
      </div>

      <div className="animate-pulse space-y-3 rounded-2xl border border-[#31455f] bg-[#0f172a] p-4">
        <div className="h-5 w-28 rounded bg-[#1e2f42]" />
        <div className="h-10 w-full rounded bg-[#1e2f42]" />
        <div className="h-10 w-full rounded bg-[#1e2f42]" />
      </div>
    </section>
  );
}
