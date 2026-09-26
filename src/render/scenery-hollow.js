// ============ RENDER: SCENERY OF THE HOLLOWFEN ============
// The chapter's own ground art (bog, reeds, drowned trees, graves and barrows), plugged into the shared
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
// The fen (groundArt "fen", spawn "barrowgate"): a drowned kingdom under a
// cold moon. Everything here imports only paint.js and the data modules —
// never scenery.js, which imports THIS file (a cycle that would trip over
// HOLLOW_ART before it exists, depending on which module loads first).
//
// Pieces (all baked once per type/size/variant; the lights keep a baked body
// and only their flames, glows and bells are painted live):
//   fendead    a pale drowned dead tree, weed hanging from its limbs (4 shapes)
//   fenwillow  a weeping willow in the fen's dark teal
//   fensnag    a broken pale stump with bracket fungus
//   reedbed    reeds and bulrushes standing in a strip of black water
//   bogpool    a small bog pool with lily pads
//   fengrave   headstones: leaning slab, ring cross, broken, a crooked pair
//   fencairn   a cairn of flat fen stones, a skull or slab on top
//   fenbones   a half-sunk ribcage, skull and long bones, a rusted helm
//   fenstatue  the old kingdom sunk to the chest: a crowned king, a fallen head
//   fenshrine  a broken wayside shrine with a witch-fire votive (live)
//   bellstone  the court's bell-stones: a bronze bell under a lintel (live)
//   fencandle  corpse-candles: a lantern on a crooked stake, a skull of candles (live)
//   lichfence  a run of lychyard fence: iron pales on stone posts, or wood

import { lighten, darken, mix, rgba, soft, shadow, ball, glow, blade, tuft, stone, hash, lin, rad, blobPath, part, bakeSprite, inkOutline, roundRect, ellipse, PX, SUN } from "./paint.js";
import { REALM } from "../data/maps.js";
import { PTS, nearestOnPath, posAt, angleAt, TOTAL_LEN } from "../engine/path.js";
import { PONDS, RIVERS, BRIDGES, FOREST, forestDepthAt, inRiver } from "../data/terrain.js";
import { W, H, PATH_HALF, WALL_W } from "../data/constants.js";

export const HOLLOW_ART = { decor: {}, live: [], box: {}, dress: {}, spawn: {}, turf: {}, road: {} };
// the landscape beyond the board (apron.js): the fen's own landmarks, sown
// out past the edges; the lights stay on the board (they'd freeze out there)
HOLLOW_ART.apron = {
  biome: "fen",
  big: { fendead: 5, fenwillow: 1.6, reedbed: 1.8, fensnag: 1, fengrave: 0.3, fencairn: 0.3, bogpool: 0.4 },
  landscape: ["fendead", "fenwillow", "fensnag", "reedbed", "bogpool", "fengrave", "fencairn", "fenbones", "fenstatue", "lichfence"],
  tall: ["fendead", "fenwillow"],
};

// ---- the fen's colours ------------------------------------------------
const BONE = "#e0d8c4", BONE_DK = "#a89e86";
const STONE = "#8d8f84";           // fen stone: grey going green
const MOSS = "#56703e", MOSS_LT = "#7a9048", LICHEN = "#b8b478";
const VERDI = "#5a8a78", BRONZE = "#8a7a4a";
const TEAL = "#7ce0b8";
const PEAT = "#262a22", BOGW = "#1c2624", BOGW_LT = "#3e5650";
const DRIFT = "#aaa392";           // drowned wood, bleached
const WEED = "#4e5e4c";

const ap = (v) => Math.round(v * PX) / PX;
const px1 = (c, x, y, w = 0.5, h = 0.5) => c.fillRect(ap(x), ap(y), w, h);

// A piece painted on its own layer with a 1px line of its own dark along
// its underside (foliage), or all round. `box` bounds it in world units.
const inkPart = (ctx, fn, ink, box, only = "under") => {
  if (typeof document === "undefined") { fn(ctx); return; }
  const m = ctx.getTransform();
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const px0 = Math.max(0, Math.floor(m.a * box[0] + m.e) - 2), py0 = Math.max(0, Math.floor(m.d * box[1] + m.f) - 2);
  const pw = Math.min(cw, Math.ceil(m.a * box[2] + m.e) + 3) - px0, ph = Math.min(ch, Math.ceil(m.d * box[3] + m.f) + 3) - py0;
  if (pw <= 0 || ph <= 0) return;
  const layer = document.createElement("canvas");
  layer.width = pw; layer.height = ph;
  const c = layer.getContext("2d", { willReadFrequently: true });
  c.imageSmoothingEnabled = false;
  c.setTransform(m.a, m.b, m.c, m.d, m.e - px0, m.f - py0);
  fn(c);
  inkOutline(layer, ink, 1, only);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layer, px0, py0); ctx.restore();
};

const poly = (c, pts) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
};
// fill the current path lit from the left, shaded to the right
const litFill = (c, x0, x1, col, hi = 0.32, lo = 0.42) => {
  c.fillStyle = lin(c, x0, 0, x1, 0, [[0, lighten(col, hi)], [0.5, col], [1, darken(col, lo)]]);
  c.fill();
};

// A tapering limb along a gentle curve, lit on its sunward side.
const limb = (c, x0, y0, x1, y1, w0, w1, col, bend = 0, o = {}) => {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const rx = -dy / L, ry = dx / L;
  const cx = (x0 + x1) / 2 + rx * bend, cy = (y0 + y1) / 2 + ry * bend;
  const N = 6, A = [], B = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const px = u * u * x0 + 2 * u * t * cx + t * t * x1, py = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const tx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * u * (cy - y0) + 2 * t * (y1 - cy), tl = Math.hypot(tx, ty) || 1;
    const w = (w0 + (w1 - w0) * t) / 2;
    A.push([px - (ty / tl) * w, py + (tx / tl) * w]);
    B.push([px + (ty / tl) * w, py - (tx / tl) * w]);
  }
  c.beginPath();
  A.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  for (let i = B.length - 1; i >= 0; i--) c.lineTo(B[i][0], B[i][1]);
  c.closePath();
  let nx = rx, ny = ry;
  if (nx * SUN.x + ny * SUN.y < 0) { nx = -nx; ny = -ny; }
  const mx = (x0 + x1) / 2 + rx * bend * 0.5, my = (y0 + y1) / 2 + ry * bend * 0.5, hw = Math.max(w0, 1) / 2 + 0.3;
  c.fillStyle = lin(c, mx + nx * hw, my + ny * hw, mx - nx * hw, my - ny * hw, [[0, lighten(col, o.hi ?? 0.34)], [0.45, col], [1, darken(col, o.lo ?? 0.45)]]);
  c.fill();
};

// A lumpy clump of leaves: dark body, the lit body slid toward the sun, a
// lit cap and a few flecks (like the Greenwood's, in the fen's own colours).
const clump = (c, x, y, r, leaf, seed, lit) => {
  const b = lit > 0.62 ? lighten(leaf, 0.1) : lit > 0.3 ? leaf : darken(leaf, 0.14);
  const dk = darken(b, 0.36), lt = lighten(b, 0.24);
  const ry = r * 0.8;
  const shape = (ox, oy, k) => blobPath(c, x + ox, y + oy, r * k, ry * k, seed, 0.22, 9);
  shape(0, 0, 1); c.fillStyle = dk; c.fill();
  c.save(); shape(0, 0, 1); c.clip();
  shape(-r * 0.16, -r * 0.24, 1); c.fillStyle = b; c.fill();
  if (lit > 0.3) { shape(-r * 0.38, -r * 0.5, 0.74); c.fillStyle = lt; c.fill(); }
  for (let i = 0; i < 6; i++) {
    const a = hash(seed, i + 90) * Math.PI * 2, d = Math.sqrt(hash(seed, i + 100)) * r * 0.8;
    const sunny = Math.cos(a) * SUN.x + Math.sin(a) * SUN.y > 0.15;
    c.fillStyle = sunny ? lighten(b, 0.38) : dk;
    px1(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 1, 0.5);
  }
  c.restore();
};

// a skull, facing the camera: dome, cheek shade, sockets and a nose notch
const skull = (c, x, y, r, col = BONE) => {
  ball(c, x, y, r, r * 0.9, col, { hi: 0.35, lo: 0.45 });
  ball(c, x + r * 0.05, y + r * 0.62, r * 0.62, r * 0.38, darken(col, 0.12), { hi: 0.1, lo: 0.4 });
  c.fillStyle = "#2b2430";
  ellipse(c, x - r * 0.38, y + r * 0.12, r * 0.26, r * 0.3); c.fill();
  ellipse(c, x + r * 0.36, y + r * 0.12, r * 0.26, r * 0.3); c.fill();
  px1(c, x - 0.25, y + r * 0.46, 0.5, 0.5);
};

// a long bone lying on the ground
const longBone = (c, x0, y0, x1, y1, w, col = BONE) => {
  c.strokeStyle = darken(col, 0.18); c.lineWidth = w; c.lineCap = "round";
  c.beginPath(); c.moveTo(x0, y0 + 0.3); c.lineTo(x1, y1 + 0.3); c.stroke();
  c.strokeStyle = col; c.lineWidth = w * 0.7;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  for (const [bx, by] of [[x0, y0], [x1, y1]]) {
    ball(c, bx - w * 0.3, by, w * 0.62, w * 0.55, col, { hi: 0.3, lo: 0.35 });
    ball(c, bx + w * 0.3, by + w * 0.1, w * 0.58, w * 0.5, col, { hi: 0.3, lo: 0.35 });
  }
};

// sedge: thin olive blades, paler at the tips (the fen's own grass)
const sedge = (c, x, y, s, seed, n = 5, col = "#6c6e44", tip = "#a09a62") => tuft(c, x, y, s, darken(col, 0.18), tip, seed, { n, wind: 0.15 });

// a flat lily pad on dark water, notched
const lilyPad = (c, x, y, r, seed, col = "#4a6a42") => {
  const a0 = hash(seed, 1) * Math.PI * 2;
  c.fillStyle = rgba("#0c1210", 0.55);
  ellipse(c, x + 0.4, y + 0.5, r, r * 0.55); c.fill();
  c.beginPath();
  c.moveTo(x, y);
  c.ellipse(x, y, r, r * 0.55, 0, a0 + 0.45, a0 + Math.PI * 2 - 0.1);
  c.closePath();
  c.fillStyle = lin(c, x - r, y - r * 0.5, x + r, y + r * 0.5, [[0, lighten(col, 0.28)], [0.5, col], [1, darken(col, 0.3)]]);
  c.fill();
};

// ---- trees --------------------------------------------------------------

// A pale drowned dead tree: a bleached, twisted trunk flaring into roots,
// forked limbs ending in thin fingers, and drowned weed hanging off them.
// Four shapes by variant; the wood's are greyer the deeper they stand.
const fenDead = (ctx, x, y, s, o) => {
  const { seed, v } = o, gy = y + 8;
  const H = (i) => hash(seed, i);
  const col = o.forest ? ["#a19c8c", "#8a877b", "#737168"][o.band] : ["#aaa392", "#b2ac9a", "#a29d8e", "#aea694"][v % 4];
  const kind = o.forest ? (v % 2 ? 3 : 0) : v % 4;
  shadow(ctx, x + 7 * s, gy, 13 * s, 3.6 * s, 0.26);
  // the wet root-hollow it drowned in
  if (kind !== 2) {
    ctx.fillStyle = rgba(PEAT, 0.8);
    blobPath(ctx, x + 1, gy + 0.5, 8 * s, 2.6 * s, seed, 0.15, 9); ctx.fill();
    ctx.fillStyle = rgba(BOGW_LT, 0.7);
    px1(ctx, x - 4 * s, gy - 0.5, 3, 0.5);
  }
  const tall = kind === 1 ? 17 : kind === 3 ? 25 : 22;
  const lean = (kind === 2 ? 5 : (H(1) - 0.5) * 4) * s;
  const topX = x + lean, topY = gy - tall * s;
  const tips = [];
  // limbs behind the trunk first, then the trunk, then those in front
  const limbs = [];
  const fork = (x0, y0, ang, len, w, depth, sd) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    limbs.push([x0, y0, x1, y1, w, Math.max(0.7, w * 0.55), (hash(sd, 1) - 0.5) * len * 0.3]);
    if (depth <= 0) { tips.push([x1, y1]); return; }
    fork(x1, y1, ang - 0.38 - hash(sd, 2) * 0.35, len * (0.58 + hash(sd, 3) * 0.18), w * 0.6, depth - 1, sd * 3 + 1);
    fork(x1, y1, ang + 0.34 + hash(sd, 4) * 0.35, len * (0.52 + hash(sd, 5) * 0.2), w * 0.58, depth - 1, sd * 3 + 2);
  };
  const up = -Math.PI / 2;
  if (kind === 1) {
    // a broken snag: one living limb and a splintered top
    fork(x + lean * 0.5, gy - 11 * s, up - 0.9, 9 * s, 2.1 * s, 1, seed + 5);
  } else {
    fork(topX, topY, up - 0.5 - H(2) * 0.3, (9 + H(3) * 3) * s, 2.4 * s, kind === 3 ? 2 : 1, seed + 7);
    fork(topX, topY, up + 0.45 + H(4) * 0.3, (8 + H(5) * 3) * s, 2.2 * s, 1, seed + 9);
    fork(x + lean * 0.55, gy - tall * s * 0.55, (kind === 2 ? up - 1.1 : up + 1.0), (7 + H(6) * 2) * s, 1.8 * s, 1, seed + 11);
    if (kind === 0) fork(topX, topY, up + (H(7) - 0.5) * 0.3, 7 * s, 1.8 * s, 1, seed + 13);
  }
  part(ctx, (c) => {
    // roots, then the trunk, flaring at the foot
    for (const [rx, rl] of [[-1, 6], [1, 5.5], [-0.4, 3.5]]) limb(c, x + rx * 1.2 * s, gy - 3 * s, x + rx * rl * s, gy + 0.6, 2.2 * s, 0.8, col, rx * 1.2);
    limb(c, x, gy, topX, topY, 4.6 * s, 2.6 * s, col, (H(8) - 0.5) * 4 * s);
    if (kind === 1) {
      // the splintered top
      c.fillStyle = lighten(col, 0.3);
      poly(c, [[topX - 1.4 * s, topY + 1], [topX - 0.8 * s, topY - 2.5 * s], [topX, topY - 0.3], [topX + 0.6 * s, topY - 3.5 * s], [topX + 1.3 * s, topY + 1]]);
      c.fill();
    }
    // bark: a dark seam down the shaded side, knots
    c.fillStyle = darken(col, 0.45);
    for (let k = 0; k < 5; k++) px1(c, x + lean * (0.2 + k * 0.14) + 0.8 * s, gy - 4 * s - k * 3 * s, 0.5, 2);
    ball(c, x + lean * 0.4 - 0.4 * s, gy - tall * s * 0.4, 0.9 * s, 1.1 * s, darken(col, 0.5), { hi: 0, lo: 0.2 });
    for (const L of limbs) limb(c, ...L.slice(0, 6), col, L[6]);
  });
  // drowned weed hanging off the limbs, in ragged strands
  const hang = tips.concat(limbs.map((L) => [(L[0] + L[2]) / 2, (L[1] + L[3]) / 2]));
  hang.forEach(([hx, hy], i) => {
    if (hash(seed, i + 30) > (o.forest ? 0.45 : 0.6)) return;
    const n = 1 + Math.floor(hash(seed, i + 40) * 3);
    for (let k = 0; k < n; k++) {
      const len = (4 + hash(seed, i * 5 + k) * 7) * s;
      const sx = hx + (k - n / 2) * 1.2;
      blade(ctx, sx, hy - 0.5, sx + (hash(seed, i + k + 60) - 0.5) * 2, hy + len, 0.9 * s, WEED, mix(WEED, "#8a9a6a", 0.4), 0.3);
    }
  });
  // lichen on the lit side of the trunk
  ctx.fillStyle = mix(LICHEN, col, 0.3);
  for (let k = 0; k < 4; k++) px1(ctx, x + lean * 0.3 - 1.6 * s + hash(seed, k + 70), gy - 6 * s - hash(seed, k + 71) * tall * 0.6 * s, 1, 0.5);
};

// A weeping willow in the fen's own colours: a gnarled dark trunk forking
// into a tall crown, and the crown one fountain of long strands — rising
// from its top, arching out and falling to the ground, pale where the moon
// catches them on the upper left, the trunk showing where they part.
const strand = (c, x0, y0, x1, y1, out, w, col, tip) => {
  // a tapered arc: out over the crown's shoulder, then straight down
  const cx = x0 + out, cy = y0 - 1.5;
  const N = 7, A = [], B = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const k = t * t;
    const px = u * u * x0 + 2 * u * t * cx + t * t * x1, py = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const ww = (w * (1 - t * 0.7)) / 2;
    A.push([px - ww, py + k * 0.2]); B.push([px + ww, py]);
  }
  c.beginPath();
  A.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  for (let i = B.length - 1; i >= 0; i--) c.lineTo(B[i][0], B[i][1]);
  c.closePath();
  c.fillStyle = lin(c, 0, y0, 0, y1, [[0, tip], [0.35, col], [1, darken(col, 0.25)]]);
  c.fill();
};
const fenWillow = (ctx, x, y, s, o) => {
  const { seed, v } = o, gy = y + 8;
  const H = (i) => hash(seed, i);
  const leaf = o.forest ? ["#4b6454", "#42594b", "#394e43"][o.band] : ["#4d6858", "#536e5c", "#48625a", "#506a54"][v % 4];
  const bark = "#4d4238";
  const R = (13 + H(1) * 3) * s, Ry = R * 0.7;
  const cx = x + (H(2) - 0.5) * 3 * s, cy = gy - 30 * s;
  shadow(ctx, x + 9 * s, gy - 1, 18 * s, 5.5 * s, 0.26);
  shadow(ctx, x + 2 * s, gy, 9 * s, 2.4 * s, 0.3);
  // the back of the fountain, falling behind the trunk in its own shade
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, ox = (t - 0.5) * 2;
    const x0 = cx + ox * R * 0.7, y0 = cy - Ry * 0.3 + Math.abs(ox) * Ry * 0.4;
    const x1 = cx + ox * R * 1.28, y1 = gy - 6 - H(i + 10) * 8 * s;
    strand(ctx, x0, y0, x1, y1, ox * R * 0.45, 1.6 * s, darken(leaf, 0.45), darken(leaf, 0.3));
  }
  // trunk and the limbs it lifts into the crown
  part(ctx, (c) => {
    for (const [rx, rl] of [[-1, 7], [1, 6.5]]) limb(c, x + rx * 1.6 * s, gy - 3 * s, x + rx * rl * s, gy + 0.6, 2.6 * s, 0.9, bark, rx);
    limb(c, x, gy, x - 0.8 * s, gy - 13 * s, 6 * s, 4.4 * s, bark, 1.5 * s, { hi: 0.4 });
    limb(c, x - 0.8 * s, gy - 12 * s, cx - 6 * s, cy + 2 * s, 3.2 * s, 1.6 * s, bark, -2 * s, { hi: 0.4 });
    limb(c, x - 0.4 * s, gy - 12 * s, cx + 5 * s, cy + 1 * s, 3 * s, 1.5 * s, bark, 2 * s, { hi: 0.4 });
    ball(c, x + 0.6 * s, gy - 7 * s, 1 * s, 1.3 * s, darken(bark, 0.5), { hi: 0, lo: 0.2 });
    c.fillStyle = darken(bark, 0.45);
    px1(c, x + 1.2 * s, gy - 11 * s, 0.5, 3);
  });
  // the crown's dark heart, and a few leaf masses on top of it
  inkPart(ctx, (c) => { blobPath(c, cx + s, cy + Ry * 0.1, R * 0.95, Ry * 0.95, seed + 11, 0.12, 12); c.fillStyle = darken(leaf, 0.5); c.fill(); }, darken(leaf, 0.75), [cx - R * 1.2, cy - Ry * 1.2, cx + R * 1.3, cy + Ry * 1.4]);
  const clumps = [[-R * 0.4, -Ry * 0.2, R * 0.5], [R * 0.4, -Ry * 0.15, R * 0.46], [-R * 0.05, -Ry * 0.55, R * 0.46]];
  clumps.forEach(([px, py, r], i) => {
    const lit = 0.5 + ((px / R) * SUN.x + (py / Ry) * SUN.y) * 1.3;
    inkPart(ctx, (c) => clump(c, cx + px, cy + py, r, leaf, seed * 7 + i * 13, lit), darken(leaf, 0.75), [cx + px - r * 1.4, cy + py - r * 1.3, cx + px + r * 1.4, cy + py + r * 1.2]);
  });
  // the fountain: strands from all over the crown's top, arching out and
  // falling, lowest-rooted first so the upper ones spill over them
  const list = [];
  for (let i = 0; i < 34; i++) {
    const a = Math.PI * (1.02 + H(i + 40) * 0.96), k = 0.25 + H(i + 41) * 0.75;
    const x0 = cx + Math.cos(a) * R * k * 0.9, y0 = cy + Math.sin(a) * Ry * k * 0.9 + Ry * 0.15;
    list.push([x0, y0, i]);
  }
  for (let i = 0; i < 10; i++) list.push([cx + (H(i + 90) - 0.5) * R * 1.8, cy + Ry * (0.3 + H(i + 91) * 0.4), i + 50]);
  list.sort((p, q) => q[1] - p[1]);
  for (const [x0, y0, i] of list) {
    const ox = (x0 - cx) / R;
    const x1 = x0 + ox * R * 0.5 + (H(i + 60) - 0.5) * 2;
    // a parting in front of the trunk
    const low = Math.abs(x1 - x) < 4 * s ? 0.4 : 1;
    const y1 = Math.min(gy - 3, y0 + (gy - y0) * (0.5 + H(i + 61) * 0.5) * low);
    const sun = ox * SUN.x + ((y0 - cy) / Ry) * SUN.y;
    const col = sun > 0.35 ? lighten(leaf, 0.2) : sun > -0.1 ? leaf : darken(leaf, 0.2);
    const tip = sun > 0.2 ? lighten(leaf, 0.45) : lighten(col, 0.18);
    strand(ctx, x0, y0, x1, y1, ox * R * 0.35, (1.5 + H(i + 62) * 0.6) * s, col, tip);
  }
};

