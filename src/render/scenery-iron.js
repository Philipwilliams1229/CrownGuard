// ============ RENDER: SCENERY OF THE IRON MARCHES ============
// The chapter's own ground art (highland turf, crags, the Kingdom's camps and roads), plugged into the shared
// renderers through one registry object. Nothing here is called at module
// load, so importing the shared scenery kit back from scenery.js is safe.
//
//   decor: { type: (ctx, x, y, s, o) => void }   o = { seed, v, band, time, forest, sway }
//          painted into a baked sprite once per (type, size, variant) unless
//          the type is listed in `live`; feet at (x, y + ~8) like scenery.js
//   live:  [type, ...]            painted every frame instead (flames, flags)
//   box:   { type: [hw, top] }    bake box at s = 1 (default [38, 42])
//   dress: { type: [w, stones] }  ground dress tucked round the foot after inking
//   spawn: { kind: (ctx, time) => void }   the enemy's gate (REALM.spawn)
//   turf:  { key: (ctx, kit) => void }     world.js, over the turf, under the road
//   road:  { key: (ctx, kit) => void }     world.js, over the road
//          key = REALM.groundArt; kit = { clear(x, y, margin), rng, SW }
//
// The country: border highlands under a steel overcast. Cropped turf broken by
// heather, bracken and bare stone; dark Scots pines, spruce and crags along the
// edge the Kingdom marches out of; drystone walls, gibbets and milestones by a
// PAVED military road (dressed flags, kerbs, wheel ruts). The Kingdom's colours
// are OXBLOOD with a grey iron tower — never the crown's blue.
//
// Pieces (decor types): irpine (Scots pine), irspruce, ircrag, irheather,
// irwall (drystone), irgibbet, irmile (milestone), irbeacon (live fire),
// irwagon, irpikes, irtent, irbanner (live cloth), irtower (live pennant).
// Spawn kind: "ironcamp". Ground art key: "iron".
// Live pieces bake their still body once and only paint cloth and flame.

import { W, H, PATH_HALF, RES } from "../data/constants.js";
import { PTS, SEGS, TOTAL_LEN, nearestOnPath } from "../engine/path.js";
import { FOREST, forestDepthAt, PONDS, RIVERS, inRiver } from "../data/terrain.js";
import { REALM } from "../data/maps.js";
import {
  lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, blade, tuft, stone,
  blobPath, blobBall, hash, ellipse, lin, bakeSprite, inkOutline, part, PX,
} from "./paint.js";
// the shared kit — called only inside painters, never at module load
import { leafPart, leafClump, pineTree } from "./scenery.js";

// ---- the Kingdom's colours and the country's -------------------------------
const INK = "#241a26";
const OX = "#7a2a2c", OX_DK = "#521a1e", OX_LT = "#a2463e";
const STEEL = "#6c7280", STEEL_LT = "#c4c8d0", STEEL_DK = "#3a3e48", IRON = "#2e3038", BRASS = "#b8903e";
const WOOD = "#6a4a2e", WOOD_LT = "#8a6440", WOOD_DK = "#46301e";
const CANVAS = "#d6ccb2";
const GRIT = "#8e8c86";            // highland crag stone, cool
const ASHLAR = "#a6a296";          // the Kingdom's dressed stone
const HEATH = "#7a5a72", HEATH_LT = "#9a7a90", HEATH_DK = "#503c4e", HEATH_FL = "#bc98b2";
const BRACK = "#a6683a", BRACK_LT = "#c88c4c", BRACK_DK = "#6a4226";
const PINE_LEAF = "#3e6450", SCOTS_BARK = "#b0663e";
// the wood, by depth: the treeline takes what light there is, the rows behind go dark and cold
const WOOD_SPRUCE = [["#44705a", "#4a745a", "#406a56"], ["#385f4e", "#355a4c", "#3b624e"], ["#2d4e44", "#2b4a42", "#305246"]];
const WOOD_SCOTS = [["#46705a", "#4c7658", "#426c58"], ["#3a624e", "#38604e", "#3e654e"], ["#2f5046", "#2d4c44", "#325448"]];

const ap = (v) => Math.round(v * PX) / PX;
const hexRGB = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const px1 = (c, x, y, w = 0.5, h = 0.5) => c.fillRect(ap(x), ap(y), w, h);

// A still body baked once (inked), then stamped — for the live pieces, whose
// cloth or flame is painted over it every frame.
const BODIES = new Map();
const body = (key, hw, top, bot, paint) => {
  let sp = BODIES.get(key);
  if (!sp) {
    const cv = bakeSprite(hw * 2, top + bot, (c) => paint(c, hw, top));
    sp = { cv, hw, top, bot };
    BODIES.set(key, sp);
  }
  return sp;
};
const stampBody = (ctx, sp, x, y) => ctx.drawImage(sp.cv, x - sp.hw, y - sp.top, sp.hw * 2, sp.top + sp.bot);

// ---- the Kingdom's device: a grey iron tower on oxblood --------------------
// (cx, top) is the tower's top middle; about 5 wide and 6 tall at k = 1.
const device = (c, cx, top, k = 1) => {
  const u = 0.5 * k;
  c.fillStyle = STEEL_DK;
  c.fillRect(ap(cx - 2.5 * k), ap(top + 1.5 * k), 5 * k, 5 * k);
  c.fillRect(ap(cx - 3 * k), ap(top), 1.5 * k, 2 * k);
  c.fillRect(ap(cx - 0.75 * k), ap(top), 1.5 * k, 2 * k);
  c.fillRect(ap(cx + 1.5 * k), ap(top), 1.5 * k, 2 * k);
  c.fillStyle = STEEL_LT;
  c.fillRect(ap(cx - 2.5 * k), ap(top + 1.5 * k), 3.5 * k, 4.5 * k);
  c.fillRect(ap(cx - 3 * k), ap(top), 1 * k, 1.5 * k);
  c.fillRect(ap(cx - 0.75 * k), ap(top), 1 * k, 1.5 * k);
  c.fillRect(ap(cx + 1.5 * k), ap(top), 1 * k, 1.5 * k);
  c.fillStyle = OX_DK;
  c.fillRect(ap(cx - 0.5 * k), ap(top + 4 * k), Math.max(0.5, u * 2), 2.5 * k);
};

// A hanging cloth, painted row by row so it stays crisp: `sway` bends it from
// the top, a swallowtail cut at the foot, lit down the sun side, inked round.
const cloth = (c, x, top, w, len, sway, dev = true) => {
  const rows = Math.round(len * 2);
  const at = (r) => ap(sway * Math.pow(r / rows, 1.4));
  // ink first, one unit proud all round
  c.fillStyle = INK;
  for (let r = -2; r < rows + 2; r++) {
    const rr = Math.max(0, Math.min(rows - 1, r));
    const notch = r >= rows - 4 ? (r - (rows - 4)) * 0.5 : 0;
    const dx = at(rr);
    if (notch > 0 && r < rows) {
      c.fillRect(x - 1 + dx, top + r * 0.5, w / 2 - notch + 1, 0.5);
      c.fillRect(x + w / 2 + notch + dx, top + r * 0.5, w / 2 - notch + 1, 0.5);
    } else c.fillRect(x - 1 + dx, top + r * 0.5, w + 2, 0.5);
  }
  for (let r = 0; r < rows; r++) {
    const dx = at(r), y = top + r * 0.5;
    const notch = r >= rows - 4 ? (r - (rows - 4)) * 0.5 + 0.5 : 0;
    c.fillStyle = OX;
    if (notch > 0) {
      c.fillRect(x + dx, y, w / 2 - notch, 0.5);
      c.fillRect(x + w / 2 + notch + dx, y, w / 2 - notch, 0.5);
    } else c.fillRect(x + dx, y, w, 0.5);
    c.fillStyle = OX_LT; c.fillRect(x + dx, y, 1, 0.5);
    c.fillStyle = OX_DK; c.fillRect(x + dx + w - 1.5, y, 1.5, 0.5);
    if (r < 2) { c.fillStyle = IRON; c.fillRect(x + dx, y, w, 0.5); }
  }
  if (dev) device(c, x + w / 2 + at(rows * 0.35), top + len * 0.26, Math.min(1, w / 7.5));
};

// A pennant streaming from a pole top at (x, y): columns rippling with time.
const pennant = (ctx, x, y, len, hgt, time, ph) => {
  const cols = Math.round(len * 2);
  const off = (i) => ap(Math.sin(time * 4.2 - i * 0.28 + ph) * 1.1 * (i / cols));
  ctx.fillStyle = INK;
  for (let i = -1; i <= cols; i++) {
    const h = hgt * (1 - Math.max(0, i) / cols * 0.7);
    ctx.fillRect(x + i * 0.5, y + off(Math.max(0, i)) - 0.5, 0.5, h + 1);
  }
  for (let i = 0; i < cols; i++) {
    const h = hgt * (1 - i / cols * 0.7), dy = off(i);
    ctx.fillStyle = OX; ctx.fillRect(x + i * 0.5, y + dy, 0.5, h);
    ctx.fillStyle = OX_LT; ctx.fillRect(x + i * 0.5, y + dy, 0.5, 0.5);
    ctx.fillStyle = OX_DK; ctx.fillRect(x + i * 0.5, y + dy + h - 0.5, 0.5, 0.5);
  }
};

// Fire in an iron basket: three tongues that lick and lean, a glow, sparks.
const fire = (ctx, x, y, s, time, ph) => {
  const f = 0.5 + 0.5 * Math.sin(time * 11 + ph) * Math.sin(time * 7.3 + ph * 2);
  glow(ctx, x, y - 2 * s, 13 * s, "#ffa048", 0.26 + f * 0.1);
  const tongue = (dx, hh, w, col) => {
    const lean = Math.sin(time * 5 + ph + dx) * 0.8;
    ctx.beginPath();
    ctx.moveTo(x + dx - w, y);
    ctx.quadraticCurveTo(x + dx - w * 0.8, y - hh * 0.55, x + dx + lean, y - hh);
    ctx.quadraticCurveTo(x + dx + w * 0.9, y - hh * 0.5, x + dx + w, y);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
  };
  const h0 = (6.5 + 2 * f) * s;
  tongue(-1.6 * s, h0 * 0.75, 2.2 * s, "#d8502a");
  tongue(1.6 * s, h0 * 0.8, 2.2 * s, "#d8502a");
  tongue(0, h0, 2.8 * s, "#e8742e");
  tongue(0.2 * s, h0 * 0.62, 1.8 * s, "#ffb040");
  tongue(0.2 * s, h0 * 0.34, 1 * s, "#fff0a0");
  for (let i = 0; i < 3; i++) {
    const t = (time * 0.9 + i / 3 + ph) % 1;
    ctx.fillStyle = rgba("#ffd070", 1 - t);
    ctx.fillRect(ap(x + Math.sin(i * 2.3 + time * 2) * 3 * s), ap(y - h0 - t * 12 * s), 0.5, 0.5);
  }
};

// ---- stone -----------------------------------------------------------------
// A faceted block of crag: an angular outline, a lit top plane, a shaded
// front-right face, bedding lines across the face and a lip of shade at its
// foot. Each block is inked on its own so a stack of them reads as a crag.
const facet = (ctx, x, gy, w, h, col, seed, o = {}) => {
  const j = (i) => hash(seed, i) - 0.5;
  const P = [
    [x - w, gy], [x - w * (1.04 + j(1) * 0.1), gy - h * (0.45 + j(2) * 0.16)], [x - w * (0.78 + j(3) * 0.14), gy - h * (0.92 + j(4) * 0.08)],
    [x - w * (0.2 + j(5) * 0.2), gy - h], [x + w * (0.38 + j(6) * 0.2), gy - h * (0.96 + j(7) * 0.06)], [x + w * (0.98 + j(8) * 0.06), gy - h * (0.58 + j(9) * 0.14)],
    [x + w, gy],
  ];
  const topD = o.flat ? 0.34 : 0.22;
  leafPart(ctx, (c) => {
    c.beginPath(); P.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath();
    c.fillStyle = col; c.fill();
    c.save(); c.clip();
    // top plane: the upper band of the block, sloping down to the right
    c.beginPath();
    c.moveTo(x - w * 1.2, gy - h * 1.2); c.lineTo(x + w * 1.2, gy - h * 1.2);
    c.lineTo(x + w * 1.2, gy - h * (1 - topD) + h * 0.12); c.lineTo(x - w * 1.2, gy - h * (1 - topD) - h * 0.06);
    c.closePath(); c.fillStyle = lighten(col, 0.3); c.fill();
    c.fillStyle = lighten(col, 0.5);
    c.fillRect(x - w * 1.2, ap(gy - h * (1 - topD) - h * 0.06 + (x - w) * 0), w * 2.4, 0.5);
    // the shaded right face
    const rx = x + w * (0.3 + j(10) * 0.2);
    c.beginPath(); c.moveTo(rx, gy - h * (1 - topD)); c.lineTo(x + w * 1.3, gy - h); c.lineTo(x + w * 1.3, gy + 2); c.lineTo(rx - w * 0.1, gy + 2); c.closePath();
    c.fillStyle = darken(col, 0.3); c.fill();
    // bedding: dark seams across the face with a lit lip above each
    const n = Math.max(1, Math.round(h / 6));
    for (let i = 1; i <= n; i++) {
      const by = gy - h * (1 - topD) + (h * (1 - topD) / (n + 1)) * i + j(20 + i) * 1.5;
      c.fillStyle = darken(col, 0.45);
      c.fillRect(x - w * 1.1 + j(30 + i) * w * 0.6, ap(by), w * (1.3 + j(40 + i) * 0.5), 0.5);
      c.fillStyle = lighten(col, 0.18);
      c.fillRect(x - w * 1.1 + j(30 + i) * w * 0.6, ap(by) - 0.5, w * 0.8, 0.5);
    }
    // a vertical joint
    const jx = ap(x - w * 0.3 + j(11) * w * 0.8);
    c.fillStyle = darken(col, 0.5);
    for (let t = 0; t < h * (1 - topD) - 1; t += 0.5) c.fillRect(ap(jx + Math.sin(t * 0.7 + seed) * 0.4), ap(gy - t - 1), 0.5, 0.5);
    // lichen: rust and pale sage flecks on the sunny top
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i % 2 ? "#c8a458" : "#a8b890";
      px1(c, x - w * 0.8 + hash(seed, i + 50) * w * 1.4, gy - h * (0.96 - hash(seed, i + 55) * topD * 0.8), 1, 0.5);
    }
    // the foot sinks into its own shade
    c.fillStyle = darken(col, 0.5); c.fillRect(x - w - 2, gy - 1, w * 2 + 4, 2);
    c.restore();
  }, INK, [x - w * 1.3 - 3, gy - h * 1.2 - 2, x + w * 1.3 + 4, gy + 3], null);
};

// heather lying along a ledge or at a foot: the ground's own pixel cushion
// (heatherTuft, below), dropped a little so its feet sit where the old mound's
// middle did — never a smooth purple mound
const heatherMound = (c, x, y, s, seed, dry = false) => heatherTuft(c, x, y + 2 * s, s * 1.1, seed, dry);

// a fan of bracken fronds
const brackenFan = (c, x, y, s, seed, green = false) => {
  const col = green ? "#6e7a3e" : BRACK;
  const n = 5 + Math.floor(hash(seed, 1) * 3);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.2 + (hash(seed, i + 3) - 0.5) * 0.3;
    const len = (5 + hash(seed, i + 7) * 3.5) * s * (1 - Math.abs(i / (n - 1) - 0.5) * 0.45);
    blade(c, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.75, 1.3 * s, darken(col, 0.3), lighten(col, 0.25), 0.25);
  }
};

// ---- trees -----------------------------------------------------------------
// The highland (Scots) pine: a tall bare trunk, grey-brown below and fox-red
// above where the bark flakes thin, carrying a few flat, dark pads of needles.
const scotsPine = (ctx, x, y, s, o) => {
  const H = (i) => hash(o.seed, i);
  const base = y + 10;
  const leaf = o.forest ? WOOD_SCOTS[o.band][o.v % 3] : [PINE_LEAF, "#3a5e4c", "#44684e", "#3c5c50"][o.v % 4];
  shadow(ctx, x + 9 * s, base - 1, 15 * s, 4.6 * s, 0.24);
  shadow(ctx, x + 1.5 * s, base, 5 * s, 1.8 * s, 0.3);
  const lean = (H(1) - 0.5) * 7 * s, th = (27 + H(2) * 6) * s;
  const tx = x + lean, ty = base - th;
  // trunk and limbs
  leafPart(ctx, (c) => {
    c.beginPath();
    c.moveTo(x - 2.6 * s, base + 0.5); c.quadraticCurveTo(x - 1.6 * s, base - th * 0.5, tx - 1.1 * s, ty);
    c.lineTo(tx + 1.1 * s, ty); c.quadraticCurveTo(x + 1.8 * s, base - th * 0.5, x + 2.6 * s, base + 0.5); c.closePath();
    c.fillStyle = lin(c, 0, ty, 0, base, [[0, SCOTS_BARK], [0.45, mix(SCOTS_BARK, "#6a5040", 0.5)], [1, "#5e4a3c"]]); c.fill();
    c.save(); c.clip();
    c.fillStyle = rgba("#2a1c2c", 0.35); c.fillRect(x + 0.3 * s + lean * 0.5, ty, 4 * s, th + 2);
    c.fillStyle = rgba("#fff3d2", 0.25); c.fillRect(x - 3 * s + lean * 0.3, ty, 1 * s, th * 0.6);
    for (let i = 0; i < 5; i++) { c.fillStyle = "#4a382e"; px1(c, x - 1 * s + lean * (1 - (i + 1) / 6) + (H(i + 40) - 0.5) * 2 * s, base - th * (0.1 + i * 0.17), 1, 0.5); }
    c.restore();
    // limbs out to the pads
    c.lineCap = "round"; c.strokeStyle = "#6a4a38"; c.lineWidth = 1.4 * s;
    for (const [dx, dy] of [[-8, 6], [8, 3], [-3, -2]]) { c.beginPath(); c.moveTo(tx, ty + 4 * s); c.quadraticCurveTo(tx + dx * 0.5 * s, ty + dy * 0.2 * s, tx + dx * s, ty + dy * s - 2 * s); c.stroke(); }
  }, INK, [x - 12 * s, ty - 4, x + 12 * s, base + 2], null);
  // flat pads of needles: the high one widest and catching the light
  const pads = [
    [tx - (8 + H(3) * 3) * s, ty + (4 + H(4) * 3) * s, (7 + H(5) * 2) * s, 0.35],
    [tx + (8 + H(6) * 3) * s, ty + (1 + H(7) * 3) * s, (7.5 + H(8) * 2) * s, 0.4],
    [tx + (H(9) - 0.5) * 3 * s, ty - (5 + H(10) * 2) * s, (10 + H(11) * 2.5) * s, 0.85],
  ];
  if (H(12) > 0.45) pads.unshift([tx + (H(13) - 0.3) * 6 * s, ty + (10 + H(14) * 3) * s, 5.5 * s, 0.2]);
  pads.forEach(([px, py, r, lit], i) => {
    leafPart(ctx, (c) => {
      c.save(); c.translate(px, py); c.scale(1, 0.62); c.translate(-px, -py);
      leafClump(c, px, py, r, leaf, o.seed * 3 + i * 17, lit);
      c.restore();
    }, darken(leaf, 0.75), [px - r - 3, py - r * 0.7 - 3, px + r + 3, py + r * 0.7 + 3]);
  });
};

