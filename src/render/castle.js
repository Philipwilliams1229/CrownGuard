// ============ RENDER: THE CASTLE ============
// The crown's curtain wall down the right edge of every board, the ground it
// stands in, the life on it between fights, and the crews the castle works
// put on it. Split out of scenery.js so the castle can be worked on by itself.

import { W, H, PATH_HALF } from "../data/constants.js";
import { PTS } from "../engine/path.js";
import { workTier, bowmenSpots, masonSpots, wallDrums, GATE_TOWER_N, GATE_TOWER_S, TOWER, ballistaSpots } from "../data/castle.js";
import { drawArcher, drawHalberdier, drawMason, WALL_FOLK } from "./folk.js";
import { ballista } from "./halls/archer.js";
import { REALM } from "../data/maps.js";
import * as TERRAIN from "../data/terrain.js";
import { groundKind } from "./groundblend.js";
import {
  lighten, darken, mix, rgba, soft, shadow, ball, glow, cylinder,
  blade, tuft, hash, lin, bakeSprite, PX, PIXEL, INK_LINE, inkOutline, STYLE } from "./paint.js";

const CASTLE_STONE = "#a19a8a";
const ROOF = "#a8505c";

// ---- the castle -------------------------------------------------------
// The crown's curtain wall runs the whole right edge of the board, drawn the
// way the old games drew a side wall: its top seen from above, its outer
// face tipped toward us as a strip of coursed stone rising out of the grass.
// Square towers stand astride it every hundred-odd units, taller than the
// curtain, each with an open fighting platform on top — a flagged floor
// inside a battlemented rim, a little red-roofed stair turret in its far
// corner — where the castle works' ballistae stand. Where the road arrives
// a gatehouse juts out of the wall with an arch as wide as the road, a
// portcullis half up in the dark of it, and the crown's banners.

// Across the band, left to right (world x): the foot in the grass, the
// battered outer face, the battlemented parapet, the walk the crews stand
// on, the low inner parapet running off the board.
const WALL = { face0: 749, face1: 757, par1: 766, walk1: 790 };
const GATE = { face0: 741, face1: 753 };
const GOLD = "#d8b34a", BANNER = "#34508e";
const MERLON = 15;

const S2 = (v) => Math.round(v * 2) / 2;          // snap to the art pixel
const tone = (c, v) => (v >= 0 ? lighten(c, v) : darken(c, -v));
const box = (c, x, y, w, h, col) => {
  const x0 = S2(x), y0 = S2(y), w2 = S2(x + w) - x0, h2 = S2(y + h) - y0;
  if (w2 <= 0 || h2 <= 0) return;
  c.fillStyle = col;
  c.fillRect(x0, y0, w2, h2);
};
const isWet = (x, y) => inRiverAt(x, y) || (TERRAIN.inSea ? TERRAIN.inSea(x, y, 1) : false);
const inRiverAt = (x, y) => TERRAIN.inRiver(x, y, 1);

// One piece of the castle painted on its own small layer and given a thin
// ink edge, like paint.js part() but only as big as the piece, so the bake
// stays quick. `bb` is the piece's bounds in world units, with room for ink.
const piece = (c, [x0, y0, x1, y1], fn) => {
  if (!PIXEL || STYLE.inner <= 0 || typeof document === "undefined") { fn(c); return; }
  const m = c.getTransform();
  const dx0 = Math.floor(m.a * x0 + m.e), dy0 = Math.floor(m.d * y0 + m.f);
  const layer = document.createElement("canvas");
  layer.width = Math.ceil(m.a * (x1 - x0)) + 2; layer.height = Math.ceil(m.d * (y1 - y0)) + 2;
  const k = layer.getContext("2d", { willReadFrequently: true });   // it is read straight back for the ink
  k.imageSmoothingEnabled = false;
  k.setTransform(m.a, 0, 0, m.d, m.e - dx0, m.f - dy0);
  fn(k);
  inkOutline(layer, INK_LINE, STYLE.inner);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(layer, dx0, dy0); c.restore();
};

// A face of coursed stone tipped toward us: courses run down the board and
// stack left (the foot, damp and mossy) to right (the coping, in the sun).
const outerFace = (c, x0, x1, y0, y1, seed) => piece(c, [x0 - 1, y0 - 1, x1 + 1, y1 + 1], (k) => {
  const S1 = CASTLE_STONE;
  box(k, x0, y0, x1 - x0, y1 - y0, darken(S1, 0.48));
  const n = Math.max(2, Math.round((x1 - x0) / 2.75)), cw = (x1 - x0) / n;
  for (let col = 0; col < n; col++) {
    const x = x0 + col * cw, up = col / Math.max(1, n - 1);
    // in the shade of its own height: darkest at the damp foot, catching a
    // little light toward the top
    const base = -0.42 + up * 0.28;
    let y = y0 - hash(seed + col, 1) * 12, i = 0;
    while (y < y1) {
      const len = 7 + Math.floor(hash(seed + col * 31, i + 5) * 4) * 2;
      const a = Math.max(y0, y), b = Math.min(y1, y + len);
      box(k, x + 0.5, a + 0.5, cw - 0.5, b - a - 0.5, tone(S1, base + (hash(seed + col * 7, i * 3 + 2) - 0.5) * 0.1));
      y += len; i++;
    }
  }
  // the vertical mortar seams, half filled with grime, only faint
  k.fillStyle = rgba(darken(S1, 0.3), 0.6);
  for (let col = 1; col < n; col++) for (let y = y0; y < y1; y += 4) if (hash(seed + col, Math.floor(y)) < 0.3) k.fillRect(S2(x0 + col * cw), S2(y), 0.5, 4);
  mossUp(k, x0, y0, y1, seed);
});
// moss creeping up a face from the foot where the damp keeps it (frost on
// the snow realms, soot-grey lichen on the ash)
const mossUp = (k, x0, y0, y1, seed) => {
  const kind = groundKind();
  const moss = kind === "snow" ? mix(REALM.GRASS_LT || "#e2ecf2", "#9aaab8", 0.25)
    : kind === "ash" ? mix(REALM.GRASS_LT || "#584a44", "#7a7068", 0.4)
    : mix(REALM.GRASS || "#82b256", "#3e5230", 0.35);
  for (let y = Math.floor(y0); y < y1; y += 2) {
    const h = hash(seed + 99, y);
    if (h < 0.35) continue;
    const up = 1 + Math.floor(hash(seed + 98, y) * hash(seed + 97, y >> 3) * 5);
    box(k, x0, y, up * 1.2, 2, h > 0.86 ? lighten(moss, 0.18) : moss);
  }
};

// The footing course at the very foot of a face: big weathered blocks
// standing a step proud of it, lit along their tops, half sunk in the ground
// (the ground's own earth and turf are laid back over them afterwards).
const plinth = (c, x, y0, y1, seed) => piece(c, [x - 4, y0 - 1, x + 1, y1 + 1], (k) => {
  const S1 = CASTLE_STONE;
  box(k, x - 2.5, y0, 2.5, y1 - y0, darken(S1, 0.5));
  let y = y0 - hash(seed, 2) * 10, i = 0;
  while (y < y1) {
    const len = 7 + Math.floor(hash(seed + i, 3) * 4) * 2;
    const a = Math.max(y0, y), b = Math.min(y1, y + len), v = (hash(seed + i, 4) - 0.5) * 0.1;
    if (b - a > 1) {
      box(k, x - 2.5, a + 0.5, 1, b - a - 0.5, tone(S1, 0.12 + v));
      box(k, x - 1.5, a + 0.5, 1.5, b - a - 0.5, tone(S1, -0.3 + v));
    }
    y += len; i++;
  }
});

// The battlements along the face's top edge: a sunlit coping, and merlons
// standing up off it — bright on top, dark on their south faces — with the
// low crenels between.
const parapet = (c, L, y0, y1, tier, seed, hurt) => {
  const S1 = CASTLE_STONE, x0 = L.face1, x1 = L.par1;
  piece(c, [x0 - 1, y0 - 1, x1 + 1, y1 + 1], (k) => {
    box(k, x0, y0, x1 - x0, y1 - y0, darken(S1, 0.5));
    let i = 0;
    for (let y = y0 - hash(seed, 4) * 6; y < y1; y += 6, i++) {
      const v = (hash(seed + 5, i) - 0.5) * 0.08;
      box(k, x0 + 0.5, Math.max(y0, y) + 0.5, 2, 5.5, tone(S1, 0.3 + v));
      box(k, x0 + 3, Math.max(y0, y) + 0.5, x1 - x0 - 3.5, 5.5, tone(S1, -0.16 + v));
    }
  });
  const shade = [];
  piece(c, [x0 - 1, y0 - 1, x1 + 1, y1 + 1], (k) => {
    for (let y = y0 + 3; y < y1 - 8; y += MERLON) {
      const h = hash(seed + 11, Math.floor(y));
      if (tier >= 2 && h < (tier >= 3 ? 0.34 : 0.2)) {
        // knocked off: a ragged stump, and its stones down on the walk
        box(k, x0 + 3, y + 4, 3.5, 2, tone(S1, 0.24));
        box(k, x0 + 3, y + 6, 3.5, 1.5, tone(S1, -0.36));
        hurt.push([x1 + 3 + hash(seed, y) * 7, y + 7]);
        continue;
      }
      box(k, x0 + 0.5, y, 2.5, 9, tone(S1, 0.18));
      box(k, x0 + 3, y, x1 - x0 - 3, 6, tone(S1, 0.42 + (h - 0.5) * 0.08));
      box(k, x0 + 3, y, x1 - x0 - 3, 1, tone(S1, 0.55));
      box(k, x0 + 3, y + 6, x1 - x0 - 3, 3, tone(S1, -0.36));
      if (tier >= 1 && h > 0.86) k.clearRect(S2(x1 - 2.5), S2(y), 2.5, 3);   // a chipped corner
      shade.push(y);
    }
  });
  return shade;
};

