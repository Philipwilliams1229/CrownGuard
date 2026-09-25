// ============ RENDER: COMBAT EFFECTS ============
// Everything a fight throws about: shots in flight, the blasts they end in,
// the marks they leave on the turf, lightning, coin pops, and the small
// status tells that ride on a foe.
//
// Pixel art like the rest of the board. Every piece is painted pixel by
// pixel at art resolution (PX art pixels per world unit), baked ONCE into a
// cached sprite keyed by type / size bucket / frame, and then stamped with a
// single drawImage. A blast is eight stepped frames, not a live vector disc,
// so a wave of five hundred under a sky full of splash stays cheap: the cost
// of a blast on screen is one or two blits, whatever it looks like.

import { PX, INK_LINE, inkOutline, hash } from "./paint.js";

// ---- palette ---------------------------------------------------------
const col = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pal = (...hs) => hs.map(col);
const CREAM = col("#fff3d2");
const FIRE = pal("#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30", "#5a2430");
const ARC = pal("#fff3d2", "#e4d0fc", "#b890e8", "#8a64c8", "#5a3a8a");
const ICE = pal("#ffffff", "#d4f2fa", "#9fd4e8", "#62a4cc", "#3a6a98");
const DUST = pal("#eee0bc", "#cdb68a", "#a48a64", "#766048");
const STONE = pal("#cdc6ba", "#9a948e", "#6a6470", "#4a4452");
const SOOT = pal("#221a1e", "#3a2c28", "#4e3e32");

// ---- pixel canvas ----------------------------------------------------
// A canvas painted straight into its ImageData, one art pixel at a time:
// nothing is antialiased, so every edge comes out as a clean pixel step.
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
  const rect = (x, y, w, h, k, a) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, k, a); };
  const done = (ink = null, passes = 1) => { c.putImageData(img, 0, 0); if (ink) inkOutline(cv, ink, passes); return cv; };
  return { cv, W, H, set, rect, done };
};

// Baked sprites: { cv, ax, ay } with the anchor in art pixels. Blasts are the
// big ones, so they get their own, smaller budget.
const SMALL = new Map(), BIG = new Map();
const memo = (key, make, M = SMALL, cap = 1600) => {
  let s = M.get(key);
  if (!s) {
    // over budget: let the oldest quarter go (a Map keeps insertion order)
    if (M.size >= cap) { let n = cap >> 2; for (const k of M.keys()) { M.delete(k); if (--n <= 0) break; } }
    s = make(); M.set(key, s);
  }
  return s;
};

// stamp a sprite with its anchor on (x, y), snapped to the art grid
const put = (ctx, s, x, y, flip = false) => {
  const w = s.cv.width / PX, h = s.cv.height / PX;
  const X = Math.round(x * PX) / PX, Y = Math.round(y * PX) / PX;
  if (!flip) { ctx.drawImage(s.cv, X - s.ax / PX, Y - s.ay / PX, w, h); return; }
  ctx.save(); ctx.translate(X, Y); ctx.scale(-1, 1);
  ctx.drawImage(s.cv, -s.ax / PX, -s.ay / PX, w, h);
  ctx.restore();
};

// ordered dither: bay(x, y) < density keeps a pixel
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
// smooth value noise, for lumpy edges that still come out as pixel steps
const vnoise = (x, y, cell, seed) => {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  let fx = x / cell - gx, fy = y / cell - gy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const s = Math.floor(seed * 977);
  const h = (i, j) => hash(gx + i + s, gy + j);
  return (h(0, 0) * (1 - fx) + h(1, 0) * fx) * (1 - fy) + (h(0, 1) * (1 - fx) + h(1, 1) * fx) * fy;
};
const easeOut = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// the life an effect started with (the engine only counts ttl down)
const lifeOf = (fx, dflt) => fx.life || (fx._l ||= Math.max(fx.ttl, dflt || 0));
// alpha in a few hard steps, so fades read as pixel-art translucency
const stepA = (a, n = 4) => Math.ceil(clamp01(a) * n) / n;

// ---- painters ----------------------------------------------------------
// A lumpy lit ball: hot/bright at the heart and toward the sun (upper left),
// sinking through the tones to the last one on the far rim. `wk` weights the
// heart, `wl` the sunlight: fire glows from within, smoke is lit from outside.
const ball = (G, cx, cy, r, tones, seed, dens = 1, wk = 0.5, wl = 0.5) => {
  if (r < 0.8) return;
  const x0 = Math.floor(cx - r * 1.15), x1 = Math.ceil(cx + r * 1.15);
  const y0 = Math.floor(cy - r * 1.15), y1 = Math.ceil(cy + r * 1.15);
  const n = tones.length, cell = Math.max(2, r * 0.5);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r;
    const d = Math.sqrt(dx * dx + dy * dy);
    const edge = 0.8 + 0.32 * vnoise(x, y, cell, seed);
    if (d > edge) continue;
    if (dens < 1 && bay(x & 1023, y & 1023) >= dens) continue;
    const k = d / edge, l = -(dx * 0.55 + dy * 0.64);
    let t = k * wk + (0.5 - l) * wl * 0.9;
    if (k > 0.84 && l < 0.1) t += 0.35;              // the shadowed rim
    G.set(x, y, tones[Math.max(0, Math.min(n - 1, Math.floor(t * n)))]);
  }
};

// A flattened ground ring, `th` pixels wide just inside the edge: three tones
// from the leading edge inward; `dens` thins it away by dither.
const ring = (G, cx, cy, rx, ry, th, tones, dens = 1) => {
  if (rx < 1 || dens <= 0) return;
  const x0 = Math.max(0, Math.floor(cx - rx - 1)), x1 = Math.min(G.W - 1, Math.ceil(cx + rx + 1));
  const y0 = Math.max(0, Math.floor(cy - ry - 1)), y1 = Math.min(G.H - 1, Math.ceil(cy + ry + 1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    const n = Math.sqrt(nx * nx + ny * ny);
    if (n > 1.05 || n < 0.2) continue;
    const gr = Math.sqrt((nx / rx) ** 2 + (ny / ry) ** 2) / (n || 1);
    const e = (1 - n) / gr;                            // pixels inside the edge
    if (e < 0 || e >= th) continue;
    if (dens < 1 && bay(x, y) >= dens) continue;
    G.set(x, y, tones[Math.min(tones.length - 1, Math.floor((e / th) * tones.length))]);
  }
};

// a see-through wash inside an ellipse (light thrown on the ground): one
// flat translucent tone with a hard edge — never a solid disc
const wash = (G, cx, cy, rx, ry, k, alpha, inner = 0) => {
  if (alpha <= 0 || rx < 1) return;
  const a = Math.round(alpha);
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(G.H - 1, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(G.W - 1, Math.ceil(cx + rx)); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, n = nx * nx + ny * ny;
      if (n > 1 || n < inner) continue;
      G.set(x, y, k, a);
    }
  }
};

// A cloud of overlapping puffs painted as ONE lumpy mass, so it reads as
// smoke or fire rather than a pile of balls. Each pixel belongs to the puff
// it sits deepest in; `heat` shades by depth (fire burns hottest inside),
// otherwise by sunlight on that puff (smoke is lit from the upper left).
// `dens` < 1 thins the whole cloud away by dither as it disperses.
const cloud = (G, puffs, tones, seed, o = {}) => {
  const dens = o.dens ?? 1, heat = !!o.heat, n = tones.length;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y, r] of puffs) { x0 = Math.min(x0, x - r * 1.2); x1 = Math.max(x1, x + r * 1.2); y0 = Math.min(y0, y - r * 1.2); y1 = Math.max(y1, y + r * 1.2); }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(G.W - 1, Math.ceil(x1)); y1 = Math.min(G.H - 1, Math.ceil(y1));
  if (x1 < x0 || y1 < y0) return;
  // each puff rasterised over its own box, keeping the deepest puff per pixel
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const depth = new Float32Array(w * h), owner = new Int16Array(w * h).fill(-1);
  for (let i = 0; i < puffs.length; i++) {
    const [px, py, r] = puffs[i];
    if (r < 0.8) continue;
    const cell = Math.max(2, r * 0.45);
    const bx0 = Math.max(x0, Math.floor(px - r * 1.14)), bx1 = Math.min(x1, Math.ceil(px + r * 1.14));
    const by0 = Math.max(y0, Math.floor(py - r * 1.14)), by1 = Math.min(y1, Math.ceil(py + r * 1.14));
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py) / r;
      const j = (y - y0) * w + (x - x0);
      if (d > 1.14 || 1.14 - d <= depth[j]) continue;       // can't beat what's there
      const v = 0.84 + 0.3 * vnoise(x, y, cell, seed + i) - d;
      if (v > depth[j]) { depth[j] = v; owner[j] = i; }
    }
  }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const j = (y - y0) * w + (x - x0), bi = owner[j];
    if (bi < 0) continue;
    if (dens < 1 && bay(x, y) >= dens) continue;
    const best = depth[j], [px, py, r] = puffs[bi];
    // round shading: distance from a highlight set up and left in each puff
    const dl = Math.hypot(x + 0.5 - (px - r * 0.34), y + 0.5 - (py - r * 0.4)) / r;
    const t = heat ? (1 - Math.min(1, best * 1.5)) * 0.8 + dl * 0.22 : dl * 0.58 + (best < 0.1 ? 0.2 : 0);
    G.set(x, y, tones[Math.max(0, Math.min(n - 1, Math.floor(t * n)))]);
  }
};

// a one-pixel line of art pixels
const line = (G, x0, y0, x1, y1, k) => {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) G.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, k);
};