const spruce = (ctx, x, y, s, o) => {
  const leaf = o.forest ? WOOD_SPRUCE[o.band][o.v % 3] : ["#3e6a54", "#3a6250", "#44705a", "#365c4c"][o.v % 4];
  pineTree(ctx, x, y, s * 1.04, leaf, "#5a4232", o.seed);
};

// ---- crags -------------------------------------------------------------------
// Four kinds: a pinnacle with a shoulder, a tiered ledge, a split tor, a low
// broken crag. Heather sits on the ledges; bracken at the foot.
const crag = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed, v = o.forest ? (o.v % 2 ? 1 : 3) : o.v % 4;
  const col = o.forest ? mix(darken(GRIT, 0.1 + o.band * 0.08), "#5a6a50", 0.15) : GRIT;
  shadow(ctx, x + 6 * s, gy, 17 * s, 4.4 * s, 0.28);
  if (v === 0) {
    facet(ctx, x - 7 * s, gy - 2 * s, 8 * s, 17 * s, darken(col, 0.05), sd + 1);
    facet(ctx, x + 2 * s, gy, 8.5 * s, 29 * s, col, sd + 2);
    facet(ctx, x + 10 * s, gy + 1.5 * s, 5 * s, 8 * s, darken(col, 0.08), sd + 3, { flat: true });
    heatherMound(ctx, x - 8 * s, gy - 18 * s, 0.8 * s, sd + 4);
  } else if (v === 1) {
    facet(ctx, x + 1 * s, gy - 3 * s, 12 * s, 20 * s, darken(col, 0.04), sd + 1, { flat: true });
    facet(ctx, x - 3 * s, gy + 1 * s, 14 * s, 10 * s, col, sd + 2, { flat: true });
    heatherMound(ctx, x + 3 * s, gy - 22 * s, 0.9 * s, sd + 3);
    heatherMound(ctx, x - 9 * s, gy - 10 * s, 0.7 * s, sd + 5, true);
  } else if (v === 2) {
    facet(ctx, x - 6 * s, gy, 7 * s, 24 * s, col, sd + 1);
    facet(ctx, x + 6 * s, gy - 1 * s, 6.5 * s, 19 * s, darken(col, 0.06), sd + 2);
    facet(ctx, x + 1 * s, gy + 2 * s, 4 * s, 5 * s, lighten(col, 0.04), sd + 3, { flat: true });
    heatherMound(ctx, x + 6 * s, gy - 20 * s, 0.7 * s, sd + 4);
  } else {
    facet(ctx, x - 3 * s, gy, 13 * s, 13 * s, col, sd + 1, { flat: true });
    facet(ctx, x + 9 * s, gy + 1 * s, 5 * s, 7 * s, darken(col, 0.05), sd + 2);
    heatherMound(ctx, x - 5 * s, gy - 13 * s, 0.85 * s, sd + 3);
  }
  brackenFan(ctx, x - 13 * s, gy + 2, 0.7 * s, sd + 9);
  if (hash(sd, 8) > 0.4) brackenFan(ctx, x + 15 * s, gy + 2.5, 0.6 * s, sd + 10, true);
};

// ---- small pieces --------------------------------------------------------------
// a clump of heather on the open moor: the ground's own pixel cushions (see
// heatherTuft in the ground section), bracken beside some
const heatherClump = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = Math.abs(o.seed | 0), big = s > 1.05 ? 2 : 1;
  heatherTuft(ctx, x - 3 * s, gy, 1.1 * s, sd);
  heatherTuft(ctx, x + 5 * s, gy + 2, 0.8 * s, o.v === 3 ? 5 : sd + 7);     // v3: a duskier ling beside it
  if (o.v % 2) stampLow(ctx, "bracken", [0, 1, 2, 4][sd % 4], x + 10 * s, gy + 3, big);
  if (o.v === 2) stampLow(ctx, "bracken", 3, x - 11 * s, gy + 3, 1);
};

// A drystone wall: stones stacked dry in courses, a row of upright copes on
// top, a stretch of it tumbled. v: 0 straight, 1 tumbled gap, 2 corner, 3 with a stile.
const wallRun = (c, x0, y0, x1, y1, s, seed, hgt = 8) => {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / (4.2 * s)));
  const H = (i) => hash(seed, i);
  const at = (t, up) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - up];
  // the dark body the stones sit in, and its top seen from above
  c.beginPath();
  c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x1, y1 - hgt * s); c.lineTo(x0, y0 - hgt * s); c.closePath();
  c.fillStyle = darken(GRIT, 0.5); c.fill();
  c.beginPath();
  c.moveTo(x0, y0 - hgt * s); c.lineTo(x1, y1 - hgt * s); c.lineTo(x1 + 0.5, y1 - hgt * s - 2 * s); c.lineTo(x0 + 0.5, y0 - hgt * s - 2 * s); c.closePath();
  c.fillStyle = darken(GRIT, 0.28); c.fill();
  // three courses of rough stones, the lowest biggest
  [[1.7, 2.3], [4.3, 2.0], [6.6, 1.7]].forEach(([up, r], row) => {
    for (let i = 0; i < n + 1; i++) {
      const t = (i + (row % 2) * 0.5) / n;
      if (t > 1.02) continue;
      const [sx, sy] = at(Math.min(1, t), up * s);
      const h = H(row * 50 + i);
      const tone = h < 0.3 ? lighten(GRIT, 0.16) : h < 0.6 ? GRIT : h < 0.85 ? darken(GRIT, 0.12) : mix(GRIT, "#a08a6a", 0.35);
      const rx = (r + H(row * 50 + i + 7) * 0.6) * s * (len / (n * 4.2 * s)) * 0.95;
      ball(c, sx, sy, Math.max(1.2, rx), 1.25 * s, tone, { hi: 0.45, lo: 0.45 });
    }
  });
  // copes: slabs on edge along the top, tall and short in turn ("cock and hen"), lit on the left
  const m = Math.round(len / (1.9 * s));
  for (let i = 0; i < m; i++) {
    const [sx, sy] = at((i + 0.5) / m, hgt * s);
    const hh = (i % 2 ? 1.3 : 2.3) * s + H(i + 300) * 0.5;
    c.fillStyle = darken(GRIT, 0.22); c.fillRect(ap(sx - 0.5), ap(sy - hh), 1.5, hh + 0.5);
    c.fillStyle = lighten(GRIT, 0.25); c.fillRect(ap(sx - 0.5), ap(sy - hh), 0.5, hh);
    c.fillStyle = lighten(GRIT, 0.4); c.fillRect(ap(sx - 0.5), ap(sy - hh), 1.5, 0.5);
  }
};
const drystone = (ctx, x, y, s, o) => {
  const gy = y + 8, v = o.v % 4, sd = o.seed;
  shadow(ctx, x + 4 * s, gy + 1.5, 21 * s, 3.2 * s, 0.26);
  const W2 = 18 * s, tilt = (hash(sd, 1) - 0.5) * 8 * s;
  part(ctx, (c) => {
    if (v === 1) {
      wallRun(c, x - W2, gy - tilt, x - 3 * s, gy - tilt * 0.2, s, sd);
      wallRun(c, x + 6 * s, gy + tilt * 0.3, x + W2, gy + tilt, s, sd + 1, 5.5);
    } else if (v === 2) {
      wallRun(c, x - W2 + 4 * s, gy - 9 * s, x - W2 + 6 * s, gy, s, sd + 2, 6.5);
      wallRun(c, x - W2 + 6 * s, gy, x + W2, gy + tilt * 0.5, s, sd);
    } else wallRun(c, x - W2, gy - tilt, x + W2, gy + tilt, s, sd);
  });
  if (v === 1) {
    // the gap's tumble of stones
    for (let i = 0; i < 6; i++) stone(ctx, x + 1 * s + (hash(sd, i + 20) - 0.5) * 9 * s, gy + 1 + hash(sd, i + 26) * 3 * s, 1.5 * s, 1.1 * s, i % 2 ? GRIT : lighten(GRIT, 0.1));
  }
  if (v === 3) {
    // a stile: two through-stones jutting from the face, a post
    part(ctx, (c) => {
      c.fillStyle = lighten(GRIT, 0.1);
      c.fillRect(ap(x - 2 * s), ap(gy - 3.5 * s), 4 * s, 1.5 * s);
      c.fillRect(ap(x + 1 * s), ap(gy - 6.5 * s), 4 * s, 1.5 * s);
      cylinder(c, x + 5 * s, gy - 13 * s, 2 * s, 13 * s, WOOD, { r: 0.6 });
    });
  }
  for (let i = 0; i < 3; i++) tuft(ctx, x - W2 + hash(sd, i + 40) * W2 * 2, gy + (i % 2) + 1, 0.55, mix(REALM.GRASS_DK, REALM.GRASS, 0.2), lighten(REALM.GRASS_LT, 0.1), sd + i, { n: 3 });
};

// A gibbet at the crossroads: a post, an arm, an iron cage hanging empty, a crow.
const gibbet = (ctx, x, y, s, o) => {
  const gy = y + 8, hh = 34 * s;
  shadow(ctx, x + 8 * s, gy, 14 * s, 3 * s, 0.26);
  part(ctx, (c) => {
    for (const [dx, r] of [[-3, 2.4], [2.5, 2.2], [0, 2]]) ball(c, x + dx * s, gy - 0.5, r * s, r * 0.7 * s, GRIT, { hi: 0.4, lo: 0.4 });
  });
  part(ctx, (c) => cylinder(c, x - 1.6 * s, gy - hh, 3.2 * s, hh, WOOD_DK, { r: 0.8, hi: 0.35 }));
  part(ctx, (c) => {
    c.fillStyle = lin(c, 0, gy - hh, 0, gy - hh + 2.5 * s, [[0, WOOD_LT], [1, WOOD_DK]]);
    c.fillRect(x - 2 * s, gy - hh, 15 * s, 2.5 * s);
    c.strokeStyle = WOOD_DK; c.lineWidth = 1.4 * s; c.lineCap = "round";
    c.beginPath(); c.moveTo(x + 1 * s, gy - hh + 7 * s); c.lineTo(x + 6 * s, gy - hh + 2 * s); c.stroke();
  });
  // chain and cage
  const cx = x + 11 * s, ct = gy - hh + 9 * s;
  ctx.fillStyle = IRON;
  for (let k = 0; k < 5; k++) ctx.fillRect(ap(cx - 0.25), ap(gy - hh + 2.5 * s + k * 1.3 * s), 0.5, 0.8 * s);
  part(ctx, (c) => {
    c.strokeStyle = IRON; c.lineWidth = 0.9;
    for (const dx of [-3, -1, 1, 3]) { c.beginPath(); c.moveTo(cx + dx * 0.4 * s, ct); c.quadraticCurveTo(cx + dx * 1.3 * s, ct + 5 * s, cx + dx * 0.6 * s, ct + 11 * s); c.stroke(); }
    c.lineWidth = 1.1;
    for (const k of [0.1, 0.5, 0.95]) { c.beginPath(); c.ellipse(cx, ct + 11 * s * k, (k === 0.5 ? 4 : 2.6) * s, 1 * s, 0, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = STEEL; c.fillRect(ap(cx - 1.5 * s), ap(ct + 11 * s), 3 * s, 1);
  });
  // a crow on the arm
  part(ctx, (c) => {
    const bx = x + 4 * s, by = gy - hh - 0.5;
    ball(c, bx, by - 1.6 * s, 2 * s, 1.5 * s, "#2c2a34", { hi: 0.3, lo: 0.3 });
    ball(c, bx + 1.6 * s, by - 3 * s, 1.1 * s, 1 * s, "#2c2a34", { hi: 0.3, lo: 0.3 });
    c.fillStyle = "#9a8a60"; c.fillRect(ap(bx + 2.6 * s), ap(by - 3 * s), 1, 0.5);
    c.fillStyle = "#2c2a34"; c.fillRect(ap(bx - 3 * s), ap(by - 1.6 * s), 2 * s, 1);
  });
  brackenFan(ctx, x - 4 * s, gy + 1.5, 0.6 * s, o.seed + 4);
};

// A milestone: a dressed stone with a rounded head, the Kingdom's tower cut
// in and picked out in oxblood.
const milestone = (ctx, x, y, s, o) => {
  const gy = y + 8, w = 4.2 * s, hh = 10 * s;
  shadow(ctx, x + 3 * s, gy + 0.5, 6 * s, 2 * s, 0.26);
  part(ctx, (c) => {
    c.beginPath();
    c.moveTo(x - w, gy); c.lineTo(x - w, gy - hh + w); c.quadraticCurveTo(x - w, gy - hh, x, gy - hh); c.quadraticCurveTo(x + w, gy - hh, x + w, gy - hh + w); c.lineTo(x + w, gy); c.closePath();
    c.fillStyle = lin(c, x - w, 0, x + w, 0, [[0, lighten(ASHLAR, 0.25)], [0.5, ASHLAR], [1, darken(ASHLAR, 0.35)]]); c.fill();
    c.save(); c.clip();
    c.fillStyle = OX; c.fillRect(x - w, ap(gy - hh * 0.46), w * 2, 1.5 * s);
    device(c, x - 0.2, gy - hh + 2.2 * s, 0.62 * s);
    c.fillStyle = "#7a8a5a"; c.fillRect(x - w, gy - 1.5, w * 2, 1.5);
    c.restore();
  });
  tuft(ctx, x - w - 0.5, gy + 1, 0.5, REALM.TUFT, REALM.GRASS_LT, o.seed, { n: 3 });
  tuft(ctx, x + w + 1, gy + 1.5, 0.45, REALM.TUFT, REALM.GRASS_LT, o.seed + 1, { n: 3 });
};

// A beacon: a round stone plinth carrying an iron fire-basket.
const beaconBody = (c, x, y, s) => {
  const gy = y + 8;
  shadow(c, x + 5 * s, gy + 0.5, 10 * s, 3 * s, 0.28);
  part(c, (cc) => {
    cylinder(cc, x - 5.5 * s, gy - 12 * s, 11 * s, 12 * s, ASHLAR, { r: 1.5, hi: 0.3, lo: 0.5 });
    cc.fillStyle = darken(ASHLAR, 0.35);
    for (const yy of [4, 8]) cc.fillRect(x - 5.5 * s, ap(gy - yy * s), 11 * s, 0.5);
    for (const [xx, yy] of [[-2, 2], [2.5, 6], [-3.5, 10], [0.5, 10]]) cc.fillRect(ap(x + xx * s), ap(gy - yy * s - 1.8 * s), 0.5, 1.8 * s);
    ellipse(cc, x, gy - 12 * s, 5.5 * s, 1.8 * s); cc.fillStyle = lighten(ASHLAR, 0.3); cc.fill();
  });
  part(c, (cc) => {
    // the basket: iron staves flaring out, a band, coals
    cc.fillStyle = IRON;
    for (const dx of [-4, -1.5, 1.5, 4]) { cc.beginPath(); cc.moveTo(x + dx * 0.55 * s - 0.4, gy - 12.5 * s); cc.lineTo(x + dx * s - 0.5, gy - 19 * s); cc.lineTo(x + dx * s + 0.5, gy - 19 * s); cc.lineTo(x + dx * 0.55 * s + 0.4, gy - 12.5 * s); cc.fill(); }
    cc.fillStyle = STEEL; cc.fillRect(x - 4.3 * s, ap(gy - 17 * s), 8.6 * s, 1);
    ellipse(cc, x, gy - 19 * s, 4.6 * s, 1.5 * s); cc.fillStyle = "#3a2420"; cc.fill();
    cc.fillStyle = "#e0602c"; cc.fillRect(ap(x - 2 * s), ap(gy - 19.5 * s), 1.5, 0.5); cc.fillRect(ap(x + 1 * s), ap(gy - 19 * s), 1, 0.5);
  });
};
const beacon = (ctx, x, y, s, o) => {
  const sp = body(`beacon|${s}`, Math.ceil(16 * s + 4), Math.ceil(24 * s + 4), 8, (c, bx, by) => beaconBody(c, bx, by, s));
  stampBody(ctx, sp, x, y);
  fire(ctx, x, y + 8 - 19.5 * s, s, o.time, x * 0.37);
};

// A supply wagon, halted: oxblood sideboards strapped with iron, a canvas tilt
// over hoops, the shafts down on the turf, a barrel beside.
const wagon = (ctx, x, y, s, o) => {
  const gy = y + 8, v = o.v % 4, sd = o.seed;
  const L = 16 * s;   // half the bed's length
  shadow(ctx, x + 5 * s, gy, 25 * s, 4 * s, 0.28);
  const wheel = (c, wx, wy, r, far) => {
    part(c, (cc) => {
      ellipse(cc, wx, wy, r, r); cc.fillStyle = far ? WOOD_DK : WOOD; cc.fill();
      ellipse(cc, wx, wy, r - 1.2, r - 1.2); cc.fillStyle = far ? "#2a2024" : "#3a2c26"; cc.fill();
      cc.strokeStyle = far ? WOOD_DK : WOOD_LT; cc.lineWidth = 0.8;
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + sd; cc.beginPath(); cc.moveTo(wx, wy); cc.lineTo(wx + Math.cos(a) * (r - 1), wy + Math.sin(a) * (r - 1)); cc.stroke(); }
      ball(cc, wx, wy, 1.2, 1.2, IRON, { hi: 0.4, lo: 0.3 });
      cc.strokeStyle = IRON; cc.lineWidth = 0.6; ellipse(cc, wx, wy, r - 0.3, r - 0.3); cc.stroke();
    });
  };
  // far wheels peek out above the bed
  wheel(ctx, x - L + 5 * s, gy - 5 * s, 4.6 * s, true);
  wheel(ctx, x + L - 4 * s, gy - 5 * s, 4.6 * s, true);
  // the shafts, resting on the ground ahead
  part(ctx, (c) => {
    c.strokeStyle = WOOD; c.lineWidth = 1.3 * s; c.lineCap = "round";
    c.beginPath(); c.moveTo(x + L - 1, gy - 7 * s); c.lineTo(x + L + 12 * s, gy - 1 * s); c.stroke();
    c.strokeStyle = WOOD_DK;
    c.beginPath(); c.moveTo(x + L - 2, gy - 9.5 * s); c.lineTo(x + L + 10 * s, gy - 4 * s); c.stroke();
  });
  // the bed: its top (cargo) and the oxblood side facing us
  part(ctx, (c) => {
    c.fillStyle = WOOD_DK; c.fillRect(x - L, gy - 14 * s, L * 2, 4 * s);
    c.fillStyle = lin(c, 0, gy - 10 * s, 0, gy - 4 * s, [[0, OX_LT], [0.5, OX], [1, OX_DK]]);
    c.fillRect(x - L, gy - 10 * s, L * 2, 6 * s);
    c.fillStyle = IRON;
    for (const dx of [-L + 1, -L * 0.33, L * 0.33, L - 2.5]) c.fillRect(ap(x + dx), gy - 10 * s, 1.5, 6 * s);
    c.fillStyle = BRASS; c.fillRect(ap(x - 0.5), ap(gy - 8 * s), 1, 1);
    c.fillStyle = WOOD_LT; c.fillRect(x - L, gy - 10.5 * s, L * 2, 0.5);
  });
  // the load: a canvas tilt over hoops (v 0, 2) or an open bed of barrels and pikes
  if (v === 0 || v === 2) {
    part(ctx, (c) => {
      const t0 = x - L + 1, t1 = x + L * (v === 2 ? 0.4 : 0.55);
      c.beginPath();
      c.moveTo(t0, gy - 12 * s); c.quadraticCurveTo(t0 - 1, gy - 25 * s, t0 + 5 * s, gy - 25 * s);
      c.lineTo(t1 - 5 * s, gy - 25 * s); c.quadraticCurveTo(t1 + 1, gy - 25 * s, t1, gy - 12 * s); c.closePath();
      c.fillStyle = lin(c, 0, gy - 25 * s, 0, gy - 12 * s, [[0, lighten(CANVAS, 0.3)], [0.4, CANVAS], [1, darken(CANVAS, 0.3)]]); c.fill();
      c.fillStyle = darken(CANVAS, 0.25);
      for (let k = 1; k < 4; k++) c.fillRect(ap(t0 + (t1 - t0) * k / 4), gy - 24 * s, 0.5, 12 * s);
      c.fillStyle = darken(CANVAS, 0.5); c.fillRect(t1 - 2.5 * s, gy - 23 * s, 2.5 * s, 11 * s);
    });
  }
  if (v !== 0) {
    part(ctx, (c) => {
      for (let k = 0; k < 2; k++) {
        const bx = x + L * (v === 2 ? 0.62 : -0.5 + k * 0.55), by = gy - 13 * s;
        cylinder(c, bx - 3 * s, by - 6 * s, 6 * s, 7 * s, "#8a6036", { r: 1.5 });
        c.fillStyle = IRON; c.fillRect(bx - 3 * s, by - 5 * s, 6 * s, 0.8); c.fillRect(bx - 3 * s, by - 1.5 * s, 6 * s, 0.8);
        ellipse(c, bx, by - 6 * s, 3 * s, 1.1 * s); c.fillStyle = "#a07a4a"; c.fill();
        if (v === 2) break;
      }
      if (v !== 2) {
        c.strokeStyle = WOOD_LT; c.lineWidth = 0.9;
        for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x - L * 0.2 + k, gy - 12 * s); c.lineTo(x + L * 0.9 + k, gy - 22 * s + k); c.stroke(); }
        c.fillStyle = STEEL_LT;
        for (let k = 0; k < 3; k++) c.fillRect(ap(x + L * 0.9 + k), ap(gy - 23.5 * s + k), 1, 1.5);
      }
    });
  }
  // near wheels
  wheel(ctx, x - L + 5 * s, gy - 4 * s, 5 * s, false);
  wheel(ctx, x + L - 5 * s, gy - 4 * s, 5 * s, false);
  // a barrel beside, or a sack
  part(ctx, (c) => {
    const bx = x - L - 5 * s;
    cylinder(c, bx - 3 * s, gy - 7 * s, 6 * s, 7.5 * s, "#8a6036", { r: 1.5 });
    c.fillStyle = IRON; c.fillRect(bx - 3 * s, gy - 5.5 * s, 6 * s, 0.8); c.fillRect(bx - 3 * s, gy - 2 * s, 6 * s, 0.8);
    ellipse(c, bx, gy - 7 * s, 3 * s, 1.1 * s); c.fillStyle = "#a07a4a"; c.fill();
  });
};

