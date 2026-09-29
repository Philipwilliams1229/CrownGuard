// ============ FOLK: THE WORKERS ============
// The winch and wheel crew (catapult, bladewheel, siege bow), the smith, the
// castle's halberdier and mason, and the standers (clerk, river watch).
// Built from folk-kit.js; folk.js re-exports it.
//
// Every worker bends at the HIPS: `hip` [dx, dy] moves the pelvis off the
// planted feet (legs() solves the knees) and `lean` turns the torso, head and
// shoulders about it (radians, + forward). Arms are drawn in the figure's own
// frame from the turned shoulders, so a hand lands exactly where the hall
// needs it (the crank handle, the iron, the block) and arm() keeps the bones
// their length. Each action is a handful of baked frames: the hall picks one
// from a phase (see the *_FRAMES exports and "Joints and motion" in
// art/STYLE-GUIDE.md).

import { lighten, darken, rgba, shadow, roundRect, cylinder, lin, part } from "./paint.js";
import { head, torso, legs, hand, arm, cap, elbowFor, blob, at } from "./folk-kit.js";

// ---- the upper body on the hips ---------------------------------------------
const HIP_Y = -7.8;
// where a point of the upright upper body lands once the hips shift and it leans
const turn = (p, hip, lean, lift = 0) => {
  const c = Math.cos(lean), s = Math.sin(lean), dx = p[0], dy = p[1] - lift - HIP_Y;
  return [hip[0] + dx * c - dy * s, HIP_Y + hip[1] + dx * s + dy * c];
};
// paint the upright upper body (torso, head) turned the same way; `lift`
// raises it a hair (a breath)
const upper = (ctx, hip, lean, lift, fn) => {
  ctx.save();
  ctx.translate(hip[0], HIP_Y + hip[1]); ctx.rotate(lean); ctx.translate(0, -HIP_Y - lift);
  fn();
  ctx.restore();
};
// the head nodding about the neck (+ chin down, - looking up)
const nod = (ctx, nx, ny, tilt, fn) => {
  if (!tilt) { fn(); return; }
  ctx.save(); ctx.translate(nx, ny); ctx.rotate(tilt); ctx.translate(-nx, -ny); fn(); ctx.restore();
};
const nodPt = (p, nx, ny, tilt) => {
  const c = Math.cos(tilt), s = Math.sin(tilt), dx = p[0] - nx, dy = p[1] - ny;
  return [nx + dx * c - dy * s, ny + dx * s + dy * c];
};
const R2D = 180 / Math.PI, D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- headwear ------------------------------------------------------------------
// Each crew says its trade by what is on its head, and none of it is the
// archer's peaked cowl (folk-kit HOOD): the winch crew's leather cap with
// brass goggles pushed up on it, the clerk's velvet beret with a quill, the
// river watchman's steel kettle hat over a padded coif. They are drawn in
// the head's own units (k = 1.08 about (x, y - 0.3), as head() is), in the
// palette's `hood` colour so each form's palette still varies them, and
// always inside the caller's nod(), so they ride the head through every
// frame. Faces stay open: eye, nose and jaw show.
const HK = 1.08;
const inHead = (pts, x, y) => at(pts, x, y - 0.3, HK);
// the winch and wheel crew: a snug leather cap with its ear flap down to
// the jaw and tied under the chin, and the engineer's brass goggles pushed
// up on the brow, their strap round the crown; his hair shows at the nape
const ARMING_CAP = [[-2.55, -0.45, 1], [-2.75, -1.7], [-2.4, -2.9], [-1.1, -3.65], [0.6, -3.7], [1.8, -3.2], [2.4, -2.4], [2.45, -1.85, 1], [0.35, -1.55, 1], [0.15, 0.1], [0.0, 1.45, 1], [-0.8, 1.85, 1], [-1.55, 1.3, 1], [-1.65, -0.45, 1]];
const BRASS = "#d8b34a";
export const engineerHead = (ctx, x, y, pal) => {
  const col = pal.hood, hy = y - 0.3, P = (px, py) => [x + px * HK, hy + py * HK];
  head(ctx, x, y, { ...pal, hair: pal.hair || darken(pal.boots || col, 0.05) }, { hood: false });
  blob(ctx, inHead(ARMING_CAP, x, y), col, {
    hi: 0.3, lo: 0.4, then: (c) => {
      c.lineCap = "round"; c.lineJoin = "round";
      c.strokeStyle = lighten(col, 0.3); c.lineWidth = 0.9;                        // the rolled rim along the brow and round the back
      c.beginPath(); c.moveTo(...P(2.45, -1.85)); c.lineTo(...P(0.35, -1.55)); c.stroke();
      c.beginPath(); c.moveTo(...P(-1.65, -0.45)); c.lineTo(...P(-2.6, -0.45)); c.stroke();
      c.strokeStyle = darken(col, 0.35); c.lineWidth = 0.45;                       // a stitch down the ear flap
      c.beginPath(); c.moveTo(...P(-0.9, -1.0)); c.lineTo(...P(-0.85, 1.4)); c.stroke();
      c.strokeStyle = darken(col, 0.55); c.lineWidth = 0.75;                       // the goggles' strap round the crown
      c.beginPath(); c.moveTo(...P(1.9, -2.9)); c.quadraticCurveTo(...P(-0.4, -3.3), ...P(-2.8, -1.9)); c.stroke();
    },
  });
  // the goggles, a brass-rimmed lens on the front of the crown
  part(ctx, (c) => {
    const [gx, gy] = P(1.75, -2.95);
    c.fillStyle = BRASS; c.beginPath(); c.ellipse(gx, gy, 1.0, 0.95, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#2e3a48"; c.beginPath(); c.ellipse(gx + 0.1, gy + 0.05, 0.5, 0.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#bfe6f0"; c.fillRect(gx - 0.25, gy - 0.35, 0.45, 0.45);
  });
  // the chin strap, painted on the jaw (no ink of its own)
  const [a0, a1] = P(-0.2, 1.4), [b0, b1] = P(1.3, 2.0);
  ctx.save();
  ctx.strokeStyle = darken(col, 0.3); ctx.lineWidth = 0.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
  ctx.restore();
};
// the Goldworks clerk: a soft velvet beret on a gold band, its crown
// slumped over the back of the head, a white quill tucked in the band
const BERET = [[2.35, -1.75, 1], [2.65, -2.8], [1.7, -3.95], [-0.5, -4.5], [-2.8, -4.3], [-4.35, -3.45], [-4.3, -2.5], [-3.2, -2.15], [-2.3, -1.75, 1]];
export const clerkHead = (ctx, x, y, pal) => {
  const col = pal.hood, hy = y - 0.3, P = (px, py) => [x + px * HK, hy + py * HK];
  head(ctx, x, y, { ...pal, hair: pal.hair || "#6a4a30" }, { hood: false });
  blob(ctx, inHead(BERET, x, y), col, {
    hi: 0.38, lo: 0.45, then: (c) => {
      c.fillStyle = pal.trim || "#d8b34a";                                         // the band
      c.beginPath(); c.moveTo(...P(2.5, -1.7)); c.lineTo(...P(2.45, -2.2)); c.lineTo(...P(-2.4, -2.25)); c.lineTo(...P(-2.4, -1.6)); c.closePath(); c.fill();
      c.strokeStyle = lighten(col, 0.5); c.lineWidth = 0.5;                        // the sheen on the velvet's puff
      c.beginPath(); c.moveTo(...P(1.5, -3.5)); c.quadraticCurveTo(...P(-0.4, -4.1), ...P(-2.6, -3.8)); c.stroke();
      c.strokeStyle = darken(col, 0.4); c.lineWidth = 0.45;                        // the fold where it slumps over the back
      c.beginPath(); c.moveTo(...P(-1.2, -2.5)); c.quadraticCurveTo(...P(-2.6, -2.7), ...P(-3.8, -2.6)); c.stroke();
    },
  });
  // the quill, tucked in the band and raked back over the crown (it stays
  // under y-26 from the feet, inside the halls' 30-high bakes, even on a breath)
  part(ctx, (c) => {
    c.lineCap = "round";
    c.strokeStyle = "#f4ecd8"; c.lineWidth = 0.95;
    c.beginPath(); c.moveTo(...P(-0.9, -2.2)); c.quadraticCurveTo(...P(-2.4, -4.3), ...P(-4.4, -4.75)); c.stroke();
    c.strokeStyle = "#b8ac98"; c.lineWidth = 0.4;
    c.beginPath(); c.moveTo(...P(-1.3, -2.6)); c.quadraticCurveTo(...P(-2.5, -4.0), ...P(-4.0, -4.45)); c.stroke();
  });
};
// the river watch: a steel kettle hat, its broad brim tipped down all
// round, over a padded coif in the watch's colour that hides ears and nape
const STEEL = "#b4bac6";
const COIF = [[-2.3, 1.9, 1], [-2.7, 0.2], [-2.5, -1.8], [0.6, -2.0], [0.35, -0.4], [0.25, 1.3], [-0.3, 2.1, 1]];
const KETTLE_DOME = [[-2.25, -1.9, 1], [-2.2, -3.1], [-1.1, -4.3], [0.9, -4.3], [2.1, -3.2], [2.3, -1.9, 1]];
const KETTLE_BRIM = [[-4.3, -1.25, 1], [-3.0, -2.35], [3.2, -2.35], [4.7, -1.3, 1], [3.1, -1.55], [-2.9, -1.55]];
export const watchHead = (ctx, x, y, pal) => {
  const hy = y - 0.3, P = (px, py) => [x + px * HK, hy + py * HK];
  head(ctx, x, y, pal, { hood: false });
  blob(ctx, inHead(COIF, x, y), pal.hood, {
    hi: 0.3, lo: 0.4, then: (c) => {
      c.strokeStyle = darken(pal.hood, 0.35); c.lineWidth = 0.4;                   // quilting
      for (const qx of [-1.9, -0.9]) { c.beginPath(); c.moveTo(...P(qx, -1.6)); c.lineTo(...P(qx + 0.1, 1.8)); c.stroke(); }
    },
  });
  blob(ctx, inHead(KETTLE_DOME, x, y), STEEL, {
    hi: 0.45, lo: 0.5, then: (c) => {
      c.fillStyle = pal.trim || "#c8b070"; c.fillRect(...P(-2.4, -2.45), 4.9 * HK, 0.55);   // the band of rivets
      c.fillStyle = "#fff3d2"; c.fillRect(...P(-0.9, -3.9), 0.6, 0.6);           // the glint on the crown
    },
  });
  blob(ctx, inHead(KETTLE_BRIM, x, y), darken(STEEL, 0.08), {
    hi: 0.5, lo: 0.55, then: (c) => { c.fillStyle = darken(STEEL, 0.5); c.fillRect(...P(-4.4, -1.75), 9.2 * HK, 0.6); },   // its shaded underside
  });
};

// ---- the winch and wheel crew ---------------------------------------------
// A crewman at a crank. The handle turns on a circle (or, for a crank laid
// flat, an ellipse) round `hub`; both hands ride it, and the body works the
// stroke from the hips: it drives forward over the top, hangs back as the
// handle comes round underneath and home, the feet planted.
//   o.phase  0..1 round the crank, 0 = the handle at the top (the hall picks
//            one of CREW_FRAMES from its clock: frameOf(p, CREW_FRAMES) / n)
//   o.hub    [x, y] the crank's axle in the figure's frame (facing +x)
//   o.rx/ry  the handle's throw (ry < rx: a crank turning flat)
//   o.drive  how hard the body works the stroke (1)
//   o.push   a bar pushed round a post rather than a crank hauled: he leans
//            into it instead of hanging back
//   o.pose   "rest" (hands on the still handle), "breath", "glance", "heave"
//            (hanging back on a lever), "tap"
//            (the near fist lifted to rap a peg), "rap" (on it: o.peg, or the
//            drum's top-front, hub + [1.4, -1.8])
// Without o.phase the old `work` (-0.6..0.6) rocks the handle over the top,
// back to front, as the siege bow's crew does.
export const CREW_FRAMES = 6;
export const crankAt = (hub, rx, ry, p) => {
  const a = -Math.PI / 2 + p * 2 * Math.PI;
  return [hub[0] + Math.cos(a) * rx, hub[1] + Math.sin(a) * ry];
};
const CREW_SH_N = [1.9, -15.4], CREW_SH_F = [-0.3, -15.8];
export const drawCrew = (ctx, x, y, dir, pal, work = 0, o = {}) => {
  const hub = o.hub || [5.4, -13.4];
  const rx = o.rx ?? 1.5, ry = o.ry ?? rx, drive = o.drive ?? 1;
  // a winch is hauled from a braced stance, hanging back; a bar is pushed,
  // leaning into it (o.push)
  const lean0 = o.push ? 0.06 : -0.11, hip0 = o.push ? [0.25, 0.4] : [-0.7, 0.35];
  const pose = o.pose || "crank";
  let a;
  if (o.phase != null) a = -Math.PI / 2 + o.phase * 2 * Math.PI;
  else a = Math.PI + ((clamp(work, -0.6, 0.6) + 0.6) / 1.2) * Math.PI;
  let hN = [hub[0] + Math.cos(a) * rx, hub[1] + Math.sin(a) * ry];
  // the body leads the handle a little: it is what drives it
  const fwd = Math.cos(a + 0.45);
  let hip = [hip0[0] + 0.55 * fwd * drive, hip0[1] - 0.2 * fwd * drive];
  let lean = lean0 + 0.1 * fwd * drive, lift = 0, tilt = 0.04 * fwd * drive + (o.push ? 0.06 : 0);
  if (pose !== "crank") {
    // at ease: hands on the handle where it stopped, weight settled back
    hip = [-0.45, 0.2]; lean = -0.06; tilt = 0;
    if (pose === "breath") { lift = 0.5; lean = -0.08; tilt = -0.04; }
    if (pose === "glance") { tilt = -0.2; lean = -0.07; hip = [-0.55, 0.25]; }
    if (pose === "tap" || pose === "rap") { lean = 0.02; hip = [-0.2, 0.3]; }
    if (pose === "heave") { lean = -0.22; hip = [-1.1, 0.55]; tilt = -0.06; }
  }
  // the far hand beside the near one on the handle
  let hF = [hN[0] - 0.5, hN[1] - 0.45];
  if (pose === "tap") hN = [hub[0] + 3.0, hub[1] - 4.0];   // cocked before his chest, clear of his chin
  if (pose === "rap") hN = o.peg || [hub[0] + 1.4, hub[1] - 1.8];
  const sN = turn(CREW_SH_N, hip, lean, lift), sF = turn(CREW_SH_F, hip, lean, lift);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  arm(ctx, sF[0], sF[1], hF[0], hF[1], pal, { col: darken(pal.coat, 0.18) });   // the far arm, behind him
  legs(ctx, 0, 0, pal, 1, { hip });
  upper(ctx, hip, lean, lift, () => {
    torso(ctx, 0.3, -17, 10, 7.5, pal);
    nod(ctx, 0.6, -17.6, tilt, () => engineerHead(ctx, 0.8, -20.5, pal));   // the leather arming cap
  });
  arm(ctx, sN[0], sN[1], hN[0], hN[1], pal);
  ctx.restore();
};

// ---- the gate guard -----------------------------------------------------------
// A stander with a halberd, its butt grounded beside his boot.
//   o.frame  at ease: 0 at rest, 1 a breath, 2 a look out (HALBERD_FRAMES)
//   o.walk   0..3 a pacing step (contact, passing, contact, passing), the
//            halberd carried just off the ground
export const HALBERD_FRAMES = 3, HALBERD_WALK = 4;
const pole = (ctx, px, foot, sway) => {
  const top = foot - 34;
  ctx.save();
  ctx.translate(px + 0.8, foot); ctx.rotate(sway); ctx.translate(-px - 0.8, -foot);
  cylinder(ctx, px, top, 1.6, 34, "#6a4a2e", { r: 0.8, hi: 0.3, lo: 0.5 });
  part(ctx, (c) => {
    c.fillStyle = lin(c, px - 2, 0, px + 4, 0, [[0, "#d8dce4"], [1, "#8a909c"]]);
    c.beginPath(); c.moveTo(px + 0.8, top); c.lineTo(px + 5.3, top + 4); c.lineTo(px + 0.8, top + 8.5); c.closePath(); c.fill();
    c.fillRect(px + 0.1, top - 3, 1.4, 4);
  });
  ctx.restore();
};
export const drawHalberdier = (ctx, x, y, dir, pal, o = {}) => {
  const w = o.walk;
  const walking = w != null;
  const fr = walking ? 0 : (o.frame || 0);
  const k = walking ? ((w % 4) + 4) % 4 : 0;
  // a step: [stride (legs() keeps near foot ahead for +, far foot ahead at -2), hip drop]
  const stride = walking ? [1, -0.5, -2, -0.5][k] : 0.3;
  const hip = walking ? [0.25, [0.45, 0, 0.45, 0][k]] : [0, fr === 1 ? 0 : 0.1];
  const lean = walking ? 0.05 : fr === 1 ? -0.02 : 0;
  const lift = !walking && fr === 1 ? 0.5 : 0;
  const tilt = !walking && fr === 2 ? -0.16 : 0;
  const sN = turn([2.2, -15.6], hip, lean, lift), sF = turn([-2.2, -15.6], hip, lean, lift);
  // the far arm swings with the near leg (against its own side's stride)
  const swing = walking ? [1, 0, -1, 0][k] : 0;
  const hF = [sF[0] + 0.5 + swing * 2.2, sF[1] + 8.6 - Math.abs(swing) * 0.5];
  // the pole: grounded at rest, carried a hand off the ground on the march
  const px = 5.2 + (walking ? 0.3 : 0), foot = walking ? -1.4 - (k % 2 ? 0.4 : 0) : 0;
  const sway = walking ? [0.03, 0, -0.03, 0][k] : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, stride, { hip });
  upper(ctx, hip, lean, lift, () => torso(ctx, 0, -17, 10, 7.5, pal));
  pole(ctx, px, foot, sway);
  arm(ctx, sF[0], sF[1], hF[0], hF[1], pal, { col: darken(pal.coat, 0.12) });
  upper(ctx, hip, lean, lift, () => nod(ctx, 0.3, -17.6, tilt, () => head(ctx, 0.4, -20.5, pal, { helm: true })));
  // the grip on the haft, at the height of his chin
  const gy = foot - 19.6 + (walking ? 0.8 : 0) + lift * 0.5;
  arm(ctx, sN[0], sN[1], px + 0.6 + Math.sin(sway) * 19.6, gy, pal);
  ctx.restore();
};

