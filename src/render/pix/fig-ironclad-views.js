// ============ the Ironclad seen from the FRONT and from BEHIND ============
// One drawer, `make(s)`: s = +1 front, -1 back (as fig-goblin-views.js / fig-orc-views.js). Plate, pot helm,
// tusks, kite shield, falchion, rag, tassets and greaves are the side figure's (fig-ironclad.js).
// Hands: his RIGHT (the falchion, the spiked pauldron) is screen LEFT in front (rs = -s); his LEFT carries the
// daubed kite shield, which faces the camera in FRONT and shows only its back and rim beyond his flank from BEHIND.
// Feet, bob and arm swing come from the side walk's pose; forward is DOWN the screen in front, UP behind.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-ironclad.js";

const SKIN = mat("#5a8a3c"), PLATE = mat("#7a808c", { contrast: 1.3 }), IRON = mat("#4a4e58", { contrast: 1.1 });
const BLADE = mat("#c4c8d0", { contrast: 1.3 }), LEATHER = mat("#4a382c"), RAG = mat("#8e3a2c"), BONE = mat("#ece0c4"), HAIR = mat("#2e1e16"), BAND = mat("#a8432e");
const EYE = flat("#e8c14a"), SLIT = flat("#1c1620"), MOUTH = flat("#2c1a22");
const WOOD = mat("#6a4a2a");
const LEG = {
  M: { m: PLATE }, m: { m: PLATE, bias: -1 }, D: { m: IRON, fix: 1 }, r: { m: PLATE, fix: 4 }, o: { m: IRON, fix: 0 },
  V: { m: SLIT }, Y: { m: EYE },
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, L: { m: SKIN, fix: 3 }, T: { m: BONE, fix: 3 }, X: { m: MOUTH },
};
// FRONT: the pot helm banded down the nasal, two slots with the yellow eyes burning in them, the jaw bare below the
// rim, the tusks standing up over it.
const FRONT_H = [
  "....MMMDMMM....",
  "..MMMMMDMMMMM..",
  ".MMMMMMDMMMMMM.",
  ".MMMMMMDMMMMMM.",
  ".DrDDDDDDDDDrD.",
  ".MMMVYVDVYVMMM.",
  ".MMMVYVDVYVMMM.",
  ".MMMMMMDMMMMMM.",
  ".mMMoMMDMMoMMm.",
  ".mDDTDDDDDTDDm.",
  ".mGGTGXXXGTGGm.",
  "..mGTTLLLTTGm..",
  "..mmGGGGGGGmm..",
  "...gGGGGGGGg...",
  "....ggggggg....",
  "......ggg......",
];
// BACK: the drum of the helm, the crown ridge and a band, the rivets, a rim, the thick neck below.
const BACK_H = [
  "....MMMDMMM....",
  "..MMMMMDMMMMM..",
  ".MMMMMMDMMMMMM.",
  ".MMMMMMDMMMMMM.",
  ".DrDDDDDDDDDrD.",
  ".MMMMMMDMMMMMM.",
  ".MMrMMMDMMMrMM.",
  ".MMMMMMDMMMMMM.",
  ".mMMoMMDMMoMMm.",
  ".mDDDDDDDDDDDm.",
  ".mmMMrMMMrMMmm.",
  "..mDDDDDDDDDm..",
  "..mmMMMDMMMmm..",
  "...mmMMMMMmm...",
  "....mmmmmmm....",
  "......mmm......",
];

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const make = (s) => (px, F) => {
  const rs = -s, ls = s, TAU = Math.PI * 2, { sk, ph } = F, p = sk.p;
  const sw = (t) => rs * 0.7 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const hipY = sk.P[1], chY = sk.C[1], hy = Math.round(sk.N[1]), hx = Math.round(sx * 0.7);
  const vy = cl(sk.N[1] - F.lag1.N[1], -2.5, 2.5), vy2 = cl(F.lag1.N[1] - F.lag2.N[1], -2.5, 2.5);
  const vx = cl((sx - sx1) * 1.3, -2.5, 2.5), vx2 = cl((sx1 - sx2) * 1.3, -2.5, 2.5);
  const tilt = 0.5 * Math.sin(ph * TAU);
  const shY = chY - 1.4, aF = p.aF[0], aN = p.aN[0];
  const armOf = (side, ang, sh) => [[side * 10.4 + sx, sh], [side * 12 + sx, sh + 8.4], [side * 12.2 + sx, sh + 15.4 + s * ang * 2.4]];

  // the far arm (his left): bare above the elbow, a vambrace, the fist behind the shield
  {
    const [sp, el, hd] = armOf(ls, aF, shY - tilt * ls * 0.6);
    px.part();
    px.capsule(sp[0], sp[1] + 0.6, 4, el[0], el[1], 3.5, SKIN, 4.5, { bias: -1 });
    px.capsule(el[0], el[1], 3.6, hd[0], hd[1], 3.7, PLATE, 4.52, { bias: -1 });
    px.part();
    px.ellipse(hd[0], hd[1] + 0.4, 2.9, 2.9, SKIN, 4.7, { bias: -1 });
    px.part();
    px.ellipse(sp[0] + ls * 0.8, sp[1] - 0.6, 5.4, 4.3, PLATE, 4.8, { bias: -1, cast: 1 });
    // the kite shield: FRONT shows its face (rim, field, red-daubed point, boss); BEHIND its back edge past his flank
    const c = [ls * 10.4 + sx, chY + 15.8 + tilt * 0.4];
    const S = (x, y) => [c[0] + x * 0.8, c[1] + y * 0.8];
    if (s > 0) {
      px.part();
      px.poly([S(-6.4, -10), S(-3.4, -11.4), S(3.4, -11.4), S(6.4, -10), S(6.9, 1), S(0, 15), S(-6.9, 1)], IRON, 5.5, { round: 0.5, cast: 2 });
      px.part(); const fid = px._pid;
      px.poly([S(-4.9, -8.9), S(-2.8, -9.9), S(2.8, -9.9), S(4.9, -8.9), S(5.4, 0.6), S(0, 12.4), S(-5.4, 0.6)], PLATE, 5.52, { round: 0.7, cast: 0 });
      px.poly([S(-4.9, 2.6), S(-2.4, 4.4), S(0, 2.8), S(2.4, 4.4), S(4.9, 2.6), S(0, 12.2)], RAG, 5.53, { round: 0.7, cast: 0 });
      px.toneLine(...S(-3.6, -6.6), ...S(-1.2, -5.2), -1, fid);
      px.part();
      px.ellipse(...S(0, -2.6), 2.5, 2.5, IRON, 5.55, { cast: 1 });
      px.dot(...S(-0.6, -3.4), PLATE, 5.56, { fix: 4 });
      for (const [x, y] of [[-3.8, -8], [3.8, -8], [-4.6, 0], [4.6, 0]]) px.dot(...S(x, y), PLATE, 5.56, { fix: 4 });
    } else {
      const cb = [ls * 12.4 + sx, c[1] + 0.5], B = (x, y) => [cb[0] + x, cb[1] + y];
      px.part();
      px.poly([B(-2.4, -10), B(2.4, -10), B(3, 1), B(0, 14), B(-3, 1)], IRON, 3.4, { round: 0.6, cast: 1 });
      px.part();
      px.poly([B(-1.4, -8.6), B(1.4, -8.6), B(1.9, 0.6), B(0, 11.8), B(-1.9, 0.6)], WOOD, 3.42, { round: 0.6 });
      px.dot(...B(-0.4, -6), PLATE, 3.45, { fix: 4 }); px.dot(...B(0.4, 1), PLATE, 3.45, { fix: 4 });
    }
  }

  // legs: bare thigh, a knee cop, a greave, an iron-shod boot
  for (const [f, side, z] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lift = f[1], fx = hx + side * 5.2, fy = -2.2 + s * f[0] * FWD - lift * 0.9;
    const hp = [hx + side * 4.4, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.9, (hp[1] + fy) / 2 - lift * 0.5];
    const b = side === rs ? 0 : -1, zz = z + lift * 0.05, g0 = mix(kn, [fx, fy], 0.3);
    px.part();
    px.capsule(hp[0], hp[1], 3.9, kn[0], kn[1], 3.3, SKIN, zz, { bias: b });
    px.capsule(kn[0], kn[1], 3.2, fx, fy, 2.7, SKIN, zz, { bias: b });
    px.capsule(g0[0], g0[1], 3.4, fx, fy, 2.9, PLATE, zz + 0.02, { bias: b });
    const a0 = mix(kn, [fx, fy], 0.82);
    px.capsule(a0[0] - 2.8, a0[1], 0.9, a0[0] + 2.8, a0[1] + 0.2, 0.9, IRON, zz + 0.04, { bias: b });
    px.part();
    if (s > 0) px.ellipse(fx, fy + 1.4, 3.3, 2.1, IRON, z + 0.4 + lift * 0.05, { bias: b });
    else {
      px.ellipse(fx, fy + 1, 3, 1.8, IRON, z + 0.4 + lift * 0.05, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 3, 2.8, 2.2 * cl(lift / 2.4, 0.3, 1), IRON, z + 0.45, { bias: -2 });
    }
  }

  // the red rag between the tassets, a beat behind the hips; the tassets hung from the belt
  const rl = vx * 0.8;
  px.part(); const ragId = px._pid;
  px.poly([[hx - 3.4, hipY - 1], [hx + 3.6, hipY - 1], [hx + 4 - rl, hipY + 7.4], [hx + 1.6 - rl, hipY + 9.2], [hx - 0.4 - rl, hipY + 7.6], [hx - 2.6 - rl, hipY + 8.8], [hx - 4 - rl, hipY + 6.8]], RAG, 3.55, { round: 0.7 });
  px.toneLine(hx + 0.4, hipY + 2, hx + 0.2 - rl, hipY + 7, -1, ragId);
  for (const [x0, x1, d0, d1] of [[-8, -1.8, 3.4, 3.8], [1.8, 8, 3.8, 3.4]]) {
    px.part();
    px.poly([[hx + x0, hipY - 1], [hx + x1, hipY - 1], [hx + x1 + 0.4, hipY + d1], [hx + x0 - 0.4, hipY + d0]], PLATE, 3.6, { round: 0.75, cast: 1, bias: x0 < 0 ? 0 : -1 });
    px.line(hx + x0 - 0.4, hipY + d0, hx + x1 + 0.4, hipY + d1, IRON, 3.62, { fix: 1 });
  }

  // the trunk: a boxy breastplate (a backplate from behind), the lower plate lapped under it, rivets, a broad belt
  const c0 = chY - 2.6, wy = hipY;
  px.part(); const bodyId = px._pid;
  px.poly([[sx - 10.8, c0], [sx + 10.8, c0], [sx + 11.6, chY + 4], [sx + 11, chY + 9.6], [hx + 8, wy - 6], [hx + 7.6, wy - 3.4], [hx - 7.6, wy - 3.4], [hx - 8, wy - 6], [sx - 11, chY + 9.6], [sx - 11.6, chY + 4]], PLATE, 4, { round: 0.86, ny: -0.1, cast: 1 });
  px.toneLine(sx - 9, chY + 9.4, sx + 9, chY + 9.8, -1, bodyId);
  px.toneLine(sx - 8, chY + 10.6, sx + 8, chY + 11, -1, bodyId);
  if (s > 0) {
    px.toneLine(sx, c0 + 1.6, sx, chY + 8.6, 1, bodyId);                       // the keel
    for (const x of [-6.4, -2.4, 2.4, 6.4]) px.dot(sx + x, chY + 7.4, IRON, 4.02, { fix: 0 });
  } else {
    px.toneLine(sx, c0 + 1.6, hx, wy - 4, -1, bodyId);                         // the backplate's seam
    for (const x of [-6.4, 6.4]) px.dot(sx + x, chY + 3, IRON, 4.02, { fix: 0 });
    for (const x of [-4.4, 4.4]) px.dot(sx + x, chY + 7.6, IRON, 4.02, { fix: 0 });
  }
  px.poly([[hx - 8, wy - 4], [hx + 8, wy - 4], [hx + 7.6, wy + 0.2], [hx - 7.8, wy + 0.2]], LEATHER, 4.05, { round: 0.92, bias: 1 });
  if (s > 0) { px.rect(hx - 1.5, wy - 3.6, 3, 3, IRON, 4.06, { fix: 3 }); px.dot(hx, wy - 2.4, IRON, 4.07, { fix: 0 }); }
  else { px.dot(hx - 3, wy - 2, IRON, 4.06, { fix: 0 }); px.dot(hx + 3, wy - 2, IRON, 4.06, { fix: 0 }); }

  // the gorget the helm sits in
  px.part();
  px.ellipse(sx, chY - 1.8, 9.6, 3.4, IRON, 4.2, { cast: 1 });

  // the topknot pulled through the helm's crown, tipping to one side and whipping a beat behind
  const top = hy - 12, sway = cl(vx * 1.8 + vx2 * 1.4, -3, 3.5), hop = cl(vy * 1.4 + vy2, -2, 2);
  const side = -s * 0.9, k0 = [hx, top + 0.8], k1 = [hx + side * 0.6, top - 2.8 - hop * 0.3], k2 = [hx + side * 4.6 + sway * 0.5, top - 2.4 - hop + Math.abs(sway) * 0.2], k3 = [hx + side * 7 + sway, top + 1.4 - hop * 1.2];
  px.part();
  px.capsule(k0[0], k0[1], 1.5, k1[0], k1[1], 1.8, HAIR, 6.3);
  px.capsule(k1[0], k1[1], 1.8, k2[0], k2[1], 1.4, HAIR, 6.3);
  px.capsule(k2[0], k2[1], 1.4, k3[0], k3[1], 0.8, HAIR, 6.3);
  px.part();
  px.capsule(k0[0] - 1.6, k0[1] - 0.6, 0.9, k0[0] + 1.6, k0[1] - 0.6, 0.9, BAND, 6.4);

  // the head
  px.part();
  px.stamp(s > 0 ? FRONT_H : BACK_H, hx, hy, LEG, 6, { ax: 7, ay: 12, ball: [7.5, 6, 8, 10], cast: 1 });

  // the near arm (his right): bare above the elbow, a riveted vambrace, a green fist round the falchion's grip; the spiked pauldron
  {
    const [sp, el, hd] = armOf(rs, aN, shY + tilt * rs * 0.6);
    px.part(); px.tag("nearArm");
    px.capsule(sp[0], sp[1] + 1, 4.4, el[0], el[1], 3.8, SKIN, 7.9, { cast: 1 });
    px.capsule(el[0], el[1], 3.6, hd[0], hd[1], 3.7, SKIN, 7.9, { cast: 1 });
    const v0 = mix(el, hd, 0.36), v1 = mix(el, hd, 0.8);
    px.part();
    px.capsule(v0[0], v0[1], 4, v1[0], v1[1], 4.1, PLATE, 7.95, { cast: 1 });
    px.dot(...mix(v0, v1, 0.2), IRON, 7.96, { fix: 0 }); px.dot(...mix(v0, v1, 0.85), IRON, 7.96, { fix: 0 });
    px.tag(null);
    // the falchion stands up by his side, point out and up: a leather grip, a cross-guard, the broad blade, belly outward
    const t = rs * 0.2 + vx * 0.1, A = s > 0 ? (f, o = 0) => [hd[0] + t * f + rs * o, hd[1] - f] : (f, o = 0) => [hd[0] - rs * 0.1 * f + rs * o, hd[1] + f * 0.75], bz = s > 0 ? 8.1 : 3.9;   // from behind it hangs point down at his side, behind the hip
    px.part(); px.tag("blade");
    px.poly([A(5, -1.1), A(19.8, -1.5), A(23, 0.3), A(21.8, 2.3), A(15, 2.5), A(5, 1.4)].map(([x, y]) => [x, y]), BLADE, bz, { fix: 2, edge: true });
    px.poly([A(5, 0.6), A(15, 1.7), A(21.6, 1.4), A(21.8, 2.3), A(15, 2.5), A(5, 1.4)], BLADE, bz + 0.01, { fix: 4 });
    px.poly([A(5, -1.1), A(19.8, -1.5), A(19.4, -0.7), A(5, -0.4)], BLADE, bz + 0.01, { fix: 1 });
    px.part();
    px.capsule(...A(-3.2), 1, ...A(3.4), 1, LEATHER, bz + 0.02);
    px.capsule(...A(4.2, -3), 1, ...A(4.2, 3.6), 1, IRON, bz + 0.05, { edge: true });
    px.ellipse(...A(-3.8), 1.4, 1.4, IRON, bz + 0.05);
    px.tag(null);
    px.part();
    px.ellipse(hd[0], hd[1], 2.9, 3.4, SKIN, 8.3);
    // the pauldron: two lapped plates and a crude spike
    px.part();
    px.ellipse(sp[0] + rs * 0.6, sp[1] + 2, 5.2, 3.4, PLATE, 7.98, { bias: -1, cast: 1 });
    px.part();
    px.poly([[sp[0] + rs * 1 - 2, sp[1] - 3], [sp[0] + rs * 2.2 + rs * 0.6, sp[1] - 8.8], [sp[0] + rs * 1 + 2.4, sp[1] - 3.4]], IRON, 7.99, { fix: 1 });
    px.part();
    px.ellipse(sp[0] + rs * 0.6, sp[1] - 0.4, 6.2, 4.4, PLATE, 8, { cast: 1 });
    px.dot(sp[0] - 2.4, sp[1] + 1.4, IRON, 8.01, { fix: 0 }); px.dot(sp[0] + 3, sp[1] + 1.8, IRON, 8.01, { fix: 0 });
  }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "ironclad-front", BOX: { w: 80, h: 84, ox: 40, oy: 78 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "ironclad-back", BOX: { w: 80, h: 84, ox: 40, oy: 78 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
