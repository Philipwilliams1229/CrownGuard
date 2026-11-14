// ============ FIGURE: the Warden Mage's priest ============
// The warden on his altar (render/halls/warden.js, through pix/crews.js): a mage-priest
// in a pale alb that flares at the hem, bell sleeves cuffed in the accent colour, a stole
// down the front with a gilt mark near each end, a two-peaked mitre with its ribbons behind
// the neck, and a staff crowned with a ring and a gem (the charm). Sized as the old crew
// figure was (HUMAN x 1.3: 23 units to the crown of the head; the mitre rises above that).
//
// His blessing, seen from the side: the far hand keeps the staff (it lifts a little with
// him), the near hand leaves it and rises, turning open, until the palm stands at head
// height before him, elbow forward and down; the head lifts; the bell of the sleeve slides
// back off the forearm and its loose side swings after the arm.
//   o.variant   the form's livery: base | a | aa | ab | b | ba | bb (LIVERY: the old
//               PRIEST_FOLK palettes, plus the hall's aura colour for his light)
//   clips       idle   both hands on the staff at the breast, breathing (8, a loop)
//               bless  the blessing, rising: frames 0-6 fold -> lift -> rise -> raised (the
//                      hall also runs these BACKWARD to lower it), 7-9 the crest (an overshoot
//                      at the top) settling back to raised
//               held   raised while the aura works: breathing, the palm pressing forward (8, a loop)
//   marks       palm   the open palm: the hall pools its light there
//               charm  the gem in the staff's ring: a second, smaller light
//               head   the middle of his head (the hall hangs his halo over it)
//   light.k     the pose's glow (0 folded .. 1 raised): how strongly the hall should light
//               palm and charm (the frame record's `light.k`)
import { mat, flat } from "./pix.js";
import { sampleKeys, solve, ik, HUMAN, scaled } from "./rig.js";

const K = 1.3;
export const BOX = { w: 44, h: 74, ox: 17, oy: 70 };
export const BONES = scaled(HUMAN, K, { shN: 0.6, shF: 2.6, upper: 8.4, fore: 8 });
const ARM = BONES.upper + BONES.fore;

const LIVERY = {
  base: { skin: "#e8b990", hair: "#8a5a34", robe: "#e6dfcc", hat: "#f0ead8", trim: "#4a9ab4", gem: "#8ce8f0", metal: "#d8b34a", staff: "#8a6a44", aura: "#7cd4d4" },
  a: { skin: "#e8b990", hair: "#8a5a34", robe: "#d0e2ec", hat: "#eef6fa", trim: "#3a7eb0", gem: "#a8ecf8", metal: "#c4d4e0", staff: "#9aaebc", aura: "#7cd4d4" },
  aa: { skin: "#f0d0bc", hair: "#e4eef4", robe: "#b4d0e4", hat: "#f2faff", trim: "#28588e", gem: "#c8f6ff", metal: "#e0ecf4", staff: "#b4c8d8", aura: "#b8f0f8" },
  ab: { skin: "#e8b990", hair: "#6a4a30", robe: "#a4c4d6", hat: "#e4f0f6", trim: "#2e6c8c", gem: "#9ce4f8", metal: "#c4d4e0", staff: "#8aa0b0", aura: "#8cd8f8" },
  b: { skin: "#e8b990", hair: "#8a5a34", robe: "#ece6cc", hat: "#f4efdc", trim: "#5a9a44", gem: "#9ce88c", metal: "#d8b34a", staff: "#8a6a44", aura: "#8ce08c" },
  ba: { skin: "#e8b990", hair: "#a06a38", robe: "#f2e8c4", hat: "#f8f0d4", trim: "#4e8a3c", gem: "#f0dc7a", metal: "#e0bc50", staff: "#7a5334", aura: "#e8d47a" },
  bb: { skin: "#e8b990", hair: "#a06a38", robe: "#faf4de", hat: "#fff8e4", trim: "#c8962c", gem: "#f8e070", metal: "#e8c458", staff: "#7a5334", aura: "#f0d060" },
};
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toward = (c, to, t) => "#" + hex(c).map((v, i) => Math.round(v + (hex(to)[i] - v) * t).toString(16).padStart(2, "0")).join("");
const EYE = flat("#2a1c2c"), BOOT = mat("#4a3a3a"), SHINE = flat("#fff6e0", { emis: true });