// ---- the mason ----------------------------------------------------------------
// A mason at a block on a trestle in front of him (its top at y-12, from x+6
// out), his hawk of mortar in the far hand. `work` is the frame, 0..5 of
// MASON_FRAMES: lay the trowel on the block, draw it along, lift it off,
// scoop from the hawk, carry it over, set it down again. (0 and 1 alone —
// the old two-frame toggle — read as spreading back and forth.)
export const MASON_FRAMES = 6;
const MASON_KEYS = [
  { hip: [0.35, 0.45], lean: 0.14, hand: [7.4, -13.7], ang: 0.08, tilt: 0.12 },   // lay
  { hip: [0.6, 0.55], lean: 0.2, hand: [10.0, -13.5], ang: 0.02, tilt: 0.14 },   // draw along
  { hip: [0.3, 0.3], lean: 0.1, hand: [8.4, -16.0], ang: -0.35, tilt: 0.06 },     // lift off
  { hip: [0.05, 0.2], lean: 0.04, hand: [6.2, -17.0], ang: 0.15, back: true, tilt: 0.1 },   // scoop from the hawk
  { hip: [0.1, 0.15], lean: 0.02, hand: [6.4, -17.4], ang: -0.2, tilt: 0.02 },    // carry
  { hip: [0.25, 0.35], lean: 0.1, hand: [8.0, -15.0], ang: 0.1, tilt: 0.08 },     // set down
];
const trowel = (ctx, hx, hy, ang, back) => part(ctx, (c) => {
  // a pointing trowel: the handle rises from the heel into the fist, the
  // blade runs on ahead under it (back: the wrist turned, drawing it home)
  c.save(); c.translate(hx, hy); if (back) c.scale(-1, 1); c.rotate(ang);
  c.fillStyle = "#5a4030"; c.fillRect(-0.3, -0.2, 0.9, 1.6);
  c.fillStyle = lin(c, 0, 1, 0, 2.6, [[0, "#d8dce4"], [1, "#8a909c"]]);
  c.beginPath(); c.moveTo(-0.6, 1.3); c.lineTo(4.8, 1.7); c.lineTo(-0.2, 2.6); c.closePath(); c.fill();
  c.restore();
});
export const drawMason = (ctx, x, y, dir, pal, work = 0) => {
  const K = MASON_KEYS[((Math.round(work) % MASON_FRAMES) + MASON_FRAMES) % MASON_FRAMES];
  const { hip, lean, tilt } = K;
  const sN = turn([2.2, -15.6], hip, lean), sF = turn([-2.2, -15.6], hip, lean);
  const hk = [3.3, -12.4];   // the hawk's fist stays put: he works to it
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.5, { hip });
  upper(ctx, hip, lean, 0, () => {
    torso(ctx, 0, -17, 10, 7.5, pal);
    nod(ctx, 0.3, -17.6, tilt, () => head(ctx, 0.4, -20.5, pal, { hood: true }));
  });
  // the far hand holds the hawk, a board of mortar, before his belly
  arm(ctx, sF[0], sF[1], hk[0], hk[1], pal, { col: darken(pal.coat, 0.18) });
  part(ctx, (c) => {
    c.fillStyle = "#6a4a2e"; c.fillRect(hk[0] - 0.4, hk[1] - 1.6, 0.8, 1.4);
    c.fillStyle = "#8a6a40"; c.fillRect(hk[0] - 2.0, hk[1] - 2.2, 4.2, 0.8);
    c.fillStyle = "#d8d0c0"; c.beginPath(); c.ellipse(hk[0] + 0.2, hk[1] - 2.3, 1.5, 0.7, 0, Math.PI, 0); c.fill();
  });
  arm(ctx, sN[0], sN[1], K.hand[0], K.hand[1], pal, { hand: false });
  trowel(ctx, K.hand[0], K.hand[1], K.ang, K.back);
  hand(ctx, K.hand[0], K.hand[1], pal.skin);
  ctx.restore();
};

