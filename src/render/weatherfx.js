// ============ WEATHER PAINTERS ============
// One painter per weather `paint` id (engine/weather.js WEATHER_KINDS),
// drawn over the finished board in world space, after the realm's ambient
// weather (draw.js drawWeather), plus a GROUND half (drawWeatherGround,
// called by draw.js under the actors, after the cloud shadows) for what lies
// on the ground: puddles, splashes, a bolt's gathering glow and its scorch,
// a falling rock's shadow and the ring where it will land. Each reads
// g.weather: `k` (0..1, how hard it is now — it rises through the wind-up
// and falls as it clears), `phase`, `bite`, `marks` (telegraphed strikes) and
// `banks` (grave mist). Signature `(ctx, g, w, def)`; purely cosmetic — the
// engine never reads anything here.
//
//   fog        drifting banks with dithered, lit edges (the land's own field
//              thick over the wood and the water), cleared in a ragged circle
//              round every hall as wide as it can see; as it burns off it
//              breaks into patches and warms, with shafts of morning light
//   storm      a cooler, darker sky with cloud shadow racing over, slanted
//              rain in two depths, splashes and puddles on the road (that
//              glint in the flash); a strike gathers static (a glow on the
//              ground, sparks drawn in, a faint leader down the bolt's own
//              path), then a forked bolt from the top: a white flash frame,
//              a flicker, an afterglow and a branching scorch
//   gravemist  low green-grey banks hugging the road, lobes that curl and
//              sway along its bends, wisps rising, now and then a face or a
//              reaching hand in them; cleared round halls
//   blizzard   whiteout: far and near snow, drifts sweeping across at two
//              speeds, frost creeping in at the board's edges as it lasts
//   eruption   ash haze, ash fall and embers; a rock's shadow grows under a
//              hot ring as a glowing boulder comes down trailing fire and
//              smoke; the landing flashes, throws chips and a dust ring (the
//              engine leaves the scorch)
// Plus: halls set burning (flame tongues after render/flames.js and smoke),
// dazed soldiers (a wheel of electric stars), and a small toast — the kind's
// icon and name — for three seconds as a weather comes in.
//
// Cost: every wash is a baked layer or a pattern fill (render/weatherbake.js
// bakes it all once, the fog once per realm in idle time); per frame it is
// a handful of fills and stamps (see wfx-lab.html &bench=).

import { W, H, WALL_W, RES } from "../data/constants.js";
import { WEATHER_KINDS, weatherDef } from "../engine/weather.js";
import { REALM } from "../data/maps.js";
import { TOTAL_LEN, posAt, lanePos } from "../engine/path.js";
import { forestDepthAt, inRiver, inSea, COAST } from "../data/terrain.js";
import { canvasFont } from "../ui/fonts.js";
import { PX } from "./paint.js";
import * as B from "./weatherbake.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const frac = (v) => v - Math.floor(v);
const sn = (v) => Math.round(v * PX) / PX;
const step4 = (a) => Math.ceil(clamp01(a) * 4) / 4;
// stamp a baked sprite { cv, ax, ay } (art pixels) at a world point
const put = (ctx, s, x, y) => ctx.drawImage(s.cv, sn(x) - s.ax / PX, sn(y) - s.ay / PX, s.cv.width / PX, s.cv.height / PX);
const putC = (ctx, cv, x, y) => ctx.drawImage(cv, sn(x), sn(y), cv.width / PX, cv.height / PX);

// ---- a 1-unit layer for washes with clearings cut in them ----
let LAYER = null;
const layer = () => {
  if (!LAYER && typeof document !== "undefined") LAYER = B.mk(W, H);
  if (!LAYER) return null;
  const c = LAYER.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, W, H);
  return c;
};
const showLayer = (ctx, a = 1, box = null) => {
  ctx.save();
  ctx.imageSmoothingEnabled = false; ctx.globalAlpha = a;
  if (box) ctx.drawImage(LAYER, box[0], box[1], box[2] - box[0], box[3] - box[1], box[0], box[1], box[2] - box[0], box[3] - box[1]);
  else ctx.drawImage(LAYER, 0, 0, W, H);
  ctx.restore();
};
// ragged clearings round the halls (r in units; a ladder of baked sizes)
const RUNGS = [28, 34, 40, 48, 56, 64, 76, 88, 100, 116, 132, 150, 172, 196, 224];
const rung = (r) => { for (const q of RUNGS) if (q >= r) return q; return 0; };
const clearHalls = (c, g, r, box = null, alpha = 1) => {
  const q = rung(r);
  if (!q) { c.clearRect(0, 0, W, H); return; }
  const s = B.clearing(q);
  c.globalCompositeOperation = "destination-out"; c.globalAlpha = alpha;
  for (const t of g.towers) {
    const x = t.x, y = t.y - 12;
    if (box && (x + q < box[0] || x - q > box[2] || y + q < box[1] || y - q > box[3])) continue;
    c.drawImage(s.cv, Math.round(x - s.r), Math.round(y - s.r));
  }
  c.globalCompositeOperation = "source-over";
};

