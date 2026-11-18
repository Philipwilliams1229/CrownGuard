// ============ CONCEPT FIGURES: the Battle Chaplain seen from the FRONT and from BEHIND ============
// Same figure as fig-chaplain.js (cream alb to the ankle under an oxblood chasuble with a brass
// orphrey cross, mail sleeves and amice, a grey-bearded face under a tall iron-banded mitre over a
// mail coif, the flanged mace, the reliquary on its chain) walking toward the camera (FRONT) and
// away (BACK), in the pattern of fig-goblin-views.js: one drawer, s = +1 front, -1 back. His RIGHT
// fist (the side's near arm) holds the mace: screen LEFT in front, screen RIGHT behind (`rs`); the
// reliquary hangs from his LEFT fist (the side's far arm). Unflipped; one sun, upper left.
// From behind the mace is mostly hidden by the body (owner's rule): only its pommel shows below the
// fist at the hip. The walk is the side clip's own; hands, feet and bob are read from the solved pose.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-chaplain.js";

const CREAM = mat("#e0d8c4", { contrast: 1.0 }), CREAMK = mat("#b8ae94"), OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20", { floor: 1 });
const MAIL = mat("#7e8490", { contrast: 1.3 }), MAILK = mat("#545a66"), IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#2e3038", { contrast: 1.1 }), STEELB = mat("#c4c8d0", { contrast: 1.3 });
const SKIN = mat("#d8a888"), BEARD = mat("#c8c0b0", { contrast: 1.1 }), BROW = mat("#8a8478"), BRASS = mat("#c8a040", { contrast: 1.2 }), BOOT = mat("#2e2a2c", { floor: 1 });
const EYE = flat("#2a1c2c"), WIN = flat("#ffe8a0", { emis: true, line: "#a8803c" }), WINK = flat("#6a5a3a", { line: "#3a2e1c" });
const LEG = {
  C: { m: CREAM }, c: { m: CREAM, bias: -1 }, O: { m: OX }, I: { m: IRON }, B: { m: BEARD }, w: { m: MAIL }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  b: { m: BROW, fix: 1 }, E: { m: EYE }, m: { m: MAILK },
};
// FRONT: the tall mitre with its orphrey stripe, the iron band, mail coif at the cheeks, brows (b), dark eyes (E),
// a nose (N), the grey moustache and beard (B). 15 wide, centre col 7.
const FRONT_H = [
  ".......O.......",
  "......COC......",
  ".....CCOCC.....",
  "....CCCOCCC....",
  "...cCCCOCCCC...",
  "..cCCCCOCCCCC..",
  "..IIIIIOIIIII..",
  "..wwsbbSbbsww..",
  "..wwSESNSESww..",
  "..wwSSSNSSSww..",
  "..wwBBBSBBBww..",
  "..wwBBBBBBBww..",
  "...wBBBBBBBw...",
  "....wBBBBBw....",
  ".....BBBBB.....",
];
// BACK: the mitre's back, the iron band, the mail coif over the nape (the lappets are drawn over it).
const BACK_H = [
  ".......O.......",
  "......COC......",
  ".....CCOCC.....",
  "....CCCOCCC....",
  "...cCCCOCCCC...",
  "..cCCCCOCCCCC..",
  "..IIIIIOIIIII..",
  "..wwwwwwwwwww..",
  "..wwwwwwwwwww..",
  "..wwwwmwwwwww..",
  "..wwwwwwwwmww..",
  "...wwwwwwwww...",
  "....wwwwwww....",
  ".....wwwww.....",
  "......www......",
];

const FWD = 0.4, TAU = Math.PI * 2, cl = (v, a, b) => Math.max(a, Math.min(b, v));

