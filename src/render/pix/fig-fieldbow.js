// ============ FIGURE: the field bowman (Wren's archers and the Levy's archers) ============
// A plain soldier of the crown's woods, not the huntress: a peaked brown hood over a short crop
// of hair, an olive jerkin belted in leather, a rolled sleeve and a bracer, a quiver on his back
// and a yew bow in the far hand, the string drawn by the near one. The bow work is Wren's
// (fig-archer.js) on a frame 21/22 of hers, so the engine's arrow still leaves the bow hand
// (engine/muzzles.js bands). No cape, no cap feather, no ponytail: rank and file.
// Clips: idle, walk, shoot (raise and draw, hold, LOOSE, the string hand flying back, reach for
// the next arrow). `attack` is the same clip.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, ik, solve, HUMAN, scaled } from "./rig.js";
import { bowZ, stampFace, drawLimbs } from "./bowlayers.js";

const TUNIC = mat("#80703f", { contrast: 1.1 }), HOOD = mat("#6c5634", { contrast: 1.15 }), SKIN = mat("#eccaa4"), HAIR = mat("#5a4430");
const LEG_C = mat("#5a4630"), BOOT = mat("#3a2a1c"), LEATHER = mat("#6a4628"), BOW = mat("#6a4428", { contrast: 1.15 }), GOLD = mat("#b89a48");
const SHIRT = mat("#b8a878"), STEEL = mat("#c4cad6", { contrast: 1.2 }), EYE = flat("#2a1c2c"), LIP = flat("#b86a5a"), STRING = flat("#f2ead4", { line: "#6a5a48" });
const FLETCH = mat("#e8dcc0"), STREAK = flat("#fff3d2", { emis: true, line: "#d8cdb0" });

