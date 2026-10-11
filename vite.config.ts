import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  publicDir: "assets",
  build: { outDir: "dist/web", emptyOutDir: true },
  server: { port: 5173 },
});
