// ============ OVERHAUL CONCEPT: TREES AND FOLIAGE (2026-11-22, art/briefs/overhaul-concepts.md) ============
// Three directions, painted over the real board (the game's own draw() with its trees taken out):
//   A  GRAND TREES      trees as landmarks: ~1.7x today, trunks with buttress roots, forking boughs,
//                       canopies of separate leaf masses with sky between them, one silhouette per species
//   B  SCULPTED CANOPY  trees made like the halls: a few big clean lobes, one sun, banded light / mid / cool
//                       core, crisp tinted line; chunky toy-diorama shapes, no leaf noise (~1.25x today)
//   C  A LIVING WOOD    today's size+ with fine leaves, but every tree stands IN a place: leaf litter, roots,
//                       flowers, dappled shade; the wood is layered (dark roof, light shafts, mid row, bright
//                       front row, undergrowth hem, ferns, logs, stumps, a deer, birds)
// Everything is sculpted with the game's pixel sculptor (src/render/pix/pix.js) at one art pixel per
// half board unit, so the canvas the lab draws on (2 px a unit) takes them 1:1.
// Concept only: nothing in src/ imports this.

import { Pix, mat, toCanvas } from "../src/render/pix/pix.js";
import { DAY } from "../src/data/sun.js";
import { sunRim, castShadow } from "../src/render/sceneryday.js";

