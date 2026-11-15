// ============ THE SKYKNIGHT'S WAR-EAGLE, sculpted (game type `eagle`) ============
// The Falconry's Skyknight form: a great brown eagle with a white head, a hooked gold beak, a white
// fanned tail and hooked talons, in a crown-blue saddlecloth and breast strap, and the falconer
// riding it in mail, a steel helm and plume, a crimson cape, her lance couched or thrust. Built
// from the old painter's numbers (rigs-eagle.js: the same units, the same key poses, the same
// arm and lance maths), so the eagle sits where it always sat, the lance's point is where
// `eagleLanceTip` says, and the strafing passes draw.js times play as before. Two art pixels to a
// unit; the anchor is the ground under the body (the body is 9 units above it).
//   walk    the cruise, four frames: wings up, level, down, rising (draw.js picks 0..3)
//   attack  the lance pass, four frames: 0 the dive, 1 the strike, 2 follow-through, 3 the climb
// Registered into PIX by rigs-eagle.js (legacy [0, 1, 2, 3]).
import { mat, flat } from "./pix.js";
import { HUMAN } from "./rig.js";

const BODY = mat("#7a5234", { contrast: 1.1 }), THIGH = mat("#6a4428"), WING = mat("#6e4a2c", { contrast: 1.1 }), WINGP = mat("#4a321e", { contrast: 1.2 }), WINGC = mat("#8c6440");
const HEAD = mat("#f0ead8"), TAIL = mat("#ece4d2"), TAILB = mat("#b8b0a0"), BEAK = mat("#e8b840", { contrast: 1.25 }), FOOT = mat("#e8b840", { contrast: 1.2 });
const SADDLE = mat("#3a5474", { contrast: 1.15 }), GOLD = mat("#d8b34a", { contrast: 1.25 }), LEATHER = mat("#4a3020", { floor: 1 }), WOOD = mat("#6a4a2e");
const STEEL = mat("#b8bcc4", { contrast: 1.3 }), STEELD = mat("#8a8e98", { contrast: 1.3 }), SKIN = mat("#e8b990"), CAPE = mat("#a0303a", { contrast: 1.1 }), PLUME = mat("#e8e2d0"), LANCE = mat("#dde2ea", { contrast: 1.3 });
const EYE = flat("#e8a030", { emis: true }), PUPIL = flat("#2a2230"), CLAW = flat("#2a2230"), BROW = mat("#4a4050", { floor: 1 }), RIDEYE = flat("#2a2230");

export const BOX = { w: 128, h: 116, ox: 64, oy: 92 };
export const BONES = HUMAN;                  // unused: a flier poses itself

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const UP = 3.6, FORE = 3.4;
const SEAT = [2, -6.5], SH = [3.2, -14.4], FAR_SH = [2.4, -14.0];
const SHAFT = 24, GRIP = 9, PENNON = 21, HEAD_LEN = 4;

