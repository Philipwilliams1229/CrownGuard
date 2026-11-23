// The overhaul: WATER AND BANKS (B1; art/briefs/overhaul-build-millrace.md, "Water and banks").
// The approved look is concept/overhaul2-water.js option A ("cut into the land"), river edges cut bank,
// grassy lip, reeds and lilies, stone quay (no shingle), copied here and made to bake into the game.
//
// Slots (registered here, B1's alone): bakeWater, waterLive, openWater, apronRiver.
// Exports for the other builders (stable): waterDist(x, y) (units to the waterline, < 0 in the water),
// openWater(x, y) (visible open water, not a bank face), WATER_PAL (the water's ramp, hex).
//
// BAKE (once per sun: groundLayer rebuilds on a new sun): field.js rasters a signed-distance field over
// the rivers' box at one art px, the colour pass below turns it into an RGBA overlay (opaque water and
// faces, soft tints on the land side), drawn into the ground; the live pieces (waterlive.js, waterlife.js)
// take their placements from the same field, then the field is dropped.
// FRAME: waterlive.js (flow dashes, foam at face feet, the weir's churn, rings), waterlife.js (reeds and
// lilies swaying, ducks, a heron). Blits and fillRects only.
import { register, OVH, ovhOn } from "./index.js";
import { DAY } from "../../data/sun.js";
import { RIVERS, PONDS, COAST, inSea } from "../../data/terrain.js";
import { W, H } from "../../data/constants.js";
import { buildField, bodies, waterDist as fieldDist, openWater as fieldOpen, clamp, sstep, hs, vn, bay, HFACE } from "./field.js";
import { buildLive, drawLive, liveMB } from "./waterlive.js";
import { buildLife, drawLife, lifeMB } from "./waterlife.js";

export const waterDist = fieldDist;
export const openWater = fieldOpen;

// ---------------- palettes (A's water, which the owner chose) ----------------
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const pal = (...a) => a.map(hex);
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const WATER_PAL = ["#18384a", "#1f4a5a", "#28606c", "#33787c", "#46908a", "#68aa98", "#96c6ac"];
export const WA = pal(...WATER_PAL);
export const FOAM = hex("#f2f4e6"), FOAM2 = hex("#cfe2da");
const EARTH = pal("#3a2618", "#573a25", "#74503a", "#916a46", "#ae885a", "#c8a674");
const CLAY = pal("#6e5a44", "#8c765a", "#a89070");
export const STONE = pal("#4a4842", "#666258", "#847e70", "#a49c8a", "#c4bca6", "#ddd6c0");
export const TURF = pal("#2c4a22", "#3c6a2c", "#4f8a3a", "#6aa848", "#8cc45c", "#acd878");
const LINE_LIP = hex("#22361e"), GRASS_W = hex("#4c7a3c"), SLACK = hex("#3e5636"), WEED = hex("#3a5a34"), SKY = hex("#a8ccc4");
const KI_LIP = 0, KI_CUT = 1, KI_REEDS = 2, KI_QUAY = 3;

// the hour on the water: warm tint colour, glitter colour (null at noon / cool suns)
const hour = () => {
  const warm = DAY.on ? DAY.warm || 0 : 0;
  const rose = DAY.tone === "rose";
  return { warm, tint: rose ? hex("#6a5a7a") : hex("#7a6a62"), glit: rose ? hex("#ffc0a0") : hex("#ffc870"), hot: hex(DAY.col || "#ffffff"), shadeTint: rose ? hex("#2a2050") : warm > 0.4 ? hex("#2a2050") : hex("#14262e") };
};