// A broken pale stump with a shelf of bracket fungus and a weed rag.
const fenSnag = (ctx, x, y, s, o) => {
  const { seed, v } = o, gy = y + 8;
  const col = o.forest ? ["#9a9585", "#838075", "#6e6c64"][o.band] : DRIFT;
  shadow(ctx, x + 4 * s, gy, 8 * s, 2.6 * s, 0.26);
  const hh = (8 + hash(seed, 1) * 4) * s;
  part(ctx, (c) => {
    for (const rx of [-1, 1]) limb(c, x + rx * s, gy - 2 * s, x + rx * 5 * s, gy + 0.6, 2 * s, 0.8, col, rx);
    limb(c, x, gy, x + 0.5 * s, gy - hh, 5 * s, 4 * s, col);
    c.fillStyle = lighten(col, 0.3);
    poly(c, [[x - 1.6 * s, gy - hh + 0.6], [x - 1 * s, gy - hh - 2.5 * s], [x - 0.2 * s, gy - hh], [x + 0.8 * s, gy - hh - 1.6 * s], [x + 2.4 * s, gy - hh + 0.8]]);
    c.fill();
    c.fillStyle = darken(col, 0.45);
    px1(c, x + 1 * s, gy - hh + 2, 0.5, hh - 3);
  });
  // bracket fungus, rust and cream
  const fcol = v % 2 ? "#b0703e" : "#c8b890";
  for (let k = 0; k < 3; k++) part(ctx, (c) => ball(c, x + (k % 2 ? 2.2 : -1.8) * s, gy - (3 + k * 2.4) * s, 2.2 * s - k * 0.3, 0.9 * s, fcol, { hi: 0.4, lo: 0.4, fy: -0.9 }));
  if (v > 1) blade(ctx, x - 1.5 * s, gy - hh + 1, x - 2 * s, gy - hh + 7 * s, 0.8 * s, WEED, mix(WEED, "#8a9a6a", 0.4), 0.3);
};

// ---- the bog ----------------------------------------------------------

// Reeds and bulrushes standing in a strip of black water: tall blades,
// some straw-pale and broken, and velvet cattail heads.
const reedBed = (ctx, x, y, s, o) => {
  const { seed, v } = o, gy = y + 8;
  const H = (i) => hash(seed, i);
  // the water at their feet
  ctx.fillStyle = PEAT;
  blobPath(ctx, x + 1, gy + 0.6, 13 * s, 3.8 * s, seed, 0.18, 10); ctx.fill();
  ctx.fillStyle = BOGW;
  blobPath(ctx, x + 1, gy + 0.4, 11.5 * s, 3 * s, seed + 1, 0.18, 10); ctx.fill();
  ctx.fillStyle = rgba(BOGW_LT, 0.9);
  px1(ctx, x - 6 * s, gy - 1, 4, 0.5); px1(ctx, x + 4 * s, gy + 1.5, 3, 0.5);
  const cols = ["#5c6a44", "#6e7448", "#8a8452", "#5a6440"];
  const stand = (n, h0, h1, lighter, k0) => {
    for (let i = 0; i < n; i++) {
      const bx = x + (-10 + (i + H(k0 + i)) * (20 / n)) * s, by = gy + (H(k0 + i + 30) - 0.3) * 2;
      const hh = (h0 + H(k0 + i + 60) * (h1 - h0)) * s, lean = (H(k0 + i + 90) - 0.45) * 5 * s;
      const col = lighter ? lighten(cols[i % 4], 0.08) : darken(cols[i % 4], 0.12);
      if (H(k0 + i + 120) < 0.18) {
        // a broken blade, folded over
        const kx = bx + lean * 0.6, ky = by - hh * 0.6;
        blade(ctx, bx, by, kx, ky, 0.8 * s, darken(col, 0.2), col, 0.4);
        blade(ctx, kx, ky, kx + 4 * s * Math.sign(lean || 1), ky + 4 * s, 0.5 * s, col, "#b8ac74", 0.4);
      } else blade(ctx, bx, by, bx + lean, by - hh, 0.85 * s, darken(col, 0.25), i % 3 ? lighten(col, 0.25) : "#b8ac74", 0.45);
    }
  };
  stand(9, 13, 22, false, 0);
  // bulrushes: a stalk and a velvet head, lit on the left
  const nb = 2 + (v % 3);
  for (let i = 0; i < nb; i++) {
    const bx = x + (-7 + i * (14 / Math.max(1, nb - 1)) + (H(i + 200) - 0.5) * 3) * s;
    const hh = (17 + H(i + 210) * 7) * s, lean = (H(i + 220) - 0.5) * 3 * s;
    blade(ctx, bx, gy, bx + lean, gy - hh - 4 * s, 0.55 * s, "#4e5a38", "#8a8452", 0.5);
    part(ctx, (c) => {
      const hx = bx + lean * 0.85, hy = gy - hh;
      roundRect(c, hx - 1.3 * s, hy - 3.4 * s, 2.6 * s, 6.8 * s, 1.3 * s);
      litFill(c, hx - 1.3 * s, hx + 1.3 * s, "#5e4030", 0.3, 0.45);
    });
  }
  stand(8, 7, 14, true, 300);
};

// A small bog pool: a peat rim with moss, black water with the sky in it,
// lily pads and (on some) a pale flower, and sedge at one end.
const bogPool = (ctx, x, y, s, o) => {
  const { seed, v } = o, gy = y + 6;
  const rx = (13 + hash(seed, 1) * 3) * s, ry = (5.5 + hash(seed, 2) * 1.5) * s;
  ctx.fillStyle = mix(PEAT, MOSS, 0.35);
  blobPath(ctx, x, gy, rx + 2.5, ry + 2, seed, 0.14, 12); ctx.fill();
  ctx.fillStyle = PEAT;
  blobPath(ctx, x + 0.5, gy + 0.3, rx + 0.8, ry + 0.6, seed + 1, 0.14, 12); ctx.fill();
  ctx.save();
  blobPath(ctx, x, gy, rx, ry, seed + 2, 0.12, 12); ctx.clip();
  ctx.fillStyle = BOGW; ctx.fillRect(x - rx - 2, gy - ry - 2, rx * 2 + 4, ry * 2 + 4);
  // the far bank's shade on the water, then the cold sky
  ctx.fillStyle = rgba("#0c1210", 0.6); ctx.fillRect(x - rx - 2, gy - ry - 2, rx * 2 + 4, 1.8);
  soft(ctx, x - rx * 0.25, gy - ry * 0.1, rx * 0.6, ry * 0.45, [[0, rgba(BOGW_LT, 0.9)], [1, rgba(BOGW_LT, 0)]]);
  ctx.fillStyle = rgba("#9ab4ac", 0.7);
  px1(ctx, x - rx * 0.5, gy - ry * 0.15, 4, 0.5); px1(ctx, x - rx * 0.1, gy + ry * 0.2, 2.5, 0.5);
  ctx.restore();
  // lily pads
  const np = 2 + (v % 3);
  for (let i = 0; i < np; i++) {
    const a = hash(seed, i + 10) * Math.PI * 2, d = 0.3 + hash(seed, i + 20) * 0.45;
    lilyPad(ctx, x + Math.cos(a) * rx * d + rx * 0.15, gy + Math.sin(a) * ry * d, (2 + hash(seed, i + 30) * 0.8) * s, seed + i);
  }
  if (v % 2 === 0) {
    const fx = x + rx * 0.3, fy = gy - ry * 0.1;
    for (let k = 0; k < 5; k++) { const a = k * 1.256; ball(ctx, fx + Math.cos(a) * 0.9, fy - 0.5 + Math.sin(a) * 0.55, 0.8, 0.6, "#ece4dc", { hi: 0.3, lo: 0.2 }); }
    ball(ctx, fx, fy - 0.6, 0.5, 0.45, "#e0c060", { hi: 0.2, lo: 0.2 });
  }
  // sedge standing at the reedy end, moss on the lip
  for (let k = 0; k < 3; k++) sedge(ctx, x - rx * (0.95 - k * 0.12), gy - ry * 0.3 + k * 1.6, 0.7 + k * 0.1, seed + k, 4);
  ctx.fillStyle = MOSS_LT;
  for (let k = 0; k < 5; k++) px1(ctx, x - rx * 0.5 + hash(seed, k + 80) * rx * 1.4, gy + ry + 0.8 + hash(seed, k + 81), 1, 0.5);
};

// ---- stones of the dead ---------------------------------------------

// a stone slab standing up: its top edge seen from above (a paler sliver),
// then its face, lit from the left
const standing = (c, pts, col, top = 1.4) => {
  poly(c, pts.map(([x, y]) => [x, y - top]));
  c.fillStyle = lighten(col, 0.42); c.fill();
  poly(c, pts);
  const xs = pts.map((p) => p[0]);
  litFill(c, Math.min(...xs), Math.max(...xs), col, 0.26, 0.42);
};
// lichen and moss on a stone's face
const weather = (c, x, y, w, h, seed, mossy = 0.5) => {
  c.fillStyle = LICHEN;
  for (let k = 0; k < 3; k++) px1(c, x - w * 0.4 + hash(seed, k + 1) * w * 0.7, y - h * (0.3 + hash(seed, k + 4) * 0.6), 1, 0.5);
  c.fillStyle = "#c8a860";
  px1(c, x - w * 0.2 + hash(seed, 9) * w * 0.4, y - h * 0.55, 0.5, 0.5);
  if (hash(seed, 10) < mossy) {
    c.fillStyle = MOSS;
    for (let k = 0; k < 4; k++) px1(c, x - w * 0.5 + k * w * 0.22, y - 0.8 - hash(seed, k + 12) * 2.2, 1, 0.5 + hash(seed, k + 14) * 1.5);
    c.fillStyle = MOSS_LT;
    px1(c, x - w * 0.45, y - 1.5, 1, 0.5);
  }
};

const fenGrave = (ctx, x, y, s, o) => {
  const { seed, v } = o, gy = y + 8;
  const kind = v % 4;
  const col = mix(STONE, ["#8a8c80", "#90887a", "#7e8480", "#888a7c"][hash(seed, 3) * 4 | 0], 0.5);
  shadow(ctx, x + 4 * s, gy, 9 * s, 2.8 * s, 0.28);
  const lean = (hash(seed, 1) - 0.5) * 0.26;
  const stoneAt = (sx, k, form, sd, ln) => {
    ctx.save(); ctx.translate(sx, gy); ctx.rotate(ln);
    const w = 5 * k, h = 14 * k;
    part(ctx, (c) => {
      if (form === "round") {
        c.beginPath(); c.moveTo(-w, 0); c.lineTo(-w, -h + w); c.arc(0, -h + w, w, Math.PI, 0); c.lineTo(w, 0); c.closePath();
        const face = new Path2D(); face.moveTo(-w, 0); face.lineTo(-w, -h + w); face.arc(0, -h + w, w, Math.PI, 0); face.lineTo(w, 0); face.closePath();
        c.save(); c.translate(0, -1.3 * k); c.fillStyle = lighten(col, 0.42); c.fill(face); c.restore();
        c.fillStyle = lin(c, -w, 0, w, 0, [[0, lighten(col, 0.26)], [0.5, col], [1, darken(col, 0.42)]]); c.fill(face);
      } else if (form === "gable") {
        standing(c, [[-w, 0], [-w, -h + 3 * k], [0, -h], [w, -h + 3 * k], [w, 0]], col, 1.3 * k);
      } else {
        standing(c, [[-w * 0.9, 0], [-w, -h * 0.8], [-w * 0.6, -h], [w * 0.7, -h * 0.96], [w, -h * 0.75], [w * 0.9, 0]], col, 1.3 * k);
      }
      // the carving: a ring cross, or lines of a worn name
      c.fillStyle = darken(col, 0.5);
      if (hash(sd, 5) < 0.5) {
        px1(c, -0.25, -h + 3.5 * k, 0.5, 5 * k); px1(c, -2 * k, -h + 5.2 * k, 4 * k, 0.5);
        c.strokeStyle = darken(col, 0.5); c.lineWidth = 0.5;
        c.beginPath(); c.arc(0, -h + 5.4 * k, 1.5 * k, 0, Math.PI * 2); c.stroke();
      } else {
        for (let r = 0; r < 3; r++) px1(c, -3 * k, -h + (5 + r * 2.2) * k, (5 - r * 1.2) * k, 0.5);
      }
      c.fillStyle = lighten(col, 0.4);
      px1(c, -w + 0.5, -h * 0.7, 0.5, 2);
      // a crack from the top
      c.fillStyle = darken(col, 0.55);
      for (let t = 0; t < 5; t++) px1(c, w * 0.3 + Math.sin(t + sd) * 0.5, -h + 1 + t * 1.2, 0.5, 0.5);
      weather(c, 0, 0, w * 2, h, sd);
    });
    ctx.restore();
  };
  if (kind === 0) stoneAt(x, s, "round", seed, lean);
  else if (kind === 1) {
    // a ring cross, the ring standing proud of the arms
    ctx.save(); ctx.translate(x, gy); ctx.rotate(lean * 0.6);
    part(ctx, (c) => {
      const k = s, top = -21 * k;
      const shape = (dy) => {
        c.beginPath();
        c.rect(-2 * k, top + 3 * k + dy, 4 * k, -top - 3 * k);
        c.rect(-6.5 * k, top + 6.5 * k + dy, 13 * k, 3.4 * k);
        c.moveTo(4.8 * k, top + 8.2 * k + dy); c.arc(0, top + 8.2 * k + dy, 4.8 * k, 0, Math.PI * 2);
        c.moveTo(3.2 * k, top + 8.2 * k + dy); c.arc(0, top + 8.2 * k + dy, 3.2 * k, 0, Math.PI * 2, true);
        c.moveTo(-2 * k, top + dy + 3 * k); c.rect(-2 * k, top + dy, 4 * k, 4 * k);
      };
      shape(-1.2 * k); c.fillStyle = lighten(col, 0.42); c.fill("nonzero");
      shape(0); c.fillStyle = lin(c, -6 * k, 0, 6 * k, 0, [[0, lighten(col, 0.26)], [0.5, col], [1, darken(col, 0.42)]]); c.fill("nonzero");
      // the socket stone it stands in
      standing(c, [[-4.5 * k, 0.8], [-4 * k, -2.5 * k], [4 * k, -2.5 * k], [4.5 * k, 0.8]], darken(col, 0.08), 1.6 * k);
      c.fillStyle = darken(col, 0.5);
      px1(c, -0.25, top + 7 * k, 0.5, 2.5 * k);
      weather(c, 0, -2 * k, 8 * k, 18 * k, seed);
    });
    ctx.restore();
  } else if (kind === 2) {
    // broken: the stump still standing, its top face-up in the grass
    part(ctx, (c) => {
      const w = 5 * s;
      standing(c, [[x - w, gy], [x - w, gy - 8 * s], [x - 3 * s, gy - 9.5 * s], [x - 1 * s, gy - 7.2 * s], [x + 1.5 * s, gy - 9.8 * s], [x + 3 * s, gy - 8 * s], [x + w, gy - 8.6 * s], [x + w, gy]], col, 1.2 * s);
      weather(c, x, gy, w * 2, 8 * s, seed, 0.9);
    });
    part(ctx, (c) => {
      poly(c, [[x + 6 * s, gy + 1.5], [x + 15 * s, gy - 1.4 * s], [x + 17 * s, gy + 2 * s], [x + 8 * s, gy + 4.6 * s]]);
      c.fillStyle = lin(c, x + 6 * s, gy - 1, x + 17 * s, gy + 4, [[0, lighten(col, 0.3)], [0.6, lighten(col, 0.12)], [1, col]]); c.fill();
      poly(c, [[x + 8 * s, gy + 4.6 * s], [x + 17 * s, gy + 2 * s], [x + 17 * s, gy + 3.2 * s], [x + 8 * s, gy + 5.8 * s]]);
      c.fillStyle = darken(col, 0.4); c.fill();
      c.fillStyle = darken(col, 0.45);
      for (let r = 0; r < 2; r++) px1(c, x + (9 + r) * s, gy + (1.8 - r * 0.8) * s, 5 * s, 0.5);
      c.fillStyle = MOSS; px1(c, x + 15 * s, gy - 0.4 * s, 1.5, 1);
    });
  } else {
    // a crooked pair and a sunken footstone
    stoneAt(x - 5 * s, s * 0.78, "gable", seed + 1, lean - 0.08);
    stoneAt(x + 5 * s, s * 0.64, "round", seed + 2, lean + 0.14);
    part(ctx, (c) => standing(c, [[x - 1.5 * s, gy + 3.5], [x - 1.5 * s, gy + 1], [x + 2 * s, gy + 0.8], [x + 2 * s, gy + 3.5]], darken(col, 0.05), 0.8));
  }
};

// A cairn of flat fen stones, each its own lit slab, moss in the joints,
// a skull or a standing slab on top.
const fenCairn = (ctx, x, y, s, o) => {
  const { seed, v } = o, gy = y + 8;
  shadow(ctx, x + 5 * s, gy, 12 * s, 3.4 * s, 0.28);
  const tiers = [[0, 9.5, 3.4], [-0.6, 8, 3.1], [0.9, 6.4, 2.9], [-0.4, 5, 2.6], [0.4, 3.6, 2.2]];
  let yy = gy - 2.6 * s;
  tiers.forEach(([dx, wr, hr], i) => {
    const cx = x + dx * s + (hash(seed, i) - 0.5) * 1.2 * s;
    const col = mix(STONE, i % 2 ? "#9a9484" : "#7e8478", 0.4);
    part(ctx, (c) => {
      blobPath(c, cx, yy, wr * s, hr * s, seed + i * 7, 0.14, 10);
      c.fillStyle = darken(col, 0.4); c.fill();
      c.save(); blobPath(c, cx, yy, wr * s, hr * s, seed + i * 7, 0.14, 10); c.clip();
      blobPath(c, cx - 0.6 * s, yy - 1.1 * s, wr * s * 0.96, hr * s * 0.72, seed + i * 7 + 1, 0.14, 10);
      c.fillStyle = col; c.fill();
      blobPath(c, cx - 1.6 * s, yy - 1.6 * s, wr * s * 0.6, hr * s * 0.4, seed + i * 7 + 2, 0.2, 8);
      c.fillStyle = lighten(col, 0.3); c.fill();
      c.restore();
      if (i < 2) { c.fillStyle = MOSS; px1(c, cx - wr * s * 0.6, yy + hr * s * 0.4, 2, 0.5); px1(c, cx + wr * 0.3 * s, yy + hr * 0.5 * s, 1.5, 0.5); }
      c.fillStyle = LICHEN; px1(c, cx - wr * 0.3 * s, yy - hr * 0.5 * s, 1, 0.5);
    });
    yy -= hr * s * 1.25;
  });
  if (v % 2) part(ctx, (c) => skull(c, x + 0.4 * s, yy - 0.6 * s, 2.6 * s));
  else part(ctx, (c) => standing(c, [[x - 1.8 * s, yy + 1.5 * s], [x - 2 * s, yy - 5 * s], [x - 0.4 * s, yy - 7 * s], [x + 1.8 * s, yy - 5.5 * s], [x + 2 * s, yy + 1.5 * s]], STONE, 1));
};

