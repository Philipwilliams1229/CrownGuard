// ============ RENDER: THE MUSKET SHOT ============
// One shot of a musket as an effect (the River Watch's skiffs): the flash
// at the muzzle, the ball streaking to its mark, a knock of dust (or
// sparks and pitch-fire) where it lands, and the powder smoke — blown out
// along the shot, then hanging and rising where it was fired while the
// boat rows on. Painted pixel by pixel at art resolution and baked once per
// heading / frame, like render/fx.js; a shot on screen is two or three blits.
//
// The engine pushes { type: "musket", x, y (the muzzle), tx, ty (the mark),
// ttl: MUSKET_LIFE, life: MUSKET_LIFE } — optional `fire: true` (the
// Fireship Wharf's pitch shot: a red flash, an ember for a ball, a burst of
// fire where it lands, darker smoke) and `splash` (its radius: a bigger
// knock). draw.js calls drawMusketShot(ctx, fx, a) in the effects pass.

import { PX, INK_LINE, inkOutline, hash } from "./paint.js";

export const MUSKET_LIFE = 900;          // ms: the smoke's life; everything else is quicker
const FLASH_MS = 72, HIT_MS = 170;   // the flash lasts as long as the kick (rigs-skiff.js skiffGunPose)
const flightOf = (dist) => Math.max(36, Math.min(110, dist / 1.9));   // ~1900 units a second

// ---- palette ----
const col = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pal = (...hs) => hs.map(col);
const TONES = {
  plain: {
    flash: pal("#ffffff", "#fff3d2", "#f8d868", "#f0a040"),
    smoke: pal("#f4f0e6", "#d8d2c8", "#b0a8a4", "#88808a"),
    ball: pal("#b4b4c0", "#3a3a46"),
    streak: col("#fff3d2"),
    hit: pal("#fff3d2", "#e0d2b0", "#b8a07c", "#8a7458"),
  },
  fire: {
    flash: pal("#fff3d2", "#f8d868", "#f0a040", "#d8683a"),
    smoke: pal("#c8bcb4", "#958a86", "#6c6268", "#4a4250"),
    ball: pal("#fff3d2", "#f08a3a"),
    streak: col("#f8b048"),
    hit: pal("#fff3d2", "#f8d868", "#f0a040", "#c0503a"),
  },
};

// ---- pixel canvas (as fx.js) ----
const grid = (w, h) => {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
  const W = cv.width, H = cv.height;
  const c = cv.getContext("2d", { willReadFrequently: true });
  const img = c.createImageData(W, H), d = img.data;
  const set = (x, y, k, a = 255) => {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    d[i] = k[0]; d[i + 1] = k[1]; d[i + 2] = k[2]; d[i + 3] = a;
  };
  const done = (ink = null) => { c.putImageData(img, 0, 0); if (ink) inkOutline(cv, ink, 1); return cv; };
  return { cv, W, H, set, done };
};
const CACHE = new Map();
const memo = (key, make) => {
  let s = CACHE.get(key);
  if (!s) { s = make(); CACHE.set(key, s); }
  return s;
};
// stamp with the anchor on (x, y), snapped to the art grid
const put = (ctx, s, x, y) => {
  const X = Math.round(x * PX) / PX, Y = Math.round(y * PX) / PX;
  ctx.drawImage(s.cv, X - s.ax / PX, Y - s.ay / PX, s.cv.width / PX, s.cv.height / PX);
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const vnoise = (x, y, cell, seed) => {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  let fx = x / cell - gx, fy = y / cell - gy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const s = Math.floor(seed * 977);
  const h = (i, j) => hash(gx + i + s, gy + j);
  return (h(0, 0) * (1 - fx) + h(1, 0) * fx) * (1 - fy) + (h(0, 1) * (1 - fx) + h(1, 1) * fx) * fy;
};
// a lumpy lit ball of smoke: lit from the upper left, thinned by dither
const lump = (G, cx, cy, r, tones, seed, dens = 1) => {
  if (r < 0.8) return;
  const n = tones.length, cell = Math.max(2, r * 0.5);
  for (let y = Math.floor(cy - r * 1.15); y <= Math.ceil(cy + r * 1.15); y++) for (let x = Math.floor(cx - r * 1.15); x <= Math.ceil(cx + r * 1.15); x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d = Math.sqrt(dx * dx + dy * dy);
    const edge = 0.8 + 0.32 * vnoise(x, y, cell, seed);
    if (d > edge) continue;
    if (dens < 1 && bay(x & 1023, y & 1023) >= dens) continue;
    const k = d / edge, l = -(dx * 0.55 + dy * 0.64);
    let t = k * 0.3 + (0.5 - l) * 0.7 * 0.9;
    if (k > 0.84 && l < 0.1) t += 0.35;
    G.set(x, y, tones[Math.max(0, Math.min(n - 1, Math.floor(t * n)))]);
  }
};
const DIRS = 32;
const dirOf = (ang, n = DIRS) => ((Math.round((ang / (Math.PI * 2)) * n) % n) + n) % n;
// a sprite turned to heading d of n: each art pixel samples the upright
// shape (lx along the heading, ly across), so it stays crisp at any angle
const turned = (key, d, n, half, shape) => memo(`${key}|${d}`, () => {
  const a = (d / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), G = grid(half * 2, half * 2);
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const dx = x + 0.5 - half, dy = y + 0.5 - half;
    const k = shape(dx * c + dy * s, -dx * s + dy * c, x, y);
    if (k) G.set(x, y, k[0], k[1] ?? 255);
  }
  return { G, ax: half, ay: half };
});

