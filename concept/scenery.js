// ============ SCENERY CONCEPT: one board corner in three looks (2026-11-14) ============
// A standalone renderer for the graphics-pass concept round (ground, trees, castle). Nothing in
// the game reads it. `renderScene("a"|"b"|"c")` returns { w, h, rgba } for one corner of a
// Greenwood board, 240 x 176 art pixels: turf, a stretch of the dirt road running to the gate,
// three trees and bushes, flowers and stones, the curtain wall with a tower and the gate's edge,
// and the Archer hall (level 2, the real pix hall through hall-kit) standing in it for scale.
//   A  clean   today's layout and palette, tidied: few crisp marks, flat calm tone
//   B  worked  the halls' treatment B: tufts and tone patches, ruts and pebbles, lit lumps of
//              leaf with real cast shadows, the wall stone by stone, weathering, ivy, lit slits
//   C  bolder  B on bigger shapes: richer colour, deeper shadow, brighter light, fewer larger marks
// The objects (wall, tower, trees, bushes) are sculpted with Pix like the halls: material +
// depth + normal per pixel, one sun from the upper left, a one-pixel tinted line. The ground
// is plain pixels. Coordinates are art pixels; ground x east, s (= screen y at z 0) south, z up;
// a point z high is drawn z up and 0.5 z to the east, the game's own lean (castle.js LEAN).
import { Pix, mat, flat } from "../src/render/pix/pix.js";
import * as kit from "../src/render/pix/hall-kit.js";
import { frameAt } from "../src/render/pix/rig.js";

export const W = 240, H = 176;
const LEAN = 0.5, PLUM = [42, 28, 44];
const hash = kit.hash, clamp = kit.clamp;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const smooth = (t) => t * t * (3 - 2 * t);
const vn = (x, y, seed = 0) => {            // smooth value noise, 0..1
  const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));

// ---- the three looks ----------------------------------------------------------------
const PROFILES = {
  a: {
    key: "A", label: "clean",
    grass: ["#6f9f4a", "#76a84f", "#82b256", "#8cb95c", "#9bc468"].map(hex),
    road: ["#a8844f", "#b69158", "#c4a068", "#cdab72", "#d6b67e"].map(hex),
    stone: "#a19a8a", stoneAlt: "#a69e8a", deck: "#aca08a", moss: "#7a8a56", contrast: 1,
    leaves: ["#4f8a3c", "#5f9a46"], trunk: "#7a5334", leafContrast: 1, bush: ["#4f8a3c", "#5f9a46"],
    course: 8, stoneL: 15, joints: false, vary: false, wear: false, lit: false, shadowA: 0.26, tuftCell: [18, 13], tuftP: 0.38,
    lumps: 0, trees: 1,
  },
  b: {
    key: "B", label: "worked",
    grass: ["#5d8f44", "#6d9f4b", "#82b256", "#93c162", "#a8cf74"].map(hex),
    road: ["#8a6a44", "#a8844f", "#c4a068", "#d6b67e", "#e6caa0"].map(hex),
    stone: "#a19a8a", stoneAlt: "#a8a08a", deck: "#b0a48c", moss: "#6f8f4a", contrast: 1,
    leaves: ["#3f7a3a", "#58963f", "#7cb04c"], trunk: "#6f4a2a", leafContrast: 1, bush: ["#3f7a3a", "#58963f", "#7cb04c"],
    course: 6, stoneL: 10, joints: true, vary: true, wear: true, lit: true, shadowA: 0.34, tuftCell: [8, 6], tuftP: 0.62,
    lumps: 9, trees: 1,
  },
  c: {
    key: "C", label: "bolder",
    grass: ["#2c6a3c", "#3f8a3a", "#58a834", "#79c23f", "#a4dc58"].map(hex),
    road: ["#6a4630", "#98683a", "#c08a48", "#dca860", "#f4d08c"].map(hex),
    stone: "#b49a84", stoneAlt: "#a8a292", deck: "#c0a888", moss: "#5c9a3a", contrast: 1.3,
    leaves: ["#1f6a3a", "#3a9a2e", "#82cc30"], trunk: "#6a3e24", leafContrast: 1.3, bush: ["#1f6a3a", "#3a9a2e", "#82cc30"],
    course: 8, stoneL: 14, joints: true, vary: true, wear: true, lit: true, shadowA: 0.5, tuftCell: [11, 8], tuftP: 0.5,
    lumps: 6, trees: 1.35,
  },
};

