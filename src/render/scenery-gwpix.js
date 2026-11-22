// ============ RENDER: GREENWOOD / VALE PROPS IN THE NEW STYLE ============
// Boulders, toadstools and dead trees sculpted with the pixel sculptor
// (src/render/pix/pix.js) like the Iron `ircrag`: one sun from the upper left,
// a one-pixel line tinted from the stone, lit facets, a dark right face,
// moss in the crevices. Footprints are the old pieces' own. Everything is baked once into
// the decor sprite (scenery.js `decorSprite`).
import { RES } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { hash, mix, lighten, rgba } from "./paint.js";
import { Pix, mat, flat, toCanvas } from "./pix/pix.js";
import { DAY, onDay } from "../data/sun.js";

// ---- the time of day (data/sun.js; art/briefs/time-of-day.md, the scenery row) ----
// Under an EASTERN sun most scenery is drawn MIRRORED about its anchor (scenery.js drawTree), so its
// painted lit side and ground shadow land on the right. A pix sculpt inside such a piece must then be
// baked with the light on its LEFT (the west twin of the level's sun), or the mirror would undo it:
// `mirrorBake(true)` while baking a piece that will be mirrored; every resolve in the scenery files passes
// `sun: decorSun()`. At noon both return nothing (pixel-identical to before).
let MIR = false;
export const mirrorBake = (on) => { const was = MIR; MIR = !!on; return was; };
export const decorSun = () => (DAY.on && MIR ? [-Math.abs(DAY.L[0]), DAY.L[1], DAY.L[2]] : undefined);
// a cache key for anything sculpted: "" at noon, else the sun and the mirror
export const sunKey = () => (DAY.on ? `|${DAY.id}${MIR ? "m" : ""}` : "");
// pieces NEVER mirrored: a wheel in a mill race, boats, quays and moorings against the water, gates on
// the road, writing (milestones, runes, the toll board). They keep their own lit side (the sculptor lights
// pix ones from the real sun) and only their cast shadow follows the hour.
export const NO_MIRROR = new Set(["watermill", "boat", "irquay", "irmoor", "irsluice", "irwreck", "irboat", "irgate", "irmile", "irtoll",
  "irstack", "rmlongship", "rmboat", "rmgate", "rmrunestone", "rmskaldstone", "rmice"]);
// a long cast shadow is laid (sceneryday.js): the pieces' own short painted ground shadows stand down
// (otherwise the roots read doubly dark). Read at bake time.
export const longShade = () => DAY.on && DAY.len > 0;
export const mirrorsFor = (t) => DAY.on && DAY.side > 0 && !NO_MIRROR.has(t);

const h3 = (a, b, c) => hash(a * 31 + c * 7, b);
const R = RES;

// a dappled cast shadow, whole art pixels, to the lower right
export const pixShade = (ctx, x, gy, cx, cy, rx, ry, a, seed = 1) => {
  if (longShade()) return;
  const q = 1 / R;
  ctx.fillStyle = rgba("#2a1c2c", a);
  for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
    const u = (i + 0.5 - cx) / rx, v = (j + 0.5 - cy) / ry;
    if (u * u + v * v > 1) continue;
    if (h3(i, j, seed) > 0.88 && Math.hypot(u, v) > 0.4) continue;
    ctx.fillRect(x + i * q, gy + j * q, q, q);
  }
};
export const stamp = (ctx, obj, x, gy) => {
  const img = obj.resolve({ line: "tint", sun: decorSun() }), cv = toCanvas(img), q = 1 / R;
  ctx.drawImage(cv, x - img.ox * q, gy - img.oy * q, img.w * q, img.h * q);
};
const sculpt = (w, h, build, ctx, x, gy) => {
  const obj = new Pix(w, h, w >> 1, h - 8);
  build(obj);
  stamp(ctx, obj, x, gy);
};
export { sculpt };