// Pikes stacked in a stook, a rack of shields, and a line of sharpened stakes.
const pikes = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed, v = o.v % 4;
  shadow(ctx, x + 5 * s, gy + 0.5, 15 * s, 3 * s, 0.26);
  if (v !== 3) {
    // the stook: pikes leaning in to a tie, heads fanned above it
    part(ctx, (c) => {
      c.lineCap = "round";
      const n = 6;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) - 0.5, fx = x + u * 12 * s, tx = x + 1 * s - u * 5 * s, ty = gy - 34 * s + Math.abs(u) * 3 * s;
        c.strokeStyle = i % 2 ? WOOD : WOOD_LT; c.lineWidth = 1.1 * s;
        c.beginPath(); c.moveTo(fx, gy); c.lineTo(tx, ty + 4 * s); c.stroke();
        c.fillStyle = STEEL_LT; c.beginPath(); c.moveTo(tx - 0.8 * s, ty + 4 * s); c.lineTo(tx, ty); c.lineTo(tx + 0.8 * s, ty + 4 * s); c.fill();
        c.fillStyle = STEEL_DK; c.fillRect(ap(tx), ty + 1.5 * s, 0.5, 2.5 * s);
      }
      c.fillStyle = "#8a6a3e"; c.fillRect(x - 3 * s, ap(gy - 22 * s), 7 * s, 1.5);
    });
  }
  if (v === 1 || v === 3) {
    // a cheval-de-frise: a log run through with crossed stakes
    part(ctx, (c) => {
      const cx = v === 3 ? x : x + 10 * s;
      cylinder(c, cx - 11 * s, gy - 5 * s, 22 * s, 2.6 * s, WOOD, { r: 1 });
      c.lineCap = "round"; c.lineWidth = 1.2 * s;
      for (let k = 0; k < 5; k++) {
        const kx = cx - 9 * s + k * 4.5 * s;
        c.strokeStyle = WOOD_LT; c.beginPath(); c.moveTo(kx - 4 * s, gy); c.lineTo(kx + 3 * s, gy - 10 * s); c.stroke();
        c.strokeStyle = WOOD; c.beginPath(); c.moveTo(kx + 4 * s, gy); c.lineTo(kx - 3 * s, gy - 10 * s); c.stroke();
        c.fillStyle = "#c8b08a"; c.fillRect(ap(kx + 2.5 * s), ap(gy - 10.5 * s), 1, 1); c.fillRect(ap(kx - 3.5 * s), ap(gy - 10.5 * s), 1, 1);
      }
    });
  }
  if (v === 2) {
    // a shield propped against the stook: oxblood with the grey tower
    part(ctx, (c) => {
      const sx = x - 8 * s, sy = gy - 12 * s;
      c.beginPath(); c.moveTo(sx - 4 * s, sy); c.lineTo(sx + 4 * s, sy); c.lineTo(sx + 4 * s, sy + 5 * s); c.quadraticCurveTo(sx + 3 * s, sy + 10 * s, sx, sy + 12 * s); c.quadraticCurveTo(sx - 3 * s, sy + 10 * s, sx - 4 * s, sy + 5 * s); c.closePath();
      c.fillStyle = OX; c.fill();
      c.fillStyle = OX_LT; c.fillRect(sx - 4 * s, sy, 1, 7 * s);
      c.fillStyle = IRON; c.fillRect(sx - 4 * s, sy, 8 * s, 1);
      device(c, sx, sy + 2.5 * s, 0.8 * s);
    });
  }
  brackenFan(ctx, x + 12 * s, gy + 2, 0.55 * s, sd + 2);
};

// The Kingdom's war tents: oxblood canvas, an iron-grey valance, a brass finial.
const warTent = (ctx, x, y, s, o) => {
  const gy = y + 8, v = o.v % 4, sd = o.seed;
  shadow(ctx, x + 6 * s, gy + 0.5, 19 * s, 4.4 * s, 0.3);
  if (v === 0 || v === 2) {
    // a bell tent: round walls, a cone of roof, the door flap tied back
    const R = 13 * s, wh = 9 * s, rh = 16 * s;
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(x - R, gy - wh); c.lineTo(x - R, gy); c.quadraticCurveTo(x, gy + 3 * s, x + R, gy); c.lineTo(x + R, gy - wh); c.closePath();
      c.fillStyle = lin(c, x - R, 0, x + R, 0, [[0, OX_LT], [0.45, OX], [1, OX_DK]]); c.fill();
      // the door: dark mouth, a cream lining on the tied-back flap
      c.beginPath(); c.moveTo(x - 1 * s, gy - wh - 1); c.lineTo(x + 4 * s, gy + 1.5 * s); c.lineTo(x - 5 * s, gy + 1.5 * s); c.closePath();
      c.fillStyle = "#1e1618"; c.fill();
      c.beginPath(); c.moveTo(x - 1 * s, gy - wh - 1); c.lineTo(x - 5 * s, gy + 1.5 * s); c.lineTo(x - 7 * s, gy + 1.3 * s); c.closePath();
      c.fillStyle = CANVAS; c.fill();
    });
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(x, gy - wh - rh); c.lineTo(x + R + 1.5 * s, gy - wh + 0.5); c.quadraticCurveTo(x, gy - wh + 3 * s, x - R - 1.5 * s, gy - wh + 0.5); c.closePath();
      c.fillStyle = lin(c, x - R, gy - wh - rh, x + R, gy - wh, [[0, lighten(OX, 0.28)], [0.5, OX], [1, OX_DK]]); c.fill();
      c.save(); c.clip();
      c.fillStyle = rgba("#2a1c2c", 0.25);
      for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x, gy - wh - rh); c.lineTo(x - R + k * R * 0.5 - 0.3, gy - wh + 2); c.lineTo(x - R + k * R * 0.5 + 0.3, gy - wh + 2); c.fill(); }
      c.restore();
      // the valance: iron-grey scallops round the eaves
      for (let k = 0; k < 6; k++) {
        const vx = x - R + (k + 0.5) * (R * 2 / 6);
        ellipse(c, vx, gy - wh + 1.3 * s + Math.sin((k / 5) * Math.PI) * 1.2 * s, 1.9 * s, 1.5 * s);
        c.fillStyle = k < 3 ? STEEL : darken(STEEL, 0.2); c.fill();
      }
    });
    part(ctx, (c) => {
      c.fillStyle = WOOD_DK; c.fillRect(ap(x - 0.5), gy - wh - rh - 5 * s, 1, 5 * s);
      ball(c, x, gy - wh - rh - 5 * s, 1.1 * s, 1.1 * s, BRASS, { hi: 0.5, lo: 0.3 });
      c.fillStyle = OX; c.fillRect(ap(x + 0.5), ap(gy - wh - rh - 4.5 * s), 5 * s, 1.5 * s);
      c.fillStyle = OX_DK; c.fillRect(ap(x + 3 * s), ap(gy - wh - rh - 3.5 * s), 2.5 * s, 0.5);
    });
    // guy ropes and pegs
    ctx.strokeStyle = rgba("#d8ccb0", 0.8); ctx.lineWidth = 0.5;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sx * R * 0.9, gy - wh); ctx.lineTo(x + sx * (R + 5 * s), gy + 1); ctx.stroke(); ctx.fillStyle = WOOD_DK; ctx.fillRect(ap(x + sx * (R + 5 * s)), gy, 1, 1.5); }
    if (v === 2) {
      // a weapons rack beside: spears and a shield
      part(ctx, (c) => {
        const rx = x + R + 5 * s;
        cylinder(c, rx - 5 * s, gy - 7 * s, 1.2, 7 * s, WOOD, { r: 0.4 });
        cylinder(c, rx + 4 * s, gy - 7 * s, 1.2, 7 * s, WOOD, { r: 0.4 });
        c.fillStyle = WOOD_LT; c.fillRect(rx - 5 * s, gy - 6 * s, 10 * s, 1);
        c.strokeStyle = WOOD_LT; c.lineWidth = 0.8;
        for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(rx - 3 * s + k * 3 * s, gy); c.lineTo(rx - 2 * s + k * 3 * s, gy - 16 * s); c.stroke(); c.fillStyle = STEEL_LT; c.fillRect(ap(rx - 2.5 * s + k * 3 * s), ap(gy - 18 * s), 1, 2); }
      });
    }
  } else {
    // a ridge tent for the rank and file: the long roof slope facing us under
    // a short ridge, grey gable ends slanting away at either side
    const L = 13 * s, hh = 12 * s, rl = L - 5 * s;
    part(ctx, (c) => {
      // the far gable end (left), in shade
      c.beginPath(); c.moveTo(x - rl, gy - hh); c.lineTo(x - L - 1 * s, gy); c.lineTo(x - L + 5 * s, gy - 1); c.closePath();
      c.fillStyle = darken(STEEL, 0.35); c.fill();
      // the roof slope
      c.beginPath(); c.moveTo(x - rl, gy - hh); c.lineTo(x + rl, gy - hh); c.lineTo(x + L + 1 * s, gy); c.lineTo(x - L - 1 * s, gy); c.closePath();
      c.fillStyle = lin(c, 0, gy - hh, 0, gy, [[0, lighten(OX, 0.25)], [0.5, OX], [1, OX_DK]]); c.fill();
      c.fillStyle = rgba("#2a1c2c", 0.28);
      for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * rl * 0.5 - 0.3, gy - hh); c.lineTo(x + k * L * 0.55 - 0.4, gy); c.lineTo(x + k * L * 0.55 + 0.4, gy); c.lineTo(x + k * rl * 0.5 + 0.3, gy - hh); c.fill(); }
      c.fillStyle = OX_LT; c.fillRect(x - rl, gy - hh, rl * 2, 1);
      c.fillStyle = STEEL; c.fillRect(x - L - 0.5 * s, gy - 1.5, L * 2 + 1 * s, 1.5);
    });
    part(ctx, (c) => {
      // the near gable end (right) with its open door
      c.beginPath(); c.moveTo(x + rl, gy - hh); c.lineTo(x + L + 1 * s, gy); c.lineTo(x + L + 6 * s, gy - 1); c.closePath();
      c.fillStyle = darken(STEEL, 0.1); c.fill();
      c.beginPath(); c.moveTo(x + rl + 2 * s, gy - hh * 0.55); c.lineTo(x + L + 1.5 * s, gy); c.lineTo(x + L + 4.5 * s, gy - 0.5); c.closePath();
      c.fillStyle = "#1e1618"; c.fill();
      cylinder(c, x + rl - 0.6, gy - hh - 3 * s, 1.2, 3 * s, WOOD_DK, { r: 0.4 });
      cylinder(c, x - rl - 0.6, gy - hh - 3 * s, 1.2, 3 * s, WOOD_DK, { r: 0.4 });
    });
    if (v === 3) {
      // a cold campfire: a ring of stones, charred ends
      part(ctx, (c) => {
        const fx = x - L - 7 * s, fy = gy + 1;
        for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; ball(c, fx + Math.cos(a) * 3.5 * s, fy + Math.sin(a) * 1.8 * s, 1.2 * s, 0.9 * s, GRIT, { hi: 0.4, lo: 0.4 }); }
        c.fillStyle = "#2a2226"; c.fillRect(fx - 2 * s, fy - 0.5, 4 * s, 1);
      });
    }
  }
};

// A standard of the Kingdom: a tall pole and crossbar, the long oxblood cloth
// with the grey iron tower. The pole is baked; the cloth sways live.
const bannerBody = (c, x, y, s) => {
  const gy = y + 8, hh = 30 * s;
  shadow(c, x + 4 * s, gy + 0.5, 6 * s, 2 * s, 0.28);
  part(c, (cc) => { for (const [dx, r] of [[-2.2, 2], [2, 1.8], [0, 1.6]]) ball(cc, x + dx * s, gy - 0.3, r * s, r * 0.7 * s, GRIT, { hi: 0.4, lo: 0.4 }); });
  part(c, (cc) => {
    cylinder(cc, x - 1, gy - hh, 2, hh, WOOD_DK, { r: 0.8 });
    cc.fillStyle = IRON; cc.fillRect(x - 5.5 * s, gy - hh + 2 * s, 11 * s, 1.2);
    ball(cc, x, gy - hh - 0.5, 1.3, 1.3, BRASS, { hi: 0.5, lo: 0.3 });
    cc.fillStyle = BRASS; cc.fillRect(x - 6 * s, gy - hh + 1.8 * s, 1, 1.5); cc.fillRect(x + 5.5 * s - 1, gy - hh + 1.8 * s, 1, 1.5);
  });
};
const standard = (ctx, x, y, s, o) => {
  const sp = body(`banner|${s}`, Math.ceil(10 * s + 4), Math.ceil(33 * s + 4), 8, (c, bx, by) => bannerBody(c, bx, by, s));
  stampBody(ctx, sp, x, y);
  const gy = y + 8, hh = 30 * s;
  const sway = Math.sin(o.time * 1.7 + x * 0.13) * 1.4 + Math.sin(o.time * 3.1 + x) * 0.4;
  cloth(ctx, ap(x - 4.5 * s), ap(gy - hh + 3 * s), Math.round(9 * s * 2) / 2, 15 * s, sway);
};

