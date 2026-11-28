import { Pix, mat, flat, toCanvas } from "../src/render/pix/pix.js";
import { DAY, spriteSun } from "../src/data/sun.js";
import { sunRim } from "../src/render/sceneryday.js";
export { standRing } from "../src/render/overhaul/treeart.js";

export const rng = (seed) => { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
export const h2 = (x, y, s) => { let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// treatment 4, "broken canopy" (the owner's pick, round 5): split, leaf cell, edge, terminator band, separation rim,
// flecks in light / shade, bough gaps, sky holes, share of the lit outline dropped, the underside pushed down
const T4 = { split: 2, leaf: 3, edge: 3.5, band: 0.15, sep: 1, dither: 0, fleck: 0.16, shade: 0.1, all: 0, gaps: 0.15, sky: 0.08, broken: 0.4, core: 1 };
// the willow's own (the concept's strand willow was approved under treatment 3; its strands take no treatment)
const T3 = { split: 1, leaf: 3.5, edge: 3, band: 0.1, sep: 1, dither: 0, fleck: 0.07, shade: 0.04, all: 0, gaps: 0.1, sky: 0.03, broken: 0.55, core: 1 };

// summer (the concept's PAL.summer)
export const PAL = { bark: "#6e4a30", birchBark: "#e2ddcc", mark: "#3a3034", moss: "#6f8f3a", pine: "#3d7650", pine2: "#356a48", willow: "#88ae4a",
  oak: ["#5c9a3c", "#4f8f3e", "#64a040"], beech: "#5a9440", birch: "#8ab846", haw: "#5f9a40", blossom: "#f4eee4", hawBloom: 0.35 };

// the sun as the sculptor sees it (noon: the sculptor's own default)
const sunL = () => { const S = spriteSun(false) || [-0.6, -0.62, 0.5], l = Math.hypot(S[0], S[1], S[2]); return [S[0] / l, S[1] / l, S[2] / l]; };
const TH = [0.06, 0.5, 0.86];
const nearTH = (v) => Math.min(Math.abs(v - TH[0]), Math.abs(v - TH[1]), Math.abs(v - TH[2]));
const tone = (v) => (v > TH[0]) + (v > TH[1]) + (v > TH[2]);

function geom(M, px, py) {
  if (M.tier) {
    const t = clamp((py - M.top) / (M.hem - M.top), 0, 1), w = M.hw * (0.12 + 0.88 * Math.pow(t, 0.8)) + 1;
    const u = (px - M.x) / w;
    let d = Math.abs(u);
    if (py < M.top) d = 9;
    if (py > M.hem - 2) d = Math.max(d, 1 + (py - M.hem + 2) / 3 - Math.cos(u * 4) * 0.25);
    const nx = clamp(u, -1, 1) * 0.72, ny = -0.5 + 0.95 * t * t, nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
    return { d, nx, ny, nz, v: t };
  }
  const u = (px - M.x) / M.rx, v = (py - M.y) / M.ry, d = Math.hypot(u, v), dm = Math.min(d, 0.97), nz = Math.sqrt(1 - dm * dm);
  return { d, nx: (u / Math.max(d, 1e-3)) * dm, ny: (v / Math.max(d, 1e-3)) * dm, nz, v };
}
const bbox = (M) => M.tier ? [M.x - M.hw - 6, M.top - 4, M.x + M.hw + 6, M.hem + 6] : [M.x - M.rx - 6, M.y - M.ry - 6, M.x + M.rx + 6, M.y + M.ry + 6];

function splitMass(M, n) {
  if (n <= 1 || M.tier) return [M];
  return [{ ...M, x: M.x - M.rx * 0.32, y: M.y + M.ry * 0.08, rx: M.rx * 0.72, ry: M.ry * 0.8, z: M.z },
    { ...M, x: M.x + M.rx * 0.3, y: M.y - M.ry * 0.12, rx: M.rx * 0.72, ry: M.ry * 0.8, z: M.z + 1 }];
}

// one leaf mass through the treatment (the concept's crown(), cascades dropped: the strand willow has none)
function crown(P, M, T, seed, L) {
  const cl = T.leaf, mn = M.tier ? Math.max(4, M.hw * 0.6) : Math.min(M.rx, M.ry), ebD = T.edge / mn;
  const sx = M.sx || 0;
  const ctr = (ix, iy) => [(ix + 0.1 + 0.8 * h2(ix, iy, seed)) * cl, (iy + 0.1 + 0.8 * h2(iy, ix, seed + 7)) * cl];
  const [x0, y0, x1, y1] = bbox(M);
  const dot = (g) => g.nx * L[0] + g.ny * L[1] + g.nz * L[2];
  for (let j = Math.floor(y0 + P.oy); j <= Math.ceil(y1 + P.oy); j++) for (let i = Math.floor(x0 + P.ox); i <= Math.ceil(x1 + P.ox); i++) {
    const px = i + 0.5 - P.ox, py = j + 0.5 - P.oy, g = geom(M, px, py);
    if (g.d > 1 + ebD) continue;
    const TX = px - sx, TY = py, gx = Math.floor(TX / cl), gy = Math.floor(TY / cl);
    let f1 = 1e9, f2 = 1e9, bx = 0, by = 0, cx = 0, cy = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const [qx, qy] = ctr(gx + a, gy + b), dd = Math.hypot(TX - qx, TY - qy);
      if (dd < f1) { f2 = f1; f1 = dd; by = qy; bx = qx + sx; cx = gx + a; cy = gy + b; } else if (dd < f2) f2 = dd;
    }
    const gc = geom(M, bx, by), cellH = h2(cx, cy, seed + 3);
    const edge = g.d > 1 - ebD;
    if (edge && !(gc.d < 1 + ebD * (0.15 + 0.7 * cellH) - ebD * 0.4 && f1 < cl * (0.5 + 0.2 * cellH))) continue;
    const G = 6.5 * (T.gapG || 1), hx = Math.floor((px - sx) / G), hy = Math.floor(py / G), hc = h2(hx, hy, seed + 21);
    const hcx = (hx + 0.5) * G + sx, hcy = (hy + 0.5) * G, hd = Math.hypot((px - hcx) / G, (py - hcy) / (G * 0.8));
    if (!M.tier && !M.noGaps && T.gaps && g.v > 0.05 && g.d < 0.8 && hc < T.gaps && hd < 0.42) continue;
    if (!M.tier && !M.noGaps && T.sky && g.d > 0.62 && g.d < 0.92 && hc > 1 - T.sky && hd < 0.36) continue;
    let n = g, bias = M.bias || 0;
    const v = dot(g), vc = dot(gc), t = tone(v), tc = tone(vc);
    const sepPx = (f2 - f1) < 1.05 && (px - bx) + (py - by) > 0;
    const lipPx = (px - bx) + (py - by) < -cl * 0.45;
    if (T.band && nearTH(vc) < T.band) {
      n = gc;
      if (sepPx && T.sep) bias -= 1;
      else if (lipPx && tc >= 2 && cellH < 0.5) bias += 1;
    } else if (edge && T.sep) {
      n = gc; if (sepPx) bias -= 1;
    } else if (T.fleck && t >= 3 && cellH < T.fleck) {
      n = gc; if (sepPx) bias -= 1;
    } else if (T.shade && t <= 1 && cellH < T.shade) {
      n = gc; if (lipPx) bias += 1;
    } else if (edge) n = gc;
    if (M.tier && py > M.hem - 3.5 && g.d < 1.2) bias -= (py > M.hem - 1.5 ? 2 : 1);
    if (T.core && g.v > 0.25 && !M.tier) bias -= T.core * clamp((g.v - 0.25) * 2.4, 0, 1) * (g.d < 0.85 ? 1 : 0.5);
    if (sx || P._sxm) (P._sxm ||= new Int8Array(P.w * P.h))[j * P.w + i] = sx;
    P._put(i, j, M.m, M.z + g.nz * 8, n.nx, n.ny, n.nz, { bias, edge: true }, (1 - g.d) * mn);
  }
}

function bark(P, pts, radii, m, z, o = {}) {
  P.part();
  P.limb(pts, radii, m, z, { zb: o.zb ?? z, weld: o.weld ?? 3, weldRoot: o.weldRoot ?? (Array.isArray(radii) ? radii[0] : radii) * 2.2, noSeam: true });
  if (o.strokes !== false) for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], r = Array.isArray(radii) ? radii[s] : radii;
    if (r < 2.5) continue;
    for (let k = -1; k <= 1; k += 2) P.toneLine(ax + k * r * 0.35, ay, bx + k * r * 0.3, by, -1);
  }
}

