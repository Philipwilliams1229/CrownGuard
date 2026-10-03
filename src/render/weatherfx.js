// ============ WEATHER PAINTERS (PLACEHOLDER) ============
// One painter per weather `paint` id (engine/weather.js WEATHER_KINDS),
// drawn over the finished board in world space, after the realm's ambient
// weather (draw.js). Each reads g.weather: `k` (0..1, how hard it blows
// now — it rises through the wind-up and falls as it clears), `phase`,
// `bite` and `gust` (ms the wind last got up).
//
// PLACEHOLDER ART: the blizzard here is a cheap white-out wash and driven
// snow, there to show WHEN a squall bites. The zone IV artists replace it
// (style guide: snow as pixel flakes on the CELL grid, no smooth gradients
// over the board) — keep the signature `(ctx, g, w)` and the `k` scaling.

import { W, H, S } from "../data/constants.js";
import { WEATHER_KINDS } from "../engine/weather.js";

const blizzard = (ctx, g, w) => {
  const k = w.k, t = g.time;
  if (k <= 0.01) return;
  // the white-out: the far board fades into the squall
  ctx.fillStyle = `rgba(232,240,248,${(0.28 * k).toFixed(3)})`;
  ctx.fillRect(0, 0, W, H);
  // driven snow: streaks blown hard from the left, many more than the
  // realm's own gentle snow, and longer as the wind rises
  const n = Math.round(150 * k);
  const len = 4 + Math.round(8 * k);
  for (let i = 0; i < n; i++) {
    const sp = 260 + (i % 7) * 40;
    const x = (((i * 211.7 + t * sp) % (W + 80)) + W + 80) % (W + 80) - 40;
    const y = (((i * 97.3 + t * sp * 0.35 + Math.sin(t * 2 + i) * 6) % (H + 40)) + H + 40) % (H + 40) - 20;
    ctx.fillStyle = i % 3 ? "rgba(255,255,255,0.75)" : "rgba(220,232,244,0.6)";
    ctx.fillRect(S(x), S(y), len, 2);
  }
  // squall banner: a small word in the corner while it bites (placeholder HUD)
  if (w.bite || w.phase === "rising") {
    ctx.fillStyle = "rgba(20,30,44,0.55)";
    ctx.fillRect(8, 8, 92, 14);
    ctx.fillStyle = "#e8f4ff";
    ctx.font = "8px monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(w.bite ? "BLIZZARD: reach -20%" : "the wind rises...", 12, 15);
  }
};

export const PAINTERS = { blizzard };

export const drawWeather = (ctx, g) => {
  const w = g.weather;
  if (!w || !(w.k > 0.01)) return;
  PAINTERS[w.paint]?.(ctx, g, w);
};

// how far a flier comes down in this weather (px; draw.js nudges fliers by it)
export const flierDrop = (g) => (g.weather && g.weather.k > 0 && WEATHER_KINDS[g.weather.kind]?.fx?.fliersLow ? 6 * g.weather.k : 0);
