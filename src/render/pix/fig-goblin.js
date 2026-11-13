// ============ CONCEPT FIGURE: the Greenwood goblin raider ============
// Small (about 37 px with the hood's point; a man is ~44), hunched, three heads
// tall, bandy bare legs. A peaked leather hood whose point flops a beat behind
// the head, long ears that bounce behind it too, red eyes under a heavy brow, a
// hooked nose, a snaggle grin. A crude knife in the near fist, a round plank
// shield on the far arm. Three clips: idle, walk, attack (a lunging stab).
// VARIANT `o.variant === "bare"` (the game's goblinBare, the bare-eared footpad):
// no hood and no shield. A bald knobbly skull with a scrap of dark hair that
// flops a beat behind, both big ears showing whole (a notch in the near one), a lopsided sneer, and the far hand a free fist that he throws
// back to balance the lunge (the pose's `bF`: the far arm when it carries nothing).
// With no variant every frame is pixel for pixel the hooded raider.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, ik } from "./rig.js";

const SKIN = mat("#6aa04f"), HOOD = mat("#5a4630"), JERK = mat("#6a4a2a"), DARK = mat("#3c2a18");
const STEEL = mat("#8a8a92", { contrast: 1.25 }), WOOD = mat("#8a6238"), BONE = mat("#ece0c4");
const EYE = flat("#d8402e"), GLINT = flat("#ffb070"), MOUTH = flat("#2c1a22");
const JERK_B = mat("#6e4c28"), HAIR = mat("#3a2a1c");

// The head, facing +x, a quarter turned: the hood over the crown and the back,
// a heavy brow (B), red eyes (E, e the glint), the nose proud of the face (N),
// a grin of odd teeth (T) in a dark mouth (M). K hood, k its shadowed rim.
const HEAD = [
  "....KKKKKK.......",
  "..KKKKKKKKKK.....",
  ".KKKKKKKKKKKK....",
  ".KKKKkkkkkkkk....",
  ".KKKkBBBBGGBBBB..",
  ".KKkGbEeGGbEeG...",
  ".KKGGbEEGGbEEHH..",
  ".KKGGGGGGGGgLHHHL",
  ".KkGGGGGGGGgnLLNN",
  "..KgMTMTMMTMg.nn.",
  "..kGgMMMMMMg.....",
  "...gGGGGGGg......",
  ".....gggg........",
];
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
// the glance: the eyes slide back toward what is behind him
const GLANCE = swap(HEAD, { 5: ".KKkGeEbGGeEbG...", 6: ".KKGGEEbGGEEbHH.." });
const BLINK = swap(HEAD, { 5: ".KKkGGGGGGGGGG...", 6: ".KKGGBBBGGBBBHH.." });
// the stab's snarl: the jaw dropped a row, more teeth
const SNARL = swap(HEAD, { 9: "..KgMTMTMTMTg.nn.", 10: "..kGMMMMMMMMg....", 11: "...gGTMTMTGg.....", 12: "....gGGGGg......." });
// The footpad's head: the same face under a bare skull (a lit dome, d its dent),
// the jaw set in a sneer that climbs toward the nose, one fang over the lip.
const BARE = [
  ".................",
  "......GGGGG......",
  "....GGGGGGGGG....",
  "...GGGGGGGGGGG...",
  "..GGGBBBBGGBBBB..",
  "..GGGbEeGGbEeG...",
  "..GGGbEEGGbEEHH..",
  "..GGGGGGGGGgLHHHL",
  "..gGGGGGGGGgnLLNN",
  "..ggGGGMMMTMg.nn.",
  "...GgMMMMTGg.....",
  "...gGGGGGGg......",
  ".....gggg........",
];
const BARE_GLANCE = swap(BARE, { 5: "..GGGeEbGGeEbG...", 6: "..GGGEEbGGEEbHH.." });
const BARE_BLINK = swap(BARE, { 5: "..GGGGGGGGGGGG...", 6: "..GGGBBBGGBBBHH.." });
const BARE_SNARL = swap(BARE, { 9: "..ggMTMTMTMTg.nn.", 10: "...GMMMMMMMMg....", 11: "...gGTMTMTGg.....", 12: "....gGGGGg......." });
const LEG = {
  K: { m: HOOD }, k: { m: HOOD, bias: -1 }, G: { m: SKIN }, g: { m: SKIN, bias: -1 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 1 }, L: { m: SKIN, fix: 3 }, H: { m: SKIN, fix: 4 },
  B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, E: { m: EYE }, e: { m: GLINT }, T: { m: BONE, fix: 3 }, M: { m: MOUTH },
};

