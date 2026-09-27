// ============ RENDER: THE ROAD ============
// The road the columns march along: painted once per realm into the ground
// layer (paintRoad, called by world.js's groundLayer after the turf and the
// chapter's turf art, and before the chapter's own road art — REALM.groundArt
// "iron" and "fen" paint their paving and causeways over this), and its live
// marks (drawRoadMarks: the chevrons that kindle when a column marches over
// them), drawn every frame over the cached ground.
//
// The road is painted PIXEL BY PIXEL, straight into the layer's art pixels,
// like the turf's tone map: every pixel near the road knows how far it lies
// from the centreline (and on which side), and that distance, a few noise
// fields and the sun decide its tone. Nothing is stroked, so no edge is a
// ruled vector curve:
//   - the edge is bitten by the grass (noise on the road's half-width), with
//     a 1-2 px bank face — shaded where the edge faces the sun (the bank
//     throws a shadow into the road there), lit on the far side — and a
//     band of worn, trampled turf beyond it. The inside of every bend is
//     worn round (a fillet between the two legs' inner edges), as walkers
//     cut the corner;
//   - the dirt is 5 stepped tones: a paler trodden crown, damp dark drifts
//     (darker near water), a pixel grain, and twin cart ruts drawn as crisp
//     grooves (a dark wall on the sun's side, a lit lip on the far one),
//     each rut breaking off and starting again on its own, and cutting in
//     toward the inside of a bend;
//   - then hand-placed pixel detail: pebbles and stones with a contact
//     shadow down-right, lobed puddles lying in the ruts, faint foot and hoof
//     prints, roots splaying from trees that stand close, grass tufts in
//     clumps along the edge and on the hump between the ruts.
// Each old realm reads its own palette (REALM.PATH_*) and look: frostfang's
// packed snow track (sled runners, ice, snow lumps on the lee edge),
// ember's cinder road (lit cracks, clinker, a few live coals), mistmoor's
// peat track (puddles, rushes). The Marches get only the verge (their paving
// covers the rest).
//
// paintRoadStrip(ctx, pts, { x0, y0, k }) paints the same road along any
// polyline into any canvas whose pixel (i, j) is world (x0 + i/k, y0 + j/k):
// the landscape beyond the board (apron.js) uses it so the road runs on
// off the board in exactly the same hand.

import { W, H, PATH_HALF, RES, mulberry32 } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { PTS } from "../engine/path.js";
import { CHEVRONS, DECOR, BRIDGES, PONDS, RIVERS, inRiver } from "../data/terrain.js";
import { lighten, darken, mix, rgb, hash, SUN } from "./paint.js";

// ---- small tools -------------------------------------------------------
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
// the direction the light comes FROM, as a unit vector
const SL = Math.hypot(SUN.x, SUN.y), SX = SUN.x / SL, SY = SUN.y / SL;

// Value noise in world units, on a lattice cached over the board and a wide
// margin (the apron asks for points far off the board: those hash directly,
// so the field runs on without a seam).
const NOISE = new Map();
const noiseOf = (seed, cell) => {
  const key = seed + "|" + cell;
  if (NOISE.has(key)) return NOISE.get(key);
  const lx0 = Math.floor(-420 / cell), ly0 = Math.floor(-420 / cell);
  const gw = Math.ceil((W + 840) / cell) + 3, gh = Math.ceil((H + 840) / cell) + 3;
  const a = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) a[j * gw + i] = hash(seed + (i + lx0) * 7919, j + ly0);
  const ic = 1 / cell, OX = lx0 * cell, OY = ly0 * cell, gwm = gw - 1, ghm = gh - 1;
  const f = (x, y) => {
    let fx = (x - OX) * ic, fy = (y - OY) * ic, A, B, C, D;
    if (fx >= 0 && fy >= 0 && fx < gwm && fy < ghm) {
      const xi = fx | 0, yi = fy | 0, q = yi * gw + xi;
      fx -= xi; fy -= yi;
      A = a[q]; B = a[q + 1]; C = a[q + gw]; D = a[q + gw + 1];
    } else {
      // far off the board (the apron): hash the lattice directly
      const xi = Math.floor(fx) + lx0, yi = Math.floor(fy) + ly0;
      fx -= Math.floor(fx); fy -= Math.floor(fy);
      A = hash(seed + xi * 7919, yi); B = hash(seed + (xi + 1) * 7919, yi);
      C = hash(seed + xi * 7919, yi + 1); D = hash(seed + (xi + 1) * 7919, yi + 1);
    }
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return (A + (B - A) * u) * (1 - v) + (C + (D - C) * u) * v;
  };
  if (NOISE.size > 40) NOISE.clear();
  NOISE.set(key, f);
  return f;
};

// a table of fixed random numbers, read by art pixel (cheaper than a hash
// per pixel; it repeats every 128 world units, under everything else)
let RND = null;
const rndTable = () => {
  if (RND) return RND;
  RND = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) RND[i] = hash(i, 99173);
  return RND;
};
// Clumps: a value noise about four art pixels across, read from the table
// (no lattice to build). Tone edges, the bank's shadow and the worn verge
// break up in little clumps with it — never in an ordered (Bayer) dither,
// which shows as a checkerboard wherever a tone sits on a threshold.
// Returns about -0.5 .. 0.5.
const clumpAt = (RT, x, y) => {
  const fx = x * 0.55, fy = y * 0.55, xi = Math.floor(fx), yi = Math.floor(fy);
  let u = fx - xi, w = fy - yi;
  u = u * u * (3 - 2 * u); w = w * w * (3 - 2 * w);
  const r0 = ((yi + 77) & 255) << 8, r1 = ((yi + 78) & 255) << 8, c0 = (xi + 151) & 255, c1 = (xi + 152) & 255;
  const A = RT[r0 | c0], B = RT[r0 | c1], C = RT[r1 | c0], D = RT[r1 | c1];
  return (A + (B - A) * u) * (1 - w) + (C + (D - C) * u) * w - 0.5;
};

// a polyline measured, so details can be laid along it
const measure = (pts) => {
  const segs = [];
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 0.001) continue;
    segs.push({ x1, y1, x2, y2, len, start: acc, ux: (x2 - x1) / len, uy: (y2 - y1) / len });
    acc += len;
  }
  const at = (d) => {
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (d <= segs[m].start + segs[m].len) hi = m; else lo = m + 1; }
    const s = segs[lo], t = (d - s.start) / s.len;   // (t runs past 0 or 1 on the end segments)
    return { x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t, ux: s.ux, uy: s.uy };
  };
  return { segs, total: acc, at };
};
// the signed turn from direction a to direction b (> 0: toward the march's right)
const turnOf = (ax, ay, bx, by) => Math.atan2(ax * by - ay * bx, ax * bx + ay * by);

// The inside of each bend, worn round. The path's corners are short curves
// much tighter than the road is wide, so the two legs' inner edges meet in a
// sharp notch; each corner gets a fillet of radius r tangent to both edges.
// A corner is a run of short segments turning one way between two legs.
const FILLET_R = 20;
const bendFillets = (segs, half, r) => {
  const out = [];
  const ang = (a, b) => turnOf(a.ux, a.uy, b.ux, b.uy);
  let i = 0;
  while (i < segs.length - 1) {
    const t0 = ang(segs[i], segs[i + 1]);
    if (Math.abs(t0) < 0.004) { i++; continue; }
    let k = i + 1;
    while (k < segs.length - 1 && segs[k].len < 14) {
      const tk = ang(segs[k], segs[k + 1]);
      if (Math.sign(tk) !== Math.sign(t0) || Math.abs(tk) < 0.004) break;
      k++;
    }
    const A = segs[i], B = segs[k], th = ang(A, B);
    i = k;
    if (Math.abs(th) < 0.35 || Math.abs(th) > 2.3) continue;
    const sg = Math.sign(th);
    // the inner edges: each leg's line pushed half a road toward the inside
    const m1x = -A.uy * sg, m1y = A.ux * sg, m2x = -B.uy * sg, m2y = B.ux * sg;
    const p1x = A.x1 + m1x * half, p1y = A.y1 + m1y * half, p2x = B.x1 + m2x * half, p2y = B.y1 + m2y * half;
    const det = A.uy * B.ux - A.ux * B.uy;
    if (Math.abs(det) < 1e-6) continue;
    const wx = p2x - p1x, wy = p2y - p1y, t = (wy * B.ux - wx * B.uy) / det;
    const cx = p1x + A.ux * t, cy = p1y + A.uy * t;           // the notch
    if (Math.hypot(cx - A.x2, cy - A.y2) > half * 3) continue;
    const cc = 1 + m1x * m2x + m1y * m2y;
    const fx = cx + r * (m1x + m2x) / cc, fy = cy + r * (m1y + m2y) / cc;   // the fillet's centre
    const t1x = fx - r * m1x, t1y = fy - r * m1y, t2x = fx - r * m2x, t2y = fy - r * m2y;
    out.push({
      cx, cy, fx, fy, m1x, m1y, m2x, m2y, u1x: A.ux, u1y: A.uy, u2x: B.ux, u2y: B.uy, t1x, t1y, t2x, t2y,
      x0: Math.min(cx, fx, t1x, t2x) - 5, x1: Math.max(cx, fx, t1x, t2x) + 5,
      y0: Math.min(cy, fy, t1y, t2y) - 5, y1: Math.max(cy, fy, t1y, t2y) + 5,
    });
  }
  return out;
};

