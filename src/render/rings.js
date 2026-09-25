// ============ AREA EFFECTS: NOVAS, WAVES AND MARKS ============
// The rings and bursts towers, heroes and some foes throw across the field:
// the Warden's frost nova and ward wave, the Bladewheel's flame ring, the
// shaman's heal wave, the Covert's silence and shadowstep, the Gold Works'
// Midas touch, the bell-ringer's toll, plague bursts, the necromancer's
// raising, the hero's Shield Slam and Heartseeker mark. draw.js calls
// drawRingFx for every effect; it returns true when it drew one. `a` is the
// effect's fade (ttl / 300, capped at 1); `g` the game (for live targets).
//
// Pixel art like fx.js: every piece (an ice shard, a flame tongue, a clod, a
// coin, a rune) is painted pixel by pixel ONCE into a small cached sprite and
// stamped with drawImage, snapped to the art grid. The ring itself is only
// placement: pieces ride the live radius, so a nova still shows exactly the
// area it hit. Ground washes are one path of rows filled with a dither
// pattern (no gradients); sparks and motes are one batched path per colour.
// A big nova is a few dozen stamps, whatever its radius.
//
// Each effect has a ground half (rime, scorch, cracks — drawn first) and an
// air half (shards, flames, motes). `layer` is "both" by default; a ground
// pass under the crowd can call drawRingFx(ctx, fx, a, g, "g") and the air
// pass "a".

import { PX, INK_LINE, inkOutline, hash } from "./paint.js";
import { ringPx } from "./fx.js";

// ---- palette -------------------------------------------------------------
const ICE = ["#ffffff", "#d4f2fa", "#9fd4e8", "#62a4cc", "#3a6a98"];
const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30", "#5a2430"];
const SOOT = ["#221a1e", "#3a2c28", "#4e3e32"];
const EARTH = ["#eee0bc", "#cdb68a", "#a48a64", "#766048", "#5a4432", "#3e2e26"];
const STONE = ["#cdc6ba", "#9a948e", "#6a6470", "#4a4452"];
const GOLD = ["#fff3d2", "#f0d885", "#d8b34a", "#a8782e", "#6a4424"];
const BRONZE = ["#f4d8a0", "#d8a45a", "#b07a3a", "#7a4e2a", "#4a2e22"];
const HEAL = ["#fff3d2", "#d8f4b0", "#a8e08a", "#6ab458", "#3a7a44"];
const WARD = ["#ffffff", "#e4eefa", "#b8d0f0", "#8aa8d8", "#5a70a8"];
const ROT = ["#c8d070", "#98a850", "#6e7a3a", "#50502c", "#3a3222"];
const VIOLET = ["#e4d0fc", "#b890e8", "#8a64c8", "#5a3a8a", "#2e1e44"];
const SHADE = ["#7e6a9e", "#4a3e62", "#2e2442", "#1c1628"];
const RED = ["#ffd8c8", "#e84a3e", "#b02a30", "#6a1822"];

