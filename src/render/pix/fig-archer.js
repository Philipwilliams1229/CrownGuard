// ============ CONCEPT FIGURE: Wren, the huntress ============
// Auburn hair in a ponytail under a peaked hunting cap with a red-tipped
// feather (the owner's pick of four, 2026-11-12: "C for sure that's awesome"),
// a green mantle and cloak, a longbow in the far hand, the string drawn by
// the near one. Clips: idle, walk, attack (raise and draw,
// hold, loose, the string hand flying back, reach for the next arrow).
import { mat, flat } from "./pix.js";
import { bowZ, stampFace, drawLimbs } from "./bowlayers.js";
import { walkPose, sampleKeys, ik, solve, HUMAN, scaled } from "./rig.js";

const RANGER = mat("#3d7448"), TUNIC = mat("#5a8c44"), CLOAK = mat("#335a30"), SKIN = mat("#eccaa4"), HAIR = mat("#b5623a");
const LEG_C = mat("#6a4c34"), BOOT = mat("#4a3224"), LEATHER = mat("#7a5232"), BOW = mat("#6a4424", { contrast: 1.15 }), GOLD = mat("#d8b34a");
const SHIRT = mat("#d8cdb0"), STEEL = mat("#c4cad6", { contrast: 1.2 }), EYE = flat("#2a1c2c"), LIP = flat("#b86a5a"), STRING = flat("#f2ead4", { line: "#6a5a48" });
const FLETCH = mat("#e8dcc0"), FLETCH_R = mat("#b03440"), STREAK = flat("#fff3d2", { emis: true, line: "#d8cdb0" });

