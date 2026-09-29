// Font identity specimens: the REAL game in each type option (src/ui/fonts.js),
// shot on the running dev server into .shots/type_<id>_<screen>.png.
//
//   node scripts/type-shots.mjs                    every option, every screen
//   node scripts/type-shots.mjs keep letter        some options
//   node scripts/type-shots.mjs --only home,battle current
//   node scripts/type-shots.mjs --base http://127.0.0.1:5174 --prefix typeB_ current
//                        (--base: the game from another server, e.g. a static
//                        build that teammates' saves can't reload mid-shot:
//                        NODE_ENV=development npx vite build --mode development
//                        keeps window.__g, which the battle flow needs; the
//                        lab page still comes from --lab, the dev server)
//   node scripts/type-shots.mjs --dump <dir> current   also write each screen's
//                                                  computed fonts as JSON (to diff two servers)
//   node scripts/type-shots.mjs --pairs [--faces "VT323,Tiny5"]   the digit pair
//                                                  test (type-lab ?distinct) at DPR 1 and 2
//
// Screens: home (title, 1133x744), map (campaign map), battle (Free Play, a
// hall placed and its card open), phone (the same card at 844x390), council
// (War Council, HEROES), guide (Field Guide, a hall's entry), sheet
// (type-lab.html?opt=<id>, the specimen sheet).
// Each is shot at the density of the device it stands for: 1133x744 is an
// iPad mini (DPR 2), 844x390 an iPhone on its side (DPR 3). The worst case, a
// 1x desktop screen, is shot too for the screens full of digits (--worst,
// default battle,phone,sheet), as type_<id>_<screen>_dpr1.png.
// Chromium runs with --font-render-hinting=none: Linux's default hinting
// snaps every glyph's advance to a whole pixel (a Mac or an iPad never does),
// which breaks the spacing of the vector faces and flatters pixel faces at
// odd sizes. This container has no Verdana: "current" shows DejaVu Sans there.
// Google Fonts go through curl (headless Chromium behind the proxy can't
// fetch them), exactly as scripts/shoot.mjs does.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TYPE_IDS } from "../src/ui/fonts.js";

const load = async () => {
  try { return await import("playwright"); } catch { /* not a project dependency */ }
  for (const root of ["/opt/node22/lib/node_modules/", "/usr/lib/node_modules/", "/usr/local/lib/node_modules/"]) {
    try { return createRequire(root)("playwright"); } catch { /* try the next */ }
  }
  throw new Error("playwright not found — install it globally");
};
const { chromium } = await load();

// ---- arguments ----
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); if (i < 0) return dflt; const v = args[i + 1]; args.splice(i, 2); return v; };
const base = opt("--base", process.env.CG_DEV || "http://127.0.0.1:5173");
// the lab page (sheets, pairs) is served only by the dev server, even when
// --base points the game shots at a static build
const lab = opt("--lab", process.env.CG_DEV || "http://127.0.0.1:5173");
const prefix = opt("--prefix", "type_");
const only = opt("--only", "home,map,battle,phone,council,guide,sheet").split(",");
const dump = opt("--dump", null);
const worst = opt("--worst", "battle,phone,sheet").split(",").filter((w) => w && w !== "none");
const faces = opt("--faces", "");
const pairs = args.includes("--pairs");
if (pairs) args.splice(args.indexOf("--pairs"), 1);
const ids = args.length ? args : TYPE_IDS;
const OUT = path.resolve(".shots");
fs.mkdirSync(OUT, { recursive: true });
if (dump) fs.mkdirSync(dump, { recursive: true });

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const cache = new Map();
const browser = await chromium.launch({ args: ["--font-render-hinting=none"] });

async function context(w, h, dpr = 1) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, ignoreHTTPSErrors: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, async (route) => {
    const u = route.request().url();
    try {
      const body = cache.get(u) || execFileSync("curl", ["-sSL", "-A", UA, u]);
      cache.set(u, body);
      const css = u.includes("googleapis");
      await route.fulfill({ status: 200, contentType: css ? "text/css" : "font/woff2", body, headers: { "access-control-allow-origin": "*" } });
    } catch { await route.abort(); }
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`  pageerror: ${e.message}`));
  return { ctx, page };
}

