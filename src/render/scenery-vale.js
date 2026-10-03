// ============ RENDER: MORE SCENERY OF THE VALE ============
// The Greenwood's own pieces beyond the trees and boulders of scenery.js:
// standing stones for the Kingstones, the mill on the race at Millrace, the
// fishing hamlet on Gullwick Sands, thistles for Thistlecrag and a few farm
// pieces. One registry object, the same shape as IRON_ART (read its header
// in scenery-iron.js); scenery.js gathers it lazily, never at load.
//
// Pieces (decor types):
//   menhir      a standing stone: v0 a tall slab, v1 leaning, v2 a squat
//               shouldered stone, v3 a needle leaning the other way
//   stonefall   a stone fallen flat in the turf, half grown over
//   trilithon   two uprights and a lintel (v1: the lintel slipped)
//   watermill   the mill house with its wheel turning in the race (live):
//               v0 wheel on the west side, v1 on the east; the wheel stands
//               ~27 left (right) of the feet and ~11 below, in the water
//   cottage     a fisher's cottage, limewash and thatch, smoke (live);
//               v odd: door on the right and a lean-to
//   boat        drawn up on the strand: v0 a coble with its mast down,
//               v1 a rowboat upturned on stones, v2 a punt with oars, v3 = v0
//               the other way round. The hull runs ~10 below the feet, so
//               its feet stand on the grass with the boat down on the sand.
//   netrack     nets drying on a rack of posts, floats along the head line
//   creels      lobster pots stacked, a coil of rope and a buoy
//   marram      dune grass on its own little hummock of sand (flat)
//   thistle     a thistle clump, purple heads on spiny stems (flat)
//   skeps       straw beehives on a plank bench
//   haywain     a hay cart, loaded, shafts down

import {
  lighten, darken, mix, rgba, soft, shadow, ball, cylinder, hash, ellipse, lin, bakeSprite, part, PX,
} from "./paint.js";
import { REALM } from "../data/maps.js";
import { vnoise } from "../data/gatecrag.js";

const ap = (v) => Math.round(v * PX) / PX;
const px1 = (c, x, y, w = 0.5, h = 0.5) => c.fillRect(ap(x), ap(y), w, h);
const poly = (c, pts) => { c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); };

// ---- the vale's materials ---------------------------------------------------
const SARSEN = "#aaa496";                 // the kingstones: warm grey sandstone
const LICHEN = ["#b8c494", "#d4bc52", "#c47e46", "#dcdcc0"];
const RUBBLE = "#a39a88", LIME = "#ece4d0", LIME_DK = "#c4b8a0";
const THATCH = "#c4a058", THATCH_LT = "#e2c67e", THATCH_DK = "#8e6c36";
const TILE = "#a8505c";
const WOOD = "#6a4a2e", WOOD_LT = "#8a6440", WOOD_DK = "#46301e", OAK = "#7a5334";
const IRON = "#2e3038";
const WICKER = "#9a7448", ROPE = "#c8ae7a";
const SAND = "#e2cf98";
const moss = () => mix("#5d8f3a", REALM.GRASS_DK, 0.35);

// A still body baked once (inked), then stamped — for the live pieces, whose
// wheel or smoke is painted over it every frame.
const BODIES = new Map();
const body = (key, hw, top, bot, paint) => {
  const k = `${key}|${REALM.GRASS}`;
  let sp = BODIES.get(k);
  if (!sp) {
    const cv = bakeSprite(hw * 2, top + bot, (c) => paint(c, hw, top));
    sp = { cv, hw, top, bot };
    BODIES.set(k, sp);
  }
  return sp;
};
const stampBody = (ctx, sp, x, y) => ctx.drawImage(sp.cv, x - sp.hw, y - sp.top, sp.hw * 2, sp.top + sp.bot);

// ---- standing stones --------------------------------------------------------
// A stone stood on end: a rough slab tapering up to a rounded crown, leaning
// by `lean` (fraction of its height). Three tones on the face — a lit west
// rim, the south face, the shaded east side — and a pale top plane; grain
// running up it, pits, lichen crusts on the sunny upper half, moss at the foot.
const standing = (c, x, gy, w, h, lean, col, seed, o = {}) => {
  const j = (i) => hash(seed, i) - 0.5;
  const T = [0, 0.18, 0.4, 0.62, 0.8, 0.9];
  const K = [1.04, 0.98, 0.93, 0.86, 0.76, 0.66].map((k, i) => k * (o.flat ? 0.96 + i * 0.01 : 1) * (1 + j(i) * 0.1));
  const cx = (t) => x + lean * h * t + Math.sin(Math.PI * t) * w * 0.12 * (o.bow ?? 1);
  const L = T.map((t, i) => [cx(t) - w * K[i] * (1 + j(i + 10) * 0.12), gy - h * t]);
  const R = T.map((t, i) => [cx(t) + w * K[i] * (1 + j(i + 20) * 0.12), gy - h * t]);
  // the crown: a lopsided round (or, flat, a dressed top) from left to right
  const hwTop = w * K[5], slope = (o.slope ?? j(30) * 0.12) * h;
  const crown = [];
  for (let k = 0; k <= 6; k++) {
    const a = k / 6, top = o.flat ? 1 : 0.9 + 0.1 * Math.sin(a * Math.PI) + j(31 + k) * 0.02;
    crown.push([cx(0.95) + hwTop * Math.cos(Math.PI - a * Math.PI) * (o.flat ? 1.02 : 1), gy - h * top + slope * (a - 0.5) - (o.flat ? 0 : 0)]);
  }
  const sil = [...L, ...crown, ...R.slice().reverse()];
  const capD = Math.min(3.2, w * 0.55) + (o.flat ? 0.6 : 0);
  c.save();
  poly(c, sil); c.fillStyle = col; c.fill(); c.clip();
  // the shaded east side: everything right of a wandering line near the right edge
  const sh = T.map((t, i) => [cx(t) + w * K[i] * (0.38 + j(i + 40) * 0.12), gy - h * t]);
  poly(c, [...sh, [cx(1) + w * 0.3, gy - h * 1.2], [x + w * 4 + h, gy - h * 1.2], [x + w * 4 + h, gy + 3]]);
  c.fillStyle = darken(col, 0.24); c.fill();
  const sh2 = T.map((t, i) => [cx(t) + w * K[i] * (0.78 + j(i + 45) * 0.08), gy - h * t]);
  poly(c, [...sh2, [x + w * 4 + h, gy - h * 1.2], [x + w * 4 + h, gy + 3]]);
  c.fillStyle = darken(col, 0.4); c.fill();
  // the lit west rim
  const lt = T.map((t, i) => [cx(t) - w * K[i] * (0.62 + j(i + 50) * 0.1), gy - h * t]);
  poly(c, [[x - w * 4 - h, gy + 3], [x - w * 4 - h, gy - h * 1.2], ...lt.slice().reverse()]);
  c.fillStyle = lighten(col, 0.16); c.fill();
  // the top plane, and the lit lip where it meets the face
  const capEdge = crown.map(([px, py]) => [px, py + capD]);
  poly(c, [...crown, ...capEdge.slice().reverse()]);
  c.fillStyle = lighten(col, 0.34); c.fill();
  c.fillStyle = lighten(col, 0.5);
  for (const [px, py] of capEdge.slice(1, 4)) px1(c, px - 0.5, py - 0.5, 1.5, 0.5);
  c.fillStyle = darken(col, 0.12);
  for (const [px, py] of capEdge.slice(3, 6)) px1(c, px, py, 1, 0.5);
  // grain: wavy cracks running up the face, each lit along its west lip
  const nGrain = 2 + Math.floor(hash(seed, 60) * 2);
  for (let g = 0; g < nGrain; g++) {
    const u = -0.55 + (g + 0.5) / nGrain * 1.0 + j(61 + g) * 0.2, top = 0.35 + hash(seed, 65 + g) * 0.45;
    for (let t = 0.02; t < top; t += 0.5 / h) {
      const gx = cx(t) + u * w * (1 - t * 0.25) + Math.sin(t * h * 0.5 + g + seed) * 0.4;
      c.fillStyle = darken(col, 0.42); px1(c, gx, gy - t * h);
      if (hash(seed + g, Math.round(t * h * 2)) < 0.5) { c.fillStyle = lighten(col, 0.24); px1(c, gx - 0.5, gy - t * h); }
    }
  }
  // pits: a dark pixel with a lit one over it
  for (let i = 0; i < 4; i++) {
    const t = 0.15 + hash(seed, 70 + i) * 0.7, u = (hash(seed, 75 + i) - 0.5) * 1.2;
    const px = cx(t) + u * w, py = gy - t * h;
    c.fillStyle = darken(col, 0.5); px1(c, px, py);
    c.fillStyle = lighten(col, 0.3); px1(c, px, py - 0.5);
  }
  // lichen: crusts on the sunny upper face and the top, a few specks lower
  const nL = o.lichen ?? 5;
  for (let i = 0; i < nL; i++) {
    const t = 0.45 + hash(seed, 80 + i) * 0.5, u = (hash(seed, 85 + i) - 0.62) * 1.3;
    const lc = LICHEN[Math.floor(hash(seed, 90 + i) * LICHEN.length)];
    const px = cx(t) + u * w, py = gy - t * h;
    c.fillStyle = darken(lc, 0.15); px1(c, px, py + 0.5, 1.5, 0.5);
    c.fillStyle = lc; px1(c, px, py, 1.5, 0.5); px1(c, px + 0.5, py - 0.5, 1, 0.5);
    if (hash(seed, 95 + i) < 0.5) { c.fillStyle = lighten(lc, 0.25); px1(c, px + 0.5, py); }
  }
  // moss creeping up from the turf, lower on the shaded side
  const m = moss();
  for (let mx = x - w * 1.6 - 1; mx < x + w * 1.6 + 1; mx += 0.5) {
    const hh = 1 + vnoise(mx * 0.7, seed * 0.1, seed) * 2.8 * (o.mossy ?? 1) - (mx > x ? 0.6 : 0);
    if (hh <= 0.4) continue;
    c.fillStyle = darken(m, 0.12); c.fillRect(ap(mx), ap(gy - hh * 0.6), 0.5, hh);
    c.fillStyle = m; c.fillRect(ap(mx), ap(gy - hh), 0.5, hh * 0.45);
    if (hash(Math.round(mx * 2), seed) < 0.3) { c.fillStyle = lighten(m, 0.25); px1(c, mx, gy - hh); }
  }
  c.restore();
};
// the long soft shadow a tall stone throws down-right, and a dark crumb at its foot
const stoneShadow = (c, x, gy, w, h, lean) => {
  shadow(c, x + w * 0.4 + h * 0.32 + lean * h * 0.3, gy + 1, w * 0.9 + h * 0.42, 2.4 + w * 0.32, 0.26);
  shadow(c, x + w * 0.3, gy + 0.3, w * 1.25, 1.6 + w * 0.2, 0.34);
};
// a scar of bared earth at a leaning stone's foot
const scar = (c, x, gy, w, side) => {
  c.fillStyle = "#6a4c34"; c.fillRect(ap(x + side * w * 0.6 - w * 0.5), ap(gy + 0.5), w, 0.5);
  c.fillStyle = "#8a6a48"; c.fillRect(ap(x + side * w * 0.6 - w * 0.3), ap(gy + 1), w * 0.6, 0.5);
};

