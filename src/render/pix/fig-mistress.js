// ============ CREW FIGURE: the Mistress of Hawks (the Falconry's falconer) ============
// On the roost with her gauntlet out (halls/falconry.js; the old figure was
// drawMistress in folk-gunners.js). A soft hunting hat (a bycocket: the brim
// drawn to a point over her brow and turned up behind, a barred hawk's feather
// raked back from the band), a braid down her back, a belted coat, and on the
// near arm a long leather gauntlet with a gilt cuff: the hall sets the bird on
// it at `glove`.
//   idle   the glove carried at her chest, forearm out level (where a hawk
//          rides): breath, the feather and braid stirring
//   cast   the glove raised to show the bird the field (present), the fist
//          swung down and back to her hip with her weight on the back foot
//          (the hall's bird mantles on it there, below her face), then the arm
//          thrown out and up with a step into it, the hand open: the bird is
//          away (`hit`), the arm comes down still open, and she settles
//   call   the Skyknight's falconer waiting for her eagle: the glove held up
// Looks (o.variant): "mews" (the default: CREW_FOLK.mistress), "court"
// (CREW_FOLK.mistressCourt), "royal" (the Royal Aviary's blue: falconry.js ROYAL).
// Marks: glove (the fist: the old mistressGlove point), every frame.
import { mat, flat } from "./pix.js";
import { sampleKeys, scaled, solve, HUMAN } from "./rig.js";

