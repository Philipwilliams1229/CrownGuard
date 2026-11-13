// ============ FIGURE: the DRAGON, the Greenwood's boss ============
// "Flies over the road: knights cannot block it." Slow and enormous: about
// 190 px from the tail's spade to the snout, the wings 60 px above the back,
// the barrel of the body held ~30 px above its ground point (the anchor of BOX
// is the ground UNDER it). Side-on facing +x with a quarter turn: a deep red
// hide, cream plates from the throat to the tail, wine wings (the near one in
// front of the body, the far one a tone down behind), pale horns and claws, a
// gold slit eye.
//
// It does not walk, so the biped skeleton is unused. Each clip's pose is a few
// numbers of its own (`wp` where the wingbeat stands, `amp` how deep it is,
// `coil` the neck drawn back (-) or thrown out (+), `swell`, `jaw`, `fire`...),
// read back off `F.sk.p`; everything that trails (forearm, fingers, the
// membrane's edge, neck, tail, legs) asks the same beat for an EARLIER moment.
//   - the body is ONE tube from the tail's tip to the skull (`tube`): the kit
//     shades it from a smooth normal, so the light runs along the form in clean
//     bands; the belly side is the cream plates, seamed at fixed places.
//   - a wing is a flat fan of bones hinged along the back. Its bones keep their
//     length IN THE WING; what changes on screen is the hinge's angle (the fan
//     seen from below when raised, edge-on at mid-stroke, from above when down),
//     the forearm, fingers and membrane each a beat later than the arm.
//   - the membranes are toned by hand (a lit swell behind each finger, a fold's
//     shadow ahead of the next), never lit as a ball.
//   - the head is a hand-pixelled grid on whole pixels; the jaw has two grids.
// `walk` IS the wingbeat (the board plays it on a clock). `attack` is the
// breath: the flame is drawn in `fx`, its light returned from `draw`.
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys, EASE } from "./rig.js";

const RED = mat("#b4463a"), BELLY = mat("#ecd4a2"), MEM = mat("#6c2630"), MEMF = mat("#501c28"), SPINE = mat("#4e1c28"), HORN = mat("#e8dfc6"), FANG = mat("#f6eedc");
const HORNF = mat("#b0a080");
const EYE = flat("#e8c14a", { emis: true }), EYEH = flat("#fff2a8", { emis: true }), EYE2 = flat("#c06a24"), PUP = flat("#1a1016"), MOUTH = flat("#3a1018"), THROAT = flat("#f0a040", { emis: true }), THROAT2 = flat("#f8d868", { emis: true });
const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30"].map((c) => flat(c, { emis: true }));
const SMOKE = flat("#8a8088");

