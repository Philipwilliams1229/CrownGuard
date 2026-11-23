// The overhaul's tree painter (B3; art/briefs/overhaul-build-millrace.md, "Trees"), COPIED from the approved
// concept `concept/overhaul2-trees.js` (rounds 5 and 6: treatment 4 only, five fills, layer orders, one welded
// trunk-bough-root body, four root flares, no dead limbs; the strand willow) with the lab-only parts stripped:
// summer only (the other seasons stay in the concept), no winter twigs, no dusk shade, no loops' clocks.
// Sculpted with the game's pixel sculptor, one art px per half board unit, lit from the level's sun (spriteSun).
// Nothing here runs at module load (pix.js is used only inside functions).

import { Pix, mat, flat, toCanvas } from "../pix/pix.js";
import { DAY, spriteSun } from "../../data/sun.js";
import { sunRim } from "../sceneryday.js";

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
function trunk(P, [x0, y0], r, pts, radii, bk, z, seed, force) {
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

// ---- species: (k size, dk wood depth 0..2, seed, o { flare, form, wet }) -> { cv, ax, ay, leaf, lb } ----
export const SP = {
  roundoak(k = 1, dk = 0, seed = 1, o = {}) {
    const T = T4, V = fillVar(seed), SK = skelOf(V, k);
    return sprite(Math.ceil(132 * k), Math.ceil(128 * k), 10, T, (P) => {
      const bk = mat(PAL.bark), lf = leafMat(deep(oakCol(seed), dk)), un = mat(oakCol(seed), { contrast: 1.3 });
      const TT = SK(0, -30 * k), TR = SK(0, -28 * k);
      P.body(WOOD); trunk(P, [0, 0], 6.5 * k, [TT], [5 * k], bk, 40, seed, o.flare);
      const BO = [[-20, -52], [18, -50], [0, -62]].map(([x, y], i) => SK(x * k, y * k, i + 1, Math.abs(x) / 20));
      for (const pt of BO) bark(P, [TR, pt], [3 * k, 1.8], bk, 41, { strokes: false });
      const M = [
        { x: 0, y: -94 * k, rx: 24 * k, ry: 18 * k, z: 54 },
        { x: -18 * k, y: -76 * k, rx: 24 * k, ry: 18 * k, z: 58 }, { x: 18 * k, y: -76 * k, rx: 24 * k, ry: 18 * k, z: 59 },
        { x: -32 * k, y: -54 * k, rx: 20 * k, ry: 15 * k, z: 64 }, { x: 0, y: -52 * k, rx: 24 * k, ry: 16 * k, z: 66 }, { x: 32 * k, y: -54 * k, rx: 20 * k, ry: 15 * k, z: 65 },
      ].map((m) => ({ ...m, m: lf, bias: -Math.min(1, dk), split: 2 }));
      P.body(0); clothe(P, dressMasses(M, V, k), T, V, seed, un);
    });
  },
  oak(k = 1, dk = 0, seed = 1, o = {}) {
    const T = T4, V = fillVar(seed), SK = skelOf(V, k);
    return sprite(Math.ceil(176 * k), Math.ceil(156 * k), 10, T, (P) => {
      const bk = mat(PAL.bark), lf = leafMat(deep(oakCol(seed), dk)), lf2 = leafMat(deep(oakCol2(seed), dk)), un = mat(oakCol(seed), { contrast: 1.3 }), ms = mat(PAL.moss);
      const FK = SK(0, -52 * k);
      P.body(WOOD); trunk(P, [0, 0], 7.5 * k, [SK(-1 * k, -28 * k), FK], [6.2 * k, 5.6 * k], bk, 40, seed, o.flare);
      P.ellipse(-3 * k, -12 * k, 2.5 * k, 4 * k, ms, 41, { wrap: true });
      [[-34, -76], [32, -74], [2, -98]].forEach(([x, y], i) => {
        const oo = Math.abs(x) / 34, sd = Math.sign(x), lead = i === 2;
        const pts = lead ? [FK, SK(0.5 * k, -66 * k), SK(x * 0.6 * k, -80 * k, 0, 0.3), SK(x * k, y * k * 0.92, i + 1, 0.4)]
          : [SK(sd * 1 * k, -50 * k), SK(x * 0.22 * k, -58 * k, 0, oo * 0.2), SK(x * 0.52 * k, -66 * k, 0, oo * 0.5), SK(x * 0.86 * k, y * k * 0.94, i + 1, oo)];
        bark(P, pts, lead ? [3.6 * k, 2.8 * k, 2 * k, 1.3] : [4.6 * k, 3.6 * k, 2.6 * k, 1.5], bk, 41, { strokes: false, weldRoot: 10 * k });
      });
      const M = [
        { x: -38 * k, y: -80 * k, rx: 32 * k, ry: 26 * k, m: lf, z: 60 }, { x: 36 * k, y: -78 * k, rx: 32 * k, ry: 26 * k, m: lf2, z: 62 },
        { x: -4 * k, y: -110 * k, rx: 38 * k, ry: 27 * k, m: lf, z: 56 }, { x: 4 * k, y: -70 * k, rx: 24 * k, ry: 16 * k, m: lf2, z: 72 },
        { x: -60 * k, y: -66 * k, rx: 16 * k, ry: 12 * k, m: lf, z: 66 }, { x: 58 * k, y: -64 * k, rx: 16 * k, ry: 12 * k, m: lf2, z: 66 },
      ].map((m) => ({ ...m, bias: -Math.min(1, dk) }));
      if (V.open > 0.5 || V.reach > 0.6) { M[2].ry *= 1.2; M[2].y -= 2 * k; M.push({ x: -22 * k, y: -98 * k, rx: 24 * k, ry: 20 * k, m: lf2, z: 58, bias: M[0].bias }, { x: 22 * k, y: -96 * k, rx: 24 * k, ry: 20 * k, m: lf, z: 59, bias: M[0].bias }); }
      P.body(0); clothe(P, dressMasses(M, V, k), T, V, seed, un);
    });
  },
  beech(k = 1, dk = 0, seed = 2, o = {}) {
    const T = T4, V = fillVar(seed), SK = skelOf(V, k);
    return sprite(Math.ceil(116 * k), Math.ceil(164 * k), 10, T, (P) => {
      const bk = mat("#857868"), lf = leafMat(deep(PAL.beech, dk)), un = mat(PAL.beech, { contrast: 1.3 });
      const FK = SK(1 * k, -40 * k), F2 = SK(1 * k, -38 * k), BL = SK(-12 * k, -70 * k, 1, 0.8), BR = SK(14 * k, -76 * k, 2, 0.9);
      P.body(WOOD); trunk(P, [0, 0], 5.5 * k, [FK], [4.4 * k], bk, 40, seed, o.flare);
      bark(P, [F2, BL], [2.8 * k, 1.6], bk, 41, { strokes: false });
      bark(P, [F2, BR], [2.8 * k, 1.6], bk, 41, { strokes: false });
      const M = [
        { x: 0, y: -120 * k, rx: 28 * k, ry: 26 * k, z: 56 }, { x: -16 * k, y: -90 * k, rx: 26 * k, ry: 25 * k, z: 60 },
        { x: 16 * k, y: -86 * k, rx: 26 * k, ry: 25 * k, z: 62 }, { x: 0, y: -58 * k, rx: 28 * k, ry: 18 * k, z: 70 },
      ].map((m) => ({ ...m, m: lf, bias: -Math.min(1, dk) }));
      P.body(0); clothe(P, dressMasses(M, V, k), T, V, seed, un);
    });
  },
  pine(k = 1, dk = 0, seed = 3, o = {}) {
    const T = T4;
    return sprite(Math.ceil(78 * k), Math.ceil(124 * k), 8, T, (P) => {
      const bk = mat(PAL.bark), lf = leafMat(deep(PAL.pine, dk), { contrast: 1.15 }), lf2 = leafMat(deep(PAL.pine2, dk), { contrast: 1.15 });
      P.body(WOOD); trunk(P, [0, 0], 4 * k, [[0, -26 * k]], [3.4 * k], bk, 40, seed, o.flare); P.body(0);
      const n = 5, tall = 96 * k, hem0 = -10 * k;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1), hem = hem0 - tall * 0.78 * (i / n), hw = (32 - 22 * f) * k * (0.92 + h2(i, seed, 2) * 0.16);
        const top = i === n - 1 ? hem0 - tall : hem - hw * 1.25 - 6 * k;
        const M = { tier: 1, x: (h2(i, seed, 5) - 0.5) * 2 * k, top, hem, hw, m: i % 2 ? lf2 : lf, z: 40 + i * 6, bias: -Math.min(1, dk) };
        P.part(); crown(P, M, T, seed * 7 + i, sunL());
      }
    });
  },
  // the approved STRAND willow (concept round 3, summer): loose bunches of long thin leafed withies off each arch;
  // o.form 0 broad old waterside, 1 tall narrow, 2 young; o.wet -1 / 1: the water lies that side (strands trail in)
  willow(k = 1, dk = 0, seed = 4, o = {}) {
    const T = T3, form = o.form ?? 0, F = [
      { w: 116, h: 100, lean: 5, tr: 5.2, fork: -26, boughs: [[-34, -60, -44, -52], [-12, -74, -18, -68], [12, -76, 20, -70], [34, -62, 46, -52]], hw: 9, hem: -12 },
      { w: 86, h: 116, lean: 3, tr: 4.2, fork: -40, boughs: [[-20, -84, -28, -76], [2, -98, 2, -92], [22, -86, 30, -78]], hw: 9, hem: -14 },
      { w: 70, h: 72, lean: 2, tr: 2.6, fork: -22, boughs: [[-16, -50, -22, -44], [4, -58, 6, -52], [20, -48, 26, -42]], hw: 7, hem: -8 },
    ][form];
    return sprite(Math.ceil((F.w + 24) * k), Math.ceil((F.h + 20) * k) + (o.wet ? 6 : 0), o.wet ? 16 : 10, T, (P) => {
      const bk = mat("#6a4e36"), col = PAL.willow;
      const fx = F.lean * k, fy = F.fork * k;
      P.body(WOOD); trunk(P, [0, 0], F.tr * k, [[fx * 0.4, fy * 0.5], [fx, fy]], [F.tr * 0.8 * k, F.tr * 0.7 * k], bk, 40, seed, o.flare);
      const ends = [];
      F.boughs.forEach(([ax, ay, ex, ey], i) => {
        const r0 = Math.max(1.3, F.tr * 0.55 * k);
        const bm = [(fx + ax * k) / 2 + ax * 0.15 * k, (fy + ay * k) / 2 - 6 * k];
        bark(P, [[fx, fy], bm, [bm[0] + (ax * k - bm[0]) * 0.55, bm[1] + (ay * k - bm[1]) * 0.55 + 2 * k]], [r0, r0 * 0.75, Math.max(0.9, r0 * 0.45)], bk, 21 + i * 0.1, { strokes: false });
        ends.push([ax * k, ay * k, ex * k, ey * k]);
      });
      P.body(0);
      const hem = F.hem * k;
      const lcol = deep(col, dk), leafM = [leafMat(lcol), leafMat(lcol, { contrast: 1.1 })], core = mat("#6a7a3a");
      const RS = rng(seed * 7 + form);
      ends.forEach(([ax, ay, ex, ey], i) => {
        const si = SWAY.at ? SWAY.at(i) : 0;
        const n0 = Math.round(F.hw * 3.1 * k);
        for (let m = 0; m < n0; m++) {
          const t = (m + 0.5) / n0, side = Math.sign(ex - fx) || 1;
          const x0 = ax + (ex - ax) * t + (RS() - 0.5) * F.hw * 2.2 * k, y0 = ay + (ey - ay) * t - 1 * k + Math.abs(x0 - ax) * 0.08;
          const far = RS() < 0.35, lenR = RS(), outR = RS(), ph = RS();
          let len = (hem - y0) * (0.55 + lenR * 0.5);
          const wet = o.wet && side === o.wet && Math.abs(x0 - fx) > F.hw * 0.9 * k && lenR > 0.45;
          if (wet) len = -y0 + (1 + outR * 9) * k;
          const out = side * (0.3 + outR * 1.1), z = far ? 22 + i : 50 + i + m * 0.01;
          const lit = (x0 < fx + 4 * k) && !far;
          let tipX = 0, tipY = 0;
          for (let q = 0; q < len; q++) {
            const f = q / len, X = Math.round(x0 + out * f * 3 + Math.round(si * Math.pow(f, 1.4) * 0.8)), Y = Math.round(y0 + q);
            tipX = X; tipY = Y;
            P.dot(X, Y, far ? leafM[1] : core, z, { n: [-0.3, 0.2, 0.9], bias: far ? -2 : 0, noLine: true });
            if ((((q + Math.floor(ph * 4)) & 1) === 0 || !far) && f > 0.03) {
              const sd = (((q + Math.floor(ph * 4)) >> (far ? 1 : 0)) & 1) ? 1 : -1, lm = leafM[(m + q) % 2];
              const b0 = (far ? -2 : 0) + (lit && f < 0.55 ? 1 : 0) + (f > 0.85 ? -1 : 0) - Math.min(1, dk);
              P.dot(X + sd, Y, lm, z + 0.5, { n: [sd * 0.5, 0.2, 0.85], bias: b0, noLine: true });
              P.dot(X + sd, Y + 1, lm, z + 0.5, { n: [sd * 0.5, 0.4, 0.8], bias: b0 - (sd > 0 ? 1 : 0), noLine: true });
              if (h2(m * 977 + i * 31, q, seed + 2) < 0.3) P.dot(X + 2 * sd, Y + 2, lm, z + 0.4, { n: [sd * 0.6, 0.5, 0.6], bias: b0 - 1, noLine: true });
            }
          }
          // where a strand trails into the water, a still ring round its tip (the live ripples are B1's water)
          if (wet) for (const [dx, dy] of [[-3, 1], [-2, 1], [2, 1], [3, 1], [-1, 2], [1, 2], [0, 2]]) P.dot(tipX + dx, tipY + dy, flat("#e4f2f4"), 10, { unlit: true });
        }
        for (let m = 0; m < F.hw * 2.4 * k; m++) {
          const t = RS(), X = Math.round(ax + (ex - ax) * t), Y = Math.round(ay + (ey - ay) * t - 1 - RS() * 2);
          P.dot(X, Y, leafM[0], 60 + i, { n: [-0.5, -0.6, 0.6], bias: 1, noLine: true }); P.dot(X + 1, Y + 1, leafM[1], 60 + i, { n: [0.2, -0.2, 0.9], noLine: true });
        }
      });
    });
  },
  birches(k = 1, dk = 0, seed = 5, o = {}) {
    const T = T4, V = fillVar(seed), SK = skelOf(V, k);
    return sprite(Math.ceil(136 * k), Math.ceil(168 * k), 10, T, (P) => {
      const bk = mat(PAL.birchBark), mk = mat(PAL.mark), lf = leafMat(PAL.birch), un = mat(PAL.birch, { contrast: 1.3 });
      const stems = [[-20, 3, -30, 118, -3], [4, 0, 9, 134, 3], [24, 5, 34, 108, 6]];
      P.body(WOOD);
      stems.forEach(([x0, y0, x1, h, bend], n) => {
        const top = SK(x1 * k, (y0 - h) * k, n + 1, Math.abs(x1) / 34), mid = SK((x0 + bend) * k, (y0 - h * 0.5) * k, 0, 0.5);
        const pts = [[x0 * k, y0 * k], mid, top];
        trunk(P, pts[0], 3 * k, [mid, top], [2.4 * k, 1.2], bk, 40 + y0, seed * 3 + n, o.flare === undefined ? 2 : o.flare);
        for (let t = 0.08; t < 0.8; t += 0.1 + h2(n, t * 100, seed) * 0.08) {
          const y = pts[0][1] + (pts[2][1] - pts[0][1]) * t, x = pts[0][0] + (pts[2][0] - pts[0][0]) * t + bend * k * Math.sin(t * Math.PI) * 0.5;
          P.line(x - 2, y, x + (h2(n, t * 99, 3) > 0.5 ? 1 : 0), y, mk, 41 + y0, { wrap: true });
        }
      });
      const M = [[-32, -112, 18, 14], [-26, -88, 18, 13], [10, -130, 20, 14], [12, -104, 21, 14], [36, -100, 17, 13], [34, -78, 15, 11]];
      const MM = dressMasses(M.map(([mx, my, rx, ry], i) => ({ x: mx * k, y: my * k, rx: rx * k, ry: ry * k, m: lf, z: 60 + i * 4, bias: -Math.min(1, dk), split: 1, noUnder: true })), V, k);
      P.body(0); clothe(P, MM, { ...T, sky: T.sky + 0.06 }, V, seed, un);
    });
  },
  hawthorn(k = 1, dk = 0, seed = 6, o = {}) {
    const T = T4, V = fillVar(seed), SK = skelOf(V, k);
    return sprite(Math.ceil(116 * k), Math.ceil(98 * k), 8, T, (P) => {
      const bk = mat(PAL.bark), lf = leafMat(PAL.haw), un = mat(PAL.haw, { contrast: 1.3 }), bl = mat(PAL.blossom, { contrast: 0.6 });
      const C2 = SK(-20 * k, -30 * k, 1, 1), C1 = SK(3 * k, -30 * k);
      P.body(WOOD); trunk(P, [0, 0], 4.2 * k, [SK(-5 * k, -16 * k), C1], [3.2 * k, 2.4 * k], bk, 40, seed, o.flare);
      bark(P, [SK(-4 * k, -14 * k), C2], [2.2 * k, 1.2], bk, 41, { strokes: false });
      const HM = dressMasses([[-18, -44, 22, 16], [18, -46, 22, 16], [0, -58, 24, 15], [0, -36, 18, 10]].map(([x, y, rx, ry], i) => ({ x: x * k, y: y * k, rx: rx * k, ry: ry * k, m: lf, z: 60 + i * 5, bias: -Math.min(1, dk) })), V, k);
      P.body(0); clothe(P, HM, T, V, seed, un);
      // a few sprays of late blossom on the sunny side (summer: hawBloom 0.35), riding with the swaying masses
      const r = rng(seed * 101), N = Math.round(26 * PAL.hawBloom);
      for (let n = 0; n < N; n++) {
        const a = -2.3 + (r() - 0.5) * 2.6, d = 0.45 + r() * 0.5, cx = Math.cos(a) * d * 38 * k, cy = -48 * k + Math.sin(a) * d * 22 * k;
        let nd = 1e9, ox = 0; for (const M of HM) { const dd = Math.hypot(M.x - cx, M.y - cy); if (dd < nd) { nd = dd; ox = M._dx || 0; } }
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 1]].slice(0, 2 + (n % 3))) P.dot(cx + dx + ox, cy + dy, bl, 120, { n: [-0.4, -0.5, 0.75], wrap: true });
      }
    });
  },
};
// canopy middle height and radius (board units at k 1), for keeping crowns off the road's lanes
export const REACH = { roundoak: [36, 30], oak: [46, 40], beech: [48, 24], pine: [32, 18], willow: [26, 28], birches: [52, 28], hawthorn: [24, 22] };

