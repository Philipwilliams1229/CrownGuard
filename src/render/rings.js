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

import { PX, INK_LINE, hash } from "./paint.js";
import { inkTint as inkOutline } from "./inktint.js";
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
// the Aegis Magister's shields: the ward pips' own blue (#9ab6d8, flashing
// #eaf2ff in render/enemies.js), a deeper steel-blue body and a dark rim
const AEGIS = ["#ffffff", "#eaf2ff", "#9ab6d8", "#6a88b8", "#3e5488"];
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
// ---- the occlusion rule -----------------------------------------------------
// A ring on the ground round something standing: its BACK half (y above the
// centre, angles pi..2pi) belongs to the ground layer, drawn before the halls
// and figures, so they hide it; its FRONT half to the air layer, drawn after.
// Owner, 2026-11-16: a ring round FOES must never draw over their bodies, so by
// default the whole ring is ground layer (a foe standing on its front arc covers it,
// which is the right depth for a flat ring); only a ring round a HALL (`split`: level
// up, path / final) keeps its front half over the hall's base.
const sideOf = (GR, AIR, an, split = false) => (GR && AIR) || (!split ? GR : Math.sin(an) < 0 ? GR : AIR);
const halfRange = (GR, AIR, split) => (GR && AIR ? [0, TAU] : !split ? (GR ? [0, TAU] : [0, 0]) : GR ? [Math.PI, TAU] : [0, Math.PI]);
const arcPx = (ctx, x, y, rx, ry, th, color, GR, AIR, split = false) => {
  if (rx < 1) return;
  const [a0, a1] = halfRange(GR, AIR, split);
  const n = Math.max(16, Math.ceil((TAU * Math.max(rx, ry)) / (th * 0.6)));
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = Math.ceil((a0 / TAU) * n); i < (a1 / TAU) * n; i++) {
    const an = (i / n) * TAU;
    ctx.rect(sn(x + Math.cos(an) * rx - th / 2), sn(y + Math.sin(an) * ry - th / 2), th, th);
  }
  ctx.fill();
};
const dashArc = (ctx, x, y, rx, ry, sz, gap, style, GR, AIR, split = false) => {
  if (rx < 1) return;
  const [a0, a1] = halfRange(GR, AIR, split);
  const n = Math.max(8, Math.round((TAU * Math.max(rx, ry)) / gap));
  ctx.fillStyle = style;
  ctx.beginPath();
  for (let i = Math.ceil((a0 / TAU) * n); i < (a1 / TAU) * n; i++) {
    const an = (i / n) * TAU;
    ctx.rect(sn(x + Math.cos(an) * rx - sz / 2), sn(y + Math.sin(an) * ry - sz / 2), sz, sz);
  }
  ctx.fill();
};
// ---- attacks that come OUT of a hall (owner, 2026-11-17) ----------------------
// A nova rolling out of a hall: its back half and anything rising behind the
// building is hidden by it (ground layer), its front half shows over the base,
// but ONLY inside the hall's own footprint, so it never crosses a foe's body.
// `hallOf` finds the hall the effect was loosed from (none for a foe's nova).
const hallOf = (g, fx) => g && g.towers && g.towers.find((t) => t.x === fx.x && t.y === fx.y);
// a point in the volume behind the building (its width, its height, above the foot)
const behindHall = (hall, fx, x, y) => !!hall && y < fx.y + 1 && y > fx.y - 44 && Math.abs(x - fx.x) <= 22;
// clip to the hall's footprint (rx 18 / ry 13 at y+3, a little generous), front half only
const clipFront = (ctx, fx) => {
  ctx.beginPath(); ctx.ellipse(fx.x, fx.y + 3, 22, 17, 0, 0, TAU); ctx.clip();
  ctx.beginPath(); ctx.rect(fx.x - 40, fx.y, 80, 40); ctx.clip();
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
const BURST_T = { ice: [ICE[0], ICE[1], ICE[2]], fire: [FIRE[0], FIRE[1], FIRE[2]], gold: [GOLD[0], GOLD[1], GOLD[2]], violet: [VIOLET[0], VIOLET[1], VIOLET[2]], aegis: [AEGIS[0], AEGIS[1], AEGIS[2]] };
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
const TINT = { gold: [GOLD[0], GOLD[1]], ice: [ICE[0], ICE[2]], ward: [WARD[0], WARD[2]], heal: [HEAL[0], HEAL[2]], violet: [VIOLET[0], VIOLET[1]], bronze: [BRONZE[0], BRONZE[1]], rot: [ROT[0], ROT[1]], aegis: [AEGIS[0], AEGIS[2]] };
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
// The aegis: a kite shield in the ward pips' blue, a light cross-ridge down
// its face, lit left / shaded right, rimmed pale, inked deep blue. Sizes:
// 0 the shields riding the ring, 1 the one the magister throws up, 2 the
// little ones that settle on each soldier. Frames 0-3 turn it (face, three-
// quarter, edge-on, three-quarter back); `lit` is the white-hot flash.
const KITE = [[13, 16], [19, 24], [5, 7]];
const kiteS = (size, f, lit) => memo(`kite|${size}|${f}|${lit ? 1 : 0}`, () => {
  const [w, h] = KITE[size], G = grid(w + 4, h + 4), ox = 2, oy = 2;
  const ww = f === 0 ? w : f === 2 ? 2 : Math.max(3, Math.round(w * 0.6)), cx = ox + w / 2;
  const x0 = Math.round(cx - ww / 2), ridge = x0 + Math.floor(ww / 2) + (f === 1 ? -1 : f === 3 && ww > 3 ? 1 : 0);
  const m = new Uint8Array(G.W * G.H), inS = (x, y) => x >= 0 && y >= 0 && x < G.W && y < G.H && m[y * G.W + x];
  for (let y = 0; y < h; y++) {
    const t = (y + 0.5) / h, k = t < 0.42 ? 1 : Math.max(0, 1 - (t - 0.42) / 0.58) ** 0.8;
    const hw = (ww / 2) * k - (y === 0 && ww > 3 ? 0.5 : 0);
    for (let x = x0 - 1; x <= x0 + ww; x++) if (Math.abs(x + 0.5 - cx) <= Math.max(hw, 0.5)) m[(oy + y) * G.W + x] = 1;
  }
  const bar = oy + Math.round(h * 0.3);
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    if (!m[y * G.W + x]) continue;
    const rim = !inS(x - 1, y) || !inS(x + 1, y) || !inS(x, y - 1) || !inS(x, y + 1);
    let c;
    if (f === 2) c = x === ridge ? AEGIS[lit ? 0 : 1] : AEGIS[lit ? 1 : 2];
    else if (rim) c = AEGIS[lit ? 0 : 1];
    else if (x === ridge || (y === bar && f !== 2)) c = AEGIS[lit ? 0 : 1];
    else c = x < ridge ? AEGIS[lit ? 1 : 2] : AEGIS[lit ? 2 : 3];
    G.set(x, y, c);
  }
  return { cv: G.done(AEGIS[4]), ax: Math.round(cx), ay: oy + Math.round(h * 0.45) };
});
// scale-mail: rows of little scallops, half a scale apart, anchored to the
// world like the dither fills; the aegis lays it over the ground it sweeps
const SCALES = ["x.......", ".x.....x", "..xxxxx.", "....x...", "...x.x..", "xxx...xx"];
const scalesP = (ctx, h) => {
  let m = PATS.get(ctx);
  if (!m) PATS.set(ctx, (m = new Map()));
  const key = "scales" + h;
  let p = m.get(key);
  if (!p) {
    const G = grid(8, 6);
    bm(G, SCALES, { x: h }, 0, 0);
    p = ctx.createPattern(G.done(), "repeat");
    if (p.setTransform) p.setTransform(new DOMMatrix([1 / PX, 0, 0, 1 / PX, 0, 0]));
    m.set(key, p);
  }
  return p;
};
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
// a grave broken open (look B's ground): a faint violet pool, dark broken earth,
// cracks radiating out (three growth stages), then green grave-mist and clods
const graveS = (lv = 3) => memo(`grave|${lv}|${PX}`, () => {
  const S = PX, G = grid(48 * S, 26 * S), cx = 24 * S, cy = 13 * S;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const d = Math.hypot((x + 0.5 - cx) / (21 * S), (y + 0.5 - cy) / (10.5 * S));
    if (d < 1 && bay(x, y) < 0.3 * (1 - d * 0.6)) G.set(x, y, VIOLET[3], 120);
  }
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const n = Math.hypot((x + 0.5 - cx) / (13 * S), (y + 0.5 - cy) / (5.6 * S)) + (vnoise(x, y, 3 * S, 7) - 0.5) * 0.4;
    if (n > 1) continue;
    // (owner, 2026-11-17: lighter than the old near-black, turned earth rather than a hole)
    G.set(x, y, n < 0.45 ? "#3a2a1e" : n < 0.8 ? "#4a3626" : bay(x, y) < 0.6 ? "#5a4430" : "#4a3626", n > 0.85 ? 170 : 215);
  }
  for (let k = 0; k < 5; k++) { const a = hash(k, 9) * TAU, r = 1 + hash(k, 5) * 3; G.set(cx + Math.cos(a) * r * S, cy + Math.sin(a) * r * 0.45 * S, VIOLET[2]); }
  return { cv: G.done(), ax: cx, ay: cy };
});
const mistS = (v, f) => memo(`gmist|${v}|${f}|${PX}`, () => {
  const S = PX * 0.5, R = (7 + f) * S, G = grid(2 * R + 6 * S, 2 * R + 4 * S), cx = G.W / 2, cy = G.H / 2;
  const dens = [0.5, 0.42, 0.32, 0.22][f];
  const P = [[-3.5, 0.5, 3.6], [3.5, 0.8, 3.2], [0, -1.2, 4.2]];
  for (let i = 0; i < 3; i++) lump(G, cx + P[i][0] * S * (1 + hash(v, i) * 0.3), cy + P[i][1] * S, P[i][2] * S * (0.9 + 0.3 * hash(v, i + 4)) * (1 + f * 0.15), ["#b8f088", "#7cc85c", "#4a9040", "#2a5a34"], v * 3 + i, dens, 0.3, 0.7);
  return { cv: G.done(), ax: Math.round(cx), ay: Math.round(cy) };
});

