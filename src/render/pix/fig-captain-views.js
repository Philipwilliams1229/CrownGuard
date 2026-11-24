// ============ CONCEPT FIGURES: Captain Hale seen from the FRONT and from BEHIND ============
// The pattern of fig-goblin-views.js applied to Hale (fig-captain.js: crested sallet with its gold brow band
// and tall red crest, grey moustache, mail coif, steel plate with spiked pauldrons over a navy tabard, a
// navy cloak, the halberd carried in his RIGHT hand, his LEFT hand on his hip). s = +1 FRONT (walking down the
// screen), s = -1 BACK (walking up it). His right hand is on SCREEN LEFT in front and SCREEN RIGHT behind
// (`rs`). The halberd is carried upright with the crescent blade turned to the screen side outboard of him (so the
// blade shows, not edge-on) and the hook inboard; the red tassel swings. Unflipped on the board; one sun, upper left.
// Same clip n / ms / pose as the side walk; feet, bob and sway read the same solved walk.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES, haftAngle } from "./fig-captain.js";
import { carry, damp } from "./carry.js";

const STEEL = mat("#98a2b6", { contrast: 1.05 }), STEEL_D = mat("#7a8296", { contrast: 1.05 }), MAIL = mat("#6c7488", { contrast: 1.05 }), GOLD = mat("#e0b84a", { contrast: 1.15 });
const NAVY = mat("#2e4a7a"), NAVY_D = mat("#24365c"), RED = mat("#c8383a"), RED_D = mat("#8a2630"), SKIN = mat("#e2b08a"), HAIR = mat("#b0aca4");
const LEATHER = mat("#5a3c28"), WOOD = mat("#7a5232", { contrast: 1.1 }), EYE = flat("#2a1c2c");
const LEG = {
  M: { m: STEEL }, m: { m: STEEL, bias: -1 }, G: { m: GOLD }, c: { m: MAIL }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, b: { m: HAIR, fix: 2 }, w: { m: HAIR, fix: 2 },
};
const FWD = 0.18, cl = (v, a, b) => Math.max(a, Math.min(b, v));

// FRONT head, 13 wide, 12 tall: sallet dome, gold band, brows, eyes, nose, the grey moustache, the mail coif at the sides.
const FRONT_H = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMMMMMMMMMM.",
  ".MMMMMMMMMMM.",
  ".GGGGGGGGGGG.",
  ".cmsbbSbbsmc.",
  ".cmSESSSESmc.",
  ".cmSESNSESmc.",
  ".cmSSSNSSSmc.",
  ".ccSwwwwwScc.",
  "..ccSSsSScc..",
  "..ccccccccc..",
];
const blinkOf = (rows) => rows.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
// BACK head: the dome, the gold band round it, the flared tail of the sallet over the nape, the mail below.
const BACK_H = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMMMMMMMMMM.",
  ".MMMMMMMMMMM.",
  ".GGGGGGGGGGG.",
  ".MMMMMMMMMMM.",
  ".MMMMMMMMMMM.",
  ".MmMMMMMMMmM.",
  ".mMMMMMMMMMm.",
  ".mmMMMMMMMmm.",
  "..mmmMMMmmm..",
  "..ccccccccc..",
];

