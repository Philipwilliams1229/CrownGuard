// ============ THE TOWER-BUILDINGS CONCEPT SHEET (round 1, 2026-11-13) ============
// For the owner: the halls (the buildings, not their crews) redrawn in the new
// sprite style, three halls in three treatments beside today's, at board size
// and enlarged, with the new crew figures standing on them, everything that
// would move in the game moving. Nothing here is in the game: the concept halls
// are src/render/pix/hall-*.js (hall-kit.js), today's come from a strip saved by
// hall-now.html. Runs from the dev server (hall-concepts.html) and, bundled by
// scripts/build-hall-concepts.mjs, as one self-contained page.
import { toCanvas } from "../src/render/pix/pix.js";
import { bakeFrame } from "../src/render/pix/bake.js";
import * as kit from "../src/render/pix/hall-kit.js";
import * as archerHall from "../src/render/pix/hall-archer.js";
import * as spireHall from "../src/render/pix/hall-spire.js";
import * as catapultHall from "../src/render/pix/hall-catapult.js";
import * as bowman from "../src/render/pix/fig-bowman.js";
import * as mage from "../src/render/pix/fig-mage.js";
import * as engineer from "../src/render/pix/fig-engineer.js";

const FIGS = {
  bowman: { ...bowman, NAME: "hc-bowman", atk: "shoot", rest: 1500 },
  mage: { ...mage, NAME: "hc-mage", atk: "cast", rest: 1700 },
  engineer: { ...engineer, NAME: "hc-engineer", idle: "winchIdle", atk: "winchRap", rest: 3400 },
};
const HALLS = { archer: archerHall, spire: spireHall, catapult: catapultHall };
const NOW = window.HALL_NOW_META, nowImg = new Image();
const nowReady = new Promise((ok) => { nowImg.onload = ok; nowImg.onerror = ok; });
nowImg.src = window.HALL_NOW_SRC;

const GRASS = "#82b256", GRASS_D = "#76a54e", GRASS_L = "#8fbd60", ROAD = "#c9a56e", ROAD_D = "#b08a58", ROAD_L = "#d6b680", SHADOW = "rgba(42,28,44,0.30)";
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const pxEllipse = (ctx, cx, cy, rx, ry, style) => {
  ctx.fillStyle = style;
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    const k = 1 - (dy / (ry + 0.25)) ** 2; if (k <= 0) continue;
    const w = Math.round(rx * Math.sqrt(k));
    ctx.fillRect(Math.round(cx) - w, Math.round(cy) + dy, w * 2 + 1, 1);
  }
};
const turf = (ctx, w, h, seed = 1, road = null) => {
  ctx.fillStyle = GRASS; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 900; i++) { const x = rnd(i + seed) * w, y = rnd(i * 3 + seed) * h; pxEllipse(ctx, x, y, 8 + rnd(i * 7) * 12, 3 + rnd(i * 5) * 3, i % 2 ? GRASS_D : GRASS_L); }
  if (road) {
    const [y0, y1] = road;
    ctx.fillStyle = ROAD; ctx.fillRect(0, y0, w, y1 - y0);
    for (let x = 0; x < w; x++) { const a = Math.round(Math.sin(x * 0.11 + seed) * 1.2 + rnd(x + seed * 9) * 1.4), b = Math.round(Math.sin(x * 0.09 + 2) * 1.2 + rnd(x + 77) * 1.4); ctx.fillStyle = GRASS_D; ctx.fillRect(x, y0 - 1, 1, 1 + a); ctx.fillStyle = ROAD_D; ctx.fillRect(x, y0 + a, 1, 1); ctx.fillStyle = ROAD_L; ctx.fillRect(x, y1 - 2 - b, 1, 1); ctx.fillStyle = GRASS; ctx.fillRect(x, y1 - 1 - b, 1, 2 + b); }
    for (let i = 0; i < w / 6; i++) { const x = rnd(i * 13 + seed) * w, y = y0 + 4 + rnd(i * 17) * (y1 - y0 - 9); ctx.fillStyle = i % 3 ? ROAD_D : ROAD_L; ctx.fillRect(x | 0, y | 0, 1 + (i % 4 === 0), 1); }
  }
  for (let i = 0; i < (w * h) / 420; i++) { const x = (rnd(i * 5 + seed) * w) | 0, y = (rnd(i * 11 + seed) * h) | 0; if (road && y > road[0] - 3 && y < road[1] + 2) continue; ctx.fillStyle = i % 3 ? "#5f9040" : "#a4cc6c"; ctx.fillRect(x, y, 1, 2); ctx.fillRect(x + 1, y + 1, 1, 1); }
};
const ground = (w, h, seed, road) => { const g = el("canvas"); g.width = w; g.height = h; turf(g.getContext("2d"), w, h, seed, road); return g; };

