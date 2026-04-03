import { Outlet } from "@tanstack/react-router";
import Footer from "@/components/app/footer";
import Navbar from "@/components/app/navbar";

export default function UserShell() {
  return (
    <main className="user-app">
      <div className="user-app__glow user-app__glow--left" />
      <div className="user-app__glow user-app__glow--right" />
      <Navbar />
      <div className="user-main-shell">
        <Outlet />
      </div>
      <Footer />
    </main>
  );
}
