// ============ RIGS: THE RIVER WATCH'S SKIFF ============
// A River Watch skiff and its crew of two ("skiff" in rigs.js RIGS): an
// oarsman on the thwart, his back to the bow as an oarsman's is, and a
// musketeer standing in the bow — the Powder Works' musketeer
// (folk-gunners.js drawMusketeer, the same poses and gun), in the hall's
// colours, the gunwale at his thighs. enemies.js drawSkiff picks the frame.
//
// A frame is a string "<crew>.<gun>.<row>":
//   crew  base | a | b — the hall's branch: the gunner wears its watchman's
//         colours (halls/riverwatch.js WATCH)
//   gun   a musketeer pose: aim, kick, recoil, port, ramA, ramB, raise
//         (skiffGunPose says which, off the attack clock)
//   row   0 catch, 1 drive, 2 finish, 3 recover (skiffRowFrame, off the
//         clock while she is under way) or "rest" (oars easy, blades up)
// A bare number (the old walk frames) is "base.port.<n % 4>".
//
// Everything here is pure maths but the painter, so the engine can ask
// skiffMuzzle() where the ball leaves (see the engine note by it).

import { lighten, darken, rgba, lin, part } from "./paint.js";
import { head, torso, arm, hand, limb, elbowFor } from "./folk-kit.js";
import { drawMusketeer, musketMuzzle, musketFrame } from "./folk-gunners.js";

// ---- where things stand, in the rig's own space (facing +x, the anchor
// being where drawSkiff stamps it: u.y + SKIFF_LIFT + the bob) ----
const GUNNER_AT = [2, 2];          // the musketeer's feet, on the boards in the bow
const GUN_LEN = 7.5;               // his musket, the Powder Works' own
const ROWER_AT = [-8.2, -2.8];     // the oarsman's hips on the thwart; he faces the stern
// The rower's own frame: +x toward the stern (he is drawn mirrored), origin
// at his hips. The near oarlock on the near gunwale, the far one over it.
const LOCK = [4.2, -2.1], FAR_LOCK = [4.2, -4.0];
const OAR_OUT = 1.8;               // outboard length : inboard, about the lock

export const SKIFF_LIFT = 6;                                       // the rig stands this far below u.y
export const skiffBob = (time, id) => Math.sin(time * 2.2 + id) * 1.5;

// The musket's muzzle in the rig's space for a gun pose (default the shot's
// own frame, the kick): [x, y]. The engine starts the ball at
//   x = u.x + u.face * mx,  y = u.y + SKIFF_LIFT + skiffBob(g.time, u.id) + my
export const skiffMuzzle = (frame = "kick") => {
  const pose = typeof frame === "string" && frame.includes(".") ? frame.split(".")[1] : frame;
  const m = musketMuzzle(pose, GUN_LEN);
  return [GUNNER_AT[0] + m.x, GUNNER_AT[1] + m.y];
};

// ---- timing ----
// The gun's frame from the attack clock: `since` ms since the shot (the
// engine sets u.atkCd = rate and u.swing = 200 then; since = rate − atkCd
// while atkCd > 0, else Infinity), `rate` the hall's ms between shots.
//   kick 70 ms → recoil → port → the rod worked down (ramA/ramB, a stroke
//   every 110 ms) → raise → aim, held till the next shot.
// Not hunting (no mark) and loaded: the idle — port arms, now and then a
// long look down the sights (musketFrame's idle, phased by o.clock).
// o.turned: seconds since hunting began or ended — the gun comes up (or
// goes down) through "raise" instead of snapping.
export const skiffGunPose = (since, rate, o = {}) => {
  const r = rate || 900;
  if (since < r) {
    if (since < 70) return "kick";
    if (since < 70 + 0.17 * r) return "recoil";
    if (since < 0.36 * r) return "port";
    if (since < 0.66 * r) return Math.floor((since - 0.36 * r) / 110) % 2 ? "ramB" : "ramA";
    if (since < 0.82 * r) return "raise";
    return "aim";
  }
  if (o.turned != null && o.turned < 0.16) return "raise";
  if (o.hunting) return "aim";
  return musketFrame(0, 0, 0, { idle: true, clock: o.clock || 0 });
};
// The stroke: a quick drive, a slower recovery. `clock` in seconds (phase it
// by the unit's id). 0 catch, 1 drive, 2 finish, 3 recover.
export const ROW_PERIOD = 1.05;
export const skiffRowFrame = (clock) => {
  const p = (((clock / ROW_PERIOD) % 1) + 1) % 1;
  return p < 0.17 ? 0 : p < 0.42 ? 1 : p < 0.6 ? 2 : 3;
};