// ---- the effects -----------------------------------------------------------
const lifeP = (fx, life) => clamp01(1 - fx.ttl / (fx.life || life));

// The Aegis Magister's cast (a wardwave of kind "aegis", r = his wardRange, ttl 800):
// he throws a great kite shield up over his head and a wall of shields
// sweeps out over the whole company on a bright rim, scale-mail shimmering
// on the ground behind it; as the rim passes each soldier a little shield
// drops onto him, just as his ward pips light. When the wall closes it all
// flashes white, then holds and fades. The chaplain's pale runes stay his.
const AEGIS_OUT = 1.6;
const KITE_TURN = [0, 0, 0, 1, 2, 3];   // the rim is out at full radius at p = 1 / AEGIS_OUT
const drawAegis = (ctx, fx, a, g, GR, AIR) => {
  const life = 800, p = lifeP(fx, life), age = p * life, R = fx.r || 140, sd = seedOf(fx);
  const r = R * easeOut(p * AEGIS_OUT), A = stepA(a), full = p >= 1 / AEGIS_OUT;
  const lock = full && p < 1 / AEGIS_OUT + 0.12;
  const foes = g && g.enemies;
  ctx.save();
  ctx.globalAlpha *= A;
  if (GR && r > 6) {
    disc(ctx, fx.x, fx.y, r, Math.max(0, r - 16), scalesP(ctx, AEGIS[lock ? 1 : 2]));
    // as the wall closes, the mail runs in over everyone inside for a beat
    if (lock) { ctx.globalAlpha = A * 0.5; disc(ctx, fx.x, fx.y, r - 16, 0, scalesP(ctx, AEGIS[2])); ctx.globalAlpha = A; }
  }
  if (r > 6) {
    // the rim: a deep-blue dotted shadow outside, the pips' blue, a white edge
    dashArc(ctx, fx.x, fx.y, r + 1.5, r + 1.5, 1, 3.2, AEGIS[4], GR, AIR);
    arcPx(ctx, fx.x, fx.y, r, r, 2.5, lock ? AEGIS[1] : AEGIS[2], GR, AIR);
    dashArc(ctx, fx.x, fx.y, r - 0.5, r - 0.5, 0.5, 2.6, AEGIS[0], GR, AIR);
  }
  if (AIR) {
    if (r > 6) {
      // the shields riding it, turning as they fly, face-on once it closes
      const n = Math.max(6, Math.min(26, Math.round((TAU * r) / 34)));
      const rot = sd + age * 0.0003, turn = Math.floor(age / 50);
      for (let i = 0; i < n; i++) {
        const an = rot + (i / n) * TAU, f = full ? 0 : KITE_TURN[(turn + i) % 6];
        put(ctx, kiteS(0, f, lock || (!full && f === 0 && i % 3 === 0)), fx.x + Math.cos(an) * (r - 5), fx.y + Math.sin(an) * (r - 5));
      }
    }
    // the magister throws his shield up: a burst and a great kite over him
    if (p < 0.3) {
      let cx = fx.x, cy = fx.y, sz = 17;
      if (foes) for (const e of foes) if (!e.dead && (e.wardFx === "aegis" || e.type === "magister") && Math.abs(e.x - fx.x) < 60 && Math.abs(e.y - fx.y) < 60) { cx = e.x; cy = e.y; sz = e.size || sz; break; }
      const q = p / 0.3, top = cy - sz - 26 - easeOut(q) * 8;
      if (q < 0.72) put(ctx, burstS("aegis", Math.min(3, Math.floor(q / 0.18))), cx, top);
      put(ctx, kiteS(1, 0, q < 0.35), cx, top);
    }
    // a little shield drops onto each soldier as the rim reaches him
    if (foes) {
      let cnt = 0;
      for (const e of foes) {
        if (e.dead) continue;
        const dx = e.x - fx.x, dy = e.y - fx.y;
        if (dx * dx + dy * dy > R * R) continue;
        const hit = (1 - Math.sqrt(Math.max(0, 1 - Math.hypot(dx, dy) / R))) / AEGIS_OUT;
        const tl = (p - hit) * life;
        if (tl < 0 || tl > 240) continue;
        const top = e.y - (e.size || 15) - 4;
        if (tl < 170) put(ctx, kiteS(2, 0, false), e.x, top - Math.round((1 - tl / 170) * 6) * 2);
        else put(ctx, sparkS("aegis", 1), e.x, top);
        if (++cnt >= 60) break;
      }
    }
  }
  ctx.restore();
  return true;
};

