// ============ CREW FIGURE: the tower archer ============
// The bowman of the Archer halls, in the crown's kit as he always was: the
// Archery's peaked cowl (its point trails him), a belted jerkin, a quiver on his
// back, a bracer on the bow arm. Wren (fig-archer.js) is the worked example for
// the bow handling; he is his own man: taller (a crew stands ~47 art px to the
// crown, as the old folk-archer.js figure did), hooded, and he reloads in the clip.
//   variant   "<livery>" or "<livery>|long": a key of ARCHER_FOLK (base, a, b, aa,
//             ab, bb; the hall's own key), "|long" for the Master Longbowman's
//             war bow (a taller bow and a longer arrow, NOT a bigger man)
//   clips     idle (at ease: the bow low, the string hand at his side, breathing)
//             stow (standing down: the arrow off the string and back in the quiver)
//             shoot / shootLong (raise, draw, HOLD, loose = `hit`, the hand flying
//             back, over the shoulder to the quiver, the arrow brought round and
//             nocked): the frame before the hit is full draw, which he holds
//   marks     hand = the bow hand on the grip (where the engine starts the arrow:
//             engine/muzzles.js bowHand), nock = where the arrow sits on the string
import { mat, flat } from "./pix.js";
import { sampleKeys, solve, HUMAN, scaled } from "./rig.js";
import { ARCHER_FOLK } from "../folk-archer.js";

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(cl(v, 0, 255)).toString(16).padStart(2, "0")).join("");
const darken = (h, k) => hex(rgb(h).map((v) => v * (1 - k)));
const lighten = (h, k) => hex(rgb(h).map((v) => v + (255 - v) * k));

// ---- the looks: one set of materials a variant, built once ------------------------
const EYE = flat("#2a1c2c"), STRING = flat("#f2ead4", { line: "#6a5a48" }), GOLD = mat("#d8b34a"), STEEL = mat("#c4c8d0", { contrast: 1.2 });
const SHAFT = mat("#8a6a44"), QUIVER = mat("#553622"), BRACER = mat("#6a4628");
const LOOKS = new Map();
const lookOf = (variant) => {
  const v = variant || "base";
  let L = LOOKS.get(v);
  if (L) return L;
  const [key, bow] = v.split("|"), pal = ARCHER_FOLK[key] || ARCHER_FOLK.base, long = bow === "long";
  // the hall's own choices (halls/archer.js): the Dragonslayer's red yew, the master's dark stave; whose fletchings
  const bowCol = key === "bb" ? "#8a2f24" : key === "b" ? "#3a2a1e" : "#4a3018";
  const fl = key === "bb" ? "#d8b34a" : key === "ab" ? "#9fc4dc" : "#e8e0c8";
  const HOOD = mat(pal.hood), SKIN = mat(pal.skin), LIP = flat(darken(pal.skin, 0.4));
  const head = (flip) => ({
    // H the cowl, h its folds, d the dark of its lining; A the band the sun catches when it is behind him,
    // F the band it catches once he is re-lit facing left (one sun: see the style guide)
    H: { m: HOOD, fix: 2 }, h: { m: HOOD, fix: 1 }, d: { m: HOOD, fix: 0 }, A: { m: HOOD, fix: flip ? 2 : 3 }, F: { m: HOOD, fix: flip ? 3 : 2 },
    a: { m: HOOD, fix: flip ? 1 : 2 }, f: { m: HOOD, fix: flip ? 2 : 1 },
    S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, E: { m: EYE }, m: { m: LIP },
  });
  L = {
    long, HOOD, SKIN, legend: [head(false), head(true)],
    COAT: mat(pal.coat), SLEEVE: mat(lighten(pal.coat, 0.12)), BELT: mat(pal.trim), HOSE: mat(lighten(pal.boots, 0.3)), BOOT: mat(darken(pal.boots, 0.1)),
    BOW: mat(bowCol, { contrast: 1.2 }), GRIP: mat(darken(bowCol, 0.4)), FLETCH: mat(fl), COCK: mat(bowCol === "#4a3018" ? "#a04a3f" : fl),
    H: long ? 20 : 15,          // the bow's half length (the old one: 7.6 units, the big bow 8.6 x 1.15)
    AL: long ? 24 : 21,         // the arrow's
  };
  LOOKS.set(v, L);
  return L;
};

