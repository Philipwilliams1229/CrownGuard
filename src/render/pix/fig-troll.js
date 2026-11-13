// ============ FIGURE: the Troll (game type `troll`) ============
// The heaviest thing in the Greenwood: about 70 px to the crown and very wide.
// A small head sunk between enormous sloping shoulders, a hump of back behind
// it, long arms whose knuckles nearly reach the ground, a pale pot belly, short
// bowed legs on big flat feet. Mossy grey-green skin, hide rags, lank dark
// hair, a drooping ear that flaps a beat behind the head, a heavy brow over
// small yellow eyes, a great bulb of a nose, an underbite with two blunt tusks,
// a string of bones round the neck, moss on the near shoulder. A tree-limb club.
// Clips: idle (slow breath, the club's head resting on the ground, a scratch of
// the belly), walk (a lumbering sway, the club swinging low), attack (both hands
// haul the club up and back, a held beat at the top, one huge overhead smash
// that lands before him, a recoil, then he drags it back).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, HUMAN, scaled, ik } from "./rig.js";

const SKIN = mat("#7a8a5a"), BELLY = mat("#8f9a6a"), HIDE = mat("#5a4a3a"), HIDE_D = mat("#40342a"), HAIR = mat("#3a3a2a"), MOSS = mat("#5c7c34");
const WOOD = mat("#6e5234"), BARK = mat("#54402a"), CUT = mat("#b09460"), BONE = mat("#ece0c4"), NAIL = mat("#c8c2a0");
const NOSE = mat("#9c8c62"), EYE = flat("#e8c14a"), GLINT = flat("#fff0a0"), MOUTH = flat("#2c1a22");
const SMEAR1 = flat("#f4f0dc", { emis: true, line: "#c8c4a8" }), SMEAR2 = flat("#c8c8a0", { emis: true, line: "#a0a080" });
const CLOD = flat("#5a4028"), TURF = flat("#4f8a3a"), DUST = flat("#d8ccac", { line: "#b0a484" }), DUST2 = flat("#b8aa88", { line: "#988c6c" });

// The head, facing +x, a quarter turned: lank hair over the crown and down the
// back (H), a low forehead over one slab of brow (B), small yellow eyes (Y) cut
// to a scowl, a great drooping nose proud of everything (N, its shine L, the
// nostrils n), the lower jaw jutting past the lip with two blunt tusks (T).
const HEAD = [
  "......HHHHHH.....",
  "....HHHHHHHHH....",
  "...HHHGGGGGGGG...",
  "..HHHGGGGGGGGGG..",
  "..HHGGGGGGGGGGGGG",
  ".HHHGBBBBBBGGBBBB",
  ".HHGGgbYBGGmmBYG.",
  ".HHGGGbYYGNNNNYG.",
  ".HhGGGGGGNNLLNNm.",
  ".HhGGGGGgNNNNNNmm",
  ".HhGGGGTGgnmmmnmT",
  "..hGGGTTGGXXXGTTG",
  "..gGGGTTllllllTTG",
  "..gGGGGGGGGGGGGGG",
  "...gGGGGGGGGGGGg.",
  ".....ggggggggg...",
];
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const BLINK = swap(HEAD, { 6: ".HHGGgGGGGGmmGGG.", 7: ".HHGGGBBBGNNNNBG." });
// the smash's bellow: the jaw dropped, the mouth wide on the tusks, the eyes flaring
const ROAR = swap(HEAD, { 6: ".HHGGgbYYGGmmYYG.", 7: ".HHGGGbYEGNNNNEG.", 11: "..hGGGTTXXXXXXTTG", 12: "..gGGGTTXXXXXXTTG", 13: "..gGGGGGllllllGGG", 14: "..gGGGGGGGGGGGGGG", 15: "...ggGGGGGGGGGgg." });
const LEG = {
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, Y: { m: EYE }, E: { m: GLINT },
  N: { m: NOSE, fix: 3 }, L: { m: NOSE, fix: 4 }, m: { m: NOSE, fix: 2 }, n: { m: NOSE, fix: 0 }, l: { m: SKIN, fix: 3 }, T: { m: BONE, fix: 3 }, X: { m: MOUTH },
  H: { m: HAIR }, h: { m: HAIR, bias: -1 },
};