// today's palettes
const LOOKS = {
  mews: { skin: "#e8b990", hood: "#7a3c30", coat: "#8a5a3a", boots: "#3e2a1a", trim: "#d8b34a", hair: "#5a3222" },
  court: { skin: "#e8b990", hood: "#3a3468", coat: "#5a4a8c", boots: "#2a2a30", trim: "#d8b34a", hair: "#2e2426" },
  royal: { skin: "#e8b990", hood: "#2a3a5a", coat: "#3a5a8a", boots: "#2a2a30", trim: "#d8b34a", hair: "#4a2e20" },
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const lighten = (h, k) => hex(rgb(h).map((v) => v + (255 - v) * k));
const darken = (h, k) => hex(rgb(h).map((v) => v * (1 - k)));

// the gauntlet's leather (the old one ran #9a6a44 to #5a3a22), a hawk's tawny tail feather, its dark bars
const GLOVE = mat("#5e3d24"), FIST = mat("#7a5234"), GOLD = mat("#d8b34a"), PLUME = mat("#b07844"), BAR = mat("#4f3620");
const EYE = flat("#2a1c2c"), LIP = flat("#b86a5a");

const KITS = new Map();
const kitOf = (v) => {
  const key = LOOKS[v] ? v : "mews";
  let K = KITS.get(key);
  if (K) return K;
  const L = LOOKS[key];
  const HAT = mat(L.hood), BRIM = mat(lighten(L.hood, 0.14)), COAT = mat(L.coat), SKIRT = mat(darken(L.coat, 0.12)), SLEEVE = mat(lighten(L.coat, 0.1));
  const HOSE = mat(darken(L.coat, 0.38)), BOOT = mat(L.boots), TRIM = mat(L.trim), BELT = mat(darken(L.trim, 0.3)), SKIN = mat(L.skin), HAIR = mat(L.hair);
  K = {
    HAT, BRIM, COAT, SKIRT, SLEEVE, HOSE, BOOT, TRIM, BELT, SKIN, HAIR,
    // her head: R hair (r a darker strand), S skin (s a tone down), b a brow, E an eye, N the nose, m her lips
    head: { R: { m: HAIR, fix: 2 }, r: { m: HAIR, fix: 1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, b: { m: HAIR, fix: 3 }, e: { m: SKIN, fix: 0 }, E: { m: EYE }, m: { m: LIP } },
  };
  KITS.set(key, K);
  return K;
};

// Bare under the hat (drawn over it): no fringe, the hair behind the ear and at
// the nape only; the face at the front edge of the head, the nose proud.
const HEAD = [
  "....RRRRR....",
  "..RRRRRRRRR..",
  ".RRRRRRRRRRR.",
  ".RRRRRRSSSSS.",
  "RRRRRrSSbSSb.",
  "RRRRrSSSESSE.",
  "RRRrrSSSESSEN",
  ".RrrSSSSSSSS.",
  "..rr.sSSSmm..",
  "......sSSS...",
  "......sSS....",
  "......sss....",
];
const BLINK = HEAD.map((r, i) => (i === 5 ? r.replace(/E/g, "S") : i === 6 ? r.replace(/E/g, "e") : r));

export const BOX = { w: 44, h: 62, ox: 16, oy: 59 };
// the arms a real arm's length (shoulder to knuckles, a good third of her height): the glove has to reach
export const BONES = scaled(HUMAN, 1.2, { shN: -2.4, shF: 2.8, hipN: -1.3, hipF: 1.5, upper: 8.7, fore: 8.5 });

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const leg = (px, K, h, k, an, z, b) => {
  const c = [k[0] * 0.3 + an[0] * 0.7, k[1] * 0.3 + an[1] * 0.7];
  px.part();
  px.capsule(h[0], h[1], 2.5, k[0], k[1], 2.1, K.HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 2, an[0], an[1] - 3, 1.8, K.HOSE, z, { bias: b, floor: 1 });
  px.capsule(c[0], c[1], 2.1, an[0], an[1], 1.9, K.BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.4, an[1] + 1.1, 3, 1.6, K.BOOT, z + 0.03, { bias: b, floor: 1 });
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const K = kitOf(o.variant);
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5);
  const vy = cl(C[1] - lag1.C[1], -2, 2), sway = lag1.p.sway || 0, sway2 = lag2.p.sway || 0;
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const tp = cl(vx * 2 + vx2 * 1.5, -2.5, 3) - sway2 * 0.5;      // what trails: the braid's end, the feather's tip

  // ---- the braid down her back, tied in the house's gold, a beat behind her
  {
    const b0 = [hx - 4.6, hy - 6], b1 = [hx - 6.6 - tp * 0.3, hy - 1.6], b2 = [hx - 7.4 - tp * 0.9 + vy * 0.4, hy + 5.4];
    px.part();
    px.capsule(b0[0], b0[1], 1.7, b1[0], b1[1], 1.6, K.HAIR, 0.6);
    px.capsule(b1[0], b1[1], 1.6, b2[0], b2[1], 1.1, K.HAIR, 0.6);
    px.tone(mix(b0, b1, 0.7)[0], mix(b0, b1, 0.7)[1], -1, px._pid); px.tone(mix(b1, b2, 0.35)[0], mix(b1, b2, 0.35)[1], -1, px._pid); px.tone(mix(b1, b2, 0.7)[0], mix(b1, b2, 0.7)[1], -1, px._pid);
    px.dot(b2[0], b2[1] - 0.6, GOLD, 0.62, { fix: 3 });
  }

  // ---- the far arm, a tone down: it hangs behind her, a bare hand
  px.part();
  px.capsule(sF[0], sF[1], 2.2, eF[0], eF[1], 2.1, K.SLEEVE, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.1, hdF[0], hdF[1], 1.8, K.SLEEVE, 1, { bias: -1 });
  px.part(); px.ellipse(hdF[0], hdF[1], 1.7, 1.7, K.SKIN, 1.2, { bias: -1 });

  // ---- legs
  leg(px, K, hF, kF, anF, 2, -1);
  leg(px, K, hN, kN, anN, 3, 0);

  // ---- the coat: a jerkin to the belt, a short skirt under it
  const hemB = P[0] - 6 - vx * 1.1, hemF = P[0] + 5.8 - vx * 0.7, hemY = P[1] + 4.4;
  px.part(); const skirt = px._pid;
  px.poly([[P[0] - 4.9, P[1] - 3.6], [P[0] + 4.6, P[1] - 3.6], [hemF, hemY], [hemF - 3, hemY + 1], [P[0] + 0.6 - vx, hemY - 0.2], [hemB + 2.6, hemY + 1], [hemB, hemY]], K.SKIRT, 3.9, { round: 0.9, cast: 1 });
  px.toneLine(P[0] + 0.8, P[1] - 1, P[0] + 0.6 - vx, hemY - 0.6, -1, skirt);
  px.part(); const coat = px._pid;
  px.poly([[C[0] - 4.6, C[1] - 2], [C[0] + 4.8, C[1] - 2], [C[0] + 5.6, C[1] + 3.5], [P[0] + 4.6, P[1] - 3.2], [P[0] - 4.9, P[1] - 3.2], [C[0] - 5.6, C[1] + 3.5]], K.COAT, 4, { round: 0.92, cast: 2 });
  // a strap across the chest, the lacing edge
  px.toneLine(C[0] - 4, C[1] - 0.4, P[0] + 3.6, P[1] - 5.4, -1, coat);
  px.toneLine(C[0] + 3.6, C[1] + 1, P[0] + 3.4, P[1] - 5, 1, coat);
  // the belt and its buckle; a gold collar
  px.poly([[P[0] - 5, P[1] - 5], [P[0] + 4.7, P[1] - 5], [P[0] + 4.7, P[1] - 3], [P[0] - 5, P[1] - 3]], K.BELT, 4.05, { round: 0.92 });
  px.rect(P[0] + 1.4, P[1] - 5, 2, 2, GOLD, 4.06, { fix: 3 });
  px.line(C[0] - 2, C[1] - 2.4, C[0] + 3.4, C[1] - 2.4, K.TRIM, 4.06, { bias: -1 });

  // ---- her head, then the hat over it
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hy, K.head, 6, { ax: 7, ay: 12, cast: 2 });
  {
    // the feather, raked back from the band: it stands up as she pulls back and lies flat on the throw
    const lift = (p.plume || 0) * 3 - cl(vx * 1.2, -2, 2), r0 = [hx - 2.2, hy - 12.2], r1 = [hx - 6 - tp * 0.5, hy - 15.2 - lift * 0.5], r2 = [hx - 9.6 - tp, hy - 16.6 - lift];
    px.part();
    px.capsule(r0[0], r0[1], 0.9, r1[0], r1[1], 1.2, PLUME, 6.35);
    px.capsule(r1[0], r1[1], 1.2, r2[0], r2[1], 0.7, PLUME, 6.35);
    px.dot(mix(r0, r1, 0.75)[0], mix(r0, r1, 0.75)[1], BAR, 6.36); px.dot(mix(r0, r1, 0.75)[0], mix(r0, r1, 0.75)[1] - 1, BAR, 6.36);
    px.capsule(mix(r1, r2, 0.6)[0], mix(r1, r2, 0.6)[1], 0.9, r2[0], r2[1], 0.7, BAR, 6.37);
    // the crown, its band, then the brim: a point over the brow, turned up behind
    px.part();
    px.poly([[hx - 4.8, hy - 10.6], [hx + 5.2, hy - 10.6], [hx + 3, hy - 14.8], [hx - 3.4, hy - 14.4]], K.HAT, 6.4, { round: 0.9 });
    px.line(hx - 4.4, hy - 11.4, hx + 4.6, hy - 11.4, K.TRIM, 6.42, { bias: -1 });
    px.part();
    px.poly([[hx - 7.6, hy - 12.8], [hx - 5.4, hy - 9.2], [hx + 4.6, hy - 9], [hx + 9.4, hy - 8.6], [hx + 4.8, hy - 11], [hx - 4.4, hy - 11.2]], K.BRIM, 6.5, { round: 0.5, cast: 2 });
  }

  // ---- the near arm: a coat sleeve, the long gauntlet flaring to its gilt cuff, the fist (open as the bird goes)
  const u = [hdN[0] - eN[0], hdN[1] - eN[1]], ul = Math.hypot(u[0], u[1]) || 1; u[0] /= ul; u[1] /= ul;
  px.part();
  px.capsule(sN[0], sN[1] + 0.4, 2.5, eN[0], eN[1], 2.2, K.SLEEVE, 8, { cast: 2, edge: true });
  px.capsule(eN[0], eN[1], 2.2, mix(eN, hdN, 0.3)[0], mix(eN, hdN, 0.3)[1], 2.1, K.SLEEVE, 8, { cast: 2, edge: true });
  px.part();
  { const a = mix(eN, hdN, 0.24), b = mix(eN, hdN, 0.92); px.capsule(a[0], a[1], 2.8, b[0], b[1], 2, GLOVE, 8.1, { cast: 2, edge: true, bias: -1, floor: 1 }); const g = mix(eN, hdN, 0.3); px.capsule(g[0] - u[1] * 2.3, g[1] + u[0] * 2.3, 0.9, g[0] + u[1] * 2.3, g[1] - u[0] * 2.3, 0.9, GOLD, 8.12); }
  px.part();
  const open = p.open || 0;
  if (open > 0.5) {
    // the hand thrown open: fingers along the arm, the thumb up
    const n = [-u[1], u[0]];
    px.ellipse(hdN[0], hdN[1], 1.7, 1.7, FIST, 8.2);
    for (const s of [-0.9, 0, 0.9]) px.line(hdN[0] + u[0] * 1.2 + n[0] * s, hdN[1] + u[1] * 1.2 + n[1] * s, hdN[0] + u[0] * 3.3 + n[0] * s * 1.7, hdN[1] + u[1] * 3.3 + n[1] * s * 1.7, FIST, 8.2, { bias: s > 0 ? -1 : 0 });
    px.line(hdN[0] - n[0] * 1.4, hdN[1] - n[1] * 1.4, hdN[0] - n[0] * 3 + u[0] * 0.8, hdN[1] - n[1] * 3 + u[1] * 0.8, FIST, 8.2);
  } else px.ellipse(hdN[0], hdN[1], 2, 1.9, FIST, 8.2, { cast: 1 });

  return { marks: { glove: [hdN[0], hdN[1]] } };
};