export const BOX = { w: 48, h: 48, ox: 18, oy: 42 };
export const BONES = { thigh: 6, shin: 5.5, ankle: 1.8, spine: 8, neck: 1, upper: 5.2, fore: 5.2, shN: -2.8, shF: 2.6, hipN: -1.7, hipF: 1.8 };

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const bare = o.variant === "bare", jerk = bare ? JERK_B : JERK;
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  // how the head moved over the last two beats: what hangs off it trails by that
  const vx = cl(N[0] - lag1.N[0], -2, 2), vy = cl(N[1] - lag1.N[1], -2, 2);
  const vx2 = cl(lag1.N[0] - lag2.N[0], -2, 2), vy2 = cl(lag1.N[1] - lag2.N[1], -2, 2);
  const bx = cl(P[0] - lag1.P[0], -2, 2);

  // the far arm, a tone down, and the shield it carries before him
  if (bare) {
    // the footpad's far arm carries nothing: a wristband and a knobbly fist, a tone down
    const bf = p.bF || [0.95, 0.6, 0], L = sk.B.upper + sk.B.fore;
    const r = ik(sF[0], sF[1], sF[0] + Math.sin(bf[0]) * bf[1] * L, sF[1] + Math.cos(bf[0]) * bf[1] * L, sk.B.upper, sk.B.fore, 1);
    const [e2, h2] = [r.mid, r.end], w0 = mix(e2, h2, 0.6), w1 = mix(e2, h2, 0.74);
    px.part();
    px.capsule(sF[0], sF[1], 1.6, e2[0], e2[1], 1.5, SKIN, 1, { bias: -1 });
    px.capsule(e2[0], e2[1], 1.5, h2[0], h2[1], 1.4, SKIN, 1, { bias: -1 });
    px.capsule(w0[0], w0[1], 1.55, w1[0], w1[1], 1.55, DARK, 1.02, { floor: 1 });
    px.part();
    px.ellipse(h2[0] + 0.3, h2[1], 1.9, 1.8, SKIN, 1.1, { bias: -1 });
  } else {
  px.part();
  px.capsule(sF[0], sF[1], 1.6, eF[0], eF[1], 1.5, SKIN, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 1.5, hdF[0], hdF[1], 1.4, SKIN, 1, { bias: -1 });
  const sh = [hdF[0] + 0.9, hdF[1] - 0.4];
  px.part(); const shId = px._pid;
  px.ellipse(sh[0], sh[1], 3.9, 4.8, DARK, 1.5, { round: 0.6 });
  px.ellipse(sh[0], sh[1], 2.9, 3.8, WOOD, 1.52, { round: 0.75 });
  px.toneLine(sh[0] - 1.2, sh[1] - 4, sh[0] - 1.2, sh[1] + 4, -1, shId);
  px.toneLine(sh[0] + 1.4, sh[1] - 4, sh[0] + 1.4, sh[1] + 4, -1, shId);
  px.part();
  px.ellipse(sh[0], sh[1], 1.3, 1.3, STEEL, 1.56, { cast: 1 });
  }

  // bandy bare legs, big flat feet
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(hp[0], hp[1], 2, kn[0], kn[1], 1.7, SKIN, z, { bias: b });
    px.capsule(kn[0], kn[1], 1.6, an[0], an[1], 1.25, SKIN, z, { bias: b });
    px.capsule(an[0] - 0.5, an[1] + 0.75, 1.15, an[0] + 3.4, an[1] + 0.95, 0.95, SKIN, z, { bias: b });
  }

  // the jerkin: a hunched barrel from the shoulders to a ragged hem
  px.part();
  px.poly([[C[0] - 4, C[1] - 1.6], [C[0] + 3.2, C[1] - 1.2], [C[0] + 4.2, C[1] + 2.6], [P[0] + 4, P[1] - 1], [P[0] + 4.2, P[1] + 1.6],
    [P[0] - 4.2, P[1] + 1.6], [P[0] - 4.6, P[1] - 2], [C[0] - 5.4, C[1] + 2.4]], jerk, 4, { round: 0.92, cast: 1 });
  // the hem's tatters
  px.dot(P[0] - 3, P[1] + 2, jerk, 4); px.dot(P[0] - 2, P[1] + 2, jerk, 4); px.dot(P[0] + 1, P[1] + 2, jerk, 4); px.dot(P[0] + 3, P[1] + 2, jerk, 4);
  // the belt
  px.poly([[P[0] - 4.7, P[1] - 2.4], [P[0] + 4.1, P[1] - 2.4], [P[0] + 4.2, P[1] - 0.6], [P[0] - 4.5, P[1] - 0.6]], DARK, 4.05, { round: 0.92 });

  // the far ear, behind the hood
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const tw = p.ear || 0, ex = -vx * 1.2 - vx2 * 0.8, ey = -vy * 1.3 - vy2 * 0.9 - tw * 1.8;
  px.part();
  if (bare) px.poly([[hx - 1.6, hy - 8.4], [hx - 2.6, hy - 4.6], [hx - 6 + ex * 0.5, hy - 7.4 + ey * 0.5], [hx - 9 + ex, hy - 12 + ey], [hx - 4.6 + ex * 0.5, hy - 10.4 + ey * 0.5]], SKIN, 5.5, { bias: -1, n: [-0.2, -0.2, 0.9] });
  else
  px.poly([[hx - 3, hy - 6.4], [hx - 2.4, hy - 2.6], [hx - 6 + ex * 0.5, hy - 5 + ey * 0.5], [hx - 9.4 + ex, hy - 8.6 + ey], [hx - 5.6 + ex * 0.5, hy - 7.6 + ey * 0.5]], SKIN, 5.5, { bias: -1, n: [-0.2, -0.2, 0.9] });

  // the head
  px.part();
  if (bare) px.stamp(p.blink ? BARE_BLINK : p.glance ? BARE_GLANCE : p.snarl > 0.5 ? BARE_SNARL : BARE, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [7.5, 6.5, 7.5, 7.5], cast: 1 });
  else
  px.stamp(p.blink ? BLINK : p.glance ? GLANCE : p.snarl > 0.5 ? SNARL : HEAD, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [7, 6.5, 8, 7.5], cast: 1 });

  // the hood's point: flops back, a beat behind the head
  const top = hy - 10, bend = cl(vx * 2 + vx2 * 1.4, -2, 2.6), bob = cl(vy * 1.2 + vy2 * 0.8, -1.5, 1.5);
  px.part();
  if (bare) {
    // no hood: a scrap of dark hair on the crown, flopping back a beat behind the head
    px.poly([[hx - 2.6, top + 2.4], [hx + 2.4, top + 2.4], [hx + 1 - bend * 0.3, top + 0.2], [hx - 1.4 - bend * 0.8, top - 1.8 - bob * 0.5],
      [hx - 4.6 - bend * 1.5, top - 1.4 - bob + Math.abs(bend) * 0.4], [hx - 3.4 - bend * 0.6, top + 0.8 - bob * 0.4]], HAIR, 6.3, { round: 0.8, ny: -0.2, floor: 1 });
  } else
  px.poly([[hx - 4.6, top + 1.4], [hx + 3, top + 1.4], [hx + 0.4 - bend * 0.3, top - 1.6], [hx - 3 - bend * 0.8, top - 3.4 - bob * 0.5],
    [hx - 7.4 - bend * 1.6, top - 4.6 - bob + Math.abs(bend) * 0.4], [hx - 5.6 - bend * 0.8, top - 1.4 - bob * 0.4], [hx - 5.2, top + 0.4]], HOOD, 6.3, { round: 0.9, ny: -0.2 });

  // the near ear, through its slit in the hood: long, pointed, back and up
  const eb = [hx - 2.6, hy - 3.4];
  px.part(); const earId = px._pid;
  if (bare) {
    // the whole ear, root and all: longer and broader than the slit shows, a notch in its lower edge
    const b = [hx - 3.2, hy - 4];
    px.poly([[b[0] + 0.6, b[1] - 3], [b[0] + 1.6, b[1] + 2.4], [b[0] - 2.2 + ex * 0.3, b[1] + 1.6 + ey * 0.3], [b[0] - 4 + ex * 0.4, b[1] - 0.4 + ey * 0.4], [b[0] - 5.2 + ex * 0.5, b[1] + 0.4 + ey * 0.5],
      [b[0] - 10.4 + ex, b[1] - 4.6 + ey], [b[0] - 4.6 + ex * 0.4, b[1] - 4.6 + ey * 0.4]], SKIN, 6.5, { n: [-0.25, -0.35, 0.9], cast: 1 });
    px.toneLine(b[0] - 0.2, b[1] - 0.4, b[0] - 6 + ex * 0.6, b[1] - 2.6 + ey * 0.6, -1, earId);
  } else {
  px.poly([[eb[0], eb[1] - 2.2], [eb[0] + 1, eb[1] + 1.8], [eb[0] - 3.6 + ex * 0.4, eb[1] + 0.2 + ey * 0.4], [eb[0] - 8.8 + ex, eb[1] - 3.6 + ey], [eb[0] - 4 + ex * 0.4, eb[1] - 3.6 + ey * 0.4]], SKIN, 6.5, { n: [-0.25, -0.35, 0.9], cast: 1 });
  px.toneLine(eb[0] - 0.4, eb[1] - 0.2, eb[0] - 5 + ex * 0.5, eb[1] - 1.8 + ey * 0.5, -1, earId);
  }

  // the near arm over it all: a wiry arm, a leather wristband, the knife in its fist
  const ka = p.knife ?? 1.2, d = [Math.sin(ka), -Math.cos(ka)], nn = [-d[1], d[0]];
  const at = (f, s) => [hdN[0] + d[0] * f + nn[0] * s, hdN[1] + d[1] * f + nn[1] * s];
  px.part();
  px.poly([at(1.4, -1), at(1.4, 1.3), at(5.4, 1.7), at(9, 0.1), at(5, -0.9)], STEEL, 8.1, { fix: 3 });
  px.line(...at(1.6, 1.2), ...at(5.6, 1.5), STEEL, 8.12, { fix: 4 });
  px.line(...at(1.6, -0.8), ...at(4.6, -0.8), STEEL, 8.12, { fix: 1 });
  px.part();
  px.capsule(...at(-2.2, 0), 0.8, ...at(1, 0), 0.8, DARK, 8.1);
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] + 0.2, 2.5, 2.3, jerk, 8, { cast: 0, bias: 1 });
  px.part();
  px.capsule(sN[0], sN[1] + 0.6, 1.7, eN[0], eN[1], 1.6, SKIN, 7.9, { cast: 1 });
  px.capsule(eN[0], eN[1], 1.6, hdN[0], hdN[1], 1.5, SKIN, 7.9, { cast: 1 });
  const b0 = mix(eN, hdN, 0.62), b1 = mix(eN, hdN, 0.74);
  px.capsule(b0[0], b0[1], 1.65, b1[0], b1[1], 1.65, DARK, 7.95, { cast: 1 });
  px.part();
  px.ellipse(hdN[0], hdN[1], 1.7, 1.7, SKIN, 8.3);

  return {};
};

