// ============ CONCEPT FIGURE: Sir Aldric, the crown's knight ============
// Plate and gold, a red surcoat, cape and plume, a kite shield on the far arm,
// a longsword in the near fist. An open-faced helm so the face reads.
// Clips: idle (low guard, breathing), walk (sword on the shoulder), attack
// (wind-up over the shoulder, a fast cut, follow-through, back to guard).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, HUMAN, scaled } from "./rig.js";

const STEEL = mat("#98a2b6", { contrast: 1.18 }), MAIL = mat("#6c7488", { contrast: 1.1 }), GOLD = mat("#d8b34a", { contrast: 1.15 });
const RED = mat("#b03440"), RED_D = mat("#7e2434"), SKIN = mat("#e8b990"), HAIR = mat("#6a4a30"), LEATHER = mat("#5a3c28");
const BLADE = mat("#d4dae4", { contrast: 1.35 }), EYE = flat("#2a1c2c"), SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });

// the head: a domed helm with a gold brow band, a mail coif round the neck,
// the face open (M steel, m a tone down, G gold, c mail, S skin, s skin a tone
// down, E eye, N nose a tone up, B moustache)
const TOP = [
  ".....MMMM....",
  "...MMMMMMMM..",
  "..MMMMMMMMMM.",
  ".MMMMMMMMMMM.",
  ".GGGGGGGGGGG.",
];
// Three faces (round 2: the owner read the first one's long moustache as a flat
// mouth, "like he's just 😑 the whole time"). The fix in all three: nothing runs
// straight across the face, and the brows say something.
//   a  a trimmed moustache under the nose, a set jaw, a brow drawn down
//   b  a short brown beard round the jaw
//   c  clean-shaven: brows and a firm mouth
const FACES = {
  a: [
    ".cMsbbssbbs..",
    ".cMSSESSSES..",
    ".cmSSESSSESN.",
    ".cmSSSSSSSSN.",
    ".ccmSSSSBBB..",
    "..ccmSSSsS...",
    "..cccccc.....",
  ],
  b: [
    ".cMsbbssbbs..",
    ".cMSSESSSES..",
    ".cmSSESSSESN.",
    ".cBSSSSSSSSN.",
    ".cBBSSSBBBB..",
    "..cBBBBBBB...",
    "..cccBBB.....",
  ],
  c: [
    ".cMsbbssbbs..",
    ".cMSSESSSES..",
    ".cmSSESSSESN.",
    ".cmSSSSSSSSN.",
    ".ccmSSSSSSS..",
    "..ccmSSSll...",
    "..cccccc.....",
  ],
};
// round 1's face, kept only so the sheet can show the before
FACES.r1 = [
  ".cMssssssss..",
  ".cMSSESSSES..",
  ".cmSSESSSESN.",
  ".cmSSSSSSSSN.",
  ".ccmSBBBBB...",
  "..ccmSSSS....",
  "..cccccc.....",
];
const HEADS = {}, BLINKS = {};
for (const k in FACES) {
  HEADS[k] = [...TOP, ...FACES[k]];
  BLINKS[k] = HEADS[k].map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
}
export const VARIANTS = { a: "Trimmed moustache", b: "Short beard", c: "Clean-shaven" };
const LEG = {
  M: { m: STEEL }, m: { m: STEEL, bias: -1 }, G: { m: GOLD }, c: { m: MAIL }, S: { m: SKIN }, s: { m: SKIN, bias: -1 },
  N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, E: { m: EYE }, B: { m: HAIR }, b: { m: HAIR, fix: 2 }, l: { m: SKIN, fix: 0 },
};