// The Kingdom's watchtower: a square keep of dressed stone, battlemented, the
// banner hung down its face and a pennant streaming from the pole.
const ashlar = (c, x, top, w, h, col, seed) => {
  c.fillStyle = lin(c, x, 0, x + w, 0, [[0, lighten(col, 0.22)], [0.5, col], [1, darken(col, 0.28)]]);
  c.fillRect(x, top, w, h);
  const ch = 3.5;
  let row = 0;
  for (let cy = top + ch; cy < top + h - 0.1; cy += ch, row++) {
    c.fillStyle = darken(col, 0.38); c.fillRect(x, ap(cy), w, 0.5);
    c.fillStyle = lighten(col, 0.3); c.fillRect(x, ap(cy) + 0.5, w, 0.5);
    const bw = 5 + hash(seed, row) * 2;
    for (let bx = x + (row % 2 ? bw / 2 : 1) + hash(seed, row + 20) * 1.5; bx < x + w - 1; bx += bw) {
      c.fillStyle = darken(col, 0.38); c.fillRect(ap(bx), ap(cy - ch) + 0.5, 0.5, ch - 0.5);
    }
  }
};
const towerBody = (c, x, y, s, v) => {
  const gy = y + 8, w2 = 9 * s, hh = 40 * s, top = gy - hh;
  shadow(c, x + 9 * s, gy, 17 * s, 4.5 * s, 0.32);
  part(c, (cc) => {
    // the batter at the foot, then the shaft; the east face in shade
    cc.fillStyle = darken(ASHLAR, 0.42);
    cc.beginPath(); cc.moveTo(x + w2, top + 4); cc.lineTo(x + w2 + 3.5 * s, top + 1.5); cc.lineTo(x + w2 + 3.5 * s, gy - 3); cc.lineTo(x + w2, gy); cc.closePath(); cc.fill();
    ashlar(cc, x - w2, top + 4, w2 * 2, hh - 4, ASHLAR, 11 + v);
    cc.fillStyle = darken(ASHLAR, 0.1);
    cc.beginPath(); cc.moveTo(x - w2 - 1.5 * s, gy); cc.lineTo(x - w2, gy - 6 * s); cc.lineTo(x + w2, gy - 6 * s); cc.lineTo(x + w2 + 1.5 * s, gy); cc.closePath(); cc.fill();
    cc.fillStyle = lighten(ASHLAR, 0.2); cc.fillRect(x - w2, gy - 6 * s, w2 * 2, 0.5);
    // moss creeping up from the foot
    cc.fillStyle = "#6a7a4a"; cc.fillRect(x - w2 - 1, gy - 1.5, 5 * s, 1.5); cc.fillRect(x - w2, gy - 2.5, 2 * s, 1);
  });
  part(c, (cc) => {
    // the parapet: corbelled out, merlons along the front, the deck behind
    const pt = top - 3 * s;
    cc.fillStyle = darken(ASHLAR, 0.55); cc.fillRect(x - w2 - 1, pt - 2.5 * s, w2 * 2 + 2 + 3 * s, 3 * s);
    cc.fillStyle = darken(ASHLAR, 0.15);
    for (let k = 0; k < 4; k++) cc.fillRect(x - w2 - 1 + k * (w2 * 2 + 2) / 4 + 1, pt - 4.5 * s, (w2 * 2 + 2) / 4 - 2.5, 2.5 * s);
    ashlar(cc, x - w2 - 1, pt, w2 * 2 + 2, 7 * s, lighten(ASHLAR, 0.04), 7);
    for (let k = 0; k < 4; k++) {
      const mx = x - w2 - 1 + k * (w2 * 2 + 2) / 4 + 0.5, mw = (w2 * 2 + 2) / 4 - 1.5;
      cc.fillStyle = lighten(ASHLAR, 0.1); cc.fillRect(mx, pt - 3.5 * s, mw, 3.5 * s + 0.5);
      cc.fillStyle = lighten(ASHLAR, 0.4); cc.fillRect(mx, pt - 3.5 * s, mw, 0.5);
      cc.fillStyle = darken(ASHLAR, 0.3); cc.fillRect(mx + mw - 0.5, pt - 3.5 * s, 0.5, 3.5 * s);
    }
    // corbels under it
    cc.fillStyle = darken(ASHLAR, 0.45);
    for (let k = 0; k < 5; k++) cc.fillRect(ap(x - w2 + 0.5 + k * (w2 * 2 - 1) / 4), pt + 7 * s, 1, 1.5);
    // the east side of the parapet
    cc.fillStyle = darken(ASHLAR, 0.38); cc.fillRect(x + w2 + 1, pt - 1.5 * s, 2.5 * s, 8.5 * s);
  });
  part(c, (cc) => {
    // the door, iron-studded, and arrow slits
    cc.fillStyle = "#1c1618";
    cc.beginPath(); cc.moveTo(x - 3 * s, gy - 0.5); cc.lineTo(x - 3 * s, gy - 7 * s); cc.quadraticCurveTo(x, gy - 10.5 * s, x + 3 * s, gy - 7 * s); cc.lineTo(x + 3 * s, gy - 0.5); cc.closePath(); cc.fill();
    cc.fillStyle = WOOD_DK; cc.fillRect(x - 2.5 * s, gy - 7 * s, 5 * s, 6.5 * s);
    cc.fillStyle = IRON; for (const yy of [2.5, 5.5]) cc.fillRect(x - 2.5 * s, ap(gy - yy * s), 5 * s, 0.8);
    cc.fillStyle = BRASS; cc.fillRect(ap(x + 1.2 * s), ap(gy - 4 * s), 1, 1);
    cc.fillStyle = "#1c1618";
    cc.fillRect(ap(x - 5.5 * s), ap(top + 20 * s), 1, 4 * s);
    cc.fillRect(ap(x + 5 * s), ap(top + 20 * s), 1, 4 * s);
  });
  // the Kingdom's banner hung down the face
  part(c, (cc) => cloth(cc, ap(x - 3.5 * s), ap(top + 6 * s), Math.round(7 * s * 2) / 2, 11 * s, 0));
  // the pennant's pole on the deck
  part(c, (cc) => { cylinder(cc, x - 0.6, top - 20 * s, 1.2, 17 * s, WOOD_DK, { r: 0.4 }); ball(cc, x, top - 20 * s, 1, 1, BRASS, { hi: 0.5, lo: 0.3 }); });
};
// A ruin of an older border tower: the shaft broken off in a jagged line,
// its hollow inside showing, rubble and a fallen block at the foot, moss.
const ruin = (ctx, x, y, s, o) => {
  const gy = y + 8, w2 = 9 * s, sd = o.seed, hh = (22 + hash(sd, 1) * 8) * s, top = gy - hh;
  shadow(ctx, x + 8 * s, gy, 16 * s, 4.2 * s, 0.3);
  // the jagged break: a line of steps across the top
  const jag = [];
  for (let i = 0; i <= 8; i++) jag.push([x - w2 + (i / 8) * w2 * 2, top + (hash(sd, i + 10) * 7 + (i > 4 ? (i - 4) * 2.2 : 0)) * s]);
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(x - w2, gy); jag.forEach(([jx, jy]) => c.lineTo(jx, jy)); c.lineTo(x + w2, gy); c.closePath();
    c.save(); c.clip();
    ashlar(c, x - w2, top - 2, w2 * 2, hh + 2, darken(ASHLAR, 0.05), sd);
    // the hollow inside, seen over the broken front wall
    c.fillStyle = "#2e2a2e";
    c.beginPath(); c.moveTo(x - w2 + 2, top + 9 * s); jag.slice(1, 8).forEach(([jx, jy]) => c.lineTo(jx, jy + 2.5 * s)); c.lineTo(x + w2 - 2, top + 9 * s); c.closePath(); c.fill();
    c.fillStyle = "#1c1618"; c.fillRect(ap(x - 1.5 * s), ap(gy - 9 * s), 3 * s, 9 * s);
    c.fillRect(ap(x + 4 * s), ap(top + 12 * s), 1, 3.5 * s);
    c.fillStyle = "#62704a";
    for (let i = 0; i < 9; i++) c.fillRect(ap(x - w2 + hash(sd, i + 30) * w2 * 2), ap(gy - 1 - hash(sd, i + 40) * hh * 0.6), 1, 1.5);
    c.restore();
    // the east face in shade
    c.fillStyle = darken(ASHLAR, 0.42);
    c.beginPath(); c.moveTo(x + w2, jag[8][1]); c.lineTo(x + w2 + 3 * s, jag[8][1] - 1.5); c.lineTo(x + w2 + 3 * s, gy - 2.5); c.lineTo(x + w2, gy); c.closePath(); c.fill();
  });
  // rubble and a fallen block
  for (let i = 0; i < 7; i++) {
    const rx = x + (hash(sd, i + 50) - 0.3) * 30 * s, ry = gy + 1 + hash(sd, i + 60) * 4;
    if (Math.abs(rx - x) < w2 && ry < gy + 2) continue;
    stone(ctx, rx, ry, (1.3 + hash(sd, i + 70) * 1.2) * s, 1 * s, i % 2 ? ASHLAR : darken(ASHLAR, 0.12));
  }
  part(ctx, (c) => {
    const bx = x + w2 + 7 * s, by = gy + 1;
    c.fillStyle = lighten(ASHLAR, 0.15); c.fillRect(bx - 4 * s, by - 5 * s, 8 * s, 2 * s);
    c.fillStyle = darken(ASHLAR, 0.1); c.fillRect(bx - 4 * s, by - 3 * s, 8 * s, 3 * s);
    c.fillStyle = darken(ASHLAR, 0.4); c.fillRect(bx - 4 * s, by - 3 * s, 8 * s, 0.5);
  });
  heatherMound(ctx, x - w2 - 3 * s, gy + 1, 0.8 * s, sd + 4);
};

const kingTower = (ctx, x, y, s, o) => {
  const sp = body(`tower|${s}|${o.v % 2}`, Math.ceil(16 * s + 4), Math.ceil(56 * s + 4), 10, (c, bx, by) => towerBody(c, bx, by, s, o.v % 2));
  stampBody(ctx, sp, x, y);
  const top = y + 8 - 40 * s;
  pennant(ctx, x + 0.6, top - 19.5 * s, 10 * s, 3.5 * s, o.time, x * 0.3);
};

// ---- the gate the Iron army comes out of ------------------------------------
// The Kingdom's forward camp lies off the board's edge in the pines; its
// palisade runs down the edge, with a timber gate-tower on the near side of
// the road. Everything tall stands NORTH of the road (drawn under the foes, so
// nothing can stand in front of them); the south flank is a low stake line.
// The still parts bake once per realm; the banner and the brazier live.
const CAMP = { key: "", ground: null, build: null, x0: 0, y0: 0, w: 0, h: 0, tx: 0, ty: 0 };
const bakeCamp = () => {
  const key = `${REALM.id}|${PTS[0]}|${PTS.length}`;
  if (CAMP.key === key) return CAMP;
  CAMP.key = key;
  const [, sy] = PTS[0];
  const x0 = 0, y0 = Math.max(0, Math.floor(sy - 130)), y1 = Math.min(H, Math.ceil(sy + 120)), w = 110, h = y1 - y0;
  CAMP.x0 = x0; CAMP.y0 = y0; CAMP.w = w; CAMP.h = h;
  const ly = sy - y0;   // the road's line inside the sprite
  // 1. the ground: trampled mud at the gate, ruts, the camp's shadow deepening
  //    toward the edge so the column comes out of the dark
  CAMP.ground = bakeSprite(w, h, (c) => {
    // trampled ground round the gate: two stepped bands of shade, not a soft disc
    c.fillStyle = "rgba(58,46,36,0.2)"; ellipse(c, 34, ly + 2, 38, 30); c.fill();
    c.fillStyle = "rgba(58,46,36,0.22)"; ellipse(c, 30, ly + 2, 24, 18); c.fill();
    for (let i = 0; i < 26; i++) {
      const rx = 4 + hash(i, 5) * 70, ry = ly + (hash(i, 6) - 0.5) * 60;
      c.fillStyle = rgba(i % 3 ? "#4a3c30" : "#6a5a44", 0.55);
      c.fillRect(ap(rx), ap(ry), 1 + (i % 2), 0.5);
    }
    const cv = c.canvas, PW = cv.width, PH = cv.height;
    const img = c.getImageData(0, 0, PW, PH), dd = img.data;
    const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let py = 0; py < PH; py++) for (let pxx = 0; pxx < PW; pxx++) {
      const X = pxx / PX, Y = py / PX + y0;
      const across = Math.abs(Y - sy);
      if (across > PATH_HALF + 16 || X > 44) continue;
      const a = Math.min(1, (44 - X) / 40) * Math.min(1, (PATH_HALF + 16 - across) / 20);
      const lvl = Math.min(4, Math.floor(a * 4 + B4[(py & 3) * 4 + (pxx & 3)] / 16));
      if (lvl <= 0) continue;
      const o = (py * PW + pxx) * 4, al = [0, 60, 110, 160, 205][lvl] / 255;
      dd[o] = Math.round(dd[o] * (1 - al) + 14 * al); dd[o + 1] = Math.round(dd[o + 1] * (1 - al) + 14 * al); dd[o + 2] = Math.round(dd[o + 2] * (1 - al) + 18 * al);
      dd[o + 3] = Math.max(dd[o + 3], Math.round(255 * al));
    }
    c.putImageData(img, 0, 0);
  }, false);
  // 2. what stands: the palisade (north and south wings), the gate leaf swung
  //    back along the road's north side, the tower, the stake line
  const stake = (c, x, gy, hh, k) => {
    cylinder(c, x - 1.6, gy - hh, 3.2, hh, k % 3 ? WOOD : mix(WOOD, "#7a6a50", 0.3), { r: 0.8, hi: 0.35, lo: 0.55 });
    c.fillStyle = mix(WOOD_LT, "#c8a878", 0.4);
    c.beginPath(); c.moveTo(x - 1.6, gy - hh + 0.5); c.lineTo(x, gy - hh - 2.6); c.lineTo(x + 1.6, gy - hh + 0.5); c.closePath(); c.fill();
  };
  CAMP.tx = 50; CAMP.ty = ly - PATH_HALF - 8;   // the tower's foot
  CAMP.build = bakeSprite(w, h, (c) => {
    // north wing of the palisade: behind the gate tower, back up into the wood
    part(c, (cc) => {
      for (let k = 0, yy = CAMP.ty - 70; yy <= CAMP.ty - 20; yy += 2.6, k++) {
        if (yy < -4) continue;
        stake(cc, 30 + Math.sin(k * 1.7) * 0.6 + (yy - CAMP.ty) * -0.12, yy, 17 + hash(k, 3) * 3, k);
      }
    });
    // south wing: set well back from the road, and low
    part(c, (cc) => {
      for (let k = 0, yy = ly + PATH_HALF + 20; yy < Math.min(h + 4, ly + PATH_HALF + 90); yy += 2.6, k++) stake(cc, 30 + Math.sin(k * 1.3) * 0.6 + (yy - ly) * 0.1, yy, 13 + hash(k, 4) * 3, k);
    });
    // a low cheval-de-frise pushed aside at the south verge
    part(c, (cc) => {
      const cx = 44, gy = ly + PATH_HALF + 16;
      cylinder(cc, cx - 12, gy - 4, 24, 2.4, WOOD, { r: 1 });
      cc.lineCap = "round"; cc.lineWidth = 1.2;
      for (let k = 0; k < 5; k++) {
        const kx = cx - 10 + k * 5;
        cc.strokeStyle = WOOD_LT; cc.beginPath(); cc.moveTo(kx - 3, gy); cc.lineTo(kx + 2.5, gy - 8); cc.stroke();
        cc.strokeStyle = WOOD; cc.beginPath(); cc.moveTo(kx + 3, gy); cc.lineTo(kx - 2.5, gy - 8); cc.stroke();
      }
    });
  });
  return CAMP;
};
// The gate tower itself stands in the depth-sorted pass (a decor piece,
// "irgate", placed by maps.js's ironVariant beside the road's first yards), so
// the pines behind it can't bury it. Feet at (x, y + 8); the gate leaf swings
// back along the road's north verge to the west of it, the first stakes of the
// palisade behind.
const PALE = (c, x, gy, hh, k) => {
  cylinder(c, x - 1.6, gy - hh, 3.2, hh, k % 3 ? WOOD : mix(WOOD, "#7a6a50", 0.3), { r: 0.8, hi: 0.35, lo: 0.55 });
  c.fillStyle = mix(WOOD_LT, "#c8a878", 0.4);
  c.beginPath(); c.moveTo(x - 1.6, gy - hh + 0.5); c.lineTo(x, gy - hh - 2.6); c.lineTo(x + 1.6, gy - hh + 0.5); c.closePath(); c.fill();
};
const gateBody = (c, x, y) => {
  const TW = 24, fx = x, gy = y + 8;
  // the palisade's first stakes, running back from the gate post
  part(c, (cc) => { for (let k = 0, yy = gy - 22; yy <= gy + 4; yy += 2.6, k++) PALE(cc, x - 28 + (yy - gy) * -0.12, yy, 17 + hash(k, 9) * 3, k); });
  shadow(c, fx + 10, gy + 1, 18, 4, 0.34);
  part(c, (cc) => {
    ashlar(cc, fx - TW / 2 - 1, gy - 7, TW + 2, 7, darken(ASHLAR, 0.06), 3);
    // planked walls between corner posts
    cc.fillStyle = lin(cc, fx - TW / 2, 0, fx + TW / 2, 0, [[0, WOOD_LT], [0.5, WOOD], [1, WOOD_DK]]);
    cc.fillRect(fx - TW / 2 + 1, gy - 34, TW - 2, 27);
    cc.fillStyle = WOOD_DK;
    for (let k = 1; k < 6; k++) cc.fillRect(ap(fx - TW / 2 + 1 + k * (TW - 2) / 6), gy - 34, 0.5, 27);
    cc.fillStyle = IRON; cc.fillRect(fx - TW / 2 + 1, gy - 22, TW - 2, 1); cc.fillRect(fx - TW / 2 + 1, gy - 12, TW - 2, 1);
    for (const px of [fx - TW / 2, fx + TW / 2 - 3]) cylinder(cc, px, gy - 36, 3, 29, WOOD_DK, { r: 0.6, hi: 0.3 });
    // the east side in shade
    cc.fillStyle = darken(WOOD, 0.45);
    cc.beginPath(); cc.moveTo(fx + TW / 2, gy - 36); cc.lineTo(fx + TW / 2 + 4, gy - 38); cc.lineTo(fx + TW / 2 + 4, gy - 9); cc.lineTo(fx + TW / 2, gy - 7); cc.closePath(); cc.fill();
  });
  part(c, (cc) => {
    const dt = gy - 36;
    // the fighting deck's breastwork, jutting out over the shaft
    cc.fillStyle = darken(WOOD, 0.55); cc.fillRect(fx - TW / 2 - 3, dt - 6, TW + 10, 4);
    cc.fillStyle = lin(cc, 0, dt - 2, 0, dt + 5, [[0, WOOD_LT], [1, WOOD_DK]]);
    cc.fillRect(fx - TW / 2 - 3, dt - 2, TW + 6, 7);
    cc.fillStyle = WOOD_DK; for (let k = 1; k < 7; k++) cc.fillRect(ap(fx - TW / 2 - 3 + k * (TW + 6) / 7), dt - 2, 0.5, 7);
    for (let k = 0; k < 8; k++) { cc.fillStyle = mix(WOOD_LT, "#c8a878", 0.35); const kx = fx - TW / 2 - 3 + k * (TW + 6) / 8; cc.beginPath(); cc.moveTo(kx, dt - 2); cc.lineTo(kx + (TW + 6) / 16, dt - 5); cc.lineTo(kx + (TW + 6) / 8, dt - 2); cc.fill(); }
    cc.fillStyle = darken(WOOD, 0.5); cc.fillRect(fx + TW / 2 + 3, dt - 4, 4, 8);
    cc.fillStyle = WOOD_DK; for (const bx of [-TW / 2 - 2, TW / 2]) { cc.beginPath(); cc.moveTo(fx + bx, dt + 5); cc.lineTo(fx + bx + 2, dt + 5); cc.lineTo(fx + bx + (bx < 0 ? 3 : -1), dt + 10); cc.closePath(); cc.fill(); }
  });
  part(c, (cc) => cloth(cc, fx - 5, gy - 30, 10, 16, 0));
  // the pennant's pole and the brazier's iron basket on the deck
  part(c, (cc) => {
    cylinder(cc, fx - 8.6, gy - 64, 1.4, 24, WOOD_DK, { r: 0.4 });
    ball(cc, fx - 7.9, gy - 64, 1.1, 1.1, BRASS, { hi: 0.5, lo: 0.3 });
    const bx = fx + 6, by = gy - 42;
    cc.fillStyle = IRON;
    for (const dx of [-3, -1, 1, 3]) cc.fillRect(ap(bx + dx), by - 3, 0.8, 4);
    cc.fillRect(bx - 3.5, by - 1, 7.5, 1);
    ellipse(cc, bx + 0.4, by - 3, 3.8, 1.2); cc.fillStyle = "#3a2420"; cc.fill();
  });
  // the gate leaf, swung open against the north verge
  part(c, (cc) => {
    const ly = gy + 7, lx = x - 26;
    cc.fillStyle = lin(cc, 0, ly - 16, 0, ly, [[0, WOOD_LT], [0.5, WOOD], [1, WOOD_DK]]);
    cc.fillRect(lx, ly - 16, 20, 16);
    cc.fillStyle = WOOD_DK; for (let k = 1; k < 5; k++) cc.fillRect(lx + k * 4, ly - 16, 0.5, 16);
    cc.fillStyle = IRON; cc.fillRect(lx, ly - 13, 20, 1.2); cc.fillRect(lx, ly - 4.5, 20, 1.2);
    cc.beginPath(); cc.moveTo(lx + 1, ly - 12); cc.lineTo(lx + 18, ly - 5); cc.lineTo(lx + 18, ly - 3.5); cc.lineTo(lx + 1, ly - 10.5); cc.fill();
    for (let k = 0; k < 5; k++) { cc.fillStyle = mix(WOOD_LT, "#c8a878", 0.35); cc.beginPath(); cc.moveTo(lx + k * 4, ly - 16); cc.lineTo(lx + k * 4 + 2, ly - 18.5); cc.lineTo(lx + k * 4 + 4, ly - 16); cc.fill(); }
    // the gate post it hangs from
    cylinder(cc, lx - 3, ly - 22, 3.5, 22, WOOD_DK, { r: 0.8, hi: 0.3 });
  });
};
const ironGate = (ctx, x, y, s, o) => {
  const sp = body("gate", 34, 64, 20, (c, bx, by) => gateBody(c, bx, by));
  stampBody(ctx, sp, x, y);
  pennant(ctx, x - 7.4, y + 8 - 63, 11, 4, o.time, 1.3);
  fire(ctx, x + 6.4, y + 8 - 45, 0.8, o.time, 2.1);
};
const drawIronCamp = (ctx, time) => {
  if (!PTS.length) return;
  const C = bakeCamp();
  ctx.drawImage(C.ground, C.x0, C.y0, C.w, C.h);
  ctx.drawImage(C.build, C.x0, C.y0, C.w, C.h);
  const ox = C.x0, oy = C.y0;
  // smoke from the camp beyond the palisade
  for (let i = 0; i < 4; i++) {
    const t = (time * 0.22 + i / 4) % 1;
    const sx = ox + 10 + Math.sin(time * 0.7 + i * 1.9) * 3 + t * 16, sy2 = oy + C.ty - 30 - t * 40;
    soft(ctx, sx, sy2, 4 + t * 7, 3 + t * 5, [[0, `rgba(150,150,158,${0.26 * (1 - t)})`], [1, "rgba(150,150,158,0)"]]);
  }
};

