// ============ CONCEPT FIGURE: the Spire's mage ============
// The reference the owner sent is a wizard casting, so the wizard goes first:
// pointed hat (its tip trails the body), long beard, the crown's blue robe with
// gold trim, an ember-crystal staff. Three clips: idle, walk, cast.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, HUMAN } from "./rig.js";

const ROBE = mat("#3b5b92"), ROBE_IN = mat("#2c4470"), GOLD = mat("#d8b34a", { contrast: 1.15 }), SKIN = mat("#e8b990");
const BEARD = mat("#dcd6ca"), HAT = mat("#34528a"), WOOD = mat("#7a5334"), BOOT = mat("#4a3426"), BELT = mat("#6e4a2a");
const EMBER = mat("#e8923a", { contrast: 1.2 }), EYE = flat("#2a1c2c"), HOT = flat("#fff6c8", { emis: true, line: "#e8923a" }), FLAME = flat("#ffb347", { emis: true, line: "#c85a28" });
const FIRE2 = flat("#f0722c", { emis: true, line: "#a83a22" }), FIRE3 = flat("#c8432a", { emis: true, line: "#7a2a2a" });

// The head, facing +x, a quarter turned: hair and beard behind and below, the
// face in front, the nose proud of it. (S skin, s skin a tone down, H beard,
// h beard a tone down, E eye, N nose a tone up.) The hat's brim covers rows 0-2.
const HEAD = [
  "....HHHHHH...",
  "..HHHHHHHHH..",
  ".HHHsssssss..",
  ".HHSSSSSSSS..",
  ".HHSSESSSESN.",
  ".HhSSESSSESNN",
  ".HHSsSSSSSS..",
  ".HHHHHHHHHHH.",
  "..HHHHHHHHHH.",
  "..HhHHHHhHH..",
  "...HHhHHHHH..",
  "...HHHHhHH...",
  "....HhHHH....",
  ".....HHh.....",
];
const BLINK = HEAD.map((r, i) => (i === 4 ? ".HHSSSSSSSSN." : i === 5 ? ".HhSSeSSSeSNN" : r));
const LEG = {
  S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 },
  H: { m: BEARD }, h: { m: BEARD, bias: -1 }, E: { m: EYE },
};

export const BOX = { w: 88, h: 72, ox: 30, oy: 62 };
export const BONES = { ...HUMAN, shN: -2.9, shF: 3.1 };