const MENHIR = [
  { w: 5.8, h: 29, lean: 0.02, bow: 1 },
  { w: 6.4, h: 25, lean: 0.24, bow: -0.6 },
  { w: 8.6, h: 17, lean: -0.04, bow: 0.4 },
  { w: 4.6, h: 32, lean: -0.11, bow: 1.4 },
];
const menhir = (ctx, x, y, s, o) => {
  const gy = y + 8, M = MENHIR[o.v % 4], w = M.w * s, h = M.h * s;
  const col = mix(SARSEN, "#9a968c", hash(o.seed, 3) * 0.6);
  stoneShadow(ctx, x, gy, w, h, M.lean);
  if (Math.abs(M.lean) > 0.1) scar(ctx, x, gy, w, -Math.sign(M.lean));
  standing(ctx, x, gy, w, h, M.lean, col, o.seed, { bow: M.bow, mossy: o.v === 2 ? 1.4 : 1 });
};

// A stone that has fallen and lies in the turf: its long top plane lit, the
// south face a band beneath, the east end in shade, grass grown up its front.
const lying = (c, x, gy, L, th, D, col, seed, o = {}) => {
  const j = (i) => hash(seed, i) - 0.5;
  const tilt = (o.tilt ?? j(1) * 0.08) * L;
  const fy = (u) => gy + tilt * u;                   // the front foot at u in -1..1
  const front = [], back = [];
  for (let k = 0; k <= 8; k++) {
    const u = -1 + k / 4, ex = x + u * L;
    const ends = 1 - Math.pow(Math.abs(u), 6) * 0.35;
    front.push([ex, fy(u) - th * ends - j(k + 10) * 0.8]);
    back.push([ex + D * 0.15, fy(u) - th * ends - D * (0.92 + j(k + 20) * 0.16) * ends]);
  }
  const lE = [x - L - 0.5, fy(-1) - th * 0.45], rE = [x + L + 0.8, fy(1) - th * 0.5];
  const sil = [[x - L * 0.96, fy(-1)], lE, ...back, rE, [x + L * 0.96, fy(1)]];
  c.save();
  poly(c, sil); c.fillStyle = darken(col, 0.06); c.fill(); c.clip();
  // the top plane
  poly(c, [lE, ...back, rE, ...front.slice().reverse()]);
  c.fillStyle = lighten(col, 0.28); c.fill();
  c.fillStyle = lighten(col, 0.46);
  for (let k = 1; k < 8; k++) if (hash(seed, k + 30) < 0.6) px1(c, front[k][0] - 1, front[k][1] - 0.5, 2, 0.5);
  // the east end in shade
  poly(c, [[x + L * 0.72, fy(0.72) + 2], [x + L * 0.78, fy(0.8) - th - D], [x + L * 2, gy - th - D * 2], [x + L * 2, gy + 3]]);
  c.fillStyle = darken(col, 0.3); c.fill();
  // cracks across the top, lichen on it
  for (let i = 0; i < 2; i++) {
    const u = -0.5 + i + j(40 + i) * 0.4;
    for (let t = 0; t < 1; t += 0.12) { c.fillStyle = darken(col, 0.3); px1(c, x + u * L + t * D * 0.3 + Math.sin(t * 5 + seed) * 0.4, fy(u) - th - t * D); }
  }
  for (let i = 0; i < 6; i++) {
    const u = (hash(seed, 50 + i) - 0.5) * 1.6, t = 0.2 + hash(seed, 56 + i) * 0.6;
    const lc = LICHEN[Math.floor(hash(seed, 62 + i) * LICHEN.length)];
    c.fillStyle = lc; px1(c, x + u * L + t * D * 0.15, fy(u) - th - t * D, 1.5, 0.5);
  }
  // grass up the front face (not on a lintel up in the air)
  const m = moss();
  if (o.grass !== false) for (let mx = x - L; mx < x + L; mx += 0.5) {
    const hh = 0.5 + vnoise(mx * 0.6, 3, seed) * th * 0.9;
    c.fillStyle = darken(m, 0.1); c.fillRect(ap(mx), ap(fy((mx - x) / L) - hh), 0.5, hh + 1);
    if (hash(Math.round(mx * 2), seed + 1) < 0.35) { c.fillStyle = lighten(m, 0.2); px1(c, mx, fy((mx - x) / L) - hh); }
  }
  c.restore();
};
const stonefall = (ctx, x, y, s, o) => {
  const gy = y + 8, L = (12 + hash(o.seed, 4) * 3) * s, th = 4.5 * s, D = 7 * s;
  shadow(ctx, x + 3 * s, gy + 0.5, L * 1.15, 3.4 * s, 0.3);
  lying(ctx, x, gy, L, th, D, mix(SARSEN, "#9a968c", hash(o.seed, 3) * 0.6), o.seed, { tilt: (o.v % 2 ? 0.05 : -0.04) });
};

// Two uprights and a lintel across them, tenon bosses showing where the
// lintel sits. v1: the lintel has slipped from one upright and leans on the
// ground against the other.
const trilithon = (ctx, x, y, s, o) => {
  const gy = y + 8, w = 4.6 * s, h = 25 * s, gap = 9.5 * s, sd = o.seed;
  const col = mix(SARSEN, "#a09a8e", 0.3);
  shadow(ctx, x + 10 * s, gy + 1, 24 * s, 4 * s, 0.26);
  shadow(ctx, x + 1 * s, gy + 0.5, 19 * s, 2.2 * s, 0.32);
  part(ctx, (c) => standing(c, x - gap, gy, w, h, 0.01, col, sd + 1, { flat: true, slope: 0.02, bow: 0.3 }));
  const slipped = o.v % 2 === 1;
  part(ctx, (c) => standing(c, x + gap, gy, w, h * (slipped ? 0.97 : 1.0), slipped ? 0.04 : -0.01, darken(col, 0.03), sd + 2, { flat: true, slope: -0.02, bow: -0.3 }));
  if (!slipped) {
    // the lintel: a long block across both heads
    part(ctx, (c) => lying(c, x + 0.3 * s, gy - h + 1.4 * s, gap + w * 1.5, 5.2 * s, 3.4 * s, lighten(col, 0.03), sd + 3, { tilt: 0.015, grass: false }));
  } else {
    // slipped: one end on the turf, the other propped on the right upright
    part(ctx, (c) => {
      c.save(); c.translate(x - 4 * s, gy - 9 * s); c.rotate(-0.62);
      lying(c, 0, 0, gap + w * 1.2, 5 * s, 3.2 * s, lighten(col, 0.03), sd + 3, { tilt: 0 });
      c.restore();
    });
  }
};