// ---- the head: facing +x, 40 x 18 (the jaw shut) ----------------------------------
// R the hide (r shade, d deep, L lit, H highlight), W the near horn (w its shade), x the far horn,
// Y the eye's gold (y the lower lid, P the slit), T a tooth, C the chin's cream (c, k darker),
// f the cheek frill (g its shade), M the mouth.
const HEAD = [
  "....xxx.................................",
  "WW.....xxxx.............................",
  ".WWWw.....xxxx..........................",
  "...WWWWw.....xxxx.LLLL..................",
  "......WWWWWw...xxxLLLLLLL...............",
  ".........wWWWWw.RRLLLLdddLLL............",
  "............wWWWRRRRRdddddddddL.........",
  "..............wRRRRRRdEYYPYYdddLLL......",
  "..............RRRRRRRRdyYPYydRRRLLLLLL..",
  ".......g.....rRRRRRRRRRrdddrRRRRRRRRLHHL",
  ".....ggf....rrRRRRRRRRRRRRRRRRRRRRRRdRRL",
  "...gfff.f..rrrRRRRRRRRRRRRRRRRRRRRRRRRRr",
  ".gffff.ffrrrrRRRRRRrrrrrrrrrrrrrrrrrrrr.",
  "....gffffrrrrRRRrrTrTrTrrTrTrrTrTrrTrT..",
  "......gfgrrrrrrrrrrrrrrrrrrrrrrrrrrrr...",
  ".........ddrrrrrkkccccccccccccccccc.....",
  "............dddrkkkkccccccccccc.........",
  "................kkkkkkkk................",
];
// the jaws wide: the same skull, the lower jaw dropped from its hinge (m: the back of the throat)
const OPEN = [
  ...HEAD.slice(0, 13),
  "....gffffrrrrRRRrrTMTMTMMTMTMMTMTMMTMT..",
  "......gfgrrrrrrrmmmmmmMMMMMMMMMMMMMM....",
  ".........ddrrrrrrrmmmmMMMMMMMMMMMM......",
  "............drrrrrrrTMMMTMMMMMMMM.......",
  "..............kkrrrrrrrrTMMTMMMM........",
  "................kkccrrrrrrrrTMMT........",
  "...................kkccrrrrrrrrr........",
  "......................kkcccrrrr.........",
  ".........................kkkkk..........",
];
const legend = (mouth, deep) => ({
  R: { m: RED, fix: 2 }, r: { m: RED, fix: 1 }, d: { m: RED, fix: 0 }, L: { m: RED, fix: 3 }, H: { m: RED, fix: 4 },
  W: { m: HORN, fix: 3 }, w: { m: HORN, fix: 2 }, x: { m: HORNF, fix: 2 },
  Y: { m: EYE }, E: { m: EYEH }, y: { m: EYE2 }, P: { m: PUP }, T: { m: FANG, fix: 4 },
  C: { m: BELLY, fix: 3 }, c: { m: BELLY, fix: 2 }, k: { m: BELLY, fix: 1 },
  f: { m: SPINE, fix: 3 }, g: { m: SPINE, fix: 1 }, M: { m: mouth }, m: { m: deep },
});
const LEG = legend(MOUTH, MOUTH), LEG_HOT = legend(THROAT, THROAT2);

export const BOX = { w: 236, h: 144, ox: 106, oy: 134 };
export const BONES = HUMAN;            // unused: a flier poses itself

const TAU = Math.PI * 2, RAD = Math.PI / 180;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const frac = (v) => v - Math.floor(v);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const hash = (a, b, c) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the beat -------------------------------------------------------------------
// The hinge's angle above level: up, then the downstroke (the shorter, stronger share of the
// beat), then the slower upstroke with the fan folding a little to slip the air.
const UP = 62 * RAD, DOWN = -24 * RAD, DS = 0.4;
const flapAt = (w, amp) => {
  w = frac(w);
  const md = (UP + DOWN) / 2;
  if (w < DS) return { phi: md + (UP + (DOWN - UP) * EASE.io(w / DS) - md) * amp, fold: 0 };
  const u = (w - DS) / (1 - DS);
  return { phi: md + (DOWN + (UP - DOWN) * EASE.io(u) - md) * amp, fold: Math.sin(Math.PI * u) * amp };
};
// The HAND (the fingers' fan) hinges at the wrist a beat behind the arm: it follows the downstroke
// closely, then hangs, drooping, while the arm starts back up, and is whipped up after it. So the
// wing is bent on the recovery (arm rising, hand still down) and never a flat sliver for long.
const HAND = [[0, 60], [0.07, 62], [0.45, -24], [0.62, -36], [1, 60]];
const handAt = (w, amp) => {
  w = frac(w);
  const md = (UP + DOWN) / 2;
  for (let i = 0; i + 1 < HAND.length; i++) if (w <= HAND[i + 1][0]) {
    const [a0, a] = HAND[i], [b0, bb] = HAND[i + 1];
    return md + ((a + (bb - a) * EASE.io((w - a0) / (b0 - a0))) * RAD - md) * amp;
  }
  return UP;
};
// the body is thrown up by the downstroke and sinks through the upstroke
const bobAt = (w, amp) => -3.6 * amp * Math.cos(TAU * (w - 0.46));