const KC = {};
const K = (h) => KC[h] || (KC[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const rgba = (h, a) => { const [r, g, b] = K(h); return `rgba(${r},${g},${b},${a})`; };
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - (1 - clamp01(t)) ** 2;
// alpha in a few hard steps, so fades read as pixel-art translucency
const stepA = (a, n = 4) => Math.ceil(clamp01(a) * n) / n;
const sn = (v) => Math.round(v * PX) / PX;
const seedOf = (fx) => ((Math.floor(fx.x ?? fx.x1 ?? 0) * 7 + Math.floor(fx.y ?? fx.y1 ?? 0) * 13) >>> 0) % 997;

// ---- pixel canvas (as in fx.js) ----------------------------------------
const grid = (w, h) => {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
  const W = cv.width, H = cv.height;
  const c = cv.getContext("2d", { willReadFrequently: true });
  const img = c.createImageData(W, H), d = img.data;
  const set = (x, y, k, a = 255) => {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (typeof k === "string") k = K(k);
    const i = (y * W + x) * 4;
    d[i] = k[0]; d[i + 1] = k[1]; d[i + 2] = k[2]; d[i + 3] = a;
  };
  const has = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
  const done = (ink = null, passes = 1) => { c.putImageData(img, 0, 0); if (ink) inkOutline(cv, ink, passes); return cv; };
  return { cv, W, H, set, has, done };
};
// a hand-set bitmap: one character per art pixel, "." clear; `shear` slides
// each row sideways (a bell swinging from its hanger)
const bm = (G, rows, map, ox, oy, shear = 0) => {
  rows.forEach((row, y) => {
    const sx = Math.round(y * shear);
    for (let x = 0; x < row.length; x++) { const c = map[row[x]]; if (c) G.set(ox + x + sx, oy + y, c); }
  });
};

const SPR = new Map();
const memo = (key, make) => {
  let s = SPR.get(key);
  if (!s) { if (SPR.size > 900) SPR.clear(); s = make(); SPR.set(key, s); }
  return s;
};
// stamp a sprite with its anchor on (x, y), snapped to the art grid
const put = (ctx, s, x, y, flip = false) => {
  const w = s.cv.width / PX, h = s.cv.height / PX;
  const X = sn(x), Y = sn(y);
  if (!flip) { ctx.drawImage(s.cv, X - s.ax / PX, Y - s.ay / PX, w, h); return; }
  ctx.save(); ctx.translate(X, Y); ctx.scale(-1, 1);
  ctx.drawImage(s.cv, -s.ax / PX, -s.ay / PX, w, h);
  ctx.restore();
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
// a lumpy lit ball (fx.js): bright toward the sun, the far rim in shadow
const lump = (G, cx, cy, r, tones, seed, dens = 1, wk = 0.3, wl = 0.8) => {
  if (r < 0.8) return;
  const n = tones.length, cell = Math.max(2, r * 0.5);
  for (let y = Math.floor(cy - r * 1.15); y <= Math.ceil(cy + r * 1.15); y++) for (let x = Math.floor(cx - r * 1.15); x <= Math.ceil(cx + r * 1.15); x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r;
    const d = Math.sqrt(dx * dx + dy * dy), edge = 0.8 + 0.32 * vnoise(x, y, cell, seed);
    if (d > edge) continue;
    if (dens < 1 && bay(x & 1023, y & 1023) >= dens) continue;
    const k = d / edge, l = -(dx * 0.55 + dy * 0.64);
    let t = k * wk + (0.5 - l) * wl * 0.9;
    if (k > 0.84 && l < 0.1) t += 0.35;
    G.set(x, y, tones[Math.max(0, Math.min(n - 1, Math.floor(t * n)))]);
  }
};

// ---- live pixel helpers -------------------------------------------------
// ordered-dither fills, so a ground wash is a see-through scatter of art
// pixels rather than a smooth tint; anchored to the world, so it never swims
const PATS = new WeakMap();
const dither = (ctx, h, dens) => {
  let m = PATS.get(ctx);
  if (!m) PATS.set(ctx, (m = new Map()));
  const key = h + dens;
  let p = m.get(key);
  if (!p) {
    const G = grid(4, 4);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (bay(x, y) < dens) G.set(x, y, h);
    p = ctx.createPattern(G.done(), "repeat");
    if (p.setTransform) p.setTransform(new DOMMatrix([1 / PX, 0, 0, 1 / PX, 0, 0]));
    m.set(key, p);
  }
  return p;
};
// a disc (or, with r0, a band) of art-pixel rows in one path, one fill
const disc = (ctx, x, y, r, r0, style, sq = 1) => {
  if (r < 1) return;
  const ry = r * sq, ry0 = r0 * sq, step = r < 40 ? 1 / PX : r < 90 ? 1 : 2;
  const cx = sn(x), cy = sn(y);
  ctx.fillStyle = style;
  ctx.beginPath();
  for (let dy = -Math.ceil(ry / step) * step; dy < ry; dy += step) {
    const m = dy + step / 2;
    if (Math.abs(m) >= ry) continue;
    const hw = r * Math.sqrt(1 - (m / ry) ** 2);
    const L = sn(cx - hw), R = sn(cx + hw);
    if (r0 > 0 && Math.abs(m) < ry0) {
      const hi = r0 * Math.sqrt(1 - (m / ry0) ** 2), Li = sn(cx - hi), Ri = sn(cx + hi);
      if (Li > L) ctx.rect(L, cy + dy, Li - L, step);
      if (R > Ri) ctx.rect(Ri, cy + dy, R - Ri, step);
    } else if (R > L) ctx.rect(L, cy + dy, R - L, step);
  }
  ctx.fill();
};
// a batch of art-pixel squares in one colour: [x, y, size] triples
const dots = (ctx, list, style) => {
  if (!list.length) return;
  ctx.fillStyle = style;
  ctx.beginPath();
  for (let i = 0; i < list.length; i += 3) ctx.rect(sn(list[i]), sn(list[i + 1]), list[i + 2], list[i + 2]);
  ctx.fill();
};
// A dotted ring: art-pixel squares every `gap` world units round an
// ellipse. Thin continuous rings cost a rect every 0.6 units of their
// length (ringPx), so highlights and echoes ride on dots instead.
const dash = (ctx, x, y, rx, ry, sz, gap, style) => {
  if (rx < 1) return;
  const n = Math.max(8, Math.round((TAU * Math.max(rx, ry)) / gap));
  ctx.fillStyle = style;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    ctx.rect(sn(x + Math.cos(a) * rx - sz / 2), sn(y + Math.sin(a) * ry - sz / 2), sz, sz);
  }
  ctx.fill();
};
// debris flung out along the ground, up and back down under gravity
const fling = (seed, i, p, R, up, grav) => {
  const a = hash(seed, i) * TAU, v = 0.4 + 0.6 * hash(seed, i + 40);
  const out = easeOut(p * 1.15);
  const z = Math.max(0, up * (0.55 + 0.9 * hash(seed, i + 80)) * p - grav * p * p) * R;
  return [Math.cos(a) * v * R * out, Math.sin(a) * v * R * out, z];
};

// ---- sprites --------------------------------------------------------------
// A cluster of ice crystals thrust up out of the ground: two or three
// spikes, lit face left, shadow face right, a glinting ridge and tip.
const shardS = (v) => memo(`sh|${v}`, () => {
  const big = v >= 3;
  const G = grid(26, big ? 32 : 22), by = G.H - 3, cx = 13;
  const n = 2 + (v % 2), sp = [];
  for (let k = 0; k < n; k++) {
    const off = k === 0 ? 0 : (k === 1 ? -1 : 1) * (4 + 2 * hash(v, k + 9));
    sp.push({ bx: cx + off, h: (big ? 24 : 15) * (k === 0 ? 1 : 0.45 + 0.25 * hash(v, k)), w: big ? 3.4 : 2.6, lean: off * 0.4 + (hash(v, k + 20) - 0.5) * 2.5 });
  }
  for (const s of sp) {
    for (let y = Math.floor(by - s.h); y <= by; y++) for (let x = 0; x < G.W; x++) {
      const t = (by + 0.5 - (y + 0.5)) / s.h;
      if (t < 0 || t > 1) continue;
      const xc = s.bx + s.lean * t, half = s.w * (1 - t) + 0.35;
      const d = (x + 0.5 - xc) / half;
      if (Math.abs(d) > 1) continue;
      let k = d < -0.25 ? 1 : d < 0.3 ? 2 : 3;
      if (t > 0.8 || (d > -0.6 && d < -0.25 && t > 0.35)) k = 0;
      if (t < 0.12 && d > 0) k = 4;
      G.set(x, y, ICE[k], 245);
    }
  }
  return { cv: G.done(ICE[4]), ax: cx, ay: by };
});
// rime crystals settling on the ground
const RIME = [
  ["...w...", ".l.l.l.", "..lwl..", "wlwbwlw", "..lwl..", ".l.l.l.", "...w..."],
  ["..l..", ".lwl.", "lwbwl", ".lwl.", "..l.."],
  [".l.l..l..", "lwlwllwl.", ".l.lb.lwl", "....l..l."],
  ["w.l.", ".wl.", "l.bw", "..l."],
];
const rimeS = (v) => memo(`ri|${v}`, () => {
  const rows = RIME[v], G = grid(rows[0].length, rows.length);
  bm(G, rows, { w: ICE[0], l: ICE[2], b: ICE[1] }, 0, 0);
  return { cv: G.done(), ax: rows[0].length >> 1, ay: rows.length >> 1 };
});
// A starburst flash: a hot core, four long rays and four short, a dithered
// halo — frost, flame and gold each get their own tones.
const BURST_T = { ice: [ICE[0], ICE[1], ICE[2]], fire: [FIRE[0], FIRE[1], FIRE[2]], gold: [GOLD[0], GOLD[1], GOLD[2]], violet: [VIOLET[0], VIOLET[1], VIOLET[2]] };
const burstS = (name, f) => memo(`bu|${name}|${f}`, () => {
  const tones = BURST_T[name], R = 22, G = grid(2 * R + 3, 2 * R + 3), c = R + 1;
  const L = [22, 17, 12, 7][f], cr = [6, 5, 3.5, 2][f];
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const d = Math.hypot(x + 0.5 - c, (y + 0.5 - c) / 0.85);
    if (d < cr) G.set(x, y, tones[0]);
    else if (d < cr + 2.5) { if (bay(x, y) < (f < 2 ? 0.8 : 0.45)) G.set(x, y, tones[1], 230); }
    else if (d < cr + 6 && f < 3 && bay(x, y) < 0.22) G.set(x, y, tones[2], 210);
  }
  for (let k = 0; k < 8; k++) {
    const ang = (k * Math.PI) / 4, len = k % 2 ? L * 0.55 : L;
    for (let i = cr - 1; i < len; i++) {
      const x = c + Math.cos(ang) * i, y = c + Math.sin(ang) * i * 0.85;
      G.set(x, y, i < len * 0.55 ? tones[0] : tones[1]);
      if (k % 2 === 0 && i < len * 0.4) { G.set(x + Math.sin(ang), y + Math.cos(ang), tones[1]); G.set(x - Math.sin(ang), y - Math.cos(ang), tones[1]); }
    }
  }
  return { cv: G.done(), ax: c, ay: c };
});
// A clump of flame tongues standing on the ground: white-gold heart, orange
// body, red edges and a dark-red root; four flicker frames, three shapes.
const flameS = (v, f, s) => memo(`fl|${v}|${f}|${s}`, () => {
  const Hh = s ? 26 : 16, G = grid(s ? 28 : 20, Hh + 8), by = G.H - 3, cx = G.W >> 1;
  const T = [[-(s ? 6 : 4), 0.55 + 0.2 * hash(v, 1), 1], [(s ? 6 : 4), 0.6 + 0.2 * hash(v, 2), 2], [0, 1, 0]];
  for (const [off, hk, idx] of T) {
    const h = Hh * hk * (0.88 + 0.24 * hash(v * 7 + f, idx)), w = (s ? 4.6 : 3.3) * (0.75 + 0.25 * hk);
    for (let y = Math.floor(by - h); y <= by; y++) for (let x = 0; x < G.W; x++) {
      const t = (by + 0.5 - (y + 0.5)) / h;
      if (t < 0 || t > 1) continue;
      const sway = Math.sin(t * 3.4 + f * 1.57 + idx * 2.1) * t * (s ? 2.2 : 1.5) + t * 1.3;
      const prof = w * (t < 0.3 ? 0.72 + t * 0.95 : Math.pow((1 - t) / 0.7, 0.9)) * (0.82 + 0.32 * vnoise(x, y + f * 6, 3, v + idx));
      const dx = x + 0.5 - (cx + off + sway);
      if (Math.abs(dx) > prof) continue;
      const k = Math.abs(dx) / prof;
      let tone = k > 0.72 || t > 0.84 ? 3 : k > 0.42 || t > 0.62 ? 2 : t < 0.38 ? 0 : 1;
      if (t < 0.14 && k > 0.45) tone = 4;
      G.set(x, y, FIRE[tone]);
    }
  }
  // a lick of flame breaking free above the clump
  const lx = cx + 1 + (f % 2 ? 2 : -1), ly = by - Hh - 2 + (f >> 1);
  if (f !== 3) { G.set(lx, ly, FIRE[2]); G.set(lx + 1, ly, FIRE[3]); G.set(lx, ly + 1, FIRE[3]); }
  return { cv: G.done(), ax: cx, ay: by };
});
// a patch of burnt turf with a few winking coals
const charS = (v) => memo(`ch|${v}`, () => {
  const s = 1 + (v % 3) * 0.3, G = grid(40 * s, 22 * s), cx = G.W >> 1, cy = G.H >> 1;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const n = Math.hypot((x + 0.5 - cx) / (cx - 1), (y + 0.5 - cy) / (cy - 1)) + (vnoise(x, y, 4, v + 3) - 0.5) * 0.7;
    if (n > 1) continue;
    const b = bay(x, y);
    if (n < 0.5) { if (b < 0.85) G.set(x, y, SOOT[0], 190); }
    else if (n < 0.8) { if (b < 0.55) G.set(x, y, SOOT[1], 170); }
    else if (b < 0.3) G.set(x, y, SOOT[2], 150);
  }
  for (let k = 0; k < 4; k++) G.set(cx - 8 + hash(v, k) * 16, cy - 3 + hash(v, k + 5) * 6, k ? FIRE[3] : FIRE[1]);
  return { cv: G.done(), ax: cx, ay: cy };
});
// a patch of rime: frost furring the turf, a few crystals catching light
const rimePatchS = (v) => memo(`rp|${v}`, () => {
  const s = 1 + (v % 3) * 0.35, G = grid(36 * s, 20 * s), cx = G.W >> 1, cy = G.H >> 1;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const n = Math.hypot((x + 0.5 - cx) / (cx - 1), (y + 0.5 - cy) / (cy - 1)) + (vnoise(x, y, 4, v + 11) - 0.5) * 0.75;
    if (n > 1) continue;
    const b = bay(x, y);
    if (n < 0.45) { if (b < 0.6) G.set(x, y, ICE[1], 210); }
    else if (n < 0.75) { if (b < 0.35) G.set(x, y, ICE[2], 190); }
    else if (b < 0.14) G.set(x, y, ICE[0], 200);
  }
  for (let k = 0; k < 3 + (v % 3); k++) {
    const x = cx - cx * 0.6 + hash(v, k) * cx * 1.2, y = cy - cy * 0.5 + hash(v, k + 7) * cy;
    G.set(x, y, ICE[0]); G.set(x - 1, y, ICE[0], 220); G.set(x + 1, y, ICE[0], 220); G.set(x, y - 1, ICE[0], 220); G.set(x, y + 1, ICE[3], 220);
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
// the rot a plague-ghast leaves where it burst: a stain with splashes
const rotS = (rb) => memo(`rot|${rb}`, () => {
  const R = rb * PX * 0.8, G = grid(2 * R + 8, 2 * R + 8), c = G.W >> 1;
  const sp = [];
  for (let k = 0; k < 9; k++) { const an = hash(rb, k) * TAU, d = R * (0.55 + 0.4 * hash(rb, k + 9)); sp.push([c + Math.cos(an) * d, c + Math.sin(an) * d, 2 + hash(rb, k + 20) * R * 0.14]); }
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    let n = Math.hypot(x + 0.5 - c, y + 0.5 - c) / (R * 0.62) + (vnoise(x, y, 5, rb) - 0.5) * 0.6;
    for (const [sx, sy, sr] of sp) n = Math.min(n, Math.hypot(x + 0.5 - sx, y + 0.5 - sy) / sr);
    if (n > 1) continue;
    const b = bay(x, y);
    if (n < 0.8) G.set(x, y, vnoise(x, y, 3, rb + 5) > 0.62 ? ROT[2] : n < 0.45 ? ROT[4] : ROT[3], 150);
    else if (b < 0.5) G.set(x, y, ROT[3], 150);
  }
  return { cv: G.done(), ax: c, ay: c };
});
// A clod of torn earth / a pebble / a puff of dust, spores or shadow
const clodS = (v) => memo(`cl|${v}`, () => {
  const r = 2.4 + (v % 3) * 0.7, G = grid(2 * r + 6, 2 * r + 6), c = G.W / 2;
  lump(G, c, c, r, [EARTH[2], EARTH[3], EARTH[4], EARTH[5]], 5 + v, 1, 0.3, 0.8);
  return { cv: G.done(INK_LINE), ax: c, ay: c };
});
const pebbleS = (v) => memo(`pb|${v}`, () => {
  const r = 1.5 + (v % 2) * 0.6, G = grid(2 * r + 5, 2 * r + 5), c = G.W / 2;
  lump(G, c, c, r, STONE, 9 + v, 1, 0.2, 0.9);
  return { cv: G.done(INK_LINE), ax: c, ay: c };
});
const PUFF_T = { dust: [EARTH[0], EARTH[1], EARTH[2], EARTH[3]], rot: [ROT[0], ROT[1], ROT[2], ROT[3]], shade: SHADE, frost: [ICE[0], ICE[1], ICE[2], ICE[3]] };
const puffS = (name, v, f, sc = 1) => memo(`pf|${name}|${v}|${f}|${sc}`, () => {
  const s = (1 + f * 0.28) * sc, R = 9 * s, G = grid(2 * R + 8, 2 * R + 6), cx = G.W / 2, cy = G.H / 2 + 2;
  const dens = [1, 1, 0.8, 0.55, 0.3][f];
  const P = [[-3.5, 0.5, 4.8], [3.5, 1, 4.4], [0, -1.8, 5.6]];
  for (let i = 0; i < 3; i++) {
    const [ox, oy, r] = P[i];
    const smoke = name === "shade";
    lump(G, cx + ox * s * (1 + hash(v, i) * 0.3), cy + oy * s, r * s * (0.85 + 0.3 * hash(v, i + 4)), PUFF_T[name], v * 3 + i, dens, smoke ? 0.55 : 0.25, smoke ? 0.45 : 0.85);
  }
  return { cv: G.done(), ax: Math.round(cx), ay: Math.round(cy) };
});
// A puff of shadow-smoke: a dense dark heart that frays into dithered
// wisps at its edge, lit faintly violet along its top; it swells and thins.
const smokeS = (v, f, sc = 1) => memo(`sm|${v}|${f}|${sc}`, () => {
  const R = (8 + f * 2.6) * sc, G = grid(2 * R + 10, 2 * R + 8), cx = G.W / 2, cy = G.H / 2 + 1;
  const thin = [1, 0.85, 0.65, 0.45, 0.28][f];
  const lobes = [[0, 0, 1], [-0.55, 0.25, 0.7], [0.55, 0.2, 0.72], [0.15, -0.5, 0.62]];
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    let n = 9;
    for (const [lx, ly, lr] of lobes) n = Math.min(n, Math.hypot(x + 0.5 - (cx + lx * R * (1 + hash(v, lx * 9) * 0.2)), y + 0.5 - (cy + ly * R)) / (lr * R));
    n += (vnoise(x, y, 3, v + 60 + f) - 0.5) * 0.45;
    if (n > 1) continue;
    const keep = (1 - n) * 2.4 * thin;
    if (bay(x, y) >= keep) continue;
    const top = y + 0.5 < cy - R * 0.25 && n > 0.55;
    G.set(x, y, top ? SHADE[0] : n < 0.45 ? SHADE[3] : n < 0.75 ? SHADE[2] : SHADE[1]);
  }
  // wisps curling off the top
  for (let k = 0; k < 2; k++) {
    const wx = cx + (k ? 0.4 : -0.35) * R, wy = cy - R * (0.85 + f * 0.08);
    for (let i = 0; i < 4; i++) if (f < 4) G.set(wx + Math.sin(i * 1.3 + k) * 1.5, wy - i, i < 2 ? SHADE[1] : SHADE[0]);
  }
  return { cv: G.done(), ax: Math.round(cx), ay: Math.round(cy) };
});
// a drifting knot of spores: a thin haze with round spores caught in it,
// spreading and thinning frame by frame
const sporeS = (v, f) => memo(`spo|${v}|${f}`, () => {
  const R = 7 + f * 2.2, G = grid(2 * R + 8, 2 * R + 6), cx = G.W >> 1, cy = G.H >> 1;
  const hz = [0.5, 0.4, 0.3, 0.2, 0.12][f];
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const n = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.2) / R + (vnoise(x, y, 3, v + 40) - 0.5) * 0.5;
    if (n < 0.9 && bay(x, y) < hz * (1 - n * 0.6)) G.set(x, y, n < 0.5 ? ROT[2] : ROT[3], 200);
  }
  const k = 10 - f;
  for (let i = 0; i < k; i++) {
    const an = hash(v * 13 + i, 1) * TAU, d = Math.sqrt(hash(v * 13 + i, 2)) * R * 0.9;
    const x = Math.round(cx + Math.cos(an) * d), y = Math.round(cy + Math.sin(an) * d * 0.8);
    if (i % 3 === 0) { G.set(x, y, ROT[0]); G.set(x + 1, y, ROT[1]); G.set(x, y + 1, ROT[1]); G.set(x + 1, y + 1, ROT[3]); }
    else { G.set(x, y, i % 2 ? "#a8c048" : ROT[1]); }
  }
  return { cv: G.done(), ax: cx, ay: cy };
});
// small bright shapes: a four-point sparkle, a plus-shaped mote
const SPARK = [
  ["...w...", "...l...", "..lwl..", "wlwwwlw", "..lwl..", "...l...", "...w..."],
  ["..l..", "..w..", "lwwwl", "..w..", "..l.."],
  [".l.", "lwl", ".l."],
];
const TINT = { gold: [GOLD[0], GOLD[1]], ice: [ICE[0], ICE[2]], ward: [WARD[0], WARD[2]], heal: [HEAL[0], HEAL[2]], violet: [VIOLET[0], VIOLET[1]], bronze: [BRONZE[0], BRONZE[1]], rot: [ROT[0], ROT[1]] };
const sparkS = (tint, v) => memo(`sp|${tint}|${v}`, () => {
  const rows = SPARK[v], G = grid(rows[0].length, rows.length);
  bm(G, rows, { w: TINT[tint][0], l: TINT[tint][1] }, 0, 0);
  return { cv: G.done(), ax: rows[0].length >> 1, ay: rows.length >> 1 };
});
// a little leaf, turned to one of four angles
const leafS = (r) => memo(`lf|${r}`, () => {
  const G = grid(14, 14), c = 7, th = (r * Math.PI) / 4 + 0.3, L = 4.6, Wd = 2.1;
  const cs = Math.cos(th), sn2 = Math.sin(th);
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, u = dx * cs + dy * sn2, v = -dx * sn2 + dy * cs;
    const w = Wd * (1 - (u / L) ** 2);
    if (Math.abs(u) > L || Math.abs(v) > w) continue;
    G.set(x, y, Math.abs(v) < 0.5 ? HEAL[4] : v < 0 ? HEAL[2] : HEAL[3]);
  }
  return { cv: G.done(HEAL[4]), ax: c, ay: c };
});
// Runes of warding: a pale glyph with a cold glow round it
const RUNES = [
  ["x.x.x", "x.x.x", ".xxx.", "..x..", "..x..", "..x..", "..x.."],
  ["x....", "x....", "xx...", "x.x..", "xx...", "x....", "x...."],
  ["..x..", ".x.x.", "x...x", ".x.x.", "..x..", ".x.x.", "x...x"],
  ["xxx..", "x..x.", "x..x.", "xxx..", "x.x..", "x..x.", "x...x"],
  ["..x..", ".xxx.", "x.x.x", "..x..", "..x..", "..x..", "..x.."],
  ["x...x", "xx.xx", "x.x.x", "xx.xx", "x...x", "x...x", "x...x"],
];
const runeS = (i, bright) => memo(`ru|${i}|${bright ? 1 : 0}`, () => {
  const G = grid(9, 11);
  bm(G, RUNES[i], { x: bright ? WARD[0] : WARD[1] }, 2, 2);
  return { cv: G.done(bright ? WARD[2] : WARD[4]), ax: 4, ay: 5 };
});
// the stolen voice: a chant-note struck through in red
const noteS = () => memo("note", () => {
  const G = grid(26, 26), c = 12.5;
  bm(G, [
    ".....hww..",
    ".....hwwww",
    ".....hw.ww",
    ".....hw..w",
    ".....hw...",
    ".....hw...",
    "..hwwhw...",
    ".hwwwww...",
    "hwwwwwg...",
    ".wwwwgg...",
    "..ggg.....",
  ], { h: "#ffffff", w: "#dcdae6", g: "#9a98ae" }, 7, 7);
  // struck through: a red ring and bar, the sign for a voice taken away
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    const bar = Math.abs(dx - dy) / Math.SQRT2 < 1.3 && d < 10;
    if ((d >= 9 && d < 11.2) || bar) G.set(x, y, d > 10.3 || (bar && dx - dy > 0.6) ? RED[2] : RED[1]);
  }
  return { cv: G.done(INK_LINE), ax: 13, ay: 13 };
});
// the gravecaller's bell, swung left, hanging, swung right
const BELL = [
  ".......ddd.......",
  "......d...d......",
  ".......ddd.......",
  "......hllmd......",
  ".....hlllmmd.....",
  "....hhllmmmmd....",
  "....hlllmmmmd....",
  "....hlllmmmmd....",
  "....ddddddddd....",
  "...hhlllmmmmmd...",
  "...hllllmmmmmd...",
  "..hhllllmmmmmmd..",
  "..hlllllmmmmmmd..",
  ".hhlllllmmmmmmmd.",
  "ddddddddddddddDDD",
  ".DDDDDDDDDDDDDDD.",
  ".......dDd.......",
  ".......DDD.......",
  "........D........",
];const bellS = (t) => memo(`bell|${t}`, () => {
  const G = grid(28, 23);
  bm(G, BELL, { h: BRONZE[0], l: BRONZE[1], m: BRONZE[2], d: BRONZE[3], D: BRONZE[4] }, 5 - t * 2.5, 2, t * 0.3);
  return { cv: G.done(INK_LINE), ax: 13, ay: 3 };
});
// a gold coin spinning: face, turning, edge-on, turning back
const coinS = (f) => memo(`coin|${f}`, () => {
  const G = grid(11, 11), c = 5.5, w = [3.6, 2.4, 0.9, 2.4][f], h = 3.6;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const dx = (x + 0.5 - c) / w, dy = (y + 0.5 - c) / h, n = dx * dx + dy * dy;
    if (n > 1) continue;
    let k = n > 0.55 ? 3 : dx + dy < -0.2 ? 1 : 2;
    if (f === 2) k = dy < -0.3 ? 1 : 2;
    G.set(x, y, GOLD[k]);
  }
  G.set(c - w * 0.4, c - 1.5, GOLD[0]);
  return { cv: G.done(GOLD[4]), ax: 5, ay: 5 };
});
// Heartseeker's mark: pips pointing in, and the heart-dot
const pipS = (dir) => memo(`pip|${dir}`, () => {
  const G = grid(11, 11), rows = ["xxxxxxx", ".xxxxx.", "..xxx..", "...x..."];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) {
    if (rows[j][i] !== "x") continue;
    const [x, y] = dir === 0 ? [i, j] : dir === 1 ? [10 - j, i] : dir === 2 ? [i, 10 - j] : [j, i];
    G.set(x + (dir === 0 || dir === 2 ? 2 : 0), y + (dir === 1 || dir === 3 ? 2 : 0), j === 0 && i > 0 && i < 6 ? RED[1] : RED[2]);
  }
  return { cv: G.done(INK_LINE), ax: 5, ay: 5 };
});
const bracketS = (q) => memo(`brk|${q}`, () => {
  const G = grid(9, 9);
  for (let i = 0; i < 5; i++) {
    const a = [2 + i, 2], b = [2, 2 + i];
    for (const [x, y] of [a, b]) G.set(q & 1 ? 8 - x : x, q & 2 ? 8 - y : y, i < 2 ? RED[1] : RED[2]);
  }
  return { cv: G.done(INK_LINE), ax: 4, ay: 4 };
});
const heartS = (lit) => memo(`hrt|${lit ? 1 : 0}`, () => {
  const G = grid(9, 9);
  bm(G, ["..x..", ".xox.", "xoxox", ".xox.", "..x.."], { x: lit ? RED[0] : RED[2], o: RED[1] }, 2, 2);
  return { cv: G.done(INK_LINE), ax: 4, ay: 4 };
});
// the cut: two crossed strokes, gold for marked prey, steel for the rest
const cutS = (prey) => memo(`cut|${prey ? 1 : 0}`, () => {
  const G = grid(26, 26), hi = prey ? GOLD[0] : "#f4f2ea", mid = prey ? GOLD[2] : "#c4c8d0";
  for (let i = 3; i <= 22; i++) {
    const e = i < 6 || i > 19;
    G.set(i, i, e ? mid : hi); G.set(i + 1, i, mid);
    G.set(25 - i, i, e ? mid : hi); G.set(24 - i, i, mid);
  }
  return { cv: G.done(INK_LINE), ax: 13, ay: 13 };
});
// Shield Slam's cracked earth: jagged cracks run out from a small crater,
// each with a lit lip on its south side
const cracksS = (rb) => memo(`cr|${rb}`, () => {
  const R = rb * PX * 0.82, G = grid(2 * R + 8, 2 * R + 8), c = G.W / 2, seed = rb;
  const lip = [], ink = [];
  // a crack is a wedge: wide at its root, tapering to a hairline
  const walk = (x, y, ang, len, k0, w0 = 3) => {
    for (let i = 0; i < len; i++) {
      ang += (hash(seed * 31 + k0, i) - 0.5) * 0.5;
      x += Math.cos(ang); y += Math.sin(ang);
      const w = Math.max(1, Math.round(w0 * (1 - (i / len) * 0.8))), nx = -Math.sin(ang), ny = Math.cos(ang);
      for (let o = -(w - 1) / 2; o <= (w - 1) / 2 + 0.01; o += 1) ink.push(x + nx * o, y + ny * o);
      lip.push(x, y + w / 2 + 0.6);
    }
    return [x, y, ang];
  };
  const N = 7;
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * TAU + hash(seed, k) * 0.6, L = R * (0.32 + 0.3 * hash(seed, k + 11));
    const [mx, my, ma] = walk(c + Math.cos(a0) * 7, c + Math.sin(a0) * 7, a0, Math.floor(L * 0.5), k, 6);
    walk(mx, my, ma, Math.floor(L * 0.5), k + 50, 3);
    if (k % 2) walk(mx, my, ma + (hash(seed, k + 70) > 0.5 ? 0.8 : -0.8), Math.floor(L * 0.3), k + 90, 2);
  }
  // the crater at the heart: rubble rim round a dark pit
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) + (vnoise(x, y, 2, seed) - 0.5) * 2;
    if (d < 5.5) G.set(x, y, bay(x, y) < 0.7 ? EARTH[5] : EARTH[4], 230);
    else if (d < 9) { if (bay(x, y) < 0.6) G.set(x, y, y < c ? EARTH[1] : EARTH[3], 220); }
  }
  for (let i = 0; i < lip.length; i += 2) if (!G.has(Math.floor(lip[i]), Math.floor(lip[i + 1]))) G.set(lip[i], lip[i + 1], EARTH[1], 200);
  for (let i = 0; i < ink.length; i += 2) G.set(ink[i], ink[i + 1], EARTH[5], 235);
  return { cv: G.done(), ax: Math.round(c), ay: Math.round(c) };
});
// a grave broken open: turned soil round a pit that glows witch-violet
const graveS = () => memo("grave", () => {
  const G = grid(34, 20), cx = 17, cy = 10;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const n = Math.hypot((x + 0.5 - cx) / 15, (y + 0.5 - cy) / 8) + (vnoise(x, y, 3, 7) - 0.5) * 0.35;
    if (n > 1) continue;
    const b = bay(x, y);
    if (n < 0.38) G.set(x, y, b < 0.5 ? VIOLET[4] : SHADE[3]);
    else if (n < 0.5) G.set(x, y, b < 0.5 ? VIOLET[2] : VIOLET[3]);
    else if (n < 0.8) G.set(x, y, vnoise(x, y, 2, 3) > 0.55 ? EARTH[3] : EARTH[4]);
    else if (b < 0.5) G.set(x, y, EARTH[5], 200);
  }
  return { cv: G.done(), ax: cx, ay: cy };
});

