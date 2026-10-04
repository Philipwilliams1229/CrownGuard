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
// The fifteen-level boards' own (2026-10-03; a decor entry's `v` picks the look):
//   Brinewick   irpan (salt pan, flat: v brine / crust / raked / drying),
//               irsalthouse (live smoke, steam, fire), irsalt, irboat, irwreck
//   Warden Moor irquintain (live arm), irdummy (v straw man / pell / helmed /
//               shot), irbutts, irrack, irmuster
//   Blackcliff  irstack (basalt, gull-streaked), ireyrie (live: a gryphon
//               asleep in her nest; v3 away, eggs; gulls wheeling)
//   Ironmouth   irquay (quay + barge, v = lading), irmoor, irtoll
// irquay / irmoor face water to their EAST; irwreck lies 12-20 north of its
// footing (keel up into the wash) — place them by the bank, see realms-iron.js.
// Spawn kind: "ironcamp" (the camp's gatehouse: drawIronCamp + the irgate
// pieces, see "the gate the Iron army comes out of"). Ground art key: "iron".
// Live pieces bake their still body once and only paint cloth and flame.

import { W, H, PATH_HALF, RES } from "../data/constants.js";
import { PTS, SEGS, TOTAL_LEN, nearestOnPath } from "../engine/path.js";
import { FOREST, forestDepthAt, PONDS, RIVERS, inRiver, DECOR } from "../data/terrain.js";
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
// The Kingdom's forward camp lies off the board's edge in the pines, and the
// road comes out of it through the camp's GATEHOUSE: a palisade wall of
// pointed logs with an arch as wide as the road, a fighting walk over it, a
// square timber tower on a stone footing at either end, the gates thrown open
// inward and the dark of the camp beyond. The wall stands ACROSS the road
// GATE_L0 along it from where the column forms (PTS[0]), turned to face
// south-east (at least GATE_TURN south of east, like the Greenwood's cave
// mouth) so its face and the arch read in the board's camera; a road that
// drops in steeply from the top corner (Greyhelm) has its wall square across
// it. Everything is worked out from the road, so it fits any board.
// The faces are painted pixel by pixel (a face is a texture of p along it and
// z up it), so every log and plank stays crisp, and baked once per board.
// Three layers, so the column passes THROUGH the arch:
//  - drawIronCamp (the spawn layer, under the foes and the wood): the ground
//    (the flags worn and mired out of the arch, the wall's shadow, the dark
//    road back into the camp), the dark through the arch with the far leaf
//    swung back inside it, the palisade's stakes off into the pines, tents'
//    peaks behind the wall.
//  - the "irgate" piece, sorted with the pines NORTH of the road (maps.js
//    ironGate): the far tower and the wall's end at it, the pennant; the
//    column walks in front of it.
//  - the "irgate" piece with v 9, sorted SOUTH of the road: the wall and its walk,
//    the near tower, the banner, the brazier, the camp's smoke; it stands in
//    front of the column, which shows through the arch and marches out of it.
//    A board with no v 9 piece draws all of it with the other; with no piece
//    at all, the spawn layer draws it. Where the pieces stand only sorts them
//    (and blocks halls by their footprint); the art stands where the road is.
const GATE_L0 = 34;          // the wall's middle this far along the road
const GATE_TURN = 0.87;      // its face turned at least this far (rad) south of east
const GT = {
  plank: ["#24180f", "#36261a", "#4a3523", "#5e442d", "#735638", "#8a6943", "#a27e52"],
  post: ["#1e140e", "#2e2016", "#422e1f", "#573d28", "#6d4e33", "#86623f", "#9e774d"],
  log: ["#2c2018", "#443224", "#5e4631", "#785c3f", "#93744f", "#ad8d62", "#c6a77a"],
  stone: ["#353338", "#4c4a4c", "#64615e", "#7e7a72", "#989386", "#b0ab9a", "#c8c2ae"],
  iron: ["#141418", "#202228", "#2e3038", "#454852", "#646a76", "#8a909c", "#b8bcc6"],
  mud: ["#2a2220", "#3a2e26", "#4a3b2e", "#5a4936", "#6a5840"],
};
const GTR = {};
const gt = (mat, i) => {
  let r = GTR[mat];
  if (!r) r = GTR[mat] = GT[mat].map(hexRGB);
  return r[Math.max(0, Math.min(r.length - 1, Math.round(i)))];
};
const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const DARK_IN = ["#100c0e", "#171113", "#1f1718", "#2a201e", "#382a24"].map(hexRGB);
const EMBER = hexRGB("#6a2a18");

// A raster in art pixels over the board box (x0, y0, w, h): faces write into it.
const raster = (x0, y0, w, h) => {
  const PW = Math.ceil(w * PX), PH = Math.ceil(h * PX);
  return { x0, y0, w, h, PW, PH, d: new Uint8ClampedArray(PW * PH * 4) };
};
const rput = (S, i, c, a = 255) => { const o = i * 4; S.d[o] = c[0]; S.d[o + 1] = c[1]; S.d[o + 2] = c[2]; S.d[o + 3] = a; };
// a vertical face in the board's camera (z is drawn straight up): from ground
// point (ox, oy) along the unit (ax, ay) for L, z0..z1 high; tex(p, z) gives
// its colour there, or null where it is open. (A face running due north-south
// is edge-on and draws nothing.)
const vface = (S, ox, oy, ax, ay, L, z0, z1, tex) => {
  if (Math.abs(ax) < 1e-3 || L <= 0) return;
  const xs = [ox, ox + ax * L], X0 = Math.max(0, Math.floor((Math.min(...xs) - S.x0) * PX)), X1 = Math.min(S.PW, Math.ceil((Math.max(...xs) - S.x0) * PX));
  const ys = [oy - z1, oy - z0, oy + ay * L - z1, oy + ay * L - z0];
  const Y0 = Math.max(0, Math.floor((Math.min(...ys) - S.y0) * PX)), Y1 = Math.min(S.PH, Math.ceil((Math.max(...ys) - S.y0) * PX));
  for (let px = X0; px < X1; px++) {
    const p = (S.x0 + (px + 0.5) / PX - ox) / ax;
    if (p < 0 || p >= L) continue;
    for (let py = Y0; py < Y1; py++) {
      const z = oy + ay * p - (S.y0 + (py + 0.5) / PX);
      if (z < z0 || z >= z1) continue;
      const c = tex(p, z);
      if (c) rput(S, py * S.PW + px, c);
    }
  }
};
// a level top Z high over the ground quad F + A·p + N·d (p0..p1, d0..d1);
// tex(p - p0, d - d0)
const tface = (S, F, A, N, p0, p1, d0, d1, Z, tex) => {
  const cs = [[p0, d0], [p1, d0], [p0, d1], [p1, d1]].map(([p, d]) => [F[0] + A[0] * p + N[0] * d, F[1] + A[1] * p + N[1] * d - Z]);
  const X0 = Math.max(0, Math.floor((Math.min(...cs.map((c) => c[0])) - S.x0) * PX)), X1 = Math.min(S.PW, Math.ceil((Math.max(...cs.map((c) => c[0])) - S.x0) * PX));
  const Y0 = Math.max(0, Math.floor((Math.min(...cs.map((c) => c[1])) - S.y0) * PX)), Y1 = Math.min(S.PH, Math.ceil((Math.max(...cs.map((c) => c[1])) - S.y0) * PX));
  for (let py = Y0; py < Y1; py++) for (let px = X0; px < X1; px++) {
    const rx = S.x0 + (px + 0.5) / PX - F[0], ry = S.y0 + (py + 0.5) / PX + Z - F[1];
    const p = rx * A[0] + ry * A[1], d = rx * N[0] + ry * N[1];
    if (p < p0 || p >= p1 || d < d0 || d >= d1) continue;
    const c = tex(p - p0, d - d0);
    if (c) rput(S, py * S.PW + px, c);
  }
};
// the raster into a baked sprite (inked round, or not, like any bake)
const rasterSprite = (S, ink, after) => bakeSprite(S.w, S.h, (c) => {
  const img = c.createImageData(S.PW, S.PH);
  img.data.set(S.d);
  c.putImageData(img, 0, 0);
  if (after) { c.save(); c.translate(-S.x0, -S.y0); after(c); c.restore(); }
}, ink);

// ---- the gatehouse's surfaces --------------------------------------------------
// how a surface stands to the sun (upper left): a top in it, a south face in
// a little shade, the wall's south-east face and a tower's east side deeper
const LIGHT = { T: 1.5, S: 0.3, F: -0.15, E: -0.8, I: 0.5 };
// pointed logs standing in a row, w wide each, their tips at `top` (plus a
// little each); `l` the light
const logRow = (p, z, top, l, seed, w = 2.5) => {
  const k = Math.floor(p / w), f = p / w - k;
  const tip = top - 1.8 * Math.abs(f * 2 - 1) - hash(k, seed) * 0.8;
  if (z >= tip) return null;
  const v = l + (hash(k, seed + 3) - 0.5) * 0.7;
  if (f > 0.8) return gt("log", 1.2 + v * 0.4);
  if (z > tip - 1) return gt("log", 4.8 + v);
  return gt("log", (f < 0.36 ? 4.1 : 3.1) + v);
};
// a tower's timber wall: a stone footing, lapped boards between corner posts,
// an iron band, an arrow slit
const towerWall = (p, z, L, l, seed, o = {}) => {
  const foot = 5;
  if (z < foot) {
    const c = Math.floor(z / 2.5), fz = z / 2.5 - c;
    if (fz > 0.79) return gt("stone", 1.6 + l * 0.4);
    const off = hash(c, seed + 5) * 4, k = Math.floor((p + off) / 4.5), f = (p + off) / 4.5 - k;
    if (f < 0.11) return gt("stone", 1.7 + l * 0.4);
    return gt("stone", 3.3 + l + (hash(k * 5 + c, seed) - 0.5) * 0.9 - (z < 1 ? 0.8 : 0) + (fz < 0.2 ? 0.6 : 0));
  }
  if (p < 1.5) return gt("post", (p < 0.5 ? 4.8 : 3.6) + l);
  if (p > L - 1.5) return gt("post", 2.2 + l);
  if (o.slit && Math.abs(p - L / 2) < 0.6 && z > o.slit && z < o.slit + 4.5) return gt("iron", 0);
  if (z >= o.band && z < o.band + 1) return gt("iron", 2.6 + l * 0.5 + (Math.floor(p * 2) % 7 === 3 ? 1.6 : 0));
  const bz = (z - foot) / 3, b = Math.floor(bz), fz = bz - b;
  if (fz < 0.16) return gt("plank", 1.1 + l * 0.4);
  const off = hash(b, seed + 9) * 11, k = Math.floor((p + off) / (6 + hash(b, seed + 1) * 5));
  return gt("plank", 3.1 + l + (fz > 0.83 ? 0.8 : 0) + (hash(k * 3 + b, seed + 2) - 0.5) * 0.9);
};
// a deck of boards seen from above, shaded in the lee of its far breastworks
const deck = (u, v, seed) => {
  const b = Math.floor(u / 2), f = u / 2 - b;
  let t = 4.2 + (hash(Math.floor((v + hash(b, seed) * 7) / 6) * 7 + b, seed) - 0.5) * 0.8;
  if (f > 0.74) t -= 1.6;
  return gt("plank", t);
};
// The wall's face, p from -hw to hw along it (local: 0 at the road's middle):
// pointed logs, an arch with knee braces in its corners, a bolted lintel, the
// raised portcullis's teeth showing under it, the breastwork over the walk.
// `part`: "arch" paints only what shows THROUGH the arch (the spawn layer),
// "wall" everything else ("far": only the far end, p >= farFrom).
const ARCH_TOP = 21;
const archTop = (a, jam) => (a > jam - 5 ? ARCH_TOP - (a - (jam - 5)) * 0.9 : ARCH_TOP);
const wallFace = (pl, z, hw, ZG, seed) => {
  const l = LIGHT.F, a = Math.abs(pl), jam = hw - 4;
  const top = archTop(a, jam);
  if (a < jam && z < top) {
    // the portcullis drawn up into the lintel, its iron-shod teeth hanging
    const tk = (pl + hw) / 3 - Math.floor((pl + hw) / 3);
    if (a < jam - 4.5) {
      if (z > ARCH_TOP - 2.6 && z < ARCH_TOP - 0.8) return gt("post", z > ARCH_TOP - 1.4 ? 1.2 : 2.4);
      if (z > ARCH_TOP - 6.4 && z < ARCH_TOP - 0.8 && tk > 0.3 && tk < 0.7) {
        if (z < ARCH_TOP - 5.4) return gt("iron", tk < 0.5 ? 6 : 4.6);
        return gt("post", tk < 0.5 ? 3 : 1.8);
      }
    }
    return null;
  }
  if (a < jam && z < top + 1.6) return gt("post", 3.2 + l);                 // the knee braces
  if (z >= ZG) return logRow(pl + hw, z, ZG + 6.5, l, seed);                // the breastwork
  if (a >= jam) {
    // the jambs: great squared posts, iron hinge straps
    if ((z > 4 && z < 5.2) || (z > 14 && z < 15.2)) return gt("iron", 2.6 + l * 0.5);
    return gt("post", (a > hw - 0.8 ? 1.8 : a > jam + 1.4 ? 2.8 : 3.9) + l);
  }
  if (z < ARCH_TOP + 3.5) {
    // the lintel: one great beam, bolted, lit along its top
    if (z < ARCH_TOP + 0.6) return gt("post", 1.4 + l);
    const bolt = Math.abs(((pl + hw) % 6) - 3) < 0.5 && Math.abs(z - (ARCH_TOP + 1.9)) < 0.6;
    return bolt ? gt("iron", 5) : gt("post", 4.3 + l + (z > ARCH_TOP + 2.9 ? 1.2 : 0));
  }
  // over the lintel: the palisade's logs (no tips: the walk is on them), an iron band
  if (z > ZG - 3 && z < ZG - 2) return gt("iron", 2.4 + l * 0.5);
  return logRow(pl + hw, z, 99, l, seed);
};
// what shows through the arch: the passage's dark, its floor lit a little at
// the mouth, the camp's fires a smoulder far down it
const archInside = (pl, z, hw) => {
  const low = Math.max(0, 1 - z / 5);
  const g = Math.max(0, 1 - Math.abs(pl) / (hw * 0.5)) * Math.max(0, 1 - Math.abs(z - 3.5) / 4.5);
  const di = Math.min(4, Math.floor(low * 3.3 + hash(Math.floor(pl * 2) + 50, Math.floor(z * 2)) * 0.9));
  if (g > 0.62) return mixRGB(DARK_IN[di], EMBER, 0.42);
  if (g > 0.3 && hash(Math.floor(pl * 2) + 7, Math.floor(z * 2)) < 0.5) return mixRGB(DARK_IN[di], EMBER, 0.22);
  return DARK_IN[di];
};
// a leaf of the gate: pointed logs, two iron straps, a brace
const leafTex = (l, seed, len) => (p, z) => {
  if (z > 15) return logRow(p, z, 17.5, l, seed);
  if ((z > 3 && z < 4.3) || (z > 11 && z < 12.3)) return gt("iron", 2.6 + l * 0.5);
  if (Math.abs(z - (4.3 + (p / len) * 6.7)) < 0.85) return gt("post", 2.8 + l);
  return logRow(p, z, 99, l, seed);
};

// ---- the gatehouse's plan ---------------------------------------------------------
// Worked out once per board from where the road leaves the edge. F: the
// road's middle at the wall (ground); A: along the wall toward its far
// (north-east) end; N: into the gate, back toward the camp; hw: half the
// arch's span along the wall (the road crosses it on the skew).
const plan = () => {
  const [sx, sy] = PTS[0], [nx, ny] = PTS[1];
  const l = Math.hypot(nx - sx, ny - sy) || 1, ux = (nx - sx) / l, uy = (ny - sy) / l;
  const phi = Math.atan2(uy, ux), psi = Math.max(phi, GATE_TURN);
  const O = [Math.cos(psi), Math.sin(psi)];            // the wall's face looks this way
  const A = [O[1], -O[0]], N = [-O[0], -O[1]];
  const hw = PATH_HALF / Math.max(0.4, Math.cos(psi - phi)) + 3;
  const F = [sx + ux * GATE_L0, sy + uy * GATE_L0];
  const G = { S: [sx, sy], u: [ux, uy], F, A, N, O, hw, D: 9, ZG: 34, P: 6.5, t1: 49, t2: 45 };
  // the towers: square, upright, at either end of the wall
  const C1 = [F[0] + A[0] * (hw + 8), F[1] + A[1] * (hw + 8)], C2 = [F[0] - A[0] * (hw + 8), F[1] - A[1] * (hw + 8)];
  G.T1 = { xa: C1[0] - 9, xb: C1[0] + 9, ya: C1[1] - 7, yb: C1[1] + 7 };
  G.T2 = { xa: C2[0] - 8, xb: C2[0] + 8, ya: C2[1] - 6, yb: C2[1] + 6 };
  return G;
};
// a tower: its far breastworks, its deck, its south face and the sliver of its
// east side, the breastwork rising off their tops
const paintTower = (S, b, Z, P, seed, slit) => {
  const { xa, xb, ya, yb } = b, W2 = xb - xa, X = [1, 0], Y = [0, 1];
  vface(S, xa, ya + 0.8, 1, 0, W2, Z, Z + P, (p, z) => logRow(p, z, Z + P - 0.6, LIGHT.S - 0.3, seed + 11));
  tface(S, [xa, ya], X, Y, 0, W2, 0, yb - ya, Z, (u, v) => (v < 1.6 ? gt("plank", 2.4) : deck(v, u, seed)));
  vface(S, xa, yb, 1, 0, W2, 0, Z + P, (p, z) => (z >= Z ? logRow(p, z, Z + P, LIGHT.S, seed + 17) : towerWall(p, z, W2, LIGHT.S, seed, { slit, band: Z - 7 })));
  // the east side, receding north-east (a sliver, as the board's halls show it)
  const ex = 0.42, ey = -0.91, EL = (yb - ya) * 0.36;
  vface(S, xb, yb, ex, ey, EL, 0, Z + P, (p, z) => (z >= Z ? logRow(p + 1.3, z, Z + P, LIGHT.E, seed + 19) : towerWall(p + W2, z, W2 + EL, LIGHT.E, seed + 1, { band: Z - 7 })));
};
// the wall: its back breastwork, its walk, its face (whole, or the far end)
const paintWall = (S, G, part) => {
  const { F, A, N, O, hw, D, ZG, P } = G, seed = 7;
  const farFrom = hw - 6;
  if (part !== "far") {
    // the back breastwork (its face toward the walk), the walk's boards
    vface(S, F[0] + A[0] * -hw + N[0] * (D - 0.8), F[1] + A[1] * -hw + N[1] * (D - 0.8), A[0], A[1], hw * 2, ZG, ZG + P, (p, z) => logRow(p, z, ZG + P - 0.6, LIGHT.F - 0.4, seed + 3));
    tface(S, F, A, N, -hw, hw, 0, D, ZG, (u, v) => (v > D - 1.8 ? gt("plank", 2.3) : deck(v, u, seed)));
  }
  const p0 = part === "far" ? farFrom : -hw, L = part === "near" ? farFrom + hw : hw - p0;
  vface(S, F[0] + A[0] * p0, F[1] + A[1] * p0, A[0], A[1], L, 0, ZG + P, (p, z) => wallFace(p + p0, z, hw, ZG, seed));
};

