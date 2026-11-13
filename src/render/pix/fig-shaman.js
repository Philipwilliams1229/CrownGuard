// ============ FIGURE: the Goblin Shaman ============
// A goblin's body (see fig-goblin.js) in a red-brown robe to the shins, hemmed
// and collared in gold: hunched over a tall gnarled staff whose claw holds a
// teal-green orb. A gold circlet with three feathers (blue, gold, red) that bob
// a beat behind the head, long ears, red eyes, a snaggle grin, a string of
// teeth and beads at the throat.
// Clips: idle, walk (a hunched shuffle, the staff planted in time), attack (a
// swat with the staff's head) and CHANT: his heal on the march. `chant` is built
// from the very same walkPose call as `walk`, so frame k of one has exactly frame
// k of the other's legs and body height; only the arms, the head and the light
// differ (the staff thrust up, the head thrown back, the orb blazing).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, scaled, HUMAN } from "./rig.js";

const SKIN = mat("#6aa04f"), ROBE = mat("#8a4a3a"), SLEEVE = mat("#9a5844"), GOLD = mat("#e8c14a", { contrast: 1.15 }), DARK = mat("#3c2a18");
const WOOD = mat("#6a4a2a"), BONE = mat("#ece0c4"), ORB = mat("#7ce0b8", { contrast: 1.3 });
const F_RED = mat("#c8383a"), F_GOLD = mat("#e8c14a"), F_BLUE = mat("#3a80c0");
const EYE = flat("#c8453a"), GLINT = flat("#ffb070"), MOUTH = flat("#2c1a22");
const GLOW = flat("#7ce0b8", { emis: true, line: "#2f8a72" }), HOT = flat("#eafff4", { emis: true, line: "#7ce0b8" });
const M_TEAL = flat("#7ce0b8", { emis: true, line: "#2f8a72" }), M_PALE = flat("#eafff4", { emis: true, line: "#7ce0b8" }), M_DEEP = flat("#2f8a72", { emis: true });
const SMEAR1 = flat("#eafff4"), SMEAR2 = flat("#9fe6c8");

// The head, facing +x, a quarter turned: a bald dome over a gold circlet (Y, y
// its shadowed back), the goblin's heavy brow (B), red eyes (E, e the glint), the
// hooked nose proud of it all (L H N n), a small grin of odd teeth (T) in a dark mouth (M).
const HEAD = [
  ".................",
  "......GGGGG......",
  "....yyYYYYYYY....",
  "...GGGGGGGGGGG...",
  "..GGGBBBBGGBBBB..",
  "..GGGbEeGGbEeG...",
  "..GGGbEEGGbEEHH..",
  "..GGGGGGGGGgLHHHL",
  "..gGGGGGGGGgnLLNN",
  "..ggGGMMTMTMg.nn.",
  "...GgGGMMMMg.....",
  "...gGGGGGGg......",
  ".....gggg........",
];
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const BLINK = swap(HEAD, { 5: "..GGGGGGGGGGGG...", 6: "..GGGBBBGGBBBHH.." });
// the swat's snarl: teeth
const SNARL = swap(HEAD, { 9: "..ggMTMTMTMTg.nn.", 10: "...GgMMMMMMg....." });
// the chant: the head thrown back (the nose a row higher), the eyes wide, the mouth a howl
const CHANT = swap(HEAD, {
  6: "..GGGbEEGGbEELHHL",
  7: "..GGGGGGGGGgnLLNN",
  8: "..gGGGGGGGGgG.nn.",
  9: "..ggGGMTMMTMg....",
  10: "...GgGMMMMMMg....",
  11: "...gGGGMMMTg.....",
  12: ".....gggggg......",
});
const LEG = {
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 1 }, L: { m: SKIN, fix: 3 }, H: { m: SKIN, fix: 4 },
  B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, E: { m: EYE }, e: { m: GLINT }, T: { m: BONE, fix: 3 }, M: { m: MOUTH },
  Y: { m: GOLD, fix: 3 }, y: { m: GOLD, fix: 1 }, W: { m: BONE, fix: 3 },
};

export const BOX = { w: 78, h: 74, ox: 22, oy: 66 };
export const BONES = scaled(HUMAN, 0.75, { spine: 8, neck: 1, upper: 5.2, fore: 5.2, shN: -2.8, shF: 2.6, hipN: -1.7, hipF: 1.8 });
const STAFF = 36;                      // the shaft, foot to the collar under the claw

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const lerp = (a, b, t) => a + (b - a) * t;

