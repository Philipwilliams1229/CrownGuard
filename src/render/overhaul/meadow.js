// The overhaul: the calm meadow (art/briefs/overhaul-build-millrace.md, B5; the owner's pick: round 2's
// meadow "1. Calm", concept/overhaul2-ground.js `repaint(..., "meadow", { k: 1 })`).
//
// BAKE ONLY. Registers the `ground` slot: world.js groundLayer calls it after paintTurf, before the road
// and the water. It repaints the turf (every pixel but the wood's floor, and the sea where there is one)
// into the calm meadow:
//   - big quiet masses: world-space value noise (~165 units) cut into the realm's own turf ramp
//     (turfTones: tones 2 / 2 / 3 / 4, cool hollows, warm dry rises), their edges frayed in the game's own
//     blade strokes (DITH), sparse dark blade flecks thicker on the masses' rims;
//   - the swells lit from the LEVEL'S sun (world.js reliefOf: the same convention as today's turf and the
//     apron), damper and darker toward water;
//   - two stands of tall grass in seed (a low prism with a lit back rim, a dark front of blades and a
//     shadow along DAY.fall), one white-and-buttercup drift;
//   - edges: a trampled verge along the road (under the road's own edge), damp turf and a few rushes at
//     the water, a shade pool down-sun of each lone tree and rock, the wood's foot in shade with a ragged
//     fringe of long grass (it REPLACES today's hem of bushes: OVH.flags.hem = false, see below).
// Everything is world-space (absolute art px = 2 x board units), so the same numbers run on past the
// board's edge (overhaul/apron.js `apronGround`) without a seam. Nothing is kept after the bake.
//
// THE HEM (today's bushes and ferns along the treeline): OFF under the overhaul. They are the old
// bushSprite (still listed as old-style), and at noon they are drawn inside paintTurf BEFORE this pass,
// so the repaint would cut them; the meadow paints the wood's foot itself (shade band + long-grass
// fringe, flat, in the ground), and the standing silhouette at the edge is the trees builder's wood.
//
// For the lead: meadowKey() (append to OVH.key); MEADOW_PROF (ms of the last bake, parts).
import { register, OVH } from "./index.js";
import { W, H, PATH_HALF, WALL_W } from "../../data/constants.js";
import { posAt, TOTAL_LEN } from "../../engine/path.js";
import { RIVERS, PONDS, FOREST, COAST, DECOR, forestDepthAt, riverPast, inSea } from "../../data/terrain.js";
import { REALM } from "../../data/maps.js";
import { DAY } from "../../data/sun.js";
import { turfTones, DITH, reliefOf } from "../world.js";
import * as WATER from "./water.js";

export const MEADOW_V = 1;
export const meadowKey = () => `m${MEADOW_V}`;
export const MEADOW_PROF = {};

// ---- noise, all in absolute art px (so it runs on past the board) ----
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const h32 = (x, y, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const vn = (x, y, s = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h32(xi, yi, s), b = h32(xi + 1, yi, s), c = h32(xi, yi + 1, s), d = h32(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x, y, s = 0) => 0.55 * vn(x, y, s) + 0.3 * vn(x * 2.1 + 5.2, y * 2.1 + 1.3, s + 7) + 0.15 * vn(x * 4.3 + 9.1, y * 4.3 + 3.7, s + 13);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));
export const dith = (X, Y) => DITH[(Y & 127) * 128 + (X & 127)];

// the calm meadow's dials (concept strength 1)
export const M1 = { sc: 330, thr: [0.34, 0.47, 0.66], tones: [2, 2, 3, 4], fleck: 0.018, dry: 0.04, verge: 0.03, stands: 2, standH: 7, standR: 20, drifts: 1 };
export const DRY = hex("#d6c670"), DAMP = hex("#2f6a58"), PALE = hex("#c8b878");
export const seedOf = () => 11 + (((REALM && REALM.seed) | 0) % 997 + 997) % 997;