// ---- the standing gatehouse (the irgate pieces' bakes) ------------------------------
const GATEH = { key: "", near: null, far: null, x0: 0, y0: 0, w: 0, h: 0, G: null, fire: null, pole: null, flag: null, smoke: [] };
const bakeGatehouse = () => {
  const key = `${REALM.id}|${PTS[0]}|${PTS[1]}`;
  if (GATEH.key === key) return GATEH;
  GATEH.key = key;
  const G = plan(), { F, A, N, hw, D, ZG, P, T1, T2 } = G;
  GATEH.G = G;
  const xs = [T1.xa, T1.xb + 4, T2.xa, T2.xb, F[0] + A[0] * hw + N[0] * D, F[0] - A[0] * hw + N[0] * D];
  const ys = [T1.ya - G.t1 - P - 34, T2.yb + 4, F[1] - A[1] * hw + 6, F[1] + A[1] * hw + N[1] * D - ZG - P - 30];
  const x0 = Math.floor(Math.min(...xs) - 6), x1 = Math.ceil(Math.max(...xs) + 6);
  const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  // the far tower and the wall's end at it (sorted behind the column)
  const S1 = raster(x0, y0, x1 - x0, y1 - y0);
  paintTower(S1, T1, G.t1, P, 3, 24);
  paintWall(S1, G, "far");
  // the wall, its walk and the near tower (sorted in front of the column)
  const S2 = raster(x0, y0, x1 - x0, y1 - y0);
  paintWall(S2, G, "near");
  paintTower(S2, T2, G.t2, P, 9, 21);
  // the live bits' places: the pennant on the far tower's deck, the brazier
  // on the walk, the banner on the face over the arch, smoke out of the camp
  GATEH.pole = [T1.xa + 3.5, T1.ya + 3.5 - G.t1];
  const wp = hw * 0.5;
  GATEH.fire = [F[0] + A[0] * wp + N[0] * D * 0.45, F[1] + A[1] * wp + N[1] * D * 0.45 - ZG];
  GATEH.flag = [F[0], F[1] - ZG - 4];
  const back = (s, k) => [F[0] + A[0] * s + N[0] * (D + k), F[1] + A[1] * s + N[1] * (D + k) - ZG + 2];
  GATEH.smoke = [back(-hw * 0.35, 8), back(hw * 0.3, 16)];
  GATEH.far = rasterSprite(S1, true, (c) => {
    const [px, py] = GATEH.pole;
    if (py - 16 > 2) {
      cylinder(c, px - 0.6, py - 16, 1.2, 16.5, WOOD_DK, { r: 0.4 });
      ball(c, px, py - 16, 1, 1, BRASS, { hi: 0.5, lo: 0.3 });
    } else GATEH.pole = null;
  });
  GATEH.near = rasterSprite(S2, true, (c) => {
    // the brazier's iron basket on the walk, the banner's crossbar
    const [bx, by] = GATEH.fire;
    c.fillStyle = IRON;
    for (const dx of [-2.5, -0.5, 1.5]) c.fillRect(ap(bx + dx), ap(by - 3.5), 1, 3.5);
    c.fillRect(ap(bx - 3), ap(by - 1.5), 7, 1);
    ellipse(c, bx + 0.5, by - 3.5, 3.5, 1.1); c.fillStyle = "#3a2420"; c.fill();
    const [fx, fy] = GATEH.flag;
    c.fillStyle = IRON; c.fillRect(ap(fx - 6.5), ap(fy - 1), 13, 1);
    c.fillStyle = BRASS; c.fillRect(ap(fx - 7), ap(fy - 1.5), 1, 1.5); c.fillRect(ap(fx + 6.5), ap(fy - 1.5), 1, 1.5);
  });
  GATEH.x0 = x0; GATEH.y0 = y0; GATEH.w = S1.w; GATEH.h = S1.h;
  return GATEH;
};
const drawGateFar = (ctx, time) => {
  const B = bakeGatehouse();
  ctx.drawImage(B.far, B.x0, B.y0, B.w, B.h);
  if (B.pole) pennant(ctx, B.pole[0] + 0.6, B.pole[1] - 15.5, 11, 4, time, 1.3);
};
const drawGateNear = (ctx, time) => {
  const B = bakeGatehouse();
  ctx.drawImage(B.near, B.x0, B.y0, B.w, B.h);
  const [fx, fy] = B.flag;
  const sway = Math.sin(time * 1.6) * 0.6 + Math.sin(time * 2.9 + 1) * 0.2;
  cloth(ctx, ap(fx - 5.5), ap(fy), 11, 15, sway);
  fire(ctx, B.fire[0] + 0.5, B.fire[1] - 3.5, 0.75, time, 2.1);
  smoke(ctx, B.smoke[0][0], B.smoke[0][1], time, 0.1, 1.3, "140,138,144", 0.34);
};
// which pieces this board has (maps.js places them; looked up once a board).
// The near piece is the one with v GATE_NEAR_V (a piece without a v gets one
// hashed from its place, 0-3, so this never comes by chance).
const GATE_NEAR_V = 9;
const GATE_PIECES = { key: "", far: false, near: false };
const gatePieces = () => {
  const key = `${REALM.id}|${PTS[0]}|${DECOR.length}`;
  if (GATE_PIECES.key !== key) {
    GATE_PIECES.key = key;
    GATE_PIECES.far = DECOR.some((d) => d.t === "irgate" && d.v !== GATE_NEAR_V);
    GATE_PIECES.near = DECOR.some((d) => d.t === "irgate" && d.v === GATE_NEAR_V);
  }
  return GATE_PIECES;
};
const ironGate = (ctx, x, y, s, o) => {
  if (PTS.length < 2) return;
  if (o.v === GATE_NEAR_V) { drawGateNear(ctx, o.time); return; }
  drawGateFar(ctx, o.time);
  if (!gatePieces().near) drawGateNear(ctx, o.time);
};

// ---- the camp's ground, the arch's dark, the palisade (the spawn layer) -----------------
const CAMP = { key: "", ground: null, build: null, x0: 0, y0: 0, w: 0, h: 0 };
const tentPeak = (c, x, gy, s) => {
  // a bell tent's cone: oxblood, lit on the sun side, a grey valance, a finial
  const R = 7 * s, h = 12 * s;
  part(c, (cc) => {
    cc.beginPath(); cc.moveTo(x, gy - h); cc.lineTo(x + R, gy); cc.quadraticCurveTo(x, gy + 1.5 * s, x - R, gy); cc.closePath();
    cc.fillStyle = lin(cc, x - R, 0, x + R, 0, [[0, lighten(OX, 0.22)], [0.5, OX], [1, OX_DK]]); cc.fill();
    cc.fillStyle = rgba("#2a1c2c", 0.3);
    for (const k of [-0.5, 0.5]) { cc.beginPath(); cc.moveTo(x, gy - h); cc.lineTo(x + k * R - 0.3, gy); cc.lineTo(x + k * R + 0.3, gy); cc.fill(); }
    cc.fillStyle = STEEL; cc.fillRect(ap(x - R), ap(gy - 1.5), R * 2, 1.5);
    cc.fillStyle = darken(STEEL, 0.3); cc.fillRect(ap(x), ap(gy - 1.5), R, 1.5);
  });
  part(c, (cc) => { cc.fillStyle = WOOD_DK; cc.fillRect(ap(x - 0.5), gy - h - 3 * s, 1, 3 * s); ball(cc, x, gy - h - 3 * s, 0.9, 0.9, BRASS, { hi: 0.5, lo: 0.3 }); });
};
// a palisade stake, upright, pointed (painted north to south so they overlap)
const PALE = (c, x, gy, hh, k) => {
  cylinder(c, x - 1.6, gy - hh, 3.2, hh, k % 3 ? WOOD : mix(WOOD, "#7a6a50", 0.3), { r: 0.8, hi: 0.35, lo: 0.55 });
  c.fillStyle = mix(WOOD_LT, "#c8a878", 0.4);
  c.beginPath(); c.moveTo(x - 1.6, gy - hh + 0.5); c.lineTo(x, gy - hh - 2.6); c.lineTo(x + 1.6, gy - hh + 0.5); c.closePath(); c.fill();
};
const bakeCamp = () => {
  const key = `${REALM.id}|${PTS[0]}|${PTS[1]}`;
  if (CAMP.key === key) return CAMP;
  CAMP.key = key;
  const G = bakeGatehouse().G, { S: [sx, sy], u: [ux, uy], F, A, N, O, hw, D, T1, T2 } = G;
  // (the ground keeps to the gate; what stands runs on into the pines)
  const gx0 = -8, gx1 = Math.ceil(Math.max(T1.xb + 24, F[0] + 60));
  const gy0 = Math.floor(Math.max(-10, Math.min(T1.ya, sy) - 24)), gy1 = Math.ceil(Math.min(H + 10, Math.max(T2.yb, sy) + 30));
  CAMP.g = { x0: gx0, y0: gy0, w: gx1 - gx0, h: gy1 - gy0 };
  const x0 = -8, x1 = Math.ceil(Math.max(T1.xb, F[0] + 30) + 10);
  const y0 = Math.floor(Math.max(-10, Math.min(T1.ya, sy) - 90)), y1 = Math.ceil(Math.min(H + 10, Math.max(T2.yb, sy) + 90));
  const w = x1 - x0, h = y1 - y0;
  CAMP.x0 = x0; CAMP.y0 = y0; CAMP.w = w; CAMP.h = h;
  // 1. the ground: the flags out of the arch worn and mired, the wall's and
  //    towers' shadow (light from the upper left), the dark road back into
  //    the camp (stepped and dithered: no blur)
  const R1 = raster(gx0, gy0, gx1 - gx0, gy1 - gy0);
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const shade = hexRGB("#1c1620"), dark = hexRGB("#0e0c10");
  const SUN = [0.5, 0.36];
  // (a ray toward the sun from (X, Y) meets a block below its height: each
  // bound is linear in t, so it is one interval test, not a march)
  const span = (lo, hi, v0, dv) => {            // t where lo <= v0 + dv·t < hi
    if (Math.abs(dv) < 1e-9) return v0 >= lo && v0 < hi ? [-1e9, 1e9] : null;
    const a = (lo - v0) / dv, b = (hi - v0) / dv;
    return a < b ? [a, b] : [b, a];
  };
  const hits = (zmax, ...sp) => {
    let t0 = 0, t1 = zmax;
    for (const s of sp) { if (!s) return false; t0 = Math.max(t0, s[0]); t1 = Math.min(t1, s[1]); }
    return t0 <= t1;
  };
  const SO = SUN[0] * O[0] + SUN[1] * O[1], SA = SUN[0] * A[0] + SUN[1] * A[1];
  for (let py = 0; py < R1.PH; py++) for (let px = 0; px < R1.PW; px++) {
    const X = gx0 + (px + 0.5) / PX, Y = gy0 + (py + 0.5) / PX, i = py * R1.PW + px;
    const bay = B4[(py & 3) * 4 + (px & 3)] / 16;
    const rx = X - sx, ry = Y - sy, ac = Math.abs(-rx * uy + ry * ux);     // across the road's first leg
    const out = (X - F[0]) * O[0] + (Y - F[1]) * O[1];                     // out from the wall's face
    const along = (X - F[0]) * A[0] + (Y - F[1]) * A[1];
    if (ac < PATH_HALF + 6 && out < 0) {
      // the road behind the wall and back into the camp: dark, deepening
      // toward the edge, its verges frayed into the wood's own shade
      const lvl = Math.min(4, Math.floor(1.6 - out / 16 + bay - Math.max(0, ac - PATH_HALF + 2) / 3));
      if (lvl > 0) { rput(R1, i, dark, [0, 70, 120, 160, 196][lvl]); continue; }
    }
    // in the wall's or a tower's shadow? (light from the upper left)
    const sh = hits(G.ZG + 3, span(-D, 0, out, -SO), span(-hw, hw, along, -SA))
      || hits(G.t1, span(T1.xa, T1.xb, X, -SUN[0]), span(T1.ya, T1.yb, Y, -SUN[1]))
      || hits(G.t2, span(T2.xa, T2.xb, X, -SUN[0]), span(T2.ya, T2.yb, Y, -SUN[1]));
    if (ac < PATH_HALF + 1 && out >= 0 && out < 46) {
      // the flags out of the arch: mud trodden into their joints, thinning out
      const k = 1 - out / 46;
      const n = vnoise(91, 5, X, Y) * 0.65 + vnoise(93, 2, X, Y) * 0.35;
      const rut = Math.abs(ac - 12) < 1.4 || (Math.abs(ac - 3) < 1 && n > 0.5);
      if (n < 0.24 + k * 0.42 || (rut && k > 0.3)) {
        const mt = rut ? 0.5 : n < 0.18 + k * 0.2 ? 1.2 : 2.6 + (hash(px >> 1, py >> 1) - 0.5) * 0.8;
        const al = Math.min(0.94, 0.3 + k * 0.62) * (sh ? 1 : 0.92);
        rput(R1, i, sh ? mixRGB(gt("mud", mt), shade, 0.35) : gt("mud", mt), Math.round(255 * al));
        continue;
      }
    }
    if (sh) { rput(R1, i, shade, 100); continue; }
    // trampled ground about the gate's feet, off the road
    if (ac >= PATH_HALF && ac < PATH_HALF + 20 && out > -12 && out < 22 && Math.abs(along) < hw + 24) {
      const n = vnoise(97, 3, X, Y);
      if (n < 0.4 - (ac - PATH_HALF) / 55) rput(R1, i, gt("mud", n < 0.26 ? 1.5 : 2.5), 150);
    }
  }
  CAMP.ground = rasterSprite(R1, false);
  // 2. under the wood: the dark through the arch, the near leaf swung back
  //    inside it, the palisade's stakes off into the pines, tents' peaks over
  //    the wall
  const R2 = raster(x0, y0, w, h);
  const jam = hw - 4;
  vface(R2, F[0] - A[0] * jam, F[1] - A[1] * jam, A[0], A[1], jam * 2, 0, ARCH_TOP, (p, z) => {
    const pl = p - jam;
    return z < archTop(Math.abs(pl), jam) + 0.6 ? archInside(pl, z, hw) : null;
  });
  // (the leaf on the far side of the passage, swung in against its wall)
  vface(R2, F[0] + A[0] * (jam - 0.6), F[1] + A[1] * (jam - 0.6), N[0], N[1], D + 4, 0, 18, leafTex(LIGHT.I, 23, D + 4));
  CAMP.build = rasterSprite(R2, true, (c) => {
    // the camp's tents behind the wall, where they'd show over it
    let tents = 0;
    for (const [s, k, sc] of [[hw * 0.7, 24, 1], [-hw * 1.1, 16, 0.9], [hw * 1.2, 40, 0.85], [-hw * 0.6, 34, 0.9]]) {
      const tx = F[0] + A[0] * s + N[0] * (D + k), ty = F[1] + A[1] * s + N[1] * (D + k);
      const ac = Math.abs(-(tx - sx) * uy + (ty - sy) * ux);
      if (tents < 2 && tx > 6 && ty > 16 && ty < H - 4 && ac > PATH_HALF + 9) { tentPeak(c, tx, ty, sc); tents++; }
    }
    // the palisade: stakes running on from each tower into the pines
    const run = (x, y, dx, dy, n, hh, sd) => {
      const pts = [];
      for (let k = 0; k < n; k++) pts.push([x + dx * k * 2.7 + Math.sin(k * 1.7 + sd) * 0.5, y + dy * k * 2.7, k]);
      pts.sort((a, b) => a[1] - b[1]);
      for (const [px, py, k] of pts) if (px > -3 && py > 4 && py < H + 10) PALE(c, px, py, hh + hash(k, sd) * 3, k);
    };
    const bend = (dx, dy) => { const l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
    const [ndx, ndy] = bend(-0.3, -1), [sdx, sdy] = bend(-0.35, 1);
    run(T1.xa + 2, T1.ya - 1, ndx, ndy, 26, 15, 3);
    run(T2.xa + 1, T2.yb + 2, sdx, sdy, 26, 14, 5);
  });
  return CAMP;
};
const drawIronCamp = (ctx, time) => {
  if (PTS.length < 2) return;
  const C = bakeCamp();
  ctx.drawImage(C.ground, C.g.x0, C.g.y0, C.g.w, C.g.h);
  ctx.drawImage(C.build, C.x0, C.y0, C.w, C.h);
  // a board with no "irgate" piece stands the gatehouse here, under the foes
  if (!gatePieces().far && !gatePieces().near) { drawGateFar(ctx, time); drawGateNear(ctx, time); }
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

// ---- the fifteen-level boards' pieces (2026-10-03) -------------------------------
// Brinewick's salt-works (irpan, irsalthouse, irsalt, irboat, irwreck), Warden
// Moor's drill yard (irquintain, irdummy, irbutts, irrack, irmuster),
// Blackcliff's rock (irstack, ireyrie) and Ironmouth's waterfront (irquay,
// irmoor, irtoll). The water pieces (irquay, irmoor) stand on the bank with the
// water to their EAST: their footprint stays ashore, the deck and boat reach
// out over the river. What lies on the water (shade, reflection, ripples) is
// painted under 0.43 alpha, so the bake's ink ring passes it by.
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(ap(x), ap(y), Math.max(0.5, ap(w)), Math.max(0.5, ap(h))); };
const SALT = "#f0ece2", SALT_SH = "#c8c4cc", SALT_PK = "#e8cfca";
const BRINE = "#6a8694", BRINE_LT = "#9ab4be", BRINE_DK = "#4a6474";
const CLAY = "#8a7658", CLAY_LT = "#a8936e", CLAY_DK = "#5c4a3a";
const SLATE = "#5c606a", SLATE_LT = "#7e828c", SLATE_DK = "#3a3c46";
const BASALT = "#56545c", TAR = "#3a302e";
const STRAW = "#c8a85a", STRAW_LT = "#e4ca7c", STRAW_DK = "#8a7038", BURLAP = "#a88a5e";
const SAND = "#c2b89c";
const WET = (a) => `rgba(20,30,44,${a})`, GLINT = (a) => `rgba(236,244,250,${a})`;

// a cask: staves, two iron hoops, a lid (or salt heaped in the open head)
const keg = (c, bx, gy, s, open = false) => {
  cylinder(c, bx - 3 * s, gy - 7 * s, 6 * s, 7 * s, "#8a6036", { r: 1.5 });
  c.fillStyle = IRON; c.fillRect(bx - 3 * s, ap(gy - 5.5 * s), 6 * s, 0.8); c.fillRect(bx - 3 * s, ap(gy - 2 * s), 6 * s, 0.8);
  ellipse(c, bx, gy - 7 * s, 3 * s, 1.1 * s); c.fillStyle = open ? SALT : "#a07a4a"; c.fill();
  if (open) { R(c, bx - 1.5 * s, gy - 8 * s, 2.5 * s, 1, SALT); R(c, bx + 0.5 * s, gy - 7.5 * s, 1.5 * s, 0.5, SALT_SH); }
};
// a sack lying on its side, the Kingdom's oxblood stencil on its cheek
const sackL = (c, sx, sgy, s, col = CANVAS) => {
  roundRect(c, sx - 4 * s, sgy - 4 * s, 8 * s, 4 * s, 1.6 * s);
  c.fillStyle = lin(c, 0, sgy - 4 * s, 0, sgy, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.3)]]); c.fill();
  R(c, sx - 0.5 * s, sgy - 2.8 * s, 1.5 * s, 1.5 * s, OX);
  R(c, sx + 3.2 * s, sgy - 3.5 * s, 0.5, 3 * s, darken(col, 0.35));
};
// a cone of raked salt: lit to the sun, a cool shade round the far side
const heap = (c, hx, hgy, r, k = 1) => {
  c.beginPath();
  c.moveTo(hx - r, hgy); c.quadraticCurveTo(hx - r * 0.35, hgy - r * 0.8 * k, hx - r * 0.05, hgy - r * 0.98 * k);
  c.quadraticCurveTo(hx + r * 0.35, hgy - r * 0.8 * k, hx + r, hgy); c.closePath();
  c.fillStyle = lin(c, hx - r, 0, hx + r, 0, [[0, "#ece6d8"], [0.42, "#d8d2c4"], [0.7, "#b4aea6"], [1, mix(SALT_SH, "#6a6478", 0.4)]]); c.fill();
  c.fillStyle = mix(SALT_SH, "#7a7488", 0.2); c.fillRect(hx - r, ap(hgy - 0.5), r * 2, 0.5);
};
// grey smoke (or white steam) rising and drifting east, faded as it climbs
const smoke = (ctx, x, y, time, ph, k = 1, col = "150,150,158", a = 0.3) => {
  for (let i = 0; i < 4; i++) {
    const t = (time * 0.2 + i / 4 + ph) % 1;
    const sx = x + Math.sin(time * 0.7 + i * 1.9 + ph * 6) * 1.5 * k + t * 12 * k, sy = y - t * 26 * k;
    soft(ctx, sx, sy, (2 + t * 6) * k, (1.6 + t * 4.4) * k, [[0, `rgba(${col},${a * (1 - t)})`], [1, `rgba(${col},0)`]]);
  }
};
// a pixel-stepped bar for the live pieces (they get no baked ink ring): ink, wood, a lit top
const bar = (ctx, x0, y0, x1, y1, w, col, lit) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (const [cc, d, ww, hh] of [[INK, -0.5, w + 1, w + 1], [col, 0, w, w], [lit, 0, w, 0.5]]) {
    ctx.fillStyle = cc;
    for (let i = 0; i <= n; i++) ctx.fillRect(ap(x0 + (x1 - x0) * i / n) + d, ap(y0 + (y1 - y0) * i / n) + d, ww, hh);
  }
};