// ---- the crews ----
// the gunner in the hall's watchman's colours (halls/riverwatch.js WATCH)
const GUNNER = {
  base: { skin: "#e8b990", hood: "#34404e", coat: "#4a6a7a", boots: "#2a2a30", trim: "#c8b070" },
  a: { skin: "#e8b990", hood: "#2a3a5a", coat: "#3a5a8a", boots: "#2a2a30", trim: "#e8e0c8" },
  b: { skin: "#e8b990", hood: "#3a2a28", coat: "#7a3a2a", boots: "#2a2420", trim: "#c8b070" },
};
// the oarsman: a weathered linen smock and a red knitted cap
const ROWER = { skin: "#dcae86", hood: "#a8505c", coat: "#b4ae9a", boots: "#3a2e26", trim: "#5a4632", hair: "#5a3a26" };

// The oarsman's stroke, in his frame (+x toward the stern, y up −): the
// trunk's lean about the hips (+ toward the stern: reaching for the catch)
// and where the near hand holds the loom. The far hand is beside it.
//   catch    reached out over his knees, arms long, blades going in
//   drive    swinging back through upright, the legs and back doing it
//   finish   laid back, the hands drawn in to the ribs, elbows past the body
//   recover  hands away first and low (blades up out of the water), the
//            body following them forward
//   rest     sitting easy, looms held low, blades feathered clear
const ROW = [
  { lean: 0.48, hand: [8.2, -6.2], wet: 1 },
  { lean: 0.06, hand: [6.0, -6.9], wet: 1 },
  { lean: -0.26, hand: [3.0, -6.3], wet: 0.5 },
  { lean: 0.22, hand: [6.6, -5.2], wet: 0 },
];
const ROW_REST = { lean: 0.05, hand: [5.4, -5.0], wet: 0 };

const P = (lean, x, y) => { const c = Math.cos(lean), s = Math.sin(lean); return [x * c - y * s, x * s + y * c]; };
// where an oar's blade lies: from the hand through the lock, OAR_OUT times on
const bladeOf = (h, lock, k = OAR_OUT) => [lock[0] + (lock[0] - h[0]) * k, lock[1] + (lock[1] - h[1]) * k];

const OAR = "#d6c296";   // pale ash, so the oars read across the dark hull
const oar = (ctx, h, b, col, lw) => part(ctx, (c) => {
  c.lineCap = "round";
  c.strokeStyle = col; c.lineWidth = lw;
  c.beginPath(); c.moveTo(h[0], h[1]); c.lineTo(b[0], b[1]); c.stroke();
  // the blade: the last third, broader
  const bx = h[0] + (b[0] - h[0]) * 0.72, by = h[1] + (b[1] - h[1]) * 0.72;
  c.strokeStyle = darken(col, 0.12); c.lineWidth = lw + 1.1;
  c.beginPath(); c.moveTo(bx, by); c.lineTo(b[0], b[1]); c.stroke();
});

