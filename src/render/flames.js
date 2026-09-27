// ============ DRAGONFIRE AND BURNING GROUND ============
// The Pyromancer's two final forms, as they touch the field:
//   drawBreath      — Dragonbreath's held flamethrower jet. Reads t.breath
//                     { on 0..1, ang (ground-plane radians from the hall's
//                     foot), len (reach) } set by engine/update.js breathe,
//                     and leaves from breathMouth(t) in halls/wizard.js.
//   drawFireGround  — the Inferno Throne's burning ground (g.grounds, kind
//                     "fire"), left by every fifth fireball.
//
// Pixel art like fx.js and rings.js: every flame, puff and patch is painted
// art pixel by art pixel ONCE into a memo'd sprite (stepped tones, ordered
// dither, no smooth blends) and stamped with drawImage. A breath is ~50
// stamps and a handful of specks a frame; a burning patch is one stamp and
// a few specks. Nothing here allocates per frame.
//
// The jet, in the 3/4 camera: a ground point (gx, gy) at height h sits on
// screen at (gx, gy - h). The stream leaves the mouth level, falls as a
// parabola to the road about 38% of the way out (the "impact"), then fans
// across the damage cone (half-angle st.cone, out to len) as tongues of
// flame that billow up, cool through orange and red, and end as smoke.

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
  return { cv, W, H, set, done };
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
const JET = 15;          // gobs along the airborne stream
const FAN = 26;          // tongues alive on the ground fan at once
const FAN_T = 0.62;      // seconds a tongue lives, impact to smoke
const EMB = 10;          // embers kicked up out of the fan
const SPECK = new Float32Array(EMB * 3);
const r2of = (r) => Math.max(2, Math.min(22, Math.round(r * 2)));

// a tapering run of art-pixel squares down the stream's samples, one fill
const core = (ctx, pts, frac, style) => {
  ctx.fillStyle = style;
  ctx.beginPath();
  for (let i = 0; i < JET; i++) {
    const x0 = pts[i * 3], y0 = pts[i * 3 + 1], x1 = pts[i * 3 + 3], y1 = pts[i * 3 + 4];
    const w0 = pts[i * 3 + 2] * frac, w1 = pts[i * 3 + 5] * frac;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1));
    for (let k = 0; k < n; k++) {
      const u = k / n, w = Math.max(1 / PX, sn(w0 + (w1 - w0) * u));
      ctx.rect(sn(x0 + (x1 - x0) * u - w / 2), sn(y0 + (y1 - y0) * u - w / 2), w, w);
    }
  }
  ctx.fill();
};