// The head, facing +x, a quarter turned: a clean-shaven, calm face at the front edge, the
// nose proud, hair at the nape. (S skin, s a tone down, N the nose a tone up, E eye, b brow,
// m mouth, H hair, h hair a tone down.) The mitre covers rows 0-2.
const HEAD = [
  "....HHHHHH...",
  "..HHHHHHHHH..",
  ".HHHsssssss..",
  ".HHSSSSSSSSS.",
  ".HHSSESSSESN.",
  ".HhSSESSSESNN",
  ".HHSsSSSSSS..",
  "..hSSSSSSSS..",
  "...sSSSSmS...",
  "....sSSs.....",
];
const BLINK = HEAD.map((r, i) => (i === 4 ? ".HHSSSSSSSSN." : i === 5 ? ".HhSSeSSSeSNN" : r));

const LOOKS = new Map();
const lookOf = (variant) => {
  let L = LOOKS.get(variant);
  if (L) return L;
  const pal = LIVERY[variant] || LIVERY.base;
  const SKIN = mat(pal.skin), HAIR = mat(pal.hair);
  L = {
    aura: pal.aura, SKIN,
    ROBE: mat(pal.robe), SLEEVE: mat(toward(pal.robe, pal.trim, 0.16)), HAT: mat(pal.hat), TRIM: mat(pal.trim), TRIM_DK: mat(toward(pal.trim, "#241a26", 0.22)),
    METAL: mat(pal.metal, { contrast: 1.15 }), WOOD: mat(pal.staff), GEM: mat(pal.gem, { contrast: 1.1 }),
    LEG: { S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, m: { m: SKIN, fix: 0 }, b: { m: HAIR, fix: 1 }, H: { m: HAIR }, h: { m: HAIR, bias: -1 }, E: { m: EYE } },
  };
  LOOKS.set(variant, L);
  return L;
};

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
// A bell-sleeved arm: the upper sleeve to the solved elbow, then the bell widening to a flat
// cuff of the accent colour short of the hand; raised, the bell slides back toward the elbow
// (`bare`, 0..1 of the forearm shows) and its loose lower side hangs by `droop`, swung by `sway`.
const bellArm = (px, s, e, h, M, CUFF, SKIN, z, o = {}) => {
  const dx = h[0] - e[0], dy = h[1] - e[1], l = Math.hypot(dx, dy) || 1, u = [dx / l, dy / l], n = [-u[1], u[0]];
  const back = Math.min(l - 1.5, 3.2 + (o.bare || 0) * l), r0 = o.r0 ?? 3.1, r1 = o.r1 ?? 4.4;
  const w = [h[0] - u[0] * back, h[1] - u[1] * back], c = [w[0] + u[0] * 2, w[1] + u[1] * 2];
  px.capsule(s[0], s[1], r0, e[0], e[1], r0, M, z, o);
  // (the lower corner of the cuff: the one that hangs)
  const lo = n[1] - n[0] * 0.5 > 0 ? 1 : -1, hang = [(o.sway || 0), o.droop || 0];
  const a = [w[0] + n[0] * r1 * lo + hang[0], w[1] + n[1] * r1 * lo + hang[1]], b = [w[0] - n[0] * r1 * lo, w[1] - n[1] * r1 * lo];
  const a2 = [c[0] + n[0] * r1 * lo + hang[0], c[1] + n[1] * r1 * lo + hang[1]], b2 = [c[0] - n[0] * r1 * lo, c[1] - n[1] * r1 * lo];
  px.poly([[e[0] + n[0] * r0 * lo, e[1] + n[1] * r0 * lo], a, b, [e[0] - n[0] * r0 * lo, e[1] - n[1] * r0 * lo]], M, z, { ...o, round: 0.9 });
  px.poly([a, a2, b2, b], CUFF, z + 0.01, { round: 0.9, bias: o.bias || 0 });
  if ((o.bare || 0) > 0.05) px.capsule(c[0], c[1], 1.7, h[0], h[1], 1.8, SKIN, z - 0.02, { bias: o.bias || 0 });
};

