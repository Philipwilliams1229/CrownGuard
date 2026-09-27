// ============ RENDER: THE COAST ============
// A realm that runs down to the sea along one edge (REALM.coast, see the
// style guide "Coasts on the board").
//
// - coastPixel (world.js's tone map calls it for every pixel of the board,
//   and the apron may for the land beyond) lays the sea and the beach pixel
//   by pixel: the waterline's lace of foam, the shallows over sand with foam
//   streaks strung along the shore, a line of breakers on a bar smoother than
//   the shore (so the shallows widen in the bays) with its shaded face, depth
//   bands that wander, a collar of white water hugging the castle's plinth
//   and tower feet, and the open sea's swell — short lit crests with a shade
//   pixel under each, a step brighter in sunlit patches, strung along the
//   shore by arc length so they keep their shape off the headlands; on the
//   beach, the dark wet line, a sheen band of wet sand holding the sky, the
//   tideline's wrack, dry sand in drifts and wind ripples, and a ragged edge
//   where the turf takes over. Everything is flat stepped tones on the art
//   grid, no dither and no blends.
// - paintShore (once, while the ground layer is painted) adds the things on
//   it: rocks awash in rings of foam, rocks at the waterline (where the sea
//   lies up the screen they stand just ashore, foam behind and a shadow in
//   the wet sand, never rings of foam on the sand in front), tide pools,
//   shells, pebbles and weed on the tideline, marram on the dune edge, and
//   driftwood — each drawn pixel by pixel, the solid ones inked, all kept
//   clear of the realm's decor and of each other.
// - drawShoreLive (every frame) runs the swash: a thin sheet of water with a
//   foam front sliding up the wet sand and back, out of step along the shore,
//   and a few glints winking on the swell; it parts round the rocks at the
//   waterline (shorter beside them), its foam dies back in runs, and on a
//   steep shore neighbouring fronts join in a stair instead of dots. The sheet is one staircase outline per unbroken run, the foam
//   axis-aligned rects on the art grid (neighbours merged): four fills a
//   frame, crisp, ~0.35 ms on the dev box.

import { W, H, PATH_HALF, WALL_W } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { nearestOnPath, PTS } from "../engine/path.js";
import { wallDrums, TOWER, GATE_TOWER_N, GATE_TOWER_S } from "../data/castle.js";
import { COAST, DECOR, coastLine, forestDepthAt } from "../data/terrain.js";
import { lighten, darken, mix, rgb, rgba, hash, inkOutline, PX } from "./paint.js";

const DEF_WATER = { deep: "#3a6a7c", edge: "#4a8094", shine: "#8cc4d8" };
// each country's sand: the Vale's warm gold, the Marches' grey shingle-sand,
// the fen's drab silt
const SANDS = { vale: "#dcc48e", iron: "#c2b89c", fen: "#9e977c" };
const land = (R) => (R.groundArt === "iron" ? "iron" : R.groundArt === "fen" ? "fen" : "vale");

// ---- noise -----------------------------------------------------------------
const LAT = new Float32Array(65536);
for (let i = 0; i < 65536; i++) LAT[i] = hash(i, 5113);
// eased value noise in world units, 0..1
const vn = (x, y, cell) => {
  const fx = x / cell + 311.3, fy = y / cell + 173.7;
  const xi = Math.floor(fx), yi = Math.floor(fy);
  let u = fx - xi, v = fy - yi;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const a = xi & 255, b = (xi + 1) & 255, c = (yi & 255) << 8, e = ((yi + 1) & 255) << 8;
  return (LAT[c + a] * (1 - u) + LAT[c + b] * u) * (1 - v) + (LAT[e + a] * (1 - u) + LAT[e + b] * u) * v;
};

// ---- the waterline, sampled once per coast ----------------------------------
// line[i] is coastLine at u = U0 + i / 2 and nf[i] the factor that turns a
// distance measured straight in from the edge into one measured square to
// the shore (so the bands keep their width where the shore runs steep).
const U0 = -260;
let GEO = null;
// a moving average over ±r samples
const smoothed = (a, r) => {
  const n = a.length, sum = new Float64Array(n + 1), out = new Float32Array(n);
  for (let i = 0; i < n; i++) sum[i + 1] = sum[i] + a[i];
  for (let i = 0; i < n; i++) { const lo = Math.max(0, i - r), hi = Math.min(n, i + r + 1); out[i] = (sum[hi] - sum[lo]) / (hi - lo); }
  return out;
};
const slopes = (line) => {
  const n = line.length, nf = new Float32Array(n);
  for (let i = 0; i < n; i++) { const s = line[Math.min(n - 1, i + 1)] - line[Math.max(0, i - 1)]; nf[i] = 1 / Math.sqrt(1 + s * s); }
  return nf;
};
// the distance along a line from its start (from U0), so marks strung along
// the shore keep their length where it runs steep, off the headlands
const arcOf = (line) => {
  const n = line.length, a = new Float32Array(n);
  a[0] = U0;
  for (let i = 1; i < n; i++) a[i] = a[i - 1] + Math.hypot(0.5, line[i] - line[i - 1]);
  return a;
};
const geo = () => {
  if (GEO && GEO.coast === COAST) return GEO;
  const along = COAST.edge === "top" || COAST.edge === "bottom", span = along ? W : H;
  const n = Math.ceil((span - 2 * U0) * 2) + 2;
  const line = new Float32Array(n);
  for (let i = 0; i < n; i++) line[i] = coastLine(U0 + i / 2);
  // far out, the depth contours forget the shore's small wiggles: the deep
  // bands and the swell follow a waterline smoothed over ±45 units
  const lineS = smoothed(smoothed(line, 90), 90);
  // the bar the breakers stand on is smoother than the waterline (over ±12
  // units): the shallows widen in the bays and narrow off the points
  const lineM = smoothed(smoothed(line, 24), 24);
  GEO = { coast: COAST, along, span, n, line, nf: slopes(line), lineS, nfS: slopes(lineS), lineM, nfM: slopes(lineM), arc: arcOf(line), arcS: arcOf(lineS), seed: COAST.seed || 0, edge: COAST.edge };
  // the wet sand's reach and the tideline, per sample (beachPx reads them)
  GEO.wet = new Float32Array(n); GEO.tide = new Float32Array(n);
  for (let i = 0; i < n; i++) { GEO.wet[i] = wetAt(GEO, U0 + i / 2); GEO.tide[i] = tideAt(GEO, U0 + i / 2); }
  return GEO;
};
// Where the water meets the castle, per half unit of y: the curtain's
// plinth (x 745), or a tower's foot (x 740) where a tower stands in the sea.
let FACES = null;
const faces = () => {
  const gy = PTS.length ? PTS[PTS.length - 1][1] : H / 2;
  if (FACES && FACES.gy === gy && FACES.coast === COAST) return FACES.f;
  const f = new Float32Array(H * 2 + 2).fill(745);
  // off each end of a tower's foot the face swings back to the curtain in a
  // rounded corner (a quarter ellipse RF long), so the collar, its lace and
  // the aerated water curve round the foot instead of stepping in a box
  const RF = 6, xt = TOWER.x0 - 4;
  for (const foot of [...wallDrums(gy), gy + GATE_TOWER_N, gy + GATE_TOWER_S]) {
    const a = foot - TOWER.n, b = foot + TOWER.s + 2;
    for (let k = Math.max(0, Math.floor((a - RF) * 2)); k <= Math.min(H * 2 + 1, Math.ceil((b + RF) * 2)); k++) {
      const y = k / 2, d = y < a ? a - y : y > b ? y - b : 0;
      if (d >= RF) continue;
      f[k] = Math.min(f[k], 745 - (745 - xt) * Math.sqrt(1 - (d / RF) ** 2));
    }
  }
  FACES = { gy, coast: COAST, f };
  return f;
};
const idx = (G, u) => { const i = Math.round((u - U0) * 2); return i < 0 ? 0 : i >= G.n ? G.n - 1 : i; };
// (x, y) → [u along the edge, v in from it]
const toUV = (edge, x, y) => (edge === "top" ? [x, y] : edge === "bottom" ? [x, H - y] : edge === "left" ? [y, x] : [y, W - x]);
const toXY = (edge, u, v) => (edge === "top" ? [u, v] : edge === "bottom" ? [u, H - v] : edge === "left" ? [v, u] : [W - v, u]);

