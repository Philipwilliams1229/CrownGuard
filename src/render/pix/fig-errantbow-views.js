// ============ VIEWS: the Crossbow Company shooter (Errant livery) from the FRONT and from BEHIND ============
// fig-errantbow.js's crossbowman (green quilted gambeson with a dagged skirt, oxblood hood, steel kettle with an
// off-white plume, brass chevron, belt, pouch and dagger, bolt box on the hip) walking toward the camera (FRONT)
// and away from it (BACK). One drawer, `view(s)`: s = +1 front, -1 back. He carries the arbalest across his
// chest, butt at his RIGHT hip (screen LEFT in front, RIGHT from behind: `rs`), nose up toward his left shoulder,
// the right hand at the grip, the left under the fore-end. From behind the stock is hidden by his body: only the
// prod's end shows past the shoulder. Same walk as the side (n, ms, pose); feet / bob read from the solved pose.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-errantbow.js";

const SKIN = mat("#e0b088"), EYE = flat("#2a1c2c"), LIP = flat("#a8685a"), BROW = mat("#4a3426");
const IRON = mat("#727c92", { contrast: 1.25 }), IRONK = mat("#3c4048", { contrast: 1.1 }), STEELB = mat("#c4c8d0", { contrast: 1.3 });
const OX = mat("#474f5e", { contrast: 1.1 }), OXK = mat("#2a3040"), PAD = mat("#2f6b3f", { contrast: 1.15 }), PADK = mat("#1f4a2c"), PLUME = mat("#e8e2d0", { contrast: 1.2 }), LEATHER = mat("#5a3c28"), WOOD = mat("#7a5a38");
const BRASS = mat("#c9a24a", { contrast: 1.2 }), HOSE = mat("#3c4250", { floor: 1 }), BOOT = mat("#2a2a30", { contrast: 1.2, floor: 1 });
const CORD = flat("#e8e0c4"), FLETCH = flat("#f0ead8"), BOLT = mat("#8a6a40");

const LEG = {
  M: { m: IRON }, W: { m: IRON, bias: 1 }, m: { m: IRONK }, c: { m: OX }, d: { m: OXK }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  b: { m: BROW, fix: 1 }, E: { m: EYE }, e: { m: SKIN, fix: 0 }, l: { m: LIP }, T: { m: LEATHER },
};
const fit = (rows) => rows.map((r) => r.padEnd(15, ".").slice(0, 15));
// FRONT: the kettle's dome and wide brim (dark underside), the hood at the cheeks, face, chin strap, coif at the throat. centre col 7.
const FRONT_H = fit([
  ".....MMMMM.....",
  "...MMMMMMMMM...",
  "..MMWWMMMMMMM..",
  ".MMMWMMMMMMMMM.",
  "MMMMMMMMMMMMMMM",
  "mmmmmmmmmmmmmmm",
  "..cSbbSSSbbSc..",
  "..cSSESSSESSc..",
  "..cSSESSSESSc..",
  "..cSSSSNSSSSc..",
  "..cTSSSlSSSTc..",
  "...cTSSSSSTc...",
  "....ccccccc....",
]);
const BLINK = FRONT_H.map((r, i) => (i === 7 ? r.replace(/E/g, "S") : i === 8 ? r.replace(/E/g, "e") : r));
// BACK: the dome with its seam and a rivet, the brim, the hood over the nape with its folds.
const BACK_H = fit([
  ".....MMMMM.....",
  "...MMMMMMMMM...",
  "..MMWWMMMMMMM..",
  ".MMMWMMMMMMMMM.",
  "MMMMMMMMMMMMMMM",
  "mmmmmmmmmmmmmmm",
  "..ccccccccccc..",
  "..ccdccccccdcc.",
  "..cccccdccccc..",
  "..ccdcccccdcc..",
  "...cccccccccc..",
  "....ccdcccc....",
  ".....ccccc.....",
]);

const FWD = 0.4, TAU = Math.PI * 2, cl = (v, a, b) => Math.max(a, Math.min(b, v));

