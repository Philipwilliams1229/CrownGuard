// ============ Sir Aldric seen from the FRONT and from BEHIND ============
// The approved side figure (fig-knight.js: steel plate, gold, red surcoat, cape and plume, kite shield on
// the far arm, a longsword in the near fist, an open helm) drawn walking toward the camera (FRONT) and away
// from it (BACK). One drawer serves both, `make(s)`: s = +1 front, -1 back. His RIGHT hand holds the sword
// (screen LEFT in front, screen RIGHT from behind: `rs`); the kite shield rides his LEFT arm (`ls`).
// Unflipped on the board; one sun, upper left. The walk keeps the side clip's n, ms and pose, and reads its
// feet and bob from the solved skeleton, so the views switch mid-stride. Forward is DOWN the screen in FRONT
// and UP in BACK, foreshortened (FWD). Every look (a trimmed moustache, a short beard, clean-shaven c) is a
// face grid below; the back of the head is the same for all of them.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-knight.js";

const STEEL = mat("#98a2b6", { contrast: 1.18 }), MAIL = mat("#6c7488", { contrast: 1.1 }), GOLD = mat("#d8b34a", { contrast: 1.15 });
const RED = mat("#b03440"), RED_D = mat("#7e2434"), SKIN = mat("#e8b990"), HAIR = mat("#6a4a30"), LEATHER = mat("#5a3c28");
const BLADE = mat("#d4dae4", { contrast: 1.35 }), EYE = flat("#2a1c2c");

// the same scale pass as the side file: shapes drawn in skeleton units, laid SC times larger
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
    stamp(rows, x, y, lg, z, o = {}) { px.stamp(rows, x * SC, y * SC, lg, z, o); return this; },
  };
};

const LEG = {
  M: { m: STEEL }, m: { m: STEEL, bias: -1 }, G: { m: GOLD }, c: { m: MAIL }, C: { m: MAIL, bias: -1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 },
  N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, E: { m: EYE }, B: { m: HAIR }, b: { m: HAIR, fix: 2 }, l: { m: SKIN, fix: 0 },
};
const CROWN = ["G.G.G", "GGGGG", "GGGGG"];

// heads are drawn as a LEFT HALF (the last column is the middle) and mirrored, so they are always 15 wide and balanced
const mir = (half) => half.map((r) => r + [...r.slice(0, -1)].reverse().join(""));
// FRONT: the domed helm, the gold brow band, the mail coif framing an open face: brows drawn down, two-pixel eyes, a nose
// down the middle (N), a firm mouth (l). a: trimmed moustache, b: short beard, c: clean-shaven.
const FTOP = ["....MMMM", "..MMMMMM", ".mMMMMMM", ".MMMMMMM", ".GGGGGGG"];
const FFACE = {
  a: [".cSSbbSS", ".cSSSESS", ".cSSSESN", ".cSSSSSN", ".ccSSBBB", "..ccSSll", "...cSSSs", ".....ccc"],
  b: [".cSSbbSS", ".cSSSESS", ".cSSSESN", ".cBSSSSN", ".cBBSBBB", "..cBBSSl", "..cBBBBB", "...cBBBB"],
  c: [".cSSbbSS", ".cSSSESS", ".cSSSESN", ".cSSSSSN", ".ccSSSSS", "..ccSSll", "...cSSSs", ".....ccc"],
};
const FRONT_H = {}, FRONT_B = {};
for (const k in FFACE) {
  const rows = mir([...FTOP, ...FFACE[k]]);
  FRONT_H[k] = rows; FRONT_B[k] = rows.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
}
// BACK: the helm from behind, the brow band all the way round, a seam, the mail coif at the nape (a checker of two tones)
const BACK_H = mir(["....MMMM", "..MMMMMM", ".mMMMMmM", ".MMMMMmM", ".GGGGGGG", ".MMMMMmM", ".mMMMMMM", ".ccccccc", ".cCcCcCc", "..ccCcCc", "...cCcCc", ".....ccc", "......cc"]);