// ---- the weather beyond the board ----
// Fog and mist live on the board's own canvas, so a screen taller or wider than
// the board (an iPad) showed them stop dead at its edge. The painter leaves its
// finished layer in EDGE each frame; paintWeatherEdge lays it out over the
// landscape around the board, MIRRORED at each edge (no seam), on a canvas
// that sits under the board. null when no fog or mist is up.
let EDGE = null;
export const paintWeatherEdge = (cv, board, dpr = 1) => {
  if (!cv) return;
  const e = EDGE;
  const on = !!(e && e.a > 0.01 && board && board.w > 0);
  if (!on) { if (cv._wxOn) { cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); cv._wxOn = false; } return; }
  const c = cv.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  c.imageSmoothingEnabled = false;
  c.globalAlpha = e.a;
  const { x, y, w, h } = board;
  const nx = Math.ceil(Math.max(x, cv.width / dpr - x - w) / w), ny = Math.ceil(Math.max(y, cv.height / dpr - y - h) / h);
  for (let iy = -ny; iy <= ny; iy++) for (let ix = -nx; ix <= nx; ix++) {
    if (!ix && !iy) continue;                      // the board itself is drawn by the board
    const fx = Math.abs(ix) & 1, fy = Math.abs(iy) & 1;
    const tx = x + ix * w, ty = y + iy * h;
    if (tx + w < 0 || ty + h < 0 || tx > cv.width / dpr || ty > cv.height / dpr) continue;
    c.setTransform(dpr * (w / W) * (fx ? -1 : 1), 0, 0, dpr * (h / H) * (fy ? -1 : 1), dpr * (tx + (fx ? w : 0)), dpr * (ty + (fy ? h : 0)));
    c.drawImage(e.cv, 0, 0);
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  cv._wxOn = true;
};

// ---- patterns: a baked sheet scrolled over the whole board in one fill ----
const PATS = new WeakMap();
const fillSheet = (ctx, cv, scale, ox, oy, a) => {
  if (a <= 0.01) return;
  let m = PATS.get(ctx);
  if (!m) PATS.set(ctx, (m = new Map()));
  let p = m.get(cv);
  if (!p) { p = ctx.createPattern(cv, "repeat"); m.set(cv, p); }
  const tw = cv.width * scale, th = cv.height * scale;
  if (p.setTransform) p.setTransform(new DOMMatrix([scale, 0, 0, scale, ((ox % tw) + tw) % tw, ((oy % th) + th) % th]));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = a; ctx.fillStyle = p;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
};
// n things falling across the board at (vx, vy) units/s, each its own sprite
// (`spr(i)`), wrapped round the board; stateless (seeded by i)
const fall = (ctx, n, spr, vx, vy, t, seed, wob = 0) => {
  const PW = W + 40, PH = H + 40;
  for (let i = 0; i < n; i++) {
    const sp = 0.85 + 0.3 * B.h2(i, 3, seed);
    const x = ((B.h2(i, 1, seed) * PW + vx * sp * t) % PW + PW) % PW - 20;
    const y = ((B.h2(i, 2, seed) * PH + vy * sp * t + (wob ? Math.sin(t * 1.7 + i) * wob : 0)) % PH + PH) % PH - 20;
    const s = spr(i);
    ctx.drawImage(s.cv, sn(x) - s.ax / PX, sn(y) - s.ay / PX, s.cv.width / PX, s.cv.height / PX);
  }
};
const wash = (ctx, col, a) => { if (a <= 0.005) return; ctx.fillStyle = `rgba(${col},${a.toFixed(3)})`; ctx.fillRect(-8, -8, W + 16, H + 16); };

// ---- idle-time warming of the per-realm bakes ----
const realmKey = () => `${REALM?.id || "?"}|${REALM?.seed || 0}|${TOTAL_LEN | 0}`;
const idle = typeof requestIdleCallback === "function" ? (f) => requestIdleCallback(f, { timeout: 1500 }) : (f) => setTimeout(f, 30);
let WARMING = "";
const warm = (kind) => {
  const key = `${kind}|${realmKey()}`;
  if (WARMING === key || typeof document === "undefined") return;
  WARMING = key;
  // one bake per idle slice, so no slice runs long
  const jobs = {
    fog: [fogArt, B.fogShafts, ...RUNGS.slice(4).map((r) => () => B.clearing(r))],
    storm: [B.stormShade, () => B.rainSheet(false), () => [0, 1, 2].forEach(B.rainDrop), () => puddles().forEach((p) => B.puddle(p.wu, p.v))],
    blizzard: [() => B.snowDrift(false), () => B.snowDrift(true), () => B.snowSheet(false),
      ...["t", "b", "l", "r"].flatMap((sd) => [1, 2, 3, 4].map((i) => () => B.frostStrip(sd, FROST_D[sd], i / 4)))],
    eruption: [B.ashHaze, B.ashSheet, () => { for (let v = 0; v < 3; v++) for (let f = 0; f < 8; f++) B.boulder(ROCK_R, v, f); }],
    gravemist: [() => { for (let f = 0; f < 6; f++) B.mistWisp(f); B.mistShade(0); B.mistShade(1); }],
  }[kind] || [];
  const next = () => { const j = jobs.shift(); if (!j || WARMING !== key) return; j(); idle(next); };
  idle(next);
};

