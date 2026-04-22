import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("/react/") || id.includes("/react-dom/")) {
            return "vendor-react";
          }

          if (id.includes("/react-router-dom/")) {
            return "vendor-router";
          }

          if (id.includes("/@tanstack/react-query/")) {
            return "vendor-query";
          }

          if (
            id.includes("/@radix-ui/") ||
            id.includes("/lucide-react/") ||
            id.includes("/radix-ui/")
          ) {
            return "vendor-ui";
          }

          if (id.includes("/recharts/")) {
            return "vendor-charts";
          }

          if (id.includes("/axios/")) {
            return "vendor-http";
          }

          if (id.includes("/zustand/")) {
            return "vendor-state";
          }

          if (id.includes("/date-fns/")) {
            return "vendor-date";
          }
        },
      },
    },
  },
});
