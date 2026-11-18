// ============ FIGURE VIEWS: the Grave Amalgam from the FRONT and from BEHIND ============
// fig-amalgam.js (a heap, not a man) walking toward the camera (FRONT, s = +1) and away (BACK, s = -1).
// Same hide, pale flank, bruised crown, violet rag, thread seams, staples, weed, same faces and the iron-banded
// great arm, drawn in the side figure's final pixel size (its 1.25 scaling is baked in here). FRONT: the
// leader's face looks out of the heap, the great arm hangs in front on the screen LEFT and its fist plants
// and lifts (it comes toward us), the lesser face on top, a ghoul arm dangling from the belly, four stump
// legs shuffling at the bottom. BACK: the stitched back of the mound, the ghoul arm clawing out of it, the
// face that lolls off the back now looking at us, the top head's back. Clips are the side walk's own; the
// stump lifts and the haul come off the solved pose. Unflipped; one sun upper left; joint-kit hide limbs.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-amalgam.js";

const HIDE = mat("#6e7c64"), PALE = mat("#a4a88a"), BRUISE = mat("#6a5670", { contrast: 0.95 }), RAG = mat("#3e3448", { contrast: 0.9 });
const WEED = mat("#4a5a50"), IRON = mat("#3e4048", { contrast: 1.2 }), CLAW = mat("#d8d0b4"), HAIR = mat("#b4a684"), WOUND = flat("#2a1820"), RIB = mat("#d4cdb4");
const THREAD = flat("#c4b890"), STAPLE = flat("#8a8c94"), SOCK = flat("#15121a"), EYE = flat("#7ce0b8", { emis: true }), MOUTH = flat("#2c1a22"), TOOTH = flat("#ece0c4");
const TAU = Math.PI * 2;

// the leader face-on (F flesh, f shade, h stringy hair, P pale jaw, e socket, E witch-fire, N nose, T teeth, M mouth)
const FACE = [
  "....hhhhh....",
  "..hhhhhhhhh..",
  ".hhFFFFFFFhh.",
  ".hFFFFFFFFFh.",
  ".fFeeFFFeeFf.",
  ".fFeEFFFEeFf.",
  "..FFFFNFFFF..",
  "..fFFFNFFFf..",
  "..fFTMTMTFf..",
  "...fPPPPPf...",
  ".....PPP.....",
];
const SMALL_F = [
  "..hhhhh..",
  ".hFFFFFh.",
  ".heEFEeh.",
  ".fFFNFFf.",
  "..fTMTf..",
  "...fPf...",
];
// the back of a head: hair over the skull, a scrap of nape
const SMALL_B = [
  "..hhhhh..",
  ".hhhhhhhh",
  "hhhhhhhhh",
  "hhhhhhhh.",
  ".hhhhhhh.",
  "..fffff..",
];
for (const g of [FACE, SMALL_F, SMALL_B]) g.forEach((r) => { if (r.length !== g[0].length) throw new Error("amalgam-views: grid width"); });
const lg = (flesh) => ({ F: { m: flesh }, f: { m: flesh, bias: -1 }, h: { m: HAIR }, P: { m: PALE }, e: { m: SOCK }, E: { m: EYE }, N: { m: SOCK }, T: { m: TOOTH, fix: 4 }, M: { m: MOUTH } });
const LEG_L = lg(mat("#94a082")), LEG_A = lg(HIDE), LEG_B = lg(BRUISE);

