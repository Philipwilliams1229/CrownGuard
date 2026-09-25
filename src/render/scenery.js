// ============ RENDER: SCENERY ============
// Everything that stands on the ground and isn't a tower or a soldier: the
// trees and stones of each realm (and the fen's graves, the Marches' tents),
// still water, running water and the bridges over it, the castle, and the
// gate the enemy comes in by.
//
// All of it is drawn with the paint kit: lit, rounded, outline-free forms
// with soft shadows falling away from one sun. Nothing here is a rectangle
// unless a carpenter made it.

import { W, H, RES, PATH_HALF, WALL_W } from "../data/constants.js";
import { PTS, TOTAL_LEN, posAt, angleAt, nearestOnPath } from "../engine/path.js";
import { FOREST, DECOR, forestDepthAt } from "../data/terrain.js";
import { REALM } from "../data/maps.js";
import { workTier, bowmenSpots, masonSpots } from "../data/castle.js";
import { drawArcher, drawHalberdier, drawMason, WALL_FOLK } from "./folk.js";
import { ballista } from "./halls/archer.js";
import { drawCastle, drawCastleWorks, resetWorksBakes, resetCastleBakes } from "./castle.js";
import {
  lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone,
  blade, tuft, stone, strokePts, blobPath, blobBall, masonry, hash, ellipse, SUN, lin, rad, bakeSprite, inkOutline, PIXEL, PX, part } from "./paint.js";

// ---- palettes ---------------------------------------------------------
const OAK = { leaf: "#5e9f45", trunk: "#7a5334" };
const PINE = { leaf: "#4a8c4d", trunk: "#6a4a30" };
const SNOWPINE = { leaf: "#3f6f5a", trunk: "#5a4634" };
const STONE = "#9a9284";
const CASTLE_STONE = "#a19a8a";
const ROOF = "#a8505c";
// lone oaks: spring, summer, deep, olive
const OAK_TINTS = ["#6cad48", "#5e9f45", "#4f9044", "#6a9a3e"];
const PINE_TINTS = ["#4a8c4d", "#437f4a", "#52905a", "#3f7a4c"];
// the wood, by how deep in it a tree stands: the treeline takes the sun, the
// rows behind it cool and darken
const WOOD_OAK = [["#62a346", "#6aa848", "#579a45"], ["#4f8c44", "#548f47", "#4a8649"], ["#3e7547", "#3a6e4a", "#43784a"]];
const WOOD_PINE = [["#468a4d", "#4b8e4f", "#418450"], ["#3d7a4c", "#3a744d", "#40794a"], ["#33664a", "#30604b", "#35694c"]];

// While a decor sprite bakes, leaf clumps get their own underline — in a
// deep leaf green rather than the black ink, so a wood full of clumps reads
// as foliage and not as a net of lines. Outside a bake it simply paints.
let BAKE_CV = null;
const INK = "#241a26";
// `box` = [x0, y0, x1, y1] in world units bounds what fn paints, so the
// scratch layer (and the ink pass over it) is only as big as the clump.
const leafPart = (ctx, fn, ink, box = null, only = "under") => {
  if (!BAKE_CV || !PIXEL) { fn(ctx); return; }
  const m = ctx.getTransform();
  let px0 = 0, py0 = 0, pw = BAKE_CV.width, ph = BAKE_CV.height;
  if (box) {
    px0 = Math.max(0, Math.floor(m.a * box[0] + m.e) - 2); py0 = Math.max(0, Math.floor(m.d * box[1] + m.f) - 2);
    pw = Math.min(BAKE_CV.width, Math.ceil(m.a * box[2] + m.e) + 3) - px0; ph = Math.min(BAKE_CV.height, Math.ceil(m.d * box[3] + m.f) + 3) - py0;
    if (pw <= 0 || ph <= 0) return;
  }
  const layer = document.createElement("canvas");
  layer.width = pw; layer.height = ph;
  const c = layer.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.setTransform(m.a, m.b, m.c, m.d, m.e - px0, m.f - py0);
  fn(c);
  inkOutline(layer, ink, 1, only);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layer, px0, py0); ctx.restore();
};

// snap a length to the art grid, so tiny marks land on whole pixels
const ap = (v) => Math.round(v * PX) / PX;

// ---- trees ------------------------------------------------------------

// One clump of leaves. Filled dark, then the lit body slid up toward the sun
// over it — so the shade is a crescent that follows the clump's own lumpy
// edge rather than a ring — a sunlit cap on the top, and leaf flecks. Small
// bumps along the rim keep the edge leafy instead of a clean ball.
const leafClump = (c, x, y, r, leaf, seed, lit) => {
  const b = lit > 0.62 ? lighten(leaf, 0.08) : lit > 0.3 ? leaf : darken(leaf, 0.16);
  const dk = darken(b, 0.34), lt = lighten(b, 0.22), fl = lighten(b, 0.4);
  const ry = r * 0.84;
  const bumps = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.75 + i * 0.3) + (hash(seed, i + 70) - 0.5) * 0.35;
    bumps.push([Math.cos(a) * r * 0.9, Math.sin(a) * ry * 0.9, r * (0.2 + hash(seed, i + 80) * 0.1)]);
  }
  const shape = (ox, oy, k) => {
    blobPath(c, x + ox, y + oy, r * k, ry * k, seed, 0.2, 9);
    for (const [bx, by, br] of bumps) {
      const px = x + ox + bx * k, py = y + oy + by * k;
      c.moveTo(px + br * k, py);
      c.ellipse(px, py, br * k, br * 0.85 * k, 0, 0, Math.PI * 2);
    }
  };
  shape(0, 0, 1); c.fillStyle = dk; c.fill();
  c.save();
  shape(0, 0, 1); c.clip();
  shape(-r * 0.16, -r * 0.24, 1); c.fillStyle = b; c.fill();
  if (lit > 0.3) { shape(-r * 0.36, -r * 0.5, 0.78); c.fillStyle = lt; c.fill(); }
  // leaf flecks: pale ticks where the sun lands, dark notches in the body
  for (let i = 0; i < 7; i++) {
    const a = hash(seed, i + 90) * Math.PI * 2, d = Math.sqrt(hash(seed, i + 100)) * r * 0.8;
    const fx = ap(x + Math.cos(a) * d), fy = ap(y + Math.sin(a) * d * 0.84);
    const sunny = Math.cos(a) * SUN.x + Math.sin(a) * SUN.y > 0.15;
    c.fillStyle = sunny ? (lit > 0.3 ? fl : lt) : dk;
    c.fillRect(fx, fy, 1, 0.5);
    c.fillRect(fx + (sunny ? 0 : 0.5), fy + 0.5, 0.5, 0.5);
  }
  c.restore();
};