// A drowned soldier's bones: a ribcage half-sunk in the turf, a skull, long
// bones, and a rusted helm or a sword standing where it fell.
const fenBones = (ctx, x, y, s, o) => {
  const { seed, v } = o, gy = y + 7;
  ctx.fillStyle = rgba(PEAT, 0.55);
  blobPath(ctx, x + 1, gy + 1, 12 * s, 4 * s, seed, 0.2, 10); ctx.fill();
  const flip = v % 2 ? -1 : 1;
  part(ctx, (c) => {
    // ribs: arcs rising from a buried spine, pairs curving toward each other
    c.lineCap = "round";
    c.strokeStyle = darken(BONE, 0.3); c.lineWidth = 1.2 * s;
    c.beginPath(); c.moveTo(x + flip * -6 * s, gy + 0.5); c.lineTo(x + flip * 5 * s, gy + 0.2); c.stroke();
    for (let i = 0; i < 4; i++) {
      const bx = x + flip * (-4.5 + i * 3) * s, h = (6.5 - Math.abs(i - 1.2) * 1.1) * s;
      for (const [sd, lt] of [[1, false], [-1, true]]) {
        c.strokeStyle = lt ? BONE : darken(BONE, 0.22); c.lineWidth = (lt ? 1 : 1.1) * s;
        c.beginPath(); c.moveTo(bx, gy + 0.4); c.quadraticCurveTo(bx + sd * 3.4 * s, gy - h * 0.55, bx + sd * 1.2 * s, gy - h); c.stroke();
      }
    }
    longBone(c, x + flip * -7 * s, gy + 1.2, x + flip * 5 * s, gy + 1.8, 1.3 * s);
  });
  part(ctx, (c) => longBone(c, x + flip * 2 * s, gy + 4 * s, x + flip * 10 * s, gy + 2.5 * s, 1.4 * s));
  if (v === 1 || v === 2) {
    // a rusted helm, dented, tipped on its side
    part(ctx, (c) => {
      const hx = x + flip * 8 * s, hy = gy - 1.2 * s;
      ball(c, hx, hy, 3.6 * s, 3 * s, "#6a5a4c", { hi: 0.35, lo: 0.5 });
      c.fillStyle = "#8a5a36"; px1(c, hx - 1.5 * s, hy - 1.4 * s, 1.5, 0.5); px1(c, hx + 0.5 * s, hy + 0.2, 1, 0.5);
      c.fillStyle = "#2a2226"; roundRect(c, hx - 2.2 * s, hy - 0.2, 4.4 * s, 1 * s, 0.4); c.fill();
    });
  } else if (v === 3) {
    // a sword standing where it fell, rust eating the blade
    part(ctx, (c) => {
      const sx = x + flip * 9 * s;
      poly(c, [[sx - 0.9 * s, gy + 1], [sx - 0.8 * s, gy - 11 * s], [sx, gy - 12.2 * s], [sx + 0.8 * s, gy - 11 * s], [sx + 0.9 * s, gy + 1]]);
      litFill(c, sx - 1 * s, sx + 1 * s, "#8a8a88", 0.3, 0.45);
      c.fillStyle = "#8a5a36"; px1(c, sx - 0.5, gy - 5 * s, 1, 1.5); px1(c, sx, gy - 8 * s, 0.5, 1);
      roundRect(c, sx - 3.2 * s, gy - 13.6 * s, 6.4 * s, 1.3 * s, 0.5); litFill(c, sx - 3 * s, sx + 3 * s, BRONZE);
      roundRect(c, sx - 0.7 * s, gy - 17 * s, 1.4 * s, 3.6 * s, 0.5); litFill(c, sx - 0.7 * s, sx + 0.7 * s, "#5a4030");
      ball(c, sx, gy - 17.4 * s, 1.1 * s, 1 * s, BRONZE, { hi: 0.4, lo: 0.4 });
    });
  }
  part(ctx, (c) => skull(c, x + flip * -9.5 * s, gy - 1.4 * s, 3.1 * s));
  sedge(ctx, x + flip * 11 * s, gy + 2, 0.7, seed, 4);
};

// ---- the old kingdom ------------------------------------------------

// A king of the drowned court, sunk to the chest in a peat pool and tilted
// where the fen let him down; his sword held point-down before him and his
// crown gone green. The other variant: his fallen head, cheek to the mud.
const fenStatue = (ctx, x, y, s, o) => {
  const { seed, v } = o, gy = y + 8;
  const col = mix(STONE, "#a09c8c", 0.45);
  // the pool he stands in
  shadow(ctx, x + 6 * s, gy + 1, 16 * s, 4 * s, 0.28);
  ctx.fillStyle = mix(PEAT, MOSS, 0.3);
  blobPath(ctx, x, gy, 15 * s, 5.2 * s, seed, 0.12, 12); ctx.fill();
  ctx.fillStyle = BOGW;
  blobPath(ctx, x + 0.5, gy, 13 * s, 4.2 * s, seed + 1, 0.12, 12); ctx.fill();
  ctx.fillStyle = rgba(BOGW_LT, 0.9); px1(ctx, x - 10 * s, gy - 1.5, 5, 0.5); px1(ctx, x + 6 * s, gy + 2, 3, 0.5);
  if (v % 2 === 0) {
    ctx.save(); ctx.translate(x, gy); ctx.rotate(((hash(seed, 1) - 0.5) * 0.2) + (v === 2 ? -0.14 : 0.1));
    // the torso rising out of the water, a cloak over the shoulders
    part(ctx, (c) => {
      poly(c, [[-8.4 * s, 0], [-9 * s, -8 * s], [-7.6 * s, -12 * s], [-3 * s, -13.6 * s], [3 * s, -13.6 * s], [7.6 * s, -12 * s], [9 * s, -8 * s], [8.4 * s, 0]]);
      litFill(c, -9 * s, 9 * s, col);
      c.fillStyle = darken(col, 0.35);
      for (const fx of [-6.5, -4.5, 5, 7]) px1(c, fx * s, -7 * s, 0.5, 7 * s);
      c.fillStyle = lighten(col, 0.3); px1(c, -8 * s, -11.5 * s, 3 * s, 0.5);
    });
    // the sword, point-down into the water, and the hands on its pommel
    part(ctx, (c) => {
      poly(c, [[-0.9 * s, -7 * s], [0.9 * s, -7 * s], [0.7 * s, 0], [-0.7 * s, 0]]);
      litFill(c, -1 * s, 1 * s, lighten(col, 0.12));
      roundRect(c, -3.8 * s, -8.2 * s, 7.6 * s, 1.5 * s, 0.6); litFill(c, -3.8 * s, 3.8 * s, col);
    });
    for (const sd of [-1, 1]) part(ctx, (c) => {
      limb(c, sd * 6.8 * s, -11.5 * s, sd * 1.4 * s, -9.4 * s, 3 * s, 2.4 * s, col, sd * 0.8 * s);
      ball(c, sd * 1.1 * s, -9.6 * s, 1.6 * s, 1.4 * s, lighten(col, 0.08), { hi: 0.4, lo: 0.4 });
    });
    // head, beard and crown
    part(ctx, (c) => {
      ball(c, 0, -17.2 * s, 4 * s, 4.3 * s, col, { hi: 0.4, lo: 0.5 });
      // the beard, square-cut over the chest
      poly(c, [[-3 * s, -16 * s], [3 * s, -16 * s], [2.6 * s, -12.6 * s], [-2.6 * s, -12.6 * s]]);
      litFill(c, -3 * s, 3 * s, darken(col, 0.04));
      c.fillStyle = darken(col, 0.3);
      for (const bx of [-1.6, 0, 1.6]) px1(c, bx * s, -15 * s, 0.5, 2 * s);
      // brow, eyes, nose, a stern mouth
      c.fillStyle = darken(col, 0.55);
      px1(c, -2.6 * s, -18.6 * s, 2 * s, 0.5); px1(c, 0.8 * s, -18.6 * s, 2 * s, 0.5);
      px1(c, -2 * s, -18 * s, 1, 1); px1(c, 1.2 * s, -18 * s, 1, 1);
      px1(c, -0.4 * s, -16.9 * s, 1, 0.5);
      c.fillStyle = darken(col, 0.3); px1(c, 0.2 * s, -18 * s, 0.5, 1.5);
      c.fillStyle = lighten(col, 0.35); px1(c, -3.2 * s, -19 * s, 0.5, 2); px1(c, -0.4 * s, -18.2 * s, 0.5, 1);
    });
    part(ctx, (c) => {
      const cy = -21 * s;
      poly(c, [[-3.9 * s, cy + 1.6 * s], [-4 * s, cy - 1.8 * s], [-2.6 * s, cy - 0.3 * s], [-1.3 * s, cy - 2.6 * s], [0, cy - 0.5 * s], [1.3 * s, cy - 2.6 * s], [2.6 * s, cy - 0.3 * s], [4 * s, cy - 1.8 * s], [3.9 * s, cy + 1.6 * s]]);
      litFill(c, -4 * s, 4 * s, VERDI, 0.4, 0.4);
      c.fillStyle = "#a8d8c0"; px1(c, -3 * s, cy - 0.3, 1, 0.5);
      c.fillStyle = BRONZE; px1(c, -0.5, cy + 0.4, 1, 0.5);
    });
    // verdigris tears and moss run down from the crown
    ctx.fillStyle = rgba(VERDI, 0.8);
    px1(ctx, -2.6 * s, -18 * s, 0.5, 5 * s); px1(ctx, 2.8 * s, -17 * s, 0.5, 4 * s); px1(ctx, 3.4 * s, -13 * s, 0.5, 5 * s);
    ctx.fillStyle = MOSS;
    for (let k = 0; k < 5; k++) px1(ctx, (-7 + k * 3.2) * s, -2 * s - hash(seed, k) * 4 * s, 1, 1 + hash(seed, k + 9) * 3);
    ctx.restore();
    // weed caught round him at the waterline
    for (let k = 0; k < 4; k++) blade(ctx, x + (-8 + k * 5) * s, gy - 0.5, x + (-8 + k * 5) * s + 1, gy - 5 * s, 0.7 * s, WEED, "#7a8a5a", 0.4);
  } else {
    // the fallen head, crown slipping off, one eye above the water
    part(ctx, (c) => {
      blobPath(c, x, gy - 7 * s, 11 * s, 9 * s, seed, 0.06, 12);
      c.fillStyle = rad(c, x - 4 * s, gy - 12 * s, 1, x, gy - 7 * s, 12 * s, [[0, lighten(col, 0.3)], [0.55, col], [1, darken(col, 0.42)]]);
      c.fill();
      // the face, turned toward us and tipped
      c.fillStyle = darken(col, 0.45);
      poly(c, [[x - 6 * s, gy - 9.5 * s], [x - 1 * s, gy - 11 * s], [x - 1 * s, gy - 10.4 * s], [x - 6 * s, gy - 9 * s]]); c.fill();
      poly(c, [[x + 1.5 * s, gy - 11.2 * s], [x + 6 * s, gy - 10.6 * s], [x + 6 * s, gy - 10 * s], [x + 1.5 * s, gy - 10.6 * s]]); c.fill();
      px1(c, x - 4.5 * s, gy - 8.6 * s, 2.5 * s, 0.5); px1(c, x + 2.5 * s, gy - 9 * s, 2.5 * s, 0.5);
      poly(c, [[x - 0.4 * s, gy - 9.5 * s], [x + 1.4 * s, gy - 5 * s], [x - 1.2 * s, gy - 4.6 * s]]);
      c.fillStyle = darken(col, 0.25); c.fill();
      c.fillStyle = darken(col, 0.5); px1(c, x - 2.5 * s, gy - 2.6 * s, 5 * s, 0.5);
      c.fillStyle = lighten(col, 0.35); px1(c, x - 1.6 * s, gy - 8 * s, 1, 1.5);
      c.fillStyle = MOSS;
      for (let k = 0; k < 6; k++) px1(c, x - 8 * s + k * 2.6 * s, gy - 15 * s + Math.abs(k - 2.5) * 0.8 * s, 1.5, 1);
    });
    part(ctx, (c) => {
      const cx = x + 7 * s, cy = gy - 14 * s;
      c.save(); c.translate(cx, cy); c.rotate(0.55);
      poly(c, [[-5 * s, 2 * s], [-5.2 * s, -2 * s], [-3.4 * s, -0.4 * s], [-1.7 * s, -3 * s], [0, -0.6 * s], [1.7 * s, -3 * s], [3.4 * s, -0.4 * s], [5.2 * s, -2 * s], [5 * s, 2 * s]]);
      litFill(c, -5 * s, 5 * s, VERDI, 0.4, 0.4);
      c.fillStyle = "#a8d8c0"; px1(c, -3.5 * s, 0, 1, 0.5);
      c.restore();
    });
    for (let k = 0; k < 3; k++) blade(ctx, x - 11 * s + k * 2, gy + 0.5, x - 12 * s + k * 2.5, gy - 7 * s, 0.8 * s, "#5c6a44", "#a09a62", 0.4);
  }
};

// ---- lights: baked bodies, live flames --------------------------------

const BODIES = new Map();
// a live piece's still body, baked once per (type, variant, size)
const body = (key, bw, bh, ox, oy, paint) => {
  let b = BODIES.get(key);
  if (!b) {
    b = { cv: bakeSprite(bw, bh, (c) => paint(c, ox, oy)), bw, bh, ox, oy };
    // tufts of sedge round the foot, after the ink
    BODIES.set(key, b);
  }
  return b;
};
const stampBody = (ctx, b, x, y) => ctx.drawImage(b.cv, x - b.ox, y - b.oy, b.bw, b.bh);

