// ============ THE SUN GOING DOWN (2026-11-22; owner's pick: concept C) ============
// Reusable: any painter with a 0..1 "sun clock" can call it (the Blood Moon now; sunsets and night
// maps elsewhere later, CLAUDE.md wishlist). Nothing here tints the whole board: the sunset is told
// by the WORLD (owner, on a flat orange wash: "someone would think their phone is breaking"):
//   - long shadows: every hall, soldier and ground foe throws a shadow down-right that stretches to
//     ~2.5x as the sun sinks, then draws back in a little and darkens under the moon (owner: "the
//     long shadows should also come back in a bit once the moon goes up")
//   - an amber rim on the figures' sunward edge, strong on the outer line, fading as the moon rises
//     (owner: "a bit more amber, maybe a stronger line on the very outer edge, then have that fade
//     too once the moon rises")
//   - the night (the caller's shade), the lamps and the moon's red come in after.
// Concept and clip: sunset-concepts.html (option C), sunset-anim.html.
import { W } from "../data/constants.js";

const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// What each part of the scene does at sun clock u (0 day .. 1 full night).
export const sunCurves = (u) => ({
  amber: sm(0, 0.12, u) * (1 - sm(0.5, 0.85, u)),       // the warm rim and rake: up at once, gone as the red takes over
  red: sm(0.45, 1, u),                                   // the moon's red rake, rim and the undead's eyes
  shade: sm(0.3, 0.95, u),                               // the night's shade (ground and actors)
  lamps: sm(0.3, 0.75, u),                               // torches come up as it gets dark
  len: 1 + 1.5 * sm(0, 0.35, u) - 0.9 * sm(0.45, 0.9, u),// shadow length: 2.5x at sunset, 1.6x under the moon
  shadow: sm(0, 0.15, u) * (0.6 + 0.4 * sm(0.45, 0.9, u)), // shadow strength: darker under the moon (it reads on the dark land)
});

// the sun's key light for the figures' rims (pixrigs LIGHTS): far off to the upper left, low
export const SUN_KEY = { x: -170, y: -20, r: 1500, col: "#ff9a2e" };   // deep amber: the burning line must show on pale bone
export const SUN_RIM = 1.8;      // k > 1: past 1 the OUTER LINE alone is stamped again, hot (rigs.js / crews.js; pix.js lightLayer `line`)

// ---- the long shadows: baked per length and width, art-pixel stepped, dithered at the tip ----
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const SHS = new Map();
const DIR = [0.93, 0.37], PERP = [-0.37, 0.93];          // down-right, away from a sun low at the left
export const SUN_DIR = DIR;
const shadowSprite = (L, wd) => {
  const key = L + "|" + wd;
  let s = SHS.get(key);
  if (s) return s;
  const LA = L * 2, WA = wd * 2, ox = Math.ceil(WA) + 2, oy = Math.ceil(WA) + 2;
  const w = Math.ceil(LA * DIR[0] + ox + WA + 4), h = Math.ceil(LA * DIR[1] + oy + WA + 4);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d"), img = c.createImageData(w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const rx = i + 0.5 - ox, ry = j + 0.5 - oy, al = rx * DIR[0] + ry * DIR[1], ac = rx * PERP[0] + ry * PERP[1];
    if (al < -WA * 0.6 || al > LA) continue;
    const t = Math.max(0, al / LA), half = WA * (1 - 0.82 * t) * (al < 0 ? Math.sqrt(1 + al / (WA * 0.6)) : 1);
    if (Math.abs(ac) > half) continue;
    if (t > 0.62 && BAYER[(j & 3) * 4 + (i & 3)] < (t - 0.62) * 2.2) continue;
    const o = (j * w + i) * 4;
    d[o] = 22; d[o + 1] = 10; d[o + 2] = 26; d[o + 3] = Math.abs(ac) > half - 1.2 ? 120 : 160;
  }
  c.putImageData(img, 0, 0);
  s = { cv, w, h, ox, oy };
  SHS.set(key, s);
  if (SHS.size > 120) SHS.delete(SHS.keys().next().value);
  return s;
};

