// ============ HALL: THE SUNFORGE ============
// An obsidian ring altar cut with a channel that carries the light, two
// obsidian prongs holding the sky open, and between them the captive shard
// turning — its halo breathing with the focus, sparks shed at full heat.
// The moon path burns cold and blue.

import {
  pad, skirt, lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, lin, part,
  spriteCache, stamp, canBake,
} from "../buildkit.js";
import { getStats } from "../../engine/towers.js";

const cache = spriteCache();
export const resetSunforgeBakes = () => cache.clear();
const BOX = { left: 30, right: 30, up: 46, down: 16 };
const OBS = "#2e2838";

const paintAltar = (ctx, t, x, y) => {
  const moon = t.branch === "b";
  const lvl = t.level;
  pad(ctx, x, y + 6, 20, t.id);
  shadow(ctx, x + 5, y + 8, 18, 4, 0.3);
  part(ctx, (c) => ball(c, x, y + 2, 17, 7, OBS, { hi: 0.35, lo: 0.5 }));
  part(ctx, (c) => ball(c, x, y, 12, 4.5, lighten(OBS, 0.08), { hi: 0.35, lo: 0.45 }));
  part(ctx, (c) => { c.fillStyle = moon ? "#3a4a6a" : "#5a3a2a"; c.beginPath(); c.ellipse(x, y, 7, 2.4, 0, 0, 7); c.fill(); });   // the channel
  // the prongs, taller with the level
  const ph = 18 + lvl * 4;
  for (const sgn of [-1, 1]) part(ctx, (c) => {
    c.beginPath(); c.moveTo(x + sgn * 11 - 3, y - 1); c.lineTo(x + sgn * 8 - 1, y - ph); c.lineTo(x + sgn * 8 + 1.5, y - ph); c.lineTo(x + sgn * 11 + 3, y - 1); c.closePath();
    c.fillStyle = lin(c, x + sgn * 11 - 3, 0, x + sgn * 11 + 3, 0, [[0, lighten(OBS, 0.3)], [0.5, OBS], [1, darken(OBS, 0.4)]]); c.fill();
  });
  skirt(ctx, x, y + 7, 15, t.id);
};

export const drawSunforge = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const st = getStats(t);
  const moon = t.branch === "b";
  const heat = ((t.ramp || 1) - 1) / Math.max(1, (st.rampMax || 3) - 1);
  const col = moon ? "#a8c8f0" : "#f0c050", core = moon ? "#e8f4ff" : "#fff4d0";
  const ph = 18 + t.level * 4;
  if (canBake()) stamp(ctx, cache.get(`altar|${t.level}|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintAltar(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintAltar(ctx, t, x, y);
  // the light in the channel
  glow(ctx, x, y, 8, col, 0.35 + heat * 0.3);
  // the captive shard, turning between the prongs
  const sy = y - ph + 6 + Math.sin(time * 1.6 + t.id) * 1.5;
  glow(ctx, x, sy, 10 + heat * 8, col, 0.3 + heat * 0.35);
  const spin = time * (1.2 + heat * 3) + t.id;
  const w = 3 + Math.abs(Math.cos(spin)) * 3;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x, sy - 7); ctx.lineTo(x + w, sy); ctx.lineTo(x, sy + 7); ctx.lineTo(x - w, sy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.moveTo(x, sy - 3.5); ctx.lineTo(x + w * 0.45, sy); ctx.lineTo(x, sy + 3.5); ctx.lineTo(x - w * 0.45, sy); ctx.closePath(); ctx.fill();
  // sparks shed at high focus
  if (heat > 0.5) for (let i = 0; i < 4; i++) { const a = time * 3 + i * 1.57 + t.id; const r = 8 + ((time * 20 + i * 9) % 12); glow(ctx, x + Math.cos(a) * r, sy + Math.sin(a) * r * 0.6, 1.4, core, 0.9 * heat); }
  // a mote climbs off it between battles
  if (t._idle) { const cyc = ((time / 4) + t.id * 0.29) % 1; if (cyc < 0.6) glow(ctx, x + Math.sin(time * 1.3 + t.id) * 3, sy - 8 - cyc * 18, 1.5, col, 0.8 * (1 - cyc / 0.6)); }
};
