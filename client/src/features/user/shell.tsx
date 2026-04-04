import { Outlet } from "@tanstack/react-router";
import { useState } from "react";
import Footer from "@/components/app/footer";
import Navbar from "@/components/app/navbar";
import Sidebar from "@/components/app/sidebar";

export default function UserShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  function handleSidebarToggle() {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileSidebarOpen((prev) => !prev);
      return;
    }

    setSidebarCollapsed((prev) => !prev);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapseToggle={handleSidebarToggle}
          />
        </div>

        {mobileSidebarOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-primary/45"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            />
            <div className="relative z-10 h-full w-[300px]">
              <Sidebar
                collapsed={false}
                onCollapseToggle={() => setMobileSidebarOpen(false)}
                onNavigate={() => setMobileSidebarOpen(false)}
              />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Navbar onSidebarToggle={handleSidebarToggle} />
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="mx-auto w-full max-w-[1280px] p-4 sm:p-6">
              <Outlet />
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </main>
  );
}


