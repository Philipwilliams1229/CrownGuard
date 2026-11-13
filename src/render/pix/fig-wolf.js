// ============ FIGURE: the Dire Wolf (game type `wolf`) ============
// The fastest thing in the Greenwood: lean, long-legged, deep in the chest and
// tucked at the waist, about 60 px nose to tail-tip and 25 at the shoulder. Grey
// fur, a paler belly, throat and muzzle, a darker ruff along the neck and
// shoulders whose hackles stand when it is still and stream when it runs, a
// bushy dark-tipped tail, pricked ears that lie flat at speed, yellow eyes, a
// long snout with the teeth showing. Built on beast.js (four legs).
// Clips: idle (a low snarl), walk (its RUN: a hound's two-flight gallop), attack
// (crouch, a lunging snap, a shake, back).
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys } from "./rig.js";
import { QUAD, beastFrames, solveBeast, tailPts, gallop } from "./beast.js";

const FUR = mat("#8f929c"), PALE = mat("#aab0ba"), MANE = mat("#585b6b"), BONE = mat("#ece0c4");
const SNAP = flat("#f6f1e2"), SNAP2 = flat("#cfccc8");
const EYE = flat("#e0b840"), GLINT = flat("#fff0a0"), NOSE = flat("#2a2430"), MOUTH = flat("#3a1820"), TONGUE = flat("#c0505c");

// The head, facing +x: the skull (F), a dark brow (B) over a yellow eye (E, e
// its glint), the stop, then the long muzzle: lit along its top (L), pale on
// the cheek and jaw (P, p), the nose (N) proud of everything.
const HEAD = [
  ".....FFFFF........",
  "...FFFFFFFFF......",
  "..FFFFFFFFFFF.....",
  ".FFFFFFFBBBBF.....",
  ".FFFFFFFBEeFLLLL..",
  "FFFFFFFFBEEPPPPPNN",
  "FFFFFFFPPPPPPPPPNN",
  "fFFFPPPPPPMMMMMM..",
  "PfFPPPPPpppppp....",
  ".PPfPPpppppp......",
  "..PPPfpp..........",
  "...P.P............",
];
const swap = (rows, map) => { const out = rows.map((r, i) => map[i] ?? r); for (const k of Object.keys(map)) if (+k >= rows.length) out[+k] = map[k]; return out; };
// the snarl: the lip lifted off the fangs
const SNARL = swap(HEAD, { 6: "FFFFFFFPPPLLLLLLNN", 7: "fFFFPPPPPMTMTMTT..", 8: "PfFPPPPPMMMMMM....", 9: ".PPfPPpTpTpTp....." });
const SNARL2 = swap(SNARL, { 7: "fFFFPPPPPTMTMTMT..", 9: ".PPfPPppTpTpp....." });
const BLINK = swap(SNARL, { 4: ".FFFFFFFBBBFLLLL..", 5: "FFFFFFFFFFFPPPPPNN" });
// the jaws wide: the lower one dropped away under the fangs, the tongue in the dark
const BITE = swap(HEAD, {
  6: "FFFFFFFPPPTMTMTTNN".slice(0, 16) + "..", 7: "fFFFPPPPMMMMMMM...", 8: "PfFPPPPMMRRRMM....", 9: ".PPfPPPpMMRRRM....",
  10: "..PPPfPppTMTMp....", 11: "...P.PfpppppP.....", 12: "........ppp.......",
});
// clamped shut on what it caught: the muzzle wrinkled, the eye narrowed
const CLAMP = swap(HEAD, { 4: ".FFFFFFFBBBFLLLL..", 5: "FFFFFFFFBEePPPPPNN", 7: "fFFFPPPPPTTMTMTM.." });
const LEG = {
  F: { m: FUR }, f: { m: FUR, bias: -1 }, P: { m: PALE }, p: { m: PALE, bias: -1 }, L: { m: PALE, fix: 3 }, B: { m: MANE, fix: 0 },
  E: { m: EYE }, e: { m: GLINT }, N: { m: NOSE }, M: { m: MOUTH }, T: { m: BONE, fix: 4 }, R: { m: TONGUE },
};
// an ear pricked, and laid flat back (R fur, d the dark inside)
const EAR_UP = ["...R.", "..RR.", ".RdR.", ".RddR", "RRddR", "RRRRR"];
const EAR_BACK = ["RRR...", ".RRdRR", "...RRR"];
const EARLEG = { R: { m: FUR }, d: { m: MANE, fix: 1 } }, EARLEG_F = { R: { m: FUR, bias: -1 }, d: { m: MANE, fix: 0 } };

