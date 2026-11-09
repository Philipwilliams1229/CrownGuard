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
//              thick over the wood and the water), a small ragged pocket of
//              clearer air round every hall; as it burns off it
//              breaks into patches and warms, with shafts of morning light
//   storm      a cooler, darker sky with cloud shadow racing over; a downpour
//              in depths (far and mid sheets, three sizes of near drops) that
//              gusts lean over while a curtain of heavier rain sweeps across,
//              spray in the heaviest; the GROUND soaks with w.wet (the road
//              darkens and holds the sky, puddles open and grow, rivers run
//              brown with foam, stretches of road flood: w.floods), rings on
//              every water, splashes off the road, roofs and shoulders; burning
//              foes steam, Stormcaller halls crackle, a stroke runs on to a foe
//              (wxarc), a wet charge fizzles (wxfizzle); a strike gathers
//              static, then a forked bolt from the top: a white flash frame,
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
// halls struck by lightning (t.shockLeft: crackles and a blue glow), horses
// spooked by thunder (wxspook), dazed soldiers (a wheel of electric stars), and a small toast — the kind's
// icon and name — for three seconds as a weather comes in.
//
// Cost: every wash is a baked layer or a pattern fill (render/weatherbake.js
// bakes it all once, the fog once per realm in idle time); per frame it is
// a handful of fills and stamps (see wfx-lab.html &bench=).

import { W, H, WALL_W, RES } from "../data/constants.js";
import { WEATHER_KINDS, weatherDef } from "../engine/weather.js";
import { REALM } from "../data/maps.js";
import { TOTAL_LEN, SEGS, posAt, lanePos } from "../engine/path.js";
import { forestDepthAt, inRiver, inSea, COAST, RIVERS, PONDS, BRIDGES, BRIDGE_HALF, underBridge } from "../data/terrain.js";
import { canvasFont } from "../ui/fonts.js";
import { PX } from "./paint.js";
import * as B from "./weatherbake.js";
import { apronShade } from "./apron.js";

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
  if (!q) { const R = c.canvas === WIDE ? WR : [0, 0, W, H]; c.clearRect(R[0], R[1], R[2] - R[0], R[3] - R[1]); return; }
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
// the board (an iPad) showed them stop dead at its edge. So they paint into a
// WIDE layer that runs as far past each edge as the screen needs (NEED, set by
// the last paintWeatherEdge; 0 on a screen with nothing beyond the board) —
// the same banks (periodic both ways, so they tile on), the land's field
// easing out (weatherbake.js bakeFogWide), the clearings round halls near the
// edge — and the board shows its middle while paintWeatherEdge lays the whole
// of it, once and unmirrored, on a canvas under the board. (Until 2026-11-07 it
// MIRRORED the board's layer at each edge: seams, and flipped clearings.)
let NEED = [0, 0, 0, 0], NEED_RAW = [0, 0, 0, 0];   // units past the left, top, right, bottom edge
let WIDE = null, WR = [0, 0, W, H];                 // the wide layer and its world rect
let EDGE = null;                                     // { a } while fog or mist is up
const isWide = () => WR[0] < 0 || WR[1] < 0 || WR[2] > W || WR[3] > H;
// the wide layer, cleared, its context in world units
const wideLayer = () => {
  if (typeof document === "undefined") return null;
  const [l, t, r, b] = NEED, ww = W + l + r, hh = H + t + b;
  if (!WIDE) WIDE = B.mk(ww, hh);
  if (WIDE.width !== ww || WIDE.height !== hh) { WIDE.width = ww; WIDE.height = hh; }
  WR = [-l, -t, W + r, H + b];
  const c = WIDE.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, ww, hh);
  c.setTransform(1, 0, 0, 1, l, t);
  return c;
};
// the board's part of it (or of a box in it) onto the board
const showWide = (ctx, a = 1, box = null) => {
  const x0 = Math.max(0, box ? box[0] : 0), y0 = Math.max(0, box ? box[1] : 0);
  const x1 = Math.min(W, box ? box[2] : W), y1 = Math.min(H, box ? box[3] : H);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false; ctx.globalAlpha = a;
  ctx.drawImage(WIDE, x0 - WR[0], y0 - WR[1], x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
};
// a sheet repeated over the layer's rect, slid `ox` units left
const tile = (c, cv, ox) => {
  const tw = cv.width, th = cv.height;
  const sx = Math.floor((WR[0] + ox) / tw) * tw - ox, sy = Math.floor(WR[1] / th) * th;
  for (let y = sy; y < WR[3]; y += th) for (let x = sx; x < WR[2]; x += tw) c.drawImage(cv, x, y);
};
const FADE = 48;   // past the wide layer's reach (a screen far bigger than the board) its rim fades out
export const paintWeatherEdge = (cv, board, dpr = 1) => {
  if (!cv) return;
  const ok = !!(board && board.w > 0 && board.h > 0);
  if (ok) {
    // how far the screen runs past each edge, for the next frame's wide layer
    const sx = board.w / W, sy = board.h / H, cw = cv.width / dpr, ch = cv.height / dpr;
    NEED_RAW = [board.x / sx, board.y / sy, (cw - board.x - board.w) / sx, (ch - board.y - board.h) / sy];
    NEED = NEED_RAW.map((v) => (v <= 1 ? 0 : Math.min(B.FOG_WIDE, Math.ceil(v / 8) * 8 + 8)));
  }
  const e = EDGE;
  const fogOn = !!(ok && e && e.a > 0.01 && WIDE && isWide());
  // the storm's rain falls past the board too (owner, 2026-11-09: on an iPad
  // the strips above and below the board had only a flat veil, no rain)
  const rain = ok && RAIN_EDGE && RAIN_EDGE.rk > 0.01 && NEED_RAW.some((v) => v > 1) ? RAIN_EDGE : null;
  if (!fogOn && !rain) { if (cv._wxOn) { cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); cv._wxOn = false; } return; }
  const c = cv.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  c.imageSmoothingEnabled = false;
  const sx = board.w / W, sy = board.h / H;
  c.setTransform(dpr * sx, 0, 0, dpr * sy, dpr * board.x, dpr * board.y);   // world units
  if (rain) edgeRain(c, rain, [-NEED_RAW[0] - 2, -NEED_RAW[1] - 2, W + NEED_RAW[2] + 2, H + NEED_RAW[3] + 2]);
  if (!fogOn) { c.setTransform(1, 0, 0, 1, 0, 0); cv._wxOn = true; return; }
  c.globalAlpha = e.a;
  c.drawImage(WIDE, WR[0], WR[1]);
  c.globalAlpha = 1;
  // the apron under it was baked with the board's vignette and a falloff with
  // distance; the fog takes the same shade, as the board's fog takes its grade
  apronShade(c, WR[0], WR[1], WR[2], WR[3]);
  // a side the layer can't reach the screen's edge on fades out at its rim
  const capped = NEED_RAW.map((v, i) => v > NEED[i] + 1);
  if (capped.some(Boolean)) {
    c.globalCompositeOperation = "destination-out";
    const [x0, y0, x1, y1] = WR;
    const side = (gx0, gy0, gx1, gy1, rx, ry, rw, rh) => {
      const gr = c.createLinearGradient(gx0, gy0, gx1, gy1);
      gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,1)");
      c.fillStyle = gr; c.fillRect(rx, ry, rw, rh);
    };
    if (capped[0]) side(x0 + FADE, 0, x0, 0, x0, y0, FADE, y1 - y0);
    if (capped[1]) side(0, y0 + FADE, 0, y0, x0, y0, x1 - x0, FADE);
    if (capped[2]) side(x1 - FADE, 0, x1, 0, x1 - FADE, y0, FADE, y1 - y0);
    if (capped[3]) side(0, y1 - FADE, 0, y1, x0, y1 - FADE, x1 - x0, FADE);
    c.globalCompositeOperation = "source-over";
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  cv._wxOn = true;
};

