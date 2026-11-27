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
import { rigFrame } from "./rigs.js";
import { isViewSheet } from "./pix/pixrigs.js";

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

// ---- BURN (owner, round 2: between A and B, nearer B, smaller flames, the view kept clear) ----
// B's character (a hot glow and soot on the ground, embers, a thin wisp of smoke) with A's
// hugging idea: small flames ride the figure's EDGES (hip and shoulder either side, a tongue
// off the crown) and the middle of the body is left clear, face and torso readable.
const SOOT = "#2a1e22";
// a clump of tongues rooted together: n tongues across `span`, tallest in the middle
const clump = (g, x, y, span, h, n, ph, f, lean = 0) => {
  for (let k = 0; k < n; k++) {
    const u = n > 1 ? k / (n - 1) - 0.5 : 0, hh = Math.max(4, Math.round(h * (1 - Math.abs(u) * 0.75) * (k % 2 ? 0.8 : 1) + ((f + k) % 3) - 1)), xx = x + Math.round(u * span), w = 5 - (k % 2);
    flame(g, xx + Math.round(lean * u), y + (k % 2), hh, w, ph + k * 1.7, FIRE, 1.2);
    flame(g, xx, y - 1 + (k % 2), Math.round(hh * 0.5), 3, ph + k * 1.7 + 1, [FIRE[0], FIRE[0], FIRE[1], FIRE[1]], 0.8);
  }
};
const burnSprite = (hw, T, f, sb) => memo(`burn|${hw}|${T}|${f}|${sb}`, () => {
  const t = f / FX_N, ph = t * TAU, bh = Math.round(7 + T * 0.14);
  return bake(hw, T,
    (c) => {
      pool(c, 0, 1, hw + 13, 6, FIRE[2], 0.4 + 0.07 * Math.sin(ph));
      pool(c, 0, 1, hw + 5, 3, FIRE[0], 0.24);
      ell(c, 0, 1, hw + 7, 4, SOOT, { a: 0.35, dens: 0.35 });
      for (let k = 0; k < 7; k++) { const a = k * 2.4 + 0.5; px(c, Math.cos(a) * (hw + 6) * (0.5 + 0.5 * H(k, 3)), Math.sin(a) * 4, SOOT, 0.7); }
    },
    (g) => {
      // up the back and shoulder (the side away from the face), a low clump at the feet that
      // spills onto the glow, a short tongue off the crown; the face and chest stay clear
      clump(g, sb * Math.round(hw * 0.6), -Math.round(T * 0.36), Math.round(hw * 1.3), bh + 5, 5, ph, f, sb * 3);
      clump(g, sb * Math.round(hw * 0.35), 1, Math.round(hw * 1.2), Math.round(bh * 0.95), 3, ph + 2, f);
      clump(g, -sb * Math.round(hw * 0.65), 1, 5, Math.round(bh * 0.5), 2, ph + 4, f);
      clump(g, sb * Math.round(hw * 0.15), -Math.round(T * 0.88), 3, Math.round(bh * 0.45), 2, ph + 1, f);
    },
    (c) => {
      for (let k = 0; k < 6; k++) {
        const q = (t * 1.3 + k * 0.17) % 1, x = sb * (H(k) * 0.9) * (hw + 2) + Math.sin(q * 8 + k) * 2, y = -T * 0.35 - q * (T * 0.5 + 8);
        px(c, x, y, q < 0.35 ? FIRE[1] : q < 0.7 ? FIRE[2] : FIRE[4], 1 - q * 0.4);
      }
      for (let k = 0; k < 3; k++) {
        const q = (t + k / 3) % 1;
        ell(c, sb * 3 + Math.sin(q * 6 + k) * 2, -T - 4 - q * 16, 1.5 + q * 2.5, 1.2 + q * 2, SMOKE[q < 0.5 ? 1 : 2], { a: 0.6 * (1 - q * 0.6), dens: 0.85 * (1 - q) });
      }
    });
});

