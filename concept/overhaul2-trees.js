// ============ OVERHAUL CONCEPT ROUND 2: GREENWOOD TREES (2026-11-22, art/briefs/overhaul-round2.md) ============
// Round 1's C ("a living wood") was chosen, but its fine all-over leaf stipple read as fuzz ("chia pets").
// This round keeps C's direction (each tree in its own place, a layered wood, small life, seasons) and
// tries FIVE crown treatments from today's lobes to C's texture. The rules of each are at the top of
// concept/overhaul2-trees.md. The leaf machinery is one function, crown(): big masses with a smooth dome
// normal (calm interiors, four tone bands), and leaf CELLS (Voronoi cells, `leaf` px across) used only
// where a treatment asks: the silhouette's edge (scalloped by whole leaf cells), the terminator (a band
// round each tone step where a whole cell takes one tone and gets a dark separation on its lower right),
// a few flecks in the light or the shade, dark bough gaps showing the under-crown, and a lit outline
// that is broken (dropped beside the brightest leaves) instead of a ring.
// Sculpted with the game's pixel sculptor (src/render/pix/pix.js), one art px per half board unit.
// Concept only: nothing in src/ imports this.

import { Pix, mat, flat, toCanvas } from "../src/render/pix/pix.js";
import { DAY, spriteSun } from "../src/data/sun.js";
import { sunRim } from "../src/render/sceneryday.js";

export const rng = (seed) => { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
export const h2 = (x, y, s) => { let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---- the five treatments ------------------------------------------------------------------------------
//  split   how many lobes each big mass breaks into (1 = the big mass itself)
//  leaf    leaf-cell size, art px;   edge   silhouette band, px, scalloped by whole cells
//  band    terminator band (light units) where a whole cell takes one tone;  sep  its dark lower-right rim
//  dither  a checker across the tone step instead of leaves (2)
//  fleck   leaf shapes picked out in the light;  shade  in the shade;  all  texture everywhere (5)
//  gaps    dark bough gaps in the lower crown;  sky  see-through holes near the rim
//  broken  share of the lit outline dropped;   core  the underside pushed down a tone
export const TREAT = {
  1: { name: "1 Today's lobes",    split: 4, leaf: 3,   edge: 2,   band: 0,    sep: 0,   dither: 0, fleck: 0.18, shade: 0,    all: 0, gaps: 0,    sky: 0,    broken: 0,    core: 0.6 },
  2: { name: "2 Clean masses",     split: 2, leaf: 4,   edge: 2.5, band: 0,    sep: 0,   dither: 1, fleck: 0,    shade: 0,    all: 0, gaps: 0.06, sky: 0,    broken: 0.25, core: 1 },
  3: { name: "3 Leafy terminator", split: 1, leaf: 3.5, edge: 3,   band: 0.1,  sep: 1,   dither: 0, fleck: 0.07, shade: 0.04, all: 0, gaps: 0.1,  sky: 0.03, broken: 0.55, core: 1 },
  4: { name: "4 Broken canopy",    split: 2, leaf: 3,   edge: 3.5, band: 0.15, sep: 1,   dither: 0, fleck: 0.16, shade: 0.1,  all: 0, gaps: 0.15, sky: 0.08, broken: 0.4,  core: 1 },
  5: { name: "5 C, calmed",        split: 1, leaf: 3.4, edge: 3,   band: 0,    sep: 0.5, dither: 0, fleck: 0,    shade: 0,    all: 1, gaps: 0.08, sky: 0.04, broken: 0.3,  core: 1 },
};

// ---- palettes per season ----------------------------------------------------------------------------
const BASE = { bark: "#6e4a30", barkUp: "#a8623a", birchBark: "#e2ddcc", mark: "#3a3034", moss: "#6f8f3a", pine: "#3d7650", pine2: "#356a48", willow: "#88ae4a" };
export const PAL = {
  summer: { ...BASE, oak: ["#5c9a3c", "#4f8f3e", "#64a040"], beech: "#5a9440", birch: "#8ab846", bush: "#4f8f3a", haw: "#5f9a40", blossom: "#f4eee4", flower: ["#f2eee0", "#f0c8d8", "#f4d860"], hawBloom: 0.35 },
  spring: { ...BASE, oak: ["#86c04c", "#7ab448", "#94c858"], beech: "#9ccc5a", birch: "#b0d868", bush: "#76b04a", haw: "#78b04a", blossom: "#fbf6f0", flower: ["#6c7ae8", "#f4e070", "#f6f2ea"], willow: "#a6cc5c", hawBloom: 1, bluebells: true },
  autumn: { ...BASE, oak: ["#6a9a3c", "#a8ac38", "#d0a832", "#c8902c", "#c47a2c", "#b8582a"], beech: "#c86a2a", birch: "#e6be38", bush: "#a8442a", haw: "#b85a2c", blossom: "#c8342a", flower: ["#e8b040", "#d86a3a", "#f2eee0"], willow: "#d4b83c", moss: "#8a8a3a", hawBloom: 0.5, berries: true },
  winter: { ...BASE, oak: ["#8a6a44"], beech: "#a07a48", birch: "#8a8a6a", bush: "#5a6a44", haw: "#5a4a3a", blossom: "#c8342a", flower: ["#f4f6f8"], willow: "#7a7a4a", bare: true, snow: "#f2f6fa", pine: "#2f6a4e", pine2: "#2a5e46", hawBloom: 0, berries: true },
};

// ---- the sun as the sculptor sees it ----
const sunL = () => { const S = spriteSun(false) || [-0.6, -0.62, 0.5], l = Math.hypot(S[0], S[1], S[2]); return [S[0] / l, S[1] / l, S[2] / l]; };
const TH = [0.06, 0.5, 0.86];
const nearTH = (v) => Math.min(Math.abs(v - TH[0]), Math.abs(v - TH[1]), Math.abs(v - TH[2]));
const tone = (v) => (v > TH[0]) + (v > TH[1]) + (v > TH[2]);

// a mass's shape: { x, y, rx, ry } an egg;  { tier: 1, x, top, hem, hw } a pine tier (a skirt)
function geom(M, px, py) {
  if (M.casc) {
    const dh = M.hw * 0.85, sy = M.top + dh;
    if (py < sy) {
      const u = (px - M.x) / M.hw, v = (py - sy) / dh, d = Math.hypot(u, v), dm = Math.min(d, 0.97), nz = Math.sqrt(1 - dm * dm);
      return { d, nx: (u / Math.max(d, 1e-3)) * dm, ny: (v / Math.max(d, 1e-3)) * dm, nz, v: 0 };
    }
    const t = clamp((py - sy) / Math.max(1, M.hem - sy), 0, 1), cx = M.x + (M.drift || 0) * t * t, w = M.hw * (1 - 0.55 * Math.pow(t, 1.3)) + 0.5;
    const u = (px - cx) / w;
    let d = Math.abs(u);
    if (py > M.hem - 2) d = Math.max(d, 1 + (py - M.hem + 2) / 4);
    const nx = clamp(u, -1, 1) * 0.8, ny = 0.12 + 0.72 * t, nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
    return { d, nx, ny, nz, v: 0.15 + 0.85 * t };
  }
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
const bbox = (M) => M.casc ? [M.x - M.hw - 6 + Math.min(0, M.drift || 0), M.top - 4, M.x + M.hw + 6 + Math.max(0, M.drift || 0), M.hem + 6] : M.tier ? [M.x - M.hw - 6, M.top - 4, M.x + M.hw + 6, M.hem + 6] : [M.x - M.rx - 6, M.y - M.ry - 6, M.x + M.rx + 6, M.y + M.ry + 6];

// break a big mass into lobes (treatments 1, 2, 4): a centre lobe and a ring round it
function splitMass(M, n, seed) {
  if (n <= 1 || M.tier) return [M];
  const out = [], r = rng(seed);
  if (n === 2) {
    out.push({ ...M, x: M.x - M.rx * 0.32, y: M.y + M.ry * 0.08, rx: M.rx * 0.72, ry: M.ry * 0.8, z: M.z });
    out.push({ ...M, x: M.x + M.rx * 0.3, y: M.y - M.ry * 0.12, rx: M.rx * 0.72, ry: M.ry * 0.8, z: M.z + 1 });
    return out;
  }
  const k = n - 1;
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2 + r() * 0.6 - 1.2;
    out.push({ ...M, x: M.x + Math.cos(a) * M.rx * 0.45, y: M.y + Math.sin(a) * M.ry * 0.42, rx: M.rx * 0.55, ry: M.ry * 0.55, z: M.z + (Math.sin(a) > 0 ? 2 : 0) });
  }
  out.push({ ...M, x: M.x - M.rx * 0.08, y: M.y - M.ry * 0.12, rx: M.rx * 0.6, ry: M.ry * 0.6, z: M.z + 3 });
  return out;
}

// ---- THE CROWN: one leaf mass, through the treatment ----------------------------------------------------
function crown(P, M, T, seed, L) {
  const cl = T.leaf, mn = M.tier || M.casc ? Math.max(4, M.hw * 0.6) : Math.min(M.rx, M.ry), ebD = T.edge / mn;
  // leaf cells may be stretched and slanted (a willow's long narrow leaves hanging down): ly tall, shear slant
  const ly = M.ly || 1, sh = M.shear || 0, sx = M.sx || 0;   // sx: the mass's sway offset (its leaves ride with it)
  const ctr = (ix, iy) => [(ix + 0.1 + 0.8 * h2(ix, iy, seed)) * cl, (iy + 0.1 + 0.8 * h2(iy, ix, seed + 7)) * cl];
  const [x0, y0, x1, y1] = bbox(M);
  const dot = (g) => g.nx * L[0] + g.ny * L[1] + g.nz * L[2];
  for (let j = Math.floor(y0 + P.oy); j <= Math.ceil(y1 + P.oy); j++) for (let i = Math.floor(x0 + P.ox); i <= Math.ceil(x1 + P.ox); i++) {
    const px = i + 0.5 - P.ox, py = j + 0.5 - P.oy, g = geom(M, px, py);
    if (g.d > 1 + ebD) continue;
    // the leaf cell this pixel sits in
    const TX = (px - sx) - sh * py, TY = py / ly, gx = Math.floor(TX / cl), gy = Math.floor(TY / cl);
    let f1 = 1e9, f2 = 1e9, bx = 0, by = 0, cx = 0, cy = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const [qx, qy] = ctr(gx + a, gy + b), dd = Math.hypot(TX - qx, TY - qy);
      if (dd < f1) { f2 = f1; f1 = dd; by = qy * ly; bx = qx + sx + sh * by; cx = gx + a; cy = gy + b; } else if (dd < f2) f2 = dd;
    }
    const gc = geom(M, bx, by), cellH = h2(cx, cy, seed + 3);
    // silhouette: whole leaf cells, so the edge is a fringe of leaves, never a fuzz of single pixels
    const edge = g.d > 1 - ebD;
    if (edge && !(gc.d < 1 + ebD * (0.15 + 0.7 * cellH) - ebD * 0.4 && f1 < cl * (0.5 + 0.2 * cellH))) continue;
    // bough gaps (dark: the under-crown shows) and sky holes (see-through) — big cells, lower crown / rim
    const G = 6.5, hx = Math.floor((px - sx) / G), hy = Math.floor(py / G), hc = h2(hx, hy, seed + 21);
    const hcx = (hx + 0.5) * G + sx, hcy = (hy + 0.5) * G, hd = Math.hypot((px - hcx) / G, (py - hcy) / (G * 0.8));
    if (!M.tier && !M.noGaps && T.gaps && g.v > 0.05 && g.d < 0.8 && hc < T.gaps && hd < 0.42) continue;
    if (!M.tier && !M.noGaps && T.sky && g.d > 0.62 && g.d < 0.92 && hc > 1 - T.sky && hd < 0.36) { P._sky = P._sky || []; P._sky.push([i, j]); continue; }
    let n = g, bias = M.bias || 0;
    const v = dot(g), vc = dot(gc), t = tone(v), tc = tone(vc);
    const sepPx = (f2 - f1) < 1.05 && (px - bx) + (py - by) > 0;     // the lower-right rim of a leaf
    const lipPx = (px - bx) + (py - by) < -cl * 0.45;                // its upper-left lip
    if (T.all) {
      // C, calmed: every cell a little leaf, its normal leaned toward the cell's own dome; the rims only half the time
      const w = 0.35, cu = (px - bx) / (cl * 0.8), cv = (py - by) / (cl * 0.8), cd = Math.min(0.95, Math.hypot(cu, cv));
      n = { nx: gc.nx * (1 - w) + cu * w, ny: gc.ny * (1 - w) + cv * w, nz: gc.nz * (1 - w) + Math.sqrt(1 - cd * cd) * w };
      if (sepPx && cellH < T.sep && tc > 0) bias -= 1;
    } else if (T.band && nearTH(vc) < T.band) {
      // the terminator: a band of whole leaves, each one tone, each with a dark rim on its shade side
      n = gc;
      if (sepPx && T.sep) bias -= 1;
      else if (lipPx && tc >= 2 && cellH < 0.5) bias += 1;
    } else if (T.dither && nearTH(v) < 0.045 && ((i + j) & 1)) {
      bias += v > (TH[1]) ? -0.01 : 0; n = gc;   // a checker across the step (the cell's tone on alternate pixels)
    } else if (edge && T.sep) {
      n = gc; if (sepPx) bias -= 1;               // the silhouette's leaves keep their shape
    } else if (T.fleck && t >= 3 && cellH < T.fleck) {
      n = gc; if (sepPx) bias -= 1;               // a few leaves picked out in the sun
    } else if (T.shade && t <= 1 && cellH < T.shade) {
      n = gc; if (lipPx) bias += 1;               // a leaf catching the bounce light in the shade
    } else if (edge) n = gc;
    if (M.casc && g.v > 0.88) bias -= 1;   // a cascade's hem a tone down (the fall's shade comes from its normal)
    if (M.tier && py > M.hem - 3.5 && g.d < 1.2) bias -= (py > M.hem - 1.5 ? 2 : 1);   // each skirt's shaded hem: the tiers stay apart
    if (T.core && g.v > 0.25 && !M.tier && !M.casc) bias -= T.core * clamp((g.v - 0.25) * 2.4, 0, 1) * (g.d < 0.85 ? 1 : 0.5);
    if (sx || P._sxm) (P._sxm ||= new Int8Array(P.w * P.h))[j * P.w + i] = sx;
    P._put(i, j, M.m, M.z + g.nz * 8, n.nx, n.ny, n.nz, { bias, edge: T.lobeEdge !== false }, (1 - g.d) * mn);
  }
}

// a bark limb (trunk, bough, root) with a few vertical bark strokes
function bark(P, pts, radii, m, z, o = {}) {
  P.part();
  P.limb(pts, radii, m, z, { zb: o.zb ?? z });
  if (o.strokes !== false) for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], r = Array.isArray(radii) ? radii[s] : radii;
    if (r < 2.5) continue;
    for (let k = -1; k <= 1; k += 2) P.toneLine(ax + k * r * 0.35, ay, bx + k * r * 0.3, by, -1);
  }
}

