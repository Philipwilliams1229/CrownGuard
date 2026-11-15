// ============ CREW FIGURE: the castle's mason ============
// The Masons' Guild man at his block on the wall: a linen cowl, a plain tunic, a leather apron,
// a trowel in the near hand and a hawk of mortar in the far one (the old folk-workers.js
// drawMason, MASON_FRAMES). castle.js stands the trestle and the block itself; he works to
// them: the block's top is 24 art px up from his feet and starts 12 px out in front of him.
//   variant  none
// Clips: `work` (12 frames, 2400 ms, a loop: lay the trowel on the block, draw it along, lift it
//   off, scoop from the hawk, carry it over, set it down again), `idle` (the same man leaning on
//   the trowel's rest, breathing: for a pause).
import { mat, flat } from "./pix.js";
import { solve, sampleKeys, HUMAN, scaled, clamp } from "./rig.js";

export const BONES = scaled(HUMAN, 1.2, { thigh: 9.8, shin: 9.2, ankle: 2.4, spine: 13.6, neck: 1.8, shN: -2.6, shF: 3, hipN: -1.4, hipF: 1.6, upper: 7.6, fore: 7.2 });
export const BOX = { w: 70, h: 70, ox: 22, oy: 66 };
const ARM = BONES.upper + BONES.fore;

const EYE = flat("#2a1c2c"), LIP = flat("#b0705a");
const SKIN = mat("#e8b990"), COWL = mat("#c8b898"), TUNIC = mat("#8a7a5a"), SLEEVE = mat("#9a8a68"), APRON = mat("#8a6240", { contrast: 1.2 });
const HOSE = mat("#6a5c44"), BOOT = mat("#3e2a1a", { contrast: 1.2 }), BELT = mat("#4a3424"), STEEL = mat("#c4c8d0", { contrast: 1.3 });
const HAFT = mat("#5a4030"), BOARD = mat("#8a6a40"), MORTAR = mat("#d8d0c0", { contrast: 1.1 });

// the head, facing +x: the cowl round the crown and down the nape
//   H the cowl, h its fold, d its dark; S skin, s a tone down, N nose, E eye, m lips
const HEAD = [
  "....HHHH.....",
  "..HHHHHHHH...",
  ".HHHHHHHHHH..",
  "HHHHHHHHHHHH.",
  "HHHHHhdssss..",
  "HHHHhdSESSE..",
  "HHHHhdSESSEN.",
  "HHHhhdSSSSS..",
  ".HHhdsSSmm...",
  ".HHhdsSSSS...",
  "..HHh.ss.....",
  "..hHH........",
];
const BLINK = HEAD.map((r, i) => (i === 5 ? r.replace(/E/g, "S") : i === 6 ? r.replace(/E/g, "e") : r));
const LEG = (flip) => ({
  H: { m: COWL, fix: 2 }, h: { m: COWL, fix: 1 }, d: { m: COWL, fix: 0 },
  S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, E: { m: EYE }, m: { m: LIP },
});
const LEGEND = [LEG(false), LEG(true)];

const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.4, k[0], k[1], 2.1, HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 2.0, an[0], an[1] - 2.8, 1.8, HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.4 + an[0] * 0.6, k[1] * 0.4 + an[1] * 0.6, 2.1, an[0], an[1], 1.9, BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.3, an[1] + 1.1, 3, 1.6, BOOT, z + 0.03, { bias: b, floor: 1 });
};

