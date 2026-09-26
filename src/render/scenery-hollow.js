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

// a standing puddle in the turf: a peat lip, black water with the sky in
// it, sometimes a lily pad or a tuft of sedge at one end
const puddle = (c, x, y, rx, ry, seed, lily = false) => {
  c.fillStyle = rgba(PEAT, 0.6);
  blobPath(c, x + 0.6, y + 0.6, rx + 1.4, ry + 1.1, seed, 0.2, 9); c.fill();
  c.fillStyle = "#2c3c38";
  blobPath(c, x, y, rx, ry, seed + 1, 0.2, 9); c.fill();
  c.save(); blobPath(c, x, y, rx, ry, seed + 1, 0.2, 9); c.clip();
  c.fillStyle = rgba("#0a100e", 0.55); c.fillRect(x - rx - 1, y - ry - 1, rx * 2 + 2, 1.2);
  c.fillStyle = "#4a625c"; c.fillRect(x - rx, ap(y - ry * 0.25), rx * 2, ap(ry * 0.7));
  c.fillStyle = rgba("#a8c4bc", 0.8); c.fillRect(ap(x - rx * 0.45), ap(y - ry * 0.05), ap(rx * 0.6), 0.5);
  c.fillStyle = rgba("#a8c0b8", 0.5); c.fillRect(ap(x - rx * 0.1), ap(y + ry * 0.4), ap(rx * 0.3), 0.5);
  c.restore();
  if (lily) lilyPad(c, x + rx * 0.35, y + ry * 0.1, Math.min(2.2, rx * 0.35), seed);
};
// a cushion of sphagnum: small lit knobs in green, ochre and rust
const MOSS_COLS = ["#5f7a3c", "#6e8440", "#86864a", "#76604a", "#5e4a44", "#4e6a3a"];
const mossCushion = (c, x, y, r, seed) => {
  const n = 5 + Math.floor(r * 2.2);
  const base = MOSS_COLS[Math.floor(hash(seed, 1) * MOSS_COLS.length)];
  c.fillStyle = rgba(darken(base, 0.45), 0.6);
  blobPath(c, x + 0.5, y + 0.6, r * 1.05, r * 0.6, seed, 0.25, 9); c.fill();
  for (let i = 0; i < n; i++) {
    const a = hash(seed, i + 3) * Math.PI * 2, d = Math.sqrt(hash(seed, i + 7)) * r;
    const col = hash(seed, i + 11) < 0.7 ? base : MOSS_COLS[Math.floor(hash(seed, i + 13) * MOSS_COLS.length)];
    ball(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55, 1.1 + hash(seed, i + 17) * 0.6, 0.8 + hash(seed, i + 19) * 0.4, col, { hi: 0.45, lo: 0.4 });
  }
};
// bog-cotton: pale seed-heads nodding on thin stalks, the fen's flowers
const cotton = (c, x, y, seed, s = 1) => {
  const n = 2 + Math.floor(hash(seed, 1) * 3);
  for (let i = 0; i < n; i++) {
    const bx = x + (i - n / 2) * 1.6 * s, hh = (5 + hash(seed, i + 2) * 4) * s, lean = (hash(seed, i + 5) - 0.4) * 2;
    blade(c, bx, y, bx + lean, y - hh, 0.35 * s, "#4e5a38", "#8a8a5a", 0.4);
    ball(c, bx + lean, y - hh - 0.6, 1.2 * s, 1 * s, "#efe9dc", { hi: 0.2, lo: 0.35 });
  }
  shadow(c, x + 1, y + 0.8, 3 * s, 1 * s, 0.2);
};
// a lone bulrush: a stalk and a velvet head (flat, in the turf layer)
const bulrush = (c, x, y, s, seed) => {
  const hh = (11 + hash(seed, 1) * 6) * s, lean = (hash(seed, 2) - 0.5) * 2;
  blade(c, x, y, x + lean, y - hh - 3 * s, 0.5 * s, "#4e5a38", "#8a8452", 0.5);
  c.fillStyle = "#241a26"; roundRect(c, x + lean * 0.85 - 1.5 * s, y - hh - 3.2 * s, 3 * s, 6.6 * s, 1.4 * s); c.fill();
  roundRect(c, x + lean * 0.85 - 1 * s, y - hh - 2.8 * s, 2 * s, 5.8 * s, 1 * s);
  c.fillStyle = lin(c, x + lean - 1, 0, x + lean + 1, 0, [[0, "#8a6040"], [0.5, "#5e4030"], [1, "#3e2a20"]]); c.fill();
};
// a fallen pale branch, forked
const stick = (c, x, y, len, ang, seed) => {
  const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len * 0.5;
  c.strokeStyle = rgba(PEAT, 0.6); c.lineWidth = 1.4; c.lineCap = "round";
  c.beginPath(); c.moveTo(x + 0.5, y + 0.7); c.lineTo(x1 + 0.5, y1 + 0.7); c.stroke();
  c.strokeStyle = "#8e8878"; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.stroke();
  const mx = x + (x1 - x) * 0.6, my = y + (y1 - y) * 0.6, a2 = ang + (hash(seed, 1) < 0.5 ? 0.6 : -0.6);
  c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + Math.cos(a2) * len * 0.35, my + Math.sin(a2) * len * 0.18); c.stroke();
  c.fillStyle = "#b4ae9c"; c.fillRect(ap(x), ap(y - 0.5), 1, 0.5);
};