// ---- small helpers ----------------------------------------------------------------------------
export const rng = (seed) => { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const h2 = (x, y, s) => { let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---- palettes (per chapter, per season) -------------------------------------------------------------
export const PAL = {
  greenwood: { oak: "#5c9a3c", oak2: "#4f8f3e", poplar: "#4c8c40", birch: "#8ab846", pine: "#3d7650", bush: "#4f8f3a", haw: "#5f9a40",
    bark: "#6e4a30", barkUp: "#a8623a", birchBark: "#e2ddcc", mark: "#3a3034", moss: "#6f8f3a", flower: ["#f2eee0", "#f0c8d8", "#f4d860"], blossom: "#f2c4d4" },
  autumn: { oak: "#c47a2c", oak2: "#b5562a", poplar: "#d6a032", birch: "#e6be38", pine: "#3d7650", bush: "#a8442a", haw: "#c0602c",
    bark: "#5e4030", barkUp: "#a8623a", birchBark: "#e2ddcc", mark: "#3a3034", moss: "#8a8a3a", flower: ["#f2eee0", "#e8b040", "#d86a3a"], blossom: "#e8a040" },
  iron: { oak: "#56804a", oak2: "#4a7446", poplar: "#4a7446", birch: "#8aa850", pine: "#2f5c4a", pine2: "#3a6a4c", bush: "#4a6e44", haw: "#4a7446",
    bark: "#5a4030", barkUp: "#b0683e", birchBark: "#dcd6c6", mark: "#34302e", moss: "#6a7a44", flower: ["#d8d0e8", "#b090c8", "#e8e0c0"], blossom: "#d8c8e0" },
};

// ---- the leaf mass: an egg crowded with leaf clumps ---------------------------------------------------
// o.clump  clump size (art px);  o.rough  how far clumps bump the silhouette;  o.mixw  how much each clump
// shades as its own little dome (0 = one clean ball);  o.crev  crevice darkening between clumps;
// o.core   cool core: the underside of the mass pushed down a tone;  o.bias  whole-mass tone push.
function mass(P, cx, cy, rx, ry, m, z, o = {}) {
  const cl = o.clump ?? 5, rough = o.rough ?? 0.3, w = o.mixw ?? 0.45, seed = o.seed ?? 1, crev = o.crev ?? 0.16;
  const core = o.core ?? 0, bias0 = o.bias ?? 0, holes = o.holes ?? 0;
  const R = Math.max(rx, ry) * (1 + rough) + 2;
  const ctr = (ix, iy) => [(ix + 0.05 + 0.9 * h2(ix, iy, seed)) * cl, (iy + 0.05 + 0.9 * h2(iy, ix, seed + 7)) * cl];
  for (let j = Math.floor(cy - R + P.oy); j <= Math.ceil(cy + R + P.oy); j++) for (let i = Math.floor(cx - R + P.ox); i <= Math.ceil(cx + R + P.ox); i++) {
    const px = i + 0.5 - P.ox, py = j + 0.5 - P.oy, u = (px - cx) / rx, v = (py - cy) / ry, d = Math.hypot(u, v);
    if (d > 1 + rough) continue;
    const gx = Math.floor(px / cl), gy = Math.floor(py / cl);
    let f1 = 1e9, f2 = 1e9, bx = 0, by = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const [qx, qy] = ctr(gx + a, gy + b), dd = Math.hypot(px - qx, py - qy);
      if (dd < f1) { f2 = f1; f1 = dd; bx = qx; by = qy; } else if (dd < f2) f2 = dd;
    }
    const dc = f1 / cl;
    if (d > 1 + rough * (0.62 - dc) * 1.5) continue;
    if (holes && d < 0.85 && h2(Math.floor(px / 3), Math.floor(py / 3), seed + 3) < holes && dc > 0.5) continue;
    const dm = Math.min(d, 0.98), mz = Math.sqrt(1 - dm * dm);
    let nx = (u / Math.max(d, 1e-3)) * dm, ny = (v / Math.max(d, 1e-3)) * dm, nz = mz;
    if (w) {
      const cu = (px - bx) / (cl * 0.75), cv = (py - by) / (cl * 0.75), cd = Math.min(0.95, Math.hypot(cu, cv));
      const cnz = Math.sqrt(1 - cd * cd);
      nx = nx * (1 - w) + cu * w; ny = ny * (1 - w) + cv * w; nz = nz * (1 - w) + cnz * w;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    }
    let bias = bias0;
    // crevices between clumps, broken (a dotted shade, not a cobble grid); a lit leaf flick up-left on some clumps
    if (crev && (f2 - f1) / cl < crev && d < 0.96 && h2(i, j, seed + 11) < 0.6) bias -= 1;
    else if (dc > 0.22 && dc < 0.5 && px - bx < -cl * 0.18 && py - by < -cl * 0.18 && h2(Math.floor(bx), Math.floor(by), seed + 5) < 0.45 && h2(i, j, seed) < 0.7) bias += 1;
    if (core && v > 0.15 && d < 0.8) bias -= core * clamp((v - 0.15) * 2.2, 0, 1);
    P._put(i, j, m, z + mz * Math.min(rx, ry) * 0.7, nx, ny, nz, { bias }, (1 - d) * Math.min(rx, ry));
  }
  return P;
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

// ---- sprite frame: a Pix, a builder, resolved to a canvas with its anchor ------------------------------
function sprite(w, h, foot, build, o = {}) {
  const P = new Pix(w, h, Math.floor(w / 2), h - foot);
  build(P);
  const cv = toCanvas(P.resolve({ line: o.line || "tint" }));
  if (DAY.on) sunRim(cv, DAY.side < 0);
  return { cv, ax: Math.floor(w / 2), ay: h - foot };
}

// sway: a canopy point at height fraction f moves this many px
const sw = (s, f) => Math.round(s * Math.pow(clamp(f, 0, 1), 1.4));

// =====================================================================================================
// A: GRAND TREES
// =====================================================================================================
const A = {
  oak(pal, k = 1, s = 0, dk = 0, seed = 1) {
    const r = rng(seed), H = 205 * k;
    return sprite(Math.ceil(230 * k), Math.ceil(H + 30), 14, (P) => {
      const bk = mat(pal.bark), lf = mat(pal.oak), lf2 = mat(pal.oak2), ms = mat(pal.moss);
      const top = [0, -78 * k];
      // buttress roots
      for (const [ex, ey, rr] of [[-22, 3, 4], [-13, 6, 3.4], [16, 5, 3.6], [24, 1, 3], [4, 7, 3]]) bark(P, [[ex * 0.25 * k, -8 * k], [ex * 0.7 * k, ey * 0.4 * k], [ex * k, ey * k]], [rr * k, rr * 0.7 * k, 1.4], bk, 40 + ey, { strokes: false });
      bark(P, [[0, 2], [-1 * k, -40 * k], top], [11 * k, 8.5 * k, 7 * k], bk, 40);
      P.ellipse(-4 * k, -26 * k, 3 * k, 5 * k, ms, 41, { wrap: true });
      // boughs to every mass, then the masses (back ones first: lower z)
      const M = [
        [-74, -112, 32, 24, 10], [70, -108, 32, 24, 12], [-26, -176, 36, 24, 4], [42, -166, 30, 22, 6],
        [-66, -156, 22, 17, 8], [4, -130, 30, 22, 30], [-84, -80, 20, 15, 24], [82, -78, 20, 15, 26],
      ];
      const fork = { l: [-30 * k, -116 * k], r: [30 * k, -110 * k], c: [4 * k, -134 * k] };
      bark(P, [top, [-14 * k, -96 * k], fork.l], [7 * k, 5.5 * k, 4.2 * k], bk, 38, { strokes: false });
      bark(P, [top, [14 * k, -94 * k], fork.r], [7 * k, 5.5 * k, 4.2 * k], bk, 39, { strokes: false });
      bark(P, [top, fork.c], [5.5 * k, 3.6 * k], bk, 37, { strokes: false });
      for (const [mx, my, , , z] of M) {
        const f = -my / 205, x = mx * k + sw(s, f), y = my * k, pa = my < -140 ? fork.c : mx < 0 ? fork.l : fork.r;
        bark(P, [pa, [(pa[0] + x) / 2, (pa[1] + y) / 2 - 4 * k], [x * 0.9, y * 0.94]], [3.8 * k, 2.6 * k, 1.6 * k], bk, 30 + z * 0.5, { strokes: false });
      }
      let i = 0;
      for (const [mx, my, rx, ry, z] of M) {
        P.part();
        const f = -my / 205;
        mass(P, mx * k + sw(s, f), my * k, rx * k, ry * k, i % 3 === 1 ? lf2 : lf, 60 + z, { clump: 7.5 * k, crev: 0.1, mixw: 0.4, rough: 0.28, seed: seed * 13 + i, bias: -dk, core: 1 });
        i++;
      }
      void r;
    });
  },
  poplar(pal, k = 1, s = 0, dk = 0, seed = 2) {
    const H = 235 * k;
    return sprite(Math.ceil(90 * k), Math.ceil(H + 24), 10, (P) => {
      const bk = mat(pal.bark), lf = mat(pal.poplar);
      bark(P, [[0, 2], [0, -40 * k], [0, -200 * k]], [6 * k, 4.5 * k, 1.5], bk, 40);
      for (const [x, y] of [[-6, 4], [7, 3]]) bark(P, [[0, -4], [x * k, y * k]], [3 * k, 1.5], bk, 41, { strokes: false });
      const M = [[0, -205, 16, 26], [-3, -175, 22, 28], [4, -145, 26, 30], [-4, -112, 27, 30], [3, -80, 24, 26], [-2, -58, 17, 16]];
      M.forEach(([mx, my, rx, ry], i) => { P.part(); mass(P, mx * k + sw(s * 1.3, -my / 235), my * k, rx * k, ry * k, lf, 60 + i * 6, { clump: 5 * k, rough: 0.25, mixw: 0.5, seed: seed * 7 + i, bias: -dk, core: 1 }); });
    });
  },
  pine(pal, k = 1, s = 0, dk = 0, seed = 3, lean = 1) {
    const H = 215 * k;
    return sprite(Math.ceil(200 * k), Math.ceil(H + 26), 12, (P) => {
      const bk = mat(pal.bark), up = mat(pal.barkUp), lf = mat(pal.pine), lf2 = mat(pal.pine2 || pal.pine, { contrast: 1.1 });
      const L = lean;
      bark(P, [[0, 2], [4 * L * k, -50 * k], [14 * L * k, -110 * k]], [8 * k, 6 * k, 4.5 * k], bk, 40);
      bark(P, [[14 * L * k, -110 * k], [24 * L * k, -160 * k], [30 * L * k + sw(s, 0.8), -192 * k]], [4.5 * k, 3.4 * k, 2.2], up, 40);
      for (const [x, y] of [[-14, 4], [12, 5]]) bark(P, [[0, -4], [x * k, y * k]], [4 * k, 1.5], bk, 41, { strokes: false });
      // bare stub branches low on the trunk
      bark(P, [[8 * L * k, -78 * k], [-12 * k, -92 * k]], [1.6, 1], bk, 41, { strokes: false });
      const pads = [[30, -196, 42, 15, lf], [-10, -178, 40, 14, lf2], [52, -170, 34, 13, lf], [8, -150, 36, 13, lf2], [-28, -146, 26, 10, lf], [40, -138, 28, 11, lf2]];
      pads.forEach(([mx, my, rx, ry, m], i) => {
        const x = (mx + 14 * (L - 1)) * k + sw(s, -my / 215), y = my * k;
        bark(P, [[(14 + 12 * (-my - 110) / 85) * L * k, (my + 10) * k], [x, y + 3]], [2.2, 1.4], up, 45, { strokes: false });
        P.part(); mass(P, x, y, rx * k, ry * k, m, 60 + i * 5, { clump: 4 * k, rough: 0.35, mixw: 0.55, seed: seed * 5 + i, bias: -dk, core: 1 });
      });
    });
  },
  spruce(pal, k = 1, s = 0, dk = 0, seed = 6) {
    const H = 240 * k;
    return sprite(Math.ceil(130 * k), Math.ceil(H + 26), 12, (P) => {
      const bk = mat(pal.bark), lf = mat(pal.pine), lf2 = mat(pal.pine2 || pal.pine, { contrast: 1.1 });
      for (const [x, y] of [[-13, 4], [12, 5], [2, 6]]) bark(P, [[0, -4], [x * 0.6 * k, y * 0.3 * k], [x * k, y * k]], [4 * k, 2.6 * k, 1.2], bk, 41, { strokes: false });
      bark(P, [[0, 2], [0, -60 * k], [sw(s, 1), -228 * k]], [7 * k, 5 * k, 1.5], bk, 40);
      const N = 11;
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1), y = (-48 - t * 178) * k, rx = (52 * (1 - t) + 8) * k, x = sw(s, -y / H) + (i % 2 ? 2 : -2) * k;
        P.part();
        mass(P, x, y, rx, (12 - t * 3) * k, i % 2 ? lf2 : lf, 40 + (N - i) * 4, { clump: 4 * k, rough: 0.4, mixw: 0.5, seed: seed * 19 + i, bias: -dk, core: 1.4 });
      }
    });
  },
  birches(pal, k = 1, s = 0, dk = 0, seed = 4) {
    const H = 175 * k;
    return sprite(Math.ceil(150 * k), Math.ceil(H + 24), 12, (P) => {
      const bk = mat(pal.birchBark), mk = mat(pal.mark), lf = mat(pal.birch);
      const stems = [[-26, 4, -38, 150, -4], [6, 0, 12, 172, 3], [30, 6, 44, 140, 7]];
      stems.forEach(([x0, y0, x1, h, bend], n) => {
        const pts = [[x0 * k, y0 * k], [(x0 + bend) * k, (y0 - h * 0.5) * k], [x1 * k + sw(s, 0.9), (y0 - h) * k]];
        P.part(); P.limb(pts, [3.6 * k, 2.8 * k, 1.4], bk, 40 + y0);
        for (let t = 0.1; t < 0.85; t += 0.11 + h2(n, t * 100, seed) * 0.08) {
          const y = pts[0][1] + (pts[2][1] - pts[0][1]) * t, x = pts[0][0] + (pts[2][0] - pts[0][0]) * t + bend * k * Math.sin(t * Math.PI) * 0.5;
          P.line(x - 2, y, x + (h2(n, t * 99, 3) > 0.5 ? 1 : 0), y, mk, 41 + y0, { wrap: true });
        }
      });
      const M = [[-38, -152, 22, 13], [-32, -126, 24, 13], [-28, -100, 18, 10], [12, -170, 24, 14], [16, -144, 26, 14], [8, -116, 22, 12], [44, -134, 22, 13], [40, -108, 20, 11], [48, -86, 14, 9]];
      M.forEach(([mx, my, rx, ry], i) => { P.part(); mass(P, mx * k + sw(s * 1.3, -my / 175), my * k, rx * k, ry * k, lf, 60 + i * 4, { clump: 4 * k, rough: 0.55, mixw: 0.5, seed: seed * 9 + i, bias: -dk, holes: 0.25, core: 1 }); });
    });
  },
  bush(pal, k = 1, s = 0, dk = 0, seed = 5) {
    return sprite(Math.ceil(80 * k), Math.ceil(52 * k), 8, (P) => {
      const lf = mat(pal.bush), fl = mat(pal.flower[Math.abs(seed | 0) % 3]);
      [[-16, -14, 18, 13], [14, -15, 19, 14], [0, -24, 18, 14]].forEach(([x, y, rx, ry], i) => { P.part(); mass(P, x * k, y * k, rx * k, ry * k, lf, 40 + i * 3 + (y > -20 ? 6 : 0), { clump: 4 * k, rough: 0.3, mixw: 0.5, seed: seed * 3 + i, bias: -dk, core: 1 }); });
      const r = rng(seed * 31);
      for (let n = 0; n < 9; n++) P.dot((r() - 0.5) * 50 * k, -8 - r() * 28 * k, fl, 99, { fix: 3 + (n & 1) });
    });
  },
};

