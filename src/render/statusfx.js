// ============ STATUS MARKS ON A FOE, LOOK B ("worked") ============
// The owner's pick from the effects concept page (concept/fx-concepts.js, the B
// column): burn, poison, slow, frozen shell, stun, shield pips, armor crack.
// Every mark is baked ONCE per (kind, size bucket, frame) into a small canvas,
// anchored on the foe's feet, and stamped with one drawImage: there can be
// three hundred of them at once, so nothing here ever paints per foe per frame.
//
// Sizes are art pixels (PX per world unit). `hw` is the half-width and `T` the
// height of the figure (feet to crown), both bucketed so a troll and a goblin
// each get a set and a crowd of goblins shares one.
//
// Drawn bodies are not tinted (the concept soots a burning foe, greens a
// poisoned one): that needs a recoloured copy of every figure, so the marks
// carry the whole read.

import { PX, INK_LINE } from "./paint.js";
import { inkTint } from "./inktint.js";

const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30", "#5a2430"];
const ICE = ["#ffffff", "#d4f2fa", "#9fd4e8", "#62a4cc", "#3a6a98"];
const TOX = ["#e8f8b0", "#b8e050", "#6cb040", "#3c7a38", "#1e4a30"];
const HOLY = ["#fffbe0", "#f8e888", "#e8c45a", "#b8883a", "#6a4a2a"];
const SMOKE = ["#d0c8c0", "#9c969a", "#6a666e", "#46424e"];
const DUST = ["#eee0bc", "#cdb68a", "#a48a64", "#766048"];
const SH = ["#eaf2ff", "#9ab6d8", "#5a7ab0", "#34486e"];
const TAU = Math.PI * 2;
export const FX_N = 8;                       // frames in every loop

// ---- tiny painters (hard pixels on a 2d canvas) ------------------------------------
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const px = (c, x, y, col, a = 1) => { if (a < 1) c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); if (a < 1) c.globalAlpha = 1; };
const ell = (c, cx, cy, rx, ry, col, o = {}) => {
  const a = o.a ?? 1, dens = o.dens ?? 1, hole = o.hole ?? 0;
  if (rx < 0.5 || ry < 0.4) return;
  c.fillStyle = col; if (a < 1) c.globalAlpha = a;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1 || d < hole * hole) continue;
    if (dens < 1 && bay(x, y) >= dens) continue;
    c.fillRect(x, y, 1, 1);
  }
  c.globalAlpha = 1;
};
const ring = (c, cx, cy, rx, ry, col, o = {}) => ell(c, cx, cy, rx, ry, col, { ...o, hole: 1 - (o.th || 1) / Math.max(1, Math.min(rx, ry)) });
const line = (c, x0, y0, x1, y1, col, a = 1) => {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let er = dx + dy;
  for (let n = 0; n < 300; n++) {
    px(c, x0, y0, col, a);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * er;
    if (e2 >= dy) { er += dy; x0 += sx; }
    if (e2 <= dx) { er += dx; y0 += sy; }
  }
};
const pool = (c, cx, cy, rx, ry, col, a) => { ell(c, cx, cy, rx, ry, col, { a: a * 0.5, dens: 0.5 }); ell(c, cx, cy, rx * 0.6, ry * 0.6, col, { a, dens: 0.5 }); };
const flame = (c, x, y, h, w, ph, pal, sway = 1.2) => {
  for (let j = 0; j < h; j++) {
    const p = j / Math.max(1, h - 1), prof = p < 0.25 ? 0.62 + p * 1.5 : Math.pow(Math.cos(((p - 0.25) / 0.75) * (Math.PI / 2)), 0.85);
    const hw = Math.max(0.6, (w / 2) * prof), off = Math.sin(ph + p * 3.2) * sway * p;
    for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) {
      if (Math.abs(dx) > hw + 0.2) continue;
      const d = Math.abs(dx) / hw;
      const col = d > 0.72 ? pal[3] : d > 0.42 || p > 0.8 ? pal[2] : p < 0.55 && d < 0.2 ? pal[0] : pal[1];
      px(c, x + dx + off, y - j, col);
    }
  }
};
const star4 = (c, x, y, r, pal) => { for (let k = -r; k <= r; k++) { const col = Math.abs(k) < 2 ? pal[0] : pal[1]; px(c, x + k, y, col); px(c, x, y + k, col); } px(c, x, y, pal[0]); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) px(c, x + dx, y + dy, pal[2]); };
const jag = (c, pts, frac, col, col2) => {
  const n = (pts.length - 1) * frac;
  for (let k = 0; k < pts.length - 1; k++) {
    if (k >= n) break;
    const f = Math.min(1, n - k), [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    const ex = x0 + (x1 - x0) * f, ey = y0 + (y1 - y0) * f;
    if (col2) line(c, x0 + 1, y0, ex + 1, ey, col2);
    line(c, x0, y0, ex, ey, col);
  }
};
const stamp = (c, rows, map, x, y) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== "." && map[ch]) px(c, x + i, y + j, map[ch]); }));

