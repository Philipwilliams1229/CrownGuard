// ============ FIGURE: the Kraken's body (game type `kraken`) ============
// The sea-beast's great lumpy mantle and head rising out of the water offshore: plum-red hide
// mottled dark with pale spots, two huge gold eyes under hard slanting lids, a black parrot's
// beak (cream at the hook) that opens to a dark maw when it ROARS, four arm-roots curling out
// of the water on either side with pale, sucker-studded inner faces. Look c, bold. THE ANCHOR IS
// THE WATERLINE: (0, 0) is the surface; whatever is below it is repainted dim and blue
// (`underwater` from fig-seaserpent.js) and foam marks the cut. Facing +x (it faces the shore
// a quarter-turned; the eyes sit on the front of the head).
// The tentacles that seize and squeeze are a type of their own: fig-krakenarm.js.
// Clips (the game asks for the string frames by name, e.g. "rise.2"):
//   walk    the breathing idle (8 frames, the arms stirring, the eyes drifting)
//   attack  watch, rear, ROAR (at 0.55), settle: the game runs it while any arm strikes
//   rise    4 frames, coming up out of the deep (the body sunk, then lifting, water streaming)
//   sink    4 frames, going down (the death or a dive), bubbles
//   deep    4 frames, the beast SEEN FROM ABOVE under the water as it roams: a dim shape, the sac
//           leading, eight arms streaming behind, a vee of wake. Drawn with no outline: the
//           board should lay it at about 0.4 alpha (it is not solid) and NOT underwater-recolour it.
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys } from "./rig.js";
import { underwater } from "./fig-seaserpent.js";

export const KCOL = mat("#41606e", { contrast: 1.3 }), KBELLY = mat("#a9c2c6", { contrast: 1.1 }), KDARK = mat("#2c3150", { contrast: 1.2 }), KBONE = mat("#b9b19a", { contrast: 1.1 }), KVIO = mat("#5a5878", { contrast: 1.2 });
const BEAK = mat("#1c1e2a", { contrast: 1.3 }), BEAKT = mat("#d8d2b8"), BEAKG = mat("#4a5060");
const EYEG = flat("#ecdc8c", { emis: true, line: "#6a5a20" }), EYED = flat("#b8a455"), PUP = flat("#1a1018"), GLINT = flat("#fff2b0", { emis: true });
const MAW = flat("#141824"), TONGUE = flat("#4a3a58");
const FOAM = flat("#f2fbff", { emis: true, line: "#7fb4cc" }), FOAM2 = flat("#cfe8f2", { emis: true, line: "#7fb4cc" });

export const BOX = { w: 176, h: 162, ox: 88, oy: 118 };
export const BONES = HUMAN;                 // unused
const cap = (px, a, b, ra, rb, m, z, o) => px.capsule(a[0], a[1], ra, b[0], b[1], rb, m, z, o);