// Pose fields of his own (beside the rig's): tilt (the staff tipped forward on its foot, away from
// his face, as the near hand comes up between them), lift (its foot off the step), droop /
// bare (the near sleeve), open (the near hand open), glow (the light), blink.
export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const L = lookOf(o.variant || "base"), { ROBE, SLEEVE, HAT, TRIM, TRIM_DK, METAL, WOOD, GEM, SKIN } = L;
  const { p, P, C, N, sF, eF, hdN, hdF, B } = sk;
  // (the bell sleeve hangs off the shoulder: its arm starts a little under the rig's, so a raised arm never crosses his chin)
  const sN = [sk.sN[0], sk.sN[1] + 2.6], eN = ik(sN[0], sN[1], hdN[0], hdN[1], B.upper, B.fore, 1).mid;
  const g = p.glow || 0;
  // what trails: the hem and the stole's ends sway after the body, the sleeve after the hand
  const vx = cl((C[0] - lag1.C[0]) * 2 + (C[1] - lag1.C[1]) * -0.6, -1.6, 1.6);
  const sway = cl(-(hdN[0] - lag1.hdN[0]) * 0.9, -2, 2), swing = cl((hdN[1] - lag1.hdN[1]) * 0.8 + (lag1.hdN[1] - lag2.hdN[1]) * 0.4, -2.4, 2.4);

  // the far arm, behind the alb: its sleeve and fist come out before him, on the staff
  px.part();
  bellArm(px, sF, eF, hdF, SLEEVE, TRIM, SKIN, 1, { bias: -1, r0: 2.8, r1: 3.6, droop: 1.2 });

  // a toe under the hem
  px.part(); px.ellipse(P[0] + 8.2, -0.6, 3, 1.6, BOOT, 2);

  // the alb: shoulders, a nipped waist, a hem that flares
  const top = C[1] - 2.3, hemY = -1, wy = P[1] - 2.6;
  const hemF = P[0] + 11.6 - vx * 0.8, hemB = P[0] - 11.2 - vx * 1.5;
  px.part(); const robeId = px._pid;
  px.poly([[C[0] - 5.4, top], [C[0] + 5.4, top], [C[0] + 6.9, C[1] + 3], [P[0] + 6, wy], [P[0] + 7.6, P[1] + 7], [hemF, hemY], [hemB, hemY], [P[0] - 7.8, P[1] + 7], [P[0] - 6.2, wy], [C[0] - 7, C[1] + 3]], ROBE, 4, { round: 0.92, cast: 2 });
  // the hem band: a line of the accent over a shaded border
  const band = (y0, y1, M, z, oo) => { const xa = (y) => hemB + (P[0] - 7.8 - hemB) * ((hemY - y) / (hemY - (P[1] + 7))), xb = (y) => hemF + (P[0] + 7.6 - hemF) * ((hemY - y) / (hemY - (P[1] + 7))); px.poly([[xa(y0), y0], [xb(y0), y0], [xb(y1), y1], [xa(y1), y1]], M, z, oo); };
  band(hemY - 2.2, hemY, ROBE, 4.04, { round: 0.92, bias: -1 });
  band(hemY - 3.4, hemY - 2.2, TRIM, 4.05, { round: 0.92 });
  // folds, fanning from the girdle to the hem; the lit edge of one
  const hm = (t) => hemB + (hemF - hemB) * t;
  px.toneLine(P[0] - 2.6, wy + 3, hm(0.3), hemY - 4, -1, robeId);
  px.toneLine(P[0] + 1.4, wy + 4, hm(0.55), hemY - 4, -1, robeId);
  px.toneLine(P[0] + 4.6, wy + 4, hm(0.8), hemY - 4, -1, robeId);
  px.toneLine(P[0] - 4.8, wy + 4, hm(0.16), hemY - 4, 1, robeId);
  // the girdle cord
  px.poly([[P[0] - 6.3, wy - 1], [P[0] + 6.1, wy - 1], [P[0] + 6, wy + 0.8], [P[0] - 6.2, wy + 0.8]], METAL, 4.06, { round: 0.92 });

  // the stole: two strands down the front, a gilt mark near each end (they hang, and sway)
  for (const [x0, wd, bot, M, z] of [[C[0] - 2.4, 2.6, -11.5, TRIM_DK, 4.1], [C[0] + 1.6, 3.2, -8.5, TRIM, 4.12]]) {
    const bx = P[0] + (x0 - C[0]) * 1.5 + 0.6 - vx * 0.9;
    px.part();
    px.poly([[x0, top + 0.4], [x0 + wd, top + 0.4], [bx + wd + 0.4, bot], [bx + wd / 2 + 0.2, bot + 1.4], [bx, bot]], M, z, { round: 0.5 });
    px.rect(bx + wd / 2 - 0.4, bot - 5.4, 1.2, 3.4, METAL, z + 0.01, { fix: 3 }); px.rect(bx + wd / 2 - 1.4, bot - 4.4, 3.2, 1.2, METAL, z + 0.01, { fix: 3 });
  }

  // the stole's yoke: a collar of the accent round the shoulders, under the chin
  px.part();
  px.poly([[C[0] - 5.6, C[1] - 0.9], [C[0] + 5.7, C[1] - 0.9], [C[0] + 6.6, C[1] + 2.9], [C[0] - 6.7, C[1] + 2.9]], TRIM, 8.3, { round: 0.92, cast: 2 });
  px.line(C[0] - 6.3, C[1] + 2.4, C[0] + 6.2, C[1] + 2.4, METAL, 8.31);

  // the staff in the far fist, standing just before him (its foot on the step, or lifted with him)
  const tl = p.tilt ?? 0.012, d = [Math.sin(tl), -Math.cos(tl)], LEN = 49.4;
  const below = (-(p.lift || 0) - hdF[1]) / Math.cos(tl), foot = [hdF[0] - d[0] * below, hdF[1] - d[1] * below];
  const topS = [hdF[0] + d[0] * (LEN - below), hdF[1] + d[1] * (LEN - below)], charm = [topS[0] + d[0] * 4.4, topS[1] + d[1] * 4.4];
  px.part();
  px.capsule(foot[0], foot[1], 1, topS[0], topS[1], 1, WOOD, 5, { edge: true });
  px.part();
  px.capsule(topS[0] - d[0] * 0.6, topS[1] - d[1] * 0.6, 1.7, topS[0] + d[0] * 0.8, topS[1] + d[1] * 0.8, 1.9, METAL, 5.05);
  px.ellipse(charm[0], charm[1], 4, 4, METAL, 5.06);
  px.part();
  px.ellipse(charm[0], charm[1], 2.5, 2.5, GEM, 5.1, { bias: g > 0.5 ? 1 : 0 });
  px.dot(charm[0] - 1.2, charm[1] - 1.4, SHINE, 5.2);
  px.part(); px.ellipse(hdF[0], hdF[1], 2, 2.1, SKIN, 5.3, { bias: -1 });

  // the mitre's ribbons, fallen behind the neck
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  px.part();
  px.poly([[hx - 6.4, hy - 4], [hx - 4.6, hy - 4], [hx - 4.9 - vx * 0.6, hy + 5.4], [hx - 6.9 - vx * 0.6, hy + 5.4]], TRIM_DK, 5.5, {});
  px.poly([[hx - 4.6, hy - 4], [hx - 3.2, hy - 4], [hx - 3.3 - vx * 0.4, hy + 3.4], [hx - 4.8 - vx * 0.4, hy + 3.4]], TRIM, 5.5, {});

  // the head
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hy, L.LEG, 6, { ax: 6, ay: 8, ball: [6.5, 5, 7, 7], cast: 2 });

  // the mitre: a back peak, then the front one, banded and gemmed
  const cx = hx + 0.2, by = hy - 5.6;
  px.part();
  px.poly([[cx - 5.6, by], [cx + 2.6, by], [cx + 1, by - 7.4], [cx - 2, by - 13], [cx - 5.2, by - 7.2]], HAT, 6.3, { round: 0.8, bias: -1 });
  px.part();
  px.poly([[cx - 4, by], [cx + 5.6, by], [cx + 6, by - 5.4], [cx + 4.2, by - 11], [cx + 1.6, by - 15.4], [cx - 1.2, by - 11], [cx - 3.8, by - 5.6]], HAT, 6.4, { round: 0.85, ny: -0.1 });
  px.poly([[cx - 5.6, by - 2.4], [cx + 5.8, by - 2.4], [cx + 5.6, by], [cx - 5.6, by]], METAL, 6.45, { round: 0.9 });
  px.line(cx + 1.6, by - 3, cx + 1.6, by - 13, METAL, 6.45);
  px.rect(cx + 0.6, by - 8.4, 2, 2, GEM, 6.5, { fix: 3 }); px.dot(cx + 0.7, by - 8.3, SHINE, 6.52);

  // the near arm, in front: on the staff, or raised in blessing, the hand turning open
  px.part();
  bellArm(px, sN, eN, hdN, SLEEVE, TRIM, SKIN, 8, { cast: 2, r0: 2.9, r1: 4.1, bare: p.bare || 0, droop: (p.droop || 0) + Math.max(0, -swing) * 0.6, sway });
  px.part();
  if ((p.open || 0) > 0.5) {
    // the open hand: the palm and its fingers up, the thumb toward him
    px.ellipse(hdN[0], hdN[1], 2.1, 2.3, SKIN, 8.2); px.rect(hdN[0] - 1.2, hdN[1] - 4.6, 2.8, 3, SKIN, 8.2, {}); px.dot(hdN[0] - 2.6, hdN[1] - 1, SKIN, 8.2);
  } else px.ellipse(hdN[0], hdN[1], 2.1, 2.2, SKIN, 8.2);

  const palm = [hdN[0] + 0.4, hdN[1] - 2.4];
  const light = { x: palm[0], y: palm[1], r: 17, col: L.aura, k: Math.min(1, g) };
  return { light, lights: [light, { x: charm[0], y: charm[1], r: 10, col: L.aura, k: Math.min(1, g) * 0.5 }], marks: { palm, charm, head: [N[0], N[1] - 3] } };
};

