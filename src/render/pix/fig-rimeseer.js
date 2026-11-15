// ============ FIGURE: the Rime Seer (game type `rimeseer`) ============
// The clans' tower-freezer: a woman in a long smoke-grey robe hemmed in white fur,
// a deep fur-rimmed hood crowned with bone antlers, pale braids, frost-blue eyes and
// a rune on the chin, bone rune-stones at her belt, and a staff of frozen whalebone
// whose head is a crown of ice. Look c, "bold": the thrall's fur and antlers, but
// robed, thin and tall (about 56 px with the antlers).
// Clips: idle, walk (a slow glide, the staff planted in time), attack (the shroud cast
// used as her blow: gather, raise, thrust the staff, a burst of frost), and FREEZE: her
// frost shroud on the march, built from the very same walkPose call as `walk` (same legs
// and body height frame for frame) with the staff thrust up, the head back, the ice blazing.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, scaled, HUMAN } from "./rig.js";

const SKIN = mat("#ecd0bc"), ROBE = mat("#5e5868"), SLEEVE = mat("#6e6878"), FURW = mat("#ece8e0"), FURB = mat("#b8b4b8"), DARK = mat("#2c2832"), HOOD = mat("#46404e");
const BONE = mat("#e6dcc0"), WHALE = mat("#d8d0b8"), HAIR = mat("#e4dcc4"), ICE = mat("#bfe8fa", { contrast: 1.3 }), TEAL = mat("#4e8a92"), BOOT = mat("#4a3a30");
const EYE = flat("#7cc8ec"), RUNE = flat("#5ab4e0");
const GLOW = flat("#9ad8f2", { emis: true, line: "#3a86b0" }), HOT = flat("#f4fcff", { emis: true, line: "#9ad8f2" });
const M_ICE = flat("#9ad8f2", { emis: true, line: "#3a86b0" }), M_PALE = flat("#f4fcff", { emis: true, line: "#9ad8f2" }), M_DEEP = flat("#3a86b0", { emis: true });
const SMEAR1 = flat("#f4fcff"), SMEAR2 = flat("#b8e4f6");