// A broadleaf: a flared trunk and a crown of clumped leaf masses — the dark
// under-crown showing through between them, upper clumps overhanging (and
// shading) the lower ones, light catching the upper-left. `seed` picks the
// shape, so no two variants share a silhouette.
const oakTree = (ctx, x, y, s, leaf, trunk, seed) => {
  const H = (i) => hash(seed, i);
  const base = y + 10;
  // the crown's shade thrown down-right, and a firmer pool at the roots
  shadow(ctx, x + 8 * s, base - 1, 17 * s, 5.5 * s, 0.24);
  shadow(ctx, x + 2 * s, base, 8 * s, 2.4 * s, 0.3);
  const R = (16 + H(1) * 3.5) * s, Ry = R * (0.84 + H(2) * 0.1);
  const cx = x + (H(3) - 0.5) * 3 * s, cy = y - 3 * s - Ry;
  // trunk: tapered, leaning a touch, flaring into three roots at the ground
  const tw = (2.3 + H(4) * 0.8) * s, lean = (H(5) - 0.5) * 3 * s;
  const top = cy + Ry * 0.2;
  leafPart(ctx, (c) => {
    c.beginPath();
    c.moveTo(x - tw + lean, top);
    c.quadraticCurveTo(x - tw * 1.05 + lean * 0.4, base - 5 * s, x - tw * 1.25, base - 2.2 * s);
    c.quadraticCurveTo(x - tw * 1.9, base - 0.6 * s, x - tw * 2.7, base + 0.5);
    c.lineTo(x - tw * 1.1, base + 0.6);
    c.quadraticCurveTo(x - 0.3 * s, base - 0.8 * s, x + tw * 0.4, base + 1);
    c.lineTo(x + tw * 1.3, base + 0.4);
    c.quadraticCurveTo(x + tw * 2.2, base, x + tw * 2.8, base + 0.5);
    c.quadraticCurveTo(x + tw * 1.7, base - 1.4 * s, x + tw * 1.25, base - 3 * s);
    c.quadraticCurveTo(x + tw * 1.05 + lean * 0.4, base - 5 * s, x + tw + lean, top);
    c.closePath();
    c.fillStyle = lin(c, x - tw * 1.5, 0, x + tw * 1.5, 0, [[0, lighten(trunk, 0.3)], [0.45, trunk], [1, darken(trunk, 0.5)]]);
    c.fill();
    // the crown's shade across the upper trunk
    c.save(); c.clip();
    c.fillStyle = darken(trunk, 0.55);
    c.fillRect(x - 10 * s, top, 20 * s, cy + Ry * 0.95 - top + 2.5 * s);
    // bark: a seam or two down the shaded side, a lit knot on the sunny one
    c.fillStyle = darken(trunk, 0.4);
    c.fillRect(ap(x + tw * 0.35 + lean * 0.2), cy + Ry, 0.5, base - cy - Ry - 2 * s);
    c.fillRect(ap(x - tw * 0.3 + lean * 0.2), cy + Ry + 3 * s, 0.5, 3.5 * s);
    c.fillStyle = lighten(trunk, 0.45);
    c.fillRect(ap(x - tw * 0.75 + lean * 0.25), ap(base - 6 * s), 0.5, 1.5);
    c.restore();
  }, INK, [x - tw * 3, top - 1, x + tw * 3, base + 2], null);
  // the dark under-crown, showing wherever the clumps part
  leafPart(ctx, (c) => { blobPath(c, cx + s, cy + Ry * 0.16, R * 0.98, Ry * 0.9, seed + 11, 0.12, 12); c.fillStyle = darken(leaf, 0.55); c.fill(); }, INK, [cx - R * 1.2, cy - Ry, cx + R * 1.3, cy + Ry * 1.3]);
  // clumps: a ring around the rim (fuller along the bottom), a heart, and
  // a crown on top — the crown of clumps rounds off into a dome
  const clumps = [];
  const n = 5 + Math.floor(H(6) * 2);
  const a0 = H(7) * 6;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 + (H(i + 10) - 0.5) * 0.45;
    const rr = 0.5 + H(i + 20) * 0.12;
    const px = Math.cos(a) * R * rr * 1.05, py = Math.sin(a) * Ry * rr;
    clumps.push([px, py, R * (0.46 + H(i + 30) * 0.1) * (py < 0 ? 0.9 : 1.04)]);
  }
  clumps.push([(H(40) - 0.5) * R * 0.25, Ry * 0.1, R * 0.52]);
  clumps.push([(H(41) - 0.62) * R * 0.3, -Ry * 0.46, R * (0.42 + H(42) * 0.08)]);
  // lowest first, so each clump above overhangs the one below it
  clumps.sort((p, q) => q[1] - p[1]);
  clumps.forEach(([px, py, r], i) => {
    const lit = 0.5 + ((px / R) * SUN.x + (py / Ry) * SUN.y) * 1.3;
    const kx = cx + px, ky = cy + py;
    // an upper clump throws a little shade onto what's already below it
    if (py < Ry * 0.25 && i > 1) {
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      blobPath(ctx, kx + r * 0.2, ky + r * 0.42, r * 0.95, r * 0.7, seed + i, 0.2, 9);
      ctx.fillStyle = rgba(darken(leaf, 0.7), 0.3);
      ctx.fill();
      ctx.restore();
    }
    leafPart(ctx, (c) => leafClump(c, kx, ky, r, leaf, seed * 7 + i * 13, lit), darken(leaf, 0.72), [kx - r * 1.35, ky - r * 1.25, kx + r * 1.35, ky + r * 1.2]);
  });
  // the crown as one form: the side away from the sun sinks a step or two
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy + Ry * 0.1, R * 1.5, Ry * 1.1, 0, 0, Math.PI * 2); ctx.clip();
  ctx.globalCompositeOperation = "source-atop";
  const fs = ctx.createRadialGradient(cx - R * 0.4, cy - Ry * 0.5, 0, cx - R * 0.4, cy - Ry * 0.5, R * 1.9);
  const sh = darken(leaf, 0.75);
  fs.addColorStop(0, rgba(sh, 0)); fs.addColorStop(0.6, rgba(sh, 0));
  fs.addColorStop(0.6, rgba(sh, 0.16)); fs.addColorStop(0.8, rgba(sh, 0.16));
  fs.addColorStop(0.8, rgba(sh, 0.3)); fs.addColorStop(1, rgba(sh, 0.3));
  ctx.fillStyle = fs;
  ctx.fillRect(cx - R * 1.6, cy - Ry * 1.6, R * 3.2, Ry * 3.2);
  ctx.restore();
};

// One bough of a conifer: a drooping skirt of needles, its hem ragged with
// hanging tips and its outer ends sagging lowest.
const boughPath = (c, x, top, hem, hw, seed, s) => {
  const tips = hw > 10 * s ? 4 : 3;
  const h = hem - top;
  const tip = (k) => {
    const u = 1 - (2 * k) / tips;
    return [x + hw * u * (Math.abs(u) > 0.99 ? 0.94 : 1) + (hash(seed, k) - 0.5) * 1.2 * s, hem + (Math.abs(u) * 1.3 - 0.3) * s + (hash(seed, k + 9) - 0.5) * 1.4 * s];
  };
  c.beginPath();
  c.moveTo(x, top);
  let [px, py] = tip(0);
  c.quadraticCurveTo(x + hw * 0.4, top + h * 0.62, px, py);
  for (let k = 1; k <= tips; k++) {
    const [tx, ty] = tip(k);
    // each lobe: straight up into a notch, then a sagging curve down to the
    // next hanging tip
    const nx = px + (tx - px) * 0.42 + (hash(seed, k + 30) - 0.5) * s, ny = hem - (1.8 + hash(seed, k + 20) * 1.4) * s;
    c.lineTo(nx, ny);
    c.quadraticCurveTo(tx + (nx - tx) * 0.35, ny + (ty - ny) * 0.2, tx, ty);
    px = tx; py = ty;
  }
  c.quadraticCurveTo(x - hw * 0.4, top + h * 0.62, x, top);
  c.closePath();
};

// A conifer: stacked drooping boughs over a short trunk, each overhanging
// and shading the one below, lit down the sun side. `caps` adds snow.
const pineTree = (ctx, x, y, s, leaf, trunk, seed, caps = null) => {
  const H = (i) => hash(seed, i);
  const base = y + 10;
  shadow(ctx, x + 6 * s, base - 1, 12 * s, 4.2 * s, 0.24);
  shadow(ctx, x + 1.5 * s, base, 6 * s, 2 * s, 0.3);
  leafPart(ctx, (c) => {
    c.beginPath();
    c.moveTo(x - 1.6 * s, base - 12 * s);
    c.lineTo(x - 2 * s, base - 1.5 * s);
    c.quadraticCurveTo(x - 3 * s, base, x - 4 * s, base + 0.5);
    c.lineTo(x + 4 * s, base + 0.5);
    c.quadraticCurveTo(x + 3 * s, base, x + 2 * s, base - 1.5 * s);
    c.lineTo(x + 1.6 * s, base - 12 * s);
    c.closePath();
    c.fillStyle = lin(c, x - 3 * s, 0, x + 3 * s, 0, [[0, lighten(trunk, 0.25)], [0.45, trunk], [1, darken(trunk, 0.5)]]);
    c.fill();
    c.save(); c.clip();
    c.fillStyle = darken(trunk, 0.55);
    c.fillRect(x - 5 * s, base - 12 * s, 10 * s, 5 * s);
    c.restore();
  }, INK, [x - 5 * s, base - 13 * s, x + 5 * s, base + 2], null);
  const n = 4;
  const tall = (35 + H(2) * 7) * s;
  const hem0 = base - 4.5 * s;
  const apex = hem0 - tall;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const hem = hem0 - (tall - 8 * s) * (i / n) * 1.04;
    const hw = (14 - 9 * f) * s * (0.9 + H(i + 10) * 0.18);
    const top = i === n - 1 ? apex : hem - hw * 1.2 - 6 * s;
    const lean = (H(i + 20) - 0.5) * 1.6 * s;
    const bx = x + lean;
    const bseed = seed * 5 + i * 17;
    // the bough above throws its shade on this one
    if (i > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = rgba(darken(leaf, 0.7), 0.28);
      boughPath(ctx, bx + 1.2 * s, top + 3 * s, hem + 3 * s, hw * 1.02, bseed, s);
      ctx.fill();
      ctx.restore();
    }
    leafPart(ctx, (c) => {
      const b = i === n - 1 ? lighten(leaf, 0.05) : i === 0 ? darken(leaf, 0.08) : leaf;
      const dk = darken(b, 0.36), lt = lighten(b, 0.24);
      boughPath(c, bx, top, hem, hw, bseed, s); c.fillStyle = dk; c.fill();
      c.save();
      boughPath(c, bx, top, hem, hw, bseed, s); c.clip();
      c.translate(-hw * 0.2, -2 * s);
      boughPath(c, bx, top, hem, hw, bseed, s); c.fillStyle = b; c.fill();
      c.translate(-hw * 0.34, -2 * s);
      boughPath(c, bx, top, hem, hw, bseed, s); c.fillStyle = lt; c.fill();
      c.translate(hw * 0.54, 4 * s);
      // needles: short dark strokes fanning down from the crown line
      c.fillStyle = dk;
      for (let k = 0; k < 4 + Math.round(hw / s / 4); k++) {
        const u = (H(bseed + k) - 0.5) * 1.6, v = 0.45 + H(bseed + k + 40) * 0.4;
        const nx = ap(bx + u * hw * v), ny = ap(top + (hem - top) * v);
        c.fillRect(nx, ny, 0.5, 1);
        c.fillRect(nx + (u < 0 ? -0.5 : 0.5), ny + 1, 0.5, 0.5);
      }
      if (caps) {
        // snow lying on the bough: its own ragged hem, set higher, shaded
        // blue down the side away from the sun
        c.translate(0, -(hem - top) * 0.5);
        boughPath(c, bx, top, hem, hw, bseed + 3, s); c.fillStyle = caps; c.fill();
        c.clip();
        c.fillStyle = mix(caps, "#9fb8cc", 0.45);
        c.fillRect(bx + hw * 0.3, top - 20, hw * 2, hem - top + 40);
      }
      c.restore();
    }, darken(leaf, 0.75), [bx - hw - 3 * s, top - 2, bx + hw + 3 * s, hem + 4 * s]);
  }
};

