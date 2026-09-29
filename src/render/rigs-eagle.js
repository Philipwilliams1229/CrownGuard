// ============ RIGS: THE SKYKNIGHT'S WAR-EAGLE ============
// The Falconry's Skyknight form: the eagle and its rider, painted as one
// rig ("eagle" in rigs.js RIGS); draw.js flies it (the eagle's state is
// update.js t.eagle).
//
// "walk" is the cruise, the wingbeat: 0 up, 1 level, 2 down, 3 rising.
// "fight" is the lance pass, four frames the eagle's strafing run plays in
// order (and the air duel reuses — see draw.js):
//   0 THE DIVE      body pitched nose-down, wings half folded back, talons
//                   tucked; the lance couched under the arm, aimed down the dive
//   1 THE STRIKE    pulling out at the bottom: wings thrown up and forward,
//                   talons thrown forward, the rider driving the lance
//                   down-forward through the prey with his whole arm
//   2 FOLLOW-THROUGH the lance carried on down past the prey, the rider low
//                   over the eagle's neck; wings wide to brake, tail fanned
//   3 THE CLIMB     nose up, the big downstroke that lifts her out; the
//                   lance coming back up toward the couch
// The cape and the plume trail it all: they stream up off the rider's back
// in the dive, whip forward as the eagle brakes, and stream down behind as
// she climbs. The rider always sits in front of the near wing.

import { lighten, darken, rgba, ball, lin, part } from "./paint.js";
import { lit, eye } from "./rigs.js";
import { logJoint } from "./folk-kit.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// a limb of two bones as ONE inked part (upper arm and forearm, thigh and
// shin): the ink runs round the whole limb, never across the joint (owner,
// 2026-09-29). Each bone lit across its width like rigs.js `limb`.
const bone = (c, x0, y0, x1, y1, w, col) => {
  c.strokeStyle = lit(c, x0, w * 2, col); c.lineWidth = w; c.lineCap = "round";
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
};
const limb2 = (ctx, a, b, e, w0, w1, col0, col1 = col0) => part(ctx, (c) => { bone(c, ...a, ...b, w0, col0); bone(c, ...b, ...e, w1, col1); });
// the rider's arm in the eagle's units: shoulder to elbow, elbow to the fist
const UP = 3.6, FORE = 3.4;
const SEAT = [2, -6.5];                 // he leans about his seat
const SH = [3.2, -14.4], FAR_SH = [2.4, -14.0];
// the lance: 24 of shaft and a 4 head; the fist holds it `grip` from the
// butt (9 carried and couched; slid down to the butt end for the thrust, so
// the point reaches well below the talons)
const SHAFT = 24, GRIP = 9, PENNON = 21, HEAD_LEN = 4;

// wings: shoulder, wrist, tip, trailing root, as (x, y) from the body centre
const WINGS = {
  up: { far: [[-1, -6], [-5, -19], [-17, -32], [-9, -4]], near: [[-2, -4], [-8, -16], [-23, -25], [-10, -2]] },
  level: { far: [[-1, -6], [-3, -15], [-16, -24], [-9, -4]], near: [[-1, 0], [-3, 8], [-15, 15], [-9, 1]] },
  down: { far: [[-2, -4], [-6, -1], [-15, 5], [-9, -2]], near: [[0, 1], [1, 9], [-8, 17], [-8, 2]] },
  rising: { far: [[-1, -6], [-4, -17], [-18, -27], [-9, -4]], near: [[-1, 0], [-4, 6], [-17, 12], [-9, 1]] },
  // half folded for the dive: the wrists drawn in, the hands swept back
  dive: { far: [[-1, -6], [-5, -13], [-21, -18], [-9, -4]], near: [[-2, -4], [-7, -10], [-24, -13], [-10, -2]] },
  // the strike: thrown up and forward, the talons swinging under
  flare: { far: [[-1, -6], [2, -19], [-6, -33], [-9, -4]], near: [[-2, -4], [0, -16], [-11, -29], [-10, -2]] },
  // braking: opened wide, every feather spread — the far wing high, the near
  // one out level toward us (so it reads low), the first beat of the climb
  spread: { far: [[-1, -6], [-4, -18], [-17, -29], [-9, -4]], near: [[-1, 0], [-4, 7], [-18, 13], [-9, 1]] },
  // the climb's downstroke, driven all the way under
  beat: { far: [[-2, -4], [-6, 0], [-15, 7], [-9, -2]], near: [[0, 1], [2, 10], [-6, 19], [-8, 2]] },
};