// ---- the palette -------------------------------------------------------------
// The sea's ramp, lightest first: foam, lace, the shallows over sand, the
// shallows, then out through the blue to the deep. A swell's crest is one
// step lighter than the water it rides, its shade one step darker.
export const coastTones = (R) => {
  const wat = R.water || DEF_WATER, kind = land(R), sand = SANDS[kind];
  const foam = kind === "fen" ? mix(lighten(wat.shine, 0.42), "#d8d8c0", 0.25) : mix(lighten(wat.shine, 0.62), "#fff3d2", 0.3);
  const ramp = [
    foam,
    mix(foam, wat.shine, 0.45),
    mix(lighten(wat.shine, 0.14), sand, 0.2),
    mix(wat.shine, wat.edge, 0.4),
    wat.edge,
    mix(wat.edge, wat.deep, 0.5),
    wat.deep,
    darken(wat.deep, 0.13),
    darken(wat.deep, 0.26),
  ];
  const wet = mix(darken(sand, 0.3), wat.edge, 0.12);
  const beach = {
    wetDk: mix(darken(sand, 0.46), wat.deep, 0.2),
    sheen: mix(darken(wet, 0.1), wat.deep, 0.08),
    sheenLt: mix(mix(wet, wat.shine, 0.55), "#fff3d2", 0.25),
    wet,
    wetLt: mix(wet, sand, 0.45),
    wrack: kind === "fen" ? "#3a3a2a" : mix("#4c4a2a", darken(sand, 0.5), 0.35),
    wrackLt: kind === "fen" ? "#55553a" : "#6e6a3a",
    dry: sand,
    dryLt: mix(sand, "#fff3d2", 0.28),
    dryDk: darken(mix(sand, "#a88a5c", 0.3), 0.05),
    ripple: darken(mix(sand, "#a88a5c", 0.45), 0.1),
    dune: mix(sand, R.GRASS_DK || "#5e8a3c", 0.2),
    bank: darken(mix(sand, "#5a4030", 0.5), 0.25),
    bankLt: darken(mix(sand, "#6a5038", 0.45), 0.05),
  };
  const T = { px: 0.5, kind, ramp: ramp.map(rgb), hex: { ramp, ...beach, sand } };
  for (const k in beach) T[k] = rgb(beach[k]);
  return T;
};

// ---- the sea -----------------------------------------------------------------
// The line of breakers: how far out it stands at u (sample i), on its bar.
const breakAt = (G, u, i) => Math.max(5.5, 9 + 2 * Math.sin(u * 0.031 + G.seed) + 2.6 * (vn(u, 11.5, 23) - 0.5) + (G.line[i] - G.lineM[i]) * 0.9);
// where the breakers are spilling (foam) rather than still standing (a lit swell)
const breaking = (u) => vn(u, 7.1, 6) > 0.3;
// A mark on the open water at (u, dp): 0 none, 1 a swell's crest (its tail),
// 2 its crest (the middle), 3 a glint. A swell is a short arch of lit water
// running along the shore, one pixel thick.
const SW = 7.5;
const swellMark = (G, u, dp, kd, cb, px, nfs = 1) => {
  // where the smoothed shore runs steep a crest would come out a long
  // hairline stair or a hook: there they thin out, shorten and flatten
  if (dp < cb + 4.5 || nfs < 0.72) return 0;
  const q = kd + 1.4 * Math.sin(u * 0.045 + G.seed * 2.1);
  const r = Math.floor(q / SW), f = q - r * SW;
  if (f > 2.4) return 0;
  const st = nfs * nfs, L = (12 + 7 * hash(r, 11)) * (0.35 + 0.65 * st);
  const uu = u + r * 29.3, s = Math.floor(uu / L), g = uu / L - s;
  const h = hash(r * 977 + s, 12);
  const dens = (kd < 26 ? 0.66 : kd < 46 ? 0.5 : kd < 68 ? 0.38 : 0.28) * (0.4 + 0.6 * st);
  if (h > dens) return 0;
  // and a crest may fall at most ~4 art pixels across its length, so on a
  // slanting shore it stays a short dash, not a long hairline stair
  const sl = Math.sqrt(Math.max(0, 1 / (nfs * nfs) - 1));
  const len = Math.min(0.38 + 0.34 * hash(r * 977 + s, 13), sl > 0.02 ? 2.1 / (sl * L) : 1);
  if (g > len) return 0;
  const gg = g / len, a = (0.4 + 0.65 * hash(r * 977 + s, 14)) * 4 * gg * (1 - gg) * st;
  const ff = f - a;
  if (ff < 0 || ff >= px) return 0;
  const mid = gg > 0.22 && gg < 0.78;
  return mid && h < dens * 0.25 && gg > 0.42 && gg < 0.58 && kd < 60 ? 3 : mid ? 2 : 1;
};

// the slope factor of the depth contour through a point, as `deep` blends
// them: the bar's (the waterline less its small wiggles) near in, the
// smoothed line's far out; slow to change, so a crest is cut as a whole
const nfK = (G, i, dp) => { const t = (dp - 8) / 40, e = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); return G.nfM[i] + (G.nfS[i] - G.nfM[i]) * e; };

