// ============ FIGURE: the Grave Amalgam (the Hollow Court's stitched heap, game type `amalgam`) ============
// Many dead things sewn into one slow tide of a body: a mound of patched hide (grey-green, a pale
// corpse across the flank, a bruised one on top, a rag of violet shroud), black thread seams with iron
// staples across the worst, a torn wound in the flank with two ribs in it, drowned weed draped over
// the top. Three faces sit on it (the leader at the front, one on top, one lolling off the back) with
// witch-fire in the sockets, a ghoul's arm claws out of the back and another hangs out of the belly, the
// stump legs shuffle, and ONE GREAT ARM, two bundled and banded in iron, reaches ahead, plants and hauls
// the mound on. About 46 px to the crown of the heap, wide. Facing +x, a quarter turned.
// A heap, not a man: the biped skeleton is unused, each pose is a few numbers read off `F.sk.p`:
// bob / dx / tilt (the mass), hand [x, y] (the great hand, from the feet), legA / legB (stump lifts 0..1),
// loll (the heads' phase), jaw, claw (the great hand's fingers spread).
// Clips: idle (a slow heave), walk (the haul, 8 frames), attack (reared back, the great arm over the heads,
// the whole mound thrown forward behind the blow).
import { mat, flat } from "./pix.js";
import { sampleKeys, HUMAN } from "./rig.js";

const HIDE = mat("#6e7c64"), PALE = mat("#a4a88a"), BRUISE = mat("#6a5670", { contrast: 0.95 }), RAG = mat("#3e3448", { contrast: 0.9 });
const WEED = mat("#4a5a50"), IRON = mat("#3e4048", { contrast: 1.2 }), CLAW = mat("#d8d0b4"), HAIR = mat("#b4a684"), WOUND = flat("#2a1820"), RIB = mat("#d4cdb4");
const THREAD = flat("#c4b890"), STAPLE = flat("#8a8c94"), SOCK = flat("#15121a"), EYE = flat("#7ce0b8", { emis: true }), MOUTH = flat("#2c1a22"), TOOTH = flat("#ece0c4");
const TAU = Math.PI * 2;

// The leader's face, facing +x, a quarter turned: F flesh (f a tone down), h stringy hair, e the sunken
// socket and E the witch-fire in it, N the nose holes, T teeth, M the mouth's dark, P the pale jaw.
const HEAD = [
  "...hhhhhh....",
  "..hhFFFFFF...",
  ".hhFFFFFFFF..",
  ".hFFFFFeeFFF.",
  ".hFFFFFeEFFN.",
  "..FFFFFFFFFN.",
  "..fFFFFFFFPP.",
  "..fFFTMTMTT..",
  "...fPPPPPPP..",
  "....fffPPP...",
];
const WIDE = HEAD.map((r, i) => ({ 7: "..fFFTMMMMMT.", 8: "...fPTMMMMTP.", 9: "....fPTTTPP.." })[i] ?? r).concat(["....fPPPPP..."]);
// the lesser faces, a size down
const SMALL = [
  "..hhhhh..",
  ".hFFFFFF.",
  ".hFFeEFFN",
  ".fFFFFFFN",
  "..fFTMTT.",
  "...fPPP..",
];
const SMALLW = SMALL.map((r, i) => ({ 4: "..fFTMMMT.", 5: "...fPMMT.." })[i] ?? r);
const lg = (flesh) => ({ F: { m: flesh }, f: { m: flesh, bias: -1 }, h: { m: HAIR }, P: { m: PALE }, e: { m: SOCK }, E: { m: EYE }, N: { m: SOCK }, T: { m: TOOTH, fix: 4 }, M: { m: MOUTH } });
const LEG_A = lg(HIDE), LEG_B = lg(BRUISE), LEG_L = lg(mat("#94a082"));

export const BOX = { w: 104, h: 74, ox: 42, oy: 62 };
export const BONES = HUMAN;                 // unused: a heap poses itself

