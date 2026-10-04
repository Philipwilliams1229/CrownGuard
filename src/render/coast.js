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
// - drawShoreLive (every frame) is the sea's motion, all on the swell's one
//   clock: three crests roll in from 108 units out at 5.5 units a second
//   (the Rimewater's slower, a narrow inlet's smaller), each a broken line
//   of lit water with its shade under it bent to the depth contours; at the
//   bar a crest steepens and breaks into a line of foam that runs over the
//   shallows dissolving in runs, parts round the rocks awash (foam heaped on
//   their seaward faces, a lee of flat water behind) and never crosses a
//   river's mouth (water.js riverMouths: a standing chop bobs there); at the
//   lip it feeds the swash, a thin sheet with a foam front sliding up the wet
//   sand and back in step with the crests (later in the bays), every wave's
//   size shared along the shore, leaving foam flecks and a wet gleam at its
//   high-water mark that go pixel by pixel; glints ride the sunlit crests.
//   Fast ice (SEA_ICE.at) stops all of it. Rects on the art grid merged
//   along the shore, a fill per tone: ~0.8 ms a frame in headless Chromium
//   on the cloud box, where the old swash alone read 0.43.
//
import { W, H, PATH_HALF, WALL_W } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { nearestOnPath, PTS } from "../engine/path.js";
import { wallDrums, TOWER, GATE_TOWER_N, GATE_TOWER_S } from "../data/castle.js";
import { COAST, DECOR, coastLine, forestDepthAt } from "../data/terrain.js";
import { lighten, darken, mix, rgb, rgba, hash, inkOutline, PX } from "./paint.js";
// (rivers and their mouths are water.js's; read defensively, it may not export them yet)
import * as WATER from "./water.js";

const DEF_WATER = { deep: "#3a6a7c", edge: "#4a8094", shine: "#8cc4d8" };
// each country's sand: the Vale's warm gold, the Marches' grey shingle-sand,
// the fen's drab silt
const SANDS = { vale: "#dcc48e", iron: "#c2b89c", fen: "#9e977c" };
// (the Rimewater takes the Iron coast's shingle, in its own cold `coastSand`)
const land = (R) => (R.groundArt === "iron" || R.groundArt === "rime" ? "iron" : R.groundArt === "fen" ? "fen" : "vale");

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
  // the river mouths (water.js, when it has them), as u along the edge and
  // a half-width: no breakers, surf or swash across a channel
  GEO.mouths = (WATER.riverMouths?.() ?? []).map((m) => ({ u: toUV(COAST.edge, m.x, m.y)[0], hw: m.hw || 8 }));
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
// how much a river's mouth takes the surf off u: 0 clear of it, rising over
// the last hw * 0.8 toward the channel to 1 at hw * 0.7 from its middle
// (the band dies into the plume, no cut edge)
const mouthAt = (G, u) => { let m = 0; for (const o of G.mouths) m = Math.max(m, Math.min(1, (o.hw * 1.5 - Math.abs(u - o.u)) / (o.hw * 0.8))); return m; };
const nearMouth = (G, u) => mouthAt(G, u) >= 1;
const idx = (G, u) => { const i = Math.round((u - U0) * 2); return i < 0 ? 0 : i >= G.n ? G.n - 1 : i; };
// (x, y) → [u along the edge, v in from it]
const toUV = (edge, x, y) => (edge === "top" ? [x, y] : edge === "bottom" ? [x, H - y] : edge === "left" ? [y, x] : [y, W - x]);
const toXY = (edge, u, v) => (edge === "top" ? [u, v] : edge === "bottom" ? [u, H - v] : edge === "left" ? [v, u] : [W - v, u]);