// Her head, bare (the cap is drawn over it): auburn hair swept across the
// brow and back to a ponytail, the face at the FRONT EDGE of the head's
// outline, nose proud of everything. (Two hoods were tried first and thrown
// out: one sat like a cap, the next ringed her face like a sock and made her
// head too big. The owner picked this out of four sketches.)
//   R hair, r a darker strand, Q where the sun catches it, S skin, s skin a
//   tone down, E eye, N nose, m lips
const HEAD = [
  "....QQQRR....",
  "..QQQQRRRRR..",
  ".QQRRRRRRRRR.",
  ".QRRRRRRrRRR.",
  "RRRRRrRRRsss.",
  "RRRRrRSSESSE.",
  "RRRrrSSSESSEN",
  ".RrrSSSSSSSS.",
  "....sSSSSmm..",
  "......SSSS...",
];
const BLINK = HEAD.map((r, i) => (i === 5 ? r.replace(/E/g, "S") : i === 6 ? r.replace(/E/g, "e") : r));
const LEG = {
  R: { m: HAIR, fix: 2 }, r: { m: HAIR, fix: 1 }, Q: { m: HAIR, fix: 3 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, m: { m: LIP },
};

export const BOX = { w: 92, h: 72, ox: 30, oy: 62 };
export const BONES = scaled(HUMAN, 1, { thigh: 8.8, shin: 8.3, shN: -2.6, shF: 2.6, hipN: -1.2, hipF: 1.3 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- the aim (art/briefs/aim-contract.md) -------------------------------------------------
// "<variant>@<deg>": the shot's angle in his own frame (0 level, + down the screen). While a clip's
// `aw` (aim weight) is up, the bow and both arms turn RIGIDLY about the bow shoulder `sF`; the string
// hand is re-solved from its own shoulder so the elbow still folds the same way. aw 0 = no change.
const RAD = Math.PI / 180;
const rotAbout = (pv, q, deg) => { const a = deg * RAD, c = Math.cos(a), s = Math.sin(a), x = q[0] - pv[0], y = q[1] - pv[1]; return [pv[0] + x * c - y * s, pv[1] + x * s + y * c]; };
const aimed = (sk, deg) => {
  const w = sk.p.aw || 0, d = deg * w;
  if (!d) return sk;
  const r = (q) => rotAbout(sk.sF, q, d), eF = r(sk.eF), hdF = r(sk.hdF), tgt = r(sk.hdN), want = r(sk.eN);
  // the upper body turns into the shot about the bow shoulder (so the pivot stays put): the chest and head lean up to
  // 8 degrees, the near shoulder swings round with the aim so the string arm has the reach to stay on the string
  const lean = d * (8 / 70), tw = d * 0.45 + lean, sN = rotAbout(sk.sF, sk.sN, tw), C = rotAbout(sk.sF, sk.C, lean), N = rotAbout(sk.sF, sk.N, lean);
  const a = ik(sN[0], sN[1], tgt[0], tgt[1], BONES.upper, BONES.fore, 1), b = ik(sN[0], sN[1], tgt[0], tgt[1], BONES.upper, BONES.fore, -1);
  const pick = Math.hypot(a.mid[0] - want[0], a.mid[1] - want[1]) <= Math.hypot(b.mid[0] - want[0], b.mid[1] - want[1]) ? a : b;
  return { ...sk, eF, hdF, sN, C, N, eN: pick.mid, hdN: pick.end, aimRad: d * RAD };
};
// the engine's muzzle at aim 0: the bow hand at the frame the shot is loosed on (the pivot is the bow shoulder)
const aimAt = (clip, hit) => { const f = Math.round(hit * (clip.n - 1)), s = solve(clip.pose(f / (clip.n - 1)), BONES); return { pivot: [s.sF[0], s.sF[1]], muzzle: [s.hdF[0], s.hdF[1]] }; };

// a leg: ONE welded tube (thigh, knee, shin share radii), the boot a wrapped colour change, then the foot
const leg = (px, h, k, an, z, b) => {
  px.limb([h, k, an], [2.2, 1.85, 1.65], LEG_C, z, { bias: b, weld: 2, weldRoot: 4 });
  px.capsule(k[0] * 0.25 + an[0] * 0.75, k[1] * 0.25 + an[1] * 0.75, 1.6, an[0], an[1], 1.5, BOOT, z + 0.01, { bias: b, wrap: true });
  px.ellipse(an[0] + 1.2, an[1] + 0.9, 2.6, 1.4, BOOT, z + 0.03, { bias: b, weld: 1.5 });
};
// an arm: one sleeve tube, the forearm's cuff and bracer wrapped on it (a colour change, not a second lit shape)
const arm = (px, sh, e, hd, z, o, cuff, bracer, r) => {
  px.limb([sh, e, hd], [r[0], r[1], r[2]], TUNIC, z, o);
  px.capsule(e[0], e[1], r[1] - 0.1, hd[0], hd[1], r[2] - 0.1, SHIRT, z + 0.01, { ...o, weld: 0, weldRoot: 0, wrap: true });
  px.capsule(e[0] * 0.5 + hd[0] * 0.5, e[1] * 0.5 + hd[1] * 0.5, r[1] - 0.15, e[0] * 0.15 + hd[0] * 0.85, e[1] * 0.15 + hd[1] * 0.85, r[2] - 0.05, LEATHER, z + 0.02, { ...o, weld: 0, weldRoot: 0, wrap: true });
};

export const draw = (px, { sk: sk0, lag1, lag2 }, o = {}) => {
  const aimDeg = Number((o.variant || "").split("@")[1]) || 0, sk = aimed(sk0, aimDeg);
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), sway = p.sway || 0;
  const Z = bowZ(p, (sk.aimRad || 0) / RAD);                 // the shared layer order for this pose and aim (bowlayers.js)

  // the cloak down her back, its tail a beat behind
  const t1 = -vx * 1.5 + sway * 0.5, t2 = -vx * 2.2 - vx2 * 1.6 + sway;
  px.tag("deep"); px.part();
  px.poly([[C[0] - 3.2, C[1] - 1.8], [C[0] + 1.6, C[1] - 1.8], [P[0] - 0.6, P[1] + 2], [P[0] - 2.6 + t2 * 0.6, -9.4], [P[0] - 4.6 + t2, -11.4], [P[0] - 6.8 + t2, -9],
    [P[0] - 6.6 + t1, P[1] + 1], [C[0] - 5.4, C[1] + 3.5]], CLOAK, Z.deep, { round: 0.85 });
  px.toneLine(C[0] - 4.2, C[1] + 4, P[0] - 5.2 + t2 * 0.8, -11.5, -1, px._pid);
  // the quiver on her back, three fletchings standing out of it
  const q0 = [C[0] - 2.6, C[1] + 7], q1 = [C[0] - 6, C[1] - 2.4];
  px.tag("quiver"); px.part();
  px.capsule(q0[0], q0[1], 1.9, q1[0], q1[1], 1.9, LEATHER, Z.quiver);
  px.line(q1[0] - 1.6, q1[1] + 0.8, q1[0] + 1.6, q1[1] - 0.4, GOLD, Z.quiver + 0.02);
  px.part();
  for (const [dx, m] of [[-0.9, FLETCH], [1.1, FLETCH]]) px.capsule(q1[0] + dx - 0.4, q1[1] - 1.6, 0.8, q1[0] + dx - 1.2, q1[1] - 4, 0.7, m, Z.quiver - 0.02);

  // ONE BODY (joint kit): arms, legs, tunic, mantle and head share a part id, so none shadows or edges another
  // the far arm (the bow arm), a tone down
  px.tag("farArm"); px.body(1);
  arm(px, sF, eF, hdF, Z.farArm, { bias: -1, weld: 0 }, SHIRT, LEATHER, [1.9, 1.8, 1.6]);
  px.body(0);

  // the bow: two limbs sprung from the grip (bowlayers' drawLimbs, each limb its own tagged layer); bw tilts it
  const bw = (p.bow ?? 0.25) + (sk.aimRad || 0), dr = p.draw || 0, cs = Math.cos(bw), sn = Math.sin(bw);
  const R = (x, y) => [hdF[0] + x * cs - y * sn, hdF[1] + x * sn + y * cs];
  const flex = dr * 1.6;                                   // drawn, the tips come back
  const top = R(-2.6 - flex, -12.5 + flex * 0.4), bot = R(-2.6 - flex, 12.5 - flex * 0.4);
  drawLimbs(px, R, { g: 1.6, rg: 1.05, mid: [0.9, 6.5], rm: 0.95, tip: [-2.6 - flex, 12.5 - flex * 0.4], rt: 0.6, gripR: 1.2, gripHalf: 1.8 }, BOW, LEATHER, Z);
  px.tag("farHand"); px.part(); px.ellipse(hdF[0], hdF[1], 1.6, 1.7, SKIN, Z.farHand, { bias: -1 });

  // legs, then the tunic: belted, skirted to mid-thigh
  px.tag("legFar"); px.body(1); leg(px, hF, kF, anF, Z.legFar, -1); px.body(0);
  px.tag("legNear"); px.body(1); leg(px, hN, kN, anN, Z.legNear, 0); px.body(0);
  const hemB = P[0] - 5.2 - vx * 1.1, hemF = P[0] + 5 - vx * 0.7, hy = P[1] + 2.8;
  px.tag("torso"); const tun = px.body(1);
  px.poly([[C[0] - 4, C[1] - 1.8], [C[0] + 4.2, C[1] - 1.8], [C[0] + 5, C[1] + 3], [P[0] + 3.9, P[1] - 3], [hemF, hy], [hemF - 2.6, hy + 0.9], [P[0] - vx, hy], [hemB + 2.4, hy + 0.9], [hemB, hy], [P[0] - 4.2, P[1] - 3], [C[0] - 5, C[1] + 3]], TUNIC, Z.torso, { round: 0.92 });
  px.toneLine(P[0] + 0.8, P[1] - 0.5, P[0] + 0.6 - vx, hy - 0.5, -1, tun);
  px.poly([[P[0] - 4.3, P[1] - 4.4], [P[0] + 4, P[1] - 4.4], [P[0] + 4, P[1] - 2.6], [P[0] - 4.3, P[1] - 2.6]], LEATHER, Z.torso + 0.05, { round: 0.92 });
  px.rect(P[0] + 1, P[1] - 4.4, 2, 2, GOLD, Z.torso + 0.06, { fix: 3 });
  // the quiver's strap across the chest
  px.toneLine(C[0] - 3.4, C[1] - 0.6, P[0] + 3, P[1] - 5, -1, tun);

  // the mantle: a short green cape over both shoulders, to a point on the chest with a gold pin
  const hx = Math.round(N[0]), hyy = Math.round(N[1]), tp = cl(vx * 2 + vx2 * 1.4, -2, 3) - sway * 0.4;
  px.tag("cape");
  px.poly([[C[0] - 5.4, C[1] - 2.6], [C[0] + 5.2, C[1] - 2.6], [C[0] + 6.2, C[1] + 1.4], [C[0] + 3.4, C[1] + 3.2], [C[0] + 0.6 - vx * 0.5, C[1] + 4.6], [C[0] - 2.6, C[1] + 3], [C[0] - 6.4, C[1] + 1.8]], RANGER, Z.cape, { round: 0.9 });
  px.line(C[0] + 0.6 - vx * 0.5, C[1] + 2.4, C[0] + 0.6 - vx * 0.5, C[1] + 2.4, GOLD, Z.cape + 0.02, { fix: 3 });
  px.body(0);
  // the ponytail, tied with gold, swinging a beat behind
  px.tag("hoodTail"); px.part();
  px.capsule(hx - 4.8, hyy - 6.4, 1.8, hx - 7.8 - tp * 0.7, hyy - 3.6, 1.5, HAIR, Z.hoodTail);
  px.capsule(hx - 7.8 - tp * 0.7, hyy - 3.6, 1.5, hx - 8.8 - tp, hyy + 1.8, 0.7, HAIR, Z.hoodTail);
  // her head (the face above the string, arrow and bow: nothing of the weapon crosses it)
  px.tag("head"); px.body(1);
  stampFace(px, p.blink ? BLINK : HEAD, hx, hyy, LEG, Z.hood, Z.face, { ax: 7, ay: 10, cast: 0 }, "SsNeEm", "E", Math.max(Z.face, Z.nearArm, Z.nearHand) + 0.75);
  px.tag("hood"); px.dot(hx - 5.4, hyy - 5.6, GOLD, Z.hood + 0.02, { fix: 3 });
  px.body(0);
  // the hunting cap: a feather raked back (it trails a beat behind), the crown, a long brim to a point over her brow
  px.part();
  px.capsule(hx - 1.6, hyy - 10.6, 0.9, hx - 5 - tp * 0.5, hyy - 13.8, 0.9, FLETCH, Z.hood + 0.35);
  px.capsule(hx - 5 - tp * 0.5, hyy - 13.8, 0.9, hx - 7.4 - tp, hyy - 15, 0.6, FLETCH_R, Z.hood + 0.35);
  px.part();
  px.poly([[hx - 4.6, hyy - 8.4], [hx + 5.2, hyy - 8.4], [hx + 2.6, hyy - 12.6], [hx - 3.4, hyy - 12]], RANGER, Z.hood + 0.4, { round: 0.9 });
  px.part();
  px.poly([[hx - 5.6, hyy - 7.2], [hx + 9.2, hyy - 7], [hx + 4.8, hyy - 9.4], [hx - 5.2, hyy - 9.6]], RANGER, Z.hood + 0.5, { round: 0.6, bias: -1, cast: 2 });

  // the string (through the near fingers once she draws) and the arrow on it
  const nock = dr > 0.12 ? hdN : null;
  px.tag("string"); px.part();
  if (nock) { px.line(top[0], top[1], nock[0], nock[1], STRING, Z.string, { unlit: true }); px.line(nock[0], nock[1], bot[0], bot[1], STRING, Z.string, { unlit: true }); }
  else px.line(top[0], top[1], bot[0], bot[1], STRING, Math.min(Z.bowUpper, Z.bowLower) - 0.5, { unlit: true });
  if (p.arrow > 0.5) {
    // the shaft lies from the nock across the bow hand
    const a0 = nock || R(-2.6, 0), ar = sk.aimRad || 0, ax = hdF[0] + 0.6 * Math.cos(ar) + 0.8 * Math.sin(ar) - a0[0], ay = hdF[1] + 0.6 * Math.sin(ar) - 0.8 * Math.cos(ar) - a0[1], l = Math.hypot(ax, ay) || 1, ux = ax / l, uy = ay / l, L = Math.max(l + 3.5, 15);
    px.tag("arrow"); px.part();
    px.line(a0[0], a0[1], a0[0] + ux * L, a0[1] + uy * L, BOW, Z.arrow, { fix: 3 });
    px.capsule(a0[0] + ux * L, a0[1] + uy * L, 0.9, a0[0] + ux * (L + 2.2), a0[1] + uy * (L + 2.2), 0.4, STEEL, Z.arrow + 0.02);
    px.capsule(a0[0] + ux * 0.6, a0[1] + uy * 0.6 - 0.6, 0.9, a0[0] + ux * 2.8, a0[1] + uy * 2.8 - 0.6, 0.7, FLETCH, Z.arrow + 0.02);
  }

  // the near arm: a rolled green sleeve, a pale shirt cuff, a leather bracer
  px.tag("nearArm"); px.body(1);
  arm(px, [sN[0], sN[1] + 0.3], eN, hdN, Z.nearArm, { weld: 2, weldRoot: 4 }, SHIRT, LEATHER, [2.1, 1.9, 1.6]);
  px.body(0);
  px.tag("nearHand"); px.part(); px.ellipse(hdN[0], hdN[1], 1.6, 1.6, SKIN, Z.nearHand);
  px.tag(null);

  return { bowHand: hdF, marks: { muzzle: [hdF[0], hdF[1]] } };
};

export const MUST = [["string", "notOver", "face"], ["arrow", "notOver", "face"], ["bowUpper", "notOver", "face"], ["bowLower", "notOver", "face"], ["bowGrip", "notOver", "face"], ["nearArm", "notOver", "eyes"], ["nearHand", "notOver", "eyes"]];

// the arrow in flight, a short streak behind it
export const fx = (px, { ph, sk }, info, clip) => {
  if (clip !== "attack" || ph < 0.6) return;
  const t = (ph - 0.6) / 0.4, [bx, by] = sk.hdF, x = bx + 4 + t * 150, y = by - 0.8 + t * t * 3;
  if (x > 60) return;
  px.line(x - 9 - t * 16, y, x - 2, y, STREAK, 20, { noLine: true });
  px.line(x - 6, y, x + 7, y, BOW, 20.2, { fix: 3 });
  px.capsule(x + 7, y + 0.5, 0.9, x + 9.4, y + 0.5, 0.4, STEEL, 20.3);
  px.capsule(x - 6, y - 0.2, 0.9, x - 3.8, y - 0.2, 0.7, FLETCH, 20.3);
};

const READY = { aw: 0, aF: [0.72, 0.78, 0], bow: 0.32, aN: [0.42, 0.74, 0], draw: 0, arrow: 0, fN: [-1.8, 0], fF: [2, 0] };
const SKY = [
  { aF: [2.2, 1, 0], bow: -0.66, aN: [2.55, 0.42, 1], draw: 1, arrow: 1, lean: -0.1, twist: -0.7, rise: 0.8, hy: -0.6 },
  { aF: [2.15, 1, 0], bow: -0.52, aN: [3.25, 0.6, 1], draw: 0, arrow: 0, lean: -0.06, twist: -0.9, rise: 0.5, hy: -0.6 },
  { aF: [1.95, 0.96, 0], bow: -0.34, aN: [3.3, 0.55, 1], draw: 0, arrow: 0, lean: -0.03, twist: -0.8, hy: -0.3 },
  { aF: [1.75, 0.9, 0], bow: -0.14, aN: [1.7, 0.5, 0], draw: 0.2, arrow: 1, lean: -0.04, twist: -0.4, hy: -0.3 },
];
export const CLIPS = {
  // the Arrow Volley's four poses, aimed high (the game picks them by number as her
  // volley's flights go: full draw, loose, the reach to the quiver, the nock)
  sky: { n: 4, ms: 400, loop: false, lag: 0.01, pose: (ph) => ({ ...READY, fN: [-2.4, 0], fF: [2.6, 0], ...SKY[Math.round(ph * 3)] }) },
  idle: {
    n: 8, ms: 1900, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 1); return { ...READY, rise: 0.5 + 0.5 * b, aF: [0.72, 0.78 - 0.03 * (0.5 + 0.5 * b), 0], bow: 0.32 + 0.02 * b2, sway: b2 * 0.8, blink: ph > 0.5 && ph < 0.62 ? 1 : 0 }; },
  },
  walk: {
    n: 8, ms: 680, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 5.6, lift: 2.8, swing: 0.5, bob: 1.2 }), a = Math.cos(ph * Math.PI * 2); return { ...w, aF: [0.62 + 0.14 * a, 0.74, 0], bow: 0.5 + 0.08 * a, draw: 0, arrow: 0 }; },
  },
  attack: {
    n: 14, ms: 1000, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      { t: 0, p: { ...READY, arrow: 1 } },
      { t: 0.14, e: "io", p: { aw: 0.4, aF: [1.05, 0.86, 0], bow: 0.12, aN: [1.2, 0.56, 0], draw: 0.15, arrow: 1, twist: -0.2, fN: [-1.8, 0], fF: [2, 0] } },
      { t: 0.4, e: "out", p: { aw: 1, rx: -0.6, lean: -0.06, twist: -0.7, rise: 0.6, aF: [1.5, 1, 0], bow: 0, aN: [1.8, 0.38, 1], draw: 1, arrow: 1, fN: [-2.4, 0], fF: [2.6, 0] } },
      { t: 0.58, e: "io", p: { aw: 1, rx: -0.8, lean: -0.08, twist: -0.8, rise: 1, aF: [1.52, 1, 0], bow: 0, aN: [1.82, 0.42, 1], draw: 1, arrow: 1, fN: [-2.4, 0], fF: [2.6, 0] } },
      { t: 0.64, e: "in3", p: { aw: 1, rx: -0.3, lean: -0.02, twist: -1, rise: 0.6, aF: [1.46, 1, 0], bow: 0.16, aN: [2.75, 0.62, 1], draw: 0, arrow: 0, fN: [-2.4, 0], fF: [2.6, 0] } },
      { t: 0.78, e: "out", p: { aw: 0.4, rx: 0, lean: 0, twist: -0.8, aF: [1.3, 0.96, 0], bow: 0.24, aN: [3.1, 0.6, 1], draw: 0, arrow: 0, fN: [-2.4, 0], fF: [2.6, 0] } },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
};

// the aim contract: the bow hand at the loose (PIX hit 0.62) and the bow shoulder it turns about (art px from the feet, aim 0)
export const AIM = aimAt(CLIPS.attack, 0.62);
