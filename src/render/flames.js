// ============ DRAGONFIRE AND BURNING GROUND ============
// The Pyromancer's two final forms, as they touch the field:
//   drawBreath      — Dragonbreath's held plume of fire. Reads t.breath
//                     { on 0..1, ang (ground-plane radians from the hall's
//                     foot), len (reach) } set by engine/update.js breathe,
//                     and leaves from breathMouth(t) in halls/wizard.js.
//   drawFireGround  — the Inferno Throne's burning ground (g.grounds, kind
//                     "fire"), left by every fifth fireball.
//
// Pixel art like fx.js and rings.js: every flame, puff and patch is painted
// art pixel by art pixel ONCE into a memo'd sprite (stepped tones, ordered
// dither, no smooth blends) and stamped with drawImage. A breath is ~60
// stamps, one fill and a handful of specks a frame; a burning patch is one stamp and
// a few specks. Nothing here allocates per frame.
//
// The breath, in the 3/4 camera: a ground point (gx, gy) sits on screen at
// (gx, gy - height). It is a billowing plume from the staff nozzle down onto
// the damage cone (half-angle st.cone from the hall's foot, out to len), so
// what burns on screen is what the engine hits.

import { breathMouth } from "./halls/wizard.js";
import { PX, hash } from "./paint.js";

// ---- palette -------------------------------------------------------------
const KC = {};
const K = (h) => KC[h] || (KC[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30", "#5a2430"];
const SMOKE = ["#7a6a66", "#54464a", "#382c32"];
const SOOT = ["#221a1e", "#2e2226", "#3a2c28", "#4e3e32"];
const ASH = "#6a5c56";
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - (1 - clamp01(t)) ** 2;
const stepA = (a, n = 4) => Math.ceil(clamp01(a) * n) / n;
const sn = (v) => Math.round(v * PX) / PX;

// ---- pixel canvas (as in fx.js) ------------------------------------------
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
  const done = () => { c.putImageData(img, 0, 0); return cv; };
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[(Math.floor(y) * W + Math.floor(x)) * 4 + 3]);
  return { cv, W, H, set, done, d, at };
};
const SPR = new Map();
const memo = (key, make) => {
  let s = SPR.get(key);
  if (!s) { if (SPR.size > 1500) SPR.clear(); s = make(); SPR.set(key, s); }
  return s;
};
const put = (ctx, s, x, y) => {
  ctx.drawImage(s.cv, sn(x) - s.ax / PX, sn(y) - s.ay / PX, s.cv.width / PX, s.cv.height / PX);
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
// a batch of art-pixel squares in one colour: [x, y, size] triples
const dots = (ctx, list, n, style) => {
  if (!n) return;
  ctx.fillStyle = style;
  ctx.beginPath();
  for (let i = 0; i < n; i += 3) ctx.rect(sn(list[i]), sn(list[i + 1]), list[i + 2], list[i + 2]);
  ctx.fill();
};

// ---- sprites ---------------------------------------------------------------
// A lick of fire, a gob of the jet, or a puff of smoke. `shape`:
//   "j" — a gob of the airborne stream: a lumpy ball, barely pointed
//   "f" — a flame tongue: round at the root, drawn up into a leaning point
//   "b" — a billow of the fan: a ball of flame with a short point
//   "s" — smoke: dithered, lit on its upper-left rim
// `st` is the heat: 0 white-hot heart, 1 gold, 2 orange, 3 red and cooling
// (each sprite spans three tones, hottest low in its middle). `r2` is the
// radius in half world units; `v` one of three lumpy variants, cycled for
// the flicker.
const puffS = (shape, st, r2, v) => memo(`p|${shape}|${st}|${r2}|${v}`, () => {
  const R = (r2 / 2) * PX;
  const tip = shape === "f" ? 1 : shape === "b" ? 0.5 : shape === "j" ? 0.25 : 0;
  const up = 1 + tip * 1.5;
  const G = grid(Math.ceil(R * 2.6) + 4, Math.ceil(R * (1.3 + up)) + 4);
  const cx = G.W / 2, cy = Math.ceil(R * up) + 2;
  const lean = (hash(v, 3) - 0.5) * 0.7, seed = v * 7 + st + (shape === "f" ? 30 : 0);
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const nx = (x + 0.5 - cx) / R, ny = (y + 0.5 - cy) / R;
    let d;
    if (ny < 0) {
      const u = -ny / up;
      const sway = lean * u * u + Math.sin(u * 3.2 + v * 2.1) * 0.14 * u * tip;
      const wf = Math.max(0.06, 1 - u * (0.25 + 0.7 * tip));
      d = Math.hypot((nx - sway) / wf, u);
    } else d = Math.hypot(nx, ny * 1.1);
    const edge = 0.8 + 0.32 * vnoise(x, y, Math.max(2, R * 0.45), seed);
    if (d > edge) continue;
    const k = d / edge;
    if (shape === "s") {
      if (bay(x, y) >= 0.9 - k * 0.45) continue;
      const l = -(nx * 0.55 + ny * 0.64);
      G.set(x, y, SMOKE[k > 0.55 && l > 0.25 ? 0 : k < 0.5 ? 2 : 1], 225);
      continue;
    }
    // the outer skin of a big lick frays into dither, so what burns inside shows through
    if (k > 0.8 && R > 5 && st >= 1 && bay(x, y) > 0.55) continue;
    // the heart sits low: fire burns hottest at its root
    const kh = Math.min(0.999, k * 0.9 + (ny > 0 ? ny * 0.2 : 0));
    let idx = st + Math.floor(kh * 3);
    if (k > 0.86 && nx + ny > 0.4) idx++;                  // the far rim, a shade down
    G.set(x, y, FIRE[Math.min(5, idx)]);
  }
  return { cv: G.done(), ax: Math.round(cx), ay: cy };
});