const edgeX = (a, b, y) => a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, anN, anF } = sk;
  // (gust: a wind in his face, e.g. his own jet's back-blast, bends hat and hem back)
  const vx = cl(C[0] - lag1.C[0] + (p.gust || 0), -2.4, 2.4), vx2 = cl(lag1.C[0] - lag2.C[0] + (p.gust || 0) * 0.6, -2.4, 2.4);

  // the staff, in the far fist, standing before him: an ember crystal in a gold claw
  const tl = p.staff ?? 0.04, d = [Math.sin(tl), -Math.cos(tl)], lo = p.staffLo ?? 16.6, up = 14.5;
  const foot = [hdF[0] - d[0] * lo, hdF[1] - d[1] * lo], tip = [hdF[0] + d[0] * up, hdF[1] + d[1] * up];
  px.part();
  // (braced for the breath he swings it across his chest: then it lies in front of him)
  const sz = (p.staffFront || 0) > 0.5 ? 7 : 1.5;
  px.capsule(foot[0], foot[1], 0.95, tip[0], tip[1], 0.95, WOOD, sz, { edge: true });
  const orb = [tip[0] + d[0] * 2.6, tip[1] + d[1] * 2.6], g = p.glow || 0;
  px.part();
  px.capsule(tip[0] - d[0] * 1.2, tip[1] - d[1] * 1.2, 1.4, tip[0] + d[0] * 0.6, tip[1] + d[1] * 0.6, 2, GOLD, sz + 0.05);
  px.part();
  if (g > 0.55) { px.ellipse(orb[0], orb[1], 3.3, 3.3, FLAME, sz + 0.1); px.ellipse(orb[0], orb[1], 2, 2, HOT, sz + 0.12); }
  else if (g > 0.2) { px.ellipse(orb[0], orb[1], 2.9, 2.9, FLAME, sz + 0.1); px.ellipse(orb[0] - 0.3, orb[1] - 0.3, 1.3, 1.3, HOT, sz + 0.12); }
  else { px.ellipse(orb[0], orb[1], 2.8, 2.8, EMBER, sz + 0.1); px.dot(orb[0] - 1.3, orb[1] - 1.3, HOT, sz + 0.12); px.dot(orb[0] - 0.3, orb[1] - 1.3, HOT, sz + 0.12); }

  // the far arm, a tone down, behind the body; its fist on the staff
  px.part();
  px.capsule(sF[0], sF[1], 2.2, eF[0], eF[1], 2.3, ROBE, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.3, hdF[0] * 0.8 + eF[0] * 0.2, hdF[1] * 0.8 + eF[1] * 0.2, 3, ROBE, 1, { bias: -1 });
  px.part(); px.ellipse(hdF[0], hdF[1], 1.7, 1.8, SKIN, 1.7, { bias: -1 });

  // boots under the hem
  for (const [an, zz, b] of [[anF, 2, -1], [anN, 3, 0]]) { px.part(); px.ellipse(an[0] + 1.2, an[1] + 0.9, 2.7, 1.4, BOOT, zz, { bias: b }); }

  // the robe: shoulders to a hem shaped by where the feet are; it trails the body
  const hemY = -1.4, top = C[1] - 1.8;
  const hemF = Math.max(P[0] + 6.6, Math.max(anN[0], anF[0]) + 3.4) - vx * 0.8;
  const hemB = Math.min(P[0] - 7.6, Math.min(anN[0], anF[0]) - 3) - vx * 1.3 - vx2 * 0.8;
  const wF = [P[0] + 5, P[1] - 1.5], wB = [P[0] - 5.6, P[1] - 1.5];
  px.part(); const robeId = px._pid;
  px.poly([[C[0] - 4.4, top], [C[0] + 4.6, top], [C[0] + 5.6, C[1] + 2.5], wF, [hemF, hemY], [hemB, hemY], wB, [C[0] - 5.8, C[1] + 2.5]], ROBE, 4, { round: 0.94, cast: 2 });
  // gold hem, belt and buckle
  const hy = hemY - 2;
  px.poly([[edgeX(wB, [hemB, hemY], hy), hy], [edgeX(wF, [hemF, hemY], hy), hy], [hemF, hemY], [hemB, hemY]], GOLD, 4.05, { round: 0.94 });
  px.poly([[wB[0] - 0.1, P[1] - 3.4], [wF[0] + 0.2, P[1] - 3.4], [wF[0], P[1] - 1.4], [wB[0], P[1] - 1.4]], BELT, 4.05, { round: 0.94 });
  px.rect(P[0] + 1.6, P[1] - 3.4, 2, 2, GOLD, 4.06, { fix: 3 });
  // folds: creases from the belt to the hem
  const hm = (t) => hemB + (hemF - hemB) * t;
  px.toneLine(P[0] + 1, P[1] + 0.5, hm(0.56), hy - 0.5, -1, robeId);
  px.toneLine(P[0] - 2.6, P[1] + 3, hm(0.3), hy - 0.5, -1, robeId);
  // the collar's gold
  px.line(C[0] - 3, top + 0.2, C[0] + 3.6, top + 0.2, GOLD, 4.06);

  // head and beard
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hyy, LEG, 6, { ax: 6, ay: 8, ball: [6.5, 5, 7, 7], cast: 2 });

  // the hat: brim, band, a cone whose point lags behind and settles
  const cx = hx + 0.5, by = hyy - 6.4, bend = 1 + cl(vx * 2.2 + vx2 * 1.6, -2.2, 3);
  px.part();
  px.poly([[cx - 5.6, by], [cx + 5.4, by], [cx + 3.4 - bend * 0.2, by - 5], [cx + 0.9 - bend * 0.9, by - 9.6], [cx - 2.4 - bend * 1.9, by - 13.4 + Math.abs(bend) * 0.5],
    [cx - 2.9 - bend * 1.0, by - 8.4], [cx - 4.6 - bend * 0.3, by - 4.2]], HAT, 6.4, { round: 0.95, ny: -0.15 });
  px.poly([[cx - 5.5, by - 2.2], [cx + 5.3, by - 2.2], [cx + 5.4, by], [cx - 5.6, by]], GOLD, 6.45, { round: 0.95 });
  px.dot(cx + 0.8 - bend * 0.3, by - 5.6, GOLD, 6.5, { fix: 4 }); px.dot(cx - 1.6 - bend * 0.8, by - 8.8, GOLD, 6.5, { fix: 3 }); px.dot(cx - 2.6 - bend * 0.5, by - 4.6, GOLD, 6.5, { fix: 3 });
  px.part();
  px.ellipse(cx + 0.4, by + 0.7, 8.6, 1.6, HAT, 6.6, { rot: -0.05, cast: 2, vb: 0.15 });

  // the near arm over it all: a belled sleeve, an open hand
  const wr = [hdN[0] * 0.78 + eN[0] * 0.22, hdN[1] * 0.78 + eN[1] * 0.22];
  px.part();
  px.capsule(sN[0], sN[1], 2.4, eN[0], eN[1], 2.4, ROBE, 8, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.4, wr[0], wr[1], 3.1, ROBE, 8, { cast: 2 });
  px.capsule(wr[0], wr[1], 3.1, wr[0] + (hdN[0] - eN[0]) * 0.06, wr[1] + (hdN[1] - eN[1]) * 0.06, 3.1, GOLD, 8.01);
  px.part(); px.ellipse(hdN[0], hdN[1], 1.7, 1.8, SKIN, 8.2);

  return { light: g > 0.05 ? { x: orb[0], y: orb[1], r: 32, col: "#ffb040", k: g } : null, orb };
};