// A stone that sits ON the ground: a flat footing, shoulders and a faceted
// crown — a lit top plane, a shaded front-right face, the base sinking into
// its own contact shade — with moss (or snow) on the top and a crack or two.
const roundPoly = (c, pts, k = 0.3) => {
  const n = pts.length;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const p0 = [p[0] + (a[0] - p[0]) * k, p[1] + (a[1] - p[1]) * k];
    const p1 = [p[0] + (b[0] - p[0]) * k, p[1] + (b[1] - p[1]) * k];
    if (i === 0) c.moveTo(p0[0], p0[1]); else c.lineTo(p0[0], p0[1]);
    c.quadraticCurveTo(p[0], p[1], p1[0], p1[1]);
  }
  c.closePath();
};
const rockBody = (ctx, x, gy, w, h, col, cap, seed) => {
  const j = (i) => hash(seed, i) - 0.5;
  const P = [
    [x - w, gy], [x - w * (1.02 + j(1) * 0.12), gy - h * (0.4 + j(2) * 0.14)], [x - w * (0.7 + j(3) * 0.14), gy - h * (0.88 + j(4) * 0.1)],
    [x - w * (0.12 + j(5) * 0.24), gy - h], [x + w * (0.45 + j(6) * 0.16), gy - h * (0.9 + j(7) * 0.1)], [x + w * (0.95 + j(8) * 0.08), gy - h * (0.46 + j(9) * 0.12)],
    [x + w, gy],
  ];
  // the crown's front edge: where the lit top turns down into the shaded face
  const R = [x + w * (0.2 + j(10) * 0.14), gy - h * (0.5 + j(11) * 0.1)];
  const L = [x - w * 0.86, gy - h * 0.5];
  leafPart(ctx, (c) => {
    roundPoly(c, P, 0.2); c.fillStyle = col; c.fill();
    c.save(); roundPoly(c, P, 0.2); c.clip();
    // top plane
    c.beginPath(); c.moveTo(P[1][0] - 2, P[1][1]); c.lineTo(P[2][0] - 2, P[2][1] - 2); c.lineTo(P[3][0], P[3][1] - 3); c.lineTo(P[4][0] + 2, P[4][1] - 3);
    c.lineTo(P[5][0] + 2, P[5][1]); c.lineTo(R[0], R[1]); c.lineTo(L[0], L[1]); c.closePath();
    c.fillStyle = lighten(col, 0.36); c.fill();
    // the lit lip where the top turns down
    c.strokeStyle = lighten(col, 0.55); c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(L[0], L[1] + 0.25); c.lineTo(R[0], R[1] + 0.25); c.stroke();
    // the shaded front-right face
    c.beginPath(); c.moveTo(R[0], R[1]); c.lineTo(P[5][0] + 3, P[5][1]); c.lineTo(P[6][0] + 3, gy + 2); c.lineTo(x + w * (0.05 + j(12) * 0.2), gy + 2); c.closePath();
    c.fillStyle = darken(col, 0.34); c.fill();
    // moss or snow on top, ragged where it spills over the edge
    if (cap) {
      blobPath(c, x - w * 0.22 + j(13) * w * 0.3, gy - h * 0.9, w * 0.66, h * 0.34, seed + 3, 0.3, 8);
      c.fillStyle = cap; c.fill();
      blobPath(c, x - w * 0.38 + j(13) * w * 0.3, gy - h * 1.02, w * 0.4, h * 0.2, seed + 4, 0.3, 7);
      c.fillStyle = lighten(cap, 0.22); c.fill();
      c.fillStyle = cap;
      for (let i = 0; i < 3; i++) c.fillRect(ap(x - w * 0.6 + hash(seed, i + 30) * w * 0.9), ap(gy - h * (0.62 - hash(seed, i + 33) * 0.1)), 0.5, 1 + Math.round(hash(seed, i + 36) * 2) / 2);
    }
    // the footing sinks into its own shade
    c.fillStyle = darken(col, 0.48);
    c.fillRect(x - w - 2, gy - 1.2, w * 2 + 4, 2);
    c.fillStyle = rgba(darken(col, 0.48), 0.5);
    c.fillRect(x - w - 2, gy - 2.2, w * 2 + 4, 1);
    // a crack: a dark seam with a lit lip beside it
    const k0 = [x - w * (0.1 + j(14) * 0.3), gy - h * 0.98];
    c.fillStyle = darken(col, 0.5);
    for (let t = 0; t < 1; t += 0.05) {
      const cxp = ap(k0[0] + t * w * 0.18 + Math.sin(t * 9 + seed) * 0.6), cyp = ap(k0[1] + t * h * 0.55);
      c.fillRect(cxp, cyp, 0.5, 0.5);
    }
    c.fillStyle = lighten(col, 0.45);
    c.fillRect(ap(k0[0] - 0.5), ap(k0[1] + 0.5), 0.5, 1);
    c.restore();
  }, INK, [x - w * 1.2 - 3, gy - h * 1.2 - 2, x + w * 1.2 + 4, gy + 3], null);
};

// Rocks come in four kinds: a shouldered boulder with a stone at its foot, a
// low slab half sunk in the turf, a tall split stone, and a knot of three.
const boulder = (ctx, x, y, s, base, cap, seed, v = 0) => {
  const gy = y + 8;
  const w = (9.5 + hash(seed, 1) * 2) * s;
  if (v === 1) {
    shadow(ctx, x + 4 * s, gy, w * 1.4, 3.4 * s, 0.26);
    rockBody(ctx, x, gy, w * 1.1, 12 * s, base, cap, seed);
    return;
  }
  if (v === 3) {
    shadow(ctx, x + 3 * s, gy, w * 1.25, 3.8 * s, 0.26);
    rockBody(ctx, x - w * 0.42, gy - 1.5 * s, w * 0.66, 11 * s, darken(base, 0.04), cap, seed + 1);
    rockBody(ctx, x + w * 0.48, gy - 0.5 * s, w * 0.58, 8.5 * s, base, cap, seed + 2);
    rockBody(ctx, x - w * 0.02, gy + 1.5 * s, w * 0.5, 6 * s, lighten(base, 0.05), null, seed + 3);
    return;
  }
  const tall = v === 2;
  shadow(ctx, x + 4 * s, gy, w * 1.25, 3.8 * s, 0.26);
  rockBody(ctx, x, gy, w * (tall ? 0.82 : 1), (tall ? 19 : 14) * s, base, cap, seed);
  rockBody(ctx, x + w * (tall ? 0.9 : 1), gy + 1.2 * s, w * 0.42, 5.5 * s, darken(base, 0.06), null, seed + 7);
};

// Low green things tucked around a trunk or stone after it's inked: grass
// crowding its foot and a pebble or two, so nothing stands on bare air.
const groundDress = (ctx, x, y, w, seed, stones = false) => {
  const R = REALM;
  const base = mix(R.GRASS_DK, R.GRASS, 0.2), tip = lighten(R.GRASS_LT, 0.12);
  const n = 2 + Math.floor(hash(seed, 50) * 2);
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const tx = x + side * w * (0.55 + hash(seed, i + 51) * 0.5), ty = y + 0.5 + hash(seed, i + 55) * 1.5;
    tuft(ctx, tx, ty, 0.5 + hash(seed, i + 58) * 0.25, base, tip, seed + i, { n: 3 });
  }
  if (stones) {
    for (let i = 0; i < 2; i++) {
      const px = x + (hash(seed, i + 60) - 0.3) * w * 2.2, py = y + 1 + hash(seed, i + 62) * 2;
      stone(ctx, px, py, 1.1 + hash(seed, i + 64) * 0.6, 0.8, mix("#a8a090", R.GRASS_DK, 0.2));
    }
  }
};

const deadTree = (ctx, x, y, s) => {
  shadow(ctx, x + 4 * s, y + 10, 8 * s, 3.5 * s, 0.28);
  const col = "#5a473a";
  cylinder(ctx, x - 2.5 * s, y - 18 * s, 5 * s, 18 * s + 16, col, { r: 2, hi: 0.35, lo: 0.55 });
  ctx.lineCap = "round";
  const limbs = [[-1, -14, -9, -5], [1, -10, 9, -4], [-1, -5, -7, -3], [1, -16, 5, -6]];
  for (const [, ly, lx, up] of limbs) {
    const g = lin(ctx, x, 0, x + lx * s, 0, [[0, lighten(col, lx < 0 ? 0.25 : 0)], [1, darken(col, lx < 0 ? 0.1 : 0.4)]]);
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(x, y + ly * s);
    ctx.quadraticCurveTo(x + lx * s * 0.5, y + (ly + up * 0.3) * s, x + lx * s, y + (ly + up) * s);
    ctx.stroke();
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath();
    ctx.moveTo(x + lx * s, y + (ly + up) * s);
    ctx.lineTo(x + lx * s * 1.25, y + (ly + up - 3) * s);
    ctx.stroke();
  }
};