// Key poses. pitch turns the whole bird about its body centre (+ nose down);
// lean turns the rider about his seat (+ forward); the near fist is either
// couched (on the lance's line, `couch` along it from the armpit) or out at
// `reach` [angle, length] from the shoulder; la is the lance's angle in the
// eagle's frame (+ tip down); rein is the far fist. cape: the cape's
// [control, tip, lower corner]; plume: its tip's offset; pen: the pennon's wave.
const CAPE = (fl) => [[-6, -15 + fl], [-11, -11 + fl], [-8, -8 + fl * 0.5]];
const WALK = [0, 1, 2, 3].map((f) => ({
  bob: [0.8, 0, -1.2, -0.4][f], pitch: 0, wings: WINGS[["up", "level", "down", "rising"][f]],
  tail: 3.5, tilt: 0, feet: "tuck", lean: 0.06, reach: [0.65, 5.1], la: -0.5 + [0, 0.03, 0.06, 0.03][f],
  rein: [6.6, -9.6], cape: CAPE([0, 1, 2, 1][f]), plume: [0, [0, 1, 2, 1][f] * 0.5], pen: [0, 0.8, 1.4, 0.8][f],
}));
const FIGHT = [
  { // 0 the dive
    bob: 0, pitch: 0.3, wings: WINGS.dive, tail: 2.2, tilt: 0.12, feet: "tuck", lean: 0.2, couch: 3.4, la: 0.02,
    rein: [7.2, -9.8], cape: [[-6, -17.5], [-12, -16], [-9, -11]], plume: [-0.6, -1.6], pen: 0,
  },
  { // 1 the strike
    bob: 1, pitch: 0.06, wings: WINGS.flare, tail: 5, tilt: -0.3, feet: [[0, 4, 2.5, 10.5], [3.5, 3, 6.5, 10]], lean: 0.38, reach: [0.95, 6.6], la: 1.08, grip: 3.5,
    rein: [7.8, -9.4], cape: [[-4, -19], [-8, -19], [-8, -13]], plume: [1.2, -2.4], pen: 1.6,
  },
  { // 2 follow-through
    bob: 0.5, pitch: -0.12, wings: WINGS.spread, tail: 5.5, tilt: -0.36, feet: [[0, 4, -2.5, 9.5], [3, 3, 1.5, 10.5]], lean: 0.46, reach: [1.2, 6.4], la: 1.5, grip: 3.5,
    rein: [7.8, -9], cape: [[-3, -20], [-5, -20.5], [-7, -14]], plume: [2, -2.6], pen: 1,
  },
  { // 3 the climb
    bob: -1, pitch: -0.3, wings: WINGS.beat, tail: 4, tilt: 0.1, feet: [[-3, 3, -8, 7]], lean: 0.02, reach: [0.9, 5.4], la: 0.72, grip: 7,
    rein: [6.6, -9.6], cape: [[-6, -13], [-12, -7], [-8, -5]], plume: [-0.4, 1.6], pen: 1.4,
  },
];
const keyOf = (p) => (p.pose === "fight" ? FIGHT[(p.frame || 0) % 4] : WALK[(p.frame || 0) % 4]);

