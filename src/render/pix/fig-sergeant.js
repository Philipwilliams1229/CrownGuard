// ============ FIGURE: the Iron Kingdom's Knight-Sergeant ============
// Look "b" of the levy's family: blued plate over padding (a brass-edged gorget, a layered
// pauldron riveted to the sword arm: the stand-out shape), a barbute with a T cut for the face,
// a dagged oxblood surcoat with a brass hem-line, a heater shield bossed and scarred with the grey
// tower, a longsword with a leather-wrapped grip. Heavier than the levy and a head taller.
// Facing +x. Clips: `idle` (the blade carried low, the heater up), `walk` (8 frames, a heavy
// tread), `attack` (the sword raised over the shoulder behind, shield tucked in, a hard cut
// down through the foe, recover; `hit` is the cut going home).
import { mat, flat, layers } from "./pix.js";
import { stampFace } from "./bowlayers.js";
import { solve, sampleKeys, walkPose, HUMAN, scaled, clamp } from "./rig.js";

// shield, sword, arm and pauldron, back to front (the sword always crosses the shield with its hand)
const LAYER = layers(["shield", "device", "sword", "nearArm", "pauldron"], [], { z0: 8.4, step: 0.3 });
export const MUST = [["sword", "sameSide", "nearHand"], ["shield", "visible", 0.4], ["nearArm", "notOver", "eyes"]];
// THE GRIP. The sword is held in a closed fist; its angle is DERIVED from the solved forearm: blade angle (from upright,
// + toward the foe) = forearm direction (elbow -> hand) + GRIP + wrist (clamped to +-0.35). The blade stands up out of
// the top of the fist, about 95 degrees from the forearm.
export const GRIP_A = -1.65;
const WRIST = 0.35;
const forearm = (sk) => { const f = Math.atan2(sk.hdN[0] - sk.eN[0], -(sk.hdN[1] - sk.eN[1])); return f < -1.9 ? f + Math.PI * 2 : f; };
export const swordAngle = (sk) => forearm(sk) + GRIP_A + clamp(sk.p.wrist || 0, -WRIST, WRIST);
export const BONES = scaled(HUMAN, 1.28, { thigh: 10.2, shin: 9.6, ankle: 2.5, spine: 14.2, neck: 1.8, shN: -3, shF: 3.4, hipN: -1.5, hipF: 1.7 });
export const BOX = { w: 84, h: 80, ox: 30, oy: 74 };
const ARM = BONES.upper + BONES.fore;

const SKIN = mat("#e0b088"), EYE = flat("#c8d4e8"), BROW = mat("#4a3426"), LIP = flat("#a8685a");
const PLATE = mat("#646a78", { contrast: 1.3 }), PLATEK = mat("#3a3e4a", { contrast: 1.15 }), STEELB = mat("#c4c8d0", { contrast: 1.3 }), IRON = mat("#6c7280", { contrast: 1.25 });
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), PAD = mat("#6a604c"), LEATHER = mat("#5a3c28"), GRIP = mat("#3a2418");
const BRASS = mat("#c8a040", { contrast: 1.2 }), HOSE = mat("#3c3e4a", { floor: 1 }), GREY = mat("#a8aeb8", { contrast: 1.2 }), BLADE = mat("#dde2ea", { contrast: 1.35 });
const SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });

// the barbute: M plate, W glint, m the bowl's dark under-edge and the slot's shadow, K its rim,
// S skin, s a tone down, N nose, E eye (e shut), l lips, z beard-shadow
const HEAD = [
  "......MMMMMM....",
  "....MMMMMMMMMM..",
  "...MMWWMMMMMMMM.",
  "..MMWMMMMMMMMMMM",
  ".MMMMMMMMMMMMMMM",
  ".MMMMMMMMMMMMMMM",
  ".MMMMMMmmmmmmmMM",
  ".MMMMMMmSEESEMMM",
  ".MMMMMMMmSSSSNMM",
  ".MMMMMMMMmSSNMM.",
  ".MMMMMMMMmzSSMM.",
  "..MMMMMMMMmllMM.",
  "..KKKKKKKKKmmMK.",
  "...mmmmmmmmmmm..",
];
const blink = (rows) => rows.map((r) => r.replace(/E/g, "e"));
const LEG = {
  M: { m: PLATE }, W: { m: PLATE, bias: 1 }, m: { m: PLATEK }, K: { m: PLATEK, bias: 1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  E: { m: EYE }, e: { m: SKIN, fix: 0 }, l: { m: LIP }, z: { m: SKIN, fix: 0 },
};

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.6, k[0], k[1], 2.3, HOSE, z, { bias: b, floor: 1 });
  px.capsule(h[0] * 0.6 + k[0] * 0.4, h[1] * 0.6 + k[1] * 0.4, 2.9, h[0] * 0.2 + k[0] * 0.8, h[1] * 0.2 + k[1] * 0.8, 2.7, PLATE, z + 0.01, { bias: b });   // the cuisse
  px.capsule(k[0], k[1], 2.2, an[0], an[1] - 2.5, 1.9, PLATE, z + 0.02, { bias: b });                                                                  // the greave
  px.ellipse(k[0] + 0.8, k[1], 2.4, 2.1, PLATE, z + 0.04, { bias: b, cast: 1 });                                                                       // the poleyn
  px.dot(k[0] + 1.4, k[1] - 0.6, STEELB, z + 0.05, { fix: 4 });
  px.capsule(k[0] * 0.3 + an[0] * 0.7, k[1] * 0.3 + an[1] * 0.7, 2.3, an[0], an[1], 2.0, PLATEK, z + 0.03, { bias: b });
  px.ellipse(an[0] + 1.6, an[1] + 1.2, 3.3, 1.6, PLATEK, z + 0.04, { bias: b });
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2, 2), vx2 = cl(lag1.C[0] - lag2.C[0], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // the far arm: a mail-sleeved, plated arm behind the shield
  px.part();
  px.capsule(sF[0], sF[1], 2.3, eF[0], eF[1], 2.2, PAD, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.2, hdF[0], hdF[1], 2.0, PLATE, 1, { bias: -1 });
  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // the breastplate over padding, the tassets, the oxblood surcoat over it, dagged
  const hemY = P[1] + 6.4, hemB = P[0] - 6.4 - vx * 1.0, hemF = P[0] + 6.2 - vx * 0.6;
  px.part(); const cu = px._pid;
  px.poly([[C[0] - 5.4, C[1] - 2.4], [C[0] + 5.6, C[1] - 2.4], [C[0] + 6.4, C[1] + 3], [P[0] + 5, P[1] - 1], [P[0] + 5.2, P[1] + 3], [P[0] - 5.4, P[1] + 3], [P[0] - 5.4, P[1] - 2], [C[0] - 6.4, C[1] + 3]], PLATE, 4, { round: 0.92, cast: 2 });
  px.toneLine(C[0] - 1, C[1] + 1, P[0] - 1, P[1], -1, cu);
  px.part(); const sc = px._pid;
  const hem = [[hemF, hemY - 0.6], [hemF - 2.8, hemY + 2], [hemF - 4.6, hemY - 0.4], [hemF - 7.4, hemY + 2], [hemF - 9.4, hemY - 0.4], [hemB + 5.8, hemY + 2], [hemB + 3.8, hemY - 0.4], [hemB + 1.4, hemY + 1.8], [hemB, hemY - 0.6]];
  px.poly([[C[0] - 4, C[1] + 0.4], [C[0] + 4.4, C[1] + 0.4], [C[0] + 5.4, C[1] + 3.6], [P[0] + 4.2, P[1] - 3], ...hem, [P[0] - 4.4, P[1] - 3], [C[0] - 5.2, C[1] + 3.6]], OX, 4.02, { round: 0.92, cast: 2 });
  px.toneLine(P[0] + 1.4, P[1] - 2, P[0] + 1.2 - vx * 0.5, hemY - 1.6, -1, sc);
  px.toneLine(P[0] - 2.4, P[1] - 2, P[0] - 2.8 - vx * 0.7, hemY - 1.6, 1, sc);
  px.line(hemB + 0.8, hemY - 1.2, hemF - 0.8, hemY - 1.2, BRASS, 4.04);
  // the breastplate's upper curve shows above the surcoat, a ridge down its middle
  px.part();
  px.poly([[C[0] - 5, C[1] - 2.2], [C[0] + 5.2, C[1] - 2.2], [C[0] + 5.8, C[1] + 1.2], [C[0] + 2, C[1] + 0.6], [C[0] - 2, C[1] + 0.8], [C[0] - 5.8, C[1] + 1.2]], PLATE, 4.06, { round: 0.9, cast: 1 });
  px.line(C[0] + 0.4, C[1] - 2, C[0] + 0.6, C[1] + 0.6, STEELB, 4.08, { noLine: true });
  px.part(); px.rect(C[0] - 1, C[1] + 2.4, 5, 4.4, GREY, 4.1, { fix: 3 });          // the tower on his chest, bigger than the levy's
  px.dot(C[0] - 1, C[1] + 1.6, GREY, 4.1, { fix: 3 }); px.dot(C[0] + 1, C[1] + 1.6, GREY, 4.1, { fix: 3 }); px.dot(C[0] + 3, C[1] + 1.6, GREY, 4.1, { fix: 3 });
  px.rect(C[0] + 0.8, C[1] + 5, 1.4, 2, OXK, 4.12, { noLine: true });
  // the belt, and the sword's scabbard-hanger buckle
  px.part();
  px.poly([[P[0] - 5.4, P[1] - 4.8], [P[0] + 5.2, P[1] - 4.8], [P[0] + 5.3, P[1] - 2.8], [P[0] - 5.5, P[1] - 2.8]], LEATHER, 4.15, { round: 0.92 });
  px.rect(P[0] + 1.6, P[1] - 4.8, 2.2, 2.2, BRASS, 4.16, { fix: 3 });
  px.part(); px.rect(P[0] - 5, P[1] - 2.8, 3, 3.4, LEATHER, 4.2, { cast: 1 }); px.dot(P[0] - 3.6, P[1] - 2, BRASS, 4.21, { fix: 3 });
  // the gorget, brass edged, and an oxblood scarf knotted at the neck that trails behind
  px.part();
  px.poly([[C[0] - 5, C[1] - 3.4], [C[0] + 5.2, C[1] - 3.4], [C[0] + 6, C[1] + 0.2], [C[0] - 5.8, C[1] + 0.4]], PLATE, 5, { round: 0.9, cast: 1 });
  px.line(C[0] - 5.4, C[1] + 0.2, C[0] + 5.6, C[1] + 0.2, BRASS, 5.05, { noLine: true });
  px.part();
  const sw = cl(-vx * 1.6 - vx2 * 1.0, -2.4, 2.4);
  px.poly([[C[0] - 3, C[1] - 3.4], [C[0] + 1, C[1] - 3], [C[0] - 5.4 + sw * 0.4, C[1] + 2 + sw * 0.2], [C[0] - 10.2 + sw, C[1] + 5.6 + sw * 0.5], [C[0] - 8.2 + sw, C[1] + 7.6], [C[0] - 5 + sw * 0.7, C[1] + 4.6]], OX, 4.9, { round: 0.6, cast: 1 });

  // the head: no crest on the barbute, a rim of brass
  px.part();
  stampFace(px, p.blink ? blink(HEAD) : HEAD, hx, hy, LEG, 6, 6, { ax: 7, ay: 14, cast: 2, ball: [8, 6, 8, 7] }, "SsNEelz");
  px.dot(hx + 9, hy - 6.4, BRASS, 6.1, { fix: 3 }); px.dot(hx + 9, hy - 3.6, BRASS, 6.1, { fix: 3 });   // the slot's brass studs

  const ZS = LAYER(p);
  // ---- the heater shield on the far arm: oxblood field, iron rim, a boss, a brass chief, the tower
  const shc = [hdF[0] + 4.4 + (p.shx || 0), hdF[1] - 1.4 + (p.shy || 0)];
  const sx = shc[0], sy = shc[1], hw = 7.2;
  const heater = (k) => [[sx - hw * k, sy - 9 * k], [sx + hw * k, sy - 9 * k], [sx + hw * k, sy + 0.4 * k], [sx + hw * 0.55 * k, sy + 6 * k], [sx, sy + 10 * k], [sx - hw * 0.55 * k, sy + 6 * k], [sx - hw * k, sy + 0.4 * k]];
  px.part(); const hid = px._pid;
  px.poly(heater(1), IRON, ZS.shield, { round: 0.7 });
  px.poly(heater(0.84), OX, ZS.shield + 0.02, { round: 0.8 });
  px.toneLine(sx - 2.4, sy - 7, sx - 2.4, sy + 6, -1, hid);
  px.rect(sx - hw * 0.84, sy - 7.6, hw * 1.68, 2.4, BRASS, ZS.shield + 0.04, { fix: 3, noLine: true });       // the chief
  px.part();
  px.rect(sx - 2.6, sy - 3.4, 5.2, 5.6, GREY, ZS.device, { fix: 3 });
  px.dot(sx - 2.6, sy - 4.4, GREY, ZS.device, { fix: 3 }); px.dot(sx - 0.6, sy - 4.4, GREY, ZS.device, { fix: 3 }); px.dot(sx + 1.4, sy - 4.4, GREY, ZS.device, { fix: 3 });
  px.rect(sx - 0.6, sy - 0.2, 1.2, 2.4, OXK, ZS.device + 0.02, { noLine: true });
  px.part(); px.ellipse(sx, sy + 4.2, 1.5, 1.3, STEELB, ZS.device + 0.1, { cast: 1 });                            // the boss
  for (const [dx, dy] of [[-5.4, -4], [5.2, -4], [-4.6, 1.4], [4.4, 1.4], [-2.6, 5.6], [2.4, 5.6]]) px.dot(sx + dx, sy + dy, STEELB, ZS.device + 0.1, { fix: 4 });
  px.line(sx + 2, sy - 6.4, sx + 5, sy - 1.6, OXK, ZS.device + 0.06, { noLine: true });                          // the scar across the field
  px.line(sx - 5, sy + 0.8, sx - 3, sy + 3, GREY, ZS.device + 0.06, { noLine: true, fix: 2 });
  px.part(); px.ellipse(hdF[0] + 0.2, hdF[1] + 0.4, 1.9, 1.9, PLATEK, 6.8, { bias: -1 });

  // ---- the longsword: a leather grip, a brass pommel, a steel crossguard, a long blade
  const ha = swordAngle(sk), hg = 4, ux = Math.sin(ha), uy = -Math.cos(ha), vxn = Math.cos(ha), vyn = Math.sin(ha);
  const Hs = [hdN[0] - ux * hg, hdN[1] - uy * hg];
  const at = (a, b) => [Hs[0] + ux * a + vxn * b, Hs[1] + uy * a + vyn * b];
  const zs = ZS.sword;
  px.part(); px.tag("sword");
  px.capsule(...at(0, 0), 1.0, ...at(hg + 1, 0), 1.0, GRIP, zs, { edge: true });
  px.ellipse(...at(-1, 0), 1.7, 1.7, BRASS, zs + 0.02);
  px.capsule(...at(hg + 1.2, -4.2), 0.9, ...at(hg + 1.2, 4.2), 0.9, STEELB, zs + 0.04, { edge: true });      // the crossguard
  px.poly([at(hg + 1.8, -1.5), at(hg + 1.8, 1.5), at(hg + 25, 1.3), at(hg + 29, 0), at(hg + 25, -1.3)], BLADE, zs + 0.05, { n: [0.1, 0.1, 0.95] });
  px.line(...at(hg + 3, 0), ...at(hg + 26, 0), IRON, zs + 0.06, { fix: 1, noLine: true });             // the fuller
  px.tag(null);
  // the near arm: a plated arm, the pauldron layered and riveted on top
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1] + 0.3, 2.6, eN[0], eN[1], 2.3, PAD, ZS.nearArm, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.3, hdN[0], hdN[1], 2.0, PLATE, ZS.nearArm, { cast: 2 });
  px.ellipse(eN[0], eN[1], 2.2, 2.2, PLATE, ZS.nearArm + 0.05, { cast: 1 });                                          // the couter
  px.capsule(eN[0] * 0.28 + hdN[0] * 0.72, eN[1] * 0.28 + hdN[1] * 0.72, 2.2, eN[0] * 0.14 + hdN[0] * 0.86, eN[1] * 0.14 + hdN[1] * 0.86, 2.2, PLATEK, ZS.nearArm + 0.07);   // the gauntlet cuff
  px.part(); px.ellipse(hdN[0], hdN[1], 1.8, 2.3, PLATEK, ZS.nearArm + 0.2, { rot: -ha });
  px.tag(null);
  px.part();
  for (const [k, dz] of [[1, 0], [0.74, 0.02]]) px.ellipse(sN[0] + 0.4, sN[1] + 0.8 + (1 - k) * 2.2, 4.6 * k, 3.9 * k, PLATE, ZS.pauldron + dz, { cast: 1 });
  px.line(sN[0] - 4.6, sN[1] + 1.8, sN[0] + 5, sN[1] + 1.8, BRASS, ZS.pauldron + 0.05, { noLine: true });
  px.dot(sN[0] + 0.8, sN[1] - 1.4, STEELB, ZS.pauldron + 0.1, { fix: 4 }); px.dot(sN[0] - 2.4, sN[1] - 0.6, STEELB, ZS.pauldron + 0.1, { fix: 4 });
  return { H: { at }, hg };
};

