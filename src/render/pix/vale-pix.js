// ============ THE VALE'S PIECES, SCULPTED (2026-11-17, look B "worked") ============
// The Greenwood's own props, built in the pix sculptor instead of paint.js shapes: standing stones, a
// fallen stone, the trilithon, the mill's body, the fisher's cottage's body, boats, the net rack, lobster
// pots, straw skeps and the hay wain. Same signatures, footprints and anchors as the painters they
// replace in scenery-vale.js (ctx, x, y, s, o): board units in, art pixels (RES a unit) inside the
// sculpts. One sun from the upper left, the one-pixel tinted line, material by material, weathering.
// The live bits (the mill's wheel, the cottage's smoke) stay in scenery-vale.js; the mill and cottage
// BODIES come from here, baked once by `pixBody` (no extra ring: they carry their own line).
import { RES } from "../../data/constants.js";
import { REALM } from "../../data/maps.js";
import { darken, lighten, mix, rgba, hash, PX, bakeSprite } from "../paint.js";
import { Pix, mat, flat, toCanvas } from "./pix.js";
import { decorSun, sunKey, longShade } from "../scenery-gwpix.js";
import { onDay } from "../../data/sun.js";
import { releaseDeep } from "../release.js";

const U = RES;                                   // art pixels per board unit
const ap = (v) => Math.round(v * PX) / PX;

// ---- materials (the moss follows the realm's turf) ----------------------------------------------
let MK = null, M_ = null;
const M = () => {
  if (M_ && MK === REALM.GRASS_DK) return M_;
  MK = REALM.GRASS_DK;
  M_ = {
    wood: mat("#6a4a2e"), woodL: mat("#8a6440"), woodD: mat("#46301e"), iron: mat("#4a4e5a"),
    mason: mat("#8e8672", { contrast: 0.95 }), rubble: mat("#968c7a", { contrast: 0.95 }), chim: mat("#b0a694", { contrast: 0.85 }),
    lime: mat("#ece4d0", { contrast: 0.7 }), limeD: mat("#c4b8a0", { contrast: 0.75 }),
    tile: mat("#b45a64", { contrast: 1.1 }), tileE: mat("#8a4252", { contrast: 1.1 }), tileD: mat("#6a2e3e"), thatch: mat("#c4a058", { contrast: 1.2 }), thatchE: mat("#a8843e", { contrast: 1.2 }), thatchD: mat("#6e4e26"),
    slate: mat("#6a7078", { contrast: 0.9 }), rope: mat("#c8ae7a"), ropeD: mat("#8e7a52"),
    wicker: mat("#9a7448"), wickerD: mat("#6e4e2c"), hay: mat("#d4b462", { contrast: 1.15 }), hayD: mat("#a8843e"), hayL: flat("#f4e2a0"),
    cork: mat("#d8a858", { contrast: 0.8 }), cork2: mat("#c88a4a", { contrast: 0.8 }),
    hole: flat("#2a2226"), well: mat("#5a4232"), wellD: mat("#3a2a24"), net: mat("#5a524a", { contrast: 0.6 }),
    glass: mat("#3a4a6a", { contrast: 0.8 }), glint: flat("#a8bcd4"), gold: flat("#d8b34a"), chalk: flat("#f0e8d4"),
    sack: mat("#d8ccaa", { contrast: 0.8 }), sackD: mat("#cfc2a0", { contrast: 0.8 }), barrel: mat("#8a6036"),
    red: mat("#b8483c"), sail: mat("#a8583c"), tar: mat("#3e3638", { contrast: 0.9 }), tarL: mat("#6a6266", { contrast: 0.9 }),
    ochre: mat("#8a4a34"), door: mat("#3e6a66"), doorB: mat("#6a5a3e"),
    moss: mat(mix("#5d8f3a", REALM.GRASS_DK, 0.35), { contrast: 0.8 }), mossL: mat(lighten(mix("#5d8f3a", REALM.GRASS_DK, 0.35), 0.18), { contrast: 0.6 }),
    lichen: ["#b8c494", "#d4bc52", "#c47e46", "#dcdcc0"].map((c) => mat(c, { contrast: 0.5 })),
    buoy: flat("#e0d8c8"), soil: mat("#6e5236", { contrast: 0.9 }), kale: mat("#4e7a46", { contrast: 1 }), onion: flat("#c8d494"), fish: mat("#b8c0c4", { contrast: 1.1 }), fishD: mat("#5a6a74"), lamp: flat("#e2b462"), lampD: flat("#b07a44"), thatchM: mat(mix("#9aa456", REALM.GRASS_DK, 0.3), { contrast: 0.7 }), peat: mat("#5a3e2c", { contrast: 1.1 }), quern: mat("#a29c90", { contrast: 1 }),
  };
  return M_;
};
const stoneMat = (col) => mat(col, { contrast: 0.95 });

// ---- kit -------------------------------------------------------------------------------------------
// build a sculpt and stamp it with its foot (0, 0) on (x, gy); `below` art px of the sheet lie under the foot
const sculpt = (ctx, x, gy, w, h, below, build) => {
  const b = new Pix(w, h, w >> 1, h - below);
  build(b);
  const img = b.resolve({ line: "tint", sun: decorSun() }), cv = toCanvas(img), q = 1 / RES;
  ctx.drawImage(cv, x - img.ox * q, gy - img.oy * q, img.w * q, img.h * q);
};
// a cast shadow in whole art pixels, thrown to the lower right, a few holes
const dapple = (ctx, cx, cy, rx, ry, a, seed) => {
  if (longShade()) return;
  const q = 1 / RES;
  ctx.fillStyle = rgba("#2a1c2c", a);
  for (let j = Math.floor((cy - ry) / q); j <= Math.ceil((cy + ry) / q); j++) for (let i = Math.floor((cx - rx) / q); i <= Math.ceil((cx + rx) / q); i++) {
    const u = (i * q + q / 2 - cx) / rx, v = (j * q + q / 2 - cy) / ry;
    if (u * u + v * v > 1 || (hash(i + seed, j) > 0.9 && Math.hypot(u, v) > 0.45)) continue;
    ctx.fillRect(i * q, j * q, q, q);
  }
};
// a body baked once for a live piece (its wheel / smoke are painted over it each frame)
const BODIES = new Map();
onDay(() => { releaseDeep(BODIES); BODIES.clear(); });
export const pixBody = (key, hw, top, bot, paint) => {
  const k = `${key}|${REALM.GRASS}|${REALM.GRASS_DK}${sunKey()}`;
  let sp = BODIES.get(k);
  if (!sp) {
    const cv = bakeSprite(hw * 2, top + bot, (c) => paint(c, hw, top), false);
    sp = { cv, hw, top, bot };
    BODIES.set(k, sp);
  }
  return sp;
};
export const stampPixBody = (ctx, sp, x, y) => ctx.drawImage(sp.cv, x - sp.hw, y - sp.top, sp.hw * 2, sp.top + sp.bot);

