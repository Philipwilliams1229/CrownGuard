// ============ FIGURE: the Ironclad (game type `armored`) ============
// The orc's build (about 52 px to the topknot) boxed in crude plate: a riveted
// pot helm sitting low, two eye slots with the yellow eyes burning in them, the
// tusks jutting up over the helm's rim; big lapped pauldrons with a spike, a
// riveted breastplate, tassets over a red rag, greaves. A daubed iron kite
// shield leads on the far arm; a heavy falchion trails from the near fist.
// The skin still shows (jaw, upper arms, thighs, fists), so the cold steel
// reads against the green. Three clips: idle (breathing behind the shield, the
// blade's point resting on the ground behind him), walk (a stiff tramp, the
// shield leading), attack (shield out, the blade hauled up and back, a fast
// overhead cut with a step, follow-through, back behind the shield).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, HUMAN, scaled } from "./rig.js";

const SKIN = mat("#5a8a3c"), PLATE = mat("#7a808c", { contrast: 1.3 }), IRON = mat("#4a4e58", { contrast: 1.1 });
const BLADE = mat("#c4c8d0", { contrast: 1.3 }), LEATHER = mat("#4a382c"), RAG = mat("#8e3a2c"), BONE = mat("#ece0c4"), HAIR = mat("#2e1e16"), BAND = mat("#a8432e");
const EYE = flat("#e8c14a"), GLINT = flat("#fff0a0"), SLIT = flat("#1c1620"), MOUTH = flat("#2c1a22");
const SMEAR1 = flat("#f6f6ee", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c4ccd8", { emis: true, line: "#9aa4bc" });

// The head, facing +x, a quarter turned: a flat-topped pot helm (M, shaded as a
// drum), banded in dark iron round the brow, down the nasal and round the rim
// (D, rivets r); two eye slots (V) with the eyes (Y) cut to a scowl; breathing
// holes (o). Below the rim the bare jaw: tusks (T) standing up over the rim.
const HEAD = [
  "....MMMMMDMMM...",
  "..MMMMMMMDMMMMM.",
  ".MMMMMMMMDMMMMMM",
  ".MMMMMMMMDMMMMMM",
  ".DrDDDrDDDDDrDDD",
  ".MMMVYVVMDMVVYVM",
  ".MMMVYYVMDMVYYVM",
  ".MMMMMMMMDMMMMMM",
  ".mMMMoMoMDMoMMMM",
  ".mMMMDDTDDDDTDDD",
  ".mMMMDGTGXXXTGGG",
  "..mMMDGTTLLTTGGG",
  "..mmMDGGGGGGGGGG",
  "...mmDgGGGGGGGGg",
  ".....ggGGGGGGgg.",
  ".......gggggg...",
];
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const BLINK = swap(HEAD, { 5: ".MMMVVVVMDMVVVVM", 6: ".MMMVVVVMDMVVVVM" });
// the cut's roar: the jaw dropped under the rim, the mouth open on the tusks, the eyes flaring
const ROAR = swap(HEAD, { 5: ".MMMVYYVMDMVYYVM", 6: ".MMMVYEVMDMVYEVM", 10: ".mMMMDGTGXXXTGGG", 11: ".mMMMDGTXXXXTGGG", 12: "..mMMDGTTLLTTGGG", 13: "..mmMDGGGGGGGGGG", 14: "...mmDgGGGGGGGg.", 15: ".....gggGGGGgg.." });
const LEG = {
  M: { m: PLATE }, m: { m: PLATE, bias: -1 }, D: { m: IRON, fix: 1 }, r: { m: PLATE, fix: 4 }, o: { m: IRON, fix: 0 },
  V: { m: SLIT }, Y: { m: EYE }, E: { m: GLINT },
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, L: { m: SKIN, fix: 3 }, T: { m: BONE, fix: 3 }, X: { m: MOUTH },
};

export const BOX = { w: 100, h: 86, ox: 48, oy: 78 };
// the orc's bones, squarer at the shoulder
export const BONES = scaled(HUMAN, 1.1, { thigh: 8.5, shin: 8, ankle: 2.2, spine: 18.5, neck: 1, upper: 9, fore: 8.5, shN: -7.8, shF: 7.2, hipN: -3, hipF: 3.2 });

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// the falchion through the near fist: sw is the blade's angle from upright (+ toward the foe); the belly leads the cut
const LEN = 23;
const bladeOf = (sk) => {
  const a = sk.p.sw ?? -2.5, h = sk.hdN, d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)];
  return (t, s = 0) => [h[0] + d[0] * t + n[0] * s, h[1] + d[1] * t + n[1] * s];
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(N[0] - lag1.N[0], -2.5, 2.5), vy = cl(N[1] - lag1.N[1], -2.5, 2.5);
  const vx2 = cl(lag1.N[0] - lag2.N[0], -2.5, 2.5), vy2 = cl(lag1.N[1] - lag2.N[1], -2.5, 2.5);
  const bx = cl(P[0] - lag1.P[0], -2, 2), bx2 = cl(lag1.P[0] - lag2.P[0], -2, 2);

  // the far arm, a tone down: bare above the elbow, a vambrace below; the far pauldron shows over the shoulder
  px.part();
  px.capsule(sF[0], sF[1] + 0.6, 4, eF[0], eF[1], 3.5, SKIN, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 3.6, hdF[0], hdF[1], 3.7, PLATE, 1.02, { bias: -1 });
  px.part();
  px.ellipse(sF[0] + 0.8, sF[1] - 1, 5.4, 4.3, PLATE, 1.2, { bias: -1 });

  // the kite shield on that arm, held out before him: an iron rim, a plate field, a boss, the point daubed red
  const sc = mix(eF, hdF, 0.78), tl = p.shield ?? 0.1, cs = Math.cos(tl), sn = Math.sin(tl);
  const S = (x, y) => [sc[0] + 1 + x * cs - y * sn, sc[1] + 1.5 + x * sn + y * cs];
  px.part();
  px.poly([S(-6.4, -10), S(-3.4, -11.4), S(3.4, -11.4), S(6.4, -10), S(6.9, 1), S(0, 15), S(-6.9, 1)], IRON, 3.5, { round: 0.5, cast: 2 });
  px.part(); const fieldId = px._pid;
  px.poly([S(-4.9, -8.9), S(-2.8, -9.9), S(2.8, -9.9), S(4.9, -8.9), S(5.4, 0.6), S(0, 12.4), S(-5.4, 0.6)], PLATE, 3.52, { round: 0.7, cast: 0 });
  px.poly([S(-4.9, 2.6), S(-2.4, 4.4), S(0, 2.8), S(2.4, 4.4), S(4.9, 2.6), S(0, 12.2)], RAG, 3.53, { round: 0.7, cast: 0 });
  px.toneLine(...S(-3.6, -6.6), ...S(-1.2, -5.2), -1, fieldId);                 // a dent
  px.part();
  px.ellipse(...S(0, -2.6), 2.5, 2.5, IRON, 3.55, { cast: 1 });
  px.dot(...S(-0.6, -3.4), PLATE, 3.56, { fix: 4 });
  for (const [x, y] of [[-3.8, -8], [3.8, -8], [-4.6, 0], [4.6, 0]]) px.dot(...S(x, y), PLATE, 3.56, { fix: 4 });

  // the legs: a bare thigh, a knee cop, a greave, an iron-shod boot
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(hp[0], hp[1], 3.9, kn[0], kn[1], 3.3, SKIN, z, { bias: b });
    px.capsule(kn[0], kn[1], 3.2, an[0], an[1], 2.7, SKIN, z, { bias: b });
    const g0 = mix(kn, an, 0.3);
    px.capsule(g0[0], g0[1], 3.4, an[0], an[1], 2.9, PLATE, z + 0.02, { bias: b });
    px.capsule(an[0] - 1, an[1] + 0.5, 1.9, an[0] + 4.4, an[1] + 0.8, 1.5, IRON, z + 0.03, { bias: b });
    const a0 = mix(kn, an, 0.82);
    px.capsule(a0[0] - 2.4, a0[1], 0.9, a0[0] + 2.6, a0[1] + 0.2, 0.9, IRON, z + 0.04, { bias: b });
  }

  // a red rag hanging between the tassets, a beat behind the hips
  const rl = bx * 1.6 + bx2 * 1.2;
  px.part(); const ragId = px._pid;
  px.poly([[P[0] - 3.4, P[1] - 1], [P[0] + 3.6, P[1] - 1], [P[0] + 4 - rl, P[1] + 7.4], [P[0] + 1.6 - rl, P[1] + 9.2], [P[0] - 0.4 - rl, P[1] + 7.6], [P[0] - 2.6 - rl, P[1] + 8.8], [P[0] - 4 - rl, P[1] + 6.8]], RAG, 3.55, { round: 0.7 });
  px.toneLine(P[0] + 0.4, P[1] + 2, P[0] + 0.2 - rl, P[1] + 7, -1, ragId);
  // the tassets: two plates hung from the belt, rimmed dark
  const tk = bx * 0.8;
  for (const [x0, x1, d0, d1] of [[-8, -1.6, 3, 3.6], [2, 8, 3.4, 2.8]]) {
    px.part();
    px.poly([[P[0] + x0, P[1] - 1], [P[0] + x1, P[1] - 1], [P[0] + x1 + 0.4 - tk, P[1] + d1], [P[0] + x0 - 0.4 - tk, P[1] + d0]], PLATE, 3.6, { round: 0.75, cast: 1, bias: x0 < 0 ? 0 : -1 });
    px.line(P[0] + x0 - 0.4 - tk, P[1] + d0, P[0] + x1 + 0.4 - tk, P[1] + d1, IRON, 3.62, { fix: 1 });
  }

  // the trunk: a boxy breastplate, the belly plate lapped under it, rivets; a broad belt
  px.part(); const bodyId = px._pid;
  px.poly([[C[0] - 9.6, C[1] - 2.4], [C[0] + 9, C[1] - 2.8], [C[0] + 11.2, C[1] + 3], [C[0] + 10.8, C[1] + 9.6], [P[0] + 8.2, P[1] - 6], [P[0] + 7.6, P[1] - 3.4],
    [P[0] - 7.8, P[1] - 3.4], [P[0] - 8.4, P[1] - 6], [C[0] - 11, C[1] + 9], [C[0] - 11.2, C[1] + 3]], PLATE, 4, { round: 0.86, ny: -0.1, cast: 1 });
  px.toneLine(C[0] - 9, C[1] + 9.4, C[0] + 10, C[1] + 9.8, -1, bodyId);          // the breastplate's lower edge
  px.toneLine(C[0] - 8, C[1] + 10.4, C[0] + 9, C[1] + 10.8, -1, bodyId);
  px.toneLine(C[0] + 3.6, C[1] + 1.4, C[0] + 4, C[1] + 8.4, 1, bodyId);          // its keel
  for (const x of [-6, -1.5, 3.5, 8]) px.dot(C[0] + x, C[1] + 7.6, IRON, 4.02, { fix: 0 });
  for (const x of [-4, 6]) px.dot(P[0] + x, P[1] - 5.4, IRON, 4.02, { fix: 0 });
  px.poly([[P[0] - 8, P[1] - 4], [P[0] + 7.8, P[1] - 4], [P[0] + 7.6, P[1] + 0.2], [P[0] - 7.8, P[1] + 0.2]], LEATHER, 4.05, { round: 0.92, bias: 1 });
  px.rect(P[0] + 1.2, P[1] - 3.6, 3, 3, IRON, 4.06, { fix: 3 });
  px.dot(P[0] + 2.4, P[1] - 2.4, IRON, 4.07, { fix: 0 });

  // the gorget the helm sits in
  px.part();
  px.ellipse(C[0] + 0.6, C[1] - 1.8, 9.2, 3.3, IRON, 4.2, { cast: 1 });

  // the head, low between the shoulders
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  px.part();
  px.stamp(p.blink ? BLINK : p.roar > 0.5 ? ROAR : HEAD, hx, hy, LEG, 6, { ax: 7, ay: 12, ball: [7.5, 6, 8, 10], cast: 1 });

  // the topknot pulled through the helm's crown, whipping a beat behind the head
  const top = hy - 12, sway = cl(vx * 1.8 + vx2 * 1.4, -3, 3.5), hop = cl(vy * 1.4 + vy2, -2, 2);
  const k0 = [hx - 3.4, top + 0.8], k1 = [hx - 4.2 - sway * 0.3, top - 2.6 - hop * 0.3], k2 = [hx - 8 - sway, top - 1.4 - hop + Math.abs(sway) * 0.3], k3 = [hx - 10.2 - sway * 1.5, top + 2.4 - hop * 1.2];
  px.part();
  px.capsule(k0[0], k0[1], 1.4, k1[0], k1[1], 1.7, HAIR, 6.3);
  px.capsule(k1[0], k1[1], 1.7, k2[0], k2[1], 1.4, HAIR, 6.3);
  px.capsule(k2[0], k2[1], 1.4, k3[0], k3[1], 0.8, HAIR, 6.3);
  px.part();
  px.capsule(k0[0] - 1.2, k0[1] - 0.6, 0.9, k0[0] + 1, k0[1] - 0.8, 0.9, BAND, 6.4);

  // the falchion: a broad crude blade, the belly forward, a clipped point (raised over the head it passes behind the helm)
  const B = bladeOf(sk), back = (p.nb || 0) > 0.5, bz = back ? 5.4 : 7;
  px.part();
  px.poly([B(5, -1.1), B(19.8, -1.5), B(LEN, 0.3), B(21.8, 2.3), B(15, 2.5), B(5, 1.4)], BLADE, bz, { fix: 2, edge: true });
  px.poly([B(5, 0.6), B(15, 1.7), B(21.6, 1.4), B(21.8, 2.3), B(15, 2.5), B(5, 1.4)], BLADE, bz + 0.01, { fix: 4 });
  px.poly([B(5, -1.1), B(19.8, -1.5), B(19.4, -0.7), B(5, -0.4)], BLADE, bz + 0.01, { fix: 1 });
  px.part();
  px.capsule(...B(-3.2), 1, ...B(3.4), 1, LEATHER, bz + 0.02);
  px.capsule(...B(4.2, -3), 1, ...B(4.2, 3.6), 1, IRON, bz + 0.05, { edge: true });
  px.ellipse(...B(-3.8), 1.4, 1.4, IRON, bz + 0.05);

  // the near arm over it all: bare above the elbow, a riveted vambrace, a green fist
  const az = back ? 5.5 : 7.9;
  px.part();
  px.capsule(sN[0], sN[1] + 1, 4.4, eN[0], eN[1], 3.8, SKIN, az, { cast: 1 });
  px.capsule(eN[0], eN[1], 3.6, hdN[0], hdN[1], 3.7, SKIN, az, { cast: 1 });
  const v0 = mix(eN, hdN, 0.36), v1 = mix(eN, hdN, 0.8);
  px.part();
  px.capsule(v0[0], v0[1], 4, v1[0], v1[1], 4.1, PLATE, az + 0.05, { cast: 1 });
  px.dot(...mix(v0, v1, 0.2), IRON, az + 0.06, { fix: 0 }); px.dot(...mix(v0, v1, 0.85), IRON, az + 0.06, { fix: 0 });
  px.part();
  px.ellipse(hdN[0], hdN[1], 3.2, 3.2, SKIN, az + 0.4);
  // the pauldron: two lapped plates and a crude spike
  px.part();
  px.ellipse(sN[0] - 1, sN[1] + 2, 5.2, 3.4, PLATE, 7.98, { bias: -1, cast: 1 });
  px.part();
  px.poly([[sN[0] - 4.4, sN[1] - 3], [sN[0] - 3.4, sN[1] - 8.8], [sN[0] - 0.6, sN[1] - 3.4]], IRON, 7.99, { fix: 1 });
  px.part();
  px.ellipse(sN[0] - 1.2, sN[1] - 0.4, 6.2, 4.4, PLATE, 8, { cast: 1 });
  px.dot(sN[0] - 4.2, sN[1] + 1.4, IRON, 8.01, { fix: 0 }); px.dot(sN[0] + 1.8, sN[1] + 1.8, IRON, 8.01, { fix: 0 });

  return { hand: hdN };
};

