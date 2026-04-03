import { Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

export default function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  );
}