// ---- dither wash (as in rings.js) -----------------------------------------
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

// ---- Dragonbreath -----------------------------------------------------------
// A billowing plume of fire from the staff nozzle (breathMouth), opening
// over the damage wedge (half-angle `cone` from the hall's foot, out to len).
// No hard edges and no spray: the plume is three nested layers of rounded,
// many-lobed billows that overlap into one lumpy body —
//   outer  — red-orange billows spread right across the cone
//   middle — orange billows, a narrower band
//   inner  — yellow billows down the axis, white-hot near the nozzle
// each lit from above (a bright upper side, a shadowed underside) with a
// dithered rim so the layers melt into each other. Every billow leaves the
// nozzle small and flies a gently bowed ray to a spot on the wedge, swelling
// as it goes; the lobes cycle through variants so the mass churns. At the
// far end slow billows roll off into dark smoke; sparks rise off it, and a
// heat-glow is dithered onto the road over exactly the damage wedge.
const LAYERS = [
  // count, seconds nozzle-to-end, lateral spread (share of the cone), reach share, radius at the end
  { n: 26, life: 0.82, lat: 0.76, far: 0.97, r: 11 },
  { n: 17, life: 0.72, lat: 0.46, far: 0.86, r: 8.5 },
  { n: 10, life: 0.62, lat: 0.18, far: 0.72, r: 7 },
];
const BILLOWS = 8;       // slow billows rolling off the front into smoke
const B_LIFE = 1.0;
const EMB = 10;          // sparks
const SPECK = new Float32Array(EMB * 3);
const r2of = (r) => Math.max(2, Math.min(28, Math.round(r * 2)));
const BR = {};           // one breath's numbers, reused (no allocation per frame)

