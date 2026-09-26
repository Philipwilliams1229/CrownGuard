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
import { PTS, SEGS, TOTAL_LEN, posAt, angleAt, nearestOnPath } from "../engine/path.js";
import { FOREST, DECOR, COAST, forestDepthAt, seaDepthAt, inRiver, archAt, BRIDGE_HALF } from "../data/terrain.js";
import { REALM } from "../data/maps.js";
import { workTier, bowmenSpots, masonSpots } from "../data/castle.js";
import { drawArcher, drawHalberdier, drawMason, WALL_FOLK } from "./folk.js";
import { ballista } from "./halls/archer.js";
import { drawCastle, drawCastleWorks, resetWorksBakes, resetCastleBakes } from "./castle.js";
import { IRON_ART } from "./scenery-iron.js";
import { gateCrag, hasCrag, vnoise, sstep } from "../data/gatecrag.js";
import { pixelTuft, groundKind } from "./groundblend.js";
import { HOLLOW_ART } from "./scenery-hollow.js";
import {
  lighten, darken, mix, rgb, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone,
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
// A stone cut into flat facets: the intersection of a dozen planes laid
// round an ellipsoid (some cut a little deeper, so it looks chipped), drawn
// column by column the way the camera sees it — tops and south faces — each
// facet one flat tone from the sun. Moss (or snow) settles on the top facets,
// lichen specks the sides; the shadow is the stone's own shape, thrown
// down-right. `o.shade` paints only that shadow (onto the ground, before the
// stone is inked); otherwise only the stone.
const L3 = [-0.391, -0.485, 0.782];
const TONES = new Map();
const tones5 = (col) => {
  let t = TONES.get(col);
  if (!t) TONES.set(col, t = [lighten(col, 0.42), lighten(col, 0.18), col, darken(col, 0.24), darken(col, 0.46)].map(rgb));
  return t;
};
// snow on a stone: lit facets lean cream, those turned from the sun go blue
const SNOW5 = ["#fff6e2", "#eef5f8", "#d4e2ec", "#b4c4d2", "#9fb0c4"].map(rgb);
// volcanic glass: a wide ramp, lit planes a cool lilac, shade near-black plum
const glass5 = (col) => {
  const k = "g" + col;
  let t = TONES.get(k);
  if (!t) TONES.set(k, t = ["#8a7ea0", mix(col, "#8a7ea0", 0.5), col, mix(col, "#1c1624", 0.5), "#1c1624"].map(rgb));
  return t;
};
const GL_EDGE = rgb("#aea4c4"), GL_HOT = rgb("#e8e0f0"), ICE_RIM = rgb("#a4c4d8");
const facetStone = (ctx, x, gy, w, d, h, col, seed, o = {}) => {
  const P = [];
  // obsidian breaks into fewer, flatter, sharper planes than field stone
  const gl = !!o.gloss;
  const n = (gl ? 10 : 12) + Math.floor(hash(seed, 99) * (gl ? 3 : 4));
  // a flat crown, a ring of shoulders, and the sides
  for (let i = 0; i < n; i++) {
    const ring = i === 0 ? 0 : i <= 5 ? 1 : 2;
    const az = (ring === 0 && gl ? hash(seed, 3) * 6.3 : (ring === 1 ? (i - 1) / 5 : (i - 6) / (n - 6)) * Math.PI * 2) + (hash(seed, i) - 0.5) * 0.9 + ring * 0.4;
    const el = ring === 0 ? (gl ? 1.2 : 1.45) : ring === 1 ? (gl ? 0.35 + hash(seed, i + 20) * 0.2 : 0.62 + hash(seed, i + 20) * 0.35) : (gl ? 0.1 + hash(seed, i + 20) * 0.22 : 0.16 + hash(seed, i + 20) * 0.3);
    const ux = Math.cos(az) * Math.cos(el), uy = Math.sin(az) * Math.cos(el), uz = Math.sin(el);
    const px = w * ux, py = d * uy, pz = h * uz;
    let nx = px / (w * w), ny = py / (d * d), nz = pz / (h * h);
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    if (nz < 0.04) continue;
    const cut = ring === 0 ? 0.74 + hash(seed, 41) * 0.08 : gl ? 0.8 + hash(seed, i + 40) * 0.18 : 0.9 + hash(seed, i + 40) * 0.12;
    P.push([nx, ny, nz, (nx * px + ny * py + nz * pz) * cut]);
  }
  const zAt = (wx, wy) => {
    let z = 1e9, id = -1;
    for (let i = 0; i < P.length; i++) {
      const q = P[i], zz = (q[3] - q[0] * (wx - x) - q[1] * (wy - gy)) / q[2];
      if (zz < z) { z = zz; id = i; }
    }
    return [z, id];
  };
  const m = ctx.getTransform(), k = m.a;
  const cv = ctx.canvas;
  const sh = o.shade ? 9 : 1;
  const bx0 = Math.max(0, Math.floor(k * (x - w - 1.5) + m.e)), bx1 = Math.min(cv.width, Math.ceil(k * (x + w + 1.5 + sh) + m.e));
  const by0 = Math.max(0, Math.floor(m.d * (gy - d - h - 2) + m.f)), by1 = Math.min(cv.height, Math.ceil(m.d * (gy + d + 1.5 + sh * 0.7) + m.f));
  const BW = bx1 - bx0, BH = by1 - by0;
  if (BW <= 0 || BH <= 0) return;
  const img = ctx.getImageData(bx0, by0, BW, BH), dd = img.data;
  const wxOf = (cx) => (cx + bx0 + 0.5 - m.e) / k, wyOf = (cy) => (cy + by0 + 0.5 - m.f) / m.d;
  if (o.shade) {
    // the stone's shadow on the ground, short, thrown down-right; darker
    // right against its foot. Cast forward: each point of the footing
    // throws its shade along the sun's line as far as its height allows.
    const Z = new Float32Array(BW * BH), A = new Float32Array(BW * BH);
    for (let cy = 0; cy < BH; cy++) for (let cx = 0; cx < BW; cx++) Z[cy * BW + cx] = zAt(wxOf(cx), wyOf(cy))[0];
    for (let cy = 0; cy < BH; cy++) for (let cx = 0; cx < BW; cx++) {
      const z = Z[cy * BW + cx];
      if (z <= 0) continue;
      for (let t = 0.5; t < 9 && z > t * 1.5; t += 0.5) {
        const qx = cx + Math.round(0.586 * t * k), qy = cy + Math.round(0.81 * t * m.d);
        if (qx >= BW || qy >= BH) break;
        const j = qy * BW + qx, a = t < 1.1 ? 0.4 : 0.26;
        if (A[j] < a) A[j] = a;
      }
    }
    for (let j = 0; j < BW * BH; j++) {
      const a = A[j];
      if (!a || Z[j] > 0) continue;
      const i = j * 4, a0 = dd[i + 3] / 255, ao = a + a0 * (1 - a);
      dd[i] = Math.round((28 * a + dd[i] * a0 * (1 - a)) / ao); dd[i + 1] = Math.round((20 * a + dd[i + 1] * a0 * (1 - a)) / ao); dd[i + 2] = Math.round((30 * a + dd[i + 2] * a0 * (1 - a)) / ao);
      dd[i + 3] = Math.round(ao * 255);
    }
    ctx.putImageData(img, bx0, by0);
    return;
  }
  const T = gl ? glass5(col) : tones5(col);
  const tone = P.map(([nx, ny, nz]) => {
    const l = L3[0] * nx + L3[1] * ny + L3[2] * nz;
    return gl ? (l > 0.7 ? 0 : l > 0.42 ? 1 : l > 0.12 ? 2 : l > -0.2 ? 3 : 4) : l > 0.8 ? 0 : l > 0.52 ? 1 : l > 0.16 ? 2 : l > -0.2 ? 3 : 4;
  });
  const fid = new Int16Array(BW * BH).fill(-1);
  const zp = new Float32Array(BW * BH);
  for (let cx = 0; cx < BW; cx++) {
    const wx = wxOf(cx);
    let front = BH;
    for (let gyp = Math.ceil(m.d * (gy + d + 1) + m.f) - by0; gyp >= Math.floor(m.d * (gy - d - 1) + m.f) - by0; gyp--) {
      const wy = wyOf(gyp);
      const [z, id] = zAt(wx, wy);
      if (z <= 0.15) { if (gyp < front) front = gyp; continue; }
      const sp = Math.floor(gyp - z * m.d);
      if (sp >= front) continue;
      for (let q = Math.max(0, sp); q < Math.min(front, BH); q++) { fid[q * BW + cx] = id; zp[q * BW + cx] = z - (q - sp) / m.d; }
      front = Math.max(0, sp);
    }
  }
  const cap = o.cap ? (o.snow ? SNOW5 : tones5(o.cap)) : null, snowy = o.snow;
  const capThr = snowy ? 0.74 : 0.7;
  // what spills over a cap's edge, column by column: snow in short drips
  // all along with an icy rim under it, moss in a few clumps
  const drip = new Int8Array(BW), rim = new Uint8Array(BW);
  let glints = 0;
  for (let cy = 0; cy < BH; cy++) for (let cx = 0; cx < BW; cx++) {
    const i = cy * BW + cx, f = fid[i];
    if (f < 0) { drip[cx] = 0; rim[cx] = 0; continue; }
    let t = tone[f];
    const above = cy > 0 ? fid[i - BW] : -1;
    // a ridge between facets catches the light on its upper side
    if (above >= 0 && above !== f && tone[above] > t) t = Math.max(0, t - 1);
    if (cy < BH - 1 && fid[i + BW] >= 0 && fid[i + BW] !== f && tone[fid[i + BW]] < t) t = Math.min(4, t + 1);
    let c = T[t];
    const nz = P[f][2];
    if (cap) {
      const top = nz > capThr;
      const patch = snowy ? 1 : vnoise((cx + bx0) / 5, (cy + by0) / 5, seed + 3) - 0.16;
      if (top && patch > 0.4) {
        c = cap[Math.min(snowy ? 3 : 3, Math.max(0, t + (above !== f && above >= 0 ? -1 : 0)))];
        const X = cx + bx0;
        drip[cx] = snowy ? (hash(X, seed + 33) < 0.28 ? 2 : hash(X, seed + 33) < 0.6 ? 1 : 0)
          : vnoise(X / 5, 3.5, seed + 29) > 0.66 ? 1 + Math.floor(hash(X, seed + 31) * 3) : 0;
        rim[cx] = snowy ? 1 : 0;
      } else if (top) { drip[cx] = 0; rim[cx] = 0; }
      else if (drip[cx] > 0) { c = drip[cx] === 1 ? cap[3] : cap[2]; drip[cx]--; }
      else if (rim[cx]) { c = ICE_RIM; rim[cx] = 0; }
    }
    // lichen: a few pale crusts on the sides, a couple of pixels each
    if (o.lichen && nz < 0.75 && t <= 3 && vnoise((cx + bx0) / 3, (cy + by0) / 2, seed + 17) > 0.93) c = rgb(t <= 1 ? lighten(o.lichen, 0.2) : o.lichen);
    // glass: one lit edge along the top and left of each lit plane, and a
    // single hot glint where it's brightest
    if (gl && t <= 1) {
      const lf = cx > 0 ? fid[i - 1] : -1;
      if (above !== f || lf !== f) {
        if (t === 0 && glints < 2 && above >= 0) { c = GL_HOT; glints++; }
        else c = GL_EDGE;
      }
    }
    const j = i * 4;
    dd[j] = c[0]; dd[j + 1] = c[1]; dd[j + 2] = c[2]; dd[j + 3] = 255;
  }
  ctx.putImageData(img, bx0, by0);
};
// one stone, inked on its own so a stone at another's foot reads apart from it
const rockPiece = (ctx, x, gy, w, d, h, col, seed, o) =>
  leafPart(ctx, (c) => facetStone(c, x, gy, w, d, h, col, seed, o), INK, [x - w - 2, gy - d - h - 3, x + w + 2, gy + d + 2], null);
// A stand-in 2D context over a raw RGBA buffer, enough for facetStone —
// so a bake that already holds its pixels can lay stones in without a
// canvas read-back.
const pxCtx = (buf, BW, BH, m) => ({
  canvas: { width: BW, height: BH },
  getTransform: () => m,
  getImageData: (x, y, w, h) => {
    const img = new ImageData(w, h);
    for (let r = 0; r < h; r++) img.data.set(buf.subarray(((y + r) * BW + x) * 4, ((y + r) * BW + x + w) * 4), r * w * 4);
    return img;
  },
  putImageData: (img, x, y) => { for (let r = 0; r < img.height; r++) buf.set(img.data.subarray(r * img.width * 4, (r + 1) * img.width * 4), ((y + r) * BW + x) * 4); },
});
// one stone painted and inked on its own into a raw buffer (see rockPiece)
const INK_RGB = rgb(INK);
const inkedStone = (buf, BW, BH, m, x, gy, w, d, h, col, seed, o) => {
  const k = m.a;
  const bx0 = Math.max(0, Math.floor(k * (x - w - 3) + m.e)), by0 = Math.max(0, Math.floor(m.d * (gy - d - h - 4) + m.f));
  const bx1 = Math.min(BW, Math.ceil(k * (x + w + 3) + m.e)), by1 = Math.min(BH, Math.ceil(m.d * (gy + d + 3) + m.f));
  const TW = bx1 - bx0, TH = by1 - by0;
  if (TW <= 2 || TH <= 2) return;
  const tmp = new Uint8ClampedArray(TW * TH * 4);
  facetStone(pxCtx(tmp, TW, TH, { a: m.a, d: m.d, e: m.e - bx0, f: m.f - by0 }), x, gy, w, d, h, col, seed, o);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const q = (j * TW + i) * 4, o2 = ((by0 + j) * BW + bx0 + i) * 4;
    if (tmp[q + 3] > 110) { buf[o2] = tmp[q]; buf[o2 + 1] = tmp[q + 1]; buf[o2 + 2] = tmp[q + 2]; buf[o2 + 3] = 255; continue; }
    const on = (ii, jj) => ii >= 0 && jj >= 0 && ii < TW && jj < TH && tmp[(jj * TW + ii) * 4 + 3] > 110;
    if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) { buf[o2] = INK_RGB[0]; buf[o2 + 1] = INK_RGB[1]; buf[o2 + 2] = INK_RGB[2]; buf[o2 + 3] = 255; }
  }
};
// (kept for the kit: a stone standing on the ground at (x, gy))
const rockBody = (ctx, x, gy, w, h, col, cap, seed) => {
  facetStone(ctx, x, gy, w, w * 0.55, h, col, seed, { shade: true });
  rockPiece(ctx, x, gy, w, w * 0.55, h, col, seed, { cap });
};

