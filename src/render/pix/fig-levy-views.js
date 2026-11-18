// ============ VIEWS: the Iron levy seen from the FRONT and from BEHIND ============
// Same job as fig-goblin-views.js (read its header): the side figure of fig-levy.js drawn walking toward the
// camera (FRONT, s = +1) or away (BACK, s = -1), unmirrored, one sun upper left, the side walk's n / ms / phase
// and its solved skeleton for the feet, bob and sway. His RIGHT hand holds the spear (screen LEFT in front, screen
// RIGHT from behind); the round shield rides his LEFT arm. Also exports the small kit the other Iron foot
// figures' views share (`base`, `legsView`, `dag`, `mk`), so the four files stay one family.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-levy.js";

export const cl = (v, a, b) => Math.max(a, Math.min(b, v));
export const FWD = 0.4, TAU = Math.PI * 2;

// the walk's shared numbers: sway over the planted foot, the bob, velocities for things that trail
export const base = (F, s, amp = 0.8) => {
  const { sk, ph } = F, rs = -s, ls = s;
  const sw = (t) => rs * amp * Math.sin(t * TAU), lagT = 0.09;
  const sx = sw(ph), sx1 = sw(ph - lagT), sx2 = sw(ph - lagT * 2);
  return {
    sk, ph, p: sk.p, rs, ls, s, sx, hipY: sk.P[1], chestY: sk.C[1] + 1.5, hy: sk.N[1] + 0.5, hx: Math.round(sx * 0.7),
    vy: cl(sk.N[1] - F.lag1.N[1], -2, 2), vy2: cl(F.lag1.N[1] - F.lag2.N[1], -2, 2),
    vx: cl((sx - sx1) * 1.3, -2, 2), vx2: cl((sx1 - sx2) * 1.3, -2, 2), tilt: 0.5 * Math.sin(ph * TAU),
  };
};
// a dagged hem: n teeth from x0 to x1 along y
export const dag = (x0, x1, y, n, up = 0.4, dn = 1.8) => { const r = []; for (let i = 0; i <= n * 2; i++) r.push([x0 + ((x1 - x0) * i) / (n * 2), y + (i % 2 ? dn : -up)]); return r; };

// the legs: a hip apart, each foot lifts (toward us in FRONT, away in BACK) and plants.
// L: { leg, boot, thigh [r0, r1], garter, cuff, extra(px, hp, kn, fx, fy, side, z, lift), toe, hip }
export const legsView = (px, B, L) => {
  const { p, s, rs, ls, hx, hipY } = B;
  for (const [f, side, z] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lift = f[1], fx = hx + side * (L.spread ?? 2.9), fy = -1.8 + s * f[0] * FWD - lift * 0.9, bs = side === rs ? 0 : -1;
    const hp = [hx + side * 1.9, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 1.2, (hp[1] + fy) / 2 - lift * 0.5], zz = z + lift * 0.05;
    px.part();
    px.capsule(hp[0], hp[1], L.thigh[0], kn[0], kn[1], L.thigh[1], L.leg, zz, { bias: bs, floor: 1 });
    px.capsule(kn[0], kn[1], L.thigh[1] - 0.1, fx, fy - 2, L.thigh[1] - 0.4, L.leg, zz, { bias: bs, floor: 1 });
    if (L.garter) px.capsule(fx + (kn[0] - fx) * 0.5, fy + (kn[1] - fy) * 0.5, L.thigh[1] + 0.1, fx + (kn[0] - fx) * 0.4, fy + (kn[1] - fy) * 0.4 - 0.4, L.thigh[1] + 0.1, L.garter, zz + 0.01, { bias: bs });
    px.capsule(fx, fy - 3, L.thigh[1] - 0.2, fx, fy, L.thigh[1] - 0.4, L.boot, zz + 0.02, { bias: bs, floor: 1 });
    if (L.extra) L.extra(px, hp, kn, fx, fy, side, zz, lift);
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.3, fy + 1.0, 2.5, 1.5, L.boot, zz + 0.4, { bias: bs, floor: 1 });
    else {
      px.ellipse(fx, fy + 0.9, 2.0, 1.3, L.boot, zz + 0.4, { bias: bs, floor: 1 });
      if (lift > 0.8) px.ellipse(fx, fy + 2.6, 1.9, 1.9 * cl(lift / 2.2, 0.3, 1), L.boot, zz + 0.45, { bias: -2 });   // the sole shows as the heel comes up
    }
    if (L.cuff) px.rect(fx - 1.8, fy - 4.4, 3.8, 1, L.cuff, zz + 0.04, { fix: 2, noLine: true });
  }
};