const seaPx = (T, G, i, dp, kd, x, y, dpA, kdA, iA) => {
  const R = T.ramp, px = T.px, u = G.arc[i], uA = G.arc[iA];
  // the waterline's own foam: a lip of uneven thickness, lacy to seaward
  const fl = vn(x, y, 2.6), lip = 0.45 + 1.1 * fl + 0.8 * vn(u, 2.5, 7);
  if (dp < lip) return dp < 0.5 || fl > 0.42 ? R[0] : R[1];
  // the sea slapping at the foot of the castle: a collar of white water
  // hugging the stones with a ragged rim, clots of foam torn off it, a
  // broken line of lace farther out and the aerated water between (a step
  // lighter)
  let wall = 99;
  const wx = G.along && x > W - WALL_W - 14 ? faces()[Math.min(H * 2, Math.max(0, Math.round(y * 2)))] - x : -9;
  if (wx > -3) {
    const reach = 0.8 + 2.6 * vn(y, 3.1, 4.5);
    const e = wx - reach - (vn(x, y, 1.8) - 0.5) * 2.4;
    if (e < 0) return e > -px * 1.1 && vn(x, y + 9, 1.2) > 0.45 ? R[1] : R[0];
    if (e < 2 && vn(x + 17, y, 1.4) > 0.64) return R[1];
    // the lace wanders in and out and breaks in long runs, real gaps between
    const lace = reach + 3 + 3.2 * vn(y, 9.3, 7) + 1.2 * vn(y, 2.1, 2.2);
    if (Math.abs(wx - lace) < px * 0.55 && vn(y, 5.5, 3.5) > 0.4) return R[1];
    // the aerated water's edge is frayed, not ruled
    wall = wx - lace + (vn(x, y, 2.4) - 0.5) * 3;
  }
  const cb = breakAt(G, u, i), fb = dp - cb;
  if (fb < 0) {
    // the breaking wave's face, just under its crest, in shade
    const fbA = dpA - breakAt(G, uA, iA);
    if (fbA >= 0 && fbA < 2 * px && breaking(uA)) return R[4];
    // lace over the shallows: streaks strung along the shore, thinning out
    // toward the breakers
    const n = vn(u * 0.28, dp, 2.1), w = 0.012 + 0.06 * (1 - dp / cb);
    if (Math.abs(n - 0.5) < w && vn(u, 3.3 + dp * 0.3, 5) > 0.38) return R[1];
    return dp < 4.2 + (vn(x, y, 5) - 0.5) * 3 ? R[2] : R[3];
  }
  // the breakers' crest: foam where it spills, a lit swell where it stands;
  // spray thrown back ragged over the wave's back
  const brk = breaking(u);
  if (fb < 2 * px) return brk ? R[0] : fb < px ? R[2] : R[3];
  if (brk && fb < 2 * px + vn(x, y, 1.5) * 1.9 && vn(x + 40, y, 0.9) > 0.3) return R[1];
  // the open water: bands by depth, their edges wandering
  const wob = ((vn(x, y, 34) - 0.5) * 9 + (vn(x + 91, y, 60) - 0.5) * 8 + (vn(x, y + 57, 11) - 0.5) * 3.5) * Math.min(1, Math.max(0.2, fb / 12));
  const k = kd + wob;
  let b = fb < 7 + (vn(x, y, 9) - 0.5) * 4 ? 3 : k < 25 ? 4 : k < 43 ? 5 : k < 66 ? 6 : 7;
  if (wall < 0) b = Math.max(3, b - 1);
  const s = swellMark(G, G.arcS[i], dp, kd, cb, px, nfK(G, i, dp));
  if (s === 3) return R[0];
  // in the sunlit patches the crests catch a step more light
  if (s) return R[Math.max(1, b - s - (vn(x + 300, y, 46) > 0.64 ? 1 : 0))];
  // the pixel under a swell's crest is its shade
  if (swellMark(G, G.arcS[iA], dpA, kdA, breakAt(G, uA, iA), px, nfK(G, iA, dpA)) >= 2) return R[b + 1];
  return R[b];
};

// ---- the beach ---------------------------------------------------------------
const wetAt = (G, u) => 5.4 + 3.2 * (vn(u, 9.9, 26) - 0.5) + 0.8 * Math.sin(u * 0.07 + G.seed);
const tideAt = (G, u) => wetAt(G, u) + 2.4 + 1.6 * (vn(u, 1.1, 14) - 0.5) + 0.8 * Math.sin(u * 0.11 + G.seed * 1.7);

// the beach's width at u, measured square to the shore (coastPixel's
// landward edge, less its fraying)
const beachW = (G, u) => { const nf = G.nf[idx(G, u)], sw = COAST.sand; return (sw + Math.min(4.5, sw * (1 / nf - 1))) * nf; };

const beachPx = (T, G, u, i, dp, x, y) => {
  const px = T.px;
  // the swash's last line, then the sheen of sand still holding the sky
  if (dp > -px * 1.01) return T.wetDk;
  const sh = 2.2 + (vn(x, y, 4) - 0.5) * 1.8;
  if (dp > -sh) {
    // streaks of sky along the shore, thickest by the water
    const row = Math.floor(dp / px), q = (G.arc[i] + row * 3.1) / 3.4, run = Math.floor(q);
    return G.nf[i] > 0.7 && q - run < 0.8 && hash(run, row + 40) < 0.34 * (1 + dp / sh) ? T.sheenLt : T.sheen;
  }
  const we = -G.wet[i] + (vn(x, y, 3) - 0.5) * 1.6;
  if (dp > we) return dp > we + 1 ? T.wet : T.wetLt;
  // the tideline: wrack along the last high water, gathered into clumps
  // with real gaps between, lit on top, the line stepping a pixel up or
  // down in runs and the thickest clumps a row deeper
  const a = G.arc[i];
  let tq = dp + G.tide[i];
  if (tq <= 2 * px && tq > -2 * px) tq += vn(a, 5.9, 9) > 0.56 ? px : 0;
  if (G.edge === "bottom") tq = -tq;
  if (tq <= px && tq > -2 * px) {
    const g = vn(a, 17.7, 13);
    if (g > 0.36) {
      const f = vn(a, 3.1, 1.8) + (hash(Math.floor(a / 1.5), 91) - 0.5) * 0.3, lim = Math.min(0.6, 0.16 + (g - 0.36) * 1.4);
      if (tq > 0) { if (f < lim) return T.wrackLt; }
      else if (tq > -px) { if (f < lim + 0.08) return T.wrack; }
      else if (g > 0.66 && f < lim - 0.25) return T.wrack;
    }
  }
  // dry sand: drifts drawn out along the shore by the wind, ragged at the
  // edges, and wind ripples in patches
  const d = 0.62 * vn(a * 0.42 + dp * 0.3, dp - a * 0.05, 8) + 0.38 * vn(a * 0.5 + 53, dp * 1.6, 12) + (vn(x, y, 4.5) - 0.5) * 0.3;
  const base = d > 0.62 ? T.dryLt : d < 0.3 ? T.dryDk : T.dry;
  if (vn(x, y, 27) > 0.55) {
    const rq = (dp * 0.9 + x * 0.1 + 0.9 * Math.sin(x * 0.19 + y * 0.05)) / 2.4, row = Math.floor(rq);
    const sx = (x + row * 3.7) / 4.5, seg = Math.floor(sx);
    if (rq - row < 0.19 && sx - seg < 0.62 && hash(row * 31 + seg, 88) < 0.5) return base === T.dryLt ? T.dry : T.ripple;
  }
  return base;
};

// how far out, for the bands and the swell: square to the shore near in,
// square to the smoothed shore farther out
const deep = (dp, ds) => { const t = (dp - 8) / 40, e = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); return dp + (ds - dp) * e; };