// ---- round 2 pieces (2026-11-16) ------------------------------------------
const TOXC = ["#e8f8b0", "#b8e050", "#6cb040", "#3c7a38", "#1e4a30"];
// the bell, concept B: yoke and headstock, a flared body lit from the upper
// left with a dark lip, a clapper swinging the other way; sw -2..2 is the swing
const bellB = (sw) => memo(`bellB|${sw}`, () => {
  const G = grid(36, 28), ox = 18, oy = 6, k = sw / 2;
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) G.set(ox + x + i, oy + y + j, c); };
  rect(-9, -4, 18, 3, "#6a4a2a"); rect(-9, -4, 18, 1, "#8a6238"); rect(-1, -1, 2, 3, BRONZE[4]);
  const shiftOf = (j) => Math.round(k * j * 0.5);
  for (let j = 0; j < 14; j++) {
    const hw = j < 12 ? 2.5 + 5.5 * (1 - Math.pow(1 - j / 11, 2.1)) : 8.6 + (j - 12) * 0.2, sh = shiftOf(j);
    for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) {
      if (Math.abs(dx) > hw) continue;
      const u = dx / hw;
      const col = j >= 12 ? BRONZE[3] : u < -0.55 ? BRONZE[0] : u < -0.1 ? BRONZE[1] : u < 0.45 ? BRONZE[2] : BRONZE[3];
      G.set(ox + dx + sh, oy + j + 1, j === 11 && u < 0.2 ? BRONZE[0] : col);
    }
  }
  const cx = Math.round(-k * 4 + shiftOf(13));
  rect(cx - 1, 16, 3, 3, BRONZE[3]); G.set(ox + cx - 1, oy + 16, BRONZE[1]);
  return { cv: G.done("#4a2e22"), ax: ox, ay: oy };
});
// the level-up arrow (concept A): a little up-pointing arrow, green or gold
const UPA = ["....1....", "...121...", "..12221..", ".1222221.", "111222111", "..12221..", "..12221..", "..12221..", "..11111.."];
const arrowS = (kind) => memo(`arrow|${kind}`, () => {
  const T = kind === "gold" ? GOLD : HEAL, G = grid(11, 11);
  bm(G, UPA, { 1: T[2], 2: T[0] }, 1, 1);
  return { cv: G.done(kind === "gold" ? "#4a3018" : "#1a3d2a"), ax: 5, ay: 5 };
});
// a plague bubble of art-pixel radius r: a rim, a veil of sickly fill, a glint
const bubbleS = (r, f) => memo(`bub|${r}|${f}`, () => {
  const G = grid(2 * r + 5, 2 * r + 5), c = G.W / 2;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    if (d > r) continue;
    if (d > r - 1.3) G.set(x, y, dy > 0 && dx > 0 ? TOXC[2] : TOXC[3]);
    else if (r > 2) { if (bay(x, y) < 0.7) G.set(x, y, TOXC[(dx + dy) / r < -0.2 ? 1 : 2], 235); else G.set(x, y, TOXC[3], 235); }
    else G.set(x, y, TOXC[2]);
  }
  if (r >= 3) { G.set(c - r * 0.45, c - r * 0.5, TOXC[0]); if (r >= 5) { G.set(c - r * 0.45 + 1, c - r * 0.5, TOXC[0]); G.set(c - r * 0.45, c - r * 0.5 + 1, TOXC[0]); } }
  if (f && r >= 4) G.set(c + r * 0.35, c - r * 0.35, TOXC[1]);
  return { cv: G.done(TOXC[4]), ax: c, ay: c };
});
// a bubble bursting: a ring of fragments thrown out, then a few flecks, then nothing
const popS = (r, f) => memo(`pop|${r}|${f}`, () => {
  const R = Math.min(15, r) + 5, G = grid(2 * R + 4, 2 * R + 4), c = G.W / 2;
  const rad = Math.min(15, r) * (1 + f * 0.45) + 1, n = f === 0 ? 10 : f === 1 ? 8 : 5;
  for (let i = 0; i < n; i++) {
    const an = (i / n) * TAU + f * 0.4, x = c + Math.cos(an) * rad, y = c + Math.sin(an) * rad;
    G.set(x, y, f === 2 ? TOXC[2] : TOXC[1]);
    if (f < 2 && i % 2 === 0) G.set(x + Math.cos(an), y + Math.sin(an), TOXC[0]);
  }
  if (f === 0) for (let i = 0; i < 6; i++) { const an = (i / 6) * TAU + 0.3; G.set(c + Math.cos(an) * rad * 0.5, c + Math.sin(an) * rad * 0.5, TOXC[2], 200); }
  return { cv: G.done(), ax: c, ay: c };
});

// ---- Round 5: raising the dead (B) and the frost nova (B + C), owner's picks ------------
// Concept art-pixel numbers (concept/fx-r5-*.js) are kept as they are: `A` converts art px to world units.
const GRN = ["#e8f8c0", "#a8e070", "#7cc85c", "#4a8a3c", "#2e5a2e"];
const AP = (v) => v / PX;
// a batch of art-pixel dots by colour and alpha: key -> [x, y, size] triples in world units
const batchAdd = (m, col, a, x, y, s) => {
  const k = col + "|" + a; let l = m.get(k);
  if (!l) m.set(k, (l = []));
  l.push(AP(x - (s > 1 ? s / 2 : 0)), AP(y - (s > 1 ? s / 2 : 0)), AP(s));
};
const batchDraw = (ctx, m, base) => {
  for (const [k, l] of m) { const i = k.indexOf("|"); ctx.globalAlpha = base * +k.slice(i + 1); dots(ctx, l, k.slice(0, i)); }
  ctx.globalAlpha = base;
};
const stepN = (v, n) => Math.ceil(clamp01(v) * n) / n;
// the ribbons that coil round the risen (three strands, thick at the foot) and the motes off the top; art px from the foot
const RAD = (t) => 19 - 4 * t;
const raiseRibbons = (m, p, front) => {
  const side = (an) => (Math.sin(an) >= 0) === front;
  for (let s = 0; s < 3; s++) for (let i = 0; i < 7; i++) for (let tr = 0; tr < 3; tr++) {
    const t = p * 1.5 * 1.0 - i * 0.07 - tr * 0.025; if (t < 0 || t > 1) continue;
    const an = t * 9 + s * (TAU / 3) + i * 0.45; if (!side(an)) continue;
    const rad = RAD(t) - (s === 1 ? 2 : 0), x = Math.cos(an) * rad, y = Math.sin(an) * rad * 0.45 - t * (44 + s * 3) + 4;
    const g = s === 1;
    batchAdd(m, tr ? VIOLET[3] : g ? GRN[2] : VIOLET[1], tr ? 0.8 : 1, x, y, tr ? 2 : 3);
    if (!tr && !g) batchAdd(m, VIOLET[0], 1, x - 0.5, y - 0.5, 1);
    if (!tr && g && i % 2) batchAdd(m, GRN[0], 1, x - 0.5, y - 0.5, 1);
  }
  if (p >= 0.4) for (let k = 0; k < 10; k++) {
    const u = p * 1.6 - k * 0.07; if (u < 0) continue;
    const q = ((u % 1) + 1) % 1, an = k * 2.4 + p * 9, t = 0.9, rad = RAD(t) + q * 12;
    if (!side(an)) continue;
    batchAdd(m, k % 2 ? GRN[0] : VIOLET[0], stepN(1 - q, 4), Math.cos(an) * rad, Math.sin(an) * rad * 0.45 - t * 44 - q * 18 + 4, 1);
  }
};
// the witch-fire ring the strands rise from, turning, and the stepped violet ring as the grave opens
const raiseRing = (m, p, fi, front, sd) => {
  const k = clamp01(p / 0.18), n = 34, a0 = p * 3, r = 19;
  for (let j = 0; j < n; j++) {
    const an = a0 + (j * TAU) / n;
    if ((Math.sin(an) >= 0) !== front || (j + (fi >> 1)) % 3 === 0) continue;
    const lvl = hash(j, (fi >> 1) + sd);
    batchAdd(m, j % 2 ? GRN[2] : VIOLET[1], stepN(k * (0.7 + 0.3 * lvl), 4), Math.cos(an) * r, Math.sin(an) * r * 0.45 + 6, 1);
    if (j % 4 === 0) batchAdd(m, GRN[0], stepN(k, 4), Math.cos(an) * (r + 2), Math.sin(an) * (r + 2) * 0.45 + 5, 1);
  }
  if (!front && p <= 0.3) {
    const kk = p / 0.3, rr = 6 + kk * 16;
    for (let an = 0; an < TAU; an += 0.09) batchAdd(m, kk < 0.5 ? VIOLET[1] : VIOLET[2], stepN(1 - kk, 4), Math.cos(an) * rr, Math.sin(an) * rr * 0.5 + 4, 1);
  }
};

