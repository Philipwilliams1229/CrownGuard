// ============ the Rime berserker seen from the FRONT and from BEHIND (types berserker, berserkerRage) ============
// One drawer, `make(s)`: s = +1 FRONT, -1 BACK (as fig-goblin-views.js). Gear is the side figure's (fig-berserker.js):
// bare woad-striped chest, fur kilt, the great shaggy bear mantle with forepaws hanging, a bear-skull helm crowned with
// antlers, forked red mane-beard, an axe in each fist. o.variant "rage": flushed skin, white-hot eyes, brighter mane,
// the mouth bared, a haze of red sparks. Owner's rule: from BEHIND the axes are hidden by him (fists and haft butts only);
// in FRONT they stand up out of his fists, blades out to both sides. His RIGHT hand is screen LEFT in front.
// Shares `kit`, `legs`, `daneAxe`, `backGrip` with fig-thrall-views.js. Unflipped; one sun, upper left.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-berserker.js";
import { kit, legs, daneAxe, backGrip, mix } from "./fig-thrall-views.js";

const SKIN = mat("#dca584"), SKINR = mat("#e48a6a"), PELT = mat("#4a4048"), PELT_D = mat("#2e2830"), PELTF = mat("#4a5a70"), WRAP = mat("#b09468"), TIP = mat("#a8a8b0"), LEATHER = mat("#4a382c");
const MANE = mat("#b8603a"), MANER = mat("#d8582e"), BONE = mat("#ece0c4"), IRON = mat("#5e646e"), BRASS = mat("#c8a040");
const WOAD = flat("#5a8ac8"), WOADR = flat("#4a6ed0"), EYE = flat("#2a1c2c"), EYER = flat("#fff4d0", { emis: true, line: "#e8402a" });
const HAZE = flat("#ff5a3a", { emis: true, line: "#c82a1a" }), HAZE2 = flat("#ffa060", { emis: true, line: "#d84a2a" }), NOSE = flat("#2a1a1c");

// FRONT: the bone skull over the brow with a muzzle ridge down the middle, dark orbits, woad cheeks, a forked mane-beard.
const FRONT_H = [
  "....KKKKK....",
  "..KKKKKKKKK..",
  ".KKKKKkKKKKK.",
  ".KKKKKkKKKKK.",
  ".KbbbbkbbbbK.",
  ".RSSESKSESSR.",
  ".RSSESKSESSR.",
  ".RWSSSkSSSWR.",
  ".RRSSSZSSSRR.",
  ".RRRRRRRRRRR.",
  ".RRRRRRRRRRR.",
  "..RRRRRRRRR..",
  "..RRRR.RRRR..",
  "...RR...RR...",
];
const BLINK = FRONT_H.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : r));
const ROAR = FRONT_H.map((r, i) => (i === 9 ? ".RTTTTTTTTTR." : r));
// BACK: the skull's dome, its seam, the mane spilling out beneath it.
const BACK_H = [
  "....KKKKK....",
  "..KKKKKKKKK..",
  ".KKKKKkKKKKK.",
  ".KKKKKkKKKKK.",
  ".KKKKKkKKKKK.",
  ".KRRRRrRRRRK.",
  ".RRRRRrRRRRR.",
  ".RRRRRrRRRRR.",
  "..RRRRrRRRR..",
  "...RRRrRRR...",
];
const legend = (rage) => ({
  K: { m: BONE }, k: { m: BONE, bias: -1 }, b: { m: PELT_D, fix: 2 }, S: { m: rage ? SKINR : SKIN }, s: { m: rage ? SKINR : SKIN, bias: -1 },
  E: { m: rage ? EYER : EYE }, W: { m: rage ? WOADR : WOAD, fix: 0 }, R: { m: rage ? MANER : MANE }, r: { m: rage ? MANER : MANE, bias: -1 },
  T: { m: BONE, fix: 3 }, Z: { m: NOSE },
});
const LEG = { false: legend(false), true: legend(true) };