// The walk: big worn flags sunk between the parapets, the outer parapet's
// shadow along its west edge and each merlon's thrown down-right across it.
const walk = (c, L, y0, y1, seed, shade) => {
  const S1 = CASTLE_STONE, x0 = L.par1, x1 = L.walk1;
  piece(c, [x0 - 1, y0 - 1, x1 + 1, y1 + 1], (k) => {
    box(k, x0, y0, x1 - x0, y1 - y0, darken(S1, 0.36));
    let row = 0;
    for (let y = y0 - hash(seed, 8) * 6; y < y1; row++) {
      const h = 7 + Math.floor(hash(seed + 3, row) * 3) * 1.5;
      const off = hash(seed + 4, row) * 8;
      const cuts = [x0, x0 + 8 + off, x1];
      for (let i = 0; i < 2; i++) {
        const v = (hash(seed + row * 3, i + 1) - 0.5) * 0.12;
        box(k, cuts[i] + 0.5, Math.max(y0, y) + 0.5, cuts[i + 1] - cuts[i] - 0.5, Math.min(y1, y + h) - Math.max(y0, y) - 0.5, tone(S1, -0.1 + v));
      }
      y += h;
    }
  });
  c.fillStyle = "rgba(34,24,38,0.3)";
  c.fillRect(x0, y0, 3, y1 - y0);
  for (const y of shade) c.fillRect(x0 + 3, y + 3, 3, 8);
  // the low inner parapet, and the bailey beyond it off the board
  piece(c, [x1 - 1, y0 - 1, W + 10, y1 + 1], (k) => {
    box(k, x1, y0, W + 8 - x1, y1 - y0, darken(S1, 0.5));
    let i = 0;
    for (let y = y0 - hash(seed, 9) * 8; y < y1; y += 8, i++) {
      const v = (hash(seed + 6, i) - 0.5) * 0.1;
      box(k, x1 + 0.5, Math.max(y0, y) + 0.5, 2, 7.5, tone(S1, -0.14 + v));
      box(k, x1 + 3, Math.max(y0, y) + 0.5, W + 8 - x1 - 3, 7.5, tone(S1, 0.3 + v));
    }
  });
};

// a fallen chip of stone: lit top, dark underside
const rubble = (c, x, y, seed) => {
  const w = 2 + Math.floor(hash(seed, 5) * 3) * 0.5;
  box(c, x - w / 2, y - 1, w, 1, lighten(CASTLE_STONE, 0.25));
  box(c, x - w / 2, y, w, 1, darken(CASTLE_STONE, 0.3));
};

// A west face leaning back from its foot (x0, yN..yS) to its top edge
// (x1, tN..tS): coursed stone in shade, darkest at the damp foot.
const westFace = (c, x0, x1, yN, yS, tN, tS, seed) => {
  const S1 = CASTLE_STONE, lean = (x1 - x0) / (yN - tN);
  piece(c, [x0 - 1, tN - 1, x1 + 1, yS + 1], (k) => {
    k.save();
    k.beginPath(); k.moveTo(x0, yN); k.lineTo(x1, tN); k.lineTo(x1, tS); k.lineTo(x0, yS); k.closePath(); k.clip();
    box(k, x0 - 1, tN - 1, x1 - x0 + 2, yS - tN + 2, darken(S1, 0.48));
    const n = 4, cw = (x1 - x0) / n;
    for (let col = 0; col < n; col++) {
      const x = x0 + col * cw, dz = (col * cw) / lean, up = col / (n - 1);
      let y = yN - dz - 6 - hash(seed + col, 1) * 8, i = 0;
      while (y < yS) {
        const len = 7 + Math.floor(hash(seed + col * 31, i + 5) * 4) * 2;
        box(k, x + 0.5, y + 0.5, cw - 0.5, len - 0.5, tone(S1, -0.4 + up * 0.28 + (hash(seed + col * 7, i * 3 + 2) - 0.5) * 0.1));
        y += len; i++;
      }
    }
    mossUp(k, x0, yN - 2, yS, seed + 3);
    k.restore();
  });
};
// A south face, in its own shade: courses of stone from its top edge (tS)
// down to its foot (yS), its west end cut on the slant of the west face.
const southFace = (c, x0, x1, E, tS, yS, seed) => {
  const S1 = CASTLE_STONE;
  piece(c, [x0 - 1, tS - 1, E + 1, yS + 1], (k) => {
    k.save();
    k.beginPath(); k.moveTo(x0, yS); k.lineTo(x1, tS); k.lineTo(E, tS); k.lineTo(E, yS); k.closePath(); k.clip();
    box(k, x0 - 1, tS - 1, E - x0 + 2, yS - tS + 2, darken(S1, 0.55));
    let row = 0;
    for (let y = tS; y < yS; y += 4, row++) {
      let x = x0 - hash(seed, row) * 9, i = 0;
      while (x < E) {
        const len = 7 + Math.floor(hash(seed + 1 + row, i) * 3) * 2;
        box(k, x + 0.5, y + 0.5, len - 0.5, 3.5, tone(S1, -0.32 - (row === 2 ? 0.08 : 0) + (hash(seed + 2 + row, i) - 0.5) * 0.1));
        x += len; i++;
      }
    }
    k.restore();
  });
};
const slit = (c, sx, sy) => {
  box(c, sx - 1.5, sy - 3.5, 3, 7, darken(CASTLE_STONE, 0.2));
  box(c, sx - 1, sy - 3, 2, 6, "#1e1620");
  box(c, sx - 1.5, sy + 3, 3, 1, lighten(CASTLE_STONE, 0.35));
};

// A little square roof seen from above and to the south: its eaves a
// rectangle, four tiled facets rising to a point, the west one in the sun.
// `broken` burns it away to a few charred rafters.
const pyramidRoof = (c, x0, x1, yb, depth, rise, broken, seed) => {
  const cx = (x0 + x1) / 2, yN = yb - depth, apex = yb - depth / 2 - rise;
  if (broken) {
    piece(c, [x0 - 1, yN - 1, x1 + 1, yb + 1], (k) => { box(k, x0, yN, x1 - x0, depth, "#2e2224"); box(k, x0 + 1, yN + 1, x1 - x0 - 2, depth - 2, "#4a2a26"); });
    for (let i = 0; i < 3; i++) box(c, x0 + 2 + i * (x1 - x0 - 4) / 2 - 0.5, apex + 3 + hash(seed, i) * 3, 1.2, yb - apex - 4, "#2e2224");
    return null;
  }
  piece(c, [x0 - 2, apex - 2, x1 + 2, yb + 2], (k) => {
    const tri = (pts, col) => { k.beginPath(); k.moveTo(...pts[0]); for (const p of pts.slice(1)) k.lineTo(...p); k.closePath(); k.fillStyle = col; k.fill(); };
    tri([[x0, yN], [x1, yN], [cx, apex]], darken(ROOF, 0.4));
    tri([[x0, yN], [x0, yb], [cx, apex]], lighten(ROOF, 0.22));
    tri([[x1, yN], [x1, yb], [cx, apex]], darken(ROOF, 0.32));
    tri([[x0, yb], [x1, yb], [cx, apex]], ROOF);
    // tile courses across the south facet, and a lit ridge down its west edge
    k.strokeStyle = darken(ROOF, 0.3); k.lineWidth = 0.5;
    for (const t of [0.45, 0.75]) { const y = apex + (yb - apex) * t, hw = ((x1 - x0) / 2) * t; k.beginPath(); k.moveTo(cx - hw, y); k.lineTo(cx + hw, y); k.stroke(); }
    k.strokeStyle = lighten(ROOF, 0.45);
    k.beginPath(); k.moveTo(cx - 0.3, apex + 0.5); k.lineTo(x0 + 0.5, yb - 0.3); k.stroke();
  });
  ball(c, cx, apex - 0.5, 1.4, 1.4, GOLD, { hi: 0.5, lo: 0.35 });
  return [cx, apex];
};

// A banner of the crown hung down a south face: blue, a gold hem and a gold
// crown, cut to a swallowtail. It tatters as the castle suffers. (Painted
// into its own small sprite and rippled live; see bannerFrames.)
const banner = (c, x, y, w, len, tier, seed) => {
  const L = tier >= 3 ? len * 0.6 : tier >= 2 ? len * 0.82 : len;
  piece(c, [x - 2, y - 2, x + w + 2, y + len + 2], (k) => {
    k.beginPath(); k.moveTo(x, y); k.lineTo(x + w, y);
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const u = 1 - i / steps, px = x + w * u;
      const notch = Math.abs(u - 0.5) < 0.22 ? 3.5 * (1 - Math.abs(u - 0.5) / 0.22) : 0;
      k.lineTo(px, y + L - notch - (tier >= 2 ? hash(seed, i) * 3 : 0));
    }
    k.closePath();
    k.fillStyle = lin(k, x, 0, x + w, 0, [[0, lighten(BANNER, 0.22)], [0.5, BANNER], [1, darken(BANNER, 0.32)]]);
    k.fill();
    k.save(); k.clip();
    box(k, x, y, 1, L, GOLD);
    box(k, x + w - 1, y, 1, L, darken(GOLD, 0.25));
    k.restore();
    const cx = x + w / 2, cy = y + Math.min(L * 0.42, 7);
    box(k, cx - 2.5, cy, 5, 1.5, GOLD);
    for (const dx of [-2.5, -0.5, 1.5]) box(k, cx + dx, cy - 2, 1, 2, dx < 0 ? lighten(GOLD, 0.3) : GOLD);
    if (tier >= 3) { k.fillStyle = "rgba(30,20,24,0.45)"; k.fillRect(x, y + L * 0.5, w, L * 0.5); }
  });
  piece(c, [x - 3, y - 3, x + w + 3, y + 1], (k) => {
    box(k, x - 1.5, y - 1.5, w + 3, 1.5, GOLD);
    box(k, x - 1.5, y - 1.5, 1.2, 1.5, lighten(GOLD, 0.35));
  });
};