// ---- each realm's road -------------------------------------------------
// style: "dirt" (the Greenwood), "snow", "ash", "peat", "fen" (bone-dust
// under the causeway's flags) or "paved" (the Marches: verge only)
const lookOf = (R) => {
  const style = R.groundArt === "iron" ? "paved" : R.groundArt === "fen" ? "fen"
    : R.ambient === "snow" ? "snow" : R.id === "ember" ? "ash" : R.id === "mistmoor" ? "peat" : "dirt";
  const main = R.PATH_MAIN, dk = R.PATH_DK, edge = R.PATH_EDGE;
  const L = {
    style,
    // the five dirt tones, darkest first
    tones: [mix(dk, edge, 0.3), mix(main, dk, 0.5), main, lighten(main, 0.11), lighten(main, 0.22)],
    bankDk: mix(dk, edge, 0.6), bankMid: mix(dk, edge, 0.3), bankLt: lighten(mix(main, R.GRASS_LT, 0.25), 0.26),
    worn: mix(mix(R.GRASS_DK, R.GRASS, 0.5), dk, 0.42), wornT: 0.5,
    crown: 0.1, drift: 1, bias: 0, grain: 1,
    // ruts: how much of the road they run along (1 = about half), and
    // whether the groove's floor sinks a tone (the fen's pale dust: walls only)
    ruts: 1, rutFloor: 1,
    grassCrown: true, puddles: 3, pool: 1.1, prints: 6, roots: true, tufts: 1, pebbles: 1, sky: 0.5,
    pebble: R.PEBBLE, stone: mix(dk, "#8d8478", 0.45),
    tuft: [darken(R.GRASS_DK, 0.18), R.GRASS, lighten(R.GRASS_LT, 0.12)], tuftH: 1,
    water: R.water || { deep: "#3a6a7c", edge: "#4a8094", shine: "#8cc4d8" },
  };
  if (style === "snow") {
    // packed snow: nearly every pixel one of two pale tones; the darker ones
    // are kept for the bank's shadow and the grooves
    const snow = mix(R.GRASS_LT, "#f6fafc", 0.5);
    L.tones = [mix(dk, edge, 0.28), mix(main, dk, 0.55), main, mix(main, R.GRASS, 0.45), mix(main, snow, 0.62)];
    L.bankDk = mix(edge, dk, 0.35); L.bankMid = mix(dk, main, 0.4); L.bankLt = mix(snow, "#ffffff", 0.4);
    L.worn = snow; L.wornT = 0.55;
    L.crown = 0.08; L.ruts = 0; L.grassCrown = false; L.puddles = 3; L.prints = 9; L.roots = false; L.pebbles = 0.3;
    L.stone = mix(edge, "#6a7280", 0.5); L.pebble = mix(R.PEBBLE, edge, 0.35);
    L.tuft = null; L.lumps = [mix(edge, main, 0.35), snow, "#fbfdff"]; L.grain = 0.45; L.drift = 0.5; L.bias = 0.1;
  } else if (style === "ash") {
    // cinders, warmed a touch in the light so the road isn't flat concrete
    const warm = "#c8a080";
    L.tones = [mix(dk, edge, 0.5), mix(main, dk, 0.6), mix(main, warm, 0.06), mix(lighten(main, 0.09), warm, 0.13), mix(lighten(main, 0.2), warm, 0.16)];
    L.bankDk = mix(edge, dk, 0.25); L.bankMid = mix(dk, edge, 0.5); L.bankLt = mix(lighten(main, 0.16), warm, 0.15);
    L.worn = mix(R.GRASS_DK, edge, 0.4); L.wornT = 0.55;
    L.crown = 0.07; L.ruts = 0.55; L.grassCrown = false; L.puddles = 0; L.prints = 3; L.roots = false; L.pebbles = 1;
    L.stone = mix(edge, "#3a3236", 0.3); L.pebble = mix(R.PEBBLE, main, 0.3); L.grain = 1.3; L.drift = 0.75;
    L.tuft = [mix(R.GRASS_DK, "#2a2224", 0.3), "#6e6050", "#8e7e66"]; L.tuftH = 0.8;
    L.cracks = true;
  } else if (style === "peat") {
    L.bias = -0.04; L.puddles = 5; L.pool = 1.5; L.prints = 8; L.pebbles = 0.6; L.sky = 0.6;
    L.water = { deep: "#262a22", edge: "#4e5242", shine: "#9aac9a" };
    L.tuft = [darken(R.TUFT, 0.25), R.GRASS_DK, lighten(R.GRASS_LT, 0.18)]; L.tuftH = 1.35;
  } else if (style === "fen") {
    L.puddles = 0; L.prints = 4; L.pebbles = 0.5; L.grassCrown = false; L.rutFloor = 0; L.ruts = 0.8;
    L.tuft = [darken(R.TUFT, 0.2), R.GRASS_LT, mix(R.GRASS_LT, "#b8b088", 0.5)]; L.tuftH = 1.2;
  } else if (style === "paved") {
    L.worn = mix(mix(R.GRASS_DK, R.GRASS, 0.4), dk, 0.3); L.wornT = 0.42;
    L.gravel = [mix(dk, edge, 0.45), mix(main, dk, 0.4), lighten(dk, 0.2)];
  }
  // everything as [r, g, b], ready for the pixels
  for (const k of ["bankDk", "bankMid", "bankLt", "worn", "pebble", "stone"]) L[k + "C"] = rgb(L[k]);
  L.tonesC = L.tones.map(rgb);
  return L;
};

