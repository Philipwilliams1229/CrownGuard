import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config: enables React support (JSX) for the dev server and build.
export default defineConfig({
  plugins: [react()],
});