// A square tower astride the wall. Its footprint runs from foot - n to
// foot + s; its platform is that lifted h up the board. We see its west face
// leaning back from the grass, its south face in shade, and down into its
// open top: a flagged floor inside a battlemented rim, a stair turret with a
// red roof in the far (north-east) corner. Returns where its flag, smoke,
// slits and top are, for the live pennant, torchlight and fire.
const squareTower = (c, foot, o) => {
  const S1 = CASTLE_STONE, { x0, x1, x2, h } = TOWER;
  const yN = foot - TOWER.n, yS = foot + TOWER.s, tN = yN - h, tS = yS - h, E = x2;
  const seed = o.seed;
  // its shadow falls down and to the right, across the walk south of it
  c.fillStyle = "rgba(30,22,32,0.3)";
  c.fillRect(x1 + 3, yS, E - x1 + 1, 4);
  c.fillStyle = "rgba(30,22,32,0.15)";
  c.fillRect(x1 + 5, yS + 4, E - x1 - 1, 3);
  plinth(c, x0, yN + 1, yS, seed + 1);
  westFace(c, x0, x1, yN, yS, tN, tS, seed + 2);
  southFace(c, x0, x1, E, tS, yS, seed + 3);
  // the platform: a sunlit rim round a sunken floor of flags
  const f0 = x1 + 3, f1 = E - 3, g0 = tN + 3, g1 = tS - 2.5;
  piece(c, [x1 - 1, tN - 1, E + 1, tS + 1], (k) => {
    box(k, x1, tN, E - x1, tS - tN, tone(S1, 0.22));
    box(k, x1, tN, E - x1, 1, tone(S1, 0.42));
    box(k, x1, tN, 1, tS - tN, tone(S1, 0.36));
    box(k, E - 1, tN, 1, tS - tN, tone(S1, -0.1));
    box(k, f0, g0, f1 - f0, g1 - g0, darken(S1, 0.42));
    let row = 0;
    for (let y = g0; y < g1; row++) {
      const rh = 5 + Math.floor(hash(seed + 21, row) * 2) * 1.5;
      let x = f0 - hash(seed + 22, row) * 6, i = 0;
      while (x < f1) {
        const len = 6 + Math.floor(hash(seed + 23 + row, i) * 3) * 1.5;
        const a = Math.max(f0, x), b = Math.min(f1, x + len);
        if (b - a > 1) box(k, a + 0.5, y + 0.5, b - a - 0.5, Math.min(g1, y + rh) - y - 0.5, tone(S1, -0.22 + (hash(seed + 24 + row, i) - 0.5) * 0.12));
        x += len; i++;
      }
      y += rh;
    }
    // the north parapet's inner face, in shade, and the west parapet's shadow on the flags
    box(k, f0, g0, f1 - f0, 3, tone(S1, -0.4));
    k.fillStyle = "rgba(34,24,38,0.28)";
    k.fillRect(S2(f0), S2(g0 + 2), 2.5, S2(g1 - g0 - 2));
    // wear down the middle, where the crews stand
    k.fillStyle = "rgba(255,243,210,0.07)";
    k.fillRect(S2(f0 + 10), S2(g0 + 6), S2(f1 - f0 - 22), S2(g1 - g0 - 9));
  });
  // the stair turret in the north-east corner
  const tx0 = E - 12, tx1 = E - 1, tb = tN + 9;
  piece(c, [tx0 - 1, tN - 1, tx1 + 1, tb + 1], (k) => {
    box(k, tx0, tN + 1, tx1 - tx0, tb - tN - 1, darken(S1, 0.5));
    for (let y = tN + 2, r = 0; y < tb; y += 3, r++) box(k, tx0 + 0.5 + (r % 2) * 2, y, tx1 - tx0 - 1 - (r % 2) * 2, 2.5, tone(S1, -0.28 + (hash(seed + 31, r) - 0.5) * 0.1));
    box(k, tx0 + 3.5, tb - 5, 3, 5, "#2a1e26");     // its door onto the platform
    box(k, tx0 + 3.5, tb - 5, 3, 1, tone(S1, 0.2));
  });
  const top = pyramidRoof(c, tx0 - 1.5, tx1 + 1.5, tN + 2.5, 6, 8, o.broken, seed);
  // merlons round the rim: backs along the north, stubs down the west and
  // east rims, and the south rim's standing over the face
  const gone = (j) => o.tier >= 2 && hash(seed + 41, j) < (o.tier >= 3 ? 0.36 : 0.18);
  piece(c, [x1 - 1, tN - 5, E + 1, tS + 2], (k) => {
    let j = 0;
    for (let x = x1 + 1.5; x < tx0 - 5; x += 9, j++) {
      if (gone(j)) { box(k, x, tN - 0.5, 5, 1.5, tone(S1, -0.1)); continue; }
      box(k, x, tN - 3.5, 5, 3, tone(S1, 0.42));
      box(k, x, tN - 0.5, 5, 2.5, tone(S1, -0.3));
    }
    for (let y = tN + 7; y < tS - 6; y += 8, j++) {
      for (const x of [x1, E - 3]) {
        if (x > x1 && y < tb + 3) continue;
        if (gone(j + (x > x1 ? 50 : 0))) continue;
        box(k, x, y - 3, 3, 3, tone(S1, 0.44));
        box(k, x, y, 3, 1.5, tone(S1, -0.32));
      }
    }
    for (let x = x1 + 0.5; x < E - 4; x += 9, j++) {
      if (gone(j)) { box(k, x, tS - 1.5, 5, 1.5, tone(S1, -0.1)); continue; }
      box(k, x, tS - 4, 5, 3, tone(S1, 0.4));
      box(k, x, tS - 1, 5, 3, tone(S1, -0.3));
    }
  });
  const slits = [];
  for (const sx of [x1 + 9, x1 + 27]) { const sy = tS + h * 0.55; slit(c, sx, sy); slits.push([sx, sy]); }
  if (o.tier >= 2) soot(c, (x1 + E) / 2, tS + 1, (E - x1) / 2 - 2, h * (o.tier >= 3 ? 0.8 : 0.45), seed);
  const smoke = top || [(tx0 + tx1) / 2, tN];
  return { flag: o.flag === false || !top ? null : top, smoke, slits, top: tS, tN, tS };
};

// The stone is baked once per damage tier into an inked sprite; the road's
// dark under the gatehouse, torchlight, pennants, banners, smoke and fire
// are painted live.
let CASTLE = { key: "", cv: null, x0: 0, y0: 0, w: 0, h: 0, slits: [], flags: [], torches: [], burn: [], banners: [], perches: [], smoke: null };

// The gatehouse: a block of stone straddling the wall where the road
// arrives, a little broader than the road. From up here we see its
// battlemented top and its south face; the road runs east in under its west
// edge, into the shadow of the passage, the portcullis's teeth hanging over
// the mouth. Tipped the same way as the curtain, so its west face shows as
// a slanting strip beside the mouth.
const GH = 40, HS = 14;                  // half its length N-S, and its height
const gatehouse = (c, gy, tier, hurt, out) => {
  const S1 = CASTLE_STONE, x0 = GATE.face0, x1 = GATE.face1, yN = gy - GH, yS = gy + GH;
  const tN = yN - HS, tS = yS - HS, lean = (x1 - x0) / HS;
  const E = W + 8;
  const m0 = gy - PATH_HALF + 2, m1 = gy + PATH_HALF - 2, mz = 10;
  plinth(c, x0, yN + 1, m0 - 1, 44);
  plinth(c, x0, m1 + 1, yS, 45);
  westFace(c, x0, x1, yN, yS, tN, tS, 43);
  // the mouth of the passage: the road runs in under the face into the dark
  piece(c, [x0 - 1, m0 - mz - 2, x1 + 1, m1 + 2], (k) => {
    k.beginPath(); k.moveTo(x0, m0); k.lineTo(x0 + mz * lean, m0 - mz); k.lineTo(x0 + mz * lean, m1 - mz); k.lineTo(x0, m1); k.closePath();
    k.fillStyle = lin(k, x0, 0, x0 + mz * lean, 0, [[0, "rgba(22,15,22,0.55)"], [0.5, "rgba(22,15,22,0.82)"], [1, "rgba(16,11,16,0.97)"]]);
    k.fill();
  });
  // the portcullis wound up into the lintel: only its bottom rail and a row
  // of iron teeth show, hanging over the mouth
  const px = x0 + (mz - 1.5) * lean;
  box(c, px - 0.5, m0 - mz + 0.5, 1.5, m1 - m0 - 1, "#3e424c");
  for (let y = m0 - mz + 2.5; y < m1 - mz; y += 3.5) {
    box(c, px - 1.5, y, 1.5, 1.5, "#6a707c");
    box(c, px - 2.5, y + 1, 1, 1.5, "#9aa0ac");
  }
  // the top: flags, a portcullis groove and murder holes over the passage,
  // and battlements round the rim
  piece(c, [x1 - 1, tN - 1, E + 1, tS + 1], (k) => {
    box(k, x1, tN, E - x1, tS - tN, darken(S1, 0.34));
    let row = 0;
    for (let y = tN; y < tS; row++) {
      const h = 7 + Math.floor(hash(61, row) * 3) * 1.5, off = hash(62, row) * 7;
      const cuts = [x1, x1 + 9 + off, x1 + 21 + off * 0.5, E];
      for (let i = 0; i < 3; i++) box(k, cuts[i] + 0.5, y + 0.5, cuts[i + 1] - cuts[i] - 0.5, Math.min(tS, y + h) - y - 0.5, tone(S1, 0.08 + (hash(63 + row, i) - 0.5) * 0.2));
      y += h;
    }
    box(k, x1 + 11, m0 - HS, 2, m1 - m0, darken(S1, 0.55));
    for (const dy of [-12, 0, 12]) box(k, x1 + 15, gy - HS + dy - 1.5, 3, 3, darken(S1, 0.6));
  });
  // the guardroom's chimney, up through the top near its north rim
  const chx = 789, chy = tN + 15;
  c.fillStyle = "rgba(30,22,32,0.3)"; c.fillRect(chx - 1, chy, 8, 2.5);
  piece(c, [chx - 5, chy - 12, chx + 5, chy + 1], (k) => {
    box(k, chx - 2.5, chy - 8, 5, 8, darken(S1, 0.45));
    box(k, chx - 2.5, chy - 8, 1.5, 8, tone(S1, -0.12));
    box(k, chx - 1, chy - 8, 3.5, 8, tone(S1, -0.36));
    for (let y = chy - 6; y < chy; y += 3) box(k, chx - 2.5, y, 5, 0.5, darken(S1, 0.5));
    box(k, chx - 3.5, chy - 10.5, 7, 2.5, tone(S1, 0.36));
    box(k, chx - 3.5, chy - 8.5, 7, 0.5, tone(S1, -0.3));
    box(k, chx - 2, chy - 10.5, 4, 1, "#1e1620");
  });
  out.smoke = [chx, chy - 11];
  // the backs of the merlons along its north rim
  piece(c, [x1 + 6, tN - 4, E + 1, tN + 4], (k) => {
    box(k, x1 + 7, tN, E - x1 - 7, 1.5, tone(S1, 0.22));
    for (let x = x1 + 12; x < E - 4; x += 10) { box(k, x, tN - 3, 6, 2.5, tone(S1, 0.38)); box(k, x, tN - 0.5, 6, 2, tone(S1, -0.28)); }
  });
  // the royal standard's pole, stepped in a socket on the top
  box(c, 795, tS - 9, 3, 2, darken(S1, 0.5));
  out.flags.push([796.5, tS - 8, 2]);
  const L = { face1: x1, par1: x1 + 7 };
  const shade = parapet(c, L, tN, tS - 5, tier, 47, hurt);
  c.fillStyle = "rgba(34,24,38,0.3)";
  c.fillRect(L.par1, tN, 3, tS - tN - 5);
  for (const y of shade) c.fillRect(L.par1 + 3, y + 3, 3, 8);
  for (const y of shade) out.perches.push([L.face1 + 5, y + 2.5]);
  // the battlements along its south rim, merlons standing up off a coping
  piece(c, [x1 - 1, tS - 10, E + 1, tS + 1], (k) => {
    box(k, x1, tS - 5, E - x1, 5, darken(S1, 0.45));
    box(k, x1 + 0.5, tS - 4.5, E - x1, 1.5, tone(S1, 0.3));
    box(k, x1 + 0.5, tS - 3, E - x1, 2.5, tone(S1, -0.12));
    for (let x = x1 + 1; x < E - 4; x += 10) {
      if (tier >= 2 && hash(71, x) < (tier >= 3 ? 0.35 : 0.2)) { hurt.push([x + 2, tS - 12]); continue; }
      box(k, x, tS - 9, 6, 5, tone(S1, 0.4));
      box(k, x, tS - 4, 6, 3.5, tone(S1, -0.3));
      if (x > x1 + 20 && x < 790) out.perches.push([x + 3, tS - 7]);
    }
  });
  southFace(c, x0, x1, E, tS, yS, 81);
  box(c, 771, tS + 2.5, 2, 6, "#1e1620");
  box(c, 770.5, tS + 8.5, 3, 1, tone(S1, 0.1));
  // the crown's banners hang here; they are rippled live
  out.banners.push([757, tS + 1.5, 8, 14, 5], [784, tS + 1.5, 8, 14, 6]);
  // the torches on brackets either side of the mouth
  for (const y of [m0 - 5, m1 + 5]) {
    const tx = x0 + 6 * lean, ty = y - 6;
    box(c, tx - 2, ty + 1, 3, 1.5, "#3a3440");
    box(c, tx - 1.25, ty - 3, 1.5, 4.5, "#6a4a2e");
    out.torches.push([tx - 0.5, ty - 3]);
  }
  if (tier >= 1) crackAcross(c, x0 + 0.5, yN + 6, 7, 70);
  if (tier >= 2) { crackAcross(c, x0 + 0.5, yS - 4, 8, 71); crack(c, 796, tS + 1, 10, 72); }
  return { tN, tS };
};