const willow = (ctx, x, y, s, sway) => {
  shadow(ctx, x + 6 * s, y + 12, 16 * s, 6 * s, 0.3);
  cylinder(ctx, x - 3 * s, y + 1, 6 * s, 15, "#5a4230", { r: 2 });
  const leaf = "#4f7a3c";
  ball(ctx, x + sway * 0.4, y - 13 * s, 15 * s, 11 * s, leaf, { hi: 0.5, lo: 0.45 });
  ball(ctx, x + sway * 0.8 - 3 * s, y - 20 * s, 9 * s, 6.5 * s, lighten(leaf, 0.08), { hi: 0.5, lo: 0.4 });
  for (let i = 0; i < 11; i++) {
    const ox = (-13 + i * 2.6) * s;
    const len = (9 + ((i * 13) % 4) * 3.5) * s;
    const col = i % 2 ? leaf : darken(leaf, 0.22);
    const top = y - 8 * s - Math.abs(ox) * 0.2;
    blade(ctx, x + ox + sway * 0.6, top, x + ox + sway * 1.2 + 1.5 * s, top + len, 0.9 * s, col, lighten(col, 0.25), 0.4);
  }
};

const mushroom = (ctx, x, y, s, time) => {
  const pulse = 0.5 + 0.5 * Math.sin(time * 1.8 + x);
  glow(ctx, x, y - 5 * s, 17 * s, "#c88ce8", 0.1 + pulse * 0.1);
  shadow(ctx, x + 3 * s, y + 9, 8 * s, 3 * s, 0.26);
  cylinder(ctx, x - 2.4 * s, y - 4 * s, 4.8 * s, 4 * s + 14, "#d8cfb8", { r: 2, hi: 0.25, lo: 0.4 });
  const cap = "#9a56c0";
  ball(ctx, x, y - 6 * s, 10 * s, 6.5 * s, cap, { hi: 0.5, lo: 0.5 });
  soft(ctx, x, y - 2 * s, 9.5 * s, 2.2 * s, [[0, rgba(darken(cap, 0.55), 0.5)], [1, rgba(darken(cap, 0.55), 0)]]);
  for (const [dx, dy, r] of [[-5, -8, 1.6], [3, -10, 1.3], [-1, -5, 1.2], [6, -6, 1.1]]) {
    ball(ctx, x + dx * s, y + dy * s, r * s, r * 0.8 * s, "#eedaf6", { hi: 0.3, lo: 0.15 });
  }
};

const reeds = (ctx, x, y, s, time) => {
  const sway = Math.sin(time * 1.6 + x) * 1.2;
  const stalks = [[-6, 13], [-2, 18], [2, 15], [6, 11], [0, 10]];
  stalks.forEach(([ox, hh], i) => {
    const col = i % 2 ? "#6a8448" : "#54703c";
    const sx = x + ox * s, sh = hh * s;
    blade(ctx, sx, y + 8, sx + sway + 1.5 * s, y + 8 - sh, 0.8 * s, darken(col, 0.2), lighten(col, 0.2), 0.45);
    if (i % 2 === 0) ball(ctx, sx + sway + 1.2 * s, y + 8 - sh + 2.5 * s, 1.5 * s, 3.2 * s, "#6a4a2e", { hi: 0.35, lo: 0.35 });
  });
};

const crystal = (ctx, x, y, s, time) => {
  shadow(ctx, x + 3 * s, y + 9, 9 * s, 3 * s, 0.24);
  const shards = [[-6, 9, 3, "#5a94b0"], [6, 11, 3, "#7cc4e0"], [0, 16, 4, "#8fd0e8"]];
  for (const [ox, hh, ww, col] of shards) {
    const sx = x + ox * s, sh = hh * s, w = ww * s;
    ctx.beginPath();
    ctx.moveTo(sx, y + 8 - sh);
    ctx.lineTo(sx + w, y + 8 - sh * 0.3);
    ctx.lineTo(sx + w * 0.8, y + 9);
    ctx.lineTo(sx - w * 0.8, y + 9);
    ctx.lineTo(sx - w, y + 8 - sh * 0.35);
    ctx.closePath();
    const g = lin(ctx, sx - w, y + 8 - sh, sx + w, y + 9, [[0, lighten(col, 0.6)], [0.45, col], [1, darken(col, 0.45)]]);
    ctx.fillStyle = g;
    ctx.fill();
  }
  if (Math.sin(time * 3 + x) > 0.85) glow(ctx, x, y + 8 - 15 * s, 4 * s, "#ffffff", 0.9);
};

const vent = (ctx, x, y, s, time) => {
  shadow(ctx, x + 4 * s, y + 10, 11 * s, 4 * s, 0.3);
  ball(ctx, x, y + 2, 11 * s, 7 * s, "#3d3437", { hi: 0.3, lo: 0.5 });
  ball(ctx, x, y - 3 * s, 6 * s, 3.5 * s, "#4a3e42", { hi: 0.3, lo: 0.4 });
  const hot = 0.6 + 0.4 * Math.sin(time * 4 + x);
  soft(ctx, x, y - 4 * s, 4 * s, 2.2 * s, [[0, `rgba(255,214,120,${hot})`], [0.4, `rgba(232,96,52,${hot * 0.9})`], [1, "rgba(160,50,30,0)"]]);
  glow(ctx, x, y - 4 * s, 10 * s, "#e8703a", 0.18 * hot);
  const rise = (time * 14 + x) % 22;
  glow(ctx, x + Math.sin(time * 2 + x) * 3, y - 10 - rise, 2.2, "#f0a04a", Math.max(0, 0.9 - rise / 22));
};

// ---- the fen's dead and the Marches' camp ----------------------------

const gravestone = (ctx, x, y, s, seed) => {
  const lean = ((seed * 7) % 3) - 1;
  const hh = 14 * s, hw = 5 * s;
  shadow(ctx, x + 3 * s, y + 8, 7 * s, 2.5 * s, 0.26);
  ctx.save();
  ctx.translate(x, y + 8);
  ctx.rotate(lean * 0.08);
  ctx.beginPath();
  ctx.moveTo(-hw, 0);
  ctx.lineTo(-hw, -hh + hw);
  ctx.arc(0, -hh + hw, hw, Math.PI, 0);
  ctx.lineTo(hw, 0);
  ctx.closePath();
  const g = lin(ctx, -hw, 0, hw, 0, [[0, lighten(STONE, 0.28)], [0.55, STONE], [1, darken(STONE, 0.45)]]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(darken(STONE, 0.6), 0.35);
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  if (seed % 2) {
    ctx.beginPath(); ctx.moveTo(0, -hh + 3); ctx.lineTo(0, -hh + 9); ctx.moveTo(-2.5, -hh + 5); ctx.lineTo(2.5, -hh + 5); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-3 * s, -hh + 5); ctx.lineTo(3 * s, -hh + 5); ctx.moveTo(-3 * s, -hh + 8); ctx.lineTo(2 * s, -hh + 8); ctx.stroke();
  }
  ctx.restore();
  soft(ctx, x - 3 * s, y + 7, 4 * s, 1.8 * s, [[0, "rgba(74,90,60,0.8)"], [1, "rgba(74,90,60,0)"]]);
};

const cairn = (ctx, x, y, s) => {
  shadow(ctx, x + 4 * s, y + 9, 9 * s, 3 * s, 0.28);
  const tiers = [[8, 0, 0], [6, 1, 0.08], [4.5, 2, 0.16], [3, 3, 0.24]];
  for (const [wr, i, lt] of tiers) {
    ball(ctx, x + (i % 2 ? 1 : -1) * s, y + 6 - i * 5 * s, wr * s, 3.4 * s, lighten(STONE, lt), { hi: 0.45, lo: 0.5 });
  }
};

const boneheap = (ctx, x, y, s) => {
  soft(ctx, x, y + 4, 11 * s, 4.5 * s, [[0, "rgba(24,26,20,0.4)"], [1, "rgba(24,26,20,0)"]]);
  ctx.lineCap = "round";
  const bones = [[-7, 2, 7, 0.3], [1, 5, 6, -0.4], [-3, 7, 5, 0.1]];
  for (const [bx, by, len, ang] of bones) {
    const x0 = x + bx * s, y0 = y + by, x1 = x0 + Math.cos(ang) * len * s, y1 = y0 + Math.sin(ang) * len * s * 0.5;
    ctx.strokeStyle = "#cfc5ae";
    ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ball(ctx, x0, y0, 1.6 * s, 1.4 * s, "#ddd5c0", { hi: 0.3, lo: 0.4 });
    ball(ctx, x1, y1, 1.6 * s, 1.4 * s, "#ddd5c0", { hi: 0.3, lo: 0.4 });
  }
  ball(ctx, x - 5 * s, y - 1, 3.6 * s, 3.1 * s, "#e0d8c4", { hi: 0.35, lo: 0.4 });
  ctx.fillStyle = "#2b2430";
  ellipse(ctx, x - 6.2 * s, y - 1.2, 0.9 * s, 1.1 * s); ctx.fill();
  ellipse(ctx, x - 3.9 * s, y - 1.2, 0.9 * s, 1.1 * s); ctx.fill();
};

