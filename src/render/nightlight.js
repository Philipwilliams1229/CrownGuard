// ============ NIGHT LIGHT: lamps and torches as LIGHT, not a disc ============
// The reusable piece for the Blood Moon and the night maps to come. A leaf module (no
// imports), so a hall file, draw.js or any night painter may call it.
//
//   nightTick(time)                       the night painter calls it every frame it paints
//   nightOn(time)                         true while a night painter is running (callers gate on it)
//   noteLamp(x, y, r, col, k, ground)     a lamp this frame, in board units: (x, y) the flame, r its
//                                         reach, col its colour, k 0..1, ground: how far above the
//                                         ground it burns (units; drives the pool's strength)
//   drawLampPools(ctx)                    UNDER the actors: each lamp's pool on the ground, a flat
//                                         ellipse (0.55 tall, the board's 3-D squash)
//   drawLampBloom(ctx)                    OVER the board: the glow round each flame itself
//
// Both are stepped, Bayer-dithered stamps baked once per radius, colour and kind, laid with
// 'lighter' so they ADD light to what is under them; nothing is a flat translucent disc.
// halls.js notes each hall's torch lights; the lamps of a frame are those noted during it
// (the pools run first in the NEXT frame, from the list kept: one frame late, never seen).

const PX = 2;                               // art pixels to a board unit
let STAMP = -1e9;
export const nightTick = (time) => { STAMP = time; };
export const nightOn = (time) => time - STAMP < 0.3 && time - STAMP > -0.3;

let CUR = [], PREV = [];
export const noteLamp = (x, y, r, col, k, ground = 10) => { if (CUR.length < 96) CUR.push({ x, y, r, col, k, ground }); };
// called once a frame by the night painter after the bloom: this frame's lamps become the pools' list
export const swapLamps = () => { PREV = CUR; CUR = []; };
export const clearLamps = () => { CUR = []; PREV = []; };

// 4x4 ordered-dither thresholds, 0..1
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// a lamp's colour ramp, hot core to a deep outer ring (kept warm whatever the lamp's own colour)
const ramp = (col) => {
  const c = hex(col);
  return [mix(c, [255, 250, 225], 0.55), mix(c, [255, 255, 255], 0.12), c, mix(c, [150, 40, 20], 0.55)];
};

const SPR = new Map();
// kind "ground": a flat pool (rx wide, 0.55 x that tall); "bloom": a round glow
const sprite = (rx, col, kind) => {
  const key = `${kind}|${rx}|${col}`;
  let s = SPR.get(key);
  if (s) return s;
  const ry = kind === "ground" ? Math.max(2, Math.round(rx * 0.55)) : rx;
  const w = Math.ceil(rx * 2 * PX) + 2, h = Math.ceil(ry * 2 * PX) + 2;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d"), img = c.createImageData(w, h), d = img.data, R = ramp(col);
  const cx = w / 2, cy = h / 2;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (i + 0.5 - cx) / (rx * PX), dy = (j + 0.5 - cy) / (ry * PX), dd = Math.hypot(dx, dy);
    if (dd >= 1) continue;
    // a long soft fall-off, then four dithered steps: pale core, lamp colour, ember, a thin red edge
    const v = Math.pow(1 - dd, kind === "bloom" ? 1.7 : 1.35) * (kind === "bloom" ? 1 : 0.95);
    const q = v * 4 + (BAYER[(j & 3) * 4 + (i & 3)] - 0.5) * 0.9;
    const lv = q > 2.6 ? 0 : q > 1.6 ? 1 : q > 0.8 ? 2 : q > 0.25 ? 3 : -1;
    if (lv < 0) continue;
    const o = (j * w + i) * 4, col2 = R[lv], A = kind === "bloom" ? [255, 190, 120, 70][lv] : [210, 170, 120, 70][lv];
    d[o] = col2[0]; d[o + 1] = col2[1]; d[o + 2] = col2[2]; d[o + 3] = A;
  }
  c.putImageData(img, 0, 0);
  s = { cv, w, h };
  SPR.set(key, s);
  if (SPR.size > 120) SPR.delete(SPR.keys().next().value);
  return s;
};
const bucket = (r) => Math.max(4, Math.round(r / 2) * 2);
const FLICK = [1, 0.84, 0.94, 0.78, 1, 0.9, 0.74, 0.96];

// time: g.time, for the flicker (each lamp keeps its own phase from where it stands)
export const drawLampPools = (ctx, time) => {
  if (!PREV.length) return;
  const prev = ctx.globalCompositeOperation, pa = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  for (const L of PREV) {
    const fl = FLICK[Math.floor(time * 12 + L.x * 0.37) & 7], high = Math.max(0.35, 1 - L.ground / 46);
    const s = sprite(bucket(L.r * 2.5 + 6), L.col, "ground");
    ctx.globalAlpha = pa * Math.min(1, L.k * fl * high * 1.15);
    // the pool sits on the ground below the flame, a touch toward the viewer
    ctx.drawImage(s.cv, Math.round(L.x * PX) / PX - s.w / PX / 2, Math.round((L.y + L.ground * 0.9 + 3) * PX) / PX - s.h / PX / 2, s.w / PX, s.h / PX);
  }
  ctx.globalCompositeOperation = prev; ctx.globalAlpha = pa;
};
export const drawLampBloom = (ctx, time) => {
  if (!CUR.length) return;
  const prev = ctx.globalCompositeOperation, pa = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  for (const L of CUR) {
    const fl = FLICK[Math.floor(time * 12 + L.x * 0.37) & 7];
    const s = sprite(bucket(L.r * 0.9 + 2), L.col, "bloom");
    ctx.globalAlpha = pa * Math.min(1, L.k * fl);
    ctx.drawImage(s.cv, Math.round(L.x * PX) / PX - s.w / PX / 2, Math.round(L.y * PX) / PX - s.h / PX / 2, s.w / PX, s.h / PX);
  }
  ctx.globalCompositeOperation = prev; ctx.globalAlpha = pa;
};