const GUARD = { drop: 1, lean: 0.32, hx: 1.6, hy: 0, aN: [0.42, 0.8, 0], aF: [1.2, 0.9, 0], fN: [-3.4, 0], fF: [3.4, 0], knife: 1.5, snarl: 0, bF: [0.95, 0.6, 0] };
export const CLIPS = {
  idle: {
    n: 8, ms: 1400, loop: true, lag: 0.09,
    pose: (ph) => {
      const b = Math.sin(ph * Math.PI * 2), u = 0.5 + 0.5 * b;
      return { ...GUARD, rise: 0.7 * u, drop: 1 + 0.5 * (1 - u), aN: [0.42 + 0.05 * b, 0.8, 0], aF: [1.2, 0.9 - 0.03 * u, 0], bF: [0.95 - 0.07 * b, 0.6 + 0.03 * u, 0], knife: 1.5 + 0.1 * b,
        glance: ph >= 0.36 && ph < 0.62 ? 1 : 0, blink: ph >= 0.86 && ph < 0.98 ? 1 : 0, ear: ph >= 0.36 && ph < 0.5 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 520, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 3.7, lift: 2.6, swing: 0.5, bob: 1.5, lean: 0.36 }), a = Math.cos(ph * Math.PI * 2);
      return { ...w, drop: w.drop + 0.8, hx: 1.8, aN: [-a * 0.45 + 0.3, 0.84, 0], aF: [1.2 + 0.07 * a, 0.9, 0], bF: [a * 0.5 + 0.3, 0.8, 0], knife: 1.55 + 0.25 * a, snarl: 0 };
    },
  },
  attack: {
    n: 11, ms: 780, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      // crouch back and coil: the knife cocked up behind him, the shield thrust out
      { t: 0.24, e: "out", p: { ...GUARD, rx: -2.4, drop: 3, lean: 0.2, twist: -0.5, hx: 0.6, hy: 0.4, aN: [-0.9, 0.7, 0], aF: [1.3, 0.94, 0], bF: [1.45, 0.9, 0], knife: 0.5 } },
      { t: 0.36, e: "io", p: { ...GUARD, rx: -2.9, drop: 3.3, lean: 0.16, twist: -0.6, hx: 0.4, hy: 0.5, aN: [-1.1, 0.74, 0], aF: [1.34, 0.94, 0], bF: [1.55, 0.95, 0], knife: 0.3 } },
      // the lunge: a step in, the whole arm thrown out, the shield flung back for balance
      { t: 0.47, e: "in3", p: { ...GUARD, rx: 3.6, drop: 2.2, lean: 0.62, twist: 0.6, hx: 2.6, hy: 0.6, aN: [1.42, 1, 0], aF: [0.75, 0.85, 0], bF: [-1.4, 1, 0], fF: [8, 0], knife: 1.5, snarl: 1 } },
      { t: 0.58, e: "out", p: { ...GUARD, rx: 4.3, drop: 2.5, lean: 0.68, twist: 0.7, hx: 2.8, hy: 0.8, aN: [1.3, 1, 0], aF: [0.68, 0.85, 0], bF: [-1.58, 1, 0], fF: [8, 0], knife: 1.62, snarl: 1 } },
      // the hop back to guard
      { t: 0.8, e: "io", p: { ...GUARD, rx: 1, drop: 0.2, lean: 0.24, hx: 1.2, aN: [0.9, 0.7, 0], aF: [0.9, 0.86, 0], bF: [0.4, 0.66, 0], fN: [-3.4, 1.6], fF: [4.6, 2.4], knife: 0.9, snarl: 0 } },
      { t: 1, e: "out", p: GUARD },
    ], ph),
  },
};