// wings: shoulder, wrist, tip, trailing root (the old numbers)
const WINGS = {
  up: { far: [[-1, -6], [-5, -19], [-17, -32], [-9, -4]], near: [[-2, -4], [-8, -16], [-23, -25], [-10, -2]] },
  level: { far: [[-1, -6], [-3, -15], [-16, -24], [-9, -4]], near: [[-1, 0], [-3, 8], [-15, 15], [-9, 1]] },
  down: { far: [[-2, -4], [-6, -1], [-15, 5], [-9, -2]], near: [[0, 1], [1, 9], [-8, 17], [-8, 2]] },
  rising: { far: [[-1, -6], [-4, -17], [-18, -27], [-9, -4]], near: [[-1, 0], [-4, 6], [-17, 12], [-9, 1]] },
  dive: { far: [[-1, -6], [-5, -13], [-21, -18], [-9, -4]], near: [[-2, -4], [-7, -10], [-24, -13], [-10, -2]] },
  flare: { far: [[-1, -6], [2, -19], [-6, -33], [-9, -4]], near: [[-2, -4], [0, -16], [-11, -29], [-10, -2]] },
  spread: { far: [[-1, -6], [-4, -18], [-17, -29], [-9, -4]], near: [[-1, 0], [-4, 7], [-18, 13], [-9, 1]] },
  beat: { far: [[-2, -4], [-6, 0], [-15, 7], [-9, -2]], near: [[0, 1], [2, 10], [-6, 19], [-8, 2]] },
};
const CAPE_KEY = (fl) => [[-6, -15 + fl], [-11, -11 + fl], [-8, -8 + fl * 0.5]];
const WALK = [0, 1, 2, 3].map((f) => ({
  bob: [0.8, 0, -1.2, -0.4][f], pitch: 0, wings: WINGS[["up", "level", "down", "rising"][f]],
  tail: 3.5, tilt: 0, feet: "tuck", lean: 0.06, reach: [0.65, 5.1], la: -0.5 + [0, 0.03, 0.06, 0.03][f],
  rein: [6.6, -9.6], cape: CAPE_KEY([0, 1, 2, 1][f]), plume: [0, [0, 1, 2, 1][f] * 0.5], pen: [0, 0.8, 1.4, 0.8][f],
}));
const FIGHT = [
  { bob: 0, pitch: 0.3, wings: WINGS.dive, tail: 2.2, tilt: 0.12, feet: "tuck", lean: 0.2, couch: 3.4, la: 0.02, rein: [7.2, -9.8], cape: [[-6, -17.5], [-12, -16], [-9, -11]], plume: [-0.6, -1.6], pen: 0 },
  { bob: 1, pitch: 0.06, wings: WINGS.flare, tail: 5, tilt: -0.3, feet: [[0, 4, 2.5, 10.5], [3.5, 3, 6.5, 10]], lean: 0.38, reach: [0.95, 6.6], la: 1.08, grip: 3.5, rein: [7.8, -9.4], cape: [[-4, -19], [-8, -19], [-8, -13]], plume: [1.2, -2.4], pen: 1.6 },
  { bob: 0.5, pitch: -0.12, wings: WINGS.spread, tail: 5.5, tilt: -0.36, feet: [[0, 4, -2.5, 9.5], [3, 3, 1.5, 10.5]], lean: 0.46, reach: [1.2, 6.4], la: 1.5, grip: 3.5, rein: [7.8, -9], cape: [[-3, -20], [-5, -20.5], [-7, -14]], plume: [2, -2.6], pen: 1 },
  { bob: -1, pitch: -0.3, wings: WINGS.beat, tail: 4, tilt: 0.1, feet: [[-3, 3, -8, 7]], lean: 0.02, reach: [0.9, 5.4], la: 0.72, grip: 7, rein: [6.6, -9.6], cape: [[-6, -13], [-12, -7], [-8, -5]], plume: [-0.4, 1.6], pen: 1.4 },
];
export const CLIPS = {
  idle: { n: 4, ms: 500, loop: true, pose: (ph) => WALK[Math.round(ph * 4) % 4] },
  walk: { n: 4, ms: 500, loop: true, pose: (ph) => WALK[Math.round(ph * 4) % 4] },
  attack: { n: 4, ms: 900, loop: false, pose: (ph) => FIGHT[Math.round(ph * 3) % 4] },
};

const rot = ([x, y], [px, py], a) => { const c = Math.cos(a), s = Math.sin(a); return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; };
const solve = (sh, to) => {
  const dx = to[0] - sh[0], dy = to[1] - sh[1], L = Math.hypot(dx, dy) || 1e-6;
  const d = clamp(L, Math.abs(UP - FORE) + 0.3, UP + FORE - 0.05);
  const hand = [sh[0] + dx / L * d, sh[1] + dy / L * d];
  const a = Math.atan2(dy, dx), k = Math.acos(clamp((UP * UP + d * d - FORE * FORE) / (2 * UP * d), -1, 1));
  return { el: [sh[0] + Math.cos(a + k) * UP, sh[1] + Math.sin(a + k) * UP], hand };
};
const armFor = (k) => {
  const sh = rot(SH, SEAT, k.lean), dir = [Math.cos(k.la), Math.sin(k.la)];
  let hand;
  if (k.couch != null) { const pit = rot([SH[0] + 0.2, SH[1] + 1.9], SEAT, k.lean); hand = [pit[0] + dir[0] * k.couch, pit[1] + dir[1] * k.couch]; }
  else hand = [sh[0] + Math.cos(k.reach[0]) * k.reach[1], sh[1] + Math.sin(k.reach[0]) * k.reach[1]];
  return { sh, ...solve(sh, hand), dir };
};