// ---- the mill ---------------------------------------------------------------
// Rubble stone in courses: a wall of irregular stones, each lit along its top
// and shaded along its foot.
const rubble = (c, x, top, w, h, col, seed) => {
  c.fillStyle = darken(col, 0.18); c.fillRect(x, top, w, h);
  const ch = 2.5;
  let row = 0;
  for (let cy = top; cy < top + h - 0.2; cy += ch, row++) {
    let bx = x - hash(seed, row) * 3;
    for (let k = 0; bx < x + w; k++) {
      const bw = 2.5 + hash(seed + row, k) * 3, tone = hash(seed + k, row + 9);
      const sc = tone < 0.3 ? darken(col, 0.06) : tone > 0.8 ? lighten(col, 0.08) : col;
      const x0 = Math.max(x, bx + 0.5), x1 = Math.min(x + w, bx + bw), y1 = Math.min(top + h, cy + ch);
      if (x1 > x0) {
        c.fillStyle = sc; c.fillRect(ap(x0), ap(cy + 0.5), ap(x1 - x0), ap(y1 - cy - 0.5));
        c.fillStyle = lighten(sc, 0.2); c.fillRect(ap(x0), ap(cy + 0.5), ap(x1 - x0), 0.5);
      }
      bx += bw;
    }
  }
  // the light falls from the west: the wall's east end a shade darker
  c.fillStyle = rgba("#2a1c2c", 0.14); c.fillRect(x + w * 0.7, top, w * 0.3, h);
};
// A gable-ended house seen from the south: walls, the gable triangle, and the
// two slopes of the roof running back (north) from its edges, the west slope
// lit. `kind`: "thatch" | "tile".
const gableRoof = (c, x, eaveY, hw, apexY, D, kind, seed) => {
  const over = 1.6;
  const lE = [x - hw - over, eaveY + 1], apex = [x, apexY - 1], rE = [x + hw + over, eaveY + 1];
  const base = kind === "thatch" ? THATCH : TILE;
  const LT = kind === "thatch" ? THATCH_LT : lighten(TILE, 0.22), DK = kind === "thatch" ? THATCH_DK : darken(TILE, 0.32);
  // the west slope (lit) and the east (shade)
  poly(c, [lE, apex, [apex[0], apex[1] - D], [lE[0], lE[1] - D]]);
  c.fillStyle = mix(base, LT, 0.45); c.fill();
  poly(c, [apex, rE, [rE[0], rE[1] - D], [apex[0], apex[1] - D]]);
  c.fillStyle = mix(base, DK, 0.55); c.fill();
  // coursing: thatch in combed rows, tiles in courses with joints
  const rows = Math.round(D / (kind === "thatch" ? 2 : 1.75));
  for (let i = 1; i < rows; i++) {
    const dy = -D * i / rows;
    for (const [a, b, lit] of [[lE, apex, true], [apex, rE, false]]) {
      const n = Math.ceil(Math.abs(b[0] - a[0]) / 0.5);
      for (let k = 0; k < n; k++) {
        const t = k / n, X = a[0] + (b[0] - a[0]) * t, Y = a[1] + (b[1] - a[1]) * t + dy;
        if (kind === "thatch") {
          if (hash(seed + i, k) < 0.55) { c.fillStyle = lit ? THATCH : darken(THATCH_DK, 0.12); px1(c, X, Y); }
          else if (lit && hash(seed + i, k + 99) < 0.25) { c.fillStyle = THATCH_LT; px1(c, X, Y - 0.5); }
        } else {
          c.fillStyle = lit ? darken(TILE, 0.12) : darken(TILE, 0.45); px1(c, X, Y);
          if (k % 5 === (i * 2) % 5) px1(c, X, Y - 0.5, 0.5, 1.5);
        }
      }
    }
  }
  // the ridge, and the bargeboards / thatch lip along the gable
  c.fillStyle = kind === "thatch" ? THATCH_DK : darken(TILE, 0.5); c.fillRect(ap(x - 0.75), ap(apexY - 1 - D), 1.5, D);
  c.fillStyle = kind === "thatch" ? THATCH_LT : lighten(TILE, 0.3); c.fillRect(ap(x - 0.75), ap(apexY - 1 - D), 0.5, D);
  const lip = kind === "thatch" ? THATCH_DK : WOOD_DK;
  for (const [a, b] of [[lE, apex], [apex, rE]]) {
    const n = Math.ceil(Math.abs(b[0] - a[0]) / 0.5);
    for (let k = 0; k <= n; k++) {
      const t = k / n, X = a[0] + (b[0] - a[0]) * t, Y = a[1] + (b[1] - a[1]) * t;
      c.fillStyle = lip; px1(c, X, Y, 0.5, kind === "thatch" ? 1.5 : 1);
      if (kind === "thatch" && hash(seed, k + 300) < 0.4) { c.fillStyle = THATCH; px1(c, X, Y + 1.5); }
    }
  }
};
// a small window: dark glass in four panes behind a frame, a glint
const windowAt = (c, x, y, w, h, shutter) => {
  c.fillStyle = WOOD_DK; c.fillRect(ap(x - 0.5), ap(y - 0.5), w + 1, h + 1);
  c.fillStyle = "#2c2a3a"; c.fillRect(ap(x), ap(y), w, h);
  c.fillStyle = "#4a5a74"; c.fillRect(ap(x), ap(y), w / 2 - 0.25, h / 2 - 0.25);
  c.fillStyle = "#9ab0c8"; px1(c, x + 0.5, y + 0.5);
  c.fillStyle = WOOD; c.fillRect(ap(x + w / 2 - 0.25), ap(y), 0.5, h); c.fillRect(ap(x), ap(y + h / 2 - 0.25), w, 0.5);
  if (shutter) {
    c.fillStyle = shutter; c.fillRect(ap(x - 2), ap(y - 0.5), 1.5, h + 1); c.fillRect(ap(x + w + 0.5), ap(y - 0.5), 1.5, h + 1);
    c.fillStyle = darken(shutter, 0.3); c.fillRect(ap(x - 1), ap(y - 0.5), 0.5, h + 1); c.fillRect(ap(x + w + 1.5), ap(y - 0.5), 0.5, h + 1);
  }
};
const door = (c, x, y, w, h, col) => {
  c.fillStyle = WOOD_DK; c.fillRect(ap(x - 0.5), ap(y - 0.5), w + 1, h + 0.5);
  c.fillStyle = col; c.fillRect(ap(x), ap(y), w, h);
  c.fillStyle = lighten(col, 0.2); c.fillRect(ap(x), ap(y), 0.5, h);
  c.fillStyle = darken(col, 0.3);
  for (let k = 1; k < 3; k++) c.fillRect(ap(x + w * k / 3), ap(y), 0.5, h);
  c.fillStyle = IRON; c.fillRect(ap(x), ap(y + h * 0.3), w, 0.5); c.fillRect(ap(x), ap(y + h * 0.72), w, 0.5);
  c.fillStyle = "#d8b34a"; px1(c, x + w - 1, y + h * 0.5);
};
const sack = (c, x, gy, s, col = "#d8ccaa") => {
  ball(c, x, gy - 2.6 * s, 2.4 * s, 2.8 * s, col, { hi: 0.35, lo: 0.45 });
  c.fillStyle = darken(col, 0.35); c.fillRect(ap(x - 1), ap(gy - 5.2 * s), 2, 0.5);
  ball(c, x, gy - 5.8 * s, 1 * s, 0.8 * s, col, { hi: 0.3, lo: 0.4 });
};