// His head in the cowl, facing +x: the face at the front edge, the nose proud, the
// cowl on the crown, the near side and the nape only (never under the chin).
const HEAD = [
  "....AAAAF....",
  "..AAAAHHHFF..",
  ".AAAHHHHHHFF.",
  "AAHHHHHHHHHFF",
  "aHHHHHhdssss.",
  "aHHHHhdSESSE.",
  "HHHHHhdSESSEN",
  "HHHHhhdSSSSS.",
  ".HHHhdsSSmm..",
  ".HHHhdsSSSS..",
  "..HHhh.ss....",
  "..hHHh.......",
];
const BLINK = HEAD.map((r, i) => (i === 5 ? r.replace(/E/g, "S") : i === 6 ? r.replace(/E/g, "e") : r));

export const BOX = { w: 61, h: 66, ox: 19, oy: 62 };
export const BONES = scaled(HUMAN, 1.2, { upper: 7.8, fore: 7.4, shN: -3, shF: 3.2, hipN: -1.4, hipF: 1.6 });
const L_ARM = BONES.upper + BONES.fore, BRACE = 3.2;

const leg = (px, K, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.6, k[0], k[1], 2.2, K.HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 2.1, an[0], an[1] - 3, 1.9, K.HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.3 + an[0] * 0.7, k[1] * 0.3 + an[1] * 0.7, 2.2, an[0], an[1], 2, K.BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.4, an[1] + 1.1, 3.1, 1.7, K.BOOT, z + 0.03, { bias: b, floor: 1 });
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const K = lookOf(o.variant);
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), vy = cl(C[1] - lag1.C[1], -2, 2), sway = p.sway || 0;
  const back = (p.nb || 0) >= 0.5;                                   // the string arm behind the head (over the shoulder to the quiver)

  // the quiver on his back, fletchings behind the nape
  const q0 = [C[0] - 2.6, C[1] + 9], q1 = [C[0] - 8.6, C[1] - 0.6], qd = [(q1[0] - q0[0]) / 11.3, (q1[1] - q0[1]) / 11.3];
  px.part();
  px.capsule(q0[0], q0[1], 2.2, q1[0], q1[1], 2.4, QUIVER, 0.8, { floor: 1, bias: -1 });
  px.line(q1[0] - 2, q1[1] + 0.6, q1[0] + 1.8, q1[1] - 1.8, QUIVER, 0.82, { fix: 3 });
  px.part();
  for (const [dx, m] of [[-1.5, K.FLETCH], [0.3, K.COCK], [2.1, K.FLETCH]]) px.line(q1[0] + dx + qd[0] * 2.6, q1[1] - dx * 0.6 + qd[1] * 2.6, q1[0] + dx + qd[0] * 5.6, q1[1] - dx * 0.6 + qd[1] * 5.6, m, 0.78, { fix: 3 });

  // the bow arm (the far one), a tone down: sleeve, a leather bracer
  px.part();
  px.capsule(sF[0], sF[1], 2.2, eF[0], eF[1], 2.1, K.SLEEVE, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.1, hdF[0], hdF[1], 1.8, K.SLEEVE, 1, { bias: -1 });
  px.capsule(eF[0] * 0.5 + hdF[0] * 0.5, eF[1] * 0.5 + hdF[1] * 0.5, 2.1, eF[0] * 0.14 + hdF[0] * 0.86, eF[1] * 0.14 + hdF[1] * 0.86, 1.9, BRACER, 1.02, { bias: -1 });

  // the bow, its grip in the bow hand; bw rolls it (+ = the top toward the foe). The limbs
  // bend by how far the string hand has pulled the string off its brace.
  const bw = p.bow ?? 0.3, cs = Math.cos(bw), sn = Math.sin(bw), H = K.H;
  const R = (x, y) => [hdF[0] + x * cs - y * sn, hdF[1] + x * sn + y * cs];
  const held = (p.str || 0) > 0.5;
  const pull = held ? -((hdN[0] - hdF[0]) * cs + (hdN[1] - hdF[1]) * sn) - BRACE : 0;
  const bend = cl(pull / (K.long ? 17 : 14), 0, 1);
  const tx = -BRACE - bend * 4.6, ty = H - bend * 1.8, mx = 1 + bend * 0.9, r0 = K.long ? 1.25 : 1.1;
  const top = R(tx, -ty), bot = R(tx, ty);
  px.part();
  for (const s of [-1, 1]) {
    px.capsule(...R(0.3, s * 1.8), r0, ...R(mx, s * H * 0.5), r0 - 0.15, K.BOW, 1.4, { edge: true });
    px.capsule(...R(mx, s * H * 0.5), r0 - 0.15, ...R(tx + 0.2, s * ty), 0.6, K.BOW, 1.4, { edge: true });
  }
  px.capsule(...R(0.3, -2), r0 + 0.15, ...R(0.3, 2), r0 + 0.15, K.GRIP, 1.42);
  px.part(); px.ellipse(hdF[0], hdF[1], 1.9, 2, K.SKIN, 1.6, { bias: -1 });

  // legs, then the jerkin: belted, skirted to the thigh
  leg(px, K, hF, kF, anF, 2, -1);
  leg(px, K, hN, kN, anN, 3, 0);
  const hemB = P[0] - 6 - vx * 1.1, hemF = P[0] + 5.8 - vx * 0.7, hy = P[1] + 4.2;
  px.part(); const tun = px._pid;
  px.poly([[C[0] - 4.8, C[1] - 2], [C[0] + 5, C[1] - 2], [C[0] + 6, C[1] + 3.6], [P[0] + 4.9, P[1] - 3.6], [hemF, hy], [hemF - 3, hy + 0.9], [P[0] - vx, hy], [hemB + 2.8, hy + 0.9], [hemB, hy], [P[0] - 5.2, P[1] - 3.6], [C[0] - 6, C[1] + 3.6]], K.COAT, 4, { round: 0.92, cast: 2, floor: 1 });
  px.toneLine(P[0] + 1, P[1] - 0.5, P[0] + 0.8 - vx, hy - 0.5, -1, tun);
  px.poly([[P[0] - 5.3, P[1] - 5.2], [P[0] + 5, P[1] - 5.2], [P[0] + 5, P[1] - 3], [P[0] - 5.3, P[1] - 3]], K.BELT, 4.05, { round: 0.92, floor: 1 });
  px.rect(P[0] + 1.2, P[1] - 5.2, 2, 2, GOLD, 4.06, { fix: 3 });
  // the quiver's strap across the chest
  px.toneLine(C[0] - 4, C[1] + 0.5, P[0] + 3.8, P[1] - 6, -1, tun);

  // the cowl's cape on his shoulders, a tone off the hood
  const hx = Math.round(N[0]), hyy = Math.round(N[1]), tp = cl(vx * 2 + vx2 * 1.4, -2, 3) - sway * 0.5, tl = cl(vy * 1.2, -1.5, 1.5);
  px.part();
  px.poly([[C[0] - 6.2, C[1] - 3], [C[0] + 5.8, C[1] - 3], [C[0] + 6.6, C[1] + 0.4], [C[0] + 2.6, C[1] + 1.6], [C[0] - 3 - vx * 0.4, C[1] + 2], [C[0] - 7, C[1] + 1]], K.HOOD, 5, { round: 0.9, cast: 1 });

  // the string arm: a sleeve, a bare hand. Behind the head while it is over the shoulder.
  const nearArm = (z) => {
    px.part();
    px.capsule(sN[0], sN[1] + 0.3, 2.5, eN[0], eN[1], 2.2, K.SLEEVE, z, { cast: 1, vb: -0.22 });
    px.capsule(eN[0], eN[1], 2.2, hdN[0], hdN[1], 1.8, K.SLEEVE, z, { cast: 1, vb: -0.22 });
    // the cape lies over the near shoulder
    px.part(); px.ellipse(sN[0] + 0.4, sN[1] - 0.9, 3.2, 2.5, K.HOOD, z + 0.1, { cast: 1, fix: 2 });
    px.part(); px.ellipse(hdN[0], hdN[1], 1.9, 1.9, K.SKIN, z + 0.2);
    if ((p.open || 0) > 0.5) { px.dot(hdN[0] + 1.6, hdN[1] - 2.2, K.SKIN, z + 0.2); px.dot(hdN[0] + 2.4, hdN[1] - 0.6, K.SKIN, z + 0.2); }
  };
  if (back) nearArm(5.4);

  // the cowl's point, a beat behind him, then his head
  px.part();
  px.poly([[hx - 3.6, hyy - 12.4], [hx - 6.4, hyy - 11], [hx - 9.8 - tp, hyy - 9.8 + tl], [hx - 12 - tp * 1.3, hyy - 6.4 + tl * 1.5], [hx - 8 - tp * 0.6, hyy - 7.2 + tl], [hx - 5, hyy - 6.6]], K.HOOD, 5.9, { round: 0.8, fix: o.flip ? 1 : 2 });
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hyy, K.legend[o.flip ? 1 : 0], 6, { ax: 6, ay: 12, cast: 1 });

  // the string: through the string fingers while he holds it, else straight (humming after the loose)
  const nock = held ? hdN : R(-BRACE + (p.shiver || 0) * 1.6, 0);
  px.part();
  px.line(top[0], top[1], nock[0], nock[1], STRING, held ? 7.5 : 1.3, { noLine: true });
  px.line(nock[0], nock[1], bot[0], bot[1], STRING, held ? 7.5 : 1.3, { noLine: true });
  // the arrow: nocked (from the string out over the bow hand) or carried in the string hand, head first
  const arrow = (a0, ux, uy, z) => {
    const L = K.AL;
    px.part();
    px.line(a0[0], a0[1], a0[0] + ux * L, a0[1] + uy * L, SHAFT, z, { fix: 3 });
    px.capsule(a0[0] + ux * L, a0[1] + uy * L, 1, a0[0] + ux * (L + 2.4), a0[1] + uy * (L + 2.4), 0.4, STEEL, z + 0.02);
    px.capsule(a0[0] + ux * 1.4 - uy * 0.7, a0[1] + uy * 1.4 + ux * 0.7, 0.8, a0[0] + ux * 4.2 - uy * 0.7, a0[1] + uy * 4.2 + ux * 0.7, 0.6, K.FLETCH, z + 0.02);
    px.capsule(a0[0] + ux * 1.4 + uy * 0.7, a0[1] + uy * 1.4 - ux * 0.7, 0.8, a0[0] + ux * 4.2 + uy * 0.7, a0[1] + uy * 4.2 - ux * 0.7, 0.6, K.COCK, z + 0.02);
  };
  if ((p.carry || 0) > 0.5) { const aa = p.aa || 0, ux = Math.cos(aa), uy = Math.sin(aa); arrow([hdN[0] - ux * 2, hdN[1] - uy * 2], ux, uy, aa > 0.8 ? 0.7 : back ? 5.45 : 7.6); }   // into (out of) the quiver: behind him
  else if ((p.arrow || 0) >= 0.5) {
    const r = R(0.8, -1.2), ax = r[0] - nock[0], ay = r[1] - nock[1], l = Math.hypot(ax, ay) || 1;
    arrow(nock, ax / l, ay / l, 7.6);
  }
  if (!back) nearArm(8);

  return { marks: { hand: [hdF[0], hdF[1]], nock: [nock[0], nock[1]] } };
};

