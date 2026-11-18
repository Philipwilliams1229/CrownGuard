// ============ the Raft Goblin (type `rafter`) seen from the FRONT and from BEHIND ============
// One drawer, `make(s)`: s = +1 FRONT, -1 BACK (as fig-goblin-views.js; he is that bare-headed footpad: knobbly skull, scrap
// of dark hair, long ears the near one notched, red eyes, snaggle fang, patched jerkin, bandy bare legs, big flat feet).
// FRONT: the ash spear is carried across him in both hands, rear fist (his RIGHT, screen LEFT) low at the hip, forward
// fist (his LEFT, screen RIGHT) at the chest, the rusty leaf head rising past his shoulder, a rag under it.
// BACK (owner's rule: a held weapon is mostly hidden): both fists at his sides and only the spear's ferrule stub
// sticking out behind the rear hand, down; no blade shows. Feet, bob and arm swing follow the side trot's pose.
// Unflipped on the board; one sun, upper left.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-rafter.js";

const SKIN = mat("#6aa04f"), JERK = mat("#6e4c28"), DARK = mat("#3c2a18"), WOOD = mat("#8a6238");
const STEEL = mat("#b8bcc4", { contrast: 1.25 }), RUST = mat("#8a6a52", { contrast: 1.1 }), BONE = mat("#ece0c4"), HAIR = mat("#3a2a1c"), CLOTH = mat("#a05a3a"), PATCH = mat("#7a6240");
const EYE = flat("#c8453a"), GLINT = flat("#ffb070"), MOUTH = flat("#2c1a22");
const LEG = {
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 1 }, L: { m: SKIN, fix: 3 }, H: { m: SKIN, fix: 4 },
  B: { m: SKIN, fix: 0 }, E: { m: EYE }, e: { m: GLINT }, T: { m: BONE, fix: 3 }, M: { m: MOUTH }, D: { m: HAIR },
};
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const FRONT_H = [
  "....GDDDG....",
  "..GGGDGGGGG..",
  ".GGLLGGGGGGG.",
  ".GGGGGGGGGGG.",
  ".GGBBGGGBBGG.",
  ".GGeEBGBeEGG.",
  ".GGEEGGGEEGG.",
  ".GGGGLNLGGGG.",
  ".GGGgnNngGGG.",
  ".GGMTMNMTMGG.",
  "..gGMMTMMMGg.",
  "...gGGGGGGg..",
  ".....ggggg...",
];
const BLINK = swap(FRONT_H, { 5: ".GGGGGGGGGGG.", 6: ".GGBBGGGBBGG." });
const BACK_H = [
  "....GDDDG....",
  "..GGGDDGGGG..",
  ".GGLLGGGGGGG.",
  ".GGGLGGGGGGG.",
  ".GGGGGGGgGGG.",
  ".GGGGGGGGGGG.",
  ".GGGGgGGGGGG.",
  ".gGGGGGGGGGg.",
  "..gGGDGGDGg..",
  "...ggGGGgg...",
  "....gGGGg....",
  ".....ggg.....",
];

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const make = (s) => (px, F) => {
  const rs = -s, ls = s, { sk, ph } = F, p = sk.p, TAU = Math.PI * 2;
  const sw = (t) => rs * 0.8 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const hipY = sk.P[1], chY = sk.C[1] + 1.2, hy = Math.round(sk.N[1]) + 0.5, hx = Math.round(sx * 0.7);
  const vy = cl(sk.N[1] - F.lag1.N[1], -2, 2), vy2 = cl(F.lag1.N[1] - F.lag2.N[1], -2, 2);
  const vx = cl((sx - sx1) * 1.3, -2, 2), vx2 = cl((sx1 - sx2) * 1.3, -2, 2);
  const tilt = 0.5 * Math.sin(ph * TAU), ang = p.aN[0];

  // the hair scrap on the crown, flopping behind the bob
  const top = hy - 10, bend = cl(vx * 2 + vx2 * 1.4, -2.4, 2.4), bob = cl(vy * 1.2 + vy2 * 0.8, -1.5, 1.5);
  px.part();
  px.poly([[hx - 2.4, top + 2.4], [hx + 2.4, top + 2.4], [hx + 2.6 + bend * 0.5, top - 0.2 - bob * 0.5], [hx + 4.4 + bend, top - 1.8 - bob], [hx + 0.6 + bend * 0.4, top - 1 - bob * 0.5], [hx - 1.4, top]], HAIR, 5.2, { round: 0.8, floor: 1 });

  // the long ears out to both sides (from behind: their backs); the near (right) one notched
  const ey = -vy * 1.3 - vy2 * 0.9 - (p.ear || 0) * 1.4;
  for (const side of [-1, 1]) {
    px.part(); const eid = px._pid;
    const notch = side === rs, wob = ey * 0.8 + (side === rs ? vx * 0.6 : -vx * 0.6), rt = (xx, yy) => [hx + side * xx, hy + yy];
    const pts = notch
      ? [rt(4.6, -6.2), rt(5.4, -2.2), rt(8.4, -3.6), rt(9.6, -4.2 + wob * 0.3), rt(11.4, -5 + wob * 0.5), rt(14.6, -10 + wob), rt(9.4, -8.6 + wob * 0.4)]
      : [rt(4.6, -6.2), rt(5.4, -2.6), rt(9.4, -5.4 + wob * 0.4), rt(14, -9.6 + wob), rt(9.4, -8.2 + wob * 0.4)];
    px.poly(pts, SKIN, s > 0 ? 5.5 : 6.6, { bias: s > 0 ? -1 : -2, n: [side * 0.3, -0.35, 0.9], cast: 1 });
    px.toneLine(...rt(5.6, -4.6), ...rt(11.4, -7.8 + wob * 0.8), -1, eid);
  }

  // the spear: carried slanted up across him (front); a ferrule stub behind him (back)
  const hdR = s > 0 ? [rs * 4.6 + sx, chY + 9.4 + s * ang * 1.8] : [rs * 5.6 + sx, hipY - 0.6 + ang * 1.2];
  const hdL = s > 0 ? [ls * 6.8 + sx, chY + 1.6 + tilt * 0.6] : [ls * 5.6 + sx, hipY - 0.6 - ang * 1.2];
  const dx = hdL[0] - hdR[0], dy = hdL[1] - hdR[1], dl = Math.hypot(dx, dy), d = [dx / dl, dy / dl], nn = [-d[1], d[0]];
  const at = (f, o = 0) => [hdR[0] + d[0] * f + nn[0] * o, hdR[1] + d[1] * f + nn[1] * o];
  const fl = cl(-vx * 1.2 + (p.flut || 0), -2, 2);
  if (s > 0) {
    px.part();
    px.capsule(...at(-2.5), 0.8, ...at(dl + 14), 0.8, WOOD, 8, { cast: 1 });
    px.capsule(...at(-2.9), 1.1, ...at(-1.6), 1.1, DARK, 8.02, { floor: 1 });
    px.part();
    px.poly([at(dl + 12, -1.2), at(dl + 14.4, -2.3), at(dl + 21, 0), at(dl + 14.4, 2.3), at(dl + 12, 1.2)], STEEL, 8.1, { fix: 3 });
    px.line(...at(dl + 13, 0.1), ...at(dl + 19.6, 0), RUST, 8.12, { fix: 1, noLine: true });
    px.line(...at(dl + 13.8, -1.6), ...at(dl + 18, -0.6), STEEL, 8.13, { fix: 4, noLine: true });
    px.capsule(...at(dl + 11.2), 1.1, ...at(dl + 12.4), 1.1, DARK, 8.1, { floor: 1 });
    px.part();
    px.poly([at(dl + 10.4, 0.6), at(dl + 7, 1.8 + fl * 0.4), at(dl + 2.4, 3 + fl), at(dl + 4.6, 0.8 + fl * 0.4)], CLOTH, 8.2, { round: 0.6, cast: 1 });
  } else {
    px.part();
    px.capsule(hdR[0] + rs * 0.2, hdR[1], 0.8, hdR[0] + rs * 0.6, hdR[1] + 5.4, 0.8, WOOD, 8, { cast: 1 });
    px.capsule(hdR[0] + rs * 0.6, hdR[1] + 5.2, 1.1, hdR[0] + rs * 0.65, hdR[1] + 6.4, 1.1, DARK, 8.02, { floor: 1 });
  }

  // far-side parts: legs (bandy, bare, big flat feet)
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]];
  for (const [f, side, z] of feet) {
    const lift = f[1], fx = hx + side * 2.9, fy = -1.8 + s * f[0] * FWD - lift * 0.9, b = side === rs ? 0 : -1;
    const hp = [hx + side * 1.9, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 1.3, (hp[1] + fy) / 2 - lift * 0.5], zz = z + lift * 0.05;
    px.part();
    px.capsule(hp[0], hp[1], 2.1, kn[0], kn[1], 1.8, SKIN, zz, { bias: b });
    px.capsule(kn[0], kn[1], 1.7, fx, fy, 1.3, SKIN, zz, { bias: b });
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.3, fy + 1.1, 2.3, 1.35, SKIN, z + 0.4 + lift * 0.05, { bias: b });
    else {
      px.ellipse(fx, fy + 0.9, 1.8, 1.2, SKIN, z + 0.4 + lift * 0.05, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 2.6, 1.7, 1.9 * cl(lift / 2.2, 0.3, 1), SKIN, z + 0.45, { bias: -2 });
    }
  }

  // the jerkin: a hunched barrel to a ragged hem, belt round it, a patch
  const c0 = chY - 3, b0 = hipY;
  px.part(); const jid = px._pid;
  px.poly([[sx - 5.2, c0], [sx + 5.2, c0], [sx + 5, c0 + 3.4], [hx + 4.7, b0 + 0.2], [hx + 4.8, b0 + 2.2], [hx - 4.8, b0 + 2.2], [hx - 4.7, b0 + 0.2], [sx - 5, c0 + 3.4]], JERK, 4, { round: 0.92, cast: 1 });
  for (const x of [-3.4, -1.6, 0.6, 3.2]) px.dot(hx + x, b0 + 2.6, JERK, 4);
  px.poly([[hx - 4.9, b0 - 2], [hx + 4.9, b0 - 2], [hx + 4.9, b0 - 0.2], [hx - 4.9, b0 - 0.2]], DARK, 4.05, { round: 0.92 });
  px.part();
  if (s > 0) { px.dot(hx, b0 - 1.1, STEEL, 4.2); px.dot(sx, c0 + 2, DARK, 4.1); px.dot(sx, c0 + 4, DARK, 4.1); px.rect(hx + 1.6, b0 + 0.4, 2.6, 1.8, CLOTH, 4.1, { fix: 2 }); }
  else {
    px.toneLine(sx, c0 + 1, hx, b0 - 2.6, -1, jid);
    px.poly([[hx + 1.2, c0 + 3], [hx + 3.8, c0 + 3], [hx + 3.8, c0 + 5.6], [hx + 1.2, c0 + 5.6]], PATCH, 4.1, { noSeam: true });
  }

  // the arms: from the shoulder (a jerkin-shoulder knob) down to each fist on the spear
  const arm = (side, hd, zA) => {
    const shp = [side * 4.4 + sx, chY - 1.6 + (side === rs ? tilt : -tilt) * 0.4], el = [(shp[0] + hd[0]) / 2 + side * 1.4, (shp[1] + hd[1]) / 2 + 0.6];
    px.part();
    px.ellipse(shp[0] - side * 0.2, shp[1] + 0.2, 2.5, 2.3, JERK, zA - 0.1, { cast: 0, bias: 1 });
    px.part();
    px.capsule(shp[0], shp[1] + 0.6, 1.7, el[0], el[1], 1.6, SKIN, zA, { cast: 1 });
    px.capsule(el[0], el[1], 1.6, hd[0], hd[1], 1.5, SKIN, zA, { cast: 1 });
    const n0 = mix(el, hd, 0.62), n1 = mix(el, hd, 0.74);
    px.capsule(n0[0], n0[1], 1.65, n1[0], n1[1], 1.65, DARK, zA + 0.05, { cast: 1 });
    px.part();
    px.ellipse(hd[0], hd[1], 1.8, 1.8, SKIN, zA + 0.3);
  };
  arm(ls, hdL, 8.4); arm(rs, hdR, 8.5);

  // the head
  px.part();
  if (s > 0) px.stamp(p.blink ? BLINK : FRONT_H, hx, hy, LEG, 6, { ax: 6, ay: 9, ball: [6.5, 6, 7, 7], cast: 1 });
  else px.stamp(BACK_H, hx, hy, LEG, 6.4, { ax: 6, ay: 9, ball: [6.5, 6, 7, 7], cast: 1 });
  return {};
};

const walk = { ...SIDE.walk };
export const BOX = { w: 64, h: 60, ox: 32, oy: 50 };
export const FRONT = { NAME: "rafter-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "rafter-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
