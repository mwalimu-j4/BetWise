import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { createAppRouter } from "./router";
import "./index.css";

const CANONICAL_HOSTS = new Set(["betixpro.com", "www.betixpro.com"]);
const CANONICAL_ORIGIN = "https://betixpro.com";

if (typeof window !== "undefined") {
  const host = window.location.hostname.toLowerCase();
  const isPreviewHost = host.endsWith(".vercel.app") && !CANONICAL_HOSTS.has(host);

  if (isPreviewHost) {
    const redirectUrl = `${CANONICAL_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(redirectUrl);
  }
}

const queryClient = new QueryClient();
const router = createAppRouter(queryClient);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