// open the game in an option and wait until its faces are in and the page shows
async function open(page, id) {
  await page.goto(`${base}/?type=${id}`, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const r = document.getElementById("root");
    return r && r.childElementCount > 0 && getComputedStyle(r).visibility !== "hidden";
  }, null, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);   // the vista fades in
}
const clickText = async (page, text) => {
  // the exact label first (START, not "Last Stand"); else any button holding it
  const exact = page.getByRole("button", { name: text, exact: true });
  const b = (await exact.count()) ? exact.first() : page.getByRole("button", { name: text }).first();
  await b.click({ timeout: 8000 });
};
const shot = async (page, id, name) => {
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(OUT, `${prefix}${id}_${name}.png`);
  await page.screenshot({ path: file });
  if (dump) {
    const fonts = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("body *")) {
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!own) continue;
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        out.push([el.textContent.trim().slice(0, 40), cs.fontFamily, cs.fontSize, cs.fontWeight, cs.fontSizeAdjust, cs.letterSpacing, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]);
      }
      return out;
    });
    fs.writeFileSync(path.join(dump, `${id}_${name}.json`), JSON.stringify(fonts, null, 0).replace(/\],\[/g, "],\n["));
  }
  console.log(`  ${file}`);
};

// Free Play: START, place an Archer Tower on open grass, open its card (the
// board is the 3:2 canvas; at DPR 2 a backdrop canvas is as wide)
async function battle(page) {
  await clickText(page, "FREE PLAY");
  await page.waitForTimeout(800);
  await clickText(page, "START");
  await page.waitForFunction(() => window.__g && window.__g.towers, null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  const tries = [];
  for (let y = 120; y <= 480; y += 40) for (let x = 120; x <= 660; x += 40) tries.push([x, y]);
  for (const [x, y] of tries) {
    const at = await page.evaluate(([bx, by]) => {
      const g = window.__g, cv = [...document.querySelectorAll("canvas")].find((c) => c.width >= 1600 && Math.abs(c.width / c.height - 1.5) < 0.01);
      if (!g || !cv) return null;
      const r = cv.getBoundingClientRect();
      const sx = r.left + (bx / 840) * r.width, sy = r.top + (by / 560) * r.height;
      if (document.elementFromPoint(sx, sy) !== cv) return null;
      g.buildMode = "archer";
      return [sx, sy];
    }, [x, y]);
    if (!at) continue;
    await page.mouse.click(at[0], at[1]);
    await page.waitForTimeout(120);
    const n = await page.evaluate(() => window.__g.towers.length);
    if (process.env.TS_DEBUG) console.log(`    try ${x},${y}: ${n} halls`);
    if (n > 0) break;
  }
  await page.evaluate(() => { if (window.__g) window.__g.buildMode = null; });
  await page.waitForTimeout(2600);   // the crew builds it
  const t = await page.evaluate(() => {
    const g = window.__g, t = g.towers[0], cv = [...document.querySelectorAll("canvas")].find((c) => c.width >= 1600 && Math.abs(c.width / c.height - 1.5) < 0.01);
    if (!t || !cv) return null;
    const r = cv.getBoundingClientRect();
    return [r.left + (t.x / 840) * r.width, r.top + (t.y / 560) * r.height];
  });
  if (!t) throw new Error("no hall placed");
  await page.mouse.click(t[0], t[1]);
  await page.waitForTimeout(700);
}

// each screen: a fresh page in the option, the steps to reach it, the shot.
// A teammate's save can reload the page mid-flow, so each gets two tries.
const MENU = {
  home: async () => {},
  guide: async (page) => {
    await clickText(page, "FIELD GUIDE");
    await page.waitForTimeout(700);
    // the first hall's entry
    await page.evaluate(() => {
      const grid = [...document.querySelectorAll("button")].filter((b) => b.querySelector("canvas") && b.closest("[style*='position: fixed']"));
      grid[0]?.click();
    });
    await page.waitForTimeout(800);
  },
  council: async (page) => {
    await clickText(page, "WAR COUNCIL");
    await page.waitForTimeout(600);
    await clickText(page, "HEROES");
    await page.waitForTimeout(800);
  },
  map: async (page) => {
    await clickText(page, "NEW CAMPAIGN");
    await page.waitForTimeout(3000);
  },
  battle: battle,
  phone: battle,
};
const SIZE = { phone: [844, 390] };
const DPR = { phone: 3 };

// the pair test, printed: every option's num and body faces (and --faces
// candidates) as the page draws them, at DPR 1 and 2, the pairs under 0.20 named
if (pairs) {
  for (const dpr of [1, 2]) {
    const { ctx, page } = await context(1400, 2400, dpr);
    try {
      const qs = new URLSearchParams({ distinct: "1", ...(faces ? { faces } : {}), ...(args.length ? { opts: ids.join(",") } : {}) });
      await page.goto(`${lab}/type-lab.html?${qs}`, { waitUntil: "load" });
      await page.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 30000 });
      await page.waitForTimeout(300);
      const png = await (await page.$("#out > div")).screenshot();
      const r = await page.evaluate(([u, d]) => window.scoreGlyphs(u, d), [`data:image/png;base64,${png.toString("base64")}`, dpr]);
      console.log(`\nDPR ${dpr} (unhinted): worst pair per size, then every pair under 0.20`);
      for (const [name, sc] of Object.entries(r.data)) {
        const worstOf = sc.map((row) => Math.min(...row).toFixed(2));
        const bad = sc.flatMap((row, si) => row.map((v, pi) => (v < 0.2 ? `${r.pairs[pi]}@${r.sizes[si]}:${v.toFixed(2)}` : null)).filter(Boolean));
        console.log(`  ${name.padEnd(26)} ${r.sizes.map((z, i) => `${z}px ${worstOf[i]}`).join("  ")}  ${bad.join(" ")}`);
      }
      await page.screenshot({ path: path.join(OUT, `${prefix}pairs_dpr${dpr}.png`), fullPage: true });
    } catch (e) { console.log(`  FAILED (pairs dpr ${dpr}): ${e.message.split("\n")[0]}`); }
    finally { await ctx.close(); }
  }
  await browser.close();
  process.exit(0);
}