// the sprite: build into a Pix, resolve, break the lit outline, rim-light under a low sun
const LEAFM = new Set();
function sprite(w, h, foot, T, build, o = {}) {
  const P = new Pix(w, h, Math.floor(w / 2), h - foot);
  build(P);
  const R = P.resolve({ line: "tint", keepLv: true });
  if (T && T.broken) {
    const d = R.data, ring = P._ring, lv = P._lv;
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
      const k = j * w + i;
      if (!ring[k]) continue;
      let lit = false, sq = 0;     // the drop pattern rides with the swaying mass beside it (no shimmer)
      for (const q of [k + 1, k + w, k - 1, k - w]) if (P.m[q] >= 0 && LEAFM.has(P.m[q]) && lv[q] >= 3 && !ring[q]) { lit = true; sq = P._sxm ? P._sxm[q] : 0; }
      if (lit && h2((i - sq) >> 1, j >> 1, 91) <= T.broken) d[k * 4 + 3] = 0;
    }
  }
  if (DAY.on && DAY.warm) { // the low sun's colour on the tree itself (the board's grade does the same to the figures)
    const d = R.data, wk = DAY.warm * 0.55, rose = DAY.tone === "rose";
    for (let k = 0; k < d.length; k += 4) if (d[k + 3]) { d[k] = Math.min(255, d[k] * (1 + 0.12 * wk) + 8 * wk); d[k + 1] = d[k + 1] * (1 - (rose ? 0.06 : 0.01) * wk); d[k + 2] = d[k + 2] * (1 - (rose ? 0.02 : 0.2) * wk); }
  }
  const cv = toCanvas(R);
  if (DAY.on) sunRim(cv, DAY.side < 0);
  return { cv, ax: Math.floor(w / 2), ay: h - foot };
}
const leafMat = (c, o) => { const m = mat(c, o); LEAFM.add(m); return m; };
const sw = (s, f) => Math.round(s * Math.pow(clamp(f, 0, 1), 1.4));

// ---- ROUND 4: SWAY for the animated loops (art/briefs/overhaul-animation.md) ----
// A lab sets SWAY.at(i) = this frame's lean, in art px at the crown's top, of leaf mass (or pine tier, or willow
// bunch) i, before it bakes a tree; null = still. Whole masses move by whole pixels and their leaf cells, gaps and
// broken outline ride with them, so a sway never shimmers. Trunks and boughs never move. SWAY.t = the loop's clock
// (seconds), for the willow's ripples. SWAY.log collects the offsets used (the lab counts distinct poses).
export const SWAY = { at: null, t: null, log: null };
const swayOf = (i, hf) => { if (!SWAY.at) return 0; const d = Math.round(SWAY.at(i) * Math.pow(clamp(hf, 0, 1), 1.3)); if (SWAY.log) SWAY.log.push(d); return d; };
function swayMasses(masses) {
  if (!SWAY.at) return masses;
  const top = Math.max(1, ...masses.map((M) => -(M.y ?? M.hem ?? 0)));
  return masses.map((M, i) => { const d = swayOf(i, -(M.y ?? 0) / top); M._dx = d; return d ? { ...M, x: M.x + d, sx: d } : M; });
}

// lay masses through a treatment: the dark under-crown first (where the gaps look into), then the lobes
function leafMasses(P, masses, T, seed, under) {
  const L = sunL();
  masses = swayMasses(masses);
  if (under) for (const M of masses) if (!M.tier && !M.noUnder) { P.part(); P.ellipse(M.x, M.y + M.ry * 0.25, M.rx * 0.78, M.ry * 0.6, under, M.z - 30, { fix: 0 }); }
  let i = 0;
  for (const M of masses) for (const L2 of splitMass(M, M.split ?? T.split, seed + i * 7)) { P.part(); crown(P, L2, T, seed * 13 + i * 31, L); i++; }
}

// ---- bare winter boughs: a branching skeleton, twigs to the crown's envelope, snow on the upper sides ----
function bareCrown(P, root, ang, len, r, depth, bk, z, seed, pal, envelope) {
  const R = rng(seed);
  const grow = (x, y, a, L, rr, d) => {
    const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
    if (envelope && !envelope(ex, ey) && d < depth - 1) { // keep the twigs inside the tree's crown shape
      const k = 0.6; return grow(x, y, a, L * k, rr, d + 1);
    }
    if (rr >= 1.2) { P.part(); P.limb([[x, y], [(x + ex) / 2 + (R() - 0.5) * 2, (y + ey) / 2 + (R() - 0.5) * 2], [ex, ey]], [rr, rr * 0.85, rr * 0.7], bk, z + d); }
    else P.line(x, y, ex, ey, bk, z + d, { n: [-0.3, -0.5, 0.8] });
    // snow on the upper side of the near-flat limbs
    if (pal.snow && rr >= 1 && Math.abs(Math.sin(a)) < 0.75) {
      const sn = mat(pal.snow, { contrast: 0.5 });
      for (let t = 0.15; t < 0.95; t += 1 / L) { const xx = x + (ex - x) * t, yy = y + (ey - y) * t - rr - 0.3; if (h2(Math.round(xx), Math.round(yy), seed) < 0.75) P.dot(xx, yy, sn, z + d + 5, { n: [0, -0.8, 0.6] }); }
    }
    if (d >= depth) return;
    const kids = d < 2 ? 2 + (R() < 0.4 ? 1 : 0) : 2;
    for (let c = 0; c < kids; c++) {
      const spread = (c - (kids - 1) / 2) * (0.55 + R() * 0.3) + (R() - 0.5) * 0.3;
      grow(ex, ey, a + spread - (a + Math.PI / 2) * 0.08, L * (0.68 + R() * 0.14), Math.max(0.5, rr * 0.66), d + 1);
    }
  };
  grow(root[0], root[1], ang, len, r, 0);
}

// ---- ROUND 3 winter: the SAME tree, leafless (owner: "make sure the tree shape doesn't change too much") ----
// The summer boughs stay where they were; each summer LEAF MASS becomes a fan of twigs on the bough nearest it: a
// short limb from the bough to a hub low in the mass, then rays to the mass's own rim, each forking toward its end.
// So the twigs fill exactly the outline the leaves had. Inner twigs dark (no outline), the tips paler (a soft lacy
// edge against snow or grass), a little snow along the flatter limbs.
function twigMasses(P, masses, roots, bk, pal, seed, k, z = 42) {
  const R = rng(seed * 17 + 3), sn = pal.snow ? mat(pal.snow, { contrast: 0.5 }) : null;
  const twD = mat("#5c4230"), twT = mat("#8c745e", { contrast: 0.7 });
  const snowOn = (ax, ay, bx, by, r, zz) => {
    if (!sn || Math.abs(by - ay) > Math.abs(bx - ax) * 0.9) return;
    const L = Math.hypot(bx - ax, by - ay);
    for (let t = 0.1; t < 0.9; t += 1 / Math.max(2, L)) { const xx = ax + (bx - ax) * t, yy = ay + (by - ay) * t - r - 0.4; if (h2(Math.round(xx), Math.round(yy), seed + 9) < 0.7) P.dot(xx, yy, sn, zz + 5, { n: [0, -0.8, 0.6] }); }
  };
  const topY = Math.max(1, ...masses.map((M) => -M.y));
  masses.forEach((M, mi) => {
    const tdx = swayOf(mi, -M.y / topY);     // the loops' tremble: only the pale tips move, the limbs hold
    let best = roots[0], bd = 1e9;
    for (const r of roots) { const d = Math.hypot(r[0] - M.x, (r[1] - M.y) * 1.3); if (d < bd) { bd = d; best = r; } }
    // the hub sits LOW in the mass, toward its bough: the twigs fan UP and out from it (a crown, not a starburst)
    const hx = M.x + (best[0] - M.x) * 0.25, hy = M.y + M.ry * 0.55;
    const r0 = Math.max(1.1, 2.2 * k), zz = z + mi * 0.2;
    P.part(); P.limb([[best[0], best[1]], [(best[0] + hx) / 2 + (R() - 0.5) * 2, (best[1] + hy) / 2 - 1], [hx, hy]], [r0, r0 * 0.8, Math.max(0.9, r0 * 0.6)], bk, zz);
    snowOn(best[0], best[1], hx, hy, r0, zz);
    // rays to the rim over its upper ~260 degrees (the underside is under other masses, or the bough itself)
    const N = Math.round(6 + (M.rx + M.ry) * 0.16);
    const twig = (ax, ay, ex, ey, zt) => {     // a fine twig: dark inner two-thirds, a pale tip, a small side fork
      const qx = ax + (ex - ax) * 0.62, qy = ay + (ey - ay) * 0.62;
      P.line(ax, ay, qx, qy, twD, zt, { noLine: true, n: [-0.3, -0.5, 0.8] });
      P.line(qx, qy, ex + tdx, ey, twT, zt, { noLine: true, n: [-0.4, -0.6, 0.7] });
      const fa = Math.atan2(ey - ay, ex - ax) + (R() < 0.5 ? 0.55 : -0.55), fl = 2 + R() * 2;
      P.line(qx, qy, qx + Math.cos(fa) * fl + tdx, qy + Math.sin(fa) * fl, twT, zt, { noLine: true, n: [-0.4, -0.6, 0.7] });
    };
    for (let n = 0; n < N; n++) {
      const a = Math.PI * (0.88 + 1.24 * (n + 0.3 + R() * 0.4) / N);           // from lower-left over the top to lower-right
      const reach = 0.94 + R() * 0.06;
      const ex = M.x + Math.cos(a) * M.rx * reach, ey = M.y + Math.sin(a) * M.ry * reach;
      const mx = hx + (ex - hx) * 0.5 + (R() - 0.5) * 2, my = hy + (ey - hy) * 0.5;
      if (n % 2 === 0 && M.rx > 10 * k) { P.part(); P.limb([[hx, hy], [mx, my]], [Math.max(0.8, 1.1 * k), 0.7], bk, zz + 1); snowOn(hx, hy, mx, my, 1, zz + 1); }
      else P.line(hx, hy, mx, my, twD, zz + 1, { noLine: true, n: [-0.3, -0.5, 0.8] });
      // two or three twigs off the ray's middle to neighbouring rim points, one more into the mass's inside
      const kids = 2 + (R() < 0.5 ? 1 : 0);
      for (let c = 0; c < kids; c++) {
        const da = (c - (kids - 1) / 2) * (1.6 / N) * 1.4 + (R() - 0.5) * 0.08, rr = 0.9 + R() * 0.1;
        twig(mx, my, M.x + Math.cos(a + da) * M.rx * rr, M.y + Math.sin(a + da) * M.ry * rr, zz + 2);
      }
      if (n < 3) {   // and a few hang down and out from the hub, so the mass's underside is twigs too, not a flat cut
        const la = Math.PI * (0.15 + 0.7 * ((n + R() * 0.6) / 3)), lr = 0.8 + R() * 0.15;
        twig(hx, hy, M.x + Math.cos(la) * M.rx * lr, M.y + Math.sin(la) * M.ry * lr, zz + 1.5);
      }
      const ia = a + (R() - 0.5) * 0.6, ir = 0.45 + R() * 0.3;
      twig(hx + (mx - hx) * 0.5, hy + (my - hy) * 0.5, M.x + Math.cos(ia) * M.rx * ir, M.y + Math.sin(ia) * M.ry * ir, zz + 1.5);
    }
  });
}

