// ============ FIRE IN FLIGHT (the owner's Round 20 A, 2026-11-24) ============
// The Pyromancer / Inferno Throne fireball, the Comet Sling's burning stone and the Fireship Wharf's fire pot (its shot,
// muzzle flash and landing burst), in Dragonbreath's look: ONE mottled mass of gold / orange / deep orange / red-orange
// cells stretched along the flight and drifting back, a white-hot heart a little forward of the middle, ragged licks swept
// back behind a round head, a broken pale core down the tail, a 1-px tinted dark-red rim (#8a2028), the tail see-through in
// steps and breaking up at its end, a faint dithered warm halo, no smoke. Concept: concept/fx-r20-fireball.js (row
// fireball20, option A), whose `field` is ported here unchanged, writing into a pixel buffer instead of fillRect.
// Everything is baked: per (kind, heading step of DIRS, age step) for the fireball and the stone, per (heading, tail step)
// for the pot's shot, per (heading, frame) for its flash, per frame for its burst. The cache is LRU, held to BUDGET bytes,
// and at most PER_FRAME bakes are made in any one frame (a shot whose bake must wait shows the nearest age already baked,
// or, the first time a heading is seen, skips one frame). fx.js drawOrb / the "rock" branch and musketfx.js call in here.
// FLIGHT.on false draws today's old look again (labs compare the two); FLIGHT counts bakes and their ms.
import { PX } from "./paint.js";

export const FLIGHT = { on: true, bakes: 0, bakeMs: 0 };
// labs: ?oldfire=1 in a page's URL shows today's old look (a before / after in shotlab)
if (typeof location !== "undefined" && /[?&]oldfire=1/.test(location.search)) FLIGHT.on = false;

const FIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020", "#7a2050"].map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const INK = [0x8a, 0x20, 0x28];
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2, DIRS = 32;

// ---- the cache: LRU, a byte budget, a per-frame bake budget ---------------------------------------------------------------------
const CACHE = new Map(), BUDGET = 8 * 1024 * 1024, PER_FRAME = 4;
let bytes = 0, winAt = -1e9, winBakes = 0;
const sizeOf = (s) => (s.cv ? s.cv.width * s.cv.height * 4 : 0);
const cached = (key) => { const s = CACHE.get(key); if (s) { CACHE.delete(key); CACHE.set(key, s); } return s; };
const bake = (key, make) => {
  let s = cached(key); if (s) return s;
  const now = performance.now();
  if (now - winAt > 12) { winAt = now; winBakes = 0; }          // a new frame: frames are 16 ms or more apart
  if (winBakes >= PER_FRAME) return null;
  winBakes++;
  s = make(); FLIGHT.bakes++; FLIGHT.bakeMs += performance.now() - now;
  CACHE.set(key, s); bytes += sizeOf(s);
  while (bytes > BUDGET && CACHE.size > 1) { const [k, v] = CACHE.entries().next().value; CACHE.delete(k); bytes -= sizeOf(v); }
  return s;
};
export const flightStats = () => ({ sprites: CACHE.size, mb: +(bytes / 1048576).toFixed(2), bakes: FLIGHT.bakes, bakeMs: +FLIGHT.bakeMs.toFixed(1) });
export const flightClear = () => { CACHE.clear(); bytes = 0; FLIGHT.bakes = 0; FLIGHT.bakeMs = 0; };

