// ============ FIGURE: the Rime Wolf-Rider (game type `rimerider`) and the loose frost wolf ============
// A clan raider astride a great white frost wolf, fast as the wind off the ice. The wolf is the
// Greenwood dire wolf's build in a snow coat: a paler belly and throat, a slate-blue ruff and saddle
// that stand when it is still and stream when it runs, rime on the hackles, ice-blue eyes, a teal
// saddle cloth trimmed in ochre and a bone-studded breast strap. The rider is the thrall's "bold"
// look (a horned helm and nasal, a mantle of shaggy white fur, a forked flax beard, a big painted
// round shield slung on his back, a long bearded Dane axe) seated on the withers. About 62 px with
// the horns; the wolf alone stands 27 px at the shoulder.
// The wolf stands on beast.js (four legs); the rider's joints are placed here and his elbows and
// knee solved with `ik`, so his bones keep their length. He rides a beat behind the back under him.
//   o.variant === "loose": the same wolf with NO rider (the game crumbles this one when the wolf
//   dies and the raider rolls clear: game type `rimewolf`). All three clips work.
// Clips: idle (the wolf's low snarl, the raider's axe on his shoulder), walk (its RUN: a hound's
// two-flight gallop, the rider hunched low over the ruff), attack (the wolf crouches and lunges,
// the axe goes up behind his head and comes down across the snapping jaws; lands at 0.5). fx: the
// axe's smear and the jaws' snap.
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys, ik, solve } from "./rig.js";
import { QUAD, beastFrames, solveBeast, tailPts, gallop, legChain } from "./beast.js";

// the wolf
const FUR = mat("#d6dde6"), PALE = mat("#f2f5f8"), MANE = mat("#8294ae"), BONE = mat("#ece0c4");
const SNAP = flat("#f6f8fc"), SNAP2 = flat("#bccadc");
const EYE = flat("#9fe4ff", { emis: true }), GLINT = flat("#f4fdff", { emis: true }), NOSE = flat("#2a2c3a"), MOUTH = flat("#3a1c2c"), TONGUE = flat("#c0505c");
// the harness and the rider
const TEAL = mat("#3e6470"), TEAL_D = mat("#2a5260"), OCHRE = mat("#d8a040"), LEATHER = mat("#6a4a30"), DARK = mat("#3a2a20"), WOOL = mat("#8a7a5a");
const SKIN = mat("#e2b48c"), FURW = mat("#eef0ee"), IRON = mat("#9aa0ac", { contrast: 1.2 }), IRON_D = mat("#5e646e"), STEEL = mat("#c8ccd2", { contrast: 1.3 });
const WOODM = mat("#7a5632"), FLAX = mat("#d8b868"), BRASS = mat("#c8a040");
const EYER = flat("#2a1c2c"), FROST = flat("#eaf6ff"), SMEAR = flat("#f4f8ff", { emis: true, line: "#b8c8d8" });

// The wolf's head (fig-wolf.js's), facing +x: F the skull, a dark brow (B), the ice-blue eye (E, e
// its glint), the stop, the long muzzle lit along its top (L), pale cheek and jaw (P, p), the nose (N).
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
const SNARL = swap(HEAD, { 6: "FFFFFFFPPPLLLLLLNN", 7: "fFFFPPPPPMTMTMTT..", 8: "PfFPPPPPMMMMMM....", 9: ".PPfPPpTpTpTp....." });
const SNARL2 = swap(SNARL, { 7: "fFFFPPPPPTMTMTMT..", 9: ".PPfPPppTpTpp....." });
const BLINK = swap(SNARL, { 4: ".FFFFFFFBBBFLLLL..", 5: "FFFFFFFFFFFPPPPPNN" });
const BITE = swap(HEAD, {
  6: "FFFFFFFPPPTMTMTTNN".slice(0, 16) + "..", 7: "fFFFPPPPMMMMMMM...", 8: "PfFPPPPMMRRRMM....", 9: ".PPfPPPpMMRRRM....",
  10: "..PPPfPppTMTMp....", 11: "...P.PfpppppP.....", 12: "........ppp.......",
});
const CLAMP = swap(HEAD, { 4: ".FFFFFFFBBBFLLLL..", 5: "FFFFFFFFBEePPPPPNN", 7: "fFFFPPPPPTTMTMTM.." });
const LEG = {
  F: { m: FUR }, f: { m: FUR, bias: -1 }, P: { m: PALE }, p: { m: PALE, bias: -1 }, L: { m: PALE, fix: 3 }, B: { m: MANE, fix: 0 },
  E: { m: EYE }, e: { m: GLINT }, N: { m: NOSE }, M: { m: MOUTH }, T: { m: BONE, fix: 4 }, R: { m: TONGUE },
};
const EAR_UP = ["...R.", "..RR.", ".RdR.", ".RddR", "RRddR", "RRRRR"];
const EAR_BACK = ["RRR...", ".RRdRR", "...RRR"];
const EARLEG = { R: { m: FUR }, d: { m: MANE, fix: 1 } }, EARLEG_F = { R: { m: FUR, bias: -1 }, d: { m: MANE, fix: 0 } };

