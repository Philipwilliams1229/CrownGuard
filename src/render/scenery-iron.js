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
const HEATH = "#7e5a74", HEATH_LT = "#a07a94", HEATH_DK = "#523a50", HEATH_FL = "#c89cba";
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

// heather lying along a ledge or at a foot: a few purple mounds, lit on top
const heatherMound = (c, x, y, s, seed, dry = false) => {
  const base = dry ? "#7a5a62" : HEATH;
  leafPart(c, (cc) => {
    for (let i = 0; i < 3; i++) {
      const hx = x + (i - 1) * 3.4 * s + (hash(seed, i) - 0.5) * 1.5 * s, hy = y - (i === 1 ? 1 : 0) * s;
      blobBall(cc, hx, hy, (2.6 + hash(seed, i + 3) * 1.2) * s, (1.8 + hash(seed, i + 6) * 0.6) * s, i === 1 ? lighten(base, 0.06) : base, seed + i, { hi: 0.45, lo: 0.45, wobble: 0.3, n: 9 });
    }
    for (let i = 0; i < 5; i++) { cc.fillStyle = i % 3 ? HEATH_FL : HEATH_LT; px1(cc, x + (hash(seed, i + 10) - 0.5) * 8 * s, y - 1.8 * s + hash(seed, i + 15) * 1.6 * s); }
  }, HEATH_DK, [x - 8 * s - 2, y - 5 * s - 2, x + 8 * s + 2, y + 3 * s + 2]);
};

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
const heatherClump = (ctx, x, y, s, o) => {
  const gy = y + 8;
  shadow(ctx, x + 3 * s, gy + 1, 11 * s, 2.6 * s, 0.22);
  if (o.v % 2) brackenFan(ctx, x + 7 * s, gy, 0.75 * s, o.seed + 3);
  heatherMound(ctx, x - 3 * s, gy, 1.1 * s, o.seed, o.v === 3);
  heatherMound(ctx, x + 4 * s, gy + 1.5, 0.9 * s, o.seed + 7);
  if (o.v === 2) brackenFan(ctx, x - 9 * s, gy + 1.5, 0.6 * s, o.seed + 5, true);
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
  const m = Math.round(len / (1.7 * s));
  for (let i = 0; i < m; i++) {
    const [sx, sy] = at((i + 0.5) / m, hgt * s);
    const hh = (i % 2 ? 2 : 3.4) * s + H(i + 300) * 0.8;
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
    // a ridge tent for the rank and file: A-frame, oxblood roof, grey ends
    const L = 13 * s, hh = 13 * s;
    part(ctx, (c) => {
      // the far gable (grey) peeking, then the long roof slope facing us
      c.beginPath(); c.moveTo(x - L, gy - hh); c.lineTo(x + L, gy - hh); c.lineTo(x + L + 4 * s, gy); c.lineTo(x - L + 4 * s, gy); c.closePath();
      c.fillStyle = lin(c, 0, gy - hh, 0, gy, [[0, lighten(OX, 0.2)], [0.5, OX], [1, OX_DK]]); c.fill();
      c.fillStyle = rgba("#2a1c2c", 0.3);
      for (let k = 1; k < 4; k++) c.fillRect(ap(x - L + k * L * 0.5 + 2 * s), gy - hh + 1, 0.5, hh - 1);
      c.fillStyle = OX_LT; c.fillRect(x - L, gy - hh, L * 2, 1);
    });
    part(ctx, (c) => {
      // the near gable end with its open door
      c.beginPath(); c.moveTo(x + L, gy - hh); c.lineTo(x + L + 4 * s, gy); c.lineTo(x + L - 4 * s, gy); c.closePath();
      c.fillStyle = darken(STEEL, 0.1); c.fill();
      c.beginPath(); c.moveTo(x + L, gy - hh + 4 * s); c.lineTo(x + L + 2 * s, gy); c.lineTo(x + L - 2 * s, gy); c.closePath();
      c.fillStyle = "#1e1618"; c.fill();
      cylinder(c, x + L - 0.6, gy - hh - 3 * s, 1.2, 3 * s, WOOD_DK, { r: 0.4 });
      cylinder(c, x - L - 0.6, gy - hh - 3 * s, 1.2, 3 * s, WOOD_DK, { r: 0.4 });
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
    soft(c, 34, ly + 2, 40, 34, [[0, "rgba(58,46,36,0.5)"], [0.6, "rgba(58,46,36,0.25)"], [1, "rgba(58,46,36,0)"]]);
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
// Small pieces baked once and stamped into the ground layer (1:1 with its
// pixels), each underlined in its own darkest tone like the trees' clumps.
const LOW = new Map();
const lowSprite = (kind, v) => {
  const key = kind + v;
  if (LOW.has(key)) return LOW.get(key);
  const dims = { heath: [22, 12], dryheath: [22, 12], bracken: [18, 12], cotton: [12, 10], slab: [0, 0] }[kind];
  const cv = bakeSprite(dims[0], dims[1], (c) => {
    const x = dims[0] / 2, y = dims[1] - 3;
    if (kind === "heath" || kind === "dryheath") {
      shadow(c, x + 2, y + 1, 9, 2.2, 0.2);
      const base = kind === "dryheath" ? "#735a58" : [HEATH, "#86607a", "#745670", "#7a6468"][v % 4];
      const n = 2 + (v % 3);
      for (let i = 0; i < n; i++) {
        const hx = x + (i - (n - 1) / 2) * 4.2 + (hash(v, i) - 0.5) * 2, hy = y - (i % 2) * 1.2;
        blobBall(c, hx, hy, 2.6 + hash(v, i + 3) * 1.4, 1.9 + hash(v, i + 6) * 0.5, i % 2 ? lighten(base, 0.05) : base, v * 7 + i, { hi: 0.5, lo: 0.45, wobble: 0.3, n: 9 });
      }
      for (let i = 0; i < 2 + n; i++) { c.fillStyle = i % 2 ? HEATH_FL : HEATH_LT; px1(c, x + (hash(v, i + 10) - 0.5) * n * 4, y - 2.5 + hash(v, i + 15) * 2); }
    } else if (kind === "bracken") {
      brackenFan(c, x, y + 1, 0.75 + (v % 3) * 0.1, v * 13, v % 4 === 3);
    } else if (kind === "cotton") {
      tuft(c, x, y + 1, 0.55, darken(REALM.TUFT, 0.1), REALM.GRASS_LT, v, { n: 4 });
      for (let i = 0; i < 3; i++) ball(c, x - 2 + i * 2 + (hash(v, i) - 0.5), y - 5 - hash(v, i + 3) * 2, 0.9, 0.8, "#f2eee2", { hi: 0.3, lo: 0.25 });
    }
  }, false);
  const ink = kind === "bracken" ? darken(BRACK_DK, 0.3) : kind === "cotton" ? darken(REALM.TUFT, 0.4) : darken(HEATH_DK, 0.25);
  inkOutline(cv, ink, 1, "under");
  const sp = { cv, w: dims[0], h: dims[1] };
  LOW.set(key, sp);
  return sp;
};
const stampLow = (ctx, kind, v, x, y, k = 1) => {
  const sp = lowSprite(kind, v);
  ctx.drawImage(sp.cv, Math.round((x - sp.w / 2 * k) * RES) / RES, Math.round((y - (sp.h - 3) * k) * RES) / RES, sp.w * k, sp.h * k);
};

// a flat slab of bedrock breaking through the turf: lit edge up-left, a dark
// lip down-right, a crack, lichen
const slab = (ctx, x, y, r, seed) => {
  const ry = r * 0.55;
  ctx.save();
  blobPath(ctx, x + 0.8, y + 0.8, r, ry, seed, 0.28, 7); ctx.fillStyle = rgba("#2a2a30", 0.45); ctx.fill();
  blobPath(ctx, x, y, r, ry, seed, 0.28, 7); ctx.fillStyle = mix(GRIT, REALM.GRASS_DK, 0.12); ctx.fill();
  ctx.clip();
  blobPath(ctx, x - 1, y - 0.8, r * 0.94, ry * 0.9, seed, 0.28, 7); ctx.fillStyle = lighten(GRIT, 0.12); ctx.fill();
  blobPath(ctx, x - 1.6, y - 1.3, r * 0.6, ry * 0.5, seed + 1, 0.3, 7); ctx.fillStyle = lighten(GRIT, 0.24); ctx.fill();
  ctx.fillStyle = darken(GRIT, 0.4);
  const a = hash(seed, 3) * Math.PI;
  for (let t = -0.6; t < 0.6; t += 0.08) ctx.fillRect(ap(x + Math.cos(a) * r * t + Math.sin(t * 9) * 0.4), ap(y + Math.sin(a) * ry * t), 0.5, 0.5);
  for (let i = 0; i < 3 + r / 3; i++) {
    ctx.fillStyle = i % 3 === 0 ? "#c8a458" : i % 3 === 1 ? "#a8b890" : "#d8d4c0";
    ctx.fillRect(ap(x + (hash(seed, i + 10) - 0.5) * r * 1.4), ap(y + (hash(seed, i + 20) - 0.5) * ry * 1.2), 1, 0.5);
  }
  ctx.restore();
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
// the turf under it turns — a dithered mauve-brown (or rust) ground, so a
// drift reads as one patch of moor and not a sprinkle of clumps. Written into
// the layer's pixels; a coarse mask keeps it off the road, the water and the wood.
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);
const driftGround = (ctx, clear) => {
  const seed = REALM.seed | 0;
  const cv = ctx.canvas, PW = cv.width, PH = cv.height, k = PW / W;
  const C = 4, GW = Math.ceil(W / C) + 1, GH = Math.ceil(H / C) + 1;
  const ok = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) ok[j * GW + i] = clear(i * C, j * C, 3) ? 1 : 0;
  const img = ctx.getImageData(0, 0, PW, PH), dd = img.data;
  const heath = hexRGB(mix("#6c4e64", REALM.GRASS_DK, 0.2)), heathLt = hexRGB(mix("#8a6682", REALM.GRASS, 0.15));
  const brack = hexRGB(mix("#8a6040", REALM.GRASS_DK, 0.35));
  const limit = Math.min(PW, Math.ceil((W - 104) * k));
  for (let py = 0; py < PH; py += 1) {
    const y = py / k, gj = Math.min(GH - 1, Math.round(y / C));
    for (let pxx = 0; pxx < limit; pxx += 1) {
      const x = pxx / k, gi = Math.min(GW - 1, Math.round(x / C));
      if (!ok[gj * GW + gi]) continue;
      const hn = vnoise(seed + 5, 70, x, y) + (vnoise(seed + 17, 14, x, y) - 0.5) * 0.12;
      const bn = vnoise(seed + 9, 90, x, y) + (vnoise(seed + 19, 12, x, y) - 0.5) * 0.12;
      const dz = B4[(py & 3) * 4 + (pxx & 3)];
      let col = null, a = 0;
      if (hn > 0.6) { a = Math.min(0.7, (hn - 0.6) * 5); col = (hn + dz * 0.05) > 0.7 ? heathLt : heath; }
      else if (bn > 0.64) { a = Math.min(0.45, (bn - 0.64) * 4); col = brack; }
      if (!col || a < dz * 0.9) continue;
      const o = (py * PW + pxx) * 4, f = 0.55;
      dd[o] += (col[0] - dd[o]) * f; dd[o + 1] += (col[1] - dd[o + 1]) * f; dd[o + 2] += (col[2] - dd[o + 2]) * f;
    }
  }
  ctx.putImageData(img, 0, 0);
};

const ironTurf = (ctx, kit) => {
  const { clear, rng, SW } = kit;
  const seed = REALM.seed | 0;
  driftGround(ctx, clear);
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
  for (let i = 0; i < 5200; i++) {
    const x = rng() * SW, y = rng() * H, r = rng(), v = Math.floor(rng() * 12);
    if (!clear(x, y, 5)) continue;
    const hn = vnoise(seed + 5, 70, x, y), bn = vnoise(seed + 9, 90, x, y);
    if (hn > 0.62 && r < (hn - 0.6) * 2.4) items.push([x, y, hn > 0.72 && r < 0.12 ? "dryheath" : "heath", v, 0.85 + r * 0.3]);
    else if (bn > 0.6 && r < (bn - 0.56) * 1.4) items.push([x, y, "bracken", v, 0.95 + r * 0.35]);
    else if (r < 0.006) items.push([x, y, r < 0.003 ? "heath" : "bracken", v, 0.75]);
    else if (r > 0.95 && nearWater(x, y, 22)) items.push([x, y, "cotton", v % 5, 1]);
  }
  // moor-grass tussocks, straw-tipped, gathering in the hollows
  const tusB = mix(REALM.TUFT, REALM.GRASS_DK, 0.3), tusT = mix(REALM.GRASS_LT, "#c8bc88", 0.45);
  for (let i = 0; i < 520; i++) {
    const x = rng() * SW, y = rng() * H;
    if (!clear(x, y, 4) || vnoise(seed + 31, 40, x, y) < 0.45) continue;
    items.push([x, y, "tuss", i, 0.6 + rng() * 0.5]);
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
      const h = hash(i, 83);
      items.push([x, y, h < 0.5 ? "bracken" : h < 0.85 ? "heath" : "dryheath", Math.floor(hash(i, 84) * 12), 0.8 + hash(i, 85) * 0.4]);
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
  for (const [x, y, kind, v, k] of items) {
    if (kind === "tuss") tuft(ctx, x, y, k, v % 3 ? tusB : REALM.TUFT, v % 2 ? tusT : REALM.GRASS_LT, 5000 + v, { n: 4 + (v % 3) });
    else stampLow(ctx, kind, v, x, y, k);
  }
};

// ---- the road: dressed flags, kerbs, wheel ruts ------------------------------
// Written straight into the ground layer's pixels. Every pixel near the road
// learns how far along it and how far across it lies (a sweep over the road's
// segments, keeping the nearest), then which stone it belongs to: courses of
// flags laid across the road, kerb stones at each edge. Each stone takes a
// tone, a lit lip on its upper-left edges and a dark joint on its lower-right.
const ironRoad = (ctx, kit) => {
  if (!SEGS.length) return;
  const rng = kit.rng;
  const cv = ctx.canvas, PW = cv.width, PH = cv.height, k = PW / W;
  const HALF = PATH_HALF, KERB = HALF - 4.5;
  const N = PW * PH;
  const best = new Float32Array(N).fill(1e9), along = new Float32Array(N), across = new Float32Array(N);
  const last = SEGS.length - 1;
  SEGS.forEach((s, si) => {
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1, L2 = s.len * s.len;
    const ext = si === 0 ? 70 : 0, extE = si === last ? 40 : 0;
    const ux = vx / s.len, uy = vy / s.len;
    const ax = s.x1 - ux * ext, ay = s.y1 - uy * ext, bx = s.x2 + ux * extE, by = s.y2 + uy * extE;
    const X0 = Math.max(0, Math.floor((Math.min(ax, bx) - HALF - 2) * k)), X1 = Math.min(PW - 1, Math.ceil((Math.max(ax, bx) + HALF + 2) * k));
    const Y0 = Math.max(0, Math.floor((Math.min(ay, by) - HALF - 2) * k)), Y1 = Math.min(PH - 1, Math.ceil((Math.max(ay, by) + HALF + 2) * k));
    const tlo = si === 0 ? -ext / s.len : 0, thi = si === last ? 1 + extE / s.len : 1;
    for (let py = Y0; py <= Y1; py++) {
      const y = (py + 0.5) / k;
      for (let pxx = X0; pxx <= X1; pxx++) {
        const x = (pxx + 0.5) / k;
        let t = ((x - s.x1) * vx + (y - s.y1) * vy) / L2;
        t = t < tlo ? tlo : t > thi ? thi : t;
        const qx = s.x1 + vx * t, qy = s.y1 + vy * t;
        const d = Math.hypot(x - qx, y - qy);
        const i = py * PW + pxx;
        if (d < best[i]) {
          best[i] = d;
          along[i] = s.start + t * s.len;
          across[i] = ((x - s.x1) * -uy + (y - s.y1) * ux) >= 0 ? d : -d;
        }
      }
    }
  });
  // the courses: flags laid across the road, their lengths wandering
  const U0 = -80, U1 = TOTAL_LEN + 60;
  const cStart = [], cBreaks = [];
  for (let u = U0; u < U1;) {
    const len = 6 + rng() * 4.5;
    cStart.push(u);
    const br = [];
    for (let v = -KERB + (rng() - 0.5) * 6; v < KERB; v += 7 + rng() * 6) br.push(v);
    br.push(KERB);
    cBreaks.push(br);
    u += len;
  }
  const cIdx = new Int32Array(Math.ceil(U1 - U0) + 2);
  for (let c = 0, u = 0; u < cIdx.length; u++) { while (c + 1 < cStart.length && cStart[c + 1] <= u + U0) c++; cIdx[u] = c; }
  // the kerb stones, longer, on each side
  const kStart = [];
  for (let u = U0; u < U1; u += 9 + rng() * 6) kStart.push(u);
  const kIdx = new Int32Array(Math.ceil(U1 - U0) + 2);
  for (let c = 0, u = 0; u < kIdx.length; u++) { while (c + 1 < kStart.length && kStart[c + 1] <= u + U0) c++; kIdx[u] = c; }
  const courseOf = (u) => { const f = Math.max(0, Math.min(cIdx.length - 1, Math.floor(u - U0))); let c = cIdx[f]; while (c + 1 < cStart.length && cStart[c + 1] <= u) c++; return c; };
  const kerbOf = (u) => { const f = Math.max(0, Math.min(kIdx.length - 1, Math.floor(u - U0))); let c = kIdx[f]; while (c + 1 < kStart.length && kStart[c + 1] <= u) c++; return c; };
  const id = new Int32Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    const d = best[i];
    if (d > HALF - 0.4) continue;
    const u = along[i], v = across[i];
    if (Math.abs(v) >= KERB) { id[i] = 1000000 + (v > 0 ? 500000 : 0) + kerbOf(u); continue; }
    const c = courseOf(u), br = cBreaks[c];
    let j = 0;
    while (j < br.length - 1 && br[j] <= v) j++;
    id[i] = c * 32 + j;
  }
  const R = REALM;
  const main = R.PATH_MAIN, dk = R.PATH_DK;
  const tones = [mix(main, "#fff3d2", 0.1), main, mix(main, dk, 0.3), mix(main, "#8e9698", 0.25), mix(main, "#b09a74", 0.25)].map(hexRGB);
  const kerbT = [mix(main, "#d0ccc0", 0.3), mix(main, "#b8b4aa", 0.2), mix(main, dk, 0.1)].map(hexRGB);
  const earth = hexRGB(mix(main, "#5e4c3c", 0.6)), moss = hexRGB("#62704a");
  const img = ctx.getImageData(0, 0, PW, PH), dd = img.data;
  const at = (i) => (i >= 0 && i < N ? id[i] : -1);
  for (let py = 0; py < PH; py++) {
    for (let pxx = 0; pxx < PW; pxx++) {
      const i = py * PW + pxx, s = id[i];
      if (s < 0) continue;
      const v = across[i], av = Math.abs(v);
      const kerb = s >= 1000000;
      const h1 = hash(s, 7), h2 = hash(s, 13);
      let col;
      if (kerb) col = kerbT[Math.floor(h1 * 3)];
      else if (h2 < 0.012 && av < KERB - 3) col = earth;          // a flag gone, earth showing
      else col = tones[Math.floor(h1 * 5)];
      let r = col[0], g = col[1], b = col[2];
      // wheel ruts: two worn bands, darker and smoothed
      const rut = !kerb && Math.abs(av - 11.5) < 3.2 ? 1 - Math.abs(av - 11.5) / 3.2 : 0;
      if (rut > 0) { const f = 0.16 * Math.min(1, rut * 1.6); r -= r * f; g -= g * f; b -= b * f * 0.85; }
      // the crown down the middle catches a little more light
      if (!kerb && av < 4) { r += 5; g += 5; b += 4; }
      // pitting
      const hp = hash(pxx * 7 + py * 13, 3);
      if (hp < 0.06) { r -= 12; g -= 12; b -= 10; } else if (hp > 0.975) { r += 10; g += 10; b += 8; }
      // edges: dark joint on the stone's lower-right, lit lip on its upper-left
      const dn = at(i + PW), rt = pxx < PW - 1 ? at(i + 1) : -1, up = at(i - PW), lf = pxx > 0 ? at(i - 1) : -1;
      const joint = (dn !== s && dn >= 0) || (rt !== s && rt >= 0);
      const lip = (up !== s && up >= 0) || (lf !== s && lf >= 0);
      if (joint) {
        const f = rut > 0.3 ? 0.28 : 0.42;
        r -= r * f; g -= g * f; b -= b * f * 0.9;
        if (av > KERB - 8 && hash(s, 29) < 0.35) { r = moss[0]; g = moss[1]; b = moss[2]; }
      } else if (lip) { r += (255 - r) * 0.16; g += (243 - g) * 0.16; b += (210 - b) * 0.14; }
      // the road's outer edge: the kerb's last pixel darkens into the verge
      if (best[i] > HALF - 1.2) { r *= 0.62; g *= 0.62; b *= 0.62; }
      const o = i * 4;
      dd[o] = r < 0 ? 0 : r > 255 ? 255 : r; dd[o + 1] = g < 0 ? 0 : g > 255 ? 255 : g; dd[o + 2] = b < 0 ? 0 : b > 255 ? 255 : b; dd[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // grass in the joints near the kerbs, and a pebble where a flag is gone
  const base = mix(R.GRASS_DK, R.GRASS, 0.25), tip = lighten(R.GRASS_LT, 0.15);
  for (let i = 0; i < 90; i++) {
    const u = rng() * TOTAL_LEN, sideV = (rng() < 0.5 ? -1 : 1) * (KERB - 1 - rng() * 3);
    const sg = SEGS.find((q) => u >= q.start && u <= q.start + q.len) || SEGS[0];
    const t = (u - sg.start) / sg.len, ux = (sg.x2 - sg.x1) / sg.len, uy = (sg.y2 - sg.y1) / sg.len;
    const x = sg.x1 + (sg.x2 - sg.x1) * t - uy * sideV, y = sg.y1 + (sg.y2 - sg.y1) * t + ux * sideV;
    if (x > W - 104 || x < 2) continue;
    tuft(ctx, x, y, 0.45 + rng() * 0.3, base, tip, 700 + i, { n: 3 });
  }
};

// ---- the registry ----------------------------------------------------------------
export const IRON_ART = {
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
