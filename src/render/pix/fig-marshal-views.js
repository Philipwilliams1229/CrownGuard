// ============ CONCEPT FIGURES: the Lord Marshal seen from the FRONT and from BEHIND ============
// Same figure as fig-marshal.js (blued plate edged in brass, crowned great helm with the long off-white
// plume, spiked layered pauldrons, the oxblood cape with its brass hem, the war-banner lance) walking
// toward the camera (FRONT) and away (BACK), in the pattern of fig-goblin-views.js: one drawer,
// s = +1 front, -1 back. The lance is carried upright across the body in both fists: his RIGHT fist
// (the side's near arm) above, his LEFT below, the shaft just to his right (screen LEFT in front,
// screen RIGHT behind: `rs`), the banner hanging outward from it. FRONT: visor slit and pale eyes, the
// tower on his breast, the plume rising behind the helm. BACK: the cape is the figure, the plume
// streams down it. Unflipped, one sun upper left. Walk = the side clip's own (n, ms, pose); feet,
// bob and hand heights are read from the solved pose. Forward is DOWN the screen in front, UP behind.
import { mat, flat } from "./pix.js";
import { ik } from "./rig.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-marshal.js";

const SKIN = mat("#e0b088"), EYE = flat("#dde8ff", { emis: true });
const PLATE = mat("#646a78", { contrast: 1.3 }), PLATEK = mat("#3a3e4a", { contrast: 1.15 }), STEELB = mat("#c4c8d0", { contrast: 1.3 }), IRON = mat("#6c7280", { contrast: 1.25 });
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), CAPE = mat("#6a2226", { contrast: 1.1 }), PAD = mat("#4e4a58"), LEATHER = mat("#4a3020"), WOOD = mat("#5a4028", { contrast: 1.15 });
const BRASS = mat("#c8a040", { contrast: 1.25 }), HOSE = mat("#34363f", { floor: 1 }), GREY = mat("#a8aeb8", { contrast: 1.2 }), PLUME = mat("#e8e0cc", { contrast: 1.15 });
const LEG = { M: { m: PLATE }, W: { m: PLATE, bias: 1 }, m: { m: PLATEK }, K: { m: BRASS }, Y: { m: BRASS, bias: 1 }, E: { m: EYE } };
// FRONT: crown points, brass band, the visor slit (m) with pale eyes (E) in it, breath vents, brass base. 17 wide, centre col 8.
const FRONT_H = [
  "..Y..Y..Y..Y..Y..",
  ".KKKKKKKKKKKKKKK.",
  ".MMMMMMMMMMMMMMM.",
  ".MWWMMMMMMMMMMMm.",
  ".MWMMMMMMMMMMMMm.",
  ".MWMMMMMMMMMMMMm.",
  ".MMMMMMMMMMMMMMm.",
  ".MMmmmmmmmmmmmMM.",
  ".MMmEEmmmmmEEmMM.",
  ".MMmmmmmmmmmmmMM.",
  ".MMMMMMMMMMMMMMm.",
  ".MMMMMmMmMmMMMMm.",
  ".MMMMMMMMMMMMMMm.",
  "..MMMMMMMMMMMMm..",
  "..KKKKKKKKKKKKK..",
  "...mmmmmmmmmmm...",
];
// BACK: the helm's back, a seam, two brass straps, the crown points; the plume is drawn over it.
const BACK_H = [
  "..Y..Y..Y..Y..Y..",
  ".KKKKKKKKKKKKKKK.",
  ".MMMMMMMmMMMMMMM.",
  ".MWWMMMMmMMMMMMm.",
  ".MWMMMMMmMMMMMMm.",
  ".KKKKKKKKKKKKKKK.",
  ".MMMMMMMmMMMMMMm.",
  ".MWMMMMMmMMMMMMm.",
  ".MWMMMMMmMMMMMMm.",
  ".MMMMMMMmMMMMMMm.",
  ".KKKKKKKKKKKKKKK.",
  ".MMMMMMMmMMMMMMm.",
  ".MMMMMMMmMMMMMMm.",
  "..MMMMMMmMMMMMm..",
  "..KKKKKKKKKKKKK..",
  "...mmmmmmmmmmm...",
];