// ---- the spine: tail tip -> haunch -> chest -> neck -> skull, [x, y, radius] ----------------
const SPINE_REST = [
  [-92, -37, 1.4], [-84, -26, 2.3], [-72, -20, 3.4], [-58, -19, 4.8], [-44, -23, 6.6], [-30, -27.5, 9.5],
  [-16, -29.5, 13.5], [-2, -30.5, 14.8], [12, -33, 16],
  [25, -42, 10.6], [33, -51, 8], [35, -61.5, 6.8], [33.5, -71, 6.2], [37, -79, 6],
];
const NT = 5, NN = 9;                  // the tail's last index, the neck's first
const PER = 5;
const spline = (P) => {
  const out = [];
  for (let i = 0; i + 1 < P.length; i++) {
    const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
    for (let k = 0; k < PER; k++) {
      const t = k / PER, t2 = t * t, t3 = t2 * t, q = [];
      for (let c = 0; c < 3; c++) q.push(0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3));
      q.push(i + t); out.push(q);
    }
  }
  const e = P[P.length - 1]; out.push([e[0], e[1], e[2], P.length - 1]);
  return out;
};
// each sample's length along the body AT REST: plate seams and spines sit at fixed places on the hide
const REST_S = (() => { const s = spline(SPINE_REST), out = [0]; for (let i = 1; i < s.length; i++) out.push(out[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1])); return out; })();

// the posed spine. w: the beat; amp; coil: the neck drawn back (-) or thrown forward and down (+); swell: the chest
const spineAt = (w, amp, coil, swell) => {
  const b = bobAt(w, amp), P = SPINE_REST.map((q) => [q[0], q[1] + b, q[2]]);
  // the tail: a wave running down it, and its bob a beat behind the body's
  for (let i = 0; i <= NT; i++) {
    const k = NT - i, A = [0, 0.7, 1.7, 2.9, 4.2, 5.6][k] * (0.5 + 0.5 * amp);
    P[i][1] += A * Math.sin(TAU * (w - 0.2 - 0.085 * k)) + (bobAt(w - 0.05 * k, amp) - b);
    P[i][0] += A * 0.35 * Math.cos(TAU * (w - 0.2 - 0.085 * k));
  }
  // the neck: the same, lighter; then the coil
  const back = [[-1, 0], [-4, -1], [-8, -3], [-11, -4], [-12, -5]], out = [[1, 0.5], [3, 2], [6, 5], [10, 9], [14, 13]];
  for (let i = NN; i < P.length; i++) {
    const k = i - NN + 1;
    P[i][1] += bobAt(w - 0.035 * k, amp) - b;
    P[i][0] += 0.28 * k * Math.sin(TAU * (w - 0.25 - 0.05 * k)) * amp;
    const v = coil < 0 ? back[k - 1] : out[k - 1], c = Math.abs(coil);
    P[i][0] += v[0] * c; P[i][1] += v[1] * c;
  }
  P[8][2] += 2.2 * swell; P[7][2] += 0.8 * swell; P[9][2] += 1.6 * swell; P[10][2] += 0.7 * swell;
  return P;
};

