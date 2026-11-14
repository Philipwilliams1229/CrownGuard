// ============ CREW FIGURE: the bombardier (and the Goldworks' alchemist) ============
// The Powder Works' charge-thrower: a drab coat, a satchel of charges on his hip, the
// grenadier's fur cap (a red bag falling from its crown, a brass plate with a burning
// grenade on the front). He holds a black iron charge with its fuse sputtering, and
// throws it overhand.
//   Variants (o.variant):
//     ""  / "base"   the bombardier (folk CREW_FOLK.bomber)
//     "alch"         the Goldworks' alchemist (goldworks.js ALCHEMIST): green cloth, a
//                    chaperon twisted with gold, a grey beard, a glass flask for a charge
//   Clips: idle (the charge at his chest in both hands, breathing) and throw (a glance at
//   the fuse, swung down behind the hip, cocked behind the head and HELD, the throw, the
//   follow-through, a fresh charge from the satchel, the fuse lit off the slow match).
//   Marks (art px from the feet, facing +x):
//     charge   the throwing hand, every frame (at the release: the fingertips the charge leaves)
//     bomb     the charge's (the flask's) centre, while he holds one
//     fuse     the fuse's burning tip, while it is lit (the hall's live glow goes here)
import { mat, flat } from "./pix.js";
import { sampleKeys, HUMAN, scaled } from "./rig.js";

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const shade = (h, k) => "#" + hex(h).map((v) => Math.round(Math.max(0, Math.min(255, k < 0 ? v * (1 + k) : v + (255 - v) * k))).toString(16).padStart(2, "0")).join("");
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

const EYE = flat("#2a1c2c"), GOLD = mat("#d8b34a", { contrast: 1.15 }), LEATHER = mat("#7a5232"), LEATHER_D = mat("#5a3c26");
const IRON = mat("#3a3a46", { contrast: 1.35 }), FUSE = flat("#b89a68"), SPARK = flat("#fff3d2", { emis: true, line: "#e8923a" }), EMBER = flat("#ffb347", { emis: true, line: "#c85a28" });
const GLASS = mat("#6ac090", { contrast: 1.2 }), GLASS_N = mat("#c8e8d8"), CORK = mat("#a88a68"), SHINE = flat("#e8fff0");
const PLATE_K = flat("#6a4a1e"), PLATE_O = flat("#e86a2a");
const SMEAR = flat("#fff3d2", { emis: true, line: "#d8cdb0" }), SMEAR2 = flat("#d8c8a8", { emis: true, line: "#a89a80" });

// ---- the head, bare (the hat is stamped over rows 0-3): the face at the FRONT EDGE,
// the nose proud. H hair, h hair a tone down, S skin, s skin a tone down, b brow,
// E eye, N nose, l mouth, B beard (the alchemist's), a the ear.
const HEAD = [
  "....HHHHHH...",
  "..HHHHHHHHH..",
  ".HHHHHHHHHHH.",
  ".HHHhsssssss.",
  ".HHhSSSbbSbb.",
  ".HHaSSSSESSE.",
  ".HhaSSSSESSEN",
  "..HsSSSSSSSS.",
  "..hssSSSSll..",
  "...sssSSSSS..",
  ".....ssSSS...",
];
const HEAD_ALCH = [
  "....HHHHHH...",
  "..HHHHHHHHH..",
  ".HHHHHHHHHHH.",
  ".HHHhsssssss.",
  ".HHhSSSbbSbb.",
  ".HHaSSSSESSE.",
  ".HhaSSSSESSEN",
  "..HBSSSSSSSS.",
  "..hBBSSSBll..",
  "...BBBBBBBB..",
  ".....BBbBBB..",
  "......BBbB...",
];
const blinkOf = (rows) => rows.map((r, i) => (i === 5 ? r.replace(/E/g, "S") : i === 6 ? r.replace(/E/g, "e") : r));
const BLINK = blinkOf(HEAD), BLINK_ALCH = blinkOf(HEAD_ALCH);