// ---------------- the sun on a face ----------------
const faceTone = (fnx, fny) => {
  // (fnx, fny) the face's outward normal (toward the water). A south face is the face we look at: mid, never black.
  const L = DAY.L, l = Math.hypot(L[0], L[1]) || 1, lit = (fnx * L[0] + fny * L[1]) / l;
  return Math.max(1.85, 2.35 + lit * 1.45 + (fny > 0 ? 0.65 * fny : 0));
};
function facePixel(kind, hf, fw, e, X, Y, s, fnx, fny, HR) {
  const tone = faceTone(fnx, fny), hot = HR.warm > 0.4 && tone > 2.6;
  if (kind === KI_QUAY) {
    if (e < 1) return STONE[1];
    const row = Math.floor((e - 1) / 4), off = (row & 1) * 6, bl = Math.floor((s + off) / 12);
    const joint = ((e - 1) % 4) < 0.9 || ((s + off) % 12 + 12) % 12 < 1;
    const ti = clamp(Math.round(tone + (hs(bl, row, 71) - 0.5) * 1.2), 1, 5);
    let c = joint ? STONE[Math.max(0, ti - 2)] : STONE[ti];
    if (hf > 0.78) c = lerp(c, hex("#3e5a30"), hf > 0.9 ? 0.75 : 0.45);   // weed and wet at the water
    if (hot) c = lerp(c, HR.hot, 0.28 * HR.warm);
    return c;
  }
  // earth: strata, set stones, roots under a hanging turf lip, a wet seam at the foot
  const ov = Math.min(1, fw / 10);
  if (e < 1.2 * ov) return tone > 2.8 ? TURF[3] : TURF[2];
  if (e < 2.4 * ov && hs(Math.floor(s), 2, 72) > 0.45) return TURF[1];
  const drip = hs(Math.floor(s), 3, 73); if (e < (2 + drip * 4) * ov && drip > 0.78) return drip > 0.9 ? TURF[2] : TURF[1];
  if (hf > 0.86) return EARTH[0];
  const band = Math.floor(hf * 4.2 + (vn(s / 16, 3, 74) - 0.5) * 1.4);
  const ti = tone + [0.3, -0.2, 0.5, -0.5, 0.1][((band % 5) + 5) % 5] + (hs(X, Y, 75) - 0.5) * 0.5;
  let c = EARTH[clamp(Math.round(ti), 0, 5)];
  if (((band % 5) + 5) % 5 === 2) c = lerp(c, CLAY[clamp(Math.round(tone - 1), 0, 2)], 0.55);
  const cs = Math.floor(s / 5), cr = Math.floor(e / 3.4), st = hs(cs, cr, 76);
  if (st > 0.82 && fw > 6) {
    const fy = (e / 3.4) % 1, fx = (s / 5) % 1;
    if (Math.hypot(fx - 0.5, (fy - 0.5) * 1.3) < 0.42) c = fy < 0.35 ? STONE[4] : fy < 0.7 ? STONE[3] : STONE[1];
  }
  if (hf < 0.55 && hs(Math.floor(s), 4, 77) > 0.94 && hf < 0.25 + hs(Math.floor(s), 5, 78) * 0.4) c = EARTH[0];
  if (hot) c = lerp(c, HR.hot, 0.3 * HR.warm * clamp(tone - 2.6, 0, 1.2));
  return c;
}

