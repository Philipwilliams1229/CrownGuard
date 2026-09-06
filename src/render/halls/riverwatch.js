// ============ HALL: THE RIVER WATCH ============
// The only hall moored in running water: a plank jetty on driven piles, a
// mooring post with a coil of rope, and the watch lantern burning against
// the current. Its skiffs are units and row the river themselves.

import {
  OAKWOOD, TIMBER, lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, lin, part,
  spriteCache, stamp, canBake, pennant,
} from "../buildkit.js";

const cache = spriteCache();
export const resetRiverwatchBakes = () => cache.clear();
const BOX = { left: 24, right: 24, up: 34, down: 14 };

const paintJetty = (ctx, t, x, y) => {
  // piles into the water, then the deck planks across them
  for (const dx of [-11, 0, 11]) part(ctx, (c) => cylinder(c, x + dx - 1.5, y - 2, 3, 12, darken(OAKWOOD, 0.15), { r: 1, hi: 0.3, lo: 0.5 }));
  part(ctx, (c) => {
    cylinder(c, x - 14, y - 4, 28, 7, TIMBER, { r: 1.5, hi: 0.3, lo: 0.5 });
    c.fillStyle = rgba(darken(TIMBER, 0.5), 0.3); for (let px = x - 11; px < x + 14; px += 4) c.fillRect(px, y - 4, 0.8, 7);
  });
  part(ctx, (c) => cylinder(c, x - 5, y - 24, 3.4, 22, OAKWOOD, { r: 1, hi: 0.3, lo: 0.5 }));   // the mooring post
  part(ctx, (c) => cylinder(c, x + 4, y - 18, 3, 16, OAKWOOD, { r: 1, hi: 0.3, lo: 0.5 }));
  part(ctx, (c) => { c.fillStyle = "#3a3a44"; roundRect(c, x - 7.5, y - 29, 7, 7, 1.5); c.fill(); });   // the lantern's frame
  part(ctx, (c) => { ball(c, x + 8, y - 2, 3.4, 1.8, "#a89a72", { hi: 0.3, lo: 0.4 }); ball(c, x + 8, y - 2, 1.2, 0.7, "#6a5a3a", { hi: 0.2, lo: 0.3 }); });   // rope coil
  if (t.branch === "b") part(ctx, (c) => cylinder(c, x + 10, y - 12, 5, 8, "#6a4a2e", { r: 1.5 }));   // a pitch barrel for the fireships
};

export const drawRiverwatchHall = (ctx, t, time) => {
  const x = t.x, y = t.y;
  // ripples where the piles stand
  ctx.strokeStyle = "rgba(226,240,246,0.45)"; ctx.lineWidth = 0.8;
  for (const dx of [-11, 0, 11]) { const r = 3 + ((((time * 8 + dx) % 6) + 6) % 6); ctx.beginPath(); ctx.ellipse(x + dx, y + 9, r, r * 0.4, 0, 0, 7); ctx.stroke(); }
  if (canBake()) stamp(ctx, cache.get(`jetty|${t.branch}|${t.rank4}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintJetty(c, t, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintJetty(ctx, t, x, y);
  const lit = 0.7 + 0.3 * Math.sin(time * 3 + t.id);
  glow(ctx, x - 4, y - 25.5, 5, "#e8c14a", lit);
  ball(ctx, x - 4, y - 25.5, 1.8, 1.8, "#f4e6b4", { hi: 0.5, lo: 0.2 });
  pennant(ctx, x + 5.5, y - 20, 4, t.branch === "b" ? "#c05848" : "#4a5a7c", time, t.id, 1);
};
