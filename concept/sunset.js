// ============ SUNSET CONCEPTS (2026-11-22; brief art/briefs/sunset.md) ============
// Concept code only: nothing under src/ is edited. The REAL engine and draw() run; this module
// wraps the Blood Moon's painter (weatherfx PAINTERS.bloodmoon) and intercepts the two big
// shade blits (bloodmoon.js lays its 840x560 shade layer with 'multiply' in the GROUND pass and,
// at half strength, in the ACTORS pass) so each option can clip / fade / decorate them.
//
//   T  today's wash (the engine untouched, for the before)
//   A  the dusk line: a ragged treeline-shaped shadow edge crosses the board; plum shade at full
//      strength behind it, daylight ahead, a band of gold dither on the last sunlit ground
//   B  A + every lamp (halls; the castle's gate torches faked) and every undead foe's eyes catch
//      the moment the line passes them (a hot flare, then the pool / glow)
//   C  long amber shadows and a gold rim first (no full-board tint), then the shade fades in plain
//   D  A + the water carries the sky (gold glints ahead, rose at the line, red sheen behind) + crows
//
// The engine's own `w.k` is driven by the lab: `S.k` is the sunset's clock (0..1); `w.k` is only what
// the stock code needs (rims, eyes, lamps) and is set by setSunset().
import { W, H, RES, WALL_W } from "../src/data/constants.js";
import { PAINTERS } from "../src/render/weatherfx.js";
import { noteLamp } from "../src/render/nightlight.js";
import { MOON_KEY } from "../src/render/bloodmoon.js";
import { bakeWater } from "../src/render/water.js";
import { LIGHTS } from "../src/render/pix/pixrigs.js";
import { TOTAL_LEN, posAt } from "../src/engine/path.js";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (n) => { n = Math.imul(n ^ (n >>> 15), 2246822519) >>> 0; n = Math.imul(n ^ (n >>> 13), 3266489917) >>> 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

export const S = { on: false, opt: "A", k: 0, kRed: 0, wk: 0.011, actors: false, lampWin: false, groundWin: false, remain: 0, nLamps: 0, base: null, g: null, shadeMode: "fade", water: null };

// ---- the line: u = 0.75x + 0.66y is how far a point is along the sun's setting; the edge runs across it ----
const K0 = 0.1, K1 = 0.6;
const frontU = (k) => (k <= K0 ? -1e4 : k >= K1 ? 1e4 : (() => { const t = (k - K0) / (K1 - K0), e = 0.65 * t + 0.35 * t * t * (3 - 2 * t); return -80 + 1160 * e; })());
// a treeline: slow swell + conifer teeth of different heights, a few gaps
const jag = (v) => {
  const slow = 15 * (0.6 * Math.sin(v / 70) + 0.4 * Math.sin(v / 29 + 1.3));
  const p = v / 11, i = Math.floor(p), f = p - i, tooth = 1 - Math.abs(2 * f - 1), hh = hash(i + 7);
  const gap = hh < 0.22 ? 0.25 : 1;
  const p2 = v / 5.3, i2 = Math.floor(p2), f2 = p2 - i2, small = (1 - Math.abs(2 * f2 - 1)) * 4 * hash(i2 + 91);
  return slow + 14 * (0.4 + 0.6 * hh) * tooth * gap + small;
};
const ROW = 2, J0 = -4, J1 = Math.ceil(H / ROW) + 4;
let EK = null, EA = null;
export const edges = (k, lo = K0, hi = K1) => {
  const key = `${k}|${lo}|${hi}`;
  if (EK === key) return EA;
  const F = lo === K0 && hi === K1 ? frontU(k) : (k <= lo ? -1e4 : k >= hi ? 1e4 : -80 + 1160 * (0.65 * ((k - lo) / (hi - lo)) + 0.35 * sm(0, 1, (k - lo) / (hi - lo))));
  const out = new Float32Array(J1 - J0);
  for (let j = J0; j < J1; j++) {
    const y = j * ROW + 1;
    if (F < -9000) { out[j - J0] = -1e4; continue; }
    if (F > 9000) { out[j - J0] = 1e4; continue; }
    let x = (F - 0.66 * y) / 0.75;
    for (let it = 0; it < 2; it++) x = (F - 0.66 * y - jag(0.66 * x - 0.75 * y)) / 0.75;
    out[j - J0] = Math.round(x / 2) * 2;
  }
  EK = key; EA = out;
  return out;
};
const edgeAt = (y) => { const j = Math.max(J0, Math.min(J1 - 1, Math.floor(y / ROW))); return EA ? EA[j - J0] : -1e4; };

// a clip path of one rect per 2-unit row, from edge+a to edge+b
const rowsPath = (ctx, E, a, b) => {
  ctx.beginPath();
  for (let j = J0; j < J1; j++) {
    const e = E[j - J0];
    let x0 = a <= -1e3 ? -8 : e + a, x1 = b >= 1e3 ? W + 8 : e + b;
    x0 = Math.max(-8, x0); x1 = Math.min(W + 8, x1);
    if (x1 > x0) ctx.rect(x0, j * ROW, x1 - x0, ROW);
  }
};

// ---- the gold lip: the last sunlight on the ground just ahead of the edge ----
const LIP = ["#fff2b8", "#ffd77a", "#f2b04a", "#d98a30"], DENS = [0.95, 0.7, 0.42, 0.2];
const drawLip = (ctx, E) => {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.36;
  for (let c = 0; c < 4; c++) {
    ctx.fillStyle = LIP[c];
    ctx.beginPath();
    for (let j = J0; j < J1; j++) {
      const e = E[j - J0]; if (e < -100 || e > W) continue;
      const x = e + c * 2; if (x >= W - 1) continue;
      if (BAYER[(j & 3) * 4 + ((x / 2) & 3)] < DENS[c]) ctx.rect(x, j * ROW, 2, ROW);
    }
    ctx.fill();
  }
  ctx.restore();
};

// ---- the stretched shadows (C) ----
const SHS = new Map();
const DIR = [0.93, 0.37], PERP = [-0.37, 0.93];
const shadowSprite = (L, wd) => {
  const key = L + "|" + wd; let s = SHS.get(key); if (s) return s;
  const LA = L * 2, WA = wd * 2, ox = Math.ceil(WA) + 2, oy = Math.ceil(LA * DIR[1] + WA) + 2;
  const w = Math.ceil(LA * DIR[0] + ox + WA + 4), h = Math.ceil(LA * DIR[1] + oy + WA + 4);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d"), img = c.createImageData(w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const rx = i + 0.5 - ox, ry = j + 0.5 - oy, al = rx * DIR[0] + ry * DIR[1], ac = rx * PERP[0] + ry * PERP[1];
    if (al < -WA * 0.6 || al > LA) continue;
    const t = Math.max(0, al / LA), half = WA * (1 - 0.82 * t) * (al < 0 ? Math.sqrt(1 + al / (WA * 0.6)) : 1);
    if (Math.abs(ac) > half) continue;
    if (t > 0.62 && BAYER[(j & 3) * 4 + (i & 3)] < (t - 0.62) * 2.2) continue;
    const o = (j * w + i) * 4; d[o] = 34; d[o + 1] = 18; d[o + 2] = 40; d[o + 3] = Math.abs(ac) > half - 1.2 ? 70 : 96;
  }
  c.putImageData(img, 0, 0);
  s = { cv, w, h, ox, oy }; SHS.set(key, s); if (SHS.size > 90) SHS.delete(SHS.keys().next().value);
  return s;
};
const longShadow = (ctx, x, y, L0, wd, s) => {
  const L = Math.max(3, Math.round(L0 * (1 + 1.5 * s))), sp = shadowSprite(L, Math.max(1, Math.round(wd)));
  ctx.drawImage(sp.cv, Math.round(x * 2) / 2 - sp.ox / 2, Math.round(y * 2) / 2 - sp.oy / 2, sp.w / 2, sp.h / 2);
};
const drawLongShadows = (ctx, g, s) => {
  const O = ORIG;
  ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  const draw = (x, y, L0, wd) => { const L = Math.max(3, Math.round(L0 * (1 + 1.5 * s))), sp = shadowSprite(L, Math.max(1, Math.round(wd))); O.call(ctx, sp.cv, Math.round(x * 2) / 2 - sp.ox / 2, Math.round(y * 2) / 2 - sp.oy / 2, sp.w / 2, sp.h / 2); };
  for (const t of g.towers) draw(t.x + 2, t.y + 3, 34, 11);
  for (const b of g.bands || []) for (const u of b.units || []) if (u.x != null && !u.dead) draw(u.x + 1, u.y + 9, 8, 2.6);
  for (const e of g.enemies) if (!e.dead && !e.flying && e.x != null) draw(e.x + 1.5, e.y + e.size * 0.55, e.size * 0.9, Math.max(1.8, e.size * 0.2));
  ctx.restore();
};

