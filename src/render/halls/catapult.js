// ============ HALL: THE CATAPULT ============
// A timber deck on wheels with an A-frame and a throwing arm that sweeps
// when it looses. The Trebuchet stands taller with a counterweight box;
// the Log Roller trades the arm for a great trimmed log on a tilted ramp.

import {
  pad, skirt, OAKWOOD, TIMBER, lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, lin, part,
  spriteCache, stamp, canBake, pennant,
} from "../buildkit.js";
import { drawCrew, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetCatapultBakes = () => cache.clear();
const BOX = { left: 40, right: 40, up: 70, down: 18 };
const wood = "#7a5634", woodDk = "#4e3520", iron = "#5c626e";

const paintFrame = (ctx, t, x, y) => {
  const lvl = t.level;
  const treb = t.branch === "a", roller = t.branch === "b";
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const hw = 14 + lvl;
  pad(ctx, x, y + 6, hw + 10, t.id);
  shadow(ctx, x + 6, y + 9, hw + 8, 4.5, 0.32);
  if (r4 === "aa") {   // Earthshaker: cracked ground
    ctx.strokeStyle = "rgba(40,32,28,0.5)"; ctx.lineWidth = 1; ctx.lineCap = "round";
    for (const [dx, dy] of [[-16, 4], [12, 6], [-4, 9]]) { ctx.beginPath(); ctx.moveTo(x + dx, y + dy); ctx.lineTo(x + dx + 5, y + dy + 3); ctx.lineTo(x + dx + 9, y + dy + 1); ctx.stroke(); }
  }
  // wheels
  for (const sgn of [-1, 1]) part(ctx, (c) => { ball(c, x + sgn * (hw - 2), y + 4, 5, 5, woodDk, { hi: 0.35, lo: 0.45 }); ball(c, x + sgn * (hw - 2), y + 4, 1.6, 1.6, iron, { hi: 0.4, lo: 0.4 }); });
  // the deck, iron-strapped
  part(ctx, (c) => {
    cylinder(c, x - hw, y - 4, hw * 2, 8, TIMBER, { r: 1.5, hi: 0.3, lo: 0.5 });
    c.fillStyle = rgba(iron, 0.9);
    c.fillRect(x - hw + 3, y - 4, 1.6, 8); c.fillRect(x + hw - 5, y - 4, 1.6, 8);
  });
  if (roller) {
    // the ramp, tilted to the field, and its chocks
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(x - hw + 2, y - 4); c.lineTo(x - hw + 6, y - 22); c.lineTo(x + hw - 6, y - 22); c.lineTo(x + hw - 2, y - 4); c.closePath();
      c.fillStyle = lin(c, x - hw, y - 22, x + hw, y - 4, [[0, lighten(wood, 0.3)], [0.5, wood], [1, darken(wood, 0.45)]]); c.fill();
    });
    for (const sgn of [-1, 1]) part(ctx, (c) => cylinder(c, x + sgn * (hw - 5) - 1.5, y - 26, 3, 23, woodDk, { r: 1 }));
  } else {
    // A-frame uprights and the pivot beam
    const fh = treb ? 34 : 24 + lvl * 2;
    for (const sgn of [-1, 1]) part(ctx, (c) => {
      c.beginPath(); c.moveTo(x + sgn * (hw - 4) - 2, y - 3); c.lineTo(x + sgn * 3 - 1.5, y - fh); c.lineTo(x + sgn * 3 + 1.5, y - fh); c.lineTo(x + sgn * (hw - 4) + 2, y - 3); c.closePath();
      c.fillStyle = lin(c, x - hw, 0, x + hw, 0, [[0, lighten(wood, 0.3)], [0.5, wood], [1, darken(wood, 0.45)]]); c.fill();
    });
    part(ctx, (c) => cylinder(c, x - 8, y - fh - 2, 16, 4, woodDk, { r: 1.5 }));
    // the winch drum
    part(ctx, (c) => { cylinder(c, x + hw - 12, y - 10, 8, 6, woodDk, { r: 2 }); c.fillStyle = "#a89a72"; c.fillRect(x + hw - 11, y - 8, 6, 1); c.fillRect(x + hw - 11, y - 6, 6, 1); });
  }
  // the boulder pile, crated once the crew are supplied
  if (lvl >= 3 || t.branch) {
    part(ctx, (c) => cylinder(c, x - hw - 12, y - 2, 11, 8, woodDk, { r: 1.5, hi: 0.3, lo: 0.5 }));
    for (const [dx, dy, r] of [[-hw - 9, -4, 2.6], [-hw - 5, -4, 2.2], [-hw - 7, -7, 2.4]]) part(ctx, (c) => ball(c, x + dx, y + dy, r, r * 0.85, "#8a8a92", { hi: 0.45, lo: 0.5 }));
  } else {
    for (const [dx, dy, r] of [[-hw - 8, 3, 3], [-hw - 4, 4, 2.4]]) part(ctx, (c) => ball(c, x + dx, y + dy, r, r * 0.8, "#8a8a92", { hi: 0.45, lo: 0.5 }));
  }
  skirt(ctx, x, y + 6, hw + 6, t.id);
};