const MILL = { hw: 17, wall: 10.5, frame: 7.5, apex: 12, D: 14, R: 13.5, rx: 0.55 };
// where the wheel's hub stands from the feet (x, y): ~27 out on the wheel
// side and ~11 below — the decor is placed so that point is in the race
const wheelAt = (x, y, s, v) => [x + (v % 2 ? 1 : -1) * (MILL.hw + 10) * s, y + 11 * s];
const millBody = (c, x, y, s, v) => {
  const gy = y + 8, hw = MILL.hw * s, side = v % 2 ? 1 : -1;
  const [wx, wy] = wheelAt(x, y, s, v);
  const wallTop = gy - MILL.wall * s, eave = wallTop - MILL.frame * s, apex = eave - MILL.apex * s;
  shadow(c, x + 9 * s, gy + 0.5, hw * 1.6, 5 * s, 0.3);
  // the wheel pit's wall: dressed stone running from the house down into the water
  part(c, (cc) => {
    const x0 = side < 0 ? wx + 3.5 * s : x + hw - 0.5, x1 = side < 0 ? x - hw + 0.5 : wx - 3.5 * s;
    rubble(cc, x0, gy - 7 * s, x1 - x0, 7 * s + (wy - gy) + 4 * s, "#9c9482", 41);
    cc.fillStyle = lighten("#9c9482", 0.25); cc.fillRect(x0, gy - 7.5 * s, x1 - x0, 1);
    cc.fillStyle = darken("#9c9482", 0.3); cc.fillRect(x0, gy - 6.5 * s, x1 - x0, 0.5);
  });
  // the house: stone ground storey, timber-framed limewash above, the gable
  part(c, (cc) => {
    rubble(cc, x - hw, wallTop, hw * 2, gy - wallTop, RUBBLE, 17);
    cc.fillStyle = lin(cc, x - hw, 0, x + hw, 0, [[0, lighten(LIME, 0.05)], [0.7, LIME], [1, LIME_DK]]);
    cc.fillRect(x - hw, eave, hw * 2, wallTop - eave);
    poly(cc, [[x - hw, eave + 0.2], [x, apex], [x + hw, eave + 0.2]]); cc.fill();
    // the frame: posts, a rail, braces, the gable's king post
    cc.fillStyle = WOOD;
    for (const fx of [-1, -0.45, 0.45, 1]) cc.fillRect(ap(x + fx * hw - (fx > 0.9 ? 1.5 : 0)), eave, 1.5, wallTop - eave);
    cc.fillRect(x - hw, ap(wallTop - 1.5), hw * 2, 1.5);
    cc.fillRect(x - hw, ap(eave), hw * 2, 1);
    cc.fillRect(ap(x - 0.75), apex + 2, 1.5, eave - apex - 2);
    cc.fillStyle = darken(WOOD, 0.25); cc.fillRect(x - hw, ap(wallTop - 0.5), hw * 2, 0.5);
    // the loft door under the hoist beam, and the beam with its rope and sack
    cc.fillStyle = WOOD_DK; cc.fillRect(ap(x - 2.5 * s), ap(eave - 6.5 * s), 5 * s, 6.5 * s);
    cc.fillStyle = "#3a2c28"; cc.fillRect(ap(x - 2 * s), ap(eave - 6 * s), 4 * s, 6 * s);
    windowAt(cc, x - hw * 0.73, eave + 2 * s, 3.5 * s, 3 * s);
    windowAt(cc, x + hw * 0.52, eave + 2 * s, 3.5 * s, 3 * s);
    // the ground storey: the door, a small window, a lintel stone over each
    door(cc, x - 3 * s, gy - 8.5 * s, 6 * s, 8.5 * s, "#6a5a3e");
    cc.fillStyle = lighten(RUBBLE, 0.2); cc.fillRect(ap(x - 4 * s), ap(gy - 9.5 * s), 8 * s, 1);
    windowAt(cc, x + side * -hw * 0.62 - 1.5 * s, gy - 8 * s, 3 * s, 3 * s);
  });
  part(c, (cc) => gableRoof(cc, x, eave, hw, apex, MILL.D * s, "tile", 23));
  // the hoist beam out of the gable, a rope and a sack hanging off it
  part(c, (cc) => {
    cc.fillStyle = WOOD; cc.fillRect(ap(x - 0.75), ap(apex - 1.5), 1.5, 4);
    cc.fillStyle = darken(WOOD, 0.3); cc.fillRect(ap(x - 0.25), ap(apex + 2.5), 0.5, 4.5);
    sack(cc, x, apex + 11 * s, 0.75 * s);
  });
  // the axle's bearing block in the wall
  part(c, (cc) => { cc.fillStyle = WOOD_DK; cc.fillRect(ap(Math.min(wx, x - side * -hw) + (side < 0 ? 2 : -6)), ap(wy - 1.5), 6, 3); });
  // sacks of meal by the door, and a barrel
  part(c, (cc) => {
    sack(cc, x + side * -hw * 0.55 - 3 * s, gy + 1, 0.9 * s);
    sack(cc, x + side * -hw * 0.55 + 0.5 * s, gy + 1.5, 0.8 * s, "#cfc2a0");
    const bx = x - side * (hw + 4 * s);
    cylinder(cc, bx - 2.6 * s, gy - 6 * s, 5.2 * s, 6.5 * s, "#8a6036", { r: 1.4 });
    cc.fillStyle = IRON; cc.fillRect(bx - 2.6 * s, gy - 4.6 * s, 5.2 * s, 0.6); cc.fillRect(bx - 2.6 * s, gy - 1.8 * s, 5.2 * s, 0.6);
    ellipse(cc, bx, gy - 6 * s, 2.6 * s, 0.9 * s); cc.fillStyle = "#a07a4a"; cc.fill();
  });
};
// The wheel, live: an oak rim seen slanting (its face turned to the race),
// twelve paddles on it, spokes to an iron-bound hub; the low paddles go
// under the water, which is drawn over them and churns white where they bite.
const WATER = "#3f78a0";
const millWheel = (ctx, x, y, s, v, time) => {
  const side = v % 2 ? 1 : -1;
  const [wx, wy] = wheelAt(x, y, s, v);
  const R = MILL.R * s, rx = R * MILL.rx, ry = R;
  const turn = time * 0.9 * side;
  const pt = (a, r = 1) => [wx + Math.cos(a) * rx * r, wy + Math.sin(a) * ry * r];
  const water = wy + ry * 0.48;
  ctx.save();
  // the shadow on the pit wall behind
  ctx.fillStyle = "rgba(28,20,30,0.25)"; ellipse(ctx, wx + side * 2.5, wy + 1, rx + 1.5, ry); ctx.fill();
  // the far rim, then the spokes, then the near rim over them
  ctx.lineCap = "round";
  ctx.strokeStyle = WOOD_DK; ctx.lineWidth = 1.5;
  ellipse(ctx, wx + side * 1.6, wy, rx, ry); ctx.stroke();
  for (let k = 0; k < 6; k++) {
    const a = turn + k * Math.PI / 3, [ex, ey] = pt(a, 0.92);
    ctx.strokeStyle = Math.sin(a) < 0 ? OAK : WOOD; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ap(wx), ap(wy)); ctx.lineTo(ap(ex), ap(ey)); ctx.stroke();
  }
  // paddles: boards standing out from the rim, toward the far rim
  for (let k = 0; k < 12; k++) {
    const a = turn + k * Math.PI / 6, [ex, ey] = pt(a, 1);
    const lit = Math.cos(a) * -side > -0.2 && Math.sin(a) < 0.3;
    ctx.fillStyle = lit ? WOOD_LT : WOOD;
    ctx.fillRect(ap(ex + (side < 0 ? 0 : -1.5)), ap(ey - 1), 2, 2);
    ctx.fillStyle = WOOD_DK; ctx.fillRect(ap(ex + side * 1.5 + (side < 0 ? 0 : -1.5)), ap(ey - 0.5), 1, 1.5);
  }
  ctx.strokeStyle = OAK; ctx.lineWidth = 1.5;
  ellipse(ctx, wx, wy, rx, ry); ctx.stroke();
  ctx.strokeStyle = lighten(OAK, 0.3); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.ellipse(wx, wy, rx - 0.5, ry - 0.5, 0, Math.PI * 0.95, Math.PI * 1.6); ctx.stroke();
  ctx.strokeStyle = "#241a26"; ctx.lineWidth = 0.5;
  ellipse(ctx, wx, wy, rx + 1, ry + 1); ctx.stroke();
  // the hub: an iron-bound boss on the axle
  ball(ctx, wx, wy, 2, 2.3, WOOD, { hi: 0.4, lo: 0.4 });
  ctx.fillStyle = IRON; ctx.fillRect(ap(wx - 0.5), ap(wy - 0.5), 1, 1);
  // the race over the wheel's foot: water drawn across it, foam where the paddles bite
  // (only over the wheel itself: the race's own water lies under it already)
  ctx.beginPath(); ctx.rect(wx - rx - 4, water, rx * 2 + 8, ry); ctx.clip();
  ctx.beginPath(); ctx.ellipse(wx + side * 0.8, wy, rx + 1.2, ry + 1, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = rgba(WATER, 0.62); ctx.fillRect(wx - rx - 3, water, rx * 2 + 6, ry);
  ctx.fillStyle = rgba("#2c5a7c", 0.3); ctx.fillRect(wx - rx - 3, water + 2, rx * 2 + 6, ry);
  ctx.restore();
  // foam: a churn along the waterline where the wheel enters, drips off the rising paddles
  for (let i = 0; i < 9; i++) {
    const u = (i / 8) * 2 - 1, fx = wx + u * (rx + 1.5);
    const f = Math.sin(time * 9 + i * 1.7) * 0.5 + 0.5;
    ctx.fillStyle = f > 0.5 ? "#f4f8f4" : "#c8e0e8";
    ctx.fillRect(ap(fx), ap(water - 0.5 + (f > 0.8 ? -0.5 : 0)), 1, 0.5 + (Math.abs(u) < 0.6 ? 0.5 : 0));
  }
  for (let k = 0; k < 3; k++) {
    const ph = (time * 1.6 + k / 3) % 1;
    const dx = wx + side * -(rx * 0.7) + side * k * 0.8, dy = wy - ry * 0.3 + ph * (water - wy + ry * 0.3);
    ctx.fillStyle = rgba("#dcecf0", 0.85 - ph * 0.5); ctx.fillRect(ap(dx), ap(dy), 0.5, 1);
  }
  // the tail race: a white wake running off downstream
  for (let k = 0; k < 4; k++) {
    const ph = (time * 0.7 + k * 0.25) % 1;
    ctx.fillStyle = rgba("#e8f2f0", 0.7 * (1 - ph));
    ctx.fillRect(ap(wx + side * 0.5 + ph * 6 * -side * 0 + (k - 1.5) * 2), ap(water + 1 + ph * 4), 1.5, 0.5);
  }
};
const watermill = (ctx, x, y, s, o) => {
  const v = o.v % 2;
  const sp = body(`mill|${s}|${v}`, Math.ceil((MILL.hw + 28) * s), Math.ceil(48 * s + 4), Math.ceil(28 * s), (c, bx, by) => millBody(c, bx, by, s, v));
  stampBody(ctx, sp, x, y);
  millWheel(ctx, x, y, s, v, o.time);
};