// =====================================================================================================
// B: SCULPTED CANOPY — a few big clean lobes, banded tones, a cool core, a hard rim
// =====================================================================================================
const lobe = (P, x, y, rx, ry, m, z, seed, dk = 0) => { P.part(); mass(P, x, y, rx, ry, m, z, { clump: 9, rough: 0.1, mixw: 0.12, crev: 0, seed, core: 1.4, bias: -dk }); };
const B = {
  oak(pal, k = 1, s = 0, dk = 0, seed = 1) {
    return sprite(Math.ceil(150 * k), Math.ceil(165 * k), 10, (P) => {
      const bk = mat(pal.bark, { contrast: 1.2 }), lf = mat(pal.oak, { contrast: 1.35 });
      bark(P, [[0, 2], [-2 * k, -30 * k], [-2 * k, -54 * k]], [8 * k, 6 * k, 5 * k], bk, 40);
      bark(P, [[-2 * k, -50 * k], [-18 * k, -70 * k]], [4 * k, 2.6 * k], bk, 41, { strokes: false });
      bark(P, [[-2 * k, -50 * k], [16 * k, -72 * k]], [4 * k, 2.6 * k], bk, 41, { strokes: false });
      for (const x of [-9, 9]) bark(P, [[0, -5], [x * k, 3 * k]], [4 * k, 1.8], bk, 41, { strokes: false });
      lobe(P, -30 * k + sw(s, 0.6), -92 * k, 34 * k, 30 * k, lf, 60, seed, dk);
      lobe(P, 30 * k + sw(s, 0.6), -90 * k, 34 * k, 29 * k, lf, 62, seed + 1, dk);
      lobe(P, 0 + sw(s, 0.9), -122 * k, 40 * k, 32 * k, lf, 56, seed + 2, dk);
      lobe(P, 2 * k + sw(s, 0.5), -80 * k, 30 * k, 22 * k, lf, 75, seed + 3, dk);
    }, { line: "tint" });
  },
  poplar(pal, k = 1, s = 0, dk = 0, seed = 2) {
    return sprite(Math.ceil(70 * k), Math.ceil(185 * k), 8, (P) => {
      const bk = mat(pal.bark, { contrast: 1.2 }), lf = mat(pal.poplar, { contrast: 1.35 });
      bark(P, [[0, 2], [0, -40 * k]], [5 * k, 4 * k], bk, 40);
      lobe(P, sw(s, 0.95), -128 * k, 22 * k, 36 * k, lf, 50, seed, dk);
      lobe(P, sw(s, 0.6), -82 * k, 26 * k, 36 * k, lf, 60, seed + 1, dk);
    });
  },
  spruce(pal, k = 1, s = 0, dk = 0, seed = 3) {
    return sprite(Math.ceil(100 * k), Math.ceil(170 * k), 8, (P) => {
      const bk = mat(pal.bark, { contrast: 1.2 }), lf = mat(pal.pine2 || "#2f6a48", { contrast: 1.5 });
      bark(P, [[0, 2], [0, -48 * k]], [5 * k, 4 * k], bk, 40, { strokes: false });
      const T = [[-150, 18, 26], [-118, 28, 34], [-84, 38, 40], [-50, 46, 40]];
      T.forEach(([y, hw, hh], i) => {
        const dx = sw(s, -y / 160);
        P.part();
        const pts = [[dx * 1.2, (y - hh) * k]];
        for (let n = 0; n <= 6; n++) { const t = n / 6; pts.push([(hw - 2 * hw * t) * k + dx, y * k + (n % 2 ? 3 * k : 0) + Math.sin(t * Math.PI) * 6 * k]); }
        P.poly(pts, lf, 50 + i * 8, { round: 1, ny: -0.05, bias: -dk });
        // the shadowed underside skirt
        for (let x = -hw; x <= hw; x++) P.tone(x * k + dx, y * k + Math.sin((x / hw + 1) / 2 * Math.PI) * 6 * k - 1, -1);
        void seed;
      });
    });
  },
  birches(pal, k = 1, s = 0, dk = 0, seed = 4) {
    return sprite(Math.ceil(110 * k), Math.ceil(150 * k), 8, (P) => {
      const bk = mat(pal.birchBark, { contrast: 1.2 }), mk = mat(pal.mark), lf = mat(pal.birch, { contrast: 1.35 });
      [[-18, 4, -22, 96], [12, 0, 16, 112]].forEach(([x0, y0, x1, h], n) => {
        P.part(); P.limb([[x0 * k, y0 * k], [x1 * k + sw(s, 0.8), (y0 - h) * k]], [3.2 * k, 2 * k], bk, 40 + y0);
        for (let t = 0.12; t < 0.6; t += 0.14) { const y = (y0 - h * t) * k, x = (x0 + (x1 - x0) * t) * k; P.line(x - 2, y, x, y, mk, 45, { wrap: true }); }
        void n;
      });
      lobe(P, -20 * k + sw(s, 0.8), -100 * k, 26 * k, 24 * k, lf, 60, seed, dk);
      lobe(P, 18 * k + sw(s, 0.9), -116 * k, 28 * k, 26 * k, lf, 58, seed + 1, dk);
      lobe(P, 4 * k + sw(s, 0.6), -84 * k, 20 * k, 15 * k, lf, 70, seed + 2, dk);
    });
  },
  bush(pal, k = 1, s = 0, dk = 0, seed = 5) {
    return sprite(Math.ceil(64 * k), Math.ceil(44 * k), 6, (P) => {
      const lf = mat(pal.bush, { contrast: 1.35 }), fl = mat(pal.flower[Math.abs(seed | 0) % 3]);
      lobe(P, -10 * k, -14 * k, 16 * k, 12 * k, lf, 40, seed, dk);
      lobe(P, 11 * k, -13 * k, 15 * k, 11 * k, lf, 44, seed + 1, dk);
      const r = rng(seed * 7);
      for (let n = 0; n < 5; n++) P.dot((r() - 0.5) * 34 * k, -8 - r() * 16 * k, fl, 99, { fix: 4 });
    });
  },
};