// The log, on its own frame so it can be stamped where the ramp holds it.
const paintLog = (ctx, x, y, r4) => {
  const col = r4 === "a" ? "#5a5c66" : wood;
  part(ctx, (c) => cylinder(c, x - 16, y - 7, 32, 14, col, { r: 6, hi: 0.32, lo: 0.5 }));
  for (const bx of [-12, 0, 12]) part(ctx, (c) => cylinder(c, x + bx - 1.5, y - 7.5, 3, 15, r4 === "a" ? "#3a3c46" : darken(col, 0.3), { r: 1 }));
  if (r4 === "b") part(ctx, (c) => { cylinder(c, x - 5, y - 13, 10, 7, "#8a4a3a", { r: 2 }); c.fillStyle = "#e8d47a"; c.fillRect(x - 0.6, y - 16, 1.2, 3); });
};

export const drawCatapult = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const lvl = t.level;
  const treb = t.branch === "a", roller = t.branch === "b";
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const hw = 14 + lvl;
  const bake = canBake();
  if (bake) stamp(ctx, cache.get(`frame|${lvl}|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintFrame(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintFrame(ctx, t, x, y);

  const dir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
  if (roller) {
    // the log waits on the ramp; when it rolls, the frame is empty for a beat
    if (t.anim < 0.5) {
      if (bake) stamp(ctx, cache.get(`log|${t.rank4}`, 40, 24, (c) => paintLog(c, 20, 14, t.rank4)), x, y - 16, 20, 14, dir);
      else paintLog(ctx, x, y - 16, t.rank4);
    }
  } else {
    // the throwing arm sweeps: anim is 1 the instant it lets go
    const fh = treb ? 34 : 24 + lvl * 2;
    const swing = t.anim * t.anim;
    const ang = -2.2 + 2.8 * swing;
    const len = treb ? 30 : 22 + lvl * 2;
    const px = x, py = y - fh;
    const tx = px + Math.sin(ang) * len * dir, ty = py - Math.cos(ang) * len;
    ctx.strokeStyle = lin(ctx, px, py, tx, ty, [[0, lighten(wood, 0.25)], [0.5, wood], [1, darken(wood, 0.4)]]);
    ctx.lineWidth = 3.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke();
    if (treb) {
      // the counterweight swings opposite, heavily
      const cx = px - Math.sin(ang) * 10 * dir, cy = py + Math.cos(ang) * 10;
      cylinder(ctx, cx - 5, cy - 4, 10, 8, "#5c626e", { r: 1.5, hi: 0.3, lo: 0.5 });
    }
    // the cup and its stone(s) when loaded
    if (swing < 0.3) {
      ball(ctx, tx, ty, 3.2, 2.6, woodDk, { hi: 0.3, lo: 0.45 });
      const stones = r4 === "bb" ? 3 : 1;
      for (let i = 0; i < stones; i++) ball(ctx, tx + (i - (stones - 1) / 2) * 2.4, ty - 2.5, stones > 1 ? 1.6 : 2.6, stones > 1 ? 1.4 : 2.2, "#8a8a92", { hi: 0.45, lo: 0.5 });
      if (r4 === "ab") glow(ctx, tx, ty - 2.5, 5, "#f0903a", 0.8);   // Comet Sling: it burns
    }
    // the rope back to the winch
    ctx.strokeStyle = "rgba(200,184,140,0.9)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x + hw - 8, y - 7); ctx.stroke();
  }
  // banner and the crew engineer at the winch
  pennant(ctx, x + hw - 2, y - 30, 22, treb ? "#7a94b8" : roller ? "#a0603a" : "#a04a3f", time, t.id, 1);
  const work = Math.round((Math.sin(time * 4 + t.id) + 1) * 1.5);
  if (bake) stamp(ctx, cache.get(`crew|${work}`, 28, 30, (c) => drawCrew(c, 12, 27, 1, CREW_FOLK.engineer, (work - 1.5) * 0.4)), x + hw + 4, y + 4, 12, 27, -1);
  else drawCrew(ctx, x + hw + 4, y + 4, -1, CREW_FOLK.engineer, 0);
  // idle upkeep: hammer taps on the frame joints, and the odd spark
  if (t._idle && Math.sin(time * 3.5 + t.id * 1.7) > 0.92) glow(ctx, x - 3, y - 14, 2.5, "#ffe08a", 0.9);
};
