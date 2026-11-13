// ============ FIGURE: the Hobgoblin Warchief ============
// A boss-rank goblin, about 60 px to the horn tips (a man is ~44): broad and
// upright where a goblin is hunched, a commander's bearing. Yellow-green skin, a
// horned iron helm rimmed in gold, long ears out under it, red eyes under a
// heavy brow, a jutting jaw with two fangs. A fur mantle over a hide cuirass, a
// gold medallion, a red sash and a kilt of hide strips, a trophy skull at the belt. In the FAR fist his TOTEM-BANNER: a tall pole with
// a crossbar, a horned skull on top, feathers and a strip of red banner cloth
// hung from the bar; planted beside him it stands higher than his horns, and he
// swings it two-handed as a mace.
// Clips: idle (surveying, the totem planted), walk (a striding march, the totem
// carried upright like a standard), attack (the totem heaved overhead and smashed
// down with a step) and HORN: his summons on the march. `horn` is built from the
// very same walkPose call as `walk`, so frame k of one has exactly frame k of the
// other's legs and body height; the near hand lifts the horn to his
// mouth, the head goes back, the cheeks puff.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, scaled, HUMAN, ik } from "./rig.js";

const SKIN = mat("#7a9a48"), HIDE = mat("#5a3a2a"), DARK = mat("#3a2820"), FUR = mat("#74624a"), BOOT = mat("#46342a");
const GOLD = mat("#e8c14a", { contrast: 1.15 }), IRON = mat("#7c808c", { contrast: 1.15 }), BONE = mat("#e8dfc6"), WOOD = mat("#6a4a2a");
const RED = mat("#c8383a"), F_GOLD = mat("#e8c14a"), F_BLUE = mat("#3a80c0"), HORN = mat("#c8ae7e");
const EYE = flat("#e05248"), GLINT = flat("#ffb070"), MOUTH = flat("#2c1a22"), SOCK = flat("#2a1c26");
const SMEAR1 = flat("#f6f4e6"), SMEAR2 = flat("#d8d2b0"), CLOD = flat("#5a4028"), TURF = flat("#4f8a3a"), SOUND = flat("#fff4d0"), SOUND2 = flat("#e8c14a");

// The head, facing +x, a quarter turned: an iron cap (I, i its shadowed back)
// with a gold rim (Y, y), one slab of brow (B), red eyes (E, e the glint), a
// hooked nose proud of the face (L H N n), a long jaw that juts past the lip with
// two fangs standing up out of it (T).
const HEAD = [
  ".....IIIIII......",
  "...IIIIIIIIII....",
  "..iIIIIIIIIIII...",
  "..yyYYYYYYYYYYY..",
  "..GGGBBBBGGBBBB..",
  "..GGGbEeGGbEeG...",
  "..GGGbEEGGbEEHH..",
  "..GGGGGGGGGgLHHHL",
  "..GGGGGGGGGgnLLNN",
  "..gGGGGTGGGGT.nn.",
  "..gGGGGTMMMMTGG..",
  "..gGGGGGGGGGGGG..",
  "...gGGGGGGGGGG...",
  "....ggGGGGGGg....",
  "......ggggg......",
];
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const BLINK = swap(HEAD, { 5: "..GGGGGGGGGGGG...", 6: "..GGGBBBGGBBBHH.." });
// surveying: the eyes slide back over his warband
const GLANCE = swap(HEAD, { 5: "..GGGeEbGGeEbG...", 6: "..GGGEEbGGEEbHH.." });
// the smash's roar: the jaw dropped a row, the mouth open on the fangs
const ROAR = swap(HEAD, { 9: "..gGGGGTMMMMT.nn.", 10: "..gGGGGMMMMMMGG..", 11: "..gGGGGTMMMMTGG..", 12: "...gGGGGGGGGGGG..", 13: "....ggGGGGGGGg...", 14: "......gggggg....." });
// the horn: the eyes glaring over it, the cheek puffed out (P), the lips on the mouthpiece
const BLOW = swap(HEAD, { 8: "..GGGGPPPGGgnLLNN", 9: "..gGGPPPPPGGG.nn.", 10: "..gGGGPPPGGMMGG.." });
const LEG = {
  I: { m: IRON }, i: { m: IRON, bias: -1 }, Y: { m: GOLD, fix: 3 }, y: { m: GOLD, fix: 1 },
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 1 }, L: { m: SKIN, fix: 3 }, H: { m: SKIN, fix: 4 }, P: { m: SKIN, fix: 3 },
  B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, E: { m: EYE }, e: { m: GLINT }, T: { m: BONE, fix: 3 }, M: { m: MOUTH },
};
// the totem's skull (upright), facing +x, and the trophy at his belt
const SKULL = [
  "..BBBBB..",
  ".BBBBBBB.",
  "BBBBBBBBB",
  "BBeeBBeeB",
  "bBeeBneeB",
  ".bBBBBBB.",
  "..bTBTBT.",
  "..b.b.b..",
];
const TROPHY = [".BBB.", "BBBBB", "BeBeB", ".BBB.", ".b.b."];
const SKULL_LEG = { B: { m: BONE }, b: { m: BONE, bias: -1 }, T: { m: BONE, fix: 3 }, e: { m: SOCK }, n: { m: SOCK } };