export const BOX = { w: 136, h: 112, ox: 68, oy: 104 };
export const BONES = scaled(HUMAN, 1.5, { thigh: 9.5, shin: 9, ankle: 3, spine: 34, neck: 0, upper: 21, fore: 21, shN: -12, shF: 11, hipN: -5.5, hipF: 5.5 });

const cl = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// the club: 0 = straight up, PI/2 = level before him, minus = behind him. CL from the fist to the middle of
// its head. Its head never sinks into the ground: asked to, it lies ON it (that is how it drags and rests).
const CL = 27, FLOOR = 5.2;
const clubOf = (sk) => {
  let a = sk.p.club ?? -1.9;
  const h = sk.hdN, c = (h[1] + FLOOR) / CL;
  if (c > -1 && h[1] - Math.cos(a) * CL > -FLOOR) a = (Math.sin(a) >= 0 ? 1 : -1) * Math.acos(Math.min(1, c));
  const d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)];
  return (f, s = 0) => [h[0] + d[0] * f + n[0] * s, h[1] + d[1] * f + n[1] * s];
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, hdN, hN, hF, kN, kF, anN, anF, B } = sk;
  const vx = cl(N[0] - lag1.N[0], -3, 3), vy = cl(N[1] - lag1.N[1], -3, 3);
  const vx2 = cl(lag1.N[0] - lag2.N[0], -3, 3), vy2 = cl(lag1.N[1] - lag2.N[1], -3, 3);
  const bx = cl(P[0] - lag1.P[0], -2, 2), bx2 = cl(lag1.P[0] - lag2.P[0], -2, 2);
  const K = clubOf(sk), g2 = p.grip2 || 0;

  // the far arm, a tone down: it hangs to the knee, or reaches across to the club
  const tgt = mix(sk.hdF, K(8.5, 0), g2), fa = ik(sF[0], sF[1], tgt[0], tgt[1], B.upper, B.fore, 1), eF = fa.mid, hdF = fa.end;
  const fz = 1;
  px.part();
  px.capsule(sF[0], sF[1] + 1, 6, eF[0], eF[1], 5, SKIN, fz, { bias: -1 });
  px.capsule(eF[0], eF[1], 4.8, hdF[0], hdF[1], 5.4, SKIN, fz, { bias: -1 });
  px.part();
  px.ellipse(hdF[0], hdF[1] + 0.4, 5, 4.6, SKIN, g2 > 0.5 ? 8.25 : fz + 0.1, { bias: -1 });

  // short bowed legs, big flat feet with pale nails
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(hp[0], hp[1], 6.2, kn[0], kn[1], 5, SKIN, z, { bias: b });
    px.capsule(kn[0], kn[1], 4.8, an[0], an[1], 4, SKIN, z, { bias: b });
    px.capsule(an[0] - 2.4, an[1] + 0.6, 2.9, an[0] + 8, an[1] + 1.3, 2.2, SKIN, z + 0.03, { bias: b });
    for (const x of [5.4, 7.6, 9.6]) px.dot(an[0] + x, an[1] + 2.2, NAIL, z + 0.04, { fix: b ? 2 : 3 });
  }

  // the hide rags round the hips, the ragged hem a beat behind
  const kh = P[1] + 8, kf = P[0] + 11 - bx * 1.4 - bx2 * 0.8, kb = P[0] - 11 - bx * 1.8 - bx2 * 1.2, km = (t) => kb + (kf - kb) * t;
  px.part(); const kiltId = px._pid;
  px.poly([[P[0] - 10.4, P[1] - 2], [P[0] + 10.6, P[1] - 2], [kf, kh - 1.6], [km(0.88), kh + 1.2], [km(0.76), kh - 1], [km(0.6), kh + 2], [km(0.46), kh - 0.4], [km(0.3), kh + 1.6], [km(0.14), kh - 0.6], [kb, kh - 2.4]], HIDE, 3.6, { round: 0.85, cast: 1 });
  px.toneLine(P[0] + 3, P[1] + 1, km(0.64), kh - 1, -1, kiltId);
  px.toneLine(P[0] - 4, P[1] + 1, km(0.28), kh - 1.4, -1, kiltId);
  px.toneLine(P[0] + 7, P[1] + 0.4, km(0.86), kh - 1.6, -1, kiltId);

  // the trunk: a slab of chest under a hump of back, the far shoulder showing past the head
  px.part();
  px.ellipse(sF[0] - 2, sF[1] + 1.6, 8, 7.4, SKIN, 3.9, { bias: -1 });
  px.part(); const bodyId = px._pid;
  px.poly([[C[0] - 15, C[1] + 2], [C[0] - 10, C[1] - 4.6], [C[0] + 7, C[1] - 4.6], [C[0] + 14, C[1] + 1], [C[0] + 15.6, C[1] + 9], [mix(C, P, 0.5)[0] + 15, mix(C, P, 0.5)[1]],
    [P[0] + 12.6, P[1] - 6], [P[0] + 10.6, P[1] + 0.6], [P[0] - 10.4, P[1] + 0.6], [P[0] - 12.4, P[1] - 8], [mix(C, P, 0.5)[0] - 14.6, mix(C, P, 0.5)[1]], [C[0] - 16, C[1] + 9]], SKIN, 4, { round: 0.92, cast: 1 });
  px.ellipse(C[0] - 4.6, C[1] - 2.4, 11.4, 7, SKIN, 4, { cast: 1 });
  px.toneLine(C[0] + 3, C[1] + 12.6, C[0] + 14, C[1] + 11.6, -1, bodyId);       // under the chest
  // the pot belly, paler, hanging over the rags
  const bl = mix(C, P, 0.7);
  px.part(); const bellyId = px._pid;
  px.ellipse(bl[0] + 4.6, bl[1] + 0.6, 11.6, 9.6, BELLY, 4.05, { cast: 1 });
  px.dot(bl[0] + 9.4, bl[1] + 2.4, BELLY, 4.06, { fix: 0 });
  px.toneLine(bl[0] - 3, bl[1] + 8.4, bl[0] + 10, bl[1] + 9, -1, bellyId);
  // a rope of hide under the belly
  px.part();
  px.capsule(P[0] - 10.6, P[1] - 1.6, 1.1, P[0] + 10.8, P[1] - 1.4, 1.1, HIDE_D, 4.08);

  // the string of bones across the chest
  px.part();
  const nk = [[2.4, 2.2], [4.6, 4.2], [7.2, 5.2], [9.8, 5], [12, 3.6], [13.6, 1.6]];
  for (let i = 0; i < nk.length; i++) px.dot(C[0] + nk[i][0], C[1] + nk[i][1], i % 2 ? BONE : HIDE_D, 4.3, { fix: i % 2 ? 3 : 1 });
  px.rect(C[0] + 6.6, C[1] + 5.6, 2, 3, BONE, 4.3, { fix: 3 });
  px.dot(C[0] + 7.2, C[1] + 8.8, BONE, 4.3, { fix: 2 });

  // the head, sunk between the shoulders
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  px.part();
  px.stamp(p.blink ? BLINK : p.roar > 0.5 ? ROAR : HEAD, hx, hy, LEG, 6, { ax: 7, ay: 13, ball: [8.5, 8, 9, 9], cast: 1 });
  // the drooping ear and two lank strands, a beat behind the head
  const sway = cl(vx * 1.8 + vx2 * 1.4, -3, 3.5), hop = cl(vy * 1.4 + vy2, -2.5, 2.5), tw = p.ear || 0;
  px.part();
  px.poly([[hx - 3, hy - 9.6], [hx - 2.2, hy - 5.4], [hx - 6.6 - sway * 0.4, hy - 5.6 - tw * 0.6], [hx - 11 - sway, hy - 8.4 - hop - tw * 2.6], [hx - 7 - sway * 0.5, hy - 10.4 - hop * 0.5 - tw * 1.4]], SKIN, 8.2, { round: 0.6, edge: true });
  px.toneLine(hx - 4, hy - 7.6, hx - 7.6 - sway * 0.6, hy - 8 - hop * 0.6 - tw * 1.4, -1, px._pid);
  px.part();
  px.capsule(hx - 5.6, hy - 9.6, 1.3, hx - 7.4 - sway * 0.7, hy - 4.6 - hop * 0.4, 0.9, HAIR, 6.15);
  px.capsule(hx - 3.6, hy - 12, 1.2, hx - 7.2 - sway * 0.5, hy - 9 - hop * 0.3, 0.8, HAIR, 6.15);

  // the club: a limb torn off a tree, bark on it yet, a stub of branch, the pale wood showing where it broke
  px.part(); const clubId = px._pid;
  px.capsule(...K(-3.6), 1.8, ...K(11), 2.5, WOOD, 8.1, { edge: true });
  px.capsule(...K(11), 2.6, ...K(CL), 5, BARK, 8.1, { edge: true });
  px.capsule(...K(15, 3), 1.5, ...K(17, 6), 1.2, BARK, 8.09, { edge: true });
  px.ellipse(...K(CL + 3.4), 2.6, 2.6, CUT, 8.12, { fix: 3 });
  px.dot(...K(CL + 3.4), CUT, 8.13, { fix: 1 });
  px.dot(...K(17.6, 6.8), CUT, 8.13, { fix: 3 });
  px.toneLine(...K(13, -1.4), ...K(22, -2.6), -1, clubId);
  px.toneLine(...K(19, 2.2), ...K(25, 3), 1, clubId);
  px.toneLine(...K(20, -0.4), ...K(26, 0.2), -1, clubId);

  // the near arm over it all: a boulder of shoulder with moss on it, a forearm thicker than the arm, a fist like a ham
  // (hauled up over his head the arm passes BEHIND it, so the face stays open)
  const az = (p.nb || 0) > 0.5 ? 5.5 : 7.9;
  px.part();
  px.capsule(sN[0], sN[1] + 2, 6.6, eN[0], eN[1], 5.4, SKIN, az, { cast: 1 });
  px.capsule(eN[0], eN[1], 5.2, hdN[0], hdN[1], 6, SKIN, az, { cast: 1, edge: true });
  px.part(); const shId = px._pid;
  px.ellipse(sN[0] - 0.6, sN[1] + 0.4, 9.2, 8, SKIN, 8, { cast: 1 });
  for (const [x, y, t] of [[-4.6, -5.4, 3], [-3.6, -5.6, 2], [-2.6, -5.2, 3], [-5.4, -4.4, 2], [-4.4, -4.4, 3], [-3.4, -4.4, 2], [-6.2, -3.2, 2], [0.6, -6.2, 2], [1.6, -6, 3], [1.2, -5, 2]]) px.dot(sN[0] + x, sN[1] + y, MOSS, 8.01, { fix: t });
  px.dot(sN[0] + 3.4, sN[1] + 1.6, SKIN, 8.01, { fix: 4 }); px.dot(sN[0] + 3.4, sN[1] + 2.6, SKIN, 8.01, { fix: 0 });       // a wart
  px.dot(sN[0] - 3.6, sN[1] + 3.4, SKIN, 8.01, { fix: 4 }); px.dot(sN[0] - 3.6, sN[1] + 4.4, SKIN, 8.01, { fix: 0 });
  px.toneLine(sN[0] - 5, sN[1] + 7.4, sN[0] + 5, sN[1] + 7.6, -1, shId);
  px.part();
  px.ellipse(hdN[0], hdN[1] + 0.4, 5.4, 5, SKIN, 8.3, { edge: true });
  px.dot(hdN[0] + 2.4, hdN[1] - 1, SKIN, 8.31, { fix: 1 }); px.dot(hdN[0] + 3, hdN[1] + 1.4, SKIN, 8.31, { fix: 1 });

  return { head: K(CL + 2, 0) };
};