// one tentacle: from base along ang0 (radians, -PI/2 straight up), turning by `curl` over its
// length (more toward the tip as `pow` rises). `floor` lays any part below the ground along it.
export const tentLine = (base, ang0, curl, pow, len, o = {}) => {
  const N = 16, seg = len / N, pts = [base.slice()];
  let [x, y] = base;
  for (let i = 1; i <= N; i++) {
    const a = ang0 + curl * Math.pow(i / N, pow);
    x += Math.cos(a) * seg; y += Math.sin(a) * seg;
    if (o.floor !== undefined && y > o.floor) y = o.floor;
    pts.push([x, y]);
  }
  return pts;
};
// the arm drawn on its points: a tube, a pale inner face on the side of the turn with a row of suckers, mottling out
export const tentacle = (px, pts, curl, w0, z, o = {}) => {
  const N = pts.length - 1, side = curl >= 0 ? 1 : -1, bias = o.bias || 0;
  const rs = pts.map((_, i) => w0 * Math.pow(1 - i / N, 0.85) + 1.1);
  const nrm = (i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l * side, dx / l * side]; };
  px.part();
  for (let i = 0; i < N; i++) cap(px, pts[i], pts[i + 1], rs[i], rs[i + 1], KCOL, z, { bias, cast: 1 });
  px.part();
  for (let i = 1; i < N; i++) { const n = nrm(i), n1 = nrm(i + 1), a = [pts[i][0] + n[0] * rs[i] * 0.52, pts[i][1] + n[1] * rs[i] * 0.52], b = [pts[i + 1][0] + n1[0] * rs[i + 1] * 0.52, pts[i + 1][1] + n1[1] * rs[i + 1] * 0.52]; cap(px, a, b, rs[i] * 0.4, rs[i + 1] * 0.4, KBELLY, z + 0.1, { bias: bias - 0.5 }); }
  for (let i = 3; i < N; i++) {
    const n = nrm(i), r = rs[i], q = [pts[i][0] + n[0] * r * 0.62, pts[i][1] + n[1] * r * 0.62];
    px.part();
    px.ellipse(q[0], q[1], Math.max(1, r * 0.2), Math.max(0.8, r * 0.17), KBONE, z + 0.2, { bias: bias + 1.2, cast: 0 });
    if (r > 3) px.dot(q[0], q[1], KDARK, z + 0.25, { noLine: true });
  }
  for (let i = 2; i < N - 1; i += 2) { const n = nrm(i), q = [pts[i][0] - n[0] * rs[i] * 0.4, pts[i][1] - n[1] * rs[i] * 0.4]; px.dot(q[0], q[1], KDARK, z + 0.12, { noLine: true, bias: 0 }); px.dot(q[0] + 1, q[1], KCOL, z + 0.12, { noLine: true, bias: -1.5 }); }
};

const P0 = { h: 92, up: 0, dep: 0, arms: 0.5, look: 0, narrow: 0.3, roar: 0, tilt: 0, fx: "" };
const EXTRA = {
  rise: (f) => ({ ...P0, arms: 0, dep: [88, 56, 28, 8][f], fx: f < 3 ? "bulge" : "drip" }),
  sink: (f) => ({ ...P0, arms: -0.2, dep: [12, 36, 64, 96][f], tilt: -0.04 * (f + 1), fx: "bubbles" }),
};
const WALK = (ph) => { const s = Math.sin(ph * Math.PI * 2); return { ...P0, h: 92 + 1.4 * (0.5 + 0.5 * s), arms: 0.7 + 0.18 * s, look: Math.sin(ph * Math.PI * 2 - 0.8) * 0.6 * 2, narrow: 0.3 }; };