// ---- the water (D): three tinted, masked, dithered sheets baked once per realm ----
let WATER = null;
const bakeWaterSheets = () => {
  const w = W * RES, h = H * RES;
  const m = document.createElement("canvas"); m.width = w; m.height = h;
  const mc = m.getContext("2d"); mc.scale(RES, RES); bakeWater(mc);
  const md = mc.getImageData(0, 0, w, h).data;
  const mk = (base, spark, ba, bayerDens) => {
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const c = cv.getContext("2d"), img = c.createImageData(w, h), d = img.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4; if (md[o + 3] < 200) continue;
      const hs = hash(i * 7919 + j * 104729);
      if (hs < 0.0055) { d[o] = spark[0]; d[o + 1] = spark[1]; d[o + 2] = spark[2]; d[o + 3] = 235; if (i + 1 < w) { const p = o + 4; d[p] = spark[0]; d[p + 1] = spark[1]; d[p + 2] = spark[2]; d[p + 3] = 200; } }
      else if (BAYER[(j & 3) * 4 + (i & 3)] < bayerDens) { d[o] = base[0]; d[o + 1] = base[1]; d[o + 2] = base[2]; d[o + 3] = ba; }
    }
    c.putImageData(img, 0, 0);
    return cv;
  };
  return {
    gold: mk([255, 196, 104], [255, 238, 176], 44, 0.2),
    rose: mk([238, 104, 128], [255, 176, 186], 66, 0.38),
    blood: mk([150, 8, 24], [255, 78, 60], 96, 0.5),
  };
};
const drawWaterSheen = (ctx, E) => {
  if (!WATER) WATER = bakeWaterSheets();
  const O = ORIG;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const zone = (cv, a, b, alpha) => { ctx.save(); rowsPath(ctx, E, a, b); ctx.clip(); ctx.globalAlpha = alpha; O.call(ctx, cv, 0, 0, W, H); ctx.restore(); };
  zone(WATER.gold, 12, 1e4, 1);
  zone(WATER.rose, -6, 12, 1);
  if (S.kRed > 0.02) zone(WATER.blood, -1e4, -6, Math.min(1, S.kRed * 1.1));
  ctx.restore();
};