// The oarsman, in his own frame (the caller mirrors it to face the stern).
// Returns the near hand and blade (for the near oar, drawn over the hull).
const drawRower = (ctx, pose, farOar) => {
  const L = pose.lean, pal = ROWER;
  const nh = pose.hand, fh = [nh[0] - 0.5, nh[1] - 0.7];
  const nsh = P(L, 1.7, -7.8), fsh = P(L, -1.1, -7.8);
  // the far oar first, behind everything: it runs away up the far side
  if (farOar) {
    const fb = bladeOf(fh, FAR_LOCK, 1.6);
    oar(ctx, fh, [fb[0], Math.min(fb[1], FAR_LOCK[1] - 1.6)], darken(OAR, 0.3), 0.9);
  }
  // the far arm, behind the body
  arm(ctx, fsh[0], fsh[1], fh[0], fh[1], pal, { col: darken(pal.coat, 0.14) });
  // the trunk, leant about the hips
  ctx.save(); ctx.rotate(L);
  torso(ctx, 0, -9.2, 10, 7.2, pal);
  ctx.restore();
  // the head rides the trunk, tipped a touch less than it (he looks at the stern)
  const [hx, hy] = P(L, 0.5, -12.6);
  ctx.save(); ctx.translate(hx, hy + 2.4); ctx.rotate(-L * 0.35); ctx.translate(-hx, -(hy + 2.4));
  head(ctx, hx, hy, pal, { hood: false });
  // a knitted cap pulled down to the ears, the turn-up a shade darker
  part(ctx, (c) => {
    const y = hy - 0.3;
    c.fillStyle = lin(c, hx - 2.5, y - 4, hx + 2.5, y, [[0, lighten(pal.hood, 0.3)], [0.5, pal.hood], [1, darken(pal.hood, 0.35)]]);
    c.beginPath(); c.moveTo(hx - 2.6, y - 0.9); c.quadraticCurveTo(hx - 2.8, y - 4.6, hx + 0.2, y - 4.4); c.quadraticCurveTo(hx + 2.8, y - 4.0, hx + 2.6, y - 1.4); c.closePath(); c.fill();
    c.fillStyle = darken(pal.hood, 0.3); c.fillRect(hx - 2.7, y - 1.9, 5.3, 1.0);
  });
  ctx.restore();
  // the near arm, in front, the sleeve rolled to the elbow
  const el = elbowFor(nsh[0], nsh[1], nh[0], nh[1]);
  arm(ctx, nsh[0], nsh[1], nh[0], nh[1], pal, { elbow: el, hand: false });
  limb(ctx, el[0] + (nh[0] - el[0]) * 0.18, el[1] + (nh[1] - el[1]) * 0.18, nh[0], nh[1], 1.8, pal.skin);
  hand(ctx, nh[0], nh[1], pal.skin);
  return { nh, nb: bladeOf(nh, LOCK) };
};

const WOOD = "#8a6238", WOOD_IN = "#50361f", RAIL = "#b8925e", STRAKE = "#e8e0c8";
// the near gunwale, stern → bow; the far one arcs higher (we look into her)
const nearRail = (c, dy = 0) => { c.moveTo(-14.2, -5.2 + dy); c.quadraticCurveTo(0, -3.2 + dy, 15, -5.9 + dy); };
const hullPath = (c) => {
  c.beginPath();
  nearRail(c);
  c.quadraticCurveTo(13.4, 1.6, 8, 3.1);          // the stem, curving down to the keel
  c.lineTo(-9, 3.1);
  c.quadraticCurveTo(-13.1, 2.7, -13.7, 0.4);     // the turn of the bilge under the stern
  c.closePath();                                   // up the transom
};

