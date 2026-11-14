// ============ CREW FIGURE: the standing tradesman ============
// One man, two trades (o.variant):
//   "clerk"     the Gold Works' clerk: a velvet beret on a gold band with a white quill raked
//               back in it, a slate doublet with gold buttons and a cream collar, a purse at
//               his belt, the ledger open on his far forearm. He thumbs a coin up and catches
//               it, takes the quill from his beret and enters it, tucks the quill back, and
//               throws a hand up to catch the coin the works tosses him when it pays out.
//   "watch"     the River Watch's watchman: a steel kettle hat over a padded coif, a short
//               mantle over a quilted coat, the brass spyglass in his near
//               hand. He stands easy, shades his eyes for a look out, and raises the glass:
//               up to his eye, a sweep up the far bank, down again.
//   "watch|a"   the Harbour Patrol's navy coat (and its two finals)
//   "watch|b"   the Fireship Wharf's pitch-red coat (and its two finals)
// Clips: the clerk's `idle`, `flip`, `write`, `pay`; the watchman's `watch` (his idle),
// `glance`, `glass`. A clip's pose cannot see the variant, so each trade has its own names.
// Every hand is put where its work is: the pose solves the skeleton once to find the
// shoulders, then aims each arm at its spot (the ledger, the page, the brim, the glass).
import { mat, flat } from "./pix.js";
import { solve, HUMAN, scaled, EASE, lerp, clamp } from "./rig.js";

// The old stander stood 23.8 units to the crown of his head (47.6 art px) with a 5-unit head:
// a long body under a head of the usual size.
export const BONES = scaled(HUMAN, 1.2, { thigh: 9.8, shin: 9.2, ankle: 2.4, spine: 13.6, neck: 1.8, shN: -2.6, shF: 3, hipN: -1.4, hipF: 1.6 });
export const BOX = { w: 38, h: 60, ox: 15, oy: 56 };
const ARM = BONES.upper + BONES.fore;

const h2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
// a colour pushed toward white (+) or black (-)
const tint = (hex, f) => { const t = f > 0 ? 255 : 0, a = Math.abs(f); return "#" + [1, 3, 5].map((i) => { const v = parseInt(hex.slice(i, i + 2), 16); return h2(v + (t - v) * a); }).join(""); };

const SKIN = mat("#e8b990"), EYE = flat("#2a1c2c"), LIP = flat("#b0705a"), STEEL = mat("#b4bac6", { contrast: 1.2 });
const BRASS = mat("#c8a048", { contrast: 1.15 }), BRASS_D = mat("#a88438"), LENS = flat("#fff3d2"), LEATHER = mat("#6a4a2e");
const BOOK = mat("#8a3a2e"), PAGE = mat("#e8dcc0"), QUILL = mat("#f4ecd8"), GOLD = mat("#d8b34a", { contrast: 1.15 });

// today's palettes: CREW_FOLK.clerk (folk-kit.js) and WATCH (halls/riverwatch.js)
const PAL = {
  clerk: { hood: "#3a4a6a", coat: "#4a5a7a", boots: "#2a2a30", trim: "#d8b34a", hair: "#6a4a30" },
  watch: { hood: "#3a4a5a", coat: "#4a6a7a", boots: "#2a2a30", trim: "#c8b070" },
  "watch|a": { hood: "#2a3a5a", coat: "#3a5a8a", boots: "#2a2a30", trim: "#e8e0c8" },
  "watch|b": { hood: "#3a2a28", coat: "#7a3a2a", boots: "#2a2420", trim: "#2e2630" },
};
export const VARIANTS = { clerk: "Gold Works clerk", watch: "River Watch", "watch|a": "Harbour Patrol", "watch|b": "Fireship Wharf" };