// Debris: particle i is flung out along the ground (decelerating), up into
// the air and back down under gravity. Returns [x, y on screen, height].
const fling = (seed, i, p, R, ry, up, grav) => {
  const a = hash(seed, i) * Math.PI * 2, v = 0.4 + 0.6 * hash(seed, i + 40);
  const out = easeOut(p * 1.15);
  const gx = Math.cos(a) * v * R * out, gy = Math.sin(a) * v * ry * out;
  const vz = up * (0.55 + 0.9 * hash(seed, i + 80));
  const z = Math.max(0, vz * p - grav * p * p) * R;
  return [gx, gy - z, z];
};

// ---- blasts ------------------------------------------------------------
// Each blast type paints two layers: "g" (the shockwave and wash on the
// ground, drawn UNDER the crowd so the foes stand in it) and "a" (the
// fireball, flash and flying debris, drawn over them). Only the core is
// ever solid, and it is small: the swarm must stay readable under mass AoE.
const RY = 0.7;                   // ground ellipse: splash is a circle seen at 3/4
const NF = 8;                     // frames per blast

const SMOKE_NEW = pal("#b4a8a4", "#8a7c7e", "#5e505a");
const SMOKE_OLD = pal("#d6cec8", "#aea4a2", "#867c82");
const DUSTC = pal("#e8dab8", "#cdb690", "#a88f68");

// lumps of a cloud: a heart and `n` lobes round it (seeded), scaled by s
const lobes = (cx, cy, r, n, seed, s = 1, spread = 0.6) => {
  const out = [[cx, cy, r * s]];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(seed, i) * 0.8;
    const d = r * spread * s * (0.8 + 0.4 * hash(seed, i + 9));
    out.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, r * s * (0.5 + 0.2 * hash(seed, i + 19))]);
  }
  return out;
};

// A cloud breaking up: from `t0` on, each puff shrinks away on its own clock,
// so smoke and dust come apart in lumps instead of fading as a sheet.
const wane = (puffs, t, t0, seed) => puffs.map(([x, y, r], i) => {
  const end = 0.72 + 0.28 * hash(seed, i + 70);
  const k = clamp01((t - t0) / Math.max(0.05, end - t0));
  return [x, y, r * (1 - k * k * (1.2 - 0.2 * k))];
});

// ember / chip trails: a short line of pixels back along the flight
const trail = (G, seed, i, p, R, ry, up, grav, cx, cy, k) => {
  for (let j = 1; j <= 2; j++) {
    const [x, y] = fling(seed, i, Math.max(0, p - j * 0.03), R, ry, up, grav);
    G.set(cx + x, cy + y, k);
  }
};

