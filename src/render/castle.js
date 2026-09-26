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
// A concentric castle down the right edge of the board, running on off the
// edge of it (the screen cuts it; there is no yard and there are no houses
// to see). Drawn in the board's 3/4 camera: we look north and down, so a
// point z high is drawn z up the board and LEAN*z to the east — on every
// face alike, towers, walls and gate: tops in the sun, south faces in their
// own shade, and a north-south wall showing its west face as a strip leaning
// back from its foot. Every course of stone is COURSE high, so the courses
// of a wall run on round the corner into a tower's.
//
// Left to right: the OUTER CURTAIN (HC high) with its battlements and the
// walk the works' crews stand on; the INNER CURTAIN rising behind it (HI
// high), its battlements, and its walk running on off the board, where the
// sentry keeps his beat and stairs go down on the far side. Square TOWERS
// stand proud of the outer face, rise well above both walls and run back
// into the inner wall's parapet; the inner walk passes on behind them. The
// walks never pass OVER a tower: each wall ends against a tower's flank (the
// outer walk at a door), the footing and a string course run on round its
// foot, and the corners where wall meets tower sit in its shadow. Where the
// road arrives, the GATE BLOCK: one massive gatehouse through both walls, a
// step higher than either, with an arch as wide as the road; the north gate
// tower rises out of its north end and the KEEP out of its far end, sheer
// above the inner walk, the crown's banners down its face and the royal
// standard on its top.
const LEAN = 0.5;                        // east per unit of height, on every face
const COURSE = 3.5;                      // a course of stone: 1.75 east on a west face
const HC = 14, HI = 28, HG = 31.5, HK = 56;   // outer walk, inner walk, gate block's top, keep's top
// Across the band, left to right (screen x): the outer face (foot, top), its
// parapet, the walk, the inner face's top, its parapet; the inner walk runs
// on to its far parapet (back), whose merlons the board's edge cuts.
const WALL = { face0: 749, face1: 749 + HC * LEAN, par1: 766, walk1: 796, face2: 796 + (HI - HC) * LEAN, par2: 812, back: 834 };
const XE = W + 8;
// the board's stone is baked this far past its top and bottom; the landscape
// beyond the board paints its own lengths of the same wall (bakeCastleRun)
const TOP = -14, BOT = H + 14;
// the crews on the walk are placed from here (the board's right edge, before
// the castle's band was widened)
const CREW = 800;
const S2 = (v) => Math.round(v * 2) / 2;          // snap to the art pixel
// the gatehouse's west face: its foot (where the arch opens) and its top
const GATE = { face0: 741, face1: S2(741 + HG * LEAN) };
const GH = 40;                           // the gatehouse's south face, below the gate's centreline
const GATE_H = 35;                       // the north gate tower: low enough that its foot clears the arch
// the keep: its west face's foot on the gate block's top (screen x), and its
// north end, north of the gate's centreline; its south face is the gate's
const KEEP = { b: 798, n: 6 };
const GOLD = "#d8b34a", BANNER = "#34508e";
const MERLON = 15;
// past the board's ends the towers carry on this far apart
const RUN_STEP = 105;
// long bands (the inner walk, its far parapet, the ground's dressing) are laid
// from this line far up the wall, so any length of them matches any other
const ANCHOR = -4096;

// Where a tower stands: its deck (tN..tS, where the crews stand — fixed by
// the works' spots in data/castle.js), its height, and so its footprint on
// the ground (yN..yS) and its west face (x0 at the foot, x1 at the deck).
// gate: -1 the north gate tower, 1 the south one, 0 a tower on the wall.
const towerGeo = (foot, gate = 0) => {
  const h = gate < 0 ? GATE_H : TOWER.h, x0 = gate ? TOWER.x0 - 2 : TOWER.x0;
  const tN = foot - TOWER.n - TOWER.h, tS = foot + TOWER.s - TOWER.h;
  return { h, x0, x1: S2(x0 + h * LEAN), tN, tS, yN: tN + h, yS: tS + h };
};

const tone = (c, v) => (v >= 0 ? lighten(c, v) : darken(c, -v));
const box = (c, x, y, w, h, col) => {
  const x0 = S2(x), y0 = S2(y), w2 = S2(x + w) - x0, h2 = S2(y + h) - y0;
  if (w2 <= 0 || h2 <= 0) return;
  c.fillStyle = col;
  c.fillRect(x0, y0, w2, h2);
};
const poly = (c, pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); };
const isWet = (x, y) => inRiverAt(x, y) || (TERRAIN.inSea ? TERRAIN.inSea(x, y, 1) : false);
const inRiverAt = (x, y) => TERRAIN.inRiver(x, y, 1);

// One piece of the castle painted on its own small layer and given a thin
// ink edge, like paint.js part() but only as big as the piece, so the bake
// stays quick. `bb` is the piece's bounds in world units, with room for ink.
// (One scratch layer, reused: resizing it clears it, and a canvas made per
// piece was a good part of the bake.)
const LAYER = { cv: null, k: null };
const piece = (c, [x0, y0, x1, y1], fn) => {
  if (!PIXEL || STYLE.inner <= 0 || typeof document === "undefined") { fn(c); return; }
  const m = c.getTransform();
  const dx0 = Math.floor(m.a * x0 + m.e), dy0 = Math.floor(m.d * y0 + m.f);
  const w = Math.ceil(m.a * (x1 - x0)) + 2, h = Math.ceil(m.d * (y1 - y0)) + 2;
  // clear of the canvas it goes on: nothing to paint
  if (dx0 + w < 0 || dy0 + h < 0 || dx0 > c.canvas.width || dy0 > c.canvas.height) return;
  if (!LAYER.cv) { LAYER.cv = document.createElement("canvas"); LAYER.k = LAYER.cv.getContext("2d", { willReadFrequently: true }); }   // it is read straight back for the ink
  const layer = LAYER.cv, k = LAYER.k;
  layer.width = w; layer.height = h;
  k.imageSmoothingEnabled = false;
  k.setTransform(m.a, 0, 0, m.d, m.e - dx0, m.f - dy0);
  fn(k);
  inkOutline(layer, INK_LINE, STYLE.inner);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(layer, dx0, dy0); c.restore();
};

