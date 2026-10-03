// ============ WEATHER ART (the bakes) ============
// Everything the weather painters (render/weatherfx.js) stamp, painted art
// pixel by art pixel ONCE and memo'd: the big washes as dithered, stepped
// layers (fog banks, blowing snow, ash, storm-cloud shadow), the falling
// things as small sheets drawn through canvas patterns (rain, snow, ash), and
// the sprites (bolts, puddles, splashes, mist lobes, wisps, faces, frost,
// boulders, smoke, flame tongues, impact bursts, daze stars, toast icons).
//
// Two grains:
//   * layers are 1 texel per world unit (fog, mist) or 2 (snow drifts, ash,
//     cloud shadow) and drawn with smoothing off, so a dither reads as a
//     chunky 2x2 pixel step at 1x — tones change in stepped bands and only
//     their EDGES are dithered (never a screen-door over the whole board).
//   * sprites are PX art pixels per unit like the rest of the game (paint.js).
// Layers that drift are periodic in x (and y where they scroll that way), so
// they wrap without a seam. Nothing here runs per frame except the memo look-up.

import { W, H } from "../data/constants.js";
import { PX } from "./paint.js";

// ---- pixels ----------------------------------------------------------------
const CC = {};
export const C = (h) => CC[h] || (CC[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
export const INK = C("#241a26");
export const mk = (w, h) => { const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h)); return cv; };
export const grid = (w, h) => {
  const cv = mk(w, h), W2 = cv.width, H2 = cv.height;
  const c = cv.getContext("2d", { willReadFrequently: true });
  const img = c.createImageData(W2, H2), d = img.data;
  const set = (x, y, k, a = 255) => {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= W2 || y >= H2) return;
    if (typeof k === "string") k = C(k);
    const i = (y * W2 + x) * 4;
    d[i] = k[0]; d[i + 1] = k[1]; d[i + 2] = k[2]; d[i + 3] = a;
  };
  // set only where nothing stronger is
  const add = (x, y, k, a = 255) => { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W2 || y >= H2) return; if (d[(y * W2 + x) * 4 + 3] < a) set(x, y, k, a); };
  const al = (x, y) => (x < 0 || y < 0 || x >= W2 || y >= H2 ? 0 : d[(y * W2 + x) * 4 + 3]);
  // ink round the silhouette (4-neighbours of solid pixels), `passes` deep
  const done = (ink = null, passes = 1, solid = 128) => {
    for (let p = 0; p < (ink ? passes : 0); p++) {
      const hit = [];
      for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
        if (al(x, y) >= solid) continue;
        if (al(x - 1, y) >= solid || al(x + 1, y) >= solid || al(x, y - 1) >= solid || al(x, y + 1) >= solid) hit.push(x, y);
      }
      for (let i = 0; i < hit.length; i += 2) set(hit[i], hit[i + 1], ink, 255);
    }
    c.putImageData(img, 0, 0);
    return cv;
  };
  return { cv, W: W2, H: H2, d, set, add, al, done };
};

// ---- noise -----------------------------------------------------------------
export const h2 = (x, y, s = 0) => {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
};
// value noise with cells cx x cy; periodic over px / py cells when given
export const vnoise = (x, y, cx, cy, seed, px = 0, py = 0) => {
  const u = x / cx, v = y / cy, gx = Math.floor(u), gy = Math.floor(v);
  let fx = u - gx, fy = v - gy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const X = (i) => (px ? ((i % px) + px) % px : i), Y = (j) => (py ? ((j % py) + py) % py : j);
  const x0 = X(gx), x1 = X(gx + 1), y0 = Y(gy), y1 = Y(gy + 1);
  return (h2(x0, y0, seed) * (1 - fx) + h2(x1, y0, seed) * fx) * (1 - fy) + (h2(x0, y1, seed) * (1 - fx) + h2(x1, y1, seed) * fx) * fy;
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
// a dither threshold that isn't a regular screen: Bayer softened by noise
const thr = (x, y) => bay(x, y) * 0.6 + h2(x, y, 99) * 0.4;
const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

const MEMO = new Map();
export const memo = (key, make) => { let s = MEMO.get(key); if (!s) { if (MEMO.size > 900) MEMO.clear(); s = make(); MEMO.set(key, s); } return s; };

// ---- stepped, dithered layers ------------------------------------------------
// F: a density field (Float32Array, tw x th, 0..1). Each texel becomes one of
// 5 levels (alpha `al`), the fraction between levels dithered; a texel on the
// upper-left (sun) side of a thicker patch takes `lit`, on the lower-right
// `shade`, the thickest `core`. `wrap` makes the neighbour test periodic in x.
const stepped = (F, tw, th, lo, hi, al, cols, wrap, floor = 0) => {
  const G = grid(tw, th), lit = C(cols.lit), base = C(cols.base), shade = C(cols.shade), core = C(cols.core);
  const at = (x, y) => F[Math.max(0, Math.min(th - 1, y)) * tw + (wrap ? ((x % tw) + tw) % tw : Math.max(0, Math.min(tw - 1, x)))];
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const f = F[y * tw + x];
    const v = floor + (1 - floor) * sstep(lo, hi, f);
    let lv = v * 4, b = Math.floor(lv);
    if (lv - b > thr(x, y)) b++;
    b = Math.min(4, b);
    if (!al[b]) continue;
    const g = f - at(x - 3, y - 3);
    const k = b === 4 ? core : g > 0.035 ? lit : g < -0.035 ? shade : base;
    G.set(x, y, k, al[b]);
  }
  return G.done();
};