// courses of rubble: a slab of `mt`, joints every few px staggered, a few stones lit on top or shaded below
const courses = (b, x0, y0, w, h, ch, seed, o = {}) => {
  let y = y0, row = 0;
  while (y < y0 + h - 1) {
    const c = Math.max(3, Math.min(ch + (hash(seed, row) < 0.4 ? 1 : 0), y0 + h - y));
    if (y > y0) b.toneLine(x0, y, x0 + w - 1, y, -1);
    let vx = x0 + (row % 2 ? 3 : 7) + Math.floor(hash(seed + 1, row) * 3);
    let last = x0;
    while (vx < x0 + w - 2) {
      b.toneLine(vx, y, vx, y + c - 1, -1);
      const r = hash(seed + vx, row);
      if (r < 0.26) b.toneLine(last + 1, y + 1, vx - 1, y + 1, 1);
      else if (r > 0.86) b.toneLine(last + 1, y + c - 1, vx - 1, y + c - 1, -1);
      last = vx;
      vx += 6 + Math.floor(hash(seed + 5, vx + row) * 6);
    }
    y += c; row++;
  }
  if (o.litTop) b.toneLine(x0, y0 + 1, x0 + w - 1, y0 + 1, 1);
};
// a squared timber, lit on its left edge and shaded on its right
const beam = (b, x, y, w, h, z, mt, o = {}) => {
  b.part(); b.rect(x, y, w, h, mt, z, { n: [0, 0, 1], ...o });
  if (w >= 3 && h > 2) { b.toneLine(x, y, x, y + h - 1, 1); b.toneLine(x + w - 1, y, x + w - 1, y + h - 1, -1); }
  else if (h >= 3 && w >= 2) b.toneLine(x + w - 1, y, x + w - 1, y + h - 1, -1);
};
// a capsule timber
const spar = (b, ax, ay, bx, by, r, z, mt, o = {}) => { b.part(); b.capsule(ax, ay, r, bx, by, r, mt, z, { round: 0.8, limb: false, ...o }); };
// a small window: dark frame, glass in four panes, a glint, optional shutters
const windowPix = (b, x, y, w, h, z, shutter) => {
  const m = M();
  b.part(); b.rect(x - 1, y - 1, w + 2, h + 2, m.woodD, z, { n: [0, 0, 1] });
  b.part(); b.rect(x, y, w, h, m.glass, z + 0.1, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.toneLine(x, y + 1, x + Math.floor(w / 2) - 1, y + 1, 1);
  b.part(); b.rect(x + Math.floor(w / 2), y, 1, h, m.woodD, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.part(); b.rect(x, y + Math.floor(h / 2), w, 1, m.woodD, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.dot(x, y, m.glint, z + 0.3, { noLine: true, cast: 0 });
  if (shutter) {
    b.part(); b.rect(x - 3, y - 1, 2, h + 2, shutter, z + 0.1, { n: [0, 0, 1] });
    b.part(); b.rect(x + w + 1, y - 1, 2, h + 2, shutter, z + 0.1, { n: [0, 0, 1] });
    b.toneLine(x + w + 2, y - 1, x + w + 2, y + h, -1);
  }
};
const doorPix = (b, x, y, w, h, z, mt) => {
  const m = M();
  b.part(); b.rect(x - 1, y - 1, w + 2, h + 1, m.woodD, z, { n: [0, 0, 1] });
  b.part(); b.rect(x, y, w, h, mt, z + 0.1, { n: [0, 0, 1], noLine: true, cast: 0 });
  for (let k = 1; k < 3; k++) b.toneLine(x + Math.round((w * k) / 3), y, x + Math.round((w * k) / 3), y + h - 1, -1);
  b.toneLine(x, y, x, y + h - 1, 1);
  b.part(); b.rect(x, y + Math.round(h * 0.28), w, 1, m.iron, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.part(); b.rect(x, y + Math.round(h * 0.7), w, 1, m.iron, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.dot(x + w - 2, y + Math.round(h * 0.5), m.gold, z + 0.3, { noLine: true, cast: 0 });
};
const sackPix = (b, x, y, k, mt, z = 1) => {            // a meal sack standing on y
  const m = M();
  b.part(); b.ellipse(x, y - 2.5 * k, 2.4 * k, 2.8 * k, mt, z, { round: 0.95 });
  b.part(); b.ellipse(x, y - 5.4 * k, 1.1 * k, 0.9 * k, mt, z + 0.1, { round: 0.95, noLine: true, cast: 0 });
  b.dot(x - 1, y - 4.7 * k, m.woodD, z + 0.2, { noLine: true, cast: 0 }); b.dot(x, y - 4.7 * k, m.woodD, z + 0.2, { noLine: true, cast: 0 });
};
// the roof of a gable house seen from the gable end: two slopes running back (up the page) from the eaves
const gable = (b, hw, eaveY, apexY, D, mtL, mtR, o = {}) => {
  const over = (o.over ?? 3), lE = [-hw - over, eaveY + 2], ap_ = [0, apexY - 2], rE = [hw + over, eaveY + 2];
  b.part(); b.poly([lE, ap_, [0, apexY - 2 - D], [lE[0], lE[1] - D]], mtL, 1, { n: [-0.5, -0.4, 0.76] });
  b.part(); b.poly([ap_, rE, [rE[0], rE[1] - D], [0, apexY - 2 - D]], mtR, 1, { n: [0.62, -0.32, 0.72] });
  return { lE, apex: ap_, rE };
};

// ---- standing stones ---------------------------------------------------------------------------------
// A stone stood on end, leaning by `lean` (a fraction of its height): the lit west rim, the south face,
// the shaded east, a pale top plane, grain up it, pits, lichen crusts on the sunny upper half, moss at the foot.
const standingPx = (b, w, h, lean, bow, seed, mt, o = {}) => {
  const m = M(), W = w * U, Hh = h * U, j = (i) => hash(seed, i) - 0.5;
  const T = [0, 0.16, 0.38, 0.6, 0.78, 0.9, 0.97];
  const K = [1.04, 0.98, 0.93, 0.86, 0.76, 0.62, 0.4].map((kk, i) => kk * (o.flat ? 0.96 + i * 0.012 : 1) * (1 + j(i) * 0.1));
  const cx = (t) => lean * Hh * t + Math.sin(Math.PI * t) * W * 0.12 * bow;
  const L = T.map((t, i) => [cx(t) - W * K[i] * (1 + j(i + 10) * 0.12), -Hh * t]);
  const R = T.map((t, i) => [cx(t) + W * K[i] * (1 + j(i + 20) * 0.12), -Hh * t]);
  const top = [cx(1) - W * 0.16, -Hh], top2 = [cx(1) + W * 0.2, -Hh + 1];
  b.part(); b.poly([...L, top, top2, ...R.slice().reverse()], mt, 0, { round: 0.9 });
  // the pale top plane: the crown's upper tenth, tilted up to the sun
  b.part(); b.poly([L[5], L[6], top, top2, R[6], R[5]], mt, 0.2, { n: [-0.1, -0.78, 0.6], noLine: true, cast: 0 });
  // grain: pale strokes on the lit side, dark on the shade side
  for (let i = 0; i < 7; i++) {
    const f = hash(seed, 30 + i), t0 = 0.05 + hash(seed, 40 + i) * 0.15, t1 = t0 + 0.18 + hash(seed, 50 + i) * 0.4;
    const xa = cx(t0) + (f - 0.5) * W * 1.5 * K[0], xb = cx(t1) + (f - 0.5) * W * 1.5 * K[Math.min(6, Math.floor(t1 * 6))] * 0.9;
    b.toneLine(xa, -Hh * t0, xb, -Hh * t1, f < 0.34 ? 1 : -1);
  }
  // the planes of a dressed-by-weather stone: a lit west facet, a crease, the east facet a tone down; a few
  // frost fractures across the face (a dark crack with its lit lip under it)
  const wAt = (t) => { let i = 0; while (i < T.length - 2 && T[i + 1] < t) i++; const f = Math.min(1, Math.max(0, (t - T[i]) / (T[i + 1] - T[i]))); return W * (K[i] + (K[i + 1] - K[i]) * f); };
  const cr = 0.3 + hash(seed, 120) * 0.15, lf = -0.5 - hash(seed, 121) * 0.12;
  for (let y = 2; y < Hh * 0.93; y++) {
    const t = y / Hh, c0 = cx(t), wk = wAt(t);
    const xc = Math.round(c0 + wk * (cr + Math.sin(t * 7 + seed) * 0.05));
    for (let x = xc; x < c0 + wk - 1; x++) b.tone(x, -y, -1);
    b.tone(xc - 1, -y, -1);
    const xl = Math.round(c0 + wk * lf);
    if (hash(seed, y + 400) < 0.75) { b.tone(xl, -y, 1); if (hash(seed, y + 500) < 0.4) b.tone(xl + 1, -y, 1); }
  }
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + hash(seed, 130 + i) * 0.6, c0 = cx(t), wk = wAt(t), y = Math.round(-Hh * t);
    const a = Math.round(c0 - wk * (0.6 - hash(seed, 140 + i) * 0.4)), e = Math.round(a + wk * (0.5 + hash(seed, 150 + i) * 0.5));
    for (let x = a; x <= e; x++) { const yy = y + Math.round(Math.sin(x * 0.9 + i) * 0.6); b.tone(x, yy, -1); if (hash(x, i) < 0.6) b.tone(x, yy + 1, 1); }
  }
  // lichen in rosettes on the sunny upper half: a crusted middle, a paler ring of lobes
  for (let i = 0; i < 4 + (o.flat ? 0 : 1); i++) {
    const t = 0.3 + hash(seed, 80 + i) * 0.55, x = Math.round(cx(t) + (hash(seed, 90 + i) - 0.65) * wAt(t) * 1.3), y = Math.round(-Hh * t);
    const k = Math.floor(hash(seed, 100 + i) * 4), lm = m.lichen[k], lo = m.lichen[(k + 3) % 4];
    const big = hash(seed, 110 + i) < 0.5;
    b.dot(x, y, lo, 0.3, { wrap: true });
    for (const [dx, dy] of big ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, -1], [2, 1], [1, -2], [-1, 2]] : [[-1, 0], [1, 0], [0, -1], [0, 1]]) b.dot(x + dx, y + dy, lm, 0.3, { wrap: true });
  }
  // carvings pecked into the face: a spiral, or a cup with two rings (incised: dark upper wall, lit lower lip)
  if (o.carve) {
    const t = o.carveAt ?? 0.42, c0 = Math.round(cx(t) - wAt(t) * 0.12), y0 = Math.round(-Hh * t), cut = new Set();
    const mark = (x, y) => { x = Math.round(x); y = Math.round(y); cut.add(x + "," + y); };
    if (o.carve === "spiral") for (let a = 0; a < Math.PI * 5; a += 0.12) { const r = 0.6 + a * 0.32; mark(c0 + Math.cos(a) * r, y0 + Math.sin(a) * r * 0.95); }
    else { mark(c0, y0); mark(c0 + 1, y0); for (const r of [2.6, 4.4]) for (let a = 0; a < Math.PI * 2; a += 0.15) if (r < 4 || a < 5.3) mark(c0 + 0.5 + Math.cos(a) * r, y0 + Math.sin(a) * r * 0.9); }
    for (const k of cut) { const [x, y] = k.split(",").map(Number); b.tone(x, y, -1); b.tone(x, y, -1); if (!cut.has(`${x + 1},${y + 1}`)) b.tone(x + 1, y + 1, 1); }
  }
  // the foot: shaded where it meets the turf, moss clinging round it
  b.toneLine(L[0][0] + 1, -1, R[0][0] - 1, -1, -1);
  const mm = o.mossy ?? 1;
  for (let x = Math.floor(L[0][0]) + 1; x < R[0][0] - 1; x++) {
    const hh = 1 + Math.floor(hash(seed, x + 200) * 2.2 * mm);
    for (let y = 0; y < hh; y++) b.dot(x, -1 - y, y === hh - 1 && hash(seed, x + y) < 0.4 ? m.mossL : m.moss, 0.4, { wrap: true });
  }
};
// turf worn to bare earth round a stone's foot by feet and sheep: whole art pixels, a ragged rim, pebbles
const bareFoot = (ctx, cx, cy, rx, ry, seed) => {
  const q = 1 / RES;
  for (let j = Math.floor((cy - ry) / q); j <= Math.ceil((cy + ry) / q); j++) for (let i = Math.floor((cx - rx) / q); i <= Math.ceil((cx + rx) / q); i++) {
    const u = (i * q + q / 2 - cx) / rx, v = (j * q + q / 2 - cy) / ry, d = u * u + v * v, h = hash(i + seed, j);
    if (d > 1 || (d > 0.55 && h > 0.55)) continue;
    ctx.fillStyle = h < 0.08 ? "#b4a890" : d < 0.35 && h < 0.5 ? "#6a4e36" : h < 0.7 ? "#7e6044" : "#8e7a52";
    ctx.fillRect(i * q, j * q, q, q);
  }
};
const MENHIR = [
  { w: 5.8, h: 29, lean: 0.02, bow: 1 },
  { w: 6.4, h: 25, lean: 0.24, bow: -0.6 },
  { w: 8.6, h: 17, lean: -0.04, bow: 0.4 },
  { w: 4.6, h: 32, lean: -0.11, bow: 1.4 },
];
export const menhirPix = (ctx, x, y, s, o) => {
  const gy = y + 8, MN = MENHIR[o.v % 4], w = MN.w * s, h = MN.h * s;
  const col = mix("#aaa496", "#9a968c", hash(o.seed, 3) * 0.6);
  const sx = MN.lean * h * 0.55;                                   // its shadow falls long to the right, further for a lean east
  dapple(ctx, x + w * 0.9 + h * 0.18 + Math.max(0, sx), gy + 0.7, w * 1.1 + h * 0.2, Math.max(1.6, h * 0.1), 0.26, o.seed);
  if (Math.abs(MN.lean) > 0.1) {                                     // bared earth at a leaning stone's foot
    ctx.fillStyle = "#6a4c34"; ctx.fillRect(ap(x - Math.sign(MN.lean) * w * 1.1 - w * 0.5), ap(gy + 0.5), w, 0.5);
    ctx.fillStyle = "#8a6a48"; ctx.fillRect(ap(x - Math.sign(MN.lean) * w * 1.1 - w * 0.3), ap(gy + 1), w * 0.6, 0.5);
  }
  const mt = stoneMat(col);
  bareFoot(ctx, x + MN.lean * 2, gy, w * 1.25 + 1.5, 2.2 * s, o.seed);
  const carve = o.v === 0 ? "spiral" : o.v === 2 ? "cup" : null;
  sculpt(ctx, x, gy, Math.ceil((w * 2.6 + h * 0.5) * U) + 24, Math.ceil(h * U) + 28, 10, (b) => standingPx(b, w, h, MN.lean, MN.bow, o.seed, mt, { mossy: o.v === 2 ? 1.4 : 1, carve, carveAt: o.v === 2 ? 0.45 : 0.5 }));
};

// ---- lying stones ------------------------------------------------------------------------------------
// A slab: its long top plane lit, the south face a band beneath, the east end in shade (rot turns it about its foot centre)
const slabPx = (b, cx, cy, Lh, th, D, rot, mt, seed, o = {}) => {
  const m = M(), cs = Math.cos(rot), sn = Math.sin(rot), Dx = D * 0.15, tilt = (o.tilt ?? 0) * Lh;
  const P = (px, py) => [cx + px * cs - py * sn, cy + px * sn + py * cs];
  const fy = (u) => tilt * u;
  const FL = P(-Lh, fy(-1) - th), FR = P(Lh, fy(1) - th), BR = P(Lh + Dx, fy(1) - th - D), BL = P(-Lh + Dx, fy(-1) - th - D);
  const GL = P(-Lh, fy(-1)), GR = P(Lh, fy(1));
  b.part(); b.poly([FL, FR, BR, BL], mt, 0.3, { n: [-0.05, -0.8, 0.6] });                 // the top plane, lit
  b.part(); b.poly([GL, GR, FR, FL], mt, 0.2, { n: [0, 0.1, 1] });                         // the south face
  b.part(); b.poly([GR, FR, BR, P(Lh + Dx, fy(1) - D)], mt, 0.1, { n: [0.95, 0, 0.3] });    // the east end
  // cracks across the top, a few flecks of lichen, grain along the face
  for (let i = 0; i < 2; i++) {
    const u = -0.45 + i * 0.95 + (hash(seed, 40 + i) - 0.5) * 0.4, a = P(u * Lh, fy(u) - th), c2 = P(u * Lh + Dx * 0.6, fy(u) - th - D * 0.8);
    b.toneLine(a[0], a[1], c2[0], c2[1], -1);
  }
  for (let i = 0; i < 6; i++) {
    const u = (hash(seed, 50 + i) - 0.5) * 1.7, t = 0.2 + hash(seed, 56 + i) * 0.6, p = P(u * Lh + Dx * t, fy(u) - th - D * t);
    b.dot(p[0], p[1], m.lichen[Math.floor(hash(seed, 62 + i) * 4)], 0.5, { wrap: true });
    if (hash(seed, 68 + i) < 0.5) b.dot(p[0] + 1, p[1], m.lichen[Math.floor(hash(seed, 62 + i) * 4)], 0.5, { wrap: true });
  }
  for (let i = 0; i < 3; i++) {
    const u = -0.8 + i * 0.7, a = P(u * Lh, fy(u) - th * 0.6), c2 = P(u * Lh + 5, fy(u) - th * 0.6 + 1);
    b.toneLine(a[0], a[1], c2[0], c2[1], -1);
  }
  b.toneLine(FL[0], FL[1], FR[0], FR[1], 1);
  // rosettes of lichen and, on a fallen stone, a row of pecked cups on its top
  for (let i = 0; i < 3; i++) {
    const u = (hash(seed, 160 + i) - 0.5) * 1.5, t = 0.3 + hash(seed, 170 + i) * 0.4, p = P(u * Lh + Dx * t, fy(u) - th - D * t), k = Math.floor(hash(seed, 180 + i) * 4);
    b.dot(p[0], p[1], m.lichen[(k + 3) % 4], 0.5, { wrap: true });
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) b.dot(p[0] + dx, p[1] + dy, m.lichen[k], 0.5, { wrap: true });
  }
  if (o.cups) for (let i = 0; i < 4; i++) {
    const u = -0.55 + i * 0.36, p = P(u * Lh + Dx * 0.5, fy(u) - th - D * 0.5);
    b.tone(p[0], p[1], -1); b.tone(p[0], p[1], -1); b.tone(p[0] + 1, p[1], -1); b.tone(p[0] + 1, p[1] + 1, 1); b.tone(p[0], p[1] + 1, 1);
  }
  // the grass grown up its front (not on a lintel in the air)
  if (o.grass !== false) for (let x = -Lh; x < Lh; x++) {
    const hh = Math.max(1, Math.round((0.5 + hash(seed + 7, x + 90) * th * 0.8) * 0.9));
    for (let y = 0; y < hh; y++) { const p = P(x, fy(x / Lh) - y - 1); b.dot(p[0], p[1], y === hh - 1 && hash(seed, x) < 0.5 ? m.mossL : m.moss, 0.6, { wrap: true }); }
  }
};
export const stonefallPix = (ctx, x, y, s, o) => {
  const gy = y + 8, L = (12 + hash(o.seed, 4) * 3) * s, th = 4.5 * s, D = 7 * s, mt = stoneMat(mix("#aaa496", "#9a968c", hash(o.seed, 3) * 0.6));
  dapple(ctx, x + 3 * s + L * 0.1, gy + 0.6, L * 1.15, 2.4 * s, 0.28, o.seed);
  bareFoot(ctx, x, gy + 0.6, L * 1.1, 2 * s, o.seed);
  sculpt(ctx, x, gy, Math.ceil(L * 2 * U) + 40, Math.ceil((th + D) * U) + 30, 12, (b) => slabPx(b, 0, 0, L * U, th * U, D * U, 0, mt, o.seed, { tilt: o.v % 2 ? 0.05 : -0.04, cups: true }));
};
// Two uprights and a lintel across them. v1: the lintel has slipped, one end on the turf, the other propped on the right upright.
export const trilithonPix = (ctx, x, y, s, o) => {
  const gy = y + 8, w = 4.6 * s, h = 25 * s, gap = 9.5 * s, sd = o.seed, slipped = o.v % 2 === 1;
  const mt = stoneMat(mix("#aaa496", "#a09a8e", 0.3));
  dapple(ctx, x + 10 * s, gy + 1, 22 * s, 3.4 * s, 0.26, sd);
  dapple(ctx, x + 1 * s, gy + 0.6, 17 * s, 1.8 * s, 0.3, sd + 3);
  // the two uprights are separate sculpts at their own x (a sculpt is anchored at its own foot)
  bareFoot(ctx, x, gy, gap + w * 1.6, 2.6 * s, sd);
  sculpt(ctx, x - gap, gy, Math.ceil(w * 3 * U) + 30, Math.ceil(h * U) + 28, 10, (b) => standingPx(b, w, h, 0.01, 0.3, sd + 1, mt, { flat: true, carve: "spiral", carveAt: 0.35 }));
  sculpt(ctx, x + gap, gy, Math.ceil(w * 3 * U) + 30, Math.ceil(h * (slipped ? 0.97 : 1) * U) + 28, 10, (b) => standingPx(b, w, h * (slipped ? 0.97 : 1), slipped ? 0.04 : -0.01, -0.3, sd + 2, mt, { flat: true }));
  if (!slipped) {
    sculpt(ctx, x + 0.3 * s, gy - h + 1.4 * s, Math.ceil((gap + w * 1.5) * 2 * U) + 40, Math.ceil(12 * s * U) + 30, 14,
      (b) => slabPx(b, 0, 0, (gap + w * 1.5) * U, 5.2 * s * U, 3.4 * s * U, 0, mt, sd + 3, { tilt: 0.015, grass: false }));
  } else {
    sculpt(ctx, x - 4 * s, gy - 9 * s, Math.ceil((gap + w * 1.2) * 2 * U) + 60, Math.ceil(60 * s) + 60, 40,
      (b) => slabPx(b, 0, 0, (gap + w * 1.2) * U, 5 * s * U, 3.2 * s * U, -0.62, mt, sd + 3, { tilt: 0 }));
  }
};

// ---- the mill --------------------------------------------------------------------------------------
const MILL = { hw: 17, wall: 10.5, frame: 7.5, apex: 12, D: 14, R: 13.5, rx: 0.55 };
const sackAt = (b, x, y, k, mt, z) => sackPix(b, x, y, k, mt, z);
export const millBodyPix = (c, x, y, s, v) => {
  const m = M(), gy = y + 8, side = v % 2 ? 1 : -1, k = U * s;
  const hw = MILL.hw * k, wallTop = -MILL.wall * k, eave = wallTop - MILL.frame * k, apex = eave - MILL.apex * k, Dp = MILL.D * k;
  const near = side * hw;
  const wxr = side * (MILL.hw + 4.5) * k, wyr = 3 * k;                            // the hub, from the feet
  const wl = Math.round(((11 + MILL.R * 0.46) * s - 8) * U);                       // the race's surface, below the feet
  const R = MILL.R * k, rxw = R * MILL.rx;
  const Wd = Math.ceil((MILL.hw + 28) * 2 * s * U), Hd = Math.ceil(50 * s * U) + 40;
  dapple(c, x + 9 * s, gy + 0.5, hw / U * 1.5, 4.4 * s, 0.3, 11);
  sculpt(c, x, gy, Wd, Hd, 40, (b) => {
    const dry = near - side * 7 * k;
    // the footing: the front wall carried down past the turf into the race, its foot stepping up the bank
    const fx0 = Math.min(near + side * 1.5 * k, dry), fx1 = Math.max(near + side * 1.5 * k, dry);
    b.part(); b.poly([[near + side * 1.5 * k, -2], [near + side * 1.5 * k, wl - 1], [near - side * 4.5 * k, wl - 1], [dry, 4], [dry, -2]], m.mason, 0, { n: [0, 0, 1] });
    courses(b, Math.floor(fx0), -2, Math.ceil(fx1 - fx0), wl + 2, 5, 17, { litTop: true });
    for (let xx = Math.floor(fx0); xx < fx1; xx++) {                                // wet and mossy at the waterline
      const top = wl - 3 - Math.floor(hash(xx, 9) * 3);
      for (let yy = top; yy < wl; yy++) b.tone(xx, yy, -1);
      for (let yy = top; yy < Math.min(wl, top + 2); yy++) if (hash(xx, yy) < 0.7) b.dot(xx, yy, hash(xx, yy + 3) < 0.3 ? m.mossL : m.moss, 0.3, { noLine: true, cast: 0 });
    }
    // the far bearing: a post in the race beyond the wheel, capped
    const pxp = wxr + side * (rxw + 2.5 * k);
    beam(b, pxp - 1, wyr - 3 * k, 3, wl - wyr + 3 * k - 1, 0.2, m.woodD);
    beam(b, pxp - 2, wyr - 3.4 * k, 5, 2, 0.3, m.woodL);
    // the sluice upstream: two posts either side of the race, a head beam, the board half down, wet below
    const scx = wxr + side * 3.5 * k, scy = wyr - 17 * k, nxs = -side * 7.5 * k, nys = -1.2 * k, Hs = 4.5 * k;
    const sa = [scx + nxs, scy + nys], sb = [scx - nxs, scy - nys];
    for (const [px, py] of [sa, sb]) beam(b, Math.round(px) - 1, Math.round(py - Hs), 3, Math.round(Hs) + 2, 0.2, m.woodD);
    spar(b, sa[0], sa[1] - Hs, sb[0], sb[1] - Hs, 1, 0.35, m.wood);
    spar(b, sa[0], sa[1] - 1.8 * k, sb[0], sb[1] - 1.8 * k, 1.6, 0.3, m.woodL);
    spar(b, sa[0], sa[1] - 0.6 * k, sb[0], sb[1] - 0.6 * k, 0.9, 0.32, m.wellD);
    // the stone ground storey
    b.part(); b.rect(-hw, wallTop, hw * 2, -wallTop, m.rubble, 0.4, { n: [0, 0, 1] });
    courses(b, -hw, wallTop, hw * 2, -wallTop, 5, 23, { litTop: true });
    b.toneLine(-hw, -1, hw - 1, -1, -1);
    // damp and moss climbing the wall on the wheel's side, where the spray reaches
    for (let i = 0; i < 26; i++) {
      const mx = near - side * hash(i, 9) * hw * 0.5, my = -hash(i, 13) * hash(i, 17) * 9 * k;
      if (hash(i, 5) < 0.5) b.dot(mx, my, m.moss, 0.5, { noLine: true, cast: 0 }); else b.tone(mx, my, -1);
    }
    // the timber-framed limewash above, and the gable
    b.part(); b.poly([[-hw, wallTop], [-hw, eave], [0, apex], [hw, eave], [hw, wallTop]], m.lime, 0.4, { n: [0.1, 0, 0.99] });
    for (let xx = Math.floor(hw * 0.55); xx < hw; xx++) { b.toneLine(xx, wallTop - 1, xx, eave + Math.floor((xx / hw) * 4), -1); }
    for (let i = 0; i < 24; i++) b.tone((hash(i, 31) - 0.5) * hw * 1.9, wallTop + hash(i, 37) * (eave - wallTop), hash(i, 41) < 0.5 ? -1 : 1);
    for (const fx of [-1, -0.45, 0.45, 1]) beam(b, Math.round(fx * hw - (fx > 0.9 ? 3 : 0)), eave, 3, wallTop - eave, 0.6, m.wood);
    beam(b, -hw, wallTop - 3, hw * 2, 3, 0.6, m.wood);                              // the sill rail
    beam(b, -hw, eave, hw * 2, 2, 0.6, m.wood);
    beam(b, -1, apex + 4, 3, eave - apex - 4, 0.6, m.wood);                         // the king post
    spar(b, -hw + 2, wallTop - 3, -hw * 0.45 - 1, eave + 2, 0.9, 0.62, m.woodD);   // braces
    spar(b, hw - 2, wallTop - 3, hw * 0.45 + 1, eave + 2, 0.9, 0.62, m.woodD);
    spar(b, -2, apex + 6, -hw * 0.38, eave - 1, 0.8, 0.62, m.woodD);
    spar(b, 2, apex + 6, hw * 0.38, eave - 1, 0.8, 0.62, m.woodD);
    // the loft door under the hoist beam
    b.part(); b.rect(-2.5 * k, eave - 6.5 * k, 5 * k, 6.5 * k, m.woodD, 0.7, { n: [0, 0, 1] });
    b.part(); b.rect(-2 * k + 1, eave - 6 * k + 1, 4 * k - 2, 6 * k - 1, m.wellD, 0.8, { n: [0, 0, 1], noLine: true, cast: 0 });
    b.toneLine(-1, eave - 6 * k + 1, -1, eave - 1, -1);
    windowPix(b, Math.round(-hw * 0.73), Math.round(eave + 2 * k), 6, 5, 0.7);
    windowPix(b, Math.round(hw * 0.52), Math.round(eave + 2 * k), 6, 5, 0.7);
    // the ground storey: the door on the dry side, a small window, a lintel
    const dxr = -side * hw * 0.32;
    doorPix(b, Math.round(dxr - 3 * k), Math.round(-8.5 * k), Math.round(6 * k), Math.round(8.5 * k), 0.8, m.doorB);
    beam(b, Math.round(dxr - 4 * k), Math.round(-9.5 * k - 1), Math.round(8 * k), 3, 0.85, m.chim);
    windowPix(b, Math.round(side * hw * 0.25 - 1.5 * k), Math.round(-8 * k), 6, 6, 0.8);
    // the bearing block let into the wall where the axle goes in, iron-strapped
    const bx = Math.round(near - side * 0.5 * k - (side < 0 ? 0 : 5 * k));
    beam(b, bx, Math.round(wyr - 3 * k), Math.round(5 * k), Math.round(5 * k), 0.9, m.woodD);
    b.part(); b.rect(bx, Math.round(wyr - 1 * k), Math.round(5 * k), 2, m.iron, 1, { n: [0, 0, 1], noLine: true, cast: 0 });
    // a spare millstone leant on the wall, its furrows dressed, its eye dark
    {
      const qx = side * hw * 0.02, qr = 2.6 * k;
      b.part(); b.ellipse(qx, -qr * 0.95, qr * 0.92, qr, m.quern, 0.95, { round: 0.95 });
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; b.toneLine(qx + Math.cos(a) * qr * 0.3, -qr * 0.95 + Math.sin(a) * qr * 0.3, qx + Math.cos(a + 0.4) * qr * 0.8, -qr * 0.95 + Math.sin(a + 0.4) * qr * 0.85, -1); }
      b.part(); b.ellipse(qx, -qr * 0.95, 1.3, 1.4, m.hole, 1, { round: 0.3, noLine: true, cast: 0 });
      for (let i = 0; i < 5; i++) b.dot(qx - qr * 0.7 + i, -1 - (i % 2), m.moss, 1.02, { noLine: true, cast: 0 });
    }
    // the tiled roof: west slope lit, east in shade, courses and staggered joints, ridge, bargeboards
    const rf = gable(b, hw, eave, apex, Dp, m.tile, m.tileE, { over: 3 });
    for (let d = 3; d < Dp; d += 4) {
      b.toneLine(rf.lE[0], rf.lE[1] - d, rf.apex[0] - 1, rf.apex[1] - d, -1);
      b.toneLine(rf.apex[0] + 1, rf.apex[1] - d, rf.rE[0], rf.rE[1] - d, -1);
      b.toneLine(rf.lE[0], rf.lE[1] - d - 1, rf.apex[0] - 1, rf.apex[1] - d - 1, 1);
      for (let jx = rf.lE[0] + ((d / 4) % 2 ? 2 : 5); jx < rf.rE[0]; jx += 6) {
        const t = (jx - rf.lE[0]) / (rf.apex[0] - rf.lE[0]);
        const yy = jx < 0 ? rf.lE[1] + (rf.apex[1] - rf.lE[1]) * t - d : rf.apex[1] + (rf.rE[1] - rf.apex[1]) * (jx / (rf.rE[0])) - d;
        b.toneLine(jx, yy + 1, jx, yy + 3, -1);
      }
    }
    // moss and lichen low on the tiles, a slipped tile or two
    for (let i = 0; i < 5; i++) {
      const lit = i % 2 === 0, [a, e] = lit ? [rf.lE, rf.apex] : [rf.apex, rf.rE], t = lit ? 0.04 + hash(i, 61) * 0.3 : 0.66 + hash(i, 61) * 0.3, d = 1 + Math.floor(hash(i, 67) * Dp * 0.7);
      const X = a[0] + (e[0] - a[0]) * t, Y = a[1] + (e[1] - a[1]) * t - d;
      for (let j = 0; j < 6; j++) b.dot(X + Math.round((hash(i, j + 70) - 0.5) * 6), Y + Math.round((hash(i, j + 80) - 0.5) * 2), j < 1 ? m.lichen[1] : j < 3 ? m.mossL : m.moss, 1.35, { noLine: true, cast: 0 });
      if (i === 1 || i === 4) { b.tone(X + 3, Y - 3, -1); b.tone(X + 4, Y - 3, -1); b.tone(X + 3, Y - 2, -1); }
    }
    spar(b, 0, apex - 2, 0, apex - 2 - Dp, 1.3, 1.4, m.tileD);
    b.toneLine(-1, apex - 3, -1, apex - 2 - Dp, 1);
    spar(b, rf.lE[0], rf.lE[1], rf.apex[0], rf.apex[1], 1, 1.3, m.woodD);
    spar(b, rf.apex[0], rf.apex[1], rf.rE[0], rf.rE[1], 1, 1.3, m.woodD);
    // the hoist beam out of the gable, a rope and a sack hanging from it
    beam(b, -1, apex - 3, 3, 8, 1.5, m.wood);
    b.part(); b.line(0, apex + 5, 0, apex + 10 * k, m.ropeD, 1.6, { noLine: true, cast: 0 });
    sackAt(b, 1, apex + 10 * k + 7 * k * 0.5 + 2, k * 0.7, m.sack, 1.7);
    // sacks of meal by the door, and a barrel at the dry end
    sackAt(b, Math.round(dxr - side * 5.5 * k), 2, k * 0.9, m.sack, 1.2);
    sackAt(b, Math.round(dxr - side * 8.5 * k), 3, k * 0.8, m.sackD, 1.1);
    const bxb = -side * (MILL.hw + 3.5) * k;
    b.part(); b.rect(bxb - 2.6 * k, -6 * k, 5.2 * k, 6.5 * k, m.barrel, 1.2, { round: 0.9 });
    b.part(); b.rect(bxb - 2.6 * k, -4.6 * k, 5.2 * k, 1, m.iron, 1.3, { round: 0.9, noLine: true, cast: 0 });
    b.part(); b.rect(bxb - 2.6 * k, -1.8 * k, 5.2 * k, 1, m.iron, 1.3, { round: 0.9, noLine: true, cast: 0 });
    b.part(); b.ellipse(bxb, -6 * k, 2.6 * k, 1.1 * k, m.woodL, 1.4, { n: [0, -0.8, 0.6] });
  });
};