const FWD = 0.4, TAU = Math.PI * 2, cl = (v, a, b) => Math.max(a, Math.min(b, v)), UP = SIDE_BONES.upper, FO = SIDE_BONES.fore;

const make = (s) => (px, F) => {
  const rs = -s, ls = s, { sk, ph } = F, { p, P, C, N } = sk;
  const sw = (t) => rs * 0.8 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const vx = cl((sx - sx1) * 1.4, -2.4, 2.4), vx2 = cl((sx1 - sx2) * 1.4, -2.4, 2.4), vy = cl(C[1] - F.lag1.C[1], -2, 2);
  const hipY = P[1], chY = C[1], shY = chY + 0.9, hy = Math.round(N[1]) - 1, hx = Math.round(sx * 0.7), fl = p.flut || 0;
  const hemY = hipY + 9;

  // ---- the cape: behind everything in front (its sides and hem show round him); over his back from behind
  const cs = cl(-vx * 1.8 - vx2 * 1.2 + fl * 0.6, -3, 3), bot = s > 0 ? -2 : -6.5;
  px.part(); const cid = px._pid;
  const hw = s > 0 ? 11 : 10.6, sc = (k) => hx + k;
  px.poly([[sx - 6.8, chY - 4.6], [sx + 6.8, chY - 4.6], [sx + 8.6, chY + 6], [sc(hw + cs), bot - 1], [sc(hw * 0.5 + cs * 0.7), bot + 1.4], [sc(cs * 0.4), bot - 0.8], [sc(-hw * 0.5 + cs * 0.7), bot + 1.4], [sc(-hw + cs), bot - 1], [sx - 8.6, chY + 6]], CAPE, s > 0 ? 0.5 : 4.5, { round: 0.85, cast: 1 });
  px.toneLine(sx - 4, chY - 2, hx - 7 + cs, bot - 3, -1, cid);
  px.toneLine(sx + 1, chY, hx + 1 + cs * 0.6, bot - 3, 1, cid);
  px.toneLine(sx + 5, chY + 2, hx + 7 + cs * 0.8, bot - 3, -1, cid);
  px.line(hx - hw + cs + 1, bot - 1.4, hx + hw + cs - 1, bot - 1.4, BRASS, s > 0 ? 0.52 : 4.52, { noLine: true });
  if (s < 0) { px.part(); px.rect(sx - 2.4, chY - 4, 1.6, 2, BRASS, 4.6, { fix: 3 }); px.rect(sx + 0.8, chY - 4, 1.6, 2, BRASS, 4.6, { fix: 3 }); }

  // ---- the legs: hose with plate wrapped over, foot toward / away; each hangs whole from the hip to its sabaton
  const leg = (h, k, an, z, b, front) => {
    px.body(1);
    px.limb([h, k, an], [3.5, 3.1, 2.5], HOSE, z, { bias: b, floor: 1 });
    px.capsule(h[0] * 0.62 + k[0] * 0.38, h[1] * 0.62 + k[1] * 0.38, 3.6, h[0] * 0.18 + k[0] * 0.82, h[1] * 0.18 + k[1] * 0.82, 3.3, PLATE, z + 0.01, { bias: b, wrap: true });
    px.capsule(k[0], k[1], 2.7, an[0], an[1] - 1, 2.4, PLATE, z + 0.02, { bias: b, wrap: true });
    if (front) {
      px.ellipse(k[0], k[1], 3, 2.6, PLATE, z + 0.04, { bias: b, weld: 2 });
      px.dot(k[0] + 0.8, k[1] - 0.8, STEELB, z + 0.05, { fix: 4 });
      px.line(k[0] - 3, k[1] + 0.2, k[0] + 3, k[1] + 0.2, BRASS, z + 0.06, { noLine: true });
    }
    px.capsule(k[0] * 0.3 + an[0] * 0.7, k[1] * 0.3 + an[1] * 0.7, 2.8, an[0], an[1], 2.5, PLATEK, z + 0.03, { bias: b, wrap: true });
    px.ellipse(an[0], an[1] + 1.4, 3.2, 2.4, PLATEK, z + 0.04, { bias: b, weld: 2 });
    px.body(0);
  };
  for (const [f, side, z, b] of [[p.fF, ls, 2, -1], [p.fN, rs, 3, 0]]) {
    const h = [hx + side * 3.4, hipY + 1], an = [hx + side * 3.8, -3.6 + s * f[0] * FWD - f[1] * 0.8];
    const k = [(h[0] + an[0]) / 2 + side * 0.9, (h[1] + an[1]) / 2 - f[1] * 0.3];
    leg(h, k, an, z, b, s > 0);
  }

  // ---- front only: the breastplate, tassets, the surcoat's dagged skirt, the belt, the great tower on his breast
  if (s > 0) {
    px.part(); const sc2 = px._pid;
    const hm = [[hx + 7.4, hemY - 0.8], [hx + 4.6, hemY + 2.4], [hx + 2.2, hemY - 0.6], [hx - 0.4, hemY + 2.4], [hx - 2.8, hemY - 0.6], [hx - 5, hemY + 2.4], [hx - 7.4, hemY - 0.8]];
    px.poly([[sx - 5.4, chY + 1], [sx + 5.4, chY + 1], [sx + 6.8, chY + 5], [hx + 6.6, hipY - 3], ...hm, [hx - 6.6, hipY - 3], [sx - 6.8, chY + 5]], OX, 4.02, { round: 0.92, cast: 2 });
    px.toneLine(hx + 2.6, hipY - 2, hx + 2.6, hemY - 1.8, -1, sc2);
    px.toneLine(hx - 2.8, hipY - 2, hx - 3, hemY - 1.8, 1, sc2);
    px.line(hx - 6.6, hemY - 1.4, hx + 6.6, hemY - 1.4, BRASS, 4.04);
    px.part(); const cu = px._pid;
    px.poly([[sx - 6.6, chY - 3], [sx + 6.6, chY - 3], [sx + 7.8, chY + 4], [hx + 6.8, hipY - 1], [hx + 6.6, hipY + 3.6], [hx - 6.6, hipY + 3.6], [hx - 6.8, hipY - 1], [sx - 7.8, chY + 4]], PLATE, 4.06, { round: 0.92, cast: 2 });
    px.toneLine(sx + 0.6, chY + 1, hx + 0.6, hipY, -1, cu);
    px.line(sx, chY - 2.6, sx, chY + 1.6, BRASS, 4.08, { noLine: true });
    px.part(); px.rect(sx + 0.6, chY + 2.4, 5.2, 5, GREY, 4.1, { fix: 3 });
    for (const dx of [0.6, 2.6, 4.6]) px.dot(sx + dx + 0.8, chY + 1.4, GREY, 4.1, { fix: 3 });
    px.rect(sx + 2.6, chY + 5, 1.4, 2.4, OXK, 4.12, { noLine: true });
    px.part();
    px.poly([[hx - 7, hipY - 5.6], [hx + 7, hipY - 5.6], [hx + 7, hipY - 3.2], [hx - 7, hipY - 3.2]], LEATHER, 4.15, { round: 0.92 });
    px.rect(hx - 1.5, hipY - 5.8, 3, 2.8, BRASS, 4.16, { fix: 3 });
    px.part(); px.line(hx + rs * 6.2, hipY - 4, hx + rs * 7.4 - vx * 0.4, hipY + 6, LEATHER, 4.17, { noLine: true }); px.ellipse(hx + rs * 6, hipY - 4.4, 1.5, 1.5, BRASS, 4.18);
  } else {
    px.part();
    px.poly([[hx - 6.6, hipY - 5.6], [hx + 6.6, hipY - 5.6], [hx + 6.6, hipY - 3.2], [hx - 6.6, hipY - 3.2]], LEATHER, 4.6, { round: 0.92 });
    px.part(); px.line(hx + rs * 6, hipY - 4, hx + rs * 4.6 + vx * 0.4, hipY + 6, LEATHER, 4.62, { noLine: true });    // the scabbard's tip past the hip, angled down
  }
  // the gorget, brass edged
  px.part();
  px.poly([[sx - 6.4, chY - 4.4], [sx + 6.4, chY - 4.4], [sx + 7.2, chY - 0.4], [sx - 7.2, chY - 0.2]], PLATE, 5, { round: 0.9, cast: 1 });
  px.line(sx - 6.8, chY - 0.2, sx + 6.8, chY - 0.2, BRASS, 5.05, { noLine: true });

  // ---- the plume and the great helm
  const tr = cl(-vx * 2.2 - vx2 * 1.4 + fl * 0.8, -3.6, 3.6), dr = cl(-vy * 1.4, -1.6, 2);
  if (s > 0) {
    px.part();
    px.poly([[hx - 3, hy - 13.4], [hx + 3, hy - 13.4], [hx + 4 + tr * 0.3, hy - 17], [hx + 8 + tr, hy - 22 + dr], [hx + 3, hy - 24 + dr], [hx - 3 + tr * 0.4, hy - 23.4 + dr], [hx - 5 + tr * 0.6, hy - 19 + dr], [hx - 4, hy - 15.4]], PLUME, 5.8, { round: 0.8, cast: 1 });
    px.toneLine(hx - 1, hy - 14, hx - 2 + tr * 0.6, hy - 23, -1, px._pid);
  }
  px.part();
  px.stamp(s > 0 ? FRONT_H : BACK_H, hx, hy, LEG, 9.6, { ax: 8, ay: 14, cast: 2, ball: [8.5, 7, 8.5, 8] });
  if (s > 0) px.dot(hx - 3, hy - 9, STEELB, 6.1, { fix: 4 });
  else {
    // the plume from behind: it falls from the crown down the back of the helm and over the cape
    px.part(); const pid = px._pid;
    px.poly([[hx - 2.4, hy - 14.6], [hx + 2.4, hy - 14.6], [hx + 3.4 + tr * 0.3, hy - 8], [hx + 3.2 + tr * 0.8, hy + 4], [hx + 2.4 + tr * 1.2, hy + 14 + dr], [hx + tr * 1.3, hy + 17 + dr], [hx - 2.4 + tr * 1.2, hy + 14 + dr], [hx - 3.2 + tr * 0.8, hy + 4], [hx - 3.4 + tr * 0.3, hy - 8]], PLUME, 9.7, { round: 0.8, cast: 1 });
    px.toneLine(hx - 1, hy - 13, hx - 1 + tr, hy + 15, -1, pid);
    px.toneLine(hx + 2.4, hy - 10, hx + 2.4 + tr * 0.9, hy + 12, 1, pid);
  }

  // ---- the war-banner lance, upright across the body just to his right; the banner hangs outward
  const nearY = shY + 5.2 + (hipY - P[1]) + (p.hy || 0) * 0 + s * (p.aN[0] - 0.9) * 0.3;
  const lx = sx + rs * 5.6, buttY = nearY + 28, topY = buttY - 66, farY = nearY + 10;
  px.part();
  px.capsule(lx, buttY, 1.2, lx, topY, 1.2, WOOD, 7, { edge: true });
  px.capsule(lx, buttY, 1.5, lx, buttY - 2.4, 1.5, IRON, 7.01);
  px.capsule(lx, topY + 3.4, 1.7, lx, topY + 1.4, 1.7, BRASS, 7.04);
  px.poly([[lx, topY + 1], [lx + 2.6, topY - 0.6], [lx + 2.4, topY - 7], [lx, topY - 12], [lx - 2.4, topY - 7], [lx - 2.6, topY - 0.6]], STEELB, 7.06, { n: [0.1, 0.1, 0.95] });
  px.line(lx, topY - 1, lx, topY - 10.4, IRON, 7.07, { fix: 1, noLine: true });
  const barY = topY + 5, ff = cl(vx * 2 + fl, -3, 3);
  px.part();
  px.line(lx, barY, lx + rs * 15, barY, BRASS, 7.05, { noLine: true });
  const pt = (a, b) => [lx + rs * b, barY + 0.6 + a];
  px.part(); const bid = px._pid;
  px.poly([pt(0, 0.6), pt(0, 15), pt(15 + ff * 0.5, 16 + ff * 0.4), pt(21, 14.4 + ff * 0.6), pt(15.4, 10 + ff * 0.4), pt(20, 6 + ff * 0.3), pt(15, 0.8)], OX, 7.08, { round: 0.5, cast: 1 });
  px.toneLine(...pt(2, 2), ...pt(14, 12 + ff), -1, bid);
  px.line(...pt(0.6, 1.4), ...pt(0.6, 14.4), BRASS, 7.1, { noLine: true });
  px.line(...pt(15.6, 1), ...pt(19.4, 6 + ff * 0.3), BRASS, 7.1, { noLine: true });
  px.part();
  const tx = pt(8, 8);
  if (s > 0) {
    px.rect(tx[0] - 2.6, tx[1] - 2.8, 5.2, 5.6, GREY, 7.12, { fix: 3 });
    for (const dx of [-2.6, -0.6, 1.4]) px.dot(tx[0] + dx, tx[1] - 3.8, GREY, 7.12, { fix: 3 });
    px.rect(tx[0] - 0.6, tx[1] + 0.4, 1.2, 2.4, OXK, 7.13, { noLine: true });
  } else px.rect(tx[0] - 2.6, tx[1] - 2.8, 5.2, 5.6, OXK, 7.12, { noLine: true });

  // ---- the arms over the plate: near fist high on the shaft, far fist below it (reached across the body)
  const arm = (side, hand, z, tone, flipElbow) => {
    const sh = [sx + side * 7.6, shY + 0.3], r = ik(sh[0], sh[1], hand[0], hand[1], UP, FO, flipElbow);
    const el = r.mid; px.body(1);
    px.limb([sh, el, r.end], [3, 2.7, 2.35], PAD, z, { bias: tone });
    px.capsule(el[0], el[1], 2.7, r.end[0], r.end[1], 2.3, PLATE, z + 0.01, { wrap: true });
    px.ellipse(el[0], el[1], 2.7, 2.7, PLATE, z + 0.05, { weld: 2 });
    px.ellipse(hand[0], hand[1], 2.4, 2.4, PLATEK, z + 0.2, { weld: 2 }); px.body(0);
  };
  if (s > 0) arm(ls, [lx, farY], 8, -1, rs > 0 ? 1 : -1);
  else {
    // from behind his left arm hangs at his side, swinging forward; only its upper and lower plate show, the hand is in front of him
    const sh = [sx + ls * 7.6, shY + 0.3], el = [sx + ls * 10, shY + 8.6], wr = [sx + ls * 9, shY + 15.6 + (p.aF[0] - 0.9) * -3];
    px.part(); px.body(1);
    px.limb([sh, el, wr], [3, 2.7, 2.3], PAD, 8, { bias: -1 });
    px.capsule(el[0], el[1], 2.7, wr[0], wr[1], 2.3, PLATE, 8.01, { wrap: true });
    px.ellipse(el[0], el[1], 2.7, 2.7, PLATE, 8.05, { weld: 2 }); px.body(0);
  }      // from behind only his left fist shows on the shaft
  px.tag("nearArm"); arm(rs, [lx, nearY], 9, 0, rs > 0 ? -1 : 1); px.tag(null);
  // the pauldrons: two layers, spiked, brass-edged, on BOTH shoulders
  for (const side of [rs, ls]) {
    px.part();
    const ox = sx + side * 9.4;
    for (const [k, dz, dy] of [[1, 0, 0], [0.74, 0.02, 3]]) px.ellipse(ox, shY + 2 + dy * 0.8, 5.2 * k, 4.4 * k, PLATE, 9.3 + dz, { cast: 1 });
    px.line(ox - 4.6, shY + 4, ox + 4.6, shY + 4, BRASS, 9.35, { noLine: true });
    px.poly([[ox - 1.2, shY - 1.8], [ox + 1.4, shY - 1.8], [ox + 0.2 + side * 0.6, shY - 5.6]], STEELB, 9.4, { cast: 0 });
    px.dot(ox + 2.2, shY + 1.4, STEELB, 9.42, { fix: 4 }); px.dot(ox - 2.6, shY + 1.8, STEELB, 9.42, { fix: 4 });
  }
  return {};
};

