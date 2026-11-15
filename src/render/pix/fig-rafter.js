// ============ FIGURE: the Raft Goblin (game type `rafter`) ============
// The goblin raider who takes the river: the footpad of fig-goblin.js (the bare, knobbly
// skull with a scrap of dark hair, long ears, red eyes, a snaggle fang) in a patched brown
// jerkin, bandy bare legs, and a long ash spear held in TWO hands, steel head a little rusted.
// There is no raft in the figure (the engine paints the water): he is a goblin who paddles
// with a spear, and on land he trots with it carried slanted up and forward. About 37 px tall.
// Clips: idle (the spear held slanted up before him, a glance and a blink), walk (a
// bent trot, the spear carried across him), attack (the spear drawn back to the hip, then
// driven out the arm's length with a lunge, a dip, a recover; `hit` is the thrust landing).
import { mat, flat } from "./pix.js";
import { solve, walkPose, sampleKeys, ik } from "./rig.js";

const SKIN = mat("#6aa04f"), JERK = mat("#6e4c28"), DARK = mat("#3c2a18"), WOOD = mat("#8a6238");
const STEEL = mat("#b8bcc4", { contrast: 1.25 }), RUST = mat("#8a6a52", { contrast: 1.1 }), BONE = mat("#ece0c4"), HAIR = mat("#3a2a1c"), CLOTH = mat("#a05a3a");
const EYE = flat("#c8453a"), GLINT = flat("#ffb070"), MOUTH = flat("#2c1a22");
const SMEAR = flat("#f4efe0", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#cfd6e0", { emis: true, line: "#9aa4bc" });

// The head, facing +x, a quarter turned: the bare skull (a lit dome), a heavy brow (B), red
// eyes (E, e the glint), the nose proud of the face (N), the jaw set in a sneer with one fang.
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
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const GLANCE = swap(BARE, { 5: "..GGGeEbGGeEbG...", 6: "..GGGEEbGGEEbHH.." });
const BLINK = swap(BARE, { 5: "..GGGGGGGGGGGG...", 6: "..GGGBBBGGBBBHH.." });
// the thrust's snarl: the jaw dropped a row, more teeth
const SNARL = swap(BARE, { 9: "..ggMTMTMTMTg.nn.", 10: "...GMMMMMMMMg....", 11: "...gGTMTMTGg.....", 12: "....gGGGGg......." });
const LEG = {
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 1 }, L: { m: SKIN, fix: 3 }, H: { m: SKIN, fix: 4 },
  B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, E: { m: EYE }, e: { m: GLINT }, T: { m: BONE, fix: 3 }, M: { m: MOUTH },
};