export const BOX = { w: 108, h: 98, ox: 35, oy: 90 };
export const BONES = scaled(HUMAN, 1.25, { spine: 14, neck: 1.6, upper: 8.4, fore: 8, shN: -5.2, shF: 4.8, hipN: -2.4, hipF: 2.6 });
const TOT = 54;                        // the pole, foot to the crossbar

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const lerp = (a, b, t) => a + (b - a) * t;

// The totem, in the far fist. Planted (`sx`: where its foot stands) it leans from
// the foot to the hand; carried, `tot` is its tilt (0 upright, + toward the foe)
// and the fist holds it `grip` px above the foot (`gk` 1), or wherever the ground
// puts it (`gk` 0). at(f, s): f px up the pole from its foot, s px to the side
// (+ the way the skull faces).
const totemOf = (sk) => {
  const p = sk.p, h = sk.hdF, hgt = Math.max(2, -h[1] - (p.lift || 0));
  const tl = p.sx != null ? Math.atan2(h[0] - p.sx, hgt) : (p.tot ?? 0);
  const d = [Math.sin(tl), -Math.cos(tl)], nn = [Math.cos(tl), Math.sin(tl)];
  const lo = lerp(cl(hgt / Math.max(0.3, Math.cos(tl)), 8, TOT - 12), p.grip ?? 22, p.sx != null ? 0 : (p.gk || 0));
  const foot = [h[0] - d[0] * lo, h[1] - d[1] * lo];
  const at = (f, s = 0) => [foot[0] + d[0] * f + nn[0] * s, foot[1] + d[1] * f + nn[1] * s];
  return { tl, d, nn, foot, lo, at };
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eF, hdF, hN, hF, kN, kF, anN, anF, B } = sk;
  const vx = cl(N[0] - lag1.N[0], -2.5, 2.5), vy = cl(N[1] - lag1.N[1], -2.5, 2.5);
  const vx2 = cl(lag1.N[0] - lag2.N[0], -2.5, 2.5), vy2 = cl(lag1.N[1] - lag2.N[1], -2.5, 2.5);
  const bx = cl(P[0] - lag1.P[0], -2, 2), bx2 = cl(lag1.P[0] - lag2.P[0], -2, 2);
  const w1 = lag1.p.sway || 0, w2 = lag2.p.sway || 0, trail = p.trail || 0;
  const tt = totemOf(sk), tt1 = totemOf(lag1), tt2 = totemOf(lag2), { at } = tt;
  const g2 = p.g2 || 0, blow = (p.horn || 0) > 0.5;

  // ---- the totem: what hangs from its crossbar trails the bar by a beat
  {
    const bar = at(TOT), b1 = tt1.at(TOT), b2 = tt2.at(TOT);
    const v = [cl(bar[0] - b1[0], -5, 5), cl(bar[1] - b1[1], -5, 5)], v2 = [cl(b1[0] - b2[0], -5, 5), cl(b1[1] - b2[1], -5, 5)];
    const shx = cl(-v[0] * 1.3 - v2[0] * 0.9 - trail * 2.6 + w1 * 0.9, -8, 8), shy = cl(-v[1] * 0.7 - v2[1] * 0.5, -4, 3);
    const hang = (from, L, k = 1) => { const ox = cl(shx * k, -L * 0.92, L * 0.92); return [from[0] + ox, from[1] + Math.sqrt(L * L - ox * ox) + shy * k * 0.5]; };
    // the banner cloth: a red strip hung from the bar's forward arm, forked at its foot, a gold band across it
    const TL = at(TOT - 0.6, 1.4), TR = at(TOT - 0.6, 6.2), H = 13;
    const BL = hang(TL, H), BR = hang(TR, H, 0.92), ML = hang(TL, H * 0.5, 0.55), MR = hang(TR, H * 0.5, 0.5), nt = mix(mix(BL, BR, 0.5), mix(ML, MR, 0.5), 0.45);
    px.part(); const clothId = px._pid;
    px.poly([TL, TR, MR, BR, nt, BL, ML], RED, 1.42, { round: 0.5, floor: 1 });
    { const a = mix(TL, ML, 0.8), b = mix(TR, MR, 0.8); px.line(a[0], a[1], b[0], b[1], GOLD, 1.43, { fix: 3 }); }
    px.toneLine(...mix(TL, TR, 0.55), ...mix(BL, BR, 0.55), -1, clothId);
    // three feathers tied in a fan to the bar's back end: red, gold, blue
    const feather = (s, L, m, k, fan, z) => {
      const a = at(TOT - 0.4, s), e = hang(a, L, k); e[0] += fan; e[1] -= Math.abs(fan) * 0.35;
      const mid = mix(a, e, 0.5);
      px.part();
      px.capsule(a[0], a[1], 0.7, mid[0], mid[1], 1.3, m, z);
      px.capsule(mid[0], mid[1], 1.3, e[0], e[1], 0.5, m, z);
    };
    feather(-6.8, 8, RED, 1.2, -3.4, 1.44); feather(-6.2, 8.5, F_GOLD, 1, -0.8, 1.46); feather(-5.4, 7, F_BLUE, 0.85, 1.6, 1.48);
    // the pole, its leather binding, the crossbar
    px.part();
    px.capsule(...at(0), 1.15, ...at(TOT + 2.4), 1.05, WOOD, 1.5, { edge: true });
    px.part();
    px.capsule(...at(TOT - 4.4), 1.5, ...at(TOT - 2.2), 1.5, DARK, 1.52, { floor: 1 });
    px.capsule(...at(1), 1.35, ...at(2.6), 1.35, IRON, 1.52);
    px.part();
    px.capsule(...at(TOT, -6.4), 0.95, ...at(TOT, 7.4), 0.95, WOOD, 1.55, { edge: true });
    // the skull, and the two horns bound to it
    const up = Math.abs(tt.tl) < 0.3, sc = at(TOT + 6.2, 0.6);
    px.part();
    px.poly([at(TOT + 6.6, -2.6), at(TOT + 9.6, -3.4), at(TOT + 12.2, -6.8), at(TOT + 8.4, -6.2), at(TOT + 5.2, -3.8)], BONE, 1.58, { bias: -1, n: [-0.3, -0.3, 0.9] });
    px.poly([at(TOT + 6.6, 3.8), at(TOT + 9.6, 4.6), at(TOT + 12.2, 8), at(TOT + 8.4, 7.4), at(TOT + 5.2, 5)], BONE, 1.58, { n: [0.2, -0.4, 0.9] });
    px.part();
    if (up) px.stamp(SKULL, sc[0], sc[1], SKULL_LEG, 1.62, { ax: 4, ay: 4, ball: [4.5, 3.6, 5, 4.6] });
    else {
      px.ellipse(sc[0], sc[1], 3.9, 3.5, BONE, 1.62, { rot: tt.tl });
      px.capsule(...at(TOT + 2.6, 0.8), 1.7, ...at(TOT + 3.4, 2.2), 1.5, BONE, 1.62, { bias: -1 });
      for (const s of [0, 3]) { px.dot(...at(TOT + 6.2, s), SOCK, 1.64); px.dot(...at(TOT + 5.2, s), SOCK, 1.64); px.dot(...at(TOT + 6.2, s + 0.9), SOCK, 1.64); }
    }
  }

  // ---- the far arm, a tone down, its fist on the pole
  {
    const f0 = mix(eF, hdF, 0.5), f1 = mix(eF, hdF, 0.74);
    px.part();
    px.capsule(sF[0], sF[1] + 0.4, 3, eF[0], eF[1], 2.7, SKIN, 1, { bias: -1 });
    px.capsule(eF[0], eF[1], 2.6, hdF[0], hdF[1], 2.5, SKIN, 1, { bias: -1 });
    px.capsule(f0[0], f0[1], 2.75, f1[0], f1[1], 2.75, DARK, 1.02, { floor: 1 });
    px.part();
    px.ellipse(hdF[0], hdF[1], 2.5, 2.6, SKIN, 1.7, { bias: -1 });
  }

  // ---- long legs: bare thighs, hide boots bound to the knee with a fur cuff
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(hp[0], hp[1], 3.3, kn[0], kn[1], 2.8, SKIN, z, { bias: b });
    px.capsule(kn[0], kn[1], 2.7, an[0], an[1], 2.2, SKIN, z, { bias: b });
    const b0 = mix(kn, an, 0.3);
    px.capsule(b0[0], b0[1], 2.75, an[0], an[1], 2.45, BOOT, z + 0.03, { bias: b, floor: 1 });
    px.capsule(an[0] - 1, an[1] + 0.9, 1.7, an[0] + 4.6, an[1] + 1.3, 1.35, BOOT, z + 0.03, { bias: b, floor: 1 });
    px.capsule(b0[0] - 2.2, b0[1] - 0.2, 1, b0[0] + 2.2, b0[1] + 0.2, 1, FUR, z + 0.05, { bias: b });
  }

  // ---- the kilt: hide strips hung from the belt, their ragged feet a beat behind the hips
  const kh = P[1] + 6.4, sh = -bx * 1.5 - bx2 * 1 - trail * 0.6 + w1 * 0.4, kf = P[0] + 6.2 + sh * 0.8, kb = P[0] - 6.6 + sh * 1.2, km = (t) => kb + (kf - kb) * t;
  px.part(); const kiltId = px._pid;
  px.poly([[P[0] - 6, P[1] - 1], [P[0] + 5.8, P[1] - 1], [kf, kh - 1.4], [km(0.86), kh + 0.6], [km(0.72), kh - 1.6], [km(0.56), kh + 1], [km(0.4), kh - 1.2], [km(0.24), kh + 1.2], [km(0.1), kh - 0.6], [kb, kh - 2]], HIDE, 3.6, { round: 0.85, cast: 1, floor: 1 });
  px.toneLine(P[0] + 2.4, P[1] + 1, km(0.72), kh - 2, -1, kiltId);
  px.toneLine(P[0] - 2.6, P[1] + 1, km(0.4), kh - 1.6, -1, kiltId);

  // ---- the trunk: a hide cuirass, broad at the shoulder; a strap across it, a gold medallion, a broad belt
  px.part(); const bodyId = px._pid;
  px.poly([[C[0] - 7.4, C[1] - 2], [C[0] + 6.8, C[1] - 2.4], [C[0] + 8.2, C[1] + 3.5], [C[0] + 7.2, C[1] + 8.4], [P[0] + 5.8, P[1] - 5], [P[0] + 5.6, P[1] + 0.4],
    [P[0] - 5.8, P[1] + 0.4], [P[0] - 6.2, P[1] - 5], [C[0] - 8, C[1] + 7.6], [C[0] - 8.6, C[1] + 3]], HIDE, 4, { round: 0.92, cast: 1, floor: 1 });
  px.toneLine(C[0] + 0.6, C[1] + 8, C[0] + 6.6, C[1] + 7.4, -1, bodyId);          // under the chest plate
  px.toneLine(C[0] + 2.2, C[1] + 9, P[0] + 2.4, P[1] - 4.6, 1, bodyId);           // the lacing down the front
  px.poly([[C[0] - 6.6, C[1] + 1.6], [C[0] - 4, C[1] + 0.6], [P[0] + 5.8, P[1] - 6.6], [P[0] + 5.6, P[1] - 4.2]], DARK, 4.03, { round: 0.5, floor: 1 });
  px.poly([[P[0] - 6.1, P[1] - 3.8], [P[0] + 5.9, P[1] - 3.8], [P[0] + 5.6, P[1] + 0.2], [P[0] - 5.8, P[1] + 0.2]], DARK, 4.05, { round: 0.92, bias: 1, floor: 1 });
  px.rect(P[0] + 1.2, P[1] - 3.4, 3, 3, GOLD, 4.06, { fix: 3 });
  px.dot(P[0] + 2.3, P[1] - 2.2, GOLD, 4.07, { fix: 1 });
  px.part();
  px.ellipse(C[0] + 3.4, C[1] + 5.2, 2, 2, GOLD, 4.1, { cast: 1 });
  px.dot(C[0] + 3.4, C[1] + 5.2, RED, 4.12, { fix: 2 });
  // the red sash down the front, a beat behind the hips, and the trophy skull at the back hip
  {
    const s0 = [P[0] + 1.4, P[1] + 0.2], sw = cl(sh * 1.3, -3, 3);
    px.part();
    px.poly([[s0[0] - 1.6, s0[1]], [s0[0] + 2, s0[1]], [s0[0] + 2.2 + sw * 0.5, s0[1] + 5], [s0[0] + 2 + sw, s0[1] + 9.6], [s0[0] + 0.4 + sw, s0[1] + 8.2], [s0[0] - 1.2 + sw, s0[1] + 9.8], [s0[0] - 1.6 + sw * 0.5, s0[1] + 5]], RED, 4.2, { round: 0.6, cast: 1 });
    px.part();
    px.line(P[0] - 4.2, P[1] + 0.2, P[0] - 4.4 + sw * 0.4, P[1] + 2, DARK, 4.2);
    px.stamp(TROPHY, P[0] - 4.4 + sw * 0.6, P[1] + 4.4, SKULL_LEG, 4.22, { ax: 2, ay: 2, ball: [2.5, 2.2, 3, 3] });
  }

  // ---- the fur mantle: a thick collar over both shoulders, tufted along its edge
  px.part();
  px.ellipse(C[0] - 0.2, C[1] - 2, 9, 3.5, FUR, 4.4, { cast: 1 });
  for (const [x, y] of [[-6.6, 2.8], [-3.8, 3.6], [-1, 3.2], [2, 3.8], [4.8, 3.4], [7.4, 2.4]]) px.dot(C[0] - 0.2 + x, C[1] - 2 + y, FUR, 4.4);

  // ---- the head: the far horn and ear behind it, the helm's near horn, the long near ear
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const ex = cl(-vx * 1.3 - vx2 * 0.9, -3, 3), ey = cl(-vy * 1.3 - vy2 * 0.9 - (p.ear || 0) * 1.6, -3, 3);
  px.part();
  px.poly([[hx + 3.4, hy - 9.4], [hx + 6.6, hy - 9.6], [hx + 7, hy - 14], [hx + 8.6, hy - 19], [hx + 4.8, hy - 15.4], [hx + 3.4, hy - 12.4]], BONE, 5.4, { bias: -1, n: [0.1, -0.3, 0.9] });
  px.part();
  px.poly([[hx - 1.8, hy - 8], [hx - 2.6, hy - 4.6], [hx - 7 + ex * 0.5, hy - 7 + ey * 0.5], [hx - 11.4 + ex, hy - 10.4 + ey], [hx - 5.6 + ex * 0.5, hy - 9.6 + ey * 0.5]], SKIN, 5.5, { bias: -1, n: [-0.2, -0.2, 0.9] });
  px.part();
  px.stamp(blow ? BLOW : p.blink ? BLINK : p.glance ? GLANCE : p.roar > 0.5 ? ROAR : HEAD, hx, hy, LEG, 6, { ax: 6, ay: 11, ball: [7.5, 7.5, 8, 8.5], cast: 1 });
  px.part();
  px.poly([[hx - 3.6, hy - 8.2], [hx - 0.4, hy - 9.4], [hx - 1.2, hy - 13.4], [hx + 1, hy - 19.6], [hx - 3.6, hy - 15.6], [hx - 5, hy - 11.6]], BONE, 6.4, { n: [-0.3, -0.35, 0.88], cast: 1 });
  px.toneLine(hx - 2.2, hy - 9.4, hx - 3.6, hy - 11, -1, px._pid);
  {
    const b = [hx - 3.4, hy - 5];
    px.part(); const earId = px._pid;
    px.poly([[b[0] + 0.6, b[1] - 2.4], [b[0] + 1.6, b[1] + 2.4], [b[0] - 4.2 + ex * 0.4, b[1] + 1.6 + ey * 0.4], [b[0] - 11.6 + ex, b[1] - 1.4 + ey], [b[0] - 5 + ex * 0.4, b[1] - 3.2 + ey * 0.4]], SKIN, 6.5, { n: [-0.25, -0.35, 0.9], cast: 1 });
    px.toneLine(b[0] - 0.2, b[1] - 0.2, b[0] - 7 + ex * 0.6, b[1] - 1 + ey * 0.6, -1, earId);
    px.part();
    px.dot(b[0] - 4.6 + ex * 0.4, b[1] + 2.2 + ey * 0.4, GOLD, 6.6, { fix: 3 }); px.dot(b[0] - 4.6 + ex * 0.4, b[1] + 3.2 + ey * 0.4, GOLD, 6.6, { fix: 1 });
  }

  // ---- the war horn, at his lips (it is out of sight under the mantle otherwise)
  const mouth = [hx + 7.4, hy - 0.6], hornHand = [hx + 9.4, hy + 2.6];
  let bell = null;
  if (blow) {
    // a curled horn: down from the lips, round, and up to a flared bell that opens forward and up
    const a = [hx + 10.4, hy + 2.8], b = [hx + 14, hy + 2.4]; bell = [hx + 16.8, hy - 1.6];
    px.part();
    px.capsule(mouth[0], mouth[1], 0.8, a[0], a[1], 1.4, HORN, 8.2, { cast: 1 });
    px.capsule(a[0], a[1], 1.4, b[0], b[1], 2.1, HORN, 8.2, { cast: 1 });
    px.capsule(b[0], b[1], 2.1, bell[0], bell[1], 2.9, HORN, 8.2, { cast: 1 });
    px.line(a[0] + 1.2, a[1] - 1.6, a[0] + 1.6, a[1] + 1.8, GOLD, 8.22, { fix: 3 });
    px.part();
    px.ellipse(bell[0] + 1, bell[1] - 1.4, 1.9, 3.3, GOLD, 8.24, { rot: -0.6 });
    px.ellipse(bell[0] + 1.4, bell[1] - 1.6, 1, 2.2, MOUTH, 8.26, { rot: -0.6 });
  }

  // ---- the near arm over it all: a gold armband, a studded wristband. It swings free, takes the pole below the far fist
  // (g2), or holds the horn to his mouth
  {
    const tgt = blow ? hornHand : mix(sk.hdN, at(tt.lo - 6.5), g2);
    const r = ik(sN[0], sN[1], tgt[0], tgt[1], B.upper, B.fore, 1), eN = r.mid, hdN = r.end;
    const up = hdN[1] < sN[1] - 6 && !blow, az = up ? 5.6 : 7.9;      // raised overhead it passes behind the helm
    px.part();
    px.capsule(sN[0], sN[1] + 0.8, 3.2, eN[0], eN[1], 2.9, SKIN, az, { cast: 1 });
    px.capsule(eN[0], eN[1], 2.8, hdN[0], hdN[1], 2.7, SKIN, az, { cast: 1 });
    const a0 = mix(sN, eN, 0.76), a1 = mix(sN, eN, 0.92);
    { const u = [eN[0] - sN[0], eN[1] - sN[1]], l = Math.hypot(u[0], u[1]) || 1, n = [-u[1] / l * 3.1, u[0] / l * 3.1];
      px.poly([[a0[0] + n[0], a0[1] + n[1]], [a0[0] - n[0], a0[1] - n[1]], [a1[0] - n[0], a1[1] - n[1]], [a1[0] + n[0], a1[1] + n[1]]], GOLD, az + 0.04, { round: 0.85 }); }
    const b0 = mix(eN, hdN, 0.5), b1 = mix(eN, hdN, 0.74);
    px.capsule(b0[0], b0[1], 2.9, b1[0], b1[1], 2.9, DARK, az + 0.05, { cast: 1, floor: 1 });
    px.dot(mix(b0, b1, 0.5)[0], mix(b0, b1, 0.5)[1], GOLD, az + 0.06, { fix: 3 });
    // the mantle's near shoulder, over the arm's root
    px.part();
    px.ellipse(sN[0] - 0.2, sN[1] - 1, 4.4, 3.2, FUR, 8, { cast: 1 });
    for (const x of [-3.4, -1.2, 1, 3.2]) { px.dot(sN[0] - 0.2 + x, sN[1] + 2 - Math.abs(x) * 0.2, FUR, 8); px.dot(sN[0] - 0.2 + x, sN[1] + 3 - Math.abs(x) * 0.2, FUR, 8); }
    px.dot(sN[0] - 2.2, sN[1] - 2.2, FUR, 8.01, { fix: 3 }); px.dot(sN[0] + 0.8, sN[1] - 2.8, FUR, 8.01, { fix: 3 }); px.dot(sN[0] - 0.4, sN[1] - 0.6, FUR, 8.01, { fix: 1 });
    px.part();
    px.ellipse(hdN[0], hdN[1], 2.7, 2.7, SKIN, blow ? 8.3 : up ? 5.7 : 8.3);
  }

  return { bell, head: at(TOT + 6.2, 0.6) };
};