// a witch-fire flame: a teardrop, white-hot at the heart, flickering
const witchFlame = (ctx, x, y, r, time, ph, a = 1) => {
  const f = 0.75 + 0.25 * Math.sin(time * 9 + ph) + 0.1 * Math.sin(time * 23 + ph * 2);
  glow(ctx, x, y - r * 0.5, r * 5.5, TEAL, 0.16 * a * f);
  const h = r * 2.6 * f, lean = Math.sin(time * 3.1 + ph) * r * 0.35;
  ctx.fillStyle = rgba("#3aa888", 0.85 * a);
  ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x - r, y - h * 0.5, x + lean, y - h); ctx.quadraticCurveTo(x + r, y - h * 0.5, x + r, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(TEAL, a);
  ctx.beginPath(); ctx.moveTo(x - r * 0.6, y); ctx.quadraticCurveTo(x - r * 0.6, y - h * 0.4, x + lean * 0.8, y - h * 0.75); ctx.quadraticCurveTo(x + r * 0.6, y - h * 0.4, x + r * 0.6, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba("#eafff4", a);
  ctx.fillRect(ap(x - 0.5), ap(y - h * 0.35), 1, 1);
};

// Corpse-candles. v even: an iron lantern hung from a crooked stake; v odd:
// a skull on a flat stone, three tallow candles guttering on it.
const candleBody = (c, ox, oy, v, s) => {
  const x = ox, gy = oy;
  shadow(c, x + 4 * s, gy, 8 * s, 2.4 * s, 0.28);
  if (v % 2 === 0) {
    const wood = "#4d4238";
    part(c, (cc) => {
      limb(cc, x, gy + 0.5, x + 0.8 * s, gy - 24 * s, 2.4 * s, 1.8 * s, wood, 0.8 * s, { hi: 0.4 });
      limb(cc, x + 0.6 * s, gy - 22 * s, x + 8 * s, gy - 24.5 * s, 1.4 * s, 1 * s, wood, -0.6 * s, { hi: 0.4 });
      cc.fillStyle = darken(wood, 0.45); px1(cc, x + 0.8 * s, gy - 16 * s, 0.5, 8);
    });
    // the chain and the cage
    c.fillStyle = "#2e2a30";
    for (let k = 0; k < 3; k++) px1(c, x + 7.5 * s, gy - 24 * s + k * 1.1, 0.5, 0.6);
    part(c, (cc) => {
      const lx = x + 7.7 * s, ly = gy - 17.5 * s;
      cc.fillStyle = rgba("#1a2420", 1); roundRect(cc, lx - 2.2 * s, ly - 3.2 * s, 4.4 * s, 5.6 * s, 0.8); cc.fill();
      cc.fillStyle = "#3a3438";
      poly(cc, [[lx - 2.8 * s, ly - 3 * s], [lx, ly - 5 * s], [lx + 2.8 * s, ly - 3 * s]]); cc.fill();
      cc.fillRect(lx - 2.6 * s, ly + 2.2 * s, 5.2 * s, 1);
      cc.fillStyle = "#4a4448";
      px1(cc, lx - 2.2 * s, ly - 3 * s, 0.5, 5.4 * s); px1(cc, lx + 1.8 * s, ly - 3 * s, 0.5, 5.4 * s); px1(cc, lx - 0.25, ly - 3 * s, 0.5, 5.4 * s);
      cc.fillStyle = "#6a5a4c"; px1(cc, lx - 2.6 * s, ly - 3.2 * s, 1, 0.5);
    });
    // a skull nailed to the stake, sedge at its foot
    part(c, (cc) => skull(cc, x + 0.6 * s, gy - 14 * s, 1.9 * s));
    for (let k = 0; k < 2; k++) sedge(c, x + (k ? 3 : -3) * s, gy + 0.5, 0.65, 11 + k * 5, 4);
  } else {
    part(c, (cc) => {
      blobPath(cc, x, gy - 1.2 * s, 9 * s, 3 * s, 7, 0.12, 10);
      cc.fillStyle = darken(STONE, 0.35); cc.fill();
      blobPath(cc, x - 0.4, gy - 2.2 * s, 8.4 * s, 2.4 * s, 8, 0.12, 10);
      cc.fillStyle = lin(cc, x - 8 * s, 0, x + 8 * s, 0, [[0, lighten(STONE, 0.3)], [0.6, STONE], [1, darken(STONE, 0.2)]]); cc.fill();
    });
    // the candles, drips running down, then the skull between them
    for (const [cx, hh] of [[-5.2, 6], [5, 8.5], [2.6, 4.5]]) {
      part(c, (cc) => {
        roundRect(cc, x + cx * s - 1 * s, gy - 2.4 * s - hh * s, 2 * s, hh * s, 0.5);
        litFill(cc, x + cx * s - 1 * s, x + cx * s + 1 * s, "#d8ceb0", 0.3, 0.4);
        cc.fillStyle = "#efe6cc"; px1(cc, x + cx * s - 1 * s, gy - 2.4 * s - hh * s + 1.5, 0.5, 2);
        cc.fillStyle = "#b8ae90"; px1(cc, x + cx * s + 0.5 * s, gy - 2.4 * s - 1.5, 0.5, 1.5);
      });
    }
    part(c, (cc) => skull(cc, x - 0.8 * s, gy - 5.2 * s, 2.9 * s));
    // wax pooled on the stone
    c.fillStyle = "#cfc4a4"; px1(c, x + 3 * s, gy - 2.6 * s, 3, 0.5); px1(c, x - 6 * s, gy - 2.4 * s, 2.5, 0.5);
  }
};
const CANDLE_FLAMES = [[[7.7, -18]], [[-5.2, -8.4], [5, -10.9], [2.6, -6.9]]];
const fenCandle = (ctx, x, y, s, o) => {
  const v = (o.v || 0) % 2, gy = y + 8, t = o.time || 0;
  const key = `candle|${v}|${s}`;
  const b = body(key, 30 * s + 8, 34 * s + 12, 12 * s + 4, 30 * s + 6, (c, ox, oy) => candleBody(c, ox, oy, v, s));
  stampBody(ctx, b, x, gy);
  // the light on the ground beneath
  soft(ctx, x + (v ? 0 : 7 * s), gy + 1, 11 * s, 3.4 * s, [[0, rgba(TEAL, 0.14)], [1, rgba(TEAL, 0)]]);
  CANDLE_FLAMES[v].forEach(([fx, fy], i) => witchFlame(ctx, x + fx * s, gy + fy * s, v ? 0.9 * s : 1.2 * s, t, x * 0.3 + i * 2.1));
};

// A broken wayside shrine of the old kingdom: a stepped plinth, two
// pillars, a pediment snapped off on one side (the piece lying beside it)
// and in its dark niche a small bronze idol with a votive of witch-fire.
const shrineBody = (c, ox, oy, s) => {
  const x = ox, gy = oy, col = mix(STONE, "#9c968a", 0.4);
  shadow(c, x + 6 * s, gy, 15 * s, 3.6 * s, 0.3);
  // the fallen piece of pediment, in the grass to the right
  part(c, (cc) => standing(cc, [[x + 11 * s, gy + 2], [x + 12 * s, gy - 2.5 * s], [x + 18 * s, gy - 1 * s], [x + 18.5 * s, gy + 2]], col, 1.6 * s));
  part(c, (cc) => {
    // steps
    standing(cc, [[x - 11 * s, gy], [x - 11 * s, gy - 2.4 * s], [x + 11 * s, gy - 2.4 * s], [x + 11 * s, gy]], darken(col, 0.06), 2.4 * s);
    standing(cc, [[x - 9 * s, gy - 2.6 * s], [x - 9 * s, gy - 4.8 * s], [x + 9 * s, gy - 4.8 * s], [x + 9 * s, gy - 2.6 * s]], col, 1.6 * s);
  });
  // the niche's dark, then the pillars either side of it
  c.fillStyle = "#16141a"; c.fillRect(x - 5.5 * s, gy - 18 * s, 11 * s, 13.4 * s);
  c.fillStyle = "#22202a"; c.fillRect(x - 5.5 * s, gy - 18 * s, 11 * s, 2);
  for (const px of [-8, 5]) part(c, (cc) => {
    roundRect(cc, x + px * s, gy - 19 * s, 3 * s, 14.4 * s, 0.6);
    litFill(cc, x + px * s, x + (px + 3) * s, col, 0.3, 0.45);
    cc.fillStyle = darken(col, 0.4); px1(cc, x + (px + 2) * s, gy - 17 * s, 0.5, 11 * s);
    cc.fillStyle = lighten(col, 0.3); cc.fillRect(x + (px - 0.4) * s, gy - 19.6 * s, 3.8 * s, 1.2 * s);
  });
  // the pediment: whole on the left, snapped away on the right
  part(c, (cc) => {
    poly(cc, [[x - 10 * s, gy - 18.6 * s], [x - 10 * s, gy - 20.6 * s], [x - 0.5 * s, gy - 27 * s], [x + 2.4 * s, gy - 25 * s], [x + 1.2 * s, gy - 23.4 * s], [x + 4 * s, gy - 22.4 * s], [x + 3.4 * s, gy - 20.6 * s], [x + 7.5 * s, gy - 20.4 * s], [x + 7.5 * s, gy - 18.6 * s]]);
    litFill(cc, x - 10 * s, x + 7.5 * s, col, 0.3, 0.4);
    cc.fillStyle = lighten(col, 0.4);
    poly(cc, [[x - 10 * s, gy - 20.6 * s], [x - 0.5 * s, gy - 27 * s], [x - 0.5 * s, gy - 26 * s], [x - 9 * s, gy - 20.2 * s]]); cc.fill();
    cc.fillStyle = darken(col, 0.45);
    px1(cc, x - 8 * s, gy - 19.4 * s, 15 * s, 0.5);
    ball(cc, x - 3 * s, gy - 21.8 * s, 1.1 * s, 1.1 * s, darken(col, 0.35), { hi: 0, lo: 0.2 });
    cc.fillStyle = MOSS; px1(cc, x - 9 * s, gy - 20.4 * s, 2, 1); px1(cc, x - 5 * s, gy - 23.4 * s, 1.5, 0.5);
  });
  // the idol: a small hooded figure in tarnished bronze
  part(c, (cc) => {
    poly(cc, [[x - 2.4 * s, gy - 5.4 * s], [x - 1.8 * s, gy - 11 * s], [x, gy - 13.6 * s], [x + 1.8 * s, gy - 11 * s], [x + 2.4 * s, gy - 5.4 * s]]);
    litFill(cc, x - 2.4 * s, x + 2.4 * s, BRONZE, 0.35, 0.5);
    cc.fillStyle = VERDI; px1(cc, x - 1.4 * s, gy - 10 * s, 1, 3); px1(cc, x + 0.6 * s, gy - 8 * s, 0.5, 2.5);
    cc.fillStyle = "#1a1418"; px1(cc, x - 0.8 * s, gy - 11.4 * s, 1.6 * s, 1);
  });
  // weed and moss at the foot, a candle stub on the step
  for (let k = 0; k < 3; k++) sedge(c, x + (-12 + k * 11) * s, gy + 1, 0.7, 31 + k, 4);
  part(c, (cc) => { roundRect(cc, x + 6 * s, gy - 7.8 * s, 1.6 * s, 3 * s, 0.4); litFill(cc, x + 6 * s, x + 7.6 * s, "#d8ceb0"); });
};
const fenShrine = (ctx, x, y, s, o) => {
  const gy = y + 8, t = o.time || 0;
  const b = body(`shrine|${s}`, 44 * s + 8, 36 * s + 12, 16 * s + 4, 32 * s + 6, (c, ox, oy) => shrineBody(c, ox, oy, s));
  stampBody(ctx, b, x, gy);
  // the idol's witch-light pooling in the niche, and the stub's flame
  glow(ctx, x, gy - 9 * s, 7 * s, TEAL, 0.14 + 0.06 * Math.sin(t * 1.7 + x));
  witchFlame(ctx, x + 6.8 * s, gy - 7.8 * s, 0.8 * s, t, x * 0.2);
};

// The court's bell-stones: a bronze bell gone green, hung under a lintel
// on two leaning stones (v even) or from an iron arm on a single menhir.
// It stirs by itself, and the runes cut in the stones answer it.
const bellBody = (c, ox, oy, v, s) => {
  const x = ox, gy = oy, col = mix(STONE, "#7c7e7a", 0.5);
  shadow(c, x + 6 * s, gy, 14 * s, 3.4 * s, 0.3);
  if (v % 2 === 0) {
    for (const [sx, ln] of [[-8.5, 0.06], [8.5, -0.06]]) part(c, (cc) => {
      cc.save(); cc.translate(x + sx * s, gy); cc.rotate(ln);
      standing(cc, [[-3.2 * s, 0.5], [-3.4 * s, -18 * s], [-2 * s, -21 * s], [2.2 * s, -21 * s], [3.4 * s, -18.4 * s], [3.2 * s, 0.5]], col, 1.4 * s);
      cc.fillStyle = darken(col, 0.5);
      for (let k = 0; k < 3; k++) { px1(cc, -1 * s, -15 * s + k * 4 * s, 2 * s, 0.5); px1(cc, -1 * s, -15 * s + k * 4 * s, 0.5, 2 * s); }
      weather(cc, 0, 0, 6 * s, 20 * s, 41 + sx, 0.8);
      cc.restore();
    });
    part(c, (cc) => standing(cc, [[x - 13 * s, gy - 20 * s], [x - 12.5 * s, gy - 24.5 * s], [x + 12.5 * s, gy - 25 * s], [x + 13 * s, gy - 20.4 * s]], lighten(col, 0.04), 2 * s));
    c.fillStyle = MOSS; px1(c, x - 11 * s, gy - 25.6 * s, 3, 1); px1(c, x + 6 * s, gy - 26 * s, 2, 0.5);
  } else {
    part(c, (cc) => {
      standing(cc, [[x - 5 * s, 0.5 + gy], [x - 5.6 * s, gy - 20 * s], [x - 3 * s, gy - 27 * s], [x + 1.6 * s, gy - 28 * s], [x + 4.6 * s, gy - 22 * s], [x + 5 * s, gy + 0.5]], col, 1.6 * s);
      cc.fillStyle = darken(col, 0.5);
      // a spiral cut in its face
      cc.strokeStyle = darken(col, 0.5); cc.lineWidth = 0.5;
      cc.beginPath();
      for (let a = 0; a < 12; a += 0.4) { const r = 0.3 * a * s; const px = x - 0.5 * s + Math.cos(a) * r, py = gy - 14 * s + Math.sin(a) * r * 0.9; a ? cc.lineTo(px, py) : cc.moveTo(px, py); }
      cc.stroke();
      weather(cc, x, gy, 10 * s, 26 * s, 77, 0.9);
    });
    // the iron arm the bell hangs from
    part(c, (cc) => {
      cc.fillStyle = "#3a3438";
      cc.fillRect(x + 3.6 * s, gy - 21 * s, 8.4 * s, 1.2 * s);
      cc.fillRect(x + 3.6 * s, gy - 21 * s, 1.2 * s, 5 * s);
      cc.fillStyle = "#6a4a36"; px1(cc, x + 7 * s, gy - 21 * s, 1, 0.5);
    });
  }
  for (let k = 0; k < 3; k++) sedge(c, x + (-10 + k * 9) * s, gy + 1, 0.7, 51 + k, 4);
};
const BELL = { cv: null };
const bellSprite = () => {
  if (BELL.cv) return BELL.cv;
  // hung from (6, 1) in a 12 x 12 box
  BELL.cv = bakeSprite(12, 13, (c) => {
    c.fillStyle = "#2e2a30"; c.fillRect(5.5, 0, 1, 2);
    part(c, (cc) => {
      cc.beginPath();
      cc.moveTo(3.4, 3.4); cc.quadraticCurveTo(6, 0.6, 8.6, 3.4);
      cc.quadraticCurveTo(9, 7, 10.4, 9.4); cc.lineTo(1.6, 9.4);
      cc.quadraticCurveTo(3, 7, 3.4, 3.4); cc.closePath();
      cc.fillStyle = lin(cc, 1.6, 0, 10.4, 0, [[0, "#a8d8c0"], [0.3, VERDI], [0.7, "#3e6a5a"], [1, "#2a4a40"]]); cc.fill();
      cc.fillStyle = BRONZE; cc.fillRect(1.6, 8.6, 8.8, 1);
      cc.fillStyle = "#b8a060"; cc.fillRect(2, 8.6, 2.5, 0.5);
    });
    c.fillStyle = "#1a1418"; c.fillRect(5, 9.6, 2, 1);
    ball(c, 6, 10.6, 0.9, 0.9, "#4a4040", { hi: 0.3, lo: 0.3 });
  });
  return BELL.cv;
};
const bellStone = (ctx, x, y, s, o) => {
  const v = (o.v || 0) % 2, gy = y + 8, t = o.time || 0;
  const b = body(`bell|${v}|${s}`, 40 * s + 8, 38 * s + 12, 18 * s + 4, 34 * s + 6, (c, ox, oy) => bellBody(c, ox, oy, v, s));
  stampBody(ctx, b, x, gy);
  // the bell stirs by itself: long quiet, then a slow swing
  const hx = v ? x + 11.4 * s : x, hy = v ? gy - 20 * s : gy - 20.6 * s;
  const ph = x * 0.37 + y * 0.11;
  const swing = Math.sin(t * 2.2 + ph) * 0.18 * Math.max(0, Math.sin(t * 0.35 + ph));
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(swing); ctx.scale(s, s);
  ctx.drawImage(bellSprite(), -6, -0.5, 12, 13);
  ctx.restore();
  // when it swings, the runes answer it
  const lit = Math.max(0, Math.sin(t * 0.35 + ph));
  if (lit > 0.05) {
    ctx.fillStyle = rgba(TEAL, 0.25 + lit * 0.65);
    if (v) { glow(ctx, x - 0.5 * s, gy - 14 * s, 5 * s, TEAL, 0.25 * lit); px1(ctx, x - 0.8 * s, gy - 14.2 * s, 1, 1); }
    else for (const sx of [-8.5, 8.5]) for (let k = 0; k < 3; k++) px1(ctx, x + sx * s - 0.25, gy - 15 * s + k * 4 * s, 1, 1);
    glow(ctx, hx, hy + 8 * s, 9 * s, TEAL, 0.12 * lit);
  }
};

// A run of lychyard fence. v 0/1: wrought-iron pales, spear-headed and
// rusting, between two stone posts (one with a skull on it); v 2/3: split
// wooden pales, one fallen out of line.
const lichFence = (ctx, x, y, s, o) => {
  const { seed, v } = o, gy = y + 8;
  shadow(ctx, x + 4 * s, gy, 17 * s, 2.4 * s, 0.26);
  const hw = 13 * s;
  if (v < 2) {
    const iron = "#3c3842";
    // the pales, the rails, then the posts over their ends
    part(ctx, (c) => {
      c.fillStyle = iron;
      c.fillRect(x - hw, gy - 11 * s, hw * 2, 0.5);
      c.fillRect(x - hw, gy - 3.5 * s, hw * 2, 0.5);
      const n = 5;
      for (let i = 0; i < n; i++) {
        const px = x - hw + 4 * s + i * ((hw * 2 - 8 * s) / (n - 1));
        const bent = i === 3 && v === 1 ? 0.25 : 0;
        c.save(); c.translate(px, gy); c.rotate(bent);
        c.fillStyle = lin(c, -0.6, 0, 0.6, 0, [[0, "#6a6670"], [0.5, iron], [1, "#24222a"]]);
        c.fillRect(-0.5, -14 * s, 1, 14 * s);
        poly(c, [[-1.1, -14 * s], [0, -16.4 * s], [1.1, -14 * s]]); c.fill();
        c.restore();
        c.fillStyle = "#7a4a30"; if (hash(seed, i) < 0.5) px1(c, px - 0.5, gy - 7 * s + hash(seed, i + 9) * 4, 1, 1);
      }
    });
    for (const [sx, top] of [[-hw, true], [hw, false]]) part(ctx, (c) => {
      standing(c, [[x + sx - 2.6 * s, gy + 0.5], [x + sx - 2.6 * s, gy - 13 * s], [x + sx + 2.6 * s, gy - 13 * s], [x + sx + 2.6 * s, gy + 0.5]], STONE, 1.4 * s);
      standing(c, [[x + sx - 3.2 * s, gy - 12.6 * s], [x + sx - 3.2 * s, gy - 14.4 * s], [x + sx + 3.2 * s, gy - 14.4 * s], [x + sx + 3.2 * s, gy - 12.6 * s]], lighten(STONE, 0.05), 1.6 * s);
      weather(c, x + sx, gy, 5 * s, 12 * s, seed + sx, 0.7);
      if (top) skull(c, x + sx, gy - 17.4 * s, 2.3 * s);
      else ball(c, x + sx, gy - 16.8 * s, 2.2 * s, 2 * s, STONE, { hi: 0.4, lo: 0.45 });
    });
  } else {
    const wood = "#7c7466";
    const n = 6;
    for (let i = 0; i < n; i++) {
      const px = x - hw + i * (hw * 2 / (n - 1));
      const fallen = v === 3 && i === 2;
      const hh = (11 + hash(seed, i) * 3) * s;
      part(ctx, (c) => {
        c.save(); c.translate(px, gy); c.rotate(fallen ? 1.1 : (hash(seed, i + 5) - 0.5) * 0.16);
        poly(c, [[-1.3 * s, 0], [-1.3 * s, -hh + 1.5 * s], [0, -hh], [1.3 * s, -hh + 1.5 * s], [1.3 * s, 0]]);
        litFill(c, -1.3 * s, 1.3 * s, wood, 0.3, 0.45);
        c.fillStyle = darken(wood, 0.45); px1(c, 0.3, -hh + 3, 0.5, hh - 4);
        c.restore();
      });
    }
    part(ctx, (c) => {
      c.save(); c.translate(x, gy - 8 * s); c.rotate(-0.03);
      c.fillStyle = lin(c, 0, -1, 0, 1.4, [[0, lighten(wood, 0.3)], [1, darken(wood, 0.35)]]);
      c.fillRect(-hw - 1, -0.8, hw * 2 + 2, 1.8);
      c.restore();
    });
  }
  for (let k = 0; k < 3; k++) sedge(ctx, x + (-10 + k * 10) * s, gy + 1, 0.65, seed + k, 4);
};

// The drowned throne: a great seat of the old court on a stepped dais,
// half in a peat pool, its high back cracked and weeded, the Hollow King's
// crown left lying on the seat and witch-fire in the eyes cut in its back.
const fenThrone = (ctx, x, y, s, o) => {
  const { seed } = o, gy = y + 8;
  const col = mix(STONE, "#8a8a80", 0.35);
  shadow(ctx, x + 9 * s, gy + 1, 24 * s, 5 * s, 0.32);
  ctx.fillStyle = mix(PEAT, MOSS, 0.3);
  blobPath(ctx, x + 2, gy + 1, 24 * s, 6 * s, seed, 0.1, 14); ctx.fill();
  ctx.fillStyle = BOGW;
  blobPath(ctx, x + 2, gy + 1.5, 22 * s, 4.8 * s, seed + 1, 0.1, 14); ctx.fill();
  ctx.fillStyle = rgba(BOGW_LT, 0.9); px1(ctx, x - 17 * s, gy, 6, 0.5); px1(ctx, x + 12 * s, gy + 3, 4, 0.5);
  // the dais, two steps
  part(ctx, (c) => {
    standing(c, [[x - 17 * s, gy + 1], [x - 17 * s, gy - 3 * s], [x + 17 * s, gy - 3 * s], [x + 17 * s, gy + 1]], darken(col, 0.08), 3 * s);
    standing(c, [[x - 13 * s, gy - 3.4 * s], [x - 13 * s, gy - 6 * s], [x + 13 * s, gy - 6 * s], [x + 13 * s, gy - 3.4 * s]], col, 2.4 * s);
    c.fillStyle = MOSS; px1(c, x - 16 * s, gy - 3.4 * s, 4, 1); px1(c, x + 8 * s, gy - 6.4 * s, 3, 0.5);
  });
  // the high back, pointed, a crack down it and eyes cut through it
  part(ctx, (c) => {
    poly(c, [[x - 9 * s, gy - 12 * s], [x - 9.5 * s, gy - 31 * s], [x - 5 * s, gy - 36 * s], [x, gy - 42 * s], [x + 5 * s, gy - 36 * s], [x + 9.5 * s, gy - 31 * s], [x + 9 * s, gy - 12 * s]]);
    litFill(c, x - 9.5 * s, x + 9.5 * s, col, 0.3, 0.42);
    c.fillStyle = lighten(col, 0.36);
    poly(c, [[x - 9.5 * s, gy - 31 * s], [x - 5 * s, gy - 36 * s], [x, gy - 42 * s], [x, gy - 40.5 * s], [x - 5 * s, gy - 35 * s], [x - 8.6 * s, gy - 30.6 * s]]); c.fill();
    // a carved border and the court's crown cut above the eyes
    c.fillStyle = darken(col, 0.45);
    px1(c, x - 7 * s, gy - 30 * s, 0.5, 17 * s); px1(c, x + 6.5 * s, gy - 30 * s, 0.5, 17 * s);
    poly(c, [[x - 3.2 * s, gy - 30 * s], [x - 3.2 * s, gy - 33 * s], [x - 1.6 * s, gy - 31.4 * s], [x, gy - 34 * s], [x + 1.6 * s, gy - 31.4 * s], [x + 3.2 * s, gy - 33 * s], [x + 3.2 * s, gy - 30 * s]]); c.fill();
    c.fillStyle = "#141216";
    roundRect(c, x - 3.6 * s, gy - 27.5 * s, 2.4 * s, 1.6 * s, 0.6); c.fill();
    roundRect(c, x + 1.2 * s, gy - 27.5 * s, 2.4 * s, 1.6 * s, 0.6); c.fill();
    c.fillStyle = darken(col, 0.55);
    for (let t = 0; t < 8; t++) px1(c, x + 4 * s + Math.sin(t * 1.7) * 0.6, gy - 38 * s + t * 2.4 * s, 0.5, 1.5);
    weather(c, x, gy - 12 * s, 16 * s, 26 * s, seed, 1);
  });
  // the seat and the arms, lions' heads worn to lumps
  part(ctx, (c) => {
    standing(c, [[x - 9 * s, gy - 6 * s], [x - 9 * s, gy - 12.5 * s], [x + 9 * s, gy - 12.5 * s], [x + 9 * s, gy - 6 * s]], lighten(col, 0.05), 4 * s);
  });
  for (const sd of [-1, 1]) part(ctx, (c) => {
    const ax = x + sd * 10.5 * s;
    standing(c, [[ax - 2.4 * s, gy - 6 * s], [ax - 2.4 * s, gy - 16 * s], [ax + 2.4 * s, gy - 16 * s], [ax + 2.4 * s, gy - 6 * s]], col, 3 * s);
    ball(c, ax, gy - 17.6 * s, 2.6 * s, 2.2 * s, col, { hi: 0.4, lo: 0.45 });
  });
  // the crown, left on the seat
  part(ctx, (c) => {
    const cx = x + 1.5 * s, cy = gy - 15 * s;
    poly(c, [[cx - 4 * s, cy + 1.4 * s], [cx - 4.2 * s, cy - 1.6 * s], [cx - 2.6 * s, cy - 0.2 * s], [cx - 1.3 * s, cy - 2.4 * s], [cx, cy - 0.4 * s], [cx + 1.3 * s, cy - 2.4 * s], [cx + 2.6 * s, cy - 0.2 * s], [cx + 4.2 * s, cy - 1.6 * s], [cx + 4 * s, cy + 1.4 * s]]);
    litFill(c, cx - 4 * s, cx + 4 * s, VERDI, 0.45, 0.4);
    c.fillStyle = "#b8e8d0"; px1(c, cx - 3 * s, cy - 0.4, 1, 0.5);
    c.fillStyle = BRONZE; px1(c, cx - 0.5, cy + 0.4, 1, 0.5);
  });
  // weed hanging off the arms and the back
  for (const [wx, wy, wl] of [[-12.5, -16, 7], [11, -16, 9], [-8.5, -31, 8], [8.5, -29, 10]]) blade(ctx, x + wx * s, gy + wy * s, x + (wx + 0.4) * s, gy + (wy + wl) * s, 1 * s, WEED, mix(WEED, "#8a9a6a", 0.4), 0.3);
  // the eyes: baked with a faint glow; a live throne would cost every frame
  glow(ctx, x - 2.4 * s, gy - 26.7 * s, 3 * s, TEAL, 0.5);
  glow(ctx, x + 2.4 * s, gy - 26.7 * s, 3 * s, TEAL, 0.5);
  ctx.fillStyle = TEAL; px1(ctx, x - 3 * s, gy - 27 * s, 1.5, 1); px1(ctx, x + 1.8 * s, gy - 27 * s, 1.5, 1);
};

// A small barrow of the lesser dead: a low grassed mound, a kerb, and a
// doorway of three slabs sealed with a fourth — the cairnfields' doors.
const fenBarrow = (ctx, x, y, s, o) => {
  const { seed, v } = o, gy = y + 8;
  const turf = mix(REALM.GRASS, "#56664a", 0.55), col = mix(STONE, "#96948a", 0.3);
  const rx = 18 * s, ry = 11 * s, my = gy - 7 * s;
  shadow(ctx, x + 5 * s, gy, rx + 3, 4 * s, 0.3);
  part(ctx, (c) => {
    blobPath(c, x, my, rx, ry, seed, 0.06, 14); c.fillStyle = darken(turf, 0.4); c.fill();
    c.save(); blobPath(c, x, my, rx, ry, seed, 0.06, 14); c.clip();
    blobPath(c, x - rx * 0.08, my - ry * 0.16, rx * 0.9, ry * 0.8, seed + 1, 0.08, 12); c.fillStyle = turf; c.fill();
    blobPath(c, x - rx * 0.3, my - ry * 0.45, rx * 0.5, ry * 0.36, seed + 2, 0.12, 10); c.fillStyle = lighten(turf, 0.2); c.fill();
    for (let i = 0; i < 24; i++) {
      const a = hash(seed, i + 5) * Math.PI * 2, d = Math.sqrt(hash(seed, i + 6)) * 0.9;
      const lit = -Math.cos(a) * d * 0.6 - Math.sin(a) * d * 0.8;
      c.fillStyle = lit > 0.2 ? lighten(turf, 0.32) : lit > -0.3 ? darken(turf, 0.2) : darken(turf, 0.45);
      c.fillRect(ap(x + Math.cos(a) * rx * d), ap(my + Math.sin(a) * ry * d), 0.5, 1.5);
    }
    c.restore();
  });
  // the door: sealed (v even) or broken open (v odd)
  part(ctx, (c) => {
    c.fillStyle = "#0e1010"; c.fillRect(x - 4 * s, gy - 10 * s, 8 * s, 10 * s);
    standing(c, [[x - 7 * s, gy + 0.5], [x - 7 * s, gy - 10 * s], [x - 4 * s, gy - 10 * s], [x - 4 * s, gy + 0.5]], col, 0.8);
    standing(c, [[x + 4 * s, gy + 0.5], [x + 4 * s, gy - 10 * s], [x + 7 * s, gy - 10 * s], [x + 7 * s, gy + 0.5]], col, 0.8);
    standing(c, [[x - 8.5 * s, gy - 9.6 * s], [x - 8 * s, gy - 13 * s], [x + 8 * s, gy - 13.2 * s], [x + 8.5 * s, gy - 9.6 * s]], lighten(col, 0.05), 1.6 * s);
    c.strokeStyle = darken(col, 0.5); c.lineWidth = 0.5;
    c.beginPath(); for (let a = 0; a < 9; a += 0.4) { const r = 0.26 * a * s; const px = x + Math.cos(a) * r, py = gy - 11.4 * s + Math.sin(a) * r * 0.7; a ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
    if (v % 2 === 0) standing(c, [[x - 4.4 * s, gy + 0.5], [x - 4.2 * s, gy - 8.6 * s], [x + 4.2 * s, gy - 9 * s], [x + 4.4 * s, gy + 0.5]], darken(col, 0.1), 0.6);
    weather(c, x, gy, 14 * s, 12 * s, seed, 0.8);
  });
  if (v % 2) {
    // the seal-stone fallen out, a skull in the dark behind it
    part(ctx, (c) => standing(c, [[x + 7 * s, gy + 3], [x + 8 * s, gy - 1 * s], [x + 15 * s, gy], [x + 14.5 * s, gy + 3]], darken(col, 0.1), 1.6));
    part(ctx, (c) => skull(c, x - 0.5 * s, gy - 3.5 * s, 1.8 * s));
  }
  for (const [kx, ky] of [[-14, -2], [-11, 0.5], [11, 0.5], [14.5, -2]]) part(ctx, (c) => standing(c, [[x + kx * s - 2, gy + ky * s + 1.2], [x + kx * s - 1.8, gy + ky * s - 1.6], [x + kx * s + 1.8, gy + ky * s - 1.8], [x + kx * s + 2, gy + ky * s + 1.2]], darken(col, 0.06), 1));
  for (let k = 0; k < 3; k++) sedge(ctx, x + (-17 + k * 16) * s, gy + 1.5, 0.7, seed + k, 4, "#5e6a42", "#9a9460");
};

Object.assign(HOLLOW_ART.decor, {
  fendead: fenDead, fenwillow: fenWillow, fensnag: fenSnag,
  reedbed: reedBed, bogpool: bogPool,
  fengrave: fenGrave, fencairn: fenCairn, fenbones: fenBones,
  fenstatue: fenStatue, fenshrine: fenShrine, bellstone: bellStone, fencandle: fenCandle, lichfence: lichFence,
  fenthrone: fenThrone, fenbarrow: fenBarrow,
});
HOLLOW_ART.live.push("fencandle", "fenshrine", "bellstone");
Object.assign(HOLLOW_ART.box, {
  fendead: [24, 40], fenwillow: [26, 44], fensnag: [12, 20], reedbed: [18, 30], bogpool: [22, 14],
  fengrave: [22, 26], fencairn: [16, 30], fenbones: [18, 20], fenstatue: [22, 30], lichfence: [22, 24],
  fenthrone: [28, 48], fenbarrow: [24, 22],
});
Object.assign(HOLLOW_ART.dress, { fendead: [3, false], fenwillow: [5, false], fengrave: [6, false], fencairn: [9, false], fenstatue: [13, false], fensnag: [3, false] });

// ---- the ground: moss, pools, sedge, bog-cotton -----------------------
// All of it is painted straight into the ground layer's ART pixels (the
// layer is W*RES wide and RES = PX, so one buffer pixel is one art pixel).
// Every mark is a flat colour, or a step toward the plum dark / cream light
// from whatever lies under it, so it stays crisp and low-contrast on the
// turf's tone map and on the causeway alike. The texture gathers into a few
// wet hollows and sedge drifts with open turf between, so the dead read.

let __last = 0, __lastN = '';
const __mk = (n) => { const t = performance.now(); if (__lastN && !__lastN.endsWith('_end')) { const S = (globalThis.__fenS ||= {}); S[__lastN] = (S[__lastN] || 0) + t - __last; } __last = t; __lastN = n; };
const hexC = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const DUSK = hexC("#2a1c2c"), SUNL = hexC("#fff3d2");
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// three tones of one colour: lit, itself, shaded
const tone3 = (h, hi = 0.24, lo = 0.3) => { const c = typeof h === "string" ? hexC(h) : h; return [mixC(c, SUNL, hi), c, mixC(c, DUSK, lo)]; };
const smooth01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
// eased value noise in world units, 0..1
const vnoise = (x, y, cell, seed) => {
  const fx = x / cell, fy = y / cell, xi = Math.floor(fx), yi = Math.floor(fy);
  let u = fx - xi, v = fy - yi;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const h = (a, b) => hash(a * 157 + b * 7919, seed);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
};

// A canvas's own pixels, to paint by hand. world (x, y) → pixel P(x), P(y).
const pixKit = (ctx) => {
  const cv = ctx.canvas, PW = cv.width, PH = cv.height, k = PW / W;
  const img = ctx.getImageData(0, 0, PW, PH), d = img.data;
  const K = {
    k, PW, PH,
    P: (v) => Math.round(v * k),
    get: (i, j) => { const o = (Math.max(0, Math.min(PH - 1, j)) * PW + Math.max(0, Math.min(PW - 1, i))) * 4; return [d[o], d[o + 1], d[o + 2]]; },
    set(i, j, c, a = 1) {
      if (i < 0 || j < 0 || i >= PW || j >= PH) return;
      const o = (j * PW + i) * 4;
      if (a >= 1) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; return; }
      d[o] += (c[0] - d[o]) * a; d[o + 1] += (c[1] - d[o + 1]) * a; d[o + 2] += (c[2] - d[o + 2]) * a;
    },
    // a step toward the cool dark (t < 0) or the warm light (t > 0)
    shift(i, j, t) { K.set(i, j, t < 0 ? DUSK : SUNL, t < 0 ? -t : t); },
    flush: () => ctx.putImageData(img, 0, 0),
  };
  return K;
};
// a line of pixels, calling fn(i, j, t) once per pixel
const pixLine = (x0, y0, x1, y1, fn) => {
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let q = 0; q <= n; q++) fn(Math.round(x0 + ((x1 - x0) * q) / n), Math.round(y0 + ((y1 - y0) * q) / n), q / n);
};
// An ellipse whose edge wanders, as a pixel mask round its centre: its
// outline is traced at 48 angles and filled a row at a time. at(i, j) is 1
// inside, for pixel offsets (i, j) from the centre.
const blobMask = (RX, RY, seed, wob = 0.18) => {
  const p1 = hash(seed, 1) * 6.283, p2 = hash(seed, 2) * 6.283, p3 = hash(seed, 3) * 6.283;
  const a1 = 0.6 + hash(seed, 4) * 0.4, a2 = 0.3 + hash(seed, 5) * 0.5, N = 48, xs = [], ys = [];
  for (let q = 0; q < N; q++) {
    const th = (q / N) * Math.PI * 2, r = 1 + (wob * (a1 * Math.sin(2 * th + p1) + a2 * Math.sin(3 * th + p2) + 0.35 * Math.sin(5 * th + p3))) / 1.5;
    xs.push(Math.cos(th) * RX * r); ys.push(Math.sin(th) * RY * r);
  }
  const X = Math.ceil(RX * 1.4) + 1, Y = Math.ceil(RY * 1.4) + 1, w = X * 2 + 1, h = Y * 2 + 1, m = new Uint8Array(w * h);
  for (let j = -Y; j <= Y; j++) {
    let lo = Infinity, hi = -Infinity;
    for (let q = 0; q < N; q++) {
      const ay = ys[q], by = ys[(q + 1) % N];
      if ((ay <= j && by > j) || (by <= j && ay > j)) {
        const x = xs[q] + ((j - ay) / (by - ay)) * (xs[(q + 1) % N] - xs[q]);
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
    for (let i = Math.max(-X, Math.ceil(lo)); i <= Math.min(X, Math.floor(hi)); i++) m[(j + Y) * w + i + X] = 1;
  }
  return { X, Y, at: (i, j) => (i < -X || j < -Y || i > X || j > Y ? 0 : m[(j + Y) * w + i + X]) };
};
// a tiny sprite from rows of letters looked up in `map` ("." is empty), its
// shadow stepped into the ground down-right; `sink` cuts it off at a row, as
// if the moss had swallowed the rest
const stampPx = (K, px, py, rows, map, shade = -0.3, sink = 99) => {
  const h = Math.min(rows.length, sink);
  const on = (i, j) => j >= 0 && j < h && i >= 0 && i < rows[j].length && rows[j][i] !== ".";
  if (shade) for (let j = 0; j <= h; j++) for (let i = 0; i <= rows[0].length; i++) if (!on(i, j) && on(i - 1, j - 1)) K.shift(px + i, py + j, shade);
  for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) { const c = map[rows[j][i]]; if (c) K.set(px + i, py + j, c); }
  if (sink < rows.length) for (let i = 0; i < rows[sink].length; i++) if (rows[sink][i] !== ".") K.shift(px + i, py + sink, -0.28);
};

// standing water: black, with the drowned moon's sky lying in it
const PUD = {
  dk: hexC("#111a18"), body: hexC("#1c2926"), sky: hexC("#2c403d"), lap: hexC("#3e5652"),
  glint: hexC("#93aca7"), star: hexC("#d4e2dc"),
};
// A puddle: wet peat darkening round its upper left, a lit lip where its
// lower rim catches the sun, the far bank's shadow along its top, the sky
// below and a glint of it; sometimes a pad or a tuft of sedge at one end.
const pixPuddle = (K, x, y, rx, ry, seed, o = {}) => {
  const cx = K.P(x), cy = K.P(y), RX = Math.max(2.2, rx * K.k), RY = Math.max(1.6, ry * K.k);
  const B = blobMask(RX, RY, seed, o.wob ?? 0.2);
  const X = B.X + 2, Y = B.Y + 2, w = X * 2 + 1, h = Y * 2 + 1;
  const M = (i, j) => B.at(i - X, j - Y);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (M(i, j)) continue;
      const n1 = M(i + 1, j) || M(i - 1, j) || M(i, j + 1) || M(i, j - 1);
      const n2 = n1 || M(i + 1, j + 1) || M(i - 1, j - 1) || M(i + 1, j - 1) || M(i - 1, j + 1) || M(i - 2, j) || M(i, j - 2);
      if (!n2) continue;
      const s = ((i - X) / RX) * 0.5 + ((j - Y) / RY) * 0.9;
      if (n1 && M(i, j - 1) && s > 0.3) K.shift(cx + i - X, cy + j - Y, o.lip ?? 0.2);
      else if (n1) K.shift(cx + i - X, cy + j - Y, s > 0.3 ? -0.14 : -0.36);
      else if (s < 0.3) K.shift(cx + i - X, cy + j - Y, -0.14);
    }
  }
  for (let i = 0; i < w; i++) {
    let top = -1, bot = -1;
    for (let j = 0; j < h; j++) if (M(i, j)) { if (top < 0) top = j; bot = j; }
    if (top < 0) continue;
    const span = bot - top + 1, band = Math.max(1, Math.round(span * 0.26));
    for (let j = top; j <= bot; j++) {
      const dt = j - top;
      const c = dt < band ? PUD.dk : bot - j === 0 && span > 3 ? PUD.lap : j - Y > (hash(seed, i + 30) - 0.7) * 1.2 ? PUD.sky : PUD.body;
      K.set(cx + i - X, cy + j - Y, c);
    }
  }
  // the sky's glint: a short pale streak, and a shorter one further out
  const gy = cy + Math.max(0, Math.round(RY * 0.2)), gx = cx - Math.round(RX * 0.5), gl = Math.max(2, Math.round(RX * 0.5));
  for (let q = 0; q < gl; q++) if (M(gx + q - cx + X, gy - cy + Y) && M(gx + q - cx + X, gy - cy + Y - 1)) K.set(gx + q, gy, q === 0 && RX > 7 ? PUD.star : PUD.glint);
  if (RX > 6) {
    const g2 = cx + Math.round(RX * 0.2), l2 = Math.max(1, Math.round(RX * 0.18));
    for (let q = 0; q < l2; q++) if (M(g2 + q - cx + X, gy + 2 - cy + Y)) K.set(g2 + q, gy + 2, PUD.lap);
  }
  if (o.pad) padPx((i, j, c) => K.set(i, j, c, c[3] == null ? 1 : c[3] / 255), cx + Math.round(RX * 0.35), cy + 1, Math.min(2.2, rx * 0.34), seed, K.k);
};