// ---- FOG -------------------------------------------------------------------
// Two fields: the BANKS (periodic in x, drifting) and the LIE OF THE LAND
// (static: thick over the wood, the water and the hollows by it). Each baked
// thick and patchy, so as the sun burns it off the banks break into patches.
const FOG_COLS = { lit: "#fbf3e0", base: "#e2e7e6", shade: "#b9c3cc", core: "#eef1ee" };
const FOG_AL = [0, 62, 104, 146, 186];
export const bakeFog = (key, landAt) => memo(`fog|${key}`, () => {
  const tw = W, th = H;
  const B = new Float32Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    B[y * tw + x] = 0.52 * vnoise(x, y, 140, 84, 11, 6) + 0.3 * vnoise(x, y, 70, 40, 12, 12) + 0.18 * vnoise(x, y, 35, 22, 13, 24);
  }
  // the land, sampled every 8 units and eased between
  const S8 = 8, sw = Math.ceil(tw / S8) + 2, sh = Math.ceil(th / S8) + 2, L8 = new Float32Array(sw * sh);
  for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) L8[j * sw + i] = landAt(i * S8, j * S8);
  const L = new Float32Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const u = x / S8, v = y / S8, i = Math.floor(u), j = Math.floor(v), fx = u - i, fy = v - j;
    const l = (L8[j * sw + i] * (1 - fx) + L8[j * sw + i + 1] * fx) * (1 - fy) + (L8[(j + 1) * sw + i] * (1 - fx) + L8[(j + 1) * sw + i + 1] * fx) * fy;
    L[y * tw + x] = l * (0.55 + 0.6 * vnoise(x, y, 46, 30, 14)) + 0.06 * vnoise(x, y, 18, 12, 15);
  }
  return {
    thick: stepped(B, tw, th, 0.28, 0.74, FOG_AL, FOG_COLS, true, 0.22),
    patchy: stepped(B, tw, th, 0.5, 0.82, FOG_AL, FOG_COLS, true, 0),
    land: stepped(L, tw, th, 0.18, 0.7, FOG_AL, FOG_COLS, false, 0),
  };
});
// warm light breaking through: shafts from the upper left, as wide bands on a
// diagonal (one layer a little wider than the board, swayed slowly)
export const fogShafts = () => memo("fogshafts", () => {
  const tw = W + 160, th = H, G = grid(tw, th), k = C("#ffe2a8");
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const u = x + y * 0.62;                                   // along the slant
    const band = vnoise(u, 0, 64, 1, 21) * 0.75 + vnoise(u, 0, 23, 1, 22) * 0.25;
    const v = sstep(0.55, 0.8, band) * (0.45 + 0.55 * (1 - y / th));
    let lv = v * 3, b = Math.floor(lv);
    if (lv - b > thr(x, y)) b++;
    if (b > 0) G.set(x, y, k, [0, 70, 130, 180][Math.min(3, b)]);
  }
  return G.done();
});
// a soft, ragged clearing in a 1-unit layer, for destination-out: fully clear
// inside half its radius, thinning out in dithered steps to r
export const clearing = (r) => memo(`clr|${r}`, () => {
  const n = Math.ceil(r) * 2 + 2, G = grid(n, n), c = n / 2, k = [0, 0, 0];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    const rr = r * (0.88 + 0.18 * vnoise(Math.atan2(dy, dx) * 6 + 20, 0, 1, 1, 31 + r));
    if (d > rr) continue;
    const v = d < rr * 0.5 ? 1 : 1 - (d - rr * 0.5) / (rr * 0.5);
    let lv = v * 4, b = Math.floor(lv);
    if (lv - b > thr(x, y)) b++;
    if (b > 0) G.set(x, y, k, Math.round((Math.min(4, b) / 4) * 255));
  }
  return { cv: G.done(), r: c };
});

// ---- periodic drift layers (snow drifts, ash, storm-cloud shadow) -----------
// texel 2 units, tile tw x th texels, periodic both ways; cells cx x cy texels
const drift = (key, tw, th, cx, cy, lo, hi, al, cols, seed) => memo(key, () => {
  const F = new Float32Array(tw * th), px = tw / cx, py = th / cy;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    F[y * tw + x] = 0.6 * vnoise(x, y, cx, cy, seed, px, py) + 0.4 * vnoise(x, y, cx / 2, cy / 2, seed + 1, px * 2, py * 2);
  }
  return stepped(F, tw, th, lo, hi, al, cols, true);
});
export const snowDrift = (near) => near
  ? drift("drift|n", 240, 120, 60, 12, 0.5, 0.85, [0, 60, 110, 160, 200], { lit: "#ffffff", base: "#eef4fa", shade: "#c6d6e6", core: "#ffffff" }, 41)
  : drift("drift|f", 240, 160, 80, 20, 0.4, 0.8, [0, 40, 75, 110, 140], { lit: "#f6faff", base: "#e2ecf6", shade: "#bccde0", core: "#f2f7fc" }, 43);
export const ashHaze = () => drift("ash3", 280, 140, 70, 35, 0.4, 0.9, [0, 30, 52, 74, 92], { lit: "#c4b0a0", base: "#9a8880", shade: "#74625e", core: "#887670" }, 47);
export const stormShade = () => drift("sshade", 220, 140, 55, 35, 0.45, 0.85, [0, 34, 60, 86, 110], { lit: "#1c2438", base: "#141a2c", shade: "#0c1020", core: "#0a0d1a" }, 49);

