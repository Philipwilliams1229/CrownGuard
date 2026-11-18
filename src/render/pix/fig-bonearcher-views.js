// ============ the Barrow Archer seen from the FRONT and from BEHIND ============
// Same figure as fig-bonearcher.js: the Risen's drowned bones under a grey-green cowl and a ragged mantle,
// a bone-fletched quiver on his back, a yew bow in the LEFT (far) hand, the string frayed white. FRONT (s = +1)
// walks toward the camera: the skull under the cowl (teal sockets), the mantle's points on his shoulders, the
// quiver's strap across the chest and its fletching over his right shoulder (screen LEFT), the bow upright
// in his left hand (screen RIGHT). BACK (s = -1): the cowl with a seam and its long point down the back, the
// mantle, the quiver slung across it (shafts over his right shoulder, screen RIGHT), the bow on screen LEFT.
// Unflipped, sun upper left. Walk = the side walk's n / ms / pose; feet and bob from the solved skeleton.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-bonearcher.js";
import { carry, damp } from "./carry.js";

const BONE = mat("#e0d8c4"), RAG = mat("#4a5a50", { contrast: 0.9 }), RAG2 = mat("#3a4640", { contrast: 0.9 });
const YEW = mat("#4a3018", { contrast: 1.2 }), GRIP = mat("#6a4c34"), DARKM = mat("#3a3228"), IRON = mat("#9a968a", { contrast: 1.2 });
const GAP = flat("#6a604c"), SOCK = flat("#15121a"), EYE = flat("#7ce0b8", { emis: true });
const STRING = flat("#e8e2cc", { line: "#6a604c" });
const FLETCH = mat("#cfcab4");
const LEG = { S: { m: BONE }, s: { m: BONE, bias: -1 }, T: { m: BONE, fix: 3 }, j: { m: BONE, fix: 1 }, N: { m: BONE, fix: 1 }, e: { m: SOCK }, E: { m: EYE },
  K: { m: RAG }, k: { m: RAG, bias: -1 }, d: { m: RAG2 }, c: { m: RAG2, fix: 0 } };

// FRONT head, 13 wide (centre column 6), 13 tall: the cowl round the skull's face.
const FRONT_H = [
  "....KKKKK....",
  "...KKKKKKK...",
  "..KKKKKKKKK..",
  ".KKKkkkkkKKK.",
  ".KKSSSSSSSKK.",
  ".KkSeeSeeSkK.",
  ".KkSeEsEeSkK.",
  ".KkSsSNSsSkK.",
  ".KKsSSNSSsKK.",
  ".KKsTjTjTsKK.",
  "..KKjTjTjKK..",
  "..kKKjjjKKk..",
  "...kkKKKkk...",
];
const BLINK = FRONT_H.map((r, i) => (i === 6 ? ".KkSeeSeeSkK." : r));
// BACK head: the cowl from behind, a seam down it, a patch, the long point.
const BACK_H = [
  "....KKKKK....",
  "...KKKKKKK...",
  "..KKKKcKKKK..",
  ".KKKKKcKKKKK.",
  ".KKKKKcKKKkK.",
  ".KKKKKcKdddK.",
  ".KKKKKcKdddK.",
  ".KKKKKcKKKKK.",
  ".kKKKKcKKKKk.",
  "..kKKKcKKKk..",
  "..kkKKKKKkk..",
  "...kkKKKkk...",
  ".....kkk.....",
];
const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

