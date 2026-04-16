import { ArrowLeft, SidebarOpen, SidebarClose } from "lucide-react";
import { Link } from "@tanstack/react-router";

type ProfileHeaderProps = {
  avatarLetter: string;
  phoneMasked: string;
  status: "ACTIVE" | "SUSPENDED";
  expanded?: boolean;
  onToggleExpand?: () => void;
};

export default function ProfileHeader({
  avatarLetter,
  phoneMasked,
  status,
  expanded = true,
  onToggleExpand,
}: ProfileHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-[#31455f] bg-[#0f172a] px-3 py-2">
        <Link
          to="/user"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#90a2bb] hover:bg-[#0b1120]"
          aria-label="Back to home"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold text-white">Profile</h1>
        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#90a2bb] hover:bg-[#0b1120] transition-colors"
          aria-label={expanded ? "Collapse sections" : "Expand sections"}
        >
          {expanded ? <SidebarClose size={18} /> : <SidebarOpen size={18} />}
        </button>
      </div>

      <article className="rounded-2xl border border-[#31455f] bg-[#0f172a] p-5 text-center shadow-[0_8px_25px_rgba(0,0,0,0.28)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#f5c518]/50 bg-[#f5c518]/10 text-2xl font-bold text-[#f5c518]">
          {avatarLetter.toUpperCase()}
        </div>
        <p className="mt-3 text-lg font-semibold text-white">{phoneMasked}</p>
        <span
          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            status === "ACTIVE"
              ? "bg-[#22c55e]/20 text-[#86efac]"
              : "bg-[#ef4444]/20 text-[#fecaca]"
          }`}
        >
          {status === "ACTIVE" ? "Account Active" : "Account Suspended"}
        </span>
      </article>
    </header>
  );
}