export const drawBreath = (ctx, t, time) => {
  const b = t.breath;
  if (!b || b.on <= 0) return;
  const on = clamp01(b.on), grow = easeOut(on);
  const m = breathMouth(t);
  const ca = Math.cos(b.ang), sa = Math.sin(b.ang), px = -sa, py = ca;
  const reach = b.len * (0.22 + 0.78 * grow);
  const sI = reach * 0.38;                       // where the stream meets the road
  const H0 = Math.max(8, t.y - m.y);             // the mouth's height over the foot
  const tanC = Math.tan(0.4);
  const sz = 0.5 + 0.5 * grow;
  const fl = Math.floor(time * 16);
  const seed = (t.id | 0) * 131;
  const a = stepA(Math.min(1, on * 2.4), 4);
  ctx.save();
  if (a < 1) ctx.globalAlpha *= a;

  // light thrown on the road under the fan: a sparse dither, denser near the heart
  const g0 = sI * 0.7, gw = 0.36;
  ctx.beginPath();
  ctx.moveTo(t.x + ca * g0 + px * g0 * 0.25, t.y + sa * g0 + py * g0 * 0.25);
  for (let i = 0; i <= 8; i++) {
    const q = -gw + (2 * gw * i) / 8;
    ctx.lineTo(t.x + Math.cos(b.ang + q) * reach * 1.02, t.y + Math.sin(b.ang + q) * reach * 1.02);
  }
  ctx.lineTo(t.x + ca * g0 - px * g0 * 0.25, t.y + sa * g0 - py * g0 * 0.25);
  ctx.closePath();
  ctx.fillStyle = dither(ctx, FIRE[1], 0.1);
  ctx.fill();

  // the fan: tongues born at the impact, thrown out across the cone,
  // billowing up and cooling to smoke; oldest first so the hot ones lie on top
  const E = time / FAN_T * FAN, e0 = Math.floor(E);
  const ix = t.x + ca * sI, iy = t.y + sa * sI;
  for (let j = e0 - FAN + 1; j <= e0; j++) {
    const p = (E - j) / FAN;
    if (p < 0 || p >= 1) continue;
    const hj = j + seed;
    const lat = Math.max(-1, Math.min(1, (hash(hj, 1) + hash(hj, 2) - 1) * 1.35));
    const run = 1 - (1 - p) ** 1.5;
    const s = sI + (reach - sI) * run * (0.82 + 0.25 * hash(hj, 3));
    const l = lat * s * tanC * (0.3 + 0.7 * Math.sqrt(run)) + Math.sin(time * 9 + j) * 1.2 * p;
    const gx = t.x + ca * s + px * l, gy = t.y + sa * s + py * l;
    const smoke = p > 0.84;
    const h = smoke ? 7 + (p - 0.84) * 80 : 1 + p * p * 8;
    const r = (smoke ? 2.6 + (p - 0.84) * 14 : 2.2 + 3.6 * Math.sin(Math.PI * Math.min(1, p / 0.95))) * (0.8 + 0.35 * hash(hj, 7)) * sz;
    const st = p < 0.18 ? 0 : p < 0.42 ? 1 : p < 0.68 ? 2 : 3;
    put(ctx, puffS(smoke ? "s" : "b", smoke ? 0 : st, r2of(r), (j + fl) % 3), gx, gy - h);
  }

  // the stream: gobs along a falling arc, the rush running down it as a
  // travelling swell; a white-hot core laid over the lot
  const mgx = m.x, mgy = t.y;
  const pts = [];
  for (let i = 0; i <= JET; i++) {
    const u = i / JET;
    const gx = mgx + (ix - mgx) * u, gy = mgy + (iy - mgy) * u;
    const h = H0 * (1 - u * u);
    const swell = 1 + 0.22 * Math.sin(u * 17 - time * 42 + t.id) + 0.18 * (hash(i + fl, seed) - 0.5);
    const jit = (hash(i * 3 + fl, seed + 1) - 0.5) * 1.6 * u;
    pts.push(gx + px * jit, gy - h + py * jit, (2 + 3 * u) * swell * sz);
  }
  for (let i = 0; i <= JET; i++) put(ctx, puffS("j", i < 3 ? 1 : 2, r2of(pts[i * 3 + 2]), (i + fl) % 3), pts[i * 3], pts[i * 3 + 1]);
  // the hot core as one tapering line of art pixels, so the stream never reads as beads
  core(ctx, pts, 0.85, FIRE[1]);
  core(ctx, pts, 0.36, FIRE[0]);
  // where it strikes the road: a splash of flame standing up
  put(ctx, puffS("f", 1, r2of((5 + (fl & 1)) * sz), fl % 3), ix, iy);
  put(ctx, puffS("f", 0, r2of(2.6 * sz), (fl + 1) % 3), ix, iy);
  // the mouth flares
  put(ctx, puffS("j", 0, r2of((1.8 + (fl & 1) * 0.6) * sz), fl % 3), m.x, m.y);

  // embers flung up out of the fan: gold while fresh, red as they fade
  const ET = 0.9, EE = time / ET * EMB, ee = Math.floor(EE);
  for (let pass = 0; pass < 2; pass++) {
    let n = 0;
    for (let j = ee - EMB + 1; j <= ee; j++) {
      const p = (EE - j) / EMB, hj = j + seed + 7;
      if ((p < 0.45) !== (pass === 0)) continue;
      const s = sI + (reach - sI) * (0.2 + 0.8 * hash(hj, 4));
      const l = (hash(hj, 5) * 2 - 1) * s * tanC;
      SPECK[n++] = t.x + ca * s + px * l + Math.sin(time * 5 + j) * 2 + (hash(hj, 6) - 0.5) * 10 * p;
      SPECK[n++] = t.y + sa * s + py * l - 4 - p * 26;
      SPECK[n++] = pass ? 0.5 : 1;
    }
    dots(ctx, SPECK, n, pass ? FIRE[3] : FIRE[1]);
  }
  ctx.restore();
};

