// ============ CONCEPT FIGURE: Sir Aldric, the crown's knight ============
// Plate and gold, a red surcoat, cape and plume, a kite shield on the far arm,
// a longsword in the near fist. An open-faced helm so the face reads.
// Clips: idle (low guard, breathing), walk (sword on the shoulder), attack
// (wind-up over the shoulder, a fast cut, follow-through, back to guard).
import { mat, flat, layers } from "./pix.js";
import { stampFace } from "./bowlayers.js";
import { walkPose, sampleKeys, HUMAN, scaled, armChain, legChain } from "./rig.js";

const STEEL = mat("#98a2b6", { contrast: 1.18 }), MAIL = mat("#6c7488", { contrast: 1.1 }), GOLD = mat("#d8b34a", { contrast: 1.15 });
const RED = mat("#b03440"), RED_D = mat("#7e2434"), SKIN = mat("#e8b990"), HAIR = mat("#6a4a30"), LEATHER = mat("#5a3c28");
const BLADE = mat("#d4dae4", { contrast: 1.35 }), EYE = flat("#2a1c2c"), SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });

// the head: a domed helm with a gold brow band, a mail coif round the neck,
// the face open (M steel, m a tone down, G gold, c mail, S skin, s skin a tone
// down, E eye, N nose a tone up, B moustache)
const TOP = [
  ".....MMMM....",
  "...MMMMMMMM..",
  "..MMMMMMMMMM.",
  ".MMMMMMMMMMM.",
  ".GGGGGGGGGGG.",
];
// Three faces (round 2: the owner read the first one's long moustache as a flat
// mouth, "like he's just 😑 the whole time"). The fix in all three: nothing runs
// straight across the face, and the brows say something.
//   a  a trimmed moustache under the nose, a set jaw, a brow drawn down
//   b  a short brown beard round the jaw
//   c  clean-shaven: brows and a firm mouth
const FACES = {
  a: [
    ".cMsbbssbbs..",
    ".cMSSESSSES..",
    ".cmSSESSSESN.",
    ".cmSSSSSSSSN.",
    ".ccmSSSSBBB..",
    "..ccmSSSsS...",
    "..cccccc.....",
  ],
  b: [
    ".cMsbbssbbs..",
    ".cMSSESSSES..",
    ".cmSSESSSESN.",
    ".cBSSSSSSSSN.",
    ".cBBSSSBBBB..",
    "..cBBBBBBB...",
    "..cccBBB.....",
  ],
  c: [
    ".cMsbbssbbs..",
    ".cMSSESSSES..",
    ".cmSSESSSESN.",
    ".cmSSSSSSSSN.",
    ".ccmSSSSSSS..",
    "..ccmSSSll...",
    "..cccccc.....",
  ],
};
// round 1's face, kept only so the sheet can show the before
FACES.r1 = [
  ".cMssssssss..",
  ".cMSSESSSES..",
  ".cmSSESSSESN.",
  ".cmSSSSSSSSN.",
  ".ccmSBBBBB...",
  "..ccmSSSS....",
  "..cccccc.....",
];
const HEADS = {}, BLINKS = {};
for (const k in FACES) {
  const h0 = [...TOP, ...FACES[k]], b0 = h0.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
  HEADS[k] = h0; BLINKS[k] = b0;
}
export const VARIANTS = { a: "Trimmed moustache", b: "Short beard", c: "Clean-shaven" };