// ---- the painter -------------------------------------------------------
// ctx's canvas pixel (i, j) covers world (x0 + i/k .. x0 + (i+1)/k, ...).
// o.extStart / o.extEnd run the first / last segment on past its end (the
// road leaving by a board edge); o.water: damper earth near rivers and ponds;
// o.bridges: [{ d0, d1 }] along the road, kept clear of puddles and pebbles;
// o.roots: roots from the board's trees (the board's own road only).
export function paintRoadStrip(ctx, pts, o = {}) {
  if (!pts || pts.length < 2) return;
  const R = REALM, L = lookOf(R);
  const k = o.k ?? RES, x0 = o.x0 ?? 0, y0 = o.y0 ?? 0;
  const cv = ctx.canvas, PW = cv.width, PH = cv.height;
  const M = measure(pts), segs = M.segs;
  if (!segs.length) return;
  const extS = o.extStart ?? 0, extE = o.extEnd ?? 0;
  const HALF = PATH_HALF, REACH = HALF + 11;
  const seed = (R.seed | 0) % 100000;
  const nEdge = noiseOf(seed + 11, 6.5), nWand = noiseOf(seed + 13, 46), nVerge = noiseOf(seed + 17, 9);
  const nDrift = noiseOf(seed + 19, 38), nMid = noiseOf(seed + 23, 12), nRutC = noiseOf(seed + 29, 60);
  const nRutA = noiseOf(seed + 31, 64), nRutB = noiseOf(seed + 41, 64), nRutF = noiseOf(seed + 47, 17), nRutW = noiseOf(seed + 53, 11);
  const paved = L.style === "paved";
  const T = L.tonesC, ap = 1 / k, ik = ap;
  const BIAS = L.bias - L.crown * 0.45 + 0.5, CROWN = L.crown, GR0 = 0.045 * L.grain, GR1 = 1 - 0.022 * L.grain, WATER = !!o.water;
  const RUT_T = 0.49 + (1 - L.ruts) * 0.25, RUT_F = L.rutFloor;
  // what changes along the road, sampled every STEP at the centreline: its
  // wander, where the cart ran (its gauge, how far it strayed from the
  // middle, cutting in toward the inside of a bend), whether each rut runs
  // there, and how damp it is (near a river or a pond). Sampled from 2-D
  // noise at the centreline, so a strip painted on past the board (the
  // apron) carries on from the same fields.
  const STEP = 2, nS = Math.ceil((M.total + extS + extE) / STEP) + 2;
  const wand = new Float32Array(nS), gauge = new Float32Array(nS), lat = new Float32Array(nS);
  const rutL = new Float32Array(nS), rutR = new Float32Array(nS), wobL = new Float32Array(nS), wobR = new Float32Array(nS), bend = new Float32Array(nS), wet = new Float32Array(nS);
  for (let i = 0; i < nS; i++) {
    const al = i * STEP - extS, p = M.at(al);
    const pb = M.at(Math.max(-extS, al - 18)), pf = M.at(Math.min(M.total + extE, al + 18));
    const tn = turnOf(pb.ux, pb.uy, pf.ux, pf.uy), bn = smooth(Math.abs(tn) / 1.1);
    wand[i] = (nWand(p.x, p.y) - 0.5) * 2.4;
    gauge[i] = 11.5 + (nRutC(p.x + 300, p.y) - 0.5) * 1.4;
    lat[i] = (nRutC(p.x, p.y) - 0.5) * 5 + Math.sign(tn) * 6 * bn;
    bend[i] = bn;
    // (each wheel wobbles a little in its rut)
    wobL[i] = (nRutW(p.x, p.y) - 0.5) * 1.6; wobR[i] = (nRutW(p.x + 157, p.y + 61) - 0.5) * 1.6;
    rutL[i] = nRutA(p.x, p.y) * 0.62 + nRutF(p.x, p.y) * 0.38 - 0.3 * bn;
    rutR[i] = nRutB(p.x, p.y) * 0.62 + nRutF(p.x + 211, p.y - 97) * 0.38 - 0.3 * bn;
    if (o.water && (i % 3 === 0 || i === nS - 1)) {
      let w = 0;
      if (RIVERS.length) w = inRiver(p.x, p.y, 8) ? 1 : inRiver(p.x, p.y, 26) ? 0.65 : inRiver(p.x, p.y, 48) ? 0.3 : 0;
      for (const pd of PONDS) w = Math.max(w, 1 - Math.hypot((p.x - pd.x) / (pd.w / 2 + 50), (p.y - pd.y) / (pd.h / 2 + 50)));
      wet[i] = w;
    }
  }
  if (o.water) for (let i = 0; i < nS - 1; i++) if (i % 3) { const a = i - (i % 3), b = Math.min(nS - 1, a + 3); wet[i] = wet[a] + (wet[b] - wet[a]) * ((i - a) / (b - a)); }
  const along = (arr, al) => { const f = (al + extS) / STEP, i = f < 0 ? 0 : f > nS - 2 ? nS - 2 : f | 0, u = f - i; return arr[i] + (arr[i + 1] - arr[i]) * (u < 0 ? 0 : u > 1 ? 1 : u); };
  const wetAt = (al) => along(wet, al);

  const img = ctx.getImageData(0, 0, PW, PH), d = img.data;
  const onRoad = paved ? null : new Uint8Array(PW * PH);   // for the detail pass
  const BAND = 48;
  const bd = new Float32Array(PW * BAND), bqx = new Float32Array(PW * BAND), bqy = new Float32Array(PW * BAND), bal = new Float32Array(PW * BAND);
  const bsg = new Int8Array(PW * BAND);   // which side of the centreline: +1 right of the march
  const last = segs.length - 1, R2 = REACH * REACH, EDGE_IN = HALF - 4.2;
  // (paved: the paving covers everything this deep, so it's never measured)
  const DEEP = HALF - 2, PAV2 = (HALF - 0.4) * (HALF - 0.4);
  const gravel = L.gravel ? L.gravel.map(rgb) : null;
  const RT = rndTable();
  const FIL = paved || o.fillets === false ? [] : bendFillets(segs, HALF, FILLET_R), FR = FILLET_R;
  // the dirt's drifts (two noise fields) on a lattice two world units apart,
  // filled as the road reaches it and read bilinearly
  const DS = 2, DX0 = Math.floor(x0) - 2, DY0 = Math.floor(y0) - 2, DW = Math.ceil(PW / k / DS) + 4, DH = Math.ceil(PH / k / DS) + 4;
  const dv = new Float32Array(DW * DH), df = new Uint8Array(DW * DH);
  const dfill = (q) => {
    const i = q % DW, j = (q / DW) | 0;
    // (sampled on turned axes, so the value noise never shows its square cells)
    const x = DX0 + i * DS, y = DY0 + j * DS;
    df[q] = 1; dv[q] = ((nDrift(x * 0.8 - y * 0.6, x * 0.6 + y * 0.8) - 0.5) * 0.34 + (nMid(x * 0.6 + y * 0.8, y * 0.6 - x * 0.8 + 600) - 0.5) * 0.2) * L.drift;
  };
  // Each segment scans only its own slab (the strip within REACH of it),
  // run on past its ends far enough to cover the wedge outside a bend (or
  // by REACH, a round cap, where the road stops); t is clamped, so a pixel
  // past a vertex measures to the vertex.
  const turnExt = (a, b) => {
    const c = Math.max(-1, Math.min(1, a.ux * b.ux + a.uy * b.uy)), th = Math.acos(c);
    return th > 1.2 ? REACH : Math.min(REACH, REACH * Math.tan(th / 2) + 1.5);
  };
  const slabs = segs.map((s, si) => {
    const e0 = si === 0 ? extS + REACH : turnExt(segs[si - 1], s), e1 = si === last ? extE + REACH : turnExt(s, segs[si + 1]);
    const u0 = -e0, u1 = s.len + e1;
    const ax = s.x1 + s.ux * u0, ay = s.y1 + s.uy * u0, bx = s.x1 + s.ux * u1, by = s.y1 + s.uy * u1;
    const ry = Math.abs(s.ux) * REACH;
    return { u0, u1, ymin: Math.min(ay, by) - ry - 1, ymax: Math.max(ay, by) + ry + 1 };
  });
  for (let by = 0; by < PH; by += BAND) {
    const bh = Math.min(BAND, PH - by);
    bd.fill(1e9, 0, PW * bh);
    const wy0 = y0 + by / k - REACH, wy1 = y0 + (by + bh) / k + REACH;
    let bx0 = PW, bx1 = -1;
    for (let si = 0; si <= last; si++) {
      const s = segs[si], sl = slabs[si];
      if (sl.ymax < wy0 || sl.ymin > wy1) continue;
      const tlo = si === 0 ? -extS / s.len : 0, thi = si === last ? 1 + extE / s.len : 1;
      const vx = s.x2 - s.x1, vy = s.y2 - s.y1, iL2 = 1 / (s.len * s.len), sx1 = s.x1, sy1 = s.y1, ux = s.ux, uy = s.uy;
      const Y0 = Math.max(by, Math.floor((sl.ymin - y0) * k)), Y1 = Math.min(by + bh - 1, Math.ceil((sl.ymax - y0) * k));
      for (let py = Y0; py <= Y1; py++) {
        const y = y0 + (py + 0.5) / k - sy1, row = (py - by) * PW;
        // this row's stretch of the slab: within REACH of the line, and
        // between the slab's two ends
        let xa = -1e9, xb = 1e9;
        if (Math.abs(uy) > 1e-6) { const p = (y * ux - REACH) / uy, q = (y * ux + REACH) / uy; xa = Math.min(p, q); xb = Math.max(p, q); }
        else if (Math.abs(y) > REACH) continue;
        if (Math.abs(ux) > 1e-6) { const p = (sl.u0 - y * uy) / ux, q = (sl.u1 - y * uy) / ux; xa = Math.max(xa, Math.min(p, q)); xb = Math.min(xb, Math.max(p, q)); }
        else if (y * uy < sl.u0 || y * uy > sl.u1) continue;
        const X0 = Math.max(0, Math.ceil((xa + sx1 - x0) * k - 0.5)), X1 = Math.min(PW - 1, Math.floor((xb + sx1 - x0) * k - 0.5));
        if (X0 > X1) continue;
        if (X0 < bx0) bx0 = X0;
        if (X1 > bx1) bx1 = X1;
        // paved: the run of this row lying deep inside the road beside this
        // segment is all paving — mark it, don't measure it
        let I0 = X1 + 1, I1 = X1;
        if (paved) {
          let ia = -1e9, ib = 1e9, ok = true;
          if (Math.abs(uy) > 1e-6) { const p = (y * ux - DEEP) / uy, q = (y * ux + DEEP) / uy; ia = Math.min(p, q); ib = Math.max(p, q); }
          else if (Math.abs(y * ux) >= DEEP) ok = false;
          if (Math.abs(ux) > 1e-6) { const p = -y * uy / ux, q = (s.len - y * uy) / ux; ia = Math.max(ia, Math.min(p, q)); ib = Math.min(ib, Math.max(p, q)); }
          else if (y * uy < 0 || y * uy > s.len) ok = false;
          if (ok) {
            I0 = Math.max(X0, Math.ceil((ia + sx1 - x0) * k - 0.5)); I1 = Math.min(X1, Math.floor((ib + sx1 - x0) * k - 0.5));
            if (I0 <= I1) bd.fill(0, row + I0, row + I1 + 1); else { I0 = X1 + 1; I1 = X1; }
          }
        }
        for (let px = X0; px <= X1; px++) {
          if (px === I0) { px = I1; continue; }
          const x = x0 + (px + 0.5) / k - sx1;
          let t = (x * vx + y * vy) * iL2;
          t = t < tlo ? tlo : t > thi ? thi : t;
          const ex = x - vx * t, ey = y - vy * t, dd = ex * ex + ey * ey, i = row + px;
          if (dd < bd[i]) { bd[i] = dd; bqx[i] = sx1 + vx * t; bqy[i] = sy1 + vy * t; bal[i] = s.start + t * s.len; bsg[i] = ey * ux - ex * uy > 0 ? 1 : -1; }
        }
      }
    }
    // the fillets reaching into this band
    const FB = FIL.length ? FIL.filter((f) => f.y1 >= y0 + by / k && f.y0 <= y0 + (by + bh) / k) : FIL;
    const nFB = FB.length;
    for (let py = by; py < by + bh; py++) {
      const y = y0 + (py + 0.5) / k, row = (py - by) * PW;
      for (let px = bx0; px <= bx1; px++) {
        const i = row + px, d2 = bd[i];
        if (d2 >= R2 || (paved && d2 < PAV2)) continue;
        let dist = Math.sqrt(d2);
        const x = x0 + (px + 0.5) * ik, qx = bqx[i], qy = bqy[i], al = bal[i];
        let s = dist > 0.01 ? ((x - qx) * SX + (y - qy) * SY) / dist : 0;   // > 0: this edge faces the sun
        const a = dist;   // (the tone field keeps the true distance)
        // the inside of a bend, worn round
        for (let fi = 0; fi < nFB; fi++) {
          const f = FB[fi];
          if (x < f.x0 || x > f.x1 || y < f.y0 || y > f.y1) continue;
          const rx = x - f.cx, ry = y - f.cy;
          // (a margin on the road's side too: the ragged edge there must follow the fillet)
          if (rx * f.m1x + ry * f.m1y < -4 || rx * f.m2x + ry * f.m2y < -4) continue;
          if ((x - f.t1x) * f.u1x + (y - f.t1y) * f.u1y < 0 || (x - f.t2x) * f.u2x + (y - f.t2y) * f.u2y > 0) continue;
          const gx = f.fx - x, gy = f.fy - y, gl = Math.sqrt(gx * gx + gy * gy), dF = HALF + FR - gl;
          if (dF < dist && gl > 0.01) { dist = dF; s = (gx * SX + gy * SY) / gl; }
        }
        const ax = Math.floor(x * 2 + 1e-4), ay = Math.floor(y * 2 + 1e-4);    // the world's art pixel
        const dz = clumpAt(RT, x, y), rn = (ay & 255) << 8 | (ax & 255);
        // (where along the road, for the sampled profiles)
        const fa = (al + extS) / STEP, ia = fa < 0 ? 0 : fa > nS - 2 ? nS - 2 : fa | 0, ua = fa - ia < 0 ? 0 : fa - ia > 1 ? 1 : fa - ia;
        const edgeR = paved ? HALF - 0.4 : dist < EDGE_IN ? HALF : HALF - 0.7 + (nEdge(x, y) - 0.5) * 3.4 + wand[ia] + (wand[ia + 1] - wand[ia]) * ua;
        const e = dist - edgeR, o4 = (py * PW + px) * 4;
        if (e >= 0) {
          // ---- beyond the edge: the bank's face, then trampled turf ----
          if (paved) {
            // the kerb stands proud: a shadow on the turf down-right of it,
            // a strip of gravel and earth, then the worn verge
            const sh = s < -0.1 ? (1 + 2.5 * -s) * ap : 0;
            if (e < sh) { d[o4] *= 0.7; d[o4 + 1] *= 0.7; d[o4 + 2] *= 0.72; continue; }
            const gw = (nVerge(x, y) - 0.35) * 3.2;
            if (e - sh < gw) { const c = gravel[Math.floor(RT[rn ^ 0x5a5a] * 3)]; d[o4] = c[0]; d[o4 + 1] = c[1]; d[o4 + 2] = c[2]; continue; }
          } else {
            const bw = (s > 0.6 ? 2 : 1) * ap;
            if (e < bw) {
              const c = s > 0.18 ? L.bankDkC : s < -0.25 ? L.bankLtC : L.bankMidC;
              d[o4] = c[0]; d[o4 + 1] = c[1]; d[o4 + 2] = c[2];
              continue;
            }
            // dirt kicked out onto the grass, close to the edge
            const f0 = 1 - (e - bw) / 2.2;
            if (f0 > 0 && RT[rn ^ 0x3c3c] < 0.16 * f0 * f0) { const c = T[1]; d[o4] = c[0]; d[o4 + 1] = c[1]; d[o4 + 2] = c[2]; continue; }
          }
          const vw = 2.2 + nVerge(x, y) * 4.2;
          if (e < vw) {
            const f = 1 - e / vw;
            if (f * 0.9 + dz * 0.75 + (RT[rn ^ 0x2e2e] - 0.5) * 0.12 > 0.42) {
              const t = L.wornT * (0.55 + 0.45 * f), c = L.wornC;
              d[o4] += (c[0] - d[o4]) * t; d[o4 + 1] += (c[1] - d[o4 + 1]) * t; d[o4 + 2] += (c[2] - d[o4 + 2]) * t;
            }
          }
          continue;
        }
        if (paved) continue;   // (the paving covers it all)
        onRoad[py * PW + px] = 1;
        // ---- the road itself: one tone field, cut into five tones ----
        let v = BIAS + CROWN * (1 - (a / HALF) * (a / HALF));
        {
          const fx = (x - DX0) * 0.5, fy = (y - DY0) * 0.5, ix = fx | 0, iy = fy | 0, u = fx - ix, w = fy - iy, q = iy * DW + ix;
          if (!df[q]) dfill(q);
          if (!df[q + 1]) dfill(q + 1);
          if (!df[q + DW]) dfill(q + DW);
          if (!df[q + DW + 1]) dfill(q + DW + 1);
          const A = dv[q], B = dv[q + 1], C = dv[q + DW], D = dv[q + DW + 1];
          v += (A + (B - A) * u) * (1 - w) + (C + (D - C) * u) * w;
        }
        if (WATER) v -= (wet[ia] + (wet[ia + 1] - wet[ia]) * ua) * 0.14;
        // the bank's shadow thrown into the road along the sunward edge
        const inside = -e;
        if (s > 0.2 && inside < (0.6 + 2.6 * (s - 0.2)) + dz * 1.1) v -= 0.17;
        const ti = v + dz * 0.06;
        let idx = ti < 0.25 ? 0 : ti < 0.4 ? 1 : ti < 0.63 ? 2 : ti < 0.79 ? 3 : 4;
        // twin cart ruts: crisp grooves four art pixels across — a dark wall
        // on the sun's side, a floor two pixels wide, a lit lip on the far
        // side — each rut (left, right) running and breaking off on its own;
        // where it only just runs, it is a shallow floor, so its ends fray
        if (a > 1.5 && a < 23) {
          const sg = bsg[i];
          const wb = sg > 0 ? wobR : wobL;
          const cj = gauge[ia] + (gauge[ia + 1] - gauge[ia]) * ua + sg * (lat[ia] + (lat[ia + 1] - lat[ia]) * ua) + wb[ia] + (wb[ia + 1] - wb[ia]) * ua;
          const dq = (a - cj) * 2;   // art pixels from the rut's middle, + outward
          if (dq > -2 && dq < 2) {
            const rr = sg > 0 ? rutR : rutL, raw = rr[ia] + (rr[ia + 1] - rr[ia]) * ua + (RT[rn ^ 0x6b6b] - 0.5) * 0.06 - RUT_T;
            if (raw > 0) {
              const lateral = s < 0.2 && s > -0.2, ws = Math.floor(s >= 0 ? dq : -dq);   // + toward the sun
              if (ws === -1 || ws === 0) idx -= RUT_F;
              else if (raw > 0.035 && !lateral) idx += ws > 0 ? (raw > 0.07 && RUT_F ? -2 : -1) : 1;
            }
          }
        }
        // the road's own rim: one pixel a step darker where it meets the bank
        if (inside < ap && s > -0.3) idx -= 1;
        else if (inside < ap) idx += 1;
        // grain: single pixels a step off
        const h = RT[rn];
        if (h < GR0) idx -= 1;
        else if (h > GR1) idx += 1;
        const c = T[idx < 0 ? 0 : idx > 4 ? 4 : idx];
        d[o4] = c[0]; d[o4 + 1] = c[1]; d[o4 + 2] = c[2];
      }
    }
  }
  if (!paved) {
    const rutOff = (al, side) => side * along(gauge, al) + along(lat, al);
    const rutOn = (al, side) => along(side > 0 ? rutR : rutL, al) > RUT_T + 0.02;
    roadDetail(d, PW, PH, { R, L, M, k, x0, y0, extS, extE, seed, onRoad, bridges: o.bridges || [], roots: !!o.roots,
      wetAt: o.water ? wetAt : () => 0, rutOff, rutOn, bendAt: (al) => along(bend, al), latAt: (al) => along(lat, al) });
  }
  ctx.putImageData(img, 0, 0);
}