// Rocks come in four kinds: a shouldered boulder with a stone at its foot, a
// low slab half sunk in the turf, a tall split stone, and a knot of three.
// Each is a few faceted stones, their shadows laid first, then each stone
// back to front.
const boulder = (ctx, x, y, s, base, cap, seed, v = 0, o = {}) => {
  const gy = y + 8;
  const w = (9 + hash(seed, 1) * 2) * s;
  const st = [];
  if (v === 1) st.push([x, gy - 0.5 * s, w * 1.15, w * 0.62, 8 * s, base, seed]);
  else if (v === 3) {
    st.push([x - w * 0.45, gy - 1.5 * s, w * 0.62, w * 0.45, 10 * s, darken(base, 0.04), seed + 1]);
    st.push([x + w * 0.5, gy - 0.8 * s, w * 0.55, w * 0.4, 8 * s, base, seed + 2]);
    st.push([x - w * 0.02, gy + 1.8 * s, w * 0.46, w * 0.34, 5.5 * s, lighten(base, 0.05), seed + 3]);
  } else if (v === 2) {
    st.push([x - w * 0.12, gy - 0.5 * s, w * 0.7, w * 0.48, 17 * s, base, seed]);
    st.push([x + w * 0.62, gy + 0.8 * s, w * 0.42, w * 0.32, 7 * s, darken(base, 0.06), seed + 7]);
  } else {
    st.push([x, gy - 0.5 * s, w, w * 0.6, 12 * s, base, seed]);
    st.push([x + w * 0.95, gy + 1.2 * s, w * 0.4, w * 0.3, 5 * s, darken(base, 0.06), seed + 7]);
  }
  for (const [sx, sy, sw, sd, sh, , sd2] of st) facetStone(ctx, sx, sy, sw, sd, sh, base, sd2, { shade: true });
  st.sort((p, q) => p[1] - q[1]);
  for (const [sx, sy, sw, sd, sh, col, sd2] of st) rockPiece(ctx, sx, sy, sw, sd, sh, col, sd2, { cap: sh > 6 * s ? cap : null, ...o });
};

// Low things tucked round a piece's foot once it's inked: the realm's own
// grass — the meadow's pixel clumps (groundblend.js), singed stalks on ash,
// dry stalks through snow, reeds on the moor — and a pebble or two. Painted
// in art pixels on the bake. Round a stone the clumps stand at its flanks,
// BEHIND its silhouette (they only fill empty pixels), one small clump and
// the pebbles in front of its front edge; round a trunk they crowd its foot.
const dressCols = (r = REALM) => {
  const kind = groundKind(r);
  if (kind === "ash") return ["#2e2622", "#54463a", "#7e684c", "#a88a60"];
  if (kind === "snow") return ["#6e6a5c", "#9a947e", "#c4bca0", "#e2dac4"];
  if (kind === "marsh") return [darken(r.TUFT, 0.1), r.TUFT, mix(r.GRASS_LT, "#c8bc88", 0.35), lighten(r.GRASS_LT, 0.3)];
  if (kind === "turf") return [r.TUFT, mix(r.TUFT, r.GRASS, 0.55), mix(r.GRASS_LT, "#c8bc88", 0.4), mix(r.GRASS_LT, "#e0d49c", 0.5)];
  return [r.TUFT, mix(r.TUFT, r.GRASS, 0.55), mix(r.GRASS, r.GRASS_LT, 0.6), lighten(r.GRASS_LT, 0.22)];
};
// art-pixel painters over a canvas's pixels: put() (skipping solid pixels
// while `behind` is set) and shade(), then done() lays them back
const pxPainter = (ctx) => {
  const cv = ctx.canvas, CW = cv.width, CH = cv.height;
  const img = ctx.getImageData(0, 0, CW, CH), dd = img.data;
  const P = { behind: false };
  P.put = (px, py, col) => {
    if (px < 0 || py < 0 || px >= CW || py >= CH) return;
    const o = (py * CW + px) * 4;
    if (P.behind && dd[o + 3] > 200) return;
    const c = typeof col === "string" ? rgb(col) : col;
    dd[o] = c[0]; dd[o + 1] = c[1]; dd[o + 2] = c[2]; dd[o + 3] = 255;
  };
  P.shade = (px, py) => {
    if (px < 0 || py < 0 || px >= CW || py >= CH) return;
    const o = (py * CW + px) * 4;
    if (dd[o + 3] > 200) return;
    const a = 0.2, a0 = dd[o + 3] / 255, ao = a + a0 * (1 - a);
    dd[o] = Math.round((28 * a + dd[o] * a0 * (1 - a)) / ao); dd[o + 1] = Math.round((20 * a + dd[o + 1] * a0 * (1 - a)) / ao); dd[o + 2] = Math.round((30 * a + dd[o + 2] * a0 * (1 - a)) / ao);
    dd[o + 3] = Math.round(ao * 255);
  };
  P.done = () => ctx.putImageData(img, 0, 0);
  return P;
};
// a pebble in art pixels: lit top-left, dark underside, a crumb of shadow
const pxPebble = (put, shade, cx, cy, w, col) => {
  const lt = lighten(col, 0.3), dk = darken(col, 0.35);
  for (let i = 0; i < w; i++) { put(cx + i, cy, i === 0 ? lt : col); put(cx + i, cy + 1, i === w - 1 ? dk : col); }
  put(cx, cy - 1 + (w > 2 ? 0 : 1), lt);
  for (let i = 1; i <= w; i++) shade(cx + i, cy + 2);
};
// (x, y) the piece's foot (a stone's centre line), w its half-width
const groundDress = (ctx, x, y, w, seed, stones = false) => {
  const m = ctx.getTransform(), k = m.a;
  const X = (v) => Math.round(v * k + m.e), Y = (v) => Math.round(v * m.d + m.f);
  const P = pxPainter(ctx);
  const r = REALM, kind = groundKind(r), cols = dressCols(r);
  const sz = kind === "snow" ? 0.4 : kind === "turf" ? 0.42 : 0.5;
  const nb = (kind === "snow" ? 2 : 3);
  const n = 2 + Math.floor(hash(seed, 50) * 2);
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    if (kind === "snow" && hash(seed, i + 57) < 0.45) continue;
    if (stones) {
      // at the stone's flanks, rising from behind it
      P.behind = true;
      pixelTuft(P.put, P.shade, X(x + side * (w + 1 + hash(seed, i + 51) * 1.5)), Y(y + hash(seed, i + 55) * 1.2), sz, seed + i, cols, { n: nb + Math.floor(hash(seed, i + 58) * 2) });
    } else {
      P.behind = false;
      pixelTuft(P.put, P.shade, X(x + side * w * (0.55 + hash(seed, i + 51) * 0.5)), Y(y + 0.5 + hash(seed, i + 55) * 1.5), sz + 0.05, seed + i, cols, { n: nb + Math.floor(hash(seed, i + 58) * 2) });
    }
  }
  if (stones) {
    P.behind = false;
    const front = y + 0.6 * w;
    // one low clump at the front foot, and pebbles just in front of it
    if (kind !== "snow") pixelTuft(P.put, P.shade, X(x - w * (0.35 + hash(seed, 66) * 0.3)), Y(front + 0.5), sz * 0.8, seed + 9, cols, { n: 3 });
    const pc = kind === "snow" ? "#9fb0c0" : kind === "ash" ? "#5a4c46" : mix(r.PEBBLE || "#b0a898", r.GRASS_DK, 0.15);
    for (let i = 0; i < 2; i++) pxPebble(P.put, P.shade, X(x + (hash(seed, i + 60) - 0.3) * w * 1.3), Y(front + 1 + hash(seed, i + 62) * 1.5), 2 + Math.round(hash(seed, i + 64)), pc);
  }
  P.done();
};