// the three tone sets, hottest last: highlight, body, shadow
const CLOUD_T = [
  [FIRE[2], FIRE[3], FIRE[4]],
  [FIRE[1], FIRE[2], FIRE[3]],
  [FIRE[0], FIRE[1], FIRE[2]],
];
// A billow: four or five round lobes clumped into one cumulus mass, lit
// from above-left (bright upper sides, shadowed undersides), its rim frayed
// into dither so neighbouring billows merge. `tone` picks CLOUD_T.
const cloudS = (tone, r2, v) => memo(`c|${tone}|${r2}|${v}`, () => {
  const R = (r2 / 2) * PX, T = CLOUD_T[tone];
  const G = grid(Math.ceil(R * 2.7) + 4, Math.ceil(R * 2.5) + 4), cx = G.W / 2, cy = G.H / 2 + R * 0.08;
  const L = [];
  const nl = 4 + (v % 2);
  for (let i = 0; i < nl; i++) {
    const an = (i / nl) * TAU + hash(v, i) * 0.9 + v;
    const d = i === 0 ? 0 : R * (0.42 + 0.14 * hash(v, i + 10));
    L.push([cx + Math.cos(an) * d, cy + Math.sin(an) * d * 0.8 - (i ? R * 0.08 : 0), R * (i === 0 ? 0.72 : 0.5 + 0.14 * hash(v, i + 20))]);
  }
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    let n = 9, best = null;
    for (const lb of L) {
      const q = Math.hypot(x + 0.5 - lb[0], y + 0.5 - lb[1]) / lb[2];
      if (q < n) { n = q; best = lb; }
    }
    n += (vnoise(x, y, Math.max(2, R * 0.3), v * 3 + tone) - 0.5) * 0.22;
    if (n > 1) continue;
    if (n > 0.84 && bay(x, y) >= (1 - n) * 5) continue;          // the frayed rim
    // light from above: half from the lobe's own curve, half from the whole mass
    const dx = (x + 0.5 - best[0]) / best[2], dy = (y + 0.5 - best[1]) / best[2];
    const mx = (x + 0.5 - cx) / R, my = (y + 0.5 - cy) / R;
    const l = -(dx * 0.4 + dy * 0.8) * 0.65 - (mx * 0.4 + my * 0.9) * 0.4 + (vnoise(x, y, Math.max(2, R * 0.22), v + 40) - 0.5) * 0.4;
    G.set(x, y, T[l > 0.42 && n < 0.9 ? 0 : l < -0.18 ? 2 : 1]);
  }
  return { cv: G.done(), ax: Math.round(cx), ay: Math.round(cy) };
});