// ---- the Inferno Throne's burning ground --------------------------------------
// Scorched earth — a soot patch with ember-lit cracks and a few winking coals —
// under a sparse crown of LOW flame tongues. Baked per size bucket, four
// flicker frames, three layouts, two strengths (full; and low, as it catches and as it dies).
// Quieter than the Hellburner's lava: dark and mostly earth-coloured, the
// fire kept to small licks that stand at the patch's edge-to-middle.
const fireGroundS = (rb, v, f, low) => memo(`fg|${rb}|${v}|${f}|${low ? 1 : 0}`, () => {
  const R = rb * PX, ry = R * 0.6, top = 16;
  const G = grid(2 * R + 8, 2 * ry + 8 + top), cx = G.W >> 1, cy = (G.H + top) >> 1;
  const seed = 41 + v * 17;
  for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) {
    const nx = (x + 0.5 - cx) / R, ny = (y + 0.5 - cy) / ry;
    const edge = Math.sqrt(nx * nx + ny * ny) + (vnoise(x, y, Math.max(3, R * 0.28), seed) - 0.5) * 0.45;
    if (edge > 1) continue;
    const b = bay(x, y);
    // cracks: thin contours of a second noise field, lit from below
    const cr = Math.abs(vnoise(x, y, Math.max(3, R * 0.2), seed + 5) - 0.5);
    if (edge < 0.66 && cr < 0.03 && vnoise(x, y, Math.max(3, R * 0.16), seed + 13) > 0.52) {
      const hot = hash(x * 3 + f, y) < (low ? 0.1 : 0.25);
      G.set(x, y, FIRE[hot ? 3 : 4], 230);
      continue;
    }
    // smouldering beds under the ash, breathing a little frame to frame
    const bed = vnoise(x + (f & 1), y - (f >> 1), Math.max(3, R * 0.18), seed + 21);
    if (edge < 0.5 && bed > (low ? 0.8 : 0.72)) { G.set(x, y, FIRE[bed > 0.8 && !low ? 4 : 5], 170); continue; }
    // soot in flat see-through washes, ash-grey where it lies thick; the rim frays
    const ash = vnoise(x, y, Math.max(2, R * 0.12), seed + 9);
    if (edge < 0.55) G.set(x, y, ash > 0.66 ? ASH : SOOT[edge < 0.3 ? 0 : 1], 150);
    else if (edge < 0.84) G.set(x, y, ash > 0.7 ? ASH : SOOT[2], 115);
    else if (b < 0.25) G.set(x, y, SOOT[3], 100);
  }
  // coals that wink across the frames
  const nC = Math.round(R / 5);
  for (let k = 0; k < nC; k++) {
    const an = hash(seed, k) * TAU, d = Math.sqrt(hash(seed, k + 20)) * 0.7;
    const x = cx + Math.cos(an) * R * d, y = cy + Math.sin(an) * ry * d;
    const lit = (k + f) % 4;
    if (lit === 3) continue;
    G.set(x, y, FIRE[lit === 0 && !low ? 1 : 2]); G.set(x + 1, y, FIRE[3]);
  }
  // low flame clumps: a main tongue and a smaller one or two at its side,
  // mostly orange-red, their heat a gold root; a warm stain under each
  const tongue = (bx, by, hgt, w, sway) => {
    for (let yy = 0; yy <= hgt; yy++) {
      const u = yy / hgt, hw = w * (u < 0.3 ? 0.8 + u : (1 - u) * 1.55);
      const ox = sway * u * u * 1.8;
      for (let xx = -Math.ceil(hw); xx <= Math.ceil(hw); xx++) {
        const q = Math.abs(xx - ox) / Math.max(0.5, hw);
        if (q > 1) continue;
        const tone = u > 0.8 ? 4 : u > 0.55 || q > 0.72 ? 3 : u < 0.3 && q < 0.4 && !low ? 1 : 2;
        G.set(bx + xx, by - yy, FIRE[tone]);
      }
    }
  };
  const nT = Math.round(R / (low ? 18 : 11));
  for (let k = 0; k < nT; k++) {
    // spread like seeds in a sunflower, so the licks never bunch to one side
    const an = k * 2.4 + hash(seed, k + 50) * 0.9, d = 0.1 + 0.6 * Math.sqrt((k + 0.5) / nT) * (0.85 + 0.2 * hash(seed, k + 60));
    const bx = Math.round(cx + Math.cos(an) * R * d), by = Math.round(cy + Math.sin(an) * ry * d);
    for (let yy = -3; yy <= 3; yy++) for (let xx = -9; xx <= 9; xx++) {
      if ((xx / 9) ** 2 + (yy / 3) ** 2 <= 1 && bay(bx + xx, by + yy) < 0.6) G.set(bx + xx, by + yy, FIRE[4], 150);
    }
    const hk = hash(k * 5 + f, seed);
    const sway = (f % 2 ? 1 : -1) * (k % 2 ? 1 : -1);
    const hgt = (low ? 7 : 11) + hk * (low ? 4 : 9), w = 3.4 + hash(seed, k + 70) * 1.6;
    const side = hash(seed, k + 80) < 0.5 ? -1 : 1;
    tongue(bx + side * 4, by, Math.round(hgt * (0.45 + 0.25 * hash(k + f, 9))), w * 0.7, sway);
    if (!low) tongue(bx - side * 4, by + 1, Math.round(hgt * (0.35 + 0.2 * hash(k + f, 11))), w * 0.6, -sway);
    if (hk > 0.1) tongue(bx, by + 1, Math.round(hgt), w, sway);   // the main lick gutters now and then
  }
  return { cv: G.done(), ax: cx, ay: cy };
});