// A cushion of sphagnum: a low dome of knobs, lit up-left, its shadow
// stepped in down-right. Mostly green; now and then ochre or rust.
const MOSS_T = ["#58703a", "#617840", "#6e7642", "#6c5a40", "#5c4840", "#4c6236"].map((h) => tone3(h, 0.22, 0.32));
const pixMoss = (K, x, y, r, seed) => {
  const cx = K.P(x), cy = K.P(y), RX = Math.max(1.5, r * K.k * 1.05), RY = Math.max(1.2, r * K.k * 0.62);
  const T = MOSS_T[hash(seed, 1) < 0.72 ? Math.floor(hash(seed, 2) * 3) : 3 + Math.floor(hash(seed, 3) * 3)];
  const X = Math.ceil(RX) + 1, Y = Math.ceil(RY) + 1;
  const inside = (i, j) => { const u = i / RX, v = j / RY, q = u * u + v * v; return q <= 1 && !(q > 0.66 && hash(seed * 31 + i, j + 50) < 0.42); };
  for (let j = -Y; j <= Y + 1; j++) for (let i = -X; i <= X + 1; i++) if (!inside(i, j) && inside(i - 1, j - 1)) K.shift(cx + i, cy + j, -0.28);
  // the dome: lit up-left, falling into shade down-right
  for (let j = -Y; j <= Y; j++) {
    for (let i = -X; i <= X; i++) {
      if (!inside(i, j)) continue;
      const u = i / RX, v = j / RY, lit = -(u * 0.55 + v * 0.85);
      K.set(cx + i, cy + j, T[lit > 0.45 ? 0 : lit > -0.4 ? 1 : 2]);
    }
  }
  // and its knobs: a lit pixel each with its own shade under it, in
  // staggered rows — the bobbly head of the sphagnum
  const ph = Math.floor(hash(seed, 4) * 3);
  for (let j = -Y; j <= Y; j += 2) {
    for (let i = -X + ((j >> 1) & 1 ? 1 : 0) + ph; i <= X; i += 3) {
      if (!inside(i, j) || hash(seed + i, j + 7) < 0.25) continue;
      const u = i / RX, v = j / RY, lit = -(u * 0.55 + v * 0.85);
      K.set(cx + i, cy + j, lit > -0.5 ? T[0] : T[1]);
      if (inside(i + 1, j + 1)) K.set(cx + i + 1, cy + j + 1, T[2]);
    }
  }
};