const BLAST = {
  boom: {
    g(G, cx, cy, R, ry, p, seed) {
      const rr = 0.3 + 0.7 * easeOut(p / 0.72);
      if (p < 0.3) {
        wash(G, cx, cy, R * rr * 0.95, ry * rr * 0.95, FIRE[1], 80 * (1 - p / 0.3));
        wash(G, cx, cy, R * 0.34, ry * 0.34, CREAM, 110 * (1 - p / 0.3));
      }
      const tones = p < 0.3 ? [FIRE[0], FIRE[1], FIRE[2]] : p < 0.6 ? [FIRE[1], FIRE[2], FIRE[3]] : [FIRE[2], FIRE[3], FIRE[4]];
      ring(G, cx, cy, R * rr, ry * rr, Math.max(2, Math.round(R * 0.075 * (1 - p * 0.5))), tones, p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45);
      // cinders that landed, still glowing on the turf
      if (p > 0.3 && p < 0.9) {
        for (let i = 0; i < 8; i++) {
          if ((i + Math.floor(p * NF)) % 3 === 0) continue;
          const a = hash(seed, i + 200) * Math.PI * 2, d = 0.3 + 0.6 * hash(seed, i + 220);
          const x = cx + Math.cos(a) * R * d, y = cy + Math.sin(a) * ry * d;
          G.set(x, y, p < 0.6 ? FIRE[1] : FIRE[2]); G.set(x + 1, y, FIRE[3]);
        }
      }
    },
    a(G, cx, cy, R, ry, p, seed) {
      const Rf = Math.min(R * 0.5, 44), f = Math.floor(p * NF);
      const base = cy - Rf * 0.55;
      // smoke first: it boils up out of the fireball and thins away
      if (p > 0.2) {
        const q = (p - 0.2) / 0.8;
        const puffs = lobes(cx, base - Rf * 0.35 - q * R * 0.4, Rf * (0.62 + 0.3 * q), 7, seed + 3, 1, 0.8);
        cloud(G, wane(puffs, q, 0.35, seed), q < 0.4 ? SMOKE_NEW : SMOKE_OLD, seed + 5, { dens: q > 0.9 ? 0.6 : 1 });
      }
      // the fireball: a cauliflower of flame that blooms, then sinks into the smoke
      if (p < 0.6) {
        const s = p < 0.12 ? 0.8 + p * 1.7 : 1 - (p - 0.12) * 1.25;
        const tones = p < 0.12 ? [CREAM, CREAM, FIRE[1], FIRE[2]] : p < 0.25 ? [CREAM, FIRE[1], FIRE[2], FIRE[3]]
          : p < 0.42 ? [FIRE[1], FIRE[2], FIRE[3], FIRE[4]] : [FIRE[2], FIRE[3], FIRE[4], FIRE[5]];
        cloud(G, lobes(cx, base - p * R * 0.12, Rf * 0.62, 5, seed + f, s, 0.7), tones, seed * 3 + f, { heat: true });
      }
      // the first instant: a starburst of light
      if (p < 0.13) {
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + 0.2, L = Rf * (k & 1 ? 1.05 : 1.45);
          for (let i = Math.round(Rf * 0.6); i < L; i++) G.set(cx + Math.cos(a) * i, base + Math.sin(a) * i * 0.85, i < L * 0.8 ? CREAM : FIRE[1]);
        }
      }
      // embers, flung out and falling, cooling as they go
      const N = R > 110 ? 18 : 14;
      for (let i = 0; i < N; i++) {
        const [x, y, z] = fling(seed, i, p, R, ry, 1.6, 1.4);
        if (z <= 0 && p > 0.4) continue;
        const k = p < 0.3 ? (i & 1 ? CREAM : FIRE[1]) : p < 0.62 ? FIRE[1 + (i & 1)] : FIRE[3];
        trail(G, seed, i, p, R, ry, 1.6, 1.4, cx, cy - Rf * 0.3, p < 0.5 ? FIRE[2] : FIRE[4]);
        const X = cx + x, Y = cy - Rf * 0.3 + y;
        if (i % 3 === 0) { G.rect(X - 1, Y - 1, 3, 3, k); G.set(X + 1, Y + 1, FIRE[4]); }
        else { G.rect(X - 1, Y - 1, 2, 2, k); G.set(X, Y, FIRE[3]); }
      }
    },
  },
  arcane: {
    g(G, cx, cy, R, ry, p) {
      const rr = 0.25 + 0.75 * easeOut(p / 0.7);
      if (p < 0.4) wash(G, cx, cy, R * rr * 0.95, ry * rr * 0.95, ARC[2], 70 * (1 - p / 0.4));
      const tones = p < 0.35 ? [ARC[0], ARC[1], ARC[2]] : p < 0.65 ? [ARC[1], ARC[2], ARC[3]] : [ARC[2], ARC[3], ARC[4]];
      const dens = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
      ring(G, cx, cy, R * rr, ry * rr, Math.max(2, Math.round(R * 0.065)), tones, dens);
      // a second, fainter ring of runes turning inside the wave
      if (p < 0.8) {
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 + p * 1.4;
          const x = cx + Math.cos(a) * R * rr * 0.78, y = cy + Math.sin(a) * ry * rr * 0.78;
          const k2 = k % 3;
          if (k2 === 0) { G.rect(x - 1, y - 2, 2, 4, ARC[1]); G.set(x + 1, y + 1, ARC[3]); }
          else if (k2 === 1) { G.rect(x - 2, y - 1, 4, 2, ARC[2]); G.set(x - 1, y + 1, ARC[3]); }
          else { G.set(x, y - 2, ARC[1]); G.set(x - 1, y - 1, ARC[1]); G.set(x + 1, y - 1, ARC[1]); G.set(x, y, ARC[2]); G.set(x, y + 1, ARC[3]); }
        }
      }
    },
    a(G, cx, cy, R, ry, p, seed) {
      const Rs = Math.min(R * 0.3, 26), hy = cy - Rs * 0.8, f = Math.floor(p * NF);
      // a pillar of arcane light standing up out of the strike
      if (p < 0.6) {
        const s = 1 - p / 0.6, w = Math.max(1, Rs * 0.8 * s), top = cy - R * (0.55 + 0.35 * (1 - s));
        for (let y = Math.round(top); y <= cy; y++) {
          const u = (cy - y) / (cy - top);                 // 0 at the ground, 1 at the top
          const hw = w * (1 - u * 0.5);
          for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
            const e = Math.abs(x + 0.5 - cx) / hw;
            if (u > 0.6 && bay(x, y) > (1 - u) * 2.2) continue;
            G.set(x, y, e < 0.35 ? CREAM : e < 0.75 ? ARC[1] : ARC[2]);
          }
        }
      }
      if (p < 0.68) {
        const s = 1 - p / 0.68;
        // a violet bloom at the heart
        cloud(G, lobes(cx, hy, Rs * 0.8, 5, seed + f, 0.25 + s * 0.85, 0.7), p < 0.15 ? [CREAM, CREAM, ARC[1], ARC[2]] : p < 0.4 ? [CREAM, ARC[1], ARC[2], ARC[3]] : [ARC[1], ARC[2], ARC[3], ARC[4]], seed + f, { heat: true });
      }
      if (p < 0.5) {
        const s = 1 - p / 0.5;
        // a four-point star: long cross rays, short diagonals
        const L = Rs * 2.4 * s + 3;
        for (let i = -Math.round(L); i <= Math.round(L); i++) {
          const t = Math.abs(i) / L;
          const k = t < 0.35 ? CREAM : t < 0.7 ? ARC[1] : ARC[2];
          G.set(cx + i, hy, k); G.set(cx, hy + i * 0.8, k);
          if (t < 0.3) { G.set(cx + i, hy - 1, ARC[1]); G.set(cx - 1, hy + i * 0.8, ARC[1]); G.set(cx + i, hy + 1, ARC[2]); G.set(cx + 1, hy + i * 0.8, ARC[2]); }
        }
        const Ld = L * 0.42;
        for (let i = 1; i <= Ld; i++) {
          const k = i < Ld * 0.5 ? ARC[1] : ARC[2];
          G.set(cx + i, hy + i, k); G.set(cx - i, hy + i, k); G.set(cx + i, hy - i, k); G.set(cx - i, hy - i, k);
        }
      }
      // motes of spent magic spiralling up out of the blast, trailing light
      if (p > 0.1) {
        const q = (p - 0.1) / 0.9;
        const diamond = (x, y, r, inner, edge) => {
          for (let j = -r - 1; j <= r + 1; j++) for (let i = -r - 1; i <= r + 1; i++) {
            const m = Math.abs(i) + Math.abs(j);
            if (m <= r + 1) G.set(x + i, y + j, m < r ? inner : m === r ? edge : ARC[4]);
          }
        };
        for (let w = 0; w < 6; w++) {
          if (q > 0.8 && w & 1) continue;
          const h0 = hash(seed, w + 500), h1 = hash(seed, w + 510);
          const at = (u) => {
            const a = w * 1.047 + u * 4.2;
            const rad = R * 0.5 * (0.45 + 0.55 * h0) * (1 - u * 0.55);
            return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * RY - u * R * (0.55 + 0.4 * h1) - Rs * 0.2];
          };
          for (let j = 3; j >= 1; j--) {
            const [x, y] = at(Math.max(0, q - j * 0.05));
            if (j === 1) G.rect(x - 1, y - 1, 2, 2, ARC[2]); else G.set(x, y, ARC[3]);
          }
          const [x, y] = at(q);
          diamond(Math.round(x), Math.round(y), q < 0.6 ? 3 : 2, q < 0.55 ? CREAM : ARC[1], ARC[2]);
        }
      }
      // sparkles drifting out and up, twinkling
      for (let i = 0; i < 9; i++) {
        if (p > 0.8 && i & 1) continue;
        const a = hash(seed, i) * Math.PI * 2, v = 0.35 + 0.65 * hash(seed, i + 30);
        const out = easeOut(p * 1.1);
        const x = cx + Math.cos(a) * v * R * 0.9 * out;
        const y = cy + Math.sin(a) * v * ry * 0.9 * out - p * R * 0.45 * (0.4 + hash(seed, i + 60)) - Rs * 0.3;
        const arm = (i + f) % 3 === 0 ? 3 : 2;
        const k = p < 0.45 ? CREAM : ARC[1];
        for (let d = 1; d <= arm; d++) {
          const kk = d === arm ? ARC[3] : ARC[1];
          G.set(x - d, y, kk); G.set(x + d, y, kk); G.set(x, y - d, kk); G.set(x, y + d, kk);
        }
        G.set(x, y, k);
      }
    },
  },
  frost: {
    g(G, cx, cy, R, ry, p, seed) {
      const rr = 0.3 + 0.7 * easeOut(p / 0.7);
      if (p < 0.5) wash(G, cx, cy, R * rr * 0.95, ry * rr * 0.95, ICE[1], 80 * (1 - p / 0.5));
      const tones = p < 0.35 ? [ICE[0], ICE[1], ICE[2]] : p < 0.65 ? [ICE[1], ICE[2], ICE[3]] : [ICE[2], ICE[3], ICE[4]];
      const dens = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
      ring(G, cx, cy, R * rr, ry * rr, Math.max(2, Math.round(R * 0.065)), tones, dens);
      // crystals spiking out of the wavefront
      if (dens > 0.3) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2 + hash(seed, k) * 0.3;
          const ex = Math.cos(a), ey = Math.sin(a);
          const x = cx + ex * R * rr, y = cy + ey * ry * rr;
          const L = 3 + Math.floor(hash(seed, k + 9) * 5 * (1 - p * 0.6));
          const nl = Math.hypot(ex, ey * RY) || 1;
          for (let i = 0; i < L; i++) {
            const X = x + (ex / nl) * i, Y = y + ((ey * RY) / nl) * i - i * 0.7;
            G.set(X, Y, i >= L - 2 ? ICE[0] : ICE[1]); G.set(X + 1, Y, ICE[3]);
          }
        }
      }
    },
    a(G, cx, cy, R, ry, p, seed) {
      const Rs = Math.min(R * 0.26, 22), hy = cy - Rs * 0.7;
      // glittering snow settling out of the air
      if (p > 0.1) {
        for (let k = 0; k < 14; k++) {
          const a = hash(seed, k + 400) * Math.PI * 2, d = Math.sqrt(hash(seed, k + 410)) * 0.9;
          const fall = (1 - p) * R * 0.3 * (0.5 + hash(seed, k + 420));
          if (p > 0.85 && k & 1) continue;
          const x = cx + Math.cos(a) * R * d, y = cy + Math.sin(a) * ry * d - fall;
          const tw = (k + Math.floor(p * NF)) % 3 === 0;
          G.set(x, y, ICE[0]);
          if (tw) { G.set(x - 1, y, ICE[1]); G.set(x + 1, y, ICE[1]); G.set(x, y - 1, ICE[1]); G.set(x, y + 1, ICE[1]); }
          else G.set(x + 1, y + 1, ICE[3]);
        }
      }
      // ice crystals bursting up out of the ground, then shattering
      if (p < 0.72) {
        const grow = Math.min(1, p / 0.18);
        const pts = [];
        for (let k = 0; k < 6; k++) {
          const a = hash(seed, k + 300) * Math.PI * 2, d = 0.15 + 0.4 * hash(seed, k + 310);
          pts.push([cx + Math.cos(a) * R * d, cy + Math.sin(a) * ry * d, k]);
        }
        pts.sort((u, v) => u[1] - v[1]);
        for (const [x, y, k] of pts) {
          const H = Math.round((8 + 12 * hash(seed, k + 320)) * grow * (R > 40 ? 1.3 : 1));
          const hw = 2 + Math.round(hash(seed, k + 330) * 2);
          const lean = (hash(seed, k + 340) - 0.5) * 0.6;
          for (let j = 0; j < H; j++) {
            const w = Math.max(0, Math.round(hw * (1 - j / H)));
            const X = x + lean * j;
            for (let i = -w; i <= w; i++) G.set(X + i, y - j, i < 0 ? ICE[0] : i === 0 ? ICE[1] : ICE[3]);
            G.set(X - w - 1, y - j, ICE[4]); G.set(X + w + 1, y - j, ICE[4]);
          }
          G.set(x + lean * H, y - H, ICE[4]);
          if (p > 0.55) for (let j = 2; j < H; j += 3) G.set(x + lean * j, y - j, ICE[4]);  // cracking
        }
      }
      if (p < 0.4) {
        // a snowflake flash: six arms with little barbs
        const s = 1 - p / 0.4, L = Rs * 1.9 * s + 3;
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + Math.PI / 6, ex = Math.cos(a), ey = Math.sin(a);
          for (let i = 0; i <= L; i++) { G.set(cx + ex * i, hy + ey * i, i < L * 0.5 ? ICE[0] : ICE[1]); G.set(cx + ex * i + 1, hy + ey * i, ICE[2]); }
          const bx = cx + ex * L * 0.6, by = hy + ey * L * 0.6;
          for (const b of [-0.9, 0.9]) {
            const bex = Math.cos(a + b), bey = Math.sin(a + b);
            for (let i = 1; i <= L * 0.28; i++) G.set(bx + bex * i, by + bey * i, ICE[1]);
          }
        }
        G.rect(cx - 2, hy - 2, 4, 4, ICE[0]);
      }
      // ice shards, flung and falling, glinting as they turn
      for (let i = 0; i < 12; i++) {
        const [x, y, z] = fling(seed, i, p, R, ry, 1.7, 1.5);
        const X = cx + x, Y = cy + y;
        if (z <= 0 && p > 0.4) { if (p < 0.85) { G.set(X, Y, ICE[0]); G.set(X + 1, Y, ICE[2]); } continue; }
        const glint = (i + Math.floor(p * NF)) % 3 === 0;
        G.set(X, Y - 2, ICE[0]);
        G.rect(X - 1, Y - 1, 2, 2, glint ? ICE[0] : ICE[1]);
        G.set(X + 1, Y - 1, ICE[2]); G.set(X + 1, Y, ICE[3]); G.set(X, Y + 1, ICE[4]); G.set(X - 1, Y, ICE[2]);
      }
    },
  },
  dust: {
    g(G, cx, cy, R, ry, p, seed) {
      const rr = 0.3 + 0.7 * easeOut(p / 0.7);
      const tones = p < 0.4 ? [DUST[0], DUST[1], DUST[2]] : [DUST[1], DUST[2], DUST[3]];
      ring(G, cx, cy, R * rr, ry * rr, Math.max(2, Math.round(R * 0.07)), tones, p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5);
      // the cloud rolling out along the ground and breaking up
      const n = Math.max(10, Math.min(30, Math.round(R * 0.26))), puffs = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + hash(seed, k) * 0.3;
        const d = rr * (0.7 + 0.14 * hash(seed, k + 5));
        puffs.push([cx + Math.cos(a) * R * d, cy + Math.sin(a) * ry * d - p * R * 0.05, Math.min(R * 0.15, 12) * (0.75 + p * 0.6) * (0.75 + 0.45 * hash(seed, k + 8))]);
      }
      cloud(G, wane(puffs, p, 0.4, seed + 2), DUSTC, seed + 2);
    },
    a(G, cx, cy, R, ry, p, seed) {
      if (p < 0.5) {
        const r = Math.min(R * 0.2, 18) * (0.6 + p * 1.1);
        cloud(G, wane(lobes(cx, cy - r * 0.6 - p * R * 0.15, r, 4, seed + 11, 1, 0.7), p * 2, 0.4, seed + 11), DUSTC, seed + 11);
      }
      // stone chips on high arcs, landing and settling
      for (let i = 0; i < 10; i++) {
        const [x, y, z] = fling(seed, i, p, R * 0.95, ry * 0.95, 1.9, 1.9);
        if (z <= 0 && p > 0.85) continue;
        const X = cx + x, Y = cy + y;
        if (z > 0) trail(G, seed, i, p, R * 0.95, ry * 0.95, 1.9, 1.9, cx, cy, DUST[1]);
        if (i % 3 === 0) {
          G.rect(X - 1, Y - 1, 3, 1, STONE[0]); G.set(X - 1, Y - 1, CREAM);
          G.rect(X - 1, Y, 3, 1, STONE[1]); G.set(X + 1, Y, STONE[2]);
          G.rect(X - 1, Y + 1, 3, 1, STONE[3]);
        } else {
          G.set(X - 1, Y - 1, STONE[0]); G.set(X, Y - 1, STONE[1]);
          G.set(X - 1, Y, STONE[2]); G.set(X, Y, STONE[3]);
        }
      }
    },
  },
};
BLAST.shrapnelhit = BLAST.dust;
const SEEDS = { boom: 3, arcane: 5, frost: 7, dust: 11, shrapnelhit: 13 };

