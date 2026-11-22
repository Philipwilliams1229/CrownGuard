// ============ THE BLOOD MOON: its look (2026-11-21) ============
// Engine: engine/weather.js `bloodmoon` (w.k 0 -> 1 as the red light creeps in over ~20 s, holds,
// fades). There is NO moon in the picture: the light comes from the upper left, just off the
// board, a raking red key light, and the board falls darker toward the lower right.
//
//   bloodmoonPaint(ctx, g, w)    the painter (weatherfx.js PAINTERS.bloodmoon), over everything:
//                                the shade, the red rake, the lamps' bloom, then the undead's eyes
//   bloodmoonGround(ctx, g, w)   under the actors (weatherfx.js GROUND): the lamps' pools on the ground
//   moonKeyLight(g)              draw.js: one far light at the upper left, so every figure catches
//                                a red rim on its upper-left edge (pixrigs LIGHTS / rimOf)
//   noteEyes(...)                enemies.js: an undead foe asks for its eyes to glow this frame
//
// Torchlight is nightlight.js (reusable: night maps will call the same functions); the hall
// seam (pix/halls.js) notes each hall's torch there. The shade and the rake are baked once as
// ordered-dither art-pixel layers (no per-frame getImageData, no gradients), so the cost is a
// few full-board blits.
import { W, H } from "../data/constants.js";
import { ENEMIES } from "../data/enemies.js";
import { pixRec, hasPix, isViewSheet } from "./pix/pixrigs.js";
import { nightTick, nightOn, drawLampPools, drawLampBloom, swapLamps } from "./nightlight.js";
import { sunCurves, drawLongShadows, SUN_KEY, SUN_RIM } from "./sunset.js";

const PX = 2;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---- the red key light's reach over the board (0 at the corner it comes from, 1 far side) ----
// A raking light: it travels along the diagonal, a little more across than down the board.
const reach = (x, y) => clamp01((x * 0.62 + y * 0.74) / (W * 0.62 + H * 0.74));

let LAYERS = null;
const bakeLayers = () => {
  const w = W, h = H;                              // one cell per board unit (2 screen pixels at RES 2)
  const mk = () => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const c = cv.getContext("2d"); return { cv, c, img: c.createImageData(w, h) }; };
  const shade = mk(), rake = mk(), warm = mk();
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = i + 0.5, y = j + 0.5, r = reach(x, y), o = (j * w + i) * 4, b = BAYER[(j & 3) * 4 + (i & 3)] - 0.5;
    // the shade, MULTIPLIED over the board (lead, 2026-11-21: laid on plain it greyed the board to
    // mauve): night that darkens and reddens, lighter at the lit corner, six dithered steps
    const dark = 0.45 + 0.5 * Math.pow(r, 1.1);
    const ls = Math.round(clamp01(dark + b * 0.12) * 6);
    if (ls > 0) { const a = [0, 0.3, 0.42, 0.54, 0.66, 0.78, 0.9][ls]; shade.img.data[o] = 74; shade.img.data[o + 1] = 22; shade.img.data[o + 2] = 44; shade.img.data[o + 3] = Math.round(a * 255); }
    // the rake: red light laid on by 'lighter', brightest at the upper-left corner, an elliptical reach
    // that stretches along the diagonal, in steps
    const d = Math.hypot((x + 40) / (W * 0.95), (y + 40) / (H * 1.1));
    const v = Math.pow(clamp01(1 - d), 1.3);
    const lr = Math.round(clamp01(v + b * 0.18) * 5);
    if (lr > 0) { const a = [0, 0.05, 0.1, 0.16, 0.22, 0.3][lr]; rake.img.data[o] = 255; rake.img.data[o + 1] = 24 + lr * 3; rake.img.data[o + 2] = 30; rake.img.data[o + 3] = Math.round(a * 255); }
    // the low sun's warm rake (the sunset, before the moon): the same reach, amber
    if (lr > 0) { const a = [0, 0.05, 0.1, 0.16, 0.22, 0.3][lr]; warm.img.data[o] = 255; warm.img.data[o + 1] = 120 + lr * 10; warm.img.data[o + 2] = 36; warm.img.data[o + 3] = Math.round(a * 255); }
  }
  shade.c.putImageData(shade.img, 0, 0); rake.c.putImageData(rake.img, 0, 0); warm.c.putImageData(warm.img, 0, 0);
  return { shade: shade.cv, rake: rake.cv, warm: warm.cv };
};