// ---- the scale pass (2026-11-17, owner: heroes bigger than soldiers: 48 -> 56 art px) ----
// The figure is still posed on its own skeleton (BONES, unscaled) and drawn in those units; every shape goes through
// `big(px)`, which lays it S times larger at the pixel grid (so the pixels stay crisp, nothing is resampled). Hand-pixelled
// stamps (heads) are regrown by duplicating chosen rows and columns, so the face keeps its eyes one pixel wide.
const SC = 7 / 6;
const grow = (rows, dr, dc) => rows.map((r, i) => { const a = [...r].flatMap((ch, c) => (dc.includes(c) ? [ch, ch] : [ch])).join(""); return dr.includes(i) ? [a, a] : [a]; }).flat();
const big = (px) => {
  const P = (p) => [p[0] * SC, p[1] * SC], w = (o = {}) => (o.weld || o.weldRoot ? { ...o, weld: o.weld && o.weld * SC, weldRoot: o.weldRoot && o.weldRoot * SC } : o);
  return {
    get _pid() { return px._pid; },
    part() { px.part(); return this; }, body(i) { return px.body(i); }, tag(n) { px.tag(n); return this; },
    capsule(ax, ay, ra, bx, by, rb, m, z, o = {}) { px.capsule(ax * SC, ay * SC, ra * SC, bx * SC, by * SC, rb * SC, m, z, { ...w(o), limb: o.limb ?? Math.max(ra, rb) >= 1.8 }); return this; },
    limb(pts, r, m, z, o = {}) { px.limb(pts.map(P), Array.isArray(r) ? r.map((v) => v * SC) : r * SC, m, z, w(o)); return this; },
    ellipse(cx, cy, rx, ry, m, z, o = {}) { px.ellipse(cx * SC, cy * SC, rx * SC, ry * SC, m, z, w(o)); return this; },
    poly(pts, m, z, o = {}) { px.poly(pts.map(P), m, z, o); return this; },
    rect(x, y, ww, h, m, z, o = {}) { px.poly([[x, y], [x + ww, y], [x + ww, y + h], [x, y + h]].map(P), m, z, o); return this; },
    line(ax, ay, bx, by, m, z, o = {}) { px.line(ax * SC, ay * SC, bx * SC, by * SC, m, z, o); return this; },
    dot(x, y, m, z, o = {}) { px.dot(x * SC, y * SC, m, z, o); return this; },
    tone(x, y, d, pid) { px.tone(x * SC, y * SC, d, pid); return this; },
    toneLine(ax, ay, bx, by, d, pid) { px.toneLine(ax * SC, ay * SC, bx * SC, by * SC, d, pid); return this; },
    stamp(rows, x, y, lg, z, o = {}) { px.stamp(rows, x * SC, y * SC, lg, z, o); return this; },
  };
};
const LEG = {
  M: { m: STEEL }, m: { m: STEEL, bias: -1 }, G: { m: GOLD }, c: { m: MAIL }, S: { m: SKIN }, s: { m: SKIN, bias: -1 },
  N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, E: { m: EYE }, B: { m: HAIR }, b: { m: HAIR, fix: 2 }, l: { m: SKIN, fix: 0 },
};

// the near arm may pass in front of the head, but never over the eyes
export const MUST = [["nearArm", "notOver", "eyes"]];
export const BOX = { w: 98, h: 86, ox: 40, oy: 73 };
export const BONES = scaled(HUMAN, 1.08, { shN: -3.2, shF: 3.2, hipN: -1.4, hipF: 1.6, neck: 1.5 });
const CROWN = ["G.G.G", "GGGGG", "GGGGG"];
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// THE GRIP. The sword is held in a closed fist: its angle is DERIVED from the solved forearm, never posed on its
// own. weapon angle (from upright, + toward the foe) = forearm direction (elbow -> hand) + GRIP + wrist.
// GRIP is the hilt's one fixed angle in the fist: the blade stands up out of the top (thumb side) of the fist,
// about 97 degrees from the forearm. `wrist` is the pose's only freedom here, clamped to a real wrist's +-0.35.
export const GRIP = -1.7;
export const WRIST = 0.35;
const forearm = (sk) => { const f = Math.atan2(sk.hdN[0] - sk.eN[0], -(sk.hdN[1] - sk.eN[1])); return f < -1.9 ? f + Math.PI * 2 : f; };
export const swordAngle = (sk) => forearm(sk) + GRIP + cl(sk.p.wrist || 0, -WRIST, WRIST);

// Depth order, back to front, STATIC: the head, then the sword, then the near arm (it may pass in front of the
// head, never behind it). Nothing re-orders.
const KZ = layers(["head", "sword", "arm"], [], { z0: 5, step: 0.45 });