const nearPond = (x, y, m) => PONDS.some((p) => Math.abs(x - p.x) < p.w / 2 + m && Math.abs(y - p.y) < p.h / 2 + m);

function paintFenTurf(ctx, kit) {
  const { clear, SW } = kit;
  const H0 = (i, k) => hash(i + 7919, k);
  const R = REALM;
  // the wood's floor: dark peat, fallen pale limbs, moss and black pools,
  // and a low mist lying along the treeline
  if (FOREST) {
    const span = FOREST.edge === "left" ? H : W;
    const inWood = (x, y) => forestDepthAt(x, y) > 2 && nearestOnPath(x, y).d > PATH_HALF + 3 && !nearPond(x, y, 6) && !inRiver(x, y, 6);
    for (let i = 0; i < 160; i++) {
      const u = H0(i, 1) * span, d = H0(i, 2) * 150;
      const x = FOREST.edge === "left" ? d : u, y = FOREST.edge === "left" ? u : d;
      if (!inWood(x, y)) continue;
      const k = H0(i, 3);
      if (k < 0.3) mossCushion(ctx, x, y, 2 + H0(i, 4) * 3, i);
      else if (k < 0.5) stick(ctx, x, y, 5 + H0(i, 5) * 7, H0(i, 6) * Math.PI, i);
      else if (k < 0.62) puddle(ctx, x, y, 3 + H0(i, 7) * 5, 1.5 + H0(i, 8) * 1.5, i, H0(i, 9) < 0.3);
      else if (k < 0.85) sedge(ctx, x, y, 0.7 + H0(i, 10) * 0.4, i, 5);
      else { ctx.fillStyle = rgba("#1a1e18", 0.35); blobPath(ctx, x, y, 6, 2.5, i, 0.25, 8); ctx.fill(); }
    }
    for (let u = 0; u < span; u += 18) {
      const b = FOREST.edge === "left" ? forestDepthAt(0, u) : forestDepthAt(u, 0);
      const x = FOREST.edge === "left" ? b - 6 + H0(u, 11) * 10 : u + H0(u, 12) * 8;
      const y = FOREST.edge === "left" ? u + H0(u, 13) * 8 : b - 6 + H0(u, 11) * 10;
      soft(ctx, x, y, 22 + H0(u, 14) * 14, 6 + H0(u, 15) * 4, [[0, rgba("#b4c4bc", 0.1)], [1, rgba("#b4c4bc", 0)]]);
    }
  }
  // peat hollows: the ground sinks darker in long soft patches
  for (let i = 0; i < 26; i++) {
    const x = H0(i, 20) * SW, y = H0(i, 21) * H;
    if (!clear(x, y, 6)) continue;
    ctx.fillStyle = rgba("#1e241c", 0.16);
    blobPath(ctx, x, y, 14 + H0(i, 22) * 16, 5 + H0(i, 23) * 5, i + 400, 0.28, 10); ctx.fill();
  }
  // sphagnum cushions, in colonies
  for (let i = 0; i < 46; i++) {
    const cx = H0(i, 30) * SW, cy = H0(i, 31) * H, n = 1 + Math.floor(H0(i, 32) * 4);
    for (let k = 0; k < n; k++) {
      const x = cx + (H0(i * 5 + k, 33) - 0.5) * 22, y = cy + (H0(i * 5 + k, 34) - 0.5) * 10;
      if (clear(x, y, 4)) mossCushion(ctx, x, y, 1.6 + H0(i * 5 + k, 35) * 2.6, i * 7 + k);
    }
  }
  // standing water: small puddles through the turf, some with a lily pad
  for (let i = 0; i < 30; i++) {
    const x = H0(i, 40) * SW, y = H0(i, 41) * H;
    const rx = 3 + H0(i, 42) * 7, ry = 1.4 + H0(i, 43) * 2.2;
    if (!clear(x, y, rx + 6) || x > W - WALL_W - 20) continue;
    puddle(ctx, x, y, rx, ry, i + 50, rx > 6 && H0(i, 44) < 0.5);
    if (H0(i, 45) < 0.6) sedge(ctx, x - rx - 0.5, y + 0.5, 0.7, i + 90, 4);
  }
  // sedge meadows: wide soft stands of it, where the ground is wettest,
  // straw-pale at the tips, with the odd bog-cotton head over them
  const reedy = !!R.fenReeds;
  for (let i = 0; i < (R.fenMeadows ?? 11); i++) {
    const cx = 30 + H0(i, 120) * (SW - 60), cy = 20 + H0(i, 121) * (H - 40);
    const rx = 18 + H0(i, 122) * 22, ry = 7 + H0(i, 123) * 7;
    if (!clear(cx, cy, 10)) continue;
    ctx.fillStyle = rgba("#262e24", 0.22);
    blobPath(ctx, cx + 2, cy + 2, rx, ry, i + 900, 0.25, 10); ctx.fill();
    const n = Math.round(rx * ry / 9);
    const tufts = [];
    for (let k = 0; k < n; k++) {
      const a = H0(i * 61 + k, 124) * Math.PI * 2, d = Math.sqrt(H0(i * 61 + k, 125));
      const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      if (clear(x, y, 4)) tufts.push([x, y, k]);
    }
    tufts.sort((p, q) => p[1] - q[1]);
    for (const [x, y, k] of tufts) {
      const edge = 1 - Math.hypot((x - cx) / rx, (y - cy) / ry);
      sedge(ctx, x, y, 0.6 + edge * 0.6 + H0(k, 126) * 0.2, i * 97 + k, 4, H0(k, 127) < 0.5 ? "#6a6c42" : "#5c6640", H0(k, 128) < 0.3 ? "#b4aa70" : "#9a9460");
      if (H0(k, 129) < 0.06) cotton(ctx, x + 1, y, i * 13 + k, 0.8);
      else if (reedy && H0(k, 130) < 0.12) bulrush(ctx, x, y, 0.8 + H0(k, 131) * 0.4, k);
    }
  }
  // sedge in stands, and bog-cotton nodding over it
  for (let i = 0; i < 110; i++) {
    const x = H0(i, 50) * SW, y = H0(i, 51) * H;
    if (!clear(x, y, 4)) continue;
    sedge(ctx, x, y, 0.6 + H0(i, 52) * 0.5, i + 700, 4 + Math.floor(H0(i, 53) * 3), H0(i, 54) < 0.5 ? "#6c6e44" : "#5e6a42");
  }
  for (let i = 0; i < 24; i++) {
    const cx = H0(i, 60) * SW, cy = H0(i, 61) * H, n = 2 + Math.floor(H0(i, 62) * 4);
    for (let k = 0; k < n; k++) {
      const x = cx + (H0(i * 7 + k, 63) - 0.5) * 26, y = cy + (H0(i * 7 + k, 64) - 0.5) * 12;
      if (clear(x, y, 5)) cotton(ctx, x, y, i * 11 + k, 0.8 + H0(i * 7 + k, 65) * 0.3);
    }
  }
  // the banks of the meres: moss and sedge crowding the water's edge
  for (const p of PONDS) {
    const rx = p.w / 2, ry = p.h / 2, n = Math.round((rx + ry) / 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + H0(i, p.x) * 0.3, j = H0(i, p.y) * 5;
      const x = p.x + Math.cos(a) * (rx + 8 + j), y = p.y + Math.sin(a) * (ry + 7 + j * 0.6);
      if (nearestOnPath(x, y).d < PATH_HALF + 3 || x > W - WALL_W - 8) continue;
      if (H0(i, 70) < 0.45) sedge(ctx, x, y, 0.8 + H0(i, 71) * 0.4, i + p.x, 5, "#62683e");
      else mossCushion(ctx, x, y, 1.6 + H0(i, 72) * 2, i + p.y);
    }
  }
  // and the river banks
  for (const rv of RIVERS) {
    let acc = 0;
    for (const sg of rv.segs) {
      for (let d = 0; d < sg.len; d += 7) {
        const k = (acc + d) | 0, t = d / sg.len;
        const x0 = sg.x1 + (sg.x2 - sg.x1) * t, y0 = sg.y1 + (sg.y2 - sg.y1) * t;
        const nx = -(sg.y2 - sg.y1) / sg.len, ny = (sg.x2 - sg.x1) / sg.len;
        for (const side of [-1, 1]) {
          if (H0(k, side + 80) < 0.35) continue;
          const off = rv.w / 2 + 7 + H0(k, side + 83) * 5;
          const x = x0 + nx * off * side, y = y0 + ny * off * side;
          if (nearestOnPath(x, y).d < PATH_HALF + 4 || x > W - WALL_W - 8 || x < 2 || y < 2 || y > H - 2) continue;
          if (H0(k, side + 86) < 0.55) sedge(ctx, x, y, 0.75 + H0(k, 87) * 0.4, k + side, 5, "#62683e");
          else mossCushion(ctx, x, y, 1.5 + H0(k, 88) * 1.8, k * 3 + side);
        }
      }
      acc += sg.len;
    }
  }
  // the bones of the drowned, and pale sticks, lying in the grass
  for (let i = 0; i < 22; i++) {
    const x = H0(i, 90) * SW, y = H0(i, 91) * H;
    if (!clear(x, y, 5)) continue;
    const k = H0(i, 92);
    if (k < 0.35) { shadow(ctx, x + 0.6, y + 1, 2.6, 1, 0.3); skull(ctx, x, y - 0.4, 1.5 + H0(i, 93) * 0.4); }
    else if (k < 0.65) longBone(ctx, x - 2.4, y, x + 2.4, y + (H0(i, 94) - 0.5) * 2, 0.9);
    else stick(ctx, x, y, 6 + H0(i, 95) * 6, H0(i, 96) * Math.PI, i);
  }
  // the odd flat stone sunk in the turf
  for (let i = 0; i < 16; i++) {
    const x = H0(i, 100) * SW, y = H0(i, 101) * H;
    if (!clear(x, y, 6)) continue;
    stone(ctx, x, y, 2.4 + H0(i, 102) * 2, 1.2 + H0(i, 103), mix(STONE, R.GRASS_DK, 0.35));
    ctx.fillStyle = MOSS; px1(ctx, x - 1.5, y - 0.8, 1.5, 0.5);
  }
}