// ---- a concept hall, baked once: canvases for its two pictures, its light, its live frames ----
const BAKED = new Map(), FRAMES = new Map();
const sprite = (img) => ({ cv: toCanvas(img), ox: img.ox, oy: img.oy });
const framesOf = (key, make) => { let f = FRAMES.get(key); if (!f) FRAMES.set(key, (f = make().map(sprite))); return f; };
const hallOf = (name, level, style) => {
  const key = `${name}|${level}|${style}`;
  let H = BAKED.get(key);
  if (H) return H;
  const mod = HALLS[name], b = kit.bakeHall(mod.BOX, mod.build({ level, style }));
  H = {
    box: mod.BOX, spec: b.spec, back: toCanvas(b.back), front: b.front ? toCanvas(b.front) : null,
    glows: b.glows.map((g) => ({ key: g.key, col: g.col, back: toCanvas(g.back), front: g.front ? toCanvas(g.front) : null })),
    shadow: b.spec.shadow ? kit.groundShadow(b.spec.shadow.rx, b.spec.shadow.ry, b.spec.shadow) : [],
    dy: mod.SHEET_DY || 0,          // a hall drawn from the game's anchor, not from its base (hall-archer.js)
  };
  BAKED.set(key, H);
  return H;
};
const FLICK = [1, 0.84, 0.94, 0.78, 1, 0.9, 0.74, 0.96];

// which frame of which clip a crew figure shows at time t (ms)
const crewPick = (fig, c, t, mode) => {
  const C = fig.CLIPS, idle = C[c.clip || fig.idle || "idle"], atk = C[fig.atk];
  const loop = (cl, name, tt) => [name, Math.floor(((tt % cl.ms) / cl.ms) * cl.n) % cl.n];
  if (mode === "rest" || !atk) return loop(idle, c.clip || fig.idle || "idle", t);
  const T = atk.ms + fig.rest, u = t % T;
  if (u < atk.ms) return [fig.atk, Math.min(atk.n - 1, Math.floor((u / atk.ms) * atk.n))];
  return loop(idle, c.clip || fig.idle || "idle", u - atk.ms);
};
const line1 = (ctx, x0, y0, x1, y1, col) => { ctx.fillStyle = col; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0 || 1; for (let s = 0; s <= n; s++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * s) / n), Math.round(y0 + ((y1 - y0) * s) / n), 1, 1); };