// The head, facing +x a quarter turned: the hood (h dark, F the fur rim, f a tone down),
// pale braids behind (H), skin (S, s, N the nose), frost-blue eyes (E), the chin rune (r).
const HEAD = [
  ".....hhhh....",
  "...hhhhhhhh..",
  "..hhhhhhhhhh.",
  ".HFFFFFFFFFF.",
  ".HFfSSssSSsF.",
  ".HFfSESSSESF.",
  ".HHfSESSSESN.",
  ".HHFfSSSSSSN.",
  "..HHFfSSSSS..",
  "..HHHFFrSF...",
];
const BLINK = HEAD.map((r, i) => (i === 5 || i === 6 ? r.replace(/E/g, "S") : r));
const CAST = HEAD.map((r, i) => (i === 9 ? "..HHHFFrSF..." : r));
const LEG = {
  h: { m: HOOD }, F: { m: FURW }, f: { m: FURB, bias: -1 }, H: { m: HAIR, fix: 2 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, E: { m: EYE }, r: { m: RUNE, fix: 0 },
};

export const MUST = [["nearArm", "notOver", "eyes"]];
export const BOX = { w: 116, h: 88, ox: 40, oy: 78 };
export const BONES = scaled(HUMAN, 1.1, { shN: -3, shF: 3, hipN: -1.4, hipF: 1.6, neck: 1.4 });
const STAFF = 38;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const lerp = (a, b, t) => a + (b - a) * t;

// the staff in the far fist: planted (`sx`, its foot's x) it leans from foot to hand;
// carried, `staff` is its tilt (0 upright, + toward the foe), held `grip` px up from the foot
// THE GRIP: a CARRIED staff's tilt is derived from the solved far forearm (elbow -> hand) + GRIP + a wrist of +-0.35, never
// posed on its own (a planted staff, `sx`, leans from its foot to the hand instead). Measured from his rest (-1.65).
export const GRIP = -1.65, WRIST = 0.35;
const foreF = (sk) => { const f = Math.atan2(sk.hdF[0] - sk.eF[0], -(sk.hdF[1] - sk.eF[1])); return f < -1.9 ? f + Math.PI * 2 : f; };
export const staffTilt = (sk) => foreF(sk) + GRIP + cl(sk.p.wrist || 0, -WRIST, WRIST);
const staffOf = (sk) => {
  const p = sk.p, h = sk.hdF, hgt = Math.max(2, -h[1] - (p.lift || 0));
  const tl = p.sx != null ? Math.atan2(h[0] - p.sx, hgt) : staffTilt(sk);
  const d = [Math.sin(tl), -Math.cos(tl)], nn = [Math.cos(tl), Math.sin(tl)];
  const lo = lerp(cl(hgt / Math.max(0.3, Math.cos(tl)), 5, STAFF - 6), p.grip ?? 16, p.sx != null ? 0 : (p.gk || 0));
  const foot = [h[0] - d[0] * lo, h[1] - d[1] * lo], tip = [foot[0] + d[0] * STAFF, foot[1] + d[1] * STAFF];
  const at = (a, b) => [tip[0] + d[0] * a + nn[0] * b, tip[1] + d[1] * a + nn[1] * b];
  return { d, nn, foot, tip, at, orb: at(5, 0) };
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(N[0] - lag1.N[0], -2, 2), vy = cl(N[1] - lag1.N[1], -2, 2), vx2 = cl(lag1.N[0] - lag2.N[0], -2, 2);
  const bx = cl(P[0] - lag1.P[0], -2, 2), bx2 = cl(lag1.P[0] - lag2.P[0], -2, 2);
  const g = p.glow || 0, hx = Math.round(N[0]), hy = Math.round(N[1]);

  // ---- the staff: a long whalebone shaft with rings, a crown of ice shards in a bone cradle
  const st = staffOf(sk), { at, orb } = st;
  px.part();
  px.capsule(st.foot[0], st.foot[1], 1, st.tip[0], st.tip[1], 1, WHALE, 1.5, { edge: true });
  for (const a of [-10, -20, -30]) { const k = at(a, 0); px.dot(k[0], k[1], BONE, 1.52, { fix: 3 }); }
  px.part();
  px.capsule(...at(-1.6, 0), 1.5, ...at(1.4, 0), 1.7, BONE, 1.55);
  px.poly([at(1, 0.8), at(4, 4.2), at(8.5, 2.6), at(6, 0.6)], BONE, 1.56, { fix: 2 });
  px.poly([at(1, -0.8), at(4, -4.2), at(8.5, -2.6), at(6, -0.6)], BONE, 1.56, { fix: 1 });
  // the crown: a tall shard and two leaning ones, lit by `glow`
  px.part();
  const cm = g > 0.75 ? HOT : ICE, cm2 = g > 0.75 ? GLOW : ICE;
  px.poly([at(1.4, -1.2), at(1.4, 1.2), at(7, 1.6), at(13.5, 0), at(7, -1.6)], cm, 1.6, { fix: 2 });
  px.poly([at(2.4, 1.2), at(4.4, 4.6), at(10, 3.6), at(7, 1.2)], cm2, 1.61, { fix: 1 });
  px.poly([at(2.4, -1.2), at(4.4, -4.6), at(10, -3.6), at(7, -1.2)], cm2, 1.61, { fix: 3 });
  if (g > 0.4) px.dot(...at(5, -0.4), HOT, 1.65, { noLine: true });

  // ---- the far arm, a tone down: wide sleeve, fur cuff, the fist on the staff
  {
    const wr = mix(eF, hdF, 0.64);
    px.part();
    px.capsule(sF[0], sF[1], 2, eF[0], eF[1], 2.1, SLEEVE, 1, { bias: -1 });
    px.capsule(eF[0], eF[1], 2.1, wr[0], wr[1], 2.6, SLEEVE, 1, { bias: -1 });
    px.capsule(wr[0], wr[1], 1.6, hdF[0], hdF[1], 1.6, FURW, 1.05, { bias: -1 });
    px.part();
    px.ellipse(hdF[0], hdF[1], 1.7, 1.8, SKIN, 1.7, { bias: -1 });
  }

  // ---- boots under the hem
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(hp[0], hp[1], 2.2, kn[0], kn[1], 1.9, BOOT, z, { bias: b });
    px.capsule(kn[0], kn[1], 1.9, an[0], an[1], 1.5, BOOT, z, { bias: b });
    px.capsule(an[0] - 0.5, an[1] + 0.55, 1.4, an[0] + 3.6, an[1] + 0.8, 1.1, BOOT, z, { bias: b });
  }

  // ---- the robe, belling to a fur hem at the ankles; the hem trails a beat behind
  const hemY = -2.6, top = C[1] - 2;
  const hemF = Math.max(P[0] + 5.6, Math.max(anN[0], anF[0]) + 2.4) - bx * 0.6;
  const hemB = Math.min(P[0] - 6, Math.min(anN[0], anF[0]) - 2.2) - bx * 1.2 - bx2 * 0.8;
  const hm = (t) => hemB + (hemF - hemB) * t;
  px.part(); const robeId = px._pid;
  px.poly([[C[0] - 4, top], [C[0] + 3.8, top + 0.3], [C[0] + 4.6, C[1] + 3], [P[0] + 4.4, P[1] - 1.4], [hemF, hemY - 3], [hemF, hemY], [hemB, hemY], [hemB, hemY - 3], [P[0] - 5, P[1] - 1.6], [C[0] - 5.2, C[1] + 3]], ROBE, 4, { round: 0.9, cast: 1 });
  px.toneLine(P[0] - 1.6, P[1] + 0.6, hm(0.36), hemY - 3.2, -1, robeId);
  px.toneLine(P[0] + 2.8, P[1] + 0.4, hm(0.8), hemY - 3.2, 1, robeId);
  // the fur hem, ragged along its lower edge
  px.poly([[hemB, hemY - 3], [hemF, hemY - 3], [hemF, hemY], [hemB, hemY]], FURW, 4.04, { round: 0.9 });
  for (let t = 0.08; t < 1; t += 0.14) px.dot(hm(t), hemY + 0.6 + ((t * 7) | 0) % 2, FURW, 4.05);
  // a woven teal belt, rune-stones of bone swinging from it
  px.poly([[P[0] - 5, P[1] - 3.2], [P[0] + 4.5, P[1] - 3.2], [P[0] + 4.5, P[1] - 1.5], [P[0] - 5, P[1] - 1.5]], TEAL, 4.05, { round: 0.92 });
  {
    const sw = cl(-bx * 1.2 - bx2 * 0.9, -1.5, 1.5);
    px.part();
    for (const [x, y, m] of [[2.6, 3.4, BONE], [0.8, 4.2, BONE], [4.2, 4, ICE]]) {
      px.line(P[0] + x, P[1] - 1.4, P[0] + x + sw * 0.4, P[1] + y - 1.6, DARK, 4.2);
      px.dot(P[0] + x + sw * 0.5, P[1] + y, m, 4.25, { fix: 3 });
    }
  }
  // the mantle: white fur over the shoulders, shaggy at its edge
  px.part();
  px.ellipse(C[0] + 0.2, C[1] + 0.4, 8.6, 4, FURW, 4.4, { cast: 1 });
  px.ellipse(sN[0] - 0.4, sN[1] + 0.2, 4.2, 4, FURW, 8, { cast: 1 });
  for (const x of [-7, -4.4, -1.6, 1.2, 4, 6.6]) px.dot(C[0] + 0.2 + x, C[1] + 3.2 + (x & 1), FURW, 4.4);

  // ---- the head: pale braids a beat behind, the far antler, the hood, the near antler
  {
    const s = -vx * 1.6 - vx2 * 1.2, b0 = [hx - 5.2, hy - 1], b1 = [b0[0] - 1.2 + s * 0.4, b0[1] + 6 - vy * 0.3], b2 = [b1[0] - 0.4 + s * 0.8, b1[1] + 6], b3 = [b2[0] + s * 0.4, b2[1] + 5];
    for (const [dx, dy] of [[0, 0], [1.6, 1.6]]) {
      px.part();
      px.capsule(b0[0] + dx, b0[1] + dy, 1.5, b1[0] + dx, b1[1] + dy, 1.4, HAIR, 0.6); px.capsule(b1[0] + dx, b1[1] + dy, 1.4, b2[0] + dx, b2[1] + dy, 1.2, HAIR, 0.6); px.capsule(b2[0] + dx, b2[1] + dy, 1.2, b3[0] + dx, b3[1] + dy, 0.9, HAIR, 0.6);
      px.dot(b3[0] + dx, b3[1] + dy + 1, ICE, 0.65, { fix: 3 });
    }
  }
  const antler = (x0, y0, dir, z) => {
    const pts = [[x0, y0, 1.5], [x0 + dir * 2, y0 - 3.4, 1.3], [x0 + dir * 3.4, y0 - 7, 1.1], [x0 + dir * 3, y0 - 10.4, 0.6]];
    for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
    px.capsule(x0 + dir * 2, y0 - 3.4, 0.9, x0 + dir * 6, y0 - 5.6, 0.5, BONE, z, { cast: 1 });
    px.capsule(x0 + dir * 3.4, y0 - 7, 0.8, x0 + dir * 0.4, y0 - 9.6, 0.4, BONE, z, { cast: 1 });
  };
  px.part(); antler(hx - 2.6, hy - 8.4, -1, 0.7);
  px.part();
  px.stamp(p.cast > 0.5 ? CAST : p.blink ? BLINK : HEAD, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  px.part(); antler(hx + 2.2, hy - 8.4, 1, 6.6);
  px.dot(hx - 0.4, hy - 8.6, ICE, 6.7, { fix: 3 });

  // ---- the near arm over it all: sleeve, fur cuff, the palm raised when she gathers
  {
    const wr = mix(eN, hdN, 0.74), c0 = mix(eN, hdN, 0.58);
    px.part(); px.tag("nearArm");
    px.capsule(sN[0], sN[1] + 0.4, 2.2, eN[0], eN[1], 2.2, SLEEVE, 7.9, { cast: 2 });
    px.capsule(eN[0], eN[1], 2.2, wr[0], wr[1], 2.7, SLEEVE, 7.9, { cast: 2 });
    px.capsule(c0[0], c0[1], 2.6, wr[0], wr[1], 2.8, FURW, 7.95, { cast: 2 });
    px.tag(null);
    px.part();
    px.ellipse(hdN[0] + (hdN[0] - eN[0]) * 0.1, hdN[1] + (hdN[1] - eN[1]) * 0.1, 1.8, 1.8, SKIN, 8.3);
    if (p.palm > 0.5) px.ellipse(hdN[0] + 2, hdN[1] - 1, 2.4, 2.4, GLOW, 8.4);
  }

  const k = cl(g, 0, 1.4);
  return {
    light: k > 0.05 ? { x: orb[0], y: orb[1], r: 16 + 24 * cl(k, 0, 1), col: "#9ad8f2", k: Math.min(k, 0.4 + 0.25 * k) } : null,
    orb, feet: [P[0], 0], hemB, hemF, hand: hdN,
  };
};

// the cast's frost burst (attack) and the shroud's rising rime (freeze)
const T0 = 0.42, T1 = 0.56;
export const fx = (px, F, info, clip) => {
  const { ph } = F, NL = { noLine: true };
  if (!info.orb) return;
  const [ox, oy] = info.orb;
  if (clip === "attack" && ph > T1 - 0.02 && ph < T1 + 0.3) {
    const u = (ph - T1 + 0.02) / 0.32, n = 9;
    for (let i = 0; i < n; i++) {
      const a = -0.9 + (i / (n - 1)) * 1.8 + (i % 2) * 0.06, r = 5 + u * (12 + (i % 3) * 5), x = ox + Math.cos(a) * r + 2, y = oy + Math.sin(a) * r * 0.8 + 3;
      px.dot(x, y, u < 0.5 ? M_PALE : M_ICE, 20, u > 0.75 ? NL : {});
      if (u < 0.7) px.dot(x - Math.cos(a) * 1.4, y - Math.sin(a) * 1.1, M_DEEP, 19.9, NL);
    }
  }
  if (clip === "freeze") {
    const L = Math.round(ph * 8) % 2 ? 7 : 5.4;
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a); px.line(ox + c * 5, oy + s * 5, ox + c * (5 + L * 0.5), oy + s * (5 + L * 0.5), M_ICE, 20.4, NL); }
    for (let i = 0; i < 4; i++) {
      const u = (ph + i / 4) % 1, x = ox + Math.sin(i * 2.4 + u * 4) * (2.5 + 3 * u) + (i - 1.5) * 1.6, y = oy - 5 - u * 9;
      if (y < -BOX.oy + 3) continue;
      px.dot(x, y, u < 0.5 ? M_PALE : M_ICE, 20, u > 0.75 ? NL : {});
    }
    // rime sinking round her feet
    const [cx] = info.feet;
    for (let i = 0; i < 6; i++) {
      const u = (ph * 2 + i * 0.37) % 1, side = i % 2 ? 1 : -1, x = cx + side * (6 + (i * 37 % 7)) + Math.sin(u * 5 + i) * 1.2, y = -2 - u * (10 + (i % 3) * 3);
      if (u > 0.85 || (x > info.hemB - 1 && x < info.hemF + 1 && y > -22)) continue;
      px.dot(x, y, u < 0.35 ? M_PALE : M_ICE, 20, NL); px.dot(x, y + 1, M_ICE, 19.9, NL);
    }
  }
};