// ---- the sprite cache -------------------------------------------------------------------
const CACHE = new Map();
const CAP = 900;
const memo = (key, make) => {
  let s = CACHE.get(key);
  if (!s) {
    if (CACHE.size >= CAP) { let n = CAP >> 2; for (const k of CACHE.keys()) { CACHE.delete(k); if (--n <= 0) break; } }
    s = make(); CACHE.set(key, s);
  }
  return s;
};
// sizes in art pixels, bucketed: half-width by 3, height by 6
export const bucketHW = (worldSize) => Math.max(6, Math.min(30, Math.round((worldSize * 0.45 * PX) / 3) * 3));
export const bucketT = (worldH) => Math.max(18, Math.min(96, Math.round((worldH * PX) / 6) * 6));
const UP = 34, DOWN = 12, SIDE = 18;           // room above the crown, below the feet, beside the body

// A sprite anchored on the foe's feet. `ground(c)` paints under; `marks(c)` is inked, then `over(c)` is not.
// All three draw with the origin at the feet's centre, y up negative.
const bake = (hw, T, ground, marks, over) => {
  const cw = (hw + SIDE) * 2, ch = T + UP + DOWN, ax = cw >> 1, ay = T + UP;
  const cv = mk(cw, ch), c = cv.getContext("2d", { willReadFrequently: true });
  if (ground) { c.save(); c.translate(ax, ay); ground(c); c.restore(); }
  if (marks) {
    const m = mk(cw, ch), g = m.getContext("2d", { willReadFrequently: true });
    g.translate(ax, ay); marks(g); g.setTransform(1, 0, 0, 1, 0, 0);
    inkTint(m, INK_LINE, 1);
    c.drawImage(m, 0, 0);
  }
  if (over) { c.save(); c.translate(ax, ay); over(c); c.restore(); }
  return { cv, ax, ay };
};
const stampAt = (ctx, s, x, y) => {
  const X = Math.round(x * PX) / PX, Y = Math.round(y * PX) / PX;
  ctx.drawImage(s.cv, X - s.ax / PX, Y - s.ay / PX, s.cv.width / PX, s.cv.height / PX);
};
const frameOf = (time, id, rate = 10) => (Math.floor(time * rate + id * 3) % FX_N + FX_N) % FX_N;