// =====================================================================================================
// C: A LIVING WOOD — finer leaves, every tree in its own place (the ground pieces live in dressGround)
// =====================================================================================================
const fine = (P, x, y, rx, ry, m, z, seed, dk = 0, o = {}) => { P.part(); mass(P, x, y, rx, ry, m, z, { clump: 3.2, rough: 0.34, mixw: 0.55, crev: 0.2, seed, core: 1, bias: -dk, ...o }); };
const C = {
  oak(pal, k = 1, s = 0, dk = 0, seed = 1) {
    return sprite(Math.ceil(160 * k), Math.ceil(160 * k), 10, (P) => {
      const bk = mat(pal.bark), lf = mat(pal.oak), lf2 = mat(pal.oak2), ms = mat(pal.moss);
      for (const [x, y] of [[-14, 4], [12, 5], [3, 6]]) bark(P, [[0, -6], [x * 0.7 * k, y * 0.4 * k], [x * k, y * k]], [3.5 * k, 2.4 * k, 1.2], bk, 41, { strokes: false });
      bark(P, [[0, 2], [0, -44 * k]], [7 * k, 5.5 * k], bk, 40);
      P.ellipse(-3 * k, -12 * k, 2.5 * k, 4 * k, ms, 41, { wrap: true });
      for (const [x, y] of [[-30, -78], [28, -76], [0, -96]]) bark(P, [[0, -40 * k], [x * k * 0.8, y * k * 0.9]], [3.4 * k, 1.8], bk, 42, { strokes: false });
      const M = [[-36, -86, 32, 26, lf], [34, -84, 32, 26, lf2], [-6, -116, 38, 28, lf], [6, -84, 30, 22, lf2], [-22, -64, 20, 14, lf], [24, -64, 20, 14, lf]];
      M.forEach(([x, y, rx, ry, m], i) => fine(P, x * k + sw(s, -y / 150), y * k, rx * k, ry * k, m, 60 + i * 4 + (y > -70 ? 10 : 0), seed * 11 + i, dk));
    });
  },
  ash(pal, k = 1, s = 0, dk = 0, seed = 2) {
    return sprite(Math.ceil(120 * k), Math.ceil(190 * k), 10, (P) => {
      const bk = mat("#8a8070"), lf = mat(pal.poplar);
      bark(P, [[0, 2], [2 * k, -60 * k], [-4 * k, -110 * k]], [5.5 * k, 4.2 * k, 2.6 * k], bk, 40);
      bark(P, [[2 * k, -60 * k], [26 * k, -100 * k]], [3 * k, 1.6], bk, 41, { strokes: false });
      bark(P, [[1 * k, -78 * k], [-28 * k, -112 * k]], [2.6 * k, 1.4], bk, 41, { strokes: false });
      const M = [[-4, -150, 28, 24], [28, -112, 24, 20], [-30, -122, 24, 20], [6, -122, 26, 20], [-12, -94, 18, 13]];
      M.forEach(([x, y, rx, ry], i) => fine(P, x * k + sw(s * 1.2, -y / 170), y * k, rx * k, ry * k, lf, 60 + i * 4, seed * 3 + i, dk, { holes: 0.18 }));
    });
  },
  hawthorn(pal, k = 1, s = 0, dk = 0, seed = 3, blossom = true) {
    return sprite(Math.ceil(110 * k), Math.ceil(110 * k), 8, (P) => {
      const bk = mat(pal.bark), lf = mat(pal.haw), bl = mat(pal.blossom);
      bark(P, [[0, 2], [-6 * k, -22 * k], [4 * k, -40 * k]], [4.5 * k, 3.4 * k, 2.4 * k], bk, 40);
      const M = [[-20, -56, 24, 18], [18, -58, 24, 19], [0, -74, 26, 18], [0, -46, 20, 12]];
      M.forEach(([x, y, rx, ry], i) => fine(P, x * k + sw(s, -y / 90), y * k, rx * k, ry * k, lf, 60 + i * 5, seed * 17 + i, dk));
      if (blossom) { const r = rng(seed * 101); for (let n = 0; n < 90; n++) { const a = r() * 6.28, d = Math.sqrt(r()); P.dot(Math.cos(a) * d * 40 * k, -60 * k + Math.sin(a) * d * 24 * k, bl, 99, { fix: r() < 0.6 ? 4 : 3, wrap: true }); } }
    });
  },
  birches: (pal, k, s, dk, seed) => A.birches(pal, k * 0.78, s, dk, seed),
  pine: (pal, k, s, dk, seed) => A.pine(pal, k * 0.72, s, dk, seed),
  bush(pal, k = 1, s = 0, dk = 0, seed = 5) {
    return sprite(Math.ceil(70 * k), Math.ceil(46 * k), 7, (P) => {
      const lf = mat(pal.bush), fl = mat(pal.flower[Math.abs(seed | 0) % 3]);
      [[-14, -12, 15, 11], [12, -12, 15, 11], [0, -20, 15, 11]].forEach(([x, y, rx, ry], i) => fine(P, x * k, y * k, rx * k, ry * k, lf, 40 + i * 3 + (y > -18 ? 6 : 0), seed * 3 + i, dk));
      const r = rng(seed * 31);
      for (let n = 0; n < 7; n++) P.dot((r() - 0.5) * 40 * k, -6 - r() * 22 * k, fl, 99, { fix: 4 });
    });
  },
  fern(pal, k = 1, s = 0, dk = 0, seed = 6) {
    return sprite(Math.ceil(36 * k), Math.ceil(22 * k), 4, (P) => {
      const lf = mat(pal.oak2);
      const r = rng(seed);
      for (let n = 0; n < 7; n++) {
        const a = Math.PI * (0.08 + 0.84 * (n / 6)) + (r() - 0.5) * 0.2, L = (12 + r() * 5) * k;
        const ex = -Math.cos(a) * L, ey = -Math.sin(a) * L * 0.75;
        P.part(); P.limb([[0, 0], [ex * 0.55, ey * 0.75 - 2], [ex, ey]], [1.6, 1.4, 0.6], lf, 40 + (Math.abs(ex) < 5 ? -2 : 2) - dk, { round: 0.6 });
      }
    }, { line: "tint" });
  },
};

