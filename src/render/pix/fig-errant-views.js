// ============ VIEWS: the Knight Errant from the FRONT and from BEHIND ============
// The Errant of fig-errant.js (gunmetal plate, forest-green surcoat with a brass chevron, green kite shield
// with a brass chevron, brass browband and belt, bascinet with the hound's-snout visor pushed up, tall
// off-white plume) walking toward the camera (FRONT) and away from it (BACK). One drawer, `view(s)`: s = +1
// front, -1 back. His RIGHT hand holds the sword (screen LEFT in front, screen RIGHT from behind: `rs`); the
// kite shield rides his LEFT arm (face-on in front, its back from behind). Same walk clip as the side (the
// garrison's: n, ms, pose); feet, bob and the swing are read from the solved pose. Heavy: a small sway, a
// slow plod. One sun, upper left, unflipped.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-errant.js";

const PLATE = mat("#68738a", { contrast: 1.2 }), MAIL = mat("#474f5e", { contrast: 1.1 }), BRASS = mat("#c9a24a", { contrast: 1.2 });
const GREEN = mat("#2f6b3f", { contrast: 1.15 }), GREENK = mat("#1f4a2c"), PLUME = mat("#e8e2d0", { contrast: 1.2 });
const SKIN = mat("#e8b990"), HAIR = mat("#6a4a30"), LEATHER = mat("#5a3c28"), EYE = flat("#2a1c2c"), BLADE = mat("#d4dae4", { contrast: 1.35 });

const LEG = {
  M: { m: PLATE }, W: { m: PLATE, bias: 1 }, m: { m: PLATE, bias: -1 }, G: { m: BRASS, fix: 3 }, V: { m: PLATE, bias: 1 }, c: { m: MAIL }, d: { m: MAIL, bias: -1 },
  S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, E: { m: EYE }, b: { m: HAIR, fix: 2 }, l: { m: SKIN, fix: 0 },
};
// FRONT: the dome with the visor's snout standing up the middle (V), the brass browband, mail at the cheeks, face, mail gorget. 13 wide, centre 6.
const FRONT_H = [
  "....MMVMM....",
  "..MMWMVVMMM..",
  ".MMWWMVVVMMM.",
  ".MMMMMMVMMMM.",
  ".GGGGGGGGGGG.",
  "cMsbbSSSbbsMc",
  "cMSSESSSESSMc",
  "cmSSESSSESSmc",
  "cmSSSSNSSSSmc",
  ".ccmSSSSSmcc.",
  ".ccmSlllSmcc.",
  "..ccccccccc..",
];
const BLINK = FRONT_H.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
// BACK: the dome with its riveted seam, the brass band round it, the camail falling over the nape.
const BACK_H = [
  "....MMMMM....",
  "..MMWMMMMMM..",
  ".MMWMMMMMMMM.",
  ".MMMMMmMMMMM.",
  ".MMMMMmMMMMM.",
  ".GGGGGGGGGGG.",
  ".ccccccccccc.",
  ".cdcdcdcdcdc.",
  "..ccdcdcdcc..",
  "..cdcdcdcdc..",
  "...ccdcdcc...",
  "....ccccc....",
];

const FWD = 0.4, TAU = Math.PI * 2, cl = (v, a, b) => Math.max(a, Math.min(b, v));