// ---- a pixel buffer, cropped to what was painted ---------------------------------------------------------------------------------
const buf = (w, h) => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });
const set = (b, x, y, c, a) => {
  if (a <= 0 || x < 0 || y < 0 || x >= b.w || y >= b.h) return;
  const i = (y * b.w + x) * 4, A = a * 255, o = b.d[i + 3];
  if (o === 0) { b.d[i] = c[0]; b.d[i + 1] = c[1]; b.d[i + 2] = c[2]; b.d[i + 3] = A; return; }
  const oa = o / 255, na = a + oa * (1 - a);                    // "over" a pixel already painted (a later layer)
  for (let k = 0; k < 3; k++) b.d[i + k] = (c[k] * a + b.d[i + k] * oa * (1 - a)) / na;
  b.d[i + 3] = na * 255;
};
const done = (b, ax, ay) => {
  let x0 = b.w, y0 = b.h, x1 = -1, y1 = -1;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (b.d[(y * b.w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { cv: null, ax: 0, ay: 0 };
  const w = x1 - x0 + 1, h = y1 - y0 + 1, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const img = new ImageData(w, h);
  for (let y = 0; y < h; y++) img.data.set(b.d.subarray(((y + y0) * b.w + x0) * 4, ((y + y0) * b.w + x0 + w) * 4), y * w * 4);
  cv.getContext("2d").putImageData(img, 0, 0);
  return { cv, ax: ax - x0, ay: ay - y0 };
};

// ---- the flame field (concept/fx-r20-fireball.js `field`, unchanged but for the buffer) ---------------------------------------
const field = (b, o) => {
  const { x, y, ux, uy, R, Lt, pw = 1.2, wt = 0.85, lean = 0.7, rag = 0.5, bend = 0, age = 0, vd = 0.07, see = 0.55, heart = 0.5, seed = 1, aMul = 1 } = o;
  const q0 = age * vd;
  const prof = (s, side) => {
    let w = s > 0 ? R * Math.sqrt(Math.max(0, 1 - (s / (R * 1.05)) ** 2)) : Math.max(R * Math.sqrt(Math.max(0, 1 - (s / R) ** 2)), -s < Lt ? R * wt * Math.pow(1 - (-s) / Lt, pw) : 0);
    if (w <= 0) return 0;
    if (s < R * 0.4) {
      const k = Math.floor((s + q0) / 2.5), h1 = H(k, seed * 7 + side * 3), h2 = H(Math.floor((s + q0) / 6), seed * 5 + side * 11 + 40);
      w *= 1 - rag * 0.45 + rag * (0.7 * h1 * h1 * h1 + 0.45 * h2);
    }
    return w;
  };
  const ext = Math.max(R, Lt) + R + 3, x0 = Math.floor(x - ext), x1 = Math.ceil(x + ext), y0 = Math.floor(y - ext - (bend > 0 ? bend * Lt * Lt : 0)), y1 = Math.ceil(y + ext);
  const inside = (px, py) => {
    const dx = px + 0.5 - x, dy0 = py + 0.5 - y, s = dx * ux + dy0 * uy;
    const dy = s < 0 ? dy0 + bend * s * s : dy0, n = -dx * uy + dy * ux, side = n >= 0 ? 1 : 0, an = Math.abs(n);
    const sp = s + lean * an * cl(-s / R + 0.15), w = prof(sp, side);
    if (an >= w || (o.skip && o.skip(s, n))) return null;
    return { s, n, an, w, sp };
  };
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const f = inside(px, py);
    if (!f) {
      if (o.glow) {
        const d = Math.hypot(px + 0.5 - x, py + 0.5 - y);
        if (d < R + o.glow && d > R * 0.6 && bay(px, py) < 0.34 * (1 - (d - R) / o.glow)) set(b, px, py, d < R + 2 ? FIRE[2] : FIRE[3], 0.4 * aMul);
      }
      continue;
    }
    if (o.thin && H(px * 0.37 + py * 1.71, 91 + Math.floor(o.age / 50)) < o.thin) continue;
    const { s, n, an, w } = f, tn = an / Math.max(0.8, w), u = s < 0 ? cl(-s / Lt) : 0;
    const qa = s + q0, m1 = H(Math.floor(qa / 5) + 300, Math.floor((n + 40) / 2) + seed * 13), m2 = H(Math.floor(qa / 9) + 500, Math.floor((n + 40) / 3.5) + seed * 17), m = m1 * 0.6 + m2 * 0.4;
    const dh = Math.hypot(s - R * 0.2, n * 1.15) / (R * heart);
    const heat = (1 - Math.pow(tn, 1.3)) * (1 - 0.7 * u) * 0.85 + (m - 0.5) * 0.8 + (dh < 1 ? 0.35 * (1 - dh) : 0);
    let col = heat > 0.98 ? FIRE[0] : heat > 0.76 ? FIRE[1] : heat > 0.5 ? FIRE[2] : heat > 0.26 ? FIRE[3] : FIRE[4];
    if (dh < 0.5) col = dh < 0.3 || bay(px, py) < 0.5 ? FIRE[0] : FIRE[1];
    else if (an < 1 && s < 0 && u < (o.coreTail ?? 0.5) && m > 0.48) col = m > 0.7 && u < 0.25 ? FIRE[0] : FIRE[1];
    const edge = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
    if (edge) col = u > 0.6 ? FIRE[4] : bay(px, py) < 0.7 ? INK : FIRE[4];
    else if (tn > 0.86 && bay(px, py) < 0.3) col = FIRE[4];
    let a = u < 0.35 ? 1 : u < 0.58 ? 0.85 : u < 0.8 ? 0.7 : see;
    if (u > 0.72 && bay(px, py) < (u - 0.72) * 2.2) continue;
    if (edge && u < 0.6) a = Math.max(a, 0.9);
    set(b, px, py, col, a * aMul);
  }
};

// ---- headings and steps -------------------------------------------------------------------------------------------------------------
const dirOf = (ang) => ((Math.round(ang / TAU * DIRS) % DIRS) + DIRS) % DIRS;
const unit = (d) => { const a = d / DIRS * TAU; return [Math.cos(a), Math.sin(a)]; };
const AGE_MS = 40, AGES = 12;                                    // the mottle steps every 40 ms; past 11 it cycles 6..11
const ageStep = (ms) => { const s = Math.floor(Math.max(0, ms) / AGE_MS); return s < AGES ? s : 6 + ((s - 6) % (AGES - 6)); };
const nearest = (pre, d, st) => { for (let k = st - 1; k >= 0; k--) { const s = CACHE.get(pre + d + "|" + k); if (s) return s; } return null; };
const stamp = (ctx, s, x, y) => {
  if (!s || !s.cv) return;
  const X = Math.round(x * PX) / PX, Y = Math.round(y * PX) / PX;
  ctx.drawImage(s.cv, X - s.ax / PX, Y - s.ay / PX, s.cv.width / PX, s.cv.height / PX);
};
const sized = (n) => buf(n, n);

// ---- the fireball: born white-hot, its short tail growing as it flies ------------------------------------------------------------
const ballBake = (big, d, st) => () => {
  const R = big ? 10 : 7, age = st * AGE_MS, Lt = Math.min(3.2 * R, 4 + age * 0.6), [ux, uy] = unit(d);
  const n = Math.ceil(2 * (Math.max(R, Lt) + R + 6)), b = sized(n), c = n >> 1;
  field(b, { x: c, y: c, ux, uy, R, Lt, pw: 0.95, wt: 0.85, lean: 0.75, rag: 0.6, glow: big ? 4 : 3, age, seed: big ? 8 : 3 });
  return done(b, c, c);
};
// p: the projectile (its first draw stamps its birth on it); (x, y) world
export const drawFireball = (ctx, p, time, ang) => {
  if (p._fb === undefined) p._fb = time;
  const big = p.big ? 1 : 0, d = dirOf(ang), st = ageStep((time - p._fb) * 1000), pre = "fb" + big + "|";
  const s = bake(pre + d + "|" + st, ballBake(big, d, st)) || nearest(pre, d, st);
  stamp(ctx, s, p.x, p.y);
  return !!s;
};

// ---- the Comet Sling's stone: a flame wrapped round it streaming back, the stone, pitch burning on its back -------------------------
// sized to the stone (the concept's was the plain stone, radius 7.8 art px; the Comet Sling throws the Trebuchet's big one, 11.2)
const STONE_R = { rock: 7.8, big: 11.2 };
const stoneBack = (d, st, big) => () => {
  const k = (big ? STONE_R.big : STONE_R.rock) / STONE_R.rock, R = 9.5 * k, age = st * AGE_MS, Lt = Math.min(22 * k, 8 * k + age * 0.48), [ux, uy] = unit(d);
  const n = Math.ceil(2 * (Lt + R + 8)), b = sized(n), c = n >> 1;
  field(b, { x: c - ux * 1.5, y: c - uy * 1.5, ux, uy, R, Lt, pw: 1.1, lean: 0.7, rag: 0.55, heart: 0.42, glow: 3, age, seed: 4 });
  return done(b, c, c);
};
const stoneFront = (d, st, big) => () => {
  const k = (big ? STONE_R.big : STONE_R.rock) / STONE_R.rock, age = st * AGE_MS, [ux, uy] = unit(d), n = 52, b = sized(n), c = n >> 1;
  field(b, { x: c, y: c, ux, uy, R: 7.5 * k, Lt: 10 * k, wt: 1, lean: 0.4, rag: 0.8, age, seed: 9, heart: 0, aMul: 0.9, coreTail: 0, skip: (s, nn) => s > -1 || H(Math.floor(s + age * 0.05), Math.floor(nn / 2) + 70) < 0.45 });
  return done(b, c, c);
};
// layer "back" before the stone, "front" after it; (x, y) world, ang the stone's heading on its arc
export const drawStoneFire = (ctx, p, time, x, y, ang, layer) => {
  if (p._fb === undefined) p._fb = time;
  const big = p.big ? 1 : 0, d = dirOf(ang), st = ageStep((time - p._fb) * 1000), pre = (layer === "back" ? "sb" : "sf") + big + "|";
  const s = bake(pre + d + "|" + st, (layer === "back" ? stoneBack : stoneFront)(d, st, big)) || nearest(pre, d, st);
  stamp(ctx, s, x, y);
};

// ---- the fire pot: a white-hot shot and its streak, the flash at the muzzle, the burst where it lands -----------------------------
const potBake = (d, ls) => () => {
  const [ux, uy] = unit(d), Lt = ls * 3, n = 2 * (Lt + 12), b = sized(n), c = n >> 1;
  field(b, { x: c, y: c, ux, uy, R: 3, Lt, wt: 0.9, lean: 0.6, rag: 0.55, heart: 0.9, age: ls * 48, seed: 31, coreTail: 0.8, pw: 1.3 });
  return done(b, c, c);
};
export const drawPotShot = (ctx, x, y, ang, flownWorld) => {
  const d = dirOf(ang), ls = Math.min(6, Math.floor(flownWorld * PX / 3));
  stamp(ctx, bake("ps|" + d + "|" + ls, potBake(d, ls)) || nearest("ps|", d, ls), x, y);
};
const flashBake = (d, k) => () => {
  const [ux, uy] = unit(d), f = k / 3, n = 44, b = sized(n), c = n >> 1;
  field(b, { x: c + ux * 2, y: c + uy * 2, ux: -ux, uy: -uy, R: 4 - 1.5 * f, Lt: 14 - 6 * f, pw: 1.5, wt: 0.9, lean: 0.5, rag: 0.7, age: f * 72 * 3, seed: 30, heart: 0.8, coreTail: 0.7 });
  return done(b, c, c);
};
// ms since the shot (under FLASH_MS)
export const drawPotFlash = (ctx, x, y, ang, ms, flashMs) => {
  const d = dirOf(ang), k = Math.min(2, Math.floor(ms / flashMs * 3));
  stamp(ctx, bake("pf|" + d + "|" + k, flashBake(d, k)) || nearest("pf|", d, k), x, y);
};
const BURST_N = 8;
const burstBake = (k) => () => {
  const f = (k + 0.5) / BURST_N, n = 84, b = sized(n), gx = n >> 1, gy = 62;   // room above for the flame climbing off the mark
  field(b, { x: gx, y: gy - 2 - 9 * f, ux: 0, uy: 1, R: (4 + 6 * Math.sqrt(f)) * (f < 0.6 ? 1 : 1 - (f - 0.6) * 1.2), Lt: 8 + 14 * f, pw: 0.9, wt: 0.95, lean: 0.9, rag: 0.8, age: (90 + f * 170) * 2, seed: 35, heart: 0.6 * (1 - f), coreTail: 0.4, see: 0.45, thin: f < 0.45 ? 0 : f < 0.7 ? 0.25 : 0.5 });
  for (let j = 0; j < 9; j++) {
    const a = -Math.PI * (0.1 + 0.8 * H(j, 36)), dd = 6 + f * (14 + 10 * H(j, 37));
    set(b, Math.floor(gx + Math.cos(a) * dd * 1.3), Math.floor(gy + Math.sin(a) * dd * 0.8 + f * f * 10), f < 0.4 ? FIRE[1] : f < 0.75 ? FIRE[2] : FIRE[3], 1);
  }
  return done(b, gx, gy);
};
// (x, y) the mark (world); ms since the shot landed, of hitMs. The burst stands 3 art px below the mark, as the concept's.
export const drawPotBurst = (ctx, x, y, ms, hitMs) => {
  const k = Math.min(BURST_N - 1, Math.floor(ms / hitMs * BURST_N));
  stamp(ctx, bake("pb||" + k, burstBake(k)) || nearest("pb|", "", k), x, y + 3 / PX);
};