const obelisk = (ctx, x, y, s, time) => {
  const hh = 24 * s;
  shadow(ctx, x + 4 * s, y + 9, 7 * s, 2.6 * s, 0.3);
  ctx.beginPath();
  ctx.moveTo(x - 4 * s, y + 9); ctx.lineTo(x - 2.4 * s, y + 8 - hh); ctx.lineTo(x + 2.4 * s, y + 8 - hh); ctx.lineTo(x + 4 * s, y + 9);
  ctx.closePath();
  const g = lin(ctx, x - 4 * s, 0, x + 4 * s, 0, [[0, "#4a4058"], [0.5, "#2e2838"], [1, "#1a1622"]]);
  ctx.fillStyle = g; ctx.fill();
  ball(ctx, x, y + 8 - hh, 2.4 * s, 1.6 * s, "#3a3248", { hi: 0.35, lo: 0.4 });
  for (let i = 0; i < 3; i++) {
    const on = Math.sin(time * 1.6 + i * 2.1 + x) > 0.1;
    glow(ctx, x, y + 4 - i * 7 * s, 2.6 * s, "#7ce0b8", on ? 0.9 : 0.25);
  }
};

const watchtower = (ctx, x, y, s, time) => {
  const w2 = 7 * s, hh = 20 * s;
  shadow(ctx, x + 5 * s, y + 10, 11 * s, 4 * s, 0.32);
  masonry(ctx, x - w2, y + 8 - hh, w2 * 2, hh + 8, CASTLE_STONE, { course: 5, block: 7 });
  for (let i = 0; i < 3; i++) {
    const cx2 = x - w2 + i * (w2 - 1.5) + 0.5;
    cylinder(ctx, cx2, y + 8 - hh - 5, 4.5, 6, CASTLE_STONE, { r: 1 });
  }
  const lit = Math.sin(time * 1.9 + x * 2) > -0.5;
  ctx.fillStyle = "#2a2430";
  roundRect(ctx, x - 1.6, y - 6 * s, 3.2, 9, 1.2); ctx.fill();
  if (lit) glow(ctx, x, y - 6 * s + 4.5, 3.5, "#ffd070", 0.8);
  cylinder(ctx, x - 0.8, y + 8 - hh - 17, 1.6, 12, "#6a4a2e", { r: 0.8 });
  const wv = Math.sin(time * 4 + x) * 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 0.8, y + 8 - hh - 17);
  ctx.quadraticCurveTo(x + 5, y + 8 - hh - 18 + wv, x + 9 + wv, y + 8 - hh - 15.5);
  ctx.quadraticCurveTo(x + 5, y + 8 - hh - 13 + wv, x + 0.8, y + 8 - hh - 12);
  ctx.closePath();
  ctx.fillStyle = "#3e5c84"; ctx.fill();
};

const tent = (ctx, x, y, s) => {
  const w2 = 10 * s, hh = 11 * s;
  shadow(ctx, x + 4 * s, y + 9, 12 * s, 4 * s, 0.3);
  cone(ctx, x, y + 8 - hh, w2, hh, "#456a94", { scallops: 2, sag: 1.5, hi: 0.4, lo: 0.5 });
  // the open mouth
  ctx.beginPath();
  ctx.moveTo(x, y + 8 - hh * 0.55);
  ctx.lineTo(x + 4 * s, y + 9);
  ctx.lineTo(x - 4 * s, y + 9);
  ctx.closePath();
  const g = lin(ctx, 0, y - hh * 0.5, 0, y + 9, [[0, "#1a1c24"], [1, "#2c2a30"]]);
  ctx.fillStyle = g; ctx.fill();
  for (const sx of [x - w2 - 2.5, x + w2 + 1]) cylinder(ctx, sx, y + 5, 1.6, 4, "#6a4a2e", { r: 0.8 });
};

const banner = (ctx, x, y, s, time) => {
  const hh = 22 * s;
  shadow(ctx, x + 2, y + 9, 4 * s, 1.6 * s, 0.26);
  cylinder(ctx, x - 1, y + 8 - hh, 2.2, hh + 8, "#6a4a2e", { r: 1 });
  const wv = Math.sin(time * 3 + x * 0.2) * 2;
  const ty = y + 8 - hh;
  ctx.beginPath();
  ctx.moveTo(x + 1, ty);
  ctx.quadraticCurveTo(x + 7, ty - 1 + wv * 0.5, x + 13 + wv, ty + 1);
  ctx.lineTo(x + 9 + wv * 0.6, ty + 5.5);
  ctx.lineTo(x + 13 + wv, ty + 10);
  ctx.quadraticCurveTo(x + 7, ty + 11 + wv * 0.5, x + 1, ty + 10);
  ctx.closePath();
  const g = lin(ctx, x, ty, x + 12, ty + 10, [[0, "#5a7cac"], [1, "#2e4666"]]);
  ctx.fillStyle = g; ctx.fill();
  ball(ctx, x + 5.5, ty + 5, 1.8, 1.8, "#e8e4d8", { hi: 0.3, lo: 0.2 });
};

// Still pieces are baked once into inked sprites — every distinct (type,
// size, variant) — and stamped from then on. Things that glow, flicker or
// fly a flag are painted live so they keep moving.
const SPRITES = new Map();
// how many bakes the scenery holds, and their pixels (for the lab pages)
export const sceneryBakeStats = () => { let px = 0; for (const sp of SPRITES.values()) px += sp.cv.width * sp.cv.height; return { n: SPRITES.size, mb: +(px * 4 / 1048576).toFixed(1) }; };
export const resetSceneryBakes = () => { SPRITES.clear(); GROVE.key = ""; SIGN.key = ""; resetCastleBakes(); };
const LIVE = new Set(["mushroom", "crystal", "vent", "obelisk", "watchtower", "banner", "reeds"]);
const paintDecor = (ctx, d, time) => {
  const x = d.x, y = d.y, s = d.s || 1;
  const seed = d.seed ?? Math.round(d.x * 3 + d.y * 7);
  const v = d.v || 0, band = d.band || 0;
  const sway = d.forest ? 0 : Math.sin(time * 0.8 + d.x * 0.06 + d.y * 0.03) * 1.4;
  switch (d.t) {
    case "pine": pineTree(ctx, x, y, s, d.forest ? WOOD_PINE[band][v % 3] : PINE_TINTS[v % 4], PINE.trunk, seed); break;
    case "snowpine": pineTree(ctx, x, y, s, SNOWPINE.leaf, SNOWPINE.trunk, seed, "#eef5f8"); break;
    case "rock": boulder(ctx, x, y, s, "#9a978f", "#5f9438", seed, v); break;
    case "icerock": boulder(ctx, x, y, s, "#aac2d0", "#eef5f8", seed, v); break;
    case "obsidian": boulder(ctx, x, y, s, "#3c3448", null, seed, v); break;
    case "crystal": crystal(ctx, x, y, s, time); break;
    case "deadtree": deadTree(ctx, x, y, s); break;
    case "vent": vent(ctx, x, y, s, time); break;
    case "willow": willow(ctx, x, y, s, sway); break;
    case "mushroom": mushroom(ctx, x, y, s, time); break;
    case "reeds": reeds(ctx, x, y, s, time); break;
    case "gravestone": gravestone(ctx, x, y, s, seed); break;
    case "cairn": cairn(ctx, x, y, s); break;
    case "boneheap": boneheap(ctx, x, y, s); break;
    case "obelisk": obelisk(ctx, x, y, s, time); break;
    case "watchtower": watchtower(ctx, x, y, s, time); break;
    case "tent": tent(ctx, x, y, s); break;
    case "banner": banner(ctx, x, y, s, time); break;
    case "tree": oakTree(ctx, x, y, s, d.forest ? WOOD_OAK[band][v % 3] : OAK_TINTS[v % 4], OAK.trunk, seed); break;
    default: boulder(ctx, x, y, s, "#9a978f", "#6a9440", seed, v);
  }
};
// What gets tucked in around a piece's foot once it's inked.
const DRESS = { tree: [4, false], pine: [3.5, false], snowpine: [3.5, false], rock: [9, true], icerock: [9, true], deadtree: [3, false] };
// Which look a piece gets: lone pieces pick one of four by where they stand;
// the wood's trees pick by how deep in it they are (three bands), then one
// of two shapes. Sizes are rounded so the wood shares a modest set of bakes.
const variantOf = (d) => {
  const hv = hash(Math.round(d.x), Math.round(d.y));
  if (!d.forest) return { v: Math.floor(hv * 4), band: 0, s: Math.round((d.s || 1) * 10) / 10 };
  const dep = forestDepthAt(d.x, d.y);
  return { v: Math.floor(hv * 2), band: dep > 46 ? 2 : dep > 16 ? 1 : 0, s: Math.round((d.s || 1) * 4) / 4 };
};
const decorSprite = (d) => {
  const { v, band, s } = variantOf(d);
  const key = `${d.t}|${s}|${v}|${band}|${d.forest ? "f" : ""}|${REALM.GRASS}`;
  let sp = SPRITES.get(key);
  if (sp) return sp;
  const tall = d.t === "tree" || d.t === "pine" || d.t === "snowpine";
  const hw = Math.ceil((tall ? 27 : 38) * s + (tall ? 6 : 8)), top = Math.ceil((tall ? 48 : 42) * s + (tall ? 6 : 8)), bot = Math.ceil(12 + 6 * s);
  const seed = 7 + v * 131 + band * 1009 + Math.round(s * 10) * 17 + d.t.length * 29;
  const cv = bakeSprite(hw * 2, top + bot, (c) => {
    BAKE_CV = c.canvas;
    try { paintDecor(c, { ...d, x: hw, y: top, s, v, band, seed }, 0); } finally { BAKE_CV = null; }
  });
  const dress = DRESS[d.t];
  if (dress) {
    const c = cv.getContext("2d");
    c.save(); c.setTransform(PX, 0, 0, PX, 0, 0);
    groundDress(c, hw, top + (d.t.includes("rock") ? 8 : 10), dress[0] * s, seed, dress[1]);
    c.restore();
  }
  sp = { cv, hw, top, bot };
  SPRITES.set(key, sp);
  return sp;
};

