// ============ FIGURE: the Assassin's Covert blades (the fighters by the tent) ============
// The hooded cutters the Covert sends into the grass (old rigs: assassinUnit* in rigs.js,
// painted by rigs-covert.js). The same family as the hall's hooded master (fig-hooded.js):
// a deep cowl running into a short mantle, the face in its shade with a glint of eye and a
// cloth over the mouth, a close jerkin crossed by a baldric, a split cloak trailing behind,
// the house's scarf knotted at the nape, wrapped shins and soft boots. Built on the
// garrison's skeleton scale, so a blade stands as tall as a knight, but slimmer and carried
// low: a stalker's lean on the march, a crouch with the knife up for the wait, a lunge and
// a straight-arm thrust for the cut.
//   o.variant  the form: "base" (the Covert's dusk), "a" (the Silent Court: twin knives, violet),
//              "b" (the Nightshade Guild: green, a poisoned edge and vials), "aa" (the Kingslayer:
//              gilt mask, a long estoc, red scarf), "ab" (the Open Contract: wide hat and plume,
//              pauldron, purse and scroll, a hanger), "ba" (the Widow's Kiss: lace veil, long
//              coat, a pink-edged needle), "bb" (the Plague Bearer: a beak mask, a swinging
//              censer, a spored edge)
// Clips: idle (the guard, breathing), walk (8 frames, the stalker's lean, knife low), attack
// (guard, coil, a lunge and thrust, follow-through; `hit` 0.5).
// Marks: tip (the blade's point, art pixels from the feet).
import { mat, flat } from "./pix.js";
import { stampFace } from "./bowlayers.js";
import { sampleKeys, walkPose, scaled, HUMAN } from "./rig.js";