// ---- POISON (concept A): three sickly bubbles rising off the body, popping into specks ---
const poisonSprite = (hw, T, f) => memo(`poi|${hw}|${T}|${f}`, () => {
  const t = f / FX_N, k0 = Math.max(1, hw / 14);
  return bake(hw, T, null, (g) => {
    for (let k = 0; k < 3; k++) {
      const q = (t * 1 + k * 0.33) % 1, x = Math.round((k - 1) * 6 * k0 + Math.sin(q * 7 + k) * 1.2), y = -T * 0.55 - q * 14;
      if (q > 0.86) { for (const [dx, dy] of [[-2, -1], [2, -1], [0, -3], [0, 2]]) px(g, x + dx * 1.5, y + dy * 1.5, TOX[1]); continue; }
      ell(g, x, y, 4, 4, TOX[2]); ell(g, x + 0.5, y + 1, 2.4, 2.2, TOX[3], { a: 0.8 });
      px(g, x - 1, y - 1, TOX[0]); px(g, x - 2, y - 1, TOX[0]); px(g, x - 1, y - 2, TOX[0]); px(g, x, y - 1, TOX[1]);
    }
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

// ---- STUN (concept A): three gold stars wheeling round the crown ---------------------------
const stunSprite = (hw, T, f) => memo(`stn|${hw}|${T}|${f}`, () => {
  const t = f / FX_N, R = Math.max(9, Math.min(22, Math.round(hw * 0.8) + 4));
  const items = [];
  for (let k = 0; k < 3; k++) { const a = t * TAU + (k * TAU) / 3; items.push([Math.cos(a) * R, -T - 2 + Math.sin(a) * R * 0.31, Math.sin(a)]); }
  items.sort((p, q) => p[2] - q[2]);
  return bake(hw, T, null, (g) => { for (const [x, y] of items) star4(g, Math.round(x), Math.round(y), 3, [HOLY[1], HOLY[2], HOLY[3]]); });
});

// ---- ARMOR CRACK (concept A): a jagged split in the plate, a few chips dropping off ---------
const CRACK = [[0, -7], [-2, -4], [1, -2], [-2, 1], [1, 3], [-1, 6]];
const crackSprite = (hw, T, f) => memo(`crk|${hw}|${T}|${f}`, () => {
  const y = Math.round(-T * 0.48), K = Math.max(1, Math.min(2.2, T / 40)), pts = CRACK.map(([a, b]) => [a * K, b * K]), t = f / FX_N;
  return bake(hw, T, null, null, (c) => {
    c.save(); c.translate(0, y);
    jag(c, pts, 1, ICE[1], ICE[4]);
    jag(c, pts.map(([a, b]) => [a + 1, b]), 1, ICE[1]);
    for (let k = 0; k < 2; k++) { const q = (t + k * 0.5) % 1; px(c, (k ? 4 : -4) * K * 0.8, 3 * K + q * 10, k ? ICE[1] : ICE[2]); }
    c.restore();
  });
});

// ---- SHIELD PIPS (concept A): a small shield-blue pip per blow still owed, in a row --------
// (owner, 2026-11-21: "just a bit more vibrant": the pips' own blues, a step bluer than SH)
const PIP = ["..1..", ".111.", "12221", "12221", ".121.", "..3.."];
const PIPC = ["#eef6ff", "#8ebcec", "#4f80c6"];
const pipSprite = (n, flash) => memo(`pip|${n}|${flash ? 1 : 0}`, () => {
  const gap = 8, cw = n * gap + 6, ch = 12, ax = cw >> 1, ay = 6;
  const cv = mk(cw, ch), g = cv.getContext("2d", { willReadFrequently: true });
  for (let i = 0; i < n; i++) {
    const x0 = Math.round(ax + (i - (n - 1) / 2) * gap) - 2;
    stamp(g, PIP, flash ? { 1: "#fff", 2: PIPC[0], 3: PIPC[1] } : { 1: PIPC[0], 2: PIPC[1], 3: PIPC[2] }, x0, 2);
  }
  inkTint(cv, "#1c2a4c", 1);
  return { cv, ax, ay };
});

// ---- the entry points fx.js and enemies.js call ---------------------------------------------
// (ctx, foe, world time, ms, feet y, world headroom hr). Each is one blit.
// ---- BURN: the BODY'S OUTLINE burns (Round 5 B), with Dragonbreath's tongues (Round 18 A) --------------
// The figure's silhouette (its edge pixels) is read once per frame canvas (WeakMap) and the burn is
// baked once per (frame, step): a hot band along the edge with colours rolling round it (cooler round
// the face), a warm ground pool, a warm ring outside the back and a faint warm wash (all Round 5 B, the
// owner's pick), and the flames (Round 18 A, owner 2026-11-24: "A for fire on a foe looks great"): small
// tongues in Dragonbreath's look (flames.js drawBreath) pop up at top-edge spots in pairs, grow, let go
// at the root and rise off. No smoke. The face stays clear; a tongue lies over the body only at its
// root. Drawn over the figure, which is already on the canvas. Baked facing right; a left-facing foe
// stamps mirrored (so the tongues lean back against the walk). The loop is BN steps, baked and played
// alike (before 2026-11-24 it baked 12 and played 8, so the outline's roll jumped back each loop).
// enemies.js leaves the frame it drew on `e._rf` = { skin, ps, pf }; draw.js adds a firelight.
// Concept: concept/fx-r18-burn.js (row burn18).
const BN = 16;                                  // steps in the loop, at 12 a second
const MASKS = new WeakMap();
const maskOf = (s) => {
  let m = MASKS.get(s.cv); if (m) return m;
  const w = s.cv.width, h = s.cv.height, d = s.cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const ox = Math.round(s.ax * PX), oy = Math.round(s.ay * PX), G = new Uint8Array(w * h);
  let top = 1e9, xl = 1e9, xr = -1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { G[y * w + x] = 1; top = Math.min(top, y - oy); xl = Math.min(xl, x - ox); xr = Math.max(xr, x - ox); }
  if (xl > xr) { MASKS.set(s.cv, (m = { none: true })); return m; }
  const has = (x, y) => { x += ox; y += oy; return x >= 0 && y >= 0 && x < w && y < h && G[y * w + x] === 1; };
  const list = [], open = [], tops = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (G[y * w + x]) {
    const X = x - ox, Y = y - oy; list.push([X, Y]);
    if (!has(X - 1, Y) || !has(X + 1, Y) || !has(X, Y - 1) || !has(X, Y + 1)) open.push([X, Y]);
    if (!has(X, Y - 1)) tops.push([X, Y]);
  }
  m = { has, list, open, tops, top, xl, xr, T: Math.max(8, -top), cx: Math.round((xl + xr) / 2) };
  MASKS.set(s.cv, m); return m;
};
const FIFTH = (a) => Math.ceil(Math.min(1, Math.max(0, a)) * 5 - 1e-6) / 5;
const fr1 = (v) => v - Math.floor(v);
const cl1 = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const BFIRE = ["#fffbe0", "#ffe27a", "#ffb030", "#f26a1c", "#c03020"];   // Dragonbreath's tones (the tongues)
const BINK = "#8a2028";                                                  // its tinted rim, round a tongue's root
const cellP = (a, b, n) => H(((a % n) + n) % n, b);                      // hashed cells, periodic (the loop closes)
// a tongue: rises from (x0, y0), h tall, w half-width, `lean` px back per px up. One mottled mass (two layers of
// cells, 1x2 and 2x4 px, flowing up 2 px a step, periodic over BN), a broken pale core, a 1-px rim (wine at the
// root, red-orange above, plain orange on a thin one), ragged edges. lift: rows cut from the root as it lets go.
const tongue = (put, x0, y0, h, w, lean, f, sd, lift, hot) => {
  for (let j = lift; j <= h; j++) {
    const t = j / Math.max(1, h);
    const mid = x0 + lean * j * (0.35 + 0.65 * t) + Math.sin((TAU * 2 * f) / BN + sd + t * 3) * 0.9 * t;
    const hw = w * (t < 0.2 ? 0.72 + 1.4 * t : Math.pow((1 - t) / 0.8, 1.05));
    for (let X = Math.floor(mid - hw - 2); X <= Math.ceil(mid + hw + 2); X++) {
      const d = X + 0.5 - mid, ad = Math.abs(d), rows = Math.floor((j - 2 * f) / 2);
      const rag = cellP(rows, sd * 13 + (d < 0 ? 0 : 7) + 3, 16);
      const e = hw * (1 + (0.12 + 0.6 * t) * (rag * rag * 1.8 - 0.5)) + 0.35;
      if (ad > e) continue;
      const q = ad / Math.max(0.6, e);
      const mot = cellP(rows, Math.floor(d) + sd * 31 + 50, 16) * 0.6 + cellP(Math.floor((j - 2 * f) / 4), Math.floor(d / 2) + sd * 17 + 90, 8) * 0.4;
      const hh = (1 - q) * 0.42 + (1 - t) * 0.38 + (mot - 0.5) * 0.75 + hot + 0.1;
      let col = hh > 0.95 ? BFIRE[0] : hh > 0.76 ? BFIRE[1] : hh > 0.54 ? BFIRE[2] : hh > 0.34 ? BFIRE[3] : BFIRE[4];
      if (ad < 0.8 && t < 0.65 && mot > 0.4 && hw > 1.4) col = t < 0.3 ? BFIRE[0] : BFIRE[1];
      if (ad > e - 1 || j === h) col = hw < 1.3 ? BFIRE[3] : t < 0.22 ? BINK : BFIRE[4];
      else if (ad > e - 2 && t > 0.45 && bay(X + 64, y0 - j + 64) < 0.5) col = BFIRE[3];
      put(X, y0 - j, col, t);
    }
  }
};
const T_HS = [4, 7, 10, 11, 9, 6], T_WS = [1.6, 2.4, 3, 3.2, 2.8, 2];   // a tongue's height / half-width through its life
const burnBake = (m, f, view) => {
  const { T, cx, xl, xr, has } = m, t = f / BN, ph = t * TAU, amp = 0.9 + 0.1 * Math.sin(ph * 2), span = xr - xl, S = cl1(T / 35, 1, 1.7);
  const rx = Math.round(span * 0.8 + 16), x0 = Math.min(xl - 22, cx - rx - 1), x1 = Math.max(xr + 10, cx + rx + 1);
  const up = Math.round(T * 1.2 + 14), dn = 9, cw = x1 - x0 + 1, ch = up + dn, ax = -x0, ay = up;
  const cv = mk(cw, ch), c = cv.getContext("2d");
  c.translate(ax, ay);
  const free = (x, y, col, a = 1) => { if (!has(x, y)) px(c, x, y, col, a); };
  // the ground pool: stepped glow (fifths), dithered rim, never over the body
  for (let y = -6; y <= 8; y++) for (let x = -rx; x <= rx; x++) {
    const X = cx - 3 + x, r = Math.hypot(x / rx, (y - 1) / 7); if (r > 1) continue;
    const s = FIFTH((1 - r) * 1.6 * amp); if (s <= 0 || (s < 0.4 && bay(X, y) > s * 2.5)) continue;
    free(X, y, r < 0.35 ? FIRE[1] : FIRE[2], s * 0.55);
  }
  const isFace = view ? (x, y) => Math.abs(x - cx) < T * 0.2 && y < -T * 0.62 : (x, y) => x > cx + 1 && y < -T * 0.55;
  // the tongues: they pop up at top-edge spots (the face's left out), each with a smaller one a step behind it,
  // spread evenly round the loop (2-4 burning at once); over the body only in their lowest 30%, never over the face
  const put = (x, y, col, tt) => { if (has(x, y) && (tt > 0.3 || isFace(x, y))) return; if (isFace(x, y) && y > -T - 1) return; px(c, x, y, col); };
  const spots = m.tops.filter(([x, y]) => !isFace(x, y) && y < 0 && y > -T);
  if (spots.length) for (let k = 0; k < 9; k++) {
    const start = Math.floor((k * BN) / 9 + H(k, 7) * 1.5) % BN, age = (f - start + BN) % BN;
    if (age >= T_HS.length) continue;
    const [x, y] = spots[Math.floor(H(k, 3) * spots.length) % spots.length];
    const h = Math.round(T_HS[age] * S * (0.85 + 0.3 * H(k, 5))), lift = age === 4 ? 2 : age === 5 ? Math.round(h * 0.45) : 0, hot = age < 2 ? 0.08 : 0, rs = Math.sqrt(S);
    tongue(put, x - Math.round(2.5 * rs), y + 1, Math.round(h * 0.62), T_WS[age] * 0.72 * rs, -0.35, f, k + 40, Math.max(0, lift - 1), hot);
    tongue(put, x, y + 1, h, T_WS[age] * rs, -0.3, f, k + 1, lift, hot);
  }
  for (let k = 0; k < 3; k++) { const q = fr1(t + k / 3); px(c, cx - 6 - q * 8 + H(k, 1) * 6, -T * 0.4 - q * 22, q < 0.3 ? BFIRE[0] : q < 0.6 ? BFIRE[1] : q < 0.85 ? BFIRE[2] : BFIRE[4]); }
  // the edge pixels burn: a hot band, colours rolling round it; cooler and thinner round the face
  for (const [x, y] of m.open) {
    const v = (Math.sin(ph + x * 0.9 + y * 0.6) + Math.sin(ph * 2 - y * 0.7)) * 0.25 + 0.5 + (H(x, y) - 0.5) * 0.4;
    const s = v * (cl1(1 - -y / (T + 2)) * 0.5 + 0.5) * (isFace(x, y) ? 0.55 : 1);
    px(c, x, y, s > 0.62 ? FIRE[0] : s > 0.45 ? FIRE[1] : s > 0.3 ? FIRE[2] : FIRE[3]);
  }
  // a second warm ring just outside on the back side
  for (const [x, y] of m.list) { if (has(x - 1, y) || x > cx) continue; px(c, x - 1, y, bay(x + 64, y + 64) < 0.6 * amp ? FIRE[1] : FIRE[2], 0.8); if (bay(x + 66, y + 64) < 0.5 * amp && !has(x - 2, y)) px(c, x - 2, y, FIRE[3], 0.6); }
  // a warm wash on the lower body (the flames below light it), dithered
  for (const [x, y] of m.list) { const k = cl1(1 - -y / (T * 0.7)); if (k > 0 && bay(x + (f & 1), y) < FIFTH(k * 0.35 * amp)) px(c, x, y, FIRE[3], 0.28); }
  return { cv, ax, ay };
};
// bakes are a few ms each in a crowd's first second: cap the new ones a frame (the rest wait a frame).
// The bakes are kept per frame canvas, least recently used dropped first, to BURN_BUDGET bytes and 500 canvases.
const BURNS = new Map();
const BURN_BUDGET = 24 * 1024 * 1024;
let burnBytes = 0, bakedAt = -1, bakedN = 0, burnBakes = 0, burnMs = 0;
const dropOldest = () => { const k = BURNS.keys().next().value, per = BURNS.get(k); BURNS.delete(k); for (const s of per) if (s) burnBytes -= s.cv.width * s.cv.height * 4; };
export const burnStats = () => ({ frames: BURNS.size, bytes: burnBytes, bakes: burnBakes, ms: burnMs });
export const statusBurn = (ctx, e, time, feet, hr) => {
  const rf = e._rf, sf = rf && rigFrame(rf.skin, rf.ps, rf.pf, "");
  if (time !== bakedAt) { bakedAt = time; bakedN = 0; }
  // a silhouette read or a bake each count against this frame's budget; past it the old mark stands in
  const m = sf && sf.cv ? (MASKS.has(sf.cv) ? MASKS.get(sf.cv) : bakedN < 2 ? (bakedN++, maskOf(sf)) : null) : null;
  if (sf && !m) return;                        // over this frame's budget: no fire for a frame or two (the old mark would flash)
  if (m && !m.none) {
    const f = ((Math.floor(time * 12 + (e.id || 0) * 3) % BN) + BN) % BN, view = isViewSheet(rf.ps), key = sf.cv, slot = f + (view ? BN : 0);
    let per = BURNS.get(key);
    if (per) { BURNS.delete(key); BURNS.set(key, per); }          // most recently used last
    else { per = []; BURNS.set(key, per); if (BURNS.size > 500) dropOldest(); }
    let s = per[slot];
    if (!s && bakedN < 2) {
      bakedN++; const t0 = performance.now(); s = per[slot] = burnBake(m, f, view); burnMs += performance.now() - t0; burnBakes++;
      burnBytes += s.cv.width * s.cv.height * 4; while (burnBytes > BURN_BUDGET && BURNS.size > 1 && BURNS.keys().next().value !== key) dropOldest();
    }
    if (s) {
      const X = Math.round(e.x * PX) / PX, Y = Math.round(feet * PX) / PX, flip = e.face < 0 && !view;
      ctx.save(); ctx.translate(X, Y); if (flip) ctx.scale(-1, 1);
      ctx.drawImage(s.cv, -s.ax / PX, -s.ay / PX, s.cv.width / PX, s.cv.height / PX);
      ctx.restore();
    }
    return;
  }
  stampAt(ctx, burnSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 10), e.face < 0 ? 1 : -1), e.x, feet);
};
export const statusPoison = (ctx, e, time, feet, hr) => stampAt(ctx, poisonSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 8)), e.x, feet);
// ---- SLOW, Round 6 pick C (owner): COLD MIST ------------------------------------------------------
// Baked like the burn above (same silhouette masks, own bake counter, 2 a frame), 6 steps, per frame canvas,
// per strength (1-3) and per view. A dithered blue-white vapour 1-4 px out from the body, heavier on the back
// and low down, wisps trailing behind the walk and sinking, a faint pool at the feet no wider than them,
// edge glints, a very faint rim. Nothing over the crown. Lifted one step from the concept's middle level
// (owner: "faint at board size"). Baked facing right; a left-facing foe stamps mirrored.
const MN = 6;
const MICE = ["#f4fbff", "#cfeeff", "#9ad4f0", "#5fa8d8", "#3a6fb0"];
const MGROW = [{ amp: 1.2, n: 9, g: 3 }, { amp: 1.7, n: 14, g: 4 }, { amp: 2.3, n: 20, g: 6 }];
const MISTS = new Map();
let mistBytes = 0, mistAt = -1, mistN = 0;
export const mistStats = () => ({ keys: MISTS.size, bytes: mistBytes });
const MIST_BUDGET = 20 * 1024 * 1024;
const mistBake = (m, f, view, lv) => {
  const { T, cx, xl, xr, has } = m, t = f / MN, ph = t * TAU, g = MGROW[lv - 1], A = g.amp;
  const x0 = xl - 20, x1 = xr + 8, up = T + 4, dn = 8, cw = x1 - x0 + 1, ch = up + dn, ax = -x0, ay = up;
  const cv = mk(cw, ch), c = cv.getContext("2d");
  c.translate(ax, ay);
  const free = (x, y, col, a = 1) => { if (!has(x, y)) px(c, x, y, col, a); };
  const isFace = view ? (x, y) => Math.abs(x - cx) < T * 0.2 && y < -T * 0.62 : (x, y) => x > cx + 1 && y < -T * 0.55;
  // a faint pool at the feet, no wider than the feet
  const rx = Math.max(3, Math.round((xr - xl) / 2) - 1);
  for (let y = -1; y <= 4; y++) for (let x = -rx; x <= rx; x++) { const r = Math.hypot(x / rx, (y - 1.5) / 3.2); if (r > 1) continue; if (bay(x + f, y) < FIFTH((1 - r) * 0.9 * A) * 0.8) free(x + cx, y, r < 0.5 ? MICE[1] : MICE[2], 0.55); }
  // the vapour round the body
  const out = new Map();
  for (const [x, y] of m.open) for (let dx = -4; dx <= 2; dx++) for (let dy = -2; dy <= 4; dy++) {
    const X = x + dx, Y = y + dy; if (has(X, Y)) continue;
    const d = Math.max(Math.abs(dx), Math.abs(dy)) + (dx && dy ? 0.5 : 0); if (d > 4) continue;
    const k = X * 4096 + Y, o = out.get(k); if (!o || o[2] > d) out.set(k, [X, Y, d]);
  }
  for (const [X, Y, d] of out.values()) {
    if (isFace(X, Y) || Y < -T + 2) continue;
    const back = X < cx ? 1 : 0.8, lowK = 0.5 + 0.5 * cl1(1 - -Y / T), dens = 0.55 + 0.45 * Math.sin(Y * 0.5 - ph * 2 + X * 0.3);
    if (bay(X + f, Y) < dens * back * lowK * A * (1.25 - d * 0.22)) px(c, X, Y, d < 1.6 ? MICE[0] : d < 2.6 ? MICE[1] : d < 3.4 ? MICE[2] : MICE[3], 0.95 - d * 0.08);
  }
  // wisps trail behind the walk and sink
  const edges = m.open.filter(([x, y]) => x <= cx + 3 && !isFace(x, y));
  if (edges.length) for (let k = 0; k < g.n + 4; k++) {
    const q = fr1(t + H(k, 2)), p0 = edges[Math.floor(H(k, 5) * edges.length) % edges.length];
    const x = p0[0] - 2 - q * 11 + Math.sin(q * 5 + k) * 1.5, y = Math.min(2, p0[1] + q * 13), r = 1 + q * 1.8;
    for (let yy = -2; yy <= 2; yy++) for (let xx = -3; xx <= 3; xx++) if ((xx * xx) / 2 + yy * yy <= r * r && bay(xx + k, yy + f) < 0.9 * (1 - q)) free(Math.round(x + xx), Math.round(y + yy), q < 0.45 ? MICE[0] : q < 0.75 ? MICE[1] : MICE[2], 1 - q * 0.4);
  }
  // glints on the edge: a plus that blinks for two steps
  const gl = m.open.filter(([x, y]) => !isFace(x, y));
  if (gl.length) for (let k = 0; k < g.g; k++) {
    const start = Math.floor(H(k, 6) * MN), age = (f - start + MN) % MN; if (age > 2) continue;
    const [x, y] = gl[Math.floor(H(k, 1) * gl.length) % gl.length];
    px(c, x, y, MICE[0]); if (age === 1) { free(x - 1, y, MICE[1]); free(x + 1, y, MICE[1]); free(x, y - 1, MICE[1]); free(x, y + 1, MICE[1]); }
  }
  // a very faint rim: pale on the sunlit (top-left) edges, a tinted blue line low on the shaded ones
  for (const [x, y] of m.open) {
    const sun = (!has(x - 1, y) || !has(x, y - 1)) ? 1 : 0.45, face = isFace(x, y) ? 0.6 : 1;
    const s = FIFTH(A * 0.22 * 1.25 * sun * face * (0.88 + 0.22 * Math.sin(ph + x * 0.8 + y * 0.5)));
    if (s > 0.6) px(c, x, y, MICE[1], 0.9); else if (s > 0.4) px(c, x, y, MICE[2], 0.8); else if (s > 0.2) px(c, x, y, MICE[3], 0.7);
  }
  return { cv, ax, ay };
};
export const statusSlow = (ctx, e, time, feet, hr, lv = 2) => {
  const rf = e._rf, sf = rf && rigFrame(rf.skin, rf.ps, rf.pf, "");
  if (time !== mistAt) { mistAt = time; mistN = 0; }
  if (!(sf && sf.cv)) return void stampAt(ctx, slowSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 6)), e.x, feet);
  const m = MASKS.has(sf.cv) ? MASKS.get(sf.cv) : mistN < 2 ? (mistN++, maskOf(sf)) : null;
  if (!m) return;
  if (m.none) return void stampAt(ctx, slowSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 6)), e.x, feet);
  lv = Math.max(1, Math.min(3, lv));
  const f = frameOf(time, e.id || 0, MN) % MN, view = isViewSheet(rf.ps), key = sf.cv, slot = ((lv - 1) * 2 + (view ? 1 : 0)) * MN + f;
  let per = MISTS.get(key); if (!per) { per = []; MISTS.set(key, per); }
  let s = per[slot];
  if (!s && mistN < 2) {
    mistN++; s = per[slot] = mistBake(m, f, view, lv); mistBytes += s.cv.width * s.cv.height * 4;
    while (mistBytes > MIST_BUDGET && MISTS.size > 1) {      // over the memory cap: drop the oldest figure frame's mists
      const [k0, v0] = MISTS.entries().next().value; if (k0 === key) break;
      for (const q of v0) if (q) mistBytes -= q.cv.width * q.cv.height * 4;
      MISTS.delete(k0);
    }
  }
  if (!s) return;
  const X = Math.round(e.x * PX) / PX, Y = Math.round(feet * PX) / PX, flip = e.face < 0 && !view;
  ctx.save(); ctx.translate(X, Y); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(s.cv, -s.ax / PX, -s.ay / PX, s.cv.width / PX, s.cv.height / PX);
  ctx.restore();
};
// ---- SLOW, the PLAIN kind, Round 21 pick A (owner, 2026-11-27): DUST AND DRAG ------------------------------------
// Every slow that is not frost (traps, caltrops, Hamstringer, Earthshaker, Harpooners, the Moon Prism, the War Horn,
// logs, Osric). The foe is hobbled: patchy pale road dust on the LOWER body only, flakes of it sifting off the shins,
// and on a side walk grit kicked back off the trailing heel every step (more off the lame foot, push-offs on walk
// frames 2 and 6). Nothing above the waist, nothing over the crown, nothing on the ground wider than the feet.
// Baked like the mist (per frame canvas, strength 1-3, view, 6 steps for the flakes; own counter, 2 bakes a frame,
// own budget). The frame canvas is unique to its walk frame, so the grit baked with it follows the stride. Baked
// facing right; a left-facing foe stamps mirrored. The concept's 1-px dip on the lame step is left out (it never read).
// Concept: concept/fx-r21-a.js (row slow21).
const DN = 6;
const DIRT = ["#e6dab6", "#c6b186", "#9c8862", "#6c5c44", "#433a2c"];   // greyed khaki, apart from leather and fire
const DGROW = [{ reach: 0.12, cap: 6, grit: 4, drift: 2 }, { reach: 0.2, cap: 9, grit: 6, drift: 4 }, { reach: 0.3, cap: 13, grit: 8, drift: 6 }];   // cap: art px, so a troll gets dusty shins, not a dusty belly
const DUSTS = new Map();
let dustBytes = 0, dustAt = -1, dustN = 0;
export const dustStats = () => ({ keys: DUSTS.size, bytes: dustBytes });
const DUST_BUDGET = 12 * 1024 * 1024;
const dustBake = (m, f, view, lv, pf, walk) => {
  const { T, xl, xr, has } = m, g = DGROW[lv - 1], t = f / DN;
  const x0 = xl - 14, x1 = xr + 4, up = T + 2, dn = 3, cw = x1 - x0 + 1, ch = up + dn, ax = -x0, ay = up;
  const cv = mk(cw, ch), c = cv.getContext("2d");
  c.translate(ax, ay);
  const top = -Math.round(Math.min(T * g.reach, g.cap));        // the dust climbs to here
  // 1. dust on the legs, PATCHY: mottled 2x2 patches, thick at the soles, thinning to nothing at the top line; the legs'
  //    own colour shows between them, the figure's line is kept (bar its sunward side)
  for (const [x, y] of m.list) {
    if (y < top) continue;
    if ((!has(x - 1, y) || !has(x + 1, y) || !has(x, y + 1)) && has(x - 1, y)) continue;
    const d = (y - top) / (-top + 1), patch = H(Math.floor((x + 1) / 2), Math.floor((y + 1) / 2) + 17);
    if (patch > 0.4 + d * 0.5) continue;
    px(c, x, y, !has(x - 1, y) || !has(x - 1, y - 1) || patch < 0.18 ? DIRT[0] : DIRT[1], 0.92);
  }
  // 2. dust sifting off the shins: 2-px flakes leaving the legs' edges, falling and drifting back
  const shin = m.open.filter(([x, y]) => y >= top - 3 && y <= -3 && (!has(x - 1, y) || !has(x + 1, y)));
  for (let k = 0; k < g.drift && shin.length; k++) {
    const q = fr1(t * 2 + H(k, 21)), [sx, sy] = shin[Math.floor(H(k, 23) * shin.length) % shin.length];
    const side = has(sx - 1, sy) ? 1 : -1, x = Math.round(sx + side * (1 + q * 2)), y = Math.round(sy + q * 3);
    if (y > 0 || has(x, y)) continue;
    px(c, x, y, q < 0.5 ? DIRT[0] : DIRT[1], 1 - q * 0.4); px(c, x, y + 1, DIRT[2], 0.9 - q * 0.4);
  }
  // 3 + 4. on a side walk: grit kicked off the trailing heel and a scuff at each push-off (walk frames 2 and 6, the
  //    first the lame foot's), kept within the feet's width behind the heel
  if (walk && !view) {
    const runs = (y) => { const out = []; let st = null; for (let x = xl - 1; x <= xr + 1; x++) { const h = has(x, y); if (h && st === null) st = x; if (!h && st !== null) { out.push([st, x - 1]); st = null; } } return out; };
    const r0 = runs(0).length ? runs(0) : runs(-1), hx = r0.length ? r0[0][0] : xl;
    const fw = r0.length ? Math.max(6, r0[r0.length - 1][1] - r0[0][0] + 1) : 8;
    const a8 = (pf - 2 + 8) % 8, lame = a8 < 4, age = (a8 % 4) * 1.5;   // in the concept's cell units (12 a stride)
    if (age <= 3) {
      const n = lame ? g.grit : g.grit - 2;
      for (let k = 0; k < n; k++) {
        const kk = k + (lame ? 0 : 40), vx = 0.9 + H(kk, 2) * 1.2, vy = 2.3 + H(kk, 5) * 1.3, tt = age + 0.7 + H(kk, 8) * 0.5;
        const x = Math.max(hx - fw, Math.round(hx - 1 - vx * tt)), y = Math.round(-1 - vy * tt + 0.75 * tt * tt);
        if (y > -1) continue;
        if (lame && age < 3) { px(c, x, y, DIRT[0]); px(c, x + 1, y, DIRT[1]); px(c, x, y + 1, DIRT[2]); px(c, x + 1, y + 1, DIRT[3]); }
        else if (H(kk, 9) > 0.5) { px(c, x, y, DIRT[0]); px(c, x + 1, y, DIRT[2]); }
        else { px(c, x, y, DIRT[0]); px(c, x, y + 1, DIRT[2]); }
      }
    }
    if (age <= (lame ? 2 : 1)) {
      const w0 = lame ? 4 : 2, k0 = lame ? 0.85 : 0.6, ag = Math.round(age);
      for (let x = hx - w0 + ag; x <= hx + 2 - ag; x++) for (let y = -1; y <= 0; y++) {
        const a = (k0 - age * 0.25) * (y === 0 ? 1 : 0.5);
        if (bay(x + pf * 3, y) < a && !has(x, y)) px(c, x, y, y === 0 ? DIRT[1] : DIRT[0], 0.9);
      }
    }
  }
  return { cv, ax, ay };
};
export const statusDust = (ctx, e, time, feet, hr, lv = 2) => {
  const rf = e._rf, sf = rf && rigFrame(rf.skin, rf.ps, rf.pf, "");
  if (time !== dustAt) { dustAt = time; dustN = 0; }
  if (!(sf && sf.cv)) return;                                   // a figure with no frame to read: no dust
  const m = MASKS.has(sf.cv) ? MASKS.get(sf.cv) : dustN < 2 ? (dustN++, maskOf(sf)) : null;
  if (!m || m.none) return;
  lv = Math.max(1, Math.min(3, lv));
  const f = frameOf(time, e.id || 0, DN) % DN, view = isViewSheet(rf.ps), key = sf.cv, slot = ((lv - 1) * 2 + (view ? 1 : 0)) * DN + f;
  let per = DUSTS.get(key); if (!per) { per = []; DUSTS.set(key, per); }
  let s = per[slot];
  if (!s && dustN < 2) {
    dustN++; s = per[slot] = dustBake(m, f, view, lv, rf.pf | 0, /walk/i.test(rf.ps || "")); dustBytes += s.cv.width * s.cv.height * 4;
    while (dustBytes > DUST_BUDGET && DUSTS.size > 1) {         // over the memory cap: drop the oldest figure frame's dust
      const [k0, v0] = DUSTS.entries().next().value; if (k0 === key) break;
      for (const q of v0) if (q) dustBytes -= q.cv.width * q.cv.height * 4;
      DUSTS.delete(k0);
    }
  }
  if (!s) return;
  const X = Math.round(e.x * PX) / PX, Y = Math.round(feet * PX) / PX, flip = e.face < 0 && !view;
  ctx.save(); ctx.translate(X, Y); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(s.cv, -s.ax / PX, -s.ay / PX, s.cv.width / PX, s.cv.height / PX);
  ctx.restore();
};
export const statusMist = (ctx, e, time, feet, hr, hwWorld) => stampAt(ctx, mistSprite(bucketHW(hwWorld || e.size), bucketT(hr), frameOf(time, e.id || 0, 6)), e.x, feet);
export const statusStun = (ctx, e, time, feet, hr) => {
  const f = frameOf(time, e.id || 0, 16);
  stampAt(ctx, stunSprite(bucketHW(e.size), bucketT(hr), f), e.x + ((f >> 1) & 1 ? 0.5 : -0.5), feet);
};
export const statusCrack = (ctx, e, time, feet, hr) => stampAt(ctx, crackSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 6)), e.x, feet);
// the shield: pips ON the health bar's line, `mid` = the bar's middle in world units (owner,
// 2026-11-21: under the bar they hid in the head). Drawn over the bar, whose health cannot move
// while a pip stands (steel is swallowed whole, magic and burns glance off). The row's middle
// sits 1 art px above the sprite's anchor, hence the half unit.
export const statusShield = (ctx, e, time, tms, mid) => {
  stampAt(ctx, pipSprite(Math.max(1, Math.min(4, Math.ceil(e.guard))), e.guardFlash > tms), e.x, mid + 0.5);
};