// ---- the painter ----------------------------------------------------------------------
export async function renderScene(sk) {
  const P = PROFILES[sk], A = sk === "a", C = sk === "c";
  const [g0, g1, g2, g3, g4] = P.grass, [r0, r1, r2, r3, r4] = P.road;
  const buf = new Float32Array(W * H * 3);
  const px1 = (x, y, c, a = 1) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return; const k = (y * W + x) * 3; for (let i = 0; i < 3; i++) buf[k + i] += (c[i] - buf[k + i]) * a; };
  const get = (x, y) => { const k = (y * W + x) * 3; return [buf[k], buf[k + 1], buf[k + 2]]; };

  // ---------------- the road: a centre line that runs from the left edge to the gate ----------------
  const WX = 18, GATE_X = 160 + WX, RW = A ? 21 : C ? 23 : 22;
  const cy = (x) => 154 + 8 * smooth(clamp(x / GATE_X, 0, 1)) - 4 * Math.sin(x / 38);
  const edge = (x, side) => (A ? 0 : (vn(x / (C ? 9 : 7), side * 5, 3) - 0.5) * (C ? 7 : 5));   // the worn, wandering edge
  const roadD = (x, y) => {                       // signed distance inside the road (positive = inside)
    if (x > GATE_X + 2) return -99;
    const d = y - cy(x), side = d < 0 ? -1 : 1;
    return RW + edge(x, side) - Math.abs(d);
  };

  // ---------------- turf ----------------
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = g2;
    if (!A) {
      const big = C ? 26 : 16, n = vn(x / big, y / (big * 0.75), 1) * 0.65 + vn(x / (big * 0.4), y / (big * 0.32), 2) * 0.35, b = BAYER[y & 3][x & 3] * 0.14;
      const q = n + (b - 0.07);
      c = q < 0.32 ? g1 : q > 0.68 ? g3 : g2;
      if (C && q < 0.2) c = g0;
      if (C && q > 0.82) c = g3;
    }
    px1(x, y, c);
  }
  // tufts: tiny lit blades, sun from the upper left
  const [tcx, tcy] = P.tuftCell;
  for (let j = -1; j < H / tcy + 1; j++) for (let i = -1; i < W / tcx + 1; i++) {
    if (hash(i, j, 11) > P.tuftP) continue;
    const x = Math.floor(i * tcx + hash(i, j, 12) * tcx), y = Math.floor(j * tcy + hash(i, j, 13) * tcy);
    if (roadD(x, y) > -3) continue;
    if (A) { px1(x, y, g1); px1(x + 1, y, g1); if (hash(i, j, 14) > 0.7) px1(x, y - 1, g3); }
    else if (!C) { px1(x, y, g0); px1(x + 1, y, g1); px1(x, y - 1, g3); px1(x + 1, y - 1, g1); px1(x - 1, y - 1, g4); px1(x + 1, y - 2, g3); }
    else { px1(x, y, g0); px1(x + 1, y, g0); px1(x + 2, y, g1); px1(x, y - 1, g3); px1(x + 1, y - 1, g1); px1(x - 1, y - 2, g4); px1(x, y - 2, g3); px1(x + 1, y - 3, g4); px1(x + 2, y - 2, g2); }
  }
  // ---------------- the road ----------------
  for (let y = 0; y < H; y++) for (let x = 0; x <= GATE_X + 2; x++) {
    const d = roadD(x, y);
    if (d < -3) continue;
    const side = y < cy(x) ? -1 : 1;
    if (d < 0) {                                        // worn fringe: the dirt creeps into the grass
      if (!A && BAYER[y & 3][x & 3] < (3 + d) / 3 * 0.55) px1(x, y, side < 0 ? r1 : r0, 0.8);
      continue;
    }
    let c = r2;
    if (A) { c = d < 1.2 ? r1 : r2; }
    else {
      const n = vn(x / 7, y / 5, 5) * 0.6 + vn(x / 3, y / 2.5, 6) * 0.4, b = (BAYER[y & 3][x & 3] - 0.5) * 0.16;
      c = n + b < 0.34 ? r1 : n + b > 0.66 ? r3 : r2;
      if (d < 1.4) c = side < 0 ? r3 : r1;               // a lit lip on the upper edge, a shaded one below
      else if (d < 2.6 && side > 0) c = r1;
    }
    px1(x, y, c);
  }
  if (!A) {
    // ruts: two wheel tracks, deep and lit on the upper lip
    const lanes = [-RW * 0.42, RW * 0.42], wid = C ? 2.1 : 1.3;
    for (const off of lanes) for (let x = 0; x <= GATE_X - 4; x++) {
      const yc = cy(x) + off + (vn(x / 14, off, 8) - 0.5) * 3;
      for (let y = Math.floor(yc - wid - 2); y <= Math.ceil(yc + wid + 2); y++) {
        if (roadD(x, y) < 3) continue;
        const dy = y - yc;
        if (Math.abs(dy) <= wid && vn(x / 9, off, 4) > 0.22) px1(x, y, dy > wid * 0.2 ? r0 : r1);
        else if (dy < -wid && dy >= -wid - 1 && vn(x / 9, off, 4) > 0.22) px1(x, y, r4);
      }
    }
    // the middle of the road: a spine of grass, in the bolder look
    if (C) for (let x = 6; x < GATE_X - 10; x += 9) { const y = Math.round(cy(x) + (hash(x, 3) - 0.5) * 4); if (hash(x, 9) > 0.35) { px1(x, y, g0); px1(x + 1, y, g1); px1(x, y - 1, g3); px1(x - 1, y - 2, g4); px1(x + 1, y - 2, g3); px1(x, y - 2, g4); } }
  }
  // the gate's threshold: slabs laid in the road as it meets the arch
  for (let y = 0; y < H; y++) for (let x = GATE_X - 16; x < GATE_X; x++) {
    if (roadD(x, y) < 1) continue;
    const fy = y - cy(x);
    if (Math.abs(fy) > 19) continue;
    if (A) { px1(x, y, (x + y) % 7 === 0 ? r1 : r3); continue; }
    const row = Math.floor((y + 40) / 6), col = Math.floor((x + (row & 1) * 5 + 99) / 10);
    const joint = (y + 40) % 6 === 0 || (x + (row & 1) * 5 + 99) % 10 === 0;
    const tone = hash(row, col, 4);
    px1(x, y, joint ? r0 : tone < 0.25 ? r1 : tone > 0.8 ? r4 : r3);
  }
  // pebbles
  const nPeb = A ? 5 : C ? 12 : 16;
  for (let i = 0; i < nPeb; i++) {
    const x = Math.floor(hash(i, 21) * (GATE_X - 18)) + 4, y = Math.floor(cy(x) + (hash(i, 22) - 0.5) * (RW * 1.7));
    const big = C ? 3 : 2;
    if (A) { px1(x, y, [150, 130, 104]); px1(x + 1, y, [150, 130, 104]); continue; }
    for (let a = 0; a < big; a++) { px1(x + a, y, [196, 190, 176]); px1(x + a, y + 1, [136, 126, 118]); }
    px1(x, y, [238, 232, 214]); px1(x + big, y + 1, [96, 78, 74], 0.7);
  }

  // ---------------- flowers and stones on the turf ----------------
  const FL = C ? [[255, 250, 232], [255, 214, 70], [238, 80, 70], [198, 110, 235]] : A ? [[255, 243, 210], [236, 212, 110]] : [[255, 243, 210], [240, 220, 120], [226, 120, 120], [190, 150, 220]];
  const nFl = A ? 7 : C ? 16 : 18;
  for (let i = 0; i < nFl; i++) {
    const x = Math.floor(hash(i, 31) * (W - 60)) + 3, y = Math.floor(hash(i, 32) * (H - 20)) + 5;
    if (roadD(x, y) > -6 || x > GATE_X - 4) continue;
    const col = FL[i % FL.length];
    if (A) { px1(x, y, col); continue; }
    px1(x, y + 1, g1); px1(x, y + 2, g0);
    if (C) { px1(x - 1, y + 1, g3); px1(x + 1, y + 2, g3); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px1(x + dx, y + dy, col); px1(x, y, [255, 200, 60]); px1(x - 1, y - 1, [255, 255, 250], 0.9); }
    else { px1(x, y, col); px1(x + 1, y, col.map((v) => v * 0.78)); px1(x, y - 1, [255, 252, 236]); }
  }
  const stones = [[100, 130, 3], [26, 128, 2], [138, 86, 2], [118, 132, 3], [12, 14, 2], [92, 60, 2]];
  for (const [x, y, r] of stones) {
    if (roadD(x, y) > -2) continue;
    const base = A ? [156, 150, 138] : [168, 162, 148];
    if (A) { for (let j = -1; j <= 0; j++) for (let i = -r; i <= r; i++) px1(x + i, y + j, base); continue; }
    for (let j = -r + 1; j <= 1; j++) for (let i = -r; i <= r; i++) { if (i * i / (r * r) + (j - 0.5) * (j - 0.5) / (r * 0.5 * r * 0.5) > 1.2) continue; px1(x + i, y + j, j < 0 && i <= 0 ? (C ? [226, 218, 196] : [206, 200, 184]) : i > 0 || j > 0 ? [112, 102, 100] : base); }
    for (let i = -r; i <= r + 1; i++) px1(x + i, y + 2, PLUM, 0.35);
    px1(x - 1, y + 1, hex(P.moss), 0.9);
  }

  // ---------------- objects: sculpted with Pix ----------------
  const MS = mat(P.stone, { contrast: P.contrast }), MA = mat(P.stoneAlt, { contrast: P.contrast }), MD = mat(P.deck, { contrast: P.contrast });
  const MT = mat(C ? "#c4ac90" : "#b2aa96", { contrast: P.contrast }), MMOSS = mat(P.moss), IRON = mat("#4a4c56"), OAK = mat("#6f4a2a"), DARKI = flat("#241a28"), WARM = kit.WARM, WARM2 = kit.WARM2;
  const MTRIM = mat(C ? "#c8b494" : "#b4ac98", { contrast: P.contrast });
  const key = (x, s, z) => s + z - LEAN * x;                          // closeness along the view ray
  const wall = new Pix(W, H, 0, 0);

  // a box standing on the ground: x east, s south, z up. Paints its top, its south face and its west face.
  const box = (px, b0) => {
    px.part();
    const b = { ...b0, xa: b0.xa + WX, xb: b0.xb + WX }, { xa, xb, sa, sb, z0 = 0, z1 } = b, c2 = b.cast ?? 1;
    const tex = (face, a, z, x, s) => faceTex(b, face, a, z, x, s);
    // west face (lean: x = xa + z/2 on screen)
    for (let X = Math.max(0, Math.floor(xa + LEAN * z0) - 1); X <= Math.min(W - 1, Math.ceil(xa + LEAN * z1) + 1); X++) {
      const z = (X + 0.5 - xa) / LEAN; if (z < z0 || z >= z1) continue;
      for (let Y = Math.max(0, Math.floor(sa - z1) - 1); Y <= Math.min(H - 1, Math.ceil(sb - z0) + 1); Y++) {
        const s = Y + 0.5 + z; if (s < sa || s >= sb) continue;
        const t = tex("W", s, z, xa, s); if (!t) continue;
        const [nx, ny, nz] = t.n || [-0.45, 0.1, 0.45];
        px._put(X, Y, t.m, key(xa, s, z) + (t.zo || 0), nx, ny, nz, { bias: t.bias, cast: c2, fix: t.fix, noLine: t.noLine });
      }
    }
    // south face
    for (let Y = Math.max(0, Math.floor(sb - z1) - 1); Y <= Math.min(H - 1, Math.ceil(sb - z0) + 1); Y++) {
      const z = sb - (Y + 0.5); if (z < z0 || z >= z1) continue;
      for (let X = Math.max(0, Math.floor(xa + LEAN * z) - 1); X <= Math.min(W - 1, Math.ceil(xb + LEAN * z) + 1); X++) {
        const x = X + 0.5 - LEAN * z; if (x < xa || x >= xb) continue;
        const t = tex("S", x, z, x, sb); if (!t) continue;
        const [nx, ny, nz] = t.n || [0, 0.55, 0.55];
        px._put(X, Y, t.m, key(x, sb, z) + (t.zo || 0), nx, ny, nz, { bias: t.bias, cast: c2, fix: t.fix, noLine: t.noLine });
      }
    }
    // top
    for (let Y = Math.max(0, Math.floor(sa - z1) - 1); Y <= Math.min(H - 1, Math.ceil(sb - z1) + 1); Y++) {
      const s = Y + 0.5 + z1; if (s < sa || s >= sb) continue;
      for (let X = Math.max(0, Math.floor(xa + LEAN * z1) - 1); X <= Math.min(W - 1, Math.ceil(xb + LEAN * z1) + 1); X++) {
        const x = X + 0.5 - LEAN * z1; if (x < xa || x >= xb) continue;
        const t = tex("T", x, s, x, s); if (!t) continue;
        px._put(X, Y, t.m, key(x, s, z1) + 0.3, 0, -0.85, 0.5, { bias: t.bias, cast: c2, fix: t.fix });
      }
    }
  };

  // the stonework of one face: courses and stones as TONE (a stone a tone up or down, broken
  // mortar, a bevel), never as ink; weathering and moss in the worked looks
  function faceTex(b, face, a, z, x, s) {
    const seed = b.seed ?? 1, along = face === "W" ? s : x;
    // holes in the wall: the gate's arch, arrow slits (b.holes)
    for (const h of b.holes || []) {
      if (h.face !== face) continue;
      const r = h.fn(along, z);
      if (r) return r;
    }
    if (face === "T") {
      const e = Math.min(x - b.xa, s - b.sa);
      let bias = P.joints ? 0 : 0;
      if (P.wear && b.flags && ((Math.floor(x / 3) + Math.floor(s / 3)) & 1) === 0 && hash(Math.floor(x / 3), Math.floor(s / 3), seed) > 0.8) bias -= 1;
      if (b.flags && P.joints && ((Math.floor((x + (Math.floor(s / 6) & 1) * 4) / 8)) !== Math.floor((x - 1 + (Math.floor(s / 6) & 1) * 4) / 8) || (s % 6) < 1)) bias -= 1;   // flagstones
      return { m: b.deck ?? MD, bias: bias + (b.flat ? -1 : 0), n: [0, -0.85, 0.5] };
    }
    const C0 = b.course ?? P.course, L = b.stoneL ?? P.stoneL;
    const c = Math.floor(z / C0), aa = along + (c & 1) * L * 0.5 + hash(c, seed) * L * 0.6, k = Math.floor(aa / L), fa = aa - k * L, fz = z - c * C0;
    const hv = hash(c, k, seed), hm = hash(c * 3.1 + 7, k * 1.7, seed + 5);
    let m = b.mat ?? MS, bias = 0;
    if (b.plain) return { m, bias: 0, n: face === "W" ? [-0.45, 0.1, 0.45] : [0, 0.55, 0.55] };
    if (hv > 0.78) m = b.alt ?? MA;
    bias += b.lift && face === "W" ? b.lift : 0;
    const mz = face === "W" ? 2 : 1;                       // a course joint is one pixel thick
    if (P.joints) {
      if (fz < mz && hm < 0.88) bias -= 1;                 // broken mortar: some joints skip
      if (fa < 1 && hm < 0.72) bias -= 1;
      if (P.vary) { if (hv < 0.13) bias -= 1; else if (hv > 0.86 && fz >= mz) bias += 1; }
      if (P.vary && fz >= C0 - mz && fa > 1.5 && hv > 0.4) bias += 1;           // a lit bevel on the upper edge
    } else if (hv < 0.22 && (fz < mz || fa < 1)) bias -= 1;                      // clean: a few joints only
    if (P.wear && b.ground !== false) {
      if (z < 4) bias -= 1;                                                      // it sits in the ground
      if (z < 11 && hash(k, c, seed + 4) > 0.8) { m = MMOSS; bias += hash(k, c, seed + 9) > 0.5 ? 0 : -1; }   // moss at the foot
      if (b.z1 - z < 14 && hash(k, seed + 2) > 0.9 && fa < 2.2) bias -= 1;       // a rain streak below the parapet
    }
    if (b.under && z > b.z1 - b.under) bias -= 1;                                // the overhang's shadow
    if (face === "W" && s >= b.sb - 1.5 && P.joints) bias += 1;                  // a lit line up the corner
    if (b.strings) for (const [h0, th] of b.strings) { if (z >= h0 && z < h0 + th) { m = MTRIM; bias += 0; } else if (z >= h0 - 1.2 && z < h0) bias -= 1; }
    return { m, bias, n: face === "W" ? [-0.45, 0.1, 0.45] : [0, 0.55, 0.55] };
  }

  // arch, slits, lit window helpers: each returns a face-texture function for `holes`
  const slit = (face, a0, z0, w, h, lit) => ({ face, fn: (a, z) => {
    if (a < a0 - 1 || a > a0 + w + 1 || z < z0 - 1.5 || z > z0 + h + 2) return null;
    if (a >= a0 && a < a0 + w && z >= z0 && z < z0 + h) return { m: lit && P.lit ? WARM2 : DARKI, bias: 0, fix: lit && P.lit ? 0 : 0, n: [0, 0, 1] };
    if (!P.joints) return null;
    return { m: MTRIM, bias: a < a0 || z < z0 ? -1 : 1, n: [-0.45, 0.1, 0.45] };       // a sill and a lintel
  } });
  const ARCH = { a: 158, hw: 19, spring: 13, ry: 11 };
  const inArch = (a, z, k) => {
    const dx = Math.abs(a - ARCH.a), hw = ARCH.hw + k;
    if (dx >= hw || z < -1) return false;
    if (z <= ARCH.spring) return true;
    const ry = ARCH.ry + k; return (dx / hw) ** 2 + ((z - ARCH.spring) / ry) ** 2 < 1;
  };
  const archHole = { face: "W", fn: (a, z) => {
    if (inArch(a, z, 0)) {
      if (P.joints && z > 8 && Math.abs(((a - ARCH.a) % 5 + 5) % 5) < 1.1 && z < ARCH.spring + 7 && inArch(a, z, -2)) return { m: IRON, bias: 0, n: [-0.7, 0, 0.5] };   // the raised portcullis
      return { m: DARKI, bias: 0, fix: 0, n: [0, 0, 1], zo: -0.5 };
    }
    if (inArch(a, z, 3)) { const ang = Math.atan2(z - ARCH.spring, a - ARCH.a); return { m: MTRIM, bias: (Math.floor(ang * 5) & 1) ? 0 : (P.joints ? -1 : 0) + 1, n: [-0.45, 0.1, 0.45] }; }   // the voussoirs
    return null;
  } };

  // ---- the castle: footings, curtain, inner wall, gate block, tower, merlons ----
  const WS = (o) => ({ seed: 5, ...o });
  box(wall, WS({ xa: 197, xb: 280, sa: -90, sb: 300, z1: 40, seed: 3, under: 3, strings: [[0, 0]], flags: true, mat: MS, alt: MA, deck: MD, ground: false }));       // inner wall
  box(wall, WS({ xa: 168, xb: 198, sa: -90, sb: 300, z1: 24, seed: 6, flags: true, under: 3, strings: [[10, 1.5]], holes: [slit("W", 41, 11, 3, 8, true), slit("W", 8, 11, 3, 8, false)] }));    // curtain
  box(wall, WS({ xa: 165, xb: 200, sa: -90, sb: 300, z1: 5, seed: 8, flags: false, mat: MA, alt: MS, course: 5 }));    // its footing
  box(wall, WS({ xa: 159, xb: 198, sa: 134, sb: 300, z1: 32, seed: 9, flags: true, under: 3, holes: [archHole, slit("W", 140, 20, 3, 7, false)], strings: [[24, 1.6]] }));                  // gate block
  // tower: proud of the curtain
  box(wall, WS({ xa: 146, xb: 186, sa: 81, sb: 129, z1: 3, flat: true, seed: 12, mat: MA, alt: MS, course: 5, cast: 2 }));         // its footing, wrapping the foot
  box(wall, WS({ xa: 150, xb: 182, sa: 84, sb: 126, z1: 56, seed: 13, mat: MT, alt: MA, flags: true, under: 3, cast: 2, lift: 1, strings: [[24, 1.6], [53, 1.6]],
    holes: [slit("W", 101, 30, 3, 9, false), slit("S", 164 + WX, 31, 2, 7, true), slit("W", 112, 14, 2, 6, false), slit("S", 156 + WX, 14, 2, 6, false)] }));
  const merlons = (xa, xb, sa, sb, z0, h, seedBase, west, south, o = {}) => {
    if (west) for (let s = sa; s < sb; s += 10) { if (o.skipS && s + 6 > o.skipS[0] && s < o.skipS[1]) continue; box(wall, { xa, xb: xa + 4, sa: s, sb: s + 6, z0, z1: z0 + h, seed: seedBase, plain: !P.joints, cast: 2, flags: false, mat: MS, deck: MD, ground: false }); }
    if (south) for (let x = xa; x < xb; x += 10) box(wall, { xa: x, xb: x + 6, sa: sb - 4, sb, z0, z1: z0 + h, seed: seedBase, plain: !P.joints, cast: 2, flags: false, mat: MS, deck: MD, ground: false });
  };
  merlons(150, 182, 84, 126, 56, 7, 21, true, true);                                // the tower's own parapet
  merlons(168, 198, -90, 300, 24, 6, 22, true, false, { skipS: [78, 132] });        // the curtain's
  merlons(159, 198, 134, 300, 32, 6, 23, true, false);                              // the gate block's
  merlons(197, 280, -90, 300, 40, 6, 24, true, false);                              // and the inner wall's

  // ivy and a flag-less standard of weathering, in the worked looks
  if (P.wear) {
    const ivyAt = (X, Y, h, seed, side) => kit.ivy(wall, X, Y, h, 9999, { seed, side, spread: C ? 4 : 3, col: C ? "#5aa83a" : "#4f8a3c", col2: C ? "#2f7a34" : "#3a6a34" });
    ivyAt(176 + WX, 118, C ? 34 : 28, 3, 1);            // up the tower's west face, near the corner
    ivyAt(170 + WX, 84, 10, 5, 1);                      // along the curtain's foot
    ivyAt(186 + WX, 126, 20, 8, -1);                    // by the gate block
  }

  // ---- trees and bushes ----
  const LV = P.leaves.map((c) => mat(c, { contrast: P.leafContrast })), TRK = mat(P.trunk, { contrast: P.leafContrast }), TRK_D = mat(P.trunk, { contrast: 1.1 });
  const BERRY = mat("#c8383a"), FLW = flat("#fff0d0");
  const shadowsAt = [];                                         // ground shadows, laid before the objects
  const tree = (px, x, y, o = {}) => {
    const sc = (o.sc ?? 1) * P.trees, th = (o.th ?? 17) * sc, r = (o.r ?? 14) * sc, seed = o.seed ?? 1, zb = y;
    px.part();
    px.capsule(x, y, 3.4 * sc, x + (o.lean ?? 0.8), y - th, 2.3 * sc, TRK, zb, { round: 0.9 });          // the trunk
    if (!A) { px.part(); px.ellipse(x - 3 * sc, y - 0.5, 2.6 * sc, 1.6, TRK_D, zb + 0.2, {}); px.ellipse(x + 3.5 * sc, y - 0.4, 2.8 * sc, 1.7, TRK_D, zb + 0.2, {}); }   // roots
    const ccx = x + (o.lean ?? 0.8), ccy = y - th - r * 0.45;
    // a dark underside, so the canopy is underlined, not ringed
    px.part(); px.ellipse(ccx + 1, ccy + r * 0.38, r * 0.92, r * 0.58, LV[0], zb + 1, { fix: 0 });
    const lumps = [];
    if (A) lumps.push([0, 0, r * 0.98, r * 0.82], [-r * 0.5, r * 0.18, r * 0.62, r * 0.55], [r * 0.52, r * 0.16, r * 0.64, r * 0.56], [-r * 0.15, -r * 0.46, r * 0.58, r * 0.5]);
    else {
      const n = P.lumps, base = hash(seed, 1) * 6;
      lumps.push([0, 0, r * (C ? 0.82 : 0.7), r * (C ? 0.7 : 0.6)]);
      for (let i = 0; i < n; i++) {
        const ang = base + (i / n) * Math.PI * 2, rad = 0.52 + hash(i, seed, 4) * 0.32;
        lumps.push([Math.cos(ang) * r * rad * 0.95, Math.sin(ang) * r * rad * 0.7 - r * 0.04, r * (C ? 0.52 : 0.4) * (0.8 + hash(i, seed, 5) * 0.4), r * (C ? 0.44 : 0.34) * (0.8 + hash(i, seed, 6) * 0.4)]);
      }
    }
    for (const [lx, ly, rx, ry] of lumps) {
      const t = clamp((-lx * 0.6 - ly * 0.9) / (r * 0.9) * 0.5 + 0.5 + (hash(lx * 3, ly, seed) - 0.5) * 0.25, 0, 1);
      const mi = A ? (t > 0.5 ? 1 : 0) : t > 0.62 ? 2 : t > 0.3 ? 1 : 0;
      px.part();
      px.ellipse(ccx + lx, ccy + ly, rx, ry, LV[Math.min(mi, LV.length - 1)], zb + 2 + ly * 0.08 + hash(lx, ly, seed) * 0.4, { round: A ? 0.7 : 0.92, bias: A ? 0 : t > 0.8 ? 1 : 0 });
    }
    // lit leaf-flecks on the sunward side of the worked canopies
    if (!A) for (let i = 0; i < (C ? 7 : 11); i++) {
      const ang = hash(i, seed, 9) * 6.28, rad = Math.sqrt(hash(i, seed, 10)) * 0.8;
      const fx = ccx + Math.cos(ang) * r * rad - r * 0.1, fy = ccy + Math.sin(ang) * r * rad * 0.7 - r * 0.15;
      if (fx > ccx + r * 0.2 && fy > ccy) continue;
      px.part(); px.ellipse(fx, fy, C ? 2 : 1.4, C ? 1.5 : 1, LV[2], zb + 3.5, { fix: C ? 4 : 3, round: 0.5 });
    }
    shadowsAt.push({ x: ccx + 5 * sc, y: y + 2, rx: r * (C ? 1.05 : 0.95), ry: r * 0.34, holes: !A, a: P.shadowA, trunk: [x + 3, y, 2.5 * sc, th * 0.25] });
  };
  const bush = (px, x, y, o = {}) => {
    const sc = o.sc ?? 1, seed = o.seed ?? 1, r = 7 * sc * (C ? 1.25 : 1), BL = P.bush.map((c) => mat(c, { contrast: P.leafContrast }));
    px.part(); px.ellipse(x + 1, y - r * 0.35, r * 1.0, r * 0.62, BL[0], y, { fix: 0 });
    const ls = A ? [[0, -r * 0.5, r * 0.9, r * 0.7]] : [[0, -r * 0.45, r * 0.7, r * 0.55], [-r * 0.55, -r * 0.25, r * 0.5, r * 0.42], [r * 0.5, -r * 0.2, r * 0.5, r * 0.4], [-r * 0.1, -r * 0.9, r * 0.45, r * 0.38]];
    for (const [lx, ly, rx, ry] of ls) { const t = clamp((-lx - ly) / r * 0.5 + 0.55, 0, 1); px.part(); px.ellipse(x + lx, y + ly, rx, ry, BL[A ? 0 : t > 0.6 ? 2 : t > 0.3 ? 1 : 0] ?? BL[0], y + 1 + ly * 0.05, { round: A ? 0.7 : 0.9 }); }
    if (!A) for (let i = 0; i < 4; i++) { px.part(); px.ellipse(x - r * 0.6 + hash(i, seed) * r * 1.3, y - r * 0.9 + hash(i, seed, 2) * r * 0.8, 0.9, 0.9, i % 2 ? BERRY : FLW, y + 4, { fix: i % 2 ? 2 : 4, round: 0.4 }); }
    shadowsAt.push({ x: x + 5 * sc, y: y + 1, rx: r * 1.15, ry: r * 0.3, holes: false, a: P.shadowA * 0.9 });
  };
  const rock = (px, x, y, rx, ry) => { px.part(); px.ellipse(x, y - ry * 0.7, rx, ry, MS, y, { round: 0.9, bias: 0 }); shadowsAt.push({ x: x + 2, y: y + 0.5, rx: rx + 1.5, ry: 1.6, holes: false, a: P.shadowA }); if (P.wear) { px.part(); px.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.45, ry * 0.35, MMOSS, y + 0.3, { round: 0.6 }); } };

  const front = new Pix(W, H, 0, 0);
  tree(wall, 22, 76, { sc: 1.05, seed: 2, r: 15, th: 16 });
  tree(wall, 48, 50, { sc: 0.92, seed: 5, r: 14, th: 15, lean: -0.5 });
  tree(wall, 130, 74, { sc: 0.85, seed: 9, r: 13, th: 14, lean: 0.6 });
  bush(front, 128, 126, { sc: 1.05, seed: 3 });
  bush(front, 20, 112, { sc: 0.9, seed: 7 });
  bush(wall, 112, 60, { sc: 0.7, seed: 8 });
  rock(front, 140, 135, 4, 3);
  rock(front, 106, 131, 3, 2);

  // ---- the hall's ground shadow and each shadow laid on the turf ----
  const laySh = (s) => {
    for (let y = Math.floor(s.y - s.ry - 1); y <= Math.ceil(s.y + s.ry + 1); y++) for (let x = Math.floor(s.x - s.rx - 1); x <= Math.ceil(s.x + s.rx + 1); x++) {
      const u = (x + 0.5 - s.x) / s.rx, v = (y + 0.5 - s.y) / s.ry;
      if (u * u + v * v > 1) continue;
      if (s.holes && hash(x, y, 77) > 0.86 && Math.hypot(u, v) > 0.35) continue;      // dapple: light through the leaves
      if (roadD(x, y) > 0 && !A) px1(x, y, PLUM, s.a * 0.8); else px1(x, y, PLUM, s.a);
    }
    if (s.trunk) { const [tx, ty, tw, th] = s.trunk; for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) px1(tx + i + j * 0.4, ty + 1 + j * 0.5, PLUM, s.a * 0.9); }
  };
  // (the hall is laid below; its own ground shadow is laid with it)
  shadowsAt.forEach(laySh);

  // ---- bake and lay ----
  const lay = (img, ax, ay, alpha = 1, mask) => {
    for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
      const k = (j * img.w + i) * 4, a = (img.data[k + 3] / 255) * alpha; if (!a) continue;
      const x = Math.round(ax - img.ox) + i, y = Math.round(ay - img.oy) + j;
      if (mask && !mask(x, y)) continue;
      px1(x, y, [img.data[k], img.data[k + 1], img.data[k + 2]], a);
    }
  };
  const wallImg = wall.resolve({ line: "tint" });
  lay(wallImg, wall.ox, wall.oy);

  // the torch by the gate and the lamp-lit slits: warm light on the stone, in three steps
  if (P.lit) {
    const warmOn = (lx, ly, rad, strength, col = [255, 168, 70]) => {
      for (let y = Math.floor(ly - rad); y <= Math.ceil(ly + rad); y++) for (let x = Math.floor(lx - rad); x <= Math.ceil(lx + rad); x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (!(wallImg.data[(y * W + x) * 4 + 3])) continue;
        const d = Math.hypot(x - lx, y - ly) / rad; if (d >= 1) continue;
        const stepA = d < 0.35 ? 0.5 : d < 0.62 ? 0.3 : 0.14;
        px1(x, y, col, stepA * strength);
      }
    };
    warmOn(166 + WX, 118, 22, C ? 1 : 0.8);                             // the torch at the gate
    warmOn(178 + WX, 134 - 18, 9, 0.5);
    warmOn(170 + WX, 126 - 33, 8, 0.6);               // tower slit (west)
    const flame = kit.flameFrames({})[0]; lay(flame, 166 + WX, 120);
    kit.flameFrames({});                                           // (baked once)
  }

  // ---- the Archer hall, level 2, with its crew ----
  const hall = await import("../src/render/pix/hall-archer.js");
  const hb = kit.bakeHall(hall.BOX, hall.build({ level: 2, style: P.key, seed: 0 }), {});
  const HX = 82, HY = 116, sp = hb.spec;
  const shadow = sp.shadow;
  if (shadow) { const rows = kit.groundShadow(shadow.rx, shadow.ry, shadow); for (const [y, x0, x1] of rows) for (let x = x0; x <= x1; x++) { const X = HX + x, Y = HY + y; px1(X, Y, PLUM, P.shadowA * 0.95); } }
  lay(hb.back, HX, HY);
  const livesOf = (layer) => (sp.live || []).filter((l) => (l.layer || "back") === layer);
  const drawLive = (l) => {
    if (l.kind === "pennant") lay(kit.pennantFrames(l.col, l)[0], HX + l.x, HY + l.y);
    else if (l.kind === "flame") lay(kit.flameFrames(l)[0], HX + l.x, HY + l.y);
  };
  livesOf("back").forEach(drawLive);
  for (const g of hb.glows) lay(g.back, HX, HY, 0.8 * (sp.lights.find((l) => l.key === g.key).k ?? 1));
  const { Pix: PixC } = await import("../src/render/pix/pix.js");
  const fig = await import("../src/render/pix/fig-bowman.js");
  for (const c of [...(sp.crew || [])].sort((a, b) => a.y - b.y)) {
    const clip = fig.CLIPS.idle, F = frameAt(clip, 0, fig.BONES);
    const p = new PixC(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
    const info = fig.draw(p, F, { flip: false, variant: c.variant || "" }) || {};
    const img = p.resolve({ flip: false, lights: (info.lights || (info.light ? [info.light] : [])).filter((l) => l && l.k > 0.02) });
    lay(img, HX + c.x, HY + c.y);
  }
  if (hb.front) lay(hb.front, HX, HY);
  for (const g of hb.glows) if (g.front) lay(g.front, HX, HY, 0.8 * (sp.lights.find((l) => l.key === g.key).k ?? 1));
  livesOf("front").forEach(drawLive);

  lay(front.resolve({ line: "tint" }), 0, 0);

  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let k = 0; k < W * H; k++) { rgba[k * 4] = buf[k * 3]; rgba[k * 4 + 1] = buf[k * 3 + 1]; rgba[k * 4 + 2] = buf[k * 3 + 2]; rgba[k * 4 + 3] = 255; }
  return { w: W, h: H, rgba, label: P.label, key: P.key };
}