// ---- the causeway: sunken flagstones, old planks, bones in the verge ---

function paintFenRoad(ctx) {
  const R = REALM;
  const main = R.PATH_MAIN;
  const slab = mix(main, "#a09e90", 0.4), gap = darken(main, 0.3);
  const H0 = (i, k) => hash(i + 104729, k);
  const ok = (x, y, m = 4) => x > m && x < W - WALL_W - 16 && y > m && y < H - m && !inRiver(x, y, 10);
  // bone-dust: pale flecks over the whole causeway
  for (let d = 0; d < TOTAL_LEN; d += 1.6) {
    const [x, y] = posAt(d), a = angleAt(d) + Math.PI / 2;
    const off = (H0(d * 10 | 0, 1) - 0.5) * PATH_HALF * 1.8;
    const px = x + Math.cos(a) * off, py = y + Math.sin(a) * off;
    if (!ok(px, py)) continue;
    ctx.fillStyle = rgba(H0(d * 10 | 0, 2) < 0.6 ? "#d8d0bc" : darken(main, 0.25), 0.45);
    ctx.fillRect(ap(px), ap(py), 0.5 + (H0(d * 10 | 0, 3) < 0.3 ? 0.5 : 0), 0.5);
  }
  // sunken flagstones: stretches of the old causeway surfacing through the
  // dust, the stones worn, tipped and gapped, moss in the joints
  let d = 30 + H0(1, 4) * 40, run = 0;
  while (d < TOTAL_LEN - 30) {
    const len = 36 + H0(run, 5) * 70;
    const end = Math.min(TOTAL_LEN - 30, d + len);
    for (let dd = d, row = 0; dd < end; dd += 9.5, row++) {
      const [x, y] = posAt(dd), a = angleAt(dd);
      const ca = Math.cos(a), sa = Math.sin(a);
      // fade in and out at the stretch's ends
      const edge = Math.min(dd - d, end - dd) / 20;
      const cols = 4;
      for (let k = 0; k < cols; k++) {
        const hh = H0(run * 97 + row * 7 + k, 6);
        if (hh > Math.min(0.55, 0.15 + edge * 0.4)) continue;
        const across = (-1.5 + k + (row % 2) * 0.5 - 0.25) * 11.5 + (H0(run + row, k + 7) - 0.5) * 2;
        if (Math.abs(across) > PATH_HALF - 6) continue;
        const cx = x - sa * across + (H0(row, k + 20) - 0.5) * 1.5, cy = y + ca * across;
        if (!ok(cx, cy, 6)) continue;
        const w = 3.4 + H0(row, k + 30) * 2.4, h2 = 3 + H0(row, k + 40) * 1.6, rot = a + (H0(row, k + 50) - 0.5) * 0.35;
        // an irregular worn slab: the dark joint round it, the stone, a lit
        // upper lip and a shaded lower one, dust drifted over one corner
        const sd = run * 131 + row * 17 + k;
        const q = [[-w, -h2], [w, -h2], [w, h2], [-w, h2]].map(([px, py], j) => {
          const jx = px + (H0(sd, j + 80) - 0.5) * 1.6, jy = py + (H0(sd, j + 84) - 0.5) * 1.4;
          return [cx + jx * Math.cos(rot) - jy * Math.sin(rot), cy + jx * Math.sin(rot) + jy * Math.cos(rot)];
        });
        ctx.fillStyle = rgba(gap, 0.55);
        poly(ctx, q.map(([px, py]) => [px + (px - cx) * 0.12 + 0.4, py + (py - cy) * 0.14 + 0.5])); ctx.fill();
        ctx.fillStyle = slab; poly(ctx, q); ctx.fill();
        ctx.save(); poly(ctx, q); ctx.clip();
        ctx.fillStyle = rgba(lighten(slab, 0.3), 0.7); ctx.fillRect(cx - w - 2, Math.min(q[0][1], q[1][1]) - 0.2, w * 2 + 4, 1);
        ctx.fillStyle = rgba(darken(slab, 0.25), 0.7); ctx.fillRect(cx - w - 2, Math.max(q[2][1], q[3][1]) - 0.8, w * 2 + 4, 1);
        ctx.fillStyle = rgba(main, 0.85);
        const cc = Math.floor(H0(sd, 88) * 4);
        blobPath(ctx, q[cc][0], q[cc][1], w * 0.7, h2 * 0.6, sd, 0.3, 7); ctx.fill();
        ctx.restore();
        if (H0(row, k + 60) < 0.15) { ctx.fillStyle = rgba(darken(slab, 0.4), 0.8); for (let t = 0; t < 4; t++) ctx.fillRect(ap(cx - 2 + t), ap(cy - 1 + t * 0.6), 0.5, 0.5); }
        if (H0(row, k + 70) < 0.2) { ctx.fillStyle = MOSS; ctx.fillRect(ap(cx + 3.5), ap(cy + 3), 1.5, 0.5); }
      }
    }
    run++;
    d = end + 110 + H0(run, 8) * 150;
  }
  // old planks laid across the wettest stretch: nearest to the water
  let best = -1, bestD = 0;
  for (let dd = 150; dd < TOTAL_LEN - 120; dd += 10) {
    const [x, y] = posAt(dd);
    if (!ok(x, y, 10) || BRIDGES.some((b) => dd > b.d0 - 110 && dd < b.d1 + 110)) continue;
    // only where the road runs straight
    if (Math.abs(angleAt(dd - 24) - angleAt(dd + 24)) > 0.02) continue;
    let wet = 0;
    for (const p of PONDS) wet = Math.max(wet, 1 - Math.hypot((x - p.x) / (p.w / 2 + 60), (y - p.y) / (p.h / 2 + 60)));
    for (const rv of RIVERS) if (inRiver(x, y, 60)) wet = Math.max(wet, 0.5);
    wet += H0(dd, 9) * 0.2;
    if (wet > best) { best = wet; bestD = dd; }
  }
  if (best > 0.3) {
    for (let k = -5; k <= 5; k++) {
      const dd = bestD + k * 3.3;
      if (Math.abs(k) === 5 && H0(k + 9, 10) < 0.5) continue;
      const [x, y] = posAt(dd), a = angleAt(dd) + Math.PI / 2;
      const half = PATH_HALF - 7 - H0(k + 9, 11) * 1.5, sh = (H0(k + 9, 12) - 0.5) * 1.5;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + (H0(k + 9, 13) - 0.5) * 0.08);
      ctx.fillStyle = rgba("#2a2620", 0.5); ctx.fillRect(-half + sh, -1.4, half * 2, 3.4);
      ctx.fillStyle = k % 2 ? "#6a6252" : "#72695a"; ctx.fillRect(-half + sh, -1.6, half * 2, 3);
      ctx.fillStyle = "#877d68"; ctx.fillRect(-half + sh, -1.6, half * 2, 0.5);
      ctx.fillStyle = "#3a342c"; ctx.fillRect(-half + sh, -1.6, 1, 3); ctx.fillRect(half + sh - 1, -1.6, 1, 3);
      ctx.fillStyle = "#4e483c"; ctx.fillRect(-half + sh + 4, 0.2, half * 0.6, 0.5); ctx.fillRect(-half + sh + half, -0.6, half * 0.5, 0.5);
      ctx.restore();
    }
  }
  // puddles standing in the causeway's hollows
  for (let i = 0; i < 6; i++) {
    const dd = 80 + H0(i, 14) * (TOTAL_LEN - 160), [x, y] = posAt(dd), a = angleAt(dd) + Math.PI / 2;
    const off = (H0(i, 15) - 0.5) * PATH_HALF;
    const px = x + Math.cos(a) * off, py = y + Math.sin(a) * off;
    if (!ok(px, py, 12) || BRIDGES.some((b) => dd > b.d0 - 20 && dd < b.d1 + 20)) continue;
    puddle(ctx, px, py, 4 + H0(i, 16) * 5, 1.6 + H0(i, 17) * 1.4, i + 300);
  }
  // the verge: skulls, long bones and a rusted helm trodden into the edge
  for (let dd = 40 + H0(2, 18) * 30, i = 0; dd < TOTAL_LEN - 20; dd += 34 + H0(i, 19) * 44, i++) {
    const [x, y] = posAt(dd), a = angleAt(dd) + Math.PI / 2, side = H0(i, 20) < 0.5 ? -1 : 1;
    const off = side * (PATH_HALF - 1 + H0(i, 21) * 6);
    const px = x + Math.cos(a) * off, py = y + Math.sin(a) * off;
    if (!ok(px, py, 8) || nearPond(px, py, 6) || BRIDGES.some((b) => dd > b.d0 - 14 && dd < b.d1 + 14)) continue;
    const k = H0(i, 22);
    if (k < 0.4) { shadow(ctx, px + 0.6, py + 1, 2.8, 1, 0.3); skull(ctx, px, py - 0.4, 1.6 + H0(i, 23) * 0.4); }
    else if (k < 0.75) longBone(ctx, px - 2.6, py - 0.6, px + 2.6, py + 0.6 * side, 0.9);
    else if (k < 0.87) {
      ball(ctx, px, py, 2.4, 1.8, "#6a5a4c", { hi: 0.35, lo: 0.5 });
      ctx.fillStyle = "#8a5a36"; ctx.fillRect(ap(px - 1), ap(py - 1), 1, 0.5);
    } else sedge(ctx, px, py + 1, 0.7, i + 40, 4);
  }
}