// ---- BURN: a pool of firelight, four licking flames, embers and smoke -------------------
const burnSprite = (hw, T, f) => memo(`burn|${hw}|${T}|${f}`, () => {
  const t = f / FX_N, fh = Math.round(12 + T * 0.1);
  return bake(hw, T,
    (c) => pool(c, 0, 1, hw + 12, 6, FIRE[2], 0.55 + 0.1 * Math.sin(t * TAU)),
    (g) => {
      const X = [-0.5, -0.12, 0.28, 0.55], Y = [0.3, 0.64, 0.42, 0.7];
      for (let k = 0; k < 4; k++) {
        const x = Math.round(X[k] * hw * 2), y = -Math.round(T * Y[k]), ph = t * TAU + k * 1.9;
        flame(g, x, y, fh + ((f + k) % 3), 8, ph, FIRE, 1.6);
        flame(g, x, y - 1, Math.round(fh / 2), 4, ph + 1, [FIRE[0], FIRE[0], FIRE[1], FIRE[1]], 1);
      }
    },
    (c) => {
      for (let k = 0; k < 5; k++) {
        const q = (t + k * 0.21) % 1, x = (H(k) - 0.5) * hw * 1.6 + Math.sin(q * 8 + k) * 2, y = -T * 0.55 - q * 20;
        px(c, x, y, q < 0.35 ? FIRE[1] : q < 0.7 ? FIRE[2] : FIRE[4]);
      }
      for (let k = 0; k < 3; k++) {
        const q = (t + k / 3) % 1;
        ell(c, (k - 1) * 5 + Math.sin(q * 6 + k) * 2, -T - 3 - q * 14, 2 + q * 3, 1.5 + q * 2, SMOKE[1], { a: 0.65, dens: 0.9 * (1 - q) });
      }
    });
});

// ---- POISON: a green slick, drips down the body, rising bubbles, spores -------------------
const poisonSprite = (hw, T, f) => memo(`poi|${hw}|${T}|${f}`, () => {
  const t = f / FX_N;
  return bake(hw, T,
    (c) => { pool(c, 0, 1, hw + 10, 5.5, TOX[3], 0.6); ell(c, 0, 1, hw + 7, 4, TOX[4], { a: 0.6, dens: 0.6 }); ring(c, 0, 1, hw + 9, 5, TOX[1], { a: 0.75, dens: 0.75 }); },
    (g) => {
      for (let k = 0; k < 4; k++) {
        const q = (t + k * 0.25) % 1, x = (k - 1.5) * (hw * 0.5 + 2) + Math.sin(q * 7 + k) * 1.4, y = -T * 0.5 - q * 18, r = 2.4 + (k % 2) * 1.1 + q;
        if (q > 0.88) continue;
        ell(g, x, y, r, r, TOX[1]); ell(g, x + 0.5, y + 0.8, r * 0.6, r * 0.6, TOX[2]); px(g, x - 1, y - 1, TOX[0]); px(g, x - 1, y - 2, TOX[0]);
      }
    },
    (c) => {
      // drips run down the body, one dropping to the ground
      for (let k = 0; k < 3; k++) {
        const x = Math.round((k - 1) * hw * 0.8), q = (t + k * 0.37) % 1, y0 = -Math.round(T * (0.5 - 0.1 * k));
        line(c, x, y0, x, y0 + Math.round(q * -y0 * 0.7), TOX[2]);
        if (q > 0.7) px(c, x, y0 + Math.round(((q - 0.7) / 0.3) * -y0), TOX[1]);
        if (q > 0.93) { px(c, x - 1, 0, TOX[1]); px(c, x + 1, 0, TOX[1]); }
      }
      for (let k = 0; k < 4; k++) { const q = (t + k * 0.25) % 1; px(c, (k - 1.5) * 6 + Math.sin(q * 6) * 2, -T - q * 8, TOX[1], 1 - q); }
    });
});

