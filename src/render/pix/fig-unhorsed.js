// ============ FIGURE: the Unhorsed Knight (game type `unhorsed`) and the Unseated Knight (`unseated`) ============
// A cavalier's knight who outlived his horse, on foot in the plate he rode in: blued steel
// from sallet to sabaton (the Iron levy's iron, a heavier cut), an oxblood surcoat belted over
// the breastplate with a dagged hem and a brass line, a short riding cape torn in the fall, a
// small heater shield on the far arm and an arming sword. He rolled clear, so he is scuffed:
// a dent in the shield, a rip in the cape.
//   o.variant === "gryphon": the Gryphon Knight's rider, thrown from a fallen gryphon: the
//   darker cape of that house and one tawny gryphon feather caught in the sallet.
// Clips: idle (DAZED: he sways on his feet, head hung, the sword's point dragging; the engine
// holds him there for `dropStun`), walk (a slow plated march, sword carried up), attack (a
// short back-step, the blade hauled behind the shoulder, a heavy cut down across, recover;
// `hit` is the blade coming through).
import { mat, flat, layers } from "./pix.js";
import { solve, sampleKeys, walkPose, HUMAN, scaled, clamp } from "./rig.js";

export const BONES = scaled(HUMAN, 1.2, { thigh: 9.6, shin: 9.2, ankle: 2.4, spine: 13.4, neck: 1.8, shN: -2.8, shF: 3.2, hipN: -1.5, hipF: 1.7 });
export const BOX = { w: 88, h: 84, ox: 34, oy: 80 };
const ARM = BONES.upper + BONES.fore;

const SKIN = mat("#e0b088"), EYE = flat("#2a1c2c"), LIP = flat("#a8685a"), BROW = mat("#4a3426");
const IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#3c4048", { contrast: 1.1 }), STEELB = mat("#c4c8d0", { contrast: 1.3 });
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), OX2 = mat("#6a2226", { contrast: 1.1 });
const LEATHER = mat("#5a3c28"), BRASS = mat("#c8a040", { contrast: 1.2 }), GREY = mat("#a8aeb8", { contrast: 1.2 });
const FEATHER = mat("#b08850"), BOOT = mat("#2a2a30", { contrast: 1.2, floor: 1 });
const SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });

// the sallet, facing +x: a bowl with a long tail over the nape (M iron, W its glint, m the
// brim's underside), the face open under it (S skin, s a tone down, N nose, b brow, E eye
// (e shut), l a hint of mouth) and the bevor over the chin and throat (B)
const SALLET = [
  "......MMMMM.....",
  "....MMMMMMMMM...",
  "...MMWWMMMMMMM..",
  "..MMMWMMMMMMMMM.",
  "MMMMMMMMMMMMMMMM",
  "MMmmmmmmmmmmmmmm",
  "MMMMsSSbbSbbS...",
  "MMMMsSSSESSSEN..",
  "mMMMsSSSSSSSSN..",
  ".mMMBBBBBBBSS...",
  "..mMBBBBBBBBS...",
  "...mBBBBBBBB....",
];
const blink = (rows) => rows.map((r) => r.replace(/E/g, "e"));
// dazed: the visor-less face slack, the eyes half shut
const DAZED = SALLET.map((r, i) => (i === 7 ? "MMMMsSSSeSSSeN.." : i === 6 ? "MMMMsSSSSSSSSS.." : r));
const LEG = {
  M: { m: IRON }, W: { m: IRON, bias: 1 }, m: { m: IRONK }, B: { m: IRON, bias: -1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  b: { m: BROW, fix: 1 }, E: { m: EYE }, e: { m: SKIN, fix: 0 },
};

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// shield, sword and near arm, back to front. The sword and its hand are ONE group that always
// crosses the shield together (the old `over` flip left the blade behind the rim while the hand
// was in front of it).
const LAYER = layers(["shield", "device", "sword", "nearArm"], [], { z0: 8.4, step: 0.3 });
export const MUST = [["sword", "sameSide", "nearHand"], ["shield", "visible", 0.4]];
const axes = (ha) => ({ u: [Math.sin(ha), -Math.cos(ha)], v: [Math.cos(ha), Math.sin(ha)] });

// the leg in plate: a cuisse, a knee cop, a greave, a sabaton
const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.7, k[0], k[1], 2.3, IRON, z, { bias: b });
  px.capsule(k[0], k[1], 2.2, an[0], an[1] - 2.5, 1.9, IRON, z, { bias: b });
  px.part();
  px.ellipse(k[0] + 0.5, k[1], 2.5, 2.3, IRON, z + 0.01, { bias: b, cast: 1 });
  px.dot(k[0] + 0.6, k[1] - 0.6, STEELB, z + 0.02, { fix: 4 });
  const g = mix(k, an, 0.45);
  px.line(g[0] - 1.8, g[1], g[0] + 1.8, g[1] + 0.2, IRONK, z + 0.02, { bias: b, fix: 1 });
  px.capsule(an[0] - 0.6, an[1] - 0.6, 2, an[0] + 3.4, an[1] + 0.9, 1.6, BOOT, z + 0.03, { bias: b, floor: 1 });
  px.ellipse(an[0] + 2.6, an[1] + 0.6, 1.8, 1.5, IRONK, z + 0.04, { bias: b, floor: 1 });
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const gry = o.variant === "gryphon", CAPE = gry ? OX2 : OX;
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.4, 2.4), vx2 = cl(lag1.C[0] - lag2.C[0], -2.4, 2.4);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // the torn riding cape, behind everything, streaming back a beat late
  px.part(); const capeId = px._pid;
  const cb = cl(-vx * 1.6 - vx2 * 1.2, -2.6, 2.6);
  px.poly([[C[0] - 3, C[1] - 2.6], [C[0] + 2, C[1] - 2.4], [C[0] - 3.6, C[1] + 8], [C[0] - 5.4 + cb, P[1] + 3],
    [C[0] - 7.2 + cb * 1.3, P[1] + 8], [C[0] - 8.6 + cb * 1.4, P[1] + 5.4], [C[0] - 10 + cb * 1.6, P[1] + 9.6], [C[0] - 11.4 + cb * 1.7, P[1] + 4]], CAPE, 0.5, { round: 0.8, cast: 1 });
  px.toneLine(C[0] - 4.6, C[1] + 2, C[0] - 8 + cb, P[1] + 8, -1, capeId);
  px.line(C[0] - 7 + cb * 1.2, P[1] + 8.4, C[0] - 6 + cb * 1.1, P[1] + 4, OXK, 0.52, { noLine: true });    // the rip

  // the far arm in its sleeve of plate, behind the shield
  px.part();
  px.capsule(sF[0], sF[1], 2.4, eF[0], eF[1], 2.1, IRON, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.1, hdF[0], hdF[1], 1.8, IRON, 1, { bias: -1 });

  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // the surcoat over the plate: belted, a dagged hem to mid-thigh swinging a beat behind
  const hemY = P[1] + 6, hemB = P[0] - 6.2 - vx * 1.1, hemF = P[0] + 6 - vx * 0.7;
  px.part(); const tab = px._pid;
  px.poly([[C[0] - 5, C[1] - 1.8], [C[0] + 5.2, C[1] - 1.8], [C[0] + 5.8, C[1] + 3], [P[0] + 4.8, P[1] - 3],
    [hemF, hemY - 0.6], [hemF - 2.6, hemY + 1.8], [hemF - 4.4, hemY - 0.4], [hemF - 7, hemY + 1.8], [hemF - 8.6, hemY - 0.4], [hemB + 5.4, hemY + 1.8], [hemB + 3.6, hemY - 0.4], [hemB + 1.4, hemY + 1.6], [hemB, hemY - 0.6],
    [P[0] - 5, P[1] - 3], [C[0] - 5.8, C[1] + 3]], OX, 4, { round: 0.92, cast: 2 });
  px.toneLine(P[0] + 1.6, P[1] - 2, P[0] + 1.4 - vx * 0.5, hemY - 1.6, -1, tab);
  px.toneLine(P[0] - 2.4, P[1] - 2, P[0] - 2.8 - vx * 0.7, hemY - 1.6, 1, tab);
  px.line(hemB + 0.8, hemY - 1.2, hemF - 0.8, hemY - 1.2, BRASS, 4.04);
  // the plate showing at the breast: a gorget at the throat, the breastplate's top edge, the belt
  px.part();
  px.poly([[C[0] - 5.4, C[1] - 3.6], [C[0] + 5.4, C[1] - 3.6], [C[0] + 5.8, C[1] + 0.2], [C[0] - 5.8, C[1] + 0.4]], IRON, 4.5, { round: 0.9, cast: 1 });
  px.line(C[0] - 5, C[1] + 0.6, C[0] + 5.2, C[1] + 0.4, IRONK, 4.52, { fix: 1 });
  px.poly([[P[0] - 5.2, P[1] - 4.6], [P[0] + 5, P[1] - 4.6], [P[0] + 5.1, P[1] - 2.8], [P[0] - 5.3, P[1] - 2.8]], LEATHER, 4.55, { round: 0.92 });
  px.rect(P[0] + 1.4, P[1] - 4.6, 2, 2, BRASS, 4.56, { fix: 3 });
  px.part();
  const c0 = [C[0] + 1.2, C[1] + 3.2];                                   // the tower on his breast
  px.rect(c0[0], c0[1], 2, 3, GREY, 4.6, { fix: 3 }); px.dot(c0[0], c0[1] - 1, GREY, 4.6, { fix: 3 }); px.dot(c0[0] + 1, c0[1] - 1, GREY, 4.6, { fix: 3 });
  // round pauldrons of blued plate
  for (const [s, zz, b] of [[sF, 1.8, -1], [sN, 8.4, 0]]) {
    px.part();
    px.ellipse(s[0] + 0.2, s[1] + 0.2, 4.4, 3.8, IRON, zz, { bias: b, cast: 1 });
    px.line(s[0] - 3.2, s[1] + 1.6, s[0] + 3.6, s[1] + 1.6, IRONK, zz + 0.01, { bias: b });
    px.dot(s[0] + 0.6, s[1] - 1.6, STEELB, zz + 0.02, { fix: 4 });
  }

  // the head: the crest and (for the gryphon's rider) the feather ride behind it
  const tuft = cl(-vx * 1.4 - vx2 * 1.0, -2, 2);
  px.part();
  px.poly([[hx - 4, hy - 11.4], [hx + 3, hy - 11.8], [hx + 3.2, hy - 13.6], [hx - 3.4 + tuft * 0.5, hy - 14.4], [hx - 8.6 + tuft * 1.5, hy - 11.6], [hx - 10.8 + tuft * 2, hy - 7.6], [hx - 9.6 + tuft * 1.4, hy - 3.8], [hx - 7 + tuft, hy - 6], [hx - 5.4, hy - 8.8]], CAPE, 5.9, { round: 0.85, cast: 1 });
  if (gry) {
    px.part();
    px.poly([[hx - 2, hy - 11.4], [hx - 3.6 + tuft * 0.4, hy - 15.4], [hx - 5.6 + tuft * 0.8, hy - 18.6], [hx - 6.8 + tuft * 1.2, hy - 17], [hx - 5 + tuft * 0.8, hy - 13.4], [hx - 3, hy - 11]], FEATHER, 5.95, { round: 0.7 });
    px.line(hx - 2.8, hy - 11.6, hx - 5.8 + tuft, hy - 17, OXK, 5.97, { noLine: true });
  }
  px.part();
  px.stamp(p.blink ? blink(SALLET) : (p.dazed ?? 0) > 0.5 ? DAZED : SALLET, hx, hy, LEG, 6, { ax: 7, ay: 12, cast: 2, ball: [8, 6, 8, 7] });
  px.dot(hx + 2, hy - 10.6, BRASS, 6.1, { fix: 3 });                      // a rivet

  const ZS = LAYER(p);
  // ---- the heater shield on the far arm, held up before him: an iron rim, an oxblood field
  const sc = [hdF[0] + 3.2, hdF[1] - 1.6 + (p.shy || 0)], sw = 5.6;
  px.part(); const sid = px._pid;
  const S = (x, y) => [sc[0] + x, sc[1] + y];
  px.poly([S(-sw, -7), S(sw, -7), S(sw + 0.4, 0.8), S(0, 9), S(-sw - 0.4, 0.8)], IRON, ZS.shield, { round: 0.6, cast: 2 });
  px.poly([S(-sw + 1.2, -5.8), S(sw - 1.2, -5.8), S(sw - 1, 0.4), S(0, 7.2), S(-sw + 1, 0.4)], OX, ZS.shield + 0.02, { round: 0.7, cast: 0 });
  px.toneLine(...S(-1.8, -5.6), ...S(-1.6, 5.6), -1, sid);
  px.part();
  px.rect(sc[0] - 2.2, sc[1] - 3.6, 4.4, 5, GREY, ZS.device, { fix: 3 });                // the tower
  px.dot(sc[0] - 2.2, sc[1] - 4.6, GREY, ZS.device, { fix: 3 }); px.dot(sc[0], sc[1] - 4.6, GREY, ZS.device, { fix: 3 }); px.dot(sc[0] + 2, sc[1] - 4.6, GREY, ZS.device, { fix: 3 });
  px.rect(sc[0] - 0.6, sc[1] - 1.2, 1.2, 2.4, OXK, ZS.device + 0.02, { noLine: true });
  px.line(sc[0] + 1.6, sc[1] - 6, sc[0] + 4.2, sc[1] - 1.4, OXK, ZS.device + 0.05, { noLine: true });   // the dent from the fall
  for (const [x, y] of [[-4.6, -6], [4.6, -6], [-5, 0.4], [5, 0.4]]) px.dot(sc[0] + x, sc[1] + y, STEELB, ZS.device + 0.1, { fix: 4 });
  px.part(); px.ellipse(hdF[0] + 0.2, hdF[1] + 0.4, 1.7, 1.7, IRON, 6.8, { bias: -1 });

  // ---- the arming sword: a straight steel blade, a brass cross, a wheel pommel; the near hand on the grip
  const ha = p.ha ?? 0, { u, v } = axes(ha);
  const at = (a, b = 0) => [hdN[0] + u[0] * a + v[0] * b, hdN[1] + u[1] * a + v[1] * b];
  const z = ZS.sword;
  px.part();
  px.capsule(...at(-3), 0.9, ...at(0.4), 0.9, LEATHER, z, {});
  px.dot(...at(-3.6), BRASS, z + 0.02, { fix: 3 });
  px.part();
  px.line(...at(1.4, -2.2), ...at(1.4, 2.2), BRASS, z + 0.05, { fix: 3 });
  px.poly([at(1.8, -1.3), at(2.8, 1.6), at(21, 1.7), at(25.4, 0), at(21, -1.7), at(2.8, -1.6)], STEELB, z + 0.06, { n: [0.1, 0.1, 0.95] });
  px.line(...at(4, 0.2), ...at(22, 0.2), IRON, z + 0.07, { fix: 1, noLine: true });

  // the near arm in plate, over the shield while the sword is out over its rim
  const zn = ZS.nearArm;
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.5, eN[0], eN[1], 2.2, IRON, zn, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.2, hdN[0], hdN[1], 1.8, IRON, zn, { cast: 2 });
  px.part(); px.ellipse(eN[0], eN[1], 2.1, 2, IRON, zn + 0.1, { cast: 1 });            // the couter
  px.part(); px.ellipse(hdN[0], hdN[1], 1.9, 1.9, LEATHER, zn + 0.2);
  return { H: { u, v, at: [hdN[0], hdN[1]] }, marks: { tip: at(25.4), grip: at(0) } };
};

