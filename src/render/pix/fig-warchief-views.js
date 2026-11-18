// ============ VIEWS: the Hobgoblin Warchief seen from the FRONT and from BEHIND ============
// The warchief of fig-warchief.js (horned iron helm rimmed in gold, long ears, fur mantle over a hide
// cuirass, gold medallion, red sash, hide kilt, trophy skull at his RIGHT hip) marching toward the camera
// (FRONT) or away (BACK), unmirrored, sun upper left. s = +1 front, -1 back. His LEFT fist holds the
// totem-banner (screen RIGHT in front, screen LEFT from behind), the skull facing us in front, its back
// to us behind; his RIGHT hand swings free (the horn's `horn` clip stays side-on). Walk = the side
// walk's own clip, so the views switch mid-stride; the march is upright and brisk, a small bob.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-warchief.js";

const SKIN = mat("#7a9a48"), HIDE = mat("#5a3a2a"), DARK = mat("#3a2820"), FUR = mat("#74624a"), BOOT = mat("#46342a");
const GOLD = mat("#e8c14a", { contrast: 1.15 }), IRON = mat("#7c808c", { contrast: 1.15 }), BONE = mat("#e8dfc6"), WOOD = mat("#6a4a2a");
const RED = mat("#c8383a"), F_GOLD = mat("#e8c14a"), F_BLUE = mat("#3a80c0");
const EYE = flat("#e05248"), GLINT = flat("#ffb070"), MOUTH = flat("#2c1a22"), SOCK = flat("#2a1c26");
const LEG = {
  I: { m: IRON }, i: { m: IRON, bias: -1 }, Y: { m: GOLD, fix: 3 }, y: { m: GOLD, fix: 1 },
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 1 }, L: { m: SKIN, fix: 3 }, H: { m: SKIN, fix: 4 },
  B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, E: { m: EYE }, e: { m: GLINT }, T: { m: BONE, fix: 3 }, M: { m: MOUTH },
};
const SKULL_LEG = { B: { m: BONE }, b: { m: BONE, bias: -1 }, T: { m: BONE, fix: 3 }, e: { m: SOCK }, n: { m: SOCK } };
const SKULL = ["..BBBBB..", ".BBBBBBB.", "BBBBBBBBB", "BBeeBeeBB", "bBeeBeeBb", ".bBBnBBb.", "..bTBTBT.", "..b.b.b.."];
const SKULL_B = ["..BBBBB..", ".BBBBBBB.", "BBBBbBBBB", "BBBBbBBBB", "bBBBbBBBb", ".bBBbBBb.", "..bBBBBb.", "..b.b.b.."];
const TROPHY = [".BBB.", "BBBBB", "BeBeB", ".BBB.", ".b.b."];
const TROPHY_B = [".BBB.", "BBBBB", "BBbBB", ".BBB.", ".b.b."];
// 13 wide, mirrored from halves (cols 0..6, col 6 the centre)
const mir = (halves) => halves.map((h) => h + h.slice(0, 6).split("").reverse().join(""));
// FRONT: iron cap with its gold rim, one slab of brow, red eyes, the hooked nose proud of the face, the jutting jaw with a fang at each corner
const FRONT_H = mir([
  "....III", "..IIIII", ".IIIIII", "yYYYYYY", "GGBBBBB", "GGbEeGG", "GGbEEGG", "GGGGHLN",
  "GGGGHNN", "gGGGnNN", "gGTMMMM", "gGGMMMM", ".gGGGGG", "..ggGGG", "....ggg",
]);
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const FRONT_BL = swap(FRONT_H, { 5: "GGGGGGGGGGGGG", 6: mir(["GGBBBGG"])[0] });
// BACK: the back of the cap, its rim, a bare green skull below it with a seam, the nape
const BACK_H = mir([
  "....III", "..IIIII", ".IIIIII", "yYYYYYY", "GGGGGGG", "GGGGGGg", "GGGGGGg", "GGGGGGg",
  "GGGGGGg", "gGGGGGg", "gGGGGGg", ".gGGGGG", "..gGGGG", "...ggGG", "....ggg",
]);

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const TOT = 54;