export const draw = (px, F) => {
  const k = F.sk.p;
  if (k.deep !== undefined) { deep(px, k.deep); return {}; }
  const dep = k.dep, up = k.up || 0, H = k.h + up;
  const Y = (y) => y + dep - up * 0.2;
  const ar = k.arms;
  const ARMS_FAR = [[-30, -2.5 + ar * 0.25, -2.4 + ar * 0.6, 44 + ar * 8, 11], [30, -0.65 - ar * 0.25, 2.4 - ar * 0.6, 44 + ar * 8, 11]];
  const ARMS_NEAR = [[-19, -2.9 + ar * 0.3, -2.6 + ar * 0.8, 40 + ar * 8, 12], [21, -0.25 - ar * 0.3, 2.6 - ar * 0.8, 40 + ar * 8, 12]];
  for (const [x, a, cu, l, w] of ARMS_FAR) tentacle(px, tentLine([x, Y(4)], a, cu, 2.2, l), cu, w, 1, { bias: -1.2 });

  // the mantle: a smooth tapering hood leaning back from the head, barnacled and scarred
  px.part(); const mid = px._pid;
  const m0 = [-4, Y(-26)], m1 = [-20, Y(-H * 0.55)], m2 = [-32, Y(-H * 0.86)];
  cap(px, m0, m1, 27, 19, KCOL, 4);
  cap(px, m1, m2, 19, 12, KCOL, 4); px.ellipse(m2[0] + 2, m2[1] + 3, 13, 11, KCOL, 4);
  px.ellipse(4, Y(-22), 31, 21, KCOL, 4.1);
  // a paler wet underside to the head, a violet-grey wash down the back of the hood
  px.part(); px.ellipse(4, Y(-8), 22, 8, KBELLY, 4.3, { cast: 0, bias: -0.5 });
  px.part(); px.ellipse(-24, Y(-H * 0.55), 6, H * 0.22, KVIO, 4.2, { cast: 0, bias: -0.5, rot: 0.15 });
  for (let i = 0; i < 5; i++) px.toneLine(-8 - i * 3, Y(-30 - i * 12), -16 - i * 2, Y(-26 - i * 12), -1, mid);
  // scars: pale slashes; barnacles: little bone-coloured clusters
  for (const [x, y, dx, dy] of [[-12, -46, 9, 8], [-20, -66, 6, 9], [-6, -62, 6, 5]]) { px.part(); px.line(x, Y(y), x + dx, Y(y + dy), KBELLY, 4.4, { noLine: true, bias: 0.5 }); }
  for (const [x, y] of [[-26, -50], [-20, -78], [-30, -66], [-8, -40], [-17, -30], [14, -34]]) { px.part(); px.ellipse(x, Y(y), 2.2, 1.8, KBONE, 4.5, { cast: 0 }); px.dot(x + 2.6, Y(y) + 1, KBONE, 4.5, { noLine: true }); px.dot(x - 1, Y(y) - 2, KBONE, 4.5, { noLine: true }); }

  // the eyes: big, round, pale gold, a horizontal slit pupil, low on the mantle
  for (const [ex, ey, r, ff] of [[-13, -22, 7.2, 0.8], [18, -21, 8.4, 1]]) {
    const ey2 = Y(ey);
    px.part();
    px.ellipse(ex, ey2, r + 1.6, r + 1.6, KDARK, 5, { floor: 1 });
    px.ellipse(ex, ey2, r, r, EYEG, 5.2);
    px.ellipse(ex, ey2 + r * 0.5, r * 0.8, r * 0.4, EYED, 5.25, { cast: 0 });
    px.rect(ex - r * 0.8 + k.look * ff * 0.4, ey2 - 1, r * 1.6, 2.2, PUP, 5.3);
    px.dot(ex - r * 0.45, ey2 - r * 0.45, GLINT, 5.35, { noLine: true });
  }
  // the beak: a black parrot's hook, cream at the tip; opened, a dark maw
  const ro = k.roar, bx = 3, by = Y(-9);
  px.part();
  if (ro > 0.05) { px.ellipse(bx + 1, by + 3 * ro + 3, 9, 2 + 6.5 * ro, MAW, 5.8, { floor: 1 }); px.ellipse(bx + 1, by + 6 * ro + 4, 4.6, 3 * ro, TONGUE, 5.85); }
  px.part();
  px.poly([[bx - 8, by - 4], [bx + 1, by - 6], [bx + 7, by - 3], [bx + 8, by + 1], [bx + 3, by + 5 - ro * 1.6], [bx + 1, by + 1 - ro], [bx - 5, by + 0.4]], BEAK, 6, { round: 0.7 });
  px.poly([[bx - 4, by - 4.2], [bx + 4, by - 4.4], [bx + 1, by - 2.4]], BEAKG, 6.1, { fix: 3 });
  px.poly([[bx + 5, by + 0.4 - ro * 1.2], [bx + 7.6, by + 0.4], [bx + 3, by + 5.4 - ro * 1.8]], BEAKT, 6.2, { fix: 3 });
  if (ro > 0.05) px.poly([[bx - 6, by + 3 + ro * 8], [bx + 6, by + 2.6 + ro * 8], [bx + 4, by + 6.6 + ro * 8], [bx - 3.6, by + 6.4 + ro * 8]], BEAK, 6, { round: 0.6 });

  for (const [x, a, cu, l, w] of ARMS_NEAR) tentacle(px, tentLine([x, Y(4)], a, cu, 2.2, l), cu, w, 7);
  // the sea heaving round it
  underwater(px);
  const wide = (a, b, y, m) => { for (let x = a; x <= b; x++) px.dot(x, y, m, 41, { noLine: true }); };
  if (dep < 80) { wide(-38, 40, -1.5, FOAM2); wide(-44, 46, 2.5, FOAM2); }
  if (k.fx === "bulge") { wide(-30, 30, -2.5, FOAM2); for (let i = 0; i < 9; i++) px.dot(-26 + i * 6.5, -4 - (i * 5) % 6, i % 2 ? FOAM : FOAM2, 42, { noLine: true }); }
  if (k.fx === "drip") for (const [x, y] of [[-20, -40], [-8, -72], [12, -60], [24, -28], [-28, -16]]) { px.dot(x, y, FOAM, 42, { noLine: true }); px.dot(x, y + 1, FOAM2, 42, { noLine: true }); }
  if (k.fx === "bubbles") for (const [x, y] of [[-16, -3], [-4, -6], [10, -2.6], [20, -5], [2, -10], [-24, -8]]) px.ellipse(x, y, 1.6, 1.4, FOAM, 42, { noLine: true });
  if (k.fx === "spray") for (const sx of [-24, 26]) for (let i = 0; i < 8; i++) { const a = -0.4 - i * 0.35; px.dot(sx + Math.cos(a) * (8 + i) * (sx < 0 ? -1 : 1), -2 + Math.sin(a) * (10 + i * 1.5), i % 2 ? FOAM : FOAM2, 42, { noLine: true }); }
  return {};
};