// his head: a peaked hood over short hair, the face in the opening at the FRONT EDGE of the head's
// outline, nose proud. H hood, h its fold, a the sun on it, R hair, S skin, s skin a tone down,
// E eye, N nose, m lips
const HEAD = [
  "....aaHH.....",
  "..aaHHHHHH...",
  ".aaHHHHHHHH..",
  ".HHHHHHHHHHH.",
  "HHHHHHhhhRRs.",
  "HHHHhHRSSESSE",
  "HHHhhRSSSESSEN",
  ".HHhRSSSSSSS.",
  "..HHHsSSSmm..",
  "....HHSSSS...",
];
const BLINK = HEAD.map((r, i) => (i === 5 ? r.replace(/E/g, "S") : i === 6 ? r.replace(/E/g, "e") : r));
const LEG = {
  H: { m: HOOD, fix: 2 }, h: { m: HOOD, fix: 1 }, a: { m: HOOD, fix: 3 }, R: { m: HAIR, fix: 2 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, m: { m: LIP },
};

// the layer rules (bowlayers.js), checked at every aim by scripts/pix-audit.mjs: nothing of the weapon is drawn across
// the face, and the string arm never covers the eyes
export const MUST = [["string", "notOver", "face"], ["arrow", "notOver", "face"], ["bowUpper", "notOver", "face"], ["bowLower", "notOver", "face"], ["bowGrip", "notOver", "face"], ["nearArm", "notOver", "eyes"], ["nearHand", "notOver", "eyes"]];
export const BOX = { w: 90, h: 68, ox: 30, oy: 58 };
export const BONES = scaled(scaled(HUMAN, 1, { thigh: 8.8, shin: 8.3, shN: -2.6, shF: 2.6, hipN: -1.2, hipF: 1.3 }), 21 / 22);
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

const leg = (px, h, k, an, z, b) => {
  px.tag(b < 0 ? "legFar" : "legNear"); px.part();
  px.capsule(h[0], h[1], 2.2, k[0], k[1], 1.9, LEG_C, z, { bias: b });
  px.capsule(k[0], k[1], 1.8, an[0], an[1] - 2.5, 1.6, LEG_C, z, { bias: b });
  px.capsule(k[0] * 0.25 + an[0] * 0.75, k[1] * 0.25 + an[1] * 0.75, 1.9, an[0], an[1], 1.7, BOOT, z + 0.02, { bias: b });
  px.ellipse(an[0] + 1.2, an[1] + 0.9, 2.6, 1.4, BOOT, z + 0.03, { bias: b });
};

export const draw = (px, { sk: sk0, lag1, lag2 }, o = {}) => {
  const aim = Number((o.variant || "").split("@")[1]) || 0, sk = aimed(sk0, aim);
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), sway = p.sway || 0;
  const Z = bowZ(p, aim * (p.aw || 0));                                            // the shared layer order for this pose and aim (bowlayers.js)

  // the quiver on her back, three fletchings standing out of it
  const q0 = [C[0] - 2.6, C[1] + 7], q1 = [C[0] - 6, C[1] - 2.4];
  px.tag("quiver"); px.part();
  px.capsule(q0[0], q0[1], 1.9, q1[0], q1[1], 1.9, LEATHER, Z.quiver);
  px.line(q1[0] - 1.6, q1[1] + 0.8, q1[0] + 1.6, q1[1] - 0.4, GOLD, Z.quiver + 0.02);
  px.part();
  for (const [dx, m] of [[-0.9, FLETCH], [1.1, FLETCH]]) px.capsule(q1[0] + dx - 0.4, q1[1] - 1.6, 0.8, q1[0] + dx - 1.2, q1[1] - 4, 0.7, m, Z.quiver - 0.02);

  // the far arm (the bow arm), a tone down
  px.tag("farArm"); px.part();
  px.capsule(sF[0], sF[1], 1.9, eF[0], eF[1], 1.8, TUNIC, Z.farArm, { bias: -1 });
  px.capsule(eF[0], eF[1], 1.8, hdF[0], hdF[1], 1.6, SHIRT, Z.farArm, { bias: -1 });
  px.capsule(eF[0] * 0.45 + hdF[0] * 0.55, eF[1] * 0.45 + hdF[1] * 0.55, 1.8, eF[0] * 0.15 + hdF[0] * 0.85, eF[1] * 0.15 + hdF[1] * 0.85, 1.7, LEATHER, Z.farArm + 0.02, { bias: -1 });

  // the bow: two limbs sprung from the grip; bw tilts it (+ top toward the foe)
  const bw = (p.bow ?? 0.25) + (sk.aimRad || 0), dr = p.draw || 0, cs = Math.cos(bw), sn = Math.sin(bw);
  const R = (x, y) => [hdF[0] + x * cs - y * sn, hdF[1] + x * sn + y * cs];
  const flex = dr * 1.6;                                   // drawn, the tips come back
  const top = R(-2.6 - flex, -12.5 + flex * 0.4), bot = R(-2.6 - flex, 12.5 - flex * 0.4);
  drawLimbs(px, R, { g: 1.6, rg: 1.05, mid: [0.9, 6.5], rm: 0.95, tip: [-2.6 - flex, 12.5 - flex * 0.4], rt: 0.6, gripR: 1.2, gripHalf: 1.8 }, BOW, LEATHER, Z);
  px.tag("farHand"); px.part(); px.ellipse(hdF[0], hdF[1], 1.6, 1.7, SKIN, Z.farHand, { bias: -1 });

  // legs, then the tunic: belted, skirted to mid-thigh
  leg(px, hF, kF, anF, Z.legFar, -1);
  leg(px, hN, kN, anN, Z.legNear, 0);
  const hemB = P[0] - 5.2 - vx * 1.1, hemF = P[0] + 5 - vx * 0.7, hy = P[1] + 2.8;
  px.tag("torso"); px.part(); const tun = px._pid;
  px.poly([[C[0] - 4, C[1] - 1.8], [C[0] + 4.2, C[1] - 1.8], [C[0] + 5, C[1] + 3], [P[0] + 3.9, P[1] - 3], [hemF, hy], [hemF - 2.6, hy + 0.9], [P[0] - vx, hy], [hemB + 2.4, hy + 0.9], [hemB, hy], [P[0] - 4.2, P[1] - 3], [C[0] - 5, C[1] + 3]], TUNIC, Z.torso, { round: 0.92, cast: 2 });
  px.toneLine(P[0] + 0.8, P[1] - 0.5, P[0] + 0.6 - vx, hy - 0.5, -1, tun);
  px.poly([[P[0] - 4.3, P[1] - 4.4], [P[0] + 4, P[1] - 4.4], [P[0] + 4, P[1] - 2.6], [P[0] - 4.3, P[1] - 2.6]], LEATHER, Z.torso + 0.05, { round: 0.92 });
  px.rect(P[0] + 1, P[1] - 4.4, 2, 2, GOLD, Z.torso + 0.06, { fix: 3 });
  // the quiver's strap across the chest
  px.toneLine(C[0] - 3.4, C[1] - 0.6, P[0] + 3, P[1] - 5, -1, tun);

  // the hood falls to the shoulders in a short cowl; a hair tuft at the nape
  const hx = Math.round(N[0]), hyy = Math.round(N[1]), tp = cl(vx * 2 + vx2 * 1.4, -2, 3) - sway * 0.4;
  px.tag("cape"); px.part();
  px.poly([[C[0] - 5.2, C[1] - 2.8], [C[0] + 4.6, C[1] - 2.8], [C[0] + 5.4, C[1] + 0.8], [C[0] + 1.6, C[1] + 2.8], [C[0] - 2.2, C[1] + 2], [C[0] - 5.8, C[1] + 1.4]], HOOD, Z.cape, { round: 0.9, cast: 1 });
  px.tag("head"); px.part();
  px.capsule(hx - 5, hyy - 2.4, 1.4, hx - 6.4 - tp * 0.4, hyy + 0.4, 1.0, HOOD, Z.hoodTail);
  // his head
  px.part();
  stampFace(px, p.blink ? BLINK : HEAD, hx, hyy, LEG, Z.hood, Z.face, { ax: 7, ay: 9, cast: 2 }, "SsNeEm", "E", Math.max(Z.face, Z.nearArm, Z.nearHand) + 0.75);

  // the string (through the near fingers once she draws) and the arrow on it
  const nock = dr > 0.12 ? hdN : null;
  px.tag("string"); px.part();
  if (nock) { px.line(top[0], top[1], nock[0], nock[1], STRING, Z.string, { noLine: true }); px.line(nock[0], nock[1], bot[0], bot[1], STRING, Z.string, { noLine: true }); }
  else px.line(top[0], top[1], bot[0], bot[1], STRING, Math.min(Z.bowUpper, Z.bowLower) - 0.5, { noLine: true });   // unheld: in the bow's plane, under its limbs
  if (p.arrow > 0.5) {
    // the shaft lies from the nock across the bow hand
    const a0 = nock || R(-2.6, 0), ar = sk.aimRad || 0, ax = hdF[0] + 0.6 * Math.cos(ar) + 0.8 * Math.sin(ar) - a0[0], ay = hdF[1] + 0.6 * Math.sin(ar) - 0.8 * Math.cos(ar) - a0[1], l = Math.hypot(ax, ay) || 1, ux = ax / l, uy = ay / l, L = Math.max(l + 3.5, 15);
    px.tag("arrow"); px.part();
    px.line(a0[0], a0[1], a0[0] + ux * L, a0[1] + uy * L, BOW, Z.arrow, { fix: 3 });
    px.capsule(a0[0] + ux * L, a0[1] + uy * L, 0.9, a0[0] + ux * (L + 2.2), a0[1] + uy * (L + 2.2), 0.4, STEEL, Z.arrow + 0.02);
    px.capsule(a0[0] + ux * 0.6, a0[1] + uy * 0.6 - 0.6, 0.9, a0[0] + ux * 2.8, a0[1] + uy * 2.8 - 0.6, 0.7, FLETCH, Z.arrow + 0.02);
  }

  // the near arm: a rolled green sleeve, a pale shirt cuff, a leather bracer
  px.tag("nearArm"); px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.1, eN[0], eN[1], 1.9, TUNIC, Z.nearArm, { cast: 2 });
  px.capsule(eN[0], eN[1], 1.9, hdN[0], hdN[1], 1.6, SHIRT, Z.nearArm, { cast: 2 });
  px.capsule(eN[0] * 0.5 + hdN[0] * 0.5, eN[1] * 0.5 + hdN[1] * 0.5, 1.9, eN[0] * 0.15 + hdN[0] * 0.85, eN[1] * 0.15 + hdN[1] * 0.85, 1.8, LEATHER, Z.nearArm + 0.02);
  px.tag("nearHand"); px.part(); px.ellipse(hdN[0], hdN[1], 1.6, 1.6, SKIN, Z.nearHand);
  px.tag(null);

  return { bowHand: hdF, marks: { muzzle: [hdF[0], hdF[1]] } };
};

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