// ---------------- the colour pass: field -> RGBA overlay ----------------
// returns { img: ImageData, live: per-pixel baked colour lookup (for the lanes' shade test) }
function paintField(F) {
  const { w, h, k, D, S, Q, NX, NY, BODY, KIND, KW, FW } = F;
  const out = new ImageData(w, h), P = out.data;
  const HR = hour(), fall = DAY.fall, slen = DAY.on ? DAY.len || 0 : 0;
  const weirs = F.bodies.map((B) => (B.plan.weir != null ? B.plan.weir : null));
  const put = (p, c, a = 1) => { const o = p * 4; P[o] = c[0]; P[o + 1] = c[1]; P[o + 2] = c[2]; P[o + 3] = Math.round(a * 255); };
  const ax0 = Math.round(F.x0 * 2), ay0 = Math.round(F.y0 * 2), sc = 2 / k;   // art px of the rect's corner; art px a buffer px
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const p = j * w + i, bi = BODY[p];
    if (bi < 0) continue;
    const nx = NX[p] / 127, ny = NY[p] / 127, kind = KIND[p], isNear = ny > 0.35, s = S[p] * 2;
    // A RIVER's bank (its face, a near bank's turf or stone edge, the lip's overhang) is drawn on the LAND
    // side of the engine's waterline (riverPast = 0), so the open water is never narrower than the river
    // the engine knows: the whole edge is shifted out by its own width `sh` (art px). A lake keeps its
    // face inside its water (its shore must stay inside the engine's pond).
    const sh = F.bodies[bi].type === "lake" ? 0 : FW[p] / 8 + (kind === KI_LIP ? 2.4 : isNear && kind === KI_CUT ? 1.6 : isNear && kind === KI_QUAY ? 2 : 0);
    const d = D[p] - sh;
    if (d > 8) continue;
    const X = k === 2 ? ax0 + i : Math.floor((F.x0 + (i + 0.5) / k) * 2), Y = k === 2 ? ay0 + j : Math.floor((F.y0 + (j + 0.5) / k) * 2);
    if (d >= 0) {
      // ---- the land side of the shore ----
      if (kind === KI_CUT && !isNear && d < 2.2) put(p, TURF[5], d < 1 ? 0.55 : 0.25);
      else if (kind === KI_CUT && isNear && d < 1.2) put(p, TURF[4], 0.4);
      else if (kind === KI_QUAY && d < (isNear ? 4 : 5) * sstep(0.1, 0.6, KW[p] / 255)) {
        const run = Math.floor((s + (isNear ? 0 : 3)) / 11), jt = ((s % 11) + 11) % 11 < 1;
        let c = STONE[4 - (hs(run, 1, 5) > 0.6 ? 1 : 0)]; if (jt) c = STONE[1]; if (d > (isNear ? 3 : 4)) c = STONE[1]; if (d < 1) c = STONE[5];
        if (hs(X, Y, 7) > 0.93) c = lerp(c, hex("#7a8a50"), 0.5);
        const tone = faceTone(-nx, -ny); if (HR.warm > 0.4 && tone > 2.6) c = lerp(c, HR.hot, 0.18 * HR.warm);
        put(p, c);
      } else if ((kind === KI_LIP || kind === KI_REEDS) && d < 3.5) put(p, kind === KI_REEDS ? hex("#3a5a2c") : TURF[1], (1 - d / 3.5) * 0.42);
      continue;
    }
    // ---- the water side ----
    const e = -d, fw = FW[p] / 8;
    if (e < fw) { put(p, facePixel(kind, e / fw, fw, e, X, Y, s, -nx, -ny, HR)); continue; }
    const ew = e - fw;
    if (isNear && (kind === KI_CUT || kind === KI_QUAY)) {
      if (kind === KI_QUAY) { if (ew < 2) { put(p, ew < 1 ? STONE[2] : STONE[0]); continue; } }
      else if (ew < 1.6) { put(p, ew < 0.8 ? TURF[3] : TURF[1]); continue; }
    }
    // depth: deepest along the channel (Q, max over bodies: no step at a mouth); a soft edge lightens at it
    const hard = kind === KI_CUT || kind === KI_QUAY;
    // the shallow stream profile (concept/overhaul3-lakes.js pass 5c): the pale shelving takes 22 art px at a
    // soft edge and the channel tops out at the body's sq (Q carries it, and the point bars)
    const Bd = F.bodies[bi], lake = Bd.type === "lake";
    const SQ = Bd.plan.sq || 0.7, qe = hard ? (lake ? 1 : 0.75) : clamp(ew / (lake ? 14 : 22), 0, 1);
    // a lake (concept/overhaul3-lakes.js): the river's bands over the distance from its shore, to its own depth
    const q = lake ? Math.min(clamp((ew + (vn(X / 30, Y / 14, 43) - 0.5) * 8) / Bd.deep, 0, 1) * Bd.qmax, 0.35 + qe * 0.65) + (vn(X / 22, Y / 12, 41) - 0.5) * 0.18 * (1 - 0.6 * sstep(12, 34, ew))
      : Math.min(Q[p], 0.2 + qe * 0.8 * SQ) + (vn(X / 22, Y / 12, 41) - 0.5) * 0.12;
    const idx = 6 - q * 6.2 + (bay(X, Y) - 0.5) * 0.3 + (vn(X / 7, Y / 3, 42) - 0.5) * 0.9;
    let c = WA[clamp(Math.round(idx), 0, 6)];
    // the bank's shade at its foot, and a low sun's long shadow off it
    const fdot = -(nx * fall[0] + ny * fall[1]);
    const Hs = lake ? Math.max(3, fw) : hard && FW[p] === 0 ? 3 : (HFACE[kind === KI_CUT ? "cut" : kind === KI_QUAY ? "quay" : ""] || 3) * (hard ? 0.15 + 0.85 * sstep(0, 1, KW[p] / 255) : 1);
    const shadeLen = (isNear ? 0 : Math.max(0, -ny) * Hs * 0.45) + Math.max(0, fdot) * Hs * (0.3 + slen * 0.55) + (isNear ? 3.2 : 0);
    let shade = 0;
    if (ew < shadeLen) shade = lake ? (ew < shadeLen - 1.5 ? 0.62 : 0.78) : (ew < shadeLen - 1.5 ? 0.7 : 0.82);
    // the edge itself
    if (kind === KI_LIP && ew < 2.2) {
      // the lip's turf hanging over the water with a thin wet shade under it, tufts breaking the line
      const tf = hs(Math.floor(X / 2), Math.floor(Y / 2), 88), ov = ew < 1 + tf * 1.4;
      c = ov ? (tf > 0.72 ? TURF[3] : tf > 0.35 ? TURF[2] : lerp(TURF[1], c, 0.35)) : lerp(mul(c, 0.8), LINE_LIP, 0.25);
    }
    else if (kind === KI_LIP && ew < 5) c = lerp(c, GRASS_W, 0.16 * (1 - ew / 5));
    else if (kind === KI_REEDS && ew < 10) c = lerp(c, SLACK, 0.28 * (1 - ew / 10));
    else if (kind === KI_CUT && !isNear && ew < 1.3) c = lerp(c, FOAM2, 0.3);
    else if (kind === KI_QUAY && !isNear && ew < 2.2) c = ew < 1.1 ? WEED : lerp(c, FOAM2, 0.35);
    // the sky lying on it (still)
    if (lake) { const cl = vn(X / 90, Y / 9, 71 + bi); if (cl > 0.64 + bay(X, Y) * 0.1 && ew > 14 && (Y % 3)) c = lerp(c, SKY, cl > 0.72 ? 0.2 : 0.11); }
    else { const cl = vn(X / 60, Y / 22, 72 + bi); if (cl > 0.66 + bay(X, Y) * 0.08 && ew > 8) c = lerp(c, SKY, 0.16); }
    // the weir: glassy pool above, the sill's stones, a white fall (live frames go over it), churn below
    const wr = weirs[bi];
    if (wr != null) {
      const dw = (S[p] - wr) * 2;
      if (dw > -60 && dw < 0) c = lerp(c, WA[2], 0.25 * (1 + dw / 60));
      if (dw >= -5 && dw < 0) { c = hs(Math.floor(X / 4), 0, 60) > 0.5 ? STONE[3] : STONE[2]; if (dw >= -1.2) c = STONE[4]; if (dw < -4) c = STONE[1]; shade = 0; }
      else if (dw >= 0 && dw < 5) { c = lerp(FOAM, FOAM2, ((Math.floor(X / 2 + hs(X, 0, 61) * 3)) % 3) / 3); shade = 0; }
      else if (dw >= 5 && dw < 46) { const fo = vn(dw / 3.2, X / 5, 63) * (1 - (dw - 5) / 41) * 1.5; if (fo > 0.82) c = FOAM; else if (fo > 0.62) c = lerp(c, FOAM2, 0.7); else if (fo > 0.5) c = lerp(c, WA[5], 0.6); }
    }
    if (HR.warm > 0) c = lerp(c, HR.tint, 0.12 * HR.warm);
    if (HR.warm > 0.4 && !shade && ew > 5) {
      // the low sun's glitter, gathered into broad bands (the live glints of daygrade lie on top)
      // gathered into broad patches on the sun's side of the board (west at golden, east at sunrise)
      const g2 = vn(X / 6, Y / 1.4, 80), band = vn(X / 90, Y / 70, 81), sx = clamp(X / (W * 2), 0, 1), wt = DAY.side < 0 ? 1 - sx : sx;
      if (band > 0.7 - wt * 0.18 && g2 > 0.86 && (Y % 2 === 0)) c = lerp(c, HR.glit, 0.55 * HR.warm);
    }
    if (shade) c = lerp(mul(c, shade), HR.shadeTint, 0.12);
    put(p, c);
  }
  return out;
}