// every tower's footprint down the wall, gate towers included: [foot, gate]
const towersOf = (gy) => [...wallDrums(gy).map((f) => [f, 0]), [gy + GATE_TOWER_N, -1], [gy + GATE_TOWER_S, 1]];

const paintCastleStone = (ctx, gx, gy, tier) => {
  const out = { slits: [], flags: [], torches: [], burn: [], banners: [], perches: [], smoke: null };
  const hurt = [];
  const yN = gy - GH, yS = gy + GH;
  const towers = towersOf(gy);
  // the curtain, north of the gate and south of it
  for (const [y0, y1, seed] of [[-14, yN, 11], [yS, H + 14, 29]]) {
    if (y1 <= y0) continue;
    plinth(ctx, WALL.face0, y0, y1, seed + 5);
    outerFace(ctx, WALL.face0, WALL.face1, y0, y1, seed);
    const shade = parapet(ctx, WALL, y0, y1, tier, seed, hurt);
    walk(ctx, WALL, y0, y1, seed, shade);
    // the merlons no tower stands over are where the birds sit
    for (const y of shade) if (!towers.some(([f]) => y > f - TOWER.n - TOWER.h - 12 && y < f + TOWER.s + 2) && y > 6 && y < H - 10) out.perches.push([WALL.face1 + 5.5, y + 2.5]);
  }
  // where a river runs under the wall, a culvert: a low arch with an iron
  // grate across it, the water sliding into the dark
  let run = null;
  for (let y = -10; y <= H + 10; y++) {
    const wet = inRiverAt(WALL.face0 - 1, y) && Math.abs(y - gy) > 60;
    if (wet && run === null) run = y;
    if (!wet && run !== null) { culvert(ctx, run, y); run = null; }
  }
  if (tier >= 1) {
    for (let i = 0; i < tier * 3; i++) {
      const y = 20 + hash(i, 51) * (H - 40);
      if (Math.abs(y - gy) < 50) continue;
      crackAcross(ctx, WALL.face0 + 0.5, y, WALL.face1 - WALL.face0 + 1, i + 60);
    }
  }
  // the towers, evenly down the wall, and one at each end of the gatehouse:
  // the north one standing behind it, the south one far enough down the
  // wall that nothing of it rises over the gate
  const things = towers.map(([foot, gate]) => ({ foot, gate, seed: gate ? (gate < 0 ? 7 : 9) : foot }));
  things.push({ house: true, foot: yS });
  things.sort((a, b) => a.foot - b.foot);
  // the fire takes the north gate tower's turret first, and one tower after it
  const plain = things.filter((t) => !t.house && !t.gate);
  const torched = tier >= 3 ? [things.find((t) => t.gate === -1), plain[0]].filter(Boolean) : [];
  // the stones of fallen merlons lie on the walk, under anything standing over it
  const fallen = () => { for (const [x, y] of hurt.splice(0)) for (let i = 0; i < 3; i++) rubble(ctx, x + (hash(x, i) - 0.5) * 7, y + (hash(y, i) - 0.5) * 6, x + y + i); };
  fallen();
  for (const t of things) {
    if (t.house) { gatehouse(ctx, gy, tier, hurt, out); fallen(); continue; }
    const burnt = torched.includes(t);
    const res = squareTower(ctx, t.foot, { ...t, tier, broken: burnt, flag: t.gate === 1 ? false : undefined });
    if (res.flag) out.flags.push([...res.flag, t.gate ? 1 : 0]);
    out.slits.push(...res.slits);
    if (tier >= 2 && (t.gate === -1 || burnt)) out.burn.push(res.smoke);
    if (tier >= 1) crack(ctx, TOWER.x1 + 4 + hash(t.seed, 3) * 36, res.top + 1, TOWER.h * (0.3 + tier * 0.12), t.seed);
  }
  return out;
};

// A culvert through the curtain for a river: arch ring, dark mouth, grate.
const culvert = (c, ya, yb) => {
  const S1 = CASTLE_STONE, x0 = WALL.face0, cy = (ya + yb) / 2, ry = (yb - ya) / 2 + 1;
  const mouth = (k, rx, r2) => {
    k.beginPath(); k.moveTo(x0, cy - r2); k.lineTo(x0 + 1.5, cy - r2);
    k.ellipse(x0 + 1.5, cy, rx, r2, 0, -Math.PI / 2, Math.PI / 2); k.lineTo(x0, cy + r2); k.closePath();
  };
  piece(c, [x0 - 2, cy - ry - 5, x0 + 12, cy + ry + 5], (k) => {
    mouth(k, 7.5, ry + 3.5);
    k.fillStyle = lighten(S1, 0.18); k.fill();
    mouth(k, 4.5, ry);
    k.fillStyle = "rgba(18,14,20,0.62)"; k.fill();
    k.save(); k.clip();
    for (let y = cy - ry + 2.5; y < cy + ry - 1; y += 3.5) box(k, x0, y, 7, 1, "#4a4e5a");
    box(k, x0 + 3, cy - ry, 1, ry * 2, "#3a3e48");
    k.restore();
  });
};

// A crack up a face: a jagged dark line with a sunlit lip on its left.
const crack = (c, x, y, len, seed) => {
  let px = x;
  for (let d = 0; d < len; d += 1.5) {
    px += (hash(seed, d * 2) - 0.5) * 2;
    box(c, px - 0.5, y + d, 1, 1.5, "rgba(40,28,34,0.8)");
    box(c, px - 1, y + d, 0.5, 1.5, "rgba(255,243,210,0.25)");
  }
};
// ...and one across the tipped face, running from foot to top edge.
const crackAcross = (c, x, y, len, seed) => {
  let py = y;
  for (let d = 0; d < len; d += 1) {
    py += (hash(seed, d * 3) - 0.5) * 2.2;
    box(c, x + d, py - 0.5, 1, 1.2, "rgba(40,28,34,0.8)");
    box(c, x + d, py - 1, 1, 0.5, "rgba(255,243,210,0.22)");
  }
};
// smoke-black licked up a face from under its roof: a dither of soot that
// thins out as it goes down
const soot = (c, cx, top, r, depth, seed) => {
  c.fillStyle = "rgba(40,28,34,0.55)";
  for (let y = top; y < top + depth; y += 0.5) for (let x = cx - r; x < cx + r; x += 0.5) {
    const i = Math.round(x * 2), j = Math.round(y * 2);
    if ((i + j) % 2) continue;
    const fall = 1 - (y - top) / depth, wob = 0.6 + 0.4 * Math.sin(x * 0.7 + seed);
    if (hash(i + seed, j) < fall * fall * wob * 0.8) c.fillRect(x, y, 0.5, 0.5);
  }
};