// frost nova spikes: see-through ice, drawn pixel by pixel once per height and width
const iceSpikeS = (h, w) => memo(`isp|${h}|${w}`, () => {
  const G = grid(2 * Math.ceil(w) + 3, h + 3), cx = Math.ceil(w) + 1, by = G.H - 2;
  for (let j = 0; j < h; j++) {
    const t = j / h, hw = Math.max(0, Math.round((1 - t) * w));
    for (let q = -hw; q <= hw; q++) {
      const edge = Math.abs(q) === hw && hw > 0;
      G.set(cx + q, by - j, edge ? (q < 0 ? ICE[2] : ICE[4]) : q < 0 ? (t > 0.45 ? ICE[0] : ICE[1]) : q === 0 ? ICE[1] : ICE[2]);
    }
  }
  G.set(cx, by - h, ICE[0]);
  return { cv: G.done(), ax: cx, ay: by };
});
const NOVA_SQ = 0.55;
// the nova's spikes: a ring near the rim and a thinner one inside, FEWER than the concept's three rings;
// each erupts in turn round the circle (`at` is the p its sweep reaches it) and shatters a while later
const novaSpikes = (R, sd) => memo(`nsp|${Math.round(R)}|${sd}`, () => {
  const Ra = R * PX, out = [];
  for (const [rho, per, ph0] of [[0.85, 13, 0], [0.5, 18, 0.5]]) {
    const n = Math.max(rho > 0.9 ? 6 : 3, Math.round((TAU * Ra * rho) / per));
    for (let k = 0; k < n; k++) {
      const a = (((k + ph0 + (hash(sd, k + rho * 50) - 0.5) * 0.3) / n)) * TAU - Math.PI / 2;
      out.push({ a, rho: R * rho, h: 13 + Math.floor(hash(k, rho * 9 + sd) * 10), w: Math.round((2.8 + hash(k, 3 + sd) * 1.6) * 2) / 2, at: novaAt(a, rho), j: hash(sd, k + 40) });
    }
  }
  return out;
});
// a spike rises as the sweep reaches its angle (the rim a touch later: the floor's front curls back); ringflash.js matches
// the sweep round the circle takes NOVA_SWEEP of the nova's life (owner, 2026-11-18: "i liked the spinny effect from b")
const NOVA_SWEEP = 0.45;
// (owner, same day: the floor comes in WITH the spikes, a wedge sweeping round from the top, not a full circle first)
const novaAt = (a, rho) => 0.02 + 0.028 * rho + NOVA_SWEEP * ((((a + Math.PI / 2) / TAU) % 1 + 1) % 1);
const novaWedge = (p) => clamp01((p - 0.02) / NOVA_SWEEP);
const NOVA_COL = [ICE[0], ICE[1], ICE[3]];
// the frost nova's lit glass floor, baked per radius: a pale film with slanted streaks (art px)
const glazeS = (R) => memo(`glz|${R}|${PX}`, () => {
  const Ra = R * PX, W = Math.ceil(2 * Ra + 4), H = Math.ceil(2 * Ra * NOVA_SQ + 4), G = grid(W, H), cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x + 0.5 - cx), (y + 0.5 - cy) / NOVA_SQ);
    if (d > Ra - 1) continue;
    if (bay(x, y) < 0.28) G.set(x, y, ICE[2], 204);
    if ((x - y * 2 + 600) % 13 < 1 && hash(x, y) < 0.7) G.set(x, y, ICE[0], 230);
  }
  return { cv: G.done(), ax: cx, ay: cy };
});


