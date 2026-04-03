import { Outlet } from "@tanstack/react-router";
import Footer from "@/components/app/footer";
import Navbar from "@/components/app/navbar";

export default function UserShell() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070a14] text-admin-text-primary">
      <div className="pointer-events-none absolute -left-20 -top-28 h-[340px] w-[340px] rounded-full bg-[rgba(0,229,160,0.22)] opacity-45 blur-[56px]" />
      <div className="pointer-events-none absolute -right-20 -top-28 h-[340px] w-[340px] rounded-full bg-[rgba(61,142,248,0.22)] opacity-45 blur-[56px]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(0,229,160,0.08),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(61,142,248,0.08),transparent_35%),linear-gradient(180deg,#0c1120,#070a14_55%)]"
      />
      <Navbar />
      <div className="relative z-10 mx-auto flex w-[min(1120px,calc(100%-2rem))] flex-col gap-5 py-6">
        <Outlet />
      </div>
      <Footer />
    </main>
  );
}