// ---- the tube: the body's one skin -------------------------------------------------
// pts: spline samples [x, y, r, u]. paint(S, u, sv, nx, ny) -> the pixel's options (m, n, bias, vb...)
// or null; S the length along the body at rest, u the control index, sv -1 (the back) .. +1 (the belly).
const tube = (px, pts, z, paint) => {
  const segs = [];
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1e-6;
    segs.push([a[0], a[1], a[2], dx, dy, len * len, b[2] - a[2], REST_S[i], REST_S[i + 1] - REST_S[i], a[3], b[3] - a[3], dx / len, dy / len]);
    const R = Math.max(a[2], b[2]) + 1;
    x0 = Math.min(x0, a[0] - R, b[0] - R); x1 = Math.max(x1, a[0] + R, b[0] + R); y0 = Math.min(y0, a[1] - R, b[1] - R); y1 = Math.max(y1, a[1] + R, b[1] + R);
  }
  for (let j = Math.floor(y0); j <= Math.ceil(y1); j++) for (let i = Math.floor(x0); i <= Math.ceil(x1); i++) {
    const x = i + 0.5, y = j + 0.5;
    let bq = 1, bs = null, bt = 0, bx = 0, by = 0, br = 1;
    for (const s of segs) {
      const t = cl(((x - s[0]) * s[3] + (y - s[1]) * s[4]) / s[5], 0, 1), r = s[2] + s[6] * t;
      const vx = x - s[0] - s[3] * t, vy = y - s[1] - s[4] * t, q = Math.hypot(vx, vy) / r;
      if (q < bq) { bq = q; bs = s; bt = t; bx = vx; by = vy; br = r; }
    }
    if (!bs) continue;
    const o = paint(bs[7] + bs[8] * bt, bs[9] + bs[10] * bt, (-bx * bs[12] + by * bs[11]) / br, bx / br, by / br);
    if (o) px.dot(x, y, o.m, z, o);
  }
};

