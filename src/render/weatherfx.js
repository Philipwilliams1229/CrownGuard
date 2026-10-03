// ============ WEATHER PAINTERS (PLACEHOLDER) ============
// One painter per weather `paint` id (engine/weather.js WEATHER_KINDS),
// drawn over the finished board in world space, after the realm's ambient
// weather (draw.js drawWeather). Each reads g.weather: `k` (0..1, how hard
// it is now — it rises through the wind-up and falls as it clears), `phase`,
// `bite`, `marks` (telegraphed strikes) and `banks` (grave mist).
//
// PLACEHOLDER ART, to be replaced by the zone artists (keep the signature
// `(ctx, g, w, def)` and the `k` scaling):
//   blizzard   white-out wash + driven snow streaks
//   fog        soft white banks drifting across the board, CLEARED in a circle
//              round every hall as wide as it can see (so the halls and their
//              sight both read)
//   storm      darkened sky, slanting rain, a flicker-and-ring mark where a
//              bolt will fall, the jagged bolt and a white flash
//   gravemist  green-grey banks drifting along the road, cleared round halls
//   eruption   a red ash haze, falling rocks with their growing shadow, the
//              impact burst, and flames over a hall set burning
// Plus: dazed soldiers (stars), and a small corner label naming the weather.

import { W, H, S, CELL, WALL_W } from "../data/constants.js";
import { WEATHER_KINDS, weatherDef } from "../engine/weather.js";

const label = (ctx, text) => {
  ctx.fillStyle = "rgba(20,30,44,0.6)";
  ctx.font = "8px monospace";
  const w = Math.ceil(ctx.measureText(text).width) + 8;
  ctx.fillRect(8, 8, w, 14);
  ctx.fillStyle = "#e8f4ff";
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(text, 12, 15);
};

// an offscreen layer at half the board's size, for washes with holes cut in them
let LAYER = null;
const layer = () => {
  if (!LAYER && typeof document !== "undefined") { LAYER = document.createElement("canvas"); LAYER.width = W / 2; LAYER.height = H / 2; }
  if (!LAYER) return null;
  const c = LAYER.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "source-over";
  c.clearRect(0, 0, LAYER.width, LAYER.height);
  c.setTransform(0.5, 0, 0, 0.5, 0, 0);       // draw in board units
  return c;
};
// clear a soft circle round every hall (radius r, or r(t) per hall)
const holes = (c, g, r) => {
  c.globalCompositeOperation = "destination-out";
  for (const t of g.towers) {
    const rr = typeof r === "function" ? r(t) : r;
    const gr = c.createRadialGradient(t.x, t.y - 10, rr * 0.55, t.x, t.y - 10, rr);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = gr;
    c.beginPath(); c.arc(t.x, t.y - 10, rr, 0, Math.PI * 2); c.fill();
  }
  c.globalCompositeOperation = "source-over";
};
const blob = (c, x, y, rx, ry, col) => {
  const gr = c.createRadialGradient(x, y, 0, x, y, rx);
  gr.addColorStop(0, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, "0)"));
  c.fillStyle = gr;
  c.save(); c.translate(x, y); c.scale(1, ry / rx); c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.restore(); c.fill();
};

// ---- blizzard ----
const blizzard = (ctx, g, w) => {
  const k = w.k, t = g.time;
  ctx.fillStyle = `rgba(232,240,248,${(0.28 * k).toFixed(3)})`;
  ctx.fillRect(0, 0, W, H);
  const n = Math.round(150 * k), len = 4 + Math.round(8 * k);
  for (let i = 0; i < n; i++) {
    const sp = 260 + (i % 7) * 40;
    const x = (((i * 211.7 + t * sp) % (W + 80)) + W + 80) % (W + 80) - 40;
    const y = (((i * 97.3 + t * sp * 0.35 + Math.sin(t * 2 + i) * 6) % (H + 40)) + H + 40) % (H + 40) - 20;
    ctx.fillStyle = i % 3 ? "rgba(255,255,255,0.75)" : "rgba(220,232,244,0.6)";
    ctx.fillRect(S(x), S(y), len, 2);
  }
  if (w.bite || w.phase === "rising") label(ctx, w.bite ? "BLIZZARD: reach down, fliers low" : "the wind rises...");
};

