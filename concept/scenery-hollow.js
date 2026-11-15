// ============ HOLLOW SCENERY CONCEPT: one fen corner in three looks (2026-11-14) ============
// Standalone, like concept/scenery.js (the Greenwood round); nothing in the game reads it.
// `renderScene("a"|"b"|"c")` returns { w, h, rgba, label, key }: 240 x 176 art pixels of the
// Hollowfen: sodden turf, a still black pool with reeds, a stretch of the causeway of sunken
// flags, dead and weeping trees, a kings' barrow with its door, leaning gravestones, a cairn,
// and two will-o'-wisps with their light on the ground and the stone. No castle.
//   A  clean   today's fen palette and layout, tidied: few crisp marks, flat calm tone
//   B  worked  tufts and peat patches, wet sheen, weathered stone, real cast shadows
//   C  bolder  B on bigger shapes in richer colour (murky greens, violet, cold teal), deeper
//              shadows, stronger glows; the causeway's two lanes kept faint (owner's note)
// Objects are sculpted with Pix (material + depth + normal, one sun upper left, a one-pixel
// tinted line); ground, pool and causeway are plain pixels. Coordinates are art pixels.
import { Pix, mat, flat } from "../src/render/pix/pix.js";
import * as kit from "../src/render/pix/hall-kit.js";

export const W = 240, H = 176;
const PLUM = [30, 22, 44];
const hash = kit.hash, clamp = kit.clamp;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const smooth = (t) => t * t * (3 - 2 * t);
const vn = (x, y, seed = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));

const PROFILES = {
  a: {
    key: "A", label: "clean",
    grass: ["#323b30", "#3a4636", "#414c3c", "#4a5744", "#56634a"].map(hex),
    road: ["#6a634f", "#776f5c", "#857d68", "#948b76", "#a39a82"].map(hex),
    water: ["#1a2623", "#22302c", "#2f423c", "#4a6a58"].map(hex), mud: "#3a3a2c",
    stone: "#8e9288", moss: "#5c6c40", contrast: 1, trunk: "#aaa392", leaves: ["#2a4a46", "#34605a", "#427a6c"], reed: ["#4e5a34", "#6a7a40"],
    glow: [150, 240, 200], glowK: 0.55, glowR: 1, wear: false, tuftCell: [18, 13], tuftP: 0.35, shadowA: 0.26, bigK: 1, lumps: 0,
  },
  b: {
    key: "B", label: "worked",
    grass: ["#2c3a2c", "#374634", "#445340", "#566a48", "#6e8458"].map(hex),
    road: ["#575041", "#756d58", "#8c846e", "#a39a82", "#c0b79c"].map(hex),
    water: ["#141f1e", "#1e2d2a", "#2e443f", "#5a8068"].map(hex), mud: "#3c3a2a",
    stone: "#8e9288", moss: "#5c7440", contrast: 1, trunk: "#b0a894", leaves: ["#24423f", "#31605a", "#4a8070"], reed: ["#46542f", "#6a7e3e", "#98a85a"],
    glow: [150, 240, 200], glowK: 0.75, glowR: 1.15, wear: true, tuftCell: [8, 6], tuftP: 0.6, shadowA: 0.36, bigK: 1, lumps: 9,
  },
  c: {
    key: "C", label: "bolder",
    grass: ["#101f24", "#1a3030", "#2a4a3a", "#3e6040", "#6a8c4c"].map(hex),
    road: ["#46404c", "#716a60", "#968a72", "#b8aa86", "#d8cca6"].map(hex),
    water: ["#0a1620", "#12303a", "#1c5258", "#58b8a0"].map(hex), mud: "#2a2434",
    stone: "#9c9aa6", moss: "#4a8c44", contrast: 1.3, trunk: "#c4b8a2", leaves: ["#143a3e", "#23706a", "#46a088"], reed: ["#34502c", "#6c9a38", "#c0d86a"],
    glow: [120, 255, 210], glowK: 1.0, glowR: 1.4, wear: true, tuftCell: [11, 8], tuftP: 0.5, shadowA: 0.55, bigK: 1.3, lumps: 6,
  },
};