// a polygon filled pixel by pixel, each pixel's options from fn(x, y)
const fillPoly = (px, pts, z, fn) => {
  let y0 = 1e9, y1 = -1e9;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let j = Math.floor(y0); j <= Math.ceil(y1); j++) {
    const py = j + 0.5, xs = [];
    for (let a = 0; a < pts.length; a++) {
      const p = pts[a], q = pts[(a + 1) % pts.length];
      if ((p[1] <= py && q[1] > py) || (q[1] <= py && p[1] > py)) xs.push(p[0] + ((py - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
    }
    xs.sort((a, b) => a - b);
    for (let s = 0; s + 1 < xs.length; s += 2) for (let i = Math.ceil(xs[s] - 0.5); i <= Math.floor(xs[s + 1] - 0.5); i++) { const o = fn(i + 0.5, py); if (o) px.dot(i + 0.5, py, o.m, z, o); }
  }
};

// ---- a wing ------------------------------------------------------------------------
// In the wing's own plane: u along the body (forward +), s out along the span. Angles in degrees
// from straight out, forward +. The arm (upper, fore) and four fingers from the wrist.
const UPPER = 16, FORE = 24, FLEN = [24, 46, 49, 48], FDEG = [38, -3, -41, -79];
const TILT = 0.2;                    // the quarter turn and the camera's height: what "toward the viewer" does on screen
const wingAt = (R, near, w, amp, k) => {
  const sd = near ? 1 : -1, TURN = near ? 0.3 : 0.08;   // the far wing stays behind the body
  const fa = flapAt(w, amp), hc = handAt(w, amp), hm = handAt(w - 0.07, amp), hb = fa.phi + (hc - fa.phi) * 0.35;
  const seg = (p, len, deg, phi) => {
    const du = Math.sin(deg * RAD) * len, ds = Math.cos(deg * RAD) * len;
    return [p[0] + (du - sd * TURN * Math.cos(phi) * ds) * k, p[1] - (Math.sin(phi) - sd * TILT * Math.cos(phi)) * ds * k];
  };
  const f = fa.fold;
  const E = seg(R, UPPER, -35 - 18 * f, fa.phi), W = seg(E, FORE, 28 + 16 * f, hb);
  const th = FDEG.map((d) => 38 + (d - 38) * (1 - 0.25 * f) - 10 * f);
  return { R, E, W, T: th.map((d, i) => seg(W, FLEN[i], d, hc)), Tm: th.map((d, i) => seg(W, FLEN[i], d, hm)), top: Math.sin(hc) - sd * TILT * Math.cos(hc) < 0 };
};
const bez = (a, c, b, n = 6) => { const out = []; for (let i = 1; i < n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return out; };
// where a point sits between two fingers of the fan: 0 on the first, 1 on the second
const fan = (W, A, B) => {
  const la = Math.hypot(A[0] - W[0], A[1] - W[1]) || 1, lb = Math.hypot(B[0] - W[0], B[1] - W[1]) || 1;
  const ax = (A[0] - W[0]) / la, ay = (A[1] - W[1]) / la, bx = (B[0] - W[0]) / lb, by = (B[1] - W[1]) / lb;
  return (x, y) => { const vx = x - W[0], vy = y - W[1], ca = Math.abs(ax * vy - ay * vx), cb = Math.abs(bx * vy - by * vx); return ca / (ca + cb + 1e-6); };
};
const WN = [0.3, 0.4, 0.86];           // the membrane's face, for the fire's light: down and forward
const wing = (px, wg, B, z, near) => {
  const M = near ? MEM : MEMF, { R, E, W, T, Tm } = wg;
  const up = near && wg.top ? 1 : 0;    // the near wing seen from above catches the sun
  const O = [1, 2, 3, 4].map((t) => ({ m: M, fix: Math.min(4, t), n: WN, cast: 0 }));
  const tone = (q) => O[(q < 0.3 ? 2 : q > 0.74 ? 0 : 1) + (up && q < 0.74 ? 0 : 0)];
  px.part();
  const edge = [];
  for (let i = 0; i < 3; i++) {
    const c = mix(mix(Tm[i], Tm[i + 1], 0.5), W, 0.46), cv = bez(T[i], c, T[i + 1]), a = fan(W, T[i], T[i + 1]);
    fillPoly(px, [W, T[i], ...cv, T[i + 1]], z, (x, y) => tone(a(x, y)));
    edge.push([T[i], ...cv, T[i + 1]]);
  }
  {
    const c = mix(mix(Tm[3], B, 0.5), E, 0.4), cv = bez(T[3], c, B), a = fan(W, T[3], B);
    fillPoly(px, [R, E, W, T[3], ...cv, B], z, (x, y) => { const q = a(x, y); return O[q < 0.24 ? 2 : q > 0.9 ? 0 : 1]; });
    edge.push([T[3], ...cv, B]);
  }
  // the trailing edge, a tone down all along
  for (const e of edge) for (let i = 0; i + 1 < e.length; i++) px.line(e[i][0], e[i][1], e[i + 1][0], e[i + 1][1], M, z + 0.01, { fix: 1, n: WN });
  // the bones: fingers tapering to the tips, the arm, a claw at the wrist
  const bo = { vb: -0.28, bias: near ? 0 : -1, cast: 0, floor: 1 };
  px.part();
  for (const t of T) px.capsule(W[0], W[1], 1.25, t[0], t[1], 0.55, RED, z + 0.1, bo);
  px.part();
  px.capsule(R[0], R[1], 3.1, E[0], E[1], 2.5, RED, z + 0.2, bo);
  px.capsule(E[0], E[1], 2.5, W[0], W[1], 1.9, RED, z + 0.2, bo);
  px.part();
  px.poly([[W[0] - 1.2, W[1] + 0.6], [W[0] + 1.6, W[1] - 4.4], [W[0] + 2, W[1] + 0.8]], HORN, z + 0.3, { fix: near ? 3 : 1 });
};

// a leg: a chain of capsules and three claws on the foot
const leg = (px, pts, rad, z, bias) => {
  const o = { vb: -0.28, bias, cast: 1, floor: 1, edge: true };
  px.part();
  for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], rad[i], pts[i + 1][0], pts[i + 1][1], rad[i + 1], RED, z, o);
  const f = pts[pts.length - 1];
  px.part();
  for (let i = 0; i < 3; i++) px.rect(Math.round(f[0]) - 2 + i * 2, Math.round(f[1] + rad[rad.length - 1]) - 1, 1, 2, bias < 0 ? HORNF : HORN, z + 0.05, { fix: bias < 0 ? 2 : 3 });
};

export const draw = (px, { sk }, o = {}) => {
  const p = sk.p, w = p.wp, amp = p.amp ?? 1, sun = o.flip ? 1 : -1;
  const b = bobAt(w, amp);
  const P = spineAt(w, amp, p.coil || 0, p.swell || 0), pts = spline(P);
  // what hangs swings a beat behind the body
  const dang = (bobAt(w - 0.12, amp) - b) * 0.8;

  // ---- the far wing, behind it all
  wing(px, wingAt([12, -46 + b], false, w, amp, 1), [-18, -40 + b], 0.5, false);

  // ---- the far legs, a tone down
  // tucked for flight: the hind legs trail back under the tail's root, the forelegs fold under the chest
  const hind = (ox, oy) => [[-17 + ox, -23 + oy + b], [-10.5 + ox - dang * 0.3, -14.5 + oy + b + dang * 0.4], [-21 + ox - dang * 0.8, -10.5 + oy + b + dang], [-26.5 + ox - dang, -8.6 + oy + b + dang * 1.3]];
  const fore = (ox, oy) => [[16 + ox, -22 + oy + b], [10 + ox - dang * 0.3, -15 + oy + b + dang * 0.4], [17 + ox - dang * 0.6, -12.2 + oy + b + dang], [21 + ox - dang * 0.7, -10 + oy + b + dang * 1.2]];
  leg(px, hind(7, -2.5), [5, 3.7, 2.6, 2.2], 1, -1);
  leg(px, fore(7, -2.5), [4.4, 3.3, 2.4, 2], 1, -1);

  // ---- the spines down the neck, the back and the tail, and the tail's spade
  px.part();
  for (let S = 10; S < REST_S[REST_S.length - 1] - 6; S += 7.5) {
    let i = 1; while (i < REST_S.length - 1 && REST_S[i] < S) i++;
    const a = pts[i - 1], c = pts[i], t = (S - REST_S[i - 1]) / (REST_S[i] - REST_S[i - 1] || 1);
    const x = a[0] + (c[0] - a[0]) * t, y = a[1] + (c[1] - a[1]) * t, r = a[2] + (c[2] - a[2]) * t, u = a[3] + (c[3] - a[3]) * t;
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, tx = (c[0] - a[0]) / l, ty = (c[1] - a[1]) / l, nx = ty, ny = -tx;   // (nx, ny): out of the back
    const h = u < NT ? 1.6 + u * 0.7 : u < 8.4 ? 6 : 4.6, hw = u < NT ? 1.3 + u * 0.2 : 2.6;
    const bx = x + nx * (r - 1.5), by = y + ny * (r - 1.5);
    px.poly([[bx - tx * hw, by - ty * hw], [bx + tx * hw, by + ty * hw], [bx + nx * (h + 1.5) - tx * h * 0.55, by + ny * (h + 1.5) - ty * h * 0.55]], SPINE, 1.5, { fix: 2, n: [0, -0.4, 0.9] });
  }
  {
    const e = pts[0], q = pts[2], l = Math.hypot(e[0] - q[0], e[1] - q[1]) || 1, dx = (e[0] - q[0]) / l, dy = (e[1] - q[1]) / l, nx = -dy, ny = dx;
    const at = (f, s) => [e[0] + dx * f + nx * s, e[1] + dy * f + ny * s];
    px.poly([at(-1, 1.2), at(0.5, 5.4), at(9.5, 0), at(-1, 0)], SPINE, 1.6, { fix: sun * nx + ny < 0 ? 3 : 1 });
    px.poly([at(-1, -1.2), at(0.5, -5.4), at(9.5, 0), at(-1, 0)], SPINE, 1.6, { fix: sun * nx + ny < 0 ? 1 : 3 });
  }

  // ---- the body: tail, barrel and neck in one skin
  const Lx = 0.6018 * sun, Ly = -0.6218, Lz = 0.5015;
  const heat = p.heat || 0;
  px.part();
  tube(px, pts, 2, (S, u, sv, nx, ny) => {
    const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny)), n = [nx, ny, nz];
    // where the plates begin: nothing on the tail's end, a wide band under the barrel, the throat
    const th = u < 2 ? 2 : u < 4 ? 0.86 - (u - 2) * 0.2 : u < 8 ? 0.46 - (u - 4) * 0.02 : u < 9 ? 0.38 - (u - 8) * 0.12 : 0.26;
    if (sv > th) return { m: BELLY, n, vb: 0.3, bias: frac(S / 5.2) < 0.2 ? -1 : 0, cast: 1, floor: 1 };
    const lv = nx * Lx + ny * Ly + nz * Lz;
    return { m: RED, n, vb: -0.28, bias: sv > th - 0.13 ? -1 : lv > 0.9 ? 1 : 0, cast: 1, floor: 1 };
  });

  // ---- the near legs: the haunch stands off the flank
  px.part();
  px.ellipse(-17, -25 + b, 9.4, 7.6, RED, 2.6, { rot: 0.5, vb: -0.28, edge: true, cast: 1, floor: 1 });
  leg(px, hind(0, 0), [5.6, 4, 2.8, 2.4], 2.62, 0);
  leg(px, fore(0, 0), [4.8, 3.6, 2.6, 2.2], 2.62, 0);

  // ---- the near wing over the body
  const R = [5, -45 + b];
  wing(px, wingAt(R, true, w, amp, 1.15), [-26, -37 + b], 4, true);
  px.part();
  px.ellipse(R[0], R[1], 3.8, 3.6, RED, 4.25, { vb: -0.28, floor: 1 });

  // ---- the head, on whole pixels
  const N = P[P.length - 1], hx = Math.round(N[0]), hy = Math.round(N[1]);
  const open = (p.jaw || 0) > 0.5, hot = (p.fire || 0) > 0.05 || heat > 0.85;
  px.part();
  px.stamp(open ? OPEN : HEAD, hx, hy, open && hot ? LEG_HOT : LEG, 6, { ax: 15, ay: 12, ball: [20, 9, 21, 10] });

  // ---- light: the fire at the mouth; before it, the furnace kindling in the throat
  const mouth = [hx + 19, hy + 3.5], fire = p.fire || 0, lights = [];
  if (fire > 0.03) lights.push({ x: mouth[0] + 22, y: mouth[1] + 10, r: 108, col: "#ffb040", k: cl(fire * 0.66, 0, 0.66) });
  else if (heat > 0.05) { const t = P[11]; lights.push({ x: t[0] + 5, y: t[1] + 2, r: 34, col: "#ff9a30", k: heat * 0.9 }); }
  return { light: lights[0] || null, lights, mouth, fire, reach: p.reach || 0, tail: p.tail || 0, nose: [hx + 21, hy - 3], heat };
};