export const drawBreath = (ctx, t, time) => {
  const b = t.breath;
  if (!b || b.on <= 0) return;
  const on = clamp01(b.on), grow = easeOut(on);
  const m = breathMouth(t);
  const ca = Math.cos(b.ang), sa = Math.sin(b.ang), px = -sa, py = ca;
  const cone = b.cone || 0.42, tanC = Math.tan(cone);
  const reach = b.len * (0.2 + 0.8 * grow);
  const sz = 0.55 + 0.45 * grow;
  const fl = Math.floor(time * 20);
  const seed = (t.id | 0) * 131;
  const a = stepA(Math.min(1, on * 2.4), 4);
  ctx.save();
  if (a < 1) ctx.globalAlpha *= a;

  // heat-glow on the road: exactly the damage wedge
  const s0 = reach * 0.22;
  ctx.beginPath();
  ctx.moveTo(t.x + ca * s0 + px * s0 * tanC, t.y + sa * s0 + py * s0 * tanC);
  for (let i = 0; i <= 10; i++) {
    const q = b.ang + cone * (1 - i / 5);
    ctx.lineTo(t.x + Math.cos(q) * reach, t.y + Math.sin(q) * reach);
  }
  ctx.lineTo(t.x + ca * s0 - px * s0 * tanC, t.y + sa * s0 - py * s0 * tanC);
  ctx.closePath();
  ctx.fillStyle = dither(ctx, FIRE[2], 0.25);
  ctx.fill();

  // the far end: slow billows rolling off the front, reddening into smoke
  const EB = (time / B_LIFE) * BILLOWS, eb = Math.floor(EB);
  const baseB = ctx.globalAlpha;
  for (let j = eb - BILLOWS + 1; j <= eb; j++) {
    const p = (EB - j) / BILLOWS, hj = j + seed + 900;
    const lat = hash(hj, 1) * 2 - 1;
    const s = reach * (0.7 + 0.34 * p), l = lat * s * tanC * (0.8 + 0.25 * p);
    const smoke = p > 0.35;
    const r = (smoke ? 4.5 + p * 6 : 5 + p * 5) * (0.8 + 0.4 * hash(hj, 2)) * sz;
    const x = t.x + ca * s + px * l, y = t.y + sa * s + py * l - 4 - p * 18;
    if (smoke) put(ctx, puffS("s", 0, r2of(r), ((hj % 3) + 3) % 3), x, y);
    else { ctx.globalAlpha = baseB * 0.4; put(ctx, cloudS(0, r2of(r), ((hj % 4) + 4) % 4), x, y); ctx.globalAlpha = baseB; }
  }

  // the plume: outer, middle, inner — oldest first within each layer
  // see-through toward the ends: fairly solid at the nozzle, fading in
  // stepped alpha along the flight and out toward the cone's rim
  const sMin = reach * 0.3, base = ctx.globalAlpha;
  for (let li = 0; li < 3; li++) {
    const LY = LAYERS[li];
    const E = (time / LY.life) * LY.n, e0 = Math.floor(E);
    for (let j = e0 - LY.n + 1; j <= e0; j++) {
      const p = (E - j) / LY.n, hj = j + seed + li * 3001;
      if (p < 0 || p >= 1) continue;
      const u = hash(hj, 1) * 2 - 1, lat = Math.sign(u) * Math.abs(u) ** 0.8 * LY.lat;
      const sT = sMin + (reach * LY.far - sMin) * Math.sqrt(hash(hj, 3));
      const lT = lat * sT * tanC;
      const gx = t.x + ca * sT + px * lT, gy = t.y + sa * sT + py * lT - 3;
      const k = 1 - (1 - p) ** 1.25;
      const bow = lat * k * (1 - k) * 11 * sz + Math.sin(time * 7 + hj) * 0.8 * k;
      const x = m.x + (gx - m.x) * k + px * bow, y = m.y + (gy - m.y) * k + py * bow - k * 2;
      const r = (1.6 + (LY.r - 1.6) * Math.sqrt(k)) * (0.85 + 0.3 * hash(hj, 7)) * sz;
      // near the nozzle every layer burns a set hotter
      const tone = Math.min(2, li + (k < 0.14 ? 1 : 0));
      // each billow turns over its lobes on its own beat, so the mass churns without popping
      const vv = Math.floor(time * 3 + hash(hj, 9) * 4) + hj;
      const fade = 0.95 - 0.5 * k - 0.3 * (Math.abs(lat) / 0.76) * k + li * 0.08;
      ctx.globalAlpha = base * Math.max(0.2, Math.min(1, Math.round(fade * 5) / 5));
      put(ctx, cloudS(tone, r2of(r), ((vv % 4) + 4) % 4), x, y);
    }
  }
  ctx.globalAlpha = base;
  // the nozzle: blinding
  put(ctx, puffS("j", 0, r2of((2.2 + (fl & 1) * 0.7) * sz), fl % 3), m.x, m.y);

  // sparks rising off the plume: gold while fresh, red as they fade
  const ET = 0.8, EE = (time / ET) * EMB, ee = Math.floor(EE);
  for (let pass = 0; pass < 2; pass++) {
    let n = 0;
    for (let j = ee - EMB + 1; j <= ee; j++) {
      const p = (EE - j) / EMB, hj = j + seed + 7;
      if ((p < 0.45) !== (pass === 0)) continue;
      const s = reach * (0.45 + 0.6 * hash(hj, 4) * (0.6 + 0.6 * p));
      const l = (hash(hj, 5) * 2 - 1) * s * tanC * 1.1;
      SPECK[n++] = t.x + ca * s + px * l + Math.sin(time * 5 + j) * 2;
      SPECK[n++] = t.y + sa * s + py * l - 8 - p * 28;
      SPECK[n++] = pass ? 0.5 : 1;
    }
    dots(ctx, SPECK, n, pass ? FIRE[3] : FIRE[1]);
  }
  ctx.restore();
};