export const BOX = { w: 98, h: 48, ox: 44, oy: 40 };
export const BONES = HUMAN;               // unused: the wolf stands on beast.js's bones
const Q = { ...QUAD, spine: 19, height: 23.5, foreU: 9.5, foreL: 8.5, hindU: 11, hindL: 9.5, hindX: -4.5, tail: [6, 6, 5] };

const cl = (v, a, b) => Math.max(a, Math.min(b, v));

const leg = (px, l, z, bias) => {
  const { j, k, a } = l, o = { bias, cast: 1 };
  px.part();
  if (l.fore) {
    // the shoulder's muscle on the chest, then the upper leg
    if (!l.far) px.ellipse(j[0] - 0.4, j[1] - 0.6, 3.3, 4, FUR, z, { ...o, rot: 0.3 });
    px.capsule(j[0], j[1], 2.6, k[0], k[1], 1.8, FUR, z, o);
  } else {
    // the haunch: a broad thigh whose muscle stands forward of the hip-to-hock line
    const mx = (j[0] + k[0]) / 2, my = (j[1] + k[1]) / 2, dx = k[0] - j[0], dy = k[1] - j[1], d = Math.hypot(dx, dy) || 1;
    px.capsule(j[0], j[1], 3.9, k[0], k[1], 1.6, FUR, z, o);
    px.ellipse(mx + (dy / d) * 2.6 - (dx / d) * 1.6, my - (dx / d) * 2.6 - (dy / d) * 1.6, 3, 3, FUR, z, o);
  }
  px.capsule(k[0], k[1], 1.6, a[0], a[1], 1.25, FUR, z, o);
  // the pad: flat on the ground; in the air it carries on down the leg's own line, the toes turned a little forward
  const up = cl(l.lift / 3, 0, 1), pa = 0.1 + up * (Math.atan2(a[1] - k[1], a[0] - k[0]) - 0.55 - 0.1);
  px.capsule(a[0], a[1] + 0.3, 1.25, a[0] + Math.cos(pa) * 2.7, a[1] + 0.3 + Math.sin(pa) * 2.5 + (1 - up) * 0.2, 1.05, FUR, z, o);
};

// the hackles' heights and leans, front to back: uneven on purpose (an even row reads as a comb)
const TUFTS = [[1.2, 0.5], [2.6, 1], [1.6, 0.7], [3, 1.2], [2, 1], [1.2, 0.6]];