// Lay them under everything standing (call it in a ground pass). len: x the base length; a: strength.
export const drawLongShadows = (ctx, g, len, a) => {
  if (a < 0.01) return;
  const pa = ctx.globalAlpha, op = ctx.globalCompositeOperation;
  ctx.globalAlpha = a; ctx.globalCompositeOperation = "source-over";
  const one = (x, y, L0, wd) => {
    if (x < -40 || x > W + 40) return;
    const sp = shadowSprite(Math.max(3, Math.round(L0 * len)), Math.max(1, Math.round(wd)));
    ctx.drawImage(sp.cv, Math.round(x * 2) / 2 - sp.ox / 2, Math.round(y * 2) / 2 - sp.oy / 2, sp.w / 2, sp.h / 2);
  };
  for (const b of g.bands || []) for (const u of b.units || []) if (u.x != null && !u.dead && !u.gone) one(u.x + 1, u.y + 9, 8, 2.6);
  for (const e of g.enemies) if (!e.dead && !e.flying && !e.submerged && e.x != null) one(e.x + 1.5, e.y + e.size * 0.55, e.size * 0.9, Math.max(1.8, e.size * 0.2));
  ctx.globalAlpha = pa; ctx.globalCompositeOperation = op;
};

// ---- the halls (owner, 2026-11-22: "make it so that whole side of the tower gets the outline";
// the shadows "start from the outline of the base") ----
// pix/halls.js notes each hall it draws while the sun is down (noteHall); the ground pass then lays
// each hall's OWN silhouette as its shadow, sheared along the ground from its base line (the anchor
// row: rows below it are the base's near face and cast nothing), and the hall stamps a burning amber
// line on its sunward edge (hallRim). Both baked once per hall form and facing.
export const SUN = { t: -1, amber: 0, len: 1, shadow: 0, list: [] };
// bloodmoonGround (or any sunset painter) arms it for this frame
export const sunFrame = (time, c) => { SUN.t = time; SUN.amber = c.amber; SUN.len = c.len; SUN.shadow = c.shadow; };
export const sunOn = (time) => SUN.t === time;
export const noteHall = (H, x, y, dir, time) => { if (SUN.t === time && SUN.list.length < 80) SUN.list.push({ H, x, y, dir }); };