// ---------------- the shore's static dressing: tussocks on the lip (baked into the overlay) ----------------
function tussock(set, X, Y, seed) {
  for (let q = 0; q < 9; q++) {
    const a = -Math.PI / 2 + (hs(seed, q, 1) - 0.5) * 2.2, L = 3 + hs(seed, q, 2) * 4;
    for (let r = 0; r < L; r++) { const x = X + Math.cos(a) * r * 1.2, y = Y + Math.sin(a) * r * 0.8 + (r > L * 0.6 ? (r - L * 0.6) * 0.8 : 0); set(x, y, r < 1.5 ? TURF[1] : Math.cos(a) < 0 ? TURF[4] : TURF[3]); }
  }
  set(X, Y + 1, TURF[0]); set(X - 1, Y + 1, TURF[0]); set(X + 1, Y + 1, TURF[0]);
}
function dressStatic(F, img) {
  if (F.k !== 2) return;
  const { w, h, D, KIND, NY, NX, BODY } = F, P = img.data, ax0 = Math.round(F.x0 * 2), ay0 = Math.round(F.y0 * 2);
  const set = (X, Y, c) => { const i = Math.round(X) - ax0, j = Math.round(Y) - ay0; if (i < 0 || j < 0 || i >= w || j >= h) return; const o = (j * w + i) * 4; P[o] = c[0]; P[o + 1] = c[1]; P[o + 2] = c[2]; P[o + 3] = 255; };
  const seen = new Set();
  for (let j = 3; j < h - 3; j++) for (let i = 3; i < w - 3; i++) {
    const p = j * w + i, d = D[p]; if (BODY[p] < 0 || d > 0 || d < -1 || KIND[p] !== KI_LIP) continue;
    const X = ax0 + i, Y = ay0 + j, cell = `${Math.floor(X / 7)},${Math.floor(Y / 7)}`;
    if (seen.has(cell)) continue; seen.add(cell);
    if (hs(X, Y, 90) < 0.4) tussock(set, X + NX[p] / 127, Y + NY[p] / 127 + 1, X * 13 + Y);   // on the bank, over the waterline
  }
}