const TAU = Math.PI * 2;
const READY = { drop: 0.4, lean: 0.12, hx: 0.8, hy: 0.2, aF: [1.0, 0.9, 0], aN: [0.25, 0.86, 0], fN: [-2.2, 0], fF: [2.4, 0], staff: 0.1, lift: 0, gk: 0, grip: 16, glow: 0.14, cast: 0, palm: 0, blink: 0 };
// the march `walk` and `freeze` share: ONE walkPose call, so their legs and body height match frame for frame
const march = (ph) => { const w = walkPose(ph, { stride: 3.2, lift: 2, swing: 0.1, bob: 0.9, lean: 0.12 }); return { ...w, drop: w.drop + 0.4 }; };
export const CLIPS = {
  idle: {
    n: 8, ms: 2200, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b, s = Math.sin(ph * TAU - 1.1);
      return { ...READY, rise: 0.5 * u, rx: 0.4 * s, aF: [1.0, 0.9 - 0.02 * u, 0], aN: [0.25 + 0.05 * s, 0.86, 0], sx: 13, glow: 0.14 + 0.26 * Math.max(0, Math.sin(ph * TAU - 1.2)), blink: ph >= 0.74 && ph < 0.86 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 700, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = march(ph), a = Math.cos(ph * TAU);
      const pl = 0.62, back = 16 * pl, sx = ph < pl ? 18 - 16 * ph : 18 - back + back * (0.5 - 0.5 * Math.cos(((ph - pl) / (1 - pl)) * Math.PI));
      const lift = ph < pl ? 0 : Math.sin(((ph - pl) / (1 - pl)) * Math.PI) * 2;
      return { ...w, hx: 1, hy: 0.3, aF: [1.02 + 0.08 * Math.cos((ph - 0.08) * TAU), 0.9, 0], aN: [0.25 - a * 0.22, 0.86, 0], sx, lift, glow: 0.12 };
    },
  },
  // the frost shroud on the march: the very walk above, the staff thrust up, the near palm raised, the ice blazing
  freeze: {
    n: 8, ms: 700, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = march(ph), b = Math.sin(ph * TAU * 2);
      return { ...w, hx: -0.4, hy: -1, aF: [1.6 + 0.1 * b, 1, 0], aN: [1.3 + 0.12 * b, 0.9, 0], staff: 0.04 + 0.06 * Math.sin(ph * TAU), gk: 1, grip: 11, glow: 1.1 + 0.25 * b, cast: 1, palm: 1 };
    },
  },
  attack: {
    n: 12, ms: 900, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: READY },
      // gather: the near palm drawn to the breast, the staff lifted off the ground
      { t: 0.22, e: "out", p: { ...READY, rx: -0.8, drop: 0.8, lean: 0.04, aF: [1.5, 0.8, 0], aN: [1.0, 0.7, 0], staff: -0.2, gk: 1, grip: 14, glow: 0.4, palm: 1 } },
      // raise: the staff high, frost on the palm
      { t: T0, e: "io", p: { ...READY, rx: -1.4, drop: 1, lean: -0.02, hx: 0.2, aF: [1.9, 0.92, 0], aN: [1.6, 0.8, 0], staff: -0.1, gk: 1, grip: 12, glow: 0.9, palm: 1, cast: 1 } },
      // release: a step in, the staff thrust at the hall
      { t: T1, e: "in3", p: { ...READY, rx: 2.2, drop: 1.6, lean: 0.46, hx: 2.2, hy: 0.6, aF: [0.4, 1, 0], aN: [1.2, 0.9, 0], fF: [5.6, 0], staff: 1.25, gk: 1, grip: 12, glow: 1.3, cast: 1, palm: 1 } },
      { t: 0.7, e: "out", p: { ...READY, rx: 2.6, drop: 1.8, lean: 0.5, hx: 2.4, hy: 0.8, aF: [0.35, 1, 0], aN: [1.1, 0.9, 0], fF: [5.6, 0], staff: 1.3, gk: 1, grip: 12, glow: 0.8, cast: 1 } },
      { t: 0.88, e: "io", p: { ...READY, rx: 0.8, drop: 0.8, lean: 0.24, aF: [1.1, 0.9, 0], staff: 0.5, gk: 0.6, grip: 14, glow: 0.3 } },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
};