// ---- the clips ---------------------------------------------------------------
// Each key is a body pose plus where the glove is (art px from the feet): `to` turns that
// into the near arm's angle and reach about the shoulder of THAT pose, so between keys the
// fist still swings on an arc. The rest and the cast are the engine's old points
// (mistressGlove "carry" [6.3, -13.4] and "cast" [9.0, -21.4] units, two px to a unit).
const ARM = BONES.upper + BONES.fore;
const to = (pose, g, flip = 0) => {
  const s = solve(pose, BONES).sN, dx = g[0] - s[0], dy = g[1] - s[1];
  return { ...pose, aN: [Math.atan2(dx, dy), Math.min(0.985, Math.hypot(dx, dy) / ARM), flip] };
};
const BASE = { rx: 0, lean: 0, twist: 1.1, hx: 0.4, hy: 0, aF: [-0.3, 0.9, 0], fN: [-2.6, 0], fF: [2.4, 0], open: 0, plume: 0, sway: 0, blink: 0 };
const CARRY = to(BASE, [12.6, -26.8]);
const PRESENT = to({ ...BASE, rx: 0.8, lean: 0.03, twist: 1.5, rise: 0.6, hy: -0.6, aF: [-0.36, 0.88, 0], plume: 0.2 }, [15.2, -40.4]);
const PRESENT2 = to({ ...BASE, rx: 1, lean: 0.04, twist: 1.5, rise: 1, hy: -0.8, aF: [-0.4, 0.88, 0], plume: 0.1 }, [15.6, -41.4]);
const DRAW = to({ ...BASE, rx: -1.8, drop: 1, lean: -0.11, twist: 0.6, hy: 0.2, aF: [-0.4, 0.88, 0], fN: [-3, 0], fF: [2.6, 0], plume: 0.9 }, [6.5, -19.6]);
const DRAW2 = to({ ...BASE, rx: -2.3, drop: 1.3, lean: -0.14, twist: 0.5, hy: 0.3, aF: [-0.36, 0.88, 0], fN: [-3, 0], fF: [2.6, 0], plume: 1 }, [5.8, -19]);
const CAST = to({ ...BASE, rx: 3.6, drop: 0.9, rise: 1, lean: 0.12, twist: 1.8, hx: -0.8, hy: -0.6, aF: [-0.55, 0.95, 0], fN: [-3, 0], fF: [6.4, 0], open: 1, plume: -1 }, [18, -42.8]);
const FOLLOW = to({ ...BASE, rx: 2.6, drop: 0.8, lean: 0.11, twist: 1.5, hx: 0.8, aF: [-0.4, 0.92, 0], fN: [-3, 0], fF: [6.4, 0], open: 1, plume: -0.5 }, [17.2, -32]);
const STEP = to({ ...BASE, rx: 1.2, drop: 0.2, lean: 0.04, twist: 1.2, aF: [-0.36, 0.9, 0], fN: [-2.8, 0], fF: [4.4, 1.6], plume: 0.2 }, [14, -27.6]);
const TAU = Math.PI * 2, T = (f) => f / 13;
export const CLIPS = {
  idle: {
    n: 8, ms: 2600, loop: true, lag: 0.12,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b;
      return { ...to({ ...BASE, rise: 0.7 * u, rx: -0.3 * u }, [12.6, -26.8 - 0.8 * (0.5 + 0.5 * Math.sin(ph * TAU - 0.9))]), sway: Math.sin(ph * TAU - 1.6), blink: ph > 0.55 && ph < 0.65 ? 1 : 0 };
    },
  },
  // 14 frames: 2 to 4 the glove presented, 6 and 7 the fist drawn back to her hip (7 is what she
  // holds until the shot; the hall's bird mantles on those two), 8 the cast, then the follow-through
  cast: {
    n: 14, ms: 1000, loop: false, lag: 0.07, hit: 8 / 13,
    pose: (ph) => sampleKeys([
      { t: 0, p: CARRY },
      { t: T(2), e: "io", p: PRESENT },
      { t: T(4), e: "io", p: PRESENT2 },
      { t: T(6), e: "io", p: DRAW },
      { t: T(7), e: "out", p: DRAW2 },
      { t: T(8), e: "in3", p: CAST },
      { t: T(10), e: "out", p: FOLLOW },
      { t: T(12), e: "io", p: STEP },
      { t: 1, e: "io", p: CARRY },
    ], ph),
  },
  // glove up, waiting on a bird that is not there
  call: {
    n: 8, ms: 2200, loop: true, lag: 0.12,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b;
      return { ...to({ ...BASE, rx: 0.8, lean: 0.03, twist: 1.5, rise: 0.4 + 0.6 * u, hy: -0.6, aF: [-0.36, 0.88, 0], plume: 0.15 }, [15.2, -40.4 - 0.6 * u]), sway: Math.sin(ph * TAU - 1.6) };
    },
  },
};