const bucket = (r) => (r <= 16 ? Math.max(6, Math.round(r / 4) * 4) : Math.round(r / 8) * 8);

const blastSprite = (type, rb, f, layer, v) => memo(`${type}|${rb}|${f}|${layer}|${v}`, () => {
  const R = rb * PX, ry = R * RY, p = (f + 0.5) / NF, seed = SEEDS[type] * 17 + v * 101;
  const pad = Math.ceil(R * 0.25) + 6;
  const w = 2 * (R + pad);
  if (layer === "g") {
    const G = grid(w, 2 * Math.ceil(ry + pad));
    const cx = G.W >> 1, cy = G.H >> 1;
    BLAST[type].g(G, cx, cy, R, ry, p, seed);
    return { cv: G.done(), ax: cx, ay: cy };
  }
  const up = Math.ceil(R * 1.25) + pad, dn = Math.ceil(ry) + pad;
  const G = grid(w, up + dn);
  const cx = G.W >> 1, cy = up;
  BLAST[type].a(G, cx, cy, R, ry, p, seed);
  return { cv: G.done(), ax: cx, ay: cy };
}, BIG, 240);

export const isBlast = (t) => t in BLAST;

// Draw one layer of a blast effect ("g" before the actors, "a" after).
export const drawBlast = (ctx, fx, layer) => {
  const life = lifeOf(fx, fx.type === "dust" ? 380 : 320);
  const p = 1 - fx.ttl / life;
  if (p < 0 || p >= 1) return;
  const r = fx.r || (fx.type === "shrapnelhit" ? 9 : 16);
  // one painting per type and size, mirrored for half the blasts
  const flip = !!(((Math.floor(fx.x) * 7 + Math.floor(fx.y) * 3) >>> 0) & 2);
  put(ctx, blastSprite(fx.type, bucket(r), Math.min(NF - 1, Math.floor(p * NF)), layer, 0), fx.x, fx.y, flip);
};

// ---- scorch & rime -----------------------------------------------------
// The mark a blast leaves: dithered soot (or a rime of frost) with a burnt,
// crumbling edge, fading out in a few hard steps.
const scorchSprite = (rb, frost, v) => memo(`sc|${rb}|${frost ? 1 : 0}|${v}`, () => {
  const R = rb * PX, ry = R * 0.6, seed = 31 + v * 7 + (frost ? 50 : 0);
  const G = grid(2 * R + 6, 2 * ry + 6), cx = G.W >> 1, cy = G.H >> 1;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const nx = (x + 0.5 - cx) / R, ny = (y + 0.5 - cy) / ry;
    const n = Math.sqrt(nx * nx + ny * ny) + (vnoise(x, y, Math.max(3, R * 0.28), seed) - 0.5) * 0.55;
    if (n > 1) continue;
    const b = bay(x, y);
    if (!frost) {
      if (n < 0.42) { if (b < 0.88) G.set(x, y, SOOT[0], 150); }
      else if (n < 0.7) { if (b < 0.56) G.set(x, y, SOOT[1], 128); }
      else if (b < 0.25) G.set(x, y, SOOT[2], 105);
    } else {
      if (n < 0.45) { if (b < 0.5) G.set(x, y, ICE[1], 175); }
      else if (n < 0.75) { if (b < 0.3) G.set(x, y, ICE[2], 150); }
      else if (b < 0.12) G.set(x, y, ICE[0], 170);
    }
  }
  if (frost) {
    // a few crystals of rime catching the light
    for (let k = 0; k < Math.max(3, R / 5); k++) {
      const a = hash(seed, k) * Math.PI * 2, d = Math.sqrt(hash(seed, k + 20)) * 0.75;
      const x = cx + Math.cos(a) * R * d, y = cy + Math.sin(a) * ry * d;
      G.set(x, y, ICE[0]); G.set(x - 1, y, ICE[1], 200); G.set(x + 1, y, ICE[1], 200); G.set(x, y - 1, ICE[1], 200); G.set(x, y + 1, ICE[2], 200);
    }
  } else {
    // cracked, blackened turf: a few dark streaks raying out of the heart
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + hash(seed, k) * 0.9, L = 0.5 + 0.4 * hash(seed, k + 3);
      for (let i = 2; i < L * R; i++) {
        const x = cx + Math.cos(a) * i + (hash(seed, k * 40 + i) - 0.5) * 1.5, y = cy + Math.sin(a) * i * 0.6;
        G.set(x, y, SOOT[0], 170);
      }
    }
  }
  return { cv: G.done(), ax: cx, ay: cy };
});

export const drawScorch = (ctx, fx) => {
  const life = fx.life || 2600, fade = fx.ttl / life;
  if (fade <= 0) return;
  const r = Math.max(6, fx.r || 14);
  const rb = r <= 20 ? Math.round(r / 3) * 3 : Math.round(r / 5) * 5;
  const v = Math.floor(fx.seed || 0) % 3;
  const a = stepA(fade * 1.6, 5);
  if (a < 1) { ctx.save(); ctx.globalAlpha *= a; }
  put(ctx, scorchSprite(rb, !!fx.frost, v), fx.x, fx.y);
  if (a < 1) ctx.restore();
  // fresh soot still has a few embers winking in it
  if (!fx.frost && fade > 0.72) {
    for (let i = 0; i < 4; i++) {
      if ((Math.floor(fx.ttl / 110) + i) % 3 === 0) continue;
      const ang = hash(Math.floor(fx.seed * 100), i) * 6.283, d = r * 0.4 * hash(Math.floor(fx.seed * 100), i + 9);
      ctx.fillStyle = i & 1 ? "#f0a040" : "#f8d868";
      ctx.fillRect(Math.round((fx.x + Math.cos(ang) * d) * 2) / 2, Math.round((fx.y + Math.sin(ang) * d * 0.6) * 2) / 2, 0.5, 0.5);
    }
  }
};

// ---- pixel strokes drawn live -----------------------------------------
// A line of art-pixel stamps, added to the current path. Filled once as a
// union, so a translucent line never doubles up where stamps overlap.
const stampLine = (ctx, x0, y0, x1, y1, s) => {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * PX));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    ctx.rect(Math.round((x - s / 2) * PX) / PX, Math.round((y - s / 2) * PX) / PX, s, s);
  }
};

// An expanding ring (novas, waves, level-ups) as a ring of art pixels
// rather than an antialiased stroke.
export const ringPx = (ctx, x, y, rx, ry, th, color) => {
  if (rx < 1) return;
  const n = Math.max(16, Math.ceil((Math.PI * 2 * Math.max(rx, ry)) / (th * 0.6)));
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.rect(Math.round((x + Math.cos(a) * rx - th / 2) * PX) / PX, Math.round((y + Math.sin(a) * ry - th / 2) * PX) / PX, th, th);
  }
  ctx.fill();
};