// ---- patterns: a baked sheet scrolled over the whole board in one fill ----
const PATS = new WeakMap();
const fillSheet = (ctx, cv, scale, ox, oy, a, rect = null) => {
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
  if (rect) ctx.fillRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
  else ctx.fillRect(0, 0, W, H);
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
    fog: [fogArt, B.fogShafts, ...RUNGS.slice(4).map((r) => () => B.clearing(r)),
      () => { if (NEED.some((v) => v > 0)) fogLandWide(); }, () => { if (NEED.some((v) => v > 0)) B.fogShafts(B.FOG_WIDE); }],
    storm: [B.stormShade, () => { B.rainFar(0); B.rainMid(0); B.rainMid(3); }, () => [0, 1, 2].forEach((v) => [0, 1, 2, 3].forEach((l) => B.rainDrop(v, l))),
      B.rainSpray, B.rainCurtain, B.floodTex, wetRoadArt, () => { if (RIVERS.length) siltArt(); }, waterSpots, riverLines,
      () => puddles().forEach((p) => { for (let wu = 4; wu <= p.wu; wu += 2) B.puddle(wu, p.v); })],
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
const FOG_POCKET = 48;   // units, the clearing round each hall (a RUNGS size)
const fogLandWide = () => B.bakeFogWide(realmKey(), landAt);

// A Fierce fog's lingering light fog (engine/weather.js FOG_FLOOR, k ~0.14)
// is drawn as heavy as k LINGER_LOOK, eased in as it settles, so the late
// waves stand in low patches you can see (owner, 2026-11-07: "look a bit
// cooler"); its bite stays the engine's k.
const LINGER_LOOK = 0.3;
const fog = (ctx, g, w, def) => {
  const floor = def?.floor || 0;
  const k = floor > 0 && w.k < LINGER_LOOK ? w.k + (LINGER_LOOK - floor) * clamp01((LINGER_LOOK - w.k) / (LINGER_LOOK - floor)) : w.k;
  const t = g.time;
  if (k < 0.02) return;
  const F = fogArt(), c = wideLayer();
  if (!c) return;
  const wide = isWide();
  // the lie of the land: thick over the wood and the water, the last to go
  c.globalAlpha = Math.min(1, k * 1.9);
  if (wide) c.drawImage(fogLandWide(), -B.FOG_WIDE, -B.FOG_WIDE); else c.drawImage(F.land, 0, 0);
  // the banks, drifting east on the morning air; as it burns off the thick
  // banks give way to patches
  const thick = Math.pow(clamp01((k - 0.25) / 0.75), 0.8);
  const patchy = Math.min(1, k / 0.25) * (1 - thick * 0.55);
  const ox1 = frac(t * 5 / W) * W, ox2 = frac((t * 9 + 310) / W) * W;
  if (thick > 0.01) { c.globalAlpha = thick; tile(c, F.thick, ox1); }
  if (patchy > 0.01) { c.globalAlpha = patchy; tile(c, F.patchy, ox2); }
  // the sun breaking through: the fog itself warms, lit in slanting shafts
  // (only as it LIFTS: fog drifting in comes grey, without the sun)
  // (`w.thick`: how thick against its own peak, so a mild fog that opens thin
  // is not lit as if it were already lifting)
  const rel = w.thick ?? k;
  const sun = w.phase === "easing" && rel < 0.995 ? clamp01((1 - rel) / 0.55) : 0;
  if (sun > 0) {
    c.globalCompositeOperation = "source-atop";
    c.globalAlpha = sun * 0.2; c.fillStyle = "#fff0c4"; c.fillRect(WR[0], WR[1], WR[2] - WR[0], WR[3] - WR[1]);
    const m = wide ? B.FOG_WIDE : 0;
    c.globalAlpha = sun * 0.85; c.drawImage(B.fogShafts(m), -80 - m + Math.sin(t * 0.07) * 50, -m);
  }
  // every hall sees out to `sight`: the fog thins round it as far
  // each hall stands in a small pocket of clearer air. (Until 2026-11-07 the
  // pocket grew as the fog thinned, from the old fixed sight, and below ~40%
  // thickness it cleared the whole layer: the fog looked gone waves early.)
  clearHalls(c, g, FOG_POCKET);
  showWide(ctx, 1);
  EDGE = { a: 1 };
};

// ================= STORM =================
// The downpour (rain pass, 2026-11-08: the owner found the old rain
// "pretty lackluster"). The SKY half (storm): a cooler, darker sky with cloud
// shadow racing over, far and mid rain sheets in one 1-unit layer (whole-unit
// streaks, so they survive a screen smaller than RES), crisp near drops in
// three depths, and every GUST_P s a gust: the rain leans over and a curtain
// of heavier rain sweeps across the board. In the heaviest rain a low spray
// drifts over the ground; drops splash off the halls' roofs and the foes'
// shoulders; burning foes steam; Stormcaller halls crackle; a stroke runs on
// through the wet to a foe (wxarc); a powder charge fizzles (wxfizzle).
// The GROUND half (stormGround) reads `w.wet` (how soaked the ground is;
// engine/weather.js), never k: the road darkens and takes a sheen of the
// storm's sky, puddles open and grow on it, rings pepper the puddles, rivers,
// ponds and sea, a swollen river runs brown with foam, and splashes jump.
const wetOf = (w) => clamp01(w.wet ?? w.k);
// how much rain is falling: it gets going faster than the sky darkens, so a
// storm rolling in (k 0.25) already rains (0.44); the sky's wash follows k
const rainOf = (k) => 1 - (1 - clamp01(k)) ** 2;
const RAIN_N = [210, 120, 24];          // near drops at k 1 (thin / long / big), before RAIN_LOOK
// (owner, 2026-11-09: "too much, even on a mild storm ... like 50 percent")
// how much of the rain's look is drawn (the drops, the far and mid sheets,
// the spray, a gust's curtain), and how much of the sky's darkening (the
// wash, the racing cloud shadow, the veil beyond the board). The ground's
// soak (wet road, puddles, floods) is drawn in full: it is what the mud reads by.
const RAIN_LOOK = 0.5, SKY_LOOK = 0.75;   // (the sky back up to 0.75 the same day, owner)
const RAIN_VY = [520, 610, 720];        // their fall, units/s
const GUST_P = 19, GUST_D = 7;          // a gust every GUST_P s (somewhere in it), lasting GUST_D s
const LEAN0 = B.RAIN_LEAN[0], LEAN1 = B.RAIN_LEAN[3];
// the wind now: G how hard a gust blows (0..1), E its integral (s) for the
// drift (closed form, so stateless), u the time into this cycle's gust
const gustAt = (t) => {
  const c = Math.floor(t / GUST_P), o = B.h2(c, 1, 260) * (GUST_P - GUST_D), u = t - c * GUST_P - o;
  const G = u > 0 && u < GUST_D ? Math.sin((Math.PI * u) / GUST_D) ** 2 : 0;
  const part = u <= 0 ? 0 : u >= GUST_D ? GUST_D / 2 : u / 2 - (GUST_D / (4 * Math.PI)) * Math.sin((2 * Math.PI * u) / GUST_D);
  return { G, E: (c * GUST_D) / 2 + part, u, str: 0.65 + 0.35 * B.h2(c, 2, 260) };
};
// how far the wind has carried something falling at vy (units, -x)
const driftOf = (vy, t, E) => vy * (LEAN0 * t + (LEAN1 - LEAN0) * E);

// puddles: where they lie on this board (a stretch of road each, a few at its
// edges), each with the wetness `th` it opens at and its full size `wu`
const puddles = () => B.memo(`puds3|${realmKey()}`, () => {
  const out = [], n = 30;
  for (let i = 0; i < n; i++) {
    const d = TOTAL_LEN * ((i + 0.5 + (B.h2(i, 1, 200) - 0.5) * 0.8) / n);
    if (d < 20 || d > TOTAL_LEN - 30) continue;
    const edge = i % 5 === 4;
    const [x, y] = lanePos(d, edge ? (B.h2(i, 4, 200) < 0.5 ? -1 : 1) * 27 : (B.h2(i, 2, 200) - 0.5) * 30);
    if (x > W - WALL_W - 10 || x < 4) continue;
    const wu = 2 * Math.round(edge ? 5 + B.h2(i, 3, 200) * 3 : 7 + B.h2(i, 3, 200) * 8);
    // never on a bridge, nor so near one that a full-grown puddle laps onto its deck
    if (BRIDGES.some((b) => d > b.d0 - wu / 2 - 12 && d < b.d1 + wu / 2 + 12) || onDeck(x, y, wu / 2 + 6)) continue;
    out.push({ x, y, wu, v: i & 3, i, th: 0.08 + 0.55 * B.h2(i, 5, 200) });
  }
  return out;
});
// within `pad` of a bridge's deck (its span along the road, rail to rail)
const onDeck = (x, y, pad = 0) => BRIDGES.some((b) => {
  const dx = x - b.x, dy = y - b.y, c = Math.cos(b.a), s = Math.sin(b.a);
  return Math.abs(dx * c + dy * s) < (b.d1 - b.d0) / 2 + pad && Math.abs(-dx * s + dy * c) < BRIDGE_HALF + pad;
});
// standing water (puddles, floods) is clipped off every bridge deck: whatever
// lies beside a bridge stops at its end (owner, 2026-11-09)
// (pad: units past the deck's ends and sides; `inside` clips TO the decks
// instead of out of them)
const deckPath = (ctx, padL, padW) => {
  for (const b of BRIDGES) {
    const c = Math.cos(b.a), s = Math.sin(b.a), hl = (b.d1 - b.d0) / 2 + padL, hw = BRIDGE_HALF + padW;
    const pt = (u, v) => [b.x + u * c - v * s, b.y + u * s + v * c];
    const q = [pt(-hl, -hw), pt(hl, -hw), pt(hl, hw), pt(-hl, hw)];
    ctx.moveTo(...q[0]); for (let i = 1; i < 4; i++) ctx.lineTo(...q[i]); ctx.closePath();
  }
};
const clipDecks = (ctx, padL = 3, padW = 3) => {
  if (!BRIDGES.length) return;
  ctx.beginPath();
  ctx.rect(-40, -40, W + 80, H + 80);
  deckPath(ctx, padL, padW);
  ctx.clip("evenodd");
};
// A bridge's deck stays dry (owner, 2026-11-09: "the water on top of the
// bridge ... shouldn't really have it considering how curved the bridge is.
// But you can add the muddy pools on either side"): the wet road's film,
// puddles and floods are clipped off every deck, and the run-off gathers in
// muddy pools at each end of the span (bridgePools).
// how strongly a swollen river's brown silt shows (was 0.62: a blotchy
// camouflage over the water, worst beside the bridges)
const SILT_A = 0.3;
// the run-off from each arched deck pools at both its ends: a bigger muddy
// pool just off the span and a smaller one beside it, across the lanes;
// they fill early (the arch sheds its water at once) and dry last
const bridgePools = () => B.memo(`bpools|${realmKey()}`, () => {
  const out = [];
  BRIDGES.forEach((b, bi) => {
    [[b.d0, -1], [b.d1, 1]].forEach(([d, dir], ei) => {
      const big = 2 * Math.round(8 + B.h2(bi, ei, 290) * 3), small = 2 * Math.round(4 + B.h2(bi, ei, 291) * 2);
      const side = B.h2(bi, ei, 292) < 0.5 ? -1 : 1;
      for (const [wu, lat, step, th] of [[big, side * (5 + B.h2(bi, ei, 293) * 5), big / 2 + 5, 0.06], [small, -side * 15, small / 2 + 9, 0.18]]) {
        const dd = d + dir * step;
        if (dd < 20 || dd > TOTAL_LEN - 30) continue;
        const [x, y] = lanePos(dd, lat);
        if (x > W - WALL_W - 10 || onDeck(x, y, wu / 2 + 2)) continue;
        out.push({ x, y, wu, v: (bi * 2 + ei) & 3, i: 900 + bi * 4 + ei * 2 + (wu === big ? 0 : 1), th, mud: true });
      }
    });
  });
  return out;
});
// how big a puddle is at this wetness (even units; 0 = not yet)
const puddleW = (p, wet) => {
  if (wet <= p.th) return 0;
  const grow = clamp01(((wet - p.th) / (1 - p.th)) * 1.15);
  return Math.max(4, 2 * Math.round((p.wu * (0.35 + 0.65 * grow)) / 2));
};
// spots of open water on this board, for the rain's rings
const waterAt = (x, y) => (RIVERS.length && inRiver(x, y, -3))
  || PONDS.some((p) => Math.hypot((x - p.x) / ((p.w || 40) / 2), (y - p.y) / ((p.h || 30) / 2)) < 0.78)
  || (COAST && inSea(x, y, -5));
const waterSpots = () => B.memo(`wspots|${realmKey()}`, () => {
  const out = [];
  for (let y = 4; y < H - 4; y += 7) for (let x = 4; x < W - WALL_W - 4; x += 7) {
    const px = x + B.h2(x, y, 270) * 6, py = y + B.h2(x, y, 271) * 6;
    if (waterAt(px, py) && !underBridge(px, py, 10)) out.push([px, py]);
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(B.h2(i, 3, 272) * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.slice(0, 500);
});
// each river's centreline, sampled every 4 units, for the foam to ride
const riverLines = () => B.memo(`rlines|${realmKey()}`, () => RIVERS.map((rv) => {
  const P = [];
  for (const s of rv.segs) {
    const n = Math.max(1, Math.round(s.len / 4)), tx = (s.x2 - s.x1) / s.len, ty = (s.y2 - s.y1) / s.len;
    for (let q = 0; q < n; q++) P.push([s.x1 + (s.x2 - s.x1) * (q / n), s.y1 + (s.y2 - s.y1) * (q / n), tx, ty]);
  }
  return { P, hw: (rv.w || 30) / 2 };
}));
const wetRoadArt = () => B.wetRoad(realmKey(), SEGS, W - WALL_W - 4);
const siltArt = () => B.riverSilt(realmKey(), (x, y) => inRiver(x, y, -2) && !underBridge(x, y, 6),
  RIVERS.map((rv) => { const xs = rv.pts.map((p) => p[0] ?? p.x), ys = rv.pts.map((p) => p[1] ?? p.y), m = (rv.w || 30) + 30; return [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m]; }));
// a baked board-sized layer drawn only where it holds anything
const putTiles = (ctx, cv, rects) => { for (const [x, y, w, h] of rects) ctx.drawImage(cv, x, y, w, h, x, y, w, h); };

// ---- the flooded road (w.floods, engine/weather.js): standing water over the
// road, built in its own 1-unit layer (water discs along the flooded centre
// line, the water's face laid source-atop, a pale scum rim slid in behind),
// rain rings on it and wakes round everyone wading
const FLOODS = new Map();                // a flood's layer, kept until its size changes: c -> { key, cv, x0, y0 }
const FLOOD_R = 30;                      // the disc's radius at depth 0 (+6 at depth 1): spills a little past the road
const inFlood = (F, x, y, m) => F.some((f) => f.pts.some(([px, py]) => Math.abs(x - px) < m && Math.abs(y - py) < m));
const floodLayer = (f, R) => {
  const P = f.pts, n = P.length, key = `${realmKey()}|${n}|${R}|${Math.round(P[0][0])}|${Math.round(P[0][1])}`;
  let L = FLOODS.get(f.c);
  if (L && L.key === key) return L;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 = Math.floor(x0 - R - 4); y0 = Math.floor(y0 - R - 4); x1 = Math.ceil(x1 + R + 4); y1 = Math.ceil(y1 + R + 4);
  const cv = L?.cv || B.mk(1, 1);
  cv.width = x1 - x0; cv.height = y1 - y0;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  const rAt = (i) => Math.round(R * (i === 0 || i === n - 1 ? 0.72 : i === 1 || i === n - 2 ? 0.9 : 1));
  P.forEach(([x, y], i) => { const s = B.floodDisc(rAt(i), 1); c.drawImage(s.cv, Math.round(x - x0 - s.r), Math.round(y - y0 - s.r)); });
  c.globalCompositeOperation = "source-atop";
  const pat = c.createPattern(B.floodTex(), "repeat");
  if (pat.setTransform) pat.setTransform(new DOMMatrix([1, 0, 0, 1, -x0, -y0]));
  c.fillStyle = pat; c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = "destination-over";
  P.forEach(([x, y], i) => { const s = B.floodDisc(rAt(i), 0); c.drawImage(s.cv, Math.round(x - x0 - s.r), Math.round(y - y0 - s.r)); });
  c.globalCompositeOperation = "source-over";
  L = { key, cv, x0, y0 };
  FLOODS.set(f.c, L);
  return L;
};
const drawFloods = (ctx, g, F, rk) => {
  if (typeof document === "undefined") return;
  const t = g.time;
  for (const f of F) {
    const P = f.pts, n = P.length;
    if (!n || !(f.depth > 0.01)) continue;
    const R = Math.round(FLOOD_R + 6 * f.depth), L = floodLayer(f, R);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.min(0.92, 0.45 + 0.5 * f.depth);
    ctx.drawImage(L.cv, L.x0, L.y0);
    ctx.restore();
    // rain rings peppering it
    const rings = Math.round(n * 1.4 * rk);
    for (let i = 0; i < rings; i++) {
      const Pd = 0.45 + B.h2(i, 1, 380) * 0.25, q = (t + B.h2(i, 2, 380) * Pd) / Pd, cyc = Math.floor(q), fr = Math.floor(frac(q) * 5);
      if (fr > 3) continue;
      const [x, y] = P[Math.floor(B.h2(i, cyc, 381) * n)];
      put(ctx, B.dimple(fr, i % 3 === 0), x + (B.h2(i, cyc, 382) - 0.5) * R * 1.3, y + (B.h2(i, cyc, 383) - 0.5) * R);
    }
  }
  // wakes round the legs of everyone wading
  const wf = Math.floor(t * 4);
  for (const e of g.enemies) {
    if (e.flying || e.dead || !(e.hp > 0)) continue;
    const f = F.find((f) => e.dist >= f.d0 + 4 && e.dist <= f.d1 - 4);
    if (!f) continue;
    const sz = e.size || 10;
    ctx.globalAlpha = step4(0.4 + f.depth * 0.6);
    put(ctx, B.wake(Math.max(4, Math.min(12, Math.round(sz * 0.6))), (wf + (e.id | 0)) & 1), e.x, e.y + sz * 0.5);
  }
  for (const h of [...g.towers, ...(g.bands || [])]) for (const u of h.units || []) {
    if (u.state === "dead" || u.boat || !inFlood(F, u.x, u.y, 22)) continue;
    ctx.globalAlpha = 0.9;
    put(ctx, B.wake(5, (wf + (u.id | 0)) & 1), u.x, u.y + 5);
  }
  ctx.globalAlpha = 1;
};

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
  const k = w.k, t = g.time, tms = t * 1000, wet = wetOf(w);
  // remember new strikes for their scorch, forget old ones
  for (const fx of g.effects) {
    if (fx.type !== "wxbolt" || SEEN.has(fx)) continue;
    SEEN.add(fx);
    SCORCH.push({ x: fx.x, y: fx.y, r: Math.round(fx.r * 0.5), v: boltSeed(fx.x, fx.y) & 3, t: t - (fx.life - fx.ttl) / 1000 });
  }
  if (SCORCH.length) SCORCH = SCORCH.filter((s) => t - s.t < 4.5 && s.t <= t + 0.1);
  const flash = boltFlash(g);
  // the soaked road: its stone darkens, then holds the storm's sky (and the flash)
  if (wet > 0.02) {
    const R = wetRoadArt();
    ctx.save();
    clipDecks(ctx, 0, 0);
    ctx.globalAlpha = step4(wet) * 0.42;
    putTiles(ctx, R.wet, R.rects);
    if (flash > 0) { ctx.globalAlpha = flash * 0.7 * wet; putTiles(ctx, R.sheen, R.rects); }
    ctx.restore();
    // a swollen river runs brown and churns
    if (RIVERS.length && wet > 0.35) {
      const sw = clamp01((wet - 0.35) / 0.65);
      const S = siltArt();
      ctx.globalAlpha = step4(sw) * SILT_A;
      putTiles(ctx, S.cv, S.rects);
      ctx.globalAlpha = 1;
      riverLines().forEach((L, ri) => {
        const n = Math.round((L.P.length / 4) * sw);
        for (let i = 0; i < n; i++) {
          const P = 2.2 + B.h2(i, 1, 280 + ri) * 1.6, q = (t + B.h2(i, 2, 280 + ri) * P) / P, cyc = Math.floor(q), u = frac(q);
          const j0 = Math.floor(B.h2(i, cyc, 282 + ri) * L.P.length), j = Math.min(L.P.length - 1, j0 + Math.floor(u * 9));
          const [x, y, tx, ty] = L.P[j], lat = (B.h2(i, cyc, 284 + ri) - 0.5) * 1.4 * L.hw;
          const hd = ((Math.round((Math.atan2(ty, tx) / (Math.PI * 2)) * 16) % 16) + 16) % 16;
          ctx.globalAlpha = step4(Math.min(1, u * 4, (1 - u) * 4));
          put(ctx, B.foam(hd, (i + cyc) % 3), x + tx * u * 4 - ty * lat, y + ty * u * 4 + tx * lat);
        }
      });
    }
  }
  const F = w.floods;
  if (F && F.length) { ctx.save(); clipDecks(ctx); drawFloods(ctx, g, F, rainOf(k)); ctx.restore(); }
  for (const s of SCORCH) {
    const age = t - s.t;
    ctx.globalAlpha = step4(age < 3.5 ? 1 : (4.5 - age));
    put(ctx, B.boltScorch(s.r, s.v), s.x, s.y + 3);
    // the afterglow: the burn still hot for a moment
    if (age < 0.9) { ctx.globalAlpha = step4(1 - age / 0.9); put(ctx, B.staticGlow(Math.round(s.r * 1.2), 2), s.x, s.y + 3); }
  }
  ctx.globalAlpha = 1;
  // puddles open as it soaks, grow, and shrink as it dries; rain rings in them
  if (wet > 0.05) {
    ctx.save();
    clipDecks(ctx);
    for (const p of [...puddles(), ...bridgePools()]) {
      const wu = puddleW(p, wet);
      if (!wu || (F && F.length && inFlood(F, p.x, p.y, 34))) continue;
      ctx.globalAlpha = step4((wet - p.th) / 0.1);
      put(ctx, B.puddle(wu, p.v, !!p.mud), p.x, p.y);
      if (k > 0.12) {
        const rings = Math.min(3, 1 + Math.floor(wu / 9));
        for (let r = 0; r < rings; r++) {
          const P = 0.5 + B.h2(p.i, r, 202) * 0.3, q = (t + B.h2(p.i, r + 7, 202) * P) / P, cyc = Math.floor(q), f = Math.floor(frac(q) * 5);
          if (f > 3 || B.h2(p.i * 5 + r, cyc, 203) > rainOf(k) * 1.2) continue;
          put(ctx, B.dimple(f), p.x + (B.h2(p.i + r, cyc, 204) - 0.5) * wu * 0.6, p.y + (B.h2(p.i + r, cyc, 205) - 0.5) * wu * 0.2);
        }
      }
      if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = "#f4f8ff"; ctx.fillRect(sn(p.x - wu * 0.3), sn(p.y - 1), wu * 0.4, 1); }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  const rk = rainOf(k);
  if (k > 0.05) {
    // rings peppering the rivers, ponds and sea
    const spots = waterSpots();
    if (spots.length) {
      const n = Math.round(Math.min(spots.length, 90) * rk);
      for (let i = 0; i < n; i++) {
        const P = 0.45 + B.h2(i, 1, 290) * 0.25, q = (t + B.h2(i, 2, 290) * P) / P, cyc = Math.floor(q), f = Math.floor(frac(q) * 5);
        if (f > 3) continue;
        const [x, y] = spots[Math.floor(B.h2(i, cyc, 291) * spots.length)];
        put(ctx, B.dimple(f, i % 4 === 0), x, y);
      }
    }
    // splashes jumping on the road, and smaller ones in the turf
    const n = Math.round(56 * rk);
    for (let i = 0; i < n; i++) {
      const P = 0.32 + B.h2(i, 1, 210) * 0.22, q = (t + B.h2(i, 2, 210) * P) / P, cyc = Math.floor(q), f = Math.floor(frac(q) * 5);
      if (f > 3) continue;
      const road = i < 34;
      let x, y;
      if (road) [x, y] = lanePos(B.h2(i, cyc, 211) * TOTAL_LEN, (B.h2(i, cyc, 212) - 0.5) * 56);
      else { x = B.h2(i, cyc, 213) * (W - WALL_W); y = B.h2(i, cyc, 214) * H; }
      ctx.globalAlpha = road ? 1 : 0.7;
      put(ctx, B.splash(f, road ? 1 : 0), x, y);
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
// a jagged electric line through pts, each pixel a square of side s units
const zap = (ctx, pts, s, col) => {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], st = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * PX));
    for (let q = 0; q <= st; q++) ctx.rect(sn(ax + (bx - ax) * q / st - s / 2), sn(ay + (by - ay) * q / st - s / 2), s, s);
  }
  ctx.fill();
};
const jag = (x0, y0, x1, y1, seed, amp) => {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, n = Math.max(3, Math.round(len / 7)), nx = -(y1 - y0) / len, ny = (x1 - x0) / len, pts = [[x0, y0]];
  for (let i = 1; i < n; i++) { const j = (B.h2(seed, i, 225) - 0.5) * amp * 2; pts.push([x0 + (x1 - x0) * i / n + nx * j, y0 + (y1 - y0) * i / n + ny * j * 0.6]); }
  pts.push([x1, y1]);
  return pts;
};
// a stroke running on through the wet to a foe: a crackling arc along the
// ground, climbing the foe, bright, flickering, then gone over its life
const wxArcs = (ctx, g, tms) => {
  for (const fx of g.effects) {
    if (fx.type !== "wxarc") continue;
    const age = fx.life - fx.ttl, q = age / (fx.life || 1), fr = Math.floor(tms / 40), seed = (fx.seed | 0) * 31 + fr;
    if (q > 0.2 && (fr + (fx.seed | 0)) % 3 === 0) continue;               // the flicker
    const a = q < 0.2 ? 1 : step4(1 - (q - 0.2) / 0.8);
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    const pts = jag(fx.x0, fx.y0, fx.x1, fx.y1, seed, 5);
    zap(ctx, pts, 1.5, "#4a64d0");
    zap(ctx, pts, 1, "#a8c0ff");
    zap(ctx, pts, 0.5, "#ffffff");
    if (q < 0.6) zap(ctx, jag(fx.x0, fx.y0, fx.x1, fx.y1, seed + 7, 8), 0.5, "#c8d8ff");
    // up the foe it found
    const up = jag(fx.x1, fx.y1, fx.x1 + (B.h2(seed, 1, 226) - 0.5) * 6, fx.y1 - 16, seed + 3, 3);
    zap(ctx, up, 1, "#a8c0ff"); zap(ctx, up, 0.5, "#ffffff");
    put(ctx, B.staticGlow(7, q < 0.3 ? 2 : 1), fx.x1, fx.y1);
    if (q < 0.35) put(ctx, B.staticGlow(6, 1), fx.x0, fx.y0);
    for (let i = 0; i < 4; i++) {
      const an = B.h2(seed, i, 227) * 6.28, rr = 3 + 6 * B.h2(seed, i, 228);
      putC(ctx, B.mote(i % 2 ? "#ffffff" : "#fff2a0", "#7c98e8"), fx.x1 + Math.cos(an) * rr - 0.75, fx.y1 - 8 + Math.sin(an) * rr - 0.75);
    }
  }
  ctx.globalAlpha = 1;
};
// a powder charge whose powder got wet: it lands a dud and hisses
const wxFizzles = (ctx, g, tms) => {
  for (const fx of g.effects) {
    if (fx.type !== "wxfizzle") continue;
    const age = fx.life - fx.ttl, q = clamp01(age / (fx.life || 700)), seed = boltSeed(fx.x, fx.y);
    if (q < 0.3) { ctx.globalAlpha = 1; put(ctx, B.splash(Math.min(3, Math.floor(q * 13)), 1), fx.x, fx.y + 2); }
    ctx.globalAlpha = step4(Math.min(1, (1 - q) * 4));
    put(ctx, B.dudKeg(), fx.x, fx.y);
    // the fuse sputters, and dies
    if (q < 0.65) {
      const fr = Math.floor(tms / 55);
      for (let i = 0; i < 4 - Math.floor(q * 6); i++) {
        if ((fr + i) % 3 === 0) continue;
        const dx = (B.h2(seed + fr, i, 235) - 0.3) * 6, dy = -B.h2(seed + fr, i, 236) * 5;
        ctx.globalAlpha = 1;
        putC(ctx, B.mote(i % 2 ? "#ffe08a" : "#fff3d2", "#d8683a"), fx.x + 1.5 + dx, fx.y - 5 + dy);
      }
    }
    // a puff of steam, then another, rising and thinning
    for (let i = 0; i < 3; i++) {
      const qq = (q - i * 0.14) / 0.7;
      if (qq <= 0 || qq >= 1) continue;
      ctx.globalAlpha = step4((1 - qq) * 0.95);
      put(ctx, B.steamPuff(3 + Math.round(qq * 4), (seed + i) & 1), fx.x + 1 + (i - 1) * 3 + qq * 4, fx.y - 6 - qq * 16 - i * 2);
    }
  }
  ctx.globalAlpha = 1;
};
// the rain on things: splashes off the halls' roofs and the foes' shoulders,
// steam off burning foes, crackles on the Stormcaller's spires
const onThings = (ctx, g, k, tms) => {
  const t = g.time, rk = rainOf(k);
  if (k > 0.1) {
    const per = rk > 0.6 ? 3 : 2;
    for (const h of g.towers) for (let s = 0; s < per; s++) {
      const P = 0.42 + B.h2(h.id | 0, s, 300) * 0.2, q = (t + B.h2(h.id | 0, s + 9, 300) * P) / P, cyc = Math.floor(q), f = Math.floor(frac(q) * 4);
      if (f > 2 || B.h2(h.id | 0, cyc * 3 + s, 301) > rk) continue;
      put(ctx, B.splash(f, 0), h.x + (B.h2(h.id | 0, cyc * 7 + s, 302) - 0.5) * 22, h.y - 34 - B.h2(h.id | 0, cyc * 5 + s, 303) * 14);
    }
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead || e.hp <= 0 || n > 90) continue;
      const id = e.id | 0, P = 0.55 + B.h2(id, 1, 304) * 0.3, q = (t + B.h2(id, 2, 304) * P) / P, cyc = Math.floor(q), f = Math.floor(frac(q) * 5);
      if (f > 2 || B.h2(id, cyc, 305) > rk * 0.8) continue;
      n++;
      const sz = e.size || 10;
      put(ctx, B.splash(f, 0), e.x + (B.h2(id, cyc, 306) - 0.5) * sz, e.y - sz * 1.15 + (e.flying ? -6 : 0));
    }
  }
  // burning foes are doused: steam wisps rise off them
  if (k > 0.2) {
    ctx.globalAlpha = step4(0.35 + 0.6 * k);
    for (const e of g.enemies) {
      if (!(e.burnUntil > tms) || e.dead || e.hp <= 0) continue;
      const id = e.id | 0, sz = e.size || 10;
      for (let i = 0; i < 2; i++) {
        const f = Math.floor(frac(t * 1.3 + i * 0.5 + B.h2(id, i, 307)) * 6);
        put(ctx, B.steamWisp(f), e.x + (i ? 3 : -3) + (B.h2(id, i, 308) - 0.5) * 4, e.y - sz * 0.7);
      }
    }
    ctx.globalAlpha = 1;
  }
  // the Stormcaller's halls drink the storm: little crackles dance on top
  if (k > 0.5) {
    for (const h of g.towers) {
      if (h.kind !== "wizard" || h.branch !== "b") continue;
      const id = h.id | 0, cyc = Math.floor(t / 0.55 + B.h2(id, 1, 310)), on = B.h2(id, cyc, 311) < 0.35 + 0.5 * (k - 0.5);
      if (!on || frac(t / 0.55 + B.h2(id, 1, 310)) > 0.45) continue;
      const fr = Math.floor(tms / 45);
      for (let i = 0; i < 2; i++) {
        const ax = h.x + (B.h2(id, cyc * 4 + i, 312) - 0.5) * 20, ay = h.y - 46 - B.h2(id, cyc * 4 + i, 313) * 24;
        const bx = ax + (B.h2(fr, i, 314) - 0.5) * 16, by = ay + (B.h2(fr, i, 315) - 0.5) * 10 - 3;
        const pts = jag(ax, ay, bx, by, fr * 3 + i + id, 2.5);
        zap(ctx, pts, 1, "#6a84e8"); zap(ctx, pts, 0.5, "#ffffff");
        putC(ctx, B.mote("#ffffff", "#7c98e8"), bx - 0.75, by - 0.75);
        if (i === 0) putC(ctx, B.mote("#e8f0ff", "#7c98e8"), ax - 0.75, ay - 0.75);
      }
    }
  }
};

