// ============ CONCEPT FIGURE: the Iron Kingdom's levy (rank and file) ============
// A drilled spearman: an iron kettle hat, a padded jack, an oxblood tabard, a big round
// shield held up to the chin and a spear. Facing +x.
// The owner's pick of the concept round, look "b" (storied): a tuft on the hat, a riveted and
// scarred shield with the tower, a dagged tabard hem with a brass hem-line, a belt pouch, a
// tower sewn on the breast and a pennon under the spearhead.
// The shield rides IN FRONT of the near arm and the shaft (z above both): the spear is planted
// behind it, and in the thrust the shield drops so the shaft passes over its rim.
// Clips: `idle` (planted spear), `walk` (8 frames, spear carried), `attack` (shield drops, the
// spear drawn back level and driven home; `hit` is the point going home).
import { mat, flat, layers } from "./pix.js";
import { solve, sampleKeys, walkPose, HUMAN, scaled, lerp, clamp } from "./rig.js";

export const BONES = scaled(HUMAN, 1.2, { thigh: 9.8, shin: 9.2, ankle: 2.4, spine: 13.6, neck: 1.8, shN: -2.6, shF: 3, hipN: -1.4, hipF: 1.6 });
export const BOX = { w: 102, h: 84, ox: 28, oy: 80 };
const ARM = BONES.upper + BONES.fore;

const SKIN = mat("#e0b088"), EYE = flat("#2a1c2c"), LIP = flat("#a8685a"), BROW = mat("#4a3426");
const IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#3c4048", { contrast: 1.1 }), STEELB = mat("#c4c8d0", { contrast: 1.3 });
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), PAD = mat("#8e8266"), LEATHER = mat("#5a3c28"), WOOD = mat("#7a5a38");
const BRASS = mat("#c8a040", { contrast: 1.2 }), HOSE = mat("#4a4c58", { floor: 1 }), BOOT = mat("#2a2a30", { contrast: 1.2, floor: 1 }), GREY = mat("#a8aeb8", { contrast: 1.2 });
const SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });

// heads: M iron, W its glint, m the brim's underside, c padded collar, S skin, s skin a tone down,
// N nose, b brow, E eye (e shut), l lips, z stubble, T chin strap
const KETTLE = [
  "......MMMMM.....",
  "....MMMMMMMMM...",
  "...MMWWMMMMMMM..",
  "..MMMWMMMMMMMMM.",
  ".MMMMMMMMMMMMMMM",
  "mmmmmmmmmmmmmmmm",
  "..ccsSSbbSbbS...",
  "..ccsSSSESSSEN..",
  "..ccsSSSSSSSSN..",
  "..cTTsSSzzSSS...",
  "..ccTsSSllzS....",
  "...ccsSSSSS.....",
];
const swapRow = (rows, i, r) => rows.map((x, k) => (k === i ? r : x));
const blink = (rows) => rows.map((r) => r.replace(/E/g, "e"));
const LEG = {
  M: { m: IRON }, W: { m: IRON, bias: 1 }, m: { m: IRONK }, c: { m: PAD }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  b: { m: BROW, fix: 1 }, E: { m: EYE }, e: { m: SKIN, fix: 0 }, l: { m: LIP }, z: { m: SKIN, fix: 0 }, T: { m: LEATHER },
};