// ---- lightning -----------------------------------------------------------
// Chain lightning between struck foes: a jagged white-hot core in a cyan
// glow, re-forked every few frames so it flickers, with little side forks.
const BOLT_TONES = [
  ["#5ab4f0", "#bfeeff", "#ffffff"],
  ["#3a7ad0", "#8ad0f8", "#e8f8ff"],
  ["#2e5aa8", "#6aa8e0", "#a8dcf8"],
];
export const drawChain = (ctx, fx) => {
  const life = lifeOf(fx, 220), age = life - fx.ttl, p = age / life;
  if (p >= 1 || !fx.pts || fx.pts.length < 2) return;
  const fr = Math.floor(age / 55), sd = Math.floor((fx.seed || 0) * 1000);
  const segs = [];
  for (let s = 0; s < fx.pts.length - 1; s++) {
    const [x1, y1] = fx.pts[s], [x2, y2] = fx.pts[s + 1];
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    const n = Math.max(2, Math.round(len / 9)), amp = Math.min(8, len * 0.14);
    let px = x1, py = y1;
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const j = k === n ? 0 : (hash(sd + fr * 97, s * 31 + k) - 0.5) * 2 * amp * Math.sqrt(Math.sin(t * Math.PI));
      const qx = x1 + (x2 - x1) * t + nx * j, qy = y1 + (y2 - y1) * t + ny * j;
      segs.push([px, py, qx, qy, 0]);
      // now and then a fork splits off and dies
      if (k < n && hash(sd + fr * 53, s * 17 + k) > 0.72) {
        const side = hash(sd + fr, s * 7 + k) > 0.5 ? 1 : -1;
        let bx = qx, by = qy, ba = Math.atan2(y2 - y1, x2 - x1) + side * (0.6 + 0.6 * hash(sd, k + s * 5));
        for (let b = 0; b < 3; b++) {
          const L = 4 + 4 * hash(sd + fr * 11, s * 13 + k * 3 + b);
          const ex = bx + Math.cos(ba) * L, ey = by + Math.sin(ba) * L;
          segs.push([bx, by, ex, ey, 1]);
          bx = ex; by = ey; ba += (hash(sd + b, fr + k) - 0.5) * 1.2;
        }
      }
      px = qx; py = qy;
    }
  }
  const tones = BOLT_TONES[p < 0.45 ? 0 : p < 0.75 ? 1 : 2];
  // glow edge, translucent, as one union
  ctx.save();
  ctx.globalAlpha *= p < 0.75 ? 0.45 : 0.3;
  ctx.fillStyle = tones[0]; ctx.beginPath();
  for (const [a, b, c, d, fork] of segs) stampLine(ctx, a, b, c, d, fork ? 2 : 3.5);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = tones[1]; ctx.beginPath();
  for (const [a, b, c, d, fork] of segs) stampLine(ctx, a, b, c, d, fork ? 1 : 1.5);
  ctx.fill();
  if (p < 0.75) {
    ctx.fillStyle = tones[2]; ctx.beginPath();
    for (const [a, b, c, d, fork] of segs) if (!fork) stampLine(ctx, a, b, c, d, 0.5);
    ctx.fill();
  }
  // a hot star where it bit
  if (p < 0.55) for (let s = 1; s < fx.pts.length; s++) put(ctx, sparkSprite("zap", Math.min(2, Math.floor(p * 5))), fx.pts[s][0], fx.pts[s][1]);
};

// ---- little stars: sparks, hits, pierces, zaps -------------------------
const STAR = {
  white: pal("#ffffff", "#e8e4dc", "#a8a4b0"),
  gold: pal("#fff3d2", "#f4cc50", "#b8862a"),
  hit: pal("#fff3d2", "#f08070", "#b83a3a"),
  zap: pal("#ffffff", "#bfeeff", "#5ab4f0"),
};
const sparkSprite = (kind, f) => memo(`sp|${kind}|${f}`, () => {
  const T = STAR[kind], G = grid(19, 19), c = 9;
  if (f === 0) {
    for (let i = -4; i <= 4; i++) { const k = Math.abs(i) < 2 ? T[0] : T[1]; G.set(c + i, c, k); G.set(c, c + i, k); }
    for (let i = 1; i <= 2; i++) { G.set(c + i, c + i, T[2]); G.set(c - i, c + i, T[2]); G.set(c + i, c - i, T[2]); G.set(c - i, c - i, T[2]); }
    G.rect(c - 1, c - 1, 3, 3, T[0]);
  } else {
    const d0 = f === 1 ? 3 : 5, L = f === 1 ? 3 : 2;
    for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
      const diag = ex && ey;
      if (f === 2 && diag) continue;
      for (let i = 0; i < L; i++) G.set(c + ex * (d0 + i), c + ey * (d0 + i), i === 0 ? T[f === 1 ? 0 : 1] : T[f === 1 ? 1 : 2]);
    }
    if (f === 1) G.set(c, c, T[1]);
  }
  return { cv: G.done(), ax: c, ay: c };
});
export const drawSpark = (ctx, fx, kind, dflt) => {
  const life = lifeOf(fx, dflt), p = 1 - fx.ttl / life;
  if (p >= 1) return;
  put(ctx, sparkSprite(kind, Math.min(2, Math.floor(p * 3))), fx.x, fx.y);
};

// a puff of smoke where a soldier vanishes or a trap springs
const poofSprite = (f) => memo(`pf|${f}`, () => {
  const G = grid(40, 30), cx = 20, cy = 18, p = (f + 0.5) / 4;
  const T = pal("#f8f4ec", "#d8d0c8", "#aaa2a4", "#7e7680");
  const dens = p < 0.5 ? 1 : 1 - (p - 0.5) * 1.6;
  for (let j = 0; j < 4; j++) {
    const a = j * 1.7 + 0.4, d = 3 + p * 9;
    ball(G, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6 - p * 5, 4.5 + p * 3.5, T, 70 + j, dens, 0.3, 0.7);
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
export const drawPoof = (ctx, fx) => {
  const life = lifeOf(fx, 400), p = 1 - fx.ttl / life;
  if (p >= 1) return;
  put(ctx, poofSprite(Math.min(3, Math.floor(p * 4))), fx.x, fx.y);
};

// the white bloom of an upgrade: a dithered flash and a bright rim
const flashSprite = (f) => memo(`fl|${f}`, () => {
  const fa = 1 - (f + 0.5) / 6, r = 34 * (1.4 - fa) * PX;
  const G = grid(2 * r + 4, 2 * r + 4), c = G.W >> 1;
  wash(G, c, c, r, r, CREAM, 130 * fa + 10);
  ring(G, c, c, r, r, 2, pal("#ffffff", "#f4ecd0"), fa + 0.2);
  return { cv: G.done(), ax: c, ay: c };
}, BIG);
export const drawFlash = (ctx, fx) => {
  const f = Math.min(5, Math.floor((1 - fx.ttl / 450) * 6));
  if (f < 0) return;
  put(ctx, flashSprite(Math.max(0, f)), fx.x, fx.y);
};

// ---- shots in flight -------------------------------------------------------
// Rotating shots (arrows, spikes, quarrels, musket balls) are baked at one
// of 32 headings: each art pixel of the turned sprite samples the upright
// shape, so the result is crisp pixels at any angle, not a rotated blur.
const DIRS = 32;
const dirOf = (ang) => ((Math.round((ang / (Math.PI * 2)) * DIRS) % DIRS) + DIRS) % DIRS;
const rotSprite = (key, d, reach, shape, tones, ink, streak) => memo(`${key}|${d}`, () => {
  const a = (d / DIRS) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
  const half = Math.ceil(reach) + 3, G = grid(half * 2, half * 2);
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const dx = x + 0.5 - half, dy = y + 0.5 - half;
    const k = shape(dx * c + dy * s, -dx * s + dy * c);
    if (k >= 0) G.set(x, y, tones[k]);
  }
  const cv = G.done(ink);
  if (streak) {
    // the motion streak sits behind, un-inked and fading
    const [from, len, k, a0] = streak;
    const S2 = grid(half * 2, half * 2);
    for (let i = 0; i < len; i++) {
      const lx = -from - i;
      S2.set(half + lx * c, half + lx * s, k, Math.round(a0 * (1 - i / len)));
    }
    const cx = cv.getContext("2d");
    cx.globalCompositeOperation = "destination-over";
    cx.drawImage(S2.done(), 0, 0);
    cx.globalCompositeOperation = "source-over";
  }
  return { cv, ax: half, ay: half };
});

// an arrow along +x, head at the origin: steel head, shaft, fletching
const arrowShape = (L, hw = 0.46) => (lx, ly) => {
  const ay = Math.abs(ly);
  if (lx > 0.6 || lx < -L - 1) return -1;
  if (lx > -5) return ay <= -lx * hw + 0.35 ? (ly < 0 ? 0 : 1) : -1;
  const back = lx + L + 1;                                // 0 at the nock
  if (back < 6 && ay > 0.6 && ay <= 0.6 + (6 - back) * 0.38) return ly < 0 ? 3 : 4;
  return ay <= 0.62 ? 2 : -1;
};
const ARROW = {
  plain: [pal("#eef0f4", "#9aa0ac", "#c49a64", "#f0ece0", "#c8483c"), 9],
  poison: [pal("#d8f0c0", "#6a9a4a", "#b89060", "#b8e08a", "#4a8a34"), 9],
  pierce: [pal("#fff3d2", "#c89a30", "#c49a64", "#f8e08a", "#c89a30"), 9],
  big: [pal("#eef0f4", "#8a909c", "#8a6444", "#f0ece0", "#a8483c"), 13],
  quarrel: [pal("#dfe2e8", "#8a909c", "#5a4436", "#bab4aa", "#7a746c"), 7],
};
const STREAK = { plain: "#f4ecd8", poison: "#c8f0a0", pierce: "#f8e08a", big: "#f4ecd8", quarrel: "#e8e2d4" };
const arrowSprite = (v, d) => {
  const [tones, len] = ARROW[v], L = len * PX;
  return rotSprite(`ar|${v}`, d, L + 22, arrowShape(L, v === "big" ? 0.55 : 0.46), tones, INK_LINE, [L + 2, v === "big" ? 20 : 14, col(STREAK[v]), v === "pierce" ? 170 : 110]);
};

const SPIKE = { steel: pal("#eef0f4", "#9aa0ac", "#6a5040"), ice: pal("#f0fcff", "#6ab8d8", "#3a6a98"), gold: pal("#fff0a0", "#c08e2a", "#7a5a2a") };
// a thrown spike: a long needle blade, a collar, and a stub of a grip
const spikeShape = (lx, ly) => {
  const ay = Math.abs(ly);
  if (lx > 0.5 || lx < -15) return -1;
  if (lx > -10) return ay <= -lx * 0.16 + 0.3 ? (ly < 0 ? 0 : 1) : -1;
  if (lx > -12) return ay <= 2.1 ? 2 : -1;
  return ay <= 0.8 ? 2 : -1;
};
const ballShape = (lx, ly) => {
  const d = Math.hypot(lx + 1, ly);
  return d <= 2.2 ? (lx > -1 && ly < 0 ? 0 : 1) : -1;
};

// orbs: a lit core in a dithered halo that breathes over four frames
const ORB = {
  arcane: pal("#fff3d2", "#e4d0fc", "#b08ad8", "#6a4a9a"),
  fire: pal("#fff3d2", "#f8d868", "#e8803a", "#9a3a30"),
  frost: pal("#ffffff", "#d4f2fa", "#8ccce4", "#3a7aa8"),
  gold: pal("#fff3d2", "#f8e088", "#d8b34a", "#8a6a2a"),
};
const orbSprite = (el, f) => memo(`orb|${el}|${f}`, () => {
  const T = ORB[el], G = grid(38, 38), c = 19, r0 = 7, halo = 6 + [0, 1, 2, 1][f];
  for (let y = 0; y < 38; y++) for (let x = 0; x < 38; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    if (d <= r0) {
      const dl = Math.hypot(dx + 2.2, dy + 2.2) / r0;
      let k = dl < 0.42 ? 0 : dl < 0.95 ? 1 : 2;
      if (d > r0 - 1.2 && dx + dy > 1) k = 3;
      G.set(x, y, T[k]);
    } else if (d < r0 + halo && bay(x, y) < 0.6 * (1 - (d - r0) / halo)) G.set(x, y, T[d < r0 + 2 ? 1 : 2], 190);
  }
  // two glints wheeling round the rim
  const a = f * (Math.PI / 2) + 0.4;
  for (const s of [0, Math.PI]) G.set(c + Math.cos(a + s) * (r0 + 3), c + Math.sin(a + s) * (r0 + 3), T[0]);
  return { cv: G.done(), ax: c, ay: c };
});

// boulders: a lumpy lit stone that tumbles through four turns
const ROCK_R = { mini: 2.3, rock: 3.9, big: 5.6 };
const rockSprite = (size, f) => memo(`rk|${size}|${f}`, () => {
  const r = ROCK_R[size] * PX, n = Math.ceil(r * 1.3) + 3, G = grid(n * 2, n * 2), c = n;
  const rot = f * (Math.PI / 2);
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    const R = r * (0.9 + 0.1 * Math.sin(3 * th + rot + 1) + 0.06 * Math.sin(5 * th - rot * 2));
    if (d > R) continue;
    const l = -(dx * 0.55 + dy * 0.64) / R;
    G.set(x, y, STONE[l > 0.3 ? 0 : l > -0.25 ? 1 : 2]);
  }
  // pits and a crack that turn with the stone
  for (let k = 0; k < 3; k++) {
    const a = rot + k * 2.1 + 0.3, d = r * 0.45;
    const x = c + Math.cos(a) * d, y = c + Math.sin(a) * d;
    G.set(x, y, STONE[3]); if (size !== "mini") { G.set(x + 1, y, STONE[2]); G.set(x, y - 1, STONE[0]); }
  }
  return { cv: G.done(INK_LINE), ax: c, ay: c };
});

// the bombardier's shell: an iron ball with a lit fuse
const shellSprite = (f) => memo(`sh|${f}`, () => {
  const T = pal("#a4a8b8", "#5e6070", "#34343e"), r = 6.4, G = grid(22, 22), c = 11;
  for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    if (d > r) continue;
    const dl = Math.hypot(dx + 2, dy + 2) / r;
    G.set(x, y, T[dl < 0.5 ? 0 : d > r - 1.3 && dx + dy > 0 ? 2 : 1]);
  }
  const a = f * (Math.PI / 2) - 2.2;
  for (let i = 0; i < 3; i++) G.set(c + Math.cos(a) * (r + i), c + Math.sin(a) * (r + i), col("#c8a060"));
  return { cv: G.done(INK_LINE), ax: c, ay: c };
});