// ---- the crows (D) ----
const CROW = [
  ["..k........k..", ".kk........kk.", ".kkk......kkk.", "..kkkkkkkkkka.", "...kkkkkkkkk..", "....kk..kk....", "..............", ],
  ["..............", "..kk......kk..", ".kkkkkkkkkkkk.", "..kkkkkkkkkka.", "...kkkkkkkkk..", "....kk..kk....", "..............", ],
  ["..............", "..............", "..kkkkkkkkkk..", ".kkkkkkkkkkka.", "kk.kkkkkkkkk..", "k...kk..kk....", "..............", ],
];
const CCOL = { k: "#1a1522", a: "#b08040", g: "#3a3348" };
export const crowList = (k) => {
  if (k < 0.08 || k > 0.66) return [];
  const F = frontU(k), out = [];
  for (let i = 0; i < 7; i++) {
    const v = 14 + i * 27 + 20 * Math.sin(i * 2.1), u = F + 75 + ((i * 17) % 50);
    const x = 0.75 * u + 0.66 * v, y = 0.66 * u - 0.75 * v;
    if (x < 6 || x > W - WALL_W - 14 || y < 40 || y > H - 20) continue;
    out.push({ x, y, i });
  }
  return out;
};
const drawCrows = (ctx, k, time) => {
  ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  for (const c of crowList(k)) {
    const f = Math.floor(time * 7 + c.i * 1.3 + k * 40) % 3, g = CROW[f], by = c.y - 34 + Math.sin(time * 3 + c.i) * 1.2;
    const x0 = Math.round(c.x * 2) / 2 - 3.5, y0 = Math.round(by * 2) / 2 - 1.75;
    for (let j = 0; j < g.length; j++) for (let i = 0; i < g[j].length; i++) {
      const ch = g[j][i]; if (ch === ".") continue;
      ctx.fillStyle = j <= 1 && ch === "k" && f === 1 ? CCOL.g : CCOL[ch] || CCOL.k;
      ctx.fillRect(x0 + i * 0.5, y0 + j * 0.5, 0.5, 0.5);
    }
  }
  ctx.restore();
};
const drawCrowShadows = (ctx, k) => {
  ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "rgba(40,22,44,0.32)";
  for (const c of crowList(k)) {
    const x = Math.round((c.x + 9) * 2) / 2, y = Math.round((c.y + 2) * 2) / 2;
    ctx.fillRect(x - 2.5, y - 0.5, 5, 0.5); ctx.fillRect(x - 3.5, y, 7, 0.5); ctx.fillRect(x - 2.5, y + 0.5, 5, 0.5);
  }
  ctx.restore();
};

