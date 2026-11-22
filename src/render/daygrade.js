// ============ THE HOUR'S COLOUR (time of day, 2026-11-22; brief art/briefs/time-of-day.md) ============
// The level's fixed sun (data/sun.js DAY) told in colour, WITHOUT a flat wash (owner, on a flat orange
// board at the Blood Moon: "someone would think their phone is breaking"). What the colourist does:
//   - the LIGHT rakes in from the sun's side of the board: the land nearest that edge is warm and a
//     little richer (soft-light, so the darks stay dark and the lit tones warm), falling off across the
//     board in dithered bands, patchy (broken light, never a smooth gradient);
//   - the far side, away from the sun, drifts cool (blue-violet at sunrise, violet at golden hour),
//     so lit land and the cast shadows laid next (dayshadows.js) part MORE, not less;
//   - snow (the Rimewater) takes peach light, never orange mud: a light warm multiply, and soft-light
//     barely touches near-white;
//   - water takes the hour: a warm sheen and short static glints, stronger toward the sun;
//   - the actors (halls, figures, castle) get only ACTORS of the ground's grade (bloodmoon.js's lesson:
//     shade the ground more than the actors), so they stand out of the land;
//   - every figure catches the sun's edge light on its sunward side (dayKeyLights).
// Morning / afternoon: a hint of warmth (DAY.warm 0.15). Early / late: half. Sunrise / golden: full.
// Baked once per sun and board, as three board-sized layers (one cell per board unit = 2x2 art px,
// ordered dither), dropped on a sun change; a frame costs three drawImage calls in the ground pass and
// two in the over pass. Nothing here runs at noon or under the blood moon (daylight.js guards both).
//
// The strip beyond the board (tall screens): dayGradeRect(ctx, x0, y0, x1, y1) paints the same grade
// for any world rect (the rake runs on past the edges). Hook it where the apron is painted, BEFORE the
// apron's own grade (apron.js paintApron, before `grade(ctx, vx0, vy0, vx1, vy1)`), and put DAY.v in
// the apron's cache key so a new sun repaints it.
import { W, H } from "../data/constants.js";
import { DAY, onDay } from "../data/sun.js";
import { RIVERS, PONDS, COAST, inRiver, inSea, underBridge } from "../data/terrain.js";
import { REALM } from "../data/maps.js";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// The hour's palettes. soft: the light's hue laid by soft-light (warms and enriches mid tones);
// warm: a pale multiply on the lit side (what turns snow peach); cool: a multiply on the far side;
// glow: added at the sun's own edge; glint: added on water.
const PAL = {
  // golden hour: amber light, violet shade, the land richer and warmer
  amber: { soft: [255, 150, 46], warm: [255, 220, 172], cool: [192, 178, 240], glow: [255, 138, 40], glint: [255, 190, 90], ks: 1, kw: 1, kc: 1 },
  // sunrise: pink-gold light, blue-violet shade, a fresher, cooler land (less soft-light: greens stay green)
  rose:  { soft: [255, 168, 190], warm: [255, 220, 206], cool: [172, 190, 246], glow: [255, 150, 130], glint: [255, 214, 196], ks: 0.6, kw: 0.85, kc: 1.25 },
  day:   { soft: [255, 214, 150], warm: [255, 242, 220], cool: [180, 182, 226], glow: [255, 214, 150], glint: [255, 240, 200], ks: 1, kw: 1, kc: 1 },
};
// strengths at DAY.warm 1 (they scale with it)
export const GRADE = {
  soft: 0.52,      // soft-light alpha at the sun's edge
  warm: 0.28,      // the lit side's warm multiply
  cool: 0.62,      // the far side's cool multiply (a pale cool: more hue than darkening)
  glow: 0.1,       // added light right at the sun's edge
  sheen: 0.1, glint: 0.5,    // water
  snowWarm: 2.1,   // snow boards: more of the warm multiply (soft-light barely moves near-white)
  ACTORS: 0.4,     // how much of the ground's soft and multiply goes over what stands
  off: false,      // labs: skip every layer (to time it)
  bakeMs: 0,       // the last board bake's time
};

// the rake: 1 at the sun's edge of the board, 0 at the far edge (runs on past both), a little from
// the top too (the sun stands a touch north of due east / west)
const rakeAt = (x, y) => {
  const u = DAY.side < 0 ? x / W : (W - x) / W;
  return 1 - (u * 0.86 + (y / H) * 0.14);
};
// broken light: soft value noise, a few cells across the board
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x, y, s) => {
  const fx = x / s, fy = y / s, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
};
const snowy = () => REALM && (REALM.groundArt === "rime" || REALM.ambient === "snow");
const wetAt = (x, y) => {
  for (const p of PONDS) if (p.t !== "lava" && ((x - p.x) / (p.w / 2)) ** 2 + ((y - p.y) / (p.h / 2)) ** 2 <= 1) return true;
  if (COAST && inSea(x, y, -2)) return true;
  return RIVERS.length > 0 && inRiver(x, y, -1);
};