// a plated leg, ONE welded tube (cuisse, knee, greave share radii at the joints), then the knee cop and sabaton
const leg = (px, h, k, an, z, b) => {
  px.limb([h, k, an], [2.5, 2.05, 1.7], STEEL, z, { bias: b, weld: 2, weldRoot: 5 });
  px.ellipse(k[0] + 0.6, k[1], 2, 1.9, STEEL, z + 0.02, { bias: b, vb: 0.25, weld: 2 });
  px.ellipse(an[0] + 1.2, an[1] + 0.9, 2.8, 1.4, MAIL, z + 0.03, { bias: b });
};

export const draw = (px0, { sk, lag1, lag2 }, o = {}) => {
  const px = big(px0);
  const face = FACES[o.variant] ? o.variant : "c";
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5);
  const sway = p.sway || 0;

  // the cape: from the shoulders down the back, its tail a beat behind the body
  const t1 = -vx * 1.6 + sway * 0.6, t2 = -vx * 2.2 - vx2 * 1.8 + sway;
  px.part();
  px.poly([[C[0] - 3.6, C[1] - 1.6], [C[0] + 1.5, C[1] - 1.6], [P[0] - 1, P[1] + 2], [P[0] - 3.4 + t2 * 0.7, -6.4], [P[0] - 5.2 + t2, -8.2], [P[0] - 7.6 + t2, -6],
    [P[0] - 7.2 + t1, P[1] + 1.5], [C[0] - 6, C[1] + 3.5]], RED_D, 0.5, { round: 0.85 });
  px.toneLine(C[0] - 4.6, C[1] + 4, P[0] - 6 + t2 * 0.8, -8.5, -1, px._pid);

  // the far arm and its kite shield
  // ONE BODY (joint kit): plate, limbs, head share a part id, so none shadows or edges another
  const BID = px.body(1);
  px.limb([sF, eF, hdF], [2.1, 2, 1.8], STEEL, 1, { bias: -1 });
  px.body(0);
  const sx = hdF[0] * 0.7 + eF[0] * 0.3 + 0.8, sy = hdF[1] * 0.7 + eF[1] * 0.3 + 0.6, tl = p.shield ?? 0.08, cs = Math.cos(tl), sn = Math.sin(tl);
  const S = (x, y) => [sx + x * cs - y * sn, sy + x * sn + y * cs];
  px.part();
  px.poly([S(-4.6, -6.4), S(4.6, -6.4), S(4.9, 0.6), S(0, 8.2), S(-4.9, 0.6)], GOLD, 3.5, { round: 0.6, cast: 2 });
  px.poly([S(-3.5, -5.3), S(3.5, -5.3), S(3.7, 0.3), S(0, 6.5), S(-3.7, 0.3)], RED, 3.52, { round: 0.6 });
  // a gold crown on the field
  px.stamp(CROWN, sx - 2, sy - 3, { G: { m: GOLD, fix: 3 } }, 3.55, { cast: 0 });

  // legs
  px.body(1);
  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // the body: breastplate, then the surcoat's skirt over the hips, belt
  px.poly([[C[0] - 4.8, C[1] - 1.6], [C[0] + 5, C[1] - 1.6], [C[0] + 6.2, C[1] + 3.5], [P[0] + 4.8, P[1] - 2.6], [P[0] - 4.8, P[1] - 2.6], [C[0] - 6, C[1] + 3.5]], STEEL, 4, { round: 0.92, ny: -0.12, weld: 2 });
  const sk0 = [P[0] - 4.9, P[1] - 3], sk1 = [P[0] + 4.7, P[1] - 3], hemB = P[0] - 6 - vx * 1.2, hemF = P[0] + 5.8 - vx * 0.8, hy = P[1] + 3.6;
  const skirt = BID;
  px.poly([sk0, sk1, [hemF, hy], [hemF - 2.4, hy + 0.9], [P[0] + 0.4 - vx, hy], [hemB + 2.6, hy + 0.9], [hemB, hy]], RED, 4.2, { round: 0.9, cast: 0 });
  px.toneLine(P[0] + 0.6, P[1] - 0.5, P[0] + 0.5 - vx, hy - 0.6, -1, skirt);
  px.poly([sk0, sk1, [sk1[0] + 0.1, sk1[1] + 2], [sk0[0] - 0.1, sk0[1] + 2]], LEATHER, 4.25, { round: 0.9 });
  px.rect(P[0] + 1.2, P[1] - 3, 2, 2, GOLD, 4.3, { fix: 3 });
  // gold at the collar and down the breastplate's keel
  px.line(C[0] - 2.4, C[1] - 1.2, C[0] + 3.4, C[1] - 1.2, GOLD, 4.3);

  // the head
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  const Z = KZ({});
  stampFace(px0, grow(p.blink ? BLINKS[face] : HEADS[face], [2, 9], [6, 9]), Math.round(N[0] * SC), Math.round(N[1] * SC), LEG, Z.head, Z.head, { ax: 7, ay: 12, ball: [7.6, 6.4, 8.2, 8.2], cast: 0, edge: true }, "SsNEelBb");
  px.body(0);
  // the plume: red, rooted on the crown, streaming back a beat behind
  const pl = cl(vx * 2 + vx2 * 1.5, -3, 3) - sway * 0.5, rx0 = hx + 0.5, ry0 = hyy - 10;
  px.part();
  px.capsule(rx0, ry0 - 0.5, 1.5, rx0 - 2.2 - pl * 0.4, ry0 - 3, 2.1, RED, 6.5);
  px.capsule(rx0 - 2.2 - pl * 0.4, ry0 - 3, 2.1, rx0 - 5.6 - pl, ry0 - 1.4 + Math.abs(pl) * 0.3, 1.5, RED, 6.5);
  px.capsule(rx0 - 5.6 - pl, ry0 - 1.4, 1.4, rx0 - 7 - pl * 1.3, ry0 + 1.4, 0.8, RED, 6.5);

  // the sword through the near fist (its angle follows the forearm: see GRIP)
  const a = swordAngle(sk), d = [Math.sin(a), -Math.cos(a)], nrm = [-d[1], d[0]];
  const B = (t, s = 0) => [hdN[0] + d[0] * t + nrm[0] * s, hdN[1] + d[1] * t + nrm[1] * s];
  px.part();
  const bz = Z.sword;
  px.tag("sword");
  px.capsule(...B(3.4), 1.25, ...B(15.5), 1.05, BLADE, bz, { edge: true });
  px.capsule(...B(15.5), 1.05, ...B(17.6), 0.3, BLADE, bz, { edge: true });
  px.part();
  px.capsule(...B(-3), 0.9, ...B(1), 0.9, LEATHER, bz + 0.02);
  px.capsule(...B(2.9, -2.8), 0.85, ...B(2.9, 2.8), 0.85, GOLD, bz + 0.25, { edge: true });   // the crossguard across the top of the fist
  px.ellipse(...B(-3.6), 1.2, 1.2, GOLD, bz + 0.05);                                           // the pommel just below it
  px.tag(null);

  // the near arm over it all: pauldron, vambrace, gauntlet on the grip
  // (cocked back over the shoulder it passes BEHIND the helm, so the face stays open)
  const az = Z.arm;
  px.part(); px.tag("nearArm");
  px.limb([[sN[0], sN[1] + 0.5], eN, hdN], [2.2, 2.1, 1.9], STEEL, az, { weld: 2, weldRoot: 4 });
  px.ellipse(eN[0], eN[1], 1.8, 1.8, STEEL, az + 0.02, { vb: 0.25, weld: 2 });
  px.ellipse(hdN[0], hdN[1], 1.7, 2.2, MAIL, az + 0.2, { weld: 1.5, rot: -a });   // the fist wraps the hilt: long axis along it
  px.tag(null);
  px.ellipse(sN[0] - 0.2, sN[1] - 0.4, 3.7, 3.2, STEEL, 8.1, { weld: 2 });
  px.line(sN[0] - 3, sN[1] + 2.2, sN[0] + 2.6, sN[1] + 2.2, GOLD, 8.12);
  px.body(0);

  return { hand: [hdN[0] * SC, hdN[1] * SC], sw: a };
};