// ================= FOG =================
const landAt = (x, y) => {
  let v = 0;
  const fd = forestDepthAt(x, y);
  if (fd > -70) v = Math.max(v, Math.min(1, (fd + 70) / 100));
  if (inRiver(x, y, 30)) v = Math.max(v, 0.78);
  for (const p of REALM.ponds || []) {
    const d = Math.hypot((x - p.x) / ((p.w || 40) / 2 + 30), (y - p.y) / ((p.h || 30) / 2 + 22));
    if (d < 1) v = Math.max(v, 0.85 * (1 - d * 0.45));
  }
  if (COAST && inSea(x, y, 24)) v = Math.max(v, 0.62);
  v *= 1 - 0.65 * clamp01((x - (W - WALL_W - 90)) / 80);   // the castle stands above it (eased, no seam)
  return v;
};
const fogArt = () => B.bakeFog(realmKey(), landAt);

const fog = (ctx, g, w, def) => {
  const k = w.k, t = g.time;
  if (k < 0.02) return;
  const F = fogArt(), c = layer();
  if (!c) return;
  // the lie of the land: thick over the wood and the water, the last to go
  c.globalAlpha = Math.min(1, k * 1.9);
  c.drawImage(F.land, 0, 0);
  // the banks, drifting east on the morning air; as it burns off the thick
  // banks give way to patches
  const thick = Math.pow(clamp01((k - 0.25) / 0.75), 0.8);
  const patchy = Math.min(1, k / 0.25) * (1 - thick * 0.55);
  const ox1 = frac(t * 5 / W) * W, ox2 = frac((t * 9 + 310) / W) * W;
  if (thick > 0.01) { c.globalAlpha = thick; c.drawImage(F.thick, -ox1, 0); c.drawImage(F.thick, W - ox1, 0); }
  if (patchy > 0.01) { c.globalAlpha = patchy; c.drawImage(F.patchy, -ox2, 0); c.drawImage(F.patchy, W - ox2, 0); }
  // the sun breaking through: the fog itself warms, lit in slanting shafts
  // (only as it LIFTS: fog drifting in comes grey, without the sun)
  const sun = w.phase === "easing" && k < 0.995 ? clamp01((1 - k) / 0.55) : 0;
  if (sun > 0) {
    c.globalCompositeOperation = "source-atop";
    c.globalAlpha = sun * 0.2; c.fillStyle = "#fff0c4"; c.fillRect(0, 0, W, H);
    c.globalAlpha = sun * 0.85; c.drawImage(B.fogShafts(), -80 + Math.sin(t * 0.07) * 50, 0);
  }
  // every hall sees out to `sight`: the fog thins round it as far
  const sight = (def?.fx?.sight || 85) / Math.max(0.05, k);
  clearHalls(c, g, sight * 1.1);
  showLayer(ctx, 1);
  EDGE = { cv: LAYER, a: 1 };
};

// ================= STORM =================
// puddles: where they lie on this board (a stretch of road each)
const puddles = () => B.memo(`puds|${realmKey()}`, () => {
  const out = [], n = 18;
  for (let i = 0; i < n; i++) {
    const d = TOTAL_LEN * ((i + 0.5 + (B.h2(i, 1, 200) - 0.5) * 0.7) / n);
    if (d < 20 || d > TOTAL_LEN - 30) continue;
    const [x, y] = lanePos(d, (B.h2(i, 2, 200) - 0.5) * 22);
    if (x > W - WALL_W - 10) continue;
    out.push({ x, y, wu: 2 * Math.round(5 + B.h2(i, 3, 200) * 5), v: i % 4, i });
  }
  return out;
});
// the lightning's flash now (0..1), from the newest bolt
const boltFlash = (g) => {
  let f = 0;
  for (const fx of g.effects) {
    if (fx.type !== "wxbolt") continue;
    const age = fx.life - fx.ttl;
    f = Math.max(f, age < 50 ? 1 : age >= 170 && age < 240 ? 0.35 : age < 110 ? 0.5 : 0);
  }
  return f;
};
const boltSeed = (x, y) => (Math.round(x) * 13 + Math.round(y) * 7) | 0;
// strikes remembered for their scorch (render-side, cosmetic)
const SEEN = new WeakSet();
let SCORCH = [];