// the smash: one crescent behind the club's head on its one fast frame, then the ground it broke
const T0 = 8 / 15, HIT = 9 / 15;       // the last held frame, and the frame the club lands on (of 16)
export const fx = (px, F, info, clip) => {
  if (clip !== "attack") return;
  const { ph } = F;
  if (ph > HIT - 0.01 && ph < HIT + 0.02) {
    // the last half of the club's fall (the pose eases in on a cube, so even steps of travel are cube roots of time)
    const pts = [], n = 10;
    for (let i = 0; i <= n; i++) {
      const prog = 1 - 0.42 * (i / n), K = clubOf(F.at(T0 + (HIT - T0) * Math.cbrt(prog)));
      pts.push([K(CL + 5.6, 0), K(CL - 15, 0)]);
    }
    for (let i = 0; i + 1 < pts.length; i++) {
      const t = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
      px.poly([pts[i][0], pts[i + 1][0], mix(pts[i + 1][1], pts[i + 1][0], t1 ** 1.3), mix(pts[i][1], pts[i][0], t ** 1.3)], t < 0.4 ? SMEAR1 : SMEAR2, 20 - t, { noLine: true });
    }
  }
  if (ph >= HIT - 0.005 && ph < HIT + 0.3) {
    const t = (ph - HIT) / 0.3, K = clubOf(F.at(HIT)), [x, y0] = K(CL + 2, 0), y = Math.min(-1, y0 + 4);
    // clods and turf thrown up and out
    for (let i = 0; i < 9; i++) {
      const dir = (i - 4) * 0.36 + 0.1, sp = 7 + ((i * 37) % 5) * 2.2;
      const cx = x + Math.sin(dir) * sp * t * 1.3, cy = Math.min(0, y - Math.cos(dir) * sp * t * 2.6 + 26 * t * t);
      if (i % 3 === 0) px.rect(cx, cy, 2, 2, CLOD, 20, {}); else px.dot(cx, cy, i % 3 === 1 ? CLOD : TURF, 20, { noLine: i % 2 === 0 });
    }
    // a low puff of dust rolling out along the ground, thinning as it goes
    if (t < 0.8) {
      const r = 2.4 + 3 * Math.sqrt(t), fade = t > 0.45;
      for (const [s, k] of [[-1, 1], [1, 1], [-1, 0.5], [1, 0.5]]) {
        const dx = s * (3 + 10 * Math.sqrt(t)) * k, rr = r * (k < 1 ? 0.8 : 1) * (fade ? 0.7 : 1);
        px.ellipse(x + dx, -1.2 - rr * 0.4 - t * 3 * k, rr * 1.5, rr * 0.75, k < 1 || fade ? DUST2 : DUST, 19.5 + k, { noLine: true });
      }
    }
  }
};