const make = (s) => (px, F) => {
  const rs = -s, ls = s, { sk, ph } = F, { p, P, C, N } = sk;
  const sw = (t) => rs * 0.7 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const vx = cl((sx - sx1) * 1.4, -2.4, 2.4), vx2 = cl((sx1 - sx2) * 1.4, -2.4, 2.4), vy = cl(C[1] - F.lag1.C[1], -2, 2);
  const hipY = P[1], chY = C[1], shY = chY + 0.9, hy = Math.round(N[1]), hx = Math.round(sx * 0.7);
  const sway = p.sway || 0, g = p.glow || 0, fl = -vx * 0.9 - vx2 * 0.6;

  // ---- the hands first (the arms are drawn after the body)
  const angN = p.aN[0], angF = p.aF[0];
  const handN = [sx + rs * 7.6, shY + 9 + s * (angN - 0.62) * 8], handF = [sx + ls * 7.4, shY + 11.4 + s * (angF - 0.3) * 8];
  // the reliquary and its chain from the far (left) fist
  const rel = [handF[0] + sway * 1.2, handF[1] + 8.4 + vy * 0.4];
  px.part();
  px.line(handF[0], handF[1] + 0.6, rel[0], rel[1] - 3.2, BRASS, 6.6, { noLine: true });
  px.part();
  const [rx, ry] = rel;
  px.poly([[rx - 3.2, ry - 1.6], [rx, ry - 4.6], [rx + 3.2, ry - 1.6], [rx + 3.2, ry + 3.6], [rx - 3.2, ry + 3.6]], BRASS, 6.7, { cast: 1 });
  if (s > 0) { px.rect(rx - 1.6, ry - 0.6, 3.2, 3.4, g > 0.35 ? WIN : WINK, 6.8, { noLine: true }); px.line(rx, ry - 0.6, rx, ry + 2.8, BRASS, 6.82, { noLine: true }); }
  else px.line(rx, ry - 3.6, rx, ry + 3, CREAMK, 6.8, { noLine: true });
  px.dot(rx, ry - 5.4, BRASS, 6.7, { fix: 3 });

  // ---- the boots under the hem (attached: the hem comes down to them)
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]], fy = [0, 0];
  feet.forEach(([f, side, z], i) => {
    const bx = hx + side * 3.2, by = -1.2 + s * f[0] * FWD - f[1] * 0.8; fy[i] = f[1];
    px.part(); px.ellipse(bx, by + 1.2, s > 0 ? 3 : 2.6, 1.9, BOOT, z, { fix: 1 });
  });

  // ---- the alb to the ankle, a hem band
  const top = chY - 2.2, hem = -0.6, hl = hem - fy[0] * 0.3, hr = hem - fy[1] * 0.3;
  px.part(); const rb = px._pid;
  px.poly([[sx - 5.2, top], [sx + 5.2, top], [sx + 6, chY + 3], [hx + 5.4, hipY - 2], [hx + 7.4 + fl, hr], [hx - 7.4 + fl, hl], [hx - 5.4, hipY - 2], [sx - 6, chY + 3]], CREAM, 4, { round: 0.9, cast: 1, edge: true });
  px.toneLine(hx - 3, hipY + 3, hx - 5 + fl, hem - 4, -1, rb);
  px.toneLine(hx + 3, hipY + 3, hx + 5 + fl, hem - 4, 1, rb);
  px.line(hx - 7 + fl, hem - 1.6, hx + 7 + fl, hem - 1.6, OX, 4.04, { noLine: true });
  px.dot(hx - 3, hem - 1.6, OXK, 4.05, { fix: 0 }); px.dot(hx + 3, hem - 1.6, OXK, 4.05, { fix: 0 });
  // the chasuble: oxblood to the knee, the brass cross (front) or the forked orphrey (behind)
  px.part(); const ch = px._pid;
  const cf = hipY + 8.6;
  px.poly([[sx - 5, chY - 2.8], [sx + 5, chY - 2.8], [sx + 5.8, chY + 3], [hx + 5.8, cf - 1 - vx * 0.3], [hx, cf + 1.8], [hx - 5.8, cf - 1 - vx * 0.3], [sx - 5.8, chY + 3]], OX, 4.2, { round: 0.9, cast: 1 });
  px.toneLine(sx - 3.4, chY + 2, hx - 4.8, cf - 1, 1, ch);
  px.line(hx - 5.4, cf - 0.6, hx, cf + 1.2, BRASS, 4.22, { noLine: true }); px.line(hx, cf + 1.2, hx + 5.4, cf - 0.6, BRASS, 4.22, { noLine: true });
  if (s > 0) {
    px.line(sx, chY - 1.6, hx, cf - 1, BRASS, 4.24, { noLine: true });
    px.line(sx - 3.2, chY + 3, sx + 3.2, chY + 3, BRASS, 4.24, { noLine: true });
    px.dot(sx, chY + 3, STEELB, 4.26, { fix: 4 });
  } else {
    px.line(sx - 4, chY - 2, sx, chY + 3, BRASS, 4.24, { noLine: true }); px.line(sx + 4, chY - 2, sx, chY + 3, BRASS, 4.24, { noLine: true });
    px.line(sx, chY + 3, hx, cf - 1, BRASS, 4.24, { noLine: true });
  }
  // the cord belt and its tassel
  px.part();
  px.line(hx - 5.2, hipY - 3.2, hx + 5.2, hipY - 3.2, BRASS, 4.3);
  px.line(hx + ls * 3.4, hipY - 3, hx + ls * 4 - vx * 0.8 + sway * 0.5, hipY + 4.6, BRASS, 4.32);
  px.dot(hx + ls * 4 - vx * 0.8 + sway * 0.5, hipY + 5.4, OX, 4.34, { fix: 3 });
  // the mail amice over the shoulders
  px.part();
  px.poly([[sx - 6.4, chY - 3.4], [sx + 6.4, chY - 3.4], [sx + 7, chY + 0.2], [sx + 2.6, chY + (s > 0 ? 2.4 : 1.4)], [sx - 2.6, chY + (s > 0 ? 2.4 : 1.4)], [sx - 7, chY + 0.2]], MAIL, 5, { round: 0.9, cast: 1 });

  // ---- the arms: mail sleeves under cream cuffs, bare fists
  const arm = (side, hand, z, hold) => {
    const sh = [sx + side * 6.2, shY + 0.3], el = [sx + side * (hold ? 8.6 : 7.8), shY + 5.2], wr = [hand[0], hand[1] - 2];
    px.part();
    px.capsule(sh[0], sh[1], 2.4, el[0], el[1], 2.3, MAIL, z, { cast: 2 });
    px.capsule(el[0], el[1], 2.3, wr[0], wr[1], 2.1, MAIL, z, { cast: 2 });
    px.poly([[wr[0] - 2.4, wr[1] - 0.4], [wr[0] + 2.4, wr[1] - 0.4], [wr[0] + 2.4, wr[1] + 1.4], [wr[0] - 2.4, wr[1] + 1.4]], CREAMK, z + 0.02);
    px.part(); px.ellipse(hand[0], hand[1] + 0.6, hold ? 2.4 : 1.7, hold ? 2.5 : 1.9, SKIN, z + (hold ? 0.9 : 0.2), { cast: 1 });
    if (hold) { px.line(hand[0] - 2, hand[1] - 0.2, hand[0] + 2, hand[1] - 0.2, SKIN, z + 1.0, { fix: 1, noLine: true }); px.line(hand[0] - 2, hand[1] + 1.4, hand[0] + 2, hand[1] + 1.4, SKIN, z + 1.0, { fix: 1, noLine: true }); }
  };
  arm(ls, handF, 8, false);
  // the mace: upright in the right fist before him (front); from behind only its pommel shows at the hip
  {
    // front: out at his side; behind: the same mace at true depth, its head leaning in behind the body (hidden), haft and pommel past the fist showing
    const tilt = s > 0 ? rs * 0.62 + (p.wrist || 0) * 0.3 : -rs * 0.38, zo = s > 0 ? 1.5 : -3.6, d = [Math.sin(tilt), -Math.cos(tilt)], nr = [-d[1], d[0]];
    const B = (t, o = 0) => [handN[0] + d[0] * t + nr[0] * o, handN[1] + d[1] * t + nr[1] * o];
    const hd = B(15);
    px.part(); px.tag("mace");
    px.capsule(...B(-4), 1.15, ...B(13), 1.05, IRONK, 7 + zo, { edge: true });
    px.capsule(...B(-0.4), 1.3, ...B(3.6), 1.3, OX, 7.02 + zo);
    px.ellipse(...B(-4.6), 1.4, 1.4, BRASS, 7.05);
    px.ellipse(hd[0], hd[1], 2.5, 2.8, IRON, 7.1 + zo, { vb: 0.2, cast: 1 });
    for (const o of [-1, 1]) px.poly([[hd[0] + nr[0] * o * 2, hd[1] + nr[1] * o * 2], [hd[0] + nr[0] * o * 5 + d[0] * 1.5, hd[1] + nr[1] * o * 5 + d[1] * 1.5], [hd[0] + nr[0] * o * 2 + d[0] * 4, hd[1] + nr[1] * o * 2 + d[1] * 4]], IRONK, 7.12 + zo, { cast: 0 });
    px.capsule(...B(17.6), 0.9, ...B(19.4), 0.3, IRON, 7.12 + zo, { edge: true });
    px.dot(hd[0] + d[0], hd[1] + d[1], STEELB, 7.15 + zo, { fix: 4 });
    px.tag(null);
  }
  arm(rs, handN, 8.1, true);

  // ---- the head: the lappets trail down the back of the coif
  const lap = cl(-vx * 1.4 - vx2 * 1.0 + sway * 0.6, -2.4, 2.4);
  if (s < 0) {
    px.part();
    for (const o of [-2.6, 2.6]) px.poly([[hx + o - 1.2, hy - 7.6], [hx + o + 1.2, hy - 7.6], [hx + o + 1.4 + lap * 0.5, hy + 1], [hx + o + lap * 0.9, hy + 4], [hx + o - 1.4 + lap * 0.5, hy + 1]], OX, 6.5, { round: 0.7, cast: 1 });
  }
  px.part();
  px.stamp(s > 0 ? FRONT_H : BACK_H, hx, hy, LEG, 6, { ax: 7, ay: 13, ball: [7, 7, 7, 8], cast: 2 });
  px.dot(hx + (s > 0 ? 0 : 0), hy - 6.6, BRASS, 6.1, { fix: 3 });
  return {};
};