export const BOX = { w: 78, h: 52, ox: 24, oy: 44 };
export const BONES = { thigh: 6, shin: 5.5, ankle: 1.8, spine: 8, neck: 1, upper: 5.2, fore: 5.2, shN: -2.8, shF: 2.6, hipN: -1.7, hipF: 1.8 };
const ARM = BONES.upper + BONES.fore;

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(N[0] - lag1.N[0], -2, 2), vy = cl(N[1] - lag1.N[1], -2, 2);
  const vx2 = cl(lag1.N[0] - lag2.N[0], -2, 2), vy2 = cl(lag1.N[1] - lag2.N[1], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // the far arm, behind the body, out along the spear's shaft to its forward grip
  px.part();
  px.capsule(sF[0], sF[1], 1.6, eF[0], eF[1], 1.5, SKIN, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 1.5, hdF[0], hdF[1], 1.4, SKIN, 1, { bias: -1 });
  const w0 = mix(eF, hdF, 0.62), w1 = mix(eF, hdF, 0.74);
  px.capsule(w0[0], w0[1], 1.55, w1[0], w1[1], 1.55, DARK, 1.02, { floor: 1 });

  // bandy bare legs, big flat feet
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(hp[0], hp[1], 2, kn[0], kn[1], 1.7, SKIN, z, { bias: b });
    px.capsule(kn[0], kn[1], 1.6, an[0], an[1], 1.25, SKIN, z, { bias: b });
    px.capsule(an[0] - 0.5, an[1] + 0.75, 1.15, an[0] + 3.4, an[1] + 0.95, 0.95, SKIN, z, { bias: b });
  }

  // the jerkin: a hunched barrel from the shoulders to a ragged hem, a patch on the hip
  px.part(); const jid = px._pid;
  px.poly([[C[0] - 4, C[1] - 1.6], [C[0] + 3.2, C[1] - 1.2], [C[0] + 4.2, C[1] + 2.6], [P[0] + 4, P[1] - 1], [P[0] + 4.2, P[1] + 1.6],
    [P[0] - 4.2, P[1] + 1.6], [P[0] - 4.6, P[1] - 2], [C[0] - 5.4, C[1] + 2.4]], JERK, 4, { round: 0.92, cast: 1 });
  px.dot(P[0] - 3, P[1] + 2, JERK, 4); px.dot(P[0] - 2, P[1] + 2, JERK, 4); px.dot(P[0] + 1, P[1] + 2, JERK, 4); px.dot(P[0] + 3, P[1] + 2, JERK, 4);
  px.poly([[P[0] - 4.7, P[1] - 2.4], [P[0] + 4.1, P[1] - 2.4], [P[0] + 4.2, P[1] - 0.6], [P[0] - 4.5, P[1] - 0.6]], DARK, 4.05, { round: 0.92 });
  px.rect(P[0] + 0.6, P[1] + 0.2, 3, 2, CLOTH, 4.08, { fix: 2 });                          // the patch
  px.toneLine(C[0] - 1, C[1] + 1, P[0] - 1, P[1] - 2.6, -1, jid);

  // the far ear, behind the skull
  const tw = p.ear || 0, ex = -vx * 1.2 - vx2 * 0.8, ey = -vy * 1.3 - vy2 * 0.9 - tw * 1.8;
  px.part();
  px.poly([[hx - 1.6, hy - 8.4], [hx - 2.6, hy - 4.6], [hx - 6 + ex * 0.5, hy - 7.4 + ey * 0.5], [hx - 9 + ex, hy - 12 + ey], [hx - 4.6 + ex * 0.5, hy - 10.4 + ey * 0.5]], SKIN, 5.5, { bias: -1, n: [-0.2, -0.2, 0.9] });

  // the head
  px.part();
  px.stamp(p.blink ? BLINK : p.glance ? GLANCE : p.snarl > 0.5 ? SNARL : BARE, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [7.5, 6.5, 7.5, 7.5], cast: 1 });

  // the scrap of hair on the crown, flopping back a beat behind
  const top = hy - 10, bend = cl(vx * 2 + vx2 * 1.4, -2, 2.6), bob = cl(vy * 1.2 + vy2 * 0.8, -1.5, 1.5);
  px.part();
  px.poly([[hx - 2.6, top + 2.4], [hx + 2.4, top + 2.4], [hx + 1 - bend * 0.3, top + 0.2], [hx - 1.4 - bend * 0.8, top - 1.8 - bob * 0.5],
    [hx - 4.6 - bend * 1.5, top - 1.4 - bob + Math.abs(bend) * 0.4], [hx - 3.4 - bend * 0.6, top + 0.8 - bob * 0.4]], HAIR, 6.3, { round: 0.8, ny: -0.2, floor: 1 });

  // the near ear, whole, a notch in its lower edge
  const b = [hx - 3.2, hy - 4];
  px.part(); const earId = px._pid;
  px.poly([[b[0] + 0.6, b[1] - 3], [b[0] + 1.6, b[1] + 2.4], [b[0] - 2.2 + ex * 0.3, b[1] + 1.6 + ey * 0.3], [b[0] - 4 + ex * 0.4, b[1] - 0.4 + ey * 0.4], [b[0] - 5.2 + ex * 0.5, b[1] + 0.4 + ey * 0.5],
    [b[0] - 10.4 + ex, b[1] - 4.6 + ey], [b[0] - 4.6 + ex * 0.4, b[1] - 4.6 + ey * 0.4]], SKIN, 6.5, { n: [-0.25, -0.35, 0.9], cast: 1 });
  px.toneLine(b[0] - 0.2, b[1] - 0.4, b[0] - 6 + ex * 0.6, b[1] - 2.6 + ey * 0.6, -1, earId);

  // ---- the spear: an ash shaft, a leaf head with a rusty rib, a rag tied under it. The shaft
  // runs through the rear (near) hand and the forward (far) hand, set by the pose's `sa`
  const sa = p.sa ?? -0.5, d = [Math.cos(sa), Math.sin(sa)], nn = [-d[1], d[0]];
  const at = (f, s = 0) => [hdN[0] + d[0] * f + nn[0] * s, hdN[1] + d[1] * f + nn[1] * s];
  const fl = cl(-vx * 1.2 + (p.flut || 0), -2, 2);
  px.part();
  px.capsule(...at(-10), 0.8, ...at(21), 0.8, WOOD, 8, { cast: 1 });
  px.capsule(...at(-10.4), 1.1, ...at(-9), 1.1, DARK, 8.02, { floor: 1 });             // the butt's ferrule
  px.part();
  px.poly([at(20, -1.2), at(22.4, -2.3), at(29, 0), at(22.4, 2.3), at(20, 1.2)], STEEL, 8.1, { fix: 3 });
  px.line(...at(21, 0.1), ...at(27.6, 0), RUST, 8.12, { fix: 1, noLine: true });
  px.line(...at(21.8, -1.6), ...at(26, -0.6), STEEL, 8.13, { fix: 4, noLine: true });
  px.capsule(...at(19.2), 1.1, ...at(20.4), 1.1, DARK, 8.1, { floor: 1 });
  px.part();
  px.poly([at(18.4, 0.6), at(15, 1.8 + fl * 0.4), at(10.4, 3 + fl), at(12.6, 0.8 + fl * 0.4)], CLOTH, 8.2, { round: 0.6, cast: 1 });

  // the rear (near) arm over it all: a wiry arm, a wristband, the fist round the shaft
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] + 0.2, 2.5, 2.3, JERK, 8.3, { cast: 0, bias: 1 });
  px.part();
  px.capsule(sN[0], sN[1] + 0.6, 1.7, eN[0], eN[1], 1.6, SKIN, 8.4, { cast: 1 });
  px.capsule(eN[0], eN[1], 1.6, hdN[0], hdN[1], 1.5, SKIN, 8.4, { cast: 1 });
  const n0 = mix(eN, hdN, 0.62), n1 = mix(eN, hdN, 0.74);
  px.capsule(n0[0], n0[1], 1.65, n1[0], n1[1], 1.65, DARK, 8.45, { cast: 1 });
  px.part();
  px.ellipse(hdN[0], hdN[1], 1.7, 1.7, SKIN, 8.6);
  // the forward fist, on the shaft ahead of it
  px.part();
  px.ellipse(hdF[0] + 0.2, hdF[1], 1.8, 1.7, SKIN, 8.7, { bias: -1 });
  return { H: { d, nn, at: hdN }, marks: { tip: at(29), grip: at(0) } };
};