// ---- ROUND 3: the mix (owner: "this broken canopy mixed in with the ones from C"): treatment 3 or 4 per tree, by
// its seed (never by species), about half each
export const mixT = (seed) => (h2(seed | 0, 17, 5) < 0.5 ? TREAT[3] : TREAT[4]);

// ---- species --------------------------------------------------------------------------------------------
// each returns { cv, ax, ay }; args (pal, k, sway, dk (wood depth tint), seed, T)
const oakCol = (pal, seed) => pal.oak[Math.abs(seed | 0) % pal.oak.length];
// a tree's SECOND leaf colour is a NEIGHBOUR of its first on the palette's ramp, never two steps away
// (owner, 2026-11-22: "green and yellow, yellow and orange, orange and red. but not jumping from green to orange")
const oakCol2 = (pal, seed) => { const n = pal.oak.length, i = Math.abs(seed | 0) % n; return pal.oak[i + 1 < n ? i + 1 : Math.max(0, i - 1)]; };
// the wood's depth: deeper trees take a cooler, darker leaf (a dark roof), not just a tone down
const hx2 = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const deep = (c, dk) => { if (!dk) return c; const a = hx2(c), b = [34, 62, 52], t = dk > 1 ? 0.55 : 0.3; return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const ugly = (c) => c;
export const SP = {
  // today's round oak: a tidy dome of lobes on a short stout trunk (owner: keep today's styles)
  roundoak(pal, k = 1, s = 0, dk = 0, seed = 1, T = TREAT[3]) {
    return sprite(Math.ceil(120 * k), Math.ceil(124 * k), 10, T, (P) => {
      const bk = mat(pal.bark), lf = leafMat(deep(oakCol(pal, seed), dk)), un = mat(oakCol(pal, seed), { contrast: 1.3 });
      for (const [x, y] of [[-11, 4], [10, 4], [2, 5]]) bark(P, [[0, -5], [x * 0.6 * k, y * 0.3 * k], [x * k, y * k]], [3.2 * k, 2 * k, 1], bk, 41, { strokes: false });
      bark(P, [[0, 2], [0, -30 * k]], [6.5 * k, 5 * k], bk, 40);
      const BO = [[-20, -52], [18, -50], [0, -62]];
      for (const [x, y] of BO) bark(P, [[0, -28 * k], [x * k, y * k]], [3 * k, 1.8], bk, pal.bare ? 41 : 30, { strokes: false });
      const M = [
        { x: sw(s, 1), y: -94 * k, rx: 24 * k, ry: 18 * k, z: 54 },
        { x: -18 * k + sw(s, 0.8), y: -76 * k, rx: 24 * k, ry: 18 * k, z: 58 }, { x: 18 * k + sw(s, 0.8), y: -76 * k, rx: 24 * k, ry: 18 * k, z: 59 },
        { x: -32 * k, y: -54 * k, rx: 20 * k, ry: 15 * k, z: 64 }, { x: 0, y: -52 * k, rx: 24 * k, ry: 16 * k, z: 66 }, { x: 32 * k, y: -54 * k, rx: 20 * k, ry: 15 * k, z: 65 },
      ].map((m) => ({ ...m, m: lf, bias: -Math.min(1, dk), split: Math.min(T.split, 2) }));
      if (pal.bare) { twigMasses(P, M, [[0, -28 * k], ...BO.map(([x, y]) => [x * k, y * k])], bk, pal, seed, k); marcescent(P, pal, 1, seed, M.map((m) => [m.x, m.y, m.rx * 0.8, m.ry * 0.8]), 0.3); return; }
      leafMasses(P, M, T, seed, un);
    });
  },
  // C's bigger spreading oak, with a visible fork and boughs
  oak(pal, k = 1, s = 0, dk = 0, seed = 1, T = TREAT[3]) {
    return sprite(Math.ceil(158 * k), Math.ceil(150 * k), 10, T, (P) => {
      const bk = mat(pal.bark), lf = leafMat(deep(oakCol(pal, seed), dk)), lf2 = leafMat(deep(oakCol2(pal, seed), dk)), un = mat(oakCol(pal, seed), { contrast: 1.3 }), ms = mat(pal.moss);
      for (const [x, y] of [[-15, 4], [13, 5], [3, 6]]) bark(P, [[0, -6], [x * 0.7 * k, y * 0.4 * k], [x * k, y * k]], [3.6 * k, 2.4 * k, 1.2], bk, 41, { strokes: false });
      bark(P, [[0, 2], [-1 * k, -26 * k], [0, -42 * k]], [7.5 * k, 6 * k, 5.4 * k], bk, 40);
      P.ellipse(-3 * k, -12 * k, 2.5 * k, 4 * k, ms, 41, { wrap: true });
      const BO = [[-34, -76], [32, -74], [2, -96]];
      for (const [x, y] of BO) bark(P, [[0, -40 * k], [x * 0.5 * k, (y + 18) * 0.7 * k], [x * k * 0.85, y * k * 0.9]], [4 * k, 2.8 * k, 1.8], bk, pal.bare ? 41 : 30, { strokes: false });
      const M = [
        { x: -38 * k, y: -80 * k, rx: 32 * k, ry: 26 * k, m: lf, z: 60 }, { x: 36 * k, y: -78 * k, rx: 32 * k, ry: 26 * k, m: lf2, z: 62 },
        { x: -4 * k + sw(s, 0.9), y: -110 * k, rx: 38 * k, ry: 27 * k, m: lf, z: 56 }, { x: 4 * k, y: -70 * k, rx: 24 * k, ry: 16 * k, m: lf2, z: 72 },
        { x: -60 * k, y: -66 * k, rx: 16 * k, ry: 12 * k, m: lf, z: 66 }, { x: 58 * k, y: -64 * k, rx: 16 * k, ry: 12 * k, m: lf2, z: 66 },
      ].map((m) => ({ ...m, bias: -Math.min(1, dk) }));
      if (pal.bare) { twigMasses(P, M, [[0, -40 * k], ...BO.map(([x, y]) => [x * k * 0.85, y * k * 0.9]), ...BO.map(([x, y]) => [x * 0.5 * k, (y + 18) * 0.7 * k])], bk, pal, seed, k); marcescent(P, pal, 1, seed, M.map((m) => [m.x, m.y, m.rx * 0.8, m.ry * 0.8]), 0.25); return; }
      leafMasses(P, M, T, seed, un);
    });
  },
  // today's tall oval (beech / elm)
  beech(pal, k = 1, s = 0, dk = 0, seed = 2, T = TREAT[3]) {
    return sprite(Math.ceil(96 * k), Math.ceil(160 * k), 10, T, (P) => {
      const bk = mat("#857868"), lf = leafMat(deep(pal.beech, dk)), un = mat(pal.beech, { contrast: 1.3 });
      for (const [x, y] of [[-9, 4], [9, 4]]) bark(P, [[0, -5], [x * k, y * k]], [3 * k, 1.2], bk, 41, { strokes: false });
      bark(P, [[0, 2], [1 * k, -40 * k]], [5.5 * k, 4.4 * k], bk, 40);
      bark(P, [[1 * k, -38 * k], [-12 * k, -70 * k]], [2.8 * k, 1.6], bk, pal.bare ? 41 : 30, { strokes: false });
      bark(P, [[1 * k, -38 * k], [14 * k, -76 * k]], [2.8 * k, 1.6], bk, pal.bare ? 41 : 30, { strokes: false });
      if (pal.bare) bark(P, [[1 * k, -38 * k], [0, -100 * k]], [2.6 * k, 1.4], bk, 41, { strokes: false });   // the leader, hidden by the leaves in summer
      const M = [
        { x: sw(s, 1), y: -120 * k, rx: 28 * k, ry: 26 * k, z: 56 }, { x: -16 * k, y: -90 * k, rx: 26 * k, ry: 25 * k, z: 60 },
        { x: 16 * k, y: -86 * k, rx: 26 * k, ry: 25 * k, z: 62 }, { x: 0, y: -58 * k, rx: 28 * k, ry: 18 * k, z: 70 },
      ].map((m) => ({ ...m, m: lf, bias: -Math.min(1, dk) }));
      if (pal.bare) { twigMasses(P, M, [[1 * k, -38 * k], [-12 * k, -70 * k], [14 * k, -76 * k], [0, -100 * k], [0, -60 * k]], bk, pal, seed, k); marcescent(P, pal, 1, seed, M.map((m) => [m.x, m.y, m.rx * 0.8, m.ry * 0.8]), 0.35); return; }
      leafMasses(P, M, T, seed, un);
    });
  },
  // today's tiered pine (the owner likes it): five skirts, scalloped hems, through the treatment
  pine(pal, k = 1, s = 0, dk = 0, seed = 3, T = TREAT[3]) {
    return sprite(Math.ceil(78 * k), Math.ceil(124 * k), 8, T, (P) => {
      const bk = mat(pal.bark), lf = leafMat(deep(pal.pine, dk), { contrast: 1.15 }), lf2 = leafMat(deep(pal.pine2, dk), { contrast: 1.15 });
      bark(P, [[0, 2], [0, -26 * k]], [4 * k, 3.4 * k], bk, 40, { strokes: false });
      for (const x of [-7, 7]) bark(P, [[0, -4], [x * k, 3 * k]], [2.4 * k, 1], bk, 41, { strokes: false });
      const n = 5, tall = 96 * k, hem0 = -10 * k;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1), hem = hem0 - tall * 0.78 * (i / n), hw = (32 - 22 * f) * k * (0.92 + h2(i, seed, 2) * 0.16);
        const top = i === n - 1 ? hem0 - tall : hem - hw * 1.25 - 6 * k;
        const dxp = swayOf(i, (i + 1) / n);   // a pine's skirts lean in turn, the top most
        const M = { tier: 1, x: sw(s, (-hem) / tall) + (h2(i, seed, 5) - 0.5) * 2 * k + dxp, sx: dxp, top, hem, hw, m: i % 2 ? lf2 : lf, z: 40 + i * 6, bias: -Math.min(1, dk) };
        P.part(); crown(P, M, T, seed * 7 + i, sunL());
        if (pal.snow) { // snow lies on each skirt's upper slope
          const sn = mat(pal.snow, { contrast: 0.5 });
          for (let x = -hw; x <= hw; x++) { const yy = top + (hem - top) * Math.pow((Math.abs(x) - 1) / hw, 1.25) - 1; if (Math.abs(x) < hw * 0.92 && h2(x, i, seed) < 0.8) { P.dot(M.x + x, yy + 1, sn, 99, { n: [0, -0.8, 0.6] }); if (h2(x, i, seed + 1) < 0.5) P.dot(M.x + x, yy + 2, sn, 99, { n: [0, -0.6, 0.8] }); } }
        }
      }
    });
  },
  // a weeping willow in treatment 3's language: a leaning trunk forking into arching boughs; the crown as
  // separate CASCADES that spring up off each bough and fall, each lit on its shoulder and shaded beneath, gaps
  // between them showing the boughs; a few tapering strands of different lengths below each hem (waterside ones
  // trail into the water with a ripple); long narrow leaves only along the light's edge and the ragged hem.
  //   o.form 0 a broad old waterside willow, 1 tall and narrow, 2 young;  o.wet -1 / 1: the water lies that side
  willow(pal, k = 1, s = 0, dk = 0, seed = 4, T = TREAT[3], o = {}) {
    const form = o.form ?? 0, F = [
      { w: 116, h: 100, lean: 5, tr: 5.2, fork: -26, boughs: [[-34, -60, -44, -52], [-12, -74, -18, -68], [12, -76, 20, -70], [34, -62, 46, -52]], hw: 9, hem: -12 },
      { w: 86, h: 116, lean: 3, tr: 4.2, fork: -40, boughs: [[-20, -84, -28, -76], [2, -98, 2, -92], [22, -86, 30, -78]], hw: 9, hem: -14 },
      { w: 70, h: 72, lean: 2, tr: 2.6, fork: -22, boughs: [[-16, -50, -22, -44], [4, -58, 6, -52], [20, -48, 26, -42]], hw: 7, hem: -8 },
    ][form];
    return sprite(Math.ceil((F.w + 24) * k), Math.ceil((F.h + 20) * k) + (o.wet ? 6 : 0), o.wet ? 16 : 10, T, (P) => {
      const bk = mat("#6a4e36"), col = pal.bare ? "#b08a40" : pal.willow, lf = leafMat(deep(col, dk)), lfB = leafMat(deep(col, 2), { contrast: 0.9 });
      const R = rng(seed * 5 + form), L = sunL();
      // trunk: a lean, a flared foot, a fork
      const fx = F.lean * k, fy = F.fork * k;
      bark(P, [[0, 2], [fx * 0.4, fy * 0.5], [fx, fy]], [F.tr * k, F.tr * 0.8 * k, F.tr * 0.7 * k], bk, 40);
      for (const x of [-1, 1]) bark(P, [[0, -3], [x * F.tr * 1.8 * k, 2 * k]], [F.tr * 0.5 * k, 1], bk, 41, { strokes: false });
      // the boughs arch up and out, then droop at their ends (where the cascades hang)
      const ends = [];
      F.boughs.forEach(([ax, ay, ex, ey], i) => {
        const r0 = Math.max(1.3, F.tr * 0.55 * k);
        bark(P, [[fx, fy], [(fx + ax * k) / 2 + ax * 0.15 * k, (fy + ay * k) / 2 - 6 * k], [ax * k, ay * k], [ex * k + sw(s, 0.6), ey * k]], [r0, r0 * 0.8, r0 * 0.6, Math.max(1, r0 * 0.4)], bk, 30 + i, { strokes: false });
        ends.push([ax * k, ay * k, ex * k + sw(s, 0.6), ey * k]);
      });
      const hem = F.hem * k;
      if (!o.old) {
        // THE STRAND WILLOW (owner: the winter row's shape, leafed): loose bunches of long thin withies off each
        // arch. Leafed, each withy is a line of small narrow leaves set alternately either side; a bunch reads as a
        // soft curtain you can see through. Winter: about half the withies, shorter, no leaf, a little snow.
        // Sway moves each whole strand by whole pixels (the leaves keep their places on it: no shimmer).
        const bare = !!pal.bare, spring = pal.willow === PAL.spring.willow, autumn = pal.willow === PAL.autumn.willow;
        const wd = [mat("#c49a48"), mat("#a87c3a"), mat("#8a6634")];
        const lcol = deep(col, dk), leafM = [leafMat(lcol), leafMat(lcol, { contrast: 1.1 })], core = mat(autumn ? "#9a7a3a" : "#6a7a3a");
        const kit = flat("#efe2a0"), drop = mat("#e0b848");
        const RS = rng(seed * 7 + form);               // structure only (the sway never draws from it)
        ends.forEach(([ax, ay, ex, ey], i) => {
          const si = SWAY.at ? SWAY.at(i) : s;         // each bunch swings on its own beat (loops)
          const n0 = Math.round(F.hw * (bare ? 0.85 : spring ? 2.2 : 3.1) * k);
          const ex0 = ex - sw(s, 0.6);                   // the arch's own end, without the bough's sway
          for (let m = 0; m < n0; m++) {
            const t = (m + 0.5) / n0, side = Math.sign(ex0 - fx) || 1;
            const x0 = ax + (ex0 - ax) * t + (RS() - 0.5) * F.hw * 2.2 * k, y0 = ay + (ey - ay) * t - 1 * k + Math.abs(x0 - ax) * 0.08;
            const far = RS() < 0.35, lenR = RS(), outR = RS(), ph = RS();
            let len = (hem - y0) * (bare ? 0.3 + lenR * 0.35 : spring ? 0.45 + lenR * 0.45 : 0.55 + lenR * 0.5);
            const wet = o.wet && side === o.wet && Math.abs(x0 - fx) > F.hw * 0.9 * k && !bare && lenR > 0.45;
            if (wet) len = -y0 + (1 + outR * 9) * k;   // round 3: the trailing strands end at different depths (no straight hem at the water)
            const out = side * (0.3 + outR * 1.1), z = far ? 22 + i : 50 + i + m * 0.01;
            const lit = (x0 < fx + 4 * k) && !far;        // the sunward bunches are lit, the far ones darker
            let lastX = null, tipX = 0, tipY = 0;
            for (let q = 0; q < len; q++) {
              const f = q / len, X = Math.round(x0 + out * f * 3 + Math.round(sw(si, f) * 0.8)), Y = Math.round(y0 + q);
              tipX = X; tipY = Y;
              if (bare) { P.dot(X, Y, wd[m % 3], z, { n: [m & 1 ? 0.5 : -0.5, 0.1, 0.85], noLine: f > 0.15 }); if (f < 0.5 && (q & 1)) P.dot(X + (m & 1 ? 1 : -1), Y, wd[2], z - 0.5, { n: [0, 0.3, 0.9], noLine: true }); continue; }
              P.dot(X, Y, far ? leafM[1] : core, z, { n: [-0.3, 0.2, 0.9], bias: far ? -2 : 0, noLine: true });
              // a leaf every other pixel, alternate sides, slanting down: 2 px, sometimes 3
              if ((((q + Math.floor(ph * 4)) & 1) === 0 || !far) && f > 0.03) {
                if (autumn && h2(m * 977 + i * 31, q, seed) < 0.25) continue;      // autumn: some already fallen
                if (spring && h2(m * 977 + i * 31, q, seed + 1) < 0.3) continue;   // spring: sparser, still opening
                const sd = (((q + Math.floor(ph * 4)) >> (far ? 1 : 0)) & 1) ? 1 : -1, lm = leafM[(m + q) % 2];
                const b0 = (far ? -2 : 0) + (lit && f < 0.55 ? 1 : 0) + (f > 0.85 ? -1 : 0) - Math.min(1, dk);
                P.dot(X + sd, Y, lm, z + 0.5, { n: [sd * 0.5, 0.2, 0.85], bias: b0, noLine: true });
                P.dot(X + sd, Y + 1, lm, z + 0.5, { n: [sd * 0.5, 0.4, 0.8], bias: b0 - (sd > 0 ? 1 : 0), noLine: true });
                if (h2(m * 977 + i * 31, q, seed + 2) < 0.3) P.dot(X + 2 * sd, Y + 2, lm, z + 0.4, { n: [sd * 0.6, 0.5, 0.6], bias: b0 - 1, noLine: true });
                if (spring && h2(m * 977 + i * 31, q, seed + 3) < 0.12) P.dot(X - sd, Y + 1, kit, z + 1, { unlit: true });   // catkins
              }
              lastX = X;
            }
            if (wet && SWAY.t == null) for (const [dx, dy] of [[-3, 1], [-2, 1], [2, 1], [3, 1], [-1, 2], [1, 2], [0, 2]]) P.dot(tipX + dx, tipY + dy, flat("#e4f2f4"), 10, { unlit: true });
            else if (wet) {
              // the loop: the tip dips and a ring spreads from it every 2 s (each strand on its own beat), fading as it grows
              const u = (SWAY.t / 2 + h2(m, i, seed + 40)) % 1, rr = 1.5 + u * 6, ry = rr * 0.42, pale = flat("#e4f2f4"), mid = flat("#b4d6e2");
              P.dot(tipX, tipY + 1, pale, 10, { unlit: true });
              if (u < 0.8) for (let a = 0; a < 6.283; a += 1 / rr) {
                if (u > 0.45 && h2(Math.round(a * 10), m, i) < (u - 0.45) * 2.2) continue;   // the ring breaks up as it fades (fixed per angle)
                P.dot(tipX + Math.cos(a) * rr, tipY + 1 + Math.sin(a) * ry, u < 0.4 ? pale : mid, 10, { unlit: true });
              }
            }
            void lastX;
          }
          // a few short leafy sprigs standing on the arch itself (so the crown's top is not a bare line)
          if (!bare) for (let m = 0; m < F.hw * 2.4 * k; m++) {
            const t = RS(), X = Math.round(ax + (ex0 - ax) * t + sw(s, 0.6) * t), Y = Math.round(ay + (ey - ay) * t - 1 - RS() * 2);
            P.dot(X, Y, leafM[0], 60 + i, { n: [-0.5, -0.6, 0.6], bias: 1, noLine: true }); P.dot(X + 1, Y + 1, leafM[1], 60 + i, { n: [0.2, -0.2, 0.9], noLine: true });
          }
        });
        if (autumn) { const r = rng(seed * 3); for (let n = 0; n < 8; n++) P.dot((r() - 0.5) * F.w * k, -10 - r() * 40 * k, drop, 90, { n: [0, 0, 1], noLine: true }); }
        if (pal.snow) for (const [ax, ay] of ends) for (let x = -3; x <= 3; x++) P.dot(ax + x, ay - 2 - (Math.abs(x) > 2 ? -1 : 0), mat(pal.snow, { contrast: 0.5 }), 70, { n: [0, -0.8, 0.6] });
        return;
      }
      // the back cascades (dim, between and behind the front ones: depth through the gaps)
      const back = ends.slice(0, -1).map(([ax, ay, ex, ey], i) => { const [bx2, by2] = ends[i + 1]; return { casc: 1, x: (ex + bx2) / 2, top: Math.min(ey, by2) - 6 * k, hem: hem - 10 * k, hw: F.hw * 0.55 * k, m: lfB, z: 20, noGaps: true, ly: 2.4, shear: 0 }; });
      // the front cascades, one off each bough end; outer ones drift outward as they fall
      const front = [];
      ends.forEach(([ax, ay, ex, ey], i) => {
        const side = Math.sign(ex - fx) || (i % 2 ? 1 : -1), outer = i === 0 || i === ends.length - 1;
        front.push({ casc: 1, x: ex, top: ey - F.hw * 0.7 * k, hem: hem - (outer ? 0 : 4 * k) - R() * 5 * k, hw: F.hw * k * (outer ? 1.05 : 1), drift: side * (outer ? 6 : 3) * k + sw(s, 0.4),
          m: lf, z: 64 + (outer ? 0 : 4) + i, noGaps: true, ly: 2.6, shear: -side * 0.22, bias: -Math.min(1, dk) });
        if (!outer && form !== 0) return;
        const mx = ax + (ex - ax) * 0.1 - side * F.hw * 0.7 * k, my = ay - 2 * k;
        front.push({ casc: 1, x: mx, top: my - F.hw * 0.6 * k, hem: hem - 8 * k - R() * 8 * k, hw: F.hw * 0.75 * k, drift: side * 2 * k + sw(s, 0.3),
          m: lf, z: 52 + i, noGaps: true, ly: 2.6, shear: -side * 0.18, bias: -Math.min(1, dk) - 1 });
      });
      for (const M of [...back, ...front]) { P.part(); crown(P, M, { ...T, sep: 1, band: 0.12, edge: 3 }, seed * 11 + M.z, L); }
      // strands below each front hem: a few, tapering, of different lengths; the waterside ones trail in the water
      const rip = flat("#e4f2f4"), lit = leafMat(col);
      front.forEach((M, i) => {
        if (M.z < 60) return; const n = 2 + Math.floor(R() * 3), side = Math.sign(M.x - fx);
        for (let m = 0; m < n; m++) {
          const x0 = M.x + M.drift + (R() - 0.5) * M.hw * 1.4, wet = o.wet && side === o.wet && Math.abs(M.x - fx) > F.hw * 0.8 * k;
          const len = (wet ? -hem + 6 * k : R() < 0.3 ? -hem - 1 : (3 + R() * 8) * k) * (0.9 + R() * 0.2), wid = R() < 0.25 ? 2 : 1;
          P.part();
          for (let q = 0; q < len; q++) {
            const f = q / len, xx = x0 + sw(s, 0.5 + f * 0.5) * 0.8 + side * f * 1.5, yy = M.hem - 2 + q;
            const w2 = f < 0.45 ? wid : 1;
            for (let c = 0; c < w2; c++) P._put(Math.floor(xx + c + P.ox), Math.floor(yy + P.oy), lit, 70 + i + m * 0.1, c ? 0.4 : -0.4, 0.3, 0.86, { bias: -Math.min(1, dk) + (f < 0.3 ? 0 : -1), noLine: f > 0.5 });
          }
          if (wet) { const tx = x0 + side * 1.5 + sw(s, 1) * 0.8, ty = M.hem - 2 + len; for (const [dx, dy] of [[-3, 1], [-2, 1], [2, 1], [3, 1], [-1, 2], [1, 2], [0, 2]]) P.dot(tx + dx, ty + dy, rip, 10, { unlit: true }); }
        }
      });
    });
  },
  // C's birch grove, airier: three white stems, small crowns that let the sky through
  birches(pal, k = 1, s = 0, dk = 0, seed = 5, T = TREAT[3]) {
    return sprite(Math.ceil(120 * k), Math.ceil(164 * k), 10, T, (P) => {
      const bk = mat(pal.birchBark), mk = mat(pal.mark), lf = leafMat(pal.birch), un = mat(pal.birch, { contrast: 1.3 });
      const stems = [[-20, 3, -30, 118, -3], [4, 0, 9, 134, 3], [24, 5, 34, 108, 6]], roots = [];
      stems.forEach(([x0, y0, x1, h, bend], n) => {
        const pts = [[x0 * k, y0 * k], [(x0 + bend) * k, (y0 - h * 0.5) * k], [x1 * k + sw(s, 0.9), (y0 - h) * k]];
        P.part(); P.limb(pts, [3 * k, 2.4 * k, 1.2], bk, 40 + y0);
        for (let t = 0.08; t < 0.8; t += 0.1 + h2(n, t * 100, seed) * 0.08) {
          const y = pts[0][1] + (pts[2][1] - pts[0][1]) * t, x = pts[0][0] + (pts[2][0] - pts[0][0]) * t + bend * k * Math.sin(t * Math.PI) * 0.5;
          P.line(x - 2, y, x + (h2(n, t * 99, 3) > 0.5 ? 1 : 0), y, mk, 41 + y0, { wrap: true });
        }
        if (pal.bare) for (const t of [0.5, 0.65, 0.8, 0.95]) roots.push([pts[0][0] + (pts[2][0] - pts[0][0]) * t + bend * k * Math.sin(t * Math.PI) * 0.5, pts[0][1] + (pts[2][1] - pts[0][1]) * t]);
      });
      const M = [[-32, -112, 18, 14], [-26, -88, 18, 13], [10, -130, 20, 14], [12, -104, 21, 14], [36, -100, 17, 13], [34, -78, 15, 11]];
      const MM = M.map(([mx, my, rx, ry], i) => ({ x: mx * k + sw(s * 1.3, -my / 140), y: my * k, rx: rx * k, ry: ry * k, m: lf, z: 60 + i * 4, bias: -Math.min(1, dk), split: 1, noUnder: true }));
      if (pal.bare) { twigMasses(P, MM, roots, mat("#6a5448"), pal, seed, k * 0.8, 46); return; }
      leafMasses(P, MM, { ...T, sky: T.sky + 0.06 }, seed, un);
    });
  },
  // C's hawthorn: low, wide, crooked; blossom in spring (white sprays on the lit leaves), haws in autumn
  hawthorn(pal, k = 1, s = 0, dk = 0, seed = 6, T = TREAT[3]) {
    return sprite(Math.ceil(100 * k), Math.ceil(92 * k), 8, T, (P) => {
      const bk = mat(pal.bark), lf = leafMat(pal.haw), un = mat(pal.haw, { contrast: 1.3 }), bl = mat(pal.blossom, { contrast: 0.6 });
      bark(P, [[0, 2], [-5 * k, -16 * k], [3 * k, -30 * k]], [4.2 * k, 3.2 * k, 2.4 * k], bk, 40);
      bark(P, [[-4 * k, -14 * k], [-20 * k, -30 * k]], [2.2 * k, 1.2], bk, 41, { strokes: false });
      const HM = [[-18, -44, 22, 16], [18, -46, 22, 16], [0, -58, 24, 15], [0, -36, 18, 10]].map(([x, y, rx, ry], i) => ({ x: x * k + sw(s, -y / 70), y: y * k, rx: rx * k, ry: ry * k, m: lf, z: 60 + i * 5, bias: -Math.min(1, dk) }));
      if (pal.bare) {
        bark(P, [[3 * k, -30 * k], [16 * k, -40 * k]], [2 * k, 1.1], bk, 41, { strokes: false });   // the summer's hidden crook, shown
        twigMasses(P, HM, [[3 * k, -30 * k], [-20 * k, -30 * k], [16 * k, -40 * k], [-10 * k, -22 * k]], bk, pal, seed, k * 0.85);
      } else leafMasses(P, HM, T, seed, un);
      // blossom / haws: clustered sprays of 2-4 px on the sunny side, never a random spray of dots
      const r = rng(seed * 101), N = Math.round(26 * (pal.hawBloom || 0) * (pal.hawBloom >= 1 ? 2.6 : 1));
      for (let n = 0; n < N; n++) {
        const a = -2.3 + (r() - 0.5) * (pal.hawBloom >= 1 ? 4.4 : 2.6), d = 0.45 + r() * 0.5, cx = Math.cos(a) * d * 38 * k, cy = -48 * k + Math.sin(a) * d * 22 * k;
        let nd = 1e9, ox = 0; for (const M of HM) { const dd = Math.hypot(M.x - cx, M.y - cy); if (dd < nd) { nd = dd; ox = M._dx || 0; } }
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 1]].slice(0, 2 + (n % 3))) P.dot(cx + dx + ox, cy + dy, bl, 120, { n: [-0.4, -0.5, 0.75], wrap: true });
      }
    });
  },
  bush(pal, k = 1, s = 0, dk = 0, seed = 7, T = TREAT[3]) {
    return sprite(Math.ceil(64 * k), Math.ceil(42 * k), 6, T, (P) => {
      const lf = leafMat(deep(pal.bush, dk)), fl = mat(pal.flower[Math.abs(seed | 0) % pal.flower.length]);
      if (pal.bare) { const bk = mat("#6a4a3a"); for (let n = 0; n < 4; n++) bareCrown(P, [(n - 1.5) * 5 * k, 0], -Math.PI / 2 + (n - 1.5) * 0.4, 8 * k, 1.4, 3, bk, 40, seed + n, pal, null); return; }
      leafMasses(P, [[-12, -12, 15, 11], [12, -11, 15, 11], [0, -19, 15, 11]].map(([x, y, rx, ry], i) => ({ x: x * k, y: y * k, rx: rx * k, ry: ry * k, m: lf, z: 40 + i * 3 + (y > -15 ? 6 : 0), bias: -Math.min(1, dk), split: Math.min(T.split, 2), noUnder: true })), { ...T, gaps: 0, sky: 0 }, seed, 0);
      const r = rng(seed * 31);
      for (let n = 0; n < 4; n++) { const x = (r() - 0.6) * 34 * k, y = -10 - r() * 16 * k; P.dot(x, y, fl, 99, { fix: 4 }); P.dot(x + 1, y, fl, 99, { fix: 3 }); }
    });
  },
  fern(pal, k = 1, s = 0, dk = 0, seed = 8) {
    return sprite(Math.ceil(34 * k), Math.ceil(20 * k), 3, null, (P) => {
      const lf = mat(pal.bare ? "#8a6a3a" : pal.oak[0] === "#6a9a3c" ? "#b87a30" : "#4f8f3e");
      const r = rng(seed);
      for (let n = 0; n < 7; n++) {
        const a = Math.PI * (0.1 + 0.8 * (n / 6)) + (r() - 0.5) * 0.2, L = (11 + r() * 4) * k, ex = -Math.cos(a) * L, ey = -Math.sin(a) * L * 0.7;
        P.part(); P.limb([[0, 0], [ex * 0.55, ey * 0.75 - 2], [ex, ey]], [1.5, 1.3, 0.6], lf, 40 + (Math.abs(ex) < 5 ? -2 : 2) - dk);
      }
    });
  },
};
// a few dead leaves an oak keeps through winter (marcescence): it reads as a LIVING tree asleep, not a dead one
function marcescent(P, pal, k, seed, boxes, amt = 1) {
  const lf = mat("#a8743a"), r = rng(seed * 5);
  for (const [x, y, rx, ry] of boxes) for (let n = 0; n < 22 * amt; n++) {
    const a = r() * 6.28, d = Math.sqrt(r()), px = (x + Math.cos(a) * d * rx) * k, py = (y + Math.sin(a) * d * ry) * k;
    P.dot(px, py, lf, 80, { n: [-0.4, -0.5, 0.75] }); if (r() < 0.5) P.dot(px + 1, py, lf, 80, { n: [0.3, 0.2, 0.9] });
  }
}