// ---- the place a lone tree stands in (summer): trodden earth, litter, a few flowers; evergreens a needle floor ----
// ctx in ART px (the caller scales 0.5): (px, py) the foot, rx the ring's half width, art px
export function standRing(ctx, px, py, rx, seed, ever = false) {
  const r = rng(seed), ry = rx * 0.48;
  if (ever) return needleRing(ctx, px, py, rx, ry, r, seed);
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
    const d = Math.hypot(i / rx, j / ry); if (d > 0.85) continue;
    const th = d < 0.4 ? 0.55 : d < 0.65 ? 0.3 : 0.12;
    if (h2(Math.floor((i + 999) / 2), j + 999, seed) > th) continue;
    ctx.fillStyle = "rgba(70,74,30,0.26)"; ctx.fillRect(Math.round(px + i), Math.round(py + j), 1, 1);
  }
  for (let n = 0; n < 5; n++) { r(); r(); }
  const litter = ["#8a6a3a", "#a88044", "#6a7a34"];
  const N = rx * rx * 0.22;
  for (let n = 0; n < N; n++) {
    const a = r() * 6.283, d = Math.pow(r(), 0.6);
    if (r() > 1.2 - d * 0.8) continue;
    const x = Math.round(px + Math.cos(a) * d * rx), y = Math.round(py + Math.sin(a) * d * ry);
    ctx.fillStyle = litter[(r() * litter.length) | 0]; ctx.fillRect(x, y, r() < 0.3 ? 2 : 1, 1);
  }
  const fl = ["#f2eee0", "#f4d860", "#f0c8d8"];
  for (let n = 0; n < rx * 0.3; n++) {
    const a = r() * 6.283, d = 0.7 + r() * 0.5, x = Math.round(px + Math.cos(a) * d * rx), y = Math.round(py + Math.sin(a) * d * ry);
    const c = fl[(r() * fl.length) | 0];
    for (const [dx, dy] of [[0, 0], [2, 1], [-1, 1]].slice(0, 1 + (n % 3))) { ctx.fillStyle = "#3e6a2a"; ctx.fillRect(x + dx, y + dy + 1, 1, 1); ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, 1, 1); }
  }
}
function needleRing(ctx, px, py, rx, ry, r, seed) {
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
    const d = Math.hypot(i / rx, j / ry); if (d > 0.9) continue;
    const th = d < 0.45 ? 0.75 : d < 0.7 ? 0.42 : 0.14;
    if (h2(Math.floor((i + 999) / 2), j + 999, seed) > th) continue;
    ctx.fillStyle = "rgba(112,74,40,0.34)"; ctx.fillRect(Math.round(px + i), Math.round(py + j), 1, 1);
  }
  const nd = ["#7e5634", "#8a6038"];
  for (let n = 0; n < rx * rx * 0.08; n++) {
    const a = r() * 6.283, d = Math.pow(r(), 0.7), x = Math.round(px + Math.cos(a) * d * rx * 0.85), y = Math.round(py + Math.sin(a) * d * ry * 0.85);
    ctx.fillStyle = nd[(r() * nd.length) | 0]; ctx.fillRect(x, y, 1, 1);
  }
  const sticks = Math.floor(h2(seed | 0, 9, 13) * 3);   // round 6: 0-2 fallen twigs, a third of pines none
  for (let n = 0; n < sticks; n++) {
    const a = r() * 6.283, d = 0.35 + r() * 0.5, x = Math.round(px + Math.cos(a) * d * rx), y = Math.round(py + Math.sin(a) * d * ry), up = r() < 0.5;
    ctx.fillStyle = "#6a4a2e"; ctx.fillRect(x, y, 3, 1); ctx.fillStyle = "#8e6a44"; ctx.fillRect(up ? x + 1 : x, y - (up ? 1 : 0), up ? 2 : 1, 1);
  }
  for (let n = 0; n < 1 + (h2(seed | 0, 11, 13) < 0.5 ? 1 : 0); n++) {
    const a = r() * 6.283, d = 0.25 + r() * 0.6, x = Math.round(px + Math.cos(a) * d * rx * 0.9), y = Math.round(py + Math.sin(a) * d * ry * 0.9);
    ctx.fillStyle = "#4a3020"; ctx.fillRect(x, y + 1, 3, 1); ctx.fillStyle = "#7a5030"; ctx.fillRect(x, y, 2, 1); ctx.fillStyle = "#b07c48"; ctx.fillRect(x, y, 1, 1);
  }
}
