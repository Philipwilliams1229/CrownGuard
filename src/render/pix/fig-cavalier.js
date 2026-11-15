// ============ FIGURE: the Cavalier (game type `cavalier`), his riderless horse and the loose horse ============
// A big, heavy destrier, nothing like a pony: a deep barrel, a thick arched neck, a long
// head with a steel chanfron and a crinet of lames down the neck, feathered white stockings
// on black legs, a dark mane and a long dark tail. An oxblood caparison dagged at the hem,
// brass-edged, with the grey tower of the Iron Kingdom on the flank. On the saddle a knight
// in blued plate (the Iron levy's iron: fig-levy.js, a heavier cut), an oxblood surcoat, a
// sallet with an oxblood crest, a small heater shield on the far arm and a banded lance couched
// under the near one, a pennon under the head. Horse and rider stand ~58 px tall, the lance
// reaching far ahead. The horse is on beast.js (four legs, `gallop`); the rider's joints are
// placed here and his arm and knee solved with `ik`; he rides a beat behind the back under him.
//   o.variant === "loose":  the same horse with NO rider (the game crumbles this one when the
//                            knight is thrown clear: `cavalierMount`). Stirrups swing, the reins
//                            hang. All three clips work.
//   o.variant === "bolt":    the loose horse in a panic (`loosehorse`): the same, head flung up,
//                            the eye ringed white, the nostril flared, the reins and mane streaming.
//   o.variant === "errant": the Lancer Order (`errantRider`, the Knights Errant's mounted path): the same
//                            horse and seat in the crown's errant livery: a forest-green caparison and
//                            surcoat, gunmetal plate, brass, a brass chevron where the tower was, and an
//                            off-white plume on the sallet. The cavalier's own looks are unchanged.
// Clips: idle (breathing, one forefoot pawing, a tail swish, the plume and pennon stirring),
// walk (its CHARGE: a heavy one-flight gallop, the lance couched), attack (the horse rears,
// the lance hauled back and up, then the weight is thrown forward down the lance).
import { mat, flat } from "./pix.js";
import { stampFace } from "./bowlayers.js";
import { HUMAN, sampleKeys, ik } from "./rig.js";
import { QUAD, beastFrames, tailPts, gallop, legChain } from "./beast.js";

const COAT = mat("#51444c", { contrast: 1.15 }), SOCK = mat("#d8d0c0"), MANE = mat("#2a2228", { contrast: 1.1 }), HOOF = mat("#2e2428", { floor: 1 });
const MUZ = mat("#7a6a72"), EYE = flat("#e8b84a"), GLINT = flat("#fff4c0"), NOSTRIL = flat("#241a20"), WHITE = flat("#f2ecdc"), FLARE = flat("#c85a5a");
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), BRASS = mat("#c8a040", { contrast: 1.2 });
const IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#3c4048", { contrast: 1.1 }), STEELB = mat("#c4c8d0", { contrast: 1.3 });
const LEATHER = mat("#5a3c28"), SADDLE = mat("#4a3022"), GREY = mat("#a8aeb8", { contrast: 1.2 }), CREAM = mat("#e6dfd0");
const SKIN = mat("#e0b088"), EYEH = flat("#2a1c2c"), BROW = mat("#4a3426"), BOOT = mat("#2a2a30", { contrast: 1.2, floor: 1 });
const SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });
const DUST = flat("#cdb894"), DUST2 = flat("#b09c7c");

// the two liveries: the Iron cavalier's (the first, every material as it always was) and the Lancer
// Order's errant green over gunmetal (the draws below read L.OX the caparison and surcoat, L.OXK its dark,
// L.IRON the plate, L.GREY the emblem's metal, L.CREST the sallet's crest)
const GREEN = mat("#2f6b3f", { contrast: 1.15 }), GREENK = mat("#1f4a2c"), GUN = mat("#68738a", { contrast: 1.2 }), PLUME = mat("#e8e2d0", { contrast: 1.2 });
const LOOKS = {
  cavalier: { errant: false, OX, OXK, IRON, GREY, CREST: OX },
  errant: { errant: true, OX: GREEN, OXK: GREENK, IRON: GUN, GREY: BRASS, CREST: PLUME },
};

