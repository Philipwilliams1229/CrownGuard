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
//   node scripts/type-shots.mjs --view 1400x1000@1 --only home,battle tidy2
//                        every screen at one size and density instead (a 1x
//                        desktop here), saved as <screen>_1400x1000_dpr1.png
//   node scripts/type-shots.mjs --dump <dir> current   also write each screen's
//                                                  computed fonts as JSON (to diff two servers)
//   node scripts/type-shots.mjs --pairs [--faces "VT323,Tiny5"]   the digit pair
//                                                  test (type-lab ?distinct) at DPR 1 and 2
//   node scripts/type-shots.mjs --words pair tidy2 tidy3   the owner's words
//                        (type-lab ?words: TWIN ARCHERS, WEAK, WAVE, WAR
//                        COUNCIL...) in each option, at DPR 1 (a desktop),
//                        2 (an iPad) and 3 (a phone: its 0.72 column), as
//                        <prefix>words_dpr<n>.png, and the DPR 1 shot blown
//                        up x3 pixel for pixel (<prefix>words_dpr1_x3.png)
//   node scripts/type-shots.mjs --cards pair tidy2  the tower card's size, hall by
//                        hall, on a phone, an iPad and a tall desktop (every
//                        stage of a hall is laid out in the card, so one size
//                        per hall is the card's size in every stage); the first
//                        option is the reference, and each stage's own height
//                        is printed where a card differs. --kinds archer,wizard
//                        --views phone,ipad,desk narrow it
//
// Screens: home (title, 1133x744), map (campaign map), battle (Free Play, a
// hall placed and its card open), phone (the same card at 844x390), card and
// cardphone (that card alone, not in the default set), council
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
const view = /^(\d+)x(\d+)@([\d.]+)$/.exec(opt("--view", "") || "");
const pairs = args.includes("--pairs");
if (pairs) args.splice(args.indexOf("--pairs"), 1);
const cards = args.includes("--cards");
if (cards) args.splice(args.indexOf("--cards"), 1);
const words = args.includes("--words");
if (words) args.splice(args.indexOf("--words"), 1);
const kindsArg = opt("--kinds", "");
const viewsArg = opt("--views", "phone,ipad,desk");
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
  if (name.startsWith("card")) await (await page.$(".cg-pop")).screenshot({ path: file });
  else await page.screenshot({ path: file });
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
  // the tower card alone (an element shot of the battle's open card), on an
  // iPad and on a phone: --only card,cardphone --worst card for its 1x too
  card: battle,
  cardphone: battle,
};
const SIZE = { phone: [844, 390], cardphone: [844, 390] };
const DPR = { phone: 3, cardphone: 3 };

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

// the owner's words, option by option, at the three densities
if (words) {
  for (const dpr of [1, 2, 3]) {
    for (let k = 0; k < 3; k++) {
      const { ctx, page } = await context(1400, 900, dpr);
      try {
        await page.goto(`${lab}/type-lab.html?words=${ids.join(",")}`, { waitUntil: "load" });
        await page.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 30000 });
        await page.waitForTimeout(300);
        const file = path.join(OUT, `${prefix}words_dpr${dpr}.png`);
        const png = await (await page.$("#out")).screenshot({ path: file });
        console.log(`  ${file}`);
        if (dpr === 1) {
          // every device pixel as a 3x3 block, for reading a 1x screen's letters
          const big = path.join(OUT, `${prefix}words_dpr1_x3.png`);
          const { w, h } = await page.evaluate(async (u) => { const i = new Image(); i.src = u; await i.decode(); return { w: i.width, h: i.height }; }, `data:image/png;base64,${png.toString("base64")}`);
          await page.setViewportSize({ width: w * 3, height: h * 3 });
          await page.setContent(`<body style="margin:0;background:#17121b"><img id="z" src="data:image/png;base64,${png.toString("base64")}" style="display:block;width:${w * 3}px;height:${h * 3}px;image-rendering:pixelated"></body>`);
          await page.evaluate(() => document.getElementById("z").decode());
          await (await page.$("#z")).screenshot({ path: big });
          console.log(`  ${big}`);
        }
        k = 3;
      } catch (e) { console.log(`  ${k < 2 ? "retrying" : "FAILED"} (words dpr ${dpr}): ${e.message.split("\n")[0]}`); }
      finally { await ctx.close(); }
    }
  }
  await browser.close();
  process.exit(0);
}

