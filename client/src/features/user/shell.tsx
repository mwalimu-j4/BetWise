import { Outlet } from "@tanstack/react-router";
import Footer from "@/components/app/footer";
import Navbar from "@/components/app/navbar";

export default function UserShell() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Outlet />
      </div>
      <Footer />
    </main>
  );
}