// =====================================================================================================
// ground pieces for C (and stumps / logs anyone may use)
// =====================================================================================================
export const PIECES = {
  stump(pal, k = 1) {
    return sprite(40, 30, 6, (P) => {
      const bk = mat(pal.bark), wd = mat("#c8a070"), ms = mat(pal.moss);
      for (const x of [-9, 8]) bark(P, [[0, -3], [x, 3]], [3, 1.2], bk, 40, { strokes: false });
      P.part(); P.rect(-7 * k, -10 * k, 14 * k, 10 * k, bk, 42, { round: 0.9 });
      P.part(); P.ellipse(0, -10 * k, 7 * k, 3.4 * k, wd, 50, { n: [0, -0.6, 0.8] });
      P.ellipse(0, -10 * k, 4 * k, 1.8 * k, wd, 50, { wrap: true, bias: -1 });
      P.ellipse(0, -10 * k, 1.5, 0.8, wd, 50, { wrap: true });
      P.ellipse(-5, -3, 3, 3, ms, 43, { wrap: true });
    });
  },
  log(pal, k = 1) {
    return sprite(110, 40, 8, (P) => {
      const bk = mat(pal.bark), wd = mat("#c8a070"), ms = mat(pal.moss), mu = mat("#c8483a"), st = mat("#e8dcc8");
      P.part(); P.limb([[-44, -7], [0, -9], [40, -8]], [7, 7.5, 6.5], bk, 40);
      for (let x = -40; x < 38; x += 6) P.toneLine(x, -13, x + 4, -12, -1);
      P.part(); P.ellipse(41, -8, 3.2, 6.4, wd, 60, { n: [0.8, 0, 0.6] });
      P.ellipse(41, -8, 1.4, 3, wd, 60, { wrap: true, bias: -1 });
      P.ellipse(-12, -14, 14, 4, ms, 41, { wrap: true });
      P.ellipse(14, -15, 9, 3, ms, 41, { wrap: true });
      for (const [x, y] of [[-30, -2], [-24, -1], [20, -1]]) { P.part(); P.rect(x, y - 3, 1, 3, st, 70); P.ellipse(x + 0.5, y - 3.5, 2.6, 1.6, mu, 71, { n: [0, -0.7, 0.7] }); }
    });
  },
  mushrooms(pal) {
    return sprite(24, 16, 3, (P) => {
      const mu = mat("#c8483a"), st = mat("#e8dcc8");
      for (const [x, y, r] of [[-5, 0, 3], [2, 1, 2.2], [6, -1, 1.8]]) { P.part(); P.rect(x, y - 3, 1, 3, st, 40 + y); P.ellipse(x + 0.5, y - 3.5, r, r * 0.6, mu, 41 + y, { n: [0, -0.7, 0.7] }); P.dot(x - 0.5, y - 4, st, 42 + y, { fix: 4 }); }
    });
  },
  deer(pal, flip = 1) {
    return sprite(56, 50, 6, (P) => {
      const fur = mat("#a86a3c"), pale = mat("#e8d4b0"), dk = mat("#3a2a24");
      const f = flip;
      P.part(); P.limb([[-10 * f, -14], [-11 * f, -6], [-10 * f, 0]], [1.6, 1.2, 1], fur, 30);
      P.limb([[9 * f, -14], [10 * f, -6], [11 * f, 0]], [1.6, 1.2, 1], fur, 30);
      P.part(); P.ellipse(0, -18, 14, 6.5, fur, 40);
      P.ellipse(-13 * f, -20, 2.6, 3, pale, 41);
      P.part(); P.limb([[-8 * f, -14], [-8 * f, -6], [-7 * f, 0]], [1.8, 1.3, 1], fur, 50);
      P.limb([[8 * f, -14], [8 * f, -6], [9 * f, 0]], [1.8, 1.3, 1], fur, 50);
      P.part(); P.limb([[10 * f, -20], [15 * f, -30]], [3.6, 2.6], fur, 55);
      P.part(); P.ellipse(18 * f, -32, 4.6, 3.2, fur, 60, { rot: 0.3 * f });
      P.ellipse(22 * f, -31, 2, 1.6, fur, 61);
      P.dot(23.5 * f, -31.5, dk, 62);
      P.ellipse(14 * f, -37, 1.4, 3, fur, 58);
      P.dot(18 * f, -33.5, dk, 62);
    });
  },
};