// the rider's sallet, facing +x (as fig-unhorsed.js): M iron, W glint, m brim underside, B bevor,
// S skin, s a tone down, N nose, b brow, E eye (e shut)
const SALLET = [
  "......MMMMM.....",
  "....MMMMMMMMM...",
  "...MMWWMMMMMMM..",
  "..MMMWMMMMMMMMM.",
  "MMMMMMMMMMMMMMMM",
  "MMmmmmmmmmmmmmmm",
  "MMMMsSSbbSbbS...",
  "MMMMsSSSESSSEN..",
  "mMMMsSSSSSSSSN..",
  ".mMMBBBBBBBSS...",
  "..mMBBBBBBBBS...",
  "...mBBBBBBBB....",
];
const blink = (rows) => rows.map((r) => r.replace(/E/g, "e"));
const LEG = {
  M: { m: IRON }, W: { m: IRON, bias: 1 }, m: { m: IRONK }, B: { m: IRON, bias: -1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  b: { m: BROW, fix: 1 }, E: { m: EYEH }, e: { m: SKIN, fix: 0 },
};

LOOKS.cavalier.LEG = LEG;
LOOKS.errant.LEG = { ...LEG, M: { m: GUN }, W: { m: GUN, bias: 1 }, B: { m: GUN, bias: -1 } };
export const BOX = { w: 132, h: 100, ox: 52, oy: 90 };
export const BONES = HUMAN;               // unused: the horse stands on beast.js's bones
const Q = { ...QUAD, spine: 30, height: 30, sh: [-1.8, 9], hip: [1.8, 8.4], foreU: 11.4, foreL: 10.8, hindU: 11.9, hindL: 11.4, paw: 1.7,
  neckAt: [0.6, 4.4], neck: 15, tailAt: [-1.7, 1.7], tail: [5.6, 5.6, 5, 4], far: [2.6, -1], foreX: 1.1, hindX: -1.7 };
// the rider's bones
const R = { thigh: 7.2, shin: 6.4, spine: 9.6, upper: 5.6, fore: 5.4 };

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// one leg, a welded limb of the horse's one body (pix.js body / limb): the muscle at the top, a thin
// cannon, one radius at each joint, a near leg's root fading into the barrel's own shading; the white
// feathered sock is wrapped on (same normal, own colour), then the hoof.
const leg = (px, l, z, bias) => {
  const { j, k, a } = l, near = !l.far, o = { bias, cast: 1, weld: near ? 3 : 0, weldRoot: near ? 6 : 0 };
  px.limb(legChain(l), l.fore ? [4.2, 2.5, 1.9] : [4.5, 2.2, 1.9], COAT, z, o);
  if (near) {
    if (l.fore) px.ellipse(j[0] - 0.4, j[1] - 1.6, 5.2, 6.2, COAT, z + 0.005, { ...o, rot: 0.2, weld: 3, weldRoot: 0 });
    else px.ellipse(j[0] + 0.9, j[1] - 1.6, 6.6, 7.4, COAT, z + 0.005, { ...o, rot: -0.25, weld: 3, weldRoot: 0 });
  }
  const s0 = mix(k, a, 0.5);
  px.capsule(s0[0], s0[1], 2.0, a[0], a[1] + 0.2, 2.4, SOCK, z + 0.01, { bias, wrap: true });
  // the hoof: square on the ground, pointed down the leg's own line in the air
  const up = cl(l.lift / 3, 0, 1), pa = 0.5 + up * (Math.atan2(a[1] - k[1], a[0] - k[0]) - 0.3 - 0.5);
  px.capsule(a[0], a[1] + 0.5, 2.4, a[0] + Math.cos(pa) * 1.9, a[1] + 0.5 + Math.sin(pa) * 1.5, 1.9, HOOF, z + 0.02, { bias, floor: 1 });
};

// the horse: far legs, tail, body, caparison, neck, head, near legs. Returns the head's points for the reins.
const horse = (px, b, b1, b2, o) => {
  const p = b.p, bolt = o.variant === "bolt", L = o.L;
  const vx = cl(b.W[0] - b1.W[0], -3, 3), vy = cl(b.W[1] - b1.W[1], -3, 3);

  // the horse is one body: no part shadows or edges another; armour, cloth and tack stand outside it
  const BID = px.body(1);
  leg(px, b.FH, 1, -1);
  leg(px, b.FF, 1.2, -1);

  // the tail: two plaits of dark hair, streaming
  const t = tailPts(b, b1, b2);
  for (const [off, w, zz] of [[0, 2.5, 2.5], [1.4, 1.9, 2.4]]) {
    px.part();
    for (let i = 0; i < t.length - 1; i++) {
      const w0 = Math.max(0.8, w - i * 0.35), w1 = Math.max(0.7, w - (i + 1) * 0.35);
      px.capsule(t[i][0], t[i][1] + off * (i / 3), w0, t[i + 1][0] - (off ? 0.6 * i : 0), t[i + 1][1] + off * ((i + 1) / 3), w1, MANE, zz, { floor: 1 });
    }
  }

  // the body: the barrel, the chest, the hindquarters
  const bf = b.at(0.3, 0, 8.8), bb = b.at(-0.3, 0, 8.6), ru = b.at(-0.36, 0, 9), ch = b.at(0.42, 1.2, 9.6);
  px.part(); const bodyId = BID;
  px.capsule(bf[0], bf[1], 8.7, bb[0], bb[1], 8.5, COAT, 4);
  px.ellipse(ru[0], ru[1], 9.9, 9.9, COAT, 4);
  px.ellipse(ch[0], ch[1], 8.8, 9.9, COAT, 4);
  const lo0 = b.at(0.3, 0, 15.4), lo1 = b.at(-0.28, 0, 15.6);
  px.toneLine(lo0[0], lo0[1], lo1[0], lo1[1], -1, bodyId);                // the belly's underside

  // the neck: thick at the withers, a crest of mane above it, the crinet's lames on the near side
  const n0 = [b.N0[0] - 1.5, b.N0[1] + 2.5], K = b.K;
  px.part(); const neckId = BID;
  px.capsule(n0[0], n0[1], 7.6, K[0], K[1] + 1, 4.4, COAT, 4.3);
  const nd = (() => { const dx = K[0] - n0[0], dy = K[1] - n0[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; })(), nn = [nd[1], -nd[0]];    // along the neck, and up off it
  const sway = cl(-vx * 0.9, -2.4, 2.4), tos = bolt ? 1.6 : 0;
  // the mane: a dark ridge on the crest with locks that fly back
  px.part();
  const mp = (u, d) => [n0[0] + (K[0] - n0[0]) * u + nn[0] * d, n0[1] + (K[1] - n0[1]) * u + nn[1] * d];
  const m0 = mp(0, 6.2), m1 = mp(0.5, 5.4), m2 = mp(1, 3.6);
  px.capsule(m0[0], m0[1], 2.2, m1[0], m1[1], 2.2, MANE, 4.5, { floor: 1 });
  px.capsule(m1[0], m1[1], 2.2, m2[0], m2[1], 1.8, MANE, 4.5, { floor: 1 });
  for (const [u, ln] of [[0.08, 5], [0.26, 6], [0.44, 5.4], [0.62, 6.4], [0.8, 5]]) {
    const q = mp(u, 5.8), w = ln + tos * 1.2;
    px.poly([[q[0] - 1.6, q[1] - 0.4], [q[0] + 1.4, q[1] - 1.4], [q[0] - w + sway, q[1] + 1.2 + (u > 0.5 ? 1 : 0)], [q[0] - w * 0.7 + sway, q[1] + 3.4]], MANE, 4.45, { floor: 1, round: 0.5 });
  }
  px.body(0);
  // the crinet: steel lames lapped down the crest, a brass rivet on each
  px.part();
  for (let i = 0; i < 5; i++) {
    const u = 0.1 + i * 0.19, c = mp(u, 2.0), c2 = mp(u + 0.1, 2.6), f = mp(u, -2.4);
    px.poly([c, c2, [c2[0] + nd[0] * 0.4 - nn[0] * 2, c2[1] + nd[1] * 0.4 - nn[1] * 2], f], L.IRON, 4.6, { round: 0.6, cast: 1 });
    px.dot(c[0] - nn[0] * 0.6, c[1] - nn[1] * 0.6, BRASS, 4.62, { fix: 3 });
  }

  // the caparison: an oxblood cloth over the back, a dagged brass-edged hem swinging with the stride
  const sw = (i) => cl(-vx * 0.7, -2, 2) * (0.5 + i * 0.12);
  const hem = [];
  const dags = [[0.32, 15.4], [0.24, 13], [0.16, 15.8], [0.07, 13.2], [-0.02, 16], [-0.1, 13.4], [-0.19, 16.2], [-0.27, 13.6], [-0.34, 15.2]];
  dags.forEach(([s, d], i) => { const q = b.at(s, 0, d); hem.push([q[0] + sw(i), q[1] + (i % 2 ? -0.4 : 0.6)]); });
  px.part(); const capId = px._pid;
  px.poly([b.at(0.3, 0.4, -0.8), b.at(0.35, 1.2, 6), ...hem, b.at(-0.38, -1, 6), b.at(-0.33, -0.5, -0.8)], L.OX, 5, { round: 0.85, cast: 2 });
  const e0 = b.at(0.3, 0, 14.4), e1 = b.at(-0.32, 0, 14.6);
  px.line(e0[0] + sw(0), e0[1] - 0.2, e1[0] + sw(9), e1[1] - 0.2, BRASS, 5.04);                   // the brass line above the hem
  px.toneLine(b.at(0.06, 0, 1)[0], b.at(0.06, 0, 1)[1], b.at(0.0, 0, 14)[0], b.at(0.0, 0, 14)[1], -1, capId);
  px.toneLine(b.at(-0.2, 0, 1)[0], b.at(-0.2, 0, 1)[1], b.at(-0.22, 0, 14)[0], b.at(-0.22, 0, 14)[1], 1, capId);
  // the tower of the Iron Kingdom on the flank (the Lancer Order's brass chevron)
  px.part();
  const tw = b.at(-0.17, 0, 8.6);
  if (L.errant) {
    px.line(tw[0] - 2.8, tw[1] - 0.6, tw[0], tw[1] + 2.4, L.GREY, 5.1); px.line(tw[0], tw[1] + 2.4, tw[0] + 2.8, tw[1] - 0.6, L.GREY, 5.1);
    px.line(tw[0] - 2.8, tw[1] + 1.6, tw[0], tw[1] + 4.6, L.GREY, 5.1); px.line(tw[0], tw[1] + 4.6, tw[0] + 2.8, tw[1] + 1.6, L.GREY, 5.1);
  } else {
    px.rect(tw[0] - 2.6, tw[1] - 1.6, 5.2, 6.4, L.GREY, 5.1, { fix: 3 });
    for (const x of [-2.6, -0.4, 1.8]) px.dot(tw[0] + x, tw[1] - 2.6, L.GREY, 5.1, { fix: 3 });
    px.rect(tw[0] - 0.6, tw[1] + 1.8, 1.2, 3, L.OXK, 5.12, { noLine: true });
  }
  // the saddle: cantle and pommel round the seat, a girth strap
  px.part();
  const sd0 = b.at(0.13, 0, -1.2), sd1 = b.at(-0.1, 0, -1.2), sd2 = b.at(-0.12, 0, 3.4), sd3 = b.at(0.14, 0, 3.4);
  px.poly([sd0, sd1, sd2, sd3], SADDLE, 5.4, { round: 0.6, cast: 1 });
  px.capsule(sd1[0], sd1[1] - 1.2, 1.6, sd2[0], sd2[1] - 0.2, 1.4, SADDLE, 5.42, { cast: 1 });      // the cantle
  px.capsule(sd0[0], sd0[1] - 1, 1.4, sd3[0], sd3[1] - 0.4, 1.3, SADDLE, 5.42, { cast: 1 });        // the pommel

  // ---- the head: built round the skull point K; hang is how far the face is turned down (rad)
  const hang = (p.hang ?? 1) - (bolt ? 0.45 : 0), hd = [Math.cos(hang), Math.sin(hang)], tp = [Math.sin(hang), -Math.cos(hang)];
  const HU = 1.15, H = (a, d) => [K[0] + hd[0] * a * HU + tp[0] * d * HU, K[1] + hd[1] * a * HU + tp[1] * d * HU];
  const M = H(11.4, 0.8), bit = H(8.6, -1.6);
  // the far ear and the near ear: tips flick forward when the horse listens, flat back in a charge
  const earA = p.ear ?? 0.3, eb = H(-1.8, 2.2);
  const ear = (dx, z, bias) => {
    px.part();
    const tip = [eb[0] + dx + 1.4 - earA * 3.2 + (bolt ? 0.8 : 0), eb[1] - 5.8 + earA * 1.6];
    px.poly([[eb[0] + dx - 1.4, eb[1] + 0.8], [eb[0] + dx + 1.3, eb[1] - 0.4], tip], COAT, z, { bias, round: 0.5, cast: 1 });
  };
  px.body(1);
  ear(-1.2, 5.6, -1);
  px.part(); px.capsule(...H(-0.6, 0), 4.5, ...H(5.2, 0), 4, COAT, 6, { cast: 1 });                // the skull
  px.capsule(...H(4.4, 0.2), 3.5, ...H(11, 0.6), 2.9, MUZ, 6.02, { cast: 1 });                         // the muzzle, paler
  px.ellipse(...H(3.4, -2.4), 3, 2.6, COAT, 6.03, { bias: -1, cast: 0 });                           // the cheek
  px.body(0);
  // the chanfron: a steel plate down the face, ridged, a brass boss between the eyes
  px.part();
  px.poly([H(0.6, 3.6), H(9.4, 2.8), H(10, 0.8), H(8.4, 0.4), H(0.8, 1.2)], L.IRON, 6.1, { round: 0.6, cast: 1 });
  px.line(...H(1.6, 2.5), ...H(9, 2.1), STEELB, 6.12, { fix: 4, noLine: true });
  px.dot(...H(1.8, 2.2), BRASS, 6.14, { fix: 3 });
  // the eye (ringed white when it bolts) and the nostril
  px.part();
  const ey = H(2.6, 0.6);
  if (bolt) px.ellipse(ey[0], ey[1], 1.9, 1.7, WHITE, 6.2, { cast: 0 });
  if (p.hblink) px.line(ey[0] - 1.2, ey[1], ey[0] + 1.2, ey[1], NOSTRIL, 6.22, { noLine: true });
  else { px.dot(ey[0], ey[1], EYE, 6.22, { bias: 1 }); if (!bolt) px.dot(ey[0] + 1, ey[1] - 0.6, GLINT, 6.24); else px.dot(ey[0], ey[1], NOSTRIL, 6.24); }
  const ns = H(11.2, 1.6);
  px.dot(ns[0], ns[1], bolt ? FLARE : NOSTRIL, 6.2, { fix: 0 });
  if (bolt) px.dot(ns[0] - 1, ns[1], NOSTRIL, 6.22, { fix: 0 });
  // the near ear on top of the skull
  px.body(1);
  ear(1.4, 6.5, 0);
  px.body(0);
  // the bridle: a cheek strap, the bit at the mouth's corner
  px.part();
  px.line(...H(4.6, 2.4), ...bit, LEATHER, 6.3, { noLine: true });
  px.line(...H(7.4, 1.8), ...H(7.8, -2), LEATHER, 6.3, { noLine: true });
  px.dot(bit[0], bit[1], BRASS, 6.34, { fix: 3 });

  px.body(1);
  leg(px, b.NH, 7, 0);
  leg(px, b.NF, 7.2, 0);
  px.body(0);
  return { bit, M, K };
};

// the knight: hip on the saddle, a beat behind the back under him
const rider = (px, b, b1, b2, h, L) => {
  const p = b.p;
  const s0 = b.at(0.01, 0, -1.4), s1 = b1.at(0.01, 0, -1.4), s2 = b2.at(0.01, 0, -1.4);
  const late = s1[1] * 0.65 + s2[1] * 0.35, air = cl(s0[1] - late, 0, 2.5), press = cl(late - s0[1], 0, 2);
  const Hp = [s0[0], s0[1] - air];
  const lean = (p.rLean ?? 0.2) + press * 0.05 - air * 0.04, sp = R.spine - press * 0.5;
  const C = [Hp[0] + Math.sin(lean) * sp, Hp[1] - Math.cos(lean) * sp];
  const N = [C[0] + Math.sin(lean) * 1.6 + 1.2 + (p.rHx ?? 0), C[1] - 1.8 + (p.rHy ?? 0)];
  const tw = p.rTwist ?? 0, sN = [C[0] - 2.8 + tw * 1.4, C[1] + 0.9], sF = [C[0] + 2.8 - tw * 1.4, C[1] - 0.1];
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const vx = cl((s0[0] - s1[0]) * 1.6, -2.4, 2.4), vy = cl(s0[1] - s1[1], -2, 2);

  // the near leg in plate over the cloth: the knee forward and gripping, the boot in the stirrup
  const hp = [Hp[0] - 0.6, Hp[1] + 0.6], ft = [Hp[0] + 2.4 + (p.rKnee ?? 0), Hp[1] + 12.8];
  const lg = ik(hp[0], hp[1], ft[0], ft[1], R.thigh, R.shin, -1);
  px.part();
  px.limb([hp, lg.mid, [lg.end[0], lg.end[1] - 1]], [2.9, 2.35, 1.9], L.IRON, 8, { cast: 1 });
  px.part();
  px.ellipse(lg.mid[0] + 0.5, lg.mid[1], 2.6, 2.4, L.IRON, 8.02, { cast: 1 });
  px.dot(lg.mid[0] + 0.6, lg.mid[1] - 0.6, STEELB, 8.04, { fix: 4 });
  px.capsule(lg.end[0] - 0.4, lg.end[1] - 0.2, 2, lg.end[0] + 3.2, lg.end[1] + 0.6, 1.6, BOOT, 8.05, { floor: 1 });
  px.line(lg.end[0] - 1.2, lg.end[1] + 1.8, lg.end[0] + 3, lg.end[1] + 1.8, BRASS, 8.08, { fix: 3 });          // the stirrup's tread
  px.line(lg.end[0] + 1.5, lg.end[1] + 1.8, hp[0] + 1, hp[1] + 2.4, LEATHER, 7.9, { noLine: true });

  // the far arm, behind the torso, to the shield's grip
  const sc = [C[0] + 6.4 + (p.shx ?? 0), C[1] + 3.6];
  const fa = ik(sF[0], sF[1], sc[0] - 1.6, sc[1] - 0.6, R.upper, R.fore, 1);
  px.part();
  px.limb([sF, fa.mid, fa.end], [2.2, 2, 1.7], L.IRON, 7.6, { bias: -1 });

  // the trunk: a breastplate under an oxblood surcoat that falls over the thighs and the saddle
  const hemY = Hp[1] + 5.8, sw = cl(-vx * 1.1, -2.4, 2.4);
  px.part(); const tab = px._pid;
  px.poly([[C[0] - 4.8, C[1] - 1.8], [C[0] + 4.8, C[1] - 1.8], [C[0] + 5.4, C[1] + 3], [Hp[0] + 5, Hp[1] - 1], [Hp[0] + 6.2, hemY - 0.4], [Hp[0] + 4, hemY + 1.6], [Hp[0] + 1.8, hemY - 0.2],
    [Hp[0] - 0.6, hemY + 1.8], [Hp[0] - 2.6 + sw, hemY - 0.2], [Hp[0] - 4.8 + sw, hemY + 1.6], [Hp[0] - 6.4 + sw, hemY - 0.4], [Hp[0] - 5, Hp[1] - 2], [C[0] - 5.6, C[1] + 3]], L.OX, 8.5, { round: 0.92, cast: 1 });
  px.toneLine(Hp[0] + 1.4, Hp[1] - 2, Hp[0] + 1.2, hemY - 1.4, -1, tab);
  px.toneLine(Hp[0] - 2.4, Hp[1] - 2, Hp[0] - 2.6 + sw * 0.7, hemY - 1.4, 1, tab);
  px.line(Hp[0] - 5.6 + sw, hemY - 1.2, Hp[0] + 5.6, hemY - 1.2, BRASS, 8.54);
  px.poly([[Hp[0] - 5.2, Hp[1] - 3.6], [Hp[0] + 5, Hp[1] - 3.6], [Hp[0] + 5.1, Hp[1] - 1.8], [Hp[0] - 5.3, Hp[1] - 1.8]], LEATHER, 8.55, { round: 0.92 });
  px.rect(Hp[0] + 1.4, Hp[1] - 3.6, 2, 2, BRASS, 8.56, { fix: 3 });
  px.part();
  const c0 = [C[0] + 1, C[1] + 3.4];                                   // the tower on his breast
  if (L.errant) { px.line(c0[0] - 2.2, c0[1] - 0.4, c0[0] + 0.6, c0[1] + 2, L.GREY, 8.6); px.line(c0[0] + 0.6, c0[1] + 2, c0[0] + 3.6, c0[1] - 0.4, L.GREY, 8.6); }
  else { px.rect(c0[0], c0[1], 2, 3, L.GREY, 8.6, { fix: 3 }); px.dot(c0[0], c0[1] - 1, L.GREY, 8.6, { fix: 3 }); px.dot(c0[0] + 1, c0[1] - 1, L.GREY, 8.6, { fix: 3 }); }
  px.part();
  px.poly([[C[0] - 5.2, C[1] - 3.4], [C[0] + 5.2, C[1] - 3.4], [C[0] + 5.6, C[1] + 0.2], [C[0] - 5.6, C[1] + 0.4]], L.IRON, 8.7, { round: 0.9, cast: 1 });
  px.line(C[0] - 4.8, C[1] + 0.6, C[0] + 5, C[1] + 0.4, IRONK, 8.72, { fix: 1 });
  for (const [s, zz, bs] of [[sF, 7.7, -1], [sN, 9.2, 0]]) {                                           // round pauldrons
    px.part();
    px.ellipse(s[0] + 0.2, s[1] + 0.2, 4.2, 3.7, L.IRON, zz, { bias: bs, cast: 1 });
    px.line(s[0] - 3.2, s[1] + 1.6, s[0] + 3.4, s[1] + 1.6, IRONK, zz + 0.01, { bias: bs });
    px.dot(s[0] + 0.6, s[1] - 1.6, STEELB, zz + 0.02, { fix: 4 });
  }

  // the head: the crest streams back, a beat late
  const tuft = cl(-vx * 1.5, -2.4, 2.4), tv = cl(-vy * 1.0, -1.4, 1.4);
  px.part();
  px.poly([[hx - 4, hy - 11.4], [hx + 3, hy - 11.8], [hx + 3.2, hy - 14], [hx - 3.4 + tuft * 0.5, hy - 15 + tv * 0.4], [hx - 9 + tuft * 1.7, hy - 12 + tv], [hx - 11.6 + tuft * 2.3, hy - 7.4 + tv], [hx - 10.2 + tuft * 1.5, hy - 3.2], [hx - 7.4 + tuft, hy - 5.8], [hx - 5.4, hy - 8.8]], L.CREST, 9.4, { round: 0.85, cast: 1 });
  px.part();
  stampFace(px, p.rBlink ? blink(SALLET) : SALLET, hx, hy, L.LEG, 9.5, 9.5, { ax: 7, ay: 12, cast: 2, ball: [8, 6, 8, 7] }, "SsNEelb");
  px.dot(hx + 2, hy - 10.6, BRASS, 9.6, { fix: 3 });

  // the heater shield, held up before his chest on the far arm
  const S = (x, y) => [sc[0] + x, sc[1] + y];
  px.part(); const sid = px._pid;
  px.poly([S(-4.8, -5.8), S(4.8, -5.8), S(5.2, 0.8), S(0, 8.2), S(-5.2, 0.8)], L.IRON, 9, { round: 0.6, cast: 2 });
  px.poly([S(-3.6, -4.6), S(3.6, -4.6), S(3.9, 0.4), S(0, 6.4), S(-3.9, 0.4)], L.OX, 9.02, { round: 0.7, cast: 0 });
  px.toneLine(...S(-1.4, -4.4), ...S(-1.2, 4.6), -1, sid);
  px.part();
  if (L.errant) {
    px.line(sc[0] - 3, sc[1] - 2.4, sc[0], sc[1] + 1, L.GREY, 9.1); px.line(sc[0], sc[1] + 1, sc[0] + 3, sc[1] - 2.4, L.GREY, 9.1);
    px.dot(sc[0], sc[1] + 3.4, L.GREY, 9.1, { fix: 3 });
  } else {
    px.rect(sc[0] - 1.8, sc[1] - 3, 3.6, 4.4, L.GREY, 9.1, { fix: 3 });
    px.dot(sc[0] - 1.8, sc[1] - 3.8, L.GREY, 9.1, { fix: 3 }); px.dot(sc[0], sc[1] - 3.8, L.GREY, 9.1, { fix: 3 }); px.dot(sc[0] + 1.8, sc[1] - 3.8, L.GREY, 9.1, { fix: 3 });
    px.rect(sc[0] - 0.5, sc[1] - 0.8, 1, 2.2, L.OXK, 9.12, { noLine: true });

  }
  for (const [x, y] of [[-4, -5], [4, -5], [-4.2, 0.4], [4.2, 0.4]]) px.dot(sc[0] + x, sc[1] + y, STEELB, 9.2, { fix: 4 });

  // the near arm and the lance couched under it: banded, a steel head, a pennon streaming
  const ang = p.rArm ?? [1.15, 0.7], len = R.upper + R.fore;
  const hand0 = [C[0] + 4.6 + (p.lHx ?? 0), C[1] + 5.4 + (p.lHy ?? 0)];
  const na = ik(sN[0], sN[1], hand0[0], hand0[1], R.upper, R.fore, 1);
  const hd = na.end, la = (p.lance ?? 0) + vy * 0.02, d = [Math.cos(la), Math.sin(la)], nn = [-d[1], d[0]];
  const at = (f, s = 0) => [hd[0] + d[0] * f + nn[0] * s, hd[1] + d[1] * f + nn[1] * s];
  px.part();
  const LANCE_BACK = -11, LANCE_FWD = 36;
  for (let f = LANCE_BACK, i = 0; f < LANCE_FWD - 0.01; f += 3.6, i++) {
    const f1 = Math.min(LANCE_FWD, f + 3.6);
    px.capsule(...at(f), 1.05, ...at(f1), 1.05, i % 2 ? CREAM : L.OX, 10, { cast: 1 });
  }
  px.part();
  px.poly([at(35, -1.2), at(37.4, -2), at(44, 0), at(37.4, 2), at(35, 1.2)], STEELB, 10.1, { fix: 3 });
  px.line(...at(36, -1), ...at(43, -0.2), STEELB, 10.12, { fix: 4 });
  px.capsule(...at(33.6), 1.3, ...at(35), 1.3, IRONK, 10.1, { floor: 1 });
  px.capsule(...at(-11), 1.3, ...at(-9), 1.3, IRONK, 10.1, { floor: 1 });
  // the pennon: two tails of oxblood and cream under the head
  const fl = cl(-vx * 1.4 + (p.flut || 0), -2.6, 2.6);
  px.part();
  px.poly([at(31.6, 0.6), at(31, 4 + fl * 0.3), at(24.6, 5.4 + fl), at(20, 3.6 + fl * 1.3), at(23.6, 2.4 + fl * 0.6), at(26.4, 0.8)], L.OX, 10.2, { round: 0.6, cast: 1 });
  px.line(...at(30, 2), ...at(22.4, 3.6 + fl), BRASS, 10.24, { noLine: true });
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] + 0.2, 2.4, 2.2, L.IRON, 10.4, { cast: 0, bias: 1 });
  px.tag("nearArm");
  px.limb([[sN[0], sN[1] + 0.6], na.mid, hd], [2.4, 2.1, 1.7], L.IRON, 10.5, { cast: 1 });
  px.ellipse(na.mid[0], na.mid[1], 2, 1.9, L.IRON, 10.55, { cast: 1 });
  px.part();
  px.ellipse(hd[0], hd[1], 1.9, 1.9, LEATHER, 10.7);
  px.tag(null);
  h.lance = { hd, d, nn, tip: at(44) };
  h.hand = hd;
};