export const drawTree = (ctx, d, time) => {
  if (!LIVE.has(d.t) && typeof document !== "undefined") {
    const sp = decorSprite(d);
    ctx.drawImage(sp.cv, d.x - sp.hw, d.y - sp.top, sp.hw * 2, sp.top + sp.bot);
    return;
  }
  paintDecor(ctx, { ...d, ...variantOf(d), s: d.s || 1 }, time);
};

// ---- water ------------------------------------------------------------

const DEFAULT_WATER = { deep: "#3a6a86", edge: "#5590a8", shine: "#a8d8e8" };

// A drifting glint on the surface.
const glint = (ctx, x, y, len, ang, col, a) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  soft(ctx, 0, 0, len, 1.1, [[0, rgba(col, a)], [1, rgba(col, 0)]]);
  ctx.restore();
};

export const drawRiver = (ctx, rv, time, water) => {
  const wa = water || DEFAULT_WATER;
  const bank = mix(wa.edge, "#6a5a40", 0.5);
  strokePts(ctx, rv.pts, rv.w + 10, rgba(darken(bank, 0.3), 0.28));
  strokePts(ctx, rv.pts, rv.w + 4, bank);
  strokePts(ctx, rv.pts, rv.w, wa.edge);
  strokePts(ctx, rv.pts, rv.w - 7, wa.deep);
  strokePts(ctx, rv.pts, rv.w * 0.4, rgba(lighten(wa.deep, 0.18), 0.5));
  ctx.lineWidth = 1;
  // the current: glints travelling downstream, braiding side to side
  let total = 0;
  for (const s of rv.segs) total += s.len;
  const n = Math.max(6, Math.round(total / 22));
  for (let i = 0; i < n; i++) {
    const d = ((i / n) * total + time * 22) % total;
    let acc = 0, sx = 0, sy = 0, ang = 0;
    for (const s of rv.segs) {
      if (d <= acc + s.len) {
        const t = (d - acc) / s.len;
        sx = s.x1 + (s.x2 - s.x1) * t;
        sy = s.y1 + (s.y2 - s.y1) * t;
        ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        break;
      }
      acc += s.len;
    }
    const side = Math.sin(i * 2.7 + time * 0.9) * (rv.w * 0.28);
    const px = sx + Math.cos(ang + Math.PI / 2) * side;
    const py = sy + Math.sin(ang + Math.PI / 2) * side;
    glint(ctx, px, py, 5 + (i % 3) * 2, ang, i % 3 === 0 ? wa.shine : lighten(wa.edge, 0.3), i % 3 === 0 ? 0.55 : 0.35);
  }
};

const DEFAULT_BRIDGE = { beam: "#4a3018", plank: "#8f6a3e", plankDk: "#75512c", rail: "#5f4326" };

export const drawBridge = (ctx, b, time, posAt, angleAt, pal) => {
  const bp = pal || DEFAULT_BRIDGE;
  const half = 35;
  const len = b.d1 - b.d0;
  // the span's shadow on the water, then the beams
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.a);
  soft(ctx, 2, 5, len / 2 + 4, half + 4, [[0, "rgba(20,16,24,0.3)"], [0.8, "rgba(20,16,24,0.18)"], [1, "rgba(20,16,24,0)"]]);
  ctx.fillStyle = bp.beam;
  roundRect(ctx, -len / 2 - 2, -half - 2, len + 4, half * 2 + 4, 2);
  ctx.fill();
  ctx.restore();
  // planks along the road's real curve
  for (let d = b.d0 + 2; d < b.d1 - 1; d += 6) {
    const [px, py] = posAt(d);
    const a = angleAt(d);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    const k = Math.floor(d / 6);
    const col = k % 3 === 0 ? bp.plankDk : bp.plank;
    const g = lin(ctx, -2.5, 0, 2.5, 0, [[0, lighten(col, 0.22)], [0.5, col], [1, darken(col, 0.3)]]);
    ctx.fillStyle = g;
    roundRect(ctx, -2.6, -half, 5.2, half * 2, 1);
    ctx.fill();
    ctx.restore();
  }
  // rails: posts every few paces, a beam along the top
  for (const side of [-1, 1]) {
    const railPts = [];
    for (let d = b.d0 + 2; d <= b.d1 - 1; d += 10) {
      const [px, py] = posAt(d);
      const a = angleAt(d) + Math.PI / 2;
      const rx = px + Math.cos(a) * half * side, ry = py + Math.sin(a) * half * side;
      cylinder(ctx, rx - 1.4, ry - 6, 2.8, 7, bp.rail, { r: 1 });
      railPts.push([rx, ry - 5.5]);
    }
    if (railPts.length > 1) strokePts(ctx, railPts, 1.8, lighten(bp.rail, 0.15));
    for (const dEnd of [b.d0, b.d1]) {
      const [px, py] = posAt(dEnd);
      const a = angleAt(dEnd) + Math.PI / 2;
      const rx = px + Math.cos(a) * half * side, ry = py + Math.sin(a) * half * side;
      cylinder(ctx, rx - 2.5, ry - 8, 5, 11, bp.beam, { r: 1.5 });
    }
  }
};

// Still water: a wandering shoreline, a lit bank, deep water with a soft
// inner shadow, and glints drifting across. Ice and lava keep their moods.
export const drawPond = (ctx, p, time) => {
  const x = p.x, y = p.y, rx = p.w / 2, ry = p.h / 2;
  const seed = Math.round(x * 3 + y);
  const big = p.w >= 80;
  const wobble = big ? 0.14 : 0.1;
  if (p.t === "lava") {
    blobPath(ctx, x, y, rx + 5, ry + 5, seed, wobble);
    ctx.fillStyle = "#2a2422"; ctx.fill();
    blobPath(ctx, x, y, rx, ry, seed, wobble);
    ctx.fillStyle = "#6a2a20"; ctx.fill();
    ctx.save(); blobPath(ctx, x, y, rx, ry, seed, wobble); ctx.clip();
    soft(ctx, x, y, rx * 0.9, ry * 0.9, [[0, "#ffd070"], [0.3, "#f08a3a"], [0.7, "#a03a24"], [1, "rgba(120,40,30,0)"]]);
    for (let i = 0; i < 4; i++) {
      const bub = 0.5 + 0.5 * Math.sin(time * 5 + i * 2.1 + x);
      const bx = x - rx * 0.6 + ((i * 37) % Math.max(8, p.w - 14)), by = y - ry * 0.5 + ((i * 23) % Math.max(4, p.h - 12));
      ball(ctx, bx, by - bub * 1.5, 2.2, 1.8, "#e8702a", { hi: 0.6, lo: 0.2 });
    }
    ctx.restore();
    glow(ctx, x, y, rx * 1.3, "#f08a3a", 0.16);
    return;
  }
  if (p.t === "ice") {
    blobPath(ctx, x, y, rx + 3, ry + 3, seed, wobble);
    ctx.fillStyle = "#9fb8c6"; ctx.fill();
    blobPath(ctx, x, y, rx, ry, seed, wobble);
    const g = lin(ctx, x - rx, y - ry, x + rx, y + ry, [[0, "#e4f2f8"], [0.5, "#c2dbe6"], [1, "#9cbccb"]]);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - rx * 0.5, y + ry * 0.2); ctx.lineTo(x - rx * 0.1, y - ry * 0.1); ctx.lineTo(x + rx * 0.35, y + ry * 0.3); ctx.stroke();
    if (Math.sin(time * 2.4 + p.x) > 0.8) glow(ctx, x - rx * 0.2, y - ry * 0.1, 5, "#ffffff", 0.9);
    return;
  }
  const swamp = p.t === "swamp";
  const deep = swamp ? "#2c4a3c" : "#3a6c88";
  const edge = swamp ? "#3d5c44" : "#5896ad";
  const shine = swamp ? "#7aa078" : "#b0e0ee";
  const bank = swamp ? "#4f5a3c" : "#8a7a58";
  // the bank: a soft dark ring on the turf, a lit lip on the far side
  ctx.save(); ctx.translate(2, 3);
  blobPath(ctx, x, y, rx + 6, ry + 5, seed, wobble);
  ctx.fillStyle = "rgba(30,22,30,0.22)"; ctx.fill();
  ctx.restore();
  blobPath(ctx, x, y, rx + 4, ry + 3.5, seed, wobble);
  ctx.fillStyle = bank; ctx.fill();
  blobPath(ctx, x, y, rx, ry, seed, wobble);
  ctx.fillStyle = edge; ctx.fill();
  ctx.save();
  blobPath(ctx, x, y, rx, ry, seed, wobble);
  ctx.clip();
  soft(ctx, x, y + ry * 0.1, rx * 0.95, ry * 0.9, [[0, deep], [0.75, deep], [1, rgba(edge, 0)]]);
  // the bank throws its shadow onto the near water
  soft(ctx, x - rx * 0.2, y - ry * 0.9, rx * 1.1, ry * 0.55, [[0, "rgba(20,24,30,0.32)"], [1, "rgba(20,24,30,0)"]]);
  // sky in the water: a pale sheen toward the sun
  soft(ctx, x - rx * 0.3, y - ry * 0.2, rx * 0.55, ry * 0.4, [[0, rgba(shine, 0.22)], [1, rgba(shine, 0)]]);
  const nG = big ? 7 : 3;
  for (let i = 0; i < nG; i++) {
    const gx = x - rx + 8 + ((time * 6 + i * 41) % Math.max(10, p.w - 16));
    const gy = y - ry * 0.55 + i * Math.max(4, (p.h - 10) / nG);
    glint(ctx, gx, gy, 4 + (i % 3) * 2, 0.05, shine, 0.5);
  }
  if (swamp) {
    for (const [dx, dy, r] of [[-0.4, 0.3, 3.4], [0.35, -0.25, 3], [0.1, 0.5, 2.5]]) {
      ball(ctx, x + rx * dx, y + ry * dy, r, r * 0.7, "#5f8a48", { hi: 0.4, lo: 0.3 });
    }
  }
  ctx.restore();
  if (swamp || big) reeds(ctx, x - rx * 0.72, y - ry * 0.55, 0.9, time);
};