// the cut's streak: a pale wedge trailing the blade on the frames it comes through
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "attack" || ph < 0.46 || ph > 0.62 || !info.H) return;
  const { u, v, at: h } = info.H, at = (a, b) => [h[0] + u[0] * a + v[0] * b, h[1] + u[1] * a + v[1] * b];
  px.poly([at(23, 0.4), at(12, -3.4), at(4, -4.2), at(10, -1.2)], SMEAR2, 20, { noLine: true });
  px.poly([at(22, 0.2), at(13, -2.4), at(8, -2.6), at(12, -0.6)], SMEAR, 20.1, { noLine: true });
};

// ---- poses ----------------------------------------------------------------------------------
const TAU = Math.PI * 2;
const aim = (s, t, flip = 0) => { const dx = t[0] - s[0], dy = t[1] - s[1]; return [Math.atan2(dx, dy), clamp(Math.hypot(dx, dy) / ARM, 0.25, 0.97), flip]; };
const STAND = { fN: [-2.8, 0], fF: [3.4, 0] };
// b.n: the sword hand, b.ha: the blade's angle from upright (+ toward the foe), b.f: the shield hand
const hold = (b) => {
  const p = { ...STAND, ...b }, s = solve(p, BONES);
  p.aN = aim(s.sN, b.n, b.nf ?? 0); p.aF = aim(s.sF, b.f);
  return p;
};
const REST = { n: [11, -23], ha: 0.4, f: [12, -28], twist: 0.4, rx: 0, lean: 0.03, drop: 0, hx: 0, hy: 0, shy: 0, dazed: 0 };