// ---- the palette -------------------------------------------------------------
// The sea's ramp, lightest first: foam, lace, the shallows over sand, the
// shallows, then out through the blue to the deep. A swell's crest is one
// step lighter than the water it rides, its shade one step darker.
export const coastTones = (R) => {
  const wat = R.water || DEF_WATER, kind = land(R), sand = R.coastSand || SANDS[kind];
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
const breakAt = (G, u, i) => Math.max(5.5, 9 + 2 * Math.sin(u * 0.031 + G.seed) + 2.6 * (vn(u, 11.5, 23) - 0.5) + (G.line[i] - G.lineM[i]) * 0.9) + (G.mouths ? mouthAt(G, U0 + i / 2) * 4 : 0);
// where the breakers are spilling (foam) rather than still standing (a lit swell)
const breaking = (u) => vn(u, 7.1, 6) > 0.42;
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
  // (half what it was: the baked crests are the surface's texture now; the
  // swell that moves is drawShoreLive's)
  const dens = (kd < 26 ? 0.33 : kd < 46 ? 0.25 : kd < 68 ? 0.19 : 0.14) * (0.4 + 0.6 * st);
  if (h > dens) return 0;
  // and a crest may fall at most ~4 art pixels across its length, so on a
  // slanting shore it stays a short dash, not a long hairline stair
  const sl = Math.sqrt(Math.max(0, 1 / (nfs * nfs) - 1));
  const len = Math.min(0.38 + 0.34 * hash(r * 977 + s, 13), sl > 0.02 ? 2.1 / (sl * L) : 1);
  if (g > len) return 0;
  const gg = g / len, a = (0.4 + 0.65 * hash(r * 977 + s, 14)) * 4 * gg * (1 - gg) * st;
  const ff = f - a;
  if (ff < 0 || ff >= px) return 0;
  // (no baked glints: the sun rides the moving crests, drawShoreLive)
  return gg > 0.22 && gg < 0.78 ? 2 : 1;
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
    if (fbA >= 0 && fbA < 2 * px && breaking(uA) && vn(uA, 9.4, 3) > mouthAt(G, U0 + iA / 2) * 1.05) return R[4];
    // lace over the shallows: streaks strung along the shore, thinning out
    // toward the breakers
    const n = vn(u * 0.28, dp, 2.1), w = (0.012 + 0.06 * (1 - dp / cb)) * (1 - mouthAt(G, U0 + i / 2));
    if (Math.abs(n - 0.5) < w && vn(u, 3.3 + dp * 0.3, 5) > 0.38) return R[1];
    return dp < 4.2 + (vn(x, y, 5) - 0.5) * 3 ? R[2] : R[3];
  }
  // the breakers' crest: foam where it spills, a lit swell where it stands;
  // spray thrown back ragged over the wave's back
  const mth = mouthAt(G, U0 + i / 2), brk = breaking(u) && vn(u, 9.4, 3) > mth * 1.05;
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
    // (dp and big: the live swell wraps round the group, see drawShoreLive)
    rocks.push({ u, x, y, k, dp, big: 7 + Math.floor(hash(k, 63) * 5) });
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
// The sea moves on ONE clock, the swell's. SW_N crests spaced SW_S units
// apart roll in from SW_K units out at SW_SPEED units a second (the
// Rimewater's slower, a narrow inlet's smaller: `open`), each a broken line
// of lit water with its shade under it, bent to the depth contours (`deep`,
// the same the bands follow) and bowed between its gaps, a glint riding the
// middle of a sunlit segment. Reaching the bar (`breakAt`, the headlands a
// little before the bays) a crest steepens, breaks into a line of foam that
// runs on over the shallows dissolving in runs, parts round the rocks awash
// (foam heaped on their seaward faces, a lee of flat water behind) and never
// crosses a river's mouth (water.js riverMouths, where a standing chop bobs
// instead); at the lip it feeds the swash, whose columns rise on the same
// clock a little later in the bays, every crest's size shared along the
// whole shore (so a big wave comes every so often), leaving a drift of foam
// flecks and a wet gleam at its high-water mark that go pixel by pixel.
// Fast ice (SEA_ICE.at, set by the Rimewater's scenery) stops the swell.
// Everything is rects on the art grid, merged along the shore, a fill per
// tone: ~0.25 ms a frame on the dev box.
const SW_S = 36, SW_N = 3, SW_K = SW_S * SW_N, SW_KS = 2, SW_SPEED = 5.5;
// the Rimewater's scenery may set `at(x, y)` true where fast ice lies on the
// sea: no crest, surf or swash there
export const SEA_ICE = { at: null };
let LIVE = null;
const liveGeo = () => {
  if (LIVE && LIVE.coast === COAST && LIVE.id === REALM.id && LIVE.ice === SEA_ICE.at) return LIVE;
  const G = geo(), T = coastTones(REALM), X = T.hex, R = T.ramp, ice = SEA_ICE.at;
  const cold = REALM.groundArt === "rime";
  const speed = cold ? SW_SPEED * 0.65 : SW_SPEED;
  // a narrow inlet is sheltered: a smaller swell, a shorter swash
  const open = Math.min(1, Math.max(0.4, ((COAST.to ?? 1e9) - (COAST.from ?? -1e9)) / 420));
  // the river mouths (water.js, when it has them): no surf or swash across
  // a channel, a chop where the current meets the swell
  const mouths = G.mouths;
  // ---- the columns, half a unit wide: where each depth K lies (VT), the bar
  const nc = Math.floor(G.span * 2), NK = SW_K / SW_KS + 1;
  const VT = new Float32Array(nc * NK).fill(NaN), cbK = new Float32Array(nc), ok = new Uint8Array(nc), mt = new Float32Array(nc);
  const arcC = new Float32Array(nc), stC = new Float32Array(nc), xC = new Float32Array(nc), yC = new Float32Array(nc);
  for (let c = 0; c < nc; c++) {
    const u = (c + 0.5) / 2, i = idx(G, u);
    const line = G.line[i], nf = G.nf[i], lineS = G.lineS[i], nfS = G.nfS[i];
    arcC[c] = G.arcS[i];
    const nfs = nfK(G, i, 20); stC[c] = nfs * nfs;
    if (line < 2 || (G.along && u > W - WALL_W - 13)) continue;
    mt[c] = mouthAt(G, u); ok[c] = mt[c] >= 1 ? 2 : 1;
    const cb = breakAt(G, G.arc[i], i);
    // the bar in K, the headlands (the shore out past its smoothed line)
    // breaking first
    cbK[c] = deep(cb, (lineS - line + cb / nf) * nfS) + Math.min(5, Math.max(0, lineS - line) * 0.22);
    let kNext = 0, pK = -1, pV = line;
    for (let v = line; v >= 0 && kNext < NK; v -= 0.25) {
      const sd = line - v, K = deep(sd * nf, (lineS - v) * nfS);
      while (kNext < NK && K >= kNext * SW_KS) {
        const tk = kNext * SW_KS, f = K > pK ? (tk - pK) / (K - pK) : 1;
        VT[c * NK + kNext] = pV + (v - pV) * Math.min(1, Math.max(0, f));
        kNext++;
      }
      pK = K; pV = v;
    }
    [xC[c], yC[c]] = toXY(G.edge, u, line - 20 / nf);
  }
  // the deepest K any column reaches: a crest farther out has nothing to draw
  let maxK = 0;
  for (let c = 0; c < nc; c++) for (let k = NK - 1; k > maxK / SW_KS; k--) if (VT[c * NK + k] === VT[c * NK + k]) { maxK = k * SW_KS; break; }
  // ---- the rocks awash: their span along the shore, depth in K, seaward face
  const rocks = rockSpots(G).rocks.map((r) => {
    const i = idx(G, r.u), nf = G.nf[i];
    const K = deep(r.dp, (G.lineS[i] - G.line[i] + r.dp / nf) * G.nfS[i]);
    const hw = (r.big * 3 + 4) / (2 * PX);
    return { u: r.u + (r.big + 2) / (2 * PX), hw, K, top: Math.round(r.big * 0.72) / PX + 0.5, k: r.k };
  });
  // which rock's window each column lies in (-1 none), and how far from it
  const rockOf = new Int8Array(nc).fill(-1), rockDu = new Float32Array(nc);
  rocks.forEach((rk, j) => {
    for (let c = Math.max(0, Math.floor((rk.u - rk.hw - 1.5) * 2)); c < Math.min(nc, Math.ceil((rk.u + rk.hw + 1.5) * 2)); c++) { rockOf[c] = j; rockDu[c] = Math.abs(c / 2 - rk.u); }
  });
  // ---- the swash's columns, one unit wide
  const us = [], vs = [], reach = [], del = [], hs = [];
  const skip = rockSpots(G).shoreRocks.map((r) => [r.u - 6, r.u + 9]);
  for (let u = 0; u < G.span; u++) {
    if (G.along && u > W - WALL_W + 2) break;
    const mth = mouthAt(G, u + 0.5);
    if (mth >= 1) continue;
    let dd = 99;
    for (const [a, b] of skip) dd = Math.min(dd, u + 0.5 < a ? a - u - 0.5 : u + 0.5 > b ? u + 0.5 - b : 0);
    if (dd <= 0) continue;
    const i = idx(G, u + 0.5), v = G.line[i];
    if (v < 1.5) continue;
    // no swash where fast ice lies on the waterline
    if (ice) { const [ix, iy] = toXY(G.edge, u + 0.5, v - 1); if (ice(ix, iy)) continue; }
    us.push(u); vs.push(v);
    reach.push((2.4 + 2.8 * vn(u, 7.7, 31)) / G.nf[i] * (dd < 8 ? Math.sqrt(dd / 8) : 1) * open * (1 - mth));
    // the swash comes later in the bays (the shore in from its smoothed
    // line), and columns drift a little out of step in runs
    del.push(Math.min(5, Math.max(0, G.line[i] - G.lineS[i]) * 0.2) + 1.6 * vn(u, 3.3, 47));
    hs.push(Math.min(1, Math.max(0, (vn(u, 7.3, 3.5) - 0.22) / 0.56)) * 0.85 + hash(u, 7) * 0.15);
  }
  // the chop at a river's mouth: three dashes across it, bobbing out of step
  const chop = [];
  for (const m of mouths) {
    for (let k = -1; k <= 1; k++) {
      const u = m.u + k * m.hw * 0.55, i = idx(G, u);
      if (G.line[i] < 6) continue;
      chop.push({ u, v: G.line[i] - (3.2 + (k ? 1.4 : 0)) / G.nf[i], ph: k * 2.1 + m.u * 0.3 });
    }
  }
  const foam = cold ? mix(X.ramp[0], "#b8c4c8", 0.4) : X.ramp[0];
  const lace = cold ? mix(X.ramp[1], "#9aa8b0", 0.35) : X.ramp[1];
  LIVE = {
    coast: COAST, id: REALM.id, ice, edge: G.edge, along: G.along, speed, open, cold,
    nc, NK, VT, cbK, ok, mt, arcC, stC, xC, yC, maxK, rocks, rockOf, rockDu, chop, crest: [],
    n: us.length, us: Float32Array.from(us), vs: Float32Array.from(vs), reach: Float32Array.from(reach), del: Float32Array.from(del), hs: Float32Array.from(hs),
    sheet: rgba(X.ramp[2], 0.55),
    // the fill styles, by index: the ramp 0-8, then foam, lace, the gleam, the glint
    styles: [...R.map((c) => `rgb(${c[0]},${c[1]},${c[2]})`), foam, lace, X.sheenLt, lighten(X.ramp[0], 0.3)],
  };
  return LIVE;
};
const S_FOAM = 9, S_LACE = 10, S_GLEAM = 11, S_GLINT = 12;
// A crest's pattern along the shore, fixed for its life (one generation, the
// run in from SW_K): per column its segment's gap/tail/middle, its bow, the
// sunlit segments, and the surf's dissolving. Rebuilt when the crest wraps.
const crestOf = (L, r, gen) => {
  let C = L.crest[r];
  if (C && C.gen === gen) return C;
  const nc = L.nc, seed = r * 977 + gen * 131;
  if (!C) C = L.crest[r] = { gen: -1, hN: new Float32Array(nc), bow: new Float32Array(nc), kind: new Uint8Array(nc), dis: new Float32Array(nc), lace: new Uint8Array(nc) };
  C.gen = gen;
  const segL = 17 + 9 * hash(seed, 21);
  for (let c = 0; c < nc; c++) {
    const q = (L.arcC[c] + r * 29.3 + gen * 13.7) / segL, s = Math.floor(q), gg = q - s;
    const h = hash(seed + s * 7, 12), st = L.stC[c];
    const len = 0.5 + 0.4 * hash(seed + s * 7, 13), g2 = gg / len;
    // hN against the crest's density at its depth says whether this column
    // shows; past the segment's end, or where the contour runs steep, never
    C.hN[c] = gg > len || st < 0.5 ? 9 : h / (0.4 + 0.6 * st);
    C.bow[c] = (0.3 + 0.6 * hash(seed + s * 7, 14)) * st * 4 * g2 * (1 - g2);
    // 1 a tail, 2 the middle (shaded under), 3 the middle of a glinting
    // segment; +4 sunlit
    C.kind[c] = (g2 > 0.44 && g2 < 0.56 && h < 0.2 ? 3 : g2 > 0.15 && g2 < 0.85 ? 2 : 1) + (hash(seed + s * 7, 15) < 0.3 ? 4 : 0);
    C.dis[c] = hash(c >> 2, seed + 3);
    C.lace[c] = hash(c, seed + 4) < 0.5 ? 1 : 0;
  }
  return C;
};
// the row (in from the edge) where depth K lies in column c; NaN past the board
const vAt = (L, c, K) => {
  if (K < 0 || K >= SW_K) return NaN;
  const q = K / SW_KS, k0 = q | 0, f = q - k0, o = c * L.NK + k0;
  const a = L.VT[o], b = L.VT[o + 1];
  return a === a && b === b ? a + (b - a) * f : NaN;
};