// the cut's smear: one solid two-tone crescent behind the blade on its fastest frames
export const fx = (px, F, info, clip) => {
  if (clip !== "attack") return;
  const a1 = F.sk.p.sw, a0 = F.lag1.p.sw;
  if (!(a1 - a0 > 0.6) || a1 > 3) return;
  const [hx, hy] = F.sk.hdN, [gx, gy] = F.lag1.hdN, n = 10, R = LEN + 0.5;
  const at = (t, r) => { const a = a0 + (a1 - a0) * t, x = gx + (hx - gx) * t, y = gy + (hy - gy) * t; return [x + Math.sin(a) * r, y - Math.cos(a) * r]; };
  const arc = (t0, rIn, m, z) => { const out = [], inn = []; for (let i = 0; i <= n; i++) { const t = t0 + (1 - t0) * (i / n); out.push(at(t, R)); inn.unshift(at(t, R - (R - rIn) * ((t - t0) / (1 - t0)) ** 1.4)); } px.poly([...out, ...inn], m, z, { noLine: true }); };
  arc(0, 10, SMEAR2, 20); arc(0.45, 15, SMEAR1, 20.1);
};

const TAU = Math.PI * 2, HIT = 7 / 12;      // the blow lands on frame 7 of 13
const GUARD = { drop: 1.6, lean: 0.2, twist: 0, hx: 3.2, hy: 1.4, rise: 0, aN: [-0.2, 0.93, 0], aF: [0.85, 0.62, 0], fN: [-3.6, 0], fF: [4, 0], sw: -2.5, shield: 0.1, nb: 0, roar: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 2100, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b, s = Math.sin(ph * TAU - 1.2);
      return { ...GUARD, rise: 1.3 * u, rx: 0.6 * s, hy: 1.4 + 0.5 * (1 - u), aF: [0.85 + 0.03 * s, 0.62 + 0.02 * u, 0], shield: 0.1 + 0.03 * s, aN: [-0.2 - 0.02 * b, 0.93 - 0.05 * u, 0], sw: -2.5 - 0.04 * u, blink: ph >= 0.8 && ph < 0.92 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 1050, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 4, lift: 2, swing: 0.2, bob: 1.7, lean: 0.2 }), a = Math.cos(ph * TAU);
      return { ...w, drop: w.drop + 1.4, twist: -a * 0.5, hx: 3.2, hy: 1.4, aF: [0.85 + 0.06 * a, 0.62, 0], shield: 0.1 + 0.05 * a, aN: [-0.2 - a * 0.2, 0.92, 0], sw: -2.3 + a * 0.14, nb: 0, roar: 0 };
    },
  },
  attack: {
    n: 13, ms: 950, loop: false, lag: 0.06,
    // the arm and the blade each turn ONE way through the whole clip (back and up, over the top, down
    // before him, back to trail), so their angles run on past a full turn and the eases never unwind them
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      // the shield shoved out, the blade starting up behind him
      { t: 0.12, e: "io", p: { ...GUARD, rx: 0.8, lean: 0.26, aF: [1.1, 0.84, 0], shield: 0, aN: [-0.8, 0.86, 0], sw: -2 } },
      // hauled up and back, the weight on the back foot
      { t: 0.36, e: "out", p: { ...GUARD, rx: -2.2, drop: 0.8, rise: 0.8, lean: 0, twist: -0.6, hx: 2.8, hy: 1, aF: [1.15, 0.86, 0], shield: -0.06, aN: [-2.9, 0.84, 0], nb: 1, sw: -0.55, fF: [3.8, 1.6] } },
      { t: 0.5, e: "io", p: { ...GUARD, rx: -2.8, drop: 0.6, rise: 1.2, lean: -0.06, twist: -0.7, hx: 2.6, hy: 0.8, aF: [1.15, 0.86, 0], shield: -0.08, aN: [-3.02, 0.88, 0], nb: 1, sw: -1.05, fF: [4, 2.6], roar: 1 } },
      // the cut (one frame): a step in, the blade comes over and down, the shield swept aside
      { t: HIT, e: "in3", p: { ...GUARD, rx: 3.4, drop: 2, lean: 0.34, twist: 2, hx: 4.6, hy: 2.2, aF: [0.5, 0.5, 0], shield: 0.22, aN: [1.25 - TAU, 1, 0], nb: 0, sw: 2.0, fF: [8.6, 0], roar: 1 } },
      { t: 0.68, e: "out", p: { ...GUARD, rx: 4, drop: 2.6, lean: 0.4, twist: 2.3, hx: 5, hy: 2.6, aF: [0.45, 0.5, 0], shield: 0.26, aN: [0.8 - TAU, 0.98, 0], sw: 2.5, fF: [8.6, 0], roar: 1 } },
      { t: 0.8, e: "io", p: { ...GUARD, rx: 3.6, drop: 2.2, lean: 0.36, twist: 1.8, hx: 4.6, hy: 2.4, aF: [0.5, 0.52, 0], shield: 0.22, aN: [0.76 - TAU, 0.96, 0], sw: 2.44, fF: [8.6, 0] } },
      // back behind the shield, the blade swinging down past the leg to trail again
      { t: 0.91, e: "io", p: { ...GUARD, rx: 1.2, drop: 1.8, lean: 0.24, twist: 0.5, aF: [0.75, 0.58, 0], shield: 0.14, aN: [0.15 - TAU, 0.62, 0], sw: 3.25, fF: [6, 1.2] } },
      { t: 1, e: "io", p: { ...GUARD, aN: [-0.2 - TAU, 0.93, 0], sw: -2.5 + TAU } },
    ], ph),
  },
};