// sedge: fans of single-pixel blades, dark at the root, straw at the tip;
// the sun-side blades carry the light, the far ones stay dark
const SEDGE = [hexC("#30382a"), hexC("#525c36"), hexC("#7c7e48"), hexC("#a49c62")];
const SEDGE_PALE = [hexC("#30382a"), hexC("#5a6238"), hexC("#908a56"), hexC("#bcae76")];
const pixSedge = (K, x, y, s, seed, n = 5, cols = SEDGE) => {
  const bx = K.P(x), by = K.P(y);
  const half = Math.round(n * 0.45 * s) + 1;
  for (let i = -half; i <= half + 2; i++) K.shift(bx + i, by + 1, -0.2);
  const far = [cols[0], cols[0], cols[1], cols[2]];
  for (let b = n - 1; b >= 0; b--) {
    const side = n > 1 ? b / (n - 1) : 0.5, h1 = hash(seed, b + 2), h2 = hash(seed, b + 40);
    const lean = (side - 0.5) * 2.6 + (h1 - 0.5) * 0.8 + 0.3;
    const mid = 1 - Math.abs(side - 0.5) * 1.2;
    const len = Math.max(3, Math.round((6 + h2 * 6 + mid * 6) * s));
    const ox = Math.round((b - (n - 1) / 2) * 0.8 * s);
    const c = side <= 0.5 ? cols : far;
    for (let q = 0; q < len; q++) {
      const f = q / (len - 1);
      K.set(bx + ox + Math.round(lean * (0.3 * f + 0.7 * f * f) * len * 0.42), by - q, c[f < 0.2 ? 0 : f < 0.5 ? 1 : f < 0.86 ? 2 : 3]);
    }
  }
};
// bog-cotton: white seed-heads nodding on thin stalks, the fen's flowers
const COT = [hexC("#f8f2e4"), hexC("#ddd6c4"), hexC("#a49e8e")];
const pixCotton = (K, x, y, seed, s = 1) => {
  const bx = K.P(x), by = K.P(y), n = 1 + Math.floor(hash(seed, 1) * 3);
  for (let q = 0; q < n; q++) {
    const hx = bx + Math.round((q - (n - 1) / 2) * 3 * s) + (hash(seed, q + 5) < 0.5 ? 0 : 1);
    const hh = Math.round((7 + hash(seed, q + 2) * 7) * s), lean = hash(seed, q + 8) < 0.45 ? 0 : 1;
    K.shift(hx + 1, by + 1, -0.22); K.shift(hx + 2, by + 1, -0.14);
    for (let k = 0; k < hh; k++) K.set(hx + (k > hh * 0.6 ? lean : 0), by - k, k < hh * 0.4 ? SEDGE[1] : SEDGE[2]);
    const tx = hx + lean, ty = by - hh - 1;
    K.set(tx, ty, COT[0]); K.set(tx + 1, ty, COT[1]); K.set(tx, ty + 1, COT[1]); K.set(tx + 1, ty + 1, COT[2]);
    if (hash(seed, q + 11) < 0.5) K.set(tx, ty - 1, COT[1]);
  }
};
// a lone bulrush: a stalk, two leaves, a velvet head lit on its sun side
const RUSH = [hexC("#9a7050"), hexC("#6a4830"), hexC("#402c1e")];
const pixBulrush = (K, x, y, s, seed) => {
  const bx = K.P(x), by = K.P(y), hh = Math.round((22 + hash(seed, 1) * 12) * s), lean = hash(seed, 2) < 0.5 ? 0 : 1;
  for (let i = -1; i <= 3; i++) K.shift(bx + i, by + 1, -0.2);
  for (let q = 0; q < hh; q++) K.set(bx + (q > hh * 0.55 ? lean : 0), by - q, q < hh * 0.3 ? SEDGE[1] : SEDGE[2]);
  for (const [dx, l] of [[-1, 0.45], [1, 0.3]]) {
    const len = Math.round(hh * l);
    for (let q = 0; q < len; q++) K.set(bx + Math.round(dx * (q / len) ** 2 * 3), by - q, q > len * 0.7 ? SEDGE[3] : SEDGE[1]);
  }
  const hx = bx + lean, hy = by - hh + 3;
  for (let q = 0; q < 6; q++) { K.set(hx, hy + q, q < 2 ? RUSH[0] : RUSH[1]); K.set(hx + 1, hy + q, RUSH[2]); }
  K.set(hx, hy - 1, SEDGE[3]); K.set(hx, hy - 2, SEDGE[2]);
};
// a fallen pale branch, forked; now and then foxfire on the rot
const WOOD = [hexC("#c2bca6"), hexC("#98927e"), hexC("#6a6656")];
const TEAL_C = hexC(TEAL);
const pixStick = (K, x, y, len, ang, seed) => {
  const k = K.k, x0 = x * k, y0 = y * k, x1 = (x + Math.cos(ang) * len) * k, y1 = (y + Math.sin(ang) * len * 0.5) * k;
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  const fx = x0 + (x1 - x0) * 0.6, fy = y0 + (y1 - y0) * 0.6, a2 = ang + (hash(seed, 1) < 0.5 ? 0.7 : -0.7);
  const pts = [];
  pixLine(x0, y0, x1, y1, (i, j, t) => pts.push([i, j, t, 0]));
  pixLine(fx, fy, fx + Math.cos(a2) * len * 0.35 * k, fy + Math.sin(a2) * len * 0.18 * k, (i, j, t) => pts.push([i, j, t, 1]));
  const on = new Set();
  for (const [i, j, , br] of pts) { on.add(i * 8192 + j); if (!br) on.add(steep ? (i + 1) * 8192 + j : i * 8192 + j + 1); }
  for (const key of on) { const i = Math.floor(key / 8192), j = key % 8192; if (!on.has((i + 1) * 8192 + j + 1)) K.shift(i + 1, j + 1, -0.3); }
  for (const [i, j, t, br] of pts) {
    if (br) { K.set(i, j, WOOD[1]); continue; }
    K.set(i, j, t > 0.94 ? WOOD[2] : WOOD[0]);
    if (steep) K.set(i + 1, j, WOOD[t > 0.94 ? 2 : 1]); else K.set(i, j + 1, WOOD[t > 0.94 ? 2 : 1]);
  }
  if (hash(seed, 9) < 0.2) { const [i, j] = pts[Math.floor(pts.length * 0.3)]; K.set(i, j, TEAL_C); K.set(i + 2, j + (steep ? 2 : 0), mixC(TEAL_C, WOOD[1], 0.5)); }
};
// the bones of the drowned
const BONES = { L: hexC("#f0e9d6"), B: hexC("#d0c8b2"), S: hexC("#968d78"), K: hexC("#2b2430"), N: hexC("#5a4e4a"), T: hexC("#b4ac96") };
const SKULL = ["..LLB..", ".LLBBB.", "LBBBBBS", "BKKBKKS", ".BBNBS.", "..STS.."];
const pixSkull = (K, x, y, seed) => stampPx(K, K.P(x) - 3, K.P(y) - 4, SKULL, BONES, -0.3, hash(seed, 7) < 0.3 ? 4 : 99);
const pixBone = (K, x0, y0, x1, y1) => {
  const a = [K.P(x0), K.P(y0)], b = [K.P(x1), K.P(y1)];
  pixLine(a[0] + 1, a[1] + 2, b[0] + 1, b[1] + 2, (i, j) => K.shift(i, j, -0.28));
  pixLine(a[0], a[1], b[0], b[1], (i, j, t) => { K.set(i, j, t < 0.45 ? BONES.L : BONES.B); K.set(i, j + 1, BONES.S); });
  for (const [e, s] of [[a, -1], [b, 1]]) {
    const [i, j] = e;
    K.set(i + s, j - 1, s < 0 ? BONES.L : BONES.B); K.set(i + s, j, s < 0 ? BONES.L : BONES.B); K.set(i + s, j + 1, BONES.B); K.set(i + s, j + 2, BONES.S);
    K.set(i, j - 1, BONES.B); K.set(i, j + 2, BONES.S); K.shift(i + s + 1, j + 3, -0.25);
  }
};
// a rusted helm trodden into the verge
const HELM = [".hHHM..", "hHMMMD.", "HMMRMDd", "MMMMDDd", ".rrrrr."];
const HELM_C = { h: hexC("#a29282"), H: hexC("#86786a"), M: hexC("#66584c"), D: hexC("#483e36"), d: hexC("#302a26"), R: hexC("#8e5c38"), r: hexC("#3a302a") };
// a flat stone sunk in the turf, moss on its crown
const pixStone = (K, x, y, rx, ry, col, seed) => {
  const cx = K.P(x), cy = K.P(y), RX = Math.max(1.5, rx * K.k), RY = Math.max(1, ry * K.k), T = tone3(col, 0.26, 0.34);
  const B = blobMask(RX, RY, seed, 0.14), inside = B.at;
  for (let j = -Math.ceil(RY) - 1; j <= Math.ceil(RY) + 1; j++) {
    for (let i = -Math.ceil(RX) - 1; i <= Math.ceil(RX) + 1; i++) {
      if (!inside(i, j)) { if (inside(i - 1, j - 1)) K.shift(cx + i, cy + j, -0.3); continue; }
      const lit = !inside(i, j - 1) || !inside(i - 1, j) ? 0 : !inside(i, j + 1) || !inside(i + 1, j) ? 2 : 1;
      K.set(cx + i, cy + j, T[lit]);
    }
  }
  const mc = MOSS_T[0];
  K.set(cx - 1, cy - Math.round(RY) + 1, mc[1]); K.set(cx, cy - Math.round(RY) + 1, mc[0]);
  if (hash(seed, 4) < 0.5) K.set(cx + 1, cy - Math.round(RY) + 2, mc[1]);
};

const nearPond = (x, y, m) => PONDS.some((p) => Math.abs(x - p.x) < p.w / 2 + m && Math.abs(y - p.y) < p.h / 2 + m);
const MIST = hexC("#b4c4bc"), PEAT_C = hexC("#1c221a");

function paintFenTurf(ctx, kit) {
  __mk('t_start');
  const { clear, SW } = kit;
  const H0 = (i, k) => hash(i + 7919, k);
  const R = REALM, K = pixKit(ctx), seed = (R.seed | 0) % 9973;
  // a blob of ground stepped darker (a hollow, a meadow's wet floor): the
  // upper-left rim a step deeper, the lower-right lip a step lighter
  const hollow = (x, y, rx, ry, sd, t, rim = true) => {
    const cx = K.P(x), cy = K.P(y), B = blobMask(rx * K.k, ry * K.k, sd, 0.22);
    for (let j = -B.Y; j <= B.Y; j++) {
      for (let i = -B.X; i <= B.X; i++) {
        if (!B.at(i, j)) continue;
        K.set(cx + i, cy + j, PEAT_C, rim && j < 0 && (!B.at(i, j - 1) || !B.at(i - 1, j)) ? t + 0.04 : t);
        if (rim && j > 0 && !B.at(i, j + 1)) K.shift(cx + i, cy + j + 1, 0.04);
      }
    }
  };
  __mk('t_wood');
  // the wood's floor: dark peat, fallen pale limbs, moss and black pools,
  // and a low mist lying along the treeline
  if (FOREST) {
    const span = FOREST.edge === "left" ? H : W;
    const inWood = (x, y) => forestDepthAt(x, y) > 2 && nearestOnPath(x, y).d > PATH_HALF + 3 && !nearPond(x, y, 6) && !inRiver(x, y, 6);
    const items = [];
    for (let i = 0; i < 160; i++) {
      const u = H0(i, 1) * span, d = H0(i, 2) * 150;
      const x = FOREST.edge === "left" ? d : u, y = FOREST.edge === "left" ? u : d;
      if (inWood(x, y)) items.push([x, y, i]);
    }
    items.sort((a, b) => a[1] - b[1]);
    for (const [x, y, i] of items) {
      const k = H0(i, 3);
      if (k < 0.3) pixMoss(K, x, y, 2 + H0(i, 4) * 2.6, i);
      else if (k < 0.5) pixStick(K, x, y, 5 + H0(i, 5) * 7, H0(i, 6) * Math.PI, i);
      else if (k < 0.62) pixPuddle(K, x, y, 3 + H0(i, 7) * 5, 1.5 + H0(i, 8) * 1.4, i, { pad: H0(i, 9) < 0.3 });
      else if (k < 0.85) pixSedge(K, x, y, 0.7 + H0(i, 10) * 0.4, i, 5);
      else hollow(x, y, 6, 2.5, i, 0.22, false);
    }
  __mk('t_mist');
    // the mist: two flat steps of pale, in long banks along the trees
    for (let u = 0; u < span; u += 18) {
      const b = FOREST.edge === "left" ? forestDepthAt(0, u) : forestDepthAt(u, 0);
      const x = FOREST.edge === "left" ? b - 6 + H0(u, 11) * 10 : u + H0(u, 12) * 8;
      const y = FOREST.edge === "left" ? u + H0(u, 13) * 8 : b - 6 + H0(u, 11) * 10;
      const rx = (22 + H0(u, 14) * 14) * K.k, ry = (6 + H0(u, 15) * 4) * K.k, cx = K.P(x), cy = K.P(y);
      const B = blobMask(rx, ry, u + 5, 0.25), Bi = blobMask(rx * 0.55, ry * 0.55, u + 5, 0.25);
      for (let j = -B.Y; j <= B.Y; j++) for (let i = -B.X; i <= B.X; i++) if (B.at(i, j)) K.set(cx + i, cy + j, MIST, Bi.at(i, j) ? 0.07 : 0.04);
    }
  }
  __mk('t_hollows');
  // wet hollows: the ground sinks darker round a few black pools, moss
  // crowding their rims and sedge at their ends — the fen's texture,
  // gathered, with open turf between
  const hollows = [];
  for (let i = 0; i < 40 && hollows.length < (R.fenHollows ?? 9); i++) {
    const x = 30 + H0(i, 20) * (SW - 60), y = 24 + H0(i, 21) * (H - 48);
    const rx = 14 + H0(i, 22) * 12, ry = 6 + H0(i, 23) * 5;
    if (!clear(x, y, ry + 6) || !clear(x - rx, y, 4) || !clear(x + rx, y, 4) || x > W - WALL_W - 24) continue;
    if (hollows.some(([hx, hy]) => Math.hypot(hx - x, (hy - y) * 1.6) < 70)) continue;
    hollows.push([x, y, rx, ry, i]);
  }
  for (const [x, y, rx, ry, i] of hollows) hollow(x, y, rx, ry, i + 400, 0.14);
  const pools = [];
  for (const [x, y, rx, ry, i] of hollows) {
    const n = 1 + Math.floor(H0(i, 24) * 2.6);
    for (let q = 0; q < n; q++) {
      const px = x + (q - (n - 1) / 2) * rx * 0.62 + (H0(i * 5 + q, 25) - 0.5) * 6, py = y + (H0(i * 5 + q, 26) - 0.5) * ry * 0.7;
      const prx = (q === 0 ? 5 : 3) + H0(i * 5 + q, 27) * (q === 0 ? 5 : 3), pry = 1.6 + H0(i * 5 + q, 28) * 1.6;
      if (clear(px, py, prx + 3)) pools.push([px, py, prx, pry, i * 5 + q, q === 0 && prx > 7 && H0(i, 29) < 0.6]);
    }
  }
  // standing water loose in the turf, a few
  for (let i = 0; i < 12; i++) {
    const x = H0(i, 40) * SW, y = H0(i, 41) * H;
    const rx = 2.6 + H0(i, 42) * 4, ry = 1.3 + H0(i, 43) * 1.4;
    if (!clear(x, y, rx + 6) || x > W - WALL_W - 20 || hollows.some(([hx, hy]) => Math.hypot(hx - x, hy - y) < 34)) continue;
    pools.push([x, y, rx, ry, i + 50, false]);
  }
  for (const [x, y, rx, ry, sd, pad] of pools) pixPuddle(K, x, y, rx, ry, sd, { pad });
  // round the hollows' rims: cushions of moss, sedge at the ends, cotton
  const rims = [];
  for (const [x, y, rx, ry, i] of hollows) {
    const n = 5 + Math.floor(H0(i, 30) * 5);
    for (let q = 0; q < n; q++) {
      const a = H0(i * 11 + q, 31) * Math.PI * 2, d = 0.75 + H0(i * 11 + q, 32) * 0.4;
      const mx = x + Math.cos(a) * rx * d, my = y + Math.sin(a) * ry * d;
      if (!clear(mx, my, 3) || pools.some(([px, py, prx, pry]) => ((mx - px) / (prx + 2.5)) ** 2 + ((my - py) / (pry + 2.5)) ** 2 < 1)) continue;
      const k = H0(i * 11 + q, 33);
      rims.push([mx, my, k < 0.5 ? "moss" : k < 0.88 ? "sedge" : "cotton", i * 11 + q]);
    }
  }
  __mk('t_colonies');
  // sphagnum in colonies over the open turf, fewer
  for (let i = 0; i < 26; i++) {
    const cx = H0(i, 34) * SW, cy = H0(i, 35) * H, n = 1 + Math.floor(H0(i, 36) * 3);
    for (let k = 0; k < n; k++) {
      const x = cx + (H0(i * 5 + k, 37) - 0.5) * 16, y = cy + (H0(i * 5 + k, 38) - 0.5) * 7;
      if (clear(x, y, 4)) rims.push([x, y, "moss", i * 7 + k + 3000]);
    }
  }
  rims.sort((a, b) => a[1] - b[1]);
  for (const [x, y, kind, sd] of rims) {
    if (kind === "moss") pixMoss(K, x, y, 1.6 + hash(sd, 1) * 2.2, sd);
    else if (kind === "sedge") pixSedge(K, x, y, 0.6 + hash(sd, 2) * 0.35, sd, 4 + Math.floor(hash(sd, 3) * 3));
    else pixCotton(K, x, y, sd, 0.9);
  }
  __mk('t_meadows');
  // sedge meadows: wide soft stands of it where the ground is wettest,
  // straw-pale at the tips, the odd bog-cotton head over them
  const reedy = !!R.fenReeds;
  for (let i = 0; i < (R.fenMeadows ?? 11); i++) {
    const cx = 30 + H0(i, 120) * (SW - 60), cy = 20 + H0(i, 121) * (H - 40);
    const rx = 18 + H0(i, 122) * 22, ry = 7 + H0(i, 123) * 7;
    if (!clear(cx, cy, 10)) continue;
    // its wet floor, a step darker (only where the turf is open)
    const fx = K.P(cx + 1), fy = K.P(cy + 1.5), B = blobMask(rx * K.k, ry * K.k * 0.85, i + 900, 0.25);
    const open = new Map(), openAt = (px, py) => {
      const key = (px >> 2) * 4096 + (py >> 2);
      if (!open.has(key)) open.set(key, clear(((px >> 2) * 4 + 2) / K.k, ((py >> 2) * 4 + 2) / K.k, 1));
      return open.get(key);
    };
    for (let j = -B.Y; j <= B.Y; j++) {
      for (let q = -B.X; q <= B.X; q++) {
        if (!B.at(q, j) || !openAt(fx + q, fy + j)) continue;
        K.set(fx + q, fy + j, PEAT_C, 0.1);
      }
    }
    const n = Math.round((rx * ry) / 8);
    const tufts = [];
    for (let k = 0; k < n; k++) {
      const a = H0(i * 61 + k, 124) * Math.PI * 2, d = Math.sqrt(H0(i * 61 + k, 125));
      const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      if (clear(x, y, 4)) tufts.push([x, y, k]);
    }
    tufts.sort((p, q) => p[1] - q[1]);
    for (const [x, y, k] of tufts) {
      const edge = 1 - Math.hypot((x - cx) / rx, (y - cy) / ry);
      pixSedge(K, x, y, 0.55 + edge * 0.6 + H0(k, 126) * 0.2, i * 97 + k, 4 + Math.floor(H0(k, 132) * 2), H0(k, 128) < 0.3 ? SEDGE_PALE : SEDGE);
      if (H0(k + i * 3, 129) < 0.05) pixCotton(K, x + 1, y, i * 13 + k, 0.8);
      else if (reedy && H0(k, 130) < 0.12) pixBulrush(K, x, y, 0.8 + H0(k, 131) * 0.4, k);
    }
  }
  __mk('t_lone');
  // lone sedge, gathered into loose drifts by a slow noise
  for (let i = 0; i < 140; i++) {
    const x = H0(i, 50) * SW, y = H0(i, 51) * H;
    if (vnoise(x, y, 90, seed + 3) < 0.52 || !clear(x, y, 4)) continue;
    pixSedge(K, x, y, 0.55 + H0(i, 52) * 0.45, i + 700, 3 + Math.floor(H0(i, 53) * 3), H0(i, 54) < 0.25 ? SEDGE_PALE : SEDGE);
  }
  for (let i = 0; i < 14; i++) {
    const cx = H0(i, 60) * SW, cy = H0(i, 61) * H, n = 2 + Math.floor(H0(i, 62) * 3);
    for (let k = 0; k < n; k++) {
      const x = cx + (H0(i * 7 + k, 63) - 0.5) * 22, y = cy + (H0(i * 7 + k, 64) - 0.5) * 10;
      if (clear(x, y, 5)) pixCotton(K, x, y, i * 11 + k, 0.8 + H0(i * 7 + k, 65) * 0.3);
    }
  }
  __mk('t_banks');
  // the banks of the meres and rivers: moss and sedge crowding the water,
  // just back from the bank the water itself paints
  const bank = [];
  for (const p of PONDS) {
    const rx = p.w / 2, ry = p.h / 2, n = Math.round((rx + ry) / 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + H0(i, p.x) * 0.3, j = H0(i, p.y) * 5;
      const x = p.x + Math.cos(a) * (rx + 12 + j), y = p.y + Math.sin(a) * (ry + 10 + j * 0.6);
      if (nearestOnPath(x, y).d < PATH_HALF + 3 || x > W - WALL_W - 8 || inRiver(x, y, 10)) continue;
      bank.push([x, y, H0(i, 70) < 0.5 ? "sedge" : "moss", i + p.x * 3]);
    }
  }
  for (const rv of RIVERS) {
    let acc = 0;
    for (const sg of rv.segs) {
      for (let d = 0; d < sg.len; d += 8) {
        const k = (acc + d) | 0, t = d / sg.len;
        const x0 = sg.x1 + (sg.x2 - sg.x1) * t, y0 = sg.y1 + (sg.y2 - sg.y1) * t;
        const nx = -(sg.y2 - sg.y1) / sg.len, ny = (sg.x2 - sg.x1) / sg.len;
        for (const side of [-1, 1]) {
          if (H0(k, side + 80) < 0.45) continue;
          const off = rv.w / 2 + 12 + H0(k, side + 83) * 5;
          const x = x0 + nx * off * side, y = y0 + ny * off * side;
          if (nearestOnPath(x, y).d < PATH_HALF + 4 || x > W - WALL_W - 8 || x < 2 || y < 2 || y > H - 2 || inRiver(x, y, 9)) continue;
          bank.push([x, y, H0(k, side + 86) < 0.6 ? "sedge" : "moss", k * 3 + side]);
        }
      }
      acc += sg.len;
    }
  }
  bank.sort((a, b) => a[1] - b[1]);
  for (const [x, y, kind, sd] of bank) {
    if (kind === "moss") pixMoss(K, x, y, 1.5 + hash(sd, 1) * 1.8, sd);
    else pixSedge(K, x, y, 0.7 + hash(sd, 2) * 0.4, sd, 5, hash(sd, 3) < 0.3 ? SEDGE_PALE : SEDGE);
  }
  __mk('t_bones');
  // the bones of the drowned, and pale sticks, lying in the grass
  for (let i = 0; i < 18; i++) {
    const x = H0(i, 90) * SW, y = H0(i, 91) * H;
    if (!clear(x, y, 5)) continue;
    const k = H0(i, 92);
    if (k < 0.35) pixSkull(K, x, y, i);
    else if (k < 0.62) pixBone(K, x - 2.4, y, x + 2.4, y + (H0(i, 94) - 0.5) * 2);
    else pixStick(K, x, y, 6 + H0(i, 95) * 6, H0(i, 96) * Math.PI, i);
  }
  // the odd flat stone sunk in the turf
  const stoneCol = mix(STONE, R.GRASS_DK, 0.3);
  for (let i = 0; i < 12; i++) {
    const x = H0(i, 100) * SW, y = H0(i, 101) * H;
    if (!clear(x, y, 6)) continue;
    pixStone(K, x, y, 2.4 + H0(i, 102) * 2, 1.2 + H0(i, 103), stoneCol, i);
  }
  __mk('t_flush');
  K.flush();
  __mk('t_end');
}

// ---- the causeway: sunken flagstones, old planks, bones in the verge ---
// The old paving is laid in COURSES across the road, each cut into slabs of
// mixed widths; round a bend the courses fan like a wheel's spokes, so the
// slabs turn wedge-shaped instead of breaking apart. Stretches of it
// surface through the bone-dust (most by the bridges, whose approaches were
// paved), half-buried at their ends; the stones are the fen's drowned
// grey-green, a lit top edge, a shaded foot, dark joints with moss in them.
const SLAB = ["#7d7f70", "#858370", "#76796b", "#8a8674", "#72766a"].map(hexC);
const LICHEN_C = hexC("#a8a66e"), MOSS_J = [hexC("#4c6434"), hexC("#5e783e")];
const PLANK = { lit: hexC("#8c826c"), a: hexC("#6c6452"), b: hexC("#746a58"), dk: hexC("#4a4236"), grain: hexC("#564e40"), nail: hexC("#2e2826"), rust: hexC("#8a5a36") };
const MUD = [hexC("#2a2620"), hexC("#342f27"), hexC("#1c2624")];

