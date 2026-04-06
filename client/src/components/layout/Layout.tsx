import { Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Footer from "@/components/app/footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import MobileBottomNav from "@/components/layout/MobileBottomNav"; // <-- Added your import back!
import "@/styles/layout.css";
import { useWalletRealtime } from "@/features/user/payments/wallet";
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useWalletRealtime();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  return (
    <div className="bc-layout-root">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="bc-layout-body">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {/* Main content with proper flex layout to push footer down */}
        <main className="bc-layout-main pb-[80px] md:pb-0">
          <div className="bc-page-wrap">
            <Outlet />
          </div>
          {/* Footer positioned after content, will always be at bottom */}
          <Footer />
        </main>
      </div>

      {/* Placed at the very bottom of the app */}
      <MobileBottomNav />
    </div>
  );
}