// The grenadier's fur cap: a short flat-topped drum of rough dark fur, its hem on the
// brow; the brass plate on the front, a grenade (k) with its flame (o) on it.
// F fur, t a tuft catching the light, f fur in shadow.
const FURCAP = [
  "...FtFFFFtF..",
  "..FFFFtFFFFF.",
  ".FtFFFFFFGGF.",
  ".FFFFtFFFgoF.",
  ".FFtFFFFFgkF.",
  ".fFFFFFtFGGF.",
  ".fFFtFFFFFFFF",
  ".ffFFFFFtFFFF",
  "..fffFfFFfFf.",
];
// The alchemist's chaperon: a gathered puff over the crown (p, its folds P), the padded
// roundlet round the brow (R) twisted with gold (g), its underside in shadow (r), and
// the cornette's short end hanging behind to the ear (c). Round and soft, never a point.
const CHAPERON = [
  ".....pppp....",
  "...ppPpppp...",
  "..ppPpppPpp..",
  "..pPpppPppp..",
  ".RRgRRRgRRRg.",
  "RRgRRRgRRRgRR",
  "RgRRRgRRRgRRR",
  "cRRRgRRRgRRR.",
  "cc.rrrrrrrr..",
  "cc...........",
  ".c...........",
];

// ---- looks: every colour from today's palettes, the materials built once a look ----
const LOOKS = {
  base: { skin: "#e8b990", hood: "#3a3028", coat: "#5a4a3c", boots: "#2e2420", trim: "#3a3028", hair: "#4a2e20", scarf: "#8a2f2a" },
  alch: { skin: "#e8b990", hood: "#2e4a3a", coat: "#3a6a4e", boots: "#2a2a30", trim: "#d8b34a", hair: "#b8b0a4", scarf: "#d8cdb0", vial: true },
};
const BUILT = new Map();
const lookOf = (v) => {
  const key = LOOKS[v] ? v : "base";
  let L = BUILT.get(key);
  if (L) return L;
  const c = LOOKS[key];
  const SKIN = mat(c.skin), HAIR = mat(c.hair), HAT = mat(c.hood, { contrast: 1.15 });
  L = {
    vial: !!c.vial, SKIN,
    COAT: mat(c.coat), SLEEVE: mat(shade(c.coat, 0.1)), BREECH: mat(shade(c.coat, -0.14)), BOOT: mat(c.boots), BELT: mat(shade(c.trim, -0.15)),
    STRAP: mat(c.vial ? c.trim : shade(c.trim, -0.1)), SCARF: mat(c.scarf), BAG: mat("#8a2f2a"),
    head: c.vial ? HEAD_ALCH : HEAD, blink: c.vial ? BLINK_ALCH : BLINK, hat: c.vial ? CHAPERON : FURCAP,
    leg: {
      H: { m: HAIR }, h: { m: HAIR, bias: -1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, a: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
      b: { m: mat("#6a4a30"), fix: 2 }, E: { m: EYE }, e: { m: SKIN, fix: 0 }, l: { m: SKIN, fix: 0 }, B: { m: HAIR },
    },
    hatLeg: {
      F: { m: HAT, floor: 1 }, t: { m: HAT, bias: 1, floor: 1 }, f: { m: HAT, bias: -1, floor: 1 },
      G: { m: GOLD, fix: 3 }, g: { m: GOLD, fix: 4 }, k: { m: PLATE_K }, o: { m: PLATE_O },
      p: { m: mat(shade(c.hood, 0.1)), floor: 1 }, P: { m: mat(shade(c.hood, 0.1)), bias: -1, floor: 1 },
      R: { m: HAT, floor: 1 }, r: { m: HAT, bias: -1, floor: 1 }, c: { m: mat(shade(c.hood, -0.12)), bias: -1, floor: 1 },
    },
  };
  L.leg.B = { m: HAIR }; L.leg.b = c.vial ? { m: HAIR, bias: -1 } : L.leg.b;
  if (c.vial) L.hatLeg.g = { m: GOLD, fix: 3 };
  BUILT.set(key, L);
  return L;
};

export const BOX = { w: 58, h: 62, ox: 28, oy: 57 };
export const BONES = scaled(HUMAN, 1.2, { spine: 13, upper: 7.9, fore: 7.7, shN: -2.8, shF: 3 });

// breeches, a tall boot to under the knee
const leg = (px, L, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.7, k[0], k[1], 2.3, L.BREECH, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 2.2, an[0], an[1] - 2.5, 1.9, L.BREECH, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.55 + an[0] * 0.45, k[1] * 0.55 + an[1] * 0.45, 2.3, an[0], an[1], 2, L.BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.4, an[1] + 1.1, 3.1, 1.6, L.BOOT, z + 0.03, { bias: b, floor: 1 });
};

