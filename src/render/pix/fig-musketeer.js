// ============ CREW FIGURE: the Powder Works' musketeer ============
// A blue coat with a linen collar and a buff cross-belt, the broad dark hat with its
// tall crown and buff band, long hair and a chin beard, and his musket.
//   The gun is ONE rigid piece in its own space (u down the barrel from the stock's
//   wrist, v across; the butt at G_BUTT), placed by the pose: shouldered (its butt on the
//   near shoulder), carried (its wrist at a point), or grounded to load. BOTH hands are
//   solved onto it in every frame (ik), for every barrel length.
//   Variants (o.variant): the gun, as the hall's branch has it
//     "" / "plain"   the long gun (barrel 15 px)
//     "sharp"        the Sharpshooters': a 27 px barrel with a brass scope, and the forked
//                    rest standing on the deck where the barrel lies at the aim
//     "grape"        the Grapeshot Crew's: a 16 px barrel flared to a bell mouth
//   Clips: idle (at the port, breathing) and shot (aim and HOLD, the kick, the recoil,
//   down to load: the rod worked down the barrel, the pan primed, up to the shoulder,
//   the aim). The hall rests him at the aim: shotFrame(..., { rest: 1 }).
//   Marks (art px from the feet, facing +x):
//     muzzle   the musket's mouth (the bell's lip), every frame
//     bore     6 px back down the barrel from it (muzzle - bore is the way the shot goes;
//              the sun's glint on the barrel sits here)
//     lock     the pan
import { mat, flat } from "./pix.js";
import { sampleKeys, HUMAN, scaled, solve, ik } from "./rig.js";

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// folk CREW_FOLK.musketeer: skin #e8b990, hood #2c2a36, coat #3a4a6a, boots #2a2a30, trim #c8b070
const SKIN = mat("#e8b990"), HAIR = mat("#5a3a26"), EYE = flat("#2a1c2c"), BROW = mat("#6a4a30");
const HAT = mat("#2c2a36", { contrast: 1.25 }), BAND = mat("#c8b070"), COAT = mat("#3a4a6a"), SLEEVE = mat("#44567a"), BREECH = mat("#33405a");
const BOOT = mat("#2a2a30", { contrast: 1.2 }), BUFF = mat("#c8b070"), LINEN = mat("#e2d8c0"), GOLD = mat("#d8b34a", { contrast: 1.15 }), LEATHER = mat("#7a5232");
const WOOD = mat("#6a4a2a", { contrast: 1.15 }), STEEL = mat("#7c828e", { contrast: 1.3 }), BRASS = mat("#c89a48", { contrast: 1.15 }), LENS = flat("#e8d8a8");
const BELL = mat("#9aa0ac", { contrast: 1.25 }), BORE = flat("#1e1a20"), ROD = flat("#b4b8c2"), FORK = mat("#5f4326");
const SPARK = flat("#fff3d2", { emis: true, line: "#e8923a" }), EMBER = flat("#ffb347", { emis: true, line: "#c85a28" }), PUFF = flat("#d6d2c8", { emis: true, line: "#a8a498" });