// The shield, the spear and the near arm, back to front. The spear and its hand are ONE
// layer group: the shaft, head, pennon, arm and fist always cross the shield together (the old
// `over` flip put the shaft behind the shield while its hand and head were in front, and hid the
// carried spear in the walk). The shield is the far arm's, held back of the near hand's grip.
// `over` (the thrust) still lets the group lift a half step more, clear of the shield's rivets.
const LAYER = layers(["shield", "device", "spear", "nearArm"], [], { z0: 8.4, step: 0.3 });
export const MUST = [["shaft", "sameSide", "nearHand"], ["shield", "visible", 0.4]];
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const leg = (px, h, k, an, z, b, c) => {
  px.part();
  px.capsule(h[0], h[1], 2.3, k[0], k[1], 2.0, HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 1.9, an[0], an[1] - 2.5, 1.6, HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.55 + an[0] * 0.45, k[1] * 0.55 + an[1] * 0.45, 2.0, k[0] * 0.5 + an[0] * 0.5 + (an[0] - k[0]) * 0.1, k[1] * 0.4 + an[1] * 0.6, 1.9, OXK, z + 0.01, { bias: b });   // the garter
  px.capsule(k[0] * 0.45 + an[0] * 0.55, k[1] * 0.45 + an[1] * 0.55, 2.0, an[0], an[1], 1.8, BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.3, an[1] + 1.2, 2.8, 1.5, BOOT, z + 0.03, { bias: b, floor: 1 });
  if (c) px.rect(an[0] - 1.6, an[1] - 5.6, 3.6, 1, STEELB, z + 0.04, { fix: 3, noLine: true });
};
const axes = (ha) => ({ u: [Math.sin(ha), -Math.cos(ha)], v: [Math.cos(ha), Math.sin(ha)] });

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const B = true, Cc = false;
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2, 2), vx2 = cl(lag1.C[0] - lag2.C[0], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // the far arm, a tone down, in the jack's sleeve, behind the shield
  px.part();
  px.capsule(sF[0], sF[1], 2.1, eF[0], eF[1], 2.0, PAD, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.0, hdF[0], hdF[1], 1.7, PAD, 1, { bias: -1 });

  leg(px, hF, kF, anF, 2, -1, Cc);
  leg(px, hN, kN, anN, 3, 0, Cc);

  // the padded jack to the hip, then the tabard over it, belted
  const hemY = P[1] + 5.4, hemB = P[0] - 6.0 - vx * 1.0, hemF = P[0] + 5.8 - vx * 0.6;
  px.part(); const jack = px._pid;
  px.poly([[C[0] - 4.8, C[1] - 2.2], [C[0] + 4.9, C[1] - 2.2], [C[0] + 5.6, C[1] + 3], [P[0] + 4.4, P[1] - 1], [P[0] + 4.6, P[1] + 2.2], [P[0] - 4.8, P[1] + 2.2], [P[0] - 4.8, P[1] - 2], [C[0] - 5.8, C[1] + 3]], PAD, 4, { round: 0.92, cast: 2 });
  px.toneLine(C[0] - 1, C[1] + 1, P[0] - 1, P[1], -1, jack);
  px.part(); const tab = px._pid;
  const hem = B
    ? [[hemF, hemY - 0.6], [hemF - 2.6, hemY + 1.8], [hemF - 4.2, hemY - 0.4], [hemF - 6.8, hemY + 1.8], [hemF - 8.4, hemY - 0.4], [hemB + 5.4, hemY + 1.8], [hemB + 3.6, hemY - 0.4], [hemB + 1.4, hemY + 1.6], [hemB, hemY - 0.6]]
    : [[hemF, hemY], [hemB, hemY]];
  px.poly([[C[0] - 3.6, C[1] - 1.6], [C[0] + 3.8, C[1] - 1.6], [C[0] + 4.9, C[1] + 3], [P[0] + 3.6, P[1] - 3], ...hem, [P[0] - 3.8, P[1] - 3], [C[0] - 4.6, C[1] + 3]], OX, 4.02, { round: 0.92, cast: 2 });
  px.toneLine(P[0] + 1.4, P[1] - 2, P[0] + 1.2 - vx * 0.5, hemY - 1.6, -1, tab);
  px.toneLine(P[0] - 2.2, P[1] - 2, P[0] - 2.6 - vx * 0.7, hemY - 1.6, 1, tab);
  if (B || Cc) px.line(hemB + 0.8, hemY - 1.2, hemF - 0.8, hemY - 1.2, BRASS, 4.04);
  // the belt and its buckle
  px.poly([[P[0] - 4.8, P[1] - 4.6], [P[0] + 4.6, P[1] - 4.6], [P[0] + 4.7, P[1] - 2.8], [P[0] - 4.9, P[1] - 2.8]], LEATHER, 4.05, { round: 0.92 });
  px.rect(P[0] + 1.4, P[1] - 4.6, 2, 2, B || Cc ? BRASS : IRON, 4.06, { fix: 3 });
  if (B) { px.part(); px.rect(P[0] - 4.2, P[1] - 2.6, 3, 3.4, LEATHER, 4.1, { cast: 1 }); px.dot(P[0] - 3, P[1] - 2, BRASS, 4.11, { fix: 3 }); }   // a pouch
  if (B) { px.part(); const c0 = [C[0] + 1.2, C[1] + 2.4]; px.rect(c0[0], c0[1], 2, 3, GREY, 4.1, { fix: 3 }); px.dot(c0[0], c0[1] - 1, GREY, 4.1, { fix: 3 }); px.dot(c0[0] + 1, c0[1] - 1, GREY, 4.1, { fix: 3 }); }   // the tower sewn on his breast
  // the collar
  px.part();
  px.poly([[C[0] - 4.8, C[1] - 3], [C[0] + 4.8, C[1] - 3], [C[0] + 5.2, C[1] + 0.4], [C[0] - 5.4, C[1] + 0.6]], PAD, 5, { round: 0.9, cast: 1 });
  if (Cc) {
    // round pauldrons of blued iron, banded
    for (const [s, zz, b] of [[sF, 1.8, -1], [sN, 8.4, 0]]) {
      px.part();
      px.ellipse(s[0] + 0.2, s[1] + 0.4, 4.3, 3.6, IRON, zz, { bias: b, cast: 1 });
      px.line(s[0] - 3.2, s[1] + 1.6, s[0] + 3.6, s[1] + 1.6, IRONK, zz + 0.01, { bias: b });
      px.dot(s[0] + 0.6, s[1] - 1.6, STEELB, zz + 0.02, { fix: 4 });
    }
  }

  // the head: the hat's tuft or crest sits behind it
  const tuft = cl(-vx * 1.4 - vx2 * 1.0, -2, 2);
  if (B) {
    px.part();
    px.poly([[hx - 1.6, hy - 11.6], [hx + 1.4, hy - 11.2], [hx + 1.6 + tuft * 0.2, hy - 14.6], [hx - 1.4 + tuft * 0.8, hy - 17.8], [hx - 4.4 + tuft * 1.3, hy - 16.2], [hx - 4.2 + tuft * 0.8, hy - 12.4]], OX, 5.9, { round: 0.8, cast: 1 });
  }
  if (Cc) {
    px.part();
    px.poly([[hx - 4, hy - 11.4], [hx + 3.4, hy - 12.2], [hx + 3.4, hy - 14.4], [hx - 3.6 + tuft * 0.5, hy - 15], [hx - 9.4 + tuft * 1.6, hy - 11.8], [hx - 11.6 + tuft * 2.2, hy - 7.6], [hx - 10 + tuft * 1.4, hy - 3.4], [hx - 7.4 + tuft, hy - 5.6], [hx - 5.4, hy - 8.6]], OX, 5.9, { round: 0.85, cast: 1 });
  }
  px.part();
  const rows = KETTLE;
  px.stamp(p.blink ? blink(rows) : rows, hx, hy, LEG, 6, { ax: 7, ay: 12, cast: 2, ball: [8, 6, 8, 7] });
  if (B) { px.dot(hx + 2, hy - 10.6, BRASS, 6.1, { fix: 3 }); px.dot(hx + 3, hy - 8, STEELB, 6.1, { fix: 4 }); }   // the hat's rivets
  if (Cc) { px.part(); px.line(hx + 1.4, hy - 11.2, hx + 1.4, hy - 6.4, IRONK, 6.2, { noLine: true }); }

  const ZS = LAYER(p);
  // ---- the shield, held up before him on the far arm, over the near arm and the shaft
  const sc = [hdF[0] + 3.7, hdF[1] - 1.2 + (p.shy || 0)];
  px.part(); const sid = px._pid;
  {
    const rx = 7.4, ry = 9;
    px.ellipse(sc[0], sc[1], rx, ry, IRON, ZS.shield, { round: 0.7 });
    px.ellipse(sc[0], sc[1], rx - 1.2, ry - 1.2, OX, ZS.shield + 0.02, { round: 0.8 });
    px.toneLine(sc[0] - 1.6, sc[1] - ry + 1, sc[0] - 2, sc[1] + ry - 1, -1, sid);
    // the tower: a squat keep with its battlements
    px.part();
    const tx = sc[0] - 2.6, ty = sc[1] - 4.6;
    px.rect(tx, ty + 1.6, 5.2, 6, GREY, ZS.device, { fix: 3 });
    px.dot(tx, ty + 0.6, GREY, ZS.device, { fix: 3 }); px.dot(tx + 2, ty + 0.6, GREY, ZS.device, { fix: 3 }); px.dot(tx + 4, ty + 0.6, GREY, ZS.device, { fix: 3 });
    px.rect(tx + 2, ty + 5, 1.2, 2.6, OXK, ZS.device + 0.02, { noLine: true });
    px.part(); px.ellipse(sc[0], sc[1] + 6, 1.6, 1.4, STEELB, ZS.device + 0.1, { cast: 1 });
    if (B) {
      // rivets round the rim, a scar across the field and a dent in the rim
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3; px.dot(sc[0] + Math.cos(a) * (rx - 0.5), sc[1] + Math.sin(a) * (ry - 0.5), STEELB, ZS.device + 0.1, { fix: 4 }); }
      px.line(sc[0] + 1, sc[1] - 6, sc[0] + 4.4, sc[1] - 1.6, OXK, ZS.device + 0.05, { noLine: true });
      px.line(sc[0] - 5, sc[1] + 3, sc[0] - 2.6, sc[1] + 5.6, GREY, ZS.device + 0.05, { noLine: true, fix: 2 });
      px.dot(sc[0] + 5.6, sc[1] + 2.4, IRONK, ZS.device + 0.1, { fix: 0 });
    }
  }
  // the far hand's grip at the shield's rim
  px.part(); px.ellipse(hdF[0] + 0.2, hdF[1] + 0.4, 1.7, 1.7, LEATHER, 6.8, { bias: -1 });

  // ---- the spear: an ash shaft, a leaf head; the near hand on it
  const ha = p.ha ?? 0, hg = p.hg ?? 24, { u, v } = axes(ha), LONG = Cc ? 70 : 66;
  const butt = [hdN[0] - u[0] * hg, hdN[1] - u[1] * hg], top = [butt[0] + u[0] * LONG, butt[1] + u[1] * LONG];
  const at = (a, b) => [top[0] + u[0] * a + v[0] * b, top[1] + u[1] * a + v[1] * b];
  px.part();
  const zs = ZS.spear;
  px.capsule(butt[0], butt[1], 0.95, top[0], top[1], 0.95, WOOD, zs, { edge: true });
  px.capsule(butt[0], butt[1], 1.1, butt[0] + u[0] * 1.8, butt[1] + u[1] * 1.8, 1.1, IRON, zs + 0.01);
  px.part();
  px.capsule(...at(-3, 0), 1.2, ...at(0.4, 0), 1.2, IRON, zs + 0.05);
  const W = Cc ? 2.6 : 2.0, Lh = Cc ? 9.5 : 7.6;
  px.poly([at(0, 0), at(1.4, W), at(Lh * 0.45, W + 0.2), at(Lh, 0), at(Lh * 0.45, -W - 0.2), at(1.4, -W)], STEELB, zs + 0.06, { n: [0.1, 0.1, 0.95] });
  px.line(...at(1, 0), ...at(Lh - 1, 0), IRON, zs + 0.07, { fix: 1, noLine: true });
  if (B || Cc) {
    // a pennon of oxblood under the head, streaming back
    const f = cl(-vx * 1.6 - vx2 * 1.0 + (p.flut || 0), -2.4, 2.4);
    px.part();
    px.poly([at(-3.6, 0.4), at(-4, 3.4 + f * 0.4), at(-8.6, 4.6 + f), at(-12.4, 3.2 + f * 1.3), at(-10, 1.2 + f * 0.7), at(-7, 0.4)], OX, zs + 0.1, { round: 0.6, cast: 1 });
    if (Cc) px.line(...at(-5, 1.6), ...at(-10.6, 2.4 + f), BRASS, zs + 0.12, { noLine: true });
  }

  // the near arm: under the shield, over it while the shaft is out over the rim
  const zn = ZS.nearArm;
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.3, eN[0], eN[1], 2.1, PAD, zn, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.1, hdN[0], hdN[1], 1.8, PAD, zn, { cast: 2 });
  px.capsule(eN[0] * 0.28 + hdN[0] * 0.72, eN[1] * 0.28 + hdN[1] * 0.72, 1.9, eN[0] * 0.16 + hdN[0] * 0.84, eN[1] * 0.16 + hdN[1] * 0.84, 1.9, LEATHER, zn + 0.02);
  px.part(); px.ellipse(hdN[0], hdN[1], 1.8, 1.8, LEATHER, zn + 0.2);
  return { H: { u, v, top }, marks: { tip: at(Lh, 0), butt } };
};

