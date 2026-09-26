// Headless lab pages, for sessions with no browser pane (cloud containers).
// Opens a page on the running dev server in headless Chromium, waits, and
// optionally evaluates a JS expression there (awaited; its value is printed).
// The lab pages save their PNGs into .shots/ through the dev server.
//
//   node scripts/shoot.mjs "/rigshot.html?types=levy&tag=x&scale=3"
//   node scripts/shoot.mjs /shots.html "snap('kr', 'kingsroad', [['levy', 0.3, 0]])"
//   node scripts/shoot.mjs /shots.html "..." 4000        (wait ms, default 2500)
//
// Console errors and page errors are printed, so a broken module shows up.
import { createRequire } from "node:module";

const load = async () => {
  try { return await import("playwright"); } catch { /* not a project dependency */ }
  for (const root of ["/opt/node22/lib/node_modules/", "/usr/lib/node_modules/", "/usr/local/lib/node_modules/"]) {
    try { return createRequire(root)("playwright"); } catch { /* try the next */ }
  }
  throw new Error("playwright not found — install it globally or run the lab page in a browser");
};
const { chromium } = await load();
const [url, js, wait] = process.argv.slice(2);
const base = process.env.CG_DEV || "http://127.0.0.1:5173";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
p.on("console", (m) => { if (m.type() === "error") console.log("console.error:", m.text()); });
p.on("pageerror", (e) => console.log("pageerror:", e.message));
await p.goto(url.startsWith("http") ? url : base + url, { waitUntil: "load" });
await p.waitForTimeout(Number(wait) || 2500);
if (js) console.log(await p.evaluate(js));
await b.close();