// One pixel of the tone map, if it lies in the sea or on the beach: sd is
// how far seaward of the waterline it lies measured straight in from the
// edge (+ is out to sea), (x, y) its world spot. `t` and `dz` (the turf's
// noise and dither) are unused here: the coast keeps its own. Returns
// [r, g, b], or null for the turf to colour. T.px is the world size of one
// output pixel (0.5 on the board; a painter at another scale sets its own).
export const coastPixel = (T, sd, t, dz, sandW, x, y) => {
  if (sd < -sandW - 8) return null;
  const G = geo(), px = T.px;
  const u = G.along ? x : y, i = idx(G, u), nf = G.nf[i];
  if (sd > 0) {
    const dp = sd * nf, kd = deep(dp, (G.lineS[i] - G.line[i] + sd) * G.nfS[i]);
    // the pixel above, for the shade under a crest
    const [uA, vA] = toUV(G.edge, x, y - px), iA = idx(G, uA);
    const dpA = (G.line[iA] - vA) * G.nf[iA], kdA = deep(dpA, (G.lineS[iA] - vA) * G.nfS[iA]);
    return seaPx(T, G, i, dp, kd, x, y, dpA, kdA, iA);
  }
  // the beach's landward edge stays near the terrain's sand line (scatter
  // and decor keep off inSea(sand + 6)), frayed by blades of turf
  const lim = -sandW - Math.min(4.5, sandW * (1 / nf - 1));
  const col = Math.floor(x / px);
  const hb = hash(col, 7919);
  const blade = G.edge === "top" ? (hb < 0.45 ? 0 : hb < 0.75 ? px : hb < 0.92 ? px * 2 : px * 3) : 0;
  const edge = lim + (vn(x, y, 7) - 0.5) * 3.2 + blade;
  if (sd <= edge) return null;
  // a bank of earth under the turf, where the camera sees its face (the
  // turf stands north of the beach)
  if (G.edge === "bottom" && sd < edge + 1.6) return sd < edge + 0.6 ? T.bank : T.bankLt;
  return beachPx(T, G, u, i, sd * nf, x, y);
};

// ---- painting on the art grid ---------------------------------------------------
// ctx is in world units; one art pixel is 1 / PX of one.
const dot = (ctx, i, j, col) => { ctx.fillStyle = col; ctx.fillRect(i / PX, j / PX, 1 / PX, 1 / PX); };
// a small raster sprite, PX pixels per world unit
const raster = (w, h) => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d");
  const img = c.createImageData(w, h), d = img.data;
  return {
    cv, w, h,
    put(i, j, col) { if (i < 0 || j < 0 || i >= w || j >= h) return; const o = (j * w + i) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; },
    has(i, j) { return i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 0; },
    done() { c.putImageData(img, 0, 0); return cv; },
  };
};

// A rock standing out of the water (or the sand): lit from the upper left in
// four tones, faceted, the wet weedy band at its foot, cut flat where the
// water takes it, and inked. With `foam`, a collar of foam is laid over the
// ink at its waterline and a broken ring of lace a little way out, so the
// sea breaks round it. rx, ry in art pixels; the sprite's anchor (the middle
// of the waterline) is returned with it.
// With `shore` ({ wetDk, sheen }), the sea lies up the screen behind a rock
// at the waterline: no rings on the sand in front, see below.
const rockSprite = (rx, ry, seed, base, weed, foam = null, cut = 0.45, shore = null) => {
  const w = Math.ceil(rx * 2) + 20, h = Math.ceil(ry * 2) + 14;
  const R = raster(w, h), cx = w / 2, cy = Math.ceil(ry) + 3;
  const hi = rgb(lighten(base, 0.4)), lt = rgb(lighten(base, 0.18)), md = rgb(base), dk = rgb(darken(base, 0.32));
  const wet = rgb(darken(mix(base, weed, 0.45), 0.38)), wetLt = rgb(darken(mix(base, weed, 0.6), 0.15));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const nx = (i + 0.5 - cx) / rx, ny = (j + 0.5 - cy) / ry;
    const a = Math.atan2(ny, nx), rr = Math.hypot(nx, ny);
    const wob = 1 + 0.1 * Math.sin(3 * a + seed) + 0.07 * Math.sin(5 * a + seed * 2.3) + 0.05 * Math.sin(8 * a + seed * 3.1);
    if (rr > wob || ny > cut) continue;
    const z = Math.sqrt(Math.max(0, 1 - (rr / wob) ** 2));
    // facets: the light is read off a coarse grid, so it breaks in planes
    const fi = Math.floor((i + seed * 3) / 3), fj = Math.floor((j + seed) / 3);
    const L = -0.5 * nx - 0.66 * ny + 0.55 * z + (hash(fi * 31 + fj, 71) - 0.5) * 0.22;
    let col = L > 0.78 ? hi : L > 0.46 ? lt : L > 0.12 ? md : dk;
    if (ny > cut - 0.3) col = hash(i, j * 7 + seed) < 0.3 ? wetLt : wet;
    R.put(i, j, col);
  }
  const cv = inkOutline(R.done());
  const ay = Math.floor(cy + cut * ry);   // the first row under the waterline
  if (foam) {
    const c = cv.getContext("2d"), img = c.getImageData(0, 0, w, h), d = img.data;
    const set = (i, j, col) => { if (i < 0 || j < 0 || i >= w || j >= h) return; const o = (j * w + i) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; };
    const solid = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 0;
    let i0 = w, i1 = -1;
    for (let i = 0; i < w; i++) if (solid(i, ay - 1)) { i0 = Math.min(i0, i); i1 = Math.max(i1, i); }
    if (shore) {
      // The sea lies up the screen, behind the rock: its foot stands in wet
      // sand (a row of shade under the ink, falling right), the waterline's foam
      // curls a pixel or two round each flank, and spray peeks over a
      // shoulder from the waves breaking on the far side.
      for (let i = i0 + 1; i <= i1 + 2; i++) if (i < i1 || hash(i, seed + 3) < 0.6) set(i, ay + 1, shore.wetDk);
      for (let j = ay - 3; j < ay; j++) {
        let l = -1, r = -1;
        for (let i = 0; i < w; i++) if (solid(i, j)) { if (l < 0) l = i; r = i; }
        if (l < 0) continue;
        set(l - 1, j, foam[0]); set(r + 1, j, foam[0]);
        if (j >= ay - 2) { set(l - 2, j, foam[1]); set(r + 2, j, foam[1]); }
      }
      // spray: a small clot over the right shoulder, lace over the left
      let top = h, tl = 0;
      for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if (solid(i, j)) { if (j < top) { top = j; tl = i; } break; }
      const sx = Math.min(i1 - 2, tl + 3 + Math.floor(hash(seed, 17) * 3));
      for (let i = sx - 1; i <= sx + 2; i++) {
        let tj = -1;
        for (let j = 0; j < ay; j++) if (solid(i, j)) { tj = j; break; }
        if (tj < 1) continue;
        set(i, tj - 1, foam[0]);
        if (i > sx - 1 && i < sx + 2) set(i, tj - 2, i === sx ? foam[0] : foam[1]);
      }
      c.putImageData(img, 0, 0);
      return { cv, ax: Math.round(cx), ay };
    }
    // the collar: two rows of foam over the ink, running a pixel or two past
    for (let i = i0 - 2; i <= i1 + 2; i++) {
      const edge = i < i0 || i > i1;
      for (let j = ay; j < ay + 2; j++) {
        if (edge && j === ay + 1 && (i < i0 - 1 || i > i1 + 1)) continue;
        set(i, j, hash(i * 7 + j, seed + 5) < 0.2 ? foam[1] : foam[0]);
      }
    }
    // two broken rings of lace, a little out, round the front
    const mid = (i0 + i1) / 2;
    for (const [grow, dep, gap] of [[4, 3, 0.25], [7, 5, 0.55]]) {
      const rx2 = (i1 - i0) / 2 + grow;
      for (let i = Math.floor(mid - rx2); i <= Math.ceil(mid + rx2); i++) {
        const f = (i - mid) / rx2;
        if (Math.abs(f) > 1) continue;
        const j = ay + 1 + Math.round(dep * Math.sqrt(1 - f * f));
        if (hash(i + grow * 50, seed + 7) < gap || solid(i, j)) continue;
        set(i, j, foam[1]);
      }
    }
    c.putImageData(img, 0, 0);
  }
  return { cv, ax: Math.round(cx), ay };
};