// (aw names the aim weight on every key, READY's included: a key with none inherits its neighbour's, so the last
// frames of a shot used to stay turned toward the aim)
const READY = { aw: 0, aF: [0.72, 0.78, 0], bow: 0.32, aN: [0.42, 0.74, 0], draw: 0, arrow: 0, fN: [-1.8, 0], fF: [2, 0] };
export const CLIPS = {
  idle: {
    n: 8, ms: 1900, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 1); return { ...READY, rise: 0.5 + 0.5 * b, aF: [0.72, 0.78 - 0.03 * (0.5 + 0.5 * b), 0], bow: 0.32 + 0.02 * b2, sway: b2 * 0.8, blink: ph > 0.5 && ph < 0.62 ? 1 : 0 }; },
  },
  walk: {
    n: 8, ms: 680, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 5.6, lift: 2.8, swing: 0.5, bob: 1.2 }), a = Math.cos(ph * Math.PI * 2); return { ...w, aF: [0.62 + 0.14 * a, 0.74, 0], bow: 0.5 + 0.08 * a, draw: 0, arrow: 0 }; },
  },
  shoot: {
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
CLIPS.attack = CLIPS.shoot;

// the aim contract: the bow hand at the loose (PIX hit 0.62) and the bow shoulder it turns about (art px from the feet, aim 0)
export const AIM = aimAt(CLIPS.shoot, 0.62);