// ---- BACK on the BACK stack (art/briefs/views-artist.md): the lance behind him (z 1.0, upright outside the helm's columns,
// through his right fist), legs 2-3, fists 3.6, both arms hanging at 4.3 (cast 0), what lies on his back (cape, gorget,
// pauldrons) 5.0+, helm 6.0 and the plume over it. His left hand is in front of him: only that arm's plate shows.
const back = (px, F) => {
  const rs = 1, ls = -1, s = -1, { sk, ph } = F, { p, P, C, N } = sk;
  const sw = (t) => 0.8 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const vx = cl((sx - sx1) * 1.4, -2.4, 2.4), vx2 = cl((sx1 - sx2) * 1.4, -2.4, 2.4), vy = cl(C[1] - F.lag1.C[1], -2, 2);
  const hipY = P[1], chY = C[1], shY = chY + 0.9, hy = Math.round(N[1]) - 1, hx = Math.round(sx * 0.7), fl = p.flut || 0;
  const sw1 = (v) => cl(v, -1.2, 1.2);
  const nearY = shY + 11 + sw1(-(p.aN[0] - 0.9) * 3);
  const lx = sx + 11.6, buttY = nearY + 24, topY = buttY - 66;
  // the lance and its banner, lowest of all
  px.part();
  px.capsule(lx, buttY, 1.2, lx, topY, 1.2, WOOD, 1.0);
  px.capsule(lx, buttY, 1.5, lx, buttY - 2.4, 1.5, IRON, 1.01);
  px.capsule(lx, topY + 3.4, 1.7, lx, topY + 1.4, 1.7, BRASS, 1.04);
  px.poly([[lx, topY + 1], [lx + 2.6, topY - 0.6], [lx + 2.4, topY - 7], [lx, topY - 12], [lx - 2.4, topY - 7], [lx - 2.6, topY - 0.6]], STEELB, 1.06, { n: [0.1, 0.1, 0.95] });
  const barY = topY + 5, ff = cl(vx * 2 + fl, -3, 3);
  px.part(); px.line(lx, barY, lx + 15, barY, BRASS, 1.05, { noLine: true });
  const pt = (a, b) => [lx + b, barY + 0.6 + a];
  px.part(); const bid = px._pid;
  px.poly([pt(0, 0.6), pt(0, 15), pt(15 + ff * 0.5, 16 + ff * 0.4), pt(21, 14.4 + ff * 0.6), pt(15.4, 10 + ff * 0.4), pt(20, 6 + ff * 0.3), pt(15, 0.8)], OX, 1.08, { round: 0.5, cast: 0 });
  px.toneLine(...pt(2, 2), ...pt(14, 12 + ff), -1, bid);
  px.line(...pt(0.6, 1.4), ...pt(0.6, 14.4), BRASS, 1.1, { noLine: true });
  px.line(...pt(15.6, 1), ...pt(19.4, 6 + ff * 0.3), BRASS, 1.1, { noLine: true });
  const tx = pt(8, 8); px.part(); px.rect(tx[0] - 2.6, tx[1] - 2.8, 5.2, 5.6, OXK, 1.12, { noLine: true });

  // legs under the cape
  const leg = (h, k, an, z, b) => {
    px.body(1);
    px.limb([h, k, an], [3.5, 3.1, 2.5], HOSE, z, { bias: b, floor: 1 });
    px.capsule(h[0] * 0.62 + k[0] * 0.38, h[1] * 0.62 + k[1] * 0.38, 3.6, h[0] * 0.18 + k[0] * 0.82, h[1] * 0.18 + k[1] * 0.82, 3.3, PLATE, z + 0.01, { bias: b, wrap: true });
    px.capsule(k[0], k[1], 2.7, an[0], an[1] - 1, 2.4, PLATE, z + 0.02, { bias: b, wrap: true });
    px.capsule(k[0] * 0.3 + an[0] * 0.7, k[1] * 0.3 + an[1] * 0.7, 2.8, an[0], an[1], 2.5, PLATEK, z + 0.03, { bias: b, wrap: true });
    px.ellipse(an[0], an[1] + 1.4, 3.2, 2.4, PLATEK, z + 0.04, { bias: b, weld: 2 });
    px.body(0);
  };
  for (const [f, side, z, b] of [[p.fF, ls, 2, -1], [p.fN, rs, 3, 0]]) {
    const h = [hx + side * 3.4, hipY + 1], an = [hx + side * 3.8, -3.6 + s * f[0] * FWD - f[1] * 0.8];
    leg(h, [(h[0] + an[0]) / 2 + side * 0.9, (h[1] + an[1]) / 2 - f[1] * 0.3], an, z, b);
  }
  // belt, scabbard's tip past the hip, angled down
  px.part(); px.poly([[hx - 6.6, hipY - 5.6], [hx + 6.6, hipY - 5.6], [hx + 6.6, hipY - 3.2], [hx - 6.6, hipY - 3.2]], LEATHER, 4.0, { round: 0.92 });
  px.part(); px.line(hx + 6, hipY - 4, hx + 8.4 + vx * 0.4, hipY + 6, LEATHER, 4.02, { noLine: true });

  // both arms hang at his sides (z 4.3): the right to the lance's fist, the left only to the wrist (its hand is in front of him)
  const armR = () => {
    const sh = [sx + 7.6, shY + 0.3], hand = [lx, nearY], r = ik(sh[0], sh[1], hand[0], hand[1], UP, FO, -1), el = [Math.max(r.mid[0], sh[0] + 1.6), r.mid[1]];
    px.part(); px.body(1);
    px.limb([sh, el, hand], [3, 2.7, 2.35], PAD, 4.3, { cast: 0 });
    px.capsule(el[0], el[1], 2.7, hand[0], hand[1], 2.3, PLATE, 4.31, { wrap: true, cast: 0 });
    px.body(0); px.part(); px.ellipse(hand[0], hand[1], 1.5, 1.5, PLATEK, 3.6);
  };
  const armL = () => {
    const sh = [sx - 7.6, shY + 0.3], el = [sx - 10.2, shY + 8.4], wr = [sx - 9.6, shY + 14.4 + sw1(-(p.aF[0] - 0.9) * 3)];
    px.part(); px.body(1);
    px.limb([sh, el, wr], [3, 2.7, 2.3], PAD, 4.3, { cast: 0 });
    px.capsule(el[0], el[1], 2.7, wr[0], wr[1], 2.3, PLATE, 4.31, { wrap: true, cast: 0 });
    px.ellipse(el[0], el[1], 2.7, 2.7, PLATE, 4.34, { weld: 2 }); px.body(0);
  };
  armL(); armR();

  // the cape over his back, the gorget, the pauldrons, the helm and the plume
  const cs = cl(-vx * 1.8 - vx2 * 1.2 + fl * 0.6, -3, 3), bot = -6.5, hw = 10.6;
  px.part(); const cid = px._pid;
  px.poly([[sx - 6.8, chY - 4.6], [sx + 6.8, chY - 4.6], [sx + 8.6, chY + 6], [hx + hw + cs, bot - 1], [hx + hw * 0.5 + cs * 0.7, bot + 1.4], [hx + cs * 0.4, bot - 0.8], [hx - hw * 0.5 + cs * 0.7, bot + 1.4], [hx - hw + cs, bot - 1], [sx - 8.6, chY + 6]], CAPE, 5, { round: 0.85, cast: 1, edge: true });
  px.toneLine(sx - 4, chY - 2, hx - 7 + cs, bot - 3, -1, cid);
  px.toneLine(sx + 1, chY, hx + 1 + cs * 0.6, bot - 3, 1, cid);
  px.toneLine(sx + 5, chY + 2, hx + 7 + cs * 0.8, bot - 3, -1, cid);
  px.line(hx - hw + cs + 1, bot - 1.4, hx + hw + cs - 1, bot - 1.4, BRASS, 5.02, { noLine: true });
  px.part();
  px.poly([[sx - 6.4, chY - 4.4], [sx + 6.4, chY - 4.4], [sx + 7.2, chY - 0.4], [sx - 7.2, chY - 0.2]], PLATE, 5.1, { round: 0.9, cast: 1, edge: true });
  px.line(sx - 6.8, chY - 0.2, sx + 6.8, chY - 0.2, BRASS, 5.15, { noLine: true });
  px.part(); px.rect(sx - 2.4, chY - 4, 1.6, 2, BRASS, 5.2, { fix: 3 }); px.rect(sx + 0.8, chY - 4, 1.6, 2, BRASS, 5.2, { fix: 3 });
  for (const side of [rs, ls]) {
    px.part();
    const ox = sx + side * 9.4;
    for (const [k, dz, dy] of [[1, 0, 0], [0.74, 0.02, 3]]) px.ellipse(ox, shY + 2 + dy * 0.8, 5.2 * k, 4.4 * k, PLATE, 5.3 + dz, { cast: 1, edge: true });
    px.line(ox - 4.6, shY + 4, ox + 4.6, shY + 4, BRASS, 5.35, { noLine: true });
    px.poly([[ox - 1.2, shY - 1.8], [ox + 1.4, shY - 1.8], [ox + 0.2 + side * 0.6, shY - 5.6]], STEELB, 5.4, { cast: 0 });
    px.dot(ox + 2.2, shY + 1.4, STEELB, 5.42, { fix: 4 }); px.dot(ox - 2.6, shY + 1.8, STEELB, 5.42, { fix: 4 });
  }
  const tr = cl(-vx * 2.2 - vx2 * 1.4 + fl * 0.8, -3.6, 3.6), dr = cl(-vy * 1.4, -1.6, 2);
  px.part();
  px.stamp(BACK_H, hx, hy, LEG, 6, { ax: 8, ay: 14, cast: 2, ball: [8.5, 7, 8.5, 8] });
  px.part(); const pid = px._pid;
  px.poly([[hx - 2.4, hy - 14.6], [hx + 2.4, hy - 14.6], [hx + 3.4 + tr * 0.3, hy - 8], [hx + 3.2 + tr * 0.8, hy + 4], [hx + 2.4 + tr * 1.2, hy + 14 + dr], [hx + tr * 1.3, hy + 17 + dr], [hx - 2.4 + tr * 1.2, hy + 14 + dr], [hx - 3.2 + tr * 0.8, hy + 4], [hx - 3.4 + tr * 0.3, hy - 8]], PLUME, 6.5, { round: 0.8, cast: 1 });
  px.toneLine(hx - 1, hy - 13, hx - 1 + tr, hy + 15, -1, pid);
  px.toneLine(hx + 2.4, hy - 10, hx + 2.4 + tr * 0.9, hy + 12, 1, pid);
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "marshal-front", BOX: { w: 72, h: 114, ox: 36, oy: 106 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "marshal-back", BOX: { w: 72, h: 114, ox: 36, oy: 106 }, BONES: SIDE_BONES, draw: back, CLIPS: { walk } };