// the charge in his hand: an iron ball with its fuse (lit: a spark on its tip), or the
// alchemist's flask. Returns the fuse's tip.
const charge = (px, L, cx, cy, lit, z) => {
  px.part();
  if (L.vial) {
    px.ellipse(cx, cy + 0.6, 2.9, 3, GLASS, z);
    px.rect(cx - 1, cy - 4.6, 2, 2.6, GLASS_N, z + 0.01);
    px.rect(cx - 1, cy - 5.8, 2, 1.2, CORK, z + 0.02);
    px.dot(cx - 1.6, cy - 0.6, SHINE, z + 0.03); px.dot(cx - 1.6, cy + 0.4, SHINE, z + 0.03);
    return [cx, cy];
  }
  px.ellipse(cx, cy, 3.3, 3.3, IRON, z, { floor: 1 });
  px.rect(cx - 0.4, cy - 4.4, 2, 1.6, IRON, z + 0.01, { bias: 1 });
  const tip = [cx + 3.2, cy - 6.8];
  px.part();
  px.line(cx + 0.6, cy - 4.6, cx + 1.4, cy - 6, FUSE, z + 0.02, { noLine: true });
  px.line(cx + 1.4, cy - 6, tip[0] - 0.6, tip[1] + 0.4, FUSE, z + 0.02, { noLine: true });
  if (lit) { px.dot(tip[0], tip[1], SPARK, z + 0.05, { noLine: true }); px.dot(tip[0] - 1, tip[1], EMBER, z + 0.04, { noLine: true }); }
  return tip;
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const L = lookOf(o.variant);
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), sway = p.sway || 0;
  const back = (p.back || 0) > 0.5, has = (p.has ?? 1) > 0.5, lit = has && (p.lit ?? 1) > 0.5, open = (p.open || 0) > 0.5;

  // the far arm, a tone down, behind the body
  px.part();
  px.capsule(sF[0], sF[1], 2.3, eF[0], eF[1], 2.2, L.SLEEVE, 1, { bias: -1, floor: 1 });
  px.capsule(eF[0], eF[1], 2.2, hdF[0], hdF[1], 1.9, L.SLEEVE, 1, { bias: -1, floor: 1 });
  px.capsule(eF[0] * 0.35 + hdF[0] * 0.65, eF[1] * 0.35 + hdF[1] * 0.65, 2.1, eF[0] * 0.12 + hdF[0] * 0.88, eF[1] * 0.12 + hdF[1] * 0.88, 2, LEATHER, 1.02, { bias: -1 });
  px.part(); px.ellipse(hdF[0], hdF[1], 1.9, 1.9, L.SKIN, 1.7, { bias: -1 });

  leg(px, L, hF, kF, anF, 2, -1);
  leg(px, L, hN, kN, anN, 3, 0);

  // the coat: belted, skirted to mid-thigh, its hem a beat behind the hips
  const hemB = P[0] - 6.2 - vx * 1.1, hemF = P[0] + 5.8 - vx * 0.7, hy = P[1] + 4.4;
  px.part(); const coat = px._pid;
  px.poly([[C[0] - 4.8, C[1] - 1.8], [C[0] + 5, C[1] - 1.8], [C[0] + 6, C[1] + 3.4], [P[0] + 4.7, P[1] - 3.4], [hemF, hy], [hemF - 2.8, hy + 1], [P[0] - vx, hy], [hemB + 2.6, hy + 1], [hemB, hy], [P[0] - 5, P[1] - 3.4], [C[0] - 6, C[1] + 3.4]],
    L.COAT, 4, { round: 0.92, cast: 2, floor: 1 });
  px.toneLine(P[0] + 1, P[1] - 1.5, P[0] + 0.8 - vx, hy - 0.5, -1, coat);
  px.toneLine(C[0] + 2.8, C[1] + 0.4, P[0] + 2.6, P[1] - 5.6, -1, coat);
  px.poly([[P[0] - 5.2, P[1] - 5.2], [P[0] + 4.9, P[1] - 5.2], [P[0] + 4.9, P[1] - 3], [P[0] - 5.2, P[1] - 3]], L.BELT, 4.05, { round: 0.92, floor: 1 });
  px.rect(P[0] + 1.2, P[1] - 5.2, 2, 2, GOLD, 4.06, { fix: 3 });
  // the satchel's strap across the chest, and the satchel of charges on his near hip
  px.line(C[0] + 3.6, C[1] - 1.2, P[0] - 4.2, P[1] - 5.6, L.STRAP, 4.06, { floor: 1 });
  const sx = P[0] - 4.6 - vx * 0.6, sy = P[1] - 3.6;
  px.part();
  px.poly([[sx - 2.6, sy], [sx + 2.8, sy], [sx + 3.2, sy + 5.4], [sx - 3, sy + 5.4]], LEATHER, 4.5, { round: 0.8, cast: 1 });
  px.poly([[sx - 2.8, sy - 0.4], [sx + 3, sy - 0.4], [sx + 3, sy + 2.2], [sx - 2.8, sy + 2.2]], LEATHER_D, 4.52, { round: 0.8 });
  px.dot(sx + 0.2, sy + 2.4, GOLD, 4.54, { fix: 3 });

  // the neckcloth
  px.part();
  px.poly([[C[0] - 3.2, C[1] - 2.8], [C[0] + 4, C[1] - 2.8], [C[0] + 3.2, C[1] - 0.6], [C[0] - 2.6, C[1] - 0.6]], L.SCARF, 5, { round: 0.9 });

  // the head and its hat
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  const tp = cl(vx * 2 + vx2 * 1.4, -2.5, 3) - sway * 0.5;
  if (!L.vial) {
    // the cap's red bag falls from the crown behind, a beat behind the head; a gold tassel
    const b1 = [hx - 7.4 - tp * 0.5, hyy - 14.2], b2 = [hx - 8.6 - tp, hyy - 10.2 + Math.abs(tp) * 0.3];
    px.part();
    px.capsule(hx - 3.5, hyy - 15, 1.7, b1[0], b1[1], 1.6, L.BAG, 6.3);
    px.capsule(b1[0], b1[1], 1.6, b2[0], b2[1], 1.1, L.BAG, 6.3);
    px.dot(b2[0], b2[1] + 1.6, GOLD, 6.32, { fix: 3 });
  }
  px.part();
  px.stamp(p.blink ? L.blink : L.head, hx, hyy, L.leg, 6, { ax: 7, ay: 11, ball: [6.5, 6, 7, 7.5], cast: 1 });
  px.part();
  px.stamp(L.hat, hx, hyy, L.hatLeg, 6.4, { ax: 7, ay: 16, ball: [6.5, 4.5, 7, 6.5], cast: 1 });

  // what he holds, and where the fuse burns
  const cx = hdN[0] + (p.cx ?? 1.5), cy = hdN[1] + (p.cy ?? -3);
  const tip = has ? charge(px, L, cx, cy, lit, back ? 5.4 : 7.6) : null;

  // the near arm over it all (cocked back it passes BEHIND the head, so the face stays open)
  const az = back ? 5.5 : 8;
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.5, eN[0], eN[1], 2.3, L.SLEEVE, az, { cast: 2, floor: 1 });
  px.capsule(eN[0], eN[1], 2.3, hdN[0], hdN[1], 1.9, L.SLEEVE, az, { cast: 2, floor: 1 });
  px.capsule(eN[0] * 0.4 + hdN[0] * 0.6, eN[1] * 0.4 + hdN[1] * 0.6, 2.2, eN[0] * 0.12 + hdN[0] * 0.88, eN[1] * 0.12 + hdN[1] * 0.88, 2.1, LEATHER, az + 0.02);
  const fl = Math.hypot(hdN[0] - eN[0], hdN[1] - eN[1]) || 1, fd = [(hdN[0] - eN[0]) / fl, (hdN[1] - eN[1]) / fl];
  px.part();
  px.ellipse(hdN[0], hdN[1], 2, 2, L.SKIN, az + 0.2);
  if (open) px.capsule(hdN[0] + fd[0] * 1.2, hdN[1] + fd[1] * 1.2, 1.3, hdN[0] + fd[0] * 3, hdN[1] + fd[1] * 3, 0.8, L.SKIN, az + 0.2);

  const marks = { charge: open ? [hdN[0] + fd[0] * 2.4, hdN[1] + fd[1] * 2.4] : [hdN[0], hdN[1]] };
  if (has) marks.bomb = [cx, cy];
  if (lit && !L.vial) marks.fuse = tip;
  const light = !has ? null : L.vial ? { x: cx, y: cy, r: 15, col: "#8ad0a0", k: 0.3 + 0.4 * (p.hot || 0) } : lit ? { x: tip[0], y: tip[1], r: 15, col: "#ffb040", k: 0.55 } : null;
  return { light, marks, sN };
};