// today's palettes (rigs.js assassinUnit*): cloak, leathers, hood, accent (scarf and sash), steel,
// trim, eyes, mask; then what each form adds
const LOOKS = {
  base: { cloak: "#3e3a4c", leather: "#6a5040", hood: "#565068", accent: "#8a3a38", steel: "#c4c8d0", trim: "#b8bcc4", eyes: "#f0d890", mask: "#2e2a36" },
  a: { cloak: "#3a2a52", leather: "#4a4254", hood: "#56427c", accent: "#7a5aa8", steel: "#e4e8f0", trim: "#d8dce6", eyes: "#d8c0ff", mask: "#b8bcc8", twin: true },
  b: { cloak: "#2c4234", leather: "#5a4a30", hood: "#44624a", accent: "#6a8a3a", steel: "#b8c4b4", trim: "#a89a6a", eyes: "#c8f080", mask: "#44583e", vials: "#8ae05a", venom: "#8ae05a" },
  aa: { cloak: "#221a2e", leather: "#383244", hood: "#3e2e5a", accent: "#a82838", steel: "#eef0f6", trim: "#e0b84a", eyes: "#fff0b0", mask: "#e8c14a", twin: true, blade: "long", gild: true },
  ab: { cloak: "#4a3e58", leather: "#7a5a3a", hood: "#46385e", accent: "#7a5aa8", steel: "#d8dce4", trim: "#c8a050", eyes: "#f0e0b0", mask: "#8a3a38", twin: true, blade: "hanger", hat: "#4e3a2c", plume: "#c8403a", pauldron: "#a4aab4", purse: "#8a6038", scroll: "#ecdcb4" },
  ba: { cloak: "#1e1a24", leather: "#3a2a3c", hood: "#342a3e", accent: "#8a2a5a", steel: "#d0d4dc", trim: "#b8a0c0", eyes: "#ff8ad0", mask: "#4e4058", veil: "#4e4058", lace: "#cfc6d4", long: true, vials: "#e05aa8", venom: "#e05aa8", blade: "needle" },
  bb: { cloak: "#2e3a2a", leather: "#5a4630", hood: "#4a5238", accent: "#8a8a3a", steel: "#b8c4b4", trim: "#b89a50", eyes: "#e8f070", mask: "#44583e", beak: "#d8c49a", censer: true, brass: "#b89a50", vials: "#c8e050", venom: "#b8e04a" },
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const lighten = (h, k) => hex(rgb(h).map((v) => v + (255 - v) * k));
// dark cloth keeps its hue when lifted for the sun
const rich = (h, k) => { const c = rgb(h), m = (c[0] + c[1] + c[2]) / 3; return hex(c.map((v) => m + (v - m) * k)); };

const GRIP = mat("#5a4636"), VOID = flat("#15101a"), SKIN = mat("#e8b990"), SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" });
const KITS = new Map();
const kitOf = (v) => {
  const key = LOOKS[v] ? v : "base";
  let K = KITS.get(key);
  if (K) return K;
  const L = LOOKS[key];
  const COWL = mat(lighten(L.hood, 0.14)), HI = mat(lighten(L.hood, 0.34));
  const CLOAK = mat(lighten(rich(L.cloak, 1.4), 0.12)), JERKIN = mat(lighten(rich(L.leather, 1.2), 0.14)), SLEEVE = mat(lighten(rich(L.cloak, 1.5), 0.22));
  const HOSE = mat(lighten(rich(L.cloak, 1.3), 0.1)), BOOT = mat(lighten(L.leather, 0.06)), WRAP = mat(lighten(L.leather, 0.24));
  const SASH = mat(lighten(L.accent, 0.08)), TRIM = mat(L.trim), MASK = mat(lighten(L.mask, L.gild ? 0.04 : 0.1), L.gild ? { contrast: 1.25 } : {});
  const STEEL = mat(L.steel, { contrast: 1.3 }), EYE = flat(L.eyes, { emis: true, line: "#241a26" });
  const head = (flip) => ({
    C: { m: COWL, fix: 2 }, c: { m: COWL, fix: 1 }, x: { m: COWL, fix: 0 },
    A: flip ? { m: COWL, fix: 1 } : { m: HI, fix: 2 }, F: flip ? { m: HI, fix: 2 } : { m: COWL, fix: 2 }, L: { m: HI, fix: flip ? 3 : 2 },
    I: { m: VOID },
    d: { m: SKIN, fix: 0 }, s: { m: SKIN, fix: 1 }, S: { m: SKIN, fix: 2 }, N: { m: SKIN, fix: 3 }, n: { m: SKIN, fix: 2 },
    E: { m: EYE }, e: { m: SKIN, fix: 0 }, K: { m: MASK, fix: 2 }, k: { m: MASK, fix: 1 },
  });
  K = { L, COWL, HI, CLOAK, JERKIN, SLEEVE, HOSE, BOOT, WRAP, SASH, TRIM, MASK, STEEL, EYE, head: [head(false), head(true)],
    GOLD: mat("#e0b84a", { contrast: 1.2 }), PLUME: L.plume ? mat(L.plume) : 0, HAT: L.hat ? mat(lighten(L.hat, 0.1)) : 0, PAUL: L.pauldron ? mat(L.pauldron, { contrast: 1.2 }) : 0,
    PURSE: L.purse ? mat(L.purse) : 0, SCROLL: L.scroll ? mat(L.scroll) : 0, VEIL: L.veil ? mat(lighten(L.veil, 0.1)) : 0, LACE: L.lace ? mat(L.lace) : 0,
    BEAK: L.beak ? mat(L.beak, { contrast: 1.15 }) : 0, BRASS: L.brass ? mat(L.brass, { contrast: 1.2 }) : 0,
    VIAL: L.vials ? flat(L.vials, { emis: true, line: "#241a26" }) : 0, VENOM: L.venom ? flat(L.venom, { emis: true, line: "#241a26" }) : 0 };
  KITS.set(key, K);
  return K;
};
const DK = { bias: -1, floor: 1 };

// the cowl, a quarter turned (the hooded master's): C cloth, c shade, x deep fold, A/F the sunlit
// band, L the lip over the brow, I the dark inside; d brow, s S N n skin, E eye, K the mouth-cloth
const HEAD = [
  "....CCCCC....",
  "..CAAACCFFC..",
  ".CAACCCCCFFL.",
  ".CACCCCcLLLLL",
  "CCCCCcLLIIIIL",
  "CCCCcLLIdddd.",
  "CCCCcLIdEssE.",
  "cCCCcLIsEsSEN",
  "cCCCcLIsKKKKK",
  "ccCCcLIsKKKK.",
  ".cCCCcLIKKKK.",
  ".ccCCcLIIKK..",
  "..ccCCcLI....",
  "..xccCCCc....",
];
const BLINK = HEAD.map((r, i) => (i === 6 ? r.replace(/E/g, "s") : i === 7 ? r.replace(/E/g, "d") : r));
// the gilt mask rides higher (a half-face): the eye holes stay
// the near arm may pass in front of the cowl, never behind it (static layers: the head z 9, the near arm 9.4)
export const MUST = [["nearArm", "notOver", "eyes"]];
export const MUST_VARIANTS = ["base", "a", "b", "aa", "ab", "ba", "bb"];
export const BOX = { w: 84, h: 72, ox: 34, oy: 62 };
export const BONES = scaled(HUMAN, 1.0, { shN: -2.6, shF: 3.0, hipN: -1.3, hipF: 1.5 });

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const TAU = Math.PI * 2;

// THE GRIP. A knife is held in a closed fist: its angle is DERIVED from the solved forearm (elbow -> hand), never
// posed on its own: knife = forearm + GRIP * (1 - thr) + wrist. At guard the blade stands up out of the fist (GRIP,
// about 60 degrees off the forearm: the stalker's blade is carried a little forward); in a stab (`thr` 1) it lies along
// the forearm, the line of the thrust. `wrist` is the only other freedom, clamped to +-0.35. The far knife of the
// twin-bladed forms follows the far forearm the same way (`thrF`, `wristF`).
export const GRIP_K = -1.05;
export const WRIST = 0.35;
const bladeAt = (hand, elbow, thr, wrist) => Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) + GRIP_K * (1 - cl(thr || 0, 0, 1)) + cl(wrist || 0, -WRIST, WRIST);