// ---- the ground the castle stands in ------------------------------------
// The wall doesn't stop at a line in the grass. Along its foot runs a worn
// apron of trodden earth (or trampled snow, black fen mud, grey ash, scree),
// darkest in the wall's own shade; the realm's ground creeps back over the
// footing course in clumps; fallen stones lie about. Where the road arrives
// it widens into a cobbled threshold that runs right in under the arch.
// Baked per realm, gate and damage tier as two layers: the ground itself
// (under everything that walks), and what lies over the wall's foot.
const wob = (y, s) => Math.sin(y * 0.083 + s) * 0.5 + Math.sin(y * 0.21 + s * 2.3) * 0.3 + Math.sin(y * 0.57 + s * 3.7) * 0.2;
const groundPal = () => {
  const r = REALM, kind = groundKind(r);
  const earth = {
    snow: mix(r.GRASS, "#8196aa", 0.32),
    marsh: mix(r.GRASS_DK, "#1a1814", 0.42),
    ash: mix(r.GRASS_LT, "#6e6660", 0.4),
    turf: mix(r.PATH_DK, r.GRASS_DK, 0.5),
    grass: mix(r.PATH_DK, r.GRASS_DK, 0.42),
  }[kind];
  const joint = {
    snow: lighten(r.GRASS_LT, 0.1),
    marsh: r.GRASS_DK,
    ash: "#3a302c",
    turf: darken(r.PATH_DK, 0.2),
    grass: mix(r.PATH_DK, r.GRASS_DK, 0.55),
  }[kind];
  const sett = mix(CASTLE_STONE, r.PATH_DK, 0.3);
  return { r, kind, earth, joint: kind === "snow" ? mix(darken(sett, 0.3), joint, 0.6) : mix(darken(sett, 0.4), joint, 0.35), sett, pebble: r.PEBBLE || "#c8c0ac" };
};
// where the stone meets the ground at a given y
const footAt = (y, gy, towers) => {
  if (Math.abs(y - gy) <= GH) return GATE.face0;
  for (const [f] of towers) if (y >= f - TOWER.n && y <= f + TOWER.s) return TOWER.x0;
  return WALL.face0;
};

// one clump of the realm's own ground, as the halls' ground blend has them
const footClump = (c, P, x, y, s, seed) => {
  const { r, kind } = P;
  if (kind === "snow") {
    shadow(c, x + 0.8, y + 0.9, 3.4 * s, 1 * s, 0.12);
    ball(c, x, y - 0.3 * s, 3.4 * s, 1.5 * s, lighten(r.GRASS_LT, 0.15), { hi: 0.35, lo: 0.2 });
    ball(c, x + 0.5 * s, y + 1.4 * s, 2 * s, 0.9 * s, r.GRASS_LT, { hi: 0.3, lo: 0.25 });
    return;
  }
  if (kind === "ash") {
    for (let i = 0; i < 3; i++) {
      const px = x + (hash(seed, i + 3) - 0.3) * 2 * s, py = y + (hash(seed, i) - 0.5) * 6 * s;
      shadow(c, px + 0.6, py + 0.8, 1.8 * s, 0.8 * s, 0.2);
      ball(c, px, py, (1.1 + hash(seed, i + 6)) * s, (0.8 + hash(seed, i + 6) * 0.5) * s, mix("#5a4c46", "#3a302c", hash(seed, i + 9)), { hi: 0.4, lo: 0.4 });
    }
    tuft(c, x - 1, y, 0.45 * s, "#4a3a2c", "#8a6a44", seed, { n: 3, wind: 0.4 });
    return;
  }
  if (kind === "marsh") {
    ball(c, x, y - 0.4 * s, 2.4 * s, 2.2 * s, r.GRASS_LT, { hi: 0.4, lo: 0.4 });
    const n = 2 + Math.floor(hash(seed, 2) * 2);
    for (let i = 0; i < n; i++) {
      const by = y + (i - (n - 1) / 2) * 1.4 * s, len = (4 + hash(seed, i + 11) * 3.5) * s;
      blade(c, x - 0.5, by, x - 0.5 + (hash(seed, i + 4) - 0.6) * 2, by - len, 0.7 * s, darken(r.TUFT, 0.1), lighten(r.GRASS_LT, 0.25), 0.4);
    }
    if (hash(seed, 5) > 0.6) ball(c, x + 0.5, y - 5.5 * s, 0.8 * s, 1.4 * s, "#6a4a30", { hi: 0.4, lo: 0.4 });
    return;
  }
  if (kind === "turf") {
    tuft(c, x, y, 0.42 * s, r.TUFT, r.GRASS_LT, seed, { n: 3 + Math.floor(hash(seed, 3) * 2) });
    if (hash(seed, 8) > 0.4) {
      const py = y + (hash(seed, 9) > 0.5 ? 3 : -3) * s;
      shadow(c, x - 1.4, py + 0.8, 1.8 * s, 0.7 * s, 0.2);
      ball(c, x - 2, py, 1.5 * s, 1 * s, P.pebble, { hi: 0.5, lo: 0.45 });
    }
    return;
  }
  tuft(c, x, y, 0.55 * s, r.TUFT, r.GRASS_LT, seed, { n: 3 + Math.floor(hash(seed, 3) * 3) });
  if (hash(seed, 8) > 0.55) ball(c, x - 1.5 * s, y + 2 * s, 1.3 * s, 0.9 * s, r.GRASS_DK, { hi: 0.3, lo: 0.3 });
};

// the cobbled threshold: the road widening as it meets the gate, setts laid
// thicker toward the arch and thinning out into the road's dirt. The horde
// walks right in over it, so `full` is only for when it is laid under them
// (draw.js calling drawCastleGround); otherwise only the wings of the flare
// beyond the road are paved.
const PAVE_X = GATE.face0 - 40;
const paving = (c, gy, P, full) => {
  const { r } = P, xa = PAVE_X, xb = GATE.face0 + 3;
  const h0 = PATH_HALF - 3, h1 = GH + 3;
  const hw = (x) => { const u = Math.min(1, Math.max(0, (x - xa) / (xb - xa))); return h0 + (h1 - h0) * u * u; };
  c.save();
  if (!full) {
    const band = PATH_HALF - 3;
    c.beginPath(); c.rect(xa - 2, gy - h1 - 4, xb - xa + 4, h1 + 4 - band); c.rect(xa - 2, gy + band, xb - xa + 4, h1 + 4 - band); c.clip();
  }
  // trodden earth out to the flare, where it runs past the road's edge
  for (let x = xa + 8; x < xb; x += 0.5) {
    const h = hw(x);
    if (h <= PATH_HALF - 2) continue;
    c.fillStyle = mix(r.PATH_MAIN, r.PATH_DK, 0.55);
    c.fillRect(x, gy - h, 0.5, h - PATH_HALF + 4);
    c.fillRect(x, gy + PATH_HALF - 4, 0.5, h - PATH_HALF + 4);
  }
  const rowH = 3;
  for (let y = gy - h1 - 1, row = 0; y < gy + h1 + 1; y += rowH, row++) {
    let x = xb - (row % 2) * 2 - hash(row, 77);
    for (let i = 0; x > xa; i++) {
      const len = 3.5 + Math.floor(hash(row * 13 + i, 78) * 3) * 0.5, x0 = x - len;
      x = x0;
      const mid = x0 + len / 2, cy = y + rowH / 2;
      if (Math.abs(cy - gy) + 1.3 > hw(mid) || x0 < xa) continue;
      // each course starts at its own ragged line, a stray sett or two out ahead of it
      const from = xa + 10 + hash(row, 81) * 12 + Math.abs(cy - gy) * 0.12;
      if (x0 < from && hash(row * 7 + i, 79) > 0.12 - (from - x0) * 0.01) continue;
      const v = (hash(row * 5 + i, 80) - 0.5) * 0.14;
      box(c, x0, y, len, rowH, P.joint);
      box(c, x0 + 0.5, y + 0.5, len - 1, rowH - 1, tone(P.sett, v));
      box(c, x0 + 0.5, y + 0.5, len - 1.5, 0.5, tone(P.sett, 0.16 + v));
    }
  }
  // kerbs along the flare, where the threshold's edge runs out past the road
  for (const side of [-1, 1]) {
    for (let x = xb - 5, i = 0; x > xa + 2 && hw(x) > PATH_HALF - 1; x -= 5, i++) {
      const y = gy + side * (hw(x + 2.5) + 0.5);
      box(c, x, y - 1.5, 4.5, 3, darken(P.sett, 0.45));
      box(c, x + 0.5, y - 1, 3.5, 2, tone(P.sett, 0.06 + (hash(i, side + 90) - 0.5) * 0.12));
      box(c, x + 0.5, y - 1, 3.5, 0.5, tone(P.sett, 0.3));
    }
  }
  c.restore();
  if (!full) return;
  // the sill under the arch: long slabs worn hollow in the middle
  for (let y = gy - PATH_HALF + 2, i = 0; y < gy + PATH_HALF - 2; i++) {
    const len = 9 + hash(i, 91) * 5, b = Math.min(gy + PATH_HALF - 2, y + len);
    box(c, xb - 5, y, 5, b - y, darken(P.sett, 0.4));
    box(c, xb - 4.5, y + 0.5, 4, b - y - 1, tone(P.sett, 0.1 + (hash(i, 92) - 0.5) * 0.1));
    box(c, xb - 4.5, y + 0.5, 1, b - y - 1, tone(P.sett, 0.3));
    y = b;
  }
};