// the thrust's streak: a wedge trailing the spearhead on the frame it goes home
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "attack" || ph < 0.46 || ph > 0.58 || !info.H) return;
  const { u, v, top } = info.H, at = (a, b) => [top[0] + u[0] * a + v[0] * b, top[1] + u[1] * a + v[1] * b];
  px.poly([at(-2, 2.6), at(-20, 1.6), at(-4, 0.4)], SMEAR2, 20, { noLine: true });
  px.poly([at(-2, 2), at(-15, 1.4), at(-4, 0.8)], SMEAR, 20.1, { noLine: true });
};

// ---- poses ---------------------------------------------------------------------------------
const TAU = Math.PI * 2;
const aim = (s, t, flip = 0) => { const dx = t[0] - s[0], dy = t[1] - s[1]; return [Math.atan2(dx, dy), clamp(Math.hypot(dx, dy) / ARM, 0.25, 0.97), flip]; };
const STAND = { fN: [-2.8, 0], fF: [3.4, 0] };
// b.n: the spear hand, b.ha / b.hg: how the shaft lies in it, b.f: the shield hand
const hold = (b) => {
  const p = { ...STAND, ...b }, s = solve(p, BONES);
  p.aN = aim(s.sN, b.n); p.aF = aim(s.sF, b.f);
  return p;
};
const REST = { n: [12, -25.5], ha: 0.06, hg: 23, f: [12.5, -29], twist: 0.5, rx: 0, lean: 0.02, drop: 0, hx: 0, shy: 0 };