// A clump of marram: stiff blades leaning off the sea wind, dark at the root
// and pale at the tip. No ink — grass is never ringed.
const marramSprite = (seed, cols) => {
  const w = 22, h = 24, R = raster(w, h);
  const n = 5 + Math.floor(hash(seed, 1) * 5);
  for (let b = 0; b < n; b++) {
    const bx = 6 + Math.round((b / Math.max(1, n - 1)) * 8 + (hash(seed, b + 2) - 0.5) * 2);
    const len = 9 + Math.floor(hash(seed, b + 20) * 11);
    const lean = 0.12 + hash(seed, b + 40) * 0.5 - (b < n / 3 ? 0.34 : 0);
    const bow = 0.4 * hash(seed, b + 60);
    const dead = hash(seed, b + 80) < 0.22;   // a straw-dead blade here and there
    for (let k = 0; k < len; k++) {
      const f = k / len;
      const i = Math.round(bx + lean * k + bow * f * f * len * 0.5), j = h - 2 - k;
      const c = dead ? (f < 0.3 ? cols[1] : cols[3]) : f < 0.28 ? cols[0] : f < 0.62 ? cols[1] : f < 0.9 ? cols[2] : cols[3];
      R.put(i, j, c);
      // the stouter blades are two pixels wide at the root, lit on the left
      if (f < 0.4 && b % 2 === 0) R.put(i - 1, j, f < 0.15 ? cols[0] : cols[2]);
    }
  }
  return R.done();
};

// A driftwood log, bleached by the sea: knobbly and bowed, a lit top, grain
// along it, a root-flare with snapped roots at one end, a broken branch;
// inked. Returns the canvas and, per column, the row under its belly.
const driftSprite = (len, seed, wood) => {
  const w = len + 14, h = 18, R = raster(w, h), x0 = 6;
  const hi = rgb(lighten(wood, 0.45)), lt = rgb(lighten(wood, 0.2)), md = rgb(wood), dk = rgb(darken(wood, 0.34)), gr = rgb(darken(wood, 0.16));
  const bend = (hash(seed, 3) - 0.5) * 4, drop = (hash(seed, 5) - 0.5) * 3;
  const belly = [];
  for (let i = 0; i < len; i++) {
    const f = i / (len - 1);
    const yc = 9 + bend * 4 * f * (1 - f) + drop * f;
    const th = Math.round(4 + 1.4 * (1 - f) + (hash(Math.floor(i / 3), seed + 9) < 0.25 && i < len - 3 ? 1 : 0) + (i < 3 ? 1.5 : 0));
    const top = Math.round(yc - th / 2);
    for (let r = 0; r < th; r++) {
      let col = r === 0 ? hi : r === 1 ? lt : r === th - 1 ? dk : md;
      if (r > 1 && r < th - 1 && hash(Math.floor(i / 5) + r * 17, seed) < 0.35) col = gr;
      R.put(x0 + i, top + r, col);
    }
    belly.push([x0 + i, top + th]);
    // the sawn end: pale end grain round a darker heart
    if (i === len - 1) for (let r = 0; r < th; r++) R.put(x0 + i + 1, top + r, r === Math.floor(th / 2) ? gr : r === th - 1 ? md : hi);
  }
  // snapped roots flaring off the thick end
  const ry = Math.round(9 - 1);
  for (const [dx, dy, n] of [[-1, -1, 3], [-1, 1, 3], [-1, 0, 2]]) {
    for (let k = 1; k <= n; k++) R.put(x0 - k, ry + dy * k + (dy ? 0 : 1), k === n ? hi : dy < 0 ? lt : md);
  }
  // a broken branch rising off its back
  const bi = Math.round(len * (0.5 + hash(seed, 4) * 0.25)), bf = bi / (len - 1);
  const by = Math.round(9 + bend * 4 * bf * (1 - bf) + drop * bf - 2);
  for (let k = 1; k <= 4; k++) { R.put(x0 + bi + Math.floor(k * 0.7), by - k, k < 4 ? lt : hi); R.put(x0 + bi + 1 + Math.floor(k * 0.7), by - k, md); }
  return { cv: inkOutline(R.done()), w, h, belly };
};

// whether (x, y) lies within m of a piece of the realm's decor (a tree, a
// stone...), or under a tree's crown standing south of it
const nearDecor = (x, y, m) => DECOR.some((d) => Math.abs(d.x - x) < m && y > d.y - m - 26 && y < d.y + m * 0.5);

// Where the rocks stand, once per coast: out past the breakers, and at the
// waterline (the live swash leaves those alone, so it never washes over one).
const rockSpots = (G) => {
  if (G.spots) return G.spots;
  const kind = land(REALM);
  const at = (u, dp) => { const i = idx(G, u); return toXY(G.edge, u, G.line[i] - dp / G.nf[i]); };
  const onBoard = (x, y, m) => x > m && y > m && x < W - WALL_W - m && y < H - m;
  const clearOf = (x, y, m) => nearestOnPath(x, y).d > PATH_HALF + m && forestDepthAt(x, y) < -m;
  const seed = Math.floor(G.seed * 1000);
  const rocks = [];
  for (let k = 0; k < 40 && rocks.length < 3; k++) {
    const u = 40 + hash(seed + k, 61) * (G.span - 80), dp = 27 + hash(seed + k, 62) * 22;
    const [x, y] = at(u, dp);
    // (and clear of the white water at the castle's foot)
    if (!onBoard(x, y, 10) || x > W - WALL_W - 26 || G.line[idx(G, u)] - dp / G.nf[idx(G, u)] < 8) continue;
    if (rocks.some((r) => Math.abs(r.u - u) < 110)) continue;
    rocks.push({ u, x, y, k });
  }
  const shoreRocks = [];
  for (let k = 0; k < 40 && shoreRocks.length < (kind === "iron" ? 3 : 2); k++) {
    const u = 60 + hash(seed + k, 91) * (G.span - 120);
    // where the sea lies up the screen the rock stands just ashore, its foot
    // in the wet sand and the waterline's foam behind it; elsewhere just out
    const [x, y] = at(u, G.edge === "top" ? -0.6 : 1.2);
    if (!onBoard(x, y, 14) || !clearOf(x, y, 18) || G.line[idx(G, u)] < 8 || nearDecor(x, y, 16)) continue;
    if (shoreRocks.some((r) => Math.abs(r.u - u) < 130) || rocks.some((r) => Math.abs(r.u - u) < 40)) continue;
    shoreRocks.push({ u, x, y, k });
  }
  G.spots = { rocks, shoreRocks };
  return G.spots;
};