// a flat pixel shadow on the ground under something in the air
const shadowSprite = (rx2) => memo(`sd|${rx2}`, () => {
  const rx = (rx2 / 2) * PX, ry = Math.max(1.5, rx * 0.45), G = grid(rx * 2 + 2, ry * 2 + 2), cx = G.W >> 1, cy = G.H >> 1;
  const k = col("#241a26");
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    if (nx * nx + ny * ny <= 1) G.set(x, y, k, 80);
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
const groundShadow = (ctx, x, y, rx) => put(ctx, shadowSprite(Math.max(2, Math.round(rx * 2))), x, y);

// a live speck in world units, snapped to the art grid
const speck = (ctx, x, y, s, k) => {
  ctx.fillStyle = k;
  ctx.fillRect(Math.round(x * PX) / PX, Math.round(y * PX) / PX, s, s);
};

const orbElement = (p) => (p.midas ? "gold" : p.burn || p.poolDps ? "fire" : p.slow ? "frost" : "arcane");
const TRAIL = {
  arcane: ["#fff3d2", "#e4d0fc", "#b890e8", "#8a64c8"],
  fire: ["#fff3d2", "#f8d868", "#f0a040", "#d8683a"],
  frost: ["#ffffff", "#d4f2fa", "#9fd4e8", "#62a4cc"],
  gold: ["#fff3d2", "#f8e088", "#d8b34a", "#a8842e"],
};

// how far along an arcing shot is (0..1); shells never carried a start, so
// the first time one is drawn it is remembered
const flight = (p) => {
  if (p.sx === undefined && p._sx === undefined) { p._sx = p.x; p._sy = p.y; }
  const sx = p.sx ?? p._sx, sy = p.sy ?? p._sy;
  const tot = p.total || Math.hypot(p.tx - sx, p.ty - sy);
  if (!(tot > 0)) return [1, 0];
  return [clamp01(1 - Math.hypot(p.tx - p.x, p.ty - p.y) / tot), tot];
};

export const drawProjectile = (ctx, p, time) => {
  const ang = p.angle ?? Math.atan2(p.ty - p.y, p.tx - p.x);
  const dx = Math.cos(ang), dy = Math.sin(ang);
  if (p.kind === "ball") {
    put(ctx, rotSprite("mb", dirOf(ang), 30, ballShape, pal("#a4a4b0", "#34343e"), INK_LINE, [4, 26, col("#fff3d2"), 230]), p.x, p.y);
    return;
  }
  if (p.kind === "shell") {
    const [prog] = flight(p);
    const h = Math.sin(prog * Math.PI) * 26;
    groundShadow(ctx, p.x, p.y + 2, 3.4 * (1 - h / 60));
    const f = Math.floor(prog * 10 + (p.src || 0)) & 3;
    const y = p.y - h;
    put(ctx, shellSprite(f), p.x, y);
    // the fuse spits
    const a = f * (Math.PI / 2) - 2.2, fx = p.x + Math.cos(a) * 5, fy = y + Math.sin(a) * 5;
    const hot = Math.sin(time * 40 + p.x) > 0;
    speck(ctx, fx - 0.5, fy - 0.5, 1, hot ? "#fff3d2" : "#f8d868");
    speck(ctx, fx + (hot ? 1 : -1), fy - 1, 0.5, "#f0a040");
    return;
  }
  if (p.kind === "rock") {
    const [prog, tot] = flight(p);
    const hMax = Math.min(64, tot * 0.24);
    const h = Math.sin(prog * Math.PI) * hMax;
    const size = p.mini ? "mini" : p.big ? "big" : "rock";
    const r = ROCK_R[size];
    groundShadow(ctx, p.x + 1, p.y + 1, r * (1.3 - 0.4 * (h / (hMax || 1))));
    // a thin trail of grit on the way up
    if (!p.mini) {
      for (let i = 1; i <= 3; i++) {
        const u = prog - i * 0.035;
        if (u <= 0.02) break;
        const sx = p.sx ?? p._sx, sy = p.sy ?? p._sy;
        const px = sx + (p.tx - sx) * u, py = sy + (p.ty - sy) * u - Math.sin(u * Math.PI) * hMax;
        speck(ctx, px, py, i === 1 ? 1 : 0.5, i === 1 ? "#a48a64" : "#cdb68a");
      }
    }
    put(ctx, rockSprite(size, Math.floor(prog * 12 + (p.id || 0)) & 3), p.x, p.y - h);
    return;
  }
  if (p.kind === "arrow") {
    const v = p.poison ? "poison" : p.big ? "big" : p.pierce ? "pierce" : "plain";
    put(ctx, arrowSprite(v, dirOf(ang)), p.x, p.y);
    if (p.burn) {
      // a pitch-soaked head, burning in flight
      const hot = Math.sin(time * 36 + p.id) > 0;
      speck(ctx, p.x - dx * 2 - 0.5, p.y - dy * 2 - 1.5, 1, hot ? "#f8d868" : "#f0a040");
      speck(ctx, p.x - dx * 4, p.y - dy * 4 - 2, 0.5, "#d8683a");
    }
    return;
  }
  if (p.kind === "spike") {
    const k = p.slow ? "ice" : p.hitsLeft > 1 ? "gold" : "steel";
    put(ctx, rotSprite(`spk|${k}`, dirOf(ang), 26, spikeShape, SPIKE[k], INK_LINE, [16, 10, col(p.slow ? "#d4f2fa" : "#f4ecd8"), 110]), p.x + dx * 3, p.y + dy * 3);
    return;
  }
  // an orb: sparks trailing off it in its element, then the orb itself
  const el = orbElement(p), T = TRAIL[el];
  for (let i = 1; i <= 8; i++) {
    const wob = Math.sin(time * 14 + i * 1.3 + (p.id || 0)) * i * 0.4;
    const rise = el === "fire" ? -i * 0.6 : el === "frost" ? i * 0.25 : 0;
    speck(ctx, p.x - dx * (3 + i * 2.4) - dy * wob, p.y - dy * (3 + i * 2.4) + dx * wob + rise, i < 4 ? 1 : 0.5, T[Math.min(3, i >> 1)]);
  }
  put(ctx, orbSprite(el, Math.floor(time * 12 + (p.id || 0)) & 3), p.x, p.y);
};

// a quarrel or harpoon (the "bolt" effect that carries x/tx, not pts)
export const drawQuarrel = (ctx, fx) => {
  const life = lifeOf(fx, 170), prog = 1 - fx.ttl / life;
  if (prog >= 1) return;
  const ang = Math.atan2(fx.ty - fx.y, fx.tx - fx.x);
  const u = Math.min(1, prog * 1.25);
  const hx = fx.x + (fx.tx - fx.x) * u, hy = fx.y + (fx.ty - fx.y) * u;
  if (u < 1) put(ctx, arrowSprite("quarrel", dirOf(ang)), hx, hy);
  else put(ctx, sparkSprite("white", Math.min(2, Math.floor((prog - 0.8) * 15))), fx.tx, fx.ty);
};

// ---- floating numbers ----------------------------------------------------
// A little arcade font for coin pops: 5x7 glyphs, shaded top to bottom in
// three tones and inked, with a minted coin beside the number.
const FONT = {
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  3: ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  5: ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  6: ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  9: [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
};
const TEXT_TONES = {
  gold: pal("#fff6c8", "#f4cc50", "#d0962a"),
  red: pal("#ffdcd2", "#f06a58", "#b83a3a"),
};
const coinIcon = (G, x0, y0, D) => {
  const r = D / 2, cx = x0 + r, cy = y0 + r;
  const K = pal("#fff3d2", "#eac452", "#c8962e", "#9a6a22");
  for (let y = y0; y < y0 + D; y++) for (let x = x0; x < x0 + D; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy) / r;
    if (d > 1) continue;
    const l = -(dx * 0.6 + dy * 0.7) / r;
    let k = d > 0.72 ? (l > 0 ? 1 : 3) : l > 0.35 ? 0 : 1;
    if (d > 0.5 && d <= 0.72 && l < -0.1) k = 2;          // the struck ring
    G.set(x, y, K[k]);
  }
  for (let i = -Math.floor(r * 0.35); i <= Math.floor(r * 0.35); i++) G.set(cx, cy + i, K[2]);
};
const textSprite = (text, big, red) => memo(`tx|${text}|${big ? 1 : 0}|${red ? 1 : 0}`, () => {
  const coin = !red && /^\+\d+g?$/.test(text);
  const s = coin ? text.replace(/g$/, "") : text;
  const T = TEXT_TONES[red ? "red" : "gold"];
  const pad = 3;
  if ([...s].every((ch) => FONT[ch])) {
    const gp = big ? 4 : 3, ic = coin ? (big ? 22 : 17) : 0, gap = coin ? 3 : 0;
    const tw = s.length * 6 * gp - gp, th = 7 * gp;
    const G = grid(pad * 2 + ic + gap + tw, pad * 2 + Math.max(th, ic));
    const ty = pad + Math.floor((Math.max(th, ic) - th) / 2);
    if (coin) coinIcon(G, pad, pad + Math.floor((Math.max(th, ic) - ic) / 2), ic);
    [...s].forEach((ch, i) => {
      FONT[ch].forEach((row, ry) => {
        for (let rx = 0; rx < 5; rx++) {
          if (row[rx] !== "#") continue;
          G.rect(pad + ic + gap + i * 6 * gp + rx * gp, ty + ry * gp, gp, gp, T[ry < 2 ? 0 : ry < 5 ? 1 : 2]);
        }
      });
    });
    const cv = G.done(INK_LINE, 2);
    return { cv, ax: cv.width >> 1, ay: cv.height >> 1 };
  }
  // anything else (banners, notices): the system font, thresholded to hard
  // pixels, shaded in the same bands and inked the same way
  const fs = big ? 26 : 20;
  const m = document.createElement("canvas").getContext("2d");
  m.font = `bold ${fs}px monospace`;
  const w = Math.ceil(m.measureText(s).width) + pad * 2 + 4, h = Math.ceil(fs * 1.25) + pad * 2;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d", { willReadFrequently: true });
  c.font = `bold ${fs}px monospace`; c.textBaseline = "middle"; c.textAlign = "center";
  c.fillStyle = "#fff"; c.fillText(s, w / 2, h / 2 + 1);
  const img = c.getImageData(0, 0, w, h), d = img.data;
  const top = h / 2 - fs * 0.4, bot = h / 2 + fs * 0.4;
  for (let y = 0; y < h; y++) {
    const k = T[y < top + (bot - top) * 0.3 ? 0 : y < top + (bot - top) * 0.72 ? 1 : 2];
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] > 110) { d[i] = k[0]; d[i + 1] = k[1]; d[i + 2] = k[2]; d[i + 3] = 255; } else d[i + 3] = 0;
    }
  }
  c.putImageData(img, 0, 0);
  inkOutline(cv, INK_LINE, 2);
  return { cv, ax: w >> 1, ay: h >> 1 };
});
// coin pops and leak numbers: rise with an easing, hold, then fade in steps
export const drawFloatText = (ctx, fx, red = false) => {
  const life = lifeOf(fx, 700), t = clamp01(1 - fx.ttl / life);
  const rise = easeOut(t * 1.4) * (fx.big ? 10 : 14);
  const a = stepA(fx.ttl / 300, 4);
  if (a <= 0) return;
  if (a < 1) { ctx.save(); ctx.globalAlpha *= a; }
  // a leak off the wall is news: always the big type
  put(ctx, textSprite(String(fx.text || (red ? "-1" : "")), !!fx.big || red, red), fx.x, fx.y - rise - (red ? 14 : 0));
  if (a < 1) ctx.restore();
};