// ---- the head (the hat is drawn over rows 0-3): long hair to the collar, a chin beard.
// H hair, h hair a tone down, S skin, s skin a tone down, a the ear, b brow, E eye,
// N nose, l mouth, B beard
const HEAD = [
  "....HHHHHH...",
  "..HHHHHHHHH..",
  ".HHHHHHHHHHH.",
  ".HHHhsssssss.",
  ".HHhSSSbbSbb.",
  ".HHaSSSSESSE.",
  ".HhaSSSSESSEN",
  ".HHsSSSSSSSS.",
  ".hHssSSSSll..",
  ".HhH.ssSBBB..",
  "..hH...BBB...",
  ".........B...",
];
const BLINK = HEAD.map((r, i) => (i === 5 ? r.replace(/E/g, "S") : i === 6 ? r.replace(/E/g, "e") : r));
const LEG = {
  H: { m: HAIR }, h: { m: HAIR, bias: -1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, a: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  b: { m: BROW, fix: 2 }, E: { m: EYE }, e: { m: SKIN, fix: 0 }, l: { m: SKIN, fix: 0 }, B: { m: HAIR, bias: -1 },
};

export const BOX = { w: 64, h: 64, ox: 17, oy: 59 };
export const BONES = scaled(HUMAN, 1.2, { spine: 13, upper: 7.9, fore: 7.7, shN: -2.8, shF: 3 });
const ARM = BONES.upper + BONES.fore;

// ---- the gun ----------------------------------------------------------------
const G_BUTT = [-10, 3.2];
const GUNS = { plain: { len: 15, lip: 0 }, sharp: { len: 27, lip: 0 }, grape: { len: 16, lip: 2.4 } };
const gunKey = (v) => (GUNS[v] ? v : "plain");
// where the pose puts it. gs 1: shouldered, the butt at the near shoulder + (bx, by);
// gs 0: its wrist at (gx, gy); ga the barrel's angle (- is up).
const gunOf = (p, sN) => {
  const a = p.ga, c = Math.cos(a), s = Math.sin(a), R = (u, v) => [u * c - v * s, u * s + v * c];
  const bt = R(...G_BUTT), gs = p.gs ?? 0;
  const W = [lerp(p.gx, sN[0] + p.bx - bt[0], gs), lerp(p.gy, sN[1] + p.by - bt[1], gs)];
  return { W, a, at: (u, v = 0) => { const r = R(u, v); return [W[0] + r[0], W[1] + r[1]]; } };
};
// where the two hands hold it: the near one on the grip (or the pan, priming; or the
// rod's head, ramming: as high as the arm can reach it), the far one under the fore-stock
// (or round the barrel while he loads)
const handsOn = (p, g, len, sN) => {
  const ram = p.ram || 0, prime = p.prime || 0;
  let rod = (p.rod ?? 6) * (len > 20 ? 0.55 : 1), top = g.at(len + rod, -0.5);
  for (let i = 0; i < 10 && ram > 0.5 && Math.hypot(top[0] - sN[0], top[1] - sN[1]) > ARM * 0.96; i++) { rod -= 0.8; top = g.at(len + rod, -0.5); }
  const grip = g.at(0.6, 1.8), pan = g.at(-1.4, -2.4), fore = g.at(p.fu ?? 7, 2), bar = g.at(Math.min(len - 3, 15.6), 0.8);
  const n0 = [lerp(grip[0], pan[0], prime), lerp(grip[1], pan[1], prime)];
  return { near: [lerp(n0[0], top[0], ram), lerp(n0[1], top[1], ram)], far: [lerp(fore[0], bar[0], ram), lerp(fore[1], bar[1], ram)], rod };
};
// the pose's own arms, solved onto the plain gun (so the skeleton the joint lab reads is the drawn one)
const toArm = (s, t) => [Math.atan2(t[0] - s[0], t[1] - s[1]), cl(Math.hypot(t[0] - s[0], t[1] - s[1]) / ARM, 0.25, 0.985), 0];
const fit = (p) => {
  const s = solve(p, BONES), g = gunOf(p, s.sN), h = handsOn(p, g, GUNS.plain.len, s.sN);
  return { ...p, aN: toArm(s.sN, h.near), aF: toArm(s.sF, h.far) };
};

const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.7, k[0], k[1], 2.3, BREECH, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 2.2, an[0], an[1] - 2.5, 1.9, BREECH, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.5 + an[0] * 0.5, k[1] * 0.5 + an[1] * 0.5, 2.3, an[0], an[1], 2, BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.4, an[1] + 1.1, 3.1, 1.6, BOOT, z + 0.03, { bias: b, floor: 1 });
};
const arm = (px, s, t, z, b, side = 1) => {
  const r = ik(s[0], s[1], t[0], t[1], BONES.upper, BONES.fore, side), e = r.mid, h = r.end;
  px.part();
  px.capsule(s[0], s[1] + (b ? 0 : 0.3), b ? 2.3 : 2.5, e[0], e[1], b ? 2.2 : 2.3, SLEEVE, z, { bias: b, cast: 2 });
  px.capsule(e[0], e[1], b ? 2.2 : 2.3, h[0], h[1], 1.9, SLEEVE, z, { bias: b, cast: 2 });
  px.capsule(e[0] * 0.3 + h[0] * 0.7, e[1] * 0.3 + h[1] * 0.7, 2.2, e[0] * 0.14 + h[0] * 0.86, e[1] * 0.14 + h[1] * 0.86, 2.1, BUFF, z + 0.02, { bias: b });
  px.part(); px.ellipse(h[0], h[1], 1.9, 1.9, SKIN, z + 0.2, { bias: b });
  return h;
};