// the spell itself: gathering sparks, then the fireball leaving the staff
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "cast" || !info.orb) return;
  const [ox, oy] = info.orb;
  if (ph > 0.12 && ph < 0.5) {
    // motes drawn in to the crystal
    const k = (ph - 0.12) / 0.38;
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + k * 2.2, r = (1 - ((k * 1.6 + i * 0.23) % 1)) * 11 + 2.5;
      px.dot(ox + Math.cos(a) * r, oy + Math.sin(a) * r * 0.8, i % 3 ? FLAME : HOT, 20);
    }
  }
  if (ph >= 0.5) {
    const t = (ph - 0.5) / 0.5, x = ox + 4 + t * 34 * (1 + t * 0.6), y = oy + 1 + t * 3.5, r = 3.6 + Math.sin(t * 9) * 0.4;
    if (x < 62) {
      for (let i = 5; i >= 1; i--) { const tx = x - i * (3.2 + t * 2.2), wob = Math.sin(i * 1.7 + t * 14) * 1.3; if (tx > ox + 2) px.ellipse(tx, y + wob - i * 0.25, Math.max(0.7, r - i * 0.62), Math.max(0.7, r - i * 0.7), i > 3 ? FIRE3 : FIRE2, 20 - i * 0.1); }
      px.ellipse(x, y, r + 0.3, r, FIRE2, 20.5); px.ellipse(x + 0.6, y, r - 1, r - 1.1, FLAME, 20.6); px.ellipse(x + 1.2, y, r - 2.2, r - 2.3, HOT, 20.7);
      for (let i = 0; i < 4; i++) px.dot(x - 6 - i * 4.5 - ((t * 37 + i * 3) % 3), y - 3 + ((i * 5 + Math.floor(t * 20)) % 7), i % 2 ? FLAME : FIRE2, 20);
    }
    // the flash at the crystal as it leaves
    if (t < 0.18) { px.ellipse(ox + 1, oy, 5 - t * 14, 5 - t * 14, HOT, 21); }
  }
};

const READY = { aF: [0.76, 0.88, 0], aN: [0.3, 0.82, 0], staff: 0.04, glow: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 1800, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2); return { ...READY, rise: 0.5 + 0.5 * b, aF: [0.76, 0.88 - 0.035 * (0.5 + 0.5 * b), 0], aN: [0.3 + 0.04 * b, 0.82, 0], staffLo: 16.6 - 0.9 * (0.5 + 0.5 * b), blink: ph > 0.72 && ph < 0.86 ? 1 : 0 }; },
  },
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 4.2, lift: 2.2, swing: 0.36, bob: 1 }), a = Math.cos(ph * Math.PI * 2); return { ...w, aF: [0.8 + 0.12 * a, 0.86, 0], staff: 0.08 - 0.2 * a, staffLo: 15.6, glow: 0 }; },
  },
  // Dragon's Breath: braced behind a levelled staff, pouring fire (the jet itself is the
  // scene's, it runs far past his box). He leans against it, the staff shudders, and the
  // back-blast streams hat and hem behind him.
  breath: {
    n: 8, ms: 520, loop: true, lag: 0.1,
    pose: (ph) => {
      const a = ph * Math.PI * 2, s = Math.sin(a * 2), s2 = Math.sin(a * 3 + 1);
      return { rx: -0.9 + 0.35 * s, drop: 1.2, lean: -0.08 + 0.02 * s2, hx: 0.5, fN: [-3.6, 0], fF: [3.8, 0], aF: [1.5, 0.98, 0], aN: [1.42, 0.7, 0],
        staff: 1.5 + 0.035 * s, staffLo: 13, staffFront: 1, glow: 0.9 + 0.1 * s2, gust: 1.3 + 0.5 * s2 };
    },
  },
  cast: {
    n: 14, ms: 1150, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      { t: 0, p: READY },
      { t: 0.2, e: "out", p: { rx: -0.8, lean: -0.08, rise: 0.5, aF: [0.6, 0.78, 0], aN: [1.05, 0.66, 0], staff: -0.2, glow: 0.3 } },
      { t: 0.44, e: "io", p: { rx: -1.4, lean: -0.14, rise: 1, hy: -0.4, aF: [1.95, 0.84, 0], aN: [1.2, 0.74, 0], staff: -0.34, staffLo: 14, glow: 0.8 } },
      { t: 0.54, e: "in3", p: { rx: 1.8, drop: 0.9, lean: 0.17, hx: 0.5, aF: [1.36, 1, 0], aN: [-0.7, 0.9, 0], fF: [4.6, 0], staff: 1.02, staffLo: 14, glow: 1 } },
      { t: 0.66, e: "out", p: { rx: 2.3, drop: 1.2, lean: 0.21, hx: 0.6, aF: [1.2, 1, 0], aN: [-0.92, 0.9, 0], fF: [4.6, 0], staff: 1.22, staffLo: 14, glow: 0.55 } },
      { t: 0.86, e: "io", p: { rx: 0.6, drop: 0.3, lean: 0.04, aF: [0.95, 0.9, 0], aN: [0.1, 0.84, 0], fF: [3, 0], staff: 0.36, glow: 0.12 } },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
};