// the realm's ramp: G(tone, temp) -> [r, g, b] (7 tones x cool / plain / warm), and the colour sets a
// pixel is tested against (the turf's own palette, the wood floor's)
export function palette() {
  const T = turfTones(REALM);
  const G = (tone, temp = 1) => T.meadow[clamp(tone, 0, 6) * 3 + temp];
  const pack = (c) => (c[0] << 16) | (c[1] << 8) | c[2];
  return { G, look: T.look, turf: new Set(T.meadow.map(pack)), floor: new Set(T.floor.map(pack)), pack };
}

// ---- the height field on a coarse grid (4 art px), with its sun term ----
// returns at(X, Y) -> [height, sunTerm] eased between grid points
export function heightGrid(X0, Y0, w, h, seed, S = 4) {
  const gw = Math.ceil(w / S) + 4, gh = Math.ceil(h / S) + 4, gx0 = Math.floor(X0 / S) - 1, gy0 = Math.floor(Y0 / S) - 1;
  const hg = new Float32Array(gw * gh), sn = new Float32Array(gw * gh);
  const sc = M1.sc, sc2 = sc * 0.42;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = (gx0 + i) * S, y = (gy0 + j) * S;
    hg[j * gw + i] = fbm(x / sc, y / sc, seed) * 0.82 + fbm(x / sc2, y / sc2, seed + 40) * 0.18;
  }
  // the sun on the swells (world.js reliefOf: a slope rising away from the sun faces it and is lit;
  // the concept's +-10 px slope, a low sun rakes harder)
  const RL = reliefOf(palette().look), k = 2.2 * 1.4 * (RL.gain / 34) * (10 / (2 * S));
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const a = hg[j * gw + Math.max(0, i - 1)], b = hg[j * gw + Math.min(gw - 1, i + 1)];
    const c = hg[Math.max(0, j - 1) * gw + i], d = hg[Math.min(gh - 1, j + 1) * gw + i];
    sn[j * gw + i] = ((b - a) * RL.ax + (d - c) * RL.ay) * k;
  }
  const out = [0, 0];
  return (X, Y) => {
    const fx = X / S - gx0, fy = Y / S - gy0, xi = clamp(fx | 0, 0, gw - 2), yi = clamp(fy | 0, 0, gh - 2), u = fx - xi, v = fy - yi, q = yi * gw + xi;
    out[0] = (hg[q] * (1 - u) + hg[q + 1] * u) * (1 - v) + (hg[q + gw] * (1 - u) + hg[q + gw + 1] * u) * v;
    out[1] = (sn[q] * (1 - u) + sn[q + 1] * u) * (1 - v) + (sn[q + gw] * (1 - u) + sn[q + gw + 1] * u) * v;
    return out;
  };
}

