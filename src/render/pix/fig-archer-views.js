// ============ Wren seen from the FRONT and from BEHIND ============
// The approved side figure (fig-archer.js: auburn hair and a ponytail under a peaked hunting cap with a
// red-tipped feather, a green mantle and cloak, a quiver on her back, a longbow in the far (left) hand) drawn
// walking toward the camera (FRONT) and away from it (BACK). One drawer, `make(s)`: s = +1 front, -1 back.
// Her RIGHT arm hangs free (screen LEFT in front, RIGHT from behind: `rs`); the bow rides her LEFT hand (`ls`),
// carried upright at her side. The quiver is over her right shoulder, so its fletchings show beside her neck in
// both views. Unflipped on the board, one sun upper left. The walk keeps the side clip's n, ms and pose and
// reads feet and bob from the solved skeleton (frame 0 = the side's frame 0). Forward is down the screen in
// FRONT, up in BACK, foreshortened (FWD).
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-archer.js";

const RANGER = mat("#3d7448"), TUNIC = mat("#5a8c44"), CLOAK = mat("#335a30"), SKIN = mat("#eccaa4"), HAIR = mat("#b5623a");
const LEG_C = mat("#6a4c34"), BOOT = mat("#4a3224"), LEATHER = mat("#7a5232"), BOW = mat("#6a4424", { contrast: 1.15 }), GOLD = mat("#d8b34a");
const SHIRT = mat("#d8cdb0"), EYE = flat("#2a1c2c"), LIP = flat("#b86a5a"), STRING = flat("#f2ead4", { line: "#6a5a48" });
const FLETCH = mat("#e8dcc0"), FLETCH_R = mat("#b03440");

const SC = 7 / 6;
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
    toneLine(ax, ay, bx, by, d, pid) { px.toneLine(ax * SC, ay * SC, bx * SC, by * SC, d, pid); return this; },
  };
};
const LEG = {
  R: { m: HAIR, fix: 2 }, r: { m: HAIR, fix: 1 }, Q: { m: HAIR, fix: 3 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, m: { m: LIP },
};
const mir = (half) => half.map((r) => r + [...r.slice(0, -1)].reverse().join(""));
// FRONT: hair swept across the brow and falling past the cheeks, the face between (the cap's brim is drawn over rows 3-4)
const FRONT_H = mir(["....QQQR", "..QQQRRR", ".QQRRRRR", ".QRRRRRR", ".RRRRRRR", ".RRSSSSS", ".RSSSESS", ".RSSSESN", ".rSSSSSN", "..sSSSSS", "....SSmm", "......SS"]);
// BACK: the hair from behind (the cap is drawn over the crown), a few strands, the ponytail hangs over it
const BACK_H = mir(["....QQQR", "..QQQRRR", ".QRRRRRR", ".RRRRRRr", ".RRRRRrR", ".RRRRRRR", ".RRRRrRR", ".RRRRRRr", "..RrRRRR", "...RRRrR", ".....RRR", "......RR"]);

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v));