// ---- the pixel detail: stones, water, prints, roots, grass --------------
// Stamps are written straight into the pixels, one art pixel per canvas
// pixel. Letters: L lit, B body, D dark, H hot, W snow (the snow lumps),
// S contact shadow (darkens whatever is under it).
const PEBBLES = [
  ["LS"],
  ["LB", "DS"],
  ["LB.", "BDS"],
  [".LB.", "LBBD", ".BDS", "..S."],
  [".LLB.", "LBBBD", "BBBDD", ".DDSS", "..SS."],
  ["..LLB..", ".LBBBD.", "LBBBBBD", "BBBBBDD", ".DDDDS.", "..SSSS."],
];
const COAL = [".DD.", "DHBD", "DBBD", ".DDS"];
function roadDetail(d, PW, PH, C) {
  const { R, L, M, k, x0, y0, extS, seed, bridges, wetAt } = C;
  const HALF = PATH_HALF, T = L.tonesC;
  const rng = mulberry32((R.seed ^ 0x0a0ad) >>> 0);
  const toPx = (x, y) => [Math.floor((x - x0) * k), Math.floor((y - y0) * k)];
  const put = (px, py, c) => { if (px < 0 || py < 0 || px >= PW || py >= PH) return; const o = (py * PW + px) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; };
  const dim = (px, py, f) => { if (px < 0 || py < 0 || px >= PW || py >= PH) return; const o = (py * PW + px) * 4; d[o] *= f; d[o + 1] *= f; d[o + 2] *= f * 1.02; };
  // a step toward the warm light
  const lift = (px, py, t) => { if (px < 0 || py < 0 || px >= PW || py >= PH) return; const o = (py * PW + px) * 4; d[o] += (255 - d[o]) * t; d[o + 1] += (243 - d[o + 1]) * t; d[o + 2] += (210 - d[o + 2]) * t; };
  const onBridge = (al, m) => bridges.some((b) => al > b.d0 - m && al < b.d1 + m);
  const wetHere = (x, y, m) => inRiver(x, y, m) || PONDS.some((p) => Math.abs(x - p.x) < p.w / 2 + m && Math.abs(y - p.y) < p.h / 2 + m);
  const from = -extS, to = M.total + (C.extE || 0);
  // where along the road, and how far across it (+ = right of the march)
  const spot = (al, off) => { const p = M.at(al); return [p.x - p.uy * off, p.y + p.ux * off, p]; };
  const stamp = (x, y, rows, pal) => {
    const [px, py] = toPx(x, y);
    const ox = px - (rows[0].length >> 1), oy = py - (rows.length >> 1);
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === ".") continue;
        if (ch === "S") dim(ox + i, oy + j, 0.72);
        else put(ox + i, oy + j, pal[ch]);
      }
    }
  };
  const snow = L.style === "snow";

  // puddles, lying in the ruts and the damp hollows: two or three lobes run
  // along the rut, shaded under their up-left lip, sky in the rest, a lit
  // rim on the far lip, a broken glint
  const puddles = [];
  const nP = Math.round(L.puddles * (0.7 + 0.6 * rng()));
  for (let tries = 0; puddles.length < nP && tries < 80; tries++) {
    const al = from + 60 + rng() * (to - from - 120), wetB = wetAt(al);
    if (rng() > 0.35 + wetB) continue;
    if (onBridge(al, 34)) continue;
    const side = rng() < 0.5 ? -1 : 1;
    if (!C.rutOn(al, side) && rng() < 0.75) continue;
    const [x, y, p] = spot(al, C.rutOff(al, side) + (rng() - 0.5) * 1.5);
    if (wetHere(x, y, 6) || puddles.some((q) => Math.hypot(q.x - x, q.y - y) < 50)) continue;
    if (CHEVRONS.some((ch) => Math.hypot(ch.x - x, ch.y - y) < 12)) continue;
    const n = 2 + (rng() < 0.45 ? 1 : 0) + (L.pool > 1.2 && rng() < 0.5 ? 1 : 0), lobes = [], ps = L.pool;
    let ext = 0;
    for (let j = 0; j < n; j++) {
      const lo = (j - (n - 1) / 2) * (2.2 + rng() * 1.8) * ps + (rng() - 0.5), co = (rng() - 0.5) * 1.6 * ps;
      const rx = (1.8 + rng() * 2) * ps, ry = (1.1 + rng() * 1.1) * ps;
      lobes.push([lo, co, rx, ry]);
      ext = Math.max(ext, Math.abs(lo) + rx, Math.abs(co) + ry);
    }
    puddles.push({ x, y, ux: p.ux, uy: p.uy, lobes, ext });
  }
  const wDeep = rgb(snow ? mix(L.tones[2], "#86b2c8", 0.45) : mix(L.water.deep, L.tones[0], 0.4));
  const wMid = rgb(snow ? mix(L.tones[3], "#d4ecf6", 0.5) : mix(mix(L.water.edge, L.water.shine, L.sky), L.tones[1], 0.25));
  const wHi = rgb(snow ? "#fbfeff" : mix(lighten(L.water.shine, 0.35), L.tones[3], 0.2));
  const mud = snow ? T[1] : rgb(darken(L.tones[0], 0.18)), lip = snow ? rgb("#f4f8fa") : T[3];
  for (const pd of puddles) {
    const [cx, cy] = toPx(pd.x, pd.y), rad = Math.ceil(pd.ext * k) + 3, S = rad * 2 + 1;
    const mask = new Uint8Array(S * S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const wx = (cx - rad + i + 0.5) / k + x0 - pd.x, wy = (cy - rad + j + 0.5) / k + y0 - pd.y;
      const dl = wx * pd.ux + wy * pd.uy, dc = -wx * pd.uy + wy * pd.ux;
      const wob = (hash(cx + i, cy + j + 313) - 0.5) * 0.3;
      for (const [lo, co, rx, ry] of pd.lobes) if (((dl - lo) / rx) ** 2 + ((dc - co) / ry) ** 2 < 1 + wob) { mask[j * S + i] = 1; break; }
    }
    const inM = (i, j) => i >= 0 && j >= 0 && i < S && j < S && mask[j * S + i] === 1;
    const sky = [];
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const px = cx - rad + i, py = cy - rad + j;
      if (inM(i, j)) {
        const shade = !inM(i - 1, j) || !inM(i, j - 1) || !inM(i - 1, j - 1) || !inM(i, j - 2);
        put(px, py, shade ? wDeep : wMid);
        if (!shade && inM(i + 1, j) && inM(i + 2, j) && inM(i, j + 1)) sky.push([px, py]);
      } else if (inM(i - 1, j) || inM(i, j - 1) || inM(i - 1, j - 1)) put(px, py, lip);
      else if (inM(i + 1, j) || inM(i, j + 1) || inM(i + 1, j + 1)) put(px, py, mud);
    }
    // the glint: two or three pixels of sky, broken
    if (sky.length) {
      const [gx, gy] = sky[Math.floor(sky.length * 0.55)];
      put(gx, gy, wHi); put(gx + 1, gy, wHi);
      if (sky.length > 12) put(gx + 3, gy, wHi);
    }
  }
  const inPuddle = (x, y, m) => puddles.some((p) => Math.hypot(x - p.x, y - p.y) < p.ext + m);

  // prints: a walker's or a pony's, along one lane for a stretch
  for (let n = 0; n < L.prints; n++) {
    const a0 = from + 30 + rng() * (to - from - 80), len = 24 + rng() * 40;
    const lane = [-21, 0, 21][Math.floor(rng() * 3)] + (rng() - 0.5) * 6;
    const hoof = !snow && rng() < 0.4, step = hoof ? 4.5 : 3.4;
    for (let al = a0, j = 0; al < a0 + len; al += step, j++) {
      if (onBridge(al, 6)) continue;
      const [x, y, p] = spot(al, lane + (j % 2 ? 1.1 : -1.1));
      if (inPuddle(x, y, 2) || wetHere(x, y, 2)) continue;
      const fade = Math.min(al - a0, a0 + len - al) / 10;
      if (rng() > 0.3 + fade) continue;
      const [px, py] = toPx(x, y);
      // a print is two pixels along the march; a hoof a small cup
      const flat = Math.abs(p.ux) > Math.abs(p.uy);
      if (snow) {
        // a dent in the snow: its floor shaded, its far lip catching the light
        dim(px, py, 0.86); if (flat) dim(px + 1, py, 0.86); else dim(px, py + 1, 0.86);
        if (flat) { lift(px, py + 1, 0.4); lift(px + 1, py + 1, 0.4); } else { lift(px + 1, py, 0.4); lift(px + 1, py + 1, 0.4); }
      } else if (hoof) { dim(px, py, 0.86); dim(px + 1, py, 0.86); dim(px, py + 1, 0.92); if (flat) dim(px, py - 1, 0.92); }
      else if (flat) { dim(px, py, 0.86); dim(px + 1, py, 0.86); }
      else { dim(px, py, 0.86); dim(px, py + 1, 0.86); }
    }
  }
  // sled runners on the snow: two unbroken dented lines a sledge's width
  // apart, each with a lit lip on its lee side
  if (snow) {
    for (let n = 0; n < 3; n++) {
      const a0 = from + rng() * (to - from) * 0.8, len = 110 + rng() * 170, off = (rng() - 0.5) * 24;
      for (const r of [-3, 3]) {
        let lx = -1, ly = -1;
        for (let al = a0; al < Math.min(to, a0 + len); al += 0.5 / k) {
          if (onBridge(al, 4)) continue;
          const wob = Math.sin(al * 0.02 + n) * 2.5;
          const [x, y, p] = spot(al, off + wob + r + C.latAt(al));
          if (wetHere(x, y, 2) || inPuddle(x, y, 1)) continue;
          const [px, py] = toPx(x, y);
          if (px === lx && py === ly) continue;
          lx = px; ly = py;
          const fade = Math.min(al - a0, a0 + len - al);
          if (fade < 16 && hash(px, py + 5) > fade / 16) continue;
          dim(px, py, 0.86);
          if (Math.abs(p.ux) > Math.abs(p.uy)) lift(px, py + 1, 0.3); else lift(px + 1, py, 0.3);
        }
      }
    }
  }

  // a tuft: blades a pixel wide with a gap between some, the middle ones
  // tallest, the outer ones leaning out; dark at the root, lit at the tip,
  // a pixel of shadow down-right of each root
  const tuftPx = (x, y, n, hk, tc) => {
    const [bx, by] = toPx(x, y);
    let xs = 0;
    const cols = [];
    for (let b = 0; b < n; b++) { cols.push(xs); xs += 1 + (rng() < 0.55 ? 1 : 0); }
    const mid = (xs - 1) / 2;
    for (let b = 0; b < n; b++) {
      const cx = bx + cols[b] - Math.round(mid), side = (cols[b] - mid) / Math.max(1, mid);
      const hgt = Math.max(2, Math.round((3 + rng() * 3 + (1 - Math.abs(side)) * 2) * hk));
      const lean = side * 1.4 + 0.3 + (rng() - 0.5) * 0.8;
      dim(cx + 1, by + 1, 0.78);
      for (let s = 0; s < hgt; s++) {
        const u = s / (hgt - 1 || 1), c = s === 0 ? tc[0] : u < 0.6 ? tc[1] : tc[2];
        put(cx + Math.round(lean * u * u * hgt * 0.4), by - s, c);
      }
    }
  };

  // grass coming back on the hump between the ruts: a few small clumps,
  // only where both ruts run and the road runs straight
  if (L.grassCrown) {
    const nCrown = noiseOf(seed + 37, 40), gc = [rgb(darken(R.GRASS_DK, 0.12)), rgb(R.GRASS_DK), rgb(mix(R.GRASS, R.GRASS_LT, 0.4))];
    for (let al = from + 30; al < to - 20; al += 16 + rng() * 34) {
      const p = M.at(al);
      if (!C.rutOn(al, -1) || !C.rutOn(al, 1) || C.bendAt(al) > 0.25 || nCrown(p.x, p.y) < 0.5 || rng() > 0.55 || onBridge(al, 8)) continue;
      const n = 1 + (rng() < 0.4 ? 1 : 0);
      for (let c = 0; c < n; c++) {
        const [x, y] = spot(al + c * (2 + rng() * 2), C.latAt(al) + (rng() - 0.5) * 3.5);
        if (wetHere(x, y, 2) || inPuddle(x, y, 1)) continue;
        tuftPx(x, y, 4 + Math.floor(rng() * 3), 0.72, gc);
      }
    }
  }

  // pebbles and stones, gathered toward the edges where the wheels throw
  // them, some in little knots of two or three
  const pal = (col) => ({ L: rgb(lighten(col, 0.42)), B: rgb(col), D: rgb(mix(col, L.tones[0], 0.55)) });
  const PB = pal(L.pebble), ST = pal(L.stone), DK = pal(mix(L.tones[0], L.stone, 0.4));
  const ash = L.style === "ash";
  const step = 8 / Math.max(0.2, L.pebbles);
  for (let al = from + 6; al < to - 4; al += step * (0.5 + rng())) {
    if (onBridge(al, 5)) { rng(); rng(); continue; }
    const side = rng() < 0.5 ? -1 : 1, r = rng();
    const off = side * HALF * (r < 0.25 ? r * 1.2 : 0.42 + 0.46 * Math.sqrt(rng()));
    const [x, y] = spot(al, off);
    if (wetHere(x, y, 3) || inPuddle(x, y, 1.5)) continue;
    const sz = rng();
    const kind = sz < 0.3 ? 0 : sz < 0.48 ? 1 : sz < 0.65 ? 2 : sz < 0.85 ? 3 : sz < 0.97 ? 4 : 5;
    const col = rng();
    // (the cinders: clinker, dark lumps)
    const pl = ash && kind >= 2 ? (col < 0.7 ? DK : ST) : kind >= 3 ? (col < 0.6 ? ST : PB) : col < 0.55 ? PB : col < 0.85 ? ST : DK;
    stamp(x, y, PEBBLES[kind], pl);
    if (kind >= 2 && Math.abs(off) > HALF * 0.4 && rng() < (ash ? 0.6 : 0.35)) {
      const m = 1 + (rng() < 0.5 ? 1 : 0);
      for (let j = 0; j < m; j++) {
        const [qx, qy] = spot(al + (rng() - 0.5) * 6, off + (rng() - 0.5) * 5);
        if (!wetHere(qx, qy, 3) && !inPuddle(qx, qy, 1.5)) stamp(qx, qy, PEBBLES[rng() < 0.5 ? 0 : 1], pl === PB ? ST : pl);
      }
    }
  }

  // cinders: cracks in the crust (two pixels deep in the middle, a lit lip
  // on their far side, a short branch or two), and a few coals still alive
  if (L.cracks) {
    const crack = rgb(darken(L.tones[0], 0.25)), wallC = T[0], lipC = T[4];
    const isCrack = new Set();
    // a crack runs mostly one way, jogging a pixel now and then
    const walk = (px, py, len, th, deep) => {
      const pts = [], cx = Math.cos(th), cy = Math.sin(th);
      let jx = 0, jy = 0, lx = 1e9, ly = 1e9;
      for (let s = 0; s < len; s++) {
        if (rng() < 0.25) { jx += (rng() - 0.5) * 1.4; jy += (rng() - 0.5) * 1.4; jx = Math.max(-1.5, Math.min(1.5, jx)); jy = Math.max(-1.5, Math.min(1.5, jy)); }
        const qx = Math.round(px + cx * s + jx), qy = Math.round(py + cy * s + jy);
        if (qx === lx && qy === ly) continue;
        lx = qx; ly = qy;
        pts.push([qx, qy, deep && s > len * 0.15 && s < len * 0.8]);
      }
      return pts;
    };
    for (let n = 0; n < 30; n++) {
      const al = from + rng() * (to - from), [x, y, p] = spot(al, (rng() - 0.5) * HALF * 1.4);
      if (onBridge(al, 4) || wetHere(x, y, 2)) continue;
      const [px, py] = toPx(x, y), len = 12 + Math.floor(rng() * 14);
      // (across the road more often than along it)
      const th = Math.atan2(p.ux, -p.uy) + (rng() - 0.5) * 1.6 + (rng() < 0.3 ? Math.PI / 2 : 0);
      const main = walk(px, py, len, th, true);
      let all = main;
      if (rng() < 0.7) { const b = main[Math.floor(main.length * (0.35 + rng() * 0.35))]; all = all.concat(walk(b[0], b[1], 3 + Math.floor(rng() * 5), th + (rng() < 0.5 ? 0.8 : -0.8), false)); }
      for (const [qx, qy, deep] of all) { isCrack.add(qy * PW + qx); if (deep) isCrack.add((qy - 1) * PW + qx); }
      for (const [qx, qy, deep] of all) {
        put(qx, qy, crack);
        if (deep) put(qx, qy - 1, wallC);
        if (!isCrack.has((qy + 1) * PW + qx + 1)) put(qx + 1, qy + 1, lipC);
      }
    }
    const CP = { D: rgb(mix(L.tones[0], "#1e1414", 0.5)), B: rgb("#c8582a"), H: rgb("#f0a040") };
    for (let n = 0, tries = 0; n < 6 && tries < 40; tries++) {
      const al = from + 40 + rng() * (to - from - 80), side = rng() < 0.5 ? -1 : 1;
      const [x, y] = spot(al, side * HALF * (0.62 + rng() * 0.22));
      if (onBridge(al, 6) || wetHere(x, y, 3)) continue;
      stamp(x, y, COAL, CP); n++;
    }
  }

  // roots: where a broadleaf stands close by the road, two or three short
  // roots splay from the trunk's foot toward it and dive under the dirt —
  // thick at the trunk, tapering, lit on top, dark beneath, a shadow
  // down-right, broken once or twice where they dip under the soil
  if (L.roots && C.roots) {
    const ROOTED = new Set(["tree", "willow", "deadtree", "fenwillow", "fendead"]);
    const wood = mix("#6a4a2c", R.PATH_EDGE, 0.3), rB = rgb(wood), rL = rgb(lighten(wood, 0.3)), rD = rgb(darken(wood, 0.38));
    const g0 = M.segs[0];
    for (const dc of DECOR) {
      if (!ROOTED.has(dc.t)) continue;
      const sc = dc.s || 1, fy = dc.y + (dc.t === "willow" || dc.t === "fenwillow" ? 12 : 10);
      // (none round the spawn gate: the trees on its crag are lifted or left out)
      if (Math.hypot(dc.x - g0.x1, fy - g0.y1) < 120) continue;
      // the nearest point on this road to the trunk's foot
      let best = 1e9, bp = null;
      for (const s of M.segs) {
        const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
        const t = clamp01(((dc.x - s.x1) * vx + (fy - s.y1) * vy) / (s.len * s.len));
        const qx = s.x1 + vx * t, qy = s.y1 + vy * t, dd = Math.hypot(dc.x - qx, fy - qy);
        if (dd < best) { best = dd; bp = [qx, qy, s.start + t * s.len]; }
      }
      const gap = best - HALF;
      if (gap > 13 || gap < 1 || onBridge(bp[2], 10)) continue;
      const dx = (bp[0] - dc.x) / best, dy = (bp[1] - fy) / best;
      const h0 = hash(dc.x | 0, dc.y | 0), nr = 2 + (h0 < 0.35 ? 1 : 0);
      const cells = new Map();   // art pixel -> colour, so a root never shades itself
      for (let r = 0; r < nr; r++) {
        const h1 = hash((dc.x | 0) + r * 17, dc.y | 0), h2 = hash(dc.y | 0, (dc.x | 0) + r * 31);
        // from the tips of the trunk's flare (the middle one from its foot),
        // splaying outward as they go
        const f = (r / (nr - 1) - 0.5) * 2, px_ = -dy, py_ = dx;
        const sp = f * 0.6 + (h1 - 0.5) * 0.25, ca = Math.cos(sp), sa = Math.sin(sp);
        const rx = dx * ca + px_ * sa, ry = dy * ca + py_ * sa;
        const len = Math.min(4 + h2 * 4.5, gap + 3) * Math.sqrt(sc);
        const off = f * (6 * Math.abs(dy) + 1.5) * sc;
        const sx = dc.x + px_ * off, sy = fy + py_ * off + 0.3 + (1 - Math.abs(f)) * 0.6;
        const n = Math.ceil(len * k * 1.5), flat = Math.abs(rx) > Math.abs(ry);
        const g1 = 0.6 + h1 * 0.15, g2 = 0.85;   // where it dips under the soil
        for (let s = 0; s <= n; s++) {
          const u = s / n;
          if (Math.abs(u - g1) < 0.05 || (h2 < 0.4 && Math.abs(u - g2) < 0.04)) continue;
          const bow = Math.sin(u * Math.PI * 1.6 + h1 * 6) * 0.9 * u * sc;
          const wx = sx + rx * len * u - ry * bow, wy = sy + ry * len * u + rx * bow;
          const [px, py] = toPx(wx, wy);
          const th = u < 0.55 ? 3 : u < 0.85 ? 2 : 1;
          // across the root's run: lit on the sun's side, the wood, dark beneath
          for (let q = 0; q < th; q++) {
            const c = th === 1 ? rB : q === 0 ? rL : q === th - 1 ? rD : rB;
            const cx = flat ? px : px + q, cy = flat ? py + q : py;
            if (cx >= 0 && cy >= 0 && cx < PW - 1 && cy < PH - 1) cells.set(cy * PW + cx, c);
          }
        }
      }
      for (const key of cells.keys()) {
        const sk = key + PW + 1;   // the shadow, down-right
        if (!cells.has(sk)) { const px = sk % PW, py = (sk / PW) | 0; dim(px, py, 0.8); }
      }
      for (const [key, c] of cells) put(key % PW, (key / PW) | 0, c);
    }
  }

  // grass tufts (snow lumps on the snow) leaning out over the edge, in
  // clumps and gaps
  if (L.tuft || L.lumps) {
    const nEdge = noiseOf(seed + 11, 6.5), nWand = noiseOf(seed + 13, 46), nTuft = noiseOf(seed + 43, 28);
    const lumpRows = [".LL.", "LWWW", "WWWB", ".BB."];
    const LP = L.lumps ? { L: rgb(L.lumps[2]), W: rgb(L.lumps[1]), B: rgb(L.lumps[0]) } : null;
    const tc = L.tuft ? L.tuft.map(rgb) : null;
    for (let al = from + 4; al < to - 4; al += 2.5 + rng() * 3.5) {
      for (const side of [-1, 1]) {
        const p = M.at(al), nx = -p.uy * side, ny = p.ux * side;
        const cx = p.x + nx * HALF, cy = p.y + ny * HALF;
        // snow gathers on the lee edge (the one facing away from the sun)
        const lee = LP && nx * SX + ny * SY < -0.2 ? 1.8 : 1;
        const gate = smooth((nTuft(cx, cy) - 0.45) / 0.15) * 2.2;
        if (rng() > 0.19 * L.tufts * gate * lee) continue;
        if (onBridge(al, 8)) continue;
        const er = HALF - 0.7 + (nEdge(cx, cy) - 0.5) * 3.4 + (nWand(p.x, p.y) - 0.5) * 2.4;
        const x = p.x + nx * (er + 0.6 + rng() * 1.2), y = p.y + ny * (er + 0.6 + rng() * 1.2);
        if (wetHere(x, y, 3)) continue;
        // (not where another stretch of the road runs close by)
        const [tx, ty] = toPx(x, y);
        if (tx < 0 || ty < 0 || tx >= PW || ty >= PH || C.onRoad[ty * PW + tx]) continue;
        if (LP) { stamp(x, y, lumpRows, LP); continue; }
        tuftPx(x, y, 3 + Math.floor(rng() * 3), L.tuftH, tc);
      }
    }
  }
}