// ---- SLOW / CHILL: a frost ring on the ground, rime tufts at the feet, falling motes ------
// (the wheel of stars over the head is fx.js's starWheel, which still reads how hard the slow is)
const slowSprite = (hw, T, f) => memo(`slw|${hw}|${T}|${f}`, () => {
  const t = f / FX_N;
  return bake(hw, T,
    (c) => {
      ell(c, 0, 1, hw + 8, 4, ICE[1], { a: 0.45, dens: 0.35 }); ring(c, 0, 1, hw + 8, 4, ICE[2], { a: 0.8, dens: 0.7 });
      for (let k = 0; k < 3; k++) { const x = Math.round((k - 1) * (hw * 0.9 + 1)); line(c, x, 1, x, -2 - (k % 2) * 2, ICE[1]); px(c, x, -3 - (k % 2) * 2, ICE[0]); }
    }, null,
    (c) => {
      for (let k = 0; k < 7; k++) { const q = (t + k * 0.14) % 1; px(c, (H(k) - 0.5) * hw * 2.6 + Math.sin(q * 6 + k), -T - 6 + q * (T + 6), k % 2 ? "#fff" : ICE[1]); }
    });
});

// ---- FROST MIST: wisps lifting off a frozen foe's feet (over the shell) --------------------
const mistSprite = (hw, T, f) => memo(`mist|${hw}|${T}|${f}`, () => {
  const t = f / FX_N;
  return bake(hw, T, null, null, (c) => {
    for (let k = 0; k < 4; k++) { const q = (t + k * 0.25) % 1; ell(c, (k - 1.5) * 7 + Math.sin(q * 5 + k) * 2, -q * 6, 3 + q * 2, 1.3 + q, "#fff", { a: 0.5, dens: 0.55 * (1 - q) }); }
  });
});

// ---- STUN: four gold stars on trailing arcs round the crown, rattle ticks on the flanks ----
const stunSprite = (hw, T, f) => memo(`stn|${hw}|${T}|${f}`, () => {
  const t = f / FX_N, R = Math.max(9, Math.min(22, Math.round(hw * 0.8) + 4));
  return bake(hw, T, null,
    (g) => {
      for (let k = 0; k < 4; k++) { const a = t * TAU + (k * TAU) / 4; star4(g, Math.round(Math.cos(a) * R), Math.round(-T - 2 + Math.sin(a) * R * 0.31), 3, [HOLY[1], HOLY[2], HOLY[3]]); }
    },
    (c) => {
      for (let k = 0; k < 4; k++) {
        const a = t * TAU + (k * TAU) / 4;
        for (let tr = 4; tr >= 1; tr--) { const aa = a - tr * 0.28; px(c, Math.cos(aa) * R, -T - 2 + Math.sin(aa) * R * 0.31, HOLY[tr > 2 ? 3 : 2], 1 - tr * 0.2); }
      }
      for (const s of [-1, 1]) { line(c, s * (hw + 3), -T * 0.7, s * (hw + 6), -T * 0.75 - (f & 1), HOLY[1]); line(c, s * (hw + 3), -T * 0.55, s * (hw + 7), -T * 0.55, HOLY[1]); }
      if (f % 4 === 0) { ell(c, -hw, 1, 4, 1.5, DUST[1], { a: 0.6, dens: 0.6 }); ell(c, hw, 1, 4, 1.5, DUST[1], { a: 0.6, dens: 0.6 }); }
    });
});

// ---- ARMOR CRACK: a glowing split in the plate with branches and shards dropping off ------
const CRACK = [[0, -7], [-2, -4], [1, -2], [-2, 1], [1, 3], [-1, 6]];
const BR1 = [[1, -2], [5, -4], [8, -3]], BR2 = [[-2, 1], [-6, 2], [-8, 5]];
const crackSprite = (hw, T, f) => memo(`crk|${hw}|${T}|${f}`, () => {
  const t = f / FX_N, y = Math.round(-T * 0.48), pulse = 0.5 + 0.5 * Math.sin(t * TAU), K = Math.max(1, Math.min(2.2, T / 40));
  const sc = (pts) => pts.map(([a, b]) => [a * K, b * K]);
  return bake(hw, T, null, null, (c) => {
    c.save(); c.translate(0, y);
    ell(c, 0, 0, 7 * K, 9 * K, ICE[2], { a: 0.14 + 0.1 * pulse, dens: 0.5 });
    jag(c, sc(CRACK), 1, ICE[0], ICE[4]); jag(c, sc(BR1), 1, ICE[1], ICE[4]); jag(c, sc(BR2), 1, ICE[1], ICE[4]);
    for (let k = 0; k < 4; k++) {
      const q = (t + k * 0.25) % 1, sx = (k % 2 ? 1 : -1) * (3 + q * 9) * K, sy = (q * q * 14 - 4 * q + k) * K;
      px(c, sx, sy - 1, k % 2 ? ICE[1] : "#b4bac6"); px(c, sx, sy, ICE[3]);
    }
    c.restore();
  });
});