// ---- the Inferno Throne's burning ground (owner's pick, "Burning ground, take 2: B") ----------
// The pool LIES IN the ground: a char heart, the ground's own colour scorched and browned round it,
// dithered and ragged, no outline; a few forking hairline fissures with embers living in them; and
// patches of 2-4 flame tongues sharing a root, each patch on its own clock, inked with the tinted
// one-pixel line. Baked per (size bucket, shape variant, frame): the ground (embers), the flames and
// smoke behind a foe standing in it ("back", drawn in the ground layer) and the tongues rooted in the
// pool's front half ("front", drawn by drawFireFront after the figures). It catches over ~0.5 s, the
// flames shrink first as it dies (embers last).
const HF = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const smt = (t) => t * t * (3 - 2 * t);
const vn = (x, y, s, sd = 0) => { const gx = x / s, gy = y / s, ix = Math.floor(gx), iy = Math.floor(gy), fx = smt(gx - ix), fy = smt(gy - iy);
  const a = HF(ix, iy + sd), b = HF(ix + 1, iy + sd), c = HF(ix, iy + 1 + sd), d = HF(ix + 1, iy + 1 + sd); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
const blobEdge = (x, y, R, ry, sd) => { const a = Math.atan2(y / ry, x / R);
  const r = 1 + 0.16 * Math.sin(3 * a + sd) + 0.11 * Math.sin(5 * a + 2 * sd + 1) + 0.06 * Math.sin(9 * a + sd * 3) + (a > 2.2 || a < -2.6 ? 0.1 : 0);
  return Math.hypot(x / R, y / ry) / r; };
const FS = [FIRE[0], FIRE[1], FIRE[2], FIRE[3], FIRE[4]];
const FNF = 8;                                   // frames in the loop
const FLT = [0, 0.25, 0.55, 1];                  // flame strength by tier
const PATCH = [[-12, -4, 0.0, 1.3, 4], [10, 7, 0.3, 1.1, 3], [24, -6, 0.62, 0.8, 3], [-30, 8, 0.8, 0.7, 2], [2, -14, 0.45, 0.8, 2]];
const fireGeom = (rb) => { const R = rb * PX * 0.93, ry = R * 0.59, top = Math.ceil(R * 0.75) + 14, hx = Math.ceil(R * 1.5) + 3, hy = Math.ceil(ry * 1.5) + 3; return { R, ry, top, hx, hy }; };
const ellA = (G, cx, cy, rx, ry, col, al, dens) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
  const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry; if (nx * nx + ny * ny > 1 || bay(x, y) >= dens) continue; G.set(x, y, col, al * 255); } };
const fireFlame = (G, x, y, h, w, ph, sway) => {
  for (let j = 0; j < h; j++) {
    const p = j / Math.max(1, h - 1), prof = p < 0.25 ? 0.62 + p * 1.5 : Math.pow(Math.cos(((p - 0.25) / 0.75) * (Math.PI / 2)), 0.85);
    const hw = Math.max(0.6, (w / 2) * prof), off = Math.sin(ph + p * 3.2) * sway * p;
    for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) {
      if (Math.abs(dx) > hw + 0.2) continue;
      const d = Math.abs(dx) / hw;
      G.set(x + dx + off, y - j, d > 0.72 ? FS[3] : d > 0.42 || p > 0.8 ? FS[2] : p < 0.55 && d < 0.2 ? FS[0] : FS[1]);
    }
  }
};
const inkPass = (G) => { const { d, W, H } = G, out = new Uint8ClampedArray(d);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i + 3] > 40) continue; let n = -1;
    if (x > 0 && d[i - 1] > 40) n = i - 4; else if (x < W - 1 && d[i + 7] > 40) n = i + 4; else if (y > 0 && d[i - W * 4 + 3] > 40) n = i - W * 4; else if (y < H - 1 && d[i + W * 4 + 3] > 40) n = i + W * 4;
    if (n < 0) continue; out[i] = d[n] * 0.4 + 10; out[i + 1] = d[n + 1] * 0.32 + 4; out[i + 2] = d[n + 2] * 0.46 + 18; out[i + 3] = 255; }
  d.set(out); };
const firePatches = (G, g, f, v, tier, front) => { const sc = g.R / 56, cx = G.cx, cy = G.cy;
  PATCH.forEach(([x, y, ph, sz, n], k) => { y = Math.round(y * sc); if ((y > 5 * sc) !== front) return;
    const env = Math.pow(Math.sin(((f / FNF + ph + v * 0.21) % 1) * Math.PI), 0.7) * FLT[tier]; if (env < 0.12) return;
    for (let j = 0; j < n; j++) { const off = Math.round(((j - (n - 1) / 2) * 5 + (HF(k, j) - 0.5) * 2) * sc), h = Math.round((8 + 14 * HF(k, j + 3 + v)) * sz * env * (j === 1 ? 1.3 : 1) * 1.15 * sc); if (h < 4) continue;
      fireFlame(G, cx + Math.round(x * sc) + off, cy + y - (j & 1), h, Math.max(3, Math.min(Math.round(h * 0.6), Math.round(7 * sc))), f * 0.9 + k * 2 + j, 1.2 * sc); } }); };