// ---- the ground: heather, bracken, bare stone ----------------------------------
// Small pieces baked once and stamped into the ground layer 1:1 with its
// pixels — never scaled (each size is its own bake), so every pixel stays
// crisp — each underlined in its own darkest tone like the trees' clumps.

// A sprite painted pixel by pixel, in art pixels: crisp by construction.
// paint(set): set(x, y, [r, g, b], a = 255).
const pixSprite = (wpx, hpx, paint) => {
  const cv = document.createElement("canvas");
  cv.width = wpx; cv.height = hpx;
  const c = cv.getContext("2d");
  const img = c.createImageData(wpx, hpx), d = img.data;
  const set = (x, y, col, a = 255) => {
    if (x < 0 || y < 0 || x >= wpx || y >= hpx) return;
    const o = (y * wpx + x) * 4;
    d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = a;
  };
  paint(set);
  c.putImageData(img, 0, 0);
  return cv;
};
const SHADE = hexRGB("#2a1c2c");
// where castle.js lays the gate's setts over an Iron road (its PAVE_X + 7.5)
const GATE_SETTS = 707.5;

// Heather (ling): a low cushion of wiry sprays seen from above, never a
// smooth ball. The cushion is built of small rounded sprays (a jittered grid
// of them, their rims scalloping its outline), the whole lit on its upper
// left and sinking to plum on its lower right, each spray catching its own
// light on its upper left with a dark crevice on its lower right. The bloom
// gathers in a few small pink clusters on the sunny side; dark stems show
// under the foot on the shaded side. Bronze ling (1 in 6) has little bloom;
// dead heather is silver-brown with bare dark twigs.
// Foliage tones: stem, deep, body, mid, lit; bloom: flower, flower lit.
const HEATHER = {
  heath: ["#3a2834", "#543c50", "#6c5066", "#8a6a82", "#aa8ca2"],
  ling: ["#36262f", "#4c3646", "#62485a", "#7a5e70", "#947a8a"],     // duskier, hardly in flower
  dryheath: ["#342c28", "#4e453e", "#6a6056", "#867c6c", "#a49a88"],
};
const BLOOM = ["#b8709e", "#e0a2c8"];
const heatherPix = (kind, v, sz) => {
  const dry = kind === "dryheath", ling = !dry && v % 6 === 5;
  const pal = (dry ? HEATHER.dryheath : ling ? HEATHER.ling : HEATHER.heath).map((c) => hexRGB(mix(c, REALM.GRASS_DK, 0.08)));
  const bl = BLOOM.map((c) => hexRGB(mix(c, REALM.GRASS_DK, 0.08)));
  const G = (i) => hash(v * 7 + sz * 131 + (dry ? 977 : 0), i);
  const P = PX;
  const rx = (3.2 + sz * 1.5 + G(1) * 1.1) * P, ry = rx * (0.56 + G(2) * 0.1);
  const wpx = Math.ceil(rx * 2.6) + 8, hpx = Math.ceil(ry * 2.4) + 10;
  const cx = Math.floor(wpx / 2), cy = Math.ceil(ry * 1.2) + 4;
  const nl = Math.min(3, 1 + Math.floor(G(3) * (sz + 1.8)));
  const lobes = [{ x: cx, y: cy, rx: rx * (nl > 1 ? 0.78 : 1), ry: ry * (nl > 1 ? 0.86 : 1) }];
  for (let i = 1; i < nl; i++) {
    const side = i % 2 ? -1 : 1;
    lobes.push({
      x: cx + side * rx * (0.44 + G(i + 4) * 0.2), y: cy + (G(i + 7) - 0.3) * ry * 0.5,
      rx: rx * (0.5 + G(i + 10) * 0.18), ry: ry * (0.58 + G(i + 13) * 0.2),
    });
  }
  // the envelope: how deep inside (f > 0) and which way its surface faces
  let EF = 0, ENX = 0, ENY = 0;
  const env = (x, y) => {
    EF = -9;
    for (const l of lobes) {
      const dx = (x - l.x) / l.rx, dy = (y - l.y) / l.ry, g = 1 - dx * dx - dy * dy;
      if (g > EF) { EF = g; ENX = dx; ENY = dy; }
    }
  };
  // the sprays: a jittered grid of small rounded clusters over the envelope
  const st = 3.3 + sz * 0.45, sprays = [];
  for (let row = 0, y = cy - ry * 1.05; y < cy + ry * 1.1; y += st * 0.8, row++) {
    for (let x = cx - rx * 1.25 + (row % 2) * st * 0.5; x < cx + rx * 1.25; x += st) {
      const q = sprays.length * 3 + row * 41;
      const sx = x + (G(20 + q) - 0.5) * st * 0.6, sy = y + (G(21 + q) - 0.5) * st * 0.4;
      env(sx, sy);
      if (EF < -0.08) continue;
      sprays.push({ x: sx, y: sy, r: st * (0.66 + G(22 + q) * 0.22), k: (G(23 + q) - 0.5) * 0.12, lg: (-0.55 * ENX - 0.8 * ENY) * 0.45 + 0.5 });
    }
  }
  const N = wpx * hpx, inside = new Uint8Array(N), tone = new Int8Array(N).fill(-1);
  const near = new Int16Array(N), lgA = new Float32Array(N);
  for (let y = 0; y < hpx; y++) {
    for (let x = 0; x < wpx; x++) {
      const X = x + 0.5, Y = y + 0.5;
      env(X, Y);
      let d1 = 9, d2 = 9, n1 = -1;
      for (let q = 0; q < sprays.length; q++) {
        const sp = sprays[q], dx = (X - sp.x) / sp.r, dy = (Y - sp.y) / (sp.r * 0.86), d = Math.sqrt(dx * dx + dy * dy);
        if (d < d1) { d2 = d1; d1 = d; n1 = q; } else if (d < d2) d2 = d;
      }
      const i = y * wpx + x;
      if (!((d1 < 1 && EF > -0.5) || EF > 0.45)) continue;
      inside[i] = 1; near[i] = n1;
      const sp = sprays[n1], lx = (X - sp.x) / sp.r, ly = (Y - sp.y) / sp.r;
      const lg = (-0.55 * ENX - 0.8 * ENY) * 0.45 + 0.5, ll = -(lx * 0.6 + ly * 0.8);
      lgA[i] = lg;
      const L = lg * 0.9 + ll * 0.3 + sp.k - 0.1;
      let t = L > 0.74 ? 4 : L > 0.5 ? 3 : L > 0.26 ? 2 : 1;
      if (d2 - d1 < 0.3 && ll < 0.3) t = Math.max(1, t - 1);         // the crevice between sprays
      else if (ll > 0.55 && lg > 0.4) t = Math.min(4, t + 1);          // each spray's own lit crown
      tone[i] = t;
    }
  }
  const IN = (x, y) => x >= 0 && y >= 0 && x < wpx && y < hpx && inside[y * wpx + x] === 1;
  const cv = pixSprite(wpx, hpx, (set) => {
    for (let y = 0; y < hpx; y++) {
      for (let x = 0; x < wpx; x++) {
        const i = y * wpx + x, h = hash(x * 11 + y * 5, v + 7);
        if (!inside[i]) {
          if (IN(x, y - 1) && x > cx - rx * 0.2 && h < 0.3) set(x, y, pal[0]);       // stems at the foot, shaded side
          else if (IN(x - 2, y - 2) || IN(x - 1, y - 2)) set(x, y, SHADE, 62);        // its shadow, down-right
          continue;
        }
        let t = tone[i];
        if (!IN(x, y + 1)) t = lgA[i] > 0.62 ? 1 : 0;                 // its underside
        else if (!IN(x, y + 2)) t = Math.min(t, lgA[i] > 0.5 ? 2 : 1);
        else if (!IN(x, y - 1) && lgA[i] > 0.45) t = Math.min(4, t + 1); // the lit rim along its top
        set(x, y, pal[t]);
      }
    }
    // a few sprigs standing up off its top edge, lit on the sunny side
    for (let x = 0; x < wpx; x++) {
      let y = 0;
      while (y < hpx && !inside[y * wpx + x]) y++;
      if (y >= hpx || y < 2) continue;
      const h = hash(x * 13, v + 19), lg = lgA[y * wpx + x];
      if (h < (dry ? 0.22 : 0.14)) {
        set(x, y - 1, dry ? pal[h < 0.1 ? 0 : 1] : pal[lg > 0.5 ? 4 : 3]);
        if (h < 0.05 || (dry && h < 0.12)) set(x + (dry && h < 0.08 ? 1 : 0), y - 2, dry ? pal[0] : pal[lg > 0.5 ? 4 : 3]);
      }
    }
    if (dry) {
      // bare dead twigs across it
      for (let q = 0; q < 3 + sz * 2; q++) {
        const sp = sprays[Math.floor(G(80 + q) * sprays.length)];
        if (!sp) continue;
        let x = Math.round(sp.x), y = Math.round(sp.y);
        for (let k = 0; k < 3; k++) { if (IN(x, y)) set(x, y, pal[k ? 1 : 0]); y--; if (G(90 + q) > 0.5) x += 1; }
      }
      return;
    }
    // the bloom, gathered in small clusters on the sunny side
    const order = sprays.map((sp, q) => q).sort((a, b) => sprays[b].lg - sprays[a].lg);
    const nb = ling ? 1 + (G(70) > 0.5 ? 1 : 0) : 3 + Math.floor(G(71) * 2.99) + (sz > 1 ? 1 : 0);
    for (let n = 0, q = 0; n < nb && q < order.length; q++) {
      const sp = sprays[order[Math.min(order.length - 1, q + Math.floor(G(72 + q) * 2))]];
      if (G(73 + q) < 0.3) continue;
      n++;
      let x = Math.round(sp.x - sp.r * 0.3), y = Math.round(sp.y - sp.r * 0.35);
      const m = 4 + Math.floor(G(74 + q) * 3.99);
      for (let k = 0; k < m; k++) {
        if (k) { const h = G(100 + q * 9 + k); if (h < 0.4) x += h < 0.2 ? 1 : -1; else if (h < 0.75) y += h < 0.6 ? 1 : -1; else x += 1; }
        if (!IN(x, y) || !IN(x, y + 1)) continue;
        set(x, y, bl[k === 0 || G(220 + q * 9 + k) < 0.35 ? 1 : 0]);
        if (IN(x, y + 2) && tone[(y + 1) * wpx + x] > 1) set(x, y + 1, pal[2]);
      }
    }
  });
  inkOutline(cv, darken(dry ? "#3a322a" : HEATH_DK, 0.2), 1, "under");
  return { cv, ax: cx, ay: Math.round(cy + ry) };
};