// Bake the three layers for a world rect, `cell` world units a cell.
const bakeRect = (x0, y0, w, h, cell) => {
  const cw = Math.ceil(w / cell), ch = Math.ceil(h / cell);
  const mk = () => { const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch; const c = cv.getContext("2d"); return { cv, c, img: c.createImageData(cw, ch) }; };
  const soft = mk(), mul = mk(), add = mk();
  const P = PAL[DAY.tone] || PAL.day, k = DAY.warm, snow = snowy();
  const warmA = GRADE.warm * P.kw * (snow ? GRADE.snowWarm : 1), softA = GRADE.soft * P.ks, coolA = GRADE.cool * P.kc;
  const water = RIVERS.length || PONDS.length || COAST;
  let anyAdd = false;
  // the water, asked once per 2x2 cells (the river test is the bake's main cost)
  let WET = null, ww = 0;
  if (water) {
    ww = Math.ceil(cw / 2); const wh = Math.ceil(ch / 2); WET = new Uint8Array(ww * wh);
    for (let j = 0; j < wh; j++) for (let i = 0; i < ww; i++) {
      const x = x0 + (i * 2 + 1) * cell, y = y0 + (j * 2 + 1) * cell;
      WET[j * ww + i] = wetAt(x, y) && !underBridge(x, y, 0) ? 1 : 0;   // a bridge deck is land
    }
  }
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const x = x0 + (i + 0.5) * cell, y = y0 + (j + 0.5) * cell, o = (j * cw + i) * 4;
    const b = BAYER[(j & 3) * 4 + (i & 3)] - 0.5;
    const n = vnoise(x, y, 120) * 0.65 + vnoise(x + 300, y - 170, 46) * 0.35;   // 0..1
    const r = rakeAt(x, y);
    // the light: strongest at the sun's edge, broken by the noise, in ten dithered steps (fewer showed the dither as dots on the road)
    const lit = clamp01(0.04 + 0.96 * Math.pow(clamp01(r), 1.6) + (n - 0.5) * 0.42);
    const ls = Math.round(clamp01(lit + b * 0.1) * 10) / 10;
    // the far side's cool, in seven steps
    const cool = clamp01(sm(0.15, 0.95, 1 - r) * 0.9 + (0.5 - n) * 0.3);
    // water keeps its blue: no soft-light or warm multiply on it (they greyed the river), only the
    // far side's cool and the added sheen and glints below
    const wet = WET !== null && WET[(j >> 1) * ww + (i >> 1)] === 1;
    const cs = Math.round(clamp01(cool + b * 0.14) * 7) / 7;
    if (ls > 0 && !wet) {
      soft.img.data[o] = P.soft[0]; soft.img.data[o + 1] = P.soft[1]; soft.img.data[o + 2] = P.soft[2];
      soft.img.data[o + 3] = Math.round(255 * clamp01(softA * k * ls));
    }
    // one multiply layer: warm where lit, cool where not (the colours mix in between)
    const wa = wet ? 0 : warmA * k * ls, ca = coolA * k * cs * (wet ? 0.6 : 1), ta = wa + ca;
    if (ta > 0.004) {
      const fw = wa / ta;
      mul.img.data[o] = Math.round(P.warm[0] * fw + P.cool[0] * (1 - fw));
      mul.img.data[o + 1] = Math.round(P.warm[1] * fw + P.cool[1] * (1 - fw));
      mul.img.data[o + 2] = Math.round(P.warm[2] * fw + P.cool[2] * (1 - fw));
      mul.img.data[o + 3] = Math.round(255 * clamp01(ta));
    }
    // added light: a thin glow at the sun's edge, and the water's sheen and glints
    let aa = 0, col = P.glow;
    const gs = Math.round(clamp01(sm(0.8, 1.02, r) + b * 0.3) * 3) / 3;
    if (gs > 0) aa = GRADE.glow * k * gs;
    if (wet) {
      col = P.glint;
      const gr = Math.pow(clamp01(r), 1.6);
      aa = GRADE.sheen * k * (0.2 + 0.8 * gr);
      // short horizontal glints, thicker toward the sun, static (the river's own marks move)
      const row = Math.floor(y / 2), dash = Math.floor((x + row * 7) / 5);
      if (hash(dash, row) < 0.015 + 0.26 * gr * gr * (0.6 + n * 0.8)) aa = GRADE.glint * k * (0.45 + 0.55 * gr);
    }
    if (aa > 0.004) {
      anyAdd = true;
      add.img.data[o] = col[0]; add.img.data[o + 1] = col[1]; add.img.data[o + 2] = col[2];
      add.img.data[o + 3] = Math.round(255 * clamp01(aa));
    }
  }
  soft.c.putImageData(soft.img, 0, 0); mul.c.putImageData(mul.img, 0, 0);
  if (anyAdd) add.c.putImageData(add.img, 0, 0);
  return { soft: soft.cv, mul: mul.cv, add: anyAdd ? add.cv : null, x0, y0, w: cw * cell, h: ch * cell };
};