// ---- SHIELD: a faint bubble round the foe, and heater-shaped pips, one a blow still owed ----
const shieldSprite = (hw, T, f) => memo(`shd|${hw}|${T}|${f}`, () => {
  const t = f / FX_N, rw = hw + 5, rh = (T + 8) / 2, cy = -T / 2 + 1;
  return bake(hw, T, null, null, (c) => {
    ring(c, 0, cy, rw, rh, SH[1], { a: 0.4, dens: 0.7 }); ell(c, 0, cy, rw, rh, SH[0], { a: 0.07, dens: 0.5 });
    for (let k = 0; k < 7; k++) { const a = -2.3 + t * 3.4 + k * 0.045; px(c, Math.cos(a) * rw, cy + Math.sin(a) * rh, SH[0], 0.85); }
  });
});
const PIP = ["1111111", "1222221", "1222221", "1222221", ".12221.", ".12221.", "..131..", "...3..."];
const pipSprite = (n, flash) => memo(`pip|${n}|${flash ? 1 : 0}`, () => {
  const gap = 11, cw = n * gap + 6, ch = 14, ax = cw >> 1, ay = 7;
  const cv = mk(cw, ch), g = cv.getContext("2d", { willReadFrequently: true });
  for (let i = 0; i < n; i++) {
    const x0 = Math.round(ax + (i - (n - 1) / 2) * gap) - 3;
    stamp(g, PIP, flash ? { 1: "#fff", 2: SH[0], 3: SH[1] } : { 1: SH[0], 2: SH[1], 3: SH[2] }, x0, 2);
  }
  inkTint(cv, "#1c2a4c", 1);
  return { cv, ax, ay };
});

// ---- the entry points fx.js and enemies.js call ---------------------------------------------
// (ctx, foe, world time, ms, feet y, world headroom hr). Each is one blit.
export const statusBurn = (ctx, e, time, feet, hr) => stampAt(ctx, burnSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 10)), e.x, feet);
export const statusPoison = (ctx, e, time, feet, hr) => stampAt(ctx, poisonSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 8)), e.x, feet);
export const statusSlow = (ctx, e, time, feet, hr) => stampAt(ctx, slowSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 6)), e.x, feet);
export const statusMist = (ctx, e, time, feet, hr, hwWorld) => stampAt(ctx, mistSprite(bucketHW(hwWorld || e.size), bucketT(hr), frameOf(time, e.id || 0, 6)), e.x, feet);
export const statusStun = (ctx, e, time, feet, hr) => {
  const f = frameOf(time, e.id || 0, 16);
  stampAt(ctx, stunSprite(bucketHW(e.size), bucketT(hr), f), e.x + ((f >> 1) & 1 ? 0.5 : -0.5), feet);
};
export const statusCrack = (ctx, e, time, feet, hr) => stampAt(ctx, crackSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 6)), e.x, feet);
// the shield: its bubble, then the pips at the crown (just under the health bar)
export const statusShield = (ctx, e, time, tms, feet, hr) => {
  stampAt(ctx, shieldSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 6)), e.x, feet);
  stampAt(ctx, pipSprite(Math.max(1, Math.min(4, e.guard | 0)), e.guardFlash > tms), e.x, feet - hr + 3);
};