// the sprite: build, resolve, break the lit outline, the low sun's warmth and warm edge. Also returns the LEAF
// mask (leaf pixels and the outline beside them) and its box, for the see-through crown (trees.js)
let LEAFM = new Set();
export function sprite(w, h, foot, T, build) {
  LEAFM = new Set();
  const P = new Pix(w, h, Math.floor(w / 2), h - foot);
  build(P);
  const R = P.resolve({ line: "tint", keepLv: true });
  const d = R.data, ring = P._ring, lv = P._lv;
  if (T && T.broken) {
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
      const k = j * w + i;
      if (!ring[k]) continue;
      let lit = false, sq = 0;
      for (const q of [k + 1, k + w, k - 1, k - w]) if (P.m[q] >= 0 && LEAFM.has(P.m[q]) && lv[q] >= 3 && !ring[q]) { lit = true; sq = P._sxm ? P._sxm[q] : 0; }
      if (lit && h2((i - sq) >> 1, j >> 1, 91) <= T.broken) d[k * 4 + 3] = 0;
    }
  }
  let leaf = null, lb = null;
  if (LEAFM.size) {
    leaf = new Uint8Array(w * h); let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i;
      let on = P.m[k] >= 0 && LEAFM.has(P.m[k]);
      if (!on && ring && ring[k]) for (const q of [k + 1, k + w, k - 1, k - w]) if (q >= 0 && q < w * h && P.m[q] >= 0 && LEAFM.has(P.m[q])) { on = true; break; }
      if (on && d[k * 4 + 3]) { leaf[k] = 1; if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    }
    if (x1 >= 0) lb = [x0, y0, x1, y1];
  }
  if (DAY.on && DAY.warm) {
    const wk = DAY.warm * 0.55, rose = DAY.tone === "rose";
    for (let k = 0; k < d.length; k += 4) if (d[k + 3]) { d[k] = Math.min(255, d[k] * (1 + 0.12 * wk) + 8 * wk); d[k + 1] = d[k + 1] * (1 - (rose ? 0.06 : 0.01) * wk); d[k + 2] = d[k + 2] * (1 - (rose ? 0.02 : 0.2) * wk); }
  }
  const cv = toCanvas(R);
  if (DAY.on) sunRim(cv, DAY.side < 0);
  return { cv, ax: Math.floor(w / 2), ay: h - foot, leaf, lb };
}
const leafMat = (c, o) => { const m = mat(c, o); LEAFM.add(m); return m; };