// canopy middle height and radius (board units at k 1) for keeping crowns off the road
export const REACH = { roundoak: [36, 30], oak: [46, 40], beech: [48, 24], pine: [32, 18], willow: [26, 28], birches: [52, 28], hawthorn: [24, 22], bush: [6, 13], fern: [3, 8] };

// ---- the place a tree stands in: trodden earth, roots, litter, flowers; by season (canvas px = art px) ----
// ever: an evergreen's ring (owner: "no leaves around the evergreens"): a needle-brown floor, fallen needles and cones,
// in every season (in winter the boughs keep the snow off it)
export function standRing(ctx, px, py, rx, seed, season, ever = false) {
  const r = rng(seed), ry = rx * 0.48;
  if (ever) return needleRing(ctx, px, py, rx, ry, r, seed, season);
  const pool = { summer: "rgba(70,74,30,0.26)", spring: "rgba(60,80,30,0.2)", autumn: "rgba(120,70,30,0.3)", winter: "rgba(90,100,120,0.22)" }[season];
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
    const d = Math.hypot(i / rx, j / ry); if (d > 0.85) continue;
    const th = d < 0.4 ? 0.55 : d < 0.65 ? 0.3 : 0.12;
    if (h2(Math.floor((i + 999) / 2), j + 999, seed) > th) continue;
    ctx.fillStyle = pool; ctx.fillRect(Math.round(px + i), Math.round(py + j), 1, 1);
  }
  for (let n = 0; n < 5; n++) { // surface roots, short
    const a = Math.PI * (0.1 + 0.8 * n / 4) + (r() - 0.5) * 0.4, L = 5 + r() * 7;
    for (let t = 3; t < L; t++) { ctx.fillStyle = t < L * 0.6 ? "#5a3e2a" : "#6e5236"; ctx.fillRect(Math.round(px + Math.cos(a) * t * 1.3), Math.round(py - 1 + Math.sin(a) * t * 0.45), 1, 1); }
  }
  const litter = { summer: ["#8a6a3a", "#a88044", "#6a7a34"], spring: ["#7a9a3a", "#8a6a3a"], autumn: ["#c86a2a", "#d8a840", "#a8442a", "#e0b048"], winter: ["#f2f6fa", "#dce6ee", "#f2f6fa"] }[season];
  const N = rx * rx * (season === "autumn" ? 0.55 : season === "winter" ? 0.7 : 0.22);
  for (let n = 0; n < N; n++) {
    const a = r() * 6.283, d = Math.pow(r(), 0.6) * (season === "autumn" ? 1.25 : 1);
    if (r() > 1.2 - d * 0.8) continue;
    const x = Math.round(px + Math.cos(a) * d * rx), y = Math.round(py + Math.sin(a) * d * ry);
    ctx.fillStyle = litter[(r() * litter.length) | 0]; ctx.fillRect(x, y, season === "autumn" || r() < 0.3 ? 2 : 1, 1);
  }
  const fl = season === "spring" ? ["#6c7ae8", "#8a90f0", "#f4e070"] : season === "summer" ? ["#f2eee0", "#f4d860", "#f0c8d8"] : season === "autumn" ? ["#c8342a"] : [];
  const NF = season === "spring" ? rx * 0.9 : season === "summer" ? rx * 0.3 : rx * 0.12;
  for (let n = 0; n < NF && fl.length; n++) { // flowers in little clumps at the rim, bluebells in spring
    const a = r() * 6.283, d = 0.7 + r() * 0.5, x = Math.round(px + Math.cos(a) * d * rx), y = Math.round(py + Math.sin(a) * d * ry);
    const c = fl[(r() * fl.length) | 0];
    for (const [dx, dy] of [[0, 0], [2, 1], [-1, 1]].slice(0, 1 + (n % 3))) { ctx.fillStyle = "#3e6a2a"; ctx.fillRect(x + dx, y + dy + 1, 1, 1); ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, 1, 1); }
  }
}