// ---- the fishing hamlet -------------------------------------------------------
// A fisher's cottage: low limewashed walls, a deep thatch held down by ropes
// weighted with stones, a chimney at the back with peat smoke (live).
const COT = { hw: 12.5, wall: 9, apex: 8.5, D: 13 };
const cottageBody = (c, x, y, s, v) => {
  const gy = y + 8, hw = COT.hw * s, flip = v % 2 ? 1 : -1;
  const eave = gy - COT.wall * s, apex = eave - COT.apex * s, D = COT.D * s;
  shadow(c, x + 8 * s, gy + 0.5, hw * 1.7, 4.5 * s, 0.3);
  // the chimney at the back, behind the ridge
  part(c, (cc) => {
    rubble(cc, x + flip * -3.5 * s - 2 * s, apex - D - 5 * s, 4 * s, 7 * s, "#b0a694", 5);
    cc.fillStyle = darken("#b0a694", 0.45); cc.fillRect(ap(x + flip * -3.5 * s - 2 * s), ap(apex - D - 5 * s), 4 * s, 1);
  });
  // a lean-to shed on one side (odd v)
  if (v % 2) {
    part(c, (cc) => {
      const sx = x - flip * hw, sw = 7 * s;
      const x0 = flip > 0 ? sx - sw : sx;
      cc.fillStyle = WOOD; cc.fillRect(x0, gy - 6.5 * s, sw, 6.5 * s);
      cc.fillStyle = darken(WOOD, 0.3); for (let k = 1; k < 4; k++) cc.fillRect(ap(x0 + sw * k / 4), gy - 6.5 * s, 0.5, 6.5 * s);
      cc.fillStyle = "#6a7078"; poly(cc, [[x0 - 0.8, gy - 6 * s], [x0 + sw + 0.8, gy - 6 * s], [x0 + sw + 0.8, gy - 12 * s], [x0 - 0.8, gy - 12 * s]]); cc.fill();
      cc.fillStyle = "#8a9098"; cc.fillRect(x0 - 0.8, gy - 12 * s, sw + 1.6, 1);
      cc.fillStyle = "#4a5058"; for (let k = 1; k < 3; k++) cc.fillRect(x0 - 0.8, ap(gy - 12 * s + k * 2 * s), sw + 1.6, 0.5);
    });
  }
  part(c, (cc) => {
    cc.fillStyle = lin(cc, x - hw, 0, x + hw, 0, [[0, lighten(LIME, 0.06)], [0.65, LIME], [1, LIME_DK]]);
    cc.fillRect(x - hw, eave, hw * 2, gy - eave);
    poly(cc, [[x - hw, eave + 0.2], [x, apex], [x + hw, eave + 0.2]]); cc.fill();
    // limewash worn through at the foot: rubble showing
    for (let k = 0; k < 14; k++) {
      const bx = x - hw + hash(v + 3, k) * hw * 2, by = gy - 0.5 - hash(v + 5, k) * 2.5 * s;
      cc.fillStyle = hash(v, k) < 0.5 ? LIME_DK : "#b0a490"; cc.fillRect(ap(bx), ap(by), 1.5, 0.5);
    }
    cc.fillStyle = mix(moss(), LIME_DK, 0.4); cc.fillRect(x - hw, gy - 0.5, hw * 2, 0.5);
    door(cc, x + flip * 3.5 * s - 2.5 * s, gy - 7.5 * s, 5 * s, 7.5 * s, "#3e6a66");
    windowAt(cc, x - flip * 5 * s - 1.75 * s, gy - 6.5 * s, 3.5 * s, 3 * s, "#3e6a66");
    windowAt(cc, x - 1.25 * s, apex + 3.5 * s, 2.5 * s, 2.5 * s);
  });
  part(c, (cc) => {
    gableRoof(cc, x, eave, hw, apex, D, "thatch", 31 + v);
    // the ropes over the thatch, weighted with stones hanging at the eave
    for (const u of [-0.62, -0.25, 0.25, 0.62]) {
      const ex = x + u * hw, eyy = eave + 1 - (1 - Math.abs(u)) * (eave - apex) * 0;
      const ry = eave + 1 - (eave - apex) * (1 - Math.abs(u)) - 0.5;
      cc.fillStyle = darken(ROPE, 0.35);
      for (let t = 0; t < D; t += 0.5) px1(cc, ex, ry - t);
      ball(cc, ex, eyy + 2.2, 1.3, 1.2, "#8a8478", { hi: 0.4, lo: 0.4 });
    }
  });
  // a net hung to dry on the gable wall, a fish basket by the door
  part(c, (cc) => {
    // a string of cork floats hung along the eave
    for (let k = 0; k < 5; k++) {
      const u = -0.8 + k * 0.4, fx = x + u * hw * 0.85, fy = eave + 1.2 + (1 - u * u) * 1.2;
      ball(cc, fx, fy, 0.9, 0.8, "#d8a858", { hi: 0.4, lo: 0.4 });
    }
    const bx = x + flip * (hw - 1.5 * s);
    cc.fillStyle = WICKER; poly(cc, [[bx - 2.5 * s, gy - 4 * s], [bx + 2.5 * s, gy - 4 * s], [bx + 2 * s, gy + 0.5], [bx - 2 * s, gy + 0.5]]); cc.fill();
    cc.fillStyle = darken(WICKER, 0.3); for (let k = 0; k < 3; k++) cc.fillRect(bx - 2.3 * s, ap(gy - 3 * s + k * 1.2 * s), 4.6 * s, 0.5);
    ellipse(cc, bx, gy - 4 * s, 2.5 * s, 0.9 * s); cc.fillStyle = "#c0c8cc"; cc.fill();
    cc.fillStyle = "#e8eef0"; px1(cc, bx - 1, gy - 4.5 * s, 1, 0.5);
  });
};
// peat smoke: a few soft puffs climbing from the chimney, drifting east and thinning
const smoke = (ctx, x, y, time, k = 1) => {
  for (let i = 0; i < 4; i++) {
    const ph = (time * 0.22 + i / 4 + x * 0.013) % 1;
    const px = x + ph * 9 + Math.sin(time * 0.9 + i * 2) * 1.2, py = y - ph * 16;
    ctx.fillStyle = rgba(ph < 0.3 ? "#9a948c" : "#c8c4bc", (1 - ph) * 0.42 * k);
    ellipse(ctx, ap(px), ap(py), 1.4 + ph * 2.6, 1.1 + ph * 1.8); ctx.fill();
  }
};
const cottage = (ctx, x, y, s, o) => {
  const v = o.v % 2;
  const sp = body(`cot|${s}|${v}`, Math.ceil((COT.hw + 12) * s), Math.ceil(36 * s + 4), Math.ceil(14 * s), (c, bx, by) => cottageBody(c, bx, by, s, v));
  stampBody(ctx, sp, x, y);
  const gy = y + 8, flip = v % 2 ? 1 : -1;
  smoke(ctx, x + flip * -3.5 * s, gy - (COT.wall + COT.apex + COT.D + 5.5) * s, o.time);
};