const HSIL = new WeakMap();
const opaqueOf = (cv) => { const c = cv.getContext("2d"), d = c.getImageData(0, 0, cv.width, cv.height).data, n = cv.width * cv.height, o = new Uint8Array(n); for (let k = 0; k < n; k++) o[k] = d[k * 4 + 3] > 40 ? 1 : 0; return o; };
const bakeHallSun = (H, dir) => {
  let per = HSIL.get(H);
  if (!per) HSIL.set(H, (per = {}));
  const pk = dir + "|" + SHADOW_TUNE.v;
  if (per[pk]) return per[pk];
  const w = H.back.width, h = H.back.height, B = H.box;
  const ob = opaqueOf(H.back), of = H.front ? opaqueOf(H.front) : new Uint8Array(w * h);
  const op = (i, j) => i >= 0 && j >= 0 && i < w && j < h && (ob[j * w + i] || of[j * w + i]);
  const sx = dir < 0 ? 1 : -1;                       // the step TOWARD the sun in the canvas (a mirrored hall is baked flipped)
  const mk = () => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const c = cv.getContext("2d"); return { cv, c, img: c.createImageData(w, h) }; };
  const back = mk(), front = mk(), sil = mk();
  const put = (L, k, rgb, a) => { const d = L.img.data; if (d[k * 4 + 3] >= a) return; d[k * 4] = rgb[0]; d[k * 4 + 1] = rgb[1]; d[k * 4 + 2] = rgb[2]; d[k * 4 + 3] = a; };
  const LINE = [255, 168, 70], SOFT = [255, 140, 46];
  let top = h;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (op(i, j)) { top = Math.min(top, j); break; }
  // the shadow's root, measured on the base AS DRAWN (Fable, 2026-11-22: the footing in hallfoot.js is the
  // building's footprint with its props, so a root laid from it jutted out under the base's front-left;
  // owner: "that jut is definitely still there"): the front lip below the anchor, and the base's widest
  // row (symmetric about the anchor, so side props don't count) in the 20 rows above it.
  const ox = Math.round(B.ox), oy = Math.round(B.oy);
  let lip = h - 1;
  while (lip > oy && ![-2, -1, 0, 1].some((d) => op(ox + d, lip))) lip--;
  const hw = (j) => { let a = 0; while (op(ox + a, j) && op(ox - 1 - a, j)) a++; return a; };
  let base = lip, best = 0;
  for (let j = lip; j > lip - 20 && j >= 0; j--) best = Math.max(best, hw(j));
  // the LOWEST row near full width (a square plinth's bottom, a round base a little below its middle)
  for (let j = lip; j > lip - 20 && j >= 0; j--) if (hw(j) >= 0.9 * best) { base = j; break; }
  const rx = Math.max(2, best / 2), ry = (lip - base) / 2, cyb = (base - oy) / 2;
  // the shadow's foot (owner, after two tries: no shadow may show under the base's front): a chord from the
  // base's RIGHT side (A, a touch below its middle row) up-left behind the body (B), so the shadow's near
  // edge leaves the base on its far side from the sun and the rest of the foot is hidden by the hall.
  // The chord shortens until B lies on the hall's own picture (behind it); above the foot the shadow
  // flares to the base's width across the light (S) over 16 units of height.
  const T = SHADOW_TUNE, CH = T.ch ? (() => { const l = Math.hypot(T.ch[0], T.ch[1]); return [T.ch[0] / l, T.ch[1] / l]; })() : CH0;
  let A = [0.92 * rx, cyb + 0.4 * ry];   // low on the right side: a square base's front face is tall
  if (T.mode === "lip") {               // on the base's drawn outline, ax of the way from the middle to its right edge
    const ci = Math.round(ox + T.ax * rx * 2);
    let lj = h - 1; while (lj > 0 && !op(ci, lj)) lj--;
    A = [T.ax * rx, (lj + 0.5 - oy) / 2];
  }
  // no higher than a little above the back of the base, or a low wide hall's shadow starts at its roof
  let Lc = Math.min(1.8 * rx, (A[1] - (cyb - ry - 0.6 * rx)) / -CH[1]), Bp;
  for (;;) {
    Bp = [A[0] + Lc * CH[0], A[1] + Lc * CH[1]];
    if ((op(Math.round(ox + Bp[0] * 2), Math.round(oy + Bp[1] * 2)) && op(Math.round(ox + Bp[0] * 2), Math.round(oy + Bp[1] * 2) - 4)) || Lc < 0.6 * rx) break;
    Lc -= 0.1 * rx;
  }
  const across = Lc * Math.abs(CH[0] * DIR[1] - CH[1] * DIR[0]), S = Math.max(1, ((T.widen ?? 1.8) * rx) / Math.max(1, across));
  // the sprite's x lies along the chord (x = +rx at A), S times as long, its rows narrowed by 1/S at the foot
  const M = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2], col = [-(S * Lc / (2 * rx)) * CH[0], -(S * Lc / (2 * rx)) * CH[1]];
  const k0 = 1 / S;
  const tall = Math.max(1, base - top);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!op(i, j)) continue;
    const k = j * w + i, L = of[k] ? front : back;
    if (!op(i + sx, j)) put(L, k, LINE, 255);                          // the sunward edge: the burning line, two pixels thick
    else if (!op(i + 2 * sx, j)) put(L, k, LINE, 215);
    else if (!op(i + 3 * sx, j)) put(L, k, SOFT, 90);                 // a third, softer
    if (!op(i, j - 1) && (op(i - sx, j) || !op(i + sx, j))) put(L, k, SOFT, 120);   // tops facing up catch the low sun too
  }
  // the sunward quarter of each run of stone in a row takes a stepped amber wash (so the wall matches
  // the crew at board size, not only its edge line)
  for (let j = 0; j < h; j++) {
    let i = dir < 0 ? w - 1 : 0;
    const step = dir < 0 ? -1 : 1;
    while (i >= 0 && i < w) {
      if (!op(i, j)) { i += step; continue; }
      let e = i; while (e + step >= 0 && e + step < w && op(e + step, j)) e += step;
      const run = Math.abs(e - i) + 1, band = Math.max(0, Math.round(run * 0.25) - 3);
      for (let q = 0; q < band; q++) {
        const x = i + step * (3 + q), k = j * w + x, L = of[k] ? front : back;
        put(L, k, SOFT, [70, 45, 25][Math.min(2, Math.floor((q * 3) / band))]);
      }
      i = e + step;
    }
  }
  // the shadow: the silhouette above the base row, its rows narrowed to k0 of their width at the foot and
  // flaring to full width over the first 16 units up (so it leaves the base inside its outline), stepped
  // by height (a dither stretched into stripes under the shear)
  { const d = sil.img.data;
    for (let j = 0; j <= base; j++) {
      const hh = (base - j) / 2, f = k0 + (1 - k0) * Math.min(1, hh / (T.flare ?? 16)), t = (base - j) / tall;
      const a = t < 0.55 ? 160 : t < 0.75 ? 115 : t < 0.9 ? 75 : 40;
      for (let i = 0; i < w; i++) {
        const si = Math.round(ox + (i + 0.5 - ox) / f - 0.5);
        if (!op(si, j)) continue;
        const k = j * w + i; d[k * 4] = 22; d[k * 4 + 1] = 10; d[k * 4 + 2] = 26; d[k * 4 + 3] = a;
      }
    } }
  for (const L of [back, front, sil]) L.c.putImageData(L.img, 0, 0);
  // the width across the light: the base's widest row (half-width rx) lands on the footing ellipse's two
  // tangent points for this light (where its outline turns away from the sun), so the shadow leaves the
  // base cleanly instead of jutting past its front (owner: "it juts out at the bottom")
  return (per[pk] = { back: back.cv, front: front.cv, sil: sil.cv, base, M, col });
};
const layBox = (ctx, cv, H, x, y, dir) => {
  const B = H.box;
  if (dir >= 0) { ctx.drawImage(cv, x - B.ox / 2, y - B.oy / 2, B.w / 2, B.h / 2); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(cv, -B.ox / 2, -B.oy / 2, B.w / 2, B.h / 2); ctx.restore();
};
// pix/halls.js, right after the building (side "back") and its front piece (side "front")
export const hallRim = (ctx, H, x, y, dir, side, time) => {
  if (SUN.t !== time || SUN.amber < 0.02) return;
  const s = bakeHallSun(H, dir < 0 ? -1 : 1), pa = ctx.globalAlpha;
  ctx.globalAlpha = pa * Math.min(1, SUN.amber * 1.15);
  layBox(ctx, s[side], H, x, y, dir);
  ctx.globalAlpha = pa;
};
// the ground pass: last frame's halls, each its own shape, sheared down-right from its base line
export const SHEAR = 0.75;      // shadow length per unit of height, x len (2.5 at sunset)
export const SUN_SHEAR = SHEAR;
const CH0 = (() => { const l = Math.hypot(0.3, 0.95); return [-0.3 / l, -0.95 / l]; })();   // the shadow's foot: up-left from the base's right side
// the shadow foot's shape (sun-try.html tries options on one hall; bump v to rebake)
// owner's pick (2026-11-22, option A of sun-try.html): from the middle of the base's drawn front edge, the foot
// slanting up-right behind the body, widening over 16 units
export const SHADOW_TUNE = { v: 0, mode: "lip", ax: 0, ch: [0.49, -0.63], widen: 1.8, flare: 16 };
export const drawHallShadows = (ctx, len, a) => {
  const list = SUN.list;
  SUN.list = [];
  if (a < 0.01) return;
  const pa = ctx.globalAlpha, L = SHEAR * len;
  ctx.globalAlpha = pa * a;
  for (const q of list) {
    const s = bakeHallSun(q.H, q.dir < 0 ? -1 : 1), B = q.H.box;
    ctx.save();
    ctx.translate(q.x + s.M[0], q.y + s.M[1]);
    // a point h above the base falls h*L along DIR; the tower's WIDTH lies across the light (QW, the
    // ground's perpendicular to DIR as the camera sees it), so the shadow is as wide as the tower
    // (owner: "make sure the shadows take the full width of the towers")
    ctx.transform(s.col[0], s.col[1], -L * DIR[0], -L * DIR[1], 0, 0);
    if (q.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(s.sil, -B.ox / 2, -s.base / 2, B.w / 2, B.h / 2);
    ctx.restore();
  }
  ctx.globalAlpha = pa;
};