// SWAY: trees.js sets SWAY.at(i) = the lean (art px at the crown's top) of mass / tier / willow bunch i before a
// bake; null = still. Whole masses move by whole pixels, their leaf cells ride with them (no shimmer); wood never moves.
export const SWAY = { at: null };
const swayOf = (i, hf) => (SWAY.at ? Math.round(SWAY.at(i) * Math.pow(clamp(hf, 0, 1), 1.3)) : 0);
function swayMasses(masses) {
  if (!SWAY.at) return masses;
  const top = Math.max(1, ...masses.map((M) => -(M.y ?? 0)));
  return masses.map((M, i) => { const d = swayOf(i, -(M.y ?? 0) / top); M._dx = d; return d ? { ...M, x: M.x + d, sx: d } : M; });
}
function leafMasses(P, masses, T, seed, under) {
  const L = sunL();
  masses = swayMasses(masses);
  if (under) for (const M of masses) if (!M.tier && !M.noUnder) { P.part(); P.ellipse(M.x, M.y + M.ry * 0.25, M.rx * 0.78, M.ry * 0.6, under, M.z - 30, { fix: 0 }); }
  let i = 0;
  for (const M of masses) for (const L2 of splitMass(M, M.split ?? T.split)) { P.part(); crown(P, L2, T, seed * 13 + i * 31, L); i++; }
}

