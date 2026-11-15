// ============ SCENERY CONCEPT, IRON MARCHES: one board corner in three looks (2026-11-14) ============
// The Greenwood concept's twin (concept/scenery.js) for the Iron Marches: a cool moor of cropped sage
// turf, heather and bracken in drifts, bedrock slabs, a stretch of the Kingdom's paved military road
// (dressed flags laid in courses, kerbs, grass in the joints), spruce and Scots pine, crags, a drystone
// wall, a milestone and an oxblood standard. No castle wall. Nothing in the game reads this file.
// `renderScene("a"|"b"|"c")` -> { w, h, rgba, label, key }, 240 x 176 art pixels.
//   A  clean   today's Iron look, tidied: few crisp marks, flat calm tone
//   B  worked  stone by stone, tufts and tone patches, wear, lit needle pads, real cast shadows
//   C  bolder  B on bigger shapes, richer (still cold, grey-green) colour, deeper shadow, brighter light;
//              the road's wheel-tracks faint and broken, no grass spine (owner: "don't make the lanes
//              in the road so obvious")
// Objects are sculpted with Pix (material + depth + normal per pixel, sun upper left, one-pixel tinted
// line); the ground is plain pixels. Coordinates are art pixels.
import { Pix, mat, flat } from "../src/render/pix/pix.js";
import * as kit from "../src/render/pix/hall-kit.js";