// ---- how far (art px) from open water, signed (< 0 in it) ----
// B1's waterDist(x, y) (board units) when it exists, else terrain's riverPast and the ponds' ellipses.
// `ext`: carry each river's end segments on past the board (for the apron, near the edge).
const extend = (rv, L) => {
  const p = rv.pts, n = p.length;
  if (n < 2) return p;
  const a = p[0], b = p[1], y = p[n - 1], z = p[n - 2];
  const la = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, lz = Math.hypot(y[0] - z[0], y[1] - z[1]) || 1;
  return [[a[0] + (a[0] - b[0]) / la * L, a[1] + (a[1] - b[1]) / la * L], ...p, [y[0] + (y[0] - z[0]) / lz * L, y[1] + (y[1] - z[1]) / lz * L]];
};
const segDist = (pts, x, y) => {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i], vx = x2 - x1, vy = y2 - y1, l2 = vx * vx + vy * vy || 1;
    const t = clamp(((x - x1) * vx + (y - y1) * vy) / l2, 0, 1);
    const d = Math.hypot(x - x1 - vx * t, y - y1 - vy * t);
    if (d < best) best = d;
  }
  return best;
};
export function waterUnits(ext = false) {
  const own = typeof WATER.waterDist === "function" && !ext ? WATER.waterDist : null;
  const far = ext ? RIVERS.map((rv) => ({ pts: extend(rv, 400), hw: rv.w / 2 })) : null;
  return (x, y) => {
    if (own) return own(x, y);
    let d = 1e6;
    if (far) for (const r of far) d = Math.min(d, segDist(r.pts, x, y) - r.hw);
    else for (const rv of RIVERS) d = Math.min(d, riverPast(rv, x, y));
    for (const p of PONDS) {
      const rx = p.w / 2, ry = p.h / 2, e = Math.hypot((x - p.x) / rx, (y - p.y) / ry);
      d = Math.min(d, (e - 1) * Math.min(rx, ry));
    }
    return d;
  };
}
// the water distance on a 4-unit grid over a rect of art px, eased: (X, Y) -> art px
export function waterGrid(X0, Y0, w, h, ext = false) {
  const S = 8, gw = Math.ceil(w / S) + 4, gh = Math.ceil(h / S) + 4, gx0 = Math.floor(X0 / S) - 1, gy0 = Math.floor(Y0 / S) - 1;
  const wu = waterUnits(ext), g = new Float32Array(gw * gh);
  const any = RIVERS.length || PONDS.length;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) g[j * gw + i] = any ? clamp(wu((gx0 + i) * S / 2, (gy0 + j) * S / 2) * 2, -999, 999) : 999;
  return (X, Y) => {
    const fx = X / S - gx0, fy = Y / S - gy0, xi = clamp(fx | 0, 0, gw - 2), yi = clamp(fy | 0, 0, gh - 2), u = fx - xi, v = fy - yi, q = yi * gw + xi;
    return (g[q] * (1 - u) + g[q + 1] * u) * (1 - v) + (g[q + gw] * (1 - u) + g[q + gw + 1] * u) * v;
  };
}
// how deep in the wood (board units; < 0 open ground) at art px (X, Y): one bound per row / column
export function woodRows(X0, Y0, w, h) {
  if (!FOREST) return () => -999;
  const left = FOREST.edge === "left", n = left ? h : w, b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = left ? forestDepthAt(0, (Y0 + i + 0.5) / 2) : forestDepthAt((X0 + i + 0.5) / 2, 0);
  return left ? (X, Y) => b[clamp(Y - Y0, 0, n - 1)] - (X + 0.5) / 2 : (X, Y) => b[clamp(X - X0, 0, n - 1)] - (Y + 0.5) / 2;
}

// ---- the masses: one turf pixel's colour, before the edges and features ----
// massPainter(G) -> (X, Y, hs, wd, fd) -> [r, g, b] (a shared array from a small table: never mutate it).
// hs: heightGrid's sample [h, sun]; wd water art px; fd wood depth units. The damp band at the water's
// edge (9 units, dithered darker) is folded in; rushes are the caller's.
export function massPainter(G) {
  const [a, b2, c] = M1.thr, T = M1.tones, G10 = G(1, 0);
  // [ti][tone] -> colour, then the two darkenings memoised by reference (a handful of colours in all)
  const TAB = [0, 1, 2, 3].map((ti) => [0, 1, 2, 3, 4, 5, 6].map((tone) => {
    let col = G(tone, ti === 0 ? 0 : ti === 3 ? 2 : 1);
    if (ti === 3) col = mix(col, DRY, M1.dry);
    if (ti === 0) col = mix(col, DAMP, 0.08);
    return col;
  }));
  const memo = (k) => { const m = new Map(); return (col) => { let o = m.get(col); if (!o) { o = mix(col, G10, k); m.set(col, o); } return o; }; };
  const woodDk = memo(0.55), dampDk = memo(0.5);
  return (X, Y, hs, wd, fd) => {
    let v = hs[0] - Math.max(0, 1 - wd / 110) * 0.22 + hs[1];
    // under the wood's eaves the ground lies in shade (as today's turf: world.js shadeField)
    if (fd > -40) v -= 0.2 * Math.min(1, (fd + 40) / 36);
    const bz = BAY[Y & 3][X & 3], dt = dith(X, Y), vd = v + (dt - 0.5) * 0.16 + (bz - 0.5) * 0.03;
    const ti = vd < a ? 0 : vd < b2 ? 1 : vd < c ? 2 : 3;
    let tone = T[ti];
    // the turf's blades: dark strokes from the same tile, a little thicker on the masses' rims
    if (dt < 0.3) {
      const rimK = 1 - Math.min(1, Math.min(Math.abs(vd - a), Math.abs(vd - b2), Math.abs(vd - c)) / 0.06);
      if (h32(X, Math.floor(Y / 3), 21 + (X & 7)) < M1.fleck * (2 + rimK * 2) * 2.2) tone -= 1;
    }
    let col = TAB[ti][tone];
    // the wood's foot: a deep shade band, dithered out
    if (fd > -24 && bz < (fd + 24) / 18) col = woodDk(col);
    if (wd < 18 && wd >= -2 && bz < 1 - wd / 18) col = dampDk(col);
    return col;
  };
}