// ---- the levy ---------------------------------------------------------------------------------
const SKIN = mat("#e0b088"), BROW = mat("#4a3426"), EYE = flat("#2a1c2c"), LIP = flat("#a8685a");
const IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#3c4048", { contrast: 1.1 }), STEELB = mat("#c4c8d0", { contrast: 1.3 });
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), PAD = mat("#8e8266"), LEATHER = mat("#5a3c28"), WOOD = mat("#7a5a38"), WOODK = mat("#4e3820");
const BRASS = mat("#c8a040", { contrast: 1.2 }), HOSE = mat("#4a4c58", { floor: 1 }), BOOT = mat("#2a2a30", { contrast: 1.2, floor: 1 }), GREY = mat("#a8aeb8", { contrast: 1.2 });

export const LEG = {
  M: { m: IRON }, W: { m: IRON, bias: 1 }, m: { m: IRONK }, c: { m: PAD }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  b: { m: BROW, fix: 1 }, E: { m: EYE }, e: { m: SKIN, fix: 0 }, l: { m: LIP }, z: { m: SKIN, fix: 0 }, T: { m: LEATHER },
};
export const HAT = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMWWMMMMMMM.",
  "MMMWMMMMMMMMM",
  "MMMMMMMMMMMMM",
  "mmmmmmmmmmmmm",
];
// FRONT: the brim's shadow, brows, eyes, nose, a stubbled mouth; the padded coif at the jaw, the chin strap
export const FRONT_H = [...HAT,
  ".cSbbSSSbbSc.",
  ".csSESNSESsc.",
  ".csSSSNSSSsc.",
  ".cTSSzlzSSTc.",
  "..cTSSSSSTc..",
  "...cTTTTTc...",
];
export const blinkOf = (rows) => rows.map((r, i) => (i === 7 ? r.replace(/E/g, "e") : r));
// BACK: the dome, the brim, the padded collar with its seam, the nape
export const BACK_H = [...HAT,
  ".ccccscccccc.",
  ".ccccscccccc.",
  "..cccscccc...",
  "...sSSSSSs...",
  "....sSSSs....",
  ".....sss.....",
];