export const CLIPS = {
  // planted spear behind the shield: a slow breath, a settle of the pennon, a blink
  idle: {
    n: 8, ms: 2200, loop: true, lag: 0.1,
    pose: (ph) => { const b = 0.5 - 0.5 * Math.cos(ph * TAU); return hold({ ...REST, rise: 0.9 * b, rx: -0.3 * b, f: [12.5, -29 - 0.5 * b], flut: 0.8 * Math.sin(ph * TAU), blink: ph > 0.62 && ph < 0.74 ? 1 : 0 }); },
  },
  // the march: the spear carried slanted behind the shield, the shield riding the body's bob
  walk: {
    n: 8, ms: 700, loop: true, lag: 0.08,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 5.6, lift: 3, swing: 0.3, bob: 1.2, lean: 0.07 }), a = Math.cos(ph * TAU), d = w.drop;
      return hold({ ...w, twist: 0.45 + w.twist * 0.25, n: [11.5, -27 + d], ha: 0.38 + 0.03 * a, hg: 25, f: [12.5, -29.4 + d * 0.9 + 0.3 * Math.cos(ph * TAU * 2)], flut: a * 1.4, blink: 0 });
    },
  },
  // the shield is hauled in as the spear is drawn back level behind it; the shield drops, the
  // shaft is driven out over its rim; held a beat; shield and spear come back up
  attack: {
    n: 11, ms: 850, loop: false, lag: 0.06, hit: 0.5,
    pose: (ph) => hold(sampleKeys([
      { t: 0, p: REST },
      { t: 0.22, e: "io", p: { n: [-1, -29], ha: 1.3, hg: 20, f: [12.5, -29.5], rx: -1.4, lean: -0.05, twist: -0.1, drop: 0.5 } },
      { t: 0.4, e: "out", p: { n: [-3, -29.5], ha: 1.42, hg: 21, f: [11.5, -28], rx: -2.2, lean: -0.1, twist: -0.4, drop: 0.8, fF: [3.4, 0] } },
      { t: 0.5, e: "in3", p: { n: [10.5, -31.5], ha: 1.56, hg: 15, over: 1, f: [10, -22], rx: 3, lean: 0.2, twist: 0.8, drop: 1.4, hx: 0.6, fF: [7.6, 0], shy: 1.5 } },
      { t: 0.62, e: "out", p: { n: [11.5, -31.5], ha: 1.57, hg: 14, over: 1, f: [10.5, -22], rx: 3.4, lean: 0.21, twist: 0.8, drop: 1.5, hx: 0.6, fF: [7.6, 0], shy: 1.5 } },
      { t: 0.84, e: "io", p: { n: [7, -29], ha: 0.7, hg: 22, over: 0, f: [12, -27], rx: 0.6, lean: 0.05, twist: 0.4, drop: 0.3, fF: [4, 0] } },
      { t: 1, e: "io", p: REST },
    ], ph)),
  },
};
