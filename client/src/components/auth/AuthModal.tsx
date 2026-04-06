import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type AuthModalProps = {
  title: string;
  subtitle: string;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthModal({
  title,
  subtitle,
  backTo = "/user",
  backLabel = "Back",
  children,
  footer,
}: AuthModalProps) {
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with back button and badge */}
      <div className="mb-6 flex items-center justify-between">
        {backTo ? (
          <Link
            to={backTo as never}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all duration-200 hover:border-white/20 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft size={14} className="flex-shrink-0" />
            <span>{backLabel}</span>
          </Link>
        ) : (
          <div />
        )}
        <span className="rounded-full border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300 backdrop-blur-sm">
          Secure
        </span>
      </div>

      {/* Title and subtitle */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
      </div>

      {/* Form content */}
      <div className="mb-6 space-y-4">{children}</div>

      {/* Footer */}
      {footer ? (
        <div className="border-t border-white/10 pt-6">{footer}</div>
      ) : null}
    </div>
  );
}
