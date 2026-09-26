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
// from the centreline, and that distance, a few noise fields and the sun
// decide its tone. Nothing is stroked, so no edge is a ruled vector curve:
//   - the edge is bitten by the grass (noise on the road's half-width), with
//     a 1-2 px bank face — shaded where the edge faces the sun (the bank
//     throws a shadow into the road there), lit on the far side — and a
//     band of worn, trampled turf beyond it;
//   - the dirt is 5 stepped tones: a paler trodden crown, twin cart ruts
//     that come and go, damp dark drifts (darker near water), a pixel grain;
//   - then hand-placed pixel detail: pebbles and stones with a contact
//     shadow down-right, puddles in the ruts, faint foot and hoof prints,
//     roots where trees stand close, grass tufts overhanging the edge.
// Each old realm reads its own palette (REALM.PATH_*) and look: frostfang's
// packed snow track (sled runners, ice, blue shadows), ember's cinder road
// (cracks, clinker, a few live coals), mistmoor's peat track (puddles,
// rushes). The Marches get only the verge (their paving covers the rest).
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
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
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
    crown: 0.1, ruts: 1, drift: 1, bias: 0, grain: 1,
    grassCrown: true, puddles: 3, prints: 6, roots: true, tufts: 1, pebbles: 1,
    pebble: R.PEBBLE, stone: mix(dk, "#8d8478", 0.45),
    tuft: [darken(R.GRASS_DK, 0.18), R.GRASS, lighten(R.GRASS_LT, 0.12)], tuftH: 1,
    water: R.water || { deep: "#3a6a7c", edge: "#4a8094", shine: "#8cc4d8" },
  };
  if (style === "snow") {
    const snow = mix(R.GRASS_LT, "#f6fafc", 0.5);
    L.tones = [mix(dk, edge, 0.28), mix(main, dk, 0.55), main, mix(main, R.GRASS, 0.45), mix(main, snow, 0.62)];
    L.bankDk = mix(edge, dk, 0.35); L.bankMid = mix(dk, main, 0.4); L.bankLt = mix(snow, "#ffffff", 0.4);
    L.worn = snow; L.wornT = 0.55;
    L.crown = 0.06; L.ruts = 0.55; L.grassCrown = false; L.puddles = 3; L.prints = 9; L.roots = false; L.pebbles = 0.3;
    L.stone = mix(edge, "#6a7280", 0.5); L.pebble = mix(R.PEBBLE, edge, 0.35);
    L.tuft = null; L.lumps = [mix(edge, main, 0.35), snow, "#fbfdff"]; L.grain = 0.55; L.drift = 1.35; L.bias = 0.02;
  } else if (style === "ash") {
    L.tones = [mix(dk, edge, 0.5), mix(main, dk, 0.6), main, lighten(main, 0.09), lighten(main, 0.2)];
    L.bankDk = mix(edge, dk, 0.25); L.bankMid = mix(dk, edge, 0.5); L.bankLt = lighten(main, 0.16);
    L.worn = mix(R.GRASS_DK, edge, 0.4); L.wornT = 0.55;
    L.crown = 0.07; L.ruts = 0.6; L.grassCrown = false; L.puddles = 0; L.prints = 3; L.roots = false; L.pebbles = 1.2;
    L.stone = mix(edge, "#3a3236", 0.3); L.pebble = mix(R.PEBBLE, main, 0.3); L.grain = 1.6;
    L.tuft = [mix(R.GRASS_DK, "#2a2224", 0.3), "#6e6050", "#8e7e66"]; L.tuftH = 0.8;
    L.cracks = true;
  } else if (style === "peat") {
    L.bias = -0.04; L.puddles = 5; L.prints = 8; L.pebbles = 0.6;
    L.water = { deep: "#262a22", edge: "#4e5242", shine: "#9aac9a" };
    L.tuft = [darken(R.TUFT, 0.25), R.GRASS_DK, lighten(R.GRASS_LT, 0.18)]; L.tuftH = 1.35;
  } else if (style === "fen") {
    L.puddles = 0; L.prints = 4; L.pebbles = 0.5; L.grassCrown = false;
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
// o.bridges: [{ d0, d1 }] along the road, kept clear of puddles and pebbles.
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
  const nDrift = noiseOf(seed + 19, 38), nMid = noiseOf(seed + 23, 12), nRutC = noiseOf(seed + 29, 60), nRutS = noiseOf(seed + 31, 90);
  const paved = L.style === "paved";
  const T = L.tonesC, ap = 1 / k, ik = ap;
  const BIAS = L.bias - L.crown * 0.45 + 0.5, CROWN = L.crown, GR0 = 0.045 * L.grain, GR1 = 1 - 0.022 * L.grain, WATER = !!o.water;
  // what changes along the road, sampled every STEP at the centreline: its
  // wander, where the ruts run and how deep, how damp it is (near a river or
  // a pond). Sampled from 2-D noise at the centreline, so a strip painted on
  // past the board (the apron) carries on from the same fields.
  const STEP = 2, nS = Math.ceil((M.total + extS + extE) / STEP) + 2;
  const wand = new Float32Array(nS), rutC = new Float32Array(nS), rutS = new Float32Array(nS), wet = new Float32Array(nS);
  for (let i = 0; i < nS; i++) {
    const p = M.at(i * STEP - extS);
    wand[i] = (nWand(p.x, p.y) - 0.5) * 2.4;
    rutC[i] = 11.5 + (nRutC(p.x, p.y) - 0.5) * 4.2;
    rutS[i] = smooth((nRutS(p.x, p.y) - 0.36) / 0.26) * L.ruts;
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
  const last = segs.length - 1, R2 = REACH * REACH, EDGE_IN = HALF - 4.2;
  const gravel = L.gravel ? L.gravel.map(rgb) : null;
  const RT = rndTable();
  // the dirt's drifts (two noise fields) on a lattice one world unit apart,
  // filled as the road reaches it and read bilinearly
  const DX0 = Math.floor(x0) - 1, DY0 = Math.floor(y0) - 1, DW = Math.ceil(PW / k) + 4, DH = Math.ceil(PH / k) + 4;
  const dv = new Float32Array(DW * DH), df = new Uint8Array(DW * DH);
  const dfill = (q) => {
    const i = q % DW, j = (q / DW) | 0;
    // (sampled on turned axes, so the value noise never shows its square cells)
    const x = DX0 + i, y = DY0 + j;
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
        for (let px = X0; px <= X1; px++) {
          const x = x0 + (px + 0.5) / k - sx1;
          let t = (x * vx + y * vy) * iL2;
          t = t < tlo ? tlo : t > thi ? thi : t;
          const ex = x - vx * t, ey = y - vy * t, dd = ex * ex + ey * ey, i = row + px;
          if (dd < bd[i]) { bd[i] = dd; bqx[i] = sx1 + vx * t; bqy[i] = sy1 + vy * t; bal[i] = s.start + t * s.len; }
        }
      }
    }
    for (let py = by; py < by + bh; py++) {
      const y = y0 + (py + 0.5) / k, row = (py - by) * PW;
      for (let px = bx0; px <= bx1; px++) {
        const i = row + px, d2 = bd[i];
        if (d2 >= R2) continue;
        const dist = Math.sqrt(d2);
        const x = x0 + (px + 0.5) * ik, qx = bqx[i], qy = bqy[i], al = bal[i];
        const s = dist > 0.01 ? ((x - qx) * SX + (y - qy) * SY) / dist : 0;   // > 0: this edge faces the sun
        const ax = Math.floor(x * 2 + 1e-4), ay = Math.floor(y * 2 + 1e-4);    // the world's art pixel
        const dz = BAYER[(ay & 3) * 4 + (ax & 3)], rn = (ay & 255) << 8 | (ax & 255);
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
            if (f * 0.9 + dz * 0.6 > 0.42) {
              const t = L.wornT * (0.55 + 0.45 * f), c = L.wornC;
              d[o4] += (c[0] - d[o4]) * t; d[o4 + 1] += (c[1] - d[o4 + 1]) * t; d[o4 + 2] += (c[2] - d[o4 + 2]) * t;
            }
          }
          continue;
        }
        if (paved) continue;   // (the paving covers it all)
        onRoad[py * PW + px] = 1;
        // ---- the road itself: one tone field, cut into five tones ----
        const a = dist;
        let v = BIAS + CROWN * (1 - (a / HALF) * (a / HALF));
        {
          const fx = x - DX0, fy = y - DY0, ix = fx | 0, iy = fy | 0, u = fx - ix, w = fy - iy, q = iy * DW + ix;
          if (!df[q]) dfill(q);
          if (!df[q + 1]) dfill(q + 1);
          if (!df[q + DW]) dfill(q + DW);
          if (!df[q + DW + 1]) dfill(q + DW + 1);
          const A = dv[q], B = dv[q + 1], C = dv[q + DW], D = dv[q + DW + 1];
          v += (A + (B - A) * u) * (1 - w) + (C + (D - C) * u) * w;
        }
        if (WATER) v -= (wet[ia] + (wet[ia + 1] - wet[ia]) * ua) * 0.14;
        // twin cart ruts, wandering a little, fading in and out
        const rs = rutS[ia] + (rutS[ia + 1] - rutS[ia]) * ua;
        if (rs > 0) {
          const rp = 1 - Math.abs(a - (rutC[ia] + (rutC[ia + 1] - rutC[ia]) * ua)) / 2.6;
          if (rp > 0) v -= 0.17 * Math.sqrt(rp) * rs;
        }
        // the bank's shadow thrown into the road along the sunward edge
        const inside = -e;
        if (s > 0.2 && inside < (0.6 + 2.6 * (s - 0.2)) + dz * 0.8) v -= 0.17;
        const ti = v + dz * 0.07;
        let idx = ti < 0.25 ? 0 : ti < 0.4 ? 1 : ti < 0.63 ? 2 : ti < 0.79 ? 3 : 4;
        // the road's own rim: one pixel a step darker where it meets the bank
        if (inside < ap && s > -0.3) idx = Math.max(0, idx - 1);
        else if (inside < ap) idx = Math.min(4, idx + 1);
        // grain: single pixels a step off
        const h = RT[rn];
        if (h < GR0) idx = idx > 0 ? idx - 1 : 0;
        else if (h > GR1) idx = idx < 4 ? idx + 1 : 4;
        const c = T[idx];
        d[o4] = c[0]; d[o4 + 1] = c[1]; d[o4 + 2] = c[2];
      }
    }
  }
  if (!paved) roadDetail(d, PW, PH, { R, L, M, k, x0, y0, extS, extE, seed, onRoad, bridges: o.bridges || [], wetAt: o.water ? wetAt : () => 0, rutC: (al) => along(rutC, al), rutS: (al) => along(rutS, al) });
  ctx.putImageData(img, 0, 0);
}