const rot = ([x, y], [cx, cy], a) => { const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const ik2 = (a, t, l1, l2, side) => {
  let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1e-6;
  const mx = (l1 + l2) * 0.999; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
  const q = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - q * q)), ux = dx / d, uy = dy / d;
  return [a[0] + ux * q - uy * h * side, a[1] + uy * q + ux * h * side];
};

// the heap drawn a quarter bigger: a scaling surface (every coordinate and radius by k)
const big = (px, k) => ({
  part: () => px.part(), get _pid() { return px._pid; },
  capsule: (ax, ay, ra, bx, by, rb, m, z, o) => px.capsule(ax * k, ay * k, ra * k, bx * k, by * k, rb * k, m, z, o),
  ellipse: (x, y, rx, ry, m, z, o) => px.ellipse(x * k, y * k, rx * k, ry * k, m, z, o),
  poly: (pts, m, z, o) => px.poly(pts.map(([x, y]) => [x * k, y * k]), m, z, o),
  line: (ax, ay, bx, by, m, z, o) => px.line(ax * k, ay * k, bx * k, by * k, m, z, o),
  dot: (x, y, m, z, o) => px.dot(x * k, y * k, m, z, o),
  body: (id) => px.body(id),
  limb: (pts, radii, m, z, o) => px.limb(pts.map(([x, y]) => [x * k, y * k]), radii.map((r) => r * k), m, z, o),
  toneLine: (ax, ay, bx, by, d, pid) => px.toneLine(ax * k, ay * k, bx * k, by * k, d, pid),
});
const K = 1.25;
export const draw = (px0, { sk, lag1, ph }, o = {}) => {
  const px = big(px0, K);
  const p = sk.p, b = Math.round(p.bob || 0), dx = p.dx || 0, tilt = p.tilt || 0, lp = (p.loll || 0) * TAU, jaw = p.jaw || 0, hand = p.hand || [16, -1.6];
  const M = (x, y) => { const r = rot([x, y], [0, -6], tilt); return [r[0] + dx, r[1] + b]; };
  const wav = Math.sin(lp), claw = p.claw || 0;

  // ---- far side first: a ghoul arm clawing out of the back, a stump leg, a thin arm under the belly
  const clawHand = (h, z, bias, ang = 0) => {
    px.ellipse(h[0] + 0.6, h[1] + 0.4, 1.8, 1.6, HIDE, z, { bias });
    for (const [cx, cy] of [[2.4, -1.4], [3, 0.2], [2.4, 1.8]]) px.line(h[0] + 1, h[1] + 0.4, h[0] + cx + 1 + ang, h[1] + cy + 0.4, CLAW, z + 0.05, { fix: 3, bias });
  };
  {
    const s0 = M(-7, -22), e0 = M(-11.5, -28 + wav), h0 = M(-13 + wav, -32.5 + wav * 1.5);
    px.body(1);
    px.limb([s0, e0, h0], [2.2, 1.7, 1.3], HIDE, 1, { bias: -1 });
    clawHand(h0, 1.1, -1, -1.4);
    px.body(0);
  }
  const stump = (hip, lift, m, w, z, bias) => {
    const foot = [hip[0] + 1.0 + lift * 2.4, -1.2 - lift * 3.2], knee = [hip[0] + 1.4 + lift, (hip[1] + foot[1]) * 0.5 - lift * 1.6];
    px.body(1);
    px.limb([hip, knee, foot], [w, w * 0.88, w * 0.8], m, z, { bias, weld: 2, weldRoot: 3 });
    px.ellipse(foot[0] + 1.2, foot[1] + 0.2, w * 0.95, 1.3, m, z + 0.02, { bias, weld: 2 });
    px.body(0);
    for (const t of [0, 1.6]) px.dot(foot[0] + 2.8 + t * 0.6, foot[1] + 0.4, CLAW, z + 0.05, { fix: 3 });
  };
  stump(M(-4, -8), p.legB || 0, mix2(HIDE), 2.3, 2, -1);
  { // the far drag arm under the belly, pawing
    const s1 = M(3, -9), pw = Math.sin(lp + 1.5) * 1.4, h1 = [8 + dx + pw * 1.5, -1.4], e1 = [6.4 + dx + pw, -5];
    px.body(1);
    px.limb([s1, e1, h1], [1.5, 1.2, 1.0], HIDE, 1.5, { bias: -1 });
    clawHand([h1[0] - 0.4, h1[1] - 0.8], 1.6, -1);
    px.body(0);
  }

  // ---- the mound: several bodies' worth of hide, patched, stitched and stapled
  const mound = [M(-14, -7), M(-15.5, -13), M(-14, -19.5), M(-9.5, -24), M(-4, -26.5), M(1.5, -28), M(7, -26.5), M(11, -23), M(13.8, -18.4), M(14.8, -13), M(12.6, -8.4), M(6, -5), M(0, -4.4), M(-7, -4.8)];
  const mid = px.body(1);
  px.poly(mound, HIDE, 4, { round: 0.85, floor: 1 });
  // a pale corpse across the flank, a bruised one on top, a rag at the front
  px.part();
  px.poly([M(-14, -12), M(-9, -15.6), M(-2, -14.4), M(0.4, -9.6), M(-1.4, -5.4), M(-8, -5)], PALE, 4.1, { round: 0.8, floor: 1, wrap: true });
  px.part();
  px.poly([M(-7, -26), M(1, -28), M(6, -24.4), M(3.4, -20), M(-4, -19.4), M(-9, -22.5)], BRUISE, 4.1, { round: 0.8, floor: 1, wrap: true });
  px.part();
  px.poly([M(8, -20), M(14.4, -17), M(14.6, -9), M(11, -7), M(10.2, -10.2), M(9.2, -8), M(8.2, -11), M(7, -9.4), M(6.6, -14)], RAG, 4.1, { round: 0.7, floor: 1, wrap: true });
  // the torn seam in the flank: a dark wound, a puckered lip, two pale ribs in it
  px.part();
  px.poly([M(-2, -16.4), M(-0.2, -17.6), M(1.4, -17), M(3, -18.2), M(5, -16.6), M(3.6, -15.4), M(2.4, -14), M(1, -14.8), M(-0.6, -14.2)], WOUND, 4.2, { noLine: true, wrap: true });
  px.line(...M(0.2, -17.1), ...M(-0.1, -14.8), RIB, 4.25, { fix: 3 }); px.line(...M(2.6, -17.6), ...M(2.2, -14.6), RIB, 4.25, { fix: 3 });
  // the seams, and iron staples across the worst of them
  px.body(0); px.part();
  const seam = (pts) => { for (let i = 0; i + 1 < pts.length; i++) { const a = M(...pts[i]), c = M(...pts[i + 1]); for (let t = 0; t < 1; t += 0.34) px.dot(a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, THREAD, 4.5, { noLine: true }); } };
  seam([[-13, -12], [-9, -15.6], [-2, -14.4], [0.4, -9.6], [-1.4, -5.4]]);
  seam([[-8.6, -22.4], [-4, -19.4], [3.4, -20], [6, -24.4]]);
  seam([[6.6, -14], [8, -20], [12, -22.6]]);
  for (const [x, y] of [[-6.6, -16.6], [2.4, -20.6], [7.4, -17], [-10.4, -13.4]]) { const m = M(x, y); px.dot(m[0], m[1], STAPLE, 4.55, { noLine: true }); px.dot(m[0] + 1, m[1], STAPLE, 4.55, { noLine: true }); }
  // weed and a rag draped over the top, dripping
  px.part();
  px.capsule(...M(-11, -20.6), 0.9, ...M(-6, -24.6), 0.8, WEED, 4.7, { floor: 1 }); px.capsule(...M(-6, -24.6), 0.8, ...M(-1, -26.6), 0.8, WEED, 4.7, { floor: 1 }); px.capsule(...M(-1, -26.6), 0.8, ...M(4, -26), 0.7, WEED, 4.7, { floor: 1 });
  px.capsule(...M(-10.6, -20.4), 0.8, ...M(-12.6, -14 + wav * 0.5), 0.6, WEED, 4.7, { floor: 1 });
  px.capsule(...M(3.4, -26), 0.7, ...M(4.8, -19.4 + wav * 0.4), 0.5, WEED, 4.7, { floor: 1 });

  // ---- the heads: one lolling off the back, one on top, the leader at the front (stamped whole pixels)
  const head = (grid, leg, pos, ax, ay, z) => { px0.part(); px0.stamp(grid, Math.round(pos[0] * K), Math.round(pos[1] * K), leg, z, { ax, ay, ball: [grid[0].length / 2, grid.length / 2, grid[0].length / 2 + 1, grid.length / 2 + 1], cast: 1 }); };
  const fz = jaw > 0.4;
  head(SMALL, LEG_A, M(-12.6 + Math.sin(lp) * 0.4, -20.4 + Math.cos(lp) * 0.3), 4, 5, 5);
  head(fz ? SMALLW : SMALL, LEG_B, M(-1.6, -27 + Math.sin(lp + 2) * 0.3), 4, 5, 5.2);
  const lead = M(12.2, -20.4);
  px.body(1);
  px.limb([M(8, -17.4), [lead[0] - 0.6, lead[1] + 1.2]], [3.2, 2.6], HIDE, 4.8, { weld: 3, weldRoot: 4 });
  px.body(0);
  head(jaw > 0.55 ? WIDE : HEAD, LEG_L, [lead[0] + 1.4, lead[1] + (jaw > 0.55 ? 0 : 0)], 7, 6, 6);

  // ---- the great arm, bundled from two, planted ahead and hauling
  {
    const sh = M(10, -14.4), hd = [hand[0], Math.min(hand[1], -1.6)], fold = hd[1] < -20 ? -1 : 1;
    const el = ik2(sh, hd, 10, 10, fold);
    px.body(1);
    px.limb([sh, el, hd], [3.6, 3.0, 2.2], HIDE, 8, { weld: 3, weldRoot: 5 });
    px.body(0);
    // a second, thinner arm bound along it, and the iron bands that hold them
    px.part();
    const a1 = mix(sh, el, 0.25), a2 = mix(el, hd, 0.8);
    px.capsule(a1[0] + 0.6, a1[1] + 1, 1.2, a2[0] + 0.6, a2[1] + 1, 0.9, PALE, 8.1, { bias: 0 });
    for (const t of [0.5, 1.45]) {
      const c = t < 1 ? mix(sh, el, t) : mix(el, hd, t - 1), tgt = t < 1 ? el : hd, from = t < 1 ? sh : el, ln = Math.hypot(tgt[0] - from[0], tgt[1] - from[1]) || 1, nx = -(tgt[1] - from[1]) / ln, ny = (tgt[0] - from[0]) / ln;
      px.part(); px.line(c[0] - nx * 2.8, c[1] - ny * 2.8, c[0] + nx * 2.8, c[1] + ny * 2.8, IRON, 8.2, { fix: 1 });
      px.line(c[0] - nx * 2.8 + 0.6, c[1] - ny * 2.8, c[0] + nx * 2.8 + 0.6, c[1] + ny * 2.8, IRON, 8.2, { fix: 2 });
    }
    px.body(1);
    px.ellipse(el[0] - 0.3, el[1] - 0.3, 2.2, 2.0, HIDE, 8.3, { weld: 3 });
    // the great hand: a heavy palm and long claws, spread when it grips
    px.ellipse(hd[0] + 0.8, hd[1] + 0.2, 2.8, 2.5, HIDE, 8.4, { weld: 2 });
    px.body(0);
    const sp = 0.5 + 0.5 * claw;
    for (const [cx, cy] of [[3.6, -2.4 * sp - 0.4], [4.4, 0], [3.8, 2.4 * sp + 0.4], [2.2, 3.8 * sp + 0.6]]) px.line(hd[0] + 1.6, hd[1] + 0.4, hd[0] + 1.6 + cx + 1, hd[1] + 0.4 + cy, CLAW, 8.45, { fix: 3 });
  }
  // ---- the near stump legs, and a ghoul arm hanging out of the belly, clawing
  stump(M(-8.4, -7), p.legA || 0, HIDE, 2.7, 9, 0);
  stump(M(2.4, -6.4), p.legB2 || 0, HIDE, 2.3, 9, 0);
  {
    const hg = jaw > 0.4 ? 1 : Math.sin(lp + 3), s2 = M(-2, -10), h2 = [-0.5 + dx + hg * 1.4 + 1.4, -1.6], e2 = [-0.5 + dx + hg, -5.4];
    px.body(1);
    px.limb([s2, e2, h2], [1.7, 1.3, 1.1], HIDE, 9.4, { weld: 2, weldRoot: 3 });
    clawHand([h2[0] - 0.4, h2[1] - 0.8], 9.5, 0);
    px.body(0);
  }
  const eye = M(12.2 + 2.4, -21.6);
  return { light: { x: eye[0] * K, y: eye[1] * K, r: 14, col: "#7ce0b8", k: 0.16 + 0.05 * Math.sin(lp) }, feet: [dx * K, 0] };
};
const mix2 = (m) => m;
export const fx = () => {};