// ---- the things on the shore -----------------------------------------------------
// The sea's surface and the beach's litter, over the tone map.
export function paintShore(ctx) {
  if (!COAST) return;
  const G = geo(), R = REALM, T = coastTones(R), X = T.hex, kind = T.kind;
  const seaSide = G.edge === "top" ? -1 : G.edge === "bottom" ? 1 : 0;   // which way the sea lies, on screen
  // a point dp (square to the shore; + is seaward) off the waterline at u
  const at = (u, dp) => { const i = idx(G, u); return toXY(G.edge, u, G.line[i] - dp / G.nf[i]); };
  const onBoard = (x, y, m) => x > m && y > m && x < W - WALL_W - m && y < H - m;
  const clearOf = (x, y, m) => nearestOnPath(x, y).d > PATH_HALF + m && forestDepthAt(x, y) < -m;
  const seed = Math.floor(G.seed * 1000);
  const rockBase = kind === "iron" ? "#8a8a88" : kind === "fen" ? "#6e6c66" : "#8e877c";
  const weed = kind === "fen" ? "#2e3a26" : "#3e5a2a";
  const ramp = X.ramp;

  const foam = [rgb(ramp[0]), rgb(ramp[1])];
  const rock = (x, y, rx, ry, sd, cut, shore = null) => {
    const { cv, ax, ay } = rockSprite(rx, ry, sd, rockBase, weed, foam, cut, shore);
    ctx.drawImage(cv, (Math.round(x * PX) - ax) / PX, (Math.round(y * PX) - ay) / PX, cv.width / PX, cv.height / PX);
  };

  // ---- rocks awash, out past the breakers (clear of the skiffs' lane) ----
  const S = rockSpots(G), rocks = S.rocks;
  for (const r of rocks) {
    const big = 7 + Math.floor(hash(r.k, 63) * 5);
    // a big stone, a lesser one leaning on it, sometimes a third; back to front
    const parts = [[big + 3, -1, Math.max(3, big - 4)], [0, 0, big]];
    if (hash(r.k, 64) < 0.5) parts.push([-big - 1, 2, 3]);
    for (const [ox, oy, rr] of parts) rock(r.x + ox / PX, r.y + oy / PX, rr, Math.round(rr * 0.72), r.k * 5 + ox, 0.45);
  }

  // ---- rocks at the waterline, a tide pool left on the sand beside each ----
  const shoreRocks = S.shoreRocks;
  const lee = seaSide === -1 ? { wetDk: rgb(X.wetDk), sheen: rgb(X.sheen) } : null;
  for (const r of shoreRocks) {
    const rr = 8 + Math.floor(hash(r.k, 92) * 4);
    // the pool, clear of the stones: a ragged rim, the far (north) bank's
    // face in shade and its shadow on the water, a lit near lip, the sky
    // caught at its upper left, a pebble and a hank of weed on the rim
    // (on whichever side is clear of the decor; none if neither is)
    let side = hash(r.k, 95) < 0.5 ? -1 : 1, px0 = 0, py0 = 0, ok = false;
    for (let tries = 0; tries < 2 && !ok; tries++, side = -side) {
      [px0, py0] = at(r.u + (side < 0 ? -(rr / PX + 5) : rr / PX + 9), -(wetAt(G, r.u) + 1.2));
      ok = !nearDecor(px0, py0, 14) && clearOf(px0, py0, 6) && onBoard(px0, py0, 6);
    }
    const pw = 6 + Math.floor(hash(r.k, 93) * 5), ph = 3 + Math.floor(hash(r.k, 94) * 2);
    if (ok) {
      const ci = Math.round(px0 * PX), cj = Math.round(py0 * PX);
      const inPool = (i, j) => {
        const a = Math.atan2(j, i);
        const wob = 1 + 0.16 * Math.sin(a * 3 + r.k) + 0.09 * Math.sin(a * 5 + r.k * 2.1) + (hash(i * 13 + j, r.k + 96) - 0.5) * 0.14;
        return ((i / pw) ** 2 + (j / ph) ** 2) / wob;
      };
      for (let j = -ph - 2; j <= ph + 2; j++) for (let i = -pw - 2; i <= pw + 2; i++) {
        const e = inPool(i, j);
        let col;
        if (e > 1) {
          if (e > 1.45) continue;
          // the rim: damp sand in shade to the north, the lit lip to the south
          col = j < 0 ? X.wet : inPool(i, j - 1) <= 1 ? X.wetLt : null;
          if (!col) continue;
        } else if (inPool(i, j - 1) > 1) col = X.wetDk;           // the far bank's face
        else if (inPool(i, j - 2) > 1) col = ramp[4];              // its shadow on the water
        else col = j > 0 && e < 0.45 ? ramp[2] : ramp[3];
        dot(ctx, ci + i, cj + j, col);
      }
      // the sky in it, upper left, and a glint of light off the near side
      const sj = cj - ph + 3, si = ci - Math.round(pw * 0.45);
      dot(ctx, si, sj, X.sheenLt); dot(ctx, si + 1, sj, X.sheenLt); dot(ctx, si + 2, sj, ramp[2]); dot(ctx, si - 1, sj + 1, ramp[2]);
      // a pebble on the far rim, a hank of weed trailing over the near one
      const pi = ci + Math.round(pw * 0.55), pj = cj - ph - 1;
      const pc = kind === "iron" ? "#9a968c" : "#a8a090";
      dot(ctx, pi, pj, pc); dot(ctx, pi + 1, pj, darken(pc, 0.3)); dot(ctx, pi, pj - 1, lighten(pc, 0.3)); dot(ctx, pi + 1, pj - 1, pc);
      for (let q = 0; q < 4; q++) dot(ctx, ci - Math.round(pw * 0.3) + q, cj + ph - (q === 1 || q === 2 ? 1 : 0), q === 1 ? X.wrackLt : X.wrack);
    }
    // the rock at the waterline and a stone beside it; where the sea lies
    // up the screen they stand ashore with the foam behind them
    rock(r.x, r.y, rr, Math.round(rr * 0.7), r.k * 13, 0.45, lee);
    rock(r.x + (rr + 3) / PX, r.y + (lee ? 0.5 : 1.5), 4, 3, r.k * 17 + 3, 0.4, lee);
  }

  // ---- the tideline: shells, pebbles, weed, a bone or two in the fen ----
  const shells = kind === "fen" ? ["#d8d0b8", "#b8b098"] : kind === "iron" ? ["#e8e0cc", "#c8b8a8"] : ["#f4e8d0", "#eab8a0", "#e8d0b0"];
  const pebble = kind === "iron" ? ["#9a968c", "#7a7870", "#b0aca0"] : ["#a8a090", "#8a8478", "#c0b8a8"];
  for (let k = 0, n = Math.floor(G.span / (kind === "iron" ? 5 : 8)); k < n; k++) {
    const u = hash(seed + k, 64) * G.span;
    const off = -(tideAt(G, u) + (hash(seed + k, 65) - 0.5) * 4);
    const [x, y] = at(u, off);
    if (!onBoard(x, y, 3) || !clearOf(x, y, 4) || G.line[idx(G, u)] < 4) continue;
    const i = Math.round(x * PX), j = Math.round(y * PX), h = hash(seed + k, 66);
    if (h < 0.32) {
      // a shell: two pixels and a lit one
      const c = shells[Math.floor(hash(k, 67) * shells.length)];
      dot(ctx, i, j, c); dot(ctx, i + 1, j, darken(c, 0.18)); if (h < 0.12) dot(ctx, i, j - 1, lighten(c, 0.3));
    } else if (h < 0.62) {
      // a pebble: lit top-left, shade under
      const c = pebble[Math.floor(hash(k, 68) * pebble.length)];
      dot(ctx, i, j, c); dot(ctx, i + 1, j, c); dot(ctx, i, j - 1, lighten(c, 0.3)); dot(ctx, i + 1, j - 1, c);
      dot(ctx, i + 1, j + 1, X.wetDk); dot(ctx, i + 2, j, darken(c, 0.35));
    } else if (h < 0.9) {
      // a hank of weed along the line
      const len = 3 + Math.floor(hash(k, 69) * 5);
      for (let q = 0; q < len; q++) dot(ctx, i + q, j + (hash(k + q, 70) < 0.3 ? -1 : 0), q % 3 === 1 ? X.wrackLt : X.wrack);
    } else if (kind === "fen") {
      // a bleached bone
      dot(ctx, i, j, "#e0d8c4"); dot(ctx, i + 1, j, "#d0c8b0"); dot(ctx, i + 2, j, "#d0c8b0"); dot(ctx, i + 3, j, "#e0d8c4");
      dot(ctx, i, j + 1, "#b8b098"); dot(ctx, i + 3, j + 1, "#b8b098");
    }
  }
  // shingle: a scatter of pebbles over the dry sand (thicker in the Marches)
  for (let k = 0, n = Math.floor(G.span / (kind === "iron" ? 6 : 16)); k < n; k++) {
    const u = hash(seed + k, 71) * G.span, off = -(tideAt(G, u) + 2 + hash(seed + k, 72) * (beachW(G, u) - tideAt(G, u) - 4));
    const [x, y] = at(u, off);
    if (!onBoard(x, y, 3) || !clearOf(x, y, 4)) continue;
    if (vn(x, y, 20) < 0.45) continue;
    const i = Math.round(x * PX), j = Math.round(y * PX), c = pebble[Math.floor(hash(k, 73) * pebble.length)];
    dot(ctx, i, j, c); dot(ctx, i + 1, j, darken(c, 0.25)); dot(ctx, i, j - 1, lighten(c, 0.25));
  }

  // ---- driftwood, high on the dry sand ----
  const woodCol = kind === "fen" ? "#4a4038" : kind === "iron" ? "#9a9386" : "#ad9e86";
  let logs = 0;
  const logSpots = [];
  for (let k = 0; k < 20 && logs < 2; k++) {
    const u = 110 + hash(seed + k, 67) * (G.span - 240);
    // above the tideline, but never past the dune edge on a narrow beach
    // (a log lies along the shore: none where the shore runs steep)
    const bw = beachW(G, u);
    if (bw - wetAt(G, u) < 7.5 || G.nfM[idx(G, u)] < 0.8) continue;
    const dp = -Math.min(tideAt(G, u) + 4 + hash(seed + k, 68) * 4, bw - 4.5);
    const [x, y] = at(u, dp);
    const len = 22 + Math.floor(hash(k, 69) * 10);
    if (!onBoard(x, y, 24) || !clearOf(x, y, 16) || nearDecor(x, y, len / (2 * PX) + 8)) continue;
    const { cv, w, h, belly } = driftSprite(len, seed + k, woodCol);
    const i0 = Math.round(x * PX - w / 2), j0 = Math.round(y * PX - h / 2);
    // its shadow on the sand, down and right, under the ink
    for (const [bi, bj] of belly) { dot(ctx, i0 + bi + 2, j0 + bj + 1, X.dryDk); dot(ctx, i0 + bi + 3, j0 + bj + 2, X.dryDk); }
    ctx.drawImage(cv, i0 / PX, j0 / PX, w / PX, h / PX);
    logSpots.push([x, y, w / (2 * PX)]);
    logs++;
  }

  // ---- marram on the dune edge, gathered into drifts ----
  const g0 = R.GRASS_DK || "#5e8a3c", g1 = R.GRASS || "#82b256";
  const tones = kind === "fen"
    ? [darken(g0, 0.25), g0, mix(g1, "#a8a070", 0.4), mix(g1, "#c8c090", 0.55)]
    : [darken(mix(g0, "#6a7040", 0.3), 0.12), mix(g0, "#8a9058", 0.35), mix(g1, "#b8b878", 0.45), mix(g1, "#e8dca0", 0.6)];
  const cols = tones.map(rgb);
  const clumps = [];
  for (let u = 2, k = 0; u < G.span; u += 4 + hash(seed + k, 75) * 7, k++) {
    if (vn(u, 13.3, 38) < 0.4) continue;
    const i = idx(G, u), lim = -COAST.sand - Math.min(4.5, COAST.sand * (1 / G.nf[i] - 1));
    const dp = (lim + 1 + hash(seed + k, 76) * 7) * G.nf[i];
    const [x, y] = at(u, dp);
    if (!onBoard(x, y, 2) || !clearOf(x, y, 6) || G.line[i] + COAST.sand < 2 || nearDecor(x, y, 7)) continue;
    // nor over a log
    if (logSpots.some(([lx, ly, hl]) => Math.abs(lx - x) < hl + 5 && ly - y > -13 && ly - y < 3)) continue;
    clumps.push({ x, y, k });
  }
  clumps.sort((a, b) => a.y - b.y);
  const sprites = [0, 1, 2, 3, 4, 5].map((s) => marramSprite(seed + s * 17, cols));
  for (const c of clumps) {
    const cv = sprites[Math.floor(hash(c.k, 77) * sprites.length)];
    const i0 = Math.round(c.x * PX) - 10, j0 = Math.round(c.y * PX) - 22;
    // a contact shadow on the sand, down and right of its root
    for (let q = 0; q < 8; q++) dot(ctx, i0 + 8 + q, j0 + 23, X.dryDk);
    ctx.drawImage(cv, i0 / PX, j0 / PX, cv.width / PX, cv.height / PX);
  }
}