const paintGroundUnder = (c, gy, full) => {
  const P = groundPal(), towers = towersOf(gy);
  for (let y = -14; y < H + 14; y++) {
    const fx = footAt(y, gy, towers);
    if (fx === GATE.face0) continue;                 // the threshold covers the gate's front
    if (isWet(fx - 2, y)) {
      // standing in water: a lap of foam and the stone's dark reflection
      if (hash(3, y >> 1) > 0.25) box(c, fx - 1.5, y, 1.5, 1, "rgba(236,244,246,0.55)");
      box(c, fx - 4, y, 2.5, 1, "rgba(20,24,32,0.22)");
      continue;
    }
    const w = Math.max(1.5, 5 + wob(y, 1.7) * 3.2 + (hash(3, y) - 0.5) * 1.5), e = fx - 2.5;
    box(c, e - w, y, w + 5, 1, tone(P.earth, (hash(5, y >> 1) - 0.5) * 0.08));
    if (hash(9, y) > 0.55) box(c, e - w - 0.5, y, 0.5, 1, rgba(P.earth, 0.6));
    if (P.kind === "snow") box(c, e - 1.5, y, 1.5, 1, mix(P.r.PATH_EDGE, P.r.GRASS_DK, 0.35));  // bare earth where the stone's warmth melts it
    // pebbles in the dirt
    if (hash(11, y) > 0.88) { const px = e - 1.5 - hash(12, y) * (w - 1); box(c, px, y, 1, 0.5, lighten(P.pebble, 0.1)); box(c, px, y + 0.5, 1, 0.5, darken(P.pebble, 0.35)); }
    // the wall's own shade, deepest right at its foot
    c.fillStyle = "rgba(30,22,32,0.28)"; c.fillRect(e - 2, y, 4, 1);
    c.fillStyle = "rgba(30,22,32,0.12)"; c.fillRect(e - 4.5 - hash(13, y >> 1), y, 2.5, 1);
  }
  // puddles in the fen mud
  if (P.kind === "marsh") for (let y = 30; y < H - 20; y += 47 + hash(y, 14) * 30) {
    const fx = footAt(y, gy, towers);
    if (fx === GATE.face0 || isWet(fx - 2, y)) continue;
    c.fillStyle = P.r.water?.edge || "#2f423c";
    c.beginPath(); c.ellipse(fx - 4.5, y, 2.2, 4, 0, 0, Math.PI * 2); c.fill();
    box(c, fx - 5.5, y - 2, 1, 1.5, rgba(P.r.water?.shine || "#4a6a58", 0.8));
  }
  paving(c, gy, P, full);
};

// what lies over the wall's foot: earth banked against the footing, the
// realm's turf creeping over it in clumps, fallen stones; and at the dusky
// realms a brazier each side of the threshold
const paintGroundOver = (c, gx, gy, tier, out) => {
  const P = groundPal(), towers = towersOf(gy);
  const clear = (y) => Math.abs(y - gy) > PATH_HALF + 1;
  // earth banked over the footing course
  for (let y = -10, i = 0; y < H + 10; y += 5 + hash(i, 20) * 7, i++) {
    const fx = footAt(y, gy, towers);
    const snow = P.kind === "snow";
    if (!clear(y) || isWet(fx - 2, y) || hash(i, 21) < (snow ? 0.62 : 0.3)) continue;
    if (snow) ball(c, fx - 2.4, y, 2.2, 3 + hash(i, 22) * 2.5, P.r.GRASS_LT, { hi: 0.25, lo: 0.3 });
    else ball(c, fx - 1.8, y, 1.9, 2 + hash(i, 22) * 2, P.earth, { hi: 0.3, lo: 0.3 });
  }
  // clumps of the realm's ground
  for (let y = -6, i = 0; y < H + 6; y += 9 + hash(i, 30) * 10, i++) {
    const fx = footAt(y, gy, towers);
    if (!clear(y) || isWet(fx - 3, y) || hash(i, 31) < 0.18) continue;
    const out2 = hash(i, 32) > 0.72;
    if (P.kind === "snow" && hash(i, 35) < 0.4) continue;
    footClump(c, P, fx - (out2 ? 6 + hash(i, 33) * 3 : 1.5 + hash(i, 33) * 1.5), y, (0.85 + hash(i, 34) * 0.35) * (P.kind === "snow" ? 0.75 : 1), i * 7 + 3);
  }
  // fallen stones, more of them the harder the siege has gone
  const n = 7 + tier * 6;
  for (let i = 0; i < n; i++) {
    const y = 10 + hash(i, 40) * (H - 20);
    const fx = footAt(y, gy, towers);
    if (!clear(y) || isWet(fx - 3, y)) continue;
    const x = fx - 2.5 - hash(i, 41) * 5, w = 2.5 + hash(i, 42) * 2, h = 1.5 + hash(i, 43) * 1.5;
    shadow(c, x + w / 2 + 0.8, y + h + 0.3, w * 0.6, 0.9, 0.25);
    box(c, x, y, w, h + 0.5, darken(CASTLE_STONE, 0.5));
    box(c, x + 0.5, y + 0.5, w - 1, h * 0.5, lighten(CASTLE_STONE, 0.2));
    box(c, x + 0.5, y + 0.5 + h * 0.5, w - 1, h * 0.5 - 0.5, darken(CASTLE_STONE, 0.22));
    if (P.kind === "snow") box(c, x + 0.5, y + 0.5, w - 1, 0.5, "#f4f8fa");
  }
  // a clump or two either side of the threshold, where the flare meets the grass
  for (const side of [-1, 1]) for (let k = 0; k < 2; k++) {
    const y = gy + side * (GH + 2 + k * 4), x = GATE.face0 - 4 - k * 7;
    if (!isWet(x, y)) footClump(c, P, x, y, 0.9, 50 + k + side * 3);
  }
  // braziers on the kerb corners where the realm is dark enough to want them
  if ((REALM.light?.amount ?? 0) >= 0.15) {
    for (const side of [-1, 1]) {
      const bx = GATE.face0 - 7, by = gy + side * (GH + 5);
      if (isWet(bx, by)) continue;
      shadow(c, bx + 1.5, by + 0.6, 4, 1.4, 0.3);
      c.fillStyle = "#2e2a30";
      c.fillRect(bx - 2.5, by - 5, 1, 5); c.fillRect(bx + 1.5, by - 5, 1, 5); c.fillRect(bx - 0.5, by - 4, 1, 4.5);
      cylinder(c, bx - 3.5, by - 7.5, 7, 3, "#4a4450", { r: 1.2, hi: 0.35, lo: 0.5 });
      box(c, bx - 3, by - 7.5, 6, 1, "#5a2a1a");
      out.braziers.push([bx, by - 7.5]);
    }
  }
};

const GROUND = { key: "", under: null, short: null, over: null, x0: 0, y0: -14, w: 0, h: 0, braziers: [], fresh: false };
const groundBakes = (gx, gy, tier) => {
  const key = `${gx}|${gy}|${W}|${H}|${REALM.id}|${PX}`;
  if (typeof document === "undefined") return GROUND.under ? GROUND : null;
  const x0 = PAVE_X - 6, y0 = -14, w = 764 - x0, h = H + 28;
  const layer = (fn) => bakeSprite(w, h, (c) => { c.translate(-x0, -y0); fn(c); }, false);
  if (GROUND.key !== key) {
    // the ground itself doesn't change as the siege goes on: baked once a board
    Object.assign(GROUND, {
      key, x0, y0, w, h, tier: -1,
      under: layer((c) => paintGroundUnder(c, gy, true)),
      // without the hook in draw.js the ground is laid after the horde has
      // been drawn, so then it keeps off the road where they walk
      short: layer((c) => paintGroundUnder(c, gy, false)),
    });
  }
  if (GROUND.tier !== tier) {
    const out = { braziers: [] };
    GROUND.over = layer((c) => paintGroundOver(c, gx, gy, tier, out));
    GROUND.braziers = out.braziers; GROUND.tier = tier;
  }
  return GROUND;
};
const tierOf = (hpPct) => (hpPct < 0.25 ? 3 : hpPct < 0.5 ? 2 : hpPct < 0.75 ? 1 : 0);

// The ground at the castle's foot. draw.js should call this right after the
// ground and road, before anything that walks; until it does, drawCastle
// lays a version of it that stays clear of the road.
export const drawCastleGround = (ctx, time, hpPct) => {
  if (!PTS.length) return;
  const [gx, gy] = PTS[PTS.length - 1];
  const G = groundBakes(gx, gy, tierOf(hpPct));
  if (!G) return;
  ctx.drawImage(G.under, G.x0, G.y0, G.w, G.h);
  G.fresh = true;
};

// ---- live bits ----------------------------------------------------------

// A pennant on a pole, flying toward the field: columns of cloth, each a
// beat behind the one before, so the wave runs down it.
const pennant = (ctx, x, y, time, k, col, big = false) => {
  const P = big ? 24 : 15, L = big ? 16 : 10, F = big ? 8 : 5;
  box(ctx, x - 1, y - P, 2, P, INK_LINE);
  box(ctx, x - 0.5, y - P + 0.5, 1, P - 1, "#8a6a44");
  const rows = [];
  for (let i = 0; i < L; i++) {
    const w = Math.round(Math.sin(time * 6 - i * 0.8 + k) * (0.5 + i * 0.12) * 2) / 2;
    const h = Math.max(1, S2(F * (1 - (i / L) * 0.8) + 0.5));
    rows.push([x - 1 - i, y - P + 0.5 + (F - h) / 2 + w, h]);
  }
  ctx.fillStyle = INK_LINE;
  for (const [cx, cy, h] of rows) ctx.fillRect(S2(cx) - 0.5, S2(cy) - 0.5, 1.5, h + 1);
  for (const [cx, cy, h] of rows) {
    ctx.fillStyle = col; ctx.fillRect(S2(cx), S2(cy), 1, h);
    ctx.fillStyle = lighten(col, 0.35); ctx.fillRect(S2(cx), S2(cy), 1, 0.5);
    // the royal standard carries a gold stripe down its middle
    if (big && h > 3) { ctx.fillStyle = GOLD; ctx.fillRect(S2(cx), S2(cy + h / 2 - 0.5), 1, 1); }
  }
};