// The staff, in the far fist. Planted (`sx`: where its foot stands) it leans from
// the foot to the hand; carried, `staff` is its tilt (0 upright, + toward the foe)
// and the fist holds it `grip` px above the foot (`gk` 1), or wherever the ground
// puts it (`gk` 0: the foot `lift` px off the ground).
const staffOf = (sk) => {
  const p = sk.p, h = sk.hdF, hgt = Math.max(2, -h[1] - (p.lift || 0));
  const tl = p.sx != null ? Math.atan2(h[0] - p.sx, hgt) : (p.staff ?? 0);
  const d = [Math.sin(tl), -Math.cos(tl)], nn = [Math.cos(tl), Math.sin(tl)];
  const lo = lerp(cl(hgt / Math.max(0.3, Math.cos(tl)), 5, STAFF - 5), p.grip ?? 14, p.sx != null ? 0 : (p.gk || 0));
  const foot = [h[0] - d[0] * lo, h[1] - d[1] * lo], tip = [foot[0] + d[0] * STAFF, foot[1] + d[1] * STAFF];
  const at = (a, b) => [tip[0] + d[0] * a + nn[0] * b, tip[1] + d[1] * a + nn[1] * b];
  return { d, nn, foot, tip, at, orb: at(4.2, 0) };
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(N[0] - lag1.N[0], -2, 2), vy = cl(N[1] - lag1.N[1], -2, 2);
  const vx2 = cl(lag1.N[0] - lag2.N[0], -2, 2), vy2 = cl(lag1.N[1] - lag2.N[1], -2, 2);
  const bx = cl(P[0] - lag1.P[0], -2, 2), bx2 = cl(lag1.P[0] - lag2.P[0], -2, 2);
  const w1 = lag1.p.sway || 0, w2 = lag2.p.sway || 0;
  const g = p.glow || 0;

  // ---- the staff: a gnarled shaft, a gold collar, a forked claw of its own wood holding the orb; a bone charm hangs off it
  const st = staffOf(sk), st1 = staffOf(lag1), { at, orb } = st;
  px.part();
  px.capsule(st.foot[0], st.foot[1], 0.9, st.tip[0], st.tip[1], 0.9, WOOD, 1.5, { edge: true });
  { const k = at(-9, 0.6); px.dot(k[0], k[1], WOOD, 1.51, { fix: 3 }); const k2 = at(-17, -0.6); px.dot(k2[0], k2[1], WOOD, 1.51, { fix: 1 }); }
  px.part();
  px.capsule(...at(-1.4, 0), 1.3, ...at(0, 0), 1.5, GOLD, 1.55);
  // the charm: a finger bone on its string, swinging a beat behind the staff's head
  {
    const sw = cl(-(st.tip[0] - st1.tip[0]) * 1.3 + w1 * 0.7, -2.4, 2.4), dp = cl((st.tip[1] - st1.tip[1]) * 0.5, -1, 1);
    const c1 = at(-1.6, 1.2);
    px.part();
    px.line(c1[0], c1[1], c1[0] + 0.6 + sw * 0.4, c1[1] + 2 - dp, DARK, 1.52);
    px.line(c1[0] + 0.6 + sw * 0.4, c1[1] + 2.6 - dp, c1[0] + 0.8 + sw * 0.7, c1[1] + 4.6 - dp, BONE, 1.53, { fix: 3 });
  }
  // the claw: the shaft forks and curls up round the orb
  px.part();
  px.line(...at(0.6, -1.6), ...at(3.6, -3.2), WOOD, 1.58, { fix: 1 }); px.line(...at(3.6, -3.2), ...at(6, -2.4), WOOD, 1.58, { fix: 2 });
  px.line(...at(0.6, 1.6), ...at(3.6, 3.2), WOOD, 1.58, { fix: 2 }); px.line(...at(3.6, 3.2), ...at(6, 2.4), WOOD, 1.58, { fix: 3 });
  px.part();
  {
    const ox = Math.round(orb[0] - 0.5) + 0.5, oy = Math.round(orb[1] - 0.5) + 0.5;
    if (g > 0.75) { px.ellipse(ox, oy, 3.1, 3.1, GLOW, 1.6); px.ellipse(ox, oy, 1.9, 1.9, HOT, 1.62); }
    else if (g > 0.4) { px.ellipse(ox, oy, 2.6, 2.6, GLOW, 1.6); px.ellipse(ox - 0.5, oy - 0.5, 1.1, 1.1, HOT, 1.62); }
    else {
      px.ellipse(ox, oy, 2.6, 2.6, ORB, 1.6);
      if (g > 0.22) { px.dot(ox - 1, oy - 1, HOT, 1.62); px.dot(ox, oy - 1, GLOW, 1.62); px.dot(ox - 1, oy, GLOW, 1.62); }
      else px.dot(ox - 1, oy - 1.4, ORB, 1.62, { fix: 4 });
    }
  }

  // ---- the far arm, a tone down: a wide sleeve, a gold cuff, the fist on the staff
  {
    const wr = mix(eF, hdF, 0.62);
    px.part();
    px.capsule(sF[0], sF[1], 1.8, eF[0], eF[1], 1.9, SLEEVE, 1, { bias: -1 });
    px.capsule(eF[0], eF[1], 1.9, wr[0], wr[1], 2.3, SLEEVE, 1, { bias: -1 });
    px.capsule(wr[0], wr[1], 1.3, hdF[0], hdF[1], 1.3, SKIN, 1.01, { bias: -1 });
    px.part();
    px.ellipse(hdF[0], hdF[1], 1.7, 1.8, SKIN, 1.7, { bias: -1 });
  }

  // ---- bare shins and big flat feet under the hem
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(hp[0], hp[1], 1.9, kn[0], kn[1], 1.7, SKIN, z, { bias: b });
    px.capsule(kn[0], kn[1], 1.6, an[0], an[1], 1.25, SKIN, z, { bias: b });
    px.capsule(an[0] - 0.5, an[1] + 0.55, 1.15, an[0] + 3.3, an[1] + 0.7, 0.95, SKIN, z, { bias: b });
  }

  // ---- the robe: a hunched barrel from the shoulders, belling to a gold hem at the shins; the hem trails
  const hemY = -5.2, top = C[1] - 1.8;
  const hemF = Math.max(P[0] + 4.8, Math.max(anN[0], anF[0]) + 2.2) - bx * 0.6 + w1 * 0.3;
  const hemB = Math.min(P[0] - 5.2, Math.min(anN[0], anF[0]) - 2) - bx * 1.2 - bx2 * 0.8 + w1 * 0.5;
  const hm = (t) => hemB + (hemF - hemB) * t;
  px.part(); const robeId = px._pid;
  px.poly([[C[0] - 3.8, top], [C[0] + 3.4, top + 0.3], [C[0] + 4.5, C[1] + 2.8], [P[0] + 4.2, P[1] - 1.4], [hemF, hemY - 2.2], [hemF, hemY],
    [hemB, hemY], [hemB, hemY - 2.2], [P[0] - 4.8, P[1] - 1.6], [C[0] - 5.4, C[1] + 2.6]], ROBE, 4, { round: 0.9, cast: 1 });
  px.toneLine(P[0] - 1.6, P[1] + 0.6, hm(0.36), hemY - 2.4, -1, robeId);
  px.toneLine(P[0] + 2.6, P[1] + 0.4, hm(0.8), hemY - 2.4, 1, robeId);
  // the gold hem, a row of dark stitches above it
  px.poly([[hemB, hemY - 1.9], [hemF, hemY - 1.9], [hemF, hemY], [hemB, hemY]], GOLD, 4.04, { round: 0.9 });
  for (let t = 0.14; t < 0.95; t += 0.24) px.tone(hm(t), hemY - 2.6, -1, robeId);
  // the cord, a pouch at the back hip, a finger bone swinging at the front
  px.poly([[P[0] - 4.9, P[1] - 2.9], [P[0] + 4.3, P[1] - 2.9], [P[0] + 4.3, P[1] - 1.5], [P[0] - 4.9, P[1] - 1.5]], DARK, 4.05, { round: 0.92, floor: 1 });
  {
    const sw = cl(-bx * 1.2 - bx2 * 0.9 + w1 * 0.5, -1.5, 1.5);
    px.part();
    px.line(P[0] + 2.4, P[1] - 1.4, P[0] + 2.4 + sw * 0.5, P[1] + 0.2, BONE, 4.2, { fix: 3 });
    px.line(P[0] + 2.4 + sw * 0.5, P[1] + 0.8, P[0] + 2.4 + sw, P[1] + 2.4, BONE, 4.2, { fix: 2 });
    px.part();
    px.ellipse(P[0] - 3.2 + sw * 0.4, P[1] + 0.4, 1.6, 1.8, DARK, 4.15, { floor: 1 });
  }
  // the gold collar and the string of teeth and beads under it
  px.part();
  px.poly([[C[0] - 3.4, top - 0.2], [C[0] + 3.5, top + 0.1], [C[0] + 3.8, top + 1.2], [C[0] - 3.7, top + 1]], GOLD, 4.3, { round: 0.9 });
  {
    const sw = cl(-vx * 0.8 - vx2 * 0.6, -1, 1);
    const beads = [[-1.6, 3.2, BONE], [0.2 + sw * 0.4, 4.4, ORB], [1.9 + sw * 0.6, 4.9, BONE], [3.4 + sw * 0.4, 4.1, BONE]];
    for (const [x, y, m] of beads) px.dot(C[0] + x, top + y, m, 4.31, { fix: 3 });
  }

  // ---- the head: the far ear behind it, the circlet's three feathers trailing a beat behind, the near ear
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const ex = -vx * 1.2 - vx2 * 0.8, ey = -vy * 1.3 - vy2 * 0.9;
  px.part();
  px.poly([[hx - 1.6, hy - 8.4], [hx - 2.6, hy - 4.6], [hx - 6 + ex * 0.5, hy - 7 + ey * 0.5], [hx - 8.6 + ex, hy - 10.6 + ey], [hx - 4.6 + ex * 0.5, hy - 9.8 + ey * 0.5]], SKIN, 5.5, { bias: -1, n: [-0.2, -0.2, 0.9] });
  px.part();
  px.stamp(p.chant > 0.5 ? CHANT : p.blink ? BLINK : p.snarl > 0.5 ? SNARL : HEAD, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [7.5, 6.5, 7.5, 7.5], cast: 1 });
  {
    const bend = cl(vx * 2 + vx2 * 1.4 - w2 * 0.6, -2.4, 2.8), bob = cl(vy * 1.2 + vy2 * 0.8, -1.5, 1.5), root = [hx - 0.5, hy - 8];
    const feather = (dx0, ang, len, m, z, k) => {
      const r = [root[0] + dx0, root[1]], dx = Math.sin(ang), dy = -Math.cos(ang);
      const mid = [r[0] + dx * len * 0.5 - bend * 0.35 * k, r[1] + dy * len * 0.5 - bob * 0.3];
      const tip = [r[0] + dx * len - bend * k, r[1] + dy * len - bob * 0.8 + Math.abs(bend) * 0.35 * k];
      px.part();
      px.capsule(r[0], r[1], 0.7, mid[0], mid[1], 1.45, m, z);
      px.capsule(mid[0], mid[1], 1.45, tip[0], tip[1], 0.55, m, z);
    };
    feather(-2.4, -0.95, 9, F_RED, 6.26, 1.25);
    feather(-0.4, -0.42, 11.5, F_GOLD, 6.3, 1.1);
    feather(1.4, -0.1, 10, F_BLUE, 6.34, 0.9);
  }
  {
    const b = [hx - 3.2, hy - 4];
    px.part(); const earId = px._pid;
    px.poly([[b[0] + 0.6, b[1] - 2.6], [b[0] + 1.6, b[1] + 2.2], [b[0] - 3.4 + ex * 0.4, b[1] + 1 + ey * 0.4], [b[0] - 9.6 + ex, b[1] - 2.6 + ey], [b[0] - 4.4 + ex * 0.4, b[1] - 3.6 + ey * 0.4]], SKIN, 6.5, { n: [-0.25, -0.35, 0.9], cast: 1 });
    px.toneLine(b[0] - 0.2, b[1] - 0.2, b[0] - 5.6 + ex * 0.6, b[1] - 1.6 + ey * 0.6, -1, earId);
  }

  // ---- the near arm over it all: a wide sleeve to the wrist, a gold cuff, the hand
  {
    const wr = mix(eN, hdN, 0.74), c0 = mix(eN, hdN, 0.6);
    px.part();
    px.capsule(sN[0], sN[1] + 0.4, 2.1, eN[0], eN[1], 2.1, SLEEVE, 7.9, { cast: 2 });
    px.capsule(eN[0], eN[1], 2.1, wr[0], wr[1], 2.5, SLEEVE, 7.9, { cast: 2 });
    { const u = [hdN[0] - eN[0], hdN[1] - eN[1]], l = Math.hypot(u[0], u[1]) || 1, n = [-u[1] / l, u[0] / l];
      px.poly([[c0[0] + n[0] * 2.6, c0[1] + n[1] * 2.6], [c0[0] - n[0] * 2.6, c0[1] - n[1] * 2.6], [wr[0] - n[0] * 2.7 + u[0] / l * 0.6, wr[1] - n[1] * 2.7 + u[1] / l * 0.6], [wr[0] + n[0] * 2.7 + u[0] / l * 0.6, wr[1] + n[1] * 2.7 + u[1] / l * 0.6]], GOLD, 7.95, { round: 0.8 }); }
    px.part();
    px.ellipse(hdN[0] + (hdN[0] - eN[0]) * 0.12, hdN[1] + (hdN[1] - eN[1]) * 0.12, 1.8, 1.8, SKIN, 8.3);
  }

  const k = cl(g, 0, 1.4);
  return {
    // (his face is a few pixels from the orb: the light is capped so the face keeps its own colours)
    light: k > 0.05 ? { x: orb[0], y: orb[1], r: 14 + 22 * cl(k, 0, 1), col: "#7ce0b8", k: Math.min(k, 0.4 + 0.25 * k) } : null,
    orb, feet: [P[0], 0], hemB, hemF,
  };
};