export const MUST = [["nearArm", "notOver", "eyes"]];
export const draw = (px, F, o = {}) => {
  const { b, b1, b2 } = beastFrames(F, Q);
  const v = o.variant || "";
  const L = LOOKS[v] || LOOKS.cavalier;
  const h = horse(px, b, b1, b2, { variant: v, L });
  const info = {};
  if (v !== "loose" && v !== "bolt") {
    rider(px, b, b1, b2, info, L);
  } else {
    // no one on the saddle: the stirrup irons swing, the reins hang from the bit and trail
    const bolt = v === "bolt", sd = b.at(0.04, 0, 3.4), vx = cl(b.W[0] - b1.W[0], -3, 3);
    px.part();
    const sw = cl(-vx * 1.6, -3, 3) + (bolt ? -2 : 0), st = [sd[0] + sw * 0.9, sd[1] + 11.2];
    px.capsule(sd[0], sd[1] + 0.4, 0.8, st[0], st[1], 0.8, LEATHER, 7.8, { floor: 1 });
    px.ellipse(st[0], st[1] + 1.4, 2.1, 1.7, BRASS, 7.82, { fix: 3 });
    px.ellipse(st[0], st[1] + 1.6, 1.0, 0.8, COAT, 7.84, { noLine: true });
    // the reins: from the bit back over the neck, looped, a tail flying behind
    const w = b.at(0.5, 0, -1), mid = [(h.bit[0] + w[0]) / 2, (h.bit[1] + w[1]) / 2 + (bolt ? -2 : 3)];
    px.part();
    px.capsule(h.bit[0], h.bit[1], 0.6, mid[0], mid[1], 0.6, LEATHER, 7.5, { floor: 1 });
    px.capsule(mid[0], mid[1], 0.6, w[0], w[1] - 0.6, 0.6, LEATHER, 7.5, { floor: 1 });
    px.capsule(w[0], w[1] - 0.6, 0.6, w[0] - 6 + sw * 1.4, w[1] + (bolt ? 0 : 5), 0.5, LEATHER, 7.5, { floor: 1 });
    if (bolt) { info.dust = true; }
  }
  return info;
};