// the throw's smear: one solid two-tone crescent over the top, from where the charge was
// cocked to the hand that let it go; and the sparks as the slow match takes the new fuse
const HIT_F = 7, N_THROW = 14;
export const fx = (px, F, info, clip) => {
  if (clip !== "throw") return;
  const p = F.sk.p;
  if ((p.strike || 0) > 0.5 && info.marks.fuse) {
    const [tx, ty] = info.marks.fuse;
    for (const [dx, dy, m] of [[2, -1, EMBER], [-1, -2, SPARK], [1, -3, EMBER], [3, 1, SPARK]]) px.dot(tx + dx, ty + dy, m, 20, { noLine: true });
  }
  if (Math.abs(F.ph - HIT_F / (N_THROW - 1)) > 0.01) return;
  const was = F.at((HIT_F - 1) / (N_THROW - 1)), [ox, oy] = F.sk.sN;
  const h0 = [was.hdN[0] + (was.p.cx || 0), was.hdN[1] + (was.p.cy || 0)], h1 = info.marks.charge;
  const a0 = Math.atan2(h0[1] - oy, h0[0] - ox), r0 = Math.hypot(h0[0] - ox, h0[1] - oy);
  let a1 = Math.atan2(h1[1] - oy, h1[0] - ox); if (a1 < a0) a1 += Math.PI * 2;
  const r1 = Math.hypot(h1[0] - ox, h1[1] - oy), n = 10;
  const at = (t, d) => { const a = a0 + (a1 - a0) * t, r = r0 + (r1 - r0) * t + d; return [ox + Math.cos(a) * r, oy + Math.sin(a) * r]; };
  const arc = (t0, wMax, m, z) => {
    const out = [], inn = [];
    for (let i = 0; i <= n; i++) { const t = t0 + (0.96 - t0) * (i / n), w = wMax * ((t - t0) / (0.96 - t0)) ** 1.3; out.push(at(t, w)); inn.unshift(at(t, -w)); }
    px.poly([...out, ...inn], m, z, { noLine: true });
  };
  arc(0.25, 3, SMEAR2, 20); arc(0.55, 1.7, SMEAR, 20.1);
};

