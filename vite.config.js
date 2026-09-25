import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// Dev-only: POST /__shot?name=foo with a base64 PNG body writes .shots/foo.png,
// so the lab pages (shots.html, scene.html) can hand frames straight to disk.
const shotSink = {
  name: "shot-sink",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/__shot", (req, res) => {
      const name = new URL(req.url, "http://x").searchParams.get("name") || "shot";
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const dir = path.resolve(".shots");
        fs.mkdirSync(dir, { recursive: true });
        const b64 = body.replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync(path.join(dir, name.replace(/[^\w.-]/g, "_") + ".png"), Buffer.from(b64, "base64"));
        res.end("ok");
      });
    });
  },
};

// Vite config: enables React support (JSX) for the dev server and build.
// base "./" makes every asset path relative, so the built game runs from
// any folder or subpath — including GitHub Pages at /CrownGuard/.
export default defineConfig({
  base: "./",
  plugins: [react(), shotSink],
  // lab screenshots land in .shots/; a write there must not reload every page
  server: { watch: { ignored: ["**/.shots/**"] } },
});