const make = (s) => (px, F, o = {}) => {
  const K = kit(s, F, 0.7), { rs, ls, p, sx, hx, hy, hipY, chY, vx, vx2, vy, ph } = K;
  const rage = o.variant === "rage", skin = rage ? SKINR : SKIN, wd = rage ? WOADR : WOAD, shY = chY + 0.2;

  // the antlers on the skull, out to both sides
  const ant = (x0, y0, dir, z) => {
    const pts = [[x0, y0, 1.7], [x0 + dir * 2.4, y0 - 4, 1.4], [x0 + dir * 4.6, y0 - 8, 1.1], [x0 + dir * 5.4, y0 - 12, 0.8]];
    px.part();
    for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
    px.capsule(pts[1][0], pts[1][1], 1, pts[1][0] + dir * 4.6, pts[1][1] - 2.4, 0.7, BONE, z, {});
    px.capsule(pts[2][0], pts[2][1], 0.9, pts[2][0] - dir * 1.2, pts[2][1] - 4, 0.6, BONE, z, {});
    px.capsule(pts[3][0], pts[3][1], 0.8, pts[3][0] + dir * 2.4, pts[3][1] - 2.8, 0.5, BONE, z, {});
  };
  ant(hx - 4.6, hy - 8.6, -1, 0.7);

  // the bear pelt down the back (the whole of what he shows from behind), ragged tail a beat behind
  if (s < 0) {
    const t1 = Math.max(-1.2, Math.min(1.2, -vx * 0.6 - vx2 * 0.4));
    px.part(); const pid = px._pid;
    px.poly([[hx - 5, hy + 1], [hx + 5, hy + 1], [sx + 9.6, chY + 3], [hx + 7.4, hipY - 1], [hx + 6.4 + t1 * 0.5, hipY + 3], [hx + 2 + t1, hipY + 4.4], [hx - 1.4 + t1, hipY + 2.6], [hx - 4.6 + t1, hipY + 4.6], [hx - 7 + t1 * 0.5, hipY + 1.4], [hx - 7.6, hipY - 1], [sx - 9.6, chY + 3]], PELT, 4.3, { round: 0.85, cast: 1 });
    px.toneLine(hx, hy + 3, hx + t1, hipY + 3, -1, pid);
    px.part();
    for (const [x, y] of [[-5, 4], [-2.4, 7], [2.6, 5], [5.4, 9], [-4, 12], [3.4, 13]]) px.dot(hx + x, chY + y, TIP, 4.32, { noLine: true });
  }

  // legs: fur-wrapped, hide boots
  legs(px, K, { hip: 2.6, foot: 4.2, ground: -2.4, w: [3.1, 2.5, 2], cloth: WRAP, boot: PELTF, bootAt: 0.5, cuff: null });

  // the trunk: a bare barrel of chest; woad across it; a fur kilt and belt
  const c0 = chY - 1.8;
  px.part(); const body = px._pid;
  px.poly([[sx - 7.4, c0], [sx + 7.4, c0], [sx + 8.4, chY + 3.6], [hx + 6.6, hipY - 3], [hx + 6.6, hipY + 0.4], [hx - 6.6, hipY + 0.4], [hx - 6.6, hipY - 3], [sx - 8.4, chY + 3.6]], skin, 4, { round: 0.92, cast: 1 });
  if (s > 0) {
    px.toneLine(sx, chY + 2.6, sx, chY + 7, -1, body);
    px.toneLine(sx - 6, chY + 7.2, sx - 0.6, chY + 7.6, -1, body);
    px.toneLine(sx + 0.6, chY + 7.6, sx + 6, chY + 7.2, -1, body);
    px.part();
    px.line(sx - 5.4, chY + 1, sx + 5.4, chY + 2.8, wd, 4.1, {});
    px.line(sx - 5, chY + 3.8, sx + 5, chY + 5.4, wd, 4.1, {});
    px.line(sx - 4, chY + 9, sx + 4, chY + 9.6, wd, 4.1, {});
  } else px.toneLine(sx, c0 + 1.5, hx, hipY - 3, -1, body);
  const kh = hipY + 5.2, kf = hx + 7 - vx * 0.8, kb = hx - 7 - vx * 1.4;
  px.part(); const kilt = px._pid;
  px.poly([[hx - 6.8, hipY - 2], [hx + 6.8, hipY - 2], [kf, kh - 1], [kf - 2.6, kh + 1], [hx - vx, kh - 0.4], [kb + 3.4, kh + 1.2], [kb, kh - 1]], PELTF, 4.2, { round: 0.85, cast: 1 });
  px.toneLine(hx + 1, hipY, hx - vx, kh - 1, -1, kilt);
  px.poly([[hx - 6.8, hipY - 3.2], [hx + 6.8, hipY - 3.2], [hx + 6.9, hipY - 1.2], [hx - 6.8, hipY - 1.2]], LEATHER, 4.25, { round: 0.9 });
  px.part();
  if (s > 0) px.rect(hx - 1.3, hipY - 3, 2.6, 2, BRASS, 4.3, { fix: 3 });
  else { px.dot(hx - 3.4, hipY - 2.2, BRASS, 4.3, { fix: 3 }); px.dot(hx + 3.4, hipY - 2.2, BRASS, 4.3, { fix: 3 }); }

  // both arms, bare with a brass band: the axe stands up out of each fist (from behind: fist and haft butt only)
  const arm = (side, ang, z) => {
    const hd = s > 0 ? [side * 10.4 + sx, shY + 10.6 + s * ang * 1.8] : [side * 9 + sx, hipY - 2 + ang * 1.4];
    const el = [side * 11 + sx, shY + (s > 0 ? 5.4 : 7.4)];
    px.part(); px.tag(side === rs ? "nearArm" : "farArm");
    px.capsule(sx + side * 6.2, shY + 0.8, 2.7, el[0], el[1], 2.3, skin, z, { cast: 1 });
    px.capsule(el[0], el[1], 2.3, hd[0], hd[1], 2.0, skin, z, { cast: 1 });
    const m0 = mix([sx + side * 6.2, shY], el, 0.72);
    px.capsule(m0[0], m0[1], 2.35, m0[0] + 0.3, m0[1] + 0.5, 2.35, BRASS, z + 0.03, { fix: 3 });
    const c0 = mix(el, hd, 0.62);
    px.capsule(c0[0], c0[1], 2.3, hd[0], hd[1], 2.1, LEATHER, z + 0.05, { cast: 1 });
    px.tag(null);
    daneAxe(px, { ...K, rs: side }, hd, 17, 1.4, z + 0.2, IRON, s < 0);
    px.part(); px.tag("nearHand");
    px.ellipse(hd[0], hd[1], 2.1, 2.5, skin, z + 0.4);
    px.tag(null);
  };
  arm(ls, p.aF[0], 7.6); arm(rs, p.aN[0], 7.9);

  // the great shaggy mantle over the shoulders with the forepaws hanging at both sides
  px.part();
  px.ellipse(sx + 0.2, chY + 0.4, 11, 5, PELT, 4.4, { cast: 1 });
  for (const x of [-9, -6, -3, 0, 3, 6, 9]) px.dot(sx + 0.2 + x, chY + 5 + ((x & 1) ? 0.8 : 0), PELT, 4.4);
  for (const x of [-5, -1, 3, 6]) px.dot(sx + x, chY - 3.2, TIP, 4.45, { noLine: true });
  for (const dx of [-8.8, 8.8]) {
    px.part(); px.capsule(sx + dx, chY + 2.6, 2.4, sx + dx * 1.03, chY + 9, 2, PELTF, 4.45, { cast: 1 });
    for (const q of [-1.2, 0.2, 1.4]) px.dot(sx + dx * 1.03 + q, chY + 10.4, BONE, 4.5, { fix: 3 });
  }

  // the head
  px.part();
  const leg = LEG[rage];
  if (s > 0) {
    px.stamp(p.blink ? BLINK : (p.roar > 0.5 || rage) ? ROAR : FRONT_H, hx, hy, leg, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
    px.part(); px.ellipse(hx, hy - 4.6, 1.8, 3.4, BONE, 6.5, { round: 0.7, cast: 1 }); px.dot(hx, hy - 1.6, NOSE, 6.55, { fix: 1 });      // the muzzle's end, a dark nose
  } else px.stamp(BACK_H, hx, hy, leg, 6.4, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  ant(hx + 4.6, hy - 8.8, 1, 6.6);

  if (rage) {
    const ft = ph * 6.283;
    for (let i = 0; i < 20; i++) {
      const a = i * 2.399 + ft * 0.4, rr = 13 + (i * 7 % 5) * 2.2, x = sx + Math.cos(a) * rr * 0.9, y = chY + 4 + Math.sin(a) * rr * 1.1 - ((i * 3 + ft * 2) % 5);
      px.dot(x, y, i % 3 ? HAZE : HAZE2, 19, { noLine: true });
    }
  }
  return {};
};

const walk = { ...SIDE.walk };
export const BOX = { w: 72, h: 96, ox: 36, oy: 84 };
export const FRONT = { NAME: "berserker-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "berserker-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