// ---- heads (13 wide, facing +x, the face at the front edge, the nose proud) -------------
//   S skin, s skin a tone down, N nose, b brow, E eye, m lips, R hair, r hair a tone down,
//   C the coif, c its seam
const CLERK_HEAD = [
  "....RRSSSS...",
  "..RRRRSSSSSS.",
  ".RRRRSSSSSSS.",
  ".RRRRSSSSSSS.",
  ".RRRrSSbbSbb.",
  ".RRrSSSSESSE.",
  ".RRrsSSSESSEN",
  ".RRrSSSSSSSSN",
  "..RrSSSSSSSS.",
  "...rsSSSSmm..",
  ".....sSSSS...",
];
const WATCH_HEAD = [
  "....SSSSSS...",
  "..CCSSSSSSSS.",
  ".CCCSSSSSSSS.",
  ".CCCSSSSSSSS.",
  ".CCcSSSbbSbb.",
  ".CCcSSSSESSE.",
  ".CCcsSSSESSEN",
  ".CCcSSSSSSSSN",
  ".CCcsSSSSSSS.",
  "..CcssssSmm..",
  "..CC.ssSSS...",
];
const blinkOf = (H) => H.map((r, i) => (i === 5 ? r.replace(/E/g, "S") : i === 6 ? r.replace(/E/g, "e") : r));
// ---- hats (16 wide: two columns more than the head each side) ---------------------------
// the beret: a soft velvet disc slumped over the back of the head, on a gold band
//   V velvet, v its fold, W the sheen on its crown, G the band
const BERET = [
  ".....VVVVVVV....",
  "..VVVVVWWWVVVV..",
  ".VVVVVVVVVWWVVV.",
  "VVVvVVVVVVVVVVV.",
  "VVvvvVVVVVVVVVV.",
  ".vv.GGGGGGGGGGG.",
];
// the kettle hat: a steel dome with a band of rivets, its broad brim tipped down all round
//   M steel, W the glint, G the rivet band, m the brim's shaded underside
const KETTLE = [
  ".....MMMMMM.....",
  "....MMWWMMMM....",
  "...GGGGGGGGGG...",
  "...MMMMMMMMMM...",
  "..MMMMMMMMMMMM..",
  "MMmmmmmmmmmmmmMM",
  "m..............m",
];