export const W = 240, H = 176;
const SHADE = [34, 30, 50];                         // the Iron shadow: a cold plum-slate (scenery-iron's SHADE, bluer)
const hash = kit.hash, clamp = kit.clamp;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const smooth = (t) => t * t * (3 - 2 * t);
const vn = (x, y, seed = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// ---- the three looks -------------------------------------------------------------------
const PROFILES = {
  a: {
    key: "A", label: "clean",
    grass: ["#57654a", "#657552", "#6f7f59", "#7b8b62", "#8b976a"].map(hex),     // the realm's own GRASS ramp
    flag: ["#847a66", "#968c76", "#a69c86", "#b0a690", "#bab09a"].map(hex), kerb: ["#8c8878", "#a6a290", "#b8b4a2"].map(hex),
    heath: ["#503c4e", "#6c5066", "#8a6a82", "#aa8ca2"], bloom: ["#b8709e", "#e0a2c8"], brack: ["#6a6a3c", "#868444", "#a2a05a"].map(hex),
    stone: "#8e8c86", moss: "#6c7a52", contrast: 1,
    needle: ["#385f4e", "#44705a", "#5a8668"], bark: "#7a5a40", pine: ["#3a624e", "#4c7658", "#628c68"], pbark: "#a45f3c", leafContrast: 1,
    joints: false, vary: false, wear: false, lit: false, shadowA: 0.26, tuftCell: [20, 14], tuftP: 0.3, heathN: 5, tiers: 4, wearP: 0,
  },
  b: {
    key: "B", label: "worked",
    grass: ["#4c5a40", "#5d6d4a", "#6f7f59", "#84946a", "#9bab78"].map(hex),
    flag: ["#7c7462", "#938974", "#a69c86", "#b6ac94", "#c6bca2"].map(hex), kerb: ["#7e7a6c", "#a09c8c", "#c2beac"].map(hex),
    heath: ["#3a2834", "#4e3a4c", "#62485a", "#7c6076", "#9a8092"], bloom: ["#b0709a", "#d8a2c4"], brack: ["#4e5230", "#6e703c", "#8c8a48"].map(hex),
    stone: "#8e8c86", moss: "#5e7a4a", contrast: 1,
    needle: ["#2d4e44", "#3e6a52", "#5c8a68"], bark: "#6a4a30", pine: ["#2f5046", "#468062", "#6aa07a"], pbark: "#a45f3c", leafContrast: 1,
    joints: true, vary: true, wear: true, lit: true, shadowA: 0.34, tuftCell: [9, 7], tuftP: 0.6, heathN: 9, tiers: 5, wearP: 1,
  },
  c: {
    key: "C", label: "bolder",
    grass: ["#284840", "#3a6248", "#58814f", "#74a15a", "#98c078"].map(hex),     // sage pushed to a cold, rich green
    flag: ["#675f50", "#8a806c", "#a89e86", "#c0b698", "#d8cdae"].map(hex), kerb: ["#6e6a62", "#a29e90", "#d0ccba"].map(hex),
    heath: ["#2a1c30", "#47304a", "#684866", "#876484", "#a888a2"], bloom: ["#b8649c", "#e8a8d0"], brack: ["#4a4a22", "#7a7a30", "#b0a848"].map(hex),
    stone: "#9a9894", moss: "#4e9050", contrast: 1.3,
    needle: ["#1c4040", "#2e6a52", "#58a070"], bark: "#5e3a26", pine: ["#1c443c", "#388062", "#6cb888"], pbark: "#b86238", leafContrast: 1.3,
    joints: true, vary: true, wear: true, lit: true, shadowA: 0.5, tuftCell: [12, 9], tuftP: 0.5, heathN: 7, tiers: 5, wearP: 1.4,
  },
};

// ---- the painter ------------------------------------------------------------------------
export async function renderScene(sk) {
  const P = PROFILES[sk], A = sk === "a", C = sk === "c";
  const [g0, g1, g2, g3, g4] = P.grass, [f0, f1, f2, f3, f4] = P.flag, [k0, k1, k2] = P.kerb;
  const buf = new Float32Array(W * H * 3);
  const px1 = (x, y, c, a = 1) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return; const k = (y * W + x) * 3; for (let i = 0; i < 3; i++) buf[k + i] += (c[i] - buf[k + i]) * a; };

  // ---------------- the road: a centre line, left edge to right edge, bending a little ----------------
  const RW = C ? 24 : 23, KB = 4.5, CY = (x) => 130 + 7 * Math.sin(x / 46 + 0.6) + 5 * smooth(clamp(x / W, 0, 1));
  const roadD = (x, y) => RW - Math.abs(y - CY(x));                     // > 0 inside the road

  // the courses: flags laid across the road, each a little askew, broken at random across it
  const cStart = [], cBreaks = [];
  for (let u = -8, i = 0; u < W + 12; i++) {
    cStart.push(u); const br = [];
    for (let v = -RW + KB + 3 + hash(i, 1) * 7; v < RW - KB - 3; v += 5 + hash(i, 2 + br.length) * 9) br.push(v);
    cBreaks.push(br); u += 5 + hash(i, 40) * 6.5;
  }
  const courseAt = (u) => { let c = 0; while (c + 1 < cStart.length && cStart[c + 1] <= u) c++; return c; };
  const kStart = []; for (let u = -10, i = 0; u < W + 16; i++) { kStart.push(u); u += 9 + hash(i, 61) * 7; }
  const kerbAt = (u) => { let c = 0; while (c + 1 < kStart.length && kStart[c + 1] <= u) c++; return c; };

  // ---------------- turf ----------------
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = g2;
    if (!A) {
      const big = C ? 26 : 16, n = vn(x / big, y / (big * 0.75), 1) * 0.65 + vn(x / (big * 0.4), y / (big * 0.32), 2) * 0.35, b = BAYER[y & 3][x & 3] * 0.14, q = n + (b - 0.07);
      c = q < 0.32 ? g1 : q > 0.68 ? g3 : g2;
      if (C && q < 0.2) c = g0;
      if (C && q > 0.84) c = g3;
    }
    px1(x, y, c);
  }
  // drifts of the moor: where heather and bracken gather (kept to a few, low-contrast, per the guide)
  const heathDrift = (x, y) => vn(x / 30, y / 22, 31) > 0.6, brackDrift = (x, y) => vn(x / 26, y / 20, 41) > 0.64;
  // moor-grass tussocks: straw-tipped tufts, the lit side up-left
  const [tcx, tcy] = P.tuftCell, straw = [196, 180, 120];
  for (let j = -1; j < H / tcy + 1; j++) for (let i = -1; i < W / tcx + 1; i++) {
    if (hash(i, j, 11) > P.tuftP) continue;
    const x = Math.floor(i * tcx + hash(i, j, 12) * tcx), y = Math.floor(j * tcy + hash(i, j, 13) * tcy);
    if (roadD(x, y) > -5) continue;
    if (A) { px1(x, y, g1); px1(x + 1, y, g1); if (hash(i, j, 14) > 0.7) px1(x, y - 1, g3); }
    else if (!C) { px1(x, y, g0); px1(x + 1, y, g1); px1(x, y - 1, g3); px1(x - 1, y - 1, g1); px1(x + 1, y - 2, g3); if (hash(i, j, 15) > 0.55) px1(x, y - 2, mixc(g4, straw, 0.4)); }
    else { px1(x, y, g0); px1(x + 1, y, g0); px1(x + 2, y, g1); px1(x, y - 1, g3); px1(x + 1, y - 1, g1); px1(x - 1, y - 2, g4); px1(x, y - 2, g3); px1(x + 1, y - 3, mixc(g4, straw, 0.5)); px1(x + 2, y - 2, g2); px1(x - 1, y - 3, mixc(g4, straw, 0.35)); }
  }
  // bracken: rust-olive fronds fanning out, in its own drifts (B, C); A has a few flat blades
  if (!A) {
    const [b0, b1, b2] = P.brack;
    for (let j = 0; j < H / 7; j++) for (let i = 0; i < W / 8; i++) {
      const x = Math.floor(i * 8 + hash(i, j, 51) * 8), y = Math.floor(j * 7 + hash(i, j, 52) * 7);
      if (!brackDrift(x, y) || roadD(x, y) > -6 || hash(i, j, 53) > (C ? 0.6 : 0.7)) continue;
      const L = C ? 5 : 4;
      for (const dir of [-1, 0, 1]) for (let t = 1; t <= L; t++) { const xx = x + dir * Math.round(t * 0.7), yy = y - t + Math.abs(dir) * Math.round(t * 0.3); px1(xx, yy, t > L - 2 ? b2 : t > 1 ? b1 : b0); if (C && t % 2 === 0) px1(xx + 1, yy, b0, 0.8); }
    }
  } else for (let i = 0; i < 6; i++) { const x = 20 + Math.floor(hash(i, 51) * 200), y = 10 + Math.floor(hash(i, 52) * 90); if (roadD(x, y) > -6) continue; px1(x, y, P.brack[0]); px1(x, y - 1, P.brack[1]); }
  // bedrock slabs, flat in the turf: cool grit, lit on the upper left, in a few clusters
  const stoneMain = hex(P.stone);
  for (let i = 0; i < (A ? 5 : 9); i++) {
    const x = Math.floor(hash(i, 71) * (W - 20)) + 8, y = Math.floor(hash(i, 72) * 100) + 6, rx = (C ? 6 : 4) + Math.floor(hash(i, 73) * 3), ry = Math.max(2, Math.floor(rx * 0.42));
    if (roadD(x, y) > -8) continue;
    for (let j = -ry; j <= ry; j++) for (let ii = -rx; ii <= rx; ii++) {
      const u = ii / rx, v = j / ry; if (u * u + v * v > 1) continue;
      let col = mixc(stoneMain, g2, 0.18);
      if (!A) { const edgeUp = (u * u + v * v > 0.5) && (u * 0.5 + v * 0.8) < -0.1, edgeDn = (u * u + v * v > 0.5) && (u * 0.5 + v * 0.8) > 0.3; col = edgeUp ? mixc(stoneMain, [236, 232, 224], 0.35) : edgeDn ? mixc(stoneMain, SHADE, 0.45) : hash(ii, j, i) > 0.85 ? mixc(stoneMain, SHADE, 0.12) : col; }
      px1(x + ii, y + j, col);
    }
    if (!A) { px1(x - 1, y, hex(P.moss), 0.8); px1(x + 1, y + 1, hex(P.moss), 0.6); for (let ii = -rx; ii <= rx; ii++) px1(x + ii + 1, y + ry + 1, SHADE, 0.22); }
  }

  // ---------------- the road: kerbs, flags, wear ----------------
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = roadD(x, y);
    if (d < -2) continue;
    const dy = y - CY(x), side = dy < 0 ? -1 : 1;
    if (d < 0) {                                                       // the verge: trodden, dull, a little grit
      if (!A && BAYER[y & 3][x & 3] < (2 + d) / 2 * 0.5) px1(x, y, side < 0 ? mixc(g1, f1, 0.35) : mixc(g0, f0, 0.3), 0.85);
      continue;
    }
    const u = x + 0.5, v = dy;
    // KERB: longer stones, lighter, on both sides
    if (d < KB) {
      const kc = kerbAt(u), ku = u - kStart[kc], kid = kc * 2 + (side > 0 ? 1 : 0);
      let col = hash(kid, 7) < 0.22 ? k0 : hash(kid, 7) > 0.78 ? k2 : k1;
      if (A) col = k1;
      else {
        if (ku < 1) col = k0;                                            // joint
        else if (d < 1.2 && side < 0) col = k2;                          // the lit outer lip faces up-left
        else if (d < 1.2 && side > 0) col = k0;
        else if (d > KB - 1.3 && side < 0) col = k0;                      // inner shade under the lip
        else if (ku < 2 && side < 0) col = k2;
        if (P.wear && hash(kid, 19) > 0.93) col = side < 0 ? hex(P.moss) : mixc(g1, k0, 0.3);   // a kerb stone gone to turf / moss
      }
      px1(x, y, col); continue;
    }
    // FLAGS
    const c = courseAt(u), br = cBreaks[c];
    let j = 0; while (j < br.length && br[j] <= v) j++;
    const lo = j > 0 ? br[j - 1] : -RW + KB, hi = j < br.length ? br[j] : RW - KB, fid = c * 17 + j;
    const fu = u - cStart[c], fv = v - lo, hv = hash(fid, 3);
    let col = hv < 0.2 ? f1 : hv > 0.8 ? f3 : f2;
    if (A) { col = fu < 1 || fv < 1 ? f1 : f2; px1(x, y, col); continue; }
    if (P.wear) {
      if (hash(fid, 5) < 0.07 * P.wearP) col = f1;                      // a flag sunk a little
      if (hash(fid, 6) < 0.035 * P.wearP) col = mixc(f1, g1, 0.45);     // a flag gone to earth and turf
    }
    if (fu < 1 || fv < 1) col = f0;                                      // the joint
    else if (fu < 2 || fv < 2) col = hv < 0.2 ? f2 : f3;                 // lit bevel on the upper-left edge
    else if (hi - fv - lo < 1.6 || u - cStart[Math.min(c + 1, cStart.length - 1)] > -1.6) col = hv > 0.8 ? f2 : f1;   // shaded lower-right edge
    // cracks: a few flags split on a slant
    if (P.wear && hash(fid, 9) < 0.09 * P.wearP && Math.abs(((fu - 2) * 0.5 + (fv - 1)) % 7) < 0.6 && fu > 2) col = f0;
    // wheel-tracks: faint, broken, and never a clean pair of lines (owner's note)
    if (P.wear) {
      const lane = Math.abs(Math.abs(v) - RW * 0.4);
      if (lane < 2.2 && vn(x / 22, side * 4, 8) > (C ? 0.56 : 0.6) && BAYER[y & 3][x & 3] < 0.5) col = mixc(col, f0, C ? 0.3 : 0.24);
    }
    px1(x, y, col);
  }
  // grass in the joints near the kerbs, and moss at the weak flags (B, C)
  if (P.wear) for (let i = 0; i < (C ? 26 : 22); i++) {
    const x = Math.floor(hash(i, 81) * (W - 4)) + 2, side = hash(i, 82) > 0.5 ? 1 : -1, y = Math.round(CY(x) + side * (RW - KB - 1 - hash(i, 83) * 3));
    px1(x, y, g1); px1(x, y - 1, g3); if (C) { px1(x + 1, y - 1, g3); px1(x - 1, y - 2, g4); px1(x, y - 2, g4); }
  }
  // pebbles: grit, a few scattered on the flags
  for (let i = 0; i < (A ? 4 : C ? 10 : 12); i++) {
    const x = Math.floor(hash(i, 21) * (W - 10)) + 4, y = Math.floor(CY(x) + (hash(i, 22) - 0.5) * (RW * 1.4));
    if (A) { px1(x, y, f1); px1(x + 1, y, f1); continue; }
    const big = C ? 2 : 1;
    for (let a = 0; a <= big; a++) { px1(x + a, y, [204, 198, 180]); px1(x + a, y + 1, [124, 116, 108]); }
    px1(x, y, [240, 234, 216]);
  }

  // ---------------- objects: sculpted with Pix ----------------
  const obj = new Pix(W, H, 0, 0), shadowsAt = [];
  const lc = P.leafContrast;
  const NEED = P.needle.map((c) => mat(c, { contrast: lc })), PIN = P.pine.map((c) => mat(c, { contrast: lc }));
  const BARK = mat(P.bark, { contrast: lc }), PBARK = mat(P.pbark, { contrast: lc }), BARK_D = mat(P.bark, { contrast: 1.1 });
  const GRIT = mat(P.stone, { contrast: P.contrast }), GRIT2 = mat(mixc(hex(P.stone), [150, 142, 150], 0.35).map(Math.round).reduce((s, v) => s + v.toString(16).padStart(2, "0"), "#"), { contrast: P.contrast });
  const MOSS = mat(P.moss), OX = mat("#7a2a2c", { contrast: P.contrast }), OX_D = mat("#521a1e"), BRASS = mat("#b8903e");
  const HEATM = P.heath.map((c) => mat(c, { contrast: P.contrast })), BLOOM = P.bloom.map((c) => flat(c));

  // --- spruce: a trunk, tiers of needles stacked up to a leader; every tier a lit left, a dark right, a scalloped hem
  const spruce = (x, y, o = {}) => {
    const sc = (o.sc ?? 1) * (C ? 1.25 : 1), seed = o.seed ?? 1, nt = P.tiers, hgt = (o.h ?? 46) * sc, wBase = (o.w ?? 13) * sc;
    obj.part(); obj.capsule(x, y, 2.6 * sc, x + 0.4, y - 10 * sc, 1.8 * sc, BARK, y, { round: 0.9 });
    if (!A) { obj.part(); obj.ellipse(x - 2.6 * sc, y - 0.4, 2 * sc, 1.2, BARK_D, y + 0.2, {}); obj.part(); obj.ellipse(x + 2.8 * sc, y - 0.3, 2.2 * sc, 1.3, BARK_D, y + 0.2, {}); }
    for (let t = 0; t < nt; t++) {                                      // low tier first so the upper ones sit over it
      const f = t / (nt - 1), yb = y - 5 * sc - f * (hgt * 0.74), tw = wBase * (1 - f * 0.78), th = (hgt * 0.34) * (1 - f * 0.25);
      const mi = f > 0.66 ? 2 : f > 0.3 ? 1 : 0;
      const pts = [[x - tw * 0.1, yb - th], [x + tw * 0.12, yb - th], [x + tw, yb - 1], [x + tw * 0.5, yb + 1.5], [x, yb + 0.6], [x - tw * 0.5, yb + 1.5], [x - tw, yb - 1]];
      obj.part(); obj.poly(pts, NEED[Math.min(1, mi)], y - 2 + t * 0.6, { round: A ? 0.55 : 0.8, ny: 0.15 });
      if (!A) {                                                         // the hem scalloped, sprigs along the sunward edge
        for (let s = 0; s < 4 + (C ? 1 : 0); s++) {
          const fx = (s / 3.5 - 0.5) * 1.8 * tw, fy = yb + 0.4 + Math.abs(fx) / tw * -1.5;
          obj.part(); obj.ellipse(x + fx, fy, tw * 0.28 * (C ? 1.1 : 1), 1.7 * sc, NEED[fx < 0 ? mi : Math.max(0, mi - 1)], y - 1.4 + t * 0.6, { round: 0.9, bias: fx < -tw * 0.3 ? 1 : 0 });
        }
        for (let s = 0; s < (C ? 4 : 3); s++) { const ax = x - tw * (0.15 + hash(s, seed, t) * 0.55), ay = yb - th * (0.15 + hash(s, seed, t + 7) * 0.6); obj.part(); obj.ellipse(ax, ay, C ? 2.2 : 1.6, C ? 1.5 : 1.1, NEED[2], y + 3, { fix: C ? 4 : 3, round: 0.5 }); }
      }
    }
    obj.part(); obj.poly([[x - 0.9, y - 5 * sc - hgt * 0.74 - hgt * 0.34 - 4 * sc], [x + 0.9, y - 5 * sc - hgt * 0.74 - hgt * 0.34 - 4 * sc], [x + 0.4, y - 5 * sc - hgt * 0.74 - hgt * 0.34 + 3]], NEED[2], y + 1, { round: 0.3 });   // the leader
    shadowsAt.push({ x: x + 7 * sc, y: y + 1.5, rx: wBase * 1.05, ry: 3.6 * sc, holes: !A, a: P.shadowA, trunk: [x + 2, y, 2, 6] });
  };
  // --- Scots pine: a tall, bare, orange-barked trunk and flat pads of needles, the high one widest
  const scots = (x, y, o = {}) => {
    const sc = (o.sc ?? 1) * (C ? 1.2 : 1), seed = o.seed ?? 1, th = (o.h ?? 40) * sc, lean = o.lean ?? 1.4;
    obj.part(); obj.capsule(x, y, 2.9 * sc, x + lean, y - th, 1.7 * sc, PBARK, y, { round: 0.9 });
    if (!A) { obj.part(); obj.ellipse(x - 2.8 * sc, y - 0.4, 2.2 * sc, 1.3, BARK_D, y + 0.2, {}); obj.part(); obj.ellipse(x + 3 * sc, y - 0.3, 2.4 * sc, 1.4, BARK_D, y + 0.2, {}); }
    obj.part(); obj.capsule(x + 1.2, y - 2, 1.4 * sc, x + lean + 0.8, y - th * 0.8, 0.5 * sc, mat(P.pbark, { contrast: 1.1 }), y + 0.3, { round: 0.9, bias: -1 });
    const pads = [[-9, th * 0.58, 8, 3.4], [8, th * 0.7, 8.5, 3.6], [-2, th * 0.88, 12, 4.4], [-13, th * 0.84, 6, 2.8], [12, th * 0.95, 6.5, 3]];
    obj.part(); obj.capsule(x + lean * 0.5, y - th * 0.56, 1.1 * sc, x - 8 * sc, y - th * 0.62, 0.8 * sc, PBARK, y + 0.4, { round: 0.8 });
    obj.part(); obj.capsule(x + lean * 0.8, y - th * 0.7, 1.1 * sc, x + 9 * sc, y - th * 0.74, 0.8 * sc, PBARK, y + 0.4, { round: 0.8 });
    // a dark underside to each pad, then the pad: a flat dome of needle clusters, the light on its upper left
    for (const [dx, dh, rx, ry] of pads) {
      const cx = x + lean + dx * sc, cy = y - dh, RX = rx * sc * (C ? 1.1 : 1), RY = ry * sc * (C ? 1.05 : 1);
      obj.part(); obj.ellipse(cx + 0.8, cy + RY * 0.45, RX * 0.92, RY * 0.7, PIN[0], y + 1, { fix: 0 });
      const n = A ? 1 : 5;
      for (let i = 0; i < n; i++) {
        const ang = hash(i, seed, dx) * 6.28 + i, rad = A ? 0 : 0.45 + hash(i, seed, 3) * 0.25;
        const lx = Math.cos(ang) * RX * rad, ly = Math.sin(ang) * RY * rad * 0.7, t = clamp((-lx / RX * 0.6 - ly / RY * 0.9) * 0.5 + 0.5 + (hash(lx, ly, seed) - 0.5) * 0.25, 0, 1);
        obj.part(); obj.ellipse(cx + lx, cy + ly - 0.5, A ? RX * 0.95 : RX * 0.55, A ? RY * 0.9 : RY * 0.62, PIN[A ? (dx > 0 ? 0 : 1) : t > 0.6 ? 2 : t > 0.3 ? 1 : 0], y + 2 + ly * 0.1 + hash(i, dx) * 0.4, { round: A ? 0.7 : 0.92, bias: !A && t > 0.8 ? 1 : 0 });
      }
      if (!A) for (let i = 0; i < (C ? 3 : 4); i++) { const fx = cx - RX * (0.1 + hash(i, seed, dx + 3) * 0.55), fy = cy - RY * (0.1 + hash(i, seed, dx + 9) * 0.55); obj.part(); obj.ellipse(fx, fy, C ? 2 : 1.4, C ? 1.2 : 0.9, PIN[2], y + 3.5, { fix: C ? 4 : 3, round: 0.5 }); }
    }
    shadowsAt.push({ x: x + 8 * sc, y: y + 2, rx: 14 * sc, ry: 3.8 * sc, holes: !A, a: P.shadowA, trunk: [x + 3, y, 2.4, th * 0.2] });
  };
  // --- crag: faceted grit, a lit top and left face, a dark right face, cracks, moss in the crevices
  const crag = (x, y, o = {}) => {
    const sc = (o.sc ?? 1) * (C ? 1.2 : 1), w = (o.w ?? 14) * sc, h = (o.h ?? 16) * sc, seed = o.seed ?? 1, cz = y;
    const J = (i) => (hash(i, seed, 5) - 0.5);
    const pk = [[x - w * 0.5, y], [x - w * 0.42, y - h * 0.5 + J(1) * 3], [x - w * 0.12, y - h + J(2) * 2], [x + w * 0.2, y - h * 0.86 + J(3) * 2], [x + w * 0.5, y - h * 0.34 + J(4) * 2], [x + w * 0.5, y]];
    const topPt = pk[2];
    const base = A ? GRIT : GRIT;
    obj.part(); obj.poly([pk[0], pk[1], topPt, [topPt[0] + w * 0.12, topPt[1] + h * 0.45], [x + w * 0.02, y]], A ? base : GRIT, cz, { n: [-0.6, 0.05, 0.55], bias: A ? 0 : 0 });                       // left face
    obj.part(); obj.poly([topPt, pk[3], pk[4], pk[5], [x + w * 0.02, y], [topPt[0] + w * 0.12, topPt[1] + h * 0.45]], A ? base : GRIT, cz + 0.2, { n: [0.55, 0.1, 0.45], bias: A ? 0 : -1 });   // right face, shaded
    obj.part(); obj.poly([topPt, pk[3], [topPt[0] + w * 0.46, topPt[1] + h * 0.3], [topPt[0] + w * 0.12, topPt[1] + h * 0.45]], base, cz + 0.4, { n: [-0.15, -0.65, 0.75], bias: A ? 0 : 1 });         // the lit top plane
    if (!A) {
      obj.part(); obj.line(topPt[0] + w * 0.12, topPt[1] + h * 0.45, x + w * 0.02, y - 1, GRIT, cz + 0.6, { bias: -1, noLine: true });                                                      // the arris between the faces
      obj.part(); obj.line(x - w * 0.3, y - h * 0.25, x - w * 0.12, y - h * 0.6, GRIT, cz + 0.6, { bias: -1, noLine: true });                                                                 // a crack
      obj.part(); obj.ellipse(x - w * 0.2, y - h * 0.08, w * 0.18, h * 0.07, MOSS, cz + 0.8, { round: 0.6 });
      obj.part(); obj.ellipse(x + w * 0.3, y - h * 0.02, w * 0.14, h * 0.05, MOSS, cz + 0.8, { round: 0.6 });
    }
    shadowsAt.push({ x: x + w * 0.5, y: y + 1, rx: w * 0.62, ry: 2.6 * sc, holes: false, a: P.shadowA });
  };
  // --- drystone wall: three rough courses, the lowest biggest, copes on edge, tall and short in turn
  const wall = (x0, x1, y, seed = 3) => {
    const hC = C ? 3.6 : 3.2;
    for (let course = 0; course < 3; course++) {
      for (let x = x0 + (course & 1) * 3; x < x1;) {
        const w = (C ? 6.5 : 5.6) - course * 0.8 + hash(x, course, seed) * 3.5, cx = x + w / 2, cy = y - course * hC * 0.85 - hC * 0.5;
        const t = hash(x * 1.3, course, seed + 2);
        obj.part(); obj.ellipse(cx, cy, w / 2 + 0.5, hC * 0.62 + 0.2, (t > 0.72 ? GRIT2 : GRIT), y + course * 0.5 + 0.2, { round: A ? 0.6 : 0.85, bias: A ? 0 : (t < 0.15 ? -1 : t > 0.88 ? 1 : 0) });
        x += w;
      }
    }
    for (let x = x0 + 1, i = 0; x < x1 - 2; i++) {                      // the copes: slabs on edge, cock and hen
      const tall = i % 2 === 0, w = 3.6 + hash(i, seed, 9) * 1.8, hh = tall ? 4.6 : 3.2;
      obj.part(); obj.ellipse(x + w / 2, y - 3 * hC * 0.85 - hh * 0.35, w / 2 + 0.2, hh * 0.55, GRIT, y + 2 + 0.2, { round: A ? 0.5 : 0.8, bias: A ? 0 : 1 });
      x += w + 0.2;
    }
    if (P.wear) { obj.part(); obj.ellipse(x0 + (x1 - x0) * 0.3, y - 0.8, 6, 1.5, MOSS, y + 3, { round: 0.6 }); obj.part(); obj.ellipse(x0 + (x1 - x0) * 0.72, y - 1.2, 4, 1.3, MOSS, y + 3, { round: 0.6 }); }
    shadowsAt.push({ x: (x0 + x1) / 2 + 2.5, y: y + 1.5, rx: (x1 - x0) / 2 + 3, ry: 2.4, holes: false, a: P.shadowA });
  };
  const milestone = (x, y) => {
    obj.part(); obj.poly([[x - 3.5, y], [x - 3, y - 11], [x - 1.6, y - 13.5], [x + 1.6, y - 13.5], [x + 3, y - 11], [x + 3.5, y]], GRIT, y, { round: 0.8, bias: A ? 0 : 0 });
    if (!A) { obj.part(); obj.rect(x - 1.5, y - 9, 3, 1, OX_D, y + 0.5, { n: [0, 0.3, 0.9], noLine: true }); obj.part(); obj.ellipse(x - 2, y - 0.8, 2, 0.9, MOSS, y + 0.8, { round: 0.6 }); }
    shadowsAt.push({ x: x + 4, y: y + 1, rx: 5.5, ry: 1.8, holes: false, a: P.shadowA });
  };
  const standard = (x, y) => {                                           // the Kingdom's oxblood standard on a pole, brass finial
    obj.part(); obj.capsule(x, y, 0.9, x, y - 30, 0.9, BARK, y, { round: 0.9 });
    obj.part(); obj.poly([[x + 0.8, y - 29], [x + 11, y - 27.5], [x + 9, y - 23.5], [x + 11, y - 19.5], [x + 0.8, y - 20]], OX, y + 0.5, { round: 0.2, n: [0, 0.2, 0.9], bias: A ? 0 : 0 });
    if (!A) { obj.part(); obj.line(x + 1.5, y - 26, x + 8.5, y - 25.2, OX, y + 0.8, { bias: -1, noLine: true }); obj.part(); obj.ellipse(x + 5, y - 24, 1.5, 1.3, BRASS, y + 1, { round: 0.6 }); }
    obj.part(); obj.ellipse(x, y - 31.2, 1.4, 1.4, BRASS, y + 0.6, { round: 0.9 });
    obj.part(); obj.ellipse(x, y - 0.3, 3, 1.3, GRIT, y + 0.2, {});                                    // a cairn-stone at the foot
    shadowsAt.push({ x: x + 5, y: y + 1, rx: 6, ry: 1.8, holes: false, a: P.shadowA });
  };
  // --- heather: a cushion of small rounded sprays, lit upper left, sinking to plum lower right; pink bloom on the sunny side
  const heather = (x, y, sz = 1, seed = 1) => {
    const rx = (3.8 + sz * 1.6) * (C ? 1.15 : 1), ry = rx * 0.58;
    const n = A ? 1 : 3 + Math.floor(hash(seed, 3) * 2);
    if (!A) { obj.part(); obj.ellipse(x + 0.8, y - ry * 0.25, rx * 1.05, ry * 0.75, HEATM[0], y - 0.2, { fix: 0 }); }
    for (let i = 0; i < n; i++) {
      const lx = A ? 0 : (i - (n - 1) / 2) * rx * 0.55, ly = A ? 0 : (hash(i, seed, 2) - 0.5) * ry * 0.5, lr = A ? rx : rx * 0.62, lyr = A ? ry : ry * 0.8;
      const mi = A ? 2 : i === 0 ? 3 : i % 2 ? 2 : 1;
      obj.part(); obj.ellipse(x + lx, y + ly - ry * 0.6, lr, lyr, HEATM[Math.min(mi, HEATM.length - 1)], y + i * 0.2 + ly * 0.05, { round: A ? 0.6 : 0.92, bias: !A && lx < 0 ? 1 : 0 });
    }
    if (!A) for (let i = 0; i < (C ? 3 : 3); i++) { const bx = x - rx * 0.7 + hash(i, seed, 8) * rx * 0.9, by = y - ry * 1.3 + hash(i, seed, 9) * ry * 0.8; obj.part(); obj.ellipse(bx, by, 0.9, 0.8, BLOOM[i % 2], y + 3, { fix: 3 + (i % 2), round: 0.4 }); }
    shadowsAt.push({ x: x + 2.5, y: y + 0.8, rx: rx + 1.5, ry: 1.5, holes: false, a: P.shadowA * 0.9 });
  };

  // ---- the layout: a corner of an Iron board; the wood and a crag on the upper left, the wall and milestone by the road ----
  const SP = (x, y, o) => spruce(x, y, o), SC_ = (x, y, o) => scots(x, y, o);
  crag(116, 46, { w: 20, h: 22, seed: 4, sc: 1 });
  spruce(16, 70, { sc: 1.05, seed: 2, h: 50, w: 14 });
  spruce(46, 56, { sc: 0.9, seed: 5, h: 44, w: 12.5 });
  scots(168, 66, { sc: 1, seed: 7, h: 44 });
  spruce(206, 86, { sc: 0.85, seed: 9, h: 42, w: 12 });
  crag(66, 78, { w: 13, h: 12, seed: 11, sc: 0.9 });
  wall(78, 142, 98, 3);
  milestone(156, 108);
  standard(218, 110);
  crag(40, 173, { w: 17, h: 12, seed: 6, sc: 0.9 });
  crag(204, 171, { w: 12, h: 9, seed: 8, sc: 0.85 });
  // heather in drifts (placed from a jittered grid inside the drift, off the road)
  let hn = 0;
  for (let j = 0; j < 14 && hn < P.heathN * 3; j++) for (let i = 0; i < 18; i++) {
    const x = Math.floor(i * 13.5 + hash(i, j, 61) * 12) + 3, y = Math.floor(j * 12 + hash(i, j, 62) * 10) + 8;
    if (!heathDrift(x, y) || roadD(x, y) > -9 || hash(i, j, 63) > (C ? 0.4 : 0.34) || y > 172) continue;
    if (x > 66 && x < 146 && y > 78 && y < 102) continue;                // keep the wall clear
    if (y < 54 && x > 60 && x < 130) continue;                          // and the crag
    heather(x, y, hash(i, j, 64) > 0.55 ? 2 : 1, i * 7 + j);
    hn++;
    if (hn > P.heathN * 3) break;
  }

  // ---- shadows laid on the turf (the road takes them too, a little less) ----
  const laySh = (s) => {
    for (let y = Math.floor(s.y - s.ry - 1); y <= Math.ceil(s.y + s.ry + 1); y++) for (let x = Math.floor(s.x - s.rx - 1); x <= Math.ceil(s.x + s.rx + 1); x++) {
      const u = (x + 0.5 - s.x) / s.rx, v = (y + 0.5 - s.y) / s.ry;
      if (u * u + v * v > 1) continue;
      if (s.holes && hash(x, y, 77) > 0.86 && Math.hypot(u, v) > 0.35) continue;
      px1(x, y, SHADE, roadD(x, y) > 0 && !A ? s.a * 0.8 : s.a);
    }
    if (s.trunk) { const [tx, ty, tw, th] = s.trunk; for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) px1(tx + i + j * 0.4, ty + 1 + j * 0.5, SHADE, s.a * 0.9); }
  };
  shadowsAt.forEach(laySh);

  // ---- bake and lay ----
  const img = obj.resolve({ line: "tint" });
  for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
    const k = (j * img.w + i) * 4, a = img.data[k + 3] / 255; if (!a) continue;
    px1(Math.round(obj.ox - img.ox) + i, Math.round(obj.oy - img.oy) + j, [img.data[k], img.data[k + 1], img.data[k + 2]], a);
  }
  // a cold breath over C only would be a grade, which the game does; none here (the sheet shows the paint)
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let k = 0; k < W * H; k++) { rgba[k * 4] = buf[k * 3]; rgba[k * 4 + 1] = buf[k * 3 + 1]; rgba[k * 4 + 2] = buf[k * 3 + 2]; rgba[k * 4 + 3] = 255; }
  return { w: W, h: H, rgba, label: P.label, key: P.key };
}