// the cut's streak: a wedge trailing the blade's length on the frames it comes down
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "attack" || ph < 0.44 || ph > 0.62 || !info.H) return;
  const { at } = info.H, h = info.hg;
  px.poly([at(h + 8, -3), at(h + 30, -2.4), at(h + 24, 3), at(h + 6, 2.6)], SMEAR2, 20, { noLine: true });
  px.poly([at(h + 12, -1.6), at(h + 29, -1.2), at(h + 25, 1.6), at(h + 10, 1.4)], SMEAR, 20.1, { noLine: true });
};

// ---- poses ---------------------------------------------------------------------------------
const TAU = Math.PI * 2;
const aim = (s, t) => { const dx = t[0] - s[0], dy = t[1] - s[1]; return [Math.atan2(dx, dy), clamp(Math.hypot(dx, dy) / ARM, 0.25, 0.97), 0]; };
const STAND = { fN: [-3, 0], fF: [3.6, 0] };
// b.n: the sword hand, b.ha: the blade's angle from upright (+ toward the foe, 1.57 level), b.f: the shield hand
const hold = (b) => { const p = { ...STAND, ...b }, s = solve(p, BONES); p.aN = aim(s.sN, b.n); p.aF = aim(s.sF, b.f); return p; };
const REST = { n: [4.5, -33], wrist: 0.3, f: [13.5, -29.5], twist: 0.4, lean: 0.03, shx: 0, shy: 0, blink: 0 };