// ---- Brinewick: the salt-works --------------------------------------------------
// A salt bed dug into the turf: low banks of puddled clay gone olive under the
// grass, soft and a little uneven at their edges and corners, a floor of brine
// or crust that goes to wet mud at its margins. Painted pixel by pixel and baked
// flat (no ink: it is ground, not a thing standing on it). Each bed's size,
// lean and outline come from its seed, so a field of them never ruled straight.
// v: 0 brine let in (sky in it, a sluice board in the near bank), 1 crusting
// (muted plates cracked round puddles), 2 raked up (furrows, two heaps, a
// plank laid in the bed), 3 drying (pale brine, pinkish crust in islands).
const PAN = {
  mud: "#5a5244", mudLt: "#6e6552", brine: "#56707c", brineLt: "#7a94a0", glint: "#b4c8d0",
  crust: "#cfc8b8", crustSh: "#aca598", crustPk: "#c8b4aa",
};
const saltPan = (ctx, x, y, s, o) => {
  const gy = y + 8, v = o.v % 4, sd = o.seed, H = (i) => hash(sd, i);
  const hw = (13 + H(1) * 5) * s, hh = (6.5 + H(2) * 2.5) * s, cx = x + (H(3) - 0.5) * 3 * s, cy = gy - hh;
  const bank = 2.6 * s, rr = (3 + H(5) * 2) * s, skew = (H(4) - 0.5) * 0.14;
  const BK = mix(CLAY, REALM.GRASS_DK, 0.38), BK_LT = mix(CLAY_LT, REALM.GRASS, 0.45), BK_DK = mix(CLAY_DK, REALM.GRASS_DK, 0.35);
  // signed distance to the bed's outer edge (< 0 inside), a rounded box leaned and wobbled
  const sdf = (px, py) => {
    const lx = px - cx - (py - cy) * skew, ly = py - cy;
    const qx = Math.abs(lx) - (hw - rr), qy = Math.abs(ly) - (hh - rr);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr
      + (vnoise(sd, 6, px, py) - 0.5) * 1.8 * s + (vnoise(sd + 9, 2, px, py) - 0.5) * 0.7;
  };
  const cr = (px, py) => vnoise(sd + 31, 3.2, px, py), cr2 = (px, py) => vnoise(sd + 57, 1.6, px, py);
  const x0 = ap(cx - hw - 4 * s), x1 = cx + hw + 4 * s, y0 = ap(cy - hh - 3 * s), y1 = cy + hh + 3 * s;
  for (let py = y0; py < y1; py += 0.5) for (let px = x0; px < x1; px += 0.5) {
    const d = sdf(px, py);
    if (d > 1.2) continue;
    const hp = hash(Math.round(px * 2) * 7 + sd, Math.round(py * 2) * 3 + 1);
    let col;
    if (d > 0) {
      // the bank's foot, broken into the turf
      if (hp > (1.2 - d) * 0.55) continue;
      col = mix(BK_DK, REALM.GRASS_DK, 0.55);
    } else if (d > -bank) {
      // the bank: a low ridge lit by its slope — outer slope faces out, inner slope in
      const t = -d / bank;
      const gx = sdf(px + 0.5, py) - sdf(px - 0.5, py), gq = sdf(px, py + 0.5) - sdf(px, py - 0.5), gl = Math.hypot(gx, gq) || 1;
      const sgn = t > 0.6 ? -1 : 1, lit = sgn * (gx / gl * -0.6 + gq / gl * -0.8);
      col = t > 0.3 && t <= 0.6 ? mix(BK, BK_LT, 0.55) : lit > 0.3 ? BK_LT : lit < -0.3 ? BK_DK : BK;
      if (hp < 0.07) col = REALM.GRASS_DK; else if (hp > 0.95) col = mix(BK_LT, REALM.GRASS, 0.5);
    } else {
      // the floor: wet mud at the margin, the far bank's shade along its north side
      const f = -d - bank, north = py < cy - (hh - bank) * 0.45;
      const n = cr(px, py), n2 = cr2(px, py);
      if (f < 1 * s + n2 * 0.8) col = hp < 0.5 ? PAN.mud : PAN.mudLt;
      else if (v === 0) {
        col = PAN.brine;
        if (f < 2.2 * s && n > 0.55) col = mix(PAN.crust, PAN.mudLt, 0.4);
        else if (hash(Math.round(py * 2) + sd, Math.floor(px / 3 + (py % 2))) < 0.05) col = PAN.glint;
        else if (n2 > 0.72) col = PAN.brineLt;
      } else if (v === 3) {
        col = mix(PAN.brine, PAN.brineLt, 0.45);
        if (n > 0.6) col = Math.abs(n2 - 0.5) < 0.06 ? PAN.crustSh : n > 0.7 ? PAN.crust : PAN.crustPk;
        else if (hash(Math.round(py * 2) + sd, Math.floor(px / 3)) < 0.04) col = PAN.glint;
      } else {
        col = PAN.crust;
        if (n < 0.24) col = n < 0.2 && hp < 0.06 ? PAN.glint : PAN.brine;              // puddles left in the crust
        else if (n < 0.3) col = mix(PAN.crust, PAN.mudLt, 0.55);                         // their muddy rims
        else if (Math.abs(n2 - 0.5) < 0.045) col = PAN.crustSh;                          // the cracks between plates
        else if (f < 2.4 * s) col = mix(PAN.crust, PAN.mudLt, 0.3);                     // crust going to mud at the margin
        if (v === 2 && col === PAN.crust && Math.round(py * 2) % 3 === 0) col = PAN.crustSh;   // rake furrows
        if (v === 1 && col === PAN.crust && n > 0.8) col = PAN.crustPk;
      }
      if (north && f < 2.6 * s) col = darken(col, 0.18);
    }
    ctx.fillStyle = col; ctx.fillRect(px, py, 0.5, 0.5);
  }
  const nb = ap(cy + hh - bank * 0.6);
  if (v === 2) {
    part(ctx, (c) => {   // a plank laid in the bed for the rakers, under the heaps
      const px = cx + hw * 0.1, py = cy - hh * 0.25, pl = hw * 0.55;
      R(c, px - pl, py, pl * 2, 1.5 * s, "#7a6044"); R(c, px - pl, py, pl * 2, 0.5, "#97795a");
    });
    part(ctx, (c) => heap(c, cx - hw * 0.35, cy + hh * 0.35, 3.6 * s));
    part(ctx, (c) => heap(c, cx + hw * 0.15, cy + hh * 0.45, 4.2 * s));
  } else if (v === 0) {
    part(ctx, (c) => { R(c, cx - 1.5 * s, nb - 2 * s, 3 * s, 3.5 * s, WOOD); R(c, cx - 1.5 * s, nb - 2 * s, 0.5, 3.5 * s, WOOD_LT); R(c, cx - 1.5 * s, nb - 2 * s, 3 * s, 0.5, WOOD_LT); });
  }
  if (H(7) > 0.35) tuft(ctx, cx - hw + 1, cy + hh + 1, 0.45, REALM.TUFT, REALM.GRASS_LT, sd, { n: 3 });
  if (H(8) > 0.5) tuft(ctx, cx + hw - 2, cy - hh + 1, 0.4, REALM.TUFT, REALM.GRASS_LT, sd + 1, { n: 3 });
};
// The feed: a channel cut up from the shore (south) to the pans, its sluice
// gate at the sea end, a plank bridge over it. The ditch is flat ground; the
// gate and planks are inked parts. Its north end runs L units above its feet.
const sluice = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed, L = 34 * s;
  const BK = mix(CLAY, REALM.GRASS_DK, 0.38), BK_DK = mix(CLAY_DK, REALM.GRASS_DK, 0.35), BK_LT = mix(CLAY_LT, REALM.GRASS, 0.45);
  const midx = (py) => x + Math.sin((gy - py) * 0.09 + sd) * 1.6 * s;
  for (let py = ap(gy - L); py < gy + 1; py += 0.5) {
    const mx = midx(py), w = (2.2 + vnoise(sd, 5, mx, py) * 0.8) * s;
    for (let px = ap(mx - w - 2 * s); px < mx + w + 2 * s; px += 0.5) {
      const d = Math.abs(px - mx) - w, hp = hash(Math.round(px * 2) + sd, Math.round(py * 2));
      let col;
      if (d > 1.2 * s) { if (hp > 0.45) continue; col = mix(BK_DK, REALM.GRASS_DK, 0.55); }
      else if (d > 0) col = px < mx ? BK_DK : BK_LT;            // the cut's faces: the west one shaded, the east lit
      else if (d > -0.8) col = PAN.mud;
      else col = hash(Math.round(py * 2) + sd, Math.floor(px * 2)) < 0.06 ? PAN.glint : hp < 0.3 ? PAN.brineLt : PAN.brine;
      ctx.fillStyle = col; ctx.fillRect(px, py, 0.5, 0.5);
    }
  }
  // the plank bridge
  const by = gy - L * 0.45, bx = midx(by);
  part(ctx, (c) => { for (const k of [0, 1]) { R(c, bx - 5 * s, by + k * 2 * s, 10 * s, 1.6 * s, k ? "#8a6c48" : "#9a7a52"); R(c, bx - 5 * s, by + k * 2 * s, 10 * s, 0.5, "#b0905e"); } });
  // the sluice gate: two posts, a sliding board, its rack and lifting bar
  part(ctx, (c) => {
    const gx = midx(gy - 2);
    cylinder(c, gx - 5 * s, gy - 9 * s, 2 * s, 9 * s, WOOD_DK, { r: 0.6 });
    cylinder(c, gx + 3 * s, gy - 9 * s, 2 * s, 9 * s, WOOD_DK, { r: 0.6 });
    R(c, gx - 5.5 * s, gy - 10 * s, 11 * s, 1.5 * s, WOOD); R(c, gx - 5.5 * s, gy - 10 * s, 11 * s, 0.5, WOOD_LT);
    R(c, gx - 3 * s, gy - 6 * s, 6 * s, 5 * s, "#7a5c3c");
    for (let k = 1; k < 3; k++) R(c, gx - 3 * s, gy - 6 * s + k * 1.7 * s, 6 * s, 0.5, WOOD_DK);
    R(c, gx - 0.5, gy - 13 * s, 1, 7 * s, IRON); R(c, gx - 2 * s, gy - 13 * s, 4 * s, 0.8, IRON);
  });
  tuft(ctx, x - 6 * s, gy + 1, 0.5, REALM.TUFT, REALM.GRASS_LT, sd, { n: 3 });
  tuft(ctx, x + 6 * s, gy - L * 0.7, 0.45, REALM.TUFT, REALM.GRASS_LT, sd + 3, { n: 3 });
};

// The salt-house where the brine is boiled down: a long low house of rubble
// stone under slate, its fire seen through the door, a louvre on the ridge
// letting out the steam, a tall stack at the west end, a coal store leant on
// the east end, casks of salt at the door. Live: smoke, steam, the fire.
const SALTHOUSE = { w2: 15, wh: 9, rf: 11, stack: 12 };
const RUBBLE = mix(ASHLAR, GRIT, 0.5);
const saltHouseBody = (c, x, y, s) => {
  const gy = y + 8, w2 = SALTHOUSE.w2 * s, wh = SALTHOUSE.wh * s, rf = SALTHOUSE.rf * s, wTop = gy - wh;
  shadow(c, x + 9 * s, gy + 0.5, 25 * s, 4.6 * s, 0.3);
  // the coal store on the east end: a plank front, open, its roof one slope of boards
  part(c, (cc) => {
    const lx = x + w2 - 0.5, lw = 9 * s;
    R(cc, lx, gy - 7 * s, lw, 7 * s, WOOD);
    R(cc, lx + 1.5 * s, gy - 5.5 * s, lw - 3 * s, 5.5 * s, "#1e1c22");
    ball(cc, lx + lw / 2, gy - 0.5, 3 * s, 2.6 * s, "#4a4852", { hi: 0.7, lo: 0.3 });
    for (let k = 0; k < 4; k++) R(cc, lx + 2 * s + hash(k, 7) * (lw - 4 * s), gy - 2 * s + hash(k, 8) * 1.5 * s, 0.5, 0.5, "#8a8894");
    R(cc, lx, gy - 7 * s, 1.5 * s, 7 * s, WOOD); R(cc, lx + lw - 1.5 * s, gy - 7 * s, 1.5 * s, 7 * s, darken(WOOD_DK, 0.2));
    R(cc, lx - 0.5, gy - 12 * s, lw + 1.5, 5 * s, WOOD);
    for (let k = 1; k < 5; k++) R(cc, lx - 0.5, gy - 12 * s + k * s, lw + 1.5, 0.5, WOOD_DK);
    R(cc, lx - 0.5, gy - 12 * s, lw + 1.5, 0.5, WOOD_LT);
  });
  part(c, (cc) => {
    // the south wall, rubble in courses, lit from the west
    ashlar(cc, x - w2, wTop, w2 * 2, wh, RUBBLE, 5);
    R(cc, x - w2, gy - 1.5, w2 * 2, 1.5, darken(RUBBLE, 0.35));
    R(cc, x - w2 - 1, gy - 1.5, 4 * s, 1.5, "#6a7a4a");
  });
  part(c, (cc) => {
    // the roof's south slope seen from above: slate courses, eaves, a lit ridge
    const ex = 1.5 * s;
    cc.beginPath();
    cc.moveTo(x - w2 - ex, wTop + 0.5); cc.lineTo(x + w2 + ex, wTop + 0.5); cc.lineTo(x + w2 + ex * 0.4, wTop - rf); cc.lineTo(x - w2 - ex * 0.4, wTop - rf); cc.closePath();
    cc.fillStyle = lin(cc, 0, wTop - rf, 0, wTop, [[0, SLATE_LT], [0.35, SLATE], [1, darken(SLATE, 0.18)]]); cc.fill();
    cc.save(); cc.clip();
    let row = 0;
    for (let yy = wTop - rf + 2; yy < wTop; yy += 1.5, row++) {
      R(cc, x - w2 - ex, yy, w2 * 2 + ex * 2, 0.5, SLATE_DK);
      for (let xx = x - w2 - ex + (row % 2) * 1.5 + hash(row, 3) * 2; xx < x + w2 + ex; xx += 3 + hash(row, Math.round(xx)) * 1.5) R(cc, xx, yy + 0.5, 0.5, 1, darken(SLATE, 0.3));
    }
    for (let i = 0; i < 10; i++) R(cc, x - w2 + hash(i, 41) * w2 * 2, wTop - rf + 2 + hash(i, 43) * (rf - 3), 1, 0.5, i % 3 ? SLATE_LT : "#7a8460");
    cc.restore();
    R(cc, x - w2 - ex * 0.4, wTop - rf - 1, w2 * 2 + ex * 0.8, 1.5, lighten(SLATE, 0.3));
    R(cc, x - w2 - ex, wTop, w2 * 2 + ex * 2, 0.5, SLATE_DK);
  });
  part(c, (cc) => {
    // the louvre on the ridge: a slatted box under its own little roof
    const lx = x + 4 * s, ly = wTop - rf - 1;
    R(cc, lx - 3 * s, ly - 3.5 * s, 6 * s, 3.5 * s, WOOD_DK);
    for (let k = 0; k < 3; k++) R(cc, lx - 3 * s, ly - 3 * s + k * s, 6 * s, 0.5, WOOD_LT);
    R(cc, lx - 3.8 * s, ly - 5 * s, 7.6 * s, 1.5 * s, SLATE); R(cc, lx - 3.8 * s, ly - 5 * s, 7.6 * s, 0.5, SLATE_LT);
  });
  part(c, (cc) => {
    // the door (the fire's glow in it) and a small window
    const dx = x - 3 * s;
    cc.fillStyle = "#1c1618";
    cc.beginPath(); cc.moveTo(dx - 3 * s, gy - 0.5); cc.lineTo(dx - 3 * s, gy - 5.5 * s); cc.quadraticCurveTo(dx, gy - 8 * s, dx + 3 * s, gy - 5.5 * s); cc.lineTo(dx + 3 * s, gy - 0.5); cc.closePath(); cc.fill();
    R(cc, dx - 2 * s, gy - 3 * s, 4 * s, 2.5 * s, "#7a3a20");
    R(cc, dx - 1.5 * s, gy - 2 * s, 3 * s, 1.5 * s, "#d8742c");
    R(cc, x + 6 * s, wTop + 2.5 * s, 3 * s, 2.5 * s, "#1c1618");
    R(cc, x + 6 * s, wTop + 4 * s, 3 * s, 1, "#a8522a");
  });
  part(c, (cc) => {
    // the stack, dressed stone, up past the roof; its east face in shade, a dark mouth
    const cx = x - w2 + 3.5 * s, cw = 5 * s, ct = wTop - rf - SALTHOUSE.stack * s;
    const SC = darken(RUBBLE, 0.12);
    ashlar(cc, cx - cw / 2, ct, cw, gy - ct, SC, 9);
    R(cc, cx + cw / 2, ct + 1, 1.5 * s, gy - ct - 2, darken(SC, 0.45));
    for (let k = 0; k < 6; k++) R(cc, cx - cw / 2 + hash(k, 5) * cw, ct + k * 0.5, cw * 0.4, 0.5, mix(SC, "#2a2426", 0.6 - k * 0.08));   // soot at the mouth
    R(cc, cx - cw / 2 - 0.5, ct - 1.5, cw + 1.5 * s + 1, 1.5, darken(SC, 0.25));
    R(cc, cx - cw / 2 + 0.5, ct - 1.5, cw - 1, 0.5, "#1c1618");
  });
  // casks of salt by the door, one open
  part(c, (cc) => keg(cc, x + 1.5 * s, gy + 2.5 * s, 0.75 * s, true));
  part(c, (cc) => keg(cc, x - w2 - 4 * s, gy + 1.5 * s, 0.8 * s));
  part(c, (cc) => sackL(cc, x + 8 * s, gy + 2.5 * s, 0.7 * s));
};
const saltHouse = (ctx, x, y, s, o) => {
  const sp = body(`salthouse|${s}`, Math.ceil(34 * s + 4), Math.ceil((SALTHOUSE.wh + SALTHOUSE.rf + SALTHOUSE.stack + 4) * s + 6), 12, (c, bx, by) => saltHouseBody(c, bx, by, s));
  stampBody(ctx, sp, x, y);
  const gy = y + 8, t = o.time, ph = (x * 0.13) % 1;
  const f = 0.5 + 0.5 * Math.sin(t * 9 + x) * Math.sin(t * 5.3);
  glow(ctx, x - 3 * s, gy - 2.5 * s, 4.5 * s, "#ff9a40", 0.14 + f * 0.1);
  ctx.fillStyle = f > 0.55 ? "#ffd070" : "#f0a040"; ctx.fillRect(ap(x - 3.5 * s), ap(gy - 1.5 * s), 1, 0.5);
  const cTop = gy - (SALTHOUSE.wh + SALTHOUSE.rf + SALTHOUSE.stack) * s - 2;
  smoke(ctx, x - SALTHOUSE.w2 * s + 3.5 * s, cTop, t, ph, s, "120,120,132", 0.42);
  smoke(ctx, x + 4 * s, gy - (SALTHOUSE.wh + SALTHOUSE.rf + 6) * s, t * 1.3, ph + 0.5, s * 0.75, "240,240,244", 0.36);
};

