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
const PIP = ["..1..", ".111.", "12221", "12221", ".121.", "..3.."];
const pipSprite = (n, flash) => memo(`pip|${n}|${flash ? 1 : 0}`, () => {
  const gap = 8, cw = n * gap + 6, ch = 12, ax = cw >> 1, ay = 6;
  const cv = mk(cw, ch), g = cv.getContext("2d", { willReadFrequently: true });
  for (let i = 0; i < n; i++) {
    const x0 = Math.round(ax + (i - (n - 1) / 2) * gap) - 2;
    stamp(g, PIP, flash ? { 1: "#fff", 2: SH[0], 3: SH[1] } : { 1: SH[0], 2: SH[1], 3: SH[2] }, x0, 2);
  }
  inkTint(cv, "#1c2a4c", 1);
  return { cv, ax, ay };
});

// ---- the entry points fx.js and enemies.js call ---------------------------------------------
// (ctx, foe, world time, ms, feet y, world headroom hr). Each is one blit.
// ---- BURN, Round 5 option B (owner's pick): the BODY'S OUTLINE burns ----------------------------------
// The figure's silhouette (its edge pixels) is read once per frame canvas (WeakMap) and the burn is
// baked once per (frame, step): a hot band along the edge with colours rolling round it (cooler
// round the face), small flames popping up at edge spots and going out, smoke trailing behind, a warm
// ground pool and a faint warm wash. Drawn over the figure, which is already on the canvas; the glow
// and smoke skip the body's own pixels. Baked facing right; a left-facing foe stamps mirrored.
// enemies.js leaves the frame it drew on `e._rf` = { skin, ps, pf }; draw.js adds a firelight.
const BN = 12;                                  // steps in the loop
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
const BSMOKE = ["#8a7a76", "#6a5c60", "#4a3e44"];
// a small flame: teardrop that leans and sways, hot core, darker tinted edge
const lick = (c, cx, by, h, w, lean, ph) => {
  for (let j = 0; j < h; j++) {
    const t = j / h, hw = Math.max(0, Math.round(w * Math.pow(1 - t, 0.75) * (1 + 0.15 * Math.sin(ph * 2 + t * 5))));
    const mid = cx + lean * t * t * h * 0.35 + Math.sin(ph + t * 3.2) * 1.3 * t;
    for (let q = -hw; q <= hw; q++) {
      const heat = (1 - Math.abs(q) / (hw + 0.8)) * (1 - t * 0.85), edge = Math.abs(q) === hw && hw > 0 && j > 0;
      px(c, mid + q, by - j, edge ? (t < 0.55 ? FIRE[4] : FIRE[3]) : heat > 0.62 ? FIRE[0] : heat > 0.42 ? FIRE[1] : heat > 0.22 ? FIRE[2] : FIRE[3]);
    }
  }
};
const burnBake = (m, f, view) => {
  const { T, cx, xl, xr, has } = m, t = f / BN, ph = t * TAU, amp = 0.9 + 0.1 * Math.sin(ph * 2), span = xr - xl;
  const rx = Math.round(span * 0.8 + 16), x0 = Math.min(xl - 22, cx - rx - 1), x1 = Math.max(xr + 10, cx + rx + 1);
  const up = Math.round(T * 1.2 + 8), dn = 9, cw = x1 - x0 + 1, ch = up + dn, ax = -x0, ay = up;
  const cv = mk(cw, ch), c = cv.getContext("2d");
  c.translate(ax, ay);
  const free = (x, y, col, a = 1) => { if (!has(x, y)) px(c, x, y, col, a); };
  // the ground pool: stepped glow (fifths), dithered rim, never over the body
  for (let y = -6; y <= 8; y++) for (let x = -rx; x <= rx; x++) {
    const X = cx - 3 + x, r = Math.hypot(x / rx, (y - 1) / 7); if (r > 1) continue;
    const s = FIFTH((1 - r) * 1.6 * amp); if (s <= 0 || (s < 0.4 && bay(X, y) > s * 2.5)) continue;
    free(X, y, r < 0.35 ? FIRE[1] : FIRE[2], s * 0.55);
  }
  // smoke trailing behind (left), drifting up in dithered puffs
  for (let k = 0; k < 5; k++) {
    const q = fr1(t + k / 5), x = xl - 2 - q * 16 + Math.sin(q * 6 + k) * 2, y = -T * 0.55 - q * T * 0.6, r = 2 + q * 3;
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r && bay(xx + k * 3 + 64, yy + 64) < 0.75 * (1 - q)) free(Math.round(x + xx), Math.round(y + yy), BSMOKE[q < 0.5 ? 0 : 1], 0.55 * (1 - q * 0.5));
  }
  // the edge pixels burn: a hot band, colours rolling round it; cooler and thinner round the face
  const isFace = view ? (x, y) => Math.abs(x - cx) < T * 0.2 && y < -T * 0.62 : (x, y) => x > cx + 1 && y < -T * 0.55;
  for (const [x, y] of m.open) {
    const v = (Math.sin(ph + x * 0.9 + y * 0.6) + Math.sin(ph * 2 - y * 0.7)) * 0.25 + 0.5 + (H(x, y) - 0.5) * 0.4;
    const s = v * (cl1(1 - -y / (T + 2)) * 0.5 + 0.5) * (isFace(x, y) ? 0.55 : 1);
    px(c, x, y, s > 0.62 ? FIRE[0] : s > 0.45 ? FIRE[1] : s > 0.3 ? FIRE[2] : FIRE[3]);
  }
  // a second warm ring just outside on the back side
  for (const [x, y] of m.list) { if (has(x - 1, y) || x > cx) continue; px(c, x - 1, y, bay(x + 64, y + 64) < 0.6 * amp ? FIRE[1] : FIRE[2], 0.8); if (bay(x + 66, y + 64) < 0.5 * amp && !has(x - 2, y)) px(c, x - 2, y, FIRE[3], 0.6); }
  // a warm wash on the lower body (the flames below light it), dithered
  for (const [x, y] of m.list) { const k = cl1(1 - -y / (T * 0.7)); if (k > 0 && bay(x + (f & 1), y) < FIFTH(k * 0.35 * amp)) px(c, x, y, FIRE[3], 0.28); }
  // small flames pop up at random top-edge spots and go out (four steps each); the face stays clear
  const spots = m.tops.filter(([x, y]) => !isFace(x, y) && y < 0 && y > -T);
  if (spots.length) for (let k = 0; k < 9; k++) {
    const start = Math.floor(H(k, 7) * BN), age = (f - start + BN) % BN;
    if (age > 3) continue;
    const [x, y] = spots[Math.floor(H(k, 3) * spots.length) % spots.length];
    lick(c, x, y, [4, 7, 9, 4][age], age === 3 || age === 0 ? 1 : 2, -0.3, k + age);
  }
  for (let k = 0; k < 3; k++) { const q = fr1(t + k / 3); px(c, cx - 6 - q * 8 + H(k, 1) * 6, -T * 0.4 - q * 22, q < 0.35 ? FIRE[1] : q < 0.7 ? FIRE[2] : FIRE[4]); }
  return { cv, ax, ay };
};
// bakes are a few ms each in a crowd's first second: cap the new ones a frame (the rest wait a frame)
const BURNS = new Map();
let bakedAt = -1, bakedN = 0;
export const statusBurn = (ctx, e, time, feet, hr) => {
  const rf = e._rf, sf = rf && rigFrame(rf.skin, rf.ps, rf.pf, "");
  if (time !== bakedAt) { bakedAt = time; bakedN = 0; }
  // a silhouette read or a bake each count against this frame's budget; past it the old mark stands in
  const m = sf && sf.cv ? (MASKS.has(sf.cv) ? MASKS.get(sf.cv) : bakedN < 2 ? (bakedN++, maskOf(sf)) : null) : null;
  if (sf && !m) return;                        // over this frame's budget: no fire for a frame or two (the old mark would flash)
  if (m && !m.none) {
    const f = frameOf(time, e.id || 0, 12) % BN, view = isViewSheet(rf.ps), key = sf.cv, slot = f + (view ? BN : 0);
    let per = BURNS.get(key); if (!per) { per = []; BURNS.set(key, per); if (BURNS.size > 500) BURNS.delete(BURNS.keys().next().value); }
    let s = per[slot];
    if (!s && bakedN < 2) { bakedN++; s = per[slot] = burnBake(m, f, view); }
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
export const statusSlow = (ctx, e, time, feet, hr) => stampAt(ctx, slowSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 6)), e.x, feet);
export const statusMist = (ctx, e, time, feet, hr, hwWorld) => stampAt(ctx, mistSprite(bucketHW(hwWorld || e.size), bucketT(hr), frameOf(time, e.id || 0, 6)), e.x, feet);
export const statusStun = (ctx, e, time, feet, hr) => {
  const f = frameOf(time, e.id || 0, 16);
  stampAt(ctx, stunSprite(bucketHW(e.size), bucketT(hr), f), e.x + ((f >> 1) & 1 ? 0.5 : -0.5), feet);
};
export const statusCrack = (ctx, e, time, feet, hr) => stampAt(ctx, crackSprite(bucketHW(e.size), bucketT(hr), frameOf(time, e.id || 0, 6)), e.x, feet);
// the shield: pips at the crown (just under the health bar)
export const statusShield = (ctx, e, time, tms, feet, hr) => {
  stampAt(ctx, pipSprite(Math.max(1, Math.min(4, Math.ceil(e.guard))), e.guardFlash > tms), e.x, feet - hr + 3);
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
