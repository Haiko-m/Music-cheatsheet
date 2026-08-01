import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative URLs allow deployment under any GitHub repository name.
  base: "./",
  plugins: [react(), tailwindcss()],
});