// A tapered limb along a bent line: lit along the side facing the sun,
// shaded along the other, inked on its own. Used for dead trees' trunks and
// branches.
const limbFill = (c, pts, w0, w1, col) => {
  const L = [], Rr = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[Math.min(n - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    let dx = q[0] - o[0], dy = q[1] - o[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = w0 + (w1 - w0) * (i / (n - 1));
    L.push([p[0] - dy * w, p[1] + dx * w]); Rr.push([p[0] + dy * w, p[1] - dx * w]);
  }
  c.beginPath();
  c.moveTo(L[0][0], L[0][1]);
  for (const p of L) c.lineTo(p[0], p[1]);
  for (let i = Rr.length - 1; i >= 0; i--) c.lineTo(Rr[i][0], Rr[i][1]);
  c.closePath();
  const [ax, ay] = pts[0], [bx, by] = pts[n - 1];
  // across the limb, from its sunny side to its shaded one
  let nx = -(by - ay), ny = bx - ax;
  const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
  if (nx * SUN.x + ny * SUN.y < 0) { nx = -nx; ny = -ny; }
  const mx = (ax + bx) / 2, my = (ay + by) / 2, W = Math.max(w0, w1) * 1.1;
  c.fillStyle = lin(c, mx + nx * W, my + ny * W, mx - nx * W, my - ny * W, [[0, lighten(col, 0.32)], [0.5, col], [1, darken(col, 0.45)]]);
  c.fill();
};
const limb = (ctx, pts, w0, w1, col, box) => leafPart(ctx, (c) => limbFill(c, pts, w0, w1, col), INK, box, null);

// A dead tree: a flared, leaning trunk snapped off at the top, a few crooked
// limbs forking into twigs. Where the country burns, the wood is charred
// black and a seam or two still glows.
const deadTree = (ctx, x, y, s, seed = 1) => {
  const H = (i) => hash(seed, i);
  const base = y + 10;
  const burnt = REALM.ambient === "embers";
  const col = burnt ? "#3e3432" : "#6e5a4a";
  shadow(ctx, x + 6 * s, base - 1, 10 * s, 3.2 * s, 0.26);
  shadow(ctx, x + 1.5 * s, base, 5 * s, 1.8 * s, 0.3);
  const lean = (H(1) - 0.5) * 5 * s, tall = (30 + H(2) * 8) * s;
  const tp = (k) => [x + lean * k * k + Math.sin(k * 5 + seed) * 1.2 * s, base - tall * k];
  const box = [x - 24 * s, base - tall - 12 * s, x + 24 * s, base + 3];
  // the whole tree is one piece, so its limbs grow out of it without seams
  leafPart(ctx, (c) => {
    limbFill(c, [[x - 1, base - 3 * s], [x - 4 * s, base - 0.5 * s], [x - 6.5 * s, base + 0.5]], 1.6 * s, 0.5 * s, col);
    limbFill(c, [[x + 1, base - 3 * s], [x + 4.5 * s, base - 0.5 * s], [x + 7 * s, base + 0.5]], 1.5 * s, 0.5 * s, col);
    const trunk = [];
    for (let k = 0; k <= 6; k++) trunk.push(tp(k / 6));
    // limbs: out and up, each with a twig forking off
    const nL = 3 + Math.floor(H(3) * 2);
    for (let i = 0; i < nL; i++) {
      const k = 0.42 + (i / nL) * 0.5 + (H(i + 10) - 0.5) * 0.08;
      const side = i % 2 ? 1 : -1;
      const [sx, sy] = tp(k);
      const len = (9 + H(i + 20) * 7) * s * (1.1 - k * 0.4), rise = (5 + H(i + 30) * 7) * s;
      const ex = sx + side * len, ey = sy - rise;
      const mx2 = sx + side * len * 0.5, my2 = sy - rise * 0.25 + (H(i + 40) - 0.5) * 3 * s;
      limbFill(c, [[sx, sy], [mx2, my2], [ex, ey]], 1.05 * s, 0.35 * s, col);
      const tx2 = mx2 + side * len * 0.2, ty2 = my2 - rise * 0.9;
      limbFill(c, [[mx2, my2], [(mx2 + tx2) / 2 + side * 0.5 * s, (my2 + ty2) / 2], [tx2, ty2]], 0.6 * s, 0.25 * s, col);
      limbFill(c, [[ex, ey], [ex + side * 2.5 * s, ey - 3.5 * s]], 0.4 * s, 0.25 * s, col);
    }
    limbFill(c, trunk, 2.8 * s, 1.2 * s, col);
  }, INK, box, null);
  // the snapped top: a pale splinter of bare wood
  const [kx, ky] = tp(1);
  ctx.fillStyle = burnt ? "#6a5a52" : "#c8b08a";
  ctx.fillRect(ap(kx - 0.5), ap(ky - 1), 1, 1); ctx.fillRect(ap(kx), ap(ky - 2), 0.5, 1);
  // bark: a few dark seams down the trunk; embers in the burnt wood
  for (let i = 0; i < 4; i++) {
    const [bx, by] = tp(0.12 + H(i + 60) * 0.7);
    ctx.fillStyle = darken(col, 0.45); ctx.fillRect(ap(bx + (H(i + 70) - 0.3) * 2 * s), ap(by), 0.5, 1.5 + H(i + 80) * 2);
    if (burnt && H(i + 90) < 0.5) { ctx.fillStyle = H(i + 95) < 0.5 ? "#e8703a" : "#f0a04a"; ctx.fillRect(ap(bx - 0.5), ap(by + 1), 0.5, 1); }
  }
};

// A weeping willow: a short trunk, a crown of leaf clumps, and curtains of
// hanging strands falling nearly to the ground, lit on the sunny side.
const willow = (ctx, x, y, s, sway, seed = 1) => {
  const H = (i) => hash(seed, i);
  const base = y + 12;
  const leaf = "#5f8a44";
  shadow(ctx, x + 7 * s, base - 1, 16 * s, 5 * s, 0.24);
  shadow(ctx, x + 2 * s, base, 7 * s, 2.2 * s, 0.3);
  const box = [x - 26 * s, y - 34 * s, x + 26 * s, base + 3];
  limb(ctx, [[x - 0.5, base], [x + 0.5 * s, base - 7 * s], [x + 1.5 * s, base - 14 * s]], 2.8 * s, 1.8 * s, "#5a4230", box);
  limb(ctx, [[x - 1, base - 1], [x - 5 * s, base + 0.3]], 1.4 * s, 0.4 * s, "#5a4230", box);
  limb(ctx, [[x + 1, base - 1], [x + 5.5 * s, base + 0.4]], 1.3 * s, 0.4 * s, "#5a4230", box);
  const cx = x + 1.5 * s + sway * 0.3, cy = y - 16 * s;
  // the dark under-crown, then clumps round the top
  leafPart(ctx, (c) => { blobPath(c, cx, cy + 4 * s, 16 * s, 9 * s, seed + 11, 0.14, 12); c.fillStyle = darken(leaf, 0.5); c.fill(); }, INK, [cx - 20 * s, cy - 8 * s, cx + 20 * s, cy + 16 * s]);
  const clumps = [[-9, 3, 7.5], [9, 3, 7.5], [-4, -4, 8], [5, -3, 7.5], [0, 3, 8]];
  clumps.sort((p, q) => p[1] - q[1]);
  clumps.forEach(([px, py, r], i) => {
    const kx = cx + px * s, ky = cy + py * s, rr = r * s;
    const lit = 0.5 + ((px / 14) * SUN.x + (py / 8) * SUN.y) * 1.3;
    leafPart(ctx, (c) => leafClump(c, kx, ky, rr, leaf, seed * 7 + i * 13, lit), darken(leaf, 0.72), [kx - rr * 1.35, ky - rr * 1.25, kx + rr * 1.35, ky + rr * 1.2]);
  });
  // the curtains: a few locks of hanging leaves with gaps between them —
  // short at the sides, longest in front, each tapering to 1-px strands; the
  // sun-side locks lit, a deep shade curtain behind them
  leafPart(ctx, (c) => {
    const px = (X, Y, col) => { c.fillStyle = col; c.fillRect(ap(X), ap(Y), 0.5, 0.5); };
    // the shade behind: short, dark, parted over the trunk
    for (let u = -0.62; u <= 0.62; u += 0.5 / (17 * s)) {
      if (Math.abs(u) < 0.14) continue;
      const X = cx + u * 17 * s, top = cy + (4 + (1 - u * u) * 3) * s, len = (4 + (1 - Math.abs(u)) * 5 + hash(Math.round(u * 40), seed) * 2) * s;
      for (let t = 0; t < len; t += 0.5) px(X + sway * (t / len), top + t, darken(leaf, 0.5));
    }
    const locks = 5 + Math.floor(H(88) * 2);
    for (let L = 0; L < locks; L++) {
      const u = ((L + 0.5) / locks) * 2 - 1 + (H(L + 90) - 0.5) * 0.14;
      const lw = (1.8 + H(L + 95) * 1.2) * s;
      const sx0 = cx + u * 16.5 * s;
      const top = cy + (3.5 + (1 - u * u) * 3) * s;
      const len = (5 + (1 - Math.abs(u)) * 13 + H(L + 30) * 4) * s;
      const lit = u < -0.25 ? 1 : u > 0.35 ? -1 : 0;
      const b0 = lit > 0 ? lighten(leaf, 0.12) : lit < 0 ? darken(leaf, 0.2) : leaf;
      const hi = lighten(b0, lit > 0 ? 0.3 : 0.16), dk = darken(b0, 0.3), mid = darken(b0, 0.12);
      for (let t = 0; t < len; t += 0.5) {
        const k = t / len;
        const half = lw * Math.max(0, 1 - Math.pow(k, 1.4));
        const X0 = sx0 + sway * k * 1.4 + Math.sin(k * 2.6 + L) * 0.5 * s;
        // the lower third parts into strands
        for (let q = -half; q <= half + 0.01; q += 0.5) {
          const col = Math.round((q + half) * 2);
          if (k > 0.55 && col % 2 === 1) continue;
          const edgeL = q < -half + 0.6, edgeR = q > half - 0.6;
          // hanging strands: a faint vertical grain, a few loose lit leaves
          const fleck = hash(L * 97 + col, Math.floor(t * 2) + seed) < (lit > 0 ? 0.16 : 0.08);
          px(X0 + q, top + t, edgeL ? hi : edgeR ? dk : fleck ? hi : col % 3 === 2 ? mid : b0);
        }
        // the strands' tips: a pixel or two past the lock's end
        if (k > 0.9 && H(L + 70) < 0.6) px(X0 + (H(L + 72) - 0.5) * lw, top + len + (H(L + 74) * 2) * 0.5, b0);
      }
    }
  }, darken(leaf, 0.72), [cx - 22 * s, cy, cx + 22 * s, base + 4], "under");
};

// ---- small things of the old realms: toadstools, ice, vents --------------
// Their bodies bake with the rest of the decor; only a pulse, a glint or a
// rising ember is drawn live over the stamp (LIVE_BITS below).

// A toadstool ring: one big cap and two small ones, pale spots on purple.
const CAP = "#9a56c0";
const toadstool = (ctx, x, gy, r, h, cap, lean = 0) => {
  part(ctx, (c) => {
    // the stem, a little flared at the foot
    c.beginPath();
    c.moveTo(x - r * 0.3, gy - h); c.lineTo(x - r * 0.36 + lean, gy - 0.5); c.lineTo(x - r * 0.46, gy + 0.3); c.lineTo(x + r * 0.46, gy + 0.3); c.lineTo(x + r * 0.34 + lean, gy - 0.5); c.lineTo(x + r * 0.3, gy - h); c.closePath();
    c.fillStyle = lin(c, x - r * 0.4, 0, x + r * 0.4, 0, [[0, "#f0e8d4"], [0.5, "#d8cfb8"], [1, "#a89a88"]]);
    c.fill();
  });
  part(ctx, (c) => {
    const cy = gy - h;
    // gills under the rim, then the dome
    c.beginPath(); c.ellipse(x, cy, r, r * 0.34, 0, 0, Math.PI * 2); c.fillStyle = darken(cap, 0.5); c.fill();
    c.beginPath(); c.ellipse(x, cy - 0.3, r, r * 0.72, 0, Math.PI, Math.PI * 2); c.lineTo(x + r, cy - 0.3);
    c.ellipse(x, cy - 0.3, r, r * 0.22, 0, 0, Math.PI); c.closePath();
    c.fillStyle = lin(c, x - r * 0.7, cy - r * 0.8, x + r * 0.8, cy + r * 0.2, [[0, lighten(cap, 0.38)], [0.45, cap], [1, darken(cap, 0.38)]]);
    c.fill();
    // a lit arc on the upper left
    c.fillStyle = lighten(cap, 0.58);
    for (let a = 3.5; a < 4.4; a += 0.18) c.fillRect(ap(x + Math.cos(a) * r * 0.62), ap(cy - 0.3 + Math.sin(a) * r * 0.5), 0.5, 0.5);
  });
};
const mushSpots = (x, gy, s) => [[-4, -12.5, 1.5], [1.5, -14, 1.5], [4.5, -11.5, 1], [-1, -11, 1]].map(([dx, dy, r]) => [x + dx * s, gy + dy * s, r * s]);
const mushroom = (ctx, x, y, s) => {
  const gy = y + 9;
  shadow(ctx, x + 4 * s, gy, 10 * s, 2.6 * s, 0.24);
  toadstool(ctx, x - 7 * s, gy + 0.5, 3 * s, 3.5 * s, darken(CAP, 0.08), -0.3);
  toadstool(ctx, x, gy - 0.5, 8 * s, 9 * s, CAP, 0.4);
  toadstool(ctx, x + 7 * s, gy + 1, 3.8 * s, 4.5 * s, lighten(CAP, 0.05), 0.2);
  for (const [sx, sy, r] of mushSpots(x, gy - 0.5, s)) { ctx.fillStyle = "#eedaf6"; ctx.fillRect(ap(sx - r / 2), ap(sy - r / 3), ap(r), Math.max(0.5, ap(r * 0.6))); }
};
const mushroomLive = (ctx, x, y, s, time) => {
  const pulse = 0.5 + 0.5 * Math.sin(time * 1.8 + x);
  ctx.globalAlpha = 0.25 + pulse * 0.6;
  ctx.fillStyle = "#fff4ff";
  for (const [sx, sy, r] of mushSpots(x, y + 8.5, s)) ctx.fillRect(ap(sx - r / 2), ap(sy - r / 3), ap(r), Math.max(0.5, ap(r * 0.6)));
  // a spore drifting up off the cap
  const rise = (time * 6 + x * 3) % 20;
  ctx.globalAlpha = Math.max(0, 0.9 - rise / 20);
  ctx.fillStyle = "#e8c8ff";
  ctx.fillRect(ap(x + Math.sin(time * 1.3 + x) * 3 * s), ap(y - 6 * s - rise), 0.5, 0.5);
  ctx.globalAlpha = 1;
};

// Reeds: stalks, leaves and bulrush heads — pixel stalks, a handful of sway
// poses baked once and stamped (the ponds and the moor draw hundreds a second).
const REEDS = new Map();
const reedsSprite = (s, f, v) => {
  const key = `${s}|${f}|${v}`;
  let sp = REEDS.get(key);
  if (sp) return sp;
  const W2 = Math.ceil(14 * s + 4), H2 = Math.ceil(24 * s + 4);
  const sway = (f - 1.5) * 0.9;
  const cv = bakeSprite(W2 * 2, H2, (c) => {
    const bx = W2, by = H2 - 1.5;
    const stalks = [[-6, 13], [-2, 18], [2, 15], [6, 11], [0, 10], [-4, 8], [4, 7]];
    stalks.forEach(([ox, hh], i) => {
      const h = hh * s * (0.9 + hash(v, i) * 0.2), sx = bx + ox * s;
      const col = i % 2 ? "#6a8448" : "#58743e";
      const leafy = i >= 5;
      for (let t = 0; t < h; t += 0.5) {
        const k = t / h;
        const X = ap(sx + sway * k * k * (leafy ? 1.6 : 1) + (leafy ? (ox < 0 ? -1 : 1) * k * k * 3 : 0)), Y = ap(by - t);
        c.fillStyle = k > 0.75 ? lighten(col, 0.22) : k < 0.2 ? darken(col, 0.25) : col;
        c.fillRect(X, Y, 0.5, 0.5);
        c.fillStyle = darken(col, 0.45);
        if (!leafy) c.fillRect(X + 0.5, Y, 0.5, 0.5);
      }
      if (!leafy && i % 2 === 0) {
        // a bulrush head, lit on the left
        const X = ap(sx + sway * 0.7 - 0.5), Y = ap(by - h + 2 * s);
        c.fillStyle = "#3e2a1c"; c.fillRect(X - 0.5, Y - 0.5, 2.5, 4 * s + 1);
        c.fillStyle = "#6a4a2e"; c.fillRect(X, Y, 1.5, 4 * s);
        c.fillStyle = "#8e6a44"; c.fillRect(X, Y, 0.5, 4 * s - 0.5);
      }
    });
  }, false);
  sp = { cv, w: W2 * 2, h: H2 };
  REEDS.set(key, sp);
  return sp;
};
const reeds = (ctx, x, y, s, time) => {
  const f = Math.max(0, Math.min(3, Math.floor((Math.sin(time * 1.6 + x) + 1) * 2)));
  const sp = reedsSprite(Math.round(s * 10) / 10, f, Math.floor(hash(Math.round(x), Math.round(y)) * 3));
  ctx.drawImage(sp.cv, ap(x - sp.w / 2), ap(y + 9.5 - sp.h), sp.w, sp.h);
};

// Ice crystals: three faceted shards and the rubble they broke out of.
const shard = (ctx, x, gy, h, w, col, lean) => part(ctx, (c) => {
  const R = (px, py) => [x + px * Math.cos(lean) - py * Math.sin(lean), gy + px * Math.sin(lean) + py * Math.cos(lean)];
  const bl = R(-w, 0.5), br = R(w, 0.5), sl = R(-w, -h * 0.7), sr = R(w, -h * 0.7), tip = R(0, -h), ml = R(-w * 0.1, 0.5), mt = R(-w * 0.1, -h * 0.72);
  const poly = (pts, fill) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.closePath(); c.fillStyle = fill; c.fill(); };
  poly([bl, sl, mt, ml], lighten(col, 0.42));
  poly([ml, mt, sr, br], darken(col, 0.18));
  poly([sl, tip, mt], lighten(col, 0.7));
  poly([mt, tip, sr], col);
  // the ridge catches the light, and a pale streak inside the ice
  // (a solid line on its upper half only)
  c.fillStyle = "#ffffff";
  for (let t = 0.48; t < 0.98; t += 0.25 / h) { const [px, py] = R(-w * 0.1, -h * 0.72 * t); c.fillRect(ap(px), ap(py), 0.5, 0.5); }
  const [qx, qy] = R(-w * 0.55, -h * 0.35); c.fillStyle = lighten(col, 0.85); c.fillRect(ap(qx), ap(qy), 0.5, ap(h * 0.25));
});
const CRYSTALS = [[-6, 9, 2.6, "#5a94b0", -0.3], [6, 11, 2.8, "#6cb4d4", 0.32], [0, 16, 3.4, "#8fd0e8", 0.04]];
const crystal = (ctx, x, y, s) => {
  const gy = y + 9;
  facetStone(ctx, x, gy, 9 * s, 3.5 * s, 4 * s, "#7c8c9c", 11, { shade: true });
  for (const [ox, hh, ww, col, lean] of CRYSTALS) shard(ctx, x + ox * s, gy, hh * s, ww * s, col, lean);
  rockPiece(ctx, x - 5 * s, gy + 1.2, 3.2 * s, 2 * s, 2.4 * s, "#7c8c9c", 11, {});
  rockPiece(ctx, x + 5 * s, gy + 1.5, 2.6 * s, 1.8 * s, 2 * s, "#7c8c9c", 12, {});
};
const crystalLive = (ctx, x, y, s, time) => {
  const g = Math.sin(time * 3 + x);
  if (g < 0.8) return;
  // a four-point glint at the tallest tip
  const tx = ap(x + 16 * s * Math.sin(0.04)), ty = ap(y + 9 - 16 * s);
  ctx.globalAlpha = (g - 0.8) * 5;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(tx - 1.5, ty, 3.5, 0.5); ctx.fillRect(tx, ty - 1.5, 0.5, 3.5);
  ctx.fillStyle = "#dff4ff"; ctx.fillRect(tx - 0.5, ty - 0.5, 1.5, 1.5);
  ctx.globalAlpha = 1;
};

// A fumarole: a low cone of cinders with a glowing throat and hot seams.
const vent = (ctx, x, y, s) => {
  const gy = y + 9;
  facetStone(ctx, x, gy, 11 * s, 7 * s, 6 * s, "#3d3437", 21, { shade: true });
  rockPiece(ctx, x, gy, 11 * s, 7 * s, 6 * s, "#4a3e42", 21, {});
  // the throat: a dark rim round a hot core, in hard bands
  // (a ragged hole, two hot bands, the hottest set toward the back wall
  // where the eye looks down into it; cone stones break its rim)
  const cy = gy - 5.2 * s - 1;
  ctx.fillStyle = "#1c1418"; blobPath(ctx, x, cy, 4.6 * s, 2.3 * s, 31, 0.28, 8); ctx.fill();
  ctx.fillStyle = "#a8402a"; blobPath(ctx, x + 0.3, cy - 0.2, 3.3 * s, 1.5 * s, 32, 0.3, 8); ctx.fill();
  ctx.fillStyle = "#f08a3c"; blobPath(ctx, x + 0.5, cy - 0.6, 1.9 * s, 0.8 * s, 33, 0.3, 7); ctx.fill();
  for (const [dx, dy, r, sd] of [[-3.4, 1.7, 1.6, 41], [3.6, 1.3, 1.3, 42], [0.6, 2.2, 1.1, 43]]) {
    facetStone(ctx, x + dx * s, cy + dy * s, r * s, r * 0.7 * s, r * 0.9 * s, "#4a3e42", sd, { shade: true });
    rockPiece(ctx, x + dx * s, cy + dy * s, r * s, r * 0.7 * s, r * 0.9 * s, "#564a4e", sd, {});
  }
  // hot seams running down the cone
  ctx.fillStyle = "#e8703a";
  for (const [dx, len] of [[-5, 3], [3.5, 2.5], [6.5, 2]]) for (let t = 0; t < len; t += 0.5) ctx.fillRect(ap(x + dx * s + t * 0.3), ap(cy + 2 + t), 0.5, 0.5);
};
const ventLive = (ctx, x, y, s, time) => {
  const hot = 0.5 + 0.5 * Math.sin(time * 4 + x);
  const cy = y + 9 - 5.2 * s - 1.5;
  ctx.globalAlpha = 0.25 + hot * 0.65;
  ctx.fillStyle = "#fff0b0"; ctx.fillRect(ap(x - 0.8 * s), ap(cy - 0.5), ap(2.4 * s), 0.5); ctx.fillRect(ap(x - 0.3 * s), ap(cy), ap(1.4 * s), 0.5);
  // an ember climbing out, and a wisp of smoke
  const rise = (time * 14 + x) % 22;
  ctx.globalAlpha = Math.max(0, 0.95 - rise / 22);
  ctx.fillStyle = rise < 8 ? "#ffd070" : "#f08a3c";
  ctx.fillRect(ap(x + Math.sin(time * 2 + x) * 3), ap(cy - 2 - rise), 0.5, 0.5);
  const sm = (time * 7 + x * 1.7) % 26;
  ctx.globalAlpha = Math.max(0, 0.35 - sm / 26 * 0.35);
  ctx.fillStyle = "#8a7e7a";
  ctx.fillRect(ap(x - 1 + Math.sin(time + x) * 2 + sm * 0.2), ap(cy - 3 - sm), 1.5, 1);
  ctx.globalAlpha = 1;
};
const LIVE_BITS = { mushroom: mushroomLive, crystal: crystalLive, vent: ventLive };

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

// A cairn: flat faceted slabs stacked and shifted, moss in the lowest joint.
const cairn = (ctx, x, y, s) => {
  const gy = y + 8;
  facetStone(ctx, x, gy, 7.5 * s, 4.6 * s, 13 * s, STONE, 5, { shade: true });
  [[7.6, 2.8, 0, 0], [6, 2.6, -0.9, 3.8], [4.6, 2.6, 0.8, 7.2], [3.2, 2.6, -0.4, 10.4]].forEach(([w, h, ox, lift], i) => {
    ctx.save(); ctx.translate(0, -lift * s);
    rockPiece(ctx, x + ox * s, gy - i * 0.3, w * s, w * 0.6 * s, h * s, lighten(STONE, i * 0.05), 51 + i * 7, { cap: i === 0 ? mix("#5d8f3a", REALM.GRASS_DK, 0.3) : null, lichen: "#c4c49a" });
    ctx.restore();
  });
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
export const resetSceneryBakes = () => { SPRITES.clear(); GATE.key = ""; SIGN.key = ""; resetCastleBakes(); };
// the chapters' own pieces (scenery-iron.js, scenery-hollow.js) join the kit.
// Gathered on first use, never at load: those files import this one back,
// so whichever loads first, the other's registry isn't ready yet at load.
let REG = null;
const reg = () => REG || (REG = (() => {
  const ART = [IRON_ART, HOLLOW_ART];
  return {
    decor: Object.assign({}, ...ART.map((a) => a.decor)),
    box: Object.assign({}, ...ART.map((a) => a.box)),
    dress: Object.assign({}, ...ART.map((a) => a.dress)),
    spawn: Object.assign({}, ...ART.map((a) => a.spawn)),
    live: new Set(["obelisk", "watchtower", "banner", "reeds", ...ART.flatMap((a) => a.live)]),
  };
})());
const paintDecor = (ctx, d, time) => {
  const x = d.x, y = d.y, s = d.s || 1;
  const seed = d.seed ?? Math.round(d.x * 3 + d.y * 7);
  const v = d.v || 0, band = d.band || 0;
  const sway = d.forest ? 0 : Math.sin(time * 0.8 + d.x * 0.06 + d.y * 0.03) * 1.4;
  const extra = reg().decor[d.t];
  if (extra) { extra(ctx, x, y, s, { seed, v, band, time, forest: !!d.forest, sway }); return; }
  switch (d.t) {
    case "pine": pineTree(ctx, x, y, s, d.forest ? WOOD_PINE[band][v % 3] : PINE_TINTS[v % 4], PINE.trunk, seed); break;
    case "snowpine": pineTree(ctx, x, y, s, SNOWPINE.leaf, SNOWPINE.trunk, seed, "#eef5f8"); break;
    case "rock": boulder(ctx, x, y, s, "#a6a296", mix("#557f35", REALM.GRASS_DK, 0.35), seed, v, { lichen: "#c4c49a" }); break;
    case "icerock": boulder(ctx, x, y, s, "#9fb6c6", "#eef5f8", seed, v, { snow: true }); break;
    case "obsidian": boulder(ctx, x, y, s, "#3c3448", null, seed, v, { gloss: true }); break;
    case "crystal": crystal(ctx, x, y, s); break;
    case "deadtree": deadTree(ctx, x, y, s, seed); break;
    case "vent": vent(ctx, x, y, s); break;
    case "willow": willow(ctx, x, y, s, sway, seed); break;
    case "mushroom": mushroom(ctx, x, y, s); break;
    case "reeds": reeds(ctx, x, y, s, time); break;
    case "gravestone": gravestone(ctx, x, y, s, seed); break;
    case "cairn": cairn(ctx, x, y, s); break;
    case "boneheap": boneheap(ctx, x, y, s); break;
    case "obelisk": obelisk(ctx, x, y, s, time); break;
    case "watchtower": watchtower(ctx, x, y, s, time); break;
    case "tent": tent(ctx, x, y, s); break;
    case "banner": banner(ctx, x, y, s, time); break;
    case "tree": oakTree(ctx, x, y, s, d.forest ? WOOD_OAK[band][v % 3] : OAK_TINTS[v % 4], OAK.trunk, seed); break;
    default: boulder(ctx, x, y, s, "#a6a296", "#6a9440", seed, v, { lichen: "#c4c49a" });
  }
};
// What gets tucked in around a piece's foot once it's inked.
const DRESS = { tree: [4, false], pine: [3.5, false], snowpine: [3.5, false], rock: [9, true], icerock: [9, true], deadtree: [4, false], willow: [5, false], mushroom: [8, false], crystal: [8, false] };
// Which look a piece gets: lone pieces pick one of four by where they stand;
// the wood's trees pick by how deep in it they are (three bands), then one
// of two shapes. Sizes are rounded so the wood shares a modest set of bakes.
// Stones split each look into three seeded shapes and wander a little in
// size, so a rocky board doesn't repeat one stamp.
const STONY = new Set(["rock", "icerock", "obsidian"]);
const variantOf = (d) => {
  const hv = hash(Math.round(d.x), Math.round(d.y));
  if (!d.forest) {
    if (!STONY.has(d.t)) return { v: Math.floor(hv * 4), band: 0, s: Math.round((d.s || 1) * 10) / 10, sd: 0 };
    const h2 = hash(Math.round(d.x) + 7, Math.round(d.y) + 3);
    return { v: Math.floor(hv * 4), band: 0, s: Math.round((d.s || 1) * (0.92 + hash(Math.round(d.y), Math.round(d.x)) * 0.17) * 10) / 10, sd: Math.floor(h2 * 3) };
  }
  const dep = forestDepthAt(d.x, d.y);
  return { v: Math.floor(hv * 2), band: dep > 46 ? 2 : dep > 16 ? 1 : 0, s: Math.round((d.s || 1) * 4) / 4, sd: 0 };
};
const decorSprite = (d) => {
  const { v, band, s, sd } = variantOf(d);
  const key = `${d.t}|${s}|${v}|${band}|${sd}|${d.forest ? "f" : ""}|${REALM.GRASS}`;
  let sp = SPRITES.get(key);
  if (sp) return sp;
  const tall = d.t === "tree" || d.t === "pine" || d.t === "snowpine" || d.t === "deadtree" || d.t === "willow";
  const [bw, bt] = reg().box[d.t] || (tall ? [27, 48] : [38, 42]);
  const hw = Math.ceil(bw * s + (tall ? 6 : 8)), top = Math.ceil(bt * s + (tall ? 6 : 8)), bot = Math.ceil(12 + 6 * s);
  const seed = 7 + v * 131 + band * 1009 + Math.round(s * 10) * 17 + d.t.length * 29 + sd * 577;
  const cv = bakeSprite(hw * 2, top + bot, (c) => {
    BAKE_CV = c.canvas;
    try { paintDecor(c, { ...d, x: hw, y: top, s, v, band, seed }, 0); } finally { BAKE_CV = null; }
  });
  const dress = DRESS[d.t] || reg().dress[d.t];
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

// The wood round the gate's crag: a tree whose foot stands on the crag's top
// is drawn standing up there; one on its face, or whose crown would hide the
// cave mouth, is left out — the clearing in front of the cave. (Rendering
// only: the trees stay in DECOR, and the forest band isn't buildable anyway.)
const gateTree = (d) => {
  let m = GATE.trees.get(d);
  if (m !== undefined) return m;
  m = 0;
  if (d.x >= 0 && d.x <= W && d.y >= 0 && d.y <= H) {
    const z = GATE.hAt(d.x, d.y);
    const slope = Math.abs(GATE.hAt(d.x, d.y + 3) - GATE.hAt(d.x, d.y - 3)) / 6 + Math.abs(GATE.hAt(d.x + 3, d.y) - GATE.hAt(d.x - 3, d.y)) / 6;
    const s = d.s || 1;
    const [mx0, my0, mx1, my1] = GATE.mouthBox;
    const cx0 = d.x - 15 * s, cx1 = d.x + 15 * s, cy0 = d.y - 52 * s - z, cy1 = d.y + 10 - z;
    if (cx1 > mx0 && cx0 < mx1 && cy1 > my0 && cy0 < my1) m = -1;
    else if (z > 2.5 && (slope > 0.9 || z < GATE.top * 0.55)) m = -1;
    else if (z > 0.8) m = z;
  }
  GATE.trees.set(d, m);
  return m;
};
export const drawTree = (ctx, d, time) => {
  let lift = 0;
  if (d.forest && GATE.hAt && GATE.rid === REALM.id && (REALM.spawn === "grove" || !REALM.spawn)) {
    lift = gateTree(d);
    if (lift < 0) return;
  }
  if (lift) { ctx.save(); ctx.translate(0, -Math.round(lift * PX) / PX); }
  if (!reg().live.has(d.t) && typeof document !== "undefined") {
    const sp = decorSprite(d);
    ctx.drawImage(sp.cv, d.x - sp.hw, d.y - sp.top, sp.hw * 2, sp.top + sp.bot);
    const lb = LIVE_BITS[d.t];
    if (lb) lb(ctx, d.x, d.y, variantOf(d).s, time);
  } else paintDecor(ctx, { ...d, ...variantOf(d), s: d.s || 1 }, time);
  if (lift) ctx.restore();
};

// ---- water and bridges: src/render/water.js and src/render/bridge.js ----
export { drawRiver, drawPond } from "./water.js";
export { drawBridge } from "./bridge.js";

// ---- the enemy's gate -------------------------------------------------

export const drawSpawn = (ctx, time, kind) => {
  if (reg().spawn[kind]) reg().spawn[kind](ctx, time);
  else if (kind === "grove") drawGrove(ctx, time);
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

// The gate the horde comes out of: a cave in a crag at the board edge. The
// road runs into a hillside of layered rock — turf and moss on top, scree at
// its foot — through a dark mouth that faces down the road, turned a little
// toward the camera so the dark inside can be seen and whatever waits in it.
// The crag is a small heightfield drawn column by column the way the camera
// sees it (tops and south faces, the sun from the upper left), baked once per
// realm into one sprite together with the road's shade under the trees; only
// the eyes and a few falling leaves are live. Greenwood realms ("grove") get
// the wood's shade down the road to it; the old realms ("cave") a bare crag
// in their own stone — snow and icicles, moor moss, ash and cinder seams.
// each country's crag: its stone, what lies on top, what hangs over the mouth
const cragMat = (kind) => {
  const R = REALM;
  if (R.ambient === "snow") return { rock: "#8d9eae", top: R.GRASS, topDk: R.GRASS_DK, moss: null, hang: "ice", floor: R.PATH_DK, dark: [20, 22, 34], eyes: ["#e8503e", "#8ad0f0"], snow: true };
  if (R.ambient === "embers" && kind !== "grove") return { rock: "#4c4454", top: R.GRASS, topDk: R.GRASS_DK, moss: null, hang: "none", floor: R.PATH_DK, dark: [26, 14, 16], eyes: ["#f0b040", "#e8503e"], lava: "#f08a3c" };
  if (R.ambient === "fireflies") return { rock: "#77766a", top: R.GRASS, topDk: R.GRASS_DK, moss: "#56753c", hang: "roots", floor: R.PATH_DK, dark: [14, 16, 12], eyes: ["#c8f070", "#e8503e"] };
  return { rock: "#9b958a", top: R.GRASS, topDk: R.GRASS_DK, moss: mix("#5d8f3a", R.GRASS_DK, 0.3), hang: "roots", floor: R.PATH_DK, dark: [16, 14, 14], eyes: ["#e8503e", "#f0b040"] };
};

const GATE = { key: "", cv: null, x: 0, y: 0, w: 0, h: 0, eyes: [], leaves: [], lava: null, hAt: null, mouthBox: null, top: 0, trees: new Map() };
const bakeGate = (kind) => {
  const key = `${kind}|${REALM.id}|${PTS[0]}|${PTS.length}|${FOREST ? FOREST.seed : "-"}`;
  if (GATE.key === key) return GATE;
  GATE.key = key;
  const R = REALM, mat = cragMat(kind);
  const woody = kind === "grove";
  // the crag's shape lives in src/data/gatecrag.js, shared with buildableAt
  const C = gateCrag();
  if (!C) { GATE.cv = null; GATE.hAt = null; return GATE; }
  const { seed, mx, my, nx, ny, tx, ty, HW, S, HMAX, FL, onFace, archTop, hillAt, rocks } = C;
  // snow and ash lie plainer than turf: fewer tones, no outcrops on top
  const bare = !!(mat.snow || mat.lava);
  const hAt = hillAt;

  // ---- what the bake covers: the crag, and the road through the wood ----
  // (the crag's reach: along the face both ways, out to the flanks' feet
  // and back into the hill, raised by its height)
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const sv of [-128, 0, 128]) for (const fu of [FL + 10, -150]) {
    const px = mx + tx * sv + nx * fu, py = my + ty * sv + ny * fu;
    x0 = Math.min(x0, px - 10); x1 = Math.max(x1, px + 10); y0 = Math.min(y0, py - HMAX - 10); y1 = Math.max(y1, py + 10);
  }
  const inWood = [];
  for (let d = 0; d < TOTAL_LEN; d += 4) {
    const [x, y] = posAt(d);
    if (FOREST && forestDepthAt(x, y) < -30) break;
    if (!FOREST && d > 120) break;
    inWood.push([x, y, d]);
  }
  if (woody) for (const [x, y] of inWood) { x0 = Math.min(x0, x - PATH_HALF - 24); y0 = Math.min(y0, y - PATH_HALF - 24); x1 = Math.max(x1, x + PATH_HALF + 24); y1 = Math.max(y1, y + PATH_HALF + 24); }
  x0 = Math.floor(Math.max(0, x0)); y0 = Math.floor(Math.max(0, y0));
  x1 = Math.ceil(Math.min(W - WALL_W, x1)); y1 = Math.ceil(Math.min(H, y1));
  const w = x1 - x0, h = y1 - y0;
  const depthAt = (x, y) => (FOREST ? forestDepthAt(x, y) : 40 - Math.hypot(x - PTS[0][0], y - PTS[0][1]) * 0.5);

  GATE.cv = bakeSprite(w, h, (c) => {
    const cv = c.canvas, PW = cv.width, PH = cv.height;
    const img = c.getImageData(0, 0, PW, PH), dd = img.data;
    const put = (i, col, a = 255) => { const o = i * 4; dd[o] = col[0]; dd[o + 1] = col[1]; dd[o + 2] = col[2]; dd[o + 3] = a; };
    const blend = (i, col, a) => {
      const o = i * 4, a0 = dd[o + 3] / 255, k = a / 255, ao = k + a0 * (1 - k);
      if (ao <= 0) return;
      for (let q = 0; q < 3; q++) dd[o + q] = Math.round((col[q] * k + dd[o + q] * a0 * (1 - k)) / ao);
      dd[o + 3] = Math.round(ao * 255);
    };
    const wx = (px) => x0 + (px + 0.5) / PX, wy = (py) => y0 + (py + 0.5) / PX;

    // the wood's shade down the road: a few dithered steps, deepening toward the gate
    if (woody) {
      const nearRow = new Float32Array(PW);
      const shade = [18, 22, 16];
      const dEnd = inWood.length ? inWood[inWood.length - 1][2] + 80 : 200;
      const wsegs = SEGS.filter((sg) => sg.start < dEnd);
      const segD = (x, y) => {
        let best = 1e9;
        for (const sg of wsegs) {
          const vx = sg.x2 - sg.x1, vy = sg.y2 - sg.y1;
          const t = Math.max(0, Math.min(1, ((x - sg.x1) * vx + (y - sg.y1) * vy) / (sg.len * sg.len)));
          const ex = x - sg.x1 - vx * t, ey = y - sg.y1 - vy * t, d = ex * ex + ey * ey;
          if (d < best) best = d;
        }
        return Math.sqrt(best);
      };
      for (let py = 0; py < PH; py++) {
        if (py % PX === 0) for (let px = 0; px < PW; px += PX) {
          const x = wx(px), y = wy(py), v = segD(x, y);
          const a = v > PATH_HALF + 9 ? 0 : sstep(PATH_HALF + 9, PATH_HALF - 3, v) * Math.max(sstep(-10, 40, depthAt(x, y)) * 0.75, sstep(90, 20, Math.hypot(x - mx, y - my)));
          for (let q = 0; q < PX; q++) nearRow[px + q] = a;
        }
        for (let px = 0; px < PW; px++) {
          const a = nearRow[px];
          if (a <= 0) continue;
          // (hard steps whose edges break into two-pixel clumps, not a dither)
          const lvl = Math.min(3, Math.floor(a * 3 + 0.3 + (vnoise(px / 5, py / 5, seed + 23) - 0.5) * 0.5));
          if (lvl > 0) put(py * PW + px, shade, [0, 44, 84, 118][lvl]);
        }
      }
    }

    // ---- the crag's heightfield, one art pixel apart ----
    const GX = PW, GYn = Math.ceil((h + HMAX + 12) * PX);
    const Hg = new Float32Array(GX * GYn);
    let hmax = 0;
    // sampled a world unit apart, and filled in between (the crag's shapes
    // are broad; only its silhouette needs the art pixel)
    const STEP = 2, CX = Math.ceil(GX / PX / STEP) + 2, CY = Math.ceil(GYn / PX / STEP) + 2;
    const Hc = new Float32Array(CX * CY);
    for (let cy = 0; cy < CY; cy++) for (let cx = 0; cx < CX; cx++) Hc[cy * CX + cx] = hillAt(x0 + cx * STEP, y0 + cy * STEP);
    // (the fallen stones are faceted pieces of their own, laid on after)
    for (let gy = 0; gy < GYn; gy++) {
      const fy = (gy + 0.5) / PX / STEP, cy = Math.floor(fy), ty = fy - cy;
      for (let gx = 0; gx < GX; gx++) {
        const fx = (gx + 0.5) / PX / STEP, cx = Math.floor(fx), tx2 = fx - cx;
        const a = Hc[cy * CX + cx], b = Hc[cy * CX + cx + 1], c2 = Hc[(cy + 1) * CX + cx], d2 = Hc[(cy + 1) * CX + cx + 1];
        const z = (a * (1 - tx2) + b * tx2) * (1 - ty) + (c2 * (1 - tx2) + d2 * tx2) * ty;
        Hg[gy * GX + gx] = z; if (z > hmax) hmax = z;
      }
    }
    const Hs = (gx, gy) => Hg[Math.max(0, Math.min(GYn - 1, gy)) * GX + Math.max(0, Math.min(GX - 1, gx))];

    // colours
    const T = (c0) => rgb(c0);
    const rock = [lighten(mat.rock, 0.34), lighten(mat.rock, 0.12), mat.rock, darken(mat.rock, 0.3), darken(mat.rock, 0.52)].map(T);
    const top = [lighten(mat.top, 0.14), mat.top, mix(mat.top, mat.topDk, 0.55), darken(mat.topDk, 0.18), darken(mat.topDk, 0.4)].map(T);
    const moss = mat.moss ? [lighten(mat.moss, 0.22), mat.moss, darken(mat.moss, 0.3)].map(T) : mat.snow ? ["#f4f9fb", "#dde8ef", "#b4c4d2"].map(T) : null;
    const ink = T(INK), shadowC = [28, 20, 30];

    // sun: from the upper left and fairly high; shadows fall short, down-right
    const Lx = -0.391, Ly = -0.485, Lz = 0.782;
    const litAt = (gx, gy) => {
      const hx = (Hs(gx + 1, gy) - Hs(gx - 1, gy)) * PX / 2, hy = (Hs(gx, gy + 1) - Hs(gx, gy - 1)) * PX / 2;
      LG = Math.hypot(hx, hy);
      return (-Lx * hx - Ly * hy + Lz) / Math.sqrt(hx * hx + hy * hy + 1);
    };
    let LG = 0;
    const shaded = (gx, gy, z) => {
      for (let k = 1; k <= 14; k += 2) {
        const qx = gx - Math.round(0.586 * k * PX), qy = gy - Math.round(0.81 * k * PX);
        if (Hs(qx, qy) > z + k * 2.6) return true;
      }
      return false;
    };
    const tone = (l) => (l > 0.55 ? 0 : l > 0.28 ? 1 : l > -0.05 ? 2 : l > -0.3 ? 3 : 4);

    // the crag's own pixels: what covers each, and where in the world it is
    const kindPx = new Uint8Array(PW * PH);   // 0 none, 1 rock, 2 top, 3 turf lip, 4 low slope left to the field
    const zPx = new Float32Array(PW * PH), gyPx = new Int32Array(PW * PH), lPx = new Float32Array(PW * PH);
    const castPx = new Uint8Array(PW * PH);
    // ground shadow first (under everything the crag doesn't cover)
    // (tested a world unit at a time)
    if (hmax > 0) for (let py = 0; py < PH; py += PX) for (let px = 0; px < PW; px += PX) {
      if (!shaded(px, py, 0)) continue;
      for (let q = 0; q < PX; q++) for (let r = 0; r < PX; r++) if (py + q < PH && px + r < PW && Hs(px + r, py + q) <= 0.3) blend((py + q) * PW + px + r, shadowC, 70);
    }
    // the crag, front to back per column: each ground row paints from where
    // it stands on screen up to what's already painted in front of it
    if (hmax > 0) for (let px = 0; px < PW; px++) {
      let front = PH;
      for (let gy = GYn - 1; gy >= 0; gy--) {
        const z = Hg[gy * GX + px];
        if (z <= 0.35) { if (gy < front) front = gy; continue; }
        const sp = Math.floor(gy - z * PX);
        if (sp >= front) continue;
        const l = litAt(px, gy), g = LG;
        const cast = shaded(px, gy, z);
        for (let q = Math.max(0, sp); q < Math.min(front, PH); q++) {
          const i = q * PW + px;
          const steep = g > (bare ? 1.7 : 1.15) + (vnoise(px / 5, gy / 5, seed + 5) - 0.5) * 0.9 || q > sp + 1;
          kindPx[i] = steep ? 1 : 2;
          zPx[i] = z - (q - sp) / PX; gyPx[i] = gy; lPx[i] = l; castPx[i] = cast ? 1 : 0;
        }
        front = Math.max(0, sp);
        if (front <= 0) break;
      }
    }
    // stone in blocks: every rock pixel belongs to the nearest of a scatter
    // of seeds in 3D, so the face breaks into chunky facets, each tipped to
    // the sun a little differently
    const cellPx = new Int32Array(PW * PH);
    const vor = (x, y, z) => {
      const X = x / 17, Y = y / 17, Z = z / 8.5;
      const xi = Math.floor(X), yi = Math.floor(Y), zi = Math.floor(Z);
      // seeds sit in the middle of their cells, so only the two cells on
      // the near side along each axis can hold the nearest
      const sx = X - xi < 0.5 ? -1 : 1, sy = Y - yi < 0.5 ? -1 : 1, sz = Z - zi < 0.5 ? -1 : 1;
      let f1 = 99, id = 0;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let e = 0; e < 2; e++) {
        const cx = xi + a * sx, cy = yi + b * sy, cz = zi + e * sz;
        const qx = cx + 0.2 + 0.6 * hash(cx * 31 + cz + seed, cy) - X, qy = cy + 0.2 + 0.6 * hash(cy * 17 + cz, cx + seed) - Y, qz = cz + 0.2 + 0.6 * hash(cz * 13 + seed, cx * 7 + cy) - Z;
        const dq = qx * qx + qy * qy + qz * qz * 0.8;
        if (dq < f1) { f1 = dq; id = ((cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791)) | 0; }
      }
      return id;
    };
    for (let i = 0; i < PW * PH; i++) if (kindPx[i] === 1) cellPx[i] = vor(wx(i % PW), wy(gyPx[i]), zPx[i]);
    const lava = mat.lava ? rgb(mat.lava) : null, lavaDk = mat.lava ? rgb(darken(mat.lava, 0.45)) : null;
    for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) {
      const i = py * PW + px, k = kindPx[i];
      if (!k) continue;
      let t = tone(lPx[i]) + castPx[i];
      if (k === 1) {
        const id = cellPx[i];
        // the facet's own tip toward or away from the sun
        t += Math.floor(hash(id, 5) * 3) - 1;
        const other = (j) => kindPx[j] === 1 && cellPx[j] !== id;
        const up = py > 0 && other(i - PW), up2 = py > 1 && other(i - 2 * PW), up3 = py > 2 && other(i - 3 * PW);
        const dn = py < PH - 1 && other(i + PW), dn2 = py < PH - 2 && other(i + 2 * PW);
        const rt = px < PW - 1 && other(i + 1), rt2 = px < PW - 2 && other(i + 2);
        const lt = px > 0 && other(i - 1);
        // each block a pillow: lit along its top and left, sinking to a dark
        // seam under it and down its right side
        if (dn) t = 4;
        else if (rt) t = Math.max(t + 1, 3);
        else if (up || (lt && !dn2)) t -= 2;
        else if (up2 || up3) t -= 1;
        else if (dn2) t += 1;
        t = Math.max(0, Math.min(4, t));
        let col = rock[t];
        const patch = vnoise(px / 16, py / 16, seed + 7);
        if (dn && lava && vnoise(px / 11, py / 11, seed + 12) > 0.7) col = lava;
        else if (dn2 && lava && vnoise(px / 11, (py + 1) / 11, seed + 12) > 0.7) col = lavaDk;
        // moss (or snow) in clumps: on the blocks' tops where a patch grows,
        // and a whole carpet of it where the patch is thickest
        // (snow the same way, a little more freely, not on every ledge)
        else if (moss && !dn && !rt && ((up || up2 || (up3 && hash(px, seed + 14) < 0.5)) && patch > (mat.snow ? 0.42 : 0.58) || patch > 0.72 && (mat.snow || hash(px >> 1, py >> 1) < 0.85))) col = moss[Math.min(2, Math.max(0, (up ? 0 : 1) + castPx[i]))];
        put(i, col);
      } else {
        // turf (or snow, or ash) on top: flecked where the sun lands
        const l = lPx[i], z = zPx[i];
        // the hill's low foot is left to the board's own ground, along a
        // ragged line, so the hill melts into the field with no contour
        if (z < 3.6 + (vnoise(px / 5, py / 5, seed + 19) - 0.5) * 3) {
          kindPx[i] = 4;
          if (castPx[i]) blend(i, shadowC, 70);
          continue;
        }
        // (gentle slopes keep the ground's own colour; only a steep
        // sun-facing brow lightens)
        if (bare) {
          // snow and ash: two close tones, a patch only up on the high ground
          t = Math.min(2, (l > 0.52 ? 1 : 2) - (z > 6 && l > 0.52 && vnoise(px / 9, py / 9, seed + 3) < 0.2 ? 1 : 0)) + castPx[i];
        } else {
          t = (l > 0.96 ? 0 : l > 0.52 ? 1 : l > 0.28 ? 2 : 3) + castPx[i];
          t = Math.max(0, Math.min(4, t + (t === 1 && vnoise(px / 4, py / 4, seed + 8) > 0.8 ? -1 : 0) + (vnoise(px / 9, py / 9, seed + 3) < 0.16 ? 1 : 0)));
        }
        put(i, top[t]);
      }
    }
    // the turf's edge: a lit rim where it breaks over the rock, and the
    // rock's first pixel under it in the turf's shade, now and then a
    // strand of it hanging down
    for (let py = 1; py < PH - 4; py++) for (let px = 0; px < PW; px++) {
      const i = py * PW + px;
      if (kindPx[i] === 2 && kindPx[i + PW] === 1) {
        // (a step only a pixel or two high is just the turf folding: no rim,
        // or it reads as a scratched line across the slope)
        if (kindPx[i + 2 * PW] !== 1 || kindPx[i + 3 * PW] !== 1) { put(i + PW, top[2]); if (kindPx[i + 2 * PW] === 1) put(i + 2 * PW, top[2]); continue; }
        put(i, top[0]);
        put(i + PW, top[3]); kindPx[i + PW] = 3;
        const hang = hash(px, py + seed) < 0.3 ? 1 + Math.floor(hash(px + 1, py + seed) * 3) : 0;
        for (let q = 2; q < 2 + hang; q++) if (kindPx[i + q * PW] === 1) put(i + q * PW, top[q === 1 + hang ? 3 : 2]);
      }
    }

    // ---- the mouth ----
    const det = 1 / S + ny;
    const toFace = (x, y) => {
      const ddx = x - mx, ddy = y - my;
      return [(-ddx * (ny / S + 1) + ddy * nx / S) / det, (-ny * ddy - nx * ddx) / det];
    };
    const mouth = new Uint8Array(PW * PH);
    const SQ = 4, AT = new Float32Array(Math.ceil(HW * 2 * SQ) + 2), LIP = new Float32Array(AT.length), FJ = new Float32Array(AT.length);
    for (let j = 0; j < AT.length; j++) { const sv = j / SQ - HW; AT[j] = archTop(sv); LIP[j] = (vnoise(sv / 2.2 + 9, 0.5, seed) - 0.55) * 2.6; FJ[j] = (vnoise(sv / 1.6 + 30, 2.5, seed + 21) - 0.5) * 1.8; }
    const sj = (sv) => Math.max(0, Math.min(AT.length - 1, Math.round((sv + HW) * SQ)));
    const FB0 = C.side ? 3.8 : 2.6, FB1 = C.side ? 8.5 : 6;
    const archAt = (sv) => AT[sj(sv)];
    // the mouth's own patch of the sprite, so its passes don't sweep the lot
    let qx0 = PW, qy0 = PH, qx1 = 0, qy1 = 0;
    for (let s = -HW; s <= HW; s += 1) for (const z of [0, archTop(s)]) {
      const [fx, fy] = onFace(s, z);
      qx0 = Math.min(qx0, Math.floor((fx - x0) * PX)); qy0 = Math.min(qy0, Math.floor((fy - y0) * PX));
      qx1 = Math.max(qx1, Math.ceil((fx - x0) * PX)); qy1 = Math.max(qy1, Math.ceil((fy - y0) * PX));
    }
    qx0 = Math.max(2, qx0 - 6); qy0 = Math.max(2, qy0 - 6); qx1 = Math.min(PW - 2, qx1 + 6); qy1 = Math.min(PH - 2, qy1 + 6);
    const dark = mat.dark, floor = rgb(mat.floor);
    const floorDk = rgb(mix(mat.floor, "#" + dark.map((v) => v.toString(16).padStart(2, "0")).join(""), 0.55));
    qy1 = Math.min(PH - 2, qy1 + 4);
    for (let py = qy0; py < qy1; py++) for (let px = qx0; px < qx1; px++) {
      const [s, z] = toFace(wx(px), wy(py));
      if (Math.abs(s) >= HW) continue;
      // the threshold's lip: ragged, here a sill of rock, there the floor's
      // dirt spilling a pixel or two out onto the road
      const lip = LIP[sj(s)];
      if (z < lip || (z < 0 && Math.abs(s) > HW * 0.8)) continue;
      const zt = archAt(s);
      if (z > zt) continue;
      const i = py * PW + px;
      mouth[i] = 1;
      // the floor running in, sinking into the dark in hard steps whose
      // edges wander a pixel or two
      // (by height up the opening, not its share of the arch: the floor is
      // level, so it shows as a band of the same depth right across)
      const r = z + FJ[sj(s)];
      // (an arch seen at a slant shows less of its floor: give it more)
      put(i, r < FB0 ? floor : r < FB1 ? floorDk : dark);
    }
    // the mouth's rim: ink round the hole, a lit edge on the upper left of
    // the arch, rough teeth of rock biting into the dark
    for (let py = qy0; py < qy1; py++) for (let px = qx0; px < qx1; px++) {
      const i = py * PW + px;
      if (mouth[i]) continue;
      const nb = mouth[i - 1] || mouth[i + 1] || mouth[i - PW] || mouth[i + PW];
      if (!nb) continue;
      const [s, z] = toFace(wx(px), wy(py));
      if (z < 1.2) continue;      // the threshold stays open to the road
      put(i, ink);
    }
    for (let py = qy0; py < qy1; py++) for (let px = qx0; px < qx1; px++) {
      const i = py * PW + px;
      if (mouth[i] || !kindPx[i]) continue;
      if (dd[i * 4] === ink[0] && dd[i * 4 + 1] === ink[1] && dd[i * 4 + 2] === ink[2]) continue;
      let near2 = false;
      for (let q = -2; q <= 2 && !near2; q++) for (let r2 = -2; r2 <= 2; r2++) if (mouth[i + q * PW + r2]) { near2 = true; break; }
      if (!near2) continue;
      const [s, z] = toFace(wx(px), wy(py));
      if (z < 1.2) continue;
      put(i, s > HW * 0.1 || z > archAt(s) * 0.7 ? rock[1] : rock[3]);
    }
    // under the lip, the first pixels of the dark show the lintel's
    // underside — the mouth has a thickness, not a painted-on hole
    const lintel = [rgb(mix(darken(mat.rock, 0.55), "#" + dark.map((v) => v.toString(16).padStart(2, "0")).join(""), 0.3)), rgb(darken(mat.rock, 0.66))];
    for (let py = qy1 - 1; py >= qy0; py--) for (let px = qx0; px < qx1; px++) {
      const i = py * PW + px;
      if (!mouth[i] || mouth[i - PW] && mouth[i - 2 * PW]) continue;
      const [s, z] = toFace(wx(px), wy(py));
      if (z < archAt(s) * 0.45) continue;
      put(i, mouth[i - PW] ? lintel[1] : lintel[0]);
    }
    // teeth and what hangs over the lip: roots, moss, icicles
    const hangs = [];
    for (let k = 0; k < 11; k++) {
      const s = -HW * 0.8 + (k + hash(k, seed) * 0.8) * (HW * 1.6 / 11);
      hangs.push([s, hash(k + 3, seed)]);
    }
    for (const [s, hv] of hangs) {
      const zt = archTop(s);
      const [lx, ly] = onFace(s, zt + 0.5);
      const px = Math.round((lx - x0) * PX), py0 = Math.round((ly - y0) * PX);
      if (px < 0 || px >= PW) continue;
      if (hv < 0.35) {
        // a tooth of rock
        const len = 2 + Math.round(hv * 8);
        for (let q = 0; q < len; q++) for (let r2 = -Math.max(0, Math.floor((len - q) / 2)); r2 <= 0; r2++) {
          const i = (py0 + q) * PW + px + r2;
          if (i > 0 && i < PW * PH && mouth[i]) put(i, q === len - 1 ? ink : r2 === 0 ? rock[3] : rock[2]);
        }
      } else if (mat.hang !== "none") {
        const len = 3 + Math.round(hv * 10);
        const cols = mat.hang === "ice" ? [rgb("#f4fbff"), rgb("#bfe0f0"), rgb("#8cb8d4")] : hv > 0.7 ? moss || [rgb("#6a4a30")] : [rgb("#8a6a48"), rgb("#6a4a30"), rgb("#4a3424")];
        for (let q = 0; q < len; q++) {
          const i = (py0 + q) * PW + px + (mat.hang === "ice" ? 0 : Math.round(Math.sin(q * 0.7 + hv * 9) * 0.6));
          if (i > 0 && i < PW * PH && (mouth[i] || q < 2)) put(i, cols[Math.min(cols.length - 1, Math.floor(q / len * cols.length))]);
          if (mat.hang === "ice" && q < len * 0.4 && i + 1 < PW * PH && mouth[i + 1]) put(i + 1, cols[1]);
        }
      }
    }

    // ---- ink round the crag, only where it stands up off the ground ----
    const out = new Uint8Array(PW * PH);
    // (a crag pixel inks its empty neighbour only if it stands well above
    // it — never along a gentle slope's fade into the field)
    const solidK = (j) => kindPx[j] > 0 && kindPx[j] < 4;
    for (let py = 1; py < PH - 1; py++) for (let px = 1; px < PW - 1; px++) {
      const i = py * PW + px;
      if (solidK(i) || mouth[i]) continue;
      const z0 = kindPx[i] === 4 ? zPx[i] : 0;
      // (the turf's back edge against the field behind it stays unlined —
      // grass against grass, a line there reads as a scratch)
      if ((solidK(i - 1) && zPx[i - 1] - z0 > 2.2) || (solidK(i + 1) && zPx[i + 1] - z0 > 2.2) || (solidK(i - PW) && zPx[i - PW] - z0 > 2.2) || (solidK(i + PW) && kindPx[i + PW] !== 2 && zPx[i + PW] - z0 > 2.2)) out[i] = 1;
    }
    for (let i = 0; i < PW * PH; i++) if (out[i]) put(i, ink, 235);
    // the foot of the crag sits in its own shade
    for (let py = 0; py < PH - 2; py++) for (let px = 0; px < PW; px++) {
      const i = py * PW + px;
      if (!solidK(i) || solidK(i + PW) || mouth[i + PW] || out[i + PW]) continue;
      if (zPx[i] < 3) { blend(i + PW, shadowC, 120); blend(i + 2 * PW, shadowC, 60); }
    }
    // ---- stones fallen at its feet, scree across the threshold: each its
    // own faceted, inked piece — painted straight into the bake's pixels
    // (a canvas read-back per stone costs more than the whole crag) ----
    {
      const st = rocks.map(([x, y, r, hh], k) => [x, y, r, r * 0.66, hh, seed * 7 + k * 31]);
      for (let k = 0; k < 3; k++) {
        const s = (hash(k, seed + 41) - 0.5) * HW * 1.3, fu = 1.5 + hash(k, seed + 42) * 3, r = 1.5 + hash(k, seed + 43) * 1.1;
        st.push([mx + tx * s + nx * fu, my + ty * s + ny * fu, r, r * 0.7, r * 0.85, seed + 300 + k]);
      }
      const M0 = { a: PX, d: PX, e: -x0 * PX, f: -y0 * PX };
      const main = pxCtx(dd, PW, PH, M0);
      for (const [x, y, w2, d2, h2, sd] of st) facetStone(main, x, y, w2, d2, h2, mat.rock, sd, { shade: true });
      st.sort((p, q) => p[1] - q[1]);
      const capC = mat.snow ? "#eef5f8" : mat.moss;
      for (const [x, y, w2, d2, h2, sd] of st) inkedStone(dd, PW, PH, M0, x, y, w2, d2, h2, mat.rock, sd, { cap: h2 > 4.5 ? capC : null, snow: !!mat.snow, lichen: mat.moss ? "#c4c49a" : null });
    }
    c.putImageData(img, 0, 0);

    // ---- scree and bones on the threshold ----
    c.save();
    for (let k = 0; k < 16; k++) {
      const s = (hash(k, seed + 11) - 0.5) * HW * 2.3, fu = 1 + hash(k, seed + 12) * 18;
      const x = mx + tx * s + nx * fu, y = my + ty * s + ny * fu;
      if (x < x0 + 3 || y < y0 + 3 || x > x1 - 3 || y > y1 - 3) continue;
      const X = ap(x), Y = ap(y);
      if (k % 5 === 1 && !mat.lava) {
        // a gnawed bone, knobbed at both ends
        c.fillStyle = rgba("#2a1c2c", 0.45); c.fillRect(X, Y + 1, 3, 0.5);
        c.fillStyle = "#e6dcc4"; c.fillRect(X + 0.5, Y + 0.5, 2, 0.5);
        c.fillStyle = "#f4ecd8"; c.fillRect(X, Y, 1, 1); c.fillRect(X + 2.5, Y, 1, 1);
        c.fillStyle = "#b8ac92"; c.fillRect(X, Y + 0.5, 0.5, 0.5); c.fillRect(X + 2.5, Y + 0.5, 0.5, 0.5);
      } else {
        // a pebble: lit top, its own dark underside, a crumb of shadow
        const pw = 1 + Math.round(hash(k, seed + 13) * 2) * 0.5, ph = pw > 1.5 ? 1 : 0.5;
        c.fillStyle = rgba("#2a1c2c", 0.35); c.fillRect(X + 0.5, Y + ph, pw, 0.5);
        c.fillStyle = darken(mat.rock, 0.35); c.fillRect(X, Y, pw, ph + 0.5);
        c.fillStyle = mat.rock; c.fillRect(X, Y, pw, ph);
        c.fillStyle = lighten(mat.rock, 0.35); c.fillRect(X, Y, pw - 0.5, 0.5);
      }
    }
    c.restore();
  }, false);
  GATE.x = x0; GATE.y = y0; GATE.w = w; GATE.h = h;

  // eyes wait in the dark of the mouth, each pair keeping its own time
  GATE.eyes = [[-HW * 0.3, 0.42, 0], [HW * 0.34, 0.5, 2.7], [HW * 0.02, 0.66, 5.1]].map(([s, k, ph], i) => {
    const [ex, ey] = onFace(s, archTop(s) * k);
    return [ex, ey, ph, mat.eyes[i % 2]];
  });
  GATE.leaves = woody ? inWood.filter((p) => depthAt(p[0], p[1]) > -4 && depthAt(p[0], p[1]) < 30 && Math.hypot(p[0] - mx, p[1] - my) > 30) : [];
  GATE.lava = mat.lava ? onFace(0, 3) : null;
  // what the wood needs to know: how high the crag stands, how steep, and
  // the patch of screen the mouth takes up
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
  for (let s = -HW; s <= HW; s += 2) for (const z of [0, archTop(s) + 8]) { const [px, py] = onFace(s, z); bx0 = Math.min(bx0, px); by0 = Math.min(by0, py); bx1 = Math.max(bx1, px); by1 = Math.max(by1, py); }
  GATE.mouthBox = [bx0 - 4, by0 - 6, bx1 + 4, by1 + 6];
  GATE.hAt = hAt; GATE.top = HMAX; GATE.trees = new Map(); GATE.rid = REALM.id;
  GATE.mouthFloor = onFace(0, 0);
  return GATE;
};

const drawGate = (ctx, time, kind) => {
  const G = bakeGate(kind);
  if (!G.cv) return;
  ctx.drawImage(G.cv, G.x, G.y, G.w, G.h);
  // eyes: two hard pips with a faint bloom, blinking out of step
  for (const [ex, ey, ph, col] of G.eyes) {
    const t = time * 0.9 + ph;
    if (Math.sin(t) < -0.55 || Math.sin(t * 7.1) > 0.96) continue;
    const X = ap(ex), Y = ap(ey);
    ctx.fillStyle = rgba(col, 0.25);
    ctx.fillRect(X - 2.5, Y - 0.5, 2.5, 1.5); ctx.fillRect(X + 0.5, Y - 0.5, 2.5, 1.5);
    ctx.fillStyle = col;
    ctx.fillRect(X - 2, Y, 1.5, 0.5); ctx.fillRect(X + 1, Y, 1.5, 0.5);
    ctx.fillStyle = "#fff3d2";
    ctx.fillRect(X - 2, Y, 0.5, 0.5); ctx.fillRect(X + 1, Y, 0.5, 0.5);
  }
  // leaves shaken loose where something is pushing through the wood
  if (G.leaves.length) {
    for (let i = 0; i < 5; i++) {
      const p = G.leaves[Math.floor(hash(i, 3) * G.leaves.length)];
      const fall = (time * 11 + i * 13) % 34;
      const lx = p[0] + (hash(i, 4) - 0.5) * PATH_HALF * 1.6 + Math.sin(time * 2 + i) * 3;
      ctx.fillStyle = i % 2 ? "#5f8a3a" : "#8fb04a";
      ctx.fillRect(ap(lx), ap(p[1] - 22 + fall), 1.5, 1);
    }
  }
};

export const drawGrove = (ctx, time) => drawGate(ctx, time, "grove");
export const drawCave = (ctx, time) => drawGate(ctx, time, "cave");

// The warning at the wood's edge: a weathered plank on two posts, the words
// cut deep enough to read from across the field, a few goblin claw-marks,
// and three chevrons that pulse while you're still building. It stands on
// the meadow just past the treeline, beside the road, never across it.
const SIGN = { key: "", cv: null, x: 0, y: 0 };
const TALL = new Set(["tree", "pine", "snowpine", "deadtree", "willow"]);
const signSpot = () => {
  let d = FOREST ? 0 : 96;
  for (; FOREST && d < TOTAL_LEN * 0.5; d += 4) {
    const [x, y] = posAt(d);
    if (!FOREST || forestDepthAt(x, y) < -10) break;
  }
  const C = gateCrag();
  // a few spots on either side of the road just past the treeline, scored:
  // clear of the road, the board's edges, the crag, and of anything whose
  // trunk or crown would stand in the plank's box or the chevrons' column
  // above it (x ± 33, y - 50 .. y + 4)
  const cands = [];
  const off = (x, y) => nearestOnPath(x, y).d;
  for (const dd of [8, 22, 36, 50, 66, 82, 100, 120]) {
    const at = Math.min(TOTAL_LEN, d + dd);
    const [px, py] = posAt(at);
    const a = angleAt(at) + Math.PI / 2;
    for (const sd of [-1, 1]) for (const gap of [17, 27, 38]) {
      const x = px + Math.cos(a) * sd * (PATH_HALF + gap), y = py + Math.sin(a) * sd * (PATH_HALF + gap);
      // the posts must stand on the grass; the plank and the chevrons had
      // better not hang over the road either
      const feet = off(x - 28, y) > PATH_HALF + 3 && off(x, y) > PATH_HALF + 3 && off(x + 28, y) > PATH_HALF + 3 && off(x, y + 6) > PATH_HALF + 2;
      const plank = off(x - 30, y - 12) > PATH_HALF && off(x + 30, y - 12) > PATH_HALF && off(x - 30, y - 24) > PATH_HALF && off(x + 30, y - 24) > PATH_HALF && off(x, y - 24) > PATH_HALF;
      const chev = off(x, y - 42) > PATH_HALF - 4;
      const crowd = DECOR.some((o) => !o.forest && Math.abs(o.x - x) < 40 && o.y - y > -14 && o.y - y < 48);
      let trees = 0, overChev = 0;
      for (const o of DECOR) {
        const k = o.s || 1, tall = o.forest || TALL.has(o.t), hw = (tall ? 16 : 12) * k, up = (tall ? 50 : 22) * k;
        if (o.x + hw > x - 33 && o.x - hw < x + 33 && o.y + 10 > y - 50 && o.y - up < y + 4) trees++;
        // (worst of all: something standing in the chevrons' own column)
        if (o.x + hw > x - 9 && o.x - hw < x + 9 && o.y + 10 > y - 54 && o.y - up < y - 28) overChev++;
      }
      let wood = 0;
      if (FOREST) for (const [qx, qy] of [[-26, 0], [0, 0], [26, 0], [-20, -22], [20, -22], [0, -44]]) if (forestDepthAt(x + qx, y + qy) > -8) wood++;
      // (the crag as the camera sees it: does any of it rise into the box?)
      let crag = false;
      if (C) {
        for (const [qx, qy] of [[-28, 0], [0, 0], [28, 0], [-24, -24], [0, -24], [24, -24], [-8, -50], [8, -50]]) {
          for (let z = 0; z <= 48 && !crag; z += 3) if (C.hillAt(x + qx, y + qy + z) > z + 0.3) crag = true;
          if (crag) break;
        }
        for (const [bx, by, r, hh] of C.rocks) if (Math.abs(bx - x) < 34 + r && by + r * 0.7 > y - 56 && by - hh - r * 0.7 < y + 4) crag = true;
      }
      const edge = x < 40 || x > W - WALL_W - 40 || y - 50 < 4 || y > H - 10;
      cands.push({ x, y, score: (feet ? 0 : 200) + (plank ? 0 : 60) + (chev ? 0 : 20) + (crowd ? 30 : 0) + Math.min(5, trees) * 14 + overChev * 40 + wood * 10 + (crag ? 60 : 0) + (edge ? 50 : 0) + dd * 0.25 + gap * 0.4 + y * 0.02 });
    }
  }
  cands.sort((p, q) => p.score - q.score);
  return cands[0];
};
// The words are cut from a little hand-made pixel font (5x6, each dot two
// art pixels), so they read the same on every device.
const GLYPHS = {
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#.."],
  H: ["#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  E: ["#####", "#....", "####.", "#....", "#....", "#####"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#.."],
  C: [".####", "#....", "#....", "#....", "#....", ".####"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", ".###."],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#"],
};
const bakeSign = () => {
  const key = `${REALM.id}|${PTS[0]}|${PTS.length}`;
  if (SIGN.key === key) return SIGN;
  SIGN.key = key;
  const spot = signSpot();
  SIGN.x = Math.round(spot.x); SIGN.y = Math.round(spot.y);
  const Wd = 64, Hd = 36, GX = 32, GY = 31;      // sprite box, ground at (GX, GY)
  const R = REALM;
  SIGN.cv = bakeSprite(Wd, Hd, (c) => {
    // the shadow of plank and posts, down-right on the ground
    c.fillStyle = "rgba(28,20,30,0.24)";
    c.fillRect(GX - 23, GY - 1, 50, 2); c.fillRect(GX - 20, GY + 1, 44, 1);
    c.fillStyle = "rgba(28,20,30,0.36)";
    for (const px of [GX - 20, GX + 22]) c.fillRect(px - 1, GY - 0.5, 5, 1.5);
    const wood = "#7a5636", post = "#5f4326";
    // posts: split rails driven into the ground, lit on the left, their
    // sawn tops showing the end grain
    for (const px of [GX - 21.5, GX + 20.5]) part(c, (cc) => {
      cc.fillStyle = post; cc.fillRect(px, 9.5, 3.5, GY - 9.5 + 0.5);
      cc.fillStyle = lighten(post, 0.28); cc.fillRect(px, 9.5, 1, GY - 9.5);
      cc.fillStyle = darken(post, 0.4); cc.fillRect(px + 2.5, 9.5, 1, GY - 9.5 + 0.5);
      cc.fillStyle = darken(post, 0.25); cc.fillRect(px + 1.5, 21, 0.5, 5); cc.fillRect(px + 1, 13, 0.5, 3);
      cc.fillStyle = lighten(post, 0.45); cc.fillRect(px, 8.5, 3.5, 1); cc.fillStyle = lighten(post, 0.2); cc.fillRect(px + 0.5, 9, 2.5, 0.5);
    });
    // the plank: a lit top edge, grain, a split end, a knot, weathering
    part(c, (cc) => {
      cc.beginPath();
      cc.moveTo(4, 5.5); cc.lineTo(56, 4.5); cc.lineTo(58.5, 6.5); cc.lineTo(58, 10); cc.lineTo(60, 11.5); cc.lineTo(59.5, 19.5); cc.lineTo(5.5, 20.5); cc.lineTo(3.5, 13); cc.closePath();
      cc.fillStyle = wood; cc.fill();
      cc.save(); cc.clip();
      cc.fillStyle = lighten(wood, 0.35); cc.fillRect(0, 4, 64, 1.5);
      cc.fillStyle = lighten(wood, 0.14); cc.fillRect(0, 5.5, 64, 1);
      cc.fillStyle = darken(wood, 0.3); cc.fillRect(0, 18.5, 64, 1);
      cc.fillStyle = darken(wood, 0.52); cc.fillRect(0, 19.5, 64, 1.5);
      // grain: broken dark runs, a lit hair above each
      for (const [gx, gy, gl] of [[6, 8, 12], [22, 7.5, 9], [40, 8.5, 14], [9, 17, 16], [30, 17.5, 11], [47, 16.5, 9]]) {
        cc.fillStyle = darken(wood, 0.26); cc.fillRect(gx, gy, gl, 0.5);
        cc.fillStyle = lighten(wood, 0.1); cc.fillRect(gx + 1, gy - 0.5, gl - 2, 0.5);
      }
      // a knot and the split at the right end
      cc.fillStyle = darken(wood, 0.45); cc.fillRect(50, 15, 2.5, 1.5);
      cc.fillStyle = lighten(wood, 0.3); cc.fillRect(50, 14.5, 2, 0.5);
      cc.fillStyle = darken(wood, 0.6); cc.fillRect(55, 10.5, 5, 0.5); cc.fillRect(53.5, 11, 2, 0.5);
      // weathering in the realm's own way: moss creeping up from the lower
      // left corner, soot on the ash, rime on the snow
      const gk = groundKind(R);
      if (gk === "snow") {
        cc.fillStyle = "#b4c8d8"; cc.fillRect(4, 18.5, 4.5, 2); cc.fillRect(4.5, 17.5, 1.5, 1);
        cc.fillStyle = "#e4eef4"; cc.fillRect(4, 18, 3, 0.5); cc.fillRect(4.5, 17.5, 1, 0.5);
      } else if (gk === "ash") {
        cc.fillStyle = "#2e2424"; cc.fillRect(3.5, 17, 6, 4); cc.fillRect(5, 15.5, 2.5, 1.5); cc.fillRect(55, 17.5, 5, 3);
        cc.fillStyle = "#4a3a34"; cc.fillRect(9.5, 18, 2, 1.5); cc.fillRect(7.5, 16.5, 1, 1); cc.fillRect(53.5, 18.5, 1.5, 1);
      } else {
        const mo = gk === "marsh" ? "#4a6436" : gk === "turf" ? "#8a8a52" : "#5a7a38";
        cc.fillStyle = mo; cc.fillRect(4, 18, 5, 2.5); cc.fillRect(5, 17, 2.5, 1);
        cc.fillStyle = lighten(mo, 0.25); cc.fillRect(4.5, 17.5, 2, 0.5);
      }
      cc.restore();
    });
    // nails, and a rust stain running from each
    for (const nx of [GX - 20, GX + 22]) {
      c.fillStyle = "#8a4a2a"; c.fillRect(nx, 8, 0.5, 2);
      c.fillStyle = "#3a3440"; c.fillRect(nx - 0.5, 7, 1.5, 1);
      c.fillStyle = "#c4c8d0"; c.fillRect(nx - 0.5, 7, 0.5, 0.5);
    }
    // the words, cut in: a dark trench, lit along its lower lip
    const text = "THEY COME";
    const cell = 6 * 1, gap = 0.5, sp = 3;
    let tw = 0;
    for (const ch of text) tw += ch === " " ? sp : cell;
    let cx = Math.round(32 - tw / 2), cy = 9;
    const cut = rgb("#2a1a1a"), lip = rgb("#e0bc84");
    const cv = c.canvas, PWs = cv.width;
    const img = c.getImageData(0, 0, cv.width, cv.height), dd = img.data;
    const dot = (wx, wy, col) => {
      const px = Math.round(wx * PX), py = Math.round(wy * PX);
      for (let q = 0; q < 2; q++) for (let r = 0; r < 2; r++) { const o = ((py + q) * PWs + px + r) * 4; dd[o] = col[0]; dd[o + 1] = col[1]; dd[o + 2] = col[2]; dd[o + 3] = 255; }
    };
    let k = 0;
    const letters = [];
    for (const ch of text) {
      if (ch === " ") { cx += sp; continue; }
      const g = GLYPHS[ch], jy = (hash(k++, 5) < 0.3 ? 0.5 : 0);
      for (let r = 0; r < 6; r++) for (let q = 0; q < 5; q++) if (g[r][q] === "#") letters.push([cx + q, cy + r + jy]);
      cx += cell;
    }
    const at = new Set(letters.map(([x, y]) => `${x},${y}`));
    for (const [x, y] of letters) if (!at.has(`${x},${y + 1}`)) { const px = Math.round(x * PX), py = Math.round((y + 1) * PX); for (let r = 0; r < 2; r++) { const o = (py * PWs + px + r) * 4; dd[o] = lip[0]; dd[o + 1] = lip[1]; dd[o + 2] = lip[2]; dd[o + 3] = 255; } }
    for (const [x, y] of letters) dot(x, y, cut);
    c.putImageData(img, 0, 0);
    // claw marks: three parallel gouges raked down-left across the right
    // end, each a dark cut with a lit lip under it
    for (let j = 0; j < 3; j++) for (let q = 0; q < 5; q++) {
      const X = 51.5 + j * 1.5 - q * 0.5, Y = 14.5 + q * 0.5 + j * 0.5;
      c.fillStyle = darken(wood, 0.58); c.fillRect(X, Y, 0.5, 0.5);
      c.fillStyle = lighten(wood, 0.34); c.fillRect(X + 0.5, Y + 0.5, 0.5, 0.5);
    }
    // the realm's own grass at the posts' feet, in art pixels
    const P = pxPainter(c), cols = dressCols(R), gk = groundKind(R);
    for (const [tx, sd] of [[GX - 23, 3], [GX - 17, 5], [GX + 19, 7], [GX + 25.5, 9]]) {
      if (gk === "snow" && sd % 4 === 1) continue;
      pixelTuft(P.put, P.shade, Math.round(tx * PX), Math.round((GY + 0.5) * PX), gk === "snow" ? 0.4 : 0.5, sd, cols, { n: gk === "snow" ? 2 : 3 });
    }
    P.done();
  });
  return SIGN;
};
// A pixel chevron pointing down at the road, baked in three tones (dim,
// mid, lit) and stamped whole — never faded with alpha.
const CHEV = [];
const CHEV_TONES = [["#7a3038", "#8e4046", "#a4524e"], ["#a8404a", "#d05a52", "#ec8a70"], ["#c8484a", "#f08a6c", "#ffe0b8"]];
const chevSprite = (k) => CHEV[k] || (CHEV[k] = bakeSprite(14, 10, (c) => {
  const [lo, mid, hi] = CHEV_TONES[k];
  const dot = (px, py, col) => { c.fillStyle = col; c.fillRect(1.5 + px / PX, 1.5 + py / PX, 1 / PX, 1 / PX); };
  // two arms of three pixels' thickness meeting in a point 10 below
  for (let i = 0; i <= 10; i++) for (const X of [i, 21 - i]) {
    dot(X, i, hi); dot(X, i + 1, mid); dot(X, i + 2, i > 7 ? lo : mid); dot(X, i + 3, lo);
  }
}));
// `part`: "all" (the default), or "body" (the plank on its posts, for a
// y-sorted pass at the sign's ground line, signGround().y) and "chevrons"
// (drawn late, over everything).
export const signGround = () => { if (!PTS.length) return null; const S = bakeSign(); return { x: S.x, y: S.y }; };
export const drawSpawnSign = (ctx, time, phase, part = "all") => {
  if (!PTS.length) return;
  const S = bakeSign();
  if (part !== "chevrons") ctx.drawImage(S.cv, S.x - 32, S.y - 31, 64, 36);
  if (part === "body") return;
  // the chevrons over the plank: a light running down them while you
  // build, a dim murmur once the fighting starts
  const loud = phase !== "combat";
  for (let k = 0; k < 3; k++) {
    const lit = Math.max(0, Math.sin(time * 4 - k * 1.05));
    const tone = loud ? (lit > 0.72 ? 2 : lit > 0.2 ? 1 : 0) : (lit > 0.9 ? 1 : 0);
    ctx.drawImage(chevSprite(tone), S.x - 7, S.y - 51 + k * 6, 14, 10);
  }
};
// Bake the gate and the sign ahead of the board's first frame (call it once
// a realm is selected, in idle time; the first draw bakes them otherwise).
export const warmScenery = () => {
  if (!PTS.length || typeof document === "undefined") return;
  const k = REALM.spawn;
  if (hasCrag() && !reg().spawn[k]) bakeGate(k === "grove" ? "grove" : "cave");
  bakeSign();
};


// Re-export the odd helper the render lab likes to borrow.
export { tuft, drawCastle, drawCastleWorks, resetWorksBakes };
// the shared kit, for scenery-iron.js / scenery-hollow.js
export { leafPart, leafClump, oakTree, pineTree, rockBody, boulder, groundDress, deadTree, willow, reeds, gravestone, cairn, boneheap, obelisk, watchtower, tent, banner, eyes };