// The board's road: PTS, run on 60 past the edge it enters by (the
// landscape beyond carries it further), into the ground layer.
export function paintRoad(ctx) {
  if (!PTS.length) return;
  const [x0, y0] = PTS[0];
  const edgeStart = x0 <= 30 || y0 <= 30 || x0 >= W - 30 || y0 >= H - 30;
  // (paintRoadStrip writes pixels, so it wants the canvas's own grid)
  paintRoadStrip(ctx, PTS, { k: ctx.canvas.width / W, x0: 0, y0: 0, extStart: edgeStart ? 60 : 0, water: true, bridges: BRIDGES, roots: true });
}

// ---- the chevrons -------------------------------------------------------
// Each chevron is pressed into the road: a groove, dark on the wall that
// the sun can't reach, lit on the other, baked per chevron at its own angle
// straight into art pixels (so it stays crisp at any heading). It kindles
// with a warm light as a wave runs down the road in the direction of march,
// and burns bright while a column is near. Two stamps per chevron a frame.
// A chevron in a bend points along the leg it leads into (at 45° a chevron
// reads as a box corner, not an arrow); none sits at a bridge's ends.
// A realm with a bright CHEVRON colour (ember's orange) keeps that colour in
// the groove at rest; on pale roads (snow, the fen's dust) the light is a
// saturated amber, so a lit chevron stands out against the road.
const CHEV = 14;   // sprite size, world units
let CHEVS = { key: "", list: [], restA: 0.62, glowRest: 0.34 };
const chevronSprites = () => {
  const R = REALM;
  const key = `${R.id}|${CHEVRONS.length}|${CHEVRONS[0]?.x}|${CHEVRONS[0]?.y}|${BRIDGES.length}`;
  if (CHEVS.key === key) return CHEVS;
  const main = R.PATH_MAIN, dk = R.PATH_DK;
  const ch = (R.CHEVRON || "84,62,36").split(",").map(Number);
  const chHex = "#" + ch.map((v) => v.toString(16).padStart(2, "0")).join("");
  const bright = ch[0] * 0.3 + ch[1] * 0.59 + ch[2] * 0.11 > 120;
  const style = lookOf(R).style, pale = style === "snow" || style === "fen";
  const floor = rgb(bright ? mix(chHex, dk, 0.35) : mix(dk, chHex, 0.62));
  const wall = rgb(bright ? mix(chHex, "#1a1416", 0.62) : mix(dk, chHex, 0.9));
  const lit = rgb(bright ? mix(lighten(main, 0.3), chHex, 0.35) : lighten(main, 0.3));
  const glowC = rgb(bright ? chHex : pale ? "#d8862c" : lighten(main, 0.66));
  const glowHot = rgb(bright ? lighten(chHex, 0.45) : pale ? "#f4a848" : "#fff3d2");
  const n = CHEV * RES;
  const segD = (px, py, ax, ay, bx, by) => {
    const vx = bx - ax, vy = by - ay, t = clamp01(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy));
    return Math.hypot(px - ax - vx * t, py - ay - vy * t);
  };
  // in a bend (on one of the corner's short segments), point along the
  // nearer of the two legs, the one it leads into when it's halfway
  const M = measure(PTS), SG = M.segs;
  const segAt = (dd) => { let lo = 0, hi = SG.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (dd <= SG[m].start + SG[m].len) hi = m; else lo = m + 1; } return lo; };
  const leg = (si, step) => { for (let j = si; j >= 0 && j < SG.length; j += step) if (SG[j].len >= 14) return SG[j]; return SG[si]; };
  // Every chevron points along one of the four quarters (the road's legs run
  // across and up and down the board): a chevron at a slant is an L, a box
  // corner, and bakes thick and dark where its arms lie on the pixel grid.
  // So there are four sprites, each one exact and symmetric, and every
  // chevron — on a straight, in a bend, on a slanting leg — reads the same.
  const bake = (ang) => {
    const ca = Math.round(Math.cos(ang)), sa = Math.round(Math.sin(ang));
    const dAt = (i, j) => {
      const lx = (i + 0.5) / RES - CHEV / 2, ly = (j + 0.5) / RES - CHEV / 2;
      const u = lx * ca + ly * sa, v = -lx * sa + ly * ca;
      return Math.min(segD(u, v, 2, 0, -2.6, -4.6), segD(u, v, 2, 0, -2.6, 4.6));
    };
    const D = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) D[j * n + i] = dAt(i, j);
    const grooved = (i, j) => i >= 0 && j >= 0 && i < n && j < n && D[j * n + i] < 0.95;
    const mk = (fill) => {
      const cv = document.createElement("canvas");
      cv.width = n; cv.height = n;
      const cx = cv.getContext("2d"), im = cx.createImageData(n, n), q = im.data;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const col = fill(i, j);
        if (!col) continue;
        const o = (j * n + i) * 4;
        q[o] = col[0]; q[o + 1] = col[1]; q[o + 2] = col[2]; q[o + 3] = 255;
      }
      cx.putImageData(im, 0, 0);
      return cv;
    };
    const groove = mk((i, j) => {
      if (grooved(i, j)) {
        // the wall under the sunward lip lies in shadow; the far wall is lit
        if (!grooved(i - 1, j - 1) || !grooved(i, j - 1)) return wall;
        if (!grooved(i + 1, j + 1) || !grooved(i, j + 1)) return lit;
        return floor;
      }
      return null;
    });
    // the light lies IN the groove: its walls stay dark round it
    const glow = mk((i, j) => {
      if (!grooved(i, j)) return null;
      if (D[j * n + i] < 0.5) return glowHot;
      return grooved(i - 1, j - 1) && grooved(i, j - 1) && grooved(i + 1, j + 1) && grooved(i, j + 1) ? glowC : null;
    });
    return { groove, glow };
  };
  const QUART = [];
  const list = CHEVRONS.map((c) => {
    if (BRIDGES.some((b) => c.d > b.d0 - 8 && c.d < b.d1 + 8)) return null;
    const si = segAt(c.d), sc = SG[si];
    let ang = c.a;
    if (sc && sc.len < 14) {
      const a = leg(si, -1), b = leg(si, 1);
      const ti = Math.abs(turnOf(sc.ux, sc.uy, a.ux, a.uy)), to = Math.abs(turnOf(sc.ux, sc.uy, b.ux, b.uy));
      const g = ti < to - 0.1 ? a : b;
      ang = Math.atan2(g.uy, g.ux);
    }
    const q = ((Math.round(ang / (Math.PI / 2)) % 4) + 4) % 4;
    const spr = QUART[q] || (QUART[q] = bake(q * Math.PI / 2));
    return { groove: spr.groove, glow: spr.glow, x: Math.round((c.x - CHEV / 2) * RES) / RES, y: Math.round((c.y - CHEV / 2) * RES) / RES };
  });
  // (at rest a groove is stamped a little see-through, so the road shows in
  // it; on paving it goes solid and keeps a faint light in it, or at 1x it
  // reads as one more joint between the flags)
  const paved = style === "paved";
  CHEVS = { key, list, restA: bright ? 0.85 : paved ? 1 : 0.8, glowRest: bright || paved ? 0.5 : 0.34, glowOff: bright ? 0.2 : paved ? 0.24 : 0 };
  return CHEVS;
};