// the cut's smear: on the fastest frames the blade leaves a fan of light behind it
export const fx = (px0, F, info, clip) => {
  if (clip !== "attack") return;
  const px = big(px0);
  const a1 = swordAngle(F.sk), a0 = swordAngle(F.lag1);
  if (!(a1 - a0 > 0.5)) return;
  const [hx, hy] = F.sk.hdN, [gx, gy] = F.lag1.hdN, n = 10;
  const at = (t, r) => { const a = a0 + (a1 - a0) * t, x = gx + (hx - gx) * t, y = gy + (hy - gy) * t; return [x + Math.sin(a) * r, y - Math.cos(a) * r]; };
  // a crescent: thin where the blade was, full where it is
  const arc = (t0, rIn, m, z) => { const out = [], inn = []; for (let i = 0; i <= n; i++) { const t = t0 + (1 - t0) * (i / n); out.push(at(t, 18)); inn.unshift(at(t, 18 - (18 - rIn) * ((t - t0) / (1 - t0)) ** 1.4)); } px.poly([...out, ...inn], m, z, { noLine: true }); };
  arc(0, 9, SMEAR2, 20); arc(0.45, 13, SMEAR, 20.1);
};

const GUARD = { aN: [1.1, 0.95, 0], aF: [0.55, 0.72, 0], wrist: 0.35, shield: 0.06, fN: [-2, 0], fF: [2.4, 0] };
export const CLIPS = {
  idle: {
    n: 8, ms: 1700, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 0.9); return { ...GUARD, rise: 0.5 + 0.5 * b, aN: [1.1, 0.95 - 0.03 * (0.5 + 0.5 * b), 0], wrist: 0.35 + 0.03 * b2, sway: b2 * 0.8, blink: ph > 0.6 && ph < 0.72 ? 1 : 0 }; },
  },
  walk: {
    n: 8, ms: 720, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 5.4, lift: 2.8, swing: 0.4, bob: 1.2 }), a = Math.cos(ph * Math.PI * 2); return { ...w, aN: [1.1 + 0.05 * a, 0.9, 0], wrist: 0.3 + 0.05 * a, aF: [0.5 + 0.18 * a, 0.72, 0], shield: 0.06 + 0.05 * a }; },
  },
  attack: {
    n: 12, ms: 760, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      // the lift: the fist comes up the front to the chest and the blade stands up out of it; then the elbow
      // goes back and the forearm stands up behind the helm, the blade level behind the head (wrist cocked);
      // the down-swing carries the forearm over (the blade follows it round), the strike ends forearm forward-down
      { t: 0.09, e: "out", p: { rx: -0.4, drop: 0.25, lean: -0.04, twist: -0.2, rise: 0.15, aN: [1.1, 0.8, 0], wrist: 0.35, aF: [0.5, 0.75, 0], shield: -0.02, fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.18, e: "out", p: { rx: -1.1, drop: 0.55, lean: -0.1, twist: -0.6, rise: 0.35, hx: 0.6, aN: [3.4, 1, 0], wrist: 0.35, aF: [0.9, 0.8, 0], shield: -0.08, fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.38, e: "io", p: { rx: -1.6, drop: 0.8, lean: -0.15, twist: -0.8, rise: 0.5, hx: 0.7, aN: [3.5, 1, 0], wrist: 0.35, aF: [1.05, 0.8, 0], shield: -0.1, fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.45, e: "out", p: { rx: 0.4, drop: 1.0, lean: 0.05, twist: 0.1, rise: 0.2, hx: 0.6, aN: [1.7, 0.95, 0], wrist: 0.2, aF: [0.5, 0.8, 0], shield: 0.1, fN: [-2.4, 0], fF: [4, 0] } },
      { t: 0.5, e: "in3", p: { rx: 2.4, drop: 1.6, lean: 0.2, twist: 0.8, hx: 0.5, aN: [0.6, 1, 0], wrist: 0.35, aF: [0.2, 0.8, 0], shield: 0.25, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.62, e: "out", p: { rx: 3, drop: 2, lean: 0.27, twist: 0.9, hx: 0.6, aN: [0.3, 0.96, 0], wrist: 0.1, aF: [0.05, 0.82, 0], shield: 0.3, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.74, e: "io", p: { rx: 2.6, drop: 1.6, lean: 0.2, twist: 0.6, hx: 0.4, aN: [0.5, 0.94, 0], wrist: 0.1, aF: [0.15, 0.8, 0], shield: 0.25, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 1, e: "io", p: GUARD },
    ], ph),
  },
};