const LOOKS = new Map();
const look = (v) => {
  if (!PAL[v]) v = "clerk";
  let L = LOOKS.get(v);
  if (L) return L;
  const pal = PAL[v], watch = v !== "clerk";
  L = {
    watch, COAT: mat(pal.coat), SLEEVE: mat(tint(pal.coat, 0.07)), HOSE: mat(tint(pal.coat, -0.2)), BOOT: mat(pal.boots, { contrast: 1.25 }),
    HOOD: mat(pal.hood), TRIM: mat(pal.trim, { contrast: 1.15 }), HAIR: mat(pal.hair || "#6a4a30"),
  };
  L.head = watch ? WATCH_HEAD : CLERK_HEAD; L.blink = blinkOf(L.head); L.hat = watch ? KETTLE : BERET;
  L.headLeg = {
    S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, E: { m: EYE }, m: { m: LIP },
    b: { m: L.HAIR, fix: 1 }, R: { m: L.HAIR }, r: { m: L.HAIR, bias: -1 }, C: { m: L.HOOD, floor: 1 }, c: { m: L.HOOD, bias: -1, floor: 1 },
  };
  L.hatLeg = watch
    ? { M: { m: STEEL }, W: { m: STEEL, bias: 1 }, G: { m: L.TRIM }, m: { m: STEEL, bias: -2 } }
    : { V: { m: L.HOOD, floor: 1 }, v: { m: L.HOOD, bias: -1, floor: 1 }, W: { m: L.HOOD, bias: 1 }, G: { m: L.TRIM } };
  LOOKS.set(v, L);
  return L;
};

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const leg = (px, L, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.3, k[0], k[1], 2.0, L.HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 1.9, an[0], an[1] - 2.5, 1.6, L.HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.45 + an[0] * 0.55, k[1] * 0.45 + an[1] * 0.55, 2.0, an[0], an[1], 1.8, L.BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.3, an[1] + 1.2, 2.8, 1.5, L.BOOT, z + 0.03, { bias: b, floor: 1 });
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const L = look(o.variant), W = L.watch;
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2, 2), vx2 = cl(lag1.C[0] - lag2.C[0], -2, 2), vy = cl(C[1] - lag1.C[1], -2, 2);
  const two = (p.two || 0) > 0.5, shade = (p.shade || 0) > 0.5;
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const marks = {};

  // the far arm, a tone down: behind him, unless it is up on the glass
  const farArm = (z) => {
    px.part();
    px.capsule(sF[0], sF[1], 2.1, eF[0], eF[1], 2.0, L.SLEEVE, z, { bias: -1 });
    px.capsule(eF[0], eF[1], 2.0, hdF[0], hdF[1], 1.7, L.SLEEVE, z, { bias: -1 });
    px.capsule(eF[0] * 0.26 + hdF[0] * 0.74, eF[1] * 0.26 + hdF[1] * 0.74, 1.8, eF[0] * 0.16 + hdF[0] * 0.84, eF[1] * 0.16 + hdF[1] * 0.84, 1.8, W ? LEATHER : L.HOOD, z + 0.02, { bias: -1 });
  };
  const farHand = (z) => { px.part(); px.ellipse(hdF[0], hdF[1], 1.6, 1.7, SKIN, z, { bias: -1 }); };
  if (!two) { farArm(1); if (W && !shade) farHand(1.6); }

  leg(px, L, hF, kF, anF, 2, -1);
  leg(px, L, hN, kN, anN, 3, 0);

  // the coat: a doublet to mid-thigh (the clerk's a little longer), belted
  const hemY = P[1] + (W ? 4.2 : 5.8), hemB = P[0] - 6.6 - vx * 1.0, hemF = P[0] + 6.2 - vx * 0.6;
  px.part(); const coat = px._pid;
  px.poly([[C[0] - 4.6, C[1] - 2], [C[0] + 4.8, C[1] - 2], [C[0] + 5.8, C[1] + 3.2], [P[0] + 4.0, P[1] - 4], [hemF, hemY], [hemB, hemY], [P[0] - 4.2, P[1] - 4], [C[0] - 5.8, C[1] + 3.2]], L.COAT, 4, { round: 0.92, cast: 2 });
  px.toneLine(P[0] + 1.4, P[1] - 2, P[0] + 1.2 - vx * 0.5, hemY - 0.6, -1, coat);          // where the skirt parts
  px.toneLine(hemB + 0.6, hemY - 0.5, hemF - 0.6, hemY - 0.5, -1, coat);                   // the hem's shade
  if (W) {
    // quilting down the padded coat
    px.toneLine(C[0] - 1.6, C[1] + 3, P[0] - 1.8, P[1] - 5.5, -1, coat);
    px.toneLine(C[0] + 2.2, C[1] + 3, P[0] + 2, P[1] - 5.5, -1, coat);
  } else {
    for (const [dx, dy] of [[3.0, 2.2], [3.2, 5.4], [3.3, 8.6]]) px.dot(C[0] + dx, C[1] + dy, GOLD, 4.06, { fix: 3 });   // gold buttons
  }
  px.poly([[P[0] - 4.5, P[1] - 5], [P[0] + 4.3, P[1] - 5], [P[0] + 4.4, P[1] - 3], [P[0] - 4.6, P[1] - 3]], W ? L.TRIM : LEATHER, 4.05, { round: 0.92 });
  px.rect(P[0] + 1.2, P[1] - 5, 2, 2, W ? BRASS : GOLD, 4.06, { fix: 3 });
  if (!W) {
    // his purse on the near hip, a gold clasp on it; it swings a beat behind
    const sx = P[0] - 2.6 - vx * 0.8;
    px.part(); px.ellipse(sx, P[1] + 0.6, 2.3, 2.7, LEATHER, 4.2, { cast: 1 }); px.dot(sx, P[1] - 0.8, GOLD, 4.22, { fix: 3 });
  }

  // the clerk's ledger, open on his far forearm, its far edge tipped up toward his eye
  if (!W) {
    const t = p.book ?? -0.3, u = [Math.cos(t), Math.sin(t)], n = [-u[1], u[0]], bc = [hdF[0] + 0.9, hdF[1] - 2.7];
    const Q = (a, b) => [bc[0] + u[0] * a + n[0] * b, bc[1] + u[1] * a + n[1] * b];
    px.part(); px.ellipse(hdF[0], hdF[1] + 0.2, 1.7, 1.7, SKIN, 4.9, { bias: -1 });        // the far hand under it
    px.part();
    px.poly([Q(-4.9, -1.2), Q(4.9, -1.2), Q(4.9, 1.9), Q(-4.9, 1.9)], BOOK, 5, { n: [0.25, 0.3, 0.9], cast: 1 });
    px.poly([Q(-4.4, -2.6), Q(4.4, -2.6), Q(4.4, -1.0), Q(-4.4, -1.0)], PAGE, 5.05, { n: [-0.2, -0.5, 0.8] });
    px.dot(...Q(-4.2, 1.2), GOLD, 5.06, { fix: 3 }); px.dot(...Q(4.2, 1.2), GOLD, 5.06, { fix: 3 });
    marks.book = Q(0, -2.6);
  }
  // collar and shoulders: the clerk's cream collar, the watch's short mantle (the coif runs into it)
  px.part();
  if (W) px.poly([[C[0] - 5.4, C[1] - 2.8], [C[0] + 5.3, C[1] - 2.8], [C[0] + 6.3, C[1] + 1.2], [C[0] + 2.6, C[1] + 2.8], [C[0] - 2.6, C[1] + 2.6], [C[0] - 6.4, C[1] + 1.6]], L.HOOD, 5, { round: 0.9, cast: 1, floor: 1 });
  else px.poly([[C[0] - 3.4, C[1] - 2.8], [C[0] + 4.4, C[1] - 2.8], [C[0] + 4.8, C[1] - 0.6], [C[0] - 3.6, C[1] - 0.6]], PAGE, 5, { round: 0.9, cast: 1 });

  // the head, then its hat
  px.part();
  px.stamp(p.blink ? L.blink : L.head, hx, hy, L.headLeg, 6, { ax: 6, ay: 11, cast: 2 });
  const tp = cl(vx * 2 + vx2 * 1.4, -2, 2.5) + (p.sway || 0) * 0.5, bob = cl(vy * 0.8, -1, 1);
  if (!W && !((p.q || 0) > 0.5)) {
    // the quill in the band, raked back past the beret's edge: it trails and nods a beat behind
    px.part();
    px.capsule(hx - 1.4, hy - 8.6, 0.7, hx - 5.2 - tp * 0.5, hy - 12.2 + bob * 0.5, 1.0, QUILL, 6.6);
    px.capsule(hx - 5.2 - tp * 0.5, hy - 12.2 + bob * 0.5, 1.0, hx - 9.2 - tp, hy - 13.6 + bob, 0.6, QUILL, 6.6);
  }
  px.part();
  px.stamp(L.hat, hx, hy, L.hatLeg, 6.4, { ax: 8, ay: 13, cast: 1, ball: [8, 4, 9, 6] });
  marks.hat = [hx - 1.5, hy - 9];

  if (two) { farArm(7); farHand(7.2); }
  if (W && shade) farHand(7);

  // the spyglass, in the near hand: shut at his belt, drawn out as it comes up to the eye
  if (W) {
    const gl = cl(p.gl || 0, 0, 1), ga = p.ga ?? 0.9, Lg = 5 + 6.5 * gl, grip = 0.5 + 0.05 * gl, u = [Math.cos(ga), Math.sin(ga)];
    const e = [hdN[0] - u[0] * grip * Lg + u[1] * 1.3, hdN[1] - u[1] * grip * Lg - u[0] * 1.3], f = [e[0] + u[0] * Lg, e[1] + u[1] * Lg];
    const m = [lerp(e[0], f[0], 0.45), lerp(e[1], f[1], 0.45)];
    px.part();
    px.capsule(e[0], e[1], 0.9, m[0], m[1], 0.9, BRASS_D, 7.5, { edge: true });
    px.capsule(m[0], m[1], 1.3, f[0], f[1], 1.3, BRASS, 7.5, { edge: true });
    px.dot(f[0] + u[0] * 0.6, f[1] + u[1] * 0.6, LENS, 7.6);
    marks.lens = [f[0] + u[0], f[1] + u[1]];
  }

  // the near arm over it all
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.3, eN[0], eN[1], 2.1, L.SLEEVE, 8, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.1, hdN[0], hdN[1], 1.8, L.SLEEVE, 8, { cast: 2 });
  px.capsule(eN[0] * 0.28 + hdN[0] * 0.72, eN[1] * 0.28 + hdN[1] * 0.72, 1.9, eN[0] * 0.18 + hdN[0] * 0.82, eN[1] * 0.18 + hdN[1] * 0.82, 1.9, W ? LEATHER : L.HOOD, 8.02);
  if (!W && (p.q || 0) > 0.5) {
    // the quill in his fingers: the nib down on the page, the feather up and back
    px.part();
    px.capsule(hdN[0] + 1.2, hdN[1] + 1.8, 0.5, hdN[0] - 0.6, hdN[1] - 2, 0.8, QUILL, 8.1);
    px.capsule(hdN[0] - 0.6, hdN[1] - 2, 0.9, hdN[0] - 1.8 - tp * 0.4, hdN[1] - 5, 0.6, QUILL, 8.1);
  }
  px.part(); px.ellipse(hdN[0], hdN[1], 1.7, 1.7, SKIN, 8.2);
  marks.coin = [hdN[0], hdN[1] - 2.4];
  marks.hand = [hdN[0], hdN[1]];
  return { marks };
};