const make = (s) => (px, F, o = {}) => {
  const B = base(F, s, 0.8), { sk, ph, p, rs, ls, sx, hipY, chestY, hy, hx, vy, vy2, vx, vx2, tilt } = B;
  const shY = sk.sN[1] + 0.4, c0 = chestY - 3, b0 = hipY, hemY = hipY + 5.4;
  const SIDE_ARM = p.aN[0];

  // ---- the shield on his left arm (far side), carried up at the chin: face to us in FRONT, its back from behind
  const sc = [ls * 7 + sx, chestY + 7.4 + tilt * 0.3], rx = 7, ry = 8.2;
  if (s > 0) {
    // far arm's sleeve behind the shield
    px.part();
    px.capsule(ls * 5.3 + sx, shY, 2.1, ls * 8.2 + sx, shY + 6, 2.0, PAD, 1, { bias: -1 });
  } else {
    // from behind: the shield hangs off the left arm, its back beyond the body: planks, a strap, the grip, the rim
    px.part(); const sid = px._pid;
    px.ellipse(sc[0] - 0.8, sc[1] - 0.4, rx, ry, IRON, 3.2, { round: 0.7 });
    px.ellipse(sc[0] - 0.8, sc[1] - 0.4, rx - 1.1, ry - 1.1, WOOD, 3.22, { round: 0.8 });
    px.toneLine(sc[0] - 2.6, sc[1] - ry + 1.6, sc[0] - 2.8, sc[1] + ry - 2, -1, sid);
    px.part();
    px.line(sc[0] - rx + 1.4, sc[1] - 1.8, sc[0] + rx - 1.2, sc[1] - 1.8, LEATHER, 3.3, { noLine: true });              // the arm strap
    px.line(sc[0] - rx + 1.4, sc[1] + 2.4, sc[0] + rx - 1.2, sc[1] + 2.4, LEATHER, 3.3, { noLine: true });
    px.line(sc[0] - 4.4, sc[1] - ry + 2.4, sc[0] - 4.2, sc[1] + ry - 2.4, WOODK, 3.28, { noLine: true });             // plank joints
    px.line(sc[0] + 1.6, sc[1] - ry + 2, sc[0] + 1.8, sc[1] + ry - 2, WOODK, 3.28, { noLine: true });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.3; px.dot(sc[0] - 0.8 + Math.cos(a) * (rx - 0.5), sc[1] - 0.4 + Math.sin(a) * (ry - 0.5), STEELB, 3.35, { fix: 4 }); }
    px.part(); px.capsule(ls * 5.3 + sx, shY, 2.1, ls * 7 + sx, shY + 5.4, 1.9, PAD, 3.6, { bias: -1 });              // the left arm going in behind the shield
  }

  // ---- the spear: ash shaft, a leaf head, the pennon streaming; at his right side, held at the chest
  const hdY = shY + 7.6 + s * 0.4 * (SIDE_ARM - 1) + vy * 0.4, hdX = rs * 7.4 + sx;
  const lean = cl(vx * 0.8 + vx2 * 0.5, -1.5, 1.5);
  const topY = hdY - 40, topX = hdX + rs * 1.2 + lean * 0.4, buY = -3, buX = hdX - rs * 0.8;
  px.part(); px.tag("weapon");
  px.capsule(buX, buY, 1.0, topX, topY, 1.0, WOOD, 5.0, { edge: true });
  px.capsule(buX, buY, 1.2, buX, buY - 1.8, 1.2, IRON, 5.01);
  px.part();
  px.capsule(topX, topY + 2.8, 1.25, topX, topY - 0.4, 1.25, IRON, 5.05);
  px.poly([[topX, topY - 0.2], [topX + 2.1, topY - 2], [topX + 0.1, topY - 8.4], [topX - 2.1, topY - 2]], STEELB, 5.06, { n: [0.1, 0.1, 0.95] });
  px.line(topX, topY - 1, topX, topY - 7, IRON, 5.07, { fix: 1, noLine: true });
  px.part();
  {   // a pennon of oxblood under the head, streaming out to the spear side and flapping with the stride
    const f = cl(lean * 1.2 + 0.9 * Math.sin(ph * TAU * 2), -2, 2), dir = rs;
    px.poly([[topX, topY + 1.4], [topX + dir * 2, topY + 1.4 + f * 0.2], [topX + dir * 7.2, topY + 2.6 + f], [topX + dir * 10.4, topY + 1.6 + f * 1.3], [topX + dir * 8.4, topY + 4.6 + f * 1.2], [topX + dir * 2, topY + 5], [topX, topY + 4.6]], OX, 5.1, { round: 0.6, cast: 1 });
  }
  px.tag(null);

  // ---- the hat's tuft, behind the head, flopping a beat behind the bob
  const bob = cl(vy * 1.2 + vy2 * 0.8, -1.5, 1.5), bend = cl(vx * 2 + vx2 * 1.4, -2.4, 2.4);
  px.part();
  px.poly([[hx - 1.8, hy - 11], [hx + 1.8, hy - 11], [hx + 1.8 + bend * 0.2, hy - 14 - bob * 0.5], [hx + 0.6 + bend * 0.8, hy - 17.4 - bob], [hx - 2 + bend * 1.2, hy - 15.4 - bob * 0.7], [hx - 2, hy - 13.4]], OX, 5.4, { round: 0.8, cast: 1 });

  legsView(px, B, { leg: HOSE, boot: BOOT, garter: OXK, thigh: [2.3, 1.9], cuff: STEELB });

  // ---- the padded jack, the oxblood tabard over it (dagged, a brass hem-line), the belt
  px.part(); const jack = px._pid;
  px.poly([[sx - 5.2, c0], [sx + 5.2, c0], [sx + 5.8, c0 + 4], [hx + 5.2, b0], [hx + 5.2, b0 + 2.2], [hx - 5.2, b0 + 2.2], [hx - 5.2, b0], [sx - 5.8, c0 + 4]], PAD, 4, { round: 0.92, cast: 2 });
  px.toneLine(sx - 3, c0 + 2, hx - 3, b0, -1, jack);
  px.part(); const tab = px._pid;
  const teeth = dag(hx + 4.8, hx - 4.8, hemY, 5);
  px.poly([[sx - 3.9, c0 + 0.8], [sx + 3.9, c0 + 0.8], [hx + 4.4, b0], [hx + 4.8, hemY - 0.6], ...teeth, [hx - 4.4, b0]], OX, 4.02, { round: 0.92, cast: 2 });
  px.toneLine(hx + 1.6, b0 - 1, hx + 1.4, hemY - 1.6, -1, tab);
  px.toneLine(hx - 1.8, b0 - 1, hx - 2, hemY - 1.6, 1, tab);
  px.line(hx - 4.2, hemY - 1.2, hx + 4.2, hemY - 1.2, BRASS, 4.04);
  px.poly([[hx - 5.2, b0 - 4.6], [hx + 5.2, b0 - 4.6], [hx + 5.3, b0 - 2.8], [hx - 5.3, b0 - 2.8]], LEATHER, 4.05, { round: 0.92 });
  px.part();
  if (s > 0) {
    px.rect(hx - 1, b0 - 4.6, 2, 2, BRASS, 4.06, { fix: 3 });                                                         // the buckle
    px.rect(sx - 1, c0 + 3, 2.4, 3.4, GREY, 4.1, { fix: 3 }); px.dot(sx - 1, c0 + 2, GREY, 4.1, { fix: 3 }); px.dot(sx + 1.4, c0 + 2, GREY, 4.1, { fix: 3 });   // the tower sewn on the breast
    px.rect(sx - 0.1, c0 + 5, 1, 1.4, OXK, 4.12, { noLine: true });
    px.part(); px.rect(hx + rs * 3.8 - 1.5, b0 - 2.4, 3, 3.4, LEATHER, 4.1, { cast: 1 }); px.dot(hx + rs * 3.8, b0 - 1.8, BRASS, 4.11, { fix: 3 });   // the pouch on his right hip
  } else {
    px.toneLine(sx, c0 + 1, hx, b0 - 4.6, -1, tab);                                                                   // the back seam
    px.rect(hx - 1, b0 - 4.6, 2, 1.4, BRASS, 4.06, { fix: 3 });                                                       // the belt's tongue
    px.part(); px.rect(hx + rs * 3.8 - 1.5, b0 - 2.4, 3, 3.4, LEATHER, 4.1, { cast: 1 }); px.dot(hx + rs * 3.8, b0 - 1.8, BRASS, 4.11, { fix: 3 });
    // a rolled blanket slung over the left shoulder across the back, tied
    px.part(); const rid = px._pid;
    px.capsule(ls * 4 + sx, c0 + 1.4, 1.9, rs * 3.6 + hx, b0 - 5.4, 1.9, mat("#6a6e52"), 4.2, { cast: 1 });
    px.toneLine(ls * 4 + sx + 0.6, c0 + 0.6, rs * 3.6 + hx + 0.6, b0 - 6.4, -1, rid);
    px.dot(sx - ls * 0.6, c0 + 4.6, LEATHER, 4.3, { fix: 2 }); px.dot(hx + rs * 1.2, b0 - 7.4, LEATHER, 4.3, { fix: 2 });
  }
  // the collar of the jack, under the head
  px.part();
  px.poly([[sx - 4.8, c0 - 0.2], [sx + 4.8, c0 - 0.2], [sx + 5.4, c0 + 2.4], [sx - 5.4, c0 + 2.4]], PAD, 5, { round: 0.9, cast: 1 });

  // ---- the spear arm (right, screen side rs): the sleeve down to the elbow, the forearm short toward us / away
  const el = [rs * 7.8 + sx, shY + 7 + s * 0.2], hand = [hdX, hdY];
  px.part();
  px.ellipse(rs * 5.6 + sx, shY + 0.2, 2.6, 2.3, PAD, 4.6, { bias: 1, cast: 0 });
  px.part();
  px.capsule(rs * 5.4 + sx, shY + 0.6, 2.0, el[0], el[1], 2.0, PAD, 4.5, { cast: 1 });
  px.capsule(el[0], el[1], 1.9, hand[0], hand[1] - 0.4, 1.7, PAD, 4.5, { cast: 1 });
  px.capsule(el[0] * 0.3 + hand[0] * 0.7, el[1] * 0.3 + hand[1] * 0.7, 1.8, hand[0], hand[1], 1.8, LEATHER, 4.55);
  px.part(); px.ellipse(hand[0], hand[1] + (s > 0 ? 0.3 : -0.3), s > 0 ? 1.9 : 1.6, s > 0 ? 1.9 : 1.6, LEATHER, 8.3);

  // ---- the head
  px.part();
  if (s > 0) px.stamp(p.blink ? blinkOf(FRONT_H) : FRONT_H, hx, hy, LEG, 6, { ax: 6, ay: 12, ball: [6.5, 6, 7, 7], cast: 1 });
  else px.stamp(BACK_H, hx, hy, LEG, 6.4, { ax: 6, ay: 12, ball: [6.5, 6, 7, 7], cast: 1 });
  px.dot(hx + 1, hy - 10.4, BRASS, 6.5, { fix: 3 });                                          // the hat's rivets
  if (s > 0) px.dot(hx + 3, hy - 8.4, STEELB, 6.5, { fix: 4 });
  else { px.dot(hx - 3, hy - 8.4, STEELB, 6.5, { fix: 4 }); px.dot(hx + 3, hy - 8.4, STEELB, 6.5, { fix: 4 }); }

  // ---- the shield, FRONT: held up before him, over the chest and the arm, riveted, scarred, the tower on the field
  if (s > 0) {
    px.part(); const sid = px._pid;
    px.ellipse(sc[0], sc[1], rx, ry, IRON, 8.6, { round: 0.7 });
    px.ellipse(sc[0], sc[1], rx - 1.2, ry - 1.2, OX, 8.62, { round: 0.8 });
    px.toneLine(sc[0] - 1.6, sc[1] - ry + 1, sc[0] - 2, sc[1] + ry - 1, -1, sid);
    px.part();
    const tx = sc[0] - 2.6, ty = sc[1] - 4.6;
    px.rect(tx, ty + 1.6, 5.2, 6, GREY, 8.9, { fix: 3 });
    px.dot(tx, ty + 0.6, GREY, 8.9, { fix: 3 }); px.dot(tx + 2, ty + 0.6, GREY, 8.9, { fix: 3 }); px.dot(tx + 4, ty + 0.6, GREY, 8.9, { fix: 3 });
    px.rect(tx + 2, ty + 5, 1.2, 2.6, OXK, 8.92, { noLine: true });
    px.part(); px.ellipse(sc[0], sc[1] + 6.2, 1.5, 1.3, STEELB, 9, { cast: 1 });
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + 0.3; px.dot(sc[0] + Math.cos(a) * (rx - 0.5), sc[1] + Math.sin(a) * (ry - 0.5), STEELB, 9, { fix: 4 }); }
    px.line(sc[0] + 1, sc[1] - 6, sc[0] + 4.4, sc[1] - 1.6, OXK, 8.95, { noLine: true });
    px.line(sc[0] - 5, sc[1] + 3, sc[0] - 2.6, sc[1] + 5.6, GREY, 8.95, { noLine: true, fix: 2 });
    px.dot(sc[0] + 5.6, sc[1] + 2.4, IRONK, 9, { fix: 0 });
  }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "levy-front", BOX: { w: 52, h: 84, ox: 26, oy: 80 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "levy-back", BOX: { w: 52, h: 84, ox: 26, oy: 80 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