const stormGround = (ctx, g, w) => {
  const k = w.k, t = g.time, tms = t * 1000;
  // remember new strikes for their scorch, forget old ones
  for (const fx of g.effects) {
    if (fx.type !== "wxbolt" || SEEN.has(fx)) continue;
    SEEN.add(fx);
    SCORCH.push({ x: fx.x, y: fx.y, r: Math.round(fx.r * 0.5), v: boltSeed(fx.x, fx.y) & 3, t: t - (fx.life - fx.ttl) / 1000 });
  }
  if (SCORCH.length) SCORCH = SCORCH.filter((s) => t - s.t < 4.5 && s.t <= t + 0.1);
  for (const s of SCORCH) {
    const age = t - s.t;
    ctx.globalAlpha = step4(age < 3.5 ? 1 : (4.5 - age));
    put(ctx, B.boltScorch(s.r, s.v), s.x, s.y + 3);
    // the afterglow: the burn still hot for a moment
    if (age < 0.9) { ctx.globalAlpha = step4(1 - age / 0.9); put(ctx, B.staticGlow(Math.round(s.r * 1.2), 2), s.x, s.y + 3); }
  }
  ctx.globalAlpha = 1;
  // puddles fill as it rains, and glint in the flash
  if (k > 0.05) {
    const flash = boltFlash(g), pa = step4(k);
    for (const p of puddles()) {
      ctx.globalAlpha = pa;
      put(ctx, B.puddle(p.wu, p.v), p.x, p.y);
      const ph = frac(t * 1.7 + p.i * 0.37);
      if (k > 0.5 && ph < 0.5) { ctx.globalAlpha = pa; put(ctx, B.ripple(ph < 0.25 ? 0 : 1), p.x + (B.h2(p.i, Math.floor(t * 1.7), 201) - 0.5) * p.wu * 0.5, p.y); }
      if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = "#f4f8ff"; ctx.fillRect(sn(p.x - p.wu * 0.3), sn(p.y - 1), p.wu * 0.4, 1); }
    }
    ctx.globalAlpha = 1;
    // splashes on the road, and fainter ones on the turf
    const n = Math.round(30 * k);
    for (let i = 0; i < n; i++) {
      const P = 0.32 + B.h2(i, 1, 210) * 0.22, q = (t + B.h2(i, 2, 210) * P) / P, cyc = Math.floor(q), f = Math.floor(frac(q) * 5);
      if (f > 3) continue;
      const road = i < 20;
      let x, y;
      if (road) [x, y] = lanePos(B.h2(i, cyc, 211) * TOTAL_LEN, (B.h2(i, cyc, 212) - 0.5) * 30);
      else { x = B.h2(i, cyc, 213) * (W - WALL_W); y = B.h2(i, cyc, 214) * H; }
      ctx.globalAlpha = road ? 1 : 0.55;
      put(ctx, B.splash(f), x, y);
    }
    ctx.globalAlpha = 1;
  }
  // a strike gathering: a pale glow swelling on the ground under it, flickering
  for (const m of w.marks) {
    if (m.kind !== "bolt") continue;
    const p = clamp01((tms - m.t0) / (m.at - m.t0));
    const s = Math.min(2, Math.floor(p * 2.6) + (Math.floor(tms / 60) % 2));
    ctx.globalAlpha = step4(0.4 + p * 0.6);
    put(ctx, B.staticGlow(Math.round(m.r * (0.55 + 0.35 * p)), s), m.x, m.y + 3);
  }
  ctx.globalAlpha = 1;
};

// a little crackling arc between two points (live: a handful of art pixels)
const arc = (ctx, x0, y0, x1, y1, seed, col) => {
  const n = 4, pts = [[x0, y0]];
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  for (let i = 1; i < n; i++) { const j = (B.h2(seed, i, 220) - 0.5) * 6; pts.push([x0 + (x1 - x0) * i / n + nx * j, y0 + (y1 - y0) * i / n + ny * j]); }
  pts.push([x1, y1]);
  ctx.fillStyle = col; ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], st = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * PX);
    for (let q = 0; q <= st; q++) ctx.rect(sn(ax + (bx - ax) * q / st), sn(ay + (by - ay) * q / st), 1 / PX, 1 / PX);
  }
  ctx.fill();
};

