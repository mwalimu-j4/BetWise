import { Search } from "lucide-react";

type SearchBarProps = {
  compact?: boolean;
};

export default function SearchBar({ compact = false }: SearchBarProps) {
  if (compact) {
    return (
      <button
        type="button"
        aria-label="Open search"
        className="grid h-9 w-9 place-items-center rounded-xl border border-admin-border bg-admin-surface/60 text-admin-text-secondary transition hover:bg-admin-hover hover:text-admin-text-primary"
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  return (
    <label className="group flex h-11 w-full items-center gap-2 rounded-2xl border border-admin-border bg-admin-surface/60 px-3 transition focus-within:border-admin-accent/45 focus-within:ring-2 focus-within:ring-admin-accent/20">
      <Search className="h-4 w-4 text-admin-text-muted transition group-focus-within:text-admin-text-secondary" />
      <input
        type="text"
        placeholder="Search matches, odds, teams..."
        className="w-full border-0 bg-transparent text-sm text-admin-text-primary outline-none placeholder:text-admin-text-muted"
      />
    </label>
  );
}