const make = (s) => (px, F) => {
  const rs = -s, ls = s, vv = s > 0;
  const { sk, ph } = F, p = sk.p;
  const sx = rs * 0.5 * Math.sin(ph * TAU), hipY = sk.P[1], chestY = sk.C[1], hy = sk.N[1] + 0.5, hx = Math.round(sx * 0.7);
  const vxs = cl(sk.C[0] - F.lag1.C[0], -2, 2), shY = chestY - 0.4, hem = hipY + 6;
  const bob = Math.cos(ph * TAU * 2) * 0.4;

  // the arbalest carried nose toward us: the prod a clear horizontal steel bow across his lower chest with its
  // string, the stock a short foreshortened wooden block hanging from its middle to his belt. (From behind it
  // is hidden by his body except the prod's ends past his sides.)
  // carried angled DOWN and across the body: butt at the right hip, the nose and prod pointing down and out toward the ground ahead of him
  const gz = vv ? 7 : 3.4, pz = vv ? 8.3 : 3.4;
  const B = [rs * 5.6 + sx, chestY + 11 + bob], T = [ls * 3.6 + sx, hipY + 4.5 + bob];
  const len = Math.hypot(T[0] - B[0], T[1] - B[1]), u = [(T[0] - B[0]) / len, (T[1] - B[1]) / len], w = [u[1], -u[0]];
  const at = (a, b) => [B[0] + u[0] * a + w[0] * b, B[1] + u[1] * a + w[1] * b];
  px.part(); px.tag("stock");
  px.capsule(...at(-1, 0), 1.9, ...at(len * 0.4, 0), 1.5, WOOD, gz, { edge: true });
  px.capsule(...at(len * 0.4, 0), 1.4, ...at(len, 0), 1.1, WOOD, gz, { edge: true });
  px.capsule(...at(len * 0.46, 0), 1.5, ...at(len * 0.56, 0), 1.5, IRON, gz + 0.03);
  px.tag("prod"); px.part();
  const pe = [-1, 1].map((q) => at(len - 1.6, q * 8.8)), pm = [-1, 1].map((q) => at(len - 0.6, q * 4.4));
  px.capsule(...at(len, 0), 1.9, ...pm[0], 1.7, IRON, pz, { edge: true }); px.capsule(...pm[0], 1.7, ...pe[0], 1.0, IRON, pz, { edge: true });
  px.capsule(...at(len, 0), 1.9, ...pm[1], 1.7, IRON, pz, { edge: true }); px.capsule(...pm[1], 1.7, ...pe[1], 1.0, IRON, pz, { edge: true });
  px.dot(...pe[0], STEELB, pz + 0.07, { fix: 3 }); px.dot(...pe[1], STEELB, pz + 0.07, { fix: 3 });
  if (vv) {
    const sp = at(len * 0.5, 0);
    px.line(...pe[0], ...sp, CORD, pz + 0.02, { unlit: true }); px.line(...sp, ...pe[1], CORD, pz + 0.02, { unlit: true });
    px.capsule(...at(len * 0.3, 0), 0.7, ...at(len + 3, 0), 0.5, BOLT, pz + 0.06); px.dot(...at(len + 3.4, 0), STEELB, pz + 0.08, { fix: 3 });
  }
  px.tag(null);

  // ---- legs: hose, boots with the turned cuff. Forward is down the screen in front, up it behind.
  for (const [f, side, z] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lift = f[1], fx = hx + side * 2.9, fy = -2.4 + s * f[0] * FWD - lift * 0.9, b = side === rs ? 0 : -1;
    const hp = [hx + side * 2.2, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.5, (hp[1] + fy) / 2 - lift * 0.5];
    px.part();
    px.capsule(hp[0], hp[1], 2.5, kn[0], kn[1], 2.1, HOSE, z + lift * 0.05, { bias: b, floor: 1 });
    px.capsule(kn[0], kn[1], 2.0, fx, fy - 2.4, 1.7, HOSE, z + lift * 0.05, { bias: b, floor: 1 });
    px.capsule(kn[0] * 0.4 + fx * 0.6, kn[1] * 0.4 + (fy - 2.4) * 0.6, 2.1, fx, fy, 1.9, BOOT, z + lift * 0.05 + 0.02, { bias: b, floor: 1 });
    px.rect(fx - 2, fy - 5.4, 4, 1, LEATHER, z + lift * 0.05 + 0.04, { fix: 2, noLine: true });
    px.part();
    if (vv) px.ellipse(fx, fy + 1.1, 2.6, 1.5, BOOT, z + 0.4 + lift * 0.05, { bias: b, floor: 1 });
    else {
      px.ellipse(fx, fy + 0.8, 2.1, 1.4, BOOT, z + 0.4 + lift * 0.05, { bias: b, floor: 1 });
      if (lift > 0.8) px.ellipse(fx, fy + 2.4, 1.8, 1.6 * cl(lift / 2.4, 0.3, 1), BOOT, z + 0.45, { bias: -2, floor: 1 });
    }
  }

  // ---- the bolt box on the hip (behind in front view, plain to see from behind), fletchings standing out
  px.part();
  { const bx = rs * 0.5 * 0 + (vv ? ls * 6.2 : ls * 3.2) + sx, by = hipY - 0.4, bz = vv ? 3.5 : 4.4;
    px.poly([[bx - 2.4, by - 3], [bx + 2.4, by - 3], [bx + 2.8, by + 3.6], [bx - 2.8, by + 3.6]], LEATHER, bz, { round: 0.8, cast: 1 });
    px.rect(bx - 2.4, by - 0.6, 4.8, 0.9, BRASS, bz + 0.02, { noLine: true });
    for (const [dx, h] of [[-1.5, 3.4], [0.2, 4.6], [1.7, 3.8]]) { px.line(bx + dx, by - 3, bx + dx, by - 3 - h, BOLT, bz - 0.05, { noLine: true }); px.dot(bx + dx, by - 3 - h, FLETCH, bz - 0.04, { fix: 3 }); } }

  // ---- the gambeson: quilted padding to the hip, a dagged skirt, rows of stitches
  px.part(); const jk = px._pid;
  const dg = [[sx + 5.8, hem - 0.4], [sx + 3.9, hem + 1.8], [sx + 1.9, hem - 0.2], [sx - 0.1, hem + 1.8], [sx - 2.1, hem - 0.2], [sx - 4.1, hem + 1.8], [sx - 5.8, hem - 0.4]];
  px.poly([[sx - 5, chestY - 2.4], [sx + 5, chestY - 2.4], [sx + 5.8, chestY + 3], [sx + 5, hipY - 1], ...dg, [sx - 5, hipY - 1], [sx - 5.8, chestY + 3]], PAD, 4, { round: 0.92, cast: 2 });
  px.toneLine(sx - 3.8, hipY - 2, sx - 4.2, hem - 1.5, -1, jk);
  for (let i = 0; i < 4; i++) { const y = chestY + 0.6 + i * 2.6; px.line(sx - 4.4, y, sx + 4.4, y, PADK, 4.04, { noLine: true }); }
  px.line(sx - 5.4, hem - 1.8, sx + 5.4, hem - 1.8, PADK, 4.04, { noLine: true });
  px.part();
  if (vv) {
    px.line(sx - 3.4, chestY + 1.4, sx, chestY + 4.2, BRASS, 4.1); px.line(sx, chestY + 4.2, sx + 3.4, chestY + 1.4, BRASS, 4.1);   // the chevron
    px.line(sx, chestY - 1.8, sx, hipY - 3, PADK, 4.06);                                                                                   // the front seam
  } else {
    px.toneLine(sx + 0.3, chestY - 1.5, sx, hipY - 2, -1, jk);
    px.rect(sx - 3.8, chestY + 5.2, 2.6, 2.6, OXK, 4.08, { fix: 1, noLine: true });                                                        // a sewn mend
  }
  px.part();
  px.poly([[sx - 5.1, hipY - 4.4], [sx + 5.1, hipY - 4.4], [sx + 5.2, hipY - 2.6], [sx - 5.2, hipY - 2.6]], LEATHER, 4.05, { round: 0.92 });
  px.part();
  if (vv) { px.rect(sx - 1, hipY - 4.4, 2, 2, BRASS, 4.06, { fix: 3 }); px.rect(sx + 2.4, hipY - 2.8, 3.2, 3.4, LEATHER, 4.1, { cast: 1 }); px.dot(sx + 4, hipY - 2.2, BRASS, 4.11, { fix: 3 }); px.line(sx - 3, hipY - 2.4, sx - 3.6, hipY + 3, IRON, 4.1, { noLine: true }); }
  else { px.rect(sx - 1, hipY - 4.4, 2, 2, BRASS, 4.06, { fix: 3 }); px.line(sx + 3, hipY - 2.4, sx + 3.4, hipY + 3, IRON, 4.1, { noLine: true }); px.dot(sx + 3, hipY - 2.6, BRASS, 4.12, { fix: 3 }); }
  px.part();   // the hood on the shoulders
  px.poly([[sx - 5.8, chestY - 3.6], [sx + 5.8, chestY - 3.6], [sx + 6.4, chestY + 0.8], [sx + 1.8, chestY + 2.6], [sx - 1.8, chestY + 2.6], [sx - 6.4, chestY + 0.8]], OX, 5, { round: 0.9, cast: 1 });

  // ---- the plume rooted on the crown: behind the dome in front, falling over its back from behind; the brass boss
  const pl = cl(vxs * 2 + (F.lag1.C[0] - F.lag2.C[0]) * 1.5, -3, 3) * 0.8, top = hy - 12;
  px.part();
  if (vv) {
    px.capsule(hx + 0.4, top + 3, 1.5, hx + 1 + pl * 0.2, top - 2, 1.8, PLUME, 5.2);
    px.capsule(hx + 1 + pl * 0.2, top - 2, 1.8, hx + 2.6 + pl * 0.5, top - 5, 1.0, PLUME, 5.2);
  } else {
    px.capsule(hx, top + 3.4, 1.7, hx + pl * 0.3, top - 1.4, 2.0, PLUME, 6.5);
    px.capsule(hx + pl * 0.3, top - 1.4, 2.0, hx + 0.6 + pl * 0.6, top - 5, 1.1, PLUME, 6.5);
    px.part(); px.capsule(hx, top + 3.4, 1.4, hx - 0.4 - pl * 0.2, top + 6.4, 1.1, PLUME, 6.52);
  }
  px.part();
  px.stamp(vv ? (p.blink ? BLINK : FRONT_H) : BACK_H, hx, hy, LEG, 6, { ax: 7, ay: 12, ball: [8, 6, 8, 7], cast: 2 });
  px.part(); px.dot(hx + (vv ? 0 : 0), hy - 12, BRASS, 6.2, { fix: 3 });

  // ---- the arms. FRONT: both hands on the arbalest (right on the stock below the prod, left under the prod). BEHIND: both
  // hang at his sides, swinging forward (the back of each arm, the hand low and a little in).
  const sw = Math.cos(ph * TAU) * 0.45;
  const aR = [[rs * 5.4 + sx, shY], [rs * 7.6 + sx, shY + 6], vv ? at(len * 0.16, 0) : [rs * 7 + sx, shY + 11 - sw * 1.6]];
  const aL = [[ls * 5.4 + sx, shY], [ls * 7.6 + sx, shY + 5.4], vv ? at(len * 0.62, 0) : [ls * 7 + sx, shY + 11 + sw * 1.6]];
  for (const arm of [aL, aR]) {
    px.part(); px.tag("arm");
    px.capsule(arm[0][0], arm[0][1] + 0.3, 2.2, arm[1][0], arm[1][1], 1.9, PAD, 8, { cast: 2 });
    px.capsule(arm[1][0], arm[1][1], 1.9, arm[2][0], arm[2][1], 1.6, PADK, 8.1, { cast: 2 });
    px.part(); px.ellipse(arm[2][0], arm[2][1], 1.7, 1.7, SKIN, 8.6); px.tag(null);
  }
  return {};
};

const walk = { ...SIDE.walk };
const BOX = { w: 44, h: 94, ox: 22, oy: 80 };
export const FRONT = { NAME: "errantbow-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "errantbow-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