export const CLIPS = {
  idle: {
    n: 8, ms: 2400, loop: true, lag: 0.1,
    pose: (ph) => { const b = 0.5 - 0.5 * Math.cos(ph * TAU); return hold({ ...REST, rise: 0.8 * b, n: [4.5, -33 + 0.4 * b], wrist: 0.3 + 0.03 * b, f: [13.5, -29.5 - 0.4 * b], blink: ph > 0.62 && ph < 0.72 ? 1 : 0 }); },
  },
  walk: {
    n: 8, ms: 860, loop: true, lag: 0.08,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 5.6, lift: 2.8, swing: 0.28, bob: 1.3, lean: 0.07 }), a = Math.cos(ph * TAU), d = w.drop;
      return hold({ ...w, ...REST, twist: 0.4 + w.twist * 0.25, n: [4.5, -33 + d * 0.8], wrist: 0.3 + 0.05 * a, f: [13.5, -29.5 + d * 0.9], lean: 0.07 });
    },
  },
  // the heater is tucked up, the sword drawn up behind the shoulder; the cut comes down hard and
  // through; held a beat on the follow-through; recover
  attack: {
    n: 13, ms: 900, loop: false, lag: 0.06, hit: 0.5,
    pose: (ph) => hold(sampleKeys([
      { t: 0, p: REST },
      { t: 0.18, e: "io", p: { ...REST, n: [-2, -36.5], wrist: 0.35, f: [14, -30.5], rx: -0.8, lean: -0.04, twist: -0.1, drop: 0.3 } },
      { t: 0.38, e: "out", p: { ...REST, n: [-6.5, -47.5], wrist: 0.35, f: [14.5, -32], rx: -2.2, lean: -0.14, twist: -0.7, drop: 0.7, hy: -0.4, fF: [3, 0] } },
      { t: 0.5, e: "in3", p: { ...REST, n: [15, -29], wrist: 0.35, f: [13, -29], rx: 3, lean: 0.26, twist: 0.9, drop: 1.7, hx: 0.8, fF: [7.6, 0], shx: 0.8 } },
      { t: 0.64, e: "out", p: { ...REST, n: [16.5, -23], wrist: 0.1, f: [13, -28.5], rx: 3.4, lean: 0.28, twist: 0.9, drop: 1.8, hx: 0.8, fF: [7.6, 0], shx: 0.8 } },
      { t: 0.84, e: "io", p: { ...REST, n: [12, -24], wrist: 0.1, f: [13, -29.5], rx: 1, lean: 0.1, twist: 0.5, drop: 0.5, fF: [4.4, 0] } },
      { t: 1, e: "io", p: REST },
    ], ph)),
  },
};
