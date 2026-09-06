// ============ HALL: THE TRAPSMITH ============
// An open-fronted work shed — posts, plank roof over the bench, the forge
// glowing on it — with the smith at his anvil out front where you can see
// him. A rack of hung traps beside the shed counts his ready charges. The
// Aerostat Yard keeps powder kegs and a tethered balloon.

import {
  pad, skirt, OAKWOOD, TIMBER, lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, lin, part,
  spriteCache, stamp, canBake, pennant,
} from "../buildkit.js";
import { drawSmith, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetTrapsmithBakes = () => cache.clear();
const BOX = { left: 42, right: 42, up: 50, down: 18 };
const iron = "#6c727e";

const paintShed = (ctx, t, x, y) => {
  const lvl = t.level;
  const blast = t.branch === "b";
  pad(ctx, x, y + 6, 26, t.id);
  shadow(ctx, x + 6, y + 9, 24, 4.5, 0.32);
  // back wall and the bench in shadow
  part(ctx, (c) => { c.fillStyle = "#3a2e22"; roundRect(c, x - 16, y - 24, 32, 26, 2); c.fill(); });
  part(ctx, (c) => cylinder(c, x - 14, y - 10, 28, 4, darken(TIMBER, 0.1), { r: 1, hi: 0.3, lo: 0.5 }));
  // hanging jaws and tongs on the back wall
  part(ctx, (c) => { c.strokeStyle = iron; c.lineWidth = 1.2; c.lineCap = "round"; c.beginPath(); c.moveTo(x - 9, y - 22); c.lineTo(x - 9, y - 15); c.moveTo(x - 12, y - 15); c.lineTo(x - 6, y - 15); c.moveTo(x + 6, y - 22); c.lineTo(x + 6, y - 14); c.moveTo(x + 4, y - 14); c.lineTo(x + 8, y - 14); c.stroke(); });
  // the forge on the bench (its glow is live)
  part(ctx, (c) => { cylinder(c, x + 4, y - 17, 9, 7, "#5a4a44", { r: 1.5, hi: 0.3, lo: 0.5 }); c.fillStyle = "#2a1c18"; roundRect(c, x + 6, y - 15, 5, 3.5, 1); c.fill(); });
  // posts and the plank roof, over the bench and behind the smith
  for (const sgn of [-1, 1]) part(ctx, (c) => cylinder(c, x + sgn * 15 - 1.5, y - 30, 3, 32, OAKWOOD, { r: 1, hi: 0.3, lo: 0.5 }));
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(x - 19, y - 26); c.lineTo(x - 15, y - 34); c.lineTo(x + 15, y - 34); c.lineTo(x + 19, y - 26); c.closePath();
    c.fillStyle = lin(c, x - 19, y - 34, x + 12, y - 26, [[0, lighten(TIMBER, 0.3)], [0.5, TIMBER], [1, darken(TIMBER, 0.4)]]); c.fill();
    c.fillStyle = rgba(darken(TIMBER, 0.5), 0.3); for (let px = x - 15; px < x + 15; px += 4) c.fillRect(px, y - 34, 0.8, 8);
  });
  // the anvil out front
  part(ctx, (c) => { cylinder(c, x - 5, y - 1, 8, 5, "#4a4a52", { r: 1.5 }); cylinder(c, x - 7, y - 5, 12, 4.5, iron, { r: 2, hi: 0.4, lo: 0.45 }); });
  // powder kegs beside the shed
  if (blast || lvl >= 3) for (let i = 0; i < (blast ? 3 : 2); i++) part(ctx, (c) => { cylinder(c, x + 18 + (i % 2) * 6, y - 2 - Math.floor(i / 2) * 6, 5.5, 7, "#6a4a2e", { r: 2 }); c.fillStyle = iron; c.fillRect(x + 18 + (i % 2) * 6, y + 1 - Math.floor(i / 2) * 6, 5.5, 1); });
  // the rack
  part(ctx, (c) => { cylinder(c, x - 27, y - 18, 2.2, 22, OAKWOOD, { r: 1 }); cylinder(c, x - 20, y - 18, 2.2, 22, OAKWOOD, { r: 1 }); c.fillStyle = lighten(OAKWOOD, 0.1); c.fillRect(x - 28, y - 19, 11, 1.6); });
  skirt(ctx, x, y + 7, 20, t.id);
};

export const drawTrapsmith = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const blast = t.branch === "b";
  const bake = canBake();
  if (bake) stamp(ctx, cache.get(`shed|${t.level}|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintShed(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintShed(ctx, t, x, y);
  // the forge glows
  glow(ctx, x + 8.5, y - 13, 5 + Math.sin(time * 3 + t.id), "#f0903a", 0.8);
  // hung traps on the rack, one per ready charge
  const charges = Math.min(4, t.charges || 0);
  for (let i = 0; i < 4; i++) {
    const hy = y - 15 + i * 4.5;
    ctx.fillStyle = i < charges ? "#c4c8d0" : "rgba(80,84,92,0.5)";
    ctx.fillRect(x - 26.5, hy, 6, 1.4);
    if (i < charges) { ctx.fillRect(x - 26, hy - 1.4, 1, 1.6); ctx.fillRect(x - 21.5, hy - 1.4, 1, 1.6); }
  }
  // the balloon of the Aerostat Yard, bobbing on its tether
  if (blast && t.rank4 === "b") {
    const by = y - 46 + Math.sin(time * 1.4 + t.id) * 2;
    ctx.strokeStyle = "rgba(40,36,44,0.7)"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x + 22, y - 6); ctx.lineTo(x + 22, by + 6); ctx.stroke();
    ball(ctx, x + 22, by, 6, 7, "#c05848", { hi: 0.45, lo: 0.45 });
    ball(ctx, x + 22, by + 8, 1.6, 1.4, "#3a3028", { hi: 0.3, lo: 0.4 });
  }
  // the smith, hammer on the beat
  const swing = Math.sin(time * 6 + t.id) > 0.3 ? 1 : 0;
  if (bake) stamp(ctx, cache.get(`smith|${swing}`, 30, 32, (c) => drawSmith(c, 12, 29, 1, CREW_FOLK.smith, swing)), x - 9, y + 4, 12, 29, 1);
  else drawSmith(ctx, x - 9, y + 4, 1, CREW_FOLK.smith, swing);
  if (swing === 0 && Math.sin(time * 6 + t.id) > -0.2) for (let i = 0; i < 3; i++) glow(ctx, x - 2 + i * 2.5 - 2, y - 8 - i * 2, 1.2, "#ffe08a", 0.9);
  pennant(ctx, x + 17, y - 42, 12, blast ? "#c05848" : "#8a8f9a", time, t.id, 1);
};