export const draw = (px, F) => {
  const { b, b1, b2 } = beastFrames(F, Q), p = b.p;
  const hx = Math.round(b.K[0]), hy = Math.round(b.K[1]);
  // how the head and the withers moved over the last beat: what hangs trails by that
  const vx = cl(b.K[0] - b1.K[0], -3, 3), wx = cl(b.W[0] - b1.W[0], -3, 3), wy = cl(b.W[1] - b1.W[1], -2, 2);

  // the far legs, a tone down
  leg(px, b.FH, 1, -1);
  leg(px, b.FF, 1.2, -1);

  // the tail: bushy, thickest in the middle, a dark tip
  const t = tailPts(b, b1, b2);
  px.part();
  px.capsule(t[0][0], t[0][1], 2.2, t[1][0], t[1][1], 3.3, FUR, 2.5);
  px.capsule(t[1][0], t[1][1], 3.3, t[2][0], t[2][1], 3, FUR, 2.5);
  px.capsule(t[2][0], t[2][1], 2.9, t[3][0], t[3][1], 0.9, MANE, 2.52);

  // the body: a deep chest, a tucked waist, the haunch; the chest's underside paler
  const ch = b.at(0.26, 0, 5.2), hn = b.at(-0.36, 0, 4.2), wa = b.at(-0.3, 0, 3.3);
  px.part();
  px.ellipse(ch[0], ch[1], 7.2, 6.4, FUR, 4, { rot: b.ang(0.26) });
  px.capsule(ch[0] - 1, ch[1] - 0.8, 5.4, wa[0], wa[1], 3.4, FUR, 4);
  px.ellipse(hn[0], hn[1], 5.2, 4.8, FUR, 4);
  const bodyId = px._pid;
  const be0 = b.at(0.36, 0, 9.6), be1 = b.at(0.04, 0, 8), cf = b.at(0.5, 0.8, 7.2);
  px.capsule(be0[0], be0[1], 2.2, be1[0], be1[1], 1.2, PALE, 4.02);
  px.ellipse(cf[0], cf[1], 3.2, 3.8, PALE, 4.02);

  // the neck, the pale throat under it
  const n0 = b.at(0.42, 0, 3.6), n1 = [b.K[0] - 1.5, b.K[1] + 1];
  px.capsule(n0[0], n0[1], 5.6, n1[0], n1[1], 4.6, FUR, 4.3);
  px.capsule(n0[0] + 3.4, n0[1] + 3.8, 2.6, n1[0] + 1, n1[1] + 3, 2.4, PALE, 4.32);

  // the ruff: darker fur over the neck and down the shoulder, its hackles standing (idle) or laid back and streaming
  const hk = p.hackle ?? 0;
  const m0 = [b.K[0] - 3, b.K[1] - 2.6], m1 = b.at(0.47, 0, 0.4), m2 = b.at(0.08, 0, 0.2), sj = b.NF.j;
  px.part();
  px.capsule(m0[0], m0[1], 2.6, m1[0], m1[1], 3.6, MANE, 4.6, { cast: 0, bias: -1, floor: 1 });
  px.capsule(m1[0], m1[1], 3.6, m2[0], m2[1], 1.8, MANE, 4.6, { cast: 0, bias: -1, floor: 1 });
  px.poly([[m1[0] - 5, m1[1]], [m1[0] + 4.4, m1[1] + 0.6], [sj[0] + 2.4, sj[1] - 3.4], [sj[0] - 1.4, sj[1] - 1.6]], MANE, 4.6, { cast: 0, round: 0.7, bias: -1, floor: 1 });
  const top = (u) => (u < 0.45 ? [m0[0] + (m1[0] - m0[0]) * (u / 0.45), m0[1] + (m1[1] - m0[1]) * (u / 0.45) - 2.4 - u * 2] : [m1[0] + (m2[0] - m1[0]) * ((u - 0.45) / 0.55), m1[1] + (m2[1] - m1[1]) * ((u - 0.45) / 0.55) - 3.3 + (u - 0.45) * 2.6]);
  TUFTS.forEach(([h, ln], i) => {
    const q = top((i + 0.5) / TUFTS.length), x = Math.round(q[0]), y = Math.round(q[1]);
    const up = 0.6 + h * (0.25 + hk * 0.75), bk = ln * (1 + (1 - hk) * 2.2) + wx * 1.2 - (1 - hk) * 0;
    px.poly([[x - 1.6, y + 1.4], [x + 1.6, y + 1.2], [x - bk, y - up + wy * (i % 2 ? 0.9 : 0.5)]], MANE, 4.6, { fix: 1, cast: 0 });
  });

  // the dark saddle down the back
  for (let u = -0.42; u < 0.1; u += 0.04) { const q = b.at(u, 0, 0.3); px.tone(q[0], q[1], -1, bodyId); }

  // the head, with its ears
  const back = (p.ear ?? 0) > 0.5;
  const grid = p.blink ? BLINK : p.jaw > 0.8 ? BITE : p.clamp > 0.5 ? CLAMP : p.jaw > 0.4 ? (p.lip ? SNARL2 : SNARL) : HEAD;
  const ev = Math.round(vx * 0.4);
  px.part();
  if (back) px.stamp(EAR_BACK, hx + 3 - ev, hy - 5, EARLEG_F, 5.5, { ax: 5, ay: 2 });
  else px.stamp(EAR_UP, hx + 4, hy - 5, EARLEG_F, 5.5, { ax: 2, ay: 5 });
  px.part();
  px.stamp(grid, hx, hy, LEG, 6, { ax: 4, ay: 5, ball: [8, 5, 10, 7], cast: 1 });
  px.part();
  if (back) px.stamp(EAR_BACK, hx - ev, hy - 3, EARLEG, 6.5, { ax: 5, ay: 2 });
  else px.stamp(EAR_UP, hx, hy - 4 + (p.twitch ? 1 : 0), EARLEG, 6.5, { ax: 2, ay: 5 });

  // the near legs, in front of it all
  leg(px, b.NH, 7, 0);
  leg(px, b.NF, 7.2, 0);
  return {};
};

// the snap: one small crescent ahead of the jaws on the frame they shut
export const fx = (px, F, info, clip) => {
  if (clip !== "attack") return;
  const p = F.sk.p, l = F.lag1.p;
  if (!((l.jaw ?? 0) > 0.45 && (p.clamp ?? 0) > 0.35 && (p.jaw ?? 0) < 0.75)) return;
  const b = solveBeast(p, Q), cx = Math.round(b.K[0]) + 10, cy = Math.round(b.K[1]) + 2;
  const arc = (r0, r1, a0, a1, m, z) => {
    const out = [], inn = [], n = 8;
    for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + (a1 - a0) * t, w = Math.sin(Math.PI * t); out.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]); inn.unshift([cx + Math.cos(a) * (r0 - (r0 - r1) * w), cy + Math.sin(a) * (r0 - (r0 - r1) * w)]); }
    px.poly([...out, ...inn], m, z, { noLine: true });
  };
  arc(8.4, 6, -1.05, 1.05, SNAP2, 20); arc(8.4, 6.9, -0.6, 0.6, SNAP, 20.1);
};