// A west face of coursed stone, from screen x a (its foot) to b (its top):
// one column per course (COURSE high, LEAN*COURSE east), so they meet a
// south face's rows at the corner, stacked foot to top, their blocks running
// down the board. In its own light, darkest at the foot; `clip` cuts its
// ends (on the slant, where it meets a south face). `foot`: it stands in the
// ground, so moss.
const westFace = (c, a, b, y0, y1, clip, seed, o = {}) => piece(c, [a - 1, y0 - 1, b + 1, y1 + 1], (k) => {
  const S1 = CASTLE_STONE;
  k.save();
  if (clip) { poly(k, clip); k.clip(); }
  box(k, a, y0, b - a, y1 - y0, darken(S1, 0.48));
  const n = Math.max(1, Math.round((b - a) / (COURSE * LEAN))), cw = (b - a) / n, dark = o.dark ?? 0;
  for (let col = 0; col < n; col++) {
    const x = a + col * cw, up = n > 1 ? col / (n - 1) : 0.5;
    const base = -0.42 + up * 0.28 - dark;
    let y = y0 - hash(seed + col, 1) * 12, i = 0;
    while (y < y1) {
      const len = 7 + Math.floor(hash(seed + col * 31, i + 5) * 4) * 2;
      box(k, x + 0.5, y + 0.5, cw - 0.5, len - 0.5, tone(S1, base + (hash(seed + col * 7, i * 3 + 2) - 0.5) * 0.1));
      y += len; i++;
    }
  }
  // the long mortar seams between the courses, half filled with grime
  k.fillStyle = rgba(darken(S1, 0.3), 0.6);
  for (let col = 1; col < n; col++) for (let y = y0; y < y1; y += 4) if (hash(seed + col, Math.floor(y)) < 0.3) k.fillRect(S2(a + col * cw), S2(y), 0.5, 4);
  if (o.foot) mossUp(k, a, y0, y1, seed);
  k.restore();
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

// A south face in its own shade: rows of stone COURSE high stacked up from
// its foot (yS) — the same heights as the west faces' courses, so they run
// on round the corners — its west end on the slant (x0 at the foot), running
// on east off the board. `clip` is the part the walls in front leave in sight.
const southFace = (c, x0, yS, h, clip, bb, seed) => piece(c, bb, (k) => {
  const S1 = CASTLE_STONE;
  k.save(); poly(k, clip); k.clip();
  box(k, x0 - 1, yS - h - 1, XE - x0 + 2, h + 2, darken(S1, 0.55));
  for (let r = 0; r * COURSE < h; r++) {
    const zb = r * COURSE, zt = Math.min(h, zb + COURSE), yb = yS - zb, yt = yS - zt;
    if (yb < bb[1] || yt > bb[3]) continue;
    let x = x0 + zb * LEAN - hash(seed, r) * 9, i = 0;
    while (x < XE) {
      const len = 7 + Math.floor(hash(seed + 1 + r, i) * 3) * 2;
      box(k, x + 0.5, yt + 0.5, len - 0.5, yb - yt - 0.5, tone(S1, -0.36 + (zb / h) * 0.08 + (hash(seed + 2 + r, i) - 0.5) * 0.1));
      x += len; i++;
    }
  }
  k.restore();
});

// The footing course at the very foot of a west face, from y0 to y1: big
// weathered blocks standing a step proud of it, lit along their tops, half
// sunk in the ground (the ground's own earth and turf are laid back over
// them afterwards) — and, given `xs`, on round the corner along a south
// face's foot at y1 as far as xs: the same blocks seen from the south, a lit
// top and a dark front. One inked piece.
const plinth = (c, x, y0, y1, seed, xs = null) => piece(c, [x - 4, y0 - 1, (xs ?? x) + 1, y1 + 2], (k) => {
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
  if (xs == null) return;
  const xa = x - 2.5, ys = y1;
  box(k, xa, ys - 1.5, xs - xa, 2.5, darken(S1, 0.5));
  for (let x2 = xa, j = 0; x2 < xs - 0.5; j++) {
    const len = Math.min(xs - x2, 4 + Math.floor(hash(seed + j, 5) * 3) * 1.5), v = (hash(seed + j, 6) - 0.5) * 0.1;
    box(k, x2 + 0.5, ys - 1.5, len - 0.5, 1, tone(S1, 0.14 + v));
    box(k, x2 + 0.5, ys - 0.5, len - 0.5, 1, tone(S1, -0.34 + v));
    x2 += len;
  }
});

// Battlements along the top of a west face, from x0 (its lip) to x1: a
// sunlit coping, and merlons standing up off it — bright on top, dark on
// their south faces — with the low crenels between. The first merlon stands
// at `first` (against a tower's flank where a stretch starts at one).
// Knocked off as the siege goes on; their stones go down on the walk.
// `anchor`: the coping laid in step from that line (a band that must match
// any other length of itself).
const battlement = (c, x0, x1, y0, y1, first, tier, seed, hurt, anchor = null) => {
  const S1 = CASTLE_STONE, shade = [];
  // one inked piece: the coping, then the merlons with their own ink rings
  // drawn in (as a piece of their own would get them), so the bake stays quick
  piece(c, [x0 - 1, Math.min(y0, first) - 1, x1 + 1, y1 + 1], (k) => {
    box(k, x0, y0, x1 - x0, y1 - y0, darken(S1, 0.5));
    const s = anchor == null ? y0 - hash(seed, 4) * 6 : anchor + 6 * Math.floor((y0 - anchor) / 6);
    let i = anchor == null ? 0 : Math.round((s - anchor) / 6);
    for (let y = s; y < y1; y += 6, i++) {
      const v = (hash(seed + 5, i) - 0.5) * 0.08;
      box(k, x0 + 0.5, Math.max(y0, y) + 0.5, 2, 5.5, tone(S1, 0.3 + v));
      box(k, x0 + 3, Math.max(y0, y) + 0.5, x1 - x0 - 3.5, 5.5, tone(S1, -0.16 + v));
    }
    for (let y = first; y < y1 - 8; y += MERLON) {
      const h = hash(seed + 11, Math.floor(y));
      if (tier >= 2 && y > first + 4 && h < (tier >= 3 ? 0.34 : 0.2)) {
        // knocked off: a ragged stump, and its stones down on the walk
        box(k, x0 + 2.5, y + 3.5, 4.5, 4.5, INK_LINE);
        box(k, x0 + 3, y + 4, 3.5, 2, tone(S1, 0.24));
        box(k, x0 + 3, y + 6, 3.5, 1.5, tone(S1, -0.36));
        hurt.push([x1 + 3 + hash(seed, y) * 7, y + 7]);
        continue;
      }
      box(k, x0, y - 0.5, x1 - x0 + 0.5, 10, INK_LINE);
      box(k, x0 + 0.5, y, 2.5, 9, tone(S1, 0.18));
      box(k, x0 + 3, y, x1 - x0 - 3, 6, tone(S1, 0.42 + (h - 0.5) * 0.08));
      box(k, x0 + 3, y, x1 - x0 - 3, 1, tone(S1, 0.55));
      box(k, x0 + 3, y + 6, x1 - x0 - 3, 3, tone(S1, -0.36));
      if (tier >= 1 && h > 0.86) {
        // a chipped corner
        box(k, x1 - 3, y - 0.5, 3, 4, INK_LINE);
        box(k, x1 - 2.5, y - 0.5, 2.5, 3.5, tone(S1, -0.16));
      }
      shade.push(y);
    }
  });
  return shade;
};

// A walk: big worn flags between x0 and x1, lit by how high it stands
// (`lift`: the higher, the brighter)... Painted straight in, not as an
// inked piece: the battlements either side of it carry the ink, and the
// bake stays quick. `anchor`: its rows laid from that line.
const walkFlags = (k, x0, x1, y0, y1, seed, lift = -0.1, anchor = null) => {
  const S1 = CASTLE_STONE;
  box(k, x0, y0, x1 - x0, y1 - y0, darken(S1, 0.36));
  let row = 0, y = anchor == null ? y0 - hash(seed, 8) * 6 : anchor;
  while (y < y1) {
    const h = 7 + Math.floor(hash(seed + 3, row) * 3) * 1.5;
    if (y + h > y0) {
      const off = hash(seed + 4, row) * 8;
      const cuts = [x0];
      for (let x = x0 + 8 + off; x < x1 - 4; x += 12 + hash(seed + row, cuts.length) * 6) cuts.push(x);
      cuts.push(x1);
      for (let i = 0; i < cuts.length - 1; i++) {
        const v = (hash(seed + row * 3, i + 1) - 0.5) * 0.12;
        box(k, cuts[i] + 0.5, Math.max(y0, y) + 0.5, cuts[i + 1] - cuts[i] - 0.5, Math.min(y1, y + h) - Math.max(y0, y) - 0.5, tone(S1, lift + v));
      }
    }
    y += h; row++;
  }
};
// ...the realm's weather on it: snow drifted in the lee of its parapet (at
// x0) and lying in the joints, grey ash, or moss in them; and on the crews'
// walk (`beat`) the flags along it worn pale
const walkWeather = (c, x0, x1, y0, y1, seed, beat = false) => {
  const kind = groundKind(), R = REALM, S1 = CASTLE_STONE;
  const snow = lighten(R.GRASS_LT || "#e2ecf2", 0.1), lee = mix(R.GRASS_LT || "#e2ecf2", "#8aa2b8", 0.4);
  if (beat) { c.fillStyle = "rgba(255,243,210,0.07)"; c.fillRect(S2(x0 + 5), S2(y0), 19, S2(y1 - y0)); }
  for (let y = 2 * Math.floor(y0 / 2); y < y1; y += 2) {
    const h = hash(seed + 71, y);
    if (kind === "snow") {
      if (h > 0.25) box(c, x0 + 0.5, y, 1 + hash(seed + 72, y) * 3.5, 2, (y >> 1) % 5 ? snow : lee);
      if (h > 0.78) box(c, x0 + 6 + hash(seed + 73, y) * (x1 - x0 - 10), y, 2 + hash(seed + 74, y) * 4, 1, lighten(R.GRASS_LT || "#e2ecf2", 0.04));
    } else if (h > 0.84) {
      const x = x0 + 5 + hash(seed + 73, y) * (x1 - x0 - 8);
      const col = kind === "ash" ? mix(R.GRASS_LT || "#584a44", "#7a7068", 0.5) : kind === "marsh" ? mix(R.GRASS_DK || "#4a5a3a", S1, 0.4) : mix(R.GRASS || "#82b256", S1, 0.45);
      box(c, x, y, 1.5 + hash(seed + 74, y) * 3, 0.5, col);
    }
  }
};
// ...and the parapet's shadow along its west edge, each merlon's thrown
// down-right across it
const walkShade = (c, x0, y0, y1, shade) => {
  c.fillStyle = "rgba(34,24,38,0.3)";
  c.fillRect(x0, y0, 3, y1 - y0);
  for (const y of shade) if (y + 3 >= y0 && y + 3 < y1) c.fillRect(x0 + 3, y + 3, 3, Math.min(8, y1 - y - 3));
};

// On the snow realms, snow lying on a flagged top: drifted along the foot of
// its north parapet and in patches across it.
const snowOn = (k, xa, xb, ya, yb, seed) => {
  if (groundKind() !== "snow") return;
  const top = lighten(REALM.GRASS_LT || "#e2ecf2", 0.1), lee = mix(REALM.GRASS_LT || "#e2ecf2", "#8aa2b8", 0.4);
  for (let x = xa; x < xb; x += 1) {
    const d = 1 + Math.floor(hash(seed + 3, x) * 3) * 0.5;
    box(k, x, ya, 1, d, top);
    if (hash(seed + 4, x) > 0.6) box(k, x, ya + d, 1, 0.5, lee);
  }
  for (let i = 0; i < (xb - xa) * (yb - ya) / 60; i++) {
    const x = xa + hash(seed + 5, i) * (xb - xa - 4), y = ya + 3 + hash(seed + 6, i) * (yb - ya - 5);
    box(k, x, y, 2 + hash(seed + 7, i) * 4, 1, top);
  }
};

// a fallen chip of stone: lit top, dark underside
const rubble = (c, x, y, seed) => {
  const w = 2 + Math.floor(hash(seed, 5) * 3) * 0.5;
  box(c, x - w / 2, y - 1, w, 1, lighten(CASTLE_STONE, 0.25));
  box(c, x - w / 2, y, w, 1, darken(CASTLE_STONE, 0.3));
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
// A door in a south face where a walk runs in, its sill at y: a round-headed
// dark opening, its east reveal catching the light, the sill worn pale.
const door = (c, x, y, w, h) => piece(c, [x - 2, y - h - 2, x + w + 2, y + 1], (k) => {
  const S1 = CASTLE_STONE, r = w / 2;
  k.beginPath(); k.moveTo(x - 1, y); k.lineTo(x - 1, y - h + r); k.arc(x + r, y - h + r, r + 1, Math.PI, 0); k.lineTo(x + w + 1, y); k.closePath();
  k.fillStyle = tone(S1, -0.12); k.fill();
  k.beginPath(); k.moveTo(x, y); k.lineTo(x, y - h + r); k.arc(x + r, y - h + r, r, Math.PI, 0); k.lineTo(x + w, y); k.closePath();
  k.fillStyle = "#1e1620"; k.fill();
  box(k, x + w - 1.5, y - h + r, 1, h - r, tone(S1, -0.3));
  box(k, x, y - 1, w, 1, tone(S1, 0.1));
});

// A parapet jutting out on corbels, as the title screen's castle has them.
// Along a south face's top edge [xa, xb] at y: the parapet's own outer face,
// the row of corbels under it, and the shadow the overhang throws — and, with
// `w`, the same along the west face's top edge at xa from w[0] to w[1] (the
// lip catches the sun; the corbels stand down the face toward its foot).
const corbels = (c, xa, xb, y, w = null) => {
  const S1 = CASTLE_STONE;
  c.fillStyle = "rgba(30,22,32,0.42)"; c.fillRect(S2(xa), S2(y + 4.5), S2(xb - xa), 2);
  const x = xa + 1.5;
  if (w) { c.fillStyle = "rgba(30,22,32,0.32)"; c.fillRect(S2(x - 4.5), S2(w[0]), 1.5, S2(w[1] - w[0])); }
  piece(c, [(w ? x - 4 : xa) - 1, w ? w[0] - 1 : y - 1, xb + 1, y + 6], (k) => {
    if (w) {
      box(k, x - 1.5, w[0], 1.5, w[1] - w[0], tone(S1, 0.14));
      box(k, x - 1.5, w[0], 0.5, w[1] - w[0], tone(S1, 0.34));
      for (let yy = w[0] + 1; yy < w[1] - 1.5; yy += 3.2) box(k, x - 3, yy, 1.5, 1.8, tone(S1, -0.06));
    }
    box(k, xa, y, xb - xa, 2.5, tone(S1, 0.02));
    box(k, xa, y, xb - xa, 0.5, tone(S1, 0.24));
    box(k, xa, y + 2, xb - xa, 0.5, tone(S1, -0.2));
    for (let xx = xa + 0.5; xx < xb - 1.5; xx += 3.2) {
      box(k, xx, y + 2.5, 1.8, 1.5, tone(S1, -0.04));
      box(k, xx, y + 4, 1.8, 0.5, tone(S1, -0.5));
    }
  });
};
// ...and along a west face's top edge alone, at x from ya to yb
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
    if (groundKind() === "snow") {
      // snow on its sunward facet, thinning toward the eaves
      tri([[x0 + 1.5, yb - 1.5], [cx - 0.5, apex + 1.5], [x0 + 1.5, yN + 1]], lighten(REALM.GRASS_LT || "#e2ecf2", 0.1));
    }
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

// big chunky merlons on a tower's rim, as the title's: a sunlit top and a pale front
const merlonAt = (k, x, y, w, d, face) => {
  const S1 = CASTLE_STONE;
  box(k, x, y - d, w, d, tone(S1, 0.46));
  box(k, x, y - d, w, 0.5, tone(S1, 0.6));
  box(k, x, y, w, face, tone(S1, -0.06));
  box(k, x + w - 1, y, 1, face, tone(S1, -0.24));
};

// The towers' and the keep's flagged tops: a shade warmer and lighter than
// the walks, so at a glance a tower reads apart from the wall it binds.
const DECK = mix(CASTLE_STONE, "#d2bc94", 0.3);
const OAK = "#7a5334";
// a flagged top x1..E by tN..tS: a sunlit rim round a sunken floor of flags,
// in shade under its north parapet, snow on it on the snow realms
const flagTop = (k, x1, E, tN, tS, seed) => {
  const S1 = CASTLE_STONE, D = DECK;
  const f0 = x1 + 3, f1 = E - 3, g0 = tN + 3, g1 = tS - 2.5;
  box(k, x1, tN, E - x1, tS - tN, tone(S1, 0.26));
  box(k, x1, tN, E - x1, 1, tone(S1, 0.42));
  box(k, x1, tN, 1, tS - tN, tone(S1, 0.36));
  box(k, E - 1, tN, 1, tS - tN, tone(S1, -0.1));
  box(k, f0, g0, f1 - f0, g1 - g0, darken(D, 0.42));
  let row = 0;
  for (let y = g0; y < g1; row++) {
    const rh = 5 + Math.floor(hash(seed + 21, row) * 2) * 1.5;
    let x = f0 - hash(seed + 22, row) * 6, i = 0;
    while (x < f1) {
      const len = 6 + Math.floor(hash(seed + 23 + row, i) * 3) * 1.5;
      const a = Math.max(f0, x), b = Math.min(f1, x + len);
      if (b - a > 1) box(k, a + 0.5, y + 0.5, b - a - 0.5, Math.min(g1, y + rh) - y - 0.5, tone(D, 0.02 + (hash(seed + 24 + row, i) - 0.5) * 0.12));
      x += len; i++;
    }
    y += rh;
  }
  // the north parapet's inner face, in shade, and the west parapet's shadow on the flags
  box(k, f0, g0, f1 - f0, 3, tone(S1, -0.4));
  snowOn(k, f0, f1, g0 + 3, g1, seed);
  k.fillStyle = "rgba(34,24,38,0.28)";
  k.fillRect(S2(f0), S2(g0 + 2), 2.5, S2(g1 - g0 - 2));
  return { f0, f1, g0, g1 };
};
// A tower's open top, x1..E by tN..tS: the flagged top, merlons all round
// (gone as the siege goes on), a stair turret with a red roof toward the far
// corner and an oak trapdoor down into the tower. Returns the roof's apex.
const deck = (c, x1, E, tN, tS, o) => {
  const S1 = CASTLE_STONE, seed = o.seed;
  // the turret and the trapdoor sit a little differently on every tower
  const tsh = Math.round(hash(seed, 13) * 2) * 2, tx0 = E - 12 - tsh, tx1 = E - 1 - tsh, tb = tN + 9;
  piece(c, [x1 - 1, tN - 1, E + 1, tS + 1], (k) => {
    const { f0, g0, g1 } = flagTop(k, x1, E, tN, tS, seed);
    // wear down the middle, where the crews stand
    k.fillStyle = "rgba(255,243,210,0.07)";
    k.fillRect(S2(f0 + 6), S2(g0 + 6), 22, S2(g1 - g0 - 9));
    const hx = E - 18 - Math.round(hash(seed, 14) * 2) * 2, hy = tb + 5 + Math.round(hash(seed, 15) * 2);
    box(k, hx, hy, 9, 7, "#2e2224");
    box(k, hx + 0.5, hy + 0.5, 8, 6, OAK);
    box(k, hx + 0.5, hy + 0.5, 8, 0.5, lighten(OAK, 0.25));
    for (const dx of [3, 5.5]) box(k, hx + dx, hy + 0.5, 0.5, 6, darken(OAK, 0.35));
    box(k, hx + 1, hy + 2, 7, 0.5, "#4a4450"); box(k, hx + 1, hy + 4.5, 7, 0.5, "#4a4450");
  });
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
    for (let x = x1 + 1.5; x < tx0 - 5; x += 8.5, j++) {
      if (gone(j)) { box(k, x, tN - 0.5, 5.5, 1.5, tone(S1, -0.1)); continue; }
      merlonAt(k, x, tN - 0.5, 5.5, 3.5, 2.5);
    }
    if (E - tx1 > 3.5) merlonAt(k, E - 4, tN - 0.5, 3, 3.5, 2.5);
    for (let y = tN + 7; y < tS - 5; y += 7.5, j++) {
      for (const x of [x1 - 1.5, E - 3.5]) {
        if (x > x1 && y < tb + 3) continue;
        if (gone(j + (x > x1 ? 50 : 0))) continue;
        merlonAt(k, x, y, 3.5, 3.5, 2);
      }
    }
    for (let x = x1 - 1; x < E - 4; x += 8.5, j++) {
      if (gone(j)) { box(k, x, tS - 1.5, 5.5, 1.5, tone(S1, -0.1)); continue; }
      merlonAt(k, x, tS - 0.5, 5.5, 3.5, 3);
    }
  });
  return top || [(tx0 + tx1) / 2, tN];
};

// A tower's string course at the outer walk's height: a band of dressed
// stone round its foot where it stands proud of the curtain, carrying the
// line of the curtain's coping on across its flank and up its west face.
const string = (c, x0, x1, h, yN, yS, z) => {
  const S1 = CASTLE_STONE, tl = (x1 - x0) / h, xz = S2(x0 + z * tl), y = yS - z;
  piece(c, [x0 - 1, yN - z - 3, WALL.face1 + 1, yS - z + 2], (k) => {
    k.save(); poly(k, [[x0, yS], [x1, yS - h], [WALL.face1, yS - h], [WALL.face1, y], [WALL.face0, yS]]); k.clip();
    box(k, xz, y - 1.5, WALL.face1 - xz, 1.5, tone(S1, -0.12));
    box(k, xz, y - 1.5, WALL.face1 - xz, 0.5, tone(S1, 0.14));
    k.restore();
    k.save(); poly(k, [[x0, yN], [x1, yN - h], [x1, yS - h], [x0, yS]]); k.clip();
    box(k, xz - 0.5, yN - z - 1.5, 1, yS - yN + 0.5, tone(S1, -0.16));
    box(k, xz + 0.5, yN - z - 1.5, 0.5, yS - yN + 0.5, tone(S1, 0.08));
    k.restore();
  });
};

// A culvert through the wall's foot at x for a river running in from ya to
// yb: arch ring, dark mouth, grate. `big` in a tower's broad face.
const culvert = (c, x0, ya, yb, big = false) => {
  const S1 = CASTLE_STONE, cy = (ya + yb) / 2, ry = (yb - ya) / 2 + 1, rx = big ? 7.5 : 6, ri = big ? 4.5 : 3.5;
  const mouth = (k, rx2, r2) => {
    k.beginPath(); k.moveTo(x0, cy - r2); k.lineTo(x0 + 1.5, cy - r2);
    k.ellipse(x0 + 1.5, cy, rx2, r2, 0, -Math.PI / 2, Math.PI / 2); k.lineTo(x0, cy + r2); k.closePath();
  };
  piece(c, [x0 - 2, cy - ry - 5, x0 + 12, cy + ry + 5], (k) => {
    mouth(k, rx, ry + 3.5);
    k.fillStyle = lighten(S1, 0.18); k.fill();
    mouth(k, ri, ry);
    k.fillStyle = "rgba(18,14,20,0.62)"; k.fill();
    k.save(); k.clip();
    for (let y = cy - ry + 2.5; y < cy + ry - 1; y += 3.5) box(k, x0, y, ri + 2.5, 1, "#4a4e5a");
    box(k, x0 + 3, cy - ry, 1, ry * 2, "#3a3e48");
    k.restore();
  });
};
// the parts of the rivers running in under the wall between ya and yb
const underWall = (wet, ya, yb) => wet.map(([a, b]) => [Math.max(a, ya), Math.min(b, yb)]).filter(([a, b]) => b - a > 2);

// A square tower on the wall. Its deck is where the crews stand (towerGeo);
// it rises from the grass proud of the outer face and runs back into the
// inner wall's parapet, so we see its west face whole, its south face down
// to the grass where it stands proud, and above that only down to where the
// walls south of it butt into it — the outer walk at a door in its flank,
// the inner wall's parapet higher up. The inner wall's walk runs on behind
// it. Returns where its flag, smoke, slits and top are, for the live
// pennant, torchlight and fire.
const TOWER_E = WALL.par2;               // its east rim: it is keyed into the inner parapet
const tower = (c, foot, o) => {
  const { h, x0, x1, tN, tS, yN, yS } = towerGeo(foot, o.gate);
  const seed = o.seed, E = TOWER_E;
  plinth(c, x0, yN + 1, yS, seed + 1, WALL.face0 + 1);
  westFace(c, x0, x1, tN, yS, [[x0, yN], [x1, tN], [x1, tS], [x0, yS]], seed + 3, { foot: true });
  for (const [a, b] of underWall(o.wet || [], yN, yS)) culvert(c, x0, a, b, true);
  // what stands south of it: the double wall, or (the north gate tower) the gate block
  const vis = o.gate < 0
    ? [[x0, yS], [x1, tS], [E, tS], [E, yS - HG], [GATE.face1, yS - HG], [GATE.face0, yS]]
    : [[x0, yS], [x1, tS], [E, tS], [E, yS - HI], [WALL.face2, yS - HI], [WALL.walk1, yS - HC], [WALL.face1, yS - HC], [WALL.face0, yS]];
  southFace(c, x0, yS, h, vis, [x0 - 1, tS - 1, E + 1, yS + 1], seed + 4);
  const slits = [];
  if (o.gate >= 0) {
    string(c, x0, x1, h, yN, yS, HC);
    // the outer walk runs in at a door; a slit in the flank looks down the
    // outer face, two more over the walk
    door(c, 777.5, yS - HC, 7, 9);
    [[WALL.face0 - 1, yS - 7.5], [770, yS - 26], [790, yS - 26]].forEach(([sx, sy], i) => {
      const lit = hash(seed + 51, i) > 0.45;
      slit(c, sx, sy, lit);
      if (lit) slits.push([sx, sy]);
    });
  }
  // the parapet juts out over both faces on a row of corbels
  corbels(c, x1 - 1.5, E, tS, [tN + 1, tS + 2.5]);
  const top = deck(c, x1, E, tN, tS, o);
  if (o.tier >= 2) {
    soot(c, x1 + 10, tS + 5, 9, (h - HC) * (o.tier >= 3 ? 0.8 : 0.45), seed);
    soot(c, x0 + 5, tS + 12, 4, h * (o.tier >= 3 ? 0.6 : 0.35), seed + 3);
  }
  if (o.tier >= 1) crack(c, x0 + 3 + hash(seed, 3) * 2, yS - h * 0.6 - hash(seed, 4) * 4, h * (0.2 + o.tier * 0.1), seed);
  return { flag: o.flag === false || o.broken ? null : top, smoke: top, slits, tN, tS, yS, x0, x1 };
};

// The stone is baked once per damage tier into an inked sprite; the road's
// dark under the gatehouse, torchlight, pennants, banners, smoke and fire
// are painted live.
let CASTLE = { key: "", cv: null, x0: 0, y0: 0, w: 0, h: 0, slits: [], flags: [], torches: [], burn: [], banners: [], perches: [], smoke: null };

// The gate block: one massive gatehouse through both walls where the road
// arrives, a step higher than either and running on off the board, the
// north gate tower rising out of its north end and the keep out of its far
// end. Its west face stands a step proud of the curtain's; the road runs
// east in under an arch in it, into the shadow of the passage, the
// portcullis's teeth hanging over the mouth. On its top, murder holes over
// the passage, where the guards and the cauldron stand.
const gateBlock = (c, gy, tier, hurt, out) => {
  const S1 = CASTLE_STONE, x0 = GATE.face0, x1 = GATE.face1, lean = (x1 - x0) / HG;
  const NT = towerGeo(gy + GATE_TOWER_N, -1), K = keepGeo(gy);
  const yN = NT.yS, yS = gy + GH;
  const tN = yN - HG, tS = yS - HG;
  const m0 = gy - PATH_HALF + 2, m1 = gy + PATH_HALF - 2, mz = 10;
  plinth(c, x0, yN + 1, m0 - 1, 44);
  plinth(c, x0, m1 + 1, yS, 45, WALL.face0 + 1);
  westFace(c, x0, x1, tN, yS, [[x0, yN], [x1, tN], [x1, tS], [x0, yS]], 43, { foot: true });
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
    archPath(k, 3); k.fillStyle = lighten(S1, 0.34); k.fill();
    k.save(); archPath(k, 3); k.clip();
    k.fillStyle = darken(S1, 0.08);
    for (let y = m0 - 3; y <= m1 + 3; y += 4.5) { const z = zAt(y, 3); k.fillRect(S2(x0 + z * lean - 2), S2(y - z), 2, 0.5); }
    k.fillStyle = lighten(S1, 0.5); k.fillRect(S2(x0), S2(m0 - 3), 0.5, 3); k.fillRect(S2(x0), S2(m1), 0.5, 3);
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
  // snow on it on the snow realms
  piece(c, [x1 - 1, tN - 1, XE + 1, tS + 1], (k) => {
    box(k, x1, tN, XE - x1, tS - tN, darken(S1, 0.34));
    let row = 0;
    for (let y = tN; y < tS; row++) {
      const h = 7 + Math.floor(hash(61, row) * 3) * 1.5, off = hash(62, row) * 7;
      const cuts = [x1];
      for (let x = x1 + 9 + off; x < XE - 4; x += 11 + hash(64, row * 5 + cuts.length) * 5) cuts.push(x);
      cuts.push(XE);
      for (let i = 0; i < cuts.length - 1; i++) box(k, cuts[i] + 0.5, y + 0.5, cuts[i + 1] - cuts[i] - 0.5, Math.min(tS, y + h) - y - 0.5, tone(S1, -0.0 + (hash(63 + row, i) - 0.5) * 0.14));
      y += h;
    }
    box(k, x1 + 12, m0 - HG, 2, m1 - m0, darken(S1, 0.55));
    for (const dy of [-12, 0, 12]) box(k, x1 + 17, gy - HG + dy - 1.5, 3, 3, darken(S1, 0.6));
    snowOn(k, x1 + 7, K.b, tN + 2, tS - 5, 64);
    // the north gate tower's shadow along its foot, and down its east side
    k.fillStyle = "rgba(30,22,32,0.36)"; k.fillRect(S2(x1), S2(tN), TOWER_E - x1, 4);
    k.fillStyle = "rgba(30,22,32,0.16)"; k.fillRect(S2(x1 + 3), S2(tN + 4), TOWER_E - x1 - 3, 2.5);
  });
  // its south face: down to the grass where it stands proud of the curtain,
  // down to the outer walk behind that, and a step above the inner walk —
  // and at its far end on up, sheer, as the keep's
  const vis = [[x0, yS], [x1, tS], [K.b, tS], [K.x1, K.tS], [XE, K.tS], [XE, yS - HI], [WALL.face2, yS - HI], [WALL.walk1, yS - HC], [WALL.face1, yS - HC], [WALL.face0, yS]];
  southFace(c, x0, yS, HK, vis, [x0 - 1, K.tS - 1, XE + 1, yS + 1], 81);
  string(c, x0, x1, HG, yN, yS, HC);
  door(c, 772, yS - HC, 6.5, 8);
  corbels(c, x1 - 1.5, K.b, tS, [tN + 1, tS + 2.5]);
  // battlements down its west rim and along its south rim, to the keep's foot
  const shade = battlement(c, x1, x1 + 7, tN, tS - 5, tN + 3, tier, 47, hurt);
  c.fillStyle = "rgba(34,24,38,0.3)";
  c.fillRect(x1 + 7, tN + 4, 3, tS - tN - 9);
  for (const y of shade) c.fillRect(x1 + 10, y + 3, 3, 8);
  for (const y of shade) out.perches.push([x1 + 5, y + 2.5]);
  piece(c, [x1 - 1, tS - 10, K.b + 1, tS + 1], (k) => {
    box(k, x1, tS - 5, K.b - x1, 5, darken(S1, 0.45));
    box(k, x1 + 0.5, tS - 4.5, K.b - x1 - 0.5, 1.5, tone(S1, 0.3));
    box(k, x1 + 0.5, tS - 3, K.b - x1 - 0.5, 2.5, tone(S1, -0.12));
    for (let x = x1 + 1; x < K.b - 5; x += 10) {
      if (tier >= 2 && hash(71, x) < (tier >= 3 ? 0.35 : 0.2)) { hurt.push([x + 2, tS - 12]); continue; }
      box(k, x, tS - 9, 6, 5, tone(S1, 0.4));
      box(k, x, tS - 4, 6, 3.5, tone(S1, -0.3));
      if (x > x1 + 20) out.perches.push([x + 3, tS - 7]);
    }
  });
  slit(c, 791.5, tS + 10, true);
  out.slits.push([791.5, tS + 10]);
  // the torches on brackets either side of the mouth
  for (const y of [m0 - 5, m1 + 5]) {
    const tx = x0 + 6 * lean, ty = y - 6;
    box(c, tx - 2, ty + 1, 3, 1.5, "#3a3440");
    box(c, tx - 1.25, ty - 3, 1.5, 4.5, "#6a4a2e");
    out.torches.push([tx - 0.5, ty - 3]);
  }
  if (tier >= 1) crackAcross(c, x0 + 0.5, yN + 6, 7, 70);
  if (tier >= 2) { crackAcross(c, x0 + 0.5, yS - 4, 8, 71); crack(c, 764, tS + 6, 8, 72); soot(c, 776, tS + 4, 10, 10, 73); }
  keep(c, gy, tier, out);
  return { tN, tS };
};

// The keep: a tall square tower rising out of the gate block's far end and
// running off the board, as the title screen's castle has it behind its
// gate — the castle's landmark. Its south face runs on up from the gate
// block's, so from the inner walk it rises sheer; its battlemented top juts
// out on corbels, a stair turret with a red roof in the far corner, the
// guardroom chimney, the crown's banners down its south face and the royal
// standard over it all.
const keepGeo = (gy) => {
  const yN = gy - KEEP.n, yS = gy + GH, b = KEEP.b;
  // b: its west face's foot on the gate block's top; x1: its top's west edge;
  // X: its south-west corner at the ground (where its south face's rows start)
  return { b, x1: S2(b + (HK - HG) * LEAN), X: b - HG * LEAN, yN, yS, fN: yN - HG, fS: yS - HG, tN: yN - HK, tS: yS - HK };
};
const keep = (c, gy, tier, out) => {
  const S1 = CASTLE_STONE, { b, x1, fN, fS, tN, tS } = keepGeo(gy), E = XE;
  westFace(c, b, x1, tN, fS, [[b, fN], [x1, tN], [x1, tS], [b, fS]], 91, { dark: -0.04 });
  // its foot on the gate top, a dark seam
  c.fillStyle = "rgba(30,22,32,0.4)";
  poly(c, [[b - 0.5, fN], [b + 1, fN - 1], [b + 1, fS], [b - 0.5, fS]]); c.fill();
  corbels(c, x1 - 1.5, E, tS, [tN + 1, tS + 2.5]);
  // the top
  const tx0 = 823, tx1 = 834, tb = tN + 9;
  piece(c, [x1 - 1, tN - 1, E + 1, tS + 1], (k) => { flagTop(k, x1, E, tN, tS, 95); });
  piece(c, [tx0 - 1, tN - 1, tx1 + 1, tb + 1], (k) => {
    box(k, tx0, tN + 1, tx1 - tx0, tb - tN - 1, darken(S1, 0.5));
    for (let y = tN + 2, r = 0; y < tb; y += 3, r++) box(k, tx0 + 0.5 + (r % 2) * 2, y, tx1 - tx0 - 1 - (r % 2) * 2, 2.5, tone(S1, -0.28 + (hash(97, r) - 0.5) * 0.1));
    box(k, tx0 + 3.5, tb - 5, 3, 5, "#2a1e26");
  });
  pyramidRoof(c, tx0 - 1.5, tx1 + 1.5, tN + 2.5, 6, 9, tier >= 3, 98);
  if (tier >= 3) out.burn.push([(tx0 + tx1) / 2, tN + 2]);
  // the guardroom chimney toward the back, smoking while all is well
  const chx = 830, chy = tS - 7;
  c.fillStyle = "rgba(30,22,32,0.3)"; c.fillRect(chx - 1, chy, 7, 2);
  piece(c, [chx - 4, chy - 10, chx + 4, chy + 1], (k) => {
    box(k, chx - 2.5, chy - 6, 5, 6, darken(S1, 0.45));
    box(k, chx - 2.5, chy - 6, 1.5, 6, tone(S1, -0.12));
    box(k, chx - 1, chy - 6, 3.5, 6, tone(S1, -0.36));
    box(k, chx - 3, chy - 8.5, 6, 2.5, tone(S1, 0.36));
    box(k, chx - 1.5, chy - 8.5, 3, 1, "#1e1620");
  });
  out.smoke = [chx, chy - 9];
  // the royal standard's pole, stepped in a socket on the top
  const sx = x1 + 9, sy = tN + 27;
  c.fillStyle = "rgba(30,22,32,0.3)"; c.fillRect(sx, sy + 1, 4, 1.5);
  box(c, sx - 1.5, sy - 0.5, 3, 2, darken(S1, 0.5));
  out.flags.push([sx, sy, 2]);
  // merlons round its rim
  const gone = (j) => tier >= 2 && hash(99, j) < (tier >= 3 ? 0.36 : 0.18);
  piece(c, [x1 - 3, tN - 6, E + 1, tS + 4], (k) => {
    let j = 0;
    for (let x = x1 + 1.5; x < tx0 - 5; x += 8.5, j++) if (!gone(j)) merlonAt(k, x, tN - 0.5, 5.5, 3.5, 2.5);
    for (let y = tN + 7; y < tS - 5; y += 7.5, j++) if (!gone(j)) merlonAt(k, x1 - 1.5, y, 3.5, 3.5, 2);
    for (let x = x1 - 1; x < E; x += 8.5, j++) if (!gone(j)) merlonAt(k, x, tS - 0.5, 5.5, 3.5, 3);
  });
  // the crown's banners hang down its south face (rippled live), a lit slit between them
  out.banners.push([x1 + 2.5, tS + 1.5, 8, 14, 5], [x1 + 17, tS + 1.5, 8, 14, 6]);
  slit(c, x1 + 14, tS + 19, true);
  out.slits.push([x1 + 14, tS + 19]);
  if (tier >= 1) crack(c, x1 + 27, tS + 7, 7 + tier * 3, 96);
  if (tier >= 2) soot(c, x1 + 14, tS + 1, 13, (HK - HG) * (tier >= 3 ? 0.8 : 0.45), 96);
};

// A stair going down off the inner walk's far side, east, out of sight: a
// coped opening through the far parapet, the steps dropping away into the
// dark, the well's north wall showing more of itself the deeper they go.
const stairDown = (c, yc, seed) => {
  const S1 = CASTLE_STONE, xa = 827 + Math.round(hash(seed, 1)) * 1.5, xb = XE, y0 = yc - 5.5, y1 = yc + 5.5;
  // the opening's lip throws a little shadow down-right onto the flags
  c.fillStyle = "rgba(30,22,32,0.22)"; c.fillRect(xa, y1 + 1.5, xb - xa, 1.5);
  piece(c, [xa - 2.5, y0 - 2.5, xb + 1, y1 + 3], (k) => {
    box(k, xa - 1.5, y0 - 1.5, xb - xa + 1.5, y1 - y0 + 3, tone(S1, 0.06));
    box(k, xa - 1.5, y0 - 1.5, xb - xa + 1.5, 0.5, tone(S1, 0.28));
    box(k, xa - 1.5, y0 - 1.5, 0.5, y1 - y0 + 3, tone(S1, 0.2));
    box(k, xa, y0, xb - xa, y1 - y0, "#1e1620");
    for (let i = 0, x = xa; x < xb && i < 9; i++, x += 2.5) {
      const d = Math.min(y1 - y0 - 1, i * 1.5);
      // the well's north wall above the step, then the step's tread and its lit riser
      box(k, x, y0, 2.5, d, tone(S1, -0.52 - i * 0.03));
      box(k, x, y0 + d, 2.5, y1 - y0 - d, tone(S1, -0.12 - i * 0.07));
      box(k, x, y0 + d, 0.5, y1 - y0 - d, tone(S1, 0.12 - i * 0.07));
    }
    snowOn(k, xa, xb, y0, y0 + 2, seed);
  });
};

// Every tower down the wall, the gate towers included, as [foot, gate]
// sorted north to south: the board's own (data/castle.js places the works'
// crews from the same list)...
const towersOf = (gy) => [...wallDrums(gy).map((f) => [f, 0]), [gy + GATE_TOWER_N, -1], [gy + GATE_TOWER_S, 1]].sort((a, b) => a[0] - b[0]);
// ...and, for painting ya..yb, more past the board's ends at RUN_STEP, so the
// wall carries on (the first and last stand clear outside ya..yb)
const towersFor = (gy, ya, yb) => {
  const t = towersOf(gy);
  while (towerGeo(...t[0]).yS + 10 >= ya) t.unshift([t[0][0] - RUN_STEP, 0]);
  while (towerGeo(...t.at(-1)).tN - 16 <= yb) t.push([t.at(-1)[0] + RUN_STEP, 0]);
  return t;
};
// a stretch's seed, from where it starts
const seedAt = (f) => 11 + (((Math.round(f) % 499) + 499) % 499) * 3;
// where a river runs in under the wall's foot, ya..yb (on the board)
const wetRuns = (gy, towers, ya, yb) => {
  const out = [];
  let a = null;
  const y0 = Math.max(ya, -10), y1 = Math.min(yb, H + 10);
  for (let y = y0; y <= y1; y++) {
    const w = y < y1 && Math.abs(y - gy) > 60 && inRiverAt(footAt(y, gy, towers) - 1, y);
    if (w && a === null) a = y;
    if (!w && a !== null) { out.push([a, y]); a = null; }
  }
  return out;
};

// One stretch of the outer wall and the inner wall's face and battlements,
// from the south face it starts against (ground line `yg`) down to y1, under
// the tower (G) standing south of it; `vis` is where that tower starts to
// hide its outer face. The walks and battlements start against the face at
// their own heights, the first merlons standing against it. (The inner walk
// runs on behind the towers: it is laid once, under everything.)
const stretch = (ctx, yg, y1, G, seed, tier, hurt, out, wet) => {
  const yo = yg - HC, yi = yg - HI, vis = G.yN - HC;
  // the outer face and its footing
  plinth(ctx, WALL.face0, yg, y1, seed + 5);
  westFace(ctx, WALL.face0, WALL.face1, yo, y1, [[WALL.face0, yg], [WALL.face1, yo], [WALL.face1, y1], [WALL.face0, y1]], seed, { foot: true });
  // where a river runs in under it, a culvert
  for (const [a, b] of underWall(wet, yg, G.yN)) culvert(ctx, WALL.face0, a, b);
  for (let y = yg + 16 + hash(seed, 60) * 10, i = 0; y < vis - 10; y += 30 + hash(seed + i, 61) * 14, i++) {
    if (wet.some(([a, b]) => y > a - 8 && y < b + 8)) continue;
    const lit = hash(seed + i, 62) > 0.6;
    slitAcross(ctx, WALL.face0 + 1, y, lit);
    if (lit) out.slits.push([WALL.face0 + 2.5, y]);
  }
  if (tier >= 1) for (let i = 0; i < Math.round(tier * 0.7); i++) {
    const y = yg + 12 + hash(seed + i, 51) * (vis - yg - 24);
    if (vis - yg > 30 && !wet.some(([a, b]) => y > a - 6 && y < b + 6)) crackAcross(ctx, WALL.face0 + 0.5, y, WALL.face1 - WALL.face0 + 1, seed + i + 60);
  }
  corbelsW(ctx, WALL.face1, yo, y1);
  const shade = battlement(ctx, WALL.face1, WALL.par1, yo, y1, yo - 3, tier, seed, hurt);
  walkFlags(ctx, WALL.par1, WALL.walk1, yo, y1, seed, -0.15);
  walkWeather(ctx, WALL.par1, WALL.walk1, yo, y1, seed, true);
  box(ctx, WALL.par1, yo, WALL.walk1 - WALL.par1, 0.5, INK_LINE);     // the joint where it runs out of the tower
  walkShade(ctx, WALL.par1, yo, y1, shade);
  // the inner wall rising behind the walk, and its battlements
  westFace(ctx, WALL.walk1, WALL.face2, yi, y1, [[WALL.walk1, yo], [WALL.face2, yi], [WALL.face2, y1], [WALL.walk1, y1]], seed + 7, { dark: 0.04 });
  // damp and grime where it stands on the walk
  ctx.fillStyle = "rgba(34,24,38,0.22)"; ctx.fillRect(WALL.walk1 - 1.5, yo, 1.5, y1 - yo);
  corbelsW(ctx, WALL.face2, yi, y1);
  const shadeI = battlement(ctx, WALL.face2, WALL.par2, yi, y1, yi - 3, tier, seed + 17, hurt);
  // its shadow on the inner walk, as far as the tower's own takes over
  walkShade(ctx, WALL.par2, yi, Math.min(y1, G.tN + 3), shadeI);
  // the merlons no tower stands over are where the birds sit
  for (const y of shade) if (y > yo && y < vis - 22 && y > 6 && y < H - 10) out.perches.push([WALL.face1 + 5.5, y + 2.5]);
  for (const y of shadeI) if (y > yi && y < vis - 34 && y > 6 && y < H - 10) out.perches.push([WALL.face2 + 4.5, y + 2.5]);
};

// The castle's stone from ya to yb: the whole wall painted north to south
// from the list of towers, each length of it the same whatever the window,
// so the board's bake and the lengths the landscape beyond it paints
// (bakeCastleRun) meet with no seam.
const paintCastleStone = (ctx, gx, gy, tier, ya = TOP, yb = BOT) => {
  const out = { slits: [], flags: [], torches: [], burn: [], banners: [], perches: [], smoke: null };
  const hurt = [];
  const towers = towersFor(gy, ya, yb);
  const on = (a, b) => b > ya - 2 && a < yb + 2;
  const wet = wetRuns(gy, towers, ya, yb);
  // the fire takes the north gate tower's turret first, and one tower after it
  const plain = towersOf(gy).filter(([, gate]) => !gate);
  const torched = tier >= 3 && plain.length ? [plain[0][0]] : [];
  // the stones of fallen merlons lie on the walk, under anything standing over it
  const fallen = () => { for (const [x, y] of hurt.splice(0)) for (let i = 0; i < 3; i++) rubble(ctx, x + (hash(x, i) - 0.5) * 7, y + (hash(y, i) - 0.5) * 6, x + y + i); };
  // the inner wall's walk, running on behind every tower, off the board, its
  // far parapet, and stairs going down off it between some of the towers
  walkFlags(ctx, WALL.par2, WALL.back, ya, yb, 5, -0.07, ANCHOR);
  walkWeather(ctx, WALL.par2, WALL.back, ya, yb, 5);
  battlement(ctx, WALL.back, XE, ya, yb, ANCHOR + 5 + MERLON * Math.ceil((ya - 12 - ANCHOR - 5) / MERLON), tier, 23, [], ANCHOR);
  for (let i = 0; i + 1 < towers.length; i++) {
    const [fa, ga] = towers[i], [fb, gb] = towers[i + 1];
    const a = (ga < 0 ? gy + GH : towerGeo(fa, ga).yS) - HI + 8, b = towerGeo(fb, gb).tN - 2;
    if (b - a < 36 || hash(181, Math.round(fa)) < 0.3) continue;
    const yc = Math.round((a + b) / 2 + (hash(182, Math.round(fa)) - 0.5) * (b - a - 30));
    if (on(yc - 8, yc + 8)) stairDown(ctx, yc, Math.round(fa));
  }
  // north to south: a stretch of wall, the tower (or the gate block) it runs
  // in under, the next stretch starting against that one's south face
  for (let i = 0; i < towers.length; i++) {
    const [foot, gate] = towers[i], G = towerGeo(foot, gate);
    if (i > 0) {
      const [pf, pg] = towers[i - 1], yg = pg < 0 ? gy + GH : towerGeo(pf, pg).yS;
      if (on(yg - HI - 4, G.yS + 2)) { stretch(ctx, yg, G.yS, G, seedAt(pf), tier, hurt, out, wet); fallen(); }
    }
    if (on(G.tN - 16, (gate < 0 ? gy + GH : G.yS) + 8)) {
      const seed = gate ? (gate < 0 ? 7 : 9) : foot;
      const burnt = torched.includes(foot) || (tier >= 3 && gate < 0);
      const res = tower(ctx, foot, { gate, seed, tier, broken: burnt, flag: gate > 0 ? false : undefined, wet });
      if (res.flag && res.flag[1] > ya && res.flag[1] - 20 < yb) out.flags.push([...res.flag, gate ? 1 : 0]);
      out.slits.push(...res.slits);
      if (tier >= 2 && (gate < 0 || burnt)) out.burn.push(res.smoke);
      if (gate < 0) { gateBlock(ctx, gy, tier, hurt, out); fallen(); }
    }
  }
  // shadows thrown down-right across the walls south and east of each tower
  const sh = (x, y, w, h, a) => { ctx.fillStyle = `rgba(30,22,32,${a})`; ctx.fillRect(S2(x), S2(y), S2(w), S2(h)); };
  for (const [foot, gate] of towers) {
    const G = towerGeo(foot, gate);
    if (!on(G.tN, G.yS + 10)) continue;
    // east of it, on the inner walk it rises above (the north gate tower's
    // as far as the gate block)
    const e = gate < 0 ? G.yS - HG : G.yS - HI + 2;
    sh(TOWER_E, G.tN + 2, 5, e - G.tN - 2, 0.3);
    sh(TOWER_E + 5, G.tN + 5, 2.5, e - G.tN - 5, 0.14);
    if (gate < 0) continue;
    // on the outer face, in the corner under the tower's flank
    ctx.save();
    poly(ctx, [[WALL.face0, G.yS], [WALL.face1, G.yS - HC], [WALL.face1, G.yS - HC + 7], [WALL.face0, G.yS + 5]]); ctx.clip();
    sh(WALL.face0, G.yS - HC, WALL.face1 - WALL.face0, HC + 6, 0.34);
    ctx.restore();
    // across the parapet and the outer walk, the inner face and its parapet
    sh(WALL.face1, G.yS - HC, WALL.walk1 - WALL.face1, 5, 0.34);
    sh(WALL.face1 + 3, G.yS - HC + 5, WALL.walk1 - WALL.face1 - 3, 3, 0.16);
    ctx.save();
    poly(ctx, [[WALL.walk1, G.yS - HC], [WALL.face2, G.yS - HI], [WALL.face2, G.yS - HI + 6], [WALL.walk1, G.yS - HC + 7]]); ctx.clip();
    sh(WALL.walk1, G.yS - HI, WALL.face2 - WALL.walk1, HC + 8, 0.3);
    ctx.restore();
    sh(WALL.face2, G.yS - HI, TOWER_E + 5 - WALL.face2, 3.5, 0.3);
  }
  if (on(gy - 70, gy + GH + 10)) {
    // and the gate block's, a step above the outer walk; the keep's, long,
    // across the inner walk below it
    sh(GATE.face1, gy + GH - HC, WALL.walk1 - GATE.face1, 5, 0.34);
    sh(WALL.face2, gy + GH - HI, TOWER_E - WALL.face2, 2.5, 0.26);
    sh(TOWER_E, gy + GH - HI, XE - TOWER_E, 6, 0.32);
    sh(TOWER_E + 3, gy + GH - HI + 6, XE - TOWER_E - 3, 3, 0.15);
  }
  return out;
};

// A length of the castle past the board's top or bottom, ya..yb, for the
// landscape beyond the board (apron.js): the same wall, towers and ground as
// the board's own, painted by the same code from the same list of towers
// (carried on past the board's ends every RUN_STEP), so it meets the board
// with no seam. Whole (tier 0), its pennants still.
export const bakeCastleRun = (ya, yb) => {
  if (typeof document === "undefined" || !PTS.length) return null;
  const [gx, gy] = PTS[PTS.length - 1];
  const x0 = 700, w = XE + 2 - x0, h = yb - ya, P = groundPal(), towers = towersFor(gy, ya, yb);
  const layer = (fn, ink = false) => bakeSprite(w, h, (c) => { c.translate(-x0, -ya); fn(c); }, ink);
  let info = null;
  const stone = layer((c) => { info = paintCastleStone(c, gx, gy, 0, ya, yb); }, true);
  const cv = layer((c) => {
    footRows(c, P, ya, yb, gy, towers);
    c.drawImage(stone, x0, ya, w, h);
    footOver(c, P, gy, towers, ya, yb);
    info.flags.forEach(([x, y, g], i) => { if (g !== 2) pennant(c, x, y - 1.5, 0, i * 1.7, BANNER); });
  });
  return { cv, x0, y0: ya, w, h };
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
  for (const [f, gate] of towers) { const G = towerGeo(f, gate); if (y >= G.yN && y <= G.yS) return G.x0; }
  if (atGate(y, gy)) return GATE.face0;
  return WALL.face0;
};
const atGate = (y, gy) => Math.abs(y - gy) <= GH;

// one clump of the realm's own ground, as the halls' ground blend has them
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
  const P = groundPal(), towers = towersFor(gy, TOP, BOT);
  footRows(c, P, TOP, BOT, gy, towers);
  // puddles in the fen mud
  if (P.kind === "marsh") for (let y = 30; y < H - 20; y += 47 + hash(y, 14) * 30) {
    const fx = footAt(y, gy, towers);
    if (atGate(y, gy) || isWet(fx - 2, y)) continue;
    c.fillStyle = P.r.water?.edge || "#2f423c";
    c.beginPath(); c.ellipse(fx - 4.5, y, 2.2, 4, 0, 0, Math.PI * 2); c.fill();
    box(c, fx - 5.5, y - 2, 1, 1.5, rgba(P.r.water?.shine || "#4a6a58", 0.8));
  }
  paving(c, gy, P, full);
};
// the worn earth along the wall's foot, row by row from ya to yb
const footRows = (c, P, ya, yb, gy, towers) => {
  for (let y = ya; y < yb; y++) {
    const fx = footAt(y, gy, towers);
    if (atGate(y, gy)) continue;                     // the threshold covers the gate's front
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
};

// What lies over the wall's foot from ya to yb: earth banked against the
// footing, the realm's turf creeping over it in clumps. Laid from ANCHOR, so
// any length of it matches any other (the board's, and the landscape's
// beyond it).
const footOver = (c, P, gy, towers, ya, yb) => {
  const clear = (y) => Math.abs(y - gy) > PATH_HALF + 1;
  // earth banked over the footing course
  for (let y = ANCHOR, i = 0; y < yb - 4; y += 5 + hash(i, 20) * 7, i++) {
    if (y < ya + 4) continue;
    const fx = footAt(y, gy, towers);
    const snow = P.kind === "snow";
    if (!clear(y) || isWet(fx - 2, y) || hash(i, 21) < (snow ? 0.62 : 0.3)) continue;
    if (snow) {
      // a drift banked against the footing: long down the wall, lit on top,
      // blue where it falls away to the west
      const len = 8 + hash(i, 22) * 8, body = mix(P.r.GRASS, P.r.GRASS_LT, 0.6), shade = mix(P.r.GRASS, "#8aa2b8", 0.3);
      for (let j = 0; j < len; j += 0.5) {
        const w = 1.6 * Math.sin((Math.PI * j) / len) + 0.3 + (hash(i * 31, j * 2) > 0.7 ? 0.5 : 0), yy = y - len / 2 + j;
        box(c, fx - 2.5 - w, yy, w + 2.5, 0.5, body);
        box(c, fx - 2.5 - w, yy, 0.5, 0.5, shade);
        if (j > len * 0.3 && j < len * 0.6) box(c, fx - 2.5, yy, 1, 0.5, lighten(P.r.GRASS_LT, 0.2));
      }
    }
    else ball(c, fx - 1.8, y, 1.9, 2 + hash(i, 22) * 2, P.earth, { hi: 0.3, lo: 0.3 });
  }
  // clumps of the realm's ground
  for (let y = ANCHOR, i = 0; y < yb - 8; y += 9 + hash(i, 30) * 10, i++) {
    if (y < ya + 8) continue;
    const fx = footAt(y, gy, towers);
    if (!clear(y) || isWet(fx - 3, y) || hash(i, 31) < 0.18) continue;
    const out2 = hash(i, 32) > 0.72;
    if (P.kind === "snow" && hash(i, 35) < 0.4) continue;
    footClump(c, P, fx - (out2 ? 6 + hash(i, 33) * 3 : 1.5 + hash(i, 33) * 1.5), y, (0.85 + hash(i, 34) * 0.35) * (P.kind === "snow" ? 0.75 : 1), i * 7 + 3);
  }
};
// ...and on the board, fallen stones, and at the dusky realms a brazier each
// side of the threshold
const paintGroundOver = (c, gx, gy, tier, out) => {
  const P = groundPal(), towers = towersFor(gy, TOP, BOT);
  const clear = (y) => Math.abs(y - gy) > PATH_HALF + 1;
  footOver(c, P, gy, towers, TOP, BOT);
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
  const x0 = PAVE_X - 6, y0 = TOP, w = 764 - x0, h = BOT - TOP;
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
    const x0 = 724, y0 = TOP, w = XE + 2 - x0, h = BOT - TOP;
    let info = null;
    const cv = bakeSprite(w, h, (c) => { c.translate(-x0, -y0); info = paintCastleStone(c, gx, gy, tier); });
    CASTLE = { key, cv, x0, y0, w, h, ...info };
  }
  if (CASTLE.cv) ctx.drawImage(CASTLE.cv, CASTLE.x0, CASTLE.y0, CASTLE.w, CASTLE.h);
  else return;
  if (G) ctx.drawImage(G.over, G.x0, G.y0, G.w, G.h);
  const dark = (REALM.light?.amount ?? 0) >= 0.15;
  // the banners down the keep, stirring
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
// A sentry pacing the inner wall's walk, birds on the battlements that take
// off when the horde comes near. All of it a stamp or a handful of pixels a
// frame.
const SENTRY = { ...WALL_FOLK.guard, coat: "#3a5474", trim: "#d8b34a" };
const BIRDS = { calm: true, since: -99, flushed: -99, last: 0 };

// The sentry keeps the inner wall's walk: it runs on unbroken behind every
// tower and no crew of the works stands on it, so his beat is the length of
// walk north or south of the gate block (whichever is better, the nearer the
// gate the better), at most BEAT long, at the end nearer the gate. His feet
// at x SENTRY_X.
const SENTRY_X = 822, BEAT = 150;
const sentryBeat = (gy) => {
  const NT = towerGeo(gy + GATE_TOWER_N, -1);
  // north of the gate block's top, and south of where its south face meets the inner walk
  const runs = [[22, NT.yS - HG - 4], [gy + GH - HI + 8, H - 6]];
  let best = null;
  for (const [a, b] of runs) {
    if (b - a < 34) continue;
    const L = Math.min(b - a, BEAT), gap = a > gy ? [a, a + L] : [b - L, b];
    const score = L - Math.abs((gap[0] + gap[1]) / 2 - gy) * 0.35;
    if (!best || score > best.score) best = { gap, score };
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
const drawIdleLife = (ctx, g, gy) => {
  const time = g.time;
  const tier = tierOf(Math.min(1, Math.max(0, g.lives ?? 20) / 20));
  const near = (g.enemies || []).some((e) => !e.dead && e.x > 560);
  // the sentry: paces his stretch, stops at each end to look out over the
  // field, and stands to face it while the horde is near
  const beat = sentryBeat(gy);
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
    if (cv) ctx.drawImage(cv, SENTRY_X - 16, S2(y) - 40 + bob, 28, 42);
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
  // where the works' crews stand
  const guild = works && workTier(works, "masons");
  const bows = works && workTier(works, "archers");
  const taken = new Set(bows ? bowmenSpots(gy, bows.count) : []);
  const masonAt = [];
  if (guild) {
    // the far ends of the walk, unless the bowmen stand there already — then
    // they're at work on the inner wall's walk, behind the towers farthest
    // from the gate (clear of each tower's shadow), mending its parapet
    const want = guild.mend > 1 ? 2 : 1;
    masonAt.push(...masonSpots(gy, 99).filter((y) => !taken.has(y)).slice(0, want).map((y) => [y + 4, 1]));
    const drums = wallDrums(gy).sort((a, b) => Math.abs(b - gy) - Math.abs(a - gy));
    for (const f of drums) if (masonAt.length < want) masonAt.push([Math.min(H - 4, f + TOWER.s - HI + 12), -1]);
  }
  drawIdleLife(ctx, g, gy);
  if (!works) return;
  // the masons first: farthest from the gate, and nothing stands in front of
  // them. Each works a block on a trestle in front of him, the trestle's
  // shadow down-right on the flags.
  for (let k = 0; k < masonAt.length; k++) {
    const [y, dir] = masonAt[k];                    // his feet, and which way he faces
    const fx = dir > 0 ? CREW - 24 : SENTRY_X + 5, bx = dir > 0 ? fx + 6 : fx - 14;
    shadow(ctx, bx + 5.5, y + 2.5, 6.5, 1.6, 0.32);
    ctx.fillStyle = "#4a3424";
    ctx.fillRect(bx, y - 4, 1, 6); ctx.fillRect(bx + 8, y - 4, 1, 6); ctx.fillRect(bx + 3.5, y - 3, 1, 5);
    cylinder(ctx, bx - 1.5, y - 6, 12, 2.5, "#8a6a40", { r: 0.8, hi: 0.3, lo: 0.5 });
    cylinder(ctx, bx + 0.5, y - 12, 8, 6, "#8e887a", { r: 1.2, hi: 0.35, lo: 0.5 });
    ctx.fillStyle = "#d8d0c0"; ctx.fillRect(bx + 1, y - 12, 6, 1.2);
    const fr = Math.floor(((time * 2 + k) % 2));
    const cv = workFrame(`mason|${dir}|${fr}`, 30, 36, (c) => drawMason(c, dir > 0 ? 12 : 18, 33, dir, WALL_FOLK.mason, fr));
    if (cv) ctx.drawImage(cv, fx - (dir > 0 ? 12 : 18), y - 33, 30, 36);
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
    [gy - 40, gy - 2].forEach((y, i) => {
      const shift = Math.sin(time * 0.7 + i * 2.6) > 0.55 ? 0.5 : 0;
      if (cv) ctx.drawImage(cv, GATE.face1 + 9 - 16 + shift, y - 40, 28, 42);
    });
    if (guard.oil) {
      // the cauldron by the murder holes over the passage, and its steam
      const cx = GATE.face1 + 29, cy = gy - 18;
      shadow(ctx, cx + 1.5, cy + 4.5, 6.5, 1.8, 0.34);
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
