import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "./" works whether the site is served from a custom domain root
  // or from https://<user>.github.io/<repo>/ — no editing needed.
  base: "./",
  build: { outDir: "dist", assetsDir: "assets" },
});