// Bracken in pixels: a low, wide fan of fronds leaning out from one root,
// rust-olive (never orange), each frond a dark stalk with its leaflets lit on
// the upper side, the tips curling down; its shade down-right.
const brackenPix = (v, sz) => {
  const green = v % 4 === 3;
  const base = green ? mix("#6e7a3e", REALM.GRASS_DK, 0.3) : mix(BRACK, REALM.GRASS_DK, 0.5);
  const T = [darken(base, 0.4), darken(base, 0.2), base, lighten(base, 0.1), mix(lighten(base, 0.18), "#fff3d2", 0.1)].map(hexRGB);
  const G = (i) => hash(v * 13 + sz * 71, i);
  const s = [0.9, 1.15, 1.4][sz];
  const n = 4 + (v % 3) + (sz > 1 ? 1 : 0);
  const wpx = Math.ceil(34 * s) + 8, hpx = Math.ceil(24 * s) + 8;
  const bx = Math.floor(wpx / 2), by = hpx - 4;
  const buf = new Int8Array(wpx * hpx).fill(-1);
  const put = (x, y, t) => { if (x >= 0 && y >= 0 && x < wpx && y < hpx && buf[y * wpx + x] !== 0) buf[y * wpx + x] = t; };
  // the upright back fronds first, the low side ones over them
  const fr = [];
  for (let i = 0; i < n; i++) {
    const f = n > 1 ? i / (n - 1) : 0.5;
    fr.push({ a: (f - 0.5) * 2 * (0.95 + G(i) * 0.15) + (G(i + 10) - 0.5) * 0.25, len: (10 + G(i + 20) * 5) * s * (1 - Math.abs(f - 0.5) * 0.25) });
  }
  fr.sort((p, q) => Math.abs(p.a) - Math.abs(q.a));
  for (const { a, len } of fr) {
    const dx = Math.sin(a), dy = -Math.cos(a) * 0.72;             // a little flattened: seen from above
    const L = Math.max(5, Math.round(len)), dl = Math.hypot(dx, dy), px = -dy / dl, py = dx / dl;
    const up = py < -0.3 || (Math.abs(py) <= 0.3 && px < 0) ? 1 : -1;   // which side of the frond faces the sun
    const sun = a < 0.25;
    for (let k = 1; k <= L; k++) {
      const f = k / L, droop = f > 0.55 ? (f - 0.55) * (f - 0.55) * L * 1.1 : 0;
      const x = Math.round(bx + dx * k), y = Math.round(by + dy * k + droop);
      put(x, y, k < 3 ? 0 : 1);                                   // the stalk
      if (k < 3) continue;
      if (k === L) { put(x, y, sun ? 4 : 3); continue; }
      // leaflets off each side in turn, longest mid-frond
      const w = f > 0.3 && f < 0.75 ? 2 : 1, side = k % 2 ? up : -up;
      for (let q = 1; q <= w; q++) put(Math.round(x + px * q * side), Math.round(y + py * q * side), side === up ? (q === w && sun ? 4 : 3) : 2);
    }
  }
  const cv = pixSprite(wpx, hpx, (set) => {
    for (let y = 0; y < hpx; y++) for (let x = 0; x < wpx; x++) {
      const t = buf[y * wpx + x];
      if (t >= 0) set(x, y, T[t]);
      else if (x > 0 && y > 1 && buf[(y - 2) * wpx + x - 1] >= 0) set(x, y, SHADE, 50);
    }
  });
  return { cv, ax: bx, ay: by };
};

// A tussock in pixels, like the meadow's own tufts (world.js): blades fanned
// from one root, dark at the foot and lit (or straw) at the tips, the
// sun-side blades lightest; a step of shade at its foot. cols: dark .. tip.
// heads: cotton-grass heads on the tallest blades.
const tussPix = (v, sz, cols, heads = false) => {
  const s = [0.55, 0.75, 0.95][sz];
  const n = 3 + (v % 3) + (sz > 1 ? 1 : 0);
  const spread = 1.4 * s * PX, wind = 0.28;
  const maxLen = Math.max(3, Math.round(11 * s * PX * 0.62));
  const wpx = Math.ceil(n * spread * 0.55 + maxLen * 1.3) + 10, hpx = maxLen + 7;
  const bx = Math.floor(wpx / 2) - 2, by = hpx - 4;
  const C = cols.map(hexRGB), head = [hexRGB("#f4f0e2"), hexRGB("#cfcabc")];
  const cv = pixSprite(wpx, hpx, (set) => {
    const sw = Math.max(2, Math.round(n * spread * 0.5 + 2));
    for (let i = -1; i <= sw; i++) { set(bx + i, by + 1, SHADE, 64); if (i > 0 && i < sw - 1) set(bx + i + 1, by + 2, SHADE, 44); }
    for (let i = 0; i < n; i++) {
      const h1 = hash(v, i + 2), h2 = hash(v, i + 40), side = n > 1 ? i / (n - 1) : 0.5;
      const lean = (h1 - 0.5) * 1.3 + wind + (side - 0.5) * 0.8;
      const len = Math.max(3, Math.round((5 + h2 * 6) * s * PX * 0.62));
      const ox = Math.round((i - (n - 1) / 2) * spread * 0.55);
      const c = side < 0.45 ? C : [C[0], C[1], C[1], C[2]];
      let tx = 0, ty = 0;
      for (let k = 0; k < len; k++) {
        const f = k / Math.max(1, len - 1);
        tx = Math.round(bx + ox + lean * f * f * len * 0.7); ty = by - k;
        set(tx, ty, c[Math.min(3, Math.floor(f * 4 * 0.999))]);
      }
      if (heads && i % 2 === 0) { set(tx, ty - 1, head[0]); set(tx + 1, ty - 1, head[0]); set(tx, ty, head[1]); set(tx + 1, ty, head[0]); set(tx, ty - 2, head[0]); }
    }
  });
  return { cv, ax: bx, ay: by };
};

const LOW = new Map();
const lowSprite = (kind, v, sz) => {
  const key = `${kind}|${v}|${sz}|${REALM.GRASS_DK}|${PX}`;
  if (LOW.has(key)) return LOW.get(key);
  let sp;
  const R = REALM;
  if (kind === "heath" || kind === "dryheath") sp = heatherPix(kind, v, sz);
  else if (kind === "tuss") sp = tussPix(v, sz, [darken(R.TUFT, 0.15), mix(R.TUFT, R.GRASS_DK, 0.3), mix(R.GRASS_LT, "#c8bc88", 0.3), mix(R.GRASS_LT, "#dccf9c", 0.55)]);
  else if (kind === "grass") sp = tussPix(v, sz, [darken(R.TUFT, 0.15), R.TUFT, mix(R.GRASS, R.GRASS_LT, 0.3), R.GRASS_LT]);
  else if (kind === "cotton") sp = tussPix(v, sz, [darken(R.TUFT, 0.2), R.TUFT, mix(R.GRASS, R.GRASS_LT, 0.4), mix(R.GRASS_LT, "#c8bc88", 0.3)], true);
  else sp = brackenPix(v, sz);
  LOW.set(key, sp);
  return sp;
};
// stamp a low piece with its feet at (x, y), snapped to the art grid
const stampLow = (ctx, kind, v, x, y, sz = 1) => {
  const sp = lowSprite(kind, v, sz);
  ctx.drawImage(sp.cv, (Math.round(x * PX) - sp.ax) / PX, (Math.round(y * PX) - sp.ay) / PX, sp.cv.width / PX, sp.cv.height / PX);
};

// Heather on a crag's ledge, at a wall's foot or in a clump of its own: one
// of the ground's pixel cushions, in flower, sized to s, feet at (x, y) and
// snapped to the art grid — the same heather as the moor's drifts, never a
// smooth mound. (A drop-in for the old heatherMound's (c, x, y, s, seed, dry).)
const heatherTuft = (c, x, y, s, seed, dry = false) => {
  const v = Math.abs(seed | 0) % 12;
  stampLow(c, dry ? "dryheath" : "heath", v % 6 === 5 && seed !== 5 ? v - 1 : v, x, y, s > 1.02 ? 2 : s > 0.72 ? 1 : 0);
};

// A flat slab of bedrock breaking through the turf: an angular plate (split
// by a crack into two, tilted a little differently), lit along its upper-left
// edges, a thin south face where it stands proud, lichen in a few small
// colonies, and moor-grass lapping over its foot.
const slabPix = (r, seed) => {
  const P = PX, G = (i) => hash(seed, i);
  const rx = r * P, ry = r * 0.56 * P;
  const wpx = Math.ceil(rx * 2.3) + 8, hpx = Math.ceil(ry * 2.3) + 10;
  const cx = Math.floor(wpx / 2), cy = Math.ceil(ry * 1.15) + 3;
  const n = 6 + Math.floor(G(1) * 3), pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + (G(i + 2) - 0.5) * 0.7) / n) * Math.PI * 2, k = 0.74 + G(i + 12) * 0.34;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const inside = new Uint8Array(wpx * hpx);
  for (let y = 0; y < hpx; y++) {
    for (let x = 0; x < wpx; x++) {
      let c = false;
      const px = x + 0.5, py = y + 0.5;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
      }
      inside[y * wpx + x] = c ? 1 : 0;
    }
  }
  const IN = (x, y) => x >= 0 && y >= 0 && x < wpx && y < hpx && inside[y * wpx + x] === 1;
  const sb = mix(GRIT, REALM.GRASS_DK, 0.2);
  // rim, face, shade, stone, lit, sunlit edge
  const T = [darken(sb, 0.52), darken(sb, 0.3), darken(sb, 0.12), sb, lighten(sb, 0.1), lighten(sb, 0.24)].map(hexRGB);
  const LICHEN = ["#a8ac86", "#bea060", "#c8c4ac"].map((c) => hexRGB(mix(c, sb, 0.3)));
  const GR = [darken(REALM.TUFT, 0.1), REALM.TUFT, mix(REALM.GRASS, REALM.GRASS_LT, 0.4)].map(hexRGB);
  const thick = r > 6 ? 2 : 1;
  // the crack: a slanting line, right across (two plates) or only part way
  const ca = (0.15 + G(30) * 0.7) * Math.PI, cnx = -Math.sin(ca), cny = Math.cos(ca);
  const cc = (G(31) - 0.5) * rx * 0.4, through = G(35) < 0.55, cracked = r > 4;
  const tEnd = through ? 1e9 : (G(34) * 0.6) * rx;
  const lower = cnx * 0.6 + cny * 0.8 > 0 ? 1 : -1;   // which side of the crack lies down-right
  const cv = pixSprite(wpx, hpx, (set) => {
    const mark = new Uint8Array(wpx * hpx);
    for (let y = 0; y < hpx; y++) {
      for (let x = 0; x < wpx; x++) {
        if (IN(x, y)) {
          const dxn = (x + 0.5 - cx) / rx, dyn = (y + 0.5 - cy) / ry;
          const ta = (x + 0.5 - cx) * cny - (y + 0.5 - cy) * cnx;
          const dc = ((x + 0.5 - cx) * cnx + (y + 0.5 - cy) * cny - cc + Math.sin(ta * 0.55 + G(33) * 6) * 0.7) * lower;
          const onCrack = cracked && ta < tEnd;
          if (onCrack && Math.abs(dc) < 0.55) { set(x, y, T[1]); mark[y * wpx + x] = 2; continue; }
          const plate = cracked && through && dc > 0 ? 1 : 0;
          const L = -(dxn * 0.5 + dyn * 0.75) * 0.5 + (plate ? -0.14 : 0.05) + (hash(x * 5 + y * 17, seed) - 0.5) * 0.16;
          let tone = L > 0.2 ? 4 : L > -0.16 ? 3 : 2;
          const upO = !IN(x, y - 1), lfO = !IN(x - 1, y), dnO = !IN(x, y + 1), rtO = !IN(x + 1, y);
          if (upO || lfO) tone = upO && lfO ? 4 : 5;                  // the sunlit edge, its corners worn
          else if (dnO || rtO) tone = 2;
          else if (onCrack && dc > 0 && dc < 1.5) tone = 5;          // the crack's far wall catches the sun
          else if (onCrack && dc < 0 && dc > -1.5) tone = 2;
          set(x, y, T[tone]);
          mark[y * wpx + x] = 1;
        } else {
          // the south face below a bottom edge, then a dark rim and the shadow
          let face = 0;
          for (let k = 1; k <= thick; k++) if (IN(x, y - k)) { face = k; break; }
          if (face) { set(x, y, T[1]); mark[y * wpx + x] = 3; continue; }
          if (IN(x, y - thick - 1) || IN(x - 1, y) || IN(x - 1, y - thick)) { set(x, y, T[0]); mark[y * wpx + x] = 4; continue; }
          if (IN(x - 2, y - thick - 1) || IN(x - 1, y - thick - 2) || IN(x - 2, y - 1)) set(x, y, SHADE, 64);
        }
      }
    }
    // lichen, in a few small colonies on the open stone
    const cols = 1 + Math.floor(r / 3.5);
    for (let q = 0; q < cols; q++) {
      let x = Math.round(cx + (G(40 + q) - 0.5) * rx * 1.1), y = Math.round(cy + (G(50 + q) - 0.6) * ry * 0.9);
      const col = LICHEN[q % 3 === 2 && r > 7 ? 1 : q % 2 ? 2 : 0];
      for (let s = 0; s < 3 + r * 0.5; s++) {
        if (mark[y * wpx + x] === 1) set(x, y, col);
        const h = hash(seed + q, s);
        x += h < 0.3 ? 1 : h < 0.5 ? -1 : 0; y += h > 0.8 ? 1 : h > 0.65 ? -1 : 0;
        if (x < 0 || y < 0 || x >= wpx || y >= hpx) break;
      }
    }
    // moor-grass lapping over its foot and its western edge
    const blades = 2 + Math.floor(r / 3);
    for (let q = 0; q < blades; q++) {
      const x = Math.round(cx + (G(60 + q) - 0.5) * rx * 1.6);
      let y = hpx - 1;
      while (y > 0 && !(mark[y * wpx + x] >= 3)) y--;
      if (y <= 0) continue;
      const h = 2 + Math.floor(G(70 + q) * 3);
      for (let k = 0; k < h; k++) set(x + (k > 1 && G(80 + q) > 0.5 ? 1 : 0), y + 1 - k, GR[k === h - 1 ? 2 : k === 0 ? 0 : 1]);
    }
  });
  return { cv, ax: cx, ay: cy };
};
const slab = (ctx, x, y, r, seed) => {
  const sp = slabPix(r, seed);
  ctx.drawImage(sp.cv, (Math.round(x * PX) - sp.ax) / PX, (Math.round(y * PX) - sp.ay) / PX, sp.cv.width / PX, sp.cv.height / PX);
};

// value noise for the drifts
const vnoise = (seed, cell, x, y) => {
  const fx = x / cell, fy = y / cell, xi = Math.floor(fx), yi = Math.floor(fy);
  let u = fx - xi, v = fy - yi; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const h = (i, j) => hash(seed + i * 131, j * 71 + 3);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
};

const nearWater = (x, y, m) => PONDS.some((p) => Math.abs(x - p.x) < p.w / 2 + m && Math.abs(y - p.y) < p.h / 2 + m) || inRiver(x, y, m);

// The drifts themselves: where the heather (or the bracken) takes the hill,
// the turf under it turns — a flat mauve-grey (or rust) ground at the turf's
// own value, with a paler heart, dithered only in a narrow band where it
// meets the grass, so a drift reads as one patch of moor, not a stain. Written
// into the layer's pixels; a coarse mask keeps it off the road, the water and
// the wood.
// A handful of big patches per board — heather in 4-7 drifts, bracken in
// 2-3 smaller ones at their edges — with plain open turf between them.
// drift(x, y) = { h, b }, each 0 (outside) .. 1 (the heart of a patch).
const DRIFT = { key: "", fn: null };
const driftField = () => {
  const key = `${REALM.id}|${PTS.length}`;
  if (DRIFT.key === key) return DRIFT.fn;
  const seed = REALM.seed | 0;
  const SWd = W - 104;
  let q = 0;
  const r01 = () => hash(seed + 777, q++);
  const heaths = [], bracks = [];
  const want = 4 + Math.floor(r01() * 4);
  for (let t = 0; t < 400 && heaths.length < want; t++) {
    const x = 80 + r01() * (SWd - 130), y = 50 + r01() * (H - 100), rx = 55 + r01() * 40;
    if (forestDepthAt(x, y) > -30) continue;
    if (heaths.some((d) => Math.hypot(d.x - x, (d.y - y) * 1.3) < 170)) continue;
    heaths.push({ x, y, rx, ry: rx * (0.5 + r01() * 0.2) });
  }
  const nb = 2 + Math.floor(r01() * 2);
  for (let i = 0; i < nb && i < heaths.length; i++) {
    const d = heaths[i], a = r01() * Math.PI * 2, rx = 28 + r01() * 18;
    bracks.push({ x: d.x + Math.cos(a) * d.rx * 0.95, y: d.y + Math.sin(a) * d.ry * 0.95, rx, ry: rx * 0.62 });
  }
  const strength = (list, x, y, ns) => {
    let best = 0;
    for (const d of list) {
      const dx = (x - d.x) / d.rx, dy = (y - d.y) / d.ry;
      if (dx * dx + dy * dy > 2.2) continue;
      // a broad wander and a finer one, so the edge breaks into lobes and bays
      const dn = Math.sqrt(dx * dx + dy * dy) + (vnoise(seed + ns, 24, x, y) - 0.5) * 0.45 + (vnoise(seed + ns + 5, 8, x, y) - 0.5) * 0.22;
      best = Math.max(best, Math.min(1, (1 - dn) / 0.45));
    }
    return best;
  };
  DRIFT.fn = (x, y) => ({ h: strength(heaths, x, y, 17), b: strength(bracks, x, y, 19) });
  DRIFT.key = key;
  // the same field sampled once per world unit, only round the patches, for
  // the per-pixel ground under them (read back with bilinear steps)
  const gw = W + 2, gh = H + 2, gH = new Float32Array(gw * gh), gB = new Float32Array(gw * gh);
  const fill = (list, g, ns) => {
    for (const d of list) {
      const X0 = Math.max(0, Math.floor(d.x - d.rx * 1.6)), X1 = Math.min(gw - 1, Math.ceil(d.x + d.rx * 1.6));
      const Y0 = Math.max(0, Math.floor(d.y - d.ry * 1.6)), Y1 = Math.min(gh - 1, Math.ceil(d.y + d.ry * 1.6));
      for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const i = y * gw + x; if (g[i] < 1) g[i] = Math.max(g[i], strength([d], x, y, ns)); }
    }
  };
  fill(heaths, gH, 17); fill(bracks, gB, 19);
  DRIFT.grid = { gw, gh, h: gH, b: gB };
  return DRIFT.fn;
};

