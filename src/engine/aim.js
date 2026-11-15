// ============ AIMING: the angle, the lead, the straight shot ============
// The contract is art/briefs/aim-contract.md. A shooter that locks on turns its
// weapon to its target; its shot leaves the weapon's muzzle and flies a straight
// line to where the target WILL BE, no homing and no lob.
//   `aim`  the shot's angle in the shooter's OWN facing frame, in degrees: 0 level
//          ahead, negative up the screen, positive down it (so a figure bakes the
//          same aim whichever way it faces); clamped to +-70, drawn in steps of
//          AIM_STEP so a figure bakes at most 15 aims.
// Pure maths (safe in node and the sims).
import { posAt, TOTAL_LEN } from "./path.js";

export const AIM_STEP = 10;
export const AIM_MAX = 70;
const RAD = 180 / Math.PI;

// the world angle `a` (radians, atan2(dy, dx), y down) to the aim in a facing's frame (f: +1 right, -1 left)
export const aimDeg = (a, f) => {
  if (f > 0) return a * RAD;
  let d = Math.PI - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d * RAD;
};
// clamp to +-AIM_MAX and snap to AIM_STEP (the angle both the drawing and the muzzle use)
export const quantAim = (deg) => {
  const c = Math.max(-AIM_MAX, Math.min(AIM_MAX, deg));
  return Math.round(c / AIM_STEP) * AIM_STEP || 0;
};
// the world angle of a facing-frame aim (the inverse of aimDeg)
export const aimWorld = (deg, f) => (f > 0 ? deg / RAD : Math.PI - deg / RAD);
// a point turned `deg` about a pivot in the figure's frame (facing +x, y down: positive = clockwise = down the screen)
export const rotAbout = ([px, py], [mx, my], deg) => {
  if (!deg) return [mx, my];
  const r = deg / RAD, c = Math.cos(r), s = Math.sin(r), dx = mx - px, dy = my - py;
  return [px + dx * c - dy * s, py + dx * s + dy * c];
};

// Ease a held aim toward `want` the short way at AIM_RATE degrees a second (a shooter tracks its target
// between shots instead of snapping). `store[key]` keeps the raw angle; the first call takes `want` whole.
// `wrap`: the angles are world angles (a ballista), so the short way may cross +-180.
export const AIM_RATE = 240;
export const easeAim = (store, key, want, dt, wrap = false) => {
  const c = store[key];
  if (c == null) return (store[key] = want);
  let d = want - c;
  if (wrap) { while (d > 180) d -= 360; while (d <= -180) d += 360; }
  const s = AIM_RATE * dt;
  return (store[key] = Math.abs(d) <= s ? want : c + Math.sign(d) * s);
};

// A foe is "going somewhere" unless something holds it.
const moving = (e, tms) => !!e && !e.dead && e.speed > 0 && e.dist != null && e.blockedBy == null && !e.aiming
  && !e.seized && !(e.stunUntil > tms);
// Where a shot of `speed` fired from (sx, sy) should aim to meet foe `e`: the foe projected along
// the road for the shot's flight time (the catapult's method), iterated twice so flight time and
// distance agree; a flier keeps its own offset from the road (it flies its heading); a held,
// stopped or stunned foe is not led.
export const leadPoint = (e, sx, sy, speed, tms) => {
  if (!moving(e, tms) || !(speed > 0)) return [e.x, e.y];
  const slow = Math.max(e.slowUntil > tms ? e.slowPct || 0 : 0, e.auraSlow || 0);
  const v = e.speed * (1 - slow);
  const [bx, by] = posAt(e.dist);
  let ax = e.x, ay = e.y;
  for (let i = 0; i < 2; i++) {
    const T = Math.hypot(ax - sx, ay - sy) / speed;
    const [lx, ly] = posAt(Math.min(e.dist + v * T, TOTAL_LEN - 1));
    ax = e.x + (lx - bx); ay = e.y + (ly - by);
  }
  return [ax, ay];
};
