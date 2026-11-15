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

import { musketMuzzle, musketFrame } from "./folk-gunners.js";

// ---- where things stand, in the rig's own space (facing +x, the anchor
// being where drawSkiff stamps it: u.y + SKIFF_LIFT + the bob) ----
const GUNNER_AT = [2, 2];          // the musketeer's feet, on the boards in the bow
const GUN_LEN = 7.5;               // his musket, the Powder Works' own
const ROWER_AT = [-8.2, -2.8];     // the oarsman's hips on the thwart; he faces the stern
// The rower's own frame: +x toward the stern (he is drawn mirrored), origin
// at his hips. The near oarlock on the near gunwale, the far one over it.
const LOCK = [4.2, -2.1];
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
    // loaded again: up to the shoulder — unless the mark is gone, then he
    // keeps it at the port and stands easy
    if (o.hunting === false) return "port";
    return since < 0.82 * r ? "raise" : "aim";
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

// The oarsman's stroke, in his frame (+x toward the stern, y up −): the
// trunk's lean about the hips (+ toward the stern: reaching for the catch)
// and where the near hand holds the loom. The far hand is beside it.
//   catch    reached out over his knees, blades going in (a skiff this
//            short leaves no room for arms at full stretch: they stay a
//            little bent, within the elbow's limits)
//   drive    swinging back through upright, the legs and back doing it
//   finish   laid back, the hands drawn in to the ribs, elbows past the body
//   recover  hands away first and low (blades up out of the water), the
//            body following them forward
//   rest     sitting easy, looms held low, blades feathered clear
const ROW = [
  { lean: 0.3, hand: [8.0, -5.6], wet: 1 },
  { lean: -0.05, hand: [5.5, -6.9], wet: 1 },
  { lean: -0.26, hand: [3.0, -6.3], wet: 0.5 },
  { lean: 0.2, hand: [7.4, -5.0], wet: 0 },
];
const ROW_REST = { lean: 0.05, hand: [5.4, -5.0], wet: 0 };

// where an oar's blade lies: from the hand through the lock, OAR_OUT times on
const bladeOf = (h, lock, k = OAR_OUT) => [lock[0] + (lock[0] - h[0]) * k, lock[1] + (lock[1] - h[1]) * k];

// Where the near oar's blade is in a row frame (rig space) and how deep it
// works: wet 1 pulling, 0.5 coming out, 0 in the air. drawSkiff paints the
// water there live (foam never takes the sprite's ink).
export const skiffBlade = (row) => {
  const rp = row === "rest" ? ROW_REST : ROW[(Number(row) || 0) % 4];
  const b = bladeOf(rp.hand, LOCK);
  return { x: ROWER_AT[0] - b[0], y: ROWER_AT[1] + b[1], wet: rp.wet };
};