// ---- falling sheets (drawn through patterns) ---------------------------------
// tw x th units at PX, periodic: streaks / flakes wrap at the tile's edges
const sheet = (key, tw, th, paint, px = PX) => memo(key, () => {
  const G = grid(tw * px, th * px);
  const set = (x, y, k, a) => G.set(((Math.round(x) % G.W) + G.W) % G.W, ((Math.round(y) % G.H) + G.H) % G.H, k, a);
  paint(set, G.W, G.H);
  return G.done();
});
// rain: slanted streaks (dx/dy = -0.25), a brighter head at the foot
export const rainSheet = (near) => near
  ? sheet("rain|n", 150, 130, (set, w, h) => {
    for (let i = 0; i < 34; i++) {
      const x0 = h2(i, 1, 51) * w, y0 = h2(i, 2, 51) * h, L = Math.round((7 + 6 * h2(i, 3, 51)) * PX);
      for (let s = 0; s < L; s++) set(x0 - s * 0.25, y0 + s, s > L - 3 ? C("#f0f6ff") : C("#b4c6e2"), s > L - 3 ? 235 : 150 + Math.round(70 * s / L));
    }
  })
  : sheet("rain|f1", 110, 96, (set, w, h) => {          // 1 texel a unit: the far rain lives in the layer
    for (let i = 0; i < 46; i++) {
      const x0 = h2(i, 1, 53) * w, y0 = h2(i, 2, 53) * h, L = Math.round(4 + 4 * h2(i, 3, 53));
      for (let s = 0; s < L; s++) set(x0 - s * 0.25, y0 + s, C("#8c9cbc"), 90 + Math.round(60 * s / L));
    }
  }, 1);
// snow: far — fine single art pixels; near — fat flakes with a wind smear
export const snowSheet = (near) => near
  ? sheet("snow|n", 170, 130, (set, w, h) => {
    for (let i = 0; i < 30; i++) {
      const x = h2(i, 1, 61) * w, y = h2(i, 2, 61) * h, big = h2(i, 4, 61) < 0.4;
      set(x, y, C("#ffffff"), 255); set(x + 1, y, C("#ffffff"), 255); set(x, y + 1, C("#e6eef8"), 255); set(x + 1, y + 1, C("#e6eef8"), 255);
      if (big) { set(x - 1, y, C("#ffffff"), 230); set(x + 2, y + 1, C("#d6e2f0"), 200); set(x, y - 1, C("#ffffff"), 230); }
      for (let s = 2; s < 5 + (big ? 3 : 0); s++) set(x + s, y + (s > 4 ? 1 : 0), C("#dfe9f5"), 190 - s * 22);   // smeared downwind (+x is upwind: wind blows to -x)
    }
    for (let i = 0; i < 7; i++) {                     // streaks: flakes too fast to see
      const x = h2(i, 6, 61) * w, y = h2(i, 7, 61) * h, L = 8 + Math.round(h2(i, 8, 61) * 8);
      for (let s = 0; s < L; s++) set(x + s, y + Math.floor(s / 6), C("#f4f8fc"), 120 + (s < 2 ? 100 : 0));
    }
  })
  : sheet("snow|f1", 120, 92, (set, w, h) => {          // 1 texel a unit, for the layer
    for (let i = 0; i < 60; i++) {
      const x = h2(i, 1, 63) * w, y = h2(i, 2, 63) * h;
      set(x, y, h2(i, 3, 63) < 0.3 ? C("#c8d6e8") : C("#f2f6fc"), 210);
    }
  }, 1);
export const ashSheet = () => sheet("ashfall1", 150, 130, (set, w, h) => {   // 1 texel a unit
  for (let i = 0; i < 40; i++) {
    const x = h2(i, 1, 67) * w, y = h2(i, 2, 67) * h, t = h2(i, 3, 67);
    const k = t < 0.15 ? C("#b0a098") : t < 0.6 ? C("#5a4c4c") : C("#3a3034");
    set(x, y, k, 230);
    if (t > 0.6) set(x + 1, y, k, 170);
  }
}, 1);