const FG = new Float32Array(6 * 3);
export const drawFireGround = (ctx, gr, time, tms) => {
  const left = gr.until - tms, age = gr.born != null ? tms - gr.born : 1e9;
  const a = stepA(Math.min(1, left / 700, age / 320), 4);
  if (a <= 0) return;
  const r = Math.max(12, gr.r || 36);
  const rb = Math.round(r / 4) * 4;
  const f = Math.floor(time * 7 + (gr.x + gr.y) * 0.1) & 3;
  const low = age < 420 || left < 1100;
  if (a < 1) { ctx.save(); ctx.globalAlpha *= a; }
  put(ctx, fireGroundS(rb, (Math.floor(gr.x) * 7 + Math.floor(gr.y) * 13) % 3, f, low), gr.x, gr.y);
  // a few sparks lifting off it, and a thread of smoke
  let n = 0;
  for (let i = 0; i < 5; i++) {
    const ph = (time * 0.9 + i * 0.29 + gr.x * 0.013) % 1;
    const an = i * 2.3 + gr.y * 0.07, d = r * (0.2 + 0.12 * i);
    FG[n++] = gr.x + Math.cos(an) * d + Math.sin(time * 4 + i) * 1.5;
    FG[n++] = gr.y + Math.sin(an) * d * 0.6 - 3 - ph * 16;
    FG[n++] = ph < 0.35 ? 1 : 0.5;
    if (low && i >= 2) break;
  }
  dots(ctx, FG, n, ((time * 3) | 0) % 2 ? FIRE[2] : FIRE[3]);
  if (a < 1) ctx.restore();
};