// ---- species per option ----
export const OPT = { A, B, C };
export const SPECIES = {
  A: ["oak", "poplar", "birches", "pine"],
  B: ["oak", "poplar", "birches", "spruce"],
  C: ["oak", "ash", "hawthorn", "birches"],
};
// canopy middle height and canopy radius, board units (for keeping it off the road), per option and species at k = 1
export const REACH = {
  A: { oak: [65, 55], poplar: [72, 18], pine: [85, 42], spruce: [70, 30], birches: [65, 36], bush: [8, 14] },
  B: { oak: [48, 36], poplar: [52, 13], spruce: [48, 22], birches: [48, 24], bush: [6, 12] },
  C: { oak: [42, 36], ash: [62, 26], hawthorn: [28, 24], birches: [52, 28], pine: [62, 30], bush: [6, 13] },
};

// ---- shadows ----
// at noon a short shadow under and right of the crown; under a low sun the game's own cast (sceneryday.js)
export function shadowMask(sp) {
  if (DAY.on && DAY.len > 0) {
    const m = castShadow({ cv: sp.cv, hw: sp.ax / 2, top: sp.ay / 2, bot: (sp.cv.height - sp.ay) / 2 }, false, true);
    if (m) return { cv: m.cv, x0: m.x0, y0: m.y0 };
    return null;
  }
  // noon: the silhouette laid flat, a short way down-right (a high sun), squashed
  const cv = sp.cv, w = cv.width, h = cv.height, a = cv.getContext("2d").getImageData(0, 0, w, h).data;
  const pts = []; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (a[(j * w + i) * 4 + 3] < 160) continue;
    const hh = sp.ay - j;
    const X = Math.round(i - sp.ax + hh * 0.3), Y = Math.round(-hh * 0.42 + hh * 0.5 * 0.4 + 2);
    pts.push(X, Y); x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
  }
  if (!pts.length) return null;
  const out = document.createElement("canvas"); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  const oc = out.getContext("2d"), img = oc.createImageData(out.width, out.height);
  for (let p = 0; p < pts.length; p += 2) { const q = ((pts[p + 1] - y0) * out.width + (pts[p] - x0)) * 4; img.data[q + 3] = 255; }
  oc.putImageData(img, 0, 0);
  return { cv: out, x0, y0 };
}