// a sheet's two leans crossfaded by the gust, drifted by the wind
const leanSheet = (c, sheetOf, vy, t, wind, a, lean = true, rect = null) => {
  const ox = -driftOf(vy, t, wind.E), oy = t * vy;
  if (wind.G < 0.98 || !lean) fillSheet(c, sheetOf(0), 1, ox, oy, lean ? a * (1 - wind.G) : a, rect);
  if (wind.G > 0.02 && lean) fillSheet(c, sheetOf(3), 1, ox, oy, a * wind.G, rect);
};
// the rain beyond the board (paintWeatherEdge): the far and mid sheets run on
// seamlessly (the same patterns at the same offsets, in world units), and
// near drops fall over the whole screen at the board's density (the board's
// own canvas covers its middle)
let RAIN_EDGE = null;           // { t, wind, rk, more } from the last storm frame
const edgeRain = (c, R, box) => {
  const { t, wind, rk, more } = R;
  leanSheet(c, B.rainFar, 330, t, wind, Math.min(1, 1.1 * rk), false, box);
  leanSheet(c, B.rainMid, 440, t, wind, Math.min(1, 0.95 * rk), true, box);
  const li = Math.round(wind.G * 3), area = Math.max(0, (box[2] - box[0]) * (box[3] - box[1]) - W * H) / (W * H);
  for (let v = 0; v < 3; v++) rainFall(c, Math.round(RAIN_N[v] * more * area), v, li, t, wind, 401 + v, box);
};
// near drops falling across the board, stateless (seeded by i)
const rainFall = (ctx, n, v, li, t, wind, seed, box = null) => {
  const s = B.rainDrop(v, li), w = s.cv.width / PX, h = s.cv.height / PX, vy = RAIN_VY[v];
  const X0 = box ? box[0] - 30 : -30, Y0 = box ? box[1] - 30 : -30;
  const PW = box ? box[2] - box[0] + 60 : W + 60, PH = box ? box[3] - box[1] + 60 : H + 60;
  for (let i = 0; i < n; i++) {
    const sp = 0.85 + 0.3 * B.h2(i, 3, seed), dy = vy * sp;
    const x = ((B.h2(i, 1, seed) * PW - driftOf(dy, t, wind.E)) % PW + PW) % PW + X0;
    const y = ((B.h2(i, 2, seed) * PH + dy * t) % PH + PH) % PH + Y0 - h;
    ctx.drawImage(s.cv, sn(x), sn(y), w, h);
  }
};