// The rider's head, facing +x a quarter turned (the thrall's bold one): iron helm and nasal (M, m, D),
// flax hair down the back (H), skin (S, s, N the nose), eyes (E), a forked flax beard (B).
const RTOP = [".....MMMM....", "...MMMMMMMM..", "..MMMMMMMMMM.", ".MMMMMMMMMMM.", ".DDDDDDDDDDD."];
const RFACE = [".HMMsDDsDDs..", ".HMMSESDSES..", ".HmMSESDSESN.", ".HHMSSSDSSSN.", ".HHmBBBBBBB..", "..HBBBBBBBB..", "..HHBBBBB.B.."];
const RHEAD = [...RTOP, ...RFACE], RBLINK = RHEAD.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : r));
// the war-cry: the beard parted over a dark mouth
const RROAR = RHEAD.map((r, i) => (i === 10 ? ".HHmBBXXXBB.." : i === 11 ? "..HBBBXXXBB.." : r));
const RLEG = {
  M: { m: IRON }, m: { m: IRON, bias: -1 }, D: { m: IRON_D, fix: 1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  E: { m: EYER }, H: { m: FLAX }, B: { m: FLAX, fix: 2 }, X: { m: MOUTH },
};

export const BOX = { w: 118, h: 86, ox: 54, oy: 76 };
export const BONES = HUMAN;               // unused: the wolf stands on beast.js's bones
const Q = { ...QUAD, spine: 21, height: 25.5, foreU: 10, foreL: 9, hindU: 11.5, hindL: 10, hindX: -4.5, tail: [6, 6, 5], sh: [-1, 5.5], hip: [1, 4.5] };
// the rider's bones
const R = { thigh: 7, shin: 6.4, spine: 8.6, upper: 6.2, fore: 5.8 };

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// A leg is one welded limb of the wolf's one body (pix.js body / limb): shoulder or hip, wrist or hock,
// pad joint in a single tube with one radius at each joint, a near leg's root fading into the barrel's
// own shading; the shoulder's muscle and the haunch are welded in, never lit shapes of their own.
const leg = (px, l, z, bias) => {
  const { j, k, a } = l, near = !l.far, o = { bias, cast: 1, weld: near ? 3 : 0, weldRoot: near ? 5 : 0 }, ow = { ...o, weld: 3, weldRoot: 0 };
  if (l.fore) {
    px.limb(legChain(l), [2.8, 1.9, 1.35], FUR, z, o);
    if (near) px.ellipse(j[0] - 0.4, j[1] - 0.6, 3.5, 4.2, FUR, z + 0.01, { ...ow, rot: 0.3 });
  } else {
    const mx = (j[0] + k[0]) / 2, my = (j[1] + k[1]) / 2, dx = k[0] - j[0], dy = k[1] - j[1], d = Math.hypot(dx, dy) || 1;
    px.limb(legChain(l), [4.1, 1.7, 1.35], FUR, z, o);
    if (near) px.ellipse(mx + (dy / d) * 2.7 - (dx / d) * 1.6, my - (dx / d) * 2.7 - (dy / d) * 1.6, 3.2, 3.2, FUR, z + 0.01, ow);
  }
  // the pad, with a little feather of fur over it
  const up = cl(l.lift / 3, 0, 1), pa = 0.1 + up * (Math.atan2(a[1] - k[1], a[0] - k[0]) - 0.55 - 0.1);
  px.capsule(a[0], a[1] + 0.3, 1.35, a[0] + Math.cos(pa) * 2.9, a[1] + 0.3 + Math.sin(pa) * 2.6 + (1 - up) * 0.2, 1.15, FUR, z, { ...o, weld: 0, weldRoot: 0 });
};

const TUFTS = [[1.2, 0.5], [2.6, 1], [1.6, 0.7], [3, 1.2], [2, 1], [1.2, 0.6]];

// ---- the rider's joints, from the wolf's frame and the pose's rider fields -------------------
// Shared by the drawing and the axe's smear (fx asks it for earlier moments).
const rideOf = (b, b1, b2) => {
  const p = b.p;
  const s0 = b.at(0.06, 0, -1.8), s1 = b1.at(0.06, 0, -1.8), s2 = b2.at(0.06, 0, -1.8);
  const late = s1[1] * 0.65 + s2[1] * 0.35, air = cl(s0[1] - late, 0, 2.5), press = cl(late - s0[1], 0, 2);
  const H = [s0[0], s0[1] - air];
  const lean = (p.rLean ?? 0.2) + press * 0.05 - air * 0.04, sp = R.spine - press * 0.5;
  const C = [H[0] + Math.sin(lean) * sp, H[1] - Math.cos(lean) * sp];
  const N = [C[0] + Math.sin(lean) * 1.2 + 1.8 + (p.rHx ?? 0), C[1] - 0.6 + (p.rHy ?? 0)];
  const tw = p.rTwist ?? 0, sN = [C[0] - 2.4 + tw * 1.4, C[1] + 0.9], sF = [C[0] + 2.4 - tw * 1.4, C[1] - 0.1];
  const [ang, reach] = p.rArm ?? [1, 0.6], len = R.upper + R.fore;
  const na = ik(sN[0], sN[1], sN[0] + Math.sin(ang) * reach * len, sN[1] + Math.cos(ang) * reach * len, R.upper, R.fore, 1);
  return { H, C, N, sN, sF, na, lean, air, press };
};

// the long bearded Dane axe: a = 0 haft straight up, PI/2 level before him
const axe = (px, h, a, z) => {
  const L = 17, k = 1.5, d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)];
  const at = (f, s) => [h[0] + d[0] * f + n[0] * s, h[1] + d[1] * f + n[1] * s];
  px.part();
  px.capsule(...at(-4, 0), 0.85, ...at(L + 1, 0), 0.85, WOODM, z, { edge: true });
  px.part();
  px.poly([at(L - 2.2 * k, 0.4), at(L - 3.6 * k, 3.4 * k), at(L - 1 * k, 4.6 * k), at(L + 1.6 * k, 3.2 * k), at(L + 1.6 * k, 0.4)], STEEL, z + 0.02, { fix: 2 });
  px.poly([at(L - 3.6 * k, 3.4 * k), at(L - 1 * k, 4.6 * k), at(L + 1.6 * k, 3.2 * k), at(L + 1 * k, 2.6 * k), at(L - 1 * k, 3.4 * k)], STEEL, z + 0.03, { fix: 4 });
  px.poly([at(L - 1.6, -0.4), at(L + 1.2, -0.4), at(L + 1.4, -4.2)], IRON_D, z + 0.01, { fix: 1 });
  px.poly([at(L - 2.6, -0.8), at(L + 1.8, -0.8), at(L + 1.8, 0.9), at(L - 2.6, 0.9)], IRON_D, z + 0.04, { fix: 1 });
  return at;
};