// the card test: in Free Play, each hall in turn is placed on open grass (the
// game paused, gold topped up), selected, and its card measured in layout
// pixels (the card's own design size, before the HUD's scale); then it is
// taken off the board so the next one can stand in the same spot
if (cards) {
  const { TOWERS } = await import("../src/data/towers.js");
  // (the floating halls last: they may borrow a spot a landed hall found)
  const kinds = (kindsArg ? kindsArg.split(",") : Object.keys(TOWERS)).sort((a, b) => !!TOWERS[a]?.water - !!TOWERS[b]?.water);
  // (layout px don't depend on the density: every view is measured at 1x)
  const VIEWS = { phone: [844, 390, 1], ipad: [1133, 744, 1], desk: [1600, 1200, 1] };
  const res = {};
  for (const view of viewsArg.split(",")) {
    const [w, h, dpr] = VIEWS[view];
    for (const id of ids) {
      for (let k = 0; k < 3; k++) {
        const { ctx, page } = await context(w, h, dpr);
        try {
          await open(page, id);
          await clickText(page, "FREE PLAY");
          await page.waitForTimeout(800);
          await clickText(page, "START");
          await page.waitForFunction(() => window.__g && window.__g.towers, null, { timeout: 15000 });
          await page.waitForTimeout(800);
          const got = {};
          // open grass on the board (screen px), the spots that took a hall first
          const spots = await page.evaluate(() => {
            const cv = [...document.querySelectorAll("canvas")].find((c) => Math.abs(c.width / c.height - 1.5) < 0.01 && c.width >= 840);
            const r = cv.getBoundingClientRect(), out = [];
            for (let y = 100; y <= 500; y += 25) for (let x = 100; x <= 700; x += 25) {
              const sx = r.left + (x / 840) * r.width, sy = r.top + (y / 560) * r.height;
              if (document.elementFromPoint(sx, sy) === cv) out.push([sx, sy]);
            }
            return out;
          });
          const good = [];
          for (const kind of kinds) {
            let placed = false;
            for (const at of [...good, ...spots.filter((sp) => !good.includes(sp))]) {
              // (a paused game takes no taps: it runs for the tap, then stops)
              await page.evaluate((kd) => { const g = window.__g; g.paused = false; g.gold = 1e6; g.selectedId = null; g.buildMode = kd; }, kind);
              await page.mouse.click(at[0], at[1]);
              if (await page.evaluate(() => { const g = window.__g; g.paused = true; return g.towers.length > 0; })) {
                placed = true;
                if (!good.includes(at)) good.unshift(at);
                break;
              }
            }
            // a hall with nowhere to stand on this map (the River Watch needs
            // water): an Archer Tower stands in for it and takes its kind, the
            // game paused, just for its card
            if (!placed && good.length) {
              await page.evaluate(() => { const g = window.__g; g.paused = false; g.buildMode = "archer"; });
              await page.mouse.click(good[0][0], good[0][1]);
              placed = await page.evaluate((kd) => { const g = window.__g; g.paused = true; if (!g.towers.length) return false; g.towers[0].kind = kd; return true; }, kind);
            }
            await page.evaluate(() => { window.__g.buildMode = null; });
            if (!placed) { got[kind] = null; continue; }
            await page.evaluate(() => { const g = window.__g; g.selectedId = g.towers[0].id; });
            await page.waitForTimeout(350);
            got[kind] = await page.evaluate(() => {
              const fr = document.querySelector(".cg-pop > .cg-frame");
              if (!fr) return null;
              // each stage's own height: its stack laid out top-aligned a moment
              const stacks = [...fr.querySelectorAll("div")].filter((d) => getComputedStyle(d).display === "grid" && d.children.length > 1 && [...d.children].every((c) => c.getAttribute("aria-hidden") !== null || c.style.visibility === "visible" || c.style.visibility === ""));
              const own = stacks.map((st) => [...st.children].map((c) => { const was = c.style.alignSelf; c.style.alignSelf = "start"; const hh = c.offsetHeight; c.style.alignSelf = was; return hh; }));
              return { w: fr.offsetWidth, h: fr.scrollHeight, cols: fr.querySelector(".cg-card-two") ? 2 : 1, stages: own };
            });
            await page.evaluate(() => { const g = window.__g; g.selectedId = null; g.towers.length = 0; });
            await page.waitForTimeout(60);
          }
          res[`${view}|${id}`] = got;
          k = 3;
        } catch (e) { console.log(`  ${k < 2 ? "retrying" : "FAILED"} (${id} cards ${view}): ${e.message.split("\n")[0]}`); }
        finally { await ctx.close(); }
      }
    }
    // the table: each hall's card, W x H, in every option (the first is the reference)
    const ref = res[`${view}|${ids[0]}`] || {};
    console.log(`\n${view} (${w}x${h}): tower card, layout px (width x height), ${ids.join(" / ")}`);
    let same = 0, all = 0;
    for (const kind of kinds) {
      const cells = ids.map((id) => res[`${view}|${id}`]?.[kind]);
      const txt = cells.map((c) => (c ? `${c.w}x${c.h}` : "-"));
      const diff = cells.some((c) => c && ref[kind] && (c.w !== ref[kind].w || c.h !== ref[kind].h));
      all++; if (!diff) same++;
      console.log(`  ${kind.padEnd(11)} ${txt.map((t) => t.padEnd(9)).join(" ")} ${cells[0]?.cols || ""}col${diff ? "  DIFFERS" : ""}`);
      if (diff) cells.forEach((c, i) => c && console.log(`      ${ids[i].padEnd(8)} stages ${c.stages.map((st) => st.join(",")).join(" | ")}`));
    }
    console.log(`  ${same}/${all} halls the same size as ${ids[0]}`);
  }
  await browser.close();
  process.exit(0);
}

const jobs = [];
for (const id of ids) {
  if (view) { for (const name of only) jobs.push([id, name, Number(view[3]), `_${view[1]}x${view[2]}_dpr${view[3]}`]); continue; }
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
  const [w, h] = view ? [Number(view[1]), Number(view[2])] : SIZE[name] || [1133, 744];
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