// ---- the enemy's gate -------------------------------------------------

export const drawSpawn = (ctx, time, kind) => {
  if (kind === "grove") drawGrove(ctx, time);
  else if (kind === "barrow") drawBarrow(ctx, time);
  else drawCave(ctx, time);
};

const eyes = (ctx, sx, sy, time, col) => {
  if (Math.sin(time * 1.1) > -0.8) {
    const a = Math.sin(time * 5) > 0 ? 0.95 : 0.5;
    glow(ctx, sx - 5, sy - 1, 3, col, a);
    glow(ctx, sx + 5, sy - 1, 3, col, a);
  }
};

// A burial mound with its doorway stones pushed open.
export const drawBarrow = (ctx, time) => {
  // the road starts at the board edge; the mouth it comes out of sits a
  // little inside it
  const [psx, psy] = PTS[0];
  const sx = psx < 60 ? psx + 30 : psx, sy = psy < 60 ? psy + 30 : psy;
  shadow(ctx, sx + 6, sy + 26, 40, 7, 0.32);
  ball(ctx, sx, sy + 4, 38, 24, "#48503f", { hi: 0.35, lo: 0.5, fy: -0.7 });
  soft(ctx, sx - 12, sy - 8, 14, 5, [[0, "rgba(90,104,76,0.6)"], [1, "rgba(90,104,76,0)"]]);
  soft(ctx, sx + 14, sy - 2, 12, 4, [[0, "rgba(90,104,76,0.5)"], [1, "rgba(90,104,76,0)"]]);
  ball(ctx, sx + 4, sy - 19, 1.4, 1.4, "#9a8ec4", { hi: 0.3, lo: 0.2 });
  // doorway
  ctx.fillStyle = "#14100c";
  roundRect(ctx, sx - 10, sy - 4, 20, 30, 2); ctx.fill();
  const breathe = 0.4 + 0.3 * Math.sin(time * 1.3);
  glow(ctx, sx, sy + 16, 12, "#7ce0b8", breathe * 0.3);
  cylinder(ctx, sx - 15, sy - 4, 5.5, 30, "#7d7666", { r: 1.5 });
  cylinder(ctx, sx + 9.5, sy - 4, 5.5, 30, "#7d7666", { r: 1.5 });
  cylinder(ctx, sx - 17, sy - 9, 34, 6, "#8a8478", { r: 2, hi: 0.3, lo: 0.35 });
  eyes(ctx, sx, sy + 3, time, "#7ce0b8");
  ball(ctx, sx - 27, sy + 21, 6, 5, "#7d7666", { hi: 0.4, lo: 0.5 });
  ball(ctx, sx + 27, sy + 23, 5, 3.5, "#6e6859", { hi: 0.4, lo: 0.5 });
  soft(ctx, sx - 2, sy + 26, 10, 2.5, [[0, "rgba(190,180,150,0.6)"], [1, "rgba(190,180,150,0)"]]);
};

// The mouth of the wood. The forest itself is real trees (terrain.js grows
// them along the board edge, and they frame the gap); this is the dark the
// road runs into — stepped down in dithered bands the deeper it goes, spilling
// a little under the trees either side — and what watches from inside. The
// still part is baked once per realm; only the eyes and falling leaves live.
const GROVE = { key: "", cv: null, x: 0, y: 0, eyes: [], leaves: [] };
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bakeGrove = () => {
  const key = `${REALM.id}|${PTS[0]}|${PTS.length}|${FOREST ? FOREST.seed : "-"}`;
  if (GROVE.key === key) return GROVE;
  GROVE.key = key;
  // the stretch of road that runs through the wood, and a little beyond
  const inWood = [];
  for (let d = 0; d < TOTAL_LEN; d += 4) {
    const [x, y] = posAt(d);
    if (FOREST && forestDepthAt(x, y) < -30) break;
    if (!FOREST && d > 120) break;
    inWood.push([x, y, d]);
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of inWood) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const pad = PATH_HALF + 30;
  x0 = Math.floor(Math.max(0, x0 - pad)); y0 = Math.floor(Math.max(0, y0 - pad));
  x1 = Math.ceil(Math.min(W, x1 + pad)); y1 = Math.ceil(Math.min(H, y1 + pad));
  const w = x1 - x0, h = y1 - y0;
  const depthAt = (x, y) => (FOREST ? forestDepthAt(x, y) : 40 - Math.hypot(x - PTS[0][0], y - PTS[0][1]) * 0.5);
  GROVE.cv = bakeSprite(w, h, groveArt, false);
  function groveArt(c) {
    // the dark, a pixel at a time: deeper in the wood and nearer the road's
    // middle is darker, in five dithered steps
    const cv = c.canvas, PW = cv.width, PH = cv.height;
    const img = c.getImageData(0, 0, PW, PH), dd = img.data;
    const [dr, dg, db] = [11, 15, 9];   // #0b0f09
    const nearRow = new Float32Array(PW);
    for (let py = 0; py < PH; py += 1) {
      if (py % PX === 0) for (let px = 0; px < PW; px += PX) { const v = nearestOnPath(x0 + (px + PX / 2) / PX, y0 + (py + PX / 2) / PX).d; for (let q = 0; q < PX; q++) nearRow[px + q] = v; }
      for (let px = 0; px < PW; px += 1) {
        const x = x0 + px / PX, y = y0 + py / PX;
        const near = nearRow[px];
        const side = Math.max(0, Math.min(1, (PATH_HALF + 20 - near) / 20));
        if (side <= 0) continue;
        const deep = Math.max(0, Math.min(1, (depthAt(x, y) + 8) / 46));
        const a = side * deep;
        const lvl = Math.min(4, Math.floor(a * 4 + BAYER4[(py & 3) * 4 + (px & 3)] / 16));
        if (lvl <= 0) continue;
        const o = (py * PW + px) * 4;
        dd[o] = dr; dd[o + 1] = dg; dd[o + 2] = db; dd[o + 3] = [0, 70, 130, 190, 240][lvl];
      }
    }
    c.putImageData(img, 0, 0);
  }
  GROVE.x = x0; GROVE.y = y0; GROVE.w = w; GROVE.h = h;
  // eyes wait in the deepest dark over the road, each pair keeping its own time
  GROVE.eyes = [];
  for (const k of [0.2, 0.45, 0.7]) {
    const at = inWood[Math.floor(inWood.length * k)];
    if (!at) continue;
    const a = angleAt(at[2]) + Math.PI / 2, off = (hash(k * 100, 1) - 0.5) * PATH_HALF * 1.2;
    if (depthAt(at[0], at[1]) > 16) GROVE.eyes.push([at[0] + Math.cos(a) * off, at[1] + Math.sin(a) * off, k * 7.3]);
  }
  GROVE.leaves = inWood.filter((p) => depthAt(p[0], p[1]) > -4 && depthAt(p[0], p[1]) < 30);
  return GROVE;
};

export const drawGrove = (ctx, time) => {
  const G = bakeGrove();
  ctx.drawImage(G.cv, G.x, G.y, G.w, G.h);
  // eyes: two hard pips with a faint bloom, blinking out of step
  G.eyes.forEach(([ex, ey, ph], i) => {
    const t = time * 0.9 + ph;
    if (Math.sin(t) < -0.55 || (Math.sin(t * 7.1) > 0.96)) return;
    const col = i === 1 ? "#f0b040" : "#e8503e";
    ctx.fillStyle = rgba(col, 0.22);
    ctx.fillRect(Math.round((ex - 4.5) * PX) / PX, Math.round((ey - 0.5) * PX) / PX, 3.5, 2);
    ctx.fillRect(Math.round((ex + 1) * PX) / PX, Math.round((ey - 0.5) * PX) / PX, 3.5, 2);
    ctx.fillStyle = col;
    ctx.fillRect(Math.round((ex - 3.5) * PX) / PX, Math.round(ey * PX) / PX, 1.5, 1);
    ctx.fillRect(Math.round((ex + 2) * PX) / PX, Math.round(ey * PX) / PX, 1.5, 1);
  });
  // leaves shaken loose where something is pushing through
  if (G.leaves.length) {
    for (let i = 0; i < 5; i++) {
      const p = G.leaves[Math.floor(hash(i, 3) * G.leaves.length)];
      const fall = (time * 11 + i * 13) % 34;
      const lx = p[0] + (hash(i, 4) - 0.5) * PATH_HALF * 1.6 + Math.sin(time * 2 + i) * 3;
      ctx.fillStyle = i % 2 ? "#5f8a3a" : "#8fb04a";
      ctx.fillRect(Math.round(lx * PX) / PX, Math.round((p[1] - 22 + fall) * PX) / PX, 1.5, 1);
    }
  }
};