export const draw = (px, { sk, lag1 }, o = {}) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = clamp(C[0] - lag1.C[0], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // the far arm (a tone down) and the hawk it holds: a board on a short handle, a heap of mortar
  px.part();
  px.capsule(sF[0], sF[1], 2.2, eF[0], eF[1], 2.0, SLEEVE, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.0, hdF[0], hdF[1], 1.8, SLEEVE, 1, { bias: -1 });
  px.part(); px.ellipse(hdF[0], hdF[1], 1.7, 1.8, SKIN, 1.6, { bias: -1 });
  px.part();
  px.rect(hdF[0] - 0.8, hdF[1] - 0.2, 1.6, 2.6, HAFT, 4.6, { fix: 1 });
  px.rect(hdF[0] - 5.2, hdF[1] - 2.6, 10.6, 1.8, BOARD, 4.7, { n: [0, -0.3, 0.95] });
  px.ellipse(hdF[0] + 0.2, hdF[1] - 3.8, 4.4, 2.1, MORTAR, 4.8, { round: 0.9 });

  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // the tunic, belted; the leather apron over the front of it to the knee
  const hemY = P[1] + 5, hemB = P[0] - 5.8 - vx, hemF = P[0] + 5.6 - vx * 0.6;
  px.part(); const tun = px._pid;
  px.poly([[C[0] - 4.6, C[1] - 2], [C[0] + 4.8, C[1] - 2], [C[0] + 5.8, C[1] + 3.4], [P[0] + 4.6, P[1] - 4], [hemF, hemY], [hemB, hemY], [P[0] - 4.8, P[1] - 4], [C[0] - 5.8, C[1] + 3.4]], TUNIC, 4, { round: 0.92, cast: 2, floor: 1 });
  px.toneLine(P[0] + 1.2, P[1] - 2, P[0] + 1 - vx * 0.5, hemY - 1.2, -1, tun);
  px.poly([[C[0] + 0.4, C[1] + 3], [C[0] + 5.2, C[1] + 3], [hemF + 0.6, hemY + 3.4], [P[0] - 1.4 - vx * 0.5, hemY + 3.4]], APRON, 4.04, { round: 0.9, floor: 1 });
  px.poly([[P[0] - 5, P[1] - 5], [P[0] + 4.8, P[1] - 5], [P[0] + 4.8, P[1] - 3], [P[0] - 5, P[1] - 3]], BELT, 4.06, { round: 0.92 });
  px.rect(P[0] + 2.4, P[1] + 1.4, 1, 3, HAFT, 4.08, { fix: 1 });                 // a chisel haft in the apron's loop

  px.part();
  px.poly([[C[0] - 5.6, C[1] - 2.8], [C[0] + 5.4, C[1] - 2.8], [C[0] + 6, C[1] + 0.2], [C[0] + 2.4, C[1] + 1.6], [C[0] - 2.6, C[1] + 1.8], [C[0] - 6.2, C[1] + 0.6]], COWL, 5, { round: 0.9, cast: 1 });
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hy, LEGEND[o.flip ? 1 : 0], 6, { ax: 6, ay: 12, cast: 1 });

  // the trowel: a pointing blade ahead of the fist (`tr` its angle, `tb` turned home), a handle in it
  const tr = p.tr ?? 0, back = (p.tb || 0) > 0.5, sg = back ? -1 : 1, ux = Math.cos(tr) * sg, uy = Math.sin(tr);
  px.part();
  px.line(hdN[0] - ux * 1.6, hdN[1] - uy * 1.6, hdN[0] + ux * 0.8, hdN[1] + uy * 0.8, HAFT, 7.6, { fix: 3 });
  px.poly([[hdN[0] + ux * 1, hdN[1] + uy * 1 - 0.4], [hdN[0] + ux * 9.6, hdN[1] + uy * 9.6 + 0.9], [hdN[0] + ux * 1.4 - uy * 0.5, hdN[1] + uy * 1.4 + ux * 0.5 + 1.8]], STEEL, 7.7, { n: [0, -0.3, 0.95] });

  // the near arm over it all, the fist on the trowel
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.5, eN[0], eN[1], 2.2, SLEEVE, 8, { cast: 1 });
  px.capsule(eN[0], eN[1], 2.2, hdN[0], hdN[1], 1.8, SLEEVE, 8, { cast: 1 });
  px.part(); px.ellipse(hdN[0], hdN[1], 1.8, 1.8, SKIN, 8.2);
  return { marks: { hand: [hdN[0], hdN[1]] } };
};

// ---- poses ---------------------------------------------------------------------------------
const aim = (s, t, flip = 0) => { const dx = t[0] - s[0], dy = t[1] - s[1]; return [Math.atan2(dx, dy), Math.min(0.97, Math.hypot(dx, dy) / ARM), flip]; };
const FEET = { fN: [-2.8, 0], fF: [3.2, 0] };
const HAWK = [11, -24];
// n: the near hand [x, y] from the feet; tr, tb: the trowel's angle and whether it is turned home
const hold = (b) => {
  const p = { ...FEET, ...b }, s = solve(p, BONES);
  p.aN = aim(s.sN, b.n);
  p.aF = aim(s.sF, [HAWK[0] + (b.hawk || 0), HAWK[1] + (b.hawkY || 0)]);
  return p;
};
const KEYS = [
  { t: 0, p: { n: [15, -26.5], tr: 0.1, rx: 1.2, lean: 0.14, twist: 0.4, drop: 0.5 } },                         // lay
  { t: 0.17, e: "io", p: { n: [21, -26], tr: 0.02, rx: 2, lean: 0.2, twist: 0.6, drop: 0.8 } },             // draw along
  { t: 0.33, e: "io", p: { n: [17.5, -33.5], tr: -0.4, rx: 1, lean: 0.1, twist: 0.3, drop: 0.3 } },           // lift off
  { t: 0.5, e: "io", p: { n: [12, -30.5], tr: 0.5, tb: 1, rx: 0.2, lean: 0.04, twist: 0.1, drop: 0.2 } },    // scoop from the hawk
  { t: 0.67, e: "io", p: { n: [13.5, -35.5], tr: -0.2, tb: 0, rx: 0.3, lean: 0.03, twist: 0.1, drop: 0 } },  // carry
  { t: 0.83, e: "io", p: { n: [16.4, -28.5], tr: 0.14, rx: 0.8, lean: 0.1, twist: 0.3, drop: 0.3 } },          // set down
  { t: 1, e: "io", p: { n: [15, -26.5], tr: 0.1, rx: 1.2, lean: 0.14, twist: 0.4, drop: 0.5 } },
].map((k) => ({ ...k, p: { tb: 0, ...k.p } }));

export const CLIPS = {
  work: { n: 12, ms: 2400, loop: true, lag: 0.1, pose: (ph) => hold(sampleKeys(KEYS, ph)) },
  idle: {
    n: 8, ms: 2400, loop: true, lag: 0.1,
    pose: (ph) => { const b = 0.5 - 0.5 * Math.cos(ph * Math.PI * 2); return hold({ n: [13, -30], tr: 0.2, tb: 0, rx: 0.6, lean: 0.07, twist: 0.2, rise: 0.8 * b, blink: ph > 0.6 && ph < 0.74 ? 1 : 0 }); },
  },
};