// ---- the breath: stepped pixel fire, poured forward and down from the jaws -------------------
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "attack") return;
  const NL = { noLine: true }, k = Math.round(ph * 15);
  // smoke curling off the nostril while the furnace kindles
  if (info.heat > 0.3 && info.fire < 0.05) {
    const [nx, ny] = info.nose;
    for (let i = 0; i < 3; i++) { const u = frac(k * 0.31 + i * 0.37); px.ellipse(nx + 1 + u * 5 + i, ny - 2 - u * 9, 0.8 + u * 1.4, 0.8 + u * 1.2, SMOKE, 19, { fix: 2, noLine: true }); }
  }
  if (info.fire < 0.03) return;
  const [mx, my] = info.mouth, ang = 0.5, dx = Math.cos(ang), dy = Math.sin(ang);
  const L = 54 * cl(info.reach, 0.15, 1), t0 = info.tail, pw = 0.45 + 0.55 * cl(info.fire, 0, 1);
  for (let j = Math.floor(my) - 18; j <= Math.floor(my) + 44; j++) for (let i = Math.floor(mx) - 3; i <= Math.floor(mx) + 62; i++) {
    const rx = i + 0.5 - mx, ry = j + 0.5 - my, t = (rx * dx + ry * dy) / L;
    if (t < t0 || t > 1) continue;
    // the gout: narrow at the teeth, swelling, a round head; it lifts as it goes (the heat rises)
    const wv = dx * ry - dy * rx + 2.5 * t * t;
    const base = t < 0.62 ? 2.2 + 9.4 * EASE.out(t / 0.62) : 11.6 * Math.sqrt(Math.max(0, 1 - ((t - 0.62) / 0.38) ** 2));
    const wob = (1.5 * Math.sin(t * 11 - k * 1.9 + (wv > 0 ? 1.3 : 0)) + 0.9 * Math.sin(t * 23 + k * 2.7)) * Math.min(1, t * 3);
    const rear = t0 > 0 ? Math.min(1, (t - t0) * 5) : 1;
    const half = Math.floor((base + wob) * pw * rear * 2) / 2;
    if (half <= 0) continue;
    const q = Math.abs(wv) / half;
    if (q > 1) continue;
    // the torn tip: whole 2x2 pieces missing
    if (t > 0.74 && q > 0.3 && hash(i >> 1, j >> 1, k) < (t - 0.74) * 2.4 * q) continue;
    const h = (1 - q) * (1 - t * 0.86) * (0.6 + 0.4 * rear);
    px.dot(i + 0.5, j + 0.5, FIRE[h > 0.6 ? 0 : h > 0.42 ? 1 : h > 0.24 ? 2 : h > 0.09 ? 3 : 4], 20, NL);
  }
  // embers thrown past the tip
  for (let i = 0; i < 7; i++) {
    const u = hash(i, 7, k), v = hash(i, 13, k) - 0.5, d = L * (0.8 + u * 0.45);
    if (u * 1.2 < t0) continue;
    px.dot(mx + dx * d - dy * v * 22, my + dy * d + dx * v * 20 - 2.5 * (d / L) ** 2, FIRE[i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 3], 20, NL);
  }
};