// ---- the five fills (round 6: no dead limb) and the layer orders ----
const FILLS = ["dense", "open", "lopsided", "reaching", "compact"];
const ORDERS = 3;
function fillVar(seed) {
  const h = (n) => h2(seed | 0, n, 77), sg = h(4) < 0.5 ? -1 : 1;
  const arch = Math.floor(h(1) * FILLS.length);
  const v = { arch, full: 0.94 + (h(2) - 0.5) * 0.12, open: h(3) * 0.3, side: sg * h(5) * 0.35, reach: h(6) * 0.3,
    lean: (h(7) - 0.5) * 3, gapG: 0.85 + h(8) * 0.35, ord: Math.floor(h(10) * ORDERS), seed };
  if (arch === 0) Object.assign(v, { full: 1.1 + h(2) * 0.04, open: 0, reach: 0.1, gapG: 0.8 });
  if (arch === 1) Object.assign(v, { full: 0.9, open: 0.75 + h(3) * 0.15, gapG: 1.25 });
  if (arch === 2) Object.assign(v, { side: sg * (0.85 + h(5) * 0.15), lean: sg * (3 + h(7) * 2) });
  if (arch === 3) Object.assign(v, { reach: 0.85 + h(6) * 0.15, full: 0.92, open: 0.3 });
  if (arch === 4) Object.assign(v, { reach: 0, full: 0.98, open: 0.05, compact: 1 });
  return v;
}
const skelOf = (v, k) => (x, y, i = 0, out = 1) => [x * (1 + 0.28 * v.reach * out - 0.12 * (v.compact || 0)) + v.lean * (-y) / (100 * k) + (i ? (h2(v.seed, i, 31) - 0.5) * 6 * k * out : 0), y + v.reach * out * 5 * k * Math.max(0, Math.abs(x) / (40 * k) - 0.4)];
function dressMasses(M, v, k) {
  const maxX = Math.max(1, ...M.map((m) => Math.abs(m.x))), SK = skelOf(v, k);
  const out = M.map((m) => {
    const o = Math.min(1, Math.abs(m.x) / maxX), [x, y] = SK(m.x, m.y, 0, o * 0.55);
    const sc = v.full * (1 - 0.14 * v.open) * (1 - 0.2 * v.reach * o) * (1 + v.side * 0.45 * Math.sign(m.x) * o);
    const pull = 1 + 0.07 * v.open * o;
    return { ...m, x: x * pull, y: y + (v.open ? m.ry * 0.12 * v.open * o : 0), rx: m.rx * sc, ry: m.ry * sc * (1 - 0.1 * v.reach * o) };
  });
  if (v.ord) {
    const zs = out.map((m) => m.z).sort((a, b) => a - b);
    out.map((m, i) => [m.z + (h2(v.seed | 0, i * 7 + v.ord * 101, 55) - 0.5) * 18, i]).sort((a, b) => a[0] - b[0]).forEach(([, i], r) => { out[i] = { ...out[i], z: zs[r] }; });
  }
  return out;
}
const Tof = (T, v) => ({ ...T, gaps: T.gaps * (v.arch === 0 ? 0.45 : 0.7 + v.open * 1.3), sky: T.sky * (v.arch === 0 ? 0.3 : 0.6 + v.open * 2.2), gapG: v.gapG });
const clothe = (P, M, T, v, seed, un) => leafMasses(P, M, Tof(T, v), seed, un);

// ---- one welded body and the root flares (round 6) ----
const FLARE_SET = [
  [[-2.1, 1.4, 1], [2.0, 1.7, 1], [-0.9, 3.0, 0.8], [1.0, 2.6, 0.85]],
  [[-3.8, 2.4, 0.95], [1.5, 1.5, 0.75], [0.4, 2.8, 0.6]],
  [[-1.45, 1.0, 0.85], [1.45, 1.2, 0.85], [0.15, 1.8, 0.7]],
  [[-0.75, 3.8, 0.75], [0.85, 4.0, 0.75], [-1.9, 1.3, 0.75], [2.0, 1.1, 0.7]],
];
const WOOD = 1;
export function trunk(P, [x0, y0], r, pts, radii, bk, z, seed, force) {
  bark(P, [[x0, y0 - r * 0.7], ...pts], [r * 1.08, ...radii], bk, z, { weld: 0 });
  const f = force ?? Math.floor(h2(seed | 0, 3, 91) * FLARE_SET.length), mir = h2(seed | 0, 5, 91) < 0.5 ? -1 : 1;
  for (const [sx, dy, th] of FLARE_SET[f]) {
    const x = sx * mir * r, y = dy * r / 5;
    bark(P, [[x0 + x * 0.2, y0 - r * 1.3], [x0 + x * 0.62, y0 + y * 0.45 - r * 0.35], [x0 + x, y0 + y]], [r * 0.62 * th, r * 0.36 * th, Math.max(0.8, r * 0.13)], bk, z + (dy > 2 ? 1.5 : 0.5), { strokes: false, weldRoot: r * 1.6 });
  }
}

