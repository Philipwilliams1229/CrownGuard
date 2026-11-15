// ============ RIMEWATER SCENERY CONCEPT: one board corner in three looks (2026-11-14) ============
// The Rimewater's twin of concept/scenery.js (the Greenwood round the owner picked look C from).
// A standalone renderer; nothing in the game reads it. `renderScene("a"|"b"|"c")` returns
// { w, h, rgba } for one corner of a Rime board, 240 x 176 art pixels: a snowfield, a stretch of the
// trodden snow track (old flagstones showing in it), a cold strand with shore ice and floes in the
// top right, the chapter's spruce, black wind-scoured rocks with snow caps, a rune stone, a cairn,
// dead-grass tussocks, frozen puddles, and the Archer hall (level 2, the real pix hall) for scale.
// No castle wall (the castle gets its own round).
//   A  clean   today's Rime look, tidied: flat calm snow, few crisp marks, plain spruce
//   B  worked  drifts that lie in long wind-stretched lumps, wind ripples, blue shadow, frost on
//              stone, boughs lit with snow on top, real cast shadows, faint broken ruts
//   C  bolder  B with richer colour, bigger shapes, deeper blue-violet shadow, brighter highlights
// The objects are sculpted with Pix like the halls (material + depth + normal per pixel, one sun
// from the upper left, a one-pixel tinted line); the ground is plain pixels. Coordinates are art
// pixels, y down. The wind blows from the west-north-west, as in scenery-rime.js: drifts and
// ripples are stretched along it.
import { Pix, mat, flat } from "../src/render/pix/pix.js";
import * as kit from "../src/render/pix/hall-kit.js";
import { frameAt } from "../src/render/pix/rig.js";

export const W = 240, H = 176;
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
    snow: ["#c8d4e0", "#d6e0e9", "#e2eaf0", "#eef4f8", "#f8fbfc"].map(hex),
    road: ["#98a8b8", "#a8b6c4", "#b8c4d0", "#c6d0da", "#d4dce4"].map(hex),
    flag: ["#8e989e", "#9aa4aa", "#a6b0b5", "#b2bbbf", "#c8d0d4"].map(hex),
    water: ["#2c5a78", "#34688a", "#3f7a9c", "#5a94b2"].map(hex),
    ice: ["#6f96ae", "#93bacd", "#b8d8e6", "#dcf0f6"].map(hex),
    shade: [96, 112, 148], shadowA: 0.24, contrast: 1,
    spruce: ["#1f3a34", "#284840", "#33584c"], trunk: "#4a3828", rock: "#34333c", snowMat: "#e6eef2", stone: "#8a8896",
    straw: ["#6a5c3e", "#9a8650", "#c4aa68"].map(hex), shingle: ["#b4a07a", "#c6b48c", "#d8c8a0"].map(hex),
    gain: 0.55, lump: [30, 10], ripples: false, tiers: 3, boughs: false, sprScale: 1, snowOn: 1, frost: false,
  },
  b: {
    key: "B", label: "worked",
    snow: ["#9db2cc", "#b9cade", "#d6e2ee", "#ebf3f9", "#fbfdfe"].map(hex),
    road: ["#7787a0", "#93a2b8", "#afbccd", "#c8d4e2", "#e0e9f2"].map(hex),
    flag: ["#6e7a88", "#8794a0", "#9fabb5", "#b6c1ca", "#d2dae0"].map(hex),
    water: ["#1f4a6c", "#2a5f86", "#3a789e", "#6aa6c4"].map(hex),
    ice: ["#5f88a4", "#8cb4ca", "#b4d4e4", "#e0f2f8"].map(hex),
    shade: [68, 88, 140], shadowA: 0.36, contrast: 1,
    spruce: ["#1a3a38", "#264e46", "#3a6c5a"], trunk: "#4a3624", rock: "#302f3a", snowMat: "#e8f0f6", stone: "#7e7c8c",
    straw: ["#5e5236", "#8a7646", "#b49a5c"].map(hex), shingle: ["#8e7e64", "#b09c76", "#d2c096"].map(hex),
    gain: 0.95, lump: [40, 13], ripples: true, tiers: 4, boughs: true, sprScale: 1, snowOn: 2, frost: true,
  },
  c: {
    key: "C", label: "bolder",
    snow: ["#6f84c0", "#9aaee0", "#cddcf4", "#eaf4ff", "#ffffff"].map(hex),
    road: ["#46558a", "#667aaa", "#8c9fc6", "#b2c3e0", "#d8e4f6"].map(hex),
    flag: ["#4c5878", "#68779a", "#8998b4", "#aebccf", "#d0dae8"].map(hex),
    water: ["#122e6c", "#1d4a9a", "#2f78c0", "#6ab4e6"].map(hex),
    ice: ["#4a7ab0", "#7cb0d8", "#aad4ee", "#e4f6ff"].map(hex),
    shade: [48, 54, 132], shadowA: 0.52, contrast: 1.3,
    spruce: ["#0f3a3c", "#1b5e54", "#34987a"], trunk: "#5a3828", rock: "#2e2c4a", snowMat: "#f0f8ff", stone: "#7a76a0",
    straw: ["#6a5a30", "#a88a3c", "#e0c25c"].map(hex), shingle: ["#7a6a78", "#a8906c", "#e0c892"].map(hex),
    gain: 1.25, lump: [52, 16], ripples: true, tiers: 5, boughs: true, sprScale: 1.3, snowOn: 3, frost: true,
  },
};