// Salt waiting for the carts. v: 0 a covered heap and casks, 1 a stack of
// sacks, 2 a barrow by a heap, 3 a row of casks, one open.
const saltStore = (ctx, x, y, s, o) => {
  const gy = y + 8, v = o.v % 4, sd = o.seed;
  shadow(ctx, x + 4 * s, gy + 0.5, 13 * s, 2.8 * s, 0.24);
  if (v === 0 || v === 2) {
    part(ctx, (c) => heap(c, x - 3 * s, gy, 7.5 * s));
    // a shovel stuck in the heap
    part(ctx, (c) => {
      c.strokeStyle = WOOD_LT; c.lineWidth = 0.9; c.lineCap = "round";
      c.beginPath(); c.moveTo(x - 1 * s, gy - 3 * s); c.lineTo(x + 2.5 * s, gy - 12 * s); c.stroke();
      R(c, x + 1.5 * s, gy - 12.5 * s, 2.5 * s, 0.8, WOOD_DK);
    });
  }
  if (v === 0) {
    // a hide thrown over the heap's far side against the weather
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(x - 9 * s, gy - 2 * s); c.quadraticCurveTo(x - 7 * s, gy - 8 * s, x - 3 * s, gy - 7.5 * s); c.lineTo(x - 5 * s, gy - 1 * s); c.closePath();
      c.fillStyle = darken(CANVAS, 0.25); c.fill(); R(c, x - 7.5 * s, gy - 6 * s, 1, 1, lighten(CANVAS, 0.1));
    });
    part(ctx, (c) => keg(c, x + 7 * s, gy, 0.8 * s));
    part(ctx, (c) => keg(c, x + 11 * s, gy + 1.5 * s, 0.75 * s, true));
  } else if (v === 1) {
    for (const [dx, dy] of [[-7, 0], [1, 0.5], [9, 0], [-3, -3.6], [5, -3.4], [1, -7]]) part(ctx, (c) => sackL(c, x + dx * s, gy + dy * s, s, (dx + dy) % 2 ? CANVAS : BURLAP));
  } else if (v === 2) {
    // a wheelbarrow of salt, its legs down
    part(ctx, (c) => {
      const bx = x + 8 * s;
      c.strokeStyle = WOOD_DK; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(bx - 2 * s, gy - 4 * s); c.lineTo(bx + 9 * s, gy - 2 * s); c.stroke();
      c.beginPath(); c.moveTo(bx + 1 * s, gy - 3 * s); c.lineTo(bx + 1.5 * s, gy); c.stroke();
      c.beginPath(); c.moveTo(bx - 6 * s, gy - 6 * s); c.lineTo(bx - 4 * s, gy - 1 * s); c.lineTo(bx + 3 * s, gy - 1.5 * s); c.lineTo(bx + 4 * s, gy - 6.5 * s); c.closePath();
      c.fillStyle = WOOD; c.fill();
      R(c, bx - 6 * s, gy - 6.5 * s, 10 * s, 0.5, WOOD_LT);
      ellipse(c, bx - 1 * s, gy - 6.6 * s, 4.6 * s, 1.6 * s); c.fillStyle = SALT; c.fill();
      R(c, bx - 1 * s, gy - 7.5 * s, 2 * s, 0.5, "#fffaf0");
      ellipse(c, bx - 6.5 * s, gy - 1.6 * s, 1.8 * s, 1.8 * s); c.fillStyle = WOOD_DK; c.fill();
    });
  } else {
    part(ctx, (c) => keg(c, x - 7 * s, gy - 1 * s, 0.9 * s));
    part(ctx, (c) => keg(c, x, gy, 0.9 * s, true));
    part(ctx, (c) => keg(c, x + 7 * s, gy + 1 * s, 0.9 * s));
    part(ctx, (c) => { cylinder(c, x - 3 * s, gy + 1 * s, 7 * s, 2.6 * s, "#8a6036", { r: 1 }); R(c, x - 1.5 * s, gy + 1 * s, 0.8, 2.6 * s, IRON); R(c, x + 2 * s, gy + 1 * s, 0.8, 2.6 * s, IRON); });
  }
  if (hash(sd, 3) > 0.5) tuft(ctx, x - 12 * s, gy + 1.5, 0.5, REALM.TUFT, REALM.GRASS_LT, sd, { n: 3 });
};

// A boat hauled up on the strand, lying with her bow to the east (the water
// side): clinker strakes, thwarts, oars. v: 0 upright with her oars, 1 keel-up
// and tarred, 2 with nets drying on poles, 3 her mast down and sail furled.
const hull = (c, cx, cy, L, Wd) => {
  c.beginPath();
  c.moveTo(cx - L, cy);
  c.quadraticCurveTo(cx - L * 0.55, cy - Wd, cx, cy - Wd);
  c.quadraticCurveTo(cx + L * 0.55, cy - Wd, cx + L, cy - Wd * 0.15);
  c.quadraticCurveTo(cx + L * 0.55, cy + Wd, cx, cy + Wd);
  c.quadraticCurveTo(cx - L * 0.55, cy + Wd, cx - L, cy);
  c.closePath();
};
const beachedBoat = (ctx, x, y, s, o) => {
  const gy = y + 8, v = o.v % 4, sd = o.seed;
  const cx = x + 10 * s, cy = gy - 2.5 * s, L = 8.5 * s, Wd = 3.4 * s;
  shadow(ctx, cx + 3 * s, gy + 1, 16 * s, 3.4 * s, 0.26);
  if (v === 2) {
    // two poles and a net slung between them, cork floats along its head
    part(ctx, (c) => {
      for (const px of [x - 4 * s, x + 22 * s]) cylinder(c, px - 0.6, gy - 16 * s, 1.2, 15 * s, WOOD_DK, { r: 0.4 });
      c.strokeStyle = "#5a5246"; c.lineWidth = 0.6;
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x - 4 * s, gy - 15 * s + k * 2.5 * s); c.quadraticCurveTo(x + 9 * s, gy - 10 * s + k * 2.5 * s, x + 22 * s, gy - 15 * s + k * 2.5 * s); c.stroke(); }
      for (let k = 0; k <= 10; k++) { const t = k / 10, px = x - 4 * s + t * 26 * s, sag = Math.sin(t * Math.PI) * 5 * s; c.beginPath(); c.moveTo(px, gy - 15 * s + sag); c.lineTo(px + 0.5, gy - 7.5 * s + sag); c.stroke(); }
      for (let k = 1; k < 10; k += 2) { const t = k / 10; R(c, x - 4 * s + t * 26 * s - 0.5, gy - 15.5 * s + Math.sin(t * Math.PI) * 5 * s, 1, 1, "#c8a060"); }
    });
  }
  if (v === 1) {
    part(ctx, (c) => {
      hull(c, cx, cy, L, Wd);
      c.fillStyle = lin(c, 0, cy - Wd, 0, cy + Wd, [[0, lighten(TAR, 0.25)], [0.45, TAR], [1, darken(TAR, 0.35)]]); c.fill();
      c.save(); c.clip();
      for (const k of [-0.55, 0.4]) { c.strokeStyle = darken(TAR, 0.4); c.lineWidth = 0.5; c.beginPath(); c.moveTo(cx - L, cy + k * Wd * 0.3); c.quadraticCurveTo(cx, cy + k * Wd * 1.6, cx + L, cy - Wd * 0.15 + k * Wd * 0.3); c.stroke(); }
      R(c, cx - L, cy - 0.5, L * 2, 1, lighten(TAR, 0.4));        // the keel, lit
      c.restore();
      R(c, cx - L - 1, cy - 1, 1.5, 2.5 * s, WOOD_DK); R(c, cx + L - 1, cy - 1.5, 1.5, 2.5 * s, WOOD_DK);   // the props under her gunwale
    });
  } else {
    part(ctx, (c) => {
      // her side (south strakes) below the gunwale, then the gunwale and her inside
      c.save(); c.translate(0, 2 * s); hull(c, cx, cy, L, Wd); c.restore();
      c.fillStyle = darken(WOOD, 0.25); c.fill();
      hull(c, cx, cy, L, Wd); c.fillStyle = WOOD_LT; c.fill();
      c.save(); hull(c, cx, cy, L * 0.9, Wd * 0.72); c.clip();
      c.fillStyle = lin(c, 0, cy - Wd, 0, cy + Wd, [[0, darken(WOOD, 0.35)], [0.5, WOOD], [1, lighten(WOOD, 0.1)]]); c.fillRect(cx - L, cy - Wd, L * 2, Wd * 2);
      for (const k of [-0.4, 0, 0.4]) R(c, cx - L, cy + k * Wd * 1.2, L * 2, 0.5, darken(WOOD, 0.4));
      for (const t of [-0.45, 0.05, 0.5]) { R(c, cx + t * L - 0.75, cy - Wd, 1.5, Wd * 2, WOOD_LT); R(c, cx + t * L + 0.75, cy - Wd, 0.5, Wd * 2, WOOD_DK); }
      c.restore();
      for (let k = -2; k <= 2; k++) R(c, cx + k * L * 0.4, cy + Wd * 0.75 + 0.5, 0.5, 1.5 * s, darken(WOOD, 0.5));   // strake lands
      R(c, cx - L * 0.6, cy - Wd + 0.5, L * 1.2, 0.5, lighten(WOOD_LT, 0.3));
    });
    if (v === 0) {
      part(ctx, (c) => {
        c.strokeStyle = WOOD_LT; c.lineWidth = 0.9; c.lineCap = "round";
        for (const k of [-1, 1]) { c.beginPath(); c.moveTo(cx - L * 0.8, cy + k * 0.8); c.lineTo(cx + L * 0.75, cy + k * 1.6 - 1.5); c.stroke(); }
        R(c, cx + L * 0.55, cy - 2, 3 * s, 1.5, WOOD); R(c, cx + L * 0.55, cy + 0.5, 3 * s, 1.5, WOOD);
      });
    } else if (v === 3) {
      part(ctx, (c) => {
        cylinder(c, cx - L * 1.1, cy - 1, L * 2.1, 1.4, WOOD_DK, { r: 0.6 });
        roundRect(c, cx - L * 0.8, cy - 2.5, L * 1.4, 2.6, 1.2);
        c.fillStyle = lin(c, 0, cy - 2.5, 0, cy, [[0, OX_LT], [0.5, OX], [1, OX_DK]]); c.fill();
        for (let k = 0; k < 4; k++) R(c, cx - L * 0.6 + k * L * 0.35, cy - 2.5, 0.5, 2.6, OX_DK);
      });
    }
  }
  // stones and a hank of weed at her foot
  stone(ctx, cx - L - 2 * s, gy + 0.5, 1.4 * s, 1 * s, GRIT);
  stone(ctx, cx + L * 0.4, gy + 1.5, 1.2 * s, 0.9 * s, lighten(GRIT, 0.1));
  ctx.fillStyle = "#4e5a34"; ctx.fillRect(ap(cx + L * 0.7), ap(gy + 0.5), 3, 0.5); ctx.fillRect(ap(cx + L * 0.75), ap(gy), 1.5, 0.5);
  if (hash(sd, 2) > 0.5) tuft(ctx, x - 2 * s, gy + 1, 0.5, REALM.TUFT, REALM.GRASS_LT, sd, { n: 3 });
};