// The warning at the wood's edge: a weathered plank on two posts, the words
// cut deep enough to read from across the field, a few goblin claw-marks,
// and three chevrons that pulse while you're still building. It stands on
// the meadow just past the treeline, beside the road, never across it.
const SIGN = { key: "", cv: null, x: 0, y: 0 };
const signSpot = () => {
  let d = FOREST ? 0 : 96;
  for (; FOREST && d < TOTAL_LEN * 0.5; d += 4) {
    const [x, y] = posAt(d);
    if (!FOREST || forestDepthAt(x, y) < -10) break;
  }
  // a few spots on either side of the road just past the treeline; the
  // first one clear of the road, the board edge and anything standing wins
  const cands = [];
  for (const dd of [8, 22, 36, 50]) {
    const at = Math.min(TOTAL_LEN, d + dd);
    const [px, py] = posAt(at);
    const a = angleAt(at) + Math.PI / 2;
    for (const sd of [-1, 1]) {
      const off = PATH_HALF + 17;
      const x = px + Math.cos(a) * sd * off, y = py + Math.sin(a) * sd * off;
      const clearRd = nearestOnPath(x, y).d > PATH_HALF + 8 && nearestOnPath(x, y + 10).d > PATH_HALF + 2 && nearestOnPath(x, y - 30).d > PATH_HALF;
      const crowd = DECOR.some((o) => !o.forest && Math.abs(o.x - x) < 40 && o.y - y > -14 && o.y - y < 48);
      cands.push({ x, y, score: (clearRd ? 0 : 100) + (crowd ? 30 : 0) + (x < 40 || y < 40 ? 50 : 0) + dd * 0.3 + y * 0.02 });
    }
  }
  cands.sort((p, q) => p.score - q.score);
  return cands[0];
};
const bakeSign = () => {
  const key = `${REALM.id}|${PTS[0]}|${PTS.length}`;
  if (SIGN.key === key) return SIGN;
  SIGN.key = key;
  const spot = signSpot();
  SIGN.x = Math.round(spot.x); SIGN.y = Math.round(spot.y);
  const Wd = 60, Hd = 34;           // sprite box, ground at (30, 30)
  SIGN.cv = bakeSprite(Wd, Hd, (c) => {
    shadow(c, 33, 30, 22, 3, 0.28);
    const wood = "#7a5636", post = "#5f4326";
    for (const px of [10, 48]) part(c, (cc) => cylinder(cc, px, 13, 3, 17.5, post, { r: 1 }));
    // the plank, a corner split away
    part(c, (cc) => {
      cc.beginPath();
      cc.moveTo(4, 5); cc.lineTo(51, 4); cc.lineTo(54, 6.5); cc.lineTo(55, 10); cc.lineTo(56, 18); cc.lineTo(5, 19); cc.lineTo(3.5, 12); cc.closePath();
      cc.fillStyle = lin(cc, 0, 4, 0, 19, [[0, lighten(wood, 0.25)], [0.5, wood], [1, darken(wood, 0.35)]]);
      cc.fill();
      cc.save(); cc.clip();
      // grain, a crack, weather-grey on the upper edge
      cc.fillStyle = darken(wood, 0.3);
      for (const [gx, gy, gl] of [[7, 8, 14], [26, 15.5, 18], [40, 9, 10], [10, 16.5, 8]]) cc.fillRect(gx, gy, gl, 0.5);
      cc.fillRect(50, 6, 0.5, 5);
      cc.fillStyle = rgba("#c8c0b0", 0.35); cc.fillRect(4, 4, 52, 1);
      // moss creeping up from the lower corner
      cc.fillStyle = "#5a7a38"; cc.fillRect(4, 17, 6, 2); cc.fillRect(5, 16, 3, 1);
      cc.restore();
    });
    // nails
    c.fillStyle = "#c4c8d0"; c.fillRect(11, 7, 1, 1); c.fillRect(48.5, 7, 1, 1);
    // the words: cut in, dark, with a lit lower lip, crisp to the pixel
    const T = document.createElement("canvas");
    T.width = Wd * PX; T.height = Hd * PX;
    const t = T.getContext("2d");
    t.scale(PX, PX);
    t.font = "bold 8.5px monospace"; t.textAlign = "center"; t.textBaseline = "middle";
    t.fillStyle = "#000"; t.fillText("THEY COME", 29.5, 11.8);
    const im = t.getImageData(0, 0, T.width, T.height);
    const put = (col, dx, dy) => {
      const [r, g, b] = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
      const out = c.getImageData(0, 0, T.width, T.height);
      for (let yy = 0; yy < T.height; yy++) for (let xx = 0; xx < T.width; xx++) {
        const sx = xx - dx, sy = yy - dy;
        if (sx < 0 || sy < 0 || sx >= T.width || sy >= T.height) continue;
        if (im.data[(sy * T.width + sx) * 4 + 3] < 120) continue;
        const o = (yy * T.width + xx) * 4;
        out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = b; out.data[o + 3] = 255;
      }
      c.putImageData(out, 0, 0);
    };
    put("#e8c890", 1, 1);
    put("#2a1a1a", 0, 0);
    // claw marks: three scratches through the lower corner
    c.fillStyle = "#3a2418";
    for (let k = 0; k < 3; k++) for (let q = 0; q < 5; q++) c.fillRect(Math.round((43 + k * 2 + q * 0.8) * PX) / PX, Math.round((13.5 + q) * PX) / PX, 0.5, 0.5);
  });
  return SIGN;
};
export const drawSpawnSign = (ctx, time, phase) => {
  if (!PTS.length) return;
  const S = bakeSign();
  ctx.drawImage(S.cv, S.x - 30, S.y - 30, 60, 34);
  // the chevrons pointing at the road: loud while you build, a murmur once
  // the fighting starts
  const loud = phase !== "combat";
  for (let k = 0; k < 3; k++) {
    const lit = 0.3 + 0.7 * Math.max(0, Math.sin(time * 4 - k * 1.05));
    ctx.strokeStyle = `rgba(232,110,96,${lit * (loud ? 1 : 0.4)})`; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const yy = S.y - 52 + k * 7;
    ctx.beginPath(); ctx.moveTo(S.x - 6, yy); ctx.lineTo(S.x, yy + 5); ctx.lineTo(S.x + 6, yy); ctx.stroke();
  }
};

export const drawCave = (ctx, time) => {
  // the road starts at the board edge; the mouth it comes out of sits a
  // little inside it
  const [psx, psy] = PTS[0];
  const sx = psx < 60 ? psx + 30 : psx, sy = psy < 60 ? psy + 30 : psy;
  shadow(ctx, sx + 6, sy + 26, 38, 6, 0.3);
  ball(ctx, sx, sy + 2, 37, 26, "#6d6556", { hi: 0.35, lo: 0.55, fy: -0.7 });
  soft(ctx, sx - 10, sy - 14, 18, 7, [[0, "rgba(96,120,72,0.6)"], [1, "rgba(96,120,72,0)"]]);
  ball(ctx, sx - 25, sy + 8, 6, 4.5, "#7d7566", { hi: 0.4, lo: 0.5 });
  ball(ctx, sx + 24, sy + 2, 5, 4.5, "#7d7566", { hi: 0.4, lo: 0.5 });
  // the mouth
  ctx.beginPath();
  ctx.moveTo(sx - 17, sy + 26);
  ctx.quadraticCurveTo(sx - 18, sy - 8, sx, sy - 14);
  ctx.quadraticCurveTo(sx + 18, sy - 8, sx + 17, sy + 26);
  ctx.closePath();
  const mg = lin(ctx, 0, sy - 14, 0, sy + 26, [[0, "#0e0b09"], [1, "#241c16"]]);
  ctx.fillStyle = mg; ctx.fill();
  const rim = [[-19, 4], [-17, -6], [-9, -13], [1, -16], [10, -12], [17, -5], [19, 4]];
  for (const [rx, ry] of rim) ball(ctx, sx + rx, sy + ry, 4, 3, "#8a8272", { hi: 0.45, lo: 0.5 });
  eyes(ctx, sx, sy + 1, time, "#e05248");
  for (const [bx, by, r] of [[-22, 21, 4], [23, 23, 4], [23, 27, 2.2]]) ball(ctx, sx + bx, sy + by, r, r * 0.55, "#e0d6ba", { hi: 0.3, lo: 0.3 });
};

// Re-export the odd helper the render lab likes to borrow.
export { tuft, drawCastle, drawCastleWorks, resetWorksBakes };