// ---- rocks ------------------------------------------------------------------
// one faceted stone: lit top and left, dark right face, an arris, a crack,
// moss (or snow) settled on the top facets, and in the crevices
const stone = (obj, x, w, h, seed, M, cap, o, y = 0) => {
  const J = (i) => h3(i, seed, 5) - 0.5;
  const pk = [[x - w * 0.5, y], [x - w * 0.44, y - h * 0.5 + J(1) * 2], [x - w * 0.14, y - h + J(2) * 1.5], [x + w * 0.22, y - h * 0.88 + J(3) * 1.5], [x + w * 0.5, y - h * 0.36 + J(4) * 1.5], [x + w * 0.5, y]];
  const tp = pk[2], rd = [tp[0] + w * 0.12, tp[1] + h * 0.45];
  obj.part(); obj.poly([pk[0], pk[1], tp, rd, [x + w * 0.02, y]], M, 0, { n: [-0.38, 0.02, 0.8] });
  obj.part(); obj.poly([tp, pk[3], pk[4], pk[5], [x + w * 0.02, y], rd], M, 0.2, { n: [0.34, 0.08, 0.78], bias: -1 });
  obj.part(); obj.poly([tp, pk[3], [pk[3][0] + w * 0.12, pk[3][1] + h * 0.2], rd], M, 0.4, { n: [-0.12, -0.5, 0.8], bias: 1 });
  obj.part(); obj.line(rd[0], rd[1], x + w * 0.02, y - 1, M, 0.6, { bias: -1, noLine: true });
  if (cap && o.snow) {
    obj.part(); obj.poly([[tp[0] - w * 0.2, tp[1] + h * 0.18], tp, pk[3], [tp[0] + w * 0.46, tp[1] + h * 0.3], [tp[0] + w * 0.1, tp[1] + h * 0.32]], cap, 0.9, { round: 0.7, bias: 1, noLine: true });
  } else if (cap) {
    obj.part(); obj.ellipse(x - w * 0.22, y - h * 0.07, w * 0.17, h * 0.07 + 0.6, cap, 0.8, { round: 0.6 });
    obj.part(); obj.ellipse(x + w * 0.3, y - h * 0.03, w * 0.13, h * 0.05 + 0.5, cap, 0.8, { round: 0.6 });
  }
  // weathering (2026-11-22 upgrade): a crack down the lit face, moss settled on the crown, lichen crusts
  if (!o.snow && !o.gloss && h > 7) {
    const k0 = [tp[0] - w * 0.06 + J(7) * 2, tp[1] + h * 0.16], k1 = [x - w * 0.2 + J(8) * 2, y - h * 0.42], k2 = [x - w * 0.26 + J(9) * 2, y - h * 0.12];
    obj.toneLine(k0[0], k0[1], k1[0], k1[1], -1.2); obj.toneLine(k1[0], k1[1], k2[0], k2[1], -1.2);
    obj.toneLine(k0[0] - 1, k0[1], k1[0] - 1, k1[1], 0.7);
    if (cap) { obj.part(); obj.ellipse(tp[0] + w * 0.1, tp[1] + h * 0.17, w * 0.2, h * 0.1 + 0.6, cap, 0.85, { round: 0.7, ny: -0.4 }); }
  }
  if (o.lichen && h > 7) {
    obj.ellipse(x - w * 0.18, y - h * 0.5, 1.4, 1, o.lichen, 0.9, { round: 0.5, noLine: true });
    obj.ellipse(x - w * 0.36 + J(10), y - h * 0.26, 1, 0.8, o.lichen, 0.9, { round: 0.5, noLine: true });
    if (h > 12) obj.ellipse(x + w * 0.22, y - h * 0.62, 1.1, 0.8, o.lichen, 0.9, { round: 0.5, noLine: true });
  }
  if (o.gloss) { obj.part(); obj.line(x - w * 0.34, y - h * 0.42, x - w * 0.2, y - h * 0.8, o.gloss, 0.95, { noLine: true }); }
};

// the old boulder()'s four kinds (a shouldered boulder with a stone at its foot,
// a low slab, a tall split stone, a knot of three), same footprint
export const pixRock = (ctx, x, y, s, base, cap, seed, v = 0, o = {}) => {
  const gy = y + 8;
  const w = (9 + hash(seed, 1) * 2) * s * 2 * R;          // full width in art px
  const M = mat(base, { contrast: o.gloss ? 0.9 : 0.5 });
  const CAPM = cap ? mat(cap, { contrast: 0.5 }) : null;
  const LICH = o.lichen ? mat(o.lichen) : null;
  const GL = o.gloss ? mat("#8a7aa8") : null;
  const op = { snow: o.snow, lichen: LICH, gloss: GL };
  const S = s * R;
  let parts;
  if (v === 1) parts = [[0, w * 1.15, 8 * S]];
  else if (v === 3) parts = [[-w * 0.45, w * 0.62 * 0.9, 10 * S], [w * 0.5, w * 0.55 * 0.9, 8 * S], [-w * 0.02, w * 0.46 * 0.9, 5.5 * S, 3 * R]];
  else if (v === 2) parts = [[-w * 0.12, w * 0.7, 17 * S], [w * 0.62, w * 0.42, 7 * S]];
  else parts = [[0, w, 12 * S], [w * 0.95, w * 0.4, 5 * S]];
  pixShade(ctx, x, gy, w * 0.12 / R + 2, 1, w / R * 0.62, 3.4 * s, o.snow ? 0.26 : 0.32, seed);
  sculpt(Math.ceil(w * 2.6) + 12, Math.ceil(Math.max(...parts.map((p) => p[2])) * 1.2) + 20, (obj) => {
    // back to front: the lower the stone's foot, the later it is laid
    parts.map((p, i) => [p, i]).sort((a, b) => (a[0][3] || 0) - (b[0][3] || 0)).forEach(([p, i]) => {
      const [dx, pw, ph, dy = 0] = p;
      stone(obj, dx, pw, ph, seed + i * 3, M, CAPM, op, dy);
    });
  }, ctx, x, gy);
};

