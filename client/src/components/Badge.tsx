type Variant =
  | "upcoming"
  | "live"
  | "finished"
  | "cancelled"
  | "pending"
  | "won"
  | "lost"
  | "active"
  | "suspended";

const variantMap: Record<Variant, string> = {
  upcoming: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  live: "bg-green-500/20 text-green-300 border-green-500/40 animate-pulse",
  finished: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/40",
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  won: "bg-green-500/20 text-green-300 border-green-500/40",
  lost: "bg-red-500/20 text-red-300 border-red-500/40",
  active: "bg-green-500/20 text-green-300 border-green-500/40",
  suspended: "bg-red-500/20 text-red-300 border-red-500/40",
};

export default function Badge({ value }: { value: Variant }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-wide ${variantMap[value]}`}
    >
      {value}
    </span>
  );
}