const oakCol = (seed) => PAL.oak[Math.abs(seed | 0) % PAL.oak.length];
const oakCol2 = (seed) => { const n = PAL.oak.length, i = Math.abs(seed | 0) % n; return PAL.oak[i + 1 < n ? i + 1 : Math.max(0, i - 1)]; };
// the wood's depth: deeper trees take a cooler, darker leaf
const hx2 = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const deep = (c, dk) => { if (!dk) return c; const a = hx2(c), b = [34, 62, 52], t = dk > 1 ? 0.55 : 0.3; return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join(""); };

// ====================================================================================================
// IRON MARCHES OVERHAUL, CONCEPT ROUND 1: TREES (2026-11-28; art/briefs/overhaul-iron-round1.md, panel 2)
// Everything above this line is COPIED from src/render/overhaul/treeart.js (the Greenwood's approved treatment 4:
// crown(), bark(), trunk() with its root flares, leafMat, fillVar, dressMasses, SWAY). Below: the Iron set in LATE
// AUTUMN: Scots pine (orange upper bark, a flat cloud-pad crown), spruce (dark tiers), the wind-bent thorn (bare,
// a few rust leaves and red haws), the larch (gold, sparse tiers), and the ground cover (bracken, heather).
// Concept only: nothing in src/ imports this.
// ====================================================================================================
export const IP = {
  barkLo: "#4a3c36", barkHi: "#a2602f", barkThorn: "#52443a", barkLarch: "#6a4c3a",
  spruce: ["#2d4b43", "#264238"], pine: ["#37594d", "#2f4f47"],
  larch: ["#dcae3c", "#c8962f", "#b87a2a"], thorn: ["#a8482c", "#8a3a28", "#c06a30"], haw: "#cc3a2c",
};
const SPRUCE_T = { ...T4, gaps: 0.12, sky: 0.05, broken: 0.4 };