// ---- the eyes: found in the baked frame, glowed where the figure has them ----
// The figures draw eyes as a few bright flat pixels in the head (red, orange, yellow or witch-fire
// green; boneify in rigs.js finds them the same way). We read them from the frame's own pixels, once
// per frame canvas (cached), so a glow always sits in its figure's sockets, in every frame and facing.
// Nothing is drawn for the BACK view (the head faces away) and a frame with no eye pixels glows nothing.
const EYES = new WeakMap();
let bakedAt = -1, bakedN = 0;
const isEyeStrict = (r, g, b) => (r > 165 && r > g + 60 && r > b + 60) || (g > 190 && b > 140 && r < 140 && g < 236 && g > r + 50);   // red, or witch-fire green
const isEyeLoose = (r, g, b) => (r > 200 && g > 150 && b < 90) || (g > 200 && b < 110 && r > 140 && g > r + 12);          // orange, yellow, yellow-green (gold trim matches too, so a last resort)
export const eyeSprite = (rec) => {
  const cv = rec.cv;
  if (EYES.has(cv)) return EYES.get(cv);
  const w = cv.width, h = cv.height, d = cv.getContext("2d").getImageData(0, 0, w, h).data;
  let y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const lim = y0 + (y1 - y0 + 1) * 0.45;
  const scan = (test) => { const out = []; for (let y = y0; y < lim; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (d[i + 3] > 200 && test(d[i], d[i + 1], d[i + 2])) out.push([x, y]); } return out; };
  let pts = scan(isEyeStrict);
  if (!pts.length || pts.length > 30) pts = scan(isEyeLoose);
  let s = null;
  if (pts.length && pts.length <= 30) {
    let bx0 = w, bx1 = 0, by0 = h, by1 = 0;
    for (const [x, y] of pts) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    const P = 3, sw = bx1 - bx0 + 1 + P * 2, sh = by1 - by0 + 1 + P * 2, sc = document.createElement("canvas");
    sc.width = sw; sc.height = sh;
    const c = sc.getContext("2d"), has = new Set(pts.map(([x, y]) => (y - by0 + P) * sw + (x - bx0 + P)));
    // a red haze round each eye: one pixel solid-ish, a second ring dithered thin
    for (const [x, y] of pts) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const q = (y - by0 + P + dy) * sw + (x - bx0 + P + dx); if (has.has(q)) continue;
      const ring = Math.max(Math.abs(dx), Math.abs(dy));
      if (ring === 1) { c.fillStyle = "rgba(220,24,24,0.42)"; c.fillRect(x - bx0 + P + dx, y - by0 + P + dy, 1, 1); }
      else if (((x + y + dx + dy) & 1) === 0) { c.fillStyle = "rgba(170,10,22,0.22)"; c.fillRect(x - bx0 + P + dx, y - by0 + P + dy, 1, 1); }
    }
    for (const [x, y] of pts) { c.fillStyle = "#ff3a2a"; c.fillRect(x - bx0 + P, y - by0 + P, 1, 1); }
    // the brightest pixel of a bigger eye is hot
    if (pts.length >= 4) for (const [x, y] of pts) if (((x - bx0) + (y - by0)) % 3 === 0) { c.fillStyle = "#ff9a78"; c.fillRect(x - bx0 + P, y - by0 + P, 1, 1); }
    s = { cv: sc, x0: bx0 - P, y0: by0 - P };
  }
  EYES.set(cv, s);
  return s;
};

let EYELIST = [];
const UNDEAD = new Map();
const undead = (e) => {
  if (e.revived || e.haunts) return true;
  let u = UNDEAD.get(e.type);
  if (u === undefined) { u = ENEMIES[e.type]?.faction === "hollow"; UNDEAD.set(e.type, u); }
  return u;
};
// enemies.js, after the figure is drawn: the undead foe's eyes this frame (drawn later, over the shade)
export const noteEyes = (e, skin, x, y, face, sheet, frame, aim, time) => {
  if (!nightOn(time) || sheet === "walkBack" || !hasPix(skin) || !undead(e) || EYELIST.length > 400) return;
  const left = face < 0 && !isViewSheet(sheet), rec = pixRec(skin, sheet, frame, left, aim);
  if (!EYES.has(rec.cv)) { if (time !== bakedAt) { bakedAt = time; bakedN = 0; } if (bakedN++ >= 4) return; }
  const s = eyeSprite(rec);
  if (s) EYELIST.push({ s, rec, x, y, left, ph: e.id || 0 });
};
const drawEyes = (ctx, time, a) => {
  const pa = ctx.globalAlpha;
  for (const q of EYELIST) {
    const fl = [1, 0.92, 1, 0.84, 0.96, 1, 0.88, 0.96][Math.floor(time * 7 + q.ph) & 7];
    ctx.globalAlpha = a * fl;
    ctx.save(); ctx.translate(q.x, q.y); if (q.left) ctx.scale(-1, 1);
    ctx.drawImage(q.s.cv, (q.s.x0 - q.rec.ox) / PX, (q.s.y0 - q.rec.oy) / PX, q.s.cv.width / PX, q.s.cv.height / PX);
    ctx.restore();
  }
  ctx.globalAlpha = pa;
  EYELIST = [];
};