// ---- the fisher's cottage ----------------------------------------------------------------------------------
const COT = { hw: 12.5, wall: 9, apex: 8.5, D: 13 };
export const cottageBodyPix = (c, x, y, s, v) => {
  const m = M(), gy = y + 8, hw = COT.hw * s * U, flip = v % 2 ? 1 : -1, k = U * s;
  const eave = -COT.wall * k, apex = eave - COT.apex * k, D = COT.D * k, sd = 31 + v, garden = v >= 2;
  dapple(c, x + 8 * s, gy + 0.5, hw / U * 1.7, 3.8 * s, 0.3, 5);
  sculpt(c, x, gy, Math.ceil((COT.hw + 12) * 2 * s * U), Math.ceil(46 * s * U) + 32, 24, (b) => {
    // the chimney at the back, behind the ridge
    // (the garden cottage's chimney stands taller at the other end, with a clay pot on it)
    const cx0 = Math.round(flip * (garden ? 3.5 : -3.5) * k - 2 * k), cw = Math.round(4 * k), ct = apex - D - (garden ? 8 : 5) * k;
    b.part(); b.rect(cx0, ct, cw, (garden ? 10 : 7) * k, garden ? m.rubble : m.chim, 0.1, { n: [0, 0, 1] });
    courses(b, cx0, Math.round(ct), cw, Math.round((garden ? 10 : 7) * k), 4, garden ? 9 : 5);
    b.part(); b.rect(cx0 - 1, ct - 1, cw + 2, 2, m.mason, 0.3, { n: [0, -0.4, 0.9] });
    if (garden) { b.part(); b.rect(cx0 + 1, ct - 1 - 2 * k, cw - 2, 2 * k, m.ochre, 0.4, { n: [0, 0, 1], round: 0.6 }); b.part(); b.rect(cx0 + 2, ct - 1 - 2 * k, cw - 4, 1, m.wellD, 0.45, { n: [0, 0, 1], noLine: true, cast: 0 }); }
    else { b.part(); b.rect(cx0 + 1, ct, cw - 2, 1, m.wellD, 0.35, { n: [0, 0, 1], noLine: true, cast: 0 }); }
    // a lean-to shed of grey slate on the odd one
    if (v % 2) {
      const sw = Math.round(7 * k), x0 = flip > 0 ? Math.round(-flip * hw) - sw : Math.round(-flip * hw);
      b.part(); b.rect(x0, -6.5 * k, sw, 6.5 * k, m.wood, 0.1, { n: [0, 0, 1] });
      for (let i = 1; i < 4; i++) b.toneLine(x0 + Math.round((sw * i) / 4), -6.5 * k, x0 + Math.round((sw * i) / 4), -1, -1);
      b.part(); b.poly([[x0 - 2, -6 * k], [x0 + sw + 2, -6 * k], [x0 + sw + 2, -12 * k], [x0 - 2, -12 * k]], m.slate, 0.5, { n: [0, -0.5, 0.86] });
      for (let i = 1; i < 3; i++) b.toneLine(x0 - 2, -12 * k + i * 2 * k, x0 + sw + 1, -12 * k + i * 2 * k, -1);
      b.toneLine(x0 - 2, -12 * k + 1, x0 + sw + 1, -12 * k + 1, 1);
    }
    // limewashed walls and the gable end, worn through at the foot to rubble
    b.part(); b.poly([[-hw, 0], [-hw, eave], [0, apex], [hw, eave], [hw, 0]], m.lime, 0.2, { n: [0.1, 0, 0.99] });
    for (let xx = Math.floor(hw * 0.6); xx < hw; xx++) b.toneLine(xx, -1, xx, eave + Math.floor((xx / hw) * 4), -1);
    for (let i = 0; i < 18; i++) {
      const bx = -hw + hash(v + 3, i) * hw * 2, by = -1 - hash(v + 5, i) * 2.6 * k;
      b.dot(bx, by, hash(v, i) < 0.55 ? m.limeD : m.rubble, 0.3, { noLine: true, cast: 0 });
      if (hash(v, i + 40) < 0.6) b.dot(bx + 1, by, hash(v, i) < 0.55 ? m.limeD : m.rubble, 0.3, { noLine: true, cast: 0 });
    }
    for (let xx = -hw; xx < hw; xx++) if (hash(xx, 77) < 0.55) b.dot(xx, -1, m.moss, 0.3, { noLine: true, cast: 0 });
    doorPix(b, Math.round(flip * 3.5 * k - 2.5 * k), Math.round(-7.5 * k), Math.round(5 * k), Math.round(7.5 * k), 0.5, m.door);
    const wx0 = Math.round(-flip * 5 * k - 1.75 * k), wy0 = Math.round(-6.5 * k);
    windowPix(b, wx0, wy0, 7, 6, 0.5, m.door);
    // the hearth's glow in the lower panes (someone is home)
    for (let yy = wy0 + 4; yy < wy0 + 6; yy++) for (let xx = wx0; xx < wx0 + 7; xx++) if (xx !== wx0 + 3) b.dot(xx, yy, yy === wy0 + 4 ? m.lampD : m.lamp, 0.65, { noLine: true, cast: 0 });
    windowPix(b, -3, Math.round(apex + 3.5 * k), 5, 5, 0.5);
    // a stack of cut peats against the wall's corner, drying, in staggered courses
    if (garden) {
      // a kitchen plot before the window: dug rows of kale and onions, a wattle fence on its front and end
      const pa = -flip * (hw - 0.5 * k), pb = -flip * 1.5 * k, x0 = Math.round(Math.min(pa, pb)), pw = Math.round(Math.abs(pa - pb)), pd = Math.round(4.6 * k);
      b.part(); b.rect(x0, 1, pw, pd, m.soil, 0.05, { n: [0, -0.7, 0.7], noLine: true, cast: 0 });
      for (let r = 0; r < 3; r++) {
        const yy = 2 + Math.round(r * pd / 3);
        b.toneLine(x0 + 1, yy + 2, x0 + pw - 2, yy + 2, -1);
        for (let xx = x0 + 2 + (r % 2); xx < x0 + pw - 2; xx += 3) {
          if (r === 1) { b.dot(xx, yy, m.onion, 0.1, { noLine: true, cast: 0 }); b.dot(xx, yy - 1, m.onion, 0.1, { noLine: true, cast: 0 }); }
          else { b.part(); b.ellipse(xx, yy, 1.4, 1.1, m.kale, 0.1 + r * 0.01, { round: 0.95 }); }
        }
      }
      const fy = pd + 1;
      b.part(); for (let xx = x0; xx <= x0 + pw; xx += 3) b.rect(xx, fy - 3, 1, 4, m.wood, 0.3, { n: [0, 0, 1] });
      b.part(); b.rect(x0, fy - 2, pw + 1, 2, m.wicker, 0.32, { n: [0, -0.3, 0.95] });
      b.toneLine(x0, fy - 2, x0 + pw, fy - 2, 1);
      for (let xx = x0 + 1; xx < x0 + pw; xx += 2) b.tone(xx, fy - 1, -1);
    } else {
      const pa = -flip * (hw - 1 * k), pb = -flip * (hw - 5.5 * k), x0 = Math.round(Math.min(pa, pb)), pw = Math.round(Math.abs(pa - pb)), ph = Math.round(3.4 * k);
      b.part(); b.poly([[x0, 1], [x0 + pw, 1], [x0 + pw - 1, -ph], [x0 + 1, -ph - 1]], m.peat, 0.65, { n: [0, 0.1, 1], round: 0.5 });
      for (let r = 0, yy = 0; yy > -ph; r++, yy -= 3) { b.toneLine(x0, yy, x0 + pw - 1, yy, -1); for (let xx = x0 + (r % 2 ? 2 : 4); xx < x0 + pw - 1; xx += 4) b.toneLine(xx, yy - 2, xx, yy - 1, -1); b.toneLine(x0 + 1, yy - 2, x0 + pw - 2, yy - 2, 1); }
      b.part(); b.poly([[x0 - 1, -ph], [x0 + pw + 1, -ph], [x0 + pw - 2, -ph - 2], [x0 + 2, -ph - 3]], m.peat, 0.7, { n: [0, -0.8, 0.6] });
    }
    // a fish basket by the door
    const bxk = Math.round(flip * (hw / U - 1.5 * s) * U);
    b.part(); b.poly([[bxk - 2.5 * k, -4 * k], [bxk + 2.5 * k, -4 * k], [bxk + 2 * k, 1], [bxk - 2 * k, 1]], m.wicker, 0.6, { round: 0.8 });
    for (let i = 0; i < 3; i++) b.toneLine(bxk - 2 * k, -3 * k + i * 1.2 * k, bxk + 2 * k, -3 * k + i * 1.2 * k, -1);
    b.part(); b.ellipse(bxk, -4 * k, 2.5 * k, 0.9 * k, m.glint, 0.7, { round: 0.5, noLine: true, cast: 0 });
    b.dot(bxk - 1, -4 * k, m.chalk, 0.8, { noLine: true, cast: 0 });
    // the deep thatch: combed in rows, held down by ropes weighted with stones, a ragged lip
    const rf = gable(b, hw, eave, apex, D, m.thatch, m.thatchE, { over: 3 });
    for (let d = 2; d < D; d += 3) for (const [a, e, lit] of [[rf.lE, rf.apex, true], [rf.apex, rf.rE, false]]) {
      const n = Math.abs(e[0] - a[0]);
      for (let i = 0; i < n; i++) {
        const t = i / n, X = a[0] + (e[0] - a[0]) * t, Y = a[1] + (e[1] - a[1]) * t - d;
        const r = hash(sd + d, i);
        if (r < 0.5) b.tone(X, Y, -1); else if (lit && r > 0.8) b.tone(X, Y - 1, 1);
      }
    }
    spar(b, 0, apex - 2, 0, apex - 2 - D, 1.2, 1.4, m.thatchD);
    b.toneLine(-1, apex - 3, -1, apex - 2 - D, 1);
    for (const [a, e] of [[rf.lE, rf.apex], [rf.apex, rf.rE]]) {
      const n = Math.abs(e[0] - a[0]);
      for (let i = 0; i <= n; i++) {
        const t = i / n, X = a[0] + (e[0] - a[0]) * t, Y = a[1] + (e[1] - a[1]) * t;
        b.dot(X, Y, m.thatchD, 1.3, { n: [0, 0.4, 0.9] });
        if (hash(sd, i + 300) < 0.45) b.dot(X, Y + 1, m.thatch, 1.3, { n: [0, 0.4, 0.9], noLine: true, cast: 0 });
      }
    }
    for (const u of [-0.62, -0.25, 0.25, 0.62]) {
      const ex = Math.round(u * hw), ry = eave + 2 - (eave - apex) * (1 - Math.abs(u)) - 1;
      for (let yy = ry; yy > ry - D; yy -= 1) if (Math.round(yy) % 3 !== 0) b.dot(ex, yy, m.rope, 1.5, { noLine: true, cast: 0 });
      b.part(); b.ellipse(ex, eave + 4, 1.7, 1.8, m.mason, 1.6, { round: 0.95, cast: 0 });
    }
    // moss in the old thatch: short runs along its combed rows, gathered at the eaves (each slope's outer end)
    // and thicker toward the back, where the north side stays damp
    for (const [a, e, outer] of [[rf.lE, rf.apex, 0], [rf.apex, rf.rE, 1]]) for (let d = 3; d < D - 1; d += 3) {
      const n = Math.abs(e[0] - a[0]), back = d / D;
      for (let i = 0; i < n; i++) {
        const t = i / n, edge = outer ? t : 1 - t;                 // 1 at the eave, 0 at the ridge
        const pmoss = Math.pow(edge, 3) * (0.12 + 0.3 * back) * (outer ? 1.2 : 0.7);
        if (hash(sd + d, i + 900) > pmoss) continue;
        const X = a[0] + (e[0] - a[0]) * t, Y = a[1] + (e[1] - a[1]) * t - d;
        b.dot(X, Y, m.mossL, 1.35, { noLine: true, cast: 0 }); b.dot(X + 1, Y, hash(sd + d, i + 950) < 0.5 ? m.mossL : m.thatchM, 1.35, { noLine: true, cast: 0 });
      }
    }
    // a string of cork floats along the eave
    for (let i = 0; i < 5; i++) {
      const u = -0.8 + i * 0.4, fx = u * hw * 0.85, fy = eave + 6 + (1 - u * u) * 2;
      b.part(); b.ellipse(fx, fy + 1, 1.3, 1.2, m.cork, 1.7, { round: 0.95, cast: 0 });
    }
  });
};