const HOLD = { bob: 0, dx: 0, tilt: 0, hand: [16.5, -1.6], legA: 0, legB: 0, legB2: 0, loll: 0, jaw: 0, claw: 0 };
// the great hand plants while the mound passes it, then swings on ahead
const haul = (q) => { const pl = 0.6; return q < pl ? [19 - 14 * (q / pl), -1.6] : [5 + 14 * (0.5 - 0.5 * Math.cos(((q - pl) / (1 - pl)) * Math.PI)), -1.6 - Math.sin(((q - pl) / (1 - pl)) * Math.PI) * 5]; };
export const CLIPS = {
  idle: {
    n: 8, ms: 2600, loop: true, lag: 0.12,
    pose: (ph) => { const s = Math.sin(ph * TAU); return { ...HOLD, bob: 0.4 * s, tilt: 0.01 * s, hand: [16.5, -1.6 - 0.4 * (0.5 - 0.5 * s)], loll: ph, jaw: 0.1 + 0.1 * Math.max(0, Math.sin(ph * TAU + 1)), claw: 0.3 + 0.3 * s }; },
  },
  walk: {
    n: 8, ms: 1100, loop: true, lag: 0.1,
    pose: (ph) => {
      const hnd = haul(ph);
      return { ...HOLD, bob: -0.6 * Math.abs(Math.sin(ph * TAU)), dx: 0.5 * Math.sin(ph * TAU), tilt: 0.03 * Math.sin(ph * TAU + 0.6), hand: hnd, legA: Math.max(0, Math.sin(ph * TAU - 0.4)), legB: Math.max(0, Math.sin(ph * TAU + 2.2)), legB2: Math.max(0, Math.sin(ph * TAU + 3.8)), loll: ph * 2 % 1, claw: hnd[1] < -2.5 ? 1 : 0.2 };
    },
  },
  // the slam: reared back with the great arm over the heads, then the whole mound thrown forward behind the blow
  attack: {
    n: 14, ms: 1100, loop: false, lag: 0.08,
    pose: (ph) => sampleKeys([
      { t: 0, p: HOLD },
      { t: 0.32, e: "out", p: { ...HOLD, bob: -1, dx: -1.6, tilt: -0.12, hand: [8, -35], loll: 0.25, jaw: 0.5, claw: 1 } },
      { t: 0.46, e: "io", p: { ...HOLD, bob: -1.4, dx: -2, tilt: -0.15, hand: [6, -37], loll: 0.3, jaw: 0.6, claw: 1 } },
      { t: 0.56, e: "in3", p: { ...HOLD, bob: 1, dx: 1.8, tilt: 0.13, hand: [22, -2], loll: 0.7, jaw: 1, claw: 1 } },
      { t: 0.7, e: "out", p: { ...HOLD, bob: 1.4, dx: 2.2, tilt: 0.15, hand: [23, -1.8], loll: 0.8, jaw: 1, claw: 1 } },
      { t: 0.9, e: "io", p: { ...HOLD, bob: 0.2, dx: 0.6, tilt: 0.04, hand: [18, -1.6], jaw: 0.3, claw: 0.4 } },
      { t: 1, e: "io", p: HOLD },
    ], ph),
  },
};