// ---- draw.js: the key lights for the figures' rims ----
// The moon's clock w.k is also the SUN's (render/sunset.js sunCurves): amber first, red after.
const curvesOf = (g) => { const w = g.weather; return w && w.paint === "bloodmoon" && w.k > 0.02 ? sunCurves(clamp01(w.k)) : null; };
export const moonKeyLight = (g) => curvesOf(g)?.red || 0;
export const moonLights = (g, add) => {
  const c = curvesOf(g);
  if (!c) return;
  if (c.amber > 0.02) add(SUN_KEY.x, SUN_KEY.y, SUN_KEY.r, SUN_KEY.col, SUN_RIM * c.amber);
  if (c.red > 0.02) add(MOON_KEY.x, MOON_KEY.y, MOON_KEY.r, MOON_KEY.col, 0.3 * c.red);
};
export const MOON_KEY = { x: -150, y: -130, r: 1500, col: "#ff4a38" };

// ---- the painter ----
// The night is laid in two layers (lead, 2026-11-22; owner: "a little bit too hard to see ... increase
// contrast on the towers"): the full shade goes on the GROUND (bloodmoonGround, before the halls and
// figures are drawn), and only SHADE_ACTORS of it over them, so towers, soldiers and foes stand out
// lighter against the dark land. The fade follows k continuously (it was stepped in eighths, owner:
// "the fading in and out was kind of choppy").
const SHADE_GROUND = 0.85, SHADE_ACTORS = 0.5, WARM = 0.8;   // actors 0.4 -> 0.5 (owner, 2026-11-22: "a liiiitttle bit more dark to the towers")
const shade = (ctx, a) => {
  if (!LAYERS) LAYERS = bakeLayers();
  const prevOp = ctx.globalCompositeOperation, pa = ctx.globalAlpha;
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(LAYERS.shade, -8, -8, W + 16, H + 16);
  ctx.globalCompositeOperation = prevOp;
  ctx.globalAlpha = pa;
};
// The sun sets first (render/sunset.js, owner's pick 2026-11-22: long shadows, an amber rim, no
// colour wash), then the night's shade, the lamps and the moon's red come in behind it. A small slow
// swell keeps the light alive between waves too (g.time).
export const bloodmoonPaint = (ctx, g, w) => {
  const c = sunCurves(clamp01(w.k)), t = g.time;
  nightTick(t);
  if (!LAYERS) LAYERS = bakeLayers();
  const prevOp = ctx.globalCompositeOperation, pa = ctx.globalAlpha;
  const swell = 0.96 + 0.04 * Math.sin(t * 0.7);
  // a lighter shade over the actors, then the low sun's amber and the moon's red from the upper left
  shade(ctx, c.shade * SHADE_ACTORS);
  ctx.globalCompositeOperation = "lighter";
  if (c.amber > 0.01) { ctx.globalAlpha = WARM * c.amber; ctx.drawImage(LAYERS.warm, -8, -8, W + 16, H + 16); }
  if (c.red > 0.01) { ctx.globalAlpha = c.red * swell; ctx.drawImage(LAYERS.rake, -8, -8, W + 16, H + 16); }
  ctx.globalCompositeOperation = prevOp;
  // each hall's torches as light
  ctx.globalAlpha = c.lamps;
  drawLampBloom(ctx, t);
  swapLamps();
  // the undead's eyes, over the shade: they are the brightest thing on the board
  drawEyes(ctx, t, Math.min(1, c.red * 1.4));
  ctx.globalAlpha = pa;
};
export const bloodmoonGround = (ctx, g, w) => {
  const k = clamp01(w.k);
  if (k < 0.01) return;
  const c = sunCurves(k);
  nightTick(g.time);
  // the land's full night, under everything standing on it
  shade(ctx, c.shade * SHADE_GROUND);
  // the long shadows of the setting sun (and, shorter, of the moon), laid on the land
  drawLongShadows(ctx, g, c.len, c.shadow);
  const pa = ctx.globalAlpha;
  ctx.globalAlpha = c.lamps;
  drawLampPools(ctx, g.time);
  ctx.globalAlpha = pa;
};