export async function renderScene(sk) {
  const P = PROFILES[sk], A = sk === "a", C = sk === "c";
  const [g0, g1, g2, g3, g4] = P.grass, [r0, r1, r2, r3, r4] = P.road, [w0, w1, w2, w3] = P.water;
  const buf = new Float32Array(W * H * 3);
  const px1 = (x, y, c, a = 1) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return; const k = (y * W + x) * 3; for (let i = 0; i < 3; i++) buf[k + i] += (c[i] - buf[k + i]) * a; };

  // ---- the causeway: a centre line left to right, low in the board ----
  const RW = A ? 20 : C ? 22 : 21;
  const cy = (x) => 150 + 5 * Math.sin(x / 41 + 0.6) - 5 * smooth(clamp(x / 240, 0, 1));
  const edge = (x, s) => (A ? 0 : (vn(x / 8, s * 5, 3) - 0.5) * (C ? 5 : 3.5));
  const roadD = (x, y) => { const d = y - cy(x), s = d < 0 ? -1 : 1; return RW + edge(x, s) - Math.abs(d); };
  // ---- the pool: a wobbly ellipse ----
  const POOL = { x: 112, y: 62, rx: 52, ry: 25 };
  const poolD = (x, y) => {
    const u = (x - POOL.x) / POOL.rx, v = (y - POOL.y) / POOL.ry, a = Math.atan2(v, u);
    const wob = 1 + (A ? 0.03 : 0.09) * Math.sin(a * 3 + 1) + (A ? 0 : 0.06) * Math.sin(a * 5 + 2);
    return (wob - Math.hypot(u, v)) * POOL.ry;                         // positive inside (art px)
  };

  // ---- turf ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = g2;
    if (!A) {
      const big = C ? 26 : 16, n = vn(x / big, y / (big * 0.75), 1) * 0.65 + vn(x / (big * 0.4), y / (big * 0.32), 2) * 0.35, q = n + BAYER[y & 3][x & 3] * 0.14 - 0.07;
      c = q < 0.32 ? g1 : q > 0.68 ? g3 : g2;
      if (C && q < 0.2) c = g0;
      if (C && q > 0.84) c = g3;
      // peat patches: dark wet ground in blotches, with a violet cast in C
      const pt = vn(x / 11 + 40, y / 8, 21);
      if (pt > (C ? 0.74 : 0.7)) c = (C ? [28, 30, 42] : hex(P.mud));
      else if (pt > 0.66 && BAYER[y & 3][x & 3] < 0.5) c = C ? [48, 40, 60] : hex(P.mud).map((v) => v + 8);
    }
    px1(x, y, c);
  }
  // tufts and sedge: blades, sun upper left
  const [tcx, tcy] = P.tuftCell;
  for (let j = -1; j < H / tcy + 1; j++) for (let i = -1; i < W / tcx + 1; i++) {
    if (hash(i, j, 11) > P.tuftP) continue;
    const x = Math.floor(i * tcx + hash(i, j, 12) * tcx), y = Math.floor(j * tcy + hash(i, j, 13) * tcy);
    if (roadD(x, y) > -3 || poolD(x, y) > -4) continue;
    if (A) { px1(x, y, g1); px1(x + 1, y, g1); if (hash(i, j, 14) > 0.7) px1(x, y - 1, g3); }
    else if (!C) { px1(x, y, g0); px1(x + 1, y, g1); px1(x, y - 1, g3); px1(x + 1, y - 1, g1); px1(x - 1, y - 1, g4); px1(x + 1, y - 2, g3); }
    else { px1(x, y, g0); px1(x + 1, y, g0); px1(x + 2, y, g1); px1(x, y - 1, g3); px1(x + 1, y - 1, g1); px1(x - 1, y - 2, g4); px1(x, y - 2, g3); px1(x + 1, y - 3, g4); px1(x + 2, y - 2, g2); }
  }
  // bog-cotton: white dots on the sedge
  for (let i = 0; i < (A ? 5 : C ? 20 : 14); i++) {
    const x = Math.floor(hash(i, 31) * (W - 10)) + 4, y = Math.floor(hash(i, 32) * (H - 20)) + 6;
    if (roadD(x, y) > -6 || poolD(x, y) > -6) continue;
    const col = C && i % 3 === 0 ? [214, 180, 255] : [238, 236, 222];
    px1(x, y + 1, g1); px1(x, y + 2, g0);
    if (A) px1(x, y, col); else { px1(x, y, col); px1(x - 1, y, col, 0.6); px1(x, y - 1, [255, 255, 245], 0.9); }
  }

  // ---- the pool: bank, deep water, shine, lily pads ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = poolD(x, y);
    if (d < -2.5) continue;
    if (d < 0) { if (!A && BAYER[y & 3][x & 3] < (2.5 + d) / 2.5 * 0.7) px1(x, y, hex(P.mud), 0.9); continue; }
    let c = d < 2 ? w2 : w1;
    if (!A) {
      const n = vn(x / 6, y / 2.2, 7) * 0.7 + vn(x / 3, y / 1.2, 8) * 0.3;
      if (d > 5 && n < 0.3) c = w0;
      if (d < 3) c = y < POOL.y ? w3 : w2;                               // the far bank lit, the near one dark
    }
    px1(x, y, c);
  }
  if (!A) {                                                           // wet sheen: broken horizontal glints, a sky reflection
    for (let k = 0; k < (C ? 70 : 46); k++) {
      const x = Math.floor(POOL.x - POOL.rx + hash(k, 41) * POOL.rx * 2), y = Math.floor(POOL.y - POOL.ry + hash(k, 42) * POOL.ry * 2), len = 2 + Math.floor(hash(k, 43) * (C ? 6 : 4));
      if (poolD(x, y) < 4 || poolD(x + len, y) < 4) continue;
      for (let i = 0; i < len; i++) px1(x + i, y, w3, (C ? 0.8 : 0.55) * (1 - i / (len + 1)));
    }
    if (C) for (let k = 0; k < 6; k++) { const x = 70 + k * 14 + hash(k, 5) * 6, y = 52 + hash(k, 6) * 28; if (poolD(x, y) > 5) for (let i = 0; i < 4; i++) px1(x + i, y, [150, 110, 220], 0.55); }
  }
  // lily pads: little flat ovals with a notch
  for (let k = 0; k < (A ? 3 : C ? 9 : 7); k++) {
    const x = Math.floor(POOL.x - 30 + hash(k, 51) * 70), y = Math.floor(POOL.y - 10 + hash(k, 52) * 28);
    if (poolD(x, y) < 6) continue;
    const pc = C ? hex("#5ea838") : hex("#4a6a38"), pd = C ? hex("#2a6a34") : hex("#34502c");
    for (let i = -2; i <= 2; i++) { px1(x + i, y, i < 0 ? pc : pd); if (Math.abs(i) < 2) px1(x + i, y + 1, pd); }
    if (!A) { px1(x - 1, y - 1, pc); px1(x, y - 1, pc, 0.7); if (hash(k, 53) > 0.5) px1(x + 1, y, w1); }
    if (C && k % 3 == 0) { px1(x + 1, y - 1, [250, 230, 250]); px1(x + 1, y - 2, [210, 150, 240]); }
  }

  // ---- the causeway ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = roadD(x, y);
    if (d < -2.5) continue;
    const side = y < cy(x) ? -1 : 1;
    if (d < 0) { if (!A && BAYER[y & 3][x & 3] < (2.5 + d) / 2.5 * 0.55) px1(x, y, side < 0 ? r1 : r0, 0.85); continue; }
    let c = r2;
    if (A) { c = d < 1.2 ? r1 : r2; const rw = Math.floor((x + 400) / 11); if (((x + 400) % 11 === 0 || (y + 300 - (rw & 1) * 6) % 9 === 0) && d > 2) c = r1; }
    else {
      // flags laid in staggered courses across the road, a pale lip up the top edge, a dark one below
      const row = Math.floor((x + 400) / 11), colr = Math.floor((y + 300 - (row & 1) * 6) / 9);
      const jx = (x + 400) % 11 === 0, jy = (y + 300 - (row & 1) * 6) % 9 === 0, tone = hash(row, colr, 4);
      c = tone < 0.2 ? r1 : tone > 0.82 ? r3 : r2;
      if (C && tone > 0.97) c = r4;
      if (jx || jy) c = hash(x, y, 2) < 0.28 ? r2 : r0;                  // broken joints
      if (!jx && !jy && (x + 400) % 11 === 1 && hash(row, colr, 6) > 0.5) c = r3;     // a lit left bevel
      if (d < 1.4) c = side < 0 ? r4 : r1;
      else if (d < 2.8 && side > 0) c = r1;
      // sunken and wet: black-green water standing in low flags, moss in the joints
      const wet = vn(x / 10, y / 6, 9);
      if (wet > (C ? 0.8 : 0.8) && d > 3) c = (jx || jy) ? w1 : (y & 1 ? w2 : w1);
      else if ((jx || jy) && hash(x, y, 5) > 0.82) c = hex(P.moss);
    }
    px1(x, y, c);
  }
  if (!A) {                                                           // the faintest lanes: broken dark runs, never a line
    for (const off of [-RW * 0.4, RW * 0.4]) for (let x = 0; x < W; x++) {
      if (vn(x / 6, off, 15) < (C ? 0.62 : 0.7)) continue;
      const y = Math.round(cy(x) + off + (vn(x / 14, off, 8) - 0.5) * 3);
      if (roadD(x, y) > 3) px1(x, y, r0, C ? 0.5 : 0.35);
    }
  }
  const nPeb = A ? 4 : C ? 9 : 12;
  for (let i = 0; i < nPeb; i++) {
    const x = Math.floor(hash(i, 21) * (W - 12)) + 4, y = Math.floor(cy(x) + (hash(i, 22) - 0.5) * RW * 1.6);
    if (A) { px1(x, y, r1); px1(x + 1, y, r1); continue; }
    for (let a = 0; a < (C ? 3 : 2); a++) { px1(x + a, y, [200, 196, 180]); px1(x + a, y + 1, [90, 84, 78]); }
    px1(x, y, [238, 232, 214]);
  }

  // ---- objects: sculpted with Pix ----
  const px = new Pix(W, H, 0, 0), front = new Pix(W, H, 0, 0);
  const ct = P.contrast;
  const MST = mat(P.stone, { contrast: ct }), MST2 = mat(C ? "#a8a0ae" : "#949a8c", { contrast: ct }), MMOSS = mat(P.moss, { contrast: ct });
  const MBONE = mat(P.trunk, { contrast: ct }), MBONE2 = mat(C ? "#a89a8a" : "#9a9482", { contrast: ct });
  const MEARTH = mat(C ? "#2a5238" : "#3c5038", { contrast: ct }), MEARTH2 = mat(C ? "#3c6c40" : "#4a6040", { contrast: ct });
  const MDOOR = flat(C ? "#0a0812" : "#14121a"), MWEED = mat(C ? "#2f6a48" : "#3a5a40", { contrast: ct }), MWEED2 = mat(C ? "#58a070" : "#4e7050", { contrast: ct });
  const LV = P.leaves.map((c) => mat(c, { contrast: ct })), RD = P.reed.map((c) => mat(c, { contrast: ct }));
  const MCAT = mat("#6a4a2a", { contrast: ct });
  const shadows = [];
  const sh = (x, y, rx, ry, holes = false) => shadows.push({ x, y, rx, ry, holes });

  // a pale drowned dead tree: forked limbs, weed hanging from them
  const deadTree = (x, y, o = {}) => {
    const sc = (o.sc ?? 1) * P.bigK, h = (o.h ?? 34) * sc, lean = o.lean ?? 1, seed = o.seed ?? 1;
    px.part(); px.capsule(x, y, 3.6 * sc, x + lean, y - h * 0.55, 2.2 * sc, MBONE, y, { round: 0.9 });
    px.part(); px.ellipse(x - 3 * sc, y - 0.5, 3 * sc, 1.6, MBONE2, y + 0.2, {}); px.ellipse(x + 3.4 * sc, y - 0.4, 3 * sc, 1.6, MBONE2, y + 0.2, {});
    const bx = x + lean, by = y - h * 0.55, limbs = [[-9, -16, 1.5], [10, -19, 1.7], [-3, -26, 1.3], [-14, -9, 1], [14, -8, 1]];
    for (const [dx, dy, r] of limbs) {
      const L = sc * (0.8 + hash(dx, seed) * 0.5), ex = bx + dx * L, ey = by + dy * L;
      px.part(); px.capsule(bx, by, 2 * sc, ex, ey, r * sc * 0.7, MBONE, y + 0.3, { round: 0.9 });
      if (!A && Math.abs(dx) > 8) { px.part(); px.capsule(ex, ey, r * sc * 0.7, ex + dx * 0.35 * sc, ey - 7 * sc, 0.5, MBONE, y + 0.3, { round: 0.9 }); }
      // weed hanging from the limb tips
      const n = A ? 1 : 2;
      for (let i = 0; i < n; i++) { const wx = bx + (ex - bx) * (0.5 + i * 0.25), wy = by + (ey - by) * (0.5 + i * 0.25), l = (7 + hash(i, dx, seed) * 7) * sc; px.part(); px.capsule(wx, wy + 1, 1.1, wx + 0.7, wy + l, 0.4, i & 1 ? MWEED2 : MWEED, y + 1, { round: 0.8 }); }
    }
    if (P.wear) for (let k = 0; k < 2; k++) { px.part(); px.ellipse(x + 2.5 * sc, y - h * (0.18 + k * 0.14), 2.2 * sc, 1.3 * sc, MMOSS, y + 0.4, { round: 0.8 }); }   // bracket fungus / moss
    sh(x + 7 * sc, y + 1.5, 14 * sc, 3 * sc, true);
  };
  // a weeping willow: a tall trunk, a dome, long curtains of leaf down to the water
  const willow = (x, y, o = {}) => {
    const sc = (o.sc ?? 1) * P.bigK, r = 21 * sc, th = 19 * sc, seed = o.seed ?? 3, cx = x + 1, cyy = y - th - r * 0.3;
    px.part(); px.capsule(x, y, 5 * sc, x + 1, y - th, 3.2 * sc, MBONE2, y, { round: 0.9 });
    px.part(); px.ellipse(cx, cyy + r * 0.35, r * 0.95, r * 0.6, LV[0], y + 1, { fix: 0 });
    const n = A ? 4 : 5 + P.lumps;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * 6.28 + hash(i, seed) * 0.5, rad = i ? 0.5 + hash(i, seed, 2) * 0.35 : 0, lx = Math.cos(ang) * r * rad, ly = Math.sin(ang) * r * rad * 0.6;
      const t = clamp((-lx * 0.6 - ly * 0.9) / r * 0.55 + 0.5, 0, 1);
      px.part(); px.ellipse(cx + lx, cyy + ly, r * (0.5 + (i ? 0 : 0.2)) * (C ? 1 : 0.88), r * 0.4, LV[A ? (t > 0.5 ? 1 : 0) : t > 0.62 ? 2 : t > 0.3 ? 1 : 0], y + 2 + ly * 0.05, { round: 0.9 });
    }
    // the hanging curtains
    const strands = A ? 9 : C ? 22 : 17;
    for (let i = 0; i < strands; i++) {
      const sx = cx - r * 0.95 + (i / (strands - 1)) * r * 1.9, edgeY = cyy + r * 0.28 * Math.sqrt(Math.max(0, 1 - ((sx - cx) / (r * 0.98)) ** 2)) + 3, l = (r * 1.0 + hash(i, seed, 3) * r * 0.5);
      const t = clamp((cx - sx) / r * 0.5 + 0.55, 0, 1);
      px.part(); px.capsule(sx, edgeY, 1.6, sx + 0.5 + (hash(i, seed, 4) - 0.5) * 1.4, edgeY + l * 0.7, 0.5, LV[t > 0.6 ? 2 : t > 0.3 ? 1 : 0], y + 2.5, { round: 0.9 });
    }
    sh(cx + 8 * sc, y + 2, r * 1.0, 4 * sc, true);
  };
  // a barrow: a turfed mound ringed with stones, a lintelled door, a standing stone beside it
  const barrow = (x, y, rx, ry, o = {}) => {
    const dark = ry * 0.1;
    px.part(); px.ellipse(x, y - ry * 0.78, rx, ry, MEARTH, y, { round: 0.95 });
    if (!A) { px.part(); px.ellipse(x - rx * 0.28, y - ry * 1.15, rx * 0.5, ry * 0.42, MEARTH2, y + 0.3, { round: 0.9 }); }
    if (C) for (let i = 0; i < 4; i++) { px.part(); px.ellipse(x - rx * 0.5 + i * rx * 0.3, y - ry * (1.35 - (i & 1) * 0.18), 2.6, 1.8, MEARTH2, y + 0.4, { round: 0.8, fix: 3 }); }
    // the kerb: a ring of stones along the foot
    for (let i = 0; i < (A ? 7 : 10); i++) {
      const a = Math.PI * (0.05 + 0.9 * i / (A ? 6 : 9)), kx = x + Math.cos(a) * rx * 0.97 * -1, ky = y - 1.2 + Math.sin(a) * 2.2, sr = (A ? 2.6 : 3.1) * (0.8 + hash(i, o.seed ?? 1) * 0.5);
      px.part(); px.ellipse(kx, ky, sr, sr * 0.62, i % 3 ? MST : MST2, y + 0.6 + Math.sin(a) * 0.5, { round: 0.9 });
    }
    // the door: two jambs, a lintel, black inside
    const dx = x + (o.dx ?? 0), dw = 7 * P.bigK ** 0.5, dh = 9 * P.bigK ** 0.5, dy = y + 0.5;
    px.part(); px.rect(dx - dw / 2, dy - dh, dw, dh, MDOOR, y + 1, { n: [0, 0, 1], fix: 0 });
    px.part(); px.rect(dx - dw / 2 - 2.5, dy - dh, 2.5, dh + 1, MST, y + 1.4, { round: 0.5 });
    px.part(); px.rect(dx + dw / 2, dy - dh, 2.5, dh + 1, MST2, y + 1.4, { round: 0.5 });
    px.part(); px.rect(dx - dw / 2 - 4, dy - dh - 3.2, dw + 8, 3.2, MST, y + 1.8, { round: 0.3 });
    if (P.wear) { px.part(); px.ellipse(dx - dw / 2 - 1, dy - 1, 2.2, 1.2, MMOSS, y + 2, { round: 0.8 }); px.ellipse(dx + dw / 2 + 2, dy - dh - 3, 2.4, 1.2, MMOSS, y + 2, { round: 0.8 }); }
    sh(x + rx * 0.35, y + 1.5, rx * 1.1, ry * 0.32);
  };
  const standing = (x, y, h, w, lean = 0) => {
    px.part(); px.poly([[x - w, y], [x - w * 0.8 + lean, y - h], [x + w * 0.2 + lean, y - h - 1.5], [x + w * 0.9 + lean, y - h + 1], [x + w, y]], MST, y, { round: 0.5 });
    if (P.wear) { px.part(); px.ellipse(x - w * 0.3, y - 0.8, w * 0.7, 1.3, MMOSS, y + 0.3, { round: 0.8 }); }
    if (!A) { px.part(); px.rect(x - w * 0.3 + lean * 0.5, y - h * 0.6, 1.3, 1.1, MDOOR, y + 0.5, { n: [0, 0, 1], fix: 1 }); }
    sh(x + w + 3, y + 1, w + 4, 1.8);
  };
  const grave = (x, y, k, seed) => {
    const h = (k === 0 ? 9 : 7) * (P.bigK ** 0.6), w = 3.4 * (P.bigK ** 0.6), lean = (hash(seed, 3) - 0.5) * 3;
    px.part(); px.poly([[x - w, y], [x - w + lean * 0.5, y - h + 2], [x + lean, y - h - 0.5], [x + w + lean, y - h + 2], [x + w, y]], k & 1 ? MST2 : MST, y, { round: 0.4 });
    if (k === 1) { px.part(); px.rect(x - 4.5 + lean * 0.6, y - h * 0.62, 9, 2.2, MST, y + 0.2, { round: 0.3 }); }     // a cross arm
    if (P.wear) { px.part(); px.ellipse(x - w * 0.4, y - 0.7, w * 0.9, 1.3, MMOSS, y + 0.3, { round: 0.8 }); }
    if (!A && k === 0) { px.part(); px.rect(x - 1 + lean * 0.4, y - h * 0.6, 2, 1.1, MDOOR, y + 0.5, { n: [0, 0, 1], fix: 1 }); }
    sh(x + w + 3, y + 1, w + 4.5, 1.8);
  };
  const cairn = (x, y) => {
    const sc = P.bigK ** 0.8;
    for (const [dx, dy, r] of [[-4, 0, 4], [4, 0.5, 3.6], [0, -2.4, 3.8], [-2, -5, 3], [1, -7, 2.4]]) { px.part(); px.ellipse(x + dx * sc, y + dy * sc - r * 0.5, r * sc, r * sc * 0.65, (dx + dy) & 1 ? MST : MST2, y + dy * 0.2 + 0.5 - dy * 0.4, { round: 0.9 }); }
    if (P.wear) { px.part(); px.ellipse(x - 5 * sc, y - 1.4, 2.4 * sc, 1.2, MMOSS, y + 1.2, { round: 0.8 }); }
    sh(x + 7, y + 1.5, 9 * sc, 2.4);
  };
  const reeds = (px2, x, y, n, h, seed) => {
    for (let i = 0; i < n; i++) {
      const rx = x + (hash(i, seed) - 0.5) * (4 + n * 1.5), rh = h * (0.6 + hash(i, seed, 2) * 0.6), lean = (hash(i, seed, 3) - 0.5) * 5, m = RD[i % RD.length], ry = y + (hash(i, seed, 4) - 0.5) * 3;
      px2.part(); px2.capsule(rx, ry, 1.15, rx + lean, ry - rh, 0.6, m, ry + 1, { round: 0.9 });
      if (i % 3 === 0 && !A) { px2.part(); px2.capsule(rx + lean, ry - rh - 1, 1.3, rx + lean * 1.05, ry - rh - 5, 1.1, MCAT, ry + 2, { round: 0.9 }); }       // a bulrush head
    }
    sh(x + 5, y + 1.5, n * 1.6 + 5, 1.8);
  };
  const stake = (x, y) => {       // a corpse-candle lantern on a crooked stake
    px.part(); px.capsule(x, y, 1.4, x + 1.2, y - 15, 1.1, MBONE2, y, { round: 0.9 });
    px.part(); px.rect(x - 1.5, y - 20, 5, 5, MST, y + 1, { round: 0.3 });
    px.part(); px.rect(x - 0.5, y - 19, 3, 3, flat(C ? "#b6ffe6" : "#9ae8c8", { emis: true }), y + 2, { n: [0, 0, 1], fix: 4 });
  };

  deadTree(28, 82, { sc: 1.05, seed: 2, h: 36, lean: 0.8 });
  deadTree(206, 74, { sc: 0.92, seed: 5, h: 32, lean: -0.6 });
  willow(172, 100, { sc: 0.9, seed: 4 });
  barrow(60, 130, 31, 17, { seed: 3, dx: 2 });
  standing(96, 126, 14, 3.2, 1);
  standing(214, 128, 10, 2.8, -1);
  grave(20, 116, 0, 1); grave(33, 122, 1, 2); grave(12, 130, 0, 3);
  cairn(158, 128);
  stake(86, 118);
  reeds(front, 56, 62, A ? 5 : 8, 15 * (P.bigK ** 0.6), 6);
  reeds(px, 168, 66, A ? 4 : 7, 14 * (P.bigK ** 0.6), 7);
  reeds(px, 132, 87, A ? 3 : 5, 10 * (P.bigK ** 0.6), 8);
  reeds(px, 82, 48, A ? 3 : 5, 11 * (P.bigK ** 0.6), 9);
  if (!A) { reeds(front, 20, 164, 4, 9, 10); reeds(front, 222, 160, 4, 9, 11); }

  // ---- shadows on the ground, laid before the objects ----
  for (const s of shadows) {
    for (let y = Math.floor(s.y - s.ry - 1); y <= Math.ceil(s.y + s.ry + 1); y++) for (let x = Math.floor(s.x - s.rx - 1); x <= Math.ceil(s.x + s.rx + 1); x++) {
      const u = (x + 0.5 - s.x) / s.rx, v = (y + 0.5 - s.y) / s.ry;
      if (u * u + v * v > 1) continue;
      if (s.holes && !A && hash(x, y, 77) > 0.86 && Math.hypot(u, v) > 0.35) continue;
      px1(x, y, PLUM, s.a ?? P.shadowA);
    }
  }
  const lay = (img, ax, ay, alpha = 1) => {
    for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
      const k = (j * img.w + i) * 4, a = (img.data[k + 3] / 255) * alpha; if (!a) continue;
      px1(Math.round(ax - img.ox) + i, Math.round(ay - img.oy) + j, [img.data[k], img.data[k + 1], img.data[k + 2]], a);
    }
  };
  lay(px.resolve({ line: "tint" }), 0, 0);

  // ---- light: will-o'-wisps and the lantern throw cold light on the ground and the stone, in three steps ----
  const gc = P.glow;
  const lightAt = (lx, ly, rad, strength, col = gc) => {
    rad *= P.glowR;
    for (let y = Math.floor(ly - rad); y <= Math.ceil(ly + rad); y++) for (let x = Math.floor(lx - rad); x <= Math.ceil(lx + rad); x++) {
      const d = Math.hypot(x - lx, (y - ly) * 1.35) / rad; if (d >= 1) continue;
      if (A && d > 0.6) continue;
      px1(x, y, col, (d < 0.3 ? 0.55 : d < 0.55 ? 0.3 : 0.13) * strength * P.glowK);
    }
  };
  const wisp = (x, y, k = 1) => {
    lightAt(x, y + 4, 22 * k, 1);
    if (!A) lightAt(x, y + 22 * k * 0.15 + 26, 9 * k, 0.5, C ? [190, 150, 255] : gc);           // its reflection tinting the pool/ground below
    const core = C ? [236, 255, 246] : [220, 255, 240];
    px1(x, y, core); px1(x - 1, y, gc, 0.9); px1(x + 1, y, gc, 0.9); px1(x, y - 1, gc, 0.9); px1(x, y + 1, gc, 0.8);
    if (!A) { px1(x, y - 2, gc, 0.6); px1(x - 1, y - 1, gc, 0.5); px1(x + 1, y + 1, gc, 0.45); }
    if (C) { px1(x, y - 3, gc, 0.6); px1(x - 2, y, gc, 0.5); px1(x + 2, y, gc, 0.5); px1(x + 1, y + 2, [180, 140, 255], 0.5); }
  };
  wisp(110, 64, 1.1);                                                // over the pool
  wisp(184, 138, 0.8);                                               // low by the causeway's edge
  lightAt(86 + 1, 100, 14, 0.9, [170, 255, 220]);                    // the lantern
  px1(88, 100, [220, 255, 240]);
  if (C) { lightAt(110, 66, 40, 0.35, [120, 120, 230]); }            // a cold violet wash over the whole pool

  lay(front.resolve({ line: "tint" }), 0, 0);

  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let k = 0; k < W * H; k++) { rgba[k * 4] = buf[k * 3]; rgba[k * 4 + 1] = buf[k * 3 + 1]; rgba[k * 4 + 2] = buf[k * 3 + 2]; rgba[k * 4 + 3] = 255; }
  return { w: W, h: H, rgba, label: P.label, key: P.key };
}