function needleRing(ctx, px, py, rx, ry, r, seed, season) {
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
    const d = Math.hypot(i / rx, j / ry); if (d > 0.9) continue;
    const th = d < 0.45 ? 0.75 : d < 0.7 ? 0.42 : 0.14;
    if (h2(Math.floor((i + 999) / 2), j + 999, seed) > th) continue;
    ctx.fillStyle = season === "winter" ? "rgba(104,74,46,0.5)" : "rgba(112,74,40,0.34)"; ctx.fillRect(Math.round(px + i), Math.round(py + j), 1, 1);
  }
  const nd = ["#8e5e34", "#a8743e", "#6e4a2c", "#b88a50"];
  for (let n = 0; n < rx * rx * 0.3; n++) {   // fallen needles: short dashes lying every which way
    const a = r() * 6.283, d = Math.pow(r(), 0.7), x = Math.round(px + Math.cos(a) * d * rx * 0.95), y = Math.round(py + Math.sin(a) * d * ry * 0.95);
    ctx.fillStyle = nd[(r() * nd.length) | 0];
    if (r() < 0.5) ctx.fillRect(x, y, 2, 1); else { ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + (r() < 0.5 ? 1 : -1), y + 1, 1, 1); }
  }
  for (let n = 0; n < 3 + rx * 0.12; n++) {   // cones: 2 x 2, a lit scale on the upper left, a dark base
    const a = r() * 6.283, d = 0.25 + r() * 0.7, x = Math.round(px + Math.cos(a) * d * rx * 0.9), y = Math.round(py + Math.sin(a) * d * ry * 0.9);
    ctx.fillStyle = "#4a3020"; ctx.fillRect(x, y + 1, 3, 1); ctx.fillStyle = "#7a5030"; ctx.fillRect(x, y, 2, 1); ctx.fillStyle = "#b07c48"; ctx.fillRect(x, y, 1, 1);
  }
  if (season === "winter") for (let n = 0; n < rx * 1.2; n++) { const a = r() * 6.283, d = 0.75 + r() * 0.35; ctx.fillStyle = "#eef2f6"; ctx.fillRect(Math.round(px + Math.cos(a) * d * rx), Math.round(py + Math.sin(a) * d * ry), 2, 1); }
  for (let n = 0; n < 4; n++) { // a few surface roots
    const a = Math.PI * (0.1 + 0.8 * n / 3) + (r() - 0.5) * 0.4, L = 4 + r() * 5;
    for (let t = 3; t < L; t++) { ctx.fillStyle = "#5a3e2a"; ctx.fillRect(Math.round(px + Math.cos(a) * t * 1.3), Math.round(py - 1 + Math.sin(a) * t * 0.45), 1, 1); }
  }
}