// The bones of a ship the dyke-men broke up long ago, heeled over on her
// landward side and half sunk in the sand at the water's edge: the keel runs
// along the beach at a slant (south-west to north-east), her seaward frames
// curve up out of the sand and lean over toward the land, a run of strakes
// still on at the stern, the stem post up at the north-east end in the wash,
// weed and foam round her, and her broken mast lying on the sand beside.
// Laid north of its footing (the keel 9-25 above its feet), so the footprint
// stays on the grass and the bones lie on the sand. Baked flat: each timber is
// an inked part, the drifted sand and the foam are not.
const wreck = (ctx, x, y, s, o) => {
  const sd = o.seed;
  const DW = "#7e7268", DW_LT = "#b0a494", DW_DK = "#4e4442";
  const ax = x - 15 * s, ay = y - 14 * s, bx = x + 21 * s, by = y - 31 * s;          // the keel's ends
  const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
  const sx = uy, sy = -ux;                                                           // toward the sea (up-left of the keel)
  const K = (t) => [ax + (bx - ax) * t, ay + (by - ay) * t];
  // the wash round her seaward side, foam caught on the timbers (under the ink's alpha)
  for (let i = 0; i < 16; i++) {
    const t = hash(sd, i + 400), [kx, ky] = K(t), off = (7 + hash(sd, i + 420) * 6) * s;
    ctx.fillStyle = `rgba(240,244,246,${0.18 + hash(sd, i + 440) * 0.18})`;
    ctx.fillRect(ap(kx + sx * off), ap(ky + sy * off), ap(2 + hash(sd, i + 460) * 3), 0.5);
  }
  shadow(ctx, x + 6 * s, y - 18 * s, 20 * s, 7 * s, 0.18);
  // the landward frames: stubs, mostly buried
  part(ctx, (c) => {
    c.strokeStyle = DW_DK; c.lineWidth = 1.4 * s; c.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const t = 0.08 + i * 0.13, [kx, ky] = K(t), l = (1.5 + hash(sd, i + 30) * 2) * s;
      c.beginPath(); c.moveTo(kx, ky); c.quadraticCurveTo(kx - sx * l, ky - sy * l + 1, kx - sx * l * 1.4 + ux * 0.5, ky - sy * l * 1.4 - 1.5 * s); c.stroke();
    }
  });
  // the keel
  part(ctx, (c) => {
    c.strokeStyle = DW_DK; c.lineWidth = 2.2 * s; c.lineCap = "round";
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    c.strokeStyle = DW; c.lineWidth = 1.2 * s; c.beginPath(); c.moveTo(ax, ay - 0.5); c.lineTo(bx, by - 0.5); c.stroke();
  });
  // the seaward frames, out from the keel and up, leaning over toward the land
  const frames = [];
  for (let i = 0; i < 7; i++) {
    const t = 0.1 + i * 0.13, [kx, ky] = K(t), taper = Math.sin(Math.min(1, t * 1.15) * Math.PI);
    const w = (4 + taper * 4) * s, h = (4 + taper * 8 - hash(sd, i) * 3) * s, broken = hash(sd, i + 50) < 0.3;
    const c1 = [kx + sx * w * 1.1, ky + sy * w * 1.1 + 1];
    const e = [kx + sx * w * 0.7 - sx * h * 0.15 + ux * 1.2 * s, ky + sy * w * 0.4 - h * (broken ? 0.55 : 1)];
    frames.push({ k: [kx, ky], c1, e, broken });
  }
  for (let i = frames.length - 1; i >= 0; i--) {
    const f = frames[i];
    part(ctx, (c) => {
      c.lineCap = "round";
      c.strokeStyle = i % 2 ? DW : lighten(DW, 0.08); c.lineWidth = 1.7 * s;
      c.beginPath(); c.moveTo(f.k[0], f.k[1]); c.quadraticCurveTo(f.c1[0], f.c1[1], f.e[0], f.e[1]); c.stroke();
      c.strokeStyle = DW_LT; c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(f.k[0] - 0.5, f.k[1] - 0.5); c.quadraticCurveTo(f.c1[0] - 0.5, f.c1[1] - 0.5, f.e[0] - 0.5, f.e[1] - 0.5); c.stroke();
      if (f.broken) R(c, f.e[0] - 0.5, f.e[1] - 1, 1.5, 1, DW_LT);       // a splintered head
    });
  }
  // strakes still fast to the first frames at her stern: planks along the hull
  part(ctx, (c) => {
    for (let k = 0; k < 3; k++) {
      const q = 0.35 + k * 0.22, pt = (f) => [f.k[0] + (f.e[0] - f.k[0]) * q + (f.c1[0] - f.k[0]) * q * (1 - q) * 1.2, f.k[1] + (f.e[1] - f.k[1]) * q + (f.c1[1] - f.k[1]) * q * (1 - q) * 1.2];
      const n = k === 2 ? 2 : 3;
      c.strokeStyle = k % 2 ? DW : lighten(DW, 0.14); c.lineWidth = 1.5 * s; c.lineCap = "butt";
      c.beginPath(); for (let i = 0; i <= n; i++) { const [px, py] = pt(frames[i]); if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke();
    }
  });
  // the stem post, raking up out of the wash at the sea end
  part(ctx, (c) => {
    c.strokeStyle = DW; c.lineWidth = 2 * s; c.lineCap = "round";
    c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + 2 * s, by - 5 * s, bx + 1 * s, by - 11 * s); c.stroke();
    c.strokeStyle = DW_LT; c.lineWidth = 0.5; c.beginPath(); c.moveTo(bx - 0.6 * s, by); c.quadraticCurveTo(bx + 1.4 * s, by - 5 * s, bx + 0.4 * s, by - 11 * s); c.stroke();
  });
  // drifted sand over her landward side and the keel's roots (no ink: it is the beach)
  for (let i = 0; i < 9; i++) {
    const t = i / 8, [kx, ky] = K(t), r = (2.2 + hash(sd, i + 70) * 1.8) * s;
    const mx = kx - sx * 1.5 * s, my = ky - sy * 1.5 * s + 1;
    ctx.fillStyle = darken(SAND, 0.07); ctx.beginPath(); ctx.ellipse(mx + 0.5, my + 0.5, r, r * 0.4, Math.atan2(uy, ux), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = mix(SAND, "#b0a68a", hash(sd, i + 90) * 0.6); ctx.beginPath(); ctx.ellipse(mx, my, r * 0.85, r * 0.32, Math.atan2(uy, ux), 0, Math.PI * 2); ctx.fill();
  }
  // weed at the roots
  for (let i = 0; i < 7; i++) {
    const [kx, ky] = K(0.1 + i * 0.13);
    ctx.fillStyle = i % 2 ? "#4e5a34" : "#3e4a2c"; ctx.fillRect(ap(kx + sx * 2 * s), ap(ky + sy * 2 * s), 2, 0.5); ctx.fillRect(ap(kx + sx * 2.5 * s + 1), ap(ky + sy * 2.5 * s - 0.5), 1, 0.5);
  }
  // her mast, broken off and lying on the sand landward of her, a yard across it and a hank of rope
  part(ctx, (c) => {
    const m0 = [ax + 4 * s + uy * -7 * s, ay + 8 * s], m1 = [ax + 30 * s, ay - 3 * s];
    c.strokeStyle = DW_DK; c.lineWidth = 2.6 * s; c.lineCap = "butt";
    c.beginPath(); c.moveTo(m0[0], m0[1]); c.lineTo(m1[0], m1[1]); c.stroke();
    c.strokeStyle = DW; c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(m0[0], m0[1] - 0.5); c.lineTo(m1[0], m1[1] - 0.5); c.stroke();
    c.strokeStyle = DW_LT; c.lineWidth = 0.5; c.beginPath(); c.moveTo(m0[0], m0[1] - 1.2); c.lineTo(m1[0], m1[1] - 1.2); c.stroke();
    // the splintered stump end
    c.fillStyle = DW_LT; c.beginPath(); c.moveTo(m1[0], m1[1] - 1.5 * s); c.lineTo(m1[0] + 2.5 * s, m1[1] - 0.5 * s); c.lineTo(m1[0] + 1 * s, m1[1]); c.lineTo(m1[0] + 2 * s, m1[1] + 1 * s); c.lineTo(m1[0], m1[1] + 1.3 * s); c.closePath(); c.fill();
    R(c, m0[0] + 7 * s, m0[1] - 2.6 * s, 0.8, 1.6 * s, IRON);    // a mast band
  });
  part(ctx, (c) => {
    const yx = ax + 14 * s, yy = ay + 6 * s;
    c.strokeStyle = DW; c.lineWidth = 1.2 * s; c.lineCap = "round";
    c.beginPath(); c.moveTo(yx - 9 * s, yy + 5.5 * s); c.lineTo(yx + 7 * s, yy - 0.5 * s); c.stroke();   // the yard, fallen alongside
    c.strokeStyle = "#a89676"; c.lineWidth = 0.5; c.beginPath(); c.arc(yx + 6 * s, yy + 2 * s, 1.6 * s, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(yx + 4.5 * s, yy + 2 * s); c.quadraticCurveTo(yx + 2 * s, yy + 4 * s, yx - 1 * s, yy + 2.5 * s); c.stroke();
  });
  stone(ctx, x + 18 * s, y + 3 * s, 1.5 * s, 1 * s, GRIT);
};

// ---- Warden Moor: the drill yard -----------------------------------------------
// The quintain: a post on a cross of sleepers, the arm pivoting on its iron
// cap, a shield to strike at one end and a sandbag at the other. Live: the arm
// still turns a little after the last tilt, the bag swinging under it.
const quintainBody = (c, x, y, s) => {
  const gy = y + 8;
  shadow(c, x + 6 * s, gy + 0.5, 12 * s, 3 * s, 0.26);
  part(c, (cc) => {
    R(cc, x - 8 * s, gy - 1.5 * s, 16 * s, 2 * s, WOOD_DK); R(cc, x - 8 * s, gy - 1.5 * s, 16 * s, 0.5, WOOD);
    R(cc, x - 2 * s, gy - 4.5 * s, 4 * s, 5.5 * s, WOOD);
  });
  part(c, (cc) => {
    cylinder(cc, x - 1.3 * s, gy - 22 * s, 2.6 * s, 21 * s, WOOD, { r: 0.8, hi: 0.35 });
    R(cc, x - 1.6 * s, gy - 23 * s, 3.2 * s, 2 * s, IRON); R(cc, x - 1.6 * s, gy - 23 * s, 3.2 * s, 0.5, STEEL);
  });
  // broken lances at its foot
  part(c, (cc) => {
    cc.strokeStyle = WOOD_LT; cc.lineWidth = 1; cc.lineCap = "round";
    cc.beginPath(); cc.moveTo(x + 4 * s, gy + 2); cc.lineTo(x + 13 * s, gy - 1); cc.stroke();
    cc.beginPath(); cc.moveTo(x + 6 * s, gy + 3); cc.lineTo(x + 11 * s, gy + 3.5); cc.stroke();
    R(cc, x + 12.5 * s, gy - 1.5, 1.5, 1, "#e8dcc0");
  });
};
const quintain = (ctx, x, y, s, o) => {
  const sp = body(`quintain|${s}`, Math.ceil(16 * s + 4), Math.ceil(26 * s + 4), 10, (c, bx, by) => quintainBody(c, bx, by, s));
  stampBody(ctx, sp, x, y);
  const gy = y + 8, t = o.time, py = gy - 22.5 * s;
  const a = 0.35 + 0.22 * Math.sin(t * 0.55 + x * 0.1) + 0.06 * Math.sin(t * 1.7);
  const La = 11 * s, ex = Math.cos(a) * La, ey = Math.sin(a) * La * 0.42;
  const shieldEnd = [x + ex, py + ey], bagEnd = [x - ex, py - ey];
  const sw = 0.18 * Math.sin(t * 1.9 + x);
  const drawBag = () => {
    const [bx, by] = bagEnd, hx = bx + sw * 6 * s, hy = by + 6 * s;
    ctx.fillStyle = IRON; for (let k = 1; k < 5; k++) ctx.fillRect(ap(bx + (hx - bx) * k / 5), ap(by + (hy - by) * k / 5), 0.5, 0.5);
    ctx.fillStyle = INK; ctx.fillRect(ap(hx - 2 * s) - 0.5, ap(hy) - 0.5, ap(4 * s) + 1, ap(4.5 * s) + 1);
    ctx.fillStyle = BURLAP; ctx.fillRect(ap(hx - 2 * s), ap(hy), ap(4 * s), ap(4.5 * s));
    ctx.fillStyle = lighten(BURLAP, 0.3); ctx.fillRect(ap(hx - 2 * s), ap(hy), 1, ap(4 * s));
    ctx.fillStyle = darken(BURLAP, 0.35); ctx.fillRect(ap(hx + 2 * s) - 0.5, ap(hy + 0.5), 0.5, ap(4 * s));
    ctx.fillStyle = WOOD_DK; ctx.fillRect(ap(hx - 1 * s), ap(hy), ap(2 * s), 0.5);
  };
  const drawShield = () => {
    const [sx, sy] = shieldEnd, w = Math.max(1.5, ap(5 * s * Math.abs(Math.sin(a + 0.25)) + 1)), h = ap(6.5 * s);
    ctx.fillStyle = INK; ctx.fillRect(ap(sx - w / 2) - 0.5, ap(sy - 1) - 0.5, w + 1, h + 1);
    ctx.fillStyle = OX; ctx.fillRect(ap(sx - w / 2), ap(sy - 1), w, h);
    ctx.fillStyle = OX_LT; ctx.fillRect(ap(sx - w / 2), ap(sy - 1), 0.5, h);
    ctx.fillStyle = OX_DK; ctx.fillRect(ap(sx + w / 2) - 0.5, ap(sy - 1), 0.5, h);
    ctx.fillStyle = "#e4d8bc"; ctx.fillRect(ap(sx - Math.min(w / 2 - 0.5, 1.5)), ap(sy + h * 0.3), ap(Math.min(w - 1, 3)), ap(1.5 * s)); 
    ctx.fillStyle = IRON; ctx.fillRect(ap(sx - w / 2), ap(sy - 1), w, 0.5);
  };
  // whichever end swings toward us is drawn last
  if (ey > 0) { drawBag(); bar(ctx, bagEnd[0], bagEnd[1], shieldEnd[0], shieldEnd[1], 1.5, WOOD, WOOD_LT); drawShield(); }
  else { drawShield(); bar(ctx, shieldEnd[0], shieldEnd[1], bagEnd[0], bagEnd[1], 1.5, WOOD, WOOD_LT); drawBag(); }
  ctx.fillStyle = INK; ctx.fillRect(ap(x - 1.5), ap(py - 1.5), 3, 2.5);
  ctx.fillStyle = STEEL; ctx.fillRect(ap(x - 1), ap(py - 1), 2, 1.5);
};

// Practice men. v: 0 a straw man on a cross, an oxblood rag for a sash; 1 a
// pell, a hacked post with chips at its foot and a wooden sword against it;
// 2 a straw man in an old kettle hat and tabard; 3 one leaning, shot full of arrows.
const dummy = (ctx, x, y, s, o) => {
  const gy = y + 8, v = o.v % 4, sd = o.seed;
  shadow(ctx, x + 4 * s, gy + 0.5, 7 * s, 2.2 * s, 0.26);
  if (v === 1) {
    part(ctx, (c) => {
      cylinder(c, x - 2 * s, gy - 14 * s, 4 * s, 14 * s, WOOD, { r: 1.2, hi: 0.35 });
      for (let k = 0; k < 6; k++) {
        const ny = gy - 4 * s - k * 1.7 * s - hash(sd, k) * s;
        R(c, x - 2 * s + hash(sd, k + 9) * 1.5 * s, ny, 2 * s, 0.5, WOOD_DK);
        R(c, x - 2 * s + hash(sd, k + 9) * 1.5 * s, ny + 0.5, 2 * s, 0.5, WOOD_LT);
      }
      ellipse(c, x, gy - 14 * s, 2 * s, 0.8 * s); c.fillStyle = WOOD_LT; c.fill();
    });
    part(ctx, (c) => {
      c.strokeStyle = WOOD_LT; c.lineWidth = 1; c.lineCap = "round";
      c.beginPath(); c.moveTo(x + 3 * s, gy); c.lineTo(x + 5 * s, gy - 9 * s); c.stroke();
      R(c, x + 3 * s, gy - 2.5 * s, 3.5 * s, 0.8, WOOD_DK);
    });
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? WOOD_LT : "#c8a878"; ctx.fillRect(ap(x - 5 * s + hash(sd, i + 20) * 10 * s), ap(gy + hash(sd, i + 30) * 2.5), 1, 0.5); }
    return;
  }
  ctx.save();
  if (v === 3) { ctx.translate(x, gy); ctx.rotate(0.16); ctx.translate(-x, -gy); }
  part(ctx, (c) => cylinder(c, x - 0.8 * s, gy - 15 * s, 1.6 * s, 15 * s, WOOD_DK, { r: 0.5 }));
  part(ctx, (c) => {
    // the arms: a crossbar, straw bursting from its ends
    R(c, x - 6.5 * s, gy - 13.5 * s, 13 * s, 1.5 * s, WOOD); R(c, x - 6.5 * s, gy - 13.5 * s, 13 * s, 0.5, WOOD_LT);
    for (const k of [-1, 1]) for (let j = 0; j < 3; j++) R(c, x + k * (6.5 * s + 0.5) - (k < 0 ? 1 : 0), gy - 14 * s + j * 0.8, 1, 0.5, j % 2 ? STRAW : STRAW_LT);
  });
  part(ctx, (c) => {
    // the body: a straw-stuffed sack bound at the waist
    roundRect(c, x - 3.6 * s, gy - 14 * s, 7.2 * s, 8.5 * s, 2 * s);
    c.fillStyle = lin(c, x - 3.6 * s, 0, x + 3.6 * s, 0, [[0, lighten(BURLAP, 0.25)], [0.5, BURLAP], [1, darken(BURLAP, 0.3)]]); c.fill();
    if (v === 2) {
      roundRect(c, x - 3.8 * s, gy - 13.5 * s, 7.6 * s, 7.5 * s, 1.5 * s);
      c.fillStyle = lin(c, x - 3.6 * s, 0, x + 3.6 * s, 0, [[0, OX_LT], [0.5, OX], [1, OX_DK]]); c.fill();
      device(c, x, gy - 12 * s, 0.6 * s);
    } else {
      c.strokeStyle = OX; c.lineWidth = 1.2 * s;
      c.beginPath(); c.moveTo(x - 3.2 * s, gy - 13 * s); c.lineTo(x + 3.2 * s, gy - 8 * s); c.stroke();
    }
    R(c, x - 3.6 * s, gy - 8.5 * s, 7.2 * s, 0.8, STRAW_DK);
    for (let j = 0; j < 4; j++) R(c, x - 2.5 * s + j * 1.6 * s, gy - 6 * s, 0.5, 1 + (j % 2) * 0.5, STRAW_LT);
  });
  part(ctx, (c) => {
    // the head: a straw bundle tied off at the neck
    ball(c, x, gy - 16.2 * s, 2.5 * s, 2.3 * s, STRAW, { hi: 0.4, lo: 0.4 });
    R(c, x - 1.2 * s, gy - 14.2 * s, 2.4 * s, 0.5, WOOD_DK);
    if (v === 2) {
      ellipse(c, x, gy - 17 * s, 3.8 * s, 1.2 * s); c.fillStyle = STEEL_DK; c.fill();
      ball(c, x, gy - 17.8 * s, 2.5 * s, 1.8 * s, STEEL, { hi: 0.5, lo: 0.4 });
    } else {
      R(c, x - 1 * s, gy - 18.6 * s, 0.5, 1, STRAW_LT); R(c, x + 0.5 * s, gy - 18.8 * s, 0.5, 1, STRAW_LT);
    }
  });
  if (v === 3) {
    part(ctx, (c) => {
      for (const [ax, ay, dx] of [[-1.5, -11, 3], [1.5, -9, 3.5], [0, -16, 2.5]]) {
        c.strokeStyle = WOOD_LT; c.lineWidth = 0.6;
        c.beginPath(); c.moveTo(x + ax * s, gy + ay * s); c.lineTo(x + (ax + dx) * s, gy + (ay + 1.6) * s); c.stroke();
        R(c, x + (ax + dx) * s - 0.5, gy + (ay + 1.2) * s, 1.5, 1, "#ece4d0");
      }
    });
  }
  ctx.restore();
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? STRAW : STRAW_DK; ctx.fillRect(ap(x - 4 * s + hash(sd, i + 40) * 8 * s), ap(gy + 0.5 + hash(sd, i + 44) * 2), 1, 0.5); }
};