// the smash's smear and the turf it throws up; the horn's sound leaving its bell
const T0 = 0.44, T1 = 0.54;
export const fx = (px, F, info, clip) => {
  const { ph } = F, NL = { noLine: true };
  if (clip === "attack") {
    if (ph > T0 + 0.01 && ph < T1 + 0.075) {
      const end = Math.min(ph, T1 + 0.004), n = ph > T1 + 0.01 ? 5 : 6, pts = [];
      for (let i = 0; i <= n; i++) { const t = totemOf(F.at(Math.max(T0, end - 0.003 - i * 0.0085))); pts.push([t.at(TOT + 10, 0.6), t.at(TOT - 6, 0.6)]); }
      for (let i = 0; i + 1 < pts.length; i++) {
        const t = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1), m = ph < T1 + 0.01 && t < 0.4 ? SMEAR1 : SMEAR2;
        px.poly([pts[i][0], pts[i + 1][0], mix(pts[i + 1][1], pts[i + 1][0], 0.15 + t1 * 0.8), mix(pts[i][1], pts[i][0], 0.15 + t * 0.8)], m, 20 - t, NL);
      }
    }
    if (ph >= T1 - 0.02 && ph < T1 + 0.22 && info.head) {
      const t = (ph - (T1 - 0.02)) / 0.24, [x] = info.head;
      for (let i = 0; i < 8; i++) {
        const dir = (i - 3.5) * 0.4, sp = 5 + (i * 37 % 5) * 1.7;
        px.dot(x + Math.sin(dir) * sp * t * 1.7, Math.min(0, -2 - Math.cos(dir) * sp * t * 2.1 + 11 * t * t), i % 3 ? CLOD : TURF, 20, { noLine: i % 2 === 0 });
      }
    }
  }
  if (clip === "horn" && info.bell) {
    // three short arcs of sound leaving the bell, each wider and fainter than the last
    const [bx0, by0] = info.bell, ax = 0.96, ay = -0.26;
    for (let i = 0; i < 3; i++) {
      const u = (ph * 2 + i / 3) % 1, r = 6 + u * 13, half = 0.42 + u * 0.2, n = Math.ceil(r * half * 2.2);
      if (u > 0.9) continue;
      for (let k = 0; k <= n; k++) {
        const a = Math.atan2(ay, ax) + (k / n - 0.5) * 2 * half;
        px.dot(bx0 + 1.4 + Math.cos(a) * r, by0 - 1.6 + Math.sin(a) * r, u < 0.55 ? SOUND : SOUND2, 20, u < 0.3 ? {} : NL);
      }
    }
  }
};