// Draw a concept hall with its base centre at (x, y), everything live at time t (ms).
//   o.mode   "work" (the crew shoot / cast now and then) | "rest"
//   o.light  false: no torch or spell light        o.crew false: the building alone
//   o.frame  { clip, f }: hold every crew figure on one frame (the film strip)
const drawHall = (ctx, H, x, y, t, o = {}) => {
  const B = H.box, sp = H.spec, lit = o.light !== false;
  y += H.dy;
  ctx.fillStyle = SHADOW; for (const [yy, x0, x1] of H.shadow) ctx.fillRect(x + x0, y + yy, x1 - x0 + 1, 1);
  ctx.drawImage(H.back, x - B.ox, y - B.oy);
  const live = (layer) => {
    for (const l of sp.live || []) {
      if ((l.layer || "back") !== layer) continue;
      let fr;
      if (l.kind === "pennant") { const fs = framesOf(`pen|${l.col}|${l.len}|${l.pole}|${l.h || 0}`, () => kit.pennantFrames(l.col, l)); fr = fs[Math.floor(t / 110 + (l.x & 7)) % fs.length]; }
      else if (l.kind === "flame") { const fs = framesOf("flame", () => kit.flameFrames(l)); fr = fs[Math.floor(t / 90) % fs.length]; }
      else if (l.kind === "spark") { if (!lit) continue; const fs = framesOf(`spark|${l.col}`, () => kit.sparkFrames(l.col)); fr = fs[Math.floor(t / 140 + (l.ph || 0)) % fs.length]; }
      else if (l.kind === "book") { fr = framesOf("book", () => kit.bookFrames())[0]; ctx.drawImage(fr.cv, x + l.x - fr.ox, y + l.y - fr.oy + Math.round(Math.sin(t / 520) * 1.6)); continue; }
      if (fr) ctx.drawImage(fr.cv, x + l.x - fr.ox, y + l.y - fr.oy);
    }
  };
  live("back");
  // the crew's frames first: the mage's glow sets how strongly his orb lights the stone
  const crew = o.crew === false ? [] : (sp.crew || []).map((c, i) => {
    const fig = FIGS[c.fig], [clip, f] = o.frame ? [o.frame.clip, o.frame.f] : crewPick(fig, c, t + i * 830, o.mode || "work");
    return { c, fig, rec: bakeFrame(fig, clip, f, { flip: c.dir < 0, variant: c.variant || "" }) };
  });
  const orbK = crew.reduce((k, m) => Math.max(k, m.c.orb && m.rec.light ? m.rec.light.k : 0), 0);
  const K = { torch: FLICK[Math.floor(t / 80) % 8], orb: Math.round(clamp(0.25 + orbK * 0.85, 0, 1) * 5) / 5 };
  const glows = (side) => { if (lit) for (const g of H.glows) if (g[side]) { ctx.globalAlpha = K[g.key] ?? 1; ctx.drawImage(g[side], x - B.ox, y - B.oy); ctx.globalAlpha = 1; } };
  glows("back");
  for (const { c, fig, rec } of [...crew].sort((a, b) => a.c.y - b.c.y)) {
    const fx = x + c.x, fy = y + c.y, tip = rec.marks && rec.marks.tip, grip = rec.marks && rec.marks.grip;
    if (c.crank && grip) line1(ctx, x + c.crank[0], y + c.crank[1], fx + c.dir * grip[0], fy + grip[1], "#4a4c56");
    if (c.orb && tip && lit) pxEllipse(ctx, fx + c.dir * tip[0], fy + tip[1], 6 + orbK * 5, 6 + orbK * 5, hexA(c.orb, 0.16 + 0.1 * orbK));
    ctx.save(); ctx.translate(fx, fy); if (c.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(rec.cv, -rec.ox, -rec.oy);
    if (lit && rec.glow) ctx.drawImage(rec.glow, -rec.ox, -rec.oy);
    ctx.restore();
    if (c.orb && tip) { const fs = framesOf(`orb|${c.orb}`, () => kit.orbFrames(c.orb)), fr = fs[Math.floor(t / 120) % fs.length]; ctx.drawImage(fr.cv, Math.round(fx + c.dir * tip[0]) - fr.ox, Math.round(fy + tip[1]) - fr.oy); }
  }
  if (H.front) ctx.drawImage(H.front, x - B.ox, y - B.oy);
  glows("front");
  live("front");
};
// today's hall from the saved strip, its base centre at (x, y)
const drawNow = (ctx, key, x, y) => { const i = NOW.cells[key]; if (i == null || !nowImg.width) return; ctx.drawImage(nowImg, i * NOW.cw, 0, NOW.cw, NOW.ch, Math.round(x - NOW.ax), Math.round(y - NOW.ay), NOW.cw, NOW.ch); };

// ---- canvases that keep whole-pixel zoom --------------------------------------
const LIVE = [], FITS = [];
addEventListener("resize", () => FITS.forEach((f) => f()));
const view = (host, w, h, paint, o = {}) => {
  const cv = el("canvas", "px"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
  host.append(cv);
  const fit = () => { const room = (o.room ? o.room() : host.clientWidth) || w; const z = Math.max(o.min ?? 1, Math.min(o.max ?? 6, Math.floor(room / w))); cv.style.width = w * z + "px"; cv.style.height = h * z + "px"; };
  FITS.push(fit); fit();
  LIVE.push({ cv, ctx, paint, still: o.still, done: false });
  return cv;
};
const seg = (host, names, on, cur) => {
  const box = el("div", "seg");
  names.forEach(([id, label]) => { const b = el("button", id === cur ? "on" : "", label); b.type = "button"; b.onclick = () => { [...box.children].forEach((c) => c.classList.toggle("on", c === b)); on(id); }; box.append(b); });
  host.append(box); return box;
};
const card = (host, w, h, paint, label, sub, o = {}) => {
  const c = el("figure", "card" + (o.pick ? " pick" : ""));
  view(c, w, h, paint, { max: 3, room: () => c.clientWidth - 20, ...o });
  c.append(el("figcaption", "", `<b>${label}</b><span>${sub}</span>`));
  host.append(c); return c;
};

const WHAT = {
  now: ["Today", "The hall in the game now, with the new crew already on it."],
  A: ["A · Clean", "Today's design, redrawn: thin tinted line, one sun, real shadows."],
  B: ["B · Worked", "A, plus stone by stone, weathering, ivy, lit windows, deeper shadow."],
  C: ["C · Bolder", "B on a stronger shape. Each hall's outline changes."],
};

// ---- 1. the headline pair ---------------------------------------------------------
const lead = () => {
  const host = $("#lead"), W = 268, H = 188, g = ground(W, H, 3);
  const gc = g.getContext("2d"); gc.fillStyle = "rgba(36,26,38,0.35)"; gc.fillRect(134, 0, 1, H);
  const hall = hallOf("archer", 3, "B");
  view(host, W, H, (ctx, t) => { ctx.drawImage(g, 0, 0); drawNow(ctx, "archer3", 67, 164); drawHall(ctx, hall, 201, 164, t); }, { max: 4 });
};

// ---- 2-4. one hall: today and the three treatments ------------------------------------
const row = (id, name, level, nowKey, W, H, by, o = {}) => {
  const host = $("#" + id), st = { mode: "work", light: true };
  const bar = $("#" + id + "-bar");
  if (o.modes) seg(bar, [["work", o.modes[0]], ["rest", o.modes[1]]], (m) => (st.mode = m), "work");
  if (o.lightSwitch) seg(bar, [["on", "Light on"], ["off", "off"]], (m) => (st.light = m === "on"), "on");
  for (const k of ["now", "A", "B", "C"]) {
    const g = ground(W, H, 11 + k.charCodeAt(0));
    const paint = k === "now" ? (ctx) => { ctx.drawImage(g, 0, 0); drawNow(ctx, nowKey, W / 2, by); }
      : (ctx, t) => { ctx.drawImage(g, 0, 0); drawHall(ctx, hallOf(name, level, k), W / 2 + (o.dx || 0), by, t, { mode: st.mode, light: st.light }); };
    card(host, W, H, paint, WHAT[k][0], o.subs ? o.subs[k] : WHAT[k][1], { pick: k === "B", still: k === "now" });
  }
};

// ---- 5. growth: a hall across its levels ------------------------------------------------
const growth = () => {
  const host = $("#growth"), st = { style: "B" };
  seg($("#growth-bar"), [["A", "A"], ["B", "B"], ["C", "C"]], (m) => (st.style = m), "B");
  const W = 372, H = 380, g = ground(W, H, 21);
  const gc = g.getContext("2d"); gc.fillStyle = "rgba(36,26,38,0.25)"; gc.fillRect(0, 190, W, 1);
  view(host, W, H, (ctx, t) => {
    ctx.drawImage(g, 0, 0);
    [1, 2, 3].forEach((lv, i) => { drawHall(ctx, hallOf("archer", lv, st.style), 62 + i * 124, 172, t + i * 400); drawHall(ctx, hallOf("spire", lv, st.style), 62 + i * 124, 362, t + i * 700); });
  }, { max: 3 });
};

// ---- 6. light: the Spire's crown as he casts, frame by frame ------------------------------
const lightStrip = () => {
  const host = $("#strip"), frames = [0, 4, 6, 7, 9, 12], cw = 104, chh = 124, W = cw * 3, H = chh * 2, g = ground(W, H, 31);
  const hall = hallOf("spire", 3, "B");
  view(host, W, H, (ctx) => {
    ctx.drawImage(g, 0, 0);
    frames.forEach((f, i) => {
      const x = (i % 3) * cw, y = Math.floor(i / 3) * chh;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw, chh); ctx.clip();
      drawHall(ctx, hall, x + cw / 2, y + 200, 300, { frame: { clip: "cast", f } });
      ctx.restore();
      ctx.fillStyle = "rgba(36,26,38,0.3)"; if (i % 3) ctx.fillRect(x, y, 1, chh); if (y) ctx.fillRect(x, y, cw, 1);
    });
  }, { max: 3, still: true });
};

// ---- 7. at board size -------------------------------------------------------------------
// The board shows an art pixel at about two thirds of a CSS pixel on an iPad,
// smoothed by the browser; this sheet does the same. Columns: today, A, B, C.
const board = () => {
  const host = $("#board"), CW = 128, W = CW * 4, rows = [["archer", 3, "archer3", 166], ["spire", 3, "spire3", 344], ["catapult", 3, "catapult3", 446]], H = 466;
  const g = ground(W, H, 9, [452, 466]);
  const gc = g.getContext("2d"); gc.fillStyle = "rgba(36,26,38,0.22)"; for (let i = 1; i < 4; i++) gc.fillRect(i * CW, 0, 1, H);
  const cv = el("canvas", "soft"); cv.width = W; cv.height = H; cv.style.width = Math.round(W * 0.667) + "px"; cv.style.height = Math.round(H * 0.667) + "px";
  const ctx = cv.getContext("2d"); host.append(cv);
  LIVE.push({ cv, ctx, paint: (c, t) => {
    c.drawImage(g, 0, 0);
    for (const [name, lv, nowKey, y] of rows) { drawNow(c, nowKey, CW / 2, y); ["A", "B", "C"].forEach((s, i) => drawHall(c, hallOf(name, lv, s), CW * (i + 1) + CW / 2, y, t + i * 300)); }
  } });
};

// ---- 8. what it costs, measured here -------------------------------------------------------
const bench = () => {
  const out = $("#bench"), btn = $("#bench-go");
  const run = () => {
    // drawing one hall for the first time (the one-off "bake")
    const bakes = [];
    for (let i = 0; i < 15; i++) { const t0 = performance.now(); kit.bakeHall(archerHall.BOX, archerHall.build({ level: 3, style: "B" })); bakes.push(performance.now() - t0); }
    bakes.sort((a, b) => a - b);
    // a packed late board: 90 halls, every flag, flame, light and crew figure, on a canvas the board's size
    const cv = el("canvas"); cv.width = 1680; cv.height = 1120;
    const ctx = cv.getContext("2d"), kinds = [["archer", 3], ["spire", 3], ["catapult", 3], ["archer", 2], ["spire", 2], ["archer", 1]].map(([n, l]) => hallOf(n, l, "B"));
    const pass = (full) => {
      const times = [];
      for (let it = 0; it < 12; it++) {
        const t0 = performance.now();
        ctx.fillStyle = GRASS; ctx.fillRect(0, 0, 1680, 1120);
        for (let i = 0; i < 90; i++) { const H = kinds[i % kinds.length], x = 70 + (i % 15) * 108, y = 180 + Math.floor(i / 15) * 180; if (full) drawHall(ctx, H, x, y, it * 130 + i * 50); else { ctx.drawImage(H.back, x - H.box.ox, y - H.box.oy); if (H.front) ctx.drawImage(H.front, x - H.box.ox, y - H.box.oy); } }
        ctx.getImageData(0, 0, 1, 1);
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      return times[times.length >> 1];
    };
    pass(true); pass(false);
    const still = pass(false), full = pass(true);
    const f1 = (v) => (v < 10 ? v.toFixed(1) : Math.round(v));
    out.innerHTML = `<div class="fact"><b>${f1(full)} ms</b>90 halls on a board-sized canvas with everything moving: flags, flames, light, and all their crews.</div><div class="fact"><b>${f1(still)} ms</b>The same 90 buildings alone, standing still.</div><div class="fact"><b>${f1(bakes[bakes.length >> 1])} ms</b>Drawing one tower for the first time (the slowest of these tries took ${f1(bakes[bakes.length - 1])} ms). It happens once per kind of tower, then it is a stamp.</div>`;
  };
  btn.onclick = run;
  setTimeout(run, 2600);
};

// ---- go ----------------------------------------------------------------------------
const boot = async () => {
  await nowReady;
  const parts = [
    lead,
    () => row("archer", "archer", 3, "archer3", 124, 192, 168, { modes: ["Shooting", "At rest"] }),
    () => row("spire", "spire", 3, "spire3", 124, 200, 176, { modes: ["Casting", "At rest"], lightSwitch: true }),
    () => row("catapult", "catapult", 3, "catapult3", 140, 116, 98, { dx: -2 }),
    growth, lightStrip, board, bench,
  ];
  for (const part of parts) { try { part(); } catch (e) { console.error(e); } }
  FITS.forEach((f) => f());
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches, t0 = performance.now();
  const tick = (now) => {
    const t = still ? 640 : Math.max(0, now - t0);
    for (const v of LIVE) { if ((v.still || still) && v.done) continue; try { v.paint(v.ctx, t); } catch (e) { console.error(e); } v.done = true; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.documentElement.dataset.ready = "1";
};
boot();