// ---- ROUND 3 dusk: the sun just set in the west (the left). A real dusk, not a night: the board multiplied by a
// cool blue-violet that is lighter and rosier toward the west, in Bayer-dithered steps (the decorations lab's
// nightShade, a step lighter, with the afterglow), warm lights kept; the lab then adds the halls' lamp pools and
// blooms (src/render/nightlight.js) and the fireflies.
export function duskShade(ctx, x0 = 0, w = ctx.canvas.width) {
  const W = ctx.canvas.width, H = ctx.canvas.height, A = ctx.getImageData(0, 0, W, H), d = A.data;
  const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const WEST = [0.74, 0.6, 0.7], EAST = [0.42, 0.46, 0.7], GLOW = [255, 150, 110];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = (j * W + i) * 4, r = d[k], g = d[k + 1], b = d[k + 2];
    if (r > 232 && g > 175 && b < 130 && r - b > 120) continue;            // flames and lit windows keep their light
    const bx = (BY[((j >> 1) & 3) * 4 + ((i >> 1) & 3)] + 0.5) / 16 - 0.5;
    const u = Math.round(Math.max(0, Math.min(1, (i - x0) / w * 0.85 + j / H * 0.35 + bx * 0.18)) * 5) / 5;
    const f = WEST.map((v, c) => v + (EAST[c] - v) * u), glow = Math.max(0, 0.5 - u) * 0.14;
    const lum = 0.3 * r + 0.59 * g + 0.11 * b;
    d[k] = r * f[0] + lum * 0.04 + GLOW[0] * glow; d[k + 1] = g * f[1] + lum * 0.04 + GLOW[1] * glow; d[k + 2] = b * f[2] + lum * 0.08 + 14 + GLOW[2] * glow * 0.6;
  }
  ctx.putImageData(A, 0, 0);
}