const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v));


// ---- BACK, on its own depth stack (views-artist.md "The BACK stack": from behind a HIGHER z is BEHIND him) ----
// 1.0 sword and shield (carried: their parts in front of him lie behind his body); 2-3 legs; 3.6 fists; 4.0 torso;
// 4.3 BOTH arms, one limb each, hanging outboard; 5.0+ cape, pauldrons, plume (edge: true so the arms come out from
// under them); 6.0 the head.
const drawBack = (px0, F, o = {}) => {
  const px = big(px0), s = -1, rs = 1, ls = -1, TAU = Math.PI * 2;
  const { sk, ph } = F, { p, P, C, N } = sk, lag1 = F.lag1, lag2 = F.lag2;
  const sw = (q) => rs * 0.5 * Math.sin(q * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.08), sx2 = sw(ph - 0.16);
  const hipY = P[1], chY = C[1], ank = SIDE_BONES.ankle;
  const vx = cl((sx - sx1) * 2, -2.5, 2.5), vx2 = cl((sx1 - sx2) * 2, -2.5, 2.5);
  const swing = cl((p.aN[0] - 1.1) * 3.4, -1.2, 1.2), swingF = cl((p.aF[0] - 0.5) * 2.2, -1.2, 1.2);
  const t1 = vx * 1.4, t2 = vx * 2 + vx2 * 1.6;
  const hx = Math.round(sx * 0.7 * 0.8), hyr = Math.round(N[1] + 0.4), pl = cl(vx * 2 + vx2 * 1.5, -3, 3);

  // the shield on his left arm (screen left): behind arm, pauldron and trunk; only its outer rim, dark inside and strap show
  const shC = [ls * 9.6 + sx, chY + 7 + swingF * 0.4], S = (x, y) => [shC[0] + x, shC[1] + y];
  px.part(); const shid = px._pid;
  px.poly([S(-4.6, -6.4), S(4.6, -6.4), S(4.9, 0.6), S(0, 8.2), S(-4.9, 0.6)], GOLD, 1.0, { round: 0.6 });
  px.poly([S(-3.5, -5.3), S(3.5, -5.3), S(3.7, 0.3), S(0, 6.5), S(-3.7, 0.3)], LEATHER, 1.02, { round: 0.6 });
  px.toneLine(shC[0], shC[1] - 5, shC[0], shC[1] + 5.6, -1, shid);
  px.line(shC[0] - 3.4, shC[1] - 2.8, shC[0] + 3.4, shC[1] - 2.8, GOLD, 1.06, { fix: 3 });
  px.line(shC[0] - 3, shC[1] + 2.2, shC[0] + 3, shC[1] + 2.2, GOLD, 1.06, { fix: 3 });

  // the sword in his right fist (screen right): the sword stands upright in the fist
  const sh = [rs * 7.2 + sx, chY + 0.6], el = [rs * 9 + sx, chY + 4.2], hd = [rs * 9.6 + sx, chY + (sk.hdN[1] - C[1])];
  const ang = 0, d = [Math.sin(ang), -Math.cos(ang)], nrm = [-d[1], d[0]];
  const B = (q, w = 0) => [hd[0] + d[0] * q + nrm[0] * w, hd[1] + d[1] * q + nrm[1] * w];
  px.part(); px.tag("sword");   // upright at the fist's x, outside the head: the upper blade peeks out from behind the right pauldron, the rest is hidden
  px.capsule(...B(3.4), 1.05, ...B(17.5), 0.9, BLADE, 1.0);
  px.capsule(...B(17.5), 0.9, ...B(19.6), 0.3, BLADE, 1.0);
  px.part();
  px.capsule(...B(-3), 0.9, ...B(1), 0.9, LEATHER, 1.02);
  px.capsule(...B(2.9, -2.8), 0.85, ...B(2.9, 2.8), 0.85, GOLD, 1.25);
  px.ellipse(...B(-3.6), 1.2, 1.2, GOLD, 1.05);
  px.tag(null);

  // legs: greaves, knee cops, sabatons
  for (const [f, side] of [[p.fF, ls], [p.fN, rs]]) {
    const lift = f[1], z = side === rs ? 3 : 2;
    const fx = sx * 0.5 + side * 3.3, fy = -ank - lift + s * f[0] * FWD;
    const hp = [sx * 0.5 + side * 2.2, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.9, (hp[1] + fy) / 2];
    px.part();
    px.limb([hp, kn, [fx, fy]], [2.6, 2.1, 1.8], STEEL, z + lift * 0.05, { weld: 2, weldRoot: 5 });
    px.ellipse(kn[0], kn[1] - 0.2, 1.9, 1.5, STEEL, z + 0.12 + lift * 0.05, { vb: 0.25, weld: 2 });
    px.ellipse(fx, fy + 0.7, 2.0, 1.3, MAIL, z + 0.4 + lift * 0.05);
  }

  // the torso (4.0): breastplate and the surcoat skirt under the cape
  px.body(1);
  px.poly([[sx - 6, chY - 1.6], [sx + 6.2, chY - 1.6], [sx + 7.4, chY + 3.5], [sx + 5.4, hipY - 2.6], [sx - 5.4, hipY - 2.6], [sx - 7.2, chY + 3.5]], STEEL, 4.0, { round: 0.92, ny: -0.12, weld: 2 });
  const hy = hipY + 3.6;
  px.poly([[sx - 4.9, hipY - 3], [sx + 4.7, hipY - 3], [sx + 6.2, hy], [sx + 3.6, hy + 0.9], [sx + 0.4 + vx, hy], [sx - 3, hy + 0.9], [sx - 6.2, hy]], RED, 4.02, { round: 0.9, cast: 0 });
  px.poly([[sx - 4.9, hipY - 3], [sx + 4.7, hipY - 3], [sx + 4.8, hipY - 1], [sx - 5, hipY - 1]], LEATHER, 4.05, { round: 0.9 });
  px.body(0);

  // both arms at one z (4.3), one limb each, fists at 3.6 under the cuff
  const arm = (sh0, el0, hd0, fy) => {
    px.part(); px.body(1);
    px.limb([sh0, el0, hd0], [2.2, 2.1, 1.9], STEEL, 4.3, { cast: 0 });
    px.ellipse(el0[0], el0[1], 1.8, 1.8, STEEL, 4.31, { vb: 0.25, cast: 0 });
    px.body(0);
    px.part(); px.ellipse(hd0[0], hd0[1] + 0.9, 1.5, 1.6, MAIL, 3.6);
  };
  arm(sh, el, hd);
  arm([ls * 7.2 + sx, chY + 0.6], [ls * 9 + sx, chY + 4.2], [shC[0] - ls * 0.2, shC[1] + 0.4]);

  // the cape (5.0+, its rim edged so the arms come out from under it), the clasp chain, then the pauldrons
  px.part(); const cid = px._pid;
  px.poly([[sx - 6.8, chY - 2.2], [sx + 6.8, chY - 2.2], [sx + 7.6, chY + 4], [sx + 8.4 + t1, hipY + 4], [sx + 8.6 + t2, -8], [sx + 4.2 + t2 * 0.8, -6.4], [sx + 0.2 + t2 * 0.6, -8.6], [sx - 3.8 + t2 * 0.8, -6.2], [sx - 8.6 + t2, -8], [sx - 8.4 + t1, hipY + 4], [sx - 7.6, chY + 4]], RED_D, 5.2, { round: 0.9, cast: 1, edge: true });
  px.toneLine(sx - 2.2, chY + 2, sx - 2.6 + t2 * 0.6, -7, -1, cid);
  px.toneLine(sx + 2.6, chY + 3, sx + 3.2 + t2 * 0.7, -7.4, -1, cid);
  px.toneLine(sx - 5.6, hipY - 2, sx - 6 + t2 * 0.9, -7.6, -1, cid);
  px.part();
  px.line(sx - 3.2, chY - 1.5, sx + 3.2, chY - 1.5, GOLD, 5.3);
  px.dot(sx - 3.6, chY - 1.2, GOLD, 5.35, { fix: 3 }); px.dot(sx + 3.6, chY - 1.2, GOLD, 5.35, { fix: 3 });
  for (const sg of [-1, 1]) {
    px.part();
    px.ellipse(sg * 7.2 + sx + sg * 0.2, chY + 0.3, 3.7, 3.2, STEEL, 5.5, { weld: 2, cast: 1, edge: true });
    px.line(sg * 7.2 + sx - 3, chY + 2.1, sg * 7.2 + sx + 2.6, chY + 2.1, GOLD, 5.52);
  }

  // the head (6.0): helm from behind, the plume down its back
  px.part();
  px0.stamp(BACK_H, Math.round(hx * SC), Math.round(hyr * SC), LEG, 6.0, { ax: 7, ay: 11, ball: [7.5, 6.5, 8, 8], cast: 0, edge: true });
  px.part();
  const ty = hyr - 10.4;
  px.capsule(hx, ty, 1.6, hx + pl * 0.2, ty + 3.6, 2.1, RED, 6.1);
  px.capsule(hx + pl * 0.2, ty + 3.6, 2.1, hx + pl * 0.5, ty + 8.4, 1.9, RED, 6.1);
  px.capsule(hx + pl * 0.5, ty + 8.4, 1.9, hx + pl * 1.1, ty + 12.6, 1.0, RED, 6.1);
  px.line(hx - 0.4, ty + 1, hx + pl * 0.3 - 0.4, ty + 10, RED_D, 6.15, { fix: 1 });
  return {};
};