// ---- the painter ----------------------------------------------------------------------
export async function renderScene(sk) {
  const P = PROFILES[sk], A = sk === "a", C = sk === "c";
  const [s0, s1, s2, s3, s4] = P.snow, [r0, r1, r2, r3, r4] = P.road;
  const buf = new Float32Array(W * H * 3);
  const px1 = (x, y, c, a = 1) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return; const k = (y * W + x) * 3; for (let i = 0; i < 3; i++) buf[k + i] += (c[i] - buf[k + i]) * a; };
  const SH = P.shade;

  // ---------------- the road: the trodden track runs left to right ----------------
  const RW = A ? 20 : C ? 22 : 21;
  const cy = (x) => 153 + 5 * Math.sin(x / 40 + 0.6) + 3 * smoothstep(x / W);
  function smoothstep(t) { return smooth(clamp(t, 0, 1)); }
  const edge = (x, side) => (A ? 0 : (vn(x / (C ? 9 : 7), side * 5, 3) - 0.5) * (C ? 7 : 5));
  const roadD = (x, y) => { const d = y - cy(x), side = d < 0 ? -1 : 1; return RW + edge(x, side) - Math.abs(d); };

  // ---------------- the coast: a bay in the top right ----------------
  const shoreX = (y) => 160 + 9 * Math.sin(y / 13 + 1) + y * 0.2 + (vn(y / 8, 2, 51) - 0.5) * 5;
  const bayEnd = (x) => 112 + 4 * Math.sin(x / 9) + (vn(x / 6, 3, 52) - 0.5) * 4;
  const seaD = (x, y) => Math.min(x - shoreX(y), bayEnd(x) - y);          // > 0 in the water

  // ---------------- the snow: long wind-stretched drifts ----------------
  const [lx, ly] = P.lump;
  const hgt = (x, y) => vn(x / lx, y / ly, 21) * 0.72 + vn(x / (lx * 0.45), y / (ly * 0.45), 22) * 0.24 + vn(x / 7, y / 2.6, 23) * 0.04;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // light from the upper left: a slope facing it is lit, one facing away lies in blue shadow
    let t = 0.5 + (hgt(x - 2, y - 1.5) - hgt(x + 2, y + 1.5)) * P.gain * 1.9;
    if (A) t = 0.5 + (t - 0.5) * 0.5 + (hgt(x, y) - 0.5) * 0.15;
    const v = t + (BAYER[y & 3][x & 3] - 0.5) * (A ? 0.06 : 0.08);
    let i = v < 0.28 ? 0 : v < 0.44 ? 1 : v < 0.64 ? 2 : v < 0.8 ? 3 : 4;
    if (A) i = clamp(i, 1, 3);
    let c = P.snow[i];
    if (P.ripples) {
      // wind ripples: fine crests laid across the wind, in patches, broken
      const patch = vn(x / 38, y / 24, 31);
      if (patch > 0.6) {
        const ph = (y * 0.92 + 5 * vn(x / 17, y / 9, 32) + x * 0.07) % 3.3;
        if (hash(x >> 1, y >> 2, 33) > 0.45) {
          if (ph >= 0 && ph < 0.95) c = P.snow[Math.min(4, i + 1)];
          else if (ph < 1.9 && i < 4) c = P.snow[Math.max(0, i - 1)];
        }
      }
    }
    px1(x, y, c);
  }
  // sparkle on the lit snow: single bright pixels that catch the low sun
  if (!A) for (let k = 0; k < (C ? 90 : 55); k++) { const x = Math.floor(hash(k, 61) * W), y = Math.floor(hash(k, 62) * H); px1(x, y, [255, 255, 255], C ? 0.95 : 0.8); }

  // frozen puddles: pale lenses of ice in the snow
  const ice = P.ice;
  const puddles = A ? [[44, 100, 5, 2]] : [[44, 100, 7, 2.6], [150, 132, 6, 2.2], [14, 40, 5, 2]];
  for (const [px, py, rx, ry] of puddles) {
    if (roadD(px, py) > -4) continue;
    for (let y = Math.floor(py - ry - 1); y <= Math.ceil(py + ry + 1); y++) for (let x = Math.floor(px - rx - 1); x <= Math.ceil(px + rx + 1); x++) {
      const u = (x + 0.5 - px) / rx, v = (y + 0.5 - py) / ry; if (u * u + v * v > 1) continue;
      px1(x, y, v < -0.25 && u < 0.2 ? ice[3] : v > 0.35 ? ice[0] : ice[1]);
    }
    if (!A) { px1(px - rx * 0.5, py - 1, [255, 255, 255]); px1(px - rx * 0.5 + 1, py - 1, [255, 255, 255], 0.8); }
  }

  // dead-grass tussocks poking out of the drifts
  const tussock = (x, y, big) => {
    const n = A ? 4 : 6 + (C ? 3 : 0);
    for (let b = 0; b < n; b++) {
      const ox = Math.round((hash(b, x, 71) - 0.5) * (big ? 6 : 4)), hh = (big ? 5 : 3) + Math.floor(hash(b, y, 72) * (big ? 4 : 3)), lean = hash(b, 73) < 0.65 ? 1 : 0;
      for (let h = 0; h < hh; h++) px1(x + ox + (lean && h > hh / 2 ? 1 : 0), y - h, P.straw[h === hh - 1 ? 2 : h > hh / 2 ? 1 : 0]);
    }
    if (!A) { for (let i = -3; i <= 3; i++) px1(x + i, y, s4, 0.9); px1(x - 2, y - 1, s4); px1(x - 1, y - 1, s3); px1(x + 3, y + 1, [SH[0], SH[1], SH[2]], 0.4); }
  };
  const tussocks = [[30, 118], [118, 100], [60, 30], [204, 138], [10, 90]];
  for (const [x, y] of tussocks) if (roadD(x, y) < -4 && seaD(x, y) < -14) tussock(x, y, !A && hash(x, y) > 0.4);

  // ---------------- the road ----------------
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = roadD(x, y);
    if (d < -3 || seaD(x, y) > -2) continue;
    const side = y < cy(x) ? -1 : 1;
    if (d < 0) { if (!A && BAYER[y & 3][x & 3] < (3 + d) / 3 * 0.5) px1(x, y, side < 0 ? r3 : r1, 0.8); continue; }
    let c = r2;
    if (A) c = d < 1.2 ? r3 : r2;
    else {
      const n = vn(x / 12, y / 6, 5) * 0.75 + vn(x / 3, y / 2.5, 6) * 0.25, b = (BAYER[y & 3][x & 3] - 0.5) * 0.16;
      c = n + b < 0.34 ? r1 : n + b > 0.66 ? r3 : r2;
      if (d < 1.5) c = side < 0 ? r4 : r1;               // snow banked up along the upper edge, a blue lee under the lower
      else if (d < 2.8 && side > 0) c = r1;
    }
    px1(x, y, c);
  }
  // old flagstones showing through the track: a few stretches of dark courses, snow in the joints
  const FG = P.flag;
  for (let y = 0; y < H; y++) for (let x = 30; x < 130; x++) {
    const d = roadD(x, y); if (d < 3.5) continue;
    if (vn(x / 22, y / 9, 41) < (A ? 0.7 : 0.62)) continue;
    const row = Math.floor((y + 30) / 5), col = Math.floor((x + (row & 1) * 6 + 200) / 11);
    const joint = (y + 30) % 5 === 0 || (x + (row & 1) * 6 + 200) % 11 === 0;
    const tone = hash(row, col, 4);
    const lipUp = (y + 30) % 5 === 1;
    px1(x, y, joint ? (A ? r3 : r4) : lipUp && !A ? FG[3] : tone < 0.3 ? FG[0] : tone > 0.82 ? FG[3] : FG[1 + (hash(col, row, 7) > 0.5 ? 1 : 0)]);
  }
  if (!A) {
    // ruts: two faint, broken wheel tracks (the owner: not so obvious), the lit lip on the upper side only
    for (const off of [-RW * 0.4, RW * 0.4]) for (let x = 0; x < W - 2; x++) {
      const yc = cy(x) + off + (vn(x / 14, off, 8) - 0.5) * 3;
      if (vn(x / 6, off, 4) < 0.58 || seaD(x, yc) > -3) continue;
      const y = Math.round(yc);
      if (roadD(x, y) < 4) continue;
      px1(x, y, r1, 0.55); px1(x, y - 1, r3, 0.4);
    }
  }
  // churned grit and pebbles on the track
  const nPeb = A ? 4 : C ? 11 : 14;
  for (let i = 0; i < nPeb; i++) {
    const x = Math.floor(hash(i, 21) * (W - 20)) + 6, y = Math.floor(cy(x) + (hash(i, 22) - 0.5) * (RW * 1.6));
    if (seaD(x, y) > -3) continue;
    const g = hash(i, 23) > 0.5 ? [124, 112, 100] : [150, 138, 120];
    if (A) { px1(x, y, g, 0.8); continue; }
    px1(x, y, g); px1(x + 1, y, g); px1(x, y - 1, [200, 206, 216]); px1(x + 1, y + 1, [SH[0], SH[1], SH[2]], 0.5);
  }

  // ---------------- the strand: shingle, shore ice, floes and open water ----------------
  const [w0, w1, w2, w3] = P.water;
  const sg = P.shingle;
  for (let y = 0; y < H; y++) for (let x = 120; x < W; x++) {
    const d = seaD(x, y);
    if (d < -14) continue;
    if (d <= 0) {
      // land: a band of shingle under the drifts, snow lying in it
      if (d > -12 + (vn(x / 6, y / 6, 81) - 0.5) * 5 || d >= -1) {
        const n = vn(x / 3, y / 2.4, 82), b = (BAYER[y & 3][x & 3] - 0.5) * 0.2;
        let c = n + b < 0.35 ? sg[0] : n + b > 0.66 ? sg[2] : sg[1];
        if (hash(x, y, 83) > 0.88) c = sg[2];
        if (vn(x / 7, y / 5, 84) > (A ? 0.66 : 0.55) && d < -2) c = P.snow[2 + (BAYER[y & 3][x & 3] > 0.55 ? 1 : 0)];   // snow in patches
        px1(x, y, c);
      } else {
        // the snow's edge, broken
        if (BAYER[y & 3][x & 3] < 0.5) px1(x, y, s1, 0.5);
      }
      continue;
    }
    if (d < 5 + (vn(x / 5, y / 5, 85) - 0.5) * 3) {
      // shore ice: a shelf, cracked
      let c = ice[2];
      if (d > 3) c = ice[1];
      if (!A && hash(x >> 1, y, 86) > 0.9) c = ice[3];
      if (!A && (x + y * 3) % 11 === 0 && hash(x, y, 87) > 0.3) c = ice[0];
      px1(x, y, c);
      continue;
    }
    // open water: swell stretched along the wind, lit crests
    const sw = vn(x / 16, y / 3.2 + x / 60, 88) * 0.7 + vn(x / 6, y / 2, 89) * 0.3, b = (BAYER[y & 3][x & 3] - 0.5) * 0.14;
    let c = sw + b < 0.32 ? w0 : sw + b > 0.7 ? w2 : w1;
    if (!A && sw + b > 0.82 && hash(x, y, 90) > 0.4) c = w3;
    px1(x, y, c);
  }
  // floes: each a slab of snow-topped ice with a blue edge and a shadow in the water
  const floe = (cx, cy0, rx, ry, seed) => {
    const wob = (ang) => 1 + (vn(Math.cos(ang) * 2 + seed, Math.sin(ang) * 2 + seed, 91) - 0.5) * 0.6;
    const inside = (x, y, dx, dy) => { const u = (x + 0.5 - cx - dx), v = (y + 0.5 - cy0 - dy); const ang = Math.atan2(v / ry, u / rx); return (u * u) / (rx * rx) + (v * v) / (ry * ry) < wob(ang) * wob(ang) * 0.8; };
    for (let y = Math.floor(cy0 - ry * 1.5); y <= Math.ceil(cy0 + ry * 1.5 + 4); y++) for (let x = Math.floor(cx - rx * 1.6); x <= Math.ceil(cx + rx * 1.6 + 3); x++) {
      if (inside(x, y, 3, 3.5)) px1(x, y, [SH[0] * 0.4, SH[1] * 0.5, SH[2] * 0.7], P.shadowA * 0.8);
    }
    for (let y = Math.floor(cy0 - ry * 1.5); y <= Math.ceil(cy0 + ry * 1.5 + 4); y++) for (let x = Math.floor(cx - rx * 1.6); x <= Math.ceil(cx + rx * 1.6 + 3); x++) {
      const top = inside(x, y, 0, 0), side = !top && (inside(x, y, 0, 1.5) || inside(x, y, 0, 2.5));
      if (side) px1(x, y, ice[1]);
      if (top) {
        const lit = (x - cx) / rx * -0.5 + (y - cy0) / ry * -0.5;
        let c = lit > 0.3 ? P.snow[4] : lit > -0.25 ? P.snow[3] : P.snow[2];
        if (!A && !inside(x - 1, y - 0.5, 0, 0)) c = P.snow[4];
        if (!A && !inside(x + 1, y + 0.5, 0, 0)) c = ice[2];
        px1(x, y, c);
      }
    }
  };
  floe(208, 40, 9, 3.6, 1); floe(190, 78, 6, 2.6, 2); floe(224, 92, 11, 4, 3); floe(200, 16, 6, 2.4, 4);
  if (!A) { floe(176, 100, 4, 1.8, 5); floe(225, 62, 5, 2.2, 6); }

  // ---------------- objects: sculpted with Pix ----------------
  const SN = mat(P.snowMat, { contrast: P.contrast }), ROCK = mat(P.rock, { contrast: P.contrast }), STONE = mat(P.stone, { contrast: P.contrast });
  const SPR = P.spruce.map((c) => mat(c, { contrast: C ? 1.3 : 1 })), TRK = mat(P.trunk, { contrast: 1.1 });
  const TEAL = flat("#3aa89a"), OCHRE = flat("#e2b452"), FROSTM = flat(C ? "#e8f6ff" : "#d8ecf8"), DEEP = flat(C ? "#4a4fa0" : "#5a6c9c");
  const shadowsAt = [];
  const back = new Pix(W, H, 0, 0), front = new Pix(W, H, 0, 0);
  const HALL_Y = 116;

  // a spruce: tiers of bough, snow lying on each, a dark underside, a long blue shadow
  const spruce = (px, x, y, o = {}) => {
    const sc = (o.sc ?? 1) * P.sprScale, seed = o.seed ?? 1, T = o.tiers ?? P.tiers, th = 7 * sc, tierH = (10 + (C ? 1 : 0)) * sc, wBase = 10.5 * sc;
    const zb = y;
    px.part(); px.capsule(x, y, 2.4 * sc, x + 0.3, y - th, 1.8 * sc, TRK, zb, { round: 0.9 });
    if (!A) { px.part(); px.ellipse(x - 2.5 * sc, y - 0.3, 2 * sc, 1.1, TRK, zb + 0.2, {}); px.ellipse(x + 2.8 * sc, y - 0.2, 2.2 * sc, 1.2, TRK, zb + 0.2, {}); }
    for (let k = 0; k < T; k++) {                         // k = 0 is the lowest, widest tier
      const f = k / Math.max(1, T - 1), w = wBase * (1 - f * 0.72) * (A ? 1 : 1 + (hash(k, seed, 3) - 0.5) * 0.18);
      const yb = y - th * 0.7 - k * (tierH * 0.62), yt = yb - tierH * (1.05 - f * 0.1);
      const zt = zb + 2 - k * 0.1 + 0.0;                  // upper tiers sit behind the ones below them
      px.part();
      const pts = [[x, yt]];
      if (P.boughs) { const n = 4; pts.push([x + w, yb + 0.5]); for (let i = n; i >= -n + 1; i--) { const u = i / n; pts.push([x + w * u * 0.98, yb - (i & 1 ? 2.2 : 0) + 0.5 - (1 - Math.abs(u)) * 0.2]); } pts.push([x - w, yb + 0.5]); }
      else pts.push([x + w, yb], [x - w, yb]);
      px.poly(pts, SPR[k % 2 ? 1 : 0 + (f > 0.6 ? 1 : 0)] ?? SPR[1], zt, { round: 0.85, ny: -0.1 });
      // a lighter lit lower-left flank on the bolder looks
      if (!A) { px.part(); px.poly([[x - w * 0.15, yt + tierH * 0.45], [x - w * 0.9, yb - 0.5], [x - w * 0.35, yb - 0.5]], SPR[2], zt + 0.3, { round: 0.6, ny: -0.15 }); }
      // the snow lying on this tier: a cap down the sunward slope, thicker in the worked looks
      const sn = P.snowOn;
      px.part();
      px.poly([[x, yt - 0.3], [x + w * (0.5 + sn * 0.08), yt + tierH * (0.5 + sn * 0.05)], [x + w * 0.1, yt + tierH * 0.42], [x - w * 0.25, yt + tierH * 0.62], [x - w * (0.55 + sn * 0.08), yt + tierH * (0.58 + sn * 0.04)]], SN, zt + 0.6, { round: 0.55, ny: -0.35 });
      if (!A) {
        // a bank of snow riding on the boughs' tips, lit on the left
        px.part(); px.ellipse(x - w * 0.62, yb - 1.4, w * 0.26 + 1, 1.3 + sn * 0.2, SN, zt + 0.8, { round: 0.8, bias: 1 });
        px.part(); px.ellipse(x + w * 0.5, yb - 1.7, w * 0.22 + 0.8, 1.1 + sn * 0.2, SN, zt + 0.8, { round: 0.8 });
      }
    }
    // the tip
    px.part(); px.ellipse(x, y - th * 0.7 - (T - 1) * tierH * 0.62 - tierH * 1.0, 1.2, 1.6, SN, zb + 3, { round: 0.8 });
    const ht = th + T * tierH * 0.62 + tierH * 0.3;
    shadowsAt.push({ x: x + 9 * sc, y: y + 2.5, rx: wBase * 1.15, ry: 3.4 * sc, a: P.shadowA, dap: !A, trunk: [x + 2, y, 2, 5], tall: ht * 0.28, sc });
  };

  // a black wind-scoured rock with snow in its cap and frost on the lit side
  const rock = (px, x, y, rx, ry, seed = 1) => {
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r = 0.82 + hash(i, seed, 5) * 0.3; pts.push([x + Math.cos(a) * rx * r, y - ry * 0.55 + Math.sin(a) * ry * r * 0.9]); }
    px.part(); px.poly(pts, ROCK, y, { round: 0.7, ny: -0.1 });
    if (!A) { px.part(); px.poly([[x - rx * 0.1, y - ry * 1.35], [x + rx * 0.5, y - ry * 0.6], [x - rx * 0.6, y - ry * 0.3]], mat(P.rock, { contrast: P.contrast * 1.1 }), y + 0.2, { round: 0.4, ny: -0.3, bias: 1 }); }
    // the cap of snow: an ellipse on the top, thicker toward the lit side
    px.part(); px.ellipse(x - rx * 0.12, y - ry * 1.05, rx * (0.7 + P.snowOn * 0.06), ry * (0.42 + P.snowOn * 0.05), SN, y + 0.6, { round: 0.75, ny: -0.3 });
    if (P.frost) { for (let i = 0; i < 4; i++) { px.part(); px.dot(x - rx * 0.7 + hash(i, seed, 6) * rx * 0.8, y - ry * 0.6 + hash(i, seed, 7) * ry * 0.6, FROSTM, y + 2, {}); } }
    shadowsAt.push({ x: x + rx * 0.9, y: y + 0.6, rx: rx * 1.5, ry: 1.8 + ry * 0.2, a: P.shadowA });
  };

  // the rune stone: a tall slab, snow on its head, a serpent cut in teal and ochre
  const runestone = (px, x, y, sc = 1) => {
    const w = 5.5 * sc, h = 24 * sc;
    px.part(); px.poly([[x - w, y], [x - w * 0.8, y - h * 0.82], [x - w * 0.25, y - h], [x + w * 0.55, y - h * 0.94], [x + w * 0.85, y - h * 0.7], [x + w, y]], STONE, y, { round: 0.55, ny: -0.05 });
    px.part(); px.ellipse(x - w * 0.3, y - h * 0.97, w * 0.85, 1.7 + P.snowOn * 0.3, SN, y + 0.5, { round: 0.8 });
    if (P.frost) { px.part(); px.poly([[x - w * 0.85, y - h * 0.8], [x - w * 0.85, y - h * 0.2], [x - w * 0.6, y - h * 0.3], [x - w * 0.6, y - h * 0.78]], mat(P.stone, { contrast: P.contrast * 1.2 }), y + 0.3, { round: 0.2, bias: 1, n: [-0.5, 0, 0.6] }); }
    // the serpent: an S down the face
    const nS = A ? 8 : 16;
    for (let i = 0; i < nS; i++) {
      const t = i / (nS - 1), yy = y - h * 0.78 + t * h * 0.6, xx = x + Math.sin(t * 6.4) * w * 0.4;
      px.part(); px.dot(xx, yy, i % 2 ? TEAL : OCHRE, y + 1.5, {});
      if (!A) px.dot(xx + 1, yy, i % 2 ? TEAL : OCHRE, y + 1.5, {});
    }
    if (!A) { px.part(); px.dot(x + w * 0.1, y - h * 0.82, OCHRE, y + 2, {}); }
    shadowsAt.push({ x: x + w * 2.6, y: y + 1.5, rx: w * 3.4, ry: 2.4, a: P.shadowA });
  };

  // a cairn of black stones, snow-capped
  const cairn = (px, x, y, sc = 1) => {
    const rows = [[0, 0, 5.5, 2.8], [-3, -2.8, 3.4, 2], [2.8, -2.6, 3.2, 2], [0, -5.4, 3, 2], [-1, -7.8, 2.2, 1.6]];
    rows.forEach(([dx, dy, rx, ry], i) => { px.part(); px.ellipse(x + dx * sc, y + dy * sc, rx * sc, ry * sc, ROCK, y + i * 0.2, { round: 0.85 }); });
    px.part(); px.ellipse(x - 0.5 * sc, y - 9.3 * sc, 2.8 * sc, 1.2 * sc, SN, y + 3, { round: 0.8 });
    if (!A) { px.part(); px.ellipse(x - 3 * sc, y - 4.3 * sc, 2.2 * sc, 0.9, SN, y + 1.5, { round: 0.8 }); }
    shadowsAt.push({ x: x + 5 * sc, y: y + 1.2, rx: 8 * sc, ry: 1.8, a: P.shadowA });
  };

  // the cast: trees behind the hall in `back`, the rest in `front` (laid after it)
  spruce(back, 24, 78, { sc: 1.1, seed: 2 });
  spruce(back, 52, 56, { sc: 0.9, seed: 5 });
  spruce(back, 126, 72, { sc: 0.85, seed: 9 });
  spruce(front, 12, 132, { sc: 0.8, seed: 12, tiers: Math.max(3, P.tiers - 1) });
  spruce(front, 206, 136, { sc: 0.95, seed: 14 });
  rock(front, 138, 134, 8, 5.5, 3); rock(front, 118, 130, 3.6, 2.6, 4); rock(back, 6, 22, 5, 4, 5); rock(front, 168, 128, 5, 3.6, 6);
  rock(back, 100, 60, 4.5, 3.4, 7);
  runestone(back, 154, 106, 1.35);
  cairn(front, 66, 134, 1);

  // ---- every cast shadow laid on the ground, toward the lower right ----
  const laySh = (s) => {
    const ry = s.ry, rx = s.rx;
    for (let y = Math.floor(s.y - ry - 1); y <= Math.ceil(s.y + ry + 1); y++) for (let x = Math.floor(s.x - rx - 1); x <= Math.ceil(s.x + rx + 1); x++) {
      const u = (x + 0.5 - s.x) / rx, v = (y + 0.5 - s.y) / ry;
      if (u * u + v * v > 1) continue;
      if (s.dap && hash(x, y, 77) > 0.9 && Math.hypot(u, v) > 0.4) continue;
      if (seaD(x, y) > -1) continue;
      px1(x, y, SH, s.a);
    }
    if (s.trunk) { const [tx, ty, tw, th] = s.trunk; for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) px1(tx + i + j * 0.5, ty + 1 + j * 0.4, SH, s.a * 0.9); }
  };
  shadowsAt.forEach(laySh);

  // ---- bake and lay ----
  const lay = (img, ax, ay, alpha = 1) => {
    for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
      const k = (j * img.w + i) * 4, a = (img.data[k + 3] / 255) * alpha; if (!a) continue;
      px1(Math.round(ax - img.ox) + i, Math.round(ay - img.oy) + j, [img.data[k], img.data[k + 1], img.data[k + 2]], a);
    }
  };
  lay(back.resolve({ line: "tint" }), 0, 0);

  // ---- the Archer hall, level 2, with its crew ----
  const hall = await import("../src/render/pix/hall-archer.js");
  const hb = kit.bakeHall(hall.BOX, hall.build({ level: 2, style: P.key, seed: 0 }), {});
  const HX = 82, HY = HALL_Y, sp = hb.spec;
  const shadow = sp.shadow;
  if (shadow) { const rows = kit.groundShadow(shadow.rx, shadow.ry, shadow); for (const [y, x0, x1] of rows) for (let x = x0; x <= x1; x++) px1(HX + x, HY + y, SH, P.shadowA * 0.95); }
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
    lay(p.resolve({ flip: false, lights: (info.lights || (info.light ? [info.light] : [])).filter((l) => l && l.k > 0.02) }), HX + c.x, HY + c.y);
  }
  if (hb.front) lay(hb.front, HX, HY);
  for (const g of hb.glows) if (g.front) lay(g.front, HX, HY, 0.8 * (sp.lights.find((l) => l.key === g.key).k ?? 1));
  livesOf("front").forEach(drawLive);

  lay(front.resolve({ line: "tint" }), 0, 0);

  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let k = 0; k < W * H; k++) { rgba[k * 4] = buf[k * 3]; rgba[k * 4 + 1] = buf[k * 3 + 1]; rgba[k * 4 + 2] = buf[k * 3 + 2]; rgba[k * 4 + 3] = 255; }
  return { w: W, h: H, rgba, label: P.label, key: P.key };
}