const TAU = Math.PI * 2;
const GUARD = { drop: 0, lean: 0.03, twist: 0, hx: 0.6, hy: 0, rise: 0, aN: [0.08, 0.78, 0], aF: [1.22, 0.9, 0], fN: [-3, 0], fF: [3.4, 0], tot: -0.02, gk: 0, grip: 22, g2: 0, lift: 0, roar: 0, horn: 0, sway: 0, trail: 0 };
// the march both `walk` and `horn` are built on: ONE call, so their legs and body height are the same frame for frame
const march = (ph) => walkPose(ph, { stride: 5.6, lift: 3, swing: 0.3, bob: 1.5, lean: 0.07 });
export const CLIPS = {
  idle: {
    n: 8, ms: 2400, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b, s = Math.sin(ph * TAU - 1.1);
      return { ...GUARD, rise: 1.1 * u, rx: 0.5 * s, aN: [0.08 - 0.03 * b, 0.78 - 0.03 * u, 0], aF: [1.22, 0.9 - 0.02 * u, 0], sx: 19.8, sway: Math.sin(ph * TAU + 0.8),
        glance: ph >= 0.3 && ph < 0.56 ? 1 : 0, blink: ph >= 0.8 && ph < 0.92 ? 1 : 0, ear: ph >= 0.3 && ph < 0.44 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = march(ph), a = Math.cos(ph * TAU);
      return { ...w, hx: 0.8, twist: -a * 0.6, aN: [-a * 0.34 + 0.12, 0.9, 0], aF: [1.2 + 0.05 * a, 0.9, 0], tot: 0.05 + 0.05 * Math.sin((ph - 0.1) * TAU * 2), gk: 1, grip: 25, sway: Math.sin(ph * TAU * 2), trail: 1 };
    },
  },
  // the summons, on the march: the very walk above with the horn at his lips
  horn: {
    n: 8, ms: 760, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = march(ph), a = Math.cos(ph * TAU);
      return { ...w, hx: -0.4, hy: -0.8, twist: -a * 0.6, aN: [1.3, 0.8, 0], aF: [1.3 + 0.04 * a, 0.98, 0], tot: 0.05 + 0.05 * Math.sin((ph - 0.1) * TAU * 2), gk: 1, grip: 25, sway: Math.sin(ph * TAU * 2), trail: 1, horn: 1 };
    },
  },
  attack: {
    n: 13, ms: 860, loop: false, lag: 0.05,
    pose: (ph) => {
      const p = sampleKeys([
        { t: 0, p: GUARD },
        // the near hand comes across to the pole and it leaves the ground
        { t: 0.14, e: "io", p: { ...GUARD, rx: -0.6, aF: [1.5, 0.8, 0], tot: -0.12, gk: 1, grip: 29, g2: 1 } },
        // the heave: up and back over the helm, the weight on the back foot, the front foot off the ground
        { t: 0.34, e: "out", p: { ...GUARD, rx: -2.6, drop: 0.6, rise: 1, lean: -0.1, twist: -0.4, hx: 0.2, hy: -0.4, aF: [2.85, 0.82, 0], fF: [3, 2.4], tot: -0.72, gk: 1, grip: 28, g2: 1 } },
        { t: T0, e: "io", p: { ...GUARD, rx: -3.2, drop: 0.4, rise: 1.4, lean: -0.15, twist: -0.5, hx: 0, hy: -0.6, aF: [3, 0.85, 0], fF: [3.4, 3.2], tot: -0.92, gk: 1, grip: 28, g2: 1, roar: 1 } },
        // the smash: a step in, the skull comes down on him
        { t: T1, e: "in3", p: { ...GUARD, rx: 3.8, drop: 3.2, lean: 0.44, twist: 0.5, hx: 1.6, hy: 1.4, aF: [0.6, 0.94, 0], fF: [9, 0], tot: 1.66, gk: 1, grip: 28, g2: 1, roar: 1 } },
        { t: 0.63, e: "out", p: { ...GUARD, rx: 4.4, drop: 4, lean: 0.5, twist: 0.6, hx: 1.8, hy: 1.8, aF: [0.54, 0.94, 0], fF: [9, 0], tot: 1.72, gk: 1, grip: 28, g2: 1, roar: 1 } },
        { t: 0.76, e: "io", p: { ...GUARD, rx: 4, drop: 3.4, lean: 0.46, twist: 0.5, hx: 1.6, hy: 1.4, aF: [0.58, 0.94, 0], fF: [9, 0], tot: 1.68, gk: 1, grip: 28, g2: 1 } },
        // he hauls it upright again and plants it
        { t: 0.9, e: "io", p: { ...GUARD, rx: 1.4, drop: 1, lean: 0.14, aF: [1.2, 0.86, 0], fF: [6.4, 1.8], tot: 0.7, gk: 1, grip: 30, g2: 0.7 } },
        { t: 1, e: "out", p: GUARD },
      ], ph);
      // the jar of the blow up the pole
      if (ph > 0.56 && ph < 0.76) { const k = (0.76 - ph) / 0.2, s = Math.sin(ph * 95); p.hx += s * 0.6 * k; p.twist += s * 0.2 * k; }
      return p;
    },
  },
};