// the swat's smear, and the chant's rising motes
const T0 = 0.4, T1 = 0.52;
export const fx = (px, F, info, clip) => {
  const { ph } = F, NL = { noLine: true };
  if (clip === "attack" && ph > T0 + 0.01 && ph < T1 + 0.09) {
    // one solid crescent behind the staff's head on the swing's fastest frames
    const end = Math.min(ph, T1 + 0.004), n = ph > T1 + 0.01 ? 4 : 6, pts = [];
    for (let i = 0; i <= n; i++) { const s = staffOf(F.at(Math.max(T0, end - 0.004 - i * 0.012))); pts.push([s.at(7.4, 0), s.at(-4, 0)]); }
    for (let i = 0; i + 1 < pts.length; i++) {
      const t = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1), m = ph < T1 + 0.01 && t < 0.4 ? SMEAR1 : SMEAR2;
      px.poly([pts[i][0], pts[i + 1][0], mix(pts[i + 1][1], pts[i + 1][0], 0.2 + t1 * 0.75), mix(pts[i][1], pts[i][0], 0.2 + t * 0.75)], m, 20 - t, NL);
    }
  }
  if (clip === "chant" && info.orb) {
    const [ox, oy] = info.orb, [cx] = info.feet;
    // the orb's gleam: four rays, long and short by turns
    const L = Math.round(ph * 8) % 2 ? 6.6 : 5.2;
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a); px.line(ox + c * 4.4, oy + s * 4.4, ox + c * L, oy + s * L, M_TEAL, 20.4, NL); }
    // motes rising off the orb
    for (let i = 0; i < 4; i++) {
      const u = (ph + i / 4) % 1, x = ox + Math.sin(i * 2.4 + u * 4) * (2.5 + 3 * u) + (i - 1.5) * 1.6, y = oy - 4 - u * 9;
      if (y < -BOX.oy + 3) continue;
      px.dot(x, y, u < 0.5 ? M_PALE : M_TEAL, 20, u > 0.75 ? NL : {});
    }
    // the mending: motes rising round him off the ground, each with a short tail
    for (let i = 0; i < 6; i++) {
      const u = (ph * 2 + i * 0.37) % 1, side = i % 2 ? 1 : -1, x = cx + side * (6 + (i * 37 % 7)) + Math.sin(u * 5 + i) * 1.2, y = -2 - u * (12 + (i % 3) * 4);
      if (u > 0.85 || (x > info.hemB - 1 && x < info.hemF + 1 && y > -24)) continue;
      px.dot(x, y, u < 0.35 ? M_PALE : M_TEAL, 20, NL); px.dot(x, y + 1, M_TEAL, 19.9, NL); if (u < 0.6) px.dot(x, y + 2, M_DEEP, 19.8, NL);
    }
  }
};