const horn = (px, x0, y0, dir, z) => {
  const pts = [[x0, y0, 1.9], [x0 + dir * 3.2, y0 - 1.2, 1.6], [x0 + dir * 5.4, y0 - 4, 1.2], [x0 + dir * 6.2, y0 - 7.6, 0.8], [x0 + dir * 5.8, y0 - 10, 0.4]];
  for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
};

const wolf = (px, b, b1, b2, rider) => {
  const p = b.p;
  const hx = Math.round(b.K[0]), hy = Math.round(b.K[1]);
  const vx = cl(b.K[0] - b1.K[0], -3, 3), wx = cl(b.W[0] - b1.W[0], -3, 3), wy = cl(b.W[1] - b1.W[1], -2, 2);

  // the wolf is one body: no part shadows or edges another (the head's grid and the ears keep theirs)
  const BID = px.body(1);
  leg(px, b.FH, 1, -1);
  leg(px, b.FF, 1.2, -1);

  // the tail: bushy, thickest in the middle, a slate tip
  const t = tailPts(b, b1, b2);
  px.part();
  px.capsule(t[0][0], t[0][1], 2.3, t[1][0], t[1][1], 3.5, FUR, 2.5);
  px.capsule(t[1][0], t[1][1], 3.5, t[2][0], t[2][1], 3.1, FUR, 2.5);
  px.capsule(t[2][0], t[2][1], 3, t[3][0], t[3][1], 0.9, MANE, 2.52);

  // the body: a deep chest, a tucked waist, the haunch; the chest's underside paler
  const ch = b.at(0.26, 0, 5.4), hn = b.at(-0.36, 0, 4.4), wa = b.at(-0.3, 0, 3.5);
  px.part();
  px.ellipse(ch[0], ch[1], 7.6, 6.8, FUR, 4, { rot: b.ang(0.26) });
  px.capsule(ch[0] - 1, ch[1] - 0.8, 5.7, wa[0], wa[1], 3.6, FUR, 4);
  px.ellipse(hn[0], hn[1], 5.5, 5, FUR, 4);
  const bodyId = BID;
  const be0 = b.at(0.36, 0, 10), be1 = b.at(0.04, 0, 8.4), cf = b.at(0.5, 0.8, 7.4);
  px.capsule(be0[0], be0[1], 2.3, be1[0], be1[1], 1.3, PALE, 4.02);
  px.ellipse(cf[0], cf[1], 3.3, 3.9, PALE, 4.02);

  // the neck, the pale throat under it
  const n0 = b.at(0.42, 0, 3.8), n1 = [b.K[0] - 1.5, b.K[1] + 1];
  px.capsule(n0[0], n0[1], 5.9, n1[0], n1[1], 4.8, FUR, 4.3);
  px.capsule(n0[0] + 3.6, n0[1] + 4, 2.7, n1[0] + 1, n1[1] + 3.2, 2.5, PALE, 4.32);
  px.body(0);
  // the breast strap: teal, studded with bone, across the chest
  px.part();
  const bs0 = b.at(0.4, 0, 1), bs1 = b.at(0.36, 0, 9.6);
  px.capsule(bs0[0] + 2.4, bs0[1], 0.95, bs1[0] + 4.4, bs1[1] - 0.6, 0.95, TEAL, 4.4, { floor: 1 });
  for (const u of [0.3, 0.62]) { const q = mix([bs0[0] + 2.4, bs0[1]], [bs1[0] + 4.4, bs1[1] - 0.6], u); px.dot(q[0], q[1], BONE, 4.45, { fix: 3 }); }

  px.body(1);
  // the ruff: slate fur over the neck and down the shoulder, its hackles standing (idle) or laid back and streaming
  const hk = p.hackle ?? 0;
  const m0 = [b.K[0] - 3, b.K[1] - 2.6], m1 = b.at(0.47, 0, 0.4), m2 = b.at(0.08, 0, 0.2), sj = b.NF.j;
  px.part();
  px.capsule(m0[0], m0[1], 2.8, m1[0], m1[1], 3.8, MANE, 4.6, { cast: 0, bias: -1, floor: 1 });
  px.capsule(m1[0], m1[1], 3.8, m2[0], m2[1], 1.9, MANE, 4.6, { cast: 0, bias: -1, floor: 1 });
  px.poly([[m1[0] - 5, m1[1]], [m1[0] + 4.6, m1[1] + 0.6], [sj[0] + 2.6, sj[1] - 3.4], [sj[0] - 1.4, sj[1] - 1.6]], MANE, 4.6, { cast: 0, round: 0.7, bias: -1, floor: 1 });
  const top = (u) => (u < 0.45 ? [m0[0] + (m1[0] - m0[0]) * (u / 0.45), m0[1] + (m1[1] - m0[1]) * (u / 0.45) - 2.6 - u * 2] : [m1[0] + (m2[0] - m1[0]) * ((u - 0.45) / 0.55), m1[1] + (m2[1] - m1[1]) * ((u - 0.45) / 0.55) - 3.5 + (u - 0.45) * 2.6]);
  TUFTS.forEach(([h, ln], i) => {
    const q = top((i + 0.5) / TUFTS.length), x = Math.round(q[0]), y = Math.round(q[1]);
    const up = 0.6 + h * (0.25 + hk * 0.75), bk = Math.min(4, ln * (1 + (1 - hk) * 2.2) + wx * 0.6);
    px.poly([[x - 1.6, y + 1.4], [x + 1.6, y + 1.2], [x - bk, y - up + wy * (i % 2 ? 0.9 : 0.5)]], MANE, 4.6, { fix: 1, cast: 0 });
    if (i % 2 === 0) px.dot(x - bk * 0.4, y - up * 0.7, FROST, 4.65, { noLine: true });      // rime on the tips
  });
  px.body(0);
  px.body(1);
  // the dark saddle down the back (under the cloth, it shows fore and aft)
  for (let u = -0.42; u < 0.1; u += 0.04) { const q = b.at(u, 0, 0.3); px.tone(q[0], q[1], -1, bodyId); }

  px.body(0);
  // the saddle cloth: teal, hanging each side of the spine, an ochre hem and a bone toggle
  px.part();
  const A0 = b.at(0.3, 0, -1.2), A1 = b.at(0.3, 0, 6.8), B0 = b.at(-0.12, 0, -1.2), B1 = b.at(-0.14, 0, 7.4), M1 = b.at(0.08, 0, 8.4);
  px.poly([A0, B0, B1, M1, A1], TEAL, 4.7, { round: 0.8, cast: 1 });
  px.line(A1[0], A1[1], M1[0], M1[1], OCHRE, 4.72, { fix: 3 }); px.line(M1[0], M1[1], B1[0], B1[1], OCHRE, 4.72, { fix: 3 });
  const dm = b.at(0.1, 0, 3.4);
  px.dot(dm[0], dm[1], OCHRE, 4.74, { fix: 3 }); px.dot(dm[0] + 2, dm[1] + 1, BONE, 4.74, { fix: 3 });
  // a loose rein, from the bit back over the withers
  if (!rider) {
    px.part();
    const r0 = [hx + 6, hy + 4], r1 = b.at(0.4, 0, 3), r2 = [r1[0] - 6 + vx * -0.6, r1[1] + 7 + wy];
    px.line(r0[0], r0[1], r1[0], r1[1], LEATHER, 4.8, { fix: 2 }); px.line(r1[0], r1[1], r2[0], r2[1], LEATHER, 4.8, { fix: 1 });
  }

  // the head, with its ears
  const back = (p.ear ?? 0) > 0.5;
  const grid = p.blink ? BLINK : p.jaw > 0.8 ? BITE : p.clamp > 0.5 ? CLAMP : p.jaw > 0.4 ? (p.lip ? SNARL2 : SNARL) : HEAD;
  const ev = Math.round(vx * 0.4);
  px.part();
  if (back) px.stamp(EAR_BACK, hx + 3 - ev, hy - 5, EARLEG_F, 5.5, { ax: 5, ay: 2 });
  else px.stamp(EAR_UP, hx + 4, hy - 5, EARLEG_F, 5.5, { ax: 2, ay: 5 });
  px.part();
  px.stamp(grid, hx, hy, LEG, 6, { ax: 4, ay: 5, ball: [8, 5, 10, 7], cast: 1 });
  // a bridle: a thin strap round the muzzle, an ochre stud at the cheek
  px.dot(hx + 10, hy + 1, TEAL, 6.2, { fix: 1 }); px.dot(hx + 6, hy + 1, OCHRE, 6.2, { fix: 3 });
  px.part();
  if (back) px.stamp(EAR_BACK, hx - ev, hy - 3, EARLEG, 6.5, { ax: 5, ay: 2 });
  else px.stamp(EAR_UP, hx, hy - 4 + (p.twitch ? 1 : 0), EARLEG, 6.5, { ax: 2, ay: 5 });
  // the near legs, in front of it all (they were missing: the white wolf ran on two)
  px.body(1);
  leg(px, b.NH, 7, 0);
  leg(px, b.NF, 7.2, 0);
  px.body(0);
};

