// ============ FIGURE: the Wolf Rider (the old `wolfrider` rig; the Rime Clans' rider borrows it) ============
// A raider on a dire wolf: the wolf of fig-wolf.js (drawn by it, whole, clips and all) with a
// man astride its shoulders, as the old rig had him: peach skin, a swept red mane and a short
// red beard, a brown-red jerkin belted in dark leather with a collar of pale fur, bare forearms
// in leather bracers, a long-hafted steel axe in the near fist, the far hand twisted in the
// wolf's ruff. Rider and wolf stand ~46 px tall. He rides a beat behind the back under him.
// Clips: idle (the wolf's low snarl, the rider swaying, the axe resting on his shoulder), walk
// (its RUN: the wolf's two-flight gallop, the rider low and forward, the axe held back), attack
// (the wolf crouches and lunges; the rider hauls the axe up and back, then chops down across
// the wolf's head as it snaps).
import { mat, flat } from "./pix.js";
import { sampleKeys, ik } from "./rig.js";
import { QUAD, beastFrames } from "./beast.js";
import * as wolf from "./fig-wolf.js";

const SKIN = mat("#e8b990"), HAIR = mat("#b0503a"), BROWN = mat("#6a3a2a"), BROWN2 = mat("#3a2018"), FUR = mat("#b4aa9a"), LEATHER = mat("#4a382c");
const STEEL = mat("#b8bcc4", { contrast: 1.3 }), IRONK = mat("#585c66"), WOOD = mat("#7a5632"), BRASS = mat("#c8a040");
const EYE = flat("#2a1c2c"), SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });

// The rider's head, facing +x a quarter turned: a swept red mane (R, r a tone down), the face
// (S, s shadowed, N the nose), a brow (b) over a dark eye (E, e shut), a red beard (R) with a
// mouth (M) in it.
const HEAD = [
  "....RRRRRR....",
  "..RRRRRRRRRR..",
  ".RRRRRRRRRRRR.",
  ".RRRRRRRRRRRR.",
  "RRRRsSbbSSbbS.",
  "rRRRsSSESSSEN.",
  "rRRRsSSSSSSSSN",
  ".RRRsSSSSSSSS.",
  ".rRRRsSSMMSS..",
  "..rRRRRRRRR...",
  "...rRRRRRR....",
];
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const BLINK = swap(HEAD, { 5: "rRRRsSSeSSSeN." });
const ROAR = swap(HEAD, { 8: ".rRRRsSMMMMS..", 9: "..rRRRRMMMR..." });
const LEG = { R: { m: HAIR }, r: { m: HAIR, bias: -1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, b: { m: HAIR, fix: 1 }, E: { m: EYE }, e: { m: SKIN, fix: 0 }, M: { m: BROWN2, fix: 0 } };

export const BOX = { w: 78, h: 56, ox: 34, oy: 52 };
export const BONES = wolf.BONES;
// the wolf's bones, as fig-wolf.js has them (the rider reads the same solved back)
const Q = { ...QUAD, spine: 19, height: 23.5, foreU: 9.5, foreL: 8.5, hindU: 11, hindL: 9.5, hindX: -4.5, tail: [6, 6, 5] };
const R = { thigh: 6.2, shin: 5.6, spine: 7.6, upper: 5.2, fore: 5.2 };

// the axe is locked to the fist: the forearm's direction + GRIP + a small wrist
const GRIP = -0.8;
export const MUST = [["nearArm", "notOver", "eyes"]];
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export const draw = (px, F, o = {}) => {
  const info = wolf.draw(px, F, o) || {};
  const { b, b1, b2 } = beastFrames(F, Q), p = b.p;
  // the seat: on the shoulders, a beat behind the back. Air under him when it drops, pressed into it when it rises.
  const s0 = b.at(0.2, 0, -0.4), s1 = b1.at(0.2, 0, -0.4), s2 = b2.at(0.2, 0, -0.4);
  const late = s1[1] * 0.65 + s2[1] * 0.35, air = cl(s0[1] - late, 0, 2.2), press = cl(late - s0[1], 0, 1.8);
  const H = [s0[0], s0[1] - air];
  const lean = (p.rLean ?? 0.3) + press * 0.05 - air * 0.04, sp = R.spine - press * 0.5;
  const C = [H[0] + Math.sin(lean) * sp, H[1] - Math.cos(lean) * sp];
  const N = [C[0] + Math.sin(lean) * 1.4 + 1.4 + (p.rHx ?? 0), C[1] - 2 + (p.rHy ?? 0)];
  const tw = p.rTwist ?? 0, sN = [C[0] - 2.8 + tw * 1.4, C[1] + 0.9], sF = [C[0] + 2.6 - tw * 1.4, C[1] - 0.1];
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const vx = cl((s0[0] - s1[0]) * 1.6, -2.4, 2.4), vy = cl(s0[1] - s1[1], -2, 2);

  // the far arm: its fist twisted in the ruff before him
  const grip = b.at(0.4, 1.4, 1.2), fa = ik(sF[0], sF[1], grip[0], grip[1], R.upper, R.fore, 1);
  px.part();
  px.limb([sF, fa.mid, fa.end], [1.9, 1.7, 1.6], SKIN, 7.6, { bias: -1 });
  const fw = mix(fa.mid, fa.end, 0.6);
  px.capsule(fw[0], fw[1], 1.85, fa.end[0], fa.end[1], 1.75, LEATHER, 7.62, { bias: -1, floor: 1, wrap: true });

  // the near leg: the knee forward and gripping the ribs, the shin and boot back down the flank
  const hp = [H[0] - 0.6, H[1] + 0.4], ft = [H[0] + 3 + (p.rKnee ?? 0), H[1] + 9.4];
  const lg = ik(hp[0], hp[1], ft[0], ft[1], R.thigh, R.shin, -1);
  px.part();
  px.capsule(hp[0], hp[1], 2.5, lg.mid[0], lg.mid[1], 2.1, BROWN2, 8, { cast: 1, floor: 1 });
  px.capsule(lg.mid[0], lg.mid[1], 2, lg.end[0], lg.end[1] - 0.6, 1.6, LEATHER, 8, { cast: 1, floor: 1 });
  px.capsule(lg.end[0] - 0.4, lg.end[1] - 0.2, 1.7, lg.end[0] + 3, lg.end[1] + 0.8, 1.3, LEATHER, 8.02, { cast: 1, floor: 1 });
  px.line(lg.mid[0] - 1.8, lg.mid[1] + 1.8, lg.mid[0] + 1.6, lg.mid[1] + 2, BRASS, 8.04, { fix: 3 });   // the boot's cuff

  // the jerkin: a hem swinging a beat behind, a dark belt, a brass buckle, a collar of fur
  const hemY = H[1] + 4.4, sw = cl(-vx * 1.0, -2.2, 2.2);
  px.part(); const tab = px._pid;
  px.poly([[C[0] - 4.4, C[1] - 1.6], [C[0] + 4, C[1] - 1.4], [C[0] + 4.8, C[1] + 2.8], [H[0] + 4.6, H[1] - 1], [H[0] + 5, hemY - 0.4], [H[0] + 2.6, hemY + 1.4], [H[0] + 0.4, hemY - 0.2],
    [H[0] - 2 + sw, hemY + 1.6], [H[0] - 4.2 + sw, hemY - 0.2], [H[0] - 5, H[1] - 2], [C[0] - 5.2, C[1] + 2.6]], BROWN, 8.5, { round: 0.92, cast: 1 });
  px.toneLine(H[0] + 1.6, H[1] - 2, H[0] + 1.4, hemY - 1.4, -1, tab);
  px.poly([[H[0] - 5, H[1] - 2.8], [H[0] + 4.8, H[1] - 2.8], [H[0] + 4.9, H[1] - 1.1], [H[0] - 5.1, H[1] - 1.1]], BROWN2, 8.55, { round: 0.92, floor: 1 });
  px.rect(H[0] + 1.2, H[1] - 2.8, 2, 1.8, BRASS, 8.57, { fix: 3 });
  px.part();
  px.poly([[C[0] - 4.6, C[1] - 2], [C[0] + 4, C[1] - 1.8], [C[0] + 4.6, C[1] + 0.8], [C[0] - 4.8, C[1] + 1]], FUR, 8.7, { round: 0.8, cast: 1 });
  for (const x of [-4, -1.6, 1, 3.4]) px.dot(C[0] + x, C[1] + 1.2, FUR, 8.7, { noLine: true });

  // the head: the mane streams back a beat late
  const tuft = cl(-vx * 1.5, -2.4, 2.4), tv = cl(-vy * 1.0, -1.4, 1.4);
  px.part();
  px.poly([[hx - 4, hy - 8], [hx + 3, hy - 8.4], [hx - 3 + tuft * 0.5, hy - 10 + tv * 0.4], [hx - 8 + tuft * 1.5, hy - 7.4 + tv], [hx - 9.6 + tuft * 2, hy - 3.8 + tv], [hx - 8 + tuft * 1.4, hy - 0.6], [hx - 6.6 + tuft, hy - 2.4], [hx - 5.4, hy - 4.6]], HAIR, 9.4, { round: 0.85, cast: 1 });
  px.part();
  px.stamp(p.rBlink ? BLINK : (p.rRoar ?? 0) > 0.5 ? ROAR : HEAD, hx, hy, LEG, 9.5, { ax: 7, ay: 9, cast: 2, ball: [8, 5.5, 8, 7] });

  // the near arm and the axe: a long ash haft, a bearded steel head on it
  const [ang, reach] = p.rArm ?? [1.0, 0.7], len = R.upper + R.fore;
  const na = ik(sN[0], sN[1], sN[0] + Math.sin(ang) * reach * len, sN[1] + Math.cos(ang) * reach * len, R.upper, R.fore, 1);
  const hd = na.end, fAng = Math.atan2(hd[1] - na.mid[1], hd[0] - na.mid[0]), la = fAng + GRIP + cl(p.wrist || 0, -0.35, 0.35), d = [Math.cos(la), Math.sin(la)], nn = [-d[1], d[0]];
  const at = (f, s = 0) => [hd[0] + d[0] * f + nn[0] * s, hd[1] + d[1] * f + nn[1] * s];
  px.part(); px.tag("weapon");
  px.capsule(...at(-4), 0.8, ...at(17), 0.8, WOOD, 10, { cast: 1 });
  px.part();
  px.poly([at(14.4, 0.4), at(13, 4.6), at(16.2, 6), at(19.6, 4.2), at(19.2, 0.4)], STEEL, 10.05, { fix: 2 });
  px.poly([at(13, 4.6), at(16.2, 6), at(19.6, 4.2), at(18.6, 3.4), at(15.8, 4.8)], STEEL, 10.08, { fix: 4 });
  px.poly([at(15.4, -0.4), at(18.8, -0.4), at(18.2, -2.4)], IRONK, 10.04, { fix: 1 });
  px.poly([at(13.6, -0.8), at(19.6, -0.8), at(19.6, 1), at(13.6, 1)], IRONK, 10.1, { fix: 1 });
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] + 0.2, 2.3, 2.1, BROWN, 10.3, { cast: 0, bias: 1 });
  px.tag(null); px.part(); px.tag("nearArm");
  px.limb([[sN[0], sN[1] + 0.6], na.mid, hd], [1.9, 1.7, 1.6], SKIN, 10.5, { cast: 1 });
  const w0 = mix(na.mid, hd, 0.56);
  px.capsule(w0[0], w0[1], 1.9, hd[0], hd[1], 1.75, LEATHER, 10.55, { cast: 1, floor: 1, wrap: true });
  px.part();
  px.ellipse(hd[0], hd[1], 1.8, 1.8, SKIN, 10.7);
  px.tag(null);
  return { ...info, axe: { hd, d, nn }, foreMid: na.mid };
};

