// ============ OVERHAUL CONCEPT: THE GROUND (2026-11-22) ============
// Concept round only (art/briefs/overhaul-concepts.md): nothing in the game reads this.
// renderGround(opt, chap, sun) -> { w, h, rgba } : one 840 x 560 art-px patch (420 x 280 board units)
//   opt   "A" land with height (terraces, scarps, a road that climbs, a hollow that holds water)
//         "B" a worked countryside (fields, crops, hedgerows / drystone walls, tracks, yards)
//         "C" lush and painterly (big masses of tall grass, clover, drifts of flowers, bracken,
//             trampled earth and big puddles with mud margins along a real country lane)
//   chap  "green" | "iron" | "fen" | "rime"
//   sun   a data/sun.js id ("noon", "golden", ...)
// Ground coordinates are art px: x east, s south, z up; a point is drawn at screen (x, s - z).
// The ground is drawn as a height field, front to back per column (a face shows wherever the
// land steps down toward the viewer), then shadows, then the standing things sorted by their feet.
// The real Archer hall (hall-archer.js) and the real goblin / garrison figures stand in it for
// scale; the trees and rocks are plain placeholders (other artists design those).
import { Pix } from "../src/render/pix/pix.js";
import * as kit from "../src/render/pix/hall-kit.js";
import { frameAt } from "../src/render/pix/rig.js";
import { setDay, DAY } from "../src/data/sun.js";

export const W = 840, H = 560;
const SG = H + 48;                       // ground rows (a raised far edge still fills the top)
const RH = 58;                           // the road's half width (art px)
const hash = kit.hash, clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const ramp = (a) => a.map(hex);
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const vn = (x, y, seed = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const fbm = (x, y, seed = 0) => 0.55 * vn(x, y, seed) + 0.3 * vn(x * 2.1, y * 2.1, seed + 7) + 0.15 * vn(x * 4.3, y * 4.3, seed + 13);
const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));
const pick = (R, v, x, y) => R[clamp(Math.floor(v * (R.length - 1) + BAY[y & 3][x & 3]), 0, R.length - 1)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const PLUM = [42, 28, 44];

// ---- the chapters' colours (today's ramps, richer; never a new hue) ----
const CH = {
  green: {
    grass: ramp(["#2a6234", "#3c8434", "#56a434", "#78c03e", "#a2da58"]),
    lush: ramp(["#1d5432", "#2a6e36", "#3e8a38", "#5aa83c"]),
    dry: ramp(["#6c8a36", "#8eaa46", "#b2c25e", "#d4d47c"]),
    clover: ramp(["#174a36", "#225e3c", "#307446", "#438a4e"]),
    earth: ramp(["#3e2620", "#5c3a2a", "#7c5236", "#9c6e46", "#bc8e5e"]),
    road: ramp(["#7a5636", "#98703f", "#b88c52", "#cfa868", "#e2c486"]),
    rock: ramp(["#3e3a48", "#5c5a66", "#7e7c86", "#a2a0a4", "#c6c4be"]),
    leaf: ramp(["#173e2c", "#235a30", "#367a34", "#58a03a", "#8cc850"]),
    water: ramp(["#1c3656", "#28547a", "#4482ac", "#86bcd8", "#cfeaf2"]),
    wheat: ramp(["#7a5a26", "#a6802e", "#cca63c", "#e6c858", "#f6e48a"]),
    flowers: [[248, 246, 230], [250, 214, 70], [214, 120, 200], [230, 90, 70], [150, 150, 240]],
    heath: ramp(["#4a2e46", "#6a4268", "#8e5e8a", "#b482ae"]),
    stoneWall: ramp(["#4a4650", "#6c6870", "#908c90", "#b4b0aa"]),
    snow: false,
  },
  iron: {
    grass: ramp(["#26321f", "#34442a", "#465a34", "#5c7040", "#768a50"]),
    lush: ramp(["#1e2a1e", "#2a3a26", "#384c30", "#4a6038"]),
    dry: ramp(["#5a5a36", "#76744a", "#94905e", "#b2ac78"]),
    clover: ramp(["#1a2620", "#243428", "#304432", "#3e543c"]),
    earth: ramp(["#2e2420", "#46382e", "#5e4c3c", "#7a644e", "#988066"]),
    road: ramp(["#4e4a46", "#6c6760", "#8c867c", "#aca69a", "#ccc6b8"]),
    rock: ramp(["#2e2c34", "#4a4850", "#68666c", "#8a888a", "#acaaa4"]),
    leaf: ramp(["#16261e", "#203626", "#2e4a2e", "#466238", "#64804a"]),
    water: ramp(["#16243a", "#223a56", "#38607c", "#6a94aa", "#b4d0dc"]),
    wheat: ramp(["#6a5a30", "#8a7840", "#aa9652", "#c6b26a", "#e0cc88"]),
    flowers: [[230, 230, 220], [200, 180, 220], [180, 120, 190]],
    heath: ramp(["#34203a", "#4e3052", "#6c4470", "#8c5e8c", "#a87aa6"]),
    stoneWall: ramp(["#3e3c42", "#5a5860", "#7a787c", "#9e9a96", "#bcb8b0"]),
    paved: true,
  },
  fen: {
    grass: ramp(["#1a2820", "#26382a", "#344a32", "#46603c", "#5c764a"]),
    lush: ramp(["#14201a", "#1e3022", "#2a4028", "#3a5432"]),
    dry: ramp(["#4e5434", "#686c44", "#868856", "#a2a26c"]),
    clover: ramp(["#122018", "#1a2c20", "#243a28", "#304a30"]),
    earth: ramp(["#16100c", "#261c14", "#3a2c1e", "#50402c", "#6a5840"]),
    road: ramp(["#5e5442", "#7a6e56", "#988a6c", "#b4a684", "#ccc0a0"]),
    rock: ramp(["#2a2a30", "#44444a", "#606066", "#808080", "#a09e98"]),
    leaf: ramp(["#121c16", "#1c2c1e", "#283e26", "#3a5432", "#526c40"]),
    water: ramp(["#0c1616", "#14262a", "#22403c", "#3e6658", "#7a9e8a"]),
    wheat: ramp(["#5a5030", "#786a3c", "#968650", "#b4a46a", "#ccc088"]),
    flowers: [[230, 226, 210], [240, 200, 80], [170, 150, 210]],
    heath: ramp(["#2e2030", "#46304a", "#604464", "#7e5e80"]),
    stoneWall: ramp(["#34343a", "#4e4e54", "#6a6a6e", "#8a8a88"]),
    duck: ramp(["#3a5a22", "#56782c", "#749838", "#98b84c"]),
  },
  rime: {
    grass: ramp(["#7a84b0", "#9aa6d0", "#bcc6e6", "#dce4f4", "#f4f8fe"]),
    lush: ramp(["#6a74a2", "#8c98c4", "#aab6dc", "#c8d2ec"]),
    dry: ramp(["#a8b2d6", "#c6cee8", "#e0e6f6", "#fafcff"]),
    clover: ramp(["#5e6894", "#7480aa", "#8e9ac0", "#aab4d4"]),
    earth: ramp(["#2a2a3a", "#3e3e52", "#56586e", "#767a90", "#9aa0b4"]),
    road: ramp(["#545c8a", "#6c76a2", "#8690b8", "#a2aacc", "#bec4de"]),
    rock: ramp(["#22222e", "#363648", "#4e5064", "#6c7088", "#9096ac"]),
    leaf: ramp(["#142024", "#1e3032", "#2a443e", "#3e5c4e", "#5a7a62"]),
    water: ramp(["#14243c", "#1e3a5a", "#2e5a80", "#5a8ab0", "#a8d0e4"]),
    wheat: ramp(["#8a8a9a", "#a2a2b4", "#bcbccc", "#d6d6e2", "#eeeef6"]),
    flowers: [[250, 250, 255]],
    heath: ramp(["#4a4a66", "#5e5e7e", "#767696", "#9090ae"]),
    stoneWall: ramp(["#2e2e3c", "#46465a", "#606478", "#80869c"]),
    ice: ramp(["#4a78a0", "#6e9cc0", "#98c2dc", "#c4e2f0", "#ecf8fc"]),
    snow: true,
  },
};

// ---- the road: one curve for every scene ----
const ROAD_PTS = [[-40, 150], [150, 138], [292, 176], [372, 268], [420, 372], [530, 438], [690, 420], [880, 378]];
const roadSamples = () => {
  const P = ROAD_PTS, out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 120; k++) {
      const t = k / 120, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1]);
  let L = 0; const S = [{ x: out[0][0], s: out[0][1], t: 0 }];
  for (let i = 1; i < out.length; i++) { L += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]); S.push({ x: out[i][0], s: out[i][1], t: L }); }
  for (let i = 0; i < S.length; i++) { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)], l = Math.hypot(b.x - a.x, b.s - a.s) || 1; S[i].dx = (b.x - a.x) / l; S[i].ds = (b.s - a.s) / l; }
  S.len = L;
  return S;
};
const SAMP = roadSamples();
const roadAt = (t) => { let i = 0; while (i < SAMP.length - 1 && SAMP[i + 1].t < t) i++; return SAMP[i]; };