// A boat drawn up on the strand, lying broadside to us: clinker strakes in
// paint and tar, the gunwale and the dark well inside with its thwarts.
// Its feet (x, y + 8) are on the grass; the hull lies a little below, down on the sand.
const hull = (c, x, gy, L, H, cols, seed, o = {}) => {
  // the hull's side: a long curve, the stern a little fuller than the bow
  const top = gy - H, bow = o.bow ?? 1;
  const sideP = [];
  for (let k = 0; k <= 16; k++) {
    const u = -1 + k / 8, sheer = top - Math.pow(Math.abs(u), 2.2) * H * 0.38;
    sideP.push([x + u * L, sheer]);
  }
  const keel = [];
  for (let k = 16; k >= 0; k--) {
    const u = -1 + k / 8;
    keel.push([x + u * L * 0.97 * (u * bow > 0 ? 0.98 : 1), gy - Math.pow(Math.abs(u), 3) * H * 0.62]);
  }
  c.save();
  poly(c, [...sideP, ...keel]); c.fillStyle = cols[0]; c.fill(); c.clip();
  // strakes: bands of colour, each with a lit upper lap and a dark lower one
  const bands = cols.length;
  for (let b = 0; b < 4; b++) {
    const f0 = b / 4, f1 = (b + 1) / 4;
    c.beginPath();
    for (let k = 0; k <= 16; k++) { const u = -1 + k / 8, yy = sideP[k][1] + (gy - sideP[k][1]) * f0; k ? c.lineTo(x + u * L, yy) : c.moveTo(x + u * L, yy); }
    for (let k = 16; k >= 0; k--) { const u = -1 + k / 8; c.lineTo(x + u * L, sideP[k][1] + (gy - sideP[k][1]) * f1); }
    c.closePath(); c.fillStyle = cols[Math.min(bands - 1, b === 0 ? 1 : b === 3 ? 0 : 2 + (b % Math.max(1, bands - 2)))]; c.fill();
    c.fillStyle = rgba("#2a1c2c", 0.35);
    for (let k = 0; k <= 32; k++) { const u = -1 + k / 16, sy = top - Math.pow(Math.abs(u), 2.2) * H * 0.38; px1(c, x + u * L, sy + (gy - sy) * f1 - 0.5); }
    c.fillStyle = rgba("#fff3d2", 0.22);
    for (let k = 0; k <= 32; k++) { const u = -1 + k / 16, sy = top - Math.pow(Math.abs(u), 2.2) * H * 0.38; px1(c, x + u * L, sy + (gy - sy) * f0); }
  }
  // the light from the west: the bow (east) end in shade
  c.fillStyle = rgba("#2a1c2c", 0.2); c.fillRect(x + L * 0.45, top - H, L, H * 3);
  c.restore();
  return sideP;
};
const BOAT_COLS = [
  ["#2e2a30", "#e6dcc4", "#4a7a6c", "#a8503c"],     // tar keel, cream sheer, sea green, red ochre
  ["#2e2a30", "#e6dcc4", "#3a6488", "#d8b34a"],
];
const boat = (ctx, x, y, s, o) => {
  const v = o.v % 4, gy = y + 8 + 6 * s, sd = o.seed;
  if (v === 1) {
    // a rowboat turned keel-up on two stones: a long tarred dome, its laps
    // catching the light along their upper edges, the keel a lit ridge, and
    // the dark gap under the gunwale where it rests
    const L = 13.5 * s, H = 4.2 * s, base = gy - 0.8 * s;
    shadow(ctx, x + 4 * s, gy + 0.5, L * 1.3, 3 * s, 0.32);
    part(ctx, (c) => { c.fillStyle = "#2a2226"; c.fillRect(x - L * 0.8, ap(base - 0.5), L * 1.6, 1.3); });
    part(ctx, (c) => {
      const prof = (u) => base - H * (1 - u * u) * (1 + 0.15 * (1 - u * u));
      c.beginPath(); c.moveTo(x - L, base);
      for (let k = 0; k <= 24; k++) { const u = -1 + k / 12; c.lineTo(x + u * L, prof(u)); }
      c.closePath();
      c.fillStyle = "#5c5458"; c.fill();
      c.save(); c.clip();
      c.fillStyle = "#8a4a34"; c.fillRect(x - L, base - 1.5 * s, L * 2, 1.5 * s);
      c.fillStyle = "#b0664a"; c.fillRect(x - L, base - 1.5 * s, L * 2, 0.5);
      for (let b = 1; b <= 3; b++) {
        const f = b / 4;
        for (let k = 0; k <= 48; k++) {
          const u = -1 + k / 24, top = prof(u), yy = top + (base - top) * f;
          c.fillStyle = u < 0.35 ? "#8e868a" : "#6a6266"; px1(c, x + u * L, yy - 0.5);
          c.fillStyle = "#3a3236"; px1(c, x + u * L, yy);
        }
      }
      c.fillStyle = rgba("#2a1c2c", 0.25); c.fillRect(x + L * 0.4, base - H - 2, L, H + 4);
      c.restore();
      // the keel along the crown, lit
      c.fillStyle = "#3a3236";
      for (let k = 0; k <= 24; k++) { const u = -0.75 + k / 16, yy = prof(u) * 1; px1(c, x + u * L, yy - 1, 0.5, 1); }
      c.fillStyle = "#a49a9c";
      for (let k = 0; k <= 12; k++) { const u = -0.75 + k / 16; px1(c, x + u * L, prof(u) - 1); }
      // stem and stern posts at the ends
    });
    return;
  }
  const flip = v === 3 ? -1 : 1;
  const L = (v === 2 ? 11 : 14) * s, H = (v === 2 ? 5 : 6.5) * s;
  const cols = BOAT_COLS[hash(sd, 7) < 0.5 ? 0 : 1];
  shadow(ctx, x + 5 * s, gy + 0.5, L * 1.25, 3.4 * s, 0.32);
  // the inside: the well seen over the far gunwale, its thwarts and ribs
  part(ctx, (c) => {
    const top = gy - H, wd = 3.6 * s;
    c.beginPath();
    for (let k = 0; k <= 16; k++) { const u = -1 + k / 8, sy = top - Math.pow(Math.abs(u), 2.2) * H * 0.38; const yy = sy - wd * (1 - Math.pow(Math.abs(u), 2.5)); k ? c.lineTo(x + u * L, yy) : c.moveTo(x + u * L, yy); }
    for (let k = 16; k >= 0; k--) { const u = -1 + k / 8; c.lineTo(x + u * L, top - Math.pow(Math.abs(u), 2.2) * H * 0.38); }
    c.closePath(); c.fillStyle = "#5a4232"; c.fill();
    c.save(); c.clip();
    c.fillStyle = "#3a2a24"; c.fillRect(x - L, top - wd * 0.45, L * 2, wd);
    c.fillStyle = WOOD_LT;
    for (const u of [-0.45, 0.05, 0.5]) c.fillRect(ap(x + u * L - 1), top - wd - 1, 2.5, wd + 1);
    c.fillStyle = darken(WOOD, 0.2);
    for (let u = -0.85; u < 0.9; u += 0.17) c.fillRect(ap(x + u * L), top - wd * 0.6, 0.5, wd * 0.6);
    c.restore();
    // the far gunwale rail
    c.fillStyle = darken(cols[1], 0.2);
    for (let k = 0; k <= 32; k++) { const u = -1 + k / 16, sy = top - Math.pow(Math.abs(u), 2.2) * H * 0.38; px1(c, x + u * L, sy - wd * (1 - Math.pow(Math.abs(u), 2.5)), 0.5, 1); }
  });
  // the gear inside: mast and furled sail lying fore and aft, or a pair of oars
  part(ctx, (c) => {
    const top = gy - H;
    if (v === 2) {
      c.strokeStyle = WOOD_LT; c.lineWidth = 1; c.lineCap = "round";
      c.beginPath(); c.moveTo(x - L * 0.8, top - 2.5 * s); c.lineTo(x + L * 0.95, top - 3.8 * s); c.stroke();
      c.beginPath(); c.moveTo(x - L * 0.9, top - 3.6 * s); c.lineTo(x + L * 0.75, top - 2 * s); c.stroke();
      c.fillStyle = WOOD_LT; c.fillRect(ap(x + L * 0.85), ap(top - 4.6 * s), 3, 1.5); c.fillRect(ap(x - L * 1.0), ap(top - 4.2 * s), 3, 1.5);
    } else {
      c.strokeStyle = WOOD; c.lineWidth = 1.2; c.lineCap = "round";
      c.beginPath(); c.moveTo(x - L * 1.1 * flip, top - 4.2 * s); c.lineTo(x + L * 0.9 * flip, top - 2.2 * s); c.stroke();
      // the furled sail along it, tan-bark red
      c.fillStyle = "#a8583c";
      poly(c, [[x - L * 0.75 * flip, top - 4.9 * s], [x + L * 0.5 * flip, top - 3.4 * s], [x + L * 0.5 * flip, top - 1.9 * s], [x - L * 0.75 * flip, top - 2.8 * s]]); c.fill();
      c.fillStyle = "#c87a54"; c.fillRect(ap(Math.min(x - L * 0.7 * flip, x + L * 0.45 * flip)), ap(top - 4.4 * s), L * 1.15, 0.5);
      c.fillStyle = "#6a3424"; for (const u of [-0.45, -0.1, 0.25]) c.fillRect(ap(x + u * L * flip), ap(top - 4.6 * s), 0.5, 2.4 * s);
    }
  });
  part(ctx, (c) => {
    const sideP = hull(c, x, gy, L, H, cols, sd, { bow: flip });
    // the near gunwale: a lit rail with tholes
    c.fillStyle = lighten(cols[1], 0.12);
    for (const [px, py] of sideP) c.fillRect(ap(px - 0.25), ap(py - 0.5), L / 8 + 0.5, 1);
    c.fillStyle = WOOD_DK;
    for (const u of [-0.35, 0.3]) { const k = Math.round((u + 1) * 8); px1(c, sideP[k][0], sideP[k][1] - 1.5, 0.5, 1); }
    // her number on the bow, in chalk
    c.fillStyle = "#f0e8d4"; px1(c, x + L * 0.62 * flip, gy - H * 0.5, 1, 1.5); px1(c, x + L * 0.62 * flip + 1.5, gy - H * 0.5, 0.5, 1.5);
  });
  // a stone and a coil of rope at her stern, a wet line where the tide left her
  part(ctx, (c) => {
    const rx = x - L * flip * 1.05, ry = gy + 1;
    for (let r = 2.2; r > 0.6; r -= 0.7) { c.strokeStyle = r > 1.5 ? ROPE : darken(ROPE, 0.25); c.lineWidth = 0.6; ellipse(c, rx, ry, r * s, r * 0.5 * s); c.stroke(); }
  });
};

// Nets hung to dry: a rack of posts with a rail, the nets swagged between
// them, cork floats along the head line; an oar leant against the end post.
const netrack = (ctx, x, y, s, o) => {
  const gy = y + 8, n = o.v % 2 ? 2 : 3, span = (n === 3 ? 10 : 12) * s, hh = 15 * s, sd = o.seed;
  const x0 = x - span * (n - 1) / 2;
  shadow(ctx, x + 6 * s, gy + 0.5, span * (n - 1) * 0.65 + 6, 3 * s, 0.26);
  // the posts and rail
  part(ctx, (c) => {
    for (let i = 0; i < n; i++) cylinder(c, x0 + i * span - 0.9, gy - hh, 1.8, hh + 0.5, WOOD, { r: 0.6 });
    c.fillStyle = WOOD_LT; c.fillRect(x0 - 2, ap(gy - hh + 1), span * (n - 1) + 4, 1.2);
    c.fillStyle = WOOD_DK; c.fillRect(x0 - 2, ap(gy - hh + 2.2), span * (n - 1) + 4, 0.5);
  });
  // the nets: mesh swagged from the rail, darker where it doubles, floats on the head line
  part(ctx, (c) => {
    for (let i = 0; i < n - 1; i++) {
      const a = x0 + i * span + 1, b = x0 + (i + 1) * span - 1, top = gy - hh + 2.5;
      const drop = (hh - 5 * s) * (0.75 + hash(sd, i) * 0.25);
      const curve = (t) => top + drop * (0.55 + 0.45 * Math.sin(Math.PI * t)) + Math.sin(t * 9 + i) * 0.4;
      c.save();
      c.beginPath(); c.moveTo(a, top);
      for (let t = 0; t <= 1.001; t += 0.1) c.lineTo(a + (b - a) * t, curve(t));
      c.lineTo(b, top); c.closePath();
      c.fillStyle = rgba("#5a524a", 0.42); c.fill(); c.clip();
      c.fillStyle = rgba("#3a3430", 0.85);
      for (let gx = a - drop; gx < b + drop; gx += 1.5) for (let t = 0; t < drop + 2; t += 0.5) {
        px1(c, gx + t * 0.5, top + t); px1(c, gx + drop * 0.5 - t * 0.5 + 0.75, top + t);
      }
      c.restore();
      // the foot line, and the floats along the head line
      c.fillStyle = "#3a3430";
      for (let t = 0; t <= 1.001; t += 0.04) px1(c, a + (b - a) * t, curve(t));
      for (let k = 0; k < 4; k++) {
        const fx = a + (b - a) * (k + 0.5) / 4;
        ball(c, fx, top + 0.8, 1.1, 0.9, "#d8a858", { hi: 0.4, lo: 0.4 });
      }
    }
  });
  // an oar leant on the end post, a basket at its foot
  part(ctx, (c) => {
    const ex = x0 + span * (n - 1) + 1.5;
    c.strokeStyle = WOOD_LT; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(ex + 5 * s, gy); c.lineTo(ex - 0.5, gy - hh + 1); c.stroke();
    c.fillStyle = WOOD_LT; poly(c, [[ex + 3.6 * s, gy - 4 * s], [ex + 5.5 * s, gy - 4.4 * s], [ex + 6 * s, gy + 0.2], [ex + 4.2 * s, gy + 0.4]]); c.fill();
    const bx = x0 - 4 * s;
    c.fillStyle = WICKER; poly(c, [[bx - 2.2 * s, gy - 3.5 * s], [bx + 2.2 * s, gy - 3.5 * s], [bx + 1.8 * s, gy + 0.4], [bx - 1.8 * s, gy + 0.4]]); c.fill();
    c.fillStyle = darken(WICKER, 0.3); for (let k = 0; k < 3; k++) c.fillRect(bx - 2 * s, ap(gy - 2.6 * s + k * s), 4 * s, 0.5);
    ellipse(c, bx, gy - 3.5 * s, 2.2 * s, 0.8 * s); c.fillStyle = "#3a2c28"; c.fill();
  });
};