// ---- the poses -------------------------------------------------------------------
// Hands are PLACED (a point from the feet) and turned into the rig's [angle, reach, flip]
// about the shoulder the body's pose gives, so the string hand is on the string and the
// bow hand where the engine starts the arrow, whatever the chest is doing.
const FEET = { fN: [-2.8, 0], fF: [3, 0] };
const toArm = (sh, tx, ty, flip = 0) => { const dx = tx - sh[0], dy = ty - sh[1]; return [Math.atan2(dx, dy), Math.min(0.995, Math.hypot(dx, dy) / L_ARM), flip]; };
const handAt = (sh, a) => [sh[0] + Math.sin(a[0]) * a[1] * L_ARM, sh[1] + Math.cos(a[0]) * a[1] * L_ARM];
//   far    the bow hand [x, y]
//   near   the string hand [x, y, flip], "nock" (on the braced string), or (s, grip) => [x, y, flip]
const mk = (body, far, bow, near, more = {}) => {
  const b = { ...FEET, ...body }, s = solve(b, BONES);
  const aF = toArm(s.sF, far[0], far[1]), g = handAt(s.sF, aF);
  const nt = near === "nock" ? [g[0] - BRACE * Math.cos(bow), g[1] - BRACE * Math.sin(bow), 0] : typeof near === "function" ? near(s, g) : near;
  return { ...b, aF, aN: toArm(s.sN, nt[0], nt[1], nt[2] || 0), bow, str: 0, arrow: 0, carry: 0, aa: 0, nb: 0, shiver: 0, open: 0, ...more };
};
// low ready: the bow carried low before him, an arrow on the string, pointing at the ground ahead
const ready = (rise = 0) => mk({ rise, twist: 0.1 }, [8.6, -20.2 - rise * 0.5], 0.46, "nock", { str: 1, arrow: 1 });
// at ease: the bow carried low in the bow hand, the string hand easy at his side, no arrow out
const ease = (rise = 0, b2 = 0) => mk({ rise, twist: 0.05 }, [8.2, -19.6 - rise * 0.5], 0.5 + 0.025 * b2, (s) => [s.sN[0] + 2.2 + 0.3 * b2, s.sN[1] + 14.2, 0], { sway: b2 * 0.8 });
// the string arm goes round over the top: keep its angle running on (poses lerp raw numbers)
const unwrap = (keys, n = keys.length) => {
  for (let i = 1; i < n; i++) {
    const a = keys[i].p.aN, b = keys[i - 1].p.aN[0];
    while (a[0] - b > Math.PI) a[0] -= Math.PI * 2;
    while (a[0] - b < -Math.PI) a[0] += Math.PI * 2;
  }
  return keys;
};