// the thrust's streak: a pale wedge trailing the spearhead on the frames it drives out
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "attack" || ph < 0.44 || ph > 0.6 || !info.H) return;
  const { d, nn, at: h } = info.H, at = (a, b) => [h[0] + d[0] * a + nn[0] * b, h[1] + d[1] * a + nn[1] * b];
  px.poly([at(28, 0.3), at(16, -2.6), at(6, -3), at(14, -0.8)], SMEAR2, 20, { noLine: true });
  px.poly([at(27, 0.2), at(17, -1.6), at(10, -1.8), at(15, -0.4)], SMEAR, 20.1, { noLine: true });
};

// ---- poses ----------------------------------------------------------------------------------
const TAU = Math.PI * 2;
const aim = (s, t, flip = 0) => { const dx = t[0] - s[0], dy = t[1] - s[1]; return [Math.atan2(dx, dy), cl(Math.hypot(dx, dy) / ARM, 0.25, 0.97), flip]; };
// the spear through the rear hand at r = [x, y] (from the feet), shaft angle sa (+ down toward the foe),
// the forward hand `gap` ahead of it along the shaft
const hold = (b) => {
  const p = { ...b }, s = solve(p, BONES), sa = p.sa, gap = p.gap ?? 9;
  const f = [b.r[0] + Math.cos(sa) * gap, b.r[1] + Math.sin(sa) * gap];
  p.aN = aim(s.sN, b.r, p.nf ?? 0); p.aF = aim(s.sF, f);
  return p;
};
const GUARD = { drop: 1, lean: 0.3, hx: 1.6, hy: 0, fN: [-3.4, 0], fF: [3.4, 0], r: [6, -16], sa: -0.38, snarl: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 1400, loop: true, lag: 0.09,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b;
      return hold({ ...GUARD, rise: 0.7 * u, drop: 1 + 0.5 * (1 - u), r: [6 + 0.3 * b, -16 + 0.4 * b], sa: -0.38 + 0.05 * b, flut: b,
        glance: ph >= 0.36 && ph < 0.62 ? 1 : 0, blink: ph >= 0.86 && ph < 0.98 ? 1 : 0, ear: ph >= 0.36 && ph < 0.5 ? 1 : 0 });
    },
  },
  walk: {
    n: 8, ms: 520, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 3.7, lift: 2.6, swing: 0.5, bob: 1.5, lean: 0.36 }), a = Math.cos(ph * TAU);
      // the spear carried slanted across him, the points of it bobbing with the stride
      return hold({ ...w, drop: w.drop + 0.8, hx: 1.8, r: [5.6, -17 + w.drop * 0.5], sa: -0.62 + 0.06 * a, flut: a * 1.4, snarl: 0 });
    },
  },
  attack: {
    n: 12, ms: 780, loop: false, lag: 0.07, hit: 0.5,
    pose: (ph) => hold(sampleKeys([
      { t: 0, p: GUARD },
      // coil: the spear drawn back to the hip, point low and cocked, weight on the back foot
      { t: 0.26, e: "out", p: { ...GUARD, rx: -2.4, drop: 3, lean: 0.18, twist: -0.5, hx: 0.6, hy: 0.4, r: [-0.4, -14], sa: -0.12, gap: 8 } },
      { t: 0.38, e: "io", p: { ...GUARD, rx: -2.9, drop: 3.3, lean: 0.14, twist: -0.6, hx: 0.4, hy: 0.5, r: [-1.6, -13.6], sa: -0.08, gap: 8 } },
      // the thrust: a step in, the spear driven out level to the arm's length
      { t: 0.5, e: "in3", p: { ...GUARD, rx: 3.6, drop: 2.2, lean: 0.62, twist: 0.6, hx: 2.6, hy: 0.6, r: [9.4, -18.4], sa: 0.02, gap: 5, fF: [8, 0], snarl: 1 } },
      { t: 0.6, e: "out", p: { ...GUARD, rx: 4.3, drop: 2.5, lean: 0.68, twist: 0.7, hx: 2.8, hy: 0.8, r: [10.6, -18], sa: 0.12, gap: 5, fF: [8, 0], snarl: 1 } },
      // recover
      { t: 0.82, e: "io", p: { ...GUARD, rx: 1, drop: 0.2, lean: 0.24, hx: 1.2, r: [7, -17], sa: -0.2, fN: [-3.4, 1.6], fF: [4.6, 2.4] } },
      { t: 1, e: "out", p: GUARD },
    ], ph)),
  },
};