// ---- lamp / eye intensity as the line passes (B) ----
const lampLevel = (x, y) => {
  if (S.opt !== "B") return S.kRed;
  const d = edgeAt(y) - x;               // > 0: the shadow has passed this lamp
  if (d < 0) return 0;
  return 1;
};
const flare = (x, y) => (S.opt === "B" && edgeAt(y) - x >= 0 && edgeAt(y) - x < 12);

// ---- the drawImage intercept ----
const ORIG = CanvasRenderingContext2D.prototype.drawImage;
const groundExtras = (ctx, g) => {
  const E = edges(S.k, ...(S.shadeMode === "line" && S.opt === "C" ? [0.3, 0.8] : [K0, K1]));
  if (S.opt === "C") { drawLongShadows(ctx, g, sm(0, 0.35, S.k)); if (S.amber > 0.02) LIGHTS.push({ x: -170, y: -20, r: 1500, col: "#ffbe50", k: Math.min(1, S.amber * 1.15) }); }
  if (S.opt === "D") { drawWaterSheen(ctx, edges(S.k)); drawCrowShadows(ctx, S.k); }
};
const hookShade = (ctx, img, a) => {
  const pass = S.actors ? "actors" : "ground", base = pass === "ground" ? 0.85 : 0.5;
  let alpha = base, E = null;
  if (S.opt === "C") { if (S.shadeMode === "line") E = edges(S.k, 0.3, 0.8); else alpha = base * sm(0.3, 0.95, S.k); }
  else E = edges(S.k);
  if (alpha > 0.004 && !(E && E[0] < -9000 && E[E.length - 1] < -9000)) {
    ctx.save();
    if (E) { rowsPath(ctx, E, -1e4, 0); ctx.clip(); }
    ctx.globalAlpha = alpha;
    ORIG.call(ctx, img, ...a);
    ctx.restore();
  }
  if (pass === "ground") {
    S.groundWin = S.nLamps > 0; S.remain = S.nLamps;
    ctx.save(); groundExtras(ctx, S.g); ctx.restore();
  }
};
CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
  if (!S.on || !(img instanceof HTMLCanvasElement)) return ORIG.call(this, img, ...a);
  const comp = this.globalCompositeOperation;
  if (img.width === W && img.height === H && a.length === 4) {
    if (comp === "multiply") return hookShade(this, img, a);
    if (comp === "lighter") { const pa = this.globalAlpha; this.globalAlpha = pa * (S.wk > 0 ? S.kRed / S.wk : 0); ORIG.call(this, img, ...a); this.globalAlpha = pa; return; }
  }
  // the lamps' pools (ground pass, counted) and blooms (actors pass)
  if (comp === "lighter" && ((S.groundWin && S.remain > 0) || S.lampWin) && a.length === 4) {
    const pa = this.globalAlpha, cx = a[0] + a[2] / 2, cy = a[1] + a[3] / 2;
    const pool = S.groundWin && S.remain > 0;
    if (pool) { S.remain--; if (S.remain <= 0) S.groundWin = false; } else S.nL++;
    const lv = lampLevel(cx, pool ? cy - 8 : cy), ratio = S.wk > 0 ? pa / S.wk : 0;
    if (lv > 0.001) {
      this.globalAlpha = Math.min(1, ratio * lv); ORIG.call(this, img, ...a);
      if (flare(cx, cy)) { this.globalAlpha = Math.min(1, ratio * 0.9); ORIG.call(this, img, a[0] - a[2] * 0.1, a[1] - a[3] * 0.1, a[2] * 1.2, a[3] * 1.2); }
    }
    this.globalAlpha = pa; return;
  }
  // the undead's eyes (source-over, inside the actors window)
  if (S.lampWin && comp === "source-over" && S.base) {
    const m = this.getTransform(), bx = (m.e - S.base.e) / S.base.a, by = (m.f - S.base.f) / S.base.d, pa = this.globalAlpha;
    const a0 = Math.min(1, S.wk * 1.4), want = Math.min(1, (S.opt === "B" ? (edgeAt(by) - bx >= 0 ? 1 : 0) : S.kRed) * 1.4);
    this.globalAlpha = a0 > 0 ? Math.min(1, pa / a0 * want) : 0;
    if (this.globalAlpha > 0.004) ORIG.call(this, img, ...a);
    this.globalAlpha = pa; return;
  }
  return ORIG.call(this, img, ...a);
};