const storm = (ctx, g, w) => {
  const k = w.k, t = g.time, tms = t * 1000;
  // the sky closes in: darker and cooler, cloud shadow racing over
  // (the sky, its cloud shadow and the far rain share one 1-unit layer: one blit)
  const c = layer();
  if (c) {
    wash(c, "14,20,40", 0.3 * k);
    fillSheet(c, B.stormShade(), 2, t * 38, t * 9, k);
    fillSheet(c, B.rainSheet(false), 1, -t * 88, t * 350, 0.85 * k);
    showLayer(ctx, 1);
  }
  // the near rain, crisp at the art grid
  fall(ctx, Math.round(520 * k), (i) => B.rainDrop(i % 3), -134, 540, t, 301);
  // a strike gathering: sparks drawn in and rising, little arcs, a faint leader
  for (const m of w.marks) {
    if (m.kind !== "bolt") continue;
    const p = clamp01((tms - m.t0) / (m.at - m.t0));
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785 + (tms / 260) * (i % 2 ? 1 : -1);
      const rr = m.r * (1 - 0.6 * p) * (0.6 + 0.4 * B.h2(i, 1, 230));
      const rise = frac(tms / 380 + i * 0.29) * 12;
      const on = (Math.floor(tms / 50) + i) % 3 !== 0;
      if (!on) continue;
      putC(ctx, B.mote(i % 2 ? "#ffffff" : "#e8f0ff", "#7c98e8"), m.x + Math.cos(a) * rr - 0.75, m.y + Math.sin(a) * rr * 0.5 - rise - 0.75);
    }
    const fr = Math.floor(tms / 45);
    for (let i = 0; i < 2; i++) {
      if ((fr + i) % 3 === 0) continue;
      const a0 = B.h2(fr, i, 231) * 6.28, a1 = a0 + 0.8 + B.h2(fr, i, 232);
      const rr = m.r * (0.85 - 0.4 * p);
      arc(ctx, m.x + Math.cos(a0) * rr, m.y + Math.sin(a0) * rr * 0.5 - 2, m.x + Math.cos(a1) * rr * 0.6, m.y + Math.sin(a1) * rr * 0.3 - 4, fr * 7 + i, i ? "#e8f0ff" : "#9ab4ff");
    }
    if (p > 0.55) {
      // the leader feels its way down the very path the bolt will take
      const s = B.boltSprite(m.x, m.y, boltSeed(m.x, m.y), false);
      const yl = -12 + (m.y + 12) * Math.min(1, (p - 0.55) / 0.45) * 0.9;
      ctx.save();
      ctx.beginPath(); ctx.rect(-20, -20, W + 40, yl + 20); ctx.clip();
      ctx.globalAlpha = (Math.floor(tms / 40) % 2 ? 0.28 : 0.16);
      ctx.drawImage(s.cv, s.x, s.y, s.cv.width / PX, s.cv.height / PX);
      ctx.restore();
    }
  }
  // the bolts that just fell: a white flash frame, the bolt, a flicker, a fade
  let flash = 0;
  for (const fx of g.effects) {
    if (fx.type !== "wxbolt") continue;
    const age = fx.life - fx.ttl, seed = boltSeed(fx.x, fx.y);
    const hot = age < 50;
    const a = hot || age < 120 ? 1 : age < 170 ? 0.3 : age < 240 ? 1 : step4(1 - (age - 240) / 180);
    flash = Math.max(flash, hot ? 0.5 : age >= 170 && age < 240 ? 0.14 : 0);
    if (a > 0) {
      const s = B.boltSprite(fx.x, fx.y, seed, hot);
      ctx.globalAlpha = a;
      ctx.drawImage(s.cv, s.x, s.y, s.cv.width / PX, s.cv.height / PX);
    }
    // the strike's foot: a burst of light, sparks thrown out along the ground
    if (age < 260) {
      const q = age / 260;
      ctx.globalAlpha = step4(1 - q);
      put(ctx, B.staticGlow(Math.round(fx.r * 0.7), 2), fx.x, fx.y);
      for (let i = 0; i < 10; i++) {
        const an = i * 0.628 + B.h2(seed, i, 233), rr = fx.r * (0.2 + q * (0.7 + 0.4 * B.h2(seed, i, 234)));
        putC(ctx, B.mote(i % 3 ? "#ffffff" : "#fff2a0", "#9ab4ff"), fx.x + Math.cos(an) * rr, fx.y + Math.sin(an) * rr * 0.5 - Math.sin(q * 3.1) * 6);
      }
    }
    ctx.globalAlpha = 1;
  }
  if (flash > 0) wash(ctx, "236,242,255", flash);
};

// ================= GRAVE MIST =================
const gravemist = (ctx, g, w) => {
  const k = w.k, t = g.time;
  if (!w.banks.length || k < 0.02) return;
  const c = layer();
  if (!c) return;
  const boxes = [];
  w.banks.forEach((b, bi) => {
    const r = b.r, box = [1e9, 1e9, -1e9, -1e9];
    for (let j = 0; j < 7; j++) {
      const u = (j / 6) * 2 - 1, d = b.d + u * r * 1.2;
      if (d < 0 || d > TOTAL_LEN) continue;
      const [x, y] = lanePos(d, Math.sin(t * 0.37 + j * 1.9 + bi * 2.3) * r * 0.2);
      const rx = 2 * Math.round(r * (0.7 - 0.24 * Math.abs(u)) / 2);
      // each lobe curls slowly through its four shapes
      const ph = t * 0.32 + j * 0.77 + bi * 0.5, v0 = Math.floor(ph) & 3, f = frac(ph);
      const s0 = B.mistLobe(rx, v0), s1 = B.mistLobe(rx, (v0 + 1) & 3);
      const bx = Math.round(x + Math.sin(t * 0.5 + j) * 2), by = Math.round(y);
      c.globalAlpha = 1; c.drawImage(s0.cv, bx - s0.ax, by - s0.ay);
      c.globalAlpha = f; c.drawImage(s1.cv, bx - s1.ax, by - s1.ay);
      box[0] = Math.min(box[0], bx - s0.ax); box[1] = Math.min(box[1], by - s0.ay);
      box[2] = Math.max(box[2], bx + s0.ax); box[3] = Math.max(box[3], by - s0.ay + s0.cv.height);
    }
    if (box[2] > box[0]) boxes.push(box.map((v, i) => Math.max(0, Math.min(i % 2 ? H : W, Math.round(v)))));
  });
  c.globalAlpha = 1;
  for (const box of boxes) clearHalls(c, g, 36, box);
  const a = step4(k);
  for (const box of boxes) if (box[2] > box[0] && box[3] > box[1]) showLayer(ctx, a, box);
  EDGE = { cv: LAYER, a };
  // wisps curling up off the banks, and now and then a face or a hand in one
  w.banks.forEach((b, bi) => {
    for (let i = 0; i < 3; i++) {
      const q = t * 0.42 + i * 0.37 + bi * 0.21, f = Math.floor(frac(q) * 6), cyc = Math.floor(q);
      const d = b.d + (B.h2(cyc, i * 3 + bi, 240) - 0.5) * b.r * 1.8;
      if (d < 0 || d > TOTAL_LEN) continue;
      const [x, y] = lanePos(d, (B.h2(cyc, i, 241) - 0.5) * b.r * 0.6);
      ctx.globalAlpha = step4(a * 0.75);
      put(ctx, B.mistWisp(f), x, y - b.r * 0.12);
    }
    const P = 6.5, q = (t + bi * 2.7) / P, slot = Math.floor(q), lt = frac(q) * P;
    if (B.h2(slot, bi, 242) < 0.65 && lt > 0.6 && lt < 3.6) {
      const ramp = Math.sin(((lt - 0.6) / 3) * Math.PI);
      const d = b.d + (B.h2(slot, bi, 243) - 0.5) * b.r;
      if (d > 0 && d < TOTAL_LEN) {
        const [x, y] = lanePos(d, (B.h2(slot, bi, 244) - 0.5) * b.r * 0.5);
        const hand = B.h2(slot, bi, 245) < 0.4;
        ctx.globalAlpha = step4(0.42 * ramp * a);
        put(ctx, B.mistShade(hand ? 1 : 0), x, y - (hand ? 2 + ramp * 5 : 6) );
      }
    }
  });
  ctx.globalAlpha = 1;
};

