// ============ RIGS: THE RIVER WATCH'S SKIFF ============
// A River Watch skiff and its crewman ("skiff" in rigs.js RIGS). Split out
// of rigs.js (pixel-identical); enemies.js drawSkiff rows it.

import { lighten, darken, rgba, roundRect, lin, part } from "./paint.js";
import { biped } from "./rigs.js";

export const skiff = (ctx, p) => {
  const s = 1;
  const f = p.frame || 0;
  part(ctx, (c) => { c.beginPath(); c.moveTo(-13, -4); c.lineTo(13, -4); c.quadraticCurveTo(12, 2, 8, 3); c.lineTo(-8, 3); c.quadraticCurveTo(-12, 2, -13, -4); c.closePath(); c.fillStyle = lin(c, -13, -4, 13, 3, [[0, lighten("#8a6238", 0.3)], [0.5, "#8a6238"], [1, darken("#8a6238", 0.4)]]); c.fill(); c.fillStyle = rgba("#5f4326", 0.6); for (let i = 0; i < 5; i++) c.fillRect(-11 + i * 5, -4, 0.8, 7); });
  part(ctx, (c) => { c.fillStyle = "#3a3a44"; roundRect(c, 8, -12, 4, 5, 1); c.fill(); c.fillStyle = "#e8c14a"; c.fillRect(9, -11, 2, 3); });
  ctx.save(); ctx.translate(-2, -3); biped(ctx, { h: 18, skin: "#e8c9a2", cloth: "#4a5a7c", head: "hood", hair: "#3a4a68", weapon: "spear", wcol: "#c4c8d0", pose: "walk", frame: f }); ctx.restore();
};