// the ground: glow, char with its scorched fringe, fissures, embers
const fireBaseS = (rb, v, f) => memo(`fb|${rb}|${v}|${f}`, () => {
  const g = fireGeom(rb), { R, ry } = g, G = grid(2 * g.hx, 2 * g.hy + g.top), cx = g.hx, cy = g.hy + g.top, sd = 1.3 + v * 2.1;
  G.cx = cx; G.cy = cy;
  ellA(G, cx, cy, R * 1.1, ry * 1.1, FS[2], 0.1 + 0.02 * Math.sin(f * 0.8), 0.5); ellA(G, cx, cy, R * 0.66, ry * 0.66, FS[2], 0.2 + 0.04 * Math.sin(f * 0.8), 0.5);
  for (let y = -g.hy; y <= g.hy; y++) for (let x = -g.hx; x <= g.hx; x++) {
    const d = blobEdge(x, y, R, ry, sd) + (vn(x, y, 5, 4) - 0.5) * 0.4 + (HF(x, y) - 0.5) * 0.12;
    if (d > 1.45) continue;
    if (d < 0.62) { G.set(cx + x, cy + y, vn(x, y, 6, 2) > 0.6 ? "#2a1c20" : "#20161a"); continue; }
    const k = (d - 0.62) / 0.83;
    if (bay(x, y) >= Math.min(1, (1 - k) * 1.25 + 0.05)) continue;
    G.set(cx + x, cy + y, k < 0.25 ? "#2a1c1c" : k < 0.6 ? "#3a2a1e" : "#4a3a28", (k < 0.6 ? 0.95 : 0.7) * 255);
    if (k > 0.6 && HF(x * 3, y) > 0.7) G.set(cx + x, cy + y, "#1e1a16", 0.6 * 255);
  }
  // fissures: random walks that fork, the same every frame; the embers in them breathe
  const sc = R / 56, walk = (x, y, ang, len, depth, my) => { for (let i = 0; i < len; i++) { ang += (HF(my * 7 + i, sd) - 0.5) * 0.9; x += Math.cos(ang); y += Math.sin(ang) * 0.6;
    if (blobEdge(x, y, R, ry, sd) > 0.88) break; const X = Math.round(x), Y = Math.round(y), lit = 0.5 + 0.5 * Math.sin((f / FNF) * TAU + my * 2.1);
    if ((X + Y) % 2 === 0) { G.set(cx + X, cy + Y - 1, FS[4], 0.45 * 255); G.set(cx + X + 1, cy + Y, FS[4], 0.35 * 255); }
    G.set(cx + X, cy + Y, lit > 0.75 ? FS[1] : lit > 0.4 ? FS[2] : FS[3]); // warm, never white (the lead, 2026-11-16)
    if (depth < 2 && HF(my + i, sd + 5) > 0.93) walk(x, y, ang + (HF(i, my) > 0.5 ? 0.8 : -0.8), (len * 0.6) | 0, depth + 1, my * 3 + i); } };
  for (let k = 0; k < 8; k++) { const a = HF(k, sd + 1) * TAU, dd = 0.08 + 0.35 * HF(k, sd + 2); walk(Math.cos(a) * R * dd, Math.sin(a) * ry * dd, HF(k, sd + 3) * TAU, ((22 + 20 * HF(k, sd + 4)) * Math.max(0.6, sc)) | 0, 0, k); }
  for (let y = -g.hy; y <= g.hy; y++) for (let x = -g.hx; x <= g.hx; x++) if (blobEdge(x, y, R, ry, sd) < 0.7 && HF(x * 2.1, y * 1.7) > 0.985) G.set(cx + x, cy + y, FS[(f + x) & 1 ? 2 : 3]);
  return { cv: G.done(), ax: cx, ay: cy };
});
// the flames (and, behind, the smoke): back = tongues rooted in the back half, front = the front half
const fireFlamesS = (rb, v, f, tier, front) => memo(`ff|${rb}|${v}|${f}|${tier}|${front ? 1 : 0}`, () => {
  const g = fireGeom(rb), G = grid(2 * g.hx, 2 * g.hy + g.top);
  G.cx = g.hx; G.cy = g.hy + g.top;
  firePatches(G, g, f, v, tier, front);
  inkPass(G);
  if (!front && tier > 0) PATCH.slice(0, 3).forEach(([x, y, ph], k) => { const q = (f / FNF * 0.8 + ph) % 1, sc = g.R / 56, sx = G.cx + Math.round(x * sc) + Math.sin(q * 6 + k) * 3, sy = G.cy + Math.round(y * sc) - (24 + q * 26) * sc;
    const rx = (3 + q * 5) * sc, ry2 = (1.6 + q * 3) * sc, col = q < 0.5 ? "#9c969a" : "#6a666e", al = 0.55 * (1 - q) * FLT[tier], dn = 0.85 - q * 0.4;
    for (let yy = Math.floor(sy - ry2); yy <= Math.ceil(sy + ry2); yy++) for (let xx = Math.floor(sx - rx); xx <= Math.ceil(sx + rx); xx++) { const nx = (xx + 0.5 - sx) / rx, ny = (yy + 0.5 - sy) / ry2;
      if (nx * nx + ny * ny > 1 || bay(xx, yy) >= dn || G.at(xx, yy) > 0) continue; G.set(xx, yy, col, al * 255); } });
  let any = false; for (let i = 3; i < G.d.length; i += 4) if (G.d[i]) { any = true; break; }
  return { cv: G.done(), ax: G.cx, ay: G.cy, empty: !any };
});