// ---- PHYSICAL HIT (concept B): a hard white pop, steel and ember sparks flung out, a slash, dust ----
const STEEL = ["#f2f4f8", "#b4bac6", "#7e8694", "#4a505e"];
export const HIT_N = 4;
const hitSprite = (f) => memo(`hit|${f}`, () => {
  const cw = 44, ax = 22, ay = 22, cv = mk(cw, cw), c = cv.getContext("2d");
  c.translate(ax, ay);
  const d = 5 + f * 5, L = [13, 18, 11, 0][f];
  if (L) { line(c, -7, -8, -7 + L, -8 + L * 0.9, STEEL[0]); line(c, -6, -8, -6 + L, -8 + L * 0.9, STEEL[1], 0.7); }
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.3; px(c, Math.cos(a) * d, Math.sin(a) * d, k % 2 ? STEEL[0] : FIRE[1]); if (f < 2) px(c, Math.cos(a) * (d + 1.2), Math.sin(a) * (d + 1.2), k % 2 ? STEEL[2] : FIRE[3]); }
  if (f === 0) { c.fillStyle = "#fff"; c.fillRect(-3, -3, 6, 6); }
  const q = f / 3;
  for (let k = 0; k < 3; k++) px(c, 5 + k * 3 + q * 4, 3 + q * q * 18 + k, DUST[2 - (k & 1)]);
  ell(c, 0, 10, 6 + f * 3, 2 + f, DUST[1], { a: 0.5 - f * 0.1, dens: 0.5 });
  return { cv, ax, ay };
});
export const drawHit = (ctx, fx, life) => {
  const p = 1 - fx.ttl / life;
  if (p >= 1) return;
  stampAt(ctx, hitSprite(Math.min(HIT_N - 1, Math.floor(p * HIT_N))), fx.x, fx.y);
};