// Archery butts: two straw bosses on a trestle against a turf bank, their
// faces cream and oxblood with a gold clout, arrows in them, a sheaf on a stake.
const butts = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed;
  shadow(ctx, x + 6 * s, gy + 0.5, 20 * s, 3.6 * s, 0.26);
  // the turf bank behind
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(x - 19 * s, gy - 1 * s); c.lineTo(x - 16 * s, gy - 12 * s); c.lineTo(x + 15 * s, gy - 12 * s); c.lineTo(x + 19 * s, gy - 1 * s); c.closePath();
    c.fillStyle = mix(CLAY_DK, REALM.GRASS_DK, 0.35); c.fill();
    c.beginPath(); c.moveTo(x - 16.5 * s, gy - 10 * s); c.lineTo(x - 15 * s, gy - 14 * s); c.lineTo(x + 14 * s, gy - 14 * s); c.lineTo(x + 16 * s, gy - 10 * s); c.closePath();
    c.fillStyle = lin(c, 0, gy - 14 * s, 0, gy - 10 * s, [[0, REALM.GRASS_LT], [0.5, REALM.GRASS], [1, REALM.GRASS_DK]]); c.fill();
    for (let i = 0; i < 12; i++) R(c, x - 15 * s + hash(sd, i) * 30 * s, gy - 9 * s + hash(sd, i + 9) * 7 * s, 1.5, 0.5, i % 2 ? CLAY_DK : mix(CLAY, REALM.GRASS_DK, 0.4));
    for (let i = 0; i < 9; i++) R(c, x - 15 * s + hash(sd, i + 50) * 30 * s, gy - 10.5 * s + (i % 2) * 0.5, 1, 1, REALM.GRASS_DK);
  });
  const boss = (c, bx, by, r) => {
    // the trestle's legs, the boss's straw rim, its painted face
    c.strokeStyle = WOOD_DK; c.lineWidth = 1;
    c.beginPath(); c.moveTo(bx - r * 0.7, gy); c.lineTo(bx - r * 0.2, by); c.moveTo(bx + r * 0.7, gy); c.lineTo(bx + r * 0.2, by); c.stroke();
    ellipse(c, bx, by, r, r * 0.92); c.fillStyle = STRAW; c.fill();
    R(c, bx - r * 0.7, by - r * 0.8, r * 0.6, 0.5, STRAW_LT);
    ellipse(c, bx, by, r * 0.8, r * 0.74); c.fillStyle = "#e8dcc0"; c.fill();
    ellipse(c, bx, by, r * 0.62, r * 0.57); c.fillStyle = OX; c.fill();
    ellipse(c, bx, by, r * 0.42, r * 0.39); c.fillStyle = "#e8dcc0"; c.fill();
    ellipse(c, bx, by, r * 0.22, r * 0.2); c.fillStyle = BRASS; c.fill();
    R(c, bx + r * 0.55, by - r * 0.3, 0.5, r * 0.8, darken(STRAW, 0.35));
  };
  for (const [dx, k] of [[-7, 0], [7, 1]]) {
    part(ctx, (c) => boss(c, x + dx * s, gy - 7 * s, 5 * s));
    part(ctx, (c) => {
      for (let i = 0; i < 3; i++) {
        const ax = x + dx * s + (hash(sd, i + k * 10 + 20) - 0.5) * 6 * s, ay = gy - 7 * s + (hash(sd, i + k * 10 + 30) - 0.5) * 5 * s;
        c.strokeStyle = WOOD_LT; c.lineWidth = 0.6;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 2 * s, ay + 2.5 * s); c.stroke();
        R(c, ax + 1.5 * s, ay + 2 * s, 1, 1, i % 2 ? OX_LT : "#ece4d0");
      }
    });
  }
  // a sheaf of arrows at the end of the line
  part(ctx, (c) => {
    const qx = x + 16 * s;
    cylinder(c, qx - 0.6, gy - 9 * s, 1.2, 9 * s, WOOD_DK, { r: 0.4 });
    roundRect(c, qx - 1.5 * s, gy - 9 * s, 3 * s, 5 * s, 1); c.fillStyle = "#6a4a30"; c.fill();
    for (let k = 0; k < 4; k++) R(c, qx - 1.5 * s + k * 0.9 * s, gy - 11 * s - (k % 2) * 0.5, 0.5, 2 * s, k % 2 ? "#ece4d0" : OX_LT);
  });
};

// A weapons rack: two splayed trestles and a rail, spears leaning on it,
// swords hung by their guards, a round oxblood shield on one end, a kettle hat
// on the other's post.
const rack = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed, rt = gy - 11 * s;
  shadow(ctx, x + 6 * s, gy + 0.5, 16 * s, 3 * s, 0.26);
  part(ctx, (c) => {
    c.strokeStyle = WOOD_DK; c.lineWidth = 1.2 * s; c.lineCap = "round";
    for (const ex of [-10, 10]) { c.beginPath(); c.moveTo(x + (ex - 2.5) * s, gy); c.lineTo(x + ex * s, rt - 1.5 * s); c.lineTo(x + (ex + 2.5) * s, gy); c.stroke(); }
  });
  // spears leaning on the rail from behind
  part(ctx, (c) => {
    for (let i = 0; i < 6; i++) {
      const fx = x - 8 * s + i * 3.2 * s, tx = fx + 2.5 * s, ty = gy - 24 * s - hash(sd, i) * 2 * s;
      c.strokeStyle = i % 2 ? WOOD : WOOD_LT; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(fx - 1.5 * s, gy - 1); c.lineTo(tx, ty + 3 * s); c.stroke();
      c.fillStyle = STEEL_LT; c.beginPath(); c.moveTo(tx - 0.8 * s, ty + 3 * s); c.lineTo(tx + 0.2, ty); c.lineTo(tx + 0.8 * s, ty + 3 * s); c.fill();
    }
  });
  part(ctx, (c) => {
    cylinder(c, x - 11 * s, rt - 1, 22 * s, 1.8 * s, WOOD, { r: 0.6, hi: 0.35 });
    R(c, x - 11 * s, rt - 1, 22 * s, 0.5, WOOD_LT);
    cylinder(c, x - 11 * s, gy - 4 * s, 22 * s, 1.4 * s, WOOD_DK, { r: 0.5 });
  });
  // swords hung by their guards from the rail
  part(ctx, (c) => {
    for (const sx of [-4, 0, 4]) {
      const bx = x + sx * s + hash(sd, sx + 9) * s;
      R(c, bx - 0.5, rt + 0.5, 1, 8 * s, STEEL_LT); R(c, bx, rt + 0.5, 0.5, 8 * s, STEEL);
      R(c, bx - 1.5 * s, rt, 3 * s, 0.8, BRASS); R(c, bx - 0.5, rt - 2.5 * s, 1, 2.5 * s, WOOD_DK);
    }
  });
  // the shield on the west end, the hat on the east post
  part(ctx, (c) => {
    const sx = x - 11 * s, sy = rt + 2 * s;
    ellipse(c, sx, sy, 4 * s, 4 * s); c.fillStyle = IRON; c.fill();
    ellipse(c, sx, sy, 3.3 * s, 3.3 * s); c.fillStyle = lin(c, sx - 3 * s, 0, sx + 3 * s, 0, [[0, OX_LT], [0.5, OX], [1, OX_DK]]); c.fill();
    device(c, sx, sy - 2.3 * s, 0.55 * s);
  });
  part(ctx, (c) => {
    const hx = x + 10 * s, hy = rt - 2 * s;
    ellipse(c, hx, hy + 0.5, 3.6 * s, 1.1 * s); c.fillStyle = STEEL_DK; c.fill();
    ball(c, hx, hy - 0.5 * s, 2.4 * s, 1.8 * s, STEEL, { hi: 0.5, lo: 0.4 });
  });
  brackenFan(ctx, x + 14 * s, gy + 2, 0.5 * s, sd + 3);
};

// The muster post: a tall post with a tally board nailed on and a brass horn
// hung from its arm, a drum at its foot on a stand.
const muster = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed;
  shadow(ctx, x + 5 * s, gy + 0.5, 10 * s, 2.6 * s, 0.26);
  part(ctx, (c) => {
    cylinder(c, x - 1.2 * s, gy - 26 * s, 2.4 * s, 26 * s, WOOD_DK, { r: 0.8, hi: 0.35 });
    R(c, x - 1.2 * s, gy - 23 * s, 9 * s, 1.5 * s, WOOD); R(c, x - 1.2 * s, gy - 23 * s, 9 * s, 0.5, WOOD_LT);
    ball(c, x, gy - 26.5 * s, 1.4 * s, 1.2 * s, BRASS, { hi: 0.5, lo: 0.3 });
  });
  part(ctx, (c) => {
    // the tally board: notches in rows
    R(c, x - 3.5 * s, gy - 17 * s, 7 * s, 7 * s, "#8a6a44"); R(c, x - 3.5 * s, gy - 17 * s, 7 * s, 0.5, "#a8865a");
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4 + (r % 2); k++) R(c, x - 2.5 * s + k * 1.2 * s, gy - 15.5 * s + r * 2 * s, 0.5, 1.2 * s, "#3a2a20");
    R(c, x - 2.6 * s, gy - 15 * s, 5 * s, 0.5, "#3a2a20");
  });
  part(ctx, (c) => {
    // the horn on its cord, hung from the arm
    const hx = x + 6 * s;
    c.strokeStyle = "#5a4232"; c.lineWidth = 0.5; c.beginPath(); c.moveTo(hx, gy - 21.5 * s); c.lineTo(hx - 1 * s, gy - 17 * s); c.lineTo(hx + 2 * s, gy - 17.5 * s); c.stroke();
    c.beginPath(); c.moveTo(hx - 3 * s, gy - 16 * s); c.quadraticCurveTo(hx, gy - 14 * s, hx + 3.5 * s, gy - 17.5 * s); c.lineTo(hx + 3.5 * s, gy - 15 * s); c.quadraticCurveTo(hx, gy - 12 * s, hx - 3 * s, gy - 15 * s); c.closePath();
    c.fillStyle = lin(c, 0, gy - 17 * s, 0, gy - 13 * s, [[0, lighten(BRASS, 0.4)], [0.5, BRASS], [1, darken(BRASS, 0.35)]]); c.fill();
  });
  part(ctx, (c) => {
    // the drum: oxblood shell, cream head, cords zigzagging round
    const dx = x + 5 * s, dt = gy - 7 * s;
    c.strokeStyle = WOOD_DK; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(dx - 3 * s, gy); c.lineTo(dx + 2 * s, dt + 4 * s); c.moveTo(dx + 3 * s, gy); c.lineTo(dx - 2 * s, dt + 4 * s); c.stroke();
    cylinder(c, dx - 3.5 * s, dt, 7 * s, 5 * s, OX, { r: 1.5 });
    c.strokeStyle = "#e8dcc0"; c.lineWidth = 0.5; c.beginPath();
    for (let k = 0; k <= 6; k++) { const px = dx - 3.5 * s + k * (7 * s / 6); if (k) c.lineTo(px, dt + (k % 2 ? 4.5 : 0.8) * s); else c.moveTo(px, dt + 0.8 * s); }
    c.stroke();
    ellipse(c, dx, dt, 3.5 * s, 1.2 * s); c.fillStyle = "#e8dcc0"; c.fill();
    R(c, dx - 1 * s, dt - 0.5, 2 * s, 0.5, "#fff3d2");
  });
  if (hash(sd, 4) > 0.3) tuft(ctx, x - 4 * s, gy + 1, 0.5, REALM.TUFT, REALM.GRASS_LT, sd, { n: 3 });
};

// ---- Blackcliff: the gryphons' rock ---------------------------------------------
// A sea-stack of black basalt on the cliff-top, its ledges whitened by the
// gulls, a gull or two standing on it. v picks the shape, as ircrag's do.
const gull = (c, gx, gy2, s, k = 1) => {
  ball(c, gx, gy2 - 1.2 * s, 1.8 * s, 1.2 * s, "#f0ece6", { hi: 0.3, lo: 0.4 });
  R(c, gx - 1.6 * s * k, gy2 - 2 * s, 2.6 * s, 0.8 * s, "#9ea2ac");        // the grey mantle
  R(c, gx - 2.2 * s * k - (k < 0 ? 0 : 0.5), gy2 - 1.6 * s, 1, 0.5, "#24222a");   // black wingtips
  ball(c, gx + 1.5 * s * k, gy2 - 2.6 * s, 0.9 * s, 0.9 * s, "#f6f2ec", { hi: 0.3, lo: 0.3 });
  R(c, gx + 2.3 * s * k - (k < 0 ? 0.5 : 0), gy2 - 2.6 * s, 0.5, 0.5, "#e0b030");
  R(c, gx + 0.2 * s, gy2 - 0.3, 0.5, 0.8, "#c88a50");
};
// white streaks down a face from the ledge at (lx, ly)
const streaks = (ctx, lx, ly, w, s, seed) => {
  for (let i = 0; i < 5; i++) {
    const sx = lx + (hash(seed, i) - 0.5) * w, len = (2 + hash(seed, i + 7) * 6) * s;
    ctx.fillStyle = "#e8e4dc"; ctx.fillRect(ap(sx), ap(ly), 0.5, ap(len * 0.6) + 0.5);
    ctx.fillStyle = "rgba(232,228,220,0.45)"; ctx.fillRect(ap(sx), ap(ly + len * 0.6), 0.5, ap(len * 0.4) + 0.5);
    if (i % 2) { ctx.fillStyle = "#f2efe8"; ctx.fillRect(ap(sx - 0.5), ap(ly - 0.5), 1.5, 0.5); }
  }
};
const seaStack = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed, v = o.v % 4, col = BASALT;
  shadow(ctx, x + 6 * s, gy, 16 * s, 4.2 * s, 0.3);
  let tops;
  if (v === 0) {
    facet(ctx, x - 6 * s, gy - 1 * s, 7 * s, 15 * s, darken(col, 0.04), sd + 1);
    facet(ctx, x + 3 * s, gy, 7.5 * s, 26 * s, col, sd + 2);
    facet(ctx, x + 11 * s, gy + 1.5 * s, 4.5 * s, 7 * s, darken(col, 0.08), sd + 3, { flat: true });
    tops = [[x - 6 * s, gy - 15 * s, 8 * s], [x + 3 * s, gy - 25 * s, 9 * s]];
  } else if (v === 1) {
    facet(ctx, x - 7 * s, gy, 5 * s, 20 * s, col, sd + 1, { flat: true });
    facet(ctx, x, gy - 1 * s, 5 * s, 25 * s, lighten(col, 0.04), sd + 2, { flat: true });
    facet(ctx, x + 7 * s, gy + 1 * s, 5 * s, 16 * s, darken(col, 0.06), sd + 3, { flat: true });
    tops = [[x - 7 * s, gy - 19 * s, 6 * s], [x, gy - 25 * s, 6 * s], [x + 7 * s, gy - 14.5 * s, 6 * s]];
  } else if (v === 2) {
    facet(ctx, x + 1 * s, gy - 2 * s, 12 * s, 17 * s, darken(col, 0.03), sd + 1, { flat: true });
    facet(ctx, x - 4 * s, gy + 1 * s, 13 * s, 8 * s, col, sd + 2, { flat: true });
    tops = [[x + 1 * s, gy - 18.5 * s, 14 * s], [x - 4 * s, gy - 6.5 * s, 14 * s]];
  } else {
    facet(ctx, x - 2 * s, gy, 12 * s, 12 * s, col, sd + 1, { flat: true });
    facet(ctx, x + 9 * s, gy + 1 * s, 5 * s, 9 * s, darken(col, 0.05), sd + 2);
    tops = [[x - 2 * s, gy - 11.5 * s, 13 * s]];
  }
  tops.forEach(([tx, ty, tw], i) => streaks(ctx, tx, ty + 1.5 * s, tw, s, sd + i * 13));
  const [gx, gy2] = tops[(sd % tops.length + tops.length) % tops.length];
  part(ctx, (c) => gull(c, gx - 1 * s, gy2 + 1 * s, 0.8 * s, hash(sd, 3) > 0.5 ? 1 : -1));
  if (tops.length > 1 && hash(sd, 4) > 0.45) { const [hx, hy] = tops[(sd + 1) % tops.length]; part(ctx, (c) => gull(c, hx + 1.5 * s, hy + 1 * s, 0.75 * s, -1)); }
  brackenFan(ctx, x - 13 * s, gy + 2, 0.6 * s, sd + 9);
  if (hash(sd, 8) > 0.5) heatherTuft(ctx, x + 14 * s, gy + 2.5, 0.8 * s, sd + 5);
};

