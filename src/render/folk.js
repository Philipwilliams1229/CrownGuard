// ============ FOLK ============
// The little people of the kingdom, as one shared body: a slim, rounded
// figure about 22 world pixels tall, drawn from the feet up in lit, soft
// forms — no outlines. Tower crews stand on this rig now; the soldiers and
// the horde will stand on it next.
//
// Every figure faces +x in its own space and is mirrored by `dir`. A
// palette names the visible materials: skin, hood, coat, boots, trim.

import { lighten, darken, rgba, soft, shadow, ball, roundRect, cylinder, lin, rad, part } from "./paint.js";

// A rounded limb between two points.
const limb = (ctx, x0, y0, x1, y1, w, col) => part(ctx, (c) => {
  c.strokeStyle = lin(c, x0 - w, y0, x0 + w, y0, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.45)]]);
  c.lineWidth = w;
  c.lineCap = "round";
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
});

const head = (ctx, x, y, pal, o = {}) => {
  part(ctx, (c) => ball(c, x, y, 3.3, 3.5, pal.skin, { hi: 0.45, lo: 0.4 }));
  // a hood or cap, sitting over the crown and hanging down the back
  if (o.hood !== false) {
    part(ctx, (c) => {
      ball(c, x - 0.9, y - 1.7, 3.6, 2.5, pal.hood, { hi: 0.45, lo: 0.45 });
      ball(c, x - 2.4, y + 0.5, 2.1, 3.1, pal.hood, { hi: 0.3, lo: 0.5 });
    });
  }
  // the eye that faces us, and the nose under it
  ctx.fillStyle = "#2a2230";
  ctx.beginPath(); ctx.ellipse(x + 1.6, y + 0.2, 0.55, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = darken(pal.skin, 0.25);
  ctx.fillRect(x + 2.8, y + 0.5, 0.6, 0.8);
};

// Torso: a coat with a belt.
const torso = (ctx, x, top, h, w, pal) => part(ctx, (c) => {
  roundRect(c, x - w / 2, top, w, h, w * 0.4);
  c.fillStyle = lin(c, x - w / 2, 0, x + w / 2, 0, [[0, lighten(pal.coat, 0.32)], [0.45, pal.coat], [1, darken(pal.coat, 0.5)]]);
  c.fill();
  c.fillStyle = rgba(darken(pal.trim || pal.boots, 0.2), 0.9);
  c.fillRect(x - w / 2 + 0.5, top + h * 0.62, w - 1, 1.4);
});

const legs = (ctx, x, y, pal, stride = 0) => {
  limb(ctx, x - 1.6 - stride, y - 7.5, x - 1.9 - stride * 1.5, y - 0.5, 2.6, pal.boots);
  limb(ctx, x + 1.4 + stride, y - 7.5, x + 1.7 + stride * 1.5, y - 0.5, 2.6, darken(pal.boots, 0.15));
};

// ---- poses ---------------------------------------------------------------

// An archer at the string. `draw` runs 0..1: loosed to full draw. Towers
// may pass `o.pose`: "rest" (bow down, at ease), "loose" (the string just
// slipped: bow arm driven forward, the drawing hand flung back past the
// ear), "reach" (a hand over the shoulder for the next arrow). Without a
// pose the figure draws by `draw`, leaning back into it as it fills.
export const drawArcher = (ctx, x, y, dir, pal, draw = 1, o = {}) => {
  const big = !!o.big;
  const s = big ? 1.15 : 1;
  const pose = o.pose || "draw";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, pose === "rest" ? 0.25 : 0.7);
  // the upper body sways: back into a full draw, forward at the loose
  const lean = pose === "draw" ? -draw * 0.7 : pose === "loose" ? 0.7 : 0;
  ctx.translate(lean, 0);
  torso(ctx, 0, -17, 10, 7.5, pal);
  // a quiver over the back shoulder, fletchings showing
  cylinder(ctx, -4.8, -19.5, 2.6, 8.5, darken(pal.coat, 0.35), { r: 1, hi: 0.3, lo: 0.5 });
  const fl = o.fletch || "#e8e0c8";
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 1 ? "#a04a3f" : fl;
    ctx.fillRect(-4.9 + i * 0.9, -22 - (i % 2) * 0.8, 0.8, 2.6);
  }
  head(ctx, 0.4, -20.5, pal);
  const bowCol = o.bowCol || "#4a3018";
  const half = big ? 9 : 7, belly = big ? 4.2 : 3.2;
  const bowLimb = (bx, by, rot, pull) => {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(rot);
    ctx.strokeStyle = lin(ctx, 0, -half, belly, half, [[0, lighten(bowCol, 0.35)], [0.5, bowCol], [1, darken(bowCol, 0.3)]]);
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-0.5, -half); ctx.quadraticCurveTo(belly * 2, 0, -0.5, half); ctx.stroke();
    // the string: a V at draw, a straight line (and a shiver) otherwise
    ctx.strokeStyle = "rgba(240,232,210,0.95)";
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-0.5, -half); ctx.lineTo(-pull, 0); ctx.lineTo(-0.5, half); ctx.stroke();
    if (pose === "loose") {
      ctx.strokeStyle = "rgba(240,232,210,0.45)";
      ctx.beginPath(); ctx.moveTo(-0.5, -half); ctx.lineTo(-1.6, 0); ctx.lineTo(-0.5, half); ctx.stroke();
    }
    ctx.restore();
  };
  if (pose === "rest") {
    // bow carried low along the leading leg, string arm easy at the side
    limb(ctx, 2.2, -15, 4.6, -10.5, 2.4, pal.coat);
    bowLimb(5, -10, 0.38, 0.5);
    ball(ctx, 4.8, -10.2, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
    limb(ctx, -1.8, -15.5, -2.6, -9.5, 2.4, pal.coat);
    ball(ctx, -2.6, -9.3, 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
    ctx.restore();
    return;
  }
  const bx = pose === "loose" ? 7.6 : 7, by = -15;
  const pull = pose === "draw" ? draw * (big ? 6.5 : 5) : 0.6;
  bowLimb(bx, by, 0, pull);
  // the nocked arrow
  if (pose === "draw" && draw > 0.4) {
    const len = big ? 12 : 9.5;
    ctx.strokeStyle = "#c4c8d0";
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(bx - pull, by); ctx.lineTo(bx - pull + len, by); ctx.stroke();
    ctx.fillStyle = bowCol === "#4a3018" ? "#a04a3f" : bowCol;
    ctx.beginPath(); ctx.moveTo(bx - pull, by - 1.4); ctx.lineTo(bx - pull + 2.2, by); ctx.lineTo(bx - pull, by + 1.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e8e0c8";
    ctx.beginPath(); ctx.moveTo(bx - pull + len, by - 1); ctx.lineTo(bx - pull + len + 1.8, by); ctx.lineTo(bx - pull + len, by + 1); ctx.closePath(); ctx.fill();
  }
  // bow arm straight out to the grip
  limb(ctx, 2, -15, bx - 0.5, by, 2.4, pal.coat);
  ball(ctx, bx - 0.5, by, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  // the string hand: at the cheek while drawing, flung back after the
  // loose, over the shoulder for the next arrow
  const hx = pose === "loose" ? -3.8 : pose === "reach" ? -4.2 : bx - pull - 0.5;
  const hy = pose === "loose" ? -17.5 : pose === "reach" ? -22 : by - 0.5;
  limb(ctx, -1, -15.5, hx, hy, 2.4, pal.coat);
  ball(ctx, hx, hy, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  ctx.restore();
};

// A crewman working a winch or a wheel: braced stance, both hands on a bar.
export const drawCrew = (ctx, x, y, dir, pal, work = 0) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 1);
  torso(ctx, 0.5 + work, -17, 10, 7.5, pal);
  head(ctx, 1 + work, -20.5, pal, { hood: true });
  const hx = 5.5 + work * 1.5, hy = -13 + work;
  limb(ctx, 2, -15, hx, hy, 2.4, pal.coat);
  limb(ctx, -1, -15.5, hx - 0.5, hy - 1.5, 2.4, pal.coat);
  ball(ctx, hx, hy, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  ball(ctx, hx - 0.5, hy - 1.5, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  ctx.restore();
};

// A gate guard: a stander with a halberd grounded beside him.
export const drawHalberdier = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.3);
  torso(ctx, 0, -17, 10, 7.5, pal);
  // the pole, from the ground to well over the helmet
  cylinder(ctx, 5.2, -34, 1.6, 34, "#6a4a2e", { r: 0.8, hi: 0.3, lo: 0.5 });
  part(ctx, (c) => {
    c.fillStyle = lin(c, 3, 0, 9, 0, [[0, "#d8dce4"], [1, "#8a909c"]]);
    c.beginPath(); c.moveTo(6, -34); c.lineTo(10.5, -30); c.lineTo(6, -25.5); c.closePath(); c.fill();
    c.fillRect(5.3, -37, 1.4, 4);
  });
  limb(ctx, -2.5, -15, -3, -9, 2.4, pal.coat);
  limb(ctx, 2.5, -15, 5.5, -20, 2.4, pal.coat);
  ball(ctx, 5.7, -20.5, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  head(ctx, 0.4, -20.5, pal, { helm: true });
  ctx.restore();
};

// A mason at the wall, trowel up.
export const drawMason = (ctx, x, y, dir, pal, work = 0) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.5);
  torso(ctx, 0, -17, 10, 7.5, pal);
  head(ctx, 0.4, -20.5, pal, { hood: true });
  limb(ctx, -2.5, -15, -4, -9.5, 2.4, pal.coat);
  const hx = 6, hy = -18 - work * 3;
  limb(ctx, 2.5, -15, hx, hy, 2.4, pal.coat);
  ball(ctx, hx, hy, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  part(ctx, (c) => { c.fillStyle = "#b8bcc6"; c.beginPath(); c.moveTo(hx - 1, hy - 1.5); c.lineTo(hx + 5, hy - 3.5); c.lineTo(hx + 3, hy + 0.5); c.closePath(); c.fill(); });
  ctx.restore();
};

export const WALL_FOLK = {
  bowman: { skin: "#e8b990", hood: "#5a4a3a", coat: "#7c3f4a", boots: "#3e2a1a", trim: "#d8b34a" },
  guard: { skin: "#e8b990", hood: "#8a909c", coat: "#7c3f4a", boots: "#2a2a30", trim: "#d8b34a" },
  mason: { skin: "#e8b990", hood: "#c8b898", coat: "#8a7a5a", boots: "#3e2a1a", trim: "#5a4a3a" },
};

// Somebody just standing there, looking about.
export const drawStander = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.2);
  torso(ctx, 0, -17, 10, 7.5, pal);
  limb(ctx, -2.5, -15, -3, -9, 2.4, pal.coat);
  limb(ctx, 2.5, -15, 3.2, -9, 2.4, pal.coat);
  head(ctx, 0.4, -20.5, pal);
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

export { soft };

// ---- the spire's mage and the warden's priest ----------------------------

// A robe: a coat that widens to the hem, no legs showing.
const robe = (ctx, x, top, h, wTop, wHem, col, trim) => part(ctx, (c) => {
  c.beginPath();
  c.moveTo(x - wTop / 2, top);
  c.lineTo(x + wTop / 2, top);
  c.quadraticCurveTo(x + wHem / 2, top + h * 0.6, x + wHem / 2, top + h);
  c.lineTo(x - wHem / 2, top + h);
  c.quadraticCurveTo(x - wHem / 2, top + h * 0.6, x - wTop / 2, top);
  c.closePath();
  c.fillStyle = lin(c, x - wHem / 2, 0, x + wHem / 2, 0, [[0, lighten(col, 0.32)], [0.45, col], [1, darken(col, 0.5)]]);
  c.fill();
  if (trim) { c.fillStyle = trim; c.fillRect(x - wHem / 2 + 0.5, top + h - 1.6, wHem - 1, 1.3); }
});

// The mage: apprentice (bare-handed, small), then a staff-bearer, then the
// long-beard. `level` 1..3. The orb is drawn by the tower, at mageTip().
// o.pose: "charge" (the default — conjuring hand up, staff upright),
// "idle" (staff grounded, hand at rest), "cast" (staff driven forward at
// the foe, the free hand flung out behind it).
export const mageTip = (level, pose = "charge") => {
  const tall = level >= 3;
  if (level < 2) return pose === "cast" ? [8, -17] : pose === "idle" ? [4.5, -12] : [5, -21];
  if (pose === "cast") return [11, -20 - (tall ? 1.5 : 0)];
  return [6.5, -23 - (tall ? 2 : 0)];
};
export const drawMage = (ctx, x, y, dir, pal, level = 3, o = {}) => {
  const pose = o.pose || "charge";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  const tall = level >= 3;
  const lean = pose === "cast" ? 0.8 : 0;
  robe(ctx, 0, -17, 17, 7, tall ? 12 : 10, pal.robe, pal.trim);
  // a sash of the trim colour down the front
  part(ctx, (c) => { c.fillStyle = pal.trim; c.fillRect(1.2, -16.5, 1, 15); });
  const [tx, ty] = mageTip(level, pose);
  // the staff: grounded, upright, or levelled at the foe
  if (level >= 2) {
    part(ctx, (c) => {
      c.strokeStyle = lin(c, tx - 1, 0, tx + 1, 0, [[0, "#8a6a44"], [1, "#4a3420"]]);
      c.lineWidth = 1.6; c.lineCap = "round";
      c.beginPath();
      if (pose === "cast") { c.moveTo(3, -4); c.lineTo(tx - 1, ty + 1.5); }
      else { c.moveTo(tx - 1.5, -0.5); c.lineTo(tx - 0.6, ty + 1.5); }
      c.stroke();
      // the head of the staff: a gilt fork that cups the orb
      c.fillStyle = pal.trim;
      c.fillRect(tx - 2.2, ty + 1, 1, 2); c.fillRect(tx + 0.6, ty + 1, 1, 2); c.fillRect(tx - 2.2, ty + 2.5, 3.8, 1);
    });
  }
  ctx.translate(lean, 0);
  // arms: the staff hand, and the free hand conjuring (or resting)
  const sh = pose === "cast" ? [tx - 4, ty + 3.5] : level >= 2 ? [tx - 1, -13] : pose === "cast" ? [tx - 1, ty] : [5.5, -13];
  const fh = pose === "idle" ? [-3, -9.5] : pose === "cast" ? [-5.5, -15] : [-4.5, -20.5];
  if (level < 2 && pose !== "idle") sh[0] = tx - 1, sh[1] = ty + 0.5;
  limb(ctx, 2, -15, sh[0], sh[1], 2.2, pal.robe);
  limb(ctx, -2, -15, fh[0], fh[1], 2.2, pal.robe);
  ball(ctx, fh[0], fh[1], 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
  ball(ctx, sh[0], sh[1], 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
  // head, beard, hat
  part(ctx, (c) => ball(c, 0.4, -20.5, 3.3, 3.5, pal.skin, { hi: 0.45, lo: 0.4 }));
  if (tall) part(ctx, (c) => { c.beginPath(); c.moveTo(-2.4, -19); c.quadraticCurveTo(0.6, -10, 3.4, -19); c.closePath(); c.fillStyle = pal.beard || "#e8e0d0"; c.fill(); });
  else if (level === 2) part(ctx, (c) => ball(c, 0.6, -18, 2.2, 1.4, pal.beard || "#c8bca8", { hi: 0.3, lo: 0.3 }));
  part(ctx, (c) => {
    // brim, then the point, flopping back
    ball(c, 0.4, -23, 5.2, 1.5, pal.hat, { hi: 0.4, lo: 0.4 });
    c.beginPath(); c.moveTo(-3.4, -23); c.quadraticCurveTo(0, -25, 1.8 + (tall ? 1.5 : 0) - (pose === "cast" ? 2.5 : 0), -33 - (tall ? 2 : 0)); c.quadraticCurveTo(3, -26, 3.8, -23); c.closePath();
    c.fillStyle = lin(c, -3, 0, 4, 0, [[0, lighten(pal.hat, 0.3)], [0.5, pal.hat], [1, darken(pal.hat, 0.45)]]);
    c.fill();
    c.fillStyle = pal.trim; c.fillRect(-3, -24, 6.6, 1);
  });
  ctx.fillStyle = "#2a2230";
  ctx.beginPath(); ctx.ellipse(2, -20.3, 0.55, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};

// The priest: a robe and a mitre, arms raised in blessing or folded.
export const drawPriest = (ctx, x, y, dir, pal, raised = false) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  robe(ctx, 0, -17, 17, 7.5, 12, pal.robe, pal.trim);
  if (raised) {
    limb(ctx, -2.5, -15, -6, -22, 2.2, pal.robe);
    limb(ctx, 2.5, -15, 6, -22, 2.2, pal.robe);
    ball(ctx, -6, -22.5, 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
    ball(ctx, 6, -22.5, 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
  } else {
    limb(ctx, -2.5, -15, -1, -11, 2.2, pal.robe);
    limb(ctx, 2.5, -15, 1, -11, 2.2, pal.robe);
  }
  part(ctx, (c) => ball(c, 0.4, -20.5, 3.3, 3.5, pal.skin, { hi: 0.45, lo: 0.4 }));
  // the mitre: a tall split cap with a gem
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(-3.2, -22.5); c.lineTo(-1.2, -30); c.lineTo(0.6, -27.5); c.lineTo(2.4, -30); c.lineTo(4, -22.5); c.closePath();
    c.fillStyle = lin(c, -3, 0, 4, 0, [[0, lighten(pal.hat, 0.3)], [0.5, pal.hat], [1, darken(pal.hat, 0.45)]]);
    c.fill();
  });
  ball(ctx, 0.5, -25, 0.9, 0.9, pal.gem || "#8ce8f0", { hi: 0.6, lo: 0.2 });
  ctx.fillStyle = "#2a2230";
  ctx.beginPath(); ctx.ellipse(2, -20.3, 0.55, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};

export const MAGE_FOLK = {
  base: { skin: "#e8b990", robe: "#5a4a8c", hat: "#3f3468", trim: "#d8b34a", beard: "#e8e0d0" },
  a: { skin: "#e8b990", robe: "#8a3a2e", hat: "#5a2420", trim: "#e8a040", beard: "#e8e0d0" },
  aa: { skin: "#e8b990", robe: "#7a2a22", hat: "#3a1a18", trim: "#f0b048", beard: "#d8cfc0" },
  ab: { skin: "#e8b990", robe: "#a04a2a", hat: "#6a2c1c", trim: "#f0c060", beard: "#e8e0d0" },
  b: { skin: "#e8b990", robe: "#2e4a7a", hat: "#1f3252", trim: "#8ce8f0", beard: "#e8e0d0" },
  ba: { skin: "#e8b990", robe: "#24406e", hat: "#182a48", trim: "#a8f0f8", beard: "#e8e0d0" },
  bb: { skin: "#e8b990", robe: "#3a3a80", hat: "#22224e", trim: "#f0e070", beard: "#e8e0d0" },
};
export const PRIEST_FOLK = {
  base: { skin: "#e8b990", robe: "#d8d0bc", hat: "#e8e2d0", trim: "#7cb8c8", gem: "#8ce8f0" },
  a: { skin: "#e8b990", robe: "#c8dce4", hat: "#e8f2f6", trim: "#5aa8c0", gem: "#8ce8f0" },
  aa: { skin: "#d8e0e8", robe: "#b8d4e0", hat: "#eef8fc", trim: "#3a90b0", gem: "#b8f0f8" },
  ab: { skin: "#e8b990", robe: "#a8c8d4", hat: "#e0eef4", trim: "#4a90a8", gem: "#c8ecf4" },
  b: { skin: "#e8b990", robe: "#e0d8b8", hat: "#f0e8c8", trim: "#7cb864", gem: "#8ce08c" },
  ba: { skin: "#e8b990", robe: "#e8dcb0", hat: "#f4ecc8", trim: "#d8b34a", gem: "#e8d47a" },
  bb: { skin: "#e8b990", robe: "#e8e0c0", hat: "#f8f2d8", trim: "#d8b34a", gem: "#f0d060" },
};

// ---- more crews ------------------------------------------------------------

// A smith at the anvil: hammer up (swing 1) or down (swing 0).
export const drawSmith = (ctx, x, y, dir, pal, swing = 0) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.8);
  torso(ctx, 0, -17, 10, 8, pal);
  // leather apron
  part(ctx, (c) => { c.fillStyle = darken(pal.trim || "#6a4a2e", 0.1); roundRect(c, -3, -15, 6, 8, 1.5); c.fill(); });
  head(ctx, 0.4, -20.5, pal, { hood: false });
  part(ctx, (c) => ball(c, 0.2, -22.5, 3.6, 1.6, pal.hood, { hi: 0.4, lo: 0.4 }));   // a flat cap
  const hx = swing > 0.5 ? 3 : 6.5, hy = swing > 0.5 ? -26 : -12;
  limb(ctx, 2, -15, hx, hy, 2.4, pal.coat);
  limb(ctx, -1.5, -15, 4.5, -12, 2.4, pal.coat);
  // the hammer
  part(ctx, (c) => {
    c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.4; c.lineCap = "round";
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + (swing > 0.5 ? 3 : 4), hy + (swing > 0.5 ? -4 : -1)); c.stroke();
    c.fillStyle = "#6c727e"; roundRect(c, hx + (swing > 0.5 ? 1.5 : 2.5), hy + (swing > 0.5 ? -6.5 : -3.5), 4, 3, 0.8); c.fill();
  });
  ball(ctx, hx, hy, 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
  ctx.restore();
};

// A hooded figure standing still, arms folded — the covert's blade on watch.
export const drawHooded = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.1);
  torso(ctx, 0, -17, 10, 7.5, pal);
  limb(ctx, -3, -14, 2.5, -11, 2.2, pal.coat);
  limb(ctx, 3, -14, -2.5, -11, 2.2, pal.coat);
  // a deep hood: the face is a hollow
  part(ctx, (c) => {
    ball(c, 0.2, -21, 3.8, 4.2, pal.hood, { hi: 0.35, lo: 0.5 });
    c.fillStyle = "#1a1420";
    c.beginPath(); c.ellipse(1.4, -20.6, 2, 2.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = pal.skin; c.fillRect(0.8, -18.6, 1.6, 0.9);   // a chin, nothing more
  });
  ctx.restore();
};

// The falcon-mistress: gauntlet raised to the wheel of birds.
export const drawMistress = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.3);
  torso(ctx, 0, -17, 10, 7.5, pal);
  limb(ctx, -2.5, -15, -3, -9, 2.2, pal.coat);
  limb(ctx, 2.5, -15, 8, -21, 2.2, pal.coat);
  part(ctx, (c) => { c.fillStyle = "#6a4a2e"; roundRect(c, 6.5, -23.5, 4, 3.5, 1); c.fill(); });   // the gauntlet
  head(ctx, 0.4, -20.5, pal);
  ctx.restore();
};

