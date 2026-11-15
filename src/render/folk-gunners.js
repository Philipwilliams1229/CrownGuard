// ============ FOLK: THE GUNNERS AND OTHERS ============
// The covert's hooded blade, the falcon-mistress, the bombardier (and the
// alchemist, in his cloth) and the musketeer. Built from folk-kit.js;
// folk.js re-exports it.
//
// Each figure is a table of KEY POSES (named frames the halls bake one by
// one) plus a timing helper that says which frame a hall shows. Every pose
// keeps to "Joints and motion" in art/STYLE-GUIDE.md: the hips shift over
// planted feet (knees solved), the trunk leans about the hips, the head
// rides on it; and the halls ask these same numbers where a hand is, so what
// it holds (a fuse, a vial, a bird, the muzzle) moves with it.

// ---- the body's frame ---------------------------------------------------------
const HIP = [0, -7.8];                                   // the hips' centre, standing
// Feet planted `stride` apart, the front foot stepped `step` further on; the
// hips shifted by `hip` and dropped as far as the knees need to stay a touch
// bent (legs() solves them; a hip too high would lock them straight).
const footing = (p) => {
  const stride = p.stride ?? 0.4, step = p.step || 0, [h0, h1] = p.hip || [0, 0];
  const back = -1.6 - 1.5 * stride, front = 1.5 + 1.5 * stride + step;
  const need = (dx) => 6.6 - Math.sqrt(Math.max(0, 6.42 * 6.42 - dx * dx));
  return { stride, step, hip: [h0, Math.max(h1, need(front - h0 - 0.9), need(h0 - 0.9 - back))] };
};
// A pose's frame: P(x, y) carries a point of the upright figure onto the
// posed one (hips shifted, trunk leant `lean` radians about them, + forward);
// on(ctx, fn) paints fn in that frame.
const bodyOf = (p) => {
  const ft = footing(p), lean = p.lean || 0, c = Math.cos(lean), s = Math.sin(lean);
  const hx = HIP[0] + ft.hip[0], hy = HIP[1] + ft.hip[1];
  const P = (x, y) => { const dx = x - HIP[0], dy = y - HIP[1]; return [hx + dx * c - dy * s, hy + dx * s + dy * c]; };
  const on = (ctx, fn) => { ctx.save(); ctx.translate(hx, hy); ctx.rotate(lean); ctx.translate(-HIP[0], -HIP[1]); fn(); ctx.restore(); };
  return { ...ft, lean, P, on };
};
// which way a frame lies in a cycle: 0..1 from a clock in seconds
const cyc = (clock, period) => (((clock / period) % 1) + 1) % 1;

// the dagger at his near hip, in the trunk's frame: the sheath's mouth, the
// grip's end (the pommel) and, half drawn, where the fist has it
const SHEATH = [1.7, -10.4], POMMEL = [3.5, -12.5], DRAWN = [4.6, -12.9];

// ============ THE FALCON-MISTRESS ============
// Her gauntlet is the near arm. carry: the glove at her chest, forearm out
// level (where a hawk rides); glance: the same, her head up to the wheel of
// birds; present: the glove raised to show the bird the field; draw: the
// fist swung down and back to her hip, her weight on the back foot
// (the anticipation: the bird mantles on it BELOW her face, never over it);
// cast: the arm thrown out and up, hand open, a step into it — the bird is
// away; follow: the arm coming down, still open, before she settles.
// `plume`: her hat's plume trailing the move (hat() "falconer").
const MIST = {
  carry: { stride: 0.3, hip: [0, 0.2], near: [6.3, -13.4], far: [-2.3, -7.4] },
  glance: { stride: 0.3, hip: [0.1, 0.3], near: [6.2, -13.1], far: [-2.2, -7.3], tilt: -0.26 },
  present: { stride: 0.35, hip: [0.2, 0.3], lean: 0.02, near: [7.6, -20.2], far: [-2.2, -7.4], tilt: -0.12, plume: 0.05 },
  draw: { stride: 0.55, hip: [-0.75, 0.5], lean: -0.1, near: [4.0, -9.8], far: [-3.2, -8.2], tilt: -0.1, plume: 0.15 },
  cast: { stride: 0.5, step: 0.8, hip: [0.7, 0.6], lean: 0.1, near: [9.0, -21.4], open: true, far: [-2.0, -8.0], tilt: -0.16, plume: -0.22 },
  follow: { stride: 0.5, step: 0.8, hip: [0.5, 0.5], lean: 0.06, near: [8.6, -16.0], open: true, far: [-1.8, -7.6], tilt: -0.04, plume: -0.1 },
};
// the glove (the back of her fist, where the bird's feet go), figure space
export const mistressGlove = (pose = "present") => (MIST[pose] || MIST.present).near;