HOLLOW_ART.turf.fen = paintFenTurf;
HOLLOW_ART.road.fen = paintFenRoad;

// ---- the water's dressing: lily pads and scum on the meres and rivers ---
// Baked once per realm and laid flat over the water (drawn with the gate,
// after the ponds and rivers and before anything that stands).
const WATERS = { key: "", cv: null };
const bakeWaters = () => {
  const key = `${REALM.id}|${PONDS.length}|${RIVERS.length}|${PTS[0]}`;
  if (WATERS.key === key) return WATERS;
  WATERS.key = key;
  WATERS.cv = null;
  const pads = [];
  const road = (x, y, m) => nearestOnPath(x, y).d < PATH_HALF + m;
  PONDS.forEach((p, pi) => {
    const rx = p.w / 2, ry = p.h / 2, n = Math.max(1, Math.round((p.w * p.h) / 1500));
    for (let i = 0; i < n; i++) {
      const a = hash(pi * 31 + i, 1) * Math.PI * 2, d = 0.45 + hash(pi * 31 + i, 2) * 0.35;
      const cx = p.x + Math.cos(a) * rx * d, cy = p.y + Math.sin(a) * ry * d;
      const m = 1 + Math.floor(hash(pi * 31 + i, 3) * 4);
      for (let k = 0; k < m; k++) {
        const x = cx + (hash(i * 7 + k, pi + 4) - 0.5) * 9, y = cy + (hash(i * 7 + k, pi + 5) - 0.5) * 4;
        if (((x - p.x) / (rx - 4)) ** 2 + ((y - p.y) / (ry - 3)) ** 2 > 1 || road(x, y, 4)) continue;
        pads.push([x, y, 1.8 + hash(i * 7 + k, pi + 6) * 1.2, pi * 100 + i * 7 + k]);
      }
    }
  });
  RIVERS.forEach((rv, ri) => {
    let acc = 0;
    for (const sg of rv.segs) {
      for (let d = 10; d < sg.len; d += 26) {
        const k = (acc + d) | 0;
        if (hash(k, ri + 40) < 0.55) continue;
        const t = d / sg.len, side = hash(k, ri + 41) < 0.5 ? -1 : 1;
        const nx = -(sg.y2 - sg.y1) / sg.len, ny = (sg.x2 - sg.x1) / sg.len;
        const off = side * (rv.w / 2 - 5 - hash(k, ri + 42) * 3);
        const cx = sg.x1 + (sg.x2 - sg.x1) * t + nx * off, cy = sg.y1 + (sg.y2 - sg.y1) * t + ny * off;
        if (road(cx, cy, 30) || cx > W - WALL_W - 6 || cx < 4 || cy < 4 || cy > H - 4) continue;
        const m = 1 + Math.floor(hash(k, ri + 43) * 3);
        for (let q = 0; q < m; q++) pads.push([cx + (hash(k + q, 44) - 0.5) * 6, cy + (hash(k + q, 45) - 0.5) * 3, 1.6 + hash(k + q, 46) * 1, k * 5 + q]);
      }
      acc += sg.len;
    }
  });
  if (!pads.length) return WATERS;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pads) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 = Math.floor(x0 - 6); y0 = Math.floor(y0 - 6); x1 = Math.ceil(x1 + 6); y1 = Math.ceil(y1 + 6);
  WATERS.x = x0; WATERS.y = y0; WATERS.w = x1 - x0; WATERS.h = y1 - y0;
  WATERS.cv = bakeSprite(WATERS.w, WATERS.h, (c) => {
    c.translate(-x0, -y0);
    for (const [x, y, r, sd] of pads) {
      // duckweed round the pads, then the pad, and now and then a flower
      c.fillStyle = rgba("#5a7a3a", 0.8);
      for (let k = 0; k < 4; k++) c.fillRect(ap(x + (hash(sd, k) - 0.5) * r * 4), ap(y + (hash(sd, k + 9) - 0.5) * r * 1.6), 0.5, 0.5);
      lilyPad(c, x, y, r, sd, hash(sd, 20) < 0.3 ? "#56703e" : "#4a6a42");
      if (hash(sd, 21) < 0.14) {
        for (let k = 0; k < 5; k++) { const a = k * 1.256; ball(c, x + Math.cos(a) * 0.8, y - 0.6 + Math.sin(a) * 0.5, 0.7, 0.55, "#ece4dc", { hi: 0.3, lo: 0.2 }); }
        ball(c, x, y - 0.7, 0.45, 0.4, "#e0c060", { hi: 0.2, lo: 0.2 });
      }
    }
  }, false);
  return WATERS;
};

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
  const gx = Math.max(62, Math.min(W - WALL_W - 70, px + tx * 30)), gy = Math.max(48, Math.min(H - 30, py + ty * 30));
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
    ring.push({ x: sx, y: sy, h: 14 + hash(i, 11) * 10, w: 3.4 + hash(i, 12) * 1.6, ln: (hash(i, 13) - 0.5) * 0.3, seed: i * 13 + 5, fallen: hash(i, 14) < 0.15 });
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
  const Wt = bakeWaters();
  if (Wt.cv) ctx.drawImage(Wt.cv, Wt.x, Wt.y, Wt.w, Wt.h);
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