// The bombardier, a lit charge in his hands, raised to throw or held low.
export const drawBomber = (ctx, x, y, dir, pal, throwing = false) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.7);
  torso(ctx, 0, -17, 10, 8, pal);
  head(ctx, 0.4, -20.5, pal, { hood: false });
  part(ctx, (c) => ball(c, 0.2, -22.8, 3.4, 1.4, pal.hood, { hi: 0.3, lo: 0.4 }));
  const bx = throwing ? 5 : 5.5, by = throwing ? -24 : -12;
  limb(ctx, 2, -15, bx - 1, by + 1, 2.4, pal.coat);
  limb(ctx, -1.5, -15, bx - 2, by + 2, 2.4, pal.coat);
  part(ctx, (c) => ball(c, bx + 0.5, by - 1, 2.6, 2.6, "#2e2e36", { hi: 0.45, lo: 0.4 }));
  ctx.restore();
};

// The musketeer: braced, long gun out, a wide hat because he must stand still.
export const drawMusketeer = (ctx, x, y, dir, pal, kick = 0) => {
  ctx.save();
  ctx.translate(x - kick, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 1.2);
  torso(ctx, 0, -17, 10, 7.5, pal);
  head(ctx, 0.4, -20.5, pal, { hood: false });
  part(ctx, (c) => { ball(c, 0.2, -22.6, 5.2, 1.5, pal.hood, { hi: 0.35, lo: 0.4 }); ball(c, 0.2, -24, 2.8, 2, pal.hood, { hi: 0.35, lo: 0.4 }); });
  // the gun, barrel out front
  part(ctx, (c) => {
    c.strokeStyle = "#5f4326"; c.lineWidth = 2.2; c.lineCap = "round";
    c.beginPath(); c.moveTo(-1, -12.5); c.lineTo(4, -15); c.stroke();
    c.strokeStyle = "#6c727e"; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(3, -15); c.lineTo(13, -16.5); c.stroke();
  });
  limb(ctx, 2, -15, 6, -15, 2.2, pal.coat);
  limb(ctx, -1.5, -15, 1.5, -13, 2.2, pal.coat);
  ctx.restore();
};