// ---- the painter wrapper (over everything) ----
const orig = PAINTERS.bloodmoon;
PAINTERS.bloodmoon = (ctx, g, w, d) => {
  if (!S.on) return orig(ctx, g, w, d);
  S.g = g; S.base = ctx.getTransform();
  if (S.opt === "B") {                   // the castle's gate torches (castle.js keeps its own list, not noted as lamps): faked
    const [gx, gy] = posAt(TOTAL_LEN - 1);
    for (const dy of [-30, 30]) noteLamp(W - WALL_W + 6, gy + dy, 16, "#ffb050", 0.85, 12);
  }
  S.actors = true; S.lampWin = true; S.nL = 0;
  orig(ctx, g, w, d);
  S.actors = false; S.lampWin = false; S.nLamps = S.nL;
  const E = edges(S.k);
  if (S.opt === "A" || S.opt === "B" || S.opt === "D") drawLip(ctx, E);
  if (S.opt === "C" && S.shadeMode === "line") drawLip(ctx, edges(S.k, 0.3, 0.8));
  if (S.opt === "D") drawCrows(ctx, S.k, g.time);
};

// ---- the lab sets the clock ----
export const setSunset = (g, opt, k) => {
  S.opt = opt; S.k = k; S.on = opt !== "T";
  const w = g.weather;
  if (opt === "T") { w.k = k; w.phase = k > 0 ? "rising" : "height"; S.kRed = k; S.wk = k; MOON_KEY.col = "#ff4a38"; return; }
  w.phase = "height";
  if (opt === "C") {
    const amber = sm(0, 0.1, k) * (1 - sm(0.3, 0.5, k)) * 0.8, red = sm(0.4, 1, k);
    S.kRed = red; S.amber = amber; w.k = Math.max(0.011, red);
    MOON_KEY.col = "#ff4a38";
  } else {
    S.kRed = sm(0.55, 1, k); w.k = Math.max(0.011, S.kRed); MOON_KEY.col = "#ff4a38";
  }
  S.wk = w.k;
};
export const resetWater = () => { WATER = null; };