function paintFenRoad(ctx) {
  __mk('r_start');
  const R = REALM, K = pixKit(ctx), k = K.k, seed = (R.seed | 0) % 9973;
  const main = hexC(R.PATH_MAIN);
  const H0 = (i, q) => hash(i + 104729, q);
  const ok = (x, y, m = 4) => x > m && x < W - WALL_W - 16 && y > m && y < H - m && !inRiver(x, y, 10);
  const onBridge = (d, m) => BRIDGES.some((b) => d > b.d0 - m && d < b.d1 + m);
  // the road's frame at d: where it is, and its normal (a tangent smoothed
  // over a few units, so the courses fan evenly round a bend)
  const frame = (d) => {
    const [x, y] = posAt(d), [ax, ay] = posAt(Math.max(0, d - 8)), [bx, by] = posAt(Math.min(TOTAL_LEN, d + 8));
    const L = Math.hypot(bx - ax, by - ay) || 1;
    return [x, y, -(by - ay) / L, (bx - ax) / L];
  };
  // how wet the road is at a point: by a mere or a river
  const wetAt = (x, y) => {
    let w = 0;
    for (const p of PONDS) w = Math.max(w, 1 - Math.hypot((x - p.x) / (p.w / 2 + 50), (y - p.y) / (p.h / 2 + 50)));
    if (RIVERS.length && inRiver(x, y, 40)) w = Math.max(w, inRiver(x, y, 20) ? 0.8 : 0.5);
    return w;
  };
  __mk('r_flecks');
  // bone-dust: pale flecks over the whole causeway
  for (let d = 0; d < TOTAL_LEN; d += 1.6) {
    const [x, y] = posAt(d), a = angleAt(d) + Math.PI / 2, hd = (d * 10) | 0;
    const off = (H0(hd, 1) - 0.5) * PATH_HALF * 1.8;
    const px = x + Math.cos(a) * off, py = y + Math.sin(a) * off;
    if (!ok(px, py)) continue;
    const pale = H0(hd, 2) < 0.6;
    K.set(K.P(px), K.P(py), pale ? hexC("#d8d0bc") : mixC(main, DUSK, 0.3), 0.5);
    if (H0(hd, 3) < 0.3) K.set(K.P(px) + 1, K.P(py), pale ? hexC("#d8d0bc") : mixC(main, DUSK, 0.3), 0.4);
  }

  // ---- where the old planks lie: across the wettest straight stretch ----
  let best = -1, bestD = 0;
  for (let dd = 150; dd < TOTAL_LEN - 120; dd += 10) {
    const [x, y] = posAt(dd);
    if (!ok(x, y, 10) || onBridge(dd, 110)) continue;
    if (Math.abs(angleAt(dd - 24) - angleAt(dd + 24)) > 0.02) continue;
    const wet = wetAt(x, y) + H0(dd, 9) * 0.2;
    if (wet > best) { best = wet; bestD = dd; }
  }
  const planks = best > 0.3;

  __mk('r_paving0');
  // ---- the paving ----
  // where the old causeway surfaces: a slow wave along the road, and the
  // bridges' approaches; never under the planks
  const wave = (d) => { const t = d / 64 + seed * 0.37, i = Math.floor(t), u = smooth01(t - i); return hash(i, seed + 5) * (1 - u) + hash(i + 1, seed + 5) * u; };
  const expo = (d) => {
    let e = smooth01((wave(d) - 0.56) / 0.2);
    for (const b of BRIDGES) { const g = Math.min(Math.abs(d - b.d0), Math.abs(d - b.d1)); if (g < 46) e = Math.max(e, smooth01(1 - g / 46)); }
    if (planks) e *= smooth01((Math.abs(d - bestD) - 22) / 14);
    return e * smooth01((d - 40) / 30) * smooth01((TOTAL_LEN - 40 - d) / 30);
  };
  const slabs = [];
  const INNER = PATH_HALF - 4;
  for (let d = 24 + H0(1, 4) * 6, row = 0; d < TOTAL_LEN - 36; row++) {
    const depth = 8 + H0(row, 5) * 2.5, d1 = d + depth;
    const e = Math.min(expo(d), expo(d1));
    if (e > 0.04 && !onBridge((d + d1) / 2, depth / 2 + 3)) {
      const [x0, y0, nx0, ny0] = frame(d), [x1, y1, nx1, ny1] = frame(d1);
      let a = -INNER - H0(row, 6) * 7;
      for (let c = 0; a < INNER; c++) {
        const b = Math.min(INNER + 2, a + 8 + H0(row * 13 + c, 7) * 7);
        const a0 = Math.max(a, -INNER), mid = (a0 + b) / 2;
        const sd = row * 31 + c;
        // corners, pulled in a hair so the joints show, and jostled
        const J = (q) => (H0(sd, q) - 0.5) * 0.9;
        const q = [
          [x0 + nx0 * a0 + J(10), y0 + ny0 * a0 + J(11)], [x0 + nx0 * b + J(12), y0 + ny0 * b + J(13)],
          [x1 + nx1 * b + J(14), y1 + ny1 * b + J(15)], [x1 + nx1 * a0 + J(16), y1 + ny1 * a0 + J(17)],
        ];
        const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
        for (const p of q) { p[0] += (cx - p[0]) * 0.07; p[1] += (cy - p[1]) * 0.07; }
        // a slab only where the bend leaves it a true four-sided stone
        let sgn = 0, good = b - a0 > 3.5;
        for (let s2 = 0; s2 < 4 && good; s2++) {
          const [ax, ay] = q[s2], [bx2, by2] = q[(s2 + 1) % 4], [cx2, cy2] = q[(s2 + 2) % 4];
          const cr = (bx2 - ax) * (cy2 - by2) - (by2 - ay) * (cx2 - bx2);
          if (Math.abs(cr) < 4) good = false;
          else if (!sgn) sgn = Math.sign(cr);
          else if (Math.sign(cr) !== sgn) good = false;
        }
        // the middle of the road surfaces first; the verges stay dust
        const v = e * (1 - (mid / PATH_HALF) ** 2 * 0.9) + (H0(sd, 8) - 0.5) * 0.45;
        if (good && v > 0.28 && ok(cx, cy, 6)) {
          const wet = wetAt(cx, cy);
          let col = mixC(SLAB[Math.floor(H0(sd, 9) * SLAB.length)], main, 0.22);
          if (wet > 0) col = mixC(col, hexC("#5c6a4c"), wet * 0.3);
          slabs.push({ q, v, sd, wet, sgn, T: tone3(col, 0.2, 0.26), crack: H0(sd, 19) < 0.22, lichen: H0(sd, 20) < 0.14 });
        }
        a = b;
      }
    }
    d = d1;
  }
  __mk('r_raster');
  // rasterise, a row at a time: which slab each pixel belongs to (pixel
  // centres inside all four edges), and whether the dust has buried it
  const PW = K.PW, PH = K.PH, SID = new Uint16Array(PW * PH), VIS = new Uint8Array(PW * PH), done = new Uint8Array(PW * PH);
  slabs.forEach((s, si) => {
    const P = s.q.map(([x, y]) => [x * k, y * k]);
    s.i0 = Math.max(1, Math.floor(Math.min(P[0][0], P[1][0], P[2][0], P[3][0])) - 1); s.i1 = Math.min(PW - 2, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0], P[3][0])) + 1);
    s.j0 = Math.max(1, Math.floor(Math.min(P[0][1], P[1][1], P[2][1], P[3][1])) - 1); s.j1 = Math.min(PH - 2, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1], P[3][1])) + 1);
    const sure = s.v >= 0.55, thr = ((s.v - 0.28) / 0.27) * 0.75 + 0.25;
    for (let j = s.j0; j <= s.j1; j++) {
      const py = j + 0.5;
      let lo = -Infinity, hi = Infinity;
      for (let e = 0; e < 4; e++) {
        const ax = P[e][0], ay = P[e][1], bx = P[(e + 1) % 4][0], by = P[(e + 1) % 4][1];
        // (bx-ax)(py-ay) - (by-ay)(px-ax) has the quad's own sign inside
        const ca = -(by - ay) * s.sgn, cb = ((bx - ax) * (py - ay) + (by - ay) * ax) * s.sgn;
        if (ca > 1e-9) lo = Math.max(lo, -cb / ca);
        else if (ca < -1e-9) hi = Math.min(hi, -cb / ca);
        else if (cb < 0) { lo = Infinity; break; }
      }
      for (let i = Math.max(s.i0, Math.ceil(lo - 0.5)); i <= Math.min(s.i1, Math.floor(hi - 0.5)); i++) {
        const p = j * PW + i;
        SID[p] = si + 1;
        VIS[p] = sure || vnoise(i / k, j / k, 5, seed + 17) <= thr ? 1 : 0;
      }
    }
  });
  __mk('r_shade');
  slabs.forEach((s, si) => {
    const id = si + 1, T = s.T;
    // a crack: a dark line wandering down across the stone
    const crack = new Set();
    if (s.crack) {
      let ci = Math.round((s.i0 + s.i1) / 2 + (H0(s.sd, 21) - 0.5) * (s.i1 - s.i0) * 0.5), cj = s.j0;
      while (cj <= s.j1) { crack.add(cj * PW + ci); cj++; if (H0(s.sd * 7 + cj, 22) < 0.45) ci += H0(s.sd + cj, 23) < 0.5 ? -1 : 1; }
    }
    // a spot or two of lichen
    const lx = s.lichen ? Math.round(s.i0 + 2 + H0(s.sd, 24) * (s.i1 - s.i0 - 4)) : -99, ly = Math.round(s.j0 + 2 + H0(s.sd, 25) * (s.j1 - s.j0 - 4));
    for (let j = s.j0; j <= s.j1; j++) {
      for (let i = s.i0; i <= s.i1; i++) {
        const p = j * PW + i;
        if (done[p]) continue;
        const own = SID[p];
        if (own === id && VIS[p]) {
          done[p] = 1;
          const up = SID[p - PW] === id, dn = SID[p + PW] === id, lf = SID[p - 1] === id, rt = SID[p + 1] === id;
          let c = T[1];
          const hh = hash(i * 3 + s.sd, j);
          if (!up) c = T[0];
          else if (!dn || !rt) c = T[2];
          else if (!lf) c = mixC(T[0], T[1], 0.5);
          else if (hh < 0.025) c = mixC(T[1], T[2], 0.6);
          else if (hh > 0.975) c = mixC(T[0], T[1], 0.5);
          if (crack.has(p) && up && dn) c = mixC(T[2], DUSK, 0.15);
          if (up && dn && lf && rt && Math.abs(i - lx) + Math.abs(j - ly) * 1.5 < 2.2 + hash(i, j + 3)) c = mixC(T[1], LICHEN_C, 0.6);
          if (s.wet > 0.3 && !dn && hash(i, j + 7) < s.wet * 0.5) c = MOSS_J[0];
          K.set(i, j, c);
        } else if (!VIS[p]) {
          // a joint: the gap beside a stone — deep on its shaded side (but
          // never where the dust runs on over the same stone)
          const nb = (q) => VIS[q] && SID[q] !== own;
          const below = nb(p - PW) || nb(p - 1), above = nb(p + PW) || nb(p + 1);
          if (!below && !above) continue;
          done[p] = 1;
          const src = slabs[SID[below ? (nb(p - PW) ? p - PW : p - 1) : (nb(p + PW) ? p + PW : p + 1)] - 1];
          if (hash(i + src.sd, j * 3) < 0.08 + src.wet * 0.3) K.set(i, j, MOSS_J[hash(i, j) < 0.5 ? 0 : 1]);
          else K.shift(i, j, below ? -0.26 : -0.1);
        }
      }
    }
  });

  __mk('r_planks');
  // ---- the old planks: laid across the road, sunk in black mud ----
  if (planks) {
    const [bx, by] = posAt(bestD), ang = angleAt(bestD), tx = Math.cos(ang), ty = Math.sin(ang), nx = -ty, ny = tx;
    const HALF = PATH_HALF - 6, LEN = 5 * 3.3 + 2.4;
    const loc = (i, j) => { const x = (i + 0.5) / k - bx, y = (j + 0.5) / k - by; return [x * tx + y * ty, x * nx + y * ny]; };
    const R0 = Math.ceil((LEN + HALF + 3) * k), ci = K.P(bx), cj = K.P(by);
    // the wet mud they lie in: just their own footprint and a ragged pixel
    // or two past their ends and sides, water standing in it here and there
    for (let j = cj - R0; j <= cj + R0; j++) {
      for (let i = ci - R0; i <= ci + R0; i++) {
        const [u, v] = loc(i, j);
        const ragU = LEN + 1.2 + (vnoise(v, 0, 3, seed + 31) - 0.5) * 2.2, ragV = HALF + 1 + (vnoise(u, 0, 3, seed + 33) - 0.5) * 2;
        if (Math.abs(u) > ragU || Math.abs(v) > ragV) continue;
        const edge = Math.abs(u) > ragU - 0.6 || Math.abs(v) > ragV - 0.6;
        K.set(i, j, edge ? mixC(K.get(i, j), MUD[0], 0.5) : vnoise(u, v, 2.5, seed + 35) > 0.7 ? MUD[2] : MUD[hash(i * 3, j) < 0.3 ? 1 : 0]);
      }
    }
    for (let q = -5; q <= 5; q++) {
      if (H0(q + 9, 14) < 0.1 || (Math.abs(q) === 5 && H0(q + 9, 10) < 0.5)) continue;   // one gone, the end ones sunk
      const c0 = q * 3.3 + (H0(q + 9, 13) - 0.5) * 0.5, w2 = 1.3 + H0(q + 9, 15) * 0.2;
      const e0 = -HALF + H0(q + 9, 11) * 2.5, e1 = HALF - H0(q + 9, 12) * 2.5 - (H0(q + 9, 16) < 0.2 ? 8 : 0);
      const tilt = (H0(q + 9, 17) - 0.5) * 0.05, base = q & 1 ? PLANK.a : PLANK.b;
      const inP = (u, v) => { const uu = u - c0 - v * tilt; return uu > -w2 && uu < w2 && v > e0 && v < e1; };
      const cs = [[c0 - w2 + e0 * tilt, e0], [c0 + w2 + e0 * tilt, e0], [c0 - w2 + e1 * tilt, e1], [c0 + w2 + e1 * tilt, e1]].map(([u, v]) => [bx + tx * u + nx * v, by + ty * u + ny * v]);
      const pi0 = K.P(Math.min(...cs.map((c) => c[0]))) - 2, pi1 = K.P(Math.max(...cs.map((c) => c[0]))) + 2;
      const pj0 = K.P(Math.min(...cs.map((c) => c[1]))) - 2, pj1 = K.P(Math.max(...cs.map((c) => c[1]))) + 2;
      for (let j = pj0; j <= pj1; j++) {
        for (let i = pi0; i <= pi1; i++) {
          const [u, v] = loc(i, j);
          if (!inP(u, v)) { const [us, vs] = loc(i - 1, j - 1); if (inP(us, vs)) K.shift(i, j, -0.34); continue; }
          const [ua, va] = loc(i, j - 1), [ub, vb] = loc(i, j + 1), [ur, vr] = loc(i + 1, j);
          let c = !inP(ua, va) ? PLANK.lit : !inP(ub, vb) || !inP(ur, vr) ? PLANK.dk : base;
          // grain along the plank, broken; nails over the stringers; the
          // ends gone soft and dark
          const row = Math.floor((u - c0 + w2) * k);
          if (c === base && hash(row + q * 7, 30) < 0.5 && hash(row * 13 + q, Math.floor(v * 0.8)) < 0.55) c = PLANK.grain;
          if (Math.abs(Math.abs(v) - (HALF - 5)) < 0.5 && Math.abs(u - c0) < 0.5) c = hash(q, v > 0 ? 1 : 2) < 0.4 ? PLANK.rust : PLANK.nail;
          if (v > e1 - 1 || v < e0 + 1) c = hash(i, j) < 0.5 ? PLANK.dk : c;
          if (c === base && vnoise(u * 2, v, 3, seed + q) > 0.78) c = MOSS_J[0];
          K.set(i, j, c);
        }
      }
    }
  }
  __mk('r_puddles');
  // puddles standing in the causeway's hollows
  for (let i = 0; i < 7; i++) {
    const dd = 80 + H0(i, 14) * (TOTAL_LEN - 160), [x, y] = posAt(dd), a = angleAt(dd) + Math.PI / 2;
    const off = (H0(i, 15) - 0.5) * PATH_HALF * 1.1;
    const px = x + Math.cos(a) * off, py = y + Math.sin(a) * off;
    if (!ok(px, py, 12) || onBridge(dd, 20) || (planks && Math.abs(dd - bestD) < 34)) continue;
    pixPuddle(K, px, py, 3.5 + H0(i, 16) * 4.5, 1.5 + H0(i, 17) * 1.2, i + 300, { lip: 0.16 });
  }
  __mk('r_verge');
  // the verge: skulls, long bones and a rusted helm trodden into the edge
  for (let dd = 40 + H0(2, 18) * 30, i = 0; dd < TOTAL_LEN - 20; dd += 34 + H0(i, 19) * 44, i++) {
    const [x, y] = posAt(dd), a = angleAt(dd) + Math.PI / 2, side = H0(i, 20) < 0.5 ? -1 : 1;
    const off = side * (PATH_HALF - 1 + H0(i, 21) * 6);
    const px = x + Math.cos(a) * off, py = y + Math.sin(a) * off;
    if (!ok(px, py, 8) || nearPond(px, py, 6) || onBridge(dd, 14)) continue;
    const kk = H0(i, 22);
    if (kk < 0.4) pixSkull(K, px, py, i + 77);
    else if (kk < 0.75) pixBone(K, px - 2.6, py - 0.6, px + 2.6, py + 0.6 * side);
    else if (kk < 0.87) stampPx(K, K.P(px) - 3, K.P(py) - 3, HELM, HELM_C, -0.3, H0(i, 23) < 0.5 ? 4 : 99);
    else pixSedge(K, px, py + 1, 0.7, i + 40, 4);
  }
  __mk('r_flush');
  K.flush();
  __mk('r_end');
}

const __tm = (k, f) => (ctx, kit) => { const t0 = performance.now(); f(ctx, kit); (globalThis.__fenT ||= {})[k] = ((globalThis.__fenT || {})[k] || 0) + performance.now() - t0; };
HOLLOW_ART.turf.fen = __tm("turf", paintFenTurf);
HOLLOW_ART.road.fen = __tm("road", paintFenRoad);