// ---- fog ----
const fog = (ctx, g, w, def) => {
  const c = layer();
  const k = w.k, t = g.time;
  const sight = (def?.fx?.sight || 60) / Math.max(0.05, k);
  if (c) {
    c.fillStyle = `rgba(226,230,226,${(0.5 * Math.min(1, k * 1.3)).toFixed(3)})`;
    c.fillRect(0, 0, W, H);
    // drifting banks, thicker and thinner
    for (let i = 0; i < 9; i++) {
      const x = ((i * 137 + t * (7 + (i % 3) * 3)) % (W + 300)) - 150, y = 40 + ((i * 89) % (H - 60));
      blob(c, x, y + Math.sin(t * 0.3 + i) * 12, 140 + (i % 4) * 30, 60 + (i % 3) * 18, `rgba(240,242,238,${(0.35 * k).toFixed(3)})`);
    }
    holes(c, g, () => sight);
    ctx.drawImage(LAYER, 0, 0, W, H);
  }
  if (w.bite) label(ctx, `MORNING FOG: halls see ${Math.round(Math.min(sight, 999))} px`);
};

// ---- storm ----
const storm = (ctx, g, w) => {
  const k = w.k, t = g.time, tms = t * 1000;
  ctx.fillStyle = `rgba(18,22,38,${(0.32 * k).toFixed(3)})`;
  ctx.fillRect(0, 0, W, H);
  // rain: slanting streaks
  ctx.fillStyle = "rgba(190,206,230,0.55)";
  const n = Math.round(220 * k);
  for (let i = 0; i < n; i++) {
    const sp = 520 + (i % 5) * 60;
    const y = (((i * 61.7 + t * sp) % (H + 40)) + H + 40) % (H + 40) - 20;
    const x = (((i * 173.3 - t * sp * 0.25) % (W + 40)) + W + 40) % (W + 40) - 20;
    for (let j = 0; j < 4; j++) ctx.fillRect(S(x - j * 2), S(y + j * 4), CELL, CELL * 2);
  }
  // the marks: a flicker and a ring where a bolt will fall
  for (const m of w.marks) {
    if (m.kind !== "bolt") continue;
    const on = Math.floor(tms / 70) % 2 === 0;
    ctx.strokeStyle = on ? "rgba(255,250,200,0.95)" : "rgba(140,170,255,0.7)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(m.x, m.y + 4, m.r, m.r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    if (on) { ctx.fillStyle = "rgba(255,250,210,0.9)"; for (let i = 0; i < 4; i++) ctx.fillRect(S(m.x + Math.cos(i * 1.6 + tms / 90) * m.r * 0.6), S(m.y + Math.sin(i * 1.6 + tms / 90) * m.r * 0.3), CELL, CELL); }
  }
  // the bolts that just fell (effects), and the flash
  let flash = 0;
  for (const fx of g.effects) {
    if (fx.type !== "wxbolt") continue;
    const a = fx.ttl / fx.life;
    flash = Math.max(flash, a > 0.7 ? (a - 0.7) / 0.3 : 0);
    ctx.save();
    ctx.globalAlpha = a;
    for (const [wid, col] of [[5, "rgba(140,170,255,0.6)"], [2, "#fffbe8"]]) {
      ctx.strokeStyle = col; ctx.lineWidth = wid;
      ctx.beginPath(); ctx.moveTo(fx.x + 30, fx.y - 240);
      for (let i = 1; i <= 8; i++) { const u = i / 8; ctx.lineTo(fx.x + 30 * (1 - u) + (i < 8 ? Math.sin(fx.x + i * 2.3) * 12 : 0), fx.y - 240 * (1 - u)); }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,250,200,0.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(fx.x, fx.y + 4, fx.r * (1.3 - a * 0.3), fx.r * 0.5 * (1.3 - a * 0.3), 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (flash > 0) { ctx.fillStyle = `rgba(240,244,255,${(0.35 * flash).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  if (w.bite || w.phase === "rising") label(ctx, w.bite ? "THUNDERSTORM: rain, lightning on the road" : "thunder in the hills...");
};

// ---- grave mist ----
const gravemist = (ctx, g, w) => {
  const c = layer();
  const k = w.k, t = g.time;
  if (c && w.banks.length) {
    for (const b of w.banks) {
      for (let i = 0; i < 5; i++) {
        const ox = Math.sin(t * 0.4 + i * 1.7) * b.r * 0.35, oy = Math.cos(t * 0.3 + i * 2.1) * b.r * 0.2;
        blob(c, b.x + ox, b.y + oy, b.r * (0.8 + 0.1 * i), b.r * 0.55, `rgba(150,176,150,${(0.45 * k).toFixed(3)})`);
      }
      blob(c, b.x, b.y, b.r * 0.9, b.r * 0.5, `rgba(190,206,186,${(0.4 * k).toFixed(3)})`);
    }
    holes(c, g, 26);
    ctx.drawImage(LAYER, 0, 0, W, H);
  }
  if (w.bite) label(ctx, "GRAVE MIST: foes in it seen only up close");
};

// ---- eruption ----
const eruption = (ctx, g, w) => {
  const k = w.k, t = g.time, tms = t * 1000;
  ctx.fillStyle = `rgba(120,40,20,${(0.24 * k).toFixed(3)})`;
  ctx.fillRect(0, 0, W, H);
  // ash
  ctx.fillStyle = "rgba(60,52,50,0.6)";
  for (let i = 0, n = Math.round(80 * k); i < n; i++) {
    const y = (((i * 83.1 + t * (30 + (i % 4) * 8)) % H) + H) % H;
    const x = (((i * 151.7 + Math.sin(t + i) * 14 + t * 10) % W) + W) % W;
    ctx.fillRect(S(x), S(y), CELL, CELL);
  }
  // falling rocks: a shadow that grows, the rock coming down on it
  for (const m of w.marks) {
    if (m.kind !== "rock") continue;
    const p = Math.max(0, Math.min(1, (tms - m.t0) / (m.at - m.t0)));
    ctx.fillStyle = `rgba(20,10,8,${(0.25 + 0.4 * p).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(m.x, m.y + 3, m.r * (0.4 + 0.6 * p), m.r * 0.45 * (0.4 + 0.6 * p), 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(240,110,60,0.8)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(m.x, m.y + 3, m.r, m.r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    const ry = m.y - (1 - p) * 180, rx = m.x + (1 - p) * 40;
    ctx.fillStyle = "rgba(240,140,60,0.5)"; for (let j = 1; j < 5; j++) ctx.fillRect(S(rx + j * 4), S(ry - j * 9), 4, 4);
    ctx.fillStyle = "#3a2420"; ctx.fillRect(S(rx) - 7, S(ry) - 7, 14, 14);
    ctx.fillStyle = "#f08838"; ctx.fillRect(S(rx) - 4, S(ry) - 4, 6, 6);
  }
  for (const fx of g.effects) {
    if (fx.type !== "wxrock") continue;
    const a = fx.ttl / fx.life;
    ctx.strokeStyle = `rgba(250,160,70,${a})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(fx.x, fx.y, fx.r * (1.4 - a * 0.6), fx.r * 0.55 * (1.4 - a * 0.6), 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(250,200,90,${a})`;
    for (let i = 0; i < 8; i++) ctx.fillRect(S(fx.x + Math.cos(i * 0.8) * fx.r * (1 - a) * 1.2), S(fx.y - (1 - a) * 20 * Math.abs(Math.sin(i)) + Math.sin(i * 0.8) * fx.r * 0.4), CELL, CELL);
  }
  if (w.bite || w.phase === "rising") label(ctx, w.bite ? "ERUPTION: rocks fall on the road" : "the mountain rumbles...");
};

export const PAINTERS = { blizzard, fog, storm, gravemist, eruption };

// halls set burning by a falling rock: flames over them and a timer
const hallFires = (ctx, g) => {
  const t = g.time;
  for (const h of g.towers) {
    if (!(h.fireLeft > 0)) continue;
    const k = h.fireLeft / (h.fireMax || 1);
    for (let i = 0; i < 7; i++) {
      const fx = h.x - 14 + i * 4.5, fl = 8 + 8 * Math.abs(Math.sin(t * 9 + i * 1.3));
      ctx.fillStyle = i % 2 ? "rgba(250,190,70,0.85)" : "rgba(230,90,40,0.85)";
      ctx.fillRect(S(fx), S(h.y - 30 - fl), 4, fl);
    }
    ctx.fillStyle = "rgba(16,14,20,0.6)"; ctx.fillRect(S(h.x) - 12, S(h.y) + 10, 24, 3);
    ctx.fillStyle = "#f09048"; ctx.fillRect(S(h.x) - 11, S(h.y) + 11, Math.round(22 * k), 1);
  }
};
// soldiers dazed by a lightning stroke: two little stars over the head
const dazed = (ctx, g) => {
  const tms = g.time * 1000;
  for (const h of [...g.towers, ...(g.bands || [])]) for (const u of h.units || []) {
    if (!(u.dazedUntil > tms) || u.state === "dead") continue;
    const a = tms / 150;
    ctx.fillStyle = "#fff0a0";
    for (let i = 0; i < 2; i++) ctx.fillRect(S(u.x + Math.cos(a + i * Math.PI) * 6), S(u.y - 24 + Math.sin(a + i * Math.PI) * 2), CELL, CELL);
  }
};

export const drawWeather = (ctx, g) => {
  hallFires(ctx, g);
  dazed(ctx, g);
  const w = g.weather;
  if (!w || !(w.k > 0.01 || w.marks?.length)) return;
  PAINTERS[w.paint]?.(ctx, g, w, weatherDef());
};

// how far a flier comes down in this weather (px; draw.js nudges fliers by it)
export const flierDrop = (g) => (g.weather && g.weather.k > 0 && WEATHER_KINDS[g.weather.kind]?.fx?.fliersLow ? 6 * g.weather.k : 0);