// ---- a raised mass (tall grass, the wood's fringe): footprint m(X, Y) in a local grid, painted as a low
// prism with a lit top, a dark front of blades and its shadow along the sun's fall (concept `raised`).
// S = { set(i, rgb), Z (ground row per px), SH (shadow 0..200, Uint8), w, h, X0, Y0 } in art px.
export function raised(S, m, box, h, o) {
  const { Z, SH, w, h: HH, X0, Y0 } = S, jag = o.jag ?? 1, seed = o.seed || 1;
  const [bx0, by0, bx1, by1] = box, ls = Math.max(o.minLen ?? 0.5, DAY.len) * (o.shadowK ?? 1), fx = DAY.fall[0], fy = DAY.fall[1];
  const sx0 = fx < 0 ? Math.floor(h * ls * Math.abs(fx) * 1.3) + 4 : 2, sx1 = fx > 0 ? Math.ceil(h * ls * fx * 1.3) + 4 : 2;
  for (let y = Math.max(0, by0 - h - 3); y <= Math.min(HH - 1, by1 + Math.ceil(h * ls) + 4); y++) for (let x = Math.max(0, bx0 - sx0); x <= Math.min(w - 1, bx1 + sx1); x++) {
    const i = y * w + x, hh = Math.max(1, h + Math.round((vn((x + X0) / 2.3, 0.5, seed) - 0.5) * 2 * jag));
    let k = -1;
    for (let kk = hh; kk >= 0; kk--) if (m(x, y + kk)) { k = kk; break; }
    if (k >= 0) {
      if (Z[i] > y + k) continue;
      Z[i] = y + k;
      const c = k === hh ? o.top(x + X0, y + Y0, !m(x, y + hh - 1)) : o.face(x + X0, y + Y0, k, hh);
      S.set(i, c);
      continue;
    }
    // a blade tip poking above the top's back rim
    if (o.tip && m(x, y + 1 + hh) && !m(x, y + hh) && h32(x + X0, seed, 3) < o.tipP && Z[i] <= y + 1 + hh) {
      S.set(i, o.tip()); Z[i] = y + 1 + hh; continue;
    }
    // its shadow on the ground, cast away from the sun
    if (Z[i] !== y) continue;
    const L = Math.max(2, Math.round(hh * ls));
    let sh = 0;
    for (let t = 1; t <= L; t++) if (m(Math.round(x - fx * t), Math.round(y - fy * t))) { sh = t <= 1 ? 1 : 0.8; break; }
    if (m(x, y - 1) || m(x, y - 2)) sh = Math.max(sh, 1); // the foot
    if (sh) SH[i] = Math.max(SH[i], Math.round(sh * (o.shadow ?? 1) * 200));
  }
}
// the colours of a stand of tall grass in seed (concept: straw-tinged heads, a lit back rim)
export function standLook(G, sd) {
  const STRAW = hex("#b8ae5c");
  const TOP = [mix(G(2, 1), STRAW, 0.22), mix(G(4, 2), STRAW, 0.4), mix(G(5, 2), hex("#e8e0a0"), 0.5), mix(G(6, 2), hex("#f4eeb8"), 0.6)];
  const FACE = [mul(G(0, 0), 0.82), G(0, 0), mix(G(0, 0), G(1, 0), 0.6)];
  return {
    seed: sd, jag: 1.6, tipP: 0.42, shadow: 1, minLen: 0.8,
    top: (x, y, rim) => {
      if (rim) return h32(x, y, sd + 1) < 0.65 ? TOP[3] : TOP[2];
      const d = dith(x, y), w = vn(x / 9, y / 5, sd + 2);
      if (d > 0.78) return TOP[2];   // (the concept's thresholds, as approved: DITH runs about -0.56..0.58,
      if (d < 0.22) return TOP[0];   // so the heads are mostly the darker straw-green, lit on the back rim)
      return w < 0.36 ? TOP[0] : TOP[1];
    },
    // the front: dark blades in columns, a lit blade here and there hanging from the lip
    face: (x, y, j, hh) => {
      if (j === 0) return FACE[0];
      const c = h32(x, 9, sd);
      if (c < 0.26 && j >= hh - 3) return TOP[1];
      return c < 0.55 ? FACE[1] : FACE[2];
    },
    tip: () => TOP[3],
  };
}
// the wood's fringe: long grass at the treeline's foot, darker and lower than a stand, a fleck of bracken
export function fringeLook(G, sd) {
  const BR = hex("#7a7034");
  const FACE = [mul(G(0, 0), 0.8), G(0, 0), mix(G(0, 0), G(1, 0), 0.5)];
  return {
    seed: sd, jag: 1.6, tipP: 0.5, shadow: 0.8, minLen: 0.6,
    top: (x, y, rim) => {
      if (rim) return h32(x, y, sd + 1) < 0.4 ? G(5, 2) : G(4, 1);
      const d = dith(x, y);
      if (d < -0.1 && h32(x >> 1, y, sd + 5) < 0.06) return mix(G(2, 1), BR, 0.5);   // a fleck of bracken
      return d > 0.3 ? G(3, 1) : d < -0.3 ? G(1, 0) : G(2, 0);
    },
    face: (x, y, j, hh) => (j === 0 ? FACE[0] : h32(x, 9, sd) < 0.2 && j >= hh - 2 ? G(2, 0) : h32(x, 9, sd) < 0.6 ? FACE[1] : FACE[2]),
    tip: () => G(4, 1),
  };
}
// the fringe's footprint at art px (X, Y): a ragged, broken band just outside the wood (~8 units)
export const fringeAt = (X, Y, fd, seed) => {
  const e = fd + (vn(X / 22, Y / 14, seed + 61) - 0.5) * 9 + (vn(X / 3, Y / 2.5, seed + 62) - 0.5) * 3;
  return fd < -6 && e > -14 && vn(X / 60, Y / 60, seed + 63) > 0.3;
};
// the shadow tint (DAY.shade) and how strong
export const shadeOf = () => { const sc = DAY.shade || [42, 28, 44, 0.3]; return [sc, Math.min(0.6, sc[3] * 1.35)]; };