const make = (s) => (px, F, o = {}) => {
  const rs = -s, ls = s;                                     // screen side of his right (string hand) and left (bow)
  const { sk, ph } = F, p = sk.p;
  const sx = rs * 0.7 * Math.sin(ph * TAU), hx = Math.round(sx);
  const chestY = sk.C[1], hipY = sk.P[1], hy = Math.round(sk.N[1]) - 1;
  const vx = cl((sx - rs * 0.7 * Math.sin((ph - 0.09) * TAU)) * 1.3, -2, 2), vx2 = cl(vx * 0.7, -2, 2);
  const a = Math.cos(ph * TAU);
  const top = chestY - 1, bot = chestY + 7.4;

  // ---- the bow, upright in his left fist (screen side ls): limbs sprung from the grip, a frayed string
  const hand = [ls * 7.2 + sx, chestY + 9 - a * 0.5 * s];
  const B = s < 0, bz = B ? 1.0 : 7.2, ZA = B ? 4.3 : bz - 0.2, ZF = B ? 3.6 : bz + 0.1, bxo = B ? ls * 1.5 : 0;     // BACK: the bow behind him at z 1.0, 1.5 px outboard of the fist
  // ONE pose (carry.js): the side walk's bow tilt (p.bow ~0.42-0.58 rad, top toward the foe, damped round 0.5) with the fist at the
  // side view's bow-hand height; FRONT leans the top toward us, BACK away from us. Limbs 12 each side of the grip.
  const C = carry(damp(p.bow ?? 0.5, 0.5), s, { rs: ls, hand: [hand[0] + bxo, sk.hdF[1] + (B ? 0.4 : 0)], len: 12, butt: 12 });
  const gx = C.at(0);
  const bp = (f, sc = 0) => C.at(f, ls * sc);
  const limb = (sg) => {
    const g = bp(sg * 1.8), m = bp(sg * 6.4, 0.5), e = bp(sg * 12, -0.8);
    px.capsule(g[0], g[1], 1.2, m[0], m[1], 0.95, YEW, bz, B ? { cast: 0 } : {});
    px.capsule(m[0], m[1], 0.95, e[0], e[1], 0.6, YEW, bz, B ? { cast: 0 } : {});
  };
  px.part(); limb(1); px.part(); limb(-1);
  px.part();
  { const t0 = bp(12, -0.8), t1 = bp(-12, -0.8); px.line(t0[0], t0[1], t1[0], t1[1], STRING, bz - 0.05, { unlit: true }); }
  px.part();
  { const g0 = bp(-1.8), g1 = bp(1.8); px.capsule(g0[0], g0[1], 1.3, g1[0], g1[1], 1.3, GRIP, bz + 0.05, B ? { cast: 0 } : {}); }
  // the bow arm
  const elb = [ls * 6.8 + sx, chestY + 4.6];
  px.part();
  px.capsule(ls * 6.2 + sx, chestY + 1, 1.15, elb[0], elb[1], 1, BONE, ZA, B ? { cast: 0 } : { bias: -1 });
  px.capsule(elb[0], elb[1], 1, hand[0], hand[1], 0.9, BONE, ZA, B ? { cast: 0 } : { bias: -1 });
  px.ellipse(elb[0], elb[1], 1.3, 1.2, BONE, ZA + 0.05, B ? { cast: 0 } : { bias: -1 });
  px.part(); px.ellipse(hand[0], hand[1] + (B ? 0.4 : 0), B ? 1.4 : 1.5, B ? 1.3 : 1.4, BONE, ZF, B ? { cast: 0 } : { bias: -1 });

  // ---- legs
  for (const [f, side, z] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lift = f[1], fx = hx + side * 2.6, fy = -1.9 + s * f[0] * FWD - lift * 0.9;
    const hp = [hx + side * 2, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 1, (hp[1] + fy) / 2 - lift * 0.4];
    const b = side === rs ? 0 : -1;
    px.part();
    px.capsule(hp[0], hp[1], 1.1, kn[0], kn[1], 0.9, BONE, z + lift * 0.05, { bias: b });
    px.capsule(kn[0], kn[1], 0.9, fx, fy, 0.8, BONE, z + lift * 0.05, { bias: b });
    px.ellipse(kn[0], kn[1], 1.4, 1.3, BONE, z + 0.02 + lift * 0.05, { bias: b });
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.2, fy + 0.9, 1.5, 1.1, BONE, z + 0.3 + lift * 0.05, { bias: b });
    else {
      px.ellipse(fx, fy + 0.7, 1.3, 1, BONE, z + 0.3 + lift * 0.05, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 2.2, 1.1, 1.4, BONE, z + 0.35, { bias: -2 });
    }
  }

  // ---- pelvis and the tattered clout
  px.part();
  px.ellipse(hx, hipY - 0.6, 4.3, 2.3, BONE, 4, { floor: 1 });
  px.part();
  px.poly([[hx - 4.6, hipY - 1.4], [hx + 4.6, hipY - 1.4], [hx + 4.6, hipY + 4.2], [hx + 2.8, hipY + 3.2], [hx + 1.6, hipY + 5.6], [hx + 0.2, hipY + 3.4], [hx - 1.2, hipY + 5.8], [hx - 2.6, hipY + 3.2], [hx - 3.4, hipY + 4.6], [hx - 4.8 - vx, hipY + 3.4]], RAG2, s > 0 ? 4.5 : 5.0, { round: 0.8, floor: 1, edge: s < 0 });

  // ---- spine, ribs
  px.part();
  px.capsule(sx + 0.2, top + 2, 0.9, hx, hipY - 1, 0.95, BONE, s > 0 ? 3.9 : 4.0, { bias: -1 });
  px.part();
  const rw = 4.1;
  px.poly([[sx - rw, top + 1.4], [sx + rw, top + 1.4], [sx + rw + 0.4, top + 4], [sx + rw - 0.8, bot - 0.6], [sx + 1, bot], [sx - 1, bot], [sx - rw + 0.8, bot - 0.6], [sx - rw - 0.4, top + 4]], BONE, s > 0 ? 4.1 : 4.0, { round: 0.7, floor: 1 });
  if (s > 0) {
    for (const t of [2.4, 4.2, 6]) { px.line(sx - rw + 0.8, top + t, sx - 0.8, top + t + 0.8, GAP, 4.2); px.line(sx + rw - 0.8, top + t, sx + 0.8, top + t + 0.8, GAP, 4.2); }
    px.line(sx, top + 1.6, sx, bot - 0.4, BONE, 4.25, { fix: 3 });
  } else {
    for (let t = 2.2; t < 7; t += 1.7) { px.line(sx - rw + 0.8, top + t - 0.6, sx - 0.8, top + t + 0.4, GAP, 4.2); px.line(sx + rw - 0.8, top + t - 0.6, sx + 0.8, top + t + 0.4, GAP, 4.2); }
  }
  px.part();
  px.capsule(sx * 0.9, top + 1.6, 1.1, hx, hy + 0.5, 1, BONE, 4.05, {});

  // ---- the quiver: strap across the chest and the shafts over the right shoulder (FRONT); the quiver itself slung across his back (BACK)
  const q0 = [sx - rs * 1.6, chestY + 6.6], q1 = [sx + rs * 4.8, chestY - 4];
  if (s > 0) {
    px.part();
    px.line(sx + rs * 4, chestY - 0.4, sx - rs * 3.4, chestY + 8, DARKM, 4.8, { fix: 1 });                 // the strap, shoulder to far hip
    px.line(sx + rs * 4 + 1, chestY - 0.4, sx - rs * 3.4 + 1, chestY + 8, DARKM, 4.8, { fix: 1 });
    px.part();
    for (const dx of [0, 1.5]) px.capsule(sx + rs * 5.6 + dx * rs, chestY - 1.4, 0.8, sx + rs * 6.2 + dx * rs * 1.2, chestY - 5, 0.8, FLETCH, 3.5);
  } else {
    px.part();
    px.capsule(q0[0], q0[1], 2, q1[0], q1[1], 1.8, DARKM, 5.6);
    px.line(q1[0] - 1.8, q1[1] + 0.8, q1[0] + 1.8, q1[1] - 0.6, IRON, 5.62, { fix: 3 });
    px.part();
    for (const dx of [-0.8, 1]) px.capsule(q1[0] + dx, q1[1] - 1.2, 0.8, q1[0] + dx * 1.4 + rs * 0.4, q1[1] - 4.4, 0.7, FLETCH, 5.55);
    px.part();
    px.line(sx + rs * 6.2, chestY - 0.6, sx - rs * 3.6, chestY + 8, DARKM, 5.5, { fix: 1 });             // the sling
  }

  // ---- the ragged mantle over the shoulders
  px.part();
  const sw = cl(-vx * 1.2 - vx2, -2, 2);
  const mt = chestY - 2.4;
  if (s > 0) px.poly([[sx - 8, mt + 0.4], [sx + 8, mt + 0.4], [sx + 8.6, mt + 4], [sx + 5.2, mt + 6], [sx + 3.6, mt + 3.8], [sx + 1.4, mt + 5.2 + sw * 0.3], [sx - 1.2, mt + 2.6], [sx - 3.4, mt + 5.4], [sx - 5.2, mt + 6.6 + sw * 0.4], [sx - 8.6, mt + 3.4]], RAG, 6.5, { round: 0.85, cast: 1, floor: 1 });
  else px.poly([[sx - 8.2, mt + 0.4], [sx + 8.2, mt + 0.4], [sx + 8.8, mt + 5], [sx + 5.6, mt + 9.2], [sx + 3.6, mt + 7], [sx + 1.2, mt + 10 + sw * 0.4], [sx - 1.2, mt + 7.4], [sx - 3.4, mt + 10.4 + sw * 0.5], [sx - 5.4, mt + 7.6], [sx - 9, mt + 5.2]], RAG, 5.0, { round: 0.85, cast: 1, floor: 1, edge: true });
  px.part();
  if (s > 0) px.line(sx - 3.4, mt + 1, sx - 4.2, mt + 5, RAG2, 6.55, { fix: 0 });
  else { px.line(sx, mt + 1, sx, mt + 9, RAG2, 5.05, { fix: 0 }); px.line(sx - 3.6, mt + 2, sx - 4.4, mt + 7, RAG2, 5.05, { fix: 0 }); }

  // ---- the string hand (his right, screen side rs): swinging low, a rag of cuff
  const rh = [rs * 6.2 + sx, chestY + 9 + a * 0.7 * s], re = [rs * 6.6 + sx, chestY + 4.4];
  px.part();
  px.capsule(sx + rs * 6.2, chestY + 1, 1.2, re[0], re[1], 1.05, BONE, B ? 4.3 : 7.8, { cast: B ? 0 : 1 });
  px.capsule(re[0], re[1], 1.05, rh[0], rh[1], 0.95, BONE, B ? 4.3 : 7.8, { cast: B ? 0 : 1 });
  px.ellipse(re[0], re[1], 1.4, 1.3, BONE, B ? 4.35 : 7.85, B ? { cast: 0 } : {});
  px.part(); px.ellipse(rh[0], rh[1] + (B ? 0.4 : 0), B ? 1.4 : 1.5, B ? 1.3 : 1.4, BONE, B ? 3.6 : 8.3, B ? { cast: 0 } : {});
  px.part(); px.ellipse(sx + rs * 6.2, chestY + 0.6, 1.7, 1.6, BONE, B ? 4.3 : 7.9, { floor: 1, cast: B ? 0 : 1 });

  // ---- the head
  px.part();
  if (s > 0) px.stamp(p.blink ? BLINK : FRONT_H, hx, hy, LEG, 6.8, { ax: 6, ay: 12, ball: [6, 5.5, 6, 6], cast: 1 });
  else {
    // the cowl's long point hangs down the back from the crown (a beat behind the bob)
    px.stamp(BACK_H, hx, hy, LEG, 6.0, { ax: 6, ay: 12, ball: [6, 5.5, 6, 6], cast: 1 });
    px.part();
    px.poly([[hx - 3, hy - 2], [hx + 3, hy - 2], [hx + 2.6 + vx * 0.4, hy + 6], [hx + 0.2 + vx * 0.8, hy + 9.4 + sw * 0.3], [hx - 1.8, hy + 6]], RAG2, 5.6, { round: 0.8, floor: 1 });
  }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "bonearcher-front", BOX: { w: 48, h: 58, ox: 24, oy: 52 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "bonearcher-back", BOX: { w: 48, h: 58, ox: 24, oy: 52 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