// the distance field: D (to the centre line), T (arc length there), SD (signed: + right of travel)
const field = (() => {
  const n = W * SG, D = new Float32Array(n).fill(999), T = new Float32Array(n), SD = new Float32Array(n);
  const R = 120;
  for (let i = 0; i < SAMP.length; i += 2) {
    const p = SAMP[i];
    for (let s = Math.max(0, Math.floor(p.s - R)); s < Math.min(SG, p.s + R); s++) for (let x = Math.max(0, Math.floor(p.x - R)); x < Math.min(W, p.x + R); x++) {
      const d = Math.hypot(x - p.x, s - p.s), k = s * W + x;
      if (d < D[k]) { D[k] = d; T[k] = p.t; SD[k] = (x - p.x) * -p.ds + (s - p.s) * p.dx; }
    }
  }
  return { D, T, SD };
})();

// ---- where things stand (same in every option) ----
const HALL = { x: 214, s: 318 };
const TREES = [{ x: 620, s: 262, r: 30 }, { x: 62, s: 318, r: 28 }, { x: 792, s: 552, r: 30 }];
const ROCKS = [{ x: 520, s: 300, r: 9 }, { x: 676, s: 520, r: 7 }, { x: 300, s: 470, r: 6 }];
const POND = { x: 120, s: 480, rx: 78, ry: 40 };

