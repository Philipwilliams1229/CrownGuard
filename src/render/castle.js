// ============ RENDER: THE CASTLE ============
// The crown's curtain wall down the right edge of every board, the ground it
// stands in, the life on it between fights, and the crews the castle works
// put on it. Split out of scenery.js so the castle can be worked on by itself.

import { W, H, PATH_HALF } from "../data/constants.js";
import { PTS } from "../engine/path.js";
import { workTier, bowmenSpots, masonSpots, wallDrums, BOW_X, GATE_TOWER_N, GATE_TOWER_S, TOWER, ballistaSpots } from "../data/castle.js";
import { drawArcherFrame, drawHalberdier, drawMason, WALL_FOLK, MASON_FRAMES, HALBERD_WALK, frameOf } from "./folk.js";
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
  // (the channel cuts through the footing course, 2.5 proud of the face, so
  // the river's surface runs on unbroken from the field into the dark)
  const f0 = x0 - 2.5;
  const mouth = (k, rx2, r2) => {
    k.beginPath(); k.moveTo(f0, cy - r2); k.lineTo(x0 + 1.5, cy - r2);
    k.ellipse(x0 + 1.5, cy, rx2, r2, 0, -Math.PI / 2, Math.PI / 2); k.lineTo(f0, cy + r2); k.closePath();
  };
  const water = REALM.water || {}, river = darken(water.deep || "#3a6a7c", 0.12);
  piece(c, [f0 - 1, cy - ry - 5, x0 + 12, cy + ry + 5], (k) => {
    mouth(k, rx, ry + 3.5);
    k.fillStyle = lighten(S1, 0.18); k.fill();
    // inside the mouth the river runs on under the wall: the realm's deep water
    // darkened in the arch's shadow, darkest up under its crown, and a pale
    // line where it laps at the arch's foot (in art pixels, no soft edge)
    const deep = darken(water.deep || "#3a6a7c", 0.4), deeper = darken(deep, 0.3);
    const lap = mix(water.shine || "#8cc4d8", "#fff3d2", 0.3);
    const inM = (x, y) => x >= f0 && Math.abs(y - cy) < ry && (x < x0 + 1.5 || ((x - x0 - 1.5) / ri) ** 2 + ((y - cy) / ry) ** 2 < 1);
    for (let y = S2(cy - ry); y < cy + ry; y += 0.5) for (let x = S2(f0); x < x0 + 1.5 + ri; x += 0.5) {
      const mx = x + 0.25, my = y + 0.25;
      if (!inM(mx, my)) continue;
      // (under the arch's ring and up under its crown, deeper in its shadow)
      const under = x >= x0 && (!inM(mx + 1.5, my) || !inM(mx, my - 1) || !inM(mx, my + 1));
      box(k, x, y, 0.5, 0.5, x < x0 ? river : x < x0 + 0.5 ? (hash(Math.round(y * 2), 7) < 0.8 ? lap : deep) : under ? deeper : deep);
    }
    mouth(k, ri, ry);
    k.save(); k.clip();
    for (let y = cy - ry + 2.5; y < cy + ry - 1; y += 3.5) box(k, x0, y, ri + 2.5, 1, "#4a4e5a");
    box(k, x0 + 3, cy - ry, 1, ry * 2, "#3a3e48");
    k.restore();
  });
  // (and no ink across the river where it enters the channel: the water runs
  // on over the footing's and the channel's west edge)
  for (let y = S2(cy - ry) + 0.5; y < cy + ry - 0.5; y += 0.5) box(c, f0 - 1.5, y, 1.5, 0.5, river);
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
    if (vis - yg > 30 && !wet.some(([a, b]) => y > a - 6 && y < b + 6)) {
      crackAcross(ctx, WALL.face0 + 0.5, y, WALL.face1 - WALL.face0 + 1, seed + i + 60);
      out.cracks.push(y);                  // (the ground's rubble heaps lie under these)
    }
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
  const out = { slits: [], flags: [], torches: [], burn: [], banners: [], perches: [], smoke: null, cracks: [] };
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
// lies over the wall's foot. The foot's apron and banks are worked out from
// y alone and its clumps are laid from ANCHOR, so the lengths of it the
// landscape beyond the board paints (bakeCastleRun) meet the board's with
// no seam.
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
// the art pixels the foot's own bakes cover (the board's ground layer's width)
const FOOT_X0 = PAVE_X - 6, FOOT_X1 = 764;
// The worn earth along the wall's foot, row by row from ya to yb, into the
// pixel buffer B (or into its own, laid on c). Every row is worked out from
// its y alone, so any length of it matches any other.
const footRows = (c, P, ya, yb, gy, towers, B = null) => {
  const own = !B, Q = pixPal(P), k = P.kind, [DAMP, BODY, LIT] = Q.apron, seed = 5;
  if (own) B = pixels(FOOT_X0, ya, FOOT_X1 - FOOT_X0, yb - ya);
  for (let ay = Math.floor(ya * 2); ay < Math.ceil(yb * 2); ay++) {
    const y = (ay + 0.5) / 2;
    if (atGate(y, gy)) continue;                          // the threshold has the gate's front
    // (the footing course stands 2.5 proud of the face: the apron starts at its toe)
    const foot = footAt(y, gy, towers), fx = foot - 2.5, fa = Math.round(fx * 2);
    if (isWet(fx, y)) {
      // the sea's surf against the wall is coast.js's; in a river, the
      // stone's dark reflection, a lap of foam against it and a broken line
      // of foam just off it
      if (!inRiverAt(fx, y)) continue;
      for (let px = fa - 10; px < fa - 2; px++) B.put(px, ay, [20, 24, 32], 0.2);
      // (where it runs on into a culvert, as paintCastleStone's wetRuns has them)
      if (y >= -10 && y <= H + 10 && Math.abs(y - gy) > 60 && inRiverAt(foot - 1, y)) continue;
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
      let col = t < 0.3 ? DAMP : t < 0.74 ? BODY : LIT;
      const h = hash(px * 3 + 7, ay * 5 + 1);
      if (h < 0.035) col = col === LIT ? BODY : DAMP;
      else if (h > 0.975 && col !== LIT) col = col === DAMP ? BODY : LIT;
      if (Q.thaw && e < drip) col = e < 0.6 || t < -0.15 ? Q.thaw[1] : Q.thaw[0];   // bare earth where the stone's warmth melts the snow
      B.put(px, ay, col);
      // gravel washed out along the drip-line's edge
      if (e >= drip && e < drip + 0.5 && hash(px, ay * 3 + 11) < grav) {
        B.put(px, ay, Q.pebble[0]); B.put(px + 1, ay + 1, Q.pebble[1]);
      }
      // moss in the damp at the very foot
      if (e < 0.5 && mossy && hash(px, ay) < 0.6) B.put(px, ay, Q.moss[hash(px + 1, ay) < 0.5 ? 0 : 1]);
      if (e < 0.5) B.shade(px, ay, 0.28);
    }
  }
  if (own) B.lay(c);
};