// Lobster pots: domed creels of withy on flat bases, stacked two high, a coil
// of rope and a cork buoy with its flag stick.
const creel = (c, x, gy, s, col) => {
  const w = 3.6 * s, h = 3.8 * s;
  c.fillStyle = darken(col, 0.3); c.fillRect(ap(x - w), ap(gy - 1.2 * s), w * 2, 1.2 * s);
  c.beginPath(); c.moveTo(x - w, gy - 1 * s); c.quadraticCurveTo(x - w, gy - h - 1.5 * s, x, gy - h - 1.2 * s); c.quadraticCurveTo(x + w, gy - h - 1.5 * s, x + w, gy - 1 * s); c.closePath();
  c.fillStyle = lin(c, x - w, 0, x + w, 0, [[0, lighten(col, 0.25)], [0.5, col], [1, darken(col, 0.3)]]); c.fill();
  c.fillStyle = darken(col, 0.4);
  for (const u of [-0.55, 0, 0.55]) for (let t = 0; t < h; t += 0.5) px1(c, x + u * w * Math.sqrt(1 - Math.pow(t / (h + 1.2 * s), 2)), gy - 1 * s - t);
  c.fillStyle = "#2a2226"; ellipse(c, x, gy - h * 0.55, 0.9 * s, 0.7 * s); c.fill();
};
const creels = (ctx, x, y, s0, o) => {
  const s = s0 * 1.35, gy = y + 8, v = o.v % 2, sd = o.seed;
  shadow(ctx, x + 4 * s, gy + 0.5, 12 * s, 2.8 * s, 0.28);
  part(ctx, (c) => {
    creel(c, x - 4 * s, gy, s, WICKER);
    creel(c, x + 3.6 * s, gy + 0.5, s, darken(WICKER, 0.06));
  });
  part(ctx, (c) => creel(c, x - 0.3 * s + (v ? 1 : 0), gy - 5 * s, s, lighten(WICKER, 0.05)));
  part(ctx, (c) => {
    // the coil of rope
    const rx = x + (v ? -9 : 9) * s, ry = gy + 0.5;
    for (let r = 2.6; r > 0.5; r -= 0.65) { c.strokeStyle = r > 1.6 ? ROPE : darken(ROPE, 0.28); c.lineWidth = 0.7; ellipse(c, rx, ry - 0.5, r * s, r * 0.5 * s); c.stroke(); }
    // the buoy: a cork float with a stick and a red rag
    const bx = x + (v ? 8 : -9.5) * s;
    ball(c, bx, gy - 1.5 * s, 1.8 * s, 1.6 * s, "#c88a4a", { hi: 0.4, lo: 0.4 });
    c.fillStyle = WOOD_DK; c.fillRect(ap(bx - 0.25), ap(gy - 9 * s), 0.5, 7.5 * s);
    c.fillStyle = "#b8483c"; poly(c, [[bx + 0.25, gy - 9 * s], [bx + 3 * s, gy - 8.2 * s], [bx + 0.25, gy - 7 * s]]); c.fill();
    c.fillStyle = "#e0d8c8"; c.fillRect(ap(bx + 0.25), ap(gy - 8.5 * s), 1, 0.5);
  });
};

// Marram on a hummock of blown sand: long blue-green blades, rolled and
// stiff, leaning with the sea wind; a pale sand cushion under them with its
// own underline (baked flat, no ink ring).
const MARRAM = ["#5a7a5c", "#7e9c78", "#a4bc90", "#c8d4a8"];
const marram = (ctx, x, y, s, o) => {
  const gy = y + 8, v = o.v % 3, sd = o.seed;
  const w = (7 + v * 1.5) * s;
  // the hummock: sand, lit on its west side, a dark crumb line under it
  ctx.fillStyle = rgba("#2a1c2c", 0.22); ellipse(ctx, x + 1.5, gy + 0.8, w + 1, 2.2 * s); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - w, gy); ctx.quadraticCurveTo(x - w * 0.4, gy - 4.2 * s, x + w * 0.1, gy - 3.4 * s); ctx.quadraticCurveTo(x + w * 0.7, gy - 2.6 * s, x + w, gy); ctx.closePath();
  ctx.fillStyle = SAND; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = lighten(SAND, 0.2); ellipse(ctx, x - w * 0.35, gy - 3 * s, w * 0.5, 1.6 * s); ctx.fill();
  ctx.fillStyle = darken(SAND, 0.16); ellipse(ctx, x + w * 0.6, gy - 0.4, w * 0.55, 1.6 * s); ctx.fill();
  // wind ripples
  ctx.fillStyle = darken(SAND, 0.1);
  for (let k = 0; k < 4; k++) px1(ctx, x - w * 0.6 + hash(sd, k) * w * 1.2, gy - 0.5 - hash(sd, k + 9) * 2.5 * s, 1.5, 0.5);
  ctx.restore();
  ctx.fillStyle = darken(SAND, 0.42); ctx.fillRect(ap(x - w * 0.8), ap(gy), w * 1.6, 0.5);
  // the blades, back ones darker, front ones lit; each a tapering run of art pixels
  const n = 9 + v * 3;
  for (let i = 0; i < n; i++) {
    const back = i < n * 0.45;
    const u = (hash(sd, i + 20) - 0.5) * 1.5, bx = x + u * w * 0.75, by = gy - 2.2 * s - (1 - Math.abs(u)) * 1.4 * s + (back ? -0.5 : 0.8);
    const len = (7 + hash(sd, i + 40) * 7 + (1 - Math.abs(u)) * 4) * s * (back ? 0.92 : 1);
    const lean = (u * 0.55 + 0.35 + (hash(sd, i + 60) - 0.5) * 0.4);
    const col = back ? MARRAM[hash(sd, i + 80) < 0.5 ? 0 : 1] : MARRAM[1 + Math.floor(hash(sd, i + 80) * 3)];
    for (let t = 0; t < len; t += 0.5) {
      const f = t / len, X = bx + lean * t * (0.6 + f * 0.8), Y = by - t + f * f * len * 0.18;
      ctx.fillStyle = f > 0.8 && !back ? lighten(col, 0.18) : col;
      ctx.fillRect(ap(X), ap(Y), f < 0.45 ? 1 : 0.5, 0.5);
    }
  }
  // a seed head or two, straw coloured
  for (let i = 0; i < 2; i++) {
    const u = (hash(sd, i + 90) - 0.5), bx = x + u * w * 0.6, len = 13 * s;
    for (let t = 0; t < len; t += 0.5) { ctx.fillStyle = t > len - 3 * s ? "#d8c48a" : "#8a9a6a"; ctx.fillRect(ap(bx + 0.3 * t * 0.5), ap(gy - 3 * s - t), t > len - 3 * s ? 1 : 0.5, 0.5); }
  }
};