// ============================================================================================
export async function renderGround(opt, chap = "green", sun = "noon") {
  setDay(sun);
  const P = CH[chap], S = DAY;
  const fall = S.fall, slen = Math.max(0.45, S.len);
  const { D, T, SD } = field;
  const Z = new Float32Array(W * SG), M = new Uint8Array(W * SG);   // height, material id
  const MAT = { grass: 1, road: 2, bank: 3, water: 4, hedge: 5, crop: 6, plough: 7, hay: 8, pasture: 9, yard: 10, wall: 11, peat: 12, duck: 13, spoil: 14, mud: 15, cobble: 16, ditch: 17, track: 18, parade: 19, ice: 20, drift: 21, heath: 22, orchard: 23, tall: 24 };
  const zAt = (x, s) => Z[clamp(Math.round(s), 0, SG - 1) * W + clamp(Math.round(x), 0, W - 1)];
  const inHall = (x, s, r = 1) => ((x - HALL.x) / (40 * r)) ** 2 + ((s - HALL.s + 4) / (24 * r)) ** 2 < 1;
  const decor = [];      // standing things: { s, img, x, y } (x, y = screen anchor)
  const aux = {};        // per-option data for the painters

  // ===================== HEIGHT AND MATERIALS =====================
  // ---- A: terraces ----
  const scA = (x) => 178 + 34 * Math.sin(x / 110 + 0.5) + 16 * (fbm(x / 46, 3.3, 5) - 0.5);
  const scB = (x) => 386 + 28 * Math.sin(x / 150 + 2) + 14 * (fbm(x / 40, 9.1, 8) - 0.5) - 0.07 * x;
  const STEP1 = 30, STEP2 = 26;
  const pondR = (x, s) => { const u = (x - POND.x) / POND.rx, v = (s - POND.s) / POND.ry; return Math.hypot(u, v) * (0.85 + 0.3 * fbm(Math.atan2(v, u) * 1.6 + 4, 2, 23)); };
  const terrain = (x, s) => {
    let z = STEP1 * smooth((scA(x) - s) / 2.2 + 0.5) + STEP2 * smooth((scB(x) - s) / 2.2 + 0.5);
    z += 3 * (fbm(x / 90, s / 90, 2) - 0.5);
    if (chap === "rime") {
      for (const [sc, st] of [[scA(x), STEP1], [scB(x), STEP2]]) { const t = (s - sc - 1) / (10 + 14 * vn(x / 50, st, 9)); if (t > 0 && t < 1) z += st * 0.3 * (1 - t) ** 2; }
    }
    const pr = pondR(x, s);
    if (pr < 1.45) z -= 12 * smooth((1.45 - pr) / 0.6);
    return z;
  };
  let roadZ = null;
  if (opt === "A") {
    // the road's own height: the land under it, smoothed along its length into ramps
    const raw = SAMP.map((p) => terrain(p.x, p.s));
    roadZ = raw.map((_, i) => { let a = 0, n = 0; for (let j = i - 110; j <= i + 110; j += 3) { const q = raw[clamp(j, 0, raw.length - 1)]; a += q; n++; } return a / n; });
  }
  const roadZAt = (t) => { if (!roadZ) return 0; let i = 0; while (i < SAMP.length - 1 && SAMP[i + 1].t < t) i++; return roadZ[i]; };

  // ---- B: the field pattern (Voronoi cells, each a field with its own work and row angle) ----
  const FIELDS = [];
  if (opt === "B") {
    const kinds = {
      green: ["plough", "crop", "hay", "pasture", "orchard", "crop", "hay", "plough", "pasture", "hay", "crop"],
      iron: ["parade", "heath", "spoil", "pasture", "parade", "heath", "plough", "heath", "spoil", "pasture", "heath"],
      fen: ["peat", "duck", "pasture", "peat", "hay", "duck", "peat", "pasture", "duck", "hay", "peat"],
      rime: ["drift", "ice", "pasture", "drift", "spoil", "drift", "ice", "pasture", "drift", "spoil", "drift"],
    }[chap];
    const seeds = [[90, 60], [330, 70], [560, 90], [770, 160], [130, 290], [560, 250], [250, 430], [80, 520], [470, 540], [690, 500], [760, 300]];
    seeds.forEach(([x, s], i) => FIELDS.push({ x, s, kind: kinds[i], ang: hash(i, 3) * Math.PI, seed: i }));
    // the hall's yard sits in the field it stands in
  }
  const cellOf = (x, s) => {
    const wx = x + 14 * (fbm(x / 60, s / 60, 31) - 0.5), ws = s + 14 * (fbm(x / 60, s / 60, 37) - 0.5);
    let b1 = 1e9, b2 = 1e9, f1 = null;
    for (const f of FIELDS) { const d = Math.hypot(wx - f.x, ws - f.s); if (d < b1) { b2 = b1; b1 = d; f1 = f; } else if (d < b2) b2 = d; }
    return { f: f1, edge: (b2 - b1) / 2 };
  };

  // C's zones, by low-frequency noise (masses, not specks)
  if (opt === "C") {
    aux.zone = (x, s) => {
      const k = clamp(s, 0, SG - 1) * W + x, d = D[k];
      if (d < RH + 2) return "road";
      const a = fbm(x / 120, s / 120, 81), b = fbm(x / 70, s / 70, 82), c = fbm(x / 90, s / 90, 83);
      if (chap === "iron" && c > 0.64) return "heath";
      if (x < 95 + 30 * vn(s / 40, 2, 3) && chap === "green") return "bracken";
      if (a + 0.05 * hash(x >> 1, s >> 1, 84) > 0.6) return "tall";
      if (b < 0.36) return "clover";
      if (c > 0.63) return "flowers";
      if (a < 0.33) return "dry";
      return "meadow";
    };
  }

  for (let s = 0; s < SG; s++) for (let x = 0; x < W; x++) {
    const k = s * W + x, d = D[k];
    let z = 0, m = MAT.grass;
    if (opt === "A") {
      const zt = terrain(x, s), zr = roadZAt(T[k]), dz = zt - zr, bw = 3 + Math.abs(dz) * 0.3;
      const e = d - RH - 3;
      const w = e <= 0 ? 1 : 1 - smooth(e / bw);
      z = zr * w + zt * (1 - w);
      if (d < RH) m = MAT.road; else if (w > 0.04 && Math.abs(dz) > 2.5) m = MAT.bank;
      if (m !== MAT.road && pondR(x, s) < 1.0) { m = MAT.water; z = -6; }
      else if (m !== MAT.road && pondR(x, s) < 1.16) m = MAT.mud;
      if (inHall(x, s, 1.05) && m === MAT.grass) m = MAT.yard;
    } else if (opt === "B") {
      const verge = chap === "fen" ? 0 : 7;
      if (d < RH) m = MAT.road;
      else if (d < RH + verge) m = MAT.grass;
      else {
        const { f, edge } = cellOf(x, s);
        m = MAT[f.kind] || MAT.pasture;
        const hedge = edge < (chap === "fen" ? 3.5 : 3) && hash(Math.floor(x / 26), Math.floor(s / 26), f.seed) > 0.12;
        const byRoad = d < RH + verge + 6 && hash(Math.floor(T[k] / 40), SD[k] > 0 ? 1 : 2, 4) > 0.45;
        if (hedge || byRoad) {
          if (chap === "fen") { m = MAT.ditch; z = -3; }
          else if (chap === "iron" || chap === "rime") { m = MAT.wall; z = 6 + (hash(x >> 2, s >> 2, 9) > 0.5 ? 1 : 0); }
          else { m = MAT.hedge; z = 6 + 3 * fbm(x / 6, s / 6, 4); }
        } else if (m === MAT.crop) z = 3;
        else if (m === MAT.spoil) {
          // spoil heaps: tipped cones of rubble with a worn foot
          for (let i = 0; i < 7; i++) { const hx = f.x + (hash(i, f.seed, 51) - 0.5) * 170, hs = f.s + (hash(i, f.seed, 52) - 0.5) * 110, rad = 16 + 14 * hash(i, f.seed, 53); const r = Math.hypot((x - hx) / rad, (s - hs) / (rad * 0.8)) * (0.9 + 0.2 * fbm(x / 6, s / 6, i)); if (r < 1) z = Math.max(z, (14 + 10 * hash(i, f.seed, 54)) * (1 - r) ** 1.1); }
        }
        else if (m === MAT.peat) {
          const u = (x * Math.cos(f.ang) + s * Math.sin(f.ang)), v = (-x * Math.sin(f.ang) + s * Math.cos(f.ang));
          const cut = ((u % 40) + 40) % 40 < 16 && ((v % 70) + 70) % 70 < 52;
          if (cut) { z = -5; m = MAT.water; aux.peatW = 1; }
        }
        else if (m === MAT.drift) { z = 6 * smooth((fbm(x / 50, s / 22, f.seed) - 0.45) * 3); }
        if (chap === "fen" && d < RH + 3 + 10 && d >= RH) { m = MAT.bank; }
        if (inHall(x, s, 1.15)) { m = MAT.yard; z = 0; }
      }
      if (chap === "fen") { const e = d - RH - 3; z = d < RH + 3 ? 5 : e < 9 ? 5 * (1 - smooth(e / 9)) : z; }   // the causeway
      // the cart track: from the road's bend to a field gate
      if (false) {
        const tx = 470 + (s - 250) * 0.9 + 14 * Math.sin(s / 30), dtk = Math.abs(x - tx);
        if (s > 150 && s < 250 && d > RH - 2 && dtk < 7 && m !== MAT.wall && m !== MAT.hedge) { m = (dtk > 2.2 && dtk < 5.2) ? MAT.track : MAT.grass; z = 0; }
      }
    } else {
      // C: almost flat; low tussocky swells; a ditch along the lane's outer side
      z = 2.5 * (fbm(x / 70, s / 70, 6) - 0.5);
      if (d < RH) m = MAT.road;
      else if (aux.zone(x, s) === "tall" && !inHall(x, s, 1.3)) { m = MAT.tall; z += chap === "rime" ? 4 : 7; }
      const ditch = SD[k] < 0 && d > RH + 10 && d < RH + 16;
      if (ditch && chap !== "rime") { m = MAT.ditch; z = -3 + 1.5 * Math.abs(d - RH - 13) / 3; }
      if (chap === "rime" && d > RH + 4 && d < RH + 26) { z += 5 * smooth(1 - Math.abs(d - RH - 13) / 13) * (0.6 + 0.4 * vn(T[k] / 40, 1, 2)); m = MAT.drift; }
    }
    Z[k] = z; M[k] = m;
  }
  // the puddles (land holds water: in A the hollow; in B and C along the road's low spots)
  const PUD = [];
  if (opt === "C" || opt === "B") {
    const at = opt === "C" ? [[0.12, -0.55, 26, 11], [0.31, 0.2, 34, 15], [0.47, 0.75, 22, 9], [0.66, -0.35, 40, 14], [0.86, 0.6, 20, 9]] : [[0.31, 0.15, 18, 8], [0.66, -0.4, 22, 9]];
    for (const [f, off, rx, ry] of at) { const p = roadAt(f * SAMP.len); PUD.push({ x: p.x - p.ds * off * RH, s: p.s + p.dx * off * RH, rx, ry, seed: PUD.length }); }
  }
  const pudAt = (x, s) => {
    let best = 9;
    for (const p of PUD) { const u = (x - p.x) / p.rx, v = (s - p.s) / p.ry; const r = Math.hypot(u, v) * (0.82 + 0.36 * fbm(Math.atan2(v, u) * 1.3 + p.seed * 9, p.seed, 21)); if (r < best) best = r; }
    return best;
  };

  // ===================== GROUND PAINTERS =====================
  const grassTop = (x, s, z, k) => {
    const n1 = fbm(x / 64, s / 64, 1), n2 = fbm(x / 18, s / 18, 3), n3 = hash(x, s, 5);
    if (opt === "A") {
      // the higher the terrace, the drier its sward; the lower, the lusher; lit lips at the edges
      const lvl = z > STEP1 + STEP2 - 4 ? 2 : z > STEP2 - 4 ? 1 : 0;
      if (P.snow) {
        // wind-packed snow: long sastrugi streaks, blue in the lee of every rise
        const sg = fbm(x / 70, s / 9, 14), gs = zAt(x, s + 2) - zAt(x, s - 2), gx = zAt(x + 2, s) - zAt(x - 2, s);
        const lee = clamp((gx * fall[0] + gs * fall[1]) * 0.2, -0.55, 0.3);
        return pick(P.grass, clamp(0.58 + 0.1 * (lvl - 1) + 0.18 * (sg - 0.5) + 0.08 * (n2 - 0.5) + lee, 0, 1), x, s);
      }
      if (lvl === 2) return pick(P.grass, 0.64 + 0.22 * (n2 - 0.5) + 0.1 * (n1 - 0.5), x, s);
      if (lvl === 0) return pick(n1 > 0.6 ? P.clover : P.lush, 0.3 + 0.6 * n2, x, s);
      return pick(P.grass, 0.42 + 0.2 * n1 + 0.2 * (n2 - 0.5) + (n3 > 0.95 ? 0.15 : 0), x, s);
    }
    if (opt === "C") {
      const zone = aux.zone(x, s);
      if (zone === "clover") { const tre = ((x + (s & 1) * 2) % 4 === 0) && (s % 3 === 0); return pick(P.clover, 0.5 + 0.3 * n2 + (tre ? 0.3 : 0), x, s); }
      if (zone === "dry") return pick(P.dry, 0.25 + 0.6 * n2, x, s);
      if (zone === "bracken") return pick(P.lush, 0.2 + 0.4 * n2, x, s);
      if (zone === "heath") return pick(hash(x >> 1, s >> 1, 62) > 0.7 ? P.heath : P.lush, 0.25 + 0.4 * n2, x, s);
      return pick(P.grass, 0.32 + 0.4 * n1 + 0.2 * (n2 - 0.5), x, s);
    }
    return pick(P.grass, 0.35 + 0.35 * n1 + 0.2 * (n2 - 0.5), x, s);
  };
  const stripes = (x, s, f, period) => { const u = x * Math.cos(f.ang) + s * Math.sin(f.ang); return ((u % period) + period) % period / period; };
  const roadTop = (x, s, k) => {
    const n1 = fbm(x / 50, s / 50, 11), n2 = fbm(x / 9, s / 9, 12), d = D[k];
    const edge = smooth((d - RH + 8) / 8);
    if (P.paved || (opt === "B" && chap === "iron")) {
      // flags: rows across the road, each flag its own tone; a worn middle (lighter, no lanes)
      const t = T[k], sd = SD[k], row = Math.floor(t / 11), off = (row & 1) * 7, col = Math.floor((sd + 60 + off) / 14);
      const fu = ((t % 11) + 11) % 11, fv = (((sd + 60 + off) % 14) + 14) % 14;
      const joint = fu < 1 || fv < 1;
      const tone = 0.4 + 0.25 * hash(row, col, 3) + 0.15 * (n1 - 0.5) - 0.25 * edge;
      if (joint) return pick(P.road, Math.max(0, tone - 0.38), x, s);
      if (opt === "C" && hash(row, col, 8) > 0.95) return pick(P.grass, 0.3 + 0.3 * n2, x, s);      // moss in a sunk flag
      return pick(P.road, tone + (fu < 2 || fv < 2 ? 0.1 : 0), x, s);
    }
    let v = 0.55 + 0.22 * (n1 - 0.5) + 0.18 * (n2 - 0.5) - 0.3 * edge;
    if (opt === "C" && !P.snow) {
      // cobbled patches: rounded setts where the lane was mended
      const cb = fbm(x / 40, s / 40, 44);
      if (cb > 0.74 && d < RH - 8) {
        const cx = Math.floor(x / 6), cy = Math.floor((s + (cx & 1) * 2) / 5), u = x - cx * 6, w2 = (s + (cx & 1) * 2) - cy * 5;
        const gap = u === 0 || w2 === 0, lit = u === 1 || w2 === 1, dk = u === 5 || w2 === 4;
        return pick(P.road, gap ? 0 : lit ? 0.92 : dk ? 0.32 : 0.6 + 0.15 * hash(cx, cy, 2), x, s);
      }
      if (hash(x, s, 91) > 0.985) return pick(P.rock, 0.6, x, s);
    }
    if (hash(x >> 1, s >> 1, 77) > 0.992) v -= 0.25;
    return pick(P.road, v, x, s);
  };
  const top = (x, s, z) => {
    const k = clamp(s, 0, SG - 1) * W + x, m = M[k], n2 = fbm(x / 12, s / 12, 3);
    switch (m) {
      case MAT.road: return roadTop(x, s, k);
      case MAT.bank: {
        // a cutting or embankment side: grass where it is gentle, raw earth where steep
        const gx = zAt(x + 1, s) - zAt(x - 1, s), gs = zAt(x, s + 1) - zAt(x, s - 1), sl = Math.hypot(gx, gs);
        if (chap === "fen") return pick(P.grass, 0.25 + 0.4 * n2, x, s);
        if (sl > 1.6 && fbm(x / 10, s / 10, 15) > 0.45) return pick(P.snow ? P.rock : P.earth, 0.4 + 0.3 * n2, x, s);
        return pick(P.snow ? P.grass : P.lush, 0.35 + 0.45 * n2, x, s);
      }
      case MAT.water: {
        // placeholder water (the water artist designs the real surface): sky in it, a dark rim
        const r = opt === "A" ? pondR(x, s) : 0.5;
        if (P.snow) { const cr = Math.abs(fbm(x / 22, s / 22, 71) - 0.5) < 0.015; return pick(P.ice, cr ? 0.95 : 0.25 + 0.35 * (1 - smooth((r - 0.3) / 0.7)) + 0.1 * (n2 - 0.5), x, s); }
        if (chap === "fen" || aux.peatW) return pick(P.water, 0.25 + 0.3 * n2 + (hash(x, s, 4) > 0.97 ? 0.3 : 0), x, s);
        return pick(P.water, 0.75 - 0.45 * smooth((r - 0.6) / 0.6) + 0.1 * (n2 - 0.5), x, s);
      }
      case MAT.yard: {
        // the hall's footing: trampled to bare earth in the middle, worn grass round it
        const r = Math.hypot((x - HALL.x) / 40, (s - HALL.s + 4) / 24);
        if (P.snow) return pick(P.road, 0.5 + 0.3 * n2, x, s);
        if (r < 0.78 || hash(x, s, 6) > 0.4 + 0.6 * (r - 0.78) / 0.3) return pick(opt === "B" && chap === "iron" ? P.road : P.earth, 0.55 + 0.25 * (n2 - 0.5) + (hash(x, s, 7) > 0.9 ? 0.2 : 0), x, s);
        return pick(P.grass, 0.25 + 0.3 * n2, x, s);
      }
      case MAT.hedge: { const v = 0.3 + 0.5 * fbm(x / 4, s / 4, 17) + (z > 7.5 ? 0.2 : 0); return pick(P.leaf, v, x, s); }
      case MAT.wall: { const bx = Math.floor((x + (Math.floor(s / 3) & 1) * 2) / 4); return pick(P.stoneWall, 0.45 + 0.4 * hash(bx, s / 3 | 0, 2) + ((x + (Math.floor(s / 3) & 1) * 2) % 4 === 0 ? -0.3 : 0), x, s); }
      case MAT.crop: {
        const f = cellOf(x, s).f, u = stripes(x, s, f, 4);
        const head = hash(x, s, 23) > 0.55;
        return pick(P.wheat, u < 0.25 ? 0.15 : 0.5 + (head ? 0.4 : 0) + 0.15 * (n2 - 0.5), x, s);
      }
      case MAT.plough: {
        const f = cellOf(x, s).f, u = stripes(x, s, f, 5);
        return pick(P.earth, u < 0.35 ? 0.2 : u < 0.55 ? 0.75 : 0.5 + 0.1 * (n2 - 0.5), x, s);
      }
      case MAT.hay: {
        const f = cellOf(x, s).f, u = stripes(x, s, f, 26);
        if (u > 0.47 && u < 0.53) return pick(P.dry, 0.7 + 0.3 * hash(x, s, 2), x, s);          // the windrow
        return pick(P.grass, (u < 0.5 ? 0.6 : 0.48) + 0.12 * (n2 - 0.5), x, s);
      }
      case MAT.pasture: {
        // cropped short, crossed by sheep tracks (worn lines along the slope's contours)
        const c = fbm(x / 45, s / 45, 51) * 9, tr = Math.abs(c - Math.round(c));
        if (tr < 0.03 && hash(x >> 2, s >> 2, 3) > 0.3) return pick(P.snow ? P.road : P.dry, 0.55, x, s);
        return pick(P.grass, 0.5 + 0.25 * (n2 - 0.5), x, s);
      }
      case MAT.orchard: {
        const xo = x - ((Math.floor((s + 6) / 40)) & 1) * 23, u = ((xo - 20) % 46 + 46) % 46 - 23, v = ((s - 14) % 40 + 40) % 40 - 20 + 6, r = Math.hypot(u / 14, v / 9);
        return pick(P.grass, r < 1 ? 0.62 : 0.4 + 0.15 * (n2 - 0.5), x, s);
      }
      case MAT.parade: {
        // drilled earth: raked lines and the files' trampled lanes
        const f = cellOf(x, s).f, u = stripes(x, s, f, 9), v = stripes(x, s, { ang: f.ang + Math.PI / 2 }, 12);
        return pick(P.earth, 0.55 + (u < 0.12 ? -0.25 : 0) + (v < 0.1 && hash(x, s, 2) > 0.5 ? -0.15 : 0) + 0.1 * (n2 - 0.5), x, s);
      }
      case MAT.heath: return pick(hash(x >> 1, s >> 1, 61) > 0.86 ? P.heath : P.grass, 0.3 + 0.4 * n2, x, s);
      case MAT.spoil: return pick(z > 1 ? P.rock : P.earth, 0.4 + 0.3 * hash(x >> 1, s >> 1, 9) + (z > 1 ? 0.05 : -0.1), x, s);
      case MAT.peat: return pick(P.earth, 0.35 + 0.3 * n2, x, s);
      case MAT.duck: {
        // duckweed channels: straight dykes of green scum with a dark open lead down the middle
        const f = cellOf(x, s).f, u = stripes(x, s, f, 30);
        if (u < 0.2) return pick(u > 0.07 && u < 0.13 ? P.water : P.duck, 0.3 + 0.5 * hash(x, s, 3), x, s);
        return pick(P.grass, 0.35 + 0.3 * n2, x, s);
      }
      case MAT.ditch: return pick(P.water, 0.35 + 0.2 * n2 + (hash(x, s, 4) > 0.95 ? 0.3 : 0), x, s);
      case MAT.tall: {
        // the top of a stand of tall grass: a mat of lit blade tips over dark gaps
        const b = hash(x, s, 31), lean = ((x + (s >> 1)) % 3 === 0);
        if (P.snow) return pick(P.dry, 0.3 + 0.5 * b, x, s);
        return pick(b > 0.93 ? P.dry : P.grass, b < 0.2 ? 0.12 : b > 0.8 ? 0.85 : 0.45 + 0.2 * (n2 - 0.5), x, s);
      }
      case MAT.mud: return pick(P.snow ? P.road : P.earth, 0.2 + 0.25 * n2 + (hash(x, s, 8) > 0.9 ? 0.25 : 0), x, s);
      case MAT.track: return pick(P.snow ? P.road : P.earth, 0.6 + 0.2 * (n2 - 0.5), x, s);
      case MAT.drift: return pick(P.snow ? P.dry : P.grass, 0.4 + 0.4 * n2, x, s);
      case MAT.ice: { const cr = Math.abs(fbm(x / 30, s / 30, 71) - 0.5) < 0.012; return pick(P.ice, cr ? 0.95 : 0.35 + 0.3 * n2, x, s); }
      default: return grassTop(x, s, z, k);
    }
  };
  // a face: the land stepping down toward the viewer
  const face = (x, s, zf, depth, toFoot) => {
    const m = M[clamp(s, 0, SG - 1) * W + x];
    if (m === MAT.hedge) return pick(P.leaf, 0.15 + 0.35 * fbm(x / 3, zf / 3, 3) - (depth > 4 ? 0.15 : 0), x, Math.round(zf));
    if (m === MAT.wall) return pick(P.stoneWall, 0.25 + 0.45 * hash(Math.floor((x + (Math.floor(zf / 3) & 1) * 2) / 4), Math.floor(zf / 3), 4) - ((x + (Math.floor(zf / 3) & 1) * 2) % 4 === 0 || Math.round(zf) % 3 === 0 ? 0.25 : 0), x, Math.round(zf));
    if (m === MAT.tall) {
      // the stand's front: blades side by side, tips catching the light, dark at the roots
      const tip = 1 + Math.floor(3 * hash(x, 7, 2)), b = hash(x, 9, 3);
      if (P.snow) return pick(P.dry, depth < tip ? 0.85 : 0.35 - 0.04 * depth, x, Math.round(zf));
      if (depth < tip) return pick(b > 0.7 ? P.dry : P.grass, 0.9, x, Math.round(zf));
      return pick(P.lush, clamp(0.55 - 0.1 * depth + (b > 0.6 ? 0.15 : 0) - (x % 2 ? 0.08 : 0), 0, 1), x, Math.round(zf));
    }
    if (m === MAT.crop) return pick(P.wheat, 0.2 + 0.4 * hash(x, 0, 2) - depth * 0.05, x, Math.round(zf));
    if (m === MAT.road && chap === "fen") return pick(P.rock, 0.3 + 0.4 * hash(Math.floor((x + (Math.floor(zf / 3) & 1) * 3) / 6), Math.floor(zf / 3), 4), x, Math.round(zf));
    if (m === MAT.drift || (P.snow && opt !== "A")) {
      if (opt === "A") {
        // wind-scoured rock under a snow cornice
        if (depth < 2) return pick(P.dry, 0.8, x, Math.round(zf));
        return pick(P.rock, 0.3 + 0.35 * fbm(x / 5, zf / 2, 3) + (Math.round(zf) % 5 === 0 ? -0.15 : 0), x, Math.round(zf));
      }
      return pick(P.grass, 0.25 + 0.3 * fbm(x / 6, zf, 3), x, Math.round(zf));
    }
    if (m === MAT.spoil) return pick(P.rock, 0.2 + 0.4 * hash(x >> 1, zf >> 1, 4), x, Math.round(zf));
    // earth or rock scarp: a grass lip, strata, stones in it, a damp foot
    const rocky = chap === "iron" || chap === "rime";
    const drip = Math.floor(1 + 3 * hash(x >> 2, 3, 1) ** 4);
    if (!rocky && depth < 2) return pick(P.grass, depth ? 0.45 : 0.8, x, Math.round(zf));
    if (!rocky && depth < 2 + drip && hash(x >> 1, 5, 1) > 0.5) return pick(P.lush, 0.35 - 0.1 * (depth - 2), x, Math.round(zf));      // the turf's lip hanging over
    if (toFoot < 2) return pick(P.earth, 0.12, x, Math.round(zf));                                                               // the damp foot
    const st = Math.sin(zf * 0.9 + 1.5 * fbm(x / 40, 1, 2)) > 0.55;
    if (rocky) {
      // a crag: blocky facets (jittered cells), each turned its own way to the light, dark fissures between
      const gx0 = Math.floor(x / 15), gz0 = Math.floor(zf / 9);
      let b1 = 1e9, b2 = 1e9, id = 0, cxz = null;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const cx = (gx0 + a) * 15 + 15 * hash(gx0 + a, gz0 + b, 41), cz = (gz0 + b) * 9 + 9 * hash(gx0 + a, gz0 + b, 42);
        const dd = Math.hypot((x - cx) / 1.3, zf - cz);
        if (dd < b1) { b2 = b1; b1 = dd; id = (gx0 + a) * 131 + gz0 + b; cxz = [cx, cz]; } else if (dd < b2) b2 = dd;
      }
      if (P.snow && (depth < 2 + 2 * hash(gx0, 5) || (b2 - b1 < 2.2 && zf > cxz[1] && hash(id, 7) > 0.5))) return pick(P.grass, depth < 1 ? 1 : 0.8, x, Math.round(zf));   // the cornice; snow lodged on the ledges
      if (b2 - b1 < 1.4) return pick(P.rock, 0.06, x, Math.round(zf));
      const turn = hash(id, 3), up = (zf - cxz[1]) / 9, side = (cxz[0] - x) / 15 * (turn - 0.5) * 2;
      return pick(P.rock, clamp(0.3 + 0.3 * turn + 0.3 * up + 0.2 * side + (depth < 1 ? 0.35 : 0) + (hash(x, zf, 6) > 0.93 ? 0.12 : 0), 0, 1), x, Math.round(zf));
    }
    // a stone bedded in the earth: lit top, dark under
    const sx = Math.floor(x / 6), sz = Math.floor(zf / 5), sh2 = hash(sx, sz, 9);
    if (sh2 > 0.8) {
      const cx = sx * 6 + 3, cz = sz * 5 + 2.5, u = (x - cx) / 2.8, v = (zf - cz) / 2.1;
      if (u * u + v * v < 1) return pick(P.rock, v > 0.3 ? 0.85 : v < -0.4 ? 0.2 : 0.55, x, Math.round(zf));
    }
    return pick(P.earth, 0.6 + 0.12 * fbm(x / 26, zf / 3, 6) + (st ? 0.2 : 0) - (depth < 5 ? 0.14 : 0), x, Math.round(zf));
  };

  // ===================== DRAW THE GROUND (front to back per column) =====================
  const isFace = new Uint8Array(W * H), fNx = new Float32Array(W * H);
  const buf = new Float32Array(W * H * 3), sAt = new Int16Array(W * H).fill(-1), zScr = new Float32Array(W * H);
  const put = (x, y, c, a = 1) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 3; buf[o] += (c[0] - buf[o]) * a; buf[o + 1] += (c[1] - buf[o + 1]) * a; buf[o + 2] += (c[2] - buf[o + 2]) * a; };
  for (let x = 0; x < W; x++) {
    let ymin = H, zPrev = 0;
    for (let s = SG - 1; s >= 0; s--) {
      const z = Z[s * W + x], y = Math.round(s - z);
      if (y < ymin) {
        const steep = ymin - y >= 3 && ymin < H;
        if (y >= 0 && y < H && steep) { isFace[y * W + x] = 1; fNx[y * W + x] = 0.88; sAt[y * W + x] = s; zScr[y * W + x] = z; }
        else if (y >= 0 && y < H) {
          let c = top(x, s, z);
          // the slope's light: land rising away from the sun faces it
          const gx = clamp(zAt(x + 1, s) - zAt(x - 1, s), -3, 3), gs = clamp(zAt(x, s + 1) - zAt(x, s - 1), -3, 3);
          const lit = clamp((gx * fall[0] + gs * fall[1]) * 0.12, -0.3, 0.3);
          // the lip: the top edge of a step toward the viewer catches the light
          const lip = (zAt(x, s + 2) < z - 4) ? 0.12 : 0;
          c = c.map((v) => v * (1 + lit + lip));
          put(x, y, c); sAt[y * W + x] = s; zScr[y * W + x] = z;
        }
        for (let yy = y + 1; yy < ymin && yy < H; yy++) {
          if (yy < 0) continue;
          if (ymin - y <= 2) { put(x, yy, top(x, s, z)); sAt[yy * W + x] = s; zScr[yy * W + x] = z; continue; }
          const zf = s - yy;
          isFace[yy * W + x] = 1; fNx[yy * W + x] = 0;
          let c = [0, 0, 0];
          // a face turns to the light by the way its edge runs
          const gx = zAt(x + 2, s) - zAt(x - 2, s), gs = Math.max(0.5, zAt(x, s - 1) - zAt(x, s + 2));
          const nx = -gx / Math.hypot(gx, gs), turn = clamp(-nx * Math.sign(fall[0]) * 0.25, -0.2, 0.2);
          const shadeK = 0.88 - (S.on ? 0.1 * (1 - S.elev) : 0) + turn;
          fNx[yy * W + x] = shadeK;
          sAt[yy * W + x] = s; zScr[yy * W + x] = zf;
        }
        ymin = y;
      }
      zPrev = z;
    }
  }

  // the faces, run by run down each column: depth = rows below the run's top edge
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    if (!isFace[y * W + x] || (y > 0 && isFace[(y - 1) * W + x])) continue;
    let y1 = y; while (y1 + 1 < H && isFace[(y1 + 1) * W + x]) y1++;
    for (let yy = y; yy <= y1; yy++) { const k = yy * W + x, c = face(x, sAt[k], zScr[k], yy - y, y1 - yy); put(x, yy, c.map((v) => v * fNx[k])); }
  }

  // ===================== CAST SHADOWS =====================
  const shade = new Float32Array(W * H);
  // the land on itself: march toward the sun
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = sAt[y * W + x]; if (s < 0 || isFace[y * W + x]) continue;
    const z0 = zScr[y * W + x];
    for (let k = 1; k < 90; k++) {
      const px = x - fall[0] * k, ps = s - fall[1] * k, h = z0 + k / slen;
      if (px < 0 || ps < 0) break;
      if (h > 40) break;
      if (zAt(px, ps) > h + 0.5) { shade[y * W + x] = 1; break; }
    }
  }

  // ===================== THE STANDING THINGS =====================
  const sprite = (w, h, ox, oy) => ({ w, h, ox, oy, data: new Uint8ClampedArray(w * h * 4) });
  const sput = (sp, i, j, c, a = 255) => { if (i < 0 || j < 0 || i >= sp.w || j >= sp.h) return; const o = (j * sp.w + i) * 4; sp.data[o] = c[0]; sp.data[o + 1] = c[1]; sp.data[o + 2] = c[2]; sp.data[o + 3] = a; };
  const outline = (sp, k = 0.5) => {
    const a = (i, j) => (i < 0 || j < 0 || i >= sp.w || j >= sp.h ? 0 : sp.data[(j * sp.w + i) * 4 + 3]);
    const out = new Uint8ClampedArray(sp.data);
    for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) {
      if (!a(i, j)) continue;
      const lit = !a(i - 1, j) || !a(i, j - 1), dark = !a(i + 1, j) || !a(i, j + 1);
      if (!lit && !dark) continue;
      const o = (j * sp.w + i) * 4, t = dark ? k : k * 0.45;
      for (let c = 0; c < 3; c++) out[o + c] = sp.data[o + c] + (PLUM[c] - sp.data[o + c]) * t;
    }
    sp.data = out; return sp;
  };
  const L3 = (() => { const l = DAY.on ? DAY.L : [-0.6, -0.62, 0.5], n = Math.hypot(...l); return l.map((v) => v / n); })();
  // a placeholder tree: trunk and a few lit lumps of leaf
  const tree = (r, seed) => {
    const sp = sprite(r * 3, r * 4, Math.round(r * 1.5), r * 4 - 2);
    const tw = Math.max(3, r / 6 | 0);
    for (let j = 0; j < r * 1.4; j++) for (let i = -tw; i <= tw; i++) sput(sp, sp.ox + i, sp.oy - j, pick(P.earth, 0.35 + (i < 0 ? 0.2 : 0), i, j));
    const lumps = [[0, -r * 1.9, r * 0.95], [-r * 0.6, -r * 1.55, r * 0.7], [r * 0.6, -r * 1.5, r * 0.72], [0, -r * 2.55, r * 0.65]];
    for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) {
      let best = null;
      for (const [lx, ly, lr] of lumps) { const dx = (i - sp.ox - lx) / lr, dy = (j - sp.oy - ly) / lr, q = dx * dx + dy * dy; if (q < 1) { const nz = Math.sqrt(1 - q); const v = dx * L3[0] + dy * L3[1] + nz * L3[2]; if (!best || ly + dy * lr > best.y) best = { v, y: ly + dy * lr }; } }
      if (best) sput(sp, i, j, pick(P.leaf, clamp(0.25 + best.v * 0.7 + 0.15 * (hash(i >> 1, j >> 1, seed) - 0.5), 0, 1), i, j));
    }
    return outline(sp);
  };
  const rock = (r, seed) => {
    const sp = sprite(r * 2 + 4, r * 2, r + 2, r * 2 - 2);
    for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) {
      const dx = (i - sp.ox) / r, dy = (j - sp.oy + r * 0.55) / (r * 0.6);
      const q = dx * dx + dy * dy * (dy < 0 ? 1 : 2.4) + 0.25 * (hash(i >> 1, j >> 1, seed) - 0.5); if (q > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - q)), v = dx * L3[0] + dy * L3[1] + nz * L3[2];
      sput(sp, i, j, pick(P.rock, clamp(0.3 + v * 0.65, 0, 1), i, j));
    }
    return outline(sp);
  };
  // a tuft of tall grass: blades from one root, tips lit; ph = the sway phase (0..1)
  const tuft = (seed, ph = 0, big = 1, dryK = 0) => {
    const h = Math.round((9 + 5 * hash(seed, 1)) * big), sp = sprite(17, h + 2, 8, h + 1), n = 5 + (hash(seed, 2) * 5 | 0);
    for (let b = 0; b < n; b++) {
      const bx = (hash(seed, b, 3) - 0.5) * 8, bh = h * (0.55 + 0.45 * hash(seed, b, 4)), lean = (hash(seed, b, 5) - 0.5) * 1.2 + 0.5 * Math.sin((ph + b * 0.07) * Math.PI * 2);
      const dry = hash(seed, b, 6) < dryK;
      for (let j = 0; j <= bh; j++) {
        const f = j / bh, xx = Math.round(sp.ox + bx + lean * f * f * 4), yy = sp.oy - j;
        const R = dry ? P.dry : P.grass, v = f < 0.3 ? 0.1 : f < 0.7 ? 0.45 + (bx < 0 ? 0.15 : 0) : 0.85;
        sput(sp, xx, yy, pick(R, v, xx, yy));
      }
    }
    return sp;
  };
  const fern = (seed) => {           // bracken: a spray of fronds; one in four already rusted
    const sp = sprite(27, 16, 13, 15), rust = hash(seed, 9) > 0.72;
    for (let f = 0; f < 5; f++) {
      const a = -Math.PI / 2 + (f - 2) * 0.5 + (hash(seed, f) - 0.5) * 0.25, len = 10 + 4 * hash(seed, f, 2);
      for (let k = 0; k < len; k++) {
        const x = sp.ox + Math.cos(a) * k * 1.1, y = sp.oy + Math.sin(a) * k * 0.7 + (k / len) ** 2 * 3 - 1;
        sput(sp, Math.round(x), Math.round(y), rust ? pick(P.earth, 0.3, 0, 0) : pick(P.lush, 0.15, 0, 0));
        if (k > 1) for (const sd of [-1, 1]) { const ln = 2.5 * (1 - k / len) + 0.6; for (let q = 1; q <= ln; q++) { const px = Math.round(x + Math.cos(a + sd * 1.3) * q), py = Math.round(y + Math.sin(a + sd * 1.3) * q * 0.7 + 0.5); sput(sp, px, py, rust ? pick(P.earth, sd < 0 ? 0.9 : 0.65, px, py) : pick(P.lush, sd < 0 ? 0.95 : 0.6, px, py)); } }
      }
    }
    return outline(sp, 0.3);
  };
  const spike = (col) => {           // foxglove / reedmace: a tall stem of bells
    const sp = sprite(5, 16, 2, 15);
    for (let j = 0; j < 15; j++) sput(sp, 2, 15 - j, pick(P.lush, 0.4, 0, j));
    for (let j = 5; j < 15; j += 2) { sput(sp, 1, 15 - j, mix(col, PLUM, 0.25)); sput(sp, 3, 15 - j, col); }
    return sp;
  };
  const heather = (seed) => {        // a cushion of heather
    const sp = sprite(14, 8, 7, 7);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 14; i++) { const dx = (i - 7) / 6.5, dy = (j - 5) / 4; if (dx * dx + dy * dy > 1 + 0.3 * (hash(i, j, seed) - 0.5)) continue; const v = 0.3 + 0.5 * (-dx * 0.4 - dy * 0.6) + 0.3 * hash(i, j, seed + 1); sput(sp, i, j, pick(hash(i >> 1, j >> 1, seed) > 0.25 ? P.heath : P.dry, clamp(v, 0, 1), i, j)); }
    return outline(sp, 0.35);
  };
  const sheep = (seed) => {
    const sp = sprite(10, 8, 5, 7);
    for (let j = 1; j < 6; j++) for (let i = 1; i < 9; i++) { const dx = (i - 4.5) / 3.8, dy = (j - 3.5) / 2.6; if (dx * dx + dy * dy <= 1) sput(sp, i, j, mix([236, 232, 218], PLUM, j > 4 ? 0.2 : i > 6 ? 0.08 : 0)); }
    const hd = hash(seed, 1) > 0.5 ? 8 : 1; sput(sp, hd, 2, [52, 40, 40]); sput(sp, hd, 3, [52, 40, 40]);
    for (const lx of [3, 6]) sput(sp, lx, 6, [52, 40, 40]);
    return outline(sp, 0.35);
  };
  const post = (h = 7) => { const sp = sprite(3, h + 1, 1, h); for (let j = 0; j < h; j++) { sput(sp, 1, h - j, pick(P.earth, 0.6, 0, j)); sput(sp, 0, h - j, pick(P.earth, 0.4, 0, j)); } return sp; };
  const reed = (seed) => { const sp = sprite(9, 15, 4, 14); for (let b = 0; b < 6; b++) { const bx = Math.round((hash(seed, b) - 0.5) * 7), bh = 8 + hash(seed, b, 2) * 6; for (let j = 0; j < bh; j++) sput(sp, sp.ox + bx + (j > bh * 0.7 ? Math.sign(bx) : 0), sp.oy - j, pick(j > bh - 3 ? P.dry : P.grass, j < 3 ? 0.1 : 0.55, 0, j)); if (hash(seed, b, 3) > 0.6) for (let j = 0; j < 3; j++) sput(sp, sp.ox + bx, sp.oy - bh + 4 + j, pick(P.earth, 0.3, 0, 0)); } return sp; };
  const scrAt = (x, s) => [Math.round(x), Math.round(s - zAt(x, s))];
  const add = (img, x, s, o = {}) => { const [sx, sy] = scrAt(x, s); decor.push({ img, sx, sy, s: s + (o.ds || 0), shadow: o.shadow !== false, flat: o.flat }); };

  // placeholders: trees and rocks
  TREES.forEach((t, i) => add(tree(t.r, i), t.x, t.s));
  ROCKS.forEach((r, i) => add(rock(r.r, i), r.x, r.s));

  // ---- option dressing ----
  const freeAt = (x, s, pad = 0) => {
    const k = clamp(Math.round(s), 0, SG - 1) * W + clamp(Math.round(x), 0, W - 1);
    if (D[k] < RH + 4 + pad) return false;
    if (inHall(x, s, 1.25)) return false;
    for (const r of ROCKS) if (Math.hypot(x - r.x, (s - r.s) * 1.5) < r.r + 7) return false;
    for (const t of TREES) if (Math.hypot(x - t.x, (s - t.s) * 1.6) < t.r * 0.7) return false;
    return true;
  };
  if (opt === "C") {
    const PH = aux.ph || 0;
    for (let s = 4; s < SG - 2; s += 3) for (let x = 2; x < W - 2; x += 3) {
      const jx = x + Math.round((hash(x, s, 1) - 0.5) * 3), js = s + Math.round((hash(x, s, 2) - 0.5) * 2);
      if (!freeAt(jx, js)) continue;
      if (pudAt(jx, js) < 1.5) continue;
      const k = js * W + jx; if (M[k] === MAT.ditch) continue;
      const zone = aux.zone(jx, js), r = hash(jx, js, 3);
      if (zone === "tall" && aux.zone(jx, js + 5) !== "tall" && r > 0.4) add(tuft((jx * 7 + js * 13) % 97, PH, 1, chap === "rime" ? 0.9 : 0.08), jx, js);
      else if (zone === "bracken" && chap === "green" && hash(jx, js, 77) > 0.92) add(fern(jx + js), jx, js);
      else if (zone === "heath" && r > 0.62) add(heather(jx + js), jx, js);
      else if (zone === "meadow" && r > 0.93) add(tuft((jx * 3 + js) % 97, PH, 0.6, 0.3), jx, js);
      else if (zone === "dry" && r > 0.9) add(tuft((jx + js * 5) % 97, PH, 0.7, 0.85), jx, js);
      else if (zone === "flowers" && r > 0.965 && chap === "green") add(spike(hash(jx, js, 9) > 0.5 ? [196, 96, 190] : [240, 236, 222]), jx, js);
      // reeds and rushes by the ditch
      else if (chap !== "rime" && D[k] > RH + 16 && D[k] < RH + 24 && SD[k] < 0 && r > 0.55) add(reed(jx + js), jx, js);
      if (chap === "fen" && r > 0.985) add(reed(jx * 3 + js), jx, js);
    }
    // the hall's footing: a ring of flattened grass round its trampled yard
    for (let a = 0; a < 40; a++) { const ang = (a / 40) * Math.PI * 2, x = HALL.x + Math.cos(ang) * 47, s = HALL.s - 4 + Math.sin(ang) * 29; if (freeAt(x, s, -6) || D[Math.round(s) * W + Math.round(x)] > RH) add(tuft(a + 40, 0.25, 0.5, 0.5), x, s); }
  }
  if (opt === "B") {
    for (const f of FIELDS) {
      if (f.kind === "orchard") for (let s = 14; s < SG; s += 40) for (let x = 20; x < W; x += 46) { const xx = x + ((s / 40 | 0) & 1) * 23, c = cellOf(xx, s); if (c.f === f && c.edge > 12 && freeAt(xx, s, 8) && !inHall(xx, s, 1.7)) add(tree(12, xx + s), xx, s); }
      if (f.kind === "pasture") for (let i = 0; i < 7; i++) { const x = f.x + (hash(i, f.seed) - 0.5) * 140, s = f.s + (hash(i, f.seed, 2) - 0.5) * 90; const c = cellOf(x, s); if (c.f === f && c.edge > 6 && freeAt(x, s, 4)) add(chap === "fen" ? reed(i) : sheep(i), x, s); }
      if (f.kind === "heath" || (f.kind === "drift" && false)) for (let i = 0; i < 40; i++) { const x = f.x + (hash(i, f.seed, 4) - 0.5) * 180, s = f.s + (hash(i, f.seed, 5) - 0.5) * 120; const c = cellOf(x, s); if (c.f === f && c.edge > 5 && freeAt(x, s, 2)) add(heather(i), x, s); }
      if (f.kind === "hay") for (let i = 0; i < 4; i++) { const x = f.x + (hash(i, f.seed, 6) - 0.5) * 120, s = f.s + (hash(i, f.seed, 7) - 0.5) * 70; const c = cellOf(x, s); if (c.f === f && c.edge > 8 && freeAt(x, s, 4)) add(rock(5, 99 + i), x, s); }
      if (f.kind === "peat") for (let i = 0; i < 10; i++) { const x = f.x + (hash(i, f.seed, 8) - 0.5) * 150, s = f.s + (hash(i, f.seed, 9) - 0.5) * 90; const k = clamp(Math.round(s), 0, SG - 1) * W + clamp(Math.round(x), 0, W - 1); const c = cellOf(x, s); if (c.f === f && M[k] !== MAT.water && freeAt(x, s, 4)) add(rock(4, 300 + i), x, s); }
    }
    // a post-and-rail fence along the road where no hedge is
    if (chap === "green") for (let t = 10; t < SAMP.len; t += 12) { const p = roadAt(t); for (const sd of [-1]) { const x = p.x - p.ds * sd * (RH + 10), s = p.s + p.dx * sd * (RH + 10); const k = clamp(Math.round(s), 0, SG - 1) * W + clamp(Math.round(x), 0, W - 1); if (M[k] === MAT.hedge || !freeAt(x, s, 0) || hash(t, 3) < 0.35) continue; add(post(), x, s, { shadow: true }); } }
  }

  // the hall, level 3, with its crew
  const hallMod = await import("../src/render/pix/hall-archer.js");
  const hb = kit.bakeHall(hallMod.BOX, hallMod.build({ level: 3, style: "B", seed: 0 }), { sun: DAY.on ? DAY.L : undefined });
  const lay2 = (img) => ({ w: img.w, h: img.h, ox: hallMod.BOX.ox, oy: hallMod.BOX.oy, data: img.data });
  const hallBack = lay2(hb.back);
  const fig = await import("../src/render/pix/fig-bowman.js");
  const crewImgs = [];
  for (const c of [...(hb.spec.crew || [])].sort((a, b) => a.y - b.y)) {
    const F = frameAt(fig.CLIPS.idle, 0, fig.BONES), p = new Pix(fig.BOX.w, fig.BOX.h, fig.BOX.ox, fig.BOX.oy);
    fig.draw(p, F, { flip: false, variant: c.variant || "" });
    const im = p.resolve({ flip: false }); crewImgs.push({ img: { w: im.w, h: im.h, ox: fig.BOX.ox - c.x, oy: fig.BOX.oy - c.y, data: im.data } });
  }
  add(hallBack, HALL.x, HALL.s, { ds: 0 });
  crewImgs.forEach((c) => add(c.img, HALL.x, HALL.s, { ds: 0.1, shadow: false }));
  if (hb.front) add(lay2(hb.front), HALL.x, HALL.s, { ds: 0.2, shadow: false });

  // figures on the road: goblins marching east, garrison knights holding them
  const gob = await import("../src/render/pix/fig-goblin.js"), kn = await import("../src/render/pix/fig-garrison.js");
  const figAt = (F0, clip, f, flip, variant) => {
    const F = frameAt(F0.CLIPS[clip], f, F0.BONES), p = new Pix(F0.BOX.w, F0.BOX.h, F0.BOX.ox, F0.BOX.oy);
    F0.draw(p, F, { flip, variant }); const im = p.resolve({ flip });
    return { w: im.w, h: im.h, ox: F0.BOX.ox, oy: F0.BOX.oy, data: im.data };
  };
  const mirror = (sp) => { const o = sprite(sp.w, sp.h, sp.w - 1 - sp.ox, sp.oy); for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) for (let c = 0; c < 4; c++) o.data[(j * sp.w + (sp.w - 1 - i)) * 4 + c] = sp.data[(j * sp.w + i) * 4 + c]; return o; };
  const marchers = [[0.08, -14, gob, 1], [0.12, 12, gob, 4], [0.17, -4, gob, 2], [0.215, 16, gob, 6], [0.25, -16, gob, 3], [0.6, -10, kn, 0, "knight"], [0.635, 12, kn, 3, "knight"], [0.67, -2, kn, 5, "knight"]];
  for (const [f, off, F0, fr, variant] of marchers) {
    const p = roadAt(f * SAMP.len), x = p.x - p.ds * off, s = p.s + p.dx * off;
    const goingRight = F0 === gob ? p.dx > 0 : p.dx < 0;
    let img = figAt(F0, "walk", fr, false, variant || "");
    if (!goingRight) img = mirror(img);
    add(img, x, s);
  }

  // ---- shadows of the standing things (projected along the sun's fall) ----
  for (const d of decor) {
    if (!d.shadow) continue;
    const im = d.img, ln = Math.max(0.42, S.len);
    for (let j = 0; j < im.h; j++) for (let i = 0; i < im.w; i++) {
      if (!im.data[(j * im.w + i) * 4 + 3]) continue;
      const hgt = im.oy - j; if (hgt < 0) continue;
      const X = Math.round(d.sx + i - im.ox + fall[0] * ln * hgt * 0.95), Y = Math.round(d.sy + fall[1] * ln * hgt * 0.95 + 0);
      for (const [a, b] of [[0, 0], [1, 0]]) { const xx = X + a, yy = Y + b; if (xx >= 0 && yy >= 0 && xx < W && yy < H) shade[yy * W + xx] = Math.max(shade[yy * W + xx], 0.85); }
    }
  }

  // ---- puddles (B, C): water held on the land, a dark wet margin round it ----
  if (PUD.length) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const s = sAt[y * W + x]; if (s < 0) continue;
      const r = pudAt(x, s); if (r > 1.45) continue;
      const k = s * W + x, n2 = fbm(x / 7, s / 7, 5);
      if (r < 1) {
        // sky in it, the far bank's dark reflected along its top edge, a glint
        const top = pudAt(x, s - 3) > 1;
        let c = P.snow ? pick(P.ice, 0.45 + 0.4 * (1 - r) + 0.1 * n2, x, s) : pick(P.water, top ? 0.2 : 0.55 + 0.35 * (1 - r) + 0.1 * (n2 - 0.5), x, s);
        if (!P.snow && Math.abs((x - s * 0.6) % 23) < 1 && r < 0.7 && !top) c = P.water[4];
        put(x, y, c); shade[y * W + x] *= 0.3;
      } else if (r < 1.18) put(x, y, pick(P.snow ? P.road : P.earth, 0.25 + 0.2 * n2, x, y), 0.85);           // wet mud margin
      else if (D[k] >= RH || hash(x, y, 3) > 0.4) put(x, y, pick(P.snow ? P.road : P.earth, 0.45 + 0.2 * n2, x, y), 0.55 * (1.45 - r) / 0.27);   // trampled
    }
    // C: trampled bare earth along the lane's margins
  }
  if (opt === "C" && !P.snow) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = sAt[y * W + x]; if (s < 0) continue; const k = s * W + x, d = D[k];
    if (d < RH - 3 || d > RH + 14) continue;
    const w = fbm(T[k] / 50, SD[k] > 0 ? 1 : 5, 66), lim = RH + 14 * w * w;
    if (d < lim && hash(x, s, 12) > (d - RH + 3) / (lim - RH + 3) * 0.9) put(x, y, pick(P.earth, 0.5 + 0.25 * fbm(x / 6, s / 6, 2), x, y), 0.9);
  }
  // flower drifts (C): dense specks you can see at board size, in swaths
  if (opt === "C") for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = sAt[y * W + x]; if (s < 0) continue;
    if (aux.zone(x, s) !== "flowers" || hash(x >> 1, y >> 1, 41) < 0.72) continue;
    const ci = Math.floor(fbm(x / 60, s / 60, 43) * P.flowers.length * 1.4) % P.flowers.length, c = P.flowers[ci];
    if ((x & 1) === 0 && (y & 1) === 0) { put(x, y, c); put(x + 1, y, mix(c, PLUM, 0.2)); put(x, y + 1, mix(c, PLUM, 0.35)); }
  }

  // ---- shade the ground ----
  const sh = S.shade;
  for (let k = 0; k < W * H; k++) if (shade[k] > 0) { const o = k * 3, a = sh[3] * 1.55 * shade[k]; buf[o] += (sh[0] - buf[o]) * a; buf[o + 1] += (sh[1] - buf[o + 1]) * a; buf[o + 2] += (sh[2] - buf[o + 2]) * a; }

  // ---- lay the standing things, back to front ----
  decor.sort((a, b) => a.s - b.s);
  for (const d of decor) {
    const im = d.img;
    for (let j = 0; j < im.h; j++) for (let i = 0; i < im.w; i++) {
      const o = (j * im.w + i) * 4, a = im.data[o + 3]; if (!a) continue;
      put(d.sx + i - im.ox, d.sy + j - im.oy, [im.data[o], im.data[o + 1], im.data[o + 2]], a / 255);
    }
  }

  // ---- the light's colour: golden hour warms what the sun reaches ----
  if (S.on && S.tone) {
    const warm = hex(S.col);
    for (let k = 0; k < W * H; k++) {
      const o = k * 3, inSh = shade[k] > 0 ? 0.2 : 1, t = 0.34 * S.warm * inSh;
      for (let c = 0; c < 3; c++) buf[o + c] = buf[o + c] * (1 - t) + buf[o + c] * (warm[c] / 255) * 1.12 * t;
      if (!inSh || inSh < 1) { buf[o + 2] *= 1.04; }
    }
  }

  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let k = 0; k < W * H; k++) { rgba[k * 4] = buf[k * 3]; rgba[k * 4 + 1] = buf[k * 3 + 1]; rgba[k * 4 + 2] = buf[k * 3 + 2]; rgba[k * 4 + 3] = 255; }
  setDay("noon");
  return { w: W, h: H, rgba };
}