const make = (s) => (px, F, o = {}) => {
  const { sk, ph } = F, p = sk.p, TAU = Math.PI * 2, rs = -s, ls = s;
  const sx = rs * 0.9 * Math.sin(ph * TAU), sxL = rs * 0.9 * Math.sin((ph - 0.09) * TAU), sxL2 = rs * 0.9 * Math.sin((ph - 0.18) * TAU);
  const hipY = sk.P[1], chestY = sk.C[1], hy = sk.N[1], hx = Math.round(sx * 0.7), tx = sx * 0.6;
  const a = Math.cos(ph * TAU), vx = cl((sx - sxL) * 1.4, -2.4, 2.4), vx2 = cl((sxL - sxL2) * 1.4, -2.4, 2.4);
  const hemY = hipY + 3.6;
  const spin = p.level != null, sxs = spin ? (p.level < Math.PI / 2 ? 1 : -1) : 0, spy = sk.hdN[1] + 0.2;   // the whirlwind: his blade swung to screen right (+1) or left (-1)

  // the cloak behind him: navy, down past the knee, its edge showing beyond the arms and swinging a beat late
  const t1 = -vx * 1.2, t2 = -vx * 1.6 - vx2 * 1.4;
  px.part(); const cp = px._pid;
  px.poly([[tx - 5.6, chestY - 2], [tx + 5.6, chestY - 2], [tx + 7.4, chestY + 6], [hx + 7.4 + t1 * 0.6, hipY + 8], [hx + 7.8 + t2, -6.8], [hx + 3 + t2 * 0.7, -5.2], [hx - 3 + t2 * 0.7, -5.6], [hx - 7.8 + t2, -6.8], [hx - 7.4 + t1 * 0.6, hipY + 8], [tx - 7.4, chestY + 6]], NAVY_D, s > 0 ? 0.5 : 5.0, { round: 0.85, cast: s > 0 ? 0 : 0, edge: s < 0 });
  px.toneLine(hx + (s > 0 ? -5 : -4), chestY + 6, hx - 5 + t2 * 0.8, -8, -1, cp);

  // the legs: navy hose, the knee cop and a steel greave, a leather boot; forward is down (front) or up (back)
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]];
  for (const [f, side, z] of feet) {
    const lift = f[1], fx = hx + side * 2.9, fy = -2.4 + s * f[0] * FWD - lift * 0.55;
    const hp = [hx + side * 2.6, hipY + 2], kn = [(hp[0] + fx) / 2 + side * 0.4, (hp[1] + fy) / 2 - lift * 0.3], b = side === rs ? 0 : -1;
    px.part();
    px.capsule(hp[0], hp[1], 2.9, kn[0], kn[1], 2.4, NAVY_D, z, { bias: b });
    px.capsule(kn[0], kn[1], 2.3, fx, fy, 1.9, STEEL_D, z, { bias: b });
    px.ellipse(kn[0], kn[1] + 0.4, 2.3, 2.1, STEEL, z + 0.02, { bias: b, vb: 0.25 });
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.4, fy + 1.7, 2.6, 1.7, LEATHER, z + 0.03, { bias: b });
    else {
      px.ellipse(fx, fy + 1.3, 2.4, 1.6, LEATHER, z + 0.03, { bias: b });
      if (lift > 1.2) px.ellipse(fx, fy + 3, 2.1, 1.8 * cl(lift / 3, 0.3, 1), LEATHER, z + 0.05, { bias: -2 });   // the sole shows as the heel comes up
    }
  }

  // the tabard from chest to the knee, split at its foot by the stride; the breastplate (front) or backplate over it
  const hemW = 6.2;
  px.part(); const tb = px._pid;
  px.poly([[tx - 5.4, chestY - 1.6], [tx + 5.4, chestY - 1.6], [tx + 6.2, chestY + 3.5], [hx + 5, hipY - 2.6], [hx + hemW, hemY], [hx + hemW * 0.5, hemY + 1.1], [hx + 0.3 - vx * 0.4, hemY + 0.2], [hx - hemW * 0.5, hemY + 1.1], [hx - hemW, hemY], [hx - 5, hipY - 2.6], [tx - 6.2, chestY + 3.5]], NAVY, 4, { round: 0.9, ny: -0.12, cast: 2 });
  px.toneLine(hx + 0.6, hipY - 0.5, hx + 0.4 - vx * 0.4, hemY - 0.6, -1, tb);
  px.part();
  px.poly([[tx - 5.4, chestY - 1.6], [tx + 5.4, chestY - 1.6], [tx + 6.2, chestY + 3.4], [hx + 4.8, hipY - 4.2], [hx - 4.8, hipY - 4.2], [tx - 6.2, chestY + 3.4]], STEEL, s > 0 ? 4.3 : 4.05, { round: 0.92, ny: -0.12, cast: 1 });
  px.line(tx - 3.8, chestY - 0.6, hx - 3.4, hipY - 5.2, STEEL, 4.32, { fix: 4, noLine: true });
  px.line(tx + 4.2, chestY + 0.4, hx + 3.8, hipY - 5.2, STEEL, 4.32, { fix: 1, noLine: true });
  if (s > 0) px.line(tx, chestY - 0.8, hx, hipY - 5.4, STEEL_D, 4.33, { noLine: true });       // the plate's centre ridge
  else px.toneLine(tx, chestY - 0.6, hx, hipY - 5, -1, px._pid);                               // the backplate's spine
  // belt, buckle (front), a gold line down the skirt
  px.part();
  px.rect(hx - 5, hipY - 3.8, 10, 1.9, LEATHER, 4.4, { round: 0.9 });
  if (s > 0) px.rect(hx - 1, hipY - 3.8, 2, 1.9, GOLD, 4.42, { fix: 3 });
  px.line(hx - 0.2 - vx * 0.3, hemY - 1.2, hx - 0.2 - vx * 0.3, hipY - 2, GOLD, 4.43, { noLine: true });
  px.line(tx - 3, chestY - 1.4, tx + 3, chestY - 1.4, GOLD, 4.5);                                // the gorget's gold edge

  // the far arm (his LEFT, screen side ls): the hand on his hip, the elbow out; a pauldron with one spike
  const PX = 8.2, PY = chestY + 1;   // the pauldrons sit OUT past the head (never over the face)
  const shL = [tx + ls * 7.4, chestY + 0.8], elL = s > 0 ? [tx + ls * 10.8, chestY + 7.4] : [tx + ls * 9.6, chestY + 7.4], hpL = spin ? [tx + ls * 2.6, spy + (s > 0 ? 0.4 : 1)] : s > 0 ? [hx + ls * 4.9, hipY - 4] : [tx + ls * 9.7, chestY + 13.6 - a * 0.6 * s];
  px.part();
  const azL = s > 0 ? 4.6 : 4.3, bL = s > 0 ? { bias: -1, cast: 0 } : { cast: 0 };
  px.capsule(shL[0], shL[1], 2.3, elL[0], elL[1], 2.2, STEEL_D, azL, bL);
  px.capsule(elL[0], elL[1], 2.2, hpL[0], hpL[1], 1.9, STEEL, azL, bL);
  px.ellipse(elL[0], elL[1], 1.9, 1.9, STEEL, azL + 0.02, { vb: 0.25 });
  px.ellipse(hpL[0], hpL[1] + (s < 0 ? 1 : 0), s > 0 ? 1.8 : 1.5, s > 0 ? 1.7 : 1.4, STEEL_D, s > 0 ? 4.8 : 3.6);
  px.part();
  const pL = [tx + ls * PX, PY];
  px.ellipse(pL[0], pL[1] - 0.4, 3.9, 3.4, STEEL_D, s > 0 ? 6.0 : 5.2, { cast: s > 0 ? 0 : 1, edge: s < 0 });
  px.line(pL[0] - 3, pL[1] + 2, pL[0] + 3, pL[1] + 2, GOLD, s > 0 ? 6.02 : 5.22);
  px.poly([[pL[0] - 1.2, pL[1] - 2], [pL[0] + 1.2, pL[1] - 2], [pL[0] + ls * 0.8, pL[1] - 6.8]], STEEL_D, s > 0 ? 6.04 : 5.24, { edge: true });

  // ONE weapon pose (carry.js): the side walk reads the haft ~0.42..0.52 rad forward (haftAngle), the fist at hdN (chest + 8.5);
  // damped to the mean and projected: from the front it points at us (shorter), from behind it leans away and shows past the
  // shoulder. The head is drawn at its full side-view size from the tip; only the haft shortens. LEN / GRIP are fig-captain's.
  const G = 1.2 / 1.1, LENT = 58 * G - 20 * G, BUTT = 20 * G, HK = 0.72 * G;
  const sh = [tx + rs * 7.4, chestY + 0.8];
  const hd = spin ? [tx + rs * 2.6, spy] : [tx + rs * 10.8, sk.hdN[1] + 0.2], elb = [tx + rs * 9.4, hd[1] + 1.6];
  let C;
  if (spin) {
    // WHIRLWIND: the same halberd held out level, pointed at us (FRONT) or away (BACK), its head swung to screen side sxs.
    // Foreshortened along the pole (FC), the head at its full width; the butt stubs out behind the hands on the other side.
    const FC = 0.45, u = [sxs * 0.92, s * 0.3], un = Math.hypot(u[0], u[1]), uu = [u[0] / un, u[1] / un], W = [-uu[1] * sxs * s, uu[0] * sxs * s], M = [tx, spy];
    const SOC = 20, Hs = (t, w = 0) => { const d = SOC + (t - 22) * HK * 0.85; return [M[0] + uu[0] * d + W[0] * w * HK, M[1] + uu[1] * d + W[1] * w * HK]; };
    const zH = s > 0 ? 7.6 : 1.0, zBt = s > 0 ? 1.5 : 4.6, e = s > 0, bz2 = zH;
    const bt = [M[0] - uu[0] * 26 * FC, M[1] - uu[1] * 26 * FC];
    px.part(); px.tag("halb");
    px.capsule(bt[0], bt[1], 1.1, M[0] - uu[0] * 2.5, M[1] - uu[1] * 2.5, 1.1, WOOD, zBt, { edge: false });
    px.capsule(bt[0], bt[1], 1.4, bt[0] + uu[0] * 1.2, bt[1] + uu[1] * 1.2, 1.4, STEEL_D, zBt + 0.02);
    px.capsule(M[0], M[1], 1.1, ...Hs(22), 1.05, WOOD, zH, { edge: e });
    px.part();
    px.capsule(...Hs(18), 1.5, ...Hs(21.4), 1.4, STEEL_D, bz2 + 0.05);
    px.capsule(...Hs(21), 1.2, ...Hs(31), 0.2, STEEL, bz2 + 0.06, { edge: e });
    px.poly([Hs(23.6, 0.8), Hs(25.4, 4), Hs(24.4, 7.6), Hs(20.8, 9), Hs(16.6, 7.4), Hs(18.8, 6), Hs(20.6, 5.2), Hs(20.6, 3.4), Hs(18.6, 1)], STEEL, bz2 + 0.07, { round: 0.5, edge: e });
    px.line(...Hs(23.8, 2.4), ...Hs(23.6, 6.6), STEEL, bz2 + 0.1, { fix: 4, noLine: true });
    px.line(...Hs(21, 8.2), ...Hs(17.6, 6.9), STEEL, bz2 + 0.1, { fix: 1, noLine: true });
    px.poly([Hs(19.4, -0.8), Hs(21.8, -0.8), Hs(21.4, -4.6), Hs(19.6, -6), Hs(19.6, -3.2)], STEEL, bz2 + 0.07, { round: 0.5, edge: e });
    { const w = cl(-vx * 1.4 + sxs * 1.2, -3, 3), t0 = Hs(14.4, 0.4);
      px.part();
      px.capsule(...t0, 0.9, t0[0] + w * 0.6 - 0.4, t0[1] + 3.2, 1.2, RED, bz2 + 0.1);
      px.capsule(t0[0] + w * 0.6 - 0.4, t0[1] + 3.2, 1.2, t0[0] + w * 1.1, t0[1] + 7, 0.7, RED_D, bz2 + 0.1); }
    C = { zTip: zH, zButt: zBt };
  } else {
    const am = haftAngle(F.sk);
    C = carry(damp(am, 0.47), s, { rs, hand: hd, len: LENT, butt: BUTT });
    const Hh = (tt, w = 0) => C.head(LENT, (tt - 31) * HK, rs * w * HK);
    const zT = C.zTip, zB = C.zButt, bz = zT, e = s > 0;
    px.part(); px.tag("halb");
    px.capsule(...C.at(-BUTT), 1.1, ...hd, 1.1, WOOD, zB, { edge: e });
    px.capsule(...C.at(-BUTT), 1.5, ...C.at(-BUTT + 1.4), 1.5, STEEL_D, zB + 0.02);
    px.capsule(...hd, 1.1, ...Hh(22), 1.05, WOOD, zT, { edge: e });
    px.part();
    px.capsule(...Hh(18), 1.5, ...Hh(21.4), 1.4, STEEL_D, bz + 0.05);
    px.capsule(...Hh(21), 1.2, ...Hh(31), 0.2, STEEL, bz + 0.06, { edge: e });                      // the spike
    px.poly([Hh(23.6, 0.8), Hh(25.4, 4), Hh(24.4, 7.6), Hh(20.8, 9), Hh(16.6, 7.4), Hh(18.8, 6), Hh(20.6, 5.2), Hh(20.6, 3.4), Hh(18.6, 1)], STEEL, bz + 0.07, { round: 0.5, edge: e });   // the crescent, turned outboard so it shows
    px.line(...Hh(23.8, 2.4), ...Hh(23.6, 6.6), STEEL, bz + 0.1, { fix: 4, noLine: true });
    px.line(...Hh(21, 8.2), ...Hh(17.6, 6.9), STEEL, bz + 0.1, { fix: 1, noLine: true });
    px.poly([Hh(19.4, -0.8), Hh(21.8, -0.8), Hh(21.4, -4.6), Hh(19.6, -6), Hh(19.6, -3.2)], STEEL, bz + 0.07, { round: 0.5, edge: e });   // the back hook, inboard
    {
      const w = cl(-vx * 1.4, -3, 3), t0 = Hh(14.4, 0.4);
      px.part();
      px.capsule(...t0, 0.9, t0[0] + w * 0.6 - 0.4, t0[1] + 3.2, 1.2, RED, bz + 0.1);
      px.capsule(t0[0] + w * 0.6 - 0.4, t0[1] + 3.2, 1.2, t0[0] + w * 1.1, t0[1] + 7, 0.7, RED_D, bz + 0.1);
    }
  }
  px.tag(null);
  // the right arm: vambrace, gauntlet closed over the haft (FRONT: over the shaft; BACK: the fist sits just above the butt side)
  const fz = Math.max(C.zTip, C.zButt) + 0.1, az = s > 0 ? 6.2 : 4.3;
  px.part(); px.tag("nearArm");
  px.capsule(sh[0], sh[1] + 0.5, 2.3, elb[0], elb[1], 2.2, STEEL_D, az, { cast: 0 });
  px.capsule(elb[0], elb[1], 2.2, hd[0], hd[1], 1.9, STEEL, az, { cast: 0 });
  px.ellipse(elb[0], elb[1], 1.9, 1.9, STEEL, az + 0.02, { vb: 0.25 });
  px.ellipse(hd[0], hd[1] + (s < 0 ? 0.6 : 0), s > 0 ? 2.1 : 1.6, s > 0 ? 2.0 : 1.5, STEEL_D, fz);
  if (s > 0) px.line(hd[0] - 1.8, hd[1] - 0.8, hd[0] + 1.8, hd[1] - 0.8, STEEL, fz + 0.02, { fix: 1, noLine: true });   // the fingers over the haft
  px.line(hd[0] - 1.4, hd[1] + 0.8, hd[0] + 1.4, hd[1] - 1, GOLD, fz + 0.05);
  px.tag(null);
  px.part();
  const pR = [tx + rs * PX, PY];
  px.ellipse(pR[0], pR[1] - 0.4, 4.0, 3.3, STEEL, s > 0 ? 6.0 : 5.2, { cast: 1, edge: s < 0 });
  px.line(pR[0] - 3, pR[1] + 2.2, pR[0] + 3, pR[1] + 2.2, GOLD, s > 0 ? 6.02 : 5.22);
  px.poly([[pR[0] - 2, pR[1] - 2], [pR[0] + 0.4, pR[1] - 2], [pR[0] - 1.6, pR[1] - 7.6]], STEEL, s > 0 ? 6.04 : 5.24, { edge: true });
  px.poly([[pR[0] + 0.8, pR[1] - 1.8], [pR[0] + 3.2, pR[1] - 1.8], [pR[0] + 3.6, pR[1] - 6]], STEEL, s > 0 ? 6.04 : 5.24, { edge: true });

  // the head: sallet and its horsehair crest. From the front the plume rises over the dome and falls behind it; from behind it
  // runs as a broad red ridge down the back of the dome and streams past the nape, a beat behind the bob.
  px.part();
  const pl = cl(vx * 2 + vx2 * 1.5, -3, 3);
  if (s > 0) px.stamp(p.blink ? blinkOf(FRONT_H) : FRONT_H, hx, hy, LEG, 6.4, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 2, edge: true });
  else px.stamp(BACK_H, hx, hy, LEG, 6.4, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 2, edge: true });
  px.part(); const cr = px._pid;
  if (s > 0) {
    px.poly([[hx - 1.6, hy - 9.4], [hx + 1.6, hy - 9.4], [hx + 2.4, hy - 13], [hx + 1 + pl * 0.4, hy - 16.4], [hx - 1 + pl * 0.4, hy - 16.8], [hx - 2.4, hy - 13]], RED, 6.8, { round: 0.8 });
    px.toneLine(hx + 0.4, hy - 9.6, hx + pl * 0.3, hy - 16, -1, cr);
  } else {
    px.poly([[hx - 2.2, hy - 9.4], [hx + 2.2, hy - 9.4], [hx + 2.6, hy - 2], [hx + 2.4 + pl * 0.5, hy + 3.4], [hx + 3.2 + pl, hy + 8.6], [hx + pl * 1.2, hy + 10.6], [hx - 3 + pl, hy + 8.2], [hx - 2.4 + pl * 0.5, hy + 3.2], [hx - 2.6, hy - 2]], RED, 6.8, { round: 0.8 });
    px.toneLine(hx - 0.4, hy - 9.4, hx - 0.4 + pl * 0.7, hy + 9, -1, cr);
    px.toneLine(hx + 1.1, hy - 4, hx + 1.4 + pl * 0.9, hy + 8.4, -1, cr);
  }
  return {};
};

const walk = { ...SIDE.walk }, spinC = { ...SIDE.spin };
export const FRONT = { NAME: "captain-front", BOX: { w: 108, h: 98, ox: 40, oy: 86 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk, spin: spinC } };
export const BACK = { NAME: "captain-back", BOX: { w: 108, h: 98, ox: 40, oy: 86 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk, spin: spinC } };