// which chevrons have a column within 60 of them (O(foes · log chevrons))
let NEAR = new Uint8Array(0);
export function drawRoadMarks(ctx, g) {
  if (!CHEVRONS.length) return;
  const { list, restA, glowRest, glowOff } = chevronSprites();
  const nC = CHEVRONS.length;
  if (NEAR.length !== nC) NEAR = new Uint8Array(nC); else NEAR.fill(0);
  for (const e of g.enemies) {
    if (e.dead) continue;
    let lo = 0, hi = nC;
    while (lo < hi) { const m = (lo + hi) >> 1; if (CHEVRONS[m].d <= e.dist - 60) lo = m + 1; else hi = m; }
    for (let j = lo; j < nC && CHEVRONS[j].d < e.dist + 60; j++) NEAR[j] = 1;
  }
  const a0 = ctx.globalAlpha;
  for (let i = 0; i < nC; i++) {
    const s = list[i];
    if (!s) continue;
    const on = Math.sin(g.time * 2.2 - CHEVRONS[i].d * 0.045) > 0, near = NEAR[i] === 1;
    ctx.globalAlpha = a0 * (near ? 0.95 : restA);
    ctx.drawImage(s.groove, s.x, s.y, CHEV, CHEV);
    const ga = near ? (on ? 0.95 : 0.55) : on ? glowRest : glowOff;
    if (ga > 0) { ctx.globalAlpha = a0 * ga; ctx.drawImage(s.glow, s.x, s.y, CHEV, CHEV); }
  }
  ctx.globalAlpha = a0;
}