// the lance's streak (attack) and a little dust kicked up by the hooves (bolt)
export const fx = (px, F, info, clip) => {
  const { b, b1 } = beastFrames(F, Q);
  if (clip === "attack" && info.lance) {
    const dy = b.K[1] - b1.K[1], { hd, d, nn } = info.lance, at = (f, s = 0) => [hd[0] + d[0] * f + nn[0] * s, hd[1] + d[1] * f + nn[1] * s];
    const rx = b.p.rx - b1.p.rx;
    if (rx > 0.4 || (F.ph >= 0.5 && F.ph <= 0.64)) {
      px.poly([at(14, 2.4), at(-2, 1.4), at(14, 0.4)], SMEAR2, 20, { noLine: true });
      px.poly([at(14, 1.8), at(2, 1.2), at(14, 0.8)], SMEAR, 20.1, { noLine: true });
    }
    void dy;
  }
  if (clip === "walk" && (info.dust || F.sk.p.dust)) {
    const hind = b.NH, g = F.sk.p.g ?? 0;
    for (const [dx, r, c] of [[-4, 2.2, DUST], [-9, 1.6, DUST2]]) px.ellipse(hind.a[0] + dx, hind.a[1] + 1, r, r * 0.7, c, 20, { noLine: true });
    void g;
  }
};