export function drawShoreLive(ctx, g) {
  if (!COAST) return;
  const L = liveGeo(), t = g.time || 0, e = L.edge, n = L.n;
  const hp = 1 / PX;
  const sn = (v) => Math.round(v * PX) / PX;
  // a rect in (u, v) space: [u, u + du) x [v0, v1), gathered per fill style;
  // a column the same as the one before it just widens that one
  const batches = L.styles.map(() => []);
  const rect = (si, u, du, v0, v1) => {
    if (v1 - v0 < hp * 0.5) return;
    const arr = batches[si], m = arr.length - 4;
    if (m >= 0 && arr[m + 2] === v0 && arr[m + 3] === v1 && arr[m] + arr[m + 1] === u) { arr[m + 1] += du; return; }
    arr.push(u, du, v0, v1);
  };
  // the pixel under one on screen, in v: shoreward on a top coast, seaward
  // on a bottom one (the sun stands upper left whichever way the sea lies)
  const below = e === "bottom" ? -hp : hp;
  const ice = SEA_ICE.at;

  // ---- the swell and the surf ----
  const nc = L.nc, NK = L.NK, VT = L.VT, cold = L.cold, rocks = L.rocks, rockOf = L.rockOf, rockDu = L.rockDu, okA = L.ok, mtA = L.mt, cbA = L.cbK, xA = L.xC, yA = L.yC;
  for (let r = 0; r < SW_N; r++) {
    const ph = (t * L.speed + r * SW_S) / SW_K, gen = Math.floor(ph);
    const seed = r * 977 + gen * 131;
    const K = SW_K * (1 - (ph - gen)) + (hash(seed, 22) - 0.5) * 5;
    if (K < 0) continue;
    if (K > L.maxK + 2) continue;
    const C = crestOf(L, r, gen), hN = C.hN, bowA = C.bow, kindA = C.kind, dis = C.dis, laceA = C.lace;
    const band = K < 25 ? 4 : K < 43 ? 5 : K < 66 ? 6 : 7;
    const far = K > SW_K - 18 ? (SW_K - K) / 18 : 1;
    const dens = (K < 26 ? 0.72 : K < 46 ? 0.58 : K < 68 ? 0.45 : 0.3) * L.open * far;
    // the lit crest two steps up the ramp from its water, its shade one down
    const shadeI = Math.min(8, band + 1), litI = band - 2, steepI = Math.max(1, band - 3);
    // far out the contours are smooth: whole-unit columns do (half the work)
    const step = K > 30 ? 2 : 1, du = step / 2;
    for (let c = 0; c < nc; c += step) {
      if (!okA[c]) continue;
      const cb = cbA[c];
      if (K < cb - 11) continue;
      const u = c / 2, rj = rockOf[c];
      let Kc, si, shade = false;
      if (K >= cb) {
        // a crest: in segments with gaps between, each bowed seaward in its
        // middle, thinner and shorter where its contour runs steep (and
        // none over a river's plume, where the current flattens it)
        // (and they thin out into a river's plume, where the current flattens them)
        if (hN[c] > dens * (1 - mtA[c] * (K < cb + 14 ? 1 : 0.6))) continue;
        Kc = K + bowA[c];
        // round the rocks awash: a lee of flat water behind each, and the
        // crest bows out round its seaward face
        if (rj >= 0) {
          const rk = rocks[rj];
          if (Kc > rk.K - 9 && Kc < rk.K + rk.top + 1.5) continue;
          if (Kc < rk.K + rk.top + 5) Kc += (1 - rockDu[c] / (rk.hw + 1.5)) * 1.2;
        }
        const steep = Kc - cb < 6, kind = kindA[c];
        // sunlit segments catch a step more light; the glint rides the middle
        if (!cold && (kind & 3) === 3 && hN[c] < dens * 0.3 && K < 62) si = S_GLINT;
        else { si = Math.max(1, (steep ? steepI : litI) - (kind & 4 ? 1 : 0)); shade = steep || (kind & 3) >= 2; }
      } else {
        // the surf: a line of foam running on over the shallows, dying back
        // in runs; none across a river's mouth, none in a rock's lee
        if (okA[c] === 2) continue;
        const age = (cb - K) / Math.max(4, cb - 1);
        if (dis[c] > 1.1 - age * 1.1 - mtA[c] * 1.2) continue;
        if (rj >= 0) { const rk = rocks[rj]; if (K > rk.K - 9 && K < rk.K + rk.top + 1.5) continue; }
        Kc = K; si = age > 0.5 && laceA[c] ? S_LACE : S_FOAM;
        if (age < 0.3) si = -1;   // white water: the bore and its lace behind
      }
      // the row where Kc lies in this column (vAt, inlined)
      if (Kc >= SW_K) continue;
      const q = Kc / SW_KS, k0 = q | 0, o = c * NK + k0, va = VT[o], vb = VT[o + 1];
      if (va !== va || vb !== vb) continue;
      if (ice && ice(xA[c], yA[c])) continue;
      const vs = Math.round((va + (vb - va) * (q - k0)) * PX) * hp;
      if (si < 0) { rect(S_FOAM, u, du, vs, vs + hp); rect(S_LACE, u, du, vs - below, vs - below + hp); continue; }
      rect(si, u, du, vs, vs + hp);
      if (shade) rect(shadeI, u, du, vs + below, vs + below + hp);
    }
    // foam heaped on a rock's seaward face as the crest reaches it
    for (const rk of L.rocks) {
      const d = K - (rk.K + rk.top + 1.5);
      if (d < -1.5 || d > 3.5) continue;
      const c0 = Math.max(0, Math.floor((rk.u - rk.hw) * 2)), c1 = Math.min(nc - 1, Math.ceil((rk.u + rk.hw) * 2));
      for (let c = c0; c <= c1; c++) {
        if (!L.ok[c]) continue;
        const f = 1 - Math.abs(c / 2 - rk.u) / rk.hw, v = vAt(L, c, rk.K + rk.top);
        if (v !== v || f < 0.08) continue;
        const vs = sn(v);
        if (hash(c, seed + 5) < 0.55 + f * 0.4) rect(S_FOAM, c / 2, 0.5, vs - hp, vs);
        if (hash(c, seed + 6) < f * 0.7 - 0.1) rect(d > 1.5 ? S_LACE : S_FOAM, c / 2, 0.5, vs - 2 * hp, vs - hp);
      }
    }
  }

  // ---- the swash, on the swell's clock ----
  const sheet = [];
  let pu = -9, pf = 0;
  for (let k = 0; k < n; k++) {
    const p = (t * L.speed + 1.5 - L.del[k]) / SW_S, wave = Math.floor(p), f0 = p - wave;
    const u = L.us[k], v = L.vs[k];
    // this crest's size, shared along the whole shore
    const A = 0.5 + 0.7 * hash(wave, 5);
    const hi = sn(v + A * L.reach[k]), base = sn(v) - hp;
    // what the last wave left: a drift of foam flecks at its high-water mark
    // and a wet gleam under it, going pixel by pixel as the sand dries
    if (f0 > 0.3) {
      const age = Math.min(1, (f0 - 0.3) / 0.6);
      if (hash(u, wave * 3 + 1) < 0.55 * (1 - age) && L.hs[k] > 0.3) rect(S_LACE, u, 1, hi, hi + hp);
      if (hash(u >> 2, wave * 3 + 2) < 0.8 * (1 - age)) rect(S_GLEAM, u, 1, hi - hp, hi);
    }
    if (f0 > 0.82) continue;
    const q = f0 / 0.82;
    // up fast, easing to a stop, then draining back quicker and quicker
    const rise = q < 0.3;
    const f = rise ? 1 - (1 - q / 0.3) ** 2 : 1 - ((q - 0.3) / 0.7) ** 2;
    const front = sn(v + f * A * L.reach[k]);
    if (front <= base + hp) continue;
    if (sheet.length && sheet[sheet.length - 1] === u) sheet.push(base, front, u + 1);
    else sheet.push(NaN, u, base, front, u + 1);
    const drain = rise ? 0 : (q - 0.3) / 0.7;
    if (L.hs[k] < drain * 0.85) continue;
    const joined = pu === u - 1 && Math.abs(pf - front) > hp;
    rect(S_FOAM, u, 1, joined ? Math.min(front, pf + hp) : front, joined ? Math.max(front, pf - hp) + hp : front + hp);
    pu = u; pf = front;
    if (rise && L.hs[k] > 0.35) rect(S_FOAM, u, 1, front - hp, front);
    else if (rise || L.hs[k] > 0.6) rect(S_LACE, u, 1, front - hp, front);
  }
  // ---- the chop at a river's mouth: dashes bobbing on the swell ----
  for (const ch of L.chop) {
    const vs = sn(ch.v + 0.7 * Math.sin(t * 1.1 + ch.ph)), u0 = Math.round(ch.u * 2) / 2 - 0.5;
    rect(2, u0, 1.5, vs, vs + hp);
    rect(1, u0 + 0.5, 0.5, vs - hp, vs);
  }

  // ---- the fills ----
  // the sheet's runs: fronts left to right, then the bases back
  if (sheet.length) {
    ctx.fillStyle = L.sheet;
    ctx.beginPath();
    const pt = (u, v) => (e === "top" ? ctx.lineTo(u, v) : e === "bottom" ? ctx.lineTo(u, H - v) : e === "left" ? ctx.lineTo(v, u) : ctx.lineTo(W - v, u));
    for (let i = 0; i < sheet.length;) {
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
  for (let si = 0; si < batches.length; si++) {
    const arr = batches[si];
    if (!arr.length) continue;
    ctx.fillStyle = L.styles[si];
    ctx.beginPath();
    for (let i = 0; i < arr.length; i += 4) {
      const u = arr[i], du = arr[i + 1], v0 = arr[i + 2], v1 = arr[i + 3];
      if (e === "top") ctx.rect(u, v0, du, v1 - v0);
      else if (e === "bottom") ctx.rect(u, H - v1, du, v1 - v0);
      else if (e === "left") ctx.rect(v0, u, v1 - v0, du);
      else ctx.rect(W - v1, u, v1 - v0, du);
    }
    ctx.fill();
  }
}