const driftGround = (ctx) => {
  driftField();
  const seed = REALM.seed | 0;
  const { gw, h: gH, b: gB } = DRIFT.grid;
  const lerp = (g, x, y) => {
    const xi = x | 0, yi = y | 0, u = x - xi, v = y - yi, i = yi * gw + xi;
    return (g[i] * (1 - u) + g[i + 1] * u) * (1 - v) + (g[i + gw] * (1 - u) + g[i + gw + 1] * u) * v;
  };
  const cv = ctx.canvas, PW = cv.width, PH = cv.height, k = PW / W;
  const C = 4, GW = Math.ceil(W / C) + 1, GH = Math.ceil(H / C) + 1;
  const ok = new Uint8Array(GW * GH);
  // The mask keeps the tint off the wood's floor and the sea's beach only: the
  // road, its verge and the water are all painted over it later, so the tint
  // runs on under them rather than stopping at a blocky box round each pond.
  const cst = REALM.coast, sea = cst ? cst.depth + cst.sand + 24 : 0;
  const onShore = (x, y) => !!cst && (cst.edge === "top" ? y < sea : cst.edge === "bottom" ? y > H - sea : cst.edge === "left" ? x < sea : x > W - sea);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) ok[j * GW + i] = forestDepthAt(i * C, j * C) < -6 && !onShore(i * C, j * C) ? 1 : 0;
  const img = ctx.getImageData(0, 0, PW, PH), dd = img.data;
  const heath = hexRGB(mix("#8a6882", REALM.GRASS, 0.08)), heathLt = hexRGB(mix("#98788e", REALM.GRASS_LT, 0.1));
  const brack = hexRGB(mix("#86644a", REALM.GRASS_DK, 0.45));
  const limit = Math.min(PW, Math.ceil((W - 104) * k));
  for (let py = 0; py < PH; py += 1) {
    const y = py / k, gj = Math.min(GH - 1, Math.round(y / C));
    for (let pxx = 0; pxx < limit; pxx += 1) {
      const x = pxx / k, gi = Math.min(GW - 1, Math.round(x / C));
      if (!ok[gj * GW + gi]) continue;
      const i0 = (y | 0) * gw + (x | 0);
      if (gH[i0] <= 0 && gH[i0 + 1] <= 0 && gH[i0 + gw] <= 0 && gH[i0 + gw + 1] <= 0 && gB[i0] <= 0 && gB[i0 + 1] <= 0 && gB[i0 + gw] <= 0 && gB[i0 + gw + 1] <= 0) continue;
      const hn = lerp(gH, x, y), bn = lerp(gB, x, y);
      if (hn <= 0 && bn <= 0) continue;
      // flat tones in steps, their edges broken by irregular blocks of one
      // world unit (never a regular checker): a half step, the drift, its heart
      const dz = hash((pxx >> 1) * 7 + (py >> 1) * 1031, seed + 5) - 0.5;
      let col, f;
      if (hn > 0) {
        const hq = hn + dz * 0.12;
        if (hq < 0.2) continue;
        col = hq > 0.8 ? heathLt : heath; f = hq < 0.32 ? 0.17 : 0.34;
      } else {
        const bq = bn + dz * 0.12;
        if (bq < 0.28) continue;
        col = brack; f = bq < 0.4 ? 0.13 : 0.26;
      }
      const o = (py * PW + pxx) * 4;
      dd[o] += (col[0] - dd[o]) * f; dd[o + 1] += (col[1] - dd[o + 1]) * f; dd[o + 2] += (col[2] - dd[o + 2]) * f;
    }
  }
  ctx.putImageData(img, 0, 0);
};

const ironTurf = (ctx, kit) => {
  const { clear, rng, SW } = kit;
  const seed = REALM.seed | 0;
  driftGround(ctx);
  const items = [];
  // bedrock slabs, flat in the turf, in loose clusters
  for (let i = 0; i < 40; i++) {
    const cx = 30 + rng() * (SW - 60), cy = 30 + rng() * (H - 60);
    const n = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const x = cx + (rng() - 0.5) * 26, y = cy + (rng() - 0.5) * 14, r = 3 + rng() * (k ? 5 : 9);
      if (clear(x, y, r + 4)) slab(ctx, x, y, r, seed + i * 7 + k);
    }
  }
  // heather in drifts, bracken in its own drifts, cotton grass by the water
  const drift = driftField();
  for (let i = 0; i < 5200; i++) {
    const x = rng() * SW, y = rng() * H, r = rng(), v = Math.floor(rng() * 12);
    if (!clear(x, y, 5)) continue;
    const { h: hn, b: bn } = drift(x, y);
    if (hn > 0.15 && r < Math.pow(hn, 1.4) * 0.5) items.push(hn > 0.8 && r < 0.015 ? [x, y, "dryheath", v, r < 0.007 ? 1 : 0] : [x, y, "heath", v, hn > 0.6 && r < 0.2 ? 2 : r < 0.25 ? 1 : 0]);
    else if (bn > 0.2 && r < bn * 0.24) items.push([x, y, "bracken", v, r < bn * 0.08 ? 2 : 1]);
    else if (r < 0.0012) items.push([x, y, "heath", v, 0]);
    else if (r > 0.95 && nearWater(x, y, 22)) items.push([x, y, "cotton", v % 6, r > 0.985 ? 2 : 1]);
  }
  // moor-grass tussocks, straw-tipped, gathering in the hollows
  for (let i = 0; i < 520; i++) {
    const x = rng() * SW, y = rng() * H;
    if (!clear(x, y, 4) || vnoise(seed + 31, 40, x, y) < 0.45) continue;
    const r = rng();
    items.push([x, y, "tuss", i % 16, r < 0.3 ? 0 : r < 0.8 ? 1 : 2]);
  }
  // the wood's hem: bracken, heather and fallen stone crowding the treeline
  if (FOREST) {
    const span = FOREST.edge === "left" ? H : W;
    for (let u = 3, i = 0; u < span; u += 5 + hash(i, 81) * 6, i++) {
      const out = 1 + hash(i, 82) * 12;
      const x = FOREST.edge === "left" ? forestDepthAt(0, u) + out : u;
      const y = FOREST.edge === "left" ? u : forestDepthAt(u, 0) + out;
      if (!clear(x, y, 3) && forestDepthAt(x, y) < -6) continue;
      if (nearestOnPath(x, y).d < PATH_HALF + 8 || nearWater(x, y, 4)) continue;
      const h = hash(i, 83), sz = hash(i, 85) < 0.3 ? 0 : hash(i, 85) < 0.8 ? 1 : 2;
      if (h < 0.25) items.push([x, y, "bracken", Math.floor(hash(i, 84) * 12), sz]);
      else if (h < 0.45) items.push([x, y, h < 0.43 ? "heath" : "dryheath", Math.floor(hash(i, 84) * 12), sz]);
      else items.push([x, y, "tuss", i % 16, sz]);
    }
    // needle litter on the wood's floor
    for (let i = 0; i < 700; i++) {
      const x = rng() * SW, y = rng() * H;
      const dp = forestDepthAt(x, y);
      if (dp < 0 || nearestOnPath(x, y).d < PATH_HALF + 2 || nearWater(x, y, 2)) continue;
      ctx.fillStyle = rgba(i % 3 ? "#8a5a36" : "#5a4a34", 0.75);
      ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 1 + (i % 2) * 0.5, 0.5);
    }
  }
  items.sort((a, b) => a[1] - b[1]);
  for (const [x, y, kind, v, sz] of items) stampLow(ctx, kind, v, x, y, sz);
};