// One shot. T = where the bow hand is at the loose (the engine's point); o.aim rolls the bow back
// (a longbow is aimed high), o.rx / o.rise / o.lean set the body under it.
const shot = (T, o = {}) => {
  const aim = o.aim || 0, rx = o.rx || 0, rise = o.rise || 0, lean = o.lean || 0;
  const chin = (s) => [s.N[0] + 3.4, s.N[1] + 0.2, 1];   // under the chin, so the string clears his eyes
  const keys = [
    { t: 0, p: ready(0.5) },
    // set: the bow up, the arm still soft, the string elbow raised to take the weight
    { t: 0.0667, e: "io", p: mk({ rx: rx * 0.5, lean: -0.02 + lean, twist: 0.3, rise: 0.4 + rise * 0.6 }, [T[0] - 5.6, T[1] + 1.6], 0.14 + aim, "nock", { str: 1, arrow: 1 }) },
    // full draw: the bow arm pushed out straight, the string hand at the chin, the elbow high behind
    { t: 0.2, e: "out", p: mk({ rx: -0.6 + rx, lean: -0.08 + lean, twist: -0.8, rise: 0.5 + rise }, [T[0] - 0.5, T[1] + 0.2], aim, chin, { str: 1, arrow: 1 }) },
    // the hold (the last of it is the frame he waits on): settling into the weight, three frames at full draw (the aim)
    { t: 0.333, e: "io", p: mk({ rx: -0.8 + rx, lean: -0.1 + lean, twist: -0.86, rise: 0.9 + rise }, [T[0] - 0.4, T[1]], aim, chin, { str: 1, arrow: 1 }) },
    // the loose: the string gone, the fingers open and back along the jaw, the bow arm driving on, the bow rolling
    { t: 0.4, e: "in3", p: mk({ rx: -0.1 + rx, lean: -0.03 + lean, twist: -1.05, rise: 0.6 + rise }, T, aim + 0.16, (s) => [s.N[0] - 2.8, s.N[1] - 3.6, 1], { shiver: 1, open: 1 }) },
    // the follow-through: the hand past the ear, the bow rolled on and settling
    { t: 0.467, e: "out", p: mk({ rx: rx * 0.7, lean: lean * 0.6, twist: -0.9, rise: 0.3 + rise * 0.7 }, [T[0] - 0.8, T[1] + 1.2], aim + 0.34, (s) => [s.N[0] - 5.4, s.N[1] - 3.4, 1], { shiver: 0.3, open: 1 }) },
    // over the shoulder to the quiver: the hand on the fletchings behind the nape; the bow arm eases down
    { t: 0.6, e: "io", p: mk({ rx: rx * 0.4, lean: 0.03, twist: -0.5, rise: rise * 0.4 }, [T[0] - 3.4, T[1] + 4.6], 0.3 + aim * 0.5, (s) => [s.C[0] - 9.6, s.C[1] - 4.6, 0], { nb: 1 }) },
    // the arrow drawn up out of it
    { t: 0.667, e: "out", p: mk({ rx: rx * 0.3, lean: 0.02, twist: -0.4, rise: 0.6 + rise * 0.3 }, [T[0] - 4.4, T[1] + 6], 0.34 + aim * 0.4, (s) => [s.C[0] - 9.6, s.C[1] - 7.4, 0], { nb: 1, carry: 1, aa: 1 }) },
    // down over the shoulder, the arrow still behind him (so nothing crosses his face)
    { t: 0.733, e: "io", p: mk({ rx: rx * 0.15, lean: 0.02, twist: -0.2, rise: 0.4 }, [(T[0] - 4.4 + 10.4) / 2, (T[1] + 6 - 24) / 2], 0.37 + aim * 0.2, (s) => [s.sN[0] + 5.4, s.sN[1] + 1.2, 0], { nb: 1, carry: 1, aa: 1 }) },
    // brought down and round before him, head first, the hand under the chin
    { t: 0.8, e: "io", p: mk({ rx: 0, lean: 0.02, twist: 0, rise: 0.3 }, [10.4, -24], 0.4, (s) => [s.C[0] + 7.6, s.C[1] + 3, 0], { carry: 1, aa: 0.5 }) },
    // onto the string
    { t: 0.933, e: "io", p: mk({ rise: 0.2, twist: 0.1 }, [9, -21], 0.45, "nock", { str: 1, arrow: 1 }) },
    { t: 1, e: "io", p: ready(0.5) },
  ];
  unwrap(keys);
  return (ph) => sampleKeys(keys, ph);
};
// standing down: the arrow taken off the string and put back over his shoulder, the hand down to his side
// (the hand comes down past the shoulder and the chest: those last keys keep their plain angles)
const STOW = unwrap([
  { t: 0, p: ready(0.5) },
  { t: 0.25, e: "io", p: mk({ rise: 0.3, twist: 0 }, [9.4, -22], 0.44, (s) => [s.C[0] + 7.6, s.C[1] + 3, 0], { nb: 1, carry: 1, aa: 0.5 }) },
  { t: 0.375, e: "io", p: mk({ rise: 0.4, twist: -0.2 }, [9.2, -21.5], 0.45, (s) => [s.sN[0] + 5.4, s.sN[1] + 1.2, 0], { nb: 1, carry: 1, aa: 1 }) },
  { t: 0.5, e: "io", p: mk({ rise: 0.6, twist: -0.4, lean: 0.02 }, [9, -21], 0.46, (s) => [s.C[0] - 9.6, s.C[1] - 7.4, 0], { nb: 1, carry: 1, aa: 1 }) },
  { t: 0.625, e: "io", p: mk({ rise: 0.2, twist: -0.4, lean: 0.02 }, [8.6, -20.4], 0.48, (s) => [s.C[0] - 9.6, s.C[1] - 4.6, 0], { nb: 1 }) },
  { t: 0.75, e: "io", p: mk({ rise: 0.2, twist: -0.2 }, [8.4, -20], 0.5, (s) => [s.sN[0] + 3.5, s.sN[1] - 4.4, 0], { nb: 1 }) },
  { t: 0.875, e: "io", p: mk({ rise: 0.3, twist: 0 }, [8.2, -19.8], 0.5, (s) => [s.sN[0] + 3, s.sN[1] + 9.6, 0]) },
  { t: 1, e: "out", p: ease(0.5, -0.84) },
], 6);
// the engine's points (engine/muzzles.js bowHand: folk-archer.js "loose", g + lean; x1.15 for the big bow), in art px
const T_STD = [19.3, -32.8], T_LONG = [22.2, -37.7];

export const CLIPS = {
  idle: {
    n: 8, ms: 2200, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 1); return { ...ease(0.5 + 0.5 * b, b2), blink: ph > 0.5 && ph < 0.62 ? 1 : 0 }; },
  },
  stow: { n: 9, ms: 700, loop: false, lag: 0.06, pose: (ph) => sampleKeys(STOW, ph) },
  shoot: { n: 16, ms: 900, loop: false, lag: 0.05, hit: 0.4, pose: shot(T_STD) },
  // the war bow: the same shot aimed high, the chest lifted into it, a slower, weightier draw
  shootLong: { n: 16, ms: 1500, loop: false, lag: 0.05, hit: 0.4, pose: shot(T_LONG, { aim: -0.1, rx: 3, rise: 2, lean: -0.04 }) },
};