// The eyrie: a great basalt stack on the cliff-top, a nest of sticks on it
// strewn with bones, a gryphon asleep in it — head tucked under the wing, the
// lion's tail hung over the rim. Live: she breathes, and now and then lifts
// her head to look over the cove, then settles again.
const EYRIE = { top: 34 };
// a stick in the nest: a crisp 1-unit line, painted straight (no part, so no ink of its own)
const stick = (c, x0, y0, x1, y1, col, lit) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const px = ap(x0 + (x1 - x0) * i / n), py = ap(y0 + (y1 - y0) * i / n);
    c.fillStyle = col; c.fillRect(px, py, 1, 1);
    c.fillStyle = lit; c.fillRect(px, py, 0.5, 0.5);
  }
};
const NEST = [["#7a5a3a", "#9a7a52"], ["#5a4230", "#7a5e42"], ["#8a7458", "#b09a78"], ["#6a4a2e", "#8a6440"]];
// sticks round the rim between angles a0 and a1, laid roughly along it, some bristling out
const nestSticks = (c, nx, ny, s, a0, a1, n, sd) => {
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * (a1 - a0) + (hash(sd, i) - 0.5) * 0.3, r1 = 7.5 + hash(sd, i + 40) * 4;
    const px = nx + Math.cos(a) * r1 * s, py = ny + Math.sin(a) * r1 * 0.42 * s;
    const la = a + Math.PI / 2 + (hash(sd, i + 80) - 0.5) * 1.4, ln = (3 + hash(sd, i + 120) * 4) * s;
    const dx = Math.cos(la) * ln / 2, dy = Math.sin(la) * ln * 0.42 / 2, [col, lit] = NEST[i % 4];
    stick(c, px - dx, py - dy, px + dx, py + dy, col, lit);
  }
};
const eyrieBody = (c, x, y, s) => {
  const gy = y + 8, sd = 77, col = darken(BASALT, 0.05);
  shadow(c, x + 10 * s, gy, 21 * s, 5 * s, 0.32);
  facet(c, x - 9 * s, gy + 1 * s, 7 * s, 17 * s, darken(col, 0.06), sd + 1);
  facet(c, x + 1 * s, gy - 1 * s, 11 * s, EYRIE.top * s, col, sd + 2, { flat: true });
  facet(c, x + 11 * s, gy + 1.5 * s, 5 * s, 9 * s, darken(col, 0.08), sd + 3, { flat: true });
  streaks(c, x - 9 * s, gy - 15 * s, 7 * s, s, 5);
  streaks(c, x + 4 * s, gy - (EYRIE.top - 6) * s, 10 * s, s, 9);
  streaks(c, x - 2 * s, gy - (EYRIE.top - 7) * s, 6 * s, s, 12);
  // bones at the foot: a long bone, a ram's skull; a cast feather, barred
  part(c, (cc) => {
    R(cc, x - 15 * s, gy + 1, 5 * s, 1, "#e0d8c4"); R(cc, x - 15.5 * s, gy + 0.5, 1, 2, "#e0d8c4"); R(cc, x - 10.5 * s, gy + 0.5, 1, 2, "#e0d8c4");
    ball(cc, x + 15 * s, gy + 1, 1.8 * s, 1.4 * s, "#e0d8c4", { hi: 0.4, lo: 0.4 });
    R(cc, x + 14.2 * s, gy + 0.5, 0.5, 0.5, "#3a3030"); R(cc, x + 15.6 * s, gy + 0.5, 0.5, 0.5, "#3a3030");
  });
  part(c, (cc) => {
    R(cc, x - 6 * s, gy + 2.5, 5 * s, 1, "#b08850"); R(cc, x - 6.5 * s, gy + 3, 1, 0.5, "#b08850");
    for (let k = 0; k < 3; k++) R(cc, x - 5 * s + k * 1.5 * s, gy + 2.5, 0.5, 1, "#5a4028");
  });
  // the nest's mass, its hollow, the back rim's sticks
  const nx = x + 1 * s, ny = gy - (EYRIE.top - 3) * s;
  part(c, (cc) => {
    ellipse(cc, nx, ny, 11.5 * s, 4.6 * s); cc.fillStyle = "#4a3828"; cc.fill();
    ellipse(cc, nx + 0.5, ny - 0.3, 7.5 * s, 2.6 * s); cc.fillStyle = "#2a2220"; cc.fill();
  });
  nestSticks(c, nx, ny, s, Math.PI * 0.95, Math.PI * 2.05, 24, sd);
  R(c, nx - 9 * s, ny - 2 * s, 3 * s, 1, "#e0d8c4");
};
const eyrieFront = (c, x, y, s) => {
  const gy = y + 8, sd = 91, nx = x + 1 * s, ny = gy - (EYRIE.top - 3) * s;
  part(c, (cc) => {
    // the near half of the rim: a band of sticks over the sleeper's belly
    cc.beginPath(); cc.ellipse(nx, ny, 11.5 * s, 4.6 * s, 0, 0, Math.PI); cc.ellipse(nx + 0.5, ny + 0.6 * s, 8 * s, 2.4 * s, 0, Math.PI, 0, true); cc.closePath();
    cc.fillStyle = "#5a4430"; cc.fill();
  });
  nestSticks(c, nx, ny + 0.5 * s, s, 0.05, Math.PI - 0.05, 22, sd);
  part(c, (cc) => { R(cc, nx + 3 * s, ny + 3.2 * s, 4 * s, 1, "#e8e0cc"); R(cc, nx + 6.5 * s, ny + 2.7 * s, 1, 2, "#e8e0cc"); });
};
// the sleeper: frame 0 out-breath, 1 in-breath, 2 head up and looking out
const GRY = { col: "#b08850", belly: "#e8e0cc", mane: "#8a6a3e", wing: "#5e4636", eye: "#e8a830" };
const gryphonCurl = (c, x, y, s, f) => {
  const gy = y + 8, nx = x + 1.5 * s, ny = gy - (EYRIE.top - 3) * s - 1 * s, br = f === 1 ? 0.5 : 0;
  // the lion's haunch and tail curled round on the sticks
  part(c, (cc) => {
    ball(cc, nx + 4.5 * s, ny - 0.5 * s, 3.6 * s, 2.6 * s + br * 0.5, darken(GRY.col, 0.08), { hi: 0.4, lo: 0.45 });
    cc.strokeStyle = GRY.col; cc.lineWidth = 1.2; cc.lineCap = "round";
    cc.beginPath(); cc.moveTo(nx + 7 * s, ny + 0.5 * s); cc.quadraticCurveTo(nx + 9.5 * s, ny + 1.5 * s, nx + 6 * s, ny + 2.4 * s); cc.stroke();
    ball(cc, nx + 5.2 * s, ny + 2.5 * s, 1.4 * s, 1 * s, GRY.mane, { hi: 0.3, lo: 0.4 });
  });
  part(c, (cc) => ball(cc, nx - 1 * s, ny - 1.5 * s - br, 5.6 * s, 3 * s + br, GRY.col, { hi: 0.5, lo: 0.45 }));
  // the folded wing: coverts, then the long primaries with pale tips, laid back over the haunch
  part(c, (cc) => {
    const wy = ny - 3 * s - br * 1.5;
    cc.beginPath(); cc.moveTo(nx - 4.5 * s, wy - 0.5 * s); cc.quadraticCurveTo(nx, wy - 3 * s, nx + 5 * s, wy - 1 * s); cc.lineTo(nx + 9 * s, wy + 1 * s); cc.lineTo(nx + 5 * s, wy + 2.2 * s); cc.quadraticCurveTo(nx, wy + 3 * s, nx - 4 * s, wy + 1.8 * s); cc.closePath();
    cc.fillStyle = lin(cc, 0, wy - 3 * s, 0, wy + 3 * s, [[0, lighten(GRY.wing, 0.3)], [0.45, GRY.wing], [1, darken(GRY.wing, 0.35)]]); cc.fill();
    cc.save(); cc.clip();
    R(cc, nx - 4 * s, wy - 2 * s, 5 * s, 2 * s, lighten(GRY.wing, 0.15));                 // the coverts
    for (let k = 0; k < 4; k++) R(cc, nx + 1 * s + k * 1.8 * s, wy - 1.5 * s + k * 0.5 * s, 0.5, 4 * s, darken(GRY.wing, 0.45));
    for (let k = 0; k < 4; k++) R(cc, nx + 2 * s + k * 1.8 * s, wy + 1.5 * s - k * 0.1 * s, 1, 0.5, "#c8b08a");   // pale tips
    cc.restore();
  });
  // the eagle's head: tucked against the breast, eye shut; or raised on its neck, looking west
  part(c, (cc) => {
    const up = f === 2;
    const hx = up ? nx - 6.5 * s : nx - 5.5 * s, hy = up ? ny - 8 * s : ny - 2 * s - br * 0.5;
    if (up) ball(cc, nx - 5.5 * s, ny - 4.5 * s, 2.2 * s, 3.4 * s, GRY.belly, { hi: 0.35, lo: 0.45 });
    ball(cc, hx, hy, 2.6 * s, 2.3 * s, GRY.belly, { hi: 0.35, lo: 0.45 });
    R(cc, hx - 0.5 * s, hy - 2.2 * s, 2.5 * s, 1, GRY.mane);                     // the crown's darker feathers
    cc.fillStyle = GRY.eye;
    cc.beginPath(); cc.moveTo(hx - 2 * s, hy - 0.6 * s); cc.lineTo(hx - 4.4 * s, hy + 0.2 * s); cc.lineTo(hx - 3.6 * s, hy + 1.6 * s); cc.lineTo(hx - 1.8 * s, hy + 1 * s); cc.closePath(); cc.fill();
    R(cc, hx - 3.8 * s, hy + 1.2 * s, 0.5, 0.5, darken(GRY.eye, 0.45));
    if (up) { R(cc, hx - 1.2 * s, hy - 0.8 * s, 1, 1, "#1c1618"); R(cc, hx - 1.2 * s, hy - 0.8 * s, 0.5, 0.5, GRY.eye); }
    else R(cc, hx - 1.4 * s, hy - 0.4 * s, 1.5, 0.5, darken(GRY.belly, 0.5));   // the eye shut
  });
};
// v3: the gryphon is away hunting and two eggs lie in the sticks
const nestEggs = (c, x, y, s) => {
  const gy = y + 8, nx = x + 1 * s, ny = gy - (EYRIE.top - 3) * s;
  for (const [dx, dy, k] of [[-2, -0.6, 0], [1.8, -0.2, 1]]) part(c, (cc) => {
    ball(cc, nx + dx * s, ny + dy * s, 1.7 * s, 1.3 * s, k ? "#e4dcc6" : "#d8d0b4", { hi: 0.5, lo: 0.4 });
    R(cc, nx + (dx - 1) * s, ny + (dy - 0.6) * s, 0.5, 0.5, "#fff3d2"); R(cc, nx + (dx + 0.7) * s, ny + (dy + 0.1) * s, 0.5, 0.5, "#b09a7a"); R(cc, nx + (dx - 0.2) * s, ny + (dy + 0.6) * s, 0.5, 0.5, "#b09a7a");
  });
};
const eyrie = (ctx, x, y, s, o) => {
  const hw = Math.ceil(22 * s + 4), top = Math.ceil((EYRIE.top + 16) * s + 4), away = o.v % 4 === 3;
  stampBody(ctx, body(`eyrie|${s}`, hw, top, 10, (c, bx, by) => eyrieBody(c, bx, by, s)), x, y);
  const t = o.time + x * 0.05, cyc = t % 13;
  const f = away ? "eggs" : cyc > 10.5 && cyc < 12.4 ? 2 : (t % 3.4) < 1.5 ? 1 : 0;
  stampBody(ctx, body(`eyriegry|${s}|${f}`, hw, top, 10, (c, bx, by) => (away ? nestEggs(c, bx, by, s) : gryphonCurl(c, bx, by, s, f))), x, y);
  stampBody(ctx, body(`eyriefront|${s}`, hw, top, 10, (c, bx, by) => eyrieFront(c, bx, by, s)), x, y);
  // two gulls wheeling round the stack, well clear of the gryphon
  for (let i = 0; i < 2; i++) {
    const a = t * (0.45 + i * 0.12) + i * 2.6, gx = x + 4 * s + Math.cos(a) * (24 + i * 8) * s, gy2 = y - (EYRIE.top + 8 + i * 5) * s + Math.sin(a) * 7 * s;
    const flap = Math.sin(t * 7 + i * 3) > 0 ? 1 : 0;
    ctx.fillStyle = "#24222a"; ctx.fillRect(ap(gx - 3), ap(gy2 - flap), 1, 0.5); ctx.fillRect(ap(gx + 2.5), ap(gy2 - flap), 1, 0.5);
    ctx.fillStyle = "#f0ece6"; ctx.fillRect(ap(gx - 2), ap(gy2 - flap * 0.5), 1.5, 0.5); ctx.fillRect(ap(gx + 1), ap(gy2 - flap * 0.5), 1.5, 0.5); ctx.fillRect(ap(gx - 0.5), ap(gy2), 1.5, 1);
  }
};

// ---- Ironmouth: the waterfront ---------------------------------------------------
// The estuary quay: a long timber wharf along the bank (water to its EAST), its
// landward edge on the turf and its face on piles, a river barge made fast
// alongside with a jib crane swinging a cask aboard, bollards, casks and
// crates on the planking, a rowing boat tied at its south end.
// v: the barge's lading — 0 casks, 1 sawn timber, 2 her mast stepped with the
// oxblood sail brailed up, 3 a heap of sea-coal. The wharf runs from 38 above
// its feet to 8 below; the centre (the footprint) stands on the bank behind it.
const QUAY = { n: 38, sth: 8 };
const quay = (ctx, x, y, s, o) => {
  const gy = y + 8, v = o.v % 4, sd = o.seed;
  const qx0 = x + 2 * s, qx1 = x + 24 * s, qy0 = gy - QUAY.n * s, qy1 = gy + QUAY.sth * s;   // the deck
  const bx = x + 31 * s, bw = 5.5 * s, by0 = gy - 34 * s, by1 = gy - 9 * s;                      // the barge
  const rbx = x + 30 * s, rby = gy + 2 * s;                                                     // the rowing boat
  // on the water, side by side so no two layers stack past the ink's alpha: the
  // wharf's shade, the barge's shadow, ripples off her and off the piles
  ctx.fillStyle = WET(0.22); ctx.fillRect(ap(qx1), ap(qy0 + 2), ap(bx - bw - qx1), ap(qy1 - qy0));
  ctx.fillStyle = WET(0.22); ctx.fillRect(ap(bx - bw), ap(by0 + 4), ap(bw * 2 + 2.5 * s), ap(by1 - by0 + 2 * s));
  ctx.fillStyle = WET(0.2); ctx.fillRect(ap(rbx - 2.5 * s), ap(rby - 3 * s), ap(6.5 * s), ap(10 * s));
  for (let i = 0; i < 12; i++) {
    const ry = by0 + 2 + hash(sd, i) * (qy1 - by0);
    ctx.fillStyle = GLINT(0.22); ctx.fillRect(ap(bx + bw + 3 * s + hash(sd, i + 9) * 3 * s), ap(ry), ap(2 + hash(sd, i + 19) * 2.5), 0.5);
  }
  ctx.fillStyle = GLINT(0.22); ctx.fillRect(ap(bx - 3 * s), ap(by1 + 2 * s + 3), ap(6 * s), 0.5);
  shadow(ctx, x + 2 * s, gy + 0.5, 8 * s, 2.2 * s, 0.22);
  // the barge: a flat hull, square-sterned, her bow upstream; tarred sides, a lighter deck
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(bx - bw, by1); c.lineTo(bx - bw, by0 + 5 * s); c.quadraticCurveTo(bx - bw, by0, bx, by0 - 1 * s); c.quadraticCurveTo(bx + bw, by0, bx + bw, by0 + 5 * s); c.lineTo(bx + bw, by1); c.closePath();
    c.fillStyle = TAR; c.fill();
    c.beginPath(); c.moveTo(bx - bw + 1, by1 - 1); c.lineTo(bx - bw + 1, by0 + 5 * s); c.quadraticCurveTo(bx - bw + 1, by0 + 1.5, bx, by0 + 0.5); c.quadraticCurveTo(bx + bw - 1, by0 + 1.5, bx + bw - 1, by0 + 5 * s); c.lineTo(bx + bw - 1, by1 - 1); c.closePath();
    c.fillStyle = lin(c, bx - bw, 0, bx + bw, 0, [[0, "#b08a5c"], [0.5, "#96744a"], [1, "#6e5436"]]); c.fill();
    for (let yy = by0 + 4 * s; yy < by1 - 1; yy += 2.5 * s) R(c, bx - bw + 1, yy, bw * 2 - 2, 0.5, "#5e4630");
    R(c, bx - bw + 1, by0 + 5 * s, 0.5, by1 - by0 - 5 * s - 1, lighten(TAR, 0.35));
    R(c, bx - bw, by1, bw * 2, 2 * s, lighten(TAR, 0.12)); R(c, bx - bw, by1, bw * 2, 0.5, lighten(TAR, 0.4));
    R(c, bx - bw, by1 + 2 * s - 1, bw * 2, 1, TAR);
    R(c, bx - 0.5, by1 - 3 * s, 1, 4 * s, WOOD_DK); R(c, bx - 0.5, by1 - 3.5 * s, 3 * s, 0.8, WOOD_LT);   // the tiller
  });
  if (v === 0) {
    for (const [dx, dy] of [[-2.5, -26], [2.5, -25], [-2.5, -19], [2.5, -18], [0, -12]]) part(ctx, (c) => keg(c, bx + dx * s, gy + dy * s, 0.6 * s));
  } else if (v === 1) {
    part(ctx, (c) => { for (let k = 0; k < 5; k++) { cylinder(c, bx - 4.5 * s + k * 1.8 * s, by0 + 5 * s, 1.6 * s, 17 * s, k % 2 ? "#a8845a" : "#b8946a", { r: 0.6 }); R(c, bx - 4.5 * s + k * 1.8 * s, by0 + 5 * s, 1.6 * s, 0.8, "#d8bc8a"); } R(c, bx - 5 * s, by0 + 9 * s, 10 * s, 0.8, IRON); R(c, bx - 5 * s, by0 + 17 * s, 10 * s, 0.8, IRON); });
  } else if (v === 2) {
    part(ctx, (c) => { roundRect(c, bx - 4 * s, by0 + 10 * s, 8 * s, 12 * s, 1.5); c.fillStyle = lin(c, bx - 4 * s, 0, bx + 4 * s, 0, [[0, lighten(CANVAS, 0.2)], [0.5, darken(CANVAS, 0.1)], [1, darken(CANVAS, 0.35)]]); c.fill(); for (let k = 1; k < 4; k++) R(c, bx - 4 * s, by0 + 10 * s + k * 3 * s, 8 * s, 0.5, darken(CANVAS, 0.45)); });
    part(ctx, (c) => {
      cylinder(c, bx - 0.7, by0 - 12 * s, 1.4, 22 * s, WOOD_DK, { r: 0.5 });
      R(c, bx - 6 * s, by0 - 8 * s, 12 * s, 1, WOOD);
      roundRect(c, bx - 6 * s, by0 - 7.5 * s, 12 * s, 3 * s, 1.2);
      c.fillStyle = lin(c, 0, by0 - 7.5 * s, 0, by0 - 4.5 * s, [[0, OX_LT], [0.5, OX], [1, OX_DK]]); c.fill();
      for (let k = 1; k < 4; k++) R(c, bx - 6 * s + k * 3 * s, by0 - 7.5 * s, 0.5, 3 * s, OX_DK);
      ball(c, bx, by0 - 12.5 * s, 0.8, 0.8, BRASS, { hi: 0.5, lo: 0.3 });
    });
  } else {
    part(ctx, (c) => { ball(c, bx, by0 + 14 * s, 4.5 * s, 9 * s, "#3a3840", { hi: 0.6, lo: 0.3 }); for (let i = 0; i < 8; i++) R(c, bx - 3 * s + hash(sd, i + 60) * 6 * s, by0 + 9 * s + hash(sd, i + 70) * 18 * s, 0.5, 0.5, "#6a6874"); });
  }
  // the rowing boat tied at the south end, lying along the stream
  part(ctx, (c) => {
    const L = 5.5 * s, Wd = 2.6 * s;
    c.beginPath(); c.moveTo(rbx, rby - L); c.quadraticCurveTo(rbx + Wd, rby - L * 0.5, rbx + Wd, rby + L * 0.4); c.lineTo(rbx + Wd * 0.7, rby + L); c.lineTo(rbx - Wd * 0.7, rby + L); c.lineTo(rbx - Wd, rby + L * 0.4); c.quadraticCurveTo(rbx - Wd, rby - L * 0.5, rbx, rby - L); c.closePath();
    c.fillStyle = WOOD_LT; c.fill();
    c.beginPath(); c.moveTo(rbx, rby - L + 1.5); c.quadraticCurveTo(rbx + Wd - 1, rby - L * 0.5, rbx + Wd - 1, rby + L * 0.4); c.lineTo(rbx + Wd * 0.7 - 1, rby + L - 1); c.lineTo(rbx - Wd * 0.7 + 1, rby + L - 1); c.lineTo(rbx - Wd + 1, rby + L * 0.4); c.quadraticCurveTo(rbx - Wd + 1, rby - L * 0.5, rbx, rby - L + 1.5); c.closePath();
    c.fillStyle = darken(WOOD, 0.15); c.fill();
    R(c, rbx - Wd + 1, rby - 1 * s, Wd * 2 - 2, 1, WOOD_LT); R(c, rbx - Wd + 1, rby + 2 * s, Wd * 2 - 2, 1, WOOD_LT);
    R(c, rbx - Wd * 0.7, rby + L, Wd * 1.4, 1.2 * s, darken(WOOD, 0.35));
  });
  // the wharf: planks across, its face timber, the south end's edge, piles standing proud
  part(ctx, (c) => {
    R(c, qx0, qy0, qx1 - qx0, qy1 - qy0, WOOD);
    for (let yy = qy0 + 1.5; yy < qy1; yy += 1.5 * s) { R(c, qx0, yy, qx1 - qx0, 0.5, darken(WOOD, 0.3)); if (hash(sd, Math.round(yy)) > 0.55) R(c, qx0 + hash(sd, Math.round(yy) + 3) * (qx1 - qx0 - 4), yy + 0.5, 4, 0.5, WOOD_LT); }
    for (let yy = qy0 + 9 * s; yy < qy1; yy += 9 * s) R(c, qx0 + 4 * s, yy, 0.5, 1.5 * s, darken(WOOD, 0.4));   // butt joints
    R(c, qx0, qy0, qx1 - qx0, 0.5, WOOD_LT);
    R(c, qx1 - 1.5 * s, qy0, 1.5 * s, qy1 - qy0, darken(WOOD, 0.2)); R(c, qx1 - 1.5 * s, qy0, 0.5, qy1 - qy0, WOOD_LT);   // the face timber
    R(c, qx0, qy1, qx1 - qx0, 1.5 * s, darken(WOOD, 0.35)); R(c, qx0, qy1 + 1.5 * s - 0.5, qx1 - qx0, 0.5, TAR);
    // its landward edge sinks into the turf
    for (let yy = qy0; yy < qy1; yy += 0.5) if (hash(sd, Math.round(yy * 2) + 77) < 0.4) R(c, qx0, yy, 0.5 + hash(sd, Math.round(yy * 2) + 99) * 1.5, 0.5, REALM.GRASS_DK);
  });
  for (let yy = qy0 + 1 * s; yy < qy1; yy += 6 * s) {
    part(ctx, (c) => { cylinder(c, qx1 - 0.5 * s, yy - 1.5 * s, 2.2 * s, 5 * s, WOOD_DK, { r: 0.8, hi: 0.35 }); R(c, qx1 - 0.5 * s, yy + 3 * s, 2.2 * s, 0.5, TAR); ellipse(c, qx1 + 0.6 * s, yy - 1.5 * s, 1.1 * s, 0.5 * s); c.fillStyle = WOOD_LT; c.fill(); });
  }
  // bollards, and the lines out to the barge and the boat
  part(ctx, (c) => {
    for (const yy of [by0 + 6 * s, by1 - 4 * s, rby]) {
      cylinder(c, qx1 - 4.5 * s, yy - 2.5 * s, 2 * s, 3 * s, "#4a4e58", { r: 0.8 }); R(c, qx1 - 4.5 * s, yy - 2.5 * s, 2 * s, 0.5, STEEL);
      const tx = yy === rby ? rbx - 2 * s : bx - bw;
      c.strokeStyle = "#c8b48a"; c.lineWidth = 0.5; c.beginPath(); c.moveTo(qx1 - 2.5 * s, yy - 1.5 * s); c.quadraticCurveTo(qx1 + 2 * s, yy, tx, yy - 1.5 * s); c.stroke();
    }
  });
  // the jib crane at the wharf's face, swinging a cask over the barge
  part(ctx, (c) => {
    const px = qx1 - 6 * s, pb = gy - 14 * s, pt = pb - 18 * s, tip = [bx + 1 * s, pt - 3 * s];
    R(c, px - 3 * s, pb - 1 * s, 6 * s, 2 * s, WOOD_DK);
    cylinder(c, px - 1.2 * s, pt, 2.4 * s, pb - pt, WOOD, { r: 0.6, hi: 0.35 });
    c.strokeStyle = WOOD; c.lineWidth = 1.6 * s; c.lineCap = "round";
    c.beginPath(); c.moveTo(px, pb - 6 * s); c.lineTo(tip[0], tip[1]); c.stroke();
    c.strokeStyle = WOOD_LT; c.lineWidth = 0.5; c.beginPath(); c.moveTo(px, pb - 6 * s - 0.7); c.lineTo(tip[0], tip[1] - 0.7); c.stroke();
    c.strokeStyle = WOOD_DK; c.lineWidth = 0.9; c.beginPath(); c.moveTo(px, pt); c.lineTo(tip[0], tip[1]); c.stroke();
    c.strokeStyle = "#c8b48a"; c.lineWidth = 0.5; c.beginPath(); c.moveTo(tip[0], tip[1]); c.lineTo(tip[0], gy - 24 * s); c.stroke();
    ball(c, px + 1.5 * s, pb - 3 * s, 1.6 * s, 1.6 * s, WOOD_DK, { hi: 0.4, lo: 0.3 });   // the winch drum
  });
  part(ctx, (c) => keg(c, bx + 1 * s, gy - 19.5 * s, 0.6 * s));
  // on the planking: crates, casks, a sack, a coil of rope
  part(ctx, (c) => { R(c, qx0 + 3 * s, qy0 + 6 * s, 6 * s, 6 * s, "#9a7448"); R(c, qx0 + 3 * s, qy0 + 6 * s, 6 * s, 1.8 * s, "#b8925e"); R(c, qx0 + 3 * s, qy0 + 9 * s, 6 * s, 0.5, WOOD_DK); R(c, qx0 + 8.5 * s, qy0 + 7.5 * s, 0.5, 4.5 * s, WOOD_DK); });
  part(ctx, (c) => { R(c, qx0 + 4 * s, qy0 + 1.5 * s, 5 * s, 5 * s, "#8a6a40"); R(c, qx0 + 4 * s, qy0 + 1.5 * s, 5 * s, 1.5 * s, "#a8865a"); });
  part(ctx, (c) => keg(c, qx0 + 6 * s, qy0 + 20 * s, 0.7 * s));
  part(ctx, (c) => keg(c, qx0 + 10 * s, qy0 + 22 * s, 0.7 * s, true));
  part(ctx, (c) => sackL(c, qx0 + 7 * s, qy1 - 7 * s, 0.7 * s));
  part(ctx, (c) => { ellipse(c, qx0 + 13 * s, qy1 - 2 * s, 2.4 * s, 1.2 * s); c.fillStyle = "#c8b48a"; c.fill(); ellipse(c, qx0 + 13 * s, qy1 - 2 * s, 1 * s, 0.5 * s); c.fillStyle = WOOD_DK; c.fill(); });
  tuft(ctx, x - 1 * s, gy + 2, 0.5, REALM.TUFT, REALM.GRASS_LT, sd, { n: 3 });
  tuft(ctx, x, qy0 + 4, 0.45, REALM.TUFT, REALM.GRASS_LT, sd + 4, { n: 3 });
};