const TAU = Math.PI * 2;
const READY = { drop: 0.6, lean: 0.3, hx: 1.6, hy: 0.2, aF: [1.12, 0.86, 0], aN: [0.3, 0.8, 0], fN: [-2.2, 0], fF: [2.4, 0], staff: 0.18, lift: 0, gk: 0, grip: 14, glow: 0.12, sway: 0, chant: 0, snarl: 0, blink: 0 };
// the march both `walk` and `chant` are built on: ONE call, so their legs and body height are the same frame for frame
const march = (ph) => { const w = walkPose(ph, { stride: 3.3, lift: 2.2, swing: 0.12, bob: 1.2, lean: 0.32 }); return { ...w, drop: w.drop + 0.6 }; };
export const CLIPS = {
  idle: {
    n: 8, ms: 2000, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b, s = Math.sin(ph * TAU - 1.1);
      return { ...READY, rise: 0.6 * u, rx: 0.5 * s, aF: [1.12, 0.86 - 0.02 * u, 0], aN: [0.3 + 0.06 * s, 0.8, 0], sx: 10.6, sway: Math.sin(ph * TAU + 0.8),
        glow: 0.12 + 0.24 * Math.max(0, Math.sin(ph * TAU - 1.2)), blink: ph >= 0.74 && ph < 0.86 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 560, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = march(ph), a = Math.cos(ph * TAU);
      // the staff's foot: planted while the body passes it, then swung on ahead
      const pl = 0.62, back = 13.2 * pl, sx = ph < pl ? 15.8 - 13.2 * ph : 15.8 - back + back * (0.5 - 0.5 * Math.cos(((ph - pl) / (1 - pl)) * Math.PI));
      const lift = ph < pl ? 0 : Math.sin(((ph - pl) / (1 - pl)) * Math.PI) * 2;
      return { ...w, hx: 1.8, hy: 0.4, aF: [1.14 + 0.1 * Math.cos((ph - 0.08) * TAU), 0.86, 0], aN: [0.3 - a * 0.25, 0.8, 0], sx, lift, glow: 0.1 };
    },
  },
  // the heal, on the march: the very walk above with the staff thrust up, the head thrown back, the orb blazing
  chant: {
    n: 8, ms: 560, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = march(ph), b = Math.sin(ph * TAU * 2);
      return { ...w, hx: 0.4, hy: -1, aF: [1.52 + 0.14 * b, 1, 0], aN: [1.2 + 0.14 * b, 0.8, 0], staff: 0.02 + 0.06 * Math.sin(ph * TAU), gk: 1, grip: 9, glow: 1.1 + 0.25 * b, chant: 1 };
    },
  },
  attack: {
    n: 11, ms: 800, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: READY },
      // he hauls the staff up and back off the ground, both eyes on the man
      { t: 0.27, e: "out", p: { ...READY, rx: -1.2, drop: 1, lean: 0.16, hx: 1, aF: [1.5, 0.74, 0], aN: [0.9, 0.7, 0], staff: -0.55, gk: 1, grip: 12, glow: 0.3 } },
      { t: T0, e: "io", p: { ...READY, rx: -1.6, drop: 1.2, lean: 0.12, hx: 0.8, aF: [1.62, 0.76, 0], aN: [1, 0.72, 0], staff: -0.7, gk: 1, grip: 12, glow: 0.35 } },
      // the swat: a step in, the staff's head brought down on him
      { t: T1, e: "in3", p: { ...READY, rx: 2.2, drop: 1.6, lean: 0.54, hx: 2.4, hy: 0.8, aF: [1.3, 1, 0], aN: [-0.6, 0.85, 0], fF: [5.6, 0], staff: 1.32, gk: 1, grip: 12, glow: 0.45, snarl: 1 } },
      { t: 0.64, e: "out", p: { ...READY, rx: 2.6, drop: 1.9, lean: 0.58, hx: 2.6, hy: 1, aF: [1.2, 1, 0], aN: [-0.75, 0.85, 0], fF: [5.6, 0], staff: 1.46, gk: 1, grip: 12, glow: 0.3, snarl: 1 } },
      { t: 0.84, e: "io", p: { ...READY, rx: 0.8, drop: 0.8, lean: 0.34, aF: [1.05, 0.8, 0], aN: [0.1, 0.8, 0], fF: [3.6, 1.4], staff: 0.5, gk: 0.6, grip: 13, glow: 0.15 } },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
};