export const BOX = { w: 84, h: 72, ox: 34, oy: 62 };
export const BONES = scaled(HUMAN, 1.08, { shN: -3.2, shF: 3.2, hipN: -1.4, hipF: 1.6, neck: 1.5 });
const CROWN = ["G.G.G", "GGGGG", "GGGGG"];
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// a plated leg: cuisse, knee cop, greave, sabaton
const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.5, k[0], k[1], 2.1, STEEL, z, { bias: b });
  px.capsule(k[0], k[1], 2, an[0], an[1], 1.7, STEEL, z, { bias: b });
  px.ellipse(k[0] + 0.6, k[1], 2, 1.9, STEEL, z + 0.02, { bias: b, vb: 0.25 });
  px.ellipse(an[0] + 1.2, an[1] + 0.9, 2.8, 1.4, MAIL, z + 0.03, { bias: b });
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const face = FACES[o.variant] ? o.variant : "b";
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5);
  const sway = p.sway || 0;

  // the cape: from the shoulders down the back, its tail a beat behind the body
  const t1 = -vx * 1.6 + sway * 0.6, t2 = -vx * 2.2 - vx2 * 1.8 + sway;
  px.part();
  px.poly([[C[0] - 3.6, C[1] - 1.6], [C[0] + 1.5, C[1] - 1.6], [P[0] - 1, P[1] + 2], [P[0] - 3.4 + t2 * 0.7, -6.4], [P[0] - 5.2 + t2, -8.2], [P[0] - 7.6 + t2, -6],
    [P[0] - 7.2 + t1, P[1] + 1.5], [C[0] - 6, C[1] + 3.5]], RED_D, 0.5, { round: 0.85 });
  px.toneLine(C[0] - 4.6, C[1] + 4, P[0] - 6 + t2 * 0.8, -8.5, -1, px._pid);

  // the far arm and its kite shield
  px.part();
  px.capsule(sF[0], sF[1], 2.1, eF[0], eF[1], 2, STEEL, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2, hdF[0], hdF[1], 1.8, STEEL, 1, { bias: -1 });
  const sx = hdF[0] * 0.7 + eF[0] * 0.3 + 0.8, sy = hdF[1] * 0.7 + eF[1] * 0.3 + 0.6, tl = p.shield ?? 0.08, cs = Math.cos(tl), sn = Math.sin(tl);
  const S = (x, y) => [sx + x * cs - y * sn, sy + x * sn + y * cs];
  px.part();
  px.poly([S(-4.6, -6.4), S(4.6, -6.4), S(4.9, 0.6), S(0, 8.2), S(-4.9, 0.6)], GOLD, 3.5, { round: 0.6, cast: 2 });
  px.poly([S(-3.5, -5.3), S(3.5, -5.3), S(3.7, 0.3), S(0, 6.5), S(-3.7, 0.3)], RED, 3.52, { round: 0.6 });
  // a gold crown on the field
  px.stamp(CROWN, sx - 2, sy - 3, { G: { m: GOLD, fix: 3 } }, 3.55, { cast: 0 });

  // legs
  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // the body: breastplate, then the surcoat's skirt over the hips, belt
  px.part();
  px.poly([[C[0] - 4.8, C[1] - 1.6], [C[0] + 5, C[1] - 1.6], [C[0] + 6.2, C[1] + 3.5], [P[0] + 4.8, P[1] - 2.6], [P[0] - 4.8, P[1] - 2.6], [C[0] - 6, C[1] + 3.5]], STEEL, 4, { round: 0.92, ny: -0.12, cast: 2 });
  const sk0 = [P[0] - 4.9, P[1] - 3], sk1 = [P[0] + 4.7, P[1] - 3], hemB = P[0] - 6 - vx * 1.2, hemF = P[0] + 5.8 - vx * 0.8, hy = P[1] + 3.6;
  px.part(); const skirt = px._pid;
  px.poly([sk0, sk1, [hemF, hy], [hemF - 2.4, hy + 0.9], [P[0] + 0.4 - vx, hy], [hemB + 2.6, hy + 0.9], [hemB, hy]], RED, 4.2, { round: 0.9, cast: 2 });
  px.toneLine(P[0] + 0.6, P[1] - 0.5, P[0] + 0.5 - vx, hy - 0.6, -1, skirt);
  px.poly([sk0, sk1, [sk1[0] + 0.1, sk1[1] + 2], [sk0[0] - 0.1, sk0[1] + 2]], LEATHER, 4.25, { round: 0.9 });
  px.rect(P[0] + 1.2, P[1] - 3, 2, 2, GOLD, 4.3, { fix: 3 });
  // gold at the collar and down the breastplate's keel
  px.line(C[0] - 2.4, C[1] - 1.2, C[0] + 3.4, C[1] - 1.2, GOLD, 4.3);

  // the head
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  px.part();
  px.stamp(p.blink ? BLINKS[face] : HEADS[face], hx, hyy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 2 });
  // the plume: red, rooted on the crown, streaming back a beat behind
  const pl = cl(vx * 2 + vx2 * 1.5, -3, 3) - sway * 0.5, rx0 = hx + 0.5, ry0 = hyy - 10;
  px.part();
  px.capsule(rx0, ry0 - 0.5, 1.5, rx0 - 2.2 - pl * 0.4, ry0 - 3, 2.1, RED, 6.5);
  px.capsule(rx0 - 2.2 - pl * 0.4, ry0 - 3, 2.1, rx0 - 5.6 - pl, ry0 - 1.4 + Math.abs(pl) * 0.3, 1.5, RED, 6.5);
  px.capsule(rx0 - 5.6 - pl, ry0 - 1.4, 1.4, rx0 - 7 - pl * 1.3, ry0 + 1.4, 0.8, RED, 6.5);

  // the sword through the near fist: sw is the blade's angle from upright (+ toward the foe)
  const a = p.sw ?? 2.3, d = [Math.sin(a), -Math.cos(a)], nrm = [-d[1], d[0]];
  const B = (t, s = 0) => [hdN[0] + d[0] * t + nrm[0] * s, hdN[1] + d[1] * t + nrm[1] * s];
  px.part();
  const bz = (p.nb || 0) > 0.5 ? 5.4 : 7;
  px.capsule(...B(2.5), 1.25, ...B(15.5), 1.05, BLADE, bz, { edge: true });
  px.capsule(...B(15.5), 1.05, ...B(17.6), 0.3, BLADE, bz, { edge: true });
  px.part();
  px.capsule(...B(-3), 0.9, ...B(1), 0.9, LEATHER, bz + 0.02);
  px.capsule(...B(1.8, -2.8), 0.85, ...B(1.8, 2.8), 0.85, GOLD, bz + 0.05, { edge: true });
  px.ellipse(...B(-3.6), 1.2, 1.2, GOLD, bz + 0.05);

  // the near arm over it all: pauldron, vambrace, gauntlet on the grip
  // (cocked back over the shoulder it passes BEHIND the helm, so the face stays open)
  const az = (p.nb || 0) > 0.5 ? 5.5 : 8;
  px.part();
  px.capsule(sN[0], sN[1] + 0.5, 2.2, eN[0], eN[1], 2.1, STEEL, az, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.1, hdN[0], hdN[1], 1.9, STEEL, az, { cast: 2 });
  px.ellipse(eN[0], eN[1], 1.8, 1.8, STEEL, az + 0.02, { vb: 0.25 });
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] - 0.4, 3.7, 3.2, STEEL, 8.1, { cast: 2 });
  px.line(sN[0] - 3, sN[1] + 2.2, sN[0] + 2.6, sN[1] + 2.2, GOLD, 8.12);
  px.part(); px.ellipse(hdN[0], hdN[1], 2, 1.9, MAIL, az + 0.2);

  return { hand: hdN, sw: a };
};