// Mooring piles at the water's edge (east), a rowing boat tied to them, an
// anchor and a coil of rope ashore.
const mooring = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed, bx = x + 18 * s, by = gy - 4 * s;
  ctx.fillStyle = WET(0.2); ctx.fillRect(ap(bx - 3 * s), ap(by - 4 * s), ap(8 * s), ap(11 * s));
  for (let i = 0; i < 4; i++) { ctx.fillStyle = GLINT(0.2); ctx.fillRect(ap(bx + 4 * s + hash(sd, i) * 2), ap(by - 4 * s + hash(sd, i + 4) * 10 * s), ap(2.5 * s), 0.5); }
  shadow(ctx, x + 3 * s, gy + 0.5, 7 * s, 2 * s, 0.24);
  // the boat, lying along the stream
  part(ctx, (c) => {
    const L = 6 * s, Wd = 2.8 * s;
    c.beginPath(); c.moveTo(bx, by - L); c.quadraticCurveTo(bx + Wd, by - L * 0.5, bx + Wd, by + L * 0.4); c.lineTo(bx + Wd * 0.7, by + L); c.lineTo(bx - Wd * 0.7, by + L); c.lineTo(bx - Wd, by + L * 0.4); c.quadraticCurveTo(bx - Wd, by - L * 0.5, bx, by - L); c.closePath();
    c.fillStyle = WOOD_LT; c.fill();
    c.beginPath(); c.moveTo(bx, by - L + 1.5); c.quadraticCurveTo(bx + Wd - 1, by - L * 0.5, bx + Wd - 1, by + L * 0.4); c.lineTo(bx + Wd * 0.7 - 1, by + L - 1); c.lineTo(bx - Wd * 0.7 + 1, by + L - 1); c.lineTo(bx - Wd + 1, by + L * 0.4); c.quadraticCurveTo(bx - Wd + 1, by - L * 0.5, bx, by - L + 1.5); c.closePath();
    c.fillStyle = darken(WOOD, 0.15); c.fill();
    R(c, bx - Wd + 1, by - 1 * s, Wd * 2 - 2, 1, WOOD_LT); R(c, bx - Wd + 1, by + 2.5 * s, Wd * 2 - 2, 1, WOOD_LT);
    R(c, bx - Wd * 0.7, by + L, Wd * 1.4, 1.5 * s, darken(WOOD, 0.35));
    R(c, bx - Wd * 0.7, by + L + 1.5 * s - 0.5, Wd * 1.4, 0.5, TAR);
  });
  // the piles, each with its glint at the waterline, and the painter line
  part(ctx, (c) => {
    for (const [px, py] of [[x + 9 * s, gy - 9 * s], [x + 10 * s, gy - 3 * s], [x + 9.5 * s, gy + 2 * s]]) {
      cylinder(c, px - 1 * s, py - 4 * s, 2 * s, 5 * s, WOOD_DK, { r: 0.6 });
      ellipse(c, px, py - 4 * s, 1 * s, 0.5 * s); c.fillStyle = WOOD_LT; c.fill();
    }
    c.strokeStyle = "#c8b48a"; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x + 10 * s, gy - 5 * s); c.quadraticCurveTo(x + 13 * s, gy - 6 * s, bx - 1 * s, by - 5 * s); c.stroke();
  });
  ctx.fillStyle = GLINT(0.3); for (const py of [gy - 4 * s, gy + 2 * s, gy + 7 * s]) ctx.fillRect(ap(x + 10.5 * s), ap(py), ap(2 * s), 0.5);
  // ashore: the anchor and a coil of rope
  part(ctx, (c) => {
    c.strokeStyle = IRON; c.lineWidth = 1; c.lineCap = "round";
    c.beginPath(); c.moveTo(x - 4 * s, gy - 4 * s); c.lineTo(x + 2 * s, gy); c.stroke();
    c.beginPath(); c.arc(x + 1 * s, gy - 1.5 * s, 2.4 * s, 0.2, 2.2); c.stroke();
    R(c, x - 4.8 * s, gy - 5 * s, 2 * s, 0.8, IRON);
  });
  part(ctx, (c) => { ellipse(c, x + 4 * s, gy + 1.5, 2.2 * s, 1.1 * s); c.fillStyle = "#c8b48a"; c.fill(); ellipse(c, x + 4 * s, gy + 1.5, 1 * s, 0.5 * s); c.fillStyle = WOOD_DK; c.fill(); });
  if (hash(sd, 1) > 0.4) tuft(ctx, x - 6 * s, gy + 1, 0.5, REALM.TUFT, REALM.GRASS_LT, sd, { n: 3 });
};

// The toll-house at the bridge foot where the Kingdom takes its due of every
// cargo: dressed stone under a hipped slate roof, the oxblood cloth on its
// face, a lantern at the door, a strongbox, a striped toll-bar raised beside
// it and the board of dues on its post.
const tollHouse = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed, w2 = 9 * s, wh = 9 * s, rf = 9 * s, wTop = gy - wh;
  shadow(ctx, x + 8 * s, gy + 0.5, 17 * s, 4 * s, 0.3);
  // the toll-bar, raised on its pivot post east of the house
  part(ctx, (c) => {
    const px = x + w2 + 7 * s;
    cylinder(c, px - 1.2 * s, gy - 9 * s, 2.4 * s, 9 * s, WOOD_DK, { r: 0.6 });
    const ang = -1.05, len = 20 * s;
    for (let k = 0; k < 8; k++) {
      const a0 = k / 8, a1 = (k + 1) / 8;
      c.strokeStyle = k % 2 ? "#e8dcc0" : OX; c.lineWidth = 1.5 * s; c.lineCap = "butt";
      c.beginPath(); c.moveTo(px + Math.cos(ang) * len * a0 - 2 * s, gy - 8 * s + Math.sin(ang) * len * a0); c.lineTo(px + Math.cos(ang) * len * a1 - 2 * s, gy - 8 * s + Math.sin(ang) * len * a1); c.stroke();
    }
    R(c, px - 2.5 * s, gy - 9 * s, 3 * s, 2.5 * s, IRON);
    ball(c, px + 2 * s, gy - 6.5 * s, 1.6 * s, 1.6 * s, GRIT, { hi: 0.4, lo: 0.4 });   // the counterweight stone
  });
  part(ctx, (c) => {
    ashlar(c, x - w2, wTop, w2 * 2, wh, ASHLAR, 13);
    R(c, x - w2, gy - 1.5, w2 * 2, 1.5, darken(ASHLAR, 0.35));
    R(c, x - w2 - 0.5, gy - 1.5, 3 * s, 1.5, "#6a7a4a");
  });
  part(ctx, (c) => {
    // the hipped roof: a short ridge, the south slope, the two hips
    const ex = 1.5 * s, rt = wTop - rf;
    c.beginPath(); c.moveTo(x - w2 - ex, wTop + 0.5); c.lineTo(x + w2 + ex, wTop + 0.5); c.lineTo(x + 3.5 * s, rt); c.lineTo(x - 3.5 * s, rt); c.closePath();
    c.fillStyle = lin(c, 0, rt, 0, wTop, [[0, SLATE_LT], [0.4, SLATE], [1, darken(SLATE, 0.2)]]); c.fill();
    c.save(); c.clip();
    for (let yy = rt + 1.5, row = 0; yy < wTop; yy += 1.5, row++) R(c, x - w2 - ex, yy, w2 * 2 + ex * 2, 0.5, SLATE_DK);
    c.beginPath(); c.moveTo(x + 3.5 * s, rt); c.lineTo(x + w2 + ex, wTop + 0.5); c.lineTo(x + w2 + ex, rt); c.closePath(); c.fillStyle = darken(SLATE, 0.3); c.fill();
    c.restore();
    R(c, x - 3.5 * s, rt - 0.5, 7 * s, 1, lighten(SLATE, 0.35));
    R(c, x - w2 - ex, wTop, w2 * 2 + ex * 2, 0.5, SLATE_DK);
    // a small chimney at the ridge's east end
    R(c, x + 2 * s, rt - 4 * s, 2.5 * s, 4.5 * s, ASHLAR); R(c, x + 3.5 * s, rt - 4 * s, 1 * s, 4.5 * s, darken(ASHLAR, 0.35)); R(c, x + 2 * s, rt - 4.5 * s, 3 * s, 0.8, darken(ASHLAR, 0.2));
  });
  // the door, a lantern, the Kingdom's cloth hung on the face
  part(ctx, (c) => {
    c.fillStyle = "#1c1618";
    c.beginPath(); c.moveTo(x + 1 * s, gy - 0.5); c.lineTo(x + 1 * s, gy - 5.5 * s); c.quadraticCurveTo(x + 3.5 * s, gy - 7.5 * s, x + 6 * s, gy - 5.5 * s); c.lineTo(x + 6 * s, gy - 0.5); c.closePath(); c.fill();
    R(c, x + 1.5 * s, gy - 5.5 * s, 4 * s, 5 * s, WOOD_DK); R(c, x + 1.5 * s, gy - 3.5 * s, 4 * s, 0.8, IRON);
    R(c, x + 7 * s, gy - 7 * s, 1.5 * s, 2 * s, "#ffcf78"); R(c, x + 7 * s, gy - 7.5 * s, 1.5 * s, 0.5, IRON);
  });
  part(ctx, (c) => cloth(c, ap(x - 6.5 * s), ap(wTop + 1 * s), Math.round(5 * s * 2) / 2, 7 * s, 0));
  // the strongbox by the door and the board of dues on its post
  part(ctx, (c) => { R(c, x - 2 * s, gy - 1 * s, 5 * s, 3.5 * s, "#6a4a2e"); R(c, x - 2 * s, gy - 1 * s, 5 * s, 1.2 * s, "#8a6440"); R(c, x - 2 * s, gy + 0.5, 5 * s, 0.6, IRON); R(c, x + 0.3 * s, gy, 0.8, 1, BRASS); });
  part(ctx, (c) => {
    const bx = x - w2 - 6 * s;
    cylinder(c, bx - 0.7, gy - 12 * s, 1.4, 12 * s, WOOD_DK, { r: 0.4 });
    R(c, bx - 4 * s, gy - 14 * s, 8 * s, 6 * s, "#2e2a2c"); R(c, bx - 4 * s, gy - 14 * s, 8 * s, 0.5, "#5a5254");
    for (let r = 0; r < 3; r++) R(c, bx - 3 * s, gy - 12.5 * s + r * 1.6 * s, (4 + hash(sd, r) * 2) * s, 0.5, "#d8ccb0");
    R(c, bx + 2.5 * s, gy - 12.5 * s, 0.8, 0.8, OX_LT);
  });
  tuft(ctx, x - w2 - 1, gy + 1.5, 0.5, REALM.TUFT, REALM.GRASS_LT, sd, { n: 3 });
};

// ---- the registry ----------------------------------------------------------------
export const IRON_ART = {
  // baked without the 2px ring: the heather clump's pixel cushions carry their own underline
  flat: ["irheather", "irpan", "irsluice", "irwreck"],
  decor: {
    irpine: scotsPine, irspruce: spruce, ircrag: crag, irheather: heatherClump, irwall: drystone,
    irgibbet: gibbet, irmile: milestone, irbeacon: beacon, irwagon: wagon, irpikes: pikes,
    irtent: warTent, irbanner: standard, irtower: kingTower, irgate: ironGate, irruin: ruin,
    irpan: saltPan, irsluice: sluice, irsalthouse: saltHouse, irsalt: saltStore, irboat: beachedBoat, irwreck: wreck,
    irquintain: quintain, irdummy: dummy, irbutts: butts, irrack: rack, irmuster: muster,
    irstack: seaStack, ireyrie: eyrie, irquay: quay, irmoor: mooring, irtoll: tollHouse,
  },
  live: ["irbeacon", "irbanner", "irtower", "irgate", "irsalthouse", "irquintain", "ireyrie"],
  box: {
    irpine: [26, 58], irspruce: [27, 50], ircrag: [30, 40], irheather: [18, 14], irwall: [26, 22],
    irgibbet: [20, 44], irmile: [10, 16], irwagon: [36, 30], irpikes: [26, 40], irtent: [32, 40], irruin: [26, 40],
    irpan: [24, 22], irsluice: [14, 46], irsalt: [20, 18], irboat: [36, 22], irwreck: [40, 52], irdummy: [12, 24], irbutts: [24, 20],
    irrack: [20, 30], irmuster: [14, 32], irstack: [30, 34], irquay: [48, 58], irmoor: [26, 16], irtoll: [32, 30],
  },
  dress: {
    irpine: [3.5, false], irspruce: [3.5, false], ircrag: [10, true], irmile: [4, false], irgibbet: [4, true], irruin: [11, true],
    irstack: [10, true], irdummy: [3, false], irmuster: [3, false],
  },
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