// ---------------- the slots ----------------
// the rivers' box on the board (units), clipped a little past the board's edge
const boardRect = () => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const B of bodies()) { x0 = Math.min(x0, B.box[0]); y0 = Math.min(y0, B.box[1]); x1 = Math.max(x1, B.box[2]); y1 = Math.max(y1, B.box[3]); }
  return [Math.max(-2, Math.floor(x0)), Math.max(-2, Math.floor(y0)), Math.min(W + 2, Math.ceil(x1)), Math.min(H + 2, Math.ceil(y1))];
};
const toCanvas = (img) => { const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height; cv.getContext("2d").putImageData(img, 0, 0); return cv; };
export const STATS = { bakeMs: 0, fieldMs: 0, px: 0 };

function bakeWater(ctx) {
  buildLive(null); buildLife(null);
  if (!bodies().length) return;   // a dry board (or only the sea, which coast.js paints as today)
  const T0 = performance.now();
  const [x0, y0, x1, y1] = boardRect();
  let F = buildField(x0, y0, x1, y1, 2);
  STATS.fieldMs = performance.now() - T0; STATS.px = F.w * F.h;
  const img = paintField(F);
  dressStatic(F, img);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(toCanvas(img), x0, y0, F.w / 2, F.h / 2);
  ctx.imageSmoothingEnabled = sm;
  buildLive(F, img);
  buildLife(F);
  F = null;
  STATS.bakeMs = performance.now() - T0;
}

function apronRiver(ctx, rv, rect, k) {
  const ri = RIVERS.indexOf(rv), B = bodies()[ri]; if (!B) return;
  const [a, b, c, e] = rect;
  const kk = Math.max(1, Math.min(4, Math.round(k)));
  const F = buildField(a, b, c, e, kk, [B]);
  const img = paintField(F);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(toCanvas(img), a, b, F.w / kk, F.h / kk);
  ctx.imageSmoothingEnabled = sm;
}

function waterLive(ctx, g) {
  drawLive(ctx, g);
  drawLife(ctx, g);
}

export const waterMB = () => liveMB() + lifeMB();

register("bakeWater", bakeWater);
register("waterLive", waterLive);
// the hour's glints (daygrade): our rivers and lakes, and today's sea on a coast board
register("openWater", (x, y) => openWater(x, y) || (!!COAST && inSea(x, y, -2)));
register("apronRiver", apronRiver);
export { OVH, ovhOn };
// for labs
export { lifeInfo } from "./waterlife.js";
export { liveStats } from "./waterlive.js";

// the ground layer's cache key part (overhaul/wire.js): bump WATER_V when the bake must change
const WATER_V = 2;
export const waterKey = () => `w${WATER_V}`;
