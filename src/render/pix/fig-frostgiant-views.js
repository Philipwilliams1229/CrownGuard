// ============ VIEWS: the Frost Giant seen from the FRONT and from BEHIND ============
// fig-frostgiant.js (blue-grey hide, the shaggy frost-white mane and forked beard, a heavy brow over cold
// pale eyes, the dingy-white fur mantle with rime on it, a hide kilt hemmed in fur, iron cuffs, big bare feet
// bound in fur, the whale's jawbone dragged crusted with ice) walking toward the camera (FRONT, s = +1) and
// away from it (BACK, s = -1), unmirrored, sun upper left. His RIGHT fist holds the jawbone (screen LEFT in
// front, RIGHT behind): it trails behind him on the ground, so from the front only its heavy end peeks out
// by his foot, and from behind its ice-crusted end lies near us beside his heel. One body (the joint kit).
// A slow heavy tread: a wide roll over the planted foot, the long arms swinging a little.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-frostgiant.js";
import { carry } from "./carry.js";

const SKIN = mat("#7f93ab"), BELLY = mat("#93a7be"), KILT = mat("#5e4a3a"), KILT_D = mat("#43362c"), FUR = mat("#c6c6bc"), FURB = mat("#8a7860"), HAIR = mat("#e6eef2");
const IRON = mat("#6a727e", { contrast: 1.2 }), BONE = mat("#e6dcc4"), BONE_D = mat("#b4a888"), ICE = mat("#cfe9f6", { contrast: 1.2 }), NAIL = mat("#c8c2a0");
const EYE = flat("#bfe8ff", { emis: true }), GLINT = flat("#ffffff", { emis: true }), MOUTH = flat("#241a2c"), FROST = flat("#eaf6ff");
const LEG = {
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, Y: { m: EYE }, E: { m: GLINT },
  N: { m: SKIN, fix: 3 }, L: { m: SKIN, fix: 4 }, n: { m: SKIN, fix: 0 }, X: { m: MOUTH },
  H: { m: HAIR }, h: { m: HAIR, bias: -1 }, W: { m: HAIR, fix: 3 }, w: { m: HAIR, fix: 2 },
};
const fit = (rows) => rows.map((r) => r.padEnd(17, ".").slice(0, 17));
// FRONT: the mane round the crown and cheeks, a ridge of brow over cold eyes, the bulb of nose, the forked beard.
const FRONT_H = fit([
  ".....HHHHHHH.....",
  "...HHHHHHHHHHH...",
  "..HHHHHHHHHHHHH..",
  ".HHHGGGGGGGGGHHH.",
  ".HHGGGGGGGGGGGHH.",
  ".HHGBBBBGBBBBGHH.",
  ".HHGGYEGGGEYGGHH.",
  ".HHGGGNNLNNGGGHH.",
  ".HHGGGnNNNnGGGHH.",
  ".HHGGGGGGGGGGGHH.",
  ".HHhWWWWWWWWWhHH.",
  ".hhWWWWXXXWWWWhh.",
  "..hhWWWWWWWWWhh..",
  "...hWWWWWWWWWh...",
  "....hWWWWWWWh....",
  "....wWWW.WWWw....",
]);
const blinkOf = (rows) => rows.map((r, i) => (i === 6 ? ".HHGGGGGGGGGGGGHH.".slice(0, 17) : i === 5 ? ".HHGGGGGGGGGGGGHH.".slice(0, 17).replace(/G/g, "G") : r));
// BACK: the great shaggy mane with its streaks, matted at the nape; the beard's side tufts out past the jaw.
const BACK_H = fit([
  ".....HHHHHHH.....",
  "...HHHHHHHHHHH...",
  "..HHHhHHHHHhHHH..",
  ".HHHHHHHhHHHHHHH.",
  ".HHhHHHHHHHHHhHH.",
  ".HHHHHhHHHHHHHHH.",
  ".HHHHHHHHHhHHHHH.",
  ".HhHHHHHHHHHHHhH.",
  "WHHHhHHHHHhHHHHHW",
  "WWHHHHHHHHHHHHHWW",
  ".WHHHHhHHHHhHHHW.",
  "..hHHHHHHHHHHHh..",
  "...hhHHHhHHHhh...",
  "....hhHHHHHhh....",
  ".....hhhHhhh.....",
]);