// ---- the poses (hands as POINTS, art px from the feet: N the near hand, F the far fist) ----
const armAt = (pose, far, [tx, ty]) => { const s = solve(pose, BONES), sh = far ? s.sF : s.sN, dx = tx - sh[0], dy = ty - sh[1]; return [Math.atan2(dx, dy), Math.min(1, Math.hypot(dx, dy) / ARM), 0]; };
const hands = (pose, h) => ({ ...pose, aF: armAt(pose, true, h.F), aN: armAt(pose, false, h.N) });
const BASE = { tilt: 0.012, lift: 0, droop: 2, bare: 0, open: 0, glow: 0, blink: 0, fN: [-2.2, 0], fF: [2.4, 0] };
const FOLD = hands(BASE, { N: [11.5, -26.5], F: [11.6, -31.5] });
const LIFT = hands({ ...BASE, rise: 0.4, twist: 0.3, tilt: 0.035, lift: 0.3, droop: 3.4, glow: 0.2 }, { N: [12.4, -31.2], F: [12.6, -32] });
const RISE = hands({ ...BASE, rise: 0.6, twist: 0.7, hx: -0.2, tilt: 0.07, lift: 0.6, droop: 3.6, bare: 0.18, open: 1, glow: 0.6 }, { N: [12, -38], F: [13.8, -32.6] });
const RAISED = hands({ ...BASE, rise: 0.8, twist: 1, hx: -0.4, hy: -0.3, tilt: 0.092, lift: 0.8, droop: 2.4, bare: 0.4, open: 1, glow: 1 }, { N: [11.2, -44], F: [14.6, -33.2] });
const CREST = hands({ ...BASE, rise: 1.3, twist: 1.1, hx: -0.5, hy: -0.5, tilt: 0.1, lift: 1.2, droop: 1, bare: 0.46, open: 1, glow: 1.15 }, { N: [11, -45.8], F: [14.9, -33.7] });