// ---- poses ---------------------------------------------------------------------------------
const TAU = Math.PI * 2;
// an arm [angle, reach, flip] that puts its hand at t, from shoulder s
const aim = (s, t, flip = 0) => { const dx = t[0] - s[0], dy = t[1] - s[1]; return [Math.atan2(dx, dy), clamp(Math.hypot(dx, dy) / ARM, 0.25, 0.97), flip]; };
const mixA = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), t < 0.5 ? a[2] : b[2]];
// a value through keys [[t, v, ease]]: the ease shapes the move INTO its key
const track = (ph, keys) => {
  if (ph <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (ph <= keys[i][0]) { const a = keys[i - 1], b = keys[i]; return lerp(a[1], b[1], (EASE[b[2]] || EASE.io)((ph - a[0]) / (b[0] - a[0] || 1))); }
  return keys[keys.length - 1][1];
};
const bump = (ph, a, b) => (ph <= a || ph >= b ? 0 : Math.sin(((ph - a) / (b - a)) * Math.PI));

// The clerk. Where his near hand can be (each from the solved skeleton):
const PAGE_AT = (s, d = 0, lift = 0) => [s.C[0] + 8.2 + d, s.C[1] + 4.9 - d * 0.3 - lift];
const COIN_AT = (s, dy = 0) => [s.C[0] + 10.4, s.C[1] + 3 + dy];
const HAT_AT = (s) => [Math.round(s.N[0]) - 1.2, Math.round(s.N[1]) - 8.6];
const UP_AT = (s, dy = 0) => [s.C[0] + 10.4, s.C[1] - 7.6 + dy];
const CSTAND = { fN: [-2.6, 0], fF: [2.8, 0] };
// body: the pose's own fields; near(s) -> the near arm
const clerk = (body, near) => {
  const p = { ...CSTAND, ...body }, s = solve(p, BONES);
  p.aF = aim(s.sF, [s.C[0] + 8.2, s.C[1] + 11]);
  p.aN = near(s);
  return p;
};
// The watchman: `u` 0..1 brings the glass from his belt to his eye, `ga` is its angle there
// (0 level, minus = raised), `sh` 0..1 puts the far hand to his brim.
const WSTAND = { fN: [-3, 0], fF: [3.2, 0] };
const FAR_REST = [0.14, 0.95, 0];
const watchman = (body, u = 0, ga = -0.04, sh = 0) => {
  const p = { ...WSTAND, ...body }, s = solve(p, BONES), hx = Math.round(s.N[0]), hy = Math.round(s.N[1]);
  const d = [Math.cos(ga), Math.sin(ga)], Lg = 11.5, eye = [hx + 3.6, hy - 5.2];
  const nearEye = [eye[0] + d[0] * 0.55 * Lg - d[1] * 1.3, eye[1] + d[1] * 0.55 * Lg + d[0] * 1.3];
  const farEye = [eye[0] + d[0] * 0.3 * Lg - d[1] * 1.5, eye[1] + d[1] * 0.3 * Lg + d[0] * 1.5];
  const e = EASE.io(u);
  p.aN = mixA(aim(s.sN, [s.P[0] + 3.6, s.P[1] - 1.8]), aim(s.sN, nearEye), e);
  p.gl = clamp(u * 1.5, 0, 1); p.ga = lerp(0.42 + (p.gsw || 0), ga, e);
  const fu = clamp((u - 0.3) / 0.7, 0, 1);
  p.aF = mixA(FAR_REST, aim(s.sF, farEye), EASE.io(fu)); p.two = u > 0.45 ? 1 : 0;
  // the hand comes up close to his chest (the reach folds midway), not out at arm's length
  if (sh > 0) { p.aF = mixA(FAR_REST, aim(s.sF, [hx + 8.2, hy - 7.2], 1), sh); p.aF[1] *= 1 - 0.32 * Math.sin(Math.PI * sh); p.aF[2] = sh > 0.25 ? 1 : 0; p.shade = sh > 0.6 ? 1 : 0; }
  return p;
};

export const CLIPS = {
  // ---- the clerk ----
  // at ease over his ledger: a breath, his weight easing back and forth, a finger on the page
  idle: {
    n: 8, ms: 1920, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = 0.5 - 0.5 * Math.cos(ph * TAU), b2 = Math.sin(ph * TAU - 0.9);
      return clerk({ rise: 0.9 * b, rx: -0.35 * b, sway: b2 * 0.8, book: -0.3 + 0.03 * b, blink: ph > 0.56 && ph < 0.7 ? 1 : 0 }, (s) => aim(s.sN, PAGE_AT(s, 0, 1.2 * bump(ph, 0.26, 0.5))));
    },
  },
  // a coin thumbed up off his hand, watched up and down, caught (the hall flies the coin from
  // `coin`: it leaves at FLIP_UP and lands at FLIP_DOWN)
  flip: {
    n: 12, ms: 2400, loop: false, lag: 0.05,
    pose: (ph) => {
      const at = track(ph, [[0, 0], [0.1, 1, "io"], [0.9, 1], [1, 0, "io"]]);
      const dy = track(ph, [[0, 0], [0.1, 1.8, "io"], [0.16, -2.8, "in3"], [0.3, 0, "out"], [0.78, 0], [0.84, 2, "out"], [0.92, 0, "io"], [1, 0]]);
      const k = bump(ph, 0.16, 0.8);
      return clerk({ rise: 0.8 * k, lean: -0.05 * k, hy: -1.3 * k, hx: -0.3 * k, drop: 0.5 * bump(ph, 0.04, 0.16) + 0.5 * bump(ph, 0.78, 0.92), book: -0.3 }, (s) => mixA(aim(s.sN, PAGE_AT(s)), aim(s.sN, COIN_AT(s, dy)), at));
    },
  },
  // the quill out of his beret, three lines entered, the quill tucked back
  write: {
    n: 16, ms: 3360, loop: false, lag: 0.04,
    pose: (ph) => {
      const up = track(ph, [[0, 0], [0.1, 1, "io"], [0.14, 1], [0.24, 0, "io"], [0.8, 0], [0.9, 1, "io"], [0.94, 1], [1, 0, "io"]]);
      const w = clamp((ph - 0.24) / 0.56, 0, 1), on = bump(ph, 0.16, 0.88) > 0 ? 1 : 0, wr = ph > 0.24 && ph < 0.8 ? 1 : 0;
      // three lines: the nib runs out along each, hops back, a tap at each end
      const line = (w * 3) % 1, d = wr ? -1.6 + 3.4 * line : 0, lift = wr ? 0.9 * Math.abs(Math.sin(w * 3 * Math.PI * 4)) * 0.6 : 0;
      const down = track(ph, [[0, 0], [0.14, 0], [0.26, 1, "io"], [0.78, 1], [0.9, 0, "io"], [1, 0]]);
      return clerk({ lean: 0.05 * down - 0.03 * up, hy: 1.1 * down - 0.4 * up, hx: 0.5 * down, rise: 0.4 * up, book: -0.3 - 0.06 * down, q: ph > 0.12 && ph < 0.92 ? 1 : 0, _on: on },
        (s) => mixA(aim(s.sN, PAGE_AT(s, d, lift)), aim(s.sN, HAT_AT(s)), up));
    },
  },
  // the works pays out: he looks up from the book and throws a hand up to catch the coin it
  // tosses him (`hit`: the catch), weighs it a moment, brings it down to the page
  pay: {
    n: 14, ms: 1700, loop: false, lag: 0.05, hit: 0.42,
    pose: (ph) => {
      const up = track(ph, [[0, 0], [0.12, -0.08, "io"], [0.36, 1.06, "out"], [0.42, 1, "io"], [0.7, 0.9, "io"], [0.92, 0, "io"], [1, 0]]);
      const give = track(ph, [[0, 0], [0.42, 0], [0.5, 2.4, "out"], [0.68, 1.2, "io"], [0.9, 0, "io"], [1, 0]]);
      const dip = bump(ph, 0, 0.2), u = clamp(up, 0, 1);
      return clerk({ rise: 1.3 * u, lean: 0.05 * dip - 0.08 * u, hy: 0.8 * dip - 1.4 * u, hx: -0.4 * u, drop: 0.7 * dip + 0.4 * bump(ph, 0.42, 0.6), rx: -0.5 * u, twist: 0.8 * u, book: -0.3 + 0.12 * u },
        (s) => mixA(aim(s.sN, PAGE_AT(s)), aim(s.sN, UP_AT(s, give)), up));
    },
  },
  // ---- the watchman ----
  // standing easy: a breath, his weight easing, the shut glass at his belt
  watch: {
    n: 8, ms: 2600, loop: true, lag: 0.1,
    pose: (ph) => { const b = 0.5 - 0.5 * Math.cos(ph * TAU), b2 = Math.sin(ph * TAU - 0.9); return watchman({ rise: 0.9 * b, rx: -0.9 * b, drop: 0.3 * b, sway: b2 * 0.8, gsw: 0.1 * b2, blink: ph > 0.4 && ph < 0.54 ? 1 : 0 }); },
  },
  // a look out: he leans to it, the far hand up to shade his eyes at the brim
  glance: {
    n: 12, ms: 1620, loop: false, lag: 0.05,
    pose: (ph) => { const s = track(ph, [[0, 0], [0.22, 1, "out"], [0.76, 1], [1, 0, "io"]]), pk = bump(ph, 0.3, 0.76); return watchman({ lean: 0.07 * s, rx: 0.9 * s, hx: 0.7 * s, hy: -0.5 * s, rise: 0.4 * pk }, 0, -0.04, s); },
  },
  // the glass: up to his eye, held on the river, a sweep up the far bank, level, down
  glass: {
    n: 14, ms: 2200, loop: false, lag: 0.04,
    pose: (ph) => {
      const u = track(ph, [[0, 0], [0.05, -0.06, "io"], [0.18, 1, "out"], [0.86, 1], [1, 0, "io"]]);
      const sw = track(ph, [[0, 0], [0.42, 0], [0.56, 1, "io"], [0.72, 1], [0.84, 0, "io"], [1, 0]]), c = clamp(u, 0, 1);
      return watchman({ lean: 0.05 * c - 0.1 * sw * c, rx: 0.7 * c - 0.5 * sw, hx: 0.4 * c, hy: -1.2 * sw * c, rise: 0.5 * c + 0.5 * sw, drop: 0.4 * bump(ph, 0, 0.14) }, c, -0.04 - 0.3 * sw);
    },
  },
};
// where in `flip` the coin leaves the thumb and where it lands again (clip phase)
export const FLIP_UP = 0.16, FLIP_DOWN = 0.8;