// ---- boats -------------------------------------------------------------------------------------------------------
const BOAT_COLS = [
  ["#2e2a30", "#e6dcc4", "#4a7a6c", "#a8503c"],
  ["#2e2a30", "#e6dcc4", "#3a6488", "#d8b34a"],
];
export const boatPix = (ctx, x, y, s, o) => {
  const m = M(), v = o.v % 4, gy = y + 8 + 6 * s, sd = o.seed, k = U * s;
  if (v === 1) {
    // a clinker rowboat turned keel-up on two stones for the winter: we look down on her tarred bottom (strakes
    // running fore and aft, closing to the stems), the keel a lit ridge down the middle with a pale new plank
    // let in, her near side's painted top strake and white rubbing strake low down, the dark gap under her
    // gunwale where she sits on the stones, and her oars laid on the sand beside her
    const L = 13.5 * k, H = 2.6 * k, Dp = 5.2 * k, gl = -1.6 * k;
    dapple(ctx, x + 4 * s, gy + 0.6, L / U * 1.3, 2.6 * s, 0.32, sd);
    const BT = mat("#6c625c", { contrast: 1.2 }), TAR = mat("#3a3436", { contrast: 1 }), PNT = mat(hash(sd, 7) < 0.5 ? "#3a6488" : "#4a7a6c", { contrast: 1.05 }), CRM = mat("#e6dcc4", { contrast: 0.8 });
    const NEW = mat("#b08a5a", { contrast: 0.9 });
    sculpt(ctx, x, gy, Math.ceil(L * 2) + 50, Math.ceil((H + Dp) * 2) + 44, 16, (b) => {
      const g = (u) => gl + 2.2 * k * (1 - u * u);                               // her near gunwale on the ground, bulging to us midships
      const sh = (u) => g(u) - H * (1 - Math.pow(Math.abs(u), 3));             // the near chine, where side meets bottom
      const kl = (u) => gl - 3.4 * k * Math.pow(1 - u * u, 0.85);               // the keel line, seen from above
      // the dark gap beneath her and the two stones
      b.part(); b.ellipse(0, gl + 1, L * 0.8, 0.8 * k, m.hole, 0, { round: 0.2 });
      for (const sx of [-0.62, 0.58]) { b.part(); b.ellipse(sx * L, gl + 0.6 * k, 2.4 * k, 1.4 * k, m.mason, 0.1, { round: 0.95 }); }
      const N = 26, U_ = (i) => -1 + (2 * i) / N;
      // the bottom: the almond between the near chine and the far (beyond the keel)
      const far = (u) => gl - 5.2 * k * Math.pow(1 - u * u, 0.75);
      const top = []; for (let i = 0; i <= N; i++) top.push([U_(i) * L, sh(U_(i))]); for (let i = N; i >= 0; i--) top.push([U_(i) * L, far(U_(i))]);
      b.part(); b.poly(top, BT, 0.5, { n: [-0.1, -0.85, 0.5] });
      // strake laps on the bottom, closing to the stems; the keel ridge lit, its far side dark; the far half in shade
      for (const f of [0.3, 0.62, 1.38, 1.7]) for (let i = 1; i < N - 1; i++) { const u = U_(i), u2 = U_(i + 1); b.toneLine(u * L, sh(u) + (kl(u) - sh(u)) * f, u2 * L, sh(u2) + (kl(u2) - sh(u2)) * f, -1); }
      for (let i = 1; i < N - 1; i++) { const u = U_(i), u2 = U_(i + 1); b.toneLine(u * L, kl(u) + 1, u2 * L, kl(u2) + 1, 1); b.toneLine(u * L, kl(u), u2 * L, kl(u2), 1); b.toneLine(u * L, kl(u) - 1, u2 * L, kl(u2) - 1, -1); b.toneLine(u * L, kl(u) - 2, u2 * L, kl(u2) - 2, -1); }
      // a new plank let in, still raw
      const pu0 = 0.05 + hash(sd, 3) * 0.2, pu1 = pu0 + 0.32;
      for (let i = 0; i <= 8; i++) { const u = pu0 + (pu1 - pu0) * i / 8; b.dot(u * L, sh(u) + (kl(u) - sh(u)) * 0.42, NEW, 0.6, { noLine: true, cast: 0 }); b.dot(u * L, sh(u) + (kl(u) - sh(u)) * 0.42 - 1, NEW, 0.6, { noLine: true, cast: 0 }); }
      // the near side: the tarred strake, then the painted top strake and the cream rubbing strake at her gunwale
      const side = (f0, f1, mt, z) => { const pts = []; for (let i = 0; i <= N; i++) { const u = U_(i); pts.push([u * L, sh(u) + (g(u) - sh(u)) * f0]); } for (let i = N; i >= 0; i--) { const u = U_(i); pts.push([u * L, sh(u) + (g(u) - sh(u)) * f1]); } b.part(); b.poly(pts, mt, z, { n: [0, 0.25, 0.97] }); };
      side(0, 0.45, TAR, 0.7); side(0.45, 0.82, PNT, 0.72); side(0.82, 1.0, CRM, 0.74);
      for (let i = 1; i < N - 1; i++) { const u = U_(i), u2 = U_(i + 1), y0 = sh(u) + 1, y1 = sh(u2) + 1; b.toneLine(u * L, y0, u2 * L, y1, 1); }
      // the stems: a dark post at bow and stern
      for (const e of [-1, 1]) { b.part(); b.capsule(e * L, g(e) - 0.5, 1, e * (L - 1.5 * k), kl(e * 0.88) + 1, 1, m.woodD, 0.9, { limb: false, round: 0.7 }); }
      // barnacle scars and old tar on her bottom near the stems, where she lay in the water
      for (let i = 0; i < 22; i++) {
        const u = (i % 2 ? 1 : -1) * (0.55 + hash(sd, 200 + i) * 0.38), f = 0.1 + hash(sd, 230 + i) * 0.9, yy = sh(u) + (far(u) - sh(u)) * f;
        if (hash(sd, 260 + i) < 0.55) b.dot(u * L, yy, m.chalk, 0.62, { noLine: true, cast: 0 }); else b.dot(u * L, yy, TAR, 0.62, { noLine: true, cast: 0 });
      }
      // an oar laid on the sand at her side, inside her length
      spar(b, -L * 0.7, 2.2 * k, L * 0.4, 1.3 * k, 0.8, 1.2, m.woodL);
      b.part(); b.poly([[L * 0.38, 0.6 * k], [L * 0.7, 0.5 * k], [L * 0.72, 2 * k], [L * 0.38, 2.1 * k]], m.woodL, 1.25, { round: 0.6 });
      // weed and wet sand along her lee
      for (let i = 0; i < 9; i++) b.dot((hash(sd, 60 + i) - 0.3) * L * 1.4, gl + 1.6 * k + hash(sd, 70 + i) * 2, i % 3 ? m.moss : m.ochre, 0.05, { noLine: true, cast: 0 });
    });
    return;
  }
  const flip = v === 3 ? -1 : 1, L = (v === 2 ? 11 : 14) * k, H = (v === 2 ? 5 : 6.5) * k;
  const cols = BOAT_COLS[hash(sd, 7) < 0.5 ? 0 : 1];
  const mats = cols.map((cc) => mat(cc, { contrast: 0.9 }));
  dapple(ctx, x + 5 * s, gy + 0.6, L / U * 1.25, 3 * s, 0.32, sd);
  sculpt(ctx, x, gy, Math.ceil(L * 2.4) + 60, Math.ceil(H * 3) + 60, 24, (b) => {
    const X = (px) => px * flip;
    const wd = 3.6 * k, sheer = (u) => -H - Math.pow(Math.abs(u), 2.2) * H * 0.38;
    // the inside: the well seen over the far gunwale, thwarts and ribs
    const far = [], nearP = [];
    for (let i = 0; i <= 16; i++) { const u = -1 + i / 8; far.push([X(u * L), sheer(u) - wd * (1 - Math.pow(Math.abs(u), 2.5))]); }
    for (let i = 16; i >= 0; i--) { const u = -1 + i / 8; nearP.push([X(u * L), sheer(u)]); }
    b.part(); b.poly([...far, ...nearP], m.well, 0.1, { n: [0, -0.2, 0.97] });
    b.toneLine(-L + 2, -H - wd * 0.4, L - 2, -H - wd * 0.4, -1);
    for (const u of [-0.45, 0.05, 0.5]) { b.part(); b.rect(X(u * L) - 1, -H - wd - 1, 3, wd + 1, m.woodL, 0.3, { n: [0, -0.3, 0.95], noLine: true, cast: 0 }); }
    for (let u = -0.85; u < 0.9; u += 0.17) b.toneLine(X(u * L), -H - wd * 0.7, X(u * L), -H - 1, -1);
    for (let i = 0; i <= 16; i++) { const [px, py] = far[i]; b.dot(px, py, mats[1], 0.35, { noLine: true, cast: 0 }); }
    // the gear inside: mast and furled sail along, or a pair of oars
    if (v === 2) {
      spar(b, X(-L * 0.8), -H - 2.5 * k, X(L * 0.95), -H - 3.8 * k, 1, 0.6, m.woodL);
      spar(b, X(-L * 0.9), -H - 3.6 * k, X(L * 0.75), -H - 2 * k, 1, 0.62, m.woodL);
      b.part(); b.rect(X(L * 0.85) - 1, -H - 4.8 * k, 4, 3, m.woodL, 0.65, { n: [0, 0, 1] });
      b.part(); b.rect(X(-L * 1.0) - 3, -H - 4.4 * k, 4, 3, m.woodL, 0.65, { n: [0, 0, 1] });
    } else {
      spar(b, X(-L * 1.1), -H - 4.2 * k, X(L * 0.9), -H - 2.2 * k, 1.3, 0.6, m.wood);
      b.part(); b.poly([[X(-L * 0.75), -H - 4.9 * k], [X(L * 0.5), -H - 3.4 * k], [X(L * 0.5), -H - 1.9 * k], [X(-L * 0.75), -H - 2.8 * k]], m.sail, 0.7, { round: 0.6 });
      for (const u of [-0.45, -0.1, 0.25]) b.toneLine(X(u * L), -H - 4.7 * k, X(u * L), -H - 2.4 * k, -1);
    }
    // the hull: strakes of tar, cream sheer, sea green, ochre; each lit above and dark below its lap
    const order = [1, 3, 2, 0];
    for (let q = 0; q < 4; q++) {
      const f0 = q / 4, f1 = (q + 1) / 4;
      // (drawn in the flipped frame by mirroring x inside lapPoly's caller)
      lapPolyF(b, 0, L, H, f0, f1, mats[order[q]], sd, flip);
    }
    // the near gunwale rail with tholes, her number in chalk on the bow
    for (let i = 0; i <= 16; i++) { const u = -1 + i / 8; b.dot(X(u * L), sheer(u), mats[1], 0.9, { noLine: true, cast: 0 }); b.dot(X(u * L) + 1, sheer(u), mats[1], 0.9, { noLine: true, cast: 0 }); b.dot(X(u * L), sheer(u) - 1, mats[1], 0.9, { n: [0, -0.7, 0.7], noLine: true, cast: 0 }); }
    for (const u of [-0.35, 0.3]) b.dot(X(u * L), sheer(u) - 2, m.woodD, 1, { noLine: true, cast: 0 });
    b.dot(X(L * 0.62), -H * 0.5, m.chalk, 1, { noLine: true, cast: 0 }); b.dot(X(L * 0.62), -H * 0.5 + 1, m.chalk, 1, { noLine: true, cast: 0 }); b.dot(X(L * 0.62) + 2 * flip, -H * 0.5, m.chalk, 1, { noLine: true, cast: 0 });
    // a coil of rope at her stern
    const rx = -L * flip * 1.05, ry = 2;
    for (let r = 2.2; r > 0.6; r -= 0.7) { b.part(); b.ellipse(rx, ry, r * k, r * 0.5 * k, r > 1.5 ? m.rope : m.ropeD, 1.5, { round: 0.3 }); }
  });
};
// one strake of the hull, in the (maybe flipped) frame
const lapPolyF = (b, x0, L, H, f0, f1, mt, sd, flip) => {
  const sheer = (u) => -H - Math.pow(Math.abs(u), 2.2) * H * 0.38, keel = (u) => -Math.pow(Math.abs(u), 3) * H * 0.62;
  const y = (u, f) => sheer(u) + (keel(u) - sheer(u)) * f;
  const pts = [];
  for (let i = 0; i <= 16; i++) { const u = -1 + i / 8; pts.push([x0 + u * L * flip, y(u, f0)]); }
  for (let i = 16; i >= 0; i--) { const u = -1 + i / 8; pts.push([x0 + u * L * flip, y(u, f1)]); }
  b.part(); b.poly(pts, mt, 0.8 + f0 * 0.05, { round: 0.7 });
  if (f0 === 0) for (let i = 0; i < 16; i++) { const u = -1 + i / 8, u2 = u + 0.125; b.toneLine(x0 + u * L * flip, y(u, f0) + 1, x0 + u2 * L * flip, y(u2, f0) + 1, 1); }
  for (let i = 0; i < 16; i++) { const u = -1 + i / 8, u2 = u + 0.125; b.toneLine(x0 + u * L * flip, y(u, f1) - 1, x0 + u2 * L * flip, y(u2, f1) - 1, -1); }
};

