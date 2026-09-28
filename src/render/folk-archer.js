// ============ FOLK: THE ARCHER ============
// The bowman of the archer halls and the castle wall, and the crews' cloth
// by tower and path. Built from folk-kit.js; folk.js re-exports it.

import { lighten, darken, rgba, shadow, ball, roundRect, lin, part } from "./paint.js";
import { limb, dab, head, torso, legs } from "./folk-kit.js";

// An archer at the string. `draw` runs 0..1: loosed to full draw. Towers
// may pass `o.pose`: "rest" (bow carried low, at ease), "loose" (the string
// has just slipped: it snaps straight and shivers, the bow arm drives on,
// the drawing hand flicks back past the ear), "reach" (a hand over the
// shoulder to the quiver). Without a pose the figure draws by `draw`: the
// limbs bend, the string comes back to the cheek, the arrow rides on it,
// and he leans back into the weight.
export const drawArcher = (ctx, x, y, dir, pal, draw = 1, o = {}) => {
  const big = !!o.big;
  const s = big ? 1.15 : 1;
  const pose = o.pose || "draw";
  const bowCol = o.bowCol || "#4a3018";
  const fl = o.fletch || "#e8e0c8";
  const d = pose === "draw" ? draw : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  shadow(ctx, 0.5, 0.4, 4.6, 1.6, 0.3);
  // the quiver rides on the back, fletchings over the shoulder
  const lean = pose === "draw" ? -d * 0.8 : pose === "loose" ? 0.5 : 0;
  part(ctx, (c) => {
    c.save(); c.translate(-3 + lean, -10.6); c.rotate(-0.42);
    for (const [i, col] of [[0, fl], [1, "#a04a3f"], [2, fl]].entries()) { c.fillStyle = col; c.beginPath(); c.moveTo(-1.0 + i * 0.9, -6.6); c.lineTo(-0.7 + i * 0.9, -8.6); c.lineTo(-0.2 + i * 0.9, -6.6); c.closePath(); c.fill(); }
    roundRect(c, -1.3, -6.8, 2.6, 7, 0.9);
    c.fillStyle = lin(c, -1.3, 0, 1.3, 0, [[0, lighten("#7a5334", 0.3)], [0.5, "#7a5334"], [1, darken("#7a5334", 0.4)]]); c.fill();
    c.fillStyle = darken("#7a5334", 0.45); c.fillRect(-1.3, -5.8, 2.6, 0.6); c.fillRect(-1.3, -1.6, 2.6, 0.6);
    c.restore();
  });
  legs(ctx, 0, 0, pal, pose === "rest" ? 0.1 : 0.55);
  ctx.save();
  ctx.translate(lean, 0);
  // the bow: where the grip sits, how far the limbs bend, where the string's nock is
  const half = big ? 8.6 : 7.6;
  let gx = 7.2, gy = -15.6, rot = 0, belly = 1.2 + d * 2.6, nx, ny;
  if (pose === "rest") { gx = 4.6; gy = -9.2; rot = 0.42; belly = 1.2; }
  if (pose === "reach") { gx = 6.4; gy = -14.2; rot = 0.12; }
  if (pose === "loose") { gx = 7.9; belly = 1.6; }
  // the string hand: sliding back from the grip to the cheek as the draw fills
  const cheek = [2.3, -18.3];
  let hx = gx - 1.2 + (cheek[0] - gx + 1.2) * d, hy = gy + (cheek[1] - gy) * d;
  if (pose === "loose") { hx = -3.8; hy = -17.6; }
  if (pose === "reach") { hx = -2.6; hy = -21.2; }
  if (pose === "rest") { hx = -1.8; hy = -9.6; }
  // the far arm (the bow arm) behind the body, reaching to the grip
  limb(ctx, 0.2, -16.2, gx - 0.4, gy + 0.2, 2.4, darken(pal.coat, 0.18));
  torso(ctx, 0, -17.2, 10.4, 6.4, pal);
  head(ctx, 0.5, -20.6, pal);
  // the bow itself, in front of the body
  ctx.save();
  ctx.translate(gx, gy); ctx.rotate(rot);
  nx = pose === "draw" ? (hx - gx) * Math.cos(-rot) : -0.6; ny = pose === "draw" ? hy - gy : 0;
  const tipX = -0.6 - d * 1.2;
  part(ctx, (c) => {
    c.strokeStyle = lin(c, 0, -half, belly, half, [[0, lighten(bowCol, 0.35)], [0.5, bowCol], [1, darken(bowCol, 0.35)]]);
    c.lineWidth = big ? 1.7 : 1.5; c.lineCap = "round";
    c.beginPath(); c.moveTo(tipX, -half); c.quadraticCurveTo(belly * 2, -half * 0.35, belly * 0.9, 0); c.quadraticCurveTo(belly * 2, half * 0.35, tipX, half); c.stroke();
    c.fillStyle = darken(bowCol, 0.45); c.fillRect(belly * 0.9 - 0.7, -1.1, 1.4, 2.2);           // the leather grip
  });
  ctx.strokeStyle = "rgba(244,236,214,0.95)";
  ctx.lineWidth = 0.55;
  ctx.beginPath(); ctx.moveTo(tipX, -half); ctx.lineTo(pose === "draw" ? nx : tipX, pose === "draw" ? ny : 0); ctx.lineTo(tipX, half); ctx.stroke();
  if (pose === "loose") {
    ctx.strokeStyle = "rgba(244,236,214,0.5)";
    ctx.beginPath(); ctx.moveTo(tipX, -half); ctx.lineTo(tipX - 1.3, 0); ctx.lineTo(tipX, half); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tipX, -half); ctx.lineTo(tipX + 1.1, 0); ctx.lineTo(tipX, half); ctx.stroke();
  }
  ctx.restore();
  // the arrow on the string, from the nock at the hand out past the grip
  if (pose === "draw" && d > 0.25) {
    const len = big ? 13 : 11.5;
    const ax = gx + belly * 0.9 - hx, ay = gy - hy, L = Math.hypot(ax, ay) || 1;
    const ux = ax / L, uy = ay / L, ex = hx + ux * len, ey = hy + uy * len;
    part(ctx, (c) => {
      c.strokeStyle = "#8a6a44"; c.lineWidth = 0.7; c.lineCap = "butt";
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(ex, ey); c.stroke();
      c.fillStyle = "#c4c8d0";
      c.beginPath(); c.moveTo(ex + ux * 2.2, ey + uy * 2.2); c.lineTo(ex - uy * 1.1, ey + ux * 1.1); c.lineTo(ex + uy * 1.1, ey - ux * 1.1); c.closePath(); c.fill();
      c.fillStyle = bowCol === "#4a3018" ? "#a04a3f" : fl;
      c.beginPath(); c.moveTo(hx + ux * 0.4, hy + uy * 0.4); c.lineTo(hx + ux * 2.4 - uy * 1.2, hy + uy * 2.4 + ux * 1.2); c.lineTo(hx + ux * 2.6, hy + uy * 2.6); c.closePath(); c.fill();
      c.fillStyle = fl;
      c.beginPath(); c.moveTo(hx + ux * 0.4, hy + uy * 0.4); c.lineTo(hx + ux * 2.4 + uy * 1.2, hy + uy * 2.4 - ux * 1.2); c.lineTo(hx + ux * 2.6, hy + uy * 2.6); c.closePath(); c.fill();
    });
  }
  // the bow hand closes on the grip
  const gpx = gx + Math.cos(rot) * belly * 0.9, gpy = gy + Math.sin(rot) * belly * 0.9;
  ball(ctx, gpx - 0.2, gpy, 1.1, 1.2, pal.skin, { hi: 0.4, lo: 0.4 });
  // the near arm: elbow high and back at full draw, flung out at the loose
  const sh = [0.9, -16.4];
  const ex2 = pose === "draw" ? sh[0] - 1.5 - d * 1.8 : pose === "loose" ? -1.2 : pose === "reach" ? -1.6 : 0.2;
  const ey2 = pose === "draw" ? -15.4 - d * 2.4 : pose === "loose" ? -15.2 : pose === "reach" ? -19.6 : -12.6;
  limb(ctx, sh[0], sh[1], ex2, ey2, 2.4, pal.coat);
  limb(ctx, ex2, ey2, hx, hy, 2.2, pal.coat);
  ball(ctx, hx, hy, 1.05, 1.1, pal.skin, { hi: 0.4, lo: 0.4 });
  if (pose === "loose") { dab(ctx, hx - 1.6, hy - 1.2, 0.6, 0.6, pal.skin); dab(ctx, hx - 1.8, hy + 0.2, 0.6, 0.6, pal.skin); }   // fingers open
  ctx.restore();
  ctx.restore();
};

// The crews' cloth, by tower and path.
export const ARCHER_FOLK = {
  base: { skin: "#e8b990", hood: "#5c7a3f", coat: "#7a5432", boots: "#3e2a1a", trim: "#3e2a1a" },
  a: { skin: "#e8b990", hood: "#3f6a34", coat: "#8a6a40", boots: "#3e2a1a", trim: "#2f4a24" },
  b: { skin: "#e8b990", hood: "#2c3e54", coat: "#3a5474", boots: "#2a2a30", trim: "#1f2c3e" },
  aa: { skin: "#d6c8a0", hood: "#5a2a3a", coat: "#3c6a34", boots: "#2a3020", trim: "#243a20" },
  ab: { skin: "#e8b990", hood: "#e8e0c8", coat: "#4a7098", boots: "#2a2a30", trim: "#3a5060" },
  bb: { skin: "#e8b990", hood: "#8e2f2a", coat: "#a0473a", boots: "#2a2a30", trim: "#d8b34a" },
  crew: { skin: "#e8b990", hood: "#7a5a34", coat: "#6e4c28", boots: "#3e2a1a", trim: "#4a3018" },
};