// stamp many shadows into one mask (no double darkening) and lay it on ctx (canvas px = art px)
export function layShadows(ctx, items, W, H, dapple = 0) {
  const m = document.createElement("canvas"); m.width = W; m.height = H;
  const mc = m.getContext("2d");
  for (const it of items) { const s = shadowMask(it.sp); if (s) mc.drawImage(s.cv, Math.round(it.px + s.x0), Math.round(it.py + s.y0)); }
  const img = mc.getImageData(0, 0, W, H), d = img.data;
  const [r, g, b, al] = DAY.shade || [42, 28, 44, 0.3];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const q = (j * W + i) * 4;
    if (d[q + 3] < 128) { d[q + 3] = 0; continue; }
    // dappled: sun flecks through the leaves (C), clumped 3x2 cells
    if (dapple && h2(Math.floor(i / 3), Math.floor(j / 2), 77) < dapple) { d[q + 3] = 0; continue; }
    d[q] = r; d[q + 1] = g; d[q + 2] = b; d[q + 3] = Math.round(255 * al * (dapple ? 1.15 : 1));
  }
  mc.putImageData(img, 0, 0);
  ctx.drawImage(m, 0, 0);
}

// ---- C's ground ring: leaf litter, flowers and roots round a tree (canvas px = art px) ----
export function litterRing(ctx, px, py, rx, seed, pal, autumn) {
  const r = rng(seed), ry = rx * 0.5;
  // a darker, trodden-earth pool under the crown, dithered out to its rim
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
    const d = Math.hypot(i / rx, j / ry);
    if (d > 0.9) continue;
    const th = d < 0.45 ? 0.62 : d < 0.7 ? 0.38 : 0.16;
    if (h2(i + 999, j + 999, seed) > th) continue;
    ctx.fillStyle = autumn ? "rgba(120,70,30,0.35)" : "rgba(70,74,30,0.34)";
    ctx.fillRect(Math.round(px + i), Math.round(py + j), 1, 1);
  }
  // surface roots
  for (let n = 0; n < 6; n++) {
    const a = Math.PI * (n / 5) + (r() - 0.5) * 0.4, L = 6 + r() * 10;
    for (let t = 3; t < L; t++) { ctx.fillStyle = t < L * 0.6 ? "#5a3e2a" : "#6e5236"; ctx.fillRect(Math.round(px + Math.cos(a) * t * 1.3), Math.round(py - 1 + Math.sin(a) * t * 0.5), 1, 1); }
  }
  const cols = autumn ? ["#a8642c", "#c88a3a", "#8a4a2a", "#d8a848"] : ["#8a6a3a", "#a88044", "#6a7a34", "#7a5a34"];
  for (let n = 0; n < rx * rx * 0.9; n++) {
    const a = r() * 6.283, d = Math.pow(r(), 0.7);
    if (r() > 1.15 - d) continue;
    const x = Math.round(px + Math.cos(a) * d * rx), y = Math.round(py + Math.sin(a) * d * ry);
    ctx.fillStyle = cols[(r() * cols.length) | 0];
    ctx.fillRect(x, y, r() < 0.3 ? 2 : 1, 1);
  }
  for (let n = 0; n < rx * 0.35; n++) {
    const a = r() * 6.283, d = 0.75 + r() * 0.5, x = Math.round(px + Math.cos(a) * d * rx), y = Math.round(py + Math.sin(a) * d * ry);
    ctx.fillStyle = pal.flower[(r() * 3) | 0]; ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = "#3e6a2a"; ctx.fillRect(x, y + 1, 1, 1);
  }
}