const make = (s) => (px0, F, o = {}) => {
  const px = big(px0), rs = -s, ls = s, TAU = Math.PI * 2;
  const { sk, ph, lag1, lag2 } = F, { p, P, C, N } = sk;
  const sw = (t) => rs * 0.7 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.08), sx2 = sw(ph - 0.16);
  const hipY = P[1], chY = C[1], ank = SIDE_BONES.ankle;
  const vx = cl((sx - sx1) * 2, -2.5, 2.5), vx2 = cl((sx1 - sx2) * 2, -2.5, 2.5);
  const swN = p.aN[0] * 3, swF = (p.aF[0] - 0.62) * 3;
  const hx = Math.round(sx * 0.6), hyr = Math.round(N[1] - 0.8);
  const tp = cl(vx * 2 + vx2 * 1.4, -2, 3);

  // ---- the cloak: its edges behind her in front, the whole back from behind ----
  px.part();
  const t2 = vx * 2 + vx2 * 1.6;
  if (s > 0) px.poly([[sx - 5.2, chY - 1.8], [sx + 5.2, chY - 1.8], [sx + 6.2, hipY + 2], [sx + 6 + t2 * 0.4, -10], [sx + 2.6 + t2 * 0.5, -8.6], [sx - 1 + t2 * 0.5, -10], [sx - 3.6 + t2 * 0.5, -8.6], [sx - 6 + t2 * 0.4, -10], [sx - 6.2, hipY + 2]], CLOAK, 0.5, { round: 0.85 });
  else {
    const cid = px._pid;
    px.poly([[sx - 5, chY - 2.2], [sx + 5, chY - 2.2], [sx + 6, chY + 4], [sx + 6.8 + t2 * 0.3, hipY + 3], [sx + 7 + t2 * 0.7, -9.6], [sx + 3.6 + t2 * 0.6, -7.8], [sx + t2 * 0.5, -10], [sx - 3.4 + t2 * 0.6, -7.8], [sx - 7 + t2 * 0.7, -9.6], [sx - 6.8 + t2 * 0.3, hipY + 3], [sx - 6, chY + 4]], CLOAK, 5.0, { round: 0.9, cast: 1 });
    px.toneLine(sx - 2, chY + 3, sx - 2.4 + t2 * 0.6, -8.6, -1, cid);
    px.toneLine(sx + 2.8, chY + 3, sx + 3.2 + t2 * 0.6, -8.4, -1, cid);
  }

  // ---- the quiver over her right shoulder: fletchings beside her neck; from behind it lies across her back ----
  const q0 = [sx + rs * 1.2, hipY - 1], q1 = [sx + rs * 4.4, chY - 3.2], qz = s > 0 ? 0.6 : 5.6;
  px.part();
  px.capsule(q0[0], q0[1], 1.9, q1[0], q1[1], 1.9, LEATHER, qz);
  px.line(q1[0] - 1.6, q1[1] + 0.8, q1[0] + 1.6, q1[1] - 0.4, GOLD, qz + 0.02);
  px.part();
  for (const dx of [-0.9, 1.1]) px.capsule(q1[0] + dx, q1[1] - 1.2, 0.8, q1[0] + dx + rs * 0.4, q1[1] - 4.2, 0.7, dx > 0 ? FLETCH_R : FLETCH, qz - 0.02 + (s > 0 ? 3.6 : 0));
  if (s < 0) { px.part(); px.toneLine(sx + rs * 3.8, chY - 1, sx + ls * 3.6, hipY - 3.4, -1, px._pid); }

  // ---- the bow in her left hand, carried upright at her side ----
  const bh = [sx + ls * 8.2, chY + 8 + swF], bt = 0.1 * ls;
  const R = (x, y) => [bh[0] + x * Math.cos(bt) - y * Math.sin(bt), bh[1] + x * Math.sin(bt) + y * Math.cos(bt)];
  const top = R(-ls * 0.6, -12.5), bot = R(-ls * 0.6, 12.5), tm = R(ls * 0.5, -6.5), bm = R(ls * 0.5, 6.5), bz = s > 0 ? 6.6 : 3.4;
  px.part();
  px.line(top[0], top[1], bot[0], bot[1], STRING, bz - 0.4, { unlit: true });
  px.capsule(bh[0], bh[1] - 1.8, 1.0, tm[0], tm[1], 0.95, BOW, bz); px.capsule(tm[0], tm[1], 0.95, top[0], top[1], 0.6, BOW, bz);
  px.capsule(bh[0], bh[1] + 1.8, 1.0, bm[0], bm[1], 0.95, BOW, bz); px.capsule(bm[0], bm[1], 0.95, bot[0], bot[1], 0.6, BOW, bz);
  px.capsule(bh[0], bh[1] - 1.8, 1.2, bh[0], bh[1] + 1.8, 1.2, LEATHER, bz + 0.05);
  // her left arm to it
  px.body(1);
  px.limb([[sx + ls * 5.6, chY + 0.4], [sx + ls * 7, chY + 4.2], bh], [1.9, 1.8, 1.6], TUNIC, bz + 0.1, { bias: -1 });
  px.capsule((sx + ls * 7 + bh[0]) / 2, chY + 6, 1.7, bh[0], bh[1] - 0.4, 1.6, SHIRT, bz + 0.12, { wrap: true });
  px.body(0);
  px.part(); px.ellipse(bh[0], bh[1], 1.6, 1.7, SKIN, bz + 0.3);

  // ---- legs: brown breeches, tall boots ----
  for (const [f, side] of [[p.fF, ls], [p.fN, rs]]) {
    const lift = f[1], z = side === rs ? 3 : 2, b = side === rs ? 0 : -1;
    const fx = sx * 0.5 + side * 2.9, fy = -ank - lift + s * f[0] * FWD;
    const hp = [sx * 0.5 + side * 1.9, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.6, (hp[1] + fy) / 2 - (s > 0 ? lift * 0.4 : 0)];
    px.part(); px.body(1);
    px.limb([hp, kn, [fx, fy]], [2.2, 1.85, 1.65], LEG_C, z + lift * 0.05, { bias: b, weld: 2, weldRoot: 4 });
    px.capsule(kn[0] * 0.25 + fx * 0.75, kn[1] * 0.25 + fy * 0.75, 1.6, fx, fy, 1.5, BOOT, z + 0.01 + lift * 0.05, { bias: b, wrap: true });
    px.body(0);
    if (s > 0) px.ellipse(fx, fy + 1.1, 2.3, 1.5, BOOT, z + 0.4 + lift * 0.05, { bias: b });
    else {
      px.ellipse(fx, fy + 0.8, 1.9, 1.2, BOOT, z + 0.4 + lift * 0.05, { bias: b });
    }
  }

  // the bust's edge shows a little past her sides in BACK, under the arms
  if (s < 0) { px.part(); for (const sd of [-1, 1]) px.ellipse(sx + sd * 6.2, chY + 3.4, 1.7, 2.6, TUNIC, 3.9, { round: 0.9 }); }
  // ---- the tunic: belted, skirted to mid-thigh ----
  px.part(); const tun = px.body(1);
  const hy = hipY + 2.8, hemW = 5.2;
  px.poly([[sx - 4.6, chY - 1.8], [sx + 4.8, chY - 1.8], [sx + 5.9, chY + 3], [sx + 3.9, hipY - 3], [sx + hemW, hy], [sx + hemW - 2.6, hy + 0.9], [sx + vx, hy], [sx - hemW + 2.6, hy + 0.9], [sx - hemW, hy], [sx - 4.2, hipY - 3], [sx - 5.9, chY + 3]], TUNIC, 4, { round: 0.92 });
  px.toneLine(sx + 0.4, hipY - 0.5, sx + 0.4 + vx, hy - 0.5, -1, tun);
  px.poly([[sx - 4.3, hipY - 4.4], [sx + 4.3, hipY - 4.4], [sx + 4.3, hipY - 2.6], [sx - 4.3, hipY - 2.6]], LEATHER, 4.05, { round: 0.92 });
  if (s > 0) px.rect(sx - 1, hipY - 4.5, 2, 2, GOLD, 4.06, { fix: 3 });
  // the mantle: a short green cape over both shoulders, to a point on the chest with a gold pin (from behind: a scalloped edge)
  px.part();
  if (s > 0) {
    px.poly([[sx - 5.4, chY - 2.6], [sx + 5.2, chY - 2.6], [sx + 6.2, chY + 1.4], [sx + 3.4, chY + 3.2], [sx + 0.6, chY + 4.8], [sx - 2.6, chY + 3], [sx - 6.4, chY + 1.8]], RANGER, 4.4, { round: 0.9 });
    
  } else {
    px.poly([[sx - 5.6, chY - 2.6], [sx + 5.6, chY - 2.6], [sx + 6.4, chY + 1.6], [sx + 3.6, chY + 3.2], [sx + 0.4, chY + 2.2], [sx - 3, chY + 3.4], [sx - 6.4, chY + 1.6]], RANGER, 5.8, { round: 0.9 });
  }
  px.body(0);

  // ---- the free right arm: a rolled sleeve, a pale cuff, a leather bracer; it swings a little ----
  const sh = [sx + rs * 5.6, chY + 0.5], el = [sx + rs * 6.8, chY + 4 + swN * 0.3], hd = [sx + rs * 7, chY + 8 + swN * 0.8];
  px.part(); px.body(1);
  px.limb([sh, el, hd], [2.1, 1.9, 1.6], TUNIC, 7, { weld: 2, weldRoot: 4 });
  px.capsule(el[0], el[1], 1.8, hd[0], hd[1], 1.55, SHIRT, 7.01, { wrap: true });
  px.capsule(el[0] * 0.5 + hd[0] * 0.5, el[1] * 0.5 + hd[1] * 0.5, 1.7, el[0] * 0.15 + hd[0] * 0.85, el[1] * 0.15 + hd[1] * 0.85, 1.55, LEATHER, 7.02, { wrap: true });
  px.body(0);
  px.part(); px.ellipse(hd[0], hd[1] + 0.4, 1.6, 1.6, SKIN, 7.3);

  // the neck (a little longer than the side's: the head sits clear of the mantle) and, in front, a soft fuller chest that rides the bounce
  px.part(); px.capsule(hx, chY - 3.4, 1.7, hx, hyr + 1.2, 1.6, SKIN, 6.0, { bias: -1 });
  if (s > 0) {
    const cb = cl((lag1.C[1] - C[1]) * 0.9, -1, 1);
    px.part();
    px.ellipse(sx - 3.1, chY + 3.6 + cb, 4.0, 3.5, TUNIC, 4.7, { round: 0.95, vb: 0.45 });
    px.ellipse(sx + 3.1, chY + 3.6 + cb, 4.0, 3.5, TUNIC, 4.7, { round: 0.95, vb: 0.45 });
    px.toneLine(sx - 6.4, chY + 7.2 + cb, sx + 6.4, chY + 7.2 + cb, -1, px._pid);        // the soft shadow beneath
    px.part();
    px.poly([[sx - 3.2, chY - 2.8], [sx + 3.2, chY - 2.8], [sx + 1.4, chY + 2.4], [sx, chY + 4 + cb * 0.5], [sx - 1.4, chY + 2.4]], SKIN, 4.9, { round: 0.6 });   // the open collar: a deep V, the tunic's edge covering her either side
    px.line(sx, chY + 1.2, sx, chY + 4.2 + cb * 0.5, EYE, 5.0, { fix: 0 });
    px.dot(sx, chY + 5.1 + cb * 0.5, GOLD, 5.1, { fix: 3 });
  }

  // ---- the head ----
  px.part();
  if (s > 0) {
    px0.stamp(FRONT_H, Math.round(hx * SC), Math.round(hyr * SC), LEG, 6.2, { ax: 7, ay: 11, cast: 0 });
    // the hunting cap: the crown, a brim to a point over the brow, the feather up at her right side
    px.part();
    px.poly([[hx - 4.6, hyr - 7.6], [hx + 4.6, hyr - 7.6], [hx + 3, hyr - 11.8], [hx - 3, hyr - 11.8]], RANGER, 6.6, { round: 0.9 });
    px.part();
    px.poly([[hx - 6.2, hyr - 8.4], [hx + 6.2, hyr - 8.4], [hx + 6.2, hyr - 6.6], [hx + 3, hyr - 5.2], [hx, hyr - 4.8], [hx - 3, hyr - 5.2], [hx - 6.2, hyr - 6.6]], RANGER, 6.8, { round: 0.6, bias: -1, cast: 2 });
    px.part();
    px.capsule(hx + rs * 2.6, hyr - 11, 0.9, hx + rs * 4.6 - tp * 0.2, hyr - 14.4, 0.9, FLETCH, 6.9);
    px.capsule(hx + rs * 4.6 - tp * 0.2, hyr - 14.4, 0.9, hx + rs * 5.6 - tp * 0.5, hyr - 17.2, 0.6, FLETCH_R, 6.9);
  } else {
    px0.stamp(BACK_H, Math.round(hx * SC), Math.round(hyr * SC), LEG, 6.2, { ax: 7, ay: 11, cast: 0 });
    // the ponytail down her back, tied with gold, swinging a beat behind
    px.part();
    px.capsule(hx, hyr - 6, 1.9, hx + tp * 0.4, hyr - 1, 1.7, HAIR, 6.5);
    px.capsule(hx + tp * 0.4, hyr - 1, 1.7, hx + tp * 0.9, hyr + 5.4, 1.4, HAIR, 6.5);
    px.capsule(hx + tp * 0.9, hyr + 5.4, 1.4, hx + tp * 1.4, hyr + 9.6, 0.6, HAIR, 6.5);
    px.dot(hx, hyr - 4.6, GOLD, 6.6, { fix: 3 });
    // the cap's crown from behind, the brim's edge round it, the feather raked up and to the side
    px.part();
    px.poly([[hx - 4.8, hyr - 7.4], [hx + 4.8, hyr - 7.4], [hx + 3, hyr - 11.8], [hx - 3, hyr - 11.8]], RANGER, 6.6, { round: 0.9 });
    px.toneLine(hx, hyr - 7.4, hx, hyr - 11.6, -1, px._pid);
    px.part();
    px.poly([[hx - 6, hyr - 7.2], [hx + 6, hyr - 7.2], [hx + 5.4, hyr - 6.2], [hx - 5.4, hyr - 6.2]], RANGER, 6.8, { round: 0.6, bias: -1, cast: 2 });
    px.part();
    px.capsule(hx + rs * 2.2, hyr - 11, 0.9, hx + rs * 4.4 - tp * 0.2, hyr - 14.4, 0.9, FLETCH, 6.9);
    px.capsule(hx + rs * 4.4 - tp * 0.2, hyr - 14.4, 0.9, hx + rs * 5.4 - tp * 0.5, hyr - 17, 0.6, FLETCH_R, 6.9);
  }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "archer-front", BOX: { w: 56, h: 86, ox: 28, oy: 73 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "archer-back", BOX: { w: 56, h: 86, ox: 28, oy: 73 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