const leg = (px, K, h, k, an, z, b) => {
  const o = { bias: b - 1, floor: 1 }, c = [k[0] * 0.4 + an[0] * 0.6, k[1] * 0.4 + an[1] * 0.6];
  px.part();
  px.capsule(h[0], h[1], 2.3, k[0], k[1], 2.0, K.HOSE, z, o);
  px.capsule(k[0], k[1], 1.9, an[0], an[1] - 3, 1.7, K.HOSE, z, o);
  px.capsule(c[0], c[1], 2.0, an[0], an[1], 1.8, K.BOOT, z + 0.02, o);
  px.ellipse(an[0] + 1.3, an[1] + 1, 2.8, 1.5, K.BOOT, z + 0.03, o);
  // wrapped shins
  px.line(c[0] - 1.5, c[1] - 0.6, c[0] + 1.7, c[1] - 0.6, K.WRAP, z + 0.04, { bias: b - 1 });
  px.line(c[0] - 1.4, c[1] + 1.2, c[0] + 1.6, c[1] + 1.2, K.WRAP, z + 0.04, { bias: b - 1 });
};

// a knife from a fist: `a` its angle (0 level at the foe, -PI/2 up, PI/2 down), len its reach
const knife = (px, K, hd, a, len, z, o = {}) => {
  const u = [Math.cos(a), Math.sin(a)], tip = [hd[0] + u[0] * len, hd[1] + u[1] * len];
  px.part();
  px.capsule(hd[0] - u[0] * 2.2, hd[1] - u[1] * 2.2, 0.9, hd[0] + u[0] * 1.1, hd[1] + u[1] * 1.1, 0.9, GRIP, z);
  px.line(hd[0] + u[0] * 1.3 - u[1] * 1.7, hd[1] + u[1] * 1.3 + u[0] * 1.7, hd[0] + u[0] * 1.3 + u[1] * 1.7, hd[1] + u[1] * 1.3 - u[0] * 1.7, K.TRIM, z + 0.03, { fix: 3 });
  px.part();
  px.capsule(hd[0] + u[0] * 1.6, hd[1] + u[1] * 1.6, o.w ?? 1.1, tip[0], tip[1], 0.45, K.STEEL, z + 0.02, { edge: true });
  px.line(hd[0] + u[0] * 2.2, hd[1] + u[1] * 2.2, hd[0] + u[0] * (len - 0.8), hd[1] + u[1] * (len - 0.8), K.STEEL, z + 0.03, { fix: 4 });
  if (K.VENOM && o.venom !== false) px.line(hd[0] + u[0] * (len * 0.45), hd[1] + u[1] * (len * 0.45), tip[0], tip[1], K.VENOM, z + 0.05, { noLine: true });
  return tip;
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const K = kitOf(String(o.variant || "").split("@")[0]), L = K.L, LEG = K.head[o.flip ? 1 : 0];
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5);
  const vy = cl(C[1] - lag1.C[1], -2, 2), sway = p.sway || 0, sway2 = lag2.p.sway || 0;
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const fly = p.fly || 0;

  // ---- the cloak: split into tails trailing behind him, a beat late
  {
    const len = L.long ? 14 : 10, top = [C[0] - 4.4, C[1] - 1.2];
    const back = (i) => [P[0] - 5.4 - i * 1.6 - vx * (1.6 + i) - vx2 * i - fly * (1 + i * 0.8), P[1] + len - 3 - Math.abs(vx) * 0.6 - fly * (1.2 + i * 1.2) + (i === 1 ? 1.4 : 0) + (i === 2 ? -0.4 : 0)];
    const t0 = back(0), t1 = back(1), t2 = back(2);
    px.part();
    px.poly([top, [C[0] - 1.4, C[1] - 1], [P[0] - 3, P[1] + 1], [t1[0] + 3, t1[1] + 1], t1, [t0[0] + 1.6, t0[1] - 1.4], t0, [t2[0] + 0.6, t2[1]], t2, [P[0] - 6.2 - fly * 2, P[1] + 1], [C[0] - 5.4, C[1] + 3]], K.CLOAK, 1.6, { round: 0.8, bias: -1, floor: 1, cast: 1 });
  }
  // ---- the scarf's knot at the nape, its tail down his back
  {
    const k0 = [hx - 5.2, hy - 0.4], d1 = -vx * 1.4 + sway * 0.3 + vy * 0.4, d2 = -vx * 1.4 - vx2 * 2 + sway2 * 0.7 + vy * 0.8;
    const m1 = [k0[0] - 2 + d1 * 0.5 - fly * 2.6, k0[1] + 3.4 - fly * 4], e1 = [k0[0] - 2.6 + d2 - fly * 6, k0[1] + 8.2 - fly * 9.4];
    px.part();
    px.capsule(k0[0], k0[1], 1.2, m1[0], m1[1], 1, K.SASH, 0.5, { fix: 2 });
    px.capsule(m1[0], m1[1], 1, e1[0], e1[1], 0.6, K.SASH, 0.5, { fix: 1 });
  }

  // ---- the far arm and (twin knives) its blade, behind him
  px.part();
  px.capsule(sF[0], sF[1], 2.2, eF[0], eF[1], 2.1, K.SLEEVE, 1, { bias: -3, floor: 1 });
  px.capsule(eF[0], eF[1], 2.0, hdF[0], hdF[1], 1.8, K.SLEEVE, 1, { bias: -3, floor: 1 });
  if (L.twin) knife(px, K, hdF, bladeAt(hdF, eF, p.thrF, p.wristF), p.kfl ?? 6.4, 1.2);
  else { px.part(); px.ellipse(hdF[0], hdF[1], 1.6, 1.6, SKIN, 1.2, { bias: -1 }); }
  // the Plague Bearer's censer swings from the far fist on a chain
  if (L.censer) {
    const sw = (p.cz || 0) * 1.6 + sway * 0.6;
    const c0 = [hdF[0] + 0.4 + sw, hdF[1] + 5.2], ch = [hdF[0] + sw * 0.4, hdF[1] + 2.6];
    px.part();
    px.line(hdF[0], hdF[1], c0[0], c0[1] - 1.2, K.TRIM, 1.3, { noLine: true });
    px.ellipse(c0[0], c0[1], 2.4, 2.4, K.BRASS, 1.4, { vb: 0.2 });
    px.dot(c0[0] + 0.4, c0[1] + 0.2, K.VIAL, 1.5, { noLine: true });
    void ch;
  }

  // ---- legs
  leg(px, K, hF, kF, anF, 2, -1);
  leg(px, K, hN, kN, anN, 3, 0);

  // ---- the jerkin: close in the body, belted, a short skirt split at the front
  const hemB = P[0] - 5.2 - vx * 1.1, hemF = P[0] + 5.2 - vx * 0.7, hemY = P[1] + (L.long ? 8.4 : 4.4);
  px.part(); const coat = px._pid;
  px.poly([[C[0] - 4.4, C[1] - 2], [C[0] + 4.6, C[1] - 2], [C[0] + 5.2, C[1] + 3.5], [P[0] + 4.4, P[1] - 3.2], [hemF, hemY], [hemF - 3, hemY + 1], [P[0] + 0.6 - vx, hemY - 0.4], [hemB + 2.6, hemY + 1], [hemB, hemY], [P[0] - 4.7, P[1] - 3.2], [C[0] - 5.2, C[1] + 3.5]], K.JERKIN, 4, { round: 0.92, cast: 2, ...DK });
  px.toneLine(P[0] + 0.8, P[1] - 1, P[0] + 0.6 - vx, hemY - 0.6, -1, coat);
  // the baldric across the chest (the house's sash), with a vial bandolier for the poisoners
  px.line(C[0] - 4, C[1] - 1.4, P[0] + 3.4, P[1] - 3.4, K.SASH, 4.1);
  if (K.VIAL) for (let i = 0; i < 3; i++) { const t = 0.28 + i * 0.26; px.dot(C[0] - 4 + (P[0] + 7.4 - C[0]) * t, C[1] - 1.4 + (P[1] - C[1] - 2) * t + 0.4, K.VIAL, 4.2, { noLine: true }); }
  // the belt and its buckle, a pouch (a purse, a scroll for the Open Contract)
  px.poly([[P[0] - 4.8, P[1] - 4.8], [P[0] + 4.5, P[1] - 4.8], [P[0] + 4.5, P[1] - 2.8], [P[0] - 4.8, P[1] - 2.8]], K.WRAP, 4.05, { round: 0.92, bias: -1 });
  px.rect(P[0] + 1.2, P[1] - 4.8, 2, 2, K.TRIM, 4.06, { fix: 3 });
  if (K.PURSE) {
    px.part(); px.ellipse(P[0] - 3.6, P[1] - 1.2, 2.2, 2.4, K.PURSE, 4.3);
    px.part(); px.capsule(P[0] + 3.4, P[1] - 5.6, 0.9, P[0] + 4.4, P[1] + 1.6, 0.9, K.SCROLL, 4.3);
    px.dot(P[0] + 4.3, P[1] + 0.6, K.SASH, 4.4, { fix: 3 });
  }

  // ---- the mantle: the cowl's own cloth over both shoulders (a pauldron on the Open Contract)
  px.part(); const man = px._pid;
  px.poly([[C[0] - 5.4, C[1] - 3], [C[0] + 5.2, C[1] - 3], [C[0] + 6.2, C[1] + 1.2], [C[0] + 4.4, C[1] + 3], [C[0] + 0.6 - vx * 0.4, C[1] + 4], [C[0] - 3.6, C[1] + 3.4], [C[0] - 6.6, C[1] + 1.8]], K.COWL, 5, { round: 0.9, cast: 1, bias: -2, floor: 1 });
  px.toneLine(C[0] - 6.2, C[1] + 2.2, C[0] - 3.6, C[1] + 3.4, -1, man);
  px.toneLine(C[0] - 3.6, C[1] + 3.4, C[0] + 0.6 - vx * 0.4, C[1] + 4, -1, man);
  if (K.PAUL) { px.part(); px.ellipse(sN[0] - 0.2, sN[1] - 0.4, 3.4, 2.8, K.PAUL, 9.5, { cast: 1 }); px.line(sN[0] - 2.4, sN[1] + 1.8, sN[0] + 2.2, sN[1] + 1.8, K.TRIM, 9.52); }

  // ---- the head in its cowl; the scarf's turn at his throat
  px.part();
  px.poly([[hx - 4, hy - 0.4], [hx + 3.6, hy - 0.2], [hx + 3, hy + 1.8], [hx - 4, hy + 1.6]], K.SASH, 8.9, { round: 0.8 });
  px.part();
  stampFace(px, p.blink ? BLINK : HEAD, hx, hy, LEG, 9, 9, { ax: 7, ay: 13, cast: 1 }, "dsSNnEeKk");
  // a gilt rim to the lip of the Kingslayer's hood
  if (L.gild) px.line(hx - 1, hy - 9.4, hx + 6, hy - 9.4, K.GOLD, 9.3);
  // the Widow's lace veil drops from the brim over the lower face
  if (K.VEIL) {
    px.part();
    px.poly([[hx - 0.4, hy - 5.4], [hx + 5.8, hy - 5.2], [hx + 5.6, hy - 1.4 + sway * 0.3], [hx + 2.6, hy + 0.2], [hx - 0.2, hy - 1.2]], K.VEIL, 9.2, { round: 0.6 });
    px.line(hx - 0.2, hy - 1, hx + 5.4, hy - 1.4, K.LACE, 9.25);
  }
  // the Plague Bearer's beak: a long cone off the front of the cowl
  if (K.BEAK) {
    px.part();
    px.poly([[hx + 2.4, hy - 7.4], [hx + 6.4, hy - 7], [hx + 13, hy - 1.4], [hx + 6.2, hy - 1.8], [hx + 2.6, hy - 3.4]], K.BEAK, 9.4, { round: 0.7 });
    px.line(hx + 5.2, hy - 4.6, hx + 11.8, hy - 2.2, K.BRASS, 9.45, { noLine: true });
  }
  // the Open Contract's wide hat: a brim over the cowl, a low crown, a plume streaming back
  if (K.HAT) {
    px.part();
    px.ellipse(hx + 0.6, hy - 9.8, 9.2, 2.2, K.HAT, 9.6, { cast: 1 });
    px.ellipse(hx + 0.2, hy - 12.2, 4.8, 3.2, K.HAT, 9.62, { cast: 1 });
    px.line(hx - 4, hy - 11, hx + 4.6, hy - 11, K.TRIM, 9.7);
    const pl = cl(-vx * 2 - vx2 * 1.5, -3, 3) + sway * 0.5;
    px.part();
    px.capsule(hx - 2.4, hy - 13.6, 1.1, hx - 6 + pl, hy - 16.6, 1.6, K.PLUME, 9.8);
    px.capsule(hx - 6 + pl, hy - 16.6, 1.6, hx - 10.6 + pl * 1.6, hy - 13.6 + Math.abs(pl) * 0.4, 0.9, K.PLUME, 9.8);
  }

  // ---- the near arm and its knife over it all
  const ka = bladeAt(hdN, eN, p.thr, p.wrist), kl = L.blade === "long" ? 12 : L.blade === "needle" ? 11 : L.blade === "hanger" ? 9.6 : 8.2;
  px.tag("knife");
  const tip = knife(px, K, hdN, ka, kl, 9.3, { w: L.blade === "needle" ? 0.8 : 1.1 });
  px.tag(null);
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1] + 0.4, 2.4, eN[0], eN[1], 2.2, K.SLEEVE, 9.4, { cast: 2, bias: -2, floor: 1 });
  px.capsule(eN[0], eN[1], 2.2, hdN[0], hdN[1], 1.9, K.SLEEVE, 9.4, { cast: 2, bias: -2, floor: 1 });
  { const a = mix(eN, hdN, 0.56), b = mix(eN, hdN, 0.84); px.capsule(a[0], a[1], 2.1, b[0], b[1], 1.9, K.WRAP, 9.42, { bias: -1 }); }
  px.part(); px.ellipse(hdN[0], hdN[1], 1.7, 1.7, SKIN, 9.6, { cast: 1 }); px.tag(null);

  return { marks: { tip, hand: [hdN[0], hdN[1]] } };
};