// ---- the live shore ---------------------------------------------------------
// The swash: along the shore, columns one world unit wide; each runs a thin
// sheet of water up the wet sand and back on its own phase, a foam front on
// its lip that breaks up as it drains. A few glints wink on the swell.
let LIVE = null;
const liveGeo = () => {
  if (LIVE && LIVE.coast === COAST && LIVE.id === REALM.id) return LIVE;
  const G = geo(), T = coastTones(REALM), X = T.hex;
  const us = [], vs = [], reach = [], ph = [], hs = [];
  // the swash parts round the rocks at the waterline: it never washes over
  // one (and where the sea lies up the screen the sand in its lee stays dry)
  const skip = rockSpots(G).shoreRocks.map((r) => [r.u - 6, r.u + 9]);
  for (let u = 0; u < G.span; u++) {
    if (G.along && u > W - WALL_W + 2) break;
    // beside a rock the swash runs shorter, curving round it
    let dd = 99;
    for (const [a, b] of skip) dd = Math.min(dd, u + 0.5 < a ? a - u - 0.5 : u + 0.5 > b ? u + 0.5 - b : 0);
    if (dd <= 0) continue;
    const i = idx(G, u + 0.5), v = G.line[i];
    if (v < 1.5) continue;
    us.push(u); vs.push(v);
    reach.push((2.2 + 2.8 * vn(u, 7.7, 31)) / G.nf[i] * (dd < 8 ? Math.sqrt(dd / 8) : 1));
    ph.push(u * 0.0045 + vn(u, 3.3, 47) * 0.9);
    // the foam front dies back in runs of a few columns, not one by one
    hs.push(Math.min(1, Math.max(0, (vn(u, 7.3, 3.5) - 0.22) / 0.56)) * 0.85 + hash(u, 7) * 0.15);
  }
  // glints: spots on the open water, each winking on its own beat
  const glints = [];
  for (let k = 0; k < 60 && glints.length < 16; k++) {
    const u = hash(k, 301) * G.span, i = idx(G, u), dp = 14 + hash(k, 302) * 40;
    const [x, y] = toXY(G.edge, u, G.line[i] - dp / G.nf[i]);
    if (x < 4 || y < 3 || x > W - WALL_W - 6 || y > H - 3 || G.line[i] - dp / G.nf[i] < 3) continue;
    glints.push([Math.round(x * PX) / PX, Math.round(y * PX) / PX, hash(k, 303) * 6.28, 0.7 + hash(k, 304) * 0.8]);
  }
  LIVE = {
    coast: COAST, id: REALM.id, edge: G.edge, n: us.length,
    us: Float32Array.from(us), vs: Float32Array.from(vs), reach: Float32Array.from(reach), ph: Float32Array.from(ph), hs: Float32Array.from(hs),
    sheet: rgba(X.ramp[2], 0.55), foam: X.ramp[0], lace: rgba(X.ramp[1], 0.8), glint: lighten(X.ramp[0], 0.3), glints,
  };
  return LIVE;
};