// one species per function; k size, dk wood depth 0..2 (darker), seed, o { lean (art px at the top, + = right), flag, flare, leafy }
export const IRON = {
  // Scots pine: a tall bare trunk, dark below, ORANGE above, the crown a few flat cloud pads
  scots(k = 1, dk = 0, seed = 3, o = {}) {
    const T = { ...T4, gaps: 0.22, sky: 0.12 }, V = fillVar(seed), L = (o.lean || 0) * k, side = h2(seed, 8, 4) < 0.5 ? -1 : 1;
    const hgt = (o.tall || 1) * k;
    return sprite(Math.ceil(170 * k + Math.abs(L) * 2), Math.ceil(184 * hgt), 10, T, (P) => {
      const lo = mat(IP.barkLo), hi = mat(IP.barkHi, { contrast: 1.1 }), lf = leafMat(deep(IP.pine[0], dk), { contrast: 1.12 }), lf2 = leafMat(deep(IP.pine[1], dk), { contrast: 1.12 }), un = mat(IP.pine[1]);
      const bend = (h2(seed, 3, 5) - 0.5) * 9 * k;
      const p1 = [bend + L * 0.06, -44 * hgt], p2 = [bend * 0.5 + L * 0.3, -88 * hgt], p3 = [L * 0.62, -124 * hgt];
      P.body(WOOD); trunk(P, [0, 0], 5.2 * k, [p1, p2, p3], [4.2 * k, 3.3 * k, 2.4 * k], lo, 40, seed, o.flare);
      bark(P, [[p2[0] * 0.9, p2[1] + 18 * k], p2, p3], [2.9 * k, 2.6 * k, 1.8 * k], hi, 41, { strokes: false, weld: 0 });
      const tips = [[-26 * k + L * 0.7, -130 * hgt], [24 * k + L * 0.9, -136 * hgt], [L * 0.75, -148 * hgt]];
      for (const t of tips) bark(P, [[p3[0], p3[1] + 8], t], [2.2 * k, 1.2], hi, 41, { strokes: false });
      const lowT = [p2[0] + side * 22 * k, p2[1] - 8 * k];
      bark(P, [[p2[0], p2[1] + 3], lowT], [2.4 * k, 1.1], lo, 41, { strokes: false });
      const M = [
        { x: tips[0][0], y: tips[0][1] - 4 * k, rx: 26 * k, ry: 10.5 * k, z: 60 }, { x: tips[1][0], y: tips[1][1] - 4 * k, rx: 24 * k, ry: 10 * k, z: 62 },
        { x: tips[2][0], y: tips[2][1] - 5 * k, rx: 24 * k, ry: 10.5 * k, z: 64 }, { x: lowT[0], y: lowT[1] - 4 * k, rx: 17 * k, ry: 7.5 * k, z: 58 },
      ].map((m, i) => ({ ...m, m: i % 2 ? lf2 : lf, bias: -Math.min(1, dk), split: 2 }));
      P.body(0); clothe(P, dressMasses(M, V, k), T, V, seed, un);
    });
  },
  // spruce: dark narrow tiers; o.lean leans the whole tree, o.flag skews the tiers to one side (a wind-flagged crown)
  spruce(k = 1, dk = 0, seed = 7, o = {}) {
    const T = SPRUCE_T, L = (o.lean || 0) * k, fg = o.flag || 0, n = o.tiers || 7, tall = (o.tall || 1) * 118 * k;
    return sprite(Math.ceil(92 * k + Math.abs(L) * 2), Math.ceil(tall + 22 * k), 8, T, (P) => {
      const bk = mat(IP.barkLo), lf = leafMat(deep(IP.spruce[0], dk), { contrast: 1.15 }), lf2 = leafMat(deep(IP.spruce[1], dk), { contrast: 1.15 });
      P.body(WOOD); trunk(P, [0, 0], 4 * k, [[L * 0.1, -24 * k]], [3.3 * k], bk, 40, seed, o.flare); P.body(0);
      const hem0 = -9 * k, sw = o.wide || 1;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1), hem = hem0 - tall * 0.8 * (i / n), hw = (31 - 23 * f) * k * sw * (0.9 + h2(i, seed, 2) * 0.2);
        const top = i === n - 1 ? hem0 - tall : hem - hw * 1.3 - 5 * k;
        const x = L * Math.pow(Math.min(1, (-hem) / tall), 1.4) + (o.sway || 0) * Math.pow(Math.min(1, (-hem) / tall), 1.3) + fg * hw * 0.22 + (h2(i, seed, 5) - 0.5) * 2 * k;
        const M = { tier: 1, x, top, hem, hw, m: i % 2 ? lf2 : lf, z: 40 + i * 6, bias: -Math.min(1, dk) };
        P.part(); crown(P, M, T, seed * 7 + i, sunL());
      }
    });
  },
  // wind-bent thorn: a twisted trunk leaning with the wind, bare boughs, a few rust leaf clumps, red haws
  thorn(k = 1, dk = 0, seed = 5, o = {}) {
    const L = (o.lean ?? 24) * k, leafy = o.leafy ?? 0.55, T = { ...T4, gaps: 0.3, sky: 0.22, leaf: 2.6, split: 1 }, V = fillVar(seed), R = rng(seed * 31 + 7);
    return sprite(Math.ceil(150 * k + Math.abs(L) * 2), Math.ceil(110 * k), 8, T, (P) => {
      const bk = mat(IP.barkThorn), haw = mat(IP.haw, { contrast: 1 }), lm = IP.thorn.map((c) => leafMat(c, { contrast: 1.1 })), un = mat(IP.thorn[1]);
      const f0 = [L * 0.5, -34 * k], pts = [[-2.5 * k + L * 0.12, -13 * k], [3 * k + L * 0.3, -25 * k], f0];
      P.body(WOOD); trunk(P, [0, 0], 4.6 * k, pts, [3.8 * k, 3.1 * k, 2.6 * k], bk, 40, seed, o.flare ?? 1);
      const tips = [], bows = [];
      const spread = [[-24, -52, 0.4], [-6, -68, 0.9], [18, -76, 1], [38, -66, 0.9], [54, -50, 0.7], [-34, -38, 0.3]];
      spread.forEach(([x, y, w], i) => {
        const tx = x * k + L * (0.6 + 0.5 * w), ty = y * k + (R() - 0.5) * 6 * k;
        const mid = [(f0[0] + tx) / 2 + (R() - 0.5) * 9 * k, (f0[1] + ty) / 2 + 6 * k];
        bark(P, [[f0[0], f0[1] + 3], mid, [tx, ty]], [2.6 * k, 1.8 * k, 0.9], bk, 41, { strokes: false });
        tips.push([tx, ty]); bows.push([f0[0], f0[1], tx, ty]);
        for (let q = 0; q < 2; q++) { const a = -0.4 - R() * 2.0 + (x > 0 ? 0.6 : -0.3), l = (9 + R() * 8) * k; bark(P, [[tx, ty], [tx + Math.cos(a) * l * 0.6, ty + Math.sin(a) * l * 0.6 - 1], [tx + Math.cos(a) * l, ty + Math.sin(a) * l]], [1.2, 0.9, 0.7], bk, 41, { strokes: false, weldRoot: 3 }); tips.push([tx + Math.cos(a) * l, ty + Math.sin(a) * l]); }
      });
      P.body(0);
      // sparse rust leaf: many SMALL flat clumps strung along the outer boughs (not balls on the tips), riding the sway
      const cl = [];
      tips.forEach(([x, y], i) => { if (R() < leafy) cl.push({ x: x + (R() - 0.5) * 6 * k, y: y - 1 * k, rx: (4.5 + R() * 3.5) * k, ry: (3 + R() * 2) * k, m: lm[(i + (R() * 3 | 0)) % 3], z: 60 + i, bias: 0, split: 1 }); });
      bows.forEach(([ax, ay, bx, by], i) => { for (const t of [0.62, 0.8]) if (R() < leafy) cl.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t - 1.5 * k, rx: (4 + R() * 3) * k, ry: (2.8 + R() * 2) * k, m: lm[(i + 1) % 3], z: 50 + i, bias: 0, split: 1 }); });
      if (cl.length) clothe(P, dressMasses(cl.slice(0, 16), V, k), { ...T, gaps: 0.1, sky: 0.08, edge: 2.4 }, V, seed, un);
      for (const [x, y] of tips) if (R() < 0.2) { P.dot(x + Math.round(R() * 4 - 2), y + 2 + Math.round(R() * 3), haw, 90, { n: [-0.3, -0.4, 0.8], noLine: true }); }
    });
  },
  // larch: a slim cone of soft gold tiers with the trunk showing between, rust at the low skirts
  larch(k = 1, dk = 0, seed = 11, o = {}) {
    const T = { ...T4, gaps: 0.34, sky: 0.22, leaf: 2.4, edge: 4.2, broken: 0.5 }, L = (o.lean || 0) * k, n = 10, tall = 114 * k;
    return sprite(Math.ceil(70 * k + Math.abs(L) * 2), Math.ceil(tall + 20 * k), 8, T, (P) => {
      const bk = mat(IP.barkLarch), ms = IP.larch.map((c) => leafMat(deep(c, dk * 0.5), { contrast: 1.12 }));
      P.body(WOOD); trunk(P, [0, 0], 3.4 * k, [[L * 0.1, -30 * k], [L * 0.45, -70 * k], [L * 0.85, -tall + 6 * k]], [2.9 * k, 2.3 * k, 1.4 * k], bk, 40, seed, o.flare ?? 2); P.body(0);
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1), hem = -22 * k - tall * 0.78 * (i / n), hw = (21 - 15 * f) * k * (0.72 + h2(i, seed, 2) * 0.5);
        const top = i === n - 1 ? -tall : hem - hw * 1.05 - 3 * k;
        const x = L * Math.pow(Math.min(1, -hem / tall), 1.3) + (o.sway || 0) * Math.pow(Math.min(1, -hem / tall), 1.3) + (h2(i, seed, 5) - 0.5) * 9 * k;
        const m = ms[(h2(i, seed, 9) < 0.28 + f * 0.1 ? 0 : h2(i, seed, 10) < 0.3 ? 2 : 1)];
        P.part(); crown(P, { tier: 1, x, top, hem, hw, m, z: 40 + i * 6, bias: 0 }, T, seed * 5 + i, sunL());
      }
    });
  },
};
export const IREACH = { scots: [74, 26], spruce: [54, 22], thorn: [30, 30], larch: [52, 16] };

