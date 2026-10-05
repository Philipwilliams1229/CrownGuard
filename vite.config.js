import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

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

// The version shown on the title screen (ui/BuildTag.jsx): the day, a build
// number that counts the commits made that day (build 1, build 2, ... and
// back to 1 tomorrow; a * when the tree has uncommitted work on top), a time
// stamp, the package version and the short hash. A build bakes it in
// (__BUILD__); the dev server answers GET /__version fresh on every page
// load, with the time of the newest edit under src/ (or the last commit, if
// later), so a refresh that picked up new work is visible.
const git = (cmd) => { try { return execSync(`git ${cmd}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };
const pkgVersion = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const buildInfo = () => {
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  return {
    version: pkgVersion,
    today: Number(git(`rev-list --count --since=${midnight.toISOString()} HEAD`)) || 0,
    committed: (Number(git("log -1 --format=%ct")) || 0) * 1000,
    hash: git("rev-parse --short HEAD"),
    dirty: git("status --porcelain").length > 0,
  };
};
const newestEdit = (dir) => {
  let t = 0;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    t = Math.max(t, f.isDirectory() ? newestEdit(full) : fs.statSync(full).mtimeMs);
  }
  return t;
};
const versionSink = {
  name: "version-sink",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/__version", (req, res) => {
      res.setHeader("content-type", "application/json");
      res.setHeader("cache-control", "no-store");
      res.end(JSON.stringify({ ...buildInfo(), edited: newestEdit("src") }));
    });
  },
};

// Vite config: enables React support (JSX) for the dev server and build.
// base "./" makes every asset path relative, so the built game runs from
// any folder or subpath — including GitHub Pages at /CrownGuard/.
export default defineConfig({
  base: "./",
  plugins: [react(), shotSink, versionSink],
  define: { __BUILD__: JSON.stringify({ ...buildInfo(), built: Date.now() }) },
  // lab screenshots land in .shots/; a write there must not reload every page
  server: { watch: { ignored: ["**/.shots/**"] } },
});