export const CREW_FOLK = {
  engineer: { skin: "#e8b990", hood: "#7a5a34", coat: "#6e4c28", boots: "#3e2a1a", trim: "#4a3018" },
  smith: { skin: "#e8b990", hood: "#4a3a2e", coat: "#5a4a3c", boots: "#2e2420", trim: "#6a4a2e" },
  clerk: { skin: "#e8b990", hood: "#3a4a6a", coat: "#4a5a7a", boots: "#2a2a30", trim: "#d8b34a" },
  blade: { skin: "#e8b990", hood: "#2a2434", coat: "#3a3244", boots: "#1e1a26", trim: "#6a5a80" },
  bladeGuild: { skin: "#e8b990", hood: "#2e3a2a", coat: "#3a4a34", boots: "#1e241c", trim: "#8a6aa8" },
  mistress: { skin: "#e8b990", hood: "#7a3c30", coat: "#8a5a3a", boots: "#3e2a1a", trim: "#d8b34a" },
  mistressCourt: { skin: "#e8b990", hood: "#3a3468", coat: "#5a4a8c", boots: "#2a2a30", trim: "#d8b34a" },
  bomber: { skin: "#e8b990", hood: "#3a3028", coat: "#5a4a3c", boots: "#2e2420", trim: "#3a3028" },
  musketeer: { skin: "#e8b990", hood: "#2c2a36", coat: "#3a4a6a", boots: "#2a2a30", trim: "#c8b070" },
};