// ---- nets drying on their rack ----------------------------------------------------------------------------------
export const netrackPix = (ctx, x, y, s, o) => {
  const m = M(), gy = y + 8, n = o.v % 2 ? 2 : 3, span = (n === 3 ? 10 : 12) * s * U, hh = 15 * s * U, sd = o.seed, k = U * s;
  dapple(ctx, x + 6 * s, gy + 0.6, span / U * (n - 1) * 0.65 + 6, 2.4 * s, 0.26, sd);
  const x0 = -span * (n - 1) / 2;
  sculpt(ctx, x, gy, Math.ceil(span * (n + 1) + 90), Math.ceil(hh) + 50, 12, (b) => {
    // the nets first (behind the rail), mesh as a lattice on the swag
    for (let i = 0; i < n - 1; i++) {
      const a = x0 + i * span + 2, e = x0 + (i + 1) * span - 2, top = -hh + 5;
      if (n === 3 && i === 1) {
        // a line of split fish hung by their tails to dry, in pairs, silver bellies and dark backs
        b.part(); b.line(a - 1, top - 1, e + 1, top - 1, m.ropeD, 0.5, { noLine: true, cast: 0 });
        for (let fx = a + 1, j = 0; fx < e - 1; fx += 3, j++) {
          const len = 6 + Math.floor(hash(sd, j + 40) * 3), sway = (j % 2 ? 1 : 0);
          b.part(); b.capsule(fx, top + 1, 0.6, fx + sway, top + len, 1.2, j % 3 === 1 ? m.fishD : m.fish, 0.45 + j * 0.002, { limb: false, round: 0.8 });
          b.dot(fx - 1, top, m.fishD, 0.46, { noLine: true, cast: 0 }); b.dot(fx + 1, top, m.fishD, 0.46, { noLine: true, cast: 0 });
          b.tone(fx + sway + 1, top + len - 1, -1);
        }
        continue;
      }
      const drop = (hh - 5 * k) * (0.78 + hash(sd, i) * 0.22);
      const curve = (t) => top + drop * (0.4 + 0.6 * Math.sin(Math.PI * t)) + Math.sin(t * 9 + i) * 0.8;
      for (let px = Math.ceil(a); px <= e; px++) {
        const t = (px - a) / (e - a), bot = curve(t);
        for (let py = Math.ceil(top); py <= bot; py++) {
          const d1 = (((px - py) % 4) + 4) % 4 === 0, d2 = (((px + py) % 4) + 4) % 4 === 0;
          if (d1 || d2 || py === Math.floor(bot)) { b.part(); b.dot(px, py, d1 && d2 ? m.woodD : m.net, 0.4 + ((px + py) & 1) * 0.02, { noLine: py !== Math.floor(bot), cast: 0 }); }
        }
        if ((px + i) % 5 === 0) b.tone(px, bot, -1);
      }
      for (let q = 0; q < 4; q++) { const fx = a + (e - a) * (q + 0.5) / 4; b.part(); b.ellipse(fx, top + 1.5, 2.2, 1.8, m.cork, 1, { round: 0.95 }); }
    }
    // the posts and the rail
    for (let i = 0; i < n; i++) { b.part(); b.capsule(x0 + i * span, -1, 1.8, x0 + i * span, -hh, 1.8, m.wood, 0.7, { round: 0.9, limb: false }); b.toneLine(x0 + i * span - 1, -hh + 2, x0 + i * span - 1, -3, 1); }
    beam(b, Math.round(x0 - 4), Math.round(-hh + 1), Math.round(span * (n - 1) + 8), 3, 1.2, m.woodL);
    b.toneLine(x0 - 4, -hh + 3, x0 + span * (n - 1) + 3, -hh + 3, -1);
    // an oar leant on the end post, a basket at its foot
    const ex = x0 + span * (n - 1) + 3;
    spar(b, ex + 10 * k, -1, ex - 1, -hh + 2, 1.1, 1.5, m.woodL);
    b.part(); b.poly([[ex + 8.4 * k, -4 * k], [ex + 10.6 * k, -4.4 * k], [ex + 11 * k, 0], [ex + 9 * k, 1]], m.woodL, 1.6, { round: 0.6 });
    const bx = x0 - 8 * k;
    b.part(); b.poly([[bx - 2.2 * k, -3.5 * k], [bx + 2.2 * k, -3.5 * k], [bx + 1.8 * k, 1], [bx - 1.8 * k, 1]], m.wicker, 1, { round: 0.8 });
    for (let i = 0; i < 3; i++) b.toneLine(bx - 2 * k, -2.6 * k + i * k, bx + 2 * k, -2.6 * k + i * k, -1);
    b.part(); b.ellipse(bx, -3.5 * k, 2.2 * k, 0.9 * k, m.hole, 1.1, { round: 0.3, noLine: true, cast: 0 });
  });
};