const GUARD = { rx: -3, drop: 2, lean: 0.3, twist: 0, hx: 7, hy: 0, rise: 0, aN: [-0.08, 0.97, 0], aF: [0.2, 0.95, 0], fN: [-6, 0], fF: [6.5, 0], club: -1.9, grip2: 0, roar: 0, ear: 0, nb: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 2600, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b, s = Math.sin(ph * TAU - 1.2);
      // half way through the breath he cocks his head at something, and an ear flicks
      const tilt = ph >= 0.5 && ph < 0.76 ? 1 : 0;
      return {
        ...GUARD, rise: 2 * u, rx: -3 + 0.8 * s, hx: 7 + tilt, hy: 0.6 * (1 - u) + tilt, lean: 0.3 - 0.02 * b,
        aN: [-0.08 - 0.012 * b, 0.97 - 0.02 * u, 0], aF: [0.2 + 0.03 * s, 0.95, 0],
        ear: ph >= 0.6 && ph < 0.7 ? 1 : 0, blink: ph >= 0.1 && ph < 0.2 ? 1 : 0,
      };
    },
  },
  walk: {
    n: 8, ms: 1250, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 5.5, lift: 2.4, swing: 0.24, bob: 2.6, lean: 0.26 }), a = Math.cos(ph * TAU), c2 = Math.cos(ph * TAU * 2);
      return {
        ...w, rx: -3, drop: w.drop + 1.6, lean: 0.3 - 0.05 * c2, twist: -a * 1.6, hx: 7, hy: 0.8 * (0.5 + 0.5 * c2), rise: 0,
        aN: [-0.1 - a * 0.1, 0.96, 0], aF: [0.1 + a * 0.3, 0.95, 0], club: -1.9, grip2: 0, roar: 0, ear: 0, nb: 0,
      };
    },
  },
  attack: {
    n: 16, ms: 1250, loop: false, lag: 0.05,
    // the near arm and the club each turn ONE way through the clip (up from behind, over the top, down before him,
    // round past his leg to trail again), so their angles run on past a full turn and no ease unwinds them
    pose: (ph) => {
      const p = sampleKeys([
        { t: 0, p: GUARD },
        // he sinks and takes the weight of it: its head leaves the ground behind him
        { t: 0.12, e: "io", p: { ...GUARD, rx: -2, drop: 4, lean: 0.38, aN: [-0.3, 0.9, 0], aF: [0.5, 0.8, 0], club: -1.5 } },
        { t: 0.24, e: "io", p: { ...GUARD, rx: -3.6, drop: 2.6, lean: 0.16, twist: -0.3, aN: [-1.25, 0.46, 0], aF: [1.2, 0.7, 0], club: -1.1, grip2: 0.4 } },
        // the heave: up and back with the whole of his weight, both hands on it, the front foot off the ground
        { t: 0.38, e: "out", p: { ...GUARD, rx: -5, drop: 0.6, rise: 2, lean: -0.1, twist: -0.6, hx: 6, hy: -1, aN: [2.9 - TAU, 0.5, 0], nb: 1, fF: [6, 3], club: -0.95, grip2: 1 } },
        // ... and held there, still tipping back
        { t: T0, e: "io", p: { ...GUARD, rx: -6, drop: 0.2, rise: 2.8, lean: -0.16, twist: -0.8, hx: 5.6, hy: -1.4, aN: [3.02 - TAU, 0.53, 0], nb: 1, fF: [6.4, 4.4], club: -1.25, grip2: 1, roar: 1 } },
        // the smash, in one frame: a step in and everything comes down
        { t: HIT, e: "in3", p: { ...GUARD, rx: 2, drop: 4.4, lean: 0.4, twist: 1.5, hx: 8, hy: 1.6, aN: [0.3 - TAU, 0.76, 0], fF: [11, 0], club: 2.0, grip2: 1, roar: 1 } },
        // the recoil: the limb bounces, he sinks behind it
        { t: 0.67, e: "out", p: { ...GUARD, rx: 2.6, drop: 5.4, lean: 0.44, twist: 1.6, hx: 8.4, hy: 2.2, aN: [0.36 - TAU, 0.72, 0], fF: [11, 0], club: 1.84, grip2: 1, roar: 1 } },
        { t: 0.76, e: "io", p: { ...GUARD, rx: 2.2, drop: 4.6, lean: 0.4, twist: 1.5, hx: 8, hy: 1.8, aN: [0.3 - TAU, 0.76, 0], fF: [11, 0], club: 2.0, grip2: 1 } },
        // he straightens, dragging it back to his feet, and lets it swing on past his leg
        { t: 0.9, e: "io", p: { ...GUARD, rx: -1, drop: 2.6, lean: 0.34, twist: 0.4, hy: 0.6, aN: [0.1 - TAU, 0.62, 0], fF: [8.4, 0.8], club: 2.9, grip2: 0 } },
        { t: 1, e: "out", p: { ...GUARD, aN: [-0.08 - TAU, 0.97, 0], club: -1.9 + TAU } },
      ], ph);
      // the blow comes back up his arms
      if (ph > HIT + 0.01 && ph < 0.8) { const k = (0.8 - ph) / 0.2, s = Math.sin(ph * 110); p.hx += s * 0.8 * k; p.twist += s * 0.3 * k; }
      return p;
    },
  },
};