// A hanging banner stirring in the breeze: painted once, then sliced row by
// row into a few frames, each row pushed aside a pixel or so, the push
// growing toward the hem and running down the cloth.
const BANNERS = new Map();
const BANNER_FRAMES = 6;
const bannerFrames = (w, len, tier, seed) => {
  const key = `${w}|${len}|${tier}|${seed}|${REALM.id}|${PX}`;
  let fr = BANNERS.get(key);
  if (fr || typeof document === "undefined") return fr;
  const pad = 3, bw = w + pad * 2, bh = len + pad * 2;
  const base = bakeSprite(bw, bh, (c) => banner(c, pad, pad, w, len, tier, seed));
  fr = [];
  const top = Math.round((pad + 1) * PX), rows = base.height - top;
  for (let f = 0; f < BANNER_FRAMES; f++) {
    const cv = document.createElement("canvas");
    cv.width = base.width; cv.height = base.height;
    const k = cv.getContext("2d");
    k.drawImage(base, 0, 0, base.width, top, 0, 0, base.width, top);
    for (let j = top; j < base.height; j++) {
      const u = (j - top) / rows;
      const dx = Math.round(Math.sin((f / BANNER_FRAMES) * Math.PI * 2 - u * 3.2) * u * 1.6 * (PX / 2));
      k.drawImage(base, 0, j, base.width, 1, dx, j, base.width, 1);
    }
    fr.push(cv);
  }
  fr.pad = pad; fr.w = bw; fr.h = bh;
  BANNERS.set(key, fr);
  return fr;
};

// A pixel flame: a tapering stack of rows, red at the rim, yellow at the
// heart, its tip licking side to side on the frame.
const flame = (ctx, x, y, h, w, time, k) => {
  const f = Math.floor(time * 10 + k * 5) % 3;
  const hh = h * [1, 1.18, 0.88][f];
  for (let r = 0; r < hh; r += 1) {
    const u = r / hh, ww = Math.max(1, S2(w * Math.pow(1 - u, 0.8)));
    const sx = S2(x + Math.sin(f * 2.1 + r * 0.9 + k) * u * 1.2 - ww / 2);
    ctx.fillStyle = u > 0.72 ? "#f0903a" : "#d8582a";
    ctx.fillRect(sx, S2(y - r - 1), ww, 1);
    if (ww > 1.5 && u < 0.7) { ctx.fillStyle = u < 0.35 ? "#ffe08a" : "#f8b048"; ctx.fillRect(sx + 0.5, S2(y - r - 1), ww - 1, 1); }
  }
};
// A torch on the gatehouse, and its light on the stone.
const torch = (ctx, x, y, time, k, dark) => {
  const flick = 1 + Math.sin(time * 7.3 + k * 2) * 0.08 + Math.sin(time * 13.1 + k) * 0.05;
  glow(ctx, x, y - 2, (dark ? 13 : 7) * flick, "#ffb050", dark ? 0.42 : 0.3);
  flame(ctx, x, y + 0.5, 5, 3, time, k);
};

export const drawCastle = (ctx, time, hpPct) => {
  const [gx, gy] = PTS[PTS.length - 1];
  const tier = tierOf(hpPct);
  const dire = tier >= 3, bad = tier >= 2;
  const G = groundBakes(gx, gy, tier);
  if (G && !G.fresh) ctx.drawImage(G.short, G.x0, G.y0, G.w, G.h);
  if (G) G.fresh = false;
  // the road darkening as it runs in under the arch
  ctx.fillStyle = lin(ctx, gx - 24, 0, GATE.face0 + 4, 0, [[0, "rgba(16,12,16,0)"], [1, "rgba(16,12,16,0.42)"]]);
  ctx.fillRect(gx - 24, gy - PATH_HALF + 3, GATE.face0 + 4 - (gx - 24), PATH_HALF * 2 - 6);
  // the stone
  const key = `${gx}|${gy}|${tier}|${W}|${H}|${REALM.id}`;
  if (CASTLE.key !== key && typeof document !== "undefined") {
    const x0 = 724, y0 = -14, w = W + 10 - x0, h = H + 28;
    let info = null;
    const cv = bakeSprite(w, h, (c) => { c.translate(-x0, -y0); info = paintCastleStone(c, gx, gy, tier); });
    CASTLE = { key, cv, x0, y0, w, h, ...info };
  }
  if (CASTLE.cv) ctx.drawImage(CASTLE.cv, CASTLE.x0, CASTLE.y0, CASTLE.w, CASTLE.h);
  else return;
  if (G) ctx.drawImage(G.over, G.x0, G.y0, G.w, G.h);
  const dark = (REALM.light?.amount ?? 0) >= 0.15;
  // the banners on the gatehouse, stirring
  CASTLE.banners.forEach(([x, y, w, len, seed]) => {
    const fr = bannerFrames(w, len, tier, seed);
    if (fr) ctx.drawImage(fr[Math.floor(time * 5 + seed * 1.7) % BANNER_FRAMES], x - fr.pad, y - fr.pad, fr.w, fr.h);
  });
  // torchlight in the slits, and the gate's torches and braziers
  if (!dire) for (const [cx, cy] of CASTLE.slits) if (Math.sin(time * 1.9 + cx * 0.3 + cy * 0.7) > -0.5) glow(ctx, cx, cy, dark ? 5 : 3.5, "#ffd070", 0.7);
  CASTLE.torches.forEach(([x, y], i) => torch(ctx, x, y, time, i, dark));
  if (G) G.braziers.forEach(([x, y], i) => {
    const flick = 1 + Math.sin(time * 6.1 + i * 3) * 0.1 + Math.sin(time * 11.7 + i) * 0.06;
    glow(ctx, x, y + 3, 22 * flick, "#ff9848", 0.2);
    glow(ctx, x, y - 2, 8 * flick, "#ffc070", 0.4);
    flame(ctx, x, y + 0.5, 6, 5, time, i * 2.3 + 1);
  });
  // pennants on the towers still standing: gold on the wall, the crown's blue at the gate
  CASTLE.flags.forEach(([x, y, gate], i) => pennant(ctx, x, y - 1.5, time, i * 1.7, gate ? BANNER : GOLD, gate === 2));
  // a thread of smoke from the guardroom fire while all is well
  if (!bad && CASTLE.smoke) {
    const [sx, sy] = CASTLE.smoke;
    for (let i = 0; i < 3; i++) {
      const pr = (time * 0.32 + i / 3) % 1;
      const a = (1 - pr) * Math.min(1, pr * 6) * 0.55;
      const r = 1.8 + pr * 4.5;
      soft(ctx, sx - pr * 10 + Math.sin(time * 1.3 + i * 2) * 1.2, sy - 1 - pr * 22, r, r * 0.85, [[0, `rgba(214,210,210,${a})`], [0.55, `rgba(150,144,152,${a * 0.8})`], [1, "rgba(150,144,152,0)"]], -0.4, -0.45);
    }
  }
  // smoke from the hurt towers, and fire where the roofs are gone
  if (bad) {
    // billows of smoke, lit on their sunward side, leaning off toward the field
    for (const [bx, by] of CASTLE.burn) for (let i = 3; i >= 0; i--) {
      const prog = ((time * 14 + i * 10.5 + bx) % 42) / 42;
      const smx = bx + Math.sin(time * 2 + i * 3) * 2 - prog * 12;
      const a = Math.min(1, (1 - prog) * 1.6) * (dire ? 0.85 : 0.6);
      const r = 3.5 + prog * 8;
      soft(ctx, smx, by - 5 - prog * 40, r, r * 0.85, [[0, `rgba(158,150,150,${a})`], [0.5, `rgba(96,88,92,${a})`], [0.95, `rgba(96,88,92,${a * 0.45})`], [1, "rgba(96,88,92,0)"]], -0.4, -0.45);
    }
  }
  if (dire) {
    for (const [bx, by] of CASTLE.burn) {
      glow(ctx, bx, by, 14, "#ff9040", 0.35);
      for (let i = 0; i < 3; i++) flame(ctx, bx - 5 + i * 5, by + 4, 7 + (i % 2) * 4, 4, time, i * 1.3 + bx);
    }
  }
};

// ---- life on the wall between fights ------------------------------------
// A sentry pacing the walk between two towers, birds on the battlements
// that take off when the horde comes near. All of it a stamp or a handful
// of pixels a frame.
const SENTRY = { ...WALL_FOLK.guard, coat: "#3a5474", trim: "#d8b34a" };
const BIRDS = { calm: true, since: -99, flushed: -99, last: 0 };

// the stretch of walk the sentry keeps: clear of every tower and of every
// crew the works have put on the wall
const sentryBeat = (gy, taken) => {
  const towers = towersOf(gy).map(([f]) => f).sort((a, b) => a - b);
  const blocks = [[-99, 22], [H - 8, H + 99], [gy - GH - HS - 6, gy + GH + 2], ...towers.map((f) => [f - TOWER.n - TOWER.h - 5, f + TOWER.s + 8]), ...taken.map((s) => [s - 34, s + 34])];
  blocks.sort((a, b) => a[0] - b[0]);
  let best = null, at = -99;
  for (const [a, b] of blocks) {
    if (a - at >= 34) {
      const gap = [at, a], mid = (at + a) / 2, score = (a - at) - Math.abs(mid - gy) * 0.35;
      if (!best || score > best.score) best = { gap, score };
    }
    at = Math.max(at, b);
  }
  return best && best.gap;
};