// ---- lobster pots ---------------------------------------------------------------------------------------------------
const creelPx = (b, x, gy, k, mt, mtD, z) => {
  const w = 3.6 * k, h = 3.8 * k, m = M();
  b.part(); b.rect(x - w, gy - 1.2 * k, w * 2, 1.2 * k, mtD, z, { n: [0, 0.2, 0.95] });
  b.part(); b.ellipse(x, gy - 1 * k - h * 0.5, w, h * 0.5 + 0.4 * k, mt, z + 0.1, { round: 0.95 });
  b.part(); b.poly([[x - w, gy - 1 * k], [x + w, gy - 1 * k], [x + w, gy - 1 * k - h * 0.5], [x - w, gy - 1 * k - h * 0.5]], mt, z + 0.1, { round: 0.95, noLine: true, cast: 0 });
  // withy hoops: bent rods arching over the pot, each a dark line with its lit side, and the woven
  // bands curving round the dome between them
  const top = (xx) => gy - 1 * k - (h * 0.5 + 0.4 * k) * Math.sqrt(Math.max(0, 1 - (xx * xx) / (w * w))) - h * 0.5;
  for (const u of [-0.6, -0.2, 0.2, 0.6]) { const xx = x + u * w; for (let yy = Math.ceil(top(u * w)) + 1; yy < gy - 1 * k; yy++) { b.tone(xx, yy, -1); b.tone(xx - 1, yy, 1); } }
  for (const f of [0.3, 0.62]) for (let xx = -w + 1; xx < w - 1; xx++) { const yy = Math.round(gy - 1 * k - (gy - 1 * k - top(xx)) * f); if ((xx + Math.round(f * 10)) % 2) b.tone(x + xx, yy, -1); }
  b.part(); b.ellipse(x, gy - h * 0.55 - 1, 0.9 * k, 0.8 * k, m.hole, z + 0.3, { round: 0.2, noLine: true, cast: 0 });
};
export const creelsPix = (ctx, x, y, s0, o) => {
  const m = M(), s = s0 * 1.35, gy = y + 8, v = o.v % 2, k = U * s;
  dapple(ctx, x + 4 * s, gy + 0.6, 12 * s, 2.2 * s, 0.28, o.seed);
  sculpt(ctx, x, gy, Math.ceil(32 * s * U) + 40, Math.ceil(20 * s * U) + 40, 12, (b) => {
    creelPx(b, -4 * k, 0, k, m.wicker, m.wickerD, 0.2);
    creelPx(b, 3.6 * k, 1 * k, k, mat(darken("#9a7448", 0.06)), m.wickerD, 0.3);
    creelPx(b, -0.3 * k + (v ? 2 : 0), -5 * k, k, mat(lighten("#9a7448", 0.05)), m.wickerD, 0.6);
    // the coil of rope
    const rx = (v ? -9 : 9) * k, ry = 0;
    for (let r = 2.6; r > 0.5; r -= 0.65) { b.part(); b.ellipse(rx, ry - 1, r * k, r * 0.5 * k, r > 1.6 ? m.rope : m.ropeD, 1 + (2.6 - r) * 0.1, { round: 0.3 }); }
    b.part(); b.ellipse(rx, ry - 1, 0.7 * k, 0.4 * k, m.hole, 1.4, { noLine: true, cast: 0 });
    // the buoy: a cork float, a stick and a red rag
    const bx = (v ? 8 : -9.5) * k;
    b.part(); b.ellipse(bx, -1.5 * k, 1.8 * k, 1.6 * k, m.cork2, 1, { round: 0.95 });
    b.part(); b.rect(bx, -9 * k, 1, 7.5 * k, m.woodD, 1.1, { n: [0, 0, 1], noLine: true, cast: 0 });
    b.part(); b.poly([[bx + 1, -9 * k], [bx + 3 * k, -8.2 * k], [bx + 1, -7 * k]], m.red, 1.2, { n: [0.1, 0, 1] });
    b.dot(bx + 1, -8.4 * k, m.buoy, 1.3, { noLine: true, cast: 0 });
  });
};