const FG = new Float32Array(6 * 3);
const fireState = (gr, time, tms) => {
  const left = gr.until - tms, age = gr.born != null ? tms - gr.born : 1e9;
  const a = stepA(Math.min(1, left / 900, age / 240), 4);
  const tier = Math.min(age < 250 ? 1 : age < 500 ? 2 : 3, left < 500 ? 0 : left < 1200 ? 1 : left < 2000 ? 2 : 3);
  const r = Math.max(12, gr.r || 36), rb = Math.round(r / 4) * 4;
  const v = ((Math.floor(gr.x) * 7 + Math.floor(gr.y) * 13) % 4 + 4) % 4;
  const f = (Math.floor(time * 5 + (Math.floor(gr.x) * 3 + Math.floor(gr.y)) * 0.37) % FNF + FNF) % FNF;
  return { a, tier, r, rb, v, f };
};
export const drawFireGround = (ctx, gr, time, tms) => {
  const q = fireState(gr, time, tms);
  if (q.a <= 0) return;
  if (q.a < 1) { ctx.save(); ctx.globalAlpha *= q.a; }
  put(ctx, fireBaseS(q.rb, q.v, q.f), gr.x, gr.y);
  if (q.tier > 0) put(ctx, fireFlamesS(q.rb, q.v, q.f, q.tier, false), gr.x, gr.y);
  // a few sparks lifting off it
  let n = 0;
  if (q.tier > 0) for (let i = 0; i < 5; i++) {
    const ph = (time * 0.9 + i * 0.29 + gr.x * 0.013) % 1;
    const an = i * 2.3 + gr.y * 0.07, d = q.r * (0.15 + 0.07 * i);
    FG[n++] = gr.x + Math.cos(an) * d + Math.sin(time * 4 + i) * 1.5;
    FG[n++] = gr.y + Math.sin(an) * d * 0.6 - 3 - ph * 22;
    FG[n++] = ph < 0.35 ? 1 : 0.5;
    if (q.tier < 3 && i >= 2) break;
  }
  dots(ctx, FG, n, ((time * 3) | 0) % 2 ? FIRE[2] : FIRE[3]);
  if (q.a < 1) ctx.restore();
};
// the tongues rooted in the pool's front half: drawn after the figures (draw.js)
export const drawFireFront = (ctx, gr, time, tms) => {
  const q = fireState(gr, time, tms);
  if (q.a <= 0 || q.tier <= 0) return;
  const s = fireFlamesS(q.rb, q.v, q.f, q.tier, true);
  if (s.empty) return;
  if (q.a < 1) { ctx.save(); ctx.globalAlpha *= q.a; }
  put(ctx, s, gr.x, gr.y);
  if (q.a < 1) ctx.restore();
};
