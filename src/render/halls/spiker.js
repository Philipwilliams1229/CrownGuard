// ============ HALL: THE BLADEWHEEL ============
// A stone ring around an oak post with an iron collar per level, and on top
// a flat wheel of blades that spins and kicks down as it bites. The Razor
// Gale runs faster with an inner counter-ring; the Brazier Wheel sets the
// rim alight and throws flame rings instead of steel.

import {
  pad, skirt, OAKWOOD, lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, masonry, lin, part,
  spriteCache, stamp, canBake, pennant,
} from "../buildkit.js";

const cache = spriteCache();
export const resetSpikerBakes = () => cache.clear();
const BOX = { left: 34, right: 34, up: 44, down: 18 };
const iron = "#6c727e";

const paintBase = (ctx, t, x, y) => {
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  pad(ctx, x, y + 6, 22, t.id);
  shadow(ctx, x + 5, y + 8, 18, 4, 0.3);
  part(ctx, (c) => masonry(c, x - 14, y - 2, 28, 10, "#8a8478", { r: 2, course: 4, block: 7 }));
  part(ctx, (c) => cylinder(c, x - 15, y - 4, 30, 3, "#a19a88", { r: 1.5, hi: 0.3, lo: 0.4 }));
  // the post and its collars
  part(ctx, (c) => cylinder(c, x - 2.5, y - 24, 5, 22, OAKWOOD, { r: 1.5, hi: 0.3, lo: 0.5 }));
  for (let i = 0; i < lvl; i++) part(ctx, (c) => cylinder(c, x - 3.5, y - 8 - i * 6, 7, 2.4, iron, { r: 1, hi: 0.4, lo: 0.4 }));
  // spare spike bundle by the base
  part(ctx, (c) => { c.fillStyle = "#c4c8d0"; for (let i = 0; i < 4; i++) c.fillRect(x + 16 + i * 1.6, y - 4 - (i % 2), 1, 9); c.fillStyle = "#6a4a2e"; c.fillRect(x + 15, y - 1, 8, 1.6); });
  // Hamstringer: barbed snares staked round the base
  if (r4 === "ab") for (const dx of [-19, 19]) part(ctx, (c) => { c.strokeStyle = iron; c.lineWidth = 1; c.beginPath(); c.moveTo(x + dx - 3, y + 4); c.lineTo(x + dx + 3, y + 4); c.moveTo(x + dx, y + 1); c.lineTo(x + dx, y + 7); c.stroke(); });
  skirt(ctx, x, y + 7, 16, t.id);
};

// The wheel, drawn flat and later squashed and spun.
const paintWheel = (ctx, t, cx, cy) => {
  const lvl = t.level;
  const gale = t.branch === "a", fire = t.branch === "b";
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const rr = 9 + lvl + (t.branch ? 1 : 0);
  const n = t.branch ? 12 : 4 + lvl * 2;
  const tip = fire ? "#e8c14a" : r4 === "aa" ? "#e8d47a" : r4 === "ab" ? "#8ce8f0" : "#dde2ea";
  part(ctx, (c) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      c.beginPath(); c.moveTo(cx + Math.cos(a - 0.12) * rr, cy + Math.sin(a - 0.12) * rr); c.lineTo(cx + Math.cos(a) * (rr + 5), cy + Math.sin(a) * (rr + 5)); c.lineTo(cx + Math.cos(a + 0.12) * rr, cy + Math.sin(a + 0.12) * rr); c.closePath();
      c.fillStyle = tip; c.fill();
    }
  });
  part(ctx, (c) => ball(c, cx, cy, rr, rr, "#4a4e58", { hi: 0.35, lo: 0.45 }));
  if (lvl >= 3 || gale) part(ctx, (c) => { c.strokeStyle = r4 === "aa" ? "#e8d47a" : "#c4c8d0"; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, rr * 0.62, 0, 7); c.stroke(); });
  part(ctx, (c) => ball(c, cx, cy, rr * 0.3, rr * 0.3, iron, { hi: 0.45, lo: 0.4 }));
};

export const drawBladewheel = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const lvl = t.level;
  const gale = t.branch === "a", fire = t.branch === "b";
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const bake = canBake();
  if (r4 === "ba" || r4 === "bb") glow(ctx, x, y + 6, 18, "#e8803a", 0.2);
  if (bake) stamp(ctx, cache.get(`base|${lvl}|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintBase(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintBase(ctx, t, x, y);
  // the wheel: spun and squashed for depth
  const spin = time * (gale ? 10 : fire ? 3 : 4.5) * (t._idle ? 0.3 : 1) + t.id;
  const wy = y - 24 + t.anim * 2;
  const rr = 9 + lvl + (t.branch ? 1 : 0);
  const side = rr + 8;
  ctx.save();
  ctx.translate(x, wy);
  ctx.scale(1, 0.55);
  ctx.rotate(spin);
  if (bake) { const cv = cache.get(`wheel|${lvl}|${t.branch}|${t.rank4}`, side * 2, side * 2, (c) => paintWheel(c, t, side, side)); stamp(ctx, cv, 0, 0, side, side); }
  else paintWheel(ctx, t, 0, 0);
  ctx.restore();
  // flames licking off the brazier rim, and a halo over the Solar Crown
  if (fire) for (let i = 0; i < 5; i++) {
    const a = spin * 0.5 + (i / 5) * Math.PI * 2;
    const fl = 0.5 + 0.5 * Math.sin(time * 9 + i);
    glow(ctx, x + Math.cos(a) * rr, wy + Math.sin(a) * rr * 0.55 - 3 - fl * 2, 2.4 + fl, "#f0903a", 0.8);
  }
  if (r4 === "ba") { ctx.strokeStyle = rgba("#e8d47a", 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, wy - 14 + Math.sin(time * 2) * 1.5, rr + 2, 3.5, 0, 0, 7); ctx.stroke(); }
  if (r4 === "bb") for (let i = 0; i < 3; i++) glow(ctx, x - 8 + i * 8 + Math.sin(time * 3 + i) * 3, y + 4 - ((time * 20 + i * 12 + t.id * 5) % 36), 1.6, "#e88a3a", 0.85);
  // idle: a whetstone spark now and then
  if (t._idle && Math.sin(time * 3.1 + t.id * 1.9) > 0.9) glow(ctx, x + rr - 2, wy - 2, 2.5, "#ffffff", 0.9);
  const bc = r4 === "aa" ? "#e8d47a" : r4 === "ab" ? "#8ce8f0" : r4 === "ba" ? "#e8c14a" : r4 === "bb" ? "#e88a3a" : gale ? "#7a94b8" : fire ? "#c05a28" : "#a04a3f";
  pennant(ctx, x + 18, y - 22, 20, bc, time, t.id, 1);
};