// ---- straw skeps ------------------------------------------------------------------------------------------------------
export const skepsPix = (ctx, x, y, s, o) => {
  const m = M(), gy = y + 8, n = o.v % 2 ? 2 : 3, k = U * s;
  dapple(ctx, x + 5 * s, gy + 0.6, 13 * s, 2.4 * s, 0.28, o.seed);
  sculpt(ctx, x, gy, Math.ceil(30 * s * U) + 40, Math.ceil(18 * s * U) + 40, 12, (b) => {
    for (const dx of [-8, 8]) beam(b, Math.round(dx * k - 1), -4 * k, 3, 4 * k, 0.2, m.woodD);
    b.part(); b.rect(-11 * k, -5 * k, 22 * k, 1.8 * k, m.woodL, 0.5, { n: [0, -0.5, 0.86] });
    b.toneLine(-11 * k, -3.4 * k, 11 * k, -3.4 * k, -1);
    for (let i = 0; i < n; i++) {
      const bx = (i - (n - 1) / 2) * 7 * k, by = -5 * k, w = 3.2 * k, h = 7 * k;
      const pts = [];
      for (let t = 0; t <= 1.0001; t += 1 / 14) pts.push([bx - w * Math.pow(1 - Math.pow(t, 2.4), 0.5), by - h * t]);
      for (let t = 1; t >= -0.0001; t -= 1 / 14) pts.push([bx + w * Math.pow(1 - Math.pow(Math.max(0, t), 2.4), 0.5), by - h * Math.max(0, t)]);
      b.part(); b.poly(pts, m.hay, 1 + i * 0.05, { round: 0.95 });
      for (let q = 1; q < 6; q++) { const yy = by - h * q / 6, ww = w * Math.pow(1 - Math.pow(q / 6, 2.4), 0.5); b.toneLine(bx - ww, yy, bx + ww - 1, yy, -1); b.toneLine(bx - ww + 1, yy - 1, bx + ww * 0.3, yy - 1, 1); }
      b.part(); b.rect(bx - 1.2 * k, by - 1.6 * k, 2.4 * k, 1.6 * k, m.hole, 1.3 + i * 0.05, { n: [0, 0, 1], noLine: true, cast: 0 });
      if (i === Math.floor((n - 1) / 2)) {                              // a hackle: a straw hood over the top against the rain
        b.part(); b.poly([[bx - w * 0.75, by - h * 0.62], [bx, by - h - 2.4 * k], [bx + w * 0.75, by - h * 0.62], [bx, by - h * 0.7]], m.hayD, 1.4 + i * 0.05, { n: [-0.3, -0.6, 0.75] });
        for (let q = -2; q <= 2; q++) b.toneLine(bx + q * 1.5, by - h * 0.66, bx + q * 0.4, by - h - 1.8 * k, q < 0 ? 1 : -1);
      } else { b.part(); b.ellipse(bx + 0.5, by - h + 0.5, 1.6, 1.1, m.mason, 1.4 + i * 0.05, { round: 0.95 }); }
      for (let q = 0; q < 3; q++) b.dot(bx - 3 + hash(i, q) * 7, by - 2.5 * k - hash(q, i) * 3 * k, q % 2 ? m.hole : m.gold, 1.5, { noLine: true, cast: 0 });
    }
  });
};