// the board's layers: one sun, one board (rebuilt if the board's water or the realm changes)
let BOARD = null, BOARD_OF = null;
const boardLayers = () => {
  const of = `${DAY.v}|${REALM && REALM.id}`;
  if (!BOARD || BOARD_OF !== of || BOARD.rivers !== RIVERS || BOARD.ponds !== PONDS || BOARD.coast !== COAST) {
    const t0 = performance.now();
    BOARD = bakeRect(0, 0, W, H, 1);
    GRADE.bakeMs = performance.now() - t0;
    BOARD.rivers = RIVERS; BOARD.ponds = PONDS; BOARD.coast = COAST; BOARD_OF = of;
  }
  return BOARD;
};
let RECT = null;
onDay(() => { BOARD = null; BOARD_OF = null; RECT = null; });

const lay = (ctx, L, soft, mul, add) => {
  const op = ctx.globalCompositeOperation, pa = ctx.globalAlpha, sm0 = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  if (soft > 0) { ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = pa * soft; ctx.drawImage(L.soft, L.x0, L.y0, L.w, L.h); }
  if (mul > 0) { ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = pa * mul; ctx.drawImage(L.mul, L.x0, L.y0, L.w, L.h); }
  if (add > 0 && L.add) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = pa * add; ctx.drawImage(L.add, L.x0, L.y0, L.w, L.h); }
  ctx.globalCompositeOperation = op; ctx.globalAlpha = pa; ctx.imageSmoothingEnabled = sm0;
};

// the ground pass (daylight.js dayGround): before the cast shadows and anything standing
export const dayGradeGround = (ctx, g) => { if (DAY.warm > 0 && !GRADE.off) lay(ctx, boardLayers(), 1, 1, 1); };
// over everything standing, before the weather: a part of the same light, so the actors sit in it
export const dayGradeOver = (ctx, g) => { if (DAY.warm > 0 && !GRADE.off) lay(ctx, boardLayers(), GRADE.ACTORS, GRADE.ACTORS, 0); };

// The same grade for any world rect (the apron beyond the board; the caller's transform is world
// units). Kept for one rect at a time, at 2 world units a cell (the apron is repainted rarely).
export const dayGradeRect = (ctx, x0, y0, x1, y1) => {
  if (!DAY.on || !(DAY.warm > 0)) return;
  const fx0 = Math.floor(x0 / 2) * 2, fy0 = Math.floor(y0 / 2) * 2, key = `${DAY.v}|${REALM && REALM.id}|${fx0}|${fy0}|${x1}|${y1}`;
  if (!RECT || RECT.key !== key) { RECT = bakeRect(fx0, fy0, x1 - fx0, y1 - fy0, 2); RECT.key = key; }
  lay(ctx, RECT, 1, 1, 1);
};

// ---- the sun's edge light on every figure (pixrigs LIGHTS: rigs.js / crews.js stamp the rim) ----
// One key light far off on the sun's side, so it reaches every figure at the same strength (lightAt
// takes the light's x for the lit side). k past 1 stamps the outer line alone again, hot (sunset.js
// SUN_RIM): only the low suns get there. rim 0.2 (morning) -> 0.2; 0.55 (early) -> 0.8; 1 -> 1.7.
// Like the moon's key it only shows with "Spell light" on: rigs.js and crews.js read prefs.spellLight
// before they stamp any light, so this needs no check of its own.
const FAR = 6000;
export const dayKeyLights = (g, add) => {
  const r = DAY.rim || 0;
  if (r <= 0 || GRADE.off) return;
  add(DAY.side > 0 ? W + FAR : -FAR, H * 0.5 - FAR * (0.15 + 0.6 * DAY.elev), FAR * 8, DAY.col, r + 0.7 * r * r);
};