// ---- small life -------------------------------------------------------------------------------------------
// every creature as a strip of frames { cv, ax, ay }; all pale, calm colours (never a foe's green, grey or red)
const mini = (w, h, foot, build) => sprite(w, h, foot, null, build);
export const LIFE = {
  // a roe deer, grey-fawn with a pale rump, smaller than a soldier's height; graze, chew, look up, ear flick
  deer(flip = 1) {
    const fr = [[1, 0], [1, 1], [0, 0], [0, 1]];
    return fr.map(([down, ph]) => mini(44, 34, 4, (P) => {
      const fur = mat("#a89478"), pale = mat("#ece2cc"), dkm = flat("#3a2e2c"), f = flip;
      P.part(); P.limb([[-8 * f, -11], [-9 * f, -5], [-8 * f, 0]], [1, 0.8, 0.6], fur, 30); P.limb([[7 * f, -11], [8 * f, -5], [9 * f, 0]], [1, 0.8, 0.6], fur, 30);
      P.part(); P.ellipse(0, -14, 10.5, 4.8, fur, 40); P.ellipse(0, -11.5, 7, 2, pale, 41, { wrap: true });
      P.ellipse(-10 * f, -15, 2.2, 2.6, pale, 42);
      P.part(); P.limb([[-6 * f, -11], [-6 * f, -5], [-5 * f, 0]], [1.1, 0.8, 0.6], fur, 50); P.limb([[6 * f, -11], [6.5 * f, -5], [7 * f, 0]], [1.1, 0.8, 0.6], fur, 50);
      const hx = down ? 17 * f : 12 * f, hy = down ? -3 - ph : -26;
      P.part(); P.limb(down ? [[8 * f, -16], [13 * f, -12], [hx - 1 * f, hy - 1]] : [[8 * f, -16], [hx * 0.95, (hy - 16) / 2 - 2], [hx, hy + 2]], [2.6, 2, 1.6], fur, 55);
      P.part(); P.ellipse(hx + (down ? 0.5 : 2) * f, hy, down ? 2.2 : 3.4, down ? 3.2 : 2.4, fur, 60, { rot: (down ? 0.3 : 0.25) * f }); P.dot(hx + (down ? 1 : 4.5) * f, hy + (down ? 2.5 : 0.5), dkm, 62);
      P.dot(hx + (down ? -0.5 : 1.5) * f, hy - (down ? 0 : 1), dkm, 62);
      const ea = ph && !down ? -1.2 : 0;
      P.part(); P.ellipse(hx - 0.5 * f, hy - 3.5 + ea * 0.5, 1, 2.2, fur, 58, { rot: (0.5 + ea) * f });
    }));
  },
  rabbit(flip = 1) {
    const fr = [0, 1, 2, 3];
    return fr.map((n) => mini(20, 16, 2, (P) => {
      const fur = mat("#a49482"), pale = flat("#f4f0e8"), dk = flat("#3a2e2c"), f = flip;
      const hop = n >= 2, sx = n === 2 ? 1.3 : 1, up = n === 2 ? -3 : n === 3 ? -1 : 0;
      P.part(); P.ellipse(0, -3.5 + up, 4.5 * sx, 3, fur, 40);
      P.dot(-4.6 * f * sx, -4 + up, pale, 45);
      if (hop) { P.part(); P.limb([[-3 * f, -2 + up], [-6 * f * sx, -0.5 + up * 0.3]], [1, 0.7], fur, 38); }
      P.part(); P.ellipse(4 * f, -6.5 + up, 2.4, 2, fur, 50); P.dot(5 * f, -7 + up, dk, 52);
      const lean = n === 1 ? 0.7 : 0;
      P.part(); P.limb([[3.4 * f, -8 + up], [(2.6 - lean) * f, -12 + up]], [0.9, 0.7], fur, 49); P.limb([[4.4 * f, -8 + up], [(4.2 + lean) * f, -12.5 + up]], [0.9, 0.7], fur, 51);
    }));
  },
  fox(flip = 1) {
    return [0, 1, 2, 3].map((n) => mini(36, 22, 3, (P) => {
      const fur = mat("#c27840"), pale = mat("#f0e6d4"), dk = flat("#2e2626"), f = flip, sit = n === 3;
      const st = [[2, -2], [-1, 1], [-2, 2]][n % 3];
      if (!sit) {
        P.part(); for (const [x, s] of [[-6, st[0]], [6, st[1]]]) P.limb([[x * f, -6], [(x + s) * f, 0]], [1, 0.8], mat("#4a3a34"), 30);
        P.part(); P.ellipse(0, -8, 8, 3.2, fur, 40); P.ellipse(1 * f, -6.4, 5, 1.2, pale, 41, { wrap: true });
        P.part(); for (const [x, s] of [[-5, st[1]], [7, st[0]]]) P.limb([[x * f, -6], [(x + s) * f, 0]], [1.1, 0.8], mat("#4a3a34"), 50);
        P.part(); P.limb([[-7 * f, -9], [-13 * f, -8], [-17 * f, -6]], [2.4, 2.6, 1.6], fur, 35); P.dot(-17 * f, -6, flat("#f4efe6"), 36, { wrap: false }); P.dot(-18 * f, -6, flat("#f4efe6"), 36);
        P.part(); P.ellipse(10 * f, -10, 3, 2.4, fur, 60); P.limb([[11 * f, -10], [14.5 * f, -9.5]], [1.4, 0.7], fur, 61); P.dot(14.8 * f, -9.6, dk, 62); P.dot(11 * f, -10.5, dk, 62);
        P.part(); P.limb([[9 * f, -12], [9 * f, -14.5]], [1, 0.4], fur, 59); P.limb([[11 * f, -12], [11.5 * f, -14.5]], [1, 0.4], fur, 59);
      } else {
        P.part(); P.limb([[-6 * f, -1], [-13 * f, 0], [-15 * f, -3]], [2, 2.4, 1.4], fur, 35); P.dot(-15 * f, -3.5, flat("#f4efe6"), 36);
        P.part(); P.ellipse(-1 * f, -6, 5, 5, fur, 40); P.ellipse(1 * f, -6, 2.2, 3.6, pale, 41, { wrap: true });
        P.part(); P.limb([[2 * f, -4], [3 * f, 0]], [1.1, 0.8], mat("#4a3a34"), 50);
        P.part(); P.ellipse(2 * f, -13, 3, 2.6, fur, 60); P.limb([[3 * f, -13], [6 * f, -12.4]], [1.3, 0.6], fur, 61); P.dot(6.2 * f, -12.4, dk, 62); P.dot(3 * f, -13.6, dk, 62);
        P.part(); P.limb([[0.5 * f, -15], [0, -18]], [1, 0.4], fur, 59); P.limb([[3 * f, -15], [3.5 * f, -18]], [1, 0.4], fur, 59);
      }
    }));
  },
  // a robin flies in and lands on a twig: wings up, wings down, the flare, perched
  songbird() {
    return [0, 1, 2, 3].map((n) => mini(26, 18, 4, (P) => {
      const tw = mat("#6e4a30"), br = mat("#8a6a4a"), red = mat("#e07a3a"), dk = flat("#2a2226");
      P.part(); P.limb([[-12, -2], [0, -3], [12, -1]], [1.1, 1, 0.6], tw, 20); P.limb([[5, -3], [9, -7]], [0.6, 0.4], tw, 20);
      const x = [-8, -4, -1, 1][n], y = [-12, -10, -8, -6.5][n];
      P.part(); P.ellipse(x, y, 2.4, 1.8, br, 40); P.ellipse(x + 1, y + 0.6, 1.2, 1.1, red, 41, { wrap: true }); P.dot(x + 2.4, y - 0.4, dk, 42); P.dot(x - 2.6, y + 0.4, br, 40);
      P.part();
      if (n === 0) { P.line(x - 1, y - 1, x - 3, y - 4, br, 45); P.line(x, y - 1, x + 1, y - 4, br, 45); }
      if (n === 1) { P.line(x - 1, y, x - 4, y + 2, br, 45); P.line(x, y, x + 1, y + 2, br, 45); }
      if (n === 2) { P.line(x - 1, y - 1, x - 4, y - 3, br, 45); P.line(x, y - 1, x + 2, y - 3, br, 45); P.dot(x, y + 2, dk, 46); }
      if (n === 3) { P.dot(x, y + 2, dk, 46); P.dot(x + 1, y + 2, dk, 46); }
    }));
  },
  // a pale yellow butterfly over a flower clump: open, half, shut, half
  butterfly() {
    return [0, 1, 2, 1].map((n, f) => mini(14, 16, 2, (P) => {
      const st = mat("#4e7a32"), fl = flat("#f0c8d8"), w = flat("#f4e488"), wd = flat("#c8a848"), b = flat("#3a3030");
      P.part(); P.line(-3, 0, -3, -4, st, 10); P.line(2, 0, 2, -3, st, 10); P.dot(-3, -5, fl, 12); P.dot(-2, -5, fl, 12); P.dot(2, -4, fl, 12);
      const y = -10 + (f % 2), x = 0;
      P.dot(x, y, b, 30); P.dot(x, y + 1, b, 30);
      if (n === 0) { P.dot(x - 1, y - 1, w, 31); P.dot(x - 2, y - 1, w, 31); P.dot(x - 1, y, w, 31); P.dot(x - 2, y + 1, wd, 31); P.dot(x + 1, y - 1, w, 31); P.dot(x + 2, y - 1, w, 31); P.dot(x + 1, y, w, 31); P.dot(x + 2, y + 1, wd, 31); }
      if (n === 1) { P.dot(x - 1, y - 1, w, 31); P.dot(x - 1, y, wd, 31); P.dot(x + 1, y - 1, w, 31); P.dot(x + 1, y, wd, 31); }
      if (n === 2) { P.dot(x, y - 1, w, 31); P.dot(x, y - 2, w, 31); }
    }));
  },
  // a red squirrel on a trunk: climbing (stretch, tuck), a pause with the tail up, a look round
  squirrel(flip = 1) {
    return [0, 1, 2, 3].map((n) => mini(26, 40, 2, (P) => {
      const bk = mat("#6e4a30"), fur = mat("#b8643a"), pale = flat("#f0e4cc"), dk = flat("#2a2226");
      if (flip !== 2) { P.part(); P.limb([[0, 0], [0, -38]], [6, 5.5], bk, 10); }
      const y = [-14, -18, -22, -22][n], st = n === 0 ? 2 : 0;
      P.part(); P.ellipse(-5, y + st, 2.4, 4 + st * 0.5, fur, 40); P.ellipse(-4.4, y, 1, 2.6, pale, 41, { wrap: true });
      P.part(); P.ellipse(-5, y - 5 - st * 0.5, 2.2, 1.9, fur, 45); P.dot(n === 3 ? -7 : -4, y - 5.5, dk, 46); P.dot(-5.5, y - 7.5, fur, 44);
      P.part(); const tl = n >= 2 ? [[-6, y + 3], [-10, y - 2], [-9, y - 8]] : [[-6, y + 4], [-8, y + 9], [-7, y + 13]];
      P.limb(tl, [1.6, 2.4, 1.6], fur, 35);
    }));
  },
  // a tawny owl on a bough in the wood at dusk: open eyes, blink, head turned, a shuffle
  owl() {
    return [0, 1, 2, 3].map((n) => mini(26, 26, 6, (P) => {
      const bk = mat("#5a4030"), fur = mat("#8a6e50"), face = mat("#c8b090"), eye = flat("#f4d040"), dk = flat("#241a1c");
      P.part(); P.limb([[-12, -4], [0, -5], [12, -3]], [1.6, 1.8, 1.2], bk, 10);
      P.part(); P.ellipse(0, -11 + (n === 3 ? 1 : 0), 4.4 + (n === 3 ? 0.8 : 0), 5.6, fur, 40);
      const hx = n === 2 ? 1 : 0;
      P.part(); P.ellipse(hx, -18, 4, 3.4, fur, 50); P.ellipse(hx, -17.6, 3, 2.4, face, 51, { wrap: true });
      if (n === 1) { P.line(hx - 2, -18, hx - 1, -18, dk, 52); P.line(hx + 1, -18, hx + 2, -18, dk, 52); }
      else if (n === 2) { P.dot(hx + 1, -18, eye, 52); P.dot(hx + 3, -18, eye, 52); }
      else { P.dot(hx - 1.5, -18, eye, 52); P.dot(hx + 1.5, -18, eye, 52); }
      P.dot(hx, -16.8, dk, 52);
      for (const x of [-1.5, 1.5]) P.dot(x, -4.8, flat("#d0a040"), 41);
    }));
  },
};
// how a lab lays a creature down on the board (canvas px = art px)
export const LIFE_STRIP = ["deer", "rabbit", "fox", "songbird", "butterfly", "squirrel", "owl"];

// ---- falling leaves (autumn): pairs of pixels drifting down on a sway; frame f of 4 ----
export function fallingLeaves(ctx, x0, y0, w, h, seed, f, cols, n = 16) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const bx = x0 + r() * w, by = y0 + r() * h, ph = r() * 6.28, sp = 4 + r() * 3, c = cols[i % cols.length];
    const y = by + ((f * sp) % (h + 8)), x = bx + Math.sin(ph + f * 1.57) * 3.5;
    const X = Math.round(x), Y = Math.round(y), turn = (f + i) % 4;
    // a leaf tumbling: broad (3 px), edge-on (1 px), broad flipped, half-turned
    ctx.fillStyle = "rgba(36,24,30,0.22)"; ctx.fillRect(X + 4, Y + 10 + (h - (y - y0)) * 0.15, 2, 1);     // its shadow on the grass
    ctx.fillStyle = "#4a2a20";
    if (turn === 0) { ctx.fillRect(X, Y + 1, 3, 1); ctx.fillStyle = c; ctx.fillRect(X, Y, 3, 1); ctx.fillRect(X + 1, Y + 1, 1, 1); }
    else if (turn === 1) { ctx.fillStyle = c; ctx.fillRect(X + 1, Y, 1, 2); }
    else if (turn === 2) { ctx.fillRect(X, Y, 2, 1); ctx.fillStyle = c; ctx.fillRect(X, Y + 1, 3, 1); }
    else { ctx.fillStyle = c; ctx.fillRect(X, Y, 2, 1); ctx.fillRect(X + 1, Y + 1, 1, 1); }
  }
}