const raider = (px, b, b1, b2) => {
  const p = b.p;
  const { H, C, N, sN, sF, na, lean } = rideOf(b, b1, b2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const s1 = b1.at(0.06, 0, -1.8), vx = cl((H[0] - s1[0]) * 1.6, -2, 2), vy = cl(H[1] - s1[1], -2, 2);

  // the far horn, behind the helm and the flax braid
  px.part();
  horn(px, hx - 3.4, hy - 8.4, -1, 7.5);
  px.part();
  const bx = -vx * 1.6, b0 = [hx - 4.8, hy - 3], b1p = [b0[0] - 1.8 + bx * 0.4, b0[1] + 4.4 - vy * 0.3], b2p = [b1p[0] - 0.4 + bx * 0.8, b1p[1] + 4.6], b3p = [b2p[0] + bx * 0.4, b2p[1] + 3.4];
  px.capsule(b0[0], b0[1], 1.5, b1p[0], b1p[1], 1.4, FLAX, 7.4); px.capsule(b1p[0], b1p[1], 1.4, b2p[0], b2p[1], 1.2, FLAX, 7.4); px.capsule(b2p[0], b2p[1], 1.2, b3p[0], b3p[1], 0.9, FLAX, 7.4);

  // the round shield slung on his back: ochre and teal, an iron boss
  px.part(); const shId = px._pid;
  const sx = C[0] - 5.2 - vx * 0.6, sy = C[1] + 2.8, SR = 6.6;
  px.ellipse(sx, sy, SR, SR, OCHRE, 7.7, { round: 0.55, cast: 1 });
  px.ellipse(sx, sy, SR * 0.62, SR * 0.62, TEAL_D, 7.72, { round: 0.6 });
  px.ellipse(sx, sy, SR * 0.26, SR * 0.26, IRON, 7.76, { cast: 1 });
  px.toneLine(sx - SR * 0.6, sy - SR * 0.6, sx + SR * 0.6, sy + SR * 0.6, -1, shId);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; px.dot(sx + Math.cos(a) * SR * 0.82, sy + Math.sin(a) * SR * 0.82, STEEL, 7.78, { fix: 3 }); }

  // the far arm: its fist in the ruff before him
  const grip = b.at(0.46, 0, -1.2);
  const fa = ik(sF[0], sF[1], grip[0], grip[1], R.upper, R.fore, 1);
  px.part();
  px.capsule(sF[0], sF[1], 1.9, fa.mid[0], fa.mid[1], 1.7, TEAL, 7.6, { bias: -1 });
  px.capsule(fa.mid[0], fa.mid[1], 1.7, fa.end[0], fa.end[1], 1.5, TEAL, 7.6, { bias: -1 });
  px.dot(fa.end[0], fa.end[1], SKIN, 7.65, { bias: -1 });

  // the near leg: the knee forward and gripping the saddle cloth, the shin down the flank, fur-cuffed boot
  const hp = [H[0] - 0.6, H[1] + 0.4], ft = [H[0] + 3.8 + (p.rKnee ?? 0), H[1] + 11.2];
  const lg = ik(hp[0], hp[1], ft[0], ft[1], R.thigh, R.shin, -1);
  px.part();
  px.capsule(hp[0], hp[1], 2.4, lg.mid[0], lg.mid[1], 2.1, WOOL, 8, { cast: 1 });
  px.capsule(lg.mid[0], lg.mid[1], 2, lg.end[0], lg.end[1], 1.6, LEATHER, 8, { cast: 1 });
  px.capsule(lg.end[0] - 0.4, lg.end[1] + 0.6, 1.5, lg.end[0] + 3.4, lg.end[1] + 1.6, 1.2, LEATHER, 8, { cast: 1 });
  const cu = mix(lg.mid, lg.end, 0.4);
  px.capsule(cu[0] - 1.8, cu[1], 1.2, cu[0] + 1.8, cu[1] + 0.3, 1.2, FURW, 8.05, {});

  // the tunic: teal wool, a belt with a brass buckle
  px.part();
  px.poly([[C[0] - 4.6, C[1] - 1.6], [C[0] + 3.6, C[1] - 1.2], [C[0] + 4.6, C[1] + 2.8], [H[0] + 4.4, H[1] - 1], [H[0] + 4.6, H[1] + 2],
    [H[0] - 4.6, H[1] + 2], [H[0] - 5, H[1] - 2], [C[0] - 5.8, C[1] + 2.6]], TEAL, 8.5, { round: 0.92, cast: 1 });
  px.poly([[H[0] - 5, H[1] - 2.8], [H[0] + 4.5, H[1] - 2.8], [H[0] + 4.6, H[1] - 0.8], [H[0] - 4.8, H[1] - 0.8]], LEATHER, 8.55, { round: 0.92, floor: 1 });
  px.rect(H[0] + 1, H[1] - 2.6, 2.4, 2, BRASS, 8.58, { fix: 3 });

  // the mantle: shaggy white fur over the shoulders, its ragged edge hanging a beat behind
  px.part();
  px.ellipse(C[0] + 0.2, C[1] + 0.2, 8, 4.4, FURW, 8.6, { cast: 1 });
  for (const x of [-6.4, -4, -1.4, 1.2, 3.8, 6]) px.dot(C[0] + 0.2 + x, C[1] + 4 - Math.abs(x) * 0.1 - vx * 0.3 * (x < 0 ? 1 : 0), FURW, 8.6);
  for (const x of [-5, -2, 1, 4]) px.dot(C[0] + x, C[1] + 5 + (x & 1), FURW, 8.6);
  for (const [x, y] of [[-3, -1.6], [1.6, -2.2], [4.4, -0.2]]) px.dot(C[0] + x, C[1] + y, FROST, 8.65, { noLine: true });

  // the head: the helm and the beard, the near horn at its brow
  px.part();
  px.stamp(p.rBlink ? RBLINK : (p.rRoar ?? 0) > 0.5 ? RROAR : RHEAD, hx, hy, RLEG, 9.5, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  px.part();
  horn(px, hx + 2.4, hy - 8.4, 1, 9.6);
  px.dot(hx + 3.4, hy - 8.8, BRASS, 9.7, { fix: 3 }); px.dot(hx - 3.2, hy - 8.8, BRASS, 9.7, { fix: 3 });

  // the near arm and the axe in the fist, a fur cuff at the wrist
  const hd = na.end;
  axe(px, hd, p.axe ?? -0.4, 10);
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] + 0.2, 3.6, 3.2, FURW, 10.4, { cast: 0, bias: 1 });
  px.part();
  px.capsule(sN[0], sN[1] + 0.6, 2.1, na.mid[0], na.mid[1], 1.9, TEAL, 10.5, { cast: 1 });
  px.capsule(na.mid[0], na.mid[1], 1.9, hd[0], hd[1], 1.7, TEAL, 10.5, { cast: 1 });
  const w0 = mix(na.mid, hd, 0.66);
  px.capsule(w0[0], w0[1], 1.9, hd[0], hd[1], 1.8, LEATHER, 10.55, { cast: 1 });
  px.part();
  px.ellipse(hd[0], hd[1], 1.9, 1.9, SKIN, 10.7);
  void lean;
};

