// ============ HALL: THE GOLD WORKS ============
// A squat stone counting-house with a working furnace mouth and a chimney
// that smokes gold. The takings stack up beside it as it levels. The Royal
// Mint's hoard piles higher (and its stone version is dressed pale); the
// Transmuter keeps a bubbling alembic and, once ascended, a hovering
// philosopher's stone.

import {
  pad, skirt, stoneBody, PALE_STONE, lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, masonry, lin, part,
  spriteCache, stamp, canBake, pennant,
} from "../buildkit.js";
import { drawStander, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetGoldworksBakes = () => cache.clear();
const BOX = { left: 40, right: 40, up: 48, down: 18 };
const GOLD = "#e0bb48";

const paintHouse = (ctx, t, x, y) => {
  const lvl = t.level;
  const alch = t.branch === "b";
  const hoard = t.branch === "a" && t.rank4 === "a";
  const pale = t.branch === "a" && t.rank4 === "b";
  const stone = pale ? PALE_STONE : "#8a7a6a";
  pad(ctx, x, y + 6, 24, t.id);
  shadow(ctx, x + 6, y + 9, 22, 4.5, 0.32);
  // the furnace house and its mouth
  stoneBody(ctx, x - 4, y - 18, 26, 26, stone);
  part(ctx, (c) => { c.fillStyle = "#2a1c18"; roundRect(c, x - 11, y - 6, 12, 10, 2); c.fill(); });
  part(ctx, (c) => cylinder(c, x + 4, y - 30, 6, 13, darken(stone, 0.1), { r: 1, hi: 0.3, lo: 0.45 }));
  // the takings
  const stacks = hoard ? 5 : lvl + (t.branch === "a" ? 1 : 0);
  for (let i = 0; i < stacks; i++) {
    const sx = x + 14 + (i % 3) * 5, sy = y + 4 - Math.floor(i / 3) * 4;
    const h = 3 + (i % 2) * 2;
    part(ctx, (c) => cylinder(c, sx - 2.2, sy - h, 4.4, h, GOLD, { r: 1, hi: 0.4, lo: 0.4 }));
  }
  if (hoard) part(ctx, (c) => { cylinder(c, x + 12, y - 12, 14, 8, "#6a4a2e", { r: 2 }); c.fillStyle = GOLD; c.fillRect(x + 13, y - 8, 12, 1.4); });
  // the transmuter's alembic on its stand
  if (alch) part(ctx, (c) => {
    cylinder(c, x - 22, y - 2, 10, 5, "#4a4a52", { r: 1.5 });
    ball(c, x - 17, y - 8, 4.5, 4.5, "#8ad0a0", { hi: 0.55, lo: 0.35 });
    cylinder(c, x - 18.5, y - 15, 3, 5, "#c8dcd0", { r: 1 });
  });
  skirt(ctx, x, y + 7, 18, t.id);
};

export const drawGoldworks = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const lvl = t.level;
  const alch = t.branch === "b";
  const bake = canBake();
  if (bake) stamp(ctx, cache.get(`house|${lvl}|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintHouse(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintHouse(ctx, t, x, y);
  // the furnace breathes
  const br = 0.6 + 0.4 * Math.sin(time * 2.2 + t.id);
  glow(ctx, x - 5, y - 1, 6 + br * 2, "#f0903a", 0.85 * br);
  // gold-fleck smoke
  for (let i = 0; i < 3; i++) {
    const t2 = (time * 10 + i * 7 + t.id * 3) % 22;
    soft(ctx, x + 7 + Math.sin(time * 1.5 + i) * 2, y - 32 - t2, 2 + t2 / 8, 2 + t2 / 8, [[0, `rgba(200,196,180,${Math.max(0, 0.4 - t2 * 0.018)})`], [1, "rgba(200,196,180,0)"]]);
    if (i === 1 && t2 < 12) glow(ctx, x + 8, y - 34 - t2, 1.2, GOLD, 0.9);
  }
  if (alch) { const bub = (time * 3 + t.id) % 1; glow(ctx, x - 17, y - 10 - bub * 6, 1.4, "#c8f0d8", 1 - bub); }
  if (alch && t.rank4 === "b") { const hy = y - 30 + Math.sin(time * 2 + t.id) * 2; glow(ctx, x - 17, hy, 6, "#e04070", 0.35); ball(ctx, x - 17, hy, 2.6, 2.6, "#e04070", { hi: 0.6, lo: 0.3 }); }
  // the clerk at the door, flipping a coin between waves
  if (bake) stamp(ctx, cache.get("clerk", 26, 30, (c) => drawStander(c, 12, 27, 1, CREW_FOLK.clerk)), x + 10, y + 6, 12, 27, -1);
  else drawStander(ctx, x + 10, y + 6, -1, CREW_FOLK.clerk);
  if (t._idle) { const cyc = ((time / 2.4) + t.id * 0.37) % 1; if (cyc < 0.7) ball(ctx, x + 6, y - 20 - Math.sin(cyc / 0.7 * Math.PI) * 10, 1.3, 1.3, GOLD, { hi: 0.6, lo: 0.3 }); }
  pennant(ctx, x + 16, y - 36, 18, alch ? "#8ad0a0" : GOLD, time, t.id, 1);
};