// every key carries the whole bag of extras (a key cannot unset one between keys):
//   has / lit   a charge in the near hand; its fuse burning     cx, cy   the charge from the hand
//   back        the near arm passes behind the head             open     the hand let go
//   strike      the slow match at the fuse                      hot      the flask's glow rising (the alchemist)
const HOLD = { rx: 0.3, lean: 0.04, twist: 0.5, aN: [1.05, 0.8, 0], aF: [0.9, 0.86, 0], fN: [-3.2, 0], fF: [3.4, 0], has: 1, lit: 1, cx: 1.5, cy: -3, back: 0, open: 0, strike: 0, hot: 0 };
const K = (f, e, p) => ({ t: f / (N_THROW - 1), e, p: { ...HOLD, ...p } });
const THROW = [
  K(0, "io", {}),
  K(1, "io", { lean: 0.02, rise: 0.4, aN: [1.2, 0.76, 0], aF: [1.02, 0.82, 0], hy: 0.3 }),
  K(3, "io", { rx: -1.4, drop: 0.4, lean: -0.05, twist: -0.6, aN: [-0.75, 0.9, 0], aF: [1.25, 0.8, 0], cx: -1.2, cy: 1.6, hot: 0.5 }),
  K(5, "out", { rx: -2.2, drop: 0.7, lean: -0.11, twist: -1, rise: 0.5, hy: -0.4, aN: [-2.2, 0.66, 1], aF: [1.58, 0.92, 0], fF: [4, 0], back: 1, cx: -1.5, cy: -2.6, hot: 1 }),
  K(6, "io", { rx: -2.5, drop: 0.9, lean: -0.13, twist: -1.1, rise: 0.7, hy: -0.5, aN: [-2.28, 0.68, 1], aF: [1.62, 0.94, 0], fF: [4, 0], back: 1, cx: -1.5, cy: -2.6, hot: 1 }),
  // the release: he has lunged under the arm, so it passes his ear and cap and the face stays open
  K(7, "in3", { rx: 6, drop: 2, lean: 0.23, twist: -0.4, hx: 2.3, hy: 0.3, aN: [2.626, 0.95, 0], aF: [-0.5, 0.85, 0], fN: [-3.4, 0], fF: [7.6, 0], has: 0, lit: 0, open: 1 }),
  K(8, "out", { rx: 6.4, drop: 2.6, lean: 0.36, twist: 1.4, hx: 1.4, hy: 0.8, aN: [0.9, 0.96, 0], aF: [-0.9, 0.8, 0], fN: [-3.4, 0], fF: [7.6, 0], has: 0, lit: 0, open: 1 }),
  K(9, "io", { rx: 4.6, drop: 1.6, lean: 0.22, twist: 0.8, hx: 0.5, hy: 0.3, aN: [0.35, 0.9, 0], aF: [-0.5, 0.8, 0], fN: [-3.4, 0], fF: [7.2, 0], has: 0, lit: 0, open: 1 }),
  K(10, "io", { rx: 1.4, drop: 0.4, lean: 0.06, twist: -0.2, aN: [-0.3, 0.66, 0], aF: [0.5, 0.8, 0], fF: [5, 1.2], has: 0, lit: 0 }),
  K(11, "io", { rx: 0.5, lean: 0.05, twist: 0.3, aN: [0.7, 0.68, 0], aF: [0.75, 0.84, 0], has: 1, lit: 0, cx: 1.6, cy: -2.8 }),
  K(12, "io", { rise: 0.3, aN: [1.05, 0.8, 0], aF: [1.2, 0.74, 0], strike: 1 }),
  K(13, "io", {}),
];
export const CLIPS = {
  idle: {
    n: 8, ms: 2200, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 1);
      return { ...HOLD, rise: 0.5 + 0.5 * b, aN: [1.05 - 0.025 * b2, 0.8, 0], aF: [0.9 - 0.02 * b2, 0.86, 0], sway: b2 * 0.8, hot: 0.15 + 0.15 * b, blink: ph > 0.55 && ph < 0.68 ? 1 : 0 };
    },
  },
  // hit: the charge leaves his fingers on frame 7; frame 6 (cocked behind his head) is the one he waits on
  throw: { n: N_THROW, ms: 1500, loop: false, lag: 0.05, hit: HIT_F / (N_THROW - 1), pose: (ph) => sampleKeys(THROW, ph) },
};