// ---- DEATH POOF (concept B): a soft shadow, grey smoke puffs, dust and a wisp, under/over the crumble ----
export const DEATH_N = 8;
const deathSprite = (hw, T, f) => memo(`dth|${hw}|${T}|${f}`, () => {
  const p = (f + 0.5) / DEATH_N;
  return bake(hw, T, null, null, (c) => {
    ell(c, 0, 1, hw + 4 + p * 8, 3.5 + p * 2, "#000", { a: 0.2 * (1 - p), dens: 0.7 });
    if (p > 0.1 && p < 0.97) for (let k = 0; k < 4; k++) {
      const q = Math.min(1, Math.max(0, (p - 0.1 - k * 0.04) / 0.8));
      ell(c, (k - 1.5) * (hw * 0.4 + 2) + Math.sin(q * 5 + k) * 3, -T * 0.35 - q * 14, 4.5 + q * 6, 3.5 + q * 5, SMOKE[q < 0.4 ? 0 : 1], { a: 0.9 * (1 - q * 0.8), dens: 1 - q * 0.4 });
    }
    if (p > 0.2 && p < 0.97) {
      const q = (p - 0.2) / 0.75;
      ell(c, 0, 1, 5 + q * 14, 2 + q * 5, DUST[1], { a: 0.5 * (1 - q), dens: 0.5 });
      const y = -T * 0.6 - q * 22, x = Math.sin(q * 6) * 3;
      px(c, x, y, "#dff4ff"); px(c, x, y + 1, "#9fd4e8", 0.7); px(c, x, y + 2, "#9fd4e8", 0.4);
    }
  });
});
// feet = the foe's ground line, size = its world size; prog 0..1 of the death
export const drawDeathPoof = (ctx, fx, feet, size, prog) => {
  stampAt(ctx, deathSprite(bucketHW(size), bucketT(size * 1.5), Math.min(DEATH_N - 1, Math.floor(prog * DEATH_N))), fx.x, feet);
};