export const draw = (px, F, o = {}) => {
  const { b, b1, b2 } = beastFrames(F, Q);
  const rider = o.variant !== "loose";
  wolf(px, b, b1, b2, rider);
  if (rider) raider(px, b, b1, b2);
  return {};
};

// the axe's smear on the chop, and the jaws' snap
const T0 = 0.38, T1 = 0.5;
export const fx = (px, F, info, clip) => {
  if (clip !== "attack") return;
  const { ph } = F;
  if (ph >= T0 && ph <= T1 + 0.14) {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const q = Math.max(T0, Math.min(ph, T1 + 0.03) - i * 0.012), sb = (x) => solveBeast(F.at(x).p, Q), bb = sb(q), r = rideOf(bb, sb(q - 0.08), sb(q - 0.16));
      const a = bb.p.axe ?? -0.4, d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)], h = r.na.end, L = 17;
      pts.push([[h[0] + d[0] * (L + 2) + n[0] * 3.4, h[1] + d[1] * (L + 2) + n[1] * 3.4], [h[0] + d[0] * (L - 3.4) + n[0] * 5, h[1] + d[1] * (L - 3.4) + n[1] * 5]]);
    }
    for (let i = 0; i + 1 < pts.length; i++) px.poly([pts[i][0], pts[i + 1][0], pts[i + 1][1], pts[i][1]], SMEAR, 20 - i, { noLine: true });
  }
  const p = F.sk.p, l = F.lag1.p;
  if ((l.jaw ?? 0) > 0.45 && (p.clamp ?? 0) > 0.35 && (p.jaw ?? 0) < 0.75) {
    const b = solveBeast(p, Q), cx = Math.round(b.K[0]) + 10, cy = Math.round(b.K[1]) + 2;
    const arc = (r0, r1, a0, a1, m, z) => {
      const out = [], inn = [], n = 8;
      for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + (a1 - a0) * t, w = Math.sin(Math.PI * t); out.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]); inn.unshift([cx + Math.cos(a) * (r0 - (r0 - r1) * w), cy + Math.sin(a) * (r0 - (r0 - r1) * w)]); }
      px.poly([...out, ...inn], m, z, { noLine: true });
    };
    arc(8.6, 5.6, -1.05, 1.05, SNAP2, 20); arc(8.6, 6.6, -0.62, 0.62, SNAP, 20.1);
  }
};