// ---- toadstools -------------------------------------------------------------
const CAP = "#9a56c0";
const dome = (obj, cx, cy, rx, ry, m, z, o) => {
  const pts = [];
  for (let i = 0; i <= 14; i++) { const a = Math.PI + (i / 14) * Math.PI; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  obj.poly(pts, m, z, o);
};
export const pixMushroom = (ctx, x, y, s, seed = 1) => {
  const gy = y + 9, sc = s * R;
  const STEM = mat("#e0d6bc", { contrast: 0.7 }), GILL = mat(mix(CAP, "#1c1020", 0.55)), SPOT = flat("#eedaf6", { line: "#b886d0" });
  const caps = [[-7, 3, 3.5, mix(CAP, "#4a2060", 0.12), -0.3], [0, 8, 9, CAP, 0.4], [7, 3.8, 4.5, lighten(CAP, 0.05), 0.2]];
  pixShade(ctx, x, gy, 4 * s * R, 0.5, 9 * s * R, 2.2 * s * R, 0.28, seed);
  sculpt(Math.ceil(46 * sc) + 12, Math.ceil(26 * sc) + 14, (obj) => {
    // back to front: the tall one behind
    [caps[1], caps[0], caps[2]].forEach(([dx, r, h, col, lean], i) => {
      const cxp = dx * sc, rp = r * sc * 0.9, hp = h * sc * 0.95, gyp = i === 0 ? -0.5 * sc : i === 1 ? 0.5 * sc : 1 * sc, CM = mat(col, { contrast: 0.8 });
      obj.part(); obj.capsule(cxp + lean * 0.5 * sc, gyp - hp, rp * 0.3, cxp, gyp, rp * 0.4, STEM, 0 + i * 0.1, { round: 0.9 });
      obj.part(); obj.ellipse(cxp, gyp - hp + 0.5, rp, Math.max(1, rp * 0.3), GILL, 1 + i * 0.1, { round: 0.6 });
      obj.part(); dome(obj, cxp, gyp - hp, rp, rp * 0.78, CM, 2 + i * 0.1, { round: 0.95, ny: -0.1 });
    });
  }, ctx, x, gy);
  // the white spots on the big cap: whole art pixels laid over the stamp (a spot inside the sculpt took a shadow and read as an eye)
  const q = 1 / R, hp = 9 * sc * 0.95, gyp = 0.5 * sc;
  ctx.fillStyle = "#eedaf6";
  for (const [sx, sy, rr] of [[-4, -4.4, 1.5], [1.5, -5.6, 1.4], [4.2, -3.4, 1.1], [-0.5, -2.4, 1]]) {
    const px = Math.round((0 + sx * sc * 0.9) / 1), py = Math.round(gyp - hp + sy * sc * 0.75);
    ctx.fillRect(x + px * q, gy + py * q, (rr > 1.2 ? 2 : 1) * q, q);
  }
};

// ---- the dead tree ----------------------------------------------------------
export const pixDeadTree = (ctx, x, y, s, seed = 1, burnt = false) => {
  const H = (i) => hash(seed, i), base = y + 10, sc = s * R;
  const col = burnt ? "#3e3432" : "#6e5a4a";
  const B = mat(col, { contrast: 0.8 }), BD = mat(col, { contrast: 1.3 });
  const lean = (H(1) - 0.5) * 5 * sc, tall = (30 + H(2) * 8) * sc;
  const tp = (k) => [lean * k * k + Math.sin(k * 5 + seed) * 1.2 * sc, -tall * k];
  pixShade(ctx, x, base, 4 * s * R, 0.5, 11 * s * R, 2.4 * s * R, 0.3, seed);
  sculpt(Math.ceil(56 * sc) + 12, Math.ceil(tall + 28 * sc) + 14, (obj) => {
    // root flare
    obj.part(); obj.capsule(-1, -3 * sc, 1.6 * sc, -5 * sc, 0.4, 0.6 * sc, B, 0, { round: 0.9 });
    obj.part(); obj.capsule(1, -3 * sc, 1.5 * sc, 5.5 * sc, 0.4, 0.6 * sc, BD, 0, { round: 0.9 });
    // limbs behind the trunk
    const nL = 3 + Math.floor(H(3) * 2);
    for (let i = 0; i < nL; i++) {
      const k = 0.42 + (i / nL) * 0.5 + (H(i + 10) - 0.5) * 0.08, side = i % 2 ? 1 : -1, [sx, sy] = tp(k);
      const len = (9 + H(i + 20) * 7) * sc * (1.1 - k * 0.4), rise = (5 + H(i + 30) * 7) * sc;
      const ex = sx + side * len, ey = sy - rise, mx = sx + side * len * 0.5, my = sy - rise * 0.25 + (H(i + 40) - 0.5) * 3 * sc;
      obj.part(); obj.capsule(sx, sy, 1.15 * sc, mx, my, 0.8 * sc, i % 2 ? BD : B, 1, { round: 0.9 });
      obj.part(); obj.capsule(mx, my, 0.8 * sc, ex, ey, 0.35 * sc, i % 2 ? BD : B, 1, { round: 0.9 });
      const tx = mx + side * len * 0.2, ty = my - rise * 0.9;
      obj.part(); obj.capsule(mx, my, 0.55 * sc, tx, ty, 0.25 * sc, B, 1.1, { round: 0.9 });
      obj.part(); obj.capsule(ex, ey, 0.4 * sc, ex + side * 2.5 * sc, ey - 3.5 * sc, 0.2 * sc, B, 1.1, { round: 0.9 });
    }
    // the trunk: a column of capsules so it tapers and bends
    for (let t = 0; t < 8; t++) {
      const [ax, ay] = tp(t / 8), [bx, by] = tp((t + 1) / 8), r0 = (2.8 - 1.6 * (t / 8)) * sc, r1 = (2.8 - 1.6 * ((t + 1) / 8)) * sc;
      obj.part(); obj.capsule(ax, ay, r0, bx, by, r1, B, 2, { round: 0.95 });
    }
    // bark seams on the shaded side and the snapped top
    for (let i = 0; i < 4; i++) {
      const [bx, by] = tp(0.12 + H(i + 60) * 0.7);
      obj.part(); obj.line(bx + 0.8 * sc, by, bx + 0.8 * sc + (H(i + 70) - 0.5), by - 2 - H(i + 80) * 3, BD, 2.6, { noLine: true });
    }
    const [kx, ky] = tp(1);
    obj.part(); obj.capsule(kx, ky, 1.2 * sc, kx + 0.5, ky - 1.5 * sc, 0.5 * sc, mat(burnt ? "#6a5a52" : "#c8b08a", { contrast: 0.6 }), 2.2, { round: 0.8 });
  }, ctx, x, base);
};


// The new style's outline for a baked decor piece: ONE art pixel, tinted from
// the piece's own edge colour (mixed toward ink), lighter on the edges the sun
// reaches (upper left).
// solidA: the alpha a pixel needs to count as the piece (200 for trees: their painted root shadow pools,
// ~150, then take no ring)
export const tintRing = (cv, solidA = 110) => {
  const c = cv.getContext("2d");
  const w = cv.width, h = cv.height;
  const img = c.getImageData(0, 0, w, h), d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > solidA ? 1 : 0;
  const out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (solid[i]) continue;
    let r = 0, g = 0, b = 0, n = 0, lit = 0;
    const take = (j, isLit) => { if (!solid[j]) return; r += d[j * 4]; g += d[j * 4 + 1]; b += d[j * 4 + 2]; n++; if (isLit) lit++; };
    if (x > 0) take(i - 1, false);               // neighbour to the left: this pixel is on its right (shaded) edge
    if (x < w - 1) take(i + 1, true);            // neighbour to the right: a left edge, in the sun
    if (y > 0) take(i - w, false);
    if (y < h - 1) take(i + w, true);
    if (!n) continue;
    const m = lit * 2 >= n ? 0.42 : 0.58;
    out.push(i, Math.round(r / n * (1 - m) + 36 * m), Math.round(g / n * (1 - m) + 26 * m), Math.round(b / n * (1 - m) + 38 * m));
  }
  for (let k = 0; k < out.length; k += 4) { const i = out[k]; d[i * 4] = out[k + 1]; d[i * 4 + 1] = out[k + 2]; d[i * 4 + 2] = out[k + 3]; d[i * 4 + 3] = 240; }
  c.putImageData(img, 0, 0);
  return cv;
};