// ---- BACK on the BACK stack (art/briefs/views-artist.md): carried things lowest (1.0, behind him), legs 2-3, fists 3.6,
// alb 4.0, both arms 4.3 (cast 0), what lies on the back or shoulders 5.0+ (chasuble, amice, lappets), head 6.0.
// The mace is in his right fist (screen right): its haft and head lean in behind his body; only the pommel and the haft
// below the fist show. The reliquary hangs from his left fist (screen left), its outer half past his outline.
const back = (px, F) => {
  const rs = 1, ls = -1, s = -1, { sk, ph } = F, { p, P, C, N } = sk;
  const sw = (t) => 0.7 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const vx = cl((sx - sx1) * 1.4, -2.4, 2.4), vx2 = cl((sx1 - sx2) * 1.4, -2.4, 2.4), vy = cl(C[1] - F.lag1.C[1], -2, 2);
  const hipY = P[1], chY = C[1], shY = chY + 0.9, hy = Math.round(N[1]), hx = Math.round(sx * 0.7);
  const sway = p.sway || 0, fl = -vx * 0.9 - vx2 * 0.6, sw1 = (v) => cl(v, -1.2, 1.2);
  const handN = [sx + 7.6, shY + 10.4 + sw1(-(p.aN[0] - 0.62) * 8)], handF = [sx - 7.8, shY + 11.2 + sw1(-(p.aF[0] - 0.3) * 8)];
  // carried: the reliquary on its chain, the mace
  const rel = [handF[0] - 0.6 + sway * 1.2, handF[1] + 8.4 + vy * 0.4];
  px.part(); px.line(handF[0], handF[1] + 0.6, rel[0], rel[1] - 3.2, BRASS, 1.0, { noLine: true });
  px.part();
  const [rx, ry] = rel;
  px.poly([[rx - 3.2, ry - 1.6], [rx, ry - 4.6], [rx + 3.2, ry - 1.6], [rx + 3.2, ry + 3.6], [rx - 3.2, ry + 3.6]], BRASS, 1.0, { cast: 0 });
  px.line(rx, ry - 3.6, rx, ry + 3, CREAMK, 1.02, { noLine: true }); px.dot(rx, ry - 5.4, BRASS, 1.0, { fix: 3 });
  {
    const tilt = -0.38, d = [Math.sin(tilt), -Math.cos(tilt)], nr = [-d[1], d[0]];
    const B = (t, o = 0) => [handN[0] + d[0] * t + nr[0] * o, handN[1] + d[1] * t + nr[1] * o];
    const hd = B(15);
    px.part();
    px.capsule(...B(-4), 1.15, ...B(13), 1.05, IRONK, 1.0);
    px.capsule(...B(-0.4), 1.3, ...B(3.6), 1.3, OX, 1.02);
    px.ellipse(...B(-4.6), 1.4, 1.4, BRASS, 1.05);
    px.ellipse(hd[0], hd[1], 2.5, 2.8, IRON, 1.1, { vb: 0.2, cast: 0 });
    for (const o of [-1, 1]) px.poly([[hd[0] + nr[0] * o * 2, hd[1] + nr[1] * o * 2], [hd[0] + nr[0] * o * 5 + d[0] * 1.5, hd[1] + nr[1] * o * 5 + d[1] * 1.5], [hd[0] + nr[0] * o * 2 + d[0] * 4, hd[1] + nr[1] * o * 2 + d[1] * 4]], IRONK, 1.12, { cast: 0 });
  }
  // boots, the alb
  const fy = [0, 0];
  [[p.fF, ls, 2], [p.fN, rs, 3]].forEach(([f, side, z], i) => {
    const bx = hx + side * 3.2, by = -1.2 + s * f[0] * FWD - f[1] * 0.8; fy[i] = f[1];
    px.part(); px.ellipse(bx, by + 1.2, 2.6, 1.9, BOOT, z, { fix: 1 });
  });
  const top = chY - 2.2, hem = -0.6, hl = hem - fy[0] * 0.3, hr = hem - fy[1] * 0.3;
  px.part(); const rb = px._pid;
  px.poly([[sx - 5.2, top], [sx + 5.2, top], [sx + 6, chY + 3], [hx + 5.4, hipY - 2], [hx + 7.4 + fl, hr], [hx - 7.4 + fl, hl], [hx - 5.4, hipY - 2], [sx - 6, chY + 3]], CREAM, 4, { round: 0.9, cast: 1, edge: true });
  px.toneLine(hx - 3, hipY + 3, hx - 5 + fl, hem - 4, -1, rb);
  px.toneLine(hx + 3, hipY + 3, hx + 5 + fl, hem - 4, 1, rb);
  px.line(hx - 7 + fl, hem - 1.6, hx + 7 + fl, hem - 1.6, OX, 4.04, { noLine: true });
  px.dot(hx - 3, hem - 1.6, OXK, 4.05, { fix: 0 }); px.dot(hx + 3, hem - 1.6, OXK, 4.05, { fix: 0 });
  // both arms: mail sleeves at 4.3, hanging at his sides
  const arm = (side, hand) => {
    const sh = [sx + side * 6.2, shY + 0.3], el = [sx + side * 8, shY + 5.2], wr = [hand[0], hand[1] - 2];
    px.part();
    px.capsule(sh[0], sh[1], 2.4, el[0], el[1], 2.3, MAIL, 4.3, { cast: 0 });
    px.capsule(el[0], el[1], 2.3, wr[0], wr[1], 2.1, MAIL, 4.3, { cast: 0 });
    px.poly([[wr[0] - 2.4, wr[1] - 0.4], [wr[0] + 2.4, wr[1] - 0.4], [wr[0] + 2.4, wr[1] + 1.4], [wr[0] - 2.4, wr[1] + 1.4]], CREAMK, 4.32);
    px.part(); px.ellipse(hand[0], hand[1] + 0.4, 1.5, 1.6, SKIN, 3.6);
  };
  arm(ls, handF); arm(rs, handN);
  // on his back: the chasuble with its forked orphrey, the cord belt, the amice, the lappets
  px.part(); const ch = px._pid;
  const cf = hipY + 8.6;
  px.poly([[sx - 5, chY - 2.8], [sx + 5, chY - 2.8], [sx + 5.8, chY + 3], [hx + 5.8, cf - 1 - vx * 0.3], [hx, cf + 1.8], [hx - 5.8, cf - 1 - vx * 0.3], [sx - 5.8, chY + 3]], OX, 5, { round: 0.9, cast: 1, edge: true });
  px.toneLine(sx - 3.4, chY + 2, hx - 4.8, cf - 1, 1, ch);
  px.line(hx - 5.4, cf - 0.6, hx, cf + 1.2, BRASS, 5.02, { noLine: true }); px.line(hx, cf + 1.2, hx + 5.4, cf - 0.6, BRASS, 5.02, { noLine: true });
  px.line(sx - 4, chY - 2, sx, chY + 3, BRASS, 5.04, { noLine: true }); px.line(sx + 4, chY - 2, sx, chY + 3, BRASS, 5.04, { noLine: true });
  px.line(sx, chY + 3, hx, cf - 1, BRASS, 5.04, { noLine: true });
  px.part();
  px.line(hx - 5.2, hipY - 3.2, hx + 5.2, hipY - 3.2, BRASS, 5.1);
  px.line(hx + 3.4, hipY - 3, hx + 4 - vx * 0.8 + sway * 0.5, hipY + 4.6, BRASS, 5.12);
  px.dot(hx + 4 - vx * 0.8 + sway * 0.5, hipY + 5.4, OX, 5.14, { fix: 3 });
  px.part();
  px.poly([[sx - 6.4, chY - 3.4], [sx + 6.4, chY - 3.4], [sx + 7, chY + 0.2], [sx + 2.6, chY + 1.4], [sx - 2.6, chY + 1.4], [sx - 7, chY + 0.2]], MAIL, 5.3, { round: 0.9, cast: 1, edge: true });
  const lap = cl(-vx * 1.4 - vx2 * 1.0 + sway * 0.6, -2.4, 2.4);
  px.part();
  for (const o of [-2.6, 2.6]) px.poly([[hx + o - 1.2, hy - 7.6], [hx + o + 1.2, hy - 7.6], [hx + o + 1.4 + lap * 0.5, hy + 1], [hx + o + lap * 0.9, hy + 4], [hx + o - 1.4 + lap * 0.5, hy + 1]], OX, 6.2, { round: 0.7, cast: 1 });
  px.part();
  px.stamp(BACK_H, hx, hy, LEG, 6, { ax: 7, ay: 13, ball: [7, 7, 7, 8], cast: 2 });
  px.dot(hx, hy - 6.6, BRASS, 6.1, { fix: 3 });
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "chaplain-front", BOX: { w: 48, h: 86, ox: 24, oy: 78 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "chaplain-back", BOX: { w: 48, h: 86, ox: 24, oy: 78 }, BONES: SIDE_BONES, draw: back, CLIPS: { walk } };
