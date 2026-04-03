import { Outlet, createFileRoute } from "@tanstack/react-router";
import Navbar from "@/components/app/navbar";
import Footer from "@/components/app/footer";

export const Route = createFileRoute("/_user")({
  component: UserLayout,
});

function UserLayout() {
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
