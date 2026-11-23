// ============ OVERHAUL CONCEPT, ROUND 3: LAKES, STARTED OVER (2026-11-22, owner: "create 3 or 4 fresh looks.
// keep the water like the river water, that looks good") ============
// Brief: art/briefs/overhaul-concepts.md, overhaul-animation.md, overhaul-round2.md. Notes: concept/overhaul3-lakes.md.
// Lab: /overhaul3-lakes.html?scene=<name>&save=1
//
// THE ONE RULE: the lake's water IS the approved river water. This module does not copy the river painter: it loads
// concept/overhaul2-water.js's own source (?raw) as a module with its internals exported, so the palette (WA), the
// band formula, the edge kinds (cut bank, grassy lip, reeds, quay, rock face), facePixel, reeds, lilies, tussocks,
// boulders, birds and rings are the very same code. The streams that run in and out of a lake are painted by the
// river painter itself (paintWater). What is new here is only the lake's SHAPE (a mask -> exact distance field)
// and its stillness: the river's depth bands over distance from the shore instead of across a channel, and the
// river's own light dashes lying in still wind-lanes that form and fade, instead of running with a current.
import RAW from "/concept/overhaul2-water.js?raw";
import { SP, PAL, TREAT } from "/concept/overhaul2-trees.js";
import { Pix, mat, flat, toCanvas } from "/src/render/pix/pix.js";