// where the Sharpshooters' rest forks: under the barrel as it lies at the aim (found once)
let REST = null;
const restAt = () => {
  if (!REST) { const p = { ...AIM }, s = solve(p, BONES); REST = gunOf(p, s.sN).at(13, 2.6); }
  return REST;
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const kind = gunKey(o.variant), { len, lip } = GUNS[kind];
  const { p, P, C, N, sN, sF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), sway = p.sway || 0;
  const g = gunOf(p, sN), H = handsOn(p, g, len, sN), ram = (p.ram || 0) > 0.5;

  // the far arm, behind the body, its hand under the fore-stock
  arm(px, sF, H.far, 1, -1);

  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // the Sharpshooters' forked rest, standing on the deck
  if (kind === "sharp") {
    const [fx, fy] = restAt();
    px.part();
    px.capsule(fx - 5, -0.6, 0.9, fx, fy + 0.6, 0.8, FORK, 3.4);
    px.capsule(fx, fy + 0.6, 0.8, fx - 2, fy - 3, 0.6, FORK, 3.4);
    px.capsule(fx, fy + 0.6, 0.8, fx + 2.4, fy - 2.8, 0.6, FORK, 3.4);
  }

  // the coat: belted, skirted to mid-thigh, its hem a beat behind the hips
  const hemB = P[0] - 6.2 - vx * 1.1, hemF = P[0] + 5.8 - vx * 0.7, hy = P[1] + 4.6;
  px.part(); const coat = px._pid;
  px.poly([[C[0] - 4.8, C[1] - 1.8], [C[0] + 5, C[1] - 1.8], [C[0] + 6, C[1] + 3.4], [P[0] + 4.7, P[1] - 3.4], [hemF, hy], [hemF - 2.8, hy + 1], [P[0] - vx, hy], [hemB + 2.6, hy + 1], [hemB, hy], [P[0] - 5, P[1] - 3.4], [C[0] - 6, C[1] + 3.4]],
    COAT, 4, { round: 0.92, cast: 2 });
  px.toneLine(P[0] + 1, P[1] - 1.5, P[0] + 0.8 - vx, hy - 0.5, -1, coat);
  px.poly([[P[0] - 5.2, P[1] - 5.2], [P[0] + 4.9, P[1] - 5.2], [P[0] + 4.9, P[1] - 3.2], [P[0] - 5.2, P[1] - 3.2]], LEATHER, 4.05, { round: 0.92 });
  px.rect(P[0] + 1.2, P[1] - 5.2, 2, 2, GOLD, 4.06, { fix: 3 });
  // the buff cross-belt, and the powder flask it carries on his hip
  px.line(C[0] - 3.4, C[1] - 1, P[0] + 4, P[1] - 5.8, BUFF, 4.06);
  px.line(C[0] - 2.4, C[1] - 1, P[0] + 4.6, P[1] - 6.4, BUFF, 4.06, { bias: -1 });
  const fxk = P[0] - 4.4 - vx * 0.6, fyk = P[1] - 2.6;
  px.part();
  px.ellipse(fxk, fyk + 2, 2.4, 2.9, LEATHER, 4.5, { cast: 1 });
  px.rect(fxk - 0.8, fyk - 2, 1.8, 1.6, BRASS, 4.52, { fix: 3 });

  // the falling linen collar
  px.part();
  px.poly([[C[0] - 3.8, C[1] - 2.8], [C[0] + 4.4, C[1] - 2.8], [C[0] + 4.8, C[1] - 0.2], [C[0] + 1, C[1] + 0.4], [C[0] - 3.2, C[1] - 0.4]], LINEN, 5, { round: 0.9 });

  // the head
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hyy, LEG, 6, { ax: 7, ay: 11, ball: [6.5, 6, 7, 7.5], cast: 1 });
  // the broad hat: a tall crown with its buff band, the brim dipping a beat behind him
  const bx = hx - 1, by = hyy - 9.2, tp = cl(vx * 2 + vx2 * 1.4, -2, 2.5) - sway * 0.4;
  px.part();
  px.poly([[bx - 5.2, by + 0.6], [bx - 4.8, by - 4.6], [bx - 2.6 - tp * 0.3, by - 8.6], [bx + 1.4 - tp * 0.3, by - 9.2], [bx + 4, by - 5.6], [bx + 5, by + 0.6]], HAT, 6.4, { round: 0.92, floor: 1 });
  px.poly([[bx - 5.2, by - 1.6], [bx + 4.9, by - 1.6], [bx + 5, by + 0.6], [bx - 5.2, by + 0.6]], BAND, 6.45, { round: 0.92 });
  px.dot(bx + 2.6, by - 0.8, GOLD, 6.46, { fix: 4 });
  px.part();
  px.ellipse(bx + 0.8, by + 1.2, 10.2, 1.7, HAT, 6.6, { rot: -0.05 - tp * 0.035, cast: 1, vb: 0.2, floor: 1 });

  // the gun: stock, fore-stock, barrel, the lock's brass; then what the branch fits to it
  const A = (u, v) => g.at(u, v), gz = 7;
  px.part();
  px.capsule(...A(-9.2, 2.8), 2, ...A(-3, 1), 1.5, WOOD, gz);
  px.capsule(...A(-3, 1), 1.5, ...A(0.6, 0.6), 1.2, WOOD, gz);
  px.capsule(...A(0, 0.9), 1, ...A(len * 0.62, 0.9), 0.9, WOOD, gz);
  px.part();
  px.capsule(...A(-1, -0.5), 1, ...A(len, -0.5), 0.9, STEEL, gz + 0.02);
  px.part();
  px.capsule(...A(-2.6, 0.2), 1, ...A(-0.8, 0.2), 1, BRASS, gz + 0.04, { fix: 3 });
  px.dot(...A(-2, -1.8), STEEL, gz + 0.05, { fix: 4 });
  if (kind === "sharp") {
    px.part();
    px.capsule(...A(0, -3.4), 1.1, ...A(10, -3.5), 1.1, BRASS, gz + 0.06);
    px.dot(...A(11, -3.5), LENS, gz + 0.07); px.dot(...A(11, -4.3), LENS, gz + 0.07);
    px.line(...A(2, -2.2), ...A(2, -1.4), BRASS, gz + 0.05, { fix: 1 }); px.line(...A(8, -2.2), ...A(8, -1.4), BRASS, gz + 0.05, { fix: 1 });
  } else if (kind === "grape") {
    px.part();
    px.poly([A(len - 8, -1.7), A(len + lip, -4.8), A(len + lip, 3.8), A(len - 8, 0.9)], BELL, gz + 0.06, { round: 0.7 });
    px.line(...A(len + lip - 0.4, -3.4), ...A(len + lip - 0.4, 2.6), BORE, gz + 0.07);
  }
  if (ram) {   // the rod down the barrel, its head in his fist
    const top = A(len + H.rod + 1.6, -0.5), m = A(len - 0.6, -0.5);
    px.part(); px.line(m[0], m[1], top[0], top[1], ROD, gz + 0.08, { noLine: true });
  }

  // the near arm over it all
  arm(px, [sN[0], sN[1]], H.near, 8, 0);

  const mz = A(len + lip, -0.4), bore = A(len + lip - 6, -0.4), lock = A(-1.6, -1.6);
  return { marks: { muzzle: mz, bore, lock }, kind };
};

