import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0", // Allow external connections
    port: 5176,       // This should match what Nginx is pointing to
    strictPort: true,
    cors: true,
    allowedHosts: ["localhost", "traffic.mybyte.store"],
    hmr: {
      clientPort: 443, // for hot reload via HTTPS
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5176,
    allowedHosts: ["localhost", "traffic.mybyte.store"],
  },
  base: "/",
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});