// ---- the pixel detail: stones, water, prints, roots, grass --------------
// Stamps are written straight into the pixels, one art pixel per canvas
// pixel. Letters: L lit, B body, D dark, W snow (the snow lumps), S contact
// shadow (darkens whatever is under it).
const PEBBLES = [
  ["LS"],
  ["LB", "DS"],
  ["LB.", "BDS", ".S."],
  [".LB.", "LBBD", ".BDS", "..S."],
  [".LLB.", "LBBBD", "BBBDD", ".DDSS", "..SS."],
  ["..LLB..", ".LBBBD.", "LBBBBBD", "BBBBBDD", ".DDDDS.", "..SSSS."],
];
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

  // puddles, lying in the ruts and the damp hollows
  const puddles = [];
  const nP = Math.round(L.puddles * (0.7 + 0.6 * rng()));
  for (let tries = 0; puddles.length < nP && tries < 60; tries++) {
    const al = from + 60 + rng() * (to - from - 120), wetB = wetAt(al);
    if (rng() > 0.35 + wetB) continue;
    if (onBridge(al, 34)) continue;
    const side = rng() < 0.5 ? -1 : 1, rc = C.rutC(al);
    const [x, y] = spot(al, side * (rc + (rng() - 0.5) * 3));
    if (wetHere(x, y, 6) || puddles.some((p) => Math.hypot(p[0] - x, p[1] - y) < 50)) continue;
    if (CHEVRONS.some((ch) => Math.hypot(ch.x - x, ch.y - y) < 12)) continue;
    puddles.push([x, y, 4 + rng() * 3.5, 2 + rng() * 1.3]);
  }
  const ice = L.style === "snow";
  const wDeep = rgb(ice ? mix(L.tones[2], "#86b2c8", 0.45) : mix(L.water.deep, L.tones[0], 0.4));
  const wMid = rgb(ice ? mix(L.tones[3], "#d4ecf6", 0.5) : mix(mix(L.water.edge, L.water.shine, 0.25), L.tones[1], 0.5));
  const wHi = rgb(ice ? "#fbfeff" : mix(lighten(L.water.shine, 0.35), L.tones[3], 0.25));
  const mud = ice ? T[1] : rgb(darken(L.tones[0], 0.18)), lip = T[3];
  for (const [x, y, rx, ry] of puddles) {
    const [cx, cy] = toPx(x, y), RX = rx * k, RY = ry * k;
    for (let j = Math.floor(-RY - 2); j <= RY + 2; j++) {
      for (let i = Math.floor(-RX - 2); i <= RX + 2; i++) {
        const w = ((i + 0.5) / RX) ** 2 + ((j + 0.5) / RY) ** 2;
        // a ragged shore: the hash nibbles the outline
        const wob = (hash(cx + i, cy + j + 313) - 0.5) * 0.25;
        if (w > 1.45 + wob) continue;
        if (w > 1 + wob) { if ((i + j) > 0) put(cx + i, cy + j, lip); else put(cx + i, cy + j, mud); continue; }
        if (w > 0.8 + wob) { put(cx + i, cy + j, mud); continue; }
        // the water: shaded under its sunward lip, sky in the rest
        const up = (i / RX + j / RY) < -0.35;
        put(cx + i, cy + j, up ? wDeep : wMid);
      }
    }
    // a glint of sky
    const gl = Math.max(2, Math.round(RX * 0.5));
    for (let i = 0; i < gl; i++) put(cx - Math.round(RX * 0.15) + i, cy + Math.round(RY * 0.1), wHi);
    if (ice) put(cx + gl - 1, cy - 1 + Math.round(RY * 0.1), wHi);
  }
  const inPuddle = (x, y, m) => puddles.some(([px, py, rx, ry]) => ((x - px) / (rx + m)) ** 2 + ((y - py) / (ry + m)) ** 2 < 1);

  // prints: a walker's or a pony's, along one lane for a stretch
  for (let n = 0; n < L.prints; n++) {
    const a0 = from + 30 + rng() * (to - from - 80), len = 24 + rng() * 40;
    const lane = [-21, 0, 21][Math.floor(rng() * 3)] + (rng() - 0.5) * 6;
    const hoof = L.style !== "snow" && rng() < 0.4, step = hoof ? 4.5 : 3.4;
    for (let al = a0, j = 0; al < a0 + len; al += step, j++) {
      if (onBridge(al, 6)) continue;
      const [x, y, p] = spot(al, lane + (j % 2 ? 1.1 : -1.1));
      if (inPuddle(x, y, 2) || wetHere(x, y, 2)) continue;
      const fade = Math.min(al - a0, a0 + len - al) / 10;
      if (rng() > 0.3 + fade) continue;
      const [px, py] = toPx(x, y), f = L.style === "snow" ? 0.84 : 0.86;
      // a print is two pixels along the march; a hoof a small cup
      const along = Math.abs(p.ux) > Math.abs(p.uy);
      if (hoof) { dim(px, py, f); dim(px + 1, py, f); dim(px, py + 1, f + 0.06); if (along) dim(px, py - 1, f + 0.06); }
      else if (along) { dim(px, py, f); dim(px + 1, py, f); }
      else { dim(px, py, f); dim(px, py + 1, f); }
      // in snow a print is a dent: its far wall catches the light
      if (L.style === "snow") { lift(px + 1, py + (along ? 1 : 2), 0.3); dim(px, py, 0.94); }
    }
  }
  // sled runners on the snow: two thin lines, a sledge's width apart
  if (L.style === "snow") {
    for (let n = 0; n < 3; n++) {
      const a0 = from + rng() * (to - from) * 0.6, len = 140 + rng() * 260, off = (rng() - 0.5) * 30;
      for (let al = a0; al < Math.min(to, a0 + len); al += 0.5 / k * 2) {
        if (onBridge(al, 4)) continue;
        const wob = Math.sin(al * 0.02 + n) * 2.5;
        for (const r of [-3, 3]) {
          const [x, y] = spot(al, off + wob + r);
          if (wetHere(x, y, 2)) continue;
          const [px, py] = toPx(x, y);
          const fade = Math.min(al - a0, a0 + len - al);
          if (fade < 12 && hash(px, py + 5) > fade / 12) continue;
          if (hash(px, py) < 0.2) continue;
          dim(px, py, 0.93);
        }
      }
    }
  }

  // grass coming back on the hump between the ruts, in wisps
  if (L.grassCrown) {
    const nCrown = noiseOf(seed + 37, 22), g0 = rgb(R.GRASS_DK), g1 = rgb(mix(R.GRASS, R.GRASS_LT, 0.3));
    for (let al = from + 20; al < to - 10; al += 1.6 + rng() * 2) {
      const p = M.at(al);
      if (C.rutS(al) < 0.6 || nCrown(p.x, p.y) < 0.56 || rng() > 0.6 || onBridge(al, 6)) continue;
      const [x, y] = spot(al, (rng() - 0.5) * 4.5);
      if (wetHere(x, y, 2)) continue;
      const [bx, by] = toPx(x, y), n = 1 + Math.floor(rng() * 3);
      for (let b = 0; b < n; b++) {
        const hg = 1 + Math.floor(rng() * 2.4);
        for (let q = 0; q < hg; q++) put(bx + b * 2 - n + 1, by - q, q === hg - 1 && hg > 1 ? g1 : g0);
      }
    }
  }

  // pebbles and stones, gathered toward the edges where the wheels throw them
  const pal = (col) => ({ L: rgb(lighten(col, 0.42)), B: rgb(col), D: rgb(mix(col, L.tones[0], 0.55)) });
  const PB = pal(L.pebble), ST = pal(L.stone), DK = pal(mix(L.tones[0], L.stone, 0.4));
  const step = 7 / Math.max(0.2, L.pebbles);
  for (let al = from + 6; al < to - 4; al += step * (0.5 + rng())) {
    if (onBridge(al, 5)) { rng(); rng(); continue; }
    const side = rng() < 0.5 ? -1 : 1, r = rng();
    const off = side * HALF * (r < 0.25 ? r * 1.2 : 0.42 + 0.46 * Math.sqrt(rng()));
    const [x, y] = spot(al, off);
    if (wetHere(x, y, 3) || inPuddle(x, y, 1.5)) continue;
    const sz = rng();
    const kind = sz < 0.46 ? 0 : sz < 0.72 ? 1 : sz < 0.88 ? 2 : sz < 0.96 ? 3 : sz < 0.99 ? 4 : 5;
    const col = rng();
    stamp(x, y, PEBBLES[kind], kind >= 3 ? (col < 0.6 ? ST : PB) : col < 0.55 ? PB : col < 0.85 ? ST : DK);
  }

  // cinders: cracks in the crust, clinker, and a few coals still alive
  if (L.cracks) {
    const crack = T[0], coal = [rgb("#c8582a"), rgb("#e89040")];
    for (let n = 0; n < 34; n++) {
      const al = from + rng() * (to - from), [x, y] = spot(al, (rng() - 0.5) * HALF * 1.6);
      if (onBridge(al, 4) || wetHere(x, y, 2)) continue;
      let [px, py] = toPx(x, y);
      const len = 4 + Math.floor(rng() * 8);
      let dx = rng() < 0.5 ? 1 : -1, dy = rng() < 0.5 ? 1 : 0;
      for (let s = 0; s < len; s++) {
        put(px, py, crack);
        if (n % 6 === 0 && s === (len >> 1)) put(px, py, coal[s & 1]);
        if (rng() < 0.3) { dy = dy ? 0 : 1; } if (rng() < 0.15) dx = -dx;
        px += dx; py += dy;
      }
    }
  }

  // roots: where a tree stands close by the road, a root or two runs out
  // across the verge and under the dirt
  if (L.roots) {
    const ROOTED = new Set(["tree", "willow", "deadtree", "fenwillow", "fendead"]);
    const wood = mix("#6a4a2c", R.PATH_EDGE, 0.3), rb = rgb(wood), rl = rgb(lighten(wood, 0.3));
    for (const dc of DECOR) {
      if (!ROOTED.has(dc.t)) continue;
      // the nearest point on this road
      let best = 1e9, bp = null;
      for (const s of M.segs) {
        const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
        const t = clamp01(((dc.x - s.x1) * vx + (dc.y - s.y1) * vy) / (s.len * s.len));
        const qx = s.x1 + vx * t, qy = s.y1 + vy * t, dd = Math.hypot(dc.x - qx, dc.y - qy);
        if (dd < best) { best = dd; bp = [qx, qy, s.start + t * s.len]; }
      }
      if (best > HALF + 22 * (dc.s || 1) || onBridge(bp[2], 10)) continue;
      const nr = hash(dc.x | 0, dc.y | 0) < 0.35 ? 2 : 1;
      for (let r = 0; r < nr; r++) {
        const h1 = hash((dc.x | 0) + r * 17, dc.y | 0), h2 = hash(dc.y | 0, (dc.x | 0) + r * 31);
        // from the trunk's foot toward the road, splayed a little
        let x = dc.x + (h1 - 0.5) * 6, y = dc.y + 1;
        const tx = bp[0] + (dc.x - bp[0]) / best * (HALF - 5 - h2 * 8) + (h2 - 0.5) * 16, ty = bp[1] + (dc.y - bp[1]) / best * (HALF - 5 - h2 * 8);
        const len = Math.hypot(tx - x, ty - y), n = Math.ceil(len * k), flat = Math.abs(tx - x) > Math.abs(ty - y);
        let lastPx = -1, lastPy = -1;
        for (let s = 0; s <= n; s++) {
          const u = s / n;
          const wob = Math.sin(u * 9 + h1 * 6) * 1.2 * u;
          const px = Math.floor((x + (tx - x) * u + wob * (ty - y) / len - x0) * k), py = Math.floor((y + (ty - y) * u - wob * (tx - x) / len - y0) * k);
          if (px === lastPx && py === lastPy) continue;
          lastPx = px; lastPy = py;
          const thick = u < 0.7 ? 2 : 1;
          if (wetHere(x0 + px / k, y0 + py / k, 2)) break;
          // two pixels across the root's run: lit on the sun's side, the
          // wood beyond it, a shadow past that
          if (flat) {
            put(px, py, thick > 1 ? rl : rb);
            if (thick > 1) put(px, py + 1, rb);
            dim(px + 1, py + thick, 0.8);
          } else {
            put(px, py, thick > 1 ? rl : rb);
            if (thick > 1) put(px + 1, py, rb);
            dim(px + thick, py + 1, 0.8);
          }
        }
      }
    }
  }

  // a tuft: blades a pixel wide with a gap between some, the middle ones
  // tallest, the outer ones leaning out; dark at the root, lit at the tip,
  // a pixel of shadow down-right of each root
  const tc = L.tuft ? L.tuft.map(rgb) : null;
  const tuftPx = (x, y, n, hk) => {
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
  // grass tufts (snow lumps on the snow) leaning out over the edge
  if (L.tuft || L.lumps) {
    const nEdge = noiseOf(seed + 11, 6.5), nWand = noiseOf(seed + 13, 46);
    const lumpRows = [".LL.", "LWWW", "WWWB", ".BB."];
    const LP = L.lumps ? { L: rgb(L.lumps[2]), W: rgb(L.lumps[1]), B: rgb(L.lumps[0]) } : null;
    for (let al = from + 4; al < to - 4; al += 5 + rng() * 6) {
      for (const side of [-1, 1]) {
        if (rng() > 0.36 * L.tufts) continue;
        if (onBridge(al, 8)) continue;
        const p = M.at(al), nx = -p.uy * side, ny = p.ux * side;
        const cx = p.x + nx * HALF, cy = p.y + ny * HALF;
        const er = HALF - 0.7 + (nEdge(cx, cy) - 0.5) * 3.4 + (nWand(p.x, p.y) - 0.5) * 2.4;
        const x = p.x + nx * (er + 0.6 + rng() * 1.2), y = p.y + ny * (er + 0.6 + rng() * 1.2);
        if (wetHere(x, y, 3)) continue;
        // (not where another stretch of the road runs close by)
        const [tx, ty] = toPx(x, y);
        if (tx < 0 || ty < 0 || tx >= PW || ty >= PH || C.onRoad[ty * PW + tx]) continue;
        if (LP) { stamp(x, y, lumpRows, LP); continue; }
        tuftPx(x, y, 3 + Math.floor(rng() * 3), L.tuftH);
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
  paintRoadStrip(ctx, PTS, { k: ctx.canvas.width / W, x0: 0, y0: 0, extStart: edgeStart ? 60 : 0, water: true, bridges: BRIDGES });
}

// ---- the chevrons -------------------------------------------------------
// Each chevron is pressed into the road: a groove, dark on the wall that
// the sun can't reach, lit on the other, baked per chevron at its own angle
// straight into art pixels (so it stays crisp at any heading). It kindles
// with a warm light as a wave runs down the road in the direction of march,
// and burns bright while a column is near. Two stamps per chevron a frame.
const CHEV = 14;   // sprite size, world units
let CHEVS = { key: "", list: [] };
const chevronSprites = () => {
  const R = REALM;
  const key = `${R.id}|${CHEVRONS.length}|${CHEVRONS[0]?.x}|${CHEVRONS[0]?.y}`;
  if (CHEVS.key === key) return CHEVS.list;
  const main = R.PATH_MAIN, dk = R.PATH_DK;
  const ch = (R.CHEVRON || "84,62,36").split(",").map(Number);
  const chHex = "#" + ch.map((v) => v.toString(16).padStart(2, "0")).join("");
  const bright = ch[0] * 0.3 + ch[1] * 0.59 + ch[2] * 0.11 > 120;
  const floor = rgb(bright ? mix(dk, R.PATH_EDGE, 0.55) : mix(dk, chHex, 0.62));
  const wall = rgb(bright ? mix(R.PATH_EDGE, "#1a1416", 0.3) : mix(dk, chHex, 0.9));
  const lit = rgb(lighten(main, 0.3));
  const glowC = rgb(bright ? chHex : lighten(main, 0.66)), glowHot = rgb(bright ? lighten(chHex, 0.45) : "#fff3d2");
  const n = CHEV * RES;
  const segD = (px, py, ax, ay, bx, by) => {
    const vx = bx - ax, vy = by - ay, t = clamp01(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy));
    return Math.hypot(px - ax - vx * t, py - ay - vy * t);
  };
  const list = CHEVRONS.map((c) => {
    const ca = Math.cos(c.a), sa = Math.sin(c.a);
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
    return { groove, glow, x: Math.round((c.x - CHEV / 2) * RES) / RES, y: Math.round((c.y - CHEV / 2) * RES) / RES };
  });
  CHEVS = { key, list };
  return list;
};

// which chevrons have a column within 60 of them (O(foes · log chevrons))
let NEAR = new Uint8Array(0);
export function drawRoadMarks(ctx, g) {
  if (!CHEVRONS.length) return;
  const list = chevronSprites();
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
    const ch = CHEVRONS[i], s = list[i];
    const on = Math.sin(g.time * 2.2 - ch.d * 0.045) > 0, near = NEAR[i] === 1;
    ctx.globalAlpha = a0 * (near ? 0.95 : 0.62);
    ctx.drawImage(s.groove, s.x, s.y, CHEV, CHEV);
    const ga = near ? (on ? 0.95 : 0.55) : on ? 0.34 : 0;
    if (ga > 0) { ctx.globalAlpha = a0 * ga; ctx.drawImage(s.glow, s.x, s.y, CHEV, CHEV); }
  }
  ctx.globalAlpha = a0;
}
