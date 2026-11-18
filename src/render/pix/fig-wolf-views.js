// ============ CONCEPT FIGURES: the Dire Wolf seen from the FRONT and from BEHIND ============
// The wolf of fig-wolf.js (grey coat, pale chest and muzzle, dark ruff, bushy dark-tipped tail, pricked
// ears laid back at a run, yellow eyes) drawn running toward the camera (FRONT, s = +1) and away from
// it (BACK, s = -1), unflipped, one sun upper left. It stands on beast.js's solved gait: each foot's
// lift and stride are read off the side run's own pose (`solveBeast(F.sk.p)`), so a view switched
// mid-stride keeps its feet in step. Forward is DOWN the screen in FRONT and UP in BACK, foreshortened
// (FWD of a px of stride). The beast's right side (the side view's near side) is screen LEFT in FRONT,
// screen RIGHT from BEHIND.
// FRONT: a broad face (brow, yellow eyes, pale muzzle and nose, chin) in a dark ruff, ears up and
// back, the pale bib on a deep chest, the forelegs stepping under it, the haunches' feet behind.
// BACK: the dark-tipped tail over the rump, the haunches and hocks, the ruff and hackles down the
// withers with the back of the skull and ears above them, the forefeet peeking ahead.
// `wolfView` is exported with a kit so the riders' wolves (grey, and the Rime's white) share it.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-wolf.js";
import { QUAD, solveBeast, tailPts } from "./beast.js";

const DK = mat("#3a3c4a"), BLK = mat("#1c1c26");
export const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const FWD = 0.32, TAU = Math.PI * 2;

// the front face (13 wide, centre column 6): skull, dark brow, yellow eyes, the pale muzzle with its lit bridge, the nose, the mouth, a tufted chin
export const HEAD_FRONT = [
  "..FFFFFFFFF..",
  ".FFFFFFFFFFF.",
  ".FFFFFFFFFFF.",
  ".FBBBFFFBBBF.",
  ".FFeEFLFEeFF.",
  ".FFFPPLPPFFF.",
  "fFFPPPLPPPFFf",
  ".fPPPNNNPPPf.",
  ".fPpPMMMPpPf.",
  "..fPPPPPPPf..",
  "...ppPPPpp...",
];
const swapRows = (rows, map) => rows.map((r, i) => map[i] ?? r);
export const HEAD_FRONT_BLINK = swapRows(HEAD_FRONT, { 4: ".FFFFFLFFFFF." });

export const mkKit = (c, Q) => ({
  Q, ...c,
  leg: {
    F: { m: c.FUR }, f: { m: c.FUR, bias: -1 }, P: { m: c.PALE }, p: { m: c.PALE, bias: -1 }, L: { m: c.PALE, fix: 3 }, B: { m: c.MANE, fix: 0 },
    E: { m: c.EYE }, e: { m: c.GLINT }, N: { m: c.NOSE }, M: { m: c.MOUTH },
  },
  earleg: { R: { m: c.FUR }, d: { m: c.MANE, fix: 1 } },
});
export const WOLF_Q = { ...QUAD, spine: 19, height: 23.5, foreU: 9.5, foreL: 8.5, hindU: 11, hindL: 9.5, hindX: -4.5, tail: [6, 6, 5] };
export const WOLF = mkKit({
  FUR: mat("#8f929c"), PALE: mat("#aab0ba"), MANE: mat("#585b6b"), EYE: flat("#e0b840"), GLINT: flat("#fff0a0"), NOSE: flat("#2a2430"), MOUTH: flat("#3a1820"),
}, WOLF_Q);

// One leg of the wolf in a view. side: -1 / +1 on screen; far: the leg of the end that is farther from us (it stands a little higher up the screen).
const legV = (px, l, s, side, K, sx, o) => {
  const { FUR } = K, fore = l.fore, far = fore ? s < 0 : s > 0, dyD = far ? -2.2 : 0;
  const sp = o.crisp ? (fore ? 1.0 : 1.4) : 0, hx = side * ((fore ? 4.4 : 5.6) + sp) + sx, hy = l.j[1] + dyD + (fore ? 0 : 0.5);
  const fx = side * ((fore ? 4.9 : 5.6) + sp) + sx, fyc = l.a[1] + K.Q.paw - 0.9 + dyD + s * (l.a[0] - l.j[0]) * FWD;
  const kx = side * ((fore ? 5.3 : 7.2) + sp) + sx, ky = (hy + fyc) / 2 + (fore ? 1 : 0.5);
  const near = !far, oo = { cast: 1, weld: near ? 3 : 0, weldRoot: near ? 5 : 0, bias: far ? -1 : 0 };
  px.limb([[hx, hy], [kx, ky], [fx, fyc]], fore ? [2.8, 2, 1.4] : [3.6, 1.9, 1.4], FUR, o.z + (far ? 0 : 0.2), oo);
  if (!fore) px.ellipse(hx + side * 0.9, hy + 1.2, 3.4, 4.4, FUR, o.z + 0.21, { ...oo, weld: 3, weldRoot: 0 });
  // the pad: broad toward the camera, a little heel from behind
  const wide = s > 0 ? 2.2 : 1.7;
  px.ellipse(fx + side * 0.2, fyc + 0.9, wide, 1.25, FUR, o.z + 0.3, { bias: far ? -1 : 0 });
  return [kx, ky];
};