// ---- the flash: a tongue of fire out along the shot, a white heart and
// two sparks flung wide; three frames (bloom, stretch, the last of it) ----
const flashSprite = (kind, d, f) => {
  const s = memo(`mf|${kind}|${d}|${f}`, () => {
    const T = TONES[kind].flash, L = [9, 12, 6][f] * PX, R = [3.2, 2.4, 1.6][f] * PX;
    const { G } = turned(`mfg|${kind}|${f}`, d, 16, 30, (lx, ly) => {
      const ay = Math.abs(ly);
      if (lx < -R * 0.6 || lx > L) return null;
      // the tongue narrows from the heart to its tip
      const w = lx < 0 ? R * 0.6 * Math.sqrt(1 - (lx / (R * 0.6)) ** 2) : R * (1 - lx / L) ** 0.8;
      if (ay > w) {
        // two sparks, out to either side of the bloom
        if (f < 2 && Math.abs(Math.abs(ly) - (f ? 5.5 : 4) * PX) < 1 && Math.abs(lx - (f ? 5 : 3) * PX) < 1.2) return [T[1]];
        return null;
      }
      const k = (ay / (w || 1)) * 0.6 + (Math.max(0, lx) / L) * 0.8 + f * 0.35;
      return [T[Math.min(3, Math.floor(k * 2.2))]];
    });
    return { cv: G.done(), ax: 30, ay: 30 };
  });
  return s;
};

// ---- the ball, with its streak behind it (never longer than it has flown) ----
const STREAKS = [3, 7, 13];
const ballSprite = (kind, d, sl) => memo(`mb|${kind}|${d}|${sl}`, () => {
  const T = TONES[kind], len = STREAKS[sl] * PX, half = len + 6;
  const a = (d / DIRS) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), G = grid(half * 2, half * 2);
  // the streak first, un-inked, fading back along the line
  for (let i = 2; i < len; i++) {
    const t = i / len, x = half - c * i, y = half - s * i;
    G.set(x, y, T.streak, Math.round(230 * (1 - t) ** 1.3));
    if (i < len * 0.4) G.set(x - s * 0.9, y + c * 0.9, T.streak, Math.round(120 * (1 - t / 0.4)));
  }
  const S = grid(half * 2, half * 2);
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
    if (x * x + y * y > 1.9 * 1.9) continue;
    S.set(half + x, half + y, T.ball[x + y < 0 ? 0 : 1]);
  }
  const cv = G.done();
  const cx = cv.getContext("2d");
  cx.drawImage(S.done(INK_LINE), 0, 0);
  return { cv, ax: half, ay: half };
});