// ================= BLIZZARD =================
const FROST_D = { t: 34, b: 34, l: 30, r: 20 };
const frost = (ctx, lvl) => {
  if (lvl < 0.03) return;
  const idx = lvl * 4, s0 = Math.floor(idx), f = idx - s0;
  ctx.save();
  ctx.setTransform(RES, 0, 0, RES, 0, 0);       // the edges of the view, whatever the camera does
  ctx.imageSmoothingEnabled = false;
  for (const [st, a] of [[s0, 1], [s0 + 1, f]]) {
    if (st < 1 || st > 4 || a < 0.02) continue;
    ctx.globalAlpha = a;
    const s = st / 4;
    for (const side of ["l", "r", "t", "b"]) {
      const cv = B.frostStrip(side, FROST_D[side], s), w = cv.width / PX, h = cv.height / PX;
      const x = side === "r" ? W - w : 0, y = side === "b" ? H - h : 0;
      ctx.drawImage(cv, x, y, w, h);
    }
  }
  ctx.restore();
};
// how far the frost has crept: a little as the wind rises, then in over the
// first seconds of the squall (stateless: from the level clock's segment, w.seg)
const frostLevel = (w) => {
  if (w.phase === "rising") return 0.3 * w.k;
  if (w.phase === "squall") return (0.3 + 0.7 * clamp01((w.clock - (w.seg?.t0 ?? w.clock)) / 6)) * w.k;
  return w.k;                                   // easing: it melts off with the wind
};
const blizzard = (ctx, g, w, def) => {
  const k = w.k, t = g.time;
  const fl = frostLevel(w, def);
  if (k < 0.02) return;
  const wob = Math.sin(t * 1.3) * 6;
  // the whiteout, the far snow and both drifts share one 1-unit layer: one blit
  const c = layer();
  if (c) {
    wash(c, "224,236,248", 0.16 * k);
    fillSheet(c, B.snowDrift(false), 2, -t * 70, t * 7, 0.55 * k);
    fillSheet(c, B.snowSheet(false), 1, -t * 150, t * 46 + wob, k);
    fillSheet(c, B.snowDrift(true), 2, -t * 250, t * 12 + 40, 0.45 * k);
    // keep what the player must read: the castle band thins, and the snow
    // eases off in a small soft clearing round every hall
    c.globalCompositeOperation = "destination-out";
    const band = B.thinBand(WALL_W + 20 + 40, 40, 0.6);
    c.drawImage(band, W - band.width, 0);
    clearHalls(c, g, 34, null, 0.8);
    showLayer(ctx, 1);
  }
  fall(ctx, Math.round(420 * k), (i) => B.snowFlake(i % 9 === 0 ? 3 : i % 3), -340, 92, t, 303, 5);
  frost(ctx, fl);
};