// the wolf from view s. K: the kit; o: { zHead (a rider's wolf lifts its head in front of him), extra(px, ctx) for harness }
export const wolfView = (px, F, s, K, o = {}) => {
  const { FUR, PALE, MANE } = K, Q = K.Q, b = solveBeast(F.sk.p, Q), b1 = solveBeast(F.lag1.p, Q), b2 = solveBeast(F.lag2.p, Q), p = b.p, ph = F.ph;
  const rs = -s, ls = s;
  const sx = rs * 0.5 * Math.sin(ph * TAU * 1.0);
  const zH = o.zHead ?? 6;
  const fore = s > 0 ? b.W[1] : b.W[1] - 1.8, hind = s > 0 ? b.C[1] - 1.5 : b.C[1];
  const chestY = b.W[1] + 5.2, rumpY = b.C[1] + 4;
  const vy = cl(b.K[1] - b1.K[1], -2, 2), vy2 = cl(b1.K[1] - b2.K[1], -2, 2);
  const hy = Math.round(b.K[1] + (s > 0 ? 1 : -3)), hx = Math.round(sx * 0.6);

  const BID = px.body(1);
  void BID;
  const legs = [[b.FH, ls], [b.NH, rs], [b.FF, ls], [b.NF, rs]];
  // the far end first: hind legs from the front, fore legs from behind
  for (const [l, side] of legs) if (l.fore !== (s > 0)) legV(px, l, s, side, K, sx * 0.6, { z: 1, crisp: o.crisp });

  if (s > 0) {
    // the hind end behind the chest, the barrel's width showing as the haunch each side
    px.part();
    px.ellipse(sx * 0.3, rumpY - 2.5, 6.4, 6.4, FUR, 3);
    // the chest: deep and broad, a pale bib down it
    px.part();
    px.ellipse(sx, chestY, 6.4, 7.6, FUR, 4);
    px.ellipse(sx, chestY + 1.8, o.crisp ? 3.8 : 3.4, o.crisp ? 6.2 : 5.6, PALE, 4.02);
    // forelegs
    for (const [l, side] of legs) if (l.fore) legV(px, l, s, side, K, sx, { z: 7, crisp: o.crisp });
    // the ruff: a dark collar round the face, its hackles spread; rime on the tips for the Rime's
    px.part();
    px.ellipse(hx, hy + 1.5, 9.4, 6.8, o.crisp ? DK : MANE, 4.6, { cast: 0, floor: 1, bias: -1 });
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.12 + i * 0.152), cx = hx + Math.cos(a) * 9 * (i < 3 ? -1 : 1) * 0 + (i < 3 ? -1 : 1) * Math.abs(Math.cos(a)) * 9, cyy = hy + 1.5 - Math.sin(a) * 6.4;
      px.poly([[cx - 1.6, cyy + 1.6], [cx + 1.6, cyy + 1.6], [cx + (i < 3 ? -2.4 : 2.4), cyy - 1.4 - (i % 2)]], o.crisp ? DK : MANE, 4.62, { fix: 1, cast: 0 });
      if (K.FROST && i % 2 === 0) px.dot(cx + (i < 3 ? -1.2 : 1.2), cyy - 0.4, K.FROST, 4.7, { noLine: true });
    }
    if (o.extra) o.extra(px, { s, b, sx, chestY, rumpY, hx, hy });
    // ears: pricked, laid back and out at a run
    const lay = (p.ear ?? 0) > 0.5 ? 1 : 0;
    px.body(0);
    for (const side of [-1, 1]) {
      px.part();
      const ex = hx + side * 4.6, ey = hy - 4.6, out = 2.2 + lay * 1.8, top = 7.4 - lay * 1.8 + (side === rs ? -vy * 0.3 : -vy2 * 0.3);
      px.poly([[ex - 2.8, ey + 1.5], [ex + 2.8, ey + 1.5], [ex + side * out, ey - top]], FUR, zH - 0.2, { n: [side * 0.2, -0.3, 0.9], cast: 1 });
      px.poly([[ex - 1.2, ey + 1.2], [ex + 1.2, ey + 1.2], [ex + side * out * 0.8, ey - top * 0.62]], MANE, zH - 0.15, { noLine: true });
    }
    px.part();
    px.stamp(p.blink ? HEAD_FRONT_BLINK : HEAD_FRONT, hx, hy, K.leg, zH, { ax: 6, ay: 5, ball: [6.5, 5, 7, 6.5], cast: 1 });
    if (o.afterHead) o.afterHead(px, { s, b, hx, hy, zH });
  } else {
    // from behind: the head first (its back and ears above the shoulders), then the ruff and withers, the barrel, the haunches, the tail
    px.body(0);
    const lay = (p.ear ?? 0) > 0.5 ? 1 : 0, hy2 = hy - 1;
    for (const side of [-1, 1]) {
      px.part();
      const ex = hx + side * 4.2, ey = hy2 - 3.4, out = 1.6 + lay * 1.8, top = 7 - lay * 1.6;
      px.poly([[ex - 2.8, ey + 1.5], [ex + 2.8, ey + 1.5], [ex + side * out, ey - top]], FUR, 2.9, { n: [side * 0.2, -0.3, 0.9], cast: 1 });
      px.poly([[ex - 1.1, ey + 1.1], [ex + 1.1, ey + 1.1], [ex + side * out * 0.8, ey - top * 0.6]], MANE, 2.95, { noLine: true });
    }
    px.part(); const hid = px._pid;
    px.ellipse(hx, hy2, 5.8, 5, FUR, 3, { cast: 1 });
    px.toneLine(hx - 1.4, hy2 - 3.6, hx - 1.4, hy2 + 3, -1, hid);
    px.body(1);
    // the shoulders: the dark ruff with its hackles down the withers
    px.part();
    px.ellipse(sx, b.W[1] + 3.4, 8, 6, FUR, 3.6);
    px.ellipse(sx, b.W[1] + 2.6, 7.6, 4.6, o.crisp ? DK : MANE, 4.6, { cast: 0, floor: 1, bias: -1 });
    for (let i = 0; i < 5; i++) {
      const x = hx + (i - 2) * 3.1 + (i % 2) * 0.4, y = b.W[1] + 0.6 + (i === 2 ? 0.8 : 0) + (i % 2);
      px.poly([[x - 1.5, y + 1.6], [x + 1.5, y + 1.6], [x + (i - 2) * 0.5, y - 2.4 - (i % 2) * 1.1]], o.crisp ? DK : MANE, 4.62, { fix: 1, cast: 0 });
      if (K.FROST && i % 2 === 0) px.dot(x, y - 1.6, K.FROST, 4.7, { noLine: true });
    }
    for (const [l, side] of legs) if (l.fore) { /* the forefeet show only as the far end: drawn above */ }
    // the barrel narrowing to the rump, a dark line down the spine
    px.part(); const bid = px._pid;
    px.ellipse(sx * 0.7, b.W[1] + 9.4, 5.6, 6.8, FUR, 3.9);
    if (o.crisp) { for (const side of [-1, 1]) px.ellipse(sx * 0.4 + side * 3.3, rumpY - 0.8, 3.7, 6.4, FUR, 4); px.toneLine(sx * 0.4, rumpY - 6, sx * 0.4, rumpY + 5, -2, bid); px.capsule(sx * 0.4, rumpY - 6, 0.6, sx * 0.4, rumpY + 5, 0.6, DK, 4.1, { floor: 1 }); }
    else px.ellipse(sx * 0.4, rumpY - 1.5, 6.2, 6.6, FUR, 4);
    px.toneLine(sx * 0.4, b.W[1] + 4, sx * 0.4, rumpY - 5, -1, bid);
    px.ellipse(sx * 0.4, rumpY + 3, 4.6, 3.2, PALE, 4.02);
    // the haunches' legs
    for (const [l, side] of legs) if (!l.fore) legV(px, l, s, side, K, sx * 0.5, { z: 7, crisp: o.crisp });
    // the tail: bushy, dark tip, hanging over the rump and swinging a beat behind
    const t = tailPts(b, b1, b2), wag = (o.crisp ? 3.2 : 1.6) * Math.sin(ph * TAU + 1);
    const tr = [sx * 0.4, rumpY - 4], tm = [sx * 0.4 + wag * 0.6, tr[1] + 5.8], te = [sx * 0.4 + wag, tr[1] + 11.6 + cl(-(t[3][1] - t[0][1]) * 0.05, -1, 1)];
    px.part();
    px.capsule(tr[0], tr[1], 2.4, tm[0], tm[1], 3.2, o.crisp ? DK : FUR, 6.5, { cast: 1 });
    px.capsule(tm[0], tm[1], 3.2, te[0], te[1], 2.6, o.crisp ? DK : MANE, 6.5, { cast: 1, bias: -1 });
    px.capsule(te[0], te[1] - 1, 2.8, te[0] + wag * 0.2, te[1] + 2.4, 1.1, o.crisp ? BLK : MANE, 6.55, { cast: 1 });
    if (o.extra) o.extra(px, { s, b, sx, chestY, rumpY, hx, hy });
  }
  px.body(0);
  return { b, sx };
};

const walk = { ...SIDE.walk };
export const BOX = { w: 48, h: 50, ox: 24, oy: 40 };
export const FRONT = { NAME: "wolf-front", BOX, BONES: SIDE_BONES, draw: (px, F) => { wolfView(px, F, 1, WOLF, { crisp: true }); return {}; }, CLIPS: { walk } };
export const BACK = { NAME: "wolf-back", BOX, BONES: SIDE_BONES, draw: (px, F) => { wolfView(px, F, -1, WOLF, { crisp: true }); return {}; }, CLIPS: { walk } };