const ORIGIN = location.origin;
const SRC = RAW.replace(/from "\/src\//g, `from "${ORIGIN}/src/`) + `
export { WA, FOAM, FOAM2, EARTH, STONE, TURF, REED, PAD, WOOD, hex, lerp, mul, clamp, sstep, hs, vn, vl, bay, facePixel, faceW, HFACE,
  canvasPainter, reedClump, tussock, lily, boulder, bird, dressShores, buildField, paintWater, ring, TAU,
  selectRealm, selectFaction, setWaveWindow, nearestOnPath, updateGame, placeTower, upgradeTower, buildableAt, startWave, draw,
  setLevelWeather, setDay, DAY, RIVERS, PONDS, BRIDGES, DECOR, PATH_HALF };
export function __set(o) { if (o.LF != null) LF = o.LF; if (o.SWAY) SWAY = o.SWAY; if (o.NOW != null) NOW = o.NOW; }
`;
const W = await import(URL.createObjectURL(new Blob([SRC], { type: "text/javascript" })));
const { WA, FOAM, FOAM2, STONE, TURF, WOOD, hex, lerp, mul, clamp, sstep, hs, vn, vl, bay, TAU } = W;

// ---------------- shapes (board units) ----------------
const ell = (x, y, cx, cy, rx, ry) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); };
const box = (x, y, cx, cy, hx, hy, r) => { const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
const union = (x, y, E, k = 12) => E.reduce((d, e) => smin(d, ell(x, y, ...e), k), 1e9);
const near = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) < r;
// kinds: f(x, y, nx, ny) -> kind; nx, ny = the normal toward LAND (ny < 0: the land lies north: a far shore, its face toward us)

// ---------------- the four looks, on Foxmere (lake) and Oakmere (pond) ----------------
// each look: shape(x, y) (board units, < 0 water), wob (wobble amplitude), kind(), deep (art px to the deepest band),
// qmax (how deep it gets: 1 = the river's middle), streams (river specs painted by the river painter), props
const LOOKS = {
  1: { name: "1 The mere", line: "THE MERE: a deep pool held in the land like the river's cut: cut far shore, grassy near lip, one reed bay",
    fox: { shape: (x, y) => union(x, y, [[446, 210, 78, 40], [484, 206, 38, 32], [394, 224, 30, 22]], 30), wob: 1.6,
      kind: (x, y, nx, ny) => near(x, y, 378, 240, 26) ? "reeds" : ny < -0.05 ? "cut" : "lip",
      birds: [["duck", 470, 214], ["duck", 478, 218]], rings: [[420, 206, 0.1, 9, 1], [505, 200, 0.55, 7, 0], [395, 226, 0.8, 6, 0]] },
    oak: { shape: (x, y) => union(x, y, [[118, 396, 62, 33], [150, 388, 34, 26], [76, 410, 22, 15]], 14), wob: 2.5,
      kind: (x, y, nx, ny) => near(x, y, 66, 420, 22) ? "reeds" : ny < -0.05 ? "cut" : "lip",
      birds: [["duck", 136, 398]], rings: [[112, 390, 0.2, 7, 1], [160, 384, 0.65, 5, 0]] },
    deep: 38, qmax: 0.88, zoom: [318, 158, 168, 112], loop: [318, 150, 230, 150], pondZoom: null,
  },
  2: { name: "2 The tarn", line: "THE TARN: three lobes, a rocky headland, dark and deep; spring-fed (a seep and rushes), its beck running off south-west",
    fox: { shape: (x, y) => {
        let d = union(x, y, [[348, 220, 40, 26], [430, 198, 44, 30], [508, 218, 36, 28], [388, 214, 24, 12], [470, 206, 20, 13]], 9);
        return Math.max(d, -ell(x, y, 464, 252, 18, 32));                                                                       // the headland pushing north
      }, wob: 4,
      kind: (x, y, nx, ny) => near(x, y, 466, 238, 30) || near(x, y, 400, 226, 9) ? "rock" : ny < -0.05 ? "cut" : "lip",
      streams: [
        { pts: [[326, 232], [318, 254], [312, 276], [318, 300], [330, 322], [332, 346], [322, 370], [316, 392]], w: 24, spec: { def: "lip", flow: 0.6, zones: [{ bank: "E", from: 0, to: 999, kind: "cut" }] } },
      ],
      culverts: [], seeps: [[512, 192, 13]],   // owner: no culverts: the tarn is spring-fed at its north-east end
      rocks: [[466, 252, 1.15], [476, 246, 0.7], [457, 258, 0.75], [404, 232, 0.6]], boulders: [[465, 221, 3.2], [472, 217, 2.2], [457, 224, 1.8], [352, 202, 2]],
      birds: [["heron", 486, 232]], rings: [[430, 198, 0.15, 9, 1], [508, 212, 0.6, 7, 0], [352, 222, 0.85, 6, 0]] },
    oak: { shape: (x, y) => { const d = union(x, y, [[90, 392, 46, 30], [154, 410, 40, 28], [120, 400, 26, 16]], 9); return Math.max(d, -ell(x, y, 124, 438, 12, 22)); }, wob: 3,
      kind: (x, y, nx, ny) => near(x, y, 124, 424, 22) ? "rock" : ny < -0.05 ? "cut" : "lip",
      streams: [
        { pts: [[56, 228], [62, 262], [76, 300], [80, 340], [88, 376]], w: 20, spec: { def: "lip", flow: 0.7, zones: [{ bank: "E", from: 0, to: 999, kind: "cut" }] } },
        { pts: [[176, 418], [192, 440], [204, 468], [196, 496], [190, 524]], w: 22, spec: { def: "lip", flow: 0.6, zones: [{ bank: "E", from: 0, to: 999, kind: "cut" }] } },
      ],
      rocks: [[124, 440, 1], [132, 436, 0.6]], boulders: [[123, 413, 2.6], [129, 410, 1.6]], birds: [], rings: [[96, 388, 0.2, 7, 1], [152, 404, 0.6, 6, 0]] },
    deep: 18, qmax: 1, zoom: [396, 168, 168, 112], loop: [384, 136, 230, 150],
  },
  3: { name: "3 The millpond", line: "THE MILLPOND: dammed by a stone quay with a sluice, a jetty and skiff, lily rafts, pollard willows on the bank",
    fox: { shape: (x, y) => smin(box(x, y, 432, 207, 96, 36, 16), ell(x, y, 446, 180, 70, 18), 10), wob: 0, wobN: 4, damY: 243,
      kind: (x, y, nx, ny) => (y > 236 && ny > 0.5) ? "quay" : ny < -0.35 ? "lip" : near(x, y, 524, 210, 18) ? "reeds" : "lip",
      streams: [{ pts: [[356, 236], [356, 256], [348, 280], [330, 310], [322, 350], [320, 392]], w: 20, spec: { def: "quay", flow: 1.1, weir: 12, zones: [{ bank: "*", from: 40, to: 999, kind: "lip" }] } }],
      sluice: [356, 243], jetty: [440, 243, 19], skiff: [456, 232], lilies: [[500, 192], [486, 186], [510, 200], [395, 186], [404, 192]],
      willows: [[392, 168, 2, 7], [482, 165, 2, 9], [536, 196, 1, 11]], birds: [["duck", 392, 214], ["duck", 400, 210]],
      rings: [[420, 200, 0.3, 8, 1], [470, 214, 0.75, 6, 0]] },
    oak: { shape: (x, y) => smin(box(x, y, 118, 398, 64, 28, 12), ell(x, y, 126, 376, 46, 14), 8), wob: 0, wobN: 3, damY: 426,
      kind: (x, y, nx, ny) => (y > 419 && ny > 0.5) ? "quay" : "lip",
      streams: [{ pts: [[74, 420], [74, 438], [66, 462], [58, 492], [56, 524]], w: 19, spec: { def: "quay", flow: 1.1, weir: 9, zones: [{ bank: "*", from: 34, to: 999, kind: "lip" }] } }],
      sluice: [74, 426], jetty: [132, 426, 15], skiff: [142, 414], lilies: [[160, 382], [150, 378], [92, 384]],
      willows: [[96, 360, 2, 7], [178, 372, 2, 9]], birds: [], rings: [[120, 392, 0.3, 7, 1]] },
    deep: 26, qmax: 0.92, zoom: [326, 176, 168, 112], loop: [320, 150, 230, 150],
  },
  4: { name: "4 The reed fen", line: "THE REED FEN: shallow open water ringed and islanded with reeds, a fowler's punt, a heron, willows",
    fox: { shape: (x, y) => {
        let d = union(x, y, [[372, 212, 50, 30], [440, 196, 44, 28], [500, 220, 40, 26], [428, 232, 40, 16], [336, 230, 22, 14]], 16);
        for (const I of [[452, 214, 12, 6], [392, 196, 8, 4.5]]) d = Math.max(d, -ell(x, y, ...I));                               // reed islets
        return d;
      }, wob: 3.5, wobF: 15,
      kind: (x, y, nx, ny) => ((near(x, y, 330, 186, 40) || (x > 410 && x < 490 && y < 200)) && ny < -0.3) ? "lip" : "reeds",
      beds: [[412, 214, 5], [480, 236, 6], [362, 236, 4], [508, 204, 4], [452, 216, 4], [392, 198, 2]], punt: [388, 222], willows: [[318, 200, 1, 13], [524, 184, 2, 15]],
      birds: [["heron", 424, 228], ["duck", 432, 188], ["duck", 438, 192]], rings: [[396, 210, 0.05, 7, 0], [446, 192, 0.45, 6, 1], [492, 226, 0.75, 6, 0]] },
    oak: { shape: (x, y) => { let d = union(x, y, [[100, 394, 44, 26], [150, 404, 34, 22], [126, 420, 28, 12]], 14); d = Math.max(d, -ell(x, y, 132, 400, 9, 5)); return d; }, wob: 3, wobF: 14,
      kind: () => "reeds", beds: [[96, 400, 4], [160, 412, 4], [132, 402, 3]], punt: [114, 414], willows: [[60, 380, 1, 13]],
      birds: [["heron", 150, 398]], rings: [[100, 390, 0.1, 6, 0], [140, 410, 0.55, 5, 1]] },
    deep: 46, qmax: 0.5, zoom: [372, 168, 168, 112], loop: [330, 150, 230, 150],
  },
};
const BOARD = {
  fox: { realm: "foxmere", crop: [250, 100, 420, 280], towers: [["archer", 640, 200, 3]], at: 18 },
  oak: { realm: "oakmere", crop: [20, 236, 420, 280], towers: [["archer", 260, 300, 3]], at: 18 },
};
// scene names: l<n>_noon | l<n>_golden | l<n>_zoom | l<n>_pond | anim_lake<n>
// ---------------- VARIETY: the three approved kinds dealt across the Greenwood's boards ----------------
// Greenwood boards with a pond or lake today: Foxmere (190x80), Oakmere (84x46), Bramblewick (100x62). The deal: neighbours
// differ, size and shape from a seed; the tarn only where a stream can run in and out (culvert to culvert under the road);
// the reed fen on the low, wet board. A fourth board (Thistlecrag) gets a small round mere in the best hollow clear of the road.
const rnd = (seed) => { let a = seed >>> 0 || 1; return () => ((a = (Math.imul(a, 1664525) + 1013904223) >>> 0) / 4294967296); };
// walk from (x, y) in direction dy until the road (a culvert) or the board's edge; meander from the seed
function rill1(x, y, ux, dy, R) {
  const l = Math.hypot(ux, dy), sx = ux / l, sy = dy / l;
  const a = [[x, y]], b = []; let cx = x, cy = y, cross = null, cur = a, after = 0, span = 0;
  const onRoad = (px, py) => W.nearestOnPath(px, py).d < W.PATH_HALF + 3;
  for (let i = 0; i < 90; i++) {
    const px = cx, py = cy, m = (R() - 0.5) * (cross ? 3 : 5); cx += sx * 6 - sy * m; cy += sy * 6 + sx * m;
    if (cy < -24 || cy > 584 || cx < -24 || cx > 864) { cur.push([cx, cy]); break; }
    if (!cross && onRoad(cx, cy)) {
      a.push([px, py]); cross = { near: [px, py] };
      while (onRoad(cx, cy) && span < 200) { cx += sx * 2; cy += sy * 2; span += 2; }
      cx += sx * 2; cy += sy * 2; cross.far = [cx, cy]; cur = b; b.push([cx, cy]); continue;
    }
    if (cross && onRoad(cx, cy)) break;
    if (cross) { cur.push([cx, cy]); if (++after > 10) break; continue; }
    if (i % 3 === 2) cur.push([cx, cy]);
  }
  if (!cross) a.push([cx, cy]);
  return { a, b, span: cross ? span : 999, arch: cross ? (dy < 0 ? cross.near : cross.far) : null, cope: cross ? (dy < 0 ? cross.far : cross.near) : null };
}
// walk from the lake up (dy -1) or down (+1); when it meets a road it CROSSES it (a culvert) and carries on beyond, so every
// stream that goes under a road is seen coming out the other side. Of five headings it keeps the one with the shortest
// crossing (never one that runs along the road). An arch mouth only ever on the road's SOUTH verge; the north verge: coping.
// (pass 4, owner: "Lets just remove this feature": no culverts, no stream under a road.) A stream is kept only if its
// course reaches the board's edge across open ground; rillClear returns that stretch (upstream -> downstream order is
// the caller's) or null. rill() and the culvert painters stay, unused.
function rillClear(x, y, dy) {
  for (const ux of [0, -0.35, 0.35, -0.7, 0.7]) {
    const r = rill1(x, y, ux, dy, rnd(Math.round(x * 13 + ux * 100)));
    const end = r.a[r.a.length - 1];
    if (r.span === 999 && (end[1] < -20 || end[1] > 580 || end[0] < -20 || end[0] > 860)) return r.a;
  }
  return null;
}
function rill(x, y, dy, R) {
  let best = null;
  for (const ux of [0, -0.35, 0.35, -0.7, 0.7]) { const r = rill1(x, y, ux, dy, rnd(Math.round(x * 13 + ux * 100))); if (!best || r.span < best.span - 6 || (r.span < 999 && r.b.length > best.b.length + 3 && r.span <= best.span + 6)) best = r; }
  return best;
}
export function genLook(kind, cx, cy, rx, ry, seed) {
  const R = rnd(seed), sg = R() < 0.5 ? -1 : 1, j = (a) => (R() - 0.5) * a;
  if (kind === "mere") {
    const bay = [cx - sg * rx * 0.62, cy + ry * 0.4];
    return { shape: (x, y) => union(x, y, [[cx, cy, rx, ry], [cx + sg * rx * 0.42, cy - ry * 0.12 + j(4), rx * 0.52, ry * 0.82], [bay[0], bay[1] - 4, rx * 0.36, ry * 0.5]], rx * 0.34), wob: 1.6,
      kind: (x, y, nx, ny) => near(x, y, bay[0] - sg * 4, bay[1] + 6, rx * 0.34) ? "reeds" : ny < -0.05 ? "cut" : "lip",
      birds: [["duck", cx + sg * rx * 0.3, cy]], rings: [[cx - rx * 0.2, cy - 4, 0.2, 8, 1]] };
  }
  if (kind === "tarn") {
    const L1 = [cx - rx * 0.62, cy + j(ry * 0.5), rx * 0.42, ry * 0.72], L2 = [cx + j(6), cy - ry * 0.2, rx * 0.44, ry * 0.8], L3 = [cx + rx * 0.62, cy + j(ry * 0.5), rx * 0.4, ry * 0.7];
    const hd = [cx + rx * 0.3, cy + ry * 0.95, rx * 0.16, ry * 0.75];
    const inn = rillClear(L2[0] + j(10), L2[1] - L2[3] * 0.7, -1), out = rillClear(L1[0], L1[1] + L1[3] * 0.7, 1);
    return { shape: (x, y) => Math.max(union(x, y, [L1, L2, L3, [(L1[0] + L2[0]) / 2, (L1[1] + L2[1]) / 2, rx * 0.3, ry * 0.4], [(L2[0] + L3[0]) / 2, (L2[1] + L3[1]) / 2, rx * 0.26, ry * 0.4]], 9), -ell(x, y, ...hd)), wob: 3,
      kind: (x, y, nx, ny) => near(x, y, hd[0], hd[1] - hd[3] * 0.4, rx * 0.3) ? "rock" : ny < -0.05 ? "cut" : "lip",
      // the river painter runs each stretch upstream -> downstream: the inflow's stretches reversed
      streams: [inn && [inn.slice().reverse(), 18], out && [out, 22]].filter(Boolean)
        .map(([pts, w]) => ({ pts, w, spec: { def: "lip", flow: 0.65, zones: [{ bank: "E", from: 0, to: 999, kind: "cut" }] } })),
      culverts: [], seeps: [inn ? null : [L3[0] + L3[2] * 0.85, L3[1] - L3[3] * 0.4, 11], out ? null : [L1[0] - L1[2] * 0.9, L1[1] + L1[3] * 0.3, 9]].filter(Boolean),
      rocks: [[hd[0], hd[1] + 2, 1.1], [hd[0] + 8, hd[1] - 4, 0.7]], boulders: [[hd[0], hd[1] - hd[3] * 0.9, 3]], birds: [], rings: [[L2[0], L2[1], 0.15, 8, 1]] };
  }
  // the reed fen
  const E = [[cx - rx * 0.45, cy, rx * 0.55, ry * 0.85], [cx + rx * 0.2, cy - ry * 0.25, rx * 0.5, ry * 0.75], [cx + rx * 0.6, cy + ry * 0.2, rx * 0.4, ry * 0.7], [cx, cy + ry * 0.5, rx * 0.45, ry * 0.4]];
  const isl = [cx + j(rx * 0.3), cy + j(ry * 0.3), rx * 0.12, ry * 0.12];
  return { shape: (x, y) => Math.max(union(x, y, E, 14), -ell(x, y, ...isl)), wob: 3, wobF: 14, kind: () => "reeds",
    beds: [[isl[0], isl[1] + 2, 3], [cx - rx * 0.5, cy + ry * 0.2, 3]], punt: [cx + rx * 0.2, cy + ry * 0.3], willows: [[cx - rx * 1.05, cy - ry * 0.3, 1, 13]],
    birds: [["heron", cx - rx * 0.1, cy + ry * 0.2]], rings: [[cx, cy - 4, 0.1, 6, 0]] };
}
// ---------------- PONDS = SMALL LAKES (pass 5, owner: "just make them like small lakes ... I do like the little growth on
// the right side you have, with lillies and stuff, so you can work that in on some variants") ----------------
// A pond is the approved lake at a small size: the SAME water (the river's bands), the same edge kinds and the same sprites at
// the same pixel sizes (reeds, lilies, tussocks, the cut bank's 13 px face), so it never reads as a shrunken picture. What
// scales is only what belongs to the shape: depth (a small pond never reaches the river's middle), the bank's taper (over
// ~half the pond's width, not the big lake's 72 px), the number of lobes and props.
// genPond(kind, cx, cy, rx, ry, seed, growth): kind mere | tarn | fen; growth = +1 / -1 puts the lily patch on the east / west.
export function genPond(kind, cx, cy, rx, ry, seed, growth = 0) {
  const R = rnd(seed), sg = growth || (R() < 0.5 ? -1 : 1), j = (a) => (R() - 0.5) * a;
  const base = { wob: 1.4, ext: [cx - rx * 1.2, cx + rx * 1.2], bankFade: rx * 2 * 0.6, deep: Math.min(34, ry * 1.5), qmax: 0.8, birds: [], rings: [[cx - rx * 0.15, cy - 2, 0.25, 6, 1]] };
  let L;
  if (kind === "mere") {
    L = { ...base, shape: (x, y) => union(x, y, [[cx, cy, rx, ry], [cx - sg * rx * 0.38, cy - ry * 0.12 + j(3), rx * 0.58, ry * 0.86]], rx * 0.3),
      kind: (x, y, nx, ny) => ny < -0.05 ? "cut" : "lip", birds: growth ? [] : [["duck", cx - sg * rx * 0.25, cy - 2]] };
  } else if (kind === "tarn") {
    const L1 = [cx - rx * 0.42, cy + j(ry * 0.3), rx * 0.6, ry * 0.86], L2 = [cx + rx * 0.44, cy - ry * 0.16 + j(ry * 0.2), rx * 0.56, ry * 0.8], hd = [cx + rx * 0.04, cy + ry * 0.98, rx * 0.13, ry * 0.62];
    L = { ...base, wob: 2.4, deep: Math.min(18, ry * 0.9), qmax: 1, shape: (x, y) => Math.max(union(x, y, [L1, L2], 8), -ell(x, y, ...hd)),
      kind: (x, y, nx, ny) => near(x, y, hd[0], hd[1] - hd[3] * 0.5, rx * 0.32) ? "rock" : ny < -0.05 ? "cut" : "lip",
      rocks: [[hd[0] - 0.5, hd[1] - hd[3] * 0.45, 0.42]], boulders: [[hd[0] + 1, hd[1] - hd[3] * 0.95, 2.2]] };
  } else {   // the reed fen, small: shallow, ringed in reeds, a bed or two standing out in it
    L = { ...base, wob: 2.6, wobF: 12, deep: 30, qmax: 0.5, shape: (x, y) => union(x, y, [[cx - rx * 0.3, cy, rx * 0.7, ry * 0.9], [cx + rx * 0.4, cy - ry * 0.15, rx * 0.6, ry * 0.8]], 10),
      kind: () => "reeds", beds: [[cx + j(rx * 0.4), cy + j(ry * 0.3), 2]], birds: rx > 34 ? [["heron", cx + rx * 0.2, cy + ry * 0.1]] : [] };
  }
  if (growth) {   // the growth: one side turns to reeds, with a raft of lilies off it, flowering rush in its edge and flowers on the bank
    const gc = [cx + sg * rx * 0.86, cy + ry * 0.12], kd = L.kind;
    L.growth = { c: gc, side: sg, r: Math.max(rx * 0.42, 16), raft: [cx + sg * rx * 0.42, cy + ry * 0.05, rx * 0.3, ry * 0.36], seed };
    L.kind = (x, y, nx, ny) => near(x, y, gc[0], gc[1], L.growth.r) ? "reeds" : kd(x, y, nx, ny);
  }
  return L;
}
export const PONDS3 = {
  A: { kind: "mere", growth: 0, line: "A  small MERE: cut far bank, grassy near lip" },
  B: { kind: "tarn", growth: 0, line: "B  small TARN: two lobes, a rocky spit, dark" },
  C: { kind: "fen", growth: 0, line: "C  small REED FEN: shallow, ringed in reeds" },
  D: { kind: "mere", growth: 1, line: "D  mere + GROWTH east: lilies, flowering rush" },
  E: { kind: "tarn", growth: -1, line: "E  tarn + GROWTH west: lilies, rush, meadowsweet" },
};
// a rain puddle on grass or road in the lake's water: the river's palette (pale shallow bands), a shaded north lip, a lit
// south edge, the sky lying in it. [x, y, rx, ry, seed, on] (board units), as round 2's puddles.
function puddleW(Pp, pd, t, golden) {
  const [cx, cy, rx, ry, seed, on] = pd, X0 = cx * 2, Y0 = cy * 2;
  const Rr = (x, y) => { let best = 9; for (let q = 0; q < 3; q++) { const ox = (hs(seed, q, 1) - 0.5) * rx * 1.1, oy = (hs(seed, q, 2) - 0.5) * ry * 0.8, sx = rx * (0.55 + hs(seed, q, 3) * 0.45), sy = ry * (0.6 + hs(seed, q, 4) * 0.4); best = Math.min(best, Math.hypot((x - ox) / sx, (y - oy) / sy)); } return best + (vn(x / 3, y / 3, seed) - 0.5) * 0.18; };
  const xr = rx * 2 + 8, yr = ry * 2 + 8;
  for (let jj = -yr; jj <= yr; jj++) for (let ii = -xr; ii <= xr; ii++) {
    const r = Rr(ii / 2, jj / 2), X = X0 + ii, Y = Y0 + jj; if (r > 1.5) continue;
    const g = Pp.getp(X, Y);
    if (r > 1) { const a = (1.5 - r) / 0.5; Pp.set(X, Y, lerp(g, on === "road" ? hex("#5a442c") : hex("#2e4a26"), a * (on === "road" ? 0.5 : 0.42))); continue; }
    const idx = 6 - Math.min(0.42, (1 - r) * 0.6) * 6.2 + (bay(X, Y) - 0.5) * 0.3 + (vn(X / 7, Y / 3, 42) - 0.5) * 0.6;
    let c = WA[clamp(Math.round(idx), 0, 6)];
    if (vl(X / 9, Y / 4, seed + 5, 0.4, 0, t) > 0.68) c = lerp(c, hex("#a8ccc4"), 0.3);                         // the sky lying in it
    if (r > 0.8 && jj < 0) c = lerp(c, on === "road" ? hex("#3e2e1e") : hex("#22361e"), r > 0.9 ? 0.75 : 0.4); // its north lip shades it
    else if (r > 0.88 && jj > 0) c = lerp(c, FOAM2, 0.4);                                                        // the wet edge catches light
    if (golden) { c = lerp(c, hex("#7a6a62"), 0.12); if (jj > 0 && r > 0.6 && r < 0.8 && (X + Y) % 3 === 0) c = lerp(c, hex("#ffc870"), 0.5); }
    if (Math.abs(Math.sin((r - t) * 6 * Math.PI)) < 0.08 && r < 0.72 && hs(seed, 9) > 0.4) c = lerp(c, FOAM2, 0.3);
    Pp.set(X, Y, c);
  }
  if (on === "grass") { W.tussock(Pp, X0 - rx * 2 + 1, Y0 - ry + 1, seed + 3); if (rx > 10) W.reedClump(Pp, X0 + rx * 2 - 2, Y0 + ry * 0.5, 9, seed + 4, false); }
  else for (let q = 0; q < 2; q++) { const yy = Y0 + (q ? 1 : -1) * ry * 0.6; for (let x = -rx * 2 - 6; x < -rx * 2 + 2; x++) Pp.set(X0 + x, yy, hex("#4a3420"), 0.4); }
}
// the growth's own plants, hand-placed pixels at the river sprites' sizes
let GSW = 0, GNOW = 0;   // sway (art px) and the loop's clock
const ROSE = [hex("#f4b8cc"), hex("#e48aa8"), hex("#c06a8a")], CREAM = [hex("#fbf6e4"), hex("#ece4c4"), hex("#cfc6a0")], LOOSE = [hex("#d070c0"), hex("#a8509c")];
function rushFlower(Pp, X, Y, hgt, seed) {   // flowering rush: thin stems, a pink umbel on the tallest
  const n = 3 + Math.floor(hs(seed, 1) * 3), ph = TAU * GNOW - X / 60;
  for (let q = 0; q < n; q++) {
    const dx = (hs(seed, q, 2) - 0.5) * 6, H = hgt * (0.7 + hs(seed, q, 3) * 0.4), sw = GSW * Math.sin(ph + q * 0.5);
    let tx = X, ty = Y;
    for (let y = 0; y < H; y++) { tx = X + dx + sw * (y / H) * (y / H); ty = Y - y; Pp.set(tx, ty, y < 2 ? W.REED[0] : y < H * 0.5 ? W.REED[1] : W.REED[2]); }
    if (q === 0 || hs(seed, q, 4) > 0.55) {   // the umbel: a spray of pink florets
      for (const [ox, oy, c] of [[0, -1, 0], [-1, 0, 1], [1, 0, 1], [-2, 1, 2], [2, 1, 2], [0, 0, 0], [-1, -2, 0], [1, -2, 1]]) Pp.set(tx + ox, ty + oy, ROSE[c]);
      Pp.set(tx, ty + 1, hex("#6a8a3a"));
    }
  }
}
function bankFlower(Pp, X, Y, seed) {   // meadowsweet (cream froth) or purple loosestrife (a spike), on a leafy foot
  const loose = hs(seed, 7) > 0.6, ph = TAU * GNOW - X / 50, sw = Math.round(GSW * 0.7 * Math.sin(ph));
  for (let q = 0; q < 6; q++) { const a = -Math.PI / 2 + (hs(seed, q, 1) - 0.5) * 2.4, L = 2 + hs(seed, q, 2) * 3; for (let r = 0; r < L; r++) Pp.set(X + Math.cos(a) * r * 1.3, Y + Math.sin(a) * r * 0.7, r < 1 ? W.TURF[1] : W.TURF[3]); }
  const H = 7 + Math.floor(hs(seed, 3) * 4);
  for (let y = 1; y < H; y++) Pp.set(X + (y > H * 0.6 ? sw : 0), Y - y, W.TURF[2]);
  const tx = X + sw, ty = Y - H;
  if (loose) for (let y = 0; y < 5; y++) { Pp.set(tx, ty + y, LOOSE[y % 2]); if (y % 2 === 0) Pp.set(tx + 1, ty + y, LOOSE[1]); }
  else for (const [ox, oy, c] of [[0, 0, 0], [-1, 0, 1], [1, 0, 0], [-2, 1, 2], [2, 1, 1], [-1, 1, 1], [0, 1, 0], [1, 1, 2], [0, -1, 1], [-1, 2, 2], [1, 2, 2]]) Pp.set(tx + ox, ty + oy, CREAM[c]);
}
function padFlower(Pp, X, Y, seed) {   // a water-lily in flower, sitting a pixel proud of its pad
  const pink = hs(seed, 4) > 0.55, A = pink ? ROSE : CREAM;
  Pp.set(X, Y, hex("#f6e070")); Pp.set(X - 1, Y, A[0]); Pp.set(X + 1, Y, A[1]); Pp.set(X, Y - 1, A[0]); Pp.set(X - 1, Y - 1, A[1]); Pp.set(X + 1, Y - 1, A[2]); Pp.set(X, Y + 1, A[2]);
}
// lay the growth out once from the field: shore pixels inside the growth's circle get rushes (water side) and flowers (land side)
function planGrowth(Gr, F, X0, Y0) {
  const { D, w, h, NX, NY } = F, out = { rush: [], bank: [], pads: [] }, seen = new Set(), [gx, gy] = Gr.c, R2 = Gr.r * 2 + 6;
  for (let jj = 2; jj < h - 2; jj++) for (let ii = 2; ii < w - 2; ii++) {
    const k = jj * w + ii, d = D[k]; if (d > 0 || d < -1) continue;
    const X = X0 + ii, Y = Y0 + jj; if (Math.hypot(X - gx * 2, Y - gy * 2) > R2) continue;
    const cell = `${Math.floor(X / 9)},${Math.floor(Y / 9)}`; if (seen.has(cell)) continue; seen.add(cell);
    const r = hs(X, Y, 401), nx = NX[k], ny = NY[k];
    if (r < 0.55) out.rush.push([X - nx * 3, Y - ny * 3 + 2, 12 + hs(X, Y, 402) * 5, X * 7 + Y]);
    if (r > 0.25 && ny < 0.4) out.bank.push([X + nx * (5 + hs(X, Y, 403) * 5), Y + ny * (5 + hs(X, Y, 403) * 4) + 1, X * 3 + Y * 5]);
  }
  const [rx0, ry0, rrx, rry] = Gr.raft, Rn = rnd(Gr.seed * 7 + 3);
  for (let q = 0; q < 14; q++) {
    const a = Rn() * TAU, u = Math.sqrt(Rn()), X = Math.round((rx0 + Math.cos(a) * rrx * u) * 2), Y = Math.round((ry0 + Math.sin(a) * rry * u) * 2);
    const k = (Y - Y0) * w + X - X0; if (k < 0 || k >= w * h || D[k] > -4) continue;
    out.pads.push([X, Y, 2 + Math.round(Rn() * 2), q * 13 + Gr.seed, Rn() < 0.35]);
  }
  return out;
}

export const VARIETY = {
  foxmere: { kind: "mere", line: "FOXMERE: the LONG MERE: the board's big open water; a deep pool with a cut far bank (round 3's mere)", look: () => LOOKS[1].fox, c: [430, 210] },
  oakmere: { kind: "fen", line: "OAKMERE: the REED FEN: low meadow ground and a small pond beside the road: soft, wild, shallow", look: () => LOOKS[4].oak, c: [118, 398] },
  bramblewick: { kind: "tarn", line: "BRAMBLEWICK: a TARN in the road's loop: no open course for a stream, so a spring-fed pool (a seep and rushes at its ends)", gen: [285, 190, 62, 34, 7] },
  thistlecrag: { kind: "mere", line: "THISTLECRAG: a SMALL ROUND MERE in a hollow among the crags (placed by seed in the widest ground clear of the road)", gen: "auto", seed: 11 },
};
// ---------------- pass 5 scenes: ponds as small lakes, the existing pond boards, new water on dry boards ----------------
// p_<A-E>        one pond variant at Oakmere's pond place (the sheet: ?pondsheet=1 in the lab)
// pb_<realm>     a whole existing pond board, its pond redrawn, rain puddles in the lake's water
// nw_<realm>     a whole dry Greenwood board with new water (a spring-fed lake, a stream edge to edge)
// bare_<realm>   a whole board as it is (for choosing where water could go)
// anim_pond      the loop: variant D's growth moving
const OAK_POND = [120, 396, 40, 22];
const FULL = [0, 0, 840, 560];
const PUD = {
  foxmere: [[600, 150, 14, 6, 1, "grass"], [222, 420, 12, 5, 2, "grass"], [520, 470, 11, 5, 3, "road"], [130, 140, 16, 7, 4, "grass"]],
  oakmere: [[300, 420, 17, 7, 1, "grass"], [392, 296, 12, 5, 3, "grass"], [84, 476, 15, 6, 4, "grass"], [560, 200, 14, 6, 6, "grass"]],
  bramblewick: [[120, 300, 15, 6, 1, "grass"], [500, 420, 13, 6, 2, "grass"], [640, 140, 12, 5, 3, "grass"]],
};
export const SCN = {
  pond: (id) => { const V = PONDS3[id], L = genPond(V.kind, ...OAK_POND, 5 + id.charCodeAt(0), V.growth); return { realm: "oakmere", L, look: L, crop: [60, 356, 120, 80], label: V.line, raw: true }; },
  pb: (realm) => {
    if (realm === "foxmere") { const L = { ...LOOKS[1].fox }; return { realm, L, look: { deep: 38, qmax: 0.88 }, crop: FULL, puddles: PUD.foxmere,
      label: "FOXMERE: the long mere as approved; rain puddles now in the lake's own water" }; }
    if (realm === "oakmere") { const L = genPond("mere", ...OAK_POND, 73, 1); return { realm, L, look: L, crop: FULL, puddles: PUD.oakmere,
      label: "OAKMERE: its pond as a SMALL MERE with the growth (lilies, flowering rush, meadowsweet) on its east side" }; }
    const L = genLook("tarn", 285, 190, 62, 34, 7); return { realm, L, look: { deep: 18, qmax: 1 }, crop: FULL, puddles: PUD.bramblewick,
      label: "BRAMBLEWICK: the tarn left as it is (owner); rain puddles in the lake's water" };
  },
  nw: (realm) => { const N = NEWWATER[realm]; const L = N.make(); return { realm, L, look: L, crop: FULL, puddles: N.puddles || [], label: N.line }; },
  bare: (realm) => ({ realm, L: { shape: () => 99, kind: () => "lip" }, look: { deep: 30, qmax: 0.8 }, crop: FULL, label: realm + " as it is" }),
  anim: () => { const L = genPond("mere", ...OAK_POND, 73, 1); return { realm: "oakmere", L, look: L, crop: [5, 321, 230, 150], anim: { F: 30, fps: 10, cols: 6 } }; },
};
// NEW WATER on dry Greenwood boards (owner: "you can add more lakes and streams yes"): filled in pass 5 below
// Rules (owner): never across the road, never in the castle band (x > 738), no culverts; a stream runs edge to edge over open
// ground (or from a spring-fed lake to an edge) and is never narrower than the Greenwood's narrowest river (Millrace's race,
// 18): these are 28, the Greenwood rivers' own width. Placed from a road-distance grid of each board (20-unit cells), in ground that is the board's spare
// edge, not the bends where halls stand.
// a beck is drawn by the approved river painter with the approved rivers' own spec (widen 1.5, near "plain"), its course a
// smooth curve (Catmull-Rom through the points, ~8 units a segment) so no bank is ruled straight between two points
const spline = (P) => { const o = []; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)], n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 8));
  for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; o.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))); } }
  o.push(P[P.length - 1]); return o; };
const beck = (pts, w, zones) => ({ pts: spline(pts), w, spec: { def: "lip", near: "plain", widen: 1.5, flow: 0.6, zones } });
export const NEWWATER = {
  barrowfields: { line: "BARROWFIELDS: a BECK out of the wood along the south, wood's edge to the board's foot; never near the road",
    make: () => ({ shape: () => 99, kind: () => "lip", deep: 30, qmax: 0.8,
      streams: [beck([[-24, 452], [30, 466], [86, 490], [140, 498], [196, 494], [246, 506], [292, 524], [340, 532], [384, 550], [408, 590]], 28,
        [{ bank: "N", from: 30, to: 150, kind: "cut" }, { bank: "S", from: 150, to: 260, kind: "reeds" }])],
      rings: [[200, 507, 0.3, 5, 0]] }),
    puddles: [[600, 120, 14, 6, 1, "grass"]] },
  kingstones: { line: "KINGSTONES: a spring-fed MERE in the open ground east of the loop, its beck running off to the south edge",
    make: () => { const L = genPond("mere", 664, 376, 50, 32, 41, 0);
      L.streams = [beck([[658, 384], [652, 414], [640, 446], [642, 474], [656, 500], [660, 526], [648, 552], [636, 576], [634, 596]], 28, [{ bank: "E", from: 70, to: 150, kind: "cut" }])];
      L.streams[0].flare = 1.3; L.seeps = [[700, 346, 9]]; L.mouth = 26; L.ownBias = 40; return L; } },
  cinderholt: { line: "CINDERHOLT: a small spring-fed REED FEN in the low south-east corner, below the last leg of the road",
    make: () => { const L = genPond("fen", 632, 496, 58, 30, 23, 0); L.seeps = [[568, 516, 8]]; return L; } },
};
export const sceneOf = (name) => {
  const pm = /^(p|pb|nw|bare)_(\w+)$/.exec(name);
  if (pm || name === "anim_pond") {
    const S = name === "anim_pond" ? SCN.anim() : SCN[{ p: "pond", pb: "pb", nw: "nw", bare: "bare" }[pm[1]]](pm[2]);
    return { towers: [], at: 14, sun: "noon", anim: null, n: 9, ...S, kindName: pm ? pm[1] : "anim" };
  }
  const v = /^v_(\w+)$/.exec(name);
  if (v) { const V = VARIETY[v[1]]; return { variety: V, realm: v[1], towers: [], at: 14, crop: null, sun: "noon", anim: null, label: V.line, n: 9, look: { deep: V.kind === "fen" ? 46 : V.kind === "tarn" ? 18 : 38, qmax: V.kind === "fen" ? 0.5 : 0.88 } }; }
  const m = /^(?:anim_lake(\d)|l(\d)_(noon|golden|zoom|pond))$/.exec(name); if (!m) throw new Error("no scene " + name);
  const n = +(m[1] || m[2]), kind = m[1] ? "anim" : m[3], look = LOOKS[n], bd = kind === "pond" ? "oak" : "fox";
  const crop = kind === "zoom" ? look.zoom : kind === "anim" ? look.loop : BOARD[bd].crop;
  return { n, look, L: look[bd], bd, ...BOARD[bd], crop, sun: kind === "golden" ? "golden" : "noon", anim: kind === "anim" ? { F: 30, fps: 10, cols: 6 } : null,
    label: kind === "anim" ? null : (kind === "golden" ? look.line.split(":")[0] + " at golden hour" : kind === "zoom" ? look.line.split(":")[0] + ", 2.5x: its shore" : kind === "pond" ? look.line.split(":")[0] + " on a pond board (Oakmere)" : look.line) };
};

// ---------------- the lake's field: mask -> exact signed distance (art px, + land) ----------------
const INF = 1e20;
const BANK_FADE = 72;   // art px (36 board units)
function edt1(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
function edt(site, w, h) {   // squared distance to the nearest site pixel
  const out = new Float64Array(w * h), n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let i = 0; i < w; i++) { for (let j = 0; j < h; j++) f[j] = site[j * w + i] ? 0 : INF; edt1(f, h, d, v, z); for (let j = 0; j < h; j++) out[j * w + i] = d[j]; }
  for (let j = 0; j < h; j++) { for (let i = 0; i < w; i++) f[i] = out[j * w + i]; edt1(f, w, d, v, z); for (let i = 0; i < w; i++) out[j * w + i] = d[i]; }
  return out;
}
function lakeMask(L, X0, Y0, w, h, pad) {
  // the mask is laid on a padded grid so the shore beyond the crop still shapes the distances inside it
  const W2 = w + pad * 2, H2 = h + pad * 2, IN = new Uint8Array(W2 * H2);
  for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
    const X = X0 - pad + i, Y = Y0 - pad + j, x = X / 2, y = Y / 2;
    let v = L.shape(x, y);
    if (v > 12) continue;
    const LL = L.at ? L.at(x, y) : L;   // several ponds on one board: each keeps its own wobble
    const wob = (LL.wob || 0) + (LL.wobN && y < (LL.damY || 0) - 8 ? LL.wobN : 0);
    if (wob) v += (vn(x / (LL.wobF || 22), y / 14, 301) - 0.5) * 2 * wob + (vn(x / 7, y / 6, 302) - 0.5) * wob * 0.15;
    if (v >= 0) continue;
    // the road stays dry, and the shore curves away from it (a smooth max, never a straight clipped edge)
    const rd = W.nearestOnPath(x, y).d; v = -smin(-v, -(W.PATH_HALF + 14 - rd), 16);
    if (v >= 0) continue;
    IN[j * W2 + i] = 1;
  }
  return { IN, W2, H2 };
}
function sdfFrom(IN, W2, H2) {
  const out = new Uint8Array(W2 * H2); for (let k = 0; k < out.length; k++) out[k] = IN[k] ? 0 : 1;
  const dIn = edt(out, W2, H2), dOut = edt(IN, W2, H2), D = new Float32Array(W2 * H2);
  for (let k = 0; k < D.length; k++) D[k] = IN[k] ? -(Math.sqrt(dIn[k]) - 0.5) : Math.sqrt(dOut[k]) - 0.5;
  return D;
}
const unpad = (A, W2, w, h, pad) => { const o = new Float32Array(w * h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o[j * w + i] = A[(j + pad) * W2 + i + pad]; return o; };

function buildLake(sc, X0, Y0, w, h) {
  const L = sc.L, pad = 60, N = w * h;
  const { IN, W2, H2 } = lakeMask(L, X0, Y0, w, h, pad);
  const Dl = unpad(sdfFrom(IN, W2, H2), W2, w, h, pad);
  // the streams: the river painter's own field (it keeps them clear of the road and gives them their lanes)
  let Fr = null;
  if (L.streams) {
    const rivers = L.streams.map((s) => {
      // flare: a stream leaving (or entering) a lake opens out to it like a mouth over its first ~44 units, so the lake's
      // shore runs on into the stream's banks as one outline (no neck)
      const segs = []; let c = 0; const hwAt = (d) => (s.w / 2) * (1 + (s.flare || 0) * sstep(44, 0, d));
      for (let i = 0; i < s.pts.length - 1; i++) { const [x1, y1] = s.pts[i], [x2, y2] = s.pts[i + 1], len = Math.hypot(x2 - x1, y2 - y1); segs.push({ x1, y1, x2, y2, len, hw1: hwAt(c), hw2: hwAt(c + len) }); c += len; }
      return { w: s.w, segs };
    });
    Fr = W.buildField({ rivers: L.streams.map((s) => s.spec) }, rivers, [], X0, Y0, w, h);
  }
  const D = new Float32Array(N), OWN = new Int8Array(N);              // OWN 0 = the lake, 1 = a stream
  for (let k = 0; k < N; k++) {
    const dl = Dl[k]; let dr = Fr ? Fr.D[k] : 99;
    if (dr < 4) { const X = X0 + (k % w), Y = Y0 + Math.floor(k / w); if (W.nearestOnPath(X / 2, Y / 2).d < W.PATH_HALF + 5) dr = 4; }   // a stream goes UNDER the road
    D[k] = Fr ? smin(dl, dr, L.mouth || 7) : dl; OWN[k] = (L.ownBias ? dl > L.ownBias && dr < dl : dr < dl) ? 1 : 0;   // ownBias (art px): the lake's painter keeps its own water and the mouth that far out, so its shelving runs on into the stream
  }
  // normals from a softened copy of the field (toward land)
  const Ds = new Float32Array(N);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let s = 0, c = 0; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue; s += clamp(D[jj * w + ii], -30, 30); c++; }
    Ds[j * w + i] = s / c;
  }
  const NX = new Float32Array(N), NY = new Float32Array(N);
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) { const k = j * w + i, gx = Ds[k + 1] - Ds[k - 1], gy = Ds[k + w] - Ds[k - w], l = Math.hypot(gx, gy) || 1; NX[k] = gx / l; NY[k] = gy / l; }
  const KIND = new Array(N), NEAR = new Array(N).fill("overhang"), BODY = new Int8Array(N).fill(-1), KW = new Float32Array(N).fill(1), S = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    if (D[k] > 12) continue;
    const X = X0 + (k % w), Y = Y0 + Math.floor(k / w);
    S[k] = X * NY[k] * NY[k] + Y * NX[k] * NX[k];
    if (OWN[k] && Fr) { KIND[k] = Fr.KIND[k]; KW[k] = Fr.KW[k]; NEAR[k] = Fr.NEAR[k] || "overhang"; BODY[k] = 0; continue; }
    // the kind is read a little way out on the shore line (along the normal), so face and water agree
    const sx = (X + NX[k] * Math.max(0, -D[k])) / 2, sy = (Y + NY[k] * Math.max(0, -D[k])) / 2;
    KIND[k] = L.kind(sx + (vn(sx / 6, sy / 6, 303) - 0.5) * 5, sy, NX[k], NY[k]); BODY[k] = 0;
  }
  // a change of kind: the face tapers (KW) over ~10 art px each side, as the river's zones do
  for (let pass = 0; pass < 2; pass++) for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const k = j * w + i; if (BODY[k] < 0) continue;
    for (const q of [k - 1, k + 1, k - w, k + w]) if (BODY[q] >= 0 && KIND[q] !== KIND[k]) KW[k] = 0;
  }
  for (let it = 0; it < 12; it++) for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const k = j * w + i; if (BODY[k] < 0) continue;
    KW[k] = Math.min(KW[k], ...[k - 1, k + 1, k - w, k + w].filter((q) => BODY[q] >= 0 && KIND[q] === KIND[k]).map((q) => KW[q] + 0.09));
  }
  let xmin = 1e9, xmax = -1e9; for (let k = 0; k < N; k++) if (Dl[k] < 0) { const X = X0 + (k % w); if (X < xmin) xmin = X; if (X > xmax) xmax = X; }
  const F = { D, NX, NY, S, KIND, NEAR, BODY, KW, OWN, w, h, Fr, xmin, xmax, bodies: [{ type: "lake" }] };
  if (Fr) {   // the river painter's view: the merged edge, only the stream's pixels
    const B2 = new Int8Array(N).fill(-1); for (let k = 0; k < N; k++) if (OWN[k] && Fr.BODY[k] >= 0) B2[k] = Fr.BODY[k];
    F.Fr2 = { ...Fr, D, NX, NY, BODY: B2 };
  }
  return F;
}

// ---------------- the still water: the river's water, at rest ----------------
// Every colour step is the river's: idx = 6 - q x 6.2 + its Bayer nudge + its blotch noise, WA[round(idx)]. In the river q
// rises across the channel to its line; here it rises with the distance from the shore, to `deep` art px.
function paintLake(P, F, sc, t, X0, Y0, MOD) {
  const { D, NX, NY, KIND, NEAR, BODY, KW, OWN, w, h } = F, lookG = sc.look;
  const golden = W.DAY.id === "golden", fall = W.DAY.fall, slen = W.DAY.len || 0;
  const put = (k, c) => { P[k * 4] = c[0]; P[k * 4 + 1] = c[1]; P[k * 4 + 2] = c[2]; MOD[k] = 1; };
  for (let j = 2; j < h - 2; j++) for (let i = 2; i < w - 2; i++) {
    const k = j * w + i, d = D[k]; if (d > 8 || BODY[k] < 0 || OWN[k]) continue;
    const X = X0 + i, Y = Y0 + j, nx = NX[k], ny = NY[k], kind = KIND[k], isNear = ny > 0.35, s = F.S[k];
    // several ponds on one board (sc.L.at): each its own depth and its own ends for the bank's taper
    const LL = sc.L && sc.L.at ? sc.L.at(X / 2, Y / 2) : sc.L && sc.L.ext ? sc.L : null, look = LL ? LL : lookG;
    const ex0 = LL && LL.ext ? LL.ext[0] * 2 : F.xmin, ex1 = LL && LL.ext ? LL.ext[1] * 2 : F.xmax, bf = LL && LL.bankFade ? LL.bankFade : BANK_FADE;
    const g = [P[k * 4], P[k * 4 + 1], P[k * 4 + 2]];
    // a CUT bank never stops in a wedge: its face eases to nothing as the shore turns from north- to west/east-facing,
    // and over a long run (BANK_FADE art px) toward each end of the lake, so the turf lip above it is one continuous line
    const tp = kind === "cut" ? sstep(0.05, -0.55, ny) * sstep(ex0, ex0 + bf, X) * sstep(ex1, ex1 - bf, X) : 1;
    const ek = kind === "cut" && tp < 0.3 ? "lip" : kind;     // where the face has gone, the water meets a grassy lip
    if (d >= 0) {   // the land side: exactly the river's
      if (kind === "cut" && !isNear && d < 2.2 && tp > 0.05) put(k, lerp(g, TURF[5], (d < 1 ? 0.55 : 0.25) * Math.min(1, tp * 1.5)));
      else if (ek === "lip" && kind === "cut" && d < 3.5) put(k, lerp(g, TURF[1], (1 - d / 3.5) * 0.42 * (1 - tp / 0.3)));
      else if (kind === "rock" && !isNear && d < 2.2) put(k, lerp(g, TURF[5], d < 1 ? 0.55 : 0.25));
      else if (kind === "cut" && isNear && d < 1.2) put(k, lerp(g, TURF[4], 0.4));
      else if (kind === "quay" && d < (isNear ? 9 : 5)) {
        const run = Math.floor((s + (isNear ? 0 : 3)) / 11), jt = ((s % 11) + 11) % 11 < 1;
        let c = STONE[4 - (hs(run + (d > 4.5 ? 7 : 0), 1, 5) > 0.6 ? 1 : 0)]; if (jt || (isNear && Math.abs(d - 4.5) < 0.6)) c = STONE[2]; if (d > (isNear ? 8 : 4)) c = STONE[1]; if (d < 1) c = STONE[5];
        if (hs(X, Y, 7) > 0.93) c = lerp(c, hex("#7a8a50"), 0.5); put(k, c);
      } else if (kind === "lip" || kind === "reeds") { if (d < 3.5) put(k, lerp(g, kind === "reeds" ? hex("#3a5a2c") : TURF[1], (1 - d / 3.5) * 0.42)); }
      continue;
    }
    const kwt = sstep(0, 1, KW[k]), e = -d, fw = (kind === "cut" ? (isNear ? 0 : W.HFACE.cut * tp) : W.faceW(kind, nx, ny)) * (0.15 + 0.85 * kwt);
    if (e < fw) { put(k, W.facePixel(kind, e / fw, fw, e, X, Y, s, -nx, -ny)); continue; }
    let ew = e - fw;
    if (isNear && (ek === "cut" || kind === "rock" || kind === "quay")) {
      if (kind === "quay") { if (ew < 2) { put(k, ew < 1 ? STONE[2] : STONE[0]); continue; } }
      else if (ew < 1.6) { put(k, ew < 0.8 ? TURF[3] : TURF[1]); continue; }
    }
    // depth: the river's q, measured from the shore; a shelving edge lightens right at it, as the river's does
    const qc = clamp((ew + (vn(X / 30, Y / 14, 43) - 0.5) * 8) / look.deep, 0, 1) * look.qmax;
    const qe = ek === "cut" || kind === "rock" || kind === "quay" ? 1 : clamp(ew / 14, 0, 1);
    const q = Math.min(qc, 0.35 + qe * 0.65) + (vn(X / 22, Y / 12, 41) - 0.5) * 0.18 * (1 - 0.6 * sstep(12, 34, ew));
    const idx = 6 - q * 6.2 + (bay(X, Y) - 0.5) * 0.3 + (vn(X / 7, Y / 3, 42) - 0.5) * 0.9 * (1 - 0.6 * sstep(12, 34, ew)), ri = clamp(Math.round(idx), 0, 6);
    let c = WA[ri];
    // the bank's shade and the low sun's long shadow (the river's)
    const fdot = -(nx * fall[0] + ny * fall[1]), Hs = (ek === "cut" ? W.HFACE.cut * tp : W.HFACE[ek]) || (ek === "lip" || ek === "reeds" ? 3 : 1.5);
    const shadeLen = (isNear ? 0 : Math.max(0, -ny) * Hs * 0.45) + Math.max(0, fdot) * Hs * (0.3 + slen * 0.55) + (isNear ? 3.2 : 0);
    const shade = ew < shadeLen ? (ew < shadeLen - 1.5 ? 0.62 : 0.78) : 0;
    // the edge itself (the river's)
    if (ek === "lip" && ew < 1.2) c = hex("#22361e");
    else if (ek === "lip" && ew < 6) c = lerp(c, hex("#4c7a3c"), 0.32 * (1 - ew / 6));
    else if (kind === "reeds" && ew < 12) c = lerp(c, hex("#3e5636"), 0.42 * (1 - ew / 12));
    else if ((ek === "cut" || kind === "rock") && !isNear && ew < 1.3) c = lerp(c, FOAM2, 0.55);
    else if (kind === "quay" && !isNear && ew < 2.2) c = ew < 1.1 ? hex("#3a5a34") : lerp(c, FOAM2, 0.35);
    // still water's marks, in the river's mark language: its light dashes (one tone up, two up, a foam fleck), but lying
    // in level wind-lanes, forming and fading where they lie (a slow cross-fade, ~6 px of drift a loop), never running
    if (ew > 5) {
      const lv = Y / 7 + vn(X / 60, Y / 40, 151) * 0.8, Ln = Math.round(lv), lane = Math.abs(lv - Ln);
      const n1 = vl(X / 26 + Ln * 3.7, Ln * 1.3, 152 + sc.n, 0.25, 0, t);
      if (lane < 0.1 && n1 > 0.7) c = lerp(c, WA[Math.min(6, ri + 1)], 0.7);
      if (lane < 0.08 && n1 > 0.8) c = lerp(c, WA[Math.min(6, ri + 2)], 0.75);
      if (lane < 0.07 && n1 > 0.9 && ew > 8) c = lerp(c, FOAM2, 0.55);
    }
    const cl = vn(X / 60, Y / 22, 72);                                                                       // the sky lying on it: still
    if (cl > 0.66 + bay(X, Y) * 0.08 && ew > 8) c = lerp(c, hex("#a8ccc4"), 0.16);
    // the lap at the foot of a face: foam working in and out (a breath a loop, travelling along the shore)
    if ((ek === "cut" || kind === "rock" || kind === "quay") && !isNear && ew < 4 && sc.anim) {
      const f2 = vn(s / 7, ew / 2.2, 79), br = 0.5 + 0.5 * Math.sin(TAU * t - s / 30);
      if (kind !== "quay" && ew < 3.2 && f2 > 0.66 - br * 0.16 - (ew < 1.6 ? 0.08 : 0)) c = lerp(c, FOAM, ew < 1.6 ? 0.7 : 0.4);
      if (kind === "quay" && ew > 1.4 && f2 > 0.74 - br * 0.12) c = lerp(c, WA[Math.min(6, ri + 2)], 0.6);
    }
    if (golden) {   // the river's golden hour; on a broad lake its glitter gathers into fewer, sparser paths
      const glint = vn(X / 8 + t * 2, Y / 1.4, 80), band = vn(X / 160, Y / 46, 81), west = 1 - clamp((X - X0) / (w * 1.1), 0, 1);
      c = lerp(c, hex("#7a6a62"), 0.12);
      if (glint > 0.95 - band * 0.12 - west * 0.04 && band > 0.62 && (Y % 2 === 0) && ew > 5 && shade === 0) c = lerp(c, hex("#ffc870"), 0.65);
    }
    if (shade) c = lerp(mul(c, shade), golden ? hex("#2a2050") : hex("#14262e"), 0.12);
    put(k, c);
  }
}

// ---------------- props sculpted with the game's pixel sculptor ----------------
const blit = (Pp, img, X, Y, alpha = 1) => { const { w, h, data } = img; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = (j * w + i) * 4; if (data[k + 3] < 128) continue; Pp.set(X + i, Y + j, [data[k], data[k + 1], data[k + 2]], alpha); } };
const M = {};
const mats = () => {
  if (M.wood) return M;
  Object.assign(M, { wood: mat("#8a6238", { contrast: 1.15 }), woodD: mat("#6a4624", { contrast: 1.1 }), inside: mat("#50361f", { contrast: 1.1 }), rail: mat("#b8925e", { contrast: 1.1 }),
    strake: mat("#e8e0c8"), plank: mat("#b89060", { contrast: 1.15 }), pile: mat("#5a4030", { contrast: 1.2 }), stone: mat("#a49c8a", { contrast: 1.2 }), stoneD: mat("#7a7466", { contrast: 1.2 }),
    iron: mat("#3a3a44", { contrast: 1.2 }), field: mat("#9a8e76", { contrast: 1.2 }), field2: mat("#8a8a7a", { contrast: 1.2 }), mossy: mat("#7a8a56", { contrast: 1.15 }), cope: mat("#b4a888", { contrast: 1.15 }), moss: mat("#6a9a3a"), fern: mat("#4f8a3a"), rope: mat("#c8aa70"), coat: mat("#6a5a3a", { contrast: 1.1 }), hat: mat("#4a3a2a"), skin: mat("#e8b990"), pole: mat("#c4a276"), net: flat("#8a7a5a") });
  return M;
};
// a clinker skiff seen from above and in front: hull, cream strake, pale rail, two thwarts, the far side's planking in shade
function skiffImg(len = 52) {
  const m = mats(), H = len / 2, P = new Pix(len + 8, 28, Math.floor(len / 2) + 4, 12);
  const hw = (u) => 6 * Math.sqrt(Math.max(0, 1 - u * u)) * (u > 0 ? Math.pow(1 - u, 0.2) : 1);
  const edge = (k, dy = 0) => { const top = [], bot = []; for (let a = 0; a <= 24; a++) { const u = -0.9 + (a / 24) * 1.9, x = u * H; top.push([x, -hw(u) * k + dy]); bot.push([x, hw(u) * k + dy]); } return top.concat(bot.reverse()); };
  P.poly(edge(1, 3), m.woodD, 1, { round: 0.5 });                                                   // the near side of the hull
  P.part(); P.poly(edge(1, 0), m.rail, 2, { n: [0, -0.5, 0.86] });                                  // the gunwale
  P.part(); P.poly(edge(0.78, 0.3).map(([x, y]) => [x * 0.94, y]), m.inside, 3, { n: [0, -0.1, 1] });
  P.part(); for (let a = 0; a <= 22; a++) { const u = -0.86 + (a / 22) * 1.8; P.dot(u * H, hw(u) + 1.5, m.strake, 2.5, { n: [0, 0.8, 0.6] }); }
  P.part(); for (const x of [-H * 0.3, H * 0.28]) P.rect(x - 1.2, -5.5, 2.4, 11, m.wood, 4, { n: [0, -0.3, 0.95] });
  P.part(); P.line(-H * 0.7, 1, H * 0.15, -2, m.pole, 5);                                            // an oar shipped
  return P.resolve({ line: "tint" });
}
// a fowler's punt: long, flat, square-ended; a pole laid along it, a net and a basket, a wildfowler crouched at the stern
function puntImg() {
  const m = mats(), P = new Pix(52, 26, 26, 14);
  P.poly([[-22, -4], [21, -5], [23, -2], [23, 3], [21, 5], [-22, 4], [-24, 2], [-24, -2]], m.woodD, 1, { round: 0.4 });
  P.part(); P.poly([[-20, -2.5], [20, -3], [21, 2.5], [-20, 2.5]], m.inside, 2, { n: [0, -0.2, 1] });
  P.part(); P.line(-25, -1, 24, -4, m.pole, 4);
  P.part(); P.ellipse(6, 0, 3, 2, m.net, 3, { round: 0.8 });
  P.part(); P.ellipse(-14, -2, 3.2, 3.6, m.coat, 5); P.ellipse(-13, -7, 2.4, 2.4, m.skin, 6); P.ellipse(-13, -8.5, 3, 1.6, m.hat, 7);
  P.part(); P.line(-12, -4, -6, -14, m.pole, 6);                                                                     // his fowling piece, upright
  return P.resolve({ line: "tint" });
}
// a plank jetty running out from the dam: piles with wet feet, a deck with gaps, a mooring post
function jettyImg(len) {
  const m = mats(), wd = 14, P = new Pix(wd + 10, len + 14, Math.floor(wd / 2) + 5, len + 6);
  for (const y of [-len + 2, -len / 2, 0]) for (const x of [-wd / 2, wd / 2 - 1]) { P.part(); P.rect(x, y - 2, 2, 7, m.pile, 1, { round: 0.6 }); }
  P.part(); P.rect(-wd / 2 - 0.5, -len, wd + 1, len + 2, m.plank, 3, { n: [0, -0.35, 0.94] });
  for (let y = -len + 4; y < 1; y += 4) P.line(-wd / 2 + 1.5, y, wd / 2 - 1.5, y, m.plank, 3.5, { noLine: true, fix: 2 });
  P.line(-wd / 2 + 0.5, -len, -wd / 2 + 0.5, 1, m.strake, 3.6, { noLine: true });
  P.part(); P.rect(wd / 2 - 1.5, -len - 4, 2, 6, m.pile, 5, { round: 0.6 });
  return P.resolve({ line: "tint" });
}
// the sluice in the dam: two dressed piers and a timber gate on its rack, the head beam across
function sluiceImg() {
  const m = mats(), P = new Pix(36, 30, 18, 20);
  for (const x of [-12, 8]) { P.part(); P.rect(x, -14, 5, 18, m.stone, 2, { round: 0.3 }); P.rect(x - 0.5, -16, 6, 3, m.stoneD, 3); }
  P.part(); P.rect(-7, -10, 15, 7, m.plank, 1, { n: [0, -0.3, 0.95] });
  P.part(); P.rect(-13, -19, 27, 3, m.woodD, 4, { round: 0.5 });
  P.part(); P.rect(-1, -26, 2, 8, m.iron, 5); P.ellipse(0, -26, 3, 1.4, m.iron, 6);                               // the rack's wheel
  return P.resolve({ line: "tint" });
}
// A CULVERT's south-facing headwall (the only face that shows an arch): rough Greenwood fieldstone in courses, a ring of
// voussoirs with a keystone, a kerb of the road's own edge over it, moss and ferns. Its origin is the waterline under the
// arch's middle; the opening is left empty (the mouth is painted into the water layer under it: see drawArchMouth).
const ARCH_SPRING = 3;
function archImg(ow, H) {
  const m = mats(), r = ow / 2, Wd = ow + 28, P = new Pix(Wd + 4, H + 10, Math.floor(Wd / 2) + 2, H + 6), R = rnd(ow * 31 + H);
  const inOpen = (x, y) => (y > -ARCH_SPRING && Math.abs(x) < r) || Math.hypot(x, y + ARCH_SPRING) < r;
  const tones = [m.stone, m.stoneD, m.field, m.field2, m.mossy];
  for (let y = -H + 1, row = 0; y < 2; y += 4, row++) for (let x = -Wd / 2 + (row & 1 ? 3 : 0); x < Wd / 2; ) {
    const sw = 5 + Math.floor(R() * 4), cx = x + sw / 2, cy = y + 1.6;
    if (!inOpen(cx, cy) && Math.hypot(cx, cy + ARCH_SPRING) > r + 3.5) { P.part(); P.rect(x, y, sw - 0.4, 3.6, tones[Math.floor(R() * (y > -5 ? 5 : 4))], 1, { n: [0, 0.35, 0.94], round: 0.4 }); }
    x += sw;
  }
  for (let a = 0; a < 9; a++) {   // the ring
    const t0 = Math.PI + (a / 9) * Math.PI, t1 = Math.PI + ((a + 1) / 9) * Math.PI, key = a === 4, ro = r + (key ? 5 : 3.8);
    const pts = [[Math.cos(t0) * r, Math.sin(t0) * r - ARCH_SPRING], [Math.cos(t0) * ro, Math.sin(t0) * ro - ARCH_SPRING], [Math.cos(t1) * ro, Math.sin(t1) * ro - ARCH_SPRING], [Math.cos(t1) * r, Math.sin(t1) * r - ARCH_SPRING]];
    P.part(); P.poly(pts, key ? m.cope : m.stone, 2, { n: [Math.cos((t0 + t1) / 2) * 0.3, 0.3, 0.9] });
  }
  for (let x = -Wd / 2 - 1; x < Wd / 2 + 1; ) { const sw = 6 + Math.floor(R() * 5); P.part(); P.rect(x, -H - 3, sw - 0.5, 4, m.cope, 3, { n: [0, -0.7, 0.7], round: 0.3 }); x += sw; }   // the kerb
  for (let q = 0; q < 6; q++) { P.part(); P.ellipse(-Wd / 2 + R() * Wd, -H - 2.5 + R() * 2, 1.5 + R() * 2, 1, m.moss, 4); }
  for (const sx of [-1, 1]) for (let q = 0; q < 5; q++) { const fx = sx * (r + 6 + R() * 6), a = -Math.PI / 2 + sx * (0.3 + q * 0.25); P.part(); P.line(fx, 1, fx + Math.cos(a) * 6, 1 + Math.sin(a) * 5, m.fern, 5); }
  return P.resolve({ line: "tint" });
}
// the mouth: dark stone soffit, black-blue depth, the stream sliding OUT of the dark toward us over a lit lip, and the
// arch broken in the water in front. (X, Y) = the waterline under the arch, art px.
function drawArchMouth(Pp, X, Y, ow, t) {
  const r = ow / 2;
  for (let j = -(r + ARCH_SPRING) - 1; j <= 0; j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) {
    const inside = (j > -ARCH_SPRING && Math.abs(i) < r) || Math.hypot(i, j + ARCH_SPRING) < r; if (!inside) continue;
    const rim = r - Math.hypot(i, Math.min(0, j + ARCH_SPRING));
    let c = rim < 2 ? hex("#2a3238") : rim < 4 ? hex("#161e24") : hex("#0a1014");
    if (j > -3) {   // the water inside the tunnel, darkening into it, its dashes sliding out
      c = lerp(hex("#0c161c"), mul(WA[1], 0.75), (j + 3) / 3);
      if (Math.sin(TAU * (2 * t) - (j * 1.7) + hs(i, 3, 5) * 6) > 0.75 && Math.abs(i) < r - 2) c = lerp(c, WA[3], 0.5);
    }
    Pp.set(X + i, Y + j, c);
  }
  for (let i = -Math.floor(r) + 1; i < r; i++) if (Math.sin(TAU * t * 2 + i * 0.9) > -0.2) Pp.set(X + i, Y + 1, FOAM2, 0.55);     // the lit lip
  for (let k = 2; k < 9; k++) {   // the arch's reflection, wobbling
    const wob = Math.round(Math.sin(TAU * t + k * 0.8)), w2 = r + 3 - k * 0.3;
    for (let i = -Math.floor(w2); i <= w2; i++) Pp.set(X + i + wob, Y + k, Math.abs(i) < r - k * 0.5 ? hex("#0a1216") : hex("#8a8472"), (Math.abs(i) < r - k * 0.5 ? 0.4 : 0.22) * (1 - k / 9));
  }
}
// the NORTH verge: the headwall faces away; we see only its coping, and the water darkening as it slides under
function drawCoping(Pp, X, Y, ow, t) {
  const R = rnd(ow * 7 + X), half = ow / 2 + 7;
  for (let j = -9; j <= 0; j++) for (let i = -ow / 2; i <= ow / 2; i++) Pp.set(X + i, Y + j, hex("#0a1216"), 0.55 * ((j + 9) / 9) ** 1.6);
  for (let i = -ow / 2 + 1; i < ow / 2; i++) if (Math.sin(TAU * t * 2 + i * 0.8) > 0.6) Pp.set(X + i, Y - 4 + ((i + Math.floor(t * 30)) % 3 === 0 ? 1 : 0), WA[3], 0.4);
  for (let x = -half; x < half; ) {
    const sw = 5 + Math.floor(R() * 4), tone = R();
    for (let i = 0; i < sw - 1; i++) for (let j = 0; j < 4; j++) Pp.set(X + x + i, Y + 1 + j, j === 0 ? hex("#c4b898") : j === 3 ? hex("#5e5648") : tone > 0.7 ? hex("#8a9060") : hex("#a09478"));
    Pp.set(X + x + sw - 1, Y + 2, hex("#4a443a")); x += sw;
  }
}
let IMG = null;
const imgs = () => (IMG ||= { skiff: skiffImg(), punt: puntImg(), sluice: sluiceImg(), arch: {}, jetty: {} });

// ---------------- the scene ----------------
export async function runScene(name, q) {
  const sc = sceneOf(name), log = [], DT = 1 / 60;
  W.setDay(sc.sun);
  W.selectRealm(sc.realm); W.selectFaction("greenwood"); W.setWaveWindow(null); W.setLevelWeather(null);
  IMG = null; for (const k in M) delete M[k];   // the sculpts take the sun of the day being drawn
  if (sc.variety) {
    const V = sc.variety; let cx, cy;
    if (V.look) { sc.L = V.look(); [cx, cy] = V.c; }
    else {
      let gx = V.gen;
      if (gx === "auto") {   // the widest ground clear of the road, the rivers and the board's edge
        const segs = W.RIVERS.flatMap((r) => r.segs), rd = (x, y) => Math.min(999, ...segs.map((g2) => { const vx = g2.x2 - g2.x1, vy = g2.y2 - g2.y1, t = clamp(((x - g2.x1) * vx + (y - g2.y1) * vy) / (vx * vx + vy * vy || 1), 0, 1); return Math.hypot(x - g2.x1 - vx * t, y - g2.y1 - vy * t) - r0(g2); }));
        const r0 = () => 20; let best = [0, 420, 280];
        for (let y = 70; y <= 490; y += 10) for (let x = 70; x <= 700; x += 10) { const sc2 = Math.min(W.nearestOnPath(x, y).d - W.PATH_HALF, rd(x, y), x - 20, 720 - x, y - 20, 540 - y); if (sc2 > best[0]) best = [sc2, x, y]; }
        const r = clamp(best[0] - 22, 22, 42); gx = [best[1], best[2], r, r * 0.66, V.seed];
      }
      [cx, cy] = gx; sc.L = genLook(V.kind, ...gx);
    }
    sc.crop = [clamp(Math.round(cx - 210), 0, 420), clamp(Math.round(cy - 140), 0, 280), 420, 280];
    log.push(`lake at ${Math.round(cx)},${Math.round(cy)}`);
  }
  const g = {
    run: { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 }, gold: 1e7, lives: 9999, wave: 3, phase: "build",
    towers: [], enemies: [], projectiles: [], effects: [], spawnQueue: [], spawnTimer: 0, speed: 1, paused: false,
    selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null,
    cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null, buildMenuOpen: false, victory: false, rush: false, bands: [], militiaCd: 0, freeplay: true,
  };
  for (const [kd, x0, y0, lv] of sc.towers) {
    let spot = null;
    for (let r = 0; r < 70 && !spot; r += 3) for (let a = 0; a < 6.28 && !spot; a += 0.4) { const x = x0 + Math.cos(a) * r, y = y0 + Math.sin(a) * r; if (W.buildableAt(g, x, y, kd)) spot = [x, y]; }
    if (!spot) { log.push("no spot " + kd); continue; }
    W.placeTower(g, kd, spot[0], spot[1]); const tw = g.towers[g.towers.length - 1]; for (let l = 1; l < lv; l++) W.upgradeTower(g, tw); tw.readyAt = 0; tw.raised = null;
  }
  for (let i = 0; i < 30; i++) W.updateGame(g, DT);
  W.startWave(g);
  for (let el = 0; el < (sc.anim ? 0 : sc.at); el += DT) { W.updateGame(g, DT); g.lives = 9999; if (g.phase !== "combat") W.startWave(g); }
  if (sc.anim) { g.enemies = []; g.projectiles = []; g.effects = []; }
  const L = sc.L;
  // the board's own water goes; the lake is drawn new. Work on the whole board's art px, then crop.
  const [cx0, cy0, cw, ch] = sc.crop, X0 = cx0 * 2, Y0 = cy0 * 2, w = cw * 2, h = ch * 2;
  W.RIVERS.length = 0; W.PONDS.length = 0;
  const t0 = performance.now();
  const F = buildLake(sc, X0, Y0, w, h);
  log.push(`field ${Math.round(performance.now() - t0)} ms`);
  // decor that now stands in the water (or on its very edge) is taken away; the look's own rocks are added
  const dAt = (x, y) => { const i = Math.round(x * 2) - X0, j = Math.round(y * 2) - Y0; return i < 0 || j < 0 || i >= w || j >= h ? 99 : F.D[j * w + i]; };
  for (let i = W.DECOR.length - 1; i >= 0; i--) { const d = W.DECOR[i]; if (dAt(d.x, d.y) < 10 || L.shape(d.x, d.y) < 5 || (/reed|lily/.test(d.t) && dAt(d.x, d.y) < 40)) W.DECOR.splice(i, 1); }
  for (const [x, y, s] of L.rocks || []) W.DECOR.push({ x, y, t: "rock", s, v: Math.round(x) % 3 });
  const crop = (cv) => { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(cv, X0, Y0, w, h, 0, 0, w, h); return c; };
  const cvA = document.createElement("canvas"); cvA.width = 1680; cvA.height = 1120;
  W.draw(g, cvA, { current: null }); W.draw(g, cvA, { current: null });
  const A = crop(cvA).getContext("2d").getImageData(0, 0, w, h).data;
  const keep = { towers: g.towers, enemies: g.enemies, bands: g.bands, projectiles: g.projectiles, effects: g.effects };
  Object.assign(g, { towers: [], enemies: [], bands: [], projectiles: [], effects: [] });
  const decorKeep = W.DECOR.splice(0), brKeep = W.BRIDGES.splice(0);
  const cvB = document.createElement("canvas"); cvB.width = 1680; cvB.height = 1120;
  W.draw(g, cvB, { current: null }); W.draw(g, cvB, { current: null });
  W.DECOR.push(...decorKeep); W.BRIDGES.push(...brKeep); Object.assign(g, keep);
  const Bd = crop(cvB).getContext("2d").getImageData(0, 0, w, h).data;
  const LF = sc.anim ? sc.anim.F : 30;
  W.__set({ LF, SWAY: sc.anim ? { reeds: 1.6, grass: 0.9, lily: 1 } : { reeds: 0, grass: 0, lily: 0 } });
  const frames = sc.anim ? Array.from({ length: LF }, (_, i) => i / LF) : [+(q.get("t") || 0)];
  const SHADE = W.DAY.shade || [42, 28, 44];
  const I = imgs();
  // the willows (the approved strand willow, round 2's trees), baked once
  const willows = (L.willows || []).map(([x, y, form, seed]) => ({ x, y, sp: SP.willow(PAL.summer, form === 2 ? 0.8 : 0.9, 0, 0, seed, TREAT[3], { form, wet: 0 }) }));
  const GP = L.growth ? planGrowth(L.growth, F, X0, Y0) : null;
  const outs = [];
  for (const ft of frames) {
    W.__set({ NOW: ft });
    const P = new Uint8ClampedArray(Bd), MOD = new Uint8Array(w * h);
    if (F.Fr2) W.paintWater(P, F.Fr2, { anim: !!sc.anim }, ft, X0, Y0, MOD);
    paintLake(P, F, sc, ft, X0, Y0, MOD);
    const Pp = W.canvasPainter(P, w, h, X0, Y0, MOD);
    const items = W.dressShores(Pp, F, sc, ft, X0, Y0);
    const bob = (ph) => (Math.sin(TAU * ft + ph) > 0.45 ? 1 : 0);
    for (const [x, y, r] of L.boulders || []) items.push({ y: y * 2, fn: () => W.boulder(Pp, x * 2, y * 2, r * 2, Math.round(x + y), ft) });
    for (const [x, y, r] of L.beds || []) items.push({ y: y * 2, fn: () => { for (let q2 = 0; q2 < r; q2++) W.reedClump(Pp, x * 2 + (hs(q2, x, 1) - 0.5) * r * 6, y * 2 + (hs(q2, y, 2) - 0.5) * r * 2.4, 11 + hs(q2, 3, x) * 6, x * 7 + q2 * 13); } });
    for (const [x, y] of L.lilies || []) items.push({ y: -1e4, fn: () => { for (let q2 = 0; q2 < 5; q2++) W.lily(Pp, x * 2 + (hs(q2, x, 3) - 0.5) * 18, y * 2 + (hs(q2, y, 4) - 0.5) * 8, 2 + Math.round(hs(q2, 5, x) * 2), x + q2 * 7); } });
    for (const [kd, x, y] of L.birds || []) items.push({ y: y * 2 + 8, fn: () => {
      if (kd === "heron") return W.bird(Pp, kd, x * 2, y * 2, ft, false);
      const ph = TAU * ft + x * 0.7; W.bird(Pp, kd, x * 2 + Math.round(2.5 * Math.cos(ph)), y * 2 + Math.round(Math.sin(ph)), ft, Math.sin(ph) < 0);
    } });
    for (const pd of sc.puddles || []) items.push({ y: -2e4, fn: () => puddleW(Pp, pd, ft, W.DAY.id === "golden") });
    if (GP) {
      GSW = sc.anim ? 1.4 : 0; GNOW = ft;
      for (const [X, Y, r, sd, fl] of GP.pads) items.push({ y: -1.1e4, fn: () => { W.lily(Pp, X, Y, r, sd); if (fl) padFlower(Pp, X + 1, Y - 1 + (sc.anim && Math.sin(TAU * ft + sd * 0.61) > 0.35 ? 1 : 0), sd); } });
      for (const [X, Y, hg, sd] of GP.rush) items.push({ y: Y, fn: () => rushFlower(Pp, X, Y, hg, sd) });
      for (const [X, Y, sd] of GP.bank) items.push({ y: Y, fn: () => bankFlower(Pp, X, Y, sd) });
    }
    for (const rg of L.rings || []) items.push({ y: -1.5e4, fn: () => W.ring(Pp, F, X0, Y0, rg, ft) });
    if (L.skiff) items.push({ y: L.skiff[1] * 2, fn: () => {
      const [x, y] = L.skiff, b = bob(0.3), im = I.skiff;
      for (let i = -22; i <= 22; i++) Pp.set(x * 2 + i + 2, y * 2 + 12 + b, hex("#0e2028"), 0.35 * (1 - Math.abs(i) / 17));          // its shadow on the water
      blit(Pp, im, x * 2 - Math.floor(im.w / 2), y * 2 - 12 + b);
      for (let i = -20; i <= 20; i++) if ((i + Math.round(ft * 12)) % 4 === 0) Pp.set(x * 2 + i, y * 2 + 12 + b, FOAM2, 0.5);        // the water at her side
    } });
    if (L.punt) items.push({ y: L.punt[1] * 2, fn: () => {
      const [x, y] = L.punt, b = bob(1.7), im = I.punt;
      for (let i = -22; i <= 22; i++) Pp.set(x * 2 + i + 2, y * 2 + 6 + b, hex("#14262e"), 0.3);
      blit(Pp, im, x * 2 - 26, y * 2 - 14 + b);
    } });
    if (L.jetty) items.push({ y: L.jetty[1] * 2 + 2, fn: () => {
      const [x, y, len] = L.jetty, im = I.jetty[len] ||= jettyImg(len * 2);
      for (let i = 0; i < 12; i++) Pp.set(x * 2 + 6 + i * 0.2, y * 2 - len * 2 + 4 + i, hex("#14262e"), 0.3);
      blit(Pp, im, x * 2 - 12, y * 2 - len * 2 - 6);
    } });
    if (L.sluice) items.push({ y: L.sluice[1] * 2 + 4, fn: () => blit(Pp, I.sluice, L.sluice[0] * 2 - 18, L.sluice[1] * 2 - 20 + 2) });
    for (const [sx, sy, sr] of L.seeps || []) items.push({ y: -1.2e4, fn: () => {
      const X = sx * 2, Y = sy * 2, R2 = sr * 2;
      for (let j2 = -R2; j2 <= R2; j2++) for (let i2 = -R2 * 1.4; i2 <= R2 * 1.4; i2++) {
        const r = Math.hypot(i2 / 1.4, j2) / R2 + (vn((X + i2) / 6, (Y + j2) / 5, 330) - 0.5) * 0.5; if (r > 1) continue;
        const k = (Math.round(Y + j2) - Y0) * w + Math.round(X + i2) - X0; if (k < 0 || k >= w * h || F.D[k] < 0) continue;
        Pp.set(X + i2, Y + j2, r < 0.45 && vn((X + i2) / 4, (Y + j2) / 3, 331) > 0.55 ? lerp(WA[4], hex("#3a4a30"), 0.35) : hex("#3a5228"), r < 0.45 ? 0.9 : 0.55 * (1 - r));
      }
      for (let q2 = 0; q2 < 4; q2++) W.reedClump(Pp, X + (hs(q2, sx, 7) - 0.5) * R2 * 2, Y + (hs(q2, sy, 8) - 0.5) * R2, 8 + hs(q2, 9, sx) * 5, sx * 5 + q2, q2 === 0);
    } });
    for (const cu of L.culverts || []) {
      const ow = Math.round(cu.w * 1.5), H = 14;
      if (cu.arch) {   // the kerb sits on the road's edge; the face below it; the waterline at its foot
        const X = Math.round(cu.arch[0] * 2), Yw = Math.round(cu.arch[1] * 2) + H - 10, im = I.arch[ow] ||= archImg(ow, H);
        items.push({ y: Yw - 1, fn: () => { drawArchMouth(Pp, X, Yw, ow, ft); blit(Pp, im, X - (im.w >> 1), Yw - (H + 6)); } });
      } else items.push({ y: cu.cope[1] * 2, fn: () => drawCoping(Pp, Math.round(cu.cope[0] * 2), Math.round(cu.cope[1] * 2) - 9, ow, ft) });
    }
    for (const wl of willows) items.push({ y: wl.y * 2, fn: () => {
      for (let j = -6; j <= 6; j++) for (let i = -34; i <= 34; i++) { const r = Math.hypot(i / 34, j / 6); if (r < 1 && (i + j) % 2 === 0 || r < 0.7) Pp.set(wl.x * 2 + i + 10, wl.y * 2 + j + 2, hex("#203a1c"), 0.35 * (1 - r)); }
      const c = wl.sp.cv; blit(Pp, { w: c.width, h: c.height, data: c.getContext("2d").getImageData(0, 0, c.width, c.height).data }, wl.x * 2 - wl.sp.ax, wl.y * 2 - wl.sp.ay);
    } });
    items.sort((a, b) => a.y - b.y); for (const it of items) it.fn();
    // lay the game's halls, figures and trees back on top (a cast shadow darkens the new water under it)
    for (let k = 0; k < w * h; k++) {
      const a0 = A[k * 4], a1 = A[k * 4 + 1], a2 = A[k * 4 + 2], b0 = Bd[k * 4], b1 = Bd[k * 4 + 1], b2 = Bd[k * 4 + 2];
      if (Math.abs(a0 - b0) + Math.abs(a1 - b1) + Math.abs(a2 - b2) < 4) continue;
      if (F.D[k] < -3 && F.BODY[k] >= 0 && (sc.variety || sc.kindName)) continue;   // stray ground scatter the board drew where the lake now lies
      if (MOD[k]) {
        const al = [0, 1, 2].map((c) => { const bb = Bd[k * 4 + c], aa = A[k * 4 + c], sh = SHADE[c]; return Math.abs(bb - sh) < 12 ? null : (bb - aa) / (bb - sh); }).filter((v) => v != null);
        const amx = Math.max(...al), amn = Math.min(...al);
        if (al.length >= 2 && amn > 0.04 && amx < 0.8 && amx - amn < 0.12) { const aa = (amx + amn) / 2; for (let c = 0; c < 3; c++) P[k * 4 + c] = P[k * 4 + c] + (SHADE[c] - P[k * 4 + c]) * aa; continue; }
      }
      P[k * 4] = a0; P[k * 4 + 1] = a1; P[k * 4 + 2] = a2;
    }
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").putImageData(new ImageData(P, w, h), 0, 0);
    outs.push(c);
  }
  if (sc.anim) {
    const cols = sc.anim.cols, rows = LF / cols, sheet = document.createElement("canvas"); sheet.width = w * cols; sheet.height = h * rows;
    const sx = sheet.getContext("2d"); outs.forEach((c, f) => sx.drawImage(c, (f % cols) * w, Math.floor(f / cols) * h));
    return { canvas: sheet, still: outs[0], anim: { cols, rows, fps: sc.anim.fps }, outs, log };
  }
  if (sc.raw) return { canvas: outs[0], raw: outs[0], log };
  const Z = 1680 / w, out = document.createElement("canvas"); out.width = 1680; out.height = Math.round(h * Z);
  const oc = out.getContext("2d"); oc.imageSmoothingEnabled = false; oc.drawImage(outs[0], 0, 0, out.width, out.height);
  if (sc.label && q.get("label") !== "0") {
    oc.font = "bold 22px monospace"; const tw2 = Math.min(out.width - 20, oc.measureText(sc.label).width + 24);
    oc.fillStyle = "rgba(16,18,24,0.78)"; oc.fillRect(10, 10, tw2, 36); oc.fillStyle = "#f4ead0"; oc.fillText(sc.label, 22, 36, out.width - 44);
  }
  return { canvas: out, log };
}