// ============ THE MUSKETEER ============
// The gun is one rigid piece in its own space: origin at the wrist of the
// stock, +x down the barrel (`len` long), the butt at GUN_BUTT. A pose places
// it (ang: the barrel's angle, − up) by its butt against the near shoulder,
// by its wrist, or by its muzzle; the hands hold it where it lies.
//   aim     braced, cheek down on the stock, the barrel level
//   kick    the shot drives the gun, the shoulder and the head back, the
//           barrel jumps
//   recoil  coming back down, the weight returning
//   port    the gun brought up across his chest to load
//   ramA/B  the butt grounded, the rod worked down the barrel
//   raise   the gun coming up to the shoulder again
// Idle: port, and now and then a long look down the sights.
const GUN_BUTT = [-5, 1.6];
const GUN_LEN = 7.5;
const MUSK = {
  aim: { stride: 1.2, hip: [0.2, 0.3], lean: 0.05, head: [0.6, 0.7], tilt: 0.06, gun: { ang: -0.05, butt: [0.4, -0.6] }, grip: [-0.9, 0.9], rest: [2.9, 0.9] },
  kick: { stride: 1.2, hip: [-0.5, 0.4], lean: -0.09, head: [-0.2, 0.1], tilt: -0.16, gun: { ang: -0.3, butt: [0.1, -0.5] }, grip: [-0.9, 0.9], rest: [2.9, 0.9] },
  recoil: { stride: 1.2, hip: [-0.15, 0.35], lean: -0.02, head: [0.3, 0.4], tilt: -0.04, gun: { ang: -0.14, butt: [0.3, -0.6] }, grip: [-0.9, 0.9], rest: [2.9, 0.9] },
  port: { stride: 1.0, hip: [0, 0.3], gun: { ang: -1.05, wrist: [5.0, -14.3] }, grip: [-0.9, 0.9], rest: [2.4, 0.9] },
  ramA: { stride: 1.0, hip: [0.2, 0.4], lean: 0.04, tilt: -0.1, gun: { ang: -1.3, muzzle: [7.4, -19.2] }, hold: 4.5, rod: 2.2 },
  ramB: { stride: 1.0, hip: [0.2, 0.5], lean: 0.06, tilt: -0.04, gun: { ang: -1.3, muzzle: [7.4, -19.2] }, hold: 4.5, rod: 0.6 },
  raise: { stride: 1.1, hip: [0.1, 0.3], lean: 0.02, head: [0.2, 0.3], gun: { ang: -0.5, butt: [0.5, 0.8] }, grip: [-0.9, 0.9], rest: [2.6, 0.9] },
};
const gunOf = (p, b, len) => {
  const g = p.gun, c = Math.cos(g.ang), s = Math.sin(g.ang);
  const R = (u, v) => [u * c - v * s, u * s + v * c];
  let W;
  if (g.butt) { const sh = b.P(1.8, -15.6), bt = R(...GUN_BUTT); W = [sh[0] + g.butt[0] - bt[0], sh[1] + g.butt[1] - bt[1]]; }
  else if (g.wrist) W = g.wrist;
  else { const m = R(len, 0); W = [g.muzzle[0] - m[0], g.muzzle[1] - m[1]]; }
  return { W, ang: g.ang, at: (u, v) => { const r = R(u, v); return [W[0] + r[0], W[1] + r[1]]; } };
};
const muskKey = (pose) => (typeof pose === "string" && MUSK[pose] ? pose : typeof pose === "number" && pose > 0 ? "kick" : "aim");
// A point of the gun (its own space: u down the barrel from the stock's
// wrist, v across) in a frame, in figure space, and the barrel's angle:
// { x, y, ang }. `len`: the barrel's length. The muzzle is (len, 0) — or
// past it, a bell's lip: musketMuzzle(pose, len, lip).
export const musketPoint = (pose, len, u, v = 0) => {
  const p = MUSK[muskKey(pose)], g = gunOf(p, bodyOf(p), len || GUN_LEN), [x, y] = g.at(u, v);
  return { x, y, ang: g.ang };
};
export const musketMuzzle = (pose = "aim", len = GUN_LEN, lip = 0) => musketPoint(pose, len, len + lip, -0.2);
// which frame: ms since the shot and until the next, the rate; idle: the clock
export const musketFrame = (since, until, rate, o = {}) => {
  if (o.idle) {
    const c = cyc(o.clock || 0, 13);
    return c < 0.56 ? "port" : c < 0.59 ? "raise" : c < 0.9 ? "aim" : c < 0.93 ? "raise" : "port";
  }
  const k = Math.min(1, (rate || 2600) / 2600);
  if (since < 95 * k) return "kick";
  if (since < 260 * k) return "recoil";
  if (since < 470 * k) return "port";
  if (since < 1050 * k) return cyc(since / 1000, 0.29) < 0.5 ? "ramA" : "ramB";
  if (since < 1250 * k) return "port";
  if (since < 1450 * k) return "raise";
  return "aim";
};
