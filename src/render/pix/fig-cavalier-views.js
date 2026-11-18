// ============ CONCEPT FIGURES: the Cavalier (and his riderless horse, the loose horse, the Lancer) FRONT and BACK ============
// The destrier of fig-cavalier.js (the approved side look: black coat, white stockings, steel chanfron,
// oxblood caparison dagged at the hem, the knight in blued plate with the heater shield and the banded
// lance) drawn charging toward the camera (FRONT) and away from it (BACK). One drawer serves both,
// `make(s)`: s = +1 front, -1 back. Hands and legs: a horse facing us has its NEAR side (the one the side
// view shows) on SCREEN LEFT in front, on screen RIGHT from behind; the knight's right hand holds the
// lance (screen left in front), his left arm carries the shield (screen right in front; seen from behind,
// the shield's back on the left). The lance comes at us in FRONT (a short foreshortened shaft, the steel
// head and the pennon beside the horse's head) and recedes in BACK (its butt cap near his hip, the shaft
// climbing away past his right shoulder). Variants (o.variant, as the side file): "" the Cavalier, "errant"
// the Lancer Order's green over gunmetal with the cream plume, "loose" the same horse with nobody up (the
// stirrups swing, the reins hang), "bolt" the loose horse in a panic (head flung up, the eye ringed white,
// the nostril flared, the mane streaming). Unflipped on the board; one sun, upper left; feet on the line.
// The walk keeps the side clip's n, ms and pose (the gallop): the legs, bob and the rider's seat read the
// SAME solved beast (beast.js solveBeast on the side's Q), so the game can switch views mid-stride.
// Forward is DOWN the screen in FRONT and UP it in BACK (FWD 0.22 a px of stride).
import { mat, flat } from "./pix.js";
import { solveBeast, QUAD } from "./beast.js";
import { HUMAN, ik } from "./rig.js";
import { CLIPS as SIDE } from "./fig-cavalier.js";