// ---- fireflies at dusk: the land's own light under the trees (additive) ----
export function fireflies(ctx, pts, seed) {
  const r = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const [x, y] of pts) {
    const k = 0.5 + r() * 0.5;
    ctx.fillStyle = `rgba(150,170,40,${0.16 * k})`; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1, 5, 3); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 5);
    ctx.fillStyle = `rgba(190,220,80,${0.35 * k})`; ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
    ctx.fillStyle = `rgba(250,255,170,${0.95 * k})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.restore();
}
void ugly;

// ============ ROUND 4: THE ANIMATED LOOPS (art/briefs/overhaul-animation.md) ============
// Every clock here is a whole fraction of the loop (LOOP.secs), so frame F-1 runs into frame 0.
export const LOOP = { secs: 4, fps: 10, F: 40 };
// a gust leans a crown downwind and lets it back: 0 -> 1 -> 0 over one period (never a back-and-forth jitter)
export const lean = (ph) => 0.5 - 0.5 * Math.cos(2 * Math.PI * ph);
const TAU = Math.PI * 2;

// fireflies drifting on small closed loops and blinking slowly (on ~0.6-1.2 s, one dim frame either end)
export function fireflyLoop(ctx, pts, seed, t) {
  const r = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const [bx, by] of pts) {
    const ax = 3 + r() * 6, ay = 2 + r() * 3, p1 = r(), p2 = r(), p3 = r(), per = r() < 0.5 ? 2 : 4, on = 0.28 + r() * 0.12, k0 = 0.6 + r() * 0.4;
    const x = Math.round(bx + ax * Math.sin(TAU * (t / 4 + p1))), y = Math.round(by + ay * Math.sin(TAU * (t / 2 + p2)));
    const b = (t / per + p3) % 1; if (b >= on) continue;
    const k = (b < 0.07 || b > on - 0.07 ? 0.45 : 1) * k0;
    ctx.fillStyle = `rgba(150,170,40,${0.26 * k})`; ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 2, 3, 5);
    ctx.fillStyle = `rgba(190,220,80,${0.6 * k})`; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
    ctx.fillStyle = `rgba(250,255,170,${0.95 * k})`; ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}

// autumn: leaves leave a crown (x0, y0), fall with a side-to-side drift that dies as they near the ground, tumble
// (broad, edge-on, flipped, half-turned, a turn every 0.2 s) and settle at (x1, y1). Each lands on its own TWIN, a
// litter leaf laid in the ground beforehand (leafLitter), so the one that lands can go without a pop.
const leafShape = (ctx, X, Y, turn, c) => {
  // a leaf a little larger than life so it reads at board size: broad (4 x 2), edge-on (1 x 3), flipped (its dark
  // underside up), half-turned
  const dk = "#6a3420";
  if (turn === 0) { ctx.fillStyle = c; ctx.fillRect(X, Y, 3, 1); ctx.fillRect(X + 1, Y + 1, 3, 1); ctx.fillStyle = dk; ctx.fillRect(X, Y + 1, 1, 1); ctx.fillRect(X + 1, Y + 2, 2, 1); }
  else if (turn === 1) { ctx.fillStyle = c; ctx.fillRect(X + 1, Y, 1, 2); ctx.fillStyle = dk; ctx.fillRect(X + 1, Y + 2, 1, 1); }
  else if (turn === 2) { ctx.fillStyle = dk; ctx.fillRect(X, Y, 3, 1); ctx.fillStyle = c; ctx.fillRect(X + 1, Y + 1, 3, 1); }
  else { ctx.fillStyle = c; ctx.fillRect(X, Y, 2, 1); ctx.fillRect(X + 1, Y + 1, 2, 1); ctx.fillStyle = dk; ctx.fillRect(X + 2, Y + 2, 1, 1); }
};
export function leafLitter(ctx, L) { for (const l of L) leafShape(ctx, Math.round(l.x1), Math.round(l.y1), 0, l.col); }
export function leafFall(ctx, L, t) {
  for (const l of L) {
    const u = (t / LOOP.secs + l.ph) % 1, FALL = 0.8;
    if (u >= FALL) continue;                         // lying on its twin
    const v = u / FALL, e = 0.55 * v * v + 0.45 * v;   // slow off the bough, a little faster near the ground
    const x = l.x0 + (l.x1 - l.x0) * v + Math.sin(v * Math.PI * 3 + l.ph * 6) * 5 * (1 - v), y = l.y0 + (l.y1 - l.y0) * e;
    const X = Math.round(x), Y = Math.round(y), turn = v > 0.97 ? 0 : (Math.floor(u * LOOP.F / 2) + l.n) % 4;
    if (l.y1 - y > 3) { ctx.fillStyle = "rgba(36,24,30,0.22)"; ctx.fillRect(Math.round(x + (l.y1 - y) * 0.3), Math.round(l.y1) + 2, 2, 1); }
    leafShape(ctx, X, Y, turn, l.col);
  }
}

// winter: flakes falling slowly (12-22 art px a second), each living one loop: fading in and out in one dim step
export function snowLoop(ctx, x0, y0, w, h, t, n, seed) {
  const r = rng(seed);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const bx = x0 + r() * w, by = y0 + r() * h - 40, v = 12 + r() * 10, ph = r(), p2 = r(), big = r() < 0.25;
    const u = (t / LOOP.secs + ph) % 1, y = Math.round(by + u * LOOP.secs * v), x = Math.round(bx + 1.6 * Math.sin(TAU * (u * 2 + p2)) + u * 6);
    const al = u < 0.08 || u > 0.92 ? 0.45 : 1;
    ctx.globalAlpha = 0.5 * al; ctx.fillStyle = "#6a7890"; ctx.fillRect(x + 1, y + 1, 1, big ? 2 : 1);   // a cool rim so a flake reads over snow
    ctx.globalAlpha = 0.95 * al; ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, big ? 2 : 1, 1); if (big) ctx.fillRect(x, y + 1, 1, 1);
  }
  ctx.restore();
}
// once a loop a little snow slides off a bough (x, y canvas px) at t0: a clump falls (accelerating, a powder trail),
// bursts on the ground `drop` px below and the burst fades out before the loop ends
export function snowSlide(ctx, x, y, t, t0 = 1.2, drop = 30) {
  const dt = t - t0; if (dt < 0) return;
  ctx.save(); ctx.fillStyle = "#f6f9fc";
  const FALL = 0.5;
  if (dt < FALL) {
    const yy = Math.round(y + drop * (dt / FALL) * (dt / FALL)), xx = Math.round(x + dt * 6);
    ctx.fillStyle = "#8a98b0"; ctx.fillRect(xx, yy + 2, 4, 1); ctx.fillStyle = "#f6f9fc"; ctx.fillRect(xx, yy, 4, 2); ctx.fillRect(xx + 1, yy - 1, 2, 1);
    ctx.globalAlpha = 0.5; for (let k = 1; k <= 3; k++) ctx.fillRect(Math.round(xx + 1 - k * 0.6), Math.round(yy - k * 3 - 1), 1, 1);   // powder trail
  } else {
    const d2 = dt - FALL, gy = y + drop;
    ctx.globalAlpha = d2 < 0.6 ? 0.9 : d2 < 1.2 ? 0.55 : d2 < 1.8 ? 0.25 : 0;
    if (ctx.globalAlpha) { ctx.fillRect(Math.round(x + 3), gy + 1, 4, 1); ctx.fillRect(Math.round(x + 4), gy, 2, 1); }
    if (d2 < 0.5) for (const [a, s] of [[-2.6, 1], [-2, 0.8], [-1.1, 1], [-0.5, 0.7], [-0.2, 0.9], [-2.9, 0.6]]) {
      ctx.globalAlpha = d2 < 0.25 ? 0.85 : 0.45;
      ctx.fillRect(Math.round(x + 4 + Math.cos(a) * d2 * 22 * s), Math.round(gy + Math.sin(a) * d2 * 12 * s + d2 * d2 * 30), 1, 1);
    }
  }
  ctx.restore();
}

// a butterfly in flight, at (x, y) canvas px: wings open / half / shut / half
export function bfly(ctx, x, y, n) {
  const X = Math.round(x), Y = Math.round(y), w = "#f4e488", wd = "#c8a848";
  ctx.fillStyle = "#3a3030"; ctx.fillRect(X, Y, 1, 2);
  const px = (dx, dy, c) => { ctx.fillStyle = c; ctx.fillRect(X + dx, Y + dy, 1, 1); };
  if (n === 0) { for (const s of [-1, 1]) { px(s, -1, w); px(2 * s, -1, w); px(s, 0, w); px(2 * s, 1, wd); } }
  else if (n === 1 || n === 3) { for (const s of [-1, 1]) { px(s, -1, w); px(s, 0, wd); } }
  else { px(0, -1, w); px(0, -2, w); }
}

// the extra small-life parts the loops need: a robin without its twig (0 wings up, 1 down, 2 flare, 3 perched),
// the twig alone, a bare trunk for the squirrel's cell
export const LIFE2 = {
  bird(flip = 1) {
    return [0, 1, 2, 3].map((n) => mini(16, 12, 2, (P) => {
      const br = mat("#8a6a4a"), red = mat("#e07a3a"), dk = flat("#2a2226"), f = flip, x = 0, y = -3.2;
      P.part(); P.ellipse(x, y, 2.4, 1.8, br, 40); P.ellipse(x + 1 * f, y + 0.6, 1.2, 1.1, red, 41, { wrap: true }); P.dot(x + 2.4 * f, y - 0.4, dk, 42); P.dot(x - 2.6 * f, y + 0.4, br, 40);
      P.part();
      if (n === 0) { P.line(x - 1 * f, y - 1, x - 3 * f, y - 4, br, 45); P.line(x, y - 1, x + 1 * f, y - 4, br, 45); }
      if (n === 1) { P.line(x - 1 * f, y, x - 4 * f, y + 2, br, 45); P.line(x, y, x + 1 * f, y + 2, br, 45); }
      if (n === 2) { P.line(x - 1 * f, y - 1, x - 4 * f, y - 3, br, 45); P.line(x, y - 1, x + 2 * f, y - 3, br, 45); P.dot(x, y + 2, dk, 46); }
      if (n === 3) { P.dot(x, y + 2, dk, 46); P.dot(x + 1 * f, y + 2, dk, 46); }
    }));
  },
  twig() { return mini(30, 12, 4, (P) => { const tw = mat("#6e4a30"); P.part(); P.limb([[-14, -2], [0, -3], [13, -1]], [1.2, 1, 0.6], tw, 20); P.limb([[5, -3], [9, -7]], [0.6, 0.4], tw, 20); }); },
  trunk() { return mini(18, 60, 2, (P) => { const bk = mat("#6e4a30"); P.part(); P.limb([[0, 0], [0, -58]], [6, 5.5], bk, 10); for (const s of [-1, 1]) P.toneLine(s * 2, -2, s * 2, -56, -1); }); },
};

// each creature's 4-second routine, frame f of 40 (10 a second): which of its frames, and where (art px)
export const ROUTINE = {
  // graze (head down, chewing every 0.4 s), lift the head and look, an ear flick, back down
  deer: (f) => ({ n: f < 16 ? ((f >> 2) & 1) : f < 28 ? 2 : f < 31 ? 3 : f < 34 ? 2 : 0 }),
  // sit, an ear turned, two hops right, sit, turn, two hops back (the turn round is the loop's seam)
  rabbit: (f) => {
    if (f < 18) return { n: f >= 10 && f < 16 ? 1 : 0, dx: 0, flip: 1 };
    if (f < 22) return { n: f < 20 ? 2 : 3, dx: f < 20 ? 3 : 5, flip: 1 };
    if (f < 24) return { n: f < 23 ? 2 : 3, dx: f < 23 ? 8 : 10, flip: 1 };
    if (f < 30) return { n: 0, dx: 10, flip: 1 };
    if (f < 34) return { n: f < 32 ? 2 : 3, dx: f < 32 ? 7 : 5, flip: -1 };
    if (f < 36) return { n: f < 35 ? 2 : 3, dx: f < 35 ? 2 : 0, flip: -1 };
    return { n: 0, dx: 0, flip: -1 };
  },
  // trots in, sits and looks about, trots on out (it is off its cell at the seam)
  fox: (f) => (f < 12 ? { n: f % 3, dx: -34 + f * 5.3 } : f < 22 ? { n: 3, dx: 30 } : { n: f % 3, dx: 30 + (f - 21) * 4.8 }),
  // eyes open, a blink, the head turned, a shuffle on the bough
  owl: (f) => ({ n: f === 14 || f === 15 ? 1 : f >= 20 && f < 32 ? 2 : f === 36 || f === 37 ? 3 : 0 }),
  // climbs (stretch, tuck) 12 px, pauses with the tail up, looks round, slips round the back of the trunk
  squirrel: (f) => (f < 16 ? { n: (f >> 1) & 1, dy: -4 * (f >> 2) } : f < 26 ? { n: 2, dy: -12 } : f < 32 ? { n: 3, dy: -12 } : null),
  // a robin flies in from the right, flares, perches, then flies off left (off its branch at the seam)
  bird: (f) => {
    const ease = (u) => u * u * (3 - 2 * u);
    if (f < 4 || f > 37) return null;
    if (f < 12) { const u = ease((f - 4) / 8); return { n: f & 1, x: 56 * (1 - u), y: -34 * (1 - u) - 4 * Math.sin(u * Math.PI) }; }
    if (f < 14) return { n: 2, x: 0, y: -1 };
    if (f < 28) return { n: 3, x: 0, y: 0, hop: f >= 20 && f < 22 };
    if (f < 30) return { n: 2, x: -1, y: -2 };
    const u = (f - 29) / 8; return { n: f & 1, x: -60 * u * u - 4 * u, y: -40 * u };
  },
  // the butterfly's flight over its flowers: a closed loop (4 s across, 2 s up and down), wings every 0.1 s
  bfly: (f, ph = 0) => { const t = f / LOOP.fps; return { n: f % 4, dx: Math.round(13 * Math.sin(TAU * (t / 4 + ph))), dy: Math.round(-9 - 5 * Math.sin(TAU * (t / 2 + ph * 2))) }; },
};