// ================= ERUPTION =================
const ROCK_R = 9;
const rockAt = (m, p) => {
  const h = 280 * (1 - p * p);                    // gravity: slow high up, fast at the end
  return [m.x + h * 0.24, m.y - h];
};
const eruptionGround = (ctx, g, w) => {
  const tms = g.time * 1000;
  for (const m of w.marks) {
    if (m.kind !== "rock") continue;
    const p = clamp01((tms - m.t0) / (m.at - m.t0));
    put(ctx, B.rockShadow(m.r, Math.min(5, Math.floor(p * 6))), m.x, m.y + 3);
    if (p > 0.25) { ctx.globalAlpha = p > 0.7 ? 1 : 0.6; put(ctx, B.hotRing(m.r, Math.floor(tms / 90) & 1), m.x, m.y + 3); ctx.globalAlpha = 1; }
  }
};
const embers = (ctx, t, n) => {
  for (let i = 0; i < n; i++) {
    const P = 2.6 + B.h2(i, 1, 250) * 2.2, q = (t + B.h2(i, 2, 250) * P) / P, f = frac(q), cyc = Math.floor(q);
    const x = B.h2(i, cyc, 251) * (W - 40) + f * 34 + Math.sin(t * 2 + i) * 4;
    const y = H * (0.25 + 0.75 * B.h2(i, cyc, 252)) - f * 110;
    if (f > 0.85 && (Math.floor(t * 14) + i) % 2) continue;      // guttering out
    const c = (Math.floor(t * 9) + i) % 3;
    putC(ctx, B.mote(c ? "#ffe08a" : "#fff3d2", c === 2 ? "#d8683a" : "#f0a040"), x, y);
  }
};
const eruption = (ctx, g, w) => {
  const k = w.k, t = g.time, tms = t * 1000;
  const c = layer();
  if (c) {
    wash(c, "136,54,26", 0.2 * k);
    fillSheet(c, B.ashHaze(), 2, t * 12, -t * 3, k);
    fillSheet(c, B.ashSheet(), 1, t * 16 + Math.sin(t * 0.8) * 8, t * 24, k);
    showLayer(ctx, 1);
  }
  if (k > 0.05) embers(ctx, t, Math.round(26 * k));
  // the rocks coming down, trailing smoke and fire
  for (const m of w.marks) {
    if (m.kind !== "rock") continue;
    const p = clamp01((tms - m.t0) / (m.at - m.t0));
    if (p < 0.1) continue;
    const seed = boltSeed(m.x, m.y);
    for (let j = 9; j >= 1; j--) {
      const pj = p - j * 0.035;
      if (pj < 0.06) continue;
      const [sx, sy] = rockAt(m, pj);
      ctx.globalAlpha = step4(1.1 - j / 10);
      put(ctx, B.smokePuff(Math.min(10, 4 + j), (seed + j) & 1), sx + Math.sin(j * 1.7 + seed) * 2, sy - j * 1.2);
      if (j <= 2) put(ctx, B.tongue(2, 9 - j * 2, (Math.floor(tms / 80) + j) % 3), sx, sy + 2);
    }
    ctx.globalAlpha = 1;
    const [x, y] = rockAt(m, p);
    put(ctx, B.tongue(1, 8, Math.floor(tms / 80) % 3), x + 2, y - 3);
    put(ctx, B.boulder(ROCK_R, Math.abs(seed) % 3, Math.floor(tms / 70 + seed) & 7), x, y);
  }
  // the landings: a white-hot flash, chips flung out, a ring of dust, fire
  for (const fx of g.effects) {
    if (fx.type !== "wxrock") continue;
    const age = (fx.life - fx.ttl) / fx.life, seed = boltSeed(fx.x, fx.y);
    const rr = 4 * Math.round((fx.r * (0.5 + age * 0.9)) / 4);
    ctx.globalAlpha = step4(1 - age);
    put(ctx, B.dustRing(rr), fx.x, fx.y + 2);
    ctx.globalAlpha = 1;
    if (age < 0.4) put(ctx, B.impactBurst(Math.round(fx.r * 0.6), Math.min(3, Math.floor(age * 10))), fx.x, fx.y);
    if (age < 0.7) for (let i = 0; i < 3; i++) put(ctx, B.tongue(Math.min(3, 1 + Math.floor(age * 4)), 10 - i * 2, (i + Math.floor(age * 12)) % 3), fx.x + (i - 1) * 6, fx.y + 1 - age * 4);
    const ts = age * 0.6;
    for (let i = 0; i < 9; i++) {
      const an = i * 0.7 + B.h2(seed, i, 253) * 0.6, v = 50 + 50 * B.h2(seed, i, 254), vz = 70 + 60 * B.h2(seed, i, 255);
      const z = vz * ts - 260 * ts * ts;
      if (z < 0 && ts > 0.05) continue;
      put(ctx, { cv: B.chip(i & 1), ax: 2, ay: 2 }, fx.x + Math.cos(an) * v * ts, fx.y + Math.sin(an) * v * ts * 0.5 - Math.max(0, z));
    }
  }
  ctx.globalAlpha = 1;
};

export const PAINTERS = { blizzard, fog, storm, gravemist, eruption };
const GROUND = { storm: stormGround, eruption: eruptionGround };