// ---- ground cover, painted straight onto the canvas in ART px (the caller scales 0.5) ----
// bracken: rust fronds (short strokes fanned out), lit from the upper left, three tones; wind > 0 combs them right
const BR = [["#8a4a22", "#a85a2a", "#c87a36"], ["#7c3e22", "#9a4e28", "#b8683a"]];
export function bracken(ctx, px, py, rx, seed, wind = 0, dense = 1) {
  const r = rng(seed), ry = Math.max(3, rx * 0.5), N = Math.round(rx * 1.7 * dense);
  for (let n = 0; n < N; n++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * 0.95, x = Math.round(px + Math.cos(a) * d * rx), y = Math.round(py + Math.sin(a) * d * ry);
    const T = BR[(r() * 2) | 0], len = 3 + ((r() * 3) | 0), lean = Math.round(wind + (r() - 0.5) * 1.6);
    ctx.fillStyle = "rgba(40,24,18,0.35)"; ctx.fillRect(x - 1, y + 1, len + 1, 1);                  // the contact shade
    for (let q = 0; q < len; q++) { ctx.fillStyle = T[q < 1 ? 0 : q < len - 1 ? 1 : 2]; ctx.fillRect(x + Math.round(lean * q * 0.4), y - q, 1, 1); if (q > 0 && q < len - 1) { ctx.fillStyle = T[(q + (x & 1)) % 3]; ctx.fillRect(x + Math.round(lean * q * 0.4) - 1 + 2 * ((q + n) & 1), y - q, 1, 1); } }
  }
}
// heather: low dithered mounds, purple-brown with a pale lit lip and a few dry gold stems
const HE = ["#4e3a52", "#5f4864", "#735a76", "#8c7490"];
export function heather(ctx, px, py, rx, seed, dense = 1) {
  const r = rng(seed), ry = Math.max(2, rx * 0.46), N = Math.max(2, Math.round(rx / 5 * dense));
  for (let n = 0; n < N; n++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * 0.85, cx = px + Math.cos(a) * d * rx, cy = py + Math.sin(a) * d * ry, mr = 3 + ((r() * 4) | 0), mh = Math.max(2, Math.round(mr * 0.5));
    for (let j = -mh; j <= 0; j++) for (let i = -mr; i <= mr; i++) {
      const u = i / mr, v = j / mh, dd = u * u + v * v;
      if (dd > 1) continue;
      const tl = (-u * 0.5 - v * 0.9) * 0.6 + r() * 0.5 - 0.1;       // light from the upper left
      ctx.fillStyle = HE[tl > 0.62 ? 3 : tl > 0.4 ? 2 : tl > 0.15 ? 1 : 0];
      if (dd > 0.55 && ((i + j) & 1) && r() < 0.6) continue;
      ctx.fillRect(Math.round(cx + i), Math.round(cy + j), 1, 1);
    }
    ctx.fillStyle = "rgba(30,20,34,0.3)"; ctx.fillRect(Math.round(cx - mr + 1), Math.round(cy + 1), mr * 2, 1);
    if (r() < 0.4) { ctx.fillStyle = "#b09a4a"; ctx.fillRect(Math.round(cx + (r() - 0.5) * mr), Math.round(cy - mh - 1), 1, 1); }
  }
}
// larch needles lying gold on the ground
export function larchLitter(ctx, px, py, rx, seed) {
  const r = rng(seed), ry = rx * 0.5;
  for (let n = 0; n < rx * rx * 0.2; n++) {
    const a = r() * 6.283, d = Math.pow(r(), 0.7), x = Math.round(px + Math.cos(a) * d * rx), y = Math.round(py + Math.sin(a) * d * ry);
    ctx.fillStyle = ["#c8962f", "#dcae3c", "#a8742a"][(r() * 3) | 0]; ctx.fillRect(x, y, r() < 0.3 ? 2 : 1, 1);
  }
}