// ---- status tells on a foe -------------------------------------------------
// Cheap by construction: a handful of cached little sprites per foe, no
// gradients, no blur — there may be three hundred of them on fire at once.
const flameSprite = (f) => memo(`flm|${f}`, () => {
  const G = grid(11, 18), base = 17, H = [15, 12, 16, 13][f], sway = [0, -1, 0, 1][f];
  for (let y = 0; y < 18; y++) for (let x = 0; x < 11; x++) {
    const t = (base - (y + 0.5)) / H;
    if (t < 0 || t > 1) continue;
    const w = 4.2 * Math.sqrt(Math.min(1, t / 0.22 + 0.15)) * (t > 0.3 ? 1 - (t - 0.3) / 0.72 : 1);
    const cx = 5.5 + sway * t * t * 2.5;
    const dx = Math.abs(x + 0.5 - cx) / Math.max(0.5, w);
    if (dx > 1) continue;
    const h = (1 - dx) * (1 - t * 0.85);
    G.set(x, y, h > 0.5 ? FIRE[0] : h > 0.3 ? FIRE[1] : h > 0.12 ? FIRE[2] : FIRE[3]);
  }
  return { cv: G.done("#7a2a2a"), ax: 5, ay: 17 };
});
const crustSprite = (sb) => memo(`ice|${sb}`, () => {
  const rx = sb * 0.72 * PX, ry = Math.max(3, rx * 0.36), G = grid(rx * 2 + 4, ry * 2 + 12);
  const cx = G.W >> 1, cy = G.H - Math.ceil(ry) - 2;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    const n = Math.sqrt(nx * nx + ny * ny) + (vnoise(x, y, 3, sb) - 0.5) * 0.4;
    if (n > 1) continue;
    const b = bay(x, y);
    if (n > 0.8) G.set(x, y, ICE[ny < 0 ? 2 : 3], 235);
    else G.set(x, y, ICE[ny < -0.25 ? 0 : ny < 0.35 ? 1 : 2], b < 0.85 ? 225 : 150);
  }
  // shards of ice standing up round the feet
  const n = Math.max(3, Math.round(sb / 4));
  for (let k = 0; k < n; k++) {
    const x = cx + ((k + 0.5) / n - 0.5) * rx * 1.6 + (hash(sb, k) - 0.5) * 3;
    const L = 3 + Math.floor(hash(sb, k + 9) * 4);
    const y0 = cy + (hash(sb, k + 3) - 0.3) * ry;
    for (let i = 0; i < L; i++) { G.set(x, y0 - i, i === L - 1 ? ICE[0] : ICE[1]); G.set(x + 1, y0 - i, i === L - 1 ? ICE[1] : ICE[3]); }
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
const bubbleSprite = (big) => memo(`bub|${big ? 1 : 0}`, () => {
  const G = grid(10, 10), K = pal("#f6ffd0", "#d0f060", "#98c83a", "#5a8a2a");
  const r = big ? 3.6 : 2.2, c = 5;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    if (d > r) continue;
    G.set(x, y, d > r - 1.1 ? K[dx + dy > 0 ? 3 : 1] : K[2], d > r - 1.1 ? 255 : 170);
  }
  G.set(c - 1, c - 1 - (big ? 1 : 0), K[0]);
  if (big) G.set(c - 2, c - 1, K[0]);
  return { cv: G.done(INK_LINE), ax: c, ay: c };
});
const crackSprite = (sb) => memo(`crk|${sb}`, () => {
  const R = sb * 0.42 * PX, G = grid(R * 2 + 6, R * 2.4 + 6), cx = G.W >> 1, cy = G.H >> 1;
  for (let k = 0; k < 3; k++) {
    let x = cx + (hash(sb, k) - 0.5) * 3, y = cy + (hash(sb, k + 7) - 0.5) * 4;
    let a = (k / 3) * Math.PI * 2 + hash(sb, k + 2);
    for (let s = 0; s < 4; s++) {
      const L = 3 + Math.floor(hash(sb * 3 + k, s) * 3);
      const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L * 1.2;
      line(G, x + 1, y + 1, ex + 1, ey + 1, ICE[4]);
      line(G, x + 1, y, ex + 1, ey, ICE[2]);
      line(G, x, y, ex, ey, ICE[0]);
      x = ex; y = ey; a += (hash(sb + k, s + 20) - 0.5) * 1.8;
    }
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
const plusSprite = () => memo("plus", () => {
  const G = grid(11, 11), K = pal("#f0ffe8", "#9aee9a", "#4aa84a");
  G.rect(4, 1, 3, 9, K[1]); G.rect(1, 4, 9, 3, K[1]); G.rect(4, 4, 3, 3, K[0]); G.set(4, 1, K[0]); G.set(4, 2, K[0]);
  G.rect(6, 7, 1, 3, K[2]); G.rect(7, 6, 3, 1, K[2]);
  return { cv: G.done(INK_LINE), ax: 5, ay: 5 };
});
const sizeBucket = (s) => Math.max(8, Math.min(40, Math.round((s || 14) / 4) * 4));

// Burning, chilled, poisoned, cracked, mended: drawn over the foe's body.
// `feet` is its ground line and `top` the crown of its head, in world units.
export const drawStatus = (ctx, e, time, tms, feet, top) => {
  const hr = Math.max(8, feet - top), id = e.id || 0, sz = e.size || 14;
  if (e.slowUntil > tms || e.auraSlow > 0) {
    put(ctx, crustSprite(sizeBucket(sz)), e.x, feet);
    // a glint of frost on the body now and then
    for (let i = 0; i < 2; i++) {
      if ((Math.floor(time * 3 + id * 0.7) + i) % 3) continue;
      const x = e.x + (hash(id, i) - 0.5) * sz * 0.8, y = feet - hr * (0.3 + 0.45 * hash(id, i + 4));
      speck(ctx, x - 0.5, y, 1.5, "#ffffff"); speck(ctx, x, y - 0.5, 0.5, "#ffffff"); speck(ctx, x, y + 1.5, 0.5, "#d4f2fa");
    }
  }
  if (e.brittleUntil > tms) put(ctx, crackSprite(sizeBucket(sz)), e.x, feet - hr * 0.48);
  if (e.burnUntil > tms) {
    const f0 = Math.floor(time * 12);
    const XS = [-0.3, 0.04, 0.34], YS = [0.3, 0.6, 0.42];
    for (let i = 0; i < 3; i++) put(ctx, flameSprite((f0 + i * 3 + id) & 3), e.x + XS[i] * sz, feet - hr * YS[i]);
    // an ember lifting off
    const q = (time * 1.6 + id * 0.37) % 1;
    speck(ctx, e.x + (hash(id, 3) - 0.5) * sz * 0.6 + Math.sin(q * 9) * 1.5, feet - hr * 0.7 - q * 10, 0.5, q < 0.5 ? "#f8d868" : "#d8683a");
  }
  if (e.poisonUntil > tms) {
    for (let i = 0; i < 3; i++) {
      const q = (time * 1.3 + i * 0.33 + id * 0.29) % 1;
      const x = e.x + (i - 1) * 0.32 * sz + Math.sin(q * 7 + i) * 1.2;
      put(ctx, bubbleSprite(q > 0.3), x, top + hr * 0.45 - q * 10);
    }
  }
  if (e.healedFlash > tms) {
    for (let i = 0; i < 2; i++) {
      const q = (time * 1.2 + i * 0.5 + id * 0.13) % 1;
      put(ctx, plusSprite(), e.x + (i ? 6 : -6), top - 2 - q * 8);
    }
  }
};

// ---- lingering ground: lava, plague, spores, caltrops ---------------------
// Pools that sit on the road for seconds (g.grounds). Painted like the
// scorch marks — dithered, irregular, stepped tones — as four animation
// frames per kind and size bucket, so a road paved with them is still a
// handful of blits. Lava is a crust-rimmed pool with a molten heart that
// churns; plague a sickly slick with blisters; spores a violet haze; the
// Caltrop Field's beds are scattered iron on dark trampled ground.
const LAVA = pal("#fff3d2", "#f8d868", "#f09838", "#d0502e", "#7a2a26", "#3a1e22");
const ROT = pal("#d8e8a0", "#a8c46e", "#76944a", "#4e6634", "#34442a");
const SPORE = pal("#ecdcfa", "#c4a8e0", "#9a7cc0", "#6a548e", "#44365e");
const IRON = pal("#dfe2e8", "#9aa0ac", "#5c6270", "#34363e");
const groundSprite = (kind, rb, f) => memo(`gr|${kind}|${rb}|${f}`, () => {
  const R = rb * PX, ry = R * 0.62, seed = kind.length * 13;
  const G = grid(2 * R + 8, 2 * ry + 8), cx = G.W >> 1, cy = G.H >> 1;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const nx = (x + 0.5 - cx) / R, ny = (y + 0.5 - cy) / ry;
    const edge = Math.sqrt(nx * nx + ny * ny) + (vnoise(x, y, Math.max(3, R * 0.3), seed) - 0.5) * 0.4;
    if (edge > 1) continue;
    const b = bay(x, y);
    // the churn: a second noise field that drifts with the frame
    const ch = vnoise(x + f * 3, y - f * 2, Math.max(2, R * 0.22), seed + 7);
    if (kind === "lava") {
      if (edge > 0.84) G.set(x, y, LAVA[5], 235);                        // cooled black crust rim
      else if (edge > 0.7) G.set(x, y, b < 0.5 ? LAVA[4] : LAVA[5], 240);
      else if (ch > 0.72) G.set(x, y, edge < 0.35 ? LAVA[0] : LAVA[1]);  // white-hot upwellings
      else if (ch > 0.5) G.set(x, y, LAVA[2]);
      else if (ch > 0.3) G.set(x, y, LAVA[3]);
      else G.set(x, y, b < 0.6 ? LAVA[4] : LAVA[3], 245);                  // skins of crust afloat
    } else if (kind === "plague") {
      if (edge > 0.8) { if (b < 0.5) G.set(x, y, ROT[4], 170); }
      else if (ch > 0.68) G.set(x, y, ROT[1], 210);
      else G.set(x, y, edge < 0.5 ? ROT[2] : ROT[3], 190);
    } else if (kind === "spores") {
      const a = edge < 0.5 ? 0.62 : edge < 0.8 ? 0.4 : 0.2;                 // a haze thins to its edge
      if (b < a) G.set(x, y, ch > 0.6 ? SPORE[1] : ch > 0.35 ? SPORE[2] : SPORE[3], 170);
    } else {
      // caltrops: trampled dark ground under scattered four-pointed iron
      if (b < (edge < 0.7 ? 0.4 : 0.18)) G.set(x, y, DUST[3], 120);
    }
  }
  if (kind === "plague" || kind === "lava") {
    // blisters / bubbles that swell and pop across the frames
    const K = kind === "lava" ? LAVA : ROT;
    for (let k = 0; k < Math.max(3, R / 4); k++) {
      const a = hash(seed, k) * 6.283, d = Math.sqrt(hash(seed, k + 30)) * 0.6;
      const x = cx + Math.cos(a) * R * d, y = cy + Math.sin(a) * ry * d, st = (f + k) % 4;
      if (st === 3) continue;
      G.set(x, y - st, K[0]); G.set(x + 1, y - st, K[1]);
      if (st >= 1) { G.set(x - 1, y - st, K[1]); G.set(x, y - st + 1, K[2]); }
    }
  }
  if (kind === "caltrops") {
    for (let k = 0; k < Math.max(5, R / 2.5); k++) {
      const a = hash(seed, k) * 6.283, d = Math.sqrt(hash(seed, k + 40)) * 0.85;
      const x = Math.round(cx + Math.cos(a) * R * d), y = Math.round(cy + Math.sin(a) * ry * d);
      G.set(x, y, IRON[0]); G.set(x - 1, y, IRON[1]); G.set(x + 1, y, IRON[2]);
      G.set(x, y - 1, IRON[1]); G.set(x, y + 1, IRON[3]);
      if (hash(seed, k + 60) < 0.5) { G.set(x - 1, y - 1, IRON[2]); G.set(x + 1, y + 1, IRON[3]); }
    }
  }
  return { cv: G.done(), ax: cx, ay: cy };
});

export const drawGround = (ctx, gr, time, tms) => {
  const r = Math.max(8, gr.r || 30);
  const rb = r <= 24 ? Math.round(r / 4) * 4 : Math.round(r / 6) * 6;
  const kind = gr.kind === "plague" || gr.kind === "spores" || gr.kind === "caltrops" ? gr.kind : "lava";
  const f = Math.floor(time * (kind === "lava" ? 5 : 3) + (gr.x + gr.y) * 0.1) & 3;
  const a = stepA(Math.min(1, (gr.until - tms) / 600), 4);
  if (a <= 0) return;
  if (a < 1) { ctx.save(); ctx.globalAlpha *= a; }
  put(ctx, groundSprite(kind, rb, f), gr.x, gr.y);
  if (a < 1) ctx.restore();
  // a lava pool breathes a little light and throws the odd flame-tongue
  if (kind === "lava") {
    for (let i = 0; i < 3; i++) {
      const ph = (time * 2.2 + i * 0.37 + gr.x * 0.01) % 1;
      if (ph > 0.6) continue;
      const ang = i * 2.1 + gr.y * 0.05, d = r * 0.4;
      const x = Math.round((gr.x + Math.cos(ang) * d) * 2) / 2, y = Math.round((gr.y + Math.sin(ang) * d * 0.6 - ph * 7) * 2) / 2;
      ctx.fillStyle = ph < 0.25 ? "#f8d868" : ph < 0.45 ? "#f09838" : "#d0502e";
      ctx.fillRect(x, y, 0.5, ph < 0.3 ? 1.5 : 1);
    }
  }
};