// the pan's flash on the shot (the muzzle's flash and smoke are the hall's, live)
const N_SHOT = 16, HIT_F = 2;
export const fx = (px, F, info, clip) => {
  if (clip !== "shot" || Math.abs(F.ph - HIT_F / (N_SHOT - 1)) > 0.01) return;
  const [lx, ly] = info.marks.lock;
  px.ellipse(lx - 0.5, ly - 2.4, 2.2, 1.8, PUFF, 20, { noLine: true });
  px.dot(lx, ly - 1, SPARK, 20.2, { noLine: true }); px.dot(lx + 1, ly - 2, EMBER, 20.2, { noLine: true }); px.dot(lx - 1, ly - 3, SPARK, 20.2, { noLine: true }); px.dot(lx + 2, ly - 4, EMBER, 20.2, { noLine: true });
};

// Every key carries the whole bag (a key cannot unset a field between keys):
//   ga gun angle; gs shouldered (bx, by from the near shoulder) or carried (gx, gy the wrist);
//   ram the rod in hand (rod: its head above the muzzle); prime the near hand at the pan; fu the far hand's place
const BASE = { fN: [-5.5, 0], fF: [6.5, 0], rx: 0, drop: 0.9, lean: 0, twist: 0, rise: 0, hx: 0, hy: 0, ga: -1.05, gs: 0, bx: 1.5, by: 0, gx: 8, gy: -28, ram: 0, rod: 6, prime: 0, fu: 7 };
const AIM = { ...BASE, rx: 4.4, drop: 1.6, lean: 0.12, twist: -0.3, hx: 1.2, hy: 1.4, ga: -0.05, gs: 1, bx: 1.5, by: 0 };
// the kick: the engine starts the ball where the OLD figure's muzzle is as the shot kicks
// (folk-gunners.js MUSK.kick: its butt at 0.69, -15.36 units, the barrel at -0.3); the
// gun's own space is the old one's, so every barrel length lands on its old muzzle
const KICK_BUTT = [1.383, -30.716], KICK_ANG = -0.3;
const kickW = (() => { const c = Math.cos(KICK_ANG), s = Math.sin(KICK_ANG); return [KICK_BUTT[0] - (G_BUTT[0] * c - G_BUTT[1] * s), KICK_BUTT[1] - (G_BUTT[0] * s + G_BUTT[1] * c)]; })();
const GROUND = { ga: -1.3, gx: 4.59, gy: -11.99 };   // the butt on the deck by his front foot
const K = (f, e, p) => ({ t: f / (N_SHOT - 1), e, p: { ...BASE, ...p } });
const SHOT = [
  K(0, "io", { ...AIM, rise: 0.4 }),
  K(1, "io", { ...AIM, hy: 1.6 }),
  K(2, "in3", { rx: 3.6, drop: 1.6, lean: -0.05, twist: -0.3, rise: 0.4, hx: 0.2, hy: 0.4, ga: KICK_ANG, gs: 0, gx: kickW[0], gy: kickW[1] }),
  K(3, "out", { ...AIM, rx: 3.9, lean: 0.03, hx: 0.6, hy: 0.9, ga: -0.15, bx: 1.2 }),
  K(4, "io", { rx: 2.4, drop: 1, lean: 0.03, ga: -0.9, gx: 9, gy: -27 }),
  K(5, "io", { rx: 2, drop: 0.9, lean: 0.08, twist: 0.6, hy: 0.6, ...GROUND, ram: 1, rod: 8 }),
  K(6, "out", { rx: 2.2, drop: 1.3, lean: 0.12, twist: 0.8, hy: 1, ...GROUND, ram: 1, rod: 2 }),
  K(7, "io", { rx: 2, drop: 0.8, lean: 0.07, twist: 0.6, hy: 0.5, ...GROUND, ram: 1, rod: 8.5 }),
  K(8, "out", { rx: 2.2, drop: 1.4, lean: 0.13, twist: 0.8, hy: 1, ...GROUND, ram: 1, rod: 1.6 }),
  K(9, "io", { rx: 2, drop: 0.8, lean: 0.06, twist: 0.6, hy: 0.4, ...GROUND, ram: 1, rod: 9 }),
  K(10, "io", { rx: 2, drop: 0.9, lean: 0.04, twist: 0.2, ga: -0.8, gx: 8, gy: -24 }),
  K(11, "io", { rx: 2.2, drop: 1, lean: 0.06, hy: 1, ga: -0.4, gx: 8.5, gy: -25, prime: 1 }),
  K(12, "io", { rx: 2.4, drop: 1, lean: 0.07, hy: 0.8, ga: -0.36, gx: 8.5, gy: -25.4, prime: 0.6 }),
  K(13, "io", { ...AIM, rx: 3.4, drop: 1.2, lean: 0.06, hx: 0.4, hy: 0.4, ga: -0.5, bx: 1.6, by: 2.6 }),
  K(14, "out", { ...AIM, rx: 4.1, lean: 0.1, hx: 0.9, hy: 1, ga: -0.16, bx: 1.5, by: 0.6 }),
  K(15, "io", { ...AIM, rise: 0.4 }),
];
const PORT = { ...BASE, rx: 0.6, drop: 0.9, lean: 0.02, ga: -1.05, gx: 8, gy: -28 };
export const CLIPS = {
  idle: {
    n: 8, ms: 2300, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 1);
      return fit({ ...PORT, rise: 0.5 + 0.5 * b, gy: -28 - 0.5 - 0.5 * b, ga: -1.05 + 0.02 * b2, sway: b2 * 0.8, blink: ph > 0.6 && ph < 0.73 ? 1 : 0 });
    },
  },
  // hit: the shot kicks on frame 2; frame 1 (the aim, cheek on the stock) is the one he waits on
  shot: { n: N_SHOT, ms: 1900, loop: false, lag: 0.04, hit: HIT_F / (N_SHOT - 1), pose: (ph) => fit(sampleKeys(SHOT, ph)) },
};