// ---- the Plague Ghast's burst (Round 7 A, first half; owner: no pool, nothing left on the road) -----
// Baked per frame in art px (1 unit = PX art px): a ground sheet (glow, landing dots, splats) and an air
// sheet (the swollen blob, gobbets in arcs). One shared bake per (frame, timing); drawn flipped by seed.
const GB_CELL = { cw: 260, ch: 200, ax: 130, ay: 112, N: 30 };
const GB_ROT = ["#d8e8a0", "#a8c46e", "#76944a", "#4e6634", "#34442a"];
const GB_SICK = "#e8f070", GB_SICK2 = "#c8e040";
const GB_R = 110, GB_SQ = 0.55;                      // reach in art px (55 units), ground squash
const gbH = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const gbCl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const gbEase = (t) => 1 - (1 - gbCl(t)) * (1 - gbCl(t));
const gbP = (c, x, y, col, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); c.globalAlpha = 1; };
const gbGobs = [];
for (let k = 0; k < 30; k++) { const rim = k < 12; gbGobs.push({ a: rim ? (k / 12) * TAU + gbH(k, 1) * 0.4 : gbH(k, 2) * TAU, rho: rim ? GB_R * (0.9 + 0.1 * gbH(k, 3)) : GB_R * (0.2 + 0.65 * gbH(k, 4)), s: rim ? 4 + (k % 3) : 2 + (k % 3), h: 26 + gbH(k, 6) * 20 }); }
const gbSplat = (c, x, y, r) => {
  const ry = Math.max(1, Math.round(r * GB_SQ));
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -r; dx <= r; dx++) {
    const d = Math.hypot(dx / r, dy / ry); if (d > 1) continue;
    gbP(c, x + dx, y + dy, d > 0.72 ? GB_ROT[3] : (dx + dy * 2 < -r * 0.3 ? GB_ROT[1] : GB_ROT[2]));
  }
  gbP(c, x - Math.round(r * 0.3), y - Math.round(ry * 0.3), GB_ROT[0]);
  if (r >= 3) gbP(c, x + r + 1, y + 1, GB_ROT[3]);
};
const gbGob = (c, x, y, s) => {
  for (let dy = -s; dy <= s; dy++) for (let dx = -s; dx <= s; dx++) {
    const d = Math.hypot(dx, dy); if (d > s + 0.3) continue;
    const l = -(dx * 0.6 + dy * 0.8) / Math.max(1, s);
    gbP(c, x + dx, y + dy, d > s - 0.6 ? (l > 0 ? GB_ROT[2] : GB_ROT[4]) : l > 0.4 ? GB_ROT[0] : l > -0.1 ? GB_ROT[1] : GB_ROT[2]);
  }
};
const gbGlow = (c, rad, k) => {
  if (k < 0.04) return;
  const m = Math.ceil(rad + 2), my = Math.ceil((rad + 2) * GB_SQ);
  for (let y = -my; y <= my; y++) for (let x = -m; x <= m; x++) {
    const d = Math.hypot(x + 0.5, (y + 0.5) / GB_SQ); if (d > rad) continue;
    const st = Math.ceil(gbCl(k * (1 - d / rad) * 1.5) * 5) / 5;
    if (st > 0 && bay(x & 1023, y & 1023) < st * 0.85) gbP(c, x, y, st > 0.6 ? GB_SICK : GB_SICK2, 0.5);
  }
};
const gbBake = (ms, life, swell, fly, seedFlip) => {
  const { cw, ch, ax, ay } = GB_CELL, mk = () => { const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch; const k = cv.getContext("2d"); k.translate(ax, ay); return { cv, k }; };
  const g = mk(), a = mk(), BODY = -2;
  const fadeT = gbCl((ms - (life - 220)) / 220);                       // the splats thin out over the last 220 ms
  // light: swells with the blob, flares at the split, then dies away
  const gl = ms < swell ? 0.2 + 0.5 * (ms / swell) : Math.max(0, 0.95 - (ms - swell) / (life - swell) * 1.0) * (1 - fadeT * 0.5);
  gbGlow(g.k, GB_R * (ms < swell ? 0.45 : 0.95), gl * 0.9 * (1 - fadeT));
  if (ms < swell) {                                                    // (a) a swollen blob, shuddering, going white
    const q = ms / swell, w = ms / 55, grow = 1 + 0.4 * q * q, sx = 11 * grow, sy = 13 * grow, white = q > 0.8;
    const jx = q > 0.25 ? (Math.floor(ms / 28) & 1 ? 1 : -1) * Math.round(q * 1.5) : 0;
    const rad = (an) => 1 + (0.06 + 0.12 * q) * (Math.sin(3 * an + w * 1.3) + 0.8 * Math.sin(5 * an - w * 1.9 + 1) + 0.6 * Math.sin(2 * an + w * 0.8 + 2));
    const m = Math.ceil(Math.max(sx, sy) * 1.5);
    for (let y = -m; y <= m; y++) for (let x = -m; x <= m; x++) {
      const an = Math.atan2(y / sy, x / sx), nx = x / sx, ny = y / sy, d = Math.hypot(nx, ny) / rad(an); if (d > 1) continue;
      const l = -(nx * 0.6 + ny * 0.8) / Math.max(0.5, Math.hypot(nx, ny)), nz = gbH(Math.floor(x / 3) + 5, Math.floor(y / 3) + Math.floor(ms / 90));
      let col;
      if (white) col = d > 0.82 ? GB_SICK2 : (nz < 0.7 ? "#ffffff" : "#fbffc8");
      else if (d > 0.84) col = l > 0.15 ? GB_ROT[0] : l > -0.3 ? GB_ROT[2] : GB_ROT[4];           // lit top-left lip, dark lower rim
      else if (nz < 0.3) col = GB_ROT[3];                                                           // dark rot blotches
      else if (nz > 0.86 && q > 0.3) col = GB_SICK2;
      else col = l > 0.35 ? GB_ROT[1] : l > -0.2 ? GB_ROT[2] : GB_ROT[3];
      gbP(a.k, x + jx, y + BODY, col);
    }
  } else {
    const t = ms - swell, items = [];
    for (const o of gbGobs) {
      const dur = Math.max(40, fly * (o.rho / GB_R)), u = t / dur;       // lands exactly when the damage front reaches that far
      const tx = Math.round(Math.cos(o.a) * o.rho), ty = Math.round(Math.sin(o.a) * o.rho * GB_SQ);
      if (u < 0) continue;
      if (u < 1) {
        const e = gbEase(u), x = Math.round(tx * e), y = BODY * (1 - e) + ty * e, z = 4 * o.h * u * (1 - u);
        if (bay(tx & 1023, ty & 1023) < 0.5) gbP(g.k, tx, ty, GB_ROT[4], 0.7);   // where it will land
        items.push({ y: ty + 1, d: () => gbGob(a.k, x, Math.round(y - z), o.s) });
      } else {
        const age = (t - dur) / 80, r = Math.max(2, Math.round(o.s * (1.2 + 0.9 * gbEase(age)) + 1));
        if (fadeT === 0 || bay(tx & 1023, ty & 1023) > fadeT) gbSplat(g.k, tx, ty, r);
      }
    }
    items.sort((p, q) => p.y - q.y); for (const it of items) it.d();
    if (t < 70) {                                                       // the split's flash
      const q = 1 - t / 70, rr = Math.round(12 + 10 * (1 - q));
      for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) { const d = Math.hypot(x, y * 1.1); if (d <= rr && gbH(x, y) < q * 1.1) gbP(a.k, x, y + BODY, d < rr * 0.6 ? "#ffffff" : GB_SICK); }
    }
  }
  return { g, a, flip: seedFlip };
};
const GB_CACHE = new Map();
const gbFrame = (fx, life) => {
  const swell = fx.swell || 220, fly = fx.fly || 300, N = GB_CELL.N, ms = life - fx.ttl, k = Math.max(0, Math.min(N - 1, Math.floor(ms / life * N)));
  const key = `${life}|${swell}|${fly}|${k}`;
  let f = GB_CACHE.get(key);
  if (!f) { if (GB_CACHE.size > 90) GB_CACHE.clear(); f = gbBake((k + 0.5) / N * life, life, swell, fly); GB_CACHE.set(key, f); }
  return f;
};