const make = (s) => (px, F) => {
  const ED = s > 0;                   // BACK: nothing carried 'lies on top', so no edge on the totem
  const rs = -s, ls = s;              // screen side of his right (free hand, trophy) and of his left (the totem)
  const { sk, ph } = F, p = sk.p;
  const sw = (t) => rs * 0.7 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  const hipY = sk.P[1], chestY = sk.C[1], hy = sk.N[1] + 0.5, hx = Math.round(sx * 0.7);
  const vy = cl(sk.N[1] - F.lag1.N[1], -2.5, 2.5), vy2 = cl(F.lag1.N[1] - F.lag2.N[1], -2.5, 2.5);
  const vx = cl((sx - sx1) * 1.3, -2.5, 2.5), vx2 = cl((sx1 - sx2) * 1.3, -2.5, 2.5);
  const w1 = Math.sin((ph - 0.09) * TAU * 2);

  // ---- the totem, in his left fist: pole, binding, crossbar, skull and horns, cloth, feathers
  const handL = [hx + ls * 10.4, chestY + 6.2 - s * (p.aF[0] - 1.2) * 1.4];
  const foot = [handL[0], handL[1] + 25], top = (f) => [foot[0], foot[1] - f];
  {
    const bar = top(TOT), swx = cl(-vx * 1.3 - vx2 * 0.9 + w1 * 0.9, -4, 4), swy = cl(-vy * 0.7 - vy2 * 0.5, -3, 3);
    const hang = (from, L, k = 1) => { const o = cl(swx * k, -L * 0.9, L * 0.9); return [from[0] + o, from[1] + Math.sqrt(L * L - o * o) + swy * k * 0.4]; };
    // cloth: a red strip from the middle of the bar, forked at its foot, a gold band across it
    const TL = [bar[0] - 3, bar[1] + 0.6], TR = [bar[0] + 3, bar[1] + 0.6], H = 13;
    const BL = hang(TL, H), BR = hang(TR, H, 0.92), ML = hang(TL, H * 0.5, 0.55), MR = hang(TR, H * 0.5, 0.5), nt = mix(mix(BL, BR, 0.5), mix(ML, MR, 0.5), 0.45);
    px.part(); const clothId = px._pid;
    px.poly([TL, TR, MR, BR, nt, BL, ML], RED, s > 0 ? 1.42 : 1.6, { round: 0.5, floor: 1 });
    { const a = mix(TL, ML, 0.8), b = mix(TR, MR, 0.8); px.line(a[0], a[1], b[0], b[1], GOLD, s > 0 ? 1.43 : 1.61, { fix: 3 }); }
    px.toneLine(...mix(TL, TR, 0.5), ...mix(BL, BR, 0.5), -1, clothId);
    const feather = (x, L, m, k, fan, z) => {
      const a = [bar[0] + x, bar[1] + 0.4], e = hang(a, L, k); e[0] += fan; e[1] -= Math.abs(fan) * 0.35;
      const mid = mix(a, e, 0.5);
      px.part(); px.capsule(a[0], a[1], 0.7, mid[0], mid[1], 1.3, m, z); px.capsule(mid[0], mid[1], 1.3, e[0], e[1], 0.5, m, z);
    };
    feather(-6.2, 8, RED, 1.2, -1.8, 1.44); feather(-5, 8.5, F_GOLD, 1, 0.6, 1.46); feather(6.4, 7.5, F_BLUE, 0.85, 1.8, 1.48);
    px.part(); px.capsule(...foot, 1.15, ...top(TOT + 2.4), 1.05, WOOD, 1.5, { edge: ED });
    px.part();
    px.capsule(...top(TOT - 4.4), 1.5, ...top(TOT - 2.2), 1.5, DARK, 1.52, { floor: 1 });
    px.capsule(...top(1), 1.35, ...top(2.6), 1.35, IRON, 1.52);
    px.part(); px.capsule(bar[0] - 7.4, bar[1], 0.95, bar[0] + 7.4, bar[1], 0.95, WOOD, 1.55, { edge: ED });
    // the skull and the two horns bound to it
    const sc = top(TOT + 6.2);
    px.part();
    px.poly([[sc[0] - 3.4, sc[1] + 1], [sc[0] - 5.4, sc[1] - 2], [sc[0] - 6.8, sc[1] - 6.4], [sc[0] - 3.8, sc[1] - 4.2], [sc[0] - 2.2, sc[1] - 1.6]], BONE, 1.58, { bias: -1, n: [-0.3, -0.3, 0.9] });
    px.poly([[sc[0] + 3.4, sc[1] + 1], [sc[0] + 5.4, sc[1] - 2], [sc[0] + 6.8, sc[1] - 6.4], [sc[0] + 3.8, sc[1] - 4.2], [sc[0] + 2.2, sc[1] - 1.6]], BONE, 1.58, { n: [0.2, -0.4, 0.9] });
    px.part();
    px.stamp(s > 0 ? SKULL : SKULL_B, Math.round(sc[0]), Math.round(sc[1]), SKULL_LEG, 1.62, { ax: 4, ay: 4, ball: [4.5, 3.6, 5, 4.6] });
  }

  // ---- long legs: bare thighs, hide boots bound to the knee with a fur cuff
  const feet = [[p.fF, ls, 2], [p.fN, rs, 3]];
  for (const [f, side, z] of feet) {
    const lift = f[1], b = side === rs ? 0 : -1, fx = hx + side * 3.6, fy = -2.4 + s * f[0] * FWD - lift * 0.9;
    const hp = [hx + side * 3.2, hipY + 0.5], kn = [hx + side * 3.8, (hp[1] + fy) / 2 - lift * 0.45];
    px.part();
    px.capsule(hp[0], hp[1], 3.4, kn[0], kn[1], 2.9, SKIN, z + lift * 0.05, { bias: b });
    px.capsule(kn[0], kn[1], 2.8, fx, fy, 2.3, SKIN, z + lift * 0.05, { bias: b });
    const b0 = mix(kn, [fx, fy], 0.3);
    px.capsule(b0[0], b0[1], 2.9, fx, fy, 2.55, BOOT, z + 0.03 + lift * 0.05, { bias: b, floor: 1 });
    px.capsule(b0[0] - 2.4, b0[1] - 0.2, 1, b0[0] + 2.4, b0[1] + 0.2, 1, FUR, z + 0.05 + lift * 0.05, { bias: b });
    px.part();
    if (s > 0) px.ellipse(fx, fy + 1.2, 3, 1.9, BOOT, z + 0.4 + lift * 0.05, { bias: b, floor: 1 });
    else {
      px.ellipse(fx, fy + 0.8, 2.6, 1.7, BOOT, z + 0.4 + lift * 0.05, { bias: b, floor: 1 });
      if (lift > 1) px.ellipse(fx, fy + 2.4, 2.4, 1.6 * cl(lift / 3, 0.3, 1), BOOT, z + 0.45, { bias: -2 });
    }
  }

  // ---- the kilt of hide strips, ragged feet a beat behind the hips
  const kh = hipY + 6.4, sh = -vx * 1.4 - vx2 * 0.9, kl = hx - 6.8 + sh, kr = hx + 6.8 + sh, km = (t) => kl + (kr - kl) * t;
  px.part(); const kiltId = px._pid;
  px.poly([[hx - 6.4, hipY - 1], [hx + 6.4, hipY - 1], [kr, kh - 1.4], [km(0.88), kh + 1.2], [km(0.74), kh - 1.4], [km(0.6), kh + 1.4], [km(0.46), kh - 1], [km(0.32), kh + 1.4], [km(0.18), kh - 0.8], [km(0.06), kh + 0.8], [kl, kh - 2]], HIDE, 3.6, { round: 0.85, cast: 1, floor: 1 });
  px.toneLine(hx + 2.4, hipY + 1, km(0.7), kh - 2, -1, kiltId);
  px.toneLine(hx - 2.6, hipY + 1, km(0.34), kh - 1.6, -1, kiltId);

  // ---- the trunk: a hide cuirass, broad at the shoulder
  const c0 = chestY - 2;
  px.part(); const bodyId = px._pid;
  px.poly([[sx - 9.4, c0], [sx + 9.4, c0], [sx + 9.6, c0 + 6], [hx + 7, hipY - 7], [hx + 6.6, hipY + 0.4], [hx - 6.6, hipY + 0.4], [hx - 7, hipY - 7], [sx - 9.6, c0 + 6]], HIDE, 4, { round: 0.92, cast: 1, floor: 1 });
  if (s > 0) {
    px.toneLine(sx, c0 + 5, hx, hipY - 5, -1, bodyId);                                    // the lacing down the front
    px.toneLine(sx - 5.5, c0 + 9.6, sx + 5.5, c0 + 9.4, -1, bodyId);                       // under the chest plate
    px.poly([[sx + 6.8, c0 + 0.6], [sx + 4.4, c0 - 0.2], [hx - 5.4, hipY - 6.4], [hx - 5.4, hipY - 4]], DARK, 4.03, { round: 0.5, floor: 1 });   // the strap, shoulder to hip
  } else {
    px.toneLine(sx, c0 + 1, hx, hipY - 5, -1, bodyId);                                    // the back seam
    px.poly([[sx - 6.8, c0 + 0.6], [sx - 4.4, c0 - 0.2], [hx + 5.4, hipY - 6.4], [hx + 5.4, hipY - 4]], DARK, 4.03, { round: 0.5, floor: 1 });
    px.dot(sx + 2, c0 + 5, DARK, 4.04); px.dot(sx - 2.4, c0 + 8, DARK, 4.04); px.dot(sx + 1.4, c0 + 11, DARK, 4.04);   // lashings
  }
  px.poly([[hx - 7, hipY - 3.8], [hx + 7, hipY - 3.8], [hx + 6.6, hipY + 0.2], [hx - 6.6, hipY + 0.2]], DARK, 4.05, { round: 0.92, bias: 1, floor: 1 });   // the broad belt
  px.part();
  if (s > 0) {
    px.rect(hx - 1.5, hipY - 3.4, 3, 3, GOLD, 4.06, { fix: 3 }); px.dot(hx, hipY - 2, GOLD, 4.07, { fix: 1 });
    px.ellipse(sx + 0.4, c0 + 7.4, 2, 2, GOLD, 4.1, { cast: 1 }); px.dot(sx + 0.4, c0 + 7.4, RED, 4.12, { fix: 2 });   // the medallion
    // the red sash hanging a beat behind the hips
    const s0 = [hx + 1.2, hipY - 0.2], swv = cl(sh * 1.3, -3, 3);
    px.poly([[s0[0] - 1.8, s0[1]], [s0[0] + 2, s0[1]], [s0[0] + 2.2 + swv * 0.5, s0[1] + 5], [s0[0] + 2 + swv, s0[1] + 9.6], [s0[0] + 0.4 + swv, s0[1] + 8.2], [s0[0] - 1.2 + swv, s0[1] + 9.8], [s0[0] - 1.8 + swv * 0.5, s0[1] + 5]], RED, 4.2, { round: 0.6, cast: 1 });
    px.line(hx + rs * 5, hipY + 0.2, hx + rs * 5.3, hipY + 2, DARK, 4.2);
    px.stamp(TROPHY, Math.round(hx + rs * 5.4), Math.round(hipY + 4.6), SKULL_LEG, 4.22, { ax: 2, ay: 2, ball: [2.5, 2.2, 3, 3] });   // the trophy at his right hip
  } else {
    px.line(hx + rs * 5, hipY + 0.2, hx + rs * 5.3, hipY + 2, DARK, 5);
    px.stamp(TROPHY_B, Math.round(hx + rs * 5.4), Math.round(hipY + 4.6), SKULL_LEG, 5.1, { ax: 2, ay: 2, ball: [2.5, 2.2, 3, 3] });
    const s0 = [hx - 1, hipY - 0.2], swv = cl(sh * 1.3, -3, 3);       // the sash's tail down his back
    px.poly([[s0[0] - 1.8, s0[1]], [s0[0] + 2, s0[1]], [s0[0] + 2.2 + swv * 0.5, s0[1] + 4], [s0[0] + 1.6 + swv, s0[1] + 7.4], [s0[0] - 0.2 + swv, s0[1] + 6], [s0[0] - 1.4 + swv, s0[1] + 7.6]], RED, 5, { round: 0.6, cast: 1 });
  }

  // ---- the fur mantle over both shoulders, tufted along its edge
  px.part();
  px.ellipse(sx, c0 + 0.6, 11.6, 3.8, FUR, s > 0 ? 4.4 : 5, { cast: 1, edge: s < 0 });
  for (let i = 0; i < 7; i++) px.dot(sx - 10.2 + i * 3.4, c0 + 3.4 + (i % 2) * 0.8, FUR, 4.4);

  // ---- the head: horns, ears, helm, face (or the back of the helm and a bare skull)
  const ex = cl(-vx * 1.3 - vx2 * 0.9, -2.5, 2.5), ey = cl(-vy * 1.3 - vy2 * 0.9 - (p.ear || 0) * 1.6, -2.5, 2.5);
  for (const side of [-1, 1]) {
    px.part();
    px.poly([[hx + side * 4.4, hy - 8.4], [hx + side * 7.6, hy - 8.6], [hx + side * 8.4, hy - 13], [hx + side * 11, hy - 19.4], [hx + side * 6.2, hy - 16], [hx + side * 4.8, hy - 12.4]], BONE, s > 0 ? 5.8 : 5.4, { bias: side < 0 ? -1 : 0, n: [side * 0.3, -0.3, 0.9] });
  }
  for (const side of [-1, 1]) {   // the long ears out under the helm, a gold ring in each
    px.part(); const eid = px._pid, wob = ey * 0.7 + side * ex * 0.4;
    const b = [hx + side * 6, hy - 4.6];
    px.poly([[b[0] - side * 1, b[1] - 2.4], [b[0] - side * 0.4, b[1] + 2.6], [b[0] + side * 4.4, b[1] + 2 + wob * 0.4], [b[0] + side * 11.6, b[1] - 1.8 + wob], [b[0] + side * 5.4, b[1] - 3.4 + wob * 0.4]], SKIN, s > 0 ? 6.5 : 5.5, { bias: s > 0 ? -1 : 0, n: [side * 0.25, -0.35, 0.9], cast: 1 });
    px.toneLine(b[0] + side * 0.4, b[1] - 0.2, b[0] + side * 7.4, b[1] - 1.2 + wob * 0.6, -1, eid);
    if (side === (s > 0 ? -1 : 1)) { px.part(); px.dot(b[0] + side * 4.6, b[1] + 2.6 + wob * 0.4, GOLD, 6.6, { fix: 3 }); px.dot(b[0] + side * 4.6, b[1] + 3.6 + wob * 0.4, GOLD, 6.6, { fix: 1 }); }
  }
  px.part();
  px.stamp(s > 0 ? (p.blink ? FRONT_BL : FRONT_H) : BACK_H, hx, hy, LEG, 6, { ax: 6, ay: 11, ball: [6.5, 7.5, 7, 8.5], cast: 1 });
  if (s < 0) {   // a hide cord knotted at the back of the helm, a gold bead on it, a beat behind the head
    px.part();
    const k = [hx, hy - 4.6], e = [hx - vx * 0.8 + w1 * 0.3, hy + 3.4 - vy * 0.4];
    px.capsule(k[0], k[1], 1, e[0], e[1], 0.8, DARK, 6.3);
    px.dot(e[0], e[1] - 1.6, GOLD, 6.4, { fix: 3 });
  }

  // BACK stack (higher z = further behind him): arms 4.3 both with no cast, pauldrons 5.0 (edge), fists 3.6 and small
  const za = s > 0 ? 7.9 : 4.3, zp = s > 0 ? 8 : 5, zf = s > 0 ? 8.3 : 3.6, ca = s > 0 ? 1 : 0, fr = s > 0 ? 1 : 0.7;
  // ---- the free right arm: a gold armband, a studded wristband; swings, the hand rising and falling a little
  {
    const ang = p.aN[0], sh0 = [hx + rs * 10.6, c0 + 3], hd = [hx + rs * 12, hipY - 1 + s * ang * (s > 0 ? 2.6 : 1.2)], el = [hx + rs * 11.6, (sh0[1] + hd[1]) / 2 + 0.6];
    px.part();
    px.capsule(sh0[0], sh0[1], 3.2, el[0], el[1], 2.9, SKIN, za, { cast: ca });
    px.capsule(el[0], el[1], 2.8, hd[0], hd[1], 2.7, SKIN, za, { cast: ca });
    const a0 = mix(sh0, el, 0.74), a1 = mix(sh0, el, 0.92);
    px.poly([[a0[0] - 3, a0[1]], [a0[0] + 3, a0[1]], [a1[0] + 3, a1[1]], [a1[0] - 3, a1[1]]], GOLD, za + 0.05, { round: 0.85 });
    const b0 = mix(el, hd, 0.5), b1 = mix(el, hd, 0.76);
    px.capsule(b0[0], b0[1], 2.9, b1[0], b1[1], 2.9, DARK, za + 0.06, { cast: ca, floor: 1 });
    if (s > 0) px.dot(...mix(b0, b1, 0.5), GOLD, 7.97, { fix: 3 });
    px.part();
    px.ellipse(sh0[0], sh0[1] - 1.2, 4.2, 3.2, FUR, zp, { cast: 1, edge: s < 0 });
    px.part();
    px.ellipse(hd[0], hd[1] + 0.6, 2.7 * fr + (s > 0 ? 0 : 1.3), 2.8 * fr + (s > 0 ? 0 : 1.3), SKIN, zf);
  }
  // ---- the left arm, bent to the pole: the upper arm down from the shoulder, the fist round the pole
  {
    const sh0 = [hx + ls * 10.6, c0 + 3], el = [hx + ls * (s > 0 ? 11.6 : 10.8), handL[1] + 0.8];
    px.part();
    px.capsule(sh0[0], sh0[1], 3.2, el[0], el[1], 2.9, SKIN, za, { bias: s > 0 ? -1 : 0, cast: ca });
    px.capsule(el[0], el[1], 2.8, handL[0], handL[1], 2.6, SKIN, za, { bias: s > 0 ? -1 : 0, cast: ca });
    const a0 = mix(sh0, el, 0.72), a1 = mix(sh0, el, 0.9);
    px.poly([[a0[0] - 3, a0[1]], [a0[0] + 3, a0[1]], [a1[0] + 3, a1[1]], [a1[0] - 3, a1[1]]], GOLD, za + 0.05, { round: 0.85 });
    px.part();
    px.ellipse(sh0[0], sh0[1] - 1.2, 4.2, 3.2, FUR, zp, { cast: 1, edge: s < 0 });
    px.part();
    px.ellipse(handL[0], handL[1] + (s > 0 ? 0 : 1), 2.9 * fr + (s > 0 ? 0 : 1.3), 2.8 * fr + (s > 0 ? 0 : 1.3), SKIN, zf, { bias: s > 0 ? -1 : 0 });
    if (s > 0) px.line(handL[0] - 2.4, handL[1] + 0.4, handL[0] + 2.4, handL[1] + 0.4, DARK, 8.35);
  }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "warchief-front", BOX: { w: 108, h: 98, ox: 35, oy: 90 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "warchief-back", BOX: { w: 108, h: 98, ox: 35, oy: 90 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