export const CLIPS = {
  // dazed: swaying on his feet, the head hung, the sword's point dragging, the shield low
  idle: {
    n: 8, ms: 2000, loop: true, lag: 0.1,
    pose: (ph) => {
      const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
      return hold({ ...REST, n: [7 + 0.8 * s, -19], ha: 2.5 + 0.06 * s, f: [8.5 - 0.6 * s, -23], rx: 1.2 * s, lean: 0.17 + 0.05 * c, hy: 2.2, hx: 0.8, twist: 0.2 + 0.2 * s, drop: 0.5 + 0.3 * c,
        dazed: 1, blink: 0, fN: [-2.8 - 0.8 * s, 0], fF: [3.4 - 0.8 * s, 0] });
    },
  },
  // the march: a short, flat, heavy step, the sword carried up, the shield riding before him
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.08,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 5, lift: 2.4, swing: 0.25, bob: 0.9, lean: 0.05 }), a = Math.cos(ph * TAU), d = w.drop;
      return hold({ ...w, twist: 0.35 + w.twist * 0.25, n: [12 + 0.4 * a, -29 + d], ha: 0.3 + 0.04 * a, f: [12, -28.4 + d * 0.9 + 0.3 * Math.cos(ph * TAU * 2)], blink: 0, dazed: 0 });
    },
  },
  // a back-step, the blade hauled behind the shoulder, then the cut thrown down across the shield's rim
  attack: {
    n: 12, ms: 900, loop: false, lag: 0.06, hit: 0.5,
    pose: (ph) => hold(sampleKeys([
      { t: 0, p: { ...REST, n: [12, -29], ha: 0.4, f: [12, -28] } },
      { t: 0.24, e: "io", p: { n: [-1, -41], ha: -0.5, nf: 1, f: [12, -29], rx: -1.8, lean: -0.1, twist: -0.1, drop: 0.5, fF: [3.4, 0] } },
      { t: 0.38, e: "out", p: { n: [-2.4, -43], ha: -0.7, nf: 1, f: [11.5, -28.6], rx: -2.6, lean: -0.15, twist: -0.4, drop: 0.8 } },
      { t: 0.5, e: "in3", p: { n: [12, -28], ha: 1.9, over: 1, f: [10, -22], rx: 3, lean: 0.24, twist: 0.8, drop: 1.6, hx: 0.6, fF: [7.2, 0], shy: 1.2 } },
      { t: 0.62, e: "out", p: { n: [13.5, -22], ha: 2.3, over: 1, f: [10.5, -22], rx: 3.4, lean: 0.27, twist: 0.8, drop: 1.8, hx: 0.6, fF: [7.2, 0], shy: 1.2 } },
      { t: 0.84, e: "io", p: { n: [9, -27], ha: 1.0, over: 0, f: [12, -27], rx: 0.8, lean: 0.07, twist: 0.4, drop: 0.4, fF: [4, 0] } },
      { t: 1, e: "io", p: { ...REST, n: [12, -29], ha: 0.4, f: [12, -28] } },
    ], ph)),
  },
};
