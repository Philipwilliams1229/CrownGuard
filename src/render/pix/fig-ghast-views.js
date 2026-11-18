// ============ the Plague Ghast seen from the FRONT and from BEHIND ============
// Same creature as fig-ghast.js (a drowned corpse swollen with grave-rot: a hump of a back, a great tight pale
// gut hung low and bruised, thin bowed legs, long arms hung low with big clawed hands, a bald swollen head slung
// forward with a lolling jaw and small sick-yellow eyes, a shroud loincloth, drowned weed over one shoulder,
// glowing sores that pulse). FRONT (s = +1): the head sunk low under the shoulders' hump, the gut the whole
// of him, sores lit pus-yellow, hands swinging at his sides. BACK (s = -1): the hump with its sores and the
// torn shroud strip down it, the weed, a bald dome peeking over, the gut bulging past either flank.
// Unflipped, sun upper left. Walk = the side walk's n / ms / pose; the sore light is returned for the lab.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-ghast.js";

const SKIN = mat("#a4ae8c"), GUT = mat("#c8c8a0"), BRUISE = mat("#6a5a7a", { contrast: 0.9 }), RAG = mat("#4a5a50", { contrast: 0.9 }), RAG2 = mat("#2a2434", { contrast: 0.9 });
const WEED = mat("#4e6a48"), CLAW = mat("#d8d0b4"), CRUST = mat("#8a5a3a", { contrast: 0.9 });
const PUS = flat("#d8e860", { emis: true, line: "#7a8a2a" }), PUS_H = flat("#f4ffb0", { emis: true, line: "#c8d84a" });
const EYE = flat("#d8e860", { emis: true }), SOCK = flat("#1c1a14"), MOUTH = flat("#2c1a22"), TOOTH = flat("#e4dcc0");
const LEG = { S: { m: SKIN }, s: { m: SKIN, bias: -1 }, e: { m: SOCK }, E: { m: EYE }, N: { m: SKIN, fix: 1 }, M: { m: MOUTH }, T: { m: TOOTH, fix: 4 }, v: { m: SKIN, fix: 1 } };

// FRONT head: a swollen bald dome, small sick eyes in dark sockets, the nose holes, a slack mouth with a few teeth. 13 wide, centre col 6.
const FRONT_H = [
  "....SSSSS....",
  "..SSSSSSSSS..",
  ".SSSSSSSSSSS.",
  ".SSSSSSSSSSS.",
  ".SSeEeSeEeSS.",
  ".sSSSSSSSSSs.",
  ".sSSSSNSSSSs.",
  "..sSSSNSSSs..",
  "..sSTMTMTSs..",
  "...sSMMMMMs..",
  ".....sMMMs...",
];
const BLINK = FRONT_H.map((r, i) => (i === 4 ? ".SSSSSSSSSSS." : r));
// BACK head: the dome, a vein or two, its nape.
const BACK_H = [
  "....SSSSS....",
  "..SSSSSSSSS..",
  ".SSSSSSSSSSS.",
  ".SSSSvSSSSSS.",
  ".SSSSSvSSSSS.",
  ".sSSSSSSSvSs.",
  ".sSSSSSSSSSs.",
  "..sSSSSSSSs..",
  "...sSSSSSs...",
  ".....sSs.....",
];
const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