// halls set burning by a falling rock: flame tongues licking up the hall and
// smoke climbing off it, smaller as the fire burns down
const hallFires = (ctx, g) => {
  const t = g.time;
  for (const h of g.towers) {
    if (!(h.fireLeft > 0)) continue;
    const k = clamp01(h.fireLeft / (h.fireMax || 1)), fr = Math.floor(t * 10);
    for (let i = 0; i < 5; i++) {
      const P = 1.6 + i * 0.23, q = frac(t / P + i * 0.31);
      ctx.globalAlpha = step4((1 - q) * (0.5 + 0.5 * k));
      put(ctx, B.smokePuff(4 + Math.round(q * 5), i & 1), h.x - 4 + i * 2 + q * 18, h.y - 44 - q * 50);
    }
    ctx.globalAlpha = 1;
    const sz = k > 0.6 ? 0 : k > 0.3 ? 1 : 2;
    for (const [dx, dy, r2, st] of [[-9, -14, 9, 2], [8, -18, 8, 2], [-3, -34, 12, 1], [6, -30, 10, 1], [-11, -26, 7, 2]]) {
      const s = r2 - sz * 2;
      if (s < 5) continue;
      put(ctx, B.tongue(st, s, (fr + dx + 9) % 3), h.x + dx, h.y + dy);
    }
  }
};
// soldiers dazed by a lightning stroke: a wheel of little electric stars
const dazed = (ctx, g) => {
  const tms = g.time * 1000;
  for (const h of [...g.towers, ...(g.bands || [])]) for (const u of h.units || []) {
    if (!(u.dazedUntil > tms) || u.state === "dead") continue;
    put(ctx, B.dazeWheel(Math.floor(tms / 45 + (u.id || 0)) % 16), u.x, u.y - 23);
  }
};

// ---- the toast: the kind's icon and name for a few seconds as it comes in ----
let TOAST = null, LAST = { phase: "calm", k: 0, g: null };
const TOAST_S = 3.2;
const watchToast = (g, w) => {
  if (LAST.g !== g) LAST = { phase: "calm", k: 0, g };      // a new battle: whatever is coming in now gets its toast
  const fogIn = w.paint === "fog" && w.k > 0.5 && LAST.k <= 0.5;
  if (fogIn || (w.phase === "rising" && LAST.phase !== "rising")) TOAST = { kind: w.paint, name: WEATHER_KINDS[w.kind]?.name || w.kind, at: g.time };
  LAST.phase = w.phase; LAST.k = w.k;
};
const drawToast = (ctx, g) => {
  if (!TOAST) return;
  const age = g.time - TOAST.at;
  if (age < 0 || age > TOAST_S) { if (age > TOAST_S || age < -1) TOAST = null; return; }
  const a = step4(Math.min(1, age / 0.3, (TOAST_S - age) / 0.6));
  ctx.save();
  ctx.setTransform(RES, 0, 0, RES, 0, 0);
  ctx.globalAlpha = a;
  ctx.font = canvasFont("board", 10, true);
  const tw = Math.ceil(ctx.measureText(TOAST.name).width), wd = tw + 19, ht = 14;
  const x = Math.round(W / 2 - wd / 2), y = 6 + Math.round((1 - Math.min(1, age / 0.3)) * -4);
  // a small dark plate with clipped corners and a lit top edge
  ctx.fillStyle = "rgba(22,24,34,0.78)";
  ctx.fillRect(x + 1, y, wd - 2, ht); ctx.fillRect(x, y + 1, wd, ht - 2);
  ctx.fillStyle = "rgba(244,234,210,0.22)"; ctx.fillRect(x + 1, y, wd - 2, 0.5);
  ctx.imageSmoothingEnabled = false;
  const ic = B.weatherIcon(TOAST.kind);
  ctx.drawImage(ic, x + 3, y + 0.5 + (ht - ic.height / PX) / 2, ic.width / PX, ic.height / PX);
  ctx.fillStyle = "#f4ead2"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(TOAST.name, x + 14, y + ht / 2 + 0.5);
  ctx.restore();
};

// ---- entry points (draw.js) ----
// under the actors, after the cloud shadows
export const drawWeatherGround = (ctx, g) => {
  const w = g.weather;
  if (!w) { if (SCORCH.length) SCORCH = []; return; }
  warm(w.paint);
  const f = GROUND[w.paint];
  if (f && (w.k > 0.01 || w.marks?.length || SCORCH.length)) f(ctx, g, w);
};
// over everything (world space, inside the camera)
export const drawWeather = (ctx, g) => {
  EDGE = null;
  hallFires(ctx, g);
  dazed(ctx, g);
  const w = g.weather;
  if (!w) return;
  watchToast(g, w);
  if (w.k > 0.01 || w.marks?.length) PAINTERS[w.paint]?.(ctx, g, w, weatherDef());
  drawToast(ctx, g);
};

// The weather's veil over the landscape BEYOND the board (the apron is baked
// once, so the game lays this colour over it each frame): the same darkening
// the board's own layer gets, so a long storm leaves no lit edge. null = none.
const VEIL = { storm: ["14,20,40", 0.42], blizzard: ["224,236,248", 0.3], eruption: ["136,54,26", 0.22], fog: ["226,230,224", 0.32] };
export const weatherVeil = (g) => {
  const w = g?.weather, v = w && VEIL[w.paint];
  if (!v || !(w.k > 0.01)) return null;
  return `rgba(${v[0]},${(v[1] * Math.min(1, w.k)).toFixed(3)})`;
};

// how far a flier comes down in this weather (px; draw.js nudges fliers by it)
export const flierDrop = (g) => (g.weather && g.weather.k > 0 && WEATHER_KINDS[g.weather.kind]?.fx?.fliersLow ? 6 * g.weather.k : 0);
