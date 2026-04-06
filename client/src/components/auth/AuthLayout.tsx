import { type ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Top left gradient sphere */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl opacity-70 animate-pulse" />

        {/* Bottom right gradient sphere */}
        <div
          className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl opacity-70 animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        {/* Center accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl opacity-50" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Content container with backdrop blur */}
      <div className="relative z-10 min-h-screen w-full flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Frosted glass effect backdrop */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-white/5 backdrop-blur-xl border border-white/10"
            style={{ filter: "drop-shadow(0 8px 32px rgba(31, 41, 55, 0.1))" }}
          />

          {/* Content */}
          <div className="relative z-20">{children}</div>
        </div>
      </div>
    </div>
  );
}