// the wolf's own snap, and the axe's chop on the frames it comes down
export const fx = (px, F, info, clip) => {
  wolf.fx(px, F, info, clip);
  if (clip !== "attack" || !info.axe) return;
  const p = F.sk.p, l = F.lag1.p;
  if (!((p.rChop ?? 0) > 0.5 && (l.rChop ?? 0) < 1.01)) return;
  const { hd, d, nn } = info.axe, at = (f, s = 0) => [hd[0] + d[0] * f + nn[0] * s, hd[1] + d[1] * f + nn[1] * s];
  px.poly([at(20, 5), at(12, 8.4), at(4, 6.4), at(11, 3)], SMEAR2, 20, { noLine: true });
  px.poly([at(19, 4.4), at(13, 6.4), at(8, 5.2), at(12, 3.4)], SMEAR, 20.1, { noLine: true });
};

// ---- the rider's own poses, laid over the wolf's -------------------------------------------
const TAU = Math.PI * 2;
const SEAT = { rLean: 0.22, rArm: [1.1, 0.7], axe: -1.15, rTwist: 0, rHx: 0, rHy: 0, rKnee: 0, rBlink: 0, rRoar: 0, rChop: 0 };
const RIDE = {
  idle: (ph) => { const s = Math.sin(ph * TAU), s2 = Math.sin(ph * TAU - 1); return { ...SEAT, rLean: 0.22 + 0.03 * s2, rArm: [1.1 + 0.04 * s, 0.7], axe: -1.15 + 0.05 * s2, rBlink: ph >= 0.86 && ph < 0.98 ? 1 : 0 }; },
  walk: (ph) => { const g = Math.cos(TAU * ph); return { ...SEAT, rLean: 0.5, rTwist: 0.3, rHx: 0.8, rHy: 0.6, rArm: [0.55, 0.7], axe: -0.5 + 0.06 * g, rKnee: 0.5, rRoar: 1 }; },
  attack: (ph) => sampleKeys([
    { t: 0, p: SEAT },
    // the crouch: the rider low over the neck, the axe hauled up and back
    { t: 0.2, e: "out", p: { ...SEAT, rLean: 0.5, rTwist: -0.4, rHx: 0.4, rHy: 0.6, rArm: [2.3, 0.74] } },
    { t: 0.34, e: "io", p: { ...SEAT, rLean: 0.4, rTwist: -0.6, rHx: 0.2, rHy: 0.4, rArm: [3.1, 0.8] } },
    // the lunge: thrown forward with the wolf, the axe brought over and down across its head
    { t: 0.48, e: "in3", p: { ...SEAT, rLean: 0.74, rTwist: 0.6, rHx: 1.6, rHy: 0.8, rArm: [0.5, 0.95], rRoar: 1, rChop: 1 } },
    { t: 0.58, e: "out", p: { ...SEAT, rLean: 0.8, rTwist: 0.7, rHx: 1.8, rHy: 1, rArm: [0.4, 0.95], rRoar: 1, rChop: 0 } },
    { t: 0.82, e: "io", p: { ...SEAT, rLean: 0.4, rArm: [1.3, 0.7] } },
    { t: 1, e: "out", p: SEAT },
  ], ph),
};
export const CLIPS = Object.fromEntries(Object.entries(wolf.CLIPS).map(([k, c]) => [k, { ...c, pose: (ph) => ({ ...c.pose(ph), ...RIDE[k](ph) }) }]));