const make = (s) => (px, F, o = {}) => {
  const rs = -s, ls = s;
  const { sk, ph } = F, p = sk.p;
  const a = Math.cos(ph * TAU);
  const sx = rs * 0.9 * Math.sin(ph * TAU), hx = Math.round(sx * 0.6);
  const chestY = sk.C[1] + 1, hipY = sk.P[1];
  const vy = cl(sk.P[1] - F.lag1.P[1], -2, 2), vx = cl((sx - rs * 0.9 * Math.sin((ph - 0.09) * TAU)) * 1.4, -2, 2);
  const pulse = 0.5 + 0.5 * Math.sin((ph + 0.2) * TAU);
  const gutC = [sx, chestY + 8 + vy * 0.4];

  // ---- bowed thin legs, big flat feet; forward is down the screen (front) or up it (back)
  const legs = [];
  for (const [f, side, z] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lift = f[1], fx = hx + side * 3.4, fy = -2 + s * f[0] * FWD - lift * 0.9;
    const hp = [hx + side * 2.8, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 2.2, (hp[1] + fy) / 2 - lift * 0.4];
    const b = side === rs ? 0 : -1;
    px.part();
    px.capsule(hp[0], hp[1], 2.4, kn[0], kn[1], 1.7, SKIN, z + lift * 0.05, { bias: b, cast: 1 });
    px.capsule(kn[0], kn[1], 1.7, fx, fy, 1.2, SKIN, z + lift * 0.05, { bias: b });
    px.ellipse(kn[0], kn[1], 2, 1.9, SKIN, z + 0.02 + lift * 0.05, { bias: b });
    px.part();
    px.ellipse(fx + (s > 0 ? side * 0.4 : 0), fy + 1, s > 0 ? 2.5 : 2, s > 0 ? 1.5 : 1.3, SKIN, z + 0.3 + lift * 0.05, { bias: b });
    if (s < 0 && lift > 0.8) px.ellipse(fx, fy + 2.6, 1.8, 1.8 * cl(lift / 2.2, 0.3, 1), SKIN, z + 0.35, { bias: -2 });
  }

  // ---- the loincloth of shroud: its hem swinging a beat behind
  const hm = hipY + 8.5 + vy * 0.5;
  px.part();
  px.poly([[hx - 5, hipY - 1.8], [hx + 5, hipY - 1.8], [hx + 5.4, hm - 1.4], [hx + 2.8, hm + 1], [hx + 0.6, hm - 1.2], [hx - 1.8, hm + 1.4], [hx - 4.6 - vx, hm - 0.8]], RAG, s > 0 ? 3.8 : 5.0, { round: 0.85, floor: 1, edge: s < 0 });
  px.line(hx - 3, hipY + 0.6, hx - 3.4 - vx, hm - 0.5, RAG2, s > 0 ? 3.85 : 5.05, { fix: 0 });

  // ---- arms (hung low, the claws down; they swing in turn)
  const arm = (side, z0, b) => {
    const B = s < 0, z = B ? 4.3 : z0, zh = B ? 3.6 : z + 0.03, cs = B ? 0 : 1;      // BACK: both arms at z 4.3 hanging at the sides, fists under them (views-artist.md)
    const sw2 = side === rs ? a : -a;
    const sh = [side * 7.2 + sx, chestY - 0.4], el = [side * 9.6 + sx, chestY + 7], hd = [side * 9.2 + sx, chestY + 14.4 + s * sw2 * 1.4];
    px.part();
    px.capsule(sh[0], sh[1], 2.2, el[0], el[1], 1.6, SKIN, z, { bias: B ? 0 : b, cast: cs });
    px.capsule(el[0], el[1], 1.6, hd[0], hd[1], 1.3, SKIN, z, { bias: B ? 0 : b, cast: cs });
    px.ellipse(el[0], el[1], 1.8, 1.7, SKIN, z + 0.02, { bias: B ? 0 : b, cast: cs });
    px.part();
    px.ellipse(hd[0], hd[1] + 0.8, s > 0 ? 2.5 : 2.2, 2, SKIN, zh, { bias: B ? 0 : b, cast: cs });
    for (const dx of [-1.6, 0, 1.6]) px.line(hd[0] + dx * 0.7, hd[1] + 2, hd[0] + dx * 1.1, hd[1] + 4.4, CLAW, zh + 0.02, { fix: 3, bias: B ? 0 : b, cast: cs });
  };

  // ---- the body
  px.part();
  if (s > 0) {
    px.ellipse(sx, chestY - 0.8, 8.4, 5, SKIN, 3.9, { cast: 1 });                    // the hunched shoulders
    px.capsule(sx, chestY, 5.4, sx, chestY + 6, 5.6, SKIN, 4);
    px.part();
    px.ellipse(gutC[0], gutC[1], 7.4, 7.2 + vy * 0.4, GUT, 4.2, { cast: 1, round: 0.9 });
    const bq = [gutC[0] + 1.6, gutC[1] + 1.6];
    px.ellipse(bq[0], bq[1], 3.6, 2.6, BRUISE, 4.25, { noLine: true });
    px.dot(gutC[0] - 3.4, gutC[1] + 2.6, BRUISE, 4.26, { noLine: true }); px.dot(gutC[0] - 2.4, gutC[1] - 0.6, BRUISE, 4.26, { noLine: true });
    px.dot(gutC[0] - 2.6, gutC[1] - 3.4, GUT, 4.3, { fix: 4, noLine: true });          // the stretched sheen
    px.part();
    for (const [dx, dy, r] of [[-3.6, 4.2, 1.5], [3.4, -2.4, 1.3], [-0.6, -0.8, 1.2]]) {
      const q = [gutC[0] + dx, gutC[1] + dy];
      px.ellipse(q[0], q[1], r + 0.7, r + 0.6, CRUST, 4.4); px.ellipse(q[0], q[1], r * 0.85, r * 0.8, pulse > 0.5 || r > 1.3 ? PUS_H : PUS, 4.45, { noLine: true });
    }
    // a sore on the near shoulder
    px.ellipse(sx + rs * 6, chestY - 1.4, 1.4, 1.2, CRUST, 4.4); px.ellipse(sx + rs * 6, chestY - 1.4, 1.1, 0.9, PUS, 4.45, { noLine: true });
    // drowned weed over one shoulder, trailing down its chest
    px.part();
    const wv = cl(vx * 1.4, -2, 2);
    px.poly([[sx + ls * 2, chestY - 7.6], [sx + ls * 5.6, chestY - 7.2], [sx + ls * 7.4 + wv, chestY - 1.4], [sx + ls * 6.4 + wv * 1.4, chestY + 2.4], [sx + ls * 4.4, chestY - 0.6]], WEED, 4.6, { round: 0.7, floor: 1 });
  } else {
    // the gut shows past either flank, the pale of it a tone under the hide
    px.ellipse(gutC[0], gutC[1] - 1, 8, 6.8, GUT, 3.8, { cast: 1, round: 0.9 });
    px.part();
    px.ellipse(sx, chestY - 0.6, 8.4, 5.2, SKIN, 4.0, { cast: 1 });                    // the hump
    px.capsule(sx, chestY - 1, 5, sx, chestY + 8, 5.4, SKIN, 4.0);
    px.part();
    // the torn strip of shroud down the spine
    px.poly([[sx - 1.2, chestY - 6], [sx + 1.2, chestY - 6], [sx + 1.6, chestY + 1], [sx + 2.6 + vx, chestY + 9.6], [sx + 0.4 + vx, chestY + 8.2], [sx - 1.2 + vx, chestY + 10.4], [sx - 2.4, chestY + 2]], RAG, 5.0, { round: 0.7, floor: 1, edge: true });
    px.part();
    for (const [dx, dy, r] of [[-3.8, -3.4, 1.5], [3.6, 0.4, 1.3], [-3.2, 4.6, 1.3], [2.6, 6.4, 1.1]]) {
      const q = [sx + dx, chestY + dy];
      px.ellipse(q[0], q[1], r + 0.7, r + 0.6, CRUST, 5.1); px.ellipse(q[0], q[1], r * 0.85, r * 0.8, pulse > 0.5 || r > 1.3 ? PUS_H : PUS, 5.15, { noLine: true });
    }
    // weed over the shoulder, hanging down the back
    px.part();
    const wv = cl(vx * 1.4, -2, 2);
    px.poly([[sx + rs * 2.4, chestY - 8], [sx + rs * 6.4, chestY - 6.4], [sx + rs * 7.4 + wv, chestY + 1], [sx + rs * 5.6 + wv * 1.4, chestY + 5.4], [sx + rs * 4, chestY + 1.4]], WEED, 5.2, { round: 0.7, floor: 1, edge: true });
  }
  arm(rs, s > 0 ? 8 : 6, 0); arm(ls, s > 0 ? 8 : 6, -1);

  // ---- the head
  px.part();
  if (s > 0) {
    const hy = Math.round(sk.N[1] + 2.2 + vy * 0.4);
    px.stamp(p.blink ? BLINK : FRONT_H, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6, 5, 6, 5.6], cast: 1 });
    px.dot(hx - 1, hy - 10, PUS, 6.2, { fix: 3 });                                    // a sore on the swollen scalp
  } else {
    const hy = Math.round(sk.N[1] - 2.5);
    px.stamp(BACK_H, hx, hy, LEG, 3.9, { ax: 6, ay: 9, ball: [6, 5, 6, 5.6], cast: 1 });
    px.dot(hx + 1, hy - 8, PUS, 3.95, { fix: 3 });
  }
  return { light: { x: gutC[0], y: gutC[1], r: 24, col: "#e0ec70", k: 0.34 + 0.12 * pulse }, glow: [gutC[0], gutC[1]] };
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "ghast-front", BOX: { w: 48, h: 62, ox: 24, oy: 56 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "ghast-back", BOX: { w: 48, h: 62, ox: 24, oy: 56 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