// the rider's near arm and lance for a key pose, in the eagle's (unpitched)
// frame: shoulder, elbow, fist, and the lance's unit direction
const rot = ([x, y], [px, py], a) => { const c = Math.cos(a), s = Math.sin(a); return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; };
const armFor = (k) => {
  const sh = rot(SH, SEAT, k.lean);
  const dir = [Math.cos(k.la), Math.sin(k.la)];
  let hand;
  if (k.couch != null) {
    // couched: the butt runs back under the armpit, the fist ahead of it
    const pit = rot([SH[0] + 0.2, SH[1] + 1.9], SEAT, k.lean);
    hand = [pit[0] + dir[0] * k.couch, pit[1] + dir[1] * k.couch];
  } else hand = [sh[0] + Math.cos(k.reach[0]) * k.reach[1], sh[1] + Math.sin(k.reach[0]) * k.reach[1]];
  return { sh, ...solve(sh, hand), dir };
};
// two bones that keep their length; the elbow folds the natural way (the
// forearm swings forward and up off the upper arm) — a fist out of reach is
// pulled in to it rather than stretching the arm
const solve = (sh, to) => {
  const dx = to[0] - sh[0], dy = to[1] - sh[1], L = Math.hypot(dx, dy) || 1e-6;
  const d = clamp(L, Math.abs(UP - FORE) + 0.3, UP + FORE - 0.05);
  const hand = [sh[0] + dx / L * d, sh[1] + dy / L * d];
  const a = Math.atan2(dy, dx), k = Math.acos(clamp((UP * UP + d * d - FORE * FORE) / (2 * UP * d), -1, 1));
  return { el: [sh[0] + Math.cos(a + k) * UP, sh[1] + Math.sin(a + k) * UP], hand };
};

// Where the lance's point is for a fight frame, from the anchor (under the
// feet), facing +x, in world units: draw.js can aim the pass so the point
// meets the prey, and put the strike's spark there.
export const eagleLanceTip = (frame, len = 34) => {
  const s = len / 34, k = FIGHT[frame % 4], { hand, dir } = armFor(k);
  const fwd = SHAFT - (k.grip ?? GRIP) + HEAD_LEN;
  const tip = [hand[0] + dir[0] * fwd, hand[1] + dir[1] * fwd + k.bob];
  const [x, y] = rot(tip, [0, 0], k.pitch);           // about the body centre, 9 above the anchor
  return [x * s, (y - 9) * s];
};