// ---- poses --------------------------------------------------------------------------------
const STAND = { drop: 0.5, pitch: -0.02, arch: 0.02, neck: 0.95, hang: 1.0, hx: 0, hy: 0, jaw: 0, tail: -0.5, curl: -0.18, ear: 0.3,
  fNF: [0, 0], fFF: [2.2, 0], fNH: [0, 0], fFH: [2.4, 0],
  rLean: 0.16, rArm: [1.15, 0.7], lance: -0.26, lHx: 0, lHy: 0, rTwist: 0, rHx: 0, rHy: 0, rKnee: 0, flut: 0, shx: 0 };
const COUCH = { rLean: 0.42, lance: -0.04, lHx: 1.2, lHy: -1.4, rTwist: 0.3, rHx: 0.6, rHy: 0.4 };
export const CLIPS = {
  idle: {
    n: 8, ms: 1800, loop: true, lag: 0.1,
    pose: (ph) => {
      const s = Math.sin(ph * Math.PI * 2), s2 = Math.sin(ph * Math.PI * 2 - 1);
      // one forefoot paws: up, forward, scraped back
      const u = cl((ph - 0.12) / 0.4, 0, 1), paw = u > 0 && u < 1 ? [4.5 - 8 * u * u, Math.sin(Math.PI * Math.sqrt(u)) * 5] : [0, 0];
      const toss = cl((ph - 0.62) / 0.22, 0, 1), tz = toss > 0 && toss < 1 ? Math.sin(Math.PI * toss) : 0;
      return { ...STAND, drop: 0.5 + 0.45 * (0.5 + 0.5 * s), neck: 0.95 + 0.08 * s2 + 0.12 * tz - 0.1 * (u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0), hang: 1.0 + 0.1 * s - 0.2 * tz,
        fNF: paw, tail: -0.5 + 0.45 * s2, curl: -0.18 + 0.12 * s, ear: 0.3 + 0.5 * (ph > 0.3 && ph < 0.45 ? 1 : 0), hblink: ph >= 0.82 && ph < 0.92 ? 1 : 0,
        rLean: 0.16 + 0.03 * s2, rArm: [1.15 + 0.03 * s, 0.7], lance: -0.26 + 0.04 * s2, flut: 0.8 * s, rBlink: ph >= 0.86 && ph < 0.98 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 400, loop: true, lag: 0.1,
    pose: (ph) => {
      const g = gallop(ph, { travel: 46, duty: 0.3, lift: 6, double: false, beats: { hF: 0.04, hN: 0.14, fF: 0.34, fN: 0.46 }, flex: 0.24, flexBias: 0.05, rock: 0.11, bob: 2.4, kick: [9, 6], reach: [8, 4], foreX: 1.5, hindX: 2 });
      return { ...STAND, ...COUCH, ...g, pitch: g.pitch - 0.06, neck: 0.42 + g.nod * 0.8, hang: 0.98 - g.nod * 0.5, ear: 0, tail: 0.1 - g.g * 0.3, curl: 0.1,
        rLean: 0.42 + g.g * 0.06, lance: -0.05 - g.pitch * 0.3, flut: g.g * 1.4, dust: 1 };
    },
  },
  attack: {
    n: 12, ms: 820, loop: false, lag: 0.08, hit: 0.5,
    pose: (ph) => sampleKeys([
      { t: 0, p: STAND },
      // the rear: the forehand up, forefeet pawing the air, the lance hauled back and cocked
      { t: 0.26, e: "out", p: { ...STAND, rx: -3, drop: 2.4, pitch: -0.46, arch: 0.1, neck: 1.25, hang: 1.25, hy: -1, ear: 0, tail: 0.2, curl: 0.2,
        fNF: [4, 11], fFF: [5.5, 9.5], fNH: [-1, 0], fFH: [1, 0], rLean: -0.12, rArm: [0.9, 0.7], lance: -0.62, lHx: -2.4, lHy: -2, rTwist: -0.5, rHy: 0, flut: -1 } },
      { t: 0.38, e: "io", p: { ...STAND, rx: -3.4, drop: 2.8, pitch: -0.5, arch: 0.12, neck: 1.3, hang: 1.3, hy: -1.2, ear: 0, tail: 0.3, curl: 0.2,
        fNF: [4.4, 11.6], fFF: [5.8, 10], fNH: [-1.4, 0], fFH: [0.6, 0], rLean: -0.18, rArm: [0.8, 0.7], lance: -0.7, lHx: -3, lHy: -2.4, rTwist: -0.6, flut: -1.4 } },
      // the plunge: the forehand thrown down and forward, the lance driven level
      { t: 0.5, e: "in3", p: { ...STAND, ...COUCH, rx: 5, drop: 1.4, pitch: 0.14, arch: -0.06, neck: 0.6, hang: 0.78, ear: 0, tail: 0.5, curl: 0.2,
        fNF: [8, 3], fFF: [9, 1.2], fNH: [-2.4, 0], fFH: [0, 0], rLean: 0.62, lance: 0.04, lHx: 2.4, lHy: -0.6, rTwist: 0.7, rHx: 1.2, flut: 2 } },
      { t: 0.6, e: "out", p: { ...STAND, ...COUCH, rx: 5.6, drop: 1.8, pitch: 0.1, arch: -0.04, neck: 0.64, hang: 0.8, ear: 0, tail: 0.4, curl: 0.2,
        fNF: [8.6, 0], fFF: [9.6, 0], fNH: [-2.6, 0], fFH: [0, 0], rLean: 0.64, lance: 0.05, lHx: 2.6, lHy: -0.6, rTwist: 0.8, rHx: 1.3, flut: 2 } },
      { t: 0.82, e: "io", p: { ...STAND, rx: 1.8, drop: 1, pitch: 0.02, neck: 0.85, hang: 0.95, fNF: [3, 0], fFF: [5, 0], fNH: [-1, 0], rLean: 0.34, lance: -0.14, lHx: 0.8, rTwist: 0.2 } },
      { t: 1, e: "out", p: STAND },
    ], ph),
  },
};