// =====================================================================================================
// the board: the ground layer's pixels repainted in place
function paintMeadow(ctx) {
  const T0 = performance.now();
  const cv = ctx.canvas, AW = cv.width, AH = cv.height, N = AW * AH, RES = AW / W;
  if (Math.abs(RES - 2) > 1e-6) return;   // (the meadow works in art px: 2 a unit, as the game's RES)
  const img = ctx.getImageData(0, 0, AW, AH), od = img.data;
  const P = palette(), G = P.G, seed = seedOf(), mass = massPainter(G);
  const RH = PATH_HALF * 2;

  // the road's distance (art px, from the centre line): chamfer over the board
  const roadD = new Float32Array(N);
  roadD.fill(1e9);
  for (let d = 0; d <= TOTAL_LEN; d += 0.25) { const [x, y] = posAt(d); const X = Math.round(x * 2), Y = Math.round(y * 2); if (X >= 0 && X < AW && Y >= 0 && Y < AH) roadD[Y * AW + X] = 0; }
  chamfer(roadD, AW, AH);
  const T1 = performance.now();
  const hgt = heightGrid(0, 0, AW, AH, seed), wdAt = waterGrid(0, 0, AW, AH), fdAt = woodRows(0, 0, AW, AH);
  const T2 = performance.now();

  // which pixels stay as they are: the wood's floor (its own palette), the sea and the sand, the castle's strip
  const KEEP = new Uint8Array(N), WD = new Int16Array(N), FD = new Float32Array(N);
  const Z = new Int16Array(N), SH = new Uint8Array(N);
  const castleX = (W - WALL_W) * 2 + 40;
  for (let Y = 0; Y < AH; Y++) {
    for (let X = 0; X < AW; X++) {
      const i = Y * AW + X, o = i * 4;
      Z[i] = Y;
      const fd = fdAt(X, Y);
      FD[i] = fd;
      const px = (od[o] << 16) | (od[o + 1] << 8) | od[o + 2];
      if (X >= castleX || fd > 9 || (fd > -6 && P.floor.has(px)) || (COAST && inSea(X / 2, Y / 2, COAST.sand + 1))) { KEEP[i] = 1; continue; }
      const wd = wdAt(X, Y);
      WD[i] = Math.round(clamp(wd, -999, 999));
      const c = mass(X, Y, hgt(X, Y), wd, fd);
      od[o] = c[0]; od[o + 1] = c[1]; od[o + 2] = c[2];
    }
  }
  const T3 = performance.now();
  // (straight into the layer's own pixels: no float copy of the board kept alongside)
  const set = (i, c) => { if (KEEP[i]) return; const o = i * 4; od[o] = c[0]; od[o + 1] = c[1]; od[o + 2] = c[2]; };
  const get = (i) => [od[i * 4], od[i * 4 + 1], od[i * 4 + 2]];

  // ---- edges: the trampled verge, rushes at the water ----
  const vergeC = mix(G(4, 2), PALE, 0.35);
  for (let Y = 0; Y < AH; Y++) for (let X = 0; X < AW; X++) {
    const i = Y * AW + X;
    if (KEEP[i]) continue;
    const rd = roadD[i], wd = WD[i];
    if (rd < RH + 14) {
      const t = 1 - (rd - RH + 2) / 16;
      if (BAY[Y & 3][X & 3] < t * 0.9) set(i, mix(get(i), vergeC, 0.55));
      if (rd > RH + 1 && rd < RH + 9 && h32(X >> 1, Y >> 2, 31) < M1.verge * 3 && h32(X, Y, 32) < 0.5) {
        for (let j = 0; j < 3; j++) if (Y - j >= 0 && !KEEP[i - j * AW]) set(i - j * AW, j === 2 ? G(6, 2) : j === 1 ? G(4, 1) : G(2, 0));
      }
    }
    if (wd > 3 && wd < 9 && rd > RH + 6 && h32(X >> 1, Y >> 2, 41) < 0.06) {
      for (let j = 0; j < 5; j++) if (Y - j >= 0 && !KEEP[i - j * AW]) set(i - j * AW, j >= 3 ? hex("#8a8a48") : j >= 1 ? G(2, 0) : G(0, 0));
    }
  }
  // lone trees and rocks: a shade pool down-sun (B3 lays its stand rings over this)
  const fall = DAY.fall || [0.93, 0.37];
  const decor = DECOR.filter((d) => !d.forest).map((d) => ({ x: d.x, y: d.y, s: d.s || 1, tree: ["tree", "pine", "willow", "oak", "birch"].includes(d.t) }));
  for (const d of decor) {
    const r = (d.tree ? 15 : 7) * d.s * 2, X0 = d.x * 2 + fall[0] * r * 0.27, Y0 = d.y * 2 + fall[1] * r * 0.32;
    for (let Y = Math.floor(Y0 - r); Y <= Y0 + r; Y++) for (let X = Math.floor(X0 - r * 1.3); X <= X0 + r * 1.3; X++) {
      if (X < 0 || Y < 0 || X >= AW || Y >= AH) continue;
      const i = Y * AW + X;
      if (KEEP[i]) continue;
      const e = Math.hypot((X - X0) / (r * 1.2), (Y - Y0) / (r * 0.55));
      if (e < 1 && BAY[Y & 3][X & 3] < (1 - e) * 1.6) set(i, mix(get(i), G(1, 0), d.tree ? 0.45 : 0.3));
    }
  }
  const T4 = performance.now();

  // ---- the wood's fringe of long grass (in place of today's hem) ----
  const S = { set, Z, SH, w: AW, h: AH, X0: 0, Y0: 0 };
  if (FOREST) {
    // the footprint first (one noise lookup a pixel near the treeline), then the prism over it in bands
    const FM = new Uint8Array(N);
    for (let Y = 0; Y < AH; Y++) for (let X = 0; X < AW; X++) {
      const i = Y * AW + X, fd = FD[i];
      if (fd < -26 || fd > -5 || KEEP[i] || roadD[i] <= RH + 6 || WD[i] <= 6) continue;
      if (fringeAt(X, Y, fd, seed)) FM[i] = 1;
    }
    const fm = (x, y) => x >= 0 && y >= 0 && x < AW && y < AH && FM[y * AW + x] === 1;
    const left = FOREST.edge === "left";
    // in bands, so the prism's search box stays small
    const span = left ? AH : AW;
    for (let s0 = 0; s0 < span; s0 += 160) {
      let lo = 1e9, hi = -1e9;
      for (let s = s0; s < Math.min(span, s0 + 160); s++) {
        const b = left ? forestDepthAt(0, s / 2) * 2 : forestDepthAt(s / 2, 0) * 2;
        lo = Math.min(lo, b); hi = Math.max(hi, b);
      }
      const box = left ? [Math.floor(lo) + 2, s0, Math.ceil(hi) + 48, Math.min(AH - 1, s0 + 159)] : [s0, Math.floor(lo) + 2, Math.min(AW - 1, s0 + 159), Math.ceil(hi) + 48];
      raised(S, fm, box, 5, fringeLook(G, 700));
    }
  }

  // ---- the meadow's features: two stands of tall grass, one flower drift ----
  const free = (xu, yu, pad) => {
    if (xu < 14 || xu > W - WALL_W - 18 || yu < 10 || yu > H - 10) return false;
    const i = Math.round(yu * 2) * AW + Math.round(xu * 2);
    if (KEEP[i] || roadD[i] < RH + pad * 2 + 8 || WD[i] < 24 + pad * 2) return false;
    if (FD[i] > -26 - pad) return false;
    for (const d of decor) if (Math.hypot(d.x - xu, d.y - yu) < (d.tree ? 18 : 10) * d.s + pad) return false;
    return true;
  };
  const feature = (x, y) => x >= 0 && y >= 0 && x < AW && y < AH && !KEEP[y * AW + x] && roadD[y * AW + x] > RH + 14 && WD[y * AW + x] > 10;
  let s = seed * 977 + 7;
  const R = () => (s = (Math.imul(s, 1664525) + 1013904223) | 0, (s >>> 0) / 4294967296);
  const cand = [];
  for (let t = 0; t < 600; t++) cand.push([20 + R() * (W - WALL_W - 40), 20 + R() * (H - 40)]);
  const placed = [];
  const take = (n, rx) => {
    const out = [];
    for (const [x, y] of cand) {
      if (out.length >= n) break;
      if (placed.some((p) => Math.hypot(p[0] - x, p[1] - y) < p[2] + rx + 30)) continue;
      if (!free(x, y, rx * 0.8)) continue;
      out.push([x, y, rx]); placed.push([x, y, rx]);
    }
    return out;
  };
  const stands = take(M1.stands, M1.standR);
  stands.forEach(([x, y, rx], n) => {
    const M = new Uint8Array(N), box = blob(M, AW, AH, x, y, rx * 1.1, rx * 0.44, { seed: seed + 100 + n, rag: 0.6, warp: 1.05, ok: feature });
    raised(S, (X, Y) => X >= 0 && X < AW && Y >= 0 && Y < AH && M[Y * AW + X], box, M1.standH, standLook(G, seed + 200 + n));
  });
  const drifts = take(M1.drifts, 24);
  drifts.forEach(([x0, y0], n) => {
    const X = x0 * 2, Y = y0 * 2, RX = 52, RY = 26, cols = [hex("#f4f0e0"), hex("#f2d030")], dens = 0.26;
    for (let y = Y - RY * 1.5; y < Y + RY * 1.5; y += 2) for (let x = X - RX * 1.5; x < X + RX * 1.5; x += 2) {
      const e = Math.hypot((x - X) / RX, (y - Y) / RY) + (fbm(x / 30, y / 20, seed + 300 + n) - 0.5) * 0.8;
      if (e > 1) continue;
      const xi = Math.round(x + (h32(x, y, 301) - 0.5) * 2), yi = Math.round(y + (h32(x, y, 302) - 0.5) * 2);
      if (!feature(xi, yi) || !feature(xi + 1, yi + 1) || !feature(xi - 1, yi)) continue;
      if (h32(xi, yi, 303) > dens * (1.35 - e)) continue;
      const c = cols[h32(xi, yi, 304) < 0.62 ? 0 : 1], i = yi * AW + xi;
      set(i - 1, mul(c, 0.9)); set(i, c); set(i + 1, mul(c, 0.86)); set(i + AW, mul(c, 0.7)); set(i + AW - 1, G(1, 0)); set(i + AW + 1, G(1, 0));
    }
  });
  const T5 = performance.now();

  // ---- shadows, then into the layer ----
  const [sc, sa] = shadeOf();
  for (let i = 0; i < N; i++) {
    if (KEEP[i] || !SH[i]) continue;
    const a = sa * SH[i] / 200, o = i * 4;
    od[o] = od[o] * (1 - a) + sc[0] * a; od[o + 1] = od[o + 1] * (1 - a) + sc[1] * a; od[o + 2] = od[o + 2] * (1 - a) + sc[2] * a;
  }
  ctx.putImageData(img, 0, 0);
  const T6 = performance.now();
  Object.assign(MEADOW_PROF, { road: T1 - T0, fields: T2 - T1, masses: T3 - T2, edges: T4 - T3, features: T5 - T4, out: T6 - T5, total: T6 - T0, stands: stands.length, drifts: drifts.length });
  if (typeof window !== "undefined") window.__ovhMeadow = MEADOW_PROF;   // (labs read it)
}

