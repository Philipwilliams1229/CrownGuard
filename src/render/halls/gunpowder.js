// ============ HALL: THE POWDER WORKS ============
// A timber platform over a low stone powder store with a banded door and
// barrels stacked against it. Two men who never share a job: the bombardier
// on the left with a lit charge, the musketeer braced at the rail on the
// right, each recoiling on his own cadence.

import {
  pad, skirt, deck, rail, OAKWOOD, TIMBER, lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, masonry, lin, part,
  spriteCache, stamp, canBake, pennant,
} from "../buildkit.js";
import { drawBomber, drawMusketeer, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetGunpowderBakes = () => cache.clear();
const BOX = { left: 40, right: 40, up: 50, down: 18 };
const iron = "#6c727e";

const paintWorks = (ctx, t, x, y) => {
  const lvl = t.level;
  const bomb = t.branch === "a", musket = t.branch === "b";
  pad(ctx, x, y + 6, 26, t.id);
  shadow(ctx, x + 6, y + 9, 24, 4.5, 0.32);
  // the powder store
  part(ctx, (c) => masonry(c, x - 16, y - 12, 32, 20, "#7a746a", { r: 2, course: 5, block: 9 }));
  part(ctx, (c) => { c.fillStyle = "#3a2e22"; roundRect(c, x - 5, y - 6, 10, 13, 1.5); c.fill(); c.fillStyle = iron; c.fillRect(x - 5, y - 3, 10, 1.4); c.fillRect(x - 5, y + 2, 10, 1.4); });
  // barrels
  for (let i = 0; i < 2 + (bomb ? 1 : 0); i++) part(ctx, (c) => { cylinder(c, x - 27 + (i % 2) * 6.5, y - 2 - Math.floor(i / 2) * 7, 6, 8, "#6a4a2e", { r: 2 }); c.fillStyle = iron; c.fillRect(x - 27 + (i % 2) * 6.5, y + 1 - Math.floor(i / 2) * 7, 6, 1); });
  // the platform they work from
  const dy = y - 14;
  for (const sgn of [-1, 1]) part(ctx, (c) => cylinder(c, x + sgn * 17 - 1.5, dy, 3, 20, OAKWOOD, { r: 1, hi: 0.3, lo: 0.5 }));
  deck(ctx, x, dy, 20, TIMBER, 5);
  rail(ctx, x, dy + 1, 18, OAKWOOD, 5);
  if (musket) part(ctx, (c) => { c.fillStyle = "#c4c8d0"; for (let i = 0; i < 3; i++) c.fillRect(x + 20 + i * 2.5, y - 10 - i, 1.2, 12); });   // spare muskets
  if (lvl >= 3) part(ctx, (c) => cylinder(c, x + 20, y - 4, 7, 6, "#3a3a44", { r: 2 }));   // a shell crate
  skirt(ctx, x, y + 7, 20, t.id);
};

export const drawGunpowder = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const bake = canBake();
  if (bake) stamp(ctx, cache.get(`works|${t.level}|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintWorks(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintWorks(ctx, t, x, y);
  const dy = y - 14;
  const dir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
  // the bombardier, left
  const throwing = t.anim > 0.45;
  if (bake) stamp(ctx, cache.get(`bomber|${throwing ? 1 : 0}`, 30, 32, (c) => drawBomber(c, 12, 29, 1, CREW_FOLK.bomber, throwing)), x - 9, dy + 3, 12, 29, dir);
  else drawBomber(ctx, x - 9, dy + 3, dir, CREW_FOLK.bomber, throwing);
  if (!throwing) glow(ctx, x - 9 + dir * 5.5, dy + 3 - 15, 2, "#ffe08a", 0.5 + 0.5 * Math.sin(time * 12));   // the fuse
  // the musketeer, right, kicking on his own beat
  const kick = (t.mAnim || 0) > 0.5 ? 2 : 0;
  if (bake) stamp(ctx, cache.get("musketeer", 34, 32, (c) => drawMusketeer(c, 12, 29, 1, CREW_FOLK.musketeer, 0)), x + 9 - dir * kick, dy + 3, 12, 29, dir);
  else drawMusketeer(ctx, x + 9, dy + 3, dir, CREW_FOLK.musketeer, kick);
  if ((t.mAnim || 0) > 0.15) { const p = 1 - (t.mAnim || 0); soft(ctx, x + 9 + dir * (20 + p * 6), dy - 14 - p * 3, 3 + p * 4, 3 + p * 3, [[0, `rgba(198,198,190,${0.55 * (t.mAnim || 0)})`], [1, "rgba(198,198,190,0)"]]); }
  if (t._idle && Math.sin(time * 1.7 + t.id) > 0.86) glow(ctx, x - 6, dy - 12, 2, "#ffffff", 0.8);
  pennant(ctx, x - 17, dy - 24, 12, t.branch === "b" ? "#3a4a6a" : "#5a4a3c", time, t.id, 1);
};
