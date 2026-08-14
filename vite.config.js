import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config: enables React support (JSX) for the dev server and build.
// base "./" makes every asset path relative, so the built game runs from
// any folder or subpath — including GitHub Pages at /CrownGuard/.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