const COAT = mat("#51444c", { contrast: 1.15 }), SOCK = mat("#d8d0c0"), MANE = mat("#2a2228", { contrast: 1.1 }), HOOF = mat("#2e2428", { floor: 1 });
const MUZ = mat("#7a6a72"), EYE = flat("#e8b84a"), GLINT = flat("#fff4c0"), NOSTRIL = flat("#241a20"), WHITE = flat("#f2ecdc"), FLARE = flat("#c85a5a");
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), BRASS = mat("#c8a040", { contrast: 1.2 });
const IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#3c4048", { contrast: 1.1 }), STEELB = mat("#c4c8d0", { contrast: 1.3 });
const LEATHER = mat("#5a3c28"), SADDLE = mat("#4a3022"), GREY = mat("#a8aeb8", { contrast: 1.2 }), CREAM = mat("#e6dfd0");
const SKIN = mat("#e0b088"), EYEH = flat("#2a1c2c"), BROW = mat("#4a3426"), BOOT = mat("#2a2a30", { contrast: 1.2, floor: 1 });
const GREEN = mat("#2f6b3f", { contrast: 1.15 }), GREENK = mat("#1f4a2c"), GUN = mat("#68738a", { contrast: 1.2 }), PLUME = mat("#e8e2d0", { contrast: 1.2 });
const LOOKS = {
  cavalier: { errant: false, OX, OXK, IRON, GREY, CREST: OX },
  errant: { errant: true, OX: GREEN, OXK: GREENK, IRON: GUN, GREY: BRASS, CREST: PLUME },
};
const mkLeg = (L) => ({ M: { m: L.IRON }, W: { m: L.IRON, bias: 1 }, m: { m: IRONK }, B: { m: L.IRON, bias: -1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, b: { m: BROW, fix: 1 }, E: { m: EYEH }, e: { m: SKIN, fix: 0 }, C: { m: L.CREST }, c: { m: L.CREST, bias: -1 } });

// the sallet seen head-on: dome (M, glint W), the brim's underside (m), skin (S), the brow (b), eyes (E; e shut),
// the nose bridge (N), the bevor (B). 12 wide.
const FRONT_H = [
  "....MMMM....",
  "..MMMWWMMM..",
  ".MMMWMMMMMM.",
  "MMMMMMMMMMMM",
  "MMMMMMMMMMMM",
  "mmmmmmmmmmmm",
  "MsSbbSSbbSsM",
  "MsSEESSEESsM",
  "mMSSSNNSSSMm",
  ".mBSSNNSSBm.",
  "..BBBSSBBB..",
  "...BBBBBB...",
];
const blinkF = (rows) => rows.map((r) => r.replace(/E/g, "e"));
// and from behind: the dome, a seam, the sallet's tail flaring over the nape, a strap, rivets
const BACK_H = [
  "....MMMM....",
  "..MMMMMMMM..",
  ".MMMWMMMMMM.",
  "MMMMMWMMMMMM",
  "MMMMMMmMMMMM",
  "MMMMMMmMMMMM",
  "MMMMMMmMMMMM",
  "mMMMMMmMMMMm",
  ".mMMMMmMMMm.",
  "..mMMMMMMm..",
  "...BBBBBB...",
  "....BBBB....",
];

export const BOX = { w: 72, h: 100, ox: 36, oy: 90 };
const FWD = 0.22, TAU = Math.PI * 2;
const Q = { ...QUAD, spine: 30, height: 30, sh: [-1.8, 9], hip: [1.8, 8.4], foreU: 11.4, foreL: 10.8, hindU: 11.9, hindL: 11.4, paw: 1.7,
  neckAt: [0.6, 4.4], neck: 15, tailAt: [-1.7, 1.7], tail: [5.6, 5.6, 5, 4], far: [2.6, -1], foreX: 1.1, hindX: -1.7 };
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const R = { thigh: 7.2, shin: 6.4 };

const make = (s) => (px, F, o = {}) => {
  const v = o.variant || "", L = LOOKS[v === "errant" ? "errant" : "cavalier"], LEG = mkLeg(L);
  const bolt = v === "bolt", loose = v === "loose" || bolt, ridden = !loose;
  const b = solveBeast(F.sk.p, Q), b1 = solveBeast(F.lag1.p, Q), b2 = solveBeast(F.lag2.p, Q), p = b.p, ph = F.ph;
  const by = cl(b.at(0, 0, 0)[1] + 30, -3, 3.4);                           // how far the back has sunk
  const sway = cl((b.W[0] - b1.W[0]) * 0.9, -1.6, 1.6);
  const lean = cl(by * 0.1 + Math.sin(ph * TAU) * 0.1, -0.5, 0.5);
  const hip = [0, -31 + by * 0.9];
  // near side on screen left in FRONT, right from BEHIND
  const nS = -s, fS = s;
  const lift = (f) => cl(f[1], 0, 7), fw = (f) => cl(f[0], -10, 10) * FWD * s;
  const BID = px.body(1);

  // ---- a horse's leg: a welded limb, the white sock, the hoof (face-on in front, the heel and sole behind)
  const leg = (x, top, f, fore, near, z) => {
    const lf = lift(f), dy = fw(f), foot = [x * 0.97, -0.6 + dy - lf * 0.85 + (near ? 0 : -0.5)];
    const kn = [x * 1.05 + (fore ? 0 : x * 0.18), mix(top, foot, 0.5)[1] + (fore ? 1 : -1) + lf * 0.2];
    const bias = near ? 0 : -1;
    px.limb([top, kn, [foot[0], foot[1] - 1.7]], fore ? [4.2, 2.5, 1.9] : [4.6, 2.3, 1.9], COAT, z, { bias, cast: 1, weld: near ? 3 : 0, weldRoot: near ? 6 : 0 });
    const s0 = mix(kn, foot, 0.45);
    px.capsule(s0[0], s0[1], 2.0, foot[0], foot[1] + 0.2, 2.4, SOCK, z + 0.01, { bias, wrap: true });
    px.ellipse(foot[0], foot[1] + 0.9, 2.9, 1.6, HOOF, z + 0.02, { bias, floor: 1 });
    if (s < 0 && lf > 1.2) px.ellipse(foot[0], foot[1] + 2.6, 2.6, 1.5 * cl(lf / 3, 0.4, 1), HOOF, z + 0.03, { bias: -1, floor: 1 });   // the sole shows
    return foot;
  };

  // far legs first. FRONT: the hind pair peeks out beyond the forelegs; BACK: the fore pair peeks out beyond the hinds
  if (s > 0) {
    leg(-7.6, [-7.6, -17 + by], p.fNH, false, false, 1);
    leg(7.6, [7.6, -17 + by], p.fFH, false, false, 1);
  } else {
    leg(-5.6, [-5.6, -14 + by], p.fNF, true, false, 1);
    leg(5.6, [5.6, -14 + by], p.fFF, true, false, 1);
  }

  // the tail (BACK: it hangs down the middle of the rump, in front of it; FRONT: just a dark edge at the rump's side)
  const tsw = sway * 1.2 + Math.sin(ph * TAU - 0.6) * 0.9;
  const tail = () => {
    const root = [0, -27 + by];
    for (const [off, w, zz] of [[-1.2, 2.6, 9.6], [1.4, 2.1, 9.5]]) {
      px.part();
      let a = [root[0] + off * 0.6, root[1]];
      for (let i = 0; i < 4; i++) {
        const c = [a[0] + off * 0.3 + tsw * (i * 0.35), a[1] + 4.4 - (i === 3 ? 0.4 : 0)];
        px.capsule(a[0], a[1], Math.max(0.9, w - i * 0.4), c[0], c[1], Math.max(0.8, w - i * 0.4 - 0.4), MANE, zz, { floor: 1 });
        a = c;
      }
    }
  };

  // the caparison's panels behind the chest / rump, the dagged hem swinging with the stride (one cloth, a tone each side)
  const hy0 = -15.5 + by * 0.5, dg = [[11.8, 0.4], [9.4, -2.4], [7.2, 0.2], [4.8, -2.6], [2.4, 0.2], [0, -2.4]];
  const cloth = () => {
    px.part(); const cid = px._pid;
    const top = -31 + by;
    const hem = [];
    for (let i = 0; i < dg.length; i++) hem.push([dg[i][0] + (i === 0 ? 0 : 0), hy0 + dg[i][1] + 2.6 + (i % 2 ? sway * 0.4 : 0)]);
    const right = hem.map(([x, y]) => [x, y]);
    const left = hem.slice().reverse().slice(1).map(([x, y]) => [-x, y]);
    px.poly([[-11.6, top + 1], [11.6, top + 1], ...right, ...left.map(([x, y]) => [x, y]), [-11.8, hem[0][1]]], L.OX, s > 0 ? 3.8 : 5, { round: 0.85, cast: 2 });
    px.toneLine(-3.4, top + 5, -3.4, hy0 - 1, -1, cid);
    px.toneLine(5.4, top + 5, 5.4, hy0 - 1, 1, cid);
    px.line(-11.4, hy0 - 0.8 + 2, 11.4, hy0 - 0.8 + 2, BRASS, s > 0 ? 3.84 : 5.04);
    px.part();
    if (s < 0) {
      // the tower (or the Lancer's chevron) on the croup
      const tw = [0, -22 + by];
      if (L.errant) { px.line(tw[0] - 3, tw[1] - 0.6, tw[0], tw[1] + 2.4, L.GREY, 5.1); px.line(tw[0], tw[1] + 2.4, tw[0] + 3, tw[1] - 0.6, L.GREY, 5.1); px.line(tw[0] - 3, tw[1] + 1.6, tw[0], tw[1] + 4.6, L.GREY, 5.1); px.line(tw[0], tw[1] + 4.6, tw[0] + 3, tw[1] + 1.6, L.GREY, 5.1); }
      else { px.rect(tw[0] - 2.6, tw[1] - 1.6, 5.2, 6.4, L.GREY, 5.1, { fix: 3 }); for (const x of [-2.6, -0.4, 1.8]) px.dot(tw[0] + x, tw[1] - 2.6, L.GREY, 5.1, { fix: 3 }); px.rect(tw[0] - 0.6, tw[1] + 1.8, 1.2, 3, L.OXK, 5.12, { noLine: true }); }
    }
  };

  if (s > 0) cloth();
  // the body: FRONT the deep chest and the shoulders, a dark pectoral line; BACK the great rump
  px.part(); const bodyId = BID;
  if (s > 0) {
    px.ellipse(0, -22 + by, 9.6, 10.8, COAT, 4);
    px.ellipse(-4.6, -19 + by, 5.4, 8, COAT, 4.01, { weld: 3 });
    px.ellipse(4.6, -19 + by, 5.4, 8, COAT, 4.01, { weld: 3 });
    px.toneLine(0, -25 + by, 0, -11 + by, -1, bodyId);
  } else {
    px.ellipse(0, -22 + by, 10.6, 10.6, COAT, 4);
    px.ellipse(-5, -21 + by, 6, 8.4, COAT, 4.01, { weld: 3 });
    px.ellipse(5, -21 + by, 6, 8.4, COAT, 4.01, { weld: 3 });
  }
  // the neck: BACK a thick dark-crested column rising from the withers (the rider hides most of it); FRONT behind the head
  const nh = bolt ? 9 : 0;
  px.part();
  px.capsule(0, -27 + by, 6.8, 0, (s > 0 ? -35 : -38) - nh * 0.4 + by * 0.6, 4.7, COAT, 4.3);
  if (s < 0) {
    px.part();
    px.capsule(0, -30 + by, 2.4, 0, -41 - nh * 0.4 + by * 0.5, 2.0, MANE, 4.5, { floor: 1 });                // the mane's ridge down the nape
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) px.poly([[sd * 1.6, -31 + by - i * 3.4], [sd * 4.6 + sway * 0.4, -29.4 + by - i * 3.4], [sd * 4 + sway, -26.4 + by - i * 3.4 + 1], [sd * 1.2, -29 + by - i * 3.4]], MANE, 4.45, { floor: 1, round: 0.5 });
  }
  px.body(0);

  if (s > 0) {
    // the crinet's lames lap down the neck either side of the head, a brass rivet on each
    px.part();
    for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) {
      const y = -30 + by + i * 2.8;
      px.poly([[sd * 5.4, y - 1.4], [sd * 8, y - 0.4], [sd * 8.4, y + 1.8], [sd * 5, y + 1.2]], L.IRON, 4.6, { round: 0.6, cast: 1 });
      px.dot(sd * 6.6, y + 0.4, BRASS, 4.62, { fix: 3 });
    }
  }
  if (s < 0) { cloth(); tail(); }

  // the saddle: from behind, the cantle's rim shows between rider and cloth
  if (s < 0) { px.part(); px.capsule(-5.4, -30 + by * 0.9, 1.6, 5.4, -30 + by * 0.9, 1.5, SADDLE, 5.42, { cast: 1 }); }

  // ---- FRONT: the head, face-on and hung low: skull, paler muzzle, chanfron, eyes, nostrils, ears, bit, bridle
  const info = {};
  if (s > 0) {
    const hx = bolt ? sway * 0.5 : 0, hyy = (bolt ? -36 : -24) + by * 0.7, tilt = bolt ? 0.8 : 0;
    const Hh = (x, y) => [hx + x, hyy + y];
    px.body(1);
    const ear = (sd) => {
      px.part();
      const e0 = Hh(sd * 3.2, -9), tip = Hh(sd * (3.9 + (bolt ? 1.4 : -0.2)) + (bolt ? 0 : 0.6 * sd), -15.5 - (p.ear ?? 0) * 1.6);
      px.poly([[e0[0] - 1.8, e0[1] + 1.4], [e0[0] + 1.8, e0[1] + 1], tip], COAT, 11.6, { round: 0.5, cast: 1, bias: sd === nS ? 0 : -1 });
    };
    ear(fS); px.part();
    px.ellipse(...Hh(0, -2.6), 5.8, 7.2, COAT, 12);                                                      // the skull
    px.ellipse(...Hh(-4.4, 1.6), 2.4, 4.2, COAT, 12.03, { bias: -1 });                                // the cheeks
    px.ellipse(...Hh(4.4, 1.6), 2.4, 4.2, COAT, 12.03, { bias: -1 });
    px.capsule(...Hh(0, 2), 3.4, ...Hh(0, 8.6), 3, MUZ, 12.05, { cast: 1 });                         // the muzzle, paler
    px.body(0);
    ear(nS);
    px.part();
    px.poly([Hh(-3.4, -7.6), Hh(3.4, -7.6), Hh(2.8, 3), Hh(0, 5.4), Hh(-2.8, 3)], L.IRON, 12.2, { round: 0.6, cast: 1 });                    // the chanfron
    px.line(...Hh(-1.8, -6), ...Hh(-1.4, 2.4), STEELB, 12.24, { fix: 4, noLine: true });
    px.line(...Hh(1.6, -6), ...Hh(1.4, 2), IRONK, 12.24, { fix: 1, noLine: true });
    px.dot(...Hh(0, -2.4), BRASS, 12.3, { fix: 3 }); px.dot(...Hh(0, -1.4), BRASS, 12.3, { fix: 3 });                                          // the boss between the eyes
    px.part();
    for (const sd of [-1, 1]) {
      const e = Hh(sd * 4.5, -3.4);
      if (bolt) px.ellipse(e[0], e[1], 1.8, 1.7, WHITE, 12.4, { cast: 0 });
      if (p.hblink) px.line(e[0] - 1, e[1], e[0] + 1, e[1], NOSTRIL, 12.42, { noLine: true });
      else { px.dot(e[0], e[1], bolt ? NOSTRIL : EYE, 12.42, { bias: 1 }); if (!bolt) px.dot(e[0] - 0.4 * sd, e[1] - 0.6, GLINT, 12.44); }
      px.dot(...Hh(sd * 1.7, 8.2), bolt ? FLARE : NOSTRIL, 12.4, { fix: 0 });
      if (bolt) px.dot(...Hh(sd * 1.7, 9), NOSTRIL, 12.42, { fix: 0 });
    }
    px.line(...Hh(-2.4, 10.8), ...Hh(2.4, 10.8), NOSTRIL, 12.4, { noLine: true });                    // the mouth
    px.line(...Hh(-3.2, -0.5), ...Hh(-3.4, 6.4), LEATHER, 12.35, { noLine: true });                   // the cheek straps and the brass bits
    px.line(...Hh(3.2, -0.5), ...Hh(3.4, 6.4), LEATHER, 12.35, { noLine: true });
    px.dot(...Hh(-3.6, 7.4), BRASS, 12.38, { fix: 3 }); px.dot(...Hh(3.6, 7.4), BRASS, 12.38, { fix: 3 });
    // the forelock: a lick of mane between the ears; a bolting horse's streams out to both sides
    px.part();
    px.poly([Hh(-2.6, -8.4), Hh(2.6, -8.4), Hh(1.4 + sway, -4.6), Hh(-0.4, -3.4), Hh(-1.8 - sway, -5)], MANE, 12.5, { floor: 1, round: 0.6 });
    if (bolt) for (const sd of [-1, 1]) px.poly([Hh(sd * 3.6, -7), Hh(sd * 5.4, -9), Hh(sd * (9 + sway), -4.6), Hh(sd * (11 + sway), 0.4), Hh(sd * 7, -3)], MANE, 4.6, { floor: 1, round: 0.5 });
    info.head = Hh(0, 0);
  } else {
    // BACK: only the ears and poll rise over the withers, above the knight's helm if there is none
    const hyy = (bolt ? -46 : -42) + by * 0.5;
    px.body(1); px.part();
    px.ellipse(0, hyy + 0.6, 4.6, 3.4, COAT, 5.2, { cast: 1 });
    for (const sd of [-1, 1]) {
      px.part();
      const tip = [sd * (4 + (bolt ? 1.4 : 0)) + sway * 0.4, hyy - 6.6 - (p.ear ?? 0) * 1.4];
      px.poly([[sd * 1.4, hyy + 0.8], [sd * 4.4, hyy - 0.4], tip], COAT, 5.3, { round: 0.5, cast: 1, bias: sd === nS ? 0 : -1 });
    }
    px.body(0); px.part();
    px.poly([[-2.8, hyy + 0.6], [2.8, hyy + 0.6], [1.6, hyy - 1.8], [-1.6, hyy - 1.8]], MANE, 5.4, { floor: 1, round: 0.6 });                   // the forelock's back
  }

  // ---- the near legs last, in front. FRONT: the forelegs; BACK: the hinds (hocks out)
  px.body(1);
  if (s > 0) {
    leg(nS * 5.2, [nS * 5.2, -18 + by], p.fNF, true, true, 7);
    leg(fS * 5.2, [fS * 5.2, -18 + by], p.fFF, true, true, 7.1);
  } else {
    leg(nS * 6.4, [nS * 7.6, -18 + by], p.fNH, false, true, 7);
    leg(fS * 6.4, [fS * 7.6, -18 + by], p.fFH, false, true, 7.1);
  }
  px.body(0);

  // ---- nobody up: stirrups swing at the flanks, the reins loop from the bit
  if (loose) {
    px.part();
    const sw2 = cl(-sway * 1.6, -3, 3) * 0.8 + (bolt ? -1.6 : 0);
    for (const sd of [-1, 1]) {
      const a = [sd * 10.2, -29 + by * 0.9], st = [sd * (10.8 + sw2 * 0.4), -17 + by * 0.9 + (sd === nS ? 0.6 : 0)];
      px.capsule(a[0], a[1], 0.8, st[0], st[1], 0.8, LEATHER, s > 0 ? 7.8 : 7.8, { floor: 1 });
      px.ellipse(st[0], st[1] + 1.2, 2.1, 1.5, BRASS, 7.82, { fix: 3 });
      px.ellipse(st[0], st[1] + 1.4, 1, 0.7, COAT, 7.84, { noLine: true });
    }
    if (s > 0) {
      const bt = [info.head[0], info.head[1] + 7.6];
      for (const sd of [-1, 1]) {
        const g = [sd * 3.4 + bt[0], bt[1]], q = [sd * 7.6 + sway, -26 + by * 0.8 + (bolt ? -3 : 3)], w = [sd * 3, -29 + by * 0.9];
        px.capsule(g[0], g[1], 0.6, q[0], q[1], 0.6, LEATHER, 12.6, { floor: 1 });
        px.capsule(q[0], q[1], 0.6, w[0], w[1], 0.6, LEATHER, 7.5, { floor: 1 });
      }
    } else {
      px.capsule(0, -31 + by, 0.6, -3 * nS + sway, -22 + by + (bolt ? -3 : 0), 0.6, LEATHER, 7.5, { floor: 1 });
      px.capsule(-3 * nS + sway, -22 + by, 0.6, -5 * nS + sway * 2, -17 + by, 0.5, LEATHER, 7.5, { floor: 1 });
    }
    return info;
  }

  // ======== the knight ========
  const Hp = hip, sp = 9.6, C = [Hp[0] + Math.sin(lean) * sp, Hp[1] - Math.cos(lean) * sp];
  const hx = Math.round(C[0] + sway * 0.4), hy = Math.round(C[1] - 1.8);
  const vx = cl(sway * 1.4, -2.4, 2.4), tuft = cl(-vx * 1.5, -2.4, 2.4);
  const sNs = [C[0] + nS * 6, C[1] + 0.2], sFs = [C[0] + fS * 6, C[1] + 0.2];   // shoulders (near side = lance side)

  // the plate legs, hanging each side of the barrel, a boot in the stirrup
  for (const sd of [fS, nS]) {
    const z = sd === nS ? 8.2 : 8;
    const hp = [Hp[0] + sd * 3.4, Hp[1] + 0.6], ft = [sd * 9.6, Hp[1] + 13.4 - (sd === nS ? 0.4 : 0)];
    const kn = [sd * 8.8, Hp[1] + 5.8];
    px.part();
    px.limb([hp, kn, [ft[0] - sd * 0.4, ft[1] - 1]], [3.2, 2.5, 1.9], L.IRON, z, { cast: 1 });
    px.part();
    px.ellipse(kn[0] + sd * 0.4, kn[1], 2.7, 2.5, L.IRON, z + 0.02, { cast: 1 });
    px.dot(kn[0] - 0.4, kn[1] - 0.8, STEELB, z + 0.04, { fix: 4 });
    px.ellipse(ft[0], ft[1] + (s > 0 ? 0.4 : 0.2), 2.4, s > 0 ? 1.8 : 1.3, BOOT, z + 0.05, { floor: 1 });
    px.line(ft[0] - 2.4, ft[1] + 2.2, ft[0] + 2.4, ft[1] + 2.2, BRASS, z + 0.08, { fix: 3 });          // the stirrup's tread
    px.line(ft[0] + sd * 0.8, ft[1] + 2.2, hp[0] + sd * 3, hp[1] + 3, LEATHER, z - 0.1, { noLine: true });
  }

  // the shield arm (his left: screen right in FRONT, screen left from BEHIND) and the shield
  const shC = [fS * 9.8, C[1] + 4.6];
  px.part();
  px.limb([sFs, [fS * 8.6, C[1] + 4], [fS * 7.4, C[1] + 7.4]], [2.2, 2, 1.7], L.IRON, 7.6, { bias: -1 });
  if (s > 0) {
    px.part(); const sid = px._pid;
    const S = (x, y) => [shC[0] + x, shC[1] + y];
    px.poly([S(-4.8, -6.8), S(4.8, -6.8), S(5.2, 0), S(0, 8.6), S(-5.2, 0)], L.IRON, 9.3, { round: 0.6, cast: 2 });
    px.poly([S(-3.6, -5.6), S(3.6, -5.6), S(3.9, -0.4), S(0, 6.8), S(-3.9, -0.4)], L.OX, 9.32, { round: 0.7, cast: 0 });
    px.toneLine(...S(-1.4, -5.4), ...S(-1.2, 4.8), -1, sid);
    px.part();
    if (L.errant) { px.line(shC[0] - 3, shC[1] - 3, shC[0], shC[1] + 0.4, L.GREY, 9.4); px.line(shC[0], shC[1] + 0.4, shC[0] + 3, shC[1] - 3, L.GREY, 9.4); px.dot(shC[0], shC[1] + 3, L.GREY, 9.4, { fix: 3 }); }
    else {
      px.rect(shC[0] - 1.8, shC[1] - 3.6, 3.6, 4.4, L.GREY, 9.4, { fix: 3 });
      for (const x of [-1.8, 0, 1.8]) px.dot(shC[0] + x, shC[1] - 4.4, L.GREY, 9.4, { fix: 3 });
      px.rect(shC[0] - 0.5, shC[1] - 1.4, 1, 2.2, L.OXK, 9.42, { noLine: true });
    }
    for (const [x, y] of [[-4, -5.6], [4, -5.6], [-4.2, -0.4], [4.2, -0.4]]) px.dot(shC[0] + x, shC[1] + y, STEELB, 9.5, { fix: 4 });
  } else {
    // its back: a dark rim, planks of leather, the arm strap and the grip, the boss's rivets
    px.part(); const sid = px._pid;
    const S = (x, y) => [shC[0] + x, shC[1] + y];
    px.poly([S(-4.8, -6.8), S(4.8, -6.8), S(5.2, 0), S(0, 8.6), S(-5.2, 0)], IRONK, 9.3, { round: 0.6, cast: 2 });
    px.poly([S(-3.6, -5.6), S(3.6, -5.6), S(3.9, -0.4), S(0, 6.8), S(-3.9, -0.4)], LEATHER, 9.32, { round: 0.7, cast: 0 });
    px.toneLine(...S(0.2, -5.4), ...S(0.2, 6), -1, sid);
    px.part();
    px.line(...S(-3.4, -2.8), ...S(3.4, -2.8), SADDLE, 9.4, { cast: 0 });
    px.line(...S(-2.8, 1.6), ...S(2.8, 1.6), SADDLE, 9.4, { cast: 0 });
    px.dot(...S(-3.6, -2.8), STEELB, 9.5, { fix: 4 }); px.dot(...S(3.6, 1.6), STEELB, 9.5, { fix: 4 });
  }

  // the trunk: a surcoat down over the thighs and the saddle, belted; FRONT the breastplate and the emblem, BACK the plain back with its seam
  const hemY = Hp[1] + 5.8, swh = cl(-vx * 0.8, -2, 2);
  px.part(); const tab = px._pid;
  px.poly([[C[0] - 5.4, C[1] - 1.8], [C[0] + 5.4, C[1] - 1.8], [C[0] + 5.8, C[1] + 3], [Hp[0] + 6.2, Hp[1] - 1], [Hp[0] + 7, hemY - 0.4], [Hp[0] + 4.4, hemY + 1.6], [Hp[0] + 1.8, hemY - 0.2],
    [Hp[0] - 0.6, hemY + 1.8], [Hp[0] - 2.8 + swh, hemY - 0.2], [Hp[0] - 5.2 + swh, hemY + 1.6], [Hp[0] - 7 + swh, hemY - 0.4], [Hp[0] - 6.2, Hp[1] - 2], [C[0] - 5.8, C[1] + 3]], L.OX, 8.5, { round: 0.92, cast: 1 });
  px.toneLine(Hp[0] + 1.6, Hp[1] - 2, Hp[0] + 1.4, hemY - 1.4, -1, tab);
  if (s < 0) px.toneLine(C[0], C[1] + 2, Hp[0], hemY - 1, 1, tab);
  px.line(Hp[0] - 6 + swh, hemY - 1.2, Hp[0] + 6, hemY - 1.2, BRASS, 8.54);
  px.poly([[Hp[0] - 5.8, Hp[1] - 3.6], [Hp[0] + 5.8, Hp[1] - 3.6], [Hp[0] + 5.9, Hp[1] - 1.8], [Hp[0] - 5.9, Hp[1] - 1.8]], LEATHER, 8.55, { round: 0.92 });
  px.rect(Hp[0] - 1, Hp[1] - 3.6, 2, 2, BRASS, 8.56, { fix: 3 });
  px.part();
  if (s > 0) {
    const c0 = [C[0] - 0.5, C[1] + 3.6];                                  // the tower on his breast
    if (L.errant) { px.line(c0[0] - 2.4, c0[1] - 0.4, c0[0], c0[1] + 2, L.GREY, 8.6); px.line(c0[0], c0[1] + 2, c0[0] + 2.4, c0[1] - 0.4, L.GREY, 8.6); }
    else { px.rect(c0[0] - 1.2, c0[1], 2.4, 3, L.GREY, 8.6, { fix: 3 }); for (const x of [-1.2, 0.2]) px.dot(c0[0] + x, c0[1] - 1, L.GREY, 8.6, { fix: 3 }); }
  }
  px.part();
  px.poly([[C[0] - 5.6, C[1] - 3.4], [C[0] + 5.6, C[1] - 3.4], [C[0] + 6, C[1] + 0.2], [C[0] - 6, C[1] + 0.4]], L.IRON, 8.7, { round: 0.9, cast: 1 });
  px.line(C[0] - 5.2, C[1] + 0.6, C[0] + 5.4, C[1] + 0.4, IRONK, 8.72, { fix: 1 });
  if (s > 0) px.line(C[0], C[1] - 3, C[0], C[1] + 0.2, STEELB, 8.74, { fix: 4, noLine: true });          // the keel of the breastplate
  else for (const dx of [-3.4, 3.4]) px.dot(C[0] + dx, C[1] - 1.6, STEELB, 8.74, { fix: 3 });
  for (const [sh, zz, bs] of [[sFs, 8.9, -1], [sNs, 9.2, 0]]) {                                           // the round pauldrons
    px.part();
    px.ellipse(sh[0], sh[1] + 0.2, 4.2, 3.7, L.IRON, zz, { bias: bs, cast: 1 });
    px.line(sh[0] - 3.2, sh[1] + 1.6, sh[0] + 3.2, sh[1] + 1.6, IRONK, zz + 0.01, { bias: bs });
    px.dot(sh[0] + 0.4, sh[1] - 1.6, STEELB, zz + 0.02, { fix: 4 });
  }

  // the lance arm (his right: screen left in FRONT) and the couched lance
  const hand = [nS * 6.2 + (s > 0 ? -0.4 : 0.4), C[1] + 7.6];
  const arm = ik(sNs[0], sNs[1], hand[0], hand[1], 5.6, 5.4, 1);
  const el = [nS * 8.6, (sNs[1] + hand[1]) / 2 + 0.6];
  const pen = (a, fl) => {
    px.part();
    px.poly([a, [a[0] + 1.6, a[1] + 3 + fl * 0.3], [a[0] + 7 + fl * 1.2, a[1] + 5 + fl], [a[0] + 10.6 + fl, a[1] + 3.6], [a[0] + 6.4 + fl * 0.6, a[1] + 1.8], [a[0] + 3, a[1] + 0.4]], L.OX, 13.2, { round: 0.6, cast: 1 });
    px.line(a[0] + 1, a[1] + 1.4, a[0] + 7.6 + fl, a[1] + 4.2, BRASS, 13.24, { noLine: true });
  };
  const fl = cl(Math.sin(ph * TAU * 2) * 1.2 + vx * 0.6, -2.4, 2.4);
  if (s > 0) {
    // the lance comes at us: its butt rides behind his shoulder (hidden by him), the banded shaft runs from the hand down toward us, the steel head and pennon beside the horse's head
    px.part();
    const bt = [nS * 3.4, C[1] - 7], tp = [nS * 12.6, Hp[1] + 11.4 + by * 0.1];
    const segs = [[bt, hand, 7.5], [hand, tp, 13]];
    for (const [A, B, z] of segs) for (let i = 0; i < 4; i++) {
      const a = mix(A, B, i / 4), c = mix(A, B, (i + 1) / 4);
      px.capsule(a[0], a[1], z > 10 ? 1.1 + i * 0.12 : 1, c[0], c[1], z > 10 ? 1.1 + (i + 1) * 0.12 : 1, i % 2 ? CREAM : L.OX, z, { cast: 1 });
    }
    px.part();
    const d = [tp[0] - hand[0], tp[1] - hand[1]], dl = Math.hypot(d[0], d[1]), u = [d[0] / dl, d[1] / dl], nn = [-u[1], u[0]], hd = [tp[0] + u[0] * 6, tp[1] + u[1] * 6];
    px.capsule(tp[0] - u[0] * 0.8, tp[1] - u[1] * 0.8, 1.7, tp[0] + u[0] * 0.8, tp[1] + u[1] * 0.8, 1.7, IRONK, 13.3, { floor: 1 });
    px.poly([[tp[0] + nn[0] * 1.6, tp[1] + nn[1] * 1.6], [hd[0] + nn[0] * 0.3, hd[1] + nn[1] * 0.3], [hd[0] + u[0] * 1.6, hd[1] + u[1] * 1.6], [hd[0] - nn[0] * 0.3, hd[1] - nn[1] * 0.3], [tp[0] - nn[0] * 1.6, tp[1] - nn[1] * 1.6]], STEELB, 13.4, { fix: 3 });
    px.line(tp[0], tp[1] + 0.5, hd[0], hd[1], STEELB, 13.42, { fix: 4, noLine: true });
  } else {
    // from behind the couched lance is mostly hidden by him: only its butt cap by the hip and a stub of banded shaft angling in under his arm
    px.part();
    const bt = [nS * 7.4, Hp[1] + 1.4], tp = [nS * 5.2, Hp[1] - 4.4];
    for (let i = 0; i < 2; i++) {
      const a = mix(bt, tp, i / 2), c = mix(bt, tp, (i + 1) / 2);
      px.capsule(a[0], a[1], 1.6, c[0], c[1], 1.4, i % 2 ? CREAM : L.OX, 10.4, { cast: 1 });
    }
    px.part();
    px.ellipse(bt[0], bt[1] + 0.8, 2.3, 1.9, IRONK, 10.6, { floor: 1 });
    px.dot(bt[0] - 0.4, bt[1] + 0.4, STEELB, 10.7, { fix: 4 });
  }
  px.part();
  px.limb([[sNs[0], sNs[1] + 0.6], el, hand], [2.4, 2.1, 1.7], L.IRON, 10.5, { cast: 1 });
  px.ellipse(el[0], el[1], 2, 1.9, L.IRON, 10.55, { cast: 1 });
  px.part();
  px.ellipse(hand[0], hand[1], 1.9, 1.9, LEATHER, 10.7);
  void arm;

  // the helm: FRONT the sallet's face, the plume's crest over the dome; BACK the dome, the tail plate and the plume streaming down it
  px.part();
  const crest = (z) => px.poly(s > 0
    ? [[hx - 2.6, hy - 11.4], [hx + 2.6, hy - 11.4], [hx + 3, hy - 14], [hx + 0.6 + tuft * 0.4, hy - 15.6], [hx - 2.4 + tuft * 0.5, hy - 14.6]]
    : [[hx - 3, hy - 11.6], [hx + 3, hy - 11.6], [hx + 3.4, hy - 8], [hx + 3 + tuft * 0.7, hy - 2.4], [hx + 0.6 + tuft, hy + 0.2], [hx - 2.6 + tuft * 0.7, hy - 3.2], [hx - 3.4, hy - 8.4], [hx - 1.4, hy - 15]], L.CREST, z, { round: 0.85, cast: 1 });
  if (s < 0) {
    px.stamp(BACK_H, hx, hy, LEG, 9.5, { ax: 6, ay: 12, ball: [6, 6, 7, 7], cast: 2 });
    px.part(); crest(9.6);
    px.part(); px.line(hx - 0.2 + tuft * 0.4, hy - 11, hx + 0.4 + tuft * 0.8, hy - 1, L.errant ? CREAM : OXK, 9.7, { noLine: true });
  } else {
    crest(9.4);
    px.part();
    px.stamp(p.rBlink ? blinkF(FRONT_H) : FRONT_H, hx, hy, LEG, 9.5, { ax: 6, ay: 12, ball: [6, 6, 7, 7], cast: 2 });
  }
  px.dot(hx + (s > 0 ? 0 : 0), hy - 10.6, BRASS, 9.8, { fix: 3 });
  return info;
};

const walk = { ...SIDE.walk };
// foot, bob and seat come from the same solved beast: the BOX holds the widest view (the shield and the stirrups)
export const FRONT = { NAME: "cavalier-front", BOX, BONES: HUMAN, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "cavalier-back", BOX, BONES: HUMAN, draw: make(-1), CLIPS: { walk } };