// the cut's streak: a thin bright line running out past the point at the strike
export const fx = (px, F, info, clip) => {
  if (clip !== "attack" || F.ph < 0.42 || F.ph > 0.66) return;
  const t = info.marks?.tip || F.sk.hdN;
  const k = 1 - Math.abs(F.ph - 0.52) / 0.14;
  if (k <= 0) return;
  px.line(t[0] - 9 * k, t[1], t[0] + 1.5, t[1], SMEAR, 20, { noLine: true });
};

// ---- the clips ----------------------------------------------------------------
// guard: a low crouch, the knife up before the chest, the empty hand forward
const GUARD = { rx: 0, drop: 1.7, lean: 0.22, twist: 0.5, hx: 0.5, hy: 0, aN: [1.0, 0.7, 0], aF: [1.2, 0.66, 0], fN: [-2.2, 0], fF: [2.8, 0], thr: 0, wrist: 0, thrF: 0.45, wristF: 0, sway: 0, fly: 0, cz: 0.1 };
export const CLIPS = {
  idle: {
    n: 8, ms: 2200, loop: true, lag: 0.12,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b, w = Math.sin(ph * TAU - 1.1);
      return { ...GUARD, drop: 1.7 + 0.35 * u, rise: 0.3 * u, lean: 0.22 + 0.015 * b, wrist: 0.12 * w, wristF: -0.1 * w, aN: [1.0 + 0.03 * w, 0.7, 0], sway: Math.sin(ph * TAU - 2), cz: Math.sin(ph * TAU - 1) * 0.5, blink: ph > 0.62 && ph < 0.72 ? 1 : 0 };
    },
  },
  // a stalker's gait: low, leaning in, up on the toes a little, the knife carried reversed along the forearm
  walk: {
    n: 8, ms: 640, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 5.4, lift: 2.6, swing: 0.32, bob: 1.0, lean: 0.2 }), a = Math.cos(ph * TAU);
      return { ...w, drop: w.drop + 1.0, hx: 0.6, aN: [0.7 + 0.12 * a, 0.78, 0], aF: [0.8 - 0.1 * a, 0.8, 0], thr: 0.62, wrist: 0.12 * a, thrF: 0.45, wristF: 0, cz: a * 0.8, sway: a * 0.8, fly: 0.15 };
    },
  },
  // guard, the coil (weight back, the knife to the hip, the empty hand reaching), the lunge (the front
  // foot steps in, arm and steel in one line), the steel carried past, the recover
  attack: {
    n: 12, ms: 560, loop: false, lag: 0.07, hit: 0.5,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      { t: 0.3, e: "out", p: { ...GUARD, rx: -1.0, drop: 2.5, lean: 0.14, twist: -0.4, aN: [0.05, 0.62, 0], thr: 1, wrist: 0, aF: [1.45, 0.82, 0], thrF: 0.3, fN: [-2.2, 0], fF: [2.8, 0], fly: 0.1 } },
      { t: 0.4, e: "io", p: { ...GUARD, rx: -1.3, drop: 2.7, lean: 0.12, twist: -0.6, aN: [-0.05, 0.6, 0], thr: 1, wrist: 0, aF: [1.5, 0.84, 0], thrF: 0.3, fN: [-2.4, 0], fF: [2.8, 0], fly: 0.1 } },
      { t: 0.5, e: "in3", p: { ...GUARD, rx: 2.8, drop: 2.2, lean: 0.44, twist: 0.9, hx: 0.9, aN: [1.42, 1.0, 0], thr: 1, wrist: 0.05, aF: [-0.7, 0.7, 0], thrF: 1, fN: [-2.8, 0.4], fF: [6.4, 0], fly: 0.5 } },
      { t: 0.64, e: "out", p: { ...GUARD, rx: 3.2, drop: 2.7, lean: 0.5, twist: 0.8, hx: 0.9, aN: [1.15, 0.92, 0], thr: 1, wrist: 0.3, aF: [-0.5, 0.7, 0], thrF: 1, fN: [-2.8, 0.2], fF: [6.4, 0], fly: 0.6 } },
      { t: 0.8, e: "io", p: { ...GUARD, rx: 1.8, drop: 2.2, lean: 0.36, twist: 0.5, aN: [0.9, 0.8, 0], thr: 0.7, wrist: 0, aF: [0.6, 0.7, 0], thrF: 0.7, fN: [-2.6, 0], fF: [4.6, 0], fly: 0.4 } },
      { t: 1, e: "io", p: GUARD },
    ], ph),
  },
};