const jobs = [];
for (const id of ids) {
  for (const name of only) jobs.push([id, name, DPR[name] || 2, ""]);
  for (const name of worst) jobs.push([id, name, 1, "_dpr1"]);
}
let last = null;
for (const [id, name, dpr, suffix] of jobs) {
  if (id !== last) { console.log(`${id}`); last = id; }
  if (name === "sheet") {
    for (let k = 0; k < 3; k++) {
      const { ctx, page } = await context(1150, 800, dpr);
      try {
        await page.goto(`${lab}/type-lab.html?opt=${id}`, { waitUntil: "load" });
        await page.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 20000 });
        await page.waitForTimeout(300);
        const file = path.join(OUT, `${prefix}${id}_sheet${suffix}.png`);
        await (await page.$(".sheet")).screenshot({ path: file });
        console.log(`  ${file}`);
        k = 3;
      } catch (e) { console.log(`  ${k < 2 ? "retrying" : "FAILED"} (${id} sheet${suffix}): ${e.message.split("\n")[0]}`); }
      finally { await ctx.close(); }
    }
    continue;
  }
  const steps = MENU[name];
  if (!steps) { console.log(`  no screen "${name}"`); continue; }
  const [w, h] = SIZE[name] || [1133, 744];
  for (let k = 0; k < 3; k++) {
    const { ctx, page } = await context(w, h, dpr);
    try {
      await open(page, id);
      await steps(page);
      await shot(page, id, name + suffix);
      k = 3;
    } catch (e) {
      console.log(`  ${k < 2 ? "retrying" : "FAILED"} (${id} ${name}${suffix}): ${e.message.split("\n")[0]}`);
    } finally { await ctx.close(); }
  }
}
await browser.close();