const make = (s) => (px0, F, o = {}) => {
  const px = big(px0), face = FFACE[o.variant] ? o.variant : "c";
  const rs = -s, ls = s;                                   // the screen side of his right (sword) and left (shield)
  const { sk, ph, lag1, lag2 } = F, { p, P, C, N } = sk, TAU = Math.PI * 2;
  const sw = (t) => rs * 0.5 * Math.sin(t * TAU);          // a small sway over the planted foot
  const sx = sw(ph), sx1 = sw(ph - 0.08), sx2 = sw(ph - 0.16);
  const hipY = P[1], chY = C[1], hdY = N[1], ank = SIDE_BONES.ankle;
  const vx = cl((sx - sx1) * 2, -2.5, 2.5), vx2 = cl((sx1 - sx2) * 2, -2.5, 2.5);
  const vy = cl(N[1] - lag1.N[1], -2, 2);
  const swing = (p.aN[0] - 1.1) * 3.4;                     // the sword arm's own swing (hand rising and falling a little)
  const swingF = (p.aF[0] - 0.5) * 2.2;

  // ---- the cape: behind him in front (its two edges and the red between the legs), the whole back from behind ----
  const t1 = vx * 1.4, t2 = vx * 2 + vx2 * 1.6;
  px.part();
  if (s > 0) px.poly([[sx - 7, chY - 1.8], [sx + 7, chY - 1.8], [sx + 8, hipY + 3], [sx + 8 + t2 * 0.4, -9.6], [sx + 4 + t2 * 0.6, -8.2], [sx - 0.5 + t2 * 0.5, -9.4], [sx - 4 + t2 * 0.6, -8.2], [sx - 8 + t2 * 0.4, -9.6], [sx - 8, hipY + 3]], RED_D, 0.5, { round: 0.85 });
  else {
    const cid = px._pid;
    px.poly([[sx - 6.8, chY - 2.2], [sx + 6.8, chY - 2.2], [sx + 7.6, chY + 4], [sx + 8.4 + t1, hipY + 4], [sx + 8.6 + t2, -8], [sx + 4.2 + t2 * 0.8, -6.4], [sx + 0.2 + t2 * 0.6, -8.6], [sx - 3.8 + t2 * 0.8, -6.2], [sx - 8.6 + t2, -8], [sx - 8.4 + t1, hipY + 4], [sx - 7.6, chY + 4]], RED_D, 5.2, { round: 0.9, cast: 1 });
    px.toneLine(sx - 2.2, chY + 2, sx - 2.6 + t2 * 0.6, -7, -1, cid);
    px.toneLine(sx + 2.6, chY + 3, sx + 3.2 + t2 * 0.7, -7.4, -1, cid);
    px.toneLine(sx - 5.6, hipY - 2, sx - 6 + t2 * 0.9, -7.6, -1, cid);
    px.part();
    px.line(sx - 3.2, chY - 1.5, sx + 3.2, chY - 1.5, GOLD, 5.3);                     // the gold of the collar and the cape's clasp chain
    px.dot(sx - 3.6, chY - 1.2, GOLD, 5.35, { fix: 3 }); px.dot(sx + 3.6, chY - 1.2, GOLD, 5.35, { fix: 3 });
  }

  // ---- the kite shield on his left arm ----
  const shC = [ls * 10.6 + sx, chY + (s > 0 ? 9.2 : 7) + swingF * 0.4], tl = 0;
  const S = (x, y) => [shC[0] + x, shC[1] + y];
  px.part();
  px.limb([[ls * 7.2 + sx, chY + 0.6], [ls * 9.2 + sx, chY + 4], [shC[0] - ls * 0.4, shC[1] + 0.4]], [2.1, 2, 1.8], STEEL, s > 0 ? 1 : 3.4, { bias: -1 });
  px.part(); const shid = px._pid;
  const zs = s > 0 ? 5.6 : 3.5;
  px.poly([S(-4.6, -6.4), S(4.6, -6.4), S(4.9, 0.6), S(0, 8.2), S(-4.9, 0.6)], GOLD, zs, { round: 0.6, cast: 2 });
  if (s > 0) {
    px.poly([S(-3.5, -5.3), S(3.5, -5.3), S(3.7, 0.3), S(0, 6.5), S(-3.7, 0.3)], RED, zs + 0.02, { round: 0.6 });
    px.stamp(CROWN, shC[0] - 2, shC[1] - 3.4, { G: { m: GOLD, fix: 3 } }, zs + 0.05, { cast: 0 });
  } else {
    // its back: the plain wood-and-leather inside, a strap across it and the hand's grip, the gold rim round it all
    px.poly([S(-3.5, -5.3), S(3.5, -5.3), S(3.7, 0.3), S(0, 6.5), S(-3.7, 0.3)], LEATHER, zs + 0.02, { round: 0.6 });
    px.toneLine(shC[0], shC[1] - 5, shC[0], shC[1] + 5.6, -1, shid);
    px.line(shC[0] - 3.4, shC[1] - 2.8, shC[0] + 3.4, shC[1] - 2.8, GOLD, zs + 0.06, { fix: 3 });
    px.line(shC[0] - 3, shC[1] + 2.2, shC[0] + 3, shC[1] + 2.2, GOLD, zs + 0.06, { fix: 3 });
  }

  // ---- legs: plate greaves, knee cops, sabatons; forward is down the screen (front) or up it (back) ----
  const feet = [[p.fF, ls], [p.fN, rs]];
  for (const [f, side] of feet) {
    const lift = f[1], z = side === rs ? 3 : 2, b = side === rs ? 0 : -1;
    const fx = sx * 0.5 + side * 3.3, fy = -ank - lift + s * f[0] * FWD;
    const hp = [sx * 0.5 + side * 2.2, hipY + 0.5];
    const kn = [(hp[0] + fx) / 2 + side * 0.9, (hp[1] + fy) / 2 + (s > 0 ? -lift * 0.4 : 0)];
    px.part();
    px.limb([hp, kn, [fx, fy]], [2.6, 2.1, 1.8], STEEL, z + lift * 0.05, { bias: b, weld: 2, weldRoot: 5 });
    if (s > 0) {
      px.ellipse(kn[0], kn[1] + 0.2, 2.1, 1.9, STEEL, z + 0.12 + lift * 0.05, { bias: b, vb: 0.25, weld: 2 });
      px.ellipse(fx, fy + 1.1, 2.5, 1.7, MAIL, z + 0.4 + lift * 0.05, { bias: b });
    } else {
      px.ellipse(kn[0], kn[1] - 0.2, 1.9, 1.5, STEEL, z + 0.12 + lift * 0.05, { bias: b, vb: 0.25, weld: 2 });
      px.ellipse(fx, fy + 0.7, 2.0, 1.3, MAIL, z + 0.4 + lift * 0.05, { bias: b });
    }
  }

  // ---- the body: breastplate, belt, the surcoat's skirt over the hips ----
  px.body(1);
  px.poly([[sx - 6, chY - 1.6], [sx + 6.2, chY - 1.6], [sx + 7.4, chY + 3.5], [sx + 5.4, hipY - 2.6], [sx - 5.4, hipY - 2.6], [sx - 7.2, chY + 3.5]], STEEL, 4, { round: 0.92, ny: -0.12, weld: 2 });
  const hy = hipY + 3.6;
  const skirtZ = s > 0 ? 4.2 : 4.1;
  px.poly([[sx - 4.9, hipY - 3], [sx + 4.7, hipY - 3], [sx + 6.2, hy], [sx + 3.6, hy + 0.9], [sx + 0.4 + vx, hy], [sx - 3, hy + 0.9], [sx - 6.2, hy]], RED, skirtZ, { round: 0.9, cast: 0 });
  px.toneLine(sx + 0.3, hipY - 0.5, sx + 0.4 + vx, hy - 0.6, -1, px._pid);
  px.poly([[sx - 4.9, hipY - 3], [sx + 4.7, hipY - 3], [sx + 4.8, hipY - 1], [sx - 5, hipY - 1]], LEATHER, 4.25, { round: 0.9 });
  if (s > 0) {
    px.rect(sx - 1, hipY - 3.2, 2, 2.4, GOLD, 4.3, { fix: 3 });                     // the buckle
    px.line(sx - 2.4, chY - 1.2, sx + 2.4, chY - 1.2, GOLD, 4.3);                   // the collar
    px.toneLine(sx, chY - 0.2, sx, hipY - 3.4, -1, px._pid);                         // the breastplate's keel
  }
  px.body(0);

  // ---- the head: helm, coif, the face; the plume rooted on the crown ----
  const hx = Math.round(sx * 0.7 * 0.8), hyr = Math.round(N[1] + 0.4);
  const pl = cl(vx * 2 + vx2 * 1.5, -3, 3);
  px.part();
  if (s > 0) {
    const rows = p.blink ? FRONT_B[face] : FRONT_H[face];
    px0.stamp(rows, Math.round((hx) * SC), Math.round(hyr * SC), LEG, 6.2, { ax: 7, ay: 11, ball: [7.5, 6.5, 8, 8], cast: 0, edge: true });
    // the plume rises over the crown and streams back (away from us), tilting a beat behind the sway
    px.part();
    const ty = hyr - 10;
    px.capsule(hx, ty + 0.6, 1.6, hx - 0.8 - pl * 0.2, ty - 2.8, 2.1, RED, 6.6);
    px.capsule(hx - 0.8 - pl * 0.2, ty - 2.8, 2.1, hx - 3.2 - pl * 0.7, ty - 4.6, 1.4, RED, 6.6);
    px.capsule(hx - 3.2 - pl * 0.7, ty - 4.6, 1.2, hx - 5 - pl, ty - 3.6, 0.7, RED, 6.6);
  } else {
    px0.stamp(BACK_H, Math.round(hx * SC), Math.round(hyr * SC), LEG, 6.2, { ax: 7, ay: 11, ball: [7.5, 6.5, 8, 8], cast: 0, edge: true });
    // the plume runs down the back of the helm from the crown, swaying behind
    px.part();
    const ty = hyr - 10.4;
    px.capsule(hx, ty, 1.6, hx + pl * 0.2, ty + 3.6, 2.1, RED, 6.6);
    px.capsule(hx + pl * 0.2, ty + 3.6, 2.1, hx + pl * 0.5, ty + 8.4, 1.9, RED, 6.6);
    px.capsule(hx + pl * 0.5, ty + 8.4, 1.9, hx + pl * 1.1, ty + 12.6, 1.0, RED, 6.6);
    px.line(hx - 0.4, ty + 1, hx + pl * 0.3 - 0.4, ty + 10, RED_D, 6.65, { fix: 1 });
  }

  // ---- the sword in his right fist and the arm over it: the blade stands up beside the head ----
  const sh = [rs * 7.2 + sx, chY + 0.6], el = [rs * 9.2 + sx, chY + 4 + swing * 0.3], hd = [rs * 9.8 + sx, chY + (sk.hdN[1] - C[1])];
  const ang = 0, d =   // ONE pose (carry.js): the side walk holds the sword ~10 degrees forward, which snaps to upright in all three views, at the side's hand height
     [Math.sin(ang), -Math.cos(ang)], nrm = [-d[1], d[0]];
  const B = (t, q = 0) => [hd[0] + d[0] * t + nrm[0] * q, hd[1] + d[1] * t + nrm[1] * q];
  const bz = s > 0 ? 8.4 : 3.0, kb = s > 0 ? 1 : 0.7;   // from behind the blade lies down and forward, mostly hidden: grip and a tip past the hip
  px.part(); px.tag("sword");
  px.capsule(...B(3.4), 1.05, ...B(3.4 + 12.1 * kb), 0.9, BLADE, bz, { edge: true });
  px.capsule(...B(3.4 + 12.1 * kb), 0.9, ...B(5.5 + 12.1 * kb), 0.3, BLADE, bz, { edge: true });
  px.part();
  px.capsule(...B(-3), 0.9, ...B(1), 0.9, LEATHER, bz + 0.02);
  px.capsule(...B(2.9, -2.8), 0.85, ...B(2.9, 2.8), 0.85, GOLD, bz + 0.25, { edge: true });
  px.ellipse(...B(-3.6), 1.2, 1.2, GOLD, bz + 0.05);
  px.tag(null);
  px.part(); px.tag("nearArm");
  px.limb([sh, el, hd], [2.2, 2.1, 1.9], STEEL, 7.4, { weld: 2, weldRoot: 4 });
  px.ellipse(el[0], el[1], 1.8, 1.8, STEEL, 7.42, { vb: 0.25, weld: 2 });
  px.ellipse(hd[0], hd[1], 1.8, 1.9, MAIL, 8.7, { weld: 1.5 });
  px.tag(null);
  px.ellipse(sh[0] - rs * 0.2, sh[1] - 0.2, 3.7, 3.2, STEEL, 8.1, { weld: 2 });
  px.line(sh[0] - 3, sh[1] + 2.4, sh[0] + 2.6, sh[1] + 2.4, GOLD, 8.12);
  // the far pauldron too, over the shield arm's shoulder
  px.ellipse(ls * 7.2 + sx + ls * 0.2, chY + 0.3, 3.7, 3.2, STEEL, 8.1, { weld: 2 });
  px.line(ls * 7.2 + sx - 3, chY + 2.1, ls * 7.2 + sx + 2.6, chY + 2.1, GOLD, 8.12);
  px.body(0);
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "knight-front", BOX: { w: 66, h: 86, ox: 33, oy: 73 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "knight-back", BOX: { w: 66, h: 86, ox: 33, oy: 73 }, BONES: SIDE_BONES, draw: drawBack, CLIPS: { walk } };