// ---- the effects -----------------------------------------------------------
const lifeP = (fx, life) => clamp01(1 - fx.ttl / (fx.life || life));

export const drawRingFx = (ctx, fx, a, g, layer = "both") => {
  const GR = layer !== "a", AIR = layer !== "g";
  switch (fx.type) {
    case "frostnova": {
      // An expanding ring of ice shards bursting out of the turf, a cold
      // flash at the tower, rime settling on everything inside.
      const life = 500, p = lifeP(fx, life), age = p * life, R = fx.r || 60, sd = seedOf(fx);
      const r = R * easeOut(p * 1.25), A = stepA(a);
      ctx.save();
      ctx.globalAlpha *= A;
      if (GR) {
        disc(ctx, fx.x, fx.y, r, Math.max(0, r - 6), dither(ctx, ICE[0], 0.44));
        // rime settles in patches behind the front
        const N = Math.max(5, Math.min(16, Math.round(R / 9)));
        for (let i = 0; i < N; i++) {
          const an = hash(sd, i) * TAU, d = (0.12 + 0.85 * Math.sqrt(hash(sd, i + 50))) * R * 0.92;
          if (d > r - 10) continue;
          put(ctx, rimePatchS((i + sd) % 6), fx.x + Math.cos(an) * d, fx.y + Math.sin(an) * d);
        }
        for (let i = 0; i < N; i++) {
          const an = hash(sd, i + 400) * TAU, d = Math.sqrt(hash(sd, i + 450)) * R * 0.95;
          if (d > r - 4) continue;
          put(ctx, rimeS(i % 4), fx.x + Math.cos(an) * d, fx.y + Math.sin(an) * d);
        }
      }
      if (AIR) {
        ringPx(ctx, fx.x, fx.y, r, r, 2, rgba(ICE[3], 0.9));
        dash(ctx, fx.x, fx.y, r - 0.5, r - 0.5, 1, 2.2, ICE[0]);
        const n = Math.max(5, Math.min(34, Math.round((TAU * r) / 15)));
        const big = p > 0.18 && a > 0.45, a0 = hash(sd, 99) * TAU;
        for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
          const an = a0 + (i / n) * TAU, s = Math.sin(an);
          if ((s < 0) !== (pass === 0)) continue;
          const rr = r + (hash(sd, i + 200) - 0.5) * 4;
          const v = (big && (i + sd) % 3 !== 0 ? 3 : 0) + ((i * 7 + sd) % 3);
          put(ctx, shardS(v), fx.x + Math.cos(an) * rr, fx.y + s * rr + 2, Math.cos(an) < 0);
        }
        // the cold flash where the nova was loosed
        if (p < 0.36) put(ctx, burstS("ice", Math.min(3, Math.floor(p / 0.09))), fx.x, fx.y - 6);
        // snow motes lifting off the frozen ground
        const m1 = [], m2 = [];
        for (let i = 0; i < 14; i++) {
          const an = hash(sd, i + 300) * TAU, d = r * (0.3 + 0.7 * hash(sd, i + 330));
          const z = ((age * 0.03 + hash(sd, i + 360) * 16) % 16) + 2;
          (i % 2 ? m1 : m2).push(fx.x + Math.cos(an) * d + Math.sin(age * 0.01 + i) * 1.5, fx.y + Math.sin(an) * d - z, i % 3 ? 0.5 : 1);
        }
        dots(ctx, m1, ICE[0]); dots(ctx, m2, ICE[1]);
      }
      ctx.restore();
      return true;
    }
    case "firenova": {
      // The Brazier Wheel's rolling ring of flame: tongues of fire riding the
      // wavefront on a line of coals, embers and heat haze rising off it,
      // the turf left scorched inside.
      const life = 450, p = lifeP(fx, life), age = p * life, R = fx.r || 60, sd = seedOf(fx);
      const r = R * easeOut(p * 1.15), A = stepA(a);
      ctx.save();
      ctx.globalAlpha *= A;
      if (GR) {
        disc(ctx, fx.x, fx.y, r, Math.max(0, r - 7), dither(ctx, FIRE[3], 0.25));
        // scorched turf in patches behind the flames
        const N = Math.max(4, Math.min(14, Math.round(R / 8)));
        for (let i = 0; i < N; i++) {
          const an = hash(sd, i) * TAU, d = R * (0.2 + 0.75 * Math.sqrt(hash(sd, i + 50)));
          if (d > r - 10) continue;
          put(ctx, charS((i + sd) % 6), fx.x + Math.cos(an) * d, fx.y + Math.sin(an) * d);
        }
      }
      if (AIR) {
        // a line of coals under the flames: dark embers with hot hearts
        dash(ctx, fx.x, fx.y, r, r, 1.5, 1.9, FIRE[4]);
        dash(ctx, fx.x, fx.y, r + 0.5, r + 0.5, 1, 3.1, FIRE[1]);
        const n = Math.max(5, Math.min(32, Math.round((TAU * r) / 16)));
        const s = a > 0.6 && p > 0.1 ? 1 : 0, fr = Math.floor(age / 65), a0 = hash(sd, 99) * TAU;
        for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
          const an = a0 + (i / n) * TAU, sy = Math.sin(an);
          if ((sy < 0) !== (pass === 0)) continue;
          put(ctx, flameS((i + sd) % 3, (fr + i) % 4, s && i % 4 !== 2 ? 1 : 0), fx.x + Math.cos(an) * r, fx.y + sy * r + 1, Math.cos(an) < 0);
        }
        if (p < 0.3) put(ctx, burstS("fire", Math.min(3, Math.floor(p / 0.075))), fx.x, fx.y - 8);
        // embers flying up off the ring, heat haze wavering above it
        const e1 = [], e2 = [], hz = [];
        for (let i = 0; i < 18; i++) {
          const born = hash(sd, i + 300) * 0.6;
          if (p < born) continue;
          const an = hash(sd, i + 320) * TAU, d = R * easeOut(born * 1.15), t = (p - born) * life;
          const x = fx.x + Math.cos(an) * d + Math.sin(t * 0.02 + i) * 2, y = fx.y + Math.sin(an) * d - 6 - t * 0.05;
          (i % 3 ? e1 : e2).push(x, y, i % 4 ? 0.5 : 1);
        }
        for (let i = 0; i < 12; i++) {
          const an = (i / 12) * TAU + a0 + 0.2;
          hz.push(fx.x + Math.cos(an) * r + Math.sin(age * 0.03 + i * 2) * 1.5, fx.y + Math.sin(an) * r - 16 - (i % 3) * 3, 1);
        }
        dots(ctx, e1, FIRE[1]); dots(ctx, e2, FIRE[3]);
        ctx.globalAlpha = A * 0.35;
        ctx.fillStyle = FIRE[0];
        ctx.beginPath();
        for (let i = 0; i < hz.length; i += 3) ctx.rect(sn(hz[i]) - 1.5, sn(hz[i + 1]), 3, 0.5);
        ctx.fill();
      }
      ctx.restore();
      return true;
    }
    case "slam": {
      // Shield Slam: the ground splits in cracks from the hero's feet, a
      // shockwave of torn turf rolls out, dust and pebbles fly.
      const life = 450, p = lifeP(fx, life), R = fx.r || 62, sd = seedOf(fx);
      const r = R * easeOut(p * 1.3), A = stepA(a);
      ctx.save();
      ctx.globalAlpha *= A;
      if (GR) {
        disc(ctx, fx.x, fx.y, r, Math.max(0, r - 6), dither(ctx, EARTH[1], 0.31));
        put(ctx, cracksS(Math.max(12, Math.round(R / 4) * 4)), fx.x, fx.y);
      }
      if (AIR) {
        ringPx(ctx, fx.x, fx.y, r, r, 3, rgba(EARTH[4], 0.85));
        dash(ctx, fx.x, fx.y, r - 1.5, r - 1.5, 1, 1.6, EARTH[0]);
        dash(ctx, fx.x, fx.y, r + 3, r + 3, 1, 3, rgba(EARTH[0], 0.5));
        // turf clods heaved up along the wavefront
        const n = Math.max(6, Math.min(24, Math.round((TAU * r) / 11)));
        for (let i = 0; i < n; i++) {
          const an = (i / n) * TAU + sd, rr = r * (0.9 + 0.1 * hash(sd, i + 20));
          const z = Math.sin(Math.min(1, p * 1.6) * Math.PI) * 4 * hash(sd, i + 40);
          put(ctx, clodS((i + sd) % 6), fx.x + Math.cos(an) * rr, fx.y + Math.sin(an) * rr - z);
        }
        // dust boiling off the front
        const pf = Math.min(4, Math.floor(p * 5));
        for (let i = 0; i < 7; i++) {
          const an = (i / 7) * TAU + sd * 0.3;
          put(ctx, puffS("dust", i % 3, pf), fx.x + Math.cos(an) * r * 0.9, fx.y + Math.sin(an) * r * 0.9 - 4);
        }
        // pebbles thrown high, with their shadows on the ground
        const sh = [];
        for (let i = 0; i < 10; i++) {
          const [gx, gy, z] = fling(sd, i, p, R * 0.9, 2.2, 2.4);
          sh.push(fx.x + gx - 0.5, fx.y + gy + 0.5, 1);
          put(ctx, pebbleS(i % 2), fx.x + gx, fx.y + gy - z - 2);
        }
        dots(ctx, sh, "rgba(42,28,44,0.35)");
      }
      ctx.restore();
      return true;
    }
    case "reticle": {
      // Heartseeker's mark: a crisp red ring closing on the chosen foe, four
      // pips pointing at the heart, and a flash when it locks.
      if (!AIR) return true;
      const e = g.enemies.find((en) => en.id === fx.target && !en.dead);
      const x = e ? e.x : fx.x, y = e ? e.y - 8 : fx.y - 8;
      const k = fx.ttl / 700, r = 8 + k * 14, al = Math.min(1, fx.ttl / 250);
      ctx.save();
      ctx.globalAlpha *= stepA(al);
      const lock = k < 0.22;
      ringPx(ctx, x, y, r, r, 2, INK_LINE);
      ringPx(ctx, x, y, r, r, 1, lock && Math.floor(fx.ttl / 60) % 2 ? RED[0] : RED[1]);
      if (r > 12) dash(ctx, x, y, r - 3.5, r - 3.5, 0.5, 1.5, rgba(RED[2], 0.7));
      const d = r + 4, b = (r + 5) * 0.72;
      put(ctx, pipS(0), x, y - d); put(ctx, pipS(2), x, y + d);
      put(ctx, pipS(3), x - d, y); put(ctx, pipS(1), x + d, y);
      put(ctx, bracketS(0), x - b, y - b); put(ctx, bracketS(1), x + b, y - b);
      put(ctx, bracketS(3), x + b, y + b); put(ctx, bracketS(2), x - b, y + b);
      put(ctx, heartS(lock), x, y);
      ctx.restore();
      return true;
    }
    case "healwave": {
      // The shaman's mending: a soft green swell across the ground, motes of
      // light and little leaves lifting out of it.
      const life = 550, p = lifeP(fx, life), age = p * life, R = fx.r || 64, sd = seedOf(fx);
      const r = R * easeOut(p * 1.1), A = stepA(a);
      ctx.save();
      ctx.globalAlpha *= A;
      if (GR) {
        disc(ctx, fx.x, fx.y, r, Math.max(0, r - 4), dither(ctx, HEAL[1], 0.5));
      }
      if (AIR) {
        ringPx(ctx, fx.x, fx.y, r, r, 1.5, HEAL[1]);
        // shafts of green light lifting where the swell has passed
        const sh = [];
        for (let i = 0; i < 22; i++) {
          const an = hash(sd, i + 500) * TAU, d = R * Math.sqrt(hash(sd, i + 530)), born = (d / R) * 0.6;
          if (p < born) continue;
          const t = (p - born) * life, z = (t * 0.06 + hash(sd, i + 560) * 6) % 18;
          sh.push(sn(fx.x + Math.cos(an) * d), sn(fx.y + Math.sin(an) * d * 0.9 - z));
        }
        ctx.fillStyle = HEAL[1];
        ctx.beginPath();
        for (let i = 0; i < sh.length; i += 2) ctx.rect(sh[i], sh[i + 1], 1, 5);
        ctx.fill();
        ctx.fillStyle = HEAL[0];
        ctx.beginPath();
        for (let i = 0; i < sh.length; i += 2) ctx.rect(sh[i], sh[i + 1], 1, 1.5);
        ctx.fill();
        if (r > 12) dash(ctx, fx.x, fx.y, r * 0.62, r * 0.62, 0.5, 2, HEAL[2]);
        for (let i = 0; i < 24; i++) {
          const an = hash(sd, i) * TAU, d = R * (0.1 + 0.9 * hash(sd, i + 30));
          const born = (d / R) * 0.6;
          if (p < born) continue;
          const t = (p - born) * life, z = t * 0.045;
          const tw = (Math.floor(age / 90) + i) % 3;
          put(ctx, sparkS("heal", tw === 0 && i % 2 ? 0 : 1), fx.x + Math.cos(an) * d + Math.sin(t * 0.012 + i) * 2, fx.y + Math.sin(an) * d * 0.9 - z);
        }
        for (let i = 0; i < 8; i++) {
          const an = hash(sd, i + 60) * TAU, d = R * (0.3 + 0.6 * hash(sd, i + 70)), born = (d / R) * 0.6;
          if (p < born) continue;
          const t = (p - born) * life;
          put(ctx, leafS((Math.floor(t / 90) + i) % 4), fx.x + Math.cos(an) * d + Math.sin(t * 0.01 + i) * 4, fx.y + Math.sin(an) * d * 0.9 - 4 - t * 0.035);
        }
      }
      ctx.restore();
      return true;
    }
    case "silence": {
      // The stolen voice: a hushed dark ripple spreading from the foe's
      // mouth and a chant-note struck through, rising and fading.
      if (!AIR) return true;
      const life = 900, p = lifeP(fx, life), age = p * life, rise = p * 9;
      ctx.save();
      ctx.globalAlpha *= stepA(a);
      for (let k = 0; k < 2; k++) {
        const q = (age / 450 + k * 0.5) % 1, rr = 4 + q * 13;
        const qa = stepA(1 - q, 3);
        ringPx(ctx, fx.x, fx.y + 4, rr, rr * 0.5, 1.5, rgba(SHADE[3], 0.85 * qa));
        dash(ctx, fx.x, fx.y + 4, rr - 1.5, rr * 0.5 - 0.75, 0.5, 1.2, rgba(SHADE[0], 0.7 * qa));
      }
      const w = [];
      for (let i = 0; i < 4; i++) {
        const t = (age * 0.02 + i * 4) % 16;
        w.push(fx.x + (i - 1.5) * 5 + Math.sin(t * 0.5 + i) * 1.5, fx.y + 2 - t, 1);
      }
      dots(ctx, w, rgba(SHADE[2], 0.8));
      put(ctx, noteS(), fx.x + 1, fx.y - 2 - rise);
      ctx.restore();
      return true;
    }
    case "shadowstep": {
      // A blade steps through shadow: a smoky puff where it left, wisps
      // along the way, a second puff and the cut where it lands.
      if (!AIR) return true;
      const life = fx.life || 380, p = lifeP(fx, life);
      const step = Math.min(1, p * 2.2);
      const hx = fx.x1 + (fx.x2 - fx.x1) * step, hy = fx.y1 + (fx.y2 - fx.y1) * step;
      ctx.save();
      ctx.globalAlpha *= stepA(a);
      const f0 = Math.min(4, Math.floor(p * 5));
      put(ctx, smokeS(0, f0, 1.2), fx.x1, fx.y1 + 2 - f0 * 1.5);
      // the stepping shadow: a streak of smoke thinning behind it
      for (let gi = 3; gi >= 1; gi--) {
        const gt = step - gi * 0.16;
        if (gt <= 0 || (step >= 1 && gt >= 1)) continue;
        put(ctx, smokeS(gi % 3, Math.min(4, gi + (step >= 1 ? 1 : 0)), 0.55), fx.x1 + (fx.x2 - fx.x1) * gt, fx.y1 + (fx.y2 - fx.y1) * gt + 1 - gi);
        put(ctx, sparkS("violet", 2), fx.x1 + (fx.x2 - fx.x1) * gt + 2, fx.y1 + (fx.y2 - fx.y1) * gt - 4 - gi);
      }
      if (step >= 1) {
        const q = (p - 1 / 2.2) / (1 - 1 / 2.2), f1 = Math.min(4, Math.floor(q * 5));
        put(ctx, smokeS(1, f1, 1.2), fx.x2, fx.y2 + 3 - f1 * 1.5);
        const flash = Math.max(0, 1 - (p - 0.45) * 3);
        if (flash > 0) { ctx.globalAlpha *= stepA(flash); put(ctx, cutS(!!fx.prey), fx.x2, fx.y2); }
      } else {
        put(ctx, smokeS(2, 0, 0.75), hx, hy + 2);
      }
      ctx.restore();
      return true;
    }
    case "midas": {
      // The golden mistake: a flash of mint-light, a thin gold ring, coins
      // spinning up and tumbling back, sparkles winking all round.
      if (!AIR) return true;
      const life = fx.life || 650, p = lifeP(fx, life), age = p * life, sd = seedOf(fx);
      const r = 26 * easeOut(p * 1.2);
      ctx.save();
      ctx.globalAlpha *= stepA(a);
      ringPx(ctx, fx.x, fx.y, r, r * 0.8, 1.5, rgba(GOLD[3], 0.8));
      dash(ctx, fx.x, fx.y, r, r * 0.8, 0.5, 1.2, GOLD[0]);
      if (p < 0.34) put(ctx, burstS("gold", Math.min(3, Math.floor(p / 0.085))), fx.x, fx.y - 8);
      for (let i = 0; i < 8; i++) {
        const [gx, gy, z] = fling(sd, i, p, 18, 3.2, 3.6);
        put(ctx, coinS((Math.floor(age / 55) + i) % 4), fx.x + gx, fx.y + gy * 0.8 - z - 4);
      }
      for (let i = 0; i < 10; i++) {
        const t0 = hash(sd, i + 90) * 0.7;
        if (p < t0 || p > t0 + 0.3) continue;
        const an = hash(sd, i + 100) * TAU, d = 6 + hash(sd, i + 110) * 18;
        put(ctx, sparkS("gold", p - t0 < 0.15 ? 0 : 1), fx.x + Math.cos(an) * d, fx.y + Math.sin(an) * d * 0.7 - 10);
      }
      ctx.restore();
      return true;
    }
    case "toll": {
      // The bell-ringer's toll: a bronze bell swinging overhead, rings of
      // sound rolling out from it in bronze, one after another.
      const life = 550, p = lifeP(fx, life), age = p * life, R = fx.r || 46;
      const A = stepA(a);
      ctx.save();
      ctx.globalAlpha *= A;
      if (AIR) {
        for (let k = 0; k < 3; k++) {
          const q = p * 1.35 - k * 0.2;
          if (q <= 0 || q >= 1) continue;
          const rr = R * easeOut(q);
          ctx.globalAlpha = A * stepA(1 - q * 0.7);
          ringPx(ctx, fx.x, fx.y, rr, rr, 2, rgba(BRONZE[3], 0.85));
          dash(ctx, fx.x, fx.y, rr - 0.5, rr - 0.5, 1, 1.4, k === 0 ? BRONZE[0] : BRONZE[1]);
        }
        ctx.globalAlpha = A;
        const sw = Math.sin(age * 0.022) * (1 - p);
        put(ctx, bellS(sw > 0.3 ? 1 : sw < -0.3 ? -1 : 0), fx.x, fx.y - 26);
        // sound-marks either side of the bell as it strikes
        if (Math.abs(sw) > 0.3) {
          const sx = sw > 0 ? 1 : -1, m = [];
          for (let j = 0; j < 3; j++) m.push(fx.x + sx * (10 + j * 1.5), fx.y - 22 + j * 2.5 - 2.5, 1);
          dots(ctx, m, BRONZE[1]);
        }
      }
      ctx.restore();
      return true;
    }
    case "plagueburst": {
      // A ghast bursting: a ring of sickly spore-clouds rolling out, a rot
      // stain left on the ground, spores and gobbets flung wide.
      const life = 500, p = lifeP(fx, life), R = fx.r || 40, sd = seedOf(fx);
      const r = R * easeOut(p * 1.2), A = stepA(a);
      ctx.save();
      ctx.globalAlpha *= A;
      if (GR) {
        if (p > 0.08) put(ctx, rotS(Math.max(12, Math.round(R / 8) * 8)), fx.x, fx.y);
      }
      if (AIR) {
        ringPx(ctx, fx.x, fx.y, r, r, 1.5, rgba(ROT[2], 0.8));
        const n = Math.max(5, Math.min(14, Math.round((TAU * r) / 16)));
        const pf = Math.min(4, Math.floor(p * 5));
        for (let i = 0; i < n; i++) {
          const an = (i / n) * TAU + sd;
          put(ctx, sporeS((i + sd) % 4, pf), fx.x + Math.cos(an) * r * 0.92, fx.y + Math.sin(an) * r * 0.92 - 3 - p * 6);
        }
        const s1 = [], s2 = [], gb = [];
        for (let i = 0; i < 16; i++) {
          const [gx, gy, z] = fling(sd, i, p, R, 1.4, 1.8);
          (i % 2 ? s1 : s2).push(fx.x + gx, fx.y + gy - z - 2, i % 3 ? 0.5 : 1);
        }
        for (let i = 0; i < 5; i++) {
          const [gx, gy, z] = fling(sd, i + 30, p, R * 0.8, 2, 2.4);
          gb.push(fx.x + gx, fx.y + gy - z - 2, 1.5);
        }
        dots(ctx, s1, ROT[0]); dots(ctx, s2, "#a8c048"); dots(ctx, gb, ROT[4]);
      }
      ctx.restore();
      return true;
    }
    case "wardwave": {
      // The chaplain's ward: a shimmering circle of pale runes spreading
      // over the column, turning as it goes.
      const life = 550, p = lifeP(fx, life), age = p * life, R = fx.r || 82, sd = seedOf(fx);
      const r = R * easeOut(p * 1.1), A = stepA(a);
      ctx.save();
      ctx.globalAlpha *= A;
      if (GR) disc(ctx, fx.x, fx.y, r, Math.max(0, r - 8), dither(ctx, WARD[2], 0.19));
      if (AIR && r > 6) {
        ringPx(ctx, fx.x, fx.y, r, r, 1.5, WARD[1]);
        dash(ctx, fx.x, fx.y, r - 8, r - 8, 0.5, 1.5, WARD[2]);
        const n = Math.max(4, Math.min(18, Math.round((TAU * r) / 16)));
        const rot = age * 0.0007, sh = Math.floor(age / 70);
        for (let i = 0; i < n; i++) {
          const an = rot + (i / n) * TAU;
          put(ctx, runeS((i + sd) % 6, (i + sh) % 4 === 0), fx.x + Math.cos(an) * (r - 4), fx.y + Math.sin(an) * (r - 4));
        }
        for (let i = 0; i < 6; i++) {
          const t0 = hash(sd, i + 40) * 0.6;
          if (p < t0 || p > t0 + 0.35) continue;
          const an = hash(sd, i + 50) * TAU, d = r * (0.4 + 0.5 * hash(sd, i + 60));
          put(ctx, sparkS("ward", p - t0 < 0.12 ? 1 : 2), fx.x + Math.cos(an) * d, fx.y + Math.sin(an) * d - (p - t0) * 30);
        }
      }
      ctx.restore();
      return true;
    }
    case "raise": {
      // Grave-light: the earth breaks open, and a swirl of witch-fire
      // spirals up out of the grave as the dead claw back.
      const life = fx.life || 600, p = lifeP(fx, life), age = p * life;
      ctx.save();
      ctx.globalAlpha *= stepA(a);
      if (GR) {
        put(ctx, graveS(), fx.x, fx.y + 2);
        const gr = 16 * (1 - p * 0.4);
        ringPx(ctx, fx.x, fx.y + 2, gr, gr * 0.5, 1.5, rgba(VIOLET[3], 0.8));
        dash(ctx, fx.x, fx.y + 2, gr, gr * 0.5, 0.5, 1, VIOLET[1]);
      }
      if (AIR) {
        const v1 = [], v2 = [], v3 = [];
        for (let i = 0; i < 10; i++) {
          for (let tr = 0; tr < 3; tr++) {
            const t = p * 1.4 - i * 0.05 - tr * 0.025;
            if (t < 0 || t > 1) continue;
            const an = t * 10 + i * (TAU / 10), rad = 11 * (1 - t * 0.65);
            const x = fx.x + Math.cos(an) * rad, y = fx.y + Math.sin(an) * rad * 0.45 - t * 30;
            (tr ? v3 : i % 3 ? v1 : v2).push(x - (tr ? 0 : 0.25), y, tr ? 1 : 1.5);
          }
        }
        dots(ctx, v3, rgba(VIOLET[3], 0.8)); dots(ctx, v1, VIOLET[1]); dots(ctx, v2, "#7cc85c");
        const hl = [];
        for (let i = 0; i < v1.length; i += 3) hl.push(v1[i], v1[i + 1], 0.5);
        dots(ctx, hl, VIOLET[0]);
        if (p < 0.3) put(ctx, burstS("violet", Math.min(3, 1 + Math.floor(p / 0.1))), fx.x, fx.y - 4);
        if ((Math.floor(age / 80)) % 2 === 0) put(ctx, sparkS("violet", 1), fx.x + Math.sin(age * 0.01) * 6, fx.y - 12 - p * 14);
      }
      ctx.restore();
      return true;
    }
    default: return false;
  }
};
