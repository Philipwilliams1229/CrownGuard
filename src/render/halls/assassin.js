// ============ HALL: THE ASSASSIN'S COVERT ============
// A low dark tent of canvas stretched over bent poles, its doorway a cut
// deeper than any night. A knife board by the door, and the blade on watch
// out front — gone when the work is on. The Silent Court hangs a gold seal;
// guild covens hang venom vials.

import {
  pad, skirt, lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, lin, part,
  spriteCache, stamp, canBake,
} from "../buildkit.js";
import { drawHooded, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetAssassinBakes = () => cache.clear();
const BOX = { left: 36, right: 36, up: 40, down: 18 };

const paintCovert = (ctx, t, x, y) => {
  const guild = t.branch === "b";
  const canvas = guild ? "#2e3a2a" : "#2a2434";
  pad(ctx, x, y + 6, 24, t.id);
  shadow(ctx, x + 5, y + 8, 22, 4, 0.3);
  // the tent: a low dome of canvas over bent poles
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(x - 22, y + 4); c.quadraticCurveTo(x - 20, y - 20, x, y - 24); c.quadraticCurveTo(x + 20, y - 20, x + 22, y + 4); c.closePath();
    c.fillStyle = lin(c, x - 22, y - 24, x + 14, y + 4, [[0, lighten(canvas, 0.3)], [0.5, canvas], [1, darken(canvas, 0.4)]]); c.fill();
    c.strokeStyle = rgba(darken(canvas, 0.6), 0.5); c.lineWidth = 0.9;
    for (const dx of [-11, 0, 11]) { c.beginPath(); c.moveTo(x + dx, y + 3); c.quadraticCurveTo(x + dx * 0.9, y - 12, x + dx * 0.4, y - 23); c.stroke(); }
  });
  // the cut of the doorway
  part(ctx, (c) => { c.fillStyle = "#0e0a12"; c.beginPath(); c.moveTo(x - 4, y + 4); c.lineTo(x - 2, y - 12); c.lineTo(x + 3, y - 12); c.lineTo(x + 5, y + 4); c.closePath(); c.fill(); });
  // the knife board
  part(ctx, (c) => { cylinder(c, x + 11, y - 12, 8, 10, "#4a3828", { r: 1 }); c.fillStyle = "#c4c8d0"; for (let i = 0; i < 3; i++) c.fillRect(x + 12.5 + i * 2.2, y - 10 + (i % 2) * 2, 1, 5); });
  // the sign of the house: a gold seal, or hung vials
  if (guild) for (let i = 0; i < 3; i++) part(ctx, (c) => { c.fillStyle = "#8a8f9a"; c.fillRect(x - 14 + i * 4, y - 16, 0.8, 4); ball(c, x - 13.6 + i * 4, y - 10.5, 1.5, 2, i % 2 ? "#a8d060" : "#8a6ab0", { hi: 0.5, lo: 0.3 }); });
  else part(ctx, (c) => ball(c, x - 12, y - 13, 3, 3, "#e0b855", { hi: 0.5, lo: 0.4 }));
  // rank-four marks: the Kingslayer's crown nail, the Contract's hush; the Widow's veil, the Plague Bearer's lantern
  if (t.rank4) part(ctx, (c) => {
    if (!guild) { c.fillStyle = t.rank4 === "a" ? "#e0b855" : "#c8ccd6"; c.fillRect(x - 1, y - 27, 2, 5); }
    else { ball(c, x - 20, y - 8, 2.4, 2.4, t.rank4 === "a" ? "#d8a0c0" : "#b09ad8", { hi: 0.5, lo: 0.3 }); }
  });
  skirt(ctx, x, y + 7, 18, t.id);
};

export const drawAssassin = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const guild = t.branch === "b";
  const bake = canBake();
  if (bake) stamp(ctx, cache.get(`covert|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintCovert(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintCovert(ctx, t, x, y);
  if (guild && t.rank4 === "b") glow(ctx, x - 20, y - 8, 6, "#b09ad8", 0.35 + 0.15 * Math.sin(time * 2));
  // the blade on watch, still, gone when the work is on
  const away = t.anim > 0.4;
  if (!away) {
    const pal = guild ? CREW_FOLK.bladeGuild : CREW_FOLK.blade;
    if (bake) stamp(ctx, cache.get(`blade|${guild ? "g" : "c"}`, 26, 30, (c) => drawHooded(c, 12, 27, 1, pal)), x + 8, y + 6, 12, 27, -1);
    else drawHooded(ctx, x + 8, y + 6, -1, pal);
    if (Math.sin(time * 2.3 + t.id) > 0.92) glow(ctx, x + 3, y - 8, 2, "#ffffff", 0.9);   // the whetstone's glint
  }
};