// light shafts through a wood (C): stepped, warm, slanting with the sun
export function shafts(ctx, x0, y0, w, h, seed) {
  const r = rng(seed);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let n = 0; n < 6; n++) {
    const x = x0 + r() * w, bw = 10 + r() * 16, len = 120 + r() * 120, y = y0 + r() * h;
    for (const [k, a] of [[1, 0.07], [0.55, 0.09]]) {
      ctx.fillStyle = `rgba(255,232,160,${a})`;
      ctx.beginPath();
      ctx.moveTo(Math.round(x - bw * k / 2), y); ctx.lineTo(Math.round(x + bw * k / 2), y);
      ctx.lineTo(Math.round(x + bw * k / 2 + len * 0.5), y + len); ctx.lineTo(Math.round(x - bw * k / 2 + len * 0.5), y + len);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

// birds: a few dark pixel chevrons and their shadows
export function birds(ctx, x, y, seed) {
  const r = rng(seed);
  for (let n = 0; n < 4; n++) {
    const bx = Math.round(x + r() * 60), by = Math.round(y + r() * 30), up = r() < 0.5;
    ctx.fillStyle = "rgba(30,24,36,0.25)"; ctx.fillRect(bx + 20, by + 46, 3, 1);
    ctx.fillStyle = "#2a2430";
    ctx.fillRect(bx, by, 1, 1); ctx.fillRect(bx + 1, by + (up ? -1 : 1), 1, 1); ctx.fillRect(bx + 2, by, 1, 1);
    ctx.fillRect(bx - 1, by + (up ? -1 : 1), 1, 1); ctx.fillRect(bx + 3, by + (up ? -1 : 1), 1, 1);
  }
}