// ---- a part() that inks with the tinted one-pixel line ---------------------------
// paint.js `part` inks each piece of a baking sprite with the near-black INK_LINE;
// the Vale's pieces use this while a decor / body
// bake is running (`baking(true)`), so a piece's inner lines join the new style.
let BAKING = false;
export const baking = (on) => { const was = BAKING; BAKING = on; return was; };
export const tintedPart = (plain) => (ctx, fn, o = {}) => {
  if (!BAKING) { plain(ctx, fn, o); return; }
  const src = ctx.canvas;
  const layer = document.createElement("canvas");
  layer.width = src.width; layer.height = src.height;
  const c = layer.getContext("2d", { willReadFrequently: true });
  c.imageSmoothingEnabled = false;
  c.setTransform(ctx.getTransform());
  fn(c);
  tintRing(layer);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layer, 0, 0); ctx.restore();
};

// ---- the Gullwick watchtower's stone (the window glow and the flag stay live) -----
const TOWERS = new Map();
onDay(() => TOWERS.clear());
export const pixTowerBody = (ctx, x, y, s, stone) => {
  const k = `${s}|${stone}${sunKey()}`;
  let t = TOWERS.get(k);
  if (!t) {
    const w = 7 * s * R, hgt = 27 * s * R;
    const M = mat(stone, { contrast: 0.7 });
    const obj = new Pix(Math.ceil(w * 2 + 28), Math.ceil(hgt + 40 * R), Math.ceil(w + 14), Math.ceil(hgt + 40 * R) - 4);
    const side = Math.max(3, Math.round(w * 0.3));
    // front face (lit), side face (dark)
    obj.part(); obj.poly([[-w, 0], [w - side, 0], [w - side, -hgt], [-w, -hgt]], M, 0, { n: [-0.18, 0.04, 0.9] });
    obj.part(); obj.poly([[w - side, 0], [w, -1], [w, -hgt - 1], [w - side, -hgt]], M, 0.2, { n: [0.55, 0.05, 0.7] });
    // courses and joints: stone by stone, the joints staggered
    const ch = 4 * R * 0.9;
    for (let r = 0, yy = -ch; yy > -hgt + 2; yy -= ch, r++) {
      obj.toneLine(-w + 1, yy, w - side - 1, yy, -0.6);
      for (let xx = -w + 3 + (r & 1) * 4; xx < w - side - 1; xx += 8) obj.toneLine(xx, yy, xx, yy + ch - 1, -0.6);
    }
    // battlement: three merlons, a ledge under them
    obj.part(); obj.rect(-w - 1, -hgt - 3, 2 * w - side + 3, 4, M, 1, { n: [-0.1, -0.4, 0.9] });
    const mw = Math.round((2 * w - side) / 5);
    for (let i = 0; i < 3; i++) { obj.part(); obj.rect(-w - 1 + i * mw * 2, -hgt - 3 - 5 * R * 0.7, mw + 1, 5 * R * 0.7, M, 1.2, { n: [-0.15, -0.3, 0.9] }); }
    obj.part(); obj.poly([[w - side + 0, -hgt - 3], [w, -hgt - 4], [w, -hgt - 3 - 5 * R * 0.7], [w - side + 0, -hgt - 3 - 5 * R * 0.7]], M, 1.2, { n: [0.55, 0.05, 0.7] });
    // the door, low on the front
    obj.part(); obj.rect(-3, -9, 7, 9, mat("#4a3622"), 1, { n: [0, 0, 1] });
    const img = obj.resolve({ line: "tint", sun: decorSun() });
    t = { cv: toCanvas(img), ox: img.ox, oy: img.oy, w: img.w, h: img.h };
    TOWERS.set(k, t);
  }
  const q = 1 / R, gy = y + 15;
  ctx.drawImage(t.cv, x - t.ox * q, gy - t.oy * q, t.w * q, t.h * q);
  return gy;
};