// ---- the hay wain ---------------------------------------------------------------------------------------------------------
export const haywainPix = (ctx, x, y, s, o) => {
  const m = M(), gy = y + 8, L = 13 * s * U, flip = o.v % 2 ? -1 : 1, k = U * s, sd = o.seed;
  dapple(ctx, x + 5 * s, gy + 0.2, 22 * s, 3 * s, 0.28, sd);
  // a cart wheel: an iron tyre on an oak felloe (a ring, so what lies behind shows between the spokes), ten
  // turned spokes, a fat nave with an iron band and the axle's linch-pin; the far pair a tone down
  const wheel = (b, wx, wy, r, z, far) => {
    const ry = r * 0.94, felloe = far ? m.woodD : m.woodL, tyre = m.iron, N = 30;
    const P = (a, f) => [wx + Math.cos(a) * r * f, wy + Math.sin(a) * ry * f];
    b.part();
    if (!far) for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.25, [ex, ey] = P(a, 0.86); b.capsule(wx, wy, 0.7, ex, ey, 0.5, m.woodL, z, { limb: false, round: 0.7, cast: 0 }); }
    b.part();
    for (let i = 0; i < N; i++) { const [ax, ay] = P(i * 2 * Math.PI / N, 0.9), [bx, by] = P((i + 1) * 2 * Math.PI / N, 0.9); b.capsule(ax, ay, 1.1, bx, by, 1.1, felloe, z + 0.1, { limb: false, round: 0.8 }); }
    b.part();
    for (let i = 0; i < N; i++) { const [ax, ay] = P(i * 2 * Math.PI / N, 1.02), [bx, by] = P((i + 1) * 2 * Math.PI / N, 1.02); b.capsule(ax, ay, 0.7, bx, by, 0.7, tyre, z + 0.15, { limb: false, round: 0.8 }); }
    b.part(); b.ellipse(wx, wy, 2.4, 2.3, far ? m.wood : m.woodL, z + 0.3, { round: 0.95 });
    b.part(); b.ellipse(wx, wy, 1.2, 1.2, tyre, z + 0.4, { round: 0.95, noLine: true, cast: 0 });
    if (!far) for (let i = 0; i < 5; i++) { const [lx, ly] = P(Math.PI * (1.05 + i * 0.09), 0.9); b.tone(lx, ly, 1); }
  };
  sculpt(ctx, x, gy, Math.ceil(L * 2 + 70 * k * 0.5) + 100, Math.ceil(30 * k) + 40, 12, (b) => {
    const wxL = -L + 4 * k, wxR = L - 4 * k;
    wheel(b, wxL + 0.6 * k, -6.2 * k, 4.6 * k, 0.1, true); wheel(b, wxR + 0.6 * k, -6.2 * k, 4.6 * k, 0.1, true);
    beam(b, -L + 3, -5 * k - 1, L * 2 - 6, 3, 0.4, m.woodD);                                         // the axle-tree
    spar(b, flip * (L - 2), -6 * k, flip * (L + 11 * k), -1, 1.3 * k * 0.8, 0.5, m.wood);        // the shaft
    // the bed's side: planks and staves
    b.part(); b.rect(-L, -10 * k, L * 2, 6 * k, m.wood, 0.6, { n: [0, 0, 1] });
    for (let i = 1; i < 3; i++) b.toneLine(-L, -10 * k + i * 2 * k, L - 1, -10 * k + i * 2 * k, -1);
    b.toneLine(-L, -10 * k + 1, L - 1, -10 * k + 1, 1);
    for (let u = -1; u <= 1.01; u += 0.25) beam(b, Math.round(u * L * 0.97 - 1), -13 * k, 3, 9 * k, 0.8, m.woodD);
    b.part(); b.rect(-L, -13 * k, L * 2, 2, m.woodL, 0.9, { n: [0, -0.4, 0.9] });
    // the load: a heaped mound of hay, combed strands, lit on top
    const P0 = [-L - 2, -9 * k], P1 = [-L - 4, -22 * k], P2 = [L + 4, -23 * k], P3 = [L + 2, -9 * k], pts = [];
    for (let t = 0; t <= 1.0001; t += 1 / 24) { const w = 1 - t; pts.push([w * w * w * P0[0] + 3 * w * w * t * P1[0] + 3 * w * t * t * P2[0] + t * t * t * P3[0], w * w * w * P0[1] + 3 * w * w * t * P1[1] + 3 * w * t * t * P2[1] + t * t * t * P3[1]]); }
    b.part(); b.poly(pts, m.hay, 1, { round: 0.85, ny: -0.3 });
    // stalks combed over the mound: each a short stroke along the slope where it lies, lit on the sun's
    // side of the heap and in shadow on the far; loose wisps standing out of the outline
    const bz = (t, i) => { const w = 1 - t; return w * w * w * P0[i] + 3 * w * w * t * P1[i] + 3 * w * t * t * P2[i] + t * t * t * P3[i]; };
    for (let i = 0; i < 110; i++) {
      const t = 0.04 + hash(sd, i) * 0.92, dn = hash(sd, i + 50), ox = bz(t, 0), oy = bz(t, 1);
      const hx = ox * (1 - dn * 0.75), hy = oy + (-9 * k - oy) * dn * 0.9;
      const tx = bz(Math.min(1, t + 0.04), 0) - ox, ty = bz(Math.min(1, t + 0.04), 1) - oy, ln = Math.hypot(tx, ty) || 1, len = 2 + hash(sd, i + 99) * 3;
      const lit = t < 0.55 && dn < 0.6;
      if (lit && hash(sd, i + 7) < 0.55) { b.part(); b.line(hx, hy, hx + (tx / ln) * len, hy + (ty / ln) * len, m.hayL, 1.05, { noLine: true, cast: 0 }); }
      else b.toneLine(hx, hy, hx + (tx / ln) * len, hy + (ty / ln) * len, lit ? 1 : -1);
    }
    for (let i = 0; i < 9; i++) { const t = 0.08 + i * 0.1, ox = bz(t, 0), oy = bz(t, 1); b.part(); b.line(ox, oy, ox + (t - 0.5) * 6, oy - 2 - hash(sd, i + 300) * 2, m.hayL, 1.06, { noLine: true, cast: 0 }); }
    // a rope thrown over the load, tied down to the bed's rail at both ends
    for (const u of [-0.35, 0.3]) {
      const t = 0.5 + u, ox = bz(t, 0), oy = bz(t, 1);
      b.part(); b.line(ox, oy, ox - u * 4, -10 * k, m.rope, 1.08, { cast: 0 });
      b.part(); b.line(ox + 1, oy, ox + 1 - u * 4, -10 * k, m.ropeD, 1.07, { noLine: true, cast: 0 });
    }
    for (let i = 0; i < 7; i++) { b.part(); b.rect(-L + 2 + i * L / 3.4, -10 * k, 1, 2 + hash(sd, i) * 3, m.hayD, 1.1, { n: [0, 0, 1], noLine: true, cast: 0 }); }
    // the fork stuck in the hay
    const fx = -flip * L * 0.4;
    spar(b, fx, -18.5 * k, fx + flip * 1, -25 * k, 0.9, 1.5, m.woodL);
    for (const dx of [-2, 0, 2]) b.dot(fx + dx, -18 * k + 1, m.iron, 1.6, { noLine: true, cast: 0 });
    b.part(); b.rect(fx - 2, -18.5 * k, 5, 1, m.iron, 1.6, { n: [0, 0, 1], noLine: true, cast: 0 });
    wheel(b, wxL, -4.6 * k, 5.2 * k, 2, false); wheel(b, wxR, -4.6 * k, 5.2 * k, 2, false);
  });
};

// ---- marram on its hummock; a thistle clump (flat, underlined) ----------------------------------------
const MARRAM = ["#5a7a5c", "#7e9c78", "#a4bc90", "#c8d4a8"], THISTLE = ["#3e5a46", "#5a7a5e", "#7a9a76", "#a4bc96"];
let MM_ = null;
const MG = () => MM_ || (MM_ = { mar: MARRAM.map((c) => mat(c, { contrast: 1.1 })), thl: THISTLE.map((c) => mat(c, { contrast: 1.1 })),
  sand: mat("#e2cf98", { contrast: 0.9 }), straw: mat("#d8c48a"), pur: mat("#9a4a9a", { contrast: 1.1 }), purL: mat("#d080c8", { contrast: 0.9 }) });
const blade = (b, bx, by, lean, len, r, mt, z) => {                // a tapering curved blade: two capsules, bent over at the tip
  const mx = bx + lean * len * 0.5, my = by - len * 0.55, tx = bx + lean * len * 1.15, ty = by - len + len * 0.12;
  b.part(); b.capsule(bx, by, r, mx, my, r * 0.7, mt, z, { round: 0.8, limb: false, cast: 0 });
  b.capsule(mx, my, r * 0.7, tx, ty, 0.25, mt, z, { round: 0.8, limb: false, cast: 0 });
};
export const marramPix = (ctx, x, y, s, o) => {
  const g = MG(), gy = y + 8, v = o.v % 3, sd = o.seed, w = (7 + v * 1.5) * s * U, k = U * s;
  sculpt(ctx, x, gy, Math.ceil(w * 2) + 60, Math.ceil(30 * k) + 40, 12, (b) => {
    const pts = [[-w, 0]]; for (let i = 0; i <= 16; i++) { const u = -1 + i / 8; pts.push([u * w, -4 * k * (1 - Math.pow(Math.abs(u), 2.2)) * (u < 0 ? 1 : 0.8)]); } pts.push([w, 0]);
    b.part(); b.poly(pts, g.sand, 0, { round: 0.9, ny: -0.2 });
    for (let i = 0; i < 4; i++) b.toneLine(-w * 0.6 + hash(sd, i) * w * 1.2, -1 - hash(sd, i + 9) * 4, -w * 0.6 + hash(sd, i) * w * 1.2 + 3, -1 - hash(sd, i + 9) * 4, -1);
    b.toneLine(-w * 0.8, -1, w * 0.8, -1, -1);
    const n = 16 + v * 4;
    for (let i = 0; i < n; i++) {
      const back = i < n * 0.45, u = (hash(sd, i + 20) - 0.5) * 1.5, bx = u * w * 0.75, by = -3 * k + (1 - Math.abs(u)) * -2 * k;
      const len = (7 + hash(sd, i + 40) * 7 + (1 - Math.abs(u)) * 4) * k * (back ? 0.92 : 1), lean = u * 0.35 + 0.28 + (hash(sd, i + 60) - 0.5) * 0.3;
      blade(b, bx, by, lean, len, 1.35, g.mar[back ? (hash(sd, i + 80) < 0.5 ? 0 : 1) : 1 + Math.floor(hash(sd, i + 80) * 3)], back ? 0.2 : 0.4 + i * 0.001);
    }
    for (let i = 0; i < 2; i++) { const bx = (hash(sd, i + 90) - 0.5) * w * 0.6; b.part(); b.capsule(bx, -3 * k, 0.5, bx + 3, -3 * k - 13 * k * 0.8, 0.5, g.mar[1], 0.5, { limb: false }); b.capsule(bx + 3, -3 * k - 10 * k, 1, bx + 3.6, -3 * k - 13 * k, 0.8, g.straw, 0.6, { limb: false, cast: 0 }); }
  });
};
export const thistlePix = (ctx, x, y, s0, o) => {
  const g = MG(), s = s0 * 1.5, gy = y + 8, v = o.v % 3, sd = o.seed, n = 3 + v, k = U * s;
  dapple(ctx, x + 1.5, gy + 0.5, 6 * s, 1.4 * s, 0.24, sd);
  sculpt(ctx, x, gy, Math.ceil(24 * k) + 40, Math.ceil(24 * k) + 40, 10, (b) => {
    for (let i = 0; i < 6; i++) {                                    // the rosette of spiny leaves
      const a = Math.PI + (i / 5) * Math.PI + (hash(sd, i + 30) - 0.5) * 0.3, len = (4 + hash(sd, i + 40) * 2.5) * k;
      b.part(); b.capsule(0, -1, 1.1, Math.cos(a) * len, -1 + Math.sin(a) * len * 0.45, 0.3, g.thl[i % 2 ? 2 : 1], 0.3, { round: 0.8, limb: false, cast: 0 });
    }
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1 || 1) - 0.5) * 1.6 + (hash(sd, i) - 0.5) * 0.4, h = (9 + hash(sd, i + 10) * 6 - Math.abs(u) * 2) * k, lean = u * 0.25;
      const bx = u * 2.2 * k, tx = bx + lean * h, ty = -h;
      b.part(); b.capsule(bx, -1, 0.8, tx, ty, 0.6, g.thl[1], 0.5, { round: 0.8, limb: false });
      const ls = i % 2 ? 1 : -1; b.capsule(bx + lean * h * 0.45, -h * 0.45, 0.6, bx + lean * h * 0.45 + ls * 3 * k, -h * 0.45 - 2, 0.2, g.thl[2], 0.6, { limb: false, cast: 0 });
      b.part(); b.ellipse(tx, ty + 1, 2, 1.8, g.thl[0], 0.7, { round: 0.95 });
      b.part(); b.ellipse(tx, ty - 1.5, 2.3, 2, g.pur, 0.8, { round: 0.95 });
      b.dot(tx - 1, ty - 2.5, g.purL, 0.9, { wrap: true });
    }
  });
};