// ---- the smoke: blown out along the shot, then a lumpy cloud that swells,
// rises and thins away; six frames ----
const SMOKE_F = 6;
const smokeSprite = (kind, d, f) => memo(`ms|${kind}|${d}|${f}`, () => {
  const T = TONES[kind].smoke, S = 44, G = grid(S, S), c = S / 2, p = (f + 0.5) / SMOKE_F;
  const a = (d / 8) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
  const dens = p < 0.45 ? 1 : 1 - (p - 0.45) * 1.45;
  const lobes = f === 0 ? 3 : 4;
  for (let j = 0; j < lobes; j++) {
    // strung out along the shot at first, gathering into a cloud
    const along = (j - 1) * (5 - p * 3) + 2, side = (j % 2 ? 1 : -1) * (1 + p * 3.5), rise = -p * 3 - j * 0.6;
    const x = c + (ux * along - uy * side * 0.5) * 1.2, y = c + (uy * along + ux * side * 0.5) * 0.9 + rise;
    lump(G, x, y, (2.6 + p * 5.2) * (j === 1 ? 1.15 : 0.9), T, 11 + j * 7 + f, dens);
  }
  return { cv: G.done(), ax: c, ay: c };
});

// ---- where it lands: a white knock and a kick of dust; for pitch shot a
// burst of fire and embers. Four frames; `big` for a splash ----
const hitSprite = (kind, f, big) => memo(`mh|${kind}|${f}|${big}`, () => {
  const T = TONES[kind].hit, S = big ? 56 : 36, G = grid(S, S), c = S / 2, p = (f + 0.5) / 4, sc = big ? 1.6 : 1;
  if (f === 0) {
    for (let i = -5; i <= 5; i++) { G.set(c + i * sc, c, T[Math.abs(i) < 2 ? 0 : 1]); G.set(c, c + i * 0.7 * sc, T[Math.abs(i) < 2 ? 0 : 1]); }
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) G.set(c + x, c + y, T[0]);
  }
  const dens = f < 2 ? 1 : 1 - (f - 1.5) * 0.4;
  for (let j = 0; j < 3; j++) {
    const ang = j * 2.1 + 0.5, dd = (1.5 + p * 6) * sc;
    lump(G, c + Math.cos(ang) * dd, c + Math.sin(ang) * dd * 0.6 - p * 3 * sc, (1.8 + p * 3.2) * sc, kind === "fire" ? T : T.slice(1), 41 + j, dens);
  }
  // flecks thrown out
  for (let i = 0; i < 6; i++) {
    const ang = i * 1.05 + 0.3, dd = (3 + p * 11) * sc;
    const x = c + Math.cos(ang) * dd, y = c + Math.sin(ang) * dd * 0.6 + p * p * 8;
    if (f < 3) G.set(x, y, T[kind === "fire" ? (i % 2 ? 1 : 2) : 2]);
  }
  return { cv: G.done(), ax: c, ay: c };
});

const easeOut = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 2;

export const drawMusketShot = (ctx, fx, a = 1) => {
  const life = fx.life || (fx._l ||= Math.max(fx.ttl, MUSKET_LIFE));
  const ms = life - fx.ttl;
  if (ms < 0 || ms >= life) return;
  const kind = fx.fire ? "fire" : "plain";
  const dx = fx.tx - fx.x, dy = fx.ty - fx.y, dist = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
  const ux = dx / dist, uy = dy / dist;
  // the smoke, behind the rest: blown out ahead of the muzzle, then hanging
  const smokeLife = Math.min(life, MUSKET_LIFE);
  if (ms < smokeLife) {
    const p = ms / smokeLife, out = 2 + 6 * easeOut(p * 2.2);
    put(ctx, smokeSprite(kind, dirOf(ang, 8), Math.min(SMOKE_F - 1, Math.floor(p * SMOKE_F))), fx.x + ux * out, fx.y + uy * out * 0.8 - p * 5);
  }
  // the ball, then what it hits
  const fl = flightOf(dist);
  if (ms < fl) {
    const k = ms / fl, flown = dist * k;
    const sl = flown < 5 ? 0 : flown < 11 ? 1 : 2;
    put(ctx, ballSprite(kind, dirOf(ang), sl), fx.x + dx * k, fx.y + dy * k);
  } else if (ms < fl + HIT_MS) {
    put(ctx, hitSprite(kind, Math.min(3, Math.floor(((ms - fl) / HIT_MS) * 4)), fx.splash ? 1 : 0), fx.tx, fx.ty);
  }
  // the flash, over it all, on the muzzle
  if (ms < FLASH_MS) put(ctx, flashSprite(kind, dirOf(ang, 16), Math.min(2, Math.floor((ms / FLASH_MS) * 3))), fx.x, fx.y);
};
