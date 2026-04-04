import { Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Footer from "@/components/app/footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import MobileBottomNav from "@/components/layout/MobileBottomNav"; // NEW: Importing your separate file!
import "@/styles/layout.css";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        {/* Added bottom padding so the mobile nav doesn't cover content */}
        <main className="bc-layout-main pb-[80px] md:pb-0">
          <div className="bc-page-wrap">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
      
      {/* Placed at the very bottom of the app */}
      <MobileBottomNav />
      
    </div>
  );
}