// A thistle: a rosette of spiny blue-green leaves at the foot, three or four
// stems, each crowned with a purple brush on a green bulb. Flat, underlined.
const THISTLE_LEAF = ["#3e5a46", "#5a7a5e", "#7a9a76", "#a4bc96"];
const thistle = (ctx, x, y, s0, o) => {
  // (drawn a size up: a thistle has to read at 1x among the crags)
  const s = s0 * 1.5, gy = y + 8, v = o.v % 3, sd = o.seed;
  const n = 3 + v;
  ctx.fillStyle = rgba("#2a1c2c", 0.24); ellipse(ctx, x + 1.5, gy + 0.6, 6 * s, 1.8 * s); ctx.fill();
  // the stems and their heads, back to front
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1 || 1) - 0.5) * 1.6 + (hash(sd, i) - 0.5) * 0.4;
    const h = (9 + hash(sd, i + 10) * 6 - Math.abs(u) * 2) * s, lean = u * 0.25;
    const bx = x + u * 2.2 * s, tx = bx + lean * h, ty = gy - h;
    for (let t = 0; t < h; t += 0.5) { ctx.fillStyle = THISTLE_LEAF[1]; ctx.fillRect(ap(bx + lean * t), ap(gy - t), 0.5, 0.5); }
    // a spiny leaf half way up
    const ly = gy - h * 0.45, lx = bx + lean * h * 0.45, ls = i % 2 ? 1 : -1;
    for (let t = 0; t < 3 * s; t += 0.5) { ctx.fillStyle = THISTLE_LEAF[2]; ctx.fillRect(ap(lx + ls * t), ap(ly - t * 0.4 + (t % 1.5 < 0.5 ? -0.5 : 0)), 0.5, 0.5); }
    // the bulb and the brush
    ctx.fillStyle = THISTLE_LEAF[0]; ctx.fillRect(ap(tx - 1), ap(ty), 2, 1.5);
    ctx.fillStyle = THISTLE_LEAF[2]; ctx.fillRect(ap(tx - 1), ap(ty), 1, 0.5); ctx.fillRect(ap(tx - 1.5), ap(ty + 1), 0.5, 0.5); ctx.fillRect(ap(tx + 1), ap(ty + 1), 0.5, 0.5);
    ctx.fillStyle = "#7a3a7a"; ctx.fillRect(ap(tx - 1), ap(ty - 1), 2, 1);
    ctx.fillStyle = "#b45aa8"; ctx.fillRect(ap(tx - 1), ap(ty - 1.5), 1.5, 0.5); ctx.fillRect(ap(tx - 1.5), ap(ty - 2), 0.5, 0.5); ctx.fillRect(ap(tx + 0.5), ap(ty - 2), 0.5, 0.5);
    ctx.fillStyle = "#e09ad8"; ctx.fillRect(ap(tx - 0.5), ap(ty - 2), 0.5, 0.5);
  }
  // the rosette: spiny leaves fanned along the ground, lit on top
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 5) * Math.PI + (hash(sd, i + 30) - 0.5) * 0.3, len = (4 + hash(sd, i + 40) * 2.5) * s;
    for (let t = 0; t < len; t += 0.5) {
      const X = x + Math.cos(a) * t, Y = gy - 0.5 + Math.sin(a) * t * 0.35 - 0.2 * t * (1 - t / len);
      ctx.fillStyle = t < len * 0.5 ? THISTLE_LEAF[1] : THISTLE_LEAF[2]; ctx.fillRect(ap(X), ap(Y), 1, 0.5);
      if (t > 1 && (t * 2) % 3 === 0) { ctx.fillStyle = THISTLE_LEAF[3]; ctx.fillRect(ap(X), ap(Y - 0.5), 0.5, 0.5); }
    }
  }
  ctx.fillStyle = THISTLE_LEAF[0]; ctx.fillRect(ap(x - 4 * s), ap(gy), 8 * s, 0.5);
};

// ---- the farms ---------------------------------------------------------------
// Straw skeps on a plank bench: coiled bands of straw, a dark door at the foot.
const skeps = (ctx, x, y, s, o) => {
  const gy = y + 8, n = o.v % 2 ? 2 : 3;
  shadow(ctx, x + 5 * s, gy + 0.5, 13 * s, 3 * s, 0.28);
  part(ctx, (c) => {
    c.fillStyle = WOOD_DK; for (const dx of [-8, 8]) c.fillRect(ap(x + dx * s - 0.75), gy - 4 * s, 1.5, 4 * s);
    c.fillStyle = WOOD_LT; c.fillRect(ap(x - 11 * s), ap(gy - 5 * s), 22 * s, 1.5);
    c.fillStyle = WOOD; c.fillRect(ap(x - 11 * s), ap(gy - 3.5 * s), 22 * s, 0.5);
  });
  for (let i = 0; i < n; i++) {
    part(ctx, (c) => {
      const bx = x + (i - (n - 1) / 2) * 7 * s, by = gy - 5 * s, w = 3.2 * s, h = 7 * s;
      c.beginPath(); c.moveTo(bx - w, by); c.bezierCurveTo(bx - w, by - h * 0.8, bx - w * 0.5, by - h, bx, by - h); c.bezierCurveTo(bx + w * 0.5, by - h, bx + w, by - h * 0.8, bx + w, by); c.closePath();
      c.fillStyle = lin(c, bx - w, 0, bx + w, 0, [[0, THATCH_LT], [0.45, THATCH], [1, THATCH_DK]]); c.fill();
      c.fillStyle = darken(THATCH_DK, 0.15);
      for (let k = 1; k < 6; k++) { const yy = by - h * k / 6, ww = w * Math.sqrt(1 - Math.pow(k / 6, 2.2)); c.fillRect(ap(bx - ww), ap(yy), ww * 2, 0.5); }
      c.fillStyle = "#2a2226"; c.fillRect(ap(bx - 1), ap(by - 1.5), 2, 1.5);
    });
  }
};

// A hay wain: a high-sided cart heaped with hay, shafts down, a fork stuck in.
const haywain = (ctx, x, y, s, o) => {
  const gy = y + 8, L = 13 * s, flip = o.v % 2 ? -1 : 1;
  shadow(ctx, x + 5 * s, gy, 22 * s, 3.8 * s, 0.28);
  const wheel = (c, wx, wy, r, far) => {
    ellipse(c, wx, wy, r, r); c.fillStyle = far ? WOOD_DK : WOOD; c.fill();
    ellipse(c, wx, wy, r - 1.1, r - 1.1); c.fillStyle = far ? "#2a2024" : "#3a2c26"; c.fill();
    c.strokeStyle = far ? WOOD_DK : WOOD_LT; c.lineWidth = 0.7;
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + Math.cos(a) * (r - 1), wy + Math.sin(a) * (r - 1)); c.stroke(); }
    ball(c, wx, wy, 1, 1, WOOD_DK, { hi: 0.3, lo: 0.3 });
  };
  part(ctx, (c) => { wheel(c, x - L + 4 * s, gy - 4.5 * s, 4.4 * s, true); wheel(c, x + L - 4 * s, gy - 4.5 * s, 4.4 * s, true); });
  part(ctx, (c) => {
    c.strokeStyle = WOOD; c.lineWidth = 1.2 * s; c.lineCap = "round";
    c.beginPath(); c.moveTo(x + flip * (L - 1), gy - 6 * s); c.lineTo(x + flip * (L + 11 * s), gy); c.stroke();
    // the bed's side
    c.fillStyle = lin(c, 0, gy - 10 * s, 0, gy - 4 * s, [[0, WOOD_LT], [1, WOOD_DK]]); c.fillRect(x - L, gy - 10 * s, L * 2, 6 * s);
    c.fillStyle = WOOD_DK; for (let u = -1; u <= 1.01; u += 0.25) c.fillRect(ap(x + u * L * 0.97 - 0.25), gy - 13 * s, 0.75, 9 * s);
    c.fillStyle = WOOD; c.fillRect(x - L, ap(gy - 13 * s), L * 2, 1);
  });
  // the load: a heaped mound of hay, combed strands, lit on top
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(x - L - 1, gy - 9 * s);
    c.bezierCurveTo(x - L - 2, gy - 22 * s, x + L + 2, gy - 23 * s, x + L + 1, gy - 9 * s); c.closePath();
    c.fillStyle = lin(c, 0, gy - 21 * s, 0, gy - 9 * s, [[0, "#ecd48a"], [0.45, "#d4b462"], [1, "#a8843e"]]); c.fill();
    c.save(); c.clip();
    for (let k = 0; k < 40; k++) {
      const hx = x - L + hash(o.seed, k) * L * 2, hy = gy - 10 * s - hash(o.seed, k + 50) * 11 * s;
      c.fillStyle = hash(o.seed, k + 99) < 0.5 ? "#f4e2a0" : "#a8843e"; c.fillRect(ap(hx), ap(hy), 1.5, 0.5);
    }
    c.restore();
    // wisps hanging over the side
    c.fillStyle = "#c8a85a"; for (let k = 0; k < 6; k++) c.fillRect(ap(x - L + 2 + k * L / 3), ap(gy - 9.5 * s), 0.5, 1.5 + hash(o.seed, k) * 1.5);
    // the fork
    c.fillStyle = WOOD_LT; c.fillRect(ap(x - flip * L * 0.4), ap(gy - 25 * s), 0.75, 7 * s);
    c.fillStyle = "#8a8e98"; c.fillRect(ap(x - flip * L * 0.4 - 1), ap(gy - 18.5 * s), 2.75, 0.5);
  });
  part(ctx, (c) => { wheel(c, x - L + 4 * s, gy - 4 * s, 5 * s, false); wheel(c, x + L - 4 * s, gy - 4 * s, 5 * s, false); });
};

// ---- the registry ---------------------------------------------------------------
export const VALE_ART = {
  flat: ["marram", "thistle"],
  decor: {
    menhir, stonefall, trilithon, watermill, cottage, boat, netrack, creels, marram, thistle, skeps, haywain,
  },
  live: ["watermill", "cottage"],
  box: {
    menhir: [20, 40], stonefall: [24, 18], trilithon: [26, 40], boat: [24, 18], netrack: [26, 24],
    creels: [20, 18], marram: [16, 26], thistle: [16, 28], skeps: [20, 18], haywain: [32, 34],
  },
  dress: { menhir: [7, true], trilithon: [16, true], stonefall: [14, true], netrack: [12, false], skeps: [11, false] },
  spawn: {}, turf: {}, road: {},
};
// (how wide each stands, for blocking and grounding, is registered with
// addFootprints in src/data/realms-greenwood.js: data never imports render)