const FWD = 0.5, K = 1.25;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const make = (s) => (px, F, o = {}) => {
  const rs = -s, ls = s;
  const { sk, ph } = F, p = sk.p, TL = p.loll * TAU || 0;
  const bob = Math.round((p.bob || 0) * K), dx = (p.dx || 0) * K, wav = Math.sin(TL), claw = p.claw || 0;
  const jaw = p.jaw || 0, hand = p.hand || [16.5, -1.6];
  const M = (x, y) => [x + dx, y + bob];

  // ---- far side first: the ghoul arm clawing out of the back (BACK: in front of the mound, reaching at us)
  const clawHand = (h, z, bias, ang = 0) => {
    px.ellipse(h[0] + 0.4, h[1] + 0.4, 2.2, 2.0, HIDE, z, { bias });
    for (const [cx, cy] of [[-1.8, 2.8], [0, 3.4], [1.8, 2.8]]) px.line(h[0] + cx * 0.5 + 0.4, h[1] + 1, h[0] + cx + ang + 0.4, h[1] + cy + 1.6, CLAW, z + 0.05, { fix: 3, bias });
  };

  // ---- the four stump legs, shuffling: each reaches toward us (FRONT) or away (BACK) as it lifts; the feet join the stump
  const stump = (x, lift, w, z, bias) => {
    const top = M(x, -9), foot = [x + dx * 0.6, -1.4 - lift * 3.4 + s * lift * -0.8];
    const knee = [x + dx * 0.8 + (x < 0 ? -1.1 : 1.1), (top[1] + foot[1]) / 2 - lift];
    px.body(1);
    px.limb([top, knee, foot], [w, w * 0.88, w * 0.82], HIDE, z, { bias, weld: 2, weldRoot: 3 });
    px.ellipse(foot[0], foot[1] + 0.6, w * 0.95, 1.5, HIDE, z + 0.02, { bias, weld: 2 });
    px.body(0);
    if (s > 0) for (const t of [-1.2, 0, 1.2]) px.dot(foot[0] + t, foot[1] + 1.7, CLAW, z + 0.05, { fix: 3 });
  };
  const la = p.legA || 0, lb = p.legB || 0, lb2 = p.legB2 || 0;
  stump(-11, lb, 2.7, 2, -1); stump(9.5, la, 2.7, 2, -1);
  stump(-4, la, 2.9, 3, 0); stump(3.5, lb2, 2.9, 3, 0);

  // ---- the mound: patched hide, a pale flank, a bruised crown, a violet rag; seamed and stapled
  const mound = [M(-18, -9), M(-19.6, -17), M(-17.4, -26), M(-10, -33.4), M(0, -37), M(10, -33.4), M(17.4, -26), M(19.6, -17), M(18, -9), M(10, -5.6), M(0, -5), M(-10, -5.6)];
  px.body(1);
  px.poly(mound, HIDE, 4, { round: 0.85, floor: 1 });
  px.part();
  px.poly([M(-19, -13), M(-14, -18), M(-6, -16.5), M(-3.6, -11.5), M(-5.4, -7), M(-14, -6.6)], PALE, 4.1, { round: 0.8, floor: 1, wrap: true });
  px.part();
  px.poly([M(-8, -32), M(2, -35.6), M(9, -30), M(6, -24), M(-3.4, -23.6), M(-10, -27)], BRUISE, 4.1, { round: 0.8, floor: 1, wrap: true });
  if (s > 0) {
    px.part();
    px.poly([M(6, -19), M(15.6, -17), M(16.4, -9), M(12.6, -7.2), M(11.2, -10.2), M(10, -7.6), M(8.6, -10.6), M(6.8, -8.6)], RAG, 4.1, { round: 0.7, floor: 1, wrap: true });
  } else {
    // behind: the torn seam in the flank, two pale ribs in it
    px.part();
    px.poly([M(-1, -21), M(1.4, -22.4), M(3.6, -21.6), M(6, -23), M(8.6, -21), M(6.8, -19.6), M(5, -17.6), M(3, -18.6), M(1, -17.8)], WOUND, 4.2, { noLine: true, wrap: true });
    px.line(...M(2, -21.8), ...M(1.6, -18.6), RIB, 4.25, { fix: 3 }); px.line(...M(5.2, -22.4), ...M(4.8, -18.8), RIB, 4.25, { fix: 3 });
    px.part();
    px.poly([M(4, -13), M(12, -15), M(15, -9), M(10, -7), M(6, -8.4)], RAG, 4.1, { round: 0.7, floor: 1, wrap: true });
  }
  px.body(0); px.part();
  const seam = (pts) => { for (let i = 0; i + 1 < pts.length; i++) { const a = M(...pts[i]), c = M(...pts[i + 1]); for (let t = 0; t < 1; t += 0.3) px.dot(a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, THREAD, 4.5, { noLine: true }); } };
  seam([[-18, -13], [-14, -18], [-6, -16.5], [-3.6, -11.5], [-5.4, -7]]);
  seam([[-9, -29], [-3.4, -23.6], [6, -24], [8, -30]]);
  if (s > 0) seam([[6.8, -9], [6, -19], [10, -26], [15, -24]]); else seam([[0, -34], [0, -24], [-2, -16], [0, -8]]);
  for (const [x, y] of [[-8.6, -16.6], [4.4, -26.6], [12, -21], [-14, -10.6], [0.4, -12]]) { const m = M(x, y); px.dot(m[0], m[1], STAPLE, 4.55, { noLine: true }); px.dot(m[0] + 1, m[1], STAPLE, 4.55, { noLine: true }); }
  // weed and a rag draped over the top, dripping
  px.part();
  const wz = 4.7;
  px.capsule(...M(-14, -26), 1, ...M(-6, -31.4), 0.9, WEED, wz, { floor: 1 }); px.capsule(...M(-6, -31.4), 0.9, ...M(2, -35), 0.9, WEED, wz, { floor: 1 }); px.capsule(...M(2, -35), 0.9, ...M(9, -32), 0.8, WEED, wz, { floor: 1 });
  px.capsule(...M(-14, -26), 0.9, ...M(-17, -16 + wav * 0.6), 0.7, WEED, wz, { floor: 1 });
  px.capsule(...M(9, -32), 0.8, ...M(12, -22 + wav * 0.5), 0.6, WEED, wz, { floor: 1 });

  // ---- heads. FRONT: the lesser face on top, the leader out of the front. BACK: the top head's back, the lolling face looks at us
  const head = (grid, leg, pos, ax, ay, z) => { px.part(); px.stamp(grid, Math.round(pos[0]), Math.round(pos[1]), leg, z, { ax, ay, ball: [grid[0].length / 2, grid.length / 2, grid[0].length / 2 + 1, grid.length / 2 + 1], cast: 1 }); };
  if (s > 0) {
    head(SMALL_F, LEG_B, M(2 + Math.sin(TL + 2) * 0.4, -33), 4, 5, 5.2);
    px.body(1);
    px.limb([M(0, -14), M(0.4, -17)], [5.4, 4.8], HIDE, 4.8, { weld: 3, weldRoot: 4 });
    px.body(0);
    head(FACE, LEG_L, M(0, -17 + (jaw > 0.55 ? 1 : 0)), 6, 5, 6);
  } else {
    head(SMALL_B, LEG_B, M(2, -32), 4, 5, 5.2);
    head(SMALL_F, LEG_A, M(-6 + Math.sin(TL) * 0.4, -15 + Math.cos(TL) * 0.3), 4, 5, 5.4);
  }

  // ---- the great arm. FRONT: planted on the screen LEFT, the fist comes toward us as it plants (bigger, lower); BACK: its shoulder only
  {
    const near = cl((19 - hand[0]) / 14, 0, 1), closeness = 1 - near;                 // 1 when planted ahead, 0 when drawn in
    const hy = hand[1] * K - 1.8, big = 0.9 + 0.3 * closeness;
    const sh = M(rs * 12, -22), hd = s > 0 ? [rs * (14 + closeness * 1.5) + dx, -3.6 + hy * 0.5 + (1 - closeness) * -1.5] : null;
    if (s > 0) {
      const el = [rs * 17 + dx, (sh[1] + hd[1]) / 2 + 1];
      px.body(1);
      px.limb([sh, el, hd], [4.4 * big, 3.8 * big, 3 * big], HIDE, 8, { weld: 3, weldRoot: 5 });
      px.body(0);
      px.part();
      px.capsule(el[0] - rs * 1.6, el[1] - 2, 1.4, hd[0] - rs * 1.4, hd[1] - 2.6, 1.1, PALE, 8.1, { bias: 0 });
      for (const t of [0.35, 0.8]) {
        const c = mix(sh, el, t < 0.6 ? t / 0.6 : 0), c2 = t < 0.6 ? c : mix(el, hd, 0.5);
        px.part(); px.line(c2[0] - 3.4, c2[1], c2[0] + 3.4, c2[1] + 0.3, IRON, 8.2, { fix: 1 }); px.line(c2[0] - 3.4, c2[1] + 0.8, c2[0] + 3.4, c2[1] + 1.1, IRON, 8.2, { fix: 2 });
      }
      px.body(1);
      px.ellipse(el[0], el[1], 2.8, 2.5, HIDE, 8.3, { weld: 3 });
      px.ellipse(hd[0], hd[1], 3.6 * big, 3.2 * big, HIDE, 8.4, { weld: 2 });
      px.body(0);
      const sp = 0.5 + 0.5 * claw;
      for (const [cx, cy] of [[-3.8, 2.4], [-1.4, 4.2], [1.4, 4.2], [3.8, 2.4]]) px.line(hd[0] + cx * 0.5, hd[1] + 2.4, hd[0] + cx * (0.8 + sp * 0.5), hd[1] + cy + 2.8, CLAW, 8.45, { fix: 3 });
    } else {
      px.body(1);
      px.ellipse(sh[0] + rs * 1.4, sh[1] + 2, 4.4, 5, HIDE, 8, { weld: 3 });
      px.body(0);
      px.part(); px.line(sh[0] + rs * 1.4 - 3.6, sh[1] + 3.4, sh[0] + rs * 1.4 + 3.6, sh[1] + 3.4, IRON, 8.2, { fix: 1 });
    }
  }

  // ---- a ghoul arm: FRONT hanging from the belly, clawing; BACK clawing out of the mound's back
  {
    const hg = jaw > 0.4 ? 1 : Math.sin(TL + 3);
    if (s > 0) {
      const s2 = M(2, -11), e2 = [3.4 + dx + hg, -7], h2 = [3 + dx + hg * 1.4, -2.2];
      px.body(1);
      px.limb([s2, e2, h2], [2, 1.6, 1.4], HIDE, 9.4, { weld: 2, weldRoot: 3 });
      px.body(0);
      clawHand([h2[0], h2[1] - 1.4], 9.5, 0);
    } else {
      const s2 = M(4, -26), e2 = M(10, -24 + wav), h2 = M(12 + wav, -32 + wav * 1.5);
      px.body(1);
      px.limb([s2, e2, h2], [2.6, 2, 1.6], HIDE, 9.4, { weld: 2, weldRoot: 3 });
      px.body(0);
      px.part();
      px.ellipse(h2[0], h2[1], 2.2, 2, HIDE, 9.5, { weld: 1 });
      for (const [cx, cy] of [[-1.6, -2.6], [0.2, -3.4], [2, -2.8]]) px.line(h2[0] + cx * 0.4, h2[1] - 1, h2[0] + cx, h2[1] + cy - 1, CLAW, 9.55, { fix: 3 });
    }
  }
  const eye = M(0, -21);
  return { light: { x: eye[0], y: eye[1], r: 14, col: "#7ce0b8", k: s > 0 ? 0.16 + 0.05 * Math.sin(TL) : 0.06 }, feet: [dx, 0] };
};

const walk = { ...SIDE.walk };
const BOX = { w: 70, h: 74, ox: 35, oy: 62 };
export const FRONT = { NAME: "amalgam-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "amalgam-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