// the ground itself on the board: the apron, the fen's puddles along it, and
// the threshold
const paintGroundUnder = (c, gy, full, B) => {
  const P = groundPal(), Q = pixPal(P), towers = towersFor(gy, TOP, BOT);
  footRows(c, P, TOP, BOT, gy, towers, B);
  // puddles in the fen mud, few and far between, each its own size
  if (P.kind === "marsh") for (let y = 24 + hash(gy, 13) * 50, n = 0; y < H - 20; y += 55 + hash(n, 14) * 120, n++) {
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
  threshold(B, gy, P, Q, full);
  B.lay(c);
};

// What lies over the wall's foot from ya to yb: turf (snow, ash, mud) banked
// against the footing, clumps of the realm's ground along it. The banks are
// worked out from y alone and the clumps laid from ANCHOR, so any length of
// it matches any other (the board's, and the landscape's beyond it).
const footOver = (c, P, gy, towers, ya, yb, B = null) => {
  const own = !B, Q = pixPal(P), r = P.r, k = P.kind;
  if (own) B = pixels(FOOT_X0, ya, FOOT_X1 - FOOT_X0, yb - ya);
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
  for (let py = Math.floor(ya * 2); py < Math.ceil(yb * 2); py++) {
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
    // a tuft on the bank now and then: one chance in each run of 20 rows, at
    // a row of its own (so the tufts keep apart, whatever length is painted)
    const cell = Math.floor(py / 20);
    if (k !== "ash" && ext > 1.2 && py === cell * 20 + Math.floor(hash(cell, 26) * 12) && hash(cell, 24) < 0.8) pxTuft(B, xb - 1, py, 3, Q.blades, py);
  }
  // clumps of the realm's ground along the foot
  for (let y = ANCHOR, i = 0; y < yb - 6; y += 9 + hash(i, 30) * 10, i++) {
    if (y < ya + 6) continue;
    const fx = footAt(y, gy, towers);
    if (!clear(y) || isWet(fx - 3, y) || shore(fx - 3, y) || hash(i, 31) < 0.2) continue;
    // (the snow's mounds lie out on the trodden snow, never astride the footing)
    const off = hash(i, 32) > 0.72 ? 6 + hash(i, 33) * 3 : k === "snow" ? 4.5 + hash(i, 33) * 2 : 1.5 + hash(i, 33) * 1.5;
    pxClump(B, P, Q, Math.round((fx - off) * 2), Math.round(y * 2), i * 7 + 3);
  }
  if (own) B.lay(c);
};

// ...and on the board: fallen stones, clumps where the threshold meets the
// grass, and at the dusky realms a brazier each side of it
const paintGroundOver = (c, gx, gy, tier, out, B, cracks = []) => {
  const P = groundPal(), Q = pixPal(P), towers = towersFor(gy, TOP, BOT), r = P.r, k = P.kind;
  const clear = (y) => Math.abs(y - gy) > PATH_HALF + 1;
  footOver(c, P, gy, towers, TOP, BOT, B);
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
  // (a heap under as many of the board's cracks as the tier, picked by lot)
  const heaps = cracks.filter((y) => y > 10 && y < H - 10).sort((p, q) => hash(Math.round(p), 45) - hash(Math.round(q), 45)).slice(0, tier).map((y) => [y, 0.8 + tier * 0.15]);
  if (tier >= 3) {
    // (the burnt ones, as paintCastleStone picks them: along their feet)
    const plain = towersOf(gy).filter(([, g]) => !g), mid = (G) => (G.yN + G.yS) / 2;
    heaps.push([mid(towerGeo(gy + GATE_TOWER_N, -1)), 1.3]);
    if (plain.length) heaps.push([mid(towerGeo(plain[0][0], 0)), 1.3]);
  }
  heaps.forEach(([y0, big], hI) => {
    const sd = rs + hI * 17 + 300;
    for (let i = 0; i < 4 + Math.round(big * 6); i++) {
      const lead = i < (big > 1.1 ? 2 : 1);
      const y = y0 + (hash(sd, i) - 0.5) * (lead ? 5 : 7 + 5 * big), fx = footAt(y, gy, towers);
      if (!clear(y) || isWet(fx - 3, y)) continue;
      const w = lead ? 8 + Math.floor(hash(sd, i + 20) * 3) : 3 + Math.floor(hash(sd, i + 20) * 3);
      const h = lead ? 6 + Math.floor(hash(sd, i + 21) * 2) : 2 + Math.floor(hash(sd, i + 21) * 2);
      const off = lead ? 1 + hash(sd, i + 22) * 1.5 : hash(sd, i + 22) ** 2 * 8;       // (a few tumbled well out)
      pieces.push([Math.round((fx - 2.5 - off) * 2) - w, Math.round(y * 2), w, h, dkC(stone, 0.14 + hash(sd, i + 23) * 0.18), sd + i]);
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

const GROUND = { key: "", under: null, x0: 0, y0: TOP, w: 0, h: 0, braziers: [], fresh: false, bakeShort: null, shortCv: null, bakeOver: null, overCv: null };
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
  const x0 = FOOT_X0, y0 = TOP, w = FOOT_X1 - x0, h = BOT - TOP;
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
    // walking he steps (folk-workers.js HALBERD_WALK: the hips drop on each
    // step, the halberd carried clear of the flags); at each end of his beat
    // he looks out (frame 2); facing the horde he stands, breathing (0 / 1)
    const o = moving ? { walk: Math.floor(time * 4) % HALBERD_WALK }
      : !near && L > 4 ? { frame: 2 } : { frame: Math.sin(time * 1.3) > 0.4 ? 1 : 0 };
    const cv = workFrame(`sentry|${dir}|${moving ? "w" + o.walk : "f" + o.frame}`, 28, 42, (c) => drawHalberdier(c, 16, 40, dir, SENTRY, o));
    if (cv) ctx.drawImage(cv, SENTRY_X - 16, S2(y) - 40, 28, 42);
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
// the wall bowmen's shot, in ms of a 700 ms cycle (as the archer halls')
const WALL_DRAW = { at: 700, keys: [[80, "loose"], [150, "follow"], [250, "reach"], [330, "bring"], [400, "set"], [450, "d1"], [530, "d2"]] };
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
    // lay, draw the mortar along, lift, scoop from the hawk, carry, set
    // (folk-workers.js MASON_FRAMES), each man on his own 2.4 s round
    const fr = frameOf(time / 2.4 + k * 0.37, MASON_FRAMES);
    const cv = workFrame(`mason|${dir}|${fr}`, 30, 36, (c) => drawMason(c, dir > 0 ? 12 : 18, 33, dir, WALL_FOLK.mason, fr));
    if (cv) ctx.drawImage(cv, fx - (dir > 0 ? 12 : 18), y - 33, 30, 36);
  }
  if (bows) {
    const big = !!bows.pierce;
    const spots = bowmenSpots(gy, bows.count);
    const tms = time * 1000;
    for (let i = 0; i < spots.length; i++) {
      const y = spots[i] + 8;
      // A bowman who has loosed within the last beat or so is in the fight,
      // on the archer halls' cycle (folk-archer.js ARCHER_FRAMES), timed off
      // his own shot (engine: castleCd.loosed) and scaled to the works' rate:
      // loose, follow through, reach to the quiver, bring the arrow round,
      // set, draw, and hold at the anchor till his next turn. Otherwise he
      // stands at ease, bow down, breathing, now and then a hand to the
      // quiver — the wall is not firing at nothing.
      const since = tms - (cd.loosed?.[i] ?? -1e9);
      let key = "rest";
      if (since < bows.rate * 1.35) {
        const u = since * (WALL_DRAW.at / bows.rate);
        key = "anchor";
        for (const [end, f] of WALL_DRAW.keys) if (u < end) { key = f; break; }
      } else {
        const tt = time + i * 1.7 + (spots[i] % 7) * 0.3;
        const shift = Math.floor(tt / 2.2) % 5 === 0;
        const br = (tt % 3.3) / 3.3;
        key = shift ? "reach" : br > 0.2 && br < 0.6 ? "rest1" : "rest";
      }
      const cv = workFrame(`bow|${big ? 1 : 0}|${key}`, 36, 36, (c) => drawArcherFrame(c, 23, 33, -1, WALL_FOLK.bowman, key, { big, bowCol: big ? "#3a3a44" : undefined }));
      // shoulder to shoulder they'd hide each other: every other man stands a step back
      if (cv) ctx.drawImage(cv, BOW_X + 2 - 23 + (Math.round(spots[i] / 24) % 2 ? 4 : -1), y - 33, 36, 36);
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
    // the halberdiers themselves hold the road in front of the gate: they
    // are a band on the field (engine/update.js syncGateGuard), drawn with
    // the crowd. Up here only the oil waits.
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