const STAND = { drop: 0.6, pitch: 0.05, arch: 0.06, neck: 0.02, hx: 0, hy: 0, jaw: 0.5, tail: -0.62, curl: 0.2, hackle: 1, ear: 0, clamp: 0,
  fNF: [-0.5, 0], fFF: [3, 0], fNH: [-2, 0], fFH: [3, 0] };
export const CLIPS = {
  idle: {
    n: 8, ms: 1500, loop: true, lag: 0.1,
    pose: (ph) => {
      const s = Math.sin(ph * Math.PI * 2), s2 = Math.sin(ph * Math.PI * 2 - 1.1);
      return { ...STAND, drop: 0.6 + 0.5 * (0.5 + 0.5 * s), neck: 0.02 - 0.06 * (0.5 + 0.5 * s2), hackle: 0.85 + 0.15 * s, tail: -0.62 + 0.2 * s2, curl: 0.2 + 0.12 * s,
        lip: ph >= 0.2 && ph < 0.55 ? 1 : 0, blink: ph >= 0.74 && ph < 0.86 ? 1 : 0, twitch: ph >= 0.36 && ph < 0.5 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 330, loop: true, lag: 0.09,
    pose: (ph) => {
      const g = gallop(ph, { travel: 60, duty: 0.24, lift: 5.5, flex: 0.56, flexBias: 0.3, rock: 0.14, bob: 1.6, kick: [16, 9], reach: [12, 5], foreX: 2, hindX: 4 });
      return { ...STAND, ...g, drop: g.drop + 1.2, neck: 0.1 + g.nod, hx: -g.g * 1.2, hy: 0, jaw: 0, hackle: 0.1, ear: 1, tail: 0.3 - g.g * 0.12, curl: -0.04 - g.g * 0.08 };
    },
  },
  attack: {
    n: 10, ms: 600, loop: false, lag: 0.08,
    pose: (ph) => sampleKeys([
      { t: 0, p: STAND },
      // the crouch: weight back on the haunches, the chest to the ground, ears flat
      { t: 0.2, e: "out", p: { ...STAND, rx: -3, drop: 4, pitch: 0.2, arch: 0.3, neck: 0.02, hy: 1, ear: 1, tail: -0.5, curl: 0.1 } },
      { t: 0.32, e: "io", p: { ...STAND, rx: -3.8, drop: 4.6, pitch: 0.22, arch: 0.36, neck: 0, hy: 1, ear: 1, tail: -0.4, curl: 0.1 } },
      // the lunge: off the hind legs, the spine thrown straight, the forefeet off the ground, the jaws wide
      { t: 0.46, e: "in3", p: { ...STAND, rx: 6.5, drop: 0.4, pitch: -0.2, arch: -0.26, neck: 0.42, hx: 3, hy: 0, jaw: 1, ear: 1, hackle: 0.3, tail: 0.3, curl: 0,
        fNF: [30, 12], fFF: [27, 14], fNH: [-1, 0], fFH: [3.5, 0] } },
      // the snap: the jaws shut on it as the forefeet come down
      { t: 0.56, e: "out", p: { ...STAND, rx: 7.5, drop: 1.6, pitch: 0, arch: -0.12, neck: 0.3, hx: 4, hy: 1, jaw: 0, clamp: 1, ear: 1, hackle: 0.3, tail: 0.2, curl: 0,
        fNF: [9, 0], fFF: [7, 0], fNH: [1, 0], fFH: [3.5, 0] } },
      // the shake: the head wrenched back and up with it
      { t: 0.7, e: "io", p: { ...STAND, rx: 5, drop: 1.2, pitch: -0.06, arch: 0.1, neck: 0.5, hx: 1, hy: -1, jaw: 0, clamp: 1, ear: 1, hackle: 0.6, tail: -0.2, curl: 0.2,
        fNF: [9, 0], fFF: [7, 0], fNH: [1, 0], fFH: [3.5, 0] } },
      // and back
      { t: 0.86, e: "io", p: { ...STAND, rx: 1.5, drop: 0.2, neck: 0.2, fNF: [4, 2.4], fFF: [2, 1.2], fNH: [0, 1.2], fFH: [2, 0], ear: 0.6 } },
      { t: 1, e: "out", p: STAND },
    ], ph),
  },
};