// ---- the water's dressing: lily pads and duckweed on meres and rivers ---
// Baked once per realm in pixels, in a few small pieces (one per cluster,
// so a frame never blits a board-sized sheet of nothing), laid flat over the
// water with the gate — after the ponds and rivers, before anything that
// stands. The pads keep well in from the banks the water paints.
const PAD_T = [[hexC("#6e9050"), hexC("#4e6e3a"), hexC("#34502e")], [hexC("#86824a"), hexC("#666238"), hexC("#48482c")]];
const PAD_SH = [10, 16, 14, 200], WEED_C = [hexC("#4a6630"), hexC("#62803a")];
const BLOOM = { W: hexC("#fbf6ee"), w: hexC("#d6cec4"), Y: hexC("#e8c050") };
// one pad at pixel (ci, cj): a flat disc with its notch cut to the middle,
// lit along its upper rim, a vein of shade across it, its shadow a pixel
// down-right on the water; now and then a white flower on it.
// put(i, j, [r, g, b, a?])
const padPx = (put, ci, cj, r, seed, k = PX) => {
  const RX = Math.max(2.2, r * k * 1.1), RY = Math.max(1.4, r * k * 0.55), notch = hash(seed, 2) * Math.PI * 2;
  const T = PAD_T[hash(seed, 20) < 0.18 ? 1 : 0];
  const inP = (i, j) => {
    const u = i / RX, v = j / RY, q = u * u + v * v;
    if (q > 1) return false;
    const an = Math.atan2(v, u);
    return !(q > 0.04 && Math.abs(((an - notch + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.42);
  };
  const X = Math.ceil(RX) + 1, Y = Math.ceil(RY) + 1;
  for (let j = -Y; j <= Y + 1; j++) for (let i = -X; i <= X + 1; i++) if (!inP(i, j) && inP(i - 1, j - 1)) put(ci + i, cj + j, PAD_SH);
  for (let j = -Y; j <= Y; j++) {
    for (let i = -X; i <= X; i++) {
      if (!inP(i, j)) continue;
      const u = i / RX, v = j / RY;
      const rim = !inP(i, j - 1) || !inP(i - 1, j), foot = !inP(i, j + 1) || !inP(i + 1, j);
      put(ci + i, cj + j, rim && u + v < 0.3 ? T[0] : foot && u + v > -0.3 ? T[2] : u * 0.4 + v > 0.45 ? T[2] : T[1]);
    }
  }
  if (hash(seed, 21) < 0.12) {
    const fx = ci + Math.round((hash(seed, 22) - 0.5) * RX * 0.6), fy = cj - 1;
    put(fx, fy - 1, BLOOM.W); put(fx - 1, fy, BLOOM.W); put(fx, fy, BLOOM.Y); put(fx + 1, fy, BLOOM.w); put(fx, fy + 1, BLOOM.w);
  }
};
const WATERS = { key: "", chunks: [] };
const bakeWaters = () => {
  const key = `${REALM.id}|${PONDS.length}|${RIVERS.length}|${PTS[0]}`;
  if (WATERS.key === key) return WATERS;
  WATERS.key = key;
  WATERS.chunks = [];
  const pads = [], weed = [];
  const road = (x, y, m) => nearestOnPath(x, y).d < PATH_HALF + m;
  // meres: a few beds of pads, each a cluster, well in from the shore
  PONDS.forEach((p, pi) => {
    const rx = p.w / 2, ry = p.h / 2, nb = Math.min(5, 1 + Math.floor((p.w * p.h) / 4000));
    const inset = 7 + Math.min(4, Math.min(rx, ry) * 0.08);
    for (let b = 0; b < nb; b++) {
      const a = hash(pi * 31 + b, 1) * Math.PI * 2, d = 0.35 + hash(pi * 31 + b, 2) * 0.4;
      const cx = p.x + Math.cos(a) * (rx - inset) * d, cy = p.y + Math.sin(a) * (ry - inset) * d;
      const m = 2 + Math.floor(hash(pi * 31 + b, 3) * (p.w > 150 ? 7 : 4));
      for (let q = 0; q < m; q++) {
        const x = cx + (hash(b * 7 + q, pi + 4) - 0.5) * 14, y = cy + (hash(b * 7 + q, pi + 5) - 0.5) * 6;
        if (((x - p.x) / (rx - inset)) ** 2 + ((y - p.y) / (ry - inset)) ** 2 > 1 || road(x, y, 4)) continue;
        pads.push([x, y, 1.7 + hash(b * 7 + q, pi + 6) * 1.1, pi * 100 + b * 7 + q]);
      }
    }
  });
  // rivers: a raft now and then in the slack water along one bank
  RIVERS.forEach((rv, ri) => {
    let acc = 0;
    for (const sg of rv.segs) {
      for (let d = 12; d < sg.len - 6; d += 30) {
        const k = (acc + d) | 0;
        if (hash(k, ri + 40) < 0.5) continue;
        const t = d / sg.len, side = hash(k, ri + 41) < 0.5 ? -1 : 1;
        const tx = (sg.x2 - sg.x1) / sg.len, ty = (sg.y2 - sg.y1) / sg.len, nx = -ty, ny = tx;
        const off = side * Math.max(0, rv.w / 2 - 9 - hash(k, ri + 42) * 2);
        const cx = sg.x1 + (sg.x2 - sg.x1) * t + nx * off, cy = sg.y1 + (sg.y2 - sg.y1) * t + ny * off;
        if (road(cx, cy, 30) || cx > W - WALL_W - 8 || cx < 6 || cy < 6 || cy > H - 6) continue;
        const m = 1 + Math.floor(hash(k, ri + 43) * 3);
        for (let q = 0; q < m; q++) {
          const s = (hash(k + q, 44) - 0.5) * 9;
          pads.push([cx + tx * s + nx * (hash(k + q, 45) - 0.5) * 2, cy + ty * s + ny * (hash(k + q, 45) - 0.5) * 2, 1.5 + hash(k + q, 46) * 0.9, k * 5 + q]);
        }
      }
      acc += sg.len;
    }
  });
  // duckweed round every pad, in a loose drift
  for (const [x, y, r, sd] of pads) {
    for (let q = 0; q < 4; q++) weed.push([x + (hash(sd, q) - 0.5) * r * 4.2, y + (hash(sd, q + 9) - 0.5) * r * 1.8, sd + q]);
  }
  if (!pads.length) return WATERS;
  // bake them in clusters
  const CELL = 110, cells = new Map();
  for (const pd of pads) { const key2 = `${Math.floor(pd[0] / CELL)},${Math.floor(pd[1] / CELL)}`; if (!cells.has(key2)) cells.set(key2, []); cells.get(key2).push(pd); }
  for (const list of cells.values()) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y, r] of list) { x0 = Math.min(x0, x - r * 3); y0 = Math.min(y0, y - r * 2); x1 = Math.max(x1, x + r * 3); y1 = Math.max(y1, y + r * 2); }
    x0 = Math.floor(x0 - 2); y0 = Math.floor(y0 - 3); x1 = Math.ceil(x1 + 2); y1 = Math.ceil(y1 + 2);
    const pw = Math.round((x1 - x0) * PX), ph = Math.round((y1 - y0) * PX);
    const img = new ImageData(pw, ph), dd = img.data;
    const put = (i, j, c) => {
      if (i < 0 || j < 0 || i >= pw || j >= ph) return;
      const o = (j * pw + i) * 4, a = c[3] ?? 255;
      if (a < 255 && dd[o + 3] === 255) { const t = a / 255; dd[o] += (c[0] - dd[o]) * t; dd[o + 1] += (c[1] - dd[o + 1]) * t; dd[o + 2] += (c[2] - dd[o + 2]) * t; return; }
      dd[o] = c[0]; dd[o + 1] = c[1]; dd[o + 2] = c[2]; dd[o + 3] = a;
    };
    const mine = (x, y) => x >= x0 && y >= y0 && x < x1 && y < y1;
    for (const [x, y, sd] of weed) {
      if (!mine(x, y)) continue;
      const i = Math.round((x - x0) * PX), j = Math.round((y - y0) * PX);
      put(i, j, WEED_C[hash(sd, 3) < 0.6 ? 0 : 1]);
      if (hash(sd, 4) < 0.4) put(i + 1, j, WEED_C[0]);
    }
    list.sort((a, b) => a[1] - b[1]);
    for (const [x, y, r, sd] of list) padPx(put, Math.round((x - x0) * PX), Math.round((y - y0) * PX), r, sd);
    const cv = document.createElement("canvas");
    cv.width = pw; cv.height = ph;
    cv.getContext("2d").putImageData(img, 0, 0);
    WATERS.chunks.push({ cv, x: x0, y: y0, w: pw / PX, h: ph / PX });
  }
  return WATERS;
};
const drawWaters = (ctx) => { for (const c of bakeWaters().chunks) ctx.drawImage(c.cv, c.x, c.y, c.w, c.h); };

// ---- the gate: a great barrow ----------------------------------------
// The dead come out of the ground. A long grassed mound at the road's
// first yards, kerbed with stones; a doorway of three great slabs, skulls
// set along its lintel and spirals cut in it; standing stones in a broken
// ring about it. The still part is baked once per realm; the fog that
// spills out down the road, the eyes in the dark, the candles by the door
// and the witch-light in the spirals are live.
const GATE = { key: "", cv: null, dark: null };
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bakeGate = () => {
  const key = `${REALM.id}|${PTS[0]}|${PTS.length}|${REALM.GRASS}`;
  if (GATE.key === key) return GATE;
  GATE.key = key;
  const [px, py] = PTS[0], [qx, qy] = PTS[1] || PTS[0];
  const L = Math.hypot(qx - px, qy - py) || 1, tx = (qx - px) / L, ty = (qy - py) / L;
  // the doorway sits a little inside the edge, the whole mound on the board
  // walk in along the road until the whole mound fits on the board, so the
  // door stands on the road even where it comes in on a slant
  let gx = px + tx * 30, gy = py + ty * 30;
  for (let d = 30; d < 200; d += 2) {
    const [x, y] = posAt(d);
    gx = x; gy = y;
    if (x >= 62 && y >= 48 && x <= W - WALL_W - 70 && y <= H - 30) break;
  }
  const mx = gx, my = gy - 15, rx = 56, ry = 30;
  GATE.gx = gx; GATE.gy = gy; GATE.tx = tx; GATE.ty = ty;
  const B = { x0: Math.floor(gx - 92), y0: Math.floor(gy - 96), w: 184, h: 164 };
  GATE.bx = B.x0; GATE.by = B.y0; GATE.bw = B.w; GATE.bh = B.h;
  const turf = mix(REALM.GRASS, "#56664a", 0.55);
  const col = mix(STONE, "#96948a", 0.3);
  // standing stones in a broken ring, off the road and on the board
  const ring = [];
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * 2 * (i / 11) + 0.2 + (hash(i, 7) - 0.5) * 0.25;
    const sx = mx + Math.cos(a) * (rx + 12 + hash(i, 8) * 6), sy = my + Math.sin(a) * (ry + 13 + hash(i, 9) * 5);
    if (nearestOnPath(sx, sy).d < PATH_HALF + 8 || sx < 8 || sy < 16 || sx > W - WALL_W - 10 || sy > H - 6) continue;
    if (hash(i, 10) < 0.2) continue;
    ring.push({ x: sx, y: sy, h: 14 + hash(i, 11) * 10, w: 3.4 + hash(i, 12) * 1.6, ln: (hash(i, 13) - 0.5) * 0.3, seed: i * 13 + 5, fallen: false });
  }
  const stoneAt = (c, st) => part(c, (cc) => {
    if (st.fallen) {
      standing(cc, [[st.x - st.h * 0.5, st.y + 1], [st.x - st.h * 0.5, st.y - st.w * 0.9], [st.x + st.h * 0.5, st.y - st.w], [st.x + st.h * 0.5, st.y + 1]], col, 2);
      weather(cc, st.x, st.y + 1, st.h, st.w, st.seed, 1);
      return;
    }
    cc.save(); cc.translate(st.x, st.y); cc.rotate(st.ln);
    standing(cc, [[-st.w, 0.5], [-st.w * 1.08, -st.h * 0.7], [-st.w * 0.6, -st.h], [st.w * 0.5, -st.h * 0.97], [st.w, -st.h * 0.62], [st.w * 0.95, 0.5]], col, 1.6);
    weather(cc, 0, 0, st.w * 2, st.h, st.seed, 0.7);
    cc.restore();
  });
  GATE.cv = bakeSprite(B.w, B.h, (c) => {
    c.translate(-B.x0, -B.y0);
    const behind = ring.filter((st) => st.y < my).sort((a, b) => a.y - b.y), front = ring.filter((st) => st.y >= my).sort((a, b) => a.y - b.y);
    for (const st of ring) shadow(c, st.x + 4, st.y + 0.5, st.w * 2, 2, 0.28);
    behind.forEach((st) => stoneAt(c, st));
    // the mound: its shade thrown down-right, a turfed body lit from the
    // upper left in three tones, and heather and sedge over its back
    shadow(c, mx + 10, my + ry * 0.7, rx + 6, ry * 0.55, 0.34);
    part(c, (cc) => {
      blobPath(cc, mx, my, rx, ry, 91, 0.05, 16);
      cc.fillStyle = darken(turf, 0.42); cc.fill();
      cc.save(); blobPath(cc, mx, my, rx, ry, 91, 0.05, 16); cc.clip();
      blobPath(cc, mx - rx * 0.06, my - ry * 0.12, rx * 0.96, ry * 0.88, 92, 0.06, 14); cc.fillStyle = darken(turf, 0.14); cc.fill();
      blobPath(cc, mx - rx * 0.16, my - ry * 0.26, rx * 0.8, ry * 0.68, 93, 0.08, 14); cc.fillStyle = turf; cc.fill();
      blobPath(cc, mx - rx * 0.32, my - ry * 0.46, rx * 0.5, ry * 0.38, 94, 0.14, 12); cc.fillStyle = lighten(turf, 0.2); cc.fill();
      // grass lying over the mound's curve, in short strokes
      for (let i = 0; i < 70; i++) {
        const a = hash(i, 24) * Math.PI * 2, d = Math.sqrt(hash(i, 25)) * 0.92;
        const hx = mx + Math.cos(a) * rx * d, hy = my + Math.sin(a) * ry * d;
        const lit = -Math.cos(a) * d * 0.6 - Math.sin(a) * d * 0.8;
        cc.fillStyle = lit > 0.2 ? lighten(turf, 0.32) : lit > -0.3 ? darken(turf, 0.2) : darken(turf, 0.45);
        cc.fillRect(ap(hx), ap(hy), 0.5, 1.5);
      }
      // heather and rust moss over the crown
      for (let i = 0; i < 40; i++) {
        const a = hash(i, 20) * Math.PI * 2, d = Math.sqrt(hash(i, 21));
        const hx = mx + Math.cos(a) * rx * d * 0.9, hy = my + Math.sin(a) * ry * d * 0.8;
        const k = hash(i, 22);
        cc.fillStyle = k < 0.3 ? "#5a4a5e" : k < 0.5 ? "#6a4a3a" : k < 0.75 ? lighten(turf, 0.26) : darken(turf, 0.2);
        cc.fillRect(ap(hx), ap(hy), 1, 0.5);
      }
      cc.restore();
    });
    for (const [ox, oy, hh, ln] of [[-0.62, -0.38, 17, -0.08], [0.6, -0.34, 14, 0.1], [-0.3, -0.72, 12, 0.02]]) {
      stoneAt(c, { x: mx + ox * rx, y: my + oy * ry, h: hh, w: 3.8, ln, seed: Math.round(ox * 100), fallen: false });
    }
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * (1.05 + hash(i, 30) * 0.9), d = 0.3 + hash(i, 31) * 0.6;
      sedge(c, mx + Math.cos(a) * rx * d, my + Math.sin(a) * ry * d + 2, 0.7 + hash(i, 32) * 0.3, i + 60, 4, "#5e6a42", "#9a9460");
    }
    // the kerb: a row of low stones along the mound's foot
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * (0.02 + (i / 15) * 0.96);
      const kx = mx + Math.cos(a) * rx * 0.99, ky = my + Math.sin(a) * ry * 0.96;
      if (Math.abs(kx - gx) < 26) continue;
      part(c, (cc) => standing(cc, [[kx - 3.2, ky + 1.5], [kx - 3, ky - 2.4], [kx + 2.8, ky - 2.6], [kx + 3.2, ky + 1.5]], darken(col, 0.05 + hash(i, 40) * 0.1), 1.2));
    }
    // the doorway: the passage's dark, then three great slabs
    const dT = gy - 20, dB = gy + 14, dW = 16;
    c.fillStyle = "#0a0c0c";
    c.fillRect(gx - dW, dT, dW * 2, dB - dT);
    for (let k = 0; k < 3; k++) { c.fillStyle = rgba("#1a2420", 0.9 - k * 0.3); c.fillRect(gx - dW, dB - 2 - k * 2, dW * 2, 2); }
    for (const [sx, w] of [[-dW - 8, 8], [dW, 8]]) part(c, (cc) => {
      standing(cc, [[gx + sx, dB + 1], [gx + sx - (sx < 0 ? 0.6 : -0.6), dT - 1], [gx + sx + w, dT - 1], [gx + sx + w + (sx < 0 ? 0.4 : -0.4), dB + 1]], col, 1);
      cc.fillStyle = darken(col, 0.4); px1(cc, gx + sx + w - 2, dT + 4, 0.5, dB - dT - 8);
      weather(cc, gx + sx + w / 2, dB, w, dB - dT, sx < 0 ? 3 : 4, 0.9);
    });
    part(c, (cc) => {
      standing(cc, [[gx - dW - 11, dT + 1], [gx - dW - 10, dT - 8], [gx + dW + 10, dT - 8.6], [gx + dW + 11, dT + 1]], lighten(col, 0.04), 2.6);
      // spirals cut along its face
      cc.strokeStyle = darken(col, 0.48); cc.lineWidth = 0.6;
      for (const ox of [-15, 0, 15]) {
        cc.beginPath();
        for (let a = 0; a < 10; a += 0.35) { const r = 0.32 * a; const sx = gx + ox + Math.cos(a) * r, sy = dT - 3.6 + Math.sin(a) * r * 0.75; a ? cc.lineTo(sx, sy) : cc.moveTo(sx, sy); }
        cc.stroke();
      }
      cc.fillStyle = MOSS; px1(cc, gx - dW - 10, dT - 9, 4, 1); px1(cc, gx + 6, dT - 9.6, 3, 0.5);
    });
    // skulls set along the lintel
    for (const ox of [-18, -7, 5, 17]) part(c, (cc) => skull(cc, gx + ox, dT - 12, 2.5));
    front.forEach((st) => stoneAt(c, st));
    // the threshold: bones scattered where the road leaves the door
    for (let i = 0; i < 4; i++) {
      const bx = gx + (hash(i, 50) - 0.5) * 44, by = dB + 3 + hash(i, 51) * 14;
      if (hash(i, 52) < 0.4) part(c, (cc) => skull(cc, bx, by, 1.8));
      else part(c, (cc) => longBone(cc, bx - 3, by, bx + 3, by + (hash(i, 53) - 0.5) * 3, 1));
    }
  });
  // the dark spilling out of the door across the road, dithered
  GATE.dark = bakeSprite(B.w, B.h, (c) => {
    const cv = c.canvas, PW = cv.width, PH = cv.height;
    const img = c.getImageData(0, 0, PW, PH), dd = img.data;
    for (let yy = 0; yy < PH; yy++) for (let xx = 0; xx < PW; xx++) {
      const x = B.x0 + xx / PX, y = B.y0 + yy / PX;
      const ddx = (x - gx) / 30, ddy = (y - (gy + 12)) / 16;
      const r = Math.hypot(ddx, ddy * (y < gy + 12 ? 2 : 1));
      const a = Math.max(0, 1 - r) * (y > gy - 6 ? 1 : 0);
      const lvl = Math.min(3, Math.floor(a * 3.4 + BAYER4[(yy & 3) * 4 + (xx & 3)] / 16));
      if (lvl <= 0) continue;
      const o = (yy * PW + xx) * 4;
      dd[o] = 10; dd[o + 1] = 16; dd[o + 2] = 14; dd[o + 3] = [0, 60, 110, 160][lvl];
    }
    c.putImageData(img, 0, 0);
  }, false);
  GATE.candles = [[gx - 29, gy + 17], [gx + 29, gy + 17]];
  GATE.eyes = [[gx - 6, gy - 4, 0], [gx + 6, gy + 3, 2.3], [gx - 1, gy - 11, 4.1]];
  return GATE;
};

const drawBarrowGate = (ctx, time) => {
  if (!PTS.length) return;
  drawWaters(ctx);
  const G = bakeGate();
  ctx.drawImage(G.cv, G.bx, G.by, G.bw, G.bh);
  // witch-light breathing in the passage and in the lintel's spirals
  const breathe = 0.5 + 0.5 * Math.sin(time * 1.3);
  glow(ctx, G.gx, G.gy + 2, 11, TEAL, 0.06 + breathe * 0.08);
  ctx.fillStyle = rgba(TEAL, 0.25 + breathe * 0.5);
  for (const ox of [-15, 0, 15]) { ctx.fillRect(ap(G.gx + ox - 0.5), ap(G.gy - 24.6), 1, 1); }
  // eyes in the dark, blinking out of step
  G.eyes.forEach(([ex, ey, ph], i) => {
    const t = time * 0.8 + ph;
    if (Math.sin(t) < -0.3 || Math.sin(t * 6.3) > 0.95) return;
    ctx.fillStyle = rgba(TEAL, 0.25);
    ctx.fillRect(ap(ex - 3.5), ap(ey - 0.5), 3, 2); ctx.fillRect(ap(ex + 0.5), ap(ey - 0.5), 3, 2);
    ctx.fillStyle = i === 1 ? "#d8fff0" : TEAL;
    ctx.fillRect(ap(ex - 3), ap(ey), 1.5, 1); ctx.fillRect(ap(ex + 1), ap(ey), 1.5, 1);
  });
  ctx.drawImage(G.dark, G.bx, G.by, G.bw, G.bh);
  // fog creeping out of the door and down the road
  for (let i = 0; i < 6; i++) {
    const life = ((time * 0.13 + i / 6) % 1);
    const along = 6 + life * 70, side = Math.sin(i * 2.4 + time * 0.3) * 14;
    const fx = G.gx + G.tx * along * 0.8 - G.ty * side, fy = G.gy + 14 + life * 6 + G.ty * along * 0.5 + G.tx * side * 0.3;
    const a = Math.sin(life * Math.PI) * 0.16;
    soft(ctx, fx, fy, 12 + life * 16, 4 + life * 4, [[0, rgba("#b8ccc4", a)], [1, rgba("#b8ccc4", 0)]]);
  }
  // corpse-candles either side of the door
  for (const [cx, cy] of G.candles) {
    ctx.fillStyle = "#d8ceb0"; ctx.fillRect(ap(cx - 1), ap(cy - 5), 2, 5);
    ctx.fillStyle = "#241a26"; ctx.fillRect(ap(cx - 1.5), ap(cy), 3, 0.5);
    witchFlame(ctx, cx, cy - 5, 1.1, time, cx);
  }
};
HOLLOW_ART.spawn.barrowgate = drawBarrowGate;