const STAND = { drop: 0.6, pitch: 0.05, arch: 0.06, neck: 0.02, hx: 0, hy: 0, jaw: 0.5, tail: -0.62, curl: 0.2, hackle: 1, ear: 0, clamp: 0,
  fNF: [-0.5, 0], fFF: [3, 0], fNH: [-2, 0], fFH: [3, 0],
  rLean: 0.12, rArm: [0.95, 0.56], axe: -0.5, rTwist: 0, rHx: 0, rHy: 0, rKnee: 0, rBlink: 0, rRoar: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 1500, loop: true, lag: 0.1,
    pose: (ph) => {
      const s = Math.sin(ph * Math.PI * 2), s2 = Math.sin(ph * Math.PI * 2 - 1.1);
      return { ...STAND, drop: 0.6 + 0.5 * (0.5 + 0.5 * s), neck: 0.02 - 0.06 * (0.5 + 0.5 * s2), hackle: 0.85 + 0.15 * s, tail: -0.62 + 0.2 * s2, curl: 0.2 + 0.12 * s,
        lip: ph >= 0.2 && ph < 0.55 ? 1 : 0, blink: ph >= 0.74 && ph < 0.86 ? 1 : 0, twitch: ph >= 0.36 && ph < 0.5 ? 1 : 0,
        rLean: 0.12 + 0.03 * s2, rArm: [0.95 + 0.03 * s, 0.56], axe: -0.5 + 0.05 * s2, rBlink: ph >= 0.86 && ph < 0.98 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 330, loop: true, lag: 0.09,
    pose: (ph) => {
      const g = gallop(ph, { travel: 60, duty: 0.24, lift: 5.5, flex: 0.56, flexBias: 0.3, rock: 0.14, bob: 1.6, kick: [16, 9], reach: [12, 5], foreX: 2, hindX: 4 });
      return { ...STAND, ...g, drop: g.drop + 1.2, neck: 0.1 + g.nod, hx: -g.g * 1.2, hy: 0, jaw: 0, hackle: 0.1, ear: 1, tail: 0.3 - g.g * 0.12, curl: -0.04 - g.g * 0.08,
        rLean: 0.46 + g.g * 0.05, rArm: [1.25, 0.55], axe: 0.85 - g.pitch * 0.5, rTwist: 0.2, rHx: 0.5, rHy: 0.4, rRoar: 1 };
    },
  },
  attack: {
    n: 12, ms: 720, loop: false, lag: 0.08,
    pose: (ph) => sampleKeys([
      { t: 0, p: STAND },
      // the crouch: weight back on the haunches, the chest to the ground, the axe hauled up behind his head
      { t: 0.22, e: "out", p: { ...STAND, rx: -3, drop: 4, pitch: 0.2, arch: 0.3, neck: 0.02, hy: 1, ear: 1, tail: -0.5, curl: 0.1,
        rLean: 0.0, rArm: [2.9, 0.95], axe: -0.8, rTwist: -0.5, rRoar: 1 } },
      { t: T0, e: "io", p: { ...STAND, rx: -3.8, drop: 4.6, pitch: 0.22, arch: 0.36, neck: 0, hy: 1, ear: 1, tail: -0.4, curl: 0.1,
        rLean: -0.1, rArm: [3.15, 0.97], axe: -1.0, rTwist: -0.65, rHx: -0.4, rRoar: 1 } },
      // the lunge: the wolf off its haunches, the jaws wide; the axe comes down across them
      { t: T1, e: "in3", p: { ...STAND, rx: 6.5, drop: 0.4, pitch: -0.2, arch: -0.26, neck: 0.42, hx: 3, hy: 0, jaw: 1, ear: 1, hackle: 0.3, tail: 0.3, curl: 0,
        fNF: [30, 12], fFF: [27, 14], fNH: [-1, 0], fFH: [3.5, 0], rLean: 0.68, rArm: [1.6, 1], axe: 1.65, rTwist: 0.6, rHx: 1, rHy: 0.8, rRoar: 1 } },
      // the snap and the follow-through: the blade low before the wolf's shoulder
      { t: 0.6, e: "out", p: { ...STAND, rx: 7.5, drop: 1.6, pitch: 0, arch: -0.12, neck: 0.3, hx: 4, hy: 1, jaw: 0, clamp: 1, ear: 1, hackle: 0.3, tail: 0.2, curl: 0,
        fNF: [9, 0], fFF: [7, 0], fNH: [1, 0], fFH: [3.5, 0], rLean: 0.74, rArm: [1.4, 1], axe: 2.15, rTwist: 0.7, rHx: 1.2, rHy: 1, rRoar: 1 } },
      { t: 0.74, e: "io", p: { ...STAND, rx: 5, drop: 1.2, pitch: -0.06, arch: 0.1, neck: 0.5, hx: 1, hy: -1, jaw: 0, clamp: 1, ear: 1, hackle: 0.6, tail: -0.2, curl: 0.2,
        fNF: [9, 0], fFF: [7, 0], fNH: [1, 0], fFH: [3.5, 0], rLean: 0.5, rArm: [1.1, 0.8], axe: 1.5, rTwist: 0.3, rRoar: 0 } },
      { t: 0.88, e: "io", p: { ...STAND, rx: 1.5, drop: 0.2, neck: 0.2, fNF: [4, 2.4], fFF: [2, 1.2], fNH: [0, 1.2], fFH: [2, 0], ear: 0.6, rLean: 0.26, rArm: [1.0, 0.64], axe: 0.2 } },
      { t: 1, e: "out", p: STAND },
    ], ph),
  },
};
void solve;