const FWD = 0.6, cl = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const make = (s) => (px, F) => {
  const rs = -s, ls = s;                                          // screen side of his right (jawbone) and left
  const { sk, ph } = F, p = sk.p;
  const sw = (t) => rs * 2 * Math.sin(t * TAU);                  // a wide, heavy roll over the planted foot
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const hipY = sk.P[1], chestY = sk.C[1] + 1, hy = sk.N[1] + 0.5, hx = Math.round(sx * 0.6);
  const vy = cl(sk.N[1] - F.lag1.N[1], -3, 3), vy2 = cl(F.lag1.N[1] - F.lag2.N[1], -3, 3);
  const vx = cl((sx - sx1) * 1.4, -3, 3), vx2 = cl((sx1 - sx2) * 1.4, -3, 3);
  const c0 = chestY - 6;

  // ---- the far arm (his left), a tone down: it hangs to the knee; iron cuff, a ham of a fist
  const arm = (side, ang, near, z) => {
    const b = near ? 0 : -1, sh = [sx + side * 11.6, c0 + 6.4], hd = [sx + side * 17, (near ? sk.hdN[1] : sk.hdF[1]) + 0.6], el = [sx + side * 16, (sh[1] + hd[1]) / 2 - 1];
    px.body(1);
    if (s < 0) { px.limb([sh, el, hd], [6.2, 5, 5.4], SKIN, 4.3, { cast: 0 }); px.capsule(mix(el, hd, 0.7)[0], mix(el, hd, 0.7)[1], 5.2, hd[0], hd[1], 5.2, IRON, 4.35, { floor: 1 }); px.body(0); return { sh, hd }; }
    px.limb([sh, el, hd], [6.2, 5, 5.4], SKIN, z, { bias: b, weld: near ? 4 : 0, weldRoot: near ? 9 : 0 });
    const wc = mix(el, hd, 0.7);
    px.capsule(wc[0], wc[1], 5.2, hd[0], hd[1], 5.2, IRON, z + 0.05, { bias: b, floor: 1 });
    px.body(0);
    return { sh, hd };
  };
  const fa = arm(ls, p.aF[0], false, 3.5);
  px.body(1); px.ellipse(fa.hd[0], fa.hd[1] + 0.4, 4.8, 4.4, SKIN, 3.6, s > 0 ? { bias: -1 } : {}); px.body(0);

  // ---- two legs like pillars, bare feet bound in fur; the stepping foot comes toward us (front) / away (back)
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]];
  px.body(1);
  for (const [f, side, z] of feet) {
    const lift = f[1], b = side === rs ? 0 : -1, fx = hx + side * 8, fy = -2.4 + s * f[0] * FWD - lift * 0.9;
    const hp = [hx + side * 6.6, hipY + 1], kn = [hx + side * 9, (hp[1] + fy) / 2 - lift * 0.4];
    px.limb([hp, kn, [fx, fy]], [6.4, 5, 4.2], SKIN, z, { bias: b });
    const w0 = mix(kn, [fx, fy], 0.5);
    if (s < 0) px.capsule(w0[0], w0[1], 5, fx, fy, 4.6, FURB, z + 0.03, { bias: b, wrap: true });
  }
  px.body(0);
  for (const [f, side, z] of feet) {
    const lift = f[1], b = side === rs ? 0 : -1, fx = hx + side * 8, fy = -2.4 + s * f[0] * FWD - lift * 0.9;
    px.part();
    if (s > 0) {
      // one clean fur-bound foot joined to the shin: a single fur shape over the ankle, the bare toes in front of it
      // (the lifted foot, foreshortened, still shows its toes and the top of the foot)
      px.ellipse(fx, fy + 0.2, 4.8, 3.2, FURB, z + 0.4 + lift * 0.05, { round: 0.6 });
      px.ellipse(fx, fy + 3, 4.6, 1.9, SKIN, z + 0.45 + lift * 0.05, { round: 0.6 });
      for (const x of [-3, -1, 1, 3]) px.dot(fx + x, fy + 3.8, NAIL, z + 0.5 + lift * 0.05, { fix: 3 });
    } else {
      px.ellipse(fx, fy + 1, 5, 3, SKIN, z + 0.4 + lift * 0.05, { bias: b });
      px.capsule(fx - 4.4, fy + 0.4, 1.6, fx + 4.4, fy + 0.4, 1.6, FURB, z + 0.42, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 3.2, 4.6, 2.2 * cl(lift / 2.4, 0.3, 1), SKIN, z + 0.45, { bias: -2 });
    }
  }

  // ---- the hide kilt, its ragged hem hung with fur, a beat behind the hips
  const kh = hipY + 10, sh2 = -vx * 1.2 - vx2 * 0.8, kl = hx - 11.4 + sh2, kr = hx + 11.4 + sh2, km = (t) => kl + (kr - kl) * t;
  px.part(); const kiltId = px._pid;
  px.poly([[hx - 10.6, hipY - 2], [hx + 10.8, hipY - 2], [kr, kh - 1.6], [km(0.9), kh + 1.4], [km(0.78), kh - 1], [km(0.62), kh + 2.2], [km(0.48), kh - 0.4], [km(0.32), kh + 1.8], [km(0.16), kh - 0.6], [kl, kh - 2.4]], KILT, 3.6, { round: 0.85, cast: 1 });
  px.toneLine(hx + 3, hipY + 1, km(0.66), kh - 1, -1, kiltId);
  px.toneLine(hx - 4, hipY + 1, km(0.3), kh - 1.4, -1, kiltId);
  for (const t of [0.12, 0.26, 0.42, 0.58, 0.74, 0.88]) px.dot(km(t), kh + 0.8 + (t * 10 % 2), FURB, 3.65, { fix: 3 });

  // ---- the trunk: a broad barrel of chest under a hump of shoulder
  px.body(1); const BID = px._pid;
  px.poly([[sx - 14, c0 + 4], [sx - 10, c0 - 2], [sx + 10, c0 - 2], [sx + 14, c0 + 4], [sx + 14.6, c0 + 12], [hx + 13, (c0 + hipY) / 2 + 2], [hx + 11, hipY - 6], [hx + 10, hipY + 0.6], [hx - 10, hipY + 0.6], [hx - 11, hipY - 6], [hx - 13, (c0 + hipY) / 2 + 2], [sx - 14.6, c0 + 12]], SKIN, 4, { round: 0.92 });
  if (s > 0) {
    const bl = [hx + sx * 0.2, hipY - 8];
    px.ellipse(bl[0], bl[1], 10.6, 8.6, BELLY, 4.05, { wrap: true });
    px.dot(bl[0] + 1, bl[1] + 2, SKIN, 4.06, { fix: 0 });
    px.toneLine(bl[0] - 7, bl[1] + 7.6, bl[0] + 7, bl[1] + 7.8, -1, BID);
    px.toneLine(sx - 3, c0 + 13, sx - 11, c0 + 11.6, -1, BID); px.toneLine(sx + 3, c0 + 13, sx + 11, c0 + 11.6, -1, BID);
  } else {
    px.ellipse(sx, c0 + 6, 13, 9.4, SKIN, 4.05, { weld: 4 });
    px.toneLine(sx - 6, c0 + 2, sx + 6, c0 + 1.6, 1, BID);
    px.toneLine(sx, c0 + 4, hx, hipY - 6, -1, BID);
    px.toneLine(hx - 8, hipY - 10, hx + 8, hipY - 10, -1, BID);
  }
  px.body(0);
  px.part();
  px.capsule(hx - 10.4, hipY - 1.6, 1.4, hx + 10.6, hipY - 1.4, 1.4, KILT_D, 4.08);
  if (s > 0) { px.rect(hx - 1.6, hipY - 4, 3, 4.4, BONE, 4.12, { fix: 3 }); px.dot(hx - 0.6, hipY - 2.6, KILT_D, 4.14, { fix: 1 }); }
  else px.dot(hx, hipY - 2.6, BONE, 4.12, { fix: 3 });

  // ---- the head, sunk between the shoulders; from the front the beard braid hangs, from behind the mane
  const sway = cl(vx * 1.8 + vx2 * 1.4, -3, 3.5), hop = cl(vy * 1.4 + vy2, -2.5, 2.5);
  if (s > 0) {
    px.part();
    px.capsule(hx + 1, hy + 9, 2.6, hx + 1 - sway * 0.3, hy + 14.6 - hop * 0.3, 2.4, HAIR, 5.2);
    px.dot(hx + 1 - sway * 0.5, hy + 17, ICE, 5.3, { fix: 3 });
  }
  px.part();
  px.stamp(s > 0 ? (p.blink ? blinkOf(FRONT_H) : FRONT_H) : BACK_H, hx, hy, LEG, 6, { ax: 8, ay: 13, ball: [8.5, 8, 9, 9], cast: 1 });
  if (s > 0) for (const [x, y] of [[-2, -8.6], [2, -9.2], [-5.6, -7.8], [5.6, -7.8]]) px.dot(hx + x, hy + y, FROST, 6.2, { noLine: true });
  px.part();
  px.dot(hx - 3, hy + 3.4, ICE, 6.3, { fix: 3 }); px.dot(hx + 4, hy + (s > 0 ? 2 : -2), ICE, 6.3, { fix: 3 });
  px.capsule(hx - 8.4, hy - 9, 1.5, hx - 11 - sway * 0.6, hy - 5, 1.1, HAIR, 6.15);       // tufts of mane flicking out
  px.capsule(hx + 8.4, hy - 9, 1.5, hx + 11 - sway * 0.6, hy - 5, 1.1, HAIR, 6.15);

  // ---- the mantle: a huge shaggy fur across the shoulders, rime on it; knuckle-bones across the chest (front)
  px.part();
  const mz = s > 0 ? 4.4 : 5.2;
  px.ellipse(sx, c0 + 3.6, 14.8, 6.6, FUR, mz, { cast: 1 });
  for (const x of [-13, -10, -7, -4, -1, 2, 5, 8, 11, 13]) px.dot(sx + x, c0 + 9 - Math.abs(x) * 0.12 + ((x & 1) ? 1 : 0), FUR, mz);
  for (const x of [-11, -6, 0, 6, 11]) px.dot(sx + x, c0 + 10.8 + (x & 1), FURB, mz + 0.02, { fix: 2 });
  for (const [x, y] of [[-9, 1], [-4, 0], [2, 0.4], [7, 2], [11, 5]]) px.dot(sx + x, c0 + y, FROST, mz + 0.06, { noLine: true });
  if (s > 0) {
    px.part();
    for (let i = 0; i <= 6; i++) { const t = i / 6, x = sx - 7 + t * 14, y = c0 + 10 + 3.4 * (1 - (2 * t - 1) ** 2); px.dot(x, y, i % 2 ? BONE : KILT_D, 4.5, { fix: i % 2 ? 3 : 1 }); }
  }

  // ---- the jawbone: ONE pose (carry.js). The side walk holds it at a = -1.9 rad (measured: 109 degrees behind the fist, its heavy
  // end on the ground behind him): truly dragged. From the front it lies away from us, under his legs, its end clamped to the
  // ground and splayed outboard so it reads; from behind its heavy end comes toward us down to the ground by his heel.
  const near = arm(rs, p.aN[0], true, 7.9);
  const C = carry(-1.9, s, { rs, hand: near.hd, len: 29, butt: 4, K: 0.5, splay: 0.3, maxSplay: 0.6, floorY: -2.4 });
  const zJ = s > 0 ? C.zTip : 3.5, pr = [-C.dir[1], C.dir[0]];
  // FRONT: the end is splayed outboard (toward his weapon hand's side) and lies on the ground, 5 px or so past his leg's outline
  const E = [near.hd[0] + rs * 4.5, -3.4], hd0 = near.hd;
  const A = s > 0 ? (f, o = 0) => { const t = (f + 4) / 31; return [hd0[0] + (E[0] - hd0[0]) * t, hd0[1] + (E[1] - hd0[1]) * t + o * 0.2]; } : (f, o = 0) => C.at(f, rs * o);
  const TIP = s > 0 ? [E[0], E[1] - 0.6] : C.at(27, 0);
  px.part(); const cid = px._pid;
  px.capsule(...A(-4), 1.8, ...A(14), 2.3, BONE, zJ, { edge: s > 0 });
  px.capsule(...A(14), 2.4, ...A(27), 3.6, BONE, zJ, { edge: s > 0 });
  px.ellipse(TIP[0] + (s > 0 ? rs * 2 : C.dir[0] * 3), TIP[1] + (s > 0 ? 0 : C.dir[1] * 3), 4.8, 4, BONE, zJ + 0.05, { edge: s > 0 });
  for (const f of [16, 19, 22]) px.dot(...A(f, 0.4), BONE_D, zJ + 0.07, { fix: 0 });
  px.part();
  px.poly([[TIP[0] - 4, TIP[1] - 3.4], [TIP[0] + 1, TIP[1] - 5], [TIP[0] + 5.6, TIP[1] - 3], [TIP[0] + 5.2, TIP[1] + 0.6], [TIP[0] - 2, TIP[1] + 0.8]], ICE, zJ + 0.1, { fix: 3 });
  px.dot(TIP[0] - 1, TIP[1] - 3.6, FROST, zJ + 0.12, { noLine: true });
  const fx0 = near.hd;
  // the near fist and the ice crystals on his right shoulder
  px.part();
  px.body(1); if (s > 0) px.ellipse(near.hd[0], near.hd[1] + 0.4, 5.2, 4.8, SKIN, 8.3, { weld: 3 }); else px.ellipse(near.hd[0], near.hd[1] + 0.8, 4.6, 4.2, SKIN, 3.7); px.body(0);
  const sh = near.sh;
  px.part();
  px.ellipse(fa.sh[0] + ls * 0.6, fa.sh[1] - 0.4, 7.6, 6.4, FUR, 5.5, { cast: 1 });
  for (const x of [-5, -2, 1, 4]) px.dot(fa.sh[0] + x, fa.sh[1] + 5.8 + ((x & 1)), FUR, 5.5);
  px.part();
  px.ellipse(sh[0] - rs * 0.6, sh[1] - 0.4, 8.6, 7, FUR, 5.5, { cast: 1 });
  for (const x of [-6, -3, 0, 3, 6]) px.dot(sh[0] + x, sh[1] + 6.4 + ((x & 1)), FUR, 5.5);
  for (const [x, y] of [[-4.6, -3.6], [-1, -4.6], [2.4, -3.6]]) px.dot(sh[0] + x, sh[1] + y, FROST, 8.05, { noLine: true });
  px.poly([[sh[0] + rs * 2.4, sh[1] - 4], [sh[0] + rs * 4.6, sh[1] - 3], [sh[0] + rs * 8.4, sh[1] - 8.4]], ICE, 8.1, { fix: 3 });
  px.poly([[sh[0] + rs * 4, sh[1] - 2.6], [sh[0] + rs * 6.4, sh[1] - 1], [sh[0] + rs * 10.6, sh[1] - 4]], ICE, 8.1, { fix: 2 });
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "frostgiant-front", BOX: { w: 100, h: 116, ox: 50, oy: 108 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "frostgiant-back", BOX: { w: 100, h: 116, ox: 50, oy: 108 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