// ---- storm sprites -------------------------------------------------------------
const put = (G, x, y, s, k, a = 255) => { for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) G.add(x + i - (s >> 1), y + j - (s >> 1), k, a); };
// A forked bolt from the board's top down to (x, y): baked once per strike.
// `hot` is the white flash frame (all white, a wider halo).
export const boltSprite = (x, y, seed, hot) => memo(`bolt|${Math.round(x)}|${Math.round(y)}|${seed}|${hot ? 1 : 0}`, () => {
  const top = -12, x0 = x + (h2(seed, 1, 71) - 0.5) * 70;
  const pts = [[x0, top]], n = 14;
  for (let i = 1; i < n; i++) {
    const u = i / n, j = (h2(seed, i + 3, 71) - 0.5) * 30 * (1 - u * 0.6);
    pts.push([x0 + (x - x0) * u + j, top + (y - top) * u + (h2(seed, i + 40, 71) - 0.5) * 6]);
  }
  pts.push([x, y]);
  const forks = [];
  for (const [fi, side] of [[3 + Math.floor(h2(seed, 9, 71) * 3), -1], [7 + Math.floor(h2(seed, 10, 71) * 3), 1]]) {
    let [fx, fy] = pts[fi]; const f = [[fx, fy]], len = 34 + 40 * h2(seed, fi, 72), m = 5;
    for (let i = 1; i <= m; i++) { fx += side * (len / m) * (0.6 + 0.6 * h2(seed, fi * 9 + i, 73)); fy += (len / m) * (0.7 + 0.5 * h2(seed, fi * 7 + i, 74)); f.push([fx, fy]); }
    forks.push(f);
  }
  let minx = Infinity, maxx = -Infinity;
  for (const p of [...pts, ...forks.flat()]) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); }
  const ox = minx - 8, oy = top - 4, G = grid((maxx - minx + 16) * PX, (y - top + 10) * PX);
  const halo = C(hot ? "#e8eeff" : "#7c98e8"), body = C(hot ? "#ffffff" : "#d8e4ff"), core = C("#ffffff");
  const line = (P, wide) => {
    for (let k = 0; k < P.length - 1; k++) {
      const [ax, ay] = P[k], [bx, by] = P[k + 1], steps = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * PX);
      for (let q = 0; q <= steps; q++) {
        const px = ((ax + ((bx - ax) * q) / steps) - ox) * PX, py = ((ay + ((by - ay) * q) / steps) - oy) * PX;
        put(G, px, py, Math.round((hot ? 13 : 10) * wide), halo, hot ? 130 : 105);
      }
      for (let q = 0; q <= steps; q++) {
        const px = ((ax + ((bx - ax) * q) / steps) - ox) * PX, py = ((ay + ((by - ay) * q) / steps) - oy) * PX;
        put(G, px, py, Math.max(2, Math.round((hot ? 6 : 4) * wide)), body, 255);
        if (wide >= 0.9) put(G, px, py, hot ? 3 : 2, core, 255);
      }
    }
  };
  for (const f of forks) line(f, 0.55);
  line(pts, 1);
  return { cv: G.done(), x: ox, y: oy };
});
// Lichtenberg scorch: a burnt heart with fern-like burns branching out
export const boltScorch = (r, v) => memo(`bsc|${r}|${v}`, () => {
  const R = r * PX, n = Math.ceil(R * 2.4), G = grid(n, n * 0.6), cx = n / 2, cy = G.H / 2;
  const k0 = C("#1e1618"), k1 = C("#3a2a26"), k2 = C("#5a4434");
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const dx = (x - cx) / R, dy = (y - cy) / (R * 0.5), d = Math.hypot(dx, dy);
    const e = 0.32 + 0.12 * vnoise(x, y, 5, 5, 80 + v);
    if (d < e) G.set(x, y, d < e * 0.6 ? k0 : k1, d < e * 0.6 ? 220 : 180);
  }
  const branch = (x, y, a, len, depth) => {
    for (let s = 0; s < len; s++) {
      a += (h2(Math.round(x), Math.round(y), 81 + v) - 0.5) * 0.7;
      x += Math.cos(a); y += Math.sin(a) * 0.5;
      G.add(x, y, depth ? k2 : k1, depth ? 150 : 200);
      if (!depth && s % 4 === 3) branch(x, y, a + (s & 4 ? 0.9 : -0.9), len * 0.35, 1);
    }
  };
  for (let i = 0; i < 7; i++) branch(cx, cy, (i / 7) * Math.PI * 2 + h2(i, v, 82), R * (0.75 + 0.4 * h2(i, v, 83)), 0);
  return { cv: G.done(), ax: cx, ay: cy };
});
// gathering static: a dithered pale glow on the ground, 3 strengths
export const staticGlow = (r, s) => memo(`sg|${r}|${s}`, () => {
  const R = r * PX, G = grid(R * 2 + 4, R + 4), cx = G.W / 2, cy = G.H / 2;
  const ks = [C("#5a70c8"), C("#9ab4ff"), C("#e4ecff")];
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const d = Math.hypot((x - cx) / R, (y - cy) / (R * 0.5));
    if (d > 1) continue;
    const v = (1 - d) * (0.5 + 0.25 * s);
    let lv = v * 3, b = Math.floor(lv);
    if (lv - b > thr(x, y)) b++;
    if (b > 0) G.set(x, y, ks[Math.min(2, b - 1)], [0, 70, 110, 150][Math.min(3, b)]);
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
// a plus-shaped mote (static sparks, embers): 3x3 art pixels, a hot heart
export const mote = (hot, rim) => memo(`mote|${hot}|${rim}`, () => {
  const G = grid(3, 3), a = C(hot), b = C(rim);
  G.set(1, 0, b); G.set(0, 1, b); G.set(2, 1, b); G.set(1, 2, b); G.set(1, 1, a);
  return G.done();
});
// a rain splash, 4 frames: the drop, a crown flicking up, a ring, a faint ring
export const splash = (f) => memo(`spl|${f}`, () => {
  const G = grid(14, 8), cx = 7, cy = 5, hi = C("#eef4ff"), lo = C("#a8bcd8");
  if (f === 0) { G.set(cx, cy, hi); G.set(cx - 1, cy, hi); G.set(cx, cy - 1, lo, 200); }
  if (f === 1) { G.set(cx - 2, cy - 2, hi); G.set(cx + 2, cy - 2, hi); G.set(cx - 3, cy - 3, lo, 220); G.set(cx + 3, cy - 3, lo, 220); G.set(cx - 1, cy, lo); G.set(cx, cy, lo); G.set(cx + 1, cy, lo); }
  if (f >= 2) {
    const rx = f === 2 ? 3.5 : 5.5, ry = rx * 0.4;
    for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; if (f === 3 && a % 3 === 0) continue; G.set(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, Math.sin(t) > 0 ? hi : lo, f === 2 ? 220 : 140); }
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
// a puddle on the road: dark water holding a sliver of sky, a lit far rim
export const puddle = (wu, v) => memo(`pud|${wu}|${v}`, () => {
  const rx = (wu / 2) * PX, ry = rx * 0.42, G = grid(rx * 2 + 4, ry * 2 + 4), cx = G.W / 2, cy = G.H / 2;
  const deep = C("#263044"), sky = C("#9aaccc"), rim = C("#d4e0f0"), mud = C("#34302e");
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    const e = 0.82 + 0.3 * vnoise(x, y, rx * 0.5, ry * 0.7, 90 + v);
    const d = Math.hypot(dx, dy);
    if (d > e) continue;
    const edge = d > e - 0.18;
    const refl = dx * 0.6 + dy * 0.3 < -0.15 && dx * 0.6 + dy * 0.3 > -0.5 && !edge;
    G.set(x, y, edge ? (dy > 0 ? rim : mud) : refl ? sky : deep, edge ? (dy > 0 ? 200 : 150) : refl ? 185 : 190);
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
// a ripple in a puddle (2 frames)
export const ripple = (f) => memo(`rip|${f}`, () => {
  const G = grid(12, 6), rx = f ? 4.5 : 2.5, ry = rx * 0.42, k = C("#c8d6ea");
  for (let a = 0; a < 30; a++) { const t = (a / 30) * Math.PI * 2; G.set(6 + Math.cos(t) * rx, 3 + Math.sin(t) * ry, k, f ? 110 : 190); }
  return { cv: G.done(), ax: 6, ay: 3 };
});
// the daze: a wheel of little electric stars round a soldier's head
export const dazeWheel = (f) => memo(`daze|${f}`, () => {
  const G = grid(30, 16), cx = 15, cy = 8, K = [C("#ffffff"), C("#fff2a0"), C("#e8b838"), C("#8a90c8")];
  const st = [];
  for (let i = 0; i < 3; i++) st.push((f / 16 + i / 3) * Math.PI * 2);
  st.sort((p, q) => Math.sin(p) - Math.sin(q));
  for (const a of st) {
    const x = Math.round(cx + Math.cos(a) * 9), y = Math.round(cy + Math.sin(a) * 3 + Math.cos(a) * 1.5), near = Math.sin(a) > 0.2, far = Math.sin(a) < -0.5;
    const r = near ? 3 : far ? 1 : 2;
    for (let i = r; i >= 1; i--) { const k = far ? K[3] : i === r ? K[2] : K[1]; G.set(x - i, y, k); G.set(x + i, y, k); G.set(x, y - i, k); G.set(x, y + i, k); }
    G.set(x, y, far ? K[2] : K[0]);
    if (near && (f + Math.round(a * 3)) % 5 === 0) { G.set(x + 2, y - 2, K[0]); G.set(x + 3, y - 3, K[1]); }   // a crackle off it
  }
  return { cv: G.done(INK), ax: cx, ay: cy };
});

// ---- grave mist ----------------------------------------------------------------
// A lobe of low mist, 1 texel a unit: flat-bottomed, domed and lit on top,
// dark under, ragged and dithered at its fringe. rx in units; 4 curls (v).
const MIST = { lit: C("#c6d4be"), base: C("#9fb29c"), shade: C("#6f8676"), deep: C("#5a6e64") };
export const mistLobe = (rx, v) => memo(`ml|${rx}|${v}`, () => {
  const ry = rx * 0.6, G = grid(rx * 2.5 + 4, ry * 2.7 + 4), cx = G.W / 2, cy = G.H * 0.62;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    const d = Math.hypot(nx, ny * (ny > 0 ? 1.8 : 0.95));
    // billows along its crown, a ragged hem along the ground
    const e = 0.66 + 0.34 * vnoise(x, y, rx * 0.3, ry * 0.32, 100 + v * 7) + 0.16 * vnoise(x, y, 5, 4, 107 + v) - (ny > 0.2 ? 0.08 : 0);
    if (d > e) continue;
    const q = d / e;
    let lv = (1 - q) * 4.6, b = Math.floor(lv);
    if (lv - b > thr(x, y)) b++;
    if (b <= 0) continue;
    // lit where its upper-left crown faces the sun, dark beneath
    const l = -(nx * 0.5 + ny * 0.85);
    const k = l > 0.4 && ny < -0.3 && q > 0.4 ? MIST.lit : ny > 0.35 ? (q > 0.55 ? MIST.deep : MIST.shade) : MIST.base;
    G.set(x, y, k, [0, 96, 150, 192, 216][Math.min(4, b)]);
  }
  return { cv: G.done(), ax: Math.round(cx), ay: Math.round(cy) };
});
// a wisp curling up off a bank: 6 frames, rising, curling and coming apart
export const mistWisp = (f) => memo(`mw|${f}`, () => {
  const G = grid(16 * PX, 22 * PX), k = C("#c8d6c0"), k2 = C("#93a894");
  const up = f / 5;
  for (let s = 0; s < 40; s++) {
    const u = s / 40;
    const x = 8 * PX + Math.sin(u * 5.2 + f * 0.5) * (2 + u * 4) * PX + u * 3 * PX;
    const y = (21 - u * (12 + up * 6)) * PX;
    if (h2(s, f, 111) < up * 0.55 + u * 0.2) continue;        // coming apart as it rises
    const w = u < 0.3 ? 3 : u < 0.7 ? 2 : 1;
    for (let i = 0; i < w; i++) G.set(x + i, y, i === 0 ? k : k2, Math.round(200 * (1 - up * 0.5)));
  }
  return { cv: G.done(), ax: 8 * PX, ay: 21 * PX };
});
// a face in the mist (v 0) or a hand reaching up out of it (v 1): faint, dithered
export const mistShade = (v) => memo(`msh|${v}`, () => {
  const G = grid(16 * PX, 20 * PX), pale = C("#d4e4d2"), dim = C("#9cb4a2"), hole = C("#2a3a34");
  const cx = 8 * PX;
  if (v === 0) {
    for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
      const nx = (x - cx) / (6 * PX), ny = (y - 8 * PX) / (8 * PX);
      const d = Math.hypot(nx, ny * (ny > 0 ? 1.05 : 1.2));
      if (d > 1) continue;
      const tail = ny > 0.5 && h2(x, y, 120) < (ny - 0.5) * 1.8;   // the jaw frays into the mist
      if (tail || thr(x, y) < d * 0.45 - 0.05) continue;
      G.set(x, y, d > 0.75 ? dim : pale, 200);
    }
    // hollow eyes and an open mouth
    for (const [ex, ey, rw, rh] of [[-2.6, -1.4, 1.6, 2.2], [2.6, -1.4, 1.6, 2.2], [0, 4.2, 1.4, 2.6]]) {
      for (let y = -rh * PX; y <= rh * PX; y++) for (let x = -rw * PX; x <= rw * PX; x++) {
        if ((x / (rw * PX)) ** 2 + (y / (rh * PX)) ** 2 <= 1) G.set(cx + ex * PX + x, 8 * PX + ey * PX + y, hole, 200);
      }
    }
  } else {
    // a forearm and an open hand, fingers splayed, reaching up
    const seg = (ax, ay, bx, by, w, k) => { const n = Math.ceil(Math.hypot(bx - ax, by - ay) * PX); for (let i = 0; i <= n; i++) { const u = i / n; for (let j = 0; j < w; j++) for (let q = 0; q < w; q++) G.set((ax + (bx - ax) * u) * PX + j - (w >> 1), (ay + (by - ay) * u) * PX + q - (w >> 1), k, 210); } };
    seg(8, 20, 8.5, 11, 5, dim); seg(8, 19, 8.5, 11, 3, pale);
    seg(6.5, 11, 10.5, 11, 5, pale); seg(7, 9, 10, 9.5, 5, pale);
    for (const [fx, fy, tx, ty] of [[6.5, 9.5, 4.5, 5], [7.6, 8.5, 7, 3.4], [8.8, 8.4, 9.6, 3], [9.9, 8.8, 11.8, 4.4], [10.5, 10.6, 13, 8.8]]) seg(fx, fy, tx, ty, 2, pale);
  }
  return { cv: G.done(), ax: cx, ay: 10 * PX };
});

// ---- blizzard: frost at the board's edges ---------------------------------------
// Each pixel of a strip gets the stage (0..1) at which the frost reaches it:
// a rime crust hugging the edge, then fern-like fronds growing in. A stage
// canvas holds every pixel whose stage is <= s, so the creep only ever grows.
// side: "t" | "b" | "l" | "r"; D: the strip's depth (units).
export const frostStrip = (side, D, s) => memo(`fr2|${side}|${D}|${s}`, () => {
  const horiz = side === "t" || side === "b";
  const len = horiz ? W : H, w = len * PX, d = D * PX;     // the side strips run the full height, under the top and bottom ones: no step at the corners
  const G = grid(horiz ? w : d, horiz ? d : w);
  const stage = new Float32Array(w * d).fill(9);       // [along * d + inward]
  const mark = (a, e, st) => { a = Math.round(a); e = Math.round(e); if (a < 0 || a >= w || e < 0 || e >= d) return; const i = a * d + e; if (st < stage[i]) stage[i] = st; };
  const seed = side.charCodeAt(0);
  // the crust
  for (let a = 0; a < w; a++) {
    const reach = (5 + 9 * vnoise(a, 0, 9 * PX, 1, seed) + 5 * vnoise(a, 0, 3 * PX, 1, seed + 1)) * PX;
    for (let e = 0; e < reach; e++) mark(a, e, (e / reach) * 0.55);
  }
  // fronds, two art pixels thick
  const frond = (a, e, ang, L, st0, depth) => {
    for (let q = 0; q < L; q++) {
      a += Math.cos(ang); e += Math.sin(ang);
      const st = st0 + (q / L) * (1 - st0) * (depth ? 0.7 : 1);
      mark(a, e, st); if (!depth || q < L * 0.5) mark(a + 1, e, st);
      if (!depth && q > 3 && q % 6 === 0) {
        frond(a, e, ang - 0.95, L * 0.32 * (1 - q / L) + 4, st, 1);
        frond(a, e, ang + 0.95, L * 0.32 * (1 - q / L) + 4, st, 1);
      }
    }
  };
  for (let a = 4; a < w; a += (5 + 7 * h2(a, 1, seed)) * PX) {
    const L = (D * 0.5 + D * 0.5 * h2(a, 2, seed)) * PX;
    frond(a, 4 * PX, Math.PI / 2 + (h2(a, 3, seed) - 0.5) * 1.1, L, 0.15 + 0.3 * h2(a, 4, seed), 0);
  }
  const rime = C("#dceaf6"), line = C("#8eb2d6"), white = C("#fbfdff"), deep = C("#a4c4e2");
  const has = (a, e) => a >= 0 && a < w && e >= 0 && e < d && stage[a * d + e] <= s;
  for (let a = 0; a < w; a++) for (let e = 0; e < d; e++) {
    const st = stage[a * d + e];
    if (st > s) continue;
    // the frost's own edge is inked in ice blue, so it reads on snow
    const rim = !has(a - 1, e) || !has(a + 1, e) || !has(a, e + 1);
    const k = rim ? line : e < 4 ? deep : (h2(a, e, seed + 5) < 0.08 ? white : (st > s - 0.15 ? white : rime));
    const x = horiz ? a : side === "l" ? e : d - 1 - e, y = horiz ? (side === "t" ? e : d - 1 - e) : a;
    G.set(x, y, k, rim ? 170 : 235);
  }
  return G.done();
});

// ---- eruption ----------------------------------------------------------------------
// a burning boulder (r units), 3 shapes x 8 turns: basalt lit from the upper
// left, magma glowing through its cracks, its underside (the leading face) hot
export const boulder = (r, v, f) => memo(`bld|${r}|${v}|${f}`, () => {
  const R = r * PX, G = grid(R * 2 + 6, R * 2 + 6), c = G.W / 2;
  const ang = (f / 8) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
  const rock = [C("#6e564a"), C("#4a3a36"), C("#2e2428")], hot = [C("#ffe08a"), C("#f8a040"), C("#d8683a")];
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c;
    const u = (dx * ca - dy * sa) / R, w = (dx * sa + dy * ca) / R;          // the rock's own frame (turns)
    const e = 0.78 + 0.3 * vnoise(u * 4 + 9, w * 4 + 9, 1, 1, 130 + v);
    const d = Math.hypot(dx, dy) / R;
    if (d > e) continue;
    const crack = Math.abs(vnoise(u * 6 + 3, w * 6 + 3, 1, 1, 140 + v) - 0.5) < 0.055;
    const l = -(dx * 0.6 + dy * 0.8) / R;                                     // the sun, upper left
    const under = dy / R > 0.35 && d > e * 0.55;
    G.set(x, y, crack ? hot[d < e * 0.6 ? 0 : 1] : under ? hot[2] : rock[l > 0.25 ? 0 : l > -0.3 ? 1 : 2]);
  }
  return { cv: G.done(INK), ax: c, ay: c };
});
// smoke: dithered, lit on its upper-left rim (sizes in units, 2 variants)
const SMOKE = [C("#8a7a74"), C("#5a4c4e"), C("#3a2e32")];
export const smokePuff = (r, v) => memo(`smk|${r}|${v}`, () => {
  const R = r * PX, G = grid(R * 2.4 + 2, R * 2.4 + 2), c = G.W / 2;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const nx = (x + 0.5 - c) / R, ny = (y + 0.5 - c) / R, d = Math.hypot(nx, ny);
    const e = 0.8 + 0.3 * vnoise(x, y, Math.max(2, R * 0.45), Math.max(2, R * 0.45), 150 + v);
    if (d > e) continue;
    const q = d / e;
    if (bay(x, y) >= 1.05 - q * 0.5) continue;
    const l = -(nx * 0.55 + ny * 0.64);
    G.set(x, y, SMOKE[q > 0.5 && l > 0.25 ? 0 : q < 0.45 ? 2 : 1], 220);
  }
  return { cv: G.done(), ax: c, ay: c };
});
// a lick of fire, after render/flames.js's tongues (its palette and shape):
// round at the root, drawn up into a leaning point; st 0 white-hot .. 3 red
const FIRE = [C("#fff3d2"), C("#f8d868"), C("#f0a040"), C("#d8683a"), C("#9a3a30"), C("#5a2430")];
export const tongue = (st, r2, v) => memo(`tng|${st}|${r2}|${v}`, () => {
  const R = (r2 / 2) * PX, up = 2.5;
  const G = grid(Math.ceil(R * 2.6) + 4, Math.ceil(R * (1.3 + up)) + 4);
  const cx = G.W / 2, cy = Math.ceil(R * up) + 2, lean = (h2(v, 3, 160) - 0.5) * 0.7;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const nx = (x + 0.5 - cx) / R, ny = (y + 0.5 - cy) / R;
    let d;
    if (ny < 0) {
      const u = -ny / up, sway = lean * u * u + Math.sin(u * 3.2 + v * 2.1) * 0.14 * u;
      d = Math.hypot((nx - sway) / Math.max(0.06, 1 - u * 0.95), u);
    } else d = Math.hypot(nx, ny * 1.1);
    const e = 0.8 + 0.32 * vnoise(x, y, Math.max(2, R * 0.45), Math.max(2, R * 0.45), v * 7 + st + 30);
    if (d > e) continue;
    const k = d / e;
    if (k > 0.8 && R > 5 && st >= 1 && bay(x, y) > 0.55) continue;
    const kh = Math.min(0.999, k * 0.9 + (ny > 0 ? ny * 0.2 : 0));
    G.set(x, y, FIRE[Math.min(5, st + Math.floor(kh * 3))]);
  }
  return { cv: G.done(), ax: Math.round(cx), ay: cy };
});
// a rock's shadow, growing as it comes down (dithered, 6 sizes per r)
export const rockShadow = (r, s) => memo(`rsh|${r}|${s}`, () => {
  const R = r * PX * (0.3 + 0.14 * s), G = grid(R * 2 + 4, R + 4), cx = G.W / 2, cy = G.H / 2, k = C("#1a1014");
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const d = Math.hypot((x - cx) / R, (y - cy) / (R * 0.45));
    if (d > 1) continue;
    if (d > 0.7 && thr(x, y) < (d - 0.7) * 3.3) continue;
    G.set(x, y, k, 90 + s * 18);
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
// where it will land: a hot broken ring on the ground (2 flicker frames)
export const hotRing = (r, f) => memo(`hr|${r}|${f}`, () => {
  const R = r * PX, G = grid(R * 2 + 6, R + 6), cx = G.W / 2, cy = G.H / 2, a = C("#f8a040"), b = C("#d8683a"), hi = C("#ffe08a");
  const n = Math.ceil(R * 7);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    if (Math.floor((i / n) * 16 + f * 0.5) % 2) continue;      // broken into dashes, crawling round
    const x = cx + Math.cos(t) * R, y = cy + Math.sin(t) * R * 0.45;
    G.set(x, y, Math.sin(t) > 0 ? a : b, 240); G.set(x, y + 1, b, 220); G.set(x + 1, y, a, 200);
    if (f && i % 9 === 0) G.set(x, y - 1, hi);
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
// the impact: a white-hot flash with rays (4 frames), at radius r
export const impactBurst = (r, f) => memo(`ib|${r}|${f}`, () => {
  const R = r * PX * (0.55 + f * 0.2), G = grid(R * 2.6, R * 1.8), cx = G.W / 2, cy = G.H * 0.62;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const dx = (x - cx) / R, dy = (y - cy) / (R * 0.6), d = Math.hypot(dx, dy);
    const ray = 0.25 * Math.max(0, Math.cos(Math.atan2(dy, dx) * 8 + f)) ** 6;
    if (d > 0.62 + ray - f * 0.08) continue;
    const q = d / (0.62 + ray);
    const k = q < 0.4 - f * 0.08 ? FIRE[0] : q < 0.7 ? FIRE[1 + (f >> 1)] : FIRE[2 + (f >> 1)];
    if (f >= 2 && q > 0.6 && thr(x, y) < 0.5) continue;
    G.set(x, y, k, 255 - f * 30);
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
// a ring of dust thrown out by a landing (radius bucket rr)
export const dustRing = (rr) => memo(`dr|${rr}`, () => {
  const R = rr * PX, G = grid(R * 2 + 8, R + 8), cx = G.W / 2, cy = G.H / 2, k = [C("#8a7464"), C("#5e4c42")];
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const d = Math.hypot((x - cx) / R, (y - cy) / (R * 0.42));
    if (d > 1.05 || d < 0.72) continue;
    if (thr(x, y) < Math.abs(d - 0.9) * 5) continue;
    G.set(x, y, k[y < cy ? 0 : 1], 200);
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
export const chip = (v) => memo(`chip|${v}`, () => {
  const G = grid(5, 4), a = C(v ? "#5a4640" : "#3a2e30"), hot = C("#f8a040");
  G.set(1, 0, a); G.set(2, 0, a); G.set(0, 1, a); G.set(1, 1, hot); G.set(2, 1, a); G.set(3, 1, a); G.set(1, 2, a); G.set(2, 2, a); if (v) G.set(3, 2, a);
  return G.done(INK);
});

// ---- the toast's icons (14 x 14 art pixels) ---------------------------------------
export const weatherIcon = (kind) => memo(`ico|${kind}`, () => {
  const G = grid(14, 14), s = (x, y, k) => G.set(x, y, k);
  const P = (pts, k) => { for (const [x, y] of pts) s(x, y, k); };
  const row = (y, x0, x1, k) => { for (let x = x0; x <= x1; x++) s(x, y, k); };
  if (kind === "fog") {
    for (const [y, x0, x1, k] of [[3, 3, 9, "#f4f4ee"], [6, 1, 11, "#dfe4e4"], [9, 3, 12, "#f4f4ee"], [12, 2, 8, "#c4ccd2"]]) row(y, x0, x1, C(k));
    P([[2, 3], [10, 3], [0, 6], [12, 6], [2, 9], [13, 9]], C("#c4ccd2"));
    P([[11, 1], [12, 0], [12, 1], [13, 1]], C("#f8d868"));                     // the sun behind it
  } else if (kind === "storm") {
    for (let y = 1; y < 6; y++) row(y, 3 - (y > 2 ? 2 : 0) + (y === 5 ? 1 : 0), 10 + (y > 1 && y < 5 ? 2 : 0), C(y < 3 ? "#9aa4b8" : "#5c667c"));
    P([[7, 6], [6, 7], [5, 8], [6, 8], [7, 8], [8, 8], [7, 9], [6, 10], [5, 11], [5, 12]], C("#fff2a0"));
    P([[3, 8], [2, 10], [10, 7], [9, 9], [11, 10]], C("#8cb0e8"));
  } else if (kind === "gravemist") {
    for (const [y, x0, x1] of [[9, 1, 12], [10, 0, 13], [11, 1, 12], [12, 3, 10]]) row(y, x0, x1, C("#9fb29c"));
    row(8, 3, 6, C("#c6d4be")); row(8, 8, 11, C("#c6d4be"));
    for (let y = 2; y < 8; y++) row(y, 5, 8, C("#d4e4d2"));
    row(1, 6, 7, C("#d4e4d2")); s(5, 4, C("#2a3a34")); s(8, 4, C("#2a3a34")); s(6, 6, C("#2a3a34")); s(7, 6, C("#2a3a34"));
  } else if (kind === "blizzard") {
    const k = C("#f4faff"), k2 = C("#9ac0e0");
    row(6, 1, 12, k); for (let y = 0; y < 13; y++) s(6, y, k);
    for (let i = 2; i < 11; i++) { s(i, i - 0.5, k2); s(i, 12.5 - i, k2); }
    P([[4, 0], [8, 0], [4, 12], [8, 12], [0, 4], [0, 8], [12, 4], [12, 8]], k);
  } else {
    for (let y = 6; y < 13; y++) row(y, 6 - (y - 6), 7 + (y - 6), C(y < 9 ? "#5a4640" : "#3a2e30"));
    row(6, 6, 7, C("#f8a040")); row(7, 6, 7, C("#d8683a"));
    P([[6, 4], [7, 3], [5, 2], [8, 1], [9, 3], [3, 3]], C("#f8a040")); P([[7, 5], [6, 3]], C("#ffe08a"));
  }
  return G.done(INK);
});

// ---- single falling things, stamped one by one (the near rain and snow: a
// sparse stamp touches far fewer pixels than a whole-board pattern fill) ----
export const rainDrop = (v) => memo(`drop|${v}`, () => {
  const L = Math.round((7 + v * 3) * PX), G = grid(Math.ceil(L * 0.25) + 2, L);
  for (let s = 0; s < L; s++) G.set(Math.round((L - s) * 0.25), s, s > L - 3 ? C("#f0f6ff") : C("#b4c6e2"), s > L - 3 ? 235 : 150 + Math.round(70 * s / L));
  return { cv: G.done(), ax: 0, ay: 0 };
});
export const snowFlake = (v) => memo(`flake|${v}`, () => {
  const G = grid(14, 4), w = C("#ffffff"), m = C("#e6eef8"), sm = C("#dfe9f5");
  if (v === 3) { for (let s = 0; s < 13; s++) G.set(s, 1 + Math.floor(s / 7), C("#f4f8fc"), s < 2 ? 230 : 130); return { cv: G.done(), ax: 0, ay: 1 }; }
  G.set(0, 1, w); G.set(1, 1, w); G.set(0, 2, m); G.set(1, 2, m); G.set(0, 3, C("#9ab0cc"), 200); G.set(1, 3, C("#9ab0cc"), 200);   // a cool shade under it, so it reads on snow
  if (v === 2) { G.set(-0, 0, w, 230); G.set(2, 2, sm, 200); G.set(1, 0, w, 230); }
  for (let s = 2; s < 5 + (v === 2 ? 3 : v); s++) G.set(s, 1 + (s > 4 ? 1 : 0), sm, 190 - s * 22);
  return { cv: G.done(), ax: 0, ay: 1 };
});

// the blizzard thins over the castle band: a ramp `ramp` units wide, then flat,
// as a destination-out mask in a 1-unit layer (dithered steps, never a hard edge)
export const thinBand = (w, ramp, a) => memo(`thin|${w}|${ramp}|${a}`, () => {
  const G = grid(w, H), k = [0, 0, 0];
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    const v = Math.min(1, x / ramp) * a;
    let lv = v * 4, b = Math.floor(lv);
    if (lv - b > thr(x, y)) b++;
    if (b > 0) G.set(x, y, k, Math.round((b / 4) * 255));
  }
  return G.done();
});