// a small bird: perched (pecking now and then), or on the wing
const BIRD_INK = "#241a26";
const bird = (ctx, x, y, dir, pose, col) => {
  const dk = darken(col, 0.3), lt = lighten(col, 0.25);
  const px = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(S2(dir > 0 ? x + dx : x - dx - w), S2(y + dy), w, h); };
  const parts = pose >= 2
    ? [[-1.5, -1, 3, 1, col], [1.5, -1.5, 1, 1, col], [2.5, -1, 0.5, 0.5, "#d8a040"],
      ...(pose === 2 ? [[-0.5, -3, 1, 2, dk], [0.5, -2.5, 1, 1.5, dk]] : [[-0.5, 0, 1, 1.5, dk], [0.5, 0, 1, 1, dk]])]
    : [[-1.5, -2.5, 3, 1.5, col], [-1, -1.5, 2, 0.5, lt], [-2.5, -2.5, 1, 0.5, dk], [-1, -2.5, 1.5, 0.5, dk],
      ...(pose === 1 ? [[1.5, -2, 1.5, 1.5, col], [3, -1, 0.5, 0.5, "#d8a040"]] : [[1, -3.5, 1.5, 1.5, col], [2.5, -3, 0.5, 0.5, "#d8a040"]]),
      [0, -1, 0.5, 1, "#3a3440"]];
  for (const [dx, dy, w, h] of parts) px(dx - 0.5, dy - 0.5, w + 1, h + 1, BIRD_INK);
  for (const [dx, dy, w, h, c] of parts) px(dx, dy, w, h, c);
};
const drawIdleLife = (ctx, g, gy, taken) => {
  const time = g.time;
  const tier = tierOf(Math.min(1, Math.max(0, g.lives ?? 20) / 20));
  const near = (g.enemies || []).some((e) => !e.dead && e.x > 560);
  // the sentry: paces his stretch, stops at each end to look out over the
  // field, and stands to face it while the horde is near
  const beat = sentryBeat(gy, taken);
  if (beat) {
    const cvs = [-1, 1].map((d) => workFrame(`sentry|${d}`, 28, 42, (c) => drawHalberdier(c, 16, 40, d, SENTRY)));
    const a = beat[0] + 2, b = beat[1] - 2;
    const L = Math.max(0, b - a), v = 6.5, pause = 2.6, leg = L / v, T = 2 * (leg + pause);
    let y = a, dir = -1, moving = false;
    if (!near && L > 4) {
      const t = (time + 5.3) % T;
      if (t < pause) y = a;
      else if (t < pause + leg) { y = a + (t - pause) * v; moving = true; }
      else if (t < 2 * pause + leg) y = b;
      else { y = b - (t - 2 * pause - leg) * v; dir = 1; moving = true; }
    } else y = (a + b) / 2;
    const bob = moving && Math.floor(time * 5) % 2 ? -0.5 : 0;
    const cv = cvs[dir > 0 ? 1 : 0];
    if (cv) ctx.drawImage(cv, 778 - 16, S2(y) - 40 + bob, 28, 42);
  }
  // the birds on the battlements
  const perches = CASTLE.perches || [];
  if (time < BIRDS.last - 1) Object.assign(BIRDS, { calm: !near, since: -99, flushed: -99 });
  BIRDS.last = time;
  const calm = !near && tier < 2;
  if (calm !== BIRDS.calm) { BIRDS.calm = calm; if (calm) BIRDS.since = time; else BIRDS.flushed = time; }
  if (perches.length < 4) return;
  const kind = groundKind();
  const col = kind === "marsh" || kind === "ash" ? "#34303c" : "#5a5664";
  const nB = 3;
  const perchOf = (i, cyc) => perches[Math.floor(hash(i * 17 + 3, cyc) * perches.length)];
  for (let i = 0; i < nB; i++) {
    const P = 11 + i * 4.3, off = i * 5.1, F = 1.4;
    const cyc = Math.floor((time + off) / P), t = (time + off) % P;
    const from = perchOf(i, cyc), to = perchOf(i, cyc + 1);
    const fx = (i - 1) * 1.5;
    const away = (p) => [p[0] + 70, p[1] - 60];
    const fly = (p0, p1, u) => {
      const x = p0[0] + (p1[0] - p0[0]) * u, y = p0[1] + (p1[1] - p0[1]) * u - Math.sin(Math.PI * u) * 12;
      bird(ctx, x + fx, y, p1[0] >= p0[0] ? 1 : -1, 2 + (Math.floor(time * 12 + i) % 2), col);
    };
    if (!BIRDS.calm) {
      const te = time - BIRDS.flushed;
      if (te < 2) fly(perchOf(i, Math.floor((BIRDS.flushed + off) / P)), away(from), te / 2);
      continue;
    }
    const back = time - BIRDS.since - (2 + i * 1.8);
    if (back < 0) continue;
    if (back < F) { fly(away(from), from, back / F); continue; }
    if (t > P - F && from !== to) { fly(from, to, (t - (P - F)) / F); continue; }
    const face = hash(i, cyc * 3 + Math.floor(t / 3.1)) > 0.5 ? 1 : -1;
    const peck = Math.floor(t * 1.4 + i) % 6 === 0;
    bird(ctx, from[0] + fx, from[1], face, peck ? 1 : 0, col);
  }
};

// ---- the castle works ---------------------------------------------------
// What the crown has paid for stands on the wall in plain sight: bowmen on
// the walk each side of the gate, ballistae on the gate towers' platforms,
// halberdiers at the portcullis and masons at their scaffold. Figures are
// baked once per pose and stamped; the ballista's recoil and the bowmen's
// draw follow the works' own cooldowns.
const WORKS = new Map();
const workFrame = (key, w, h, fn) => {
  let cv = WORKS.get(key);
  if (!cv && typeof document !== "undefined") { cv = bakeSprite(w, h, fn); WORKS.set(key, cv); }
  return cv;
};
export const drawCastleWorks = (ctx, g) => {
  const works = g.castle;
  if (!PTS.length) return;
  const [gx, gy] = PTS[PTS.length - 1];
  const time = g.time;
  const cd = g.castleCd || {};
  // where the works' crews stand, so the sentry keeps out of their way
  const guild = works && workTier(works, "masons");
  const bows = works && workTier(works, "archers");
  const taken = new Set(bows ? bowmenSpots(gy, bows.count) : []);
  const masonAt = [];
  if (guild) {
    // the far ends of the walk, unless the bowmen stand there already — then
    // they're at work in front of the towers farthest from the gate
    const want = guild.mend > 1 ? 2 : 1;
    masonAt.push(...masonSpots(gy, 99).filter((y) => !taken.has(y)).slice(0, want));
    const drums = wallDrums(gy).sort((a, b) => Math.abs(b - gy) - Math.abs(a - gy));
    for (const y of drums) if (masonAt.length < want) masonAt.push(y + 12);
  }
  drawIdleLife(ctx, g, gy, [...taken, ...masonAt]);
  if (!works) return;
  // the masons first: farthest from the gate, and nothing stands in front of them
  for (let k = 0; k < masonAt.length; k++) {
    const y = masonAt[k] + 6;
    cylinder(ctx, W - 40, y - 2, 20, 3, "#8a6a40", { r: 1, hi: 0.3, lo: 0.5 });
    cylinder(ctx, W - 36, y - 10, 7, 6, "#6e6a60", { r: 1.5, hi: 0.3, lo: 0.5 });
    ctx.fillStyle = "#d8d0c0"; ctx.fillRect(W - 35, y - 10, 5, 1.2);
    const fr = Math.floor(((time * 2 + k) % 2));
    const cv = workFrame(`mason|${fr}`, 30, 36, (c) => drawMason(c, 12, 33, 1, WALL_FOLK.mason, fr));
    if (cv) ctx.drawImage(cv, W - 24 - 12, y - 33 - 2, 30, 36);
  }
  if (bows) {
    const big = !!bows.pierce;
    const spots = bowmenSpots(gy, bows.count);
    for (let i = 0; i < spots.length; i++) {
      const y = spots[i] + 8;
      // each bowman draws on his own beat; the one who just loosed is slack
      const phase = ((time * 1000 / bows.rate) + i / bows.count) % 1;
      const fr = Math.round(Math.min(1, phase * 1.6) * 3);
      const cv = workFrame(`bow|${big ? 1 : 0}|${fr}`, 30, 36, (c) => drawArcher(c, 17, 33, -1, WALL_FOLK.bowman, fr / 3, { big, bowCol: big ? "#3a3a44" : undefined }));
      // shoulder to shoulder they'd hide each other: every other man stands a step back
      if (cv) ctx.drawImage(cv, W - 20 - 17 + (Math.round(spots[i] / 24) % 2 ? 4 : -1), y - 33, 30, 36);
    }
  }
  const bal = workTier(works, "ballista");
  if (bal) {
    // on the gate towers' open platforms, the north one first
    const spots = ballistaSpots(gy, bal.twin);
    for (let k = 0; k < spots.length; k++) {
      const [x, y] = spots[k];
      const left = cd.ballista ?? 0;
      const recoil = Math.max(0, 1 - (bal.rate - left) / 400);
      const fr = Math.round(recoil * 2);
      const cv = workFrame(`bal|${fr}`, 44, 48, (c) => ballista(c, 22, 44, -1, fr / 2));
      if (cv) ctx.drawImage(cv, x - 22, y - 44, 44, 48);
      if (bal.burn) glow(ctx, x - 10, y - 24, 3.5, "#ffa040", 0.5 + 0.3 * Math.sin(time * 9 + k));
    }
  }
  const guard = workTier(works, "guards");
  if (guard) {
    // they stand on the gatehouse top either side of the passage, facing the
    // road, now and then shifting their weight
    const cv = workFrame(`guard`, 28, 42, (c) => drawHalberdier(c, 16, 40, -1, WALL_FOLK.guard));
    [gy - 34, gy + 22].forEach((y, i) => {
      const shift = Math.sin(time * 0.7 + i * 2.6) > 0.55 ? 0.5 : 0;
      if (cv) ctx.drawImage(cv, GATE.face1 + 9 - 16 + shift, y - 40, 28, 42);
    });
    if (guard.oil) {
      // the cauldron on the gatehouse rim over the passage, and its steam
      const cx = GATE.face1 + 6, cy = gy - 8;
      cylinder(ctx, cx - 5, cy - 4, 10, 8, "#3a3a44", { r: 2, hi: 0.35, lo: 0.5 });
      ctx.fillStyle = "#c86a2a"; ctx.fillRect(cx - 3, cy - 3, 6, 1.5);
      for (let i = 0; i < 2; i++) {
        const pr = ((time * 0.6 + i * 0.5) % 1);
        soft(ctx, cx + Math.sin(time * 3 + i) * 2, cy - 7 - pr * 10, 2.5 + pr * 3, 2 + pr * 2, [[0, `rgba(230,225,215,${(1 - pr) * 0.4})`], [1, "rgba(230,225,215,0)"]]);
      }
    }
  }
};
export const resetWorksBakes = () => WORKS.clear();

export const resetCastleBakes = () => { CASTLE.key = ""; GROUND.key = ""; GROUND.tier = -1; WORKS.clear(); BANNERS.clear(); };