export const eagle = (ctx, p) => {
  const s = (p.len ?? 34) / 34;
  const P = (x, y) => [x * s, y * s];
  const k = keyOf(p);
  const Y = -9 + k.bob;                                   // body centre, above the anchor
  const col = p.col, wingC = p.wing, head = p.head || "#f0ead8", tailC = p.tail || "#ece4d2";
  const beakC = p.beak || "#e8b840", footC = p.foot || "#e8b840";
  const r = p.rider || {};
  ctx.save();
  // the whole bird pitches about its body centre: nose down in the dive, up in the climb
  if (k.pitch) { ctx.translate(0, -9 * s); ctx.rotate(k.pitch); ctx.translate(0, 9 * s); }
  const W = k.wings;
  const at = ([x, y]) => P(x, Y + y);
  const wingOf = ([S0, W0, T0, R0], far) => {
    const [sx, sy] = at(S0), [wx, wy] = at(W0), [tx, ty] = at(T0), [rx, ry] = at(R0);
    const base = far ? darken(wingC, 0.28) : wingC;
    const dx = tx - wx, dy = ty - wy, dl = Math.hypot(dx, dy) || 1;
    let nx = -dy / dl, ny = dx / dl;                    // across the hand, toward the trailing edge
    if (nx * (rx - wx) + ny * (ry - wy) < 0) { nx = -nx; ny = -ny; }
    const angT = Math.atan2(dy, dx), angN = Math.atan2(ny, nx);
    // one flight feather: a long tapered blade from (bx, by) along `ang`
    const feather = (c, bx, by, ang, len, w) => {
      const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
      c.beginPath();
      c.moveTo(bx + px * w / 2, by + py * w / 2);
      c.quadraticCurveTo(bx + ux * len * 0.7 + px * w * 0.55, by + uy * len * 0.7 + py * w * 0.55, bx + ux * len, by + uy * len);
      c.quadraticCurveTo(bx + ux * len * 0.7 - px * w * 0.45, by + uy * len * 0.7 - py * w * 0.45, bx - px * w / 2, by - py * w / 2);
      c.closePath(); c.fill();
    };
    // the fingered primaries, fanned from the hand toward the tip
    part(ctx, (c) => {
      for (let i = 4; i >= 0; i--) {
        const k2 = i / 4, bx = wx + dx * 0.12 * k2 + nx * k2 * 2.2 * s, by = wy + dy * 0.12 * k2 + ny * k2 * 2.2 * s;
        const ang = angT + (angN - angT > Math.PI ? angN - angT - Math.PI * 2 : angN - angT < -Math.PI ? angN - angT + Math.PI * 2 : angN - angT) * k2 * 0.42;
        c.fillStyle = i % 2 ? darken(base, 0.5) : darken(base, 0.4);
        feather(c, bx, by, ang, dl * (1 - k2 * 0.22), 2.8 * s);
      }
    });
    // the secondaries along the arm's trailing edge, pale-tipped
    part(ctx, (c) => {
      for (let i = 0; i < 5; i++) {
        const k2 = (i + 0.5) / 5;
        const bx = sx + (wx - sx) * k2 + (rx - sx) * (1 - k2) * 0.6, by = sy + (wy - sy) * k2 + (ry - sy) * (1 - k2) * 0.6;
        const ang = angN - (angN - angT > Math.PI ? angN - angT - Math.PI * 2 : angN - angT < -Math.PI ? angN - angT + Math.PI * 2 : angN - angT) * 0.28;
        c.fillStyle = i % 2 ? darken(base, 0.3) : darken(base, 0.22);
        feather(c, bx, by, ang, 6.5 * s, 3.2 * s);
      }
    });
    // the coverts: the lit shoulder of the wing, over the feathers' roots
    part(ctx, (c) => {
      const hx = wx + dx * 0.2, hy = wy + dy * 0.2;
      c.beginPath(); c.moveTo(sx, sy);
      c.quadraticCurveTo((sx + wx) / 2 - nx * 1.6 * s, (sy + wy) / 2 - ny * 1.6 * s, wx, wy);
      c.lineTo(hx, hy); c.lineTo(hx + nx * 2.4 * s, hy + ny * 2.4 * s);
      c.quadraticCurveTo((wx + rx) / 2 + nx * 1.2 * s, (wy + ry) / 2 + ny * 1.2 * s, rx, ry);
      c.closePath();
      c.fillStyle = lin(c, wx - nx * s, wy - ny * s, wx + nx * 4 * s, wy + ny * 4 * s, [[0, lighten(base, far ? 0.15 : 0.35)], [0.5, base], [1, darken(base, 0.2)]]);
      c.fill();
      c.fillStyle = rgba(lighten(base, 0.5), far ? 0.3 : 0.6);
      for (let i = 1; i < 4; i++) { const k2 = i / 4; c.fillRect(sx + (wx - sx) * k2 + nx * 1.6 * s, sy + (wy - sy) * k2 + ny * 1.6 * s, 1, 1); }
    });
  };

  // far wing, behind everything
  wingOf(W.far, true);
  // the white tail, fanned (wide to brake), tipped down or up about its root
  part(ctx, (c) => {
    const fan = k.tail, tl = (v) => at(rot(v, [-8, 0], k.tilt));
    const [ax, ay] = at([-8, -2]), [bx, by] = at([-8, 2]);
    const t0 = tl([-20, -fan - 1]), t1 = tl([-22, 0]), t2 = tl([-20, fan + 1]);
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(...t0); c.lineTo(...t1); c.lineTo(...t2); c.lineTo(bx, by); c.closePath();
    c.fillStyle = lin(c, 0, Math.min(ay, t0[1]) - s, 0, Math.max(by, t2[1]) + s, [[0, lighten(tailC, 0.3)], [0.5, tailC], [1, darken(tailC, 0.3)]]); c.fill();
    c.strokeStyle = rgba(darken(tailC, 0.4), 0.7); c.lineWidth = 0.8;
    for (const q of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(...tl([-11, q * 2])); c.lineTo(...tl([-20.5, q * fan * 1.6])); c.stroke(); }
  });
  // feet: tucked back under the tail in flight, thrown forward to strike
  const foot = (x0, y0, x1, y1, open) => {
    const [ax, ay] = at([x0, y0]), [fx, fy] = at([x1, y1]);
    // a feathered thigh, a short scaled shank, and a hand of hooked talons
    // the feathered thigh and the shank are one inked part (a colour step at the hock)
    part(ctx, (c) => { ball(c, ax, ay, 2.6 * s, 2.2 * s, darken(col, 0.15), { hi: 0.3, lo: 0.4 }); bone(c, ax + (fx - ax) * 0.3, ay + (fy - ay) * 0.3, fx, fy, 1.8 * s, footC); });
    part(ctx, (c) => {
      c.strokeStyle = footC; c.lineWidth = 1.2 * s; c.lineCap = "round";
      const toes = open ? [[2.4, -1.4], [2.8, 0.4], [1.6, 2.0], [-1.4, 1.2]] : [[1.4, 0.9], [0.3, 1.5], [-1, 1.2]];
      for (const [tx, ty] of toes) { c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + tx * s, fy + ty * s); c.stroke(); }
      c.fillStyle = "#2a2230";
      for (const [tx, ty] of toes) { const l = Math.hypot(tx, ty); c.fillRect(fx + tx * s + tx / l * 0.6 * s - 0.5, fy + ty * s + ty / l * 0.6 * s - 0.5, 1, 1); }
    });
  };
  const tucked = k.feet === "tuck" || k.feet.length === 1;
  if (k.feet === "tuck") foot(-3, 3, -9, 5.5, false);
  else if (tucked) foot(...k.feet[0], false);
  // the body: a deep brown barrel, darker underneath
  part(ctx, (c) => ball(c, ...at([0, 0]), 11.5 * s, 5.8 * s, col, { hi: 0.4, lo: 0.5 }));
  part(ctx, (c) => ball(c, ...at([-3, 3.2]), 5 * s, 2.6 * s, darken(col, 0.2), { hi: 0.2, lo: 0.4 }));   // feathered thighs
  if (!tucked) for (const f of k.feet) foot(...f, true);
  // war tack: a crown-blue saddlecloth with a gold hem, a breast strap
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(...at([-6, -5.4])); c.lineTo(...at([5, -5.6])); c.lineTo(...at([4, 0.5])); c.lineTo(...at([-5, 0.5])); c.closePath();
    c.fillStyle = lin(c, 0, (Y - 6) * s, 0, (Y + 1) * s, [[0, lighten(r.saddle || "#3a5474", 0.3)], [0.5, r.saddle || "#3a5474"], [1, darken(r.saddle || "#3a5474", 0.35)]]); c.fill();
    c.fillStyle = r.cloth2 || "#d8b34a"; c.fillRect(...at([-5, 0]), 9 * s, 1 * s);
    c.strokeStyle = "#4a3020"; c.lineWidth = 1.2 * s; c.beginPath(); c.moveTo(...at([4.5, -3])); c.lineTo(...at([9, 1])); c.stroke();
  });
  // neck, the white head, the hooked gold beak
  part(ctx, (c) => ball(c, ...at([9, -3.2]), 5 * s, 4.4 * s, head, { hi: 0.3, lo: 0.35 }));
  part(ctx, (c) => {
    const hx = 13, hy = -6.4;
    ball(c, ...at([hx, hy]), 4.4 * s, 3.6 * s, head, { hi: 0.4, lo: 0.35 });
    c.beginPath();
    c.moveTo(...at([hx + 2.4, hy - 1.8])); c.quadraticCurveTo(...at([hx + 6.6, hy - 2.2]), ...at([hx + 7.4, hy + 0.6]));
    c.lineTo(...at([hx + 6.6, hy + 2.4])); c.lineTo(...at([hx + 6, hy + 1])); c.lineTo(...at([hx + 3, hy + 1.6])); c.closePath();
    c.fillStyle = lin(c, 0, (Y + hy - 2) * s, 0, (Y + hy + 2.4) * s, [[0, lighten(beakC, 0.35)], [0.5, beakC], [1, darken(beakC, 0.4)]]); c.fill();
    c.fillStyle = "#6a4a2a"; c.fillRect(...at([hx + 3.2, hy + 0.4]), 3 * s, 0.8);   // the gape
  });
  // a fierce eye under a heavy brow
  eye(ctx, ...at([14.6, -7.1]), "#e8a030", 1.1 * s);
  eye(ctx, ...at([15, -7.1]), "#2a2230", 0.55 * s);
  ctx.fillStyle = "#4a4050"; ctx.fillRect(...at([13, -9]), 3.8 * s, 1.1 * s);

  // near wing, then the knight over it
  wingOf(W.near, false);

  const skin = r.skin || "#e8b990", cloth = r.cloth || "#3a5474", steel = r.steel || "#b8bcc4";
  const cape = r.cape || "#a0303a", plume = r.plume || "#e8e2d0", wcol = r.wcol || "#dde2ea";
  const R = (v) => rot(v, SEAT, k.lean);                // the rider's frame: leaned about his seat
  const atR = (v) => at(R(v));
  // his cape streams off his shoulders: up in the dive, forward as she
  // brakes, down behind as she climbs
  part(ctx, (c) => {
    const [cc, ct, cb] = k.cape;
    c.beginPath(); c.moveTo(...atR([0, -15])); c.quadraticCurveTo(...at(cc), ...at(ct));
    c.lineTo(...at(cb)); c.lineTo(...atR([-3, -8])); c.lineTo(...atR([1, -12])); c.closePath();
    const ys = [atR([0, -15])[1], at(ct)[1], at(cb)[1], atR([-3, -8])[1]];
    c.fillStyle = lin(c, 0, Math.min(...ys), 0, Math.max(...ys), [[0, lighten(cape, 0.25)], [0.5, cape], [1, darken(cape, 0.35)]]); c.fill();
  });
  // seated: thigh forward along the saddle, boot in the stirrup
  limb2(ctx, at([1, -6.5]), at([5.5, -4]), at([4.5, 0]), 2.8 * s, 2.2 * s, darken(steel, 0.15), darken(steel, 0.25));
  part(ctx, (c) => { c.fillStyle = "#4a3020"; c.fillRect(...at([3.6, -0.6]), 2.6 * s, 1.4 * s); });
  // the far arm on the reins
  {
    const fsh = R(FAR_SH), { el, hand } = solve(fsh, k.rein);
    logJoint(ctx, "arm", at(fsh), at(el), at(hand), { lens: [UP * s, FORE * s] });
    limb2(ctx, at(fsh), at(el), at(hand), 1.8 * s, 1.7 * s, darken(steel, 0.3));
    ctx.strokeStyle = "#4a3020"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(...at(hand)); ctx.quadraticCurveTo(...at([11, hand[1] + 1.5]), ...at([15.5, -5])); ctx.stroke();
  }
  // torso and head lean together about the seat
  ctx.save();
  if (k.lean) { const [px, py] = at(SEAT); ctx.translate(px, py); ctx.rotate(k.lean); ctx.translate(-px, -py); }
  // torso: mail under a crown-blue tabard, a gold belt
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(...at([-0.4, -16])); c.lineTo(...at([4.6, -16])); c.lineTo(...at([4.2, -6])); c.lineTo(...at([-0.2, -6])); c.closePath();
    c.fillStyle = lit(c, 2.2 * s, 5 * s, cloth); c.fill();
    c.fillStyle = steel; c.fillRect(...at([-0.2, -16.2]), 4.8 * s, 1.6 * s);      // mail at the shoulders
    c.fillStyle = r.cloth2 || "#d8b34a"; c.fillRect(...at([-0.2, -8.2]), 4.4 * s, 1 * s);
    c.fillRect(...at([1.7, -14.4]), 0.9 * s, 5.4 * s);                             // a gold stripe down the tabard
  });
  // head: a face under a round steel helm with a nasal and a plume
  const [hx, hy] = at([2.6, -18.6]);
  part(ctx, (c) => ball(c, hx + 0.3 * s, hy + 0.3 * s, 2.3 * s, 2.5 * s, skin, { hi: 0.4, lo: 0.4 }));
  eye(ctx, hx + 1.5 * s, hy + 0.1 * s, "#2a2230", 0.5 * s);
  part(ctx, (c) => {
    c.beginPath(); c.ellipse(hx, hy - 0.6 * s, 2.8 * s, 2.4 * s, 0, Math.PI * 0.95, Math.PI * 2.05); c.closePath();
    c.fillStyle = lit(c, hx, 5.6 * s, steel); c.fill();
    c.fillRect(hx - 2.8 * s, hy - 0.8 * s, 1.6 * s, 3 * s);                        // the neck guard
    c.fillStyle = darken(steel, 0.2); c.fillRect(hx + 1.6 * s, hy - 0.8 * s, 0.9 * s, 2.4 * s);   // nasal
  });
  part(ctx, (c) => {
    const [ox, oy] = k.plume;
    c.beginPath(); c.moveTo(hx - 0.4 * s, hy - 2.8 * s);
    c.quadraticCurveTo(hx - 2.5 * s, hy - 5.8 * s + oy * 0.5 * s, hx - 6 * s + ox * s, hy - 3.6 * s + oy * s);
    c.quadraticCurveTo(hx - 3 * s, hy - 3.6 * s, hx - 1.8 * s, hy - 2 * s); c.closePath();
    c.fillStyle = plume; c.fill();
  });
  ctx.restore();
  // the lance, pennon flying, in the near fist: under the arm when couched,
  // driven with the whole arm in the strike
  const A = armFor(k), [ca, sa] = A.dir, back = k.grip ?? GRIP, fwd = SHAFT - back;
  const [shx, shy] = at(A.sh), [elx, ely] = at(A.el), [hdx, hdy] = at(A.hand);
  logJoint(ctx, "arm", [shx, shy], [elx, ely], [hdx, hdy], { lens: [UP * s, FORE * s] });
  part(ctx, (c) => {
    c.lineCap = "round";
    c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.4 * s;
    c.beginPath(); c.moveTo(hdx - ca * back * s, hdy - sa * back * s); c.lineTo(hdx + ca * fwd * s, hdy + sa * fwd * s); c.stroke();
    const tx = hdx + ca * fwd * s, ty = hdy + sa * fwd * s;
    c.fillStyle = wcol; c.beginPath(); c.moveTo(tx + ca * HEAD_LEN * s, ty + sa * HEAD_LEN * s); c.lineTo(tx - sa * 1.4 * s, ty + ca * 1.4 * s); c.lineTo(tx + sa * 1.4 * s, ty - ca * 1.4 * s); c.closePath(); c.fill();
    // a swallow-tailed pennon behind the head: on a lance carried level or
    // raised it streams back and droops below the shaft; on a lance driven
    // steeply down it flies straight back off the shaft, into the wind
    const px = hdx + ca * (PENNON - back) * s, py = hdy + sa * (PENNON - back) * s, wv = k.pen * s;
    c.fillStyle = cape; c.beginPath(); c.moveTo(px, py);
    if (sa < 0.5) {
      c.lineTo(px - ca * 6 * s + 1.2 * s, py - sa * 6 * s - 1.2 * s + wv);
      c.lineTo(px - ca * 4.6 * s + 1.6 * s, py - sa * 4.6 * s + 0.6 * s + wv * 0.5); c.lineTo(px - ca * 6.2 * s + 2.8 * s, py - sa * 6.2 * s + 1.4 * s + wv);
      c.lineTo(px - ca * 1.5 * s + 2.4 * s, py - sa * 1.5 * s + 2.2 * s);
    } else {
      const bl = Math.hypot(1, 0.2), B = [-1 / bl, 0.2 / bl], A = [-ca, -sa];     // B the wind, A up the shaft
      const F = (b, a) => [px + (B[0] * b + A[0] * a) * s, py + (B[1] * b + A[1] * a) * s];
      c.lineTo(...F(6, -0.4 + k.pen * 0.5)); c.lineTo(...F(4.4, 1.1 + k.pen * 0.25)); c.lineTo(...F(6.2, 2.4 + k.pen * 0.5)); c.lineTo(...F(0, 2.4));
    }
    c.closePath(); c.fill();
    c.fillStyle = r.cloth2 || "#d8b34a"; c.fillRect(px - 0.4, py - 0.4, 1.2 * s, 1.2 * s);
  });
  // the arm over the shaft: upper arm clamping it, forearm to the fist
  limb2(ctx, [shx, shy], [elx, ely], [hdx, hdy], 2 * s, 1.8 * s, steel);
  ball(ctx, hdx, hdy, 1.3 * s, 1.3 * s, darken(steel, 0.1), { hi: 0.4, lo: 0.4 });
  ctx.restore();
};