// the cut's smear: on the fastest frames the blade leaves a fan of light behind it
export const fx = (px, F, info, clip) => {
  if (clip !== "attack") return;
  const a1 = F.sk.p.sw, a0 = F.lag1.p.sw;
  if (!(a1 - a0 > 0.5)) return;
  const [hx, hy] = F.sk.hdN, [gx, gy] = F.lag1.hdN, n = 10;
  const at = (t, r) => { const a = a0 + (a1 - a0) * t, x = gx + (hx - gx) * t, y = gy + (hy - gy) * t; return [x + Math.sin(a) * r, y - Math.cos(a) * r]; };
  // a crescent: thin where the blade was, full where it is
  const arc = (t0, rIn, m, z) => { const out = [], inn = []; for (let i = 0; i <= n; i++) { const t = t0 + (1 - t0) * (i / n); out.push(at(t, 18)); inn.unshift(at(t, 18 - (18 - rIn) * ((t - t0) / (1 - t0)) ** 1.4)); } px.poly([...out, ...inn], m, z, { noLine: true }); };
  arc(0, 9, SMEAR2, 20); arc(0.45, 13, SMEAR, 20.1);
};

const GUARD = { aN: [0.42, 0.86, 0], aF: [0.55, 0.72, 0], sw: 2.25, shield: 0.06, fN: [-2, 0], fF: [2.4, 0] };
export const CLIPS = {
  idle: {
    n: 8, ms: 1700, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 0.9); return { ...GUARD, rise: 0.5 + 0.5 * b, aN: [0.42, 0.86 - 0.03 * (0.5 + 0.5 * b), 0], sw: 2.25 + 0.03 * b2, sway: b2 * 0.8, blink: ph > 0.6 && ph < 0.72 ? 1 : 0 }; },
  },
  walk: {
    n: 8, ms: 720, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 5.4, lift: 2.8, swing: 0.4, bob: 1.2 }), a = Math.cos(ph * Math.PI * 2); return { ...w, aN: [0.7 + 0.06 * a, 0.56, 0], sw: -0.42 + 0.05 * a, aF: [0.5 + 0.18 * a, 0.72, 0], shield: 0.06 + 0.05 * a }; },
  },
  attack: {
    n: 12, ms: 760, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      { t: 0.3, e: "out", p: { rx: -1.4, drop: 0.7, lean: -0.13, twist: -0.7, rise: 0.4, aN: [3.4, 0.8, 1], nb: 1, sw: -1.05, aF: [1.0, 0.8, 0], shield: -0.1, fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.38, e: "io", p: { rx: -1.6, drop: 0.8, lean: -0.15, twist: -0.8, rise: 0.5, aN: [3.5, 0.82, 1], nb: 1, sw: -1.2, aF: [1.05, 0.8, 0], shield: -0.1, fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.5, e: "in3", p: { rx: 2.4, drop: 1.6, lean: 0.2, twist: 0.8, hx: 0.5, aN: [1.02, 1, 0], nb: 0, sw: 1.95, aF: [0.2, 0.8, 0], shield: 0.25, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.62, e: "out", p: { rx: 3, drop: 2, lean: 0.25, twist: 0.9, hx: 0.6, aN: [0.5, 0.96, 0], sw: 2.75, aF: [0.05, 0.82, 0], shield: 0.3, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.74, e: "io", p: { rx: 2.6, drop: 1.6, lean: 0.2, twist: 0.6, hx: 0.4, aN: [0.46, 0.94, 0], sw: 2.62, aF: [0.15, 0.8, 0], shield: 0.25, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 1, e: "io", p: GUARD },
    ], ph),
  },
};