export const WALL_FOLK = {
  bowman: { skin: "#e8b990", hood: "#5a4a3a", coat: "#7c3f4a", boots: "#3e2a1a", trim: "#d8b34a" },
  guard: { skin: "#e8b990", hood: "#8a909c", coat: "#7c3f4a", boots: "#2a2a30", trim: "#d8b34a" },
  mason: { skin: "#e8b990", hood: "#c8b898", coat: "#8a7a5a", boots: "#3e2a1a", trim: "#5a4a3a" },
};

// ---- the standers ---------------------------------------------------------------
// Somebody just standing there, looking about: the near hand resting at his
// belt (under the clerk's ledger), the far arm easy at his side.
//   o.frame  at ease, STANDER_FRAMES: 0 at rest, 1 a breath, 2 the weight on
//            the back foot, 3 a glance up and out. A hall picks one slowly,
//            phased by t.id, so neighbours never breathe together.
//   o.glass  the river watch's spyglass: 1 coming up (at the chest), 2 at
//            the eye, 3 at the eye and sweeping up the far bank
//   o.hat    "beret" (the Goldworks clerk) or "kettle" (the river watch); by
//            default a watchman (called with o.glass) gets the kettle hat
export const STANDER_FRAMES = 4;
const STAND_KEYS = [
  { hip: [0, 0.1], lean: 0, lift: 0, tilt: 0 },
  { hip: [0, 0.1], lean: -0.03, lift: 0.5, tilt: -0.05 },
  { hip: [-0.55, 0.3], lean: 0.05, lift: 0, tilt: 0.03 },
  { hip: [0.1, 0.1], lean: -0.02, lift: 0.2, tilt: -0.2 },
];
const spyglass = (ctx, e, f) => part(ctx, (c) => {
  c.lineCap = "round";
  c.strokeStyle = "#241a26"; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(f[0], f[1]); c.stroke();
  const m = [e[0] + (f[0] - e[0]) * 0.45, e[1] + (f[1] - e[1]) * 0.45];
  c.strokeStyle = "#a88438"; c.lineWidth = 1.1;
  c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(m[0], m[1]); c.stroke();
  c.strokeStyle = "#c8a048"; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(m[0], m[1]); c.lineTo(f[0], f[1]); c.stroke();
  c.fillStyle = "#fff3d2"; c.fillRect(f[0] - 0.5, f[1] - 0.6, 0.8, 0.8);
});
export const drawStander = (ctx, x, y, dir, pal, o = {}) => {
  const glass = o.glass || 0;
  const K = STAND_KEYS[glass ? (glass === 3 ? 3 : 0) : ((o.frame || 0) % STANDER_FRAMES)];
  let { hip, lean, lift, tilt } = K;
  if (glass === 3) tilt = -0.1;
  const sN = turn([2.3, -15.6], hip, lean, lift), sF = turn([-2.4, -15.6], hip, lean, lift);
  // the eye (in the head's frame), for the glass
  const neck = [0.3, -17.6];
  const eyeUp = [1.9, -21.6];
  let hN, hF, e, f;
  if (glass >= 2) {
    e = turn(nodPt(eyeUp, neck[0], neck[1], tilt), hip, lean, lift);
    const up = glass === 3 ? -0.14 : -0.03;
    f = [e[0] + Math.cos(up) * 6.2, e[1] + Math.sin(up) * 6.2];
    hN = [e[0] + (f[0] - e[0]) * 0.72, e[1] + (f[1] - e[1]) * 0.72 + 1.1];   // under the far end
    hF = [e[0] + (f[0] - e[0]) * 0.3, e[1] + (f[1] - e[1]) * 0.3 + 1.0];     // steadying it by the eye
  } else if (glass === 1) {
    hN = [sN[0] + 2.6, sN[1] + 2.4]; hF = [sN[0] + 1.2, sN[1] + 2.8];
    e = [hF[0] - 0.4, hF[1] - 1.2]; f = [e[0] + 5.2, e[1] - 2.4];
  } else {
    hN = [sN[0] + 1.6, sN[1] + 5.4];                // resting at his belt
    hF = [sF[0] + 0.7, sF[1] + 8.6];                // easy at his side
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  if (!glass) arm(ctx, sF[0], sF[1], hF[0], hF[1], pal, { col: darken(pal.coat, 0.14) });
  legs(ctx, 0, 0, pal, 0.2, { hip });
  upper(ctx, hip, lean, lift, () => torso(ctx, 0, -17, 10, 7.5, pal));
  if (!glass) arm(ctx, sN[0], sN[1], hN[0], hN[1], pal);
  const hat = o.hat || ("glass" in o ? "kettle" : "beret");
  upper(ctx, hip, lean, lift, () => nod(ctx, neck[0], neck[1], tilt, () => (hat === "kettle" ? watchHead : clerkHead)(ctx, 0.4, -20.5, pal)));
  if (glass) {
    arm(ctx, sF[0], sF[1], hF[0], hF[1], pal, { col: darken(pal.coat, 0.14), hand: false });
    spyglass(ctx, e, f);
    hand(ctx, hF[0], hF[1], pal.skin);
    arm(ctx, sN[0], sN[1], hN[0], hN[1], pal);
  }
  ctx.restore();
};

// ---- the smith ------------------------------------------------------------------
// A smith at the anvil: a hammer blow in SMITH_FRAMES baked frames — lift
// (weight going back), top (the hammer cocked behind his head: hold it),
// strike (fast, the body dropping in, a smear on the arc), impact (sparks go
// on THIS frame), rebound (the hammer bounces off the iron), settle. The far
// hand keeps the tongs on the iron the whole time. The haft crosses his fist
// (`wrist`: degrees off the forearm's line, 90 square, less as he snaps it
// down onto the iron). The iron lies on the anvil at x+7..x+11, y-12.2, from
// his feet; the hammer's face lands at about (9.8, -12.4).
//   swing   the old call: 1 hammer up (top), 0 down (impact)
//   o.frame the frame, 0..5 (SMITH_IMPACT is the one that strikes)
export const SMITH_FRAMES = 6, SMITH_IMPACT = 3;
const HAFT = 3.3;
const SMITH_KEYS = [
  { hip: [-0.25, 0.2], lean: -0.05, hand: [6.0, -20.2], wrist: 12, tilt: -0.06 },               // lift
  { hip: [-0.55, 0.15], lean: -0.13, hand: [4.5, -23.2], wrist: 42, tilt: -0.12 },              // top: high, ahead of his face
  { hip: [0.05, 0.35], lean: 0.04, hand: [8.6, -15.6], wrist: 58, tilt: 0.04, smear: true },    // strike
  { hip: [0.2, 0.7], lean: 0.06, hand: [7.1, -12.1], wrist: 22, tilt: 0.1 },                    // impact
  { hip: [0.15, 0.5], lean: 0.05, hand: [7.0, -13.4], wrist: 30, tilt: 0.06 },                  // rebound
  { hip: [0.05, 0.35], lean: 0.03, hand: [7.0, -12.4], wrist: 22, tilt: 0.05 },                  // settle: resting on the iron
];
// the frame's hammer: the fist, the elbow the arm will solve, the haft's angle
export const smithHammer = (frame) => {
  const K = SMITH_KEYS[frame];
  const s = turn([1.8, -15.6], K.hip, K.lean);
  const el = elbowFor(s[0], s[1], K.hand[0], K.hand[1]);
  const fore = Math.atan2(K.hand[1] - el[1], K.hand[0] - el[0]);
  const ang = fore - K.wrist * D2R;   // the thumb side: the head rides ahead of the fist
  return { s, el, hand: K.hand, ang, wrist: K.wrist, head: [K.hand[0] + Math.cos(ang) * HAFT, K.hand[1] + Math.sin(ang) * HAFT] };
};
const hammer = (ctx, hx, hy, ang) => part(ctx, (c) => {
  c.save(); c.translate(hx, hy); c.rotate(ang);
  c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.3; c.lineCap = "round";
  c.beginPath(); c.moveTo(-1.1, 0); c.lineTo(HAFT, 0); c.stroke();
  // the head across the haft: the face on the swing's side, the peen behind
  c.fillStyle = lin(c, HAFT - 1.2, 0, HAFT + 1.2, 0, [[0, "#8a909c"], [1, "#4e525c"]]);
  roundRect(c, HAFT - 1.2, -1.6, 2.4, 3.8, 0.6); c.fill();
  c.fillStyle = "#b8bcc6"; c.fillRect(HAFT - 1.2, 1.7, 2.4, 0.5);
  c.restore();
});
export const drawSmith = (ctx, x, y, dir, pal, swing = 0, o = {}) => {
  const fr = o.frame != null ? ((o.frame % SMITH_FRAMES) + SMITH_FRAMES) % SMITH_FRAMES : swing > 0.5 ? 1 : SMITH_IMPACT;
  const K = SMITH_KEYS[fr], H = smithHammer(fr);
  const { hip, lean, tilt } = K;
  const sF = turn([-1.2, -15.6], hip, lean);
  const tongs = [4.4, -13.4], jaw = [7.4, -12.5];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.8, { hip });
  upper(ctx, hip, lean, 0, () => {
    torso(ctx, 0, -17, 10, 8, pal);
    // leather apron
    part(ctx, (c) => { c.fillStyle = darken(pal.trim || "#6a4a2e", 0.1); roundRect(c, -3, -15, 6, 8, 1.5); c.fill(); });
    nod(ctx, 0.3, -17.6, tilt, () => {
      head(ctx, 0.4, -20.5, pal, { hood: false });
      cap(ctx, 0.4, -21.0, pal.hood);   // a flat cap, its brim at the brow so the eye shows under it
    });
  });
  // the far hand keeps the tongs on the iron
  arm(ctx, sF[0], sF[1], tongs[0], tongs[1], pal, { col: darken(pal.coat, 0.18), hand: false });
  part(ctx, (c) => {
    c.strokeStyle = "#2e2a30"; c.lineWidth = 0.7; c.lineCap = "round";
    c.beginPath(); c.moveTo(tongs[0] - 0.6, tongs[1] + 0.2); c.lineTo(jaw[0], jaw[1] - 0.3); c.stroke();
    c.beginPath(); c.moveTo(tongs[0] - 0.4, tongs[1] + 0.9); c.lineTo(jaw[0], jaw[1] + 0.3); c.stroke();
  });
  hand(ctx, tongs[0], tongs[1], darken(pal.skin, 0.1));
  // a smear on the fast frame: the arc the hammer's head just swept
  if (K.smear) {
    const T = smithHammer(1), s = H.s;
    const a0 = Math.atan2(T.head[1] - s[1], T.head[0] - s[0]), a1 = Math.atan2(H.head[1] - s[1], H.head[0] - s[0]);
    const r = Math.hypot(H.head[0] - s[0], H.head[1] - s[1]);
    part(ctx, (c) => {
      c.lineCap = "round";
      for (const [dr, al, w] of [[0, 0.55, 2.2], [-2.2, 0.3, 1.2]]) {
        c.strokeStyle = rgba("#fff3d2", al); c.lineWidth = w;
        c.beginPath(); c.arc(s[0], s[1], r + dr, a0 + 0.35, a1 - 0.25, false); c.stroke();
      }
    });
  }
  arm(ctx, H.s[0], H.s[1], H.hand[0], H.hand[1], pal, { hand: false });
  hammer(ctx, H.hand[0], H.hand[1], H.ang);
  hand(ctx, H.hand[0], H.hand[1], pal.skin);
  ctx.restore();
};
