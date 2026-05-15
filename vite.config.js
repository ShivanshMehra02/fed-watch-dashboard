import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vite config for Fed-Watch Dashboard
// - Dev server bound to 0.0.0.0:3000 (supervisor expects port 3000)
// - HMR routed through the public HTTPS host (port 443) used by the preview proxy
// - allowedHosts: true so the dev server accepts the *.preview.emergentagent.com hostname
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      clientPort: 443,
      protocol: "wss",
    },
    watch: {
      ignored: ["**/node_modules/**", "**/.git/**", "**/build/**", "**/dist/**"],
    },
  },
  esbuild: {
    // Allow JSX inside .js files just in case
    loader: "jsx",
    include: [/src\/.*\.jsx?$/],
  },
});