export const drawRingFx = (ctx, fx, a, g, layer = "both") => {
  const GR = layer !== "a", AIR = layer !== "g";
  switch (fx.type) {
    case "frostnova": {
      // Round 5, B + C (owner's picks): C's lit glass floor and glaze with a ring front, B's spikes erupting
      // round the circle in turn (fewer, see-through), then shattering. The ring flash follows the same sweep.
      const life = 800, p = lifeP(fx, life), age = p * life, R = fx.r || 60, sd = seedOf(fx), SQ = NOVA_SQ;
      const r = R, A = stepA(a), hall = hallOf(g, fx), wq = novaWedge(p), wa = -Math.PI / 2 + wq * TAU;
      // everything on the floor is clipped to the wedge swept so far
      // the swept floor's edges are soft curls, not straight spokes: each edge leans back like a spiral arm and wobbles
      const ck = Math.min(1, wq * 6), curl = (t, ph) => ck * -0.55 * t * (1 - 0.35 * t) + 0.09 * Math.sin(t * 7.3 + ph) + 0.05 * Math.sin(t * 15.1 + ph * 1.7);
      const edgePts = (a0, ph, back) => { const o = []; for (let i = 0; i <= 14; i++) { const t = back ? 1 - i / 14 : i / 14, an = a0 + curl(t, ph); o.push(fx.x + Math.cos(an) * (R + 2) * t, fx.y + Math.sin(an) * (R + 2) * SQ * t); } return o; };
      const wedge = () => {
        ctx.beginPath();
        if (wq >= 1) { ctx.ellipse(fx.x, fx.y, R + 2, (R + 2) * SQ, 0, 0, TAU); ctx.clip(); return; }
        const s0 = edgePts(-Math.PI / 2, sd, false), s1 = edgePts(wa, sd + 2.3 + p * 9, true);
        ctx.moveTo(s0[0], s0[1]); for (let i = 2; i < s0.length; i += 2) ctx.lineTo(s0[i], s0[i + 1]);
        // the rim, from where the start edge reaches it round to where the front edge does (a little past: its curl leans back)
        const e0 = -Math.PI / 2 + curl(1, sd), e1 = wa + curl(1, sd + 2.3 + p * 9);
        if (e1 > e0) ctx.ellipse(fx.x, fx.y, R + 2, (R + 2) * SQ, 0, e0, e1);
        for (let i = 0; i < s1.length; i += 2) ctx.lineTo(s1[i], s1[i + 1]);
        ctx.closePath(); ctx.clip();
      };
      const fd = p < 0.5 ? 1 : Math.max(0, 1 - (p - 0.5) / 0.5);
      ctx.save();
      ctx.globalAlpha *= A;
      const base = ctx.globalAlpha;
      const rimLine = () => {
        arcPx(ctx, fx.x, fx.y, r, r * SQ, 1.5, rgba(ICE[3], 0.9), true, false);
        dashArc(ctx, fx.x, fx.y, r - 0.5, (r - 0.5) * SQ, 1, 2.2, ICE[0], true, false);
      };
      // spikes, far ones first; each is a rising spike, then falling shards, then a little pile
      const SPK = novaSpikes(R, sd), back = [], front = [];
      for (const s of SPK) {
        const age13 = (p - s.at) * 13; if (age13 < 0) continue;
        const sh = clamp01((p - s.at - 0.14 - 0.04 * s.j) / 0.12);
        if (sh >= 1 && p > s.at + 0.3) continue;
        const x = fx.x + Math.cos(s.a) * s.rho, y = fx.y + Math.sin(s.a) * s.rho * SQ + 2;
        (hall ? behindHall(hall, fx, x, y) : y < fx.y + 2 ? true : false) ? back.push(s, x, y, age13, sh) : front.push(s, x, y, age13, sh);
      }
      const sortF = (l) => { const o = []; for (let i = 0; i < l.length; i += 5) o.push(i); o.sort((u, w) => l[u + 2] - l[w + 2]); return o; };
      const putSpikes = (l) => {
        const bits = [new Map()];
        for (const i of sortF(l)) {
          const s = l[i], x = l[i + 1], y = l[i + 2], age13 = l[i + 3], sh = l[i + 4];
          if (sh <= 0) {
            const h = Math.max(2, Math.round(s.h * (age13 < 1 ? 0.45 : age13 < 2 ? 0.85 : age13 < 3 ? 1.12 : 1)));
            ctx.globalAlpha = base * 0.8;
            put(ctx, iceSpikeS(h, s.w), x, y);
            ctx.globalAlpha = base;
            continue;
          }
          for (let k = 0; k < 5; k++) {
            const ang = s.a + (hash(k, s.a * 10) - 0.5) * 1.2, v = 5 + hash(k, 8 + s.a * 10) * 9, t = sh;
            const sx = Math.cos(s.a) * s.rho * PX + Math.cos(ang) * v * t, sy = Math.sin(s.a) * s.rho * PX * SQ - s.h * 0.5 * (1 - k / 6) - Math.sin(t * 2.4) * 5 * (1 - t) + t * t * (10 + k * 3) + Math.sin(ang) * v * t * SQ;
            if (t < 1 || bay(k, Math.floor(p * 14)) < 0.5) {
              const col = k % 3 === 0 ? ICE[0] : k % 3 === 1 ? ICE[1] : ICE[3], ox = fx.x * PX, oy = (fx.y + 2) * PX;
              batchAdd(bits[0], col, 0.7, ox + sx, oy + sy, 1); batchAdd(bits[0], ICE[2], 0.7, ox + sx + 1, oy + sy, 1);
              if (k < 2) batchAdd(bits[0], col, 0.7, ox + sx, oy + sy + 1, 1);
            }
          }
          if (sh > 0.6 && bay(Math.round(x * PX), Math.round(y * PX)) < 0.7) batchAdd(bits[0], ICE[2], 0.6, x * PX, y * PX, 1);
        }
        batchDraw(ctx, bits[0], base);
      };
      if (GR) {
        // the lit glass floor, swept in round the circle with the spikes, then the glaze with its streaks
        ctx.save(); if (wq > 0) wedge();
        if (wq > 0) {
        disc(ctx, fx.x, fx.y, r, Math.max(0, r - Math.max(6, R * 0.3)), dither(ctx, ICE[3], 0.5 * fd + 0.1), SQ);
        disc(ctx, fx.x, fx.y, r, 0, dither(ctx, ICE[1], 0.12 * fd + 0.06), SQ);
        disc(ctx, fx.x, fx.y, r, Math.max(0, r - 5), dither(ctx, ICE[0], 0.35 * fd), SQ);
        const gl = clamp01((p - 0.3) / 0.25) * (0.5 + 0.5 * (p < 0.94 ? 1 : (1 - p) / 0.06));
        if (gl > 0.05 && r > 4) {
          const s = glazeS(Math.round(R));
          ctx.save();
          ctx.beginPath(); ctx.ellipse(fx.x, fx.y, r, r * SQ, 0, 0, TAU); ctx.clip();
          ctx.globalAlpha = base * Math.min(1, gl);
          put(ctx, s, fx.x, fx.y);
          ctx.restore();
        }
        rimLine();
        }
        ctx.restore();
        // the centre flash where it was loosed: a bright disc on the ground, falling off outward
        const fi = Math.floor(p * 14);
        if (fi < 6) { const fr = [24, 20, 15, 11, 7, 4][fi] / PX; disc(ctx, fx.x, fx.y, fr * 0.8, 0, dither(ctx, ICE[0], 0.9), SQ); disc(ctx, fx.x, fx.y, fr * 1.5, fr * 0.8, dither(ctx, ICE[1], 0.5), SQ); }
        putSpikes(back);
      }
      if (AIR) {
        if (hall && wq > 0) { ctx.save(); wedge(); clipFront(ctx, fx); rimLine(); ctx.restore(); }
        putSpikes(front);
        const m1 = [], m2 = [];
        for (let i = 0; i < 12; i++) {
          const an = hash(sd, i + 300) * TAU, d = r * (0.3 + 0.7 * hash(sd, i + 330));
          const z = ((age * 0.03 + hash(sd, i + 360) * 16) % 16) + 2;
          (i % 2 ? m1 : m2).push(fx.x + Math.cos(an) * d + Math.sin(age * 0.01 + i) * 1.5, fx.y + Math.sin(an) * d * SQ - z, i % 3 ? 0.5 : 1);
        }
        dots(ctx, m1, ICE[0]); dots(ctx, m2, ICE[1]);
      }
      ctx.restore();
      return true;
    }
    case "firenova": {
      // Round 4, B (owner's pick), on the ground rings' angled circle: a
      // rolling wall of flame on a line of coals, the turf left scorched
      // behind it in a ring, embers lifting, heat haze over the front.
      const life = 450, p = lifeP(fx, life), age = p * life, R = fx.r || 60, sd = seedOf(fx), SQ = 0.55;
      const r = R * easeOut(p * 1.15), A = stepA(a), hall = hallOf(g, fx);
      ctx.save();
      ctx.globalAlpha *= A;
      // the line of coals under the flames: dark embers with hot hearts
      const coals = () => {
        arcPx(ctx, fx.x, fx.y, r, r * SQ, 1.5, rgba(FIRE[4], 0.9), true, false);
        dashArc(ctx, fx.x, fx.y, r + 0.5, (r + 0.5) * SQ, 1, 2.6, FIRE[1], true, false);
        dashArc(ctx, fx.x, fx.y, r, r * SQ, 1, 3.7, FIRE[3], true, false);
      };
      // the flames: those behind the hall are ground layer (it hides them), the rest rise over it
      const flames = (back) => {
        const n = Math.max(6, Math.min(36, Math.round((TAU * r) / 11)));
        const s = a > 0.6 && p > 0.1 ? 1 : 0, fr = Math.floor(age / 65), a0 = hash(sd, 99) * TAU;
        for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
          const an = a0 + (i / n) * TAU, sy = Math.sin(an);
          if ((sy < 0) !== (pass === 0)) continue;
          const fxx = fx.x + Math.cos(an) * r, fyy = fx.y + sy * r * SQ + 1;
          if (behindHall(hall, fx, fxx, fyy) !== back) continue;
          put(ctx, flameS((i + sd) % 3, (fr + i) % 4, s && i % 4 !== 2 ? 1 : 0), fxx, fyy, Math.cos(an) < 0);
        }
      };
      if (GR) {
        // the scorched ring, thick at the front and thinning inward, in dithered soot
        disc(ctx, fx.x, fx.y, r, Math.max(0, r - 7), dither(ctx, FIRE[5], 0.66), SQ);
        disc(ctx, fx.x, fx.y, Math.max(0, r - 7), Math.max(0, r - 16), dither(ctx, FIRE[5], 0.4), SQ);
        disc(ctx, fx.x, fx.y, Math.max(0, r - 3), Math.max(0, r - 6), dither(ctx, FIRE[4], 0.3), SQ);
        const N = Math.max(3, Math.min(10, Math.round(R / 10)));
        for (let i = 0; i < N; i++) {
          const an = hash(sd, i) * TAU, d = R * (0.3 + 0.65 * Math.sqrt(hash(sd, i + 50)));
          if (d > r - 10) continue;
          put(ctx, charS((i + sd) % 6), fx.x + Math.cos(an) * d, fx.y + Math.sin(an) * d * SQ);
        }
        coals();
        flames(true);
      }
      if (AIR) {
        const a0 = hash(sd, 99) * TAU;
        // the front of the ring over the hall's base, inside its footprint only
        if (hall) { ctx.save(); clipFront(ctx, fx); coals(); ctx.restore(); }
        flames(false);
        if (p < 0.3) put(ctx, burstS("fire", Math.min(3, Math.floor(p / 0.075))), fx.x, fx.y - 8);
        // embers flying up off the ring, heat haze wavering above it
        const e1 = [], e2 = [], hz = [];
        for (let i = 0; i < 18; i++) {
          const born = hash(sd, i + 300) * 0.6;
          if (p < born) continue;
          const an = hash(sd, i + 320) * TAU, d = R * easeOut(born * 1.15), t = (p - born) * life;
          const x = fx.x + Math.cos(an) * d + Math.sin(t * 0.02 + i) * 2, y = fx.y + Math.sin(an) * d * SQ - 4 - t * 0.05;
          (i % 3 ? e1 : e2).push(x, y, i % 4 ? 0.5 : 1);
        }
        for (let i = 0; i < 12; i++) {
          const an = (i / 12) * TAU + a0 + 0.2;
          hz.push(fx.x + Math.cos(an) * r + Math.sin(age * 0.03 + i * 2) * 1.5, fx.y + Math.sin(an) * r * SQ - 14 - (i % 3) * 3, 1);
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
      // shockwave of torn turf rolls out, dust and pebbles fly. The wave
      // runs `fx.wave` ms; the cracks then stay till `fx.life`, fading in
      // hard steps (actions.js stretches both by the game speed, so the
      // player's own button plays in the same real time at 1x, 2x and 4x).
      const wave = fx.wave || 450, life = fx.life || wave, R = fx.r || 62, sd = seedOf(fx);
      const p = clamp01((life - fx.ttl) / wave), r = R * easeOut(p * 1.3);
      const A = stepA(1.5 * (1 - p));          // the wave's fade (ttl/300 of a 450ms life)
      const CA = life > wave ? stepA((1.6 * fx.ttl) / (life - wave)) : A;
      const a0 = ctx.globalAlpha;
      ctx.save();
      if (GR) {
        ctx.globalAlpha = a0 * A;
        if (A > 0) disc(ctx, fx.x, fx.y, r, Math.max(0, r - 6), dither(ctx, EARTH[1], 0.31));
        ctx.globalAlpha = a0 * CA;
        put(ctx, cracksS(Math.max(12, Math.round(R / 4) * 4)), fx.x, fx.y);
      }
      if (A > 0) {
        ctx.globalAlpha = a0 * A;
        arcPx(ctx, fx.x, fx.y, r, r, 3, rgba(EARTH[4], 0.85), GR, AIR);
        dashArc(ctx, fx.x, fx.y, r - 1.5, r - 1.5, 1, 1.6, EARTH[0], GR, AIR);
        dashArc(ctx, fx.x, fx.y, r + 3, r + 3, 1, 3, rgba(EARTH[0], 0.5), GR, AIR);
      }
      if (AIR && A > 0) {
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
        // look B: the whole swell is lit, a clearer heart inside it
        disc(ctx, fx.x, fx.y, r, 0, dither(ctx, HEAL[2], 0.3));
        disc(ctx, fx.x, fx.y, r * 0.6, 0, dither(ctx, HEAL[1], 0.22));
        disc(ctx, fx.x, fx.y, r, Math.max(0, r - 3), dither(ctx, HEAL[1], 0.5));
      }
      // the rings round the caster: back half under, front half over
      arcPx(ctx, fx.x, fx.y, r, r, 1.5, HEAL[1], GR, AIR);
      if (r > 12) dashArc(ctx, fx.x, fx.y, r * 0.62, r * 0.62, 0.5, 2, HEAL[2], GR, AIR);
      if (AIR) {
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
      const life = fx.life || 650, p = lifeP(fx, life), age = p * life, sd = seedOf(fx);
      const r = 26 * easeOut(p * 1.2);
      ctx.save();
      ctx.globalAlpha *= stepA(a);
      // the ring round the foe: back half under it, front half over
      arcPx(ctx, fx.x, fx.y, r, r * 0.8, 1.5, rgba(GOLD[3], 0.8), GR, AIR);
      dashArc(ctx, fx.x, fx.y, r, r * 0.8, 0.5, 1.2, GOLD[0], GR, AIR);
      if (!AIR) { ctx.restore(); return true; }
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
      // The bell-ringer's toll (look B): a bell swinging overhead and the toll
      // running out ACROSS the ground in violet-bronze bands, dust kicked up,
      // the graves' own light flickering where it has passed. The rings'
      // lines are split by the occlusion rule: back half under, front over.
      const life = fx.life || 550, p = lifeP(fx, life), age = p * life, R = fx.r || 46, sd = seedOf(fx);
      const A = stepA(a), SQ = 0.55;
      ctx.save();
      ctx.globalAlpha *= A;
      for (let k = 0; k < 3; k++) {
        const q = p * 1.35 - k * 0.2;
        if (q <= 0 || q >= 1) continue;
        const rr = R * easeOut(q), fade = 1 - q;
        if (GR) {
          ctx.globalAlpha = A * stepA(0.7 * fade);
          disc(ctx, fx.x, fx.y, rr, Math.max(0, rr - 5), dither(ctx, VIOLET[1], 0.7), SQ);
        }
        ctx.globalAlpha = A * stepA(fade);
        arcPx(ctx, fx.x, fx.y, rr - 1.5, (rr - 1.5) * SQ, 1.4, BRONZE[1], GR, AIR);
        dashArc(ctx, fx.x, fx.y, rr - 2, (rr - 2) * SQ, 0.5, 2, BRONZE[0], GR, AIR);
        // dust kicked up along the front, each puff on its own side of the ring
        const du = [], dl = [];
        for (let d = 0; d < 9; d++) {
          const an = d * 0.7 + k * 2.1 + hash(sd, k * 9 + d) * 0.4;
          if (!sideOf(GR, AIR, an)) continue;
          const s = (1 + q * 1.4) * (0.7 + 0.6 * hash(sd, d + 70));
          du.push(fx.x + Math.cos(an) * rr - s / 2, fx.y + Math.sin(an) * rr * SQ - 1.5 - q * 3, s);
          dl.push(fx.x + Math.cos(an) * rr, fx.y + Math.sin(an) * rr * SQ - 3.5 - q * 4, 0.5);
        }
        dots(ctx, du, EARTH[1]); dots(ctx, dl, EARTH[0]);
      }
      ctx.globalAlpha = A;
      if (GR) {
        // the graves' light: dark stumps; where the toll has passed, witch-fire
        const st = [], fl = [], hi = [];
        for (let i = 0; i < 7; i++) {
          const an = i * 2.4 + 0.3, d = 10 + hash(sd, i + 4) * 28, x = fx.x + Math.cos(an) * d, y = fx.y + Math.sin(an) * d * SQ;
          st.push(x, y - 0.5, 0.5);
          st.push(x, y - 1, 0.5);
          if (d < p * 1.35 * R + 4 && (Math.floor(age / 70) + i) % 3 !== 0) {
            fl.push(x, y - 1.5, 0.5); hi.push(x, y - 2, 0.5);
            fl.push(x - 0.5, y - 1.5, 0.5); fl.push(x + 0.5, y - 1.5, 0.5);
          }
        }
        dots(ctx, st, VIOLET[4]); dots(ctx, fl, "#4a9040"); dots(ctx, hi, "#eaffd0");
      }
      if (AIR) {
        ctx.globalAlpha = A * stepA(0.3 * (1 - p));
        disc(ctx, fx.x, fx.y - 23, 8, 0, dither(ctx, BRONZE[0], 0.4), 0.7);
        ctx.globalAlpha = A;
        const sw = Math.sin(age * 0.02) * (1 - p * 0.6);
        put(ctx, bellB(Math.max(-2, Math.min(2, Math.round(sw * 2)))), fx.x, fx.y - 25);
        if (Math.abs(sw) > 0.4) {
          const m = [];
          for (const sx of [-1, 1]) for (let j = 0; j < 3; j++) m.push(fx.x + sx * (7 + j), fx.y - 22 + j - 0.5, 0.5);
          dots(ctx, m, VIOLET[1]);
        }
      }
      ctx.restore();
      return true;
    }
    case "plagueburst": {
      // The Plague Ghast's burst (Round 7 A, first half): a swollen blob flashes white and splits, gobbets arc
      // out (landing as the engine's damage front reaches that far), splats thin away. Baked per frame.
      const life = fx.life || 900, f = gbFrame(fx, life), { cw, ch, ax, ay } = GB_CELL, X = sn(fx.x), Y = sn(fx.y);
      const flip = (seedOf(fx) & 1) === 1;
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.translate(X, Y);
      if (flip) ctx.scale(-1, 1);
      if (GR) ctx.drawImage(f.g.cv, -ax / PX, -ay / PX, cw / PX, ch / PX);
      if (AIR) ctx.drawImage(f.a.cv, -ax / PX, -ay / PX, cw / PX, ch / PX);
      ctx.restore();
      return true;
    }
    case "levelup":
    case "evolve": {
      // Look A. A hall (or a figure) levels: a green ring spreads over the
      // ground round its feet, three arrows rise; a path / final is the gold
      // one, with a second ring and a turning ring of sparks. The ground
      // rings obey the occlusion rule: back half under the hall, front over.
      const gold = fx.type === "evolve", life = fx.life || (gold ? 900 : 600);
      const p = lifeP(fx, life), A = stepA(a), TN = gold ? GOLD : HEAL, SQ = 0.55;
      const r = gold ? 12 + 32 * easeOut(p) : 10 + 34 * easeOut(p);
      ctx.save();
      ctx.globalAlpha *= A;
      ctx.globalAlpha *= stepA(gold ? 1 - p * 0.6 : 1 - p * 0.7, 5);
      const ink = gold ? "#4a3018" : "#1a3d2a";
      arcPx(ctx, fx.x, fx.y, r, r * SQ, 2, ink, GR, AIR, true);
      arcPx(ctx, fx.x, fx.y, r, r * SQ, 1, TN[2], GR, AIR, true);
      ctx.globalAlpha = A * stepA(1 - p);
      dashArc(ctx, fx.x, fx.y, r - 1.5, (r - 1.5) * SQ, 0.5, 1.4, TN[0], GR, AIR, true);
      if (gold) {
        const r2 = r * 0.62;
        arcPx(ctx, fx.x, fx.y, r2, r2 * SQ, 1, TN[1], GR, AIR, true);
        const sa = [], sb = [];
        for (let k = 0; k < 10; k += 2) {
          const an = (k / 10) * TAU + p * 3;
          if (sideOf(GR, AIR, an, true)) sa.push(fx.x + Math.cos(an) * r * 0.9, fx.y + Math.sin(an) * r * 0.9 * SQ, 0.5);
          if (sideOf(GR, AIR, an + 0.2, true)) sb.push(fx.x + Math.cos(an + 0.2) * r * 0.9, fx.y + Math.sin(an + 0.2) * r * 0.9 * SQ, 0.5);
        }
        dots(ctx, sa, TN[0]); dots(ctx, sb, TN[1]);
      }
      if (AIR) {
        const n = gold ? 4 : 3;
        for (let k = 0; k < n; k++) {
          const q = clamp01(p * (gold ? 1.1 : 1.2) - k * (gold ? 0.1 : 0.12));
          if (q <= 0 || q >= 1) continue;
          ctx.globalAlpha = A * stepA(1 - q * q, 4);
          put(ctx, arrowS(gold ? "gold" : "green"), fx.x + (k - (n - 1) / 2) * (gold ? 12 : 13), fx.y - 11 - q * (gold ? 25 : 22));
        }
      }
      ctx.restore();
      return true;
    }
    case "wardwave": {
      // The chaplain's ward: a shimmering circle of pale runes spreading
      // over the column, turning as it goes. (The magister's is its own.)
      if (fx.kind === "aegis") return drawAegis(ctx, fx, a, g, GR, AIR);
      const life = 550, p = lifeP(fx, life), age = p * life, R = fx.r || 82, sd = seedOf(fx);
      const r = R * easeOut(p * 1.1), A = stepA(a);
      ctx.save();
      ctx.globalAlpha *= A;
      if (GR) disc(ctx, fx.x, fx.y, r, Math.max(0, r - 8), dither(ctx, WARD[2], 0.19));
      if (r > 6) {
        arcPx(ctx, fx.x, fx.y, r, r, 1.5, WARD[1], GR, AIR);
        dashArc(ctx, fx.x, fx.y, r - 8, r - 8, 0.5, 1.5, WARD[2], GR, AIR);
      }
      if (AIR && r > 6) {
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
      // Round 5, B (owner's pick): the witch-fire ring and three ribbons (violet, green, light violet) coil
      // ROUND the risen: their far half is drawn under the figure, the near half over it. No clods, no cracks.
      const life = fx.life || 600, p = lifeP(fx, life), sd = seedOf(fx), fi = Math.min(11, Math.floor(p * 12));
      ctx.save();
      const fy = fx.fy ?? fx.y + 8;   // the risen's sole line (engine: y + size x 0.55): the grave and its ring are centred on it
      ctx.globalAlpha *= stepA(a);
      const base = ctx.globalAlpha;
      if (GR) {
        // the ground darkens gradually (owner, 2026-11-17): in steps over the first 40% of the rise
        ctx.globalAlpha = base * Math.min(1, Math.ceil(clamp01(p / 0.4) * 5) / 5);
        put(ctx, graveS(p < 0.15 ? 1 : p < 0.35 ? 2 : 3), fx.x, fy + 1);
        ctx.globalAlpha = base;
        for (let k = 0; k < 4; k++) {
          const q = ((p * life / 1250) + k * 0.25 + hash(sd, k) * 0.1) % 1, f = Math.min(3, Math.floor(q * 4));
          if (p > 0.92 && q > 0.5) continue;
          // low, thin and to the sides: the risen figure stays clear of it
          ctx.globalAlpha = base * 0.55 * (1 - q);
          put(ctx, mistS((sd + k) % 5, f), fx.x + (k - 1.5) * 9 + Math.sin(q * 5 + k) * 3, fy + 2 - q * 12);
          ctx.globalAlpha = base;
        }
        ctx.save(); ctx.translate(fx.x, fy - 2);
        const m = new Map(); raiseRing(m, p, fi, false, sd); raiseRibbons(m, p, false); batchDraw(ctx, m, base);
        ctx.restore();
      }
      if (AIR) {
        ctx.save(); ctx.translate(fx.x, fy - 2);
        const m = new Map(); raiseRing(m, p, fi, true, sd); raiseRibbons(m, p, true); batchDraw(ctx, m, base);
        ctx.restore();
      }
      ctx.restore();
      return true;
    }
    default: return false;
  }
};
