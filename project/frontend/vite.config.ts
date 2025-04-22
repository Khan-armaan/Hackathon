import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0", // Allow external connections
    port: 5176, // Ensure this matches your reverse proxy target
    strictPort: true,
    cors: true,
    allowedHosts: ["hackathon", "localhost"], // Explicitly allow the domain
    hmr: {
      clientPort: 443, // Ensures hot module reload (HMR) works with HTTPS
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5176,
    allowedHosts: ["hackathon", "localhost"],
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
