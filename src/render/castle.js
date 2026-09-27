// ============ RENDER: THE CASTLE ============
// The crown's curtain wall down the right edge of every board, the ground it
// stands in, the life on it between fights, and the crews the castle works
// put on it. Split out of scenery.js so the castle can be worked on by itself.

import { W, H, PATH_HALF } from "../data/constants.js";
import { PTS } from "../engine/path.js";
import { workTier, bowmenSpots, masonSpots, wallDrums, BOW_X, GATE_TOWER_N, GATE_TOWER_S, TOWER, ballistaSpots } from "../data/castle.js";
import { drawArcher, drawHalberdier, drawMason, WALL_FOLK } from "./folk.js";
import { ballista } from "./halls/archer.js";
import { REALM } from "../data/maps.js";
import * as TERRAIN from "../data/terrain.js";
import { groundKind } from "./groundblend.js";
import {
  lighten, darken, mix, rgba, soft, shadow, ball, glow, cylinder,
  blade, tuft, hash, lin, bakeSprite, PX, PIXEL, INK_LINE, inkOutline, STYLE } from "./paint.js";

const CASTLE_STONE = "#aca494";          // warm grey dressed stone, as on the title screen
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
const WALL = { face0: 749, face1: 757, par1: 766, walk1: 796, inner: 802 };
// the crews on the walk are placed from here (the board's right edge, before
// the castle's band was widened)
const CREW = 800;
// the bailey: the castle's inner yard, behind the wall, out to the board's edge
const BAILEY = { x0: WALL.inner, x1: W };
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
  if (kind === "snow") { rimeUp(k, x0, y0, y1, seed); return; }
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
// rime on the damp foot in the snow realms: small ragged patches, thickest
// at the foot and thinning up the face, in three stepped tones — pale
// blue-white, lit cream along their upper-left edges, blue shade along
// their lower-right — never a hard white box
const rimeUp = (k, x0, y0, y1, seed) => {
  const base = REALM.GRASS_LT || "#e2ecf2";
  const body = mix(base, "#9aaab8", 0.4), lit = mix(base, "#fff3d2", 0.45), shd = mix(base, "#6e82a0", 0.6);
  const X0 = Math.round(x0 * 2), Y0 = Math.floor(y0 * 2), Y1 = Math.ceil(y1 * 2);
  // (how far up the face the rime climbs at this row: long low drifts with a few tongues)
  const reach = (j) => 1 + vnoise(0, j, 22, seed + 71) * 5 + (vnoise(0, j, 6, seed + 72) > 0.62 ? 3 : 0);
  const on = (i, j) => i >= 0 && i < reach(j) && vnoise(i, j, 2.6, seed + 73) + (hash(i + seed, j) - 0.5) * 0.12 > 0.3 + (i / reach(j)) * 0.45;
  for (let j = Y0; j < Y1; j++) for (let i = 0; i < 10; i++) {
    if (!on(i, j)) continue;
    const col = !on(i - 1, j) && i > 0 || !on(i, j - 1) ? lit : !on(i + 1, j) || !on(i, j + 1) ? shd : body;
    box(k, (X0 + i) / 2, j / 2, 0.5, 0.5, col);
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
  // the low inner parapet, the bailey below it
  const x2 = L.inner;
  piece(c, [x1 - 1, y0 - 1, x2 + 1, y1 + 1], (k) => {
    box(k, x1, y0, x2 - x1, y1 - y0, darken(S1, 0.5));
    let i = 0;
    for (let y = y0 - hash(seed, 9) * 8; y < y1; y += 8, i++) {
      const v = (hash(seed + 6, i) - 0.5) * 0.1;
      box(k, x1 + 0.5, Math.max(y0, y) + 0.5, 2, 7.5, tone(S1, -0.14 + v));
      box(k, x1 + 3, Math.max(y0, y) + 0.5, x2 - x1 - 3, 7.5, tone(S1, 0.3 + v));
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
const slit = (c, sx, sy, lit = false) => {
  box(c, sx - 1.5, sy - 3.5, 3, 7, darken(CASTLE_STONE, 0.2));
  box(c, sx - 1, sy - 3, 2, 6, "#1e1620");
  if (lit) { box(c, sx - 0.5, sy - 0.5, 1, 3, "#e89a48"); box(c, sx - 0.5, sy + 1.5, 1, 1, "#ffd070"); }
  box(c, sx - 1.5, sy + 3, 3, 1, lighten(CASTLE_STONE, 0.35));
};
// ...and one in a face tipped toward us (the curtain's): its height runs
// along x, so it lies on its side, its sill toward the foot
const slitAcross = (c, x, y, lit = false) => {
  box(c, x - 0.5, y - 1.5, 4.5, 3, darken(CASTLE_STONE, 0.3));
  box(c, x, y - 1, 3.5, 2, "#1e1620");
  if (lit) { box(c, x + 0.5, y - 0.5, 2, 1, "#e89a48"); box(c, x + 0.5, y - 0.5, 1, 1, "#ffd070"); }
  box(c, x - 1, y - 1.5, 0.5, 3, lighten(CASTLE_STONE, 0.3));
};

// A parapet jutting out on corbels, as the title screen's castle has them.
// Along a south face's top edge [xa, xb] at y: the parapet's own outer face,
// the row of corbels under it, and the shadow the overhang throws.
const corbelsS = (c, xa, xb, y) => {
  const S1 = CASTLE_STONE;
  c.fillStyle = "rgba(30,22,32,0.42)"; c.fillRect(S2(xa), S2(y + 4.5), S2(xb - xa), 2);
  piece(c, [xa - 1, y - 1, xb + 1, y + 6], (k) => {
    box(k, xa, y, xb - xa, 2.5, tone(S1, 0.02));
    box(k, xa, y, xb - xa, 0.5, tone(S1, 0.24));
    box(k, xa, y + 2, xb - xa, 0.5, tone(S1, -0.2));
    for (let x = xa + 0.5; x < xb - 1.5; x += 3.2) {
      box(k, x, y + 2.5, 1.8, 1.5, tone(S1, -0.04));
      box(k, x, y + 4, 1.8, 0.5, tone(S1, -0.5));
    }
  });
};
// ...and along a west face's top edge at x, from ya to yb (the lip catches
// the sun; the corbels stand down the face toward its foot)
const corbelsW = (c, x, ya, yb) => {
  const S1 = CASTLE_STONE;
  c.fillStyle = "rgba(30,22,32,0.32)"; c.fillRect(S2(x - 4.5), S2(ya), 1.5, S2(yb - ya));
  piece(c, [x - 4, ya - 1, x + 1, yb + 1], (k) => {
    box(k, x - 1.5, ya, 1.5, yb - ya, tone(S1, 0.14));
    box(k, x - 1.5, ya, 0.5, yb - ya, tone(S1, 0.34));
    for (let y = ya + 1; y < yb - 1.5; y += 3.2) box(k, x - 3, y, 1.5, 1.8, tone(S1, -0.06));
  });
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
  // the parapet juts out over both faces on a row of corbels
  corbelsS(c, x1 - 1.5, E, tS);
  corbelsW(c, x1, tN + 1, tS + 2.5);
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
  piece(c, [x1 - 3, tN - 6, E + 1, tS + 4], (k) => {
    let j = 0;
    // big chunky merlons, as the title's: a sunlit top and a pale front
    const merlon = (x, y, w, d, face) => {
      box(k, x, y - d, w, d, tone(S1, 0.46));
      box(k, x, y - d, w, 0.5, tone(S1, 0.6));
      box(k, x, y, w, face, tone(S1, -0.06));
      box(k, x + w - 1, y, 1, face, tone(S1, -0.24));
    };
    for (let x = x1 + 1.5; x < tx0 - 5; x += 8.5, j++) {
      if (gone(j)) { box(k, x, tN - 0.5, 5.5, 1.5, tone(S1, -0.1)); continue; }
      merlon(x, tN - 0.5, 5.5, 3.5, 2.5);
    }
    for (let y = tN + 7; y < tS - 5; y += 7.5, j++) {
      for (const x of [x1 - 1.5, E - 3.5]) {
        if (x > x1 && y < tb + 3) continue;
        if (gone(j + (x > x1 ? 50 : 0))) continue;
        merlon(x, y, 3.5, 3.5, 2);
      }
    }
    for (let x = x1 - 1; x < E - 4; x += 8.5, j++) {
      if (gone(j)) { box(k, x, tS - 1.5, 5.5, 1.5, tone(S1, -0.1)); continue; }
      merlon(x, tS - 0.5, 5.5, 3.5, 3);
    }
  });
  const slits = [];
  [x1 + 9, x1 + 27].forEach((sx, i) => {
    const sy = tS + h * 0.64, lit = hash(seed + 51, i) > 0.45;
    slit(c, sx, sy, lit);
    if (lit) slits.push([sx, sy]);
  });
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
  const E = 812;                         // it runs back into the bailey, where the keep stands
  const m0 = gy - PATH_HALF + 2, m1 = gy + PATH_HALF - 2, mz = 10;
  plinth(c, x0, yN + 1, m0 - 1, 44);
  plinth(c, x0, m1 + 1, yS, 45);
  westFace(c, x0, x1, yN, yS, tN, tS, 43);
  // the gate arch: a ring of pale dressed stone round the dark of the
  // passage, its crown rounded; the road runs in under it into the dark, the
  // portcullis's iron grid wound half up in the top of the arch
  const half = (m1 - m0) / 2;
  const zAt = (y, ex) => { const u = Math.min(1, Math.abs(y - gy) / (half + ex)); return (mz + ex) * (0.6 + 0.4 * Math.sqrt(1 - u * u)); };
  const archPath = (k, ex) => {
    k.beginPath(); k.moveTo(x0, m0 - ex);
    for (let y = m0 - ex; y <= m1 + ex + 0.01; y += 1) { const z = zAt(y, ex); k.lineTo(x0 + z * lean, y - z); }
    k.lineTo(x0, m1 + ex); k.closePath();
  };
  const zp = mz * 0.45;
  piece(c, [x0 - 1, m0 - mz - 8, x1 + 2, m1 + 4], (k) => {
    archPath(k, 2.5); k.fillStyle = lighten(S1, 0.34); k.fill();
    k.save(); archPath(k, 2.5); k.clip();
    k.fillStyle = darken(S1, 0.08);
    for (let y = m0 - 2.5; y <= m1 + 2.5; y += 4.5) { const z = zAt(y, 2.5); k.fillRect(S2(x0 + z * lean - 3), S2(y - z), 3, 0.5); }
    k.fillStyle = lighten(S1, 0.5); k.fillRect(S2(x0), S2(m0 - 2.5), 0.5, 2.5); k.fillRect(S2(x0), S2(m1), 0.5, 2.5);
    k.restore();
    archPath(k, 0);
    k.fillStyle = lin(k, x0, 0, x0 + mz * lean, 0, [[0, "rgba(22,15,22,0.6)"], [0.5, "rgba(22,15,22,0.86)"], [1, "rgba(16,11,16,0.97)"]]);
    k.fill();
    k.save(); archPath(k, 0); k.clip();
    k.strokeStyle = "#4a4e5a"; k.lineWidth = 0.75;
    for (let y = m0 + 1.5; y < m1; y += 3.5) { const z = zAt(y, 0); k.beginPath(); k.moveTo(x0 + zp * lean, y - zp); k.lineTo(x0 + z * lean, y - z); k.stroke(); }
    for (const zz of [zp, mz * 0.68, mz * 0.9]) { k.beginPath(); k.moveTo(x0 + zz * lean, m0 - zz); k.lineTo(x0 + zz * lean, m1 - zz); k.stroke(); }
    k.restore();
  });
  // the grid's bottom rail and its iron teeth
  const px = x0 + zp * lean;
  box(c, px - 0.5, m0 - zp + 0.5, 1.5, m1 - m0 - 1, "#3e424c");
  for (let y = m0 - zp + 2; y < m1 - zp; y += 3.5) {
    box(c, px - 1.5, y, 1.5, 1.5, "#6a707c");
    box(c, px - 2.5, y + 0.5, 1, 1, "#9aa0ac");
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
  // the backs of the merlons along its north rim
  piece(c, [x1 + 6, tN - 4, E + 1, tN + 4], (k) => {
    box(k, x1 + 7, tN, E - x1 - 7, 1.5, tone(S1, 0.22));
    for (let x = x1 + 12; x < E - 4; x += 10) { box(k, x, tN - 3, 6, 2.5, tone(S1, 0.38)); box(k, x, tN - 0.5, 6, 2, tone(S1, -0.28)); }
  });
  corbelsW(c, x1, tN + 1, tS + 2.5);
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
  corbelsS(c, x1 - 1.5, E, tS);
  slit(c, 771.5, tS + 9.5, true);
  out.slits.push([771.5, tS + 9.5]);
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
  if (tier >= 2) { crackAcross(c, x0 + 0.5, yS - 4, 8, 71); crack(c, 762, tS + 6, 8, 72); }
  keep(c, gy, tier, out);
  return { tN, tS };
};

// The keep: a tall square tower rising out of the gatehouse's east end at
// the board's edge, as the title screen's castle has it behind its gate. Its
// battlemented top juts out on corbels; a stair turret with a red roof in
// one corner, a chimney in another, and the royal standard over it all.
const KEEP = { x0: 804, x1: 810, n: 30, s: 12, h: 40, x2: 836 };
const keep = (c, gy, tier, out) => {
  const S1 = CASTLE_STONE, { x0, x1, h } = KEEP, E = KEEP.x2;
  const yN = gy - KEEP.n, yS = gy + KEEP.s, tN = yN - h, tS = yS - h;
  c.fillStyle = "rgba(30,22,32,0.32)"; c.fillRect(x1 + 2, yS, E - x1, 3.5);
  westFace(c, x0, x1, yN, yS, tN, tS, 91);
  southFace(c, x0, x1, E, tS, yS, 93);
  corbelsS(c, x1 - 1.5, E, tS);
  corbelsW(c, x1, tN + 1, tS + 2.5);
  piece(c, [x1 - 1, tN - 1, E + 1, tS + 1], (k) => {
    box(k, x1, tN, E - x1, tS - tN, tone(S1, 0.22));
    box(k, x1, tN, E - x1, 1, tone(S1, 0.42));
    box(k, x1, tN, 1, tS - tN, tone(S1, 0.36));
    box(k, x1 + 3, tN + 3, E - x1 - 3, tS - tN - 5.5, darken(S1, 0.42));
    for (let y = tN + 3, r = 0; y < tS - 2.5; y += 5, r++) for (let x = x1 + 3 - (r % 2) * 3, i = 0; x < E; x += 7, i++) {
      const a = Math.max(x1 + 3, x);
      box(k, a + 0.5, y + 0.5, x + 7 - a - 0.5, Math.min(5, tS - 2.5 - y) - 0.5, tone(S1, -0.2 + (hash(95 + r, i) - 0.5) * 0.12));
    }
    box(k, x1 + 3, tN + 3, E - x1 - 3, 3, tone(S1, -0.4));
    k.fillStyle = "rgba(34,24,38,0.28)"; k.fillRect(S2(x1 + 3), S2(tN + 5), 2.5, S2(tS - tN - 8));
  });
  // the stair turret in its north-east corner, the chimney by the south rim
  const tx0 = E - 12, tx1 = E - 1, tb = tN + 9;
  piece(c, [tx0 - 1, tN - 1, tx1 + 1, tb + 1], (k) => {
    box(k, tx0, tN + 1, tx1 - tx0, tb - tN - 1, darken(S1, 0.5));
    for (let y = tN + 2, r = 0; y < tb; y += 3, r++) box(k, tx0 + 0.5 + (r % 2) * 2, y, tx1 - tx0 - 1 - (r % 2) * 2, 2.5, tone(S1, -0.28 + (hash(97, r) - 0.5) * 0.1));
    box(k, tx0 + 3.5, tb - 5, 3, 5, "#2a1e26");
  });
  pyramidRoof(c, tx0 - 1.5, tx1 + 1.5, tN + 2.5, 6, 9, tier >= 3, 98);
  const chx = E - 6, chy = tS - 5;
  c.fillStyle = "rgba(30,22,32,0.3)"; c.fillRect(chx - 1, chy, 7, 2);
  piece(c, [chx - 4, chy - 10, chx + 4, chy + 1], (k) => {
    box(k, chx - 2.5, chy - 6, 5, 6, darken(S1, 0.45));
    box(k, chx - 2.5, chy - 6, 1.5, 6, tone(S1, -0.12));
    box(k, chx - 1, chy - 6, 3.5, 6, tone(S1, -0.36));
    box(k, chx - 3, chy - 8.5, 6, 2.5, tone(S1, 0.36));
    box(k, chx - 1.5, chy - 8.5, 3, 1, "#1e1620");
  });
  out.smoke = [chx, chy - 9];
  // the royal standard's pole, stepped in a socket by the west rim
  const sx = x1 + 6, sy = tS - 7;
  box(c, sx - 1.5, sy - 0.5, 3, 2, darken(S1, 0.5));
  out.flags.push([sx, sy, 2]);
  const gone = (j) => tier >= 2 && hash(99, j) < (tier >= 3 ? 0.36 : 0.18);
  piece(c, [x1 - 3, tN - 6, E + 1, tS + 4], (k) => {
    const merlon = (x, y, w, d, face) => {
      box(k, x, y - d, w, d, tone(S1, 0.46));
      box(k, x, y - d, w, 0.5, tone(S1, 0.6));
      box(k, x, y, w, face, tone(S1, -0.06));
      box(k, x + w - 1, y, 1, face, tone(S1, -0.24));
    };
    let j = 0;
    for (let x = x1 + 1.5; x < tx0 - 5; x += 8.5, j++) if (!gone(j)) merlon(x, tN - 0.5, 5.5, 3.5, 2.5);
    for (let y = tN + 7; y < tS - 5; y += 7.5, j++) if (!gone(j)) merlon(x1 - 1.5, y, 3.5, 3.5, 2);
    for (let x = x1 - 1; x < E - 4; x += 8.5, j++) if (!gone(j)) merlon(x, tS - 0.5, 5.5, 3.5, 3);
  });
  [x1 + 6, x1 + 15].forEach((x, i) => { slit(c, x, tS + 14 + i * 4, i === 0); if (i === 0) out.slits.push([x, tS + 14]); });
  if (tier >= 2) soot(c, (x1 + E) / 2, tS + 6, (E - x1) / 2, h * (tier >= 3 ? 0.7 : 0.4), 96);
  // it stands on the bailey: lay a patch of yard shadow east of the gatehouse
  c.fillStyle = "rgba(30,22,32,0.3)"; c.fillRect(E, tS + 4, 3, yS - tS);
};

// ---- the bailey -----------------------------------------------------------
// Behind the wall, out to the board's edge: the castle's inner yard, laid in
// big worn flags in the shade of the wall, the realm's own ground coming up
// between them, and here and there a red-roofed house built against the wall.
const bailey = (c, gy, tier) => {
  const P = groundPal(), S1 = CASTLE_STONE, { x0 } = BAILEY, x1 = W + 2;
  const yard = mix(mix(darken(S1, 0.12), P.r.PATH_DK, 0.25), P.r.GRASS, 0.3), turf = darken(P.r.GRASS, 0.06);
  const lane = x0 + 13;
  piece(c, [x0 - 1, -15, x1 + 1, H + 15], (k) => {
    // the realm's own ground, and a lane of worn flags along the foot of the wall
    box(k, x0, -14, x1 - x0, H + 28, turf);
    for (let i = 0; i < 90; i++) {
      const x = lane + hash(i, 315) * (x1 - lane), y = hash(i, 316) * H;
      box(k, x, y, 2 + hash(i, 317) * 5, 1, tone(turf, (hash(i, 318) - 0.5) * 0.14));
    }
    for (let y = -14, row = 0; y < H + 14; row++) {
      const rh = 5 + Math.floor(hash(301, row) * 3) * 1.5;
      for (let x = x0 - hash(302, row) * 6, i = 0; x < lane + 6; i++) {
        const len = 5 + Math.floor(hash(303 + row, i) * 3) * 1.5, a = Math.max(x0, x);
        const v = (hash(304 + row, i) - 0.5) * 0.14;
        // the flags run out raggedly into the turf
        if (x + len - a > 1 && (x < lane - 2 || hash(305 + row, i) > 0.45)) {
          box(k, a, y, x + len - a, rh, darken(yard, 0.22));
          box(k, a + 0.5, y + 0.5, x + len - a - 1, rh - 1, tone(yard, v * 0.7));
          box(k, a + 0.5, y + 0.5, x + len - a - 1, 0.5, tone(yard, 0.08 + v * 0.7));
        }
        x += len;
      }
      y += rh;
    }
  });
  // tufts of the realm's ground out in the yard
  for (let i = 0; i < 16; i++) footClump(c, P, lane + 6 + hash(i, 331) * (x1 - lane - 10), 8 + hash(i, 332) * (H - 16), 0.8, 400 + i);
  // the wall's shadow across the yard (the sun is over the field)
  c.fillStyle = "rgba(30,22,32,0.34)"; c.fillRect(x0, -14, 4, H + 28);
  c.fillStyle = "rgba(30,22,32,0.16)"; c.fillRect(x0 + 4, -14, 3, H + 28);
  // houses against the wall, clear of the gate and the keep
  const keepN = gy - KEEP.n - KEEP.h - 8, keepS = gy + GH + 10;
  for (let y = 16 + hash(gy, 320) * 20, i = 0; y < H - 10; i++) {
    const len = 22 + hash(i, 321) * 10;
    if (y + len > keepN && y < keepS) { y = keepS; continue; }
    if (y + len > H + 4) break;
    if (hash(i, 322) > 0.28) house(c, y, y + len, i, P, tier);
    y += len + 12 + hash(i, 323) * 26;
  }
};
// A house built against the wall's inner face: a red tile roof, its ridge
// running down the board, the west slope in the sun, and its south gable in
// plaster and oak with a door and a lit window.
const house = (c, ya, yb, seed, P, tier) => {
  const xa = BAILEY.x0 + 5, xb = W - 4, xm = (xa + xb) / 2, gh = 7, rise = 6;
  c.fillStyle = "rgba(30,22,32,0.3)"; c.fillRect(xa + 2, yb, xb - xa, 3);
  piece(c, [xa - 3, ya - 2, xb + 3, yb + 1], (k) => {
    // the gable wall
    k.beginPath(); k.moveTo(xa, yb); k.lineTo(xb, yb); k.lineTo(xb, yb - gh); k.lineTo(xm, yb - gh - rise); k.lineTo(xa, yb - gh); k.closePath();
    k.fillStyle = "#d8c8a4"; k.fill();
    k.fillStyle = OAK_DK;
    k.fillRect(S2(xa), S2(yb - gh), S2(xb - xa), 0.5); k.fillRect(S2(xa), S2(yb - 1), S2(xb - xa), 1);
    for (const x of [xa, xa + (xb - xa) * 0.33, xa + (xb - xa) * 0.66, xb - 0.8]) k.fillRect(S2(x), S2(yb - gh), 0.8, gh);
    k.fillStyle = "#3a2a22"; k.fillRect(S2(xm - 1.5), S2(yb - 5), 3, 4.5);
    k.fillStyle = "#ffcf70"; k.fillRect(S2(xa + 4), S2(yb - 5), 2, 1.5);
  });
  piece(c, [xa - 3, ya - 3, xb + 3, yb - gh + 1], (k) => {
    const roof = (fill) => { k.beginPath(); k.moveTo(xa - 2, ya - 1); k.lineTo(xb + 2, ya - 1); k.lineTo(xb + 2, yb - gh + 0.5); k.lineTo(xm, yb - gh - rise - 0.5); k.lineTo(xa - 2, yb - gh + 0.5); k.closePath(); k.fillStyle = fill; k.fill(); };
    roof(darken(ROOF, 0.25));
    k.save(); roof(ROOF); k.clip();
    box(k, xa - 2, ya - 1, xm - xa + 2, yb - ya, lighten(ROOF, 0.14));
    box(k, xm, ya - 1, xb - xm + 2, yb - ya, darken(ROOF, 0.22));
    k.fillStyle = rgba(darken(ROOF, 0.5), 0.5);
    for (let x = xa; x < xb; x += 2.5) if (Math.abs(x - xm) > 1.5) k.fillRect(S2(x), S2(ya - 1), 0.5, S2(yb - ya));
    box(k, xm - 1, ya - 1, 2, yb - ya, lighten(ROOF, 0.3));
    if (P.kind === "snow") for (let i = 0; i < 12; i++) box(k, xa + hash(seed, i) * (xb - xa - 4), ya + hash(seed, i + 20) * (yb - ya - gh - 2), 3 + hash(seed, i + 40) * 3, 1, "#eef4f8");
    if (tier >= 3 && seed % 2) { k.fillStyle = "rgba(30,20,24,0.6)"; k.fillRect(S2(xm - 5), S2(ya + 3), 9, 5); }
    k.restore();
  });
};
const OAK_DK = "#5a3e2a";

// every tower's footprint down the wall, gate towers included: [foot, gate]
const towersOf = (gy) => [...wallDrums(gy).map((f) => [f, 0]), [gy + GATE_TOWER_N, -1], [gy + GATE_TOWER_S, 1]];

const paintCastleStone = (ctx, gx, gy, tier) => {
  const out = { slits: [], flags: [], torches: [], burn: [], banners: [], perches: [], smoke: null, cracks: [] };
  const hurt = [];
  const yN = gy - GH, yS = gy + GH;
  const towers = towersOf(gy);
  // the curtain, north of the gate and south of it
  for (const [y0, y1, seed] of [[-14, yN, 11], [yS, H + 14, 29]]) {
    if (y1 <= y0) continue;
    plinth(ctx, WALL.face0, y0, y1, seed + 5);
    outerFace(ctx, WALL.face0, WALL.face1, y0, y1, seed);
    for (let y = y0 + 18 + hash(seed, 60) * 10, i = 0; y < y1 - 8; y += 30 + hash(seed + i, 61) * 14, i++) {
      if (towers.some(([f]) => y > f - TOWER.n - 4 && y < f + TOWER.s + 4) || inRiverAt(WALL.face0 - 1, y)) continue;
      const lit = hash(seed + i, 62) > 0.6;
      slitAcross(ctx, WALL.face0 + 1, y, lit);
      if (lit) out.slits.push([WALL.face0 + 2.5, y]);
    }
    corbelsW(ctx, WALL.face1, y0, y1);
    const shade = parapet(ctx, WALL, y0, y1, tier, seed, hurt);
    walk(ctx, WALL, y0, y1, seed, shade);
    // the merlons no tower stands over are where the birds sit
    for (const y of shade) if (!towers.some(([f]) => y > f - TOWER.n - TOWER.h - 12 && y < f + TOWER.s + 2) && y > 6 && y < H - 10) out.perches.push([WALL.face1 + 5.5, y + 2.5]);
  }
  bailey(ctx, gy, tier);
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
      out.cracks.push(y);                  // (the ground's rubble heaps lie under these)
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
  // (the channel cuts through the footing course, 2.5 proud of the face, so
  // the river's surface runs on unbroken from the field into the dark)
  const f0 = x0 - 2.5;
  const mouth = (k, rx, r2) => {
    k.beginPath(); k.moveTo(f0, cy - r2); k.lineTo(x0 + 1.5, cy - r2);
    k.ellipse(x0 + 1.5, cy, rx, r2, 0, -Math.PI / 2, Math.PI / 2); k.lineTo(f0, cy + r2); k.closePath();
  };
  piece(c, [f0 - 1, cy - ry - 5, x0 + 12, cy + ry + 5], (k) => {
    mouth(k, 7.5, ry + 3.5);
    k.fillStyle = lighten(S1, 0.18); k.fill();
    // inside the mouth the river runs on under the wall: the realm's deep water
    // darkened in the arch's shadow, darkest up under its crown, and a pale
    // line where it laps at the arch's foot (in art pixels, no soft edge)
    const deep = darken((REALM.water || {}).deep || "#3a6a7c", 0.4), deeper = darken(deep, 0.3);
    const lap = mix((REALM.water || {}).shine || "#8cc4d8", "#fff3d2", 0.3), river = darken((REALM.water || {}).deep || "#3a6a7c", 0.12);
    const inM = (x, y) => x >= f0 && Math.abs(y - cy) < ry && (x < x0 + 1.5 || ((x - x0 - 1.5) / 4.5) ** 2 + ((y - cy) / ry) ** 2 < 1);
    for (let y = S2(cy - ry); y < cy + ry; y += 0.5) for (let x = S2(f0); x < x0 + 6; x += 0.5) {
      const mx = x + 0.25, my = y + 0.25;
      if (!inM(mx, my)) continue;
      // (under the arch's ring and up under its crown, deeper in its shadow)
      const under = x >= x0 && (!inM(mx + 1.5, my) || !inM(mx, my - 1) || !inM(mx, my + 1));
      box(k, x, y, 0.5, 0.5, x < x0 ? river : x < x0 + 0.5 ? (hash(Math.round(y * 2), 7) < 0.8 ? lap : deep) : under ? deeper : deep);
    }
    mouth(k, 4.5, ry);
    k.save(); k.clip();
    for (let y = cy - ry + 2.5; y < cy + ry - 1; y += 3.5) box(k, x0, y, 7, 1, "#4a4e5a");
    box(k, x0 + 3, cy - ry, 1, ry * 2, "#3a3e48");
    k.restore();
  });
  // (and no ink across the river where it enters the channel: the water runs
  // on over the footing's and the channel's west edge)
  const river = darken((REALM.water || {}).deep || "#3a6a7c", 0.12);
  for (let y = S2(cy - ry) + 0.5; y < cy + ry - 0.5; y += 0.5) box(c, f0 - 1.5, y, 1.5, 0.5, river);
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
// apron of trodden earth (or trampled snow, black fen mud, grey ash): damp
// and darkest in a drip-line right under the stone with washed-out gravel at
// its edge, the turf stepping down onto it by a little shaded bank. The
// realm's ground creeps back over the footing course in banks and clumps;
// fallen stones lie about. Where the road arrives it widens into a cobbled
// threshold: setts laid in courses across the road, bowed round the gate,
// sunk and scattered where the road's dirt runs up onto them, worn smooth in
// the lanes and grooved by wheels, grass (snow, ash, moss) in the joints
// toward the flare's edges, and a sill of dressed slabs across the arch's
// mouth (worn pale where the feet go, grooved by wheels, pitted and cracked).
// Tone edges break up in little clumps, never in a dither; the joints are
// chosen a sett at a time, so the road's dirt reads as whole stones sinking
// into it rather than as grit.
// It is all painted art pixel by art pixel (two to a world unit) — nothing
// stroked, nothing anti-aliased — and baked per realm, gate and damage tier
// as two layers: the ground itself (under everything that walks), and what
// lies over the wall's foot.
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
// (the bailey's; the ground outside the wall has its own pixel clumps below)
const footClump = (c, P, x, y, s, seed) => {
  const { r, kind } = P;
  if (kind === "snow") {
    // a small lozenge of drifted snow with a blue lee edge and a few stalks through it
    const len = 5 * s, top = lighten(r.GRASS_LT, 0.15), shade = mix(r.GRASS_LT, "#8aa2b8", 0.45);
    for (let j = 0; j < len; j += 0.5) {
      const w = 1.6 * s * Math.sin((Math.PI * j) / len) + 0.3, yy = y - len / 2 + j;
      box(c, x - w, yy, w * 2, 0.5, top);
      box(c, x - w, yy, 0.5, 0.5, shade);
    }
    if (hash(seed, 7) > 0.5) tuft(c, x - 1, y + 1, 0.35 * s, r.TUFT, r.GRASS_LT, seed, { n: 2 });
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

// -- art pixels --
// A buffer of art pixels (2 to a world unit) over the bake's rect, written
// one pixel at a time and laid into the bake in one go.
const PLUM = [42, 28, 44], CREAM = [255, 243, 210];
const RGB = (s) => { const h = mix(s, s, 0); return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const litC = (c, t) => mixC(c, CREAM, t), dkC = (c, t) => mixC(c, PLUM, t);
const toneC = (c, v) => (v >= 0 ? litC(c, v) : dkC(c, -v));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// smooth value noise in world units; `cell` is the size of its features
const vnoise = (x, y, cell, seed) => {
  const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), s = seed * 7919;
  let u = fx - ix, v = fy - iy;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const a = hash(ix + s, iy), b = hash(ix + 1 + s, iy), c = hash(ix + s, iy + 1), d = hash(ix + 1 + s, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
// (one buffer and one canvas, shared by every bake: each is laid before the next begins)
let PIXBUF = null, PIXCV = null;
const pixels = (x0, y0, w, h) => {
  const ax0 = Math.round(x0 * 2), ay0 = Math.round(y0 * 2), PW = Math.round(w * 2), PH = Math.round(h * 2);
  if (!PIXBUF || PIXBUF.length !== PW * PH * 4) PIXBUF = new Uint8ClampedArray(PW * PH * 4); else PIXBUF.fill(0);
  const d = PIXBUF;
  const at = (ax, ay) => { const i = ax - ax0, j = ay - ay0; return i < 0 || j < 0 || i >= PW || j >= PH ? -1 : (j * PW + i) * 4; };
  // over-composite one pixel (a < 1 tints what is already there)
  const put = (ax, ay, c, a = 1) => {
    const o = at(ax, ay);
    if (o < 0) return;
    const A = d[o + 3] / 255;
    if (a >= 1 || A === 0) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = Math.round(Math.min(1, a) * 255); return; }
    const na = a + A * (1 - a), k = a / na;
    d[o] += (c[0] - d[o]) * k; d[o + 1] += (c[1] - d[o + 1]) * k; d[o + 2] += (c[2] - d[o + 2]) * k; d[o + 3] = Math.round(na * 255);
  };
  const lay = (c) => {
    if (typeof document === "undefined") return;
    if (!PIXCV || PIXCV.width !== PW || PIXCV.height !== PH) { PIXCV = document.createElement("canvas"); PIXCV.width = PW; PIXCV.height = PH; }
    PIXCV.getContext("2d").putImageData(new ImageData(d, PW, PH), 0, 0);
    c.save(); c.imageSmoothingEnabled = false; c.drawImage(PIXCV, ax0 / 2, ay0 / 2, PW / 2, PH / 2); c.restore();
  };
  return { put, shade: (ax, ay, t) => put(ax, ay, PLUM, t), lay };
};

// the ground's colours as pixels, per kind of realm
const pixPal = (P) => {
  const r = P.r, k = P.kind, main = r.PATH_MAIN, dk = r.PATH_DK, edge = r.PATH_EDGE || dk;
  const Q = {
    // the road's own dirt, darkest first (as road.js has it)
    road: [mix(dk, edge, 0.3), mix(main, dk, 0.5), main, lighten(main, 0.11)].map(RGB),
    water: r.water || { deep: "#3a6a7c", edge: "#4a8094", shine: "#8cc4d8" },
    pebble: [mix(P.pebble, P.earth, 0.2), darken(mix(P.pebble, P.earth, 0.4), 0.35)].map(RGB),
  };
  // the apron: [damp, body, lit], the turf's bank, the tint of trampled turf
  let body = mix(dk, r.GRASS_DK, 0.25);
  let damp = mix(darken(body, 0.25), edge, 0.3), lit = mix(body, main, 0.35), bank = mix(dk, edge, 0.6), worn = mix(mix(r.GRASS_DK, r.GRASS, 0.5), dk, 0.42);
  Q.wornA = 0.42; Q.thaw = null;
  if (k === "snow") {
    // trampled snow, and bare thawed earth right under the stone
    body = mix(r.GRASS, "#7f94aa", 0.28); damp = mix(body, "#5e7290", 0.3); lit = mix(r.GRASS, "#8196aa", 0.1);
    Q.thaw = [mix("#7a6a5c", edge, 0.3), mix("#5a4a42", edge, 0.3)].map(RGB);
    bank = mix(r.GRASS, "#6a86c6", 0.3); worn = mix(r.GRASS, "#8aa2b8", 0.35); Q.wornA = 0.35;
  } else if (k === "ash") {
    body = P.earth; damp = darken(body, 0.3); lit = lighten(body, 0.1); bank = darken(r.GRASS_DK, 0.25); worn = mix(r.GRASS_DK, edge, 0.4);
  } else if (k === "marsh") {
    body = mix(r.GRASS_DK, "#16140f", 0.55); damp = darken(body, 0.28); lit = mix(body, r.GRASS_LT, 0.22); bank = darken(r.GRASS_DK, 0.4); worn = mix(r.GRASS_DK, "#1a1814", 0.3); Q.wornA = 0.5;
  }
  Q.apron = [damp, body, lit].map(RGB);
  Q.bank = RGB(bank); Q.worn = RGB(worn);
  Q.moss = [darken(r.GRASS_DK, 0.1), r.GRASS_DK].map(RGB);
  // the setts: a few stones of slightly different hue, the mortar, and what
  // grows (or lies) in the joints toward the edges
  const base = k === "marsh" ? mix(P.sett, r.GRASS_DK, 0.22) : k === "ash" ? darken(P.sett, 0.12) : k === "snow" ? lighten(mix(P.sett, "#8a9aae", 0.3), 0.08) : P.sett;
  Q.stones = [base, base, mix(base, "#6e7a8c", 0.13), mix(base, "#b08a64", 0.16), lighten(base, 0.06)].map(RGB);
  Q.sill = RGB(mix(CASTLE_STONE, base, 0.55));
  Q.mortar = dkC(RGB(base), 0.42);
  Q.edgeJ = {
    grass: [darken(r.GRASS_DK, 0.12), r.GRASS_DK, mix(r.GRASS_DK, r.GRASS, 0.5)],
    turf: [darken(r.GRASS_DK, 0.12), r.GRASS_DK, mix(r.GRASS_DK, r.TUFT || r.GRASS_DK, 0.5)],
    marsh: [darken(r.GRASS_DK, 0.15), r.GRASS_DK, mix(r.GRASS_DK, r.GRASS_LT, 0.4)],
    snow: [mix(r.GRASS, "#8aa2b8", 0.4), r.GRASS, lighten(r.GRASS_LT, 0.15)],
    ash: ["#3a302c", mix("#3a302c", r.GRASS_LT, 0.45), mix(r.GRASS_LT, "#7a7068", 0.3)],
  }[k].map(RGB);
  Q.blades = {
    grass: [darken(r.TUFT, 0.1), r.GRASS, mix(r.GRASS, r.GRASS_LT, 0.6), lighten(r.GRASS_LT, 0.12)],
    turf: [darken(r.TUFT || r.GRASS_DK, 0.1), r.GRASS, mix(r.GRASS, r.GRASS_LT, 0.6), lighten(r.GRASS_LT, 0.1)],
    marsh: [darken(r.TUFT || r.GRASS_DK, 0.2), r.GRASS_LT, mix(r.GRASS_LT, "#b8b088", 0.4), mix(r.GRASS_LT, "#d0c8a0", 0.5)],
    snow: ["#6e6a5c", "#8a846e", "#b0a88c", "#d4ccb2"],
    ash: ["#3e3430", "#6e6050", "#8e7e66", "#a89478"],
  }[k].map(RGB);
  Q.snow = [RGB(mix(r.GRASS, "#8aa2b8", 0.3)), RGB(lighten(r.GRASS_LT, 0.12)), [250, 252, 255], RGB(r.GRASS_LT)];
  return Q;
};

// a clump of grass as pixel blades: rooted at art pixel (bx, by), the
// sun-side blades lit at the tips, all leaning a little with the wind
const pxTuft = (B, bx, by, n, cols, seed, tall = 1) => {
  for (let i = -1; i <= n; i++) B.shade(bx + i, by + 1, 0.2);
  for (let i = 0; i < n; i++) {
    const side = n > 1 ? i / (n - 1) : 0.5, h = hash(seed, i + 3);
    const len = Math.max(2, Math.round((2.5 + h * 2.5 + (1 - Math.abs(side - 0.5) * 2) * 1.5) * tall));
    const lean = (side - 0.5) * 1.8 + 0.3 + (hash(seed, i + 9) - 0.5) * 0.6;
    const c = side < 0.5 ? cols : [cols[0], cols[0], cols[1], cols[2]];
    for (let k = 0; k < len; k++) {
      const f = k / Math.max(1, len - 1);
      B.put(bx + i - (n >> 1) + Math.round(lean * f * f * len * 0.45), by - k, c[f < 0.25 ? 0 : f < 0.6 ? 1 : f < 0.9 ? 2 : 3]);
    }
  }
};
// a fallen stone, (w, h) art pixels: a lit top, its south face, corners
// knocked off, a contact shadow down-right; snow on it in the snowy realms
const pxRubble = (B, ax, ay, w, h, col, seed, snowy) => {
  const top = h - 2;
  for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) {
    const cut = (i === 0 || i === w - 1) && (j === 0 || j === h - 1);
    if (i === w || j === h) { if (i > 0 && j > 0 && !(i === w && j === h)) B.shade(ax + i, ay + j, 0.3); continue; }
    if (cut) continue;
    let c;
    if (j < top) c = j === 0 || i === 0 ? litC(col, 0.2) : i === w - 1 ? dkC(col, 0.12) : col;
    else c = i === w - 1 ? dkC(col, 0.5) : dkC(col, 0.32);
    if (snowy && j < 2 && j < top) c = j === 0 ? [250, 252, 255] : [228, 236, 244];
    B.put(ax + i, ay + j, c);
  }
  if (!snowy && hash(seed, 3) > 0.6) B.put(ax + 1 + Math.floor(hash(seed, 4) * (w - 2)), ay + 1, litC(col, 0.35));
};

// -- the cobbled threshold --
// The road widening as it meets the gate: setts laid in courses across it
// (each course its own width, the setts in it of different lengths),
// bowed round the gate more and more the further out they lie, thicker
// toward the arch and thinning out into the road's dirt. The horde walks
// right in over it, so `full` is only for when it is laid under them
// (draw.js calling drawCastleGround); otherwise only the wings of the flare
// beyond the road are paved.
const PAVE_X = GATE.face0 - 40;                   // where the flare begins
const SILL_X = GATE.face0 - 9.5;                  // the sill's west edge (the gatehouse's face hides its last 5)
const hwAt = (x) => { const u = clamp01((x - PAVE_X) / (GATE.face0 + 3 - PAVE_X)); return PATH_HALF - 3 + (GH - PATH_HALF + 6) * Math.pow(u, 1.6); };
const threshold = (B, gy, P, Q, full) => {
  const k = P.kind, paved = P.r.groundArt === "iron", seed = Math.round(gy) + 17;
  // the grid of art pixels the setts are laid into, and which sett owns each
  const TX0 = Math.floor(PAVE_X - 6) * 2, TY0 = Math.floor(gy - GH - 8) * 2;
  const TW = Math.ceil(GATE.face0 + 1 - PAVE_X + 6) * 2, TH = (2 * GH + 16) * 2;
  const id = new Int32Array(TW * TH).fill(-1);
  const S = [];
  const startX = (dy) => (paved ? PAVE_X + 7.5 : PAVE_X - 1 + vnoise(3, dy, 7, seed) * 9 + Math.abs(dy) * 0.08);
  // the Marches' setts are held in by a kerb down each side, as their road is:
  // its outer edge carrying on the road's own and swinging out with the flare
  const KW = 3.5, kerbO = (x) => Math.max(hwAt(x), PATH_HALF), inKerb = (x, y) => paved && Math.abs(y - gy) >= kerbO(x) - KW;
  const rutAt = (dy) => clamp01(1 - Math.abs(Math.abs(dy) - 11.5) / 2.2);
  const wearAt = (dy) => Math.max(clamp01(1 - Math.abs(dy) / 7) * 0.7, rutAt(dy));
  const east = (dy) => Math.round((Math.abs(dy) <= PATH_HALF - 1 ? SILL_X : GATE.face0 - 1.5) * 2);
  const snowy = k === "snow";
  // how deep the snow lies (a smooth field): up over the flare's rim, and in
  // drifts on the paving away from the lanes and the ruts, which stay trodden
  const snowF = (x, dy) => {
    const lane = Math.max(wearAt(dy), rutAt(dy) * 0.9), rim = (Math.abs(dy) - hwAt(x) + 7) / 7;
    return Math.max(rim * 1.25 - 0.15, (0.34 + 0.45 * vnoise(x, dy, 9, seed + 8)) * (1 - lane)) + (vnoise(x, dy, 6, seed + 9) - 0.5) * 0.6 + (vnoise(x, dy, 2.5, seed + 10) - 0.5) * 0.2;
  };
  for (let c = 0, xr = SILL_X; xr > PAVE_X - 3; c++) {
    // each course its own width; the Marches' dressed setts are all alike
    const cw = paved ? 3 : 2.5 + Math.floor(hash(c, 214 + seed) * 3) * 0.5;
    const bow = paved ? 0 : Math.min(5.5, c * 0.9);
    let y = gy - GH - 7 - hash(c, 201 + seed) * 4.5;
    for (let i = 0; y < gy + GH + 6; i++) {
      const hs = (n) => hash(c * 53 + i, n + seed);
      // now and then a half sett, or a long one
      const lr = hs(215), L = lr < 0.07 ? 2 : lr > 0.94 ? 5.5 : 3.5 + Math.floor(hs(202) * 3) * 0.5, y0s = y, y1s = y + L;
      y = y1s;
      const dy = (y0s + y1s) / 2 - gy, ady = Math.abs(dy);
      // the courses bow round the gate, their ends swinging toward it: the
      // further out, the more (the ones by the sill lie straight along it)
      const shift = Math.round(bow * (dy / 40) ** 2 * 2) / 2;
      const xs0 = xr - cw + shift, xs1 = xr + shift, xm = (xs0 + xs1) / 2;
      const out = paved ? ady - kerbO(xm) + KW - 0.5 : ady + 1 - hwAt(xm) + (hs(204) - 0.5) * 3.5;
      if (out > 0) continue;
      // how near the flare's edge (ef), and whether that edge is the grass
      // beyond the road or only the road's own dirt (inside it, the edge is dirt)
      const ef0 = clamp01((out + 7) / 7), grassy = clamp01((ady + 6 - PATH_HALF) / 6), ef = ef0 * grassy;
      const st = startX(dy);
      const dens = paved ? (xm >= st ? 1 : 0) : clamp01((xm - st) / 7);
      let there = hs(203) < dens;
      if (!paved && !there && xm > st - 5 && hs(205) < 0.06) there = true;     // a stray sett out ahead
      if (!paved && there && ef > 0.45 && hs(206) < (ef - 0.45) * 0.9) there = false;   // gone to grass at the edge
      const sk = paved ? 0 : Math.max(clamp01(1 - (xm - st) / 11), (ef0 - grassy) * 0.6), w = wearAt(dy);
      // how deep the realm's snow lies on it: the field, and the setts out in the road
      const sf = snowy ? snowF(xm, dy) : 0, cov = snowy ? clamp01(Math.max(sf, sk * 1.2)) : 0;
      if (cov > 0.75 && ady > PATH_HALF + 2) there = false;                      // gone under the snow beyond the road
      if (!there) continue;
      // the wheels have carried the road's dirt a way in along the ruts
      const rut = paved ? 0 : rutAt(dy) * clamp01(1 - (xm - st - 6) / 16);
      // the stones' hues and tones gather in patches rather than going sett by sett
      const hue = clamp01(vnoise(xm + 40, dy, 6, seed + 41) * 1.4 - 0.2 + (hs(208) - 0.5) * 0.4);
      const s0 = Q.stones[Math.min(Q.stones.length - 1, Math.floor(hue * Q.stones.length))];
      let body = toneC(s0, (vnoise(xm, dy, 8, seed + 40) - 0.5) * 0.18 + (hs(209) - 0.5) * 0.05 - sk * 0.1 + w * 0.05 - rut * 0.08);
      body = mixC(body, Q.road[2], sk * 0.3);
      // a sett sinking into the road loses its dark bevel: only its lit top-left
      // edge still shows, and the road's dirt lies in its joints and lips over it
      const bury = sk > 0.18 ? sk : 0, bev = 1 - w * 0.5;
      S.push({
        body, lit: litC(body, (bury ? 0.1 : 0.15) * bev), shd: bury ? body : dkC(body, 0.22 * bev), gl: litC(body, 0.32),
        glint: hs(210) < 0.3 + w * 0.4 && sk < 0.5, ef, sk, w, rut, dy, cov, bury, drift: sf >= sk * 1.2, h: hs(212),
        // what fills its joints: sunk in the road, only the road's dirt round it;
        // in the lanes and ruts the dirt the feet and wheels carry in
        jd: bury ? Q.road[sk > 0.5 ? 2 : 1] : hs(213) < rut * 0.8 + w * 0.22 ? Q.road[rut > 0.4 ? 0 : 1] : null,
      });
      const n = S.length - 1, lim = east(dy);
      for (let py = Math.round(y0s * 2); py < Math.round(y1s * 2); py++) for (let px = Math.round(xs0 * 2); px < Math.round(xs1 * 2) && px < lim; px++) {
        const i = px - TX0, j = py - TY0;
        if (inKerb((px + 0.5) / 2, (py + 0.5) / 2)) continue;                   // (cut against the kerb)
        if (i >= 0 && j >= 0 && i < TW && j < TH) id[j * TW + i] = n;
      }
    }
    xr -= cw;
  }
  const idAt = (i, j) => (i < 0 || j < 0 || i >= TW || j >= TH ? -1 : id[j * TW + i]);
  const J = new Uint8Array(TW * TH);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const s = id[j * TW + i];
    if (s >= 0 && (idAt(i - 1, j) !== s || idAt(i, j - 1) !== s)) J[j * TW + i] = 1;
  }
  const isJ = (i, j) => (i < 0 || j < 0 || i >= TW || j >= TH ? true : J[j * TW + i] === 1);
  // the road's dirt lipping over the sunk setts from the west and the south,
  // raggedly, so each stone lies part buried
  const Bm = new Uint8Array(TW * TH);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const o = j * TW + i, s = id[o];
    if (s < 0 || !S[s].bury || J[o]) continue;
    let dw = 0; while (dw < 7 && idAt(i - dw - 1, j) === s) dw++;
    let ds = 0; while (ds < 7 && idAt(i, j + ds + 1) === s) ds++;
    const nz = vnoise((TX0 + i + 0.5) / 2, (TY0 + j + 0.5) / 2, 1.2, seed + 16), b = S[s].bury * 5;
    if (dw < b * (0.15 + nz) || ds < b * (0.3 + nz)) Bm[o] = 1;
  }
  // the snow's depth at each art pixel; deep enough, it lies over the stones in drifts
  // (worked out only where it is asked for)
  const SF = snowy ? new Float32Array(TW * TH).fill(-9) : null;
  const DRIFT = 0.74, sfAt = (i, j) => {
    if (i < 0 || j < 0 || i >= TW || j >= TH) return 0;
    const o = j * TW + i;
    if (SF[o] === -9) { const x = (TX0 + i + 0.5) / 2, y = (TY0 + j + 0.5) / 2; SF[o] = snowF(x, y - gy) + (vnoise(x, y, 1.2, seed + 19) - 0.5) * 0.14; }
    return SF[o];
  };
  const driftCol = (i, j) => (sfAt(i, j - 1) <= DRIFT || sfAt(i - 1, j) <= DRIFT ? Q.snow[2] : sfAt(i, j + 1) <= DRIFT || sfAt(i, j + 2) <= DRIFT ? Q.snow[0] : Q.snow[1]);
  // worn hollows where the setts have settled; the deepest holds a puddle
  // (ice in the snow, a drift of ash in the ash)
  const hol = [];
  for (let i = 0; i < 3; i++) hol.push({ x: PAVE_X + (i ? 12 : 17) + hash(seed, 300 + i) * (i ? 14 : 7), y: gy + (hash(seed, 310 + i) - 0.5) * 34, rx: (i ? 3.5 : 5.5) + hash(seed, 320 + i) * 2, ry: (i ? 2.2 : 3.2) + hash(seed, 330 + i) * 1.2, pool: i === 0 });
  const ashIn = (h, x, y) => { const u = (x - h.x) / h.rx, v = (y - h.y) / h.ry; return u * u + v * v + (vnoise(x, y, 1.3, seed + 4) - 0.5) * 0.3 < 0.42; };
  // the joints: mortar, or (a sett at a time, so it reads as whole stones and
  // not as grit) the road's dirt packed in; grass (snow) in clumps toward the edges
  const jointCol = (px, py, st) => {
    const x = (px + 0.5) / 2, y = (py + 0.5) / 2;
    if (st.ef > 0.05 && vnoise(x, y, 1.4, seed + 11) < st.ef * 0.95 * (1 - st.sk)) return Q.edgeJ[vnoise(x, y, 2.2, seed + 12) < 0.4 ? 0 : vnoise(x, y, 1.1, seed + 13) < 0.6 ? 1 : 2];
    if (snowy && st.drift && vnoise(x, y, 1.2, seed + 14) < st.cov * 1.3 - 0.2) return Q.snow[0];
    if (st.jd) return st.jd;
    return Q.mortar;
  };
  // wheels carry the ruts' dirt a little way onto the setts before the sill
  const grooveAt = (x, dy) => {
    if (x < SILL_X - 2 - vnoise(0, dy, 2, seed + 35) * 4) return 0;
    for (const g of [-11.5, 11.5]) { const t = dy - g; if (t >= -1.5 && t < -1) return 1; if (t >= -1 && t < 0) return 2; }
    return 0;
  };
  const tufts = [];
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const o = j * TW + i, s = id[o];
    if (s < 0 && !snowy) continue;
    const px = TX0 + i, py = TY0 + j, x = (px + 0.5) / 2, y = (py + 0.5) / 2, dy = y - gy;
    if (!full && Math.abs(dy) < PATH_HALF - 3) continue;
    if (s < 0) {
      // the drifts carry on over the gaps along the flare's rim, so their edges
      // are the snow's own and not the setts'
      if (Math.abs(dy) > hwAt(x) - 4 && Math.abs(dy) < hwAt(x) + 1 && x > PAVE_X + 3 + vnoise(0, y, 3, seed + 36) * 5 && sfAt(i, j) > DRIFT) B.put(px, py, driftCol(i, j));
      continue;
    }
    const st = S[s];
    let col;
    const a = isJ(i - 1, j), b = isJ(i, j - 1), cR = idAt(i + 1, j) !== s, d = idAt(i, j + 1) !== s;
    const joint = J[o] || ((a || cR) && (b || d));
    if (joint) {
      // (no mortar where no stone lies alongside: the ground itself shows there)
      if (idAt(i - 1, j) < 0 || idAt(i, j - 1) < 0 || idAt(i + 1, j) < 0 || idAt(i, j + 1) < 0) continue;
      col = jointCol(px, py, st);
      // grass (or its like) up out of the joints near the edges
      if (st.ef > 0.35 && (k === "grass" || k === "turf" || k === "marsh") && hash(px * 5, py * 11 + 2) < (st.ef - 0.35) * 0.05) tufts.push([px, py]);
    } else if (Bm[o]) {
      // the dirt over the stone; the stone's shadow falls on it from the north
      col = Bm[o - TW] || idAt(i, j - 1) !== s ? st.jd : dkC(st.jd, 0.14);
    } else {
      col = a || b || (i > 0 && Bm[o - 1]) ? st.lit : cR || d || Bm[o + TW] ? st.shd : st.body;
      if (st.glint && isJ(i - 2, j) && isJ(i, j - 2) && !a && !b) col = st.gl;
      if (snowy && st.cov > 0.5) {
        // a cap of snow on the sett's top by the drifts, its corners rounded off
        const cap = Math.floor((st.cov - 0.5) * 12 * (0.6 + st.h * 0.6)) - (isJ(i - 2, j) || idAt(i + 2, j) !== s ? 1 : 0);
        let top = 0;
        for (let q = 1; q <= cap && !isJ(i, j - q); q++) top++;
        if (top < cap) col = st.drift ? (cR ? Q.snow[0] : Q.snow[1]) : Q.road[top === 0 ? 3 : 2];
      }
      // the realm's own ground lying on the stones toward the edges, in clumps
      if (st.ef > 0.25 && !snowy) {
        const e = st.ef - 0.25, r = vnoise(x, y, 1.1, seed + 17);
        if (k === "ash" && r < e * 0.6) col = Q.edgeJ[r < e * 0.3 ? 1 : 2];
        else if ((k === "marsh" || k === "grass" || k === "turf") && (cR || d) && r < e * (k === "marsh" ? 1.1 : 0.6) * (1 - st.sk)) col = Q.moss[r < e * 0.3 ? 0 : 1];
      }
    }
    if (full && !joint && grooveAt(x, dy) === 2) col = mixC(col, Q.road[1], 0.5);
    // the hollows, in two flat steps: the north-west slope in shade (deeper
    // toward the bottom), the far one catching the light along its lip
    for (const h of hol) {
      const u = (x - h.x) / h.rx, v = (y - h.y) / h.ry, q = u * u + v * v + (vnoise(x, y, 1.2, seed + 4) - 0.5) * 0.3;
      if (q >= 1) continue;
      if (h.pool && k === "ash" && ashIn(h, x, y)) {
        // a drift of ash blown into it: lit clumps, its south lip in shade
        col = !ashIn(h, x, y + 0.5) ? Q.apron[1] : !ashIn(h, x, y - 0.5) || vnoise(x, y, 1.3, seed + 5) > 0.5 ? litC(Q.apron[2], 0.22) : litC(Q.apron[2], 0.08);
        break;
      }
      const face = u * 0.42 + v * 0.58;
      col = face < -0.15 ? dkC(col, q < 0.5 ? 0.14 : 0.07) : face > 0.3 ? (q > 0.45 ? litC(col, 0.06) : col) : q < 0.5 ? dkC(col, 0.05) : col;
      break;
    }
    // snow drifted over the stones: its crest lit, its south toe in blue shade
    if (snowy && sfAt(i, j) > DRIFT) col = driftCol(i, j);
    B.put(px, py, col);
  }
  for (const [px, py] of tufts) pxTuft(B, px, py, 2 + ((hash(px, py) * 2) | 0), Q.blades, px * 31 + py, 0.7);
  // the deepest hollow holds a puddle (a skin of ice in the snow): a lumpy
  // round of water, the reflected bank dark along its north, a glint of sky
  // by its north-west edge, a mud lip round the shaded side
  if (k !== "ash" && full) {
    const h = hol[0], L = Q.road, ice = snowy, wat = Q.water, fen = k === "marsh";
    const wDeep = ice ? mixC(L[2], RGB("#86b2c8"), 0.45) : mixC(RGB(wat.deep), L[0], fen ? 0.2 : 0.4);
    const wMid = ice ? mixC(L[3], RGB("#d4ecf6"), 0.5) : mixC(mixC(RGB(wat.edge), RGB(wat.shine), fen ? 0.62 : 0.25), L[2], fen ? 0.22 : 0.5);
    const wHi = ice ? [251, 254, 255] : mixC(litC(RGB(wat.shine), 0.35), L[3], 0.25), mud = dkC(L[0], 0.18);
    const cx = Math.round(h.x * 2), cy = Math.round(h.y * 2), RX = 6.5 + hash(seed, 340) * 3, RY = RX * 0.62;
    // (a lumpy round: the noise only nudges its rim, and a second lobe leans it off true)
    const lx = (hash(seed, 342) - 0.5) * RX * 0.9, ly = (hash(seed, 343) - 0.5) * RY * 0.6;
    const inW = (i, j) => Math.min(((i + 0.5) / RX) ** 2 + ((j + 0.5) / RY) ** 2, ((i + 0.5 - lx) / (RX * 0.7)) ** 2 + ((j + 0.5 - ly) / (RY * 0.75)) ** 2)
      + (vnoise((cx + i) / 2, (cy + j) / 2, 1.5, seed + 33) - 0.5) * 0.35;
    const wet = (i, j) => inW(i, j) <= 0.8;
    const gI = -Math.round(RX * 0.45), gl = 2 + (hash(seed, 341) > 0.5 ? 1 : 0);
    let glints = 0;
    for (let j = Math.floor(-RY - 3); j <= RY + 3; j++) for (let i = Math.floor(-RX - 3); i <= RX + 3; i++) {
      if (wet(i, j)) {
        // the near bank's reflection a pixel or two deep along the north, a glint of sky in it by the north-west
        const n1 = !wet(i, j - 1), n2 = !wet(i, j - 2);
        let c = n1 || (n2 && i < RX * 0.2) ? wDeep : wMid;
        if (!n1 && n2 && glints < gl && i < 0 && i > gI - 2) { c = wHi; glints++; }
        B.put(cx + i, cy + j, c);
      } else if (wet(i, j + 1) || wet(i + 1, j)) B.put(cx + i, cy + j, mud);          // its mud rim, north and west
      else if (wet(i, j - 1) || wet(i - 1, j)) B.put(cx + i, cy + j, litC(L[2], 0.1)); // the far lip catching the sun
    }
  }
  // the Marches' paving ends in a header course of long kerbs laid across the road
  if (paved) {
    const hx = Math.round((PAVE_X + 4.5) * 2) + 1;
    for (let y = gy - hwAt(PAVE_X + 9) + 0.5, i = 0; y < gy + hwAt(PAVE_X + 9) - 1; i++) {
      const len = Math.min(8 + Math.floor(hash(i, 220 + seed) * 4), gy + hwAt(PAVE_X + 9) - 1 - y), b = y + len;
      const col = toneC(Q.stones[0], 0.04 + (hash(i, 221 + seed) - 0.5) * 0.08);
      for (let py = Math.round(y * 2); py < Math.round(b * 2); py++) for (let px = hx - 1; px < hx + 6; px++) {
        if (!full && Math.abs((py + 0.5) / 2 - gy) < PATH_HALF - 3) continue;
        const ii = px - hx + 1, jj = py - Math.round(y * 2), last = Math.round(b * 2) - 1;
        let c = ii === 0 || jj === 0 ? Q.mortar : ii === 1 || jj === 1 ? litC(col, 0.16) : ii === 6 || py === last ? dkC(col, 0.2) : col;
        if ((ii === 1 || ii === 6) && (jj === 1 || py === last)) c = Q.mortar;
        B.put(px, py, c);
      }
      y = b;
    }
    // the kerbs: long dressed stones a shade paler than the setts, a mortar
    // joint along the setts, each stone lit on its upper-left edges and dark
    // on its lower-right, its joints square to the curve; the south kerb's
    // face shows with the turf in its shadow, the turf laps the north one
    const kx0 = PAVE_X + 4.5, kx1 = GATE.face0 + 1;
    // (where another arm of the road joins the flare — the road bending in
    // from the south, say — the kerb gives way to it; its last run into the
    // gate is the flare itself)
    const arms = [];
    for (let i = 0; i + 1 < PTS.length; i++) {
      const [ax, ay] = PTS[i], [bx, by] = PTS[i + 1];
      if ((Math.abs(ay - gy) < 4 && Math.abs(by - gy) < 4) || Math.max(ax, bx) < kx0 - PATH_HALF) continue;
      arms.push([ax, ay, bx - ax, by - ay]);
    }
    const onArm = (x, y) => arms.some(([ax, ay, dx, dy]) => {
      const L2 = dx * dx + dy * dy || 1, t = ((x - ax) * dx + (y - ay) * dy) / L2;
      return t >= 0 && t <= 1 && (ax + dx * t - x) ** 2 + (ay + dy * t - y) ** 2 < (PATH_HALF - 1) ** 2;
    });
    for (const side of [-1, 1]) {
      const cuts = [kx0];
      for (let x = kx0, q = 0; x < kx1; q++) { x += 5.5 + hash(q, 230 + seed + side) * 3.5; cuts.push(x); }
      for (let px = Math.round(kx0 * 2); px < Math.round(kx1 * 2); px++) {
        const x = (px + 0.5) / 2, o = kerbO(x), inner = o - KW, sl = kerbO(x + 0.5) - kerbO(x - 0.5);
        const yA = Math.round((gy + side * (side < 0 ? o : inner)) * 2), yB = Math.round((gy + side * (side < 0 ? inner : o)) * 2);
        for (let py = yA; py < yB + (side > 0 ? 2 : 0); py++) {
          const y = (py + 0.5) / 2;
          if ((!full && Math.abs(y - gy) < PATH_HALF - 3) || onArm(x, y)) continue;
          if (py >= yB) {
            // the south kerb's face, and its shadow on the turf below
            B.put(px, py, py === yB ? dkC(toneC(Q.stones[0], 0.1), 0.42) : PLUM, py === yB ? 1 : 0.28);
            continue;
          }
          const t = x + (Math.abs(y - gy) - inner) * sl;
          let c = 0; while (c + 1 < cuts.length && cuts[c + 1] <= t) c++;
          const dl = t - cuts[c], dr = cuts[c + 1] - t, top = py === yA, bot = py === yB - 1;
          const col = toneC(Q.stones[0], 0.1 + (hash(c, 231 + seed + side) - 0.5) * 0.08);
          // (the joint along the setts is mortar; the turf laps the north kerb's crest)
          if (side < 0 ? bot : top) { B.put(px, py, Q.mortar); continue; }
          if (side < 0 && top && vnoise(x, y, 2.2, seed + 232) > 0.55) continue;
          let pc = dl < 0.5 ? Q.mortar : dl < 1 || (side < 0 ? top || py === yA + 1 && vnoise(x, y, 2.2, seed + 232) > 0.55 : py === yA + 1) ? litC(col, 0.16)
            : dr < 0.5 || (side < 0 ? py === yB - 2 : bot) ? dkC(col, 0.2) : col;
          if (pc !== Q.mortar && hash(px * 3 + 1, py * 7 + side) < 0.04) pc = dkC(col, 0.1);   // pocked
          B.put(px, py, pc);
        }
      }
    }
  }
  if (!full) return;
  // the sill across the arch's mouth: long dressed slabs, a shade darker than
  // the gatehouse's stone, two grooves worn across by wheels
  const sx0 = Math.round(SILL_X * 2), sx1 = Math.round((GATE.face0 + 1) * 2);
  for (let y = gy - PATH_HALF + 1, i = 0; y < gy + PATH_HALF - 1; i++) {
    const len = Math.min(9 + Math.floor(hash(i, 91 + seed) * 5), gy + PATH_HALF - 1 - y), b = y + len;
    const col = toneC(Q.sill, (hash(i, 92 + seed) - 0.5) * 0.1 - 0.13);
    const y0p = Math.round(y * 2), y1p = Math.round(b * 2);
    // now and then a crack across the slab
    const crack = hash(i, 93 + seed) > 0.7 ? [y0p + 3 + Math.floor(hash(i, 94 + seed) * Math.max(1, y1p - y0p - 8)), hash(i, 95 + seed) < 0.5 ? 1 : -1, 5 + Math.floor(hash(i, 96 + seed) * 7)] : null;
    for (let py = y0p; py < y1p; py++) for (let px = sx0; px < sx1; px++) {
      const ii = px - sx0, jj = py - y0p, dy = (py + 0.5) / 2 - gy;
      if (ii === 0 || jj === 0) { B.put(px, py, Q.mortar); continue; }
      if ((ii === 1) && (jj === 1 || py === y1p - 1)) { B.put(px, py, Q.mortar); continue; }
      let c = ii === 1 || jj === 1 ? litC(col, 0.16) : py === y1p - 1 ? dkC(col, 0.22) : col;
      // worn smooth and pale where the feet go, the wear's edge ragged; the
      // dish's north lip in shade
      const ad = Math.abs(dy), wr = 7 + (vnoise(px, py, 3, seed + 31) - 0.5) * 3;
      if (ii > 1 && jj > 0 && py < y1p - 1) {
        if (ad < wr) c = litC(col, 0.08);
        else if (dy < 0 && ad < wr + 0.5) c = dkC(col, 0.1);
        else if (hash(px * 3 + 1, py * 7 + 5) < 0.05) c = dkC(col, 0.12);   // pitted where nobody walks
      }
      if (crack && ii > 1 && ii < crack[2] && py === crack[0] + Math.round((ii - 2) * 0.5 * crack[1])) c = dkC(col, 0.3);
      // wheel grooves: a dark north wall, the worn floor with the road's dirt in it, a lit south lip
      for (const g of [-11.5, 11.5]) {
        const t = dy - g;
        if (t >= -1.5 && t < -1) c = dkC(col, 0.4);
        else if (t >= -1 && t < 0) c = mixC(dkC(col, 0.2), Q.road[1], 0.35);
        else if (t >= 0 && t < 0.5) c = litC(col, 0.2);
      }
      B.put(px, py, c);
    }
    y = b;
  }
};

// on the beach or in the sea: the coast's own sand runs right up to the
// footing there, with no trodden earth over it (COAST is null off the coast)
const shore = (x, y) => !!TERRAIN.COAST && (TERRAIN.onSand(x, y) || TERRAIN.inSea(x, y));

// -- the apron along the wall's foot --
const apron = (B, gy, P, Q, towers) => {
  const k = P.kind, [DAMP, BODY, LIT] = Q.apron, seed = 5;
  for (let ay = -28; ay < (H + 14) * 2; ay++) {
    const y = (ay + 0.5) / 2;
    if (Math.abs(y - gy) <= GH) continue;                 // the threshold has the gate's front
    // (the footing course stands 2.5 proud of the face: the apron starts at its toe)
    const fx = footAt(y, gy, towers) - 2.5, fa = Math.round(fx * 2);
    if (isWet(fx, y)) {
      // the sea's surf against the wall is coast.js's; in a river, the
      // stone's dark reflection, a lap of foam against it and a broken line
      // of foam just off it
      if (!inRiverAt(fx, y)) continue;
      for (let px = fa - 10; px < fa - 2; px++) B.put(px, ay, [20, 24, 32], 0.2);
      if (fx === WALL.face0 - 2.5 && inRiverAt(WALL.face0 - 1, y) && Math.abs(y - gy) > 60) continue;   // (it runs on into the culvert)
      if (hash(fa, ay >> 1) > 0.15) B.put(fa - 1, ay, [240, 248, 250], 0.8);
      if (hash(fa + 1, ay >> 1) > 0.5) B.put(fa - 2, ay, [240, 248, 250], 0.5);
      if (vnoise(0, y, 3, seed + 8) > 0.6) B.put(fa - 4 - ((vnoise(0, y, 7, seed + 9) * 3) | 0), ay, [236, 244, 246], 0.4);
      continue;
    }
    // how far the trodden earth reaches: wide and narrow in long drifts
    const wd = 2.5 + vnoise(0, y, 17, seed) * 4.6 + vnoise(0, y, 5, seed + 1) * 1.5;
    const drip = 1.4 + vnoise(0, y, 6, seed + 2) * 0.8;
    const grav = (k === "marsh" ? 0.08 : 0.16) * (0.4 + vnoise(0, y, 9, seed + 7) * 1.2), mossy = k !== "snow" && k !== "ash" && vnoise(0, y, 7, seed + 6) > 0.55;
    for (let px = fa - Math.ceil((wd + 6) * 2); px < fa; px++) {
      const x = (px + 0.5) / 2, e = fx - x;
      // (on the sand only the footing's own shadow, one art pixel)
      if (shore(x, y)) { if (px === fa - 1) B.shade(px, ay, 0.28); continue; }
      const edge = e < wd - 1 ? wd : wd + (vnoise(x, y, 2.6, seed + 3) - 0.5) * 1.8;   // (ragged only where it matters)
      // (tone edges break up in little clumps, never in a dither)
      const bz = vnoise(x, y, 1.1, seed + 12);
      if (e >= edge) {
        // the turf's little bank down onto the earth, then trampled turf
        if (e < edge + 0.5) { B.put(px, ay, Q.bank, k === "snow" ? 0.8 : 1); continue; }
        const f = 1 - (e - edge - 0.5) / 3.5;
        if (f > 0 && f * 0.9 + bz * 0.6 > 0.62) B.put(px, ay, Q.worn, Q.wornA * (f > 0.5 ? 1 : 0.7));
        continue;
      }
      // the earth: a damp drip-line under the stone, drifts of lighter earth
      let t = vnoise(x * 1.3, y, 4.5, seed + 4) + (bz - 0.5) * 0.32;
      if (e < drip) t -= 0.55;
      if (e > edge - 0.5) t -= 0.3;                       // the bank's shadow thrown onto it
      let c = t < 0.3 ? DAMP : t < 0.74 ? BODY : LIT;
      const h = hash(px * 3 + 7, ay * 5 + 1);
      if (h < 0.035) c = c === LIT ? BODY : DAMP;
      else if (h > 0.975 && c !== LIT) c = c === DAMP ? BODY : LIT;
      if (Q.thaw && e < drip) c = e < 0.6 || t < -0.15 ? Q.thaw[1] : Q.thaw[0];   // bare earth where the stone's warmth melts the snow
      B.put(px, ay, c);
      // gravel washed out along the drip-line's edge
      if (e >= drip && e < drip + 0.5 && hash(px, ay * 3 + 11) < grav) {
        B.put(px, ay, Q.pebble[0]); B.put(px + 1, ay + 1, Q.pebble[1]);
      }
      // moss in the damp at the very foot
      if (e < 0.5 && mossy && hash(px, ay) < 0.6) B.put(px, ay, Q.moss[hash(px + 1, ay) < 0.5 ? 0 : 1]);
      if (e < 0.5) B.shade(px, ay, 0.28);
    }
  }
  // puddles in the fen mud, few and far between, each its own size
  if (k === "marsh") for (let y = 24 + hash(gy, 13) * 50, n = 0; y < H - 20; y += 55 + hash(n, 14) * 120, n++) {
    const fx = footAt(y, gy, towers) - 2.5;
    if (Math.abs(y - gy) <= GH + 4 || isWet(fx, y) || hash(n, 15) < 0.25) continue;
    // a pool lying along the foot, its near bank dark in it, a streak of sky
    const cx = Math.round((fx - 4) * 2), cy = Math.round(y * 2), rx = 5 + (hash(n, 16) * 7 | 0), ry = 2 + (hash(n, 17) * 2.5 | 0);
    const deep = RGB(Q.water.deep), wat = RGB(Q.water.edge), shine = mixC(RGB(Q.water.shine), wat, 0.45);
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
      const u = i / rx, v = j / (ry + 0.5), q = u * u + v * v + (vnoise(i, j, 3, n) - 0.5) * 0.3;
      if (q > 1) continue;
      B.put(cx + i, cy + j, q > 0.72 && (v < 0 || u < -0.3) ? dkC(deep, 0.3) : v < -0.2 ? deep : Math.abs(u * 0.7 + v - 0.35) < 0.16 && q < 0.6 ? shine : wat);
    }
  }
};

const paintGroundUnder = (c, gy, full, B) => {
  const P = groundPal(), Q = pixPal(P), towers = towersOf(gy);
  apron(B, gy, P, Q, towers);
  threshold(B, gy, P, Q, full);
  B.lay(c);
};

// what lies over the wall's foot: earth and turf banked against the footing,
// clumps of the realm's ground, fallen stones; and at the dusky realms a
// brazier each side of the threshold
const paintGroundOver = (c, gx, gy, tier, out, B, cracks = []) => {
  const P = groundPal(), Q = pixPal(P), towers = towersOf(gy), r = P.r, k = P.kind;
  const clear = (y) => Math.abs(y - gy) > PATH_HALF + 1;
  const turfT = k === "snow" ? [[250, 252, 255], RGB(lighten(r.GRASS_LT, 0.1)), RGB(mix(r.GRASS, "#8aa2b8", 0.35))]
    : k === "ash" ? [RGB(lighten(P.earth, 0.12)), RGB(P.earth), RGB(darken(P.earth, 0.25))]
      : [RGB(mix(r.GRASS, r.GRASS_LT, 0.6)), RGB(r.GRASS), RGB(r.GRASS_DK)];
  // banked over the footing course in long drifts down the wall: turf (snow,
  // ash, mud) lying over the stone's foot, lit along its crest and where it
  // rises to the north, shaded where it falls away to the south
  const snowy = k === "snow";
  const SN = [RGB(lighten(r.GRASS_LT, 0.25)), RGB(lighten(r.GRASS_LT, 0.12)), RGB(r.GRASS_LT), RGB(mix(r.GRASS, "#7c96b4", 0.35))];
  const bankAt = (y) => Math.max(0, (vnoise(0, y, 11, 21) * 0.75 + vnoise(0, y, 4, 22) * 0.25 - (snowy ? 0.36 : 0.44)) * (snowy ? 7 : 5.5));
  let lastTuft = -99;
  for (let py = -20; py < (H + 10) * 2; py++) {
    const y = (py + 0.5) / 2, fx = footAt(y, gy, towers);
    if (!clear(y) || isWet(fx - 2, y) || shore(fx - 3, y)) continue;
    const ext = bankAt(y);
    if (ext <= 0.3) continue;
    // a tower's corner breaks the bank off square
    const edgeN = footAt(y - 1.5, gy, towers) !== fx, edgeS = footAt(y + 1.5, gy, towers) !== fx;
    const slope = edgeN ? 1 : edgeS ? -1 : bankAt(y + 0.5) - bankAt(y - 0.5);
    if (snowy) {
      // a drift heaped against the footing: its toe out on the apron, its
      // back up the stone; the face toward the sun lit, the crest brightest
      // where it rises to the north, its south end in blue shade, a soft lee
      // line along the toe
      const xa = Math.round((fx - 3 - ext * 0.6 - vnoise(0, y, 2.5, 25) * 1.2) * 2), xb = Math.round((fx - 2.4 + ext * 0.32) * 2), span = Math.max(1, xb - xa);
      // (the tones' edges wander down the drift, never straight bands)
      const jt = (vnoise(0, y, 4, 26) - 0.5) * 0.2, jc = (vnoise(0, y, 2.2, 27) - 0.5) * 0.2;
      for (let px = xa; px <= xb; px++) {
        const u = (px - xa) / span;
        B.put(px, py, slope < -0.06 ? (u > 0.55 + jt ? SN[3] : SN[2]) : u < 0.25 + jt ? SN[2] : u > 0.66 + jc && ext > 2.2 && slope > -0.02 ? SN[0] : SN[1]);
      }
      B.put(xa - 1, py, SN[3], 0.45);
      if (slope < -0.06) B.shade(xb + 1, py, 0.16);
      continue;
    }
    const xa = Math.round((fx - 2.8 - ext * 0.25) * 2), xb = Math.round((fx - 2.6 + ext * 0.42) * 2);
    for (let px = xa; px <= xb; px++) {
      let col = slope > 0.05 ? turfT[0] : slope < -0.05 ? turfT[2] : turfT[1];
      if (px === xb && slope > -0.05) col = turfT[0];
      if (hash(px * 5, py * 3) < 0.07) col = col === turfT[2] ? turfT[1] : turfT[2];
      B.put(px, py, col);
    }
    if (hash(py, 23) < 0.3) B.put(xb + 1, py, turfT[1]);                         // a blade over the crest
    if (slope < -0.05) B.shade(xb + 1, py, 0.22);                                // its shadow on the stone
    if (k !== "ash" && ext > 1.2 && py - lastTuft > 16 && hash(py, 24) < 0.25) { pxTuft(B, xb - 1, py, 3, Q.blades, py); lastTuft = py; }
  }
  // clumps of the realm's ground along the foot
  for (let y = -6, i = 0; y < H + 6; y += 9 + hash(i, 30) * 10, i++) {
    const fx = footAt(y, gy, towers);
    if (!clear(y) || isWet(fx - 3, y) || shore(fx - 3, y) || hash(i, 31) < 0.2) continue;
    // (the snow's mounds lie out on the trodden snow, never astride the footing)
    const off = hash(i, 32) > 0.72 ? 6 + hash(i, 33) * 3 : k === "snow" ? 4.5 + hash(i, 33) * 2 : 1.5 + hash(i, 33) * 1.5;
    const bx = Math.round((fx - off) * 2), by = Math.round(y * 2);
    pxClump(B, P, Q, bx, by, i * 7 + 3);
  }
  // fallen stones: a few old ones long settled into the ground (where, as the
  // realm has it), and with each tier of damage fresh heaps under the cracked
  // curtain (where paintCastleStone puts its cracks) and, at the last, under
  // the burnt towers: a big block or two, chips round them, some tumbled out
  // onto the apron, darker than the footing so they part from it
  const rs = [...String(r.id)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7), stone = RGB(CASTLE_STONE);
  const pieces = [];
  for (let i = 0; i < 6; i++) {
    const y = 10 + hash(i + rs, 40) * (H - 20), fx = footAt(y, gy, towers);
    if (!clear(y) || isWet(fx - 3, y)) continue;
    const w = 4 + Math.floor(hash(i + rs, 42) * 4), h = 3 + Math.floor(hash(i + rs, 43) * 2);
    pieces.push([Math.round((fx - 3 - hash(i + rs, 41) * 6) * 2) - w, Math.round(y * 2), w, h, toneC(stone, -0.1 + (hash(i + rs, 44) - 0.5) * 0.1), i + rs]);
  }
  const heaps = [];
  for (const y of cracks.slice(0, tier)) heaps.push([y, 0.8 + tier * 0.15]);
  if (tier >= 3) {
    const plain = towers.filter(([, g]) => !g).map(([f]) => f).sort((p, q) => p - q);
    heaps.push([gy + GATE_TOWER_N, 1.3]);
    if (plain.length) heaps.push([plain[0], 1.3]);
  }
  heaps.forEach(([y0, big], hI) => {
    const sd = rs + hI * 17 + 300;
    for (let i = 0; i < 4 + Math.round(big * 6); i++) {
      const lead = i < (big > 1.1 ? 2 : 1);
      const y = y0 + (hash(sd, i) - 0.5) * (lead ? 5 : 7 + 5 * big), fx = footAt(y, gy, towers);
      if (!clear(y) || isWet(fx - 3, y)) continue;
      const w = lead ? 8 + Math.floor(hash(sd, i + 20) * 3) : 3 + Math.floor(hash(sd, i + 20) * 3);
      const h = lead ? 6 + Math.floor(hash(sd, i + 21) * 2) : 2 + Math.floor(hash(sd, i + 21) * 2);
      const out = lead ? 1 + hash(sd, i + 22) * 1.5 : hash(sd, i + 22) ** 2 * 8;       // (a few tumbled well out)
      pieces.push([Math.round((fx - 2.5 - out) * 2) - w, Math.round(y * 2), w, h, dkC(stone, 0.14 + hash(sd, i + 23) * 0.18), sd + i]);
    }
    // grit and chips of mortar scattered round the heap
    for (let i = 0; i < 12 * big; i++) {
      const y = y0 + (hash(sd, i + 40) - 0.5) * 18 * big, fx = footAt(y, gy, towers);
      if (!clear(y) || isWet(fx - 3, y)) continue;
      const gx0 = Math.round((fx - 3 - hash(sd, i + 41) * 7) * 2), gy0 = Math.round(y * 2);
      B.put(gx0, gy0, litC(stone, 0.1)); B.put(gx0 + 1, gy0, dkC(stone, 0.3));
    }
  });
  // (north first, so each stone lies over the one behind it)
  pieces.sort((p, q) => p[1] + p[3] - q[1] - q[3]);
  for (const [x, y, w, h, col, sd] of pieces) pxRubble(B, x, y, w, h, col, sd, k === "snow");
  // a clump or two either side of the threshold, where the flare meets the grass
  for (const side of [-1, 1]) for (let q = 0; q < 3; q++) {
    const x = GATE.face0 - 3 - q * 6 - hash(q, side + 60) * 2, y = gy + side * (hwAt(x) + 1.5 + hash(q, side + 61) * 2);
    if (!isWet(x, y) && !shore(x, y)) pxClump(B, P, Q, Math.round(x * 2), Math.round(y * 2), 50 + q + side * 3);
  }
  // braziers on the kerb corners where the realm is dark enough to want them:
  // an iron bowl of coals on three legs (the fire in it is live)
  if ((REALM.light?.amount ?? 0) >= 0.15) {
    const IRON = [[106, 100, 112], [74, 68, 80], [46, 42, 48], [30, 26, 32]];
    for (const side of [-1, 1]) {
      const bx = GATE.face0 - 7, by = gy + side * (GH + 5);
      if (isWet(bx, by)) continue;
      const X = Math.round(bx * 2), Y = Math.round(by * 2);
      for (let i = -4; i <= 8; i++) { B.shade(X + i, Y + 1, 0.3); if (i > -3 && i < 7) B.shade(X + i, Y + 2, 0.18); }
      for (let j = 0; j < 10; j++) { B.put(X - 5, Y - j, IRON[2]); B.put(X + 4, Y - j, IRON[3]); if (j < 8) B.put(X - 1, Y - j - 1, IRON[3]); }
      B.put(X - 6, Y, IRON[2]); B.put(X + 5, Y, IRON[3]);
      // the bowl: a lit rim, its belly lit to the west and dark to the east, tapering down
      for (let j = 0; j < 6; j++) {
        const y = Y - 15 + j, inset = j < 3 ? 0 : j - 2;
        for (let i = -7 + inset; i <= 6 - inset; i++) {
          const edgeL = i === -7 + inset, edgeR = i >= 5 - inset;
          B.put(X + i, y, j === 0 ? (edgeR ? IRON[1] : IRON[0]) : j === 1 && !edgeL && !edgeR ? [90, 42, 26] : edgeL ? IRON[0] : edgeR ? IRON[3] : j === 5 ? IRON[2] : IRON[1]);
        }
      }
      for (let i = -5; i <= 4; i++) if (hash(i, side + 40) < 0.4) B.put(X + i, Y - 14, [200, 90, 36]);
      out.braziers.push([bx, by - 7.5]);
    }
  }
  B.lay(c);
};
// one clump of the realm's ground in pixels, rooted at art pixel (bx, by)
const pxClump = (B, P, Q, bx, by, seed) => {
  const k = P.kind, r = P.r;
  if (k === "snow") {
    // dry stalks standing up out of a little mound of drifted snow: its top
    // lit, its south face in blue shade
    // (a stepped dome: two pixels, then four, then its full width)
    const n = 2 + ((hash(seed, 1) * 2) | 0), w = n + 5, x0 = bx - (w >> 1);
    pxTuft(B, bx, by, n, Q.blades, seed, 0.8);
    const row = (y, a, b, f) => { for (let i = a; i < b; i++) B.put(x0 + i, y, f(i - a, b - a)); };
    const mid = w >> 1;
    // (lit cream on its upper-left, never a paper white, so it sits in the snow)
    const lit = mixC(Q.snow[1], CREAM, 0.25);
    row(by - 2, mid - 1, mid + 1, (i) => (i === 0 ? lit : Q.snow[1]));
    row(by - 1, mid - 2, mid + 2, (i, m) => (i === 0 ? lit : i === m - 1 ? Q.snow[3] : Q.snow[1]));
    row(by, 0, w, (i, m) => (i === 0 ? Q.snow[3] : i === m - 1 ? Q.snow[0] : i > m - 3 ? Q.snow[3] : Q.snow[1]));
    row(by + 1, 1, w - 1, (i, m) => (i < 2 ? Q.snow[3] : Q.snow[0]));
    B.shade(x0 + w - 1, by + 1, 0.15);
    return;
  }
  if (k === "ash") {
    for (let i = 0; i < 3; i++) pxRubble(B, bx + Math.round((hash(seed, i + 3) - 0.4) * 5), by + Math.round((hash(seed, i) - 0.5) * 10), 3 + (hash(seed, i + 6) * 3 | 0), 3, RGB(mix("#5a4c46", "#3a302c", hash(seed, i + 9))), seed + i, false);
    pxTuft(B, bx - 2, by, 3, Q.blades, seed, 0.9);
    return;
  }
  if (k === "marsh") {
    // sedge: tall pale blades, now and then a bulrush
    pxTuft(B, bx, by, 4 + (hash(seed, 2) * 2 | 0), Q.blades, seed, 1.7);
    if (hash(seed, 5) > 0.6) { const c = RGB("#6a4a30"); for (let j = 0; j < 3; j++) B.put(bx + 1, by - 9 - j, j === 0 ? dkC(c, 0.2) : c); }
    return;
  }
  pxTuft(B, bx, by, 3 + (hash(seed, 3) * 3 | 0), Q.blades, seed, k === "turf" ? 0.8 : 1);
  if (hash(seed, 8) > 0.45) pxTuft(B, bx - 4, by + 2, 2, Q.blades, seed + 1, 0.7);
  if (k === "turf" && hash(seed, 9) > 0.5) pxRubble(B, bx - 6, by + 3, 4, 3, RGB(P.pebble), seed, false);
};

const GROUND = { key: "", under: null, x0: 0, y0: -14, w: 0, h: 0, braziers: [], fresh: false, bakeShort: null, shortCv: null, bakeOver: null, overCv: null };
// Without the hook in draw.js the ground is laid after the horde has been
// drawn, so then it keeps off the road where they walk. The game always has
// the hook, so that version is only baked if something asks for it.
Object.defineProperty(GROUND, "short", { get() { if (!this.shortCv && this.bakeShort) this.shortCv = this.bakeShort(); return this.shortCv; } });
// What lies over the wall's foot is baked when it is first drawn, after the
// stone of the same tier, so its rubble heaps lie under the curtain's cracks
// (paintCastleStone hands them out as CASTLE.cracks).
Object.defineProperty(GROUND, "over", { get() { if (!this.overCv && this.bakeOver) this.overCv = this.bakeOver(); return this.overCv; } });
const groundBakes = (gx, gy, tier) => {
  const key = `${gx}|${gy}|${W}|${H}|${REALM.id}|${PX}`;
  if (typeof document === "undefined") return GROUND.under ? GROUND : null;
  const x0 = PAVE_X - 6, y0 = -14, w = 764 - x0, h = H + 28;
  const layer = (fn) => bakeSprite(w, h, (c) => { c.translate(-x0, -y0); fn(c, pixels(x0, y0, w, h)); }, false);
  if (GROUND.key !== key) {
    // the ground itself doesn't change as the siege goes on: baked once a board
    Object.assign(GROUND, {
      key, x0, y0, w, h, tier: -1,
      under: layer((c, B) => paintGroundUnder(c, gy, true, B)),
      shortCv: null, bakeShort: () => layer((c, B) => paintGroundUnder(c, gy, false, B)),
    });
  }
  if (GROUND.tier !== tier) {
    GROUND.tier = tier; GROUND.overCv = null; GROUND.braziers = [];
    GROUND.bakeOver = () => {
      const out = { braziers: [] };
      const cv = layer((c, B) => paintGroundOver(c, gx, gy, tier, out, B, CASTLE.cracks || []));
      GROUND.braziers = out.braziers;
      return cv;
    };
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
    // a gold stripe down its middle, as the title's pennants have
    if (h > 2) { ctx.fillStyle = GOLD; ctx.fillRect(S2(cx), S2(cy + h / 2 - 0.5), 1, big ? 1 : 0.5); }
  }
};

// The royal standard on the keep: a big square flag of the crown's blue with
// a gold hem and a gold crown, flying toward the field on a tall pole, the
// wave running down it column by column.
const CROWN_PX = [[0, 0], [2, 0], [4, 0], [0, 1], [2, 1], [4, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3], [4, 3]];
const royalStandard = (ctx, x, y, time) => {
  const P = 30, L = 17, F = 11;
  box(ctx, x - 1, y - P, 2, P, INK_LINE);
  box(ctx, x - 0.5, y - P + 0.5, 1, P - 1, "#8a6a44");
  ball(ctx, x, y - P - 0.5, 1.3, 1.3, GOLD, { hi: 0.5, lo: 0.3 });
  const cols = [];
  for (let i = 0; i < L; i++) {
    const w = Math.round(Math.sin(time * 5 - i * 0.55) * (0.3 + i * 0.09) * 2) / 2;
    const notch = i >= L - 3 ? (i - (L - 4)) * 1.5 : 0;     // cut to a swallowtail
    cols.push([x - 1 - i * 0.5 * 2, y - P + 1 + w, notch]);
  }
  ctx.fillStyle = INK_LINE;
  for (const [cx, cy] of cols) ctx.fillRect(S2(cx) - 0.5, S2(cy) - 0.5, 1.5, F + 1);
  cols.forEach(([cx, cy, notch], i) => {
    const X = S2(cx), Y = S2(cy);
    ctx.fillStyle = i < 3 ? lighten(BANNER, 0.12) : BANNER; ctx.fillRect(X, Y, 1, F);
    ctx.fillStyle = GOLD; ctx.fillRect(X, Y, 1, 1); ctx.fillRect(X, Y + F - 1, 1, 1);
    ctx.fillStyle = lighten(BANNER, 0.3); ctx.fillRect(X, Y + 1, 1, 0.5);
    if (notch) { ctx.fillStyle = INK_LINE; ctx.fillRect(X - 0.5, Y + F / 2 - notch / 2, 1.5, notch); }
  });
  // the crown, a little in from the hoist
  for (const [dx, dy] of CROWN_PX) {
    const col = cols[5 + dx]; if (!col) continue;
    ctx.fillStyle = dy < 2 ? lighten(GOLD, 0.2) : GOLD;
    ctx.fillRect(S2(col[0]), S2(col[1] + 3 + dy), 1, 1);
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
  CASTLE.flags.forEach(([x, y, gate], i) => (gate === 2 ? royalStandard(ctx, x, y, time) : pennant(ctx, x, y - 1.5, time, i * 1.7, BANNER)));
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
    cylinder(ctx, CREW - 40, y - 2, 20, 3, "#8a6a40", { r: 1, hi: 0.3, lo: 0.5 });
    cylinder(ctx, CREW - 36, y - 10, 7, 6, "#6e6a60", { r: 1.5, hi: 0.3, lo: 0.5 });
    ctx.fillStyle = "#d8d0c0"; ctx.fillRect(CREW - 35, y - 10, 5, 1.2);
    const fr = Math.floor(((time * 2 + k) % 2));
    const cv = workFrame(`mason|${fr}`, 30, 36, (c) => drawMason(c, 12, 33, 1, WALL_FOLK.mason, fr));
    if (cv) ctx.drawImage(cv, CREW - 24 - 12, y - 33 - 2, 30, 36);
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
      if (cv) ctx.drawImage(cv, BOW_X + 2 - 17 + (Math.round(spots[i] / 24) % 2 ? 4 : -1), y - 33, 30, 36);
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