// a noisy ellipse footprint (board units in, art px out); returns its box
function blob(M, AW, AH, xu, yu, rx, ry, o = {}) {
  const X = xu * 2, Y = yu * 2, RX = rx * 2, RY = ry * 2, s = o.seed || 1, rag = o.rag ?? 0.35;
  const box = [Math.floor(X - RX * 1.4), Math.floor(Y - RY * 1.4), Math.ceil(X + RX * 1.4), Math.ceil(Y + RY * 1.4)];
  for (let y = Math.max(0, box[1]); y <= Math.min(AH - 1, box[3]); y++) for (let x = Math.max(0, box[0]); x <= Math.min(AW - 1, box[2]); x++) {
    const e = Math.hypot((x - X) / RX, (y - Y) / RY) + (fbm(x / 26, y / 20, s) - 0.5) * (o.warp ?? 0.7) + (vn(x / 2.6, y / 2.2, s + 3) - 0.5) * rag;
    if (e < 1 && (!o.ok || o.ok(x, y))) M[y * AW + x] = 1;
  }
  return box;
}
// two-pass chamfer distance in place (0 = seed, else a big number)
function chamfer(d, AW, AH) {
  const D = Math.SQRT2;
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const i = y * AW + x; let v = d[i]; if (!v) continue;
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (y > 0) { v = Math.min(v, d[i - AW] + 1); if (x > 0) v = Math.min(v, d[i - AW - 1] + D); if (x < AW - 1) v = Math.min(v, d[i - AW + 1] + D); }
    d[i] = v;
  }
  for (let y = AH - 1; y >= 0; y--) for (let x = AW - 1; x >= 0; x--) {
    const i = y * AW + x; let v = d[i]; if (!v) continue;
    if (x < AW - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < AH - 1) { v = Math.min(v, d[i + AW] + 1); if (x < AW - 1) v = Math.min(v, d[i + AW + 1] + D); if (x > 0) v = Math.min(v, d[i + AW - 1] + D); }
    d[i] = v;
  }
}

// (labs only: ?nomeadow=1 leaves today's turf and hem, for before / after pairs on the same build)
const labOff = typeof location !== "undefined" && /[?&]nomeadow=1/.test(location.search);
if (!labOff) {
  register("ground", (ctx) => paintMeadow(ctx));
  OVH.flags.hem = false;
}