// the beast seen from above, swimming under dark water (dim, no outline); +x the way it swims
const DW = mat("#5e8a98", { contrast: 0.6 }), DB = mat("#1c0a18", { contrast: 0.5 }), DP = mat("#4a1e3a", { contrast: 0.5 });
const deep = (px, f) => {
  const ph = (f / 4) * Math.PI * 2, o = { noLine: true, cast: 0 };
  px.part(); px.ellipse(16, 0, 38, 17, DW, 1, o);
  for (let i = 0; i < 8; i++) {
    const row = (i % 4) - 1.5, pts = [];
    for (let j = 0; j <= 10; j++) { const u = j / 10; pts.push([-12 - u * 68, row * (8.4 + u * 4.4) + Math.sin(ph + u * 5 + i) * (2 + u * 5)]); }
    px.part();
    for (let j = 0; j < 10; j++) cap(px, pts[j], pts[j + 1], 6.8 * (1 - j / 11) + 1.2, 6.8 * (1 - (j + 1) / 11) + 1.2, DB, 2, o);
  }
  px.part();
  px.poly([[-20, -12], [8, -18], [32, -14], [44, -4], [44, 6], [28, 14], [4, 17], [-20, 13], [-28, 0]], DB, 3, { ...o, round: 0.4 });
  px.poly([[-8, -8], [16, -12], [32, -8], [36, 0], [20, 4], [-4, 2]], DP, 3.2, { ...o, round: 0.4 });
  for (const y of [-11, 11.4]) px.rect(-7, y - 1, 4, 2, EYEG, 4, o);
  for (let i = 0; i < 6; i++) { const x = 44 - i * 13, off = 6 + i * 5.2, w = (i + f) % 2 ? 4 : 6; for (const s of [-1, 1]) for (let d = 0; d < w; d++) px.dot(x - d, s * off, FOAM, 5, o); }
  px.rect(43, -3 + (f % 2), 4, 1, FOAM, 5, o); px.rect(45, 1, 3, 1, FOAM, 5, o);
};

const TAU = Math.PI * 2;
const strip = (name, ms) => ({ n: 4, ms, loop: false, lag: 0.1, pose: (ph) => EXTRA[name](Math.round(ph * 3)) });
export const CLIPS = {
  walk: { n: 8, ms: 2400, loop: true, lag: 0.1, pose: (ph) => WALK(ph) },
  attack: {
    n: 8, ms: 1200, loop: false, lag: 0.08,
    pose: (ph) => sampleKeys([
      { t: 0, p: { ...P0, narrow: 1, arms: 0.6 } },
      { t: 0.3, e: "out", p: { ...P0, h: 98, up: 6, arms: 0.9, narrow: 1 } },
      { t: 0.55, e: "in3", p: { ...P0, h: 100, up: 8, arms: 1.2, roar: 1, narrow: 0.4, fx: "spray" } },
      { t: 0.8, e: "out", p: { ...P0, h: 94, up: 2, arms: 0.5, roar: 0.25 } },
      { t: 1, e: "io", p: { ...P0, narrow: 1, arms: 0.6 } },
    ], ph),
  },
  rise: strip("rise", 1200), sink: strip("sink", 1200),
  deep: { n: 4, ms: 1300, loop: false, lag: 0.1, pose: (ph) => ({ ...P0, deep: Math.round(ph * 3) }) },
};