const storm = (ctx, g, w) => {
  const k = w.k, t = g.time, tms = t * 1000;
  const wind = gustAt(t);
  if (k < 0.25) wind.G *= k / 0.25;
  // the sky closes in: darker and cooler, cloud shadow racing over; the far
  // and mid rain, the spray and a gust's curtain share one 1-unit layer: one blit
  const c = layer();
  if (c) {
    wash(c, "14,20,40", 0.28 * k * SKY_LOOK);
    fillSheet(c, B.stormShade(), 2, t * 38, t * 9, k * SKY_LOOK);
    const spray = clamp01((k - 0.55) / 0.45) * (0.7 + 0.3 * wind.G) * RAIN_LOOK;
    if (spray > 0.01) fillSheet(c, B.rainSpray(), 2, -t * (60 + 90 * wind.G), t * 5, spray);
    const rk = rainOf(k) * RAIN_LOOK;
    leanSheet(c, B.rainFar, 330, t, wind, Math.min(1, 1.1 * rk), false);   // the far rain keeps its slant: one fill
    leanSheet(c, B.rainMid, 440, t, wind, Math.min(1, 0.95 * rk));
    // the gust's curtain of heavier rain sweeping across
    if (wind.G > 0.01 && k > 0.2) {
      const cv = B.rainCurtain(), cw = cv.width, xc = W + 160 - ((W + 320) * wind.u) / GUST_D;
      const a = k * wind.str * Math.sqrt(Math.sin((Math.PI * wind.u) / GUST_D)) * RAIN_LOOK;
      c.globalAlpha = a;
      c.drawImage(cv, Math.round(xc - cw / 2), 0);
      c.save();
      const s = LEAN1, hw = B.CURTAIN_W * 0.3;
      c.beginPath();
      c.moveTo(xc + s * (H / 2) - hw, 0); c.lineTo(xc + s * (H / 2) + hw, 0);
      c.lineTo(xc - s * (H / 2) + hw, H); c.lineTo(xc - s * (H / 2) - hw, H);
      c.closePath(); c.clip();
      fillSheet(c, B.rainMid(3), 1, -driftOf(520, t, wind.E) + 37, t * 520 + 51, a * 0.75);
      c.restore();
      c.globalAlpha = 1;
    }
    showLayer(ctx, 1);
  }
  // the near rain, crisp at the art grid, in three depths; a gust leans it
  // over and thickens it
  const li = Math.round(wind.G * 3), more = (1 + 0.35 * wind.G) * rainOf(k) * RAIN_LOOK;
  RAIN_EDGE = { t, wind, rk: rainOf(k) * RAIN_LOOK, more };
  rainFall(ctx, Math.round(RAIN_N[0] * more), 0, li, t, wind, 301);
  rainFall(ctx, Math.round(RAIN_N[1] * more), 1, li, t, wind, 302);
  rainFall(ctx, Math.round(RAIN_N[2] * more), 2, li, t, wind, 303);
  onThings(ctx, g, k, tms);
  wxFizzles(ctx, g, tms);
  wxArcs(ctx, g, tms);
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
  const c = wideLayer();
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
    if (box[2] > box[0]) boxes.push(box.map((v, i) => Math.max(WR[i % 2], Math.min(WR[2 + (i % 2)], Math.round(v)))));
  });
  c.globalAlpha = 1;
  for (const box of boxes) clearHalls(c, g, 36, box);
  const a = step4(k);
  for (const box of boxes) if (box[2] > box[0] && box[3] > box[1]) showWide(ctx, a, box);
  EDGE = { a };
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
// halls struck by the storm's lightning (t.shockLeft, engine/weather.js):
// stunned, they hold their fire; sparks crackle over them and a faint blue
// glow lies at the foot, both dying down as the shock wears off
const hallShocks = (ctx, g) => {
  const tms = g.time * 1000;
  for (const h of g.towers) {
    if (!(h.shockLeft > 0)) continue;
    const q = clamp01(h.shockLeft / (h.shockMax || 3000)), fr = Math.floor(tms / 45), id = h.id | 0;
    ctx.globalAlpha = step4(0.35 + 0.65 * q);
    put(ctx, B.staticGlow(20, q > 0.5 ? 2 : 1), h.x, h.y - 1);
    ctx.globalAlpha = 1;
    for (let i = 0; i < (q > 0.5 ? 4 : 2); i++) {
      if ((fr + i + id) % 4 === 0) continue;
      const ax = h.x + (B.h2(fr + id, i, 320) - 0.5) * 28, ay = h.y - 4 - B.h2(fr + id, i, 321) * 48;
      const bx = ax + (B.h2(fr + id, i, 322) - 0.5) * 24, by = ay + (B.h2(fr + id, i, 323) - 0.5) * 22;
      const pts = jag(ax, ay, bx, by, fr * 5 + i + id, 3);
      zap(ctx, pts, 1.5, "#4a64d0"); zap(ctx, pts, 1, "#a8c0ff"); zap(ctx, pts, 0.5, "#ffffff");
      putC(ctx, B.mote("#ffffff", "#7c98e8"), bx - 0.75, by - 0.75);
    }
  }
};
// a horse spooked by the thunder (wxspook): white dashes flung up over it
const spooks = (ctx, g) => {
  for (const fx of g.effects) {
    if (fx.type !== "wxspook") continue;
    const q = clamp01((fx.life - fx.ttl) / (fx.life || 600));
    ctx.globalAlpha = step4(1 - q * 0.8);
    put(ctx, B.startle(Math.min(2, Math.floor(q * 3))), fx.x, fx.y - 20);
  }
  ctx.globalAlpha = 1;
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
  const fogIn = w.paint === "fog" && w.k > 0.1 && LAST.k <= 0.1;
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
  if (f && (w.k > 0.01 || w.wet > 0.01 || w.marks?.length || SCORCH.length)) f(ctx, g, w);
};
// over everything (world space, inside the camera)
export const drawWeather = (ctx, g) => {
  EDGE = null;
  RAIN_EDGE = null;
  hallFires(ctx, g);
  hallShocks(ctx, g);
  dazed(ctx, g);
  spooks(ctx, g);
  const w = g.weather;
  if (!w) return;
  watchToast(g, w);
  if (w.k > 0.01 || w.marks?.length) PAINTERS[w.paint]?.(ctx, g, w, weatherDef());
  drawToast(ctx, g);
};

// The weather's veil over the landscape BEYOND the board (the apron is baked
// once, so the game lays this colour over it each frame): the same darkening
// the board's own layer gets, so a long storm leaves no lit edge. null = none.
// (No fog veil: the board gets no fog wash, so a flat one beyond it read as a
// band; the fog itself runs out past the board now, see paintWeatherEdge.)
const VEIL = { storm: ["14,20,40", 0.42 * SKY_LOOK], blizzard: ["224,236,248", 0.3], eruption: ["136,54,26", 0.22] };
export const weatherVeil = (g) => {
  const w = g?.weather, v = w && VEIL[w.paint];
  if (!v || !(w.k > 0.01)) return null;
  return `rgba(${v[0]},${(v[1] * Math.min(1, w.k)).toFixed(3)})`;
};

// how far a flier comes down in this weather (px; draw.js nudges fliers by it)
export const flierDrop = (g) => (g.weather && g.weather.k > 0 && WEATHER_KINDS[g.weather.kind]?.fx?.fliersLow ? 6 * g.weather.k : 0);