const make = (s) => (px, F) => {
  const rs = -s, ls = s, vv = s > 0;
  const { sk, ph } = F, p = sk.p;
  const sx = rs * 0.5 * Math.sin(ph * TAU), hipY = sk.P[1], chestY = sk.C[1], hy = sk.N[1] + 0.5, hx = Math.round(sx * 0.7);
  const a = Math.cos(ph * TAU), lagC = F.lag1.C[0], vxs = cl(sk.C[0] - lagC, -2.5, 2.5);
  const hem = hipY + 4.8, shY = chestY - 0.6;

  // ---- far side first: the kite shield on his left arm (face-on in front, its back from behind)
  const lSh = [ls * 5.8 + sx, shY], lEl = [ls * 6.8 + sx, shY + 5], lHd = [ls * 6.8 + sx, shY + 12 + s * a * 0.7];
  px.part();
  px.capsule(lSh[0], lSh[1], 2.1, lEl[0], lEl[1], 2.0, PLATE, vv ? 4.4 : 4.3, vv ? { bias: -1 } : { cast: 0 });
  px.capsule(lEl[0], lEl[1], 2.0, lHd[0], lHd[1], 1.8, PLATE, vv ? 4.4 : 4.3, vv ? { bias: -1 } : { cast: 0 });
  {
    const bx = ls * 8.6 + sx, by = shY + 11.6 + (vv ? 0 : 0.6), z = vv ? 8.4 : 1.0, S = (x, y) => [bx + x * 0.92, by + y * 0.98];
    px.part(); const sid = px._pid;
    px.poly([S(-4.7, -6.3), S(4.7, -6.3), S(5, 0.6), S(0, 8.2), S(-5, 0.6)], BRASS, z, { round: 0.6, cast: vv ? 2 : 0 });
    px.poly([S(-3.6, -5.2), S(3.6, -5.2), S(3.8, 0.3), S(0, 6.5), S(-3.8, 0.3)], vv ? GREEN : GREENK, z + 0.02, { round: 0.6 });
    px.part();
    if (vv) {
      px.line(...S(-3, -2.4), ...S(0, 1), BRASS, z + 0.05); px.line(...S(0, 1), ...S(3, -2.4), BRASS, z + 0.05);
      px.dot(...S(0, 3.4), BRASS, z + 0.06, { fix: 3 });
      px.part(); px.ellipse(lHd[0], lHd[1] + 0.2, 1.7, 1.8, MAIL, z + 0.3);          // the gauntlet round the grip, over the shield's face
    } else {
      px.line(...S(-2.4, -3.4), ...S(2.4, -3.4), LEATHER, z + 0.05); px.line(...S(-2.4, 1.6), ...S(2.4, 1.6), LEATHER, z + 0.05);   // the straps
      px.toneLine(...S(-1, -5), ...S(-1, 5.4), -1, sid);
    }
  }

  // ---- plate legs, knee-cops in brass, mail sabatons. Forward is down the screen in front, up it behind.
  for (const [f, side, z] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lift = f[1], fx = hx + side * 2.9, fy = -2 + s * f[0] * FWD - lift * 0.9, b = side === rs ? 0 : -1;
    const hp = [hx + side * 2.1, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.6, (hp[1] + fy) / 2 - lift * 0.5];
    px.part();
    px.capsule(hp[0], hp[1], 2.7, kn[0], kn[1], 2.3, PLATE, z + lift * 0.05, { bias: b });
    px.capsule(kn[0], kn[1], 2.2, fx, fy, 1.8, PLATE, z + lift * 0.05, { bias: b });
    px.ellipse(kn[0], kn[1], 2.2, 1.9, PLATE, z + lift * 0.05 + 0.02, { bias: b, vb: 0.25 });
    px.part();
    if (vv) px.dot(kn[0], kn[1] + 0.2, BRASS, z + lift * 0.05 + 0.05, { fix: 3 });
    px.part();
    if (vv) px.ellipse(fx, fy + 1, 2.5, 1.5, MAIL, z + 0.4 + lift * 0.05, { bias: b });
    else {
      px.ellipse(fx, fy + 0.8, 2.1, 1.4, MAIL, z + 0.4 + lift * 0.05, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 2.6, 1.8, 1.8 * cl(lift / 2.4, 0.3, 1), MAIL, z + 0.45, { bias: -2 });
    }
  }

  // ---- the body: breastplate edge at the shoulders, the surcoat over it to the knee, belt and buckle
  px.part();
  px.poly([[sx - 5.6, chestY - 1.8], [sx + 5.6, chestY - 1.8], [sx + 6, chestY + 3.5], [sx + 4.8, hipY - 2.6], [sx - 4.8, hipY - 2.6], [sx - 6, chestY + 3.5]], PLATE, 4, { round: 0.92, ny: -0.12, cast: 2 });
  px.part(); const coat = px._pid;
  const dag = (xs) => xs.map(([x, y]) => [sx + x - vxs * 0.5 * (y > 0 ? 1 : 0), y]);
  px.poly([[sx - 4.3, chestY - 1.2], [sx + 4.3, chestY - 1.2], [sx + 5.4, chestY + 3.3], [sx + 5, hipY - 2.6], [sx + 6, hem], [sx + 3.8, hem + 1.1], [sx + 1.6, hem], [sx - 0.6, hem + 1.1], [sx - 2.8, hem], [sx - 4.6, hem + 1.1], [sx - 6, hem], [sx - 5, hipY - 2.6], [sx - 5.4, chestY + 3.3]], GREEN, 4.2, { round: 0.9, cast: 2 });
  px.toneLine(sx - 3.6, hipY - 1, sx - 3.8, hem - 0.6, -1, coat);
  px.line(sx - 5.4, hem - 0.8, sx + 5.4, hem - 0.8, GREENK, 4.22);
  px.part();
  if (vv) {
    px.line(sx - 3.4, chestY + 0.4, sx, chestY + 3.4, BRASS, 4.25); px.line(sx, chestY + 3.4, sx + 3.4, chestY + 0.4, BRASS, 4.25);   // the chevron
    px.line(sx, chestY + 4, sx, hipY - 3.4, BRASS, 4.23);                                                                        // the piping down the front edge
  } else {
    px.toneLine(sx + 0.4, chestY, sx, hipY - 3, -1, coat);                                                                           // the back seam
    px.line(sx - 4.6, chestY + 2.2, sx + 4.6, chestY + 2.2, GREENK, 4.22);                                                             // the yoke
  }
  px.part();
  px.poly([[sx - 5.2, hipY - 3.4], [sx + 5.2, hipY - 3.4], [sx + 5.3, hipY - 1.6], [sx - 5.3, hipY - 1.6]], LEATHER, 4.3, { round: 0.9 });
  px.part();
  if (vv) px.rect(sx - 1, hipY - 3.4, 2.4, 1.8, BRASS, 4.32, { fix: 3 });
  else { px.dot(sx - 2.6, hipY - 2.6, BRASS, 4.32, { fix: 3 }); px.dot(sx + 2.6, hipY - 2.6, BRASS, 4.32, { fix: 3 }); }
  px.line(sx - 3.6, chestY - 1.2, sx + 3.6, chestY - 1.2, BRASS, 4.3);                                                           // the gorget's edge

  // ---- the plume rooted on the crown: behind the dome from the front, falling over its back from behind
  const pl = cl(vxs * 2 + (F.lag1.C[0] - F.lag2.C[0]) * 1.5, -3, 3), top = hy - 12;
  px.part();
  if (vv) {
    px.capsule(hx + 0.4, top + 3, 1.6, hx + 1 + pl * 0.2, top - 2, 1.9, PLUME, 5.2);
    px.capsule(hx + 1 + pl * 0.2, top - 2, 1.9, hx + 2.6 + pl * 0.5, top - 5.4, 1.1, PLUME, 5.2);
  } else {
    px.capsule(hx, top + 3.4, 1.7, hx + pl * 0.3, top - 1.4, 2.0, PLUME, 6.5);
    px.capsule(hx + pl * 0.3, top - 1.4, 2.0, hx + 0.6 + pl * 0.6, top - 5.2, 1.2, PLUME, 6.5);
    px.part();
    px.capsule(hx, top + 3.4, 1.4, hx - 0.4 - pl * 0.2, top + 6.8, 1.1, PLUME, 6.52);      // the tail hanging down the dome's back
  }
  // ---- the head
  px.part();
  px.stamp(vv ? (p.blink ? BLINK : FRONT_H) : BACK_H, hx, hy, LEG, vv ? 8.7 : 6, { ax: 6, ay: 10, ball: [6.5, 6, 7, 7], cast: 2 });

  // ---- the near arm (his right, screen side rs): pauldron, vambrace, the fist on the sword grip; the blade upright
  const rSh = [rs * 5.8 + sx, shY], rEl = [rs * 7.4 + sx, shY + 4.8], rHd = [rs * 7.8 + sx, shY + 9.6 + s * (p.aN[0] - 1.1) * 0.8];
  const wx = rHd[0], sy = rHd[1], tl = rs * 0.07;
  px.part(); px.tag("sword");
  if (vv) {
    px.capsule(wx, sy - 2.5, 1.25, wx + tl * 14, sy - 17, 1.05, BLADE, 8.25, { edge: true });
    px.capsule(wx + tl * 14, sy - 17, 1.05, wx + tl * 17, sy - 19.6, 0.3, BLADE, 8.25, { edge: true });
    px.part();
    px.capsule(wx, sy + 0.8, 0.9, wx, sy - 2.2, 0.9, LEATHER, 8.27);
    px.capsule(wx - 2.8, sy - 2.4, 0.8, wx + 2.8, sy - 2.4, 0.8, BRASS, 8.3, { edge: true });
  } else {   // from behind: the sword carried upright in front; its upper blade peeks over his right shoulder, the rest is hidden behind him
    px.capsule(wx, sy - 2.5, 1.25, wx + tl * 14, sy - 17, 1.05, BLADE, 1.0);
    px.capsule(wx + tl * 14, sy - 17, 1.05, wx + tl * 17, sy - 19.6, 0.3, BLADE, 1.0);
    px.part();
    px.capsule(wx, sy + 0.5, 0.9, wx, sy + 3.2, 0.9, LEATHER, 1.1);
    px.ellipse(wx, sy + 4, 1.1, 1.1, BRASS, 1.12);
  }
  px.tag(null);
  px.part(); px.tag("nearArm");
  px.capsule(rSh[0], rSh[1] + 0.5, 2.2, rEl[0], rEl[1], 2.0, PLATE, vv ? 8 : 4.3, { cast: vv ? 2 : 0 });
  px.capsule(rEl[0], rEl[1], 2.0, rHd[0], rHd[1], 1.8, PLATE, vv ? 8 : 4.3, { cast: vv ? 2 : 0 });
  px.ellipse(rEl[0], rEl[1], 1.7, 1.7, PLATE, vv ? 8.02 : 4.32, { vb: 0.25 });
  px.part(); px.tag(null);
  px.ellipse(rSh[0] + rs * 1.0, rSh[1] + 0.4, 3.2, 2.8, PLATE, vv ? 8.1 : 5.2, vv ? { cast: 2 } : { cast: 1, edge: true });            // pauldrons, both shoulders
  px.ellipse(lSh[0] + ls * 1.0, lSh[1] + 0.4, 3.2, 2.8, PLATE, vv ? 8.1 : 5.2, vv ? { cast: 2 } : { cast: 1, edge: true });
  px.line(rSh[0] + rs - 2.6, rSh[1] + 2.7, rSh[0] + rs + 2.6, rSh[1] + 2.7, BRASS, vv ? 8.12 : 5.22);
  px.line(lSh[0] + ls - 2.6, lSh[1] + 2.7, lSh[0] + ls + 2.6, lSh[1] + 2.7, BRASS, vv ? 8.12 : 5.22);
  px.part(); px.ellipse(rHd[0], rHd[1] + (vv ? 0 : 0.8), vv ? 1.8 : 1.5, vv ? 2.1 : 1.6, MAIL, vv ? 8.6 : 3.6);
  return {};
};

const walk = { ...SIDE.walk };
const BOX = { w: 44, h: 74, ox: 22, oy: 62 };
export const FRONT = { NAME: "errant-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "errant-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