// ---- the painter ----
export const skiff = (ctx, p) => {
  let crew = "base", gun = "port", row = 0;
  if (typeof p.frame === "number") row = p.frame % 4;
  else if (typeof p.frame === "string") {
    const [c, g, r] = p.frame.split(".");
    crew = GUNNER[c] ? c : "base"; gun = g || "port"; row = r === "rest" ? "rest" : (Number(r) || 0) % 4;
  }
  const rp = row === "rest" ? ROW_REST : ROW[row];
  const rower = (fn) => { ctx.save(); ctx.translate(ROWER_AT[0], ROWER_AT[1]); ctx.scale(-1, 1); const r = fn(); ctx.restore(); return r; };
  const toRig = ([x, y]) => [ROWER_AT[0] - x, ROWER_AT[1] + y];

  // the inside of her: the far side's planking in shade, its rail catching
  // the light, the thwart the oarsman sits on
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(-14.2, -5.2); c.quadraticCurveTo(0, -8.8, 15, -5.9); c.quadraticCurveTo(0, -3.2, -14.2, -5.2); c.closePath();
    c.fillStyle = WOOD_IN; c.fill();
    c.fillStyle = rgba(darken(WOOD_IN, 0.4), 0.8);
    for (let x = -10; x <= 11; x += 3.5) c.fillRect(x, -6.6 + Math.abs(x) * 0.06, 0.6, 2.2);   // the ribs
    c.strokeStyle = RAIL; c.lineWidth = 0.8; c.lineCap = "round";
    c.beginPath(); c.moveTo(-13.8, -5.4); c.quadraticCurveTo(0, -8.8, 14.6, -6.1); c.stroke();
  });
  part(ctx, (c) => { const x = ROWER_AT[0] - 2.6; c.fillStyle = lighten(WOOD, 0.12); c.fillRect(x, -5.7, 5.2, 1.4); c.fillStyle = darken(WOOD, 0.3); c.fillRect(x, -4.5, 5.2, 0.5); });

  // the oarsman
  const { nh, nb } = rower(() => drawRower(ctx, rp, true));

  // the musketeer: stood in the bow, cut at the gunwale (the hull covers the rest)
  ctx.save();
  ctx.beginPath(); ctx.rect(-40, -60, 80, 57); ctx.clip();
  drawMusketeer(ctx, GUNNER_AT[0], GUNNER_AT[1], 1, GUNNER[crew], gun, { len: GUN_LEN });
  ctx.restore();

  // her near side: wet-dark below the waterline, a lapped seam, a cream
  // strake under a pale rail
  part(ctx, (c) => {
    hullPath(c);
    c.fillStyle = lin(c, 0, -5, 0, 3.2, [[0, lighten(WOOD, 0.22)], [0.45, WOOD], [1, darken(WOOD, 0.45)]]); c.fill();
    c.save(); hullPath(c); c.clip();
    c.fillStyle = rgba(darken(WOOD, 0.6), 0.45); c.fillRect(-16, 1.5, 32, 3);        // wet below the waterline
    c.lineCap = "round";
    c.strokeStyle = rgba(darken(WOOD, 0.5), 0.9); c.lineWidth = 0.45;
    c.beginPath(); nearRail(c, 3.2); c.stroke();                                     // the lap
    c.strokeStyle = STRAKE; c.lineWidth = 0.6;
    c.beginPath(); nearRail(c, 1.15); c.stroke();                                    // the strake
    c.restore();
    c.strokeStyle = RAIL; c.lineWidth = 1.0; c.lineCap = "round";
    c.beginPath(); nearRail(c, 0.1); c.stroke();                                     // the rail
  });
  // the bow lantern on its crook
  part(ctx, (c) => {
    c.strokeStyle = "#3a3a44"; c.lineWidth = 0.7; c.lineCap = "round";
    c.beginPath(); c.moveTo(12.2, -4.9); c.lineTo(12.2, -10.6); c.lineTo(13.6, -10.6); c.stroke();
    c.fillStyle = "#3a3a44"; c.fillRect(12.6, -10.2, 2.2, 3.2);
    c.fillStyle = "#e8c14a"; c.fillRect(13.0, -9.6, 1.4, 2.0);
    c.fillStyle = "#fff3d2"; c.fillRect(13.0, -9.6, 0.6, 0.6);
  });

  // the near oar: from his fists over the rail and down into the river
  const H = toRig(nh), B = toRig(nb), lock = toRig(LOCK);
  oar(ctx, H, B, OAR, 1.1);
  part(ctx, (c) => { c.fillStyle = "#3a3a44"; c.fillRect(lock[0] - 0.5, lock[1] - 0.9, 1.0, 1.2); });   // the tholepin
  hand(ctx, H[0], H[1], ROWER.skin);
};

// Where the near oar's blade is in a row frame (rig space) and how deep it
// works: wet 1 pulling, 0.5 coming out, 0 in the air. drawSkiff paints the
// water there live (foam never takes the sprite's ink).
export const skiffBlade = (row) => {
  const rp = row === "rest" ? ROW_REST : ROW[(Number(row) || 0) % 4];
  const b = bladeOf(rp.hand, LOCK);
  return { x: ROWER_AT[0] - b[0], y: ROWER_AT[1] + b[1], wet: rp.wet };
};
