import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/toaster";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <main className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
          <header className="flex items-center gap-4">
            <Link to="/" className="font-semibold hover:text-zinc-600">
              BetCenic
            </Link>
            <nav className="flex items-center gap-3 text-sm text-zinc-600">
              <Link to="/login" className="hover:text-zinc-900">
                Login
              </Link>
              <Link to="/register" className="hover:text-zinc-900">
                Register
              </Link>
              <Link to="/payments" className="hover:text-zinc-900">
                Payments
              </Link>
            </nav>
          </header>
          <Outlet />
        </div>
      </main>
      <Toaster />
    </>
  );
}