export const draw = (px, F) => {
  const k = F.sk.p;
  const Y = -9 + k.bob, cp = Math.cos(k.pitch), sp = Math.sin(k.pitch);
  // a point in the eagle's frame (units, y down from the body centre) -> art pixels about the anchor;
  // the whole bird pitches about its body centre, nose down in the dive
  const at = ([x, y]) => { const yy = Y + y + 9; return [(x * cp - yy * sp) * 2, (x * sp + yy * cp - 9) * 2]; };
  const W = k.wings;
  const info = {};

  // one wing: membrane under, five long primaries fanned off the hand, secondaries down the arm, lit coverts
  const wingOf = (pts, far, z0) => {
    const [S, Wr, T, R] = pts.map(at), b = far ? -1 : 0;
    const dx = T[0] - Wr[0], dy = T[1] - Wr[1], dl = Math.hypot(dx, dy) || 1;
    let nx = -dy / dl, ny = dx / dl;
    if (nx * (R[0] - Wr[0]) + ny * (R[1] - Wr[1]) < 0) { nx = -nx; ny = -ny; }
    const angT = Math.atan2(dy, dx), angN = Math.atan2(ny, nx);
    let d = angN - angT; d = ((d + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    px.part();
    px.poly([S, Wr, T, [Wr[0] + (R[0] - Wr[0]) * 0.55 + dx * 0.35, Wr[1] + (R[1] - Wr[1]) * 0.55 + dy * 0.35], R], WING, z0, { round: 0.5, bias: b - 1, cast: 1, floor: 1 });
    for (let i = 5; i >= 0; i--) {
      const kk = i / 5, bx = Wr[0] + dx * 0.12 * kk + nx * kk * 4.4, by = Wr[1] + dy * 0.12 * kk + ny * kk * 4.4;
      const a = angT + d * kk * 0.42, len = dl * (1 - kk * 0.22);
      px.part();
      px.capsule(bx, by, 2.1, bx + Math.cos(a) * len, by + Math.sin(a) * len, 0.95, i % 2 ? WING : WINGP, z0 + 0.1 + (5 - i) * 0.01, { bias: b + (i % 2 ? 0 : -1), floor: 1, cast: 1, round: 0.8 });
    }
    for (let i = 0; i < 5; i++) {
      const kk = (i + 0.5) / 5, bx = S[0] + (Wr[0] - S[0]) * kk + (R[0] - S[0]) * (1 - kk) * 0.6, by = S[1] + (Wr[1] - S[1]) * kk + (R[1] - S[1]) * (1 - kk) * 0.6;
      const a = angN - d * 0.28;
      px.part();
      px.capsule(bx, by, 2.5, bx + Math.cos(a) * 12, by + Math.sin(a) * 12, 1.3, i % 2 ? WINGP : WING, z0 + 0.2 + i * 0.01, { bias: b + (i % 2 ? -1 : 0), floor: 1, cast: 1, round: 0.8 });
      px.dot(bx + Math.cos(a) * 12, by + Math.sin(a) * 12, WINGC, z0 + 0.26, { fix: far ? 2 : 3, noLine: true });
    }
    px.part();
    const hx = Wr[0] + dx * 0.2, hy = Wr[1] + dy * 0.2;
    px.poly([S, [(S[0] + Wr[0]) / 2 - nx * 3, (S[1] + Wr[1]) / 2 - ny * 3], Wr, [hx, hy], [hx + nx * 4.8, hy + ny * 4.8], [(Wr[0] + R[0]) / 2 + nx * 2.4, (Wr[1] + R[1]) / 2 + ny * 2.4], R], WINGC, z0 + 0.4, { round: 0.7, bias: b, cast: 1 });
    for (let i = 1; i < 4; i++) { const kk = i / 4; px.dot(S[0] + (Wr[0] - S[0]) * kk + nx * 3.2, S[1] + (Wr[1] - S[1]) * kk + ny * 3.2, HEAD, z0 + 0.45, { fix: far ? 2 : 3, noLine: true }); }
  };
  wingOf(W.far, true, 1);

  // the white tail, fanned wide to brake, tipped about its root
  const tl = (v) => at(rot(v, [-8, 0], k.tilt)), fan = k.tail;
  px.part();
  px.poly([at([-8, -2]), tl([-20, -fan - 1]), tl([-22, 0]), tl([-20, fan + 1]), at([-8, 2])], TAIL, 2, { round: 0.4, cast: 1 });
  for (const q of [-0.5, 0, 0.5]) px.line(...tl([-11, q * 2]), ...tl([-20.5, q * fan * 1.6]), TAILB, 2.1, { fix: 1, noLine: true });

  // feet: tucked back under the tail in flight, thrown forward to strike
  const foot = (x0, y0, x1, y1, open, z) => {
    const a = at([x0, y0]), f = at([x1, y1]);
    px.part();
    px.ellipse(a[0], a[1], 5, 4.2, THIGH, z, { cast: 1, floor: 1 });
    px.capsule(a[0] + (f[0] - a[0]) * 0.3, a[1] + (f[1] - a[1]) * 0.3, 1.9, f[0], f[1], 1.6, FOOT, z + 0.01, { cast: 0 });
    const toes = open ? [[2.4, -1.4], [2.8, 0.4], [1.6, 2.0], [-1.4, 1.2]] : [[1.4, 0.9], [0.3, 1.5], [-1, 1.2]];
    for (const [tx, ty] of toes) {
      px.capsule(f[0], f[1], 1.1, f[0] + tx * 2, f[1] + ty * 2, 0.8, FOOT, z + 0.02, { cast: 0 });
      px.dot(f[0] + tx * 2.5, f[1] + ty * 2.5, CLAW, z + 0.04, { noLine: true });
    }
  };
  const tucked = k.feet === "tuck" || k.feet.length === 1;
  if (k.feet === "tuck") foot(-3, 3, -9, 5.5, false, 3);
  else if (tucked) foot(...k.feet[0], false, 3);

  // the body: a deep brown barrel, feathered thighs under it
  px.part();
  const bc = at([0, 0]);
  px.ellipse(bc[0], bc[1], 23, 11.6, BODY, 4, { rot: k.pitch, cast: 1 });
  px.part();
  const th = at([-3, 3.2]);
  px.ellipse(th[0], th[1], 10, 5.2, THIGH, 4.1, { rot: k.pitch, cast: 0, bias: -1 });
  // a few feather ticks across the breast
  for (const [x, y] of [[4, -1], [6.5, 1.5], [2, 2.5], [8, -2.5]]) { const p = at([x, y]); px.dot(p[0], p[1], BODY, 4.2, { fix: 1, noLine: true }); }
  if (!tucked) for (const f of k.feet) foot(...f, true, 5);

  // war tack: a crown-blue saddlecloth with a gold hem, a breast strap with a brass stud
  px.part();
  px.poly([at([-6, -5.4]), at([5, -5.6]), at([4, 0.5]), at([-5, 0.5])], SADDLE, 6, { round: 0.4, cast: 1 });
  px.poly([at([-5, 0]), at([4, 0]), at([4, 1]), at([-5, 1])], GOLD, 6.05, { fix: 3 });
  px.line(...at([4.5, -3]), ...at([9, 1]), LEATHER, 6.1, { noLine: true });
  px.line(...at([4.5, -2.4]), ...at([9, 1.6]), LEATHER, 6.1, { noLine: true });
  px.dot(...at([6.8, -0.8]), GOLD, 6.12, { fix: 4, noLine: true });

  // neck, the white head, the hooked gold beak, the fierce eye under a heavy brow
  px.part();
  const nk = at([9, -3.2]);
  px.ellipse(nk[0], nk[1], 10, 8.8, HEAD, 6.5, { cast: 1 });
  px.part();
  const hh = [13, -6.4], hd = at(hh);
  px.ellipse(hd[0], hd[1], 8.8, 7.2, HEAD, 7, { cast: 1 });
  px.part();
  px.poly([at([hh[0] + 2.4, hh[1] - 1.8]), at([hh[0] + 4.6, hh[1] - 2.6]), at([hh[0] + 6.8, hh[1] - 1.6]), at([hh[0] + 7.6, hh[1] + 0.8]), at([hh[0] + 6.8, hh[1] + 2.6]), at([hh[0] + 6, hh[1] + 1.2]), at([hh[0] + 3, hh[1] + 1.8])], BEAK, 7.2, { round: 0.8, cast: 1 });
  px.line(...at([hh[0] + 3.2, hh[1] + 0.7]), ...at([hh[0] + 6.2, hh[1] + 0.8]), LEATHER, 7.25, { fix: 1, noLine: true });
  px.part();
  px.rect(...at([hh[0] + 0.2, hh[1] - 2.6]), 8, 2, BROW, 7.3, { noLine: true });
  px.dot(...at([hh[0] + 1.6, hh[1] - 0.8]), EYE, 7.4, { noLine: true }); px.dot(...at([hh[0] + 2.1, hh[1] - 0.8]), PUPIL, 7.45, { noLine: true });

  // near wing, then the knight over it
  wingOf(W.near, false, 8);

  // ---- the falconer ----
  const R = (v) => at(rot(v, SEAT, k.lean));
  // her cape streams off her shoulders
  px.part();
  { const [cc, ct, cb] = k.cape, p0 = R([0, -15]);
    px.poly([p0, at(cc), at(ct), at(cb), R([-3, -8]), R([1, -12])], CAPE, 12, { round: 0.5, cast: 1 }); }
  // seated: thigh forward along the saddle, boot in the stirrup
  px.part();
  px.capsule(...at([1, -6.5]), 2.8, ...at([5.5, -4]), 2.5, STEELD, 12.5, { cast: 1 });
  px.capsule(...at([5.5, -4]), 2.5, ...at([4.5, 0]), 2, STEELD, 12.5, { cast: 1 });
  px.rect(...at([3.4, -0.6]), 5.2, 3, LEATHER, 12.6);
  // the far arm on the reins
  { const fsh = rot(FAR_SH, SEAT, k.lean), { el, hand } = solve(fsh, k.rein);
    px.part();
    px.capsule(...at(fsh), 1.9, ...at(el), 1.8, STEELD, 12.7, { cast: 1 });
    px.capsule(...at(el), 1.8, ...at(hand), 1.6, STEELD, 12.7, { cast: 1 });
    px.line(...at(hand), ...at([15.5, -5]), LEATHER, 12.72, { noLine: true }); }
  // torso: mail under a crown-blue tabard, a gold belt and stripe
  px.part();
  px.poly([R([-0.4, -16]), R([4.6, -16]), R([4.2, -6]), R([-0.2, -6])], SADDLE, 13, { round: 0.6, cast: 1 });
  px.poly([R([-0.2, -16.2]), R([4.6, -16.2]), R([4.6, -14.6]), R([-0.2, -14.6])], STEEL, 13.05, { cast: 0 });
  px.poly([R([-0.2, -8.2]), R([4.2, -8.2]), R([4.2, -7.2]), R([-0.2, -7.2])], GOLD, 13.05, { fix: 3, cast: 0 });
  px.line(...R([2.1, -14.4]), ...R([2.1, -9]), GOLD, 13.06, { fix: 3, noLine: true });
  // head: a face under a round steel helm, a nasal, a plume
  const hc = R([2.6, -18.6]);
  px.part();
  px.ellipse(hc[0] + 0.6, hc[1] + 0.6, 4.6, 5, SKIN, 14, { cast: 1 });
  px.dot(hc[0] + 3, hc[1] + 0.4, RIDEYE, 14.1, { noLine: true });
  px.part();
  px.ellipse(hc[0], hc[1] - 1.2, 5.6, 4.6, STEEL, 14.2, { cast: 1 });
  px.rect(hc[0] - 5.6, hc[1] - 1.6, 3.2, 6, STEEL, 14.21, { cast: 0, bias: -1 });
  px.rect(hc[0] + 3.2, hc[1] - 1.6, 1.8, 4.8, STEELD, 14.22, { cast: 0, noLine: true });
  px.part();
  { const [ox, oy] = k.plume;
    px.poly([[hc[0] - 0.8, hc[1] - 5.6], [hc[0] - 5 + (ox * 0), hc[1] - 11.6 + oy], [hc[0] - 12 + ox * 2, hc[1] - 7.2 + oy * 2], [hc[0] - 6, hc[1] - 7.2], [hc[0] - 3.6, hc[1] - 4]], PLUME, 14.3, { round: 0.6, cast: 1 }); }

  // the lance, pennon flying, in the near fist
  const A = armFor(k), [ca, sa] = A.dir, back = k.grip ?? GRIP, fwd = SHAFT - back;
  const sh = at(A.sh), el = at(A.el), hdn = at(A.hand);
  px.part();
  px.capsule(hdn[0] - ca * back * 2, hdn[1] - sa * back * 2, 1.2, hdn[0] + ca * fwd * 2, hdn[1] + sa * fwd * 2, 1.2, WOOD, 15, { cast: 1 });
  { const tx = hdn[0] + ca * fwd * 2, ty = hdn[1] + sa * fwd * 2;
    px.poly([[tx + ca * HEAD_LEN * 2, ty + sa * HEAD_LEN * 2], [tx - sa * 2.8, ty + ca * 2.8], [tx + sa * 2.8, ty - ca * 2.8]], LANCE, 15.1, { fix: 3 });
    const ppx = hdn[0] + ca * (PENNON - back) * 2, ppy = hdn[1] + sa * (PENNON - back) * 2, wv = k.pen * 2;
    px.part();
    if (sa < 0.5) px.poly([[ppx, ppy], [ppx - ca * 12 + 2.4, ppy - sa * 12 - 2.4 + wv], [ppx - ca * 9.2 + 3.2, ppy - sa * 9.2 + 1.2 + wv * 0.5], [ppx - ca * 12.4 + 5.6, ppy - sa * 12.4 + 2.8 + wv], [ppx - ca * 3 + 4.8, ppy - sa * 3 + 4.4]], CAPE, 15.2, { round: 0.4, cast: 1 });
    else { const bl = Math.hypot(1, 0.2), B = [-1 / bl, 0.2 / bl], Au = [-ca, -sa], Fp = (b, a) => [ppx + (B[0] * b + Au[0] * a) * 2, ppy + (B[1] * b + Au[1] * a) * 2];
      px.poly([[ppx, ppy], Fp(6, -0.4 + k.pen * 0.5), Fp(4.4, 1.1 + k.pen * 0.25), Fp(6.2, 2.4 + k.pen * 0.5), Fp(0, 2.4)], CAPE, 15.2, { round: 0.4, cast: 1 }); }
    px.dot(ppx, ppy, GOLD, 15.3, { fix: 4, noLine: true }); }
  // the arm over the shaft, the fist
  px.part();
  px.capsule(sh[0], sh[1], 2, el[0], el[1], 1.9, STEELD, 15.5, { cast: 1 });
  px.capsule(el[0], el[1], 1.9, hdn[0], hdn[1], 1.7, STEELD, 15.5, { cast: 1 });
  px.ellipse(hdn[0], hdn[1], 2.6, 2.6, STEEL, 15.6, { cast: 1 });
  return info;
};