// ---- the road: dressed flags, kerbs, wheel ruts ------------------------------
// Written straight into the ground layer's pixels. Every pixel near the road
// learns how far along it and how far across it lies (a sweep over the road's
// segments, keeping the nearest), then which stone it belongs to: courses of
// flags laid across the road — each course set a little askew, some flags
// long, some split small — and kerb stones at each edge. Each stone takes a
// tone and a bevel (a lit lip on its upper-left edges, a dark joint on its
// lower-right, its corners worn round); a few are cracked, sunk or gone to
// earth (a broken rim of stone left round the hole); moss and grass creep
// into the joints toward the verges. The wheels have worn the flags they run
// over on the straights (a flag a shade darker, a groove's shaded wall on its
// upper-left side); they spread out and leave no track round a bend.
// At a bend each arm's flags stay square to it and whole: the incoming arm's
// flags run on to the mitre (a flag straddling it is kept if its middle lies
// on the arm's side), the outgoing arm's are cut to fit round them — a
// stepped joint of whole flags, never a ruler-straight diagonal; slivers too
// small to be a stone are moss and grit. Where the road crosses its own
// earlier stretch, the earlier one's flags run on through the crossing and
// the later one's stop at its edge. The last course before the gate's setts
// is one long sill stone. The kerb shows a face where it faces down-right and
// the turf laps over it where it faces up-left; the verge beyond is road.js's
// (a shadow, a strip of gravel, worn turf), painted before this. Only the box
// the road can reach is read, held and written back.
const ironRoad = (ctx, kit) => {
  if (!SEGS.length) return;
  const rng = kit.rng, seed = REALM.seed | 0;
  const cv = ctx.canvas, PW = cv.width, PH = cv.height, k = PW / W;
  const HALF = PATH_HALF, KERB = HALF - 4.5, REACH = HALF + 2, KID = 1000000;
  const last = SEGS.length - 1;
  // each segment's reach (the first runs back out of the camp, the last on under the gate)
  const SB = SEGS.map((s, si) => {
    const ext = si === 0 ? 70 : 0, extE = si === last ? 40 : 0;
    const ux = (s.x2 - s.x1) / s.len, uy = (s.y2 - s.y1) / s.len;
    const ax = s.x1 - ux * ext, ay = s.y1 - uy * ext, bx = s.x2 + ux * extE, by = s.y2 + uy * extE;
    return {
      ux, uy, ext, extE,
      X0: Math.max(0, Math.floor((Math.min(ax, bx) - REACH) * k)), X1: Math.min(PW - 1, Math.ceil((Math.max(ax, bx) + REACH) * k)),
      Y0: Math.max(0, Math.floor((Math.min(ay, by) - REACH) * k)), Y1: Math.min(PH - 1, Math.ceil((Math.max(ay, by) + REACH) * k)),
    };
  });
  let BX0 = PW, BY0 = PH, BX1 = -1, BY1 = -1;
  for (const b of SB) { BX0 = Math.min(BX0, b.X0); BY0 = Math.min(BY0, b.Y0); BX1 = Math.max(BX1, b.X1); BY1 = Math.max(BY1, b.Y1); }
  if (BX1 < BX0 || BY1 < BY0) return;
  const BW = BX1 - BX0 + 1, BH = BY1 - BY0 + 1, N = BW * BH;
  const best = new Float32Array(N).fill(1e9), along = new Float32Array(N), across = new Float32Array(N);
  const segOf = new Int16Array(N);
  SEGS.forEach((s, si) => {
    const { ux, uy, ext, extE, X0, X1, Y0, Y1 } = SB[si];
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1, L2 = s.len * s.len;
    const tlo = si === 0 ? -ext / s.len : 0, thi = si === last ? 1 + extE / s.len : 1;
    for (let py = Y0; py <= Y1; py++) {
      const y = (py + 0.5) / k, row = (py - BY0) * BW - BX0;
      for (let pxx = X0; pxx <= X1; pxx++) {
        const x = (pxx + 0.5) / k;
        let t = ((x - s.x1) * vx + (y - s.y1) * vy) / L2;
        t = t < tlo ? tlo : t > thi ? thi : t;
        const dx = x - s.x1 - vx * t, dy = y - s.y1 - vy * t, i = row + pxx;
        const d = Math.sqrt(dx * dx + dy * dy), b = best[i];
        if (d >= b) continue;
        best[i] = d;
        // a crossing: the stretch laid first keeps the flags it already has
        if (b < KERB && d < KERB && si - segOf[i] > 9) continue;
        along[i] = s.start + t * s.len;
        across[i] = ((x - s.x1) * -uy + (y - s.y1) * ux) >= 0 ? d : -d;
        segOf[i] = si;
      }
    }
  });
  const gx = (i) => BX0 + (i % BW), gy = (i) => BY0 + ((i / BW) | 0);
  // which way is "out" from the road at a pixel, as a dot with the down-right:
  // > 0 where the road's edge faces the camera and the sun's far side
  const outDot = (i) => {
    const s = SEGS[segOf[i]], d = best[i];
    if (d < 0.01) return 0;
    let t = (along[i] - s.start) / s.len;
    const lo = segOf[i] === 0 ? -1e9 : 0, hi = segOf[i] === last ? 1e9 : 1;
    t = t < lo ? lo : t > hi ? hi : t;
    const qx = s.x1 + (s.x2 - s.x1) * t, qy = s.y1 + (s.y2 - s.y1) * t;
    return (((gx(i) + 0.5) / k - qx) * 0.6 + ((gy(i) + 0.5) / k - qy) * 0.8) / d;
  };
  // the courses: flags laid across the road, each course a little askew
  const U0 = -80, U1 = TOTAL_LEN + 60;
  const cStart = [], cSkew = [], cBreaks = [];
  for (let u = U0; u < U1;) {
    cStart.push(u);
    cSkew.push((rng() - 0.5) * 0.08);
    const br = [];
    for (let v = -KERB + 3 + rng() * 7; v < KERB - 3; v += 5 + rng() * 9) br.push(v);
    br.push(1e9);
    cBreaks.push(br);
    u += 5 + rng() * 6.5;
  }
  cStart.push(1e9, 1e9); cSkew.push(0, 0); cBreaks.push([1e9], [1e9]);
  const NC = cStart.length;
  // the breaks flat, 16 to a course, and which flags are split, as tables
  const BRK = new Float32Array(NC * 16).fill(1e9), split = new Uint8Array(NC * 64);
  cBreaks.forEach((br, c) => br.forEach((v, j) => { if (j < 15) BRK[c * 16 + j] = v; }));
  for (let s = 0; s < NC * 64; s++) split[s] = hash(s + seed, 43) < 0.16 ? 1 : 0;
  const cIdx = new Int32Array(Math.ceil(U1 - U0) + 2);
  for (let c = 0, u = 0; u < cIdx.length; u++) { while (c + 1 < NC && cStart[c + 1] <= u + U0) c++; cIdx[u] = c; }
  // the kerb stones, longer, on each side
  const kStart = [];
  for (let u = U0; u < U1; u += 9 + rng() * 7) kStart.push(u);
  const kIdx = new Int32Array(Math.ceil(U1 - U0) + 2);
  for (let c = 0, u = 0; u < kIdx.length; u++) { while (c + 1 < kStart.length && kStart[c + 1] <= u + U0) c++; kIdx[u] = c; }
  const CL = cIdx.length - 1;
  const courseOf = (u, v) => {
    const f = (u - U0) | 0;
    let c = cIdx[f < 0 ? 0 : f > CL ? CL : f];
    while (c + 1 < NC && cStart[c + 1] + cSkew[c + 1] * v <= u) c++;
    while (c > 0 && cStart[c] + cSkew[c] * v > u) c--;
    return c;
  };
  const kerbOf = (u) => { const f = Math.max(0, Math.min(kIdx.length - 1, Math.floor(u - U0))); let c = kIdx[f]; while (c + 1 < kStart.length && kStart[c + 1] <= u) c++; return c; };
  // a course that runs on from the one before (never two in a row)
  const merged = new Uint8Array(NC);
  for (let c = 1; c < NC - 2; c++) merged[c] = hash(c + seed, 41) < 0.2 && !merged[c - 1] ? 1 : 0;
  // the sill: one long stone across the road where the gate's setts begin
  const sl = SEGS[last], slx = (sl.x2 - sl.x1) / sl.len;
  const uSill = slx > 0.85 && sl.x2 > W - 180 ? sl.start + (GATE_SETTS - 3.5 - sl.x1) / slx : 1e9;
  const SILL = NC * 64 + 1;
  // flagAt(u, v): the flag at (u, v) in one arm's frame; FU, FV its middle
  let FU = 0, FV = 0;
  const flagAt = (u, v, onLast = false) => {
    if (onLast && u >= uSill) { FU = uSill + 1.75; FV = 0; return SILL; }
    const c0 = courseOf(u, v), c = merged[c0] ? c0 - 1 : c0, b0 = c * 16;
    let j = 0;
    while (BRK[b0 + j] <= v) j++;
    let s = c * 64 + j;
    const lo = j > 0 ? BRK[b0 + j - 1] : -KERB, hi = Math.min(BRK[b0 + j], KERB);
    const u0 = cStart[c], u1 = merged[c + 1] ? cStart[c + 2] : cStart[c + 1];
    FU = (u0 + u1) / 2; FV = (lo + hi) / 2;
    // a few flags split in two: small ones among the big
    if (split[s]) {
      if (hi - lo > u1 - u0) { if (v > FV) { s += 16; FV = (FV + hi) / 2; } else FV = (lo + FV) / 2; }
      else if (u > FU) { s += 16; FU = (FU + u1) / 2; } else FU = (u0 + FU) / 2;
    }
    return s;
  };
  // The bends: the path is straight, then 7 short segments of curve, then
  // straight again (path.js buildSmooth). Each straight's flags carry its own
  // parity (+0 / +32), so the two arms' flags at a bend never share an id.
  const bends = [];
  if (SEGS.length === PTS.length - 1 && (SEGS.length - 1) % 8 === 0) {
    for (let m = 0; m * 8 + 8 < SEGS.length; m++) {
      const a = SEGS[m * 8], b = SEGS[m * 8 + 8];
      const d1x = (a.x2 - a.x1) / a.len, d1y = (a.y2 - a.y1) / a.len, d2x = (b.x2 - b.x1) / b.len, d2y = (b.y2 - b.y1) / b.len;
      const cr = d1x * d2y - d1y * d2x;
      if (Math.abs(cr) < 1e-3) { bends.push(null); continue; }
      const t = ((b.x1 - a.x2) * d2y - (b.y1 - a.y2) * d2x) / cr;
      bends.push({ a, b, d1x, d1y, d2x, d2y, cr, cx: a.x2 + d1x * t, cy: a.y2 + d1y * t, pa: (m & 1) * 32, pb: ((m + 1) & 1) * 32 });
    }
  }
  const bent = bends.length > 0;
  const id = new Int32Array(N).fill(-1);
  for (let py = BY0; py <= BY1; py++) {
    for (let pxx = BX0; pxx <= BX1; pxx++) {
      const i = (py - BY0) * BW + pxx - BX0;
      if (best[i] > HALF - 0.4) continue;
      const u = along[i], v = across[i];
      const si = segOf[i], B = si % 8 ? bends[si >> 3] : null;
      if (Math.abs(v) >= KERB) {
        // the kerb follows the curve, but round a bend's inside corner it is
        // two straight stones meeting in a mitre, not a fan of slivers
        if (B && v * B.cr > 0) {
          const x = (pxx + 0.5) / k - B.cx, y = (py + 0.5) / k - B.cy;
          id[i] = KID + (v > 0 ? 500000 : 0) + (x * (B.d1x + B.d2x) + y * (B.d1y + B.d2y) < 0
            ? kerbOf(B.a.start + (x + B.cx - B.a.x1) * B.d1x + (y + B.cy - B.a.y1) * B.d1y)
            : 250000 + kerbOf(B.b.start + (x + B.cx - B.b.x1) * B.d2x + (y + B.cy - B.b.y1) * B.d2y));
        } else id[i] = KID + (v > 0 ? 500000 : 0) + kerbOf(u);
        continue;
      }
      if (B) {
        const x = (pxx + 0.5) / k, y = (py + 0.5) / k;
        let s = flagAt(B.a.start + (x - B.a.x1) * B.d1x + (y - B.a.y1) * B.d1y, -(x - B.a.x1) * B.d1y + (y - B.a.y1) * B.d1x);
        const X = B.a.x1 + B.d1x * (FU - B.a.start) - B.d1y * FV - B.cx, Y = B.a.y1 + B.d1y * (FU - B.a.start) + B.d1x * FV - B.cy;
        if (X * (B.d1x + B.d2x) + Y * (B.d1y + B.d2y) < 0) s += B.pa;
        else { s = flagAt(B.b.start + (x - B.b.x1) * B.d2x + (y - B.b.y1) * B.d2y, -(x - B.b.x1) * B.d2y + (y - B.b.y1) * B.d2x, B.b === sl); if (s !== SILL) s += B.pb; }
        id[i] = s;
      } else {
        const s = flagAt(u, v, si === last);
        id[i] = s === SILL ? s : s + (bent ? ((si >> 3) & 1) * 32 : 0);
      }
    }
  }
  // flag by flag: where it lies (its middle, how near the verge) and what has
  // become of it — 1 gone to earth, 2 sunk, 3 cracked, 4 a darker stone,
  // 6 a sliver at a mitre too small to be a stone (moss and grit)
  const FN = NC * 64 + 64;
  const sU = new Float32Array(FN), sV = new Float32Array(FN), sA = new Float32Array(FN), sN = new Uint32Array(FN);
  for (let i = 0; i < N; i++) {
    const s = id[i];
    if (s < 0 || s >= KID) continue;
    sU[s] += along[i]; sV[s] += across[i]; sA[s] += Math.abs(across[i]); sN[s]++;
  }
  // The wheels' tracks: on for a stretch of courses, off for the next, and
  // never within 8 of a bend (the wheels spread out to take it).
  const RUT = 11.5, RW = 2.4;
  const rutOn = new Uint8Array(NC);
  for (let c = 0; c < NC - 2; c++) {
    const um = (cStart[c] + cStart[c + 1]) / 2;
    if (um < 0 || um > TOTAL_LEN || vnoise(seed + 41, 70, um, 0) < 0.4) continue;
    let si = 0;
    while (si < last && SEGS[si].start + SEGS[si].len < um) si++;
    const sg = SEGS[si];
    if (bent && (si % 8 || (si > 0 && um < sg.start + 8) || (si < last && um > sg.start + sg.len - 8))) continue;
    rutOn[c] = 1;
  }
  const fKind = new Uint8Array(FN), fTone = new Uint8Array(FN);
  for (let s = 0; s < FN; s++) {
    if (!sN[s]) continue;
    sU[s] /= sN[s]; sV[s] /= sN[s]; sA[s] /= sN[s];
    const h = hash(s + seed, 13);
    fKind[s] = s === SILL ? 0 : sN[s] < 12 ? 6 : h < 0.007 ? 1 : h < 0.03 ? 2 : h < 0.06 ? 3 : h < 0.074 ? 4 : 0;
    // the crown's flags are worn paler, the verges' darker
    let t = Math.floor((hash(s + seed, 7) * 0.8 + (sA[s] / KERB) * 0.34 - 0.08) * 5);
    fTone[s] = Math.max(0, Math.min(4, s === SILL ? 1 : t));
  }
  // 5: a kerb stone gone, turf in its place
  const kindOf = (s) => (s >= KID ? (hash(s + seed, 13) < 0.022 ? 5 : 0) : fKind[s]);

  const R = REALM;
  const main = R.PATH_MAIN, dk = R.PATH_DK;
  // flag tones, light to dark
  const tones = [mix(main, "#fff3d2", 0.07), mix(main, "#b09a74", 0.12), main, mix(main, "#8e9698", 0.14), mix(main, dk, 0.16)].map(hexRGB);
  const odd = hexRGB(mix(main, dk, 0.16));
  const kerbT = [mix(main, "#d0ccc0", 0.3), mix(main, "#b8b4aa", 0.22), mix(main, dk, 0.08)].map(hexRGB);
  const earth = [mix(main, "#6a5644", 0.34), mix(main, "#4a3c30", 0.5), mix(main, "#c8c0aa", 0.1)].map(hexRGB);
  const moss = [mix(R.TUFT, "#3a4430", 0.35), mix(R.TUFT, R.GRASS_DK, 0.4), mix(R.GRASS, R.GRASS_LT, 0.5)].map(hexRGB);
  // (trodden: the verge's turf, a little dulled toward the road's own dust)
  const turf = [mix(R.GRASS_DK, R.TUFT, 0.3), mix(R.GRASS_DK, R.GRASS, 0.5), mix(R.GRASS, R.GRASS_LT, 0.3)].map((c) => hexRGB(mix(c, dk, 0.18)));
  const tL = (turf[1][0] * 3 + turf[1][1] * 6 + turf[1][2]) / 10;
  const img = ctx.getImageData(BX0, BY0, BW, BH), dd = img.data;
  const at = (i) => (i >= 0 && i < N ? id[i] : -1);
  // The turf beyond the kerb, for a kerb stone gone or turf lapping over it:
  // the verge's own pixel 9 out along the normal when that reads as turf,
  // else the turf palette (so heather, stone or the wood's floor lying
  // there is never copied into the kerb).
  const turfAt = (i, hp, c) => {
    const d = best[i], m = turf[hp < 0.25 ? 2 : hp > 0.85 ? 0 : 1];
    c[0] = m[0]; c[1] = m[1]; c[2] = m[2];
    if (d < 0.01) return;
    const s = SEGS[segOf[i]];
    let t = (along[i] - s.start) / s.len;
    t = t < (segOf[i] === 0 ? -1e9 : 0) ? (segOf[i] === 0 ? -1e9 : 0) : t > (segOf[i] === last ? 1e9 : 1) ? (segOf[i] === last ? 1e9 : 1) : t;
    const qx = s.x1 + (s.x2 - s.x1) * t, qy = s.y1 + (s.y2 - s.y1) * t;
    const f = (HALF + 9) / d, X = Math.round((qx + ((gx(i) + 0.5) / k - qx) * f) * k - 0.5) - BX0, Y = Math.round((qy + ((gy(i) + 0.5) / k - qy) * f) * k - 0.5) - BY0;
    if (X < 0 || Y < 0 || X >= BW || Y >= BH) return;
    const o = (Y * BW + X) * 4, r = dd[o], g = dd[o + 1], b = dd[o + 2], l = (r * 3 + g * 6 + b) / 10;
    if (g > r + 4 && g > b + 4 && Math.abs(l - tL) < tL * 0.25) { c[0] = r; c[1] = g; c[2] = b; }
  };
  const drop = (f, c) => { c[0] -= c[0] * f; c[1] -= c[1] * f; c[2] -= c[2] * f * 0.9; };
  const lift = (f, c) => { c[0] += (255 - c[0]) * f; c[1] += (243 - c[1]) * f; c[2] += (210 - c[2]) * f * 0.9; };
  const set3 = (c, m) => { c[0] = m[0]; c[1] = m[1]; c[2] = m[2]; };
  const px = [0, 0, 0];
  // a table of noise for the per-pixel flecks (no hash asked per pixel)
  const RT = new Float32Array(65536);
  for (let q = 0; q < 65536; q++) RT[q] = hash(q, 3);
  for (let i = 0; i < N; i++) {
    const s = id[i];
    if (s < 0) continue;
    const o = i * 4, lx = i % BW, pxx = BX0 + lx, py = BY0 + ((i / BW) | 0);
    const d = best[i];
    const u = along[i], v = across[i], av = Math.abs(v);
    const kerb = s >= KID, kd = kindOf(s);
    const hp = RT[(pxx * 7 + py * 13) & 65535];
    const dn = at(i + BW), rt = lx < BW - 1 ? at(i + 1) : -1, up = at(i - BW), lf = lx > 0 ? at(i - 1) : -1;
    const eDn = dn !== s && dn >= 0, eRt = rt !== s && rt >= 0, eUp = up !== s && up >= 0, eLf = lf !== s && lf >= 0;
    const joint = eDn || eRt, lip = eUp || eLf;
    const corner = (eUp || eDn) && (eLf || eRt);
    // how near the verge: 0 in the road's middle, 1 at the kerb
    const edge = kerb ? 1 : Math.max(0, Math.min(1, (av - (KERB - 12)) / 12));
    const mossy = hash(Math.floor(u / 2.2) * 31 + (v > 0 ? 7 : 0), Math.floor(av / 2.2) + seed) < edge * 0.75;
    if (kd === 1 && !(joint || lip) || kd === 6) {
      // ---- a flag gone (a broken rim of it left) or a sliver: bare earth,
      // in the shade of the stones' upper-left edges, a pebble or two; moss
      if (kd === 6) set3(px, hp < 0.45 ? moss[hp < 0.2 ? 0 : 1] : earth[hp > 0.9 ? 2 : 1]);
      else {
        const sh = at(i - 2 * BW) !== s || (lx > 1 && at(i - 2) !== s);
        set3(px, earth[sh ? 1 : hp > 0.975 ? 2 : hp < 0.08 ? 1 : 0]);
        if (!sh && hp > 0.6 && hp < 0.7 && mossy) set3(px, moss[1]);
      }
    } else if (kd === 5) {
      // ---- a kerb stone gone: the turf has it, sunk in the shade of the
      // stones either side, a broken stub of the old stone at each end
      const kc = kerbOf(u), du = Math.min(u - kStart[kc], kStart[kc + 1] - u);
      if (du < 1.4 && hp < 0.55) { set3(px, kerbT[2]); drop(du < 0.6 ? 0.2 : 0.08, px); }
      else {
        turfAt(i, hp, px);
        drop(du < 2.2 ? 0.2 : 0.1, px);
        if (hp < 0.1) lift(0.1, px);
      }
    } else {
      let c;
      if (kerb) c = kerbT[Math.floor(hash(s + seed, 7) * 3)];
      else if (kd === 4) c = odd;
      else c = tones[fTone[s]];
      set3(px, c);
      if (kd === 1) {
        // what is left of a flag gone: a ragged rim of it, broken off
        if (hash(i, 17) < 0.35) set3(px, earth[1]); else drop(0.08, px);
      }
      // the wheels' groove: only its shaded wall, one pixel, on its upper-left side
      const rutC = !kerb && s !== SILL && rutOn[s >> 6] && (!bent || segOf[i] % 8 === 0);
      if (rutC) {
        const re = av - RUT;
        if (Math.abs(Math.abs(re) - RW) < 0.26 && outDot(i) * (re > 0 ? 1 : -1) < -0.15) drop(0.1, px);
      }
      const polished = rutC && Math.abs(av - RUT) < RW;
      // pocks and flecks in the stone, fewer where the wheels have polished it
      if (hp < (polished ? 0.012 : 0.045)) drop(0.06, px); else if (hp > 0.985) lift(0.04, px);
      if (kd === 2) {
        // sunk: its own neighbours shade its upper-left edges; its lower-right wall shows
        drop(0.07, px);
        if (lip) drop(0.2, px); else if (joint) lift(0.08, px);
      } else if (corner || joint) {
        // the joint: a dark line on the stone's lower-right, its corners worn round
        if (mossy && !polished) set3(px, moss[corner || hash(i, 5) < 0.6 ? 0 : 1]);
        else drop(kerb ? 0.28 : polished ? 0.14 : corner ? 0.26 : 0.22, px);
      } else if (lip) {
        if (mossy && !polished && hash(i, 9) < edge * 0.5) set3(px, moss[2]);
        else lift(kerb ? 0.15 : 0.1, px);
      }
      // a crack across the flag: a dark line, its far wall lit
      if (kd === 3) {
        const a = hash(s + seed, 23) * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
        const du = u - sU[s], dv = v - sV[s];
        const ta = du * ca + dv * sa;
        // straight runs with a kink or two, from one edge to part way across
        const dc = -du * sa + dv * ca + (Math.floor(ta / 2.5 + hash(s, 29) * 3) % 2 ? 0.3 : -0.3) * (hash(s, 37) < 0.5 ? 1 : 0);
        const reach = ta > -8 && ta < 1.5 + hash(s, 31) * 5;
        if (Math.abs(dc) < 0.28 && reach) drop(0.26, px);
        else if (dc > 0.28 && dc < 0.75 && reach) lift(0.06, px);
      }
      // the kerb's outer edge: where it faces down-right its face shows and
      // the turf lies in its shadow; where it faces up-left the turf laps it
      if (kerb && d > HALF - 1.6) {
        const sd = outDot(i);
        if (sd > 0.2) { if (d > HALF - 0.9) drop(0.45, px); else drop(0.24, px); }
        else if (sd < -0.2) {
          const lap = vnoise(seed + (v > 0 ? 91 : 93), 3, u, 0);
          if (d > HALF - 0.9 ? lap > 0.52 : lap > 0.72) { turfAt(i, hp, px); drop(0.06, px); if (hp < 0.2) lift(0.1, px); }
          else if (d > HALF - 0.9) drop(0.2, px);
        } else if (d > HALF - 0.9) drop(0.3, px);
      }
    }
    dd[o] = px[0] < 0 ? 0 : px[0] > 255 ? 255 : px[0]; dd[o + 1] = px[1] < 0 ? 0 : px[1] > 255 ? 255 : px[1]; dd[o + 2] = px[2] < 0 ? 0 : px[2] > 255 ? 255 : px[2]; dd[o + 3] = 255;
  }
  ctx.putImageData(img, BX0, BY0);
  // grass in the joints near the kerbs (each tuft rooted in a joint, never
  // on a flag's face), tufts in the gaps where a flag is gone, and the
  // verge's grass leaning in over the kerb
  const onRoad = (u, off) => {
    const sg = SEGS.find((q) => u >= q.start && u <= q.start + q.len) || SEGS[0];
    const t = (u - sg.start) / sg.len, ux = (sg.x2 - sg.x1) / sg.len, uy = (sg.y2 - sg.y1) / sg.len;
    return [sg.x1 + (sg.x2 - sg.x1) * t - uy * off, sg.y1 + (sg.y2 - sg.y1) * t + ux * off];
  };
  const jointNear = (x, y) => {
    const cx = Math.round(x * k) - BX0, cy = Math.round(y * k) - BY0;
    for (let r = 0; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const X = cx + dx, Y = cy + dy;
          if (X < 0 || Y < 0 || X >= BW - 1 || Y >= BH - 1) continue;
          const i = Y * BW + X, s = id[i];
          if (s < 0 || s >= KID) continue;
          const b = id[i + BW], rr = id[i + 1];
          if ((b !== s && b >= 0 && b < KID) || (rr !== s && rr >= 0 && rr < KID)) return [(X + BX0 + 0.5) / k, (Y + BY0 + 1) / k];
        }
      }
    }
    return null;
  };
  for (let i = 0; i < 90; i++) {
    const u = rng() * TOTAL_LEN, off = (rng() < 0.5 ? -1 : 1) * (KERB - 1 - rng() * 4);
    const [x, y] = onRoad(u, off);
    if (x > W - 104 || x < 2) continue;
    const j = jointNear(x, y);
    if (j) stampLow(ctx, "grass", i % 16, j[0], j[1], 0);
  }
  for (let s = 0; s < FN; s++) {
    if (!sN[s] || fKind[s] !== 1) continue;
    const [x, y] = onRoad(sU[s], sV[s]);
    if (x > W - 104) continue;
    stampLow(ctx, "grass", s % 16, x, y + 1, 0);
  }
  for (let i = 0; i < 110; i++) {
    const u = rng() * TOTAL_LEN, off = (rng() < 0.5 ? -1 : 1) * (HALF + 0.5 + rng() * 2);
    const [x, y] = onRoad(u, off);
    if (x > W - 104 || x < 2 || nearestOnPath(x, y).d < HALF) continue;
    stampLow(ctx, "grass", i % 16, x, y, rng() < 0.6 ? 0 : 1);
  }
};

// ---- the registry ----------------------------------------------------------------
export const IRON_ART = {
  // baked without the 2px ring: the heather clump's pixel cushions carry their own underline
  flat: ["irheather"],
  decor: {
    irpine: scotsPine, irspruce: spruce, ircrag: crag, irheather: heatherClump, irwall: drystone,
    irgibbet: gibbet, irmile: milestone, irbeacon: beacon, irwagon: wagon, irpikes: pikes,
    irtent: warTent, irbanner: standard, irtower: kingTower, irgate: ironGate, irruin: ruin,
  },
  live: ["irbeacon", "irbanner", "irtower", "irgate"],
  box: {
    irpine: [26, 58], irspruce: [27, 50], ircrag: [30, 40], irheather: [18, 14], irwall: [26, 22],
    irgibbet: [20, 44], irmile: [10, 16], irwagon: [36, 30], irpikes: [26, 40], irtent: [32, 40], irruin: [26, 40],
  },
  dress: { irpine: [3.5, false], irspruce: [3.5, false], ircrag: [10, true], irmile: [4, false], irgibbet: [4, true], irruin: [11, true] },
  spawn: { ironcamp: drawIronCamp },
  turf: { iron: ironTurf },
  road: { iron: ironRoad },
  // the country beyond the board's edges (render/apron.js)
  apron: {
    biome: "iron",
    big: { irpine: 4, irspruce: 4, ircrag: 2.2, irheather: 0.8, irwall: 0.35 },
    landscape: ["irpine", "irspruce", "ircrag", "irheather", "irwall"],
    tall: ["irpine", "irspruce"],
  },
};