const FLY = { amp: 1, coil: 0, swell: 0, jaw: 0, fire: 0, reach: 0, tail: 0, heat: 0 };
const WALK = { n: 10, ms: 1100, loop: true, pose: (ph) => ({ ...FLY, wp: ph }) };
export const CLIPS = {
  idle: WALK,
  walk: WALK,
  // the breath: the neck coils back and the chest swells, the jaws open on the kindled throat, the
  // head is thrown out and the fire pours for the middle third while the wings hold a hovering beat
  attack: {
    n: 16, ms: 1500, loop: false,
    pose: (ph) => ({
      ...sampleKeys([
        { t: 0, p: FLY },
        { t: 0.2, e: "out", p: { ...FLY, amp: 0.72, coil: -0.95, swell: 0.8, heat: 0.5 } },
        { t: 0.31, e: "io", p: { ...FLY, amp: 0.72, coil: -1.1, swell: 1, jaw: 1, heat: 1 } },
        { t: 0.38, e: "in3", p: { ...FLY, amp: 0.72, coil: 1, swell: 0.5, jaw: 1, fire: 1, reach: 0.6, heat: 1 } },
        { t: 0.45, e: "out", p: { ...FLY, amp: 0.72, coil: 0.9, swell: 0.4, jaw: 1, fire: 1, reach: 1, heat: 1 } },
        { t: 0.68, e: "lin", p: { ...FLY, amp: 0.72, coil: 0.84, swell: 0.15, jaw: 1, fire: 1, reach: 1, heat: 0.8 } },
        { t: 0.78, e: "io", p: { ...FLY, amp: 0.8, coil: 0.5, jaw: 1, fire: 0.5, reach: 1, tail: 0.62, heat: 0.4 } },
        { t: 0.84, e: "io", p: { ...FLY, amp: 0.9, coil: 0.3, jaw: 0, fire: 0, reach: 1, tail: 1 } },
        { t: 1, e: "io", p: FLY },
      ], ph),
      wp: ph * 2,
    }),
  },
};