export const CLIPS = {
  idle: {
    n: 8, ms: 3300, loop: true, lag: 0.1,
    pose: (ph) => { const b = 0.5 + 0.5 * Math.sin(ph * Math.PI * 2); return hands({ ...BASE, rise: 0.9 * b, blink: ph > 0.6 && ph < 0.72 ? 1 : 0 }, { N: [11.5, -26.5 - 0.5 * b], F: [11.6, -31.5 - 0.5 * b] }); },
  },
  // (frame 6 is RAISED exactly: the hall runs 0..6 by how far the blessing is up, then 7-9 once at the top)
  bless: {
    n: 10, ms: 760, loop: false, lag: 0.09,
    pose: (ph) => sampleKeys([
      { t: 0, p: FOLD },
      { t: 2 / 9, e: "in", p: LIFT },
      { t: 4 / 9, e: "lin", p: RISE },
      { t: 6 / 9, e: "out", p: RAISED },
      { t: 7 / 9, e: "out", p: CREST },
      { t: 1, e: "io", p: RAISED },
    ], ph),
  },
  held: {
    n: 8, ms: 1900, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = 0.5 + 0.5 * Math.sin(ph * Math.PI * 2), q = Math.max(0, Math.sin(ph * Math.PI * 2 - 0.9)) ** 2;   // q: the palm pressed forward, once a loop
      return hands({ ...BASE, rise: 0.8 + 0.5 * b, twist: 1 + 0.2 * q, hx: -0.4, hy: -0.3, tilt: 0.092, lift: 0.8, droop: 2.4 + 0.6 * q, bare: 0.4, open: 1, glow: 1 + 0.1 * q }, { N: [11.2 + 1.3 * q, -44 - 0.5 * b - 0.3 * q], F: [14.6, -33.2 - 0.4 * b] });
    },
  },
};
