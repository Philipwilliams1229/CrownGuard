// ============ PIX CASTLE: the Gate Ballista ============
// The siege bow on each gate tower's open top, redrawn in the pixel sculptor (the Archer hall's
// Ballista, hall-archer.js siegeBow, is the worked example). Seen from the side, FACING +x as
// baked; castle.js stamps it mirrored (dir -1: the field lies to the west) from a bake made
// with `flip` so the sun stays upper left.
//
// Everything is in ART PIXELS (two to a board unit) from the tower deck's spot [x, y]
// (data/castle.js ballistaSpots). The bolt starts at ballistaMuzzle = (x - 2, y - 26) units,
// which in this frame (facing +x, before the mirror) is (4, -52): the stave's peak is pinned
// there at the middle pitch, so the bolt leaves the nose it is drawn from. Never move it: the
// engine reads those two numbers.
//   ballistaPix(state, pitch, burn)  state 0..4: 0 just loosed (string forward, no bolt), 1-3
//     the winch drawing it back, 4 loaded (string at the nut, a bolt in the groove)
//   pitch  index into PITCHES: the nose turned up or down at its target
import { Pix, mat, flat } from "./pix.js";
import { beam } from "./hall-kit.js";

export const BOX = { w: 84, h: 84, ox: 38, oy: 74 };
export const PITCHES = [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42];     // radians, + = nose up
export const MID_PITCH = 0.1;                                          // where the nose sits exactly on the muzzle

const OAK = mat("#6f4a2a"), OAK_D = mat("#553820"), TIMBER = mat("#8a6238"), IRON = mat("#4a4c56"), IRON_L = mat("#8a909c", { contrast: 1.2 });
const STEEL = mat("#c4c8d0", { contrast: 1.2 }), RED = mat("#a04a3f"), STR = flat("#f2ead4", { line: "#6a5a48" }), FIRE = flat("#ffb04a", { emis: true });
const MUZ = [4, -52], REACH = 17.5;                                    // the muzzle in this frame; the stave's peak, from the pivot
const PV = [Math.round(MUZ[0] - REACH * Math.cos(MID_PITCH)), Math.round(MUZ[1] + REACH * Math.sin(MID_PITCH))];

export const ballistaPix = (state, pitchIx, burn = false, flip = true) => {
  const px = new Pix(BOX.w, BOX.h, BOX.ox, BOX.oy), p = PITCHES[pitchIx] ?? 0, c = Math.cos(p), s = Math.sin(p);
  const R = (u, v) => [PV[0] + u * c + v * s, PV[1] - u * s + v * c];

  // the pedestal: an iron-shod oak post on a base plate, braced to it
  px.part();
  px.rect(PV[0] - 10, -5, 20, 5, IRON, 0.1, { n: [0, -0.4, 0.9] });
  px.rect(PV[0] - 4.5, PV[1], 9, -5 - PV[1], OAK, 0.2, { n: [-0.2, -0.1, 0.97] });
  px.rect(PV[0] - 5, -18, 10, 2, IRON, 0.3, { n: [0, 0, 1], cast: 0 });
  px.rect(PV[0] - 5, PV[1] + 6, 10, 2, IRON, 0.3, { n: [0, 0, 1], cast: 0 });
  beam(px, PV[0] - 9, -5, PV[0] - 4, -26, 3.4, OAK_D, 0.15, { grain: false });
  beam(px, PV[0] + 9, -5, PV[0] + 4, -26, 3.4, OAK_D, 0.15, { grain: false });
  // the yoke the bow turns in
  px.part();
  px.rect(PV[0] - 7, PV[1] - 4, 3, 9, IRON, 0.4, { n: [0, 0, 1] });
  px.rect(PV[0] + 4, PV[1] - 4, 3, 9, IRON, 0.4, { n: [0, 0, 1] });

  // the stock: banded timber, a groove down it
  const a = R(-21, 0), b = R(17, 0);
  beam(px, a[0], a[1], b[0], b[1], 7, TIMBER, 1, { bands: [0.1, 0.42, 0.78], bandM: IRON, seed: 5 });

  // the stave round the nose: a quadratic through (9, -17) (26, 0) (9, 17) in the stock's own frame
  const nut = state >= 4 ? -9 : state === 0 ? 15 : 15 - (state / 4) * 24;
  px.part();
  let tipA = null, tipB = null;
  for (let u = 0; u <= 1.001; u += 0.05) {
    const q = [(1 - u) * (1 - u) * 9 + 2 * (1 - u) * u * 26 + u * u * 9, (1 - u) * (1 - u) * -17 + u * u * 17], r = R(q[0], q[1]);
    px.ellipse(r[0], r[1], 2.4, 2.4, IRON_L, 2, { round: 0.9 });
    if (u < 0.02) tipA = r; tipB = r;
  }
  for (const t of [tipA, tipB]) px.rect(t[0] - 1.5, t[1] - 1.5, 3, 3, STEEL, 2.1, { fix: 3 });
  // the string, hauled to the nut
  const n0 = R(nut, -0.5);
  px.part(); px.line(tipA[0], tipA[1], n0[0], n0[1], STR, 1.6, { cast: 0 }); px.line(n0[0], n0[1], tipB[0], tipB[1], STR, 2.4, { cast: 0 });

  // the bolt in the groove: shaft, steel head, red fletchings; a burning one wears flame at its head
  if (state >= 4) {
    const s0 = R(nut, -4.4), s1 = R(nut + 27, -4.4), h1 = R(nut + 33, -4.4);
    px.part(); px.line(s0[0], s0[1], s1[0], s1[1], OAK, 2.6, { cast: 0 }); px.line(s0[0], s0[1] + 1, s1[0], s1[1] + 1, OAK, 2.6, { cast: 0, bias: -1 });
    px.poly([[s1[0] - s * 3, s1[1] - c * 3], [h1[0], h1[1]], [s1[0] + s * 3, s1[1] + c * 3]], STEEL, 2.7, { n: [-0.3, -0.4, 0.86] });
    for (const d of [1, 3.2]) { px.dot(s0[0] + d * c, s0[1] - d * s - 1.5, RED, 2.8); px.dot(s0[0] + d * c, s0[1] - d * s + 2, RED, 2.8); }
    if (burn) { px.part(); px.dot(h1[0] + 1, h1[1] - 1, FIRE, 3); px.dot(h1[0] + 2, h1[1] - 2, FIRE, 3); px.dot(h1[0], h1[1] - 2, FIRE, 3); }
  }

  // the winch at the rear of the stock: a drum with its crank, the crank turning as the string comes back
  const w = R(-19, 0.5), ang = state * 1.25;
  px.part(); px.ellipse(w[0], w[1], 5.6, 5.6, OAK_D, 3, { round: 0.85 }); px.ellipse(w[0], w[1], 1.4, 1.4, IRON_L, 3.1, { cast: 0 });
  if (state > 0 && state < 4) { px.part(); px.line(w[0], w[1], w[0] + Math.cos(ang) * 6.5, w[1] + Math.sin(ang) * 6.5, IRON_L, 3.2, { cast: 0 }); }
  return px.resolve({ flip });
};