export function drawShoreLive(ctx, g) {
  if (!COAST) return;
  const L = liveGeo(), t = g.time || 0, e = L.edge, n = L.n;
  const hp = 1 / PX;
  const sn = (v) => Math.round(v * PX) / PX;
  // a rect in (u, v) space: [u, u + du) x [v0, v1); a column the same as the
  // one before it just widens that one (neighbours often agree on the art
  // grid), which keeps the fills to a few hundred rects
  const rect = (arr, u, du, v0, v1) => {
    if (v1 - v0 < hp * 0.5) return;
    const m = arr.length - 4;
    if (m >= 0 && arr[m + 2] === v0 && arr[m + 3] === v1 && arr[m] + arr[m + 1] === u) { arr[m + 1] += du; return; }
    arr.push(u, du, v0, v1);
  };
  const sheet = [], foam = [], lace = [];
  // the last column's foam front, so on a steep shore the fronts join in a
  // stair instead of a row of dots
  let pu = -9, pf = 0;
  for (let k = 0; k < n; k++) {
    const p = t * 0.12 + L.ph[k], f0 = p - Math.floor(p);
    if (f0 > 0.82) continue;
    const q = f0 / 0.82;
    // up fast, easing to a stop, then draining back quicker and quicker
    const rise = q < 0.3;
    const f = rise ? 1 - (1 - q / 0.3) ** 2 : 1 - ((q - 0.3) / 0.7) ** 2;
    const v = L.vs[k], front = sn(v + f * L.reach[k]), base = sn(v) - hp;
    if (front <= base + hp) continue;
    const u = L.us[k];
    // the sheet: one staircase outline per unbroken run of columns
    if (sheet.length && sheet[sheet.length - 1] === u) sheet.push(base, front, u + 1);
    else sheet.push(NaN, u, base, front, u + 1);
    // the foam front breaks up as the sheet drains
    const drain = rise ? 0 : (q - 0.3) / 0.7;
    if (L.hs[k] < drain * 0.85) continue;
    const joined = pu === u - 1 && Math.abs(pf - front) > hp;
    rect(foam, u, 1, joined ? Math.min(front, pf + hp) : front, joined ? Math.max(front, pf - hp) + hp : front + hp);
    pu = u; pf = front;
    if (rise && L.hs[k] > 0.35) rect(foam, u, 1, front - hp, front);
    else if (rise || L.hs[k] > 0.6) rect(lace, u, 1, front - hp, front);
  }
  const fill = (arr, style) => {
    if (!arr.length) return;
    ctx.fillStyle = style;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i += 4) {
      const u = arr[i], du = arr[i + 1], v0 = arr[i + 2], v1 = arr[i + 3];
      if (e === "top") ctx.rect(u, v0, du, v1 - v0);
      else if (e === "bottom") ctx.rect(u, H - v1, du, v1 - v0);
      else if (e === "left") ctx.rect(v0, u, v1 - v0, du);
      else ctx.rect(W - v1, u, v1 - v0, du);
    }
    ctx.fill();
  };
  // the sheet's runs: fronts left to right, then the bases back
  if (sheet.length) {
    ctx.fillStyle = L.sheet;
    ctx.beginPath();
    const pt = (u, v) => (e === "top" ? ctx.lineTo(u, v) : e === "bottom" ? ctx.lineTo(u, H - v) : e === "left" ? ctx.lineTo(v, u) : ctx.lineTo(W - v, u));
    for (let i = 0; i < sheet.length;) {
      // a run: NaN, u0, then (base, front, u + 1) per column
      const s0 = i + 2;
      let j = s0;
      while (j < sheet.length && !Number.isNaN(sheet[j])) j += 3;
      const u0 = sheet[i + 1];
      const [mx, my] = e === "top" ? [u0, sheet[s0]] : e === "bottom" ? [u0, H - sheet[s0]] : e === "left" ? [sheet[s0], u0] : [W - sheet[s0], u0];
      ctx.moveTo(mx, my);
      let uu = u0;
      for (let k = s0; k < j; k += 3) { pt(uu, sheet[k + 1]); pt(sheet[k + 2], sheet[k + 1]); uu = sheet[k + 2]; }
      for (let k = j - 3; k >= s0; k -= 3) { pt(sheet[k + 2], sheet[k]); pt(sheet[k + 2] - 1, sheet[k]); }
      ctx.closePath();
      i = j;
    }
    ctx.fill();
  }
  fill(lace, L.lace);
  fill(foam, L.foam);
  // glints on the swell: a pixel, and at its brightest a small cross
  ctx.fillStyle = L.glint;
  for (const [x, y, ph0, sp] of L.glints) {
    const s = Math.sin(t * sp + ph0);
    if (s < 0.72) continue;
    ctx.fillRect(x, y, hp, hp);
    if (s > 0.9) { ctx.fillRect(x - hp, y, hp * 3, hp); ctx.fillRect(x, y - hp, hp, hp * 3); }
  }
}